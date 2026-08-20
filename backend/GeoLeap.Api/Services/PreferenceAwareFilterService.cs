using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace GeoLeap.Api.Services;

/// <summary>
/// Extension to AdvancedFilterService that applies user preferences to filtering operations
/// </summary>
public interface IPreferenceAwareFilterService
{
    Task<GlobalSearchRequest> ApplyUserPreferencesToRequestAsync(
        GlobalSearchRequest request, 
        Guid userId, 
        string correlationId);
    
    Task<IQueryable<SearchableContent>> ApplyPreferenceFiltersAsync(
        IQueryable<SearchableContent> query, 
        Guid userId, 
        string correlationId);
    
    Task<FilterOptionsResponse> GetPersonalizedFilterOptionsAsync(
        FilterOptionsRequest request, 
        Guid userId, 
        string correlationId);
    
    Task<List<FilterSuggestion>> GeneratePersonalizedFilterSuggestionsAsync(
        GlobalSearchRequest request, 
        Guid userId, 
        int resultCount, 
        string correlationId);
}

public class PreferenceAwareFilterService : IPreferenceAwareFilterService
{
    private readonly IAdvancedFilterService _baseFilterService;
    private readonly IUserPreferenceIntegrationService _preferenceService;
    private readonly ILogger<PreferenceAwareFilterService> _logger;
    private readonly IMemoryCache _cache;
    private readonly ApplicationDbContext _context;
    
    private readonly TimeSpan _personalizedFilterCacheExpiration = TimeSpan.FromMinutes(20);

    public PreferenceAwareFilterService(
        IAdvancedFilterService baseFilterService,
        IUserPreferenceIntegrationService preferenceService,
        ILogger<PreferenceAwareFilterService> logger,
        IMemoryCache cache,
        ApplicationDbContext context)
    {
        _baseFilterService = baseFilterService;
        _preferenceService = preferenceService;
        _logger = logger;
        _cache = cache;
        _context = context;
    }

    public async Task<GlobalSearchRequest> ApplyUserPreferencesToRequestAsync(
        GlobalSearchRequest request, 
        Guid userId, 
        string correlationId)
    {
        try
        {
            _logger.LogInformation("Applying user preferences to search request for user {UserId}", userId);

            // Get user preferences
            var searchPrefs = await _preferenceService.GetSearchPreferencesAsync(userId);
            var contentPrefs = await _preferenceService.GetContentFilterPreferencesAsync(userId);
            var geoPrefs = await _preferenceService.GetGeographicPreferencesAsync(userId);
            var privacyPrefs = await _preferenceService.GetPrivacyPreferencesAsync(userId);

            // Create enhanced request
            var enhancedRequest = new GlobalSearchRequest
            {
                // Preserve original request values
                Query = request.Query,
                Page = request.Page,
                PageSize = Math.Min(request.PageSize, searchPrefs.ResultsPerPage),
                
                // Apply default content type if not specified
                ContentType = request.ContentType ?? searchPrefs.DefaultContentType,
                
                // Apply default sorting if not specified
                SortBy = string.IsNullOrEmpty(request.SortBy) ? searchPrefs.DefaultSortBy : request.SortBy,
                SortDirection = request.SortDirection,
                
                // Apply geographic preferences
                Region = request.Region ?? geoPrefs.PrimaryRegion,
                Countries = MergeCountryPreferences(request.Countries, geoPrefs),
                
                // Apply content filtering preferences
                ContentRatings = MergeContentRatings(request.ContentRatings, contentPrefs),
                Genres = MergeGenrePreferences(request.Genres, searchPrefs, contentPrefs),
                Services = MergeServicePreferences(request.Services, searchPrefs),
                
                // Apply rating preferences
                MinRating = ApplyMinRatingPreference(request.MinRating, searchPrefs, contentPrefs),
                MaxRating = request.MaxRating ?? searchPrefs.MaxRating,
                
                // Apply language preferences
                Language = request.Language ?? geoPrefs.PrimaryRegion.ToLower(),
                AudioLanguages = MergeLanguagePreferences(request.AudioLanguages, contentPrefs.PreferredLanguages),
                SubtitleLanguages = MergeLanguagePreferences(request.SubtitleLanguages, contentPrefs.PreferredLanguages),
                
                // Apply content quality preferences
                VideoQualities = ApplyVideoQualityPreferences(request.VideoQualities, contentPrefs),
                
                // Apply pricing preferences
                FreeContentOnly = request.FreeContentOnly || searchPrefs.PreferFreeContent,
                MinPrice = request.MinPrice,
                MaxPrice = request.MaxPrice,
                
                // Apply privacy and safety preferences
                IncludeAdult = request.IncludeAdult && 
                    !(searchPrefs.ExcludeAdultContent || contentPrefs.HideExplicitContent),
                
                // Apply availability preferences
                ExpiringBefore = contentPrefs.ExcludeExpiredContent ? DateTime.UtcNow : request.ExpiringBefore,
                
                // Preserve advanced filters
                YearFrom = request.YearFrom,
                YearTo = request.YearTo,
                MinRuntimeMinutes = request.MinRuntimeMinutes,
                MaxRuntimeMinutes = request.MaxRuntimeMinutes,
                Cast = request.Cast,
                Directors = request.Directors,
                Crew = request.Crew,
                
                // Apply filter combination modes with smart defaults
                GenreFilterMode = request.GenreFilterMode ?? GetSmartGenreFilterMode(searchPrefs, request.Genres),
                CountryFilterMode = request.CountryFilterMode ?? GetSmartCountryFilterMode(geoPrefs),
                ServiceFilterMode = request.ServiceFilterMode ?? "or", // Default to OR for services
                
                // Apply additional filters
                PopularityFilter = request.PopularityFilter,
                ReleasedAfter = request.ReleasedAfter,
                ReleasedBefore = request.ReleasedBefore,
                AddedToStreamingAfter = request.AddedToStreamingAfter,
                AvailabilityStatus = request.AvailabilityStatus,
                PlatformExclusives = request.PlatformExclusives,
                SubscriptionContentOnly = request.SubscriptionContentOnly
            };

            _logger.LogDebug("Applied user preferences to search request for user {UserId}", userId);
            return enhancedRequest;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error applying user preferences to search request for user {UserId}", userId);
            return request; // Return original request on error
        }
    }

