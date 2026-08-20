using System.Text.Json.Serialization;

namespace GeoLeap.Api.Models;

/// <summary>
/// Official Streaming Availability API Show response model
/// Matches the official API structure from streaming-availability v4.4.0
/// </summary>
public class StreamingAvailabilityShow
{
    [JsonPropertyName("itemType")]
    public string ItemType { get; set; } = "show";

    [JsonPropertyName("showType")]
    public string ShowType { get; set; } = string.Empty;

    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("imdbId")]
    public string ImdbId { get; set; } = string.Empty;

    [JsonPropertyName("tmdbId")]
    public string TmdbId { get; set; } = string.Empty;

    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("overview")]
    public string Overview { get; set; } = string.Empty;

    [JsonPropertyName("releaseYear")]
    public int ReleaseYear { get; set; }

    [JsonPropertyName("originalTitle")]
    public string OriginalTitle { get; set; } = string.Empty;

    [JsonPropertyName("genres")]
    public List<StreamingAvailabilityGenre> Genres { get; set; } = new();

    [JsonPropertyName("poster")]
    public PosterInfo Poster { get; set; } = new();

    [JsonPropertyName("backdrop")]
    public PosterInfo Backdrop { get; set; } = new();

    [JsonPropertyName("streamingInfo")]
    public Dictionary<string, List<StreamingInfo>> StreamingInfo { get; set; } = new();

    [JsonPropertyName("rating")]
    public decimal? Rating { get; set; }

    [JsonPropertyName("imdbScore")]
    public float? ImdbScore { get; set; }

    [JsonPropertyName("tmdbScore")]
    public float? TmdbScore { get; set; }

    [JsonPropertyName("firstAirDate")]
    public DateTime? FirstAirDate { get; set; }

    [JsonPropertyName("lastAirDate")]
    public DateTime? LastAirDate { get; set; }

    [JsonPropertyName("numberOfSeasons")]
    public int? NumberOfSeasons { get; set; }

    [JsonPropertyName("similar")]
    public List<StreamingAvailabilityShow> Similar { get; set; } = new();

    [JsonPropertyName("cast")]
    public List<CastCrew> Cast { get; set; } = new();

    [JsonPropertyName("crew")]
    public List<CastCrew> Crew { get; set; } = new();

    [JsonPropertyName("runtime")]
    public int? Runtime { get; set; }

    [JsonPropertyName("tagline")]
    public string Tagline { get; set; } = string.Empty;

    [JsonPropertyName("countries")]
    public List<CountryInfo> Countries { get; set; } = new();
}

/// <summary>
/// Streaming Availability API Genre information
/// </summary>
public class StreamingAvailabilityGenre
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;
}

/// <summary>
/// Poster and image information
/// </summary>
public class PosterInfo
{
    [JsonPropertyName("w342")]
    public string W342 { get; set; } = string.Empty;

    [JsonPropertyName("w500")]
    public string W500 { get; set; } = string.Empty;

    [JsonPropertyName("w780")]
    public string W780 { get; set; } = string.Empty;

    [JsonPropertyName("original")]
    public string Original { get; set; } = string.Empty;
}

/// <summary>
/// Streaming availability information for a specific country
/// </summary>
public class StreamingInfo
{
    [JsonPropertyName("service")]
    public string Service { get; set; } = string.Empty;

    [JsonPropertyName("streamingType")]
    public string StreamingType { get; set; } = string.Empty;

    [JsonPropertyName("availableSince")]
    public DateTime? AvailableSince { get; set; }

    [JsonPropertyName("leaveAt")]
    public DateTime? LeaveAt { get; set; }

    [JsonPropertyName("quality")]
    public string Quality { get; set; } = string.Empty;

    [JsonPropertyName("link")]
    public string Link { get; set; } = string.Empty;

    [JsonPropertyName("videoFormat")]
    public List<string> VideoFormat { get; set; } = new();

    [JsonPropertyName("audio")]
    public List<string> Audio { get; set; } = new();

    [JsonPropertyName("subs")]
    public List<string> Subs { get; set; } = new();

    [JsonPropertyName("price")]
    public PriceInfo Price { get; set; } = new();

