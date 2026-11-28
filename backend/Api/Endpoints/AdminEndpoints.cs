using Application.Admins;
using Microsoft.AspNetCore.Authentication;

namespace Api.Endpoints;

/* Signing in, and the Team page. */
static class AdminEndpoints
{
    public static void MapAdmins(this RouteGroupBuilder api, string? siteUrl)
    {
        api.MapPost("/auth/login", async (LoginDto dto, AuthService auth, HttpContext http) =>
        {
            var admin = await auth.LoginAsync(dto);
            await Session.SignIn(http, admin);
            return Results.Ok(new { admin.Id, admin.Email, admin.Name });
        }).AllowAnonymous().RequireRateLimiting("login");

        api.MapPost("/auth/logout", async (HttpContext http) =>
        {
            await http.SignOutAsync();
            return Results.NoContent();
        }).AllowAnonymous();

        api.MapGet("/auth/me", async (AuthService auth) => Results.Ok(await auth.MeAsync(siteUrl)));

        api.MapPost("/auth/password", async (PasswordDto dto, AuthService auth, HttpContext http) =>
        {
            await Session.SignIn(http, await auth.ChangePasswordAsync(dto)); // keep this session
            return Results.NoContent();
        });

        api.MapGet("/admins", async (AdminService admins) => Results.Ok(await admins.ListAsync()));

        api.MapPost("/admins", async (AdminDto dto, AdminService admins) =>
        {
            var id = await admins.AddAsync(dto);
            return Results.Created($"/api/admins/{id}", new { Id = id });
        });

        api.MapDelete("/admins/{id:int}", async (int id, AdminService admins) =>
        {
            await admins.RemoveAsync(id);
            return Results.NoContent();
        });
    }
}
