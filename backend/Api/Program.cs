using System.Globalization;
using System.Security.Claims;
using System.Text;
using System.Text.Json;
using System.Threading.RateLimiting;
using Api;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<AppDb>(o => o.UseNpgsql(builder.Configuration.GetConnectionString("Db")
    ?? throw new InvalidOperationException("Set ConnectionStrings:Db in appsettings or the ConnectionStrings__Db env var.")));
builder.Services.AddScoped<SettingsStore>();
builder.Services.AddHttpClient<RazorpayClient>(c =>
{
    c.BaseAddress = new Uri("https://api.razorpay.com/v1/");
    c.Timeout = TimeSpan.FromSeconds(20);
});

// Encrypts saved secrets and signs the session cookie. Losing this folder signs
// everyone out and means re-entering the Razorpay keys, so keep it across deploys.
var keys = builder.Services.AddDataProtection().SetApplicationName("ambot-admin")
    .PersistKeysToFileSystem(new DirectoryInfo(builder.Configuration["DataProtection:KeysPath"]
        ?? Path.Combine(builder.Environment.ContentRootPath, "App_Data", "keys")));
if (OperatingSystem.IsWindows()) keys.ProtectKeysWithDpapi(protectToLocalMachine: true);

builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme).AddCookie(o =>
{
    o.Cookie.Name = "ambot_admin";
    o.Cookie.HttpOnly = true;
    o.Cookie.SameSite = SameSiteMode.Strict;
    o.Cookie.SecurePolicy = CookieSecurePolicy.SameAsRequest;
    o.ExpireTimeSpan = TimeSpan.FromHours(12);
    o.SlidingExpiration = true;
    // An API answers 401/403; the default redirect to a login page would hand fetch() a 200 of HTML.
    o.Events.OnRedirectToLogin = c => { c.Response.StatusCode = 401; return Task.CompletedTask; };
    o.Events.OnRedirectToAccessDenied = c => { c.Response.StatusCode = 403; return Task.CompletedTask; };
    // A removed admin, or a session from before a password change, stops working on its next request.
    o.Events.OnValidatePrincipal = async c =>
    {
        var db = c.HttpContext.RequestServices.GetRequiredService<AppDb>();
        var id = int.TryParse(c.Principal?.FindFirstValue(ClaimTypes.NameIdentifier), out var n) ? n : 0;
        var stamp = await db.Admins.Where(a => a.Id == id).Select(a => a.SecurityStamp).FirstOrDefaultAsync();
        if (stamp is null || stamp != c.Principal!.FindFirstValue("stamp"))
        {
            c.RejectPrincipal();
            await c.HttpContext.SignOutAsync();
        }
    };
});
// Every endpoint needs a signed-in admin unless it opts out with AllowAnonymous.
builder.Services.AddAuthorizationBuilder().SetFallbackPolicy(new AuthorizationPolicyBuilder().RequireAuthenticatedUser().Build());

builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = 429;
    o.AddPolicy("login", c => RateLimitPartition.GetFixedWindowLimiter(c.Connection.RemoteIpAddress?.ToString() ?? "?",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 8, Window = TimeSpan.FromMinutes(5) }));
});

var siteOrigins = builder.Configuration.GetSection("PublicSite:Origins").Get<string[]>() ?? [];
builder.Services.AddCors(o => o.AddPolicy("site", p => p.WithOrigins(siteOrigins).WithMethods("GET")));

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDb>();
    db.Database.Migrate();
    Seed.Run(db, app.Configuration);
}

app.UseDefaultFiles();
app.UseStaticFiles(); // the built admin UI in wwwroot (see admin/vite.config.js)
app.UseCors();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

var hasher = new PasswordHasher<AdminUser>();
var ist = TimeSpan.FromHours(5.5);
string Me(ClaimsPrincipal u) => u.FindFirstValue(ClaimTypes.Email) ?? "admin";
int MyId(ClaimsPrincipal u) => int.Parse(u.FindFirstValue(ClaimTypes.NameIdentifier)!);

async Task SignIn(HttpContext http, AdminUser admin) =>
    await http.SignInAsync(new ClaimsPrincipal(new ClaimsIdentity(
    [
        new Claim(ClaimTypes.NameIdentifier, admin.Id.ToString()),
        new Claim(ClaimTypes.Email, admin.Email),
        new Claim("stamp", admin.SecurityStamp),
    ], CookieAuthenticationDefaults.AuthenticationScheme)));

/* ── Public: read by the landing site ─────────────────────────────────────── */

// Not cached: the site is meant to show an admin change, or an offer starting or ending, on the next load.
app.MapGet("/api/public/site", async (AppDb db, SettingsStore settings, HttpContext http) =>
{
    http.Response.Headers.CacheControl = "no-store";
    var now = DateTimeOffset.UtcNow;
    var courses = await db.Courses.AsNoTracking().OrderBy(c => c.SortOrder).ToListAsync();
    var offers = await LiveOffers(db, now);
    return Results.Ok(new
    {
        courses = courses.Select(c =>
        {
            var best = OfferPricing.Best(c, offers, now);
            return new
            {
                c.Key, c.Name, c.ListPrice, c.StartsAt, c.EndsAt, c.Language, c.IsVisible, c.Description, c.Duration,
                c.Category, c.CardTitle, c.Cta, c.Icon, c.IsFeatured,
                Price = best?.Price ?? c.Price,
                OriginalPrice = best is null ? (decimal?)null : c.Price,
                PaymentUrl = best?.Item.SalePaymentUrl ?? c.PaymentUrl,
                Offer = best is null ? null : new { best.Value.Offer.Badge, best.Value.Offer.EndsAt },
            };
        }),
        whatsappUrl = await settings.GetAsync(SiteSettings.WhatsappUrl),
        pricingTabs = await PricingTabs(db),
    });
}).AllowAnonymous().RequireCors("site");

/* ── Pricing section tab names. Only changed ones are stored; null means the site's own wording. */

app.MapGet("/api/pricing-tabs", (AppDb db) => PricingTabs(db));

