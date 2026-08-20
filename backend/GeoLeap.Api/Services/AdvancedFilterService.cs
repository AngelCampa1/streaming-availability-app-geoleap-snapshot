using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Newtonsoft.Json;
using System.Text.RegularExpressions;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service for managing advanced filtering capabilities in search operations
/// </summary>
public class AdvancedFilterService : IAdvancedFilterService
{
    private readonly ApplicationDbContext _context;
    private readonly IMemoryCache _cache;
    private readonly ILogger<AdvancedFilterService> _logger;
    private readonly IResilienceService _resilienceService;
    
    private readonly TimeSpan _filterOptionsCacheExpiration = TimeSpan.FromMinutes(30);
    private readonly string _filterOptionsCacheKeyPrefix = "filter_options_";
    
    public AdvancedFilterService(
        ApplicationDbContext context,
        IMemoryCache cache,
        ILogger<AdvancedFilterService> logger,
        IResilienceService resilienceService)
    {
        _context = context;
        _cache = cache;
        _logger = logger;
        _resilienceService = resilienceService;
    }
    
    public async Task<FilterValidationResult> ValidateFiltersAsync(GlobalSearchRequest request, string correlationId)
    {
        try
        {
            _logger.LogInformation("Starting filter validation with correlation ID: {CorrelationId}", correlationId);
            
            var result = new FilterValidationResult { IsValid = true };
            
            // Validate year ranges
            if (request.YearFrom.HasValue && request.YearTo.HasValue && request.YearFrom > request.YearTo)
            {
                result.Errors.Add("YearFrom cannot be greater than YearTo");
                result.IsValid = false;
            }
            
            // Validate runtime ranges
            if (request.MinRuntimeMinutes.HasValue && request.MaxRuntimeMinutes.HasValue && 
                request.MinRuntimeMinutes > request.MaxRuntimeMinutes)
            {
                result.Errors.Add("MinRuntimeMinutes cannot be greater than MaxRuntimeMinutes");
                result.IsValid = false;
            }
            
            // Validate rating ranges
            if (request.MinRating.HasValue && request.MaxRating.HasValue && request.MinRating > request.MaxRating)
            {
                result.Errors.Add("MinRating cannot be greater than MaxRating");
                result.IsValid = false;
            }
            
            // Validate price ranges
            if (request.MinPrice.HasValue && request.MaxPrice.HasValue && request.MinPrice > request.MaxPrice)
            {
                result.Errors.Add("MinPrice cannot be greater than MaxPrice");
                result.IsValid = false;
            }
            
            // Validate rating values
            if (request.MinRating.HasValue && (request.MinRating < 0 || request.MinRating > 10))
            {
                result.Errors.Add("MinRating must be between 0 and 10");
                result.IsValid = false;
            }
            
            if (request.MaxRating.HasValue && (request.MaxRating < 0 || request.MaxRating > 10))
            {
                result.Errors.Add("MaxRating must be between 0 and 10");
                result.IsValid = false;
            }
            
            // Validate runtime values
            if (request.MinRuntimeMinutes.HasValue && request.MinRuntimeMinutes < 0)
            {
                result.Errors.Add("MinRuntimeMinutes cannot be negative");
                result.IsValid = false;
            }
            
            if (request.MaxRuntimeMinutes.HasValue && request.MaxRuntimeMinutes > 1440) // 24 hours
            {
                result.Warnings.Add("MaxRuntimeMinutes is very high (over 24 hours)");
            }
            
            // Validate price values
            if (request.MinPrice.HasValue && request.MinPrice < 0)
            {
                result.Errors.Add("MinPrice cannot be negative");
                result.IsValid = false;
            }
            
            // Validate cast/crew arrays
            if (request.Cast?.Count > 20)
            {
                result.Warnings.Add("Too many cast members specified - consider reducing for better performance");
            }
            
            if (request.Directors?.Count > 10)
            {
                result.Warnings.Add("Too many directors specified - consider reducing for better performance");
            }
            
            // Validate genre combinations
            if (request.Genres?.Count > 10)
            {
                result.Warnings.Add("Too many genres specified - results may be very limited");
            }
            
            // Validate country/service combinations
            if (request.Countries?.Count > 50)
            {
                result.Warnings.Add("Too many countries specified - consider reducing for better performance");
            }
            
            if (request.Services?.Count > 20)
            {
                result.Warnings.Add("Too many services specified - consider reducing for better performance");
            }
            
            // Generate suggestions for common issues
            if (request.MinRating.HasValue && request.MinRating > 8.5m)
            {
                result.Suggestions.Add("Consider lowering MinRating to 8.0 - very high rating filters may return few results (estimated +25% results)");
            }
            
            _logger.LogInformation("Filter validation completed", new 
            { 
                CorrelationId = correlationId,
                IsValid = result.IsValid,
                ErrorCount = result.Errors.Count,
                WarningCount = result.Warnings.Count,
                SuggestionCount = result.Suggestions.Count
            });

            await Task.CompletedTask;
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during filter validation with correlation ID: {CorrelationId}", correlationId);
            return new FilterValidationResult 
            { 
                IsValid = false, 
                Errors = { "An error occurred during filter validation" } 
            };
        }
    }
    