    public async Task<IQueryable<SearchableContent>> ApplyPreferenceFiltersAsync(
        IQueryable<SearchableContent> query, 
        Guid userId, 
        string correlationId)
    {
        try
        {
            _logger.LogInformation("Applying preference filters for user {UserId}", userId);

            // Get user preferences
            var contentPrefs = await _preferenceService.GetContentFilterPreferencesAsync(userId);
            var searchPrefs = await _preferenceService.GetSearchPreferencesAsync(userId);
            var geoPrefs = await _preferenceService.GetGeographicPreferencesAsync(userId);

            var filteredQuery = query;

            // Apply content rating filter
            if (!string.IsNullOrEmpty(contentPrefs.MaxContentRating) && contentPrefs.MaxContentRating != "NC-17")
            {
                var allowedRatings = GetAllowedContentRatings(contentPrefs.MaxContentRating);
                filteredQuery = filteredQuery.Where(c => c.ContentRating == null || allowedRatings.Contains(c.ContentRating));
            }

            // Apply excluded genres filter
            if (contentPrefs.ExcludedGenres.Any())
            {
                foreach (var excludedGenre in contentPrefs.ExcludedGenres)
                {
                    filteredQuery = filteredQuery.Where(c => !c.SearchableGenres.Contains(excludedGenre));
                }
            }

            // Apply minimum rating filter
            if (contentPrefs.MinimumRating.HasValue)
            {
                filteredQuery = filteredQuery.Where(c => c.Rating >= contentPrefs.MinimumRating.Value);
            }

            // Apply language preferences
            if (contentPrefs.PreferredLanguages.Any() && !contentPrefs.PreferredLanguages.Contains("any"))
            {
                filteredQuery = filteredQuery.Where(c => 
                    string.IsNullOrEmpty(c.Language) || 
                    contentPrefs.PreferredLanguages.Contains(c.Language));
            }

            // Apply HD content preference
            if (contentPrefs.PreferHDContent)
            {
                filteredQuery = filteredQuery.Where(c => c.StreamingOptions.Any(so => 
                    so.VideoQualityJson.Contains("HD") || 
                    so.VideoQualityJson.Contains("4K") || 
                    so.VideoQualityJson.Contains("UHD")));
            }

            // Apply geographic content filtering
            if (!geoPrefs.ShowGlobalContent)
            {
                var allowedRegions = new List<string> { geoPrefs.PrimaryRegion };
                allowedRegions.AddRange(geoPrefs.AdditionalRegions);
                
                filteredQuery = filteredQuery.Where(c => c.StreamingOptions.Any(so => 
                    allowedRegions.Contains(so.CountryCode)));
            }

            // Apply free content preference
            if (searchPrefs.PreferFreeContent)
            {
                filteredQuery = filteredQuery.Where(c => c.StreamingOptions.Any(so => 
                    so.StreamingType == StreamingType.Free || 
                    so.StreamingType == StreamingType.Ads ||
                    so.StreamingType == StreamingType.Subscription));
            }

            // Apply adult content filtering
            if (searchPrefs.ExcludeAdultContent || contentPrefs.HideExplicitContent)
            {
                filteredQuery = filteredQuery.Where(c => 
                    c.ContentRating != "NC-17" && 
                    c.ContentRating != "X" && 
                    !c.SearchableGenres.Contains("Adult"));
            }

            // Apply subtitle preference
            if (contentPrefs.ShowOnlySubtitled)
            {
                filteredQuery = filteredQuery.Where(c => c.StreamingOptions.Any(so => 
                    !string.IsNullOrEmpty(so.SubtitleLanguagesJson) && 
                    so.SubtitleLanguagesJson != "[]"));
            }

            // Apply expired content filtering
            if (contentPrefs.ExcludeExpiredContent)
            {
                var now = DateTime.UtcNow;
                filteredQuery = filteredQuery.Where(c => c.StreamingOptions.Any(so => 
                    !so.ExpiresAt.HasValue || so.ExpiresAt > now));
            }

            _logger.LogDebug("Applied preference filters for user {UserId}", userId);
            return filteredQuery;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error applying preference filters for user {UserId}", userId);
            return query; // Return original query on error
        }
    }

