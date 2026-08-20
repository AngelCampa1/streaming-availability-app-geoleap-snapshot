using Microsoft.EntityFrameworkCore;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using Microsoft.Extensions.Caching.Distributed;
using System.Text.Json;
using System.Text;

namespace GeoLeap.Api.Services;

public class VpnProviderService : IVpnProviderService
{
    private readonly ApplicationDbContext _context;
    private readonly IDistributedCache _cache;
    private readonly ILogger<VpnProviderService> _logger;
    private const int CacheExpirationMinutes = 30;

    public VpnProviderService(
        ApplicationDbContext context,
        IDistributedCache cache,
        ILogger<VpnProviderService> logger)
    {
        _context = context;
        _cache = cache;
        _logger = logger;
    }

    public async Task<IEnumerable<VpnProviderDto>> GetProvidersAsync(
        bool? featured = null,
        decimal? maxPrice = null,
        bool? supportsStreaming = null,
        string? streamingService = null,
        int page = 1,
        int pageSize = 20)
    {
        var cacheKey = $"vpn-providers-{featured}-{maxPrice}-{supportsStreaming}-{streamingService}-{page}-{pageSize}";
        
        var cachedResult = await GetFromCacheAsync<List<VpnProviderDto>>(cacheKey);
        if (cachedResult != null)
        {
            return cachedResult;
        }

        var query = _context.VpnProviders
            .Include(p => p.StreamingCompatibilities)
                .ThenInclude(sc => sc.StreamingService)
            .Include(p => p.ServerLocations)
            .Where(p => p.IsActive);

        // Apply filters
        if (featured.HasValue)
        {
            query = query.Where(p => p.IsFeatured == featured.Value);
        }

        if (maxPrice.HasValue)
        {
            query = query.Where(p => p.MonthlyPrice <= maxPrice.Value || p.AnnualPrice / 12 <= maxPrice.Value);
        }

        if (supportsStreaming.HasValue && supportsStreaming.Value)
        {
            query = query.Where(p => p.SupportsStreaming);
        }

        if (!string.IsNullOrEmpty(streamingService))
        {
            query = query.Where(p => p.StreamingCompatibilities
                .Any(sc => sc.StreamingService.Name.Contains(streamingService) && 
                          sc.Status == VpnStreamingStatus.WorksReliably));
        }

        // Apply pagination and ordering
        var providers = await query
            .OrderBy(p => p.DisplayOrder)
            .ThenByDescending(p => p.OverallRating)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        var result = providers.Select(MapToDto).ToList();
        
        await SetCacheAsync(cacheKey, result, TimeSpan.FromMinutes(CacheExpirationMinutes));
        return result;
    }

    public async Task<VpnProviderDto?> GetProviderByIdAsync(Guid id)
    {
        var cacheKey = $"vpn-provider-{id}";
        
        var cachedResult = await GetFromCacheAsync<VpnProviderDto>(cacheKey);
        if (cachedResult != null)
        {
            return cachedResult;
        }

        var provider = await _context.VpnProviders
            .Include(p => p.StreamingCompatibilities)
                .ThenInclude(sc => sc.StreamingService)
            .Include(p => p.ServerLocations)
            .Include(p => p.Ratings)
            .FirstOrDefaultAsync(p => p.Id == id && p.IsActive);

        if (provider == null) return null;

        var result = MapToDto(provider);
        
        await SetCacheAsync(cacheKey, result, TimeSpan.FromMinutes(CacheExpirationMinutes));
        return result;
    }

