using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace GeoLeap.Api.Models;

/// <summary>
/// ASO Analytics Event for tracking mobile app store optimization interactions
/// </summary>
public class ASOAnalyticsEvent
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    public string EventType { get; set; } = string.Empty; // "keyword_rank_check", "download", "install", "conversion", "retention"
    public string? AppStoreId { get; set; } // App Store Connect ID or Google Play package name
    public string Platform { get; set; } = string.Empty; // "ios", "android"
    public string Country { get; set; } = string.Empty; // Market code
    public string? UserId { get; set; }
    public string? SessionId { get; set; }
    public string? AnonymousId { get; set; }
    public string? Keyword { get; set; }
    public int? KeywordRank { get; set; }
    public int? PreviousKeywordRank { get; set; }
    public string? SearchTerm { get; set; }
    public string? Source { get; set; } // "organic", "aso", "paid"
    public string? Campaign { get; set; }
    public string? Creative { get; set; }
    public Dictionary<string, object> Metadata { get; set; } = new();
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public string CorrelationId { get; set; } = string.Empty;
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public string? DeviceType { get; set; }
    public string? AppVersion { get; set; }
    public decimal? Revenue { get; set; }
    public TimeSpan? TimeToConversion { get; set; }
}

/// <summary>
/// ASO User Journey tracking complete funnel from search to subscription
/// </summary>
public class ASOUserJourney
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    public string SessionId { get; set; } = string.Empty;
    public string? UserId { get; set; }
    public string AnonymousId { get; set; } = string.Empty;
    public string Platform { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
    public List<ASOJourneyStep> Steps { get; set; } = new();
    public ASOJourneyOutcome Outcome { get; set; } = ASOJourneyOutcome.Unknown;
    public string? FirstSearchTerm { get; set; }
    public string? FirstDiscoveryKeyword { get; set; }
    public int? FirstRankPosition { get; set; }
    public string? ConvertedSubscriptionType { get; set; }
    public decimal? RevenueGenerated { get; set; }
    public TimeSpan TotalJourneyTime { get; set; }
    public TimeSpan? TimeToFirstOpen { get; set; }
    public TimeSpan? TimeToSubscription { get; set; }
    public Dictionary<string, object> JourneyMetadata { get; set; } = new();
}

/// <summary>
/// Individual step in ASO user journey
/// </summary>
public class ASOJourneyStep
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid JourneyId { get; set; }
    public int StepNumber { get; set; }
    public string Action { get; set; } = string.Empty; // "search", "impression", "click", "install", "first_open", "subscription"
    public string? Keyword { get; set; }
    public int? RankPosition { get; set; }
    public string? SearchQuery { get; set; }
    public string? Creative { get; set; } // Which screenshot/icon was shown
    public Dictionary<string, object> ActionMetadata { get; set; } = new();
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public TimeSpan TimeFromPrevious { get; set; }
    public TimeSpan TimeFromJourneyStart { get; set; }
}

