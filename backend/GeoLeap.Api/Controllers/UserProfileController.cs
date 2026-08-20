using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using GeoLeap.Api.Services;
using GeoLeap.Api.Models;
using GeoLeap.Api.Extensions;
using System.Security.Claims;

namespace GeoLeap.Api.Controllers;

[ApiController]
[Route("api/user-profile")]
[Authorize]
public class UserProfileController : ControllerBase
{
    private readonly IUserProfileService _userProfileService;
    private readonly IRbacService _rbacService;
    private readonly IPasswordResetService _passwordResetService;
    private readonly ILogger<UserProfileController> _logger;

    public UserProfileController(
        IUserProfileService userProfileService,
        IRbacService rbacService,
        IPasswordResetService passwordResetService,
        ILogger<UserProfileController> logger)
    {
        _userProfileService = userProfileService;
        _rbacService = rbacService;
        _passwordResetService = passwordResetService;
        _logger = logger;
    }

    [HttpGet]
    [HttpGet("me")]
    public async Task<ActionResult<UserProfileDto>> GetMyProfile()
    {
        var userId = GetCurrentUserId();
        
        // Check if user has permission to view their own profile
        var canViewProfile = await _rbacService.HasPermissionAsync(userId, "User", "ViewProfile");
        if (!canViewProfile)
        {
            return Forbid();
        }

        var profile = await _userProfileService.GetUserProfileAsync(userId);
        if (profile == null)
        {
            return this.StandardNotFound("UserProfile", userId.ToString());
        }

        // Log the activity
        await _userProfileService.LogUserActivityAsync(
            userId, 
            "ProfileViewed", 
            "User viewed their profile",
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            HttpContext.Request.Headers.UserAgent);

        return Ok(profile);
    }

