using System.ComponentModel.DataAnnotations;

namespace GeoLeap.Api.Models;

// Unified data models for the abstraction layer

/// <summary>
/// Request model for content search across all providers (unified version)
/// </summary>
public class UnifiedContentSearchRequest
{
    [Required]
    public string Query { get; set; } = string.Empty;
    
    public ContentType? ContentType { get; set; }
    
    public string[]? Countries { get; set; }
    
    public int Page { get; set; } = 1;
    
    [Range(1, 50)]
    public int PageSize { get; set; } = 10;
    
    public DataQuality RequiredQuality { get; set; } = DataQuality.Standard;
    
    public string? Language { get; set; } = "en-US";
    
    public int? Year { get; set; }
    
    public bool IncludeAdult { get; set; } = false;
}

/// <summary>
/// Unified search result response
/// </summary>
public class UnifiedContentSearchResult
{
    public List<ContentSummary> Results { get; set; } = new();
    public int TotalResults { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public bool HasMore { get; set; }
    public DateTime SearchedAt { get; set; } = DateTime.UtcNow;
    public TimeSpan ResponseTime { get; set; }
    public List<string> DataSources { get; set; } = new();
}

/// <summary>
/// Unified content summary for search results
/// </summary>
public class ContentSummary
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string OriginalTitle { get; set; } = string.Empty;
    public ContentType Type { get; set; }
    public int? Year { get; set; }
    public string Overview { get; set; } = string.Empty;
    public List<string> Genres { get; set; } = new();
    public string ImageUrl { get; set; } = string.Empty;
    public string PosterUrl { get; set; } = string.Empty;
    public decimal? Rating { get; set; }
    public int? RuntimeMinutes { get; set; }
    public string Language { get; set; } = string.Empty;
    public string ContentRating { get; set; } = string.Empty; // e.g., "G", "PG", "PG-13", "R", "NC-17"
    public int AvailableCountries { get; set; }
    public int AvailableServices { get; set; }  // BUG FIX: Added for streaming service count
    public List<string> DataSources { get; set; } = new();
    public List<GlobalStreamingOption> StreamingOptions { get; set; } = new();  // BUG FIX: Added for detailed streaming data
    public decimal RelevanceScore { get; set; }  // Added for search result sorting by relevance

    // Subscription-based enrichment
    public bool IsOnUserService { get; set; } = false;
    public int UserServiceMatchCount { get; set; } = 0;
}

/// <summary>
/// Unified detailed content information - extends existing ContentMetadata
/// </summary>
public class ContentDetails : ContentMetadata
{
    public List<string> DataSources { get; set; } = new();
    public new DateTime LastUpdated { get; set; } = DateTime.UtcNow;
    public int AvailableCountries { get; set; }
    public ContentRatings Ratings { get; set; } = new();
    public ContentImages Images { get; set; } = new();
    public new ExternalIds ExternalIds { get; set; } = new();
}

/// <summary>
/// Content rating information from various sources
/// </summary>
public class ContentRatings
{
    public decimal? ImdbRating { get; set; }
    public decimal? RottenTomatoesRating { get; set; }
    public decimal? MetacriticRating { get; set; }
    public decimal? UserRating { get; set; }
    public int? VoteCount { get; set; }
    public string ContentRating { get; set; } = string.Empty; // PG, PG-13, etc.
}

/// <summary>
/// Content images from various sources
/// </summary>
public class ContentImages
{
    public string PosterUrl { get; set; } = string.Empty;
    public string BackdropUrl { get; set; } = string.Empty;
    public List<string> Posters { get; set; } = new();
    public List<string> Backdrops { get; set; } = new();
    public List<string> Logos { get; set; } = new();
}

/// <summary>
/// External IDs from various providers
/// </summary>
public class ExternalIds
{
    public string? ImdbId { get; set; }
    public int? TmdbId { get; set; }
    public string? TvdbId { get; set; }
    public string? JustWatchId { get; set; }
    public string? StreamingAvailabilityId { get; set; }
}

/// <summary>
/// Provider health status information
/// </summary>
public class ProviderHealthStatus
{
    public List<ProviderHealth> Providers { get; set; } = new();
    public DateTime LastChecked { get; set; } = DateTime.UtcNow;
    public OverallHealthStatus OverallStatus { get; set; }
    public string Summary { get; set; } = string.Empty;
}

/// <summary>
/// Individual provider health information
/// </summary>
public class ProviderHealth
{
    public string ProviderId { get; set; } = string.Empty;
    public string ProviderName { get; set; } = string.Empty;
    public bool IsHealthy { get; set; }
    public DateTime LastCheckTime { get; set; } = DateTime.UtcNow;
    public TimeSpan AverageResponseTime { get; set; }
    public int ConsecutiveFailures { get; set; }
    public string? LastError { get; set; }
    public ProviderCapability AvailableCapabilities { get; set; }
    public ProviderStats Stats { get; set; } = new();
}

/// <summary>
/// Provider statistics
/// </summary>
public class ProviderStats
{
    public int RequestsToday { get; set; }
    public int RequestsThisMonth { get; set; }
    public int SuccessfulRequests { get; set; }
    public int FailedRequests { get; set; }
    public double SuccessRate => RequestsToday > 0 ? (double)SuccessfulRequests / RequestsToday * 100 : 0;
    public TimeSpan AverageResponseTime { get; set; }
    public decimal CostToday { get; set; }
    public decimal CostThisMonth { get; set; }
}

/// <summary>
/// Exception thrown when all providers fail
/// </summary>
public class AllProvidersFailedException : Exception
{
    public AllProvidersFailedException(string message, Exception? innerException = null)
        : base(message, innerException)
    {
    }
}

/// <summary>
/// Exception thrown when no providers are available for a capability
/// </summary>
public class NoAvailableProvidersException : Exception
{
    public NoAvailableProvidersException(string message)
        : base(message)
    {
    }
}

/// <summary>
/// Exception thrown when an unsupported provider type is encountered
/// </summary>
public class UnsupportedProviderTypeException : Exception
{
    public UnsupportedProviderTypeException(string message)
        : base(message)
    {
    }
}

// DataQuality enum moved to FilterModels.cs to avoid duplicate

/// <summary>
/// Overall system health status
/// </summary>
public enum OverallHealthStatus
{
    Healthy,
    Degraded,
    Unhealthy
}

/// <summary>
/// Provider capabilities flags
/// </summary>
[Flags]
public enum ProviderCapability
{
    None = 0,
    Search = 1,
    ContentDetails = 2,
    StreamingAvailability = 4,
    PersonDetails = 8,
    Images = 16,
    Genres = 32,
    All = Search | ContentDetails | StreamingAvailability | PersonDetails | Images | Genres
}

/// <summary>
/// Types of data providers
/// </summary>
public enum ProviderType
{
    StreamingAvailability,
    ContentMetadata,
    Images,
    Reviews,
    Subtitles
}

/// <summary>
/// Provider selection strategies
/// </summary>
public enum ProviderSelectionStrategy
{
    Primary,
    LoadBalanced,
    FailoverChain,
    BestQuality,
    CostOptimized
}

/// <summary>
/// Unified response containing all content information
/// </summary>
public class UnifiedContentResponse
{
    public ContentDetails? ContentData { get; set; }
    public StreamingAvailabilityResponse? StreamingData { get; set; }
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
    public List<string> DataSources { get; set; } = new();
    public Dictionary<string, object> Metadata { get; set; } = new();
}