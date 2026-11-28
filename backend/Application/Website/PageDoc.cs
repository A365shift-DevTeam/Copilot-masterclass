using System.Text.Json;
using System.Text.Json.Nodes;
using Application.Common;

namespace Application.Website;

/// <summary>One section of the page, with its content. Rev goes up on every content save, so two admins only clash on the same section.</summary>
public class SectionDoc
{
    public required string Id { get; init; }
    public required string Type { get; init; }
    public bool Visible { get; set; }
    public int Rev { get; set; }
    public JsonObject Content { get; set; } = [];
}

/// <summary>
/// The page: sections in display order, plus Shared content (used by several sections, never drawn on its own).
/// SeededTypes remembers every type the seed has ever added, so a type added in a later release reaches the
/// page once, and a section the admin deleted is never put back.
/// </summary>
public class PageDoc
{
    public List<SectionDoc> Sections { get; set; } = [];
    public List<SectionDoc> Shared { get; set; } = [];
    public List<string> SeededTypes { get; set; } = [];
}

/// <summary>A field of a section's content (see sections.json for the kinds).</summary>
public record FieldSpec(string Key, string Label, string Kind, int? Max = null, int? Min = null, int? Count = null,
    bool Required = false, string? Hint = null, string? ItemLabel = null, List<string>? Options = null, List<FieldSpec>? Fields = null);

/// <summary>A kind of section the website can draw. Top and Bottom are pinned (navbar, footer); AlwaysOn can't be hidden.</summary>
public record SectionType(string Type, string Label, string? Anchor, bool DefaultVisible, bool AlwaysOn = false, bool Top = false, bool Bottom = false,
    bool Shared = false, bool Repeatable = false, List<FieldSpec>? Fields = null)
{
    public List<FieldSpec> FieldList => Fields ?? [];
}

/* The page's rules, as pure functions over PageDoc: tested in Api.Tests without a database. */
public static class Page
{
    public const string Home = "home";

    static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    static T Resource<T>(string name)
    {
        using var s = typeof(Page).Assembly.GetManifestResourceStream(name) ?? throw new InvalidOperationException($"{name} is not embedded");
        return JsonSerializer.Deserialize<T>(s, Json)!;
    }

    record TypeFile(List<SectionType> Types);

    /// <summary>Every type, in default page order (sections.json). The website maps each Type to its component.</summary>
    public static readonly SectionType[] Types = Resource<TypeFile>("sections.json").Types.ToArray();

    /// <summary>The content each type starts with (defaults.json): today's website text.</summary>
    public static readonly IReadOnlyDictionary<string, JsonObject> Defaults = Resource<Dictionary<string, JsonObject>>("defaults.json");

    public static SectionType? TypeOf(string type) => Types.FirstOrDefault(t => t.Type == type);

    public static string Write(PageDoc doc) => JsonSerializer.Serialize(doc, Json);
    public static PageDoc Read(string json) => JsonSerializer.Deserialize<PageDoc>(json, Json) ?? new();
    public static PageDoc Clone(PageDoc doc) => Read(Write(doc));

    /// <summary>
    /// Adds every type the page has never had, at its place in Types (pinned ones stay first/last), and gives
    /// every section the default of any field its content is missing (a field added in a later release).
    /// </summary>
    public static PageDoc Seed(PageDoc? doc)
    {
        doc = doc is null ? new() : Clone(doc);
        var order = Types.Select(x => x.Type).ToList();
        foreach (var t in Types.Where(t => !t.Shared && !doc.SeededTypes.Contains(t.Type)))
        {
            var section = new SectionDoc { Id = t.Type, Type = t.Type, Visible = t.DefaultVisible };
            // After the last section whose type comes earlier in Types; else at the start (after the navbar).
            var after = doc.Sections.FindLastIndex(s => order.IndexOf(s.Type) is var i && i >= 0 && i < order.IndexOf(t.Type));
            var at = t.Bottom ? doc.Sections.Count : after >= 0 ? after + 1 : doc.Sections.Count(s => TypeOf(s.Type)?.Top == true);
            doc.Sections.Insert(at, section);
            doc.SeededTypes.Add(t.Type);
        }
        // Shared blocks can't be deleted, so a missing one was lost (e.g. saved by an older API that didn't
        // know them): always put it back, with its starting content.
        foreach (var t in Types.Where(t => t.Shared && doc.Shared.All(s => s.Type != t.Type)))
        {
            doc.Shared.Add(new SectionDoc { Id = t.Type, Type = t.Type });
            if (!doc.SeededTypes.Contains(t.Type)) doc.SeededTypes.Add(t.Type);
        }
        foreach (var s in doc.Sections.Concat(doc.Shared))
            if (TypeOf(s.Type) is { } t) s.Content = SectionContent.FillMissing(t.FieldList, s.Content, Defaults.GetValueOrDefault(t.Type));
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
        CheckPinned(next);
        return next;
    }

