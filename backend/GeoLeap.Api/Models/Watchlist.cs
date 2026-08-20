using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace GeoLeap.Api.Models;

/// <summary>
/// Represents a user's watchlist for tracking streaming content
/// </summary>
public class Watchlist
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string? Description { get; set; }

    [Required]
    public Guid UserId { get; set; }

    [ForeignKey(nameof(UserId))]
    public virtual User User { get; set; } = null!;

    public Guid? CategoryId { get; set; }

    [ForeignKey(nameof(CategoryId))]
    public virtual WatchlistCategory? Category { get; set; }

    public bool IsPublic { get; set; } = false;
    public bool IsDefault { get; set; } = false;
    public bool IsFavorite { get; set; } = false;
    public bool IsActive { get; set; } = true;
    
    [MaxLength(50)]
    public string SortOrder { get; set; } = "DateAdded";
    
    [MaxLength(10)]
    public string SortDirection { get; set; } = "DESC";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    public Guid? CreatedBy { get; set; }
    public Guid? UpdatedBy { get; set; }

    // Navigation properties
    public virtual ICollection<WatchlistItem> Items { get; set; } = new List<WatchlistItem>();
    public virtual ICollection<WatchlistShare> Shares { get; set; } = new List<WatchlistShare>();
    public virtual ICollection<WatchlistActivity> Activities { get; set; } = new List<WatchlistActivity>();

    // Computed properties
    [NotMapped]
    public int ItemCount => Items?.Count ?? 0;

    [NotMapped]
    public DateTime? LastActivityAt => Activities?.OrderByDescending(a => a.CreatedAt).FirstOrDefault()?.CreatedAt;

    [NotMapped]
    public bool HasNewUpdates { get; set; } = false;
}

/// <summary>
/// Represents an item in a watchlist
/// </summary>
public class WatchlistItem
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid WatchlistId { get; set; }

    [ForeignKey(nameof(WatchlistId))]
    public virtual Watchlist Watchlist { get; set; } = null!;

    [Required]
    [MaxLength(20)]
    public string ContentType { get; set; } = string.Empty; // "movie" or "tv"

    [Required]
    [MaxLength(50)]
    public string ContentId { get; set; } = string.Empty; // TMDb ID or other external ID

    /// <summary>
    /// TMDb ID for external movie/TV show identification
    /// </summary>
    public int? TmdbId { get; set; }
    
    /// <summary>
    /// Content type - used as alias for ContentType for compatibility
    /// </summary>
    [NotMapped]
    public string Type => ContentType;
    
    /// <summary>
    /// Release year - used as alias for ReleaseYear for compatibility
    /// </summary>
    [NotMapped]
    public int? Year => ReleaseYear;

    [Required]
    [MaxLength(500)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string? Overview { get; set; }

    [MaxLength(500)]
    public string? PosterUrl { get; set; }

    [MaxLength(500)]
    public string? BackdropUrl { get; set; }

    public int? ReleaseYear { get; set; }
    public decimal? Rating { get; set; }
    public int? Runtime { get; set; }

    [MaxLength(1000)]
    public string? Genres { get; set; } // JSON array of genre names

    [MaxLength(1000)]
    public string? StreamingServices { get; set; } // JSON array of available services

    [MaxLength(100)]
    public string? Status { get; set; } // "Want to Watch", "Watching", "Watched", "Dropped"

    public int Priority { get; set; } = 0; // 0 = normal, higher numbers = higher priority
    public bool IsWatched { get; set; } = false;
    public DateTime? WatchedAt { get; set; }
    public decimal? UserRating { get; set; }

    [MaxLength(2000)]
    public string? UserNotes { get; set; }

    [MaxLength(1000)]
    public string? Tags { get; set; } // JSON array of user tags

    public DateTime AddedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    public Guid? AddedBy { get; set; }
    public Guid? UpdatedBy { get; set; }

    // Availability tracking
    public bool IsCurrentlyAvailable { get; set; } = false;
    public DateTime? LastAvailabilityCheck { get; set; }
    
    [MaxLength(2000)]
    public string? AvailabilityData { get; set; } // JSON with detailed availability info

    // Navigation properties
    public virtual ICollection<WatchlistItemAvailability> AvailabilityHistory { get; set; } = new List<WatchlistItemAvailability>();
}

