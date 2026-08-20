using Microsoft.EntityFrameworkCore;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using Stripe;
using System.Text.Json;

namespace GeoLeap.Api.Services;

public interface IFailedPaymentWebhookHandler
{
    Task<bool> HandlePaymentFailedWebhookAsync(string stripeEventId, string eventData, string correlationId);
    Task<bool> HandleInvoicePaymentFailedWebhookAsync(string stripeEventId, string eventData, string correlationId);
    Task<bool> HandlePaymentIntentPaymentFailedWebhookAsync(string stripeEventId, string eventData, string correlationId);
    Task<bool> HandlePaymentSucceededWebhookAsync(string stripeEventId, string eventData, string correlationId);
    Task<bool> HandleSubscriptionPastDueWebhookAsync(string stripeEventId, string eventData, string correlationId);
}

public class FailedPaymentWebhookHandler : IFailedPaymentWebhookHandler
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<FailedPaymentWebhookHandler> _logger;
    private readonly IPaymentRetryService _paymentRetryService;
    private readonly IDunningService _dunningService;
    private readonly IGracePeriodService _gracePeriodService;

    public FailedPaymentWebhookHandler(
        ApplicationDbContext context,
        ILogger<FailedPaymentWebhookHandler> logger,
        IPaymentRetryService paymentRetryService,
        IDunningService dunningService,
        IGracePeriodService gracePeriodService)
    {
        _context = context;
        _logger = logger;
        _paymentRetryService = paymentRetryService;
        _dunningService = dunningService;
        _gracePeriodService = gracePeriodService;
    }

    public async Task<bool> HandlePaymentFailedWebhookAsync(string stripeEventId, string eventData, string correlationId)
    {
        try
        {
            _logger.LogInformation("Processing payment failed webhook {EventId}", stripeEventId);

            var eventObject = JsonSerializer.Deserialize<JsonElement>(eventData);
            var paymentIntentData = eventObject.GetProperty("data").GetProperty("object");

            var paymentIntentId = paymentIntentData.GetProperty("id").GetString();
            var customerId = paymentIntentData.TryGetProperty("customer", out var customerProp) 
                ? customerProp.GetString() 
                : null;

            if (string.IsNullOrEmpty(paymentIntentId))
            {
                _logger.LogError("Payment intent ID not found in webhook data for event {EventId}", stripeEventId);
                return false;
            }

            // Find the corresponding payment transaction
            var paymentTransaction = await _context.PaymentTransactions
                .Include(pt => pt.User)
                .FirstOrDefaultAsync(pt => pt.StripePaymentIntentId == paymentIntentId);

            if (paymentTransaction == null)
            {
                _logger.LogWarning("Payment transaction not found for payment intent {PaymentIntentId}", paymentIntentId);
                return true; // Return true to acknowledge webhook but don't process
            }

            // Extract failure information
            var lastPaymentError = paymentIntentData.TryGetProperty("last_payment_error", out var errorProp) 
                ? errorProp 
                : (JsonElement?)null;

            var declineCode = lastPaymentError?.TryGetProperty("decline_code", out var declineProp) == true
                ? declineProp.GetString() ?? "generic_decline"
                : "generic_decline";

            var failureMessage = lastPaymentError?.TryGetProperty("message", out var messageProp) == true
                ? messageProp.GetString() ?? ""
                : "Payment failed";

            var failureType = DetermineFailureType(declineCode, lastPaymentError);

            // Update payment transaction status
            paymentTransaction.Status = "failed";
            paymentTransaction.FailureReason = failureMessage;
            paymentTransaction.UpdatedAt = DateTime.UtcNow;
            paymentTransaction.ProcessedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Create failed payment record and trigger dunning process
            var failedPaymentDto = await _paymentRetryService.CreateFailedPaymentAsync(
                paymentTransaction.UserId,
                paymentTransaction.Id,
                failureType,
                declineCode,
                failureMessage,
                correlationId);

            _logger.LogInformation("Created failed payment record {FailedPaymentId} for payment intent {PaymentIntentId}",
                failedPaymentDto.Id, paymentIntentId);

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing payment failed webhook {EventId}", stripeEventId);
            return false;
        }
    }

    public async Task<bool> HandleInvoicePaymentFailedWebhookAsync(string stripeEventId, string eventData, string correlationId)
    {
        try
        {
            _logger.LogInformation("Processing invoice payment failed webhook {EventId}", stripeEventId);

            var eventObject = JsonSerializer.Deserialize<JsonElement>(eventData);
            var invoiceData = eventObject.GetProperty("data").GetProperty("object");

            var invoiceId = invoiceData.GetProperty("id").GetString();
            var customerId = invoiceData.GetProperty("customer").GetString();
            var subscriptionId = invoiceData.TryGetProperty("subscription", out var subProp) 
                ? subProp.GetString() 
                : null;

            if (string.IsNullOrEmpty(invoiceId) || string.IsNullOrEmpty(customerId))
            {
                _logger.LogError("Required invoice data not found in webhook for event {EventId}", stripeEventId);
                return false;
            }

            // Find the user by Stripe customer ID
            var stripeCustomer = await _context.StripeCustomers
                .Include(sc => sc.User)
                .FirstOrDefaultAsync(sc => sc.StripeCustomerId == customerId);

            if (stripeCustomer == null)
            {
                _logger.LogWarning("Stripe customer not found for customer ID {CustomerId}", customerId);
                return true;
            }

            // Find or create payment transaction for this invoice
            var paymentTransaction = await FindOrCreateInvoicePaymentTransactionAsync(
                invoiceData, stripeCustomer.UserId, correlationId);

            // Extract failure information from invoice
            var attemptCount = invoiceData.TryGetProperty("attempt_count", out var attemptProp) 
                ? attemptProp.GetInt32() 
                : 1;

            var nextPaymentAttempt = invoiceData.TryGetProperty("next_payment_attempt", out var nextAttemptProp)
                ? DateTimeOffset.FromUnixTimeSeconds(nextAttemptProp.GetInt64()).DateTime
                : (DateTime?)null;

            // Create failed payment record
            var failureType = subscriptionId != null ? "subscription_payment_failure" : "invoice_payment_failure";
            var failedPaymentDto = await _paymentRetryService.CreateFailedPaymentAsync(
                stripeCustomer.UserId,
                paymentTransaction.Id,
                failureType,
                "payment_intent_authentication_failure", // Default decline code for invoice failures
                $"Invoice payment failed (attempt {attemptCount})",
                correlationId);

            // If this is a subscription invoice, handle subscription-specific logic
            if (!string.IsNullOrEmpty(subscriptionId))
            {
                await HandleSubscriptionPaymentFailureAsync(subscriptionId, failedPaymentDto.Id, correlationId);
            }

            _logger.LogInformation("Processed invoice payment failure for invoice {InvoiceId}, user {UserId}",
                invoiceId, stripeCustomer.UserId);

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing invoice payment failed webhook {EventId}", stripeEventId);
            return false;
        }
    }

    public async Task<bool> HandlePaymentIntentPaymentFailedWebhookAsync(string stripeEventId, string eventData, string correlationId)
    {
        try
        {
            _logger.LogInformation("Processing payment intent failed webhook {EventId}", stripeEventId);

            var eventObject = JsonSerializer.Deserialize<JsonElement>(eventData);
            var paymentIntentData = eventObject.GetProperty("data").GetProperty("object");

            var paymentIntentId = paymentIntentData.GetProperty("id").GetString();
            
            if (string.IsNullOrEmpty(paymentIntentId))
            {
                _logger.LogError("Payment intent ID not found in webhook data for event {EventId}", stripeEventId);
                return false;
            }

            // Find the payment transaction
            var paymentTransaction = await _context.PaymentTransactions
                .Include(pt => pt.User)
                .FirstOrDefaultAsync(pt => pt.StripePaymentIntentId == paymentIntentId);

            if (paymentTransaction == null)
            {
                _logger.LogWarning("Payment transaction not found for payment intent {PaymentIntentId}", paymentIntentId);
                return true;
            }

            // Check if this failure has already been processed
            var existingFailedPayment = await _context.FailedPayments
                .FirstOrDefaultAsync(fp => fp.PaymentTransactionId == paymentTransaction.Id);

            if (existingFailedPayment != null)
            {
                _logger.LogInformation("Failed payment already exists for transaction {TransactionId}", paymentTransaction.Id);
                return true;
            }

            // Extract detailed failure information
            var lastPaymentError = paymentIntentData.TryGetProperty("last_payment_error", out var errorProp) 
                ? errorProp 
                : (JsonElement?)null;

            var declineCode = lastPaymentError?.TryGetProperty("decline_code", out var declineProp) == true
                ? declineProp.GetString() ?? "generic_decline"
                : "generic_decline";

            var failureMessage = lastPaymentError?.TryGetProperty("message", out var messageProp) == true
                ? messageProp.GetString() ?? ""
                : "Payment intent failed";

            var failureType = DetermineFailureType(declineCode, lastPaymentError);

            // Update payment transaction
            paymentTransaction.Status = "failed";
            paymentTransaction.FailureReason = failureMessage;
            paymentTransaction.UpdatedAt = DateTime.UtcNow;
            paymentTransaction.ProcessedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Create failed payment and start recovery process
            await _paymentRetryService.CreateFailedPaymentAsync(
                paymentTransaction.UserId,
                paymentTransaction.Id,
                failureType,
                declineCode,
                failureMessage,
                correlationId);

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing payment intent failed webhook {EventId}", stripeEventId);
            return false;
        }
    }

    public async Task<bool> HandlePaymentSucceededWebhookAsync(string stripeEventId, string eventData, string correlationId)
    {
        try
        {
            _logger.LogInformation("Processing payment succeeded webhook {EventId}", stripeEventId);

            var eventObject = JsonSerializer.Deserialize<JsonElement>(eventData);
            var paymentIntentData = eventObject.GetProperty("data").GetProperty("object");

            var paymentIntentId = paymentIntentData.GetProperty("id").GetString();
            
            if (string.IsNullOrEmpty(paymentIntentId))
                return false;

            // Find the payment transaction
            var paymentTransaction = await _context.PaymentTransactions
                .FirstOrDefaultAsync(pt => pt.StripePaymentIntentId == paymentIntentId);

            if (paymentTransaction == null)
                return true; // Webhook for payment not in our system

            // Update payment transaction status
            paymentTransaction.Status = "succeeded";
            paymentTransaction.UpdatedAt = DateTime.UtcNow;
            paymentTransaction.ProcessedAt = DateTime.UtcNow;

            // Check if this resolves any failed payment
            var failedPayment = await _context.FailedPayments
                .FirstOrDefaultAsync(fp => fp.PaymentTransactionId == paymentTransaction.Id && fp.RecoveryStatus == "active");

            if (failedPayment != null)
            {
                // Resolve the failed payment
                await _paymentRetryService.UpdateFailedPaymentStatusAsync(failedPayment.Id, "resolved", correlationId);

                _logger.LogInformation("Resolved failed payment {FailedPaymentId} via successful webhook", failedPayment.Id);
            }

            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing payment succeeded webhook {EventId}", stripeEventId);
            return false;
        }
    }

    public async Task<bool> HandleSubscriptionPastDueWebhookAsync(string stripeEventId, string eventData, string correlationId)
    {
        try
        {
            _logger.LogInformation("Processing subscription past due webhook {EventId}", stripeEventId);

            var eventObject = JsonSerializer.Deserialize<JsonElement>(eventData);
            var subscriptionData = eventObject.GetProperty("data").GetProperty("object");

            var subscriptionId = subscriptionData.GetProperty("id").GetString();
            var customerId = subscriptionData.GetProperty("customer").GetString();

            if (string.IsNullOrEmpty(subscriptionId) || string.IsNullOrEmpty(customerId))
                return false;

            // Find the subscription
            var subscription = await _context.Subscriptions
                .Include(s => s.User)
                .FirstOrDefaultAsync(s => s.StripeSubscriptionId == subscriptionId);

            if (subscription == null)
            {
                _logger.LogWarning("Subscription not found for Stripe subscription {SubscriptionId}", subscriptionId);
                return true;
            }

            // Update subscription status
            subscription.Status = "past_due";
            subscription.UpdatedAt = DateTime.UtcNow;

            // Create a synthetic failed payment record for past due subscription
            var syntheticTransaction = new PaymentTransaction
            {
                Id = Guid.NewGuid(),
                UserId = subscription.UserId,
                StripePaymentIntentId = $"past_due_{subscriptionId}_{DateTime.UtcNow:yyyyMMddHHmmss}",
                Status = "failed",
                Amount = subscription.Amount,
                Currency = subscription.Currency,
                Description = $"Past due subscription payment - {subscription.PlanType}",
                StripeCustomerId = customerId,
                StripeSubscriptionId = subscriptionId,
                FailureReason = "Subscription payment past due",
                CorrelationId = correlationId,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                ProcessedAt = DateTime.UtcNow
            };

            _context.PaymentTransactions.Add(syntheticTransaction);
            await _context.SaveChangesAsync();

            // Create failed payment record
            await _paymentRetryService.CreateFailedPaymentAsync(
                subscription.UserId,
                syntheticTransaction.Id,
                "subscription_past_due",
                "subscription_payment_failed",
                "Subscription payment is past due",
                correlationId);

            _logger.LogInformation("Created failed payment record for past due subscription {SubscriptionId}, user {UserId}",
                subscriptionId, subscription.UserId);

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing subscription past due webhook {EventId}", stripeEventId);
            return false;
        }
    }

    // Private helper methods
    private static string DetermineFailureType(string declineCode, JsonElement? lastPaymentError)
    {
        return declineCode switch
        {
            "insufficient_funds" => "insufficient_funds",
            "expired_card" => "expired_card",
            "incorrect_cvc" => "incorrect_cvc",
            "card_declined" => "card_declined",
            "processing_error" => "processing_error",
            "authentication_required" => "authentication_required",
            "lost_card" or "stolen_card" => "card_security_issue",
            "fraudulent" => "fraud_suspected",
            "issuer_not_available" => "issuer_unavailable",
            _ => "generic_decline"
        };
    }

    private async Task<PaymentTransaction> FindOrCreateInvoicePaymentTransactionAsync(JsonElement invoiceData, Guid userId, string correlationId)
    {
        var invoiceId = invoiceData.GetProperty("id").GetString() ?? "";
        var amount = invoiceData.GetProperty("amount_due").GetDecimal() / 100; // Convert from cents
        var currency = invoiceData.GetProperty("currency").GetString() ?? "usd";
        var subscriptionId = invoiceData.TryGetProperty("subscription", out var subProp) ? subProp.GetString() : null;

        // Try to find existing transaction
        var existingTransaction = await _context.PaymentTransactions
            .FirstOrDefaultAsync(pt => pt.UserId == userId 
                                    && pt.StripeSubscriptionId == subscriptionId
                                    && pt.Amount == amount
                                    && pt.Status == "pending"
                                    && pt.CreatedAt >= DateTime.UtcNow.AddDays(-7));

        if (existingTransaction != null)
            return existingTransaction;

        // Create new transaction for the invoice
        var transaction = new PaymentTransaction
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            StripePaymentIntentId = $"invoice_{invoiceId}",
            Status = "failed",
            Amount = amount,
            Currency = currency,
            Description = "Subscription invoice payment",
            StripeSubscriptionId = subscriptionId ?? "",
            FailureReason = "Invoice payment failed",
            CorrelationId = correlationId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
            ProcessedAt = DateTime.UtcNow
        };

        _context.PaymentTransactions.Add(transaction);
        await _context.SaveChangesAsync();

        return transaction;
    }

    private async Task HandleSubscriptionPaymentFailureAsync(string subscriptionId, Guid failedPaymentId, string correlationId)
    {
        try
        {
            // Update subscription status to past_due
            var subscription = await _context.Subscriptions
                .FirstOrDefaultAsync(s => s.StripeSubscriptionId == subscriptionId);

            if (subscription != null)
            {
                subscription.Status = "past_due";
                subscription.UpdatedAt = DateTime.UtcNow;

                // Log subscription-specific analytics
                await _dunningService.LogDunningAnalyticsAsync("subscription_past_due", null, null, subscription.UserId, 
                    false, correlationId, new Dictionary<string, object>
                    {
                        ["subscription_id"] = subscription.Id,
                        ["stripe_subscription_id"] = subscriptionId,
                        ["plan_type"] = subscription.PlanType,
                        ["amount"] = subscription.Amount,
                        ["currency"] = subscription.Currency
                    });

                await _context.SaveChangesAsync();

                _logger.LogInformation("Updated subscription {SubscriptionId} status to past_due", subscriptionId);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error handling subscription payment failure for subscription {SubscriptionId}", subscriptionId);
        }
    }

    // Additional webhook handlers for comprehensive payment failure coverage
    public async Task<bool> HandleChargeDisputedWebhookAsync(string stripeEventId, string eventData, string correlationId)
    {
        try
        {
            _logger.LogInformation("Processing charge disputed webhook {EventId}", stripeEventId);

            var eventObject = JsonSerializer.Deserialize<JsonElement>(eventData);
            var disputeData = eventObject.GetProperty("data").GetProperty("object");
            var chargeId = disputeData.GetProperty("charge").GetString();

            if (string.IsNullOrEmpty(chargeId))
                return false;

            // Find the payment transaction by charge
            // Note: This would require storing Stripe charge IDs in PaymentTransaction
            // For now, log the event for manual review
            
            _logger.LogWarning("Charge dispute received for charge {ChargeId}, requires manual review", chargeId);

            // Could create a failed payment record for disputed charges if needed
            // This would trigger a different type of dunning campaign focused on dispute resolution

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing charge disputed webhook {EventId}", stripeEventId);
            return false;
        }
    }

    public async Task<bool> HandleSubscriptionCanceledWebhookAsync(string stripeEventId, string eventData, string correlationId)
    {
        try
        {
            var eventObject = JsonSerializer.Deserialize<JsonElement>(eventData);
            var subscriptionData = eventObject.GetProperty("data").GetProperty("object");

            var subscriptionId = subscriptionData.GetProperty("id").GetString();
            var cancelationReason = subscriptionData.TryGetProperty("cancellation_details", out var cancelProp)
                ? cancelProp.TryGetProperty("reason", out var reasonProp) ? reasonProp.GetString() : null
                : null;

            // If canceled due to payment failure, stop dunning campaigns
            if (cancelationReason == "payment_failed")
            {
                var subscription = await _context.Subscriptions
                    .FirstOrDefaultAsync(s => s.StripeSubscriptionId == subscriptionId);

                if (subscription != null)
                {
                    // Find active failed payments for this subscription
                    var activeFailedPayments = await _context.FailedPayments
                        .Where(fp => fp.SubscriptionId == subscription.Id && fp.RecoveryStatus == "active")
                        .ToListAsync();

                    foreach (var failedPayment in activeFailedPayments)
                    {
                        await _dunningService.StopDunningCampaignAsync(failedPayment.Id, "subscription_cancelled", correlationId);
                        await _gracePeriodService.EndGracePeriodAsync(failedPayment.Id, "subscription_cancelled", correlationId);
                    }

                    _logger.LogInformation("Stopped dunning campaigns for canceled subscription {SubscriptionId}", subscriptionId);
                }
            }

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing subscription canceled webhook {EventId}", stripeEventId);
            return false;
        }
    }
}