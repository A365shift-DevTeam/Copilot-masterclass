using System.Security.Cryptography;
using System.Text;
using Application.Gateways;
using Domain;

namespace Api.Tests;

public class RazorpayTests
{
    const string Secret = "test-secret";

    static string Sign(string body) =>
        Convert.ToHexString(HMACSHA256.HashData(Encoding.UTF8.GetBytes(Secret), Encoding.UTF8.GetBytes(body))).ToLowerInvariant();

    static string Captured(long paise, string notes = "{\"full_name\":\"Priya K\"}", string extra = "") =>
        "{\"event\":\"payment.captured\",\"payload\":{\"payment\":{\"entity\":{" +
        $"\"id\":\"pay_ABC123\",\"amount\":{paise},\"currency\":\"INR\",\"status\":\"captured\",\"method\":\"upi\"," +
        "\"order_id\":\"order_9\",\"email\":\"priya@example.com\",\"contact\":\"+919840012345\"," +
        $"\"notes\":{notes},\"created_at\":1764300000{extra}" + "}}}}";

    [Fact]
    public void Signature_accepts_the_real_one_and_rejects_others()
    {
        var body = Captured(49900);
        Assert.True(Razorpay.SignatureValid(body, Sign(body), Secret));
        Assert.False(Razorpay.SignatureValid(body + " ", Sign(body), Secret));
        Assert.False(Razorpay.SignatureValid(body, Sign(body), "other-secret"));
        Assert.False(Razorpay.SignatureValid(body, "not-hex", Secret));
        Assert.False(Razorpay.SignatureValid(body, null, Secret));
    }

    [Fact]
    public void Captured_payment_becomes_a_paid_entry_in_rupees()
    {
        var ev = Razorpay.Parse(Captured(49900))!;
        Assert.Equal("pay_ABC123", ev.PaymentId);
        Assert.Equal(PaymentStatus.Paid, ev.Status);
        Assert.Equal(499m, ev.Amount);
        Assert.Equal("Priya K", ev.Name);
        Assert.Equal("+919840012345", ev.Phone);
        Assert.Equal(DateTimeOffset.FromUnixTimeSeconds(1764300000), ev.PaidAt);
    }

    [Fact]
    public void Empty_notes_arrive_as_an_array_and_are_ignored()
    {
        Assert.Null(Razorpay.Parse(Captured(49900, notes: "[]"))!.Name);
    }

    [Fact]
    public void Refund_points_at_the_original_payment()
    {
        var ev = Razorpay.Parse("""{"event":"refund.processed","payload":{"refund":{"entity":{"id":"rfnd_1","payment_id":"pay_ABC123","amount":49900}}}}""")!;
        Assert.Equal("pay_ABC123", ev.PaymentId);
        Assert.Equal(PaymentStatus.Refunded, ev.Status);
        Assert.Equal(0m, ev.Amount); // no payment entity: only an existing entry gets updated
    }

    [Fact]
    public void Unrecorded_events_return_null()
    {
        Assert.Null(Razorpay.Parse("""{"event":"order.paid","payload":{}}"""));
    }

    static Course C(int id, decimal price, string? rzp = null) =>
        new() { Id = id, Key = $"k{id}", Kind = "course", Name = $"P{id}", Price = price, PaymentUrl = "https://rzp.io/x", RazorpayId = rzp };

    [Fact]
    public void Program_match_prefers_razorpay_id_then_a_unique_price()
    {
        var courses = new[] { C(1, 499), C(2, 4999, "pl_SKILL"), C(3, 4999, "pl_WORKSHOP") };
        var body = Captured(499900, extra: ",\"description\":\"pl_WORKSHOP\"");
        Assert.Equal(3, Razorpay.MatchCourse(body, 4999, courses)!.Id);
        Assert.Equal(1, Razorpay.MatchCourse(Captured(49900), 499, courses)!.Id);
        Assert.Null(Razorpay.MatchCourse(Captured(499900), 4999, courses)); // two programs at that price, no ID
    }
}
