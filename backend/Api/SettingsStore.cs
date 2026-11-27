using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.DataProtection;
using Microsoft.EntityFrameworkCore;

namespace Api;

/* Settings saved from the admin, with secrets encrypted at rest by ASP.NET Data
   Protection (keys in DataProtection:KeysPath, see Program.cs). A value saved in
   the admin wins over the same value in appsettings / environment variables. */
public class SettingsStore(AppDb db, IDataProtectionProvider dp, IConfiguration config)
{
    public const string RazorpayKeyId = "razorpay.keyId";
    public const string RazorpayKeySecret = "razorpay.keySecret"; // encrypted
    public const string RazorpayWebhookSecret = "razorpay.webhookSecret"; // encrypted

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

    public record RazorpayCreds(string? KeyId, string? KeySecret, string? WebhookSecret,
        string? KeyIdSource, string? KeySecretSource, string? WebhookSecretSource);

    public async Task<RazorpayCreds> RazorpayAsync()
    {
        (string? v, string? src) Pick(string? saved, string configKey) =>
            !string.IsNullOrEmpty(saved) ? (saved, "admin")
            : !string.IsNullOrEmpty(config[configKey]) ? (config[configKey], "config") : (null, null);
        var id = Pick(await GetAsync(RazorpayKeyId), "Razorpay:KeyId");
        var secret = Pick(await SecretAsync(RazorpayKeySecret), "Razorpay:KeySecret");
        var hook = Pick(await SecretAsync(RazorpayWebhookSecret), "Razorpay:WebhookSecret");
        return new(id.v, secret.v, hook.v, id.src, secret.src, hook.src);
    }
}

/* The bits of the Razorpay REST API the admin uses: https://razorpay.com/docs/api/payments/ */
public class RazorpayClient(HttpClient http)
{
    public record Page(List<JsonElement> Items, int Status, string? Error);

    public record Reply(JsonElement Body, int Status, string? Error);

    // One authenticated call; errors come back as Razorpay's own description where it gives one.
    async Task<Reply> SendAsync(string keyId, string keySecret, HttpMethod method, string path, object? json = null)
    {
        using var req = new HttpRequestMessage(method, path);
        req.Headers.Authorization = new AuthenticationHeaderValue("Basic", Convert.ToBase64String(Encoding.UTF8.GetBytes($"{keyId}:{keySecret}")));
        if (json is not null) req.Content = JsonContent.Create(json);
        HttpResponseMessage res;
        try { res = await http.SendAsync(req); }
        catch (Exception e) when (e is HttpRequestException or TaskCanceledException)
        {
            return new(default, 0, "Couldn't reach Razorpay. Check the server's internet connection and try again.");
        }
        using var _ = res;
        var body = await res.Content.ReadAsStringAsync();
        JsonElement root = default;
        try { root = JsonDocument.Parse(body).RootElement.Clone(); }
        catch (JsonException) { }
        if (res.IsSuccessStatusCode && root.ValueKind == JsonValueKind.Object) return new(root, 200, null);
        string? message = null;
        if (root.ValueKind == JsonValueKind.Object && root.TryGetProperty("error", out var err) && err.TryGetProperty("description", out var d))
            message = d.GetString();
        return new(default, (int)res.StatusCode, message ?? $"Razorpay answered {(int)res.StatusCode}.");
    }

    public async Task<Page> PaymentsAsync(string keyId, string keySecret, DateTimeOffset from, DateTimeOffset to, int skip, int count = 100)
    {
        var r = await SendAsync(keyId, keySecret, HttpMethod.Get, $"payments?from={from.ToUnixTimeSeconds()}&to={to.ToUnixTimeSeconds()}&count={count}&skip={skip}");
        return r.Error is not null ? new([], r.Status, r.Error) : new(r.Body.GetProperty("items").EnumerateArray().Select(e => e.Clone()).ToList(), 200, null);
    }

    /// <summary>Creates an order for `paise`. The order fixes the amount, so a visitor can't change what they pay.</summary>
    public Task<Reply> CreateOrderAsync(string keyId, string keySecret, long paise, string receipt, Dictionary<string, string> notes) =>
        SendAsync(keyId, keySecret, HttpMethod.Post, "orders", new { amount = paise, currency = "INR", receipt, notes });

    public Task<Reply> PaymentAsync(string keyId, string keySecret, string paymentId) =>
        SendAsync(keyId, keySecret, HttpMethod.Get, $"payments/{Uri.EscapeDataString(paymentId)}");
}
