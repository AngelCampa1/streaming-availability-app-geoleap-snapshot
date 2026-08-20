using System.ComponentModel.DataAnnotations;

namespace GeoLeap.Api.Models;

/// <summary>
/// Content types supported by the platform
/// </summary>
public enum ContentType
{
    All = 0,
    Movie = 1,
    TvSeries = 2,
    Documentary = 3,
    Person = 4,
    Unknown = 5
}

/// <summary>
/// Streaming availability types
/// </summary>
public enum StreamingType
{
    Free = 1,
    Subscription = 2,
    Rent = 3,
    Buy = 4,
    Rental = 3, // Alias for Rent
    Purchase = 4, // Alias for Buy
    Ads = 5
}

/// <summary>
/// Data quality levels
/// </summary>
public enum DataQuality
{
    Basic = 1,
    Standard = 2,
    Enhanced = 3,
    Premium = 4,
    High = 5
}

/// <summary>
/// Content search filters for advanced content filtering and search
/// </summary>
public class ContentSearchFilters
{
    /// <summary>
    /// Content type filter (Movie, TV Series, etc.)
    /// </summary>
    public ContentType? ContentType { get; set; }

    /// <summary>
    /// Genre filters
    /// </summary>
    public List<string>? Genres { get; set; }

    /// <summary>
    /// Minimum year filter
    /// </summary>
    public int? MinYear { get; set; }
    
    /// <summary>
    /// Year from filter (alias for MinYear)
    /// </summary>
    public int? YearFrom { get; set; }

    /// <summary>
    /// Maximum year filter
    /// </summary>
    public int? MaxYear { get; set; }
    
    /// <summary>
    /// Year to filter (alias for MaxYear)
    /// </summary>
    public int? YearTo { get; set; }

    /// <summary>
    /// Minimum rating filter
    /// </summary>
    public decimal? MinRating { get; set; }

    /// <summary>
    /// Maximum rating filter
    /// </summary>
    public decimal? MaxRating { get; set; }

    /// <summary>
    /// Minimum runtime in minutes
    /// </summary>
    public int? MinRuntime { get; set; }

    /// <summary>
    /// Maximum runtime in minutes
    /// </summary>
    public int? MaxRuntime { get; set; }

    /// <summary>
    /// Language filter
    /// </summary>
    public string? Language { get; set; }

    /// <summary>
    /// Country/region filter
    /// </summary>
    public string? Country { get; set; }

    /// <summary>
    /// Content rating filter (G, PG, R, etc.)
    /// </summary>
    public string? ContentRating { get; set; }

    /// <summary>
    /// Include adult content
    /// </summary>
    public bool IncludeAdult { get; set; } = false;

    /// <summary>
    /// Streaming service availability filter
    /// </summary>
    public List<string>? StreamingServices { get; set; }
    
    /// <summary>
    /// Streaming types filter
    /// </summary>
    public List<StreamingType>? StreamingTypes { get; set; }

    /// <summary>
    /// Sort by option
    /// </summary>
    public ContentSortBy SortBy { get; set; } = ContentSortBy.Popularity;

    /// <summary>
    /// Sort direction
    /// </summary>
    public SortDirection SortDirection { get; set; } = SortDirection.Descending;

    /// <summary>
    /// Page number for pagination
    /// </summary>
    public int Page { get; set; } = 1;

    /// <summary>
    /// Page size for pagination
    /// </summary>
    public int PageSize { get; set; } = 20;
}

/// <summary>
/// Content sorting options
/// </summary>
public enum ContentSortBy
{
    Popularity,
    Rating,
    ReleaseDate,
    Title,
    Runtime,
    VoteCount
}

/// <summary>
/// Sort direction options
/// </summary>
public enum SortDirection
{
    Ascending,
    Descending
}

/// <summary>
/// Filter options request model
/// </summary>
public class FilterOptionsRequest
{
    public string? Category { get; set; }
    public string? Region { get; set; }
    public ContentType? ContentType { get; set; }
    public string? Language { get; set; }
    public int? YearFrom { get; set; }
    public int? YearTo { get; set; }
    public List<string>? Countries { get; set; }
    public List<string>? Services { get; set; }
}

/// <summary>
/// Global search request model
/// </summary>
public class GlobalSearchRequest
{
    [Required]
    public string Query { get; set; } = string.Empty;
    
