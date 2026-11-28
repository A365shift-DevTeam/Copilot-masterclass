namespace Domain;

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
