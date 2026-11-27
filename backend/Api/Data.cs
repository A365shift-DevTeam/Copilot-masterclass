using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;

namespace Api;

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
    // Registration form, one row per field (see FormField). Used when the program has no payment link.
    public List<FormField> FormFields { get; set; } = [];
    public bool IsVisible { get; set; } = true;
    public int SortOrder { get; set; }
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}

/* A time-boxed discount, e.g. a Black Friday sale. While it runs, the site shows
   the sale price struck against the normal one, for the programs it covers. */
public class Offer
{
    public int Id { get; set; }
    public required string Name { get; set; } // for the admin, e.g. "Black Friday 2026"
    public required string Badge { get; set; } // shown on the site, e.g. "Black Friday: 30% off"
    public required string DiscountType { get; set; } // "percent" or "amount"
    public decimal DiscountValue { get; set; }
    public DateTimeOffset StartsAt { get; set; }
    public DateTimeOffset EndsAt { get; set; }
    public bool IsPaused { get; set; }
    public List<OfferItem> Items { get; set; } = [];
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset UpdatedAt { get; set; } = DateTimeOffset.UtcNow;
}

public class OfferItem
{
    public int OfferId { get; set; }
    public int CourseId { get; set; }
    // The gateways charge what their own page says, so a sale usually needs its own link.
    public string? SalePaymentUrl { get; set; }
}

public static class OfferPricing
{
    public const string Percent = "percent", Amount = "amount";

    public static bool IsLive(Offer o, DateTimeOffset now) => !o.IsPaused && o.StartsAt <= now && now < o.EndsAt;

    // Whole rupees, never below zero.
    public static decimal SalePrice(decimal price, Offer o) => Math.Max(0, o.DiscountType == Percent
        ? Math.Round(price * (1 - o.DiscountValue / 100m), 0, MidpointRounding.AwayFromZero)
        : price - o.DiscountValue);

    /// <summary>The live offer giving this program its lowest price at `now` (ties: the one ending first).</summary>
    public static (Offer Offer, OfferItem Item, decimal Price)? Best(Course c, IEnumerable<Offer> offers, DateTimeOffset now) =>
        offers.Where(o => IsLive(o, now))
            .SelectMany(o => o.Items.Where(i => i.CourseId == c.Id).Select(i => (Offer: o, Item: i, Price: SalePrice(c.Price, o))))
            .OrderBy(x => x.Price).ThenBy(x => x.Offer.EndsAt)
            .Select(x => ((Offer, OfferItem, decimal)?)x)
            .FirstOrDefault();
}

public static class PaymentStatus
{
    public const string Paid = "Paid", Pending = "Pending", Refunded = "Refunded", Failed = "Failed";
    public static readonly string[] All = [Paid, Pending, Refunded, Failed];
}

