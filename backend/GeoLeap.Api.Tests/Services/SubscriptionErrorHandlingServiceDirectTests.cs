using Xunit;
using Moq;
using Microsoft.Extensions.Logging;
using GeoLeap.Api.Services;
using GeoLeap.Api.Models;
using Stripe;
using Polly.CircuitBreaker;
using System.Net;

namespace GeoLeap.Api.Tests.Services;

/// <summary>
/// Direct tests for SubscriptionErrorHandlingService
/// Tests error handling, retry logic, and circuit breaker patterns
/// </summary>
public class SubscriptionErrorHandlingServiceDirectTests : IDisposable
{
    private readonly Mock<ILogger<SubscriptionErrorHandlingService>> _mockLogger;
    private readonly SubscriptionErrorHandlingService _service;
    private readonly string _testCorrelationId = "test-correlation-id-12345";
    private readonly Guid _testUserId = Guid.NewGuid();

    public SubscriptionErrorHandlingServiceDirectTests()
    {
        _mockLogger = new Mock<ILogger<SubscriptionErrorHandlingService>>();
        _service = new SubscriptionErrorHandlingService(_mockLogger.Object);
    }

    #region ExecuteWithRetryAsync - Success Tests

    [Fact]
    public async Task ExecuteWithRetryAsync_SuccessfulOperation_ReturnsResult()
    {
        // Arrange
        var expectedResult = "success";
        Func<Task<string>> operation = () => Task.FromResult(expectedResult);

        // Act
        var result = await _service.ExecuteWithRetryAsync(operation, "TestOperation", _testCorrelationId);

        // Assert
        Assert.Equal(expectedResult, result);
    }

    [Fact]
    public async Task ExecuteWithRetryAsync_SuccessfulIntOperation_ReturnsValue()
    {
        // Arrange
        var expectedValue = 42;
        Func<Task<int>> operation = () => Task.FromResult(expectedValue);

        // Act
        var result = await _service.ExecuteWithRetryAsync(operation, "IntOperation", _testCorrelationId);

        // Assert
        Assert.Equal(expectedValue, result);
    }

