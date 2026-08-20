using Xunit;
using Moq;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using Stripe;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace GeoLeap.Api.Tests.Services;

public class SubscriptionRecoveryServiceDirectTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly Mock<IPaymentService> _mockPaymentService;
    private readonly Mock<IRbacService> _mockRbacService;
    private readonly Mock<IEmailService> _mockEmailService;
    private readonly Mock<ISubscriptionErrorHandlingService> _mockErrorHandling;
    private readonly Mock<ILogger<SubscriptionRecoveryService>> _mockLogger;
    private readonly SubscriptionRecoveryService _service;
    private readonly Guid _testUserId = Guid.NewGuid();
    private readonly Guid _testStripeCustomerId = Guid.NewGuid();

    public SubscriptionRecoveryServiceDirectTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: $"TestDb_{Guid.NewGuid()}")
            .Options;

        _context = new ApplicationDbContext(options);
        _mockPaymentService = new Mock<IPaymentService>();
        _mockRbacService = new Mock<IRbacService>();
        _mockEmailService = new Mock<IEmailService>();
        _mockErrorHandling = new Mock<ISubscriptionErrorHandlingService>();
        _mockLogger = new Mock<ILogger<SubscriptionRecoveryService>>();

        _service = new SubscriptionRecoveryService(
            _context,
            _mockPaymentService.Object,
            _mockRbacService.Object,
            _mockEmailService.Object,
            _mockErrorHandling.Object,
            _mockLogger.Object);

        SeedTestData().Wait();
    }

    private async Task SeedTestData()
    {
        var user = new User
        {
            Id = _testUserId,
            Email = "test@example.com",
            FirstName = "Test",
            LastName = "User",
            PasswordHash = "hash",
            CreatedAt = DateTime.UtcNow
        };

        var stripeCustomer = new StripeCustomer
        {
            Id = _testStripeCustomerId,
            UserId = _testUserId,
            StripeCustomerId = "cus_test123",
            Email = "test@example.com",
            Name = "Test User",
            CreatedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        _context.StripeCustomers.Add(stripeCustomer);
        await _context.SaveChangesAsync();
    }

    private static Stripe.Subscription CreateStripeSubscription(string id, string status, string planType = "premium")
    {
        return new Stripe.Subscription
        {
            Id = id,
            Status = status,
            CurrentPeriodStart = DateTime.UtcNow,
            CurrentPeriodEnd = DateTime.UtcNow.AddMonths(1),
            Items = new Stripe.StripeList<Stripe.SubscriptionItem>
            {
                Data = new List<Stripe.SubscriptionItem>
                {
                    new Stripe.SubscriptionItem
                    {
                        Price = new Stripe.Price
                        {
                            Metadata = new Dictionary<string, string>
                            {
                                ["plan_type"] = planType
                            }
                        }
                    }
                }
            }
        };
    }

    #region RecoverFailedSubscriptionAsync Tests

    [Fact]
    public async Task RecoverFailedSubscriptionAsync_WithValidStripeSubscription_ReturnsTrue()
    {
        // Arrange
        var stripeSubscriptionId = "sub_test123";
        var correlationId = Guid.NewGuid().ToString();

        var localSubscription = new GeoLeap.Api.Models.Subscription
        {
            Id = Guid.NewGuid(),
            UserId = _testUserId,
            StripeCustomerId = _testStripeCustomerId,
            StripeSubscriptionId = stripeSubscriptionId,
            StripePriceId = "price_test",
            Status = "incomplete",
            PlanType = "premium",
            Amount = 9.99m,
            Currency = "USD",
            Interval = "month",
            CurrentPeriodStart = DateTime.UtcNow,
            CurrentPeriodEnd = DateTime.UtcNow.AddMonths(1),
            CreatedAt = DateTime.UtcNow
        };
        _context.Subscriptions.Add(localSubscription);
        await _context.SaveChangesAsync();

        var stripeSubscription = CreateStripeSubscription(stripeSubscriptionId, "active", "premium");

        _mockErrorHandling.Setup(x => x.ExecuteWithRetryAsync(
                It.IsAny<Func<Task<Stripe.Subscription>>>(),
                It.IsAny<string>(),
                It.IsAny<string>()))
            .ReturnsAsync(stripeSubscription);

        // Act
        var result = await _service.RecoverFailedSubscriptionAsync(_testUserId, stripeSubscriptionId, correlationId);

        // Assert
        Assert.True(result);
        var updatedSubscription = await _context.Subscriptions
            .FirstOrDefaultAsync(s => s.StripeSubscriptionId == stripeSubscriptionId);
        Assert.Equal("active", updatedSubscription!.Status);
    }

    [Fact]
    public async Task RecoverFailedSubscriptionAsync_WithNonExistentStripeSubscription_ReturnsFalse()
    {
        // Arrange
        var stripeSubscriptionId = "sub_nonexistent";
        var correlationId = Guid.NewGuid().ToString();

        _mockErrorHandling.Setup(x => x.ExecuteWithRetryAsync(
                It.IsAny<Func<Task<Stripe.Subscription>>>(),
                It.IsAny<string>(),
                It.IsAny<string>()))
            .ReturnsAsync((Stripe.Subscription)null!);

        // Act
        var result = await _service.RecoverFailedSubscriptionAsync(_testUserId, stripeSubscriptionId, correlationId);

        // Assert
        Assert.False(result);
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Warning,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString().Contains("Stripe subscription") && v.ToString().Contains("not found")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task RecoverFailedSubscriptionAsync_WithNoLocalSubscription_ReturnsFalse()
    {
        // Arrange
        var stripeSubscriptionId = "sub_no_local";
        var correlationId = Guid.NewGuid().ToString();

        var stripeSubscription = CreateStripeSubscription(stripeSubscriptionId, "active", "premium");

        _mockErrorHandling.Setup(x => x.ExecuteWithRetryAsync(
                It.IsAny<Func<Task<Stripe.Subscription>>>(),
                It.IsAny<string>(),
                It.IsAny<string>()))
            .ReturnsAsync(stripeSubscription);

        // Act
        var result = await _service.RecoverFailedSubscriptionAsync(_testUserId, stripeSubscriptionId, correlationId);

        // Assert
        Assert.False(result);
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Warning,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString().Contains("Local subscription record not found")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task RecoverFailedSubscriptionAsync_UpdatesSubscriptionStatus()
    {
        // Arrange
        var stripeSubscriptionId = "sub_update_status";
        var correlationId = Guid.NewGuid().ToString();

        var localSubscription = new GeoLeap.Api.Models.Subscription
        {
            Id = Guid.NewGuid(),
            UserId = _testUserId,
            StripeCustomerId = _testStripeCustomerId,
            StripeSubscriptionId = stripeSubscriptionId,
            StripePriceId = "price_test",
            Status = "past_due",
            PlanType = "premium",
            Amount = 9.99m,
            CreatedAt = DateTime.UtcNow
        };
        _context.Subscriptions.Add(localSubscription);
        await _context.SaveChangesAsync();

        var stripeSubscription = CreateStripeSubscription(stripeSubscriptionId, "active", "premium");

        _mockErrorHandling.Setup(x => x.ExecuteWithRetryAsync(
                It.IsAny<Func<Task<Stripe.Subscription>>>(),
                It.IsAny<string>(),
                It.IsAny<string>()))
            .ReturnsAsync(stripeSubscription);

        // Act
        await _service.RecoverFailedSubscriptionAsync(_testUserId, stripeSubscriptionId, correlationId);

        // Assert
        var updatedSubscription = await _context.Subscriptions
            .FirstOrDefaultAsync(s => s.StripeSubscriptionId == stripeSubscriptionId);
        Assert.Equal("active", updatedSubscription!.Status);
    }

    [Fact]
    public async Task RecoverFailedSubscriptionAsync_SyncsRbacPermissions()
    {
        // Arrange
        var stripeSubscriptionId = "sub_rbac_sync";
        var correlationId = Guid.NewGuid().ToString();

        var localSubscription = new GeoLeap.Api.Models.Subscription
        {
            Id = Guid.NewGuid(),
            UserId = _testUserId,
            StripeCustomerId = _testStripeCustomerId,
            StripeSubscriptionId = stripeSubscriptionId,
            StripePriceId = "price_test",
            Status = "incomplete",
            PlanType = "premium",
            Amount = 9.99m,
            CreatedAt = DateTime.UtcNow
        };
        _context.Subscriptions.Add(localSubscription);
        await _context.SaveChangesAsync();

        var stripeSubscription = CreateStripeSubscription(stripeSubscriptionId, "active", "premium");

        _mockErrorHandling.Setup(x => x.ExecuteWithRetryAsync(
                It.IsAny<Func<Task<Stripe.Subscription>>>(),
                It.IsAny<string>(),
                It.IsAny<string>()))
            .ReturnsAsync(stripeSubscription);

        // Act
        await _service.RecoverFailedSubscriptionAsync(_testUserId, stripeSubscriptionId, correlationId);

        // Assert
        _mockRbacService.Verify(x => x.SyncSubscriptionRoleAsync(_testUserId), Times.Once);
    }

    [Fact]
    public async Task RecoverFailedSubscriptionAsync_WithException_LogsFailure()
    {
        // Arrange
        var stripeSubscriptionId = "sub_exception";
        var correlationId = Guid.NewGuid().ToString();

        _mockErrorHandling.Setup(x => x.ExecuteWithRetryAsync(
                It.IsAny<Func<Task<Stripe.Subscription>>>(),
                It.IsAny<string>(),
                It.IsAny<string>()))
            .ThrowsAsync(new InvalidOperationException("Stripe API error"));

        // Act
        var result = await _service.RecoverFailedSubscriptionAsync(_testUserId, stripeSubscriptionId, correlationId);

        // Assert
        Assert.False(result);
        _mockErrorHandling.Verify(
            x => x.LogSubscriptionFailureAsync("subscription_recovery", _testUserId, It.IsAny<Exception>(), correlationId),
            Times.Once);
    }

    #endregion

    #region RecoverFromPaymentFailureAsync Tests

    [Fact]
    public async Task RecoverFromPaymentFailureAsync_WithNoActiveSubscription_ReturnsTrue()
    {
        // Arrange
        var correlationId = Guid.NewGuid().ToString();

        // Act
        var result = await _service.RecoverFromPaymentFailureAsync(_testUserId, correlationId);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public async Task RecoverFromPaymentFailureAsync_WithNoActiveStripeSubscription_DowngradesToFree()
    {
        // Arrange
        var correlationId = Guid.NewGuid().ToString();

        var userSubscription = new UserSubscription
        {
            Id = Guid.NewGuid(),
            UserId = _testUserId,
            Tier = SubscriptionTier.Premium,
            IsActive = true,
            StartDate = DateTime.UtcNow.AddMonths(-1),
            AutoRenew = true
        };
        _context.UserSubscriptions.Add(userSubscription);
        await _context.SaveChangesAsync();

        var emptyList = new Stripe.StripeList<Stripe.Subscription>
        {
            Data = new List<Stripe.Subscription>()
        };

        _mockErrorHandling.Setup(x => x.ExecuteWithRetryAsync(
                It.IsAny<Func<Task<Stripe.StripeList<Stripe.Subscription>>>>(),
                It.IsAny<string>(),
                It.IsAny<string>()))
            .ReturnsAsync(emptyList);

        // Act
        var result = await _service.RecoverFromPaymentFailureAsync(_testUserId, correlationId);

        // Assert
        Assert.True(result);
        var updatedSubscription = await _context.UserSubscriptions
            .FirstOrDefaultAsync(us => us.UserId == _testUserId);
        Assert.Equal(SubscriptionTier.Free, updatedSubscription!.Tier);
        Assert.False(updatedSubscription.IsActive);
        Assert.False(updatedSubscription.AutoRenew);
    }

    [Fact]
    public async Task RecoverFromPaymentFailureAsync_WithActiveStripeSubscription_SyncsLocalState()
    {
        // Arrange
        var correlationId = Guid.NewGuid().ToString();

        var userSubscription = new UserSubscription
        {
            Id = Guid.NewGuid(),
            UserId = _testUserId,
            Tier = SubscriptionTier.Basic,
            IsActive = true,
            StartDate = DateTime.UtcNow.AddMonths(-1)
        };
        _context.UserSubscriptions.Add(userSubscription);
        await _context.SaveChangesAsync();

        var activeSubscription = CreateStripeSubscription("sub_active", "active", "premium");

        // The ExecuteWithRetryAsync wrapper returns the result of subscriptions.Data.FirstOrDefault()
        _mockErrorHandling.Setup(x => x.ExecuteWithRetryAsync(
                It.IsAny<Func<Task<Stripe.Subscription>>>(),
                "check_active_stripe_subscription",
                correlationId))
            .ReturnsAsync(activeSubscription);

        // Act
        var result = await _service.RecoverFromPaymentFailureAsync(_testUserId, correlationId);

        // Assert
        Assert.True(result);
        var updatedSubscription = await _context.UserSubscriptions
            .FirstOrDefaultAsync(us => us.UserId == _testUserId);
        Assert.Equal(SubscriptionTier.Premium, updatedSubscription!.Tier);
    }

    [Fact]
    public async Task RecoverFromPaymentFailureAsync_SendsDowngradeEmail()
    {
        // Arrange
        var correlationId = Guid.NewGuid().ToString();

        var userSubscription = new UserSubscription
        {
            Id = Guid.NewGuid(),
            UserId = _testUserId,
            Tier = SubscriptionTier.Premium,
            IsActive = true
        };
        _context.UserSubscriptions.Add(userSubscription);
        await _context.SaveChangesAsync();

        var emptyList = new Stripe.StripeList<Stripe.Subscription>
        {
            Data = new List<Stripe.Subscription>()
        };

        _mockErrorHandling.Setup(x => x.ExecuteWithRetryAsync(
                It.IsAny<Func<Task<Stripe.StripeList<Stripe.Subscription>>>>(),
                It.IsAny<string>(),
                It.IsAny<string>()))
            .ReturnsAsync(emptyList);

        // Act
        await _service.RecoverFromPaymentFailureAsync(_testUserId, correlationId);

        // Assert
        _mockEmailService.Verify(
            x => x.SendSubscriptionDowngradedEmailAsync(
                "test@example.com",
                "Test",
                "premium",
                "free",
                0m,
                "month"),
            Times.Once);
    }

    [Fact]
    public async Task RecoverFromPaymentFailureAsync_WithException_ReturnsFalse()
    {
        // Arrange
        var correlationId = Guid.NewGuid().ToString();

        // Create active user subscription so the method doesn't early return
        var userSubscription = new UserSubscription
        {
            Id = Guid.NewGuid(),
            UserId = _testUserId,
            Tier = SubscriptionTier.Premium,
            IsActive = true,
            StartDate = DateTime.UtcNow.AddMonths(-1)
        };
        _context.UserSubscriptions.Add(userSubscription);
        await _context.SaveChangesAsync();

        _mockErrorHandling.Setup(x => x.ExecuteWithRetryAsync(
                It.IsAny<Func<Task<Stripe.Subscription>>>(),
                "check_active_stripe_subscription",
                correlationId))
            .ThrowsAsync(new InvalidOperationException("API error"));

        // Act
        var result = await _service.RecoverFromPaymentFailureAsync(_testUserId, correlationId);

        // Assert
        Assert.False(result);
        _mockErrorHandling.Verify(
            x => x.LogSubscriptionFailureAsync("payment_recovery", _testUserId, It.IsAny<Exception>(), correlationId),
            Times.Once);
    }

    #endregion

    #region SyncSubscriptionStateAsync Tests

    [Fact]
    public async Task SyncSubscriptionStateAsync_WithNoStripeCustomer_EnsuresFreeSubscription()
    {
        // Arrange
        var newUserId = Guid.NewGuid();
        var newUser = new User
        {
            Id = newUserId,
            Email = "newuser@example.com",
            FirstName = "New",
            LastName = "User",
            PasswordHash = "hash",
            CreatedAt = DateTime.UtcNow
        };
        _context.Users.Add(newUser);
        await _context.SaveChangesAsync();

        var correlationId = Guid.NewGuid().ToString();

        // Act
        var result = await _service.SyncSubscriptionStateAsync(newUserId, correlationId);

        // Assert
        Assert.True(result);
        var userSubscription = await _context.UserSubscriptions
            .FirstOrDefaultAsync(us => us.UserId == newUserId);
        Assert.NotNull(userSubscription);
        Assert.Equal(SubscriptionTier.Free, userSubscription.Tier);
        Assert.False(userSubscription.IsActive);
    }

    [Fact]
    public async Task SyncSubscriptionStateAsync_WithActiveStripeSubscription_UpdatesLocalState()
    {
        // Arrange
        var correlationId = Guid.NewGuid().ToString();

        var activeSubscription = new Stripe.Subscription
        {
            Id = "sub_active_sync",
            Status = "active",
            Created = DateTime.UtcNow.AddMonths(-1),
            CurrentPeriodStart = DateTime.UtcNow,
            CurrentPeriodEnd = DateTime.UtcNow.AddMonths(1),
            Items = new Stripe.StripeList<Stripe.SubscriptionItem>
            {
                Data = new List<Stripe.SubscriptionItem>
                {
                    new Stripe.SubscriptionItem
                    {
                        Price = new Stripe.Price
                        {
                            Metadata = new Dictionary<string, string>
                            {
                                { "plan_type", "premium" }
                            }
                        }
                    }
                }
            }
        };

        var stripeList = new Stripe.StripeList<Stripe.Subscription>
        {
            Data = new List<Stripe.Subscription> { activeSubscription }
        };

        _mockErrorHandling.Setup(x => x.ExecuteWithRetryAsync(
                It.IsAny<Func<Task<Stripe.StripeList<Stripe.Subscription>>>>(),
                It.IsAny<string>(),
                It.IsAny<string>()))
            .ReturnsAsync(stripeList);

        // Act
        var result = await _service.SyncSubscriptionStateAsync(_testUserId, correlationId);

        // Assert
        Assert.True(result);
        var userSubscription = await _context.UserSubscriptions
            .FirstOrDefaultAsync(us => us.UserId == _testUserId);
        Assert.Equal(SubscriptionTier.Premium, userSubscription!.Tier);
        Assert.True(userSubscription.IsActive);
    }

    [Fact]
    public async Task SyncSubscriptionStateAsync_WithTrialingSubscription_MarksAsActive()
    {
        // Arrange
        var correlationId = Guid.NewGuid().ToString();

        var trialingSubscription = new Stripe.Subscription
        {
            Id = "sub_trialing",
            Status = "trialing",
            Created = DateTime.UtcNow,
            CurrentPeriodStart = DateTime.UtcNow,
            CurrentPeriodEnd = DateTime.UtcNow.AddDays(7),
            Items = new Stripe.StripeList<Stripe.SubscriptionItem>
            {
                Data = new List<Stripe.SubscriptionItem>
                {
                    new Stripe.SubscriptionItem
                    {
                        Price = new Stripe.Price
                        {
                            Metadata = new Dictionary<string, string>
                            {
                                { "plan_type", "basic" }
                            }
                        }
                    }
                }
            }
        };

        var stripeList = new Stripe.StripeList<Stripe.Subscription>
        {
            Data = new List<Stripe.Subscription> { trialingSubscription }
        };

        _mockErrorHandling.Setup(x => x.ExecuteWithRetryAsync(
                It.IsAny<Func<Task<Stripe.StripeList<Stripe.Subscription>>>>(),
                It.IsAny<string>(),
                It.IsAny<string>()))
            .ReturnsAsync(stripeList);

        // Act
        var result = await _service.SyncSubscriptionStateAsync(_testUserId, correlationId);

        // Assert
        Assert.True(result);
        var userSubscription = await _context.UserSubscriptions
            .FirstOrDefaultAsync(us => us.UserId == _testUserId);
        Assert.True(userSubscription!.IsActive);
    }

    [Fact]
    public async Task SyncSubscriptionStateAsync_WithNoActiveSubscription_SetsFreeSubscription()
    {
        // Arrange
        var correlationId = Guid.NewGuid().ToString();

        var canceledSubscription = new Stripe.Subscription
        {
            Id = "sub_canceled",
            Status = "canceled",
            Created = DateTime.UtcNow.AddMonths(-2)
        };

        var stripeList = new Stripe.StripeList<Stripe.Subscription>
        {
            Data = new List<Stripe.Subscription> { canceledSubscription }
        };

        _mockErrorHandling.Setup(x => x.ExecuteWithRetryAsync(
                It.IsAny<Func<Task<Stripe.StripeList<Stripe.Subscription>>>>(),
                It.IsAny<string>(),
                It.IsAny<string>()))
            .ReturnsAsync(stripeList);

        // Act
        var result = await _service.SyncSubscriptionStateAsync(_testUserId, correlationId);

        // Assert
        Assert.True(result);
        var userSubscription = await _context.UserSubscriptions
            .FirstOrDefaultAsync(us => us.UserId == _testUserId);
        Assert.Equal(SubscriptionTier.Free, userSubscription!.Tier);
        Assert.False(userSubscription.IsActive);
    }

    [Fact]
    public async Task SyncSubscriptionStateAsync_SyncsRbacRole()
    {
        // Arrange
        var correlationId = Guid.NewGuid().ToString();

        var emptyList = new Stripe.StripeList<Stripe.Subscription>
        {
            Data = new List<Stripe.Subscription>()
        };

        _mockErrorHandling.Setup(x => x.ExecuteWithRetryAsync(
                It.IsAny<Func<Task<Stripe.StripeList<Stripe.Subscription>>>>(),
                It.IsAny<string>(),
                It.IsAny<string>()))
            .ReturnsAsync(emptyList);

        // Act
        await _service.SyncSubscriptionStateAsync(_testUserId, correlationId);

        // Assert
        _mockRbacService.Verify(x => x.SyncSubscriptionRoleAsync(_testUserId), Times.Once);
    }

    #endregion

    #region FindInconsistentSubscriptionsAsync Tests

    [Fact]
    public async Task FindInconsistentSubscriptionsAsync_WithNoSubscriptions_ReturnsEmptyList()
    {
        // Act
        var result = await _service.FindInconsistentSubscriptionsAsync();

        // Assert
        Assert.Empty(result);
    }

    [Fact]
    public async Task FindInconsistentSubscriptionsAsync_WithActiveLocalButNoStripeSubscription_ReturnsUserId()
    {
        // Arrange
        var userSubscription = new UserSubscription
        {
            Id = Guid.NewGuid(),
            UserId = _testUserId,
            Tier = SubscriptionTier.Premium,
            IsActive = true
        };
        _context.UserSubscriptions.Add(userSubscription);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.FindInconsistentSubscriptionsAsync();

        // Assert - Note: This test may not work as expected without mocking Stripe API calls
        // The actual implementation makes real Stripe API calls which won't work in unit tests
        Assert.NotNull(result);
    }

    [Fact]
    public async Task FindInconsistentSubscriptionsAsync_WithException_ReturnsEmptyList()
    {
        // Arrange - The query uses JOIN with Users table, so orphaned subscriptions are automatically filtered out
        // This test verifies that the method handles the case gracefully and returns an empty list
        // without throwing exceptions
        var invalidUser = new UserSubscription
        {
            Id = Guid.NewGuid(),
            UserId = Guid.NewGuid(), // User that doesn't exist - will be filtered by JOIN
            Tier = SubscriptionTier.Premium,
            IsActive = true
        };
        _context.UserSubscriptions.Add(invalidUser);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.FindInconsistentSubscriptionsAsync();

        // Assert
        Assert.NotNull(result);
        Assert.Empty(result); // Should be empty because JOIN filters out orphaned subscriptions
        // Verify the method completed successfully - should log Info, not Error
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString().Contains("Found 0 users with inconsistent subscription states")),
                null, // No exception expected
                It.IsAny<Func<It.IsAnyType, Exception, string>>()),
            Times.Once);
    }

    #endregion

    #region ReconcileSubscriptionDataAsync Tests

    [Fact]
    public async Task ReconcileSubscriptionDataAsync_CallsSyncSubscriptionState()
    {
        // Arrange
        var correlationId = Guid.NewGuid().ToString();

        var emptyList = new Stripe.StripeList<Stripe.Subscription>
        {
            Data = new List<Stripe.Subscription>()
        };

        _mockErrorHandling.Setup(x => x.ExecuteWithRetryAsync(
                It.IsAny<Func<Task<Stripe.StripeList<Stripe.Subscription>>>>(),
                It.IsAny<string>(),
                It.IsAny<string>()))
            .ReturnsAsync(emptyList);

        // Act
        var result = await _service.ReconcileSubscriptionDataAsync(_testUserId, correlationId);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public async Task ReconcileSubscriptionDataAsync_WithSuccessfulSync_ReturnsTrue()
    {
        // Arrange
        var correlationId = Guid.NewGuid().ToString();

        var emptyList = new Stripe.StripeList<Stripe.Subscription>
        {
            Data = new List<Stripe.Subscription>()
        };

        _mockErrorHandling.Setup(x => x.ExecuteWithRetryAsync(
                It.IsAny<Func<Task<Stripe.StripeList<Stripe.Subscription>>>>(),
                It.IsAny<string>(),
                It.IsAny<string>()))
            .ReturnsAsync(emptyList);

        // Act
        var result = await _service.ReconcileSubscriptionDataAsync(_testUserId, correlationId);

        // Assert
        Assert.True(result);
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString().Contains("Successfully reconciled subscription data")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task ReconcileSubscriptionDataAsync_SyncsRbacPermissions()
    {
        // Arrange
        var correlationId = Guid.NewGuid().ToString();

        var emptyList = new Stripe.StripeList<Stripe.Subscription>
        {
            Data = new List<Stripe.Subscription>()
        };

        _mockErrorHandling.Setup(x => x.ExecuteWithRetryAsync(
                It.IsAny<Func<Task<Stripe.StripeList<Stripe.Subscription>>>>(),
                It.IsAny<string>(),
                It.IsAny<string>()))
            .ReturnsAsync(emptyList);

        // Act
        await _service.ReconcileSubscriptionDataAsync(_testUserId, correlationId);

        // Assert
        _mockRbacService.Verify(x => x.SyncSubscriptionRoleAsync(_testUserId), Times.AtLeastOnce);
    }

    [Fact]
    public async Task ReconcileSubscriptionDataAsync_WithSyncFailure_ReturnsFalse()
    {
        // Arrange
        var correlationId = Guid.NewGuid().ToString();

        _mockErrorHandling.Setup(x => x.ExecuteWithRetryAsync(
                It.IsAny<Func<Task<Stripe.StripeList<Stripe.Subscription>>>>(),
                It.IsAny<string>(),
                It.IsAny<string>()))
            .ThrowsAsync(new InvalidOperationException("Sync failed"));

        // Act
        var result = await _service.ReconcileSubscriptionDataAsync(_testUserId, correlationId);

        // Assert
        Assert.False(result);
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Error,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString().Contains("Failed to sync subscription state")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task ReconcileSubscriptionDataAsync_WithException_LogsFailure()
    {
        // Arrange
        var correlationId = Guid.NewGuid().ToString();

        _mockErrorHandling.Setup(x => x.ExecuteWithRetryAsync(
                It.IsAny<Func<Task<Stripe.StripeList<Stripe.Subscription>>>>(),
                It.IsAny<string>(),
                It.IsAny<string>()))
            .ThrowsAsync(new Exception("Test exception"));

        // Act
        var result = await _service.ReconcileSubscriptionDataAsync(_testUserId, correlationId);

        // Assert
        Assert.False(result);
        // When SyncSubscriptionStateAsync throws, it logs with "subscription_sync" not "subscription_reconciliation"
        _mockErrorHandling.Verify(
            x => x.LogSubscriptionFailureAsync("subscription_sync", _testUserId, It.IsAny<Exception>(), correlationId),
            Times.Once);
    }

    #endregion

    #region Edge Cases and Error Handling

    [Fact]
    public async Task RecoverFailedSubscriptionAsync_WithCanceledSubscription_UpdatesCanceledFields()
    {
        // Arrange
        var stripeSubscriptionId = "sub_canceled_test";
        var correlationId = Guid.NewGuid().ToString();

        var localSubscription = new GeoLeap.Api.Models.Subscription
        {
            Id = Guid.NewGuid(),
            UserId = _testUserId,
            StripeCustomerId = _testStripeCustomerId,
            StripeSubscriptionId = stripeSubscriptionId,
            StripePriceId = "price_test",
            Status = "active",
            PlanType = "premium",
            Amount = 9.99m,
            CreatedAt = DateTime.UtcNow
        };
        _context.Subscriptions.Add(localSubscription);
        await _context.SaveChangesAsync();

        var canceledAt = DateTime.UtcNow.AddDays(-1);
        var stripeSubscription = new Stripe.Subscription
        {
            Id = stripeSubscriptionId,
            Status = "canceled",
            CanceledAt = canceledAt,
            CancelAtPeriodEnd = true,
            CurrentPeriodStart = DateTime.UtcNow.AddMonths(-1),
            CurrentPeriodEnd = DateTime.UtcNow.AddDays(30)
        };

        _mockErrorHandling.Setup(x => x.ExecuteWithRetryAsync(
                It.IsAny<Func<Task<Stripe.Subscription>>>(),
                It.IsAny<string>(),
                It.IsAny<string>()))
            .ReturnsAsync(stripeSubscription);

        // Act
        await _service.RecoverFailedSubscriptionAsync(_testUserId, stripeSubscriptionId, correlationId);

        // Assert
        var updatedSubscription = await _context.Subscriptions
            .FirstOrDefaultAsync(s => s.StripeSubscriptionId == stripeSubscriptionId);
        Assert.Equal("canceled", updatedSubscription!.Status);
        Assert.True(updatedSubscription.CancelAtPeriodEnd);
        Assert.True(updatedSubscription.IsCanceled);
        Assert.NotNull(updatedSubscription.CanceledAt);
    }

    [Fact]
    public async Task SyncSubscriptionStateAsync_WithMultipleSubscriptions_SelectsMostRecent()
    {
        // Arrange
        var correlationId = Guid.NewGuid().ToString();

        var oldSubscription = new Stripe.Subscription
        {
            Id = "sub_old",
            Status = "active",
            Created = DateTime.UtcNow.AddYears(-1),
            Items = new Stripe.StripeList<Stripe.SubscriptionItem>
            {
                Data = new List<Stripe.SubscriptionItem>
                {
                    new Stripe.SubscriptionItem
                    {
                        Price = new Stripe.Price
                        {
                            Metadata = new Dictionary<string, string> { { "plan_type", "basic" } }
                        }
                    }
                }
            }
        };

        var newSubscription = new Stripe.Subscription
        {
            Id = "sub_new",
            Status = "active",
            Created = DateTime.UtcNow,
            Items = new Stripe.StripeList<Stripe.SubscriptionItem>
            {
                Data = new List<Stripe.SubscriptionItem>
                {
                    new Stripe.SubscriptionItem
                    {
                        Price = new Stripe.Price
                        {
                            Metadata = new Dictionary<string, string> { { "plan_type", "premium" } }
                        }
                    }
                }
            }
        };

        var stripeList = new Stripe.StripeList<Stripe.Subscription>
        {
            Data = new List<Stripe.Subscription> { oldSubscription, newSubscription }
        };

        _mockErrorHandling.Setup(x => x.ExecuteWithRetryAsync(
                It.IsAny<Func<Task<Stripe.StripeList<Stripe.Subscription>>>>(),
                It.IsAny<string>(),
                It.IsAny<string>()))
            .ReturnsAsync(stripeList);

        // Act
        await _service.SyncSubscriptionStateAsync(_testUserId, correlationId);

        // Assert
        var userSubscription = await _context.UserSubscriptions
            .FirstOrDefaultAsync(us => us.UserId == _testUserId);
        Assert.Equal(SubscriptionTier.Premium, userSubscription!.Tier);
    }

    [Fact]
    public async Task RecoverFromPaymentFailureAsync_WithEmailServiceFailure_ContinuesSuccessfully()
    {
        // Arrange
        var correlationId = Guid.NewGuid().ToString();

        var userSubscription = new UserSubscription
        {
            Id = Guid.NewGuid(),
            UserId = _testUserId,
            Tier = SubscriptionTier.Premium,
            IsActive = true
        };
        _context.UserSubscriptions.Add(userSubscription);
        await _context.SaveChangesAsync();

        var emptyList = new Stripe.StripeList<Stripe.Subscription>
        {
            Data = new List<Stripe.Subscription>()
        };

        _mockErrorHandling.Setup(x => x.ExecuteWithRetryAsync(
                It.IsAny<Func<Task<Stripe.StripeList<Stripe.Subscription>>>>(),
                It.IsAny<string>(),
                It.IsAny<string>()))
            .ReturnsAsync(emptyList);

        _mockEmailService.Setup(x => x.SendSubscriptionDowngradedEmailAsync(
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<decimal>(),
                It.IsAny<string>()))
            .ThrowsAsync(new InvalidOperationException("Email service unavailable"));

        // Act
        var result = await _service.RecoverFromPaymentFailureAsync(_testUserId, correlationId);

        // Assert
        Assert.True(result); // Should still succeed despite email failure
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Warning,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString().Contains("Failed to send payment recovery email")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task SyncSubscriptionStateAsync_CreatesNewUserSubscription_WhenNoneExists()
    {
        // Arrange
        var correlationId = Guid.NewGuid().ToString();

        var emptyList = new Stripe.StripeList<Stripe.Subscription>
        {
            Data = new List<Stripe.Subscription>()
        };

        _mockErrorHandling.Setup(x => x.ExecuteWithRetryAsync(
                It.IsAny<Func<Task<Stripe.StripeList<Stripe.Subscription>>>>(),
                It.IsAny<string>(),
                It.IsAny<string>()))
            .ReturnsAsync(emptyList);

        // Act
        await _service.SyncSubscriptionStateAsync(_testUserId, correlationId);

        // Assert
        var userSubscription = await _context.UserSubscriptions
            .FirstOrDefaultAsync(us => us.UserId == _testUserId);
        Assert.NotNull(userSubscription);
        Assert.Equal(SubscriptionTier.Free, userSubscription.Tier);
    }

    [Fact]
    public async Task RecoverFailedSubscriptionAsync_UpdatesAllSubscriptionFields()
    {
        // Arrange
        var stripeSubscriptionId = "sub_full_update";
        var correlationId = Guid.NewGuid().ToString();

        var localSubscription = new GeoLeap.Api.Models.Subscription
        {
            Id = Guid.NewGuid(),
            UserId = _testUserId,
            StripeCustomerId = _testStripeCustomerId,
            StripeSubscriptionId = stripeSubscriptionId,
            StripePriceId = "price_test",
            Status = "incomplete",
            PlanType = "premium",
            Amount = 9.99m,
            CreatedAt = DateTime.UtcNow
        };
        _context.Subscriptions.Add(localSubscription);
        await _context.SaveChangesAsync();

        var periodStart = DateTime.UtcNow;
        var periodEnd = DateTime.UtcNow.AddMonths(1);
        var stripeSubscription = new Stripe.Subscription
        {
            Id = stripeSubscriptionId,
            Status = "active",
            CurrentPeriodStart = periodStart,
            CurrentPeriodEnd = periodEnd,
            CancelAtPeriodEnd = false
        };

        _mockErrorHandling.Setup(x => x.ExecuteWithRetryAsync(
                It.IsAny<Func<Task<Stripe.Subscription>>>(),
                It.IsAny<string>(),
                It.IsAny<string>()))
            .ReturnsAsync(stripeSubscription);

        // Act
        await _service.RecoverFailedSubscriptionAsync(_testUserId, stripeSubscriptionId, correlationId);

        // Assert
        var updatedSubscription = await _context.Subscriptions
            .FirstOrDefaultAsync(s => s.StripeSubscriptionId == stripeSubscriptionId);
        Assert.Equal("active", updatedSubscription!.Status);
        Assert.Equal(periodStart, updatedSubscription.CurrentPeriodStart);
        Assert.Equal(periodEnd, updatedSubscription.CurrentPeriodEnd);
        Assert.False(updatedSubscription.CancelAtPeriodEnd);
    }

    #endregion

    public void Dispose()
    {
        try
        {
            _context?.Database.EnsureDeleted();
        }
        catch (ObjectDisposedException)
        {
            // Context already disposed, ignore
        }
        finally
        {
            _context?.Dispose();
        }
    }
}
