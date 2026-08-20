using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using GeoLeap.Api.Attributes;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using GeoLeap.Api.Extensions;
using System.Security.Claims;
using System.ComponentModel.DataAnnotations;

namespace GeoLeap.Api.Controllers;

[ApiController]
[Route("api/admin/users")]
[Authorize]
[RequirePermission("admin", "users:manage")]
public class AdminUserManagementController : ControllerBase
{
    private readonly IAdvancedAdminUserService _userService;
    private readonly ILogger<AdminUserManagementController> _logger;

    public AdminUserManagementController(
        IAdvancedAdminUserService userService,
        ILogger<AdminUserManagementController> logger)
    {
        _userService = userService;
        _logger = logger;
    }

    /// <summary>
    /// Advanced user search with filtering and faceting
    /// </summary>
    [HttpGet("search")]
    public async Task<ActionResult<AdminUserSearchResponse>> SearchUsers([FromQuery] AdminUserSearchRequest request)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var result = await _userService.SearchUsersAsync(request, correlationId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error searching users");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get detailed user information for admin view
    /// </summary>
    [HttpGet("{userId:guid}")]
    public async Task<ActionResult<AdminUserSummary>> GetUserDetail(Guid userId)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var userDetail = await _userService.GetUserDetailAsync(userId, correlationId);
            
            if (userDetail == null)
                return NotFound($"User with ID {userId} not found");

            return Ok(userDetail);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving user detail for {UserId}", userId);
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get user activity timeline
    /// </summary>
    [HttpGet("{userId:guid}/activity")]
    public async Task<ActionResult<List<UserActivityEntry>>> GetUserActivity(
        Guid userId,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var activities = await _userService.GetUserActivityTimelineAsync(
                userId, fromDate, toDate, page, pageSize, correlationId);
            
            return Ok(activities);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving user activity for {UserId}", userId);
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get user's subscription history
    /// </summary>
    [HttpGet("{userId:guid}/subscriptions")]
    public async Task<ActionResult<List<UserSubscriptionHistory>>> GetUserSubscriptionHistory(Guid userId)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var history = await _userService.GetUserSubscriptionHistoryAsync(userId, correlationId);
            return Ok(history);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving subscription history for {UserId}", userId);
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get user's payment history
    /// </summary>
    [HttpGet("{userId:guid}/payments")]
    public async Task<ActionResult<List<UserPaymentHistory>>> GetUserPaymentHistory(Guid userId)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var history = await _userService.GetUserPaymentHistoryAsync(userId, correlationId);
            return Ok(history);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving payment history for {UserId}", userId);
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get user's support ticket history
    /// </summary>
    [HttpGet("{userId:guid}/support")]
    public async Task<ActionResult<List<UserSupportHistory>>> GetUserSupportHistory(Guid userId)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var history = await _userService.GetUserSupportHistoryAsync(userId, correlationId);
            return Ok(history);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving support history for {UserId}", userId);
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Process bulk actions on multiple users
    /// </summary>
    [HttpPost("bulk-actions")]
    [RequirePermission("admin:users:bulk")]
    public async Task<ActionResult<BulkActionResult>> ProcessBulkAction([FromBody] BulkUserActionRequest request)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var performedBy = GetCurrentUserId();
            
            if (performedBy == null)
                return Unauthorized("User ID not found in token");

            var result = await _userService.ProcessBulkActionAsync(request, performedBy.Value, correlationId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing bulk action {ActionType}", request.ActionType);
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get status of bulk action operation
    /// </summary>
    [HttpGet("bulk-actions/{actionId:guid}")]
    public async Task<ActionResult<BulkActionResult>> GetBulkActionStatus(Guid actionId)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var result = await _userService.GetBulkActionStatusAsync(actionId, correlationId);
            
            if (result == null)
                return NotFound($"Bulk action with ID {actionId} not found");

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving bulk action status for {ActionId}", actionId);
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Export user data in various formats
    /// </summary>
    [HttpPost("export")]
    [RequirePermission("admin:users:export")]
    public async Task<IActionResult> ExportUsers(
        [FromBody] UserExportRequest request)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var requestedBy = GetCurrentUserId();
            
            if (requestedBy == null)
                return Unauthorized("User ID not found in token");

            var dataStream = await _userService.ExportUsersAsync(
                request.SearchRequest, request.Format, requestedBy.Value, correlationId);

            var contentType = request.Format.ToLower() switch
            {
                "csv" => "text/csv",
                "json" => "application/json",
                "xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                _ => "application/octet-stream"
            };

            var fileName = $"users_export_{DateTime.UtcNow:yyyyMMdd_HHmmss}.{request.Format}";
            return File(dataStream, contentType, fileName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error exporting user data");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get user merge candidates based on email/name similarity
    /// </summary>
    [HttpGet("{userId:guid}/merge-candidates")]
    [RequirePermission("admin:users:merge")]
    public async Task<ActionResult<List<UserMergeCandidate>>> GetUserMergeCandidates(Guid userId)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var candidates = await _userService.GetUserMergeCandidatesAsync(userId, correlationId);
            return Ok(candidates);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving merge candidates for {UserId}", userId);
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Merge duplicate user accounts
    /// </summary>
    [HttpPost("{primaryUserId:guid}/merge/{duplicateUserId:guid}")]
    [RequirePermission("admin:users:merge")]
    public async Task<ActionResult> MergeUserAccounts(
        Guid primaryUserId, 
        Guid duplicateUserId,
        [FromBody] MergeUserAccountsRequest request)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var performedBy = GetCurrentUserId();
            
            if (performedBy == null)
                return Unauthorized("User ID not found in token");

            var success = await _userService.MergeUserAccountsAsync(
                primaryUserId, duplicateUserId, performedBy.Value, request.Reason, correlationId);

            if (!success)
                return this.StandardBadRequest("Failed to merge user accounts");

            return Ok(new { Message = "User accounts merged successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error merging user accounts {PrimaryUserId} and {DuplicateUserId}", 
                primaryUserId, duplicateUserId);
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Reset user password with admin override
    /// </summary>
    [HttpPost("{userId:guid}/reset-password")]
    [RequirePermission("admin:users:password")]
    public async Task<ActionResult> AdminPasswordReset(
        Guid userId,
        [FromBody] AdminPasswordResetRequest request)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var performedBy = GetCurrentUserId();
            
            if (performedBy == null)
                return Unauthorized("User ID not found in token");

            var success = await _userService.AdminPasswordResetAsync(
                userId, request.NewPassword, request.RequirePasswordChange, performedBy.Value, correlationId);

            if (!success)
                return this.StandardBadRequest("Failed to reset user password");

            return Ok(new { Message = "Password reset successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error resetting password for {UserId}", userId);
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Force email verification for user
    /// </summary>
    [HttpPost("{userId:guid}/force-email-verification")]
    [RequirePermission("admin:users:verify")]
    public async Task<ActionResult> ForceEmailVerification(Guid userId)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var performedBy = GetCurrentUserId();
            
            if (performedBy == null)
                return Unauthorized("User ID not found in token");

            var success = await _userService.ForceEmailVerificationAsync(userId, performedBy.Value, correlationId);

            if (!success)
                return this.StandardBadRequest("Failed to verify user email");

            return Ok(new { Message = "Email verification forced successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error forcing email verification for {UserId}", userId);
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Archive inactive users
    /// </summary>
    [HttpPost("archive-inactive")]
    [RequirePermission("admin:users:archive")]
    public async Task<ActionResult<BulkActionResult>> ArchiveInactiveUsers(
        [FromBody] ArchiveInactiveUsersRequest request)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var performedBy = GetCurrentUserId();
            
            if (performedBy == null)
                return Unauthorized("User ID not found in token");

            var result = await _userService.ArchiveInactiveUsersAsync(
                request.InactiveDays, request.DryRun, performedBy.Value, correlationId);

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error archiving inactive users");
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
public class UserExportRequest
{
    public AdminUserSearchRequest SearchRequest { get; set; } = new();
    
    [Required]
    [RegularExpression("^(csv|json|xlsx)$", ErrorMessage = "Format must be csv, json, or xlsx")]
    public string Format { get; set; } = "csv";
}

public class MergeUserAccountsRequest
{
    [Required]
    [MaxLength(1000)]
    public string Reason { get; set; } = string.Empty;
}

public class AdminPasswordResetRequest
{
    [Required]
    [MinLength(8)]
    [MaxLength(128)]
    public string NewPassword { get; set; } = string.Empty;
    
    public bool RequirePasswordChange { get; set; } = true;
}

public class ArchiveInactiveUsersRequest
{
    [Range(30, 3650)]
    public int InactiveDays { get; set; } = 365;
    
    public bool DryRun { get; set; } = true;
}