using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using GeoLeap.Api.Attributes;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using GeoLeap.Api.Extensions;
using System.Security.Claims;

namespace GeoLeap.Api.Controllers;

/// <summary>
/// User-facing promotion endpoints
/// </summary>
[ApiController]
[Route("api/promotions")]
public class PromotionController : ControllerBase
{
    private readonly IPromotionService _promotionService;
    private readonly ILogger<PromotionController> _logger;

    public PromotionController(
        IPromotionService promotionService,
        ILogger<PromotionController> logger)
    {
        _promotionService = promotionService;
        _logger = logger;
    }

    /// <summary>
    /// Get all active promotions available to users
    /// </summary>
    /// <param name="platform">Filter by platform: web, ios, android</param>
    [HttpGet("active")]
    public async Task<ActionResult<List<PromotionDto>>> GetActivePromotions([FromQuery] string? platform = null)
    {
        try
        {
            var promotions = await _promotionService.GetActivePromotionsAsync(platform);
            return Ok(promotions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving active promotions");
            return StatusCode(500, new { error = "Failed to retrieve promotions" });
        }
    }

    /// <summary>
    /// Validate a promotion code for the current user
    /// </summary>
    [HttpGet("validate/{code}")]
    [Authorize]
    public async Task<ActionResult<ValidatePromotionResult>> ValidatePromoCode(
        string code,
        [FromQuery] string platform = "web")
    {
        try
        {
            var userId = GetUserId();
            if (userId == null)
            {
                return Unauthorized(new { error = "User not authenticated" });
            }

            var result = await _promotionService.ValidatePromotionForUserAsync(code, userId.Value, platform);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating promotion code: {Code}", code);
            return StatusCode(500, new { error = "Failed to validate promotion code" });
        }
    }

    /// <summary>
    /// Redeem a promotion (primarily for mobile users - web users use Stripe directly)
    /// </summary>
    [HttpPost("redeem")]
    [Authorize]
    public async Task<ActionResult<RedeemPromotionResult>> RedeemPromotion([FromBody] RedeemPromotionRequest request)
    {
        try
        {
            var userId = GetUserId();
            if (userId == null)
            {
                return Unauthorized(new { error = "User not authenticated" });
            }

            var ipAddress = HttpContext.Connection.RemoteIpAddress?.ToString();
            var userAgent = HttpContext.Request.Headers.UserAgent.ToString();

            var result = await _promotionService.RedeemPromotionAsync(userId.Value, request, ipAddress, userAgent);

            if (!result.Success)
            {
                return BadRequest(result);
            }

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error redeeming promotion code: {Code}", request.Code);
            return StatusCode(500, new { error = "Failed to redeem promotion" });
        }
    }

    /// <summary>
    /// Get the current user's redemption history
    /// </summary>
    [HttpGet("my-redemptions")]
    [Authorize]
    public async Task<ActionResult<List<PromotionRedemptionDto>>> GetMyRedemptions()
    {
        try
        {
            var userId = GetUserId();
            if (userId == null)
            {
                return Unauthorized(new { error = "User not authenticated" });
            }

            var redemptions = await _promotionService.GetUserRedemptionsAsync(userId.Value);
            return Ok(redemptions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving user redemptions");
            return StatusCode(500, new { error = "Failed to retrieve redemptions" });
        }
    }

    /// <summary>
    /// Get promotion details by code (public, for display)
    /// </summary>
    [HttpGet("code/{code}")]
    public async Task<ActionResult<PromotionDto>> GetPromotionByCode(string code)
    {
        try
        {
            var promotion = await _promotionService.GetPromotionByCodeAsync(code);
            if (promotion == null)
            {
                return NotFound(new { error = "Promotion not found" });
            }

            // Only return if active and not expired
            if (!promotion.IsActive)
            {
                return NotFound(new { error = "Promotion not found" });
            }

            if (promotion.ExpiresAt.HasValue && promotion.ExpiresAt < DateTime.UtcNow)
            {
                return NotFound(new { error = "Promotion has expired" });
            }

            return Ok(promotion);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving promotion by code: {Code}", code);
            return StatusCode(500, new { error = "Failed to retrieve promotion" });
        }
    }

    private Guid? GetUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (Guid.TryParse(userIdClaim, out var userId))
        {
            return userId;
        }
        return null;
    }
}

/// <summary>
/// Admin promotion management endpoints
/// </summary>
[ApiController]
[Route("api/admin/promotions")]
[Authorize]
[RequirePermission("admin", "promotions:manage")]
public class AdminPromotionController : ControllerBase
{
    private readonly IPromotionService _promotionService;
    private readonly ILogger<AdminPromotionController> _logger;

    public AdminPromotionController(
        IPromotionService promotionService,
        ILogger<AdminPromotionController> logger)
    {
        _promotionService = promotionService;
        _logger = logger;
    }

