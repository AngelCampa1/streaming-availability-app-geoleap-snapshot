using System.ComponentModel.DataAnnotations;

namespace GeoLeap.Api.Models;

/// <summary>
/// DTO for notification preferences and settings
/// </summary>
public class NotificationSettingsDto
{
    public bool EmailNotificationsEnabled { get; set; } = true;
    public bool PushNotificationsEnabled { get; set; } = true;
    public bool SmsNotificationsEnabled { get; set; } = false;
    
    // Watchlist specific notifications
    public bool NotifyOnAvailabilityChange { get; set; } = true;
    public bool NotifyOnNewReleases { get; set; } = true;
    public bool NotifyOnPriceDrops { get; set; } = true;
    public bool NotifyOnSharedWatchlist { get; set; } = true;
    public bool NotifyOnRecommendations { get; set; } = true;
    
    // General preferences
    public string PreferredNotificationMethod { get; set; } = "email";
    public TimeSpan? QuietHoursStart { get; set; }
    public TimeSpan? QuietHoursEnd { get; set; }
    
    // Frequency settings
    public string DigestFrequency { get; set; } = "weekly"; // never, daily, weekly, monthly
    public bool WeeklyDigest { get; set; } = true;
    public bool MonthlyDigest { get; set; } = false;
}

/// <summary>
/// DTO for notification delivery log
/// </summary>
public class NotificationDeliveryLogDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string NotificationType { get; set; } = string.Empty;
    public string DeliveryMethod { get; set; } = string.Empty;
    public DateTime DeliveredAt { get; set; }
    public string Status { get; set; } = string.Empty;
    public bool Success { get; set; }
    public string? ErrorMessage { get; set; }
    public string? Title { get; set; }
    public string? Message { get; set; }
    public string? Channels { get; set; }
    public string? Metadata { get; set; }
}

/// <summary>
/// DTO for notification template data
/// </summary>
public class NotificationTemplateDto
{
    public string TemplateType { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public Dictionary<string, object>? TemplateData { get; set; }
    public string? Language { get; set; }
}

/// <summary>
/// DTO for price drop notifications
/// </summary>
public class PriceDropDto
{
    public WatchlistItemDto Item { get; set; } = new();
    public string ServiceName { get; set; } = string.Empty;
    public decimal OldPrice { get; set; }
    public decimal NewPrice { get; set; }
    public string Currency { get; set; } = "USD";
    public DateTime PriceChangeDate { get; set; }
    public decimal SavingsAmount => OldPrice - NewPrice;
    public decimal SavingsPercentage => OldPrice > 0 ? (SavingsAmount / OldPrice) * 100 : 0;
    
    // Additional properties for compatibility
    public string Title => Item?.Title ?? string.Empty;
}

/// <summary>
/// DTO for content expiration notifications
/// </summary>
public class ContentExpirationDto
{
    public WatchlistItemDto Item { get; set; } = new();
    public Guid ItemId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string PosterUrl { get; set; } = string.Empty;
    public string ServiceName { get; set; } = string.Empty;
    public DateTime ExpirationDate { get; set; }
    public int DaysUntilExpiration { get; set; }
    public int DaysUntilExpiry => DaysUntilExpiration; // Alias for compatibility
    public bool IsUrgent => DaysUntilExpiration <= 3;
}

/// <summary>
/// DTO for regional availability changes
/// </summary>
public class RegionalAvailabilityChangeDto
{
    public string Region { get; set; } = string.Empty;
    public string ServiceName { get; set; } = string.Empty;
    public string ChangeType { get; set; } = string.Empty; // "added" or "removed"
    public DateTime ChangeDate { get; set; }
    public string CountryCode { get; set; } = string.Empty;
    public string CountryName { get; set; } = string.Empty;
    public List<string> Services { get; set; } = new();
}

/// <summary>
/// DTO for digest data compilation
/// </summary>
public class DigestDataDto
{
    public DateTime WeekStart { get; set; }
    public DateTime WeekEnd { get; set; }
    public List<WatchlistItemDto> NewAvailableItems { get; set; } = new();
    public List<PriceDropDto> PriceDrops { get; set; } = new();
    public List<ContentExpirationDto> LeavingSoon { get; set; } = new();
    public List<WatchlistItemDto> RecommendedItems { get; set; } = new();
    public List<WatchlistItemDto> WatchedItems { get; set; } = new();
    public UserStatsDto? UserStats { get; set; }
    public bool HasContent { get; set; }
}

/// <summary>
/// DTO for user statistics in digests
/// </summary>
public class UserStatsDto
{
    public int TotalWatchlists { get; set; }
    public int TotalItems { get; set; }
    public int WatchedItems { get; set; }
    public int AvailableItems { get; set; }
    public List<string> MostWatchedGenres { get; set; } = new();
    public int ItemsAddedThisPeriod { get; set; }
    public int ItemsWatchedThisPeriod { get; set; }
}