using Application.Common;
using Application.Forms;
using Domain;
using Microsoft.EntityFrameworkCore;

namespace Application.Programs;

/* Programs, prices, links and dates; the Pricing section's cards and tabs; each program's registration form. */
public class CourseService(IAppDbContext db, ISettingsStore settings, ICurrentUser me)
{
    public async Task<List<Course>> ListAsync() =>
        await db.Courses.AsNoTracking().Include(c => c.Sessions.OrderBy(x => x.StartsAt)).OrderBy(c => c.SortOrder).ToListAsync();

    public async Task<Course> UpdateAsync(int id, CourseDto dto)
    {
        var c = await db.Courses.Include(x => x.Sessions).FirstOrDefaultAsync(x => x.Id == id) ?? throw AppException.NotFound();
        if (Validate(dto, c.Key) is { } error) throw AppException.Bad(error);

        var changes = new List<string>();
        void Track<T>(string what, T before, T after) { if (!EqualityComparer<T>.Default.Equals(before, after)) changes.Add(what); }
        Track("name", c.Name, dto.Name!.Trim());
        Track($"price to {dto.Price:0.##}", c.Price, dto.Price);
        Track("package price", c.ListPrice, dto.ListPrice);
        var link = Text.Clean(dto.PaymentUrl);
        Track(link is null ? "payment on the website" : "payment link", c.PaymentUrl, link);
        Track(dto.FormFirst ? "form before the link" : "no form before the link", c.FormFirst, dto.FormFirst);
        Track(dto.IsVisible ? "shown on site" : "hidden from site", c.IsVisible, dto.IsVisible);

        c.Name = dto.Name!.Trim();
        c.Price = dto.Price;
        c.ListPrice = dto.ListPrice;
        c.PaymentUrl = link;
        c.FormFirst = dto.FormFirst;
        c.RazorpayId = Text.Clean(dto.RazorpayId);
        if (dto.Sessions is not null)
        {
            var next = dto.Sessions.Select(x => new CourseSession
            {
                CourseId = c.Id, StartsAt = x.StartsAt.ToUniversalTime(), EndsAt = x.EndsAt?.ToUniversalTime(), // Npgsql only writes UTC offsets
                Language = Text.Clean(x.Language),
            }).OrderBy(x => x.StartsAt).ToList();
            var before = string.Join("|", c.Sessions.OrderBy(x => x.StartsAt).Select(x => $"{x.StartsAt:O}{x.EndsAt:O}{x.Language}"));
            if (before != string.Join("|", next.Select(x => $"{x.StartsAt:O}{x.EndsAt:O}{x.Language}"))) changes.Add($"dates ({next.Count})");
            db.Sessions.RemoveRange(c.Sessions);
            c.Sessions = next;
        }
        // Empty, not null, when cleared: null would let the seed refill the default text on the next start.
        c.Description = dto.Description?.Trim() ?? c.Description;
        c.Duration = dto.Duration?.Trim() ?? c.Duration;
        if (dto.Card is not null) { ApplyCard(c, dto.Card); await PlaceCard(c, dto.Card.Position); }
        c.IsVisible = dto.IsVisible;
        c.UpdatedAt = DateTimeOffset.UtcNow;
        db.Log(me.Name, "program.updated", $"{c.Name}: {(changes.Count > 0 ? string.Join(", ", changes) : "saved without changes")}");
        await db.SaveChangesAsync();
        return c;
    }