/// <summary>
/// ASO Performance Metrics with advanced analytics
/// </summary>
public class ASOPerformanceMetrics
{
    public DateTime PeriodStart { get; set; }
    public DateTime PeriodEnd { get; set; }
    public string Platform { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    
    // Download and Install Metrics
    public long TotalImpressions { get; set; }
    public long TotalDownloads { get; set; }
    public long TotalInstalls { get; set; }
    public double ImpressionToDownloadRate { get; set; }
    public double DownloadToInstallRate { get; set; }
    public double OverallConversionRate { get; set; }
    
    // Keyword Performance
    public int TotalTrackedKeywords { get; set; }
    public int Top10Keywords { get; set; }
    public int Top50Keywords { get; set; }
    public double AverageKeywordRank { get; set; }
    public int KeywordRankImprovements { get; set; }
    public int KeywordRankDeclines { get; set; }
    
    // Revenue Metrics
    public decimal TotalRevenueFromASO { get; set; }
    public decimal AverageRevenuePerDownload { get; set; }
    public decimal AverageRevenuePerUser { get; set; }
    public decimal LifetimeValueFromASO { get; set; }
    public decimal CostPerAcquisition { get; set; } // $0 for organic
    public decimal ReturnOnInvestment { get; set; }
    
    // User Behavior
    public double Day1Retention { get; set; }
    public double Day7Retention { get; set; }
    public double Day30Retention { get; set; }
    public double AverageSessionDuration { get; set; }
    public double SubscriptionConversionRate { get; set; }
    public TimeSpan AverageTimeToSubscription { get; set; }
    
    // Detailed breakdowns
    public Dictionary<string, ASOKeywordPerformance> KeywordPerformance { get; set; } = new();
    public List<ASOCreativePerformance> CreativePerformance { get; set; } = new();
    public List<ASOCompetitorComparison> CompetitorAnalysis { get; set; } = new();
    public List<ASOTrendInsight> TrendInsights { get; set; } = new();
}

/// <summary>
/// Individual keyword performance metrics
/// </summary>
public class ASOKeywordPerformance
{
    public string Keyword { get; set; } = string.Empty;
    public int CurrentRank { get; set; }
    public int PreviousRank { get; set; }
    public int RankChange { get; set; }
    public int EstimatedSearchVolume { get; set; }
    public double KeywordDifficulty { get; set; }
    public long Impressions { get; set; }
    public long Downloads { get; set; }
    public double ConversionRate { get; set; }
    public decimal RevenueGenerated { get; set; }
    public TrendDirection Trend { get; set; }
    public double TrendPercentage { get; set; }
    public List<string> RelatedKeywords { get; set; } = new();
    public DateTime LastUpdated { get; set; }
}

/// <summary>
/// Creative asset performance (icons, screenshots, videos)
/// </summary>
public class ASOCreativePerformance
{
    public string CreativeId { get; set; } = string.Empty;
    public string CreativeType { get; set; } = string.Empty; // "icon", "screenshot", "video"
    public string CreativeName { get; set; } = string.Empty;
    public long Impressions { get; set; }
    public long Clicks { get; set; }
    public double ClickThroughRate { get; set; }
    public long Downloads { get; set; }
    public double ConversionRate { get; set; }
    public TrendDirection Trend { get; set; }
    public double TrendPercentage { get; set; }
    public Dictionary<string, double> PerformanceByCountry { get; set; } = new();
    public DateTime LastUpdated { get; set; }
}

/// <summary>
/// Competitor analysis and comparison
/// </summary>
public class ASOCompetitorComparison
{
    public string CompetitorName { get; set; } = string.Empty;
    public string CompetitorAppId { get; set; } = string.Empty;
    public int EstimatedDownloads { get; set; }
    public double EstimatedRevenue { get; set; }
    public Dictionary<string, int> KeywordRankings { get; set; } = new(); // keyword -> rank
    public List<string> TopKeywords { get; set; } = new();
    public double AverageRating { get; set; }
    public int ReviewCount { get; set; }
    public Dictionary<string, object> Strengths { get; set; } = new();
    public Dictionary<string, object> Weaknesses { get; set; } = new();
    public List<string> OpportunityGaps { get; set; } = new();
    public DateTime LastAnalyzed { get; set; }
}

/// <summary>
/// ASO trend insights and predictions
/// </summary>
public class ASOTrendInsight
{
    public string InsightType { get; set; } = string.Empty; // "keyword_trend", "market_opportunity", "competitive_threat"
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public double Confidence { get; set; }
    public double ImpactScore { get; set; }
    public TrendDirection Direction { get; set; }
    public Dictionary<string, object> SupportingData { get; set; } = new();
    public List<string> RecommendedActions { get; set; } = new();
    public DateTime DetectedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
}

/// <summary>
/// Cohort analysis for ASO users vs other channels
/// </summary>
public class ASOCohortAnalysis
{
    public DateTime CohortDate { get; set; }
    public string AcquisitionChannel { get; set; } = string.Empty; // "aso_organic", "aso_featured", "paid_search", "paid_social"
    public string Platform { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    public int TotalUsers { get; set; }
    
    // Retention by days
    public Dictionary<int, CohortRetentionData> RetentionData { get; set; } = new(); // day -> retention data
    
    // Revenue analysis
    public Dictionary<int, decimal> RevenueByDay { get; set; } = new(); // day -> cumulative revenue per user
    public decimal TotalLifetimeValue { get; set; }
    public decimal AverageLifetimeValue { get; set; }
    
    // Engagement metrics
    public Dictionary<int, double> SessionsPerUserByDay { get; set; } = new();
    public Dictionary<int, TimeSpan> AverageSessionDurationByDay { get; set; } = new();
    
    // Comparison metrics
    public double RelativeRetentionVsAverage { get; set; }
    public double RelativeLTVVsAverage { get; set; }
    public double QualityScore { get; set; } // Composite score based on retention + LTV + engagement
}

/// <summary>
/// Cohort retention data point
/// </summary>
public class CohortRetentionData
{
    public int Day { get; set; }
    public int ActiveUsers { get; set; }
    public double RetentionRate { get; set; }
    public int NewSubscriptions { get; set; }
    public double SubscriptionRate { get; set; }
    public decimal RevenueGenerated { get; set; }
    public double AverageSessionsPerUser { get; set; }
    public TimeSpan AverageSessionDuration { get; set; }
}

/// <summary>
/// Statistical significance analysis for A/B tests
/// </summary>
public class ASOStatisticalAnalysis
{
    public string TestId { get; set; } = string.Empty;
    public string TestName { get; set; } = string.Empty;
    public string VariantA { get; set; } = string.Empty;
    public string VariantB { get; set; } = string.Empty;
    
