using System.ComponentModel.DataAnnotations;

namespace GeoLeap.Api.Models.GrowthAnalytics;

/// <summary>
/// A/B test experiment configuration
/// </summary>
public class AbTestExperiment
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required, MaxLength(200)]
    public string Name { get; set; } = string.Empty;
    
    [MaxLength(1000)]
    public string? Description { get; set; }
    
    /// <summary>
    /// Traffic allocation percentage (0-100)
    /// </summary>
    public decimal TrafficAllocation { get; set; } = 100;
    
    /// <summary>
    /// Test variants configuration
    /// </summary>
    public List<AbTestVariant> Variants { get; set; } = new();
    
    /// <summary>
    /// Conversion events to track
    /// </summary>
    public List<string> ConversionEvents { get; set; } = new();
    
    public ExperimentStatus Status { get; set; } = ExperimentStatus.Draft;
    
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    [MaxLength(100)]
    public string? CreatedBy { get; set; }
}

/// <summary>
/// A/B test variant
/// </summary>
public class AbTestVariant
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;
    
    [MaxLength(500)]
    public string? Description { get; set; }
    
    /// <summary>
    /// Traffic split percentage (0-100)
    /// </summary>
    public decimal TrafficSplit { get; set; } = 50;
    
    /// <summary>
    /// Variant configuration as JSON
    /// </summary>
    public string Configuration { get; set; } = "{}";
    
    public bool IsControl { get; set; } = false;
}

/// <summary>
/// User assignment to A/B test variant
/// </summary>
public class AbTestAssignment
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public Guid ExperimentId { get; set; }
    public Guid VariantId { get; set; }
    
    [Required, MaxLength(100)]
    public string UserId { get; set; } = string.Empty;
    
    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
    
    /// <summary>
    /// Tracked conversions for this assignment
    /// </summary>
    public List<AbTestConversion> Conversions { get; set; } = new();
}

/// <summary>
/// A/B test conversion event
/// </summary>
public class AbTestConversion
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public Guid AssignmentId { get; set; }
    
    [Required, MaxLength(100)]
    public string ConversionEvent { get; set; } = string.Empty;
    
    public decimal? Value { get; set; }
    public DateTime ConvertedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// A/B test results and statistics
/// </summary>
public class AbTestResults
{
    public Guid ExperimentId { get; set; }
    public string ExperimentName { get; set; } = string.Empty;
    
    public int TotalParticipants { get; set; }
    public List<VariantResults> VariantResults { get; set; } = new();
    
    public double StatisticalSignificance { get; set; }
    public bool IsSignificant { get; set; }
    public DateTime CalculatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Results for a specific variant
/// </summary>
public class VariantResults
{
    public Guid VariantId { get; set; }
    public string VariantName { get; set; } = string.Empty;
    
    public int Participants { get; set; }
    public int Conversions { get; set; }
    public decimal ConversionRate { get; set; }
    public decimal? AverageValue { get; set; }
    
    public decimal Confidence { get; set; }
    public decimal? Lift { get; set; }
}

/// <summary>
/// Experiment status
/// </summary>
public enum ExperimentStatus
{
    Draft = 0,
    Active = 1,
    Paused = 2,
    Completed = 3,
    Cancelled = 4
}