    [HttpPut]
    [HttpPut("me")]
    public async Task<ActionResult<UserProfileDto>> UpdateMyProfile([FromBody] UpdateUserProfileDto updateDto)
    {
        var userId = GetCurrentUserId();
        
        // Check if user has permission to update their own profile
        var canUpdateProfile = await _rbacService.HasPermissionAsync(userId, "User", "UpdateProfile");
        if (!canUpdateProfile)
        {
            return Forbid();
        }

        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            var updatedProfile = await _userProfileService.UpdateUserProfileAsync(userId, updateDto);
            
            _logger.LogInformation("User profile updated successfully for UserId: {UserId}", userId);
            
            return Ok(updatedProfile);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning("Failed to update profile for UserId: {UserId}. Error: {Error}", userId, ex.Message);
            return this.StandardBadRequest(ex.Message);
        }
    }

    [HttpPost("change-email")]
    public async Task<ActionResult> ChangeEmail([FromBody] ChangeEmailRequestDto requestDto)
    {
        var userId = GetCurrentUserId();
        
        // Check if user has permission to change their email
        var canChangeEmail = await _rbacService.HasPermissionAsync(userId, "User", "ChangeEmail");
        if (!canChangeEmail)
        {
            return Forbid();
        }

        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            var success = await _userProfileService.ChangeEmailAsync(userId, requestDto);
            if (!success)
            {
                return this.StandardBadRequest("Email change request failed. Please check your current password and ensure the new email is not already in use.");
            }

            return Ok(new { message = "Email change verification sent. Please check your new email address." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error changing email for UserId: {UserId}", userId);
            return this.StandardInternalError();
        }
    }

    [HttpDelete]
    [HttpDelete("me")]
    public async Task<ActionResult> DeleteMyAccount([FromBody] DeleteAccountRequestDto requestDto)
    {
        var userId = GetCurrentUserId();

        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            await _userProfileService.DeleteAccountAsync(userId);

            var deleteOptions = new CookieOptions
            {
                HttpOnly = true,
                Secure = Request.IsHttps,
                SameSite = SameSiteMode.Strict
            };
            Response.Cookies.Delete("access_token", deleteOptions);
            Response.Cookies.Delete("refresh_token", deleteOptions);

            return Ok(new { message = "Account deleted successfully" });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning("Account deletion blocked for UserId: {UserId}. Error: {Error}", userId, ex.Message);
            return this.StandardBadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting account for UserId: {UserId}", userId);
            return this.StandardInternalError();
        }
    }

    [HttpPost("verify-email-change")]
    [AllowAnonymous]
    public async Task<ActionResult> VerifyEmailChange([FromBody] VerifyEmailChangeDto verifyDto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            var success = await _userProfileService.VerifyEmailChangeAsync(verifyDto.Token);
            if (!success)
            {
                return this.StandardBadRequest("Invalid or expired verification token");
            }

            return Ok(new { message = "Email change verified successfully. Your account email has been updated." });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error verifying email change");
            return this.StandardInternalError();
        }
    }

    [HttpGet("notification-preferences")]
    public async Task<ActionResult<NotificationPreferencesDto>> GetNotificationPreferences()
    {
        var userId = GetCurrentUserId();
        
        // Check if user has permission to view their notification preferences
        var canViewPreferences = await _rbacService.HasPermissionAsync(userId, "User", "ViewPreferences");
        if (!canViewPreferences)
        {
            return Forbid();
        }

        var preferences = await _userProfileService.GetNotificationPreferencesAsync(userId);
        return Ok(preferences);
    }

    [HttpPut("notification-preferences")]
    public async Task<ActionResult<NotificationPreferencesDto>> UpdateNotificationPreferences([FromBody] NotificationPreferencesDto preferencesDto)
    {
        var userId = GetCurrentUserId();
        
        // Check if user has permission to update their notification preferences
        var canUpdatePreferences = await _rbacService.HasPermissionAsync(userId, "User", "UpdatePreferences");
        if (!canUpdatePreferences)
        {
            return Forbid();
        }

        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var updatedPreferences = await _userProfileService.UpdateNotificationPreferencesAsync(userId, preferencesDto);
        return Ok(updatedPreferences);
    }

    [HttpGet("activity-log")]
    public async Task<ActionResult<IEnumerable<UserActivityLogDto>>> GetActivityLog(
        [FromQuery] int skip = 0, 
        [FromQuery] int take = 20)
    {
        var userId = GetCurrentUserId();
        
        // Check if user has permission to view their activity log
        var canViewActivityLog = await _rbacService.HasPermissionAsync(userId, "User", "ViewActivityLog");
        if (!canViewActivityLog)
        {
            return Forbid();
        }

        // Validate pagination parameters
        if (skip < 0 || take < 1 || take > 100)
        {
            return this.StandardBadRequest("Invalid pagination parameters. Skip must be >= 0, take must be between 1 and 100.");
        }

        var activities = await _userProfileService.GetUserActivityLogAsync(userId, skip, take);
        return Ok(activities);
    }

    [HttpGet("social-accounts")]
    public async Task<ActionResult<IEnumerable<SocialAccountDto>>> GetConnectedSocialAccounts()
    {
        var userId = GetCurrentUserId();
        
        // Check if user has permission to view their social accounts
        var canViewSocialAccounts = await _rbacService.HasPermissionAsync(userId, "User", "ViewSocialAccounts");
        if (!canViewSocialAccounts)
        {
            return Forbid();
        }

        var accounts = await _userProfileService.GetConnectedSocialAccountsAsync(userId);
        return Ok(accounts);
    }

    [HttpPost("social-accounts/disconnect")]
    public async Task<ActionResult> DisconnectSocialAccount([FromBody] DisconnectSocialAccountDto disconnectDto)
    {
        var userId = GetCurrentUserId();
        
        // Check if user has permission to manage their social accounts
        var canManageSocialAccounts = await _rbacService.HasPermissionAsync(userId, "User", "ManageSocialAccounts");
        if (!canManageSocialAccounts)
        {
            return Forbid();
        }

        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            var success = await _userProfileService.DisconnectSocialAccountAsync(userId, disconnectDto);
            if (!success)
            {
                return this.StandardBadRequest("Failed to disconnect social account. Please check your password.");
            }

            return Ok(new { message = $"{disconnectDto.Provider} account disconnected successfully" });
        }
        catch (InvalidOperationException ex)
        {
            return this.StandardBadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error disconnecting social account for UserId: {UserId}, Provider: {Provider}",
                userId, disconnectDto.Provider);
            return this.StandardInternalError();
        }
    }

    // Admin endpoints for managing user profiles
    [HttpGet("{userId}")]
    public async Task<ActionResult<UserProfileDto>> GetUserProfile(Guid userId)
    {
        var currentUserId = GetCurrentUserId();
        
        // Check if user has admin permission to view other user profiles
        var canViewAnyProfile = await _rbacService.HasPermissionAsync(currentUserId, "User", "ViewAnyProfile");
        if (!canViewAnyProfile)
        {
            return Forbid();
        }

        var profile = await _userProfileService.GetUserProfileAsync(userId);
        if (profile == null)
        {
            return this.StandardNotFound("UserProfile", userId.ToString());
        }

        // Log the admin activity
        await _userProfileService.LogUserActivityAsync(
            currentUserId,
            "AdminProfileViewed", 
            $"Admin viewed profile for user {userId}",
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            HttpContext.Request.Headers.UserAgent);

        return Ok(profile);
    }

    [HttpGet("{userId}/activity-log")]
    public async Task<ActionResult<IEnumerable<UserActivityLogDto>>> GetUserActivityLog(
        Guid userId,
        [FromQuery] int skip = 0, 
        [FromQuery] int take = 20)
    {
        var currentUserId = GetCurrentUserId();
        
        // Check if user has admin permission to view other users' activity logs
        var canViewAnyActivityLog = await _rbacService.HasPermissionAsync(currentUserId, "User", "ViewAnyActivityLog");
        if (!canViewAnyActivityLog)
        {
            return Forbid();
        }

        // Validate pagination parameters
        if (skip < 0 || take < 1 || take > 100)
        {
            return this.StandardBadRequest("Invalid pagination parameters. Skip must be >= 0, take must be between 1 and 100.");
        }

        var activities = await _userProfileService.GetUserActivityLogAsync(userId, skip, take);
        
        // Log the admin activity
        await _userProfileService.LogUserActivityAsync(
            currentUserId, 
            "AdminActivityLogViewed", 
            $"Admin viewed activity log for user {userId}",
            HttpContext.Connection.RemoteIpAddress?.ToString(),
            HttpContext.Request.Headers.UserAgent);

        return Ok(activities);
    }

    [HttpPost("change-password")]
    public async Task<ActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            
            // Basic validation
            if (string.IsNullOrWhiteSpace(request.CurrentPassword) || string.IsNullOrWhiteSpace(request.NewPassword))
            {
                return this.StandardBadRequest("Current password and new password are required");
            }

            if (request.NewPassword.Length < 8)
            {
                return this.StandardBadRequest("New password must be at least 8 characters long");
            }

            if (request.NewPassword != request.ConfirmPassword)
            {
                return this.StandardBadRequest("New password and confirmation password must match");
            }

            // Check if user has permission to change their own password
            var canChangePassword = await _rbacService.HasPermissionAsync(userId, "User", "ChangePassword");
            if (!canChangePassword)
            {
                return Forbid();
            }

            var correlationId = HttpContext?.TraceIdentifier ?? Guid.NewGuid().ToString();
            var passwordChanged = await _passwordResetService.ChangePasswordAsync(
                userId,
                request.CurrentPassword,
                request.NewPassword,
                correlationId);

            if (!passwordChanged)
            {
                return this.StandardBadRequest("Failed to change password. Please verify your current password is correct.");
            }

            _logger.LogInformation("Password changed for user {UserId}", userId);
            
            // Log the activity
            await _userProfileService.LogUserActivityAsync(
                userId, 
                "PasswordChanged", 
                "User changed their password",
                HttpContext.Connection.RemoteIpAddress?.ToString(),
                HttpContext.Request.Headers.UserAgent);

            return Ok(new { message = "Password changed successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error changing password for user");
            return this.StandardInternalError();
        }
    }

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (!Guid.TryParse(userIdClaim, out var userId))
        {
            throw new UnauthorizedAccessException("Invalid user ID in token");
        }
        return userId;
    }
}

public class ChangePasswordRequest
{
    public string CurrentPassword { get; set; } = string.Empty;
    public string NewPassword { get; set; } = string.Empty;
    public string ConfirmPassword { get; set; } = string.Empty;
}
