using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace GeoLeap.Api.Models;

/// <summary>
/// DTO for creating a new watchlist
/// </summary>
public class CreateWatchlistDto
{
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string? Description { get; set; }

    public Guid? CategoryId { get; set; }
    public bool IsPublic { get; set; } = false;
    public bool IsDefault { get; set; } = false;
    public bool IsFavorite { get; set; } = false;
    
    [MaxLength(50)]
    public string SortOrder { get; set; } = "DateAdded";
    
    [MaxLength(10)]
    public string SortDirection { get; set; } = "DESC";
}

/// <summary>
/// DTO for updating an existing watchlist
/// </summary>
public class UpdateWatchlistDto
{
    [MaxLength(200)]
    public string? Name { get; set; }

    [MaxLength(1000)]
    public string? Description { get; set; }

    public Guid? CategoryId { get; set; }
    public bool? IsPublic { get; set; }
    public bool? IsDefault { get; set; }
    public bool? IsFavorite { get; set; }
    
    [MaxLength(50)]
    public string? SortOrder { get; set; }
    
    [MaxLength(10)]
    public string? SortDirection { get; set; }
}

/// <summary>
/// DTO for watchlist response with summary information
/// </summary>
public class WatchlistSummaryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Guid UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public WatchlistCategoryDto? Category { get; set; }
    public bool IsPublic { get; set; }
    public bool IsDefault { get; set; }
    public bool IsFavorite { get; set; }
    public string SortOrder { get; set; } = string.Empty;
    public string SortDirection { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int ItemCount { get; set; }
    public DateTime? LastActivityAt { get; set; }
    public bool HasNewUpdates { get; set; }
    public bool CanEdit { get; set; } // Based on user permissions
    public bool CanShare { get; set; } // Based on user permissions
    public OwnerInfoDto? OwnerInfo { get; set; }
}

/// <summary>
/// DTO for detailed watchlist response with items
/// </summary>
public class WatchlistDetailDto : WatchlistSummaryDto
{
    public List<WatchlistItemDto> Items { get; set; } = new();
    public List<WatchlistShareDto> Shares { get; set; } = new();
    public List<WatchlistActivityDto> RecentActivities { get; set; } = new();
    public List<WatchlistActivityDto> RecentActivity { get; set; } = new();
}

/// <summary>
/// DTO for adding an item to a watchlist
/// </summary>
public class AddWatchlistItemDto
{
    [Required]
    [MaxLength(20)]
    public string ContentType { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string ContentId { get; set; } = string.Empty;

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
    public List<string>? Genres { get; set; }
    public List<string>? StreamingServices { get; set; }
    
    [MaxLength(100)]
    public string Status { get; set; } = "Want to Watch";
    
    public int Priority { get; set; } = 0;
    
    [MaxLength(2000)]
    public string? UserNotes { get; set; }
    
    public List<string>? Tags { get; set; }
}

/// <summary>
/// DTO for updating a watchlist item
/// </summary>
public class UpdateWatchlistItemDto
{
    [MaxLength(100)]
    public string? Status { get; set; }
    
    public int? Priority { get; set; }
    public bool? IsWatched { get; set; }
    public DateTime? WatchedAt { get; set; }
    public decimal? UserRating { get; set; }
    
    [MaxLength(2000)]
    public string? UserNotes { get; set; }
    
    public List<string>? Tags { get; set; }
}

/// <summary>
/// DTO for watchlist item response
/// </summary>
public class WatchlistItemDto
{
    public Guid Id { get; set; }
    public Guid WatchlistId { get; set; }
    public string ContentType { get; set; } = string.Empty;
    public string ContentId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    
    /// <summary>
    /// TMDb ID for external movie/TV show identification
    /// </summary>
    public int? TmdbId { get; set; }
    
    /// <summary>
    /// Content type - used as alias for ContentType for compatibility
    /// </summary>
    public string Type { get; set; } = string.Empty;
    
