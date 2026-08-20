using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

/// <summary>
/// Core notification engine interface - US-8.2 Multi-channel Support
/// </summary>
public interface INotificationEngine
{
    // Core notification methods
    Task<Guid> SendNotificationAsync(NotificationRequest request, string correlationId = "");
    Task<List<Guid>> SendBulkNotificationAsync(List<NotificationRequest> requests, string correlationId = "");
    Task<Guid> ScheduleNotificationAsync(NotificationRequest request, DateTime scheduledFor, string correlationId = "");
    
    // Template-based notifications
    Task<Guid> SendFromTemplateAsync(string templateId, Guid userId, Dictionary<string, object> templateData, string correlationId = "");
    Task<List<Guid>> SendFromTemplateToUsersAsync(string templateId, List<Guid> userIds, Dictionary<string, object> templateData, string correlationId = "");
    
    // Campaign management
    Task<Guid> CreateCampaignAsync(NotificationCampaignRequest request, string correlationId = "");
    Task<bool> ExecuteCampaignAsync(Guid campaignId, string correlationId = "");
    Task<bool> CancelCampaignAsync(Guid campaignId, string correlationId = "");
    Task<CampaignStatusDto> GetCampaignStatusAsync(Guid campaignId, string correlationId = "");
    
    // Channel-specific methods
    Task<bool> SendEmailNotificationAsync(Guid notificationId, string correlationId = "");
    Task<bool> SendPushNotificationAsync(Guid notificationId, string correlationId = "");
    Task<bool> SendSmsNotificationAsync(Guid notificationId, string correlationId = "");
    Task<bool> SendInAppNotificationAsync(Guid notificationId, string correlationId = "");
    
    // Template management
    Task<bool> CreateTemplateAsync(Models.NotificationTemplate template, string correlationId = "");
    Task<bool> UpdateTemplateAsync(string templateId, Models.NotificationTemplate template, string correlationId = "");
    Task<Models.NotificationTemplate?> GetTemplateAsync(string templateId, string correlationId = "");
    Task<List<Models.NotificationTemplate>> GetTemplatesAsync(string? type = null, string correlationId = "");
    Task<bool> DeleteTemplateAsync(string templateId, string correlationId = "");
    
    // Analytics and tracking
    Task<NotificationAnalyticsDto> GetNotificationAnalyticsAsync(Guid notificationId, string correlationId = "");
    Task<UserNotificationStatsDto> GetUserNotificationStatsAsync(Guid userId, DateTime? fromDate = null, DateTime? toDate = null, string correlationId = "");
    Task<SystemNotificationStatsDto> GetSystemNotificationStatsAsync(DateTime? fromDate = null, DateTime? toDate = null, string correlationId = "");
    
    // Interaction tracking
    Task<bool> TrackInteractionAsync(Guid notificationId, string interactionType, Dictionary<string, object>? context = null, string correlationId = "");
    Task<bool> MarkAsReadAsync(Guid notificationId, string correlationId = "");
    Task<bool> MarkAsClickedAsync(Guid notificationId, string actionUrl = "", string correlationId = "");
    
    // Retry and recovery
    Task ProcessPendingNotificationsAsync(string correlationId = "");
    Task ProcessFailedNotificationsAsync(string correlationId = "");
    Task<bool> RetryFailedNotificationAsync(Guid notificationId, string correlationId = "");
    
    // Validation and testing
    Task<Models.NotificationValidationResult> ValidateNotificationAsync(NotificationRequest request, string correlationId = "");
    Task<bool> TestNotificationChannelAsync(string channel, Guid userId, string correlationId = "");

    // User-facing notification management
    Task<int> GetUnreadCountAsync(Guid userId, string correlationId = "");
    Task<UserNotificationsResult> GetUserNotificationsAsync(Guid userId, int page = 1, int pageSize = 20, bool? unreadOnly = null, string? category = null, string correlationId = "");
    Task<int> MarkNotificationsAsReadAsync(Guid userId, List<Guid> notificationIds, string correlationId = "");
    Task<bool> DeleteNotificationAsync(Guid userId, Guid notificationId, string correlationId = "");
}

