using Application.Admins;
using Application.Gateways;
using Application.Ledger;
using Application.Programs;
using Application.Reports;
using Application.Settings;
using Application.Site;
using Application.Website;
using Microsoft.Extensions.DependencyInjection;

namespace Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplication(this IServiceCollection services) => services
        .AddScoped<PublicSiteService>()
        .AddScoped<CheckoutService>()
        .AddScoped<RazorpayWebhookService>()
        .AddScoped<AuthService>()
        .AddScoped<AdminService>()
        .AddScoped<CourseService>()
        .AddScoped<HeroDateService>()
        .AddScoped<OfferService>()
        .AddScoped<PaymentService>()
        .AddScoped<RegistrationService>()
        .AddScoped<CustomerService>()
        .AddScoped<ActivityService>()
        .AddScoped<DashboardService>()
        .AddScoped<SettingsService>()
        .AddScoped<WebsiteService>();
}