    static void CheckPinned(PageDoc d)
    {
        if (d.Sections.Where((s, i) => TypeOf(s.Type)?.Top == true && i != 0).Any()
            || d.Sections.Where((s, i) => TypeOf(s.Type)?.Bottom == true && i != d.Sections.Count - 1).Any())
            throw AppException.Bad("The navigation bar stays first and the footer last.");
    }

    /// <summary>A section's (or shared block's) content replaced, after checking it against its fields. `rev` is the one the editor loaded.</summary>
    public static PageDoc SetContent(PageDoc doc, string id, int rev, JsonObject? content)
    {
        var next = Clone(doc);
        var s = next.Sections.Concat(next.Shared).FirstOrDefault(x => x.Id == id) ?? throw AppException.NotFound();
        if (s.Rev != rev) throw new AppException(409, "Someone else changed this section since you opened it. Reload to see their changes, then edit again.");
        var t = TypeOf(s.Type) ?? throw AppException.Bad("This kind of section can't be edited any more.");
        s.Content = SectionContent.Check(t.FieldList, content ?? []);
        s.Rev++;
        return next;
    }

    /// <summary>A new section of a repeatable type, after `afterId` (or before the footer), with the type's starting content or a copy of `copyOf`.</summary>
    public static (PageDoc Doc, string Id) AddSection(PageDoc doc, string type, string? afterId, string? copyOf)
    {
        var t = TypeOf(type);
        if (t is null || t.Shared) throw AppException.Bad("Choose a kind of section to add.");
        var next = Clone(doc);
        var source = copyOf is null ? null : next.Sections.FirstOrDefault(s => s.Id == copyOf) ?? throw AppException.NotFound();
        // The first of a type is always allowed back (it may have been deleted); further copies only for repeatable types.
        if (!t.Repeatable && next.Sections.Any(s => s.Type == type)) throw AppException.Bad($"The page can only have one {t.Label}.");
        var id = type;
        for (var n = 2; next.Sections.Any(s => s.Id == id); n++) id = $"{type}-{n}";
        var section = new SectionDoc
        {
            Id = id, Type = type, Visible = true,
            Content = source is not null ? source.Content.DeepClone().AsObject() : SectionContent.FillMissing(t.FieldList, [], Defaults.GetValueOrDefault(type)),
        };
        var at = afterId is null ? next.Sections.Count - (next.Sections.LastOrDefault() is { } last && TypeOf(last.Type)?.Bottom == true ? 1 : 0)
            : next.Sections.FindIndex(s => s.Id == afterId) + 1;
        if (at <= 0 && next.Sections.FirstOrDefault() is { } first && TypeOf(first.Type)?.Top == true) at = 1;
        next.Sections.Insert(Math.Min(at, next.Sections.Count), section);
        CheckPinned(next);
        return (next, id);
    }

    public static PageDoc RemoveSection(PageDoc doc, string id)
    {
        var next = Clone(doc);
        var s = next.Sections.FirstOrDefault(x => x.Id == id) ?? throw AppException.NotFound();
        if (TypeOf(s.Type) is { AlwaysOn: true } t) throw AppException.Bad($"The {t.Label} can't be removed.");
        next.Sections.Remove(s);
        return next;
    }

    /// <summary>
    /// What the website draws: the visible sections of a known type, in order. Only the first visible one of a
    /// type gets its anchor (#faq), so a second FAQ block doesn't make a duplicate id on the page.
    /// </summary>
    public static IEnumerable<object> Visible(PageDoc doc)
    {
        var anchored = new HashSet<string>();
        foreach (var s in doc.Sections.Where(s => s.Visible && TypeOf(s.Type) is { Shared: false }))
        {
            var anchor = TypeOf(s.Type)!.Anchor;
            yield return new { s.Id, s.Type, Anchor = anchor is not null && anchored.Add(anchor) ? anchor : null, s.Content };
        }
    }

    /// <summary>Shared content by type, always sent: hiding a section doesn't take away what other sections use.</summary>
    public static Dictionary<string, JsonObject> SharedContent(PageDoc doc) => doc.Shared.ToDictionary(s => s.Type, s => s.Content);
}