/// <summary>
/// Notification request DTO
/// </summary>
public class NotificationRequest
{
    public Guid UserId { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Priority { get; set; } = "medium";
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? ActionUrl { get; set; }
    public Dictionary<string, object>? Data { get; set; }
    public List<string>? Channels { get; set; } // If null, uses user preferences
    public DateTime? ScheduledFor { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public string? CampaignId { get; set; }
    public Dictionary<string, object>? Metadata { get; set; }
    
    // Additional properties for compatibility
    public string Category { get; set; } = string.Empty;
    public string? TemplateId { get; set; }
    public Dictionary<string, object>? TemplateData { get; set; }
}

/// <summary>
/// Campaign creation request DTO
/// </summary>
public class NotificationCampaignRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string TemplateId { get; set; } = string.Empty;
    public Dictionary<string, object> TargetCriteria { get; set; } = new();
    public Dictionary<string, object> TemplateData { get; set; } = new();
    public DateTime? ScheduledFor { get; set; }
    public string CreatedBy { get; set; } = "system";
}

/// <summary>
/// Campaign status DTO
/// </summary>
public class CampaignStatusDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int TargetUserCount { get; set; }
    public int ProcessedCount { get; set; }
    public int SuccessCount { get; set; }
    public int FailureCount { get; set; }
    public int SkippedCount { get; set; }
    public double ProgressPercentage { get; set; }
    public double SuccessRate { get; set; }
    public DateTime? ScheduledFor { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// Notification analytics DTO
/// </summary>
public class NotificationAnalyticsDto
{
    public Guid Id { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? SentAt { get; set; }
    public DateTime? ReadAt { get; set; }
    public List<DeliveryInfoDto> Deliveries { get; set; } = new();
    public List<InteractionInfoDto> Interactions { get; set; } = new();
    public TimeSpan? TimeToRead { get; set; }
    public TimeSpan? TimeToFirstClick { get; set; }
    public bool WasDelivered { get; set; }
    public bool WasRead { get; set; }
    public bool WasClicked { get; set; }
}

/// <summary>
/// Delivery information DTO
/// </summary>
public class DeliveryInfoDto
{
    public string Channel { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime AttemptedAt { get; set; }
    public DateTime? DeliveredAt { get; set; }
    public string? ErrorMessage { get; set; }
    public int AttemptCount { get; set; }
}

/// <summary>
/// Interaction information DTO
/// </summary>
public class InteractionInfoDto
{
    public string InteractionType { get; set; } = string.Empty;
    public DateTime InteractionAt { get; set; }
    public string? InteractionUrl { get; set; }
    public string? DeviceType { get; set; }
    public string? Platform { get; set; }
}

/// <summary>
/// User notification statistics DTO
/// </summary>
public class UserNotificationStatsDto
{
    public Guid UserId { get; set; }
    public int TotalNotifications { get; set; }
    public int DeliveredNotifications { get; set; }
    public int ReadNotifications { get; set; }
    public int ClickedNotifications { get; set; }
    public double DeliveryRate { get; set; }
    public double ReadRate { get; set; }
    public double ClickRate { get; set; }
    public Dictionary<string, int> NotificationsByType { get; set; } = new();
    public Dictionary<string, int> NotificationsByChannel { get; set; } = new();
    public TimeSpan? AverageTimeToRead { get; set; }
    public TimeSpan? AverageTimeToClick { get; set; }
    public DateTime? LastNotificationAt { get; set; }
    public DateTime? LastInteractionAt { get; set; }
}

/// <summary>
/// System notification statistics DTO
/// </summary>
public class SystemNotificationStatsDto
{
    public int TotalNotifications { get; set; }
    public int TotalUsers { get; set; }
    public int ActiveUsers { get; set; }
    public double OverallDeliveryRate { get; set; }
    public double OverallReadRate { get; set; }
    public double OverallClickRate { get; set; }
    public Dictionary<string, int> NotificationsByType { get; set; } = new();
    public Dictionary<string, int> NotificationsByChannel { get; set; } = new();
    public Dictionary<string, double> ChannelPerformance { get; set; } = new();
    public Dictionary<string, int> NotificationsByHour { get; set; } = new();
    public Dictionary<string, int> NotificationsByDay { get; set; } = new();
    public List<TopPerformingTemplate> TopPerformingTemplates { get; set; } = new();
    public List<string> MostActiveUsers { get; set; } = new();
}

/// <summary>
/// Top performing template DTO
/// </summary>
public class TopPerformingTemplate
{
    public string TemplateId { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public int UsageCount { get; set; }
    public double ReadRate { get; set; }
    public double ClickRate { get; set; }
    public double Score { get; set; }
}

/// <summary>
/// User notifications result with pagination
/// </summary>
public class UserNotificationsResult
{
    public List<UserNotificationDto> Notifications { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }
    public bool HasMore { get; set; }
}

/// <summary>
/// User notification DTO for API response
/// </summary>
public class UserNotificationDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Priority { get; set; } = string.Empty;
    public bool IsRead { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ReadAt { get; set; }
    public string? ActionUrl { get; set; }
    public Dictionary<string, object>? Data { get; set; }
}

/// <summary>
/// Response DTO for unread count
/// </summary>
public class UnreadCountResponse
{
    public int Count { get; set; }
}

/// <summary>
/// Request DTO for marking notifications as read
/// </summary>
public class MarkNotificationsReadRequest
{
    public List<Guid> NotificationIds { get; set; } = new();
}

