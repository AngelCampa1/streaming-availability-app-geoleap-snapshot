using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

public interface IBudgetManager
{
    Task<bool> CanMakeApiCallAsync(string providerId, decimal estimatedCost);
    Task<BudgetStatus> GetBudgetStatusAsync();
    Task<List<BudgetAlert>> CheckBudgetThresholdsAsync();
    Task SetBudgetLimitAsync(string category, decimal limit, BudgetPeriod period);
    Task<BudgetUtilization> GetBudgetUtilizationAsync(BudgetPeriod period);
}