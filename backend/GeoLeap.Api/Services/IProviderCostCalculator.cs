using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

public interface IProviderCostCalculator
{
    Task<decimal> CalculateCostAsync(ApiCallCostInfo costInfo);
    Task<ProviderCostComparison> CompareProviderCostsAsync(string endpoint, TimeSpan period);
    Task UpdateProviderPricingAsync(string providerId, ProviderPricing pricing);
}