    [JsonPropertyName("seasons")]
    public List<SeasonInfo> Seasons { get; set; } = new();
}

/// <summary>
/// Price information
/// </summary>
public class PriceInfo
{
    [JsonPropertyName("amount")]
    public decimal Amount { get; set; }

    [JsonPropertyName("currency")]
    public string Currency { get; set; } = string.Empty;

    [JsonPropertyName("formatted")]
    public string Formatted { get; set; } = string.Empty;
}

/// <summary>
/// Season information for TV series
/// </summary>
public class SeasonInfo
{
    [JsonPropertyName("season")]
    public int Season { get; set; }

    [JsonPropertyName("episodes")]
    public List<EpisodeInfo> Episodes { get; set; } = new();
}

/// <summary>
/// Episode information
/// </summary>
public class EpisodeInfo
{
    [JsonPropertyName("episode")]
    public int Episode { get; set; }

    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("overview")]
    public string Overview { get; set; } = string.Empty;

    [JsonPropertyName("imdbId")]
    public string ImdbId { get; set; } = string.Empty;

    [JsonPropertyName("tmdbId")]
    public string TmdbId { get; set; } = string.Empty;

    [JsonPropertyName("firstAirDate")]
    public DateTime? FirstAirDate { get; set; }

    [JsonPropertyName("runtime")]
    public int? Runtime { get; set; }

    [JsonPropertyName("poster")]
    public PosterInfo Poster { get; set; } = new();
}

/// <summary>
/// Cast and crew information
/// </summary>
public class CastCrew
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("character")]
    public string Character { get; set; } = string.Empty;

    [JsonPropertyName("job")]
    public string Job { get; set; } = string.Empty;

    [JsonPropertyName("profilePath")]
    public string ProfilePath { get; set; } = string.Empty;
}

/// <summary>
/// Country availability information
/// </summary>
public class CountryInfo
{
    [JsonPropertyName("countryCode")]
    public string CountryCode { get; set; } = string.Empty;

    [JsonPropertyName("countryName")]
    public string CountryName { get; set; } = string.Empty;

    [JsonPropertyName("streamingInfo")]
    public Dictionary<string, List<StreamingInfo>> StreamingInfo { get; set; } = new();
}

// Legacy classes for backward compatibility
public class StreamingAvailabilityResponse
{
    public string ContentId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public ContentType Type { get; set; }
    public List<StreamingOption> StreamingOptions { get; set; } = new();
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;

    // Add missing properties for test compatibility
    public bool Available { get; set; } = true;
    public List<StreamingServiceAvailability> StreamingServices { get; set; } = new();
}

// Add missing class for test compatibility
public class StreamingServiceAvailability
{
    public string ServiceId { get; set; } = string.Empty;
    public string ServiceName { get; set; } = string.Empty;
    public bool Available { get; set; } = true;
    public List<StreamingOption> Options { get; set; } = new();

    /// <summary>
    /// Alternative name property for test compatibility
    /// </summary>
    public string Name { get; set; } = string.Empty;
}

public class StreamingOption
{
    public string ServiceId { get; set; } = string.Empty;
    public string ServiceName { get; set; } = string.Empty;
    public string CountryCode { get; set; } = string.Empty;
    public string CountryName { get; set; } = string.Empty;
    public StreamingType Type { get; set; }
    public decimal? Price { get; set; }
    public string Currency { get; set; } = string.Empty;
    public string StreamingUrl { get; set; } = string.Empty;
    public string Quality { get; set; } = string.Empty;
    public List<string> VideoQuality { get; set; } = new();
    public List<string> AudioLanguages { get; set; } = new();
    public List<string> SubtitleLanguages { get; set; } = new();
    public DateTime? ExpiresAt { get; set; }
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
}

// SearchResponse moved to FilterModels.cs to avoid duplicate definition
// SearchResult moved to FilterModels.cs to avoid duplicate definition

/// <summary>
/// Search result wrapper for API responses
/// </summary>
public class SearchResult
{
    [JsonPropertyName("total")]
    public int Total { get; set; }

    [JsonPropertyName("page")]
    public int Page { get; set; }

    [JsonPropertyName("itemsPerPage")]
    public int ItemsPerPage { get; set; }

