using Microsoft.EntityFrameworkCore;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using Microsoft.Extensions.Caching.Memory;

namespace GeoLeap.Api.Services;

/// <summary>
/// Implementation of business metrics service for comprehensive KPI tracking and analytics
/// </summary>
public class BusinessMetricsService : IBusinessMetricsService
{
    private readonly ApplicationDbContext _context;
    private readonly IMemoryCache _cache;
    private readonly ILogger<BusinessMetricsService> _logger;
    private readonly ISubscriptionAnalyticsService _subscriptionAnalytics;

    public BusinessMetricsService(
        ApplicationDbContext context,
        IMemoryCache cache,
        ILogger<BusinessMetricsService> logger,
        ISubscriptionAnalyticsService subscriptionAnalytics)
    {
        _context = context;
        _cache = cache;
        _logger = logger;
        _subscriptionAnalytics = subscriptionAnalytics;
    }

    public async Task<BusinessMetricsResponse> GetBusinessMetricsAsync(string correlationId)
    {
        _logger.LogInformation("Getting comprehensive business metrics with correlation ID: {CorrelationId}", correlationId);

        try
        {
            var cacheKey = $"business_metrics_{DateTime.UtcNow:yyyy-MM-dd-HH}";
            
            if (_cache.TryGetValue(cacheKey, out BusinessMetricsResponse? cachedMetrics))
            {
                return cachedMetrics!;
            }

            var kpis = await GetRealTimeKpisAsync(correlationId);
            var trends = await GetMetricTrendsAsync("all", DateTime.UtcNow.AddDays(-30), DateTime.UtcNow, "daily", correlationId);
            var alerts = await GetActiveAlertsAsync(correlationId);
            var realTimeMetrics = await GetRealTimeMetricsAsync(correlationId);

            var metrics = new BusinessMetricsResponse
            {
                Timestamp = DateTime.UtcNow,
                Kpis = kpis,
                Trends = trends,
                RealTimeMetrics = realTimeMetrics,
                Alerts = alerts
            };

            _cache.Set(cacheKey, metrics, TimeSpan.FromMinutes(30));
            return metrics;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get business metrics with correlation ID: {CorrelationId}", correlationId);
            throw;
        }
    }

    public async Task<BusinessKpis> GetRealTimeKpisAsync(string correlationId)
    {
        _logger.LogInformation("Getting real-time KPIs with correlation ID: {CorrelationId}", correlationId);

        try
        {
            var now = DateTime.UtcNow;
            var currentMonth = new DateTime(now.Year, now.Month, 1);

            // Get user metrics
            var totalUsers = await _context.Users.CountAsync();
            var activeUsers = await _context.Users
                .Where(u => u.LastLoginAt >= now.AddDays(-30))
                .CountAsync();
            
            var trialUsers = await _context.UserSubscriptions
                .Where(s => s.IsActive && s.SubscriptionType == "trial")
                .CountAsync();

            // Get revenue metrics from subscription analytics
            var subscriptionMetrics = await _subscriptionAnalytics
                .CalculateSubscriptionMetricsAsync(currentMonth, now, correlationId);

            // Get support metrics
            var supportTickets = await _context.SupportActions
                .Where(sa => sa.CreatedAt >= currentMonth)
                .CountAsync();

            // System uptime (mock - would integrate with monitoring service)
            var systemUptime = 99.9; // Would get from monitoring service

            var kpis = new BusinessKpis
            {
                TotalUsers = totalUsers,
                ActiveUsers = activeUsers,
                TrialUsers = trialUsers,
                MonthlyRecurringRevenue = subscriptionMetrics.MonthlyRecurringRevenue,
                AverageRevenuePerUser = subscriptionMetrics.AverageRevenuePerUser,
                ChurnRate = subscriptionMetrics.ChurnRate,
                ConversionRate = subscriptionMetrics.TrialConversionRate,
                CustomerSatisfactionScore = 4.5, // Would integrate with feedback system
                SupportTickets = supportTickets,
                SystemUptime = systemUptime
            };

            return kpis;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get real-time KPIs with correlation ID: {CorrelationId}", correlationId);
            throw;
        }
    }

