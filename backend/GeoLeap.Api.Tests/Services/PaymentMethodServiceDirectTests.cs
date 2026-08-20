using Xunit;
using Moq;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;

namespace GeoLeap.Api.Tests.Services;

/// <summary>
/// Direct tests for PaymentMethodService - Phase 2.6
/// Tests Stripe payment method CRUD, validation, expiry checks, and synchronization
/// </summary>
public class PaymentMethodServiceDirectTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly Mock<ILogger<PaymentMethodService>> _mockLogger;
    private readonly Mock<IRbacService> _mockRbacService;
    private readonly Mock<IEmailService> _mockEmailService;
    private readonly Mock<IConfiguration> _mockConfiguration;
    private readonly PaymentMethodService _service;
    private readonly Guid _testUserId = Guid.NewGuid();
    private readonly Guid _testPaymentMethodId = Guid.NewGuid();

    public PaymentMethodServiceDirectTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: $"TestDb_{Guid.NewGuid()}")
            .Options;

        _context = new ApplicationDbContext(options);
        _mockLogger = new Mock<ILogger<PaymentMethodService>>();
        _mockRbacService = new Mock<IRbacService>();
        _mockEmailService = new Mock<IEmailService>();
        _mockConfiguration = new Mock<IConfiguration>();

        // Configure mock configuration for Stripe test mode
        _mockConfiguration.Setup(c => c["Stripe:SecretKey"]).Returns("sk_test_fake_key_for_testing");
        _mockConfiguration.Setup(c => c["ASPNETCORE_ENVIRONMENT"]).Returns("Testing");

        _service = new PaymentMethodService(
            _context,
            _mockLogger.Object,
            _mockRbacService.Object,
            _mockEmailService.Object,
            _mockConfiguration.Object);

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

        // Seed test payment method
        var paymentMethod = new PaymentMethod
        {
            Id = _testPaymentMethodId,
            UserId = _testUserId,
            StripePaymentMethodId = "pm_test_123",
            Type = "card",
            Last4 = "4242",
            Brand = "Visa",
            ExpiryMonth = 12,
            ExpiryYear = 2025,
            IsDefault = true,
            IsActive = true,
            Country = "US",
            Fingerprint = "fingerprint123",
            Nickname = "My Visa",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.PaymentMethods.Add(paymentMethod);

        await _context.SaveChangesAsync();
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    // Payment Method Retrieval Tests
    [Fact]
    public async Task GetPaymentMethodAsync_WithValidId_ReturnsPaymentMethod()
    {
        // Act
        var result = await _service.GetPaymentMethodAsync(_testUserId, _testPaymentMethodId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(_testPaymentMethodId, result.Id);
        Assert.Equal("4242", result.Last4);
        Assert.Equal("Visa", result.Brand);
    }

    [Fact]
    public async Task GetPaymentMethodAsync_WithInvalidId_ReturnsNull()
    {
        // Arrange
        var invalidId = Guid.NewGuid();

        // Act
        var result = await _service.GetPaymentMethodAsync(_testUserId, invalidId);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task GetPaymentMethodAsync_WithWrongUserId_ReturnsNull()
    {
        // Arrange
        var wrongUserId = Guid.NewGuid();

        // Act
        var result = await _service.GetPaymentMethodAsync(wrongUserId, _testPaymentMethodId);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task GetUserPaymentMethodsAsync_WithPaymentMethods_ReturnsOrderedList()
    {
        // Arrange - Add another non-default payment method
        var secondPaymentMethod = new PaymentMethod
        {
            Id = Guid.NewGuid(),
            UserId = _testUserId,
            StripePaymentMethodId = "pm_test_456",
            Type = "card",
            Last4 = "5555",
            Brand = "Mastercard",
            ExpiryMonth = 6,
            ExpiryYear = 2026,
            IsDefault = false,
            IsActive = true,
            Country = "US",
            Fingerprint = "fingerprint456",
            CreatedAt = DateTime.UtcNow.AddDays(1),
            UpdatedAt = DateTime.UtcNow.AddDays(1)
        };
        _context.PaymentMethods.Add(secondPaymentMethod);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetUserPaymentMethodsAsync(_testUserId);

        // Assert
        Assert.Equal(2, result.Count);
        Assert.True(result[0].IsDefault); // Default first
        Assert.False(result[1].IsDefault);
    }

    [Fact]
    public async Task GetUserPaymentMethodsAsync_WithNoPaymentMethods_ReturnsEmptyList()
    {
        // Arrange
        var newUserId = Guid.NewGuid();
        var newUser = new User
        {
            Id = newUserId,
            UserName = "newuser@example.com",
            Email = "newuser@example.com",
            EmailConfirmed = true
        };
        _context.Users.Add(newUser);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetUserPaymentMethodsAsync(newUserId);

        // Assert
        Assert.NotNull(result);
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetDefaultPaymentMethodAsync_WithDefaultMethod_ReturnsDefaultMethod()
    {
        // Act
        var result = await _service.GetDefaultPaymentMethodAsync(_testUserId);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.IsDefault);
        Assert.Equal(_testPaymentMethodId, result.Id);
    }

    [Fact]
    public async Task GetDefaultPaymentMethodAsync_WithNoDefaultMethod_ReturnsNull()
    {
        // Arrange - Remove default flag
        var paymentMethod = await _context.PaymentMethods.FindAsync(_testPaymentMethodId);
        paymentMethod!.IsDefault = false;
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetDefaultPaymentMethodAsync(_testUserId);

        // Assert
        Assert.Null(result);
    }

    // Expiry Tests
    [Fact]
    public async Task IsPaymentMethodExpiringSoonAsync_WithExpiringCard_ReturnsTrue()
    {
        // Arrange - Set expiry to next month
        var paymentMethod = await _context.PaymentMethods.FindAsync(_testPaymentMethodId);
        var nextMonth = DateTime.UtcNow.AddMonths(1);
        paymentMethod!.ExpiryMonth = nextMonth.Month;
        paymentMethod.ExpiryYear = nextMonth.Year;
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.IsPaymentMethodExpiringSoonAsync(_testPaymentMethodId, warningDays: 60);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public async Task IsPaymentMethodExpiringSoonAsync_WithValidCard_ReturnsFalse()
    {
        // Arrange - Set expiry far in future
        var paymentMethod = await _context.PaymentMethods.FindAsync(_testPaymentMethodId);
        paymentMethod!.ExpiryMonth = 12;
        paymentMethod.ExpiryYear = DateTime.UtcNow.Year + 5;
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.IsPaymentMethodExpiringSoonAsync(_testPaymentMethodId, warningDays: 30);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task GetExpiringPaymentMethodsAsync_WithExpiringCards_ReturnsExpiringMethods()
    {
        // Arrange - Add expiring payment method
        var expiringMethod = new PaymentMethod
        {
            Id = Guid.NewGuid(),
            UserId = _testUserId,
            StripePaymentMethodId = "pm_test_expiring",
            Type = "card",
            Last4 = "9999",
            Brand = "Visa",
            ExpiryMonth = DateTime.UtcNow.AddMonths(1).Month,
            ExpiryYear = DateTime.UtcNow.AddMonths(1).Year,
            IsDefault = false,
            IsActive = true,
            Country = "US",
            Fingerprint = "fingerprint999",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.PaymentMethods.Add(expiringMethod);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetExpiringPaymentMethodsAsync(warningDays: 60);

        // Assert
        Assert.NotEmpty(result);
        Assert.Contains(result, pm => pm.Last4 == "9999");
    }

    // Ownership Tests
    [Fact]
    public async Task IsPaymentMethodOwnedByUserAsync_WithOwnedMethod_ReturnsTrue()
    {
        // Act
        var result = await _service.IsPaymentMethodOwnedByUserAsync(_testUserId, _testPaymentMethodId);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public async Task IsPaymentMethodOwnedByUserAsync_WithNotOwnedMethod_ReturnsFalse()
    {
        // Arrange
        var wrongUserId = Guid.NewGuid();

        // Act
        var result = await _service.IsPaymentMethodOwnedByUserAsync(wrongUserId, _testPaymentMethodId);

        // Assert
        Assert.False(result);
    }

    // Analytics Tests
    [Fact]
    public async Task GetPaymentMethodAnalyticsAsync_WithPaymentMethods_ReturnsAnalytics()
    {
        // Act
        var result = await _service.GetPaymentMethodAnalyticsAsync(userId: _testUserId);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.ContainsKey("totalMethods"));
        Assert.True(result.ContainsKey("activeMethods"));
        Assert.True(result.ContainsKey("methodsByBrand"));
        Assert.Equal(1, result["totalMethods"]);
        Assert.Equal(1, result["activeMethods"]);
    }

    [Fact]
    public async Task GetPaymentMethodAnalyticsAsync_WithNoPaymentMethods_ReturnsZeroAnalytics()
    {
        // Arrange
        var newUserId = Guid.NewGuid();
        var newUser = new User
        {
            Id = newUserId,
            UserName = "newuser@example.com",
            Email = "newuser@example.com",
            EmailConfirmed = true
        };
        _context.Users.Add(newUser);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetPaymentMethodAnalyticsAsync(userId: newUserId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(0, result["totalMethods"]);
        Assert.Equal(0, result["activeMethods"]);
    }

    // Enable/Disable Tests
    [Fact]
    public async Task DisablePaymentMethodAsync_WithValidId_DisablesMethod()
    {
        // Act
        var result = await _service.DisablePaymentMethodAsync(_testPaymentMethodId, "Test disable", "test-correlation-id");

        // Assert
        Assert.True(result);

        // Verify disabled in database
        var paymentMethod = await _context.PaymentMethods.FindAsync(_testPaymentMethodId);
        Assert.False(paymentMethod!.IsActive);
    }

    [Fact]
    public async Task DisablePaymentMethodAsync_WithInvalidId_ReturnsFalse()
    {
        // Arrange
        var invalidId = Guid.NewGuid();

        // Act
        var result = await _service.DisablePaymentMethodAsync(invalidId, "Test disable", "test-correlation-id");

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task EnablePaymentMethodAsync_WithValidId_EnablesMethod()
    {
        // Arrange - First disable
        await _service.DisablePaymentMethodAsync(_testPaymentMethodId, "Test disable", "test-correlation-id");

        // Act
        var result = await _service.EnablePaymentMethodAsync(_testPaymentMethodId, "test-correlation-id");

        // Assert
        Assert.True(result);

        // Verify enabled in database
        var paymentMethod = await _context.PaymentMethods.FindAsync(_testPaymentMethodId);
        Assert.True(paymentMethod!.IsActive);
    }

    [Fact]
    public async Task EnablePaymentMethodAsync_WithInvalidId_ReturnsFalse()
    {
        // Arrange
        var invalidId = Guid.NewGuid();

        // Act
        var result = await _service.EnablePaymentMethodAsync(invalidId, "test-correlation-id");

        // Assert
        Assert.False(result);
    }

    // Activity Logging Tests
    [Fact]
    public async Task LogPaymentMethodActivityAsync_WithValidData_LogsActivity()
    {
        // Act
        await _service.LogPaymentMethodActivityAsync(
            _testUserId,
            _testPaymentMethodId,
            "test_action",
            "test-correlation-id",
            new Dictionary<string, object> { { "key", "value" } });

        // Assert - Verify log was created
        var logs = await _context.UserActivityLogs
            .Where(l => l.UserId == _testUserId && l.ActivityType == "test_action")
            .ToListAsync();
        Assert.Single(logs);
    }

    // Stripe API Tests - Skipped (require real Stripe API)
    [Fact(Skip = "Stripe API calls require real API key - integration test needed")]
    public async Task AddPaymentMethodAsync_WithValidRequest_AddsPaymentMethod()
    {
        // This test requires real Stripe API integration
    }

    [Fact(Skip = "Stripe API calls require real API key - integration test needed")]
    public async Task UpdatePaymentMethodAsync_WithValidRequest_UpdatesPaymentMethod()
    {
        // This test requires real Stripe API integration
    }

    [Fact(Skip = "Stripe API calls require real API key - integration test needed")]
    public async Task RemovePaymentMethodAsync_WithValidRequest_RemovesPaymentMethod()
    {
        // This test requires real Stripe API integration
    }

    [Fact(Skip = "Stripe API calls require real API key - integration test needed")]
    public async Task SetDefaultPaymentMethodAsync_WithValidRequest_SetsAsDefault()
    {
        // This test requires real Stripe API integration
    }

    [Fact(Skip = "Stripe API calls require real API key - integration test needed")]
    public async Task ValidatePaymentMethodAsync_WithValidRequest_ReturnsTrue()
    {
        // This test requires real Stripe API integration
    }

    [Fact(Skip = "Stripe API calls require real API key - integration test needed")]
    public async Task SyncPaymentMethodWithStripeAsync_WithValidRequest_SyncsData()
    {
        // This test requires real Stripe API integration
    }

    [Fact(Skip = "Stripe API calls require real API key - integration test needed")]
    public async Task SyncAllUserPaymentMethodsAsync_WithValidRequest_SyncsAllMethods()
    {
        // This test requires real Stripe API integration
    }
}
