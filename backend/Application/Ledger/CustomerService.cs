using Application.Common;
using Domain;
using Microsoft.EntityFrameworkCore;

namespace Application.Ledger;

/* Customers: everyone in the ledger, one row per person. */
public class CustomerService(IAppDbContext db)
{
    public async Task<object> ListAsync(PaymentQuery f, int page, int size)
    {
        // shortcut: groups in memory, fine to tens of thousands of payments; move to a SQL GROUP BY past that.
        var rows = await PaymentService.Filter(db, f)
            .Select(p => new { p.CustomerName, p.Email, p.Phone, p.Amount, p.Status, p.PaidAt, CourseName = p.Course!.Name })
            .ToListAsync();
        var people = rows
            .GroupBy(p => p.Email?.ToLowerInvariant() ?? p.Phone ?? p.CustomerName.ToLowerInvariant())
            .Select(g => new
            {
                Key = g.Key,
                Name = g.OrderByDescending(p => p.PaidAt).First().CustomerName,
                Email = g.Select(p => p.Email).FirstOrDefault(e => e != null),
                Phone = g.Select(p => p.Phone).FirstOrDefault(e => e != null),
                // Counts and programs from Paid rows only: a failed attempt followed by a retry is one purchase.
                Payments = g.Count(p => p.Status == PaymentStatus.Paid),
                Paid = g.Where(p => p.Status == PaymentStatus.Paid).Sum(p => p.Amount),
                Programs = g.Where(p => p.CourseName != null && p.Status == PaymentStatus.Paid).Select(p => p.CourseName!).Distinct().ToList(),
                LastPaidAt = g.Max(p => p.PaidAt),
            })
            .OrderByDescending(c => c.LastPaidAt)
            .ToList();
        size = Math.Clamp(size, 5, 200);
        return new
        {
            total = people.Count,
            repeat = people.Count(c => c.Payments > 1),
            items = people.Skip((Math.Max(page, 1) - 1) * size).Take(size),
        };
    }
}
