namespace Domain;

/* The website's page as a document: its sections in order, each with its own content.
   Two copies: the Draft the admin edits and the Published one visitors see. Both are
   JSON (see Application/Website/PageDoc). Version goes up on every save, so a save made
   from a stale screen is refused rather than overwriting someone else's change. */
public class SitePage
{
    public required string Key { get; set; } // "home": the landing page
    public required string Draft { get; set; }
    public required string Published { get; set; }
    public int Version { get; set; }
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
    public string? UpdatedBy { get; set; }
}

/* One Publish: what went live, kept so an earlier version can be restored. */
public class SitePublish
{
    public int Id { get; set; }
    public required string PageKey { get; set; }
    public required string Snapshot { get; set; }
    public DateTimeOffset PublishedAt { get; set; } = DateTimeOffset.UtcNow;
    public required string PublishedBy { get; set; }
    public string? Summary { get; set; }
}
