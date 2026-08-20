# User Story US-3.6: API Cost Management & Monitoring

**Epic:** Data Integration & API Setup  
**Priority:** P1 (Should-Have)  
**Story Points:** 3  
**Sprint:** 7  

## User Story
**As a** product owner  
**I need** comprehensive API cost tracking and budget management  
**So that** I can control external API expenses, optimize usage patterns, and prevent budget overruns while maintaining service quality

## Acceptance Criteria
- [ ] Real-time tracking of API costs across all providers with per-call cost calculation
- [ ] Configurable budget limits with automatic enforcement and alerts
- [ ] Cost optimization recommendations based on usage patterns
- [ ] Detailed cost analytics and forecasting for budget planning
- [ ] Automatic API throttling when approaching budget limits
- [ ] Provider cost comparison and optimization suggestions
- [ ] Monthly cost reports with breakdown by feature and user segment
- [ ] Integration with Azure Cost Management for infrastructure costs

## Definition of Done
- [ ] All API calls are tracked with accurate cost calculations
- [ ] Budget alerts trigger at 80%, 90%, and 95% thresholds
- [ ] API throttling activates before budget limits are exceeded
- [ ] Cost analytics dashboard provides actionable insights
- [ ] Monthly cost reports are generated automatically
- [ ] Provider cost comparison identifies optimization opportunities
- [ ] Budget forecasting accuracy within 10% variance
- [ ] System stays within $500/month total API budget

## Implementation Tasks

### Backend Implementation
- [ ] Create API cost tracking and calculation service
- [ ] Implement budget management and enforcement system
- [ ] Build cost analytics and reporting engine
- [ ] Add API throttling based on budget constraints
- [ ] Create cost optimization recommendation engine
- [ ] Implement provider cost comparison analytics
- [ ] Build automated budget alert system
- [ ] Add integration with Azure Cost Management
- [ ] Create cost forecasting algorithms
- [ ] Build comprehensive cost monitoring dashboard

### API Cost Tracking Service
```csharp
public interface IApiCostTracker
{
    Task TrackApiCallAsync(ApiCallCostInfo costInfo);
    Task<decimal> GetCurrentMonthCostAsync(string providerId = null);
    Task<decimal> GetDailyCostAsync(DateTime date, string providerId = null);
    Task<List<CostBreakdown>> GetCostBreakdownAsync(TimeSpan period);
    Task<CostForecast> GenerateCostForecastAsync(int daysAhead = 30);
    Task<List<CostOptimizationRecommendation>> GetOptimizationRecommendationsAsync();
}

public class ApiCostTracker : IApiCostTracker
{
    private readonly ICostRepository _costRepository;
    private readonly IProviderCostCalculator _costCalculator;
    private readonly ICacheService _cacheService;
    private readonly IOptionsMonitor<CostManagementSettings> _settings;
    private readonly ILogger<ApiCostTracker> _logger;

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

            await _costRepository.SaveCostRecordAsync(costRecord);

            // Update real-time cost cache
            var cacheKey = $"api-cost:daily:{DateTime.UtcNow:yyyy-MM-dd}";
            var dailyCost = await _cacheService.GetAsync<decimal>(cacheKey) ?? 0;
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

    public async Task<decimal> GetCurrentMonthCostAsync(string providerId = null)
    {
        var startOfMonth = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
        var endOfMonth = startOfMonth.AddMonths(1).AddDays(-1);

        return await _costRepository.GetTotalCostAsync(startOfMonth, endOfMonth, providerId);
    }

    public async Task<CostForecast> GenerateCostForecastAsync(int daysAhead = 30)
    {
        var historicalData = await _costRepository.GetDailyCostsAsync(
            DateTime.UtcNow.AddDays(-30), 
            DateTime.UtcNow
        );

        var forecast = new CostForecast
        {
            ForecastDate = DateTime.UtcNow,
            DaysAhead = daysAhead,
            DailyForecasts = new List<DailyCostForecast>()
        };

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

    private decimal CalculateTrend(List<DailyCostData> historicalData)
    {
        if (historicalData.Count < 2) return 0;

        // Simple linear regression for trend
        var n = historicalData.Count;
        var sumX = historicalData.Select((_, i) => i).Sum();
        var sumY = historicalData.Sum(d => d.TotalCost);
        var sumXY = historicalData.Select((d, i) => i * d.TotalCost).Sum();
        var sumX2 = historicalData.Select((_, i) => i * i).Sum();

        return (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    }

    private double CalculateConfidence(int daysAhead, int historicalDataPoints)
    {
        // Confidence decreases with forecast distance and increases with more data
        var baseConfidence = Math.Min(95, 50 + historicalDataPoints * 2);
        var distancePenalty = daysAhead * 2;
        return Math.Max(30, baseConfidence - distancePenalty);
    }
}

public class ApiCallCostInfo
{
    public string ProviderId { get; set; }
    public string Endpoint { get; set; }
    public DateTime Timestamp { get; set; }
    public bool Success { get; set; }
    public int ResponseTime { get; set; }
    public int RequestSize { get; set; }
    public int ResponseSize { get; set; }
    public string UserId { get; set; }
    public string CorrelationId { get; set; }
}

public class ApiCostRecord
{
    public Guid Id { get; set; }
    public string ProviderId { get; set; }
    public string Endpoint { get; set; }
    public DateTime Timestamp { get; set; }
    public bool Success { get; set; }
    public int ResponseTime { get; set; }
    public decimal EstimatedCost { get; set; }
    public int RequestSize { get; set; }
    public int ResponseSize { get; set; }
    public string UserId { get; set; }
    public string CorrelationId { get; set; }
}
```

