using GeoLeap.Api.Models;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Caching.Distributed;
using System.Diagnostics;
using System.Text.Json;

namespace GeoLeap.Api.Services;

public class RankingService : IRankingService
{
    private readonly ILogger<RankingService> _logger;
    private readonly IFuzzyMatchingService _fuzzyMatchingService;
    private readonly IMemoryCache _memoryCache;
    private readonly IDistributedCache _distributedCache;
    private readonly IPopularContentService _popularContentService;
    private readonly IABTestingService _abTestingService;
    
    private static readonly RankingConfiguration DefaultConfiguration = new();
    private static readonly TimeSpan CacheExpiry = TimeSpan.FromMinutes(15);
    
    private static readonly List<string> CommonTitles = new()
    {
        "Avatar", "Titanic", "The Matrix", "Star Wars", "Lord of the Rings",
        "Harry Potter", "Marvel", "DC", "Batman", "Superman", "Spider-Man"
    };

    public RankingService(
        ILogger<RankingService> logger,
        IFuzzyMatchingService fuzzyMatchingService,
        IMemoryCache memoryCache,
        IDistributedCache distributedCache,
        IPopularContentService popularContentService,
        IABTestingService abTestingService)
    {
        _logger = logger;
        _fuzzyMatchingService = fuzzyMatchingService;
        _memoryCache = memoryCache;
        _distributedCache = distributedCache;
        _popularContentService = popularContentService;
        _abTestingService = abTestingService;
    }

