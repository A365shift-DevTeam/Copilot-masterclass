namespace Domain;

/* What a Pricing section card can be: its tab, and the icons the website can draw. */
public static class Cards
{
    public static readonly string[] Categories = ["once", "single", "bundle", "master"];
    public static readonly string[] Icons = ["monitor-play", "circle-play", "image", "calendar-check", "bot", "layers", "gem"];
    public static readonly string[] Apps = ["excel", "word", "powerpoint", "outlook", "teams", "sharepoint", "onenote", "onedrive", "forms", "planner"];
    public static bool IconValid(string icon) => Icons.Contains(icon)
        || (icon.StartsWith("app:") && icon[4..].Split(',').All(a => Apps.Contains(a)));
}
