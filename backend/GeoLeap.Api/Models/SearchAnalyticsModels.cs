using System.ComponentModel.DataAnnotations;

namespace GeoLeap.Api.Models;

/// <summary>
/// Search analytics event for tracking search interactions
/// </summary>
public class SearchAnalyticsEvent
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    public string EventType { get; set; } = string.Empty;
    public Guid? UserId { get; set; }
    public string? SessionId { get; set; }
    public string AnonymousId { get; set; } = string.Empty; // For privacy-compliant tracking
    public string Query { get; set; } = string.Empty;
    public string? NormalizedQuery { get; set; }
    public ContentType? ContentType { get; set; }
    public int? ResultCount { get; set; }
    public long ResponseTimeMs { get; set; }
    public SearchStrategy? UsedStrategy { get; set; }
    public bool UsedCache { get; set; }
    public List<string> DataSources { get; set; } = new();
    public string? ClickedResultId { get; set; }
    public int? ClickedPosition { get; set; }
    public Dictionary<string, object> Metadata { get; set; } = new();
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public string CorrelationId { get; set; } = string.Empty;
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public string? Country { get; set; }
    public string? Region { get; set; }
}

/// <summary>
/// User search journey tracking
/// </summary>
public class SearchJourney
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    public string SessionId { get; set; } = string.Empty;
    public Guid? UserId { get; set; }
    public string AnonymousId { get; set; } = string.Empty;
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
    public List<SearchStep> Steps { get; set; } = new();
    public SearchOutcome Outcome { get; set; } = SearchOutcome.Unknown;
    public int TotalSearches { get; set; }
    public int TotalClicks { get; set; }
    public string? FinalClickedContentId { get; set; }
    public TimeSpan TotalDuration { get; set; }
    public bool ConvertedToSubscription { get; set; }
    public Dictionary<string, object> JourneyMetadata { get; set; } = new();
}

/// <summary>
/// Individual step in a search journey
/// </summary>
public class SearchStep
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid JourneyId { get; set; }
    public int StepNumber { get; set; }
    public string Action { get; set; } = string.Empty; // "search", "click", "filter", "sort"
    public string? Query { get; set; }
    public string? ContentId { get; set; }
    public int? Position { get; set; }
    public Dictionary<string, object> ActionMetadata { get; set; } = new();
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public TimeSpan TimeFromPrevious { get; set; }
}

/// <summary>
/// Search performance metrics aggregated data
/// </summary>
public class SearchPerformanceMetrics
{
    public DateTime PeriodStart { get; set; }
    public DateTime PeriodEnd { get; set; }
    public long TotalSearches { get; set; }
    public long UniqueUsers { get; set; }
    public long UniqueSessions { get; set; }
    public double AverageResponseTimeMs { get; set; }
    public double MedianResponseTimeMs { get; set; }
    public double P95ResponseTimeMs { get; set; }
    public double P99ResponseTimeMs { get; set; }
    public double CacheHitRate { get; set; }
    public double ErrorRate { get; set; }
    public long SuccessfulSearches { get; set; }
    public long FailedSearches { get; set; }
    public Dictionary<string, long> SearchesByStrategy { get; set; } = new();
    public Dictionary<string, long> SearchesByContentType { get; set; } = new();
    public Dictionary<string, double> ResponseTimesByStrategy { get; set; } = new();
    public List<PopularQuery> TopQueries { get; set; } = new();
    public List<PopularQuery> TrendingQueries { get; set; } = new();
    public List<SearchPerformanceAlert> ActiveAlerts { get; set; } = new();
}

/// <summary>
/// User behavior analytics aggregated data
/// </summary>
public class UserBehaviorAnalytics
{
    public DateTime PeriodStart { get; set; }
    public DateTime PeriodEnd { get; set; }
    public double AverageSearchesPerUser { get; set; }
    public double AverageSearchesPerSession { get; set; }
    public double AverageSessionDurationMinutes { get; set; }
    public double ClickThroughRate { get; set; }
    public double BounceRate { get; set; } // Users who search once and leave
    public double ConversionRate { get; set; } // Users who search and then subscribe
    public Dictionary<int, double> ClicksByPosition { get; set; } = new(); // Position -> CTR
    public Dictionary<string, long> InteractionsByContentType { get; set; } = new();
    public Dictionary<string, double> EngagementByGenre { get; set; } = new();
    public List<UserSegment> UserSegments { get; set; } = new();
    public List<SearchPattern> CommonPatterns { get; set; } = new();
}

