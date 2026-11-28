using Application.Common;
using Domain;
using Microsoft.EntityFrameworkCore;

namespace Application.Admins;

/* Signing in and passwords. The API holds the session cookie; these say who may have one. */
public class AuthService(IAppDbContext db, IPasswordHasher hasher, ICurrentUser me)
{
    public async Task<AdminUser> LoginAsync(LoginDto dto)
    {
        var email = (dto.Email ?? "").Trim().ToLowerInvariant();
        var admin = await db.Admins.FirstOrDefaultAsync(a => a.Email == email);
        // Failed logins go to the server log only: the table must not be writable by anyone unauthenticated.
        if (admin is null || !hasher.Verify(admin, dto.Password ?? ""))
            throw new AppException(401, "That email and password don't match an admin account.");

        admin.LastLoginAt = DateTimeOffset.UtcNow;
        db.Log(admin.Email, "auth.login", "Signed in");
        await db.SaveChangesAsync();
        return admin;
    }

    public async Task<object> MeAsync(string? siteUrl)
    {
        var admin = await db.Admins.Where(a => a.Id == me.Id).Select(a => new { a.Id, a.Email, a.Name }).FirstAsync();
        return new { admin.Id, admin.Email, admin.Name, SiteUrl = siteUrl }; // for the "View website" link
    }

    /// <summary>Changes the signed-in admin's password and signs out every other session. Returns the admin to sign in again.</summary>
    public async Task<AdminUser> ChangePasswordAsync(PasswordDto dto)
    {
        var admin = await db.Admins.FindAsync(me.Id) ?? throw new AppException(401);
        if (!hasher.Verify(admin, dto.Current ?? ""))
            throw AppException.Bad("Your current password is incorrect.");
        if ((dto.Next ?? "").Length < 10)
            throw AppException.Bad("Use at least 10 characters for the new password.");
        admin.PasswordHash = hasher.Hash(admin, dto.Next!);
        admin.SecurityStamp = Guid.NewGuid().ToString("N"); // signs out every other session
        db.Log(admin.Email, "auth.password", "Changed their password");
        await db.SaveChangesAsync();
        return admin;
    }
}

/* Team: admin accounts. */
public class AdminService(IAppDbContext db, IPasswordHasher hasher, ICurrentUser me)
{
    public async Task<object> ListAsync() =>
        await db.Admins.AsNoTracking().OrderBy(a => a.CreatedAt).Select(a => new { a.Id, a.Email, a.Name, a.CreatedAt, a.LastLoginAt }).ToListAsync();

    public async Task<int> AddAsync(AdminDto dto)
    {
        var email = (dto.Email ?? "").Trim().ToLowerInvariant();
        if (!email.Contains('@') || email.Length > 200) throw AppException.Bad("Enter the person's email address.");
        if ((dto.Password ?? "").Length < 10) throw AppException.Bad("Give them a starting password of at least 10 characters.");
        if (await db.Admins.AnyAsync(a => a.Email == email)) throw new AppException(409, $"{email} is already an admin.");

        var admin = new AdminUser { Email = email, Name = Text.Clean(dto.Name) };
        admin.PasswordHash = hasher.Hash(admin, dto.Password!);
        db.Admins.Add(admin);
        db.Log(me.Name, "admin.added", $"Added {email} as an admin");
        await db.SaveChangesAsync();
        return admin.Id;
    }

    public async Task RemoveAsync(int id)
    {
        if (id == me.Id) throw AppException.Bad("You can't remove yourself. Ask another admin to do it.");
        var admin = await db.Admins.FindAsync(id) ?? throw AppException.NotFound();
        if (await db.Admins.CountAsync() <= 1) throw AppException.Bad("There must be at least one admin.");
        db.Admins.Remove(admin);
        db.Log(me.Name, "admin.removed", $"Removed {admin.Email}");
        await db.SaveChangesAsync();
    }
}

public record LoginDto(string? Email, string? Password);
public record PasswordDto(string? Current, string? Next);
public record AdminDto(string? Email, string? Name, string? Password);
