using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GeoLeap.Api.Models;

/// <summary>
/// Subscription analytics metrics for dashboard reporting
/// </summary>
public class SubscriptionMetrics
{
    public DateTime PeriodStart { get; set; }
    public DateTime PeriodEnd { get; set; }
    
    // Revenue Metrics
    [Column(TypeName = "decimal(18,2)")]
    public decimal MonthlyRecurringRevenue { get; set; }
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal AnnualRecurringRevenue { get; set; }
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal AverageRevenuePerUser { get; set; }
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal CustomerLifetimeValue { get; set; }
    
    // Customer Metrics
    public long TotalActiveSubscribers { get; set; }
    public long NewSubscribers { get; set; }
    public long ChurnedSubscribers { get; set; }
    public double ChurnRate { get; set; }
    public double GrowthRate { get; set; }
    public long TrialUsers { get; set; }
    public double TrialConversionRate { get; set; }
    
    // Financial Performance
    [Column(TypeName = "decimal(18,2)")]
    public decimal TotalRevenue { get; set; }
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal RevenueGrowth { get; set; }
    
    public double PaymentSuccessRate { get; set; }
    public long FailedPayments { get; set; }
    public long SuccessfulPayments { get; set; }
    
    // Subscription Distribution
    public Dictionary<string, long> SubscriptionsByPlan { get; set; } = new();
    public Dictionary<string, long> SubscriptionsByInterval { get; set; } = new();
    public Dictionary<string, decimal> RevenueByPlan { get; set; } = new();
    
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Cohort analysis for subscription retention
/// </summary>
public class SubscriptionCohort
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateTime CohortMonth { get; set; }
    public long InitialSubscribers { get; set; }
    public Dictionary<int, long> RetainedUsersByPeriod { get; set; } = new(); // Period -> Count
    public Dictionary<int, double> RetentionRatesByPeriod { get; set; } = new(); // Period -> Rate
    public Dictionary<int, decimal> RevenueByPeriod { get; set; } = new(); // Period -> Revenue
    public string AcquisitionChannel { get; set; } = string.Empty;
    public string CustomerSegment { get; set; } = string.Empty;
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Detailed subscription analytics for business intelligence
/// </summary>
public class SubscriptionAnalyticsEvent
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public Guid? UserId { get; set; }
    public User? User { get; set; }
    
    public Guid? SubscriptionId { get; set; }
    public Subscription? Subscription { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string EventType { get; set; } = string.Empty; // created, upgraded, downgraded, canceled, reactivated, expired
    
    [MaxLength(50)]
    public string PlanType { get; set; } = string.Empty;
    
    [MaxLength(50)]
    public string PreviousPlanType { get; set; } = string.Empty;
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal Amount { get; set; }
    
    [MaxLength(3)]
    public string Currency { get; set; } = "USD";
    
    [MaxLength(50)]
    public string Interval { get; set; } = string.Empty;
    
    [MaxLength(100)]
    public string AcquisitionChannel { get; set; } = string.Empty;
    
    [MaxLength(50)]
    public string CustomerSegment { get; set; } = string.Empty;
    
    public bool IsTrialSubscription { get; set; }
    public int? TrialDays { get; set; }
    
    [MaxLength(100)]
    public string CorrelationId { get; set; } = string.Empty;
    
    public Dictionary<string, object> EventMetadata { get; set; } = new();
    
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    
    [MaxLength(2)]
    public string Country { get; set; } = string.Empty;
    
    [MaxLength(45)]
    public string IpAddress { get; set; } = string.Empty;
}

/// <summary>
/// Financial reporting data for subscription business
/// </summary>
public class FinancialReport
{
    public DateTime ReportPeriodStart { get; set; }
    public DateTime ReportPeriodEnd { get; set; }
    public string ReportType { get; set; } = string.Empty; // monthly, quarterly, annual
    
    // Revenue Breakdown
    [Column(TypeName = "decimal(18,2)")]
    public decimal SubscriptionRevenue { get; set; }
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal OneTimeRevenue { get; set; }
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal RefundsIssued { get; set; }
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal NetRevenue { get; set; }
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal ProcessingFees { get; set; }
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal TaxesCollected { get; set; }
    
    // Growth Metrics
    [Column(TypeName = "decimal(18,2)")]
    public decimal RevenueGrowthAmount { get; set; }
    
    public double RevenueGrowthPercentage { get; set; }
    
    // Customer Metrics
    public long NewCustomers { get; set; }
    public long ChurnedCustomers { get; set; }
    public long TotalActiveCustomers { get; set; }
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal CustomerAcquisitionCost { get; set; }
    
    // Payment Performance
    public long TotalPaymentAttempts { get; set; }
    public long SuccessfulPayments { get; set; }
    public long FailedPayments { get; set; }
    public double PaymentSuccessRate { get; set; }
    
