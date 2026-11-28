using Application.Website;

namespace Api.Endpoints;

/* The admin's Website page: sections, Publish, Discard, history and Preview. */
static class WebsiteEndpoints
{
    public static void MapWebsite(this RouteGroupBuilder api)
    {
        api.MapGet("/website", async (WebsiteService site) => Results.Ok(await site.GetAsync()));

        api.MapPut("/website/layout", async (LayoutDto dto, WebsiteService site) => Results.Ok(await site.SaveLayoutAsync(dto)));

        api.MapPut("/website/sections/{id}", async (string id, ContentDto dto, WebsiteService site) => Results.Ok(await site.SaveContentAsync(id, dto)));

        api.MapPost("/website/sections", async (AddSectionDto dto, WebsiteService site) => Results.Ok(await site.AddSectionAsync(dto)));

        api.MapDelete("/website/sections/{id}", async (string id, int version, WebsiteService site) => Results.Ok(await site.RemoveSectionAsync(id, new(version))));

        api.MapPost("/website/publish", async (PublishDto dto, WebsiteService site) => Results.Ok(await site.PublishAsync(dto)));

        api.MapPost("/website/discard", async (VersionDto dto, WebsiteService site) => Results.Ok(await site.DiscardAsync(dto)));

        api.MapGet("/website/history", async (WebsiteService site) => Results.Ok(await site.HistoryAsync()));

        api.MapPost("/website/history/{id:int}/restore", async (int id, VersionDto dto, WebsiteService site) => Results.Ok(await site.RestoreAsync(id, dto)));

        api.MapPost("/website/preview", (WebsiteService site) => Results.Ok(site.PreviewToken()));
    }
}
