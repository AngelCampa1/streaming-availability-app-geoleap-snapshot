using System.ComponentModel.DataAnnotations;

namespace GeoLeap.Api.Models.GrowthAnalytics;

/// <summary>
/// Cohort definition for retention and LTV analysis
/// </summary>
public class Cohort
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    /// <summary>
    /// Cohort name (e.g., "January 2024 Signups")
    /// </summary>
    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;
    
    /// <summary>
    /// Cohort description
    /// </summary>
    [MaxLength(500)]
    public string? Description { get; set; }
    
    /// <summary>
    /// Cohort type (acquisition, behavior, etc.)
    /// </summary>
    public CohortType Type { get; set; }
    
    /// <summary>
    /// Start date of the cohort period
    /// </summary>
    public DateTime StartDate { get; set; }
    
    /// <summary>
    /// End date of the cohort period
    /// </summary>
    public DateTime EndDate { get; set; }
    
    /// <summary>
    /// Event that defines cohort entry
    /// </summary>
    [Required, MaxLength(100)]
    public string EntryEvent { get; set; } = string.Empty;
    
    /// <summary>
    /// Additional filters for cohort inclusion (JSON)
    /// </summary>
    public string? Filters { get; set; }
    
    /// <summary>
    /// Total users in this cohort
    /// </summary>
    public int TotalUsers { get; set; }
    
    /// <summary>
    /// When this cohort was created
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    /// <summary>
    /// When cohort analysis was last updated
    /// </summary>
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Types of cohort analysis
/// </summary>
public enum CohortType
{
    Acquisition = 1,    // Users who signed up in a period
    Behavioral = 2,     // Users who performed an action
    Revenue = 3         // Users who made their first purchase
}

/// <summary>
/// Cohort retention analysis result
/// </summary>
public class CohortRetentionResult
{
    public Guid CohortId { get; set; }
    public string CohortName { get; set; } = string.Empty;
    public DateTime AnalysisDate { get; set; }
    public List<RetentionPeriodResult> Periods { get; set; } = new();
}

/// <summary>
/// Retention data for a specific time period
/// </summary>
public class RetentionPeriodResult
{
    /// <summary>
    /// Period number (0 = cohort period, 1 = first period after, etc.)
    /// </summary>
    public int Period { get; set; }
    
    /// <summary>
    /// Period label (e.g., "Week 0", "Month 1")
    /// </summary>
    public string Label { get; set; } = string.Empty;
    
    /// <summary>
    /// Start date of this period
    /// </summary>
    public DateTime StartDate { get; set; }
    
    /// <summary>
    /// End date of this period
    /// </summary>
    public DateTime EndDate { get; set; }
    
    /// <summary>
    /// Number of users active in this period
    /// </summary>
    public int ActiveUsers { get; set; }
    
    /// <summary>
    /// Retention rate for this period
    /// </summary>
    public decimal RetentionRate { get; set; }
    
    /// <summary>
    /// Total revenue from cohort in this period
    /// </summary>
    public decimal Revenue { get; set; }
    
    /// <summary>
    /// Average revenue per user in this period
    /// </summary>
    public decimal AvgRevenuePerUser { get; set; }
    
    /// <summary>
    /// Cumulative LTV up to this period
    /// </summary>
    public decimal CumulativeLTV { get; set; }
}

/// <summary>
/// User lifetime value calculation
/// </summary>
public class UserLTVResult
{
    public string UserId { get; set; } = string.Empty;
    public Guid CohortId { get; set; }
    public DateTime FirstSeen { get; set; }
    public DateTime LastSeen { get; set; }
    public int DaysActive { get; set; }
    public decimal TotalRevenue { get; set; }
    public decimal PredictedLTV { get; set; }
    public int TotalSessions { get; set; }
    public int TotalEvents { get; set; }
    public decimal EngagementScore { get; set; }
    public DateTime CalculatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Cohort comparison analysis
/// </summary>
public class CohortComparisonResult
{
    public List<CohortRetentionResult> Cohorts { get; set; } = new();
    public DateTime ComparisonDate { get; set; }
    public CohortMetric ComparisonMetric { get; set; }
    public List<CohortPerformance> Performance { get; set; } = new();
}

/// <summary>
/// Performance comparison between cohorts
/// </summary>
public class CohortPerformance
{
    public Guid CohortId { get; set; }
    public string CohortName { get; set; } = string.Empty;
    public decimal MetricValue { get; set; }
    public decimal PercentileRank { get; set; }
    public decimal ChangeFromPrevious { get; set; }
    public bool IsSignificantChange { get; set; }
}

/// <summary>
/// Metrics available for cohort comparison
/// </summary>
public enum CohortMetric
{
    RetentionRate = 1,
    LifetimeValue = 2,
    TimeToChurn = 3,
    EngagementScore = 4,
    ConversionRate = 5
}