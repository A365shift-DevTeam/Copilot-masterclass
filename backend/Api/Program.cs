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
    // Website checkout is public and costs a Razorpay call per order.
    o.AddPolicy("checkout", c => RateLimitPartition.GetFixedWindowLimiter(c.Connection.RemoteIpAddress?.ToString() ?? "?",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 20, Window = TimeSpan.FromMinutes(10) }));
    // Confirming a paid checkout needs a valid signature anyway; a generous cap so shared office IPs never hit it.
    o.AddPolicy("verify", c => RateLimitPartition.GetFixedWindowLimiter(c.Connection.RemoteIpAddress?.ToString() ?? "?",
        _ => new FixedWindowRateLimiterOptions { PermitLimit = 200, Window = TimeSpan.FromMinutes(10) }));
});

var siteOrigins = builder.Configuration.GetSection("PublicSite:Origins").Get<string[]>() ?? [];
// POST with a JSON body (checkout) needs the preflight to allow Content-Type.
builder.Services.AddCors(o => o.AddPolicy("site", p => p.WithOrigins(siteOrigins).WithMethods("GET", "POST").WithHeaders("Content-Type")));

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
    var courses = await db.Courses.AsNoTracking().Include(c => c.Sessions).OrderBy(c => c.SortOrder).ToListAsync();
    var offers = await LiveOffers(db, now);
    var rz = await settings.RazorpayAsync();
    var canCheckout = rz.KeyId is not null && rz.KeySecret is not null;
    var forms = (await db.FormFields.AsNoTracking().OrderBy(f => f.SortOrder).ToListAsync()).ToLookup(f => f.CourseId);
    return Results.Ok(new
    {
        courses = courses.Select(c =>
        {
            var best = OfferPricing.Best(c, offers, now);
            return new
            {
                c.Key, c.Name, c.ListPrice, c.IsVisible, c.Description, c.Duration,
                // The next date (what the site shows today) and every date still to come.
                StartsAt = CourseSession.Upcoming(c.Sessions, now).FirstOrDefault()?.StartsAt,
                EndsAt = CourseSession.Upcoming(c.Sessions, now).FirstOrDefault()?.EndsAt,
                Language = CourseSession.Upcoming(c.Sessions, now).FirstOrDefault()?.Language,
                Upcoming = CourseSession.Upcoming(c.Sessions, now).Take(8).Select(x => new { x.StartsAt, x.EndsAt, x.Language }),
                c.Category, c.CardTitle, c.Cta, c.Icon, c.IsFeatured,
                Price = best?.Price ?? c.Price,
                OriginalPrice = best is null ? (decimal?)null : c.Price,
                PaymentUrl = best?.Item.SalePaymentUrl ?? c.PaymentUrl,
                Offer = best is null ? null : new { best.Value.Offer.Badge, best.Value.Offer.EndsAt },
                // No payment link: Register opens this form and pays on the site.
                Checkout = canCheckout && string.IsNullOrEmpty(c.PaymentUrl) && c.IsVisible && c.Category != null,
                Form = string.IsNullOrEmpty(c.PaymentUrl) ? forms[c.Id].Select(Checkout.ToDto) : null,
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

/* ── Website checkout: registration form, then Razorpay ───────────────────── */

app.MapPost("/api/public/checkout/{key}", async (string key, HttpRequest req, AppDb db, SettingsStore settings, RazorpayClient rzp, ILogger<Program> log) =>
{
    if (req.ContentLength is > 16_384) return Results.StatusCode(413);
    CheckoutRequest? body;
    try { body = await req.ReadFromJsonAsync<CheckoutRequest>(Checkout.Json); }
    catch (JsonException) { return Results.Problem("The form couldn't be read. Please try again.", statusCode: 400); }

    var c = await db.Courses.AsNoTracking().Include(x => x.FormFields).Include(x => x.Sessions).FirstOrDefaultAsync(x => x.Key == key);
    // Only programs shown on the website can be bought here.
    // Only programs shown on the website, and taking payment here (no payment link), can be bought.
    if (c is null || !c.IsVisible || c.Category is null || !string.IsNullOrEmpty(c.PaymentUrl)) return Results.NotFound();
    var rz = await settings.RazorpayAsync();
    if (rz.KeyId is null || rz.KeySecret is null) return Results.Problem("Online payment isn't set up yet.", statusCode: 503);

    var form = Checkout.ReadAnswers(c.FormFields.OrderBy(f => f.SortOrder).Select(Checkout.ToDto), body?.Answers);
    if (form.Error is not null) return Results.Problem(form.Error, statusCode: 400);

    var now = DateTimeOffset.UtcNow;
    // Registrations are for the next date: saved as a "Session" answer, so they can be filtered by date.
    if (CourseSession.Upcoming(c.Sessions, now).FirstOrDefault() is { } next)
        form.Answers.Insert(0, new AnswerDto("session", "Session", next.Label()));
    var price = OfferPricing.Best(c, await LiveOffers(db, now), now)?.Price ?? c.Price;
    if (price < 1) return Results.Problem("This program can't be paid for online. Please contact us.", statusCode: 400);

    var receipt = $"{c.Key}-{Guid.NewGuid():N}";
    var order = await rzp.CreateOrderAsync(rz.KeyId, rz.KeySecret, (long)(price * 100), receipt[..Math.Min(40, receipt.Length)],
        new() { ["program"] = c.Name, ["name"] = form.Name, ["email"] = form.Email ?? "", ["phone"] = form.Phone ?? "" });
    if (order.Error is not null)
    {
        log.LogWarning("Razorpay order for {Key} failed: {Error}", c.Key, order.Error);
        return Results.Problem("Payment couldn't be started. Please try again in a moment.", statusCode: 502);
    }
    var orderId = order.Body.GetProperty("id").GetString()!;
    db.CheckoutAttempts.Add(new CheckoutAttempt
    {
        OrderId = orderId, CourseId = c.Id, Amount = price, Name = form.Name, Email = form.Email, Phone = form.Phone,
        Answers = form.Answers.Select(a => new CheckoutAnswer { FieldKey = a.Key, Label = a.Label, Value = a.Value }).ToList(),
    });
    await db.SaveChangesAsync();
    return Results.Ok(new
    {
        orderId, amount = (long)(price * 100), currency = "INR", keyId = rz.KeyId,
        description = c.CardTitle ?? c.Name,
        prefill = new { name = form.Name, email = form.Email, contact = form.Phone },
    });
}).AllowAnonymous().RequireCors("site").RequireRateLimiting("checkout");

// Razorpay Checkout's success callback. The signature proves the payment belongs to the order;
// the payment itself is then read from Razorpay, since only a captured payment counts as Paid.
app.MapPost("/api/public/checkout/verify", async (VerifyRequest v, AppDb db, SettingsStore settings, RazorpayClient rzp) =>
{
    var rz = await settings.RazorpayAsync();
    if (rz.KeyId is null || rz.KeySecret is null) return Results.Problem("Online payment isn't set up.", statusCode: 503);
    if (string.IsNullOrWhiteSpace(v.OrderId) || string.IsNullOrWhiteSpace(v.PaymentId)
        || !await db.CheckoutAttempts.AnyAsync(a => a.OrderId == v.OrderId)
        || !Checkout.SignatureValid(v.OrderId, v.PaymentId, v.Signature, rz.KeySecret))
        return Results.Problem("That payment couldn't be confirmed.", statusCode: 400);

    var pay = await rzp.PaymentAsync(rz.KeyId, rz.KeySecret, v.PaymentId);
    if (pay.Error is not null) return Results.Problem("Your payment went through, but we couldn't confirm it yet. We'll be in touch shortly.", statusCode: 502);
    var ev = Razorpay.FromPaymentEntity(pay.Body);
    if (ev.OrderId != v.OrderId) return Results.Problem("That payment couldn't be confirmed.", statusCode: 400);
    await Razorpay.RecordAsync(db, ev, "", "Website checkout");
    return Results.Ok(new { status = ev.Status });
}).AllowAnonymous().RequireCors("site").RequireRateLimiting("verify");

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

app.MapGet("/api/courses", async (AppDb db) =>
    await db.Courses.AsNoTracking().Include(c => c.Sessions.OrderBy(x => x.StartsAt)).OrderBy(c => c.SortOrder).ToListAsync());

app.MapPut("/api/courses/{id:int}", async (int id, CourseDto dto, AppDb db, ClaimsPrincipal user) =>
{
    var c = await db.Courses.Include(x => x.Sessions).FirstOrDefaultAsync(x => x.Id == id);
    if (c is null) return Results.NotFound();
    var error = Validate.Course(dto, c.Key);
    if (error is not null) return Results.Problem(error, statusCode: 400);

    var changes = new List<string>();
    void Track<T>(string what, T before, T after) { if (!EqualityComparer<T>.Default.Equals(before, after)) changes.Add(what); }
    Track("name", c.Name, dto.Name!.Trim());
    Track($"price to {dto.Price:0.##}", c.Price, dto.Price);
    Track("package price", c.ListPrice, dto.ListPrice);
    var link = string.IsNullOrWhiteSpace(dto.PaymentUrl) ? null : dto.PaymentUrl.Trim();
    Track(link is null ? "payment on the website" : "payment link", c.PaymentUrl, link);
    Track(dto.IsVisible ? "shown on site" : "hidden from site", c.IsVisible, dto.IsVisible);

    c.Name = dto.Name!.Trim();
    c.Price = dto.Price;
    c.ListPrice = dto.ListPrice;
    c.PaymentUrl = link;
    c.RazorpayId = string.IsNullOrWhiteSpace(dto.RazorpayId) ? null : dto.RazorpayId.Trim();
    if (dto.Sessions is not null)
    {
        var next = dto.Sessions.Select(x => new CourseSession
        {
            CourseId = c.Id, StartsAt = x.StartsAt.ToUniversalTime(), EndsAt = x.EndsAt?.ToUniversalTime(), // Npgsql only writes UTC offsets
            Language = string.IsNullOrWhiteSpace(x.Language) ? null : x.Language.Trim(),
        }).OrderBy(x => x.StartsAt).ToList();
        var before = string.Join("|", c.Sessions.OrderBy(x => x.StartsAt).Select(x => $"{x.StartsAt:O}{x.EndsAt:O}{x.Language}"));
        if (before != string.Join("|", next.Select(x => $"{x.StartsAt:O}{x.EndsAt:O}{x.Language}"))) changes.Add($"dates ({next.Count})");
        db.RemoveRange(c.Sessions);
        c.Sessions = next;
    }
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
    var c = new Course { Key = key, Kind = "ladder", Name = dto.Name!.Trim(), PaymentUrl = string.IsNullOrWhiteSpace(dto.PaymentUrl) ? null : dto.PaymentUrl.Trim(),
        SortOrder = (await db.Courses.MaxAsync(x => (int?)x.SortOrder) ?? 0) + 1 };
    c.Price = dto.Price;
    c.RazorpayId = string.IsNullOrWhiteSpace(dto.RazorpayId) ? null : dto.RazorpayId.Trim();
    c.Description = dto.Description?.Trim() ?? "";
    c.Duration = dto.Duration?.Trim() ?? "";
    c.IsVisible = dto.IsVisible;
    ApplyCard(c, dto.Card!);
    await PlaceCard(db, c, dto.Card!.Position);
    c.FormFields.AddRange(Checkout.DefaultFields(0)); // the course id is filled in on save
    db.Courses.Add(c);
    db.Log(Me(user), "program.created", $"Added Pricing card \"{c.Name}\" at {c.Price:0.##}");
    await db.SaveChangesAsync();
    return Results.Created($"/api/courses/{c.Id}", c);
});

/* ── Hero section dates: the webinar's dates, one row each ───────────────────
   The website's hero shows the next one, and every later one as its own row. */

async Task<Course?> Webinar(AppDb db) => await db.Courses.FirstOrDefaultAsync(c => c.Key == "webinar");

app.MapGet("/api/hero-dates", async (AppDb db) =>
{
    var w = await Webinar(db);
    if (w is null) return Results.NotFound();
    var dates = await db.Set<CourseSession>().AsNoTracking().Where(x => x.CourseId == w.Id).OrderBy(x => x.StartsAt).ToListAsync();
    return Results.Ok(dates.Select(x => new { x.Id, x.StartsAt, x.EndsAt, x.Language }));
});

app.MapPost("/api/hero-dates", async (SessionDto dto, AppDb db, ClaimsPrincipal user) =>
{
    var w = await Webinar(db);
    if (w is null) return Results.NotFound();
    if (Validate.Session(dto) is { } error) return Results.Problem(error, statusCode: 400);
    var x = new CourseSession { CourseId = w.Id };
    ApplySession(x, dto);
    db.Add(x);
    db.Log(Me(user), "program.updated", $"Added webinar date {x.Label()}");
    await db.SaveChangesAsync();
    return Results.Created($"/api/hero-dates/{x.Id}", new { x.Id });
});

app.MapPut("/api/hero-dates/{id:int}", async (int id, SessionDto dto, AppDb db, ClaimsPrincipal user) =>
{
    var x = await db.Set<CourseSession>().FindAsync(id);
    if (x is null) return Results.NotFound();
    if (Validate.Session(dto) is { } error) return Results.Problem(error, statusCode: 400);
    var before = x.Label();
    ApplySession(x, dto);
    db.Log(Me(user), "program.updated", $"Changed webinar date {before} to {x.Label()}");
    await db.SaveChangesAsync();
    return Results.NoContent();
});

app.MapDelete("/api/hero-dates/{id:int}", async (int id, AppDb db, ClaimsPrincipal user) =>
{
    var x = await db.Set<CourseSession>().FindAsync(id);
    if (x is null) return Results.NotFound();
    db.Remove(x);
    db.Log(Me(user), "program.updated", $"Removed webinar date {x.Label()}");
    await db.SaveChangesAsync();
    return Results.NoContent();
});

/* ── Registration form per program (the form builder) ─────────────────────── */

app.MapGet("/api/courses/{id:int}/form", async (int id, AppDb db) =>
{
    var c = await db.Courses.AsNoTracking().Include(x => x.FormFields).FirstOrDefaultAsync(x => x.Id == id);
    return c is null ? Results.NotFound()
        : Results.Ok(new { Fields = c.FormFields.OrderBy(f => f.SortOrder).Select(Checkout.ToDto) });
});

app.MapPut("/api/courses/{id:int}/form", async (int id, FormDto dto, AppDb db, ClaimsPrincipal user) =>
{
    var c = await db.Courses.Include(x => x.FormFields).FirstOrDefaultAsync(x => x.Id == id);
    if (c is null) return Results.NotFound();
    var error = Checkout.ValidateForm(dto.Fields);
    if (error is not null) return Results.Problem(error, statusCode: 400);
    // Replace the rows; keys are kept, so answers already given stay with their field.
    db.FormFields.RemoveRange(c.FormFields);
    db.FormFields.AddRange(Checkout.ToRows(c.Id, dto.Fields!));
    c.UpdatedAt = DateTimeOffset.UtcNow;
    db.Log(Me(user), "program.form", $"{c.CardTitle ?? c.Name}: registration form saved ({dto.Fields!.Count} fields)");
    await db.SaveChangesAsync();
    return Results.NoContent();
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
                           p.Status, p.Method, p.Reference, p.PaidAt, p.Notes, FromRazorpay = p.GatewayPaymentId != null,
                           Answers = p.Answers.OrderBy(a => a.Id).Select(a => new { Key = a.FieldKey, a.Label, a.Value }) })
        .ToListAsync();
    return Results.Ok(new { total, paidSum, items });
});

app.MapGet("/api/payments/export", async (AppDb db, string? q, string? email, string? status, int? courseId, bool? unassigned, DateTimeOffset? from, DateTimeOffset? to, string? ids) =>
{
    var query = Filter(db, q, email, status, courseId, unassigned, from, to);
    var only = Ids(ids);
    if (only.Count > 0) query = query.Where(p => only.Contains(p.Id)); // the rows ticked in the list
    var rows = await query.OrderByDescending(p => p.PaidAt)
        .Select(p => new { p.Id, p.PaidAt, Course = p.Course!.Name, p.CustomerName, p.Email, p.Phone, p.Amount, p.Currency, p.Status, p.Method, p.Reference, p.Notes,
                           Answers = string.Join("; ", p.Answers.OrderBy(a => a.Id).Select(a => a.Label + ": " + a.Value)) })
        .ToListAsync();
    var csv = new StringBuilder("Id,Paid at (IST),Program,Name,Email,Phone,Amount,Currency,Status,Method,Reference,Notes,Form answers\n");
    foreach (var r in rows)
        csv.AppendJoin(',', new[] { r.Id.ToString(), r.PaidAt.ToOffset(ist).ToString("yyyy-MM-dd HH:mm"), r.Course, r.CustomerName, r.Email, r.Phone,
            r.Amount.ToString(CultureInfo.InvariantCulture), r.Currency, r.Status, r.Method, r.Reference, r.Notes, r.Answers }.Select(Csv.Cell)).Append('\n');
    return Results.File(Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(csv.ToString())).ToArray(),
        "text/csv", $"payments-{DateTime.UtcNow:yyyyMMdd}.csv");
});

// The bulk bar: set the status of, or delete, the ticked payments.
app.MapPost("/api/payments/bulk", async (BulkDto dto, AppDb db, ClaimsPrincipal user) =>
{
    var ids = (dto.Ids ?? []).Distinct().Take(500).ToList();
    if (ids.Count == 0) return Results.Problem("Select at least one payment.", statusCode: 400);
    var rows = await db.Payments.Where(p => ids.Contains(p.Id)).ToListAsync();
    switch (dto.Action)
    {
        case "delete":
            db.Payments.RemoveRange(rows);
            db.Log(Me(user), "payment.deleted", $"Deleted {rows.Count} payments: {string.Join(", ", rows.Take(5).Select(p => p.CustomerName))}{(rows.Count > 5 ? "…" : "")}");
            break;
        case "status" when PaymentStatus.All.Contains(dto.Status):
            foreach (var p in rows) { p.Status = dto.Status!; p.UpdatedAt = DateTimeOffset.UtcNow; }
            db.Log(Me(user), "payment.updated", $"Set {rows.Count} payments to {dto.Status}");
            break;
        default:
            return Results.Problem("Choose an action: delete, or a status.", statusCode: 400);
    }
    await db.SaveChangesAsync();
    return Results.Ok(new { count = rows.Count });
});

// One payment, for opening its edit form from a link (#payments/edit/12).
app.MapGet("/api/payments/{id:int}", async (int id, AppDb db) =>
    await db.Payments.AsNoTracking().Where(p => p.Id == id)
        .Select(p => new { p.Id, p.CourseId, CourseName = p.Course!.Name, p.CustomerName, p.Email, p.Phone, p.Amount, p.Currency,
                           p.Status, p.Method, p.Reference, p.PaidAt, p.Notes, FromRazorpay = p.GatewayPaymentId != null,
                           Answers = p.Answers.OrderBy(a => a.Id).Select(a => new { Key = a.FieldKey, a.Label, a.Value }) })
        .FirstOrDefaultAsync() is { } p ? Results.Ok(p) : Results.NotFound());

app.MapPost("/api/payments", async (PaymentDto dto, AppDb db, ClaimsPrincipal user) =>
{
    var error = await Validate.Payment(dto, db);
    if (error is not null) return Results.Problem(error, statusCode: 400);
    var p = new Payment { CustomerName = "" };
    Apply(p, dto);
    p.Answers = (dto.Answers ?? []).Where(a => !string.IsNullOrWhiteSpace(a.Key) && !string.IsNullOrWhiteSpace(a.Value))
        .Select(a => new PaymentAnswer { FieldKey = a.Key, Label = a.Label, Value = a.Value.Trim()[..Math.Min(2000, a.Value.Trim().Length)] }).ToList();
    db.Payments.Add(p);
    db.Log(Me(user), "payment.created", $"Recorded {p.CustomerName}, {p.Amount:0.##} {p.Currency} ({p.Status})");
    await db.SaveChangesAsync();
    return Results.Created($"/api/payments/{p.Id}", new { p.Id });
});

app.MapPut("/api/payments/{id:int}", async (int id, PaymentDto dto, AppDb db, ClaimsPrincipal user) =>
{
    var p = await db.Payments.Include(x => x.Answers).FirstOrDefaultAsync(x => x.Id == id);
    if (p is null) return Results.NotFound();
    var error = await Validate.Payment(dto, db);
    if (error is not null) return Results.Problem(error, statusCode: 400);
    var before = $"{p.Amount:0.##} {p.Status}";
    Apply(p, dto);
    if (dto.Answers is not null)
    {
        if (dto.Answers.Any(a => string.IsNullOrWhiteSpace(a.Key) || a.Value is { Length: > 2000 }))
            return Results.Problem("An answer is missing its field or is too long.", statusCode: 400);
        db.PaymentAnswers.RemoveRange(p.Answers);
        p.Answers = dto.Answers.Where(a => !string.IsNullOrWhiteSpace(a.Value))
            .Select(a => new PaymentAnswer { FieldKey = a.Key, Label = a.Label, Value = a.Value.Trim() }).ToList();
    }
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

/* ── Registrations: everyone who filled in a program's form ──────────────────
   Payers (one row per payment) and people who filled the form but never paid
   ("Registered"), with a column per form field. */

app.MapGet("/api/registrations", async (AppDb db, HttpRequest req, int? courseId, string? q, string? status, int page = 1, int size = 25) =>
{
    var (columns, rows) = await Registrations(db, req, courseId, q, status);
    size = Math.Clamp(size, 10, 200);
    var counts = rows.GroupBy(r => r.Status).ToDictionary(g => g.Key, g => g.Count());
    return Results.Ok(new { columns, total = rows.Count, counts, rows = rows.Skip((Math.Max(page, 1) - 1) * size).Take(size) });
});

// Removes an unpaid registration ("R7"): every unpaid try that person made for that program,
// so an older try doesn't take its place in the list.
app.MapDelete("/api/registrations/attempt/{id:int}", async (int id, AppDb db, ClaimsPrincipal user) =>
{
    var a = await db.CheckoutAttempts.FindAsync(id);
    if (a is null) return Results.NotFound();
    var email = a.Email?.ToLower();
    var tries = await db.CheckoutAttempts.Where(t => t.CourseId == a.CourseId && !db.Payments.Any(p => p.GatewayOrderId == t.OrderId)
            && (t.Id == id || (email != null && t.Email != null && t.Email.ToLower() == email)))
        .ToListAsync();
    db.CheckoutAttempts.RemoveRange(tries);
    db.Log(Me(user), "registration.deleted", $"Deleted the unpaid registration of {a.Name}{(a.Email is null ? "" : $" ({a.Email})")}");
    await db.SaveChangesAsync();
    return Results.NoContent();
});

// The bulk bar in Registrations: delete ticked rows ("P12" payments, "R7" unpaid registrations), or set a status on the payments among them.
app.MapPost("/api/registrations/bulk", async (RegBulkDto dto, AppDb db, ClaimsPrincipal user) =>
{
    var ids = (dto.Ids ?? []).Distinct().Take(500).ToList();
    var payIds = ids.Where(i => i.StartsWith('P') && int.TryParse(i[1..], out _)).Select(i => int.Parse(i[1..])).ToList();
    var tryIds = ids.Where(i => i.StartsWith('R') && int.TryParse(i[1..], out _)).Select(i => int.Parse(i[1..])).ToList();
    if (payIds.Count + tryIds.Count == 0) return Results.Problem("Select at least one row.", statusCode: 400);
    var payments = await db.Payments.Where(p => payIds.Contains(p.Id)).ToListAsync();
    if (dto.Action == "status")
    {
        if (!PaymentStatus.All.Contains(dto.Status)) return Results.Problem("Choose a status.", statusCode: 400);
        foreach (var p in payments) { p.Status = dto.Status!; p.UpdatedAt = DateTimeOffset.UtcNow; }
        db.Log(Me(user), "payment.updated", $"Set {payments.Count} payments to {dto.Status} (from Registrations)");
        await db.SaveChangesAsync();
        return Results.Ok(new { count = payments.Count, skipped = tryIds.Count }); // unpaid registrations have no payment status
    }
    if (dto.Action != "delete") return Results.Problem("Choose an action.", statusCode: 400);
    // An unpaid row stands for every unpaid try by that person for that program; remove them all.
    var picked = await db.CheckoutAttempts.Where(t => tryIds.Contains(t.Id)).Select(t => new { t.CourseId, Email = t.Email == null ? null : t.Email.ToLower(), t.Id }).ToListAsync();
    var emails = picked.Where(t => t.Email != null).Select(t => t.Email!).ToList();
    var courseIds = picked.Select(t => t.CourseId).Distinct().ToList();
    var tries = await db.CheckoutAttempts.Where(t => tryIds.Contains(t.Id)
            || (courseIds.Contains(t.CourseId) && t.Email != null && emails.Contains(t.Email.ToLower()) && !db.Payments.Any(p => p.GatewayOrderId == t.OrderId)))
        .ToListAsync();
    db.Payments.RemoveRange(payments);
    db.CheckoutAttempts.RemoveRange(tries);
    db.Log(Me(user), "registration.deleted", $"Deleted {payments.Count} payments and {picked.Count} unpaid registrations");
    await db.SaveChangesAsync();
    return Results.Ok(new { count = payments.Count + picked.Count });
});

app.MapGet("/api/registrations/export", async (AppDb db, HttpRequest req, int? courseId, string? q, string? status) =>
{
    var (columns, rows) = await Registrations(db, req, courseId, q, status);
    // Name, email and phone are their own columns, so rows from before a form existed still fill them.
    var extra = columns.Where(c => c.Key is not ("name" or "email" or "phone")).ToList();
    var csv = new StringBuilder(string.Join(",", new[] { "Ref", "Date (IST)", "Program", "Status", "Amount", "Name", "Email", "Phone" }.Concat(extra.Select(c => c.Label)).Select(Csv.Cell)) + "\n");
    foreach (var r in rows)
    {
        var cells = new[] { r.Id, r.At.ToOffset(ist).ToString("yyyy-MM-dd HH:mm"), r.Program, r.Status == Reg.Registered ? "Registered (not paid)" : r.Status,
                r.Amount.ToString(CultureInfo.InvariantCulture), r.CustomerName, r.Email, r.Phone }
            .Concat(extra.Select(c => r.Answers.FirstOrDefault(a => a.Key == c.Key)?.Value));
        csv.AppendJoin(',', cells.Select(Csv.Cell)).Append('\n');
    }
    var name = courseId is null ? "all-programs" : await db.Courses.Where(c => c.Id == courseId).Select(c => c.Key).FirstOrDefaultAsync() ?? "program";
    return Results.File(Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(csv.ToString())).ToArray(), "text/csv", $"registrations-{name}-{DateTime.UtcNow:yyyyMMdd}.csv");
});

/* ── Customers: everyone in the ledger, one row per person ────────────────── */

app.MapGet("/api/customers", async (AppDb db, string? q, string? status, int? courseId, DateTimeOffset? from, DateTimeOffset? to, int page = 1, int size = 25) =>
{
    // shortcut: groups in memory, fine to tens of thousands of payments; move to a SQL GROUP BY past that.
    var rows = await Filter(db, q, null, status, courseId, null, from, to)
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
    var now = DateTimeOffset.UtcNow;
    var all = await db.Courses.AsNoTracking().Include(c => c.Sessions).OrderBy(c => c.SortOrder).ToListAsync();
    var courses = all.Select(c => { var n = CourseSession.Upcoming(c.Sessions, now).FirstOrDefault(); return new { c.Id, c.Key, c.Name, c.Price, n?.StartsAt, n?.EndsAt, n?.Language, c.IsVisible }; }).ToList();
    var sessions = all.Where(c => c.IsVisible).SelectMany(c => CourseSession.Upcoming(c.Sessions, now).Select(x => new { CourseId = c.Id, c.Name, x.StartsAt, x.EndsAt, x.Language }))
        .OrderBy(x => x.StartsAt).Take(12).ToList();
    var unassigned = await db.Payments.CountAsync(p => p.CourseId == null);
    // The live offer (if any) and the next one coming up, for the Overview card.
    var offers = await db.Offers.AsNoTracking().Where(o => !o.IsPaused && o.EndsAt > now).OrderBy(o => o.StartsAt).Take(2)
        .Select(o => new { o.Id, o.Name, o.Badge, o.StartsAt, o.EndsAt, Programs = o.Items.Count }).ToListAsync();
    return Results.Ok(new { byStatus, byCourse, daily, recent, courses, sessions, unassigned, offers });
});

// Unknown /api paths answer 404, not the admin page.
app.MapFallback("/api/{**rest}", () => Results.NotFound()).AllowAnonymous();
app.MapFallbackToFile("index.html").AllowAnonymous();

app.Run();

// The current form's fields, then any older field only past answers still have; and the matching rows.
// Field filters arrive as ?f.<fieldKey>=text and match answers containing that text.
// shortcut: payments and unpaid attempts are merged and paged in memory, fine to tens of thousands per program.
// courseId null = every program: then the rows carry their program and the question columns
// (which differ per program) are left out.
static async Task<(List<FieldDto> Columns, List<RegRow> Rows)> Registrations(AppDb db, HttpRequest req, int? courseId, string? q, string? status)
{
    var columns = new List<FieldDto>();
    if (courseId is not null)
    {
        var fields = await db.FormFields.AsNoTracking().Where(f => f.CourseId == courseId).OrderBy(f => f.SortOrder).ToListAsync();
        columns = fields.Select(Checkout.ToDto).ToList();
        var paidKeys = await db.PaymentAnswers.AsNoTracking().Where(a => db.Payments.Any(p => p.Id == a.PaymentId && p.CourseId == courseId))
            .GroupBy(a => a.FieldKey).Select(g => new { Key = g.Key, Label = g.Max(a => a.Label) }).ToListAsync();
        var triedKeys = await db.CheckoutAttempts.AsNoTracking().Where(t => t.CourseId == courseId).SelectMany(t => t.Answers)
            .GroupBy(a => a.FieldKey).Select(g => new { Key = g.Key, Label = g.Max(a => a.Label) }).ToListAsync();
        foreach (var o in paidKeys.Concat(triedKeys))
            if (columns.All(c => c.Key != o.Key)) columns.Add(o.Key == "session" ? new FieldDto("session", "Session", "text") : new FieldDto(o.Key, o.Label + " (removed)", "text"));
    }

    var filters = req.Query.Where(x => x.Key.StartsWith("f.") && !string.IsNullOrWhiteSpace(x.Value))
        .Select(x => (Key: x.Key[2..], Like: $"%{x.Value.ToString().Trim()}%")).ToList();
    var rows = new List<RegRow>();
    // Date range (?from=&to=), the same filter Payments and Customers have.
    DateTimeOffset? Day(string k) => DateTimeOffset.TryParse(req.Query[k], CultureInfo.InvariantCulture, DateTimeStyles.None, out var d) ? d : null;
    var (from, to) = (Day("from"), Day("to"));

    if (status != Reg.Registered)
    {
        var query = Filter(db, q, null, string.IsNullOrEmpty(status) ? null : status, courseId, null, from, to);
        foreach (var (key, like) in filters) query = query.Where(p => p.Answers.Any(a => a.FieldKey == key && EF.Functions.ILike(a.Value, like)));
        rows.AddRange((await query.Select(p => new { p.Id, p.CustomerName, p.Email, p.Phone, p.Amount, p.Status, p.PaidAt,
                Program = p.Course == null ? null : p.Course.CardTitle ?? p.Course.Name,
                Answers = p.Answers.Select(a => new RegAnswer(a.FieldKey, a.Value)).ToList() }).ToListAsync())
            .Select(p => new RegRow($"P{p.Id}", p.Id, p.Program, p.CustomerName, p.Email, p.Phone, p.Amount, p.Status, p.PaidAt, p.Answers)));
    }

    if (string.IsNullOrEmpty(status) || status == Reg.Registered)
    {
        // Filled in the form and went to Razorpay, but no payment came back for that order.
        var tries = db.CheckoutAttempts.AsNoTracking().Where(t => (courseId == null || t.CourseId == courseId) && !db.Payments.Any(p => p.GatewayOrderId == t.OrderId));
        if (from is not null) { var f = from.Value.ToUniversalTime(); tries = tries.Where(t => t.CreatedAt >= f); }
        if (to is not null) { var e = to.Value.ToUniversalTime(); tries = tries.Where(t => t.CreatedAt < e); }
        if (!string.IsNullOrWhiteSpace(q))
        {
            var like = $"%{q.Trim()}%";
            tries = tries.Where(t => EF.Functions.ILike(t.Name, like) || EF.Functions.ILike(t.Email ?? "", like) || EF.Functions.ILike(t.Phone ?? "", like) || EF.Functions.ILike(t.OrderId, like));
        }
        foreach (var (key, like) in filters) tries = tries.Where(t => t.Answers.Any(a => a.FieldKey == key && EF.Functions.ILike(a.Value, like)));
        var attempts = await tries.OrderByDescending(t => t.CreatedAt)
            .Select(t => new { t.Id, t.CourseId, t.Name, t.Email, t.Phone, t.Amount, t.CreatedAt,
                Program = db.Courses.Where(c => c.Id == t.CourseId).Select(c => c.CardTitle ?? c.Name).FirstOrDefault(),
                Answers = t.Answers.Select(a => new RegAnswer(a.FieldKey, a.Value)).ToList() })
            .ToListAsync();
        // Someone who paid for this program shows as that payment, not also as an unpaid try;
        // and someone who tried several times shows once, with their latest details.
        // Per program: paying for one program doesn't hide an unpaid registration for another.
        var payers = (await db.Payments.Where(p => (courseId == null || p.CourseId == courseId) && p.CourseId != null && p.Email != null)
            .Select(p => new { p.CourseId, Email = p.Email!.ToLower() }).Distinct().ToListAsync()).Select(x => $"{x.CourseId}|{x.Email}").ToHashSet();
        rows.AddRange(attempts.Where(t => t.Email is null || !payers.Contains($"{t.CourseId}|{t.Email.ToLower()}"))
            .GroupBy(t => (t.CourseId, Who: t.Email?.ToLower() ?? t.Phone ?? t.Name.ToLower())).Select(g => g.First())
            .Select(t => new RegRow($"R{t.Id}", null, t.Program, t.Name, t.Email, t.Phone, t.Amount, Reg.Registered, t.CreatedAt, t.Answers)));
    }
    // ?ids=P12,R7: only the rows ticked in the list (the export of a selection).
    var picked = (req.Query["ids"].ToString() ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToHashSet();
    if (picked.Count > 0) rows = rows.Where(r => picked.Contains(r.Id)).ToList();
    return (columns, rows.OrderByDescending(r => r.At).ToList());
}

static List<int> Ids(string? csv) =>
    (csv ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
        .Select(x => int.TryParse(x, out var n) ? n : 0).Where(n => n > 0).Take(500).ToList();

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

static void ApplySession(CourseSession x, SessionDto dto)
{
    x.StartsAt = dto.StartsAt.ToUniversalTime(); // Npgsql only writes UTC offsets to timestamptz
    x.EndsAt = dto.EndsAt?.ToUniversalTime();
    x.Language = string.IsNullOrWhiteSpace(dto.Language) ? null : dto.Language.Trim();
}

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
record CourseDto(string? Name, decimal Price, decimal? ListPrice, string? PaymentUrl, string? RazorpayId, bool IsVisible, string? Description = null, string? Duration = null, CardDto? Card = null, List<SessionDto>? Sessions = null);
record SessionDto(DateTimeOffset StartsAt, DateTimeOffset? EndsAt, string? Language);
// How a program appears as a Pricing section card. Null Category takes it off the Pricing section.
// Position: where in its tab, as a sort value (e.g. another card's SortOrder + 0.5 for "after it"); null keeps it.
record CardDto(string? Category, string? CardTitle, string? Cta, string? Icon, bool IsFeatured, double? Position);
record PaymentDto(int CourseId, string? CustomerName, string? Email, string? Phone, decimal Amount, string? Status, string? Method, string? Reference, DateTimeOffset? PaidAt, string? Notes, List<AnswerDto>? Answers = null);
record SiteSettingsDto(string? WhatsappUrl);
record RazorpayKeysDto(string? KeyId, string? KeySecret, string? WebhookSecret, bool Clear);
record SyncDto(int Days);
record BulkDto(List<int>? Ids, string? Action, string? Status);
record RegBulkDto(List<string>? Ids, string? Action, string? Status);
// A row in Registrations: a payment (Id "P12") or an unpaid form fill (Id "R7", Status "Registered").
record RegRow(string Id, int? PaymentId, string? Program, string CustomerName, string? Email, string? Phone, decimal Amount, string Status, DateTimeOffset At, List<RegAnswer> Answers);
record RegAnswer(string Key, string Value);
static class Reg { public const string Registered = "Registered"; }
record FormDto(List<FieldDto>? Fields);
record CheckoutRequest(Dictionary<string, JsonElement>? Answers);
record VerifyRequest(string? OrderId, string? PaymentId, string? Signature);
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
        // Optional: empty means the website takes the registration and payment itself.
        if (!string.IsNullOrWhiteSpace(d.PaymentUrl) && (!Uri.TryCreate(d.PaymentUrl.Trim(), UriKind.Absolute, out var u) || u.Scheme != Uri.UriSchemeHttps))
            return "The payment link must be a full https:// address, or left empty to take payment on the website.";
        if (d.Sessions is { Count: > 50 }) return "A program can have up to 50 dates.";
        if (d.Sessions?.FirstOrDefault(x => x.EndsAt is not null && x.EndsAt <= x.StartsAt) is { } bad)
            return $"The date starting {bad.StartsAt.ToOffset(TimeSpan.FromHours(5.5)):d MMM, h:mm tt} ends before it starts.";
        if (d.Sessions?.Any(x => x.Language is { Length: > 40 }) == true) return "Keep the language to 40 characters.";
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

    public static string? Session(SessionDto d)
    {
        if (d.StartsAt == default) return "Choose when the session starts.";
        if (d.EndsAt is not null && d.EndsAt <= d.StartsAt) return "The session must end after it starts.";
        if (d.Language is { Length: > 40 }) return "Keep the language to 40 characters.";
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
