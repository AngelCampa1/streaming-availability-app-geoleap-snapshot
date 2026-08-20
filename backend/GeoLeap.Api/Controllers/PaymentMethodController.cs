using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using GeoLeap.Api.Services;
using GeoLeap.Api.Models;
using GeoLeap.Api.Attributes;
using GeoLeap.Api.Exceptions;
using System.Security.Claims;

namespace GeoLeap.Api.Controllers;

[ApiController]
[Route("api/payment-methods")]
[Authorize]
public class PaymentMethodController : ControllerBase
{
    private readonly IPaymentMethodService _paymentMethodService;
    private readonly ILogger<PaymentMethodController> _logger;
    private readonly IRbacService _rbacService;

    public PaymentMethodController(
        IPaymentMethodService paymentMethodService,
        ILogger<PaymentMethodController> logger,
        IRbacService rbacService)
    {
        _paymentMethodService = paymentMethodService;
        _logger = logger;
        _rbacService = rbacService;
    }

    [HttpGet]
    [RequirePermission("payment_method:read")]
    public async Task<ActionResult<List<PaymentMethodDto>>> GetPaymentMethods()
    {
        try
        {
            var userId = GetUserId();
            var correlationId = GetCorrelationId();

            _logger.LogInformation("Getting payment methods for user {UserId} with correlation {CorrelationId}", 
                userId, correlationId);

            var paymentMethods = await _paymentMethodService.GetUserPaymentMethodsAsync(userId);
            
            _logger.LogInformation("Retrieved {Count} payment methods for user {UserId}", 
                paymentMethods.Count, userId);

            return Ok(paymentMethods);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get payment methods");
            return StatusCode(500, "An error occurred while retrieving payment methods");
        }
    }

    [HttpGet("{paymentMethodId}")]
    [RequirePermission("payment_method:read")]
    public async Task<ActionResult<PaymentMethodDto>> GetPaymentMethod(Guid paymentMethodId)
    {
        try
        {
            var userId = GetUserId();
            var correlationId = GetCorrelationId();

            _logger.LogInformation("Getting payment method {PaymentMethodId} for user {UserId}", 
                paymentMethodId, userId);

            var paymentMethod = await _paymentMethodService.GetPaymentMethodAsync(userId, paymentMethodId);
            
            if (paymentMethod == null)
                return NotFound("Payment method not found");

            return Ok(paymentMethod);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get payment method {PaymentMethodId}", paymentMethodId);
            return StatusCode(500, "An error occurred while retrieving the payment method");
        }
    }

