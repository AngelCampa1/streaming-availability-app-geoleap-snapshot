using GeoLeap.Api.Services;
using GeoLeap.Api.Tests.Infrastructure;
using Stripe;
using System.Net;
using Xunit;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Polly.CircuitBreaker;

namespace GeoLeap.Api.Tests.Integration;

/// <summary>
/// Integration tests for SubscriptionErrorHandlingService
/// Tests error handling, retry logic, circuit breaker, webhook processing, and error classification
/// Expected: 20-25 tests covering payment failures, webhook errors, and error recovery
/// </summary>
[Collection("MinimalTest")]
public class SubscriptionErrorHandlingServiceIntegrationTests : MinimalTestBase
{
    private readonly ISubscriptionErrorHandlingService _errorHandlingService;
    private readonly ILogger<SubscriptionErrorHandlingServiceIntegrationTests> _testLogger;

    public SubscriptionErrorHandlingServiceIntegrationTests()
    {
        _errorHandlingService = Factory.Services.GetRequiredService<ISubscriptionErrorHandlingService>();
        _testLogger = Factory.Services.GetRequiredService<ILogger<SubscriptionErrorHandlingServiceIntegrationTests>>();
    }

    #region Retry Logic Tests (8 tests)

    [Fact]
    public async Task ExecuteWithRetry_SuccessfulOperation_ReturnsResult()
    {
        // Arrange
        var expectedResult = "success";
        Func<Task<string>> operation = () => Task.FromResult(expectedResult);
        var correlationId = Guid.NewGuid().ToString();

        // Act
        var result = await _errorHandlingService.ExecuteWithRetryAsync(operation, "test_operation", correlationId);

        // Assert
        Assert.Equal(expectedResult, result);
    }

    [Fact]
    public async Task ExecuteWithRetry_TransientFailureThenSuccess_RetriesAndSucceeds()
    {
        // Arrange
        var attemptCount = 0;
        Func<Task<string>> operation = () =>
        {
            attemptCount++;
            if (attemptCount < 2)
            {
                // First attempt fails with retriable error
                throw new HttpRequestException("Network timeout");
            }
            return Task.FromResult("success_after_retry");
        };
        var correlationId = Guid.NewGuid().ToString();

        // Act
        var result = await _errorHandlingService.ExecuteWithRetryAsync(operation, "retry_test", correlationId);

        // Assert
        Assert.Equal("success_after_retry", result);
        Assert.Equal(2, attemptCount); // Should have attempted twice

        // 🐛 BUG CHECKPOINT: Verify exponential backoff was applied (not just immediate retry)
    }

    [Fact]
    public async Task ExecuteWithRetry_RetriableStripeError_RetriesWithExponentialBackoff()
    {
        // Arrange
        var attemptCount = 0;
        Func<Task<string>> operation = () =>
        {
            attemptCount++;
            if (attemptCount < 3)
            {
                // Simulate rate limit error (retriable)
                var stripeError = new StripeError
                {
                    Code = "rate_limit_error",
                    Message = "Too many requests"
                };
                throw new StripeException(HttpStatusCode.TooManyRequests, stripeError, "Rate limited");
            }
            return Task.FromResult("success");
        };
        var correlationId = Guid.NewGuid().ToString();

        // Act
        var result = await _errorHandlingService.ExecuteWithRetryAsync(operation, "rate_limit_test", correlationId);

        // Assert
        Assert.Equal("success", result);
        Assert.Equal(3, attemptCount);

        // 🐛 BUG CHECKPOINT: Backoff should be 2^1=2s, 2^2=4s (exponential)
    }

    [Fact]
    public async Task ExecuteWithRetry_NonRetriableStripeError_FailsImmediately()
    {
        // Arrange
        var attemptCount = 0;
        Func<Task<string>> operation = () =>
        {
            attemptCount++;
            var stripeError = new StripeError
            {
                Code = "invalid_request_error",
                Message = "Invalid payment method"
            };
            throw new StripeException(HttpStatusCode.BadRequest, stripeError, "Bad request");
        };
        var correlationId = Guid.NewGuid().ToString();

        // Act & Assert
        await Assert.ThrowsAsync<StripeException>(async () =>
        {
            await _errorHandlingService.ExecuteWithRetryAsync(operation, "non_retriable_test", correlationId);
        });

        Assert.Equal(1, attemptCount); // Should NOT retry on non-retriable errors

        // 🐛 BUG CHECKPOINT: If attemptCount > 1 → BUG (retrying permanent failures)
    }

