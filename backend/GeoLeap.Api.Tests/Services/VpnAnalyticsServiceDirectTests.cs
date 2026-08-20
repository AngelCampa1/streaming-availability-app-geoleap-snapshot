using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.AspNetCore.Http;
using Moq;
using Xunit;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services.VpnGuidanceServices;
using System.Text.Json;

namespace GeoLeap.Api.Tests.Services;

/// <summary>
/// Phase 9: Direct unit tests for VpnAnalyticsService
/// Goal: Achieve 75-80% coverage and discover analytics aggregation bugs
/// Focus: Event tracking, analytics calculations, edge cases
/// Expected bugs: Division by zero, empty data handling, date range validation
/// </summary>
public class VpnAnalyticsServiceDirectTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly Mock<ILogger<VpnAnalyticsService>> _mockLogger;
    private readonly Mock<IHttpContextAccessor> _mockHttpContextAccessor;
    private readonly VpnAnalyticsService _service;

    // Test data
    private readonly Guid _testProviderId = Guid.NewGuid();
    private readonly Guid _testUserId = Guid.NewGuid();
    private readonly Guid _testGuideId = Guid.NewGuid();
    private readonly Guid _testBestPracticeId = Guid.NewGuid();

    public VpnAnalyticsServiceDirectTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: $"VpnAnalyticsTestDb_{Guid.NewGuid()}")
            .Options;

        _context = new ApplicationDbContext(options);
        _mockLogger = new Mock<ILogger<VpnAnalyticsService>>();
        _mockHttpContextAccessor = new Mock<IHttpContextAccessor>();

        _service = new VpnAnalyticsService(_context, _mockLogger.Object, _mockHttpContextAccessor.Object);

        // Seed minimal test data
        SeedTestData();
    }

    private void SeedTestData()
    {
        // Create test VPN provider
        var provider = new VpnProvider
        {
            Id = _testProviderId,
            Name = "TestVPN",
            WebsiteUrl = "https://testvpn.com",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        // Create test guide
        var guide = new VpnSetupGuide
        {
            Id = _testGuideId,
            VpnProviderId = _testProviderId,
            Title = "Test Guide",
            Platform = "Windows",
            Content = "Test content",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        // Create test best practice
        var bestPractice = new VpnBestPractice
        {
            Id = _testBestPracticeId,
            Title = "Test Practice",
            Content = "Test content",
            Category = VpnPracticeCategory.Security,
            IsActive = true,
            ViewCount = 100,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.VpnProviders.Add(provider);
        _context.VpnSetupGuides.Add(guide);
        _context.VpnBestPractices.Add(bestPractice);
        _context.SaveChanges();
    }

    #region TrackEventAsync Tests

    [Fact]
    public async Task TrackEventAsync_CreatesAnalyticsRecord_WithValidData()
    {
        // Arrange
        var eventType = VpnGuidanceEventType.ProviderViewed;
        var additionalData = new Dictionary<string, object> { ["test"] = "value" };

        // Act
        await _service.TrackEventAsync(eventType, _testUserId, _testProviderId, additionalData: additionalData);

        // Assert
        var analytics = await _context.VpnGuidanceAnalytics.FirstOrDefaultAsync();
        Assert.NotNull(analytics);
        Assert.Equal(eventType, analytics.EventType);
        Assert.Equal(_testUserId, analytics.UserId);
        Assert.Equal(_testProviderId, analytics.VpnProviderId);
        Assert.Contains("test", analytics.EventData!);
    }

    [Fact]
    public async Task TrackEventAsync_WithNullHttpContext_DoesNotThrow()
    {
        // Arrange - HttpContext is null (no HTTP request)
        _mockHttpContextAccessor.Setup(x => x.HttpContext).Returns((HttpContext?)null);

        // Act
        await _service.TrackEventAsync(VpnGuidanceEventType.GuideViewed, guideId: _testGuideId);

        // Assert
        var analytics = await _context.VpnGuidanceAnalytics.FirstOrDefaultAsync();
        Assert.NotNull(analytics);
        Assert.Null(analytics.IpAddress);
        Assert.Null(analytics.UserAgent);
    }

    [Fact]
    public async Task TrackEventAsync_WithException_DoesNotThrowOrBreakFlow()
    {
        // Arrange - Force exception by disposing context
        await _context.DisposeAsync();

        // Act - Should swallow exception (analytics failures shouldn't break main flow)
        var exception = await Record.ExceptionAsync(async () =>
        {
            await _service.TrackEventAsync(VpnGuidanceEventType.ProviderClicked);
        });

        // Assert - No exception thrown
        Assert.Null(exception);
    }

    #endregion

    #region GetProviderAnalyticsAsync Tests

    [Fact]
    public async Task GetProviderAnalyticsAsync_WithNoData_ReturnsZeroMetrics()
    {
        // Arrange
        var fromDate = DateTime.UtcNow.AddDays(-7);
        var toDate = DateTime.UtcNow;

        // Act
        var result = await _service.GetProviderAnalyticsAsync(_testProviderId, fromDate, toDate);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(0, result["totalViews"]);
        Assert.Equal(0, result["totalClicks"]);
        Assert.Equal(0.0, result["clickThroughRate"]); // Should be 0, not NaN or exception
    }

    [Fact]
    public async Task GetProviderAnalyticsAsync_WithViewsButNoClicks_CalculatesZeroClickThroughRate()
    {
        // Arrange
        var fromDate = DateTime.UtcNow.AddDays(-7);

        // Add only views, no clicks
        for (int i = 0; i < 10; i++)
        {
            await _service.TrackEventAsync(VpnGuidanceEventType.ProviderViewed, vpnProviderId: _testProviderId);
        }

        // Set toDate AFTER tracking events
        var toDate = DateTime.UtcNow.AddMinutes(1);

        // Act
        var result = await _service.GetProviderAnalyticsAsync(_testProviderId, fromDate, toDate);

        // Assert
        Assert.Equal(10, result["totalViews"]);
        Assert.Equal(0, result["totalClicks"]);
        Assert.Equal(0.0, result["clickThroughRate"]); // 0 / 10 = 0
    }

    [Fact]
    public async Task GetProviderAnalyticsAsync_WithClicksButNoViews_CalculatesInfiniteClickThroughRate()
    {
        // Arrange - Unusual scenario: clicks without views
        var fromDate = DateTime.UtcNow.AddDays(-7);

        for (int i = 0; i < 5; i++)
        {
            await _service.TrackEventAsync(VpnGuidanceEventType.ProviderClicked, vpnProviderId: _testProviderId);
        }

        // Set toDate AFTER tracking events
        var toDate = DateTime.UtcNow.AddMinutes(1);

        // Act
        var result = await _service.GetProviderAnalyticsAsync(_testProviderId, fromDate, toDate);

        // Assert
        Assert.Equal(0, result["totalViews"]);
        Assert.Equal(5, result["totalClicks"]);
        // CTR calculation: totalViews > 0 ? clicks/views : 0
        // With 0 views, should return 0 (not infinity or NaN)
        Assert.Equal(0.0, result["clickThroughRate"]);
    }

    [Fact]
    public async Task GetProviderAnalyticsAsync_CalculatesCorrectMetrics()
    {
        // Arrange
        var fromDate = DateTime.UtcNow.AddDays(-7);

        // 10 views, 3 clicks, 1 affiliate click
        for (int i = 0; i < 10; i++)
            await _service.TrackEventAsync(VpnGuidanceEventType.ProviderViewed, _testUserId, _testProviderId);

        for (int i = 0; i < 3; i++)
            await _service.TrackEventAsync(VpnGuidanceEventType.ProviderClicked, _testUserId, _testProviderId);

        await _service.TrackEventAsync(VpnGuidanceEventType.AffiliateClicked, _testUserId, _testProviderId);

        // Set toDate AFTER tracking events to ensure events are within range
        var toDate = DateTime.UtcNow.AddMinutes(1);

        // Act
        var result = await _service.GetProviderAnalyticsAsync(_testProviderId, fromDate, toDate);

        // Assert
        Assert.Equal(10, result["totalViews"]);
        Assert.Equal(3, result["totalClicks"]);
        Assert.Equal(1, result["affiliateClicks"]);
        Assert.Equal(30.0, result["clickThroughRate"]); // 3/10 * 100 = 30%
        Assert.Equal(33.33, result["affiliateConversionRate"]); // 1/3 * 100 = 33.33%
    }

    [Fact]
    public async Task GetProviderAnalyticsAsync_WithInvalidDateRange_HandlesGracefully()
    {
        // Arrange - fromDate AFTER toDate (invalid range)
        var fromDate = DateTime.UtcNow;
        var toDate = DateTime.UtcNow.AddDays(-7);

        await _service.TrackEventAsync(VpnGuidanceEventType.ProviderViewed, vpnProviderId: _testProviderId);

        // Act
        var result = await _service.GetProviderAnalyticsAsync(_testProviderId, fromDate, toDate);

        // Assert - Should return 0 metrics (no data in impossible date range)
        Assert.Equal(0, result["totalViews"]);
    }

    #endregion

    #region GetOverallAnalyticsAsync Tests

    [Fact]
    public async Task GetOverallAnalyticsAsync_WithNoData_ReturnsZeroMetrics()
    {
        // Arrange
        var fromDate = DateTime.UtcNow.AddDays(-30);
        var toDate = DateTime.UtcNow;

        // Act
        var result = await _service.GetOverallAnalyticsAsync(fromDate, toDate);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(0, result["totalEvents"]);
        Assert.Equal(0, result["uniqueUsers"]);
        Assert.Equal(0.0, result["averageEventsPerUser"]); // Should be 0, not exception
    }

    [Fact]
    public async Task GetOverallAnalyticsAsync_CalculatesCorrectAverages()
    {
        // Arrange
        var fromDate = DateTime.UtcNow.AddDays(-7);

        // User 1: 3 events
        for (int i = 0; i < 3; i++)
            await _service.TrackEventAsync(VpnGuidanceEventType.ProviderViewed, _testUserId);

        // User 2: 2 events
        var user2 = Guid.NewGuid();
        for (int i = 0; i < 2; i++)
            await _service.TrackEventAsync(VpnGuidanceEventType.GuideViewed, user2);

        // Set toDate AFTER tracking events
        var toDate = DateTime.UtcNow.AddMinutes(1);

        // Act
        var result = await _service.GetOverallAnalyticsAsync(fromDate, toDate);

        // Assert
        Assert.Equal(5, result["totalEvents"]);
        Assert.Equal(2, result["uniqueUsers"]);
        Assert.Equal(2.5, result["averageEventsPerUser"]); // 5 events / 2 users = 2.5
    }

    [Fact]
    public async Task GetOverallAnalyticsAsync_WithSingleSession_CalculatesCorrectly()
    {
        // Arrange
        var fromDate = DateTime.UtcNow.AddDays(-7);

        // Single session with 5 events
        for (int i = 0; i < 5; i++)
            await _service.TrackEventAsync(VpnGuidanceEventType.ProviderViewed, sessionId: "session123");

        // Set toDate AFTER tracking events
        var toDate = DateTime.UtcNow.AddMinutes(1);

        // Act
        var result = await _service.GetOverallAnalyticsAsync(fromDate, toDate);

        // Assert
        Assert.Equal(1, result["uniqueSessions"]);
        Assert.Equal(5.0, result["averageEventsPerSession"]); // 5 events / 1 session
    }

    #endregion

    #region GetUserEngagementAnalyticsAsync Tests

    [Fact]
    public async Task GetUserEngagementAnalyticsAsync_WithNoUsers_ReturnsZeroMetrics()
    {
        // Arrange - Events without userId
        var fromDate = DateTime.UtcNow.AddDays(-7);
        var toDate = DateTime.UtcNow;

        await _service.TrackEventAsync(VpnGuidanceEventType.ProviderViewed); // No userId

        // Act
        var result = await _service.GetUserEngagementAnalyticsAsync(fromDate, toDate);

        // Assert
        var conversionMetrics = (Dictionary<string, object>)result["conversionMetrics"];
        Assert.Equal(0, conversionMetrics["totalUsers"]);
        Assert.Equal(0.0, result["averageEventsPerUser"]); // Should not throw
    }

    [Fact]
    public async Task GetUserEngagementAnalyticsAsync_CalculatesEngagementLevels()
    {
        // Arrange
        var fromDate = DateTime.UtcNow.AddDays(-30);

        // Low engagement user (1 event)
        var user1 = Guid.NewGuid();
        await _service.TrackEventAsync(VpnGuidanceEventType.ProviderViewed, user1);

        // Medium engagement user (5 events)
        var user2 = Guid.NewGuid();
        for (int i = 0; i < 5; i++)
            await _service.TrackEventAsync(VpnGuidanceEventType.ProviderViewed, user2);

        // High engagement user (15 events)
        var user3 = Guid.NewGuid();
        for (int i = 0; i < 15; i++)
            await _service.TrackEventAsync(VpnGuidanceEventType.ProviderViewed, user3);

        // Set toDate AFTER tracking events
        var toDate = DateTime.UtcNow.AddMinutes(1);

        // Act
        var result = await _service.GetUserEngagementAnalyticsAsync(fromDate, toDate);

        // Assert
        var engagementLevels = (Dictionary<string, int>)result["engagementLevels"];
        Assert.Equal(1, engagementLevels["Low (1-2 events)"]);
        Assert.Equal(1, engagementLevels["Medium (3-10 events)"]);
        Assert.Equal(1, engagementLevels["High (11+ events)"]);
    }

    [Fact]
    public async Task GetUserEngagementAnalyticsAsync_WithZeroSessionDurations_HandlesGracefully()
    {
        // Arrange - All events at exact same timestamp (duration = 0)
        var fromDate = DateTime.UtcNow.AddDays(-7);
        var toDate = DateTime.UtcNow;
        var sessionId = "test-session";

        // Create analytics records manually with same timestamp
        var timestamp = DateTime.UtcNow;
        for (int i = 0; i < 5; i++)
        {
            _context.VpnGuidanceAnalytics.Add(new VpnGuidanceAnalytics
            {
                Id = Guid.NewGuid(),
                UserId = _testUserId,
                EventType = VpnGuidanceEventType.ProviderViewed,
                SessionId = sessionId,
                Timestamp = timestamp // Same timestamp = 0 duration
            });
        }
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetUserEngagementAnalyticsAsync(fromDate, toDate);

        // Assert - Should filter out zero duration sessions (line 226)
        Assert.Equal(0.0, result["averageSessionDuration"]); // Should be 0, not crash
    }

    [Fact]
    public async Task GetUserEngagementAnalyticsAsync_CalculatesSessionDurations()
    {
        // Arrange
        var fromDate = DateTime.UtcNow.AddDays(-7);
        var sessionId = "test-session";

        // Create session spanning 10 minutes
        _context.VpnGuidanceAnalytics.Add(new VpnGuidanceAnalytics
        {
            Id = Guid.NewGuid(),
            UserId = _testUserId,
            EventType = VpnGuidanceEventType.ProviderViewed,
            SessionId = sessionId,
            Timestamp = DateTime.UtcNow.AddMinutes(-10)
        });
        _context.VpnGuidanceAnalytics.Add(new VpnGuidanceAnalytics
        {
            Id = Guid.NewGuid(),
            UserId = _testUserId,
            EventType = VpnGuidanceEventType.ProviderClicked,
            SessionId = sessionId,
            Timestamp = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();

        // Set toDate AFTER creating events
        var toDate = DateTime.UtcNow.AddMinutes(1);

        // Act
        var result = await _service.GetUserEngagementAnalyticsAsync(fromDate, toDate);

        // Assert
        var avgDuration = (double)result["averageSessionDuration"];
        Assert.True(avgDuration >= 9.0 && avgDuration <= 11.0); // ~10 minutes (allow rounding)
    }

    #endregion

    #region GetMostViewedProvidersAsync Tests

    [Fact]
    public async Task GetMostViewedProvidersAsync_WithNoViews_ReturnsEmptyList()
    {
        // Act
        var result = await _service.GetMostViewedProvidersAsync();

        // Assert
        Assert.NotNull(result);
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetMostViewedProvidersAsync_ReturnsProvidersOrderedByViews()
    {
        // Arrange - Create second provider
        var provider2 = new VpnProvider
        {
            Id = Guid.NewGuid(),
            Name = "TestVPN2",
            WebsiteUrl = "https://testvpn2.com",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.VpnProviders.Add(provider2);
        await _context.SaveChangesAsync();

        // Provider 1: 10 views
        for (int i = 0; i < 10; i++)
            await _service.TrackEventAsync(VpnGuidanceEventType.ProviderViewed, vpnProviderId: _testProviderId);

        // Provider 2: 5 views
        for (int i = 0; i < 5; i++)
            await _service.TrackEventAsync(VpnGuidanceEventType.ProviderViewed, vpnProviderId: provider2.Id);

        // Act
        var result = (await _service.GetMostViewedProvidersAsync()).ToList();

        // Assert
        Assert.Equal(2, result.Count);
        Assert.Equal(_testProviderId, result[0].Id); // Most viewed first
        Assert.Equal(provider2.Id, result[1].Id);
    }

    [Fact]
    public async Task GetMostViewedProvidersAsync_RespectsCountLimit()
    {
        // Arrange - Create 15 providers with views
        for (int i = 0; i < 15; i++)
        {
            var provider = new VpnProvider
            {
                Id = Guid.NewGuid(),
                Name = $"Provider{i}",
                WebsiteUrl = $"https://provider{i}.com",
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            _context.VpnProviders.Add(provider);
            await _context.SaveChangesAsync();

            await _service.TrackEventAsync(VpnGuidanceEventType.ProviderViewed, vpnProviderId: provider.Id);
        }

        // Act - Request top 5
        var result = await _service.GetMostViewedProvidersAsync(count: 5);

        // Assert
        Assert.Equal(5, result.Count());
    }

    [Fact]
    public async Task GetMostViewedProvidersAsync_WithInactiveProviders_ExcludesThem()
    {
        // Arrange - Create inactive provider
        var inactiveProvider = new VpnProvider
        {
            Id = Guid.NewGuid(),
            Name = "Inactive",
            WebsiteUrl = "https://inactive.com",
            IsActive = false, // ❌ Inactive
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.VpnProviders.Add(inactiveProvider);
        await _context.SaveChangesAsync();

        // Add views for inactive provider
        await _service.TrackEventAsync(VpnGuidanceEventType.ProviderViewed, vpnProviderId: inactiveProvider.Id);

        // Act
        var result = await _service.GetMostViewedProvidersAsync();

        // Assert - Should not include inactive provider
        Assert.DoesNotContain(result, p => p.Id == inactiveProvider.Id);
    }

    #endregion

    #region GetMostViewedGuidesAsync Tests

    [Fact]
    public async Task GetMostViewedGuidesAsync_WithNoViews_ReturnsEmptyList()
    {
        // Act
        var result = await _service.GetMostViewedGuidesAsync();

        // Assert
        Assert.NotNull(result);
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetMostViewedGuidesAsync_ReturnsGuidesOrderedByViews()
    {
        // Arrange - Create second guide
        var guide2 = new VpnSetupGuide
        {
            Id = Guid.NewGuid(),
            VpnProviderId = _testProviderId,
            Title = "Guide 2",
            Platform = "macOS",
            Content = "Test",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.VpnSetupGuides.Add(guide2);
        await _context.SaveChangesAsync();

        // Guide 1: 8 views
        for (int i = 0; i < 8; i++)
            await _service.TrackEventAsync(VpnGuidanceEventType.GuideViewed, guideId: _testGuideId);

        // Guide 2: 3 views
        for (int i = 0; i < 3; i++)
            await _service.TrackEventAsync(VpnGuidanceEventType.GuideViewed, guideId: guide2.Id);

        // Act
        var result = (await _service.GetMostViewedGuidesAsync()).ToList();

        // Assert
        Assert.Equal(2, result.Count);
        Assert.Equal(_testGuideId, result[0].Id); // Most viewed first
    }

    #endregion

    #region GetMostViewedBestPracticesAsync Tests

    [Fact]
    public async Task GetMostViewedBestPracticesAsync_ReturnsBestPracticesOrderedByViewCount()
    {
        // Arrange - Create practices with different view counts
        var practice1 = new VpnBestPractice
        {
            Id = Guid.NewGuid(),
            Title = "Practice 1",
            Content = "Test",
            Category = VpnPracticeCategory.Security,
            IsActive = true,
            ViewCount = 500,
            UpdatedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };
        var practice2 = new VpnBestPractice
        {
            Id = Guid.NewGuid(),
            Title = "Practice 2",
            Content = "Test",
            Category = VpnPracticeCategory.Performance,
            IsActive = true,
            ViewCount = 1000,
            UpdatedAt = DateTime.UtcNow,
            CreatedAt = DateTime.UtcNow
        };
        _context.VpnBestPractices.Add(practice1);
        _context.VpnBestPractices.Add(practice2);
        await _context.SaveChangesAsync();

        // Act
        var result = (await _service.GetMostViewedBestPracticesAsync()).ToList();

        // Assert
        Assert.True(result.Count >= 2);
        Assert.Equal(practice2.Id, result[0].Id); // Highest view count first
    }

    [Fact]
    public async Task GetMostViewedBestPracticesAsync_FiltersOldPractices()
    {
        // Arrange - Create old practice (before fromDate)
        var oldPractice = new VpnBestPractice
        {
            Id = Guid.NewGuid(),
            Title = "Old Practice",
            Content = "Test",
            Category = VpnPracticeCategory.Security,
            IsActive = true,
            ViewCount = 9999, // High view count
            UpdatedAt = DateTime.UtcNow.AddDays(-60), // Old update
            CreatedAt = DateTime.UtcNow.AddDays(-100)
        };
        _context.VpnBestPractices.Add(oldPractice);
        await _context.SaveChangesAsync();

        // Act - Default fromDate is 30 days ago
        var result = await _service.GetMostViewedBestPracticesAsync();

        // Assert - Should not include practice updated > 30 days ago
        Assert.DoesNotContain(result, p => p.Id == oldPractice.Id);
    }

    #endregion

    public void Dispose()
    {
        try
        {
            _context.Database.EnsureDeleted();
            _context.Dispose();
        }
        catch (ObjectDisposedException)
        {
            // Context already disposed - this is expected in tests that dispose the context
        }
    }
}
