using System.Globalization;
using Application.Ledger;
using Application.Reports;

namespace Api.Endpoints;

/* Payments, Registrations, Customers, the activity log and the Overview. */
static class LedgerEndpoints
{
    public static void MapLedger(this RouteGroupBuilder api)
    {
        api.MapGet("/payments", async (PaymentService payments, string? q, string? email, string? status, int? courseId, bool? unassigned, DateTimeOffset? from, DateTimeOffset? to, int page = 1, int size = 25) =>
            Results.Ok(await payments.ListAsync(new(q, email, status, courseId, unassigned, from, to), page, size)));

        api.MapGet("/payments/export", async (PaymentService payments, string? q, string? email, string? status, int? courseId, bool? unassigned, DateTimeOffset? from, DateTimeOffset? to, string? ids) =>
            File(await payments.ExportAsync(new(q, email, status, courseId, unassigned, from, to), Ids(ids))));

        api.MapPost("/payments/bulk", async (BulkDto dto, PaymentService payments) => Results.Ok(await payments.BulkAsync(dto)));

        api.MapGet("/payments/{id:int}", async (int id, PaymentService payments) => Results.Ok(await payments.GetAsync(id)));

        api.MapPost("/payments", async (PaymentDto dto, PaymentService payments) =>
        {
            var id = await payments.CreateAsync(dto);
            return Results.Created($"/api/payments/{id}", new { Id = id });
        });

        api.MapPut("/payments/{id:int}", async (int id, PaymentDto dto, PaymentService payments) =>
        {
            await payments.UpdateAsync(id, dto);
            return Results.NoContent();
        });

        api.MapDelete("/payments/{id:int}", async (int id, PaymentService payments) =>
        {
            await payments.DeleteAsync(id);
            return Results.NoContent();
        });

        api.MapGet("/registrations", async (RegistrationService registrations, HttpRequest req, int? courseId, string? q, string? status, int page = 1, int size = 25) =>
            Results.Ok(await registrations.ListAsync(RegistrationQuery(req, courseId, q, status), page, size)));

        api.MapDelete("/registrations/attempt/{id:int}", async (int id, RegistrationService registrations) =>
        {
            await registrations.DeleteAttemptAsync(id);
            return Results.NoContent();
        });

        api.MapPost("/registrations/bulk", async (RegBulkDto dto, RegistrationService registrations) => Results.Ok(await registrations.BulkAsync(dto)));

        api.MapGet("/registrations/export", async (RegistrationService registrations, HttpRequest req, int? courseId, string? q, string? status) =>
            File(await registrations.ExportAsync(RegistrationQuery(req, courseId, q, status))));

        api.MapGet("/customers", async (CustomerService customers, string? q, string? status, int? courseId, DateTimeOffset? from, DateTimeOffset? to, int page = 1, int size = 25) =>
            Results.Ok(await customers.ListAsync(new(q, null, status, courseId, null, from, to), page, size)));

        api.MapGet("/activity", async (ActivityService activity, string? actor, string? area, int page = 1, int size = 50) =>
            Results.Ok(await activity.ListAsync(actor, area, page, size)));

        api.MapGet("/dashboard", async (DashboardService dashboard) => Results.Ok(await dashboard.GetAsync()));
    }

    static IResult File(Application.Common.FileDownload f) => Results.File(f.Content, f.ContentType, f.Name);

    static List<int> Ids(string? csv) =>
        (csv ?? "").Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(x => int.TryParse(x, out var n) ? n : 0).Where(n => n > 0).Take(500).ToList();

    // ?from=&to=, field filters as ?f.<fieldKey>=text, and ?ids=P12,R7 for the rows ticked in the list.
    static RegistrationQuery RegistrationQuery(HttpRequest req, int? courseId, string? q, string? status)
    {
        var query = req.Query;
        DateTimeOffset? Day(string k) => DateTimeOffset.TryParse(query[k], CultureInfo.InvariantCulture, DateTimeStyles.None, out var d) ? d : null;
        return new(
            courseId, q, status, Day("from"), Day("to"),
            query.Where(x => x.Key.StartsWith("f.")).Select(x => KeyValuePair.Create(x.Key[2..], x.Value.ToString())).ToList(),
            query["ids"].ToString().Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToHashSet());
    }
}