    public async Task<VpnProviderComparisonDto> CompareProvidersAsync(
        List<Guid> providerIds,
        bool comparePrice = true,
        bool compareFeatures = true,
        bool compareRatings = true,
        bool compareStreaming = false)
    {
        var providers = await _context.VpnProviders
            .Include(p => p.StreamingCompatibilities)
                .ThenInclude(sc => sc.StreamingService)
            .Include(p => p.ServerLocations)
            .Where(p => providerIds.Contains(p.Id) && p.IsActive)
            .ToListAsync();

        var comparisonDto = new VpnProviderComparisonDto
        {
            Providers = providers.Select(MapToDto).ToList(),
            ComparisonCriteria = new VpnComparisonCriteria
            {
                ComparePrice = comparePrice,
                CompareFeatures = compareFeatures,
                CompareRatings = compareRatings,
                CompareStreaming = compareStreaming
            }
        };

        // Generate comparison matrix
        var matrix = new Dictionary<string, object>();

        if (comparePrice)
        {
            matrix["price_comparison"] = providers.Select(p => new
            {
                id = p.Id,
                name = p.Name,
                monthly_price = p.MonthlyPrice,
                annual_price = p.AnnualPrice,
                annual_monthly_equivalent = p.AnnualPrice / 12,
                has_free_trial = p.HasFreeTrial,
                free_trial_days = p.FreeTrialDays
            }).ToList();
        }

        if (compareFeatures)
        {
            matrix["features_comparison"] = providers.Select(p => new
            {
                id = p.Id,
                name = p.Name,
                server_count = p.ServerCount,
                country_count = p.CountryCount,
                supports_p2p = p.SupportsP2P,
                supports_streaming = p.SupportsStreaming,
                has_kill_switch = p.HasKillSwitch,
                has_no_logs_policy = p.HasNoLogsPolicy,
                max_simultaneous_connections = p.MaxSimultaneousConnections
            }).ToList();
        }

        if (compareRatings)
        {
            matrix["ratings_comparison"] = providers.Select(p => new
            {
                id = p.Id,
                name = p.Name,
                overall_rating = p.OverallRating,
                total_ratings = p.TotalRatings,
                speed_rating = p.AverageSpeedRating,
                reliability_rating = p.ReliabilityRating,
                ease_of_use_rating = p.EaseOfUseRating,
                customer_support_rating = p.CustomerSupportRating
            }).ToList();
        }

        comparisonDto.ComparisonMatrix = matrix;
        return comparisonDto;
    }

    public async Task RateProviderAsync(Guid userId, Guid providerId, VpnRatingDto ratingDto)
    {
        // Check if user has already rated this provider
        var existingRating = await _context.VpnProviderRatings
            .FirstOrDefaultAsync(r => r.UserId == userId && r.VpnProviderId == providerId);

        if (existingRating != null)
        {
            // Update existing rating
            existingRating.Rating = ratingDto.Rating;
            existingRating.Review = ratingDto.Review;
            existingRating.SpeedRating = ratingDto.SpeedRating;
            existingRating.ReliabilityRating = ratingDto.ReliabilityRating;
            existingRating.EaseOfUseRating = ratingDto.EaseOfUseRating;
            existingRating.CustomerSupportRating = ratingDto.CustomerSupportRating;
            existingRating.ValueForMoneyRating = ratingDto.ValueForMoneyRating;
            existingRating.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            // Create new rating
            var newRating = new VpnProviderRating
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                VpnProviderId = providerId,
                RatingType = ratingDto.RatingType,
                Rating = ratingDto.Rating,
                Review = ratingDto.Review,
                SpeedRating = ratingDto.SpeedRating,
                ReliabilityRating = ratingDto.ReliabilityRating,
                EaseOfUseRating = ratingDto.EaseOfUseRating,
                CustomerSupportRating = ratingDto.CustomerSupportRating,
                ValueForMoneyRating = ratingDto.ValueForMoneyRating,
                CreatedAt = DateTime.UtcNow
            };

            _context.VpnProviderRatings.Add(newRating);
        }

        await _context.SaveChangesAsync();

        // Update provider's overall rating
        await UpdateProviderOverallRatingAsync(providerId);
        
