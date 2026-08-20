using GeoLeap.Api.Models;
using GeoLeap.Api.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using System.ComponentModel.DataAnnotations;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service for advanced content filtering and validation
/// </summary>
public interface IContentFilterService
{
    Task<FilterOptionsResponse> GetAvailableFilterOptionsAsync(string contentType = "all", string region = "US", CancellationToken cancellationToken = default);
    Task<List<FilterOption>> GetAvailableGenresAsync(string contentType = "all", string region = "US", CancellationToken cancellationToken = default);
    Task<List<FilterOption>> GetAvailableServicesAsync(string region = "US", CancellationToken cancellationToken = default);
    Task<YearRange> GetAvailableYearRangesAsync(string contentType = "all", CancellationToken cancellationToken = default);
    Task<RuntimeRange> GetAvailableRuntimeRangesAsync(string contentType = "all", CancellationToken cancellationToken = default);
    Task<FilterValidationResult> ValidateFiltersAsync(GlobalSearchRequest request, CancellationToken cancellationToken = default);
    Task<List<FilterSuggestion>> GenerateFilterSuggestionsAsync(GlobalSearchRequest request, int currentResultCount = 0, CancellationToken cancellationToken = default);
    IQueryable<SearchableContent> ApplyFilters(IQueryable<SearchableContent> query, ContentSearchFilters filters);
}

/// <summary>
/// Implementation of advanced content filtering service
/// </summary>
public class ContentFilterService : IContentFilterService
{
    private readonly ApplicationDbContext _context;
    private readonly IMemoryCache _cache;
    private readonly ILogger<ContentFilterService> _logger;
    private readonly ILoggerService _loggerService;

    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(30);
    private const string GENRES_CACHE_KEY = "filter_genres";
    private const string SERVICES_CACHE_KEY = "filter_services";
    private const string YEARS_CACHE_KEY = "filter_years";
    private const string RUNTIME_CACHE_KEY = "filter_runtime";

    public ContentFilterService(
        ApplicationDbContext context,
        IMemoryCache cache,
        ILogger<ContentFilterService> logger,
        ILoggerService loggerService)
    {
        _context = context;
        _cache = cache;
        _logger = logger;
        _loggerService = loggerService;
    }

    public async Task<FilterOptionsResponse> GetAvailableFilterOptionsAsync(
        string contentType = "all", 
        string region = "US", 
        CancellationToken cancellationToken = default)
    {
        try
        {
            var cacheKey = $"filter_options_{contentType}_{region}";
            
            if (_cache.TryGetValue(cacheKey, out FilterOptionsResponse? cachedOptions) && cachedOptions != null)
            {
                return cachedOptions;
            }

            var response = new FilterOptionsResponse();

            // Get available genres
            response.Genres = await GetAvailableGenresAsync(contentType, region, cancellationToken);

            // Get available streaming services
            response.StreamingServices = await GetAvailableServicesAsync(region, cancellationToken);

            // Get year ranges
            response.AvailableYearRange = await GetAvailableYearRangesAsync(contentType, cancellationToken);

            // Get runtime ranges
            response.AvailableRuntimeRange = await GetAvailableRuntimeRangesAsync(contentType, cancellationToken);

            // Get available languages
            response.Languages = await GetAvailableLanguagesAsync(contentType, cancellationToken);

            // Get available countries
            response.Countries = await GetAvailableCountriesAsync(cancellationToken);

            // Get content ratings
            response.ContentRatings = await GetAvailableContentRatingsAsync(contentType, cancellationToken);

            response.LastUpdated = DateTime.UtcNow;

            _cache.Set(cacheKey, response, CacheDuration);
            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting filter options");
            throw;
        }
    }

