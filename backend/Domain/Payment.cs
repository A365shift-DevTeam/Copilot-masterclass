namespace Domain;

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
