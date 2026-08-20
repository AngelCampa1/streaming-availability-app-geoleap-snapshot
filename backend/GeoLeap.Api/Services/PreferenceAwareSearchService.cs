using GeoLeap.Api.Models;
using GeoLeap.Api.Data;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.EntityFrameworkCore;
using System.Diagnostics;

namespace GeoLeap.Api.Services;

/// <summary>
/// Preference-aware search service that integrates user preferences with search results
/// Extends the existing SearchService with personalization capabilities
/// </summary>
public interface IPreferenceAwareSearchService
{
    Task<GlobalSearchResponse> SearchWithPreferencesAsync(
        GlobalSearchRequest request, 
        string correlationId,
        Guid? userId = null,
        CancellationToken cancellationToken = default);
    
    Task<GlobalSearchResponse> SearchPersonalizedContentAsync(
        string query,
        Guid userId,
        int page = 1,
        int pageSize = 20,
        CancellationToken cancellationToken = default);
    
    Task<List<SearchSuggestion>> GetPersonalizedSuggestionsAsync(
        string query,
        Guid userId,
        CancellationToken cancellationToken = default);
}

public class PreferenceAwareSearchService : IPreferenceAwareSearchService
{
    private readonly ISearchService _searchService;
    private readonly IUserPreferenceIntegrationService _preferenceService;
    private readonly IAdvancedFilterService _filterService;
    private readonly ILogger<PreferenceAwareSearchService> _logger;
    private readonly IMemoryCache _cache;
    
    private readonly TimeSpan _personalizedResultsCacheExpiration = TimeSpan.FromMinutes(10);

    public PreferenceAwareSearchService(
        ISearchService searchService,
        IUserPreferenceIntegrationService preferenceService,
        IAdvancedFilterService filterService,
        ILogger<PreferenceAwareSearchService> logger,
        IMemoryCache cache)
    {
        _searchService = searchService;
        _preferenceService = preferenceService;
        _filterService = filterService;
        _logger = logger;
        _cache = cache;
    }

    public async Task<GlobalSearchResponse> SearchWithPreferencesAsync(
        GlobalSearchRequest request, 
        string correlationId,
        Guid? userId = null,
        CancellationToken cancellationToken = default)
    {
        var stopwatch = Stopwatch.StartNew();
        
        try
        {
            _logger.LogInformation("Starting preference-aware search for user {UserId}", userId);

            // If no user ID provided, fall back to regular search
            if (!userId.HasValue)
            {
                return await _searchService.SearchGlobalContentAsync(request, correlationId, null, cancellationToken);
            }

            // Get user preferences in parallel
            var preferencesTask = GetUserSearchPreferencesAsync(userId.Value);
            var baseSearchTask = _searchService.SearchGlobalContentAsync(request, correlationId, userId.ToString(), cancellationToken);

            await Task.WhenAll(preferencesTask, baseSearchTask);

            var preferences = await preferencesTask;
            var baseResponse = await baseSearchTask;

            _logger.LogInformation("Base search returned {ResultCount} results for query '{Query}'", 
                baseResponse.Results.Count, request.Query);

            // Apply preference-based result enhancement
            var enhancedResponse = await ApplyUserPreferencesToResultsAsync(
                baseResponse, preferences, userId.Value, correlationId, cancellationToken);

            _logger.LogInformation("Enhanced search returned {ResultCount} results after preferences applied", 
                enhancedResponse.Results.Count);

            stopwatch.Stop();
            
            _logger.LogInformation("Preference-aware search completed in {ElapsedMs}ms for user {UserId}", 
                stopwatch.ElapsedMilliseconds, userId);

            return enhancedResponse;
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            _logger.LogError(ex, "Error in preference-aware search for user {UserId}", userId);
            
            // Fallback to regular search on error
            return await _searchService.SearchGlobalContentAsync(request, correlationId, userId?.ToString(), cancellationToken);
        }
    }