    public async Task<List<FilterOption>> GetAvailableGenresAsync(
        string contentType = "all", 
        string region = "US", 
        CancellationToken cancellationToken = default)
    {
        try
        {
            var cacheKey = $"{GENRES_CACHE_KEY}_{contentType}_{region}";
            
            if (_cache.TryGetValue(cacheKey, out List<FilterOption>? cachedGenres) && cachedGenres != null)
            {
                return cachedGenres;
            }

            var query = _context.SearchableContents.AsQueryable();

            // Apply content type filter
            if (contentType != "all")
            {
                var parsedType = ParseContentType(contentType);
                if (parsedType.HasValue)
                {
                    query = query.Where(c => c.Type == parsedType.Value);
                }
            }

            // Get genres from JSON field and aggregate counts
            var genreCounts = new Dictionary<string, int>();

            var contents = await query
                .Where(c => !string.IsNullOrEmpty(c.GenresJson) && c.GenresJson != "[]")
                .Select(c => new { c.GenresJson })
                .ToListAsync(cancellationToken);

            foreach (var content in contents)
            {
                try
                {
                    var genres = System.Text.Json.JsonSerializer.Deserialize<List<string>>(content.GenresJson);
                    if (genres != null)
                    {
                        foreach (var genre in genres)
                        {
                            if (!string.IsNullOrEmpty(genre))
                            {
                                genreCounts[genre] = genreCounts.GetValueOrDefault(genre, 0) + 1;
                            }
                        }
                    }
                }
                catch
                {
                    // Skip invalid JSON
                }
            }

            var genreOptions = genreCounts
                .OrderByDescending(g => g.Value)
                .Select(g => new FilterOption
                {
                    Value = g.Key,
                    Label = g.Key,
                    DisplayName = g.Key,
                    Count = g.Value,
                    IsPopular = g.Value >= 10
                })
                .ToList();

            _cache.Set(cacheKey, genreOptions, CacheDuration);
            return genreOptions;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting available genres");
            throw;
        }
    }

    public async Task<List<FilterOption>> GetAvailableServicesAsync(
        string region = "US", 
        CancellationToken cancellationToken = default)
    {
        try
        {
            var cacheKey = $"{SERVICES_CACHE_KEY}_{region}";
            
            if (_cache.TryGetValue(cacheKey, out List<FilterOption>? cachedServices) && cachedServices != null)
            {
                return cachedServices;
            }

            // Get services from streaming options
            var services = await _context.ContentStreamingOptions
                .Where(so => so.CountryCode == region.ToUpper())
                .GroupBy(so => new { so.ServiceId, so.ServiceName })
                .Select(g => new FilterOption
                {
                    Value = g.Key.ServiceId,
                    Label = g.Key.ServiceName,
                    DisplayName = g.Key.ServiceName,
                    Count = g.Count(),
                    IsPopular = g.Count() >= 50
                })
                .OrderByDescending(s => s.Count)
                .ToListAsync(cancellationToken);

            // Add default popular services if none found in database
            if (!services.Any())
            {
                services = GetDefaultStreamingServices();
            }

            _cache.Set(cacheKey, services, CacheDuration);
            return services;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting available services");
            throw;
        }
    }

    public async Task<YearRange> GetAvailableYearRangesAsync(
        string contentType = "all", 
        CancellationToken cancellationToken = default)
    {
        try
        {
            var cacheKey = $"{YEARS_CACHE_KEY}_{contentType}";
            
            if (_cache.TryGetValue(cacheKey, out YearRange? cachedRange) && cachedRange != null)
            {
                return cachedRange;
            }

            var query = _context.SearchableContents.AsQueryable();

            // Apply content type filter
            if (contentType != "all")
            {
                var parsedType = ParseContentType(contentType);
                if (parsedType.HasValue)
                {
                    query = query.Where(c => c.Type == parsedType.Value);
                }
            }

            var yearStats = await query
                .Where(c => c.Year.HasValue)
                .GroupBy(c => 1)
                .Select(g => new YearRange
                {
                    MinYear = g.Min(c => c.Year!.Value),
                    MaxYear = g.Max(c => c.Year!.Value),
                    MostCommonYear = g.GroupBy(c => c.Year!.Value)
                                     .OrderByDescending(yg => yg.Count())
                                     .Select(yg => yg.Key)
                                     .FirstOrDefault()
                })
                .FirstOrDefaultAsync(cancellationToken);

            // Fallback to default ranges if no data
            var yearRange = yearStats ?? new YearRange
            {
                MinYear = 1900,
                MaxYear = DateTime.Now.Year + 1,
                MostCommonYear = DateTime.Now.Year
            };

            _cache.Set(cacheKey, yearRange, CacheDuration);
            return yearRange;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting year ranges");
            throw;
        }
    }

