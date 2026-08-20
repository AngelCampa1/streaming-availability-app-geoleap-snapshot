namespace GeoLeap.Api.Models;

/// <summary>
/// Main response model for business analytics dashboard
/// </summary>
public class BusinessAnalyticsDashboardResponse
{
    public AnalyticsTimeFrame TimeFrame { get; set; } = new();
    public UserMetrics UserMetrics { get; set; } = new();
    public ContentPerformanceMetrics ContentMetrics { get; set; } = new();
    public SystemHealthMetrics SystemHealth { get; set; } = new();
    public FinancialMetrics FinancialMetrics { get; set; } = new();
    public EngagementMetrics EngagementMetrics { get; set; } = new();
    public ConversionFunnelData ConversionFunnel { get; set; } = new();
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Time frame for analytics queries
/// </summary>
public class AnalyticsTimeFrame
{
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string Period => (EndDate - StartDate).Days switch
    {
        1 => "Daily",
        <= 7 => "Weekly",
        <= 31 => "Monthly",
        <= 93 => "Quarterly",
        _ => "Custom"
    };
}

/// <summary>
/// User analytics and growth metrics
/// </summary>
public class UserMetrics
{
    public int TotalUsers { get; set; }
    public int NewUsers { get; set; }
    public int ActiveUsers { get; set; }
    public int TrialUsers { get; set; }
    public int PaidUsers { get; set; }
    public double UserRetentionRate { get; set; }
    public double TrialConversionRate { get; set; }
    public double UserGrowthRate => TotalUsers > 0 && NewUsers > 0 ? (double)NewUsers / TotalUsers * 100 : 0;
}

/// <summary>
/// Content performance and utilization metrics
/// </summary>
public class ContentPerformanceMetrics
{
    public int TotalContentItems { get; set; }
    public int NewContentAdded { get; set; }
    public int TotalSearches { get; set; }
    public double AverageSearchResults { get; set; }
    public double ContentUtilizationRate { get; set; }
    public double SearchSuccessRate => TotalSearches > 0 && AverageSearchResults > 0 ? 
        Math.Min(AverageSearchResults / TotalSearches * 100, 100) : 0;
}

/// <summary>
/// System health and performance metrics
/// </summary>
public class SystemHealthMetrics
{
    public double SystemUptime { get; set; }
    public double AverageResponseTime { get; set; }
    public double ErrorRate { get; set; }
    public int DatabaseConnectionsActive { get; set; }
    public double CacheHitRate { get; set; }
    public double MemoryUsage { get; set; }
    public double CpuUsage { get; set; }
    public int ActiveConnections { get; set; }
    public double RequestsPerSecond { get; set; }
    public DateTime LastHealthCheck { get; set; } = DateTime.UtcNow;
    
    public string OverallHealthStatus => 
        SystemUptime > 99.5 && AverageResponseTime < 500 && ErrorRate < 0.05 ? "Healthy" :
        SystemUptime > 95 && AverageResponseTime < 1000 && ErrorRate < 0.1 ? "Warning" : "Critical";
}

/// <summary>
/// Financial performance metrics
/// </summary>
public class FinancialMetrics
{
    public decimal MonthlyRecurringRevenue { get; set; }
    public decimal AnnualRecurringRevenue { get; set; }
    public decimal TotalRevenue { get; set; }
    public int TransactionCount { get; set; }
    public decimal AverageTransactionValue { get; set; }
    public double ChurnRate { get; set; }
    public decimal CustomerLifetimeValue { get; set; }
    public double RevenueGrowthRate { get; set; }
}

/// <summary>
/// User engagement and activity metrics
/// </summary>
public class EngagementMetrics
{
    public int TotalSessions { get; set; }
    public double AverageSessionDuration { get; set; }
    public int TotalPageViews { get; set; }
    public double BounceRate { get; set; }
    public double UserEngagementScore { get; set; }
    public double SessionsPerUser => TotalSessions > 0 ? (double)TotalSessions / Math.Max(1, TotalSessions) : 0;
    public double PagesPerSession => TotalSessions > 0 ? (double)TotalPageViews / TotalSessions : 0;
}

/// <summary>
/// Conversion funnel data and rates
/// </summary>
public class ConversionFunnelData
{
    public int Visitors { get; set; }
    public int Signups { get; set; }
    public int TrialsStarted { get; set; }
    public int PaidConversions { get; set; }
    public Dictionary<string, double> ConversionRates { get; set; } = new();
    
