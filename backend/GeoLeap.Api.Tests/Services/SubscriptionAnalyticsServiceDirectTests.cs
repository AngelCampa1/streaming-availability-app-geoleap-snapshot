using Xunit;
using Moq;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;

namespace GeoLeap.Api.Tests.Services;

/// <summary>
/// Comprehensive DirectTests for SubscriptionAnalyticsService
/// Tests analytics calculations, aggregations, metrics, and business insights
/// Pattern: InMemoryDatabase with unique Guid per test class
/// </summary>
public class SubscriptionAnalyticsServiceDirectTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly Mock<ILogger<SubscriptionAnalyticsService>> _mockLogger;
    private readonly SubscriptionAnalyticsService _service;
    private readonly string _testCorrelationId = "test-correlation-analytics-123";
    private readonly Guid _testUserId = Guid.NewGuid();
    private readonly Guid _testSubscriptionId = Guid.NewGuid();

    public SubscriptionAnalyticsServiceDirectTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: $"SubscriptionAnalyticsDirectTests_{Guid.NewGuid()}")
            .Options;

        _context = new ApplicationDbContext(options);
        _mockLogger = new Mock<ILogger<SubscriptionAnalyticsService>>();

        _service = new SubscriptionAnalyticsService(_context, _mockLogger.Object);

        // Seed test data for analytics tests
        SeedTestData();
    }

    private void SeedTestData()
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
        _context.SaveChanges();
    }

    #region Dashboard Summary Tests

    [Fact]
    public async Task GetDashboardSummaryAsync_ReturnsCompleteStructure()
    {
        // Act
        var result = await _service.GetDashboardSummaryAsync(_testCorrelationId);

        // Assert
        Assert.NotNull(result);
        Assert.NotNull(result.CurrentPeriodMetrics);
        Assert.NotNull(result.PreviousPeriodMetrics);
        Assert.NotNull(result.KeyPerformanceIndicators);
        Assert.NotNull(result.TrendAlerts);
        Assert.NotNull(result.TopInsights);
        Assert.NotEqual(default, result.LastUpdated);
    }

    [Fact]
    public async Task GetDashboardSummaryAsync_CurrentPeriodIsThisMonth()
    {
        // Act
        var result = await _service.GetDashboardSummaryAsync(_testCorrelationId);

        // Assert
        var now = DateTime.UtcNow;
        var expectedStart = new DateTime(now.Year, now.Month, 1);
        Assert.Equal(expectedStart, result.CurrentPeriodMetrics.PeriodStart);
    }

    [Fact]
    public async Task GetDashboardSummaryAsync_PreviousPeriodIsLastMonth()
    {
        // Act
        var result = await _service.GetDashboardSummaryAsync(_testCorrelationId);

        // Assert
        var now = DateTime.UtcNow;
        var expectedPreviousStart = new DateTime(now.Year, now.Month, 1).AddMonths(-1);
        Assert.Equal(expectedPreviousStart, result.PreviousPeriodMetrics.PeriodStart);
    }

    [Fact]
    public async Task GetDashboardSummaryAsync_LogsCorrelationId()
    {
        // Arrange
        var customCorrelationId = "custom-dashboard-456";

        // Act
        await _service.GetDashboardSummaryAsync(customCorrelationId);

        // Assert
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

    #region Subscription Metrics Calculation Tests

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
        Assert.True(result.AnnualRecurringRevenue > 0);
        Assert.True(result.TotalActiveSubscribers > 0);
    }

    [Fact]
    public async Task CalculateSubscriptionMetricsAsync_AnnualRecurringRevenueIsCorrect()
    {
        // Arrange
        var startDate = DateTime.UtcNow.AddMonths(-1);
        var endDate = DateTime.UtcNow;

        // Act
        var result = await _service.CalculateSubscriptionMetricsAsync(startDate, endDate, _testCorrelationId);

        // Assert - ARR should be approximately 12x MRR
        var expectedARR = result.MonthlyRecurringRevenue * 12;
        Assert.Equal(expectedARR, result.AnnualRecurringRevenue);
    }

    [Fact]
    public async Task CalculateSubscriptionMetricsAsync_ARPUCalculationIsCorrect()
    {
        // Arrange - use current month to match seeded data
        var now = DateTime.UtcNow;
        var startDate = new DateTime(now.Year, now.Month, 1);
        var endDate = startDate.AddMonths(1).AddDays(-1);

        // Act
        var result = await _service.CalculateSubscriptionMetricsAsync(startDate, endDate, _testCorrelationId);

        // Assert - ARPU = Total Revenue / ActiveSubscribers (with floating point tolerance)
        if (result.TotalActiveSubscribers > 0)
        {
            var expectedARPU = result.TotalRevenue / result.TotalActiveSubscribers;
            Assert.Equal(expectedARPU, result.AverageRevenuePerUser, 2); // 2 decimal precision
        }
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
        Assert.InRange(result.ChurnRate, 0, 1);
    }

    [Fact]
    public async Task CalculateSubscriptionMetricsAsync_GrowthRateIsRealistic()
    {
        // Arrange
        var startDate = DateTime.UtcNow.AddMonths(-1);
        var endDate = DateTime.UtcNow;

        // Act
        var result = await _service.CalculateSubscriptionMetricsAsync(startDate, endDate, _testCorrelationId);

        // Assert - Growth rate should be reasonable (between -100% and 1000%)
        Assert.InRange(result.GrowthRate, -1, 10);
    }

    [Fact]
    public async Task CalculateSubscriptionMetricsAsync_TrialConversionRateWithinValidRange()
    {
        // Arrange
        var startDate = DateTime.UtcNow.AddMonths(-1);
        var endDate = DateTime.UtcNow;

        // Act
        var result = await _service.CalculateSubscriptionMetricsAsync(startDate, endDate, _testCorrelationId);

        // Assert - Trial conversion should be between 0 and 1
        Assert.InRange(result.TrialConversionRate, 0, 1);
    }

    [Fact]
    public async Task CalculateSubscriptionMetricsAsync_IncludesSubscriptionsByPlan()
    {
        // Arrange
        var startDate = DateTime.UtcNow.AddMonths(-1);
        var endDate = DateTime.UtcNow;

        // Act
        var result = await _service.CalculateSubscriptionMetricsAsync(startDate, endDate, _testCorrelationId);

        // Assert
        Assert.NotNull(result.SubscriptionsByPlan);
        Assert.NotEmpty(result.SubscriptionsByPlan);
        Assert.Contains("basic", result.SubscriptionsByPlan.Keys);
        Assert.Contains("premium", result.SubscriptionsByPlan.Keys);
        Assert.Contains("pro", result.SubscriptionsByPlan.Keys);
    }

    [Fact]
    public async Task CalculateSubscriptionMetricsAsync_SubscriptionTotalMatchesByPlan()
    {
        // Arrange
        var startDate = DateTime.UtcNow.AddMonths(-1);
        var endDate = DateTime.UtcNow;

        // Act
        var result = await _service.CalculateSubscriptionMetricsAsync(startDate, endDate, _testCorrelationId);

        // Assert - Sum of subscriptions by plan should equal total active subscribers
        var totalByPlan = result.SubscriptionsByPlan.Values.Sum();
        Assert.Equal(result.TotalActiveSubscribers, totalByPlan);
    }

    [Fact]
    public async Task CalculateSubscriptionMetricsAsync_IncludesSubscriptionsByInterval()
    {
        // Arrange
        var startDate = DateTime.UtcNow.AddMonths(-1);
        var endDate = DateTime.UtcNow;

        // Act
        var result = await _service.CalculateSubscriptionMetricsAsync(startDate, endDate, _testCorrelationId);

        // Assert
        Assert.NotNull(result.SubscriptionsByInterval);
        Assert.NotEmpty(result.SubscriptionsByInterval);
        Assert.Contains("monthly", result.SubscriptionsByInterval.Keys);
        Assert.Contains("annual", result.SubscriptionsByInterval.Keys);
    }

    [Fact]
    public async Task CalculateSubscriptionMetricsAsync_SubscriptionTotalMatchesByInterval()
    {
        // Arrange
        var startDate = DateTime.UtcNow.AddMonths(-1);
        var endDate = DateTime.UtcNow;

        // Act
        var result = await _service.CalculateSubscriptionMetricsAsync(startDate, endDate, _testCorrelationId);

        // Assert - Sum of subscriptions by interval should equal total active subscribers
        var totalByInterval = result.SubscriptionsByInterval.Values.Sum();
        Assert.Equal(result.TotalActiveSubscribers, totalByInterval);
    }

    [Fact]
    public async Task CalculateSubscriptionMetricsAsync_IncludesRevenueByPlan()
    {
        // Arrange
        var startDate = DateTime.UtcNow.AddMonths(-1);
        var endDate = DateTime.UtcNow;

        // Act
        var result = await _service.CalculateSubscriptionMetricsAsync(startDate, endDate, _testCorrelationId);

        // Assert
        Assert.NotNull(result.RevenueByPlan);
        Assert.NotEmpty(result.RevenueByPlan);
        Assert.Contains("basic", result.RevenueByPlan.Keys);
        Assert.Contains("premium", result.RevenueByPlan.Keys);
        Assert.Contains("pro", result.RevenueByPlan.Keys);
    }

    [Fact]
    public async Task CalculateSubscriptionMetricsAsync_RevenueTotalMatchesByPlan()
    {
        // Arrange
        var startDate = DateTime.UtcNow.AddMonths(-1);
        var endDate = DateTime.UtcNow;

        // Act
        var result = await _service.CalculateSubscriptionMetricsAsync(startDate, endDate, _testCorrelationId);

        // Assert - Sum of revenue by plan should approximately equal MRR
        var totalRevenueByPlan = result.RevenueByPlan.Values.Sum();
        Assert.Equal(result.MonthlyRecurringRevenue, totalRevenueByPlan);
    }

    [Fact]
    public async Task CalculateSubscriptionMetricsAsync_PaymentSuccessRateWithinValidRange()
    {
        // Arrange
        var startDate = DateTime.UtcNow.AddMonths(-1);
        var endDate = DateTime.UtcNow;

        // Act
        var result = await _service.CalculateSubscriptionMetricsAsync(startDate, endDate, _testCorrelationId);

        // Assert
        Assert.InRange(result.PaymentSuccessRate, 0, 1);
    }

    [Fact]
    public async Task CalculateSubscriptionMetricsAsync_GeneratedAtTimestampIsSet()
    {
        // Arrange
        var startDate = DateTime.UtcNow.AddMonths(-1);
        var endDate = DateTime.UtcNow;
        var before = DateTime.UtcNow.AddSeconds(-1);

        // Act
        var result = await _service.CalculateSubscriptionMetricsAsync(startDate, endDate, _testCorrelationId);

        // Assert
        Assert.InRange(result.GeneratedAt, before, DateTime.UtcNow.AddSeconds(1));
    }

    #endregion

    #region Real-Time Metrics Tests

    [Fact]
    public async Task GetRealTimeMetricsAsync_ReturnsAllRequiredMetrics()
    {
        // Act
        var result = await _service.GetRealTimeMetricsAsync(_testCorrelationId);

        // Assert
        Assert.NotNull(result);
        Assert.NotEmpty(result);
        Assert.Contains("current_mrr", result.Keys);
        Assert.Contains("active_subscribers", result.Keys);
        Assert.Contains("churn_rate", result.Keys);
        Assert.Contains("growth_rate", result.Keys);
        Assert.Contains("trial_conversion", result.Keys);
        Assert.Contains("payment_success_rate", result.Keys);
    }

    [Fact]
    public async Task GetRealTimeMetricsAsync_MRRIsPositive()
    {
        // Act
        var result = await _service.GetRealTimeMetricsAsync(_testCorrelationId);

        // Assert
        Assert.True(result["current_mrr"] > 0);
    }

    [Fact]
    public async Task GetRealTimeMetricsAsync_ActiveSubscribersIsPositive()
    {
        // Act
        var result = await _service.GetRealTimeMetricsAsync(_testCorrelationId);

        // Assert
        Assert.True(result["active_subscribers"] > 0);
    }

    [Fact]
    public async Task GetRealTimeMetricsAsync_ChurnRateIsValid()
    {
        // Act
        var result = await _service.GetRealTimeMetricsAsync(_testCorrelationId);

        // Assert
        Assert.InRange(result["churn_rate"], 0, 1);
    }

    [Fact]
    public async Task GetRealTimeMetricsAsync_PaymentSuccessRateIsValid()
    {
        // Act
        var result = await _service.GetRealTimeMetricsAsync(_testCorrelationId);

        // Assert
        Assert.InRange(result["payment_success_rate"], 0, 1);
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
    }

    [Fact]
    public async Task GenerateCohortAnalysisAsync_CohortHasValidStructure()
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
        var cohort = result.First();
        Assert.NotEqual(Guid.Empty, cohort.Id);
        Assert.True(cohort.InitialSubscribers > 0);
        Assert.NotNull(cohort.RetainedUsersByPeriod);
        Assert.NotNull(cohort.RetentionRatesByPeriod);
        Assert.NotEqual(default, cohort.GeneratedAt);
    }

    [Fact]
    public async Task GenerateCohortAnalysisAsync_RetentionRatesDecreaseOverTime()
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
        var cohort = result.First();
        var rates = cohort.RetentionRatesByPeriod.OrderBy(kvp => kvp.Key).Select(kvp => kvp.Value).ToList();

        // Period 0 should be 100%
        Assert.Equal(1.0, rates[0]);

        // Later periods should be <= previous periods
        for (int i = 1; i < rates.Count; i++)
        {
            Assert.True(rates[i] <= rates[i - 1], $"Retention rate at period {i} should be <= period {i-1}");
        }
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
                Assert.InRange(rate, 0, 1);
            }
        }
    }

    [Fact]
    public async Task GenerateCohortAnalysisAsync_RetainedUsersMatchRetentionRates()
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
        var cohort = result.First();
        foreach (var period in cohort.RetentionRatesByPeriod.Keys)
        {
            var expectedRetained = (long)(cohort.InitialSubscribers * cohort.RetentionRatesByPeriod[period]);
            Assert.Equal(expectedRetained, cohort.RetainedUsersByPeriod[period]);
        }
    }

    #endregion

    #region Retention Analysis Tests

    [Fact]
    public async Task AnalyzeRetentionPatternsAsync_ReturnsValidAnalysis()
    {
        // Arrange
        var startDate = DateTime.UtcNow.AddMonths(-1);
        var endDate = DateTime.UtcNow;

        // Act
        var result = await _service.AnalyzeRetentionPatternsAsync(startDate, endDate, _testCorrelationId);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.AnalysisPeriodDays > 0);
        Assert.InRange(result.OverallRetentionRate, 0, 1);
    }

    [Fact]
    public async Task AnalyzeRetentionPatternsAsync_CalculatesCorrectPeriodDays()
    {
        // Arrange
        var startDate = new DateTime(2025, 1, 1);
        var endDate = new DateTime(2025, 1, 31);
        var expectedDays = 30;

        // Act
        var result = await _service.AnalyzeRetentionPatternsAsync(startDate, endDate, _testCorrelationId);

        // Assert
        Assert.Equal(expectedDays, result.AnalysisPeriodDays);
    }

    [Fact]
    public async Task AnalyzeRetentionPatternsAsync_IncludesRetentionByPlan()
    {
        // Arrange
        var startDate = DateTime.UtcNow.AddMonths(-1);
        var endDate = DateTime.UtcNow;

        // Act
        var result = await _service.AnalyzeRetentionPatternsAsync(startDate, endDate, _testCorrelationId);

        // Assert
        Assert.NotNull(result.RetentionByPlan);
        Assert.NotEmpty(result.RetentionByPlan);
        Assert.Contains("basic", result.RetentionByPlan.Keys);
        Assert.Contains("premium", result.RetentionByPlan.Keys);
        Assert.Contains("pro", result.RetentionByPlan.Keys);
    }

    [Fact]
    public async Task AnalyzeRetentionPatternsAsync_AllRetentionRatesValid()
    {
        // Arrange
        var startDate = DateTime.UtcNow.AddMonths(-1);
        var endDate = DateTime.UtcNow;

        // Act
        var result = await _service.AnalyzeRetentionPatternsAsync(startDate, endDate, _testCorrelationId);

        // Assert
        foreach (var rate in result.RetentionByPlan.Values)
        {
            Assert.InRange(rate, 0, 1);
        }
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
    }

    [Fact]
    public async Task AnalyzePaymentPerformanceAsync_TransactionCountsAddUp()
    {
        // Arrange
        var startDate = DateTime.UtcNow.AddMonths(-1);
        var endDate = DateTime.UtcNow;

        // Act
        var result = await _service.AnalyzePaymentPerformanceAsync(startDate, endDate, _testCorrelationId);

        // Assert
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

        // Assert
        var expectedRate = (double)result.SuccessfulTransactions / result.TotalTransactions;
        Assert.Equal(expectedRate, result.SuccessRate, precision: 3);
    }

    [Fact]
    public async Task AnalyzePaymentPerformanceAsync_SuccessRateWithinValidRange()
    {
        // Arrange
        var startDate = DateTime.UtcNow.AddMonths(-1);
        var endDate = DateTime.UtcNow;

        // Act
        var result = await _service.AnalyzePaymentPerformanceAsync(startDate, endDate, _testCorrelationId);

        // Assert
        Assert.InRange(result.SuccessRate, 0, 1);
    }

    [Fact]
    public async Task AnalyzePaymentPerformanceAsync_VolumeConsistency()
    {
        // Arrange
        var startDate = DateTime.UtcNow.AddMonths(-1);
        var endDate = DateTime.UtcNow;

        // Act
        var result = await _service.AnalyzePaymentPerformanceAsync(startDate, endDate, _testCorrelationId);

        // Assert
        Assert.True(result.SuccessfulVolume <= result.TotalVolume);
        Assert.True(result.TotalVolume > 0);
    }

    #endregion

    #region Business Insights Tests

    [Fact]
    public async Task GenerateBusinessInsightsAsync_ReturnsInsights()
    {
        // Arrange
        var startDate = DateTime.UtcNow.AddMonths(-1);
        var endDate = DateTime.UtcNow;

        // Act
        var result = await _service.GenerateBusinessInsightsAsync(startDate, endDate, _testCorrelationId);

        // Assert
        Assert.NotNull(result);
        Assert.NotEmpty(result);
    }

    [Fact]
    public async Task GenerateBusinessInsightsAsync_InsightsHaveRequiredFields()
    {
        // Arrange
        var startDate = DateTime.UtcNow.AddMonths(-1);
        var endDate = DateTime.UtcNow;

        // Act
        var result = await _service.GenerateBusinessInsightsAsync(startDate, endDate, _testCorrelationId);

        // Assert
        var insight = result.First();
        Assert.NotNull(insight.Title);
        Assert.NotEmpty(insight.Title);
        Assert.NotNull(insight.Description);
        Assert.NotEmpty(insight.Description);
        Assert.NotNull(insight.ActionableRecommendations);
        Assert.NotEmpty(insight.ActionableRecommendations);
    }

    [Fact]
    public async Task GenerateBusinessInsightsAsync_InsightsHaveValidEnums()
    {
        // Arrange
        var startDate = DateTime.UtcNow.AddMonths(-1);
        var endDate = DateTime.UtcNow;

        // Act
        var result = await _service.GenerateBusinessInsightsAsync(startDate, endDate, _testCorrelationId);

        // Assert
        foreach (var insight in result)
        {
            Assert.True(Enum.IsDefined(typeof(BusinessInsightType), insight.Type));
            Assert.True(Enum.IsDefined(typeof(BusinessInsightPriority), insight.Priority));
            Assert.True(Enum.IsDefined(typeof(TrendDirection), insight.Trend));
        }
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
            UserId = _testUserId,
            SubscriptionId = _testSubscriptionId,
            Timestamp = DateTime.UtcNow
        };

        // Act
        await _service.TrackSubscriptionEventAsync(analyticsEvent, _testCorrelationId);

        // Assert
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
    public async Task TrackCustomerLifecycleEventAsync_LogsEventWithUserId()
    {
        // Arrange
        var eventType = "trial_started";
        var metadata = new Dictionary<string, object>
        {
            ["plan_id"] = "premium",
            ["source"] = "website"
        };

        // Act
        await _service.TrackCustomerLifecycleEventAsync(_testUserId, eventType, metadata, _testCorrelationId);

        // Assert
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) =>
                    v.ToString()!.Contains("Tracking customer lifecycle event") &&
                    v.ToString()!.Contains(_testUserId.ToString())),
                null,
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
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
