using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;
using Application.Common;

namespace Application.Website;

/* A section's content against its fields: checked on every save (it ends up on the public website,
   so only plain text and safe links get through), and rebuilt in field order, so two copies of the
   same content are the same text and draft/published compare cleanly. */
public static partial class SectionContent
{
    const int TextMax = 200, TextareaMax = 2000, LinkMax = 500, ListMax = 50;

    /// <summary>The content, checked and in field order. Throws a 400 naming the field when something is wrong.</summary>
    public static JsonObject Check(IReadOnlyList<FieldSpec> fields, JsonObject input) => Object(fields, input, "");

    static JsonObject Object(IReadOnlyList<FieldSpec> fields, JsonObject input, string path)
    {
        if (input.Select(p => p.Key).FirstOrDefault(k => fields.All(f => f.Key != k)) is { } unknown)
            throw AppException.Bad($"{Where(path)}\"{unknown}\" isn't a field of this section.");
        var output = new JsonObject();
        foreach (var f in fields)
        {
            var at = $"{path}{f.Label}";
            if (!input.TryGetPropertyValue(f.Key, out var value) || value is null) throw AppException.Bad($"{at} is missing.");
            output[f.Key] = Value(f, value, at);
        }
        return output;
    }

    static JsonNode Value(FieldSpec f, JsonNode value, string at)
    {
        switch (f.Kind)
        {
            case "text" or "textarea" or "link" or "select":
                return JsonValue.Create(Line(f, value, at));
            case "strings":
                if (value is not JsonArray lines) throw AppException.Bad($"{at} must be a list of lines.");
                Count(f, lines.Count, at);
                return new JsonArray(lines.Select((l, i) => (JsonNode)JsonValue.Create(Line(f with { Kind = "text", Required = true, Max = null }, l ?? "", $"{at}, line {i + 1}"))).ToArray());
            case "list":
                if (value is not JsonArray items) throw AppException.Bad($"{at} must be a list.");
                Count(f, items.Count, at);
                return new JsonArray(items.Select((item, i) => item is JsonObject o
                    ? (JsonNode)Object(f.Fields ?? [], o, $"{at}, {f.ItemLabel ?? "item"} {i + 1}: ")
                    : throw AppException.Bad($"{at}, {f.ItemLabel ?? "item"} {i + 1} is not filled in properly.")).ToArray());
            default:
                throw new InvalidOperationException($"Unknown field kind {f.Kind}");
        }
    }

    static string Line(FieldSpec f, JsonNode value, string at)
    {
        if (value is not JsonValue v || !v.TryGetValue<string>(out var raw)) throw AppException.Bad($"{at} must be text.");
        var s = raw.Trim().Replace("\r\n", "\n");
        var max = f.Max ?? f.Kind switch { "textarea" => TextareaMax, "link" => LinkMax, _ => TextMax };
        if (s.Length > max) throw AppException.Bad($"{at} is too long ({s.Length} characters; {max} at most).");
        if (f.Required && s.Length == 0) throw AppException.Bad($"{at} can't be empty.");
        if (f.Kind is not "textarea" && s.Contains('\n')) throw AppException.Bad($"{at} must be one line.");
        if (s.Any(c => char.IsControl(c) && c != '\n')) throw AppException.Bad($"{at} has characters that can't be shown.");
        if (f.Kind == "link" && s.Length > 0 && !SafeLink(s))
            throw AppException.Bad($"{at} must be a full https:// address, a #section on this page, a mailto: or a tel: link.");
        if (f.Kind == "select" && !(f.Options ?? []).Contains(s)) throw AppException.Bad($"{at} must be one of the listed choices.");
        return s;
    }

    static void Count(FieldSpec f, int n, string at)
    {
        if (f.Count is { } exact && n != exact) throw AppException.Bad($"{at} needs exactly {exact} {(exact == 1 ? "entry" : "entries")}.");
        if (n < (f.Min ?? 0)) throw AppException.Bad($"{at} needs at least {f.Min}.");
        if (n > (f.Max ?? ListMax)) throw AppException.Bad($"{at} can have up to {f.Max ?? ListMax}.");
    }

    // Links end up in href on the public site: never javascript:, data: and the like.
    public static bool SafeLink(string s) =>
        s.StartsWith('#') ? Anchor().IsMatch(s)
        : s.StartsWith("mailto:", StringComparison.OrdinalIgnoreCase) ? s.Length > 7 && !s.Any(char.IsWhiteSpace)
        : s.StartsWith("tel:", StringComparison.OrdinalIgnoreCase) ? Phone().IsMatch(s[4..])
        : Uri.TryCreate(s, UriKind.Absolute, out var u) && u.Scheme == Uri.UriSchemeHttps && !string.IsNullOrEmpty(u.Host);

    [GeneratedRegex("^#[a-z0-9][a-z0-9-]*$")] private static partial Regex Anchor();
    [GeneratedRegex(@"^\+?[0-9 ()-]{5,20}$")] private static partial Regex Phone();

    static string Where(string path) => path.Length == 0 ? "" : path;

    /// <summary>
    /// The content with the default of any missing field filled in, in field order. Fields already there are kept
    /// as they are (a list the admin shortened stays short); a field no longer in the list is dropped.
    /// </summary>
    public static JsonObject FillMissing(IReadOnlyList<FieldSpec> fields, JsonObject content, JsonObject? defaults)
    {
        var output = new JsonObject();
        foreach (var f in fields)
        {
            var value = content.TryGetPropertyValue(f.Key, out var v) && v is not null ? v
                : defaults?.TryGetPropertyValue(f.Key, out var d) == true && d is not null ? d
                : Empty(f);
            // Items of a list already there get any field added to the item since (empty: an item has no default).
            output[f.Key] = f.Kind == "list" && value is JsonArray items
                ? new JsonArray(items.Select(i => (JsonNode?)(i is JsonObject o ? FillMissing(f.Fields ?? [], o, null) : i?.DeepClone())).ToArray())
                : value.DeepClone();
        }
        return output;
    }

    static JsonNode Empty(FieldSpec f) => f.Kind is "list" or "strings" ? new JsonArray() : JsonValue.Create(f.Kind == "select" ? f.Options?.FirstOrDefault() ?? "" : "");
}
