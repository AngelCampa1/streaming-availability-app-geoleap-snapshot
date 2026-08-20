using Xunit;
using Moq;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;

namespace GeoLeap.Api.Tests.Services;

/// <summary>
/// Direct tests for PaymentRetryService - Phase 2.2
/// Tests retry logic, exponential backoff, and Hangfire scheduling
/// </summary>
public class PaymentRetryServiceDirectTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly Mock<ILogger<PaymentRetryService>> _mockLogger;
    private readonly Mock<IPaymentService> _mockPaymentService;
    private readonly Mock<IDunningService> _mockDunningService;
    private readonly Mock<IGracePeriodService> _mockGracePeriodService;
    private readonly PaymentRetryService _service;
    private readonly Guid _testUserId = Guid.NewGuid();
    private readonly Guid _testTransactionId = Guid.NewGuid();

    public PaymentRetryServiceDirectTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: $"TestDb_{Guid.NewGuid()}")
            .Options;

        _context = new ApplicationDbContext(options);
        _mockLogger = new Mock<ILogger<PaymentRetryService>>();
        _mockPaymentService = new Mock<IPaymentService>();
        _mockDunningService = new Mock<IDunningService>();
        _mockGracePeriodService = new Mock<IGracePeriodService>();

        _service = new PaymentRetryService(
            _context,
            _mockLogger.Object,
            _mockPaymentService.Object,
            _mockDunningService.Object,
            _mockGracePeriodService.Object);

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

        // Seed test payment transaction
        var testTransaction = new PaymentTransaction
        {
            Id = _testTransactionId,
            UserId = _testUserId,
            Amount = 9.99m,
            Currency = "USD",
            Status = "failed",
            StripePaymentIntentId = "pi_test_failed",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.PaymentTransactions.Add(testTransaction);

        await _context.SaveChangesAsync();
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    // Failed Payment Creation Tests
    [Fact]
    public async Task GetFailedPaymentAsync_WithInvalidId_ReturnsNull()
    {
        // Arrange
        var invalidId = Guid.NewGuid();

        // Act
        var result = await _service.GetFailedPaymentAsync(invalidId);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task GetUserFailedPaymentsAsync_WithNoFailedPayments_ReturnsEmptyList()
    {
        // Act
        var result = await _service.GetUserFailedPaymentsAsync(_testUserId);

        // Assert
        Assert.NotNull(result);
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetUserFailedPaymentsAsync_WithActiveOnlyFilter_ReturnsOnlyActive()
    {
        // Arrange - Create separate transactions for each failed payment
        var activeTransactionId = Guid.NewGuid();
        var resolvedTransactionId = Guid.NewGuid();

        var activeTransaction = new PaymentTransaction
        {
            Id = activeTransactionId,
            UserId = _testUserId,
            Amount = 9.99m,
            Currency = "USD",
            Status = "failed",
            StripePaymentIntentId = "pi_test_active",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        var resolvedTransaction = new PaymentTransaction
        {
            Id = resolvedTransactionId,
            UserId = _testUserId,
            Amount = 9.99m,
            Currency = "USD",
            Status = "failed",
            StripePaymentIntentId = "pi_test_resolved",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.PaymentTransactions.AddRange(activeTransaction, resolvedTransaction);
        await _context.SaveChangesAsync();

        // Create active and resolved failed payments
        var activePayment = new FailedPayment
        {
            Id = Guid.NewGuid(),
            UserId = _testUserId,
            PaymentTransactionId = activeTransactionId,
            FailureType = "card_declined",
            StripeDeclineCode = "generic_decline",
            RecoveryStatus = "active",
            Amount = 9.99m,
            Currency = "USD",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        var resolvedPayment = new FailedPayment
        {
            Id = Guid.NewGuid(),
            UserId = _testUserId,
            PaymentTransactionId = resolvedTransactionId,
            FailureType = "card_declined",
            StripeDeclineCode = "generic_decline",
            RecoveryStatus = "resolved",
            Amount = 9.99m,
            Currency = "USD",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.FailedPayments.AddRange(activePayment, resolvedPayment);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetUserFailedPaymentsAsync(_testUserId, activeOnly: true);

        // Assert
        Assert.Single(result);
        Assert.Equal("active", result[0].RecoveryStatus);
    }

    // Retry Logic Tests
    [Fact]
    public async Task ShouldRetryPaymentAsync_WithNonExistentFailedPayment_ReturnsFalse()
    {
        // Arrange
        var invalidId = Guid.NewGuid();

        // Act
        var result = await _service.ShouldRetryPaymentAsync(invalidId);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task ShouldRetryPaymentAsync_WithNonRetriablePayment_ReturnsFalse()
    {
        // Arrange - Create non-retriable failed payment
        var failedPayment = new FailedPayment
        {
            Id = Guid.NewGuid(),
            UserId = _testUserId,
            PaymentTransactionId = _testTransactionId,
            FailureType = "lost_card",
            StripeDeclineCode = "lost_card",
            RecoveryStatus = "active",
            IsRetriable = false, // Non-retriable
            Amount = 9.99m,
            Currency = "USD",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.FailedPayments.Add(failedPayment);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.ShouldRetryPaymentAsync(failedPayment.Id);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task ShouldRetryPaymentAsync_WithPaymentRequiringAction_ReturnsFalse()
    {
        // Arrange - Create failed payment requiring action
        var failedPayment = new FailedPayment
        {
            Id = Guid.NewGuid(),
            UserId = _testUserId,
            PaymentTransactionId = _testTransactionId,
            FailureType = "expired_card",
            StripeDeclineCode = "expired_card",
            RecoveryStatus = "active",
            IsRetriable = true,
            RequiresAction = true, // Requires user action
            Amount = 9.99m,
            Currency = "USD",
            MaxRetryAttempts = 3,
            RetryCount = 0,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.FailedPayments.Add(failedPayment);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.ShouldRetryPaymentAsync(failedPayment.Id);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task ShouldRetryPaymentAsync_WithMaxRetriesReached_ReturnsFalse()
    {
        // Arrange - Create failed payment with max retries reached
        var failedPayment = new FailedPayment
        {
            Id = Guid.NewGuid(),
            UserId = _testUserId,
            PaymentTransactionId = _testTransactionId,
            FailureType = "card_declined",
            StripeDeclineCode = "generic_decline",
            RecoveryStatus = "active",
            IsRetriable = true,
            RequiresAction = false,
            MaxRetryAttempts = 3,
            RetryCount = 3, // Max retries reached
            Amount = 9.99m,
            Currency = "USD",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.FailedPayments.Add(failedPayment);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.ShouldRetryPaymentAsync(failedPayment.Id);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task ShouldRetryPaymentAsync_WithValidRetriablePayment_ReturnsTrue()
    {
        // Arrange - Create valid retriable failed payment
        var failedPayment = new FailedPayment
        {
            Id = Guid.NewGuid(),
            UserId = _testUserId,
            PaymentTransactionId = _testTransactionId,
            FailureType = "card_declined",
            StripeDeclineCode = "generic_decline",
            RecoveryStatus = "active",
            IsRetriable = true,
            RequiresAction = false,
            MaxRetryAttempts = 3,
            RetryCount = 1,
            Amount = 9.99m,
            Currency = "USD",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.FailedPayments.Add(failedPayment);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.ShouldRetryPaymentAsync(failedPayment.Id);

        // Assert
        Assert.True(result);
    }

    // Retry Delay Calculation Tests
    [Fact]
    public async Task CalculateNextRetryDelayAsync_WithInvalidId_ThrowsArgumentException()
    {
        // Arrange
        var invalidId = Guid.NewGuid();

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(() =>
            _service.CalculateNextRetryDelayAsync(invalidId));
    }

    [Fact]
    public async Task CalculateNextRetryDelayAsync_WithValidFailedPayment_ReturnsDelayWithMinimum30Minutes()
    {
        // Arrange - Create failed payment
        var failedPayment = new FailedPayment
        {
            Id = Guid.NewGuid(),
            UserId = _testUserId,
            PaymentTransactionId = _testTransactionId,
            FailureType = "card_declined",
            StripeDeclineCode = "generic_decline",
            RecoveryStatus = "active",
            RetryCount = 0,
            Amount = 9.99m,
            Currency = "USD",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.FailedPayments.Add(failedPayment);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.CalculateNextRetryDelayAsync(failedPayment.Id);

        // Assert
        Assert.True(result.TotalMinutes >= 30, "Delay should be at least 30 minutes");
    }

    // Max Retry Attempts Tests
    [Fact]
    public async Task GetMaxRetryAttemptsAsync_WithCardDeclined_ReturnsDefault3()
    {
        // Act
        var result = await _service.GetMaxRetryAttemptsAsync("card_declined");

        // Assert
        Assert.Equal(3, result);
    }

    [Fact]
    public async Task GetMaxRetryAttemptsAsync_WithInsufficientFunds_Returns5()
    {
        // Act
        var result = await _service.GetMaxRetryAttemptsAsync("insufficient_funds");

        // Assert
        Assert.Equal(5, result);
    }

    [Fact]
    public async Task GetMaxRetryAttemptsAsync_WithLostCard_Returns0()
    {
        // Act
        var result = await _service.GetMaxRetryAttemptsAsync("lost_card");

        // Assert
        Assert.Equal(0, result);
    }

    // Retry Delay Schedule Tests
    [Fact]
    public async Task GetRetryDelayScheduleAsync_WithCardDeclined_ReturnsExpectedSchedule()
    {
        // Act
        var result = await _service.GetRetryDelayScheduleAsync("card_declined");

        // Assert
        Assert.NotNull(result);
        Assert.NotEmpty(result);
        Assert.Equal(3, result.Count); // 1h, 6h, 24h
    }

    // Retriability Tests
    [Fact]
    public async Task IsRetriableFailureTypeAsync_WithLostCard_ReturnsFalse()
    {
        // Act
        var result = await _service.IsRetriableFailureTypeAsync("card_declined", "lost_card");

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task IsRetriableFailureTypeAsync_WithStolenCard_ReturnsFalse()
    {
        // Act
        var result = await _service.IsRetriableFailureTypeAsync("card_declined", "stolen_card");

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task IsRetriableFailureTypeAsync_WithCardDeclined_ReturnsTrue()
    {
        // Act
        var result = await _service.IsRetriableFailureTypeAsync("card_declined", "card_declined");

        // Assert
        Assert.True(result);
    }

    // Analytics Tests
    [Fact]
    public async Task GetRetryAnalyticsAsync_WithNoAnalytics_ReturnsEmptyResult()
    {
        // Arrange
        var startDate = DateTime.UtcNow.AddDays(-30);
        var endDate = DateTime.UtcNow;

        // Act
        var result = await _service.GetRetryAnalyticsAsync(startDate, endDate);

        // Assert
        Assert.NotNull(result);
        Assert.Contains("period_start", result.Keys);
        Assert.Contains("period_end", result.Keys);
    }

    [Fact]
    public async Task GetFailurePatternAnalysisAsync_WithNoFailures_ReturnsEmptyPatterns()
    {
        // Arrange
        var startDate = DateTime.UtcNow.AddDays(-30);
        var endDate = DateTime.UtcNow;

        // Act
        var result = await _service.GetFailurePatternAnalysisAsync(startDate, endDate);

        // Assert
        Assert.NotNull(result);
        Assert.Contains("analysis_period", result.Keys);
        Assert.Contains("failure_patterns", result.Keys);
    }

    // Failed Payment Status Tests
    [Fact]
    public async Task UpdateFailedPaymentStatusAsync_WithInvalidId_ThrowsArgumentException()
    {
        // Arrange
        var invalidId = Guid.NewGuid();

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(() =>
            _service.UpdateFailedPaymentStatusAsync(invalidId, "resolved", "test-correlation-id"));
    }

    // Recovery Session Tests - Skipped (require Stripe API and complex setup)
    [Fact(Skip = "Stripe API calls require real API key - integration test needed")]
    public async Task SchedulePaymentRetryAsync_WithValidFailedPayment_SchedulesRetry()
    {
        // This test requires Stripe API integration
    }

    [Fact(Skip = "Stripe API calls require real API key - integration test needed")]
    public async Task ExecutePaymentRetryAsync_WithValidPayment_ExecutesRetry()
    {
        // This test requires Stripe API integration
    }

    [Fact(Skip = "Stripe API calls require real API key - integration test needed")]
    public async Task ManuallyRetryPaymentAsync_WithValidPayment_ExecutesManualRetry()
    {
        // This test requires Stripe API integration
    }
}
