using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using GeoLeap.Api.Services;
using GeoLeap.Api.Models;
using GeoLeap.Api.Extensions;
using System.Security.Claims;

namespace GeoLeap.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Admin")]
public class DunningController : ControllerBase
{
    private readonly IDunningService _dunningService;
    private readonly IPaymentRetryService _paymentRetryService;
    private readonly ILogger<DunningController> _logger;
    private readonly IRbacService _rbacService;

    public DunningController(
        IDunningService dunningService,
        IPaymentRetryService paymentRetryService,
        ILogger<DunningController> logger,
        IRbacService rbacService)
    {
        _dunningService = dunningService;
        _paymentRetryService = paymentRetryService;
        _logger = logger;
        _rbacService = rbacService;
    }

    [HttpGet("campaigns")]
    public async Task<IActionResult> GetCampaigns()
    {
        try
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "");

            if (!await _rbacService.HasPermissionAsync(userId, "dunning_campaigns", "read"))
                return Forbid("Insufficient permissions to view dunning campaigns");

            var campaigns = await _dunningService.GetActiveCampaignsAsync();

            return Ok(new { data = campaigns, count = campaigns.Count });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving dunning campaigns");
            return StatusCode(500, new { error = "Failed to retrieve campaigns" });
        }
    }

    [HttpGet("campaigns/{campaignId:guid}")]
    public async Task<IActionResult> GetCampaign(Guid campaignId)
    {
        try
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "");

            if (!await _rbacService.HasPermissionAsync(userId, "dunning_campaigns", "read"))
                return Forbid("Insufficient permissions to view dunning campaigns");

            var campaign = await _dunningService.GetCampaignAsync(campaignId);

            if (campaign == null)
                return NotFound(new { error = "Campaign not found" });

            return Ok(new { data = campaign });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving campaign {CampaignId}", campaignId);
            return StatusCode(500, new { error = "Failed to retrieve campaign" });
        }
    }

    [HttpPost("campaigns")]
    public async Task<IActionResult> CreateCampaign([FromBody] CreateDunningCampaignRequest request)
    {
        try
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "");
            var correlationId = HttpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();

            if (!await _rbacService.HasPermissionAsync(userId, "dunning_campaigns", "create"))
                return Forbid("Insufficient permissions to create dunning campaigns");

            if (!ModelState.IsValid)
                return this.StandardBadRequest("Invalid request");

            var campaign = await _dunningService.CreateCampaignAsync(request, userId.ToString(), correlationId);

            return CreatedAtAction(nameof(GetCampaign), new { campaignId = campaign.Id }, new { data = campaign });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating dunning campaign");
            return StatusCode(500, new { error = "Failed to create campaign" });
        }
    }

    [HttpPut("campaigns/{campaignId:guid}")]
    public async Task<IActionResult> UpdateCampaign(Guid campaignId, [FromBody] CreateDunningCampaignRequest request)
    {
        try
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "");
            var correlationId = HttpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();

            if (!await _rbacService.HasPermissionAsync(userId, "dunning_campaigns", "update"))
                return Forbid("Insufficient permissions to update dunning campaigns");

            if (!ModelState.IsValid)
                return this.StandardBadRequest("Invalid request");

            var campaign = await _dunningService.UpdateCampaignAsync(campaignId, request, userId.ToString(), correlationId);

            return Ok(new { data = campaign });
        }
        catch (ArgumentException)
        {
            return NotFound(new { error = "Campaign not found" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating campaign {CampaignId}", campaignId);
            return StatusCode(500, new { error = "Failed to update campaign" });
        }
    }

    [HttpDelete("campaigns/{campaignId:guid}")]
    public async Task<IActionResult> DeleteCampaign(Guid campaignId)
    {
        try
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "");
            var correlationId = HttpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();

            if (!await _rbacService.HasPermissionAsync(userId, "dunning_campaigns", "delete"))
                return Forbid("Insufficient permissions to delete dunning campaigns");

            var success = await _dunningService.DeleteCampaignAsync(campaignId, userId.ToString(), correlationId);

            if (!success)
                return NotFound(new { error = "Campaign not found" });

            return Ok(new { message = "Campaign archived successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting campaign {CampaignId}", campaignId);
            return StatusCode(500, new { error = "Failed to delete campaign" });
        }
    }

    [HttpGet("campaigns/{campaignId:guid}/performance")]
    public async Task<IActionResult> GetCampaignPerformance(Guid campaignId, [FromQuery] DateTime? startDate = null, [FromQuery] DateTime? endDate = null)
    {
        try
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "");

            if (!await _rbacService.HasPermissionAsync(userId, "dunning_analytics", "read"))
                return Forbid("Insufficient permissions to view analytics");

            var start = startDate ?? DateTime.UtcNow.AddDays(-30);
            var end = endDate ?? DateTime.UtcNow;

            var performance = await _dunningService.GetCampaignPerformanceAsync(campaignId, start, end);

            return Ok(new { data = performance });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving campaign performance for {CampaignId}", campaignId);
            return StatusCode(500, new { error = "Failed to retrieve performance data" });
        }
    }

    [HttpGet("analytics/overview")]
    public async Task<IActionResult> GetDunningOverview([FromQuery] DateTime? startDate = null, [FromQuery] DateTime? endDate = null)
    {
        try
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "");

            if (!await _rbacService.HasPermissionAsync(userId, "dunning_analytics", "read"))
                return Forbid("Insufficient permissions to view analytics");

            var start = startDate ?? DateTime.UtcNow.AddDays(-30);
            var end = endDate ?? DateTime.UtcNow;

            var overview = await _dunningService.GetDunningOverviewAnalyticsAsync(start, end);

            return Ok(new { data = overview });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving dunning overview analytics");
            return StatusCode(500, new { error = "Failed to retrieve analytics" });
        }
    }

    [HttpGet("failed-payments/requiring-action")]
    public async Task<IActionResult> GetFailedPaymentsRequiringAction([FromQuery] int daysOld = 1)
    {
        try
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "");

            if (!await _rbacService.HasPermissionAsync(userId, "failed_payments", "read"))
                return Forbid("Insufficient permissions to view failed payments");

            var failedPayments = await _paymentRetryService.GetFailedPaymentsRequiringActionAsync(daysOld);

            return Ok(new { data = failedPayments, count = failedPayments.Count });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving failed payments requiring action");
            return StatusCode(500, new { error = "Failed to retrieve failed payments" });
        }
    }

    [HttpPost("failed-payments/{failedPaymentId:guid}/force-resolve")]
    public async Task<IActionResult> ForceResolveFailedPayment(Guid failedPaymentId, [FromBody] ForceResolveRequest request)
    {
        try
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "");
            var correlationId = HttpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();

            if (!await _rbacService.HasPermissionAsync(userId, "failed_payments", "resolve"))
                return Forbid("Insufficient permissions to resolve failed payments");

            if (string.IsNullOrWhiteSpace(request.Reason))
                return this.StandardBadRequest("Reason is required for force resolution");

            var resolvedPayment = await _paymentRetryService.ForceResolveFailedPaymentAsync(
                failedPaymentId,
                request.Reason,
                userId.ToString(),
                correlationId);

            return Ok(new { data = resolvedPayment });
        }
        catch (ArgumentException)
        {
            return NotFound(new { error = "Failed payment not found" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error force resolving failed payment {FailedPaymentId}", failedPaymentId);
            return StatusCode(500, new { error = "Failed to resolve payment" });
        }
    }

    [HttpPost("failed-payments/{failedPaymentId:guid}/manual-retry")]
    public async Task<IActionResult> ManuallyRetryPayment(Guid failedPaymentId, [FromBody] ManualPaymentRetryRequest request)
    {
        try
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "");
            var correlationId = HttpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();

            if (!await _rbacService.HasPermissionAsync(userId, "failed_payments", "retry"))
                return Forbid("Insufficient permissions to retry payments");

            if (!ModelState.IsValid)
                return this.StandardBadRequest("Invalid request");

            var retryAttempt = await _paymentRetryService.ManuallyRetryPaymentAsync(
                failedPaymentId,
                request.Reason,
                userId.ToString(),
                correlationId);

            return Ok(new { data = retryAttempt });
        }
        catch (ArgumentException)
        {
            return NotFound(new { error = "Failed payment not found" });
        }
        catch (InvalidOperationException ex)
        {
            return this.StandardBadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error manually retrying payment {FailedPaymentId}", failedPaymentId);
            return StatusCode(500, new { error = "Failed to retry payment" });
        }
    }

    [HttpGet("analytics/failure-patterns")]
    public async Task<IActionResult> GetFailurePatterns([FromQuery] DateTime? startDate = null, [FromQuery] DateTime? endDate = null)
    {
        try
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "");

            if (!await _rbacService.HasPermissionAsync(userId, "dunning_analytics", "read"))
                return Forbid("Insufficient permissions to view analytics");

            var start = startDate ?? DateTime.UtcNow.AddDays(-30);
            var end = endDate ?? DateTime.UtcNow;

            var patterns = await _paymentRetryService.GetFailurePatternAnalysisAsync(start, end);

            return Ok(new { data = patterns });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving failure pattern analysis");
            return StatusCode(500, new { error = "Failed to retrieve failure patterns" });
        }
    }
}

// Additional request DTOs
public class ForceResolveRequest
{
    public string Reason { get; set; } = string.Empty;
}