using System.Globalization;
using System.Text;
using Application.Common;
using Application.Forms;
using Domain;
using Microsoft.EntityFrameworkCore;

namespace Application.Ledger;

/* The payments ledger. */
public class PaymentService(IAppDbContext db, ICurrentUser me)
{
    public async Task<object> ListAsync(PaymentQuery f, int page, int size)
    {
        var query = Filter(db, f);
        size = Math.Clamp(size, 5, 200);
        var total = await query.CountAsync();
        var paidSum = await query.Where(p => p.Status == PaymentStatus.Paid).SumAsync(p => (decimal?)p.Amount) ?? 0;
        var items = await query.OrderByDescending(p => p.PaidAt).ThenByDescending(p => p.Id)
            .Skip((Math.Max(page, 1) - 1) * size).Take(size)
            .Select(p => new { p.Id, p.CourseId, CourseName = p.Course!.Name, p.CustomerName, p.Email, p.Phone, p.Amount, p.Currency,
                               p.Status, p.Method, p.Reference, p.PaidAt, p.Notes, FromRazorpay = p.GatewayPaymentId != null,
                               Answers = p.Answers.OrderBy(a => a.Id).Select(a => new { Key = a.FieldKey, a.Label, a.Value }) })
            .ToListAsync();
        return new { total, paidSum, items };
    }

    public async Task<FileDownload> ExportAsync(PaymentQuery f, List<int> only)
    {
        var query = Filter(db, f);
        if (only.Count > 0) query = query.Where(p => only.Contains(p.Id)); // the rows ticked in the list
        var rows = await query.OrderByDescending(p => p.PaidAt)
            .Select(p => new { p.Id, p.PaidAt, Course = p.Course!.Name, p.CustomerName, p.Email, p.Phone, p.Amount, p.Currency, p.Status, p.Method, p.Reference, p.Notes,
                               Answers = string.Join("; ", p.Answers.OrderBy(a => a.Id).Select(a => a.Label + ": " + a.Value)) })
            .ToListAsync();
        var csv = new StringBuilder("Id,Paid at (IST),Program,Name,Email,Phone,Amount,Currency,Status,Method,Reference,Notes,Form answers\n");
        foreach (var r in rows)
            csv.AppendJoin(',', new[] { r.Id.ToString(), r.PaidAt.ToOffset(Ist.Offset).ToString("yyyy-MM-dd HH:mm"), r.Course, r.CustomerName, r.Email, r.Phone,
                r.Amount.ToString(CultureInfo.InvariantCulture), r.Currency, r.Status, r.Method, r.Reference, r.Notes, r.Answers }.Select(Csv.Cell)).Append('\n');
        return Csv.File(csv.ToString(), $"payments-{DateTime.UtcNow:yyyyMMdd}.csv");
    }

    // The bulk bar: set the status of, or delete, the ticked payments.
    public async Task<object> BulkAsync(BulkDto dto)
    {
        var ids = (dto.Ids ?? []).Distinct().Take(500).ToList();
        if (ids.Count == 0) throw AppException.Bad("Select at least one payment.");
        var rows = await db.Payments.Where(p => ids.Contains(p.Id)).ToListAsync();
        switch (dto.Action)
        {
            case "delete":
                db.Payments.RemoveRange(rows);
                db.Log(me.Name, "payment.deleted", $"Deleted {rows.Count} payments: {string.Join(", ", rows.Take(5).Select(p => p.CustomerName))}{(rows.Count > 5 ? "…" : "")}");
                break;
            case "status" when PaymentStatus.All.Contains(dto.Status):
                foreach (var p in rows) { p.Status = dto.Status!; p.UpdatedAt = DateTimeOffset.UtcNow; }
                db.Log(me.Name, "payment.updated", $"Set {rows.Count} payments to {dto.Status}");
                break;
            default:
                throw AppException.Bad("Choose an action: delete, or a status.");
        }
        await db.SaveChangesAsync();
        return new { count = rows.Count };
    }

    // One payment, for opening its edit form from a link (#payments/edit/12).
    public async Task<object> GetAsync(int id) =>
        await db.Payments.AsNoTracking().Where(p => p.Id == id)
            .Select(p => new { p.Id, p.CourseId, CourseName = p.Course!.Name, p.CustomerName, p.Email, p.Phone, p.Amount, p.Currency,
                               p.Status, p.Method, p.Reference, p.PaidAt, p.Notes, FromRazorpay = p.GatewayPaymentId != null,
                               Answers = p.Answers.OrderBy(a => a.Id).Select(a => new { Key = a.FieldKey, a.Label, a.Value }) })
            .FirstOrDefaultAsync() ?? throw AppException.NotFound();

    public async Task<int> CreateAsync(PaymentDto dto)
    {
        if (await Validate(dto) is { } error) throw AppException.Bad(error);
        var p = new Payment { CustomerName = "" };
        Apply(p, dto);
        p.Answers = (dto.Answers ?? []).Where(a => !string.IsNullOrWhiteSpace(a.Key) && !string.IsNullOrWhiteSpace(a.Value))
            .Select(a => new PaymentAnswer { FieldKey = a.Key, Label = a.Label, Value = a.Value.Trim()[..Math.Min(2000, a.Value.Trim().Length)] }).ToList();
        db.Payments.Add(p);
        db.Log(me.Name, "payment.created", $"Recorded {p.CustomerName}, {p.Amount:0.##} {p.Currency} ({p.Status})");
        await db.SaveChangesAsync();
        return p.Id;
    }