    public ContentType? ContentType { get; set; }
    
    public string? Region { get; set; }
    
    public int Page { get; set; } = 1;
    
    public int PageSize { get; set; } = 20;
    
    public ContentSearchFilters? Filters { get; set; }
    
    // Additional properties for compatibility
    public int? YearFrom { get; set; }
    public int? YearTo { get; set; }
    public int? Year { get; set; }
    public string? Language { get; set; }
    public int? MinRuntimeMinutes { get; set; }
    public int? MaxRuntimeMinutes { get; set; }
    public decimal? MinRating { get; set; }
    public decimal? MaxRating { get; set; }
    public List<string>? Genres { get; set; }
    public List<string>? Languages { get; set; }
    public List<string>? Services { get; set; }
    public List<string>? Countries { get; set; }
    public bool IncludeAdult { get; set; } = false;
    public bool ExcludeAdultContent { get; set; } = true;
    public string? SortBy { get; set; }
    public string? SortOrder { get; set; }
    public SortDirection SortDirection { get; set; } = SortDirection.Descending;
    
    // Additional price and director filters
    public decimal? MinPrice { get; set; }
    public decimal? MaxPrice { get; set; }
    public List<string>? Directors { get; set; }
    public List<string>? Cast { get; set; }
    public List<string>? Crew { get; set; }
    public List<string>? ContentRatings { get; set; }
    
    // Additional properties for AdvancedFilterService compatibility
    public List<string>? AudioLanguages { get; set; }
    public List<string>? SubtitleLanguages { get; set; }
    public List<string>? VideoQualities { get; set; }
    public string? AvailabilityStatus { get; set; }
    public bool FreeContentOnly { get; set; } = false;
    public bool SubscriptionContentOnly { get; set; } = false;
    public bool PlatformExclusives { get; set; } = false;
    public DateTime? ReleasedAfter { get; set; }
    public DateTime? ReleasedBefore { get; set; }
    public DateTime? AddedToStreamingAfter { get; set; }
    public DateTime? ExpiringBefore { get; set; }
    
    // Filter mode properties
    public string? GenreFilterMode { get; set; }
    public string? CountryFilterMode { get; set; }
    public string? ServiceFilterMode { get; set; }
    
    // Additional filter properties
    public int? PopularityFilter { get; set; }

    // Subscription-based filtering and ranking
    public List<string>? UserSubscribedServices { get; set; }
    public bool OnlyUserServices { get; set; } = false;
    public bool BoostUserServices { get; set; } = true;
}

