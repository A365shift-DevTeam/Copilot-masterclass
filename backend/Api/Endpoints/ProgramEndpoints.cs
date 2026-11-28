using Application.Programs;

namespace Api.Endpoints;

/* Programs, Pricing cards and tabs, registration forms, hero dates and special offers. */
static class ProgramEndpoints
{
    public static void MapPrograms(this RouteGroupBuilder api)
    {
        api.MapGet("/pricing-tabs", async (CourseService courses) => Results.Ok(await courses.PricingTabsAsync()));

        api.MapPut("/pricing-tabs/{id}", async (string id, PricingTabDto dto, CourseService courses) =>
        {
            await courses.RenameTabAsync(id, dto);
            return Results.NoContent();
        });

        api.MapGet("/courses", async (CourseService courses) => Results.Ok(await courses.ListAsync()));

        api.MapPut("/courses/{id:int}", async (int id, CourseDto dto, CourseService courses) => Results.Ok(await courses.UpdateAsync(id, dto)));

        api.MapPost("/courses", async (CourseDto dto, CourseService courses) =>
        {
            var c = await courses.CreateAsync(dto);
            return Results.Created($"/api/courses/{c.Id}", c);
        });

        api.MapDelete("/courses/{id:int}", async (int id, CourseService courses) =>
        {
            await courses.DeleteAsync(id);
            return Results.NoContent();
        });

        api.MapGet("/courses/{id:int}/form", async (int id, CourseService courses) => Results.Ok(await courses.GetFormAsync(id)));

        api.MapPut("/courses/{id:int}/form", async (int id, FormDto dto, CourseService courses) =>
        {
            await courses.SaveFormAsync(id, dto);
            return Results.NoContent();
        });

        api.MapGet("/hero-dates", async (HeroDateService dates) => Results.Ok(await dates.ListAsync()));

        api.MapPost("/hero-dates", async (SessionDto dto, HeroDateService dates) =>
        {
            var id = await dates.AddAsync(dto);
            return Results.Created($"/api/hero-dates/{id}", new { Id = id });
        });

        api.MapPut("/hero-dates/{id:int}", async (int id, SessionDto dto, HeroDateService dates) =>
        {
            await dates.UpdateAsync(id, dto);
            return Results.NoContent();
        });

        api.MapDelete("/hero-dates/{id:int}", async (int id, HeroDateService dates) =>
        {
            await dates.DeleteAsync(id);
            return Results.NoContent();
        });

        api.MapGet("/offers", async (OfferService offers) => Results.Ok(await offers.ListAsync()));

        api.MapPost("/offers", async (OfferDto dto, OfferService offers) =>
        {
            var id = await offers.CreateAsync(dto);
            return Results.Created($"/api/offers/{id}", new { Id = id });
        });

        api.MapPut("/offers/{id:int}", async (int id, OfferDto dto, OfferService offers) =>
        {
            await offers.UpdateAsync(id, dto);
            return Results.NoContent();
        });

        api.MapDelete("/offers/{id:int}", async (int id, OfferService offers) =>
        {
            await offers.DeleteAsync(id);
            return Results.NoContent();
        });
    }
}