/// <summary>
/// Tracks availability changes for watchlist items
/// </summary>
public class WatchlistItemAvailability
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid WatchlistItemId { get; set; }

    [ForeignKey(nameof(WatchlistItemId))]
    public virtual WatchlistItem WatchlistItem { get; set; } = null!;

    [Required]
    [MaxLength(100)]
    public string ServiceName { get; set; } = string.Empty;

    [Required]
    [MaxLength(10)]
    public string CountryCode { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    public string AvailabilityType { get; set; } = string.Empty; // "free", "subscription", "rent", "buy"

    public decimal? Price { get; set; }
    
    [MaxLength(10)]
    public string? Currency { get; set; }

    [MaxLength(500)]
    public string? StreamingUrl { get; set; }

    public DateTime AvailableFrom { get; set; } = DateTime.UtcNow;
    public DateTime? AvailableUntil { get; set; }
    
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [MaxLength(1000)]
    public string? AdditionalData { get; set; } // JSON for extra metadata
    
    /// <summary>
    /// Whether content is currently available on this service
    /// </summary>
    public bool IsAvailable { get; set; } = true;
    
    /// <summary>
    /// Geographic region/country for availability
    /// </summary>
    [MaxLength(100)]
    public string Region { get; set; } = string.Empty;
    
    /// <summary>
    /// Last time availability was checked
    /// </summary>
    public DateTime LastChecked { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Categories for organizing watchlists
/// </summary>
public class WatchlistCategory
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Description { get; set; }

    [MaxLength(7)]
    public string? Color { get; set; } // Hex color code

    [MaxLength(50)]
    public string? Icon { get; set; }

    [Required]
    public Guid UserId { get; set; }

    [ForeignKey(nameof(UserId))]
    public virtual User User { get; set; } = null!;

    public int SortOrder { get; set; } = 0;
    public bool IsActive { get; set; } = true;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public virtual ICollection<Watchlist> Watchlists { get; set; } = new List<Watchlist>();
}

/// <summary>
/// Sharing configuration for watchlists
/// </summary>
public class WatchlistShare
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid WatchlistId { get; set; }

    [ForeignKey(nameof(WatchlistId))]
    public virtual Watchlist Watchlist { get; set; } = null!;

    public Guid? SharedWithUserId { get; set; }

    [ForeignKey(nameof(SharedWithUserId))]
    public virtual User? SharedWithUser { get; set; }

    [MaxLength(500)]
    public string? SharedWithEmail { get; set; }

    [Required]
    [MaxLength(20)]
    public string PermissionLevel { get; set; } = "view"; // "view", "edit", "admin"

    [MaxLength(100)]
    public string? ShareToken { get; set; } // For public sharing

    public bool IsActive { get; set; } = true;
    public DateTime? ExpiresAt { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public Guid CreatedBy { get; set; }

    public DateTime? AcceptedAt { get; set; }
    public DateTime? LastAccessedAt { get; set; }
}

/// <summary>
/// Activity log for watchlist changes
/// </summary>
public class WatchlistActivity
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid WatchlistId { get; set; }

    [ForeignKey(nameof(WatchlistId))]
    public virtual Watchlist Watchlist { get; set; } = null!;

    public Guid? WatchlistItemId { get; set; }

    [ForeignKey(nameof(WatchlistItemId))]
    public virtual WatchlistItem? WatchlistItem { get; set; }

    [Required]
    public Guid UserId { get; set; }

    [ForeignKey(nameof(UserId))]
    public virtual User User { get; set; } = null!;

    [Required]
    [MaxLength(50)]
    public string ActivityType { get; set; } = string.Empty; // "created", "item_added", "item_removed", "shared", etc.

    [MaxLength(1000)]
    public string? Description { get; set; }

    [MaxLength(2000)]
    public string? Metadata { get; set; } // JSON with additional activity data

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// User preferences for watchlist notifications - Enhanced for US-8.2
/// </summary>
public class WatchlistNotificationSettings
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid UserId { get; set; }

    [ForeignKey(nameof(UserId))]
    public virtual User User { get; set; } = null!;

    // Global notification control
    public bool GloballyEnabled { get; set; } = true;

    // Existing notification preferences
    public bool NotifyOnAvailabilityChange { get; set; } = true;
    public bool NotifyOnNewReleases { get; set; } = true;
    public bool NotifyOnPriceDrops { get; set; } = true;
    public bool NotifyOnSharedWatchlist { get; set; } = true;
    public bool NotifyOnRecommendations { get; set; } = true;

    // US-8.2 New notification types
    public bool NotifyOnLeavingPlatform { get; set; } = true;
    public bool NotifyOnRegionalChanges { get; set; } = true;
    public bool NotifyOnContentExpiring { get; set; } = true;
    public bool WeeklyDigest { get; set; } = true;
    public bool MonthlyDigest { get; set; } = true;

    [MaxLength(20)]
    public string PreferredNotificationMethod { get; set; } = "email"; // "email", "push", "both", "sms"
    
    // US-8.2 Enhanced channel preferences
    [MaxLength(20)]
    public string DigestNotificationMethod { get; set; } = "email";
    
    [MaxLength(20)]
    public string UrgentNotificationMethod { get; set; } = "both"; // For leaving soon notifications
    
    // Channel-specific settings
    public bool EnableEmailNotifications { get; set; } = true;
    public bool EnableSmsNotifications { get; set; } = false;
    public bool EnablePushNotifications { get; set; } = true;
    public bool EnableInAppNotifications { get; set; } = true;
    
    [MaxLength(20)]
    public string? SmsPhoneNumber { get; set; }
    
    // Retry settings
    public bool EnableRetries { get; set; } = true;
    public int MaxRetryAttempts { get; set; } = 3;
    public int RetryDelayMinutes { get; set; } = 15;

    // US-8.2 Frequency controls
    [MaxLength(20)]
    public string AvailabilityChangeFrequency { get; set; } = "immediate"; // immediate, daily, weekly
    
    [MaxLength(20)]
    public string PriceDropFrequency { get; set; } = "immediate";
    
    [MaxLength(20)]
    public string RecommendationFrequency { get; set; } = "weekly"; // weekly, biweekly, monthly

    // Enhanced timing preferences
    public TimeSpan? QuietHoursStart { get; set; }
    public TimeSpan? QuietHoursEnd { get; set; }
    
    // US-8.2 Advanced timing
    public TimeSpan? DigestDeliveryTime { get; set; } = new TimeSpan(9, 0, 0); // 9 AM
    public int WeeklyDigestDay { get; set; } = 1; // Monday = 1
    public int MonthlyDigestDay { get; set; } = 1; // 1st of month

    // US-8.2 Content filtering
    [MaxLength(2000)]
    public string? NotificationGenresJson { get; set; } // JSON array of genres to notify for
    
    [MaxLength(2000)]
    public string? ExcludedGenresJson { get; set; } // JSON array of genres to exclude
    
    [MaxLength(2000)]
    public string? PreferredServicesJson { get; set; } // JSON array of preferred services
    
    public decimal? MinimumRating { get; set; } = 6.0m; // Only notify for content above this rating

    // US-8.2 Anti-spam and aggregation
    public bool AggregateNotifications { get; set; } = false;
    public int MaxNotificationsPerHour { get; set; } = 10;
    public int MaxNotificationsPerDay { get; set; } = 50;

    // US-8.2 Advanced features
    public bool EnableSmartTiming { get; set; } = true;
    public bool EnablePredictiveNotifications { get; set; } = false;
    
    [MaxLength(20)]
    public string NotificationTone { get; set; } = "friendly"; // friendly, professional, minimal
    
    public bool IncludeImages { get; set; } = true;
    public bool IncludePreviews { get; set; } = false;

    // US-8.2 GDPR Compliance - Unsubscribe options
    public bool AllowUnsubscribeFromAll { get; set; } = true;
    public DateTime? UnsubscribeFromAllDate { get; set; }
    
    // Privacy settings
    public bool EnableDataProcessing { get; set; } = true;
    public bool AllowPersonalization { get; set; } = true;
    public bool AllowThirdPartySharing { get; set; } = false;
    
    [MaxLength(1000)]
    public string? UnsubscribedNotificationTypesJson { get; set; } // JSON array
    
    [MaxLength(500)]
    public string? UnsubscribeReason { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // US-8.2 Computed properties for JSON fields
    [NotMapped]
    public List<string> NotificationGenres
    {
        get => string.IsNullOrEmpty(NotificationGenresJson)
            ? new List<string>()
            : System.Text.Json.JsonSerializer.Deserialize<List<string>>(NotificationGenresJson) ?? new List<string>();
        set => NotificationGenresJson = value.Any()
            ? System.Text.Json.JsonSerializer.Serialize(value)
            : null;
    }

    [NotMapped]
    public List<string> ExcludedGenres
    {
        get => string.IsNullOrEmpty(ExcludedGenresJson)
            ? new List<string>()
            : System.Text.Json.JsonSerializer.Deserialize<List<string>>(ExcludedGenresJson) ?? new List<string>();
        set => ExcludedGenresJson = value.Any()
            ? System.Text.Json.JsonSerializer.Serialize(value)
            : null;
    }

    [NotMapped]
    public List<string> PreferredServices
    {
        get => string.IsNullOrEmpty(PreferredServicesJson)
            ? new List<string>()
            : System.Text.Json.JsonSerializer.Deserialize<List<string>>(PreferredServicesJson) ?? new List<string>();
        set => PreferredServicesJson = value.Any()
            ? System.Text.Json.JsonSerializer.Serialize(value)
            : null;
    }

    [NotMapped]
    public List<string> UnsubscribedNotificationTypes
    {
        get => string.IsNullOrEmpty(UnsubscribedNotificationTypesJson)
            ? new List<string>()
            : System.Text.Json.JsonSerializer.Deserialize<List<string>>(UnsubscribedNotificationTypesJson) ?? new List<string>();
        set => UnsubscribedNotificationTypesJson = value.Any()
            ? System.Text.Json.JsonSerializer.Serialize(value)
            : null;
    }

    [NotMapped]
    public DayOfWeek WeeklyDigestDayOfWeek => (DayOfWeek)WeeklyDigestDay;
}

/// <summary>
/// Settings for watchlist tracking and notifications
/// </summary>
public class WatchlistSettings
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid WatchlistId { get; set; }

    [ForeignKey(nameof(WatchlistId))]
    public virtual Watchlist Watchlist { get; set; } = null!;

    public bool TrackActivity { get; set; } = true;
    public bool AllowNotifications { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Saved views for filtering and organizing watchlist content
/// </summary>
public class WatchlistView
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Description { get; set; }

    [MaxLength(5000)]
    public string? FilterJson { get; set; }

    [MaxLength(7)]
    public string? Color { get; set; }

    [MaxLength(50)]
    public string? Icon { get; set; }

    [Required]
    public Guid UserId { get; set; }

    [ForeignKey(nameof(UserId))]
    public virtual User User { get; set; } = null!;

    public int SortOrder { get; set; } = 0;
    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