app.MapPut("/api/pricing-tabs/{id}", async (string id, PricingTabDto dto, AppDb db, SettingsStore settings, ClaimsPrincipal user) =>
{
    if (!Cards.Categories.Contains(id)) return Results.NotFound();
    if (string.IsNullOrWhiteSpace(dto.Name) || dto.Name.Length > 40) return Results.Problem("Give the tab a name of up to 40 characters.", statusCode: 400);
    if (dto.Blurb is { Length: > 160 }) return Results.Problem("Keep the line under the tabs to 160 characters.", statusCode: 400);
    await settings.SetAsync($"pricingTab.{id}.name", dto.Name.Trim());
    await settings.SetAsync($"pricingTab.{id}.blurb", dto.Blurb?.Trim());
    db.Log(Me(user), "settings.pricing", $"Renamed a Pricing tab to \"{dto.Name.Trim()}\"");
    await db.SaveChangesAsync();
    return Results.NoContent();
});

/* ── Auth ─────────────────────────────────────────────────────────────────── */

app.MapPost("/api/auth/login", async (LoginDto dto, AppDb db, HttpContext http) =>
{
    var email = (dto.Email ?? "").Trim().ToLowerInvariant();
    var admin = await db.Admins.FirstOrDefaultAsync(a => a.Email == email);
    // Failed logins go to the server log only: the table must not be writable by anyone unauthenticated.
    if (admin is null || hasher.VerifyHashedPassword(admin, admin.PasswordHash, dto.Password ?? "") == PasswordVerificationResult.Failed)
        return Results.Problem("That email and password don't match an admin account.", statusCode: 401);

    admin.LastLoginAt = DateTimeOffset.UtcNow;
    db.Log(admin.Email, "auth.login", "Signed in");
    await db.SaveChangesAsync();
    await SignIn(http, admin);
    return Results.Ok(new { admin.Id, admin.Email, admin.Name });
}).AllowAnonymous().RequireRateLimiting("login");

app.MapPost("/api/auth/logout", async (HttpContext http) =>
{
    await http.SignOutAsync();
    return Results.NoContent();
}).AllowAnonymous();

app.MapGet("/api/auth/me", async (ClaimsPrincipal user, AppDb db) =>
{
    var id = MyId(user);
    var me = await db.Admins.Where(a => a.Id == id).Select(a => new { a.Id, a.Email, a.Name }).FirstAsync();
    return Results.Ok(new { me.Id, me.Email, me.Name, SiteUrl = siteOrigins.FirstOrDefault() }); // for the "View website" link
});

app.MapPost("/api/auth/password", async (PasswordDto dto, AppDb db, ClaimsPrincipal user, HttpContext http) =>
{
    var admin = await db.Admins.FindAsync(MyId(user));
    if (admin is null) return Results.Unauthorized();
    if (hasher.VerifyHashedPassword(admin, admin.PasswordHash, dto.Current ?? "") == PasswordVerificationResult.Failed)
        return Results.Problem("Your current password is incorrect.", statusCode: 400);
    if ((dto.Next ?? "").Length < 10)
        return Results.Problem("Use at least 10 characters for the new password.", statusCode: 400);
    admin.PasswordHash = hasher.HashPassword(admin, dto.Next!);
    admin.SecurityStamp = Guid.NewGuid().ToString("N"); // signs out every other session
    db.Log(admin.Email, "auth.password", "Changed their password");
    await db.SaveChangesAsync();
    await SignIn(http, admin); // keep this session
    return Results.NoContent();
});

/* ── Team: admin accounts ─────────────────────────────────────────────────── */

app.MapGet("/api/admins", async (AppDb db) =>
    await db.Admins.AsNoTracking().OrderBy(a => a.CreatedAt).Select(a => new { a.Id, a.Email, a.Name, a.CreatedAt, a.LastLoginAt }).ToListAsync());

app.MapPost("/api/admins", async (AdminDto dto, AppDb db, ClaimsPrincipal user) =>
{
    var email = (dto.Email ?? "").Trim().ToLowerInvariant();
    if (!email.Contains('@') || email.Length > 200) return Results.Problem("Enter the person's email address.", statusCode: 400);
    if ((dto.Password ?? "").Length < 10) return Results.Problem("Give them a starting password of at least 10 characters.", statusCode: 400);
    if (await db.Admins.AnyAsync(a => a.Email == email)) return Results.Problem($"{email} is already an admin.", statusCode: 409);

    var admin = new AdminUser { Email = email, Name = string.IsNullOrWhiteSpace(dto.Name) ? null : dto.Name.Trim() };
    admin.PasswordHash = hasher.HashPassword(admin, dto.Password!);
    db.Admins.Add(admin);
    db.Log(Me(user), "admin.added", $"Added {email} as an admin");
    await db.SaveChangesAsync();
    return Results.Created($"/api/admins/{admin.Id}", new { admin.Id });
});

app.MapDelete("/api/admins/{id:int}", async (int id, AppDb db, ClaimsPrincipal user) =>
{
    if (id == MyId(user)) return Results.Problem("You can't remove yourself. Ask another admin to do it.", statusCode: 400);
    var admin = await db.Admins.FindAsync(id);
    if (admin is null) return Results.NotFound();
    if (await db.Admins.CountAsync() <= 1) return Results.Problem("There must be at least one admin.", statusCode: 400);
    db.Admins.Remove(admin);
    db.Log(Me(user), "admin.removed", $"Removed {admin.Email}");
    await db.SaveChangesAsync();
    return Results.NoContent();
});

/* ── Programs, prices, links and dates ────────────────────────────────────── */

app.MapGet("/api/courses", async (AppDb db) => await db.Courses.AsNoTracking().OrderBy(c => c.SortOrder).ToListAsync());