### Budget Management System
```csharp
public interface IBudgetManager
{
    Task<bool> CanMakeApiCallAsync(string providerId, decimal estimatedCost);
    Task<BudgetStatus> GetBudgetStatusAsync();
    Task<List<BudgetAlert>> CheckBudgetThresholdsAsync();
    Task SetBudgetLimitAsync(string category, decimal limit, BudgetPeriod period);
    Task<BudgetUtilization> GetBudgetUtilizationAsync(BudgetPeriod period);
}

public class BudgetManager : IBudgetManager
{
    private readonly IApiCostTracker _costTracker;
    private readonly IAlertingService _alertingService;
    private readonly IOptionsMonitor<BudgetConfiguration> _budgetConfig;
    private readonly ILogger<BudgetManager> _logger;

    public async Task<bool> CanMakeApiCallAsync(string providerId, decimal estimatedCost)
    {
        var currentCosts = await _costTracker.GetCurrentMonthCostAsync();
        var dailyCosts = await _costTracker.GetDailyCostAsync(DateTime.UtcNow);
        
        var monthlyLimit = _budgetConfig.CurrentValue.MonthlyLimit;
        var dailyLimit = _budgetConfig.CurrentValue.DailyLimit;
        var providerLimit = _budgetConfig.CurrentValue.ProviderLimits?.GetValueOrDefault(providerId);

        // Check monthly limit
        if (currentCosts + estimatedCost > monthlyLimit)
        {
            _logger.LogWarning("API call blocked: Monthly budget limit would be exceeded. Current: ${Current}, Limit: ${Limit}",
                currentCosts, monthlyLimit);
            return false;
        }

        // Check daily limit
        if (dailyCosts + estimatedCost > dailyLimit)
        {
            _logger.LogWarning("API call blocked: Daily budget limit would be exceeded. Current: ${Current}, Limit: ${Limit}",
                dailyCosts, dailyLimit);
            return false;
        }

        // Check provider-specific limit
        if (providerLimit.HasValue)
        {
            var providerCosts = await _costTracker.GetCurrentMonthCostAsync(providerId);
            if (providerCosts + estimatedCost > providerLimit)
            {
                _logger.LogWarning("API call blocked: Provider budget limit would be exceeded. Provider: {ProviderId}, Current: ${Current}, Limit: ${Limit}",
                    providerId, providerCosts, providerLimit);
                return false;
            }
        }

        return true;
    }

    public async Task<List<BudgetAlert>> CheckBudgetThresholdsAsync()
    {
        var alerts = new List<BudgetAlert>();
        var currentCosts = await _costTracker.GetCurrentMonthCostAsync();
        var monthlyLimit = _budgetConfig.CurrentValue.MonthlyLimit;

        var utilizationPercentage = (currentCosts / monthlyLimit) * 100;
        var thresholds = _budgetConfig.CurrentValue.AlertThresholds ?? new[] { 80m, 90m, 95m };

        foreach (var threshold in thresholds)
        {
            if (utilizationPercentage >= threshold && !await WasAlertSentAsync(threshold))
            {
                var alert = new BudgetAlert
                {
                    Type = BudgetAlertType.ThresholdExceeded,
                    Threshold = threshold,
                    CurrentUtilization = utilizationPercentage,
                    CurrentCost = currentCosts,
                    BudgetLimit = monthlyLimit,
                    Timestamp = DateTime.UtcNow
                };

                alerts.Add(alert);
                await _alertingService.SendBudgetAlertAsync(alert);
                await MarkAlertAsSentAsync(threshold);

                _logger.LogWarning("Budget threshold alert: {Threshold}% exceeded. Current: ${Current} ({Percentage}%)",
                    threshold, currentCosts, utilizationPercentage);
            }
        }

        return alerts;
    }

    private async Task<bool> WasAlertSentAsync(decimal threshold)
    {
        var cacheKey = $"budget-alert:{DateTime.UtcNow:yyyy-MM}:{threshold}";
        return await _cacheService.ExistsAsync(cacheKey);
    }

    private async Task MarkAlertAsSentAsync(decimal threshold)
    {
        var cacheKey = $"budget-alert:{DateTime.UtcNow:yyyy-MM}:{threshold}";
        await _cacheService.SetAsync(cacheKey, true, TimeSpan.FromDays(31));
    }
}

public class BudgetStatus
{
    public decimal MonthlyBudget { get; set; }
    public decimal MonthlySpent { get; set; }
    public decimal MonthlyRemaining { get; set; }
    public decimal DailyBudget { get; set; }
    public decimal DailySpent { get; set; }
    public decimal UtilizationPercentage { get; set; }
    public List<ProviderBudgetStatus> ProviderStatuses { get; set; } = new();
    public int DaysRemainingInMonth { get; set; }
    public decimal ProjectedMonthlySpend { get; set; }
}

public class BudgetAlert
{
    public BudgetAlertType Type { get; set; }
    public decimal Threshold { get; set; }
    public decimal CurrentUtilization { get; set; }
    public decimal CurrentCost { get; set; }
    public decimal BudgetLimit { get; set; }
    public DateTime Timestamp { get; set; }
    public string ProviderId { get; set; }
}

public enum BudgetAlertType
{
    ThresholdExceeded,
    DailyLimitApproaching,
    ProviderLimitExceeded,
    ForecastOverrun
}
```