    public Dictionary<string, object> AdditionalMetrics { get; set; } = new();
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Customer lifecycle analytics tracking
/// </summary>
public class CustomerLifecycleAnalytics
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;
    
    // Lifecycle Stages
    public DateTime? TrialStarted { get; set; }
    public DateTime? TrialEnded { get; set; }
    public DateTime? SubscriptionStarted { get; set; }
    public DateTime? FirstUpgrade { get; set; }
    public DateTime? FirstDowngrade { get; set; }
    public DateTime? ChurnedAt { get; set; }
    public DateTime? ReactivatedAt { get; set; }
    
    // Engagement Metrics
    public int TotalSearchesDuringTrial { get; set; }
    public int SearchesBeforeSubscription { get; set; }
    public double AverageSearchesPerMonth { get; set; }
    
    // Revenue Metrics
    [Column(TypeName = "decimal(18,2)")]
    public decimal TotalRevenue { get; set; }
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal AverageMonthlyRevenue { get; set; }
    
    public int SubscriptionDurationDays { get; set; }
    
    // Behavior Patterns
    [MaxLength(100)]
    public string AcquisitionChannel { get; set; } = string.Empty;
    
    [MaxLength(50)]
    public string CustomerSegment { get; set; } = string.Empty;
    
    public List<string> PreferredGenres { get; set; } = new();
    public List<string> PreferredServices { get; set; } = new();
    
    [MaxLength(100)]
    public string ChurnReason { get; set; } = string.Empty;
    
    public Dictionary<string, object> LifecycleMetadata { get; set; } = new();
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Retention analysis aggregated data
/// </summary>
public class RetentionAnalysis
{
    public DateTime AnalysisPeriod { get; set; }
    public int AnalysisPeriodDays { get; set; }
    
    // Overall Retention Metrics
    public double OverallRetentionRate { get; set; }
    public Dictionary<int, double> RetentionRatesByDay { get; set; } = new(); // Day -> Rate
    public Dictionary<int, double> RetentionRatesByWeek { get; set; } = new(); // Week -> Rate
    public Dictionary<int, double> RetentionRatesByMonth { get; set; } = new(); // Month -> Rate
    
    // Segment Analysis
    public Dictionary<string, double> RetentionByPlan { get; set; } = new();
    public Dictionary<string, double> RetentionByChannel { get; set; } = new();
    public Dictionary<string, double> RetentionBySegment { get; set; } = new();
    
    // Churn Patterns
    public List<ChurnPattern> ChurnPatterns { get; set; } = new();
    public Dictionary<string, long> ChurnReasons { get; set; } = new();
    public Dictionary<int, long> ChurnByDayOfSubscription { get; set; } = new();
    
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Churn pattern identification
/// </summary>
public class ChurnPattern
{
    public string PatternName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public double ChurnProbability { get; set; }
    public List<string> Indicators { get; set; } = new();
    public long AffectedCustomers { get; set; }
    public decimal RevenueAtRisk { get; set; }
    public List<string> PreventionStrategies { get; set; } = new();
    public DateTime IdentifiedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Payment analytics aggregated by various dimensions
/// </summary>
public class PaymentPerformanceAnalytics
{
    public DateTime PeriodStart { get; set; }
    public DateTime PeriodEnd { get; set; }
    
    // Transaction Metrics
    public long TotalTransactions { get; set; }
    public long SuccessfulTransactions { get; set; }
    public long FailedTransactions { get; set; }
    public double SuccessRate { get; set; }
    
    // Financial Metrics
    [Column(TypeName = "decimal(18,2)")]
    public decimal TotalVolume { get; set; }
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal SuccessfulVolume { get; set; }
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal FailedVolume { get; set; }
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal AverageTransactionValue { get; set; }
    
    // Performance by Payment Method
    public Dictionary<string, PaymentMethodMetrics> MetricsByPaymentMethod { get; set; } = new();
    
    // Geographic Performance
    public Dictionary<string, PaymentGeographicMetrics> MetricsByCountry { get; set; } = new();
    
    // Failure Analysis
    public Dictionary<string, long> FailuresByCode { get; set; } = new();
    public Dictionary<string, long> FailuresByReason { get; set; } = new();
    
    // Processing Performance
    public double AverageProcessingTimeMs { get; set; }
    public double MedianProcessingTimeMs { get; set; }
    public double P95ProcessingTimeMs { get; set; }
    
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Payment method specific metrics
/// </summary>
public class PaymentMethodMetrics
{
    public string PaymentMethod { get; set; } = string.Empty;
    public long TransactionCount { get; set; }
    public long SuccessfulCount { get; set; }
    public long FailedCount { get; set; }
    public double SuccessRate { get; set; }
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal TotalVolume { get; set; }
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal AverageAmount { get; set; }
    