    public async Task<RuntimeRange> GetAvailableRuntimeRangesAsync(
        string contentType = "all", 
        CancellationToken cancellationToken = default)
    {
        try
        {
            var cacheKey = $"{RUNTIME_CACHE_KEY}_{contentType}";
            
            if (_cache.TryGetValue(cacheKey, out RuntimeRange? cachedRange) && cachedRange != null)
            {
                return cachedRange;
            }

            var query = _context.SearchableContents.AsQueryable();

            // Apply content type filter (runtime mainly applies to movies)
            if (contentType != "all")
            {
                var parsedType = ParseContentType(contentType);
                if (parsedType.HasValue)
                {
                    query = query.Where(c => c.Type == parsedType.Value);
                }
            }

            var runtimeStats = await query
                .Where(c => c.RuntimeMinutes.HasValue && c.RuntimeMinutes > 0)
                .GroupBy(c => 1)
                .Select(g => new RuntimeRange
                {
                    MinRuntimeMinutes = g.Min(c => c.RuntimeMinutes!.Value),
                    MaxRuntimeMinutes = g.Max(c => c.RuntimeMinutes!.Value),
                    AverageRuntimeMinutes = (int)g.Average(c => c.RuntimeMinutes!.Value)
                })
                .FirstOrDefaultAsync(cancellationToken);

            // Fallback to default ranges if no data
            var runtimeRange = runtimeStats ?? new RuntimeRange
            {
                MinRuntimeMinutes = 60,
                MaxRuntimeMinutes = 180,
                AverageRuntimeMinutes = 120
            };

            runtimeRange.MinRuntime = runtimeRange.MinRuntimeMinutes;
            runtimeRange.MaxRuntime = runtimeRange.MaxRuntimeMinutes;

            _cache.Set(cacheKey, runtimeRange, CacheDuration);
            return runtimeRange;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting runtime ranges");
            throw;
        }
    }

    public async Task<FilterValidationResult> ValidateFiltersAsync(
        GlobalSearchRequest request, 
        CancellationToken cancellationToken = default)
    {
        var result = new FilterValidationResult { IsValid = true };

        try
        {
            // Validate year ranges
            if (request.Filters?.MinYear.HasValue == true && request.Filters?.MaxYear.HasValue == true)
            {
                if (request.Filters.MinYear > request.Filters.MaxYear)
                {
                    result.IsValid = false;
                    result.Errors.Add("MinYear cannot be greater than MaxYear");
                }
            }

            // Validate rating ranges
            if (request.Filters?.MinRating.HasValue == true && request.Filters?.MaxRating.HasValue == true)
            {
                if (request.Filters.MinRating > request.Filters.MaxRating)
                {
                    result.IsValid = false;
                    result.Errors.Add("MinRating cannot be greater than MaxRating");
                }
            }

            // Validate runtime ranges
            if (request.Filters?.MinRuntime.HasValue == true && request.Filters?.MaxRuntime.HasValue == true)
            {
                if (request.Filters.MinRuntime > request.Filters.MaxRuntime)
                {
                    result.IsValid = false;
                    result.Errors.Add("MinRuntime cannot be greater than MaxRuntime");
                }
            }

            // Validate rating values
            if (request.Filters?.MinRating.HasValue == true && (request.Filters.MinRating < 0 || request.Filters.MinRating > 10))
            {
                result.IsValid = false;
                result.Errors.Add("MinRating must be between 0 and 10");
            }

            if (request.Filters?.MaxRating.HasValue == true && (request.Filters.MaxRating < 0 || request.Filters.MaxRating > 10))
            {
                result.IsValid = false;
                result.Errors.Add("MaxRating must be between 0 and 10");
            }

            // Validate year values
            var currentYear = DateTime.Now.Year;
            if (request.Filters?.MinYear.HasValue == true && (request.Filters.MinYear < 1900 || request.Filters.MinYear > currentYear + 5))
            {
                result.Warnings.Add($"MinYear should be between 1900 and {currentYear + 5}");
            }

            if (request.Filters?.MaxYear.HasValue == true && (request.Filters.MaxYear < 1900 || request.Filters.MaxYear > currentYear + 5))
            {
                result.Warnings.Add($"MaxYear should be between 1900 and {currentYear + 5}");
            }

            // Validate genres against available options
            if (request.Filters?.Genres?.Any() == true)
            {
                var availableGenres = await GetAvailableGenresAsync("all", "US", cancellationToken);
                var availableGenreValues = availableGenres.Select(g => g.Value.ToLowerInvariant()).ToHashSet();

                var invalidGenres = request.Filters.Genres
                    .Where(g => !availableGenreValues.Contains(g.ToLowerInvariant()))
                    .ToList();

                if (invalidGenres.Any())
                {
                    result.Warnings.Add($"Unknown genres: {string.Join(", ", invalidGenres)}");
                }
            }

            // Validate streaming services
            if (request.Filters?.StreamingServices?.Any() == true)
            {
                var availableServices = await GetAvailableServicesAsync("US", cancellationToken);
                var availableServiceIds = availableServices.Select(s => s.Value.ToLowerInvariant()).ToHashSet();

                var invalidServices = request.Filters.StreamingServices
                    .Where(s => !availableServiceIds.Contains(s.ToLowerInvariant()))
                    .ToList();

                if (invalidServices.Any())
                {
                    result.Warnings.Add($"Unknown streaming services: {string.Join(", ", invalidServices)}");
                }
            }

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating filters");
            result.IsValid = false;
            result.Errors.Add("Error occurred during filter validation");
            return result;
        }
    }