/// <summary>
/// Business intelligence metrics
/// </summary>
public class BusinessIntelligenceMetrics
{
    public DateTime PeriodStart { get; set; }
    public DateTime PeriodEnd { get; set; }
    public List<PopularSearchContent> TrendingContent { get; set; } = new();
    public List<ContentGap> ContentGaps { get; set; } = new();
    public Dictionary<string, GeographicInsight> GeographicInsights { get; set; } = new();
    public RevenueImpactAnalysis RevenueImpact { get; set; } = new();
    public List<SearchToConversionFunnel> ConversionFunnels { get; set; } = new();
    public CompetitiveIntelligence CompetitiveData { get; set; } = new();
    public List<BusinessAlert> BusinessAlerts { get; set; } = new();
}

/// <summary>
/// Popular query with trend information
/// </summary>
public class PopularQuery
{
    public string Query { get; set; } = string.Empty;
    public long SearchCount { get; set; }
    public long UniqueUsers { get; set; }
    public double ClickThroughRate { get; set; }
    public TrendDirection Trend { get; set; }
    public double TrendPercentage { get; set; }
    public DateTime FirstSeen { get; set; }
    public DateTime LastSeen { get; set; }
    public List<string> RelatedQueries { get; set; } = new();
}

/// <summary>
/// Popular content analytics for search
/// </summary>
public class PopularSearchContent
{
    public string ContentId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public ContentType Type { get; set; }
    public long SearchCount { get; set; }
    public long ClickCount { get; set; }
    public double ClickThroughRate { get; set; }
    public TrendDirection Trend { get; set; }
    public double TrendPercentage { get; set; }
    public List<string> TopSearchQueries { get; set; } = new();
    public Dictionary<string, long> SearchesByCountry { get; set; } = new();
}

