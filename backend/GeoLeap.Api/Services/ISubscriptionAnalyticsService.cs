using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

public interface ISubscriptionAnalyticsService
{
    // Core Analytics Methods
    Task<SubscriptionMetrics> CalculateSubscriptionMetricsAsync(DateTime periodStart, DateTime periodEnd, string correlationId);
    Task<SubscriptionAnalyticsSummary> GetDashboardSummaryAsync(string correlationId);
    Task<FinancialReportDto> GenerateFinancialReportAsync(DateTime periodStart, DateTime periodEnd, string correlationId);
    
    // Cohort Analysis
    Task<List<SubscriptionCohort>> GenerateCohortAnalysisAsync(CohortAnalysisRequest request, string correlationId);
    Task<RetentionAnalysis> AnalyzeRetentionPatternsAsync(DateTime periodStart, DateTime periodEnd, string correlationId);
    
    // Payment Analytics
    Task<PaymentPerformanceAnalytics> AnalyzePaymentPerformanceAsync(DateTime periodStart, DateTime periodEnd, string correlationId);
    Task<List<ChurnPattern>> IdentifyChurnPatternsAsync(DateTime periodStart, DateTime periodEnd, string correlationId);
    
    // Customer Lifecycle
    Task<List<CustomerLifecycleAnalytics>> GetCustomerLifecycleAnalyticsAsync(DateTime periodStart, DateTime periodEnd, string correlationId);
    Task<List<BusinessInsight>> GenerateBusinessInsightsAsync(DateTime periodStart, DateTime periodEnd, string correlationId);
    
    // Real-time Metrics
    Task<Dictionary<string, double>> GetRealTimeMetricsAsync(string correlationId);
    Task<List<SubscriptionTrendAlert>> GetActiveAlertsAsync(string correlationId);
    
    // Event Tracking
    Task TrackSubscriptionEventAsync(SubscriptionAnalyticsEvent analyticsEvent, string correlationId);
    Task TrackCustomerLifecycleEventAsync(Guid userId, string eventType, Dictionary<string, object> metadata, string correlationId);
    
    // Data Export and Reporting
    Task<Guid> RequestDataExportAsync(ExportRequest request, Guid requestedBy, string correlationId);
    Task<AnalyticsDataExport?> GetExportStatusAsync(Guid exportId, string correlationId);
    Task<Stream?> DownloadExportAsync(Guid exportId, Guid userId, string correlationId);
    
    // Automated Reporting
    Task<Guid> CreateReportScheduleAsync(ReportScheduleRequest request, Guid createdBy, string correlationId);
    Task<List<ReportSchedule>> GetReportSchedulesAsync(string correlationId);
    Task<bool> UpdateReportScheduleAsync(Guid scheduleId, ReportScheduleRequest request, Guid updatedBy, string correlationId);
    Task<bool> DeleteReportScheduleAsync(Guid scheduleId, Guid deletedBy, string correlationId);
    Task ExecuteScheduledReportsAsync(string correlationId);
    
    // Performance and Monitoring
    Task<Dictionary<string, object>> GetAnalyticsHealthStatusAsync(string correlationId);
    Task RefreshAnalyticsCacheAsync(string correlationId);
}