    public async Task<GlobalSearchResponse> SearchPersonalizedContentAsync(
        string query,
        Guid userId,
        int page = 1,
        int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        var cacheKey = $"personalized_search:{userId}:{query}:{page}:{pageSize}";
        
        if (_cache.TryGetValue(cacheKey, out GlobalSearchResponse cachedResponse))
        {
            _logger.LogDebug("Returning cached personalized search results for user {UserId}", userId);
            return cachedResponse;
        }

        try
        {
            // Get user preferences
            var preferences = await GetUserSearchPreferencesAsync(userId);
            
            // Build request with user preferences applied
            var request = await BuildPersonalizedSearchRequestAsync(query, preferences, page, pageSize);
            
            // Execute search with preferences
            var response = await SearchWithPreferencesAsync(
                request, 
                Guid.NewGuid().ToString(), 
                userId, 
                cancellationToken);

            // Cache the personalized results
            _cache.Set(cacheKey, response, _personalizedResultsCacheExpiration);

            _logger.LogInformation("Personalized search completed for user {UserId}, query: {Query}, results: {Count}", 
                userId, query, response.Results.Count);

            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in personalized content search for user {UserId}", userId);
            
            // Fallback to basic search
            var fallbackRequest = new GlobalSearchRequest
            {
                Query = query,
                Page = page,
                PageSize = pageSize
            };
            
            return await _searchService.SearchGlobalContentAsync(
                fallbackRequest, 
                Guid.NewGuid().ToString(), 
                userId.ToString(), 
                cancellationToken);
        }
    }

