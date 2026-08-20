using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using GeoLeap.Api.Services;
using GeoLeap.Api.Models;
using GeoLeap.Api.Extensions;
using System.Security.Claims;

namespace GeoLeap.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PaymentRecoveryController : ControllerBase
{
    private readonly IPaymentRetryService _paymentRetryService;
    private readonly IGracePeriodService _gracePeriodService;
    private readonly ILogger<PaymentRecoveryController> _logger;
    private readonly IRbacService _rbacService;

    public PaymentRecoveryController(
        IPaymentRetryService paymentRetryService,
        IGracePeriodService gracePeriodService,
        ILogger<PaymentRecoveryController> logger,
        IRbacService rbacService)
    {
        _paymentRetryService = paymentRetryService;
        _gracePeriodService = gracePeriodService;
        _logger = logger;
        _rbacService = rbacService;
    }

    [HttpGet("failed-payments")]
    public async Task<IActionResult> GetUserFailedPayments([FromQuery] bool activeOnly = true)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
                return Unauthorized(new { message = "Authentication required" });

            var correlationId = HttpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();

            if (!await _rbacService.HasPermissionAsync(userId, "payments", "read"))
                return StatusCode(403, new { error = "Insufficient permissions to view payment information" });

            var failedPayments = await _paymentRetryService.GetUserFailedPaymentsAsync(userId, activeOnly);