    public async Task<FilterOptionsResponse> GetFilterOptionsAsync(FilterOptionsRequest request, string correlationId)
    {
        try
        {
            _logger.LogInformation("Retrieving filter options with correlation ID: {CorrelationId}", correlationId);
            
            var cacheKey = GenerateFilterOptionsCacheKey(request);
            
            if (_cache.TryGetValue(cacheKey, out FilterOptionsResponse? cachedResult) && cachedResult != null)
            {
                _logger.LogDebug("Returning cached filter options with correlation ID: {CorrelationId}, CacheKey: {CacheKey}", correlationId, cacheKey);
                return cachedResult;
            }
            
            var response = await _resilienceService.ExecuteWithFullResilienceAsync(async cancellationToken =>
            {
                // Base query for available content
                var query = _context.SearchableContents.AsQueryable();
                
                // Apply context filters
                if (request.ContentType.HasValue && request.ContentType.Value != ContentType.All)
                {
                    query = query.Where(c => c.Type == request.ContentType.Value);
                }
                
                if (request.YearFrom.HasValue)
                {
                    query = query.Where(c => c.Year >= request.YearFrom);
                }
                
                if (request.YearTo.HasValue)
                {
                    query = query.Where(c => c.Year <= request.YearTo);
                }
                
                var result = new FilterOptionsResponse();
                
                // Get available genres with counts
                result.Genres = await GetGenreOptionsAsync(query, correlationId);
                
                // Get available content ratings with counts
                result.ContentRatings = await GetContentRatingOptionsAsync(query, correlationId);
                
                // Get available streaming services with counts
                result.StreamingServices = await GetStreamingServiceOptionsAsync(request.Countries?.ToArray(), correlationId);
                
                // Get available countries with counts
                result.Countries = await GetCountryOptionsAsync(request.Services?.ToArray(), correlationId);
                
                // Get available video qualities with counts
                result.VideoQualities = await GetVideoQualityOptionsAsync(query, correlationId);
                
                // Get available audio languages with counts
                result.AudioLanguages = await GetAudioLanguageOptionsAsync(query, correlationId);
                
                // Get available subtitle languages with counts
                result.SubtitleLanguages = await GetSubtitleLanguageOptionsAsync(query, correlationId);
                
                // Get year, runtime, and price ranges
                result.AvailableYearRange = await GetYearRangeAsync(query, correlationId);
                result.AvailableRuntimeRange = await GetRuntimeRangeAsync(query, correlationId);
                result.AvailablePriceRange = await GetPriceRangeAsync(request.Countries?.ToArray(), correlationId);
                
                result.LastUpdated = DateTime.UtcNow;
                
                return result;
            }, "AdvancedFilterService", CancellationToken.None);
            
            // Cache the result
            _cache.Set(cacheKey, response, _filterOptionsCacheExpiration);
            
            _logger.LogInformation("Filter options retrieved successfully", new 
            { 
                CorrelationId = correlationId,
                GenreCount = response.Genres.Count,
                ContentRatingCount = response.ContentRatings.Count,
                ServiceCount = response.StreamingServices.Count,
                CountryCount = response.Countries.Count
            });
            
            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving filter options with correlation ID: {CorrelationId}", correlationId);
            return new FilterOptionsResponse();
        }
    }
    
