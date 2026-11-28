namespace Domain;

/* A website checkout that was started: the form answers wait here until Razorpay confirms a payment,
   so abandoned checkouts never show up as payments. A card that pays by link keeps them as unpaid registrations. */
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

/* The same, while the checkout is waiting for Razorpay. Copied to PaymentAnswer once it is paid. */
public class CheckoutAnswer
{
    public int Id { get; set; }
    public int CheckoutAttemptId { get; set; }
    public required string FieldKey { get; set; }
    public required string Label { get; set; }
    public required string Value { get; set; }
}