app.MapPut("/api/courses/{id:int}", async (int id, CourseDto dto, AppDb db, ClaimsPrincipal user) =>
{
    var c = await db.Courses.FindAsync(id);
    if (c is null) return Results.NotFound();
    var error = Validate.Course(dto, c.Key);
    if (error is not null) return Results.Problem(error, statusCode: 400);

    var changes = new List<string>();
    void Track<T>(string what, T before, T after) { if (!EqualityComparer<T>.Default.Equals(before, after)) changes.Add(what); }
    var startsAt = dto.StartsAt?.ToUniversalTime(); // Npgsql only writes UTC offsets to timestamptz
    var endsAt = dto.EndsAt?.ToUniversalTime();
    Track("name", c.Name, dto.Name!.Trim());
    Track($"price to {dto.Price:0.##}", c.Price, dto.Price);
    Track("package price", c.ListPrice, dto.ListPrice);
    Track("payment link", c.PaymentUrl, dto.PaymentUrl!.Trim());
    Track("date", (c.StartsAt, c.EndsAt), (startsAt, endsAt));
    Track(dto.IsVisible ? "shown on site" : "hidden from site", c.IsVisible, dto.IsVisible);

    c.Name = dto.Name!.Trim();
    c.Price = dto.Price;
    c.ListPrice = dto.ListPrice;
    c.PaymentUrl = dto.PaymentUrl!.Trim();
    c.RazorpayId = string.IsNullOrWhiteSpace(dto.RazorpayId) ? null : dto.RazorpayId.Trim();
    c.StartsAt = startsAt;
    c.EndsAt = endsAt;
    c.Language = string.IsNullOrWhiteSpace(dto.Language) ? null : dto.Language.Trim();
    // Empty, not null, when cleared: null would let the seed refill the default text on the next start.
    c.Description = dto.Description?.Trim() ?? c.Description;
    c.Duration = dto.Duration?.Trim() ?? c.Duration;
    if (dto.Card is not null) { ApplyCard(c, dto.Card); await PlaceCard(db, c, dto.Card.Position); }
    c.IsVisible = dto.IsVisible;
    c.UpdatedAt = DateTimeOffset.UtcNow;
    db.Log(Me(user), "program.updated", $"{c.Name}: {(changes.Count > 0 ? string.Join(", ", changes) : "saved without changes")}");
    await db.SaveChangesAsync();
    return Results.Ok(c);
});

/* New Pricing section cards. Only these 'ladder' programs can be created or deleted: the
   others are tied to their own copy on the site. */
app.MapPost("/api/courses", async (CourseDto dto, AppDb db, ClaimsPrincipal user) =>
{
    var error = Validate.Course(dto, "");
    if (error is null && dto.Card?.Category is null) error = "Choose which Pricing tab the card goes in.";
    if (error is not null) return Results.Problem(error, statusCode: 400);

    var slug = new string(dto.Name!.Trim().ToLowerInvariant().Select(ch => char.IsAsciiLetterOrDigit(ch) ? ch : '-').ToArray()).Trim('-');
    var key = $"ladder-{(slug.Length > 40 ? slug[..40] : slug)}";
    for (var n = 2; await db.Courses.AnyAsync(c => c.Key == key); n++) key = $"ladder-{slug}-{n}";
    var c = new Course { Key = key, Kind = "ladder", Name = dto.Name!.Trim(), PaymentUrl = dto.PaymentUrl!.Trim(),
        SortOrder = (await db.Courses.MaxAsync(x => (int?)x.SortOrder) ?? 0) + 1 };
    c.Price = dto.Price;
    c.RazorpayId = string.IsNullOrWhiteSpace(dto.RazorpayId) ? null : dto.RazorpayId.Trim();
    c.Description = dto.Description?.Trim() ?? "";
    c.Duration = dto.Duration?.Trim() ?? "";
    c.IsVisible = dto.IsVisible;
    ApplyCard(c, dto.Card!);
    await PlaceCard(db, c, dto.Card!.Position);
    db.Courses.Add(c);
    db.Log(Me(user), "program.created", $"Added Pricing card \"{c.Name}\" at {c.Price:0.##}");
    await db.SaveChangesAsync();
    return Results.Created($"/api/courses/{c.Id}", c);
});

app.MapDelete("/api/courses/{id:int}", async (int id, AppDb db, ClaimsPrincipal user) =>
{
    var c = await db.Courses.FindAsync(id);
    if (c is null) return Results.NotFound();
    if (c.Kind != "ladder") return Results.Problem("Only Pricing section cards can be deleted. Hide this program instead.", statusCode: 400);
    if (await db.Payments.AnyAsync(p => p.CourseId == id))
        return Results.Problem("This card has payments in the ledger, so it can't be deleted. Hide it instead.", statusCode: 400);
    db.Courses.Remove(c);
    db.Log(Me(user), "program.deleted", $"Deleted Pricing card \"{c.Name}\"");
    await db.SaveChangesAsync();
    return Results.NoContent();
});

/* ── Special offers: time-boxed discounts ─────────────────────────────────── */

app.MapGet("/api/offers", async (AppDb db) =>
{
    var now = DateTimeOffset.UtcNow;
    var offers = await db.Offers.AsNoTracking().Include(o => o.Items).OrderByDescending(o => o.StartsAt).ToListAsync();
    return Results.Ok(offers.Select(o => new
    {
        o.Id, o.Name, o.Badge, o.DiscountType, o.DiscountValue, o.StartsAt, o.EndsAt, o.IsPaused, o.UpdatedAt,
        Status = now >= o.EndsAt ? "ended" : o.IsPaused ? "paused" : OfferPricing.IsLive(o, now) ? "live" : "scheduled",
        Items = o.Items.Select(i => new { i.CourseId, i.SalePaymentUrl }),
    }));
});

app.MapPost("/api/offers", async (OfferDto dto, AppDb db, ClaimsPrincipal user) =>
{
    var error = await Validate.Offer(dto, db);
    if (error is not null) return Results.Problem(error, statusCode: 400);
    var o = new Offer { Name = "", Badge = "", DiscountType = "" };
    ApplyOffer(o, dto);
    db.Offers.Add(o);
    db.Log(Me(user), "offer.created", $"Created offer \"{o.Name}\": {OfferText(o)}, {o.StartsAt.ToOffset(ist):d MMM HH:mm} to {o.EndsAt.ToOffset(ist):d MMM HH:mm} IST");
    await db.SaveChangesAsync();
    return Results.Created($"/api/offers/{o.Id}", new { o.Id });
});

