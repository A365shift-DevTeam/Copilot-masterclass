using Application.Common;
using Domain;
using Microsoft.EntityFrameworkCore;

namespace Application.Programs;

/* Special offers: time-boxed discounts. */
public class OfferService(IAppDbContext db, ICurrentUser me)
{
    public async Task<object> ListAsync()
    {
        var now = DateTimeOffset.UtcNow;
        var offers = await db.Offers.AsNoTracking().Include(o => o.Items).OrderByDescending(o => o.StartsAt).ToListAsync();
        return offers.Select(o => new
        {
            o.Id, o.Name, o.Badge, o.DiscountType, o.DiscountValue, o.StartsAt, o.EndsAt, o.IsPaused, o.UpdatedAt,
            Status = now >= o.EndsAt ? "ended" : o.IsPaused ? "paused" : OfferPricing.IsLive(o, now) ? "live" : "scheduled",
            Items = o.Items.Select(i => new { i.CourseId, i.SalePaymentUrl }),
        });
    }

    public async Task<int> CreateAsync(OfferDto dto)
    {
        if (await Validate(dto) is { } error) throw AppException.Bad(error);
        var o = new Offer { Name = "", Badge = "", DiscountType = "" };
        Apply(o, dto);
        db.Offers.Add(o);
        db.Log(me.Name, "offer.created", $"Created offer \"{o.Name}\": {Describe(o)}, {o.StartsAt.ToOffset(Ist.Offset):d MMM HH:mm} to {o.EndsAt.ToOffset(Ist.Offset):d MMM HH:mm} IST");
        await db.SaveChangesAsync();
        return o.Id;
    }

    public async Task UpdateAsync(int id, OfferDto dto)
    {
        var o = await db.Offers.Include(x => x.Items).FirstOrDefaultAsync(x => x.Id == id) ?? throw AppException.NotFound();
        if (await Validate(dto) is { } error) throw AppException.Bad(error);
        var wasPaused = o.IsPaused;
        Apply(o, dto);
        o.UpdatedAt = DateTimeOffset.UtcNow;
        db.Log(me.Name, "offer.updated", wasPaused == o.IsPaused
            ? $"Edited offer \"{o.Name}\": {Describe(o)}"
            : $"{(o.IsPaused ? "Paused" : "Resumed")} offer \"{o.Name}\"");
        await db.SaveChangesAsync();
    }

    public async Task DeleteAsync(int id)
    {
        var o = await db.Offers.FindAsync(id) ?? throw AppException.NotFound();
        db.Offers.Remove(o);
        db.Log(me.Name, "offer.deleted", $"Deleted offer \"{o.Name}\"");
        await db.SaveChangesAsync();
    }

    static string Describe(Offer o) => o.DiscountType == OfferPricing.Percent ? $"{o.DiscountValue:0.##}% off" : $"{o.DiscountValue:0.##} off";

    static void Apply(Offer o, OfferDto dto)
    {
        o.Name = dto.Name!.Trim();
        o.Badge = string.IsNullOrWhiteSpace(dto.Badge) ? o.Name : dto.Badge.Trim();
        o.DiscountType = dto.DiscountType!;
        o.DiscountValue = dto.DiscountValue;
        o.StartsAt = dto.StartsAt!.Value.ToUniversalTime();
        o.EndsAt = dto.EndsAt!.Value.ToUniversalTime();
        o.IsPaused = dto.IsPaused;
        o.Items.Clear();
        o.Items.AddRange(dto.Items!.DistinctBy(i => i.CourseId).Select(i => new OfferItem
        {
            CourseId = i.CourseId,
            SalePaymentUrl = Text.Clean(i.SalePaymentUrl),
        }));
    }

    async Task<string?> Validate(OfferDto d)
    {
        if (string.IsNullOrWhiteSpace(d.Name) || d.Name.Length > 80) return "Give the offer a name of up to 80 characters.";
        if (d.Badge is { Length: > 60 }) return "Keep the site badge to 60 characters.";
        if (d.DiscountType is not (OfferPricing.Percent or OfferPricing.Amount)) return "Choose a percentage or a fixed amount off.";
        if (d.DiscountValue <= 0) return "The discount must be more than zero.";
        if (d.DiscountType == OfferPricing.Percent && d.DiscountValue >= 100) return "A percentage discount must be below 100%.";
        if (d.StartsAt is null || d.EndsAt is null) return "Set when the offer starts and ends.";
        if (d.EndsAt <= d.StartsAt) return "The offer must end after it starts.";
        if (d.EndsAt <= DateTimeOffset.UtcNow) return "That end time has already passed.";
        if (d.Items is not { Count: > 0 }) return "Choose at least one program for the offer.";
        if (d.Items.Any(i => !string.IsNullOrWhiteSpace(i.SalePaymentUrl) && !CourseService.Https(i.SalePaymentUrl)))
            return "Each sale payment link must be a full https:// address.";
        var ids = d.Items.Select(i => i.CourseId).Distinct().ToList();
        if (await db.Courses.CountAsync(c => ids.Contains(c.Id)) != ids.Count) return "One of the chosen programs no longer exists.";
        if (d.DiscountType == OfferPricing.Amount && await db.Courses.AnyAsync(c => ids.Contains(c.Id) && c.Price <= d.DiscountValue))
            return "That amount is as much as or more than a chosen program's price.";
        return null;
    }
}

public record OfferItemDto(int CourseId, string? SalePaymentUrl);
public record OfferDto(string? Name, string? Badge, string? DiscountType, decimal DiscountValue, DateTimeOffset? StartsAt, DateTimeOffset? EndsAt, bool IsPaused, List<OfferItemDto>? Items);