/// <summary>
/// Search suggestion model
/// </summary>
public class SearchSuggestion
{
    public string Text { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public int Popularity { get; set; }
    public string? ImageUrl { get; set; }
    public ContentType? ContentType { get; set; }
    public SearchSuggestionType Type { get; set; }
    public double Score { get; set; }
    
    // Additional properties for SearchService compatibility
    public string SuggestedQuery { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
    public int ExpectedResults { get; set; }
}

/// <summary>
/// Global search result model
/// </summary>
public class GlobalSearchResult
{
    public List<ContentSummary> Results { get; set; } = new();
    public int TotalResults { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public bool HasMore { get; set; }
    public Dictionary<string, int> CategoryCounts { get; set; } = new();
    
    // Additional properties for SearchService compatibility
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string OriginalTitle { get; set; } = string.Empty;
    public ContentType Type { get; set; }
    public int? Year { get; set; }
    public int? ReleaseYear { get; set; }  // Added for compatibility
    public string Overview { get; set; } = string.Empty;
    public List<string> Genres { get; set; } = new();
    public string ImageUrl { get; set; } = string.Empty;
    public string PosterUrl { get; set; } = string.Empty;
    public string BackdropUrl { get; set; } = string.Empty;
    public double? Rating { get; set; }
    public bool Available { get; set; } = false;  // Added for compatibility
    public int? RuntimeMinutes { get; set; }
    public string Language { get; set; } = string.Empty;
    public string ContentRating { get; set; } = string.Empty;
    public int AvailableCountries { get; set; }
    public int AvailableServices { get; set; }
    public double RelevanceScore { get; set; }
    public List<string> MatchedFields { get; set; } = new();
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
    public List<GlobalStreamingOption> StreamingOptions { get; set; } = new();
    public List<ExternalId> ExternalIds { get; set; } = new();
    public List<string> DataSources { get; set; } = new();
}

/// <summary>
/// Filter validation result
/// </summary>
public class FilterValidationResult
{
    public bool IsValid { get; set; }
    public List<string> Errors { get; set; } = new();
    public List<string> Warnings { get; set; } = new();
    public List<string> Suggestions { get; set; } = new();
}

/// <summary>
/// Filter options response
/// </summary>
public class FilterOptionsResponse
{
    public List<FilterOption> Genres { get; set; } = new();
    public List<FilterOption> Years { get; set; } = new();
    public List<FilterOption> Languages { get; set; } = new();
    public List<FilterOption> Services { get; set; } = new();
    public List<FilterOption> StreamingServices { get; set; } = new();
    public List<FilterOption> ContentRatings { get; set; } = new();
    public List<FilterOption> Countries { get; set; } = new();
    public List<FilterOption> VideoQualities { get; set; } = new();
    public List<FilterOption> AudioLanguages { get; set; } = new();
    public List<FilterOption> SubtitleLanguages { get; set; } = new();
    public YearRange AvailableYearRange { get; set; } = new();
    public RuntimeRange AvailableRuntimeRange { get; set; } = new();
    public PriceRange AvailablePriceRange { get; set; } = new();
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
    public FilterRanges Ranges { get; set; } = new();
}

/// <summary>
/// Filter option item
/// </summary>
public class FilterOption
{
    public string Value { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public int Count { get; set; }
    public bool IsPopular { get; set; }
    public string DisplayName { get; set; } = string.Empty;
}

/// <summary>
/// Filter ranges for numeric values
/// </summary>
public class FilterRanges
{
    public RangeOption Rating { get; set; } = new();
    public RangeOption Runtime { get; set; } = new();
    public RangeOption Year { get; set; } = new();
}

/// <summary>
/// Range option for numeric filters
/// </summary>
public class RangeOption
{
    public decimal Min { get; set; }
    public decimal Max { get; set; }
    public decimal Step { get; set; } = 1;
}

/// <summary>
/// Filter suggestion item
/// </summary>
public class FilterSuggestion
{
    public string Type { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public int Popularity { get; set; }
    public string FilterName { get; set; } = string.Empty;
    public string SuggestedValue { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
    public int EstimatedResultsImprovement { get; set; }
}

/// <summary>
/// Applied filters information
/// </summary>
public class AppliedFiltersInfo
{
    public int ActiveFilters { get; set; }
    public List<ActiveFilter> Filters { get; set; } = new();
    public string Summary { get; set; } = string.Empty;
    public int TotalFiltersApplied { get; set; }
    public string Complexity { get; set; } = string.Empty;
    public int TotalFilters { get; set; }
    public bool HasAdvancedFilters { get; set; }
    public Dictionary<string, string[]> FilterGroups { get; set; } = new();
}

/// <summary>
/// Active filter item
/// </summary>
public class ActiveFilter
{
    public string Type { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public bool CanRemove { get; set; } = true;
}

/// <summary>
/// External ID reference
/// </summary>
public class ExternalId
{
    public string Source { get; set; } = string.Empty;
    public string Value { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
}

/// <summary>
/// Subscription tier enumeration
/// </summary>
public enum SubscriptionTier
{
    Free = 0,
    [Obsolete("Use Free or Premium tier instead")]
    Basic = 1,
    Premium = 2,
    [Obsolete("Use Premium tier instead")]
    Pro = 3,
    Admin = 4
}

/// <summary>
/// Search metadata
/// </summary>
public class SearchMetadata
{
    public string Query { get; set; } = string.Empty;
    public int ResultCount { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public double ExecutionTime { get; set; }
    public Dictionary<string, object> Metadata { get; set; } = new();
    
    // Additional properties for SearchService compatibility
    public string CorrelationId { get; set; } = string.Empty;
    public List<string> ProcessedProviders { get; set; } = new();
    public List<string> DataSources { get; set; } = new();
    public bool UsedCache { get; set; }
    public SearchStrategy UsedStrategy { get; set; } = SearchStrategy.Hybrid;
    public Dictionary<string, TimeSpan> SourceResponseTimes { get; set; } = new();
    public Dictionary<string, bool> SourceSuccess { get; set; } = new();
    public string CacheKey { get; set; } = string.Empty;
    public bool FuzzyMatchUsed { get; set; }
    public bool PersonalizationApplied { get; set; }
    public List<string> PreferenceFiltersApplied { get; set; } = new();
}

/// <summary>
/// Search strategy enumeration
/// </summary>
public enum SearchStrategy
{
    Exact = 1,
    ExactMatch = 1,
    Fuzzy = 2,
    FuzzyMatch = 2,
    Semantic = 3,
    Hybrid = 4,
    PartialMatch = 5,
    SynonymMatch = 6
}

/// <summary>
/// Global streaming option
/// </summary>
public class GlobalStreamingOption
{
    public string ServiceId { get; set; } = string.Empty;
    public string ServiceName { get; set; } = string.Empty;
    public string CountryCode { get; set; } = string.Empty;
    public StreamingType Type { get; set; }
    public decimal? Price { get; set; }
    public string Currency { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string Quality { get; set; } = string.Empty;
    public List<CountryAvailability> Countries { get; set; } = new();
    public List<string> VideoQuality { get; set; } = new();
    public bool HasSubtitles { get; set; }
    public bool HasAudioTracks { get; set; }
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
    public decimal? LowestPrice { get; set; }
    public decimal? HighestPrice { get; set; }

    // Additional properties for SearchService compatibility
    public string ServiceLogoUrl { get; set; } = string.Empty;
    public DateTime? EarliestExpiration { get; set; }
    public string Service { get; set; } = string.Empty;

    // Subscription-based enrichment
    public bool IsUserSubscription { get; set; } = false;
}

/// <summary>
/// Year range filter
/// </summary>
public class YearRange
{
    public int MinYear { get; set; }
    public int MaxYear { get; set; }
    public int MostCommonYear { get; set; }
}

/// <summary>
/// Runtime range filter
/// </summary>
public class RuntimeRange
{
    public int MinRuntime { get; set; }
    public int MaxRuntime { get; set; }
    public int MinRuntimeMinutes { get; set; }
    public int MaxRuntimeMinutes { get; set; }
    public int AverageRuntimeMinutes { get; set; }
}

/// <summary>
/// Price range filter
/// </summary>
public class PriceRange
{
    public decimal MinPrice { get; set; }
    public decimal MaxPrice { get; set; }
    public string Currency { get; set; } = "USD";
    public decimal AveragePrice { get; set; }
}

/// <summary>
/// Availability status enumeration
/// </summary>
public enum AvailabilityStatus
{
    Available = 1,
    Unavailable = 2,
    ComingSoon = 3,
    ExpiringSoon = 4,
    RecentlyAdded = 5
}

/// <summary>
/// Filter combine mode enumeration
/// </summary>
public enum FilterCombineMode
{
    And = 1,
    Or = 2,
    All = 1 // Alias for And
}

/// <summary>
/// Popularity filter
/// </summary>
public class PopularityFilter
{
    public int MinPopularity { get; set; }
    public int MaxPopularity { get; set; }
    public bool HighlyRated { get; set; }
    public PopularityFilterType? Type { get; set; }
}

/// <summary>
/// Paywall information for search responses - used by frontend to display subscription status
/// </summary>
public class SearchPaywallInfo
{
    public int UserTier { get; set; } = 0; // 0=Free, 1=Basic, 2=Premium, 3=Admin
    public bool IsPaywallActive { get; set; } = false;
    public string? UpgradeMessage { get; set; }
    public int? RemainingSearches { get; set; }
    public int? RemainingResults { get; set; }
    public string? CtaText { get; set; }
    public string? CtaUrl { get; set; }
}

/// <summary>
/// Global search response
/// </summary>
public class GlobalSearchResponse
{
    public List<ContentSummary> Results { get; set; } = new();
    public int TotalResults { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public bool HasMore { get; set; }
    public SearchMetadata Metadata { get; set; } = new();
    public Dictionary<string, int> Facets { get; set; } = new();

    // Additional properties for SearchService compatibility
    public DateTime SearchedAt { get; set; } = DateTime.UtcNow;
    public List<SearchSuggestion> Suggestions { get; set; } = new();
    public string Query { get; set; } = string.Empty;
    public TimeSpan ResponseTime { get; set; }
    public int TotalPages { get; set; }

    // Paywall information for frontend compatibility
    public SearchPaywallInfo? PaywallInfo { get; set; }

    // Search time in milliseconds for frontend compatibility
    public long SearchTimeMs => (long)ResponseTime.TotalMilliseconds;
}

/// <summary>
/// Generic search response
/// </summary>
public class SearchResponse<T>
{
    public List<T> Results { get; set; } = new();
    public int TotalResults { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public bool HasMore { get; set; }
    public SearchMetadata Metadata { get; set; } = new();
    
    // Additional properties for SearchService compatibility
    public string Query { get; set; } = string.Empty;
    public DateTime SearchedAt { get; set; } = DateTime.UtcNow;
    public TimeSpan ResponseTime { get; set; }
    public int TotalPages { get; set; }
}

/// <summary>
/// Search request model
/// </summary>
public class SearchRequest
{
    public string Query { get; set; } = string.Empty;
    public ContentType? ContentType { get; set; }
    public string? Language { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public ContentSearchFilters? Filters { get; set; }
    
    // Additional properties for SearchService compatibility
    public List<string>? Countries { get; set; }
    public List<string>? Services { get; set; }
}

/// <summary>
/// Search sort by enumeration
/// </summary>
public enum SearchSortBy
{
    Relevance = 1,
    Popularity = 2,
    Rating = 3,
    ReleaseDate = 4,
    Title = 5,
    Default = 1 // Alias for Relevance
}

/// <summary>
/// TMDb search response wrapper
/// </summary>
public class TmdbSearchResponse<T>
{
    public int Page { get; set; }
    public List<T> Results { get; set; } = new();
    public int TotalPages { get; set; }
    public int TotalResults { get; set; }
}

/// <summary>
/// Country availability information
/// </summary>
public class CountryAvailability
{
    public string CountryCode { get; set; } = string.Empty;
    public string CountryName { get; set; } = string.Empty;
    public bool Available { get; set; }
    public List<string> Services { get; set; } = new();
    
    // Additional properties for SearchService compatibility
    public string StreamingUrl { get; set; } = string.Empty;
    public List<string> AudioLanguages { get; set; } = new();
    public List<string> SubtitleLanguages { get; set; } = new();
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
    public decimal? Price { get; set; }
    public string Currency { get; set; } = "USD";
    public DateTime? ExpiresAt { get; set; }
}

/// <summary>
/// Search suggestion type enumeration
/// </summary>
public enum SearchSuggestionType
{
    Content = 1,
    Person = 2,
    Genre = 3,
    Keyword = 4,
    PopularContent = 5,
    BroaderSearch = 6,
    TypoCorrection = 7
}

/// <summary>
/// Filter complexity enumeration
/// </summary>
public enum FilterComplexity
{
    Simple = 1,
    Medium = 2,
    Complex = 3,
    VeryComplex = 4
}

/// <summary>
/// Popularity filter type enumeration
/// </summary>
public enum PopularityFilterType
{
    HighlyRated = 1,
    TrendingNow = 2,
    Trending = 2, // Alias for TrendingNow
    Popular = 3,
    HiddenGems = 4,
    AwardWinners = 5,
    CriticsPick = 6
}

/// <summary>
/// Response returned when search is blocked due to limit reached
/// Used for 2-step conversion funnel:
/// - Anonymous: "signup_required" after 1 search
/// - Free user: "upgrade_required" after 5 searches/day
/// </summary>
public class SearchBlockedResponse
{
    /// <summary>
    /// Reason for blocking: "signup_required" | "upgrade_required"
    /// </summary>
    public string BlockReason { get; set; } = string.Empty;

    /// <summary>
    /// Number of searches used in current period
    /// </summary>
    public int SearchesUsed { get; set; }

    /// <summary>
    /// Maximum searches allowed in current period
    /// </summary>
    public int SearchLimit { get; set; }

    /// <summary>
    /// When the limit resets (null for anonymous users)
    /// </summary>
    public DateTime? ResetsAt { get; set; }

    /// <summary>
    /// URL to upgrade or sign up
    /// </summary>
    public string UpgradeUrl { get; set; } = "/pricing";

    /// <summary>
    /// Human-readable message for the user
    /// </summary>
    public string Message { get; set; } = string.Empty;
}