    /* New Pricing section cards. Only these 'ladder' programs can be created or deleted: the
       others are tied to their own copy on the site. */
    public async Task<Course> CreateAsync(CourseDto dto)
    {
        var error = Validate(dto, "");
        if (error is null && dto.Card?.Category is null) error = "Choose which Pricing tab the card goes in.";
        if (error is not null) throw AppException.Bad(error);

        var slug = new string(dto.Name!.Trim().ToLowerInvariant().Select(ch => char.IsAsciiLetterOrDigit(ch) ? ch : '-').ToArray()).Trim('-');
        var key = $"ladder-{(slug.Length > 40 ? slug[..40] : slug)}";
        for (var n = 2; await db.Courses.AnyAsync(c => c.Key == key); n++) key = $"ladder-{slug}-{n}";
        var c = new Course { Key = key, Kind = "ladder", Name = dto.Name!.Trim(), PaymentUrl = Text.Clean(dto.PaymentUrl),
            SortOrder = (await db.Courses.MaxAsync(x => (int?)x.SortOrder) ?? 0) + 1 };
        c.Price = dto.Price;
        c.FormFirst = dto.FormFirst;
        c.RazorpayId = Text.Clean(dto.RazorpayId);
        c.Description = dto.Description?.Trim() ?? "";
        c.Duration = dto.Duration?.Trim() ?? "";
        c.IsVisible = dto.IsVisible;
        ApplyCard(c, dto.Card!);
        await PlaceCard(c, dto.Card!.Position);
        c.FormFields.AddRange(Checkout.DefaultFields(0)); // the course id is filled in on save
        db.Courses.Add(c);
        db.Log(me.Name, "program.created", $"Added Pricing card \"{c.Name}\" at {c.Price:0.##}");
        await db.SaveChangesAsync();
        return c;
    }

    public async Task DeleteAsync(int id)
    {
        var c = await db.Courses.FindAsync(id) ?? throw AppException.NotFound();
        if (c.Kind != "ladder") throw AppException.Bad("Only Pricing section cards can be deleted. Hide this program instead.");
        if (await db.Payments.AnyAsync(p => p.CourseId == id))
            throw AppException.Bad("This card has payments in the ledger, so it can't be deleted. Hide it instead.");
        db.Courses.Remove(c);
        db.Log(me.Name, "program.deleted", $"Deleted Pricing card \"{c.Name}\"");
        await db.SaveChangesAsync();
    }

    /* ── Registration form per program (the form builder) ── */

    public async Task<object> GetFormAsync(int id)
    {
        var c = await db.Courses.AsNoTracking().Include(x => x.FormFields).FirstOrDefaultAsync(x => x.Id == id) ?? throw AppException.NotFound();
        return new { Fields = c.FormFields.OrderBy(f => f.SortOrder).Select(Checkout.ToDto) };
    }

    public async Task SaveFormAsync(int id, FormDto dto)
    {
        var c = await db.Courses.Include(x => x.FormFields).FirstOrDefaultAsync(x => x.Id == id) ?? throw AppException.NotFound();
        if (Checkout.ValidateForm(dto.Fields) is { } error) throw AppException.Bad(error);
        // Replace the rows; keys are kept, so answers already given stay with their field.
        db.FormFields.RemoveRange(c.FormFields);
        db.FormFields.AddRange(Checkout.ToRows(c.Id, dto.Fields!));
        c.UpdatedAt = DateTimeOffset.UtcNow;
        db.Log(me.Name, "program.form", $"{c.CardTitle ?? c.Name}: registration form saved ({dto.Fields!.Count} fields)");
        await db.SaveChangesAsync();
    }

    /* ── Pricing section tab names ── */

    public Task<object[]> PricingTabsAsync() => Catalog.PricingTabs(db);

    public async Task RenameTabAsync(string id, PricingTabDto dto)
    {
        if (!Cards.Categories.Contains(id)) throw AppException.NotFound();
        if (string.IsNullOrWhiteSpace(dto.Name) || dto.Name.Length > 40) throw AppException.Bad("Give the tab a name of up to 40 characters.");
        if (dto.Blurb is { Length: > 160 }) throw AppException.Bad("Keep the line under the tabs to 160 characters.");
        await settings.SetAsync($"pricingTab.{id}.name", dto.Name.Trim());
        await settings.SetAsync($"pricingTab.{id}.blurb", dto.Blurb?.Trim());
        db.Log(me.Name, "settings.pricing", $"Renamed a Pricing tab to \"{dto.Name.Trim()}\"");
        await db.SaveChangesAsync();
    }

