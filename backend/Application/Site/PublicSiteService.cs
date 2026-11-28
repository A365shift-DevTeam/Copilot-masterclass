using Application.Common;
using Application.Forms;
using Application.Programs;
using Domain;
using Microsoft.EntityFrameworkCore;

namespace Application.Site;

/* What the landing site reads on every load: programs, prices, dates, offers and forms. */
public class PublicSiteService(IAppDbContext db, ISettingsStore settings)
{
    public async Task<object> GetAsync()
    {
        var now = DateTimeOffset.UtcNow;
        var courses = await db.Courses.AsNoTracking().Include(c => c.Sessions).OrderBy(c => c.SortOrder).ToListAsync();
        var offers = await Catalog.LiveOffers(db, now);
        var rz = await settings.RazorpayAsync();
        var canCheckout = rz.KeyId is not null && rz.KeySecret is not null;
        var forms = (await db.FormFields.AsNoTracking().OrderBy(f => f.SortOrder).ToListAsync()).ToLookup(f => f.CourseId);
        return new
        {
            courses = courses.Select(c =>
            {
                var best = OfferPricing.Best(c, offers, now);
                return new
                {
                    c.Key, c.Name, c.ListPrice, c.IsVisible, c.Description, c.Duration,
                    // The next date (what the site shows today) and every date still to come.
                    StartsAt = CourseSession.Upcoming(c.Sessions, now).FirstOrDefault()?.StartsAt,
                    EndsAt = CourseSession.Upcoming(c.Sessions, now).FirstOrDefault()?.EndsAt,
                    Language = CourseSession.Upcoming(c.Sessions, now).FirstOrDefault()?.Language,
                    Upcoming = CourseSession.Upcoming(c.Sessions, now).Take(8).Select(x => new { x.StartsAt, x.EndsAt, x.Language }),
                    c.Category, c.CardTitle, c.Cta, c.Icon, c.IsFeatured,
                    Price = best?.Price ?? c.Price,
                    OriginalPrice = best is null ? (decimal?)null : c.Price,
                    PaymentUrl = best?.Item.SalePaymentUrl ?? c.PaymentUrl,
                    Offer = best is null ? null : new { best.Value.Offer.Badge, best.Value.Offer.EndsAt },
                    // Register opens this form, then pays on the site (no payment link) or goes on to the link (FormFirst).
                    Checkout = c.IsVisible && c.Category != null && (string.IsNullOrEmpty(c.PaymentUrl) ? canCheckout : c.FormFirst),
                    Form = string.IsNullOrEmpty(c.PaymentUrl) || c.FormFirst ? forms[c.Id].Select(Checkout.ToDto) : null,
                    // The program's own link, not PaymentUrl above: a sale link doesn't move an on-site card off Razorpay.
                    PaysByLink = !string.IsNullOrEmpty(c.PaymentUrl),
                };
            }),
            whatsappUrl = await settings.GetAsync(SiteSettings.WhatsappUrl),
            pricingTabs = await Catalog.PricingTabs(db),
        };
    }
}
