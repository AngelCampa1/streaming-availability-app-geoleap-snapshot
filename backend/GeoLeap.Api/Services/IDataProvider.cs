using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

/// <summary>
/// Interface for all data providers in the abstraction layer
/// </summary>
public interface IDataProvider
{
    /// <summary>
    /// Unique identifier for this provider
    /// </summary>
    string Id { get; }
    
    /// <summary>
    /// Human-readable name of the provider
    /// </summary>
    string Name { get; }
    
    /// <summary>
    /// Type of provider (streaming, metadata, etc.)
    /// </summary>
    ProviderType ProviderType { get; }
    
    /// <summary>
    /// Capabilities supported by this provider
    /// </summary>
    ProviderCapability Capabilities { get; }
    
    /// <summary>
    /// Check if the provider is healthy and available
    /// </summary>
    Task<bool> CheckHealthAsync(CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Search for content using this provider
    /// </summary>
    Task<ProviderSearchResult> SearchContentAsync(ContentSearchRequest request, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Get detailed content information
    /// </summary>
    Task<ProviderContentDetails> GetContentDetailsAsync(string contentId, ContentType type, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Get streaming availability information
    /// </summary>
    Task<ProviderStreamingAvailability> GetStreamingAvailabilityAsync(string contentId, string? countryCode = null, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Get person details (actors, directors, etc.)
    /// </summary>
    Task<ProviderPersonDetails> GetPersonDetailsAsync(string personId, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Get available genres
    /// </summary>
    Task<List<ProviderGenre>> GetGenresAsync(ContentType type, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Get available streaming services
    /// </summary>
    Task<List<ProviderStreamingService>> GetAvailableServicesAsync(string? countryCode = null, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Get provider statistics and performance metrics
    /// </summary>
    Task<ProviderStats> GetStatsAsync(CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Get rate limiting information
    /// </summary>
    ProviderRateLimitInfo GetRateLimitInfo();
    
    /// <summary>
    /// Check if a request can be made within rate limits
    /// </summary>
    Task<bool> CanMakeRequestAsync(CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Record a request for rate limiting tracking
    /// </summary>
    Task RecordRequestAsync(CancellationToken cancellationToken = default);
}

/// <summary>
/// Provider search result structure
/// </summary>
public class ProviderSearchResult
{
    public List<ProviderContentSummary> Results { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public string ProviderId { get; set; } = string.Empty;
    public DateTime SearchedAt { get; set; } = DateTime.UtcNow;
    public TimeSpan ResponseTime { get; set; }
}

/// <summary>
/// Provider content summary for search results
/// </summary>
public class ProviderContentSummary
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string OriginalTitle { get; set; } = string.Empty;
    public ContentType Type { get; set; }
    public int? Year { get; set; }
    public string Overview { get; set; } = string.Empty;
    public List<string> Genres { get; set; } = new();
    public string ImageUrl { get; set; } = string.Empty;
    public decimal? Rating { get; set; }
    public string ProviderId { get; set; } = string.Empty;
}

/// <summary>
/// Provider content details structure
/// </summary>
public class ProviderContentDetails
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string OriginalTitle { get; set; } = string.Empty;
    public string Overview { get; set; } = string.Empty;
    public DateTime? ReleaseDate { get; set; }
    public ContentType Type { get; set; }
    public List<string> Genres { get; set; } = new();
    public List<ProviderCastMember> Cast { get; set; } = new();
    public List<ProviderCrewMember> Crew { get; set; } = new();
    public decimal? Rating { get; set; }
    public int? VoteCount { get; set; }
    public string PosterUrl { get; set; } = string.Empty;
    public string BackdropUrl { get; set; } = string.Empty;
    public string ProviderId { get; set; } = string.Empty;
}

/// <summary>
/// Provider streaming availability structure
/// </summary>
public class ProviderStreamingAvailability
{
    public string ContentId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public ContentType Type { get; set; }
    public List<ProviderStreamingOption> StreamingOptions { get; set; } = new();
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
    public string ProviderId { get; set; } = string.Empty;
}

/// <summary>
/// Provider streaming option structure
/// </summary>
public class ProviderStreamingOption
{
    public string ServiceId { get; set; } = string.Empty;
    public string ServiceName { get; set; } = string.Empty;
    public string CountryCode { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty; // subscription, rent, buy
    public decimal? Price { get; set; }
    public string? Currency { get; set; }
    public string? StreamingUrl { get; set; }
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Provider person details structure
/// </summary>
public class ProviderPersonDetails
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Biography { get; set; } = string.Empty;
    public DateTime? Birthday { get; set; }
    public DateTime? Deathday { get; set; }
    public string? PlaceOfBirth { get; set; }
    public string ProfileUrl { get; set; } = string.Empty;
    public string ProviderId { get; set; } = string.Empty;
}

/// <summary>
/// Provider cast member structure
/// </summary>
public class ProviderCastMember
{
    public string Name { get; set; } = string.Empty;
    public string Character { get; set; } = string.Empty;
    public string ProfilePath { get; set; } = string.Empty;
    public int Order { get; set; }
}

/// <summary>
/// Provider crew member structure
/// </summary>
public class ProviderCrewMember
{
    public string Name { get; set; } = string.Empty;
    public string Job { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public string ProfilePath { get; set; } = string.Empty;
}

/// <summary>
/// Provider genre structure
/// </summary>
public class ProviderGenre
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
}

/// <summary>
/// Provider streaming service structure
/// </summary>
public class ProviderStreamingService
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string CountryCode { get; set; } = string.Empty;
    public List<string> SupportedTypes { get; set; } = new();
}

/// <summary>
/// Provider rate limiting information
/// </summary>
public class ProviderRateLimitInfo
{
    public int RequestsPerMinute { get; set; }
    public int RequestsPerHour { get; set; }
    public int RequestsPerDay { get; set; }
    public int CurrentMinuteCount { get; set; }
    public int CurrentHourCount { get; set; }
    public int CurrentDayCount { get; set; }
    public DateTime NextResetTime { get; set; }
    public TimeSpan? RetryAfter { get; set; }
}