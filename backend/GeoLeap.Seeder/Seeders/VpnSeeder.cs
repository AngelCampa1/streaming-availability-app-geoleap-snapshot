using Bogus;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using GeoLeap.Seeder.Seeders.Base;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace GeoLeap.Seeder.Seeders;

public class VpnSeeder : BaseSeeder<VpnProvider>
{
    public override string Name => "VPN Providers & Data";
    public override int Order => 3;

    public VpnSeeder(ApplicationDbContext context, ILogger<VpnSeeder> logger)
        : base(context, logger)
    {
    }

    public override async Task<bool> IsAlreadySeededAsync(CancellationToken cancellationToken = default)
    {
        return await _context.VpnProviders.AnyAsync(cancellationToken);
    }

    protected override Task<IEnumerable<VpnProvider>> GenerateEntitiesAsync(
        SeederConfiguration config,
        CancellationToken cancellationToken = default)
    {
        var providers = new List<VpnProvider>
        {
            new VpnProvider
            {
                Id = Guid.NewGuid(),
                Name = "NordVPN",
                Description = "Premium VPN service with 5500+ servers in 60 countries",
                MonthlyPrice = 11.99m,
                AnnualPrice = 59.88m,
                ServerCount = 5500,
                CountryCount = 60,
                OverallRating = 4.3,
                TotalRatings = 150,
                HasFreeTrial = true,
                SupportsStreaming = true,
                SupportsP2P = true,
                HasKillSwitch = true,
                HasNoLogsPolicy = true,
                WebsiteUrl = "https://nordvpn.com",
                LogoUrl = "https://images.example.com/nordvpn.png",
                IsFeatured = true,
                IsActive = true,
                CreatedAt = DateTime.UtcNow.AddYears(-5)
            },
            new VpnProvider
            {
                Id = Guid.NewGuid(),
                Name = "ExpressVPN",
                Description = "Fast and reliable VPN with servers in 94 countries",
                MonthlyPrice = 12.95m,
                AnnualPrice = 99.95m,
                ServerCount = 3000,
                CountryCount = 94,
                OverallRating = 4.5,
                TotalRatings = 130,
                HasFreeTrial = true,
                SupportsStreaming = true,
                SupportsP2P = true,
                HasKillSwitch = true,
                HasNoLogsPolicy = true,
                WebsiteUrl = "https://expressvpn.com",
                LogoUrl = "https://images.example.com/expressvpn.png",
                IsFeatured = true,
                IsActive = true,
                CreatedAt = DateTime.UtcNow.AddYears(-6)
            },
            new VpnProvider
            {
                Id = Guid.NewGuid(),
                Name = "Surfshark",
                Description = "Affordable VPN with unlimited devices and 3200+ servers",
                MonthlyPrice = 12.95m,
                AnnualPrice = 47.88m,
                ServerCount = 3200,
                CountryCount = 100,
                OverallRating = 4.2,
                TotalRatings = 120,
                HasFreeTrial = true,
                SupportsStreaming = true,
                SupportsP2P = true,
                HasKillSwitch = true,
                HasNoLogsPolicy = true,
                WebsiteUrl = "https://surfshark.com",
                LogoUrl = "https://images.example.com/surfshark.png",
                IsFeatured = true,
                IsActive = true,
                CreatedAt = DateTime.UtcNow.AddYears(-4)
            },
            new VpnProvider
            {
                Id = Guid.NewGuid(),
                Name = "CyberGhost",
                Description = "User-friendly VPN with 9000+ servers optimized for streaming",
                MonthlyPrice = 11.99m,
                AnnualPrice = 47.64m,
                ServerCount = 9000,
                CountryCount = 91,
                OverallRating = 4.1,
                TotalRatings = 100,
                HasFreeTrial = true,
                SupportsStreaming = true,
                SupportsP2P = true,
                HasKillSwitch = true,
                HasNoLogsPolicy = true,
                WebsiteUrl = "https://cyberghostvpn.com",
                LogoUrl = "https://images.example.com/cyberghost.png",
                IsFeatured = false,
                IsActive = true,
                CreatedAt = DateTime.UtcNow.AddYears(-7)
            }
        };

        _logger.LogInformation("Generated {Count} VPN providers", providers.Count);

        return Task.FromResult<IEnumerable<VpnProvider>>(providers);
    }
}
