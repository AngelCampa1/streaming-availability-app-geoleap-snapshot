using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

public interface IApiUsageTracker
{
    Task TrackApiCallAsync(string endpoint, bool success, int responseTimeMs, decimal estimatedCost, string? correlationId = null, string? errorMessage = null, int httpStatusCode = 200);
    Task<ApiUsageStats> GetUsageStatsAsync();
    Task<bool> CanMakeApiCallAsync();
    Task<decimal> GetDailyCostAsync();
    Task<decimal> GetMonthlyCostAsync();
    Task<int> GetDailyCallCountAsync();
    Task<int> GetMonthlyCallCountAsync();
}

public interface IApiCostManager
{
    Task<bool> CanMakeApiCallAsync();
    Task<decimal> GetDailyCostAsync();
    Task<decimal> GetMonthlyCostAsync();
    Task CheckBudgetThresholdsAsync();
    Task<bool> IsWithinBudgetAsync(decimal additionalCost);
}

public interface IApiNotificationService
{
    Task SendBudgetAlertAsync(string message, Dictionary<string, object>? additionalData = null);
    Task SendApiErrorAlertAsync(string operation, string errorMessage, string? correlationId = null);
    Task SendPerformanceAlertAsync(string operation, int responseTimeMs, string? correlationId = null);
}