    public async Task<List<MetricTrend>> GetMetricTrendsAsync(
        string metricName, 
        DateTime startDate, 
        DateTime endDate, 
        string granularity = "daily",
        string correlationId = "")
    {
        _logger.LogInformation("Getting metric trends for {MetricName} with granularity {Granularity} and correlation ID: {CorrelationId}",
            metricName, granularity, correlationId);

        try
        {
            var trends = new List<MetricTrend>();

            // Mock implementation - would query actual time-series data
            var userGrowthTrend = new MetricTrend
            {
                MetricName = "user_growth",
                Period = "30_days",
                CurrentValue = 2847,
                PreviousValue = 2703,
                ChangePercentage = 5.3,
                Direction = TrendDirection.Up,
                DataPoints = GenerateMockDataPoints(startDate, endDate, granularity, 2500, 2850)
            };

            var revenueTrend = new MetricTrend
            {
                MetricName = "monthly_revenue",
                Period = "30_days",
                CurrentValue = 89432.50,
                PreviousValue = 84230.20,
                ChangePercentage = 6.2,
                Direction = TrendDirection.Up,
                DataPoints = GenerateMockDataPoints(startDate, endDate, granularity, 80000, 90000)
            };

            trends.AddRange(new[] { userGrowthTrend, revenueTrend });

            return trends;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get metric trends with correlation ID: {CorrelationId}", correlationId);
            throw;
        }
    }

    public async Task<List<BusinessAlert>> GetActiveAlertsAsync(string correlationId)
    {
        _logger.LogInformation("Getting active business alerts with correlation ID: {CorrelationId}", correlationId);

        try
        {
            var alerts = await _context.BusinessAlerts
                .Where(ba => ba.IsActive && !ba.IsResolved)
                .OrderByDescending(ba => ba.CreatedAt)
                .Take(10)
                .ToListAsync();

            return alerts;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get active alerts with correlation ID: {CorrelationId}", correlationId);
            throw;
        }
    }

    public async Task<Dictionary<string, object>> GetUserGrowthAnalyticsAsync(
        DateTime startDate, 
        DateTime endDate, 
        string correlationId)
    {
        _logger.LogInformation("Getting user growth analytics with correlation ID: {CorrelationId}", correlationId);

        try
        {
            var totalUsers = await _context.Users
                .Where(u => u.CreatedAt >= startDate && u.CreatedAt <= endDate)
                .CountAsync();

            var newUsersByDay = await _context.Users
                .Where(u => u.CreatedAt >= startDate && u.CreatedAt <= endDate)
                .GroupBy(u => u.CreatedAt.Date)
                .Select(g => new { Date = g.Key, Count = g.Count() })
                .OrderBy(x => x.Date)
                .ToListAsync();

            var analytics = new Dictionary<string, object>
            {
                { "total_new_users", totalUsers },
                { "daily_signups", newUsersByDay },
                { "average_daily_signups", newUsersByDay.Any() ? newUsersByDay.Average(x => x.Count) : 0 },
                { "growth_trend", totalUsers > 0 ? "positive" : "neutral" }
            };

            return analytics;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get user growth analytics with correlation ID: {CorrelationId}", correlationId);
            throw;
        }
    }

    public async Task<Dictionary<string, object>> GetRevenueAnalyticsAsync(
        DateTime startDate, 
        DateTime endDate, 
        string correlationId)
    {
        _logger.LogInformation("Getting revenue analytics with correlation ID: {CorrelationId}", correlationId);

        try
        {
            var paymentTransactions = await _context.PaymentTransactions
                .Where(pt => pt.CreatedAt >= startDate && pt.CreatedAt <= endDate)
                .ToListAsync();

            var totalRevenue = paymentTransactions.Sum(pt => pt.Amount);
            var transactionCount = paymentTransactions.Count;
            var averageTransactionValue = transactionCount > 0 ? totalRevenue / transactionCount : 0;

            var revenueByDay = paymentTransactions.Where(pt => pt.Amount > 0)
                .GroupBy(pt => pt.CreatedAt.Date)
                .Select(g => new { Date = g.Key, Revenue = g.Sum(pt => pt.Amount), Count = g.Count() })
                .OrderBy(x => x.Date)
                .ToList();

            var analytics = new Dictionary<string, object>
            {
                { "total_revenue", totalRevenue },
                { "transaction_count", transactionCount },
                { "average_transaction_value", averageTransactionValue },
                { "daily_revenue", revenueByDay },
                { "revenue_trend", revenueByDay.Any() ? CalculateTrend(revenueByDay.Select(x => (double)x.Revenue)) : "neutral" }
            };

            return analytics;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get revenue analytics with correlation ID: {CorrelationId}", correlationId);
            throw;
        }
    }

