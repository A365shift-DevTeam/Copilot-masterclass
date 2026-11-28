using System.Globalization;
using System.Text;
using Application.Common;
using Application.Forms;
using Domain;
using Microsoft.EntityFrameworkCore;

namespace Application.Ledger;

/* Registrations: everyone who filled in a program's form. Payers (one row per payment) and people
   who filled the form but never paid ("Registered"), with a column per form field. */
public class RegistrationService(IAppDbContext db, ICurrentUser me)
{
    public const string Registered = "Registered";

    public async Task<object> ListAsync(RegistrationQuery query, int page, int size)
    {
        var (columns, rows) = await Find(query);
        size = Math.Clamp(size, 10, 200);
        var counts = rows.GroupBy(r => r.Status).ToDictionary(g => g.Key, g => g.Count());
        return new { columns, total = rows.Count, counts, rows = rows.Skip((Math.Max(page, 1) - 1) * size).Take(size) };
    }

    public async Task<FileDownload> ExportAsync(RegistrationQuery query)
    {
        var (columns, rows) = await Find(query);
        // Name, email and phone are their own columns, so rows from before a form existed still fill them.
        var extra = columns.Where(c => c.Key is not ("name" or "email" or "phone")).ToList();
        var csv = new StringBuilder(string.Join(",", new[] { "Ref", "Date (IST)", "Program", "Status", "Amount", "Name", "Email", "Phone" }.Concat(extra.Select(c => c.Label)).Select(Csv.Cell)) + "\n");
        foreach (var r in rows)
        {
            var cells = new[] { r.Id, r.At.ToOffset(Ist.Offset).ToString("yyyy-MM-dd HH:mm"), r.Program, r.Status == Registered ? "Registered (not paid)" : r.Status,
                    r.Amount.ToString(CultureInfo.InvariantCulture), r.CustomerName, r.Email, r.Phone }
                .Concat(extra.Select(c => r.Answers.FirstOrDefault(a => a.Key == c.Key)?.Value));
            csv.AppendJoin(',', cells.Select(Csv.Cell)).Append('\n');
        }
        var name = query.CourseId is null ? "all-programs" : await db.Courses.Where(c => c.Id == query.CourseId).Select(c => c.Key).FirstOrDefaultAsync() ?? "program";
        return Csv.File(csv.ToString(), $"registrations-{name}-{DateTime.UtcNow:yyyyMMdd}.csv");
    }

    // Removes an unpaid registration ("R7"): every unpaid try that person made for that program,
    // so an older try doesn't take its place in the list.
    public async Task DeleteAttemptAsync(int id)
    {
        var a = await db.CheckoutAttempts.FindAsync(id) ?? throw AppException.NotFound();
        var email = a.Email?.ToLower();
        var tries = await db.CheckoutAttempts.Where(t => t.CourseId == a.CourseId && !db.Payments.Any(p => p.GatewayOrderId == t.OrderId)
                && (t.Id == id || (email != null && t.Email != null && t.Email.ToLower() == email)))
            .ToListAsync();
        db.CheckoutAttempts.RemoveRange(tries);
        db.Log(me.Name, "registration.deleted", $"Deleted the unpaid registration of {a.Name}{(a.Email is null ? "" : $" ({a.Email})")}");
        await db.SaveChangesAsync();
    }

