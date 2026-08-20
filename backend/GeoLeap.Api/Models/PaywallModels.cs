using System.ComponentModel.DataAnnotations;

namespace GeoLeap.Api.Models;

// SubscriptionTier enum moved to FilterModels.cs to avoid duplication

/// <summary>
/// User subscription information with tier and status
/// </summary>
public class UserSubscription
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public SubscriptionTier Tier { get; set; } = SubscriptionTier.Free;
    public bool IsActive { get; set; } = true;
    public DateTime StartDate { get; set; } = DateTime.UtcNow;
    public DateTime? EndDate { get; set; }
    public DateTime? LastPayment { get; set; }
    public string? SubscriptionId { get; set; }
    public string? PaymentProvider { get; set; }
    public PaymentStatus Status { get; set; } = PaymentStatus.Active;
    public string SubscriptionType { get; set; } = "monthly";
    public bool AutoRenew { get; set; } = true;
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
    
    // Additional properties expected by tests
    public string? PlanId { get; set; }
    public DateTime? StartedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CurrentPeriodEnd { get; set; }
    public DateTime? CurrentPeriodStart { get; set; } = DateTime.UtcNow;
    public string? StripeSubscriptionId { get; set; }
    public DateTime? CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CanceledAt { get; set; }
    public string? CancellationReason { get; set; }
    
    // Navigation property
    public virtual User? User { get; set; }
}

/// <summary>
/// Access control configuration for each subscription tier
/// </summary>
public class TierAccessLimits
{
    public SubscriptionTier Tier { get; set; }
    public int MaxSearchResultsPerQuery { get; set; }
    public int MaxDailySearches { get; set; } = -1; // -1 = unlimited
    public bool CanViewStreamingUrls { get; set; } = false;
    public bool CanViewPricing { get; set; } = false;
    public bool CanViewAllCountries { get; set; } = false;
    public bool CanAccessAdvancedFilters { get; set; } = false;
    public bool CanExportResults { get; set; } = false;
    public int PreviewDescriptionLength { get; set; } = 100;
    public int MaxGenreTagsShown { get; set; } = 3;
    public bool ShowUpgradePrompts { get; set; } = true;
    public bool ShowVpnAffiliateAds { get; set; } = false;
}

/// <summary>
/// Paywall content filtering result
/// </summary>
public class PaywalledSearchResponse
{
    public List<PaywalledSearchResult> Results { get; set; } = new();
    public int TotalResults { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public bool HasMore { get; set; }
    public string Query { get; set; } = string.Empty;
    public DateTime SearchedAt { get; set; } = DateTime.UtcNow;
    public TimeSpan ResponseTime { get; set; }
    public SearchMetadata Metadata { get; set; } = new();
    public List<SearchSuggestion> Suggestions { get; set; } = new();
    public PaywallInfo PaywallInfo { get; set; } = new();
}

/// <summary>
/// Individual search result with paywall filtering applied
/// </summary>
public class PaywalledSearchResult
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? OriginalTitle { get; set; }
    public ContentType Type { get; set; }
    public int? Year { get; set; }
    public string Overview { get; set; } = string.Empty;
    public bool IsOverviewTruncated { get; set; } = false;
    public List<string> Genres { get; set; } = new();
    public bool AreGenresTruncated { get; set; } = false;
    public string PosterUrl { get; set; } = string.Empty;
    public string BackdropUrl { get; set; } = string.Empty;
    public decimal? Rating { get; set; }
    public int? RuntimeMinutes { get; set; }
    public string Language { get; set; } = string.Empty;
    public string ContentRating { get; set; } = string.Empty;
    public List<PaywalledStreamingOption> StreamingOptions { get; set; } = new();
    public int AvailableCountries { get; set; }
    public int AvailableServices { get; set; }
    public bool AreStreamingOptionsFiltered { get; set; } = false;
    public decimal RelevanceScore { get; set; }
    public List<string> MatchedFields { get; set; } = new();
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
    public List<ExternalId>? ExternalIds { get; set; }
    public bool IsPaywalled { get; set; } = false;
}

/// <summary>
/// Streaming option with paywall filtering applied
/// </summary>
public class PaywalledStreamingOption
{
    public string ServiceId { get; set; } = string.Empty;
    public string ServiceName { get; set; } = string.Empty;
    public string ServiceLogoUrl { get; set; } = string.Empty;
    public List<PaywalledCountryAvailability> Countries { get; set; } = new();
    public StreamingType Type { get; set; }
    public decimal? LowestPrice { get; set; }
    public decimal? HighestPrice { get; set; }
    public string Currency { get; set; } = string.Empty;
    public List<string> VideoQuality { get; set; } = new();
    public bool HasSubtitles { get; set; }
    public bool HasAudioTracks { get; set; }
    public DateTime? EarliestExpiration { get; set; }
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
    public bool IsPricingVisible { get; set; } = true;
    public bool AreUrlsVisible { get; set; } = false;
}