    public double AverageProcessingTimeMs { get; set; }
    public Dictionary<string, long> TopFailureReasons { get; set; } = new();
}

/// <summary>
/// Geographic payment performance metrics
/// </summary>
public class PaymentGeographicMetrics
{
    public string CountryCode { get; set; } = string.Empty;
    public string CountryName { get; set; } = string.Empty;
    public long TransactionCount { get; set; }
    public double SuccessRate { get; set; }
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal TotalVolume { get; set; }
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal AverageAmount { get; set; }
    
    public Dictionary<string, long> PreferredPaymentMethods { get; set; } = new();
    public Dictionary<string, long> CommonFailureReasons { get; set; } = new();
}

/// <summary>
/// Automated report configuration
/// </summary>
public class ReportSchedule
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;
    
    [MaxLength(500)]
    public string Description { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(50)]
    public string ReportType { get; set; } = string.Empty; // subscription_metrics, financial_summary, cohort_analysis
    
    [Required]
    [MaxLength(50)]
    public string Frequency { get; set; } = string.Empty; // daily, weekly, monthly, quarterly
    
    [Required]
    public string Recipients { get; set; } = string.Empty; // JSON array of email addresses
    
    public ReportFormat Format { get; set; } = ReportFormat.PDF;
    
    [MaxLength(50)]
    public string TimeZone { get; set; } = "UTC";
    
    public Dictionary<string, object> ReportParameters { get; set; } = new();
    
    public bool IsActive { get; set; } = true;
    public DateTime? LastGenerated { get; set; }
    public DateTime? NextScheduled { get; set; }
    
    public int SuccessfulDeliveries { get; set; } = 0;
    public int FailedDeliveries { get; set; } = 0;
    
    [MaxLength(100)]
    public string CreatedBy { get; set; } = string.Empty;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Generated report tracking
/// </summary>
public class GeneratedReport
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public Guid? ScheduleId { get; set; }
    public ReportSchedule? Schedule { get; set; }
    
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(50)]
    public string ReportType { get; set; } = string.Empty;
    
    public DateTime PeriodStart { get; set; }
    public DateTime PeriodEnd { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string Status { get; set; } = "generating"; // generating, completed, failed, delivered
    
    [MaxLength(500)]
    public string FilePath { get; set; } = string.Empty;
    
    public long FileSizeBytes { get; set; }
    
    public ReportFormat Format { get; set; }
    
    public int GenerationTimeSeconds { get; set; }
    
    [MaxLength(2000)]
    public string ErrorMessage { get; set; } = string.Empty;
    
    public string Recipients { get; set; } = string.Empty; // JSON array
    
    public bool WasDelivered { get; set; }
    public DateTime? DeliveredAt { get; set; }
    
    [MaxLength(100)]
    public string GeneratedBy { get; set; } = string.Empty;
    
    [MaxLength(100)]
    public string CorrelationId { get; set; } = string.Empty;
    
    public Dictionary<string, object> ReportMetadata { get; set; } = new();
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Subscription analytics dashboard summary for real-time display
/// </summary>
public class SubscriptionAnalyticsSummary
{
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
    public SubscriptionMetrics CurrentPeriodMetrics { get; set; } = new();
    public SubscriptionMetrics PreviousPeriodMetrics { get; set; } = new();
    public List<SubscriptionCohort> RecentCohorts { get; set; } = new();
    public RetentionAnalysis RetentionAnalysis { get; set; } = new();
    public PaymentPerformanceAnalytics PaymentPerformance { get; set; } = new();
    public List<SubscriptionTrendAlert> TrendAlerts { get; set; } = new();
    public Dictionary<string, double> KeyPerformanceIndicators { get; set; } = new();
    public List<BusinessInsight> TopInsights { get; set; } = new();
}

/// <summary>
/// Subscription trend alerts for monitoring
/// </summary>
public class SubscriptionTrendAlert
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    [MaxLength(50)]
    public string AlertType { get; set; } = string.Empty; // churn_spike, revenue_drop, conversion_decline
    
    public AlertSeverity Severity { get; set; }
    
    [Required]
    [MaxLength(100)]
    public string Title { get; set; } = string.Empty;
    
    [MaxLength(500)]
    public string Description { get; set; } = string.Empty;
    
    public Dictionary<string, object> Metrics { get; set; } = new();
    
    [Column(TypeName = "decimal(18,2)")]
    public decimal? RevenueImpact { get; set; }
    
    public long? CustomerImpact { get; set; }
    
    public DateTime TriggeredAt { get; set; } = DateTime.UtcNow;
    public DateTime? ResolvedAt { get; set; }
    public DateTime? AcknowledgedAt { get; set; }
    
    public bool IsActive { get; set; } = true;
    public bool RequiresAction { get; set; } = true;
    
    public List<string> RecommendedActions { get; set; } = new();
    
    [MaxLength(100)]
    public string CorrelationId { get; set; } = string.Empty;
}

/// <summary>
/// Business insights generated from analytics
/// </summary>
public class BusinessInsight
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public BusinessInsightType Type { get; set; }
    public BusinessInsightPriority Priority { get; set; }
    public object? Value { get; set; }
    public TrendDirection Trend { get; set; }
    public double? TrendPercentage { get; set; }
    public decimal? RevenueImpact { get; set; }
    public List<string> ActionableRecommendations { get; set; } = new();
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
    public Dictionary<string, object> SupportingData { get; set; } = new();
}

/// <summary>
/// Data export request tracking
/// </summary>
public class AnalyticsDataExport
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    [MaxLength(50)]
    public string ExportType { get; set; } = string.Empty; // subscription_data, financial_data, customer_data
    