    // The bulk bar in Registrations: delete ticked rows ("P12" payments, "R7" unpaid registrations), or set a status on the payments among them.
    public async Task<object> BulkAsync(RegBulkDto dto)
    {
        var ids = (dto.Ids ?? []).Distinct().Take(500).ToList();
        var payIds = ids.Where(i => i.StartsWith('P') && int.TryParse(i[1..], out _)).Select(i => int.Parse(i[1..])).ToList();
        var tryIds = ids.Where(i => i.StartsWith('R') && int.TryParse(i[1..], out _)).Select(i => int.Parse(i[1..])).ToList();
        if (payIds.Count + tryIds.Count == 0) throw AppException.Bad("Select at least one row.");
        var payments = await db.Payments.Where(p => payIds.Contains(p.Id)).ToListAsync();
        if (dto.Action == "status")
        {
            if (!PaymentStatus.All.Contains(dto.Status)) throw AppException.Bad("Choose a status.");
            foreach (var p in payments) { p.Status = dto.Status!; p.UpdatedAt = DateTimeOffset.UtcNow; }
            db.Log(me.Name, "payment.updated", $"Set {payments.Count} payments to {dto.Status} (from Registrations)");
            await db.SaveChangesAsync();
            return new { count = payments.Count, skipped = tryIds.Count }; // unpaid registrations have no payment status
        }
        if (dto.Action != "delete") throw AppException.Bad("Choose an action.");
        // An unpaid row stands for every unpaid try by that person for that program; remove them all.
        var picked = await db.CheckoutAttempts.Where(t => tryIds.Contains(t.Id)).Select(t => new { t.CourseId, Email = t.Email == null ? null : t.Email.ToLower(), t.Id }).ToListAsync();
        var emails = picked.Where(t => t.Email != null).Select(t => t.Email!).ToList();
        var courseIds = picked.Select(t => t.CourseId).Distinct().ToList();
        var tries = await db.CheckoutAttempts.Where(t => tryIds.Contains(t.Id)
                || (courseIds.Contains(t.CourseId) && t.Email != null && emails.Contains(t.Email.ToLower()) && !db.Payments.Any(p => p.GatewayOrderId == t.OrderId)))
            .ToListAsync();
        db.Payments.RemoveRange(payments);
        db.CheckoutAttempts.RemoveRange(tries);
        db.Log(me.Name, "registration.deleted", $"Deleted {payments.Count} payments and {picked.Count} unpaid registrations");
        await db.SaveChangesAsync();
        return new { count = payments.Count + picked.Count };
    }

