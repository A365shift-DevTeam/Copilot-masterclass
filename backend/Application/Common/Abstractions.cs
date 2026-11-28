using System.Text.Json;
using Domain;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.ChangeTracking;

namespace Application.Common;

/* What the use cases need from the outside world. Infrastructure implements each one. */

/// <summary>The database. Activity entries go in with the change they describe, in the same SaveChanges.</summary>
public interface IAppDbContext
{
    DbSet<Course> Courses { get; }
    DbSet<CourseSession> Sessions { get; }
    DbSet<Payment> Payments { get; }
    DbSet<AdminUser> Admins { get; }
    DbSet<ActivityLog> Activity { get; }
    DbSet<SiteSetting> Settings { get; }
    DbSet<Offer> Offers { get; }
    DbSet<CheckoutAttempt> CheckoutAttempts { get; }
    DbSet<FormField> FormFields { get; }
    DbSet<PaymentAnswer> PaymentAnswers { get; }
    DbSet<SitePage> SitePages { get; }
    DbSet<SitePublish> SitePublishes { get; }
    ChangeTracker ChangeTracker { get; }

    void Log(string actor, string action, string summary);
    Task<int> SaveChangesAsync(CancellationToken ct = default);
}

/// <summary>Settings saved from the admin, secrets encrypted at rest. A saved value wins over appsettings.</summary>
public interface ISettingsStore
{
    const string RazorpayKeyId = "razorpay.keyId";
    const string RazorpayKeySecret = "razorpay.keySecret"; // encrypted
    const string RazorpayWebhookSecret = "razorpay.webhookSecret"; // encrypted

    Task<string?> GetAsync(string key);
    // Adds or changes the row; the caller saves (so it lands in the same SaveChanges as its log entry).
    Task SetAsync(string key, string? value, bool secret = false);
    Task<RazorpayCreds> RazorpayAsync();
}

public record RazorpayCreds(string? KeyId, string? KeySecret, string? WebhookSecret,
    string? KeyIdSource, string? KeySecretSource, string? WebhookSecretSource);

/// <summary>The bits of the Razorpay REST API the admin and the website checkout use.</summary>
public interface IRazorpayGateway
{
    Task<RazorpayPage> PaymentsAsync(string keyId, string keySecret, DateTimeOffset from, DateTimeOffset to, int skip, int count = 100);
    /// <summary>Creates an order for `paise`. The order fixes the amount, so a visitor can't change what they pay.</summary>
    Task<RazorpayReply> CreateOrderAsync(string keyId, string keySecret, long paise, string receipt, Dictionary<string, string> notes);
    Task<RazorpayReply> PaymentAsync(string keyId, string keySecret, string paymentId);
}

public record RazorpayPage(List<JsonElement> Items, int Status, string? Error);
public record RazorpayReply(JsonElement Body, int Status, string? Error);

public interface IPasswordHasher
{
    string Hash(AdminUser admin, string password);
    bool Verify(AdminUser admin, string password);
}

/// <summary>The signed-in admin. Name is what the activity log shows.</summary>
public interface ICurrentUser
{
    int Id { get; }
    string Name { get; }
}

/// <summary>Short-lived links that let the website show the draft page (Preview in the admin).</summary>
public interface IPreviewTokens
{
    string Issue();
    bool IsValid(string token);
}