    /// <summary>
    /// Release year - used as alias for ReleaseYear for compatibility
    /// </summary>
    public int? Year { get; set; }
    public string? Overview { get; set; }
    public string? PosterUrl { get; set; }
    public string? BackdropUrl { get; set; }
    public int? ReleaseYear { get; set; }
    public decimal? Rating { get; set; }
    public int? Runtime { get; set; }
    public List<string> Genres { get; set; } = new();
    public List<string> StreamingServices { get; set; } = new();
    public string Status { get; set; } = string.Empty;
    public int Priority { get; set; }
    public bool IsWatched { get; set; }
    public DateTime? WatchedAt { get; set; }
    public decimal? UserRating { get; set; }
    public string? UserNotes { get; set; }
    public List<string> Tags { get; set; } = new();
    public DateTime AddedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public bool IsCurrentlyAvailable { get; set; }
    public DateTime? LastAvailabilityCheck { get; set; }
    public List<WatchlistItemAvailabilityDto> CurrentAvailability { get; set; } = new();
}

/// <summary>
/// DTO for watchlist item availability
/// </summary>
public class WatchlistItemAvailabilityDto
{
    public Guid Id { get; set; }
    public string ServiceName { get; set; } = string.Empty;
    public string CountryCode { get; set; } = string.Empty;
    public string AvailabilityType { get; set; } = string.Empty;
    public decimal? Price { get; set; }
    public string? Currency { get; set; }
    public string? StreamingUrl { get; set; }
    public DateTime AvailableFrom { get; set; }
    public DateTime? AvailableUntil { get; set; }
    public bool IsActive { get; set; }
    
    /// <summary>
    /// Whether content is currently available on this service
    /// </summary>
    public bool IsAvailable { get; set; } = true;
    
    /// <summary>
    /// Geographic region/country for availability
    /// </summary>
    public string Region { get; set; } = string.Empty;
    
    /// <summary>
    /// Last time availability was checked
    /// </summary>
    public DateTime LastChecked { get; set; }
}

/// <summary>
/// DTO for creating a watchlist category
/// </summary>
public class CreateWatchlistCategoryDto
{
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Description { get; set; }

    [MaxLength(7)]
    public string? Color { get; set; }

    [MaxLength(50)]
    public string? Icon { get; set; }

    public int SortOrder { get; set; } = 0;
}

/// <summary>
/// DTO for watchlist category response
/// </summary>
public class WatchlistCategoryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? Color { get; set; }
    public string? Icon { get; set; }
    public Guid UserId { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public int WatchlistCount { get; set; }
}

/// <summary>
/// DTO for sharing a watchlist
/// </summary>
public class ShareWatchlistDto
{
    public Guid? SharedWithUserId { get; set; }
    
    [EmailAddress]
    [MaxLength(500)]
    public string? SharedWithEmail { get; set; }

    [Required]
    [MaxLength(20)]
    public string PermissionLevel { get; set; } = "view";

