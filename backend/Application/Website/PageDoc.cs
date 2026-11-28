using System.Text.Json;
using System.Text.Json.Nodes;
using Application.Common;

namespace Application.Website;

/// <summary>One section of the page. Content is that section's own fields (filled in from stage 2).</summary>
public class SectionDoc
{
    public required string Id { get; init; }
    public required string Type { get; init; }
    public bool Visible { get; set; }
    public JsonObject Content { get; set; } = [];
}

/// <summary>
/// The page: sections in display order. SeededTypes remembers every section type the seed has ever
/// added, so a type added in a later release reaches the page once, and a section the admin removed
/// is never put back.
/// </summary>
public class PageDoc
{
    public List<SectionDoc> Sections { get; set; } = [];
    public List<string> SeededTypes { get; set; } = [];
}

/// <summary>A kind of section the website can draw. Top and Bottom are pinned (navbar, footer); AlwaysOn can't be hidden.</summary>
public record SectionType(string Type, string Label, string? Anchor, bool DefaultVisible, bool AlwaysOn = false, bool Top = false, bool Bottom = false);

/* The page's rules, as pure functions over PageDoc: tested in Api.Tests without a database. */
public static class Page
{
    public const string Home = "home";

    // In today's page order; DefaultVisible is what the site shows today. The website maps each Type to its component.
    // Not here yet, until their content comes from the admin: the laptop "ticket" scroll scene and the old Register block.
    public static readonly SectionType[] Types =
    [
        new("navbar", "Navigation bar", null, true, AlwaysOn: true, Top: true),
        new("hero", "Hero", "#top", true, AlwaysOn: true),
        new("overview", "Overview", "#overview", true),
        new("copilot-studio", "What you'll learn", "#learn", true),
        new("seat-scroll", "Reserve-your-seat scroll scene", null, true),
        new("agenda", "Agenda", "#agenda", false),
        new("audience", "Who it's for", null, false),
        new("use-cases", "Use cases", null, false),
        new("live-demo", "Live demo", null, false),
        new("benefits", "Benefits", "#benefits", true),
        new("speaker", "Speaker", "#speaker", true),
        new("coaching", "1:1 coaching programmes", "#pricing", false),
        new("programs", "Other programs", "#programs", false),
        new("price-ladder", "Pricing", "#pricing", true),
        new("ecosystem", "Ecosystem", null, false),
        new("faq", "FAQ", "#faq", false),
        new("final-cta", "Final call to action", null, false),
        new("footer", "Footer", null, true, AlwaysOn: true, Bottom: true),
    ];

    public static SectionType? TypeOf(string type) => Types.FirstOrDefault(t => t.Type == type);

    static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);
    public static string Write(PageDoc doc) => JsonSerializer.Serialize(doc, Json);
    public static PageDoc Read(string json) => JsonSerializer.Deserialize<PageDoc>(json, Json) ?? new();
    public static PageDoc Clone(PageDoc doc) => Read(Write(doc));

    /// <summary>Adds every type the page has never had, at its place in Types (pinned ones stay first/last).</summary>
    public static PageDoc Seed(PageDoc? doc)
    {
        doc = doc is null ? new() : Clone(doc);
        foreach (var t in Types.Where(t => !doc.SeededTypes.Contains(t.Type)))
        {
            var section = new SectionDoc { Id = t.Type, Type = t.Type, Visible = t.DefaultVisible };
            // After the last section whose type comes earlier in Types; else at the start (before everything but the navbar).
            var order = Types.Select(x => x.Type).ToList();
            var after = doc.Sections.FindLastIndex(s => order.IndexOf(s.Type) is var i && i >= 0 && i < order.IndexOf(t.Type));
            var at = t.Bottom ? doc.Sections.Count : after >= 0 ? after + 1 : doc.Sections.Count(s => TypeOf(s.Type)?.Top == true);
            doc.Sections.Insert(at, section);
            doc.SeededTypes.Add(t.Type);
        }
        return doc;
    }

    public record LayoutItem(string Id, bool Visible);

    /// <summary>The draft with its sections reordered and shown/hidden as given. Every section must be listed once.</summary>
    public static PageDoc SetLayout(PageDoc doc, IReadOnlyList<LayoutItem> layout)
    {
        var byId = doc.Sections.ToDictionary(s => s.Id);
        if (layout.Count != byId.Count || layout.Select(l => l.Id).Distinct().Count() != layout.Count || layout.Any(l => !byId.ContainsKey(l.Id)))
            throw AppException.Bad("The page changed since you loaded it. Reload and try again.");
        var next = Clone(doc);
        var nextById = next.Sections.ToDictionary(s => s.Id);
        next.Sections = layout.Select(l =>
        {
            var s = nextById[l.Id];
            var t = TypeOf(s.Type);
            if (t?.AlwaysOn == true && !l.Visible) throw AppException.Bad($"The {t.Label} is always shown.");
            s.Visible = l.Visible;
            return s;
        }).ToList();
        if (next.Sections.Where((s, i) => TypeOf(s.Type)?.Top == true && i != 0).Any()
            || next.Sections.Where((s, i) => TypeOf(s.Type)?.Bottom == true && i != next.Sections.Count - 1).Any())
            throw AppException.Bad("The navigation bar stays first and the footer last.");
        return next;
    }

    /// <summary>What the website draws: the visible sections of a known type, in order.</summary>
    public static IEnumerable<object> Visible(PageDoc doc) =>
        doc.Sections.Where(s => s.Visible && TypeOf(s.Type) is not null).Select(s => new { s.Id, s.Type, TypeOf(s.Type)!.Anchor, s.Content });
}
