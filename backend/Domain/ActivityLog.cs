namespace Domain;

/* Who changed what. Written in the same SaveChanges as the change itself. */
public class ActivityLog
{
    public long Id { get; set; }
    public DateTimeOffset At { get; set; } = DateTimeOffset.UtcNow;
    public required string Actor { get; set; } // admin email, or "Razorpay"
    public required string Action { get; set; } // e.g. payment.created
    public required string Summary { get; set; }
}