    public async Task<RankingResponse> RankSearchResultsAsync(RankingRequest request, CancellationToken cancellationToken = default)
    {
        var stopwatch = Stopwatch.StartNew();
        var correlationId = Guid.NewGuid().ToString();
        
        try
        {
            _logger.LogInformation("Starting ranking computation for {ResultCount} results with correlation {CorrelationId}", 
                request.Results.Count, correlationId);

            // Get A/B test configuration for the user if no specific configuration provided
            var configuration = request.Configuration;
            if (configuration == null && !string.IsNullOrEmpty(request.UserId))
            {
                try
                {
                    configuration = await _abTestingService.GetRankingConfigurationForUserAsync(request.UserId, cancellationToken);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to get A/B test configuration for user {UserId}, using default", request.UserId);
                    configuration = DefaultConfiguration;
                }
            }
            
            configuration ??= DefaultConfiguration;
            configuration.Normalize();

            var rankedResults = new List<RankedSearchResult>();
            var warnings = new List<string>();
            var dataSources = new HashSet<string>();

            var rankingTasks = request.Results.Select(async result =>
            {
                var rankingScore = await CalculateRankingScoreAsync(
                    result, request.Query, request.UserId, configuration, cancellationToken);
                
                return new RankedSearchResult
                {
                    Content = result,
                    Ranking = rankingScore,
                    Position = 0 // Will be set after sorting
                };
            });

            var results = await Task.WhenAll(rankingTasks);
            rankedResults.AddRange(results);

            rankedResults = rankedResults
                .OrderByDescending(r => r.Ranking.TotalScore)
                .Take(request.MaxResults)
                .ToList();

            for (var i = 0; i < rankedResults.Count; i++)
            {
                rankedResults[i].Position = i + 1;
            }

            stopwatch.Stop();

            _logger.LogInformation("Ranking computation completed for {CorrelationId} in {ComputationTimeMs}ms with {ResultCount} results", 
                correlationId, stopwatch.ElapsedMilliseconds, rankedResults.Count);

            return new RankingResponse
            {
                Results = rankedResults,
                Metadata = new RankingMetadata
                {
                    TotalResults = rankedResults.Count,
                    ComputationTime = stopwatch.Elapsed,
                    UsedConfiguration = configuration,
                    DataSources = dataSources.ToList(),
                    Warnings = warnings
                }
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during ranking computation for {CorrelationId}", correlationId);
            throw;
        }
    }

    public async Task<RelevanceScore> CalculateRelevanceScoreAsync(GlobalSearchResult result, string query, CancellationToken cancellationToken = default)
    {
        var cacheKey = $"relevance:{result.Id}:{query.GetHashCode()}";
        if (_memoryCache.TryGetValue(cacheKey, out RelevanceScore? cached))
            return cached!;

        var score = new RelevanceScore();
        var queryLower = query.ToLowerInvariant().Trim();
        var titleLower = result.Title.ToLowerInvariant();
        var originalTitleLower = result.OriginalTitle?.ToLowerInvariant() ?? titleLower;

        if (titleLower == queryLower)
        {
            score.Score = 1.0m;
            score.IsExactMatch = true;
            score.MatchedFields.Add("Title (Exact)");
        }
        else if (titleLower.StartsWith(queryLower))
        {
            score.Score = 0.9m;
            score.MatchedFields.Add("Title (Prefix)");
        }
        else if (titleLower.Contains(queryLower))
        {
            score.Score = 0.8m;
            score.MatchedFields.Add("Title (Contains)");
        }
        else
        {
            var fuzzyMatch = _fuzzyMatchingService.CalculateOverallSimilarity(queryLower, titleLower);
            if (fuzzyMatch.Similarity >= 0.7m)
            {
                score.Score = fuzzyMatch.Similarity * 0.7m;
                score.IsFuzzyMatch = true;
                score.EditDistance = fuzzyMatch.LevenshteinDistance;
                score.MatchedFields.Add("Title (Fuzzy)");
            }
        }

        if (originalTitleLower != titleLower && originalTitleLower.Contains(queryLower))
        {
            score.Score = Math.Max(score.Score, 0.6m);
            score.MatchedFields.Add("Original Title");
        }

        if (result.Overview?.ToLowerInvariant().Contains(queryLower) == true)
        {
            score.Score += 0.1m;
            score.MatchedFields.Add("Overview");
        }

        score.Score = Math.Min(score.Score, 1.0m);

        // Cache the result if caching is available
        try
        {
            using var entry = _memoryCache.CreateEntry(cacheKey);
            if (entry != null)
            {
                entry.Value = score;
                entry.AbsoluteExpirationRelativeToNow = CacheExpiry;
            }
        }
        catch
        {
            // Ignore caching errors in tests
        }
        return score;
    }

    public async Task<PopularityScore> CalculatePopularityScoreAsync(GlobalSearchResult result, CancellationToken cancellationToken = default)
    {
        var cacheKey = $"popularity:{result.Id}";
        if (_memoryCache.TryGetValue(cacheKey, out PopularityScore? cached))
            return cached!;

        var score = new PopularityScore();

        try
        {
            var popularityData = await GetContentPopularityDataAsync(result.Id, cancellationToken);
            
            score.TmdbPopularity = popularityData.TmdbPopularity;
            score.ImdbRating = popularityData.ImdbRating;
            score.InternalSearchCount = popularityData.SearchFrequency;

            var normalizedTmdbScore = Math.Min(popularityData.TmdbPopularity / 1000m, 1.0m);
            var normalizedImdbScore = popularityData.ImdbRating / 10m;
            var normalizedSearchScore = Math.Min(popularityData.SearchFrequency / 10000m, 1.0m);

            score.Score = (normalizedTmdbScore * 0.4m) + 
                         (normalizedImdbScore * 0.4m) + 
                         (normalizedSearchScore * 0.2m);

            if (result.Rating.HasValue)
            {
                var ratingBonus = Math.Min((decimal)(result.Rating.Value / 10.0 * 0.2), 0.2m);
                score.Score = Math.Min(score.Score + ratingBonus, 1.0m);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to calculate popularity score for content {ContentId}", result.Id);
            score.Score = result.Rating.HasValue ? Math.Min((decimal)(result.Rating.Value / 10.0), 1.0m) : 0.5m;
        }

        // Cache the result if caching is available
        try
        {
            using var entry = _memoryCache.CreateEntry(cacheKey);
            if (entry != null)
            {
                entry.Value = score;
                entry.AbsoluteExpirationRelativeToNow = CacheExpiry;
            }
        }
        catch
        {
            // Ignore caching errors in tests
        }
        return score;
    }

    public async Task<AvailabilityScore> CalculateAvailabilityScoreAsync(GlobalSearchResult result, CancellationToken cancellationToken = default)
    {
        var score = new AvailabilityScore
        {
            ServiceCount = result.StreamingOptions?.Count ?? 0,
            CountryCount = result.AvailableCountries,
            StreamingTypes = result.StreamingOptions?.Select(so => so.Type.ToString()).Distinct().ToList() ?? new List<string>()
        };

        var serviceScore = Math.Min(score.ServiceCount / 20m, 1.0m);
        var countryScore = Math.Min(score.CountryCount / 50m, 1.0m);
        var typeBonus = score.StreamingTypes.Contains("Subscription") ? 0.2m : 0.0m;
        
        score.IsGloballyAvailable = score.CountryCount >= 30;
        if (score.IsGloballyAvailable) typeBonus += 0.1m;

        score.Score = (serviceScore * 0.6m) + (countryScore * 0.3m) + (typeBonus * 0.1m);
        
        return score;
    }

    public async Task<FreshnessScore> CalculateFreshnessScoreAsync(GlobalSearchResult result, CancellationToken cancellationToken = default)
    {
        var score = new FreshnessScore();
        
        if (!result.Year.HasValue)
        {
            score.Score = 0.5m;
            return score;
        }

        var releaseYear = result.Year.Value;
        var currentYear = DateTime.Now.Year;
        var ageInYears = currentYear - releaseYear;
        
        score.ReleaseDate = new DateTime(releaseYear, 1, 1);
        score.AgeInMonths = ageInYears * 12;

        if (ageInYears <= 1)
        {
            score.Score = 1.0m;
            score.IsTrending = true;
        }
        else if (ageInYears <= 3)
        {
            score.Score = 0.8m;
        }
        else if (ageInYears <= 10)
        {
            score.Score = Math.Max(0.3m, 1.0m - (ageInYears / 20m));
        }
        else
        {
            score.Score = 0.2m;
            if (IsClassicContent(result))
            {
                score.Score = 0.5m;
            }
        }

        var currentMonth = DateTime.Now.Month;
        if (IsSeasonalContent(result, currentMonth))
        {
            score.IsSeasonalContent = true;
            score.Score = Math.Min(score.Score + 0.2m, 1.0m);
        }

        return score;
    }

    public async Task<PersonalizationScore> CalculatePersonalizationScoreAsync(GlobalSearchResult result, string? userId, CancellationToken cancellationToken = default)
    {
        var score = new PersonalizationScore();
        
        if (string.IsNullOrEmpty(userId))
        {
            score.Score = 0.5m;
            return score;
        }

        try
        {
            var preferences = await GetUserPreferencesAsync(userId, cancellationToken);
            
            score.UserPreferredGenres = preferences.PreferredGenres;
            score.UserPreferredServices = preferences.PreferredServices;

            var genreMatches = result.Genres?.Intersect(preferences.PreferredGenres, StringComparer.OrdinalIgnoreCase).Count() ?? 0;
            var totalGenres = Math.Max(result.Genres?.Count ?? 1, 1);
            score.GenreMatchScore = (decimal)genreMatches / totalGenres;

            var availableServices = result.StreamingOptions?.Select(so => so.ServiceName).Where(s => !string.IsNullOrEmpty(s)).ToList() ?? new List<string>();
            var serviceMatches = availableServices.Intersect(preferences.PreferredServices, StringComparer.OrdinalIgnoreCase).Count();
            var totalServices = Math.Max(availableServices.Count, 1);
            score.ServiceMatchScore = (decimal)serviceMatches / totalServices;

            var contentTypeMatch = preferences.PreferredContentType == ContentType.All || 
                                  preferences.PreferredContentType == result.Type ? 0.2m : 0.0m;

            score.Score = (score.GenreMatchScore * 0.5m) + 
                         (score.ServiceMatchScore * 0.3m) + 
                         contentTypeMatch;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to calculate personalization score for user {UserId}", userId);
            score.Score = 0.5m;
        }

        return score;
    }

    public async Task<ClickThroughRateScore> CalculateClickThroughRateScoreAsync(GlobalSearchResult result, string query, CancellationToken cancellationToken = default)
    {
        var cacheKey = $"ctr:{result.Id}:{query.GetHashCode()}";
        if (_memoryCache.TryGetValue(cacheKey, out ClickThroughRateScore? cached))
            return cached!;

        var score = new ClickThroughRateScore();

        try
        {
            var popularityData = await GetContentPopularityDataAsync(result.Id, cancellationToken);
            
            score.TotalViews = popularityData.ViewCount;
            score.TotalClicks = popularityData.ClickCount;
            
            if (score.TotalViews > 0)
            {
                score.ClickThroughRate = (decimal)score.TotalClicks / score.TotalViews;
                score.Score = Math.Min(score.ClickThroughRate * 2m, 1.0m); // Scale CTR to 0-1
            }
            else
            {
                score.Score = 0.5m; // Default for new content
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to calculate CTR score for content {ContentId}", result.Id);
            score.Score = 0.5m;
        }

        // Cache the result if caching is available
        try
        {
            using var entry = _memoryCache.CreateEntry(cacheKey);
            if (entry != null)
            {
                entry.Value = score;
                entry.AbsoluteExpirationRelativeToNow = CacheExpiry;
            }
        }
        catch
        {
            // Ignore caching errors in tests
        }
        return score;
    }

    public async Task<List<FuzzyMatchResult>> FindFuzzyMatchesAsync(string query, List<string> candidates, decimal threshold = 0.8m, CancellationToken cancellationToken = default)
    {
        return _fuzzyMatchingService.FindBestMatches(query, candidates, threshold);
    }

    public async Task<TypoCorrection> SuggestTypoCorrectionAsync(string query, CancellationToken cancellationToken = default)
    {
        return _fuzzyMatchingService.SuggestCorrection(query, CommonTitles);
    }

    public async Task<UserPreferences> GetUserPreferencesAsync(string userId, CancellationToken cancellationToken = default)
    {
        var cacheKey = $"user_prefs:{userId}";
        
        try
        {
            var cachedBytes = await _distributedCache.GetAsync(cacheKey, cancellationToken);
            if (cachedBytes != null)
            {
                var cachedJson = System.Text.Encoding.UTF8.GetString(cachedBytes);
                return JsonSerializer.Deserialize<UserPreferences>(cachedJson) ?? new UserPreferences { UserId = userId };
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to retrieve user preferences from cache for user {UserId}", userId);
        }

        return new UserPreferences { UserId = userId };
    }

    public async Task UpdateUserPreferencesAsync(string userId, UserPreferences preferences, CancellationToken cancellationToken = default)
    {
        var cacheKey = $"user_prefs:{userId}";
        
        try
        {
            var json = JsonSerializer.Serialize(preferences);
            var jsonBytes = System.Text.Encoding.UTF8.GetBytes(json);
            await _distributedCache.SetAsync(cacheKey, jsonBytes, new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(24)
            }, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update user preferences for user {UserId}", userId);
        }
    }

    public async Task RecordSearchInteractionAsync(string userId, string query, string contentId, bool wasClicked, CancellationToken cancellationToken = default)
    {
        try
        {
            var popularityData = await GetContentPopularityDataAsync(contentId, cancellationToken);
            
            popularityData.ViewCount++;
            if (wasClicked)
            {
                popularityData.ClickCount++;
            }
            popularityData.SearchFrequency++;
            popularityData.LastUpdated = DateTime.UtcNow;

            await UpdateContentPopularityAsync(contentId, popularityData, cancellationToken);

            _logger.LogInformation("Recorded search interaction for user {UserId}, content {ContentId}, clicked: {WasClicked}", 
                userId, contentId, wasClicked);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to record search interaction for content {ContentId}", contentId);
        }
    }

    public async Task<ContentPopularityData> GetContentPopularityDataAsync(string contentId, CancellationToken cancellationToken = default)
    {
        var cacheKey = $"content_popularity:{contentId}";
        
        try
        {
            var cachedBytes = await _distributedCache.GetAsync(cacheKey, cancellationToken);
            if (cachedBytes != null)
            {
                var cachedJson = System.Text.Encoding.UTF8.GetString(cachedBytes);
                return JsonSerializer.Deserialize<ContentPopularityData>(cachedJson) ?? new ContentPopularityData { ContentId = contentId };
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to retrieve content popularity from cache for content {ContentId}", contentId);
        }

        return new ContentPopularityData { ContentId = contentId };
    }

    public async Task UpdateContentPopularityAsync(string contentId, ContentPopularityData popularityData, CancellationToken cancellationToken = default)
    {
        var cacheKey = $"content_popularity:{contentId}";
        
        try
        {
            var json = JsonSerializer.Serialize(popularityData);
            var jsonBytes = System.Text.Encoding.UTF8.GetBytes(json);
            await _distributedCache.SetAsync(cacheKey, jsonBytes, new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(6)
            }, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update content popularity for content {ContentId}", contentId);
        }
    }

    private async Task<RankingScore> CalculateRankingScoreAsync(GlobalSearchResult result, string query, string? userId, RankingConfiguration config, CancellationToken cancellationToken)
    {
        var relevanceTask = CalculateRelevanceScoreAsync(result, query, cancellationToken);
        var popularityTask = CalculatePopularityScoreAsync(result, cancellationToken);
        var availabilityTask = CalculateAvailabilityScoreAsync(result, cancellationToken);
        var freshnessTask = CalculateFreshnessScoreAsync(result, cancellationToken);
        var personalizationTask = CalculatePersonalizationScoreAsync(result, userId, cancellationToken);
        var ctrTask = CalculateClickThroughRateScoreAsync(result, query, cancellationToken);

        await Task.WhenAll(relevanceTask, popularityTask, availabilityTask, freshnessTask, personalizationTask, ctrTask);

        var relevance = await relevanceTask;
        var popularity = await popularityTask;
        var availability = await availabilityTask;
        var freshness = await freshnessTask;
        var personalization = await personalizationTask;
        var ctr = await ctrTask;

        var totalScore = (relevance.Score * config.RelevanceWeight) +
                        (popularity.Score * config.PopularityWeight) +
                        (availability.Score * config.AvailabilityWeight) +
                        (freshness.Score * config.FreshnessWeight) +
                        (personalization.Score * config.PersonalizationWeight) +
                        (ctr.Score * config.ClickThroughRateWeight);

        var explanationFactors = new List<string>();
        
        if (relevance.IsExactMatch) explanationFactors.Add("Exact title match");
        if (availability.IsGloballyAvailable) explanationFactors.Add("Globally available");
        if (freshness.IsTrending) explanationFactors.Add("Recent release");
        if (popularity.Score > 0.8m) explanationFactors.Add("Highly popular");

        return new RankingScore
        {
            TotalScore = totalScore,
            Relevance = relevance,
            Popularity = popularity,
            Availability = availability,
            Freshness = freshness,
            Personalization = personalization,
            ClickThroughRate = ctr,
            ExplanationFactors = explanationFactors
        };
    }

    private bool IsClassicContent(GlobalSearchResult result)
    {
        if (!result.Rating.HasValue || result.Rating.Value < 7.5) return false;
        
        var ageInYears = DateTime.Now.Year - (result.Year ?? DateTime.Now.Year);
        return ageInYears >= 20;
    }

    private bool IsSeasonalContent(GlobalSearchResult result, int currentMonth)
    {
        var title = result.Title.ToLowerInvariant();
        
        return currentMonth switch
        {
            12 or 1 => title.Contains("christmas") || title.Contains("holiday") || title.Contains("winter"),
            10 => title.Contains("halloween") || title.Contains("horror") || title.Contains("scary"),
            2 => title.Contains("valentine") || title.Contains("romantic") || title.Contains("love"),
            _ => false
        };
    }
}