    public DateTime? ExpiresAt { get; set; }
}

/// <summary>
/// DTO for watchlist share response
/// </summary>
public class WatchlistShareDto
{
    public Guid Id { get; set; }
    public Guid WatchlistId { get; set; }
    public Guid? SharedWithUserId { get; set; }
    public string? SharedWithUserName { get; set; }
    public string? SharedWithEmail { get; set; }
    public string PermissionLevel { get; set; } = string.Empty;
    public string? ShareToken { get; set; }
    public bool IsActive { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public Guid CreatedBy { get; set; }
    public string CreatedByUserName { get; set; } = string.Empty;
    public DateTime? AcceptedAt { get; set; }
    public DateTime? LastAccessedAt { get; set; }
}

/// <summary>
/// DTO for watchlist activity
/// </summary>
public class WatchlistActivityDto
{
    public Guid Id { get; set; }
    public Guid WatchlistId { get; set; }
    public Guid? WatchlistItemId { get; set; }
    public string? WatchlistItemTitle { get; set; }
    public Guid UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string ActivityType { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Dictionary<string, object>? Metadata { get; set; }
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// DTO for bulk operations on watchlist items
/// </summary>
public class BulkWatchlistItemOperationDto
{
    [Required]
    public List<Guid> ItemIds { get; set; } = new();
    
    [Required]
    [MaxLength(20)]
    public string Operation { get; set; } = string.Empty; // "move", "delete", "mark_watched", "update_status"
    
    public Guid? TargetWatchlistId { get; set; } // For move operation
    public string? NewStatus { get; set; } // For status update
    public bool? IsWatched { get; set; } // For mark watched/unwatched
    public decimal? UserRating { get; set; } // For bulk rating
}

/// <summary>
/// DTO for watchlist export
/// </summary>
public class WatchlistExportDto
{
    [Required]
    public List<Guid> WatchlistIds { get; set; } = new();
    
    [Required]
    [MaxLength(10)]
    public string Format { get; set; } = "json"; // "json", "csv"
    
    public bool IncludeMetadata { get; set; } = true;
    public bool IncludeAvailability { get; set; } = false;
    public bool IncludeActivities { get; set; } = false;
}

/// <summary>
/// DTO for watchlist notification settings - Enhanced for US-8.2
/// </summary>
public class WatchlistNotificationSettingsDto
{
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
    
    // Enhanced channel preferences
    public string PreferredNotificationMethod { get; set; } = "email";
    public string DigestNotificationMethod { get; set; } = "email";
    public string UrgentNotificationMethod { get; set; } = "both";
    
    // Individual channel controls for backward compatibility with tests
    public bool EnableEmailNotifications { get; set; } = true;
    public bool EnablePushNotifications { get; set; } = true;
    public bool EnableSmsNotifications { get; set; } = false;
    public bool EnableInAppNotifications { get; set; } = true;
    
    // US-8.2 Frequency controls
    public string AvailabilityChangeFrequency { get; set; } = "immediate";
    public string PriceDropFrequency { get; set; } = "immediate";
    public string RecommendationFrequency { get; set; } = "weekly";
    
    // Timing preferences
    public TimeSpan? QuietHoursStart { get; set; }
    public TimeSpan? QuietHoursEnd { get; set; }
    public TimeSpan? DigestDeliveryTime { get; set; } = new TimeSpan(9, 0, 0);
    public DayOfWeek WeeklyDigestDay { get; set; } = DayOfWeek.Monday;
    public int MonthlyDigestDay { get; set; } = 1;
    
    // US-8.2 Content filtering
    public List<string> NotificationGenres { get; set; } = new();
    public List<string> ExcludedGenres { get; set; } = new();
    public List<string> PreferredServices { get; set; } = new();
    public decimal? MinimumRating { get; set; } = 6.0m;
    
    // US-8.2 Anti-spam and aggregation
    public bool AggregateNotifications { get; set; } = false;
    public int MaxNotificationsPerHour { get; set; } = 10;
    public int MaxNotificationsPerDay { get; set; } = 20;
    
    // US-8.2 Advanced features
    public bool EnableSmartTiming { get; set; } = true;
    public bool EnablePredictiveNotifications { get; set; } = false;
    public string NotificationTone { get; set; } = "friendly";
    public bool IncludeImages { get; set; } = true;
    public bool IncludePreviews { get; set; } = false;
    
    // US-8.2 GDPR Compliance
    public bool AllowUnsubscribeFromAll { get; set; } = true;
    public DateTime? UnsubscribeFromAllDate { get; set; }
    public List<string> UnsubscribedNotificationTypes { get; set; } = new();
    public string? UnsubscribeReason { get; set; }
    
    // US-8.2 Retry mechanism  
    public bool? EnableRetries { get; set; } = true;
    public int? MaxRetryAttempts { get; set; } = 3;
    public int? RetryDelayMinutes { get; set; } = 5;
}

/// <summary>
/// DTO for watchlist analytics and statistics
/// </summary>
public class WatchlistAnalyticsDto
{
    public int TotalWatchlists { get; set; }
    public int TotalItems { get; set; }
    public int WatchedItems { get; set; }
    public int UnwatchedItems { get; set; }
    public int AvailableItems { get; set; }
    public int UnavailableItems { get; set; }
    public Dictionary<string, int> ItemsByStatus { get; set; } = new();
    public Dictionary<string, int> ItemsByGenre { get; set; } = new();
    public Dictionary<string, int> ItemsByService { get; set; } = new();
    public Dictionary<string, int> ItemsByYear { get; set; } = new();
    public decimal AverageUserRating { get; set; }
    public DateTime? LastActivityAt { get; set; }
    public List<WatchlistSummaryDto> MostActiveWatchlists { get; set; } = new();
}

/// <summary>
/// DTO for watchlist owner information
/// </summary>
public class OwnerInfoDto
{
    public Guid UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string? DisplayName { get; set; }
    public string? AvatarUrl { get; set; }
    public bool IsCurrentUser { get; set; }
    public DateTime MemberSince { get; set; }
}

/// <summary>
/// DTO for creating a watchlist view
/// </summary>
public class CreateWatchlistViewDto
{
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

    public int SortOrder { get; set; } = 0;
}

/// <summary>
/// DTO for watchlist view response
/// </summary>
public class WatchlistViewDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? FilterJson { get; set; }
    public string? Color { get; set; }
    public string? Icon { get; set; }
    public Guid UserId { get; set; }
    public int SortOrder { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
