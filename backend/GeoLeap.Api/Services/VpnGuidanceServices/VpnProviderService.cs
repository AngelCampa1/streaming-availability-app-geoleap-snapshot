using Microsoft.EntityFrameworkCore;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using System.Text.Json;

namespace GeoLeap.Api.Services.VpnGuidanceServices;

public class VpnProviderService : IVpnProviderService
{
    private readonly ApplicationDbContext _context;
    private readonly IVpnAnalyticsService _analyticsService;
    private readonly ILogger<VpnProviderService> _logger;

    public VpnProviderService(
        ApplicationDbContext context,
        IVpnAnalyticsService analyticsService,
        ILogger<VpnProviderService> logger)
    {
        _context = context;
        _analyticsService = analyticsService;
        _logger = logger;
    }

    public async Task<VpnProviderDto?> GetVpnProviderAsync(Guid id, CancellationToken cancellationToken = default)
    {
        try
        {
            var provider = await _context.VpnProviders
                .Include(p => p.Ratings)
                .Include(p => p.ServerLocations)
                .Include(p => p.StreamingCompatibilities)
                    .ThenInclude(sc => sc.StreamingService)
                .FirstOrDefaultAsync(p => p.Id == id && p.IsActive, cancellationToken);

            return provider == null ? null : MapToDto(provider);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving VPN provider {ProviderId}", id);
            return null;
        }
    }

    public async Task<IEnumerable<VpnProviderDto>> GetAllVpnProvidersAsync(bool includeInactive = false, CancellationToken cancellationToken = default)
    {
        try
        {
            var query = _context.VpnProviders
                .Include(p => p.Ratings)
                .Include(p => p.ServerLocations)
                .Include(p => p.StreamingCompatibilities)
                    .ThenInclude(sc => sc.StreamingService)
                .AsQueryable();

            if (!includeInactive)
            {
                query = query.Where(p => p.IsActive);
            }

            var providers = await query
                .OrderBy(p => p.DisplayOrder)
                .ThenByDescending(p => p.IsFeatured)
                .ThenByDescending(p => p.OverallRating)
                .ToListAsync(cancellationToken);

            return providers.Select(MapToDto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving all VPN providers");
            return new List<VpnProviderDto>();
        }
    }

    public async Task<IEnumerable<VpnProviderDto>> GetFeaturedVpnProvidersAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var providers = await _context.VpnProviders
                .Include(p => p.Ratings)
                .Include(p => p.ServerLocations)
                .Include(p => p.StreamingCompatibilities)
                    .ThenInclude(sc => sc.StreamingService)
                .Where(p => p.IsActive && p.IsFeatured)
                .OrderBy(p => p.DisplayOrder)
                .ThenByDescending(p => p.OverallRating)
                .ToListAsync(cancellationToken);

            return providers.Select(MapToDto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving featured VPN providers");
            return new List<VpnProviderDto>();
        }
    }

    public async Task<VpnProviderDto?> CreateVpnProviderAsync(VpnProvider provider, CancellationToken cancellationToken = default)
    {
        try
        {
            provider.Id = Guid.NewGuid();
            provider.CreatedAt = DateTime.UtcNow;
            provider.UpdatedAt = DateTime.UtcNow;

            _context.VpnProviders.Add(provider);
            await _context.SaveChangesAsync(cancellationToken);

            return MapToDto(provider);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating VPN provider {ProviderName}", provider.Name);
            return null;
        }
    }

