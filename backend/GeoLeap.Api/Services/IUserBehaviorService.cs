using GeoLeap.Api.Models;
using AdvancedUserBehaviorEvent = GeoLeap.Api.Models.AdvancedUserBehavior.UserBehaviorEvent;
using AdvancedUserBehaviorSession = GeoLeap.Api.Models.AdvancedUserBehavior.UserBehaviorSession;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service interface for comprehensive user behavior analytics
/// </summary>
public interface IUserBehaviorService
{
    // Event tracking methods
    /// <summary>
    /// Track a single user behavior event
    /// </summary>
    Task<bool> TrackEventAsync(UserBehaviorEventRequest request, string? ipAddress = null, string? userAgent = null);
    
    /// <summary>
    /// Track multiple user behavior events in batch for better performance
    /// </summary>
    Task<int> TrackEventsAsync(IEnumerable<UserBehaviorEventRequest> requests, string? ipAddress = null, string? userAgent = null);
    
    // Analytics and reporting methods
    /// <summary>
    /// Get comprehensive user behavior dashboard data
    /// </summary>
    Task<UserBehaviorDashboard> GetDashboardAsync(DateTime startDate, DateTime endDate, string? userId = null);
    
    /// <summary>
    /// Get real-time user behavior metrics
    /// </summary>
    Task<RealTimeUserBehavior> GetRealTimeMetricsAsync();
    
    /// <summary>
    /// Get page performance analytics
    /// </summary>
    Task<IEnumerable<PagePerformanceMetric>> GetPageAnalyticsAsync(DateTime startDate, DateTime endDate, int limit = 50);
    
    /// <summary>
    /// Get user session analytics
    /// </summary>
    Task<IEnumerable<AdvancedUserBehaviorSession>> GetSessionAnalyticsAsync(DateTime startDate, DateTime endDate, string? userId = null, int limit = 100);
    
    /// <summary>
    /// Get user journey/funnel analysis
    /// </summary>
    Task<IEnumerable<UserPathStep>> GetUserJourneyAsync(DateTime startDate, DateTime endDate, string? startPage = null, string? endPage = null);
    
    /// <summary>
    /// Get device and browser analytics
    /// </summary>
    Task<IEnumerable<DeviceMetric>> GetDeviceAnalyticsAsync(DateTime startDate, DateTime endDate);
    
    /// <summary>
    /// Get geographic user distribution
    /// </summary>
    Task<IEnumerable<GeographicMetric>> GetGeographicAnalyticsAsync(DateTime startDate, DateTime endDate);
    
    /// <summary>
    /// Get interaction heatmap data
    /// </summary>
    Task<IEnumerable<InteractionHotspot>> GetHeatmapDataAsync(string pageUrl, DateTime startDate, DateTime endDate);
    
    // Session management
    /// <summary>
    /// Start or update a user session
    /// </summary>
    Task<AdvancedUserBehaviorSession> CreateOrUpdateSessionAsync(string sessionId, string? userId = null, string? ipAddress = null, string? userAgent = null);
    
    /// <summary>
    /// End a user session and calculate final metrics
    /// </summary>
    Task<bool> EndSessionAsync(string sessionId, DateTime? endTime = null);
    
    /// <summary>
    /// Get active sessions count
    /// </summary>
    Task<int> GetActiveSessionsCountAsync();
    
    /// <summary>
    /// Get session details by session ID
    /// </summary>
    Task<AdvancedUserBehaviorSession?> GetSessionAsync(string sessionId);
    
    // User-specific analytics
    /// <summary>
    /// Get behavior analytics for a specific user
    /// </summary>
    Task<UserBehaviorDashboard> GetUserAnalyticsAsync(string userId, DateTime startDate, DateTime endDate);
    
    /// <summary>
    /// Get user's event history
    /// </summary>
    Task<IEnumerable<AdvancedUserBehaviorEvent>> GetUserEventsAsync(string userId, DateTime? startDate = null, DateTime? endDate = null, int limit = 1000);
    
    /// <summary>
    /// Get user's session history
    /// </summary>
    Task<IEnumerable<AdvancedUserBehaviorSession>> GetUserSessionsAsync(string userId, DateTime? startDate = null, DateTime? endDate = null, int limit = 100);
    
    // Funnel and conversion analysis
    /// <summary>
    /// Analyze conversion funnel performance
    /// </summary>
    Task<ConversionFunnelAnalysis> GetConversionFunnelAsync(List<string> steps, DateTime startDate, DateTime endDate);
    
    /// <summary>
    /// Get conversion rate by different dimensions
    /// </summary>
    Task<IEnumerable<ConversionMetric>> GetConversionAnalyticsAsync(DateTime startDate, DateTime endDate, string? dimension = null);
    
    // Performance and monitoring
    /// <summary>
    /// Get page performance metrics (load times, bounce rates, etc.)
    /// </summary>
    Task<PagePerformanceReport> GetPagePerformanceAsync(string pageUrl, DateTime startDate, DateTime endDate);
    
    /// <summary>
    /// Get system performance statistics
    /// </summary>
    Task<BehaviorTrackingStats> GetTrackingStatsAsync();
    
    // Data management and privacy
    /// <summary>
    /// Delete user behavior data for GDPR compliance
    /// </summary>
    Task<bool> DeleteUserDataAsync(string userId);
    
    /// <summary>
    /// Anonymize user behavior data while preserving analytics value
    /// </summary>
    Task<bool> AnonymizeUserDataAsync(string userId);
    