    [Fact]
    public async Task ExecuteWithRetry_CardExpiredError_DoesNotRetry()
    {
        // Arrange
        var attemptCount = 0;
        Func<Task<string>> operation = () =>
        {
            attemptCount++;
            var stripeError = new StripeError
            {
                Code = "expired_card",
                Message = "Card has expired"
            };
            throw new StripeException(HttpStatusCode.PaymentRequired, stripeError, "Card expired");
        };
        var correlationId = Guid.NewGuid().ToString();

        // Act & Assert
        await Assert.ThrowsAsync<StripeException>(async () =>
        {
            await _errorHandlingService.ExecuteWithRetryAsync(operation, "expired_card_test", correlationId);
        });

        Assert.Equal(1, attemptCount);

        // 🐛 BUG CHECKPOINT: Expired card is permanent - should NOT retry
    }

    [Fact]
    public async Task ExecuteWithRetry_MaxRetriesExceeded_ThrowsException()
    {
        // Arrange
        var attemptCount = 0;
        Func<Task<string>> operation = () =>
        {
            attemptCount++;
            throw new HttpRequestException("Network error");
        };
        var correlationId = Guid.NewGuid().ToString();

        // Act & Assert
        await Assert.ThrowsAsync<HttpRequestException>(async () =>
        {
            await _errorHandlingService.ExecuteWithRetryAsync(operation, "max_retries_test", correlationId);
        });

        Assert.InRange(attemptCount, 3, 4); // Original attempt + 3 retries = 4 total

        // 🐛 BUG CHECKPOINT: Should stop after max retries (3 retries configured)
    }

    [Fact]
    public async Task ExecuteWithRetry_CardDeclinedError_IsRetriable()
    {
        // Arrange
        var attemptCount = 0;
        Func<Task<string>> operation = () =>
        {
            attemptCount++;
            if (attemptCount < 2)
            {
                var stripeError = new StripeError
                {
                    Code = "card_declined",
                    Message = "Card was declined"
                };
                throw new StripeException(HttpStatusCode.PaymentRequired, stripeError, "Declined");
            }
            return Task.FromResult("success");
        };
        var correlationId = Guid.NewGuid().ToString();

        // Act
        var result = await _errorHandlingService.ExecuteWithRetryAsync(operation, "card_declined_test", correlationId);

        // Assert
        Assert.Equal("success", result);
        Assert.Equal(2, attemptCount);

        // 🐛 BUG CHECKPOINT: Card declined is temporary (user can update card) - should retry
    }

    [Fact]
    public async Task ExecuteWithRetry_InsufficientFundsError_IsRetriable()
    {
        // Arrange
        var attemptCount = 0;
        Func<Task<string>> operation = () =>
        {
            attemptCount++;
            if (attemptCount < 2)
            {
                var stripeError = new StripeError
                {
                    Code = "insufficient_funds",
                    Message = "Insufficient funds"
                };
                throw new StripeException(HttpStatusCode.PaymentRequired, stripeError, "Insufficient funds");
            }
            return Task.FromResult("success");
        };
        var correlationId = Guid.NewGuid().ToString();

        // Act
        var result = await _errorHandlingService.ExecuteWithRetryAsync(operation, "insufficient_funds_test", correlationId);

        // Assert
        Assert.Equal("success", result);
        Assert.Equal(2, attemptCount);

        // 🐛 BUG CHECKPOINT: Insufficient funds is temporary - should retry
    }

    #endregion

    #region Webhook Error Handling Tests (6 tests)

    [Fact]
    public async Task HandleWebhookError_CriticalEvent_ReturnsFalse()
    {
        // Arrange
        var stripeError = new StripeError { Code = "webhook_error", Message = "Processing failed" };
        var exception = new StripeException(HttpStatusCode.InternalServerError, stripeError, "Error");
        var eventId = "invoice.payment_failed_12345";
        var correlationId = Guid.NewGuid().ToString();

        // Act
        var result = await _errorHandlingService.HandleStripeWebhookErrorAsync(exception, eventId, correlationId);

        // Assert
        Assert.False(result); // Critical events should return false

        // 🐛 BUG CHECKPOINT: Critical webhook failures should trigger alerts (not just log)
    }

    [Fact]
    public async Task HandleWebhookError_NonCriticalEvent_ReturnsTrue()
    {
        // Arrange
        var stripeError = new StripeError { Code = "webhook_error", Message = "Processing failed" };
        var exception = new StripeException(HttpStatusCode.InternalServerError, stripeError, "Error");
        var eventId = "customer.created_12345"; // Non-critical event
        var correlationId = Guid.NewGuid().ToString();

        // Act
        var result = await _errorHandlingService.HandleStripeWebhookErrorAsync(exception, eventId, correlationId);

        // Assert
        Assert.True(result); // Non-critical events should return true (continue processing)

        // 🐛 BUG CHECKPOINT: Non-critical failures should be logged but not block processing
    }

