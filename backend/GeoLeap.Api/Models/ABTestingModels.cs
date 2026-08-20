using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GeoLeap.Api.Models;

// Missing models for AB Testing compatibility

public class ABExperiment
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    [StringLength(200)]
    public string Name { get; set; } = string.Empty;
    
    [StringLength(1000)]
    public string Description { get; set; } = string.Empty;
    
    public DateTime StartDate { get; set; } = DateTime.UtcNow;
    
    public DateTime? EndDate { get; set; }
    
    public DateTime? ActualStartDate { get; set; }
    
    public bool IsActive { get; set; } = false;
    
    public double TrafficPercentage { get; set; } = 50.0;
    
    public double TrafficAllocation { get; set; } = 50.0;
    
    public ExperimentStatus Status { get; set; } = ExperimentStatus.Draft;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Additional properties for compatibility
    public string VariantA { get; set; } = "Control";
    public string VariantB { get; set; } = "Treatment";
    public Dictionary<string, object> Metadata { get; set; } = new();
    
    public virtual ICollection<ExperimentVariant> Variants { get; set; } = new List<ExperimentVariant>();
    
    public virtual ICollection<ExperimentEvent> Events { get; set; } = new List<ExperimentEvent>();
}

public class ExperimentVariant
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public Guid ExperimentId { get; set; }
    
    [ForeignKey(nameof(ExperimentId))]
    public virtual ABExperiment Experiment { get; set; } = null!;
    
    [Required]
    [StringLength(100)]
    public string Name { get; set; } = string.Empty;
    
    [StringLength(1000)]
    public string Description { get; set; } = string.Empty;
    
    [StringLength(5000)]
    public string Configuration { get; set; } = "{}";
    
    public double AllocationPercentage { get; set; } = 50.0;
    
    public double TrafficPercentage { get; set; } = 50.0;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class CreateExperimentRequest
{
    [Required]
    [StringLength(200)]
    public string Name { get; set; } = string.Empty;
    
    [StringLength(1000)]
    public string Description { get; set; } = string.Empty;
    
    public string HypothesisStatement { get; set; } = string.Empty;
    
    public List<string> SuccessMetrics { get; set; } = new();
    
    public DateTime? StartDate { get; set; }
    
    public DateTime? EndDate { get; set; }
    
    public double TrafficPercentage { get; set; } = 50.0;
    
    public List<CreateExperimentVariantRequest> Variants { get; set; } = new();
}

public class CreateExperimentVariantRequest
{
    [Required]
    [StringLength(100)]
    public string Name { get; set; } = string.Empty;
    
    [StringLength(1000)]
    public string Description { get; set; } = string.Empty;
    
    public double AllocationPercentage { get; set; } = 50.0;
    
    public double TrafficPercentage { get; set; } = 50.0;
    
    public string Configuration { get; set; } = "{}";
}

// IABTestingService interface moved to Services/IABTestingService.cs to avoid duplicate definition

// Additional support classes for compatibility
public class CreateABTestRequest
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public double TrafficPercentage { get; set; } = 50.0;
    public List<ABTestVariantRequest> Variants { get; set; } = new();
}

public class ABTestVariantRequest
{
    public string Name { get; set; } = string.Empty;
    public RankingConfiguration RankingConfiguration { get; set; } = new();
    public double TrafficWeight { get; set; } = 50.0;
    public Dictionary<string, object> Parameters { get; set; } = new();
}

public class ABTest
{
    public string TestId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public bool IsActive { get; set; }
    public double TrafficPercentage { get; set; }
    public ABTestStatus Status { get; set; }
    public string CreatedBy { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public List<ABTestVariant> Variants { get; set; } = new();
}

public class ABTestVariant
{
    public string VariantId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public RankingConfiguration RankingConfiguration { get; set; } = new();
    public double TrafficWeight { get; set; }
    public Dictionary<string, object> Parameters { get; set; } = new();
}

public enum ABTestStatus
{
    Draft,
    Active,
    Paused,
    Completed,
    Cancelled
}

public class ABTestAssignmentResult
{
    public string TestId { get; set; } = string.Empty;
    public string VariantId { get; set; } = string.Empty;
    public RankingConfiguration RankingConfiguration { get; set; } = new();
    public bool IsControlGroup { get; set; }
    public DateTime AssignedAt { get; set; }
}

public class ABTestAssignment
{
    public string UserId { get; set; } = string.Empty;
    public string TestId { get; set; } = string.Empty;
    public string VariantId { get; set; } = string.Empty;
    public string SessionId { get; set; } = string.Empty;
    public DateTime AssignedAt { get; set; }
}

public class ABTestResult
{
    public string TestId { get; set; } = string.Empty;
    public string VariantId { get; set; } = string.Empty;
    public string UserId { get; set; } = string.Empty;
    public string MetricName { get; set; } = string.Empty;
    public double MetricValue { get; set; }
    public DateTime RecordedAt { get; set; }
}

public class ABTestMetrics
{
    public string TestId { get; set; } = string.Empty;
    public Dictionary<string, double> VariantMetrics { get; set; } = new();
    public DateTime LastUpdated { get; set; }
}

// Additional enums and classes for A/B Testing compatibility
public enum ExperimentStatus
{
    Draft,
    Active,
    Paused,
    Completed,
    Cancelled
}

public class ExperimentEvent
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public Guid ExperimentId { get; set; }
    
    [ForeignKey(nameof(ExperimentId))]
    public virtual ABExperiment Experiment { get; set; } = null!;
    
    public Guid UserId { get; set; }
    
    [Required]
    [StringLength(100)]
    public string AssignedVariant { get; set; } = string.Empty;
    
    [Required]
    [StringLength(100)]
    public string EventName { get; set; } = string.Empty;
    
    public double Value { get; set; } = 0.0;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    [StringLength(2000)]
    public string? Properties { get; set; }
}

public class ExperimentEventRequest
{
    [Required]
    [StringLength(100)]
    public string EventName { get; set; } = string.Empty;
    
    public double Value { get; set; } = 0.0;
    
    public Dictionary<string, object> Properties { get; set; } = new();
}

public class ExperimentAssignment
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public Guid ExperimentId { get; set; }
    
    [ForeignKey(nameof(ExperimentId))]
    public virtual ABExperiment Experiment { get; set; } = null!;
    
    public Guid UserId { get; set; }
    
    [Required]
    [StringLength(100)]
    public string AssignedVariant { get; set; } = string.Empty;
    
    [StringLength(100)]
    public string SessionId { get; set; } = string.Empty;
    
    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
}

public class ExperimentResults
{
    public Guid ExperimentId { get; set; }
    
    public int TotalParticipants { get; set; }
    
    public List<VariantResult> VariantResults { get; set; } = new();
}

public class VariantResult
{
    public string VariantName { get; set; } = string.Empty;
    
    public int Participants { get; set; }
    
    public int Conversions { get; set; }
    
    public double ConversionRate { get; set; }
}

// RankingConfiguration is already defined in RankingModels.cs