    public async Task<VpnProviderDto?> UpdateVpnProviderAsync(Guid id, VpnProvider provider, CancellationToken cancellationToken = default)
    {
        try
        {
            var existingProvider = await _context.VpnProviders.FindAsync(id, cancellationToken);
            if (existingProvider == null)
            {
                return null;
            }

            // Update properties
            existingProvider.Name = provider.Name;
            existingProvider.Description = provider.Description;
            existingProvider.WebsiteUrl = provider.WebsiteUrl;
            existingProvider.AffiliateUrl = provider.AffiliateUrl;
            existingProvider.LogoUrl = provider.LogoUrl;
            existingProvider.MonthlyPrice = provider.MonthlyPrice;
            existingProvider.AnnualPrice = provider.AnnualPrice;
            existingProvider.HasFreeTrial = provider.HasFreeTrial;
            existingProvider.FreeTrialDays = provider.FreeTrialDays;
            existingProvider.ServerCount = provider.ServerCount;
            existingProvider.CountryCount = provider.CountryCount;
            existingProvider.SupportsP2P = provider.SupportsP2P;
            existingProvider.SupportsStreaming = provider.SupportsStreaming;
            existingProvider.HasKillSwitch = provider.HasKillSwitch;
            existingProvider.HasNoLogsPolicy = provider.HasNoLogsPolicy;
            existingProvider.MaxSimultaneousConnections = provider.MaxSimultaneousConnections;
            existingProvider.SupportedPlatforms = provider.SupportedPlatforms;
            existingProvider.AverageSpeedRating = provider.AverageSpeedRating;
            existingProvider.ReliabilityRating = provider.ReliabilityRating;
            existingProvider.EaseOfUseRating = provider.EaseOfUseRating;
            existingProvider.CustomerSupportRating = provider.CustomerSupportRating;
            existingProvider.IsActive = provider.IsActive;
            existingProvider.IsFeatured = provider.IsFeatured;
            existingProvider.DisplayOrder = provider.DisplayOrder;
            existingProvider.AdminNotes = provider.AdminNotes;
            existingProvider.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync(cancellationToken);

            return MapToDto(existingProvider);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating VPN provider {ProviderId}", id);
            return null;
        }
    }

    public async Task<bool> DeleteVpnProviderAsync(Guid id, CancellationToken cancellationToken = default)
    {
        try
        {
            var provider = await _context.VpnProviders.FindAsync(id, cancellationToken);
            if (provider == null)
            {
                return false;
            }

            // Soft delete by setting IsActive to false
            provider.IsActive = false;
            provider.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync(cancellationToken);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting VPN provider {ProviderId}", id);
            return false;
        }
    }

    public async Task<IEnumerable<VpnProviderDto>> SearchVpnProvidersAsync(
        string? searchTerm = null,
        decimal? maxMonthlyPrice = null,
        decimal? maxAnnualPrice = null,
        bool? supportsStreaming = null,
        bool? supportsP2P = null,
        bool? hasKillSwitch = null,
        bool? hasNoLogsPolicy = null,
        int? minServerCount = null,
        int? minCountryCount = null,
        List<string>? requiredPlatforms = null,
        List<string>? requiredCountries = null,
        double? minRating = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var query = _context.VpnProviders
                .Include(p => p.Ratings)
                .Include(p => p.ServerLocations)
                .Include(p => p.StreamingCompatibilities)
                    .ThenInclude(sc => sc.StreamingService)
                .Where(p => p.IsActive)
                .AsQueryable();

            // Apply search filters
            if (!string.IsNullOrWhiteSpace(searchTerm))
            {
                query = query.Where(p => p.Name.Contains(searchTerm) || p.Description.Contains(searchTerm));
            }

            if (maxMonthlyPrice.HasValue)
            {
                query = query.Where(p => p.MonthlyPrice <= maxMonthlyPrice.Value);
            }

            if (maxAnnualPrice.HasValue)
            {
                query = query.Where(p => p.AnnualPrice <= maxAnnualPrice.Value);
            }

            if (supportsStreaming.HasValue)
            {
                query = query.Where(p => p.SupportsStreaming == supportsStreaming.Value);
            }

            if (supportsP2P.HasValue)
            {
                query = query.Where(p => p.SupportsP2P == supportsP2P.Value);
            }

            if (hasKillSwitch.HasValue)
            {
                query = query.Where(p => p.HasKillSwitch == hasKillSwitch.Value);
            }

            if (hasNoLogsPolicy.HasValue)
            {
                query = query.Where(p => p.HasNoLogsPolicy == hasNoLogsPolicy.Value);
            }

            if (minServerCount.HasValue)
            {
                query = query.Where(p => p.ServerCount >= minServerCount.Value);
            }

            if (minCountryCount.HasValue)
            {
                query = query.Where(p => p.CountryCount >= minCountryCount.Value);
            }

            if (minRating.HasValue)
            {
                query = query.Where(p => p.OverallRating >= minRating.Value);
            }

            // Platform filtering (JSON contains)
            if (requiredPlatforms?.Any() == true)
            {
                foreach (var platform in requiredPlatforms)
                {
                    query = query.Where(p => p.SupportedPlatforms.Contains(platform));
                }
            }

            // Country filtering (server locations)
            if (requiredCountries?.Any() == true)
            {
                query = query.Where(p => p.ServerLocations.Any(sl => requiredCountries.Contains(sl.CountryCode)));
            }

            var providers = await query
                .OrderByDescending(p => p.IsFeatured)
                .ThenByDescending(p => p.OverallRating)
                .ThenBy(p => p.MonthlyPrice)
                .ToListAsync(cancellationToken);

            return providers.Select(MapToDto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error searching VPN providers");
            return new List<VpnProviderDto>();
        }
    }

