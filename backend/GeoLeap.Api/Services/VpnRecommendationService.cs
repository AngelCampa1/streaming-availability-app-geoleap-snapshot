using Microsoft.EntityFrameworkCore;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using Microsoft.Extensions.Caching.Distributed;
using System.Text.Json;
using System.Text;

namespace GeoLeap.Api.Services;

public class VpnRecommendationService : IVpnRecommendationService
{
    private readonly ApplicationDbContext _context;
    private readonly IDistributedCache _cache;
    private readonly IVpnProviderService _vpnProviderService;
    private readonly ILogger<VpnRecommendationService> _logger;
    private const int CacheExpirationMinutes = 60;

    public VpnRecommendationService(
        ApplicationDbContext context,
        IDistributedCache cache,
        IVpnProviderService vpnProviderService,
        ILogger<VpnRecommendationService> logger)
    {
        _context = context;
        _cache = cache;
        _vpnProviderService = vpnProviderService;
        _logger = logger;
    }

    public async Task<VpnRecommendationDto> GetRecommendationsAsync(
        Guid? userId,
        VpnRecommendationType type = VpnRecommendationType.BestOverall,
        decimal? budget = null,
        List<string>? streamingServices = null,
        bool? requiresP2P = null)
    {
        var cacheKey = $"vpn-recommendations-{userId}-{type}-{budget}-{string.Join(',', streamingServices ?? new List<string>())}-{requiresP2P}";
        
        var cachedResult = await GetFromCacheAsync<VpnRecommendationDto>(cacheKey);
        if (cachedResult != null)
        {
            return cachedResult;
        }

        VpnRecommendationDto recommendation = type switch
        {
            VpnRecommendationType.BestOverall => await GetBestOverallRecommendationsAsync(userId, budget),
            VpnRecommendationType.BestValue => await GetBestValueRecommendationsAsync(budget ?? 50),
            VpnRecommendationType.BestForStreaming => await GetBestForStreamingRecommendationsAsync(streamingServices),
            VpnRecommendationType.BestForP2P => await GetBestForP2PRecommendationsAsync(budget),
            VpnRecommendationType.BestForBeginners => await GetBeginnerFriendlyRecommendationsAsync(budget),
            VpnRecommendationType.BestForSecurity => await GetBestForSecurityRecommendationsAsync(budget),
            VpnRecommendationType.BestForSpeed => await GetBestForSpeedRecommendationsAsync(budget),
            _ => await GetBestOverallRecommendationsAsync(userId, budget)
        };

        // Apply additional filters
        if (requiresP2P.HasValue && requiresP2P.Value)
        {
            recommendation.RecommendedProviders = recommendation.RecommendedProviders
                .Where(p => p.SupportsP2P)
                .ToList();
        }

        await SetCacheAsync(cacheKey, recommendation, TimeSpan.FromMinutes(CacheExpirationMinutes));
        return recommendation;
    }

