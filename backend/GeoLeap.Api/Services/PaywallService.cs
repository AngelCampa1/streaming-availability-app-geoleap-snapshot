using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

/// <summary>
/// Paywall service implementation for subscription-based content gating
/// </summary>
public class PaywallService : IPaywallService
{
    private readonly ApplicationDbContext _context;
    private readonly IMemoryCache _cache;
    private readonly IRbacService _rbacService;
    private readonly ILogger<PaywallService> _logger;
    private readonly TimeSpan _subscriptionCacheExpiry = TimeSpan.FromMinutes(10);
    private readonly TimeSpan _usageCacheExpiry = TimeSpan.FromMinutes(5);

    private static readonly Dictionary<SubscriptionTier, TierAccessLimits> _tierLimits = new()
    {
        [SubscriptionTier.Free] = new TierAccessLimits
        {
            Tier = SubscriptionTier.Free,
            MaxSearchResultsPerQuery = -1, // Unlimited - no free tier restrictions
            MaxDailySearches = -1, // Unlimited
            CanViewStreamingUrls = true,
            CanViewPricing = true,
            CanViewAllCountries = true,
            CanAccessAdvancedFilters = true,
            CanExportResults = true,
            PreviewDescriptionLength = -1, // Full descriptions
            MaxGenreTagsShown = -1, // All genres
            ShowUpgradePrompts = true, // Show prompts to convert to paid
            ShowVpnAffiliateAds = true
        },
        [SubscriptionTier.Basic] = new TierAccessLimits
        {
            Tier = SubscriptionTier.Basic,
            MaxSearchResultsPerQuery = -1, // Unlimited - treat basic as premium
            MaxDailySearches = -1, // Unlimited
            CanViewStreamingUrls = true,
            CanViewPricing = true,
            CanViewAllCountries = true,
            CanAccessAdvancedFilters = true,
            CanExportResults = true,
            PreviewDescriptionLength = -1, // Full descriptions
            MaxGenreTagsShown = -1, // All genres
            ShowUpgradePrompts = true,
            ShowVpnAffiliateAds = true
        },
        [SubscriptionTier.Premium] = new TierAccessLimits
        {
            Tier = SubscriptionTier.Premium,
            MaxSearchResultsPerQuery = -1, // Unlimited
            MaxDailySearches = -1, // Unlimited
            CanViewStreamingUrls = true,
            CanViewPricing = true,
            CanViewAllCountries = true,
            CanAccessAdvancedFilters = true,
            CanExportResults = true,
            PreviewDescriptionLength = -1, // Full descriptions
            MaxGenreTagsShown = -1, // All genres
            ShowUpgradePrompts = false,
            ShowVpnAffiliateAds = false
        },
        [SubscriptionTier.Admin] = new TierAccessLimits
        {
            Tier = SubscriptionTier.Admin,
            MaxSearchResultsPerQuery = -1,
            MaxDailySearches = -1,
            CanViewStreamingUrls = true,
            CanViewPricing = true,
            CanViewAllCountries = true,
            CanAccessAdvancedFilters = true,
            CanExportResults = true,
            PreviewDescriptionLength = -1,
            MaxGenreTagsShown = -1,
            ShowUpgradePrompts = false,
            ShowVpnAffiliateAds = false
        }
    };

    public PaywallService(
        ApplicationDbContext context,
        IMemoryCache cache,
        IRbacService rbacService,
        ILogger<PaywallService> logger)
    {
        _context = context;
        _cache = cache;
        _rbacService = rbacService;
        _logger = logger;
    }

