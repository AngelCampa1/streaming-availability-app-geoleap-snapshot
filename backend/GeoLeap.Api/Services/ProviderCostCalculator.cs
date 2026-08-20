using Microsoft.EntityFrameworkCore;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

public class ProviderCostCalculator : IProviderCostCalculator
{
    private readonly ApplicationDbContext _context;
    private readonly Dictionary<string, ProviderPricing> _providerPricing;
    private readonly ILogger<ProviderCostCalculator> _logger;

    public ProviderCostCalculator(ApplicationDbContext context, ILogger<ProviderCostCalculator> logger)
    {
        _context = context;
        _logger = logger;
        _providerPricing = InitializeProviderPricing();
    }

    public async Task<decimal> CalculateCostAsync(ApiCallCostInfo costInfo)
    {
        if (!_providerPricing.TryGetValue(costInfo.ProviderId, out var pricing))
        {
            _logger.LogWarning("No pricing information available for provider {ProviderId}", costInfo.ProviderId);
            return 0;
        }

        var endpointPricing = pricing.EndpointPricing.GetValueOrDefault(costInfo.Endpoint, pricing.DefaultPricing);
        
        decimal cost = endpointPricing.PricingModel switch
        {
            PricingModel.PerCall => endpointPricing.BasePrice,
            PricingModel.PerKbResponse => endpointPricing.BasePrice * (costInfo.ResponseSize / 1024m),
            PricingModel.PerSuccessfulCall => costInfo.Success ? endpointPricing.BasePrice : 0,
            PricingModel.Tiered => await CalculateTieredCostAsync(endpointPricing, costInfo),
            _ => endpointPricing.BasePrice
        };

        // Apply success multiplier for failed calls if configured
        if (!costInfo.Success && endpointPricing.ChargeForFailures)
        {
            cost *= endpointPricing.FailureMultiplier;
        }

        return Math.Round(cost, 4);
    }

    public async Task<ProviderCostComparison> CompareProviderCostsAsync(string endpoint, TimeSpan period)
    {
        var endDate = DateTime.UtcNow;
        var startDate = endDate - period;
        
        var costData = await _context.ApiCostRecords
            .Where(acr => acr.Timestamp >= startDate && acr.Timestamp <= endDate)
            .Where(acr => string.IsNullOrEmpty(endpoint) || acr.Endpoint == endpoint)
            .GroupBy(acr => acr.ProviderId)
            .Select(g => new
            {
                ProviderId = g.Key,
                TotalCost = g.Sum(acr => acr.EstimatedCost),
                TotalCalls = g.Count(),
                SuccessfulCalls = g.Count(acr => acr.Success),
                AverageResponseTime = g.Average(acr => acr.ResponseTime)
            })
            .ToListAsync();
        
        var comparison = new ProviderCostComparison
        {
            Endpoint = endpoint,
            Period = period,
            ProviderComparisons = new List<ProviderCostData>()
        };

        foreach (var providerGroup in costData)
        {
            var avgCostPerCall = providerGroup.TotalCalls > 0 ? providerGroup.TotalCost / providerGroup.TotalCalls : 0;
            var costPerSuccessfulCall = providerGroup.SuccessfulCalls > 0 ? 
                providerGroup.TotalCost / providerGroup.SuccessfulCalls : 0;

            comparison.ProviderComparisons.Add(new ProviderCostData
            {
                ProviderId = providerGroup.ProviderId,
                TotalCost = providerGroup.TotalCost,
                TotalCalls = providerGroup.TotalCalls,
                SuccessfulCalls = providerGroup.SuccessfulCalls,
                AverageCostPerCall = avgCostPerCall,
                CostPerSuccessfulCall = costPerSuccessfulCall
            });
        }

        // Rank providers by cost efficiency (cost per successful call)
        comparison.ProviderComparisons = comparison.ProviderComparisons
            .OrderBy(p => p.CostPerSuccessfulCall)
            .ToList();

        return comparison;
    }

    public async Task UpdateProviderPricingAsync(string providerId, ProviderPricing pricing)
    {
        _providerPricing[providerId] = pricing;
        
        _logger.LogInformation("Updated pricing information for provider {ProviderId}", providerId);
        
        // In a production system, you might want to persist pricing changes to database
        // or configuration system for durability across restarts
        await Task.CompletedTask;
    }