    // The current form's fields, then any older field only past answers still have; and the matching rows.
    // Field filters match answers containing that text.
    // shortcut: payments and unpaid attempts are merged and paged in memory, fine to tens of thousands per program.
    // CourseId null = every program: then the rows carry their program and the question columns
    // (which differ per program) are left out.
    async Task<(List<FieldDto> Columns, List<RegRow> Rows)> Find(RegistrationQuery f)
    {
        var columns = new List<FieldDto>();
        if (f.CourseId is { } courseId)
        {
            var fields = await db.FormFields.AsNoTracking().Where(x => x.CourseId == courseId).OrderBy(x => x.SortOrder).ToListAsync();
            columns = fields.Select(Checkout.ToDto).ToList();
            var paidKeys = await db.PaymentAnswers.AsNoTracking().Where(a => db.Payments.Any(p => p.Id == a.PaymentId && p.CourseId == courseId))
                .GroupBy(a => a.FieldKey).Select(g => new { Key = g.Key, Label = g.Max(a => a.Label) }).ToListAsync();
            var triedKeys = await db.CheckoutAttempts.AsNoTracking().Where(t => t.CourseId == courseId).SelectMany(t => t.Answers)
                .GroupBy(a => a.FieldKey).Select(g => new { Key = g.Key, Label = g.Max(a => a.Label) }).ToListAsync();
            foreach (var o in paidKeys.Concat(triedKeys))
                if (columns.All(c => c.Key != o.Key)) columns.Add(o.Key == "session" ? new FieldDto("session", "Session", "text") : new FieldDto(o.Key, o.Label + " (removed)", "text"));
        }

        var filters = f.Fields.Where(x => !string.IsNullOrWhiteSpace(x.Value)).Select(x => (x.Key, Like: Search.Pattern(x.Value))).ToList();
        var rows = new List<RegRow>();

        if (f.Status != Registered)
        {
            var query = PaymentService.Filter(db, new(f.Q, null, string.IsNullOrEmpty(f.Status) ? null : f.Status, f.CourseId, null, f.From, f.To));
            foreach (var (key, like) in filters) query = query.Where(p => p.Answers.Any(a => a.FieldKey == key && EF.Functions.Like(a.Value.ToLower(), like)));
            rows.AddRange((await query.Select(p => new { p.Id, p.CustomerName, p.Email, p.Phone, p.Amount, p.Status, p.PaidAt,
                    Program = p.Course == null ? null : p.Course.CardTitle ?? p.Course.Name,
                    Answers = p.Answers.Select(a => new RegAnswer(a.FieldKey, a.Value)).ToList() }).ToListAsync())
                .Select(p => new RegRow($"P{p.Id}", p.Id, p.Program, p.CustomerName, p.Email, p.Phone, p.Amount, p.Status, p.PaidAt, p.Answers)));
        }

        if (string.IsNullOrEmpty(f.Status) || f.Status == Registered)
        {
            // Filled in the form, but no payment came back for that order (or the card pays by link).
            var tries = db.CheckoutAttempts.AsNoTracking().Where(t => (f.CourseId == null || t.CourseId == f.CourseId) && !db.Payments.Any(p => p.GatewayOrderId == t.OrderId));
            if (f.From is not null) { var from = f.From.Value.ToUniversalTime(); tries = tries.Where(t => t.CreatedAt >= from); }
            if (f.To is not null) { var to = f.To.Value.ToUniversalTime(); tries = tries.Where(t => t.CreatedAt < to); }
            if (!string.IsNullOrWhiteSpace(f.Q))
            {
                var like = Search.Pattern(f.Q);
                tries = tries.Where(t => EF.Functions.Like(t.Name.ToLower(), like) || EF.Functions.Like((t.Email ?? "").ToLower(), like)
                    || EF.Functions.Like((t.Phone ?? "").ToLower(), like) || EF.Functions.Like(t.OrderId.ToLower(), like));
            }
            foreach (var (key, like) in filters) tries = tries.Where(t => t.Answers.Any(a => a.FieldKey == key && EF.Functions.Like(a.Value.ToLower(), like)));
            var attempts = await tries.OrderByDescending(t => t.CreatedAt)
                .Select(t => new { t.Id, t.CourseId, t.Name, t.Email, t.Phone, t.Amount, t.CreatedAt,
                    Program = db.Courses.Where(c => c.Id == t.CourseId).Select(c => c.CardTitle ?? c.Name).FirstOrDefault(),
                    Answers = t.Answers.Select(a => new RegAnswer(a.FieldKey, a.Value)).ToList() })
                .ToListAsync();
            // Someone who paid for this program shows as that payment, not also as an unpaid try;
            // and someone who tried several times shows once, with their latest details.
            // Per program: paying for one program doesn't hide an unpaid registration for another.
            var payers = (await db.Payments.Where(p => (f.CourseId == null || p.CourseId == f.CourseId) && p.CourseId != null && p.Email != null)
                .Select(p => new { p.CourseId, Email = p.Email!.ToLower() }).Distinct().ToListAsync()).Select(x => $"{x.CourseId}|{x.Email}").ToHashSet();
            rows.AddRange(attempts.Where(t => t.Email is null || !payers.Contains($"{t.CourseId}|{t.Email.ToLower()}"))
                .GroupBy(t => (t.CourseId, Who: t.Email?.ToLower() ?? t.Phone ?? t.Name.ToLower())).Select(g => g.First())
                .Select(t => new RegRow($"R{t.Id}", null, t.Program, t.Name, t.Email, t.Phone, t.Amount, Registered, t.CreatedAt, t.Answers)));
        }
        // Only the rows ticked in the list (the export of a selection).
        if (f.Ids.Count > 0) rows = rows.Where(r => f.Ids.Contains(r.Id)).ToList();
        return (columns, rows.OrderByDescending(r => r.At).ToList());
    }
}

/// <param name="Fields">Field filters: answers to that field containing the text.</param>
/// <param name="Ids">Only these rows ("P12", "R7"), when any.</param>
public record RegistrationQuery(int? CourseId, string? Q, string? Status, DateTimeOffset? From, DateTimeOffset? To,
    IReadOnlyList<KeyValuePair<string, string>> Fields, IReadOnlySet<string> Ids);
public record RegBulkDto(List<string>? Ids, string? Action, string? Status);
// A row in Registrations: a payment (Id "P12") or an unpaid form fill (Id "R7", Status "Registered").
public record RegRow(string Id, int? PaymentId, string? Program, string CustomerName, string? Email, string? Phone, decimal Amount, string Status, DateTimeOffset At, List<RegAnswer> Answers);
public record RegAnswer(string Key, string Value);