        // Invalidate cache
        await InvalidateProviderCacheAsync(providerId);
    }

    public async Task<IEnumerable<VpnStreamingCompatibilityDto>> GetStreamingCompatibilityAsync(Guid providerId)
    {
        return await _context.VpnStreamingCompatibilities
            .Include(sc => sc.StreamingService)
            .Where(sc => sc.VpnProviderId == providerId)
            .Select(sc => new VpnStreamingCompatibilityDto
            {
                StreamingServiceId = sc.StreamingServiceId,
                StreamingServiceName = sc.StreamingService.Name,
                Status = sc.Status,
                Notes = sc.Notes,
                LastTested = sc.LastTested,
                CompatibleRegions = string.IsNullOrEmpty(sc.CompatibleRegions) 
                    ? new List<string>() 
                    : JsonSerializer.Deserialize<List<string>>(sc.CompatibleRegions, (JsonSerializerOptions?)null) ?? new List<string>()
            })
            .ToListAsync();
    }

    public async Task<IEnumerable<VpnSetupGuideDto>> GetSetupGuidesAsync(Guid? providerId = null, string? platform = null)
    {
        var query = _context.VpnSetupGuides.Where(g => g.IsActive);

        if (providerId.HasValue)
        {
            query = query.Where(g => g.VpnProviderId == providerId.Value);
        }

        if (!string.IsNullOrEmpty(platform))
        {
            query = query.Where(g => g.Platform.Contains(platform));
        }

        return await query
            .Select(g => new VpnSetupGuideDto
            {
                Id = g.Id,
                VpnProviderId = g.VpnProviderId,
                Title = g.Title,
                Platform = g.Platform,
                Content = g.Content,
                StepCount = g.StepCount,
                EstimatedTime = g.EstimatedTime,
                Difficulty = g.Difficulty,
                Prerequisites = g.Prerequisites,
                TroubleshootingTips = g.TroubleshootingTips,
                HelpfulnessRating = g.HelpfulnessRating,
                HelpfulnessVotes = g.HelpfulnessVotes
            })
            .OrderBy(g => g.Difficulty)
            .ThenBy(g => g.Platform)
            .ToListAsync();
    }

    public async Task<IEnumerable<VpnBestPracticeDto>> GetBestPracticesAsync(
        VpnPracticeCategory? category = null,
        VpnPracticeImportance? importance = null)
    {
        var query = _context.VpnBestPractices.Where(bp => bp.IsActive);

        if (category.HasValue)
        {
            query = query.Where(bp => bp.Category == category.Value);
        }

        if (importance.HasValue)
        {
            query = query.Where(bp => bp.ImportanceLevel >= importance.Value);
        }

        return await query
            .Select(bp => new VpnBestPracticeDto
            {
                Id = bp.Id,
                Title = bp.Title,
                Summary = bp.Summary,
                Content = bp.Content,
                Category = bp.Category,
                ImportanceLevel = bp.ImportanceLevel,
                Tags = string.IsNullOrEmpty(bp.Tags) 
                    ? new List<string>() 
                    : JsonSerializer.Deserialize<List<string>>(bp.Tags, (JsonSerializerOptions?)null) ?? new List<string>(),
                DisplayOrder = bp.DisplayOrder,
                HelpfulnessRating = bp.HelpfulnessRating,
                HelpfulnessVotes = bp.HelpfulnessVotes
            })
            .OrderByDescending(bp => bp.ImportanceLevel)
            .ThenBy(bp => bp.DisplayOrder)
            .ToListAsync();
    }

    public async Task<IEnumerable<VpnLegalDisclaimer>> GetLegalDisclaimersAsync(string? countryCode = null)
    {
        var query = _context.VpnLegalDisclaimers.Where(ld => ld.IsActive);

        if (!string.IsNullOrEmpty(countryCode))
        {
            query = query.Where(ld => ld.CountryCode == countryCode || ld.CountryCode == null);
        }

        return await query
            .OrderBy(ld => ld.DisplayOrder)
            .ThenBy(ld => ld.Type)
            .ToListAsync();
    }

    public async Task SaveUserPreferencesAsync(UserVpnPreference preferences)
    {
        var existing = await _context.UserVpnPreferences
            .FirstOrDefaultAsync(p => p.UserId == preferences.UserId);

        if (existing != null)
        {
            // Update existing preferences
            existing.PrefersNoLogsPolicy = preferences.PrefersNoLogsPolicy;
            existing.RequiresKillSwitch = preferences.RequiresKillSwitch;
            existing.NeedsStreamingSupport = preferences.NeedsStreamingSupport;
            existing.NeedsP2PSupport = preferences.NeedsP2PSupport;
            existing.MaxMonthlyBudget = preferences.MaxMonthlyBudget;
            existing.MaxAnnualBudget = preferences.MaxAnnualBudget;
            existing.RequiredPlatforms = preferences.RequiredPlatforms;
            existing.PreferredServerCountries = preferences.PreferredServerCountries;
            existing.MinServerCount = preferences.MinServerCount;
            existing.MinCountryCount = preferences.MinCountryCount;
            existing.RequiredSimultaneousConnections = preferences.RequiredSimultaneousConnections;
            existing.ImportantStreamingServices = preferences.ImportantStreamingServices;
            existing.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            preferences.Id = Guid.NewGuid();
            preferences.CreatedAt = DateTime.UtcNow;
            preferences.UpdatedAt = DateTime.UtcNow;
            _context.UserVpnPreferences.Add(preferences);
        }

        await _context.SaveChangesAsync();
    }

    public async Task<UserVpnPreference?> GetUserPreferencesAsync(Guid userId)
    {
        return await _context.UserVpnPreferences
            .FirstOrDefaultAsync(p => p.UserId == userId);
    }

    public async Task TrackAnalyticsEventAsync(VpnGuidanceAnalytics analytics)
    {
        analytics.Id = Guid.NewGuid();
        _context.VpnGuidanceAnalytics.Add(analytics);
        await _context.SaveChangesAsync();
    }

    public async Task<IEnumerable<VpnProviderDto>> SearchProvidersAsync(string query, int page = 1, int pageSize = 20)
    {
        var searchTerms = query.ToLower().Split(' ', StringSplitOptions.RemoveEmptyEntries);

        var providers = await _context.VpnProviders
            .Include(p => p.StreamingCompatibilities)
                .ThenInclude(sc => sc.StreamingService)
            .Include(p => p.ServerLocations)
            .Where(p => p.IsActive &&
                       (searchTerms.Any(term => p.Name.ToLower().Contains(term)) ||
                        searchTerms.Any(term => p.Description.ToLower().Contains(term))))
            .OrderByDescending(p => p.OverallRating)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync();

        return providers.Select(MapToDto);
    }

    public async Task UpdateProviderEffectivenessAsync(Guid providerId, Guid streamingServiceId, VpnStreamingStatus status, string? notes = null)
    {
        var compatibility = await _context.VpnStreamingCompatibilities
            .FirstOrDefaultAsync(sc => sc.VpnProviderId == providerId && sc.StreamingServiceId == streamingServiceId);

        if (compatibility != null)
        {
            compatibility.Status = status;
            compatibility.Notes = notes;
            compatibility.LastTested = DateTime.UtcNow;
            compatibility.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
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

        await _context.SaveChangesAsync();
        await InvalidateProviderCacheAsync(providerId);
    }

    public async Task<Dictionary<Guid, double>> GetProviderEffectivenessScoresAsync(List<Guid> providerIds)
    {
        var scores = new Dictionary<Guid, double>();

        foreach (var providerId in providerIds)
        {
            var compatibilities = await _context.VpnStreamingCompatibilities
                .Where(sc => sc.VpnProviderId == providerId)
                .ToListAsync();

            if (compatibilities.Any())
            {
                var workingCount = compatibilities.Count(c => c.Status == VpnStreamingStatus.WorksReliably);
                var sometimesCount = compatibilities.Count(c => c.Status == VpnStreamingStatus.WorksSometimes);
                var totalCount = compatibilities.Count;

                // Calculate weighted effectiveness score
                var score = (workingCount * 1.0 + sometimesCount * 0.5) / totalCount;
                scores[providerId] = Math.Round(score * 100, 1); // Convert to percentage
            }
            else
            {
                scores[providerId] = 0;
            }
        }

        return scores;
    }

    private async Task UpdateProviderOverallRatingAsync(Guid providerId)
    {
        var ratings = await _context.VpnProviderRatings
            .Where(r => r.VpnProviderId == providerId)
            .ToListAsync();

        var provider = await _context.VpnProviders.FindAsync(providerId);
        if (provider == null) return;

        if (ratings.Any())
        {
            if (ratings.All(r => r.RatingType == VpnRatingType.ThumbsUpDown))
            {
                // Calculate percentage of thumbs up (convert to 5-star scale)
                var thumbsUpCount = ratings.Count(r => r.Rating == 1);
                var totalCount = ratings.Count;
                provider.OverallRating = Math.Round((double)thumbsUpCount / totalCount * 5, 1);
            }
            else
            {
                // Calculate average of 5-star ratings
                provider.OverallRating = Math.Round(ratings.Average(r => r.Rating), 1);
            }

            provider.TotalRatings = ratings.Count;
        }
        else
        {
            provider.OverallRating = null;
            provider.TotalRatings = 0;
        }

        await _context.SaveChangesAsync();
    }

    private VpnProviderDto MapToDto(VpnProvider provider)
    {
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
            SupportedPlatforms = string.IsNullOrEmpty(provider.SupportedPlatforms) 
                ? new List<string>() 
                : JsonSerializer.Deserialize<List<string>>(provider.SupportedPlatforms) ?? new List<string>(),
            OverallRating = provider.OverallRating,
            TotalRatings = provider.TotalRatings,
            IsFeatured = provider.IsFeatured,
            StreamingCompatibilities = provider.StreamingCompatibilities?.Select(sc => new VpnStreamingCompatibilityDto
            {
                StreamingServiceId = sc.StreamingServiceId,
                StreamingServiceName = sc.StreamingService?.Name ?? "",
                Status = sc.Status,
                Notes = sc.Notes,
                LastTested = sc.LastTested,
                CompatibleRegions = string.IsNullOrEmpty(sc.CompatibleRegions) 
                    ? new List<string>() 
                    : JsonSerializer.Deserialize<List<string>>(sc.CompatibleRegions, (JsonSerializerOptions?)null) ?? new List<string>()
            }).ToList() ?? new List<VpnStreamingCompatibilityDto>(),
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

    private async Task<T?> GetFromCacheAsync<T>(string key) where T : class
    {
        try
        {
            var cached = await _cache.GetAsync(key);
            if (cached != null)
            {
                var json = Encoding.UTF8.GetString(cached);
                return JsonSerializer.Deserialize<T>(json);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error retrieving from cache for key: {Key}", key);
        }
        return null;
    }

    private async Task SetCacheAsync<T>(string key, T value, TimeSpan expiration)
    {
        try
        {
            var json = JsonSerializer.Serialize(value);
            var bytes = Encoding.UTF8.GetBytes(json);
            var options = new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = expiration
            };
            await _cache.SetAsync(key, bytes, options);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error setting cache for key: {Key}", key);
        }
    }

    private async Task InvalidateProviderCacheAsync(Guid providerId)
    {
        try
        {
            await _cache.RemoveAsync($"vpn-provider-{providerId}");
            // Could implement more sophisticated cache invalidation here
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error invalidating cache for provider: {ProviderId}", providerId);
        }
    }
}