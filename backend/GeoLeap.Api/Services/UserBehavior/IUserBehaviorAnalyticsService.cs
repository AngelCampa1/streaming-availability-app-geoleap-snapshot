using GeoLeap.Api.Models.AdvancedUserBehavior;
using GeoLeap.Api.Services.GrowthAnalytics;

namespace GeoLeap.Api.Services.UserBehavior;

/// <summary>
/// Service for tracking and analyzing user behavior events
/// </summary>
public interface IUserBehaviorAnalyticsService
{
    /// <summary>
    /// Track a single user behavior event
    /// </summary>
    Task<bool> TrackEventAsync(UserBehaviorEvent behaviorEvent, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Batch track multiple behavior events (high performance)
    /// </summary>
    Task<int> TrackEventsAsync(IEnumerable<UserBehaviorEvent> events, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Process pending events in background queue
    /// </summary>
    Task ProcessPendingEventsAsync(int batchSize = 100, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Validate event data and enrich with server-side information
    /// </summary>
    Task<UserBehaviorEvent> EnrichEventAsync(UserBehaviorEvent behaviorEvent, string? ipAddress, string? userAgent);
    
    /// <summary>
    /// Get events for a specific user with privacy compliance
    /// </summary>
    Task<IEnumerable<UserBehaviorEvent>> GetUserEventsAsync(string userId, DateTime? startDate = null, DateTime? endDate = null, bool respectConsent = true);
    
    /// <summary>
    /// Get events by category and date range
    /// </summary>
    Task<IEnumerable<UserBehaviorEvent>> GetEventsByCategoryAsync(string category, DateTime startDate, DateTime endDate, int limit = 1000);
    
    /// <summary>
    /// Get events by event type and date range
    /// </summary>
    Task<IEnumerable<UserBehaviorEvent>> GetEventsByTypeAsync(string eventType, DateTime startDate, DateTime endDate, int limit = 1000);
    
    /// <summary>
    /// Get session details with aggregated metrics
    /// </summary>
    Task<UserBehaviorSession?> GetSessionAsync(string sessionId);
    
    /// <summary>
    /// Get all sessions for a user
    /// </summary>
    Task<IEnumerable<UserBehaviorSession>> GetUserSessionsAsync(string userId, DateTime? startDate = null, DateTime? endDate = null);
    
    /// <summary>
    /// Create or update session aggregates
    /// </summary>
    Task<UserBehaviorSession> ProcessSessionAsync(string sessionId, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Get page performance analytics
    /// </summary>
    Task<PagePerformanceAnalytics> GetPagePerformanceAsync(string? pageUrl = null, DateTime? startDate = null, DateTime? endDate = null);
    
    /// <summary>
    /// Get user journey analytics
    /// </summary>
    Task<UserJourneyAnalytics> GetUserJourneyAsync(string? userId = null, DateTime? startDate = null, DateTime? endDate = null);
    
    /// <summary>
    /// Get conversion funnel analysis
    /// </summary>
    Task<UserBehaviorFunnel> AnalyzeFunnelAsync(string funnelName, IEnumerable<string> eventTypes, DateTime startDate, DateTime endDate);
    
    /// <summary>
    /// Get cohort analysis
    /// </summary>
    Task<CohortAnalytics> GetCohortAnalysisAsync(DateTime cohortStart, DateTime cohortEnd, string cohortCriteria = "first_visit");
    
    /// <summary>
    /// Get real-time analytics dashboard data
    /// </summary>
    Task<RealTimeAnalytics> GetRealTimeAnalyticsAsync();
    
    /// <summary>
    /// Get behavior insights and recommendations
    /// </summary>
    Task<IEnumerable<UserBehaviorInsight>> GetInsightsAsync(string? category = null, DateTime? startDate = null, DateTime? endDate = null);
    
    /// <summary>
    /// Calculate behavior insights for a period
    /// </summary>
    Task<IEnumerable<UserBehaviorInsight>> CalculateInsightsAsync(DateTime startDate, DateTime endDate, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Get user segmentation based on behavior patterns
    /// </summary>
    Task<UserSegmentationResult> GetUserSegmentationAsync(DateTime startDate, DateTime endDate, string segmentationCriteria = "engagement");
    
    /// <summary>
    /// Get A/B test performance analytics
    /// </summary>
    Task<AbTestPerformanceAnalytics> GetAbTestPerformanceAsync(Guid experimentId);
    
    /// <summary>
    /// Delete user data for GDPR compliance
    /// </summary>
    Task<bool> DeleteUserDataAsync(string userId);
    
    /// <summary>
    /// Anonymize user data while preserving analytics value
    /// </summary>
    Task<bool> AnonymizeUserDataAsync(string userId);
    
    /// <summary>
    /// Get event processing statistics for monitoring
    /// </summary>
    Task<BehaviorEventProcessingStats> GetProcessingStatsAsync();
    
    /// <summary>
    /// Clean up old data based on retention policies
    /// </summary>
    Task<int> CleanupOldDataAsync(DateTime cutoffDate, CancellationToken cancellationToken = default);
}

/// <summary>
/// Page performance analytics data
/// </summary>
public class PagePerformanceAnalytics
{
    public string? PageUrl { get; set; }
    public int TotalViews { get; set; }
    public int UniqueViews { get; set; }
    public double AverageTimeOnPage { get; set; }
    public double BounceRate { get; set; }
    public double ExitRate { get; set; }
    public double AverageScrollDepth { get; set; }
    public int TotalInteractions { get; set; }
    public List<string> TopReferrers { get; set; } = new();
    public List<string> TopExitPages { get; set; } = new();
    public Dictionary<string, int> DeviceTypeBreakdown { get; set; } = new();
}

/// <summary>
/// User journey analytics data
/// </summary>
public class UserJourneyAnalytics
{
    public string? UserId { get; set; }
    public int TotalSessions { get; set; }
    public double AverageSessionDuration { get; set; }
    public double AveragePagesPerSession { get; set; }
    public List<string> CommonPaths { get; set; } = new();
    public List<string> ConversionPaths { get; set; } = new();
    public Dictionary<string, int> ChannelAttribution { get; set; } = new();
    public List<JourneyStep> JourneySteps { get; set; } = new();
}

/// <summary>
/// Journey step data
/// </summary>
public class JourneyStep
{
    public int StepOrder { get; set; }
    public string PageUrl { get; set; } = string.Empty;
    public string EventType { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    public int TimeSpentSeconds { get; set; }
    public Dictionary<string, object> Properties { get; set; } = new();
}

/// <summary>
/// Cohort analytics data
/// </summary>
public class CohortAnalytics
{
    public DateTime CohortStart { get; set; }
    public DateTime CohortEnd { get; set; }
    public string CohortCriteria { get; set; } = string.Empty;
    public int TotalUsers { get; set; }
    public List<CohortPeriod> Periods { get; set; } = new();
}

/// <summary>
/// Cohort period data
/// </summary>
public class CohortPeriod
{
    public int PeriodNumber { get; set; }
    public string PeriodLabel { get; set; } = string.Empty;
    public int ActiveUsers { get; set; }
    public double RetentionRate { get; set; }
}

/// <summary>
/// Real-time analytics data
/// </summary>
public class RealTimeAnalytics
{
    public int ActiveUsers { get; set; }
    public int EventsPerMinute { get; set; }
    public int SessionsPerHour { get; set; }
    public List<string> TopPages { get; set; } = new();
    public List<string> TopEvents { get; set; } = new();
    public Dictionary<string, int> CountryBreakdown { get; set; } = new();
    public Dictionary<string, int> DeviceBreakdown { get; set; } = new();
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// User segmentation result
/// </summary>
public class UserSegmentationResult
{
    public string SegmentationCriteria { get; set; } = string.Empty;
    public DateTime AnalysisPeriodStart { get; set; }
    public DateTime AnalysisPeriodEnd { get; set; }
    public List<UserSegment> Segments { get; set; } = new();
}

/// <summary>
/// User segment data
/// </summary>
public class UserSegment
{
    public string SegmentName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int UserCount { get; set; }
    public double Percentage { get; set; }
    public Dictionary<string, object> Characteristics { get; set; } = new();
}

/// <summary>
/// A/B test performance analytics
/// </summary>
public class AbTestPerformanceAnalytics
{
    public Guid ExperimentId { get; set; }
    public string ExperimentName { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public List<AbTestVariant> Variants { get; set; } = new();
    public string WinningVariant { get; set; } = string.Empty;
    public double StatisticalSignificance { get; set; }
}

/// <summary>
/// A/B test variant data
/// </summary>
public class AbTestVariant
{
    public string VariantName { get; set; } = string.Empty;
    public int Participants { get; set; }
    public int Conversions { get; set; }
    public double ConversionRate { get; set; }
    public double ConfidenceInterval { get; set; }
}

/// <summary>
/// Behavior event processing statistics
/// </summary>
public class BehaviorEventProcessingStats
{
    public int TotalEvents { get; set; }
    public int PendingEvents { get; set; }
    public int ProcessedEvents { get; set; }
    public int FailedEvents { get; set; }
    public int EventsToday { get; set; }
    public int EventsThisHour { get; set; }
    public double AvgProcessingTimeMs { get; set; }
    public DateTime LastProcessedAt { get; set; }
    public List<EventCategoryStats> CategoryStats { get; set; } = new();
    public List<EventTypeStats> TypeStats { get; set; } = new();
}

/// <summary>
/// Event type statistics
/// </summary>
public class EventTypeStats
{
    public string EventType { get; set; } = string.Empty;
    public int Count { get; set; }
    public decimal Percentage { get; set; }
}