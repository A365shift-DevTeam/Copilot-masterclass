using Application.Common;
using Domain;
using Microsoft.EntityFrameworkCore;

namespace Application.Programs;

/* Reads more than one use case needs. */
static class Catalog
{
    public static Task<List<Offer>> LiveOffers(IAppDbContext db, DateTimeOffset now) =>
        db.Offers.AsNoTracking().Include(o => o.Items).Where(o => !o.IsPaused && o.StartsAt <= now && o.EndsAt > now).ToListAsync();

    // Pricing section tab names. Only changed ones are stored; null means the site's own wording.
    public static async Task<object[]> PricingTabs(IAppDbContext db)
    {
        var saved = await db.Settings.AsNoTracking().Where(x => x.Key.StartsWith("pricingTab.")).ToDictionaryAsync(x => x.Key, x => x.Value);
        return Cards.Categories.Select(id => (object)new
        {
            id,
            name = saved.GetValueOrDefault($"pricingTab.{id}.name"),
            blurb = saved.GetValueOrDefault($"pricingTab.{id}.blurb"),
        }).ToArray();
    }
}