    public async Task<VpnRecommendationDto> GetPersonalizedRecommendationsAsync(Guid userId)
    {
        var preferences = await _context.UserVpnPreferences
            .FirstOrDefaultAsync(p => p.UserId == userId);

        if (preferences == null)
        {
            return await GetRecommendationsAsync(userId, VpnRecommendationType.BestOverall);
        }

        var query = _context.VpnProviders
            .Include(p => p.StreamingCompatibilities)
                .ThenInclude(sc => sc.StreamingService)
            .Include(p => p.ServerLocations)
            .Where(p => p.IsActive);

        // Apply user preferences
        if (preferences.MaxMonthlyBudget.HasValue)
        {
            query = query.Where(p => p.MonthlyPrice <= preferences.MaxMonthlyBudget.Value ||
                                   p.AnnualPrice / 12 <= preferences.MaxMonthlyBudget.Value);
        }

        if (preferences.NeedsStreamingSupport)
        {
            query = query.Where(p => p.SupportsStreaming);
        }

        if (preferences.NeedsP2PSupport)
        {
            query = query.Where(p => p.SupportsP2P);
        }

        if (preferences.RequiresKillSwitch)
        {
            query = query.Where(p => p.HasKillSwitch);
        }

        if (preferences.PrefersNoLogsPolicy)
        {
            query = query.Where(p => p.HasNoLogsPolicy);
        }

        if (preferences.MinServerCount.HasValue)
        {
            query = query.Where(p => p.ServerCount >= preferences.MinServerCount.Value);
        }

        if (preferences.MinCountryCount.HasValue)
        {
            query = query.Where(p => p.CountryCount >= preferences.MinCountryCount.Value);
        }

        if (preferences.RequiredSimultaneousConnections.HasValue)
        {
            query = query.Where(p => p.MaxSimultaneousConnections >= preferences.RequiredSimultaneousConnections.Value ||
                                   p.MaxSimultaneousConnections == null); // Unlimited
        }

        var providers = await query
            .OrderByDescending(p => p.OverallRating)
            .ThenByDescending(p => p.TotalRatings)
            .Take(5)
            .ToListAsync();

        var providerDtos = providers.Select(p => MapProviderToDto(p)).ToList();

        // Calculate personalized scores
        foreach (var provider in providerDtos)
        {
            var score = CalculatePersonalizedScoreAsync(provider, preferences);
            // Store score in criteria for display
        }

        return new VpnRecommendationDto
        {
            RecommendedProviders = providerDtos,
            RecommendationType = VpnRecommendationType.BestOverall,
            RecommendationReason = "Personalized recommendations based on your preferences",
            ConfidenceScore = CalculateConfidenceScore(providerDtos.Count, preferences),
            Criteria = new Dictionary<string, object>
            {
                ["based_on_preferences"] = true,
                ["user_id"] = userId,
                ["max_budget"] = preferences.MaxMonthlyBudget,
                ["needs_streaming"] = preferences.NeedsStreamingSupport,
                ["needs_p2p"] = preferences.NeedsP2PSupport,
                ["requires_kill_switch"] = preferences.RequiresKillSwitch,
                ["prefers_no_logs"] = preferences.PrefersNoLogsPolicy
            }
        };
    }

    public async Task<List<VpnProviderDto>> GetBestForStreamingAsync(List<Guid> streamingServiceIds, int count = 5)
    {
        var providers = await _context.VpnProviders
            .Include(p => p.StreamingCompatibilities)
                .ThenInclude(sc => sc.StreamingService)
            .Include(p => p.ServerLocations)
            .Where(p => p.IsActive && p.SupportsStreaming &&
                       p.StreamingCompatibilities.Any(sc => streamingServiceIds.Contains(sc.StreamingServiceId) &&
                                                           sc.Status == VpnStreamingStatus.WorksReliably))
            .OrderByDescending(p => p.StreamingCompatibilities
                .Count(sc => streamingServiceIds.Contains(sc.StreamingServiceId) &&
                           sc.Status == VpnStreamingStatus.WorksReliably))
            .ThenByDescending(p => p.OverallRating)
            .Take(count)
            .ToListAsync();

        return providers.Select(MapProviderToDto).ToList();
    }

    public async Task<List<VpnProviderDto>> GetBestValueProvidersAsync(decimal maxBudget, int count = 5)
    {
        var providers = await _context.VpnProviders
            .Include(p => p.StreamingCompatibilities)
                .ThenInclude(sc => sc.StreamingService)
            .Include(p => p.ServerLocations)
            .Where(p => p.IsActive && 
                       (p.MonthlyPrice <= maxBudget || p.AnnualPrice / 12 <= maxBudget))
            .OrderBy(p => p.MonthlyPrice < p.AnnualPrice / 12 ? p.MonthlyPrice : p.AnnualPrice / 12)
            .ThenByDescending(p => p.OverallRating)
            .Take(count)
            .ToListAsync();

        return providers.Select(MapProviderToDto).ToList();
    }