### Provider Cost Calculator
```csharp
public interface IProviderCostCalculator
{
    Task<decimal> CalculateCostAsync(ApiCallCostInfo costInfo);
    Task<ProviderCostComparison> CompareProviderCostsAsync(string endpoint, TimeSpan period);
    Task UpdateProviderPricingAsync(string providerId, ProviderPricing pricing);
}

public class ProviderCostCalculator : IProviderCostCalculator
{
    private readonly Dictionary<string, ProviderPricing> _providerPricing;
    private readonly ILogger<ProviderCostCalculator> _logger;

    public ProviderCostCalculator()
    {
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
            PricingModel.Tiered => CalculateTieredCost(endpointPricing, costInfo),
            _ => endpointPricing.BasePrice
        };

        // Apply success multiplier
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
        
        var costData = await _costRepository.GetCostsByProviderAsync(startDate, endDate, endpoint);
        
        var comparison = new ProviderCostComparison
        {
            Endpoint = endpoint,
            Period = period,
            ProviderComparisons = new List<ProviderCostData>()
        };

        foreach (var providerGroup in costData.GroupBy(c => c.ProviderId))
        {
            var providerCosts = providerGroup.ToList();
            
            comparison.ProviderComparisons.Add(new ProviderCostData
            {
                ProviderId = providerGroup.Key,
                TotalCost = providerCosts.Sum(c => c.EstimatedCost),
                TotalCalls = providerCosts.Count,
                SuccessfulCalls = providerCosts.Count(c => c.Success),
                AverageCostPerCall = providerCosts.Average(c => c.EstimatedCost),
                CostPerSuccessfulCall = providerCosts.Where(c => c.Success).Any() 
                    ? providerCosts.Where(c => c.Success).Average(c => c.EstimatedCost) 
                    : 0
            });
        }

        // Rank providers by cost efficiency
        comparison.ProviderComparisons = comparison.ProviderComparisons
            .OrderBy(p => p.CostPerSuccessfulCall)
            .ToList();

        return comparison;
    }

    private decimal CalculateTieredCost(EndpointPricing pricing, ApiCallCostInfo costInfo)
    {
        // Implement tiered pricing logic based on monthly usage
        var monthlyCallCount = GetMonthlyCallCount(costInfo.ProviderId, costInfo.Endpoint);
        
        foreach (var tier in pricing.Tiers.OrderBy(t => t.Threshold))
        {
            if (monthlyCallCount <= tier.Threshold)
            {
                return tier.PricePerCall;
            }
        }

        return pricing.Tiers.Last().PricePerCall;
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
                    ["search"] = new EndpointPricing { PricingModel = PricingModel.PerCall, BasePrice = 0.015m },
                    ["get-availability"] = new EndpointPricing { PricingModel = PricingModel.PerCall, BasePrice = 0.01m }
                }
            },
            ["tmdb"] = new ProviderPricing
            {
                ProviderId = "tmdb",
                DefaultPricing = new EndpointPricing
                {
                    PricingModel = PricingModel.PerCall,
                    BasePrice = 0.005m, // $0.005 per call (free tier assumed)
                    ChargeForFailures = false
                }
            }
        };
    }
}

public class ProviderPricing
{
    public string ProviderId { get; set; }
    public EndpointPricing DefaultPricing { get; set; }
    public Dictionary<string, EndpointPricing> EndpointPricing { get; set; } = new();
}

public class EndpointPricing
{
    public PricingModel PricingModel { get; set; }
    public decimal BasePrice { get; set; }
    public bool ChargeForFailures { get; set; }
    public decimal FailureMultiplier { get; set; } = 0.5m;
    public List<PricingTier> Tiers { get; set; } = new();
}

public enum PricingModel
{
    PerCall,
    PerKbResponse,
    PerSuccessfulCall,
    Tiered
}
```

