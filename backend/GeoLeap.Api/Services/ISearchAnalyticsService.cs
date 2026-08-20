namespace GeoLeap.Api.Services;

using GeoLeap.Api.Models;

/// <summary>
/// Service interface for comprehensive search analytics and insights
/// </summary>
public interface ISearchAnalyticsService
{
    // Event Tracking
    Task TrackSearchEventAsync(SearchAnalyticsEvent analyticsEvent, CancellationToken cancellationToken = default);
    Task TrackSearchStartAsync(string query, GlobalSearchRequest request, string sessionId, Guid? userId, string correlationId, CancellationToken cancellationToken = default);
    Task TrackSearchCompletedAsync(string query, GlobalSearchResponse response, string sessionId, Guid? userId, string correlationId, CancellationToken cancellationToken = default);
    Task TrackSearchClickAsync(string query, string contentId, int position, string sessionId, Guid? userId, string correlationId, CancellationToken cancellationToken = default);
    Task TrackSearchAbandonedAsync(string query, string sessionId, Guid? userId, string correlationId, CancellationToken cancellationToken = default);

    // Journey Tracking
    Task StartSearchJourneyAsync(string sessionId, Guid? userId, string correlationId, CancellationToken cancellationToken = default);
    Task AddJourneyStepAsync(string sessionId, string action, Dictionary<string, object>? metadata = null, CancellationToken cancellationToken = default);
    Task CompleteSearchJourneyAsync(string sessionId, SearchOutcome outcome, bool converted = false, CancellationToken cancellationToken = default);

    // Performance Analytics
    Task<Models.SearchPerformanceMetrics> GetPerformanceMetricsAsync(DateTime from, DateTime to, CancellationToken cancellationToken = default);
    Task<Dictionary<string, double>> GetRealTimeMetricsAsync(CancellationToken cancellationToken = default);
    Task<List<SearchPerformanceAlert>> GetActivePerformanceAlertsAsync(CancellationToken cancellationToken = default);

    // User Behavior Analytics
    Task<UserBehaviorAnalytics> GetUserBehaviorAnalyticsAsync(DateTime from, DateTime to, CancellationToken cancellationToken = default);
    Task<List<UserSegment>> GetUserSegmentsAsync(CancellationToken cancellationToken = default);
    Task<List<SearchPattern>> GetCommonSearchPatternsAsync(int top = 10, CancellationToken cancellationToken = default);

    // Business Intelligence
    Task<BusinessIntelligenceMetrics> GetBusinessIntelligenceAsync(DateTime from, DateTime to, CancellationToken cancellationToken = default);
    Task<List<Models.PopularQuery>> GetTrendingQueriesAsync(int top = 20, CancellationToken cancellationToken = default);
    Task<List<PopularSearchContent>> GetTrendingContentAsync(int top = 20, CancellationToken cancellationToken = default);
    Task<List<ContentGap>> GetContentGapsAsync(CancellationToken cancellationToken = default);
    Task<Dictionary<string, GeographicInsight>> GetGeographicInsightsAsync(DateTime from, DateTime to, CancellationToken cancellationToken = default);
    Task<RevenueImpactAnalysis> GetRevenueImpactAnalysisAsync(DateTime from, DateTime to, CancellationToken cancellationToken = default);

    // Dashboard and Reporting
    Task<AnalyticsDashboardSummary> GetDashboardSummaryAsync(CancellationToken cancellationToken = default);
    Task<List<InsightCard>> GetTopInsightsAsync(int count = 5, CancellationToken cancellationToken = default);

    // A/B Testing Support
    Task<ABTestPerformance> GetABTestPerformanceAsync(string testId, string? variantId = null, CancellationToken cancellationToken = default);
    Task TrackABTestInteractionAsync(string testId, string variantId, string interaction, Guid? userId, Dictionary<string, object>? metadata = null, CancellationToken cancellationToken = default);

    // Search Quality Analytics
    Task<SearchQualityMetrics> GetSearchQualityMetricsAsync(DateTime from, DateTime to, CancellationToken cancellationToken = default);
    Task<List<QualityIssue>> GetSearchQualityIssuesAsync(CancellationToken cancellationToken = default);

    // Export and Integration
    Task<byte[]> ExportAnalyticsDataAsync(DateTime from, DateTime to, string format = "csv", CancellationToken cancellationToken = default);
    Task<bool> ScheduleAnalyticsReportAsync(string reportName, string[] recipients, string frequency, Dictionary<string, object>? parameters = null, CancellationToken cancellationToken = default);

    // Data Management
    Task ProcessRealTimeEventsAsync(CancellationToken cancellationToken = default);
    Task AggregateHourlyDataAsync(DateTime hour, CancellationToken cancellationToken = default);
    Task AggregateDailyDataAsync(DateTime date, CancellationToken cancellationToken = default);
    Task ArchiveOldDataAsync(TimeSpan retentionPeriod, CancellationToken cancellationToken = default);

    // Privacy and Compliance
    Task AnonymizeUserDataAsync(Guid userId, CancellationToken cancellationToken = default);
    Task DeleteUserAnalyticsDataAsync(Guid userId, CancellationToken cancellationToken = default);
    Task<Dictionary<string, object>> GetUserAnalyticsDataAsync(Guid userId, CancellationToken cancellationToken = default);

    // Alert Management
    Task<List<SearchPerformanceAlert>> CheckPerformanceThresholdsAsync(CancellationToken cancellationToken = default);
    Task<List<BusinessAlert>> CheckBusinessThresholdsAsync(CancellationToken cancellationToken = default);
    Task AcknowledgeAlertAsync(Guid alertId, Guid acknowledgedBy, CancellationToken cancellationToken = default);
    Task ResolveAlertAsync(Guid alertId, Guid resolvedBy, string resolution, CancellationToken cancellationToken = default);

    // Additional methods for SEO integration
    Task<Dictionary<string, int>> GetTopSearchTermsAsync(DateTime from, DateTime to, int count = 10, CancellationToken cancellationToken = default);
    Task<ContentPerformanceData> GetContentPerformanceAsync(Guid contentId, DateTime from, DateTime to, CancellationToken cancellationToken = default);
}