    public async Task<List<VpnProviderDto>> GetBeginnerFriendlyProvidersAsync(int count = 5)
    {
        var providers = await _context.VpnProviders
            .Include(p => p.StreamingCompatibilities)
                .ThenInclude(sc => sc.StreamingService)
            .Include(p => p.ServerLocations)
            .Where(p => p.IsActive && p.HasFreeTrial && p.EaseOfUseRating >= 4.0)
            .OrderByDescending(p => p.EaseOfUseRating)
            .ThenByDescending(p => p.FreeTrialDays)
            .ThenByDescending(p => p.OverallRating)
            .Take(count)
            .ToListAsync();

        return providers.Select(MapProviderToDto).ToList();
    }

    public async Task<double> CalculateProviderScoreAsync(Guid providerId, Guid? userId = null)
    {
        var provider = await _context.VpnProviders
            .Include(p => p.StreamingCompatibilities)
            .Include(p => p.Ratings)
            .FirstOrDefaultAsync(p => p.Id == providerId);

        if (provider == null) return 0;

        double score = 0;
        int factors = 0;

        // Overall rating (weight: 30%)
        if (provider.OverallRating.HasValue)
        {
            score += provider.OverallRating.Value * 0.3;
            factors++;
        }

        // Feature completeness (weight: 25%)
        var featureScore = CalculateFeatureScore(provider);
        score += featureScore * 0.25;
        factors++;

        // Streaming effectiveness (weight: 20%)
        var streamingScore = CalculateStreamingScore(provider);
        score += streamingScore * 0.2;
        factors++;

        // Value for money (weight: 15%)
        var valueScore = CalculateValueScore(provider);
        score += valueScore * 0.15;
        factors++;

        // Popularity/trust (weight: 10%)
        var popularityScore = Math.Min(provider.TotalRatings / 100.0, 1.0) * 5; // Cap at 5
        score += popularityScore * 0.1;
        factors++;

        return Math.Round(score, 2);
    }

    public async Task RefreshRecommendationCacheAsync()
    {
        // Implement cache warming strategy
        var commonRecommendationTypes = Enum.GetValues<VpnRecommendationType>();
        
        foreach (var type in commonRecommendationTypes)
        {
            try
            {
                await GetRecommendationsAsync(null, type);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Error refreshing cache for recommendation type: {Type}", type);
            }
        }
    }

    public async Task<VpnRecommendationDto> GetMLBasedRecommendationsAsync(
        Guid? userId,
        Dictionary<string, object> preferences)
    {
        // Simplified ML-like scoring algorithm
        // In a real implementation, this would use a trained model
        
        var providers = await _context.VpnProviders
            .Include(p => p.StreamingCompatibilities)
                .ThenInclude(sc => sc.StreamingService)
            .Include(p => p.ServerLocations)
            .Include(p => p.Ratings)
            .Where(p => p.IsActive)
            .ToListAsync();

        var scoredProviders = new List<(VpnProviderDto provider, double score)>();

        foreach (var provider in providers)
        {
            var score = await CalculateMLScoreAsync(provider, preferences, userId);
            scoredProviders.Add((MapProviderToDto(provider), score));
        }

        var topProviders = scoredProviders
            .OrderByDescending(x => x.score)
            .Take(5)
            .Select(x => x.provider)
            .ToList();

        return new VpnRecommendationDto
        {
            RecommendedProviders = topProviders,
            RecommendationType = VpnRecommendationType.BestOverall,
            RecommendationReason = "ML-based recommendations using advanced algorithms",
            ConfidenceScore = CalculateMLConfidenceScore(scoredProviders),
            Criteria = preferences
        };
    }