### Cost Optimization Engine
```csharp
public interface ICostOptimizationEngine
{
    Task<List<CostOptimizationRecommendation>> GenerateRecommendationsAsync();
    Task<OptimizationImpactAnalysis> AnalyzeOptimizationImpactAsync(CostOptimizationRecommendation recommendation);
}

public class CostOptimizationEngine : ICostOptimizationEngine
{
    private readonly IApiCostTracker _costTracker;
    private readonly IProviderCostCalculator _costCalculator;
    private readonly ICacheService _cacheService;

    public async Task<List<CostOptimizationRecommendation>> GenerateRecommendationsAsync()
    {
        var recommendations = new List<CostOptimizationRecommendation>();

        // Analyze cache hit rates
        await AnalyzeCacheOptimizationAsync(recommendations);
        
        // Analyze provider cost efficiency
        await AnalyzeProviderOptimizationAsync(recommendations);
        
        // Analyze usage patterns
        await AnalyzeUsagePatternOptimizationAsync(recommendations);
        
        // Analyze redundant calls
        await AnalyzeRedundancyOptimizationAsync(recommendations);

        return recommendations.OrderByDescending(r => r.EstimatedMonthlySavings).ToList();
    }

    private async Task AnalyzeCacheOptimizationAsync(List<CostOptimizationRecommendation> recommendations)
    {
        var cacheStats = await _cacheService.GetStatsAsync();
        
        if (cacheStats.HitRatio < 0.75) // Less than 75% hit ratio
        {
            var potentialSavings = await CalculateCacheSavingsAsync(cacheStats);
            
            recommendations.Add(new CostOptimizationRecommendation
            {
                Type = OptimizationType.CacheOptimization,
                Title = "Improve Cache Hit Ratio",
                Description = $"Current cache hit ratio is {cacheStats.HitRatio:P}. Optimizing cache TTL and warming strategies could reduce API calls.",
                EstimatedMonthlySavings = potentialSavings,
                ImplementationEffort = ImplementationEffort.Medium,
                Actions = new List<string>
                {
                    "Increase cache TTL for stable content",
                    "Implement proactive cache warming",
                    "Add more aggressive caching for popular content"
                }
            });
        }
    }

    private async Task AnalyzeProviderOptimizationAsync(List<CostOptimizationRecommendation> recommendations)
    {
        var providerComparison = await _costCalculator.CompareProviderCostsAsync("search", TimeSpan.FromDays(30));
        
        if (providerComparison.ProviderComparisons.Count > 1)
        {
            var mostExpensive = providerComparison.ProviderComparisons.Last();
            var leastExpensive = providerComparison.ProviderComparisons.First();
            
            if (mostExpensive.CostPerSuccessfulCall > leastExpensive.CostPerSuccessfulCall * 1.5m)
            {
                var potentialSavings = (mostExpensive.CostPerSuccessfulCall - leastExpensive.CostPerSuccessfulCall) 
                    * mostExpensive.TotalCalls;
                
                recommendations.Add(new CostOptimizationRecommendation
                {
                    Type = OptimizationType.ProviderOptimization,
                    Title = "Switch to More Cost-Effective Provider",
                    Description = $"Provider {mostExpensive.ProviderId} costs ${mostExpensive.CostPerSuccessfulCall:F4} per call vs ${leastExpensive.CostPerSuccessfulCall:F4} for {leastExpensive.ProviderId}",
                    EstimatedMonthlySavings = potentialSavings,
                    ImplementationEffort = ImplementationEffort.Low,
                    Actions = new List<string>
                    {
                        $"Configure {leastExpensive.ProviderId} as primary provider for search operations",
                        "Monitor quality to ensure no degradation"
                    }
                });
            }
        }
    }
}

public class CostOptimizationRecommendation
{
    public OptimizationType Type { get; set; }
    public string Title { get; set; }
    public string Description { get; set; }
    public decimal EstimatedMonthlySavings { get; set; }
    public ImplementationEffort ImplementationEffort { get; set; }
    public List<string> Actions { get; set; } = new();
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
}

public enum OptimizationType
{
    CacheOptimization,
    ProviderOptimization,
    UsagePatternOptimization,
    RedundancyReduction
}

public enum ImplementationEffort
{
    Low,
    Medium,
    High
}
```

