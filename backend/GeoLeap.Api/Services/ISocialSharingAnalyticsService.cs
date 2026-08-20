using GeoLeap.Api.Models;
using static GeoLeap.Api.Models.SocialSharingAnalyticsDto;
using static GeoLeap.Api.Models.SocialSharingAnalyticsRequest;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service interface for social sharing analytics and viral growth tracking
/// </summary>
public interface ISocialSharingAnalyticsService
{
    /// <summary>
    /// Track a social sharing event
    /// </summary>
    Task<Guid> TrackShareEventAsync(Guid userId, TrackShareEventRequest request, string ipAddress, string correlationId);
    
    /// <summary>
    /// Track a click on a shared link
    /// </summary>
    Task<Guid> TrackClickEventAsync(TrackClickEventRequest request, string ipAddress, string correlationId);
    
    /// <summary>
    /// Update click event with conversion information
    /// </summary>
    Task UpdateClickEventConversionAsync(Guid clickEventId, bool resultedInRegistration, bool resultedInSubscription, string correlationId);
    
    /// <summary>
    /// Get viral metrics for a specific time period
    /// </summary>
    Task<List<ViralMetricsDto>> GetViralMetricsAsync(AnalyticsFilterRequest filter, string correlationId);
    
    /// <summary>
    /// Get real-time viral coefficient and growth metrics
    /// </summary>
    Task<Dictionary<string, decimal>> GetRealTimeViralMetricsAsync(string correlationId);
    
    /// <summary>
    /// Get content performance analytics
    /// </summary>
    Task<List<ContentPerformanceDto>> GetContentPerformanceAsync(AnalyticsFilterRequest filter, string correlationId);
    
    /// <summary>
    /// Get platform-specific sharing performance
    /// </summary>
    Task<Dictionary<string, object>> GetPlatformPerformanceAsync(AnalyticsFilterRequest filter, string correlationId);
    
    /// <summary>
    /// Get conversion funnel analytics from share to subscription
    /// </summary>
    Task<Dictionary<string, object>> GetConversionFunnelAsync(AnalyticsFilterRequest filter, string correlationId);
    
    /// <summary>
    /// Get cohort analysis for users acquired through social sharing
    /// </summary>
    Task<List<Dictionary<string, object>>> GetSharingCohortAnalysisAsync(AnalyticsFilterRequest filter, string correlationId);
    
    /// <summary>
    /// Get A/B test results for share button optimization
    /// </summary>
    Task<List<AbTestResultDto>> GetAbTestResultsAsync(Guid? testId, string correlationId);
    
    /// <summary>
    /// Create new A/B test for share button optimization
    /// </summary>
    Task<Guid> CreateAbTestAsync(string testName, string variantName, string description, string configurationJson, double trafficPercentage, Guid createdBy, string correlationId);
    
    /// <summary>
    /// Assign user to A/B test variant
    /// </summary>
    Task<string> AssignUserToAbTestAsync(Guid userId, Guid testId, string correlationId);
    
    /// <summary>
    /// Get user's A/B test assignment
    /// </summary>
    Task<string?> GetUserAbTestAssignmentAsync(Guid userId, string testName, string correlationId);
    
    /// <summary>
    /// Calculate viral coefficient for a specific time period
    /// </summary>
    Task<decimal> CalculateViralCoefficientAsync(DateTime startDate, DateTime endDate, string? platform, string correlationId);
    
    /// <summary>
    /// Get sharing velocity trends
    /// </summary>
    Task<List<Dictionary<string, object>>> GetSharingVelocityTrendsAsync(AnalyticsFilterRequest filter, string correlationId);
    
    /// <summary>
    /// Get geographic distribution of shares
    /// </summary>
    Task<Dictionary<string, object>> GetGeographicSharingDistributionAsync(AnalyticsFilterRequest filter, string correlationId);
    
    /// <summary>
    /// Get device type sharing patterns
    /// </summary>
    Task<Dictionary<string, object>> GetDeviceSharingPatternsAsync(AnalyticsFilterRequest filter, string correlationId);
    
    /// <summary>
    /// Generate aggregated viral metrics for reporting
    /// </summary>
    Task GenerateAggregatedMetricsAsync(DateTime date, string correlationId);
    
    /// <summary>
    /// Get share completion rates by platform and method
    /// </summary>
    Task<Dictionary<string, object>> GetShareCompletionRatesAsync(AnalyticsFilterRequest filter, string correlationId);
    
    /// <summary>
    /// Get ROI analysis for social sharing initiatives
    /// </summary>
    Task<Dictionary<string, object>> GetSharingROIAnalysisAsync(AnalyticsFilterRequest filter, string correlationId);
    
    /// <summary>
    /// Get trending shared content
    /// </summary>
    Task<List<ContentPerformanceDto>> GetTrendingSharedContentAsync(int limit, string correlationId);
    
    /// <summary>
    /// Get user sharing behavior patterns
    /// </summary>
    Task<Dictionary<string, object>> GetUserSharingPatternsAsync(Guid? userId, AnalyticsFilterRequest filter, string correlationId);
    
    /// <summary>
    /// Get share error analysis and troubleshooting data
    /// </summary>
    Task<Dictionary<string, object>> GetShareErrorAnalysisAsync(AnalyticsFilterRequest filter, string correlationId);
    
    /// <summary>
    /// Export social sharing analytics data
    /// </summary>
    Task<Stream> ExportAnalyticsDataAsync(AnalyticsFilterRequest filter, string format, string correlationId);
    
    /// <summary>
    /// Get analytics health status
    /// </summary>
    Task<Dictionary<string, object>> GetAnalyticsHealthAsync(string correlationId);
    
    /// <summary>
    /// Refresh analytics cache and aggregations
    /// </summary>
    Task RefreshAnalyticsCacheAsync(string correlationId);
}