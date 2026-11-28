using Application.Common;
using Application.Gateways;
using Application.Programs;
using Domain;
using Microsoft.EntityFrameworkCore;

namespace Application.Settings;

/* Settings: site links and Razorpay keys, and pulling payments from Razorpay. */
public class SettingsService(IAppDbContext db, ISettingsStore settings, IRazorpayGateway rzp, ICurrentUser me)
{
    public async Task<object> GetAsync()
    {
        var rz = await settings.RazorpayAsync();
        var lastWebhook = await db.Activity.Where(a => a.Actor == "Razorpay").OrderByDescending(a => a.At).Select(a => (DateTimeOffset?)a.At).FirstOrDefaultAsync();
        return new
        {
            whatsappUrl = await settings.GetAsync(SiteSettings.WhatsappUrl),
            // Secrets never leave the server; the admin only sees whether one is set and where from.
            razorpay = new
            {
                keyId = rz.KeyId,
                keyIdSource = rz.KeyIdSource,
                keySecretSet = rz.KeySecret is not null,
                keySecretSource = rz.KeySecretSource,
                webhookSecretSet = rz.WebhookSecret is not null,
                webhookSecretSource = rz.WebhookSecretSource,
                webhookPath = "/api/webhooks/razorpay",
                lastWebhookAt = lastWebhook,
            },
        };
    }

    public async Task SaveSiteAsync(SiteSettingsDto dto)
    {
        var url = dto.WhatsappUrl?.Trim();
        if (!string.IsNullOrEmpty(url) && !CourseService.Https(url))
            throw AppException.Bad("The WhatsApp link must be a full https:// address.");
        await settings.SetAsync(SiteSettings.WhatsappUrl, url);
        db.Log(me.Name, "settings.site", string.IsNullOrEmpty(url) ? "Cleared the WhatsApp community link" : "Changed the WhatsApp community link");
        await db.SaveChangesAsync();
    }

    // Empty fields keep what is saved; `clear` removes the saved keys (falling back to appsettings, if set there).
    public async Task SaveRazorpayAsync(RazorpayKeysDto dto)
    {
        if (dto.Clear)
        {
            foreach (var k in new[] { ISettingsStore.RazorpayKeyId, ISettingsStore.RazorpayKeySecret, ISettingsStore.RazorpayWebhookSecret })
                await settings.SetAsync(k, null);
            db.Log(me.Name, "settings.razorpay", "Removed the saved Razorpay keys");
            await db.SaveChangesAsync();
            return;
        }

        var keyId = dto.KeyId?.Trim();
        if (!string.IsNullOrEmpty(keyId) && !keyId.StartsWith("rzp_"))
            throw AppException.Bad("A Razorpay Key ID starts with rzp_live_ or rzp_test_.");
        var changed = new List<string>();
        if (!string.IsNullOrEmpty(keyId)) { await settings.SetAsync(ISettingsStore.RazorpayKeyId, keyId); changed.Add($"Key ID ({keyId})"); }
        if (!string.IsNullOrWhiteSpace(dto.KeySecret)) { await settings.SetAsync(ISettingsStore.RazorpayKeySecret, dto.KeySecret.Trim(), secret: true); changed.Add("Key Secret"); }
        if (!string.IsNullOrWhiteSpace(dto.WebhookSecret)) { await settings.SetAsync(ISettingsStore.RazorpayWebhookSecret, dto.WebhookSecret.Trim(), secret: true); changed.Add("Webhook Secret"); }
        if (changed.Count == 0) throw AppException.Bad("Enter at least one value to save.");
        db.Log(me.Name, "settings.razorpay", $"Updated Razorpay {string.Join(", ", changed)}");
        await db.SaveChangesAsync();
    }

    public async Task<object> TestRazorpayAsync()
    {
        var rz = await Keys();
        var now = DateTimeOffset.UtcNow;
        var res = await rzp.PaymentsAsync(rz.KeyId!, rz.KeySecret!, now.AddDays(-1), now, 0, 1);
        if (res.Error is not null) throw AppException.Bad(res.Status == 401 ? "Razorpay rejected these keys. Check the Key ID and Key Secret." : res.Error);
        return new { ok = true, mode = rz.KeyId!.StartsWith("rzp_live_") ? "live" : "test" };
    }

    // Pulls payments the webhook may have missed (server down, webhook not set up yet). Safe to run repeatedly.
    public async Task<object> SyncAsync(SyncDto dto)
    {
        var rz = await Keys();
        var days = Math.Clamp(dto.Days, 1, 90);
        var to = DateTimeOffset.UtcNow;
        var from = to.AddDays(-days);
        int created = 0, updated = 0, seen = 0;
        for (var skip = 0; skip < 2000; skip += 100) // shortcut: stops at 2,000 payments per run; narrow the days for more
        {
            var page = await rzp.PaymentsAsync(rz.KeyId!, rz.KeySecret!, from, to, skip);
            if (page.Error is not null)
                throw AppException.Bad(page.Status == 401 ? "Razorpay rejected these keys. Check the Key ID and Key Secret." : page.Error);
            foreach (var e in page.Items)
            {
                seen++;
                // Abandoned checkouts (created/authorized) would sit as Pending forever; record what the webhook records.
                if (e.TryGetProperty("status", out var st) && st.GetString() is not ("captured" or "failed" or "refunded")) continue;
                var outcome = await Razorpay.RecordAsync(db, Razorpay.FromPaymentEntity(e), e.GetRawText(), "Razorpay sync");
                if (outcome == Razorpay.Outcome.Created) created++;
                if (outcome == Razorpay.Outcome.Updated) updated++;
            }
            if (page.Items.Count < 100) break;
        }
        db.Log(me.Name, "razorpay.sync", $"Synced {days} days: {seen} payments read, {created} new, {updated} updated");
        await db.SaveChangesAsync();
        return new { seen, created, updated };
    }

    async Task<RazorpayCreds> Keys()
    {
        var rz = await settings.RazorpayAsync();
        if (rz.KeyId is null || rz.KeySecret is null) throw AppException.Bad("Save the Key ID and Key Secret first.");
        return rz;
    }
}

public record SiteSettingsDto(string? WhatsappUrl);
public record RazorpayKeysDto(string? KeyId, string? KeySecret, string? WebhookSecret, bool Clear);
public record SyncDto(int Days);