    public DateTime PeriodStart { get; set; }
    public DateTime PeriodEnd { get; set; }

    public ExportFormat Format { get; set; } = new ExportFormat { Id = "csv", Name = "CSV", Description = "Comma-separated values", MimeType = "text/csv" };

    [Required]
    [MaxLength(50)]
    public string Status { get; set; } = "requested"; // requested, processing, completed, failed
    
    [MaxLength(500)]
    public string FilePath { get; set; } = string.Empty;
    
    public long FileSizeBytes { get; set; }
    public long RecordCount { get; set; }
    
    [Required]
    public Guid RequestedBy { get; set; }
    public User RequestedByUser { get; set; } = null!;
    
    public Dictionary<string, object> ExportParameters { get; set; } = new();
    
    [MaxLength(2000)]
    public string ErrorMessage { get; set; } = string.Empty;
    
    public DateTime? CompletedAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
    
    [MaxLength(100)]
    public string CorrelationId { get; set; } = string.Empty;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Supporting enums
/// </summary>
public enum ReportFormat
{
    PDF,
    Excel,
    CSV,
    JSON
}


public enum BusinessInsightType
{
    RevenueOpportunity,
    ChurnRisk,
    GrowthTrend,
    PaymentOptimization,
    CustomerSegment,
    Competitive
}

public enum BusinessInsightPriority
{
    Low,
    Medium,
    High,
    Critical
}

/// <summary>
/// DTO for subscription analytics API responses
/// </summary>
public class SubscriptionAnalyticsDto
{
    public SubscriptionMetrics Metrics { get; set; } = new();
    public List<SubscriptionCohort> Cohorts { get; set; } = new();
    public RetentionAnalysis Retention { get; set; } = new();
    public PaymentPerformanceAnalytics PaymentPerformance { get; set; } = new();
    public List<SubscriptionTrendAlert> Alerts { get; set; } = new();
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
}

public class FinancialReportDto
{
    public FinancialReport Report { get; set; } = new();
    public List<ChartData> Charts { get; set; } = new();
    public Dictionary<string, object> SummaryMetrics { get; set; } = new();
}

public class ChartData
{
    public string ChartType { get; set; } = string.Empty; // line, bar, pie, area
    public string Title { get; set; } = string.Empty;
    public List<ChartSeries> Series { get; set; } = new();
    public List<string> Categories { get; set; } = new();
    public Dictionary<string, object> ChartOptions { get; set; } = new();
}

public class ChartSeries
{
    public string Name { get; set; } = string.Empty;
    public List<object> Data { get; set; } = new();
    public string Color { get; set; } = string.Empty;
}

/// <summary>
/// Request DTOs for analytics endpoints
/// </summary>
public class AnalyticsRequest
{
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string? GroupBy { get; set; } // daily, weekly, monthly
    public List<string>? Metrics { get; set; }
    public Dictionary<string, object>? Filters { get; set; }
}

public class CohortAnalysisRequest
{
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string CohortType { get; set; } = "monthly"; // daily, weekly, monthly
    public string? AcquisitionChannel { get; set; }
    public string? CustomerSegment { get; set; }
    public int MaxPeriods { get; set; } = 12;
}

public class ExportRequest
{
    [Required]
    public string ExportType { get; set; } = string.Empty;
    
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public ExportFormat Format { get; set; } = new ExportFormat { Id = "csv", Name = "CSV", Description = "Comma-separated values", MimeType = "text/csv" };
    public Dictionary<string, object>? Parameters { get; set; }
}

public class ReportScheduleRequest
{
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;
    
    [MaxLength(500)]
    public string Description { get; set; } = string.Empty;
    
    [Required]
    public string ReportType { get; set; } = string.Empty;
    
    [Required]
    public string Frequency { get; set; } = string.Empty;
    
    [Required]
    public List<string> Recipients { get; set; } = new();
    
    public ReportFormat Format { get; set; } = ReportFormat.PDF;
    public string TimeZone { get; set; } = "UTC";
    public Dictionary<string, object>? Parameters { get; set; }
}