            return Ok(new { data = failedPayments, count = failedPayments.Count });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving user failed payments");
            return StatusCode(500, new { error = "Failed to retrieve payment information" });
        }
    }

    [HttpGet("failed-payments/{failedPaymentId:guid}")]
    public async Task<IActionResult> GetFailedPayment(Guid failedPaymentId)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
                return Unauthorized(new { message = "Authentication required" });

            var correlationId = HttpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();

            if (!await _rbacService.HasPermissionAsync(userId, "payments", "read"))
                return StatusCode(403, new { error = "Insufficient permissions to view payment information" });

            var failedPayment = await _paymentRetryService.GetFailedPaymentAsync(failedPaymentId);

            if (failedPayment == null)
                return NotFound(new { error = "Failed payment not found" });

            // Verify user owns this failed payment
            if (failedPayment.UserId != userId)
                return Forbid("Access denied to this payment record");

            return Ok(new { data = failedPayment });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving failed payment {FailedPaymentId}", failedPaymentId);
            return StatusCode(500, new { error = "Failed to retrieve payment information" });
        }
    }

    [HttpPost("failed-payments/{failedPaymentId:guid}/retry")]
    public async Task<IActionResult> RetryFailedPayment(Guid failedPaymentId, [FromBody] ManualPaymentRetryRequest? request = null)
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
                return Unauthorized(new { message = "Authentication required" });

            var correlationId = HttpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();

            if (!await _rbacService.HasPermissionAsync(userId, "payments", "write"))
                return StatusCode(403, new { error = "Insufficient permissions to retry payments" });

            var failedPayment = await _paymentRetryService.GetFailedPaymentAsync(failedPaymentId);

            if (failedPayment == null)
                return NotFound(new { error = "Failed payment not found" });

            if (failedPayment.UserId != userId)
                return Forbid("Access denied to this payment record");

            if (!failedPayment.IsRetriable)
                return this.StandardBadRequest("Payment is not retriable");

            var retryAttempt = await _paymentRetryService.ManuallyRetryPaymentAsync(
                failedPaymentId,
                request?.Reason ?? "User-initiated retry",
                userId.ToString(),
                correlationId);

            return Ok(new { data = retryAttempt });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrying failed payment {FailedPaymentId}", failedPaymentId);
            return StatusCode(500, new { error = "Failed to retry payment" });
        }
    }

    [HttpGet("recovery-session/{sessionToken}")]
    [AllowAnonymous] // Recovery sessions have their own token-based auth
    public async Task<IActionResult> GetRecoverySession(string sessionToken)
    {
        try
        {
            var correlationId = HttpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();

            var session = await _paymentRetryService.GetRecoverySessionAsync(sessionToken);

            if (session == null)
                return NotFound(new { error = "Recovery session not found or expired" });

            return Ok(new { data = session });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving recovery session {SessionToken}", sessionToken);
            return StatusCode(500, new { error = "Failed to retrieve recovery session" });
        }
    }

    [HttpPost("recovery-session/{sessionToken}/complete")]
    [AllowAnonymous]
    public async Task<IActionResult> CompleteRecoverySession(string sessionToken, [FromBody] CompleteRecoverySessionRequest request)
    {
        try
        {
            var correlationId = HttpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();

            var session = await _paymentRetryService.CompleteRecoverySessionAsync(
                sessionToken,
                request.CompletionType,
                correlationId);

            return Ok(new { data = session });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error completing recovery session {SessionToken}", sessionToken);
            return StatusCode(500, new { error = "Failed to complete recovery session" });
        }
    }

    [HttpGet("grace-period")]
    public async Task<IActionResult> GetUserGracePeriod()
    {
        try
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "");

            if (!await _rbacService.HasPermissionAsync(userId, "subscriptions", "read"))
                return StatusCode(403, new { error = "Insufficient permissions to view subscription information" });

            var gracePeriod = await _gracePeriodService.GetActiveGracePeriodAsync(userId);

            if (gracePeriod == null)
                return Ok(new { data = (object?)null, inGracePeriod = false });

            var restrictedFeatures = await _gracePeriodService.GetRestrictedFeaturesAsync(userId);

            return Ok(new { 
                data = gracePeriod, 
                inGracePeriod = true,
                restrictedFeatures = restrictedFeatures
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving user grace period");
            return StatusCode(500, new { error = "Failed to retrieve grace period information" });
        }
    }

    [HttpPost("grace-period/{gracePeriodId:guid}/extend")]
    [Authorize(Roles = "Admin")] // Only admin can extend grace periods
    public async Task<IActionResult> ExtendGracePeriod(Guid gracePeriodId, [FromBody] UpdateGracePeriodRequest request)
    {
        try
        {
            var adminUserId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "");
            var correlationId = HttpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();

            if (!await _rbacService.HasPermissionAsync(adminUserId, "grace_periods", "write"))
                return StatusCode(403, new { error = "Insufficient permissions to extend grace periods" });

            if (!request.ExtendDays.HasValue || request.ExtendDays.Value <= 0)
                return this.StandardBadRequest("Valid extension days required");

            var extendedGracePeriod = await _gracePeriodService.ExtendGracePeriodAsync(
                gracePeriodId,
                request.ExtendDays.Value,
                request.Reason ?? "Admin extension",
                adminUserId.ToString(),
                correlationId);

            return Ok(new { data = extendedGracePeriod });
        }
        catch (ArgumentException)
        {
            return NotFound(new { error = "Grace period not found" });
        }
        catch (InvalidOperationException ex)
        {
            return this.StandardBadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error extending grace period {GracePeriodId}", gracePeriodId);
            return StatusCode(500, new { error = "Failed to extend grace period" });
        }
    }

    [HttpGet("analytics/recovery-metrics")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetRecoveryMetrics([FromQuery] DateTime? startDate = null, [FromQuery] DateTime? endDate = null)
    {
        try
        {
            var userId = Guid.Parse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "");

            if (!await _rbacService.HasPermissionAsync(userId, "analytics", "read"))
                return StatusCode(403, new { error = "Insufficient permissions to view analytics" });

            var start = startDate ?? DateTime.UtcNow.AddDays(-30);
            var end = endDate ?? DateTime.UtcNow;

            var retryAnalytics = await _paymentRetryService.GetRetryAnalyticsAsync(start, end);
            var gracePeriodAnalytics = await _gracePeriodService.GetGracePeriodAnalyticsAsync(start, end);

            return Ok(new { 
                retry_analytics = retryAnalytics,
                grace_period_analytics = gracePeriodAnalytics,
                period = new { start, end }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving recovery metrics");
            return StatusCode(500, new { error = "Failed to retrieve analytics" });
        }
    }
}

// Additional request DTOs
public class CompleteRecoverySessionRequest
{
    public string CompletionType { get; set; } = "user_completed";
}