using GeoLeap.Api.Models;
using Microsoft.Extensions.Logging;
using Stripe;
using System;
using System.Threading.Tasks;
using Polly;
using Polly.CircuitBreaker;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;

namespace GeoLeap.Api.Services;

public interface ISubscriptionErrorHandlingService
{
    Task<T> ExecuteWithRetryAsync<T>(Func<Task<T>> operation, string operationName, string correlationId);
    Task<bool> HandleStripeWebhookErrorAsync(StripeException ex, string eventId, string correlationId);
    Task<SubscriptionErrorResponse> CreateErrorResponseAsync(Exception ex, string operation, string correlationId);
    Task LogSubscriptionFailureAsync(string operation, Guid userId, Exception ex, string correlationId);
}

public class SubscriptionErrorHandlingService : ISubscriptionErrorHandlingService
{
    private readonly ILogger<SubscriptionErrorHandlingService> _logger;
    private readonly IAsyncPolicy _retryPolicy;
    private readonly IAsyncPolicy _circuitBreakerPolicy;

    public SubscriptionErrorHandlingService(ILogger<SubscriptionErrorHandlingService> logger)
    {
        _logger = logger;

        // Retry policy for transient failures
        _retryPolicy = Policy
            .Handle<StripeException>(ex => IsRetriableStripeError(ex))
            .Or<HttpRequestException>()
            .Or<TaskCanceledException>()
            .WaitAndRetryAsync(
                retryCount: 3,
                sleepDurationProvider: retryAttempt => TimeSpan.FromSeconds(Math.Pow(2, retryAttempt)),
                onRetry: (outcome, timespan, retryCount, context) =>
                {
                    var correlationId = context.GetValueOrDefault("CorrelationId", "unknown");
                    var exceptionMessage = outcome?.Message ?? "Unknown error";
                    _logger.LogWarning("Subscription operation retry {RetryCount} after {Delay}ms. CorrelationId: {CorrelationId}. Exception: {Exception}",
                        retryCount, timespan.TotalMilliseconds, correlationId, exceptionMessage);
                });

        // Circuit breaker for critical failures
        _circuitBreakerPolicy = Policy
            .Handle<StripeException>(ex => IsCriticalStripeError(ex))
            .CircuitBreakerAsync(
                exceptionsAllowedBeforeBreaking: 5,
                durationOfBreak: TimeSpan.FromMinutes(2),
                onBreak: (exception, duration) =>
                {
                    _logger.LogCritical("Subscription circuit breaker opened for {Duration}s due to: {Exception}",
                        duration.TotalSeconds, exception.Message);
                },
                onReset: () =>
                {
                    _logger.LogInformation("Subscription circuit breaker reset - service recovered");
                });
    }

    public async Task<T> ExecuteWithRetryAsync<T>(Func<Task<T>> operation, string operationName, string correlationId)
    {
        var context = new Context(operationName);
        context["CorrelationId"] = correlationId;

        try
        {
            return await _retryPolicy.ExecuteAsync(async (ctx) =>
            {
                return await _circuitBreakerPolicy.ExecuteAsync(async () =>
                {
                    return await operation();
                });
            }, context);
        }
        catch (BrokenCircuitException)
        {
            _logger.LogError("Subscription service circuit breaker is open. Operation: {Operation}, CorrelationId: {CorrelationId}",
                operationName, correlationId);
            throw new InvalidOperationException("Subscription service is temporarily unavailable. Please try again later.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Subscription operation {Operation} failed after retries. CorrelationId: {CorrelationId}",
                operationName, correlationId);
            throw;
        }
    }

    public async Task<bool> HandleStripeWebhookErrorAsync(StripeException ex, string eventId, string correlationId)
    {
        try
        {
            _logger.LogError(ex, "Stripe webhook processing failed. EventId: {EventId}, CorrelationId: {CorrelationId}",
                eventId, correlationId);

            // Log critical webhook failures for manual intervention
            if (IsCriticalWebhookEvent(eventId))
            {
                _logger.LogCritical("Critical Stripe webhook failed - manual intervention required. EventId: {EventId}, Error: {Error}",
                    eventId, ex.Message);
                
                // TODO: Send alert to operations team
                return false;
            }

            // For non-critical events, log and continue
            _logger.LogWarning("Non-critical Stripe webhook failed. EventId: {EventId}, Error: {Error}",
                eventId, ex.Message);
            
            return true;
        }
        catch (Exception logEx)
        {
            // Don't let logging errors break the webhook processing
            _logger.LogError(logEx, "Error handling webhook error. EventId: {EventId}", eventId);
            return false;
        }
    }

    public async Task<SubscriptionErrorResponse> CreateErrorResponseAsync(Exception ex, string operation, string correlationId)
    {
        var errorType = ClassifyError(ex);
        var userMessage = GetUserFriendlyMessage(errorType, ex);
        
        _logger.LogError(ex, "Subscription error: {Operation}, Type: {ErrorType}, CorrelationId: {CorrelationId}",
            operation, errorType, correlationId);

        return await Task.FromResult(new SubscriptionErrorResponse
        {
            CorrelationId = correlationId,
            ErrorCode = errorType,
            UserMessage = userMessage,
            TechnicalMessage = ex.Message,
            Timestamp = DateTime.UtcNow,
            Operation = operation,
            IsRetriable = IsRetriableError(ex),
            RetryAfterSeconds = GetRetryDelaySeconds(ex)
        });
    }