    /// <summary>
    /// Get all promotions
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<PromotionDto>>> GetAllPromotions()
    {
        try
        {
            var promotions = await _promotionService.GetAllPromotionsAsync();
            return Ok(promotions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving all promotions");
            return StatusCode(500, new { error = "Failed to retrieve promotions" });
        }
    }

    /// <summary>
    /// Get a specific promotion
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<PromotionDto>> GetPromotion(Guid id)
    {
        try
        {
            var promotion = await _promotionService.GetPromotionAsync(id);
            if (promotion == null)
            {
                return NotFound(new { error = "Promotion not found" });
            }
            return Ok(promotion);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving promotion: {Id}", id);
            return StatusCode(500, new { error = "Failed to retrieve promotion" });
        }
    }

    /// <summary>
    /// Get promotion statistics
    /// </summary>
    [HttpGet("{id:guid}/stats")]
    public async Task<ActionResult<PromotionStatsDto>> GetPromotionStats(Guid id)
    {
        try
        {
            var stats = await _promotionService.GetPromotionStatsAsync(id);
            if (stats == null)
            {
                return NotFound(new { error = "Promotion not found" });
            }
            return Ok(stats);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving promotion stats: {Id}", id);
            return StatusCode(500, new { error = "Failed to retrieve promotion stats" });
        }
    }

    /// <summary>
    /// Create a new promotion (creates in Stripe and syncs locally)
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<PromotionDto>> CreatePromotion([FromBody] CreatePromotionRequest request)
    {
        try
        {
            var promotion = await _promotionService.CreatePromotionAsync(request);
            _logger.LogInformation("Created promotion: {PromotionId} - {Name}", promotion.Id, promotion.Name);

            return CreatedAtAction(
                nameof(GetPromotion),
                new { id = promotion.Id },
                new PromotionDto
                {
                    Id = promotion.Id,
                    Name = promotion.Name,
                    Code = promotion.Code,
                    Description = promotion.Description,
                    IsActive = promotion.IsActive,
                    MaxRedemptions = promotion.MaxRedemptions,
                    CurrentRedemptions = promotion.CurrentRedemptions,
                    ExpiresAt = promotion.ExpiresAt,
                    PercentOff = promotion.PercentOff,
                    AmountOff = promotion.AmountOff,
                    AmountOffCurrency = promotion.AmountOffCurrency,
                    Duration = promotion.Duration,
                    DurationInMonths = promotion.DurationInMonths,
                    TargetPlanType = promotion.TargetPlanType,
                    FirstTimeOnly = promotion.FirstTimeOnly,
                    AutoApply = promotion.AutoApply,
                    AvailableOnMobile = promotion.AvailableOnMobile,
                    AvailableOnWeb = promotion.AvailableOnWeb,
                    CreatedAt = promotion.CreatedAt
                });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Failed to create promotion");
            return this.StandardBadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating promotion");
            return StatusCode(500, new { error = "Failed to create promotion" });
        }
    }

    /// <summary>
    /// Update a promotion
    /// </summary>
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<PromotionDto>> UpdatePromotion(Guid id, [FromBody] UpdatePromotionRequest request)
    {
        try
        {
            var promotion = await _promotionService.UpdatePromotionAsync(id, request);
            _logger.LogInformation("Updated promotion: {PromotionId}", id);

            return Ok(new PromotionDto
            {
                Id = promotion.Id,
                Name = promotion.Name,
                Code = promotion.Code,
                Description = promotion.Description,
                IsActive = promotion.IsActive,
                MaxRedemptions = promotion.MaxRedemptions,
                CurrentRedemptions = promotion.CurrentRedemptions,
                ExpiresAt = promotion.ExpiresAt,
                PercentOff = promotion.PercentOff,
                AmountOff = promotion.AmountOff,
                AmountOffCurrency = promotion.AmountOffCurrency,
                Duration = promotion.Duration,
                DurationInMonths = promotion.DurationInMonths,
                TargetPlanType = promotion.TargetPlanType,
                FirstTimeOnly = promotion.FirstTimeOnly,
                AutoApply = promotion.AutoApply,
                AvailableOnMobile = promotion.AvailableOnMobile,
                AvailableOnWeb = promotion.AvailableOnWeb,
                CreatedAt = promotion.CreatedAt
            });
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = "Promotion not found" });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Failed to update promotion");
            return this.StandardBadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating promotion: {Id}", id);
            return StatusCode(500, new { error = "Failed to update promotion" });
        }
    }

    /// <summary>
    /// Toggle promotion active status
    /// </summary>
    [HttpPatch("{id:guid}/toggle")]
    public async Task<ActionResult> TogglePromotion(Guid id, [FromBody] TogglePromotionRequest request)
    {
        try
        {
            var success = await _promotionService.TogglePromotionAsync(id, request.IsActive);
            if (!success)
            {
                return NotFound(new { error = "Promotion not found" });
            }

            _logger.LogInformation("Toggled promotion {PromotionId} to active={IsActive}", id, request.IsActive);
            return Ok(new { success = true, isActive = request.IsActive });
        }
        catch (KeyNotFoundException)
        {
            return NotFound(new { error = "Promotion not found" });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Failed to toggle promotion");
            return this.StandardBadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error toggling promotion: {Id}", id);
            return StatusCode(500, new { error = "Failed to toggle promotion" });
        }
    }

    /// <summary>
    /// Force sync promotions from Stripe
    /// </summary>
    [HttpPost("sync")]
    public async Task<ActionResult> SyncFromStripe()
    {
        try
        {
            await _promotionService.SyncFromStripeAsync();
            _logger.LogInformation("Synced promotions from Stripe");
            return Ok(new { success = true, message = "Promotions synced from Stripe" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error syncing promotions from Stripe");
            return StatusCode(500, new { error = "Failed to sync promotions from Stripe" });
        }
    }
}

/// <summary>
/// Request to toggle promotion active status
/// </summary>
public class TogglePromotionRequest
{
    public bool IsActive { get; set; }
}