app.MapPut("/api/offers/{id:int}", async (int id, OfferDto dto, AppDb db, ClaimsPrincipal user) =>
{
    var o = await db.Offers.Include(x => x.Items).FirstOrDefaultAsync(x => x.Id == id);
    if (o is null) return Results.NotFound();
    var error = await Validate.Offer(dto, db);
    if (error is not null) return Results.Problem(error, statusCode: 400);
    var wasPaused = o.IsPaused;
    ApplyOffer(o, dto);
    o.UpdatedAt = DateTimeOffset.UtcNow;
    db.Log(Me(user), "offer.updated", wasPaused == o.IsPaused
        ? $"Edited offer \"{o.Name}\": {OfferText(o)}"
        : $"{(o.IsPaused ? "Paused" : "Resumed")} offer \"{o.Name}\"");
    await db.SaveChangesAsync();
    return Results.NoContent();
});

app.MapDelete("/api/offers/{id:int}", async (int id, AppDb db, ClaimsPrincipal user) =>
{
    var o = await db.Offers.FindAsync(id);
    if (o is null) return Results.NotFound();
    db.Offers.Remove(o);
    db.Log(Me(user), "offer.deleted", $"Deleted offer \"{o.Name}\"");
    await db.SaveChangesAsync();
    return Results.NoContent();
});

/* ── Payments ledger ──────────────────────────────────────────────────────── */

app.MapGet("/api/payments", async (AppDb db, string? q, string? email, string? status, int? courseId, bool? unassigned, DateTimeOffset? from, DateTimeOffset? to, int page = 1, int size = 25) =>
{
    var query = Filter(db, q, email, status, courseId, unassigned, from, to);
    size = Math.Clamp(size, 5, 200);
    var total = await query.CountAsync();
    var paidSum = await query.Where(p => p.Status == PaymentStatus.Paid).SumAsync(p => (decimal?)p.Amount) ?? 0;
    var items = await query.OrderByDescending(p => p.PaidAt).ThenByDescending(p => p.Id)
        .Skip((Math.Max(page, 1) - 1) * size).Take(size)
        .Select(p => new { p.Id, p.CourseId, CourseName = p.Course!.Name, p.CustomerName, p.Email, p.Phone, p.Amount, p.Currency,
                           p.Status, p.Method, p.Reference, p.PaidAt, p.Notes, FromRazorpay = p.GatewayPaymentId != null })
        .ToListAsync();
    return Results.Ok(new { total, paidSum, items });
});

app.MapGet("/api/payments/export", async (AppDb db, string? q, string? email, string? status, int? courseId, bool? unassigned, DateTimeOffset? from, DateTimeOffset? to) =>
{
    var rows = await Filter(db, q, email, status, courseId, unassigned, from, to).OrderByDescending(p => p.PaidAt)
        .Select(p => new { p.Id, p.PaidAt, Course = p.Course!.Name, p.CustomerName, p.Email, p.Phone, p.Amount, p.Currency, p.Status, p.Method, p.Reference, p.Notes })
        .ToListAsync();
    var csv = new StringBuilder("Id,Paid at (IST),Program,Name,Email,Phone,Amount,Currency,Status,Method,Reference,Notes\n");
    foreach (var r in rows)
        csv.AppendJoin(',', new[] { r.Id.ToString(), r.PaidAt.ToOffset(ist).ToString("yyyy-MM-dd HH:mm"), r.Course, r.CustomerName, r.Email, r.Phone,
            r.Amount.ToString(CultureInfo.InvariantCulture), r.Currency, r.Status, r.Method, r.Reference, r.Notes }.Select(Csv.Cell)).Append('\n');
    return Results.File(Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(csv.ToString())).ToArray(),
        "text/csv", $"payments-{DateTime.UtcNow:yyyyMMdd}.csv");
});

app.MapPost("/api/payments", async (PaymentDto dto, AppDb db, ClaimsPrincipal user) =>
{
    var error = await Validate.Payment(dto, db);
    if (error is not null) return Results.Problem(error, statusCode: 400);
    var p = new Payment { CustomerName = "" };
    Apply(p, dto);
    db.Payments.Add(p);
    db.Log(Me(user), "payment.created", $"Recorded {p.CustomerName}, {p.Amount:0.##} {p.Currency} ({p.Status})");
    await db.SaveChangesAsync();
    return Results.Created($"/api/payments/{p.Id}", new { p.Id });
});

app.MapPut("/api/payments/{id:int}", async (int id, PaymentDto dto, AppDb db, ClaimsPrincipal user) =>
{
    var p = await db.Payments.FindAsync(id);
    if (p is null) return Results.NotFound();
    var error = await Validate.Payment(dto, db);
    if (error is not null) return Results.Problem(error, statusCode: 400);
    var before = $"{p.Amount:0.##} {p.Status}";
    Apply(p, dto);
    p.UpdatedAt = DateTimeOffset.UtcNow;
    var after = $"{p.Amount:0.##} {p.Status}";
    db.Log(Me(user), "payment.updated", $"Entry #{p.Id} ({p.CustomerName}){(before == after ? "" : $": {before} to {after}")}");
    await db.SaveChangesAsync();
    return Results.NoContent();
});

app.MapDelete("/api/payments/{id:int}", async (int id, AppDb db, ClaimsPrincipal user) =>
{
    var p = await db.Payments.FindAsync(id);
    if (p is null) return Results.NotFound();
    db.Payments.Remove(p);
    db.Log(Me(user), "payment.deleted", $"Deleted entry #{p.Id}: {p.CustomerName}, {p.Amount:0.##} {p.Currency} ({p.Status})");
    await db.SaveChangesAsync();
    return Results.NoContent();
});

/* ── Customers: everyone in the ledger, one row per person ────────────────── */

