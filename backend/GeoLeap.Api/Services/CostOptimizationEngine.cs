using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

public class CostOptimizationEngine : ICostOptimizationEngine
{
    private readonly ApplicationDbContext _context;
    private readonly IProviderCostCalculator _costCalculator;
    private readonly ICacheService _cacheService;
    private readonly ILogger<CostOptimizationEngine> _logger;

    public CostOptimizationEngine(
        ApplicationDbContext context,
        IProviderCostCalculator costCalculator,
        ICacheService cacheService,
        ILogger<CostOptimizationEngine> logger)
    {
        _context = context;
        _costCalculator = costCalculator;
        _cacheService = cacheService;
        _logger = logger;
    }

    public async Task<List<CostOptimizationRecommendation>> GenerateRecommendationsAsync()
    {
        var recommendations = new List<CostOptimizationRecommendation>();

        try
        {
            // Analyze cache hit rates
            await AnalyzeCacheOptimizationAsync(recommendations);
            
            // Analyze provider cost efficiency
            await AnalyzeProviderOptimizationAsync(recommendations);
            
            // Analyze usage patterns
            await AnalyzeUsagePatternOptimizationAsync(recommendations);
            
            // Analyze redundant calls
            await AnalyzeRedundancyOptimizationAsync(recommendations);

            // Save recommendations to database
            foreach (var recommendation in recommendations)
            {
                recommendation.Actions = JsonSerializer.Serialize(GetActionsList(recommendation));
                await _context.CostOptimizationRecommendations.AddAsync(recommendation);
            }
            
            await _context.SaveChangesAsync();

            _logger.LogInformation("Generated {Count} cost optimization recommendations", recommendations.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate cost optimization recommendations");
        }

        return recommendations.OrderByDescending(r => r.EstimatedMonthlySavings).ToList();
    }

    public async Task<OptimizationImpactAnalysis> AnalyzeOptimizationImpactAsync(CostOptimizationRecommendation recommendation)
    {
        var analysis = new OptimizationImpactAnalysis
        {
            Recommendation = recommendation,
            ProjectedSavings = recommendation.EstimatedMonthlySavings,
            ImplementationCost = CalculateImplementationCost(recommendation),
            RisksAndChallenges = GetRisksAndChallenges(recommendation),
            ConfidenceScore = CalculateConfidenceScore(recommendation)
        };

        analysis.PaybackPeriodDays = analysis.ProjectedSavings > 0 
            ? (int)(analysis.ImplementationCost / (analysis.ProjectedSavings / 30))
            : int.MaxValue;

        return analysis;
    }

    public async Task MarkRecommendationAsImplementedAsync(Guid recommendationId)
    {
        var recommendation = await _context.CostOptimizationRecommendations
            .FirstOrDefaultAsync(r => r.Id == recommendationId);

        if (recommendation != null)
        {
            recommendation.IsImplemented = true;
            recommendation.ImplementedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            _logger.LogInformation("Marked optimization recommendation {Id} as implemented", recommendationId);
        }
    }

    private async Task AnalyzeCacheOptimizationAsync(List<CostOptimizationRecommendation> recommendations)
    {
        try
        {
            var cacheStats = await GetCacheStatsAsync();
            
            if (cacheStats.HitRatio < 0.75) // Less than 75% hit ratio
            {
                var potentialSavings = await CalculateCacheSavingsAsync(cacheStats);
                
                recommendations.Add(new CostOptimizationRecommendation
                {
                    Id = Guid.NewGuid(),
                    Type = OptimizationType.CacheOptimization,
                    Title = "Improve Cache Hit Ratio",
                    Description = $"Current cache hit ratio is {cacheStats.HitRatio:P}. Optimizing cache TTL and warming strategies could reduce API calls by up to 25%.",
                    EstimatedMonthlySavings = potentialSavings,
                    ImplementationEffort = ImplementationEffort.Medium
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to analyze cache optimization opportunities");
        }
    }

    private async Task AnalyzeProviderOptimizationAsync(List<CostOptimizationRecommendation> recommendations)
    {
        try
        {
            var providerComparison = await _costCalculator.CompareProviderCostsAsync("", TimeSpan.FromDays(30));
            
            if (providerComparison.ProviderComparisons.Count > 1)
            {
                var mostExpensive = providerComparison.ProviderComparisons.LastOrDefault();
                var leastExpensive = providerComparison.ProviderComparisons.FirstOrDefault();
                
                if (mostExpensive != null && leastExpensive != null && 
                    mostExpensive.CostPerSuccessfulCall > leastExpensive.CostPerSuccessfulCall * 1.5m)
                {
                    var potentialSavings = (mostExpensive.CostPerSuccessfulCall - leastExpensive.CostPerSuccessfulCall) 
                        * mostExpensive.TotalCalls;
                    
                    recommendations.Add(new CostOptimizationRecommendation
                    {
                        Id = Guid.NewGuid(),
                        Type = OptimizationType.ProviderOptimization,
                        Title = "Switch to More Cost-Effective Provider",
                        Description = $"Provider {mostExpensive.ProviderId} costs ${mostExpensive.CostPerSuccessfulCall:F4} per call vs ${leastExpensive.CostPerSuccessfulCall:F4} for {leastExpensive.ProviderId}. Switching could save ${potentialSavings:F2} monthly.",
                        EstimatedMonthlySavings = potentialSavings,
                        ImplementationEffort = ImplementationEffort.Low
                    });
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to analyze provider optimization opportunities");
        }
    }

    private async Task AnalyzeUsagePatternOptimizationAsync(List<CostOptimizationRecommendation> recommendations)
    {
        try
        {
            // Analyze peak usage patterns
            var thirtyDaysAgo = DateTime.UtcNow.AddDays(-30);
            var hourlyUsage = await _context.ApiCostRecords
                .Where(acr => acr.Timestamp >= thirtyDaysAgo)
                .GroupBy(acr => acr.Timestamp.Hour)
                .Select(g => new
                {
                    Hour = g.Key,
                    TotalCost = g.Sum(acr => acr.EstimatedCost),
                    CallCount = g.Count()
                })
                .OrderByDescending(h => h.TotalCost)
                .ToListAsync();

            if (hourlyUsage.Any())
            {
                var peakHours = hourlyUsage.Take(3).ToList();
                var avgCostPerHour = hourlyUsage.Average(h => h.TotalCost);
                var peakCost = peakHours.Sum(h => h.TotalCost);

                if (peakCost > avgCostPerHour * hourlyUsage.Count * 0.4m) // Peak hours represent >40% of total cost
                {
                    var potentialSavings = peakCost * 0.15m; // Assume 15% savings through load balancing

                    recommendations.Add(new CostOptimizationRecommendation
                    {
                        Id = Guid.NewGuid(),
                        Type = OptimizationType.UsagePatternOptimization,
                        Title = "Optimize Peak Hour API Usage",
                        Description = $"Peak usage hours ({string.Join(", ", peakHours.Select(h => $"{h.Hour}:00"))}) account for 40%+ of API costs. Implementing request queuing and load balancing could reduce costs during peak periods.",
                        EstimatedMonthlySavings = potentialSavings,
                        ImplementationEffort = ImplementationEffort.High
                    });
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to analyze usage pattern optimization opportunities");
        }
    }

    private async Task AnalyzeRedundancyOptimizationAsync(List<CostOptimizationRecommendation> recommendations)
    {
        try
        {
            // Look for duplicate API calls within short time windows
            var oneDayAgo = DateTime.UtcNow.AddDays(-1);
            var duplicateCalls = await _context.ApiCostRecords
                .Where(acr => acr.Timestamp >= oneDayAgo)
                .GroupBy(acr => new { acr.Endpoint, acr.UserId })
                .Where(g => g.Count() > 5) // More than 5 identical calls
                .Select(g => new
                {
                    g.Key.Endpoint,
                    g.Key.UserId,
                    Count = g.Count(),
                    TotalCost = g.Sum(acr => acr.EstimatedCost),
                    TimeSpan = g.Max(acr => acr.Timestamp) - g.Min(acr => acr.Timestamp)
                })
                .Where(r => r.TimeSpan < TimeSpan.FromMinutes(10)) // Within 10 minutes
                .ToListAsync();

            if (duplicateCalls.Any())
            {
                var redundantCost = duplicateCalls.Sum(dc => dc.TotalCost * 0.8m); // Assume 80% could be eliminated
                var monthlySavings = redundantCost * 30; // Extrapolate to monthly

                if (monthlySavings > 5m) // Only recommend if savings > $5/month
                {
                    recommendations.Add(new CostOptimizationRecommendation
                    {
                        Id = Guid.NewGuid(),
                        Type = OptimizationType.RedundancyReduction,
                        Title = "Eliminate Redundant API Calls",
                        Description = $"Detected {duplicateCalls.Count} patterns of redundant API calls within short time windows. Implementing request deduplication could eliminate up to 80% of these redundant calls.",
                        EstimatedMonthlySavings = monthlySavings,
                        ImplementationEffort = ImplementationEffort.Medium
                    });
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to analyze redundancy optimization opportunities");
        }
    }

    private async Task<CacheStats> GetCacheStatsAsync()
    {
        // Try to get actual cache stats from the cache service
        try
        {
            var hits = await _cacheService.GetAsync<long?>("cache:stats:hits") ?? 0L;
            var misses = await _cacheService.GetAsync<long?>("cache:stats:misses") ?? 0L;
            var total = hits + misses;

            return new CacheStats
            {
                TotalHits = hits,
                TotalMisses = misses,
                HitRatio = total > 0 ? (double)hits / total : 0,
                LastUpdated = DateTime.UtcNow
            };
        }
        catch
        {
            // Fallback to estimated cache stats based on API usage
            return await EstimateCacheStatsAsync();
        }
    }

    private async Task<CacheStats> EstimateCacheStatsAsync()
    {
        var oneDayAgo = DateTime.UtcNow.AddDays(-1);
        var totalCalls = await _context.ApiCostRecords.CountAsync(acr => acr.Timestamp >= oneDayAgo);
        
        // Estimate cache hit ratio based on successful calls (simplified assumption)
        var successfulCalls = await _context.ApiCostRecords
            .CountAsync(acr => acr.Timestamp >= oneDayAgo && acr.Success);

        var estimatedHitRatio = totalCalls > 0 ? 0.6 : 0; // Assume 60% hit ratio as baseline
        var estimatedHits = (long)(totalCalls * estimatedHitRatio);
        var estimatedMisses = totalCalls - estimatedHits;

        return new CacheStats
        {
            TotalHits = estimatedHits,
            TotalMisses = estimatedMisses,
            HitRatio = estimatedHitRatio,
            LastUpdated = DateTime.UtcNow
        };
    }

    private async Task<decimal> CalculateCacheSavingsAsync(CacheStats cacheStats)
    {
        // Estimate potential savings from improving cache hit ratio
        var currentMisses = cacheStats.TotalMisses;
        var improvementPotential = Math.Max(0, 0.9 - cacheStats.HitRatio); // Up to 90% hit ratio
        var potentiallyAvoidableCalls = (long)(currentMisses * improvementPotential);

        // Get average cost per API call
        var thirtyDaysAgo = DateTime.UtcNow.AddDays(-30);
        var avgCostPerCall = await _context.ApiCostRecords
            .Where(acr => acr.Timestamp >= thirtyDaysAgo)
            .AverageAsync(acr => (decimal?)acr.EstimatedCost) ?? 0m;

        return potentiallyAvoidableCalls * avgCostPerCall * 30; // Monthly savings
    }

    private decimal CalculateImplementationCost(CostOptimizationRecommendation recommendation)
    {
        return recommendation.ImplementationEffort switch
        {
            ImplementationEffort.Low => 50m, // $50 in development time
            ImplementationEffort.Medium => 200m, // $200 in development time
            ImplementationEffort.High => 500m, // $500 in development time
            _ => 100m
        };
    }

    private List<string> GetRisksAndChallenges(CostOptimizationRecommendation recommendation)
    {
        return recommendation.Type switch
        {
            OptimizationType.CacheOptimization => new List<string>
            {
                "May increase memory usage",
                "Cache invalidation complexity",
                "Potential for stale data if TTL too long"
            },
            OptimizationType.ProviderOptimization => new List<string>
            {
                "Provider reliability differences",
                "API compatibility issues",
                "Data quality variations",
                "Migration effort and testing required"
            },
            OptimizationType.UsagePatternOptimization => new List<string>
            {
                "Complex implementation",
                "User experience impact during peak hours",
                "Queue management complexity"
            },
            OptimizationType.RedundancyReduction => new List<string>
            {
                "Risk of eliminating legitimate duplicate requests",
                "Complex request deduplication logic",
                "Potential user experience degradation"
            },
            _ => new List<string> { "Unknown risks" }
        };
    }

    private double CalculateConfidenceScore(CostOptimizationRecommendation recommendation)
    {
        // Base confidence on recommendation type and estimated savings
        var baseConfidence = recommendation.Type switch
        {
            OptimizationType.CacheOptimization => 0.8,
            OptimizationType.ProviderOptimization => 0.9,
            OptimizationType.UsagePatternOptimization => 0.6,
            OptimizationType.RedundancyReduction => 0.7,
            _ => 0.5
        };

        // Adjust based on savings amount (higher savings = higher confidence in ROI)
        var savingsConfidence = Math.Min(1.0, (double)recommendation.EstimatedMonthlySavings / 100.0);
        
        return Math.Min(1.0, (baseConfidence + savingsConfidence) / 2.0);
    }

    private List<string> GetActionsList(CostOptimizationRecommendation recommendation)
    {
        return recommendation.Type switch
        {
            OptimizationType.CacheOptimization => new List<string>
            {
                "Increase cache TTL for stable content",
                "Implement proactive cache warming",
                "Add more aggressive caching for popular content",
                "Review and optimize cache eviction policies"
            },
            OptimizationType.ProviderOptimization => new List<string>
            {
                "Configure most cost-effective provider as primary",
                "Implement provider failover for reliability",
                "Monitor quality metrics to ensure no degradation",
                "Update provider routing configuration"
            },
            OptimizationType.UsagePatternOptimization => new List<string>
            {
                "Implement request queuing during peak hours",
                "Add load balancing and rate limiting",
                "Consider batch processing for non-urgent requests",
                "Optimize API call timing and scheduling"
            },
            OptimizationType.RedundancyReduction => new List<string>
            {
                "Implement request deduplication logic",
                "Add short-term result caching",
                "Review and optimize API call patterns",
                "Implement request coalescing where appropriate"
            },
            _ => new List<string> { "Review and implement recommendation" }
        };
    }
}