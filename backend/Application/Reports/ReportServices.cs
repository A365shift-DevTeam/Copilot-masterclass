using Application.Common;
using Domain;
using Microsoft.EntityFrameworkCore;

namespace Application.Reports;

/* Activity log: who changed what. */
public class ActivityService(IAppDbContext db)
{
    public async Task<object> ListAsync(string? actor, string? area, int page, int size)
    {
        var query = db.Activity.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(actor)) query = query.Where(a => a.Actor == actor);
        if (!string.IsNullOrWhiteSpace(area)) query = query.Where(a => a.Action.StartsWith(area + "."));
        size = Math.Clamp(size, 10, 200);
        var total = await query.CountAsync();
        var items = await query.OrderByDescending(a => a.At).ThenByDescending(a => a.Id).Skip((Math.Max(page, 1) - 1) * size).Take(size).ToListAsync();
        var actors = await db.Activity.Select(a => a.Actor).Distinct().OrderBy(a => a).ToListAsync();
        return new { total, items, actors };
    }
}

/* The Overview page. */
public class DashboardService(IAppDbContext db)
{
    public async Task<object> GetAsync()
    {
        var ist = Ist.Offset;
        var byStatus = await db.Payments.GroupBy(p => p.Status)
            .Select(g => new { Status = g.Key, Count = g.Count(), Amount = g.Sum(p => p.Amount) }).ToListAsync();
        var byCourse = await db.Payments.Where(p => p.Status == PaymentStatus.Paid).GroupBy(p => p.CourseId)
            .Select(g => new { CourseId = g.Key, Count = g.Count(), Amount = g.Sum(p => p.Amount) }).ToListAsync();

        // Daily paid revenue for the last 30 days, bucketed by the IST calendar day.
        var today = DateTimeOffset.UtcNow.ToOffset(ist).Date;
        var since = new DateTimeOffset(today.AddDays(-29), ist).ToUniversalTime();
        var recentPaid = await db.Payments.Where(p => p.Status == PaymentStatus.Paid && p.PaidAt >= since)
            .Select(p => new { p.PaidAt, p.Amount }).ToListAsync();
        var daily = Enumerable.Range(0, 30).Select(i => today.AddDays(i - 29)).Select(d => new
        {
            Date = d.ToString("yyyy-MM-dd"),
            Amount = recentPaid.Where(p => p.PaidAt.ToOffset(ist).Date == d).Sum(p => p.Amount),
        });

        var recent = await db.Payments.OrderByDescending(p => p.PaidAt).Take(6)
            .Select(p => new { p.Id, p.CustomerName, CourseName = p.Course!.Name, p.Amount, p.Status, p.PaidAt }).ToListAsync();
        var now = DateTimeOffset.UtcNow;
        var all = await db.Courses.AsNoTracking().Include(c => c.Sessions).OrderBy(c => c.SortOrder).ToListAsync();
        var courses = all.Select(c => { var n = CourseSession.Upcoming(c.Sessions, now).FirstOrDefault(); return new { c.Id, c.Key, c.Name, c.Price, n?.StartsAt, n?.EndsAt, n?.Language, c.IsVisible }; }).ToList();
        var sessions = all.Where(c => c.IsVisible).SelectMany(c => CourseSession.Upcoming(c.Sessions, now).Select(x => new { CourseId = c.Id, c.Name, x.StartsAt, x.EndsAt, x.Language }))
            .OrderBy(x => x.StartsAt).Take(12).ToList();
        var unassigned = await db.Payments.CountAsync(p => p.CourseId == null);
        // The live offer (if any) and the next one coming up, for the Overview card.
        var offers = await db.Offers.AsNoTracking().Where(o => !o.IsPaused && o.EndsAt > now).OrderBy(o => o.StartsAt).Take(2)
            .Select(o => new { o.Id, o.Name, o.Badge, o.StartsAt, o.EndsAt, Programs = o.Items.Count }).ToListAsync();
        return new { byStatus, byCourse, daily, recent, courses, sessions, unassigned, offers };
    }
}
