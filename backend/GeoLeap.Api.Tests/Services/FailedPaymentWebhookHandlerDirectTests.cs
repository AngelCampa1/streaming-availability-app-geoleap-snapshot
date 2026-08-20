using Xunit;
using Moq;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using System.Text.Json;

namespace GeoLeap.Api.Tests.Services;

public class FailedPaymentWebhookHandlerDirectTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly Mock<ILogger<FailedPaymentWebhookHandler>> _mockLogger;
    private readonly Mock<IPaymentRetryService> _mockPaymentRetryService;
    private readonly Mock<IDunningService> _mockDunningService;
    private readonly Mock<IGracePeriodService> _mockGracePeriodService;
    private readonly FailedPaymentWebhookHandler _handler;
    private readonly Guid _userId;
    private readonly Guid _customerId;
    private readonly string _correlationId;

    public FailedPaymentWebhookHandlerDirectTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"TestDb_{Guid.NewGuid()}")
            .Options;

        _context = new ApplicationDbContext(options);
        _mockLogger = new Mock<ILogger<FailedPaymentWebhookHandler>>();
        _mockPaymentRetryService = new Mock<IPaymentRetryService>();
        _mockDunningService = new Mock<IDunningService>();
        _mockGracePeriodService = new Mock<IGracePeriodService>();

        _handler = new FailedPaymentWebhookHandler(
            _context,
            _mockLogger.Object,
            _mockPaymentRetryService.Object,
            _mockDunningService.Object,
            _mockGracePeriodService.Object);

        _userId = Guid.NewGuid();
        _customerId = Guid.NewGuid();
        _correlationId = Guid.NewGuid().ToString();

        SeedTestData();
    }

    private void SeedTestData()
    {
        var user = new User
        {
            Id = _userId,
            Email = "test@example.com",
            UserName = "testuser",
            PasswordHash = "hash",
            CreatedAt = DateTime.UtcNow
        };

        var stripeCustomer = new StripeCustomer
        {
            Id = _customerId,
            UserId = _userId,
            StripeCustomerId = "cus_test123",
            User = user,
            CreatedAt = DateTime.UtcNow
        };

        var paymentTransaction = new PaymentTransaction
        {
            Id = Guid.NewGuid(),
            UserId = _userId,
            StripePaymentIntentId = "pi_test123",
            Status = "pending",
            Amount = 9.99m,
            Currency = "usd",
            Description = "Test payment",
            CreatedAt = DateTime.UtcNow,
            User = user
        };

        var subscription = new Subscription
        {
            Id = Guid.NewGuid(),
            UserId = _userId,
            StripeSubscriptionId = "sub_test123",
            StripeCustomerId = _customerId,
            PlanType = "premium",
            Status = "active",
            Amount = 9.99m,
            Currency = "usd",
            Interval = "month",
            CurrentPeriodStart = DateTime.UtcNow.AddDays(-15),
            CurrentPeriodEnd = DateTime.UtcNow.AddDays(15),
            StripePriceId = "price_test",
            User = user,
            CreatedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        _context.StripeCustomers.Add(stripeCustomer);
        _context.PaymentTransactions.Add(paymentTransaction);
        _context.Subscriptions.Add(subscription);
        _context.SaveChanges();
    }

    public void Dispose()
    {
        _context?.Dispose();
    }

    // HandlePaymentFailedWebhookAsync Tests (6 tests)
    [Fact]
    public async Task HandlePaymentFailedWebhookAsync_WithValidData_ProcessesSuccessfully()
    {
        // Arrange
        var eventData = CreatePaymentFailedEventData("pi_test123", "cus_test123", "insufficient_funds", "Insufficient funds");

        var failedPaymentDto = new FailedPaymentDto
        {
            Id = Guid.NewGuid(),
            UserId = _userId,
            FailureType = "insufficient_funds",
            FailureReason = "Insufficient funds",
            Amount = 9.99m,
            Currency = "usd",
            RecoveryStatus = "active",
            RetryCount = 0,
            IsRetriable = true,
            RequiresAction = false,
            CreatedAt = DateTime.UtcNow
        };

        _mockPaymentRetryService
            .Setup(s => s.CreateFailedPaymentAsync(
                It.IsAny<Guid>(),
                It.IsAny<Guid>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>()))
            .ReturnsAsync(failedPaymentDto);

        // Act
        var result = await _handler.HandlePaymentFailedWebhookAsync("evt_test123", eventData, _correlationId);

        // Assert
        Assert.True(result);

        var transaction = await _context.PaymentTransactions.FirstAsync(pt => pt.StripePaymentIntentId == "pi_test123");
        Assert.Equal("failed", transaction.Status);
        Assert.Equal("Insufficient funds", transaction.FailureReason);

        _mockPaymentRetryService.Verify(s => s.CreateFailedPaymentAsync(
            _userId,
            It.IsAny<Guid>(),
            "insufficient_funds",
            "insufficient_funds",
            "Insufficient funds",
            _correlationId), Times.Once);
    }

    [Fact]
    public async Task HandlePaymentFailedWebhookAsync_WithMissingPaymentIntentId_ReturnsFalse()
    {
        // Arrange
        var eventData = CreatePaymentFailedEventData("", "cus_test123", "insufficient_funds", "Insufficient funds");

        // Act
        var result = await _handler.HandlePaymentFailedWebhookAsync("evt_test123", eventData, _correlationId);

        // Assert
        Assert.False(result);
        _mockPaymentRetryService.Verify(s => s.CreateFailedPaymentAsync(
            It.IsAny<Guid>(),
            It.IsAny<Guid>(),
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task HandlePaymentFailedWebhookAsync_WithNonexistentTransaction_ReturnsTrue()
    {
        // Arrange
        var eventData = CreatePaymentFailedEventData("pi_nonexistent", "cus_test123", "insufficient_funds", "Insufficient funds");

        // Act
        var result = await _handler.HandlePaymentFailedWebhookAsync("evt_test123", eventData, _correlationId);

        // Assert
        Assert.True(result);
        _mockPaymentRetryService.Verify(s => s.CreateFailedPaymentAsync(
            It.IsAny<Guid>(),
            It.IsAny<Guid>(),
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task HandlePaymentFailedWebhookAsync_WithExpiredCard_MapsCorrectFailureType()
    {
        // Arrange
        var eventData = CreatePaymentFailedEventData("pi_test123", "cus_test123", "expired_card", "Your card has expired");

        var failedPaymentDto = new FailedPaymentDto
        {
            Id = Guid.NewGuid(),
            UserId = _userId,
            FailureType = "test_failure",
            FailureReason = "Test failure",
            Amount = 9.99m,
            Currency = "usd",
            RecoveryStatus = "active",
            RetryCount = 0,
            IsRetriable = true,
            RequiresAction = false,
            CreatedAt = DateTime.UtcNow
        };

        _mockPaymentRetryService
            .Setup(s => s.CreateFailedPaymentAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(failedPaymentDto);

        // Act
        var result = await _handler.HandlePaymentFailedWebhookAsync("evt_test123", eventData, _correlationId);

        // Assert
        Assert.True(result);
        _mockPaymentRetryService.Verify(s => s.CreateFailedPaymentAsync(
            _userId,
            It.IsAny<Guid>(),
            "expired_card",
            "expired_card",
            "Your card has expired",
            _correlationId), Times.Once);
    }

    [Fact]
    public async Task HandlePaymentFailedWebhookAsync_WithCardDeclined_MapsCorrectFailureType()
    {
        // Arrange
        var eventData = CreatePaymentFailedEventData("pi_test123", "cus_test123", "card_declined", "Your card was declined");

        var failedPaymentDto = new FailedPaymentDto
        {
            Id = Guid.NewGuid(),
            UserId = _userId,
            FailureType = "test_failure",
            FailureReason = "Test failure",
            Amount = 9.99m,
            Currency = "usd",
            RecoveryStatus = "active",
            RetryCount = 0,
            IsRetriable = true,
            RequiresAction = false,
            CreatedAt = DateTime.UtcNow
        };

        _mockPaymentRetryService
            .Setup(s => s.CreateFailedPaymentAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(failedPaymentDto);

        // Act
        var result = await _handler.HandlePaymentFailedWebhookAsync("evt_test123", eventData, _correlationId);

        // Assert
        Assert.True(result);
        _mockPaymentRetryService.Verify(s => s.CreateFailedPaymentAsync(
            _userId,
            It.IsAny<Guid>(),
            "card_declined",
            "card_declined",
            "Your card was declined",
            _correlationId), Times.Once);
    }

    [Fact]
    public async Task HandlePaymentFailedWebhookAsync_WithGenericDecline_MapsToGenericDeclineType()
    {
        // Arrange
        var eventData = CreatePaymentFailedEventData("pi_test123", "cus_test123", "unknown_code", "Payment failed");

        var failedPaymentDto = new FailedPaymentDto
        {
            Id = Guid.NewGuid(),
            UserId = _userId,
            FailureType = "test_failure",
            FailureReason = "Test failure",
            Amount = 9.99m,
            Currency = "usd",
            RecoveryStatus = "active",
            RetryCount = 0,
            IsRetriable = true,
            RequiresAction = false,
            CreatedAt = DateTime.UtcNow
        };

        _mockPaymentRetryService
            .Setup(s => s.CreateFailedPaymentAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(failedPaymentDto);

        // Act
        var result = await _handler.HandlePaymentFailedWebhookAsync("evt_test123", eventData, _correlationId);

        // Assert
        Assert.True(result);
        _mockPaymentRetryService.Verify(s => s.CreateFailedPaymentAsync(
            _userId,
            It.IsAny<Guid>(),
            "generic_decline",
            "unknown_code",
            "Payment failed",
            _correlationId), Times.Once);
    }

    // HandleInvoicePaymentFailedWebhookAsync Tests (5 tests)
    [Fact]
    public async Task HandleInvoicePaymentFailedWebhookAsync_WithValidData_ProcessesSuccessfully()
    {
        // Arrange
        var eventData = CreateInvoicePaymentFailedEventData("in_test123", "cus_test123", "sub_test123", 999, 1);

        var failedPaymentDto = new FailedPaymentDto
        {
            Id = Guid.NewGuid(),
            UserId = _userId,
            FailureType = "test_failure",
            FailureReason = "Test failure",
            Amount = 9.99m,
            Currency = "usd",
            RecoveryStatus = "active",
            RetryCount = 0,
            IsRetriable = true,
            RequiresAction = false,
            CreatedAt = DateTime.UtcNow
        };

        _mockPaymentRetryService
            .Setup(s => s.CreateFailedPaymentAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(failedPaymentDto);

        // Act
        var result = await _handler.HandleInvoicePaymentFailedWebhookAsync("evt_test123", eventData, _correlationId);

        // Assert
        Assert.True(result);
        _mockPaymentRetryService.Verify(s => s.CreateFailedPaymentAsync(
            _userId,
            It.IsAny<Guid>(),
            "subscription_payment_failure",
            "payment_intent_authentication_failure",
            "Invoice payment failed (attempt 1)",
            _correlationId), Times.Once);
    }

    [Fact]
    public async Task HandleInvoicePaymentFailedWebhookAsync_WithMissingInvoiceId_ReturnsFalse()
    {
        // Arrange
        var eventData = CreateInvoicePaymentFailedEventData("", "cus_test123", "sub_test123", 999, 1);

        // Act
        var result = await _handler.HandleInvoicePaymentFailedWebhookAsync("evt_test123", eventData, _correlationId);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task HandleInvoicePaymentFailedWebhookAsync_WithNonexistentCustomer_ReturnsTrue()
    {
        // Arrange
        var eventData = CreateInvoicePaymentFailedEventData("in_test123", "cus_nonexistent", "sub_test123", 999, 1);

        // Act
        var result = await _handler.HandleInvoicePaymentFailedWebhookAsync("evt_test123", eventData, _correlationId);

        // Assert
        Assert.True(result);
        _mockPaymentRetryService.Verify(s => s.CreateFailedPaymentAsync(
            It.IsAny<Guid>(),
            It.IsAny<Guid>(),
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task HandleInvoicePaymentFailedWebhookAsync_WithoutSubscription_CreatesInvoiceFailureType()
    {
        // Arrange
        var eventData = CreateInvoicePaymentFailedEventData("in_test123", "cus_test123", null, 999, 1);

        var failedPaymentDto = new FailedPaymentDto
        {
            Id = Guid.NewGuid(),
            UserId = _userId,
            FailureType = "test_failure",
            FailureReason = "Test failure",
            Amount = 9.99m,
            Currency = "usd",
            RecoveryStatus = "active",
            RetryCount = 0,
            IsRetriable = true,
            RequiresAction = false,
            CreatedAt = DateTime.UtcNow
        };

        _mockPaymentRetryService
            .Setup(s => s.CreateFailedPaymentAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(failedPaymentDto);

        // Act
        var result = await _handler.HandleInvoicePaymentFailedWebhookAsync("evt_test123", eventData, _correlationId);

        // Assert
        Assert.True(result);
        _mockPaymentRetryService.Verify(s => s.CreateFailedPaymentAsync(
            _userId,
            It.IsAny<Guid>(),
            "invoice_payment_failure",
            "payment_intent_authentication_failure",
            "Invoice payment failed (attempt 1)",
            _correlationId), Times.Once);
    }

    [Fact]
    public async Task HandleInvoicePaymentFailedWebhookAsync_WithMultipleAttempts_IncludesAttemptCount()
    {
        // Arrange
        var eventData = CreateInvoicePaymentFailedEventData("in_test123", "cus_test123", "sub_test123", 999, 3);

        var failedPaymentDto = new FailedPaymentDto
        {
            Id = Guid.NewGuid(),
            UserId = _userId,
            FailureType = "test_failure",
            FailureReason = "Test failure",
            Amount = 9.99m,
            Currency = "usd",
            RecoveryStatus = "active",
            RetryCount = 0,
            IsRetriable = true,
            RequiresAction = false,
            CreatedAt = DateTime.UtcNow
        };

        _mockPaymentRetryService
            .Setup(s => s.CreateFailedPaymentAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(failedPaymentDto);

        // Act
        var result = await _handler.HandleInvoicePaymentFailedWebhookAsync("evt_test123", eventData, _correlationId);

        // Assert
        Assert.True(result);
        _mockPaymentRetryService.Verify(s => s.CreateFailedPaymentAsync(
            _userId,
            It.IsAny<Guid>(),
            "subscription_payment_failure",
            "payment_intent_authentication_failure",
            "Invoice payment failed (attempt 3)",
            _correlationId), Times.Once);
    }

    // HandlePaymentIntentPaymentFailedWebhookAsync Tests (5 tests)
    [Fact]
    public async Task HandlePaymentIntentPaymentFailedWebhookAsync_WithValidData_ProcessesSuccessfully()
    {
        // Arrange
        var eventData = CreatePaymentIntentFailedEventData("pi_test123", "insufficient_funds", "Insufficient funds");

        var failedPaymentDto = new FailedPaymentDto
        {
            Id = Guid.NewGuid(),
            UserId = _userId,
            FailureType = "test_failure",
            FailureReason = "Test failure",
            Amount = 9.99m,
            Currency = "usd",
            RecoveryStatus = "active",
            RetryCount = 0,
            IsRetriable = true,
            RequiresAction = false,
            CreatedAt = DateTime.UtcNow
        };

        _mockPaymentRetryService
            .Setup(s => s.CreateFailedPaymentAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(failedPaymentDto);

        // Act
        var result = await _handler.HandlePaymentIntentPaymentFailedWebhookAsync("evt_test123", eventData, _correlationId);

        // Assert
        Assert.True(result);

        var transaction = await _context.PaymentTransactions.FirstAsync(pt => pt.StripePaymentIntentId == "pi_test123");
        Assert.Equal("failed", transaction.Status);
        Assert.Equal("Insufficient funds", transaction.FailureReason);
    }

    [Fact]
    public async Task HandlePaymentIntentPaymentFailedWebhookAsync_WithMissingPaymentIntentId_ReturnsFalse()
    {
        // Arrange
        var eventData = CreatePaymentIntentFailedEventData("", "insufficient_funds", "Insufficient funds");

        // Act
        var result = await _handler.HandlePaymentIntentPaymentFailedWebhookAsync("evt_test123", eventData, _correlationId);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task HandlePaymentIntentPaymentFailedWebhookAsync_WithNonexistentTransaction_ReturnsTrue()
    {
        // Arrange
        var eventData = CreatePaymentIntentFailedEventData("pi_nonexistent", "insufficient_funds", "Insufficient funds");

        // Act
        var result = await _handler.HandlePaymentIntentPaymentFailedWebhookAsync("evt_test123", eventData, _correlationId);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public async Task HandlePaymentIntentPaymentFailedWebhookAsync_WithExistingFailedPayment_ReturnsTrue()
    {
        // Arrange
        var transaction = await _context.PaymentTransactions.FirstAsync(pt => pt.StripePaymentIntentId == "pi_test123");

        var failedPayment = new FailedPayment
        {
            Id = Guid.NewGuid(),
            PaymentTransactionId = transaction.Id,
            UserId = _userId,
            FailureType = "card_declined",
            StripeDeclineCode = "card_declined",
            FailureReason = "Card declined",
            RecoveryStatus = "active",
            CreatedAt = DateTime.UtcNow
        };

        _context.FailedPayments.Add(failedPayment);
        await _context.SaveChangesAsync();

        var eventData = CreatePaymentIntentFailedEventData("pi_test123", "insufficient_funds", "Insufficient funds");

        // Act
        var result = await _handler.HandlePaymentIntentPaymentFailedWebhookAsync("evt_test123", eventData, _correlationId);

        // Assert
        Assert.True(result);
        _mockPaymentRetryService.Verify(s => s.CreateFailedPaymentAsync(
            It.IsAny<Guid>(),
            It.IsAny<Guid>(),
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task HandlePaymentIntentPaymentFailedWebhookAsync_WithAuthenticationRequired_MapsCorrectFailureType()
    {
        // Arrange
        var eventData = CreatePaymentIntentFailedEventData("pi_test123", "authentication_required", "Authentication required");

        var failedPaymentDto = new FailedPaymentDto
        {
            Id = Guid.NewGuid(),
            UserId = _userId,
            FailureType = "test_failure",
            FailureReason = "Test failure",
            Amount = 9.99m,
            Currency = "usd",
            RecoveryStatus = "active",
            RetryCount = 0,
            IsRetriable = true,
            RequiresAction = false,
            CreatedAt = DateTime.UtcNow
        };

        _mockPaymentRetryService
            .Setup(s => s.CreateFailedPaymentAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(failedPaymentDto);

        // Act
        var result = await _handler.HandlePaymentIntentPaymentFailedWebhookAsync("evt_test123", eventData, _correlationId);

        // Assert
        Assert.True(result);
        _mockPaymentRetryService.Verify(s => s.CreateFailedPaymentAsync(
            _userId,
            It.IsAny<Guid>(),
            "authentication_required",
            "authentication_required",
            "Authentication required",
            _correlationId), Times.Once);
    }

    // HandlePaymentSucceededWebhookAsync Tests (4 tests)
    [Fact]
    public async Task HandlePaymentSucceededWebhookAsync_WithValidData_UpdatesTransaction()
    {
        // Arrange
        var eventData = CreatePaymentSucceededEventData("pi_test123");

        // Act
        var result = await _handler.HandlePaymentSucceededWebhookAsync("evt_test123", eventData, _correlationId);

        // Assert
        Assert.True(result);

        var transaction = await _context.PaymentTransactions.FirstAsync(pt => pt.StripePaymentIntentId == "pi_test123");
        Assert.Equal("succeeded", transaction.Status);
        Assert.NotNull(transaction.ProcessedAt);
    }

    [Fact]
    public async Task HandlePaymentSucceededWebhookAsync_WithActiveFailedPayment_ResolvesIt()
    {
        // Arrange
        var transaction = await _context.PaymentTransactions.FirstAsync(pt => pt.StripePaymentIntentId == "pi_test123");

        var failedPayment = new FailedPayment
        {
            Id = Guid.NewGuid(),
            PaymentTransactionId = transaction.Id,
            UserId = _userId,
            FailureType = "insufficient_funds",
            StripeDeclineCode = "insufficient_funds",
            FailureReason = "Insufficient funds",
            RecoveryStatus = "active",
            CreatedAt = DateTime.UtcNow
        };

        _context.FailedPayments.Add(failedPayment);
        await _context.SaveChangesAsync();

        var eventData = CreatePaymentSucceededEventData("pi_test123");

        var updatedFailedPaymentDto = new FailedPaymentDto
        {
            Id = failedPayment.Id,
            UserId = _userId,
            FailureType = "insufficient_funds",
            FailureReason = "Insufficient funds",
            Amount = 9.99m,
            Currency = "usd",
            RecoveryStatus = "resolved",
            RetryCount = 0,
            IsRetriable = false,
            RequiresAction = false,
            CreatedAt = DateTime.UtcNow
        };

        _mockPaymentRetryService
            .Setup(s => s.UpdateFailedPaymentStatusAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(updatedFailedPaymentDto);

        // Act
        var result = await _handler.HandlePaymentSucceededWebhookAsync("evt_test123", eventData, _correlationId);

        // Assert
        Assert.True(result);
        _mockPaymentRetryService.Verify(s => s.UpdateFailedPaymentStatusAsync(
            failedPayment.Id,
            "resolved",
            _correlationId), Times.Once);
    }

    [Fact]
    public async Task HandlePaymentSucceededWebhookAsync_WithMissingPaymentIntentId_ReturnsFalse()
    {
        // Arrange
        var eventData = CreatePaymentSucceededEventData("");

        // Act
        var result = await _handler.HandlePaymentSucceededWebhookAsync("evt_test123", eventData, _correlationId);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task HandlePaymentSucceededWebhookAsync_WithNonexistentTransaction_ReturnsTrue()
    {
        // Arrange
        var eventData = CreatePaymentSucceededEventData("pi_nonexistent");

        // Act
        var result = await _handler.HandlePaymentSucceededWebhookAsync("evt_test123", eventData, _correlationId);

        // Assert
        Assert.True(result);
    }

    // HandleSubscriptionPastDueWebhookAsync Tests (4 tests)
    [Fact]
    public async Task HandleSubscriptionPastDueWebhookAsync_WithValidData_ProcessesSuccessfully()
    {
        // Arrange
        var eventData = CreateSubscriptionPastDueEventData("sub_test123", "cus_test123");

        var failedPaymentDto = new FailedPaymentDto
        {
            Id = Guid.NewGuid(),
            UserId = _userId,
            FailureType = "test_failure",
            FailureReason = "Test failure",
            Amount = 9.99m,
            Currency = "usd",
            RecoveryStatus = "active",
            RetryCount = 0,
            IsRetriable = true,
            RequiresAction = false,
            CreatedAt = DateTime.UtcNow
        };

        _mockPaymentRetryService
            .Setup(s => s.CreateFailedPaymentAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(failedPaymentDto);

        // Act
        var result = await _handler.HandleSubscriptionPastDueWebhookAsync("evt_test123", eventData, _correlationId);

        // Assert
        Assert.True(result);

        var subscription = await _context.Subscriptions.FirstAsync(s => s.StripeSubscriptionId == "sub_test123");
        Assert.Equal("past_due", subscription.Status);

        var syntheticTransaction = await _context.PaymentTransactions
            .FirstOrDefaultAsync(pt => pt.StripePaymentIntentId.StartsWith("past_due_sub_test123"));
        Assert.NotNull(syntheticTransaction);
        Assert.Equal("failed", syntheticTransaction.Status);

        _mockPaymentRetryService.Verify(s => s.CreateFailedPaymentAsync(
            _userId,
            syntheticTransaction.Id,
            "subscription_past_due",
            "subscription_payment_failed",
            "Subscription payment is past due",
            _correlationId), Times.Once);
    }

    [Fact]
    public async Task HandleSubscriptionPastDueWebhookAsync_WithMissingSubscriptionId_ReturnsFalse()
    {
        // Arrange
        var eventData = CreateSubscriptionPastDueEventData("", "cus_test123");

        // Act
        var result = await _handler.HandleSubscriptionPastDueWebhookAsync("evt_test123", eventData, _correlationId);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task HandleSubscriptionPastDueWebhookAsync_WithNonexistentSubscription_ReturnsTrue()
    {
        // Arrange
        var eventData = CreateSubscriptionPastDueEventData("sub_nonexistent", "cus_test123");

        // Act
        var result = await _handler.HandleSubscriptionPastDueWebhookAsync("evt_test123", eventData, _correlationId);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public async Task HandleSubscriptionPastDueWebhookAsync_CreatesSyntheticTransaction()
    {
        // Arrange
        var eventData = CreateSubscriptionPastDueEventData("sub_test123", "cus_test123");

        var failedPaymentDto = new FailedPaymentDto
        {
            Id = Guid.NewGuid(),
            UserId = _userId,
            FailureType = "test_failure",
            FailureReason = "Test failure",
            Amount = 9.99m,
            Currency = "usd",
            RecoveryStatus = "active",
            RetryCount = 0,
            IsRetriable = true,
            RequiresAction = false,
            CreatedAt = DateTime.UtcNow
        };

        _mockPaymentRetryService
            .Setup(s => s.CreateFailedPaymentAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(failedPaymentDto);

        // Act
        var result = await _handler.HandleSubscriptionPastDueWebhookAsync("evt_test123", eventData, _correlationId);

        // Assert
        Assert.True(result);

        var syntheticTransaction = await _context.PaymentTransactions
            .FirstOrDefaultAsync(pt => pt.StripePaymentIntentId.StartsWith("past_due_sub_test123"));

        Assert.NotNull(syntheticTransaction);
        Assert.Equal(_userId, syntheticTransaction.UserId);
        Assert.Equal(9.99m, syntheticTransaction.Amount);
        Assert.Equal("usd", syntheticTransaction.Currency);
        Assert.Contains("premium", syntheticTransaction.Description);
    }

    // HandleChargeDisputedWebhookAsync Tests (2 tests)
    [Fact]
    public async Task HandleChargeDisputedWebhookAsync_WithValidData_ReturnsTrue()
    {
        // Arrange
        var eventData = CreateChargeDisputedEventData("ch_test123");

        // Act
        var result = await _handler.HandleChargeDisputedWebhookAsync("evt_test123", eventData, _correlationId);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public async Task HandleChargeDisputedWebhookAsync_WithMissingChargeId_ReturnsFalse()
    {
        // Arrange
        var eventData = CreateChargeDisputedEventData("");

        // Act
        var result = await _handler.HandleChargeDisputedWebhookAsync("evt_test123", eventData, _correlationId);

        // Assert
        Assert.False(result);
    }

    // HandleSubscriptionCanceledWebhookAsync Tests (3 tests)
    [Fact]
    public async Task HandleSubscriptionCanceledWebhookAsync_WithPaymentFailedReason_StopsDunningCampaigns()
    {
        // Arrange
        var subscription = await _context.Subscriptions.FirstAsync(s => s.StripeSubscriptionId == "sub_test123");

        var transaction = new PaymentTransaction
        {
            Id = Guid.NewGuid(),
            UserId = _userId,
            StripePaymentIntentId = "pi_canceled",
            Status = "failed",
            Amount = 9.99m,
            Currency = "usd",
            CreatedAt = DateTime.UtcNow
        };

        var failedPayment = new FailedPayment
        {
            Id = Guid.NewGuid(),
            PaymentTransactionId = transaction.Id,
            UserId = _userId,
            SubscriptionId = subscription.Id,
            FailureType = "insufficient_funds",
            StripeDeclineCode = "insufficient_funds",
            FailureReason = "Insufficient funds",
            RecoveryStatus = "active",
            CreatedAt = DateTime.UtcNow
        };

        _context.PaymentTransactions.Add(transaction);
        _context.FailedPayments.Add(failedPayment);
        await _context.SaveChangesAsync();

        var eventData = CreateSubscriptionCanceledEventData("sub_test123", "payment_failed");

        _mockDunningService
            .Setup(s => s.StopDunningCampaignAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string>()))
            .Returns(Task.CompletedTask);

        var gracePeriodDto = new GracePeriodDto
        {
            Id = Guid.NewGuid(),
            UserId = _userId,
            Status = "ended",
            GracePeriodType = "subscription_past_due",
            GracePeriodDays = 7,
            StartedAt = DateTime.UtcNow.AddDays(-7)
        };

        _mockGracePeriodService
            .Setup(s => s.EndGracePeriodAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(gracePeriodDto);

        // Act
        var result = await _handler.HandleSubscriptionCanceledWebhookAsync("evt_test123", eventData, _correlationId);

        // Assert
        Assert.True(result);
        _mockDunningService.Verify(s => s.StopDunningCampaignAsync(failedPayment.Id, "subscription_cancelled", _correlationId), Times.Once);
        _mockGracePeriodService.Verify(s => s.EndGracePeriodAsync(failedPayment.Id, "subscription_cancelled", _correlationId), Times.Once);
    }

    [Fact]
    public async Task HandleSubscriptionCanceledWebhookAsync_WithNonPaymentFailedReason_DoesNotStopDunning()
    {
        // Arrange
        var eventData = CreateSubscriptionCanceledEventData("sub_test123", "user_requested");

        // Act
        var result = await _handler.HandleSubscriptionCanceledWebhookAsync("evt_test123", eventData, _correlationId);

        // Assert
        Assert.True(result);
        _mockDunningService.Verify(s => s.StopDunningCampaignAsync(It.IsAny<Guid>(), It.IsAny<string>(), It.IsAny<string>()), Times.Never);
    }

    [Fact]
    public async Task HandleSubscriptionCanceledWebhookAsync_WithNonexistentSubscription_ReturnsTrue()
    {
        // Arrange
        var eventData = CreateSubscriptionCanceledEventData("sub_nonexistent", "payment_failed");

        // Act
        var result = await _handler.HandleSubscriptionCanceledWebhookAsync("evt_test123", eventData, _correlationId);

        // Assert
        Assert.True(result);
    }

    // Helper methods to create test event data
    private static string CreatePaymentFailedEventData(string paymentIntentId, string customerId, string declineCode, string message)
    {
        var eventData = new
        {
            data = new
            {
                @object = new
                {
                    id = paymentIntentId,
                    customer = customerId,
                    last_payment_error = new
                    {
                        decline_code = declineCode,
                        message = message
                    }
                }
            }
        };

        return JsonSerializer.Serialize(eventData);
    }

    private static string CreateInvoicePaymentFailedEventData(string invoiceId, string customerId, string? subscriptionId, int amountDue, int attemptCount)
    {
        var obj = new Dictionary<string, object>
        {
            ["id"] = invoiceId,
            ["customer"] = customerId,
            ["amount_due"] = amountDue,
            ["currency"] = "usd",
            ["attempt_count"] = attemptCount
        };

        if (subscriptionId != null)
            obj["subscription"] = subscriptionId;

        var eventData = new
        {
            data = new { @object = obj }
        };

        return JsonSerializer.Serialize(eventData);
    }

    private static string CreatePaymentIntentFailedEventData(string paymentIntentId, string declineCode, string message)
    {
        var eventData = new
        {
            data = new
            {
                @object = new
                {
                    id = paymentIntentId,
                    last_payment_error = new
                    {
                        decline_code = declineCode,
                        message = message
                    }
                }
            }
        };

        return JsonSerializer.Serialize(eventData);
    }

    private static string CreatePaymentSucceededEventData(string paymentIntentId)
    {
        var eventData = new
        {
            data = new
            {
                @object = new
                {
                    id = paymentIntentId
                }
            }
        };

        return JsonSerializer.Serialize(eventData);
    }

    private static string CreateSubscriptionPastDueEventData(string subscriptionId, string customerId)
    {
        var eventData = new
        {
            data = new
            {
                @object = new
                {
                    id = subscriptionId,
                    customer = customerId
                }
            }
        };

        return JsonSerializer.Serialize(eventData);
    }

    private static string CreateChargeDisputedEventData(string chargeId)
    {
        var eventData = new
        {
            data = new
            {
                @object = new
                {
                    charge = chargeId
                }
            }
        };

        return JsonSerializer.Serialize(eventData);
    }

    private static string CreateSubscriptionCanceledEventData(string subscriptionId, string? cancelationReason)
    {
        var obj = new Dictionary<string, object>
        {
            ["id"] = subscriptionId
        };

        if (cancelationReason != null)
        {
            obj["cancellation_details"] = new Dictionary<string, object>
            {
                ["reason"] = cancelationReason
            };
        }

        var eventData = new
        {
            data = new { @object = obj }
        };

        return JsonSerializer.Serialize(eventData);
    }
}
