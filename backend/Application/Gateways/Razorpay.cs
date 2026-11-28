using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Application.Common;
using Domain;
using Microsoft.EntityFrameworkCore;

namespace Application.Gateways;

/* Razorpay webhooks: https://razorpay.com/docs/webhooks/
   Razorpay signs the raw request body with the webhook secret (HMAC-SHA256, hex)
   and retries until it gets a 2xx, so handling must be idempotent. */
public static class Razorpay
{
    public static bool SignatureValid(string body, string? signature, string secret)
    {
        if (string.IsNullOrEmpty(signature)) return false;
        var expected = HMACSHA256.HashData(Encoding.UTF8.GetBytes(secret), Encoding.UTF8.GetBytes(body));
        byte[] given;
        try { given = Convert.FromHexString(signature.Trim()); }
        catch (FormatException) { return false; }
        return CryptographicOperations.FixedTimeEquals(expected, given);
    }

    /// <summary>What a webhook event means for the ledger; null for events we don't record.</summary>
    public record Event(string PaymentId, string Status, decimal Amount, string Currency, string? Email, string? Phone,
        string? Name, string? Method, DateTimeOffset PaidAt, string? OrderId);

    public static Event? Parse(string body)
    {
        using var doc = JsonDocument.Parse(body);
        var root = doc.RootElement;
        var type = root.GetProperty("event").GetString();
        var payload = root.GetProperty("payload");

        // A refund event carries the refund; the payment it belongs to may or may not be alongside.
        if (type is "refund.processed" or "payment.refunded")
        {
            var refund = payload.TryGetProperty("refund", out var r) ? r.GetProperty("entity") : default;
            var payId = refund.ValueKind == JsonValueKind.Object ? Str(refund, "payment_id")
                : Str(payload.GetProperty("payment").GetProperty("entity"), "id");
            if (payId is null) return null;
            if (payload.TryGetProperty("payment", out var rp)) return FromPayment(rp.GetProperty("entity"), PaymentStatus.Refunded);
            return new Event(payId, PaymentStatus.Refunded, 0, "INR", null, null, null, null, DateTimeOffset.UtcNow, null);
        }

        var status = type switch
        {
            "payment.captured" => PaymentStatus.Paid,
            "payment.failed" => PaymentStatus.Failed,
            "payment.authorized" => PaymentStatus.Pending, // captured shortly after when auto-capture is on
            _ => null,
        };
        return status is null || !payload.TryGetProperty("payment", out var p) ? null : FromPayment(p.GetProperty("entity"), status);
    }

    /// <summary>A payment entity from the Payments API (used by Sync), with its own status.</summary>
    public static Event FromPaymentEntity(JsonElement e) => FromPayment(e, Str(e, "status") switch
    {
        "captured" => PaymentStatus.Paid,
        "failed" => PaymentStatus.Failed,
        "refunded" => PaymentStatus.Refunded,
        _ => PaymentStatus.Pending, // created, authorized
    });

    public enum Outcome { Created, Updated, Skipped }

