using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

public interface IApiCostTracker
{
    Task TrackApiCallAsync(ApiCallCostInfo costInfo);
    Task<decimal> GetCurrentMonthCostAsync(string? providerId = null);
    Task<decimal> GetDailyCostAsync(DateTime date, string? providerId = null);
    Task<List<CostBreakdown>> GetCostBreakdownAsync(TimeSpan period);
    Task<CostForecast> GenerateCostForecastAsync(int daysAhead = 30);
    Task<List<CostOptimizationRecommendation>> GetOptimizationRecommendationsAsync();
}