    public async Task<FilterOptionsResponse> GetPersonalizedFilterOptionsAsync(
        FilterOptionsRequest request, 
        Guid userId, 
        string correlationId)
    {
        var cacheKey = $"personalized_filter_options:{userId}:{GenerateRequestHash(request)}";
        
        if (_cache.TryGetValue(cacheKey, out FilterOptionsResponse cachedResponse))
        {
            return cachedResponse;
        }

        try
        {
            // Get base filter options
            var baseOptions = await _baseFilterService.GetFilterOptionsAsync(request, correlationId);
            
            // Get user preferences
            var searchPrefs = await _preferenceService.GetSearchPreferencesAsync(userId);
            var contentPrefs = await _preferenceService.GetContentFilterPreferencesAsync(userId);
            var geoPrefs = await _preferenceService.GetGeographicPreferencesAsync(userId);

            // Enhance filter options with user preferences
            var personalizedOptions = await EnhanceFilterOptionsWithPreferencesAsync(
                baseOptions, searchPrefs, contentPrefs, geoPrefs, correlationId);

            _cache.Set(cacheKey, personalizedOptions, _personalizedFilterCacheExpiration);
            
            return personalizedOptions;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting personalized filter options for user {UserId}", userId);
            return await _baseFilterService.GetFilterOptionsAsync(request, correlationId);
        }
    }

    public async Task<List<FilterSuggestion>> GeneratePersonalizedFilterSuggestionsAsync(
        GlobalSearchRequest request, 
        Guid userId, 
        int resultCount, 
        string correlationId)
    {
        try
        {
            // Get base suggestions
            var baseSuggestions = await _baseFilterService.GenerateFilterSuggestionsAsync(
                request, resultCount, correlationId);

            // Get user preferences
            var searchPrefs = await _preferenceService.GetSearchPreferencesAsync(userId);
            var contentPrefs = await _preferenceService.GetContentFilterPreferencesAsync(userId);

            var personalizedSuggestions = new List<FilterSuggestion>(baseSuggestions);

            // Add preference-based suggestions
            await AddPreferenceBasedSuggestionsAsync(
                personalizedSuggestions, request, searchPrefs, contentPrefs, resultCount);

            return personalizedSuggestions
                .OrderByDescending(s => s.EstimatedResultsImprovement)
                .Take(10)
                .ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating personalized filter suggestions for user {UserId}", userId);
            return await _baseFilterService.GenerateFilterSuggestionsAsync(request, resultCount, correlationId);
        }
    }