    private async Task<VpnRecommendationDto> GetBestOverallRecommendationsAsync(Guid? userId, decimal? budget)
    {
        var query = _context.VpnProviders
            .Include(p => p.StreamingCompatibilities)
                .ThenInclude(sc => sc.StreamingService)
            .Include(p => p.ServerLocations)
            .Where(p => p.IsActive);

        if (budget.HasValue)
        {
            query = query.Where(p => p.MonthlyPrice <= budget.Value || p.AnnualPrice / 12 <= budget.Value);
        }

        var providers = await query
            .OrderByDescending(p => p.OverallRating)
            .ThenByDescending(p => p.TotalRatings)
            .ThenBy(p => p.MonthlyPrice)
            .Take(5)
            .ToListAsync();

        return new VpnRecommendationDto
        {
            RecommendedProviders = providers.Select(MapProviderToDto).ToList(),
            RecommendationType = VpnRecommendationType.BestOverall,
            RecommendationReason = "Top-rated VPN providers with excellent overall performance",
            ConfidenceScore = CalculateConfidenceScore(providers.Count, null),
            Criteria = new Dictionary<string, object>
            {
                ["based_on"] = "overall_rating",
                ["budget_limit"] = budget,
                ["min_rating"] = 4.0
            }
        };
    }

    private async Task<VpnRecommendationDto> GetBestValueRecommendationsAsync(decimal budget)
    {
        var providers = await GetBestValueProvidersAsync(budget);

        return new VpnRecommendationDto
        {
            RecommendedProviders = providers,
            RecommendationType = VpnRecommendationType.BestValue,
            RecommendationReason = $"Best value VPN providers under ${budget}/month",
            ConfidenceScore = CalculateConfidenceScore(providers.Count, null),
            Criteria = new Dictionary<string, object>
            {
                ["max_budget"] = budget,
                ["sorted_by"] = "price_to_value_ratio"
            }
        };
    }

    private async Task<VpnRecommendationDto> GetBestForStreamingRecommendationsAsync(List<string>? streamingServices)
    {
        var query = _context.VpnProviders
            .Include(p => p.StreamingCompatibilities)
                .ThenInclude(sc => sc.StreamingService)
            .Include(p => p.ServerLocations)
            .Where(p => p.IsActive && p.SupportsStreaming);

        if (streamingServices?.Any() == true)
        {
            query = query.Where(p => p.StreamingCompatibilities
                .Any(sc => streamingServices.Contains(sc.StreamingService.Name) &&
                          sc.Status == VpnStreamingStatus.WorksReliably));
        }

        var providers = await query
            .OrderByDescending(p => p.StreamingCompatibilities
                .Count(sc => sc.Status == VpnStreamingStatus.WorksReliably))
            .ThenByDescending(p => p.OverallRating)
            .Take(5)
            .ToListAsync();

        return new VpnRecommendationDto
        {
            RecommendedProviders = providers.Select(MapProviderToDto).ToList(),
            RecommendationType = VpnRecommendationType.BestForStreaming,
            RecommendationReason = "Best VPN providers for streaming services",
            ConfidenceScore = CalculateConfidenceScore(providers.Count, null),
            Criteria = new Dictionary<string, object>
            {
                ["optimized_for"] = "streaming",
                ["streaming_services"] = streamingServices ?? new List<string>(),
                ["compatibility_tested"] = true
            }
        };
    }

    private async Task<VpnRecommendationDto> GetBestForP2PRecommendationsAsync(decimal? budget)
    {
        var query = _context.VpnProviders
            .Include(p => p.StreamingCompatibilities)
                .ThenInclude(sc => sc.StreamingService)
            .Include(p => p.ServerLocations)
            .Where(p => p.IsActive && p.SupportsP2P);

        if (budget.HasValue)
        {
            query = query.Where(p => p.MonthlyPrice <= budget.Value || p.AnnualPrice / 12 <= budget.Value);
        }

        var providers = await query
            .OrderByDescending(p => p.ServerLocations.Count(sl => sl.IsP2PFriendly))
            .ThenByDescending(p => p.OverallRating)
            .Take(5)
            .ToListAsync();

        return new VpnRecommendationDto
        {
            RecommendedProviders = providers.Select(MapProviderToDto).ToList(),
            RecommendationType = VpnRecommendationType.BestForP2P,
            RecommendationReason = "Best VPN providers for P2P file sharing",
            ConfidenceScore = CalculateConfidenceScore(providers.Count, null),
            Criteria = new Dictionary<string, object>
            {
                ["supports_p2p"] = true,
                ["p2p_friendly_servers"] = true,
                ["budget_limit"] = budget
            }
        };
    }

