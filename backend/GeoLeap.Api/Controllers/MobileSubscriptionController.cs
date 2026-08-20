using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using GeoLeap.Api.Services;
using GeoLeap.Api.Models;
using GeoLeap.Api.Extensions;
using System.Security.Claims;
using System.ComponentModel.DataAnnotations;

namespace GeoLeap.Api.Controllers;

/// <summary>
/// Mobile In-App Purchase subscription management controller
/// Handles iOS and Android receipt verification and subscription sync
/// </summary>
[ApiController]
[Route("api/mobile/subscription")]
[Authorize]
public class MobileSubscriptionController : ControllerBase
{
    private readonly IMobileSubscriptionService _mobileSubscriptionService;
    private readonly ILogger<MobileSubscriptionController> _logger;

    public MobileSubscriptionController(
        IMobileSubscriptionService mobileSubscriptionService,
        ILogger<MobileSubscriptionController> logger)
    {
        _mobileSubscriptionService = mobileSubscriptionService;
        _logger = logger;
    }

    /// <summary>
    /// Verify and activate iOS App Store purchase
    /// </summary>
    [HttpPost("ios/verify")]
    public async Task<ActionResult<MobileSubscriptionResponse>> VerifyIosPurchase([FromBody] IosReceiptRequest request)
    {
        try
        {
            var userId = GetUserId();
            _logger.LogInformation("Verifying iOS purchase for user {UserId}", userId);

            if (!ModelState.IsValid)
                return this.StandardBadRequest("Invalid request");

            var result = await _mobileSubscriptionService.VerifyIosReceiptAsync(userId, request);

            if (!result.Success)
            {
                _logger.LogWarning("iOS receipt verification failed for user {UserId}: {Error}",
                    userId, result.ErrorMessage);
                return this.StandardBadRequest(result.ErrorMessage ?? "iOS receipt verification failed");
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error verifying iOS purchase");
            return StatusCode(500, new { error = "Failed to verify purchase" });
        }
    }

    /// <summary>
    /// Verify and activate Android Play Store purchase
    /// </summary>
    [HttpPost("android/verify")]
    public async Task<ActionResult<MobileSubscriptionResponse>> VerifyAndroidPurchase([FromBody] AndroidReceiptRequest request)
    {
        try
        {
            var userId = GetUserId();
            _logger.LogInformation("Verifying Android purchase for user {UserId}", userId);

            if (!ModelState.IsValid)
                return this.StandardBadRequest("Invalid request");

            var result = await _mobileSubscriptionService.VerifyAndroidReceiptAsync(userId, request);

            if (!result.Success)
            {
                _logger.LogWarning("Android receipt verification failed for user {UserId}: {Error}",
                    userId, result.ErrorMessage);
                return this.StandardBadRequest(result.ErrorMessage ?? "Android receipt verification failed");
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error verifying Android purchase");
            return StatusCode(500, new { error = "Failed to verify purchase" });
        }
    }

    /// <summary>
    /// Get current mobile subscription status
    /// </summary>
    [HttpGet("status")]
    public async Task<ActionResult<MobileSubscriptionStatus>> GetSubscriptionStatus()
    {
        try
        {
            var userId = GetUserId();
            _logger.LogInformation("Getting mobile subscription status for user {UserId}", userId);

            var status = await _mobileSubscriptionService.GetSubscriptionStatusAsync(userId);
            return Ok(status);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting subscription status");
            return StatusCode(500, new { error = "Failed to retrieve subscription status" });
        }
    }

    /// <summary>
    /// Sync subscription with store (iOS/Android)
    /// </summary>
    [HttpPost("sync")]
    public async Task<ActionResult<MobileSubscriptionResponse>> SyncSubscription([FromBody] SyncSubscriptionRequest request)
    {
        try
        {
            var userId = GetUserId();
            _logger.LogInformation("Syncing mobile subscription for user {UserId} on platform {Platform}",
                userId, request.Platform);

            if (!ModelState.IsValid)
                return this.StandardBadRequest("Invalid request");

            var result = await _mobileSubscriptionService.SyncSubscriptionAsync(userId, request);

            if (!result.Success)
            {
                _logger.LogWarning("Subscription sync failed for user {UserId}: {Error}",
                    userId, result.ErrorMessage);
                return this.StandardBadRequest(result.ErrorMessage ?? "Subscription sync failed");
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error syncing subscription");
            return StatusCode(500, new { error = "Failed to sync subscription" });
        }
    }

    /// <summary>
    /// Restore previous purchases (for reinstalls)
    /// </summary>
    [HttpPost("restore")]
    public async Task<ActionResult<RestorePurchasesResponse>> RestorePurchases([FromBody] RestorePurchasesRequest request)
    {
        try
        {
            var userId = GetUserId();
            _logger.LogInformation("Restoring purchases for user {UserId} on platform {Platform}",
                userId, request.Platform);

            if (!ModelState.IsValid)
                return this.StandardBadRequest("Invalid request");

            var result = await _mobileSubscriptionService.RestorePurchasesAsync(userId, request);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error restoring purchases");
            return StatusCode(500, new { error = "Failed to restore purchases" });
        }
    }

    /// <summary>
    /// Cancel subscription (marks for cancellation at period end)
    /// </summary>
    [HttpPost("cancel")]
    public async Task<ActionResult<MobileSubscriptionResponse>> CancelSubscription()
    {
        try
        {
            var userId = GetUserId();
            _logger.LogInformation("Canceling subscription for user {UserId}", userId);

            var result = await _mobileSubscriptionService.CancelSubscriptionAsync(userId);

            if (!result.Success)
            {
                _logger.LogWarning("Subscription cancellation failed for user {UserId}: {Error}",
                    userId, result.ErrorMessage);
                return this.StandardBadRequest(result.ErrorMessage ?? "Subscription cancellation failed");
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error canceling subscription");
            return StatusCode(500, new { error = "Failed to cancel subscription" });
        }
    }

    /// <summary>
    /// Check if user has access to a specific feature
    /// </summary>
    [HttpGet("features/{featureId}")]
    public async Task<ActionResult<FeatureAccessResponse>> CheckFeatureAccess(string featureId)
    {
        try
        {
            var userId = GetUserId();
            _logger.LogInformation("Checking feature access for user {UserId}, feature {FeatureId}",
                userId, featureId);

            var hasAccess = await _mobileSubscriptionService.HasFeatureAccessAsync(userId, featureId);
            return Ok(new FeatureAccessResponse
            {
                FeatureId = featureId,
                HasAccess = hasAccess,
                UserId = userId
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking feature access");
            return StatusCode(500, new { error = "Failed to check feature access" });
        }
    }

    /// <summary>
    /// Get available subscription plans for mobile
    /// </summary>
    [HttpGet("plans")]
    [AllowAnonymous]
    public async Task<ActionResult<List<MobileSubscriptionPlan>>> GetAvailablePlans([FromQuery] string platform)
    {
        try
        {
            _logger.LogInformation("Getting available subscription plans for platform {Platform}", platform);

            var plans = await _mobileSubscriptionService.GetAvailablePlansAsync(platform);
            return Ok(plans);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting subscription plans");
            return StatusCode(500, new { error = "Failed to retrieve subscription plans" });
        }
    }

    private Guid GetUserId()
    {
        var userIdClaim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            throw new UnauthorizedAccessException("Invalid user ID");
        return userId;
    }
}

// ============================================================
// REQUEST MODELS
// ============================================================

/// <summary>
/// iOS App Store receipt validation request
/// </summary>
public class IosReceiptRequest
{
    [Required]
    public string ReceiptData { get; set; } = string.Empty;

    [Required]
    public string ProductId { get; set; } = string.Empty;

    [Required]
    public string TransactionId { get; set; } = string.Empty;

    public string? OriginalTransactionId { get; set; }
}

/// <summary>
/// Android Play Store receipt validation request
/// </summary>
public class AndroidReceiptRequest
{
    [Required]
    public string PurchaseToken { get; set; } = string.Empty;

    [Required]
    public string ProductId { get; set; } = string.Empty;

    [Required]
    public string PackageName { get; set; } = string.Empty;

    public string? OrderId { get; set; }
}

/// <summary>
/// Subscription sync request
/// </summary>
public class SyncSubscriptionRequest
{
    [Required]
    public string Platform { get; set; } = string.Empty; // "ios" or "android"

    public string? ReceiptData { get; set; }
    public string? PurchaseToken { get; set; }
}

/// <summary>
/// Restore purchases request
/// </summary>
public class RestorePurchasesRequest
{
    [Required]
    public string Platform { get; set; } = string.Empty; // "ios" or "android"

    public List<string>? TransactionIds { get; set; }
    public List<string>? PurchaseTokens { get; set; }
}

// ============================================================
// RESPONSE MODELS
// ============================================================

/// <summary>
/// Mobile subscription operation response
/// </summary>
public class MobileSubscriptionResponse
{
    public bool Success { get; set; }
    public string? ErrorMessage { get; set; }
    public MobileSubscriptionStatus? Subscription { get; set; }
}

/// <summary>
/// Mobile subscription status
/// </summary>
public class MobileSubscriptionStatus
{
    public Guid UserId { get; set; }
    public string Tier { get; set; } = "free"; // free, basic, premium, pro
    public string Status { get; set; } = "inactive"; // active, trial, canceled, expired, past_due
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public bool AutoRenew { get; set; }
    public string Platform { get; set; } = string.Empty; // ios, android
    public string? ProductId { get; set; }
    public string? TransactionId { get; set; }
    public MobileSubscriptionPlanInfo? Plan { get; set; }
}

/// <summary>
/// Mobile subscription plan information
/// </summary>
public class MobileSubscriptionPlanInfo
{
    public string Id { get; set; } = string.Empty;
    public string Tier { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal MonthlyPrice { get; set; }
    public decimal YearlyPrice { get; set; }
    public string Currency { get; set; } = "USD";
    public List<string> Features { get; set; } = new();
}

/// <summary>
/// Restore purchases response
/// </summary>
public class RestorePurchasesResponse
{
    public bool Success { get; set; }
    public string? ErrorMessage { get; set; }
    public int RestoredCount { get; set; }
    public MobileSubscriptionStatus? ActiveSubscription { get; set; }
}

/// <summary>
/// Feature access check response
/// </summary>
public class FeatureAccessResponse
{
    public string FeatureId { get; set; } = string.Empty;
    public bool HasAccess { get; set; }
    public Guid UserId { get; set; }
}

/// <summary>
/// Mobile subscription plan (for mobile app display)
/// </summary>
public class MobileSubscriptionPlan
{
    public string Id { get; set; } = string.Empty;
    public string Tier { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal MonthlyPrice { get; set; }
    public decimal YearlyPrice { get; set; }
    public string Currency { get; set; } = "USD";
    public List<PlanFeature> Features { get; set; } = new();
    public ProductIds IapProductIds { get; set; } = new();
    public string Color { get; set; } = "#000000";
    public bool IsMostPopular { get; set; }
    public bool IsRecommended { get; set; }
}

public class PlanFeature
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public bool Included { get; set; }
    public string? Description { get; set; }
}

public class ProductIds
{
    public PlatformProductIds Ios { get; set; } = new();
    public PlatformProductIds Android { get; set; } = new();
}

public class PlatformProductIds
{
    public string Monthly { get; set; } = string.Empty;
    public string Yearly { get; set; } = string.Empty;
}
