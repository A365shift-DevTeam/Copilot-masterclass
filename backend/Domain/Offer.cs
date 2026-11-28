namespace Domain;

/* A time-boxed discount, e.g. a Black Friday sale. While it runs, the site shows
   the sale price struck against the normal one, for the programs it covers. */
public class Offer
{
    public int Id { get; set; }
    public required string Name { get; set; } // for the admin, e.g. "Black Friday 2026"
    public required string Badge { get; set; } // shown on the site, e.g. "Black Friday: 30% off"
    public required string DiscountType { get; set; } // "percent" or "amount"
    public decimal DiscountValue { get; set; }
    public DateTimeOffset StartsAt { get; set; }
    public DateTimeOffset EndsAt { get; set; }
    public bool IsPaused { get; set; }
    public List<OfferItem> Items { get; set; } = [];
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public class OfferItem
{
    public int OfferId { get; set; }
    public int CourseId { get; set; }
    // The gateways charge what their own page says, so a sale usually needs its own link.
    public string? SalePaymentUrl { get; set; }
}

public static class OfferPricing
{
    public const string Percent = "percent", Amount = "amount";

    public static bool IsLive(Offer o, DateTimeOffset now) => !o.IsPaused && o.StartsAt <= now && now < o.EndsAt;

    // Whole rupees, never below zero.
    public static decimal SalePrice(decimal price, Offer o) => Math.Max(0, o.DiscountType == Percent
        ? Math.Round(price * (1 - o.DiscountValue / 100m), 0, MidpointRounding.AwayFromZero)
        : price - o.DiscountValue);

    /// <summary>The live offer giving this program its lowest price at `now` (ties: the one ending first).</summary>
    public static (Offer Offer, OfferItem Item, decimal Price)? Best(Course c, IEnumerable<Offer> offers, DateTimeOffset now) =>
        offers.Where(o => IsLive(o, now))
            .SelectMany(o => o.Items.Where(i => i.CourseId == c.Id).Select(i => (Offer: o, Item: i, Price: SalePrice(c.Price, o))))
            .OrderBy(x => x.Price).ThenBy(x => x.Offer.EndsAt)
            .Select(x => ((Offer, OfferItem, decimal)?)x)
            .FirstOrDefault();
}
