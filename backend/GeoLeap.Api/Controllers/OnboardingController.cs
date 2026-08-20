using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GeoLeap.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class OnboardingController : ControllerBase
{
    private readonly IOnboardingService _onboardingService;
    private readonly IRbacService _rbacService;
    private readonly ILogger<OnboardingController> _logger;

    public OnboardingController(
        IOnboardingService onboardingService,
        IRbacService rbacService,
        ILogger<OnboardingController> logger)
    {
        _onboardingService = onboardingService;
        _rbacService = rbacService;
        _logger = logger;
    }

    [HttpGet("status")]
    public async Task<ActionResult<OnboardingStatusResponse>> GetStatus()
    {
        try
        {
            var userId = GetUserId();
            if (!await _rbacService.HasPermissionAsync(userId, "onboarding", "read"))
            {
                return Forbid();
            }

            var status = await _onboardingService.GetOnboardingStatusAsync(userId);
            return Ok(status);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting onboarding status for user {UserId}", GetUserId());
            return StatusCode(500, "An error occurred while getting onboarding status");
        }
    }

    [HttpPost("start")]
    public async Task<ActionResult<OnboardingStatusResponse>> Start([FromBody] StartOnboardingRequest request)
    {
        try
        {
            var userId = GetUserId();
            if (!await _rbacService.HasPermissionAsync(userId, "onboarding", "create"))
            {
                return Forbid();
            }

            var result = await _onboardingService.StartOnboardingAsync(userId, request);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error starting onboarding for user {UserId}", GetUserId());
            return StatusCode(500, "An error occurred while starting onboarding");
        }
    }

    [HttpPut("step")]
    public async Task<ActionResult<OnboardingStatusResponse>> UpdateStep([FromBody] UpdateOnboardingStepRequest request)
    {
        try
        {
            var userId = GetUserId();
            if (!await _rbacService.HasPermissionAsync(userId, "onboarding", "update"))
            {
                return Forbid();
            }

            var result = await _onboardingService.UpdateStepAsync(userId, request);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating onboarding step for user {UserId}", GetUserId());
            return StatusCode(500, "An error occurred while updating onboarding step");
        }
    }

    [HttpPost("streaming-services")]
    public async Task<ActionResult<OnboardingStatusResponse>> AddStreamingServices([FromBody] AddStreamingServicesRequest request)
    {
        try
        {
            var userId = GetUserId();
            if (!await _rbacService.HasPermissionAsync(userId, "onboarding", "update"))
            {
                return Forbid();
            }

            var result = await _onboardingService.AddStreamingServicesAsync(userId, request);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding streaming services for user {UserId}", GetUserId());
            return StatusCode(500, "An error occurred while adding streaming services");
        }
    }

    [HttpDelete("streaming-services")]
    public async Task<ActionResult<bool>> RemoveStreamingService([FromBody] RemoveStreamingServiceRequest request)
    {
        try
        {
            var userId = GetUserId();
            if (!await _rbacService.HasPermissionAsync(userId, "onboarding", "update"))
            {
                return Forbid();
            }

            var result = await _onboardingService.RemoveStreamingServiceAsync(userId, request);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing streaming service for user {UserId}", GetUserId());
            return StatusCode(500, "An error occurred while removing streaming service");
        }
    }

    [HttpPost("region-preferences")]
    public async Task<ActionResult<OnboardingStatusResponse>> AddRegionPreferences([FromBody] AddRegionPreferencesRequest request)
    {
        try
        {
            var userId = GetUserId();
            if (!await _rbacService.HasPermissionAsync(userId, "onboarding", "update"))
            {
                return Forbid();
            }

            var result = await _onboardingService.AddRegionPreferencesAsync(userId, request);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding region preferences for user {UserId}", GetUserId());
            return StatusCode(500, "An error occurred while adding region preferences");
        }
    }

    [HttpPost("content-preferences")]
    public async Task<ActionResult<OnboardingStatusResponse>> AddContentPreferences([FromBody] AddContentPreferencesRequest request)
    {
        try
        {
            var userId = GetUserId();
            if (!await _rbacService.HasPermissionAsync(userId, "onboarding", "update"))
            {
                return Forbid();
            }

            var result = await _onboardingService.AddContentPreferencesAsync(userId, request);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding content preferences for user {UserId}", GetUserId());
            return StatusCode(500, "An error occurred while adding content preferences");
        }
    }

    [HttpPost("complete")]
    public async Task<ActionResult<OnboardingStatusResponse>> Complete([FromBody] CompleteOnboardingRequest request)
    {
        try
        {
            var userId = GetUserId();
            if (!await _rbacService.HasPermissionAsync(userId, "onboarding", "update"))
            {
                return Forbid();
            }

            var result = await _onboardingService.CompleteOnboardingAsync(userId, request);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error completing onboarding for user {UserId}", GetUserId());
            return StatusCode(500, "An error occurred while completing onboarding");
        }
    }

    [HttpPost("skip")]
    public async Task<ActionResult<OnboardingStatusResponse>> Skip([FromBody] SkipOnboardingRequest request)
    {
        try
        {
            var userId = GetUserId();
            if (!await _rbacService.HasPermissionAsync(userId, "onboarding", "update"))
            {
                return Forbid();
            }

            var result = await _onboardingService.SkipOnboardingAsync(userId, request);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error skipping onboarding for user {UserId}", GetUserId());
            return StatusCode(500, "An error occurred while skipping onboarding");
        }
    }

    [HttpGet("progress")]
    public async Task<ActionResult<OnboardingProgressResponse>> GetProgress()
    {
        try
        {
            var userId = GetUserId();
            if (!await _rbacService.HasPermissionAsync(userId, "onboarding", "read"))
            {
                return Forbid();
            }

            var progress = await _onboardingService.GetProgressAsync(userId);
            return Ok(progress);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting onboarding progress for user {UserId}", GetUserId());
            return StatusCode(500, "An error occurred while getting onboarding progress");
        }
    }

    [HttpGet("popular-services")]
    [AllowAnonymous] // Public endpoint for popular streaming services
    public async Task<ActionResult<PopularServicesResponse>> GetPopularServices()
    {
        try
        {
            // This endpoint doesn't require specific user permissions as it's general data
            var services = await _onboardingService.GetPopularServicesAsync();
            return Ok(services);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting popular services");
            return StatusCode(500, "An error occurred while getting popular services");
        }
    }

    [HttpGet("personalization")]
    public async Task<ActionResult<PersonalizationPreferencesResponse>> GetPersonalizationPreferences()
    {
        try
        {
            var userId = GetUserId();
            if (!await _rbacService.HasPermissionAsync(userId, "onboarding", "read"))
            {
                return Forbid();
            }

            var preferences = await _onboardingService.GetPersonalizationPreferencesAsync(userId);
            return Ok(preferences);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting personalization preferences for user {UserId}", GetUserId());
            return StatusCode(500, "An error occurred while getting personalization preferences");
        }
    }

    [HttpPost("analytics")]
    public async Task<ActionResult<bool>> TrackAnalyticsEvent([FromBody] OnboardingAnalyticsRequest request)
    {
        try
        {
            var userId = GetUserId();
            if (!await _rbacService.HasPermissionAsync(userId, "onboarding", "create"))
            {
                return Forbid();
            }

            var result = await _onboardingService.TrackAnalyticsEventAsync(userId, request);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error tracking analytics event for user {UserId}", GetUserId());
            return StatusCode(500, "An error occurred while tracking analytics event");
        }
    }

    [HttpPost("reset")]
    public async Task<ActionResult<bool>> Reset()
    {
        try
        {
            var userId = GetUserId();
            if (!await _rbacService.HasPermissionAsync(userId, "onboarding", "update"))
            {
                return Forbid();
            }

            var result = await _onboardingService.ResetOnboardingAsync(userId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error resetting onboarding for user {UserId}", GetUserId());
            return StatusCode(500, "An error occurred while resetting onboarding");
        }
    }

    private Guid GetUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            throw new UnauthorizedAccessException("User ID not found in token");
        }
        return userId;
    }
}