    public async Task<List<FilterSuggestion>> GenerateFilterSuggestionsAsync(
        GlobalSearchRequest request, 
        int currentResultCount = 0, 
        CancellationToken cancellationToken = default)
    {
        var suggestions = new List<FilterSuggestion>();

        try
        {
            // If too many results, suggest narrowing filters
            if (currentResultCount > 100)
            {
                suggestions.Add(new FilterSuggestion
                {
                    Type = "Genre",
                    FilterName = "genres",
                    Reason = "Too many results - try adding a genre filter",
                    EstimatedResultsImprovement = -50
                });

                suggestions.Add(new FilterSuggestion
                {
                    Type = "Rating",
                    FilterName = "minRating",
                    SuggestedValue = "7.0",
                    Reason = "Filter for highly rated content",
                    EstimatedResultsImprovement = -30
                });
            }

            // If too few results, suggest broadening filters
            if (currentResultCount < 10)
            {
                if (request.Filters?.MinRating.HasValue == true && request.Filters.MinRating > 6)
                {
                    suggestions.Add(new FilterSuggestion
                    {
                        Type = "Rating",
                        FilterName = "minRating",
                        SuggestedValue = "5.0",
                        Reason = "Lower minimum rating to see more results",
                        EstimatedResultsImprovement = 20
                    });
                }

                if (request.Filters?.MinYear.HasValue == true && request.Filters.MinYear > 2010)
                {
                    suggestions.Add(new FilterSuggestion
                    {
                        Type = "Year",
                        FilterName = "minYear",
                        SuggestedValue = "2000",
                        Reason = "Include older content",
                        EstimatedResultsImprovement = 15
                    });
                }
            }

            // Suggest popular genres if none selected
            if (request.Filters?.Genres?.Any() != true)
            {
                var popularGenres = await GetPopularGenresForQuery(request.Query, cancellationToken);
                foreach (var genre in popularGenres.Take(2))
                {
                    suggestions.Add(new FilterSuggestion
                    {
                        Type = "Genre",
                        FilterName = "genres",
                        SuggestedValue = genre,
                        Reason = $"Popular {genre} content matches your search",
                        EstimatedResultsImprovement = 5
                    });
                }
            }

            return suggestions;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating filter suggestions");
            return suggestions; // Return empty list instead of throwing
        }
    }