    public async Task<Dictionary<string, object>> GetSubscriptionAnalyticsAsync(
        DateTime startDate, 
        DateTime endDate, 
        string correlationId)
    {
        _logger.LogInformation("Getting subscription analytics with correlation ID: {CorrelationId}", correlationId);

        try
        {
            var subscriptionMetrics = await _subscriptionAnalytics
                .CalculateSubscriptionMetricsAsync(startDate, endDate, correlationId);

            var analytics = new Dictionary<string, object>
            {
                { "mrr", subscriptionMetrics.MonthlyRecurringRevenue },
                { "arr", subscriptionMetrics.AnnualRecurringRevenue },
                { "active_subscribers", subscriptionMetrics.TotalActiveSubscribers },
                { "new_subscribers", subscriptionMetrics.NewSubscribers },
                { "churned_subscribers", subscriptionMetrics.ChurnedSubscribers },
                { "churn_rate", subscriptionMetrics.ChurnRate },
                { "growth_rate", subscriptionMetrics.GrowthRate },
                { "arpu", subscriptionMetrics.AverageRevenuePerUser },
                { "ltv", subscriptionMetrics.CustomerLifetimeValue }
            };

            return analytics;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get subscription analytics with correlation ID: {CorrelationId}", correlationId);
            throw;
        }
    }

    public async Task<Dictionary<string, object>> GetSupportMetricsAsync(
        DateTime startDate, 
        DateTime endDate, 
        string correlationId)
    {
        _logger.LogInformation("Getting support metrics with correlation ID: {CorrelationId}", correlationId);

        try
        {
            var supportActions = await _context.SupportActions
                .Where(sa => sa.CreatedAt >= startDate && sa.CreatedAt <= endDate)
                .ToListAsync();

            var totalTickets = supportActions.Count;
            var resolvedTickets = supportActions.Count(sa => sa.Status == SupportActionStatus.Completed);
            var completedActions = supportActions.Where(sa => sa.CompletedAt.HasValue).ToList();
            var avgResolutionTime = completedActions.Any()
                ? completedActions.Average(sa => (sa.CompletedAt!.Value - sa.CreatedAt).TotalHours)
                : 0.0;

            var ticketsByPriority = supportActions
                .GroupBy(sa => sa.Priority)
                .ToDictionary(g => g.Key.ToString(), g => g.Count());

            var ticketsByType = supportActions
                .GroupBy(sa => sa.ActionType)
                .ToDictionary(g => g.Key.ToString(), g => g.Count());

            var analytics = new Dictionary<string, object>
            {
                { "total_tickets", totalTickets },
                { "resolved_tickets", resolvedTickets },
                { "resolution_rate", totalTickets > 0 ? (double)resolvedTickets / totalTickets : 0 },
                { "avg_resolution_time_hours", avgResolutionTime },
                { "tickets_by_priority", ticketsByPriority },
                { "tickets_by_type", ticketsByType }
            };

            return analytics;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get support metrics with correlation ID: {CorrelationId}", correlationId);
            throw;
        }
    }

