using System.ComponentModel.DataAnnotations;

namespace GeoLeap.Api.Models.GrowthAnalytics;

/// <summary>
/// Defines a conversion funnel with multiple steps
/// </summary>
public class ConversionFunnel
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    /// <summary>
    /// Funnel name (e.g., "User Onboarding", "Subscription Flow")
    /// </summary>
    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;
    
    /// <summary>
    /// Funnel description
    /// </summary>
    [MaxLength(500)]
    public string? Description { get; set; }
    
    /// <summary>
    /// Funnel steps in order
    /// </summary>
    public List<FunnelStep> Steps { get; set; } = new();
    
    /// <summary>
    /// Time window for funnel completion (hours)
    /// </summary>
    public int TimeWindowHours { get; set; } = 24;
    
    /// <summary>
    /// Whether this funnel is active
    /// </summary>
    public bool IsActive { get; set; } = true;
    
    /// <summary>
    /// When this funnel was created
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    /// <summary>
    /// When this funnel was last updated
    /// </summary>
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Individual step in a conversion funnel
/// </summary>
public class FunnelStep
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid FunnelId { get; set; }
    
    /// <summary>
    /// Step name (e.g., "Landing Page", "Sign Up", "Payment")
    /// </summary>
    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;
    
    /// <summary>
    /// Step order in the funnel
    /// </summary>
    public int Order { get; set; }
    
    /// <summary>
    /// Event names that trigger this step (JSON array)
    /// </summary>
    [Required]
    public string EventNames { get; set; } = "[]";
    
    /// <summary>
    /// Additional filters for this step (JSON object)
    /// </summary>
    public string? Filters { get; set; }
    
    /// <summary>
    /// Whether this step is required for conversion
    /// </summary>
    public bool IsRequired { get; set; } = true;
    
    /// <summary>
    /// Target conversion rate for this step
    /// </summary>
    public decimal? TargetRate { get; set; }
    
    // Navigation property
    public ConversionFunnel Funnel { get; set; } = null!;
}

/// <summary>
/// Funnel analysis result for a specific time period
/// </summary>
public class FunnelAnalysisResult
{
    public Guid FunnelId { get; set; }
    public string FunnelName { get; set; } = string.Empty;
    public DateTime AnalysisDate { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public List<FunnelStepResult> StepResults { get; set; } = new();
    public int TotalUsers { get; set; }
    public int CompletedUsers { get; set; }
    public decimal OverallConversionRate { get; set; }
    public TimeSpan AverageTimeToComplete { get; set; }
}

/// <summary>
/// Analysis result for individual funnel step
/// </summary>
public class FunnelStepResult
{
    public Guid StepId { get; set; }
    public string StepName { get; set; } = string.Empty;
    public int Order { get; set; }
    public int UsersEntered { get; set; }
    public int UsersCompleted { get; set; }
    public int UsersDropped { get; set; }
    public decimal ConversionRate { get; set; }
    public decimal DropOffRate { get; set; }
    public TimeSpan AverageTimeInStep { get; set; }
    public TimeSpan MedianTimeInStep { get; set; }
    public decimal? TargetRate { get; set; }
    public decimal? Performance { get; set; } // Actual vs Target
}