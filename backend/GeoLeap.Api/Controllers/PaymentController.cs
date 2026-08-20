using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using GeoLeap.Api.Services;
using GeoLeap.Api.Models;
using GeoLeap.Api.Middleware;
using System.Security.Claims;

namespace GeoLeap.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PaymentController : ControllerBase
{
    private readonly IPaymentService _paymentService;
    private readonly ILogger<PaymentController> _logger;

    public PaymentController(IPaymentService paymentService, ILogger<PaymentController> logger)
    {
        _paymentService = paymentService;
        _logger = logger;
    }

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(userIdClaim, out var userId) ? userId : Guid.Empty;
    }

    private string GetCorrelationId()
    {
        return HttpContext.GetCorrelationId() ?? HttpContext.TraceIdentifier;
    }

    /// <summary>
    /// Create a new payment intent
    /// Any authenticated user can create a payment intent to subscribe/upgrade
    /// </summary>
    [HttpPost("payment-intents")]
    public async Task<ActionResult<PaymentTransactionDto>> CreatePaymentIntent([FromBody] CreatePaymentIntentRequest request)
    {
        var correlationId = GetCorrelationId();
        try
        {
            var userId = GetCurrentUserId();
            if (userId == Guid.Empty)
                return Unauthorized(ErrorResponseFactory.CreateUnauthorizedError(correlationId, Request.Path, correlationId));

            // Add amount validation
            if (request.Amount <= 0)
                return BadRequest(ErrorResponseFactory.CreateBadRequestError(correlationId, Request.Path, "Amount must be greater than zero", correlationId));

            if (request.Amount > 999999) // Max amount validation
                return BadRequest(ErrorResponseFactory.CreateBadRequestError(correlationId, Request.Path, "Amount exceeds maximum allowed", correlationId));

            _logger.LogInformation("Creating payment intent for user {UserId} with amount {Amount} {Currency}",
                userId, request.Amount, request.Currency);

            var result = await _paymentService.CreatePaymentIntentAsync(userId, request, correlationId);

            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning("Invalid payment intent request for user {UserId}: {Error}",
                GetCurrentUserId(), ex.Message);
            return BadRequest(ErrorResponseFactory.CreateBadRequestError(correlationId, Request.Path, ex.Message, correlationId));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating payment intent for user {UserId}", GetCurrentUserId());
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "An error occurred while processing the payment", correlationId));
        }
    }

    /// <summary>
    /// Confirm a payment intent
    /// Any authenticated user can confirm their own payment intent
    /// </summary>
    [HttpPost("payment-intents/{paymentIntentId}/confirm")]
    public async Task<ActionResult<PaymentTransactionDto>> ConfirmPaymentIntent(string paymentIntentId)
    {
        var correlationId = GetCorrelationId();
        try
        {
            var userId = GetCurrentUserId();
            if (userId == Guid.Empty)
                return Unauthorized(ErrorResponseFactory.CreateUnauthorizedError(correlationId, Request.Path, correlationId));

            _logger.LogInformation("Confirming payment intent {PaymentIntentId} for user {UserId}",
                paymentIntentId, userId);

            var result = await _paymentService.ConfirmPaymentIntentAsync(userId, paymentIntentId, correlationId);

            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning("Invalid payment confirmation for user {UserId}: {Error}",
                GetCurrentUserId(), ex.Message);
            return BadRequest(ErrorResponseFactory.CreateBadRequestError(correlationId, Request.Path, ex.Message, correlationId));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error confirming payment intent {PaymentIntentId} for user {UserId}",
                paymentIntentId, GetCurrentUserId());
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "An error occurred while confirming the payment", correlationId));
        }
    }

    /// <summary>
    /// Cancel a payment intent
    /// Any authenticated user can cancel their own payment intent
    /// </summary>
    [HttpPost("payment-intents/{paymentIntentId}/cancel")]
    public async Task<ActionResult<PaymentTransactionDto>> CancelPaymentIntent(string paymentIntentId)
    {
        var correlationId = GetCorrelationId();
        try
        {
            var userId = GetCurrentUserId();
            if (userId == Guid.Empty)
                return Unauthorized(ErrorResponseFactory.CreateUnauthorizedError(correlationId, Request.Path, correlationId));

            _logger.LogInformation("Canceling payment intent {PaymentIntentId} for user {UserId}",
                paymentIntentId, userId);

            var result = await _paymentService.CancelPaymentIntentAsync(userId, paymentIntentId, correlationId);

            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning("Invalid payment cancellation for user {UserId}: {Error}",
                GetCurrentUserId(), ex.Message);
            return BadRequest(ErrorResponseFactory.CreateBadRequestError(correlationId, Request.Path, ex.Message, correlationId));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error canceling payment intent {PaymentIntentId} for user {UserId}",
                paymentIntentId, GetCurrentUserId());
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "An error occurred while canceling the payment", correlationId));
        }
    }

    /// <summary>
    /// Get a specific payment transaction
    /// Any authenticated user can view their own transactions
    /// </summary>
    [HttpGet("transactions/{transactionId}")]
    public async Task<ActionResult<PaymentTransactionDto>> GetPaymentTransaction(Guid transactionId)
    {
        var correlationId = GetCorrelationId();
        try
        {
            var userId = GetCurrentUserId();
            if (userId == Guid.Empty)
                return Unauthorized(ErrorResponseFactory.CreateUnauthorizedError(correlationId, Request.Path, correlationId));

            var transaction = await _paymentService.GetPaymentTransactionAsync(userId, transactionId);

            if (transaction == null)
                return NotFound(ErrorResponseFactory.CreateNotFoundError(correlationId, Request.Path, "PaymentTransaction", transactionId.ToString(), correlationId));

            return Ok(transaction);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting payment transaction {TransactionId} for user {UserId}",
                transactionId, GetCurrentUserId());
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "An error occurred while retrieving the transaction", correlationId));
        }
    }

    /// <summary>
    /// Get payment history for the current user
    /// Any authenticated user can view their own payment history
    /// </summary>
    [HttpGet("history")]
    public async Task<ActionResult<List<PaymentTransactionDto>>> GetPaymentHistory(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var correlationId = GetCorrelationId();
        try
        {
            var userId = GetCurrentUserId();
            if (userId == Guid.Empty)
                return Unauthorized(ErrorResponseFactory.CreateUnauthorizedError(correlationId, Request.Path, correlationId));

            // Validate pagination parameters
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 100) pageSize = 20;

            var transactions = await _paymentService.GetUserPaymentHistoryAsync(userId, page, pageSize);

            return Ok(transactions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting payment history for user {UserId}", GetCurrentUserId());
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "An error occurred while retrieving payment history", correlationId));
        }
    }

    /// <summary>
    /// Attach a payment method to the current user
    /// Any authenticated user can manage their payment methods
    /// </summary>
    [HttpPost("payment-methods")]
    public async Task<ActionResult<PaymentMethodDto>> AttachPaymentMethod([FromBody] PaymentMethodRequest request)
    {
        var correlationId = GetCorrelationId();
        try
        {
            var userId = GetCurrentUserId();
            if (userId == Guid.Empty)
                return Unauthorized(ErrorResponseFactory.CreateUnauthorizedError(correlationId, Request.Path, correlationId));

            // Add Stripe ID validation
            if (string.IsNullOrWhiteSpace(request.StripePaymentMethodId))
            {
                var validationErrors = new Dictionary<string, string[]> { { "StripePaymentMethodId", new[] { "Stripe payment method ID is required" } } };
                return BadRequest(ErrorResponseFactory.CreateValidationError(correlationId, Request.Path, validationErrors, correlationId));
            }

            _logger.LogInformation("Attaching payment method for user {UserId}", userId);

            var result = await _paymentService.AttachPaymentMethodAsync(userId, request, correlationId);

            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning("Invalid payment method attachment for user {UserId}: {Error}",
                GetCurrentUserId(), ex.Message);
            return BadRequest(ErrorResponseFactory.CreateBadRequestError(correlationId, Request.Path, ex.Message, correlationId));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error attaching payment method for user {UserId}", GetCurrentUserId());
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "An error occurred while saving the payment method", correlationId));
        }
    }

    /// <summary>
    /// Get payment methods for the current user
    /// Any authenticated user can view their own payment methods
    /// </summary>
    [HttpGet("payment-methods")]
    public async Task<ActionResult<List<PaymentMethodDto>>> GetPaymentMethods()
    {
        var correlationId = GetCorrelationId();
        try
        {
            var userId = GetCurrentUserId();
            if (userId == Guid.Empty)
                return Unauthorized(ErrorResponseFactory.CreateUnauthorizedError(correlationId, Request.Path, correlationId));

            var paymentMethods = await _paymentService.GetUserPaymentMethodsAsync(userId);

            return Ok(paymentMethods);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting payment methods for user {UserId}", GetCurrentUserId());
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "An error occurred while retrieving payment methods", correlationId));
        }
    }

    /// <summary>
    /// Detach a payment method
    /// Any authenticated user can remove their own payment methods
    /// </summary>
    [HttpDelete("payment-methods/{paymentMethodId}")]
    public async Task<ActionResult<PaymentMethodDto>> DetachPaymentMethod(Guid paymentMethodId)
    {
        var correlationId = GetCorrelationId();
        try
        {
            var userId = GetCurrentUserId();
            if (userId == Guid.Empty)
                return Unauthorized(ErrorResponseFactory.CreateUnauthorizedError(correlationId, Request.Path, correlationId));

            _logger.LogInformation("Detaching payment method {PaymentMethodId} for user {UserId}",
                paymentMethodId, userId);

            var result = await _paymentService.DetachPaymentMethodAsync(userId, paymentMethodId, correlationId);

            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning("Invalid payment method detachment for user {UserId}: {Error}",
                GetCurrentUserId(), ex.Message);
            return BadRequest(ErrorResponseFactory.CreateBadRequestError(correlationId, Request.Path, ex.Message, correlationId));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error detaching payment method {PaymentMethodId} for user {UserId}",
                paymentMethodId, GetCurrentUserId());
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "An error occurred while removing the payment method", correlationId));
        }
    }

    /// <summary>
    /// Set a payment method as default
    /// Any authenticated user can set their default payment method
    /// </summary>
    [HttpPut("payment-methods/{paymentMethodId}/default")]
    public async Task<ActionResult<PaymentMethodDto>> SetDefaultPaymentMethod(Guid paymentMethodId)
    {
        var correlationId = GetCorrelationId();
        try
        {
            var userId = GetCurrentUserId();
            if (userId == Guid.Empty)
                return Unauthorized(ErrorResponseFactory.CreateUnauthorizedError(correlationId, Request.Path, correlationId));

            _logger.LogInformation("Setting default payment method {PaymentMethodId} for user {UserId}",
                paymentMethodId, userId);

            var result = await _paymentService.SetDefaultPaymentMethodAsync(userId, paymentMethodId, correlationId);

            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning("Invalid default payment method update for user {UserId}: {Error}",
                GetCurrentUserId(), ex.Message);
            return BadRequest(ErrorResponseFactory.CreateBadRequestError(correlationId, Request.Path, ex.Message, correlationId));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error setting default payment method {PaymentMethodId} for user {UserId}",
                paymentMethodId, GetCurrentUserId());
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "An error occurred while updating the payment method", correlationId));
        }
    }

    /// <summary>
    /// Create a new subscription
    /// Any authenticated user can create a subscription
    /// </summary>
    [HttpPost("subscriptions")]
    public async Task<ActionResult<SubscriptionDto>> CreateSubscription([FromBody] CreateSubscriptionRequest request)
    {
        var correlationId = GetCorrelationId();
        try
        {
            var userId = GetCurrentUserId();
            if (userId == Guid.Empty)
                return Unauthorized(ErrorResponseFactory.CreateUnauthorizedError(correlationId, Request.Path, correlationId));

            _logger.LogInformation("Creating subscription for user {UserId} with price {PriceId}",
                userId, request.PriceId);

            var result = await _paymentService.CreateSubscriptionAsync(userId, request, correlationId);

            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning("Invalid subscription creation for user {UserId}: {Error}",
                GetCurrentUserId(), ex.Message);
            return BadRequest(ErrorResponseFactory.CreateBadRequestError(correlationId, Request.Path, ex.Message, correlationId));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating subscription for user {UserId}", GetCurrentUserId());
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "An error occurred while creating the subscription", correlationId));
        }
    }

    /// <summary>
    /// Get the current user's active subscription
    /// Any authenticated user can view their own subscription
    /// </summary>
    [HttpGet("subscriptions/current")]
    public async Task<ActionResult<SubscriptionDto>> GetActiveSubscription()
    {
        var correlationId = GetCorrelationId();
        try
        {
            var userId = GetCurrentUserId();
            if (userId == Guid.Empty)
                return Unauthorized(ErrorResponseFactory.CreateUnauthorizedError(correlationId, Request.Path, correlationId));

            var subscription = await _paymentService.GetUserActiveSubscriptionAsync(userId);

            if (subscription == null)
                return NotFound(ErrorResponseFactory.CreateNotFoundError(correlationId, Request.Path, "Subscription", "active", correlationId));

            return Ok(subscription);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting active subscription for user {UserId}", GetCurrentUserId());
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "An error occurred while retrieving the subscription", correlationId));
        }
    }

    /// <summary>
    /// Cancel a subscription
    /// Any authenticated user can cancel their own subscription
    /// </summary>
    [HttpPost("subscriptions/{subscriptionId}/cancel")]
    public async Task<ActionResult<SubscriptionDto>> CancelSubscription(Guid subscriptionId)
    {
        var correlationId = GetCorrelationId();
        try
        {
            var userId = GetCurrentUserId();
            if (userId == Guid.Empty)
                return Unauthorized(ErrorResponseFactory.CreateUnauthorizedError(correlationId, Request.Path, correlationId));

            _logger.LogInformation("Canceling subscription {SubscriptionId} for user {UserId}",
                subscriptionId, userId);

            var result = await _paymentService.CancelSubscriptionAsync(userId, subscriptionId, correlationId);

            return Ok(result);
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning("Invalid subscription cancellation for user {UserId}: {Error}",
                GetCurrentUserId(), ex.Message);
            return BadRequest(ErrorResponseFactory.CreateBadRequestError(correlationId, Request.Path, ex.Message, correlationId));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error canceling subscription {SubscriptionId} for user {UserId}",
                subscriptionId, GetCurrentUserId());
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "An error occurred while canceling the subscription", correlationId));
        }
    }

    /// <summary>
    /// Get subscription history for the current user
    /// Any authenticated user can view their own subscription history
    /// </summary>
    [HttpGet("subscriptions/history")]
    public async Task<ActionResult<List<SubscriptionDto>>> GetSubscriptionHistory()
    {
        var correlationId = GetCorrelationId();
        try
        {
            var userId = GetCurrentUserId();
            if (userId == Guid.Empty)
                return Unauthorized(ErrorResponseFactory.CreateUnauthorizedError(correlationId, Request.Path, correlationId));

            var subscriptions = await _paymentService.GetUserSubscriptionHistoryAsync(userId);

            return Ok(subscriptions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting subscription history for user {UserId}", GetCurrentUserId());
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "An error occurred while retrieving subscription history", correlationId));
        }
    }
}