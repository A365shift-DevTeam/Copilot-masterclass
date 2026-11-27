using Api;

namespace Api.Tests;

public class OfferTests
{
    static readonly DateTimeOffset Now = new(2026, 11, 28, 6, 0, 0, TimeSpan.Zero);

    static Course C(int id, decimal price) =>
        new() { Id = id, Key = $"k{id}", Kind = "course", Name = $"P{id}", Price = price, PaymentUrl = "https://x" };

    static Offer O(string type, decimal value, int[] courses, int startH = -1, int endH = 5, bool paused = false, string? link = null) => new()
    {
        Name = $"{value}{type}", Badge = "Sale", DiscountType = type, DiscountValue = value,
        StartsAt = Now.AddHours(startH), EndsAt = Now.AddHours(endH), IsPaused = paused,
        Items = courses.Select(c => new OfferItem { CourseId = c, SalePaymentUrl = link }).ToList(),
    };

    [Fact]
    public void Percent_rounds_to_whole_rupees_and_amount_never_goes_negative()
    {
        Assert.Equal(349m, OfferPricing.SalePrice(499, O(OfferPricing.Percent, 30, [1])));   // 349.3
        Assert.Equal(400m, OfferPricing.SalePrice(799, O(OfferPricing.Percent, 50, [1])));   // 399.5 rounds up
        Assert.Equal(299m, OfferPricing.SalePrice(499, O(OfferPricing.Amount, 200, [1])));
        Assert.Equal(0m, OfferPricing.SalePrice(499, O(OfferPricing.Amount, 900, [1])));
    }

    [Fact]
    public void Only_live_unpaused_offers_for_that_program_apply()
    {
        var c = C(1, 499);
        Assert.Null(OfferPricing.Best(c, [O(OfferPricing.Percent, 30, [2])], Now));               // other program
        Assert.Null(OfferPricing.Best(c, [O(OfferPricing.Percent, 30, [1], startH: 1)], Now));    // not started
        Assert.Null(OfferPricing.Best(c, [O(OfferPricing.Percent, 30, [1], endH: 0)], Now));      // ends exactly now
        Assert.Null(OfferPricing.Best(c, [O(OfferPricing.Percent, 30, [1], paused: true)], Now));
        Assert.Equal(349m, OfferPricing.Best(c, [O(OfferPricing.Percent, 30, [1])], Now)!.Value.Price);
    }

    [Fact]
    public void Overlapping_offers_give_the_lowest_price()
    {
        var best = OfferPricing.Best(C(1, 1000), [O(OfferPricing.Percent, 10, [1]), O(OfferPricing.Amount, 300, [1], link: "https://sale")], Now)!.Value;
        Assert.Equal(700m, best.Price);
        Assert.Equal("https://sale", best.Item.SalePaymentUrl);
    }

    [Fact]
    public void Webhook_payment_at_the_sale_price_matches_its_program()
    {
        var courses = new[] { C(1, 499), C(2, 799) };
        var offers = new[] { O(OfferPricing.Percent, 30, [1]) };
        Assert.Equal(1, Razorpay.MatchCourse("{}", 349, courses, offers, Now)!.Id);
        Assert.Null(Razorpay.MatchCourse("{}", 349, courses, offers, Now.AddDays(1))); // the sale was over by then
    }
}
