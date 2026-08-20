using System.Diagnostics;
using System.Text.RegularExpressions;
using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services.ValidationRules;

/// <summary>
/// Validation rules for ContentMetadata
/// </summary>
public class ContentMetadataValidationRule : IValidationRule<ContentMetadata>
{
    private readonly ILogger<ContentMetadataValidationRule> _logger;
    private static readonly Regex UrlRegex = new(@"^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)$", 
        RegexOptions.Compiled | RegexOptions.IgnoreCase);

    public string Id => "content-metadata-validation";
    public string Name => "Content Metadata Validation";
    public string Description => "Validates required fields and data consistency for content metadata";
    public ValidationSeverity Severity => ValidationSeverity.Error;

    public ContentMetadataValidationRule(ILogger<ContentMetadataValidationRule> logger)
    {
        _logger = logger;
    }

    public async Task<ValidationRuleResult> ValidateAsync(ContentMetadata data, ValidationContext context)
    {
        var stopwatch = Stopwatch.StartNew();
        var result = new ValidationRuleResult { IsValid = true, Severity = Severity };

        try
        {
            // Required fields validation
            ValidateRequiredFields(data, result);
            
            // Data format validation
            ValidateDataFormats(data, result);
            
            // Business logic validation
            ValidateBusinessRules(data, result);
            
            // Content-specific validation
            ValidateContentSpecificRules(data, result);

            stopwatch.Stop();
            result.ExecutionTime = stopwatch.Elapsed;
            
            _logger.LogDebug("Content metadata validation completed in {Duration}ms with {ErrorCount} errors, {WarningCount} warnings", 
                stopwatch.ElapsedMilliseconds, result.Errors.Count, result.Warnings.Count);

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Content metadata validation failed");
            result.IsValid = false;
            result.Errors.Add($"Validation failed: {ex.Message}");
            result.ExecutionTime = stopwatch.Elapsed;
            return result;
        }
    }

    public bool ShouldApply(ValidationContext context)
    {
        // This validation rule should apply for all scopes
        // Content metadata validation is critical regardless of scope
        return true;
    }

    private void ValidateRequiredFields(ContentMetadata data, ValidationRuleResult result)
    {
        if (string.IsNullOrWhiteSpace(data.Title))
        {
            result.IsValid = false;
            result.Errors.Add("Title is required");
        }

        if (data.TmdbId <= 0)
        {
            result.Warnings.Add("TmdbId should be a positive integer");
        }
    }

    private void ValidateDataFormats(ContentMetadata data, ValidationRuleResult result)
    {
        // Title length validation
        if (!string.IsNullOrEmpty(data.Title) && data.Title.Length > 500)
        {
            result.IsValid = false;
            result.Errors.Add("Title exceeds maximum length of 500 characters");
        }

        // Overview length validation
        if (!string.IsNullOrEmpty(data.Overview) && data.Overview.Length > 2000)
        {
            result.Warnings.Add("Overview is very long (>2000 characters), consider truncating");
        }

        // Homepage URL validation
        if (!string.IsNullOrEmpty(data.Homepage) && !UrlRegex.IsMatch(data.Homepage))
        {
            result.Warnings.Add("Homepage URL format appears invalid");
        }

        // Poster and backdrop path validation
        if (!string.IsNullOrEmpty(data.PosterPath) && !data.PosterPath.StartsWith("/"))
        {
            result.Warnings.Add("PosterPath should start with '/' for TMDb compatibility");
        }

        if (!string.IsNullOrEmpty(data.BackdropPath) && !data.BackdropPath.StartsWith("/"))
        {
            result.Warnings.Add("BackdropPath should start with '/' for TMDb compatibility");
        }
    }

