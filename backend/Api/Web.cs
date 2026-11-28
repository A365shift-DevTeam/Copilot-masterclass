using System.Security.Claims;
using Application.Common;
using Domain;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;

namespace Api;

/// <summary>Turns a refused request into the answer the admin and the website expect: a problem with `detail`, or an empty status.</summary>
class AppExceptionFilter : IEndpointFilter
{
    public async ValueTask<object?> InvokeAsync(EndpointFilterInvocationContext context, EndpointFilterDelegate next)
    {
        try { return await next(context); }
        catch (AppException e) { return e.Detail is null ? Results.StatusCode(e.Status) : Results.Problem(e.Detail, statusCode: e.Status); }
    }
}

/// <summary>The signed-in admin, from the session cookie.</summary>
class CurrentUser(IHttpContextAccessor http) : ICurrentUser
{
    ClaimsPrincipal User => http.HttpContext!.User;
    public int Id => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    public string Name => User.FindFirstValue(ClaimTypes.Email) ?? "admin";
}

static class Session
{
    public static Task SignIn(HttpContext http, AdminUser admin) =>
        http.SignInAsync(new ClaimsPrincipal(new ClaimsIdentity(
        [
            new Claim(ClaimTypes.NameIdentifier, admin.Id.ToString()),
            new Claim(ClaimTypes.Email, admin.Email),
            new Claim("stamp", admin.SecurityStamp),
        ], CookieAuthenticationDefaults.AuthenticationScheme)));
}