    public async Task<IQueryable<SearchableContent>> ApplyAdvancedFiltersAsync(
        IQueryable<SearchableContent> query, 
        GlobalSearchRequest request, 
        string correlationId)
    {
        try
        {
            _logger.LogInformation("Applying advanced filters with correlation ID: {CorrelationId}", correlationId);
            
            // Content rating filters
            if (request.ContentRatings?.Any() == true)
            {
                var contentRatings = request.ContentRatings.ToList();
                query = query.Where(c => c.ContentRating != null && contentRatings.Contains(c.ContentRating));
            }
            
            // Runtime filters
            if (request.MinRuntimeMinutes.HasValue)
            {
                query = query.Where(c => c.RuntimeMinutes >= request.MinRuntimeMinutes);
            }
            
            if (request.MaxRuntimeMinutes.HasValue)
            {
                query = query.Where(c => c.RuntimeMinutes <= request.MaxRuntimeMinutes);
            }
            
            // Rating range filters
            if (request.MaxRating.HasValue)
            {
                query = query.Where(c => c.Rating <= request.MaxRating);
            }
            
            // Language filters for audio and subtitles
            if (request.AudioLanguages?.Any() == true)
            {
                var audioLanguages = request.AudioLanguages.ToList();
                query = query.Where(c => c.StreamingOptions
                    .Any(so => audioLanguages.Any(al => so.AudioLanguagesJson.Contains(al))));
            }
            
            if (request.SubtitleLanguages?.Any() == true)
            {
                var subtitleLanguages = request.SubtitleLanguages.ToList();
                query = query.Where(c => c.StreamingOptions
                    .Any(so => subtitleLanguages.Any(sl => so.SubtitleLanguagesJson.Contains(sl))));
            }
            
            // Price range filters
            if (request.MinPrice.HasValue)
            {
                query = query.Where(c => c.StreamingOptions
                    .Any(so => so.Price >= request.MinPrice || so.StreamingType == StreamingType.Subscription));
            }
            
            if (request.MaxPrice.HasValue)
            {
                query = query.Where(c => c.StreamingOptions
                    .Any(so => so.Price <= request.MaxPrice || so.StreamingType == StreamingType.Subscription));
            }
            
            // Video quality filters
            if (request.VideoQualities?.Any() == true)
            {
                var videoQualities = request.VideoQualities.ToList();
                query = query.Where(c => c.StreamingOptions
                    .Any(so => videoQualities.Any(vq => so.VideoQualityJson.Contains(vq))));
            }
            
            // Cast and crew filters - Use simpler approach for in-memory database
            if (request.Cast?.Any() == true)
            {
                foreach (var castMember in request.Cast)
                {
                    var member = castMember.ToLowerInvariant();
                    // FIXED: Round 12 - Use ToLowerInvariant() for culture-independent comparison
                    query = query.Where(c => c.SearchableCast != null &&
                        c.SearchableCast.ToLowerInvariant().Contains(member));
                }
            }

            if (request.Directors?.Any() == true)
            {
                foreach (var director in request.Directors)
                {
                    var dir = director.ToLowerInvariant();
                    // FIXED: Round 12 - Use ToLowerInvariant() for culture-independent comparison
                    query = query.Where(c => c.SearchableCrew != null &&
                        c.SearchableCrew.ToLowerInvariant().Contains(dir));
                }
            }

            if (request.Crew?.Any() == true)
            {
                foreach (var crewMember in request.Crew)
                {
                    var member = crewMember.ToLowerInvariant();
                    // FIXED: Round 12 - Use ToLowerInvariant() for culture-independent comparison
                    query = query.Where(c => c.SearchableCrew != null &&
                        c.SearchableCrew.ToLowerInvariant().Contains(member));
                }
            }
            
            // Availability status filters
            if (!string.IsNullOrEmpty(request.AvailabilityStatus))
            {
                var now = DateTime.UtcNow;
                var recentThreshold = now.AddDays(-30);
                var expiringSoonThreshold = now.AddDays(30);
                
                if (Enum.TryParse<AvailabilityStatus>(request.AvailabilityStatus, out var availabilityStatus))
                {
                    query = ApplyAvailabilityStatusFilters(query, new[] { availabilityStatus }, 
                        now, recentThreshold, expiringSoonThreshold);
                }
            }
            
            // Free content filter
            if (request.FreeContentOnly == true)
            {
                query = query.Where(c => c.StreamingOptions
                    .Any(so => so.StreamingType == StreamingType.Free || so.StreamingType == StreamingType.Ads));
            }
            
            // Subscription content filter
            if (request.SubscriptionContentOnly == true)
            {
                query = query.Where(c => c.StreamingOptions
                    .Any(so => so.StreamingType == StreamingType.Subscription));
            }
            
            // Platform exclusives filter
            if (request.PlatformExclusives == true)
            {
                query = query.Where(c => c.AvailableServicesCount == 1);
            }
            
            // Release date filters
            if (request.ReleasedAfter.HasValue)
            {
                var releaseYear = request.ReleasedAfter.Value.Year;
                query = query.Where(c => c.Year >= releaseYear);
            }
            
            if (request.ReleasedBefore.HasValue)
            {
                var releaseYear = request.ReleasedBefore.Value.Year;
                query = query.Where(c => c.Year <= releaseYear);
            }
            
            // Streaming addition date filters
            if (request.AddedToStreamingAfter.HasValue)
            {
                query = query.Where(c => c.LastAvailabilityUpdate >= request.AddedToStreamingAfter);
            }
            
            // Expiring content filter
            if (request.ExpiringBefore.HasValue)
            {
                query = query.Where(c => c.StreamingOptions
                    .Any(so => so.ExpiresAt.HasValue && so.ExpiresAt <= request.ExpiringBefore));
            }
            
            // Apply genre filter mode (ANY vs ALL)
            if (request.Genres?.Any() == true)
            {
                var genreMode = Enum.TryParse<FilterCombineMode>(request.GenreFilterMode, out var parsedGenreMode) ? parsedGenreMode : FilterCombineMode.And;
                query = ApplyGenreFilters(query, request.Genres.ToArray(), genreMode);
            }
            
            // Apply country filter mode (ANY vs ALL)
            if (request.Countries?.Any() == true)
            {
                var countryMode = Enum.TryParse<FilterCombineMode>(request.CountryFilterMode, out var parsedCountryMode) ? parsedCountryMode : FilterCombineMode.And;
                query = ApplyCountryFilters(query, request.Countries.ToArray(), countryMode);
            }
            
            // Apply service filter mode (ANY vs ALL)
            if (request.Services?.Any() == true)
            {
                var serviceMode = Enum.TryParse<FilterCombineMode>(request.ServiceFilterMode, out var parsedServiceMode) ? parsedServiceMode : FilterCombineMode.Or;
                query = ApplyServiceFilters(query, request.Services.ToArray(), serviceMode);
            }
            
            // Apply popularity filters
            if (request.PopularityFilter != null)
            {
                var popularityFilter = new PopularityFilter 
                {
                    MinPopularity = request.PopularityFilter ?? 0,
                    MaxPopularity = 100
                };
                query = ApplyPopularityFilters(query, popularityFilter);
            }
            
            _logger.LogInformation("Advanced filters applied successfully with correlation ID: {CorrelationId}", correlationId);
            
            return query;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error applying advanced filters with correlation ID: {CorrelationId}", correlationId);
            return query; // Return original query on error
        }
    }
    