    [Fact]
    public async Task ExecuteWithRetryAsync_SuccessfulComplexObject_ReturnsObject()
    {
        // Arrange
        var expectedObject = new { Id = 1, Name = "Test" };
        Func<Task<object>> operation = () => Task.FromResult<object>(expectedObject);

        // Act
        var result = await _service.ExecuteWithRetryAsync(operation, "ObjectOperation", _testCorrelationId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(expectedObject, result);
    }

    #endregion

    #region ExecuteWithRetryAsync - Retry Tests

    [Fact]
    public async Task ExecuteWithRetryAsync_TransientHttpError_RetriesAndSucceeds()
    {
        // Arrange
        var attemptCount = 0;
        Func<Task<string>> operation = () =>
        {
            attemptCount++;
            if (attemptCount < 2)
                throw new HttpRequestException("Transient network error");
            return Task.FromResult("success");
        };

        // Act
        var result = await _service.ExecuteWithRetryAsync(operation, "RetryOperation", _testCorrelationId);

        // Assert
        Assert.Equal("success", result);
        Assert.Equal(2, attemptCount);
    }

    [Fact]
    public async Task ExecuteWithRetryAsync_TaskCanceledException_RetriesAndSucceeds()
    {
        // Arrange
        var attemptCount = 0;
        Func<Task<string>> operation = () =>
        {
            attemptCount++;
            if (attemptCount < 3)
                throw new TaskCanceledException("Request timeout");
            return Task.FromResult("success");
        };

        // Act
        var result = await _service.ExecuteWithRetryAsync(operation, "TimeoutOperation", _testCorrelationId);

        // Assert
        Assert.Equal("success", result);
        Assert.Equal(3, attemptCount);
    }

    [Fact]
    public async Task ExecuteWithRetryAsync_RetriableStripeError_RetriesAndSucceeds()
    {
        // Arrange
        var attemptCount = 0;
        Func<Task<string>> operation = () =>
        {
            attemptCount++;
            if (attemptCount < 2)
            {
                throw new StripeException("Rate limit")
                {
                    HttpStatusCode = HttpStatusCode.TooManyRequests,
                    StripeError = new StripeError
                    {
                        Code = "rate_limit_error",
                        Message = "Too many requests"
                    }
                };
            }
            return Task.FromResult("success");
        };

        // Act
        var result = await _service.ExecuteWithRetryAsync(operation, "StripeRetryOperation", _testCorrelationId);

        // Assert
        Assert.Equal("success", result);
        Assert.Equal(2, attemptCount);
    }

    [Fact]
    public async Task ExecuteWithRetryAsync_MultipleRetries_LogsWarnings()
    {
        // Arrange
        var attemptCount = 0;
        Func<Task<string>> operation = () =>
        {
            attemptCount++;
            if (attemptCount < 3)
                throw new HttpRequestException("Transient error");
            return Task.FromResult("success");
        };

        // Act
        await _service.ExecuteWithRetryAsync(operation, "LoggingOperation", _testCorrelationId);

        // Assert
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Warning,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("retry")),
                null,
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Exactly(2)); // 2 retries before success
    }

    #endregion

    #region ExecuteWithRetryAsync - Failure Tests

    [Fact]
    public async Task ExecuteWithRetryAsync_PermanentError_ThrowsAfterRetries()
    {
        // Arrange
        Func<Task<string>> operation = () => throw new InvalidOperationException("Permanent error");

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(async () =>
            await _service.ExecuteWithRetryAsync(operation, "FailureOperation", _testCorrelationId));
    }

    [Fact]
    public async Task ExecuteWithRetryAsync_NonRetriableStripeError_ThrowsImmediately()
    {
        // Arrange
        Func<Task<string>> operation = () =>
        {
            throw new StripeException("Invalid request")
            {
                HttpStatusCode = HttpStatusCode.BadRequest,
                StripeError = new StripeError
                {
                    Code = "invalid_request_error",
                    Message = "Invalid request"
                }
            };
        };

        // Act & Assert
        await Assert.ThrowsAsync<StripeException>(async () =>
            await _service.ExecuteWithRetryAsync(operation, "NonRetriableOperation", _testCorrelationId));
    }

    [Fact]
    public async Task ExecuteWithRetryAsync_ExceedsMaxRetries_LogsError()
    {
        // Arrange
        Func<Task<string>> operation = () => throw new HttpRequestException("Always fails");

        // Act & Assert
        await Assert.ThrowsAsync<HttpRequestException>(async () =>
            await _service.ExecuteWithRetryAsync(operation, "MaxRetriesOperation", _testCorrelationId));

        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Error,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("failed after retries")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    #endregion

    #region HandleStripeWebhookErrorAsync Tests

    [Fact]
    public async Task HandleStripeWebhookErrorAsync_CriticalEvent_ReturnsFalse()
    {
        // Arrange
        var exception = new StripeException("Webhook error")
        {
            StripeError = new StripeError { Code = "webhook_error", Message = "Webhook processing failed" }
        };
        var eventId = "invoice.payment_succeeded";

        // Act
        var result = await _service.HandleStripeWebhookErrorAsync(exception, eventId, _testCorrelationId);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task HandleStripeWebhookErrorAsync_CriticalEvent_LogsCritical()
    {
        // Arrange
        var exception = new StripeException("Webhook error")
        {
            StripeError = new StripeError { Code = "webhook_error", Message = "Critical failure" }
        };
        var eventId = "customer.subscription.deleted";

        // Act
        await _service.HandleStripeWebhookErrorAsync(exception, eventId, _testCorrelationId);

        // Assert
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Critical,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Critical Stripe webhook failed")),
                null,
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task HandleStripeWebhookErrorAsync_NonCriticalEvent_ReturnsTrue()
    {
        // Arrange
        var exception = new StripeException("Webhook error")
        {
            StripeError = new StripeError { Code = "webhook_error", Message = "Minor error" }
        };
        var eventId = "customer.created";

        // Act
        var result = await _service.HandleStripeWebhookErrorAsync(exception, eventId, _testCorrelationId);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public async Task HandleStripeWebhookErrorAsync_NonCriticalEvent_LogsWarning()
    {
        // Arrange
        var exception = new StripeException("Webhook error")
        {
            StripeError = new StripeError { Code = "webhook_error", Message = "Non-critical error" }
        };
        var eventId = "charge.updated";

        // Act
        await _service.HandleStripeWebhookErrorAsync(exception, eventId, _testCorrelationId);

        // Assert
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Warning,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Non-critical Stripe webhook failed")),
                null,
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Theory]
    [InlineData("invoice.payment_succeeded")]
    [InlineData("invoice.payment_failed")]
    [InlineData("customer.subscription.updated")]
    [InlineData("customer.subscription.deleted")]
    public async Task HandleStripeWebhookErrorAsync_CriticalEventTypes_ReturnsFalse(string eventId)
    {
        // Arrange
        var exception = new StripeException("Webhook error")
        {
            StripeError = new StripeError { Code = "webhook_error", Message = "Error" }
        };

        // Act
        var result = await _service.HandleStripeWebhookErrorAsync(exception, eventId, _testCorrelationId);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task HandleStripeWebhookErrorAsync_LogsErrorWithDetails()
    {
        // Arrange
        var exception = new StripeException("Test exception")
        {
            StripeError = new StripeError { Code = "test_error", Message = "Test message" }
        };
        var eventId = "test.event";

        // Act
        await _service.HandleStripeWebhookErrorAsync(exception, eventId, _testCorrelationId);

        // Assert
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Error,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Stripe webhook processing failed")),
                exception,
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    #endregion

    #region CreateErrorResponseAsync Tests

    [Fact]
    public async Task CreateErrorResponseAsync_StripeCardDeclined_CreatesCorrectResponse()
    {
        // Arrange
        var exception = new StripeException("Card declined")
        {
            StripeError = new StripeError
            {
                Code = "card_declined",
                Message = "Your card was declined"
            }
        };

        // Act
        var response = await _service.CreateErrorResponseAsync(exception, "CreateSubscription", _testCorrelationId);

        // Assert
        Assert.NotNull(response);
        Assert.Equal(_testCorrelationId, response.CorrelationId);
        Assert.Equal("PAYMENT_DECLINED", response.ErrorCode);
        Assert.Contains("payment method was declined", response.UserMessage);
        Assert.Equal("Card declined", response.TechnicalMessage);
        Assert.Equal("CreateSubscription", response.Operation);
        Assert.True(response.IsRetriable);
        Assert.Equal(0, response.RetryAfterSeconds);
    }

    [Fact]
    public async Task CreateErrorResponseAsync_InsufficientFunds_CreatesCorrectResponse()
    {
        // Arrange
        var exception = new StripeException("Insufficient funds")
        {
            StripeError = new StripeError
            {
                Code = "insufficient_funds",
                Message = "Insufficient funds"
            }
        };

        // Act
        var response = await _service.CreateErrorResponseAsync(exception, "ProcessPayment", _testCorrelationId);

        // Assert
        Assert.NotNull(response);
        Assert.Equal("INSUFFICIENT_FUNDS", response.ErrorCode);
        Assert.Contains("insufficient funds", response.UserMessage);
        Assert.True(response.IsRetriable);
    }

    [Fact]
    public async Task CreateErrorResponseAsync_RateLimitError_SetsRetryDelay()
    {
        // Arrange
        var exception = new StripeException("Rate limited")
        {
            StripeError = new StripeError
            {
                Code = "rate_limit_error",
                Message = "Too many requests"
            }
        };

        // Act
        var response = await _service.CreateErrorResponseAsync(exception, "UpdateSubscription", _testCorrelationId);

        // Assert
        Assert.NotNull(response);
        Assert.Equal("RATE_LIMITED", response.ErrorCode);
        Assert.Contains("Too many requests", response.UserMessage);
        Assert.True(response.IsRetriable);
        Assert.Equal(60, response.RetryAfterSeconds);
    }

    [Fact]
    public async Task CreateErrorResponseAsync_HttpRequestException_SetsNetworkError()
    {
        // Arrange
        var exception = new HttpRequestException("Network error");

        // Act
        var response = await _service.CreateErrorResponseAsync(exception, "CallStripe", _testCorrelationId);

        // Assert
        Assert.NotNull(response);
        Assert.Equal("NETWORK_ERROR", response.ErrorCode);
        Assert.Contains("Network error occurred", response.UserMessage);
        Assert.True(response.IsRetriable);
        Assert.Equal(30, response.RetryAfterSeconds);
    }

    [Fact]
    public async Task CreateErrorResponseAsync_TimeoutException_SetsTimeoutError()
    {
        // Arrange
        var exception = new TimeoutException("Request timed out");

        // Act
        var response = await _service.CreateErrorResponseAsync(exception, "LongOperation", _testCorrelationId);

        // Assert
        Assert.NotNull(response);
        Assert.Equal("TIMEOUT", response.ErrorCode);
        Assert.Contains("operation timed out", response.UserMessage);
        Assert.True(response.IsRetriable);
        Assert.Equal(30, response.RetryAfterSeconds);
    }

    [Fact]
    public async Task CreateErrorResponseAsync_UnauthorizedAccessException_SetsUnauthorizedError()
    {
        // Arrange
        var exception = new UnauthorizedAccessException("Not authorized");

        // Act
        var response = await _service.CreateErrorResponseAsync(exception, "AdminOperation", _testCorrelationId);

        // Assert
        Assert.NotNull(response);
        Assert.Equal("UNAUTHORIZED", response.ErrorCode);
        Assert.Contains("not authorized", response.UserMessage);
        Assert.False(response.IsRetriable);
        Assert.Equal(0, response.RetryAfterSeconds);
    }

    [Fact]
    public async Task CreateErrorResponseAsync_InvalidOperationException_UsesExceptionMessage()
    {
        // Arrange
        var exception = new InvalidOperationException("Custom business logic error");

        // Act
        var response = await _service.CreateErrorResponseAsync(exception, "BusinessOperation", _testCorrelationId);

        // Assert
        Assert.NotNull(response);
        Assert.Equal("INVALID_OPERATION", response.ErrorCode);
        Assert.Equal("Custom business logic error", response.UserMessage);
        Assert.False(response.IsRetriable);
    }

    [Fact]
    public async Task CreateErrorResponseAsync_UnknownException_SetsGenericError()
    {
        // Arrange
        var exception = new ArgumentException("Unknown error type");

        // Act
        var response = await _service.CreateErrorResponseAsync(exception, "UnknownOperation", _testCorrelationId);

        // Assert
        Assert.NotNull(response);
        Assert.Equal("UNKNOWN_ERROR", response.ErrorCode);
        Assert.Contains("unexpected error occurred", response.UserMessage);
        Assert.False(response.IsRetriable);
        Assert.Equal(0, response.RetryAfterSeconds);
    }

    [Fact]
    public async Task CreateErrorResponseAsync_SetsTimestamp()
    {
        // Arrange
        var exception = new Exception("Test error");
        var beforeTimestamp = DateTime.UtcNow.AddSeconds(-1);

        // Act
        var response = await _service.CreateErrorResponseAsync(exception, "TestOperation", _testCorrelationId);
        var afterTimestamp = DateTime.UtcNow.AddSeconds(1);

        // Assert
        Assert.InRange(response.Timestamp, beforeTimestamp, afterTimestamp);
    }

    [Fact]
    public async Task CreateErrorResponseAsync_LogsError()
    {
        // Arrange
        var exception = new Exception("Test exception");

        // Act
        await _service.CreateErrorResponseAsync(exception, "LogTest", _testCorrelationId);

        // Assert
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Error,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Subscription error")),
                exception,
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    #endregion

    #region LogSubscriptionFailureAsync Tests

    [Fact]
    public async Task LogSubscriptionFailureAsync_LogsErrorDetails()
    {
        // Arrange
        var exception = new Exception("Test failure");

        // Act
        await _service.LogSubscriptionFailureAsync("TestOperation", _testUserId, exception, _testCorrelationId);

        // Assert
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Error,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Subscription operation failed")),
                exception,
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task LogSubscriptionFailureAsync_WithNullException_HandlesGracefully()
    {
        // Act
        await _service.LogSubscriptionFailureAsync("NullTest", _testUserId, null!, _testCorrelationId);

        // Assert - Should not throw
        _mockLogger.Verify(
            x => x.Log(
                It.IsAny<LogLevel>(),
                It.IsAny<EventId>(),
                It.IsAny<It.IsAnyType>(),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.AtLeastOnce);
    }

    [Fact]
    public async Task LogSubscriptionFailureAsync_WithEmptyGuid_LogsSuccessfully()
    {
        // Arrange
        var exception = new Exception("Test error");

        // Act
        await _service.LogSubscriptionFailureAsync("EmptyGuidTest", Guid.Empty, exception, _testCorrelationId);

        // Assert
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Error,
                It.IsAny<EventId>(),
                It.IsAny<It.IsAnyType>(),
                exception,
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task LogSubscriptionFailureAsync_CompleteTaskSuccessfully()
    {
        // Arrange
        var exception = new Exception("Test");

        // Act
        var task = _service.LogSubscriptionFailureAsync("CompleteTest", _testUserId, exception, _testCorrelationId);
        await task;

        // Assert
        Assert.True(task.IsCompleted);
        Assert.False(task.IsFaulted);
    }

    #endregion

    #region Stripe Error Classification Tests

    [Theory]
    [InlineData("card_declined", true)]
    [InlineData("insufficient_funds", true)]
    [InlineData("authentication_required", true)]
    [InlineData("rate_limit_error", true)]
    [InlineData("invalid_request_error", false)]
    [InlineData("api_error", false)]
    [InlineData("unknown_error", false)]
    public void IsRetriableStripeError_VariousErrorCodes_ReturnsCorrectValue(string errorCode, bool expectedRetriable)
    {
        // Arrange
        var exception = new StripeException("Test")
        {
            StripeError = new StripeError { Code = errorCode, Message = "Test error" }
        };

        // Act
        var isRetriable = IsRetriableHelper(exception);

        // Assert
        Assert.Equal(expectedRetriable, isRetriable);
    }

    [Theory]
    [InlineData(HttpStatusCode.TooManyRequests, true)]
    [InlineData(HttpStatusCode.InternalServerError, true)]
    [InlineData(HttpStatusCode.BadGateway, true)]
    [InlineData(HttpStatusCode.ServiceUnavailable, true)]
    [InlineData(HttpStatusCode.GatewayTimeout, true)]
    [InlineData(HttpStatusCode.BadRequest, false)]
    [InlineData(HttpStatusCode.Unauthorized, false)]
    [InlineData(HttpStatusCode.Forbidden, false)]
    [InlineData(HttpStatusCode.NotFound, false)]
    public void IsRetriableStripeError_VariousHttpStatusCodes_ReturnsCorrectValue(HttpStatusCode statusCode, bool expectedRetriable)
    {
        // Arrange
        var exception = new StripeException("Test") { HttpStatusCode = statusCode };

        // Act
        var isRetriable = IsRetriableHelper(exception);

        // Assert
        Assert.Equal(expectedRetriable, isRetriable);
    }

    // Helper method to test retry logic
    private static bool IsRetriableHelper(StripeException ex)
    {
        if (ex.HttpStatusCode == HttpStatusCode.TooManyRequests ||
            ex.HttpStatusCode == HttpStatusCode.InternalServerError ||
            ex.HttpStatusCode == HttpStatusCode.BadGateway ||
            ex.HttpStatusCode == HttpStatusCode.ServiceUnavailable ||
            ex.HttpStatusCode == HttpStatusCode.GatewayTimeout)
        {
            return true;
        }

        return ex.StripeError?.Code switch
        {
            "card_declined" => true,
            "insufficient_funds" => true,
            "authentication_required" => true,
            "rate_limit_error" => true,
            _ => false
        };
    }

    #endregion

    #region Edge Case Tests

    [Fact]
    public async Task ExecuteWithRetryAsync_NullOperationName_HandlesGracefully()
    {
        // Arrange
        Func<Task<string>> operation = () => Task.FromResult("success");

        // Act
        var result = await _service.ExecuteWithRetryAsync(operation, null!, _testCorrelationId);

        // Assert
        Assert.Equal("success", result);
    }

    [Fact]
    public async Task ExecuteWithRetryAsync_EmptyCorrelationId_HandlesGracefully()
    {
        // Arrange
        Func<Task<string>> operation = () => Task.FromResult("success");

        // Act
        var result = await _service.ExecuteWithRetryAsync(operation, "TestOp", string.Empty);

        // Assert
        Assert.Equal("success", result);
    }

    [Fact]
    public async Task CreateErrorResponseAsync_VeryLongErrorMessage_HandlesGracefully()
    {
        // Arrange
        var longMessage = new string('X', 10000);
        var exception = new Exception(longMessage);

        // Act
        var response = await _service.CreateErrorResponseAsync(exception, "LongMessageTest", _testCorrelationId);

        // Assert
        Assert.NotNull(response);
        Assert.Equal(longMessage, response.TechnicalMessage);
    }

    [Fact]
    public async Task CreateErrorResponseAsync_NestedExceptions_UsesOuterException()
    {
        // Arrange
        var innerException = new InvalidOperationException("Inner error");
        var outerException = new Exception("Outer error", innerException);

        // Act
        var response = await _service.CreateErrorResponseAsync(outerException, "NestedTest", _testCorrelationId);

        // Assert
        Assert.NotNull(response);
        Assert.Equal("Outer error", response.TechnicalMessage);
    }

    #endregion

    #region SubscriptionErrorResponse Model Tests

    [Fact]
    public void SubscriptionErrorResponse_DefaultValues_AreCorrect()
    {
        // Act
        var response = new SubscriptionErrorResponse();

        // Assert
        Assert.Equal(string.Empty, response.CorrelationId);
        Assert.Equal(string.Empty, response.ErrorCode);
        Assert.Equal(string.Empty, response.UserMessage);
        Assert.Equal(string.Empty, response.TechnicalMessage);
        Assert.Equal(default(DateTime), response.Timestamp);
        Assert.Equal(string.Empty, response.Operation);
        Assert.False(response.IsRetriable);
        Assert.Equal(0, response.RetryAfterSeconds);
    }

    [Fact]
    public void SubscriptionErrorResponse_SetAllProperties_Succeeds()
    {
        // Arrange & Act
        var timestamp = DateTime.UtcNow;
        var response = new SubscriptionErrorResponse
        {
            CorrelationId = "test-id",
            ErrorCode = "TEST_ERROR",
            UserMessage = "User friendly message",
            TechnicalMessage = "Technical details",
            Timestamp = timestamp,
            Operation = "TestOperation",
            IsRetriable = true,
            RetryAfterSeconds = 60
        };

        // Assert
        Assert.Equal("test-id", response.CorrelationId);
        Assert.Equal("TEST_ERROR", response.ErrorCode);
        Assert.Equal("User friendly message", response.UserMessage);
        Assert.Equal("Technical details", response.TechnicalMessage);
        Assert.Equal(timestamp, response.Timestamp);
        Assert.Equal("TestOperation", response.Operation);
        Assert.True(response.IsRetriable);
        Assert.Equal(60, response.RetryAfterSeconds);
    }

    #endregion

    public void Dispose()
    {
        // No cleanup needed - service uses only in-memory policies
        GC.SuppressFinalize(this);
    }
}
