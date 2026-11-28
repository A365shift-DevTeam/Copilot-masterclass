using System.Security.Cryptography;
using Application.Common;
using Domain;
using Infrastructure.Persistence;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.Extensions.Configuration;

namespace Infrastructure.Settings;

/* Settings saved from the admin, with secrets encrypted at rest by ASP.NET Data
   Protection (keys in DataProtection:KeysPath, see DependencyInjection.cs). A value saved in
   the admin wins over the same value in appsettings / environment variables. */
public class SettingsStore(AppDb db, IDataProtectionProvider dp, IConfiguration config) : ISettingsStore
{
    // Never rename the purpose: secrets saved under another one can't be read back.
    readonly IDataProtector protector = dp.CreateProtector("Api.SettingsStore.v1");

    public async Task<string?> GetAsync(string key) => (await db.Settings.FindAsync(key))?.Value;

    // Adds or changes the row; the caller saves (so it lands in the same SaveChanges as its log entry).
    public async Task SetAsync(string key, string? value, bool secret = false)
    {
        var row = await db.Settings.FindAsync(key);
        var stored = string.IsNullOrEmpty(value) ? null : secret ? protector.Protect(value) : value;
        if (row is null) db.Settings.Add(new SiteSetting { Key = key, Value = stored });
        else row.Value = stored;
    }

    async Task<string?> SecretAsync(string key)
    {
        var v = await GetAsync(key);
        if (v is null) return null;
        try { return protector.Unprotect(v); }
        catch (CryptographicException) { return null; } // the key ring was lost; the admin must re-enter it
    }

    public async Task<RazorpayCreds> RazorpayAsync()
    {
        (string? v, string? src) Pick(string? saved, string configKey) =>
            !string.IsNullOrEmpty(saved) ? (saved, "admin")
            : !string.IsNullOrEmpty(config[configKey]) ? (config[configKey], "config") : (null, null);
        var id = Pick(await GetAsync(ISettingsStore.RazorpayKeyId), "Razorpay:KeyId");
        var secret = Pick(await SecretAsync(ISettingsStore.RazorpayKeySecret), "Razorpay:KeySecret");
        var hook = Pick(await SecretAsync(ISettingsStore.RazorpayWebhookSecret), "Razorpay:WebhookSecret");
        return new(id.v, secret.v, hook.v, id.src, secret.src, hook.src);
    }
}