    public async Task<List<FilterSuggestion>> GenerateFilterSuggestionsAsync(
        GlobalSearchRequest request, 
        int resultCount, 
        string correlationId)
    {
        try
        {
            _logger.LogInformation("Generating filter suggestions", new 
            { 
                CorrelationId = correlationId, 
                CurrentResultCount = resultCount 
            });
            
            var suggestions = new List<FilterSuggestion>();
            
            // If too few results, suggest loosening filters
            if (resultCount < 5)
            {
                if (request.MinRating.HasValue && request.MinRating > 7.0m)
                {
                    suggestions.Add(new FilterSuggestion
                    {
                        FilterName = "MinRating",
                        SuggestedValue = "6.5",
                        Reason = "Lower minimum rating to find more content",
                        EstimatedResultsImprovement = 50
                    });
                }
                
                if (request.YearFrom.HasValue && request.YearFrom > DateTime.Now.Year - 5)
                {
                    suggestions.Add(new FilterSuggestion
                    {
                        FilterName = "YearFrom",
                        SuggestedValue = (DateTime.Now.Year - 10).ToString(),
                        Reason = "Include older content for more results",
                        EstimatedResultsImprovement = 75
                    });
                }
            }
            
            // If too many results, suggest more specific filters
            if (resultCount > 100)
            {
                if (!request.ContentType.HasValue || request.ContentType.Value == ContentType.All)
                {
                    suggestions.Add(new FilterSuggestion
                    {
                        FilterName = "ContentType",
                        SuggestedValue = "Movie",
                        Reason = "Filter by content type to narrow results",
                        EstimatedResultsImprovement = -60
                    });
                }
                
                if (request.MinRating == null)
                {
                    suggestions.Add(new FilterSuggestion
                    {
                        FilterName = "MinRating",
                        SuggestedValue = "7.0",
                        Reason = "Add minimum rating filter for quality content",
                        EstimatedResultsImprovement = -40
                    });
                }
            }
            
            return suggestions;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating filter suggestions with correlation ID: {CorrelationId}", correlationId);
            return new List<FilterSuggestion>();
        }
    }
    
    public async Task<AppliedFiltersInfo> AnalyzeAppliedFiltersAsync(GlobalSearchRequest request, string correlationId)
    {
        try
        {
            var info = new AppliedFiltersInfo();
            var activeFilters = new Dictionary<string, string[]>();
            
            // Analyze applied filters
            if (request.ContentType.HasValue) activeFilters["ContentType"] = new[] { request.ContentType.Value.ToString() };
            if (request.MinRating.HasValue) activeFilters["MinRating"] = new[] { request.MinRating.ToString()! };
            if (request.MaxRating.HasValue) activeFilters["MaxRating"] = new[] { request.MaxRating.ToString()! };
            if (request.YearFrom.HasValue) activeFilters["YearFrom"] = new[] { request.YearFrom.ToString()! };
            if (request.YearTo.HasValue) activeFilters["YearTo"] = new[] { request.YearTo.ToString()! };
            if (request.Genres?.Any() == true) activeFilters["Genres"] = request.Genres.Where(g => g != null).ToArray()!;
            if (request.Countries?.Any() == true) activeFilters["Countries"] = request.Countries.Where(c => c != null).ToArray()!;
            if (request.Services?.Any() == true) activeFilters["Services"] = request.Services.Where(s => s != null).ToArray()!;
            if (request.ContentRatings?.Any() == true) activeFilters["ContentRatings"] = request.ContentRatings.Where(cr => cr != null).ToArray()!;
            if (request.MinRuntimeMinutes.HasValue) activeFilters["MinRuntime"] = new[] { $"{request.MinRuntimeMinutes}min" };
            if (request.MaxRuntimeMinutes.HasValue) activeFilters["MaxRuntime"] = new[] { $"{request.MaxRuntimeMinutes}min" };
            if (request.AudioLanguages?.Any() == true) activeFilters["AudioLanguages"] = request.AudioLanguages.ToArray();
            if (request.SubtitleLanguages?.Any() == true) activeFilters["SubtitleLanguages"] = request.SubtitleLanguages.ToArray();
            if (request.MinPrice.HasValue) activeFilters["MinPrice"] = new[] { request.MinPrice?.ToString("C") ?? "0" };
            if (request.MaxPrice.HasValue) activeFilters["MaxPrice"] = new[] { request.MaxPrice?.ToString("C") ?? "0" };
            if (request.VideoQualities?.Any() == true) activeFilters["VideoQualities"] = request.VideoQualities.ToArray();
            if (request.Cast?.Any() == true) activeFilters["Cast"] = request.Cast.ToArray();
            if (request.Directors?.Any() == true) activeFilters["Directors"] = request.Directors.ToArray();
            if (request.FreeContentOnly == true) activeFilters["FreeContentOnly"] = new[] { "Yes" };
            if (request.SubscriptionContentOnly == true) activeFilters["SubscriptionContentOnly"] = new[] { "Yes" };
            if (request.PlatformExclusives == true) activeFilters["PlatformExclusives"] = new[] { "Yes" };
            if (request.PopularityFilter != null) activeFilters["PopularityFilter"] = new[] { $"{request.PopularityFilter ?? 0}-100" };
            
            info.FilterGroups = activeFilters;
            info.TotalFilters = activeFilters.Count;
            info.TotalFiltersApplied = activeFilters.Values.Sum(v => v.Length);
            
            // Determine complexity
            info.Complexity = info.TotalFiltersApplied switch
            {
                0 or 1 or 2 => FilterComplexity.Simple.ToString(),
                3 or 4 or 5 => FilterComplexity.Medium.ToString(),
                6 or 7 or 8 or 9 => FilterComplexity.Complex.ToString(),
                _ => FilterComplexity.VeryComplex.ToString()
            };
            
            // Check for advanced filters
            info.HasAdvancedFilters = request.Cast?.Any() == true ||
                                    request.Directors?.Any() == true ||
                                    request.AudioLanguages?.Any() == true ||
                                    request.SubtitleLanguages?.Any() == true ||
                                    request.VideoQualities?.Any() == true ||
                                    request.MinPrice.HasValue ||
                                    request.MaxPrice.HasValue ||
                                    !string.IsNullOrEmpty(request.AvailabilityStatus);
            
            // Generate summary
            info.Summary = info.TotalFiltersApplied switch
            {
                0 => "No filters applied",
                1 => "1 filter applied",
                _ => $"{info.TotalFiltersApplied} filters applied ({info.Complexity.ToString().ToLower()} complexity)"
            };
            
            return info;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error analyzing applied filters with correlation ID: {CorrelationId}", correlationId);
            return new AppliedFiltersInfo();
        }
    }
    
