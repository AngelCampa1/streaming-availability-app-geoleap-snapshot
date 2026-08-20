using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service interface for managing user notification preferences - US-8.2
/// </summary>
public interface INotificationPreferencesService
{
    // Core preference management
    Task<NotificationSettings> GetUserPreferencesAsync(Guid userId);
    Task<bool> UpdateUserPreferencesAsync(Guid userId, NotificationSettings preferences);
    Task<bool> CreateDefaultPreferencesAsync(Guid userId);
    
    // Channel preferences
    Task<bool> EnableChannelAsync(Guid userId, string channel);
    Task<bool> DisableChannelAsync(Guid userId, string channel);
    Task<List<string>> GetEnabledChannelsAsync(Guid userId);
    
    // Type-specific preferences
    Task<bool> EnableNotificationTypeAsync(Guid userId, string notificationType);
    Task<bool> DisableNotificationTypeAsync(Guid userId, string notificationType);
    Task<Dictionary<string, bool>> GetNotificationTypePreferencesAsync(Guid userId);
    
    // Rate limiting and spam protection
    Task<bool> CanSendNotificationAsync(Guid userId, string notificationType, List<string>? channels = null);
    Task<bool> IsWithinRateLimitAsync(Guid userId, string notificationType);
    Task<NotificationRateLimit> GetOrCreateRateLimitAsync(Guid userId, string notificationType, string timeWindow);
    Task IncrementRateLimitCountAsync(Guid userId, string notificationType, string timeWindow);
    
    // Quiet hours and timing
    Task<bool> IsInQuietHoursAsync(Guid userId);
    Task<bool> SetQuietHoursAsync(Guid userId, TimeSpan startTime, TimeSpan endTime, string timeZone);
    Task<bool> SetQuietDaysAsync(Guid userId, List<DayOfWeek> quietDays);
    
    // Frequency and aggregation
    Task<bool> SetNotificationFrequencyAsync(Guid userId, string frequency);
    Task<bool> SetAggregationPreferencesAsync(Guid userId, bool enabled, int windowMinutes);
    
    // Advanced features
    Task<bool> EnableSmartTimingAsync(Guid userId, bool enabled);
    Task<bool> EnablePredictiveFilteringAsync(Guid userId, bool enabled);
    Task<bool> SetNotificationToneAsync(Guid userId, string tone);
    
    // Digest preferences
    Task<bool> SetDigestPreferencesAsync(Guid userId, bool dailyEnabled, bool weeklyEnabled, bool monthlyEnabled);
    Task<bool> SetDigestDeliveryTimeAsync(Guid userId, TimeSpan deliveryTime);
    Task<bool> SetWeeklyDigestDayAsync(Guid userId, DayOfWeek dayOfWeek);
    Task<bool> SetMonthlyDigestDayAsync(Guid userId, int dayOfMonth);
    
    // Content filtering
    Task<bool> SetContentFiltersAsync(Guid userId, Dictionary<string, object> filters);
    Task<bool> SetMinimumRatingAsync(Guid userId, decimal? minimumRating);
    
    // Unsubscribe management
    Task<bool> UnsubscribeFromTypeAsync(Guid userId, string notificationType, string? reason = null);
    Task<bool> UnsubscribeFromAllAsync(Guid userId, string? reason = null);
    Task<bool> ResubscribeToTypeAsync(Guid userId, string notificationType);
    Task<bool> ResubscribeToAllAsync(Guid userId);
    Task<List<string>> GetUnsubscribedTypesAsync(Guid userId);
    
    // GDPR and compliance
    Task<bool> SetDataProcessingConsentAsync(Guid userId, bool allowProcessing);
    Task<bool> SetProfileAnalysisConsentAsync(Guid userId, bool allowAnalysis);
    
    // Analytics and insights
    Task<NotificationPreferencesStatsDto> GetPreferencesStatsAsync(Guid userId);
    Task<List<NotificationPreferencesRecommendationDto>> GetPreferencesRecommendationsAsync(Guid userId);
    
    // Bulk operations
    Task<int> ApplyDefaultPreferencesToUsersAsync(List<Guid> userIds);
    Task<int> MigratePreferencesAsync(Guid fromUserId, Guid toUserId);
    Task<bool> UpdateBulkPreferencesAsync(List<Guid> userIds, BulkPreferencesUpdateRequest request, string correlationId = "");
    Task<List<WatchlistNotificationSettingsDto>> GetBulkPreferencesAsync(List<Guid> userIds, string correlationId = "");
    
    // Additional missing methods
    Task<List<UnsubscribeAnalyticsDto>> GetUnsubscribeAnalyticsAsync(DateTime? fromDate = null, DateTime? toDate = null);
    Task<bool> MigrateUserPreferencesAsync(Guid userId, Dictionary<string, object> legacyPreferences, string correlationId = "");
    Task<GdprDataDto> ExportUserDataAsync(Guid userId, string correlationId = "");
    Task<bool> DeleteUserDataAsync(Guid userId, string correlationId = "");
    Task<bool> HasReachedRateLimitAsync(Guid userId, string notificationType);
}

/// <summary>
/// User preferences statistics DTO
/// </summary>
public class NotificationPreferencesStatsDto
{
    public Guid UserId { get; set; }
    public int EnabledChannels { get; set; }
    public int EnabledNotificationTypes { get; set; }
    public int DisabledNotificationTypes { get; set; }
    public bool HasQuietHours { get; set; }
    public bool HasContentFilters { get; set; }
    public string PreferenceScore { get; set; } = "medium"; // high, medium, low engagement
    public DateTime LastUpdated { get; set; }
    public Dictionary<string, bool> ChannelPreferences { get; set; } = new();
    public Dictionary<string, int> NotificationFrequency { get; set; } = new();
    
    // Additional properties for bulk stats
    public int TotalUsers { get; set; }
    public int EnabledUsers { get; set; }
    public int DisabledUsers { get; set; }
    public int EmailEnabledUsers { get; set; }
    public int PushEnabledUsers { get; set; }
    public int SmsEnabledUsers { get; set; }
    public int RecentUnsubscribes { get; set; }
    public double EnablementRate { get; set; }
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }
}

/// <summary>
/// Preferences recommendation DTO
/// </summary>
public class NotificationPreferencesRecommendationDto
{
    public string Type { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty; // enable_channel, disable_type, set_frequency, etc.
    public Dictionary<string, object> Parameters { get; set; } = new();
    public double Confidence { get; set; }
    public string Reason { get; set; } = string.Empty;
}