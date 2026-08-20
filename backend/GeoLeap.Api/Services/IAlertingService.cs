using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;


// Extension methods for IAlertingService to add budget and cost optimization alerts
public static class AlertingServiceExtensions
{
    public static async Task SendBudgetAlertAsync(this IAlertingService alertingService, BudgetAlert alert)
    {
        var message = $"Budget Alert: {alert.Type} - {alert.Threshold}% threshold exceeded. Current utilization: {alert.CurrentUtilization:F1}%";
        var severity = alert.CurrentUtilization > 95 ? AlertSeverity.Critical : 
                      alert.CurrentUtilization > 90 ? AlertSeverity.High : AlertSeverity.Medium;
        
        var qualityAlert = new QualityAlert
        {
            DataType = "BudgetThreshold",
            Description = message,
            Severity = severity,
            Timestamp = DateTime.UtcNow,
            AverageQuality = (double)(100 - alert.CurrentUtilization),
            Threshold = (double)alert.Threshold,
            SampleSize = 1,
            Metadata = new Dictionary<string, object>
            {
                ["BudgetAlertType"] = alert.Type.ToString(),
                ["Threshold"] = alert.Threshold,
                ["CurrentUtilization"] = alert.CurrentUtilization,
                ["CurrentCost"] = alert.CurrentCost,
                ["BudgetLimit"] = alert.BudgetLimit,
                ["ProviderId"] = alert.ProviderId ?? "All"
            }
        };
        
        await alertingService.SendQualityAlertAsync(qualityAlert);
    }

    public static async Task SendCostOptimizationAlertAsync(this IAlertingService alertingService, CostOptimizationRecommendation recommendation)
    {
        var message = $"Cost Optimization Opportunity: {recommendation.Title} - Potential savings: ${recommendation.EstimatedMonthlySavings:F2}/month";
        
        var qualityAlert = new QualityAlert
        {
            DataType = "CostOptimization",
            Description = message,
            Severity = AlertSeverity.Low,
            Timestamp = DateTime.UtcNow,
            AverageQuality = (double)recommendation.EstimatedMonthlySavings,
            Threshold = 10.0,
            SampleSize = 1,
            Metadata = new Dictionary<string, object>
            {
                ["RecommendationType"] = recommendation.Type.ToString(),
                ["EstimatedSavings"] = recommendation.EstimatedMonthlySavings,
                ["ImplementationEffort"] = recommendation.ImplementationEffort.ToString(),
                ["Description"] = recommendation.Description
            }
        };
        
        await alertingService.SendQualityAlertAsync(qualityAlert);
    }
}