    [JsonPropertyName("shows")]
    public List<StreamingAvailabilityShow> Shows { get; set; } = new();

    [JsonPropertyName("nextCursor")]
    public string NextCursor { get; set; } = string.Empty;
}

/// <summary>
/// Country information
/// </summary>
public class Country
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Currency { get; set; } = string.Empty;
}

public class ApiUsageStats
{
    public int CallsToday { get; set; }
    public int CallsThisMonth { get; set; }
    public decimal CostToday { get; set; }
    public decimal CostThisMonth { get; set; }
    public int RemainingCalls { get; set; }
    public DateTime ResetDate { get; set; }
}

public class ApiUsageRecord
{
    public int Id { get; set; }
    public Guid? UserId { get; set; }
    public string Endpoint { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    public bool Success { get; set; }
    public int ResponseTimeMs { get; set; }
    /// <summary>
    /// ResponseTime alias for compatibility with PerformanceIndexConfiguration
    /// </summary>
    public int ResponseTime => ResponseTimeMs;
    public decimal EstimatedCost { get; set; }
    public string? CorrelationId { get; set; }
    public string? ErrorMessage { get; set; }
    public int HttpStatusCode { get; set; }
}

// ContentType moved to FilterModels.cs to avoid duplicate definition

// StreamingType moved to FilterModels.cs to avoid duplicate definition

// External API response models for RapidAPI Streaming Availability
public class ExternalApiResponse
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;

    [JsonPropertyName("year")]
    public int? Year { get; set; }

    [JsonPropertyName("overview")]
    public string Overview { get; set; } = string.Empty;

    [JsonPropertyName("genres")]
    public List<ExternalGenre> Genres { get; set; } = new();

    [JsonPropertyName("streamingInfo")]
    public Dictionary<string, List<ExternalStreamingOption>> StreamingInfo { get; set; } = new();

    [JsonPropertyName("imageSet")]
    public ExternalImageSet? ImageSet { get; set; }
}

public class ExternalStreamingOption
{
    [JsonPropertyName("service")]
    public string Service { get; set; } = string.Empty;

    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;

    [JsonPropertyName("price")]
    public ExternalPrice? Price { get; set; }

    [JsonPropertyName("quality")]
    public string Quality { get; set; } = string.Empty;

    [JsonPropertyName("link")]
    public string Link { get; set; } = string.Empty;

    [JsonPropertyName("expiresOn")]
    public long? ExpiresOn { get; set; }

    [JsonPropertyName("availableSince")]
    public long? AvailableSince { get; set; }

    [JsonPropertyName("audios")]
    public List<ExternalAudio> Audios { get; set; } = new();

    [JsonPropertyName("subtitles")]
    public List<ExternalSubtitle> Subtitles { get; set; } = new();
}

public class ExternalPrice
{
    [JsonPropertyName("amount")]
    public string Amount { get; set; } = string.Empty;

    [JsonPropertyName("currency")]
    public string Currency { get; set; } = string.Empty;
}

public class ExternalGenre
{
    [JsonPropertyName("id")]
    public int Id { get; set; }

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;
}

public class ExternalImageSet
{
    [JsonPropertyName("verticalPoster")]
    public ExternalImage? VerticalPoster { get; set; }
}

public class ExternalImage
{
    [JsonPropertyName("w240")]
    public string W240 { get; set; } = string.Empty;

    [JsonPropertyName("w360")]
    public string W360 { get; set; } = string.Empty;

    [JsonPropertyName("w480")]
    public string W480 { get; set; } = string.Empty;

    [JsonPropertyName("w600")]
    public string W600 { get; set; } = string.Empty;

    [JsonPropertyName("w720")]
    public string W720 { get; set; } = string.Empty;
}

public class ExternalAudio
{
    [JsonPropertyName("language")]
    public string Language { get; set; } = string.Empty;
}

public class ExternalSubtitle
{
    [JsonPropertyName("locale")]
    public ExternalLocale Locale { get; set; } = new();
}

public class ExternalLocale
{
    [JsonPropertyName("language")]
    public string Language { get; set; } = string.Empty;
}

// ===== V2 API RESPONSE MODELS =====

