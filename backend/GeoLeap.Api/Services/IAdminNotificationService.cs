using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service for managing admin notifications and real-time alerts
/// </summary>
public interface IAdminNotificationService
{
    /// <summary>
    /// Get notifications for a specific user
    /// </summary>
    Task<List<AdminNotification>> GetNotificationsAsync(
        Guid userId,
        bool unreadOnly = false,
        NotificationType? type = null,
        int page = 1,
        int pageSize = 50,
        string correlationId = "");

    /// <summary>
    /// Get unread notification count for a user
    /// </summary>
    Task<int> GetUnreadCountAsync(Guid userId, string correlationId);

    /// <summary>
    /// Mark notification as read
    /// </summary>
    Task<bool> MarkAsReadAsync(Guid notificationId, Guid userId, string correlationId);

    /// <summary>
    /// Mark all notifications as read for a user
    /// </summary>
    Task<int> MarkAllAsReadAsync(Guid userId, string correlationId);

    /// <summary>
    /// Delete a notification
    /// </summary>
    Task<bool> DeleteNotificationAsync(Guid notificationId, Guid userId, string correlationId);

    /// <summary>
    /// Create a system-wide notification
    /// </summary>
    Task<AdminNotification> CreateSystemNotificationAsync(
        NotificationType type,
        NotificationSeverity severity,
        string title,
        string message,
        string? actionUrl = null,
        Dictionary<string, object>? data = null,
        Guid? createdBy = null,
        string correlationId = "");

    /// <summary>
    /// Send notification to a specific user
    /// </summary>
    Task<AdminNotification> SendUserNotificationAsync(
        Guid userId,
        NotificationType type,
        NotificationSeverity severity,
        string title,
        string message,
        string? actionUrl = null,
        Dictionary<string, object>? data = null,
        Guid? createdBy = null,
        string correlationId = "");

    /// <summary>
    /// Send notification to multiple users
    /// </summary>
    Task<List<AdminNotification>> SendBulkNotificationAsync(
        List<Guid> userIds,
        NotificationType type,
        NotificationSeverity severity,
        string title,
        string message,
        string? actionUrl = null,
        Dictionary<string, object>? data = null,
        Guid? createdBy = null,
        string correlationId = "");

    /// <summary>
    /// Create business metric alert
    /// </summary>
    Task CreateBusinessAlertAsync(
        string alertType,
        string title,
        string message,
        NotificationSeverity severity,
        Dictionary<string, object>? metrics = null,
        string correlationId = "");

    /// <summary>
    /// Create system health alert
    /// </summary>
    Task CreateSystemHealthAlertAsync(
        string component,
        string status,
        string message,
        NotificationSeverity severity,
        Dictionary<string, object>? healthData = null,
        string correlationId = "");

    /// <summary>
    /// Create user action alert
    /// </summary>
    Task CreateUserActionAlertAsync(
        Guid targetUserId,
        string actionType,
        string description,
        NotificationSeverity severity,
        Dictionary<string, object>? actionData = null,
        string correlationId = "");

    /// <summary>
    /// Get notification preferences for a user
    /// </summary>
    Task<NotificationPreferences> GetNotificationPreferencesAsync(Guid userId, string correlationId);

    /// <summary>
    /// Update notification preferences for a user
    /// </summary>
    Task<bool> UpdateNotificationPreferencesAsync(
        Guid userId,
        Dictionary<string, bool> preferences,
        string correlationId);

    /// <summary>
    /// Get notification statistics and analytics
    /// </summary>
    Task<Dictionary<string, object>> GetNotificationStatisticsAsync(
        DateTime startDate,
        DateTime endDate,
        string correlationId);

    /// <summary>
    /// Clean up old notifications
    /// </summary>
    Task<int> CleanupOldNotificationsAsync(int daysToKeep = 90, string correlationId = "");

    /// <summary>
    /// Subscribe user to real-time notifications
    /// </summary>
    Task SubscribeToRealtimeNotificationsAsync(Guid userId, string connectionId, string correlationId);

    /// <summary>
    /// Unsubscribe user from real-time notifications
    /// </summary>
    Task UnsubscribeFromRealtimeNotificationsAsync(Guid userId, string connectionId, string correlationId);
}