    private void ValidateBusinessRules(ContentMetadata data, ValidationRuleResult result)
    {
        // Release date validation
        if (data.ReleaseDate.HasValue)
        {
            var releaseDate = data.ReleaseDate.Value;
            var currentDate = DateTime.UtcNow;
            
            if (releaseDate > currentDate.AddYears(5))
            {
                result.Warnings.Add("Release date is more than 5 years in the future");
            }
            
            if (releaseDate < new DateTime(1888, 1, 1)) // First film ever made
            {
                result.Warnings.Add("Release date is before 1888 (before cinema was invented)");
            }
        }

        // Rating validation
        if (data.VoteAverage.HasValue)
        {
            var rating = data.VoteAverage.Value;
            if (rating < 0 || rating > 10)
            {
                result.IsValid = false;
                result.Errors.Add("Vote average must be between 0 and 10");
            }
            
            if (rating > 0 && data.VoteCount == 0)
            {
                result.Warnings.Add("Vote average exists but vote count is 0");
            }
        }

        // Vote count validation
        if (data.VoteCount < 0)
        {
            result.IsValid = false;
            result.Errors.Add("Vote count cannot be negative");
        }

        // Budget and revenue validation (for movies)
        if (data.Type == TmdbContentType.Movie)
        {
            if (data.Budget.HasValue && data.Budget.Value < 0)
            {
                result.Errors.Add("Budget cannot be negative");
            }
            
            if (data.Revenue.HasValue && data.Revenue.Value < 0)
            {
                result.Errors.Add("Revenue cannot be negative");
            }
        }
    }

    private void ValidateContentSpecificRules(ContentMetadata data, ValidationRuleResult result)
    {
        // Movie-specific validation
        if (data.Type == TmdbContentType.Movie)
        {
            // Movies should not have TV series fields
            if (data.NumberOfSeasons.HasValue || data.NumberOfEpisodes.HasValue)
            {
                result.IsValid = false;
                result.Errors.Add("Movie has TV series fields (NumberOfSeasons, NumberOfEpisodes)");
            }
            
            if (data.Runtime.HasValue)
            {
                var runtime = data.Runtime.Value;
                if (runtime <= 0)
                {
                    result.Errors.Add("Movie runtime must be positive");
                }
                else if (runtime > 1000) // Over 16 hours
                {
                    result.Warnings.Add("Movie runtime seems unusually long (>1000 minutes)");
                }
                else if (runtime < 5)
                {
                    result.Warnings.Add("Movie runtime seems unusually short (<5 minutes)");
                }
            }
        }

        // TV Show-specific validation
        if (data.Type == TmdbContentType.TvSeries)
        {
            if (data.NumberOfSeasons.HasValue && data.NumberOfSeasons.Value <= 0)
            {
                result.IsValid = false;
                result.Errors.Add("TV show must have at least 1 season");
            }
            
            if (data.NumberOfEpisodes.HasValue && data.NumberOfEpisodes.Value <= 0)
            {
                result.IsValid = false;
                result.Errors.Add("TV show must have at least 1 episode");
            }
            
            // Check for logical consistency
            if (data.NumberOfSeasons.HasValue && data.NumberOfEpisodes.HasValue)
            {
                var avgEpisodesPerSeason = (double)data.NumberOfEpisodes.Value / data.NumberOfSeasons.Value;
                if (avgEpisodesPerSeason < 0.5)
                {
                    result.Warnings.Add("Average episodes per season seems low");
                }
                else if (avgEpisodesPerSeason > 100)
                {
                    result.Warnings.Add("Average episodes per season seems unusually high");
                }
            }
        }

        // Genre validation
        if (data.Genres?.Any() == true)
        {
            var validGenres = GetValidGenres(data.Type);
            var invalidGenres = data.Genres.Where(g => 
                !validGenres.Contains(g, StringComparer.OrdinalIgnoreCase) && 
                !string.IsNullOrWhiteSpace(g)).ToList();
            
            if (invalidGenres.Any())
            {
                result.Warnings.Add($"Unknown genres detected: {string.Join(", ", invalidGenres)}");
            }
            
            if (data.Genres.Count > 10)
            {
                result.Warnings.Add("Content has unusually many genres (>10)");
            }
        }

        // Cast validation
        if (data.Cast?.Any() == true)
        {
            var duplicateActors = data.Cast
                .GroupBy(c => c.Name, StringComparer.OrdinalIgnoreCase)
                .Where(g => g.Count() > 1)
                .Select(g => g.Key)
                .ToList();
                
            if (duplicateActors.Any())
            {
                result.Warnings.Add($"Duplicate cast members found: {string.Join(", ", duplicateActors)}");
            }
        }

        // Language validation
        if (!string.IsNullOrEmpty(data.OriginalLanguage))
        {
            if (data.OriginalLanguage.Length != 2)
            {
                result.Warnings.Add("Original language should be a 2-character ISO 639-1 code");
            }
        }
    }