/// <summary>
/// V2 API Search Response - handles paginated search results
/// </summary>
public class V2SearchResponse
{
    [JsonPropertyName("total")]
    public int Total { get; set; }

    [JsonPropertyName("page")]
    public int Page { get; set; }

    [JsonPropertyName("itemsPerPage")]
    public int ItemsPerPage { get; set; }

    [JsonPropertyName("shows")]
    public List<V2ShowResult> Shows { get; set; } = new();
}

/// <summary>
/// V2 API Genre Information
/// </summary>
public class V2GenreInfo
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;
}

/// <summary>
/// V2 API Show Result - individual show/movie data
/// </summary>
public class V2ShowResult
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("title")]
    public string Title { get; set; } = string.Empty;

    [JsonPropertyName("overview")]
    public string Overview { get; set; } = string.Empty;

    [JsonPropertyName("year")]
    public int? Year { get; set; }

    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;

    [JsonPropertyName("genres")]
    public List<V2GenreInfo> Genres { get; set; } = new();

    [JsonPropertyName("imdbId")]
    public string ImdbId { get; set; } = string.Empty;

    [JsonPropertyName("tmdbId")]
    public string TmdbId { get; set; } = string.Empty;

    [JsonPropertyName("poster")]
    public V2PosterInfo Poster { get; set; } = new();

    [JsonPropertyName("backdrop")]
    public V2PosterInfo Backdrop { get; set; } = new();

    /// <summary>
    /// V4 API returns imageSet with verticalPoster, horizontalPoster, etc.
    /// Each contains w240, w360, w480, w600, w720 URLs
    /// </summary>
    [JsonPropertyName("imageSet")]
    public ExternalImageSet? ImageSet { get; set; }

    [JsonPropertyName("streamingOptions")]
    public Dictionary<string, List<V2StreamingOption>> StreamingOptions { get; set; } = new();
}

/// <summary>
/// V2 API Poster Information
/// </summary>
public class V2PosterInfo
{
    [JsonPropertyName("path")]
    public string Path { get; set; } = string.Empty;

    [JsonPropertyName("url")]
    public string Url { get; set; } = string.Empty;
}

/// <summary>
/// V2 API Streaming Option - matches the actual API response structure
/// Each option has a service object with id/name
/// </summary>
public class V2StreamingOption
{
    [JsonPropertyName("service")]
    public V2ServiceInfo Service { get; set; } = new();

    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;

    [JsonPropertyName("link")]
    public string Link { get; set; } = string.Empty;

    [JsonPropertyName("videoLink")]
    public string VideoLink { get; set; } = string.Empty;

    [JsonPropertyName("quality")]
    public string Quality { get; set; } = string.Empty;

    [JsonPropertyName("expiresSoon")]
    public bool ExpiresSoon { get; set; }

    [JsonPropertyName("availableSince")]
    public long? AvailableSince { get; set; }

    [JsonPropertyName("price")]
    public V2PriceInfo? Price { get; set; }
}

/// <summary>
/// V2 API Service Information
/// </summary>
public class V2ServiceInfo
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;

    [JsonPropertyName("homePage")]
    public string HomePage { get; set; } = string.Empty;

    [JsonPropertyName("themeColorCode")]
    public string ThemeColorCode { get; set; } = string.Empty;
}

/// <summary>
/// V2 API Price Information
/// </summary>
public class V2PriceInfo
{
    [JsonPropertyName("amount")]
    public string Amount { get; set; } = string.Empty;

    [JsonPropertyName("currency")]
    public string Currency { get; set; } = string.Empty;

    [JsonPropertyName("formatted")]
    public string Formatted { get; set; } = string.Empty;
}

/// <summary>
/// V2 API Streaming Information (legacy - kept for backward compatibility)
/// </summary>
public class V2StreamingInfo
{
    [JsonPropertyName("country")]
    public string Country { get; set; } = string.Empty;

    [JsonPropertyName("type")]
    public string Type { get; set; } = string.Empty;

    [JsonPropertyName("platform")]
    public string Platform { get; set; } = string.Empty;

    [JsonPropertyName("url")]
    public string Url { get; set; } = string.Empty;

