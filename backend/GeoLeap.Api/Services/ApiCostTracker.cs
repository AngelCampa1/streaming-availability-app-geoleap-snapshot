using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

public class ApiCostTracker : IApiCostTracker
{
    private readonly ApplicationDbContext _context;
    private readonly IProviderCostCalculator _costCalculator;
    private readonly ICacheService _cacheService;
    private readonly IOptionsMonitor<CostManagementSettings> _settings;
    private readonly ILogger<ApiCostTracker> _logger;

    public ApiCostTracker(
        ApplicationDbContext context,
        IProviderCostCalculator costCalculator,
        ICacheService cacheService,
        IOptionsMonitor<CostManagementSettings> settings,
        ILogger<ApiCostTracker> logger)
    {
        _context = context;
        _costCalculator = costCalculator;
        _cacheService = cacheService;
        _settings = settings;
        _logger = logger;
    }

    public async Task TrackApiCallAsync(ApiCallCostInfo costInfo)
    {
        try
        {
            // Calculate actual cost based on provider pricing
            var actualCost = await _costCalculator.CalculateCostAsync(costInfo);
            
            var costRecord = new ApiCostRecord
            {
                Id = Guid.NewGuid(),
                ProviderId = costInfo.ProviderId,
                Endpoint = costInfo.Endpoint,
                Timestamp = costInfo.Timestamp,
                Success = costInfo.Success,
                ResponseTime = costInfo.ResponseTime,
                EstimatedCost = actualCost,
                RequestSize = costInfo.RequestSize,
                ResponseSize = costInfo.ResponseSize,
                UserId = costInfo.UserId,
                CorrelationId = costInfo.CorrelationId
            };

            await _context.ApiCostRecords.AddAsync(costRecord);
            await _context.SaveChangesAsync();

            // Update real-time cost cache
            var cacheKey = $"api-cost:daily:{DateTime.UtcNow:yyyy-MM-dd}";
            var dailyCost = await _cacheService.GetAsync<decimal?>(cacheKey) ?? 0m;
            await _cacheService.SetAsync(cacheKey, dailyCost + actualCost, TimeSpan.FromHours(25));

            // Track metrics
            await TrackCostMetricsAsync(costRecord);

            _logger.LogDebug("API cost tracked: {ProviderId} - {Endpoint} - ${Cost}",
                costInfo.ProviderId, costInfo.Endpoint, actualCost);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to track API cost for {ProviderId}", costInfo.ProviderId);
        }
    }

    public async Task<decimal> GetCurrentMonthCostAsync(string? providerId = null)
    {
        var startOfMonth = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
        var endOfMonth = startOfMonth.AddMonths(1).AddDays(-1);

        var query = _context.ApiCostRecords
            .Where(acr => acr.Timestamp >= startOfMonth && acr.Timestamp <= endOfMonth);

        if (!string.IsNullOrEmpty(providerId))
        {
            query = query.Where(acr => acr.ProviderId == providerId);
        }

        return await query.SumAsync(acr => acr.EstimatedCost);
    }

    public async Task<decimal> GetDailyCostAsync(DateTime date, string? providerId = null)
    {
        var startOfDay = date.Date;
        var endOfDay = startOfDay.AddDays(1).AddTicks(-1);

        var query = _context.ApiCostRecords
            .Where(acr => acr.Timestamp >= startOfDay && acr.Timestamp <= endOfDay);

        if (!string.IsNullOrEmpty(providerId))
        {
            query = query.Where(acr => acr.ProviderId == providerId);
        }

        return await query.SumAsync(acr => acr.EstimatedCost);
    }

    public async Task<List<CostBreakdown>> GetCostBreakdownAsync(TimeSpan period)
    {
        var endDate = DateTime.UtcNow;
        var startDate = endDate - period;

        var costsByProvider = await _context.ApiCostRecords
            .Where(acr => acr.Timestamp >= startDate && acr.Timestamp <= endDate)
            .GroupBy(acr => acr.ProviderId)
            .Select(g => new
            {
                ProviderId = g.Key,
                TotalCost = g.Sum(acr => acr.EstimatedCost),
                CallCount = g.Count()
            })
            .ToListAsync();

        var totalCost = costsByProvider.Sum(c => c.TotalCost);

        return costsByProvider.Select(c => new CostBreakdown
        {
            Category = c.ProviderId,
            Amount = c.TotalCost,
            Percentage = totalCost > 0 ? (c.TotalCost / totalCost) * 100 : 0,
            CallCount = c.CallCount,
            Period = period
        }).OrderByDescending(c => c.Amount).ToList();
    }

