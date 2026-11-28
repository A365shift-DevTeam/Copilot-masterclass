using Application.Settings;

namespace Api.Endpoints;

/* Settings: site links, Razorpay keys, and pulling payments from Razorpay. */
static class SettingsEndpoints
{
    public static void MapSettings(this RouteGroupBuilder api)
    {
        api.MapGet("/settings", async (SettingsService settings) => Results.Ok(await settings.GetAsync()));

        api.MapPut("/settings/site", async (SiteSettingsDto dto, SettingsService settings) =>
        {
            await settings.SaveSiteAsync(dto);
            return Results.NoContent();
        });

        api.MapPut("/settings/razorpay", async (RazorpayKeysDto dto, SettingsService settings) =>
        {
            await settings.SaveRazorpayAsync(dto);
            return Results.NoContent();
        });

        api.MapPost("/razorpay/test", async (SettingsService settings) => Results.Ok(await settings.TestRazorpayAsync()));

        api.MapPost("/razorpay/sync", async (SyncDto dto, SettingsService settings) => Results.Ok(await settings.SyncAsync(dto)));
    }
}
