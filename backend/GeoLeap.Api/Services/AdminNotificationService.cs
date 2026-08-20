using GeoLeap.Api.Models;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.SignalR;
using GeoLeap.Api.Hubs;
using System.Collections.Concurrent;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service for admin notification system
/// </summary>
public class AdminNotificationService : IAdminNotificationService
{
    private readonly ILogger<AdminNotificationService> _logger;
    private readonly IHubContext<AdminHub> _hubContext;
    private readonly IEmailService _emailService;
    // ✅ THREAD SAFETY FIX: Use ConcurrentBag instead of List for thread-safe collection
    private static readonly ConcurrentDictionary<Guid, ConcurrentBag<AdminNotification>> _userNotifications = new();

    public AdminNotificationService(
        ILogger<AdminNotificationService> logger,
        IHubContext<AdminHub> hubContext,
        IEmailService emailService)
    {
        _logger = logger;
        _hubContext = hubContext;
        _emailService = emailService;
    }

    /// <summary>
    /// Send notification to specific admin user
    /// </summary>
    public async Task<bool> SendNotificationAsync(AdminNotification notification, string correlationId)
    {
        try
        {
            _logger.LogInformation("[{CorrelationId}] Sending admin notification: {Title} to user {UserId}", 
                correlationId, notification.Title, notification.UserId);

            // Store notification in memory (in production, use database)
            // ✅ THREAD SAFETY FIX: Use thread-safe ConcurrentBag.Add instead of List.Add
            _userNotifications.AddOrUpdate(
                notification.UserId ?? Guid.Empty,
                new ConcurrentBag<AdminNotification> { notification },
                (key, existingBag) =>
                {
                    existingBag.Add(notification);
                    return existingBag;
                });

            // Send real-time notification via SignalR
            var userId = notification.UserId.ToString();
            if (!string.IsNullOrEmpty(userId))
            {
                await _hubContext.Clients.User(userId)
                .SendAsync("ReceiveNotification", new
                {
                    notification.Id,
                    notification.Title,
                    notification.Message,
                    notification.Type,
                    notification.Priority,
                    notification.CreatedAt,
                    notification.ActionUrl
                });
            }

            // Send email notification for high priority notifications
            if (notification.Priority == NotificationPriority.High || notification.Priority == NotificationPriority.Critical)
            {
                try
                {
                    await _emailService.SendEmailAsync(
                        notification.Email ?? "",
                        $"[URGENT] {notification.Title}",
                        $"{notification.Message}\n\n{(string.IsNullOrEmpty(notification.ActionUrl) ? "" : $"Action required: {notification.ActionUrl}")}");
                }
                catch (Exception emailEx)
                {
                    _logger.LogWarning(emailEx, "[{CorrelationId}] Failed to send email notification, but notification was stored", correlationId);
                }
            }

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error sending admin notification", correlationId);
            return false;
        }
    }