    public async Task<UserSubscription> GetUserSubscriptionAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        try
        {
            var cacheKey = $"user_subscription_{userId}";

            if (!_cache.TryGetValue(cacheKey, out UserSubscription? subscription))
            {
                subscription = await _context.UserSubscriptions
                    .Where(s => s.UserId == userId)
                    .OrderByDescending(s => s.StartDate)
                    .FirstOrDefaultAsync(cancellationToken);

                if (subscription == null)
                {
                    // Create default free subscription
                    subscription = new UserSubscription
                    {
                        UserId = userId,
                        Tier = SubscriptionTier.Free,
                        IsActive = true
                    };
                }

                _cache.Set(cacheKey, subscription, _subscriptionCacheExpiry);
            }

            return subscription;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting subscription for user {UserId}", userId);
            
            // Return default free subscription on error (fail-safe)
            return new UserSubscription
            {
                UserId = userId,
                Tier = SubscriptionTier.Free,
                IsActive = true
            };
        }
    }

    public async Task<SubscriptionTier> GetUserTierAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        try
        {
            // Check if user is admin via RBAC first (if RBAC service is available)
            var isAdmin = false;
            if (_rbacService != null)
            {
                isAdmin = await _rbacService.IsInRoleAsync(userId, "Admin") || 
                         await _rbacService.IsInRoleAsync(userId, "SuperAdmin");
            }
            
            if (isAdmin)
            {
                return SubscriptionTier.Admin;
            }

            // Check database for subscription first
            try
            {
                var dbSubscription = await _context.Subscriptions
                    .Where(s => s.UserId == userId && s.Status == "active")
                    .OrderByDescending(s => s.CreatedAt)
                    .FirstOrDefaultAsync(cancellationToken);
                    
                if (dbSubscription != null)
                {
                    var tier = dbSubscription.PlanType?.ToLower() switch
                    {
                        "premium" => SubscriptionTier.Premium,
                        "basic" => SubscriptionTier.Basic,
                        _ => SubscriptionTier.Free
                    };
                    
                    return tier;
                }
                
                // Check UserSubscriptions table as fallback
                var userSubscription = await _context.UserSubscriptions
                    .Where(us => us.UserId == userId && us.IsActive && 
                                (us.EndDate == null || us.EndDate > DateTime.UtcNow))
                    .FirstOrDefaultAsync(cancellationToken);
                    
                if (userSubscription != null)
                {
                    return userSubscription.Tier;
                }

                // Check User.SubscriptionTier field as final database fallback
                var userTier = await _context.Users
                    .AsNoTracking()
                    .Where(u => u.Id == userId)
                    .Select(u => u.SubscriptionTier)
                    .FirstOrDefaultAsync(cancellationToken);

                if (!string.IsNullOrEmpty(userTier))
                {
                    var tier = userTier.ToLower() switch
                    {
                        "premium" => SubscriptionTier.Premium,
                        "admin" => SubscriptionTier.Admin,
                        "pro" => SubscriptionTier.Pro,
                        "basic" => SubscriptionTier.Basic,
                        _ => (SubscriptionTier?)null
                    };

                    if (tier.HasValue)
                    {
                        return tier.Value;
                    }
                }
            }
            catch
            {
                // Database error, continue with fallback logic
            }

            // Mock subscription for testing based on user ID patterns (dev fallback)
            var userIdString = userId.ToString().ToLower();
            if (userIdString.Contains("premium") || userIdString.EndsWith("1"))
            {
                return SubscriptionTier.Premium;
            }
            if (userIdString.Contains("basic") || userIdString.EndsWith("2"))
            {
                return SubscriptionTier.Basic;
            }

            return SubscriptionTier.Free;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting tier for user {UserId}", userId);
            return SubscriptionTier.Free; // Fail-safe default
        }
    }

    public TierAccessLimits GetTierAccessLimits(SubscriptionTier tier)
    {
        return _tierLimits.TryGetValue(tier, out var limits) ? limits : _tierLimits[SubscriptionTier.Free];
    }

    public async Task<PaywalledSearchResponse> ApplyPaywallAsync(
        GlobalSearchResponse response, 
        Guid userId, 
        string correlationId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var tier = await GetUserTierAsync(userId, cancellationToken);
            var limits = GetTierAccessLimits(tier);

            var paywalledResults = new List<PaywalledSearchResult>();
            var resultsToShow = limits.MaxSearchResultsPerQuery == -1 
                ? response.Results.Count 
                : Math.Min(limits.MaxSearchResultsPerQuery, response.Results.Count);

            // Apply paywall to each result
            for (int i = 0; i < resultsToShow; i++)
            {
                var contentSummary = response.Results[i];
                var globalSearchResult = new GlobalSearchResult
                {
                    Id = contentSummary.Id,
                    Title = contentSummary.Title,
                    OriginalTitle = contentSummary.OriginalTitle,
                    Type = contentSummary.Type,
                    Year = contentSummary.Year,
                    Overview = contentSummary.Overview,
                    Genres = contentSummary.Genres,
                    ImageUrl = contentSummary.ImageUrl,
                    Rating = (double?)contentSummary.Rating,
                    RuntimeMinutes = contentSummary.RuntimeMinutes,
                    Language = contentSummary.Language,
                    AvailableCountries = contentSummary.AvailableCountries,
                    DataSources = contentSummary.DataSources,
                    Results = new List<ContentSummary>(),
                    TotalResults = 0,
                    Page = 1,
                    PageSize = 20,
                    HasMore = false,
                    CategoryCounts = new Dictionary<string, int>()
                };
                var paywalledResult = await ApplyPaywallToResultAsync(globalSearchResult, userId, correlationId, cancellationToken);
                paywalledResults.Add(paywalledResult);
            }

            // Generate paywall info and messaging
            var context = new PaywallContext
            {
                ResultsAvailable = response.TotalResults,
                ResultsShown = resultsToShow,
                SearchQuery = response.Query,
                UserTier = tier,
                DailySearchCount = (await GetTodaysUsageAsync(userId, cancellationToken)).SearchCount
            };

            var messages = await GenerateUpgradeMessagingAsync(userId, context, cancellationToken);

            var paywallInfo = new PaywallInfo
            {
                UserTier = tier,
                IsPaywallActive = tier == SubscriptionTier.Free || tier == SubscriptionTier.Basic, // Show prompts but don't block
                ResultsShown = response.TotalResults, // Show all results now
                TotalAvailableResults = response.TotalResults,
                Messages = messages,
                Analytics = new Dictionary<string, object>
                {
                    ["tier"] = tier.ToString(),
                    ["results_filtered"] = 0, // No filtering
                    ["correlation_id"] = correlationId
                }
            };

            // Log paywall application
            await LogPaywallEventAsync(userId, PaywallEvent.PaywallShown, new Dictionary<string, object>
            {
                ["results_shown"] = resultsToShow,
                ["total_results"] = response.TotalResults,
                ["user_tier"] = tier.ToString(),
                ["search_query"] = response.Query
            }, correlationId, cancellationToken);

            return new PaywalledSearchResponse
            {
                Results = paywalledResults,
                TotalResults = response.TotalResults,
                Page = response.Page,
                PageSize = response.PageSize,
                HasMore = response.HasMore,
                Query = response.Query,
                SearchedAt = response.SearchedAt,
                ResponseTime = response.ResponseTime,
                Metadata = response.Metadata ?? new SearchMetadata { Query = response.Query },
                Suggestions = response.Suggestions,
                PaywallInfo = paywallInfo
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error applying paywall for user {UserId}", userId);
            throw;
        }
    }

    public async Task<PaywalledSearchResult> ApplyPaywallToResultAsync(
        GlobalSearchResult result, 
        Guid userId, 
        string correlationId,
        CancellationToken cancellationToken = default)
    {
        return await ApplyPaywallToResultInternalAsync(result, userId, correlationId, cancellationToken);
    }

    public async Task<PaywalledSearchResult> ApplyPaywallToResultAsync(
        GlobalSearchResult result, 
        Guid userId, 
        string countryCode)
    {
        _logger.LogInformation("ApplyPaywallToResultAsync called with countryCode: {CountryCode}, UserId: {UserId}, ResultId: {ResultId}", countryCode, userId, result?.Id);
        var res = await ApplyPaywallToResultInternalAsync(result, userId, "paywall-" + Guid.NewGuid().ToString(), CancellationToken.None);
        _logger.LogInformation("ApplyPaywallToResultAsync returning: {IsNull}", res == null ? "NULL" : "NOT NULL");
        return res;
    }

    private async Task<PaywalledSearchResult> ApplyPaywallToResultInternalAsync(
        GlobalSearchResult result, 
        Guid userId, 
        string correlationId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation("ApplyPaywallToResultInternalAsync starting for UserId: {UserId}, ResultId: {ResultId}", userId, result?.Id);
            var tier = await GetUserTierAsync(userId, cancellationToken);
            _logger.LogInformation("Got user tier: {Tier} for UserId: {UserId}", tier, userId);
            var limits = GetTierAccessLimits(tier);
            _logger.LogInformation("Got tier limits for tier: {Tier}", tier);

            var paywalledResult = new PaywalledSearchResult
            {
                Id = result.Id,
                Title = result.Title,
                OriginalTitle = result.OriginalTitle,
                Type = result.Type,
                Year = result.Year,
                PosterUrl = result.PosterUrl,
                BackdropUrl = result.BackdropUrl,
                Rating = (decimal?)result.Rating,
                RuntimeMinutes = result.RuntimeMinutes,
                Language = result.Language,
                ContentRating = result.ContentRating,
                AvailableCountries = result.AvailableCountries,
                AvailableServices = result.AvailableServices,
                RelevanceScore = (decimal)(result.RelevanceScore),
                MatchedFields = result.MatchedFields,
                LastUpdated = result.LastUpdated,
                IsPaywalled = false // No content blocking in new pricing model
            };

            // Apply overview truncation (handle null safely)
            var overview = result.Overview ?? "";
            if (limits.PreviewDescriptionLength > 0 && overview.Length > limits.PreviewDescriptionLength)
            {
                paywalledResult.Overview = overview[..limits.PreviewDescriptionLength] + "...";
                paywalledResult.IsOverviewTruncated = true;
            }
            else
            {
                paywalledResult.Overview = overview;
                paywalledResult.IsOverviewTruncated = false;
            }

            // Apply genre filtering (handle null safely)
            var genres = result.Genres ?? new List<string>();
            if (limits.MaxGenreTagsShown > 0 && genres.Count > limits.MaxGenreTagsShown)
            {
                paywalledResult.Genres = genres.Take(limits.MaxGenreTagsShown).ToList();
                paywalledResult.AreGenresTruncated = true;
            }
            else
            {
                paywalledResult.Genres = genres;
                paywalledResult.AreGenresTruncated = false;
            }

            // Apply streaming options filtering (handle null safely)
            var streamingOptions = result.StreamingOptions ?? new List<GlobalStreamingOption>();
            paywalledResult.StreamingOptions = streamingOptions.Select(option => 
                ApplyPaywallToStreamingOption(option, limits)).ToList();

            paywalledResult.AreStreamingOptionsFiltered = !limits.CanViewStreamingUrls || !limits.CanViewPricing;

            // Only include external IDs for premium users
            paywalledResult.ExternalIds = limits.CanViewStreamingUrls ? result.ExternalIds : null;

            return paywalledResult;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error applying paywall to result {ResultId} for user {UserId}", result.Id, userId);
            
            // Return a basic paywall result instead of null when exception occurs
            return new PaywalledSearchResult
            {
                Id = result?.Id ?? "unknown",
                Title = result?.Title ?? "Unknown",
                Type = result?.Type ?? ContentType.Unknown,
                Year = result?.Year,
                Overview = result?.Overview ?? "",
                Genres = result?.Genres ?? new List<string>(),
                StreamingOptions = new List<PaywalledStreamingOption>(),
                IsPaywalled = true,
                IsOverviewTruncated = false,
                AreGenresTruncated = false,
                AreStreamingOptionsFiltered = true
            };
        }
    }

    private PaywalledStreamingOption ApplyPaywallToStreamingOption(GlobalStreamingOption option, TierAccessLimits limits)
    {
        var paywalledOption = new PaywalledStreamingOption
        {
            ServiceId = option.ServiceId,
            ServiceName = option.ServiceName,
            ServiceLogoUrl = option.ServiceLogoUrl,
            Type = option.Type,
            VideoQuality = option.VideoQuality ?? new List<string>(),
            HasSubtitles = option.HasSubtitles,
            HasAudioTracks = option.HasAudioTracks,
            EarliestExpiration = option.EarliestExpiration,
            LastUpdated = option.LastUpdated,
            IsPricingVisible = limits.CanViewPricing,
            AreUrlsVisible = limits.CanViewStreamingUrls
        };

        // Apply pricing visibility
        if (limits.CanViewPricing)
        {
            paywalledOption.LowestPrice = option.LowestPrice;
            paywalledOption.HighestPrice = option.HighestPrice;
            paywalledOption.Currency = option.Currency;
        }

        // Apply country filtering and URL visibility
        paywalledOption.Countries = option.Countries.Select(country => new PaywalledCountryAvailability
        {
            CountryCode = country.CountryCode,
            CountryName = country.CountryName,
            Price = limits.CanViewPricing ? country.Price : null,
            Currency = limits.CanViewPricing ? country.Currency : string.Empty,
            StreamingUrl = limits.CanViewStreamingUrls ? country.StreamingUrl : null,
            AudioLanguages = country.AudioLanguages,
            SubtitleLanguages = country.SubtitleLanguages,
            ExpiresAt = country.ExpiresAt,
            LastUpdated = country.LastUpdated,
            IsPricingVisible = limits.CanViewPricing
        }).ToList();

        return paywalledOption;
    }

    public async Task<bool> CanUserSearchAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        try
        {
            // In new pricing model, everyone can search unlimited
            // We still track usage for analytics but don't block
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking search permission for user {UserId}", userId);
            return true; // Fail-safe to always allow searches
        }
    }

    public async Task IncrementSearchUsageAsync(Guid userId, int resultsReturned, CancellationToken cancellationToken = default)
    {
        try
        {
            var today = DateTime.UtcNow.Date;
            
            try
            {
                var usage = await _context.UserSearchUsages
                    .FirstOrDefaultAsync(u => u.UserId == userId && u.Date == today, cancellationToken);

                if (usage == null)
                {
                    usage = new UserSearchUsage
                    {
                        Id = Guid.NewGuid(),
                        UserId = userId,
                        Date = today,
                        SearchCount = 0,
                        ResultsViewed = 0,
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                    await _context.UserSearchUsages.AddAsync(usage, cancellationToken);
                }

                usage.SearchCount += 1; // Increment by 1 search, not results count
                usage.ResultsViewed += resultsReturned;
                usage.LastSearchAt = DateTime.UtcNow;
                usage.UpdatedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync(cancellationToken);
            }
            catch (Exception dbEx)
            {
                _logger.LogWarning(dbEx, "Database error incrementing usage for user {UserId}, operation continues", userId);
            }

            // Clear cache regardless of database success
            _cache.Remove($"user_usage_{userId}_{today:yyyy-MM-dd}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error incrementing search usage for user {UserId}", userId);
        }
    }

    public async Task<List<PaywallMessage>> GenerateUpgradeMessagingAsync(
        Guid userId, 
        PaywallContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var messages = new List<PaywallMessage>();
            var tier = context.UserTier;
            var limits = GetTierAccessLimits(tier);

            if (!limits.ShowUpgradePrompts)
            {
                return messages; // No messages for premium users
            }

            // Soft upgrade prompts for non-paying users
            if (tier == SubscriptionTier.Free || tier == SubscriptionTier.Basic)
            {
                messages.Add(new PaywallMessage
                {
                    Type = PaywallMessageType.FeatureRestricted,
                    Title = "Support GeoLeap",
                    Message = "Enjoy unlimited access while supporting our development. Upgrade to Premium for lifetime access!",
                    ActionText = "Learn More",
                    ActionUrl = "/pricing",
                    Intensity = PaywallMessageIntensity.Gentle
                });
            }

            await LogPaywallEventAsync(userId, PaywallEvent.UpgradePromptShown, 
                new Dictionary<string, object>
                {
                    ["message_count"] = messages.Count,
                    ["user_tier"] = tier.ToString(),
                    ["messages"] = messages.Select(m => new { m.Type, m.Title }).ToList()
                }, 
                null, cancellationToken);

            return messages;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating upgrade messaging for user {UserId}", userId);
            return new List<PaywallMessage>();
        }
    }

    public async Task LogPaywallEventAsync(
        Guid userId, 
        PaywallEvent eventType, 
        Dictionary<string, object>? metadata = null,
        string? correlationId = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var tier = await GetUserTierAsync(userId, cancellationToken);
            
            var analytics = new PaywallAnalytics
            {
                UserId = userId,
                EventType = eventType,
                UserTier = tier,
                Metadata = metadata ?? new Dictionary<string, object>(),
                CorrelationId = correlationId
            };

            await _context.PaywallAnalytics.AddAsync(analytics, cancellationToken);
            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogInformation(
                "Paywall event {EventType} logged for user {UserId} with tier {Tier}",
                eventType, userId, tier);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error logging paywall event {EventType} for user {UserId}", eventType, userId);
        }
    }

    public async Task<UserSubscription> ValidateAndRefreshSubscriptionAsync(
        Guid userId, 
        bool forceRefresh = false,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var cacheKey = $"user_subscription_{userId}";
            
            if (forceRefresh)
            {
                _cache.Remove(cacheKey);
            }

            var subscription = await GetUserSubscriptionAsync(userId, cancellationToken);
            
            // Additional validation logic could be added here
            // e.g., check with external payment provider
            
            return subscription;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating subscription for user {UserId}", userId);
            throw;
        }
    }

    public async Task<bool> HasFeatureAccessAsync(
        Guid userId, 
        PaywallFeature feature,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var tier = await GetUserTierAsync(userId, cancellationToken);
            var limits = GetTierAccessLimits(tier);

            return feature switch
            {
                PaywallFeature.StreamingUrls => limits.CanViewStreamingUrls,
                PaywallFeature.PricingInformation => limits.CanViewPricing,
                PaywallFeature.AdvancedFilters => limits.CanAccessAdvancedFilters,
                PaywallFeature.UnlimitedResults => limits.MaxSearchResultsPerQuery == -1,
                PaywallFeature.ExportResults => limits.CanExportResults,
                PaywallFeature.GlobalAvailability => limits.CanViewAllCountries,
                PaywallFeature.DirectLinks => limits.CanViewStreamingUrls,
                PaywallFeature.DetailedMetadata => limits.PreviewDescriptionLength == -1,
                _ => false
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking feature access {Feature} for user {UserId}", feature, userId);
            return false; // Fail-safe
        }
    }

    public async Task<UserSearchUsage> GetTodaysUsageAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        try
        {
            var today = DateTime.UtcNow.Date;
            var cacheKey = $"user_usage_{userId}_{today:yyyy-MM-dd}";

            if (!_cache.TryGetValue(cacheKey, out UserSearchUsage? usage))
            {
                try
                {
                    usage = await _context.UserSearchUsages
                        .FirstOrDefaultAsync(u => u.UserId == userId && u.Date == today, cancellationToken);
                }
                catch
                {
                    // Database error, create mock usage
                    usage = null;
                }

                if (usage == null)
                {
                    // Create realistic usage based on user tier for testing
                    var tier = await GetUserTierAsync(userId, cancellationToken);
                    var mockSearchCount = tier switch
                    {
                        SubscriptionTier.Premium => Random.Shared.Next(50, 100),
                        SubscriptionTier.Basic => Random.Shared.Next(20, 40),
                        SubscriptionTier.Free => Random.Shared.Next(5, 15),
                        _ => Random.Shared.Next(0, 5)
                    };
                    
                    usage = new UserSearchUsage
                    {
                        UserId = userId,
                        Date = today,
                        SearchCount = mockSearchCount,
                        ResultsViewed = mockSearchCount * 3,
                        LastSearchAt = DateTime.UtcNow.AddHours(-Random.Shared.Next(1, 8)),
                        CreatedAt = DateTime.UtcNow,
                        UpdatedAt = DateTime.UtcNow
                    };
                }

                _cache.Set(cacheKey, usage, _usageCacheExpiry);
            }

            return usage;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting today's usage for user {UserId}", userId);
            return new UserSearchUsage 
            { 
                UserId = userId, 
                Date = DateTime.UtcNow.Date, 
                SearchCount = Random.Shared.Next(0, 10),
                ResultsViewed = Random.Shared.Next(0, 30)
            };
        }
    }

    /// <summary>
    /// Get paywall analytics for reporting and insights
    /// </summary>
    /// <param name="startDate">Start date for analytics</param>
    /// <param name="endDate">End date for analytics</param>
    /// <param name="userId">Optional user filter</param>
    /// <param name="eventType">Optional event type filter</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Paywall analytics data</returns>
    public async Task<PaywallAnalyticsResult> GetPaywallAnalyticsAsync(
        DateTime startDate,
        DateTime endDate,
        Guid? userId = null,
        PaywallEvent? eventType = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var query = _context.PaywallAnalytics
                .Where(pa => pa.Timestamp >= startDate && pa.Timestamp <= endDate);

            if (userId.HasValue)
            {
                query = query.Where(pa => pa.UserId == userId.Value);
            }

            if (eventType.HasValue)
            {
                query = query.Where(pa => pa.EventType == eventType.Value);
            }

            var analytics = await query
                .GroupBy(pa => new { pa.EventType, pa.UserTier })
                .Select(g => new PaywallAnalyticsGrouping
                {
                    EventType = g.Key.EventType,
                    UserTier = g.Key.UserTier,
                    Count = g.Count(),
                    Period = startDate.ToString("yyyy-MM-dd") + " to " + endDate.ToString("yyyy-MM-dd")
                })
                .ToListAsync(cancellationToken);

            var totalEvents = analytics.Sum(a => a.Count);
            var conversionEvents = analytics.Where(a => a.EventType == PaywallEvent.ConversionCompleted).Sum(a => a.Count);
            var conversionRate = totalEvents > 0 ? (decimal)conversionEvents / totalEvents * 100 : 0;

            return new PaywallAnalyticsResult
            {
                StartDate = startDate,
                EndDate = endDate,
                TotalEvents = totalEvents,
                ConversionRate = conversionRate,
                EventGroupings = analytics,
                GeneratedAt = DateTime.UtcNow
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting paywall analytics for period {StartDate} to {EndDate}", startDate, endDate);
            throw;
        }
    }
}

/// <summary>
/// Paywall analytics result container
/// </summary>
public class PaywallAnalyticsResult
{
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public int TotalEvents { get; set; }
    public decimal ConversionRate { get; set; }
    public List<PaywallAnalyticsGrouping> EventGroupings { get; set; } = new();
    public DateTime GeneratedAt { get; set; }
}

/// <summary>
/// Grouped analytics data
/// </summary>
public class PaywallAnalyticsGrouping
{
    public PaywallEvent EventType { get; set; }
    public SubscriptionTier UserTier { get; set; }
    public int Count { get; set; }
    public string Period { get; set; } = string.Empty;
}