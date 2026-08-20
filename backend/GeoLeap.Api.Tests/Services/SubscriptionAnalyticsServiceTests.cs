using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;
using Moq;
using Xunit;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;

namespace GeoLeap.Api.Tests.Services;

/// <summary>
/// Phase 5 Service 4: Unit tests for SubscriptionAnalyticsService
/// Complements existing integration tests with focused unit test coverage
/// Focus: Business logic, error handling, edge cases, logging verification
/// </summary>
public class SubscriptionAnalyticsServiceTests : IAsyncLifetime
{
    private readonly ApplicationDbContext _context;
    private readonly Mock<ILogger<SubscriptionAnalyticsService>> _mockLogger;
    private readonly SubscriptionAnalyticsService _service;
    private readonly string _testCorrelationId = "test-correlation-123";

    public SubscriptionAnalyticsServiceTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: $"SubscriptionAnalyticsTests_{Guid.NewGuid()}")
            .Options;

        _context = new ApplicationDbContext(options);
        _mockLogger = new Mock<ILogger<SubscriptionAnalyticsService>>();

        _service = new SubscriptionAnalyticsService(_context, _mockLogger.Object);
    }

    public async Task InitializeAsync()
    {
        await SeedTestDataAsync();
    }

    private async Task SeedTestDataAsync()
    {
        var now = DateTime.UtcNow;
        var monthStart = new DateTime(now.Year, now.Month, 1);

        // Add subscriptions for each tier with different billing intervals (use positive offsets for current month)
        var subscriptions = new List<UserSubscription>
        {
            // Basic tier subscriptions
            new() { Id = Guid.NewGuid(), UserId = Guid.NewGuid(), Tier = SubscriptionTier.Basic, IsActive = true, SubscriptionType = "monthly", CreatedAt = monthStart.AddDays(1), StartDate = monthStart.AddDays(1) },
            new() { Id = Guid.NewGuid(), UserId = Guid.NewGuid(), Tier = SubscriptionTier.Basic, IsActive = true, SubscriptionType = "monthly", CreatedAt = monthStart.AddDays(2), StartDate = monthStart.AddDays(2) },
            new() { Id = Guid.NewGuid(), UserId = Guid.NewGuid(), Tier = SubscriptionTier.Basic, IsActive = true, SubscriptionType = "annual", CreatedAt = monthStart.AddDays(3), StartDate = monthStart.AddDays(3) },

            // Premium tier subscriptions
            new() { Id = Guid.NewGuid(), UserId = Guid.NewGuid(), Tier = SubscriptionTier.Premium, IsActive = true, SubscriptionType = "monthly", CreatedAt = monthStart.AddDays(4), StartDate = monthStart.AddDays(4) },
            new() { Id = Guid.NewGuid(), UserId = Guid.NewGuid(), Tier = SubscriptionTier.Premium, IsActive = true, SubscriptionType = "annual", CreatedAt = monthStart.AddDays(5), StartDate = monthStart.AddDays(5) },

            // Pro tier subscriptions
            new() { Id = Guid.NewGuid(), UserId = Guid.NewGuid(), Tier = SubscriptionTier.Pro, IsActive = true, SubscriptionType = "monthly", CreatedAt = monthStart.AddDays(6), StartDate = monthStart.AddDays(6) },
            new() { Id = Guid.NewGuid(), UserId = Guid.NewGuid(), Tier = SubscriptionTier.Pro, IsActive = true, SubscriptionType = "annual", CreatedAt = monthStart.AddDays(7), StartDate = monthStart.AddDays(7) },

            // Trial user
            new() { Id = Guid.NewGuid(), UserId = Guid.NewGuid(), Tier = SubscriptionTier.Free, IsActive = true, SubscriptionType = "trial", CreatedAt = monthStart.AddDays(1), StartDate = monthStart.AddDays(1) }
        };

        _context.UserSubscriptions.AddRange(subscriptions);

        // Add payment transactions (use positive offsets for current month)
        var payments = new List<PaymentTransaction>
        {
            new() { Id = Guid.NewGuid(), UserId = subscriptions[0].UserId, Amount = 9.99m, Status = "succeeded", CreatedAt = monthStart.AddDays(1), StripePaymentIntentId = $"pi_{Guid.NewGuid():N}" },
            new() { Id = Guid.NewGuid(), UserId = subscriptions[1].UserId, Amount = 9.99m, Status = "succeeded", CreatedAt = monthStart.AddDays(2), StripePaymentIntentId = $"pi_{Guid.NewGuid():N}" },
            new() { Id = Guid.NewGuid(), UserId = subscriptions[2].UserId, Amount = 99.99m, Status = "succeeded", CreatedAt = monthStart.AddDays(3), StripePaymentIntentId = $"pi_{Guid.NewGuid():N}" },
            new() { Id = Guid.NewGuid(), UserId = subscriptions[3].UserId, Amount = 19.99m, Status = "succeeded", CreatedAt = monthStart.AddDays(4), StripePaymentIntentId = $"pi_{Guid.NewGuid():N}" },
            new() { Id = Guid.NewGuid(), UserId = subscriptions[4].UserId, Amount = 199.99m, Status = "completed", CreatedAt = monthStart.AddDays(5), StripePaymentIntentId = $"pi_{Guid.NewGuid():N}" },
            new() { Id = Guid.NewGuid(), UserId = subscriptions[5].UserId, Amount = 29.99m, Status = "succeeded", CreatedAt = monthStart.AddDays(6), StripePaymentIntentId = $"pi_{Guid.NewGuid():N}" },
            new() { Id = Guid.NewGuid(), UserId = subscriptions[6].UserId, Amount = 299.99m, Status = "completed", CreatedAt = monthStart.AddDays(7), StripePaymentIntentId = $"pi_{Guid.NewGuid():N}" },
            new() { Id = Guid.NewGuid(), UserId = Guid.NewGuid(), Amount = 9.99m, Status = "failed", CreatedAt = monthStart.AddDays(8), StripePaymentIntentId = $"pi_{Guid.NewGuid():N}" }
        };

        _context.PaymentTransactions.AddRange(payments);
        await _context.SaveChangesAsync();
    }

    public async Task DisposeAsync()
    {
        await _context.Database.EnsureDeletedAsync();
        await _context.DisposeAsync();
    }

    #region Dashboard Summary Tests

    [Fact]
    public async Task GetDashboardSummaryAsync_ReturnsValidSummary()
    {
        // Act
        var result = await _service.GetDashboardSummaryAsync(_testCorrelationId);

        // Assert
        Assert.NotNull(result);
        Assert.NotNull(result.CurrentPeriodMetrics);
        Assert.NotNull(result.PreviousPeriodMetrics);
        Assert.NotNull(result.KeyPerformanceIndicators);
        Assert.NotEqual(default, result.LastUpdated);

        // Verify logging
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Generating dashboard summary")),
                null,
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task GetDashboardSummaryAsync_UsesCorrectCorrelationId()
    {
        // Arrange
        var customCorrelationId = "custom-id-456";

        // Act
        await _service.GetDashboardSummaryAsync(customCorrelationId);

        // Assert - Verify correlation ID was logged
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains(customCorrelationId)),
                null,
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.AtLeastOnce);
    }

    #endregion

    #region Subscription Metrics Tests

    [Fact]
    public async Task CalculateSubscriptionMetricsAsync_ReturnsValidMetrics()
    {
        // Arrange - use current month to match seeded data
        var now = DateTime.UtcNow;
        var startDate = new DateTime(now.Year, now.Month, 1);
        var endDate = startDate.AddMonths(1).AddDays(-1);

        // Act
        var result = await _service.CalculateSubscriptionMetricsAsync(startDate, endDate, _testCorrelationId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(startDate, result.PeriodStart);
        Assert.Equal(endDate, result.PeriodEnd);
        Assert.True(result.MonthlyRecurringRevenue > 0);
        Assert.True(result.TotalActiveSubscribers > 0);
        Assert.True(result.AverageRevenuePerUser > 0);
        Assert.NotEqual(default, result.GeneratedAt);
    }

    [Fact]
    public async Task CalculateSubscriptionMetricsAsync_IncludesAllMetricCategories()
    {
        // Arrange
        var startDate = DateTime.UtcNow.AddMonths(-1);
        var endDate = DateTime.UtcNow;

        // Act
        var result = await _service.CalculateSubscriptionMetricsAsync(startDate, endDate, _testCorrelationId);

        // Assert - Verify all metric categories are populated
        Assert.NotNull(result.SubscriptionsByPlan);
        Assert.NotEmpty(result.SubscriptionsByPlan);
        Assert.NotNull(result.SubscriptionsByInterval);
        Assert.NotEmpty(result.SubscriptionsByInterval);
        Assert.NotNull(result.RevenueByPlan);
        Assert.NotEmpty(result.RevenueByPlan);

        // Verify common subscription plans exist
        Assert.Contains("basic", result.SubscriptionsByPlan.Keys);
        Assert.Contains("premium", result.SubscriptionsByPlan.Keys);

        // Verify subscription intervals exist
        Assert.Contains("monthly", result.SubscriptionsByInterval.Keys);
        Assert.Contains("annual", result.SubscriptionsByInterval.Keys);
    }

    [Fact]
    public async Task CalculateSubscriptionMetricsAsync_ChurnRateWithinValidRange()
    {
        // Arrange
        var startDate = DateTime.UtcNow.AddMonths(-1);
        var endDate = DateTime.UtcNow;

        // Act
        var result = await _service.CalculateSubscriptionMetricsAsync(startDate, endDate, _testCorrelationId);

        // Assert - Churn rate should be between 0 and 1 (0% to 100%)
        Assert.True(result.ChurnRate >= 0 && result.ChurnRate <= 1,
            $"Churn rate {result.ChurnRate} should be between 0 and 1");

        // Growth rate should be valid
        Assert.True(result.GrowthRate >= -1 && result.GrowthRate <= 10,
            $"Growth rate {result.GrowthRate} should be reasonable");
    }

    #endregion

    #region Real-Time Metrics Tests

    [Fact]
    public async Task GetRealTimeMetricsAsync_ReturnsValidMetrics()
    {
        // Act
        var result = await _service.GetRealTimeMetricsAsync(_testCorrelationId);

        // Assert
        Assert.NotNull(result);
        Assert.NotEmpty(result);

        // Verify key metrics exist
        Assert.Contains("current_mrr", result.Keys);
        Assert.Contains("active_subscribers", result.Keys);
        Assert.Contains("churn_rate", result.Keys);
        Assert.Contains("growth_rate", result.Keys);

        // Verify all values are non-negative
        foreach (var kvp in result)
        {
            Assert.True(kvp.Value >= 0 || kvp.Key.Contains("growth"),
                $"Metric {kvp.Key} should be non-negative unless it's growth rate");
        }
    }

    [Fact]
    public async Task GetRealTimeMetricsAsync_IncludesPaymentMetrics()
    {
        // Act
        var result = await _service.GetRealTimeMetricsAsync(_testCorrelationId);

        // Assert
        Assert.Contains("payment_success_rate", result.Keys);

        var paymentSuccessRate = result["payment_success_rate"];
        Assert.True(paymentSuccessRate >= 0 && paymentSuccessRate <= 1,
            "Payment success rate should be between 0 and 1");
    }

    #endregion

    #region Cohort Analysis Tests

    [Fact]
    public async Task GenerateCohortAnalysisAsync_ReturnsValidCohorts()
    {
        // Arrange
        var request = new CohortAnalysisRequest
        {
            StartDate = DateTime.UtcNow.AddMonths(-6),
            EndDate = DateTime.UtcNow,
            CohortType = "monthly"
        };

        // Act
        var result = await _service.GenerateCohortAnalysisAsync(request, _testCorrelationId);

        // Assert
        Assert.NotNull(result);
        Assert.NotEmpty(result);

        var cohort = result.First();
        Assert.NotEqual(Guid.Empty, cohort.Id);
        Assert.True(cohort.InitialSubscribers > 0);
        Assert.NotNull(cohort.RetainedUsersByPeriod);
        Assert.NotNull(cohort.RetentionRatesByPeriod);
        Assert.NotEqual(default, cohort.GeneratedAt);
    }

    [Fact]
    public async Task GenerateCohortAnalysisAsync_RetentionRatesWithinValidRange()
    {
        // Arrange
        var request = new CohortAnalysisRequest
        {
            StartDate = DateTime.UtcNow.AddMonths(-3),
            EndDate = DateTime.UtcNow
        };

        // Act
        var result = await _service.GenerateCohortAnalysisAsync(request, _testCorrelationId);

        // Assert
        foreach (var cohort in result)
        {
            foreach (var rate in cohort.RetentionRatesByPeriod.Values)
            {
                Assert.True(rate >= 0 && rate <= 1,
                    $"Retention rate {rate} should be between 0 and 1");
            }
        }
    }

    #endregion

    #region Business Insights Tests

    [Fact]
    public async Task GenerateBusinessInsightsAsync_ReturnsActionableInsights()
    {
        // Arrange
        var startDate = DateTime.UtcNow.AddMonths(-1);
        var endDate = DateTime.UtcNow;

        // Act
        var result = await _service.GenerateBusinessInsightsAsync(startDate, endDate, _testCorrelationId);

        // Assert
        Assert.NotNull(result);
        Assert.NotEmpty(result);

        var insight = result.First();
        Assert.NotNull(insight.Title);
        Assert.NotNull(insight.Description);
        Assert.NotNull(insight.ActionableRecommendations);
        Assert.NotEmpty(insight.ActionableRecommendations);
        Assert.NotEqual(default, insight.GeneratedAt);
    }

    [Fact]
    public async Task GenerateBusinessInsightsAsync_IncludesPriorityAndType()
    {
        // Arrange
        var startDate = DateTime.UtcNow.AddMonths(-1);
        var endDate = DateTime.UtcNow;

        // Act
        var result = await _service.GenerateBusinessInsightsAsync(startDate, endDate, _testCorrelationId);

        // Assert
        foreach (var insight in result)
        {
            // Verify enum properties are set (not using NotEqual with default since default may be valid)
            Assert.True(Enum.IsDefined(typeof(BusinessInsightType), insight.Type),
                $"Type should be a valid BusinessInsightType");
            Assert.True(Enum.IsDefined(typeof(BusinessInsightPriority), insight.Priority),
                $"Priority should be a valid BusinessInsightPriority");
            Assert.True(Enum.IsDefined(typeof(TrendDirection), insight.Trend),
                $"Trend should be a valid TrendDirection");
        }
    }

    #endregion

    #region Alert Tests

    [Fact]
    public async Task GetActiveAlertsAsync_ReturnsAlerts()
    {
        // Act
        var result = await _service.GetActiveAlertsAsync(_testCorrelationId);

        // Assert
        Assert.NotNull(result);

        foreach (var alert in result)
        {
            Assert.NotEqual(Guid.Empty, alert.Id);
            Assert.NotNull(alert.AlertType);
            Assert.NotNull(alert.Title);
            Assert.NotNull(alert.Description);
            Assert.NotEqual(default, alert.TriggeredAt);
        }
    }

    [Fact]
    public async Task GetActiveAlertsAsync_OnlyReturnsActiveAlerts()
    {
        // Act
        var result = await _service.GetActiveAlertsAsync(_testCorrelationId);

        // Assert
        Assert.All(result, alert => Assert.True(alert.IsActive,
            "All returned alerts should be active"));
    }

    #endregion

    #region Payment Performance Tests

    [Fact]
    public async Task AnalyzePaymentPerformanceAsync_ReturnsValidAnalytics()
    {
        // Arrange
        var startDate = DateTime.UtcNow.AddMonths(-1);
        var endDate = DateTime.UtcNow;

        // Act
        var result = await _service.AnalyzePaymentPerformanceAsync(startDate, endDate, _testCorrelationId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(startDate, result.PeriodStart);
        Assert.Equal(endDate, result.PeriodEnd);
        Assert.True(result.TotalTransactions > 0);
        Assert.True(result.SuccessfulTransactions <= result.TotalTransactions);
        Assert.Equal(result.TotalTransactions, result.SuccessfulTransactions + result.FailedTransactions);
    }

    [Fact]
    public async Task AnalyzePaymentPerformanceAsync_SuccessRateCalculatedCorrectly()
    {
        // Arrange
        var startDate = DateTime.UtcNow.AddMonths(-1);
        var endDate = DateTime.UtcNow;

        // Act
        var result = await _service.AnalyzePaymentPerformanceAsync(startDate, endDate, _testCorrelationId);

        // Assert - Success rate should be between 0 and 1
        Assert.True(result.SuccessRate >= 0 && result.SuccessRate <= 1,
            $"Success rate {result.SuccessRate} should be between 0 and 1");

        // Verify volumes are consistent
        Assert.True(result.SuccessfulVolume <= result.TotalVolume,
            "Successful volume should not exceed total volume");
    }

    #endregion

    #region Event Tracking Tests

    [Fact]
    public async Task TrackSubscriptionEventAsync_LogsEvent()
    {
        // Arrange
        var analyticsEvent = new SubscriptionAnalyticsEvent
        {
            EventType = "subscription_created",
            UserId = Guid.NewGuid(),
            SubscriptionId = Guid.NewGuid(),
            Timestamp = DateTime.UtcNow
        };

        // Act
        await _service.TrackSubscriptionEventAsync(analyticsEvent, _testCorrelationId);

        // Assert - Verify logging occurred
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Tracking subscription event")),
                null,
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task TrackCustomerLifecycleEventAsync_LogsEventWithMetadata()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var eventType = "trial_started";
        var metadata = new Dictionary<string, object>
        {
            ["plan_id"] = "premium",
            ["source"] = "website"
        };

        // Act
        await _service.TrackCustomerLifecycleEventAsync(userId, eventType, metadata, _testCorrelationId);

        // Assert - Verify logging with user ID and event type
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) =>
                    v.ToString()!.Contains("Tracking customer lifecycle event") &&
                    v.ToString()!.Contains(userId.ToString()) &&
                    v.ToString()!.Contains(eventType)),
                null,
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    #endregion
}
