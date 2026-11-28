using System.Text.Json.Nodes;
using Application.Common;
using Domain;
using Microsoft.EntityFrameworkCore;

namespace Application.Website;

/* The admin's Website page: the draft's sections, Publish, Discard, history and Preview. */
public class WebsiteService(IAppDbContext db, ICurrentUser me, IPreviewTokens tokens)
{
    public async Task<object> GetAsync() => State(await Load());

    public async Task<object> SaveLayoutAsync(LayoutDto dto)
    {
        var page = await Load();
        Fresh(page, dto.Version);
        page.Draft = Page.Write(Page.SetLayout(Page.Read(page.Draft), dto.Sections ?? []));
        await Save(page);
        return State(page);
    }

    // A content save is checked against that section's revision, not the page version: someone reordering
    // the page, or editing another section, doesn't block it.
    public async Task<object> SaveContentAsync(string id, ContentDto dto)
    {
        var page = await Load();
        page.Draft = Page.Write(Page.SetContent(Page.Read(page.Draft), id, dto.Rev, dto.Content));
        await Save(page);
        return State(page);
    }

    public async Task<object> AddSectionAsync(AddSectionDto dto)
    {
        var page = await Load();
        Fresh(page, dto.Version);
        var (doc, id) = Page.AddSection(Page.Read(page.Draft), dto.Type ?? "", dto.After, dto.CopyOf);
        page.Draft = Page.Write(doc);
        await Save(page);
        return new { added = id, page = State(page) };
    }

    public async Task<object> RemoveSectionAsync(string id, VersionDto dto)
    {
        var page = await Load();
        Fresh(page, dto.Version);
        page.Draft = Page.Write(Page.RemoveSection(Page.Read(page.Draft), id));
        await Save(page);
        return State(page);
    }

    public async Task<object> PublishAsync(PublishDto dto)
    {
        var page = await Load();
        Fresh(page, dto.Version);
        if (page.Draft == page.Published) throw AppException.Bad("There are no changes to publish.");
        var summary = Text.Clean(dto.Summary);
        if (summary is { Length: > 200 }) throw AppException.Bad("Keep the summary to 200 characters.");
        page.Published = page.Draft;
        db.SitePublishes.Add(new SitePublish { PageKey = page.Key, Snapshot = page.Draft, PublishedBy = me.Name, Summary = summary });
        db.Log(me.Name, "website.published", summary is null ? "Published the website" : $"Published the website: {summary}");
        await Save(page);
        return State(page);
    }

    public async Task<object> DiscardAsync(VersionDto dto)
    {
        var page = await Load();
        Fresh(page, dto.Version);
        page.Draft = page.Published;
        db.Log(me.Name, "website.discarded", "Discarded the unpublished website changes");
        await Save(page);
        return State(page);
    }

    public async Task<object> HistoryAsync() =>
        await db.SitePublishes.AsNoTracking().Where(p => p.PageKey == Page.Home).OrderByDescending(p => p.PublishedAt).Take(50)
            .Select(p => new { p.Id, p.PublishedAt, p.PublishedBy, p.Summary }).ToListAsync();

    /// <summary>Loads an earlier publish as the draft, to preview and publish again.</summary>
    public async Task<object> RestoreAsync(int id, VersionDto dto)
    {
        var snap = await db.SitePublishes.AsNoTracking().FirstOrDefaultAsync(p => p.Id == id && p.PageKey == Page.Home) ?? throw AppException.NotFound();
        var page = await Load();
        Fresh(page, dto.Version);
        // Section types added since that publish come back too, as the seed would add them.
        page.Draft = Page.Write(Page.Seed(Page.Read(snap.Snapshot)));
        db.Log(me.Name, "website.restored", $"Loaded the version published {snap.PublishedAt.ToOffset(Ist.Offset):d MMM yyyy, h:mm tt} by {snap.PublishedBy} as the draft");
        await Save(page);
        return State(page);
    }

    public object PreviewToken() => new { token = tokens.Issue() };

    async Task<SitePage> Load() =>
        await db.SitePages.FirstOrDefaultAsync(p => p.Key == Page.Home) ?? throw new AppException(503, "The website page isn't set up yet. Restart the API to create it.");

    // A save from a screen loaded before someone else's save would undo it.
    static void Fresh(SitePage page, int version)
    {
        if (version != page.Version)
            throw new AppException(409, $"{page.UpdatedBy ?? "Someone"} changed the website {Ago(page.UpdatedAt)}. Reload to see their changes, then try again.");
    }

    static string Ago(DateTimeOffset at) => (DateTimeOffset.UtcNow - at) switch
    {
        { TotalMinutes: < 1 } => "a moment ago",
        { TotalMinutes: < 60 } t => $"{(int)t.TotalMinutes} min ago",
        _ => $"at {at.ToOffset(Ist.Offset):h:mm tt}",
    };

    async Task Save(SitePage page)
    {
        page.Version++;
        page.UpdatedAt = DateTimeOffset.UtcNow;
        page.UpdatedBy = me.Name;
        try { await db.SaveChangesAsync(); }
        catch (DbUpdateConcurrencyException) { throw new AppException(409, "Someone saved the website at the same moment. Reload and try again."); }
    }

    static object State(SitePage page)
    {
        var draft = Page.Read(page.Draft);
        var published = Page.Read(page.Published);
        var live = published.Sections.Concat(published.Shared).ToDictionary(s => s.Id);
        object Row(SectionDoc s, bool shared)
        {
            var t = Page.TypeOf(s.Type);
            var was = live.GetValueOrDefault(s.Id);
            return new
            {
                s.Id, s.Type, s.Visible, s.Rev, s.Content, Label = t?.Label ?? s.Type, t?.Anchor,
                AlwaysOn = t?.AlwaysOn ?? false, Pinned = t is { Top: true } or { Bottom: true },
                Editable = t?.FieldList.Count > 0,
                // Shown on the live site right now, and whether this section differs from it.
                Live = shared || (was?.Visible ?? false),
                Changed = was is null || was.Visible != s.Visible || was.Content.ToJsonString() != s.Content.ToJsonString()
                    || (!shared && published.Sections.IndexOf(was) != draft.Sections.IndexOf(s)),
            };
        }
        return new
        {
            page.Version, page.UpdatedAt, page.UpdatedBy,
            HasChanges = page.Draft != page.Published,
            Sections = draft.Sections.Select(s => Row(s, false)),
            Shared = draft.Shared.Select(s => Row(s, true)),
            // The field lists the editor builds its forms from, and what can be added.
            Types = Page.Types.Select(t => new { t.Type, t.Label, t.Shared, t.Repeatable, Fields = t.FieldList,
                CanAdd = !t.Shared && !t.AlwaysOn && (t.Repeatable || draft.Sections.All(s => s.Type != t.Type)) }),
        };
    }
}

public record LayoutDto(int Version, List<Page.LayoutItem>? Sections);
public record ContentDto(int Rev, JsonObject? Content);
public record AddSectionDto(int Version, string? Type, string? After, string? CopyOf);
public record PublishDto(int Version, string? Summary);
public record VersionDto(int Version);