    static void ApplyCard(Course c, CardDto card)
    {
        c.Category = Text.Clean(card.Category);
        c.CardTitle = Text.Clean(card.CardTitle);
        c.Cta = Text.Clean(card.Cta);
        c.Icon = Text.Clean(card.Icon);
        c.IsFeatured = card.IsFeatured;
    }

    // Places the card in its tab and renumbers that tab 1..n from its lowest number, so positions stay whole.
    async Task PlaceCard(Course c, double? position)
    {
        if (c.Category is null) return;
        var others = await db.Courses.Where(x => x.Category == c.Category && x.Id != c.Id).ToListAsync();
        var at = position ?? (c.Id == 0 ? double.MaxValue : c.SortOrder);
        var start = others.Select(x => x.SortOrder).DefaultIfEmpty(c.SortOrder).Min();
        var ordered = others.Select(x => (Course: x, Key: (double)x.SortOrder)).Append((Course: c, Key: at))
            .OrderBy(x => x.Key).ThenBy(x => x.Course == c ? 1 : 0).Select(x => x.Course).ToList();
        for (var i = 0; i < ordered.Count; i++) ordered[i].SortOrder = start + i;
    }

    static string? Validate(CourseDto d, string key)
    {
        if (string.IsNullOrWhiteSpace(d.Name) || d.Name.Length > 120) return "Give the program a name of up to 120 characters.";
        if (d.Price < 0 || d.Price > 10_000_000) return "Price must be between 0 and 1,00,00,000.";
        if (d.Card is { Category: not null } card && !Cards.Categories.Contains(card.Category)) return "Choose which Pricing tab the card goes in.";
        if (d.Card is { Icon: not null } ci && !Cards.IconValid(ci.Icon)) return "Choose one of the listed icons.";
        if (d.Card is { Cta.Length: > 40 } or { CardTitle.Length: > 120 }) return "Keep the button label to 40 characters and the card title to 120.";
        if (d.Description is { Length: > 300 } || d.Duration is { Length: > 60 }) return "Keep the card text to 300 characters and the access line to 60.";
        if (d.ListPrice is not null && d.ListPrice < d.Price) return "The package price must be at least the selling price.";
        // Optional: empty means the website takes the registration and payment itself.
        if (!string.IsNullOrWhiteSpace(d.PaymentUrl) && !Https(d.PaymentUrl))
            return "The payment link must be a full https:// address, or left empty to take payment on the website.";
        if (d.Sessions is { Count: > 50 }) return "A program can have up to 50 dates.";
        if (d.Sessions?.FirstOrDefault(x => x.EndsAt is not null && x.EndsAt <= x.StartsAt) is { } bad)
            return $"The date starting {bad.StartsAt.ToOffset(Ist.Offset):d MMM, h:mm tt} ends before it starts.";
        if (d.Sessions?.Any(x => x.Language is { Length: > 40 }) == true) return "Keep the language to 40 characters.";
        // The site's hero always sells the webinar, so it can't be hidden.
        if (key == "webinar" && !d.IsVisible) return "The main webinar is always shown on the site.";
        return null;
    }

    internal static bool Https(string url) => Uri.TryCreate(url.Trim(), UriKind.Absolute, out var u) && u.Scheme == Uri.UriSchemeHttps;
}

public record CourseDto(string? Name, decimal Price, decimal? ListPrice, string? PaymentUrl, string? RazorpayId, bool IsVisible, string? Description = null, string? Duration = null, CardDto? Card = null, List<SessionDto>? Sessions = null, bool FormFirst = false);
public record SessionDto(DateTimeOffset StartsAt, DateTimeOffset? EndsAt, string? Language);
// How a program appears as a Pricing section card. Null Category takes it off the Pricing section.
// Position: where in its tab, as a sort value (e.g. another card's SortOrder + 0.5 for "after it"); null keeps it.
public record CardDto(string? Category, string? CardTitle, string? Cta, string? Icon, bool IsFeatured, double? Position);
public record FormDto(List<FieldDto>? Fields);
public record PricingTabDto(string? Name, string? Blurb);