app.MapGet("/api/customers", async (AppDb db, string? q, int page = 1, int size = 25) =>
{
    // shortcut: groups in memory, fine to tens of thousands of payments; move to a SQL GROUP BY past that.
    var rows = await Filter(db, q, null, null, null, null, null, null)
        .Select(p => new { p.CustomerName, p.Email, p.Phone, p.Amount, p.Status, p.PaidAt, CourseName = p.Course!.Name })
        .ToListAsync();
    var people = rows
        .GroupBy(p => p.Email?.ToLowerInvariant() ?? p.Phone ?? p.CustomerName.ToLowerInvariant())
        .Select(g => new
        {
            Key = g.Key,
            Name = g.OrderByDescending(p => p.PaidAt).First().CustomerName,
            Email = g.Select(p => p.Email).FirstOrDefault(e => e != null),
            Phone = g.Select(p => p.Phone).FirstOrDefault(e => e != null),
            // Counts and programs from Paid rows only: a failed attempt followed by a retry is one purchase.
            Payments = g.Count(p => p.Status == PaymentStatus.Paid),
            Paid = g.Where(p => p.Status == PaymentStatus.Paid).Sum(p => p.Amount),
            Programs = g.Where(p => p.CourseName != null && p.Status == PaymentStatus.Paid).Select(p => p.CourseName!).Distinct().ToList(),
            LastPaidAt = g.Max(p => p.PaidAt),
        })
        .OrderByDescending(c => c.LastPaidAt)
        .ToList();
    size = Math.Clamp(size, 5, 200);
    return Results.Ok(new
    {
        total = people.Count,
        repeat = people.Count(c => c.Payments > 1),
        items = people.Skip((Math.Max(page, 1) - 1) * size).Take(size),
    });
});

/* ── Activity log ─────────────────────────────────────────────────────────── */

app.MapGet("/api/activity", async (AppDb db, string? actor, string? area, int page = 1, int size = 50) =>
{
    var query = db.Activity.AsNoTracking();
    if (!string.IsNullOrWhiteSpace(actor)) query = query.Where(a => a.Actor == actor);
    if (!string.IsNullOrWhiteSpace(area)) query = query.Where(a => a.Action.StartsWith(area + "."));
    size = Math.Clamp(size, 10, 200);
    var total = await query.CountAsync();
    var items = await query.OrderByDescending(a => a.At).ThenByDescending(a => a.Id).Skip((Math.Max(page, 1) - 1) * size).Take(size).ToListAsync();
    var actors = await db.Activity.Select(a => a.Actor).Distinct().OrderBy(a => a).ToListAsync();
    return Results.Ok(new { total, items, actors });
});

/* ── Settings: site links and Razorpay keys ───────────────────────────────── */

app.MapGet("/api/settings", async (AppDb db, SettingsStore settings) =>
{
    var rz = await settings.RazorpayAsync();
    var lastWebhook = await db.Activity.Where(a => a.Actor == "Razorpay").OrderByDescending(a => a.At).Select(a => (DateTimeOffset?)a.At).FirstOrDefaultAsync();
    return Results.Ok(new
    {
        whatsappUrl = await settings.GetAsync(SiteSettings.WhatsappUrl),
        // Secrets never leave the server; the admin only sees whether one is set and where from.
        razorpay = new
        {
            keyId = rz.KeyId,
            keyIdSource = rz.KeyIdSource,
            keySecretSet = rz.KeySecret is not null,
            keySecretSource = rz.KeySecretSource,
            webhookSecretSet = rz.WebhookSecret is not null,
            webhookSecretSource = rz.WebhookSecretSource,
            webhookPath = "/api/webhooks/razorpay",
            lastWebhookAt = lastWebhook,
        },
    });
});

app.MapPut("/api/settings/site", async (SiteSettingsDto dto, AppDb db, SettingsStore settings, ClaimsPrincipal user) =>
{
    var url = dto.WhatsappUrl?.Trim();
    if (!string.IsNullOrEmpty(url) && (!Uri.TryCreate(url, UriKind.Absolute, out var u) || u.Scheme != Uri.UriSchemeHttps))
        return Results.Problem("The WhatsApp link must be a full https:// address.", statusCode: 400);
    await settings.SetAsync(SiteSettings.WhatsappUrl, url);
    db.Log(Me(user), "settings.site", string.IsNullOrEmpty(url) ? "Cleared the WhatsApp community link" : "Changed the WhatsApp community link");
    await db.SaveChangesAsync();
    return Results.NoContent();
});

// Empty fields keep what is saved; `clear` removes the saved keys (falling back to appsettings, if set there).
app.MapPut("/api/settings/razorpay", async (RazorpayKeysDto dto, AppDb db, SettingsStore settings, ClaimsPrincipal user) =>
{
    if (dto.Clear)
    {
        foreach (var k in new[] { SettingsStore.RazorpayKeyId, SettingsStore.RazorpayKeySecret, SettingsStore.RazorpayWebhookSecret })
            await settings.SetAsync(k, null);
        db.Log(Me(user), "settings.razorpay", "Removed the saved Razorpay keys");
        await db.SaveChangesAsync();
        return Results.NoContent();
    }

    var keyId = dto.KeyId?.Trim();
    if (!string.IsNullOrEmpty(keyId) && !keyId.StartsWith("rzp_"))
        return Results.Problem("A Razorpay Key ID starts with rzp_live_ or rzp_test_.", statusCode: 400);
    var changed = new List<string>();
    if (!string.IsNullOrEmpty(keyId)) { await settings.SetAsync(SettingsStore.RazorpayKeyId, keyId); changed.Add($"Key ID ({keyId})"); }
    if (!string.IsNullOrWhiteSpace(dto.KeySecret)) { await settings.SetAsync(SettingsStore.RazorpayKeySecret, dto.KeySecret.Trim(), secret: true); changed.Add("Key Secret"); }
    if (!string.IsNullOrWhiteSpace(dto.WebhookSecret)) { await settings.SetAsync(SettingsStore.RazorpayWebhookSecret, dto.WebhookSecret.Trim(), secret: true); changed.Add("Webhook Secret"); }
    if (changed.Count == 0) return Results.Problem("Enter at least one value to save.", statusCode: 400);
    db.Log(Me(user), "settings.razorpay", $"Updated Razorpay {string.Join(", ", changed)}");
    await db.SaveChangesAsync();
    return Results.NoContent();
});

