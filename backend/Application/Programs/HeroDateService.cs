using Application.Common;
using Domain;
using Microsoft.EntityFrameworkCore;

namespace Application.Programs;

/* Hero section dates: the webinar's dates, one row each.
   The website's hero shows the next one, and every later one as its own row. */
public class HeroDateService(IAppDbContext db, ICurrentUser me)
{
    async Task<Course> Webinar() => await db.Courses.FirstOrDefaultAsync(c => c.Key == "webinar") ?? throw AppException.NotFound();

    public async Task<object> ListAsync()
    {
        var w = await Webinar();
        var dates = await db.Sessions.AsNoTracking().Where(x => x.CourseId == w.Id).OrderBy(x => x.StartsAt).ToListAsync();
        return dates.Select(x => new { x.Id, x.StartsAt, x.EndsAt, x.Language });
    }

    public async Task<int> AddAsync(SessionDto dto)
    {
        var w = await Webinar();
        if (Validate(dto) is { } error) throw AppException.Bad(error);
        var x = new CourseSession { CourseId = w.Id };
        Apply(x, dto);
        db.Sessions.Add(x);
        db.Log(me.Name, "program.updated", $"Added webinar date {x.Label()}");
        await db.SaveChangesAsync();
        return x.Id;
    }

    public async Task UpdateAsync(int id, SessionDto dto)
    {
        var x = await db.Sessions.FindAsync(id) ?? throw AppException.NotFound();
        if (Validate(dto) is { } error) throw AppException.Bad(error);
        var before = x.Label();
        Apply(x, dto);
        db.Log(me.Name, "program.updated", $"Changed webinar date {before} to {x.Label()}");
        await db.SaveChangesAsync();
    }

    public async Task DeleteAsync(int id)
    {
        var x = await db.Sessions.FindAsync(id) ?? throw AppException.NotFound();
        db.Sessions.Remove(x);
        db.Log(me.Name, "program.updated", $"Removed webinar date {x.Label()}");
        await db.SaveChangesAsync();
    }

    static void Apply(CourseSession x, SessionDto dto)
    {
        x.StartsAt = dto.StartsAt.ToUniversalTime(); // Npgsql only writes UTC offsets to timestamptz
        x.EndsAt = dto.EndsAt?.ToUniversalTime();
        x.Language = Text.Clean(dto.Language);
    }

    static string? Validate(SessionDto d)
    {
        if (d.StartsAt == default) return "Choose when the session starts.";
        if (d.EndsAt is not null && d.EndsAt <= d.StartsAt) return "The session must end after it starts.";
        if (d.Language is { Length: > 40 }) return "Keep the language to 40 characters.";
        return null;
    }
}