    [HttpPost]
    [RequirePermission("payment_method:create")]
    public async Task<ActionResult<PaymentMethodDto>> AddPaymentMethod([FromBody] PaymentMethodRequest request)
    {
        try
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var userId = GetUserId();
            var correlationId = GetCorrelationId();

            _logger.LogInformation("Adding payment method for user {UserId} with correlation {CorrelationId}", 
                userId, correlationId);

            var paymentMethod = await _paymentMethodService.AddPaymentMethodAsync(userId, request, correlationId);
            
            _logger.LogInformation("Payment method {PaymentMethodId} added successfully for user {UserId}", 
                paymentMethod.Id, userId);

            return CreatedAtAction(nameof(GetPaymentMethod), new { paymentMethodId = paymentMethod.Id }, paymentMethod);
        }
        catch (UnauthorizedError ex)
        {
            _logger.LogWarning(ex, "Unauthorized payment method addition attempt");
            return Forbid(ex.Message);
        }
        catch (ConflictError ex)
        {
            _logger.LogWarning(ex, "Payment method conflict");
            return Conflict(ex.Message);
        }
        catch (ValidationException ex)
        {
            _logger.LogWarning(ex, "Payment method validation failed");
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to add payment method");
            return StatusCode(500, "An error occurred while adding the payment method");
        }
    }

    [HttpPut("{paymentMethodId}")]
    [RequirePermission("payment_method:update")]
    public async Task<ActionResult<PaymentMethodDto>> UpdatePaymentMethod(Guid paymentMethodId, [FromBody] UpdatePaymentMethodRequest request)
    {
        try
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            var userId = GetUserId();
            var correlationId = GetCorrelationId();

            _logger.LogInformation("Updating payment method {PaymentMethodId} for user {UserId}", 
                paymentMethodId, userId);

            var paymentMethod = await _paymentMethodService.UpdatePaymentMethodAsync(userId, paymentMethodId, request, correlationId);
            
            _logger.LogInformation("Payment method {PaymentMethodId} updated successfully for user {UserId}", 
                paymentMethodId, userId);

            return Ok(paymentMethod);
        }
        catch (UnauthorizedError ex)
        {
            _logger.LogWarning(ex, "Unauthorized payment method update attempt");
            return Forbid(ex.Message);
        }
        catch (NotFoundError ex)
        {
            _logger.LogWarning(ex, "Payment method not found for update");
            return NotFound(ex.Message);
        }
        catch (ValidationException ex)
        {
            _logger.LogWarning(ex, "Payment method update validation failed");
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update payment method {PaymentMethodId}", paymentMethodId);
            return StatusCode(500, "An error occurred while updating the payment method");
        }
    }

    [HttpDelete("{paymentMethodId}")]
    [RequirePermission("payment_method:delete")]
    public async Task<ActionResult> RemovePaymentMethod(Guid paymentMethodId)
    {
        try
        {
            var userId = GetUserId();
            var correlationId = GetCorrelationId();

            _logger.LogInformation("Removing payment method {PaymentMethodId} for user {UserId}", 
                paymentMethodId, userId);

            var result = await _paymentMethodService.RemovePaymentMethodAsync(userId, paymentMethodId, correlationId);
            
            if (!result)
                return NotFound("Payment method not found");

            _logger.LogInformation("Payment method {PaymentMethodId} removed successfully for user {UserId}", 
                paymentMethodId, userId);

            return NoContent();
        }
        catch (UnauthorizedError ex)
        {
            _logger.LogWarning(ex, "Unauthorized payment method removal attempt");
            return Forbid(ex.Message);
        }
        catch (ValidationException ex)
        {
            _logger.LogWarning(ex, "Payment method removal validation failed");
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to remove payment method {PaymentMethodId}", paymentMethodId);
            return StatusCode(500, "An error occurred while removing the payment method");
        }
    }

    [HttpPost("{paymentMethodId}/set-default")]
    [RequirePermission("payment_method:update")]
    public async Task<ActionResult<PaymentMethodDto>> SetDefaultPaymentMethod(Guid paymentMethodId)
    {
        try
        {
            var userId = GetUserId();
            var correlationId = GetCorrelationId();

            _logger.LogInformation("Setting payment method {PaymentMethodId} as default for user {UserId}", 
                paymentMethodId, userId);

            var paymentMethod = await _paymentMethodService.SetDefaultPaymentMethodAsync(userId, paymentMethodId, correlationId);
            
            _logger.LogInformation("Payment method {PaymentMethodId} set as default for user {UserId}", 
                paymentMethodId, userId);

            return Ok(paymentMethod);
        }
        catch (UnauthorizedError ex)
        {
            _logger.LogWarning(ex, "Unauthorized default payment method change attempt");
            return Forbid(ex.Message);
        }
        catch (NotFoundError ex)
        {
            _logger.LogWarning(ex, "Payment method not found for default setting");
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to set default payment method {PaymentMethodId}", paymentMethodId);
            return StatusCode(500, "An error occurred while setting the default payment method");
        }
    }

    [HttpGet("default")]
    [RequirePermission("payment_method:read")]
    public async Task<ActionResult<PaymentMethodDto>> GetDefaultPaymentMethod()
    {
        try
        {
            var userId = GetUserId();

            var defaultMethod = await _paymentMethodService.GetDefaultPaymentMethodAsync(userId);
            
            if (defaultMethod == null)
                return NotFound("No default payment method found");

            return Ok(defaultMethod);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get default payment method");
            return StatusCode(500, "An error occurred while retrieving the default payment method");
        }
    }

    [HttpPost("{paymentMethodId}/validate")]
    [RequirePermission("payment_method:read")]
    public async Task<ActionResult<bool>> ValidatePaymentMethod(Guid paymentMethodId)
    {
        try
        {
            var userId = GetUserId();
            var correlationId = GetCorrelationId();

            var paymentMethod = await _paymentMethodService.GetPaymentMethodAsync(userId, paymentMethodId);
            if (paymentMethod == null)
                return NotFound("Payment method not found");

            var validationRequest = new PaymentMethodValidationRequest
            {
                StripePaymentMethodId = paymentMethod.Id.ToString() // This needs to be the Stripe ID, will fix in service
            };

            var isValid = await _paymentMethodService.ValidatePaymentMethodAsync(userId, validationRequest, correlationId);
            
            return Ok(new { IsValid = isValid });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to validate payment method {PaymentMethodId}", paymentMethodId);
            return StatusCode(500, "An error occurred while validating the payment method");
        }
    }

    [HttpGet("expiring")]
    [RequirePermission("payment_method:read")]
    public async Task<ActionResult<List<PaymentMethodDto>>> GetExpiringPaymentMethods([FromQuery] int warningDays = 30)
    {
        try
        {
            var expiringMethods = await _paymentMethodService.GetExpiringPaymentMethodsAsync(warningDays);
            
            return Ok(expiringMethods);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get expiring payment methods");
            return StatusCode(500, "An error occurred while retrieving expiring payment methods");
        }
    }

    [HttpPost("{paymentMethodId}/sync")]
    [RequirePermission("payment_method:update")]
    public async Task<ActionResult> SyncWithStripe(Guid paymentMethodId)
    {
        try
        {
            var userId = GetUserId();
            var correlationId = GetCorrelationId();

            var result = await _paymentMethodService.SyncPaymentMethodWithStripeAsync(paymentMethodId, correlationId);
            
            if (!result)
                return NotFound("Payment method not found or sync failed");

            return Ok(new { Message = "Payment method synchronized successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to sync payment method {PaymentMethodId}", paymentMethodId);
            return StatusCode(500, "An error occurred while synchronizing the payment method");
        }
    }

    [HttpGet("analytics")]
    [RequirePermission("payment_method:analytics")]
    public async Task<ActionResult<Dictionary<string, object>>> GetPaymentMethodAnalytics([FromQuery] DateTime? startDate = null, [FromQuery] DateTime? endDate = null)
    {
        try
        {
            var userId = GetUserId();

            // Admin users can see all analytics, regular users see only their own
            var isAdmin = await _rbacService.HasPermissionAsync(userId, "admin:view_analytics");
            var analyticsUserId = isAdmin ? (Guid?)null : userId;

            var analytics = await _paymentMethodService.GetPaymentMethodAnalyticsAsync(analyticsUserId, startDate, endDate);
            
            return Ok(analytics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get payment method analytics");
            return StatusCode(500, "An error occurred while retrieving analytics");
        }
    }

    private Guid GetUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            throw new UnauthorizedError("Invalid user ID in token");
        
        return userId;
    }

    private string GetCorrelationId()
    {
        return HttpContext.TraceIdentifier ?? Guid.NewGuid().ToString();
    }
}