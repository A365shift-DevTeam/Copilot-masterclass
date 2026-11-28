using Domain;

namespace Api.Tests;

public class SessionTests
{
    static readonly TimeSpan Ist = TimeSpan.FromHours(5.5);
    static CourseSession S(int day, int? fromHour = 9, int? toHour = 13, string? lang = "Tamil") => new()
    {
        StartsAt = new DateTimeOffset(2026, 11, day, fromHour ?? 0, 0, 0, Ist),
        EndsAt = toHour is null ? null : new DateTimeOffset(2026, 11, day, toHour.Value, 0, 0, Ist),
        Language = lang,
    };

    [Fact]
    public void The_site_shows_the_next_date_and_moves_on_once_it_ends()
    {
        var sessions = new[] { S(28), S(21), S(30) }; // out of order on purpose
        var during = new DateTimeOffset(2026, 11, 21, 10, 0, 0, Ist);   // the 21st is running: still shown
        var after = new DateTimeOffset(2026, 11, 21, 13, 30, 0, Ist);   // the 21st is over: the 28th is next
        Assert.Equal(21, CourseSession.Upcoming(sessions, during)[0].StartsAt.Day);
        Assert.Equal([28, 30], CourseSession.Upcoming(sessions, after).Select(x => x.StartsAt.Day));
        Assert.Empty(CourseSession.Upcoming(sessions, new DateTimeOffset(2026, 12, 1, 0, 0, 0, Ist)));
    }

    [Fact]
    public void An_all_day_date_lasts_until_the_next_day()
    {
        var allDay = S(28, fromHour: null, toHour: null);
        Assert.Single(CourseSession.Upcoming([allDay], new DateTimeOffset(2026, 11, 28, 20, 0, 0, Ist)));
        Assert.Empty(CourseSession.Upcoming([allDay], new DateTimeOffset(2026, 11, 29, 0, 30, 0, Ist)));
    }

    [Fact]
    public void Registrations_record_the_date_in_India_time()
    {
        var utc = S(28);
        utc.StartsAt = utc.StartsAt.ToUniversalTime(); // stored as UTC, shown in IST
        Assert.Equal("Sat 28 Nov 2026, 9:00 AM IST, Tamil", utc.Label());
        Assert.Equal("Sat 28 Nov 2026", S(28, null, null, null).Label());
    }
}