public class Payment
{
    public int Id { get; set; }
    public int? CourseId { get; set; } // null when a webhook payment could not be matched to a program
    public Course? Course { get; set; }
    public required string CustomerName { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public decimal Amount { get; set; } // what this person paid; a later price edit never changes it
    public string Currency { get; set; } = "INR";
    public string Status { get; set; } = PaymentStatus.Paid;
    public string? Method { get; set; }
    public string? Reference { get; set; }
    public string? GatewayPaymentId { get; set; } // Razorpay pay_… ID; unique, so webhook retries never double-record
    public string? GatewayOrderId { get; set; } // Razorpay order_… ID for website checkouts; unique, links verify and webhook to one row
    public List<PaymentAnswer> Answers { get; set; } = []; // what the person filled in on the registration form
    public DateTimeOffset PaidAt { get; set; } = DateTimeOffset.UtcNow;
    public string? Notes { get; set; }
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
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
    public string Label() => StartsAt.ToOffset(Ist).ToString(EndsAt is null ? "ddd d MMM yyyy" : "ddd d MMM yyyy, h:mm tt", System.Globalization.CultureInfo.InvariantCulture)
        + (EndsAt is null ? "" : " IST") + (string.IsNullOrWhiteSpace(Language) ? "" : $", {Language}");
}

/* A website checkout that was started: the form answers wait here until Razorpay confirms a payment,
   so abandoned checkouts never show up as payments. */
public class CheckoutAttempt
{
    public int Id { get; set; }
    public required string OrderId { get; set; }
    public int CourseId { get; set; }
    public decimal Amount { get; set; }
    public required string Name { get; set; }
    public string? Email { get; set; }
    public string? Phone { get; set; }
    public List<CheckoutAnswer> Answers { get; set; } = [];
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
}

/* One field of a program's registration form. `Key` is fixed when the field is created
   (never derived from the label), so renaming a field keeps its answers together.
   "name", "email" and "phone" are built in: they fill the payment's customer columns. */
public class FormField
{
    public int Id { get; set; }
    public int CourseId { get; set; }
    public required string Key { get; set; }
    public required string Label { get; set; }
    public required string Type { get; set; } // text | email | phone | number | textarea | select | radio | checkbox | date
    public bool Required { get; set; }
    public string? Placeholder { get; set; }
    public List<string> Options { get; set; } = []; // choices for select / radio / checkbox (a Postgres text[] column)
    public int SortOrder { get; set; }
}

/* One answer on a payment: a row per field, so registrations can be filtered and exported by field.
   Label is copied at the time, so old answers still read right after the form is edited. */
public class PaymentAnswer
{
    public int Id { get; set; }
    public int PaymentId { get; set; }
    public required string FieldKey { get; set; }
    public required string Label { get; set; }
    public required string Value { get; set; }
}

/* The same, while the checkout is waiting for Razorpay. Copied to PaymentAnswer once it is paid. */
public class CheckoutAnswer
{
    public int Id { get; set; }
    public int CheckoutAttemptId { get; set; }
    public required string FieldKey { get; set; }
    public required string Label { get; set; }
    public required string Value { get; set; }
}

public class AdminUser
{
    public int Id { get; set; }
    public required string Email { get; set; }
    public string? Name { get; set; }
    public string PasswordHash { get; set; } = "";
    // Rotated on password change; sessions carrying an old stamp are signed out.
    public string SecurityStamp { get; set; } = Guid.NewGuid().ToString("N");
    public DateTimeOffset CreatedAt { get; set; } = DateTimeOffset.UtcNow;
    public DateTimeOffset? LastLoginAt { get; set; }
}

/* Who changed what. Written in the same SaveChanges as the change itself. */
public class ActivityLog
{
    public long Id { get; set; }
    public DateTimeOffset At { get; set; } = DateTimeOffset.UtcNow;
    public required string Actor { get; set; } // admin email, or "Razorpay"
    public required string Action { get; set; } // e.g. payment.created
    public required string Summary { get; set; }
}

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

public class AppDb(DbContextOptions<AppDb> options) : DbContext(options)
{
    public DbSet<Course> Courses => Set<Course>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<AdminUser> Admins => Set<AdminUser>();
    public DbSet<ActivityLog> Activity => Set<ActivityLog>();
    public DbSet<SiteSetting> Settings => Set<SiteSetting>();
    public DbSet<Offer> Offers => Set<Offer>();
    public DbSet<CheckoutAttempt> CheckoutAttempts => Set<CheckoutAttempt>();
    public DbSet<FormField> FormFields => Set<FormField>();
    public DbSet<PaymentAnswer> PaymentAnswers => Set<PaymentAnswer>();

    public void Log(string actor, string action, string summary) =>
        Activity.Add(new ActivityLog { Actor = actor, Action = action, Summary = summary });

