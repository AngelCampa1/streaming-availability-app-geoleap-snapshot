namespace GeoLeap.Api.Models;

// Provider-specific data models for transformation

/// <summary>
/// Generic provider search result that gets transformed to ContentSearchResult
/// </summary>
public class ProviderSearchResult
{
    public List<ProviderContentSummary> Results { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public string ProviderId { get; set; } = string.Empty;
    public DateTime ResponseTime { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Provider-specific content summary
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
    public string ImagePath { get; set; } = string.Empty;
    public decimal? Rating { get; set; }
    public string ProviderId { get; set; } = string.Empty;
    public Dictionary<string, object> ProviderSpecificData { get; set; } = new();
}

/// <summary>
/// Provider-specific detailed content information
/// </summary>
public class ProviderContentDetails
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string OriginalTitle { get; set; } = string.Empty;
    public ContentType Type { get; set; }
    public string Overview { get; set; } = string.Empty;
    public DateTime? ReleaseDate { get; set; }
    public int? RuntimeMinutes { get; set; }
    public List<ProviderGenre> Genres { get; set; } = new();
    public List<ProviderCastMember> Cast { get; set; } = new();
    public List<ProviderCrewMember> Crew { get; set; } = new();
    public ProviderRatings? Ratings { get; set; }
    public ProviderImages? Images { get; set; }
    public ProviderExternalIds? ExternalIds { get; set; }
    public List<string> ProductionCompanies { get; set; } = new();
    public List<string> ProductionCountries { get; set; } = new();
    public List<string> SpokenLanguages { get; set; } = new();
    public string Status { get; set; } = string.Empty;
    public string ProviderId { get; set; } = string.Empty;
    public Dictionary<string, object> ProviderSpecificData { get; set; } = new();
}

/// <summary>
/// Provider-specific streaming availability
/// </summary>
public class ProviderStreamingAvailability
{
    public string ContentId { get; set; } = string.Empty;
    public List<ProviderStreamingOption> StreamingOptions { get; set; } = new();
    public string ProviderId { get; set; } = string.Empty;
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Provider-specific streaming option
/// </summary>
public class ProviderStreamingOption
{
    public string ServiceId { get; set; } = string.Empty;
    public string ServiceName { get; set; } = string.Empty;
    public string CountryCode { get; set; } = string.Empty;
    public string CountryName { get; set; } = string.Empty;
    public StreamingType Type { get; set; }
    public decimal? Price { get; set; }
    public string Currency { get; set; } = string.Empty;
    public string StreamingUrl { get; set; } = string.Empty;
    public List<string> VideoQuality { get; set; } = new();
    public List<string> AudioLanguages { get; set; } = new();
    public List<string> SubtitleLanguages { get; set; } = new();
    public DateTime? ExpiresAt { get; set; }
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Provider-specific person details
/// </summary>
public class ProviderPersonDetails
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Biography { get; set; } = string.Empty;
    public DateTime? Birthday { get; set; }
    public DateTime? Deathday { get; set; }
    public string PlaceOfBirth { get; set; } = string.Empty;
    public string ProfileImagePath { get; set; } = string.Empty;
    public List<string> KnownFor { get; set; } = new();
    public string Department { get; set; } = string.Empty;
    public ProviderExternalIds? ExternalIds { get; set; }
    public string ProviderId { get; set; } = string.Empty;
    public Dictionary<string, object> ProviderSpecificData { get; set; } = new();
}

/// <summary>
/// Provider-specific cast member
/// </summary>
public class ProviderCastMember
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Character { get; set; } = string.Empty;
    public string ProfilePath { get; set; } = string.Empty;
    public int Order { get; set; }
    public string ProviderId { get; set; } = string.Empty;
}

/// <summary>
/// Provider-specific crew member
/// </summary>
public class ProviderCrewMember
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Job { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public string ProfilePath { get; set; } = string.Empty;
    public string ProviderId { get; set; } = string.Empty;
}

/// <summary>
/// Provider-specific genre
/// </summary>
public class ProviderGenre
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string ProviderId { get; set; } = string.Empty;
}

/// <summary>
/// Provider-specific ratings
/// </summary>
public class ProviderRatings
{
    public decimal? Rating { get; set; }
    public int? VoteCount { get; set; }
    public string ContentRating { get; set; } = string.Empty;
    public Dictionary<string, decimal> AlternativeRatings { get; set; } = new();
}

/// <summary>
/// Provider-specific images
/// </summary>
public class ProviderImages
{
    public string PosterPath { get; set; } = string.Empty;
    public string BackdropPath { get; set; } = string.Empty;
    public List<string> PosterPaths { get; set; } = new();
    public List<string> BackdropPaths { get; set; } = new();
    public List<string> LogoPaths { get; set; } = new();
}

/// <summary>
/// Provider-specific external IDs
/// </summary>
public class ProviderExternalIds
{
    public string? ImdbId { get; set; }
    public int? TmdbId { get; set; }
    public string? TvdbId { get; set; }
    public Dictionary<string, string> OtherIds { get; set; } = new();
}

/// <summary>
/// Configuration for a specific provider
/// </summary>
public class ProviderConfiguration
{
    public Dictionary<string, ProviderSettings> Providers { get; set; } = new();
    public ProviderSelectionStrategy SelectionStrategy { get; set; } = ProviderSelectionStrategy.FailoverChain;
    public Dictionary<string, string> PrimaryProviders { get; set; } = new();
    public HealthCheckConfiguration HealthCheck { get; set; } = new();
    public LoadBalancingConfiguration LoadBalancing { get; set; } = new();
}

/// <summary>
/// Individual provider settings
/// </summary>
public class ProviderSettings
{
    public bool Enabled { get; set; } = true;
    public int Weight { get; set; } = 1;
    public int Priority { get; set; } = 1;
    public int MaxConcurrentRequests { get; set; } = 10;
    public int TimeoutSeconds { get; set; } = 30;
    public decimal CostPerRequest { get; set; } = 0;
    public int DailyRequestLimit { get; set; } = int.MaxValue;
    public Dictionary<string, string> Settings { get; set; } = new();
}

/// <summary>
/// Health check configuration
/// </summary>
public class HealthCheckConfiguration
{
    public int IntervalMinutes { get; set; } = 5;
    public int TimeoutSeconds { get; set; } = 10;
    public int FailureThreshold { get; set; } = 5;
    public int RecoveryThreshold { get; set; } = 2;
}

/// <summary>
/// Load balancing configuration
/// </summary>
public class LoadBalancingConfiguration
{
    public string Algorithm { get; set; } = "WeightedRoundRobin";
    public int UpdateIntervalMinutes { get; set; } = 10;
    public bool EnableStickySession { get; set; } = false;
}