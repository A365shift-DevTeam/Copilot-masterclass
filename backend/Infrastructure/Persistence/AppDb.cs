using Application.Common;
using Domain;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Persistence;

public class AppDb(DbContextOptions<AppDb> options) : DbContext(options), IAppDbContext
{
    public DbSet<Course> Courses => Set<Course>();
    public DbSet<CourseSession> Sessions => Set<CourseSession>();
    public DbSet<Payment> Payments => Set<Payment>();
    public DbSet<AdminUser> Admins => Set<AdminUser>();
    public DbSet<ActivityLog> Activity => Set<ActivityLog>();
    public DbSet<SiteSetting> Settings => Set<SiteSetting>();
    public DbSet<Offer> Offers => Set<Offer>();
    public DbSet<CheckoutAttempt> CheckoutAttempts => Set<CheckoutAttempt>();
    public DbSet<FormField> FormFields => Set<FormField>();
    public DbSet<PaymentAnswer> PaymentAnswers => Set<PaymentAnswer>();
    public DbSet<SitePage> SitePages => Set<SitePage>();
    public DbSet<SitePublish> SitePublishes => Set<SitePublish>();

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
            e.ToTable("CourseSession"); // named before the Sessions set existed; the set must not rename it
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
        // json, not jsonb: kept exactly as written, so draft and published compare as text.
        b.Entity<SitePage>(e =>
        {
            e.HasKey(p => p.Key);
            e.Property(p => p.Draft).HasColumnType("json");
            e.Property(p => p.Published).HasColumnType("json");
            e.Property(p => p.Version).IsConcurrencyToken();
        });
        b.Entity<SitePublish>(e =>
        {
            e.Property(p => p.Snapshot).HasColumnType("json");
            e.HasIndex(p => new { p.PageKey, p.PublishedAt });
        });
        b.Entity<OfferItem>(e =>
        {
            e.HasKey(i => new { i.OfferId, i.CourseId });
            e.HasOne<Course>().WithMany().HasForeignKey(i => i.CourseId).OnDelete(DeleteBehavior.Cascade);
        });
    }
}