    protected override void OnModelCreating(ModelBuilder b)
    {
        b.Entity<Course>(e =>
        {
            e.HasIndex(c => c.Key).IsUnique();
            e.Property(c => c.Price).HasPrecision(12, 2);
            e.Property(c => c.ListPrice).HasPrecision(12, 2);
        });
        b.Entity<Payment>(e =>
        {
            e.Property(p => p.Amount).HasPrecision(12, 2);
            // Deleting a program must never take its ledger rows with it.
            e.HasOne(p => p.Course).WithMany().HasForeignKey(p => p.CourseId).OnDelete(DeleteBehavior.Restrict);
            e.HasIndex(p => p.PaidAt);
            e.HasIndex(p => p.Status);
            e.HasIndex(p => p.GatewayPaymentId).IsUnique();
            e.HasIndex(p => p.GatewayOrderId).IsUnique();
        });
        b.Entity<AdminUser>().HasIndex(a => a.Email).IsUnique();
        b.Entity<ActivityLog>().HasIndex(a => a.At);
        b.Entity<SiteSetting>().HasKey(s => s.Key);
        b.Entity<CheckoutAttempt>(e =>
        {
            e.HasIndex(a => a.OrderId).IsUnique();
            e.Property(a => a.Amount).HasPrecision(12, 2);
            e.HasOne<Course>().WithMany().HasForeignKey(a => a.CourseId).OnDelete(DeleteBehavior.Cascade);
            e.HasMany(a => a.Answers).WithOne().HasForeignKey(x => x.CheckoutAttemptId).OnDelete(DeleteBehavior.Cascade);
        });
        b.Entity<CourseSession>(e =>
        {
            e.HasOne<Course>().WithMany(c => c.Sessions).HasForeignKey(x => x.CourseId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(x => new { x.CourseId, x.StartsAt });
        });
        b.Entity<FormField>(e =>
        {
            e.HasOne<Course>().WithMany(c => c.FormFields).HasForeignKey(f => f.CourseId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(f => new { f.CourseId, f.Key }).IsUnique();
        });
        b.Entity<PaymentAnswer>(e =>
        {
            e.HasOne<Payment>().WithMany(p => p.Answers).HasForeignKey(a => a.PaymentId).OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(a => new { a.FieldKey, a.Value }); // filtering registrations by a field
        });
        b.Entity<Offer>(e =>
        {
            e.Property(o => o.DiscountValue).HasPrecision(12, 2);
            e.HasIndex(o => new { o.StartsAt, o.EndsAt });
            e.HasMany(o => o.Items).WithOne().HasForeignKey(i => i.OfferId).OnDelete(DeleteBehavior.Cascade);
        });
        b.Entity<OfferItem>(e =>
        {
            e.HasKey(i => new { i.OfferId, i.CourseId });
            e.HasOne<Course>().WithMany().HasForeignKey(i => i.CourseId).OnDelete(DeleteBehavior.Cascade);
        });
    }
}

public static class Seed
{
    static readonly TimeSpan Ist = TimeSpan.FromHours(5.5);
    // Npgsql only writes UTC offsets to timestamptz.
    static DateTimeOffset At(int y, int m, int d, int h = 0) => new DateTimeOffset(y, m, d, h, 0, 0, Ist).ToUniversalTime();

    // The values content.js shipped with, so an empty database renders the site unchanged.
    const string Store = "https://rzp.io/rzp/VNhx9z1I"; // the Razorpay store every Pricing section card opens

    static Course Ladder(string key, string name, decimal price, string includes, string duration, int sort, string category, string icon, string cta = "Enrol", bool featured = false) =>
        new() { Key = key, Kind = "ladder", Name = name, Price = price, PaymentUrl = Store, Description = includes, Duration = duration, SortOrder = sort,
                Category = category, Icon = icon, Cta = cta, IsFeatured = featured };

    static Course[] Courses() =>
    [
        // The webinar and recording also fill the Pricing section's "One-time access" cards.
        new() { Key = "webinar", Kind = "course", Name = "M365 Apps using copilot", Price = 499, SortOrder = 0,
                PaymentUrl = "https://link.trym.co.in/widget/form/NkftkuuLIgwagCAj0LQL",
                Sessions = [new() { StartsAt = At(2026, 11, 28, 9), EndsAt = At(2026, 11, 28, 13), Language = "Tamil" }],
                Description = "Microsoft 365 Copilot apps live training", Duration = "3-hour live session",
                Category = "once", CardTitle = "Live Webinar", Icon = "monitor-play", Cta = "Register" },
        new() { Key = "excel", Kind = "course", Name = "Microsoft Excel with Copilot", Price = 799, SortOrder = 1,
                PaymentUrl = "https://link.trym.co.in/widget/form/z4WbJOkIp0CdLuPuXAiE" },
        new() { Key = "recorded", Kind = "course", Name = "M365 Copilot Recorded Videos", Price = 999, SortOrder = 2,
                PaymentUrl = "https://link.trym.co.in/widget/form/Py8Ql9ccGxzsI9b63vRs",
                Description = "Watch the recording at your preferred time", Duration = "3 hours, watch any time",
                Category = "once", CardTitle = "Webinar Recording, Flexi Access", Icon = "circle-play", Cta = "Get the recording" },
        new() { Key = "project-support", Kind = "course", Name = "M365 copilot 1 to 1 Project support", Price = 4999, SortOrder = 3,
                PaymentUrl = "https://rzp.io/rzp/8b0AZrP" },
        new() { Key = "workshop", Kind = "course", Name = "M365Copilot offline Workshop", Price = 4999, SortOrder = 4,
                PaymentUrl = "https://rzp.io/rzp/OMsvnqoC", Sessions = [new() { StartsAt = At(2027, 1, 23), Language = "Tamil" }] },
        new() { Key = "skill-builder", Kind = "coaching", Name = "AI Skill Builder", Price = 4999, ListPrice = 16249, SortOrder = 5,
                PaymentUrl = "https://rzp.io/rzp/8b0AZrP" },
        new() { Key = "project-builder", Kind = "coaching", Name = "AI Project Builder", Price = 4999, ListPrice = 32499, SortOrder = 6,
                PaymentUrl = "https://rzp.io/rzp/OMsvnqoC" },
        // The Pricing section's other tabs (PRICE_LADDER in content.js), in tab order.
        Ladder("ladder-excel", "Copilot for Excel", 1499, "Excel skills and agent building", "30 days access", 10, "single", "app:excel"),
        Ladder("ladder-word", "Copilot for Word", 1499, "Word skills and agent building", "30 days access", 11, "single", "app:word"),
        Ladder("ladder-powerpoint", "Copilot for PowerPoint", 1499, "PowerPoint skills and agent building", "30 days access", 12, "single", "app:powerpoint"),
        Ladder("ladder-outlook-teams", "Copilot for Outlook & Teams", 1499, "Outlook and Teams workflows", "30 days access", 13, "single", "app:outlook,teams"),
        Ladder("ladder-image-gallery", "Image Gallery & App Integration", 1499, "Image gallery and app integration", "30 days access", 14, "single", "image"),
        Ladder("ladder-notebook", "Notebook & Copilot Schedule", 3999, "Reverse engineering, Copilot prompting, saving prompts and scheduling prompts", "60 days access", 15, "bundle", "calendar-check"),
        Ladder("ladder-skills-agents", "Copilot Skills & Agents", 3999, "Build skills and agents for Excel, Word and PowerPoint", "30 days access", 16, "bundle", "bot"),
        Ladder("ladder-sharepoint", "SharePoint & Web Applications", 3999, "To-Do lists, Forms, HTML dashboards and SharePoint websites", "30 days access", 17, "bundle", "app:sharepoint"),
        Ladder("ladder-master", "Master Package", 9999, "All programmes listed on this page", "120 days access", 18, "master", "layers", "Get the Master Package", featured: true),
        Ladder("ladder-premium", "Premium", 24999, "Weekly Copilot updates, 1 project with 5 hours of 1-to-1 support, and access to all new video content", "1 year access", 19, "master", "gem", "Get Premium"),
    ];

    public static void Run(AppDb db, IConfiguration config)
    {
        // Adds any program the database doesn't have yet (by key), and fills card text that is still empty.
        // Never overwrites what an admin has set.
        var existing = db.Courses.ToDictionary(c => c.Key);
        foreach (var seed in Courses())
        {
            if (!existing.TryGetValue(seed.Key, out var row)) db.Courses.Add(seed);
            else
            {
                row.Description ??= seed.Description;
                row.Duration ??= seed.Duration;
                if (row.Category is null && seed.Category is not null)
                {
                    (row.Category, row.CardTitle, row.Icon, row.Cta) = (seed.Category, seed.CardTitle, seed.Icon, seed.Cta);
                    row.IsFeatured = seed.IsFeatured;
                }
            }
        }
        db.SaveChanges();

        // Every Pricing card starts with the name / email / phone registration form.
        foreach (var id in db.Courses.Where(c => c.Category != null && !c.FormFields.Any()).Select(c => c.Id).ToList())
            db.FormFields.AddRange(Checkout.DefaultFields(id));
        db.SaveChanges();

        // First admin comes from config (user-secrets or env vars), only while there is none.
        var email = config["Admin:Email"];
        var password = config["Admin:Password"];
        if (!db.Admins.Any() && !string.IsNullOrWhiteSpace(email) && !string.IsNullOrWhiteSpace(password))
        {
            var admin = new AdminUser { Email = email.Trim().ToLowerInvariant() };
            admin.PasswordHash = new PasswordHasher<AdminUser>().HashPassword(admin, password);
            db.Admins.Add(admin);
            db.SaveChanges();
        }
    }
}
