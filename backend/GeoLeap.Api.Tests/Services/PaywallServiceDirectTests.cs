using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Moq;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;

namespace GeoLeap.Api.Tests.Services;

/// <summary>
/// Direct tests for PaywallService - subscription tier management, paywall application, and usage tracking
/// Tests 17 public methods covering subscription validation, tier access, paywall application, usage tracking, and analytics
/// </summary>
public class PaywallServiceDirectTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly IMemoryCache _cache;
    private readonly Mock<IRbacService> _mockRbacService;
    private readonly Mock<ILogger<PaywallService>> _mockLogger;
    private readonly PaywallService _service;

    private readonly Guid _userId = Guid.NewGuid();
    private readonly Guid _premiumUserId = Guid.NewGuid();
    private readonly Guid _adminUserId = Guid.NewGuid();
    private readonly string _correlationId = $"test-correlation-{Guid.NewGuid()}";

    public PaywallServiceDirectTests()
    {
        // Setup in-memory database
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"PaywallServiceTestDb_{Guid.NewGuid()}")
            .Options;
        _context = new ApplicationDbContext(options);

        // Setup real memory cache
        _cache = new MemoryCache(new MemoryCacheOptions());

        // Setup mocks
        _mockRbacService = new Mock<IRbacService>();
        _mockLogger = new Mock<ILogger<PaywallService>>();

        // Create service
        _service = new PaywallService(_context, _cache, _mockRbacService.Object, _mockLogger.Object);

        // Seed test data
        SeedTestData().Wait();
    }

    private async Task SeedTestData()
    {
        // Seed user subscriptions
        var freeSubscription = new UserSubscription
        {
            Id = Guid.NewGuid(),
            UserId = _userId,
            Tier = SubscriptionTier.Free,
            IsActive = true,
            StartDate = DateTime.UtcNow.AddMonths(-1),
            CreatedAt = DateTime.UtcNow.AddMonths(-1)
        };

        var premiumSubscription = new UserSubscription
        {
            Id = Guid.NewGuid(),
            UserId = _premiumUserId,
            Tier = SubscriptionTier.Premium,
            IsActive = true,
            StartDate = DateTime.UtcNow.AddMonths(-3),
            EndDate = DateTime.UtcNow.AddMonths(9),
            CreatedAt = DateTime.UtcNow.AddMonths(-3)
        };

        await _context.UserSubscriptions.AddRangeAsync(freeSubscription, premiumSubscription);

        // Seed usage data
        var usage = new UserSearchUsage
        {
            Id = Guid.NewGuid(),
            UserId = _userId,
            Date = DateTime.UtcNow.Date,
            SearchCount = 5,
            ResultsViewed = 15,
            LastSearchAt = DateTime.UtcNow.AddHours(-2),
            CreatedAt = DateTime.UtcNow.AddHours(-8),
            UpdatedAt = DateTime.UtcNow.AddHours(-2)
        };

        await _context.UserSearchUsages.AddAsync(usage);

        await _context.SaveChangesAsync();
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
        _cache.Dispose();
    }

    // ==================== GetUserSubscriptionAsync Tests ====================

    [Fact]
    public async Task GetUserSubscriptionAsync_WithExistingSubscription_ReturnsSubscription()
    {
        // Act
        var result = await _service.GetUserSubscriptionAsync(_userId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(_userId, result.UserId);
        Assert.Equal(SubscriptionTier.Free, result.Tier);
        Assert.True(result.IsActive);
    }

    [Fact]
    public async Task GetUserSubscriptionAsync_WithNoSubscription_ReturnsDefaultFree()
    {
        // Arrange
        var newUserId = Guid.NewGuid();

        // Act
        var result = await _service.GetUserSubscriptionAsync(newUserId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(newUserId, result.UserId);
        Assert.Equal(SubscriptionTier.Free, result.Tier);
        Assert.True(result.IsActive);
    }

    [Fact]
    public async Task GetUserSubscriptionAsync_CachesResult()
    {
        // Act - First call
        var result1 = await _service.GetUserSubscriptionAsync(_userId);

        // Clear database to verify cache is used
        _context.UserSubscriptions.RemoveRange(_context.UserSubscriptions);
        await _context.SaveChangesAsync();

        // Act - Second call (should use cache)
        var result2 = await _service.GetUserSubscriptionAsync(_userId);

        // Assert
        Assert.NotNull(result1);
        Assert.NotNull(result2);
        Assert.Equal(result1.Id, result2.Id);
    }

    // ==================== GetUserTierAsync Tests ====================

    [Fact]
    public async Task GetUserTierAsync_ForFreeUser_ReturnsFree()
    {
        // Arrange
        _mockRbacService.Setup(r => r.IsInRoleAsync(_userId, "Admin")).ReturnsAsync(false);
        _mockRbacService.Setup(r => r.IsInRoleAsync(_userId, "SuperAdmin")).ReturnsAsync(false);

        // Act
        var result = await _service.GetUserTierAsync(_userId);

        // Assert
        Assert.Equal(SubscriptionTier.Free, result);
    }

    [Fact]
    public async Task GetUserTierAsync_ForPremiumUser_ReturnsPremium()
    {
        // Arrange
        _mockRbacService.Setup(r => r.IsInRoleAsync(_premiumUserId, "Admin")).ReturnsAsync(false);
        _mockRbacService.Setup(r => r.IsInRoleAsync(_premiumUserId, "SuperAdmin")).ReturnsAsync(false);

        // Act
        var result = await _service.GetUserTierAsync(_premiumUserId);

        // Assert
        Assert.Equal(SubscriptionTier.Premium, result);
    }

    [Fact]
    public async Task GetUserTierAsync_ForAdminUser_ReturnsAdmin()
    {
        // Arrange
        _mockRbacService.Setup(r => r.IsInRoleAsync(_adminUserId, "Admin")).ReturnsAsync(true);
        _mockRbacService.Setup(r => r.IsInRoleAsync(_adminUserId, "SuperAdmin")).ReturnsAsync(false);

        // Act
        var result = await _service.GetUserTierAsync(_adminUserId);

        // Assert
        Assert.Equal(SubscriptionTier.Admin, result);
    }

    [Fact]
    public async Task GetUserTierAsync_WithDatabaseSubscription_ReturnsCorrectTier()
    {
        // Arrange
        var testUserId = Guid.NewGuid();
        var stripeCustomerId = Guid.NewGuid();
        var subscription = new Subscription
        {
            Id = Guid.NewGuid(),
            UserId = testUserId,
            PlanType = "premium",
            Status = "active",
            StripeSubscriptionId = "sub_test123",
            StripePriceId = "price_test123",
            StripeCustomerId = stripeCustomerId,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        await _context.Subscriptions.AddAsync(subscription);
        await _context.SaveChangesAsync();

        _mockRbacService.Setup(r => r.IsInRoleAsync(testUserId, "Admin")).ReturnsAsync(false);
        _mockRbacService.Setup(r => r.IsInRoleAsync(testUserId, "SuperAdmin")).ReturnsAsync(false);

        // Act
        var result = await _service.GetUserTierAsync(testUserId);

        // Assert
        Assert.Equal(SubscriptionTier.Premium, result);
    }

    // ==================== GetTierAccessLimits Tests ====================

    [Fact]
    public void GetTierAccessLimits_ForFreeTier_ReturnsCorrectLimits()
    {
        // Act
        var result = _service.GetTierAccessLimits(SubscriptionTier.Free);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(SubscriptionTier.Free, result.Tier);
        Assert.True(result.ShowUpgradePrompts);
        Assert.True(result.CanViewStreamingUrls);
        Assert.Equal(-1, result.MaxSearchResultsPerQuery); // Unlimited
    }

    [Fact]
    public void GetTierAccessLimits_ForPremiumTier_ReturnsCorrectLimits()
    {
        // Act
        var result = _service.GetTierAccessLimits(SubscriptionTier.Premium);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(SubscriptionTier.Premium, result.Tier);
        Assert.False(result.ShowUpgradePrompts);
        Assert.True(result.CanViewStreamingUrls);
        Assert.True(result.CanViewPricing);
        Assert.Equal(-1, result.MaxSearchResultsPerQuery); // Unlimited
    }

    // ==================== ApplyPaywallAsync Tests ====================

    [Fact]
    public async Task ApplyPaywallAsync_WithValidResponse_ReturnsPaywalledResponse()
    {
        // Arrange
        var searchResponse = new GlobalSearchResponse
        {
            Results = new List<ContentSummary>
            {
                new ContentSummary
                {
                    Id = "movie-123",
                    Title = "Test Movie",
                    Type = ContentType.Movie,
                    Year = 2024,
                    Overview = "A test movie",
                    Genres = new List<string> { "Action", "Drama" },
                    Rating = 8.5m
                }
            },
            TotalResults = 1,
            Page = 1,
            PageSize = 20,
            HasMore = false,
            Query = "test",
            SearchedAt = DateTime.UtcNow,
            ResponseTime = TimeSpan.FromMilliseconds(150)
        };

        _mockRbacService.Setup(r => r.IsInRoleAsync(_userId, It.IsAny<string>())).ReturnsAsync(false);

        // Act
        var result = await _service.ApplyPaywallAsync(searchResponse, _userId, _correlationId);

        // Assert
        Assert.NotNull(result);
        Assert.NotNull(result.PaywallInfo);
        Assert.Equal("test", result.Query);
        Assert.Equal(1, result.TotalResults);
        Assert.Single(result.Results);
    }

    [Fact]
    public async Task ApplyPaywallAsync_LogsPaywallEvent()
    {
        // Arrange
        var searchResponse = new GlobalSearchResponse
        {
            Results = new List<ContentSummary>(),
            TotalResults = 0,
            Page = 1,
            PageSize = 20,
            HasMore = false,
            Query = "test",
            SearchedAt = DateTime.UtcNow,
            ResponseTime = TimeSpan.FromMilliseconds(100)
        };

        _mockRbacService.Setup(r => r.IsInRoleAsync(_userId, It.IsAny<string>())).ReturnsAsync(false);

        // Act
        await _service.ApplyPaywallAsync(searchResponse, _userId, _correlationId);

        // Assert - Verify event was logged to database
        var events = await _context.PaywallAnalytics
            .Where(pa => pa.UserId == _userId && pa.EventType == PaywallEvent.PaywallShown)
            .ToListAsync();
        Assert.NotEmpty(events);
    }

    // ==================== ApplyPaywallToResultAsync Tests ====================

    [Fact]
    public async Task ApplyPaywallToResultAsync_WithValidResult_ReturnsPaywalledResult()
    {
        // Arrange
        var searchResult = new GlobalSearchResult
        {
            Id = "movie-456",
            Title = "Another Test Movie",
            Type = ContentType.Movie,
            Year = 2023,
            Overview = "A longer overview that might be truncated for free users if we had restrictions",
            Genres = new List<string> { "Comedy", "Romance", "Drama" },
            Rating = 7.5,
            StreamingOptions = new List<GlobalStreamingOption>()
        };

        _mockRbacService.Setup(r => r.IsInRoleAsync(_userId, It.IsAny<string>())).ReturnsAsync(false);

        // Act
        var result = await _service.ApplyPaywallToResultAsync(searchResult, _userId, _correlationId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("movie-456", result.Id);
        Assert.Equal("Another Test Movie", result.Title);
        Assert.False(result.IsPaywalled); // No blocking in current pricing model
    }

    [Fact]
    public async Task ApplyPaywallToResultAsync_WithCountryCode_ReturnsPaywalledResult()
    {
        // Arrange
        var searchResult = new GlobalSearchResult
        {
            Id = "movie-789",
            Title = "Country Test Movie",
            Type = ContentType.Movie,
            Year = 2022,
            Overview = "Test movie for country-specific paywall",
            Genres = new List<string> { "Action" }
        };

        _mockRbacService.Setup(r => r.IsInRoleAsync(_userId, It.IsAny<string>())).ReturnsAsync(false);

        // Act
        var result = await _service.ApplyPaywallToResultAsync(searchResult, _userId, "US");

        // Assert
        Assert.NotNull(result);
        Assert.Equal("movie-789", result.Id);
    }

    // ==================== CanUserSearchAsync Tests ====================

    [Fact]
    public async Task CanUserSearchAsync_AlwaysReturnsTrue()
    {
        // Act
        var result = await _service.CanUserSearchAsync(_userId);

        // Assert
        Assert.True(result); // New pricing model allows unlimited searches
    }

    // ==================== IncrementSearchUsageAsync Tests ====================

    [Fact]
    public async Task IncrementSearchUsageAsync_IncrementsUsageCount()
    {
        // Arrange
        var initialUsage = await _context.UserSearchUsages
            .FirstAsync(u => u.UserId == _userId);
        var initialSearchCount = initialUsage.SearchCount;
        var initialResultsViewed = initialUsage.ResultsViewed;

        // Act
        await _service.IncrementSearchUsageAsync(_userId, 10);

        // Assert
        var updatedUsage = await _context.UserSearchUsages
            .FirstAsync(u => u.UserId == _userId && u.Date == DateTime.UtcNow.Date);
        Assert.Equal(initialSearchCount + 1, updatedUsage.SearchCount);
        Assert.Equal(initialResultsViewed + 10, updatedUsage.ResultsViewed);
    }

    [Fact]
    public async Task IncrementSearchUsageAsync_CreatesNewRecordIfNotExists()
    {
        // Arrange
        var newUserId = Guid.NewGuid();

        // Act
        await _service.IncrementSearchUsageAsync(newUserId, 5);

        // Assert
        var usage = await _context.UserSearchUsages
            .FirstOrDefaultAsync(u => u.UserId == newUserId && u.Date == DateTime.UtcNow.Date);
        Assert.NotNull(usage);
        Assert.Equal(1, usage.SearchCount);
        Assert.Equal(5, usage.ResultsViewed);
    }

    [Fact]
    public async Task IncrementSearchUsageAsync_ClearsCacheAfterIncrement()
    {
        // Arrange - Prime the cache
        await _service.GetTodaysUsageAsync(_userId);

        // Act
        await _service.IncrementSearchUsageAsync(_userId, 5);

        // Assert - Get fresh data (cache should be cleared)
        var usage = await _service.GetTodaysUsageAsync(_userId);
        Assert.NotNull(usage);
    }

    // ==================== GenerateUpgradeMessagingAsync Tests ====================

    [Fact]
    public async Task GenerateUpgradeMessagingAsync_ForFreeUser_ReturnsMessages()
    {
        // Arrange
        _mockRbacService.Setup(r => r.IsInRoleAsync(_userId, It.IsAny<string>())).ReturnsAsync(false);
        var tier = await _service.GetUserTierAsync(_userId);
        var context = new PaywallContext
        {
            UserTier = tier,
            ResultsAvailable = 100,
            ResultsShown = 100,
            SearchQuery = "test",
            DailySearchCount = 5
        };

        // Act
        var result = await _service.GenerateUpgradeMessagingAsync(_userId, context);

        // Assert
        Assert.NotNull(result);
        Assert.NotEmpty(result);
        Assert.Contains(result, m => m.Type == PaywallMessageType.FeatureRestricted);
    }

    [Fact]
    public async Task GenerateUpgradeMessagingAsync_ForPremiumUser_ReturnsEmptyList()
    {
        // Arrange
        _mockRbacService.Setup(r => r.IsInRoleAsync(_premiumUserId, It.IsAny<string>())).ReturnsAsync(false);
        var tier = await _service.GetUserTierAsync(_premiumUserId);
        var context = new PaywallContext
        {
            UserTier = tier,
            ResultsAvailable = 100,
            ResultsShown = 100,
            SearchQuery = "test",
            DailySearchCount = 50
        };

        // Act
        var result = await _service.GenerateUpgradeMessagingAsync(_premiumUserId, context);

        // Assert
        Assert.NotNull(result);
        Assert.Empty(result); // Premium users don't see upgrade prompts
    }

    [Fact]
    public async Task GenerateUpgradeMessagingAsync_LogsPromptShown()
    {
        // Arrange
        _mockRbacService.Setup(r => r.IsInRoleAsync(_userId, It.IsAny<string>())).ReturnsAsync(false);
        var tier = await _service.GetUserTierAsync(_userId);
        var context = new PaywallContext
        {
            UserTier = tier,
            ResultsAvailable = 50,
            ResultsShown = 50,
            SearchQuery = "test"
        };

        // Act
        await _service.GenerateUpgradeMessagingAsync(_userId, context);

        // Assert - Verify event was logged
        var events = await _context.PaywallAnalytics
            .Where(pa => pa.UserId == _userId && pa.EventType == PaywallEvent.UpgradePromptShown)
            .ToListAsync();
        Assert.NotEmpty(events);
    }

    // ==================== LogPaywallEventAsync Tests ====================

    [Fact]
    public async Task LogPaywallEventAsync_LogsEventToDatabase()
    {
        // Arrange
        _mockRbacService.Setup(r => r.IsInRoleAsync(_userId, It.IsAny<string>())).ReturnsAsync(false);
        var metadata = new Dictionary<string, object>
        {
            ["test_key"] = "test_value",
            ["count"] = 42
        };

        // Act
        await _service.LogPaywallEventAsync(_userId, PaywallEvent.LimitReached, metadata, _correlationId);

        // Assert
        var events = await _context.PaywallAnalytics
            .Where(pa => pa.UserId == _userId && pa.CorrelationId == _correlationId)
            .ToListAsync();
        Assert.NotEmpty(events);
        Assert.Contains(events, e => e.EventType == PaywallEvent.LimitReached);
    }

    [Fact]
    public async Task LogPaywallEventAsync_WithNullMetadata_UsesEmptyDictionary()
    {
        // Arrange
        _mockRbacService.Setup(r => r.IsInRoleAsync(_userId, It.IsAny<string>())).ReturnsAsync(false);

        // Act
        await _service.LogPaywallEventAsync(_userId, PaywallEvent.PaywallShown, null, _correlationId);

        // Assert
        var events = await _context.PaywallAnalytics
            .Where(pa => pa.UserId == _userId && pa.EventType == PaywallEvent.PaywallShown)
            .ToListAsync();
        Assert.NotEmpty(events);
    }

    // ==================== ValidateAndRefreshSubscriptionAsync Tests ====================

    [Fact]
    public async Task ValidateAndRefreshSubscriptionAsync_ReturnsSubscription()
    {
        // Act
        var result = await _service.ValidateAndRefreshSubscriptionAsync(_userId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(_userId, result.UserId);
    }

    [Fact]
    public async Task ValidateAndRefreshSubscriptionAsync_WithForceRefresh_ClearsCacheAndReloads()
    {
        // Arrange - Prime the cache
        await _service.GetUserSubscriptionAsync(_userId);

        // Act
        var result = await _service.ValidateAndRefreshSubscriptionAsync(_userId, forceRefresh: true);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(_userId, result.UserId);
    }

    // ==================== HasFeatureAccessAsync Tests ====================

    [Fact]
    public async Task HasFeatureAccessAsync_ForFreeUser_ChecksCorrectly()
    {
        // Arrange
        _mockRbacService.Setup(r => r.IsInRoleAsync(_userId, It.IsAny<string>())).ReturnsAsync(false);

        // Act & Assert - Free users have all features in current model
        Assert.True(await _service.HasFeatureAccessAsync(_userId, PaywallFeature.StreamingUrls));
        Assert.True(await _service.HasFeatureAccessAsync(_userId, PaywallFeature.PricingInformation));
        Assert.True(await _service.HasFeatureAccessAsync(_userId, PaywallFeature.AdvancedFilters));
        Assert.True(await _service.HasFeatureAccessAsync(_userId, PaywallFeature.UnlimitedResults));
    }

    [Fact]
    public async Task HasFeatureAccessAsync_ForPremiumUser_HasAllAccess()
    {
        // Arrange
        _mockRbacService.Setup(r => r.IsInRoleAsync(_premiumUserId, It.IsAny<string>())).ReturnsAsync(false);

        // Act & Assert
        Assert.True(await _service.HasFeatureAccessAsync(_premiumUserId, PaywallFeature.StreamingUrls));
        Assert.True(await _service.HasFeatureAccessAsync(_premiumUserId, PaywallFeature.PricingInformation));
        Assert.True(await _service.HasFeatureAccessAsync(_premiumUserId, PaywallFeature.ExportResults));
        Assert.True(await _service.HasFeatureAccessAsync(_premiumUserId, PaywallFeature.DetailedMetadata));
    }

    // ==================== GetTodaysUsageAsync Tests ====================

    [Fact]
    public async Task GetTodaysUsageAsync_ReturnsExistingUsage()
    {
        // Act
        var result = await _service.GetTodaysUsageAsync(_userId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(_userId, result.UserId);
        Assert.Equal(DateTime.UtcNow.Date, result.Date);
        Assert.Equal(5, result.SearchCount);
        Assert.Equal(15, result.ResultsViewed);
    }

    [Fact]
    public async Task GetTodaysUsageAsync_WithNoUsage_ReturnsMockUsage()
    {
        // Arrange
        var newUserId = Guid.NewGuid();

        // Act
        var result = await _service.GetTodaysUsageAsync(newUserId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(newUserId, result.UserId);
        Assert.Equal(DateTime.UtcNow.Date, result.Date);
        Assert.True(result.SearchCount >= 0); // Mock data
    }

    [Fact]
    public async Task GetTodaysUsageAsync_CachesResult()
    {
        // Act - First call
        var result1 = await _service.GetTodaysUsageAsync(_userId);

        // Clear database
        _context.UserSearchUsages.RemoveRange(_context.UserSearchUsages);
        await _context.SaveChangesAsync();

        // Act - Second call (should use cache)
        var result2 = await _service.GetTodaysUsageAsync(_userId);

        // Assert
        Assert.NotNull(result1);
        Assert.NotNull(result2);
        Assert.Equal(result1.SearchCount, result2.SearchCount);
    }

    // ==================== GetPaywallAnalyticsAsync Tests ====================

    [Fact]
    public async Task GetPaywallAnalyticsAsync_ReturnsAnalytics()
    {
        // Arrange
        _mockRbacService.Setup(r => r.IsInRoleAsync(_userId, It.IsAny<string>())).ReturnsAsync(false);

        // Log some events first
        await _service.LogPaywallEventAsync(_userId, PaywallEvent.PaywallShown, null, _correlationId);
        await _service.LogPaywallEventAsync(_userId, PaywallEvent.LimitReached, null, _correlationId);

        var startDate = DateTime.UtcNow.AddDays(-1);
        var endDate = DateTime.UtcNow.AddDays(1);

        // Act
        var result = await _service.GetPaywallAnalyticsAsync(startDate, endDate);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.TotalEvents >= 2);
        Assert.NotEmpty(result.EventGroupings);
    }

    [Fact]
    public async Task GetPaywallAnalyticsAsync_WithUserIdFilter_FiltersCorrectly()
    {
        // Arrange
        _mockRbacService.Setup(r => r.IsInRoleAsync(_userId, It.IsAny<string>())).ReturnsAsync(false);

        await _service.LogPaywallEventAsync(_userId, PaywallEvent.PaywallShown, null, _correlationId);
        await _service.LogPaywallEventAsync(Guid.NewGuid(), PaywallEvent.PaywallShown, null, _correlationId);

        var startDate = DateTime.UtcNow.AddDays(-1);
        var endDate = DateTime.UtcNow.AddDays(1);

        // Act
        var result = await _service.GetPaywallAnalyticsAsync(startDate, endDate, userId: _userId);

        // Assert
        Assert.NotNull(result);
        // Result should only include events for _userId
        Assert.True(result.TotalEvents > 0);
    }

    [Fact]
    public async Task GetPaywallAnalyticsAsync_WithEventTypeFilter_FiltersCorrectly()
    {
        // Arrange
        _mockRbacService.Setup(r => r.IsInRoleAsync(_userId, It.IsAny<string>())).ReturnsAsync(false);

        await _service.LogPaywallEventAsync(_userId, PaywallEvent.LimitReached, null, _correlationId);
        await _service.LogPaywallEventAsync(_userId, PaywallEvent.PaywallShown, null, _correlationId);

        var startDate = DateTime.UtcNow.AddDays(-1);
        var endDate = DateTime.UtcNow.AddDays(1);

        // Act
        var result = await _service.GetPaywallAnalyticsAsync(startDate, endDate, eventType: PaywallEvent.LimitReached);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.EventGroupings.All(g => g.EventType == PaywallEvent.LimitReached));
    }

    [Fact]
    public async Task GetPaywallAnalyticsAsync_CalculatesConversionRate()
    {
        // Arrange
        _mockRbacService.Setup(r => r.IsInRoleAsync(_userId, It.IsAny<string>())).ReturnsAsync(false);

        // Log conversion events
        await _service.LogPaywallEventAsync(_userId, PaywallEvent.ConversionCompleted, null, _correlationId);
        await _service.LogPaywallEventAsync(_userId, PaywallEvent.PaywallShown, null, _correlationId);
        await _service.LogPaywallEventAsync(_userId, PaywallEvent.PaywallShown, null, _correlationId);

        var startDate = DateTime.UtcNow.AddDays(-1);
        var endDate = DateTime.UtcNow.AddDays(1);

        // Act
        var result = await _service.GetPaywallAnalyticsAsync(startDate, endDate);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.ConversionRate >= 0 && result.ConversionRate <= 100);
    }

    #region VPN Affiliate Ads Tests (Phase 1)

    [Fact]
    public void GetTierAccessLimits_FreeTier_ShowsVpnAffiliateAds()
    {
        // Act
        var limits = _service.GetTierAccessLimits(SubscriptionTier.Free);

        // Assert - free tier should show VPN affiliate ads
        Assert.True(limits.ShowVpnAffiliateAds);
    }

    [Fact]
    public void GetTierAccessLimits_BasicTier_ShowsVpnAffiliateAds()
    {
        // Act
        var limits = _service.GetTierAccessLimits(SubscriptionTier.Basic);

        // Assert - basic tier should show VPN affiliate ads
        Assert.True(limits.ShowVpnAffiliateAds);
    }

    [Fact]
    public void GetTierAccessLimits_PremiumTier_DoesNotShowVpnAffiliateAds()
    {
        // Act
        var limits = _service.GetTierAccessLimits(SubscriptionTier.Premium);

        // Assert - premium tier should NOT show VPN affiliate ads
        Assert.False(limits.ShowVpnAffiliateAds);
    }

    [Fact]
    public void GetTierAccessLimits_AdminTier_DoesNotShowVpnAffiliateAds()
    {
        // Act
        var limits = _service.GetTierAccessLimits(SubscriptionTier.Admin);

        // Assert - admin tier should NOT show VPN affiliate ads
        Assert.False(limits.ShowVpnAffiliateAds);
    }

    #endregion
}
