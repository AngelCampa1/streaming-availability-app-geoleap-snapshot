using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using System.Security.Claims;
using GeoLeap.Api.Services;
using GeoLeap.Api.Models;
using GeoLeap.Api.Extensions;
using GeoLeap.Api.Data.Entities;

namespace GeoLeap.Api.Controllers;

/// <summary>
/// Controller for managing user's streaming service subscriptions
/// Used for VPN-based content access feature
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
[EnableRateLimiting("ContentPolicy")]
public class UserSubscriptionsController : ControllerBase
{
    private readonly IUserStreamingSubscriptionService _subscriptionService;
    private readonly ILogger<UserSubscriptionsController> _logger;

    public UserSubscriptionsController(
        IUserStreamingSubscriptionService subscriptionService,
        ILogger<UserSubscriptionsController> logger)
    {
        _subscriptionService = subscriptionService;
        _logger = logger;
    }

    /// <summary>
    /// Get all active streaming subscriptions for the authenticated user
    /// </summary>
    [HttpGet]
    [Produces("application/json")]
    public async Task<ActionResult<List<UserStreamingSubscription>>> GetUserSubscriptions(
        CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = GetUserId();
            if (userId == Guid.Empty)
            {
                return Unauthorized(new { message = "User not authenticated" });
            }

            var subscriptions = await _subscriptionService.GetUserSubscriptionsAsync(userId, cancellationToken);

            _logger.LogInformation("Retrieved {Count} subscriptions for user {UserId}", subscriptions.Count, userId);

            return Ok(subscriptions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting user subscriptions");
            return StatusCode(500, new { message = "An error occurred while getting subscriptions" });
        }
    }

    /// <summary>
    /// Get a specific subscription by service ID
    /// </summary>
    [HttpGet("{serviceId}")]
    [Produces("application/json")]
    public async Task<ActionResult<UserStreamingSubscription>> GetSubscription(
        string serviceId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = GetUserId();
            if (userId == Guid.Empty)
            {
                return Unauthorized(new { message = "User not authenticated" });
            }

            var subscription = await _subscriptionService.GetSubscriptionAsync(userId, serviceId, cancellationToken);

            if (subscription == null)
            {
                return NotFound(new { message = $"Subscription for service '{serviceId}' not found" });
            }

            return Ok(subscription);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting subscription for service {ServiceId}", serviceId);
            return StatusCode(500, new { message = "An error occurred while getting subscription" });
        }
    }

    /// <summary>
    /// Add a new streaming service subscription
    /// </summary>
    [HttpPost]
    [Produces("application/json")]
    public async Task<ActionResult<UserStreamingSubscription>> AddSubscription(
        [FromBody] AddStreamingSubscriptionRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = GetUserId();
            if (userId == Guid.Empty)
            {
                return Unauthorized(new { message = "User not authenticated" });
            }

            // Validate request
            if (string.IsNullOrWhiteSpace(request.ServiceId))
            {
                return this.StandardBadRequest("ServiceId is required");
            }

            if (string.IsNullOrWhiteSpace(request.ServiceName))
            {
                return this.StandardBadRequest("ServiceName is required");
            }

            var subscription = await _subscriptionService.AddSubscriptionAsync(
                userId,
                request.ServiceId.ToLowerInvariant(),
                request.ServiceName,
                request.SubscriptionTier,
                null, // notes - can be added later if needed
                cancellationToken);

            _logger.LogInformation("Added subscription {ServiceId} for user {UserId}", request.ServiceId, userId);

            return CreatedAtAction(
                nameof(GetSubscription),
                new { serviceId = subscription.ServiceId },
                subscription);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding subscription");
            return StatusCode(500, new { message = "An error occurred while adding subscription" });
        }
    }

    /// <summary>
    /// Update an existing subscription (e.g., change tier)
    /// </summary>
    [HttpPut("{serviceId}")]
    [Produces("application/json")]
    public async Task<ActionResult<UserStreamingSubscription>> UpdateSubscription(
        string serviceId,
        [FromBody] UpdateStreamingSubscriptionRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = GetUserId();
            if (userId == Guid.Empty)
            {
                return Unauthorized(new { message = "User not authenticated" });
            }

            var subscription = await _subscriptionService.UpdateSubscriptionAsync(
                userId,
                serviceId.ToLowerInvariant(),
                request.SubscriptionTier,
                request.Notes,
                cancellationToken);

            if (subscription == null)
            {
                return NotFound(new { message = $"Subscription for service '{serviceId}' not found" });
            }

            _logger.LogInformation("Updated subscription {ServiceId} for user {UserId}", serviceId, userId);

            return Ok(subscription);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating subscription for service {ServiceId}", serviceId);
            return StatusCode(500, new { message = "An error occurred while updating subscription" });
        }
    }

    /// <summary>
    /// Remove a streaming service subscription (soft delete)
    /// </summary>
    [HttpDelete("{serviceId}")]
    [Produces("application/json")]
    public async Task<ActionResult> RemoveSubscription(
        string serviceId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = GetUserId();
            if (userId == Guid.Empty)
            {
                return Unauthorized(new { message = "User not authenticated" });
            }

            var success = await _subscriptionService.RemoveSubscriptionAsync(
                userId,
                serviceId.ToLowerInvariant(),
                cancellationToken);

            if (!success)
            {
                return NotFound(new { message = $"Subscription for service '{serviceId}' not found" });
            }

            _logger.LogInformation("Removed subscription {ServiceId} for user {UserId}", serviceId, userId);

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing subscription for service {ServiceId}", serviceId);
            return StatusCode(500, new { message = "An error occurred while removing subscription" });
        }
    }

    /// <summary>
    /// Check if user has a specific subscription
    /// </summary>
    [HttpGet("{serviceId}/check")]
    [Produces("application/json")]
    public async Task<ActionResult<bool>> HasSubscription(
        string serviceId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = GetUserId();
            if (userId == Guid.Empty)
            {
                return Unauthorized(new { message = "User not authenticated" });
            }

            var hasSubscription = await _subscriptionService.HasSubscriptionAsync(
                userId,
                serviceId.ToLowerInvariant(),
                cancellationToken);

            return Ok(new { serviceId, hasSubscription });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking subscription for service {ServiceId}", serviceId);
            return StatusCode(500, new { message = "An error occurred while checking subscription" });
        }
    }

    /// <summary>
    /// Get list of service IDs for user's active subscriptions
    /// Useful for quick checks without full subscription details
    /// </summary>
    [HttpGet("service-ids")]
    [Produces("application/json")]
    public async Task<ActionResult<List<string>>> GetUserServiceIds(
        CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = GetUserId();
            if (userId == Guid.Empty)
            {
                return Unauthorized(new { message = "User not authenticated" });
            }

            var serviceIds = await _subscriptionService.GetUserServiceIdsAsync(userId, cancellationToken);

            return Ok(serviceIds);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting user service IDs");
            return StatusCode(500, new { message = "An error occurred while getting service IDs" });
        }
    }

    /// <summary>
    /// Helper method to extract user ID from claims
    /// </summary>
    private Guid GetUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
            ?? User.FindFirst("sub")?.Value
            ?? User.FindFirst("userId")?.Value;

        if (Guid.TryParse(userIdClaim, out var userId))
        {
            return userId;
        }

        _logger.LogWarning("Could not parse user ID from claims");
        return Guid.Empty;
    }
}