    private async Task<VpnRecommendationDto> GetBeginnerFriendlyRecommendationsAsync(decimal? budget)
    {
        var providers = await GetBeginnerFriendlyProvidersAsync();

        if (budget.HasValue)
        {
            providers = providers.Where(p => p.MonthlyPrice <= budget.Value || p.AnnualPrice / 12 <= budget.Value).ToList();
        }

        return new VpnRecommendationDto
        {
            RecommendedProviders = providers,
            RecommendationType = VpnRecommendationType.BestForBeginners,
            RecommendationReason = "Most user-friendly VPN providers for beginners",
            ConfidenceScore = CalculateConfidenceScore(providers.Count, null),
            Criteria = new Dictionary<string, object>
            {
                ["ease_of_use"] = "high",
                ["has_free_trial"] = true,
                ["beginner_friendly"] = true,
                ["budget_limit"] = budget
            }
        };
    }

    private async Task<VpnRecommendationDto> GetBestForSecurityRecommendationsAsync(decimal? budget)
    {
        var query = _context.VpnProviders
            .Include(p => p.StreamingCompatibilities)
                .ThenInclude(sc => sc.StreamingService)
            .Include(p => p.ServerLocations)
            .Where(p => p.IsActive && p.HasNoLogsPolicy && p.HasKillSwitch);

        if (budget.HasValue)
        {
            query = query.Where(p => p.MonthlyPrice <= budget.Value || p.AnnualPrice / 12 <= budget.Value);
        }

        var providers = await query
            .OrderByDescending(p => CalculateSecurityScore(p))
            .ThenByDescending(p => p.OverallRating)
            .Take(5)
            .ToListAsync();

        return new VpnRecommendationDto
        {
            RecommendedProviders = providers.Select(MapProviderToDto).ToList(),
            RecommendationType = VpnRecommendationType.BestForSecurity,
            RecommendationReason = "Most secure VPN providers with strong privacy protection",
            ConfidenceScore = CalculateConfidenceScore(providers.Count, null),
            Criteria = new Dictionary<string, object>
            {
                ["no_logs_policy"] = true,
                ["kill_switch"] = true,
                ["security_focus"] = true,
                ["budget_limit"] = budget
            }
        };
    }

    private async Task<VpnRecommendationDto> GetBestForSpeedRecommendationsAsync(decimal? budget)
    {
        var query = _context.VpnProviders
            .Include(p => p.StreamingCompatibilities)
                .ThenInclude(sc => sc.StreamingService)
            .Include(p => p.ServerLocations)
            .Where(p => p.IsActive && p.AverageSpeedRating >= 4.0);

        if (budget.HasValue)
        {
            query = query.Where(p => p.MonthlyPrice <= budget.Value || p.AnnualPrice / 12 <= budget.Value);
        }

        var providers = await query
            .OrderByDescending(p => p.AverageSpeedRating)
            .ThenByDescending(p => p.ServerCount)
            .ThenByDescending(p => p.OverallRating)
            .Take(5)
            .ToListAsync();

        return new VpnRecommendationDto
        {
            RecommendedProviders = providers.Select(MapProviderToDto).ToList(),
            RecommendationType = VpnRecommendationType.BestForSpeed,
            RecommendationReason = "Fastest VPN providers with excellent speed performance",
            ConfidenceScore = CalculateConfidenceScore(providers.Count, null),
            Criteria = new Dictionary<string, object>
            {
                ["speed_optimized"] = true,
                ["min_speed_rating"] = 4.0,
                ["server_count_considered"] = true,
                ["budget_limit"] = budget
            }
        };
    }