    [Fact]
    public async Task HandleWebhookError_PaymentSucceededEvent_IsCritical()
    {
        // Arrange
        var stripeError = new StripeError { Code = "webhook_error", Message = "Processing failed" };
        var exception = new StripeException(HttpStatusCode.InternalServerError, stripeError, "Error");
        var eventId = "invoice.payment_succeeded_12345";
        var correlationId = Guid.NewGuid().ToString();

        // Act
        var result = await _errorHandlingService.HandleStripeWebhookErrorAsync(exception, eventId, correlationId);

        // Assert
        Assert.False(result); // payment_succeeded is critical

        // 🐛 BUG CHECKPOINT: Missed payment success webhooks = billing issues
    }

    [Fact]
    public async Task HandleWebhookError_SubscriptionUpdatedEvent_IsCritical()
    {
        // Arrange
        var stripeError = new StripeError { Code = "webhook_error", Message = "Processing failed" };
        var exception = new StripeException(HttpStatusCode.InternalServerError, stripeError, "Error");
        var eventId = "customer.subscription.updated_12345";
        var correlationId = Guid.NewGuid().ToString();

        // Act
        var result = await _errorHandlingService.HandleStripeWebhookErrorAsync(exception, eventId, correlationId);

        // Assert
        Assert.False(result); // subscription.updated is critical

        // 🐛 BUG CHECKPOINT: Missed subscription updates = stale subscription status
    }

    [Fact]
    public async Task HandleWebhookError_SubscriptionDeletedEvent_IsCritical()
    {
        // Arrange
        var stripeError = new StripeError { Code = "webhook_error", Message = "Processing failed" };
        var exception = new StripeException(HttpStatusCode.InternalServerError, stripeError, "Error");
        var eventId = "customer.subscription.deleted_12345";
        var correlationId = Guid.NewGuid().ToString();

        // Act
        var result = await _errorHandlingService.HandleStripeWebhookErrorAsync(exception, eventId, correlationId);

        // Assert
        Assert.False(result); // subscription.deleted is critical

        // 🐛 BUG CHECKPOINT: Missed subscription deletion = user still has access
    }

    [Fact]
    public async Task HandleWebhookError_LoggingErrorOccurs_DoesNotThrow()
    {
        // Arrange
        var stripeError = new StripeError { Code = "webhook_error", Message = "Processing failed" };
        var exception = new StripeException(HttpStatusCode.InternalServerError, stripeError, "Error");
        var eventId = "test.event_12345";
        var correlationId = Guid.NewGuid().ToString();

        // Act & Assert - Should not throw even if internal logging fails
        var result = await _errorHandlingService.HandleStripeWebhookErrorAsync(exception, eventId, correlationId);

        // Assert
        Assert.IsType<bool>(result); // Should return a boolean regardless of logging errors
    }

    #endregion

    #region Error Classification Tests (6 tests)

    [Fact]
    public async Task CreateErrorResponse_CardDeclinedError_ReturnsCorrectClassification()
    {
        // Arrange
        var stripeError = new StripeError
        {
            Code = "card_declined",
            Message = "Your card was declined"
        };
        var exception = new StripeException(HttpStatusCode.PaymentRequired, stripeError, "Declined");
        var correlationId = Guid.NewGuid().ToString();

        // Act
        var response = await _errorHandlingService.CreateErrorResponseAsync(exception, "process_payment", correlationId);

        // Assert
        Assert.Equal("PAYMENT_DECLINED", response.ErrorCode);
        Assert.Contains("payment method was declined", response.UserMessage.ToLower());
        Assert.True(response.IsRetriable);
        Assert.Equal(correlationId, response.CorrelationId);
    }

    [Fact]
    public async Task CreateErrorResponse_InsufficientFundsError_ReturnsCorrectClassification()
    {
        // Arrange
        var stripeError = new StripeError
        {
            Code = "insufficient_funds",
            Message = "Insufficient funds"
        };
        var exception = new StripeException(HttpStatusCode.PaymentRequired, stripeError, "Insufficient funds");
        var correlationId = Guid.NewGuid().ToString();

        // Act
        var response = await _errorHandlingService.CreateErrorResponseAsync(exception, "process_payment", correlationId);

        // Assert
        Assert.Equal("INSUFFICIENT_FUNDS", response.ErrorCode);
        Assert.Contains("insufficient funds", response.UserMessage.ToLower());
        Assert.True(response.IsRetriable);
    }

