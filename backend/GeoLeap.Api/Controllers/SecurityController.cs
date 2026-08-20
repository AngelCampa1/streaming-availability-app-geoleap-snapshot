using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using GeoLeap.Api.Services;
using GeoLeap.Api.Models;
using GeoLeap.Api.Extensions;
using System.Security.Claims;

namespace GeoLeap.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SecurityController : ControllerBase
{
    private readonly IAntiforgery _antiforgery;
    private readonly ISecurityService _securityService;
    private readonly ISessionManagementService _sessionManagementService;
    private readonly ILogger<SecurityController> _logger;
    private readonly UserManager<GeoLeap.Api.Models.User> _userManager;

    public SecurityController(
        IAntiforgery antiforgery,
        ISecurityService securityService,
        ISessionManagementService sessionManagementService,
        ILogger<SecurityController> logger,
        UserManager<GeoLeap.Api.Models.User> userManager)
    {
        _antiforgery = antiforgery;
        _securityService = securityService;
        _sessionManagementService = sessionManagementService;
        _logger = logger;
        _userManager = userManager;
    }

    [HttpGet("csrf-token")]
    [AllowAnonymous]
    public IActionResult GetCsrfToken()
    {
        // SECURITY: CSRF protection is enforced in ALL environments
        // Development bypass was removed to maintain consistent security posture

        // For mobile apps, we might use JWT tokens instead of CSRF tokens
        var userAgent = Request.Headers.UserAgent.ToString();
        var isMobileApp = userAgent.Contains("GeoLeapMobile") || userAgent.Contains("ReactNative");

        if (isMobileApp)
        {
            // Return a different response for mobile apps
            return Ok(new
            {
                authMethod = "bearer",
                message = "Mobile apps should use JWT authentication instead of CSRF tokens"
            });
        }

        try
        {
            // E2E Bug Fix: Ensure session is established for anonymous users
            if (string.IsNullOrEmpty(HttpContext.Session.Id))
            {
                HttpContext.Session.SetString("_csrf_init", "1");
            }

            var tokens = _antiforgery.GetAndStoreTokens(HttpContext);
            return Ok(new
            {
                token = tokens.RequestToken,
                headerName = "X-CSRF-TOKEN",
                authMethod = "csrf"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate CSRF token");
            return StatusCode(500, new { message = "Failed to generate security token. Please refresh the page." });
        }
    }

    [HttpGet("security-info")]
    public IActionResult GetSecurityInfo()
    {
        return Ok(new
        {
            timestamp = DateTimeOffset.UtcNow,
            securityHeaders = new
            {
                hsts = "enabled",
                csp = "enabled",
                xFrame = "DENY",
                xContentType = "nosniff"
            },
            rateLimiting = "enabled",
            sessionSecurity = "enabled"
        });
    }

    [HttpGet("sessions")]
    [Authorize]
    public async Task<ActionResult<IEnumerable<UserSessionDto>>> GetActiveSessions()
    {
        try
        {
            var userId = GetCurrentUserId();
            var sessions = await _sessionManagementService.GetActiveUserSessionsAsync(userId);
            
            var sessionDtos = sessions.Select(s => new UserSessionDto
            {
                Id = s.Id,
                DeviceName = s.DeviceName,
                OperatingSystem = s.OperatingSystem,
                Browser = s.Browser,
                Location = s.Location,
                IpAddress = s.IpAddress,
                CreatedAt = s.CreatedAt,
                LastAccessedAt = s.LastAccessedAt,
                IsCurrentSession = s.IsCurrentSession
            }).ToList();

            return Ok(sessionDtos);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving active sessions for user");
            return this.StandardInternalError();
        }
    }

    [HttpDelete("sessions/{sessionId}")]
    [Authorize]
    public async Task<ActionResult> RevokeSession(Guid sessionId)
    {
        try
        {
            var userId = GetCurrentUserId();
            var success = await _sessionManagementService.RevokeSessionAsync(sessionId, userId);
            
            if (!success)
            {
                return this.StandardNotFound("Session", sessionId.ToString());
            }

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error revoking session {SessionId}", sessionId);
            return this.StandardInternalError();
        }
    }

    [HttpDelete("sessions")]
    [Authorize]
    public async Task<ActionResult<RevokeAllSessionsResponse>> RevokeAllSessions()
    {
        try
        {
            var userId = GetCurrentUserId();
            var currentSessionId = GetCurrentSessionId();
            
            var revokedCount = await _sessionManagementService.RevokeAllUserSessionsAsync(userId, currentSessionId);
            
            return Ok(new RevokeAllSessionsResponse { RevokedSessionsCount = revokedCount });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error revoking all sessions for user");
            return this.StandardInternalError();
        }
    }

    [HttpGet("history")]
    [Authorize]
    public async Task<ActionResult<IEnumerable<SecurityEventDto>>> GetSecurityHistory([FromQuery] int skip = 0, [FromQuery] int take = 50)
    {
        try
        {
            var userId = GetCurrentUserId();
            var events = await _securityService.GetUserSecurityHistoryAsync(userId, skip, take);
            
            var eventDtos = events.Select(e => new SecurityEventDto
            {
                Id = e.Id,
                EventType = e.EventType,
                IpAddress = e.IpAddress,
                Location = e.Location,
                RiskScore = e.RiskScore,
                CreatedAt = e.CreatedAt,
                Details = e.Details
            }).ToList();

            return Ok(eventDtos);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving security history for user");
            return this.StandardInternalError();
        }
    }

    [HttpGet("preferences")]
    [Authorize]
    public async Task<ActionResult<SecurityPreferencesDto>> GetSecurityPreferences()
    {
        try
        {
            var userId = GetCurrentUserId();
            var preferences = await _securityService.GetUserSecurityPreferencesAsync(userId);
            
            var preferencesDto = new SecurityPreferencesDto
            {
                EmailSecurityAlerts = preferences.EmailSecurityAlerts,
                EmailLoginNotifications = preferences.EmailLoginNotifications,
                TwoFactorEnabled = preferences.TwoFactorEnabled,
                SecurityQuestionEnabled = preferences.SecurityQuestionEnabled
            };

            return Ok(preferencesDto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving security preferences for user");
            return this.StandardInternalError();
        }
    }

    [HttpPut("preferences")]
    [Authorize]
    public async Task<ActionResult<SecurityPreferencesDto>> UpdateSecurityPreferences([FromBody] UpdateSecurityPreferencesRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            
            var preferences = new SecurityPreferences
            {
                EmailSecurityAlerts = request.EmailSecurityAlerts,
                EmailLoginNotifications = request.EmailLoginNotifications,
                TwoFactorEnabled = request.TwoFactorEnabled,
                SecurityQuestionEnabled = request.SecurityQuestionEnabled
            };

            var updatedPreferences = await _securityService.UpdateUserSecurityPreferencesAsync(userId, preferences);
            
            // Log security event for preferences change
            await _securityService.LogSecurityEventAsync(userId, "SECURITY_PREFERENCES_CHANGED", 
                GetClientIpAddress(), GetUserAgent(), "Security preferences updated by user");

            var preferencesDto = new SecurityPreferencesDto
            {
                EmailSecurityAlerts = updatedPreferences.EmailSecurityAlerts,
                EmailLoginNotifications = updatedPreferences.EmailLoginNotifications,
                TwoFactorEnabled = updatedPreferences.TwoFactorEnabled,
                SecurityQuestionEnabled = updatedPreferences.SecurityQuestionEnabled
            };

            return Ok(preferencesDto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating security preferences for user");
            return this.StandardInternalError();
        }
    }

    [HttpGet("statistics")]
    [Authorize]
    public async Task<ActionResult<SessionStatisticsDto>> GetSessionStatistics()
    {
        try
        {
            var userId = GetCurrentUserId();
            var stats = await _sessionManagementService.GetUserSessionStatisticsAsync(userId);
            
            var statsDto = new SessionStatisticsDto
            {
                ActiveSessions = stats.ActiveSessions,
                TotalSessions = stats.TotalSessions,
                LastLoginAt = stats.LastLoginAt,
                LastLoginLocation = stats.LastLoginLocation,
                LastLoginDevice = stats.LastLoginDevice
            };

            return Ok(statsDto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving session statistics for user");
            return this.StandardInternalError();
        }
    }

    [HttpPost("export")]
    [Authorize]
    public async Task<ActionResult<DataExportResponse>> RequestDataExport()
    {
        try
        {
            var userId = GetCurrentUserId();
            
            // Log security event for data export request
            await _securityService.LogSecurityEventAsync(userId, "DATA_EXPORT_REQUESTED", 
                GetClientIpAddress(), GetUserAgent(), "User requested data export");

            return Ok(new DataExportResponse 
            { 
                Message = "Data export request received. You will receive an email with your data within 24 hours.",
                EstimatedDeliveryTime = DateTime.UtcNow.AddHours(24)
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing data export request for user");
            return this.StandardInternalError();
        }
    }

    [HttpDelete("account")]
    [Authorize]
    public async Task<ActionResult<AccountDeletionResponse>> RequestAccountDeletion([FromBody] AccountDeletionRequest request)
    {
        try
        {
            if (string.IsNullOrEmpty(request.Password))
            {
                return this.StandardBadRequest("Password confirmation is required for account deletion");
            }

            var userId = GetCurrentUserId();

            var user = await _userManager.FindByIdAsync(userId.ToString());
            if (user == null)
                return Unauthorized(new { message = "User not found." });
            var passwordValid = await _userManager.CheckPasswordAsync(user, request.Password);
            if (!passwordValid)
                return this.StandardBadRequest("Incorrect password. Account deletion cancelled.");

            // Log security event for account deletion request
            await _securityService.LogSecurityEventAsync(userId, "ACCOUNT_DELETION_REQUESTED",
                GetClientIpAddress(), GetUserAgent(), "User requested account deletion");

            return Ok(new AccountDeletionResponse 
            { 
                Message = "Account deletion scheduled. You have 7 days to cancel this request.",
                DeletionDate = DateTime.UtcNow.AddDays(7)
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing account deletion request for user");
            return this.StandardInternalError();
        }
    }

    private Guid GetCurrentUserId()
    {
        var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
        {
            throw new UnauthorizedAccessException("User ID not found in token");
        }
        return userId;
    }

    private Guid? GetCurrentSessionId()
    {
        var sessionIdString = User.FindFirst("session_id")?.Value;
        if (string.IsNullOrEmpty(sessionIdString) || !Guid.TryParse(sessionIdString, out var sessionId))
        {
            return null;
        }
        return sessionId;
    }

    private string GetClientIpAddress()
    {
        var forwardedFor = HttpContext.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrEmpty(forwardedFor))
        {
            // X-Forwarded-For can contain multiple IPs; take the first (original client)
            return forwardedFor.Split(',')[0].Trim();
        }
        return HttpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown";
    }

    private string GetUserAgent()
    {
        return HttpContext.Request.Headers["User-Agent"].FirstOrDefault() ?? "Unknown";
    }
}

// DTOs for API responses
public class UserSessionDto
{
    public Guid Id { get; set; }
    public string? DeviceName { get; set; }
    public string? OperatingSystem { get; set; }
    public string? Browser { get; set; }
    public string? Location { get; set; }
    public string? IpAddress { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime LastAccessedAt { get; set; }
    public bool IsCurrentSession { get; set; }
}

public class SecurityEventDto
{
    public Guid Id { get; set; }
    public string EventType { get; set; } = string.Empty;
    public string? IpAddress { get; set; }
    public string? Location { get; set; }
    public int RiskScore { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? Details { get; set; }
}

public class SecurityPreferencesDto
{
    public bool EmailSecurityAlerts { get; set; }
    public bool EmailLoginNotifications { get; set; }
    public bool TwoFactorEnabled { get; set; }
    public bool SecurityQuestionEnabled { get; set; }
}

public class UpdateSecurityPreferencesRequest
{
    public bool EmailSecurityAlerts { get; set; }
    public bool EmailLoginNotifications { get; set; }
    public bool TwoFactorEnabled { get; set; }
    public bool SecurityQuestionEnabled { get; set; }
}

public class SessionStatisticsDto
{
    public int ActiveSessions { get; set; }
    public int TotalSessions { get; set; }
    public DateTime? LastLoginAt { get; set; }
    public string? LastLoginLocation { get; set; }
    public string? LastLoginDevice { get; set; }
}

public class RevokeAllSessionsResponse
{
    public int RevokedSessionsCount { get; set; }
}

public class DataExportResponse
{
    public string Message { get; set; } = string.Empty;
    public DateTime EstimatedDeliveryTime { get; set; }
}

public class AccountDeletionRequest
{
    public string Password { get; set; } = string.Empty;
}

public class AccountDeletionResponse
{
    public string Message { get; set; } = string.Empty;
    public DateTime DeletionDate { get; set; }
}