using Xunit;
using Moq;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using Microsoft.AspNetCore.Identity;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;

namespace GeoLeap.Api.Tests.Services;

/// <summary>
/// Direct tests for PaymentService - Phase 1.6 Part 1
/// Tests core payment operations: payment intents, subscriptions, payment methods
///
/// Note: Full PaymentService testing requires 35-40+ tests total.
/// This file contains initial 15 tests for highest-priority operations.
/// Additional tests to be added in Phase 1.6 Part 2.
/// </summary>
public class PaymentServiceDirectTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly Mock<ILogger<PaymentService>> _mockLogger;
    private readonly Mock<IConfiguration> _mockConfiguration;
    private readonly Mock<IRbacService> _mockRbacService;
    private readonly Mock<IEmailService> _mockEmailService;
    private readonly Mock<IPromotionService> _mockPromotionService;
    private readonly PaymentService _service;
    private readonly Guid _testUserId = Guid.NewGuid();

    public PaymentServiceDirectTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: $"TestDb_{Guid.NewGuid()}")
            .Options;

        _context = new ApplicationDbContext(options);
        _mockLogger = new Mock<ILogger<PaymentService>>();
        _mockConfiguration = new Mock<IConfiguration>();
        _mockRbacService = new Mock<IRbacService>();
        _mockEmailService = new Mock<IEmailService>();
        _mockPromotionService = new Mock<IPromotionService>();

        // Configure mock configuration for Stripe test mode
        _mockConfiguration.Setup(c => c["Stripe:SecretKey"]).Returns("sk_test_fake_key_for_testing");
        _mockConfiguration.Setup(c => c["Stripe:PublishableKey"]).Returns("pk_test_fake_key");
        _mockConfiguration.Setup(c => c["ASPNETCORE_ENVIRONMENT"]).Returns("Testing");
        _mockConfiguration.Setup(c => c["Environment"]).Returns("Testing");

        _service = new PaymentService(
            _context,
            _mockLogger.Object,
            _mockConfiguration.Object,
            _mockRbacService.Object,
            _mockEmailService.Object,
            _mockPromotionService.Object);

        SeedTestData().Wait();
    }

    private async Task SeedTestData()
    {
        // Seed test user
        var testUser = new User
        {
            Id = _testUserId,
            UserName = "testuser@example.com",
            Email = "testuser@example.com",
            EmailConfirmed = true
        };
        _context.Users.Add(testUser);
        await _context.SaveChangesAsync();
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    // Core Payment Intent Tests
    [Fact(Skip = "Stripe API calls require real API key - integration test needed")]
    public async Task GetOrCreateStripeCustomerAsync_WithNewUser_CreatesCustomer()
    {
        // Note: This test requires real Stripe API integration
        // Skipping for direct tests - should be covered in integration tests
    }

    [Fact]
    public async Task GetUserActiveSubscriptionAsync_WithNoSubscription_ReturnsNull()
    {
        // Act
        var result = await _service.GetUserActiveSubscriptionAsync(_testUserId);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task GetUserPaymentHistoryAsync_WithNoHistory_ReturnsEmptyList()
    {
        // Act
        var result = await _service.GetUserPaymentHistoryAsync(_testUserId);

        // Assert
        Assert.NotNull(result);
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetUserPaymentMethodsAsync_WithNoPaymentMethods_ReturnsEmptyList()
    {
        // Act
        var result = await _service.GetUserPaymentMethodsAsync(_testUserId);

        // Assert
        Assert.NotNull(result);
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetUserSubscriptionHistoryAsync_WithNoSubscriptions_ReturnsEmptyList()
    {
        // Act
        var result = await _service.GetUserSubscriptionHistoryAsync(_testUserId);

        // Assert
        Assert.NotNull(result);
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetPaymentTransactionAsync_WithInvalidTransactionId_ReturnsNull()
    {
        // Arrange
        var invalidTransactionId = Guid.NewGuid();

        // Act
        var result = await _service.GetPaymentTransactionAsync(_testUserId, invalidTransactionId);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task GetUserPaymentsAsync_WithNoPagments_ReturnsEmptyPagedResult()
    {
        // Act
        var result = await _service.GetUserPaymentsAsync(_testUserId, page: 1, pageSize: 20);

        // Assert
        Assert.NotNull(result);
        Assert.Empty(result.Items);
        Assert.Equal(0, result.TotalCount);
        Assert.Equal(1, result.PageNumber);
        Assert.Equal(20, result.PageSize);
        Assert.Equal(0, result.TotalPages);
    }

    [Fact]
    public async Task GetPaymentConfigurationAsync_WithNonexistentKey_ReturnsNull()
    {
        // Act
        var result = await _service.GetPaymentConfigurationAsync("nonexistent_key");

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task GetPaymentDetailsAsync_WithInvalidPaymentId_ReturnsNull()
    {
        // Arrange
        var invalidPaymentId = Guid.NewGuid();

        // Act
        var result = await _service.GetPaymentDetailsAsync(invalidPaymentId);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task CanCancelPaymentAsync_WithInvalidPaymentId_ReturnsFalse()
    {
        // Arrange
        var invalidPaymentId = Guid.NewGuid();

        // Act
        var result = await _service.CanCancelPaymentAsync(invalidPaymentId);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task CancelPaymentAsync_WithInvalidPaymentId_ReturnsFalse()
    {
        // Arrange
        var invalidPaymentId = Guid.NewGuid();

        // Act
        var result = await _service.CancelPaymentAsync(invalidPaymentId);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task DeleteStripeCustomerAsync_WithInvalidUser_ReturnsFalse()
    {
        // Arrange
        var invalidUserId = Guid.NewGuid();

        // Act
        var result = await _service.DeleteStripeCustomerAsync(invalidUserId, "test-correlation-id");

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task LogPaymentAnalyticsAsync_WithValidData_CompletesSuccessfully()
    {
        // Act & Assert - Should not throw
        await _service.LogPaymentAnalyticsAsync(
            eventType: "payment_intent_created",
            userId: _testUserId,
            paymentMethod: "card",
            amount: 9.99m,
            currency: "USD",
            correlationId: "test-correlation-id",
            metadata: new Dictionary<string, object> { { "test", "data" } });
    }

    [Fact]
    public async Task SetPaymentConfigurationAsync_WithValidData_SavesSuccessfully()
    {
        // Act
        await _service.SetPaymentConfigurationAsync(
            key: "test_config_key",
            value: "test_value",
            category: "test_category",
            updatedBy: "test_user");

        // Assert
        var savedConfig = await _service.GetPaymentConfigurationAsync("test_config_key");
        Assert.Equal("test_value", savedConfig);
    }

    [Fact(Skip = "Stripe API calls require real API key - integration test needed")]
    public async Task CreatePaymentIntentAsync_WithValidRequest_CreatesIntent()
    {
        // This test requires real Stripe API integration
        // Skipping for direct tests - should be covered in integration tests
    }

    // Analytics Tests - Part 2
    [Fact]
    public async Task GetPaymentAnalyticsAsync_WithNoTransactions_ReturnsZeroAnalytics()
    {
        // Arrange
        var startDate = DateTime.UtcNow.AddDays(-30);
        var endDate = DateTime.UtcNow;

        // Act
        var result = await _service.GetPaymentAnalyticsAsync(startDate, endDate);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(0, result.TotalRevenue);
        Assert.Equal(0, result.TransactionCount);
        Assert.Equal(0, result.AverageTransactionValue);
        Assert.Equal(startDate, result.PeriodStart);
        Assert.Equal(endDate, result.PeriodEnd);
    }

    [Fact]
    public async Task GetPaymentAnalyticsAsync_WithSuccessfulTransactions_ReturnsCorrectAnalytics()
    {
        // Arrange
        var startDate = DateTime.UtcNow.AddDays(-30);
        var endDate = DateTime.UtcNow;

        // Seed successful transactions
        var transaction1 = new PaymentTransaction
        {
            Id = Guid.NewGuid(),
            UserId = _testUserId,
            Amount = 10.00m,
            Currency = "USD",
            Status = "succeeded",
            StripePaymentIntentId = "pi_test_1",
            ProcessedAt = DateTime.UtcNow.AddDays(-10),
            CreatedAt = DateTime.UtcNow.AddDays(-10),
            UpdatedAt = DateTime.UtcNow.AddDays(-10)
        };
        var transaction2 = new PaymentTransaction
        {
            Id = Guid.NewGuid(),
            UserId = _testUserId,
            Amount = 20.00m,
            Currency = "USD",
            Status = "succeeded",
            StripePaymentIntentId = "pi_test_2",
            ProcessedAt = DateTime.UtcNow.AddDays(-5),
            CreatedAt = DateTime.UtcNow.AddDays(-5),
            UpdatedAt = DateTime.UtcNow.AddDays(-5)
        };
        _context.PaymentTransactions.AddRange(transaction1, transaction2);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetPaymentAnalyticsAsync(startDate, endDate);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(30.00m, result.TotalRevenue);
        Assert.Equal(2, result.TransactionCount);
        Assert.Equal(15.00m, result.AverageTransactionValue);
    }

    [Fact]
    public async Task GetPaymentAnalyticsAsync_ExcludesFailedTransactions_OnlyCountsSucceeded()
    {
        // Arrange
        var startDate = DateTime.UtcNow.AddDays(-30);
        var endDate = DateTime.UtcNow;

        // Seed mixed status transactions
        var succeededTransaction = new PaymentTransaction
        {
            Id = Guid.NewGuid(),
            UserId = _testUserId,
            Amount = 10.00m,
            Currency = "USD",
            Status = "succeeded",
            StripePaymentIntentId = "pi_test_succeeded",
            ProcessedAt = DateTime.UtcNow.AddDays(-10),
            CreatedAt = DateTime.UtcNow.AddDays(-10),
            UpdatedAt = DateTime.UtcNow.AddDays(-10)
        };
        var failedTransaction = new PaymentTransaction
        {
            Id = Guid.NewGuid(),
            UserId = _testUserId,
            Amount = 50.00m,
            Currency = "USD",
            Status = "failed",
            StripePaymentIntentId = "pi_test_failed",
            ProcessedAt = DateTime.UtcNow.AddDays(-5),
            CreatedAt = DateTime.UtcNow.AddDays(-5),
            UpdatedAt = DateTime.UtcNow.AddDays(-5)
        };
        _context.PaymentTransactions.AddRange(succeededTransaction, failedTransaction);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetPaymentAnalyticsAsync(startDate, endDate);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(10.00m, result.TotalRevenue); // Only succeeded transaction
        Assert.Equal(1, result.TransactionCount);
    }

    // Failed Payment Processing Tests
    [Fact]
    public async Task ProcessFailedPaymentsAsync_WithNoFailedPayments_CompletesSuccessfully()
    {
        // Act & Assert - Should not throw
        await _service.ProcessFailedPaymentsAsync();
    }

    [Fact]
    public async Task RetryPaymentAsync_WithInvalidTransactionId_ReturnsFalse()
    {
        // Arrange
        var invalidTransactionId = Guid.NewGuid();

        // Act
        var result = await _service.RetryPaymentAsync(invalidTransactionId, "test-correlation-id");

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task RetryPaymentAsync_WithNonFailedTransaction_ReturnsFalse()
    {
        // Arrange - Create successful transaction
        var transaction = new PaymentTransaction
        {
            Id = Guid.NewGuid(),
            UserId = _testUserId,
            Amount = 10.00m,
            Currency = "USD",
            Status = "succeeded",
            StripePaymentIntentId = "pi_test_retry_success",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.PaymentTransactions.Add(transaction);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.RetryPaymentAsync(transaction.Id, "test-correlation-id");

        // Assert
        Assert.False(result); // Can't retry a successful payment
    }

    [Fact]
    public async Task RetryPaymentAsync_WithFailedTransactionNoPaymentMethod_ReturnsFalse()
    {
        // Arrange - Create failed transaction without payment method
        var transaction = new PaymentTransaction
        {
            Id = Guid.NewGuid(),
            UserId = _testUserId,
            Amount = 10.00m,
            Currency = "USD",
            Status = "failed",
            StripePaymentIntentId = "pi_test_retry_failed",
            PaymentMethodId = null, // No payment method
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.PaymentTransactions.Add(transaction);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.RetryPaymentAsync(transaction.Id, "test-correlation-id");

        // Assert
        Assert.False(result); // Can't retry without payment method
    }

    // Webhook Retry Tests
    [Fact]
    public async Task RetryFailedWebhooksAsync_WithNoFailedWebhooks_CompletesSuccessfully()
    {
        // Act & Assert - Should not throw
        await _service.RetryFailedWebhooksAsync();
    }

    // Payment Method Tests - Skipped (require Stripe API)
    [Fact(Skip = "Stripe API calls require real API key - integration test needed")]
    public async Task AttachPaymentMethodAsync_WithValidData_AttachesPaymentMethod()
    {
        // This test requires real Stripe API integration
    }

    [Fact(Skip = "Stripe API calls require real API key - integration test needed")]
    public async Task DetachPaymentMethodAsync_WithValidPaymentMethod_DetachesSuccessfully()
    {
        // This test requires real Stripe API integration
    }

    [Fact(Skip = "Stripe API calls require real API key - integration test needed")]
    public async Task SetDefaultPaymentMethodAsync_WithValidPaymentMethod_SetsAsDefault()
    {
        // This test requires real Stripe API integration
    }

    // Subscription Tests - Skipped (require Stripe API)
    [Fact(Skip = "Stripe API calls require real API key - integration test needed")]
    public async Task CreateSubscriptionAsync_WithValidRequest_CreatesSubscription()
    {
        // This test requires real Stripe API integration
    }

    [Fact(Skip = "Stripe API calls require real API key - integration test needed")]
    public async Task CancelSubscriptionAsync_WithActiveSubscription_CancelsSuccessfully()
    {
        // This test requires real Stripe API integration
    }

    [Fact(Skip = "Stripe API calls require real API key - integration test needed")]
    public async Task UpdateSubscriptionAsync_WithNewPriceId_UpdatesSuccessfully()
    {
        // This test requires real Stripe API integration
    }

    // Webhook Processing Tests
    [Fact]
    public async Task ProcessWebhookAsync_WithInvalidEventId_ReturnsFalse()
    {
        // Act
        var result = await _service.ProcessWebhookAsync("invalid_event_id", "payment_intent.succeeded", "{}", "test-correlation-id");

        // Assert - Should handle gracefully (Stripe validation will fail but method shouldn't throw)
        Assert.False(result);
    }

    // Refund Tests - Skipped (require Stripe API)
    [Fact(Skip = "Stripe API calls require real API key - integration test needed")]
    public async Task RefundPaymentAsync_WithValidPaymentId_CreatesRefund()
    {
        // This test requires real Stripe API integration
    }

    // Payment Confirmation Tests - Skipped (require Stripe API)
    [Fact(Skip = "Stripe API calls require real API key - integration test needed")]
    public async Task ConfirmPaymentIntentAsync_WithValidPaymentIntent_ConfirmsSuccessfully()
    {
        // This test requires real Stripe API integration
    }

    [Fact(Skip = "Stripe API calls require real API key - integration test needed")]
    public async Task CancelPaymentIntentAsync_WithValidPaymentIntent_CancelsSuccessfully()
    {
        // This test requires real Stripe API integration
    }
}