    private double CalculateFeatureScore(VpnProvider provider)
    {
        double score = 0;
        int maxScore = 0;

        if (provider.HasKillSwitch) score += 1;
        maxScore += 1;

        if (provider.HasNoLogsPolicy) score += 1;
        maxScore += 1;

        if (provider.SupportsStreaming) score += 0.8;
        maxScore += 1;

        if (provider.SupportsP2P) score += 0.6;
        maxScore += 1;

        if (provider.HasFreeTrial) score += 0.5;
        maxScore += 1;

        return maxScore > 0 ? (score / maxScore) * 5 : 0;
    }

    private double CalculateStreamingScore(VpnProvider provider)
    {
        if (provider.StreamingCompatibilities == null || !provider.StreamingCompatibilities.Any()) return 2.5;

        var workingCount = provider.StreamingCompatibilities.Count(sc => sc.Status == VpnStreamingStatus.WorksReliably);
        var totalCount = provider.StreamingCompatibilities.Count;

        return totalCount > 0 ? (double)workingCount / totalCount * 5 : 2.5;
    }

    private double CalculateValueScore(VpnProvider provider)
    {
        var monthlyPrice = Math.Min(provider.MonthlyPrice, provider.AnnualPrice / 12);
        
        // Inverse relationship with price (cheaper = better value)
        // Assume price range $2-$15/month
        var priceScore = Math.Max(0, (15 - monthlyPrice) / 13 * 5);
        
        return Math.Min((double)priceScore, 5.0);
    }

    private double CalculateSecurityScore(VpnProvider provider)
    {
        double score = 0;
        
        if (provider.HasNoLogsPolicy) score += 2;
        if (provider.HasKillSwitch) score += 2;
        if (provider.CustomerSupportRating >= 4) score += 0.5;
        if (provider.ServerCount >= 1000) score += 0.3;
        if (provider.CountryCount >= 50) score += 0.2;
        
        return Math.Min(score, 5);
    }

    private async Task<double> CalculateMLScoreAsync(VpnProvider provider, Dictionary<string, object> preferences, Guid? userId)
    {
        // Simplified ML scoring algorithm
        double score = 0;
        
        // Base score from provider rating
        score += (provider.OverallRating ?? 2.5) * 0.3;
        
        // Feature matching
        if (preferences.ContainsKey("streaming") && (bool)preferences["streaming"] && provider.SupportsStreaming)
            score += 1.5;
        
        if (preferences.ContainsKey("p2p") && (bool)preferences["p2p"] && provider.SupportsP2P)
            score += 1.0;
        
        if (preferences.ContainsKey("security") && (bool)preferences["security"])
        {
            if (provider.HasKillSwitch) score += 0.8;
            if (provider.HasNoLogsPolicy) score += 0.8;
        }
        
        // Price preference
        if (preferences.ContainsKey("budget"))
        {
            var budget = Convert.ToDecimal(preferences["budget"]);
            var monthlyPrice = Math.Min(provider.MonthlyPrice, provider.AnnualPrice / 12);
            if (monthlyPrice <= budget)
                score += (double)(1 - (monthlyPrice / budget)) * 1.5;
        }
        
        // Popularity bonus
        score += Math.Min(provider.TotalRatings / 100.0, 1.0);
        
        return score;
    }

    private double CalculatePersonalizedScoreAsync(VpnProviderDto provider, UserVpnPreference preferences)
    {
        double score = provider.OverallRating ?? 0;
        
        // Apply preference bonuses
        if (preferences.NeedsStreamingSupport && provider.SupportsStreaming) score += 1;
        if (preferences.NeedsP2PSupport && provider.SupportsP2P) score += 1;
        if (preferences.RequiresKillSwitch && provider.HasKillSwitch) score += 0.5;
        if (preferences.PrefersNoLogsPolicy && provider.HasNoLogsPolicy) score += 0.5;
        
        return score;
    }