/// <summary>
/// Country availability with paywall filtering
/// </summary>
public class PaywalledCountryAvailability
{
    public string CountryCode { get; set; } = string.Empty;
    public string CountryName { get; set; } = string.Empty;
    public decimal? Price { get; set; }
    public string Currency { get; set; } = string.Empty;
    public string? StreamingUrl { get; set; } // Null if not accessible
    public List<string> AudioLanguages { get; set; } = new();
    public List<string> SubtitleLanguages { get; set; } = new();
    public DateTime? ExpiresAt { get; set; }
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
    public bool IsPricingVisible { get; set; } = true;
}

/// <summary>
/// Paywall information and upgrade messaging
/// </summary>
public class PaywallInfo
{
    public SubscriptionTier UserTier { get; set; }
    public bool IsPaywallActive { get; set; }
    public int ResultsShown { get; set; }
    public int TotalAvailableResults { get; set; }
    public List<PaywallMessage> Messages { get; set; } = new();
    public UpgradeCallToAction? UpgradePrompt { get; set; }
    public Dictionary<string, object> Analytics { get; set; } = new();
}

/// <summary>
/// Paywall messaging for different scenarios
/// </summary>
public class PaywallMessage
{
    public PaywallMessageType Type { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? ActionText { get; set; }
    public string? ActionUrl { get; set; }
    public PaywallMessageIntensity Intensity { get; set; } = PaywallMessageIntensity.Gentle;
}

/// <summary>
/// Call-to-action for subscription upgrades
/// </summary>
public class UpgradeCallToAction
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public List<UpgradeBenefit> Benefits { get; set; } = new();
    public string PrimaryButtonText { get; set; } = "Upgrade Now";
    public string PrimaryButtonUrl { get; set; } = string.Empty;
    public string? SecondaryButtonText { get; set; }
    public string? SecondaryButtonUrl { get; set; }
    public bool ShowCountdown { get; set; } = false;
    public DateTime? CountdownEndTime { get; set; }
    public string? SpecialOffer { get; set; }
}

/// <summary>
/// Benefits of upgrading subscription
/// </summary>
public class UpgradeBenefit
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Icon { get; set; } = string.Empty;
}

/// <summary>
/// Paywall message types
/// </summary>
public enum PaywallMessageType
{
    ResultsLimited,
    ContentBlurred,
    FeatureRestricted,
    DailyLimitReached,
    UpgradePromotion,
    SpecialOffer
}

/// <summary>
/// Message intensity levels for A/B testing
/// </summary>
public enum PaywallMessageIntensity
{
    Gentle = 1,
    Medium = 2,
    Strong = 3,
    Urgent = 4
}

/// <summary>
/// User's daily search usage tracking
/// </summary>
public class UserSearchUsage
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public DateTime Date { get; set; } = DateTime.UtcNow.Date;
    public int SearchCount { get; set; } = 0;
    public int ResultsViewed { get; set; } = 0;
    public DateTime LastSearchAt { get; set; } = DateTime.UtcNow;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation property
    public virtual User? User { get; set; }
}

/// <summary>
/// Paywall analytics tracking
/// </summary>
public class PaywallAnalytics
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public PaywallEvent EventType { get; set; }
    public SubscriptionTier UserTier { get; set; }
    public string? SearchQuery { get; set; }
    public int? ResultsShown { get; set; }
    public int? TotalAvailableResults { get; set; }
    public PaywallMessageIntensity? MessageIntensity { get; set; }
    public string? UpgradeAction { get; set; }
    public Dictionary<string, object> Metadata { get; set; } = new();
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    /// <summary>
    /// EventDate alias for compatibility with PerformanceIndexConfiguration
    /// </summary>
    public DateTime EventDate => Timestamp.Date;
    public string? CorrelationId { get; set; }
    
    // Navigation property
    public virtual User? User { get; set; }
}

/// <summary>
/// Paywall event types for analytics
/// </summary>
public enum PaywallEvent
{
    PaywallShown,
    UpgradePromptShown,
    UpgradeButtonClicked,
    ResultsFiltered,
    ContentBlurred,
    LimitReached,
    SearchLimitReached,
    ConversionCompleted
}

/// <summary>
/// Individual paywall event record for analytics
/// </summary>
public class PaywallEventRecord
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public PaywallEvent Event { get; set; }
    public string EventData { get; set; } = string.Empty;
    public string Region { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? CorrelationId { get; set; }
    public Dictionary<string, object> Metadata { get; set; } = new();
    
    // Navigation property
    public virtual User? User { get; set; }
}

/// <summary>
/// Paywall context for generating messaging
/// </summary>
public class PaywallContext
{
    public int ResultsAvailable { get; set; }
    public int ResultsShown { get; set; }
    public string SearchQuery { get; set; } = string.Empty;
    public SubscriptionTier UserTier { get; set; }
    public int DailySearchCount { get; set; }
    public PaywallMessageIntensity PreferredIntensity { get; set; } = PaywallMessageIntensity.Medium;
}

/// <summary>
/// Paywall features that can be gated
/// </summary>
public enum PaywallFeature
{
    StreamingUrls,
    PricingInformation,
    AdvancedFilters,
    UnlimitedResults,
    ExportResults,
    GlobalAvailability,
    DirectLinks,
    DetailedMetadata
}