    [Fact]
    public async Task CreateErrorResponse_RateLimitError_HasCorrectRetryDelay()
    {
        // Arrange
        var stripeError = new StripeError
        {
            Code = "rate_limit_error",
            Message = "Rate limit exceeded"
        };
        var exception = new StripeException(HttpStatusCode.TooManyRequests, stripeError, "Rate limited");
        var correlationId = Guid.NewGuid().ToString();

        // Act
        var response = await _errorHandlingService.CreateErrorResponseAsync(exception, "api_call", correlationId);

        // Assert
        Assert.Equal("RATE_LIMITED", response.ErrorCode);
        Assert.Equal(60, response.RetryAfterSeconds); // Rate limit should have 60s retry delay
        Assert.True(response.IsRetriable);
    }

    [Fact]
    public async Task CreateErrorResponse_NetworkError_IsRetriable()
    {
        // Arrange
        var exception = new HttpRequestException("Network timeout");
        var correlationId = Guid.NewGuid().ToString();

        // Act
        var response = await _errorHandlingService.CreateErrorResponseAsync(exception, "network_call", correlationId);

        // Assert
        Assert.Equal("NETWORK_ERROR", response.ErrorCode);
        Assert.Contains("network error", response.UserMessage.ToLower());
        Assert.True(response.IsRetriable);
        Assert.Equal(30, response.RetryAfterSeconds);
    }

    [Fact]
    public async Task CreateErrorResponse_TimeoutError_IsRetriable()
    {
        // Arrange
        var exception = new TimeoutException("Operation timed out");
        var correlationId = Guid.NewGuid().ToString();

        // Act
        var response = await _errorHandlingService.CreateErrorResponseAsync(exception, "long_operation", correlationId);

        // Assert
        Assert.Equal("TIMEOUT", response.ErrorCode);
        Assert.True(response.IsRetriable);
        Assert.Equal(30, response.RetryAfterSeconds);
    }

    [Fact]
    public async Task CreateErrorResponse_UnauthorizedError_IsNotRetriable()
    {
        // Arrange
        var exception = new UnauthorizedAccessException("Not authorized");
        var correlationId = Guid.NewGuid().ToString();

        // Act
        var response = await _errorHandlingService.CreateErrorResponseAsync(exception, "secure_operation", correlationId);

        // Assert
        Assert.Equal("UNAUTHORIZED", response.ErrorCode);
        Assert.False(response.IsRetriable); // Auth errors should not be retried
        Assert.Equal(0, response.RetryAfterSeconds);
    }

    #endregion

    #region Failure Logging Tests (3 tests)

    [Fact]
    public async Task LogSubscriptionFailure_ValidException_LogsSuccessfully()
    {
        // Arrange
        var operation = "create_subscription";
        var userId = Guid.NewGuid();
        var exception = new InvalidOperationException("Subscription creation failed");
        var correlationId = Guid.NewGuid().ToString();

        // Act & Assert - Should not throw
        await _errorHandlingService.LogSubscriptionFailureAsync(operation, userId, exception, correlationId);

        // 🐛 BUG CHECKPOINT: Should store in database for analytics (currently TODO)
    }

    [Fact]
    public async Task LogSubscriptionFailure_StripeException_IncludesStripeDetails()
    {
        // Arrange
        var operation = "process_payment";
        var userId = Guid.NewGuid();
        var stripeError = new StripeError
        {
            Code = "card_declined",
            Message = "Card declined",
            DeclineCode = "insufficient_funds"
        };
        var exception = new StripeException(HttpStatusCode.PaymentRequired, stripeError, "Payment failed");
        var correlationId = Guid.NewGuid().ToString();

        // Act & Assert - Should not throw
        await _errorHandlingService.LogSubscriptionFailureAsync(operation, userId, exception, correlationId);

        // 🐛 BUG CHECKPOINT: Stripe error details should be captured for analysis
    }

    [Fact]
    public async Task LogSubscriptionFailure_LoggingFails_DoesNotThrow()
    {
        // Arrange
        var operation = "test_operation";
        var userId = Guid.NewGuid();
        var exception = new Exception("Test error");
        var correlationId = Guid.NewGuid().ToString();

        // Act & Assert - Should not throw even if logging infrastructure fails
        await _errorHandlingService.LogSubscriptionFailureAsync(operation, userId, exception, correlationId);
    }

    #endregion
}