    public async Task<VpnRecommendationDto> GetRecommendationsAsync(
        Guid? userId = null,
        VpnRecommendationType? recommendationType = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var providers = await _context.VpnProviders
                .Include(p => p.Ratings)
                .Include(p => p.ServerLocations)
                .Include(p => p.StreamingCompatibilities)
                    .ThenInclude(sc => sc.StreamingService)
                .Where(p => p.IsActive)
                .ToListAsync(cancellationToken);

            var recommendedProviders = new List<VpnProvider>();
            var reason = "";
            var criteria = new Dictionary<string, object>();

            switch (recommendationType ?? VpnRecommendationType.BestOverall)
            {
                case VpnRecommendationType.BestOverall:
                    recommendedProviders = providers
                        .OrderByDescending(p => p.OverallRating ?? 0)
                        .ThenByDescending(p => p.TotalRatings)
                        .Take(3)
                        .ToList();
                    reason = "Top-rated VPN providers with highest overall ratings";
                    criteria["sortBy"] = "overallRating";
                    break;

                case VpnRecommendationType.BestValue:
                    recommendedProviders = providers
                        .Where(p => p.OverallRating >= 3.5)
                        .OrderBy(p => p.AnnualPrice / 12) // Monthly equivalent
                        .ThenByDescending(p => p.OverallRating)
                        .Take(3)
                        .ToList();
                    reason = "Best value VPN providers offering great features at affordable prices";
                    criteria["sortBy"] = "priceValue";
                    criteria["minRating"] = 3.5;
                    break;

                case VpnRecommendationType.BestForStreaming:
                    recommendedProviders = providers
                        .Where(p => p.SupportsStreaming)
                        .OrderByDescending(p => p.StreamingCompatibilities.Count(sc => sc.Status == VpnStreamingStatus.WorksReliably))
                        .ThenByDescending(p => p.OverallRating)
                        .Take(3)
                        .ToList();
                    reason = "VPN providers optimized for streaming with proven compatibility";
                    criteria["supportsStreaming"] = true;
                    criteria["sortBy"] = "streamingCompatibility";
                    break;

                case VpnRecommendationType.BestForP2P:
                    recommendedProviders = providers
                        .Where(p => p.SupportsP2P)
                        .OrderByDescending(p => p.ServerLocations.Count(sl => sl.IsP2PFriendly))
                        .ThenByDescending(p => p.OverallRating)
                        .Take(3)
                        .ToList();
                    reason = "VPN providers with excellent P2P/torrenting support";
                    criteria["supportsP2P"] = true;
                    criteria["sortBy"] = "p2pServers";
                    break;

                case VpnRecommendationType.BestForBeginners:
                    recommendedProviders = providers
                        .Where(p => p.EaseOfUseRating >= 4.0)
                        .OrderByDescending(p => p.EaseOfUseRating)
                        .ThenByDescending(p => p.CustomerSupportRating)
                        .Take(3)
                        .ToList();
                    reason = "User-friendly VPN providers perfect for beginners";
                    criteria["minEaseOfUse"] = 4.0;
                    criteria["sortBy"] = "easeOfUse";
                    break;

                case VpnRecommendationType.BestForSecurity:
                    recommendedProviders = providers
                        .Where(p => p.HasKillSwitch && p.HasNoLogsPolicy)
                        .OrderByDescending(p => p.OverallRating)
                        .ThenByDescending(p => p.ReliabilityRating)
                        .Take(3)
                        .ToList();
                    reason = "Most secure VPN providers with kill switch and no-logs policy";
                    criteria["hasKillSwitch"] = true;
                    criteria["hasNoLogsPolicy"] = true;
                    criteria["sortBy"] = "security";
                    break;

                case VpnRecommendationType.BestForSpeed:
                    recommendedProviders = providers
                        .Where(p => p.AverageSpeedRating >= 7.0)
                        .OrderByDescending(p => p.AverageSpeedRating)
                        .ThenByDescending(p => p.ServerCount)
                        .Take(3)
                        .ToList();
                    reason = "Fastest VPN providers with optimal speed performance";
                    criteria["minSpeedRating"] = 7.0;
                    criteria["sortBy"] = "speed";
                    break;
            }

            var confidenceScore = CalculateConfidenceScore(recommendedProviders, recommendationType ?? VpnRecommendationType.BestOverall);

            return new VpnRecommendationDto
            {
                RecommendedProviders = recommendedProviders.Select(MapToDto).ToList(),
                RecommendationReason = reason,
                RecommendationType = recommendationType ?? VpnRecommendationType.BestOverall,
                ConfidenceScore = confidenceScore,
                Criteria = criteria
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating VPN recommendations");
            return new VpnRecommendationDto
            {
                RecommendedProviders = new List<VpnProviderDto>(),
                RecommendationReason = "Error generating recommendations",
                RecommendationType = recommendationType ?? VpnRecommendationType.BestOverall,
                ConfidenceScore = 0,
                Criteria = new Dictionary<string, object>()
            };
        }
    }