    /// <summary>
    /// Writes one Razorpay payment to the ledger, idempotent on the payment ID, and logs it in the same save.
    /// `matchText` is searched for a program's Razorpay ID (the webhook body, or the payment's JSON).
    /// </summary>
    public static async Task<Outcome> RecordAsync(IAppDbContext db, Event ev, string matchText, string actor)
    {
        // A website checkout's payments share its order id: a failed try and the paid retry stay one row.
        var existing = await db.Payments.FirstOrDefaultAsync(p => p.GatewayPaymentId == ev.PaymentId
            || (ev.OrderId != null && p.GatewayOrderId == ev.OrderId));
        if (existing is not null)
        {
            // Once refunded, a late captured/failed event must not flip it back.
            if (existing.Status == ev.Status || existing.Status == PaymentStatus.Refunded) return Outcome.Skipped;
            // A failed try never overwrites a payment that went through.
            if (existing.Status == PaymentStatus.Paid && ev.Status != PaymentStatus.Refunded) return Outcome.Skipped;
            db.Log(actor, "payment.status", $"{ev.PaymentId} ({existing.CustomerName}) {existing.Status} to {ev.Status}");
            existing.Status = ev.Status;
            if (ev.Status == PaymentStatus.Paid) { existing.GatewayPaymentId = ev.PaymentId; existing.Reference = ev.PaymentId; existing.PaidAt = ev.PaidAt; }
            existing.Email ??= ev.Email;
            existing.Phone ??= ev.Phone;
            existing.UpdatedAt = DateTimeOffset.UtcNow;
            await db.SaveChangesAsync();
            return Outcome.Updated;
        }
        if (ev.Amount == 0) return Outcome.Skipped; // a refund for a payment never seen here, with nothing to record

        // Started on the website: the attempt knows the program and holds the form answers.
        var attempt = ev.OrderId is null ? null : await db.CheckoutAttempts.AsNoTracking().Include(a => a.Answers).FirstOrDefaultAsync(a => a.OrderId == ev.OrderId);
        Course? course;
        if (attempt is not null) course = await db.Courses.AsNoTracking().FirstOrDefaultAsync(c => c.Id == attempt.CourseId);
        else
        {
            var courses = await db.Courses.AsNoTracking().ToListAsync();
            var offers = await db.Offers.AsNoTracking().Include(o => o.Items)
                .Where(o => o.StartsAt <= ev.PaidAt && o.EndsAt > ev.PaidAt).ToListAsync();
            course = MatchCourse(matchText, ev.Amount, courses, offers, ev.PaidAt);
        }
        var name = attempt?.Name ?? ev.Name ?? ev.Email ?? ev.Phone ?? "Razorpay customer";
        db.Payments.Add(new Payment
        {
            CourseId = course?.Id,
            CustomerName = name,
            Email = attempt?.Email ?? ev.Email,
            Phone = attempt?.Phone ?? ev.Phone,
            Amount = ev.Amount,
            Currency = ev.Currency,
            Status = ev.Status,
            Method = attempt is null ? "Razorpay" : "Razorpay (website)",
            Reference = ev.PaymentId,
            GatewayPaymentId = ev.PaymentId,
            GatewayOrderId = ev.OrderId,
            Answers = attempt?.Answers.Select(a => new PaymentAnswer { FieldKey = a.FieldKey, Label = a.Label, Value = a.Value }).ToList() ?? [],
            PaidAt = ev.PaidAt,
            Notes = attempt is not null ? $"Registered on the website ({ev.Method ?? "payment"}, order {ev.OrderId})."
                : course is null ? $"Recorded from Razorpay. No program matched {ev.Amount:0.##} {ev.Currency}; choose one."
                : $"Recorded from Razorpay ({ev.Method ?? "payment"}{(ev.OrderId is null ? "" : $", order {ev.OrderId}")}).",
        });
        db.Log(actor, "payment.created", $"{name} paid {ev.Amount:0.##} {ev.Currency} ({ev.Status}) for {course?.Name ?? "an unassigned program"}");
        try { await db.SaveChangesAsync(); }
        catch (DbUpdateException)
        {
            // The verify call and the webhook arrived together and the other one recorded it; anything else is a real failure.
            db.ChangeTracker.Clear();
            if (!await db.Payments.AsNoTracking().AnyAsync(p => p.GatewayPaymentId == ev.PaymentId || (ev.OrderId != null && p.GatewayOrderId == ev.OrderId))) throw;
            return Outcome.Skipped;
        }
        return Outcome.Created;
    }

    static Event FromPayment(JsonElement e, string status) => new(
        PaymentId: Str(e, "id")!,
        Status: status,
        Amount: e.TryGetProperty("amount", out var a) ? a.GetInt64() / 100m : 0, // paise to rupees
        Currency: Str(e, "currency") ?? "INR",
        Email: Str(e, "email"),
        Phone: Str(e, "contact"),
        Name: NameFromNotes(e),
        Method: Str(e, "method"),
        PaidAt: e.TryGetProperty("created_at", out var t) && t.ValueKind == JsonValueKind.Number
            ? DateTimeOffset.FromUnixTimeSeconds(t.GetInt64()) : DateTimeOffset.UtcNow,
        OrderId: Str(e, "order_id"));

    // Payment pages put the form fields in `notes` (an empty one arrives as [], not {}).
    static string? NameFromNotes(JsonElement e)
    {
        if (!e.TryGetProperty("notes", out var notes) || notes.ValueKind != JsonValueKind.Object) return null;
        foreach (var n in notes.EnumerateObject())
            if (n.Name.Contains("name", StringComparison.OrdinalIgnoreCase) && n.Value.ValueKind == JsonValueKind.String
                && !string.IsNullOrWhiteSpace(n.Value.GetString()))
                return n.Value.GetString()!.Trim();
        return null;
    }

    static string? Str(JsonElement e, string name) =>
        e.ValueKind == JsonValueKind.Object && e.TryGetProperty(name, out var v) && v.ValueKind == JsonValueKind.String ? v.GetString() : null;

    /// <summary>
    /// Which program a payment is for. A program's Razorpay ID (payment page or link ID, set in the admin)
    /// anywhere in the payload wins; otherwise the one program at that price, counting its sale price from
    /// any offer live when the payment was made. Null when it can't tell.
    /// </summary>
    public static Course? MatchCourse(string body, decimal amount, IReadOnlyList<Course> courses,
        IReadOnlyCollection<Offer>? offers = null, DateTimeOffset? at = null)
    {
        var byId = courses.FirstOrDefault(c => !string.IsNullOrWhiteSpace(c.RazorpayId) && body.Contains(c.RazorpayId.Trim(), StringComparison.Ordinal));
        if (byId is not null) return byId;
        var when = at ?? DateTimeOffset.UtcNow;
        var atPrice = courses.Where(c => c.Price == amount || (offers ?? []).Any(o => OfferPricing.IsLive(o, when)
            && o.Items.Any(i => i.CourseId == c.Id) && OfferPricing.SalePrice(c.Price, o) == amount)).ToList();
        return atPrice.Count == 1 ? atPrice[0] : null;
    }
}