app.MapPost("/api/razorpay/test", async (SettingsStore settings, RazorpayClient rzp) =>
{
    var rz = await settings.RazorpayAsync();
    if (rz.KeyId is null || rz.KeySecret is null) return Results.Problem("Save the Key ID and Key Secret first.", statusCode: 400);
    var now = DateTimeOffset.UtcNow;
    var res = await rzp.PaymentsAsync(rz.KeyId, rz.KeySecret, now.AddDays(-1), now, 0, 1);
    return res.Error is null
        ? Results.Ok(new { ok = true, mode = rz.KeyId.StartsWith("rzp_live_") ? "live" : "test" })
        : Results.Problem(res.Status == 401 ? "Razorpay rejected these keys. Check the Key ID and Key Secret." : res.Error, statusCode: 400);
});

// Pulls payments the webhook may have missed (server down, webhook not set up yet). Safe to run repeatedly.
app.MapPost("/api/razorpay/sync", async (SyncDto dto, AppDb db, SettingsStore settings, RazorpayClient rzp, ClaimsPrincipal user) =>
{
    var rz = await settings.RazorpayAsync();
    if (rz.KeyId is null || rz.KeySecret is null) return Results.Problem("Save the Key ID and Key Secret first.", statusCode: 400);
    var days = Math.Clamp(dto.Days, 1, 90);
    var to = DateTimeOffset.UtcNow;
    var from = to.AddDays(-days);
    int created = 0, updated = 0, seen = 0;
    for (var skip = 0; skip < 2000; skip += 100) // shortcut: stops at 2,000 payments per run; narrow the days for more
    {
        var page = await rzp.PaymentsAsync(rz.KeyId, rz.KeySecret, from, to, skip);
        if (page.Error is not null)
            return Results.Problem(page.Status == 401 ? "Razorpay rejected these keys. Check the Key ID and Key Secret." : page.Error, statusCode: 400);
        foreach (var e in page.Items)
        {
            seen++;
            // Abandoned checkouts (created/authorized) would sit as Pending forever; record what the webhook records.
            if (e.TryGetProperty("status", out var st) && st.GetString() is not ("captured" or "failed" or "refunded")) continue;
            var outcome = await Razorpay.RecordAsync(db, Razorpay.FromPaymentEntity(e), e.GetRawText(), "Razorpay sync");
            if (outcome == Razorpay.Outcome.Created) created++;
            if (outcome == Razorpay.Outcome.Updated) updated++;
        }
        if (page.Items.Count < 100) break;
    }
    db.Log(Me(user), "razorpay.sync", $"Synced {days} days: {seen} payments read, {created} new, {updated} updated");
    await db.SaveChangesAsync();
    return Results.Ok(new { seen, created, updated });
});

/* ── Razorpay webhook: records payments as they happen ──────────────────────
   Razorpay Dashboard > Settings > Webhooks: this URL, the webhook secret saved
   in Settings, and the events payment.captured, payment.failed, refund.processed. */

app.MapPost("/api/webhooks/razorpay", async (HttpRequest req, AppDb db, SettingsStore settings, ILogger<Program> log) =>
{
    var secret = (await settings.RazorpayAsync()).WebhookSecret;
    if (secret is null) return Results.Problem("No Razorpay webhook secret is set.", statusCode: 503);

    using var reader = new StreamReader(req.Body, Encoding.UTF8);
    var body = await reader.ReadToEndAsync();
    // Rejected calls go to the server log, not the activity table: anyone can send them.
    if (!Razorpay.SignatureValid(body, req.Headers["X-Razorpay-Signature"], secret))
    {
        log.LogWarning("Razorpay webhook rejected: bad signature");
        return Results.Unauthorized();
    }

    Razorpay.Event? ev;
    try { ev = Razorpay.Parse(body); }
    catch (Exception e) when (e is JsonException or KeyNotFoundException or InvalidOperationException)
    {
        log.LogWarning(e, "Razorpay webhook body could not be read");
        return Results.BadRequest();
    }
    if (ev is not null) await Razorpay.RecordAsync(db, ev, body, "Razorpay");
    return Results.Ok(); // any 2xx stops Razorpay retrying
}).AllowAnonymous();

/* ── Dashboard ────────────────────────────────────────────────────────────── */

app.MapGet("/api/dashboard", async (AppDb db) =>
{
    var byStatus = await db.Payments.GroupBy(p => p.Status)
        .Select(g => new { Status = g.Key, Count = g.Count(), Amount = g.Sum(p => p.Amount) }).ToListAsync();
    var byCourse = await db.Payments.Where(p => p.Status == PaymentStatus.Paid).GroupBy(p => p.CourseId)
        .Select(g => new { CourseId = g.Key, Count = g.Count(), Amount = g.Sum(p => p.Amount) }).ToListAsync();

    // Daily paid revenue for the last 30 days, bucketed by the IST calendar day.
    var today = DateTimeOffset.UtcNow.ToOffset(ist).Date;
    var since = new DateTimeOffset(today.AddDays(-29), ist).ToUniversalTime();
    var recentPaid = await db.Payments.Where(p => p.Status == PaymentStatus.Paid && p.PaidAt >= since)
        .Select(p => new { p.PaidAt, p.Amount }).ToListAsync();
    var daily = Enumerable.Range(0, 30).Select(i => today.AddDays(i - 29)).Select(d => new
    {
        Date = d.ToString("yyyy-MM-dd"),
        Amount = recentPaid.Where(p => p.PaidAt.ToOffset(ist).Date == d).Sum(p => p.Amount),
    });

    var recent = await db.Payments.OrderByDescending(p => p.PaidAt).Take(6)
        .Select(p => new { p.Id, p.CustomerName, CourseName = p.Course!.Name, p.Amount, p.Status, p.PaidAt }).ToListAsync();
    var courses = await db.Courses.AsNoTracking().OrderBy(c => c.SortOrder)
        .Select(c => new { c.Id, c.Key, c.Name, c.Price, c.StartsAt, c.EndsAt, c.Language, c.IsVisible }).ToListAsync();
    var unassigned = await db.Payments.CountAsync(p => p.CourseId == null);
    // The live offer (if any) and the next one coming up, for the Overview card.
    var now = DateTimeOffset.UtcNow;
    var offers = await db.Offers.AsNoTracking().Where(o => !o.IsPaused && o.EndsAt > now).OrderBy(o => o.StartsAt).Take(2)
        .Select(o => new { o.Id, o.Name, o.Badge, o.StartsAt, o.EndsAt, Programs = o.Items.Count }).ToListAsync();
    return Results.Ok(new { byStatus, byCourse, daily, recent, courses, unassigned, offers });
});

