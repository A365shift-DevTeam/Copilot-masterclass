using System.Text.Json;
using Application.Common;
using Microsoft.Extensions.Logging;

namespace Application.Gateways;

/* Razorpay webhook: records payments as they happen.
   Razorpay Dashboard > Settings > Webhooks: /api/webhooks/razorpay, the webhook secret saved
   in Settings, and the events payment.captured, payment.failed, refund.processed. */
public class RazorpayWebhookService(IAppDbContext db, ISettingsStore settings, ILogger<RazorpayWebhookService> log)
{
    public async Task HandleAsync(string body, string? signature)
    {
        var secret = (await settings.RazorpayAsync()).WebhookSecret;
        if (secret is null) throw new AppException(503, "No Razorpay webhook secret is set.");

        // Rejected calls go to the server log, not the activity table: anyone can send them.
        if (!Razorpay.SignatureValid(body, signature, secret))
        {
            log.LogWarning("Razorpay webhook rejected: bad signature");
            throw new AppException(401);
        }

        Razorpay.Event? ev;
        try { ev = Razorpay.Parse(body); }
        catch (Exception e) when (e is JsonException or KeyNotFoundException or InvalidOperationException)
        {
            log.LogWarning(e, "Razorpay webhook body could not be read");
            throw new AppException(400);
        }
        if (ev is not null) await Razorpay.RecordAsync(db, ev, body, "Razorpay");
    }
}
