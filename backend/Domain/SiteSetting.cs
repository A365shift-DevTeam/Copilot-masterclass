namespace Domain;

/* Site-wide values the landing page reads, by key (see SiteSettings.Keys). */
public class SiteSetting
{
    public required string Key { get; set; }
    public string? Value { get; set; }
}

public static class SiteSettings
{
    public const string WhatsappUrl = "whatsappUrl";
    public static readonly string[] Keys = [WhatsappUrl];
}