// Unknown /api paths answer 404, not the admin page.
app.MapFallback("/api/{**rest}", () => Results.NotFound()).AllowAnonymous();
app.MapFallbackToFile("index.html").AllowAnonymous();

app.Run();

static IQueryable<Payment> Filter(AppDb db, string? q, string? email, string? status, int? courseId, bool? unassigned, DateTimeOffset? from, DateTimeOffset? to)
{
    var query = db.Payments.AsNoTracking();
    if (!string.IsNullOrWhiteSpace(q))
    {
        var like = $"%{q.Trim()}%";
        query = query.Where(p => EF.Functions.ILike(p.CustomerName, like) || EF.Functions.ILike(p.Email ?? "", like)
            || EF.Functions.ILike(p.Phone ?? "", like) || EF.Functions.ILike(p.Reference ?? "", like));
    }
    // Exact match for one customer's payments (q would also match a@x.com inside ba@x.com).
    if (!string.IsNullOrWhiteSpace(email)) { var e = email.Trim().ToLower(); query = query.Where(p => p.Email != null && p.Email.ToLower() == e); }
    if (!string.IsNullOrWhiteSpace(status)) query = query.Where(p => p.Status == status);
    if (courseId is not null) query = query.Where(p => p.CourseId == courseId);
    if (unassigned == true) query = query.Where(p => p.CourseId == null);
    if (from is not null) { var f = from.Value.ToUniversalTime(); query = query.Where(p => p.PaidAt >= f); }
    if (to is not null) { var t = to.Value.ToUniversalTime(); query = query.Where(p => p.PaidAt < t); }
    return query;
}

static async Task<object[]> PricingTabs(AppDb db)
{
    var saved = await db.Settings.AsNoTracking().Where(x => x.Key.StartsWith("pricingTab.")).ToDictionaryAsync(x => x.Key, x => x.Value);
    return Cards.Categories.Select(id => (object)new
    {
        id,
        name = saved.GetValueOrDefault($"pricingTab.{id}.name"),
        blurb = saved.GetValueOrDefault($"pricingTab.{id}.blurb"),
    }).ToArray();
}

static Task<List<Offer>> LiveOffers(AppDb db, DateTimeOffset now) =>
    db.Offers.AsNoTracking().Include(o => o.Items).Where(o => !o.IsPaused && o.StartsAt <= now && o.EndsAt > now).ToListAsync();

static string OfferText(Offer o) => o.DiscountType == OfferPricing.Percent ? $"{o.DiscountValue:0.##}% off" : $"{o.DiscountValue:0.##} off";

static void ApplyCard(Course c, CardDto card)
{
    static string? Clean(string? s) => string.IsNullOrWhiteSpace(s) ? null : s.Trim();
    c.Category = Clean(card.Category);
    c.CardTitle = Clean(card.CardTitle);
    c.Cta = Clean(card.Cta);
    c.Icon = Clean(card.Icon);
    c.IsFeatured = card.IsFeatured;
}

// Places the card in its tab and renumbers that tab 1..n from its lowest number, so positions stay whole.
static async Task PlaceCard(AppDb db, Course c, double? position)
{
    if (c.Category is null) return;
    var others = await db.Courses.Where(x => x.Category == c.Category && x.Id != c.Id).ToListAsync();
    var at = position ?? (c.Id == 0 ? double.MaxValue : c.SortOrder);
    var start = others.Select(x => x.SortOrder).DefaultIfEmpty(c.SortOrder).Min();
    var ordered = others.Select(x => (Course: x, Key: (double)x.SortOrder)).Append((Course: c, Key: at))
        .OrderBy(x => x.Key).ThenBy(x => x.Course == c ? 1 : 0).Select(x => x.Course).ToList();
    for (var i = 0; i < ordered.Count; i++) ordered[i].SortOrder = start + i;
}

static void ApplyOffer(Offer o, OfferDto dto)
{
    o.Name = dto.Name!.Trim();
    o.Badge = string.IsNullOrWhiteSpace(dto.Badge) ? o.Name : dto.Badge.Trim();
    o.DiscountType = dto.DiscountType!;
    o.DiscountValue = dto.DiscountValue;
    o.StartsAt = dto.StartsAt!.Value.ToUniversalTime();
    o.EndsAt = dto.EndsAt!.Value.ToUniversalTime();
    o.IsPaused = dto.IsPaused;
    o.Items.Clear();
    o.Items.AddRange(dto.Items!.DistinctBy(i => i.CourseId).Select(i => new OfferItem
    {
        CourseId = i.CourseId,
        SalePaymentUrl = string.IsNullOrWhiteSpace(i.SalePaymentUrl) ? null : i.SalePaymentUrl.Trim(),
    }));
}

static void Apply(Payment p, PaymentDto dto)
{
    static string? Clean(string? s) => string.IsNullOrWhiteSpace(s) ? null : s.Trim();
    p.CourseId = dto.CourseId;
    p.CustomerName = dto.CustomerName!.Trim();
    p.Email = Clean(dto.Email);
    p.Phone = Clean(dto.Phone);
    p.Amount = dto.Amount;
    p.Status = dto.Status!;
    p.Method = Clean(dto.Method);
    p.Reference = Clean(dto.Reference);
    p.PaidAt = (dto.PaidAt ?? DateTimeOffset.UtcNow).ToUniversalTime();
    p.Notes = Clean(dto.Notes);
}

