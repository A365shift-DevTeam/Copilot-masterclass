namespace Application.Common;

/// <summary>
/// A request the use case refuses. The API answers with this status and, when given, the message as the
/// problem's `detail` (what the admin and the website show); without a message the body is empty.
/// </summary>
public class AppException(int status, string? detail = null) : Exception(detail)
{
    public int Status { get; } = status;
    public string? Detail { get; } = detail;

    public static AppException NotFound() => new(404);
    public static AppException Bad(string detail) => new(400, detail);
}

/// <summary>A file to download, such as a CSV export.</summary>
public record FileDownload(byte[] Content, string ContentType, string Name);

public static class Csv
{
    // Quotes every cell, and stops Excel running a cell that starts like a formula.
    public static string Cell(string? v)
    {
        v ??= "";
        // Phone numbers like +91 98400 12345 are safe and stay as typed.
        if (v.Length > 0 && "=+-@\t\r".Contains(v[0]) && !v.All(ch => char.IsDigit(ch) || " +-()".Contains(ch))) v = "'" + v;
        return "\"" + v.Replace("\"", "\"\"") + "\"";
    }

    // UTF-8 with a BOM, so Excel reads non-English text right.
    public static FileDownload File(string csv, string name) =>
        new(System.Text.Encoding.UTF8.GetPreamble().Concat(System.Text.Encoding.UTF8.GetBytes(csv)).ToArray(), "text/csv", name);
}

static class Ist
{
    public static readonly TimeSpan Offset = TimeSpan.FromHours(5.5);
}

static class Text
{
    public static string? Clean(string? s) => string.IsNullOrWhiteSpace(s) ? null : s.Trim();
}
