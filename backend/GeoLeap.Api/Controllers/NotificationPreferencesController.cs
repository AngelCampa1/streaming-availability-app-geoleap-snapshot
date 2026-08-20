using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using GeoLeap.Api.Services;
using GeoLeap.Api.Models;
using GeoLeap.Api.Extensions;
using System.Security.Claims;

namespace GeoLeap.Api.Controllers;

/// <summary>
/// Controller for managing user notification preferences - US-8.2 Complete Implementation
/// </summary>
[ApiController]
[Route("api/notification-preferences")]
[Authorize]
public class NotificationPreferencesController : ControllerBase
{
    private readonly INotificationPreferencesService _preferencesService;
    private readonly ILogger<NotificationPreferencesController> _logger;

    public NotificationPreferencesController(
        INotificationPreferencesService preferencesService,
        ILogger<NotificationPreferencesController> logger)
    {
        _preferencesService = preferencesService;
        _logger = logger;
    }

    /// <summary>
    /// Get current user's notification preferences
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<WatchlistNotificationSettingsDto>> GetUserPreferencesAsync()
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized();

            var correlationId = HttpContext.TraceIdentifier;
            var preferences = await _preferencesService.GetUserPreferencesAsync(userId.Value);

            return Ok(preferences);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting user preferences");
            return StatusCode(500, new { message = "Internal server error" });
        }
    }

    /// <summary>
    /// Get notification preferences for a specific user (admin only)
    /// </summary>
    [HttpGet("{userId}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<WatchlistNotificationSettingsDto>> GetUserPreferencesByIdAsync(Guid userId)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var preferences = await _preferencesService.GetUserPreferencesAsync(userId);

            return Ok(preferences);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting user preferences for user {UserId}", userId);
            return StatusCode(500, new { message = "Internal server error" });
        }
    }

    /// <summary>
    /// Update current user's notification preferences
    /// </summary>
    [HttpPut]
    public async Task<ActionResult> UpdateUserPreferencesAsync([FromBody] UpdateNotificationPreferencesRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized();

            var correlationId = HttpContext.TraceIdentifier;
            // Convert request to NotificationSettings
            var settings = new NotificationSettings
            {
                UserId = userId.Value,
                EmailEnabled = request.EmailEnabled ?? true,
                PushEnabled = request.PushEnabled ?? true,
                SmsEnabled = request.SmsEnabled ?? false,
                InAppEnabled = request.InAppEnabled ?? true
            };
            
            var success = await _preferencesService.UpdateUserPreferencesAsync(userId.Value, settings);

            if (!success)
            {
                return this.StandardBadRequest("Failed to update preferences");
            }

            return Ok(new { message = "Preferences updated successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating user preferences");
            return StatusCode(500, new { message = "Internal server error" });
        }
    }

    /// <summary>
    /// Create default preferences for current user
    /// </summary>
    [HttpPost("create-default")]
    public async Task<ActionResult> CreateDefaultPreferencesAsync()
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized();

            var correlationId = HttpContext.TraceIdentifier;
            var success = await _preferencesService.CreateDefaultPreferencesAsync(userId.Value);

            if (!success)
            {
                return this.StandardBadRequest("Failed to create default preferences");
            }

            return Ok(new { message = "Default preferences created successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating default preferences");
            return StatusCode(500, new { message = "Internal server error" });
        }
    }

    /// <summary>
    /// Unsubscribe from a specific notification type
    /// </summary>
    [HttpPost("unsubscribe/{notificationType}")]
    public async Task<ActionResult> UnsubscribeFromTypeAsync(string notificationType)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized();

            var correlationId = HttpContext.TraceIdentifier;
            var success = await _preferencesService.UnsubscribeFromTypeAsync(userId.Value, notificationType, correlationId);

            if (!success)
            {
                return this.StandardBadRequest("Failed to unsubscribe");
            }

            return Ok(new { message = $"Unsubscribed from {notificationType} notifications" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error unsubscribing from notification type {NotificationType}", notificationType);
            return StatusCode(500, new { message = "Internal server error" });
        }
    }

    /// <summary>
    /// Unsubscribe from all notifications
    /// </summary>
    [HttpPost("unsubscribe-all")]
    public async Task<ActionResult> UnsubscribeFromAllAsync([FromBody] UnsubscribeRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized();

            var correlationId = HttpContext.TraceIdentifier;
            var success = await _preferencesService.UnsubscribeFromAllAsync(userId.Value, request.Reason);

            if (!success)
            {
                return this.StandardBadRequest("Failed to unsubscribe from all notifications");
            }

            return Ok(new { message = "Unsubscribed from all notifications successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error unsubscribing from all notifications");
            return StatusCode(500, new { message = "Internal server error" });
        }
    }

    /// <summary>
    /// Resubscribe to notifications
    /// </summary>
    [HttpPost("resubscribe")]
    public async Task<ActionResult> ResubscribeAsync([FromBody] ResubscribeRequest? request = null)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized();

            var correlationId = HttpContext.TraceIdentifier;
            var success = string.IsNullOrEmpty(request?.NotificationType) 
                ? await _preferencesService.ResubscribeToAllAsync(userId.Value)
                : await _preferencesService.ResubscribeToTypeAsync(userId.Value, request.NotificationType);

            if (!success)
            {
                return this.StandardBadRequest("Failed to resubscribe");
            }

            var message = string.IsNullOrEmpty(request?.NotificationType)
                ? "Resubscribed to all notifications"
                : $"Resubscribed to {request.NotificationType} notifications";

            return Ok(new { message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error resubscribing to notifications");
            return StatusCode(500, new { message = "Internal server error" });
        }
    }

    /// <summary>
    /// Check if a notification can be sent to the current user
    /// </summary>
    [HttpGet("can-send/{notificationType}")]
    public async Task<ActionResult<CanSendNotificationResponseDto>> CanSendNotificationAsync(string notificationType)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized();

            var correlationId = HttpContext.TraceIdentifier;
            var canSend = await _preferencesService.CanSendNotificationAsync(userId.Value, notificationType);

            return Ok(new CanSendNotificationResponseDto
            {
                CanSend = canSend,
                NotificationType = notificationType,
                UserId = userId.Value
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking if can send notification type {NotificationType}", notificationType);
            return StatusCode(500, new { message = "Internal server error" });
        }
    }

    /// <summary>
    /// Get enabled notification channels for a specific notification type
    /// </summary>
    [HttpGet("enabled-channels/{notificationType}")]
    public async Task<ActionResult<EnabledChannelsResponseDto>> GetEnabledChannelsAsync(string notificationType)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized();

            var correlationId = HttpContext.TraceIdentifier;
            var channels = await _preferencesService.GetEnabledChannelsAsync(userId.Value);

            return Ok(new EnabledChannelsResponseDto
            {
                NotificationType = notificationType,
                EnabledChannels = channels,
                UserId = userId.Value
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting enabled channels for notification type {NotificationType}", notificationType);
            return StatusCode(500, new { message = "Internal server error" });
        }
    }

    /// <summary>
    /// Check if current user is in quiet hours
    /// </summary>
    [HttpGet("quiet-hours/status")]
    public async Task<ActionResult<QuietHoursStatusResponseDto>> IsInQuietHoursAsync()
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized();

            var correlationId = HttpContext.TraceIdentifier;
            var isInQuietHours = await _preferencesService.IsInQuietHoursAsync(userId.Value);

            return Ok(new QuietHoursStatusResponseDto
            {
                IsInQuietHours = isInQuietHours,
                UserId = userId.Value,
                CurrentTime = DateTime.UtcNow
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking quiet hours status");
            return StatusCode(500, new { message = "Internal server error" });
        }
    }

    /// <summary>
    /// Check if current user has reached rate limit for a notification type
    /// </summary>
    [HttpGet("rate-limit/{notificationType}")]
    public async Task<ActionResult<RateLimitStatusResponseDto>> HasReachedRateLimitAsync(string notificationType)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized();

            var correlationId = HttpContext.TraceIdentifier;
            var hasReachedLimit = !await _preferencesService.IsWithinRateLimitAsync(userId.Value, notificationType);

            return Ok(new RateLimitStatusResponseDto
            {
                HasReachedLimit = hasReachedLimit,
                NotificationType = notificationType,
                UserId = userId.Value
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking rate limit for notification type {NotificationType}", notificationType);
            return StatusCode(500, new { message = "Internal server error" });
        }
    }

    /// <summary>
    /// Update bulk preferences for multiple users (admin only)
    /// </summary>
    [HttpPut("bulk")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<BulkUpdateResponseDto>> UpdateBulkPreferencesAsync([FromBody] BulkPreferencesUpdateRequest request)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var success = await _preferencesService.UpdateBulkPreferencesAsync(request.UserIds, request, correlationId);

            if (!success)
            {
                return this.StandardBadRequest("Failed to update bulk preferences");
            }

            return Ok(new BulkUpdateResponseDto
            {
                Success = true,
                ProcessedCount = request.UserIds.Count,
                Message = "Bulk preferences updated successfully"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating bulk preferences");
            return StatusCode(500, new { message = "Internal server error" });
        }
    }

    /// <summary>
    /// Get bulk preferences for multiple users (admin only)
    /// </summary>
    [HttpPost("bulk/get")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<List<WatchlistNotificationSettingsDto>>> GetBulkPreferencesAsync([FromBody] BulkGetPreferencesRequest request)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var preferences = await _preferencesService.GetBulkPreferencesAsync(request.UserIds, correlationId);

            return Ok(preferences);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting bulk preferences");
            return StatusCode(500, new { message = "Internal server error" });
        }
    }

    /// <summary>
    /// Get notification preferences statistics (admin only)
    /// </summary>
    [HttpGet("stats")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<NotificationPreferencesStatsDto>> GetPreferencesStatsAsync(
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var userId = GetCurrentUserId();
            if (userId == null) return Unauthorized();
            var stats = await _preferencesService.GetPreferencesStatsAsync(userId.Value);

            return Ok(stats);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting preferences statistics");
            return StatusCode(500, new { message = "Internal server error" });
        }
    }

    /// <summary>
    /// Get unsubscribe analytics (admin only)
    /// </summary>
    [HttpGet("unsubscribe-analytics")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<List<UnsubscribeAnalyticsDto>>> GetUnsubscribeAnalyticsAsync(
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var analytics = await _preferencesService.GetUnsubscribeAnalyticsAsync(fromDate, toDate);

            return Ok(analytics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting unsubscribe analytics");
            return StatusCode(500, new { message = "Internal server error" });
        }
    }

    /// <summary>
    /// Migrate user preferences from legacy format (admin only)
    /// </summary>
    [HttpPost("{userId}/migrate")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult> MigrateUserPreferencesAsync(Guid userId, [FromBody] Dictionary<string, object> legacyPreferences)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var success = await _preferencesService.MigrateUserPreferencesAsync(userId, legacyPreferences, correlationId);

            if (!success)
            {
                return this.StandardBadRequest("Failed to migrate preferences");
            }

            return Ok(new { message = "Preferences migrated successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error migrating user preferences for user {UserId}", userId);
            return StatusCode(500, new { message = "Internal server error" });
        }
    }

    /// <summary>
    /// Export user data for GDPR compliance
    /// </summary>
    [HttpGet("export")]
    public async Task<ActionResult<GdprDataDto>> ExportUserDataAsync()
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized();

            var correlationId = HttpContext.TraceIdentifier;
            var data = await _preferencesService.ExportUserDataAsync(userId.Value, correlationId);

            return Ok(data);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error exporting user data");
            return StatusCode(500, new { message = "Internal server error" });
        }
    }

    /// <summary>
    /// Delete user notification data for GDPR compliance
    /// </summary>
    [HttpDelete("delete-data")]
    public async Task<ActionResult> DeleteUserDataAsync()
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == null)
                return Unauthorized();

            var correlationId = HttpContext.TraceIdentifier;
            var success = await _preferencesService.DeleteUserDataAsync(userId.Value, correlationId);

            if (!success)
            {
                return this.StandardBadRequest("Failed to delete user data");
            }

            return Ok(new { message = "User notification data deleted successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting user data");
            return StatusCode(500, new { message = "Internal server error" });
        }
    }

    // Helper method to get current user ID
    private Guid? GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (Guid.TryParse(userIdClaim, out var userId))
        {
            return userId;
        }
        return null;
    }
}

// Supporting DTOs
public class UnsubscribeRequest
{
    public string Reason { get; set; } = string.Empty;
}

public class ResubscribeRequest
{
    public string? NotificationType { get; set; }
}

public class CanSendNotificationResponseDto
{
    public bool CanSend { get; set; }
    public string NotificationType { get; set; } = string.Empty;
    public Guid UserId { get; set; }
}

public class EnabledChannelsResponseDto
{
    public string NotificationType { get; set; } = string.Empty;
    public List<string> EnabledChannels { get; set; } = new();
    public Guid UserId { get; set; }
}

public class QuietHoursStatusResponseDto
{
    public bool IsInQuietHours { get; set; }
    public Guid UserId { get; set; }
    public DateTime CurrentTime { get; set; }
}

public class RateLimitStatusResponseDto
{
    public bool HasReachedLimit { get; set; }
    public string NotificationType { get; set; } = string.Empty;
    public Guid UserId { get; set; }
}

public class BulkUpdateResponseDto
{
    public bool Success { get; set; }
    public int ProcessedCount { get; set; }
    public string Message { get; set; } = string.Empty;
}

public class BulkGetPreferencesRequest
{
    public List<Guid> UserIds { get; set; } = new();
}