record LoginDto(string? Email, string? Password);
record PasswordDto(string? Current, string? Next);
record AdminDto(string? Email, string? Name, string? Password);
record CourseDto(string? Name, decimal Price, decimal? ListPrice, string? PaymentUrl, string? RazorpayId, DateTimeOffset? StartsAt, DateTimeOffset? EndsAt, string? Language, bool IsVisible, string? Description = null, string? Duration = null, CardDto? Card = null);
// How a program appears as a Pricing section card. Null Category takes it off the Pricing section.
// Position: where in its tab, as a sort value (e.g. another card's SortOrder + 0.5 for "after it"); null keeps it.
record CardDto(string? Category, string? CardTitle, string? Cta, string? Icon, bool IsFeatured, double? Position);
record PaymentDto(int CourseId, string? CustomerName, string? Email, string? Phone, decimal Amount, string? Status, string? Method, string? Reference, DateTimeOffset? PaidAt, string? Notes);
record SiteSettingsDto(string? WhatsappUrl);
record RazorpayKeysDto(string? KeyId, string? KeySecret, string? WebhookSecret, bool Clear);
record SyncDto(int Days);
record PricingTabDto(string? Name, string? Blurb);
record OfferItemDto(int CourseId, string? SalePaymentUrl);
record OfferDto(string? Name, string? Badge, string? DiscountType, decimal DiscountValue, DateTimeOffset? StartsAt, DateTimeOffset? EndsAt, bool IsPaused, List<OfferItemDto>? Items);

static class Validate
{
    public static string? Course(CourseDto d, string key)
    {
        if (string.IsNullOrWhiteSpace(d.Name) || d.Name.Length > 120) return "Give the program a name of up to 120 characters.";
        if (d.Price < 0 || d.Price > 10_000_000) return "Price must be between 0 and 1,00,00,000.";
        if (d.Card is { Category: not null } card && !Cards.Categories.Contains(card.Category)) return "Choose which Pricing tab the card goes in.";
        if (d.Card is { Icon: not null } ci && !Cards.IconValid(ci.Icon)) return "Choose one of the listed icons.";
        if (d.Card is { Cta.Length: > 40 } or { CardTitle.Length: > 120 }) return "Keep the button label to 40 characters and the card title to 120.";
        if (d.Description is { Length: > 300 } || d.Duration is { Length: > 60 }) return "Keep the card text to 300 characters and the access line to 60.";
        if (d.ListPrice is not null && d.ListPrice < d.Price) return "The package price must be at least the selling price.";
        if (!Uri.TryCreate(d.PaymentUrl?.Trim(), UriKind.Absolute, out var u) || u.Scheme != Uri.UriSchemeHttps)
            return "The payment link must be a full https:// address.";
        if (d.StartsAt is not null && d.EndsAt is not null && d.EndsAt <= d.StartsAt) return "The end time must be after the start time.";
        // The site's hero always sells the webinar, so it can't be hidden.
        if (key == "webinar" && !d.IsVisible) return "The main webinar is always shown on the site.";
        return null;
    }

    public static async Task<string?> Offer(OfferDto d, AppDb db)
    {
        if (string.IsNullOrWhiteSpace(d.Name) || d.Name.Length > 80) return "Give the offer a name of up to 80 characters.";
        if (d.Badge is { Length: > 60 }) return "Keep the site badge to 60 characters.";
        if (d.DiscountType is not (OfferPricing.Percent or OfferPricing.Amount)) return "Choose a percentage or a fixed amount off.";
        if (d.DiscountValue <= 0) return "The discount must be more than zero.";
        if (d.DiscountType == OfferPricing.Percent && d.DiscountValue >= 100) return "A percentage discount must be below 100%.";
        if (d.StartsAt is null || d.EndsAt is null) return "Set when the offer starts and ends.";
        if (d.EndsAt <= d.StartsAt) return "The offer must end after it starts.";
        if (d.EndsAt <= DateTimeOffset.UtcNow) return "That end time has already passed.";
        if (d.Items is not { Count: > 0 }) return "Choose at least one program for the offer.";
        foreach (var i in d.Items)
            if (!string.IsNullOrWhiteSpace(i.SalePaymentUrl) && (!Uri.TryCreate(i.SalePaymentUrl.Trim(), UriKind.Absolute, out var u) || u.Scheme != Uri.UriSchemeHttps))
                return "Each sale payment link must be a full https:// address.";
        var ids = d.Items.Select(i => i.CourseId).Distinct().ToList();
        if (await db.Courses.CountAsync(c => ids.Contains(c.Id)) != ids.Count) return "One of the chosen programs no longer exists.";
        if (d.DiscountType == OfferPricing.Amount && await db.Courses.AnyAsync(c => ids.Contains(c.Id) && c.Price <= d.DiscountValue))
            return "That amount is as much as or more than a chosen program's price.";
        return null;
    }

    public static async Task<string?> Payment(PaymentDto d, AppDb db)
    {
        if (string.IsNullOrWhiteSpace(d.CustomerName) || d.CustomerName.Length > 160) return "Enter the customer's name.";
        if (d.Amount < 0 || d.Amount > 10_000_000) return "Amount must be between 0 and 1,00,00,000.";
        if (!PaymentStatus.All.Contains(d.Status)) return $"Status must be one of: {string.Join(", ", PaymentStatus.All)}.";
        if (d.Email is { Length: > 0 } && !d.Email.Contains('@')) return "That email address is missing an @.";
        if (!await db.Courses.AnyAsync(c => c.Id == d.CourseId)) return "Choose the program this payment is for.";
        return null;
    }
}

static class Cards
{
    public static readonly string[] Categories = ["once", "single", "bundle", "master"];
    public static readonly string[] Icons = ["monitor-play", "circle-play", "image", "calendar-check", "bot", "layers", "gem"];
    public static readonly string[] Apps = ["excel", "word", "powerpoint", "outlook", "teams", "sharepoint", "onenote", "onedrive", "forms", "planner"];
    public static bool IconValid(string icon) => Icons.Contains(icon)
        || (icon.StartsWith("app:") && icon[4..].Split(',').All(a => Apps.Contains(a)));
}

static class Csv
{
    // Quotes every cell, and stops Excel running a cell that starts like a formula.
    public static string Cell(string? v)
    {
        v ??= "";
        // Phone numbers like +91 98400 12345 are safe and stay as typed.
        if (v.Length > 0 && "=+-@\t\r".Contains(v[0]) && !v.All(ch => char.IsDigit(ch) || " +-()".Contains(ch))) v = "'" + v;
        return "\"" + v.Replace("\"", "\"\"") + "\"";
    }
}