    private List<string> MergeCountryPreferences(List<string>? requestCountries, GeographicPreferences geoPrefs)
    {
        if (requestCountries?.Any() == true)
        {
            return requestCountries;
        }

        if (!geoPrefs.ShowGlobalContent)
        {
            var preferredCountries = new List<string> { geoPrefs.PrimaryRegion };
            preferredCountries.AddRange(geoPrefs.AdditionalRegions);
            return preferredCountries.Distinct().ToList();
        }

        return new List<string>();
    }

    private List<string> MergeContentRatings(List<string>? requestRatings, ContentFilterPreferences contentPrefs)
    {
        if (requestRatings?.Any() == true)
        {
            return requestRatings;
        }

        if (!string.IsNullOrEmpty(contentPrefs.MaxContentRating))
        {
            return GetAllowedContentRatings(contentPrefs.MaxContentRating);
        }

        return new List<string>();
    }

    private List<string> MergeGenrePreferences(
        List<string>? requestGenres, 
        SearchPreferences searchPrefs, 
        ContentFilterPreferences contentPrefs)
    {
        if (requestGenres?.Any() == true)
        {
            // Remove excluded genres from requested genres
            return requestGenres.Except(contentPrefs.ExcludedGenres).ToList();
        }

        if (searchPrefs.PreferredGenres.Any())
        {
            return searchPrefs.PreferredGenres.Except(contentPrefs.ExcludedGenres).ToList();
        }

        return new List<string>();
    }

    private List<string> MergeServicePreferences(List<string>? requestServices, SearchPreferences searchPrefs)
    {
        if (requestServices?.Any() == true)
        {
            return requestServices;
        }

        return searchPrefs.PreferredServices.ToList();
    }

    private decimal? ApplyMinRatingPreference(
        decimal? requestMinRating, 
        SearchPreferences searchPrefs, 
        ContentFilterPreferences contentPrefs)
    {
        var preferences = new[] { requestMinRating, searchPrefs.MinRating, contentPrefs.MinimumRating }
            .Where(r => r.HasValue)
            .Select(r => r!.Value);

        return preferences.Any() ? preferences.Max() : null;
    }

    private List<string> MergeLanguagePreferences(List<string>? requestLanguages, List<string> preferredLanguages)
    {
        if (requestLanguages?.Any() == true)
        {
            return requestLanguages;
        }

        return preferredLanguages.ToList();
    }

    private List<string> ApplyVideoQualityPreferences(List<string>? requestQualities, ContentFilterPreferences contentPrefs)
    {
        if (requestQualities?.Any() == true)
        {
            return requestQualities;
        }

        if (contentPrefs.PreferHDContent)
        {
            return new List<string> { "HD", "4K", "UHD" };
        }

        return new List<string>();
    }

    private string GetSmartGenreFilterMode(SearchPreferences searchPrefs, List<string>? requestGenres)
    {
        // If user has many preferred genres, use OR mode for broader results
        if (searchPrefs.PreferredGenres.Count > 3 || (requestGenres?.Count ?? 0) > 3)
        {
            return "or";
        }

        return "and";
    }

    private string GetSmartCountryFilterMode(GeographicPreferences geoPrefs)
    {
        // If user shows global content, use OR mode
        if (geoPrefs.ShowGlobalContent)
        {
            return "or";
        }

        return "and";
    }

    private List<string> GetAllowedContentRatings(string maxRating)
    {
        var allRatings = new[] { "G", "PG", "PG-13", "R", "NC-17" };
        var maxIndex = Array.IndexOf(allRatings, maxRating);
        
        if (maxIndex == -1) return allRatings.ToList();
        
        return allRatings.Take(maxIndex + 1).ToList();
    }