    public async Task<GlobalSearchRequest> OptimizeFiltersAsync(GlobalSearchRequest request, string correlationId)
    {
        try
        {
            _logger.LogInformation("Optimizing filters for performance with correlation ID: {CorrelationId}", correlationId);
            
            var optimizedRequest = JsonConvert.DeserializeObject<GlobalSearchRequest>(JsonConvert.SerializeObject(request))!;
            
            // Optimize genre filters - limit to most relevant ones
            if (optimizedRequest.Genres?.Count > 5)
            {
                // Keep only the first 5 genres to maintain performance
                optimizedRequest.Genres = optimizedRequest.Genres.Take(5).ToList();
            }
            
            // Optimize country filters - prioritize popular regions
            if (optimizedRequest.Countries?.Count > 10)
            {
                var popularCountries = new[] { "US", "CA", "GB", "AU", "DE", "FR", "JP", "KR", "BR", "MX" };
                var filteredCountries = optimizedRequest.Countries
                    .Where(c => popularCountries.Contains(c))
                    .Take(10)
                    .ToList();
                
                if (filteredCountries.Any())
                {
                    optimizedRequest.Countries = filteredCountries;
                }
            }
            
            // Optimize cast/crew filters - limit to prevent performance issues
            if (optimizedRequest.Cast?.Count > 5)
            {
                optimizedRequest.Cast = optimizedRequest.Cast.Take(5).ToList();
            }
            
            if (optimizedRequest.Directors?.Count > 3)
            {
                optimizedRequest.Directors = optimizedRequest.Directors.Take(3).ToList();
            }
            
            return optimizedRequest;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error optimizing filters with correlation ID: {CorrelationId}", correlationId);
            return request; // Return original request on error
        }
    }
    