/// <summary>
/// Content gap analysis
/// </summary>
public class ContentGap
{
    public string Query { get; set; } = string.Empty;
    public long SearchCount { get; set; }
    public double AverageResultQuality { get; set; }
    public int ResultCount { get; set; }
    public double UserSatisfactionScore { get; set; }
    public List<string> MissingGenres { get; set; } = new();
    public List<string> MissingRegions { get; set; } = new();
    public string RecommendedAction { get; set; } = string.Empty;
    public DateTime IdentifiedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Geographic search insights
/// </summary>
public class GeographicInsight
{
    public string CountryCode { get; set; } = string.Empty;
    public string CountryName { get; set; } = string.Empty;
    public long TotalSearches { get; set; }
    public long UniqueUsers { get; set; }
    public List<PopularQuery> TopQueries { get; set; } = new();
    public List<string> PreferredGenres { get; set; } = new();
    public List<string> PreferredServices { get; set; } = new();
    public double AverageSessionDuration { get; set; }
    public double ConversionRate { get; set; }
    public TimeZoneInfo TimeZone { get; set; } = TimeZoneInfo.Utc;
    public Dictionary<int, long> SearchesByHour { get; set; } = new(); // Hour of day -> search count
}

/// <summary>
/// Revenue impact analysis
/// </summary>
public class RevenueImpactAnalysis
{
    public decimal TotalRevenueFromSearch { get; set; }
    public long SearchDrivenSubscriptions { get; set; }
    public decimal AverageRevenuePerSearch { get; set; }
    public decimal AverageRevenuePerUser { get; set; }
    public Dictionary<string, decimal> RevenueByContentType { get; set; } = new();
    public Dictionary<string, decimal> RevenueBySearchQuery { get; set; } = new();
    public List<HighValueUser> HighValueUsers { get; set; } = new();
    public ConversionFunnelMetrics ConversionFunnel { get; set; } = new();
}

/// <summary>
/// Search to conversion funnel analysis
/// </summary>
public class SearchToConversionFunnel
{
    public string FunnelName { get; set; } = string.Empty;
    public long SearchStarted { get; set; }
    public long SearchCompleted { get; set; }
    public long ResultsViewed { get; set; }
    public long ContentClicked { get; set; }
    public long PaywallEncountered { get; set; }
    public long SubscriptionStarted { get; set; }
    public long SubscriptionCompleted { get; set; }
    public Dictionary<string, double> ConversionRates { get; set; } = new();
    public Dictionary<string, TimeSpan> AverageTimeInStage { get; set; } = new();
}

/// <summary>
/// User segment for behavioral analysis
/// </summary>
public class UserSegment
{
    public string SegmentName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public long UserCount { get; set; }
    public UserBehaviorProfile BehaviorProfile { get; set; } = new();
    public List<string> CommonQueries { get; set; } = new();
    public List<string> PreferredContent { get; set; } = new();
    public double ConversionRate { get; set; }
    public decimal AverageRevenue { get; set; }
}

/// <summary>
/// User behavior profile
/// </summary>
public class UserBehaviorProfile
{
    public double AverageSearchesPerSession { get; set; }
    public double AverageSessionDuration { get; set; }
    public double ClickThroughRate { get; set; }
    public List<string> PreferredGenres { get; set; } = new();
    public List<string> PreferredServices { get; set; } = new();
    public Dictionary<string, double> SearchPatterns { get; set; } = new();
    public string MostActiveTimeOfDay { get; set; } = string.Empty;
    public List<string> MostActiveWeekdays { get; set; } = new();
}

/// <summary>
/// Common search patterns
/// </summary>
public class SearchPattern
{
    public string PatternName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public List<string> QuerySequence { get; set; } = new();
    public long Frequency { get; set; }
    public double SuccessRate { get; set; }
    public double ConversionRate { get; set; }
    public string RecommendedOptimization { get; set; } = string.Empty;
}

/// <summary>
/// High-value user identification
/// </summary>
public class HighValueUser
{
    public Guid UserId { get; set; }
    public string AnonymousId { get; set; } = string.Empty;
    public decimal TotalRevenue { get; set; }
    public long TotalSearches { get; set; }
    public double ConversionRate { get; set; }
    public List<string> FavoriteGenres { get; set; } = new();
    public List<string> FavoriteServices { get; set; } = new();
    public DateTime FirstSearchDate { get; set; }
    public DateTime LastSearchDate { get; set; }
    public string ValueSegment { get; set; } = string.Empty; // "Premium", "VIP", "Whale"
}

/// <summary>
/// Conversion funnel metrics
/// </summary>
public class ConversionFunnelMetrics
{
    public Dictionary<string, FunnelStageMetrics> Stages { get; set; } = new();
    public double OverallConversionRate { get; set; }
    public TimeSpan AverageTimeToConversion { get; set; }
    public List<DropOffPoint> MajorDropOffPoints { get; set; } = new();
    public List<string> OptimizationRecommendations { get; set; } = new();
}

/// <summary>
/// Funnel stage metrics
/// </summary>
public class FunnelStageMetrics
{
    public string StageName { get; set; } = string.Empty;
    public long EnteredStage { get; set; }
    public long ExitedStage { get; set; }
    public long ConvertedToNext { get; set; }
    public double ConversionRate { get; set; }
    public TimeSpan AverageTimeInStage { get; set; }
    public List<string> CommonDropOffReasons { get; set; } = new();
}

/// <summary>
/// Drop-off point analysis
/// </summary>
public class DropOffPoint
{
    public string StageName { get; set; } = string.Empty;
    public double DropOffRate { get; set; }
    public List<string> Reasons { get; set; } = new();
    public List<string> Recommendations { get; set; } = new();
    public decimal PotentialRevenueImpact { get; set; }
}

/// <summary>
/// Competitive intelligence data
/// </summary>
public class CompetitiveIntelligence
{
    public List<ContentGap> CompetitorAdvantages { get; set; } = new();
    public List<PopularQuery> UnservedQueries { get; set; } = new();
    public Dictionary<string, CompetitorInsight> MarketInsights { get; set; } = new();
    public List<string> EmergingTrends { get; set; } = new();
    public List<string> OpportunityAreas { get; set; } = new();
}

/// <summary>
/// Competitor insight analysis
/// </summary>
public class CompetitorInsight
{
    public string CompetitorName { get; set; } = string.Empty;
    public List<string> StrengthAreas { get; set; } = new();
    public List<string> ContentAdvantages { get; set; } = new();
    public List<string> MarketPositioning { get; set; } = new();
    public double EstimatedMarketShare { get; set; }
}

/// <summary>
/// Performance alert for monitoring
/// </summary>
public class SearchPerformanceAlert
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    public AlertType Type { get; set; }
    public AlertSeverity Severity { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public Dictionary<string, object> Metrics { get; set; } = new();
    public DateTime TriggeredAt { get; set; } = DateTime.UtcNow;
    public DateTime? ResolvedAt { get; set; }
    public bool IsActive { get; set; } = true;
    public List<string> RecommendedActions { get; set; } = new();
}

/// <summary>
/// Business alert for stakeholders
/// </summary>
public class SearchBusinessAlert
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    public BusinessAlertType Type { get; set; }
    public AlertSeverity Severity { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public Dictionary<string, object> BusinessMetrics { get; set; } = new();
    public decimal? RevenueImpact { get; set; }
    public DateTime TriggeredAt { get; set; } = DateTime.UtcNow;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? AcknowledgedAt { get; set; }
    public bool RequiresAction { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsResolved { get; set; } = false;
    public List<string> RecommendedActions { get; set; } = new();
}

/// <summary>
/// Analytics dashboard summary
/// </summary>
public class AnalyticsDashboardSummary
{
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
    public SearchPerformanceMetrics Performance { get; set; } = new();
    public UserBehaviorAnalytics UserBehavior { get; set; } = new();
    public BusinessIntelligenceMetrics BusinessIntelligence { get; set; } = new();
    public List<SearchPerformanceAlert> ActiveAlerts { get; set; } = new();
    public List<BusinessAlert> BusinessAlerts { get; set; } = new();
    public Dictionary<string, double> KeyPerformanceIndicators { get; set; } = new();
    public List<InsightCard> TopInsights { get; set; } = new();
}

/// <summary>
/// Insight card for dashboard
/// </summary>
public class InsightCard
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public InsightType Type { get; set; }
    public object? Value { get; set; }
    public TrendDirection Trend { get; set; }
    public double TrendPercentage { get; set; }
    public List<string> ActionableItems { get; set; } = new();
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Enums for analytics
/// </summary>
public enum SearchOutcome
{
    Unknown,
    Successful,
    NoResults,
    Abandoned,
    Converted,
    Paywall
}

public enum SearchTrendDirection
{
    Unknown,
    Up,
    Down,
    Stable,
    Volatile
}

public enum AlertType
{
    Performance,
    Error,
    Capacity,
    Quality,
    Usage
}


public enum BusinessAlertType
{
    Revenue,
    UserBehavior,
    ContentGap,
    Competitive,
    Opportunity,
    Trend
}

public enum InsightType
{
    Performance,
    UserBehavior,
    BusinessTrend,
    ContentOpportunity,
    RevenueImpact,
    Competitive
}

/// <summary>
/// A/B test performance tracking
/// </summary>
public class ABTestPerformance
{
    public string TestId { get; set; } = string.Empty;
    public string TestName { get; set; } = string.Empty;
    public string VariantId { get; set; } = string.Empty;
    public string VariantName { get; set; } = string.Empty;
    public long Participants { get; set; }
    public long Searches { get; set; }
    public long Clicks { get; set; }
    public long Conversions { get; set; }
    public double ConversionRate { get; set; }
    public double ClickThroughRate { get; set; }
    public double AverageResponseTime { get; set; }
    public double UserSatisfactionScore { get; set; }
    public double StatisticalSignificance { get; set; }
    public DateTime TestStartDate { get; set; }
    public DateTime TestEndDate { get; set; }
    public ABTestStatus Status { get; set; }
}


/// <summary>
/// Search quality metrics
/// </summary>
public class SearchQualityMetrics
{
    public DateTime PeriodStart { get; set; }
    public DateTime PeriodEnd { get; set; }
    public double AverageResultRelevance { get; set; }
    public double UserSatisfactionScore { get; set; }
    public double NoResultsRate { get; set; }
    public double LowQualityResultsRate { get; set; }
    public Dictionary<string, double> QualityByContentType { get; set; } = new();
    public Dictionary<string, double> QualityByStrategy { get; set; } = new();
    public List<QualityIssue> IdentifiedIssues { get; set; } = new();
    public List<string> QualityRecommendations { get; set; } = new();
}

/// <summary>
/// Quality issue identification
/// </summary>
public class QualityIssue
{
    public string IssueType { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public double Impact { get; set; }
    public long AffectedSearches { get; set; }
    public List<string> ExampleQueries { get; set; } = new();
    public List<string> RecommendedFixes { get; set; } = new();
    public DateTime IdentifiedAt { get; set; } = DateTime.UtcNow;
}