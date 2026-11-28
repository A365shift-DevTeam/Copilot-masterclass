using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Application.Common;

namespace Infrastructure.Razorpay;

/* The bits of the Razorpay REST API the admin and the website checkout use: https://razorpay.com/docs/api/payments/ */
public class RazorpayClient(HttpClient http) : IRazorpayGateway
{

    // One authenticated call; errors come back as Razorpay's own description where it gives one.
    async Task<RazorpayReply> SendAsync(string keyId, string keySecret, HttpMethod method, string path, object? json = null)
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

    public async Task<RazorpayPage> PaymentsAsync(string keyId, string keySecret, DateTimeOffset from, DateTimeOffset to, int skip, int count = 100)
    {
        var r = await SendAsync(keyId, keySecret, HttpMethod.Get, $"payments?from={from.ToUnixTimeSeconds()}&to={to.ToUnixTimeSeconds()}&count={count}&skip={skip}");
        return r.Error is not null ? new([], r.Status, r.Error) : new(r.Body.GetProperty("items").EnumerateArray().Select(e => e.Clone()).ToList(), 200, null);
    }

    /// <summary>Creates an order for `paise`. The order fixes the amount, so a visitor can't change what they pay.</summary>
    public Task<RazorpayReply> CreateOrderAsync(string keyId, string keySecret, long paise, string receipt, Dictionary<string, string> notes) =>
        SendAsync(keyId, keySecret, HttpMethod.Post, "orders", new { amount = paise, currency = "INR", receipt, notes });

    public Task<RazorpayReply> PaymentAsync(string keyId, string keySecret, string paymentId) =>
        SendAsync(keyId, keySecret, HttpMethod.Get, $"payments/{Uri.EscapeDataString(paymentId)}");
}