    private async Task<decimal> CalculateTieredCostAsync(EndpointPricing pricing, ApiCallCostInfo costInfo)
    {
        // Get monthly call count for this provider and endpoint
        var monthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
        var monthlyCallCount = await _context.ApiCostRecords
            .Where(acr => acr.ProviderId == costInfo.ProviderId && 
                         acr.Endpoint == costInfo.Endpoint &&
                         acr.Timestamp >= monthStart)
            .CountAsync();
        
        // Find the appropriate tier based on monthly usage
        foreach (var tier in pricing.Tiers.OrderBy(t => t.Threshold))
        {
            if (monthlyCallCount <= tier.Threshold)
            {
                return tier.PricePerCall;
            }
        }

        // If all tiers exceeded, use the highest tier price
        return pricing.Tiers.LastOrDefault()?.PricePerCall ?? pricing.BasePrice;
    }

    private Dictionary<string, ProviderPricing> InitializeProviderPricing()
    {
        return new Dictionary<string, ProviderPricing>
        {
            ["streaming-availability"] = new ProviderPricing
            {
                ProviderId = "streaming-availability",
                DefaultPricing = new EndpointPricing
                {
                    PricingModel = PricingModel.PerCall,
                    BasePrice = 0.01m, // $0.01 per call
                    ChargeForFailures = false
                },
                EndpointPricing = new Dictionary<string, EndpointPricing>
                {
                    ["search"] = new EndpointPricing 
                    { 
                        PricingModel = PricingModel.PerCall, 
                        BasePrice = 0.015m,
                        ChargeForFailures = false
                    },
                    ["get-availability"] = new EndpointPricing 
                    { 
                        PricingModel = PricingModel.PerCall, 
                        BasePrice = 0.01m,
                        ChargeForFailures = false
                    },
                    ["get-details"] = new EndpointPricing 
                    { 
                        PricingModel = PricingModel.PerCall, 
                        BasePrice = 0.005m,
                        ChargeForFailures = false
                    }
                }
            },
            ["tmdb"] = new ProviderPricing
            {
                ProviderId = "tmdb",
                DefaultPricing = new EndpointPricing
                {
                    PricingModel = PricingModel.PerCall,
                    BasePrice = 0.002m, // $0.002 per call (free tier with rate limits)
                    ChargeForFailures = false
                },
                EndpointPricing = new Dictionary<string, EndpointPricing>
                {
                    ["search/movie"] = new EndpointPricing 
                    { 
                        PricingModel = PricingModel.PerCall, 
                        BasePrice = 0.002m,
                        ChargeForFailures = false
                    },
                    ["search/tv"] = new EndpointPricing 
                    { 
                        PricingModel = PricingModel.PerCall, 
                        BasePrice = 0.002m,
                        ChargeForFailures = false
                    },
                    ["movie/details"] = new EndpointPricing 
                    { 
                        PricingModel = PricingModel.PerCall, 
                        BasePrice = 0.001m,
                        ChargeForFailures = false
                    }
                }
            },
            ["omdb"] = new ProviderPricing
            {
                ProviderId = "omdb",
                DefaultPricing = new EndpointPricing
                {
                    PricingModel = PricingModel.Tiered,
                    BasePrice = 0.001m,
                    ChargeForFailures = false,
                    Tiers = new List<PricingTier>
                    {
                        new PricingTier { Threshold = 1000, PricePerCall = 0.001m },
                        new PricingTier { Threshold = 10000, PricePerCall = 0.0008m },
                        new PricingTier { Threshold = 100000, PricePerCall = 0.0005m }
                    }
                }
            },
            ["justwatch"] = new ProviderPricing
            {
                ProviderId = "justwatch",
                DefaultPricing = new EndpointPricing
                {
                    PricingModel = PricingModel.PerKbResponse,
                    BasePrice = 0.001m, // $0.001 per KB of response data
                    ChargeForFailures = true,
                    FailureMultiplier = 0.3m
                }
            },
            ["reelgood"] = new ProviderPricing
            {
                ProviderId = "reelgood",
                DefaultPricing = new EndpointPricing
                {
                    PricingModel = PricingModel.PerSuccessfulCall,
                    BasePrice = 0.008m, // Only charge for successful calls
                    ChargeForFailures = false
                }
            }
        };
    }
}