    public async Task<CostForecast> GenerateCostForecastAsync(int daysAhead = 30)
    {
        var historicalData = await GetDailyCostsAsync(
            DateTime.UtcNow.AddDays(-30), 
            DateTime.UtcNow
        );

        var forecast = new CostForecast
        {
            ForecastDate = DateTime.UtcNow,
            DaysAhead = daysAhead,
            DailyForecasts = new List<DailyCostForecast>()
        };

        if (!historicalData.Any())
        {
            // No historical data, return empty forecast
            return forecast;
        }

        // Simple linear trend forecast
        var avgDailyCost = historicalData.Average(d => d.TotalCost);
        var trend = CalculateTrend(historicalData);

        for (int i = 1; i <= daysAhead; i++)
        {
            var forecastDate = DateTime.UtcNow.AddDays(i);
            var forecastCost = avgDailyCost + (trend * i);

            forecast.DailyForecasts.Add(new DailyCostForecast
            {
                Date = forecastDate,
                PredictedCost = Math.Max(0, forecastCost),
                ConfidenceLevel = CalculateConfidence(i, historicalData.Count)
            });
        }

        forecast.TotalForecastCost = forecast.DailyForecasts.Sum(f => f.PredictedCost);
        
        return forecast;
    }

    public async Task<List<CostOptimizationRecommendation>> GetOptimizationRecommendationsAsync()
    {
        // This method delegates to the optimization engine
        var logger = new LoggerFactory().CreateLogger<CostOptimizationEngine>();
        var optimizationEngine = new CostOptimizationEngine(_context, _costCalculator, _cacheService, logger);
        return await optimizationEngine.GenerateRecommendationsAsync();
    }

    private async Task<List<DailyCostData>> GetDailyCostsAsync(DateTime startDate, DateTime endDate)
    {
        return await _context.ApiCostRecords
            .Where(acr => acr.Timestamp >= startDate && acr.Timestamp <= endDate)
            .GroupBy(acr => acr.Timestamp.Date)
            .Select(g => new DailyCostData
            {
                Date = g.Key,
                TotalCost = g.Sum(acr => acr.EstimatedCost),
                CallCount = g.Count()
            })
            .OrderBy(d => d.Date)
            .ToListAsync();
    }

    private decimal CalculateTrend(List<DailyCostData> historicalData)
    {
        if (historicalData.Count < 2) return 0;

        // Simple linear regression for trend
        var n = historicalData.Count;
        var sumX = historicalData.Select((_, i) => (decimal)i).Sum();
        var sumY = historicalData.Sum(d => d.TotalCost);
        var sumXY = historicalData.Select((d, i) => i * d.TotalCost).Sum();
        var sumX2 = historicalData.Select((_, i) => (decimal)(i * i)).Sum();

        if (n * sumX2 - sumX * sumX == 0)
            return 0;

        return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    }

    private double CalculateConfidence(int daysAhead, int historicalDataPoints)
    {
        // Confidence decreases with forecast distance and increases with more data
        var baseConfidence = Math.Min(95, 50 + historicalDataPoints * 2);
        var distancePenalty = daysAhead * 2;
        return Math.Max(30, baseConfidence - distancePenalty);
    }

    private async Task TrackCostMetricsAsync(ApiCostRecord costRecord)
    {
        // Update provider-specific cache
        if (!string.IsNullOrEmpty(costRecord.ProviderId))
        {
            var providerCacheKey = $"api-cost:daily:{DateTime.UtcNow:yyyy-MM-dd}:{costRecord.ProviderId}";
            var providerDailyCost = await _cacheService.GetAsync<decimal?>(providerCacheKey) ?? 0m;
            await _cacheService.SetAsync(providerCacheKey, providerDailyCost + costRecord.EstimatedCost, TimeSpan.FromHours(25));
        }

        // Track monthly totals
        var monthlyCacheKey = $"api-cost:monthly:{DateTime.UtcNow:yyyy-MM}";
        var monthlyTotal = await _cacheService.GetAsync<decimal?>(monthlyCacheKey) ?? 0m;
        await _cacheService.SetAsync(monthlyCacheKey, monthlyTotal + costRecord.EstimatedCost, TimeSpan.FromDays(35));
    }
}

public class CostManagementSettings
{
    public BudgetConfigurationSettings BudgetConfiguration { get; set; } = new();
    public CostTrackingSettings CostTracking { get; set; } = new();
    public OptimizationSettings Optimization { get; set; } = new();
}

public class BudgetConfigurationSettings
{
    public decimal MonthlyLimit { get; set; } = 500.00m;
    public decimal DailyLimit { get; set; } = 20.00m;
    public decimal[] AlertThresholds { get; set; } = { 80m, 90m, 95m };
    public Dictionary<string, decimal> ProviderLimits { get; set; } = new();
}

public class CostTrackingSettings
{
    public bool EnableDetailedTracking { get; set; } = true;
    public bool TrackUserAttribution { get; set; } = true;
    public int RetentionDays { get; set; } = 365;
}

public class OptimizationSettings
{
    public bool EnableAutomaticOptimization { get; set; } = false;
    public TimeSpan OptimizationCheckInterval { get; set; } = TimeSpan.FromHours(1);
    public decimal MinimumSavingsThreshold { get; set; } = 10.00m;
}