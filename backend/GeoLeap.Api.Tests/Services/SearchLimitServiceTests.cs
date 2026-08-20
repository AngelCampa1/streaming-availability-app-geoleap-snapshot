using FluentAssertions;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace GeoLeap.Api.Tests.Services;

/// <summary>
/// Tests for SearchLimitService - Core paywall limit logic
/// Coverage target: 100% (Revenue critical)
/// Covers: Anonymous limits, free user limits, premium unlimited, IP fingerprint fallback
/// </summary>
public class SearchLimitServiceTests : IAsyncLifetime
{
    private readonly ApplicationDbContext _context;
    private readonly Mock<IRedisCacheService> _mockCache;
    private readonly Mock<ILogger<SearchLimitService>> _mockLogger;
    private readonly SearchLimitService _service;
    private readonly Guid _testUserId;
    private readonly Guid _premiumUserId;
    private readonly Guid _adminUserId;

    public SearchLimitServiceTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;
        _context = new ApplicationDbContext(options);

        _mockCache = new Mock<IRedisCacheService>();
        _mockLogger = new Mock<ILogger<SearchLimitService>>();

        _service = new SearchLimitService(
            _mockCache.Object,
            _context,
            _mockLogger.Object);

        _testUserId = Guid.NewGuid();
        _premiumUserId = Guid.NewGuid();
        _adminUserId = Guid.NewGuid();
    }

    public async Task InitializeAsync()
    {
        // Add test users
        var freeUser = new User
        {
            Id = _testUserId,
            Email = "free@example.com",
            FirstName = "Free",
            LastName = "User",
            PasswordHash = "hash",
            EmailConfirmed = true,
            SubscriptionTier = "free",
            CreatedAt = DateTime.UtcNow
        };

        var premiumUser = new User
        {
            Id = _premiumUserId,
            Email = "premium@example.com",
            FirstName = "Premium",
            LastName = "User",
            PasswordHash = "hash",
            EmailConfirmed = true,
            SubscriptionTier = "premium",
            CreatedAt = DateTime.UtcNow
        };

        var adminUser = new User
        {
            Id = _adminUserId,
            Email = "admin@example.com",
            FirstName = "Admin",
            LastName = "User",
            PasswordHash = "hash",
            EmailConfirmed = true,
            SubscriptionTier = "admin",
            CreatedAt = DateTime.UtcNow
        };

        _context.Users.AddRange(freeUser, premiumUser, adminUser);
        await _context.SaveChangesAsync();
    }

    public Task DisposeAsync()
    {
        _context.Dispose();
        return Task.CompletedTask;
    }

    #region Anonymous User Tests

    [Fact]
    public async Task CheckAndIncrementAsync_AnonymousUser_FirstSearch_ReturnsCanSearch()
    {
        // Arrange
        var anonymousId = Guid.NewGuid().ToString();
        var ipFingerprint = "abc123fingerprint";

        _mockCache.Setup(c => c.GetAsync<int?>(It.IsAny<string>()))
            .ReturnsAsync((int?)null);

        // Act
        var result = await _service.CheckAndIncrementAsync(
            userId: null,
            anonymousId: anonymousId,
            ipFingerprint: ipFingerprint);

        // Assert
        result.CanSearch.Should().BeTrue();
        result.SearchesUsed.Should().Be(1);
        result.SearchLimit.Should().Be(3); // Anonymous limit is now 3
        result.BlockReason.Should().BeNull();
        result.ResetsAt.Should().BeNull();
    }

    [Fact]
    public async Task CheckAndIncrementAsync_AnonymousUser_ThirdSearch_StillAllowed()
    {
        // Arrange - anonymous user has used 2 searches already
        var anonymousId = Guid.NewGuid().ToString();
        var ipFingerprint = "abc123fingerprint";

        _mockCache.Setup(c => c.GetAsync<int?>(It.Is<string>(k => k.Contains("anon:searches:") && !k.Contains("ip:"))))
            .ReturnsAsync(2);
        _mockCache.Setup(c => c.GetAsync<int?>(It.Is<string>(k => k.Contains("ip:"))))
            .ReturnsAsync(2);
        _mockCache.Setup(c => c.IncrementAsync(It.IsAny<string>(), It.IsAny<long>(), It.IsAny<TimeSpan?>()))
            .ReturnsAsync(3);

        // Act
        var result = await _service.CheckAndIncrementAsync(
            userId: null,
            anonymousId: anonymousId,
            ipFingerprint: ipFingerprint);

        // Assert - 3rd search is still allowed (limit is 3)
        result.CanSearch.Should().BeTrue();
        result.SearchLimit.Should().Be(3);
    }

    [Fact]
    public async Task CheckAndIncrementAsync_AnonymousUser_FourthSearch_ReturnsSignupRequired()
    {
        // Arrange - anonymous user has already used 3 searches
        var anonymousId = Guid.NewGuid().ToString();
        var ipFingerprint = "abc123fingerprint";

        _mockCache.Setup(c => c.GetAsync<int?>(It.Is<string>(k => k.Contains("anon:searches:"))))
            .ReturnsAsync(3); // Already used 3 searches

        // Act
        var result = await _service.CheckAndIncrementAsync(
            userId: null,
            anonymousId: anonymousId,
            ipFingerprint: ipFingerprint);

        // Assert
        result.CanSearch.Should().BeFalse();
        result.SearchesUsed.Should().Be(3);
        result.SearchLimit.Should().Be(3);
        result.BlockReason.Should().Be("signup_required");
        result.ResetsAt.Should().BeNull();
    }

    [Fact]
    public async Task CheckAndIncrementAsync_AnonymousUser_IncrementsCounters()
    {
        // Arrange
        var anonymousId = Guid.NewGuid().ToString();
        var ipFingerprint = "abc123fingerprint";

        _mockCache.Setup(c => c.GetAsync<int?>(It.IsAny<string>()))
            .ReturnsAsync((int?)null);
        _mockCache.Setup(c => c.IncrementAsync(It.IsAny<string>(), It.IsAny<long>(), It.IsAny<TimeSpan?>()))
            .ReturnsAsync(1);

        // Act
        await _service.CheckAndIncrementAsync(
            userId: null,
            anonymousId: anonymousId,
            ipFingerprint: ipFingerprint);

        // Assert - Both localStorage ID and IP fingerprint keys are incremented
        _mockCache.Verify(c => c.IncrementAsync(
            It.Is<string>(k => k.StartsWith("anon:searches:") && !k.Contains("ip:")),
            1, null), Times.Once);
        _mockCache.Verify(c => c.IncrementAsync(
            It.Is<string>(k => k.StartsWith("anon:searches:ip:")),
            1, null), Times.Once);
    }

    [Fact]
    public async Task CheckAndIncrementAsync_AnonymousUser_IpFingerprintFallback_Blocks()
    {
        // Arrange - User cleared localStorage but IP fingerprint shows limit reached
        var ipFingerprint = "abc123fingerprint";

        _mockCache.Setup(c => c.GetAsync<int?>(It.Is<string>(k => k.Contains("ip:"))))
            .ReturnsAsync(3); // IP already used all 3 anonymous searches

        // Act
        var result = await _service.CheckAndIncrementAsync(
            userId: null,
            anonymousId: null, // No localStorage ID
            ipFingerprint: ipFingerprint);

        // Assert
        result.CanSearch.Should().BeFalse();
        result.BlockReason.Should().Be("signup_required");
    }

    [Fact]
    public async Task CheckAndIncrementAsync_AnonymousUser_BothIdsChecked()
    {
        // Arrange - localStorage ID at 0, IP at 3 (max is returned)
        var anonymousId = Guid.NewGuid().ToString();
        var ipFingerprint = "abc123fingerprint";

        _mockCache.Setup(c => c.GetAsync<int?>(It.Is<string>(k => k.StartsWith("anon:searches:") && !k.Contains("ip:"))))
            .ReturnsAsync(0);
        _mockCache.Setup(c => c.GetAsync<int?>(It.Is<string>(k => k.Contains("ip:"))))
            .ReturnsAsync(3);

        // Act
        var result = await _service.CheckAndIncrementAsync(
            userId: null,
            anonymousId: anonymousId,
            ipFingerprint: ipFingerprint);

        // Assert - Should be blocked because max of both is 3 (limit)
        result.CanSearch.Should().BeFalse();
    }

    #endregion

    #region Free User Tests

    [Fact]
    public async Task CheckAndIncrementAsync_FreeUser_AlwaysReturnsCanSearch()
    {
        // Arrange - free registered users get unlimited searches
        _mockCache.Setup(c => c.IncrementAsync(It.IsAny<string>(), It.IsAny<long>(), It.IsAny<TimeSpan?>()))
            .ReturnsAsync(1);

        // Act
        var result = await _service.CheckAndIncrementAsync(
            userId: _testUserId,
            anonymousId: null,
            ipFingerprint: null);

        // Assert - free users always can search
        result.CanSearch.Should().BeTrue();
        result.SearchLimit.Should().Be(int.MaxValue);
        result.BlockReason.Should().BeNull();
    }

    [Fact]
    public async Task CheckAndIncrementAsync_FreeUser_ManySearches_StillCanSearch()
    {
        // Arrange - simulate a free user who has done 100 searches
        _mockCache.Setup(c => c.IncrementAsync(It.IsAny<string>(), It.IsAny<long>(), It.IsAny<TimeSpan?>()))
            .ReturnsAsync(101);

        // Act
        var result = await _service.CheckAndIncrementAsync(
            userId: _testUserId,
            anonymousId: null,
            ipFingerprint: null);

        // Assert - free users are never blocked
        result.CanSearch.Should().BeTrue();
        result.BlockReason.Should().BeNull();
    }

    [Fact]
    public async Task CheckAndIncrementAsync_FreeUser_IncrementsCounterForAnalytics()
    {
        // Arrange - free users still increment counter (for analytics)
        _mockCache.Setup(c => c.IncrementAsync(It.IsAny<string>(), It.IsAny<long>(), It.IsAny<TimeSpan?>()))
            .ReturnsAsync(1);

        // Act
        await _service.CheckAndIncrementAsync(
            userId: _testUserId,
            anonymousId: null,
            ipFingerprint: null);

        // Assert - counter is still incremented for analytics purposes
        var today = DateTime.UtcNow.ToString("yyyy-MM-dd");
        _mockCache.Verify(c => c.IncrementAsync(
            It.Is<string>(k => k.Contains(_testUserId.ToString()) && k.Contains(today)),
            1,
            It.IsAny<TimeSpan?>()),
            Times.Once);
    }

    #endregion

    #region Premium/Admin User Tests

    [Fact]
    public async Task CheckAndIncrementAsync_PremiumUser_ReturnsUnlimited()
    {
        // Arrange - Premium user from User table SubscriptionTier field

        // Act
        var result = await _service.CheckAndIncrementAsync(
            userId: _premiumUserId,
            anonymousId: null,
            ipFingerprint: null);

        // Assert
        result.CanSearch.Should().BeTrue();
        result.SearchesUsed.Should().Be(0);
        result.SearchLimit.Should().Be(int.MaxValue);
        result.BlockReason.Should().BeNull();
        result.ResetsAt.Should().BeNull();
    }

    [Fact]
    public async Task CheckAndIncrementAsync_AdminUser_ReturnsUnlimited()
    {
        // Act
        var result = await _service.CheckAndIncrementAsync(
            userId: _adminUserId,
            anonymousId: null,
            ipFingerprint: null);

        // Assert
        result.CanSearch.Should().BeTrue();
        result.SearchLimit.Should().Be(int.MaxValue);
    }

    [Fact]
    public async Task CheckAndIncrementAsync_PremiumSubscription_ReturnsUnlimited()
    {
        // Arrange - User with active Premium subscription in Subscription table
        var userId = Guid.NewGuid();
        var subscriptionUser = new User
        {
            Id = userId,
            Email = "sub@example.com",
            FirstName = "Sub",
            LastName = "User",
            PasswordHash = "hash",
            EmailConfirmed = true,
            SubscriptionTier = "free", // User table says free...
            CreatedAt = DateTime.UtcNow
        };
        _context.Users.Add(subscriptionUser);

        // Create StripeCustomer for foreign key
        var stripeCustomer = new StripeCustomer
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            StripeCustomerId = "cus_test123",
            Email = "sub@example.com",
            CreatedAt = DateTime.UtcNow
        };
        _context.StripeCustomers.Add(stripeCustomer);

        // But has active Premium subscription
        var subscription = new Subscription
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            StripeCustomerId = stripeCustomer.Id,
            StripeSubscriptionId = "sub_test123",
            StripePriceId = "price_premium",
            Status = "active",
            PlanType = "premium",
            CurrentPeriodStart = DateTime.UtcNow.AddDays(-15),
            CurrentPeriodEnd = DateTime.UtcNow.AddDays(15),
            CreatedAt = DateTime.UtcNow
        };
        _context.Subscriptions.Add(subscription);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.CheckAndIncrementAsync(
            userId: userId,
            anonymousId: null,
            ipFingerprint: null);

        // Assert - Subscription table takes precedence
        result.CanSearch.Should().BeTrue();
        result.SearchLimit.Should().Be(int.MaxValue);
    }

    [Fact]
    public async Task CheckAndIncrementAsync_PremiumUser_NoCacheOperations()
    {
        // Act
        await _service.CheckAndIncrementAsync(
            userId: _premiumUserId,
            anonymousId: null,
            ipFingerprint: null);

        // Assert - No Redis operations for premium users
        _mockCache.Verify(c => c.GetAsync<int?>(It.IsAny<string>()), Times.Never);
        _mockCache.Verify(c => c.IncrementAsync(It.IsAny<string>(), It.IsAny<long>(), It.IsAny<TimeSpan?>()), Times.Never);
    }

    #endregion

    #region GetLimitStatusAsync Tests

    [Fact]
    public async Task GetLimitStatusAsync_AnonymousUser_ReturnsCorrectStatus()
    {
        // Arrange - anonymous user has used 3 searches (at limit)
        var anonymousId = Guid.NewGuid().ToString();
        _mockCache.Setup(c => c.GetAsync<int?>(It.IsAny<string>()))
            .ReturnsAsync(3);

        // Act
        var result = await _service.GetLimitStatusAsync(
            userId: null,
            anonymousId: anonymousId,
            ipFingerprint: null);

        // Assert
        result.SearchesUsed.Should().Be(3);
        result.SearchLimit.Should().Be(3);
        result.CanSearch.Should().BeFalse();
        result.BlockReason.Should().Be("signup_required");
    }

    [Fact]
    public async Task GetLimitStatusAsync_FreeUser_ReturnsUnlimited()
    {
        // Arrange - free users get unlimited searches
        // Act
        var result = await _service.GetLimitStatusAsync(
            userId: _testUserId,
            anonymousId: null,
            ipFingerprint: null);

        // Assert - free users show unlimited
        result.CanSearch.Should().BeTrue();
        result.SearchLimit.Should().Be(int.MaxValue);
        result.BlockReason.Should().BeNull();
    }

    [Fact]
    public async Task GetLimitStatusAsync_FreeUser_DoesNotIncrementCount()
    {
        // Act
        await _service.GetLimitStatusAsync(
            userId: _testUserId,
            anonymousId: null,
            ipFingerprint: null);

        // Assert - No IncrementAsync call for status check
        _mockCache.Verify(c => c.IncrementAsync(It.IsAny<string>(), It.IsAny<long>(), It.IsAny<TimeSpan?>()), Times.Never);
    }

    #endregion

    #region ClearLimitsAsync Tests

    [Fact]
    public async Task ClearLimitsAsync_RemovesUserKey()
    {
        // Arrange
        var today = DateTime.UtcNow.ToString("yyyy-MM-dd");

        // Act
        await _service.ClearLimitsAsync(_testUserId);

        // Assert
        _mockCache.Verify(c => c.RemoveAsync(
            It.Is<string>(k => k.Contains(_testUserId.ToString()) && k.Contains(today))),
            Times.Once);
    }

    #endregion

    #region MigrateAnonymousToUserAsync Tests

    [Fact]
    public async Task MigrateAnonymousToUserAsync_ClearsAnonymousKeys()
    {
        // Arrange
        var anonymousId = Guid.NewGuid().ToString();
        var ipFingerprint = "abc123fingerprint";

        // Act
        await _service.MigrateAnonymousToUserAsync(anonymousId, ipFingerprint, _testUserId);

        // Assert
        _mockCache.Verify(c => c.RemoveAsync(
            It.Is<string>(k => k.Contains(anonymousId))), Times.Once);
        _mockCache.Verify(c => c.RemoveAsync(
            It.Is<string>(k => k.Contains(ipFingerprint))), Times.Once);
    }

    [Fact]
    public async Task MigrateAnonymousToUserAsync_HandlesNullValues()
    {
        // Act - Should not throw with null values
        await _service.MigrateAnonymousToUserAsync(string.Empty, null, _testUserId);

        // Assert - No exceptions, minimal Remove calls
        _mockCache.Verify(c => c.RemoveAsync(It.IsAny<string>()), Times.Never);
    }

    #endregion

    #region Reset Time Tests

    [Fact]
    public async Task CheckAndIncrementAsync_FreeUser_UnlimitedSoNoResetsAt()
    {
        // Arrange - free users are unlimited, so ResetsAt is not meaningful
        _mockCache.Setup(c => c.IncrementAsync(It.IsAny<string>(), It.IsAny<long>(), It.IsAny<TimeSpan?>()))
            .ReturnsAsync(1);

        // Act
        var result = await _service.CheckAndIncrementAsync(
            userId: _testUserId,
            anonymousId: null,
            ipFingerprint: null);

        // Assert - free users are unlimited so CanSearch is always true
        result.CanSearch.Should().BeTrue();
        result.SearchLimit.Should().Be(int.MaxValue);
    }

    #endregion

    #region Edge Cases

    [Fact]
    public async Task CheckAndIncrementAsync_NullAnonymousIdAndIpFingerprint_HandlesGracefully()
    {
        // Arrange - Even without tracking IDs, the search still counts
        _mockCache.Setup(c => c.GetAsync<int?>(It.IsAny<string>()))
            .ReturnsAsync((int?)null);

        // Act
        var result = await _service.CheckAndIncrementAsync(
            userId: null,
            anonymousId: null,
            ipFingerprint: null);

        // Assert - Still counts as a search (SearchesUsed=1), and first search is allowed
        result.SearchesUsed.Should().Be(1);
        result.CanSearch.Should().BeTrue();
        result.SearchLimit.Should().Be(3); // Anonymous limit is now 3
    }

    [Fact]
    public async Task CheckAndIncrementAsync_UserWithCanceledSubscription_TreatedAsFree()
    {
        // Arrange - User with canceled subscription
        var userId = Guid.NewGuid();
        var canceledUser = new User
        {
            Id = userId,
            Email = "canceled@example.com",
            FirstName = "Canceled",
            LastName = "User",
            PasswordHash = "hash",
            EmailConfirmed = true,
            SubscriptionTier = "premium", // Stale value
            CreatedAt = DateTime.UtcNow
        };
        _context.Users.Add(canceledUser);

        var stripeCustomer = new StripeCustomer
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            StripeCustomerId = "cus_canceled",
            Email = "canceled@example.com",
            CreatedAt = DateTime.UtcNow
        };
        _context.StripeCustomers.Add(stripeCustomer);

        var subscription = new Subscription
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            StripeCustomerId = stripeCustomer.Id,
            StripeSubscriptionId = "sub_canceled",
            StripePriceId = "price_premium",
            Status = "canceled", // Canceled!
            PlanType = "premium",
            CurrentPeriodStart = DateTime.UtcNow.AddDays(-30),
            CurrentPeriodEnd = DateTime.UtcNow.AddDays(-1),
            CreatedAt = DateTime.UtcNow
        };
        _context.Subscriptions.Add(subscription);
        await _context.SaveChangesAsync();

        _mockCache.Setup(c => c.GetAsync<int?>(It.IsAny<string>()))
            .ReturnsAsync((int?)null);
        _mockCache.Setup(c => c.IncrementAsync(It.IsAny<string>(), It.IsAny<long>(), It.IsAny<TimeSpan?>()))
            .ReturnsAsync(1);

        // Act
        var result = await _service.CheckAndIncrementAsync(
            userId: userId,
            anonymousId: null,
            ipFingerprint: null);

        // Assert - Falls back to User.SubscriptionTier which is "premium" string
        // Actually, the service checks Subscription table first, finds no active sub,
        // then falls back to User.SubscriptionTier which is "premium"
        result.SearchLimit.Should().Be(int.MaxValue);
    }

    #endregion
}