    [JsonPropertyName("price")]
    public string Price { get; set; } = string.Empty;

    [JsonPropertyName("currency")]
    public string Currency { get; set; } = string.Empty;

    [JsonPropertyName("quality")]
    public string Quality { get; set; } = string.Empty;

    [JsonPropertyName("addedAt")]
    public long? AddedAt { get; set; }
}

/// <summary>
/// V2 API Basic Details Response
/// </summary>
public class V2BasicDetailsResponse
{
    [JsonPropertyName("shows")]
    public List<V2ShowResult> Shows { get; set; } = new();
}

// ===== VPN STREAMING AVAILABILITY MODELS =====

/// <summary>
/// Detailed streaming availability for a specific show across all countries
/// Used for VPN-based content access feature
/// </summary>
public class ShowStreamingDetails
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string OriginalTitle { get; set; } = string.Empty;
    public int? Year { get; set; }
    public string Overview { get; set; } = string.Empty;
    public string PosterUrl { get; set; } = string.Empty;
    public string BackdropUrl { get; set; } = string.Empty;
    public double? Rating { get; set; }

    /// <summary>
    /// Streaming availability organized by country code
    /// Key: Country code (e.g., "us", "gb", "ca")
    /// Value: Streaming info for that country
    /// </summary>
    public Dictionary<string, CountryStreamingInfo> AvailabilityByCountry { get; set; } = new();

    /// <summary>
    /// Total number of countries where this content is available
    /// </summary>
    public int TotalCountries { get; set; }

    /// <summary>
    /// Number of countries where this content is available on user's subscriptions
    /// </summary>
    public int CountriesWithUserSubscriptions { get; set; }

    /// <summary>
    /// List of user's service IDs that have this content somewhere
    /// </summary>
    public List<string> UserServicesWithContent { get; set; } = new();
}

/// <summary>
/// Streaming availability information for a specific country
/// </summary>
public class CountryStreamingInfo
{
    public string CountryCode { get; set; } = string.Empty;
    public string CountryName { get; set; } = string.Empty;

    /// <summary>
    /// All streaming services available in this country for this content
    /// </summary>
    public List<ServiceAvailability> Services { get; set; } = new();

    /// <summary>
    /// Whether this country has the content on any of the user's subscriptions
    /// </summary>
    public bool HasUserSubscriptions { get; set; }

    /// <summary>
    /// Number of user's services that have this content in this country
    /// </summary>
    public int UserServicesCount { get; set; }
}

/// <summary>
/// Streaming service availability details
/// </summary>
public class ServiceAvailability
{
    public string ServiceId { get; set; } = string.Empty;
    public string ServiceName { get; set; } = string.Empty;
    public StreamingType Type { get; set; }
    public string Url { get; set; } = string.Empty;
    public string Quality { get; set; } = string.Empty;
    public List<string> AudioLanguages { get; set; } = new();
    public List<string> SubtitleLanguages { get; set; } = new();
    public decimal? Price { get; set; }
    public string Currency { get; set; } = string.Empty;
    public List<string> VideoFormats { get; set; } = new();
    public DateTime? AvailableSince { get; set; }
    public DateTime? LeaveAt { get; set; }

    /// <summary>
    /// Whether this is one of the user's subscriptions
    /// </summary>
    public bool IsUserSubscription { get; set; }
}

/// <summary>
/// User location response for country detection
/// </summary>
public class UserLocationResponse
{
    public string CountryCode { get; set; } = string.Empty;
    public string CountryName { get; set; } = string.Empty;
    public bool AutoDetected { get; set; }
    public string? DetectionMethod { get; set; }
}

/// <summary>
/// Request model for adding a streaming service subscription
/// </summary>
public class AddStreamingSubscriptionRequest
{
    public string ServiceId { get; set; } = string.Empty;
    public string ServiceName { get; set; } = string.Empty;
    public string? SubscriptionTier { get; set; }
    public string? Notes { get; set; }
}

/// <summary>
/// Request model for updating a streaming service subscription
/// </summary>
public class UpdateStreamingSubscriptionRequest
{
    public string? SubscriptionTier { get; set; }
    public string? Notes { get; set; }
}