    // Sample sizes
    public int SampleSizeA { get; set; }
    public int SampleSizeB { get; set; }
    
    // Conversion metrics
    public int ConversionsA { get; set; }
    public int ConversionsB { get; set; }
    public double ConversionRateA { get; set; }
    public double ConversionRateB { get; set; }
    
    // Statistical measures
    public double ConfidenceLevel { get; set; } = 0.95;
    public double PValue { get; set; }
    public double ZScore { get; set; }
    public bool IsStatisticallySignificant { get; set; }
    public double ConfidenceIntervalLower { get; set; }
    public double ConfidenceIntervalUpper { get; set; }
    public double EffectSize { get; set; }
    public double PowerAnalysis { get; set; }
    
    // Practical significance
    public double MinimumDetectableEffect { get; set; } = 0.05; // 5% minimum improvement
    public bool IsPracticallySignificant { get; set; }
    public string RecommendedAction { get; set; } = string.Empty; // "deploy_winner", "continue_test", "stop_test"
    
    // Time series data
    public List<StatisticalDataPoint> TimeSeriesA { get; set; } = new();
    public List<StatisticalDataPoint> TimeSeriesB { get; set; } = new();
    
    public DateTime AnalysisDate { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Data point for time series statistical analysis
/// </summary>
public class StatisticalDataPoint
{
    public DateTime Timestamp { get; set; }
    public int Visitors { get; set; }
    public int Conversions { get; set; }
    public double ConversionRate { get; set; }
    public decimal Revenue { get; set; }
    public double CumulativeConversionRate { get; set; }
}

/// <summary>
/// Predictive analytics model for ASO forecasting
/// </summary>
public class ASOPredictiveModel
{
    public string ModelId { get; set; } = string.Empty;
    public string ModelName { get; set; } = string.Empty;
    public string ModelType { get; set; } = string.Empty; // "keyword_ranking", "download_forecast", "revenue_prediction"
    public string Platform { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    
    // Model metadata
    public DateTime TrainingDate { get; set; }
    public DateTime LastUpdated { get; set; }
    public int TrainingDataPoints { get; set; }
    public double ModelAccuracy { get; set; }
    public double ModelConfidence { get; set; }
    
    // Predictions
    public List<ASOPrediction> Predictions { get; set; } = new();
    public Dictionary<string, double> FeatureImportance { get; set; } = new();
    public List<string> ModelInputs { get; set; } = new();
    
    // Performance metrics
    public double MeanAbsoluteError { get; set; }
    public double RootMeanSquareError { get; set; }
    public double RSquared { get; set; }
}

/// <summary>
/// Individual prediction from ASO model
/// </summary>
public class ASOPrediction
{
    public DateTime PredictionDate { get; set; }
    public string MetricName { get; set; } = string.Empty; // "downloads", "rank", "revenue"
    public double PredictedValue { get; set; }
    public double ConfidenceIntervalLower { get; set; }
    public double ConfidenceIntervalUpper { get; set; }
    public double ActualValue { get; set; } = -1; // -1 if not yet available
    public double PredictionError { get; set; }
    public Dictionary<string, object> PredictionFactors { get; set; } = new();
}

/// <summary>
/// ASO alert system for monitoring and notifications
/// </summary>
public class ASOPerformanceAlert
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    public ASOAlertType Type { get; set; }
    public AlertSeverity Severity { get; set; }
    public string Platform { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public Dictionary<string, object> Metrics { get; set; } = new();
    public Dictionary<string, object> Thresholds { get; set; } = new();
    public DateTime TriggeredAt { get; set; } = DateTime.UtcNow;
    public DateTime? AcknowledgedAt { get; set; }
    public DateTime? ResolvedAt { get; set; }
    public bool IsActive { get; set; } = true;
    public List<string> RecommendedActions { get; set; } = new();
    public List<string> AffectedKeywords { get; set; } = new();
    public decimal? EstimatedImpact { get; set; }
}

/// <summary>
/// Dashboard summary for ASO analytics
/// </summary>
public class ASOAnalyticsDashboard
{
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
    public string Platform { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    
    // Key metrics
    public Dictionary<string, double> KeyMetrics { get; set; } = new(); // "total_downloads", "conversion_rate", etc.
    public Dictionary<string, TrendData> MetricTrends { get; set; } = new();
    
    // Performance data
    public ASOPerformanceMetrics PerformanceMetrics { get; set; } = new();
    public List<ASOKeywordPerformance> TopKeywords { get; set; } = new();
    public List<ASOCreativePerformance> TopCreatives { get; set; } = new();
    
    // Alerts and insights
    public List<ASOPerformanceAlert> ActiveAlerts { get; set; } = new();
    public List<ASOTrendInsight> TopInsights { get; set; } = new();
    
    // Comparative analysis
    public List<ASOCompetitorComparison> CompetitorAnalysis { get; set; } = new();
    public Dictionary<string, ASOCohortAnalysis> CohortAnalysis { get; set; } = new();
    
    // Predictions
    public List<ASOPrediction> UpcomingPredictions { get; set; } = new();
}

/// <summary>
/// Trend data with direction and percentage change
/// </summary>
public class TrendData
{
    public TrendDirection Direction { get; set; }
    public double PercentageChange { get; set; }
    public double PreviousValue { get; set; }
    public double CurrentValue { get; set; }
    public DateTime PreviousPeriod { get; set; }
    public DateTime CurrentPeriod { get; set; }
}

/// <summary>
/// Enums for ASO Analytics
/// </summary>
public enum ASOJourneyOutcome
{
    Unknown,
    Abandoned,
    Installed,
    FirstSessionCompleted,
    SubscribedTrial,
    SubscribedPaid,
    Churned
}

public enum ASOAlertType
{
    KeywordRankDrop,
    KeywordRankImprovement,
    ConversionRateChange,
    DownloadVolumeChange,
    CompetitorThreat,
    MarketOpportunity,
    CreativePerformance,
    ReviewScore,
    TechnicalIssue
}

/// <summary>
/// Content performance data for ASO context
/// </summary>
public class ASOContentPerformanceData
{
    public string ContentId { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty; // "movie", "show", "documentary"
    public string Title { get; set; } = string.Empty;
    public int TotalASOSearches { get; set; }
    public int TotalASOClicks { get; set; }
    public decimal ASOClickThroughRate { get; set; }
    public int ASODrivenDownloads { get; set; }
    public int ASODrivenSubscriptions { get; set; }
    public decimal ASOConversionRate { get; set; }
    public decimal RevenueFromASO { get; set; }
    public List<string> TopASOKeywords { get; set; } = new();
    public Dictionary<string, int> KeywordRankings { get; set; } = new();
    public TrendDirection Trend { get; set; }
    public double TrendPercentage { get; set; }
}