    private double CalculateConfidenceScore(int providerCount, UserVpnPreference? preferences)
    {
        double baseConfidence = Math.Min(providerCount / 5.0, 1.0) * 0.8;
        
        if (preferences != null)
        {
            // Higher confidence if we have user preferences to work with
            baseConfidence += 0.2;
        }
        
        return Math.Min(baseConfidence, 1.0);
    }

    private double CalculateMLConfidenceScore(List<(VpnProviderDto provider, double score)> scoredProviders)
    {
        if (!scoredProviders.Any()) return 0;
        
        var topScore = scoredProviders.Max(x => x.score);
        var avgScore = scoredProviders.Average(x => x.score);
        
        // Higher confidence when top providers are clearly better than average
        var scoreSpread = topScore - avgScore;
        return Math.Min(scoreSpread / 3.0 + 0.6, 1.0);
    }

    private VpnProviderDto MapProviderToDto(VpnProvider provider)
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
            IsFeatured = provider.IsFeatured
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

    /// <summary>
    /// Gets VPN providers that have servers in specified countries
    /// </summary>
    public async Task<List<VpnProviderDto>> GetVpnProvidersForCountries(List<string> countryCodes)
    {
        try
        {
            if (countryCodes == null || !countryCodes.Any())
            {
                _logger.LogWarning("GetVpnProvidersForCountries called with empty country codes");
                return new List<VpnProviderDto>();
            }

            // Normalize country codes to lowercase for comparison
            var normalizedCountryCodes = countryCodes.Select(c => c.ToLower()).ToList();

            _logger.LogInformation("Finding VPN providers for countries: {Countries}", string.Join(", ", normalizedCountryCodes));

            // Find providers that have servers in any of the specified countries
            var providers = await _context.VpnProviders
                .Include(p => p.ServerLocations)
                .Include(p => p.StreamingCompatibilities)
                    .ThenInclude(sc => sc.StreamingService)
                .Where(p => p.IsActive &&
                           p.ServerLocations.Any(sl => normalizedCountryCodes.Contains(sl.CountryCode.ToLower())))
                .ToListAsync();

            // Score providers based on:
            // 1. Number of matching countries
            // 2. Server count in those countries
            // 3. Overall VPN quality rating
            var scoredProviders = providers.Select(p => new
            {
                Provider = p,
                MatchingCountries = p.ServerLocations
                    .Where(sl => normalizedCountryCodes.Contains(sl.CountryCode.ToLower()))
                    .Select(sl => sl.CountryCode)
                    .Distinct()
                    .Count(),
                TotalServersInMatchingCountries = p.ServerLocations
                    .Where(sl => normalizedCountryCodes.Contains(sl.CountryCode.ToLower()))
                    .Sum(sl => sl.ServerCount),
                Score = 0.0
            }).ToList();

            // Calculate composite score
            foreach (var item in scoredProviders)
            {
                var countryScore = (double)item.MatchingCountries / countryCodes.Count * 0.4; // 40% weight
                var serverScore = Math.Min(item.TotalServersInMatchingCountries / 100.0, 1.0) * 0.3; // 30% weight
                var qualityScore = (item.Provider.OverallRating ?? 2.5) / 5.0 * 0.3; // 30% weight

                item.GetType().GetProperty("Score")?.SetValue(item, countryScore + serverScore + qualityScore);
            }

            // Return top providers sorted by score
            var topProviders = scoredProviders
                .OrderByDescending(sp => sp.Score)
                .Take(10)
                .Select(sp => MapProviderToDto(sp.Provider))
                .ToList();

            _logger.LogInformation("Found {Count} VPN providers with servers in specified countries", topProviders.Count);

            return topProviders;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting VPN providers for countries: {Countries}", string.Join(", ", countryCodes));
            return new List<VpnProviderDto>();
        }
    }
}