    private async Task<FilterOptionsResponse> EnhanceFilterOptionsWithPreferencesAsync(
        FilterOptionsResponse baseOptions,
        SearchPreferences searchPrefs,
        ContentFilterPreferences contentPrefs,
        GeographicPreferences geoPrefs,
        string correlationId)
    {
        // Mark preferred options
        foreach (var genre in baseOptions.Genres)
        {
            if (searchPrefs.PreferredGenres.Contains(genre.Value, StringComparer.OrdinalIgnoreCase))
            {
                genre.IsPopular = true;
                genre.DisplayName = $"⭐ {genre.DisplayName}";
            }
        }

        foreach (var service in baseOptions.StreamingServices)
        {
            if (searchPrefs.PreferredServices.Contains(service.Value, StringComparer.OrdinalIgnoreCase))
            {
                service.IsPopular = true;
                service.DisplayName = $"⭐ {service.DisplayName}";
            }
        }

        // Reorder options based on preferences
        baseOptions.Genres = baseOptions.Genres
            .OrderByDescending(g => searchPrefs.PreferredGenres.Contains(g.Value, StringComparer.OrdinalIgnoreCase))
            .ThenByDescending(g => g.Count)
            .ToList();

        baseOptions.StreamingServices = baseOptions.StreamingServices
            .OrderByDescending(s => searchPrefs.PreferredServices.Contains(s.Value, StringComparer.OrdinalIgnoreCase))
            .ThenByDescending(s => s.Count)
            .ToList();

        return baseOptions;
    }

    private async Task AddPreferenceBasedSuggestionsAsync(
        List<FilterSuggestion> suggestions,
        GlobalSearchRequest request,
        SearchPreferences searchPrefs,
        ContentFilterPreferences contentPrefs,
        int currentResultCount)
    {
        // Suggest using preferred genres if not already applied
        if (searchPrefs.PreferredGenres.Any() && (request.Genres?.Count ?? 0) == 0)
        {
            suggestions.Add(new FilterSuggestion
            {
                FilterName = "Genres",
                SuggestedValue = string.Join(", ", searchPrefs.PreferredGenres.Take(3)),
                Reason = "Based on your preferred genres",
                EstimatedResultsImprovement = 40
            });
        }

        // Suggest using preferred services if not already applied
        if (searchPrefs.PreferredServices.Any() && (request.Services?.Count ?? 0) == 0)
        {
            suggestions.Add(new FilterSuggestion
            {
                FilterName = "Services",
                SuggestedValue = string.Join(", ", searchPrefs.PreferredServices.Take(2)),
                Reason = "Based on your preferred streaming services",
                EstimatedResultsImprovement = 30
            });
        }

        // Suggest applying minimum rating if results are low quality
        if (contentPrefs.MinimumRating.HasValue && !request.MinRating.HasValue && currentResultCount > 50)
        {
            suggestions.Add(new FilterSuggestion
            {
                FilterName = "MinRating",
                SuggestedValue = contentPrefs.MinimumRating.Value.ToString("F1"),
                Reason = "Filter for higher quality content based on your preferences",
                EstimatedResultsImprovement = -20
            });
        }

        // Suggest HD content filter if preferred and many results
        if (contentPrefs.PreferHDContent && (request.VideoQualities?.Count ?? 0) == 0 && currentResultCount > 100)
        {
            suggestions.Add(new FilterSuggestion
            {
                FilterName = "VideoQualities",
                SuggestedValue = "HD, 4K",
                Reason = "Show only HD content based on your preferences",
                EstimatedResultsImprovement = -25
            });
        }
    }

    private string GenerateRequestHash(FilterOptionsRequest request)
    {
        var keyParts = new[]
        {
            request.ContentType?.ToString() ?? "all",
            string.Join(",", request.Countries ?? new List<string>()),
            string.Join(",", request.Services ?? new List<string>()),
            request.YearFrom?.ToString() ?? "",
            request.YearTo?.ToString() ?? "",
            request.Language ?? ""
        };

        return string.Join(":", keyParts).GetHashCode().ToString();
    }
}