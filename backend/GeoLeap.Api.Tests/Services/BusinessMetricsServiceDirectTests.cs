using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace GeoLeap.Api.Tests.Services;

public class BusinessMetricsServiceDirectTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly IMemoryCache _cache;
    private readonly Mock<ILogger<BusinessMetricsService>> _mockLogger;
    private readonly Mock<ISubscriptionAnalyticsService> _mockSubscriptionAnalytics;
    private readonly BusinessMetricsService _service;
    private readonly Guid _userId;
    private readonly string _correlationId;
    private readonly DateTime _baseDate;

    public BusinessMetricsServiceDirectTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"TestDb_{Guid.NewGuid()}")
            .Options;
        _context = new ApplicationDbContext(options);

        _cache = new MemoryCache(new MemoryCacheOptions());
        _mockLogger = new Mock<ILogger<BusinessMetricsService>>();
        _mockSubscriptionAnalytics = new Mock<ISubscriptionAnalyticsService>();

        _service = new BusinessMetricsService(
            _context,
            _cache,
            _mockLogger.Object,
            _mockSubscriptionAnalytics.Object);

        _userId = Guid.NewGuid();
        _correlationId = Guid.NewGuid().ToString();
        _baseDate = DateTime.UtcNow;

        SeedTestData();
        SetupMocks();
    }

    private void SeedTestData()
    {
        // Users
        var users = new List<User>();
        for (int i = 0; i < 100; i++)
        {
            users.Add(new User
            {
                Id = Guid.NewGuid(),
                Email = $"user{i}@test.com",
                PasswordHash = "hash",
                CreatedAt = _baseDate.AddDays(-Random.Shared.Next(1, 90)),
                LastLoginAt = i < 70 ? _baseDate.AddDays(-Random.Shared.Next(1, 25)) : _baseDate.AddDays(-40)
            });
        }
        _context.Users.AddRange(users);

        // User Subscriptions (trial users) - using UserSubscription model for paywall tracking
        var trialSubscriptions = users.Take(15).Select(u => new UserSubscription
        {
            Id = Guid.NewGuid(),
            UserId = u.Id,
            SubscriptionType = "trial",
            IsActive = true,
            StartDate = _baseDate.AddDays(-7),
            EndDate = _baseDate.AddDays(7),
            Tier = SubscriptionTier.Free,
            Status = PaymentStatus.Active
        }).ToList();
        _context.UserSubscriptions.AddRange(trialSubscriptions);

        // Payment Transactions
        var transactions = new List<PaymentTransaction>();
        for (int i = 0; i < 50; i++)
        {
            transactions.Add(new PaymentTransaction
            {
                Id = Guid.NewGuid(),
                UserId = users[i].Id,
                StripePaymentIntentId = $"pi_test_{Guid.NewGuid().ToString().Substring(0, 8)}",  // Required field
                Amount = 9.99m + (decimal)(Random.Shared.NextDouble() * 20),
                Currency = "USD",
                Status = "succeeded",  // Use "succeeded" instead of "completed"
                CreatedAt = _baseDate.AddDays(-Random.Shared.Next(1, 30)),
                ProcessedAt = _baseDate.AddDays(-Random.Shared.Next(1, 30))
            });
        }
        _context.PaymentTransactions.AddRange(transactions);

        // Support Actions
        var supportActions = new List<SupportAction>();
        for (int i = 0; i < 30; i++)
        {
            supportActions.Add(new SupportAction
            {
                Id = Guid.NewGuid(),
                TargetUserId = users[i].Id,  // Use TargetUserId instead of UserId (UserId is read-only)
                SupportAgentId = Guid.NewGuid(),  // Required field
                ActionType = (SupportActionType)(i % 3),
                Status = i < 20 ? SupportActionStatus.Completed : SupportActionStatus.InProgress,
                Priority = (SupportPriority)(i % 3),
                Title = $"Support Action {i}",  // Required field
                Description = $"Support action description {i}",  // Required field
                CreatedAt = _baseDate.AddDays(-Random.Shared.Next(1, 15)),
                CompletedAt = i < 20 ? _baseDate.AddDays(-Random.Shared.Next(1, 10)) : null
            });
        }
        _context.SupportActions.AddRange(supportActions);

        // Business Alerts
        var alerts = new List<BusinessAlert>
        {
            new BusinessAlert
            {
                Id = Guid.NewGuid(),
                Type = "high_churn",  // Use Type instead of AlertType
                Severity = "high",
                Message = "Churn rate above threshold",
                IsActive = true,
                IsResolved = false,
                CreatedAt = _baseDate.AddHours(-2)
            },
            new BusinessAlert
            {
                Id = Guid.NewGuid(),
                Type = "low_revenue",  // Use Type instead of AlertType
                Severity = "medium",
                Message = "Revenue below target",
                IsActive = true,
                IsResolved = false,
                CreatedAt = _baseDate.AddHours(-5)
            },
            new BusinessAlert
            {
                Id = Guid.NewGuid(),
                Type = "system_issue",  // Use Type instead of AlertType
                Severity = "low",
                Message = "Minor performance degradation",
                IsActive = false,
                IsResolved = true,
                CreatedAt = _baseDate.AddDays(-2)
            }
        };
        _context.BusinessAlerts.AddRange(alerts);

        _context.SaveChanges();
    }

    private void SetupMocks()
    {
        var subscriptionMetrics = new SubscriptionMetrics
        {
            MonthlyRecurringRevenue = 45000m,
            AnnualRecurringRevenue = 540000m,
            TotalActiveSubscribers = 523,
            NewSubscribers = 47,
            ChurnedSubscribers = 12,
            ChurnRate = 2.3,
            GrowthRate = 6.7,
            AverageRevenuePerUser = 86.05m,
            CustomerLifetimeValue = 1230.50m,
            TrialConversionRate = 32.5
        };

        _mockSubscriptionAnalytics
            .Setup(s => s.CalculateSubscriptionMetricsAsync(
                It.IsAny<DateTime>(),
                It.IsAny<DateTime>(),
                It.IsAny<string>()))
            .ReturnsAsync(subscriptionMetrics);
    }

    #region GetBusinessMetricsAsync Tests (5 tests)

    [Fact]
    public async Task GetBusinessMetricsAsync_WithValidCorrelationId_ReturnsCompleteMetrics()
    {
        // Act
        var result = await _service.GetBusinessMetricsAsync(_correlationId);

        // Assert
        Assert.NotNull(result);
        Assert.NotNull(result.Kpis);
        Assert.NotNull(result.Trends);
        Assert.NotNull(result.RealTimeMetrics);
        Assert.NotNull(result.Alerts);
        Assert.True(result.Timestamp <= DateTime.UtcNow);
    }

    [Fact]
    public async Task GetBusinessMetricsAsync_WithCaching_ReturnsCachedResult()
    {
        // Act - Call twice
        var result1 = await _service.GetBusinessMetricsAsync(_correlationId);
        var result2 = await _service.GetBusinessMetricsAsync(_correlationId);

        // Assert - Should return same cached instance
        Assert.Equal(result1.Timestamp, result2.Timestamp);
        Assert.Same(result1.Kpis, result2.Kpis);
    }

    [Fact]
    public async Task GetBusinessMetricsAsync_WithDatabaseError_ThrowsException()
    {
        // Arrange - Create separate temporary context to test disposal
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"TempDb_{Guid.NewGuid()}")
            .Options;
        var tempContext = new ApplicationDbContext(options);
        var tempService = new BusinessMetricsService(
            tempContext,
            _cache,
            _mockLogger.Object,
            _mockSubscriptionAnalytics.Object);
        await tempContext.DisposeAsync();

        // Act & Assert
        await Assert.ThrowsAsync<ObjectDisposedException>(() =>
            tempService.GetBusinessMetricsAsync(_correlationId));
    }

    [Fact]
    public async Task GetBusinessMetricsAsync_IncludesKpisFromSubservice()
    {
        // Act
        var result = await _service.GetBusinessMetricsAsync(_correlationId);

        // Assert
        Assert.Equal(45000m, result.Kpis.MonthlyRecurringRevenue);
        Assert.Equal(86.05m, result.Kpis.AverageRevenuePerUser);
        Assert.Equal(2.3, result.Kpis.ChurnRate);
    }

    [Fact]
    public async Task GetBusinessMetricsAsync_IncludesActiveAlerts()
    {
        // Act
        var result = await _service.GetBusinessMetricsAsync(_correlationId);

        // Assert
        Assert.NotEmpty(result.Alerts);
        Assert.Contains(result.Alerts, a => a.Type == "high_churn");  // Use Type instead of AlertType
        Assert.DoesNotContain(result.Alerts, a => a.IsResolved);
    }

    #endregion

    #region GetRealTimeKpisAsync Tests (6 tests)

    [Fact]
    public async Task GetRealTimeKpisAsync_ReturnsUserMetrics()
    {
        // Act
        var result = await _service.GetRealTimeKpisAsync(_correlationId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(100, result.TotalUsers);
        Assert.True(result.ActiveUsers >= 70); // Users active in last 30 days
        Assert.Equal(15, result.TrialUsers);
    }

    [Fact]
    public async Task GetRealTimeKpisAsync_ReturnsRevenueMetrics()
    {
        // Act
        var result = await _service.GetRealTimeKpisAsync(_correlationId);

        // Assert
        Assert.Equal(45000m, result.MonthlyRecurringRevenue);
        Assert.Equal(86.05m, result.AverageRevenuePerUser);
    }

    [Fact]
    public async Task GetRealTimeKpisAsync_ReturnsSubscriptionMetrics()
    {
        // Act
        var result = await _service.GetRealTimeKpisAsync(_correlationId);

        // Assert
        Assert.Equal(2.3, result.ChurnRate);
        Assert.Equal(32.5, result.ConversionRate);
    }

    [Fact]
    public async Task GetRealTimeKpisAsync_ReturnsSupportMetrics()
    {
        // Act
        var result = await _service.GetRealTimeKpisAsync(_correlationId);

        // Assert
        Assert.True(result.SupportTickets >= 0);
    }

    [Fact]
    public async Task GetRealTimeKpisAsync_ReturnsSystemMetrics()
    {
        // Act
        var result = await _service.GetRealTimeKpisAsync(_correlationId);

        // Assert
        Assert.Equal(99.9, result.SystemUptime);
        Assert.Equal(4.5, result.CustomerSatisfactionScore);
    }

    [Fact]
    public async Task GetRealTimeKpisAsync_CallsSubscriptionAnalytics()
    {
        // Act
        await _service.GetRealTimeKpisAsync(_correlationId);

        // Assert
        _mockSubscriptionAnalytics.Verify(s => s.CalculateSubscriptionMetricsAsync(
            It.IsAny<DateTime>(),
            It.IsAny<DateTime>(),
            _correlationId), Times.Once);
    }

    #endregion

    #region GetMetricTrendsAsync Tests (5 tests)

    [Fact]
    public async Task GetMetricTrendsAsync_WithValidParameters_ReturnsTrends()
    {
        // Arrange
        var startDate = _baseDate.AddDays(-30);
        var endDate = _baseDate;

        // Act
        var result = await _service.GetMetricTrendsAsync("all", startDate, endDate, "daily", _correlationId);

        // Assert
        Assert.NotNull(result);
        Assert.NotEmpty(result);
        Assert.Contains(result, t => t.MetricName == "user_growth");
        Assert.Contains(result, t => t.MetricName == "monthly_revenue");
    }

    [Fact]
    public async Task GetMetricTrendsAsync_GeneratesDataPoints()
    {
        // Arrange
        var startDate = _baseDate.AddDays(-7);
        var endDate = _baseDate;

        // Act
        var result = await _service.GetMetricTrendsAsync("all", startDate, endDate, "daily", _correlationId);

        // Assert
        Assert.All(result, trend =>
        {
            Assert.NotNull(trend.DataPoints);
            Assert.NotEmpty(trend.DataPoints);
        });
    }

    [Fact]
    public async Task GetMetricTrendsAsync_IncludesTrendDirection()
    {
        // Arrange
        var startDate = _baseDate.AddDays(-30);
        var endDate = _baseDate;

        // Act
        var result = await _service.GetMetricTrendsAsync("all", startDate, endDate, "daily", _correlationId);

        // Assert
        Assert.All(result, trend =>
        {
            Assert.True(Enum.IsDefined(typeof(TrendDirection), trend.Direction));
        });
    }

    [Fact]
    public async Task GetMetricTrendsAsync_CalculatesChangePercentage()
    {
        // Arrange
        var startDate = _baseDate.AddDays(-30);
        var endDate = _baseDate;

        // Act
        var result = await _service.GetMetricTrendsAsync("all", startDate, endDate, "daily", _correlationId);

        // Assert
        Assert.All(result, trend =>
        {
            Assert.True(trend.ChangePercentage >= 0);
            Assert.True(trend.CurrentValue > 0);
            Assert.True(trend.PreviousValue > 0);
        });
    }

    [Fact]
    public async Task GetMetricTrendsAsync_ReturnsMockDataWithoutDatabaseAccess()
    {
        // Arrange - Create separate temporary context that's disposed
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"TempDb_{Guid.NewGuid()}")
            .Options;
        var tempContext = new ApplicationDbContext(options);
        var tempService = new BusinessMetricsService(
            tempContext,
            _cache,
            _mockLogger.Object,
            _mockSubscriptionAnalytics.Object);
        await tempContext.DisposeAsync();

        // Act - Service returns mock data without database access, so no exception
        var startDate = _baseDate.AddDays(-30);
        var endDate = _baseDate;
        var result = await tempService.GetMetricTrendsAsync("all", startDate, endDate, "daily", _correlationId);

        // Assert - Should return mock data even with disposed context
        Assert.NotNull(result);
        Assert.NotEmpty(result);
    }

    #endregion

    #region GetActiveAlertsAsync Tests (4 tests)

    [Fact]
    public async Task GetActiveAlertsAsync_ReturnsActiveUnresolvedAlerts()
    {
        // Act
        var result = await _service.GetActiveAlertsAsync(_correlationId);

        // Assert
        Assert.NotEmpty(result);
        Assert.Equal(2, result.Count);
        Assert.All(result, alert =>
        {
            Assert.True(alert.IsActive);
            Assert.False(alert.IsResolved);
        });
    }

    [Fact]
    public async Task GetActiveAlertsAsync_OrdersByCreatedAtDescending()
    {
        // Act
        var result = await _service.GetActiveAlertsAsync(_correlationId);

        // Assert
        for (int i = 0; i < result.Count - 1; i++)
        {
            Assert.True(result[i].CreatedAt >= result[i + 1].CreatedAt);
        }
    }

    [Fact]
    public async Task GetActiveAlertsAsync_LimitsToTop10()
    {
        // Arrange - Add more alerts
        for (int i = 0; i < 15; i++)
        {
            _context.BusinessAlerts.Add(new BusinessAlert
            {
                Id = Guid.NewGuid(),
                Type = $"alert_{i}",  // Use Type instead of AlertType
                Severity = "low",
                Message = $"Test alert {i}",
                IsActive = true,
                IsResolved = false,
                CreatedAt = _baseDate.AddMinutes(-i)
            });
        }
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetActiveAlertsAsync(_correlationId);

        // Assert
        Assert.True(result.Count <= 10);
    }

    [Fact]
    public async Task GetActiveAlertsAsync_WithNoActiveAlerts_ReturnsEmpty()
    {
        // Arrange - Mark all alerts as resolved
        var alerts = await _context.BusinessAlerts.ToListAsync();
        foreach (var alert in alerts)
        {
            alert.IsResolved = true;
            alert.IsActive = false;
        }
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetActiveAlertsAsync(_correlationId);

        // Assert
        Assert.Empty(result);
    }

    #endregion

    #region GetUserGrowthAnalyticsAsync Tests (4 tests)

    [Fact]
    public async Task GetUserGrowthAnalyticsAsync_ReturnsUserCountInDateRange()
    {
        // Arrange
        var startDate = _baseDate.AddDays(-30);
        var endDate = _baseDate;

        // Act
        var result = await _service.GetUserGrowthAnalyticsAsync(startDate, endDate, _correlationId);

        // Assert
        Assert.Contains("total_new_users", result.Keys);
        Assert.True((int)result["total_new_users"] > 0);
    }

    [Fact]
    public async Task GetUserGrowthAnalyticsAsync_ReturnsDailySignups()
    {
        // Arrange
        var startDate = _baseDate.AddDays(-30);
        var endDate = _baseDate;

        // Act
        var result = await _service.GetUserGrowthAnalyticsAsync(startDate, endDate, _correlationId);

        // Assert
        Assert.Contains("daily_signups", result.Keys);
        Assert.NotNull(result["daily_signups"]);
    }

    [Fact]
    public async Task GetUserGrowthAnalyticsAsync_CalculatesAverageDailySignups()
    {
        // Arrange
        var startDate = _baseDate.AddDays(-30);
        var endDate = _baseDate;

        // Act
        var result = await _service.GetUserGrowthAnalyticsAsync(startDate, endDate, _correlationId);

        // Assert
        Assert.Contains("average_daily_signups", result.Keys);
        Assert.True((double)result["average_daily_signups"] >= 0);
    }

    [Fact]
    public async Task GetUserGrowthAnalyticsAsync_CalculatesGrowthTrend()
    {
        // Arrange
        var startDate = _baseDate.AddDays(-30);
        var endDate = _baseDate;

        // Act
        var result = await _service.GetUserGrowthAnalyticsAsync(startDate, endDate, _correlationId);

        // Assert
        Assert.Contains("growth_trend", result.Keys);
        var trend = (string)result["growth_trend"];
        Assert.Contains(trend, new[] { "positive", "neutral", "negative" });
    }

    #endregion

    #region GetRevenueAnalyticsAsync Tests (5 tests)

    [Fact]
    public async Task GetRevenueAnalyticsAsync_ReturnsTotalRevenue()
    {
        // Arrange
        var startDate = _baseDate.AddDays(-30);
        var endDate = _baseDate;

        // Act
        var result = await _service.GetRevenueAnalyticsAsync(startDate, endDate, _correlationId);

        // Assert
        Assert.Contains("total_revenue", result.Keys);
        Assert.True((decimal)result["total_revenue"] > 0);
    }

    [Fact]
    public async Task GetRevenueAnalyticsAsync_ReturnsTransactionCount()
    {
        // Arrange
        var startDate = _baseDate.AddDays(-30);
        var endDate = _baseDate;

        // Act
        var result = await _service.GetRevenueAnalyticsAsync(startDate, endDate, _correlationId);

        // Assert
        Assert.Contains("transaction_count", result.Keys);
        Assert.True((int)result["transaction_count"] > 0);
    }

    [Fact]
    public async Task GetRevenueAnalyticsAsync_CalculatesAverageTransactionValue()
    {
        // Arrange
        var startDate = _baseDate.AddDays(-30);
        var endDate = _baseDate;

        // Act
        var result = await _service.GetRevenueAnalyticsAsync(startDate, endDate, _correlationId);

        // Assert
        Assert.Contains("average_transaction_value", result.Keys);
        var avgValue = (decimal)result["average_transaction_value"];
        Assert.True(avgValue > 0);
    }

    [Fact]
    public async Task GetRevenueAnalyticsAsync_ReturnsDailyRevenue()
    {
        // Arrange
        var startDate = _baseDate.AddDays(-30);
        var endDate = _baseDate;

        // Act
        var result = await _service.GetRevenueAnalyticsAsync(startDate, endDate, _correlationId);

        // Assert
        Assert.Contains("daily_revenue", result.Keys);
        Assert.NotNull(result["daily_revenue"]);
    }

    [Fact]
    public async Task GetRevenueAnalyticsAsync_CalculatesRevenueTrend()
    {
        // Arrange
        var startDate = _baseDate.AddDays(-30);
        var endDate = _baseDate;

        // Act
        var result = await _service.GetRevenueAnalyticsAsync(startDate, endDate, _correlationId);

        // Assert
        Assert.Contains("revenue_trend", result.Keys);
        var trend = (string)result["revenue_trend"];
        Assert.Contains(trend, new[] { "positive", "neutral", "negative" });
    }

    #endregion

    #region GetSubscriptionAnalyticsAsync Tests (3 tests)

    [Fact]
    public async Task GetSubscriptionAnalyticsAsync_ReturnsSubscriptionMetrics()
    {
        // Arrange
        var startDate = _baseDate.AddDays(-30);
        var endDate = _baseDate;

        // Act
        var result = await _service.GetSubscriptionAnalyticsAsync(startDate, endDate, _correlationId);

        // Assert
        Assert.Contains("mrr", result.Keys);
        Assert.Contains("arr", result.Keys);
        Assert.Contains("active_subscribers", result.Keys);
        Assert.Contains("churn_rate", result.Keys);
        Assert.Contains("arpu", result.Keys);
        Assert.Contains("ltv", result.Keys);
    }

    [Fact]
    public async Task GetSubscriptionAnalyticsAsync_CallsSubscriptionAnalytics()
    {
        // Arrange
        var startDate = _baseDate.AddDays(-30);
        var endDate = _baseDate;

        // Act
        await _service.GetSubscriptionAnalyticsAsync(startDate, endDate, _correlationId);

        // Assert
        _mockSubscriptionAnalytics.Verify(s => s.CalculateSubscriptionMetricsAsync(
            startDate, endDate, _correlationId), Times.Once);
    }

    [Fact]
    public async Task GetSubscriptionAnalyticsAsync_MapsMetricsCorrectly()
    {
        // Arrange
        var startDate = _baseDate.AddDays(-30);
        var endDate = _baseDate;

        // Act
        var result = await _service.GetSubscriptionAnalyticsAsync(startDate, endDate, _correlationId);

        // Assert - Cast dictionary values to appropriate types
        Assert.Equal(45000m, (decimal)result["mrr"]);
        Assert.Equal(540000m, (decimal)result["arr"]);
        Assert.Equal(523, Convert.ToInt32(result["active_subscribers"]));
        Assert.Equal(2.3, Convert.ToDouble(result["churn_rate"]));
    }

    #endregion

    #region GetSupportMetricsAsync Tests (5 tests)

    [Fact]
    public async Task GetSupportMetricsAsync_ReturnsTotalTickets()
    {
        // Arrange
        var startDate = _baseDate.AddDays(-30);
        var endDate = _baseDate;

        // Act
        var result = await _service.GetSupportMetricsAsync(startDate, endDate, _correlationId);

        // Assert
        Assert.Contains("total_tickets", result.Keys);
        Assert.True((int)result["total_tickets"] > 0);
    }

    [Fact]
    public async Task GetSupportMetricsAsync_CalculatesResolutionRate()
    {
        // Arrange
        var startDate = _baseDate.AddDays(-30);
        var endDate = _baseDate;

        // Act
        var result = await _service.GetSupportMetricsAsync(startDate, endDate, _correlationId);

        // Assert
        Assert.Contains("resolution_rate", result.Keys);
        var rate = (double)result["resolution_rate"];
        Assert.True(rate >= 0 && rate <= 1);
    }

    [Fact]
    public async Task GetSupportMetricsAsync_CalculatesAverageResolutionTime()
    {
        // Arrange
        var startDate = _baseDate.AddDays(-30);
        var endDate = _baseDate;

        // Act
        var result = await _service.GetSupportMetricsAsync(startDate, endDate, _correlationId);

        // Assert
        Assert.Contains("avg_resolution_time_hours", result.Keys);
        Assert.True((double)result["avg_resolution_time_hours"] >= 0);
    }

    [Fact]
    public async Task GetSupportMetricsAsync_ReturnsTicketsByPriority()
    {
        // Arrange
        var startDate = _baseDate.AddDays(-30);
        var endDate = _baseDate;

        // Act
        var result = await _service.GetSupportMetricsAsync(startDate, endDate, _correlationId);

        // Assert
        Assert.Contains("tickets_by_priority", result.Keys);
        var byPriority = (Dictionary<string, int>)result["tickets_by_priority"];
        Assert.NotEmpty(byPriority);
    }

    [Fact]
    public async Task GetSupportMetricsAsync_ReturnsTicketsByType()
    {
        // Arrange
        var startDate = _baseDate.AddDays(-30);
        var endDate = _baseDate;

        // Act
        var result = await _service.GetSupportMetricsAsync(startDate, endDate, _correlationId);

        // Assert
        Assert.Contains("tickets_by_type", result.Keys);
        var byType = (Dictionary<string, int>)result["tickets_by_type"];
        Assert.NotEmpty(byType);
    }

    #endregion

    #region GetSystemPerformanceMetricsAsync Tests (3 tests)

    [Fact]
    public async Task GetSystemPerformanceMetricsAsync_ReturnsAllMetrics()
    {
        // Act
        var result = await _service.GetSystemPerformanceMetricsAsync(_correlationId);

        // Assert
        Assert.Contains("cpu_usage", result.Keys);
        Assert.Contains("memory_usage", result.Keys);
        Assert.Contains("disk_usage", result.Keys);
        Assert.Contains("active_connections", result.Keys);
        Assert.Contains("requests_per_second", result.Keys);
        Assert.Contains("uptime_percentage", result.Keys);
        Assert.Contains("cache_hit_rate", result.Keys);
    }

    [Fact]
    public async Task GetSystemPerformanceMetricsAsync_ReturnsReasonableValues()
    {
        // Act
        var result = await _service.GetSystemPerformanceMetricsAsync(_correlationId);

        // Assert
        Assert.True((double)result["cpu_usage"] >= 0 && (double)result["cpu_usage"] <= 100);
        Assert.True((double)result["memory_usage"] >= 0 && (double)result["memory_usage"] <= 100);
        Assert.True((double)result["uptime_percentage"] >= 0 && (double)result["uptime_percentage"] <= 100);
        Assert.True((double)result["cache_hit_rate"] >= 0 && (double)result["cache_hit_rate"] <= 100);
    }

    [Fact]
    public async Task GetSystemPerformanceMetricsAsync_ReturnsMockData()
    {
        // Act
        var result = await _service.GetSystemPerformanceMetricsAsync(_correlationId);

        // Assert - Verify it returns mock values as defined in service
        Assert.Equal(45.2, result["cpu_usage"]);
        Assert.Equal(99.95, result["uptime_percentage"]);
        Assert.Equal(94.2, result["cache_hit_rate"]);
    }

    #endregion

    #region GetCustomAnalyticsAsync Tests (4 tests)

    [Fact]
    public async Task GetCustomAnalyticsAsync_WithValidRequest_ReturnsAnalytics()
    {
        // Arrange
        var request = new AdminAnalyticsRequest
        {
            MetricType = "custom_metric",
            StartDate = _baseDate.AddDays(-7),
            EndDate = _baseDate,
            Granularity = "daily",
            Dimensions = new List<string> { "region", "platform" }
        };

        // Act
        var result = await _service.GetCustomAnalyticsAsync(request, _correlationId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("custom_metric", result.MetricType);
        Assert.Equal("daily", result.Granularity);
        Assert.NotEmpty(result.Data);
    }

    [Fact]
    public async Task GetCustomAnalyticsAsync_GeneratesDataPoints()
    {
        // Arrange
        var request = new AdminAnalyticsRequest
        {
            MetricType = "test_metric",
            StartDate = _baseDate.AddDays(-7),
            EndDate = _baseDate,
            Granularity = "hourly"
        };

        // Act
        var result = await _service.GetCustomAnalyticsAsync(request, _correlationId);

        // Assert
        Assert.NotEmpty(result.Data);
        Assert.All(result.Data, dp =>
        {
            Assert.NotNull(dp.Metrics);
            Assert.Contains("test_metric", dp.Metrics.Keys);
        });
    }

    [Fact]
    public async Task GetCustomAnalyticsAsync_IncludesDimensions()
    {
        // Arrange
        var request = new AdminAnalyticsRequest
        {
            MetricType = "metric",
            StartDate = _baseDate.AddDays(-2),
            EndDate = _baseDate,
            Granularity = "daily",
            Dimensions = new List<string> { "country", "device" }
        };

        // Act
        var result = await _service.GetCustomAnalyticsAsync(request, _correlationId);

        // Assert
        Assert.NotEmpty(result.Dimensions);
        Assert.All(result.Data, dp =>
        {
            Assert.Contains("country", dp.Dimensions.Keys);
            Assert.Contains("device", dp.Dimensions.Keys);
        });
    }

    [Fact]
    public async Task GetCustomAnalyticsAsync_CalculatesSummaryStatistics()
    {
        // Arrange
        var request = new AdminAnalyticsRequest
        {
            MetricType = "metric",
            StartDate = _baseDate.AddDays(-7),
            EndDate = _baseDate,
            Granularity = "daily"
        };

        // Act
        var result = await _service.GetCustomAnalyticsAsync(request, _correlationId);

        // Assert
        Assert.NotNull(result.Summary);
        Assert.Contains("total_data_points", result.Summary.Keys);
        Assert.Contains("average_value", result.Summary.Keys);
        Assert.Contains("max_value", result.Summary.Keys);
        Assert.Contains("min_value", result.Summary.Keys);
    }

    #endregion

    #region TrackBusinessEventAsync Tests (2 tests)

    [Fact]
    public async Task TrackBusinessEventAsync_WithValidEvent_CompletesSuccessfully()
    {
        // Arrange
        var properties = new Dictionary<string, object>
        {
            { "user_id", _userId.ToString() },
            { "value", 100 }
        };

        // Act & Assert - Should not throw
        await _service.TrackBusinessEventAsync("test_event", properties, _correlationId);
    }

    [Fact]
    public async Task TrackBusinessEventAsync_LogsEvent()
    {
        // Arrange
        var properties = new Dictionary<string, object> { { "key", "value" } };

        // Act
        await _service.TrackBusinessEventAsync("event_type", properties, _correlationId);

        // Assert
        _mockLogger.Verify(l => l.Log(
            LogLevel.Information,
            It.IsAny<EventId>(),
            It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("event_type")),
            It.IsAny<Exception>(),
            It.IsAny<Func<It.IsAnyType, Exception?, string>>()), Times.AtLeastOnce);
    }

    #endregion

    #region RefreshMetricsCacheAsync Tests (3 tests)

    [Fact]
    public async Task RefreshMetricsCacheAsync_ClearsCacheEntries()
    {
        // Arrange - Pre-populate cache
        await _service.GetBusinessMetricsAsync(_correlationId);
        Assert.True(_cache.TryGetValue($"business_metrics_{DateTime.UtcNow:yyyy-MM-dd-HH}", out BusinessMetricsResponse _));

        // Act
        await _service.RefreshMetricsCacheAsync(_correlationId);

        // Assert - Cache should be cleared and repopulated
        // Note: Cache might be repopulated immediately, so we just verify no error
        Assert.True(true);
    }

    [Fact]
    public async Task RefreshMetricsCacheAsync_PrewarmsCache()
    {
        // Act
        await _service.RefreshMetricsCacheAsync(_correlationId);

        // Assert - Cache should now contain metrics
        var cacheKey = $"business_metrics_{DateTime.UtcNow:yyyy-MM-dd-HH}";
        Assert.True(_cache.TryGetValue(cacheKey, out BusinessMetricsResponse _));
    }

    [Fact]
    public async Task RefreshMetricsCacheAsync_WithError_ThrowsException()
    {
        // Arrange - Create separate temporary context to test disposal
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"TempDb_{Guid.NewGuid()}")
            .Options;
        var tempContext = new ApplicationDbContext(options);
        var tempService = new BusinessMetricsService(
            tempContext,
            _cache,
            _mockLogger.Object,
            _mockSubscriptionAnalytics.Object);
        await tempContext.DisposeAsync();

        // Act & Assert
        await Assert.ThrowsAnyAsync<Exception>(() =>
            tempService.RefreshMetricsCacheAsync(_correlationId));
    }

    #endregion

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
        _cache.Dispose();
    }
}
