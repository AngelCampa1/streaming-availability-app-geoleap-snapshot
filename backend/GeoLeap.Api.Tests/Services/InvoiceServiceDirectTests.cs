using Xunit;
using Moq;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;

namespace GeoLeap.Api.Tests.Services;

/// <summary>
/// Direct tests for InvoiceService - Phase 2.5
/// Tests invoice generation, PDF delivery, and analytics
/// </summary>
public class InvoiceServiceDirectTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly Mock<ILogger<InvoiceService>> _mockLogger;
    private readonly Mock<ITaxCalculationService> _mockTaxService;
    private readonly Mock<IInvoicePdfService> _mockPdfService;
    private readonly Mock<IInvoiceDeliveryService> _mockDeliveryService;
    private readonly Mock<IBillingAddressService> _mockBillingAddressService;
    private readonly InvoiceService _service;
    private readonly Guid _testUserId = Guid.NewGuid();
    private readonly Guid _testTransactionId = Guid.NewGuid();
    private readonly Guid _testSubscriptionId = Guid.NewGuid();

    public InvoiceServiceDirectTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: $"TestDb_{Guid.NewGuid()}")
            .Options;

        _context = new ApplicationDbContext(options);
        _mockLogger = new Mock<ILogger<InvoiceService>>();
        _mockTaxService = new Mock<ITaxCalculationService>();
        _mockPdfService = new Mock<IInvoicePdfService>();
        _mockDeliveryService = new Mock<IInvoiceDeliveryService>();
        _mockBillingAddressService = new Mock<IBillingAddressService>();

        _service = new InvoiceService(
            _context,
            _mockLogger.Object,
            _mockTaxService.Object,
            _mockPdfService.Object,
            _mockDeliveryService.Object,
            _mockBillingAddressService.Object);

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
            EmailConfirmed = true,
            FirstName = "Test",
            LastName = "User"
        };
        _context.Users.Add(testUser);

        // Seed payment transaction
        var transaction = new PaymentTransaction
        {
            Id = _testTransactionId,
            UserId = _testUserId,
            Amount = 9.99m,
            Currency = "USD",
            Status = "succeeded",
            StripePaymentIntentId = "pi_test_123",
            Description = "Premium Subscription",
            ProcessedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.PaymentTransactions.Add(transaction);

        // Seed subscription
        var subscription = new Subscription
        {
            Id = _testSubscriptionId,
            UserId = _testUserId,
            Status = "active",
            PlanType = "premium",
            Amount = 9.99m,
            Currency = "USD",
            StripeSubscriptionId = "sub_test_123",
            StripeCustomerId = Guid.NewGuid(), // Guid, not string
            StripePriceId = "price_test_premium", // Required field
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.Subscriptions.Add(subscription);

        await _context.SaveChangesAsync();
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    // Invoice Generation Tests
    [Fact]
    public async Task GenerateInvoiceAsync_WithInvalidTransactionId_ThrowsArgumentException()
    {
        // Arrange
        var invalidId = Guid.NewGuid();

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(() =>
            _service.GenerateInvoiceAsync(invalidId, "test-correlation-id"));
    }

    [Fact]
    public async Task GenerateInvoiceAsync_WithFailedTransaction_ThrowsInvalidOperationException()
    {
        // Arrange - Create failed transaction
        var failedTransaction = new PaymentTransaction
        {
            Id = Guid.NewGuid(),
            UserId = _testUserId,
            Amount = 9.99m,
            Currency = "USD",
            Status = "failed",
            StripePaymentIntentId = "pi_test_failed",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.PaymentTransactions.Add(failedTransaction);
        await _context.SaveChangesAsync();

        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _service.GenerateInvoiceAsync(failedTransaction.Id, "test-correlation-id"));
    }

    [Fact(Skip = "Hangfire background jobs require infrastructure setup - integration test needed")]
    public async Task GenerateInvoiceAsync_WithValidTransaction_GeneratesInvoice()
    {
        // This test requires Hangfire background job infrastructure
        // Testing the full flow requires integration test environment
    }

    [Fact]
    public async Task GenerateSubscriptionInvoiceAsync_WithInvalidSubscriptionId_ThrowsArgumentException()
    {
        // Arrange
        var invalidId = Guid.NewGuid();
        var periodStart = DateTime.UtcNow.Date;
        var periodEnd = DateTime.UtcNow.Date.AddMonths(1);

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(() =>
            _service.GenerateSubscriptionInvoiceAsync(invalidId, periodStart, periodEnd, "test-correlation-id"));
    }

    [Fact(Skip = "Hangfire background jobs require infrastructure setup - integration test needed")]
    public async Task GenerateSubscriptionInvoiceAsync_WithValidSubscription_GeneratesInvoice()
    {
        // This test requires Hangfire background job infrastructure
    }

    // Invoice Retrieval Tests
    [Fact]
    public async Task GetInvoiceAsync_WithInvalidInvoiceId_ReturnsNull()
    {
        // Arrange
        var invalidId = Guid.NewGuid();

        // Act
        var result = await _service.GetInvoiceAsync(invalidId, _testUserId);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task GetInvoiceByNumberAsync_WithInvalidNumber_ReturnsNull()
    {
        // Arrange
        var invalidNumber = "INV-9999-000001";

        // Act
        var result = await _service.GetInvoiceByNumberAsync(invalidNumber, _testUserId);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task GetUserInvoicesAsync_WithNoInvoices_ReturnsEmptyList()
    {
        // Act
        var result = await _service.GetUserInvoicesAsync(_testUserId);

        // Assert
        Assert.NotNull(result);
        Assert.Empty(result);
    }

    // Status Management Tests
    [Fact]
    public async Task MarkInvoiceAsPaidAsync_WithInvalidInvoiceId_ReturnsFalse()
    {
        // Arrange
        var invalidId = Guid.NewGuid();

        // Act
        var result = await _service.MarkInvoiceAsPaidAsync(invalidId, _testTransactionId, "test-correlation-id");

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task VoidInvoiceAsync_WithInvalidInvoiceId_ReturnsFalse()
    {
        // Arrange
        var invalidId = Guid.NewGuid();

        // Act
        var result = await _service.VoidInvoiceAsync(invalidId, "Test void reason", "test-correlation-id");

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task UpdateInvoiceStatusAsync_WithInvalidStatus_ReturnsFalse()
    {
        // Arrange - Create invoice
        var invoice = new Invoice
        {
            Id = Guid.NewGuid(),
            InvoiceNumber = "INV-2024-000001",
            UserId = _testUserId,
            Status = "open",
            Subtotal = 9.99m,
            Total = 9.99m,
            Currency = "USD",
            IssueDate = DateTime.UtcNow,
            DueDate = DateTime.UtcNow.AddDays(30),
            PeriodStart = DateTime.UtcNow.Date,
            PeriodEnd = DateTime.UtcNow.Date.AddMonths(1),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.Invoices.Add(invoice);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.UpdateInvoiceStatusAsync(invoice.Id, "invalid_status", "test-correlation-id");

        // Assert
        Assert.False(result); // Service catches exception and returns false
    }

    // Analytics Tests
    [Fact]
    public async Task GetInvoiceAnalyticsAsync_WithNoInvoices_ReturnsZeroAnalytics()
    {
        // Arrange
        var startDate = DateTime.UtcNow.AddDays(-30);
        var endDate = DateTime.UtcNow;

        // Act
        var result = await _service.GetInvoiceAnalyticsAsync(_testUserId, startDate, endDate);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(0, result.TotalRevenue);
        Assert.Equal(0, result.TotalInvoices);
        Assert.Equal(0, result.PaidInvoices);
        Assert.Equal(0, result.UnpaidInvoices);
        Assert.Equal(0, result.AverageInvoiceAmount);
    }

    [Fact]
    public async Task GetSystemInvoiceAnalyticsAsync_WithNoInvoices_ReturnsZeroAnalytics()
    {
        // Arrange
        var startDate = DateTime.UtcNow.AddDays(-30);
        var endDate = DateTime.UtcNow;

        // Act
        var result = await _service.GetSystemInvoiceAnalyticsAsync(startDate, endDate);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(0, result.TotalRevenue);
        Assert.Equal(0, result.TotalInvoices);
    }

    // Bulk Operations Tests
    [Fact]
    public async Task BulkUpdateInvoiceStatusAsync_WithEmptyList_ReturnsTrue()
    {
        // Arrange
        var emptyList = new List<Guid>();

        // Act
        var result = await _service.BulkUpdateInvoiceStatusAsync(emptyList, "paid", "test-correlation-id");

        // Assert
        Assert.True(result);
    }

    [Fact]
    public async Task ResendInvoiceEmailsAsync_WithEmptyList_ReturnsTrue()
    {
        // Arrange
        var emptyList = new List<Guid>();

        // Act
        var result = await _service.ResendInvoiceEmailsAsync(emptyList, "test-correlation-id");

        // Assert
        Assert.True(result);
    }
}
