using Microsoft.EntityFrameworkCore;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using System.Text.Json;

namespace GeoLeap.Api.Services.VpnGuidanceServices;

public class VpnStreamingCompatibilityService : IVpnStreamingCompatibilityService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<VpnStreamingCompatibilityService> _logger;

    public VpnStreamingCompatibilityService(
        ApplicationDbContext context,
        ILogger<VpnStreamingCompatibilityService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<IEnumerable<VpnStreamingCompatibilityDto>> GetProviderStreamingCompatibilityAsync(
        Guid providerId, 
        CancellationToken cancellationToken = default)
    {
        try
        {
            var compatibilities = await _context.VpnStreamingCompatibilities
                .Include(c => c.StreamingService)
                .Where(c => c.VpnProviderId == providerId)
                .ToListAsync(cancellationToken);

            return compatibilities.Select(c => new VpnStreamingCompatibilityDto
            {
                StreamingServiceId = c.StreamingServiceId,
                StreamingServiceName = c.StreamingService?.Name ?? "Unknown",
                Status = c.Status.ToString(),
                Notes = c.Notes,
                LastTested = c.LastTested,
                CompatibleRegions = !string.IsNullOrWhiteSpace(c.CompatibleRegions)
                    ? JsonSerializer.Deserialize<List<string>>(c.CompatibleRegions)
                    : null
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting streaming compatibility for provider {ProviderId}", providerId);
            return new List<VpnStreamingCompatibilityDto>();
        }
    }

    public async Task<VpnStreamingCompatibilityDto?> GetSpecificCompatibilityAsync(
        Guid providerId,
        Guid streamingServiceId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var compatibility = await _context.VpnStreamingCompatibilities
                .Include(c => c.StreamingService)
                .FirstOrDefaultAsync(c => c.VpnProviderId == providerId && c.StreamingServiceId == streamingServiceId, cancellationToken);

            if (compatibility == null) return null;

            return new VpnStreamingCompatibilityDto
            {
                StreamingServiceId = compatibility.StreamingServiceId,
                StreamingServiceName = compatibility.StreamingService?.Name ?? "Unknown",
                Status = compatibility.Status.ToString(),
                Notes = compatibility.Notes,
                LastTested = compatibility.LastTested,
                CompatibleRegions = !string.IsNullOrWhiteSpace(compatibility.CompatibleRegions)
                    ? JsonSerializer.Deserialize<List<string>>(compatibility.CompatibleRegions)
                    : null
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting specific compatibility for provider {ProviderId} and service {StreamingServiceId}", 
                providerId, streamingServiceId);
            return null;
        }
    }

    public async Task<VpnStreamingCompatibilityDto> UpdateCompatibilityAsync(
        Guid providerId,
        Guid streamingServiceId,
        UpdateVpnStreamingCompatibilityDto updateDto,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var compatibility = await _context.VpnStreamingCompatibilities
                .Include(c => c.StreamingService)
                .FirstOrDefaultAsync(c => c.VpnProviderId == providerId && c.StreamingServiceId == streamingServiceId, cancellationToken);

            if (compatibility == null)
            {
                // Create new compatibility record
                compatibility = new VpnStreamingCompatibility
                {
                    Id = Guid.NewGuid(),
                    VpnProviderId = providerId,
                    StreamingServiceId = streamingServiceId,
                    Status = Enum.TryParse<VpnStreamingStatus>(updateDto.Status, out var statusEnum) ? statusEnum : VpnStreamingStatus.NotTested,
                    Notes = updateDto.Notes,
                    CompatibleRegions = updateDto.CompatibleRegions != null ? JsonSerializer.Serialize(updateDto.CompatibleRegions) : null,
                    LastTested = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.VpnStreamingCompatibilities.Add(compatibility);
            }
            else
            {
                // Update existing compatibility
                compatibility.Status = Enum.TryParse<VpnStreamingStatus>(updateDto.Status, out var statusEnum) ? statusEnum : VpnStreamingStatus.NotTested;
                compatibility.Notes = updateDto.Notes;
                compatibility.CompatibleRegions = updateDto.CompatibleRegions != null ? JsonSerializer.Serialize(updateDto.CompatibleRegions) : null;
                compatibility.LastTested = DateTime.UtcNow;
                compatibility.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync(cancellationToken);

            return new VpnStreamingCompatibilityDto
            {
                StreamingServiceId = compatibility.StreamingServiceId,
                StreamingServiceName = compatibility.StreamingService?.Name ?? "Unknown",
                Status = compatibility.Status.ToString(),
                Notes = compatibility.Notes,
                LastTested = compatibility.LastTested,
                CompatibleRegions = !string.IsNullOrWhiteSpace(compatibility.CompatibleRegions)
                    ? JsonSerializer.Deserialize<List<string>>(compatibility.CompatibleRegions)
                    : null
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating compatibility for provider {ProviderId} and service {StreamingServiceId}", 
                providerId, streamingServiceId);
            throw;
        }
    }

    public async Task<IEnumerable<VpnProviderDto>> GetProvidersForStreamingServiceAsync(
        Guid streamingServiceId, 
        VpnStreamingStatus? minStatus = null, 
        CancellationToken cancellationToken = default)
    {
        try
        {
            var query = _context.VpnStreamingCompatibilities
                .Include(c => c.VpnProvider)
                    .ThenInclude(p => p!.Ratings)
                .Include(c => c.VpnProvider)
                    .ThenInclude(p => p!.ServerLocations)
                .Where(c => c.StreamingServiceId == streamingServiceId && c.VpnProvider!.IsActive);

            if (minStatus.HasValue)
            {
                query = query.Where(c => (int)c.Status >= (int)minStatus.Value);
            }

            var compatibilities = await query
                .OrderByDescending(c => c.Status)
                .ThenByDescending(c => c.VpnProvider!.OverallRating)
                .ToListAsync(cancellationToken);

            return compatibilities
                .Where(c => c.VpnProvider != null)
                .Select(c => MapProviderToDto(c.VpnProvider!))
                .Distinct();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting providers for streaming service {StreamingServiceId}", streamingServiceId);
            return new List<VpnProviderDto>();
        }
    }

    public async Task<VpnStreamingCompatibility?> UpdateCompatibilityStatusAsync(
        Guid providerId, 
        Guid streamingServiceId, 
        VpnStreamingStatus status, 
        string? notes = null, 
        CancellationToken cancellationToken = default)
    {
        try
        {
            var compatibility = await _context.VpnStreamingCompatibilities
                .FirstOrDefaultAsync(c => c.VpnProviderId == providerId && c.StreamingServiceId == streamingServiceId, cancellationToken);

            if (compatibility == null)
            {
                // Create new compatibility record
                compatibility = new VpnStreamingCompatibility
                {
                    Id = Guid.NewGuid(),
                    VpnProviderId = providerId,
                    StreamingServiceId = streamingServiceId,
                    Status = status,
                    Notes = notes,
                    LastTested = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.VpnStreamingCompatibilities.Add(compatibility);
            }
            else
            {
                // Update existing compatibility
                compatibility.Status = status;
                compatibility.Notes = notes;
                compatibility.LastTested = DateTime.UtcNow;
                compatibility.UpdatedAt = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync(cancellationToken);
            return compatibility;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating compatibility status for provider {ProviderId} and service {StreamingServiceId}", 
                providerId, streamingServiceId);
            return null;
        }
    }

    public async Task<string> GenerateStreamingDeepLinkAsync(
        Guid streamingServiceId, 
        string contentId, 
        Guid? recommendedVpnId = null, 
        CancellationToken cancellationToken = default)
    {
        try
        {
            var streamingService = await _context.StreamingServices
                .FirstOrDefaultAsync(s => s.Id == streamingServiceId, cancellationToken);

            if (streamingService == null)
            {
                return "#";
            }

            // Basic deep link generation - this would be more sophisticated in a real implementation
            var baseUrl = GetStreamingServiceBaseUrl(streamingService.Name);
            var deepLink = $"{baseUrl}/content/{contentId}";

            // Add VPN recommendation parameter if provided
            if (recommendedVpnId.HasValue)
            {
                deepLink += $"?recommended_vpn={recommendedVpnId}";
            }

            return deepLink;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating deep link for streaming service {StreamingServiceId} and content {ContentId}", 
                streamingServiceId, contentId);
            return "#";
        }
    }

    public async Task<Dictionary<Guid, string>> GenerateMultipleDeepLinksAsync(
        List<Guid> streamingServiceIds, 
        string contentId, 
        CancellationToken cancellationToken = default)
    {
        try
        {
            var result = new Dictionary<Guid, string>();

            var streamingServices = await _context.StreamingServices
                .Where(s => streamingServiceIds.Contains(s.Id))
                .ToListAsync(cancellationToken);

            foreach (var service in streamingServices)
            {
                var baseUrl = GetStreamingServiceBaseUrl(service.Name);
                result[service.Id] = $"{baseUrl}/content/{contentId}";
            }

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating multiple deep links for content {ContentId}", contentId);
            return new Dictionary<Guid, string>();
        }
    }

    private string GetStreamingServiceBaseUrl(string serviceName)
    {
        // Map streaming service names to their base URLs
        // This would typically come from configuration
        return serviceName.ToLowerInvariant() switch
        {
            "netflix" => "https://www.netflix.com",
            "amazon prime video" => "https://www.amazon.com/prime-video",
            "disney+" => "https://www.disneyplus.com",
            "hulu" => "https://www.hulu.com",
            "hbo max" => "https://www.hbomax.com",
            "paramount+" => "https://www.paramountplus.com",
            "apple tv+" => "https://tv.apple.com",
            "peacock" => "https://www.peacocktv.com",
            _ => "#"
        };
    }

    private VpnProviderDto MapProviderToDto(VpnProvider provider)
    {
        var supportedPlatforms = string.IsNullOrWhiteSpace(provider.SupportedPlatforms)
            ? new List<string>()
            : JsonSerializer.Deserialize<List<string>>(provider.SupportedPlatforms) ?? new List<string>();

        return new VpnProviderDto
        {
            Id = provider.Id,
            Name = provider.Name,
            Description = provider.Description,
            WebsiteUrl = provider.WebsiteUrl,
            AffiliateUrl = provider.AffiliateUrl,
            LogoUrl = provider.LogoUrl,
            MonthlyPrice = provider.MonthlyPrice,
            AnnualPrice = provider.AnnualPrice,
            HasFreeTrial = provider.HasFreeTrial,
            FreeTrialDays = provider.FreeTrialDays,
            ServerCount = provider.ServerCount,
            CountryCount = provider.CountryCount,
            SupportsP2P = provider.SupportsP2P,
            SupportsStreaming = provider.SupportsStreaming,
            HasKillSwitch = provider.HasKillSwitch,
            HasNoLogsPolicy = provider.HasNoLogsPolicy,
            MaxSimultaneousConnections = provider.MaxSimultaneousConnections,
            SupportedPlatforms = supportedPlatforms,
            OverallRating = provider.OverallRating,
            TotalRatings = provider.TotalRatings,
            IsFeatured = provider.IsFeatured,
            StreamingCompatibilities = provider.StreamingCompatibilities?.Select(sc => new Models.VpnStreamingCompatibilityDto
            {
                StreamingServiceId = sc.StreamingServiceId,
                StreamingServiceName = sc.StreamingService?.Name ?? "Unknown",
                Status = sc.Status,
                Notes = sc.Notes,
                LastTested = sc.LastTested,
                CompatibleRegions = !string.IsNullOrWhiteSpace(sc.CompatibleRegions)
                    ? JsonSerializer.Deserialize<List<string>>(sc.CompatibleRegions)
                    : null
            }).ToList() ?? new List<Models.VpnStreamingCompatibilityDto>(),
            ServerLocations = provider.ServerLocations?.Select(sl => new VpnServerLocationDto
            {
                Country = sl.Country,
                CountryCode = sl.CountryCode,
                City = sl.City,
                ServerCount = sl.ServerCount,
                IsOptimizedForStreaming = sl.IsOptimizedForStreaming,
                IsP2PFriendly = sl.IsP2PFriendly
            }).ToList() ?? new List<VpnServerLocationDto>()
        };
    }
}