    public async Task<VpnRecommendationDto> GetPersonalizedRecommendationsAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // Get user preferences
            var userPreferences = await _context.UserVpnPreferences
                .FirstOrDefaultAsync(p => p.UserId == userId, cancellationToken);

            if (userPreferences == null)
            {
                // Fall back to general recommendations
                return await GetRecommendationsAsync(userId, VpnRecommendationType.BestOverall, cancellationToken);
            }

            var query = _context.VpnProviders
                .Include(p => p.Ratings)
                .Include(p => p.ServerLocations)
                .Include(p => p.StreamingCompatibilities)
                    .ThenInclude(sc => sc.StreamingService)
                .Where(p => p.IsActive)
                .AsQueryable();

            // Apply user preferences as filters
            if (userPreferences.MaxMonthlyBudget.HasValue)
            {
                query = query.Where(p => p.MonthlyPrice <= userPreferences.MaxMonthlyBudget.Value);
            }

            if (userPreferences.NeedsStreamingSupport)
            {
                query = query.Where(p => p.SupportsStreaming);
            }

            if (userPreferences.NeedsP2PSupport)
            {
                query = query.Where(p => p.SupportsP2P);
            }

            if (userPreferences.RequiredSimultaneousConnections.HasValue)
            {
                query = query.Where(p => p.MaxSimultaneousConnections >= userPreferences.RequiredSimultaneousConnections.Value);
            }

