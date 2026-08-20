using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using GeoLeap.Api.Services;
using GeoLeap.Api.Models;
using GeoLeap.Api.Middleware;
using System.Security.Claims;

namespace GeoLeap.Api.Controllers;

/// <summary>
/// Controller for managing notifications - US-8.2 Complete Implementation
/// </summary>
[ApiController]
[Route("api/notifications")]
[Authorize]
public class NotificationController : ControllerBase
{
    private readonly INotificationEngine _notificationEngine;
    private readonly ILogger<NotificationController> _logger;

    public NotificationController(
        INotificationEngine notificationEngine,
        ILogger<NotificationController> logger)
    {
        _notificationEngine = notificationEngine;
        _logger = logger;
    }

    private string GetCorrelationId()
    {
        return HttpContext.GetCorrelationId() ?? HttpContext.TraceIdentifier;
    }

    private Guid? GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(userIdClaim, out var userId) ? userId : null;
    }

    #region User-Facing Endpoints

    /// <summary>
    /// Get the current user's notifications with optional filtering and pagination
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<UserNotificationsResult>> GetUserNotificationsAsync(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] bool? unreadOnly = null,
        [FromQuery] string? category = null)
    {
        var correlationId = GetCorrelationId();
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return Unauthorized();
            }

            var result = await _notificationEngine.GetUserNotificationsAsync(
                userId.Value, page, pageSize, unreadOnly, category, correlationId);

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting notifications for current user");
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, null, correlationId));
        }
    }

    /// <summary>
    /// Get unread notification count for the current user
    /// </summary>
    [HttpGet("unread-count")]
    public async Task<ActionResult<UnreadCountResponse>> GetUnreadCountAsync()
    {
        var correlationId = GetCorrelationId();
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return Unauthorized();
            }

            var count = await _notificationEngine.GetUnreadCountAsync(userId.Value, correlationId);

            return Ok(new UnreadCountResponse { Count = count });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting unread count for current user");
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, null, correlationId));
        }
    }

    /// <summary>
    /// Mark notifications as read for the current user
    /// </summary>
    [HttpPost("mark-read")]
    public async Task<ActionResult> MarkNotificationsAsReadAsync([FromBody] MarkNotificationsReadRequest request)
    {
        var correlationId = GetCorrelationId();
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return Unauthorized();
            }

            if (request.NotificationIds == null || request.NotificationIds.Count == 0)
            {
                return Ok(new { message = "No notifications to mark as read", count = 0 });
            }

            var count = await _notificationEngine.MarkNotificationsAsReadAsync(
                userId.Value, request.NotificationIds, correlationId);

            return Ok(new { message = $"{count} notification(s) marked as read", count });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error marking notifications as read for current user");
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, null, correlationId));
        }
    }

    /// <summary>
    /// Delete a notification for the current user
    /// </summary>
    [HttpDelete("{notificationId}")]
    public async Task<ActionResult> DeleteNotificationAsync(Guid notificationId)
    {
        var correlationId = GetCorrelationId();
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
            {
                return Unauthorized();
            }

            if (notificationId == Guid.Empty)
            {
                return BadRequest(ErrorResponseFactory.CreateBadRequestError(correlationId, Request.Path, "Invalid notification ID", correlationId));
            }

            var success = await _notificationEngine.DeleteNotificationAsync(userId.Value, notificationId, correlationId);

            if (!success)
            {
                return NotFound(ErrorResponseFactory.CreateNotFoundError(correlationId, Request.Path, "Notification", notificationId.ToString(), correlationId));
            }

            return Ok(new { message = "Notification deleted successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting notification {NotificationId} for current user", notificationId);
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, null, correlationId));
        }
    }

    #endregion

    /// <summary>
    /// Send a single notification
    /// </summary>
    [HttpPost("send")]
    public async Task<ActionResult<NotificationResponseDto>> SendNotificationAsync([FromBody] NotificationRequest request)
    {
        var correlationId = GetCorrelationId();
        try
        {
            var notificationId = await _notificationEngine.SendNotificationAsync(request, correlationId);

            if (notificationId == Guid.Empty)
            {
                return BadRequest(ErrorResponseFactory.CreateBadRequestError(correlationId, Request.Path, "Failed to send notification", correlationId));
            }

            return Ok(new NotificationResponseDto
            {
                NotificationId = notificationId,
                Status = "sent",
                Message = "Notification sent successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending notification");
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, null, correlationId));
        }
    }

    /// <summary>
    /// Send bulk notifications
    /// </summary>
    [HttpPost("send-bulk")]
    public async Task<ActionResult<BulkNotificationResponseDto>> SendBulkNotificationAsync([FromBody] List<NotificationRequest> requests)
    {
        var correlationId = GetCorrelationId();
        try
        {
            var notificationIds = await _notificationEngine.SendBulkNotificationAsync(requests, correlationId);

            return Ok(new BulkNotificationResponseDto
            {
                TotalRequested = requests.Count,
                SuccessCount = notificationIds.Count,
                FailureCount = requests.Count - notificationIds.Count,
                NotificationIds = notificationIds,
                Status = "completed"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending bulk notifications");
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, null, correlationId));
        }
    }

    /// <summary>
    /// Schedule a notification for later delivery
    /// </summary>
    [HttpPost("schedule")]
    public async Task<ActionResult<NotificationResponseDto>> ScheduleNotificationAsync([FromBody] ScheduleNotificationRequest request)
    {
        var correlationId = GetCorrelationId();
        try
        {
            var notificationRequest = new NotificationRequest
            {
                UserId = request.UserId,
                Type = request.Type,
                Priority = request.Priority,
                Title = request.Title,
                Message = request.Message,
                ActionUrl = request.ActionUrl,
                Data = request.Data,
                Channels = request.Channels,
                ExpiresAt = request.ExpiresAt,
                CampaignId = request.CampaignId,
                Metadata = request.Metadata
            };

            var notificationId = await _notificationEngine.ScheduleNotificationAsync(notificationRequest, request.ScheduledFor, correlationId);

            return Ok(new NotificationResponseDto
            {
                NotificationId = notificationId,
                Status = "scheduled",
                Message = $"Notification scheduled for {request.ScheduledFor}"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error scheduling notification");
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, null, correlationId));
        }
    }

    /// <summary>
    /// Send notification from template
    /// </summary>
    [HttpPost("send-template")]
    public async Task<ActionResult<NotificationResponseDto>> SendFromTemplateAsync([FromBody] TemplateNotificationRequest request)
    {
        var correlationId = GetCorrelationId();
        try
        {
            var notificationId = await _notificationEngine.SendFromTemplateAsync(
                request.TemplateId,
                request.UserId,
                request.TemplateData,
                correlationId);

            return Ok(new NotificationResponseDto
            {
                NotificationId = notificationId,
                Status = "sent",
                Message = "Template notification sent successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending template notification");
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, null, correlationId));
        }
    }

    /// <summary>
    /// Send template notification to multiple users
    /// </summary>
    [HttpPost("send-template-bulk")]
    public async Task<ActionResult<BulkNotificationResponseDto>> SendFromTemplateToUsersAsync([FromBody] BulkTemplateNotificationRequest request)
    {
        var correlationId = GetCorrelationId();
        try
        {
            var notificationIds = await _notificationEngine.SendFromTemplateToUsersAsync(
                request.TemplateId,
                request.UserIds,
                request.TemplateData,
                correlationId);

            return Ok(new BulkNotificationResponseDto
            {
                TotalRequested = request.UserIds.Count,
                SuccessCount = notificationIds.Count,
                FailureCount = request.UserIds.Count - notificationIds.Count,
                NotificationIds = notificationIds,
                Status = "completed"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending bulk template notifications");
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, null, correlationId));
        }
    }

    /// <summary>
    /// Get notification analytics
    /// </summary>
    [HttpGet("{notificationId}/analytics")]
    public async Task<ActionResult<NotificationAnalyticsDto>> GetNotificationAnalyticsAsync(Guid notificationId)
    {
        var correlationId = GetCorrelationId();
        try
        {
            var analytics = await _notificationEngine.GetNotificationAnalyticsAsync(notificationId, correlationId);

            return Ok(analytics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting notification analytics for {NotificationId}", notificationId);
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, null, correlationId));
        }
    }

    /// <summary>
    /// Get notification analytics by ID - Alternative endpoint for testing
    /// </summary>
    [HttpGet("analytics/{notificationId}")]
    public async Task<ActionResult<NotificationAnalyticsDto>> GetAnalyticsByIdAsync(Guid notificationId)
    {
        var correlationId = GetCorrelationId();
        try
        {
            var analytics = await _notificationEngine.GetNotificationAnalyticsAsync(notificationId, correlationId);

            return Ok(analytics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting notification analytics for {NotificationId}", notificationId);
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, null, correlationId));
        }
    }

    /// <summary>
    /// Get user notification statistics
    /// </summary>
    [HttpGet("users/{userId}/stats")]
    public async Task<ActionResult<UserNotificationStatsDto>> GetUserNotificationStatsAsync(
        Guid userId,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null)
    {
        var correlationId = GetCorrelationId();
        try
        {
            var stats = await _notificationEngine.GetUserNotificationStatsAsync(userId, fromDate, toDate, correlationId);

            return Ok(stats);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting user notification stats for {UserId}", userId);
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, null, correlationId));
        }
    }

    /// <summary>
    /// Get system notification statistics
    /// </summary>
    [HttpGet("system/stats")]
    public async Task<ActionResult<SystemNotificationStatsDto>> GetSystemNotificationStatsAsync(
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null)
    {
        var correlationId = GetCorrelationId();
        try
        {
            var stats = await _notificationEngine.GetSystemNotificationStatsAsync(fromDate, toDate, correlationId);

            return Ok(stats);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting system notification stats");
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, null, correlationId));
        }
    }

    /// <summary>
    /// Mark notification as read
    /// </summary>
    [HttpPost("{notificationId}/mark-read")]
    public async Task<ActionResult> MarkAsReadAsync(Guid notificationId)
    {
        var correlationId = GetCorrelationId();
        try
        {
            var success = await _notificationEngine.MarkAsReadAsync(notificationId, correlationId);

            if (!success)
            {
                return NotFound(ErrorResponseFactory.CreateNotFoundError(correlationId, Request.Path, "Notification", notificationId.ToString(), correlationId));
            }

            return Ok(new { message = "Notification marked as read" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error marking notification as read {NotificationId}", notificationId);
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, null, correlationId));
        }
    }

    /// <summary>
    /// Mark notification as clicked
    /// </summary>
    [HttpPost("{notificationId}/mark-clicked")]
    public async Task<ActionResult> MarkAsClickedAsync(Guid notificationId, [FromBody] ClickTrackingRequest request)
    {
        var correlationId = GetCorrelationId();
        try
        {
            var success = await _notificationEngine.MarkAsClickedAsync(notificationId, request.ActionUrl, correlationId);

            if (!success)
            {
                return NotFound(ErrorResponseFactory.CreateNotFoundError(correlationId, Request.Path, "Notification", notificationId.ToString(), correlationId));
            }

            return Ok(new { message = "Notification interaction tracked" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error tracking notification click {NotificationId}", notificationId);
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, null, correlationId));
        }
    }

    /// <summary>
    /// Track custom notification interaction
    /// </summary>
    [HttpPost("{notificationId}/track-interaction")]
    public async Task<ActionResult> TrackInteractionAsync(Guid notificationId, [FromBody] InteractionTrackingRequest request)
    {
        var correlationId = GetCorrelationId();
        try
        {
            var success = await _notificationEngine.TrackInteractionAsync(
                notificationId,
                request.InteractionType,
                request.Context,
                correlationId);

            if (!success)
            {
                return NotFound(ErrorResponseFactory.CreateNotFoundError(correlationId, Request.Path, "Notification", notificationId.ToString(), correlationId));
            }

            return Ok(new { message = "Interaction tracked successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error tracking notification interaction {NotificationId}", notificationId);
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, null, correlationId));
        }
    }

    /// <summary>
    /// Validate notification request
    /// </summary>
    [HttpPost("validate")]
    public async Task<ActionResult<Models.NotificationValidationResult>> ValidateNotificationAsync([FromBody] NotificationRequest request)
    {
        var correlationId = GetCorrelationId();
        try
        {
            var validationResult = await _notificationEngine.ValidateNotificationAsync(request, correlationId);

            return Ok(validationResult);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating notification");
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, null, correlationId));
        }
    }

    /// <summary>
    /// Test notification channel
    /// </summary>
    [HttpPost("test-channel")]
    public async Task<ActionResult> TestNotificationChannelAsync([FromBody] TestChannelRequest request)
    {
        var correlationId = GetCorrelationId();
        try
        {
            var success = await _notificationEngine.TestNotificationChannelAsync(request.Channel, request.UserId, correlationId);

            if (!success)
            {
                return BadRequest(ErrorResponseFactory.CreateBadRequestError(correlationId, Request.Path, "Failed to send test notification", correlationId));
            }

            return Ok(new { message = $"Test notification sent via {request.Channel}" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error testing notification channel");
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, null, correlationId));
        }
    }

    /// <summary>
    /// Process pending notifications manually (admin only)
    /// </summary>
    [HttpPost("process-pending")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult> ProcessPendingNotificationsAsync()
    {
        var correlationId = GetCorrelationId();
        try
        {
            await _notificationEngine.ProcessPendingNotificationsAsync(correlationId);

            return Ok(new { message = "Pending notifications processed" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing pending notifications");
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, null, correlationId));
        }
    }

    /// <summary>
    /// Process failed notifications manually (admin only)
    /// </summary>
    [HttpPost("process-failed")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult> ProcessFailedNotificationsAsync()
    {
        var correlationId = GetCorrelationId();
        try
        {
            await _notificationEngine.ProcessFailedNotificationsAsync(correlationId);

            return Ok(new { message = "Failed notifications processed" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing failed notifications");
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, null, correlationId));
        }
    }

    /// <summary>
    /// Retry failed notification
    /// </summary>
    [HttpPost("{notificationId}/retry")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult> RetryFailedNotificationAsync(Guid notificationId)
    {
        var correlationId = GetCorrelationId();
        try
        {
            var success = await _notificationEngine.RetryFailedNotificationAsync(notificationId, correlationId);

            if (!success)
            {
                return NotFound(ErrorResponseFactory.CreateNotFoundError(correlationId, Request.Path, "Notification", notificationId.ToString(), correlationId));
            }

            return Ok(new { message = "Notification retry initiated" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrying failed notification {NotificationId}", notificationId);
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, null, correlationId));
        }
    }

}

// Supporting DTOs
public class NotificationResponseDto
{
    public Guid NotificationId { get; set; }
    public string Status { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}

public class BulkNotificationResponseDto
{
    public int TotalRequested { get; set; }
    public int SuccessCount { get; set; }
    public int FailureCount { get; set; }
    public List<Guid> NotificationIds { get; set; } = new();
    public string Status { get; set; } = string.Empty;
}

public class ScheduleNotificationRequest
{
    public Guid UserId { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Priority { get; set; } = "medium";
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? ActionUrl { get; set; }
    public Dictionary<string, object>? Data { get; set; }
    public List<string>? Channels { get; set; }
    public DateTime ScheduledFor { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public string? CampaignId { get; set; }
    public Dictionary<string, object>? Metadata { get; set; }
}

public class TemplateNotificationRequest
{
    public string TemplateId { get; set; } = string.Empty;
    public Guid UserId { get; set; }
    public Dictionary<string, object> TemplateData { get; set; } = new();
}

public class BulkTemplateNotificationRequest
{
    public string TemplateId { get; set; } = string.Empty;
    public List<Guid> UserIds { get; set; } = new();
    public Dictionary<string, object> TemplateData { get; set; } = new();
}

public class ClickTrackingRequest
{
    public string ActionUrl { get; set; } = string.Empty;
}

public class InteractionTrackingRequest
{
    public string InteractionType { get; set; } = string.Empty;
    public Dictionary<string, object>? Context { get; set; }
}

public class TestChannelRequest
{
    public string Channel { get; set; } = string.Empty;
    public Guid UserId { get; set; }
}