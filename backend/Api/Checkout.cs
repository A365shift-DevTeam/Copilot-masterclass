using System.Net.Mail;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace Api;

/// <summary>A form field as the admin edits it and the website renders it.</summary>
public record FieldDto(string Key, string Label, string Type, bool Required = false, string? Placeholder = null, List<string>? Options = null);

/// <summary>One answer, with the label as the person saw it.</summary>
public record AnswerDto(string Key, string Label, string Value);

/* Registration forms and website checkout: pure functions, tested in Api.Tests. */
public static class Checkout
{
    public static readonly string[] Types = ["text", "email", "phone", "number", "textarea", "select", "radio", "checkbox", "date"];
    static readonly string[] WithOptions = ["select", "radio", "checkbox"];
    const int MaxFields = 30, MaxValue = 2000;

    public static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    public static List<FieldDto> DefaultForm() =>
    [
        new("name", "Full name", "text", true, "Your name"),
        new("email", "Email", "email", true, "you@example.com"),
        new("phone", "Phone (WhatsApp)", "phone", true, "+91 98765 43210"),
    ];

    public static IEnumerable<FormField> DefaultFields(int courseId) => ToRows(courseId, DefaultForm());

    public static IEnumerable<FormField> ToRows(int courseId, IEnumerable<FieldDto> fields) => fields.Select((f, i) => new FormField
    {
        CourseId = courseId, Key = f.Key, Label = f.Label.Trim(), Type = f.Type, Required = f.Required,
        Placeholder = string.IsNullOrWhiteSpace(f.Placeholder) ? null : f.Placeholder.Trim(),
        Options = WithOptions.Contains(f.Type) ? (f.Options ?? []).Select(o => o.Trim()).ToList() : [],
        SortOrder = i,
    });

    public static FieldDto ToDto(FormField f) =>
        new(f.Key, f.Label, f.Type, f.Required, f.Placeholder, WithOptions.Contains(f.Type) ? f.Options : null);

    /// <summary>Checks a form the admin saves. Null when it's fine.</summary>
    public static string? ValidateForm(List<FieldDto>? fields)
    {
        if (fields is null || fields.Count == 0) return "Add at least the name and email fields.";
        if (fields.Count > MaxFields) return $"A form can have up to {MaxFields} fields.";
        if (fields.Select(f => f.Key).Distinct().Count() != fields.Count) return "Two fields share the same key.";
        foreach (var f in fields)
        {
            if (string.IsNullOrWhiteSpace(f.Key) || f.Key.Length > 40) return "Every field needs a key.";
            if (string.IsNullOrWhiteSpace(f.Label) || f.Label.Length > 120) return "Every field needs a label of up to 120 characters.";
            if (!Types.Contains(f.Type)) return $"\"{f.Label}\" has an unknown field type.";
            if (f.Placeholder is { Length: > 120 }) return $"\"{f.Label}\": keep the placeholder to 120 characters.";
            if (WithOptions.Contains(f.Type))
            {
                if (f.Options is not { Count: > 0 } || f.Options.Any(string.IsNullOrWhiteSpace)) return $"\"{f.Label}\" needs at least one choice, and no empty ones.";
                if (f.Options.Count > 50) return $"\"{f.Label}\" has too many choices (50 at most).";
                if (f.Options.Select(o => o.Trim()).Distinct().Count() != f.Options.Count) return $"\"{f.Label}\" has the same choice twice.";
                // Checkbox answers are stored "A, B", so a comma inside a choice would split it.
                if (f.Type == "checkbox" && f.Options.Any(o => o.Contains(','))) return $"\"{f.Label}\": checkbox choices can't contain commas.";
            }
        }
        if (fields.FirstOrDefault(f => f.Key == "name") is not { Required: true, Type: "text" }) return "The form must keep the required Full name field.";
        if (fields.FirstOrDefault(f => f.Key == "email") is not { Required: true, Type: "email" }) return "The form must keep the required Email field.";
        if (fields.FirstOrDefault(f => f.Key == "phone") is { } phone && phone.Type != "phone") return "The built-in Phone field must stay a phone field.";
        return null;
    }

    public record Result(string? Error, List<AnswerDto> Answers, string Name, string? Email, string? Phone);

    /// <summary>Checks what a visitor submitted against the form. Unknown keys are dropped; empty optional fields are skipped.</summary>
    public static Result ReadAnswers(IEnumerable<FieldDto> fields, Dictionary<string, JsonElement>? input)
    {
        input ??= [];
        var answers = new List<AnswerDto>();
        foreach (var f in fields)
        {
            var value = input.TryGetValue(f.Key, out var v) ? Text(v) : "";
            Result Fail(string msg) => new(msg, [], "", null, null);
            if (value.Length > MaxValue) return Fail($"{f.Label} is too long.");
            if (value.Length == 0)
            {
                if (f.Required) return Fail($"Please fill in {f.Label}.");
                continue;
            }
            var options = f.Options ?? [];
            switch (f.Type)
            {
                case "email" when !IsEmail(value): return Fail($"{f.Label} doesn't look like an email address.");
                case "phone" when !IsPhone(value): return Fail($"{f.Label} doesn't look like a phone number.");
                case "number" when !decimal.TryParse(value, System.Globalization.NumberStyles.Number, System.Globalization.CultureInfo.InvariantCulture, out _):
                    return Fail($"{f.Label} must be a number.");
                case "date" when !DateOnly.TryParseExact(value, "yyyy-MM-dd", out _): return Fail($"{f.Label} must be a date.");
                case "select" or "radio" when !options.Contains(value): return Fail($"Choose one of the options for {f.Label}.");
                case "checkbox" when value.Split(", ").Any(x => !options.Contains(x)): return Fail($"Choose from the options for {f.Label}.");
            }
            answers.Add(new(f.Key, f.Label, f.Type == "email" ? value.ToLowerInvariant() : value));
        }
        string? Get(string key) => answers.FirstOrDefault(a => a.Key == key)?.Value;
        return new(null, answers, Get("name") ?? "", Get("email"), Get("phone"));
    }

    // Strings as typed; a checkbox group arrives as an array and is stored "A, B".
    static string Text(JsonElement v) => v.ValueKind switch
    {
        JsonValueKind.String => v.GetString()!.Trim(),
        JsonValueKind.Number => v.GetRawText(),
        JsonValueKind.True => "Yes",
        JsonValueKind.Array => string.Join(", ", v.EnumerateArray().Where(x => x.ValueKind == JsonValueKind.String)
            .Select(x => x.GetString()!.Trim()).Where(x => x.Length > 0)),
        _ => "",
    };

    static bool IsEmail(string s) => s.Length <= 200 && MailAddress.TryCreate(s, out var m) && m.Address == s && m.Host.Contains('.');

    static bool IsPhone(string s)
    {
        if (s.Length > 25 || !s.All(c => char.IsDigit(c) || " +-()".Contains(c))) return false;
        return s.Count(char.IsDigit) is >= 7 and <= 15;
    }

    /// <summary>Razorpay Checkout's success signature: HMAC-SHA256 of "order_id|payment_id" with the Key Secret.</summary>
    public static bool SignatureValid(string orderId, string paymentId, string? signature, string keySecret)
    {
        if (string.IsNullOrEmpty(signature)) return false;
        var expected = HMACSHA256.HashData(Encoding.UTF8.GetBytes(keySecret), Encoding.UTF8.GetBytes($"{orderId}|{paymentId}"));
        byte[] given;
        try { given = Convert.FromHexString(signature.Trim()); }
        catch (FormatException) { return false; }
        return CryptographicOperations.FixedTimeEquals(expected, given);
    }
}