    private List<string> GetValidGenres(TmdbContentType contentType)
    {
        return contentType switch
        {
            TmdbContentType.Movie => new List<string> 
            {
                "Action", "Adventure", "Animation", "Comedy", "Crime", "Documentary", 
                "Drama", "Family", "Fantasy", "History", "Horror", "Music", "Mystery", 
                "Romance", "Science Fiction", "TV Movie", "Thriller", "War", "Western"
            },
            TmdbContentType.TvSeries => new List<string> 
            {
                "Action & Adventure", "Animation", "Comedy", "Crime", "Documentary", 
                "Drama", "Family", "Kids", "Mystery", "News", "Reality", "Sci-Fi & Fantasy", 
                "Soap", "Talk", "War & Politics", "Western"
            },
            _ => new List<string>()
        };
    }
}

/// <summary>
/// Validation rules for StreamingAvailabilityResponse
/// </summary>
public class StreamingAvailabilityValidationRule : IValidationRule<StreamingAvailabilityResponse>
{
    private readonly ILogger<StreamingAvailabilityValidationRule> _logger;
    private static readonly HashSet<string> ValidCountryCodes = new()
    {
        "US", "GB", "CA", "AU", "DE", "FR", "IT", "ES", "NL", "SE", "NO", "DK", "FI", "JP", "KR", "BR", "MX", "AR", "IN"
    };

    public string Id => "streaming-availability-validation";
    public string Name => "Streaming Availability Validation";
    public string Description => "Validates streaming availability data integrity and completeness";
    public ValidationSeverity Severity => ValidationSeverity.Warning;

    public StreamingAvailabilityValidationRule(ILogger<StreamingAvailabilityValidationRule> logger)
    {
        _logger = logger;
    }

    public async Task<ValidationRuleResult> ValidateAsync(StreamingAvailabilityResponse data, ValidationContext context)
    {
        var stopwatch = Stopwatch.StartNew();
        var result = new ValidationRuleResult { IsValid = true, Severity = Severity };

        try
        {
            // Basic required fields
            ValidateRequiredFields(data, result);
            
            // Streaming options validation
            ValidateStreamingOptions(data, result);
            
            // Data freshness validation
            ValidateDataFreshness(data, result);

            stopwatch.Stop();
            result.ExecutionTime = stopwatch.Elapsed;
            
            _logger.LogDebug("Streaming availability validation completed in {Duration}ms with {ErrorCount} errors, {WarningCount} warnings", 
                stopwatch.ElapsedMilliseconds, result.Errors.Count, result.Warnings.Count);

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Streaming availability validation failed");
            result.IsValid = false;
            result.Errors.Add($"Validation failed: {ex.Message}");
            result.ExecutionTime = stopwatch.Elapsed;
            return result;
        }
    }

    public bool ShouldApply(ValidationContext context)
    {
        return true; // Always apply streaming availability validation
    }

    private void ValidateRequiredFields(StreamingAvailabilityResponse data, ValidationRuleResult result)
    {
        if (string.IsNullOrWhiteSpace(data.ContentId))
        {
            result.Warnings.Add("ContentId is missing");
        }

        if (string.IsNullOrWhiteSpace(data.Title))
        {
            result.Warnings.Add("Title is missing");
        }
    }

    private void ValidateStreamingOptions(StreamingAvailabilityResponse data, ValidationRuleResult result)
    {
        if (data.StreamingOptions?.Any() != true)
        {
            result.Warnings.Add("No streaming options available");
            return;
        }

        foreach (var option in data.StreamingOptions)
        {
            ValidateStreamingOption(option, result);
        }

        // Check for duplicate options
        var duplicates = data.StreamingOptions
            .GroupBy(o => new { o.ServiceId, o.CountryCode, o.Type })
            .Where(g => g.Count() > 1)
            .ToList();
            
        if (duplicates.Any())
        {
            result.Warnings.Add($"Found {duplicates.Count} duplicate streaming options");
        }
    }

