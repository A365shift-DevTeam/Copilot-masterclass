using Application.Forms;
using Domain;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;

namespace Infrastructure.Persistence;

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
        // Never overwrites what an admin has set. Pricing cards ("ladder") only go into a new database:
        // an admin can delete those, and a deleted card must stay deleted after a restart.
        var existing = db.Courses.ToDictionary(c => c.Key);
        var fresh = existing.Count == 0;
        foreach (var seed in Courses())
        {
            if (!existing.TryGetValue(seed.Key, out var row)) { if (fresh || seed.Kind != "ladder") db.Courses.Add(seed); }
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