    public async Task TrackFilterUsageAsync(
        GlobalSearchRequest request, 
        int resultCount, 
        TimeSpan executionTime, 
        string correlationId)
    {
        try
        {
            _logger.LogInformation("Tracking filter usage analytics", new 
            { 
                CorrelationId = correlationId,
                ResultCount = resultCount,
                ExecutionTimeMs = executionTime.TotalMilliseconds
            });
            
            var appliedFilters = await AnalyzeAppliedFiltersAsync(request, correlationId);
            
            // Log detailed filter usage for analytics
            _logger.LogInformation("Filter usage tracked", new 
            {
                CorrelationId = correlationId,
                TotalFilters = appliedFilters.TotalFiltersApplied,
                Complexity = appliedFilters.Complexity.ToString(),
                HasAdvanced = appliedFilters.HasAdvancedFilters,
                ResultCount = resultCount,
                ExecutionTimeMs = executionTime.TotalMilliseconds,
                FilterSummary = appliedFilters.Summary
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error tracking filter usage with correlation ID: {CorrelationId}", correlationId);
        }
    }
    
    public async Task InvalidateFilterCacheAsync(List<string>? cacheKeys, string correlationId)
    {
        try
        {
            _logger.LogInformation("Invalidating filter cache", new 
            { 
                CorrelationId = correlationId,
                SpecificKeys = cacheKeys?.Count ?? 0
            });
            
            if (cacheKeys?.Any() == true)
            {
                foreach (var key in cacheKeys)
                {
                    _cache.Remove(key);
                }
            }
            else
            {
                // Clear all filter-related cache entries
                // Note: In a real implementation, you might want a more sophisticated cache invalidation mechanism
                _logger.LogInformation("Full filter cache invalidation requested with correlation ID: {CorrelationId}", correlationId);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error invalidating filter cache with correlation ID: {CorrelationId}", correlationId);
        }
    }
    
    // Private helper methods
    
    private string GenerateFilterOptionsCacheKey(FilterOptionsRequest request)
    {
        var keyComponents = new List<string>
        {
            _filterOptionsCacheKeyPrefix,
            request.ContentType?.ToString() ?? "all",
            string.Join(",", request.Countries ?? new List<string>()),
            string.Join(",", request.Services ?? new List<string>()),
            request.YearFrom?.ToString() ?? "any",
            request.YearTo?.ToString() ?? "any",
            request.Language ?? "en-US"
        };
        
        return string.Join("_", keyComponents).ToLowerInvariant();
    }
    
    private async Task<List<FilterOption>> GetGenreOptionsAsync(IQueryable<SearchableContent> query, string correlationId)
    {
        var genreData = await query
            .Where(c => !string.IsNullOrEmpty(c.GenresJson))
            .GroupBy(c => c.GenresJson)
            .Select(g => new { GenresJson = g.Key, Count = g.Count() })
            .ToListAsync();
        
        var genres = new Dictionary<string, int>();
        
        foreach (var item in genreData)
        {
            try
            {
                var genreList = JsonConvert.DeserializeObject<List<string>>(item.GenresJson) ?? new List<string>();
                foreach (var genre in genreList)
                {
                    genres[genre] = genres.GetValueOrDefault(genre, 0) + item.Count;
                }
            }
            catch
            {
                // Skip invalid JSON
            }
        }
        
        return genres
            .OrderByDescending(g => g.Value)
            .Take(50) // Limit to top 50 genres
            .Select(g => new FilterOption
            {
                Value = g.Key,
                DisplayName = g.Key,
                Count = g.Value,
                IsPopular = g.Value > genres.Values.Average()
            })
            .ToList();
    }
    
    private async Task<List<FilterOption>> GetContentRatingOptionsAsync(IQueryable<SearchableContent> query, string correlationId)
    {
        return await query
            .Where(c => !string.IsNullOrEmpty(c.ContentRating))
            .GroupBy(c => c.ContentRating)
            .Select(g => new FilterOption
            {
                Value = g.Key!,
                DisplayName = g.Key!,
                Count = g.Count(),
                IsPopular = g.Count() > 1000
            })
            .OrderBy(f => f.Value)
            .ToListAsync();
    }
    
    private async Task<List<FilterOption>> GetStreamingServiceOptionsAsync(string[]? countries, string correlationId)
    {
        var query = _context.ContentStreamingOptions.AsQueryable();
        
        if (countries?.Any() == true)
        {
            query = query.Where(so => countries.Contains(so.CountryCode));
        }
        
        return await query
            .GroupBy(so => new { so.ServiceId, so.ServiceName })
            .Select(g => new FilterOption
            {
                Value = g.Key.ServiceId,
                DisplayName = g.Key.ServiceName,
                Count = g.Count(),
                IsPopular = g.Count() > 500
            })
            .OrderByDescending(f => f.Count)
            .Take(50)
            .ToListAsync();
    }
    
    private async Task<List<FilterOption>> GetCountryOptionsAsync(string[]? services, string correlationId)
    {
        var query = _context.ContentStreamingOptions.AsQueryable();
        
        if (services?.Any() == true)
        {
            query = query.Where(so => services.Contains(so.ServiceId));
        }
        
        return await query
            .GroupBy(so => so.CountryCode)
            .Select(g => new FilterOption
            {
                Value = g.Key,
                DisplayName = g.Key, // In a real implementation, you'd map to country names
                Count = g.Count(),
                IsPopular = g.Count() > 1000
            })
            .OrderByDescending(f => f.Count)
            .Take(100)
            .ToListAsync();
    }
    
    private async Task<List<FilterOption>> GetVideoQualityOptionsAsync(IQueryable<SearchableContent> query, string correlationId)
    {
        var qualityData = await query
            .SelectMany(c => c.StreamingOptions)
            .Where(so => !string.IsNullOrEmpty(so.VideoQualityJson))
            .GroupBy(so => so.VideoQualityJson)
            .Select(g => new { VideoQualityJson = g.Key, Count = g.Count() })
            .ToListAsync();
        
        var qualities = new Dictionary<string, int>();
        
        foreach (var item in qualityData)
        {
            try
            {
                var qualityList = JsonConvert.DeserializeObject<List<string>>(item.VideoQualityJson) ?? new List<string>();
                foreach (var quality in qualityList)
                {
                    qualities[quality] = qualities.GetValueOrDefault(quality, 0) + item.Count;
                }
            }
            catch
            {
                // Skip invalid JSON
            }
        }
        
        return qualities
            .OrderByDescending(q => q.Value)
            .Select(q => new FilterOption
            {
                Value = q.Key,
                DisplayName = q.Key,
                Count = q.Value,
                IsPopular = q.Value > qualities.Values.Average()
            })
            .ToList();
    }
    
    private async Task<List<FilterOption>> GetAudioLanguageOptionsAsync(IQueryable<SearchableContent> query, string correlationId)
    {
        var languageData = await query
            .SelectMany(c => c.StreamingOptions)
            .Where(so => !string.IsNullOrEmpty(so.AudioLanguagesJson))
            .GroupBy(so => so.AudioLanguagesJson)
            .Select(g => new { AudioLanguagesJson = g.Key, Count = g.Count() })
            .ToListAsync();
        
        var languages = new Dictionary<string, int>();
        
        foreach (var item in languageData)
        {
            try
            {
                var languageList = JsonConvert.DeserializeObject<List<string>>(item.AudioLanguagesJson) ?? new List<string>();
                foreach (var language in languageList)
                {
                    languages[language] = languages.GetValueOrDefault(language, 0) + item.Count;
                }
            }
            catch
            {
                // Skip invalid JSON
            }
        }
        
        return languages
            .OrderByDescending(l => l.Value)
            .Take(30)
            .Select(l => new FilterOption
            {
                Value = l.Key,
                DisplayName = l.Key, // In a real implementation, you'd map language codes to names
                Count = l.Value,
                IsPopular = l.Value > languages.Values.Average()
            })
            .ToList();
    }
    
    private async Task<List<FilterOption>> GetSubtitleLanguageOptionsAsync(IQueryable<SearchableContent> query, string correlationId)
    {
        var languageData = await query
            .SelectMany(c => c.StreamingOptions)
            .Where(so => !string.IsNullOrEmpty(so.SubtitleLanguagesJson))
            .GroupBy(so => so.SubtitleLanguagesJson)
            .Select(g => new { SubtitleLanguagesJson = g.Key, Count = g.Count() })
            .ToListAsync();
        
        var languages = new Dictionary<string, int>();
        
        foreach (var item in languageData)
        {
            try
            {
                var languageList = JsonConvert.DeserializeObject<List<string>>(item.SubtitleLanguagesJson) ?? new List<string>();
                foreach (var language in languageList)
                {
                    languages[language] = languages.GetValueOrDefault(language, 0) + item.Count;
                }
            }
            catch
            {
                // Skip invalid JSON
            }
        }
        
        return languages
            .OrderByDescending(l => l.Value)
            .Take(30)
            .Select(l => new FilterOption
            {
                Value = l.Key,
                DisplayName = l.Key, // In a real implementation, you'd map language codes to names
                Count = l.Value,
                IsPopular = l.Value > languages.Values.Average()
            })
            .ToList();
    }
    
    private async Task<YearRange> GetYearRangeAsync(IQueryable<SearchableContent> query, string correlationId)
    {
        var yearStats = await query
            .Where(c => c.Year.HasValue)
            .GroupBy(c => 1)
            .Select(g => new
            {
                MinYear = g.Min(c => c.Year!.Value),
                MaxYear = g.Max(c => c.Year!.Value),
                AvgYear = (int)g.Average(c => c.Year!.Value)
            })
            .FirstOrDefaultAsync();
        
        return new YearRange
        {
            MinYear = yearStats?.MinYear ?? 1900,
            MaxYear = yearStats?.MaxYear ?? DateTime.Now.Year,
            MostCommonYear = yearStats?.AvgYear ?? DateTime.Now.Year
        };
    }
    
    private async Task<RuntimeRange> GetRuntimeRangeAsync(IQueryable<SearchableContent> query, string correlationId)
    {
        var runtimeStats = await query
            .Where(c => c.RuntimeMinutes.HasValue)
            .GroupBy(c => 1)
            .Select(g => new
            {
                MinRuntime = g.Min(c => c.RuntimeMinutes!.Value),
                MaxRuntime = g.Max(c => c.RuntimeMinutes!.Value),
                AvgRuntime = (int)g.Average(c => c.RuntimeMinutes!.Value)
            })
            .FirstOrDefaultAsync();
        
        return new RuntimeRange
        {
            MinRuntimeMinutes = runtimeStats?.MinRuntime ?? 0,
            MaxRuntimeMinutes = runtimeStats?.MaxRuntime ?? 300,
            AverageRuntimeMinutes = runtimeStats?.AvgRuntime ?? 120
        };
    }
    
    private async Task<PriceRange> GetPriceRangeAsync(string[]? countries, string correlationId)
    {
        var query = _context.ContentStreamingOptions
            .Where(so => so.Price.HasValue);
        
        if (countries?.Any() == true)
        {
            query = query.Where(so => countries.Contains(so.CountryCode));
        }
        
        var priceStats = await query
            .GroupBy(so => 1)
            .Select(g => new
            {
                MinPrice = g.Min(so => so.Price!.Value),
                MaxPrice = g.Max(so => so.Price!.Value),
                AvgPrice = g.Average(so => so.Price!.Value)
            })
            .FirstOrDefaultAsync();
        
        return new PriceRange
        {
            MinPrice = priceStats?.MinPrice ?? 0,
            MaxPrice = priceStats?.MaxPrice ?? 100,
            AveragePrice = priceStats?.AvgPrice ?? 10,
            Currency = "USD"
        };
    }
    
    private IQueryable<SearchableContent> ApplyAvailabilityStatusFilters(
        IQueryable<SearchableContent> query,
        AvailabilityStatus[] statuses,
        DateTime now,
        DateTime recentThreshold,
        DateTime expiringSoonThreshold)
    {
        var conditions = new List<IQueryable<SearchableContent>>();
        
        foreach (var status in statuses)
        {
            switch (status)
            {
                case AvailabilityStatus.Available:
                    conditions.Add(query.Where(c => c.StreamingOptions.Any()));
                    break;
                case AvailabilityStatus.RecentlyAdded:
                    conditions.Add(query.Where(c => c.LastAvailabilityUpdate >= recentThreshold));
                    break;
                case AvailabilityStatus.ExpiringSoon:
                    conditions.Add(query.Where(c => c.StreamingOptions.Any(so => 
                        so.ExpiresAt.HasValue && so.ExpiresAt <= expiringSoonThreshold)));
                    break;
                case AvailabilityStatus.Unavailable:
                    conditions.Add(query.Where(c => !c.StreamingOptions.Any()));
                    break;
            }
        }
        
        // Combine conditions with OR logic
        if (conditions.Count == 1)
        {
            return conditions[0];
        }
        
        return query.Where(c => conditions.Any(condition => condition.Contains(c)));
    }
    
    private IQueryable<SearchableContent> ApplyGenreFilters(
        IQueryable<SearchableContent> query, 
        string[] genres, 
        FilterCombineMode mode)
    {
        if (mode == FilterCombineMode.All)
        {
            // ALL genres must match
            foreach (var genre in genres)
            {
                query = query.Where(c => c.SearchableGenres.Contains(genre));
            }
            return query;
        }
        else
        {
            // ANY genre can match (default)
            return query.Where(c => genres.Any(genre => c.SearchableGenres.Contains(genre)));
        }
    }
    
    private IQueryable<SearchableContent> ApplyCountryFilters(
        IQueryable<SearchableContent> query, 
        string[] countries, 
        FilterCombineMode mode)
    {
        if (mode == FilterCombineMode.All)
        {
            // Content must be available in ALL specified countries
            foreach (var country in countries)
            {
                query = query.Where(c => c.StreamingOptions.Any(so => so.CountryCode == country));
            }
            return query;
        }
        else
        {
            // Content must be available in ANY of the specified countries (default)
            return query.Where(c => c.StreamingOptions.Any(so => countries.Contains(so.CountryCode)));
        }
    }
    
    private IQueryable<SearchableContent> ApplyServiceFilters(
        IQueryable<SearchableContent> query, 
        string[] services, 
        FilterCombineMode mode)
    {
        if (mode == FilterCombineMode.All)
        {
            // Content must be available on ALL specified services
            foreach (var service in services)
            {
                query = query.Where(c => c.StreamingOptions.Any(so => so.ServiceId == service));
            }
            return query;
        }
        else
        {
            // Content must be available on ANY of the specified services (default)
            return query.Where(c => c.StreamingOptions.Any(so => services.Contains(so.ServiceId)));
        }
    }
    
    private IQueryable<SearchableContent> ApplyPopularityFilters(
        IQueryable<SearchableContent> query, 
        PopularityFilter filter)
    {
        // Apply min/max popularity filters
        if (filter.MinPopularity > 0)
        {
            query = query.Where(c => c.Popularity >= (decimal)filter.MinPopularity);
        }
        
        if (filter.MaxPopularity > 0)
        {
            query = query.Where(c => c.Popularity <= (decimal)filter.MaxPopularity);
        }
        
        // Apply specific filter types
        if (filter.Type.HasValue)
        {
            query = filter.Type.Value switch
            {
                PopularityFilterType.Trending => query.OrderByDescending(c => c.Popularity).Take(100),
                PopularityFilterType.Popular => query.Where(c => c.Popularity > 50).OrderByDescending(c => c.Popularity),
                PopularityFilterType.HighlyRated => query.Where(c => c.Rating >= 8.0m && c.VoteCount >= 100),
                PopularityFilterType.HiddenGems => query.Where(c => c.Rating >= 7.5m && c.Popularity < 20),
                PopularityFilterType.AwardWinners => query.Where(c => c.Rating >= 8.5m && c.VoteCount >= 1000),
                PopularityFilterType.CriticsPick => query.Where(c => c.Rating >= 8.0m && c.VoteCount >= 500),
                _ => query
            };
        }
        
        return query;
    }
}