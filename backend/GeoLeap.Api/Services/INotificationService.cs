using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service interface for managing user notifications and communications
/// </summary>
public interface INotificationService
{
    /// <summary>
    /// Process trial expiration notifications for users
    /// </summary>
    /// <returns>Number of notifications processed</returns>
    Task<int> ProcessTrialExpirationNotificationsAsync();
    
    /// <summary>
    /// Send notification to a specific user
    /// </summary>
    /// <param name="userId">User ID to send notification to</param>
    /// <param name="title">Notification title</param>
    /// <param name="message">Notification message</param>
    /// <param name="type">Notification type</param>
    /// <returns>True if notification was sent successfully</returns>
    Task<bool> SendNotificationAsync(Guid userId, string title, string message, string type = "info");
    
    /// <summary>
    /// Send bulk notifications to multiple users
    /// </summary>
    /// <param name="userIds">List of user IDs to send to</param>
    /// <param name="title">Notification title</param>
    /// <param name="message">Notification message</param>
    /// <param name="type">Notification type</param>
    /// <returns>Number of notifications sent successfully</returns>
    Task<int> SendBulkNotificationAsync(IEnumerable<Guid> userIds, string title, string message, string type = "info");
    
    /// <summary>
    /// Get unread notifications for a user
    /// </summary>
    /// <param name="userId">User ID</param>
    /// <param name="limit">Maximum number of notifications to return</param>
    /// <returns>List of unread notifications</returns>
    Task<List<UserNotification>> GetUnreadNotificationsAsync(Guid userId, int limit = 20);
    
    /// <summary>
    /// Mark notification as read
    /// </summary>
    /// <param name="notificationId">Notification ID</param>
    /// <param name="userId">User ID (for security)</param>
    /// <returns>True if notification was marked as read</returns>
    Task<bool> MarkNotificationAsReadAsync(Guid notificationId, Guid userId);
    
    /// <summary>
    /// Send budget alert notification
    /// </summary>
    /// <param name="message">Alert message</param>
    /// <param name="additionalData">Additional data for the alert</param>
    /// <returns>Task</returns>
    Task SendBudgetAlertAsync(string message, Dictionary<string, object>? additionalData = null);
    
    /// <summary>
    /// Send API error alert
    /// </summary>
    /// <param name="operation">Operation that failed</param>
    /// <param name="errorMessage">Error message</param>
    /// <param name="correlationId">Optional correlation ID</param>
    /// <returns>Task</returns>
    Task SendApiErrorAlertAsync(string operation, string errorMessage, string? correlationId = null);
    
    /// <summary>
    /// Send performance alert
    /// </summary>
    /// <param name="operation">Operation with performance issue</param>
    /// <param name="responseTimeMs">Response time in milliseconds</param>
    /// <param name="correlationId">Optional correlation ID</param>
    /// <returns>Task</returns>
    Task SendPerformanceAlertAsync(string operation, int responseTimeMs, string? correlationId = null);
    
    /// <summary>
    /// Create a notification for a user
    /// </summary>
    /// <param name="userId">User ID to create notification for</param>
    /// <param name="type">Notification type</param>
    /// <param name="title">Notification title</param>
    /// <param name="message">Notification message</param>
    /// <param name="metadata">Optional metadata</param>
    /// <returns>Created notification</returns>
    Task<UserNotification> CreateNotificationAsync(Guid userId, string type, string title, string message, Dictionary<string, object>? metadata = null);
}