    public async Task<Dictionary<string, object>> GetSystemPerformanceMetricsAsync(string correlationId)
    {
        _logger.LogInformation("Getting system performance metrics with correlation ID: {CorrelationId}", correlationId);

        try
        {
            // Mock system metrics - would integrate with monitoring service
            var metrics = new Dictionary<string, object>
            {
                { "cpu_usage", 45.2 },
                { "memory_usage", 67.8 },
                { "disk_usage", 34.5 },
                { "active_connections", 1247 },
                { "requests_per_second", 156.7 },
                { "average_response_time", 234.5 },
                { "error_rate", 0.023 },
                { "uptime_percentage", 99.95 },
                { "database_connections", 45 },
                { "cache_hit_rate", 94.2 }
            };

            return await Task.FromResult(metrics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get system performance metrics with correlation ID: {CorrelationId}", correlationId);
            throw;
        }
    }

    public async Task<AdminAnalyticsResponse> GetCustomAnalyticsAsync(
        AdminAnalyticsRequest request, 
        string correlationId)
    {
        _logger.LogInformation("Getting custom analytics for {MetricType} with correlation ID: {CorrelationId}",
            request.MetricType, correlationId);

        try
        {
            var dataPoints = new List<AnalyticsDataPoint>();

            // Generate mock data points based on request
            var current = request.StartDate;
            var interval = request.Granularity switch
            {
                "hourly" => TimeSpan.FromHours(1),
                "daily" => TimeSpan.FromDays(1),
                "weekly" => TimeSpan.FromDays(7),
                "monthly" => TimeSpan.FromDays(30),
                _ => TimeSpan.FromDays(1)
            };

            while (current <= request.EndDate)
            {
                var dataPoint = new AnalyticsDataPoint
                {
                    Timestamp = current,
                    Metrics = new Dictionary<string, double>
                    {
                        { request.MetricType ?? "default", Random.Shared.NextDouble() * 1000 }
                    }
                };

                if (request.Dimensions != null)
                {
                    foreach (var dimension in request.Dimensions)
                    {
                        dataPoint.Dimensions[dimension] = $"value_{Random.Shared.Next(1, 10)}";
                    }
                }

                dataPoints.Add(dataPoint);
                current = current.Add(interval);
            }

            var response = new AdminAnalyticsResponse
            {
                MetricType = request.MetricType ?? "custom",
                StartDate = request.StartDate,
                EndDate = request.EndDate,
                Granularity = request.Granularity ?? "daily",
                Data = dataPoints,
                Summary = new Dictionary<string, object>
                {
                    { "total_data_points", dataPoints.Count },
                    { "average_value", dataPoints.Any() ? dataPoints.Average(dp => dp.Metrics.Values.FirstOrDefault()) : 0 },
                    { "max_value", dataPoints.Any() ? dataPoints.Max(dp => dp.Metrics.Values.FirstOrDefault()) : 0 },
                    { "min_value", dataPoints.Any() ? dataPoints.Min(dp => dp.Metrics.Values.FirstOrDefault()) : 0 }
                },
                Dimensions = request.Dimensions ?? new List<string>()
            };

            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get custom analytics with correlation ID: {CorrelationId}", correlationId);
            throw;
        }
    }

    public async Task TrackBusinessEventAsync(
        string eventType, 
        Dictionary<string, object> properties, 
        string correlationId)
    {
        _logger.LogInformation("Tracking business event {EventType} with correlation ID: {CorrelationId}",
            eventType, correlationId);

        try
        {
            // Would implement actual event tracking here
            // For now, just log the event
            _logger.LogInformation("Business event tracked: {EventType} with properties: {Properties}",
                eventType, properties);

            await Task.CompletedTask;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to track business event with correlation ID: {CorrelationId}", correlationId);
            throw;
        }
    }

    public async Task RefreshMetricsCacheAsync(string correlationId)
    {
        _logger.LogInformation("Refreshing metrics cache with correlation ID: {CorrelationId}", correlationId);

        try
        {
            // Clear relevant cache entries
            var cacheKeys = new[]
            {
                $"business_metrics_{DateTime.UtcNow:yyyy-MM-dd-HH}",
                "real_time_kpis",
                "active_alerts"
            };

            foreach (var key in cacheKeys)
            {
                _cache.Remove(key);
            }

            // Pre-warm cache with fresh data
            await GetBusinessMetricsAsync(correlationId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to refresh metrics cache with correlation ID: {CorrelationId}", correlationId);
            throw;
        }
    }

    private async Task<Dictionary<string, object>> GetRealTimeMetricsAsync(string correlationId)
    {
        // Mock real-time metrics - would integrate with real-time data sources
        var metrics = new Dictionary<string, object>
        {
            { "current_active_users", Random.Shared.Next(150, 300) },
            { "current_session_count", Random.Shared.Next(500, 1000) },
            { "requests_per_minute", Random.Shared.Next(1000, 5000) },
            { "error_count_last_hour", Random.Shared.Next(0, 10) },
            { "cache_hit_rate", 0.95 + Random.Shared.NextDouble() * 0.04 }
        };

        return await Task.FromResult(metrics);
    }

    private List<DataPoint> GenerateMockDataPoints(DateTime startDate, DateTime endDate, string granularity, double minValue, double maxValue)
    {
        var dataPoints = new List<DataPoint>();
        var current = startDate;
        var interval = granularity switch
        {
            "hourly" => TimeSpan.FromHours(1),
            "daily" => TimeSpan.FromDays(1),
            "weekly" => TimeSpan.FromDays(7),
            "monthly" => TimeSpan.FromDays(30),
            _ => TimeSpan.FromDays(1)
        };

        while (current <= endDate)
        {
            dataPoints.Add(new DataPoint
            {
                Timestamp = current,
                Value = minValue + Random.Shared.NextDouble() * (maxValue - minValue)
            });
            current = current.Add(interval);
        }

        return dataPoints;
    }

    private string CalculateTrend(IEnumerable<double> values)
    {
        var valueList = values.ToList();
        if (valueList.Count < 2) return "neutral";

        var first = valueList.Take(valueList.Count / 2).Average();
        var second = valueList.Skip(valueList.Count / 2).Average();

        return second > first * 1.05 ? "positive" : second < first * 0.95 ? "negative" : "neutral";
    }
}