    public IQueryable<SearchableContent> ApplyFilters(IQueryable<SearchableContent> query, ContentSearchFilters filters)
    {
        if (filters == null) return query;

        try
        {
            // Content type filter
            if (filters.ContentType.HasValue && filters.ContentType.Value != ContentType.All)
            {
                query = query.Where(c => c.Type == filters.ContentType.Value);
            }

            // Genre filter
            if (filters.Genres?.Any() == true)
            {
                query = query.Where(c => filters.Genres.Any(genre => 
                    c.GenresJson.Contains($"\"{genre}\"") || 
                    c.SearchableGenres.ToLower().Contains(genre.ToLower())));
            }

            // Rating filter
            if (filters.MinRating.HasValue)
            {
                query = query.Where(c => c.Rating >= filters.MinRating.Value);
            }

            if (filters.MaxRating.HasValue)
            {
                query = query.Where(c => c.Rating <= filters.MaxRating.Value);
            }

            // Year filter
            if (filters.MinYear.HasValue)
            {
                query = query.Where(c => c.Year >= filters.MinYear.Value);
            }

            if (filters.MaxYear.HasValue)
            {
                query = query.Where(c => c.Year <= filters.MaxYear.Value);
            }

            // Runtime filter
            if (filters.MinRuntime.HasValue)
            {
                query = query.Where(c => c.RuntimeMinutes >= filters.MinRuntime.Value);
            }

            if (filters.MaxRuntime.HasValue)
            {
                query = query.Where(c => c.RuntimeMinutes <= filters.MaxRuntime.Value);
            }

            // Language filter
            if (!string.IsNullOrEmpty(filters.Language))
            {
                query = query.Where(c => c.Language == filters.Language);
            }

            // Adult content filter
            if (!filters.IncludeAdult)
            {
                query = query.Where(c => !c.IsAdult);
            }

            // Streaming services filter (requires join with streaming options)
            if (filters.StreamingServices?.Any() == true)
            {
                query = query.Where(c => c.StreamingOptions.Any(so => 
                    filters.StreamingServices.Contains(so.ServiceId)));
            }

            return query;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error applying filters");
            return query; // Return unfiltered query instead of throwing
        }
    }

    #region Private Helper Methods

    private async Task<List<FilterOption>> GetAvailableLanguagesAsync(string contentType, CancellationToken cancellationToken)
    {
        var languages = await _context.SearchableContents
            .Where(c => !string.IsNullOrEmpty(c.Language))
            .GroupBy(c => c.Language)
            .Select(g => new FilterOption
            {
                Value = g.Key!,
                Label = GetLanguageName(g.Key!),
                DisplayName = GetLanguageName(g.Key!),
                Count = g.Count(),
                IsPopular = g.Count() >= 100
            })
            .OrderByDescending(l => l.Count)
            .Take(20)
            .ToListAsync(cancellationToken);

        return languages;
    }

    private async Task<List<FilterOption>> GetAvailableCountriesAsync(CancellationToken cancellationToken)
    {
        var countries = await _context.ContentStreamingOptions
            .GroupBy(so => so.CountryCode)
            .Select(g => new FilterOption
            {
                Value = g.Key,
                Label = GetCountryName(g.Key),
                DisplayName = GetCountryName(g.Key),
                Count = g.Count(),
                IsPopular = g.Count() >= 50
            })
            .OrderByDescending(c => c.Count)
            .Take(20)
            .ToListAsync(cancellationToken);

        // Add default countries if none found
        if (!countries.Any())
        {
            countries = GetDefaultCountries();
        }

        return countries;
    }

    private async Task<List<FilterOption>> GetAvailableContentRatingsAsync(string contentType, CancellationToken cancellationToken)
    {
        var ratings = await _context.SearchableContents
            .Where(c => !string.IsNullOrEmpty(c.ContentRating))
            .GroupBy(c => c.ContentRating)
            .Select(g => new FilterOption
            {
                Value = g.Key!,
                Label = g.Key!,
                DisplayName = g.Key!,
                Count = g.Count(),
                IsPopular = g.Count() >= 10
            })
            .OrderBy(r => GetContentRatingOrder(r.Value))
            .ToListAsync(cancellationToken);

        return ratings;
    }

