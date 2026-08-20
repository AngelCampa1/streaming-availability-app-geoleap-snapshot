using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using GeoLeap.Api.Services;
using GeoLeap.Api.Models;
using GeoLeap.Api.Data;
using GeoLeap.Api.Middleware;
using System.Security.Claims;
using System.ComponentModel.DataAnnotations;
using Stripe;

namespace GeoLeap.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class SubscriptionController : ControllerBase
{
    private readonly ISubscriptionService _subscriptionService;
    private readonly ILogger<SubscriptionController> _logger;
    private readonly ApplicationDbContext _dbContext;

    public SubscriptionController(ISubscriptionService subscriptionService, ILogger<SubscriptionController> logger, ApplicationDbContext dbContext)
    {
        _subscriptionService = subscriptionService;
        _logger = logger;
        _dbContext = dbContext;
    }

    [HttpGet("current")]
    public async Task<ActionResult<SubscriptionDto?>> GetCurrentSubscription()
    {
        var correlationId = GetCorrelationId();
        try
        {
            var userId = GetUserId();

            _logger.LogInformation("Getting current subscription for user {UserId}", userId);

            var subscription = await _subscriptionService.GetUserActiveSubscriptionAsync(userId);
            return Ok(subscription);
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized(ErrorResponseFactory.CreateUnauthorizedError(correlationId, Request.Path, correlationId));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting current subscription");
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "Failed to retrieve subscription information", correlationId));
        }
    }

    [HttpGet("history")]
    public async Task<ActionResult<List<SubscriptionDto>>> GetSubscriptionHistory()
    {
        var correlationId = GetCorrelationId();
        try
        {
            var userId = GetUserId();

            _logger.LogInformation("Getting subscription history for user {UserId}", userId);

            var history = await _subscriptionService.GetUserSubscriptionHistoryAsync(userId);
            return Ok(history);
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized(ErrorResponseFactory.CreateUnauthorizedError(correlationId, Request.Path, correlationId));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting subscription history");
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "Failed to retrieve subscription history", correlationId));
        }
    }

    [HttpPost("create")]
    public async Task<ActionResult<SubscriptionDto>> CreateSubscription([FromBody] CreateSubscriptionRequest request)
    {
        var correlationId = GetCorrelationId();
        try
        {
            var userId = GetUserId();

            _logger.LogInformation("Creating subscription for user {UserId}", userId);

            if (request == null)
                return BadRequest(ErrorResponseFactory.CreateBadRequestError(correlationId, Request.Path, "Invalid subscription request", correlationId));

            if (!ModelState.IsValid)
            {
                var validationErrors = ModelState
                    .Where(x => x.Value?.Errors.Count > 0)
                    .ToDictionary(x => x.Key, x => x.Value!.Errors.Select(e => e.ErrorMessage).ToArray());
                return BadRequest(ErrorResponseFactory.CreateValidationError(correlationId, Request.Path, validationErrors, correlationId));
            }

            var subscription = await _subscriptionService.CreateSubscriptionAsync(userId, request, correlationId);
            return CreatedAtAction(nameof(GetCurrentSubscription), new { }, subscription);
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized(ErrorResponseFactory.CreateUnauthorizedError(correlationId, Request.Path, correlationId));
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Invalid subscription creation request");
            return BadRequest(ErrorResponseFactory.CreateBadRequestError(correlationId, Request.Path, ex.Message, correlationId));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating subscription");
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "Failed to create subscription", correlationId));
        }
    }

    [HttpPost("{subscriptionId:guid}/cancel")]
    public async Task<ActionResult<SubscriptionDto>> CancelSubscription(Guid subscriptionId)
    {
        var correlationId = GetCorrelationId();
        try
        {
            var userId = GetUserId();

            _logger.LogInformation("Canceling subscription {SubscriptionId} for user {UserId}", subscriptionId, userId);

            var subscription = await _subscriptionService.CancelSubscriptionAsync(userId, subscriptionId, correlationId);
            return Ok(subscription);
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized(ErrorResponseFactory.CreateUnauthorizedError(correlationId, Request.Path, correlationId));
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Invalid subscription cancellation request");
            return NotFound(ErrorResponseFactory.CreateNotFoundError(correlationId, Request.Path, "Subscription", subscriptionId.ToString(), correlationId));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error canceling subscription {SubscriptionId}", subscriptionId);
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "Failed to cancel subscription", correlationId));
        }
    }

    [HttpPost("{subscriptionId:guid}/reactivate")]
    public async Task<ActionResult<SubscriptionDto>> ReactivateSubscription(Guid subscriptionId)
    {
        var correlationId = GetCorrelationId();
        try
        {
            var userId = GetUserId();

            _logger.LogInformation("Reactivating subscription {SubscriptionId} for user {UserId}", subscriptionId, userId);

            var subscription = await _subscriptionService.ReactivateSubscriptionAsync(userId, subscriptionId, correlationId);
            return Ok(subscription);
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized(ErrorResponseFactory.CreateUnauthorizedError(correlationId, Request.Path, correlationId));
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Invalid subscription reactivation request");
            return BadRequest(ErrorResponseFactory.CreateBadRequestError(correlationId, Request.Path, ex.Message, correlationId));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error reactivating subscription {SubscriptionId}", subscriptionId);
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "Failed to reactivate subscription", correlationId));
        }
    }

    [HttpPost("{subscriptionId:guid}/change-plan")]
    public async Task<ActionResult<SubscriptionDto>> ChangePlan(Guid subscriptionId, [FromBody] ChangePlanRequest request)
    {
        var correlationId = GetCorrelationId();
        try
        {
            var userId = GetUserId();

            if (request == null)
                return BadRequest(ErrorResponseFactory.CreateBadRequestError(correlationId, Request.Path, "Invalid plan change request", correlationId));

            if (string.IsNullOrWhiteSpace(request.NewPriceId))
            {
                var validationErrors = new Dictionary<string, string[]> { { "NewPriceId", new[] { "New price ID is required" } } };
                return BadRequest(ErrorResponseFactory.CreateValidationError(correlationId, Request.Path, validationErrors, correlationId));
            }

            _logger.LogInformation("Changing plan for subscription {SubscriptionId} to price {PriceId}",
                subscriptionId, request.NewPriceId);

            if (!ModelState.IsValid)
            {
                var validationErrors = ModelState
                    .Where(x => x.Value?.Errors.Count > 0)
                    .ToDictionary(x => x.Key, x => x.Value!.Errors.Select(e => e.ErrorMessage).ToArray());
                return BadRequest(ErrorResponseFactory.CreateValidationError(correlationId, Request.Path, validationErrors, correlationId));
            }

            var subscription = await _subscriptionService.UpdateSubscriptionAsync(userId, subscriptionId, request.NewPriceId, correlationId);
            return Ok(subscription);
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized(ErrorResponseFactory.CreateUnauthorizedError(correlationId, Request.Path, correlationId));
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Invalid plan change request");
            return NotFound(ErrorResponseFactory.CreateNotFoundError(correlationId, Request.Path, "Subscription", subscriptionId.ToString(), correlationId));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error changing plan for subscription {SubscriptionId}", subscriptionId);
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "Failed to change subscription plan", correlationId));
        }
    }

    [HttpGet("status")]
    public async Task<ActionResult<UserSubscription?>> GetSubscriptionStatus()
    {
        var correlationId = GetCorrelationId();
        try
        {
            var userId = GetUserId();

            _logger.LogInformation("Getting subscription status for user {UserId}", userId);

            var status = await _subscriptionService.GetUserSubscriptionStatusAsync(userId);
            return Ok(status);
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized(ErrorResponseFactory.CreateUnauthorizedError(correlationId, Request.Path, correlationId));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting subscription status");
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "Failed to retrieve subscription status", correlationId));
        }
    }

    [HttpGet("usage")]
    public async Task<ActionResult<UsageResponse>> GetUsage()
    {
        var correlationId = GetCorrelationId();
        try
        {
            var userId = GetUserId();

            _logger.LogInformation("Getting usage for user {UserId}", userId);

            // Get user's subscription to determine limits
            var subscription = await _subscriptionService.GetUserSubscriptionStatusAsync(userId);

            var isPremium = subscription?.Tier == SubscriptionTier.Premium || subscription?.Tier == SubscriptionTier.Pro;

            // Determine the billing period window for counting searches.
            // Premium users have a subscription period; free users reset daily.
            var periodStart = subscription?.CurrentPeriodStart ?? DateTime.UtcNow.Date;

            var searchesUsed = await _dbContext.SearchHistories
                .CountAsync(sh => sh.UserId == userId && sh.SearchedAt >= periodStart);

            var response = new UsageResponse
            {
                SearchesUsed = searchesUsed,
                ResultsViewed = 0,
                SearchLimit = isPremium ? null : 10,
                ResetTime = isPremium ? null : DateTime.UtcNow.Date.AddDays(1).ToString("O")
            };

            return Ok(response);
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized(ErrorResponseFactory.CreateUnauthorizedError(correlationId, Request.Path, correlationId));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting usage");
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "Failed to retrieve usage information", correlationId));
        }
    }

    [HttpPost("sync")]
    public async Task<ActionResult<bool>> SyncWithStripe()
    {
        var correlationId = GetCorrelationId();
        try
        {
            var userId = GetUserId();

            _logger.LogInformation("Syncing subscription with Stripe for user {UserId}", userId);

            var result = await _subscriptionService.SyncSubscriptionWithStripeAsync(userId, correlationId);

            if (!result)
                return StatusCode(500, ErrorResponseFactory.CreateExternalServiceError(correlationId, Request.Path, "Stripe", correlationId));

            return Ok(result);
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized(ErrorResponseFactory.CreateUnauthorizedError(correlationId, Request.Path, correlationId));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error syncing subscription with Stripe");
            return StatusCode(500, ErrorResponseFactory.CreateExternalServiceError(correlationId, Request.Path, "Stripe", correlationId));
        }
    }

    private Guid GetUserId()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            throw new UnauthorizedAccessException("Invalid user ID");
        return userId;
    }

    private string GetCorrelationId()
    {
        return HttpContext.GetCorrelationId() ?? HttpContext.TraceIdentifier;
    }
}

public class ChangePlanRequest
{
    [Required]
    [MaxLength(100)]
    public string NewPriceId { get; set; } = string.Empty;
}

public class UsageResponse
{
    public int SearchesUsed { get; set; }
    public int ResultsViewed { get; set; }
    public int? SearchLimit { get; set; }
    public string? ResetTime { get; set; }
}