    private void ValidateStreamingOption(StreamingOption option, ValidationRuleResult result)
    {
        // Service information validation
        if (string.IsNullOrWhiteSpace(option.ServiceId))
        {
            result.Warnings.Add("Missing service ID for streaming option");
        }

        if (string.IsNullOrWhiteSpace(option.ServiceName))
        {
            result.Warnings.Add($"Missing service name for option {option.ServiceId}");
        }

        // Country code validation
        if (!IsValidCountryCode(option.CountryCode))
        {
            result.Warnings.Add($"Invalid country code: {option.CountryCode}");
        }

        // Pricing validation
        if (option.Type == StreamingType.Rental || option.Type == StreamingType.Purchase)
        {
            if (!option.Price.HasValue)
            {
                result.Warnings.Add($"Missing price for {option.Type} option on {option.ServiceName}");
            }
            else if (option.Price <= 0)
            {
                result.Warnings.Add($"Invalid price {option.Price} for {option.Type} option");
            }
            else if (option.Price > 100) // Unusually high price
            {
                result.Warnings.Add($"Unusually high price {option.Price} for {option.Type} option");
            }

            if (string.IsNullOrWhiteSpace(option.Currency))
            {
                result.Warnings.Add($"Missing currency for paid {option.Type} option");
            }
        }

        // URL validation
        if (!string.IsNullOrWhiteSpace(option.StreamingUrl))
        {
            if (!Uri.IsWellFormedUriString(option.StreamingUrl, UriKind.Absolute))
            {
                result.Warnings.Add($"Invalid streaming URL: {option.StreamingUrl}");
            }
        }

        // Quality validation
        if (option.VideoQuality?.Any() == true)
        {
            var invalidQualities = option.VideoQuality.Where(q => 
                !IsValidVideoQuality(q)).ToList();
                
            if (invalidQualities.Any())
            {
                result.Warnings.Add($"Invalid video qualities: {string.Join(", ", invalidQualities)}");
            }
        }

        // Language validation
        if (option.AudioLanguages?.Any() == true)
        {
            var invalidLanguages = option.AudioLanguages.Where(lang => 
                string.IsNullOrWhiteSpace(lang) || lang.Length < 2).ToList();
                
            if (invalidLanguages.Any())
            {
                result.Warnings.Add($"Invalid audio language codes detected");
            }
        }

        // Expiration validation
        if (option.ExpiresAt.HasValue && option.ExpiresAt.Value < DateTime.UtcNow)
        {
            result.Warnings.Add($"Streaming option has expired ({option.ExpiresAt.Value:yyyy-MM-dd})");
        }

        // Last updated validation
        if (option.LastUpdated < DateTime.UtcNow.AddDays(-30))
        {
            result.Warnings.Add($"Streaming option data is over 30 days old");
        }
    }

    private void ValidateDataFreshness(StreamingAvailabilityResponse data, ValidationRuleResult result)
    {
        var age = DateTime.UtcNow - data.LastUpdated;
        
        if (age > TimeSpan.FromDays(7))
        {
            result.Warnings.Add($"Streaming availability data is {age.Days} days old");
        }
        
        if (age > TimeSpan.FromDays(30))
        {
            result.Errors.Add($"Streaming availability data is over 30 days old and may be unreliable");
        }
    }

    private bool IsValidCountryCode(string countryCode)
    {
        return !string.IsNullOrWhiteSpace(countryCode) && 
               countryCode.Length == 2 && 
               countryCode.All(char.IsLetter) &&
               ValidCountryCodes.Contains(countryCode.ToUpper());
    }

    private bool IsValidVideoQuality(string quality)
    {
        var validQualities = new[] { "SD", "HD", "FHD", "UHD", "4K", "HDR", "Dolby Vision" };
        return validQualities.Contains(quality, StringComparer.OrdinalIgnoreCase);
    }
}