    private async Task<List<string>> GetPopularGenresForQuery(string query, CancellationToken cancellationToken)
    {
        // This is a simplified implementation - in practice you might use NLP or ML
        var queryLower = query.ToLowerInvariant();
        
        var genreMap = new Dictionary<string, List<string>>
        {
            { "action", new List<string> { "Action", "Adventure", "Thriller" } },
            { "comedy", new List<string> { "Comedy", "Romance", "Family" } },
            { "drama", new List<string> { "Drama", "Romance", "Biography" } },
            { "horror", new List<string> { "Horror", "Thriller", "Mystery" } },
            { "sci-fi", new List<string> { "Science Fiction", "Fantasy", "Adventure" } },
            { "romance", new List<string> { "Romance", "Comedy", "Drama" } }
        };

        foreach (var mapping in genreMap)
        {
            if (queryLower.Contains(mapping.Key))
            {
                return mapping.Value;
            }
        }

        return new List<string>();
    }

    private static ContentType? ParseContentType(string contentType)
    {
        return contentType.ToLowerInvariant() switch
        {
            "movie" => ContentType.Movie,
            "tv" or "series" or "tvseries" => ContentType.TvSeries,
            "documentary" => ContentType.Documentary,
            "person" => ContentType.Person,
            "all" => ContentType.All,
            _ => null
        };
    }

    private static List<FilterOption> GetDefaultStreamingServices()
    {
        return new List<FilterOption>
        {
            new() { Value = "netflix", Label = "Netflix", DisplayName = "Netflix", Count = 1000, IsPopular = true },
            new() { Value = "disney_plus", Label = "Disney+", DisplayName = "Disney+", Count = 800, IsPopular = true },
            new() { Value = "amazon_prime", Label = "Amazon Prime Video", DisplayName = "Amazon Prime Video", Count = 900, IsPopular = true },
            new() { Value = "hbo_max", Label = "HBO Max", DisplayName = "HBO Max", Count = 600, IsPopular = true },
            new() { Value = "hulu", Label = "Hulu", DisplayName = "Hulu", Count = 500, IsPopular = true },
            new() { Value = "apple_tv", Label = "Apple TV+", DisplayName = "Apple TV+", Count = 300, IsPopular = false },
            new() { Value = "paramount_plus", Label = "Paramount+", DisplayName = "Paramount+", Count = 400, IsPopular = false }
        };
    }

    private static List<FilterOption> GetDefaultCountries()
    {
        return new List<FilterOption>
        {
            new() { Value = "US", Label = "United States", DisplayName = "United States", Count = 5000, IsPopular = true },
            new() { Value = "GB", Label = "United Kingdom", DisplayName = "United Kingdom", Count = 3000, IsPopular = true },
            new() { Value = "CA", Label = "Canada", DisplayName = "Canada", Count = 2500, IsPopular = true },
            new() { Value = "AU", Label = "Australia", DisplayName = "Australia", Count = 2000, IsPopular = true },
            new() { Value = "DE", Label = "Germany", DisplayName = "Germany", Count = 1800, IsPopular = false },
            new() { Value = "FR", Label = "France", DisplayName = "France", Count = 1500, IsPopular = false }
        };
    }

    private static string GetLanguageName(string languageCode)
    {
        return languageCode.ToLowerInvariant() switch
        {
            "en" => "English",
            "es" => "Spanish",
            "fr" => "French",
            "de" => "German",
            "it" => "Italian",
            "pt" => "Portuguese",
            "ru" => "Russian",
            "ja" => "Japanese",
            "ko" => "Korean",
            "zh" => "Chinese",
            _ => languageCode.ToUpperInvariant()
        };
    }

    private static string GetCountryName(string countryCode)
    {
        return countryCode.ToUpperInvariant() switch
        {
            "US" => "United States",
            "GB" => "United Kingdom",
            "CA" => "Canada",
            "AU" => "Australia",
            "DE" => "Germany",
            "FR" => "France",
            "IT" => "Italy",
            "ES" => "Spain",
            "BR" => "Brazil",
            "JP" => "Japan",
            "KR" => "South Korea",
            "CN" => "China",
            _ => countryCode
        };
    }

    private static int GetContentRatingOrder(string rating)
    {
        return rating switch
        {
            "G" => 1,
            "PG" => 2,
            "PG-13" => 3,
            "R" => 4,
            "NC-17" => 5,
            "NR" => 6,
            "Unrated" => 7,
            _ => 8
        };
    }

    #endregion
}