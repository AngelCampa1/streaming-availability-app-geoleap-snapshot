using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace GeoLeap.Api.Tests.Services;

public class SubscriptionServiceDirectTests : IDisposable
{
    private readonly SubscriptionService _service;
    private readonly ApplicationDbContext _context;
    private readonly Mock<IPaymentService> _paymentServiceMock;
    private readonly Mock<IRbacService> _rbacServiceMock;
    private readonly Mock<IEmailService> _emailServiceMock;
    private readonly Mock<ILogger<SubscriptionService>> _loggerMock;
    private readonly IConfiguration _configuration;

    // Test data IDs
    private readonly Guid _testUserId = Guid.NewGuid();
    private readonly Guid _premiumUserId = Guid.NewGuid();
    private readonly Guid _basicUserId = Guid.NewGuid();
    private readonly Guid _testSubscriptionId = Guid.NewGuid();
    private readonly Guid _cancelledSubscriptionId = Guid.NewGuid();

    public SubscriptionServiceDirectTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"SubscriptionTest_{Guid.NewGuid()}")
            .ConfigureWarnings(w => w.Ignore(Microsoft.EntityFrameworkCore.Diagnostics.InMemoryEventId.TransactionIgnoredWarning))
            .Options;

        _context = new ApplicationDbContext(options);

        _paymentServiceMock = new Mock<IPaymentService>();
        _rbacServiceMock = new Mock<IRbacService>();
        _emailServiceMock = new Mock<IEmailService>();
        _loggerMock = new Mock<ILogger<SubscriptionService>>();

        // Setup payment service mock to return subscriptions matching test data
        _paymentServiceMock
            .Setup(x => x.GetUserActiveSubscriptionAsync(_testUserId))
            .ReturnsAsync((Guid userId) => new SubscriptionDto
            {
                Id = _testSubscriptionId,
                UserId = userId,
                PlanId = "price_premium_monthly",
                Status = "active",
                Amount = 9.99m,
                Currency = "USD",
                Interval = "month",
                CurrentPeriodStart = DateTime.UtcNow.AddDays(-15),
                CurrentPeriodEnd = DateTime.UtcNow.AddDays(15)
            });

        _paymentServiceMock
            .Setup(x => x.GetUserActiveSubscriptionAsync(It.Is<Guid>(id => id != _testUserId && id != _premiumUserId && id != _basicUserId)))
            .ReturnsAsync((SubscriptionDto?)null);

        _paymentServiceMock
            .Setup(x => x.GetUserSubscriptionHistoryAsync(_testUserId))
            .ReturnsAsync(new List<SubscriptionDto>
            {
                new SubscriptionDto
                {
                    Id = _testSubscriptionId,
                    UserId = _testUserId,
                    PlanId = "price_premium_monthly",
                    Status = "active"
                }
            });

        _paymentServiceMock
            .Setup(x => x.GetUserSubscriptionHistoryAsync(It.Is<Guid>(id => id != _testUserId && id != _basicUserId)))
            .ReturnsAsync(new List<SubscriptionDto>());

        _paymentServiceMock
            .Setup(x => x.CancelSubscriptionAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<string>()))
            .ReturnsAsync((Guid userId, Guid subId, string corrId) => new SubscriptionDto
            {
                Id = subId,
                UserId = userId,
                PlanId = "price_premium_monthly",
                Status = "active",
                IsCanceled = true,
                Amount = 9.99m,
                Currency = "USD"
            });

        // Configure fake Stripe key for testing
        var inMemorySettings = new Dictionary<string, string?>
        {
            {"Stripe:SecretKey", "sk_test_fake_key_for_testing"},
            {"ASPNETCORE_ENVIRONMENT", "Testing"}
        };

        _configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(inMemorySettings)
            .Build();

        SeedTestData();

        _service = new SubscriptionService(
            _context,
            _paymentServiceMock.Object,
            _rbacServiceMock.Object,
            _emailServiceMock.Object,
            _loggerMock.Object,
            _configuration);
    }

    private void SeedTestData()
    {
        // Create test users
        _context.Users.AddRange(
            new User
            {
                Id = _testUserId,
                Email = "test@example.com",
                UserName = "test@example.com",
                IsActive = true
            },
            new User
            {
                Id = _premiumUserId,
                Email = "premium@example.com",
                UserName = "premium@example.com",
                IsActive = true
            },
            new User
            {
                Id = _basicUserId,
                Email = "basic@example.com",
                UserName = "basic@example.com",
                IsActive = true
            }
        );

        // Create subscription plans
        _context.SubscriptionPlans.AddRange(
            new SubscriptionPlan
            {
                Id = Guid.NewGuid(),
                Name = "Free",
                Description = "Free plan with limited features",
                StripePriceId = "price_free",
                Price = 0,
                Currency = "USD",
                BillingPeriod = "monthly",
                Tier = SubscriptionTier.Free,
                IsActive = true
            },
            new SubscriptionPlan
            {
                Id = Guid.NewGuid(),
                Name = "Basic",
                Description = "Basic plan with standard features",
                StripePriceId = "price_basic_monthly",
                Price = 4.99m,
                Currency = "USD",
                BillingPeriod = "monthly",
                Tier = SubscriptionTier.Basic,
                IsActive = true
            },
            new SubscriptionPlan
            {
                Id = Guid.NewGuid(),
                Name = "Premium",
                Description = "Premium plan with all features",
                StripePriceId = "price_premium_monthly",
                Price = 9.99m,
                Currency = "USD",
                BillingPeriod = "monthly",
                Tier = SubscriptionTier.Premium,
                IsActive = true
            }
        );

        // Create active subscription
        _context.Subscriptions.Add(new GeoLeap.Api.Models.Subscription
        {
            Id = _testSubscriptionId,
            UserId = _testUserId,
            StripePriceId = "price_premium_monthly",
            StripeSubscriptionId = "sub_test_active",
            Status = "active",
            PlanType = "premium",
            Amount = 9.99m,
            Currency = "USD",
            Interval = "month",
            CurrentPeriodStart = DateTime.UtcNow.AddDays(-15),
            CurrentPeriodEnd = DateTime.UtcNow.AddDays(15),
            CancelAtPeriodEnd = false,
            CreatedAt = DateTime.UtcNow.AddDays(-15)
        });

        // Create cancelled subscription
        _context.Subscriptions.Add(new GeoLeap.Api.Models.Subscription
        {
            Id = _cancelledSubscriptionId,
            UserId = _basicUserId,
            StripePriceId = "price_basic_monthly",
            StripeSubscriptionId = "sub_test_cancelled",
            Status = "cancelled",
            PlanType = "basic",
            Amount = 4.99m,
            Currency = "USD",
            Interval = "month",
            CurrentPeriodStart = DateTime.UtcNow.AddDays(-30),
            CurrentPeriodEnd = DateTime.UtcNow.AddDays(-1),
            CancelAtPeriodEnd = true,
            IsCanceled = true,
            CreatedAt = DateTime.UtcNow.AddDays(-60),
            CanceledAt = DateTime.UtcNow.AddDays(-1)
        });

        // Create UserSubscriptions
        _context.UserSubscriptions.AddRange(
            new UserSubscription
            {
                UserId = _testUserId,
                Tier = SubscriptionTier.Premium,
                IsActive = true,
                StartDate = DateTime.UtcNow.AddDays(-15),
                EndDate = DateTime.UtcNow.AddDays(15)
            },
            new UserSubscription
            {
                UserId = _basicUserId,
                Tier = SubscriptionTier.Basic,
                IsActive = false,
                StartDate = DateTime.UtcNow.AddDays(-60),
                EndDate = DateTime.UtcNow.AddDays(-1)
            }
        );

        _context.SaveChanges();
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    #region GetUserActiveSubscriptionAsync Tests

    [Fact]
    public async Task GetUserActiveSubscriptionAsync_WithActiveSubscription_ReturnsSubscription()
    {
        // Act
        var result = await _service.GetUserActiveSubscriptionAsync(_testUserId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(_testSubscriptionId, result.Id);
        Assert.Equal("active", result.Status);
    }

    [Fact]
    public async Task GetUserActiveSubscriptionAsync_WithNoActiveSubscription_ReturnsNull()
    {
        // Arrange
        var userWithNoSubscription = Guid.NewGuid();

        // Act
        var result = await _service.GetUserActiveSubscriptionAsync(userWithNoSubscription);

        // Assert
        Assert.Null(result);
    }

    #endregion

    #region GetUserSubscriptionHistoryAsync Tests

    [Fact]
    public async Task GetUserSubscriptionHistoryAsync_WithSubscriptions_ReturnsHistory()
    {
        // Act
        var result = await _service.GetUserSubscriptionHistoryAsync(_testUserId);

        // Assert
        Assert.NotNull(result);
        Assert.Single(result);
        Assert.Equal(_testSubscriptionId, result[0].Id);
    }

    [Fact]
    public async Task GetUserSubscriptionHistoryAsync_WithNoSubscriptions_ReturnsEmptyList()
    {
        // Arrange
        var userWithNoSubscription = Guid.NewGuid();

        // Act
        var result = await _service.GetUserSubscriptionHistoryAsync(userWithNoSubscription);

        // Assert
        Assert.NotNull(result);
        Assert.Empty(result);
    }

    #endregion

    #region GetUserSubscriptionStatusAsync Tests

    [Fact]
    public async Task GetUserSubscriptionStatusAsync_WithActiveSubscription_ReturnsStatus()
    {
        // Act
        var result = await _service.GetUserSubscriptionStatusAsync(_testUserId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(SubscriptionTier.Premium, result.Tier);
        Assert.True(result.IsActive);
    }

    [Fact]
    public async Task GetUserSubscriptionStatusAsync_WithNoSubscription_ReturnsNull()
    {
        // Arrange
        var userWithNoSubscription = Guid.NewGuid();

        // Act
        var result = await _service.GetUserSubscriptionStatusAsync(userWithNoSubscription);

        // Assert
        Assert.Null(result);
    }

    #endregion

    #region UpdateUserSubscriptionTierAsync Tests

    [Fact]
    public async Task UpdateUserSubscriptionTierAsync_UpdatesExistingSubscription()
    {
        // Act
        await _service.UpdateUserSubscriptionTierAsync(_testUserId, SubscriptionTier.Basic);

        // Assert
        var updated = await _context.UserSubscriptions
            .FirstOrDefaultAsync(s => s.UserId == _testUserId && s.IsActive);
        Assert.NotNull(updated);
        Assert.Equal(SubscriptionTier.Basic, updated.Tier);
    }

    [Fact]
    public async Task UpdateUserSubscriptionTierAsync_CreatesNewSubscriptionIfNoneExists()
    {
        // Arrange
        var newUserId = Guid.NewGuid();
        _context.Users.Add(new User
        {
            Id = newUserId,
            Email = "new@example.com",
            UserName = "new@example.com",
            IsActive = true
        });
        await _context.SaveChangesAsync();

        // Act
        await _service.UpdateUserSubscriptionTierAsync(newUserId, SubscriptionTier.Premium);

        // Assert
        var created = await _context.UserSubscriptions
            .FirstOrDefaultAsync(s => s.UserId == newUserId);
        Assert.NotNull(created);
        Assert.Equal(SubscriptionTier.Premium, created.Tier);
        Assert.True(created.IsActive);
    }

    #endregion

    #region GetUserSubscriptionAsync Tests

    [Fact]
    public async Task GetUserSubscriptionAsync_WithActiveSubscription_ReturnsSubscription()
    {
        // Act
        var result = await _service.GetUserSubscriptionAsync(_testUserId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(SubscriptionTier.Premium, result.Tier);
        Assert.True(result.IsActive);
    }

    [Fact]
    public async Task GetUserSubscriptionAsync_WithNoSubscription_ReturnsNull()
    {
        // Arrange
        var userWithNoSubscription = Guid.NewGuid();

        // Act
        var result = await _service.GetUserSubscriptionAsync(userWithNoSubscription);

        // Assert
        Assert.Null(result);
    }

    #endregion

    #region GetSubscriptionHistoryAsync Tests

    [Fact]
    public async Task GetSubscriptionHistoryAsync_ReturnsAllUserSubscriptions()
    {
        // Act
        var result = await _service.GetSubscriptionHistoryAsync(_testUserId);

        // Assert
        Assert.NotNull(result);
        Assert.Single(result);
        Assert.Equal(_testSubscriptionId, result[0].Id);
    }

    [Fact]
    public async Task GetSubscriptionHistoryAsync_IncludesCancelledSubscriptions()
    {
        // Act
        var result = await _service.GetSubscriptionHistoryAsync(_basicUserId);

        // Assert
        Assert.NotNull(result);
        Assert.Single(result);
        Assert.Equal("cancelled", result[0].Status);
    }

    #endregion

    #region GetAvailablePlansAsync Tests

    [Fact]
    public async Task GetAvailablePlansAsync_ReturnsAllActivePlans()
    {
        // Act
        var result = await _service.GetAvailablePlansAsync();

        // Assert
        Assert.NotNull(result);
        Assert.Equal(3, result.Count); // Free, Basic, Premium
        Assert.All(result, plan => Assert.True(plan.IsActive));
    }

    [Fact]
    public async Task GetAvailablePlansAsync_OrdersByPrice()
    {
        // Act
        var result = await _service.GetAvailablePlansAsync();

        // Assert
        Assert.Equal(0, result[0].Price); // Free
        Assert.Equal(4.99m, result[1].Price); // Basic
        Assert.Equal(9.99m, result[2].Price); // Premium
    }

    #endregion

    #region IsSubscriptionActiveAsync Tests

    [Fact]
    public async Task IsSubscriptionActiveAsync_WithActiveSubscription_ReturnsTrue()
    {
        // Act
        var result = await _service.IsSubscriptionActiveAsync(_testUserId);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public async Task IsSubscriptionActiveAsync_WithNoSubscription_ReturnsFalse()
    {
        // Arrange
        var userWithNoSubscription = Guid.NewGuid();

        // Act
        var result = await _service.IsSubscriptionActiveAsync(userWithNoSubscription);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task IsSubscriptionActiveAsync_WithInactiveSubscription_ReturnsFalse()
    {
        // Act
        var result = await _service.IsSubscriptionActiveAsync(_basicUserId);

        // Assert
        Assert.False(result);
    }

    #endregion

    #region GetUsageMetricsAsync Tests

    [Fact]
    public async Task GetUsageMetricsAsync_ReturnsMetricsForUser()
    {
        // Act
        var result = await _service.GetUsageMetricsAsync(_testUserId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(_testUserId, result.UserId);
    }

    [Fact]
    public async Task GetUsageMetricsAsync_WithPremiumUser_ReturnsValidMetrics()
    {
        // Act
        var result = await _service.GetUsageMetricsAsync(_testUserId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(_testUserId, result.UserId);
        Assert.True(result.TotalSearches >= 0);
        Assert.True(result.CurrentPeriodSearches >= 0);
        Assert.NotEqual(default(DateTime), result.PeriodStart);
        Assert.NotEqual(default(DateTime), result.PeriodEnd);
    }

    #endregion

    #region GetCurrentSubscription Tests

    [Fact]
    public async Task GetCurrentSubscription_WithActiveSubscription_ReturnsSubscription()
    {
        // Act
        var result = await _service.GetCurrentSubscription(_testUserId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(_testSubscriptionId, result.Id);
        Assert.Equal("active", result.Status);
    }

    [Fact]
    public async Task GetCurrentSubscription_WithNoSubscription_ReturnsNull()
    {
        // Arrange
        var userWithNoSubscription = Guid.NewGuid();

        // Act
        var result = await _service.GetCurrentSubscription(userWithNoSubscription);

        // Assert
        Assert.Null(result);
    }

    #endregion

    #region CancelSubscriptionAsync Tests

    [Fact]
    public async Task CancelSubscriptionAsync_MarksSubscriptionForCancellation()
    {
        // Arrange - CancelSubscriptionAsync delegates to PaymentService

        // Act
        var result = await _service.CancelSubscriptionAsync(_testUserId, _testSubscriptionId, "test-correlation");

        // Assert - Verify it delegates correctly and returns expected result
        Assert.NotNull(result);
        Assert.True(result.IsCanceled);
        Assert.Equal(_testSubscriptionId, result.Id);
        Assert.Equal(_testUserId, result.UserId);

        // Verify PaymentService was called
        _paymentServiceMock.Verify(
            x => x.CancelSubscriptionAsync(_testUserId, _testSubscriptionId, "test-correlation"),
            Times.Once);
    }

    #endregion

    #region ReactivateSubscriptionAsync Tests

    [Fact(Skip = "Service creates Stripe services internally - cannot mock external API calls. Requires service refactor to accept IStripeSubscriptionService dependency.")]
    public async Task ReactivateSubscriptionAsync_ReactivatesCancelledSubscription()
    {
        // Arrange
        _emailServiceMock
            .Setup(x => x.SendSubscriptionReactivatedEmailAsync(
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<decimal>(), It.IsAny<string>()))
            .ReturnsAsync(true);

        // Act
        var result = await _service.ReactivateSubscriptionAsync(_basicUserId, _cancelledSubscriptionId, "test-correlation");

        // Assert
        Assert.NotNull(result);
        Assert.False(result.IsCanceled);
        Assert.Equal("active", result.Status);

        // Verify email was sent
        _emailServiceMock.Verify(
            x => x.SendSubscriptionReactivatedEmailAsync(
                It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<decimal>(), It.IsAny<string>()),
            Times.Once);
    }

    #endregion

    #region Edge Cases and Error Handling

    [Fact]
    public async Task GetUserActiveSubscriptionAsync_WithInvalidUserId_ReturnsNull()
    {
        // Arrange
        var invalidUserId = Guid.Empty;

        // Act
        var result = await _service.GetUserActiveSubscriptionAsync(invalidUserId);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task IsSubscriptionActiveAsync_WithExpiredSubscription_ReturnsFalse()
    {
        // Arrange - Create user with expired subscription
        var expiredUserId = Guid.NewGuid();
        _context.Users.Add(new User
        {
            Id = expiredUserId,
            Email = "expired@example.com",
            UserName = "expired@example.com",
            IsActive = true
        });

        _context.UserSubscriptions.Add(new UserSubscription
        {
            UserId = expiredUserId,
            Tier = SubscriptionTier.Premium,
            IsActive = false,
            StartDate = DateTime.UtcNow.AddDays(-60),
            EndDate = DateTime.UtcNow.AddDays(-30)
        });

        await _context.SaveChangesAsync();

        // Act
        var result = await _service.IsSubscriptionActiveAsync(expiredUserId);

        // Assert
        Assert.False(result);
    }

    #endregion

    #region Pricing Strategy Tests (Phase 1)

    [Fact]
    public void GetAvailablePlans_ReturnsExactlyOnePlan()
    {
        // Act
        var plans = _service.GetAvailablePlans();

        // Assert - only the annual plan should be returned
        Assert.Single(plans);
    }

    [Fact]
    public void GetAvailablePlans_PlanPriceIs14_99()
    {
        // Act
        var plans = _service.GetAvailablePlans();

        // Assert
        var plan = plans.First();
        Assert.Equal(14.99m, plan.Price);
    }

    [Fact]
    public void GetAvailablePlans_PlanBillingPeriodIsYearly()
    {
        // Act
        var plans = _service.GetAvailablePlans();

        // Assert
        var plan = plans.First();
        Assert.Equal("yearly", plan.BillingPeriod);
    }

    [Fact]
    public void GetAvailablePlans_PlanHas30DayTrial()
    {
        // Act
        var plans = _service.GetAvailablePlans();

        // Assert
        var plan = plans.First();
        Assert.Equal(30, plan.TrialPeriodDays);
    }

    [Fact]
    public void GetAvailablePlans_NoMonthlyPlan()
    {
        // Act
        var plans = _service.GetAvailablePlans();

        // Assert - no monthly plan should exist
        Assert.DoesNotContain(plans, p => p.BillingPeriod == "monthly");
    }

    [Fact]
    public void GetAvailablePlans_NoLifetimePlan()
    {
        // Act
        var plans = _service.GetAvailablePlans();

        // Assert - no lifetime plan should exist
        Assert.DoesNotContain(plans, p => p.BillingPeriod == "lifetime");
    }

    #endregion
}
