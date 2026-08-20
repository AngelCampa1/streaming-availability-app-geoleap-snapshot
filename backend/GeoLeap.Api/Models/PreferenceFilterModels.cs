using System.ComponentModel.DataAnnotations;

namespace GeoLeap.Api.Models;

/// <summary>
/// Content filtering preferences for content-aware search and recommendations
/// </summary>
public class ContentFilterPreferences
{
    public string? MaxContentRating { get; set; } = "R";
    public List<string> ExcludedGenres { get; set; } = new();
    public decimal? MinimumRating { get; set; } = 0.0m;
    public List<string> PreferredLanguages { get; set; } = new() { "en" };
    public List<string> ExcludedLanguages { get; set; } = new();
    public bool AllowAdultContent { get; set; } = false;
    public DateTime? ReleaseDateAfter { get; set; }
    public DateTime? ReleaseDateBefore { get; set; }
    public List<string> PreferredStreamingServices { get; set; } = new();
    public List<string> ExcludedStreamingServices { get; set; } = new();
    
    // Additional content filter preferences for comprehensive support
    public bool HideExplicitContent { get; set; } = true;
    public bool ShowOnlySubtitled { get; set; } = false;
    public bool PreferHDContent { get; set; } = true;
    public bool ExcludeExpiredContent { get; set; } = false;
}

/// <summary>
/// Privacy preferences for GDPR compliance and data processing
/// </summary>
public class PrivacyPreferences
{
    public bool AllowRecommendations { get; set; } = true;
    public bool AllowDataCollection { get; set; } = true;
    public bool AllowAnalytics { get; set; } = true;
    public bool AllowPersonalization { get; set; } = true;
    public bool AllowThirdPartySharing { get; set; } = false;
    public bool AllowMarketing { get; set; } = false;
    public string DataRetentionPeriod { get; set; } = "1_year";
    public bool AllowCookies { get; set; } = true;
    public bool AllowTracking { get; set; } = false;
    public DateTime? ConsentGivenAt { get; set; }
    public DateTime? ConsentWithdrawnAt { get; set; }
    public string? ConsentVersion { get; set; }
    
    // Additional privacy preferences for comprehensive support
    public string WatchlistVisibility { get; set; } = "private"; // private, friends, public
    public bool AllowDataSharing { get; set; } = false;
    public bool ShowRealTimeActivity { get; set; } = true;
    public bool ShareViewingHistory { get; set; } = false;
    public bool AllowProfileLinking { get; set; } = false;
    public bool ShowOnlineStatus { get; set; } = true;
}

/// <summary>
/// Search-specific preferences for personalized search results
/// </summary>
public class SearchPreferences
{
    public ContentType DefaultContentType { get; set; } = ContentType.Movie;
    public List<string> PreferredGenres { get; set; } = new();
    public decimal? MinRating { get; set; } = 0.0m;
    public decimal? MaxRating { get; set; }
    public int MaxResults { get; set; } = 50;
    public string SortBy { get; set; } = "relevance";
    public string DefaultSortBy { get; set; } = "relevance";
    public string SortOrder { get; set; } = "desc";
    public bool IncludeAdultContent { get; set; } = false;
    public bool ExcludeAdultContent { get; set; } = true;
    public List<string> PreferredLanguages { get; set; } = new() { "en" };
    public List<string> PreferredServices { get; set; } = new();
    public string? PreferredRegion { get; set; } = "US";
    public bool PersonalizeResults { get; set; } = true;
    public bool UseViewingHistory { get; set; } = true;
    public bool EnableAutoComplete { get; set; } = true;
    public bool EnableSearchSuggestions { get; set; } = true;
    public bool PreferFreeContent { get; set; } = false;
    public int ResultsPerPage { get; set; } = 20;
    public bool EnablePersonalization { get; set; } = true;
}

/// <summary>
/// Geographic/region preferences for location-aware features
/// </summary>
public class GeographicPreferences
{
    public string PrimaryRegion { get; set; } = "US";
    public List<string> AdditionalRegions { get; set; } = new();
    public string TimeZone { get; set; } = "UTC";
    public string Currency { get; set; } = "USD";
    public string CurrencyPreference { get; set; } = "USD";
    public string Language { get; set; } = "en";
    public bool AllowLocationTracking { get; set; } = false;
    public bool ShowRegionalPricing { get; set; } = true;
    public bool ShowRegionalAvailability { get; set; } = true;
    public bool EnableGeoBlocking { get; set; } = false;
    public bool ShowGlobalContent { get; set; } = true;
    public bool HideRegionLocked { get; set; } = false;
    public bool AutoDetectLocation { get; set; } = true;
}

/// <summary>
/// Accessibility preferences for inclusive design
/// </summary>
public class AccessibilityPreferences
{
    public bool RequireSubtitles { get; set; } = false;
    public bool RequireAudioDescription { get; set; } = false;
    public bool RequireClosedCaptions { get; set; } = false;
    public List<string> PreferredSubtitleLanguages { get; set; } = new();
    public List<string> PreferredAudioLanguages { get; set; } = new();
    public bool HighContrastMode { get; set; } = false;
    public string FontSize { get; set; } = "normal";
    public bool ReduceMotion { get; set; } = false;
    public bool ScreenReaderOptimized { get; set; } = false;
    public bool EnableKeyboardNavigation { get; set; } = true;
}

/// <summary>
/// Comprehensive user preferences aggregate
/// </summary>
public class UserPreferencesAggregate
{
    public Guid UserId { get; set; }
    public ContentFilterPreferences ContentFiltering { get; set; } = new();
    public PrivacyPreferences Privacy { get; set; } = new();
    public SearchPreferences Search { get; set; } = new();
    public GeographicPreferences Geographic { get; set; } = new();
    public AccessibilityPreferences Accessibility { get; set; } = new();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public string? ConflictResolutionStrategy { get; set; } = "last_write_wins";
    public int Version { get; set; } = 1;
    public string? ETag { get; set; }
}

/// <summary>
/// Preference conflict resolution data
/// </summary>
public class PreferenceConflict
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string ConflictType { get; set; } = string.Empty;
    public string ConflictingField { get; set; } = string.Empty;
    public object? CurrentValue { get; set; }
    public object? IncomingValue { get; set; }
    public string ResolutionStrategy { get; set; } = "last_write_wins";
    public object? ResolvedValue { get; set; }
    public DateTime ConflictDetectedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ResolvedAt { get; set; }
    public string? ResolvedBy { get; set; }
    public string? ResolutionReason { get; set; }
    public Dictionary<string, object> Metadata { get; set; } = new();
}

/// <summary>
/// GDPR compliance data export structure
/// </summary>
public class GdprUserDataExport
{
    public Guid UserId { get; set; }
    public string UserEmail { get; set; } = string.Empty;
    public UserPreferencesAggregate Preferences { get; set; } = new();
    public PrivacyPreferences PrivacySettings { get; set; } = new();
    public List<object> NotificationHistory { get; set; } = new();
    public List<object> SearchHistory { get; set; } = new();
    public List<object> ViewingHistory { get; set; } = new();
    public List<object> InteractionHistory { get; set; } = new();
    public string DataRetentionPolicy { get; set; } = string.Empty;
    public string ConsentStatus { get; set; } = string.Empty;
    public DateTime ExportGeneratedAt { get; set; } = DateTime.UtcNow;
    public string ExportVersion { get; set; } = "1.0";
    public Dictionary<string, object> Metadata { get; set; } = new();
}