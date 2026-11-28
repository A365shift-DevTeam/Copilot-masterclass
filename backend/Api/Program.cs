using System.Security.Claims;
using System.Threading.RateLimiting;
using Api;
using Api.Endpoints;
using Application;
using Application.Common;
using Infrastructure;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;

/* The web host: sign-in, CORS, rate limits and the routes. What each route does lives in Application;
   the database, Razorpay and secrets in Infrastructure. */
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration, builder.Environment.ContentRootPath);
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUser, CurrentUser>();

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
        var db = c.HttpContext.RequestServices.GetRequiredService<IAppDbContext>();
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

app.Services.InitialiseDatabase(app.Configuration);

app.UseDefaultFiles();
app.UseStaticFiles(); // the built admin UI in wwwroot (see admin/vite.config.js)
app.UseCors();
app.UseRateLimiter();
app.UseAuthentication();
app.UseAuthorization();

// Sign-in is per route: the fallback policy covers every route that doesn't say AllowAnonymous.
var api = app.MapGroup("/api").AddEndpointFilter<AppExceptionFilter>();
api.MapPublic();
api.MapAdmins(siteOrigins.FirstOrDefault());
api.MapPrograms();
api.MapLedger();
api.MapSettings();

// Unknown /api paths answer 404, not the admin page.
app.MapFallback("/api/{**rest}", () => Results.NotFound()).AllowAnonymous();
app.MapFallbackToFile("index.html").AllowAnonymous();

app.Run();
