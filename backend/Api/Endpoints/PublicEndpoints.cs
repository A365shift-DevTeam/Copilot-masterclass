using System.Text;
using System.Text.Json;
using Application.Forms;
using Application.Gateways;
using Application.Site;

namespace Api.Endpoints;

/* Read and called by the landing site, and by Razorpay. No sign-in. */
static class PublicEndpoints
{
    public static void MapPublic(this RouteGroupBuilder api)
    {
        // Not cached: the site is meant to show an admin change, or an offer starting or ending, on the next load.
        api.MapGet("/public/site", async (PublicSiteService site, HttpContext http) =>
        {
            http.Response.Headers.CacheControl = "no-store";
            return Results.Ok(await site.GetAsync());
        }).AllowAnonymous().RequireCors("site");

        api.MapPost("/public/checkout/{key}", async (string key, HttpRequest req, CheckoutService checkout) =>
        {
            if (req.ContentLength is > 16_384) return Results.StatusCode(413);
            CheckoutRequest? body;
            try { body = await req.ReadFromJsonAsync<CheckoutRequest>(Checkout.Json); }
            catch (JsonException) { return Results.Problem("The form couldn't be read. Please try again.", statusCode: 400); }
            return Results.Ok(await checkout.StartAsync(key, body));
        }).AllowAnonymous().RequireCors("site").RequireRateLimiting("checkout");

        api.MapPost("/public/checkout/verify", async (VerifyRequest v, CheckoutService checkout) => Results.Ok(await checkout.VerifyAsync(v)))
            .AllowAnonymous().RequireCors("site").RequireRateLimiting("verify");

        // Razorpay signs the raw body, so it is read as text.
        api.MapPost("/webhooks/razorpay", async (HttpRequest req, RazorpayWebhookService webhook) =>
        {
            using var reader = new StreamReader(req.Body, Encoding.UTF8);
            await webhook.HandleAsync(await reader.ReadToEndAsync(), req.Headers["X-Razorpay-Signature"]);
            return Results.Ok(); // any 2xx stops Razorpay retrying
        }).AllowAnonymous();
    }
}