            if (userPreferences.MinServerCount.HasValue)
            {
                query = query.Where(p => p.ServerCount >= userPreferences.MinServerCount.Value);
            }

            if (userPreferences.MinCountryCount.HasValue)
            {
                query = query.Where(p => p.CountryCount >= userPreferences.MinCountryCount.Value);
            }

            // Platform requirements
            if (!string.IsNullOrWhiteSpace(userPreferences.RequiredPlatforms))
            {
                var requiredPlatforms = JsonSerializer.Deserialize<List<string>>(userPreferences.RequiredPlatforms) ?? new List<string>();
                foreach (var platform in requiredPlatforms)
                {
                    query = query.Where(p => p.SupportedPlatforms.Contains(platform));
                }
            }

            // Server country preferences
            if (!string.IsNullOrWhiteSpace(userPreferences.PreferredServerCountries))
            {
                var preferredCountries = JsonSerializer.Deserialize<List<string>>(userPreferences.PreferredServerCountries) ?? new List<string>();
                if (preferredCountries.Any())
                {
                    query = query.Where(p => p.ServerLocations.Any(sl => preferredCountries.Contains(sl.CountryCode)));
                }
            }

            var providers = await query
                .OrderByDescending(p => p.OverallRating)
                .ThenBy(p => p.MonthlyPrice)
                .Take(5)
                .ToListAsync(cancellationToken);

            var confidenceScore = providers.Count >= 3 ? 0.9 : providers.Count * 0.3;