    public async Task UpdateAsync(int id, PaymentDto dto)
    {
        var p = await db.Payments.Include(x => x.Answers).FirstOrDefaultAsync(x => x.Id == id) ?? throw AppException.NotFound();
        if (await Validate(dto) is { } error) throw AppException.Bad(error);
        var before = $"{p.Amount:0.##} {p.Status}";
        Apply(p, dto);
        if (dto.Answers is not null)
        {
            if (dto.Answers.Any(a => string.IsNullOrWhiteSpace(a.Key) || a.Value is { Length: > 2000 }))
                throw AppException.Bad("An answer is missing its field or is too long.");
            db.PaymentAnswers.RemoveRange(p.Answers);
            p.Answers = dto.Answers.Where(a => !string.IsNullOrWhiteSpace(a.Value))
                .Select(a => new PaymentAnswer { FieldKey = a.Key, Label = a.Label, Value = a.Value.Trim() }).ToList();
        }
        p.UpdatedAt = DateTimeOffset.UtcNow;
        var after = $"{p.Amount:0.##} {p.Status}";
        db.Log(me.Name, "payment.updated", $"Entry #{p.Id} ({p.CustomerName}){(before == after ? "" : $": {before} to {after}")}");
        await db.SaveChangesAsync();
    }

    public async Task DeleteAsync(int id)
    {
        var p = await db.Payments.FindAsync(id) ?? throw AppException.NotFound();
        db.Payments.Remove(p);
        db.Log(me.Name, "payment.deleted", $"Deleted entry #{p.Id}: {p.CustomerName}, {p.Amount:0.##} {p.Currency} ({p.Status})");
        await db.SaveChangesAsync();
    }

    /// <summary>The ledger's filters, shared by Payments, Registrations and Customers.</summary>
    internal static IQueryable<Payment> Filter(IAppDbContext db, PaymentQuery f)
    {
        var query = db.Payments.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(f.Q))
        {
            var like = Search.Pattern(f.Q);
            query = query.Where(p => EF.Functions.Like(p.CustomerName.ToLower(), like) || EF.Functions.Like((p.Email ?? "").ToLower(), like)
                || EF.Functions.Like((p.Phone ?? "").ToLower(), like) || EF.Functions.Like((p.Reference ?? "").ToLower(), like));
        }
        // Exact match for one customer's payments (q would also match a@x.com inside ba@x.com).
        if (!string.IsNullOrWhiteSpace(f.Email)) { var e = f.Email.Trim().ToLower(); query = query.Where(p => p.Email != null && p.Email.ToLower() == e); }
        if (!string.IsNullOrWhiteSpace(f.Status)) query = query.Where(p => p.Status == f.Status);
        if (f.CourseId is not null) query = query.Where(p => p.CourseId == f.CourseId);
        if (f.Unassigned == true) query = query.Where(p => p.CourseId == null);
        if (f.From is not null) { var from = f.From.Value.ToUniversalTime(); query = query.Where(p => p.PaidAt >= from); }
        if (f.To is not null) { var to = f.To.Value.ToUniversalTime(); query = query.Where(p => p.PaidAt < to); }
        return query;
    }

    static void Apply(Payment p, PaymentDto dto)
    {
        p.CourseId = dto.CourseId;
        p.CustomerName = dto.CustomerName!.Trim();
        p.Email = Text.Clean(dto.Email);
        p.Phone = Text.Clean(dto.Phone);
        p.Amount = dto.Amount;
        p.Status = dto.Status!;
        p.Method = Text.Clean(dto.Method);
        p.Reference = Text.Clean(dto.Reference);
        p.PaidAt = (dto.PaidAt ?? DateTimeOffset.UtcNow).ToUniversalTime();
        p.Notes = Text.Clean(dto.Notes);
    }

    async Task<string?> Validate(PaymentDto d)
    {
        if (string.IsNullOrWhiteSpace(d.CustomerName) || d.CustomerName.Length > 160) return "Enter the customer's name.";
        if (d.Amount < 0 || d.Amount > 10_000_000) return "Amount must be between 0 and 1,00,00,000.";
        if (!PaymentStatus.All.Contains(d.Status)) return $"Status must be one of: {string.Join(", ", PaymentStatus.All)}.";
        if (d.Email is { Length: > 0 } && !d.Email.Contains('@')) return "That email address is missing an @.";
        if (!await db.Courses.AnyAsync(c => c.Id == d.CourseId)) return "Choose the program this payment is for.";
        return null;
    }
}

/* Case-insensitive "contains", as Postgres ILIKE '%q%' did: both sides lowercased, % and _ still wildcards. */
static class Search
{
    public static string Pattern(string q) => $"%{q.Trim().ToLower()}%";
}

public record PaymentQuery(string? Q, string? Email, string? Status, int? CourseId, bool? Unassigned, DateTimeOffset? From, DateTimeOffset? To);
public record PaymentDto(int CourseId, string? CustomerName, string? Email, string? Phone, decimal Amount, string? Status, string? Method, string? Reference, DateTimeOffset? PaidAt, string? Notes, List<AnswerDto>? Answers = null);
public record BulkDto(List<int>? Ids, string? Action, string? Status);