### Configuration
```json
{
  "CostManagementSettings": {
    "BudgetConfiguration": {
      "MonthlyLimit": 500.00,
      "DailyLimit": 20.00,
      "AlertThresholds": [80, 90, 95],
      "ProviderLimits": {
        "streaming-availability": 300.00,
        "tmdb": 100.00
      }
    },
    "CostTracking": {
      "EnableDetailedTracking": true,
      "TrackUserAttribution": true,
      "RetentionDays": 365
    },
    "Optimization": {
      "EnableAutomaticOptimization": false,
      "OptimizationCheckInterval": "01:00:00",
      "MinimumSavingsThreshold": 10.00
    }
  }
}
```

## Testing Strategy
- [ ] Unit tests for cost calculation algorithms
- [ ] Integration tests with budget enforcement
- [ ] Load tests for cost tracking performance
- [ ] Budget threshold alert tests
- [ ] Provider cost comparison accuracy tests
- [ ] Optimization recommendation tests
- [ ] Forecasting accuracy validation tests

## Dependencies
- API Abstraction Layer (US-3.4) for cost tracking integration
- Data Caching Layer (US-3.3) for optimization recommendations
- Logging infrastructure (US-1.3) for audit trails
- Alerting system for budget notifications
- Azure Cost Management for infrastructure cost integration

## Success Metrics
- **Budget accuracy:** Track costs within 5% of actual provider charges
- **Budget compliance:** 100% prevention of budget overruns
- **Cost optimization:** > 20% reduction in API costs through optimizations
- **Alert responsiveness:** Budget alerts sent within 1 minute of threshold breach
- **Forecast accuracy:** Monthly cost predictions within 10% variance
- **Provider cost comparison:** Identify savings opportunities > $50/month

## Monitoring and Alerting
- Real-time cost tracking dashboards
- Budget utilization and remaining budget displays
- Provider cost comparison charts
- Monthly cost trend analysis
- Optimization opportunity alerts
- Integration with Azure Cost Management dashboards