            return new VpnRecommendationDto
            {
                RecommendedProviders = providers.Select(MapToDto).ToList(),
                RecommendationReason = "Personalized recommendations based on your preferences",
                RecommendationType = VpnRecommendationType.BestOverall,
                ConfidenceScore = confidenceScore,
                Criteria = new Dictionary<string, object>
                {
                    ["personalized"] = true,
                    ["userId"] = userId,
                    ["hasPreferences"] = true
                }
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating personalized VPN recommendations for user {UserId}", userId);
            return await GetRecommendationsAsync(userId, VpnRecommendationType.BestOverall, cancellationToken);
        }
    }

    public async Task<VpnProviderComparisonDto> CompareProvidersAsync(
        List<Guid> providerIds,
        VpnComparisonCriteria criteria,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var providers = await _context.VpnProviders
                .Include(p => p.Ratings)
                .Include(p => p.ServerLocations)
                .Include(p => p.StreamingCompatibilities)
                    .ThenInclude(sc => sc.StreamingService)
                .Where(p => providerIds.Contains(p.Id) && p.IsActive)
                .ToListAsync(cancellationToken);

            var comparisonMatrix = new Dictionary<string, object>();

            if (criteria.ComparePrice)
            {
                comparisonMatrix["pricing"] = providers.ToDictionary(
                    p => p.Id.ToString(),
                    p => new { monthly = p.MonthlyPrice, annual = p.AnnualPrice, hasFreeTrial = p.HasFreeTrial }
                );
            }

            if (criteria.CompareFeatures)
            {
                comparisonMatrix["features"] = providers.ToDictionary(
                    p => p.Id.ToString(),
                    p => new
                    {
                        supportsStreaming = p.SupportsStreaming,
                        supportsP2P = p.SupportsP2P,
                        hasKillSwitch = p.HasKillSwitch,
                        hasNoLogsPolicy = p.HasNoLogsPolicy,
                        maxConnections = p.MaxSimultaneousConnections
                    }
                );
            }

            if (criteria.CompareRatings)
            {
                comparisonMatrix["ratings"] = providers.ToDictionary(
                    p => p.Id.ToString(),
                    p => new
                    {
                        overall = p.OverallRating,
                        totalRatings = p.TotalRatings,
                        speed = p.AverageSpeedRating,
                        reliability = p.ReliabilityRating,
                        easeOfUse = p.EaseOfUseRating,
                        customerSupport = p.CustomerSupportRating
                    }
                );
            }

            if (criteria.CompareServers)
            {
                comparisonMatrix["servers"] = providers.ToDictionary(
                    p => p.Id.ToString(),
                    p => new
                    {
                        serverCount = p.ServerCount,
                        countryCount = p.CountryCount,
                        locations = p.ServerLocations.Select(sl => new
                        {
                            country = sl.Country,
                            countryCode = sl.CountryCode,
                            city = sl.City,
                            serverCount = sl.ServerCount,
                            streamingOptimized = sl.IsOptimizedForStreaming,
                            p2pFriendly = sl.IsP2PFriendly
                        })
                    }
                );
            }

            if (criteria.CompareStreaming)
            {
                comparisonMatrix["streaming"] = providers.ToDictionary(
                    p => p.Id.ToString(),
                    p => p.StreamingCompatibilities
                        .Where(sc => criteria.SpecificStreamingServices?.Contains(sc.StreamingServiceId) ?? true)
                        .ToDictionary(
                            sc => sc.StreamingService?.Name ?? "Unknown",
                            sc => new
                            {
                                status = sc.Status.ToString(),
                                lastTested = sc.LastTested,
                                notes = sc.Notes,
                                compatibleRegions = !string.IsNullOrWhiteSpace(sc.CompatibleRegions) 
                                    ? JsonSerializer.Deserialize<List<string>>(sc.CompatibleRegions) 
                                    : new List<string>()
                            }
                        )
                );
            }

            return new VpnProviderComparisonDto
            {
                Providers = providers.Select(MapToDto).ToList(),
                ComparisonCriteria = criteria,
                ComparisonMatrix = comparisonMatrix
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error comparing VPN providers");
            return new VpnProviderComparisonDto
            {
                Providers = new List<VpnProviderDto>(),
                ComparisonCriteria = criteria,
                ComparisonMatrix = new Dictionary<string, object>()
            };
        }
    }

    public async Task TrackProviderViewAsync(Guid providerId, Guid? userId = null, string? sessionId = null, CancellationToken cancellationToken = default)
    {
        await _analyticsService.TrackEventAsync(
            VpnGuidanceEventType.ProviderViewed,
            userId,
            providerId,
            sessionId: sessionId,
            cancellationToken: cancellationToken);
    }

    public async Task TrackProviderClickAsync(Guid providerId, Guid? userId = null, string? sessionId = null, bool isAffiliateClick = false, CancellationToken cancellationToken = default)
    {
        var eventType = isAffiliateClick ? VpnGuidanceEventType.AffiliateClicked : VpnGuidanceEventType.ProviderClicked;
        
        await _analyticsService.TrackEventAsync(
            eventType,
            userId,
            providerId,
            additionalData: new Dictionary<string, object> { ["isAffiliateClick"] = isAffiliateClick },
            sessionId: sessionId,
            cancellationToken: cancellationToken);
    }

    private VpnProviderDto MapToDto(VpnProvider provider)
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

    private double CalculateConfidenceScore(List<VpnProvider> providers, VpnRecommendationType recommendationType)
    {
        if (!providers.Any()) return 0;

        var baseScore = Math.Min(providers.Count / 3.0, 1.0); // Full confidence with 3+ recommendations
        
        var avgRatings = providers.Average(p => p.TotalRatings);
        var ratingBonus = Math.Min(avgRatings / 100.0, 0.2); // Up to 0.2 bonus for high rating counts
        
        var avgScore = providers.Average(p => p.OverallRating ?? 0);
        var qualityBonus = Math.Max(0, (avgScore - 3.0) / 2.0 * 0.2); // Up to 0.2 bonus for high-quality recommendations
        
        return Math.Min(baseScore + ratingBonus + qualityBonus, 1.0);
    }
}
