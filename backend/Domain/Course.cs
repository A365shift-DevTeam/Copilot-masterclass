using System.Globalization;

namespace Domain;

/* One row per thing the site sells. `Key` is how frontend/src/data/content.js
   finds its entry, so it never changes once seeded. Programs are edited, not
   created: a new program also needs its copy and card on the site. */
public class Course
{
    public int Id { get; set; }
    public required string Key { get; set; }
    public required string Kind { get; set; } // "course" (hero price table), "coaching" (1:1 cards) or "ladder" (Pricing section cards)
    public required string Name { get; set; }
    public decimal Price { get; set; }
    public decimal? ListPrice { get; set; } // the struck-through package price on coaching cards
    // Register goes to this link when set; when empty, the website takes registration and payment itself (form + Razorpay).
    public string? PaymentUrl { get; set; }
    public bool FormFirst { get; set; } // with a payment link: show the registration form first, then open the link
    public string? RazorpayId { get; set; } // payment page or link ID, so webhook payments land on this program
    // Dates it runs on (a webinar can have several upcoming); the website shows the next one.
    public List<CourseSession> Sessions { get; set; } = [];
    public string? Description { get; set; } // "Includes" line on its Pricing section card
    public string? Duration { get; set; } // e.g. "30 days access", under the price on its Pricing section card
    // Pricing section card (set for every program shown there):
    public string? Category { get; set; } // its tab: once | single | bundle | master
    public string? CardTitle { get; set; } // when the card's title differs from Name (e.g. "Live Webinar")
    public string? Cta { get; set; } // button label, e.g. "Enrol"
    public string? Icon { get; set; } // a named icon (bot, gem…) or "app:excel" / "app:outlook,teams" for Microsoft logos
    public bool IsFeatured { get; set; } // the "Most popular" tag
    // Registration form, one row per field (see FormField). Used when the program has no payment link, or FormFirst is on.
    public List<FormField> FormFields { get; set; } = [];
    public bool IsVisible { get; set; } = true;
    public int SortOrder { get; set; }
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}
/* One date a program runs on. EndsAt empty = an all-day date. */
public class CourseSession
{
    public int Id { get; set; }
    public int CourseId { get; set; }
    public DateTimeOffset StartsAt { get; set; }
    public DateTimeOffset? EndsAt { get; set; }
    public string? Language { get; set; }

    public DateTimeOffset Ends => EndsAt ?? StartsAt.AddDays(1);

    /// <summary>The sessions not over yet, soonest first: [0] is what the website shows.</summary>
    public static List<CourseSession> Upcoming(IEnumerable<CourseSession> all, DateTimeOffset now) =>
        all.Where(x => x.Ends > now).OrderBy(x => x.StartsAt).ToList();

    static readonly TimeSpan Ist = TimeSpan.FromHours(5.5);
    /// <summary>"Sat 28 Nov 2026, 9:00 AM IST, Tamil" — saved with a registration so it's clear which date someone signed up for.</summary>
    public string Label() => StartsAt.ToOffset(Ist).ToString(EndsAt is null ? "ddd d MMM yyyy" : "ddd d MMM yyyy, h:mm tt", CultureInfo.InvariantCulture)
        + (EndsAt is null ? "" : " IST") + (string.IsNullOrWhiteSpace(Language) ? "" : $", {Language}");
}