    public double OverallConversionRate => Visitors > 0 ? (double)PaidConversions / Visitors * 100 : 0;
}

/// <summary>
/// Detailed user analytics response
/// </summary>
public class UserAnalyticsResponse
{
    public AnalyticsTimeFrame TimeFrame { get; set; } = new();
    public UserMetrics Metrics { get; set; } = new();
    public List<UserGrowthTrend> GrowthTrends { get; set; } = new();
    public CohortAnalysisData CohortAnalysis { get; set; } = new();
    public UserDemographicsData Demographics { get; set; } = new();
}

/// <summary>
/// User growth trend data point
/// </summary>
public class UserGrowthTrend
{
    public DateTime Period { get; set; }
    public int NewUsers { get; set; }
    public int CumulativeUsers { get; set; }
    public double GrowthRate => CumulativeUsers > NewUsers ? 
        (double)NewUsers / (CumulativeUsers - NewUsers) * 100 : 0;
}

/// <summary>
/// Cohort analysis data
/// </summary>
public class CohortAnalysisData
{
    public List<CohortData> Cohorts { get; set; } = new();
    public double AverageRetentionRate { get; set; }
}

/// <summary>
/// Individual cohort data
/// </summary>
public class CohortData
{
    public DateTime CohortDate { get; set; }
    public int InitialUsers { get; set; }
    public int RetainedUsers { get; set; }
    public double RetentionRate { get; set; }
}

/// <summary>
/// User demographics data
/// </summary>
public class UserDemographicsData
{
    public Dictionary<string, int> CountryDistribution { get; set; } = new();
    public int TotalUsers { get; set; }
}

/// <summary>
/// Content performance response
/// </summary>
public class ContentPerformanceResponse
{
    public AnalyticsTimeFrame TimeFrame { get; set; } = new();
    public ContentPerformanceMetrics Metrics { get; set; } = new();
    public List<ContentData> TopPerformingContent { get; set; } = new();
    public List<SearchTrendData> SearchTrends { get; set; } = new();
    public Dictionary<string, ContentCategoryMetrics> CategoryPerformance { get; set; } = new();
}

/// <summary>
/// Search trend data point
/// </summary>
public class SearchTrendData
{
    public DateTime Date { get; set; }
    public int SearchCount { get; set; }
    public double AverageResultCount { get; set; }
}

/// <summary>
/// Content category performance metrics
/// </summary>
public class ContentCategoryMetrics
{
    public string CategoryName { get; set; } = string.Empty;
    public int TotalItems { get; set; }
    public int NewItems { get; set; }
    public double GrowthRate => TotalItems > NewItems && NewItems > 0 ? 
        (double)NewItems / (TotalItems - NewItems) * 100 : 0;
}

/// <summary>
/// Real-time analytics response
/// </summary>
public class RealTimeAnalyticsResponse
{
    public int ActiveUsers { get; set; }
    public int CurrentSessions { get; set; }
    public List<RecentActivityData> RecentActivities { get; set; } = new();
    public SystemStatus SystemStatus { get; set; } = new();
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Recent activity data
/// </summary>
public class RecentActivityData
{
    public string ActivityType { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    public string Details { get; set; } = string.Empty;
}

/// <summary>
/// System status information
/// </summary>
public class SystemStatus
{
    public string Status { get; set; } = "Unknown";
    public double ResponseTime { get; set; }
    public double ErrorRate { get; set; }
    public DateTime LastCheck { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Analytics export request
/// </summary>
public class AnalyticsExportRequest
{
    public string ExportType { get; set; } = "users"; // users, content, financial, system
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string Format { get; set; } = "csv"; // csv, excel, json
    public List<string> IncludeFields { get; set; } = new();
}

/// <summary>
/// Analytics export response
/// </summary>
public class AnalyticsExportResponse
{
    public string ExportId { get; set; } = string.Empty;
    public string Status { get; set; } = "Processing";
    public string DownloadUrl { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ExpiresAt { get; set; }
}

/// <summary>
/// Chart data point for analytics visualizations
/// </summary>
public class AnalyticsChartDataPoint
{
    public DateTime Date { get; set; }
    public string Label { get; set; } = string.Empty;
    public double Value { get; set; }
    public Dictionary<string, object> Metadata { get; set; } = new();
}

/// <summary>
/// Analytics dashboard widget configuration
/// </summary>
public class AnalyticsDashboardWidget
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string WidgetType { get; set; } = "metric"; // metric, chart, table, gauge
    public Dictionary<string, object> Configuration { get; set; } = new();
    public int Order { get; set; }
    public bool IsVisible { get; set; } = true;
    public string Size { get; set; } = "medium"; // small, medium, large
}

/// <summary>
/// Analytics alert configuration
/// </summary>
public class AnalyticsAlert
{
    public string Id { get; set; } = string.Empty;
    public string MetricName { get; set; } = string.Empty;
    public string Condition { get; set; } = string.Empty; // greater_than, less_than, equals
    public double Threshold { get; set; }
    public string Severity { get; set; } = "medium"; // low, medium, high, critical
    public bool IsActive { get; set; } = true;
    public DateTime? LastTriggered { get; set; }
    public string NotificationMethod { get; set; } = "email"; // email, slack, webhook
}

/// <summary>
/// Performance benchmark data
/// </summary>
public class PerformanceBenchmark
{
    public string MetricName { get; set; } = string.Empty;
    public double CurrentValue { get; set; }
    public double BenchmarkValue { get; set; }
    public double PercentageDifference => BenchmarkValue != 0 ? 
        (CurrentValue - BenchmarkValue) / BenchmarkValue * 100 : 0;
    public string Status => Math.Abs(PercentageDifference) < 5 ? "On Target" :
        PercentageDifference > 0 ? "Above Benchmark" : "Below Benchmark";
}

/// <summary>
/// Analytics summary for executive dashboard
/// </summary>
public class ExecutiveAnalyticsSummary
{
    public string Period { get; set; } = string.Empty;
    public decimal TotalRevenue { get; set; }
    public int TotalUsers { get; set; }
    public double GrowthRate { get; set; }
    public double CustomerSatisfaction { get; set; }
    public List<string> KeyInsights { get; set; } = new();
    public List<string> ActionItems { get; set; } = new();
    public List<PerformanceBenchmark> Benchmarks { get; set; } = new();
}