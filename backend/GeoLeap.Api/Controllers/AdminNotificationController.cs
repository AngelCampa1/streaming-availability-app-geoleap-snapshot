using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using GeoLeap.Api.Attributes;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using GeoLeap.Api.Extensions;
using GeoLeap.Api.Hubs;
using System.Security.Claims;

namespace GeoLeap.Api.Controllers;

[ApiController]
[Route("api/admin/notifications")]
[Authorize]
[RequirePermission("admin", "notifications:view")]
public class AdminNotificationController : ControllerBase
{
    private readonly IAdminNotificationService _notificationService;
    private readonly IHubContext<AdminHub> _adminHubContext;
    private readonly ILogger<AdminNotificationController> _logger;

    public AdminNotificationController(
        IAdminNotificationService notificationService,
        IHubContext<AdminHub> adminHubContext,
        ILogger<AdminNotificationController> logger)
    {
        _notificationService = notificationService;
        _adminHubContext = adminHubContext;
        _logger = logger;
    }

    /// <summary>
    /// Get notifications for current admin user
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<AdminNotification>>> GetNotifications(
        [FromQuery] bool unreadOnly = false,
        [FromQuery] NotificationType? type = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var userId = GetCurrentUserId();
            
            if (userId == null)
                return Unauthorized("User ID not found in token");

            var notifications = await _notificationService.GetNotificationsAsync(
                userId.Value, unreadOnly, type, page, pageSize, correlationId);
            
            return Ok(notifications);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving notifications");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get unread notification count
    /// </summary>
    [HttpGet("unread-count")]
    public async Task<ActionResult<int>> GetUnreadCount()
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var userId = GetCurrentUserId();
            
            if (userId == null)
                return Unauthorized("User ID not found in token");

            var count = await _notificationService.GetUnreadCountAsync(userId.Value, correlationId);
            return Ok(count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving unread notification count");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Mark notification as read
    /// </summary>
    [HttpPut("{notificationId:guid}/read")]
    public async Task<ActionResult> MarkAsRead(Guid notificationId)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var userId = GetCurrentUserId();
            
            if (userId == null)
                return Unauthorized("User ID not found in token");

            var success = await _notificationService.MarkAsReadAsync(
                notificationId, userId.Value, correlationId);
            
            if (!success)
                return NotFound("Notification not found or already read");

            return Ok(new { Message = "Notification marked as read" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error marking notification as read: {NotificationId}", notificationId);
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Mark all notifications as read
    /// </summary>
    [HttpPut("read-all")]
    public async Task<ActionResult> MarkAllAsRead()
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var userId = GetCurrentUserId();
            
            if (userId == null)
                return Unauthorized("User ID not found in token");

            var count = await _notificationService.MarkAllAsReadAsync(userId.Value, correlationId);
            
            return Ok(new { Message = $"Marked {count} notifications as read" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error marking all notifications as read");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Delete notification
    /// </summary>
    [HttpDelete("{notificationId:guid}")]
    [RequirePermission("admin:notifications:delete")]
    public async Task<ActionResult> DeleteNotification(Guid notificationId)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var userId = GetCurrentUserId();
            
            if (userId == null)
                return Unauthorized("User ID not found in token");

            var success = await _notificationService.DeleteNotificationAsync(
                notificationId, userId.Value, correlationId);
            
            if (!success)
                return NotFound("Notification not found");

            return Ok(new { Message = "Notification deleted successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting notification: {NotificationId}", notificationId);
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Create system-wide notification
    /// </summary>
    [HttpPost("system")]
    [RequirePermission("admin:notifications:create")]
    public async Task<ActionResult<AdminNotification>> CreateSystemNotification(
        [FromBody] CreateSystemNotificationRequest request)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var createdBy = GetCurrentUserId();
            
            if (createdBy == null)
                return Unauthorized("User ID not found in token");

            var notification = await _notificationService.CreateSystemNotificationAsync(
                request.Type, request.Severity, request.Title, request.Message, 
                request.ActionUrl, request.Data, createdBy.Value, correlationId);

            // Send real-time notification to all admin users
            await _adminHubContext.Clients.Group("AdminUsers").SendAsync("NewNotification", notification);
            
            return CreatedAtAction(nameof(GetNotifications), new { }, notification);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating system notification");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Send notification to specific user
    /// </summary>
    [HttpPost("user/{userId:guid}")]
    [RequirePermission("admin:notifications:send")]
    public async Task<ActionResult<AdminNotification>> SendUserNotification(
        Guid userId,
        [FromBody] SendUserNotificationRequest request)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var createdBy = GetCurrentUserId();
            
            if (createdBy == null)
                return Unauthorized("User ID not found in token");

            var notification = await _notificationService.SendUserNotificationAsync(
                userId, request.Type, request.Severity, request.Title, request.Message,
                request.ActionUrl, request.Data, createdBy.Value, correlationId);

            // Send real-time notification to specific user if they're online
            await _adminHubContext.Clients.User(userId.ToString()).SendAsync("NewNotification", notification);
            
            return CreatedAtAction(nameof(GetNotifications), new { }, notification);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending user notification to {UserId}", userId);
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get notification preferences for current user
    /// </summary>
    [HttpGet("preferences")]
    public async Task<ActionResult<Models.NotificationPreferences>> GetNotificationPreferences()
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var userId = GetCurrentUserId();
            
            if (userId == null)
                return Unauthorized("User ID not found in token");

            var preferences = await _notificationService.GetNotificationPreferencesAsync(userId.Value, correlationId);
            return Ok(preferences);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving notification preferences");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Update notification preferences for current user
    /// </summary>
    [HttpPut("preferences")]
    public async Task<ActionResult> UpdateNotificationPreferences(
        [FromBody] AdminUpdateNotificationPreferencesRequest request)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var userId = GetCurrentUserId();
            
            if (userId == null)
                return Unauthorized("User ID not found in token");

            var success = await _notificationService.UpdateNotificationPreferencesAsync(
                userId.Value, request.Preferences, correlationId);
            
            if (!success)
                return this.StandardBadRequest("Failed to update notification preferences");

            return Ok(new { Message = "Notification preferences updated successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating notification preferences");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get notification statistics
    /// </summary>
    [HttpGet("statistics")]
    [RequirePermission("admin:notifications:analytics")]
    public async Task<ActionResult<Dictionary<string, object>>> GetNotificationStatistics(
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var start = startDate ?? DateTime.UtcNow.AddDays(-30);
            var end = endDate ?? DateTime.UtcNow;
            
            var statistics = await _notificationService.GetNotificationStatisticsAsync(
                start, end, correlationId);
            
            return Ok(statistics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving notification statistics");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Test real-time notification connection
    /// </summary>
    [HttpPost("test-realtime")]
    [RequirePermission("admin:notifications:test")]
    public async Task<ActionResult> TestRealtimeNotification()
    {
        try
        {
            var userId = GetCurrentUserId();
            
            if (userId == null)
                return Unauthorized("User ID not found in token");

            var testNotification = new
            {
                Id = Guid.NewGuid(),
                Type = "test",
                Title = "Test Notification",
                Message = "This is a test real-time notification",
                Timestamp = DateTime.UtcNow
            };

            await _adminHubContext.Clients.User(userId?.ToString() ?? "unknown").SendAsync("TestNotification", testNotification);
            
            return Ok(new { Message = "Test notification sent" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending test notification");
            return StatusCode(500, "Internal server error");
        }
    }

    private Guid? GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(userIdClaim, out var userId) ? userId : null;
    }
}

// Supporting DTOs
public class CreateSystemNotificationRequest
{
    public NotificationType Type { get; set; }
    public NotificationSeverity Severity { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? ActionUrl { get; set; }
    public Dictionary<string, object>? Data { get; set; }
}

public class SendUserNotificationRequest
{
    public NotificationType Type { get; set; }
    public NotificationSeverity Severity { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? ActionUrl { get; set; }
    public Dictionary<string, object>? Data { get; set; }
}


/// <summary>
/// Admin request DTO for updating notification preferences (simple version)
/// </summary>
public class AdminUpdateNotificationPreferencesRequest
{
    public Dictionary<string, bool> Preferences { get; set; } = new();
}
