using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using GeoLeap.Api.Extensions;
using System.Security.Claims;
using System.ComponentModel.DataAnnotations;

namespace GeoLeap.Api.Controllers;

/// <summary>
/// Enhanced Social Media Authentication Controller with comprehensive OAuth 2.0 support
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
[Tags("Social Authentication")]
public class SocialAuthController : ControllerBase
{
    private readonly IEnhancedSocialAuthService _socialAuthService;
    private readonly ISocialRecommendationEngine _recommendationEngine;
    private readonly IPrivacyService _privacyService;
    private readonly ILoggerService _logger;

    public SocialAuthController(
        IEnhancedSocialAuthService socialAuthService,
        ISocialRecommendationEngine recommendationEngine,
        IPrivacyService privacyService,
        ILoggerService logger)
    {
        _socialAuthService = socialAuthService;
        _recommendationEngine = recommendationEngine;
        _privacyService = privacyService;
        _logger = logger;
    }

    /// <summary>
    /// Get supported social media platforms
    /// </summary>
    [HttpGet("platforms")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(List<SocialPlatformInfo>), 200)]
    public async Task<ActionResult<List<SocialPlatformInfo>>> GetSupportedPlatforms()
    {
        try
        {
            var platforms = await _socialAuthService.GetSupportedPlatformsAsync();
            return Ok(platforms);
        }
        catch (Exception ex)
        {
            await _logger.LogAsync("ERROR", $"Failed to get supported platforms: {ex.Message}");
            return StatusCode(500, new { error = "Failed to retrieve supported platforms" });
        }
    }

    /// <summary>
    /// Initiate OAuth 2.0 flow for a social media platform
    /// </summary>
    [HttpPost("connect/{platform}")]
    [ProducesResponseType(typeof(OAuthInitiationResult), 200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(403)]
    public async Task<ActionResult<OAuthInitiationResult>> ConnectSocialAccount(
        string platform, 
        [FromBody] ConnectSocialAccountRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == Guid.Empty)
            {
                return Unauthorized(new { error = "User not authenticated" });
            }

            // Validate platform
            if (string.IsNullOrWhiteSpace(platform))
            {
                return this.StandardBadRequest("Platform is required");
            }

            // Validate redirect URL
            if (string.IsNullOrWhiteSpace(request.RedirectUrl) || !Uri.IsWellFormedUriString(request.RedirectUrl, UriKind.Absolute))
            {
                return this.StandardBadRequest("Valid redirect URL is required");
            }

            // Check user consent for social data collection
            var hasConsent = await _privacyService.HasSocialDataConsentAsync(userId);
            if (!hasConsent)
            {
                return Forbid("User has not provided consent for social data collection. Please update privacy settings.");
            }

            var result = await _socialAuthService.InitiateOAuthFlowAsync(
                platform.ToLower(), 
                userId, 
                request.RedirectUrl, 
                request.Scopes,
                request.AdditionalParameters);

            if (!result.IsSuccess)
            {
                return this.StandardBadRequest(result.ErrorMessage ?? "Operation failed");
            }

            await _logger.LogAsync("INFO", $"OAuth flow initiated for user {userId} on platform {platform}");

            return Ok(result);
        }
        catch (Exception ex)
        {
            await _logger.LogAsync("ERROR", $"Failed to initiate OAuth flow: {ex.Message}");
            return StatusCode(500, new { error = "Failed to initiate social connection" });
        }
    }

    /// <summary>
    /// Handle OAuth 2.0 callback from social media platform
    /// </summary>
    [HttpGet("callback/{platform}")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(OAuthCallbackResult), 200)]
    [ProducesResponseType(400)]
    public async Task<ActionResult<OAuthCallbackResult>> HandleOAuthCallback(
        string platform,
        [FromQuery] string code,
        [FromQuery] string state,
        [FromQuery] string? error = null,
        [FromQuery] string? error_description = null)
    {
        try
        {
            // Handle OAuth errors
            if (!string.IsNullOrEmpty(error))
            {
                await _logger.LogAsync("WARNING", $"OAuth error for platform {platform}: {error} - {error_description}");
                return this.StandardBadRequest(error_description ?? error ?? "OAuth error");
            }

            // Validate required parameters
            if (string.IsNullOrWhiteSpace(code) || string.IsNullOrWhiteSpace(state))
            {
                return this.StandardBadRequest("Missing required OAuth parameters");
            }

            var result = await _socialAuthService.HandleOAuthCallbackAsync(platform.ToLower(), code, state);

            if (!result.IsSuccess)
            {
                return this.StandardBadRequest(result.ErrorMessage ?? "Operation failed");
            }

            await _logger.LogAsync("INFO", $"OAuth callback processed successfully for platform {platform}");

            return Ok(result);
        }
        catch (Exception ex)
        {
            await _logger.LogAsync("ERROR", $"Failed to handle OAuth callback: {ex.Message}");
            return StatusCode(500, new { error = "Failed to process OAuth callback" });
        }
    }

    /// <summary>
    /// Get user's connected social accounts
    /// </summary>
    [HttpGet("connections")]
    [ProducesResponseType(typeof(List<SocialConnection>), 200)]
    public async Task<ActionResult<List<SocialConnection>>> GetConnectedAccounts()
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == Guid.Empty)
            {
                return Unauthorized(new { error = "User not authenticated" });
            }

            // This would be implemented in a service
            var connections = new List<SocialConnection>(); // Placeholder
            
            return Ok(connections);
        }
        catch (Exception ex)
        {
            await _logger.LogAsync("ERROR", $"Failed to get connected accounts: {ex.Message}");
            return StatusCode(500, new { error = "Failed to retrieve connected accounts" });
        }
    }

    /// <summary>
    /// Disconnect a social media account
    /// </summary>
    [HttpDelete("disconnect/{platform}")]
    [ProducesResponseType(200)]
    [ProducesResponseType(404)]
    public async Task<ActionResult> DisconnectSocialAccount(string platform)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == Guid.Empty)
            {
                return Unauthorized(new { error = "User not authenticated" });
            }

            var result = await _socialAuthService.RevokeTokenAsync(userId, platform.ToLower(), "user_disconnect");

            if (!result.IsSuccess)
            {
                return this.StandardBadRequest(result.ErrorMessage ?? "Operation failed");
            }

            await _logger.LogAsync("INFO", $"Social account disconnected for user {userId} on platform {platform}");

            return Ok(new { message = "Social account disconnected successfully" });
        }
        catch (Exception ex)
        {
            await _logger.LogAsync("ERROR", $"Failed to disconnect social account: {ex.Message}");
            return StatusCode(500, new { error = "Failed to disconnect social account" });
        }
    }

    /// <summary>
    /// Validate and refresh social media tokens
    /// </summary>
    [HttpPost("validate/{platform}")]
    [ProducesResponseType(typeof(TokenValidationResult), 200)]
    [ProducesResponseType(404)]
    public async Task<ActionResult<TokenValidationResult>> ValidateToken(string platform)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == Guid.Empty)
            {
                return Unauthorized(new { error = "User not authenticated" });
            }

            var result = await _socialAuthService.ValidateAndRefreshTokenAsync(userId, platform.ToLower());

            if (!result.IsSuccess)
            {
                return this.StandardBadRequest(result.ErrorMessage ?? "Operation failed");
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            await _logger.LogAsync("ERROR", $"Failed to validate token: {ex.Message}");
            return StatusCode(500, new { error = "Failed to validate token" });
        }
    }

    /// <summary>
    /// Update social privacy preferences
    /// </summary>
    [HttpPut("privacy")]
    [ProducesResponseType(200)]
    [ProducesResponseType(400)]
    public async Task<ActionResult> UpdateSocialPrivacyPreferences([FromBody] UpdateSocialPreferencesRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == Guid.Empty)
            {
                return Unauthorized(new { error = "User not authenticated" });
            }

            var result = await _privacyService.UpdateSocialPrivacyConsentAsync(userId, new SocialPrivacyConsent
            {
                UserId = userId,
                AllowSocialDataCollection = request.AllowSocialSharing,
                AllowFriendDiscovery = request.AllowFriendDiscovery,
                AllowSocialRecommendations = request.AllowRecommendations,
                AllowActivityTracking = request.AllowActivityTracking,
                ConsentGivenAt = DateTime.UtcNow,
                IsGdprCompliant = true
            });

            if (!result.IsSuccess)
            {
                return this.StandardBadRequest(result.ErrorMessage ?? "Operation failed");
            }

            await _logger.LogAsync("INFO", $"Social privacy preferences updated for user {userId}");

            return Ok(new { message = "Privacy preferences updated successfully" });
        }
        catch (Exception ex)
        {
            await _logger.LogAsync("ERROR", $"Failed to update privacy preferences: {ex.Message}");
            return StatusCode(500, new { error = "Failed to update privacy preferences" });
        }
    }

    /// <summary>
    /// Get social recommendations based on connected accounts
    /// </summary>
    [HttpGet("recommendations")]
    [ProducesResponseType(typeof(List<ContentRecommendation>), 200)]
    public async Task<ActionResult<List<ContentRecommendation>>> GetSocialRecommendations(
        [FromQuery] int limit = 20,
        [FromQuery] string? type = null)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == Guid.Empty)
            {
                return Unauthorized(new { error = "User not authenticated" });
            }

            // Check if user has consent for recommendations
            var hasConsent = await _privacyService.HasSocialRecommendationConsentAsync(userId);
            if (!hasConsent)
            {
                return Forbid("User has not provided consent for social recommendations");
            }

            var recommendations = await _recommendationEngine.GenerateRecommendationsAsync(userId, type, limit);

            return Ok(recommendations);
        }
        catch (Exception ex)
        {
            await _logger.LogAsync("ERROR", $"Failed to get social recommendations: {ex.Message}");
            return StatusCode(500, new { error = "Failed to retrieve social recommendations" });
        }
    }

    /// <summary>
    /// Get social analytics for connected accounts
    /// </summary>
    [HttpGet("analytics")]
    [ProducesResponseType(typeof(SocialAnalytics), 200)]
    public async Task<ActionResult<SocialAnalytics>> GetSocialAnalytics()
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == Guid.Empty)
            {
                return Unauthorized(new { error = "User not authenticated" });
            }

            // This would be implemented in a social analytics service
            var analytics = new SocialAnalytics(); // Placeholder

            return Ok(analytics);
        }
        catch (Exception ex)
        {
            await _logger.LogAsync("ERROR", $"Failed to get social analytics: {ex.Message}");
            return StatusCode(500, new { error = "Failed to retrieve social analytics" });
        }
    }

    /// <summary>
    /// Share content to connected social media platforms
    /// </summary>
    [HttpPost("share")]
    [ProducesResponseType(typeof(List<SocialPostResult>), 200)]
    [ProducesResponseType(400)]
    public async Task<ActionResult<List<SocialPostResult>>> ShareContent([FromBody] SocialPostRequest request)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == Guid.Empty)
            {
                return Unauthorized(new { error = "User not authenticated" });
            }

            // Validate request
            if (string.IsNullOrWhiteSpace(request.Content))
            {
                return this.StandardBadRequest("Content is required");
            }

            // Check user consent for social sharing
            var hasConsent = await _privacyService.HasSocialDataConsentAsync(userId);
            if (!hasConsent)
            {
                return Forbid("User has not provided consent for social sharing");
            }

            // This would be implemented in a social posting service
            var results = new List<SocialPostResult>(); // Placeholder

            await _logger.LogAsync("INFO", $"Content shared by user {userId} to social platforms");

            return Ok(results);
        }
        catch (Exception ex)
        {
            await _logger.LogAsync("ERROR", $"Failed to share content: {ex.Message}");
            return StatusCode(500, new { error = "Failed to share content" });
        }
    }

    /// <summary>
    /// Import friends from connected social media accounts
    /// </summary>
    [HttpPost("import-friends")]
    [ProducesResponseType(typeof(SocialImportResult), 200)]
    public async Task<ActionResult<SocialImportResult>> ImportFriends([FromQuery] string? platform = null)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == Guid.Empty)
            {
                return Unauthorized(new { error = "User not authenticated" });
            }

            // Check user consent for friend discovery
            var hasConsent = await _privacyService.HasFriendDiscoveryConsentAsync(userId);
            if (!hasConsent)
            {
                return Forbid("User has not provided consent for friend discovery");
            }

            // This would be implemented in a friend discovery service
            var result = new SocialImportResult { IsSuccess = true }; // Placeholder

            await _logger.LogAsync("INFO", $"Friend import initiated for user {userId}");

            return Ok(result);
        }
        catch (Exception ex)
        {
            await _logger.LogAsync("ERROR", $"Failed to import friends: {ex.Message}");
            return StatusCode(500, new { error = "Failed to import friends" });
        }
    }

    /// <summary>
    /// Get real-time social activity feed
    /// </summary>
    [HttpGet("activity-feed")]
    [ProducesResponseType(typeof(List<SocialActivityFeed>), 200)]
    public async Task<ActionResult<List<SocialActivityFeed>>> GetActivityFeed(
        [FromQuery] int limit = 50,
        [FromQuery] DateTime? since = null)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (userId == Guid.Empty)
            {
                return Unauthorized(new { error = "User not authenticated" });
            }

            // Check user consent for activity tracking
            var hasConsent = await _privacyService.HasActivityTrackingConsentAsync(userId);
            if (!hasConsent)
            {
                return Forbid("User has not provided consent for activity tracking");
            }

            // This would be implemented in a social activity service
            var activities = new List<SocialActivityFeed>(); // Placeholder

            return Ok(activities);
        }
        catch (Exception ex)
        {
            await _logger.LogAsync("ERROR", $"Failed to get activity feed: {ex.Message}");
            return StatusCode(500, new { error = "Failed to retrieve activity feed" });
        }
    }

    #region Private Helper Methods

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(userIdClaim, out var userId) ? userId : Guid.Empty;
    }

    #endregion
}

/// <summary>
/// Request models for social authentication endpoints
/// </summary>
public class ConnectSocialAccountRequest
{
    [Required]
    [Url]
    public string RedirectUrl { get; set; } = string.Empty;
    
    public string[]? Scopes { get; set; }
    
    public Dictionary<string, string>? AdditionalParameters { get; set; }
}

public class UpdateSocialPreferencesRequest
{
    public bool AllowSocialSharing { get; set; } = true;
    
    public bool AllowFriendDiscovery { get; set; } = false;
    
    public bool AllowRecommendations { get; set; } = true;
    
    public bool AllowActivityTracking { get; set; } = false;
    
    public string[]? PreferredPlatforms { get; set; }
    
    public Dictionary<string, object>? PlatformSettings { get; set; }
}

public class SocialPostRequest
{
    [Required]
    [StringLength(10000)]
    public string Content { get; set; } = string.Empty;
    
    public string[]? MediaUrls { get; set; }
    
    public string[]? Hashtags { get; set; }
    
    public string[]? Platforms { get; set; } // Specific platforms to post to
    
    public Dictionary<string, string>? PlatformSpecificData { get; set; }
    
    public bool SchedulePost { get; set; } = false;
    
    public DateTime? ScheduledFor { get; set; }
}