    /// <summary>
    /// Export user behavior data for GDPR data request
    /// </summary>
    Task<UserDataExport> ExportUserDataAsync(string userId);
    
    // Advanced analytics
    /// <summary>
    /// Get cohort analysis data
    /// </summary>
    Task<CohortAnalysisResult> GetCohortAnalysisAsync(DateTime startDate, DateTime endDate, string cohortType = "weekly");
    
    /// <summary>
    /// Get A/B testing insights from user behavior
    /// </summary>
    Task<IEnumerable<ABTestResult>> GetABTestInsightsAsync(string testId, DateTime startDate, DateTime endDate);
    
    /// <summary>
    /// Get predictive user behavior insights
    /// </summary>
    Task<UserBehaviorPredictions> GetBehaviorPredictionsAsync(string userId);
}

/// <summary>
/// Additional models for advanced analytics
/// </summary>
public class ConversionFunnelAnalysis
{
    public List<FunnelStep> Steps { get; set; } = new();
    public decimal OverallConversionRate { get; set; }
    public int TotalEntrants { get; set; }
    public int TotalConversions { get; set; }
    public DateTime AnalysisPeriod { get; set; }
}

public class FunnelStep
{
    public string StepName { get; set; } = string.Empty;
    public string PageUrl { get; set; } = string.Empty;
    public int Entrants { get; set; }
    public int Completions { get; set; }
    public decimal ConversionRate { get; set; }
    public decimal DropoffRate { get; set; }
    public decimal AvgTimeToComplete { get; set; }
}

public class ConversionMetric
{
    public string Dimension { get; set; } = string.Empty;
    public string DimensionValue { get; set; } = string.Empty;
    public int Sessions { get; set; }
    public int Conversions { get; set; }
    public decimal ConversionRate { get; set; }
    public decimal Revenue { get; set; }
}

public class PagePerformanceReport
{
    public string PageUrl { get; set; } = string.Empty;
    public string PageTitle { get; set; } = string.Empty;
    public int TotalViews { get; set; }
    public int UniqueViews { get; set; }
    public decimal AvgTimeOnPage { get; set; }
    public decimal BounceRate { get; set; }
    public decimal ExitRate { get; set; }
    public decimal AvgScrollDepth { get; set; }
    public int TotalInteractions { get; set; }
    public decimal ConversionRate { get; set; }
    public List<InteractionHotspot> Hotspots { get; set; } = new();
    public List<UserPathStep> EntryPaths { get; set; } = new();
    public List<UserPathStep> ExitPaths { get; set; } = new();
}

public class BehaviorTrackingStats
{
    public DateTime LastUpdated { get; set; }
    public int TotalEvents { get; set; }
    public int EventsToday { get; set; }
    public int EventsThisHour { get; set; }
    public int ActiveSessions { get; set; }
    public int TotalSessions { get; set; }
    public decimal AvgEventsPerSession { get; set; }
    public decimal AvgSessionDuration { get; set; }
    public List<EventTypeStats> EventBreakdown { get; set; } = new();
}

public class EventTypeStats
{
    public string EventType { get; set; } = string.Empty;
    public int Count { get; set; }
    public decimal Percentage { get; set; }
}

public class UserDataExport
{
    public string UserId { get; set; } = string.Empty;
    public DateTime ExportDate { get; set; }
    public List<AdvancedUserBehaviorEvent> Events { get; set; } = new();
    public List<AdvancedUserBehaviorSession> Sessions { get; set; } = new();
    public UserBehaviorSummary Summary { get; set; } = new();
}

public class UserBehaviorSummary
{
    public int TotalSessions { get; set; }
    public int TotalEvents { get; set; }
    public decimal TotalTimeSpent { get; set; }
    public int TotalPageViews { get; set; }
    public int UniquePages { get; set; }
    public DateTime FirstVisit { get; set; }
    public DateTime LastVisit { get; set; }
    public List<string> TopPages { get; set; } = new();
    public List<string> DevicesUsed { get; set; } = new();
}

public class CohortAnalysisResult
{
    public string CohortType { get; set; } = string.Empty;
    public List<CohortData> Cohorts { get; set; } = new();
    public CohortMetrics Metrics { get; set; } = new();
}

public class CohortData
{
    public string Period { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public int InitialUsers { get; set; }
    public List<CohortRetention> RetentionData { get; set; } = new();
}

public class CohortRetention
{
    public int Period { get; set; }
    public int RetainedUsers { get; set; }
    public decimal RetentionRate { get; set; }
}

public class CohortMetrics
{
    public decimal OverallRetentionRate { get; set; }
    public decimal AvgSessionsPerUser { get; set; }
    public decimal AvgLifetimeValue { get; set; }
}

public class ABTestResult
{
    public string TestId { get; set; } = string.Empty;
    public string VariantId { get; set; } = string.Empty;
    public string VariantName { get; set; } = string.Empty;
    public int Participants { get; set; }
    public int Conversions { get; set; }
    public decimal ConversionRate { get; set; }
    public decimal Confidence { get; set; }
    public bool IsStatisticallySignificant { get; set; }
    public string Recommendation { get; set; } = string.Empty;
}

public class UserBehaviorPredictions
{
    public string UserId { get; set; } = string.Empty;
    public decimal ChurnProbability { get; set; }
    public decimal ConversionProbability { get; set; }
    public decimal LifetimeValuePrediction { get; set; }
    public List<string> RecommendedPages { get; set; } = new();
    public List<string> OptimalTimes { get; set; } = new();
    public string UserSegment { get; set; } = string.Empty;
}