    public async Task<List<SearchSuggestion>> GetPersonalizedSuggestionsAsync(
        string query,
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // Get user preferences
            var preferences = await GetUserSearchPreferencesAsync(userId);
            
            // Get base suggestions
            var baseSuggestions = await _searchService.GetSearchSuggestionsAsync(
                query, Guid.NewGuid().ToString(), cancellationToken);

            // Enhance suggestions with user preferences
            var personalizedSuggestions = await EnhanceSuggestionsWithPreferencesAsync(
                baseSuggestions, preferences, cancellationToken);

            _logger.LogDebug("Generated {Count} personalized suggestions for user {UserId}", 
                personalizedSuggestions.Count, userId);

            return personalizedSuggestions;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating personalized suggestions for user {UserId}", userId);
            
            // Fallback to regular suggestions
            return await _searchService.GetSearchSuggestionsAsync(
                query, Guid.NewGuid().ToString(), cancellationToken);
        }
    }

    private async Task<UserSearchPreferences> GetUserSearchPreferencesAsync(Guid userId)
    {
        var searchPrefs = await _preferenceService.GetSearchPreferencesAsync(userId);
        var contentPrefs = await _preferenceService.GetContentFilterPreferencesAsync(userId);
        var geoPrefs = await _preferenceService.GetGeographicPreferencesAsync(userId);
        var privacyPrefs = await _preferenceService.GetPrivacyPreferencesAsync(userId);

        return new UserSearchPreferences
        {
            SearchPreferences = searchPrefs,
            ContentFilterPreferences = contentPrefs,
            GeographicPreferences = geoPrefs,
            PrivacyPreferences = privacyPrefs
        };
    }

    private async Task<GlobalSearchRequest> BuildPersonalizedSearchRequestAsync(
        string query, 
        UserSearchPreferences preferences, 
        int page, 
        int pageSize)
    {
        var request = new GlobalSearchRequest
        {
            Query = query,
            Page = page,
            PageSize = Math.Min(pageSize, preferences.SearchPreferences.ResultsPerPage),
            ContentType = preferences.SearchPreferences.DefaultContentType,
            SortBy = preferences.SearchPreferences.DefaultSortBy,
            SortDirection = SortDirection.Descending
        };

        // Apply content filtering preferences
        if (preferences.ContentFilterPreferences.MaxContentRating != "R")
        {
            request.ContentRatings = GetAllowedContentRatings(preferences.ContentFilterPreferences.MaxContentRating);
        }

        if (preferences.ContentFilterPreferences.ExcludedGenres.Any())
        {
            // If user has preferred genres, use those; otherwise exclude unwanted ones
            if (preferences.SearchPreferences.PreferredGenres.Any())
            {
                request.Genres = preferences.SearchPreferences.PreferredGenres
                    .Except(preferences.ContentFilterPreferences.ExcludedGenres)
                    .ToList();
            }
            // Note: Excluding genres is handled in the filtering logic
        }
        else if (preferences.SearchPreferences.PreferredGenres.Any())
        {
            request.Genres = preferences.SearchPreferences.PreferredGenres;
        }

        // Apply preferred services
        if (preferences.SearchPreferences.PreferredServices.Any())
        {
            request.Services = preferences.SearchPreferences.PreferredServices;
        }

        // Apply rating filters
        if (preferences.SearchPreferences.MinRating.HasValue)
        {
            request.MinRating = preferences.SearchPreferences.MinRating.Value;
        }
        
        if (preferences.SearchPreferences.MaxRating.HasValue)
        {
            request.MaxRating = preferences.SearchPreferences.MaxRating.Value;
        }

        if (preferences.ContentFilterPreferences.MinimumRating.HasValue)
        {
            request.MinRating = Math.Max(
                request.MinRating ?? 0, 
                preferences.ContentFilterPreferences.MinimumRating.Value);
        }

        // Apply language preferences
        if (preferences.ContentFilterPreferences.PreferredLanguages.Any())
        {
            request.AudioLanguages = preferences.ContentFilterPreferences.PreferredLanguages;
        }

        // Apply geographic preferences
        if (!preferences.GeographicPreferences.ShowGlobalContent)
        {
            var allowedRegions = new List<string> { preferences.GeographicPreferences.PrimaryRegion };
            allowedRegions.AddRange(preferences.GeographicPreferences.AdditionalRegions);
            request.Countries = allowedRegions.Distinct().ToList();
        }

        // Apply free content preference
        if (preferences.SearchPreferences.PreferFreeContent)
        {
            request.FreeContentOnly = true;
        }

        // Apply HD content preference
        if (preferences.ContentFilterPreferences.PreferHDContent)
        {
            request.VideoQualities = new List<string> { "HD", "4K", "UHD" };
        }

        // Apply adult content filtering
        if (preferences.SearchPreferences.ExcludeAdultContent || 
            preferences.ContentFilterPreferences.HideExplicitContent)
        {
            request.ExcludeAdultContent = true;
        }

        return request;
    }

    private async Task<GlobalSearchResponse> ApplyUserPreferencesToResultsAsync(
        GlobalSearchResponse baseResponse,
        UserSearchPreferences preferences,
        Guid userId,
        string correlationId,
        CancellationToken cancellationToken)
    {
        try
        {
            // Apply content filtering
            var filteredResults = ApplyContentFiltering(baseResponse.Results, preferences.ContentFilterPreferences);
            
            // Apply personalized ranking
            var rankedResults = await ApplyPersonalizedRankingAsync(filteredResults, preferences, userId);
            
            // Update response with enhanced results
            baseResponse.Results = rankedResults;
            baseResponse.TotalResults = rankedResults.Count;

            // Add personalization metadata
            baseResponse.Metadata.PersonalizationApplied = true;
            baseResponse.Metadata.PreferenceFiltersApplied = GetAppliedPreferenceFilters(preferences);

            return baseResponse;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error applying user preferences to search results for user {UserId}", userId);
            return baseResponse; // Return original results on error
        }
    }

    private List<ContentSummary> ApplyContentFiltering(
        List<ContentSummary> results, 
        ContentFilterPreferences contentPrefs)
    {
        if (results == null || results.Count == 0)
        {
            _logger.LogWarning("No results to filter - returning empty list");
            return new List<ContentSummary>();
        }

        var filtered = results.AsEnumerable();

        _logger.LogDebug("Starting content filtering with {OriginalCount} results", results.Count);

        // Filter by excluded genres
        if (contentPrefs.ExcludedGenres.Any())
        {
            var beforeGenreFilter = filtered.Count();
            filtered = filtered.Where(r => r.Genres == null || !r.Genres.Any(g => 
                contentPrefs.ExcludedGenres.Contains(g, StringComparer.OrdinalIgnoreCase)));
            
            var afterGenreFilter = filtered.Count();
            _logger.LogDebug("Genre filter: {Before} -> {After} results (excluded: {ExcludedGenres})", 
                beforeGenreFilter, afterGenreFilter, string.Join(", ", contentPrefs.ExcludedGenres));
        }

        // Filter by minimum rating
        if (contentPrefs.MinimumRating.HasValue)
        {
            var beforeRatingFilter = filtered.Count();
            filtered = filtered.Where(r => r.Rating.HasValue && r.Rating >= contentPrefs.MinimumRating.Value);
            
            var afterRatingFilter = filtered.Count();
            _logger.LogDebug("Rating filter: {Before} -> {After} results (min rating: {MinRating})", 
                beforeRatingFilter, afterRatingFilter, contentPrefs.MinimumRating.Value);
        }

        // Filter by preferred languages
        if (contentPrefs.PreferredLanguages.Any() && !contentPrefs.PreferredLanguages.Contains("any"))
        {
            var beforeLanguageFilter = filtered.Count();
            filtered = filtered.Where(r => string.IsNullOrEmpty(r.Language) || 
                contentPrefs.PreferredLanguages.Contains(r.Language, StringComparer.OrdinalIgnoreCase));
                
            var afterLanguageFilter = filtered.Count();
            _logger.LogDebug("Language filter: {Before} -> {After} results (preferred: {PreferredLanguages})", 
                beforeLanguageFilter, afterLanguageFilter, string.Join(", ", contentPrefs.PreferredLanguages));
        }

        var finalResults = filtered.ToList();
        _logger.LogInformation("Content filtering completed: {OriginalCount} -> {FilteredCount} results", 
            results.Count, finalResults.Count);

        return finalResults;
    }

    private async Task<List<ContentSummary>> ApplyPersonalizedRankingAsync(
        List<ContentSummary> results,
        UserSearchPreferences preferences,
        Guid userId)
    {
        try
        {
            var scoredResults = results.Select(result => new
            {
                Result = result,
                PersonalizationScore = CalculatePersonalizationScore(result, preferences)
            }).ToList();

            // Combine original relevance with personalization score
            var rankedResults = scoredResults
                .OrderByDescending(sr => (double)(sr.Result.Rating ?? 0) * 0.3 + sr.PersonalizationScore * 0.7)
                .Select(sr => sr.Result)
                .ToList();

            return rankedResults;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error applying personalized ranking for user {UserId}", userId);
            return results; // Return original order on error
        }
    }

    private double CalculatePersonalizationScore(ContentSummary content, UserSearchPreferences preferences)
    {
        double score = 0.0;

        // Genre preference boost
        if (preferences.SearchPreferences.PreferredGenres.Any())
        {
            var genreMatches = content.Genres.Count(g => 
                preferences.SearchPreferences.PreferredGenres.Contains(g, StringComparer.OrdinalIgnoreCase));
            score += genreMatches * 10.0;
        }

        // Language preference boost
        if (preferences.ContentFilterPreferences.PreferredLanguages.Any() && !string.IsNullOrEmpty(content.Language))
        {
            if (preferences.ContentFilterPreferences.PreferredLanguages.Contains(content.Language, StringComparer.OrdinalIgnoreCase))
            {
                score += 15.0;
            }
        }

        // Rating preference alignment
        if (preferences.SearchPreferences.MinRating.HasValue && content.Rating.HasValue)
        {
            if (content.Rating.Value >= preferences.SearchPreferences.MinRating.Value)
            {
                score += 8.0;
            }
        }

        // Free content preference
        if (preferences.SearchPreferences.PreferFreeContent)
        {
            // Boost free content (simplified logic)
            score += 5.0;
        }

        // HD content preference
        if (preferences.ContentFilterPreferences.PreferHDContent)
        {
            // Boost HD content (simplified logic)
            score += 3.0;
        }

        return score;
    }

    private async Task<List<SearchSuggestion>> EnhanceSuggestionsWithPreferencesAsync(
        List<SearchSuggestion> baseSuggestions,
        UserSearchPreferences preferences,
        CancellationToken cancellationToken)
    {
        var enhancedSuggestions = new List<SearchSuggestion>(baseSuggestions);

        // Add genre-based suggestions
        if (preferences.SearchPreferences.PreferredGenres.Any())
        {
            foreach (var genre in preferences.SearchPreferences.PreferredGenres.Take(3))
            {
                enhancedSuggestions.Add(new SearchSuggestion
                {
                    SuggestedQuery = $"best {genre.ToLower()} movies",
                    Type = SearchSuggestionType.PopularContent,
                    Reason = $"Based on your interest in {genre}",
                    ExpectedResults = 25
                });
            }
        }

        // Add service-based suggestions
        // FIXED: Week 1 Day 5 - Use FirstOrDefault to prevent exceptions when getting preferred service
        if (preferences.SearchPreferences.PreferredServices.Any())
        {
            var topService = preferences.SearchPreferences.PreferredServices.FirstOrDefault();
            if (!string.IsNullOrEmpty(topService))
            {
                enhancedSuggestions.Add(new SearchSuggestion
                {
                    SuggestedQuery = $"new on {topService}",
                    Type = SearchSuggestionType.PopularContent,
                    Reason = $"New content on your preferred service",
                    ExpectedResults = 20
                });
            }
        }

        // Sort by relevance and personalization
        return enhancedSuggestions
            .OrderByDescending(s => s.Type == SearchSuggestionType.PopularContent ? 1 : 0)
            .ThenByDescending(s => s.ExpectedResults)
            .Take(10)
            .ToList();
    }

    private List<string> GetAllowedContentRatings(string maxRating)
    {
        var allRatings = new[] { "G", "PG", "PG-13", "R", "NC-17" };
        var maxIndex = Array.IndexOf(allRatings, maxRating);
        
        if (maxIndex == -1) return allRatings.ToList();
        
        return allRatings.Take(maxIndex + 1).ToList();
    }

    private List<string> GetAppliedPreferenceFilters(UserSearchPreferences preferences)
    {
        var appliedFilters = new List<string>();

        if (preferences.SearchPreferences.PreferredGenres.Any())
            appliedFilters.Add("preferred_genres");
            
        if (preferences.SearchPreferences.PreferredServices.Any())
            appliedFilters.Add("preferred_services");
            
        if (preferences.SearchPreferences.MinRating.HasValue)
            appliedFilters.Add("min_rating");
            
        if (preferences.SearchPreferences.PreferFreeContent)
            appliedFilters.Add("free_content");
            
        if (preferences.ContentFilterPreferences.ExcludedGenres.Any())
            appliedFilters.Add("excluded_genres");
            
        if (preferences.ContentFilterPreferences.PreferredLanguages.Any())
            appliedFilters.Add("preferred_languages");
            
        if (!preferences.GeographicPreferences.ShowGlobalContent)
            appliedFilters.Add("geographic_restriction");

        return appliedFilters;
    }
}

/// <summary>
/// Combined user preferences for search operations
/// </summary>
public class UserSearchPreferences
{
    public SearchPreferences SearchPreferences { get; set; } = new();
    public ContentFilterPreferences ContentFilterPreferences { get; set; } = new();
    public GeographicPreferences GeographicPreferences { get; set; } = new();
    public PrivacyPreferences PrivacyPreferences { get; set; } = new();
}

/// <summary>
/// Extended search metadata with personalization information
/// </summary>
public class PersonalizedSearchMetadata : SearchMetadata
{
    public new bool PersonalizationApplied { get; set; }
    public new List<string> PreferenceFiltersApplied { get; set; } = new();
    public int PreferenceBoostCount { get; set; }
    public double PersonalizationScore { get; set; }
}