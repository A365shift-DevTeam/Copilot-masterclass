using System.Text.Json;
using Application.Common;
using Application.Forms;
using Application.Gateways;
using Application.Programs;
using Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Application.Site;

/* Website checkout: the registration form, then Razorpay, or the card's payment link. */
public class CheckoutService(IAppDbContext db, ISettingsStore settings, IRazorpayGateway rzp, ILogger<CheckoutService> log)
{
    public async Task<object> StartAsync(string key, CheckoutRequest? body)
    {
        var c = await db.Courses.AsNoTracking().Include(x => x.FormFields).Include(x => x.Sessions).FirstOrDefaultAsync(x => x.Key == key);
        // Only programs shown on the website, taking payment here (no payment link) or asking the form before their link.
        var hasLink = !string.IsNullOrEmpty(c?.PaymentUrl);
        if (c is null || !c.IsVisible || c.Category is null || (hasLink && !c.FormFirst)) throw AppException.NotFound();
        var rz = await settings.RazorpayAsync();
        if (!hasLink && (rz.KeyId is null || rz.KeySecret is null)) throw new AppException(503, "Online payment isn't set up yet.");

        var form = Checkout.ReadAnswers(c.FormFields.OrderBy(f => f.SortOrder).Select(Checkout.ToDto), body?.Answers);
        if (form.Error is not null) throw AppException.Bad(form.Error);

        var now = DateTimeOffset.UtcNow;
        // Registrations are for the next date: saved as a "Session" answer, so they can be filtered by date.
        if (CourseSession.Upcoming(c.Sessions, now).FirstOrDefault() is { } next)
            form.Answers.Insert(0, new AnswerDto("session", "Session", next.Label()));
        var best = OfferPricing.Best(c, await Catalog.LiveOffers(db, now), now);
        var price = best?.Price ?? c.Price;
        if (hasLink)
        {
            // Saved as an unpaid registration; the link takes the money. "link-" keeps it apart from Razorpay order IDs.
            Save($"link-{Guid.NewGuid():N}", c, price, form);
            await db.SaveChangesAsync();
            return new { redirect = best?.Item.SalePaymentUrl ?? c.PaymentUrl };
        }
        if (price < 1) throw AppException.Bad("This program can't be paid for online. Please contact us.");

        var receipt = $"{c.Key}-{Guid.NewGuid():N}";
        var order = await rzp.CreateOrderAsync(rz.KeyId!, rz.KeySecret!, (long)(price * 100), receipt[..Math.Min(40, receipt.Length)],
            new() { ["program"] = c.Name, ["name"] = form.Name, ["email"] = form.Email ?? "", ["phone"] = form.Phone ?? "" });
        if (order.Error is not null)
        {
            log.LogWarning("Razorpay order for {Key} failed: {Error}", c.Key, order.Error);
            throw new AppException(502, "Payment couldn't be started. Please try again in a moment.");
        }
        var orderId = order.Body.GetProperty("id").GetString()!;
        Save(orderId, c, price, form);
        await db.SaveChangesAsync();
        return new
        {
            orderId, amount = (long)(price * 100), currency = "INR", keyId = rz.KeyId,
            description = c.CardTitle ?? c.Name,
            prefill = new { name = form.Name, email = form.Email, contact = form.Phone },
        };
    }

    void Save(string orderId, Course c, decimal price, Checkout.Result form) => db.CheckoutAttempts.Add(new CheckoutAttempt
    {
        OrderId = orderId, CourseId = c.Id, Amount = price, Name = form.Name, Email = form.Email, Phone = form.Phone,
        Answers = form.Answers.Select(a => new CheckoutAnswer { FieldKey = a.Key, Label = a.Label, Value = a.Value }).ToList(),
    });

    // Razorpay Checkout's success callback. The signature proves the payment belongs to the order;
    // the payment itself is then read from Razorpay, since only a captured payment counts as Paid.
    public async Task<object> VerifyAsync(VerifyRequest v)
    {
        var rz = await settings.RazorpayAsync();
        if (rz.KeyId is null || rz.KeySecret is null) throw new AppException(503, "Online payment isn't set up.");
        if (string.IsNullOrWhiteSpace(v.OrderId) || string.IsNullOrWhiteSpace(v.PaymentId)
            || !await db.CheckoutAttempts.AnyAsync(a => a.OrderId == v.OrderId)
            || !Checkout.SignatureValid(v.OrderId, v.PaymentId, v.Signature, rz.KeySecret))
            throw AppException.Bad("That payment couldn't be confirmed.");

        var pay = await rzp.PaymentAsync(rz.KeyId, rz.KeySecret, v.PaymentId);
        if (pay.Error is not null) throw new AppException(502, "Your payment went through, but we couldn't confirm it yet. We'll be in touch shortly.");
        var ev = Razorpay.FromPaymentEntity(pay.Body);
        if (ev.OrderId != v.OrderId) throw AppException.Bad("That payment couldn't be confirmed.");
        await Razorpay.RecordAsync(db, ev, "", "Website checkout");
        return new { status = ev.Status };
    }
}

public record CheckoutRequest(Dictionary<string, JsonElement>? Answers);
public record VerifyRequest(string? OrderId, string? PaymentId, string? Signature);