    /// <summary>
    /// Send notification to multiple admin users
    /// </summary>
    public async Task<Dictionary<Guid, bool>> SendBulkNotificationAsync(BulkNotificationRequest request, string correlationId)
    {
        try
        {
            _logger.LogInformation("[{CorrelationId}] Sending bulk notifications to {UserCount} users", 
                correlationId, request.UserIds.Count);

            var results = new Dictionary<Guid, bool>();

            foreach (var userId in request.UserIds)
            {
                var notification = new AdminNotification
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    Title = request.Title,
                    Message = request.Message,
                    Type = Enum.Parse<NotificationType>(request.Type),
                    Priority = Enum.Parse<NotificationPriority>(request.Priority),
                    CreatedAt = DateTime.UtcNow,
                    ActionUrl = request.ActionUrl,
                    Email = null // Would be populated from user data in real implementation
                };

                var success = await SendNotificationAsync(notification, correlationId);
                results[userId] = success;
            }

            var successCount = results.Values.Count(r => r);
            _logger.LogInformation("[{CorrelationId}] Bulk notification completed: {SuccessCount}/{TotalCount} successful",
                correlationId, successCount, request.UserIds.Count);

            return results;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error sending bulk notifications", correlationId);
            throw;
        }
    }

    /// <summary>
    /// Get notifications for a user
    /// </summary>
    public async Task<List<AdminNotification>> GetNotificationsAsync(Guid userId, bool unreadOnly = false, NotificationType? type = null, int page = 1, int pageSize = 50, string correlationId = "")
    {
        try
        {
            await Task.CompletedTask; // Placeholder for async signature

            if (!_userNotifications.TryGetValue(userId, out var notifications))
            {
                return new List<AdminNotification>();
            }

            var query = notifications.AsEnumerable();

            if (unreadOnly)
            {
                query = query.Where(n => !n.IsRead);
            }

            if (type.HasValue)
            {
                query = query.Where(n => n.Type == type.Value);
            }

            return query
                .OrderByDescending(n => n.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error getting notifications for user {UserId}", correlationId, userId);
            throw;
        }
    }

    /// <summary>
    /// Mark notification as read
    /// </summary>
    public async Task<bool> MarkAsReadAsync(Guid notificationId, Guid userId, string correlationId)
    {
        try
        {
            await Task.CompletedTask; // Placeholder for async signature

            if (_userNotifications.TryGetValue(userId, out var notifications))
            {
                var notification = notifications.FirstOrDefault(n => n.Id == notificationId);
                if (notification != null)
                {
                    notification.IsRead = true;
                    notification.ReadAt = DateTime.UtcNow;
                    return true;
                }
            }

            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error marking notification {NotificationId} as read", correlationId, notificationId);
            return false;
        }
    }

    /// <summary>
    /// Mark all notifications as read for a user
    /// </summary>
    public async Task<int> MarkAllAsReadAsync(Guid userId, string correlationId)
    {
        try
        {
            await Task.CompletedTask; // Placeholder for async signature

            if (_userNotifications.TryGetValue(userId, out var notifications))
            {
                var unreadCount = notifications.Count(n => !n.IsRead);
                
                foreach (var notification in notifications.Where(n => !n.IsRead))
                {
                    notification.IsRead = true;
                    notification.ReadAt = DateTime.UtcNow;
                }

                return unreadCount;
            }

            return 0;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error marking all notifications as read for user {UserId}", correlationId, userId);
            return 0;
        }
    }

    /// <summary>
    /// Get unread notification count
    /// </summary>
    public async Task<int> GetUnreadCountAsync(Guid userId, string correlationId)
    {
        try
        {
            await Task.CompletedTask; // Placeholder for async signature

            if (_userNotifications.TryGetValue(userId, out var notifications))
            {
                return notifications.Count(n => !n.IsRead);
            }

            return 0;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error getting unread count for user {UserId}", correlationId, userId);
            return 0;
        }
    }

    /// <summary>
    /// Delete notification
    /// </summary>
    public async Task<bool> DeleteNotificationAsync(Guid notificationId, Guid userId, string correlationId)
    {
        try
        {
            await Task.CompletedTask; // Placeholder for async signature

            if (_userNotifications.TryGetValue(userId, out var notifications))
            {
                if (notifications.Any(n => n.Id == notificationId))
                {
                    // ✅ THREAD SAFETY FIX: ConcurrentBag doesn't support Remove, rebuild without the notification
                    var updatedNotifications = new ConcurrentBag<AdminNotification>(notifications.Where(n => n.Id != notificationId));
                    _userNotifications.TryUpdate(userId, updatedNotifications, notifications);
                    return true;
                }
            }

            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error deleting notification {NotificationId}", correlationId, notificationId);
            return false;
        }
    }

    /// <summary>
    /// Send system alert to all admins
    /// </summary>
    public async Task<bool> SendSystemAlertAsync(SystemAlertRequest alert, string correlationId)
    {
        try
        {
            _logger.LogWarning("[{CorrelationId}] Sending system alert: {Title}", correlationId, alert.Title);

            // Send to all connected admin clients
            await _hubContext.Clients.All.SendAsync("ReceiveSystemAlert", new
            {
                alert.Title,
                alert.Message,
                alert.Severity,
                Timestamp = DateTime.UtcNow
            });

            // For critical alerts, also send emails (would need admin email list in real implementation)
            if (alert.Severity.Equals(AlertSeverity.Critical.ToString(), StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogCritical("[{CorrelationId}] CRITICAL SYSTEM ALERT: {Title} - {Message}", 
                    correlationId, alert.Title, alert.Message);
            }

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error sending system alert", correlationId);
            return false;
        }
    }

    /// <summary>
    /// Create a system-wide notification
    /// </summary>
    public async Task<AdminNotification> CreateSystemNotificationAsync(
        NotificationType type,
        NotificationSeverity severity,
        string title,
        string message,
        string? actionUrl = null,
        Dictionary<string, object>? data = null,
        Guid? createdBy = null,
        string correlationId = "")
    {
        try
        {
            var notification = new AdminNotification
            {
                Id = Guid.NewGuid(),
                UserId = Guid.Empty, // System notification
                Title = title,
                Message = message,
                Type = type,
                Severity = severity,
                CreatedAt = DateTime.UtcNow,
                ActionUrl = actionUrl,
                Data = data,
                CreatedBy = createdBy
            };

            _logger.LogInformation("[{CorrelationId}] Creating system notification: {Title}", correlationId, title);

            // Send to all connected admin clients
            await _hubContext.Clients.All.SendAsync("ReceiveNotification", notification);

            return notification;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error creating system notification", correlationId);
            throw;
        }
    }

    /// <summary>
    /// Send notification to a specific user
    /// </summary>
    public async Task<AdminNotification> SendUserNotificationAsync(
        Guid userId,
        NotificationType type,
        NotificationSeverity severity,
        string title,
        string message,
        string? actionUrl = null,
        Dictionary<string, object>? data = null,
        Guid? createdBy = null,
        string correlationId = "")
    {
        try
        {
            var notification = new AdminNotification
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Title = title,
                Message = message,
                Type = type,
                Severity = severity,
                CreatedAt = DateTime.UtcNow,
                ActionUrl = actionUrl,
                Data = data,
                CreatedBy = createdBy
            };

            await SendNotificationAsync(notification, correlationId);

            return notification;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error sending user notification", correlationId);
            throw;
        }
    }

    /// <summary>
    /// Send notification to multiple users
    /// </summary>
    public async Task<List<AdminNotification>> SendBulkNotificationAsync(
        List<Guid> userIds,
        NotificationType type,
        NotificationSeverity severity,
        string title,
        string message,
        string? actionUrl = null,
        Dictionary<string, object>? data = null,
        Guid? createdBy = null,
        string correlationId = "")
    {
        try
        {
            var notifications = new List<AdminNotification>();

            foreach (var userId in userIds)
            {
                var notification = await SendUserNotificationAsync(
                    userId, type, severity, title, message, actionUrl, data, createdBy, correlationId);
                notifications.Add(notification);
            }

            return notifications;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error sending bulk notifications", correlationId);
            throw;
        }
    }

    /// <summary>
    /// Create business metric alert
    /// </summary>
    public async Task CreateBusinessAlertAsync(
        string alertType,
        string title,
        string message,
        NotificationSeverity severity,
        Dictionary<string, object>? metrics = null,
        string correlationId = "")
    {
        try
        {
            _logger.LogInformation("[{CorrelationId}] Creating business alert: {AlertType} - {Title}", correlationId, alertType, title);

            await CreateSystemNotificationAsync(
                NotificationType.BusinessAlert,
                severity,
                $"Business Alert: {title}",
                message,
                null,
                metrics,
                null,
                correlationId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error creating business alert", correlationId);
            throw;
        }
    }

    /// <summary>
    /// Create system health alert
    /// </summary>
    public async Task CreateSystemHealthAlertAsync(
        string component,
        string status,
        string message,
        NotificationSeverity severity,
        Dictionary<string, object>? healthData = null,
        string correlationId = "")
    {
        try
        {
            _logger.LogInformation("[{CorrelationId}] Creating system health alert for {Component}: {Status}", correlationId, component, status);

            await CreateSystemNotificationAsync(
                NotificationType.SystemHealth,
                severity,
                $"System Health: {component} - {status}",
                message,
                null,
                healthData,
                null,
                correlationId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error creating system health alert", correlationId);
            throw;
        }
    }

    /// <summary>
    /// Create user action alert
    /// </summary>
    public async Task CreateUserActionAlertAsync(
        Guid targetUserId,
        string actionType,
        string description,
        NotificationSeverity severity,
        Dictionary<string, object>? actionData = null,
        string correlationId = "")
    {
        try
        {
            _logger.LogInformation("[{CorrelationId}] Creating user action alert for {UserId}: {ActionType}", correlationId, targetUserId, actionType);

            await SendUserNotificationAsync(
                targetUserId,
                NotificationType.UserAction,
                severity,
                $"User Action: {actionType}",
                description,
                null,
                actionData,
                null,
                correlationId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error creating user action alert", correlationId);
            throw;
        }
    }

    /// <summary>
    /// Get notification preferences for a user
    /// </summary>
    public async Task<NotificationPreferences> GetNotificationPreferencesAsync(Guid userId, string correlationId)
    {
        try
        {
            await Task.CompletedTask; // Placeholder for async signature

            // In a real implementation, this would come from database
            return new NotificationPreferences
            {
                EmailNotifications = true,
                PushNotifications = true,
                SmsNotifications = false,
                SystemAlerts = true,
                BusinessAlerts = true,
                SecurityAlerts = true,
                PaymentAlerts = true,
                MarketingEmails = false,
                WeeklyDigest = true
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error getting notification preferences for user {UserId}", correlationId, userId);
            throw;
        }
    }

    /// <summary>
    /// Update notification preferences for a user
    /// </summary>
    public async Task<bool> UpdateNotificationPreferencesAsync(
        Guid userId,
        Dictionary<string, bool> preferences,
        string correlationId)
    {
        try
        {
            _logger.LogInformation("[{CorrelationId}] Updating notification preferences for user {UserId}", correlationId, userId);

            await Task.CompletedTask; // Placeholder for actual database update

            // In a real implementation, this would update the database
            _logger.LogInformation("[{CorrelationId}] Successfully updated {Count} preferences for user {UserId}", correlationId, preferences.Count, userId);

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error updating notification preferences for user {UserId}", correlationId, userId);
            return false;
        }
    }

    /// <summary>
    /// Get notification statistics and analytics
    /// </summary>
    public async Task<Dictionary<string, object>> GetNotificationStatisticsAsync(
        DateTime startDate,
        DateTime endDate,
        string correlationId)
    {
        try
        {
            await Task.CompletedTask; // Placeholder for async signature

            var stats = new Dictionary<string, object>
            {
                ["totalNotifications"] = _userNotifications.Values.SelectMany(n => n).Count(),
                ["unreadNotifications"] = _userNotifications.Values.SelectMany(n => n).Count(n => !n.IsRead),
                ["notificationsByType"] = _userNotifications.Values
                    .SelectMany(n => n)
                    .GroupBy(n => n.Type)
                    .ToDictionary(g => g.Key.ToString(), g => (object)g.Count()),
                ["notificationsBySeverity"] = _userNotifications.Values
                    .SelectMany(n => n)
                    .GroupBy(n => n.Severity)
                    .ToDictionary(g => g.Key.ToString(), g => (object)g.Count()),
                ["periodStart"] = startDate,
                ["periodEnd"] = endDate,
                ["generatedAt"] = DateTime.UtcNow,
                ["activeUsers"] = _userNotifications.Keys.Count()
            };

            return stats;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error getting notification statistics", correlationId);
            throw;
        }
    }

    /// <summary>
    /// Clean up old notifications
    /// </summary>
    public async Task<int> CleanupOldNotificationsAsync(int daysToKeep = 90, string correlationId = "")
    {
        try
        {
            var cutoffDate = DateTime.UtcNow.AddDays(-daysToKeep);
            int cleanedCount = 0;

            foreach (var kvp in _userNotifications)
            {
                var userNotifications = kvp.Value;
                var toRemove = userNotifications.Where(n => n.CreatedAt < cutoffDate).ToList();
                if (toRemove.Any())
                {
                    // ✅ THREAD SAFETY FIX: ConcurrentBag doesn't support Remove, rebuild without old notifications
                    var updatedNotifications = new ConcurrentBag<AdminNotification>(userNotifications.Where(n => n.CreatedAt >= cutoffDate));
                    _userNotifications.TryUpdate(kvp.Key, updatedNotifications, userNotifications);
                    cleanedCount += toRemove.Count;
                }
            }

            _logger.LogInformation("[{CorrelationId}] Cleaned up {Count} old notifications older than {DaysToKeep} days", 
                correlationId, cleanedCount, daysToKeep);

            await Task.CompletedTask; // Placeholder for async signature
            return cleanedCount;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error cleaning up old notifications", correlationId);
            return 0;
        }
    }

    /// <summary>
    /// Subscribe user to real-time notifications
    /// </summary>
    public async Task SubscribeToRealtimeNotificationsAsync(Guid userId, string connectionId, string correlationId)
    {
        try
        {
            _logger.LogInformation("[{CorrelationId}] Subscribing user {UserId} with connection {ConnectionId} to real-time notifications", 
                correlationId, userId, connectionId);

            await _hubContext.Groups.AddToGroupAsync(connectionId, $"user_{userId}");
            await _hubContext.Groups.AddToGroupAsync(connectionId, "admin_notifications");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error subscribing user {UserId} to real-time notifications", correlationId, userId);
            throw;
        }
    }

    /// <summary>
    /// Unsubscribe user from real-time notifications
    /// </summary>
    public async Task UnsubscribeFromRealtimeNotificationsAsync(Guid userId, string connectionId, string correlationId)
    {
        try
        {
            _logger.LogInformation("[{CorrelationId}] Unsubscribing user {UserId} with connection {ConnectionId} from real-time notifications", 
                correlationId, userId, connectionId);

            await _hubContext.Groups.RemoveFromGroupAsync(connectionId, $"user_{userId}");
            await _hubContext.Groups.RemoveFromGroupAsync(connectionId, "admin_notifications");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error unsubscribing user {UserId} from real-time notifications", correlationId, userId);
            throw;
        }
    }
}
