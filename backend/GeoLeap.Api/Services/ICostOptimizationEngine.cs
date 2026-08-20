using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

public interface ICostOptimizationEngine
{
    Task<List<CostOptimizationRecommendation>> GenerateRecommendationsAsync();
    Task<OptimizationImpactAnalysis> AnalyzeOptimizationImpactAsync(CostOptimizationRecommendation recommendation);
    Task MarkRecommendationAsImplementedAsync(Guid recommendationId);
}