    public async Task LogSubscriptionFailureAsync(string operation, Guid userId, Exception ex, string correlationId)
    {
        try
        {
            var errorDetails = new
            {
                Operation = operation,
                UserId = userId,
                CorrelationId = correlationId,
                ErrorType = ex.GetType().Name,
                ErrorMessage = ex.Message,
                StackTrace = ex.StackTrace,
                Timestamp = DateTime.UtcNow
            };

            _logger.LogError(ex, "Subscription operation failed: {@ErrorDetails}", errorDetails);

            // TODO: Store in database for analytics and monitoring
            await Task.CompletedTask;
        }
        catch (Exception logEx)
        {
            // Don't let logging errors propagate
            _logger.LogError(logEx, "Failed to log subscription failure for operation {Operation}", operation);
        }
    }

    private static bool IsRetriableStripeError(StripeException ex)
    {
        // HTTP status code based retries
        if (ex.HttpStatusCode == System.Net.HttpStatusCode.TooManyRequests ||
            ex.HttpStatusCode == System.Net.HttpStatusCode.InternalServerError ||
            ex.HttpStatusCode == System.Net.HttpStatusCode.BadGateway ||
            ex.HttpStatusCode == System.Net.HttpStatusCode.ServiceUnavailable ||
            ex.HttpStatusCode == System.Net.HttpStatusCode.GatewayTimeout)
        {
            return true;
        }

        // Error code based retries (user can fix these by updating payment method)
        return ex.StripeError?.Code switch
        {
            "card_declined" => true,
            "insufficient_funds" => true,
            "authentication_required" => true,
            "rate_limit_error" => true,
            _ => false
        };
    }

    private static bool IsCriticalStripeError(StripeException ex)
    {
        return ex.HttpStatusCode == System.Net.HttpStatusCode.InternalServerError ||
               ex.HttpStatusCode == System.Net.HttpStatusCode.BadGateway ||
               ex.HttpStatusCode == System.Net.HttpStatusCode.ServiceUnavailable;
    }

    private static bool IsCriticalWebhookEvent(string eventId)
    {
        // Events that affect billing or subscription status are critical
        var criticalEventTypes = new[]
        {
            "invoice.payment_succeeded",
            "invoice.payment_failed",
            "customer.subscription.updated",
            "customer.subscription.deleted"
        };

        return Array.Exists(criticalEventTypes, eventType => eventId.StartsWith(eventType));
    }

    private static string ClassifyError(Exception ex)
    {
        return ex switch
        {
            StripeException stripeEx => stripeEx.StripeError?.Code switch
            {
                "card_declined" => "PAYMENT_DECLINED",
                "insufficient_funds" => "INSUFFICIENT_FUNDS",
                "invalid_request_error" => "INVALID_REQUEST",
                "authentication_required" => "AUTH_REQUIRED",
                "rate_limit_error" => "RATE_LIMITED",
                _ => "STRIPE_ERROR"
            },
            UnauthorizedAccessException => "UNAUTHORIZED",
            InvalidOperationException => "INVALID_OPERATION",
            TimeoutException => "TIMEOUT",
            HttpRequestException => "NETWORK_ERROR",
            _ => "UNKNOWN_ERROR"
        };
    }

    private static string GetUserFriendlyMessage(string errorType, Exception ex)
    {
        return errorType switch
        {
            "PAYMENT_DECLINED" => "Your payment method was declined. Please update your payment information and try again.",
            "INSUFFICIENT_FUNDS" => "Your payment method has insufficient funds. Please update your payment information.",
            "AUTH_REQUIRED" => "Additional authentication is required for your payment method. Please check your bank or card issuer.",
            "RATE_LIMITED" => "Too many requests. Please wait a moment and try again.",
            "INVALID_REQUEST" => "Invalid request. Please check your subscription details and try again.",
            "UNAUTHORIZED" => "You are not authorized to perform this action.",
            "INVALID_OPERATION" => ex.Message, // Pass through specific business logic errors
            "TIMEOUT" => "The operation timed out. Please try again.",
            "NETWORK_ERROR" => "Network error occurred. Please check your connection and try again.",
            "STRIPE_ERROR" => "Payment processing error occurred. Please try again or contact support.",
            _ => "An unexpected error occurred. Please try again or contact support."
        };
    }

    private static bool IsRetriableError(Exception ex)
    {
        return ex switch
        {
            StripeException stripeEx => IsRetriableStripeError(stripeEx),
            HttpRequestException => true,
            TaskCanceledException => true,
            TimeoutException => true,
            _ => false
        };
    }

    private static int GetRetryDelaySeconds(Exception ex)
    {
        return ex switch
        {
            StripeException { StripeError.Code: "rate_limit_error" } => 60,
            HttpRequestException => 30,
            TaskCanceledException => 15,
            TimeoutException => 30,
            _ => 0
        };
    }
}

public class SubscriptionErrorResponse
{
    public string CorrelationId { get; set; } = string.Empty;
    public string ErrorCode { get; set; } = string.Empty;
    public string UserMessage { get; set; } = string.Empty;
    public string TechnicalMessage { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    public string Operation { get; set; } = string.Empty;
    public bool IsRetriable { get; set; }
    public int RetryAfterSeconds { get; set; }
}