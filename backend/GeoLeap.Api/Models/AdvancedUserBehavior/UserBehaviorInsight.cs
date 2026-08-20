using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GeoLeap.Api.Models.AdvancedUserBehavior;

/// <summary>
/// Represents aggregated user behavior insights and patterns
/// </summary>
public class UserBehaviorInsight
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    /// <summary>
    /// Insight type (page_performance, user_journey, conversion_funnel, etc.)
    /// </summary>
    [Required, MaxLength(100)]
    public string InsightType { get; set; } = string.Empty;
    
    /// <summary>
    /// Insight category for grouping
    /// </summary>
    [Required, MaxLength(50)]
    public string Category { get; set; } = string.Empty;
    
    /// <summary>
    /// Period start date for the insight
    /// </summary>
    public DateTime PeriodStart { get; set; }
    
    /// <summary>
    /// Period end date for the insight
    /// </summary>
    public DateTime PeriodEnd { get; set; }
    
    /// <summary>
    /// Dimension being analyzed (page, user_segment, device_type, etc.)
    /// </summary>
    [MaxLength(100)]
    public string? Dimension { get; set; }
    
    /// <summary>
    /// Dimension value
    /// </summary>
    [MaxLength(500)]
    public string? DimensionValue { get; set; }
    
    /// <summary>
    /// Metric name
    /// </summary>
    [Required, MaxLength(100)]
    public string MetricName { get; set; } = string.Empty;
    
    /// <summary>
    /// Metric value
    /// </summary>
    [Column(TypeName = "decimal(18,4)")]
    public decimal MetricValue { get; set; }
    
    /// <summary>
    /// Sample size for the metric
    /// </summary>
    public int SampleSize { get; set; }
    
    /// <summary>
    /// Confidence interval lower bound
    /// </summary>
    [Column(TypeName = "decimal(18,4)")]
    public decimal? ConfidenceLower { get; set; }
    
    /// <summary>
    /// Confidence interval upper bound
    /// </summary>
    [Column(TypeName = "decimal(18,4)")]
    public decimal? ConfidenceUpper { get; set; }
    
    /// <summary>
    /// Statistical significance level
    /// </summary>
    [Column(TypeName = "decimal(5,4)")]
    public decimal? SignificanceLevel { get; set; }
    
    /// <summary>
    /// Change from previous period (percentage)
    /// </summary>
    [Column(TypeName = "decimal(10,4)")]
    public decimal? PeriodChange { get; set; }
    
    /// <summary>
    /// Trend direction (up, down, stable)
    /// </summary>
    [MaxLength(20)]
    public string? TrendDirection { get; set; }
    
    /// <summary>
    /// Insight description
    /// </summary>
    [MaxLength(1000)]
    public string? Description { get; set; }
    
    /// <summary>
    /// Recommended actions based on the insight
    /// </summary>
    [Column(TypeName = "nvarchar(max)")]
    public string? Recommendations { get; set; }
    
    /// <summary>
    /// Priority score (0-100)
    /// </summary>
    public int Priority { get; set; }
    
    /// <summary>
    /// Impact level (low, medium, high, critical)
    /// </summary>
    [MaxLength(20)]
    public string? ImpactLevel { get; set; }
    
    /// <summary>
    /// When this insight was calculated
    /// </summary>
    public DateTime CalculatedAt { get; set; } = DateTime.UtcNow;
    
    /// <summary>
    /// When this insight expires and should be recalculated
    /// </summary>
    public DateTime? ExpiresAt { get; set; }
    
    /// <summary>
    /// Is this insight still valid?
    /// </summary>
    public bool IsActive { get; set; } = true;
    
    /// <summary>
    /// Additional metadata as JSON
    /// </summary>
    [Column(TypeName = "nvarchar(max)")]
    public string? Metadata { get; set; }
}

/// <summary>
/// Represents user behavior funnel analysis
/// </summary>
public class UserBehaviorFunnel
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    /// <summary>
    /// Funnel name
    /// </summary>
    [Required, MaxLength(200)]
    public string Name { get; set; } = string.Empty;
    
    /// <summary>
    /// Funnel description
    /// </summary>
    [MaxLength(1000)]
    public string? Description { get; set; }
    
    /// <summary>
    /// Analysis period start
    /// </summary>
    public DateTime PeriodStart { get; set; }
    
    /// <summary>
    /// Analysis period end
    /// </summary>
    public DateTime PeriodEnd { get; set; }
    
    /// <summary>
    /// Total users who entered the funnel
    /// </summary>
    public int TotalUsers { get; set; }
    
    /// <summary>
    /// Users who completed the funnel
    /// </summary>
    public int CompletedUsers { get; set; }
    
    /// <summary>
    /// Overall conversion rate
    /// </summary>
    [Column(TypeName = "decimal(5,4)")]
    public decimal ConversionRate { get; set; }
    
    /// <summary>
    /// Average time to complete funnel (seconds)
    /// </summary>
    public int? AverageCompletionTime { get; set; }
    
    /// <summary>
    /// Median time to complete funnel (seconds)
    /// </summary>
    public int? MedianCompletionTime { get; set; }
    
    /// <summary>
    /// Calculated at timestamp
    /// </summary>
    public DateTime CalculatedAt { get; set; } = DateTime.UtcNow;
    
    /// <summary>
    /// Funnel steps
    /// </summary>
    public virtual ICollection<UserBehaviorFunnelStep> Steps { get; set; } = new List<UserBehaviorFunnelStep>();
}

/// <summary>
/// Represents a step in a user behavior funnel
/// </summary>
public class UserBehaviorFunnelStep
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    /// <summary>
    /// Reference to the funnel
    /// </summary>
    public Guid FunnelId { get; set; }
    
    /// <summary>
    /// Step order in the funnel
    /// </summary>
    public int StepOrder { get; set; }
    
    /// <summary>
    /// Step name
    /// </summary>
    [Required, MaxLength(200)]
    public string StepName { get; set; } = string.Empty;
    
    /// <summary>
    /// Event type that defines this step
    /// </summary>
    [Required, MaxLength(100)]
    public string EventType { get; set; } = string.Empty;
    
    /// <summary>
    /// Additional filter conditions for the step
    /// </summary>
    [Column(TypeName = "nvarchar(max)")]
    public string? FilterConditions { get; set; }
    
    /// <summary>
    /// Users who reached this step
    /// </summary>
    public int UserCount { get; set; }
    
    /// <summary>
    /// Users who dropped off at this step
    /// </summary>
    public int DropoffCount { get; set; }
    
    /// <summary>
    /// Conversion rate from previous step
    /// </summary>
    [Column(TypeName = "decimal(5,4)")]
    public decimal ConversionRate { get; set; }
    
    /// <summary>
    /// Drop-off rate at this step
    /// </summary>
    [Column(TypeName = "decimal(5,4)")]
    public decimal DropoffRate { get; set; }
    
    /// <summary>
    /// Average time spent on this step (seconds)
    /// </summary>
    public int? AverageTimeOnStep { get; set; }
    
    /// <summary>
    /// Navigation property to funnel
    /// </summary>
    [ForeignKey(nameof(FunnelId))]
    public virtual UserBehaviorFunnel Funnel { get; set; } = null!;
}