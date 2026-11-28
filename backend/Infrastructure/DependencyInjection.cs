using Application.Common;
using Domain;
using Infrastructure.Persistence;
using Infrastructure.Razorpay;
using Infrastructure.Settings;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Infrastructure;

public static class DependencyInjection
{
    /// <param name="contentRoot">The API's content root: the default home of the data protection keys.</param>
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration config, string contentRoot)
    {
        services.AddDbContext<AppDb>(o => o.UseNpgsql(config.GetConnectionString("Db")
            ?? throw new InvalidOperationException("Set ConnectionStrings:Db in appsettings or the ConnectionStrings__Db env var.")));
        services.AddScoped<IAppDbContext>(sp => sp.GetRequiredService<AppDb>());
        services.AddScoped<ISettingsStore, SettingsStore>();
        services.AddSingleton<IPasswordHasher, PasswordHasher>();
        services.AddHttpClient<IRazorpayGateway, RazorpayClient>(c =>
        {
            c.BaseAddress = new Uri("https://api.razorpay.com/v1/");
            c.Timeout = TimeSpan.FromSeconds(20);
        });

        // Encrypts saved secrets and signs the session cookie. Losing this folder signs
        // everyone out and means re-entering the Razorpay keys, so keep it across deploys.
        var keys = services.AddDataProtection().SetApplicationName("ambot-admin")
            .PersistKeysToFileSystem(new DirectoryInfo(config["DataProtection:KeysPath"]
                ?? Path.Combine(contentRoot, "App_Data", "keys")));
        if (OperatingSystem.IsWindows()) keys.ProtectKeysWithDpapi(protectToLocalMachine: true);
        return services;
    }

    /// <summary>Brings the database schema up to date and seeds what an empty database needs.</summary>
    public static void InitialiseDatabase(this IServiceProvider services, IConfiguration config)
    {
        using var scope = services.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDb>();
        db.Database.Migrate();
        Seed.Run(db, config);
    }
}

class PasswordHasher : IPasswordHasher
{
    readonly PasswordHasher<AdminUser> hasher = new();
    public string Hash(AdminUser admin, string password) => hasher.HashPassword(admin, password);
    public bool Verify(AdminUser admin, string password) =>
        hasher.VerifyHashedPassword(admin, admin.PasswordHash, password) != PasswordVerificationResult.Failed;
}
