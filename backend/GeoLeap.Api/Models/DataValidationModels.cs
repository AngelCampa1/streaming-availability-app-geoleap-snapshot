using System.ComponentModel.DataAnnotations;

namespace GeoLeap.Api.Models;

/// <summary>
/// Result of a data validation operation
/// </summary>
public class ValidationResult
{
    public bool IsValid { get; set; }
    public DataQualityScore? QualityScore { get; set; }
    public List<string> Errors { get; set; } = new();
    public List<string> Warnings { get; set; } = new();
    public Dictionary<string, object> Metadata { get; set; } = new();
    public ValidationPerformanceMetrics Performance { get; set; } = new();

    public void MergeResult(ValidationRuleResult ruleResult)
    {
        if (!ruleResult.IsValid && ruleResult.Severity == ValidationSeverity.Critical)
        {
            IsValid = false;
        }

        if (ruleResult.Errors?.Any() == true)
        {
            Errors.AddRange(ruleResult.Errors);
        }

        if (ruleResult.Warnings?.Any() == true)
        {
            Warnings.AddRange(ruleResult.Warnings);
        }

        if (ruleResult.Metadata?.Any() == true)
        {
            foreach (var item in ruleResult.Metadata)
            {
                Metadata[item.Key] = item.Value;
            }
        }
    }

    public void MergeResult(ValidationResult other)
    {
        if (other == null) return;
        
        if (!other.IsValid) IsValid = false;
        Errors.AddRange(other.Errors);
        Warnings.AddRange(other.Warnings);

        foreach (var kvp in other.Metadata)
        {
            Metadata[kvp.Key] = kvp.Value;
        }
    }
}

/// <summary>
/// Result of a validation rule execution
/// </summary>
public class ValidationRuleResult
{
    public bool IsValid { get; set; }
    public ValidationSeverity Severity { get; set; }
    public List<string> Errors { get; set; } = new();
    public List<string> Warnings { get; set; } = new();
    public Dictionary<string, object> Metadata { get; set; } = new();
    public TimeSpan ExecutionTime { get; set; }
}

/// <summary>
/// Data quality score with breakdown
/// </summary>
public class DataQualityScore
{
    public double OverallScore { get; set; }
    public Dictionary<string, double> ComponentScores { get; set; } = new();
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public string DataType { get; set; } = string.Empty;
    public string CalculationMethod { get; set; } = string.Empty;
    public Dictionary<string, object> ScoreDetails { get; set; } = new();
}

/// <summary>
/// Result of quality scoring calculation
/// </summary>
public class QualityScoreResult
{
    public double Value { get; set; }
    public Dictionary<string, object> Details { get; set; } = new();
    public string? Explanation { get; set; }
}

/// <summary>
/// Context for validation operations
/// </summary>
public class ValidationContext
{
    public string ProviderId { get; set; } = string.Empty;
    public ContentType? ContentType { get; set; }
    public string CountryCode { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public Dictionary<string, object> Properties { get; set; } = new();
    public ValidationScope Scope { get; set; } = ValidationScope.Full;
    public string CorrelationId { get; set; } = string.Empty;
}

/// <summary>
/// Performance metrics for validation operations
/// </summary>
public class ValidationPerformanceMetrics
{
    public TimeSpan TotalExecutionTime { get; set; }
    public int RulesExecuted { get; set; }
    public int RulesPassed { get; set; }
    public int RulesFailed { get; set; }
    public Dictionary<string, TimeSpan> RuleExecutionTimes { get; set; } = new();
}

/// <summary>
/// Result of data enrichment operation
/// </summary>
public class EnrichmentResult
{
    public bool Success { get; set; }
    public object? OriginalData { get; set; }
    public object? EnrichedData { get; set; }
    public List<string> EnrichmentSteps { get; set; } = new();
    public Dictionary<string, object> Metadata { get; set; } = new();
    public TimeSpan ExecutionTime { get; set; }
    public List<string> Issues { get; set; } = new();
}

/// <summary>
/// Result of data reconciliation operation
/// </summary>
public class ReconciliationResult
{
    public bool Success { get; set; }
    public object? ReconciledData { get; set; }
    public List<DataConflict> Conflicts { get; set; } = new();
    public int SourceCount { get; set; }
    public string ReconciliationStrategy { get; set; } = string.Empty;
    public TimeSpan ExecutionTime { get; set; }
    public double ConfidenceScore { get; set; }
}

/// <summary>
/// Represents a conflict between data sources
/// </summary>
public class DataConflict
{
    public string FieldName { get; set; } = string.Empty;
    public List<string> ConflictingValues { get; set; } = new();
    public string ResolutionStrategy { get; set; } = string.Empty;
    public string? ResolvedValue { get; set; }
    public double ConfidenceLevel { get; set; }
    public List<string> DataSources { get; set; } = new();
}

/// <summary>
/// Quality alert for monitoring system
/// </summary>
public class QualityAlert
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string DataType { get; set; } = string.Empty;
    public double AverageQuality { get; set; }
    public double Threshold { get; set; }
    public int SampleSize { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public AlertSeverity Severity { get; set; }
    public string Description { get; set; } = string.Empty;
    public Dictionary<string, object> Metadata { get; set; } = new();
}

/// <summary>
/// Quality metrics for monitoring
/// </summary>
public class QualityMetric
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string DataType { get; set; } = string.Empty;
    public double QualityScore { get; set; }
    public bool ValidationPassed { get; set; }
    public long ValidationDurationMs { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public string ProviderId { get; set; } = string.Empty;
    public string CorrelationId { get; set; } = string.Empty;
    public Dictionary<string, double> ComponentScores { get; set; } = new();
}

/// <summary>
/// Configuration for validation rules
/// </summary>
public class ValidationRuleConfiguration
{
    public string RuleId { get; set; } = string.Empty;
    public bool Enabled { get; set; } = true;
    public ValidationSeverity Severity { get; set; } = ValidationSeverity.Warning;
    public List<ContentType> ApplicableContentTypes { get; set; } = new();
    public List<string> ApplicableProviders { get; set; } = new();
    public Dictionary<string, object> Parameters { get; set; } = new();
    public TimeSpan Timeout { get; set; } = TimeSpan.FromMilliseconds(500);
}

/// <summary>
/// Overall validation configuration
/// </summary>
public class ValidationConfiguration
{
    public Dictionary<string, ValidationRuleConfiguration> Rules { get; set; } = new();
    public TimeSpan GlobalTimeout { get; set; } = TimeSpan.FromSeconds(5);
    public int MaxConcurrentRules { get; set; } = 10;
    public bool EnablePerformanceMetrics { get; set; } = true;
    public bool EnableDetailedLogging { get; set; } = false;
}

/// <summary>
/// Quality monitoring settings
/// </summary>
public class QualityMonitoringSettings
{
    public TimeSpan CheckInterval { get; set; } = TimeSpan.FromMinutes(5);
    public Dictionary<string, double> QualityThresholds { get; set; } = new()
    {
        { "ContentMetadata", 75.0 },
        { "StreamingAvailabilityResponse", 80.0 }
    };
    public TimeSpan MetricsRetentionPeriod { get; set; } = TimeSpan.FromDays(30);
    public bool EnableRealTimeAlerts { get; set; } = true;
    public int MinSampleSizeForAlert { get; set; } = 10;
}

/// <summary>
/// Validation severity levels
/// </summary>
public enum ValidationSeverity
{
    Info,
    Warning,
    Error,
    Critical
}

/// <summary>
/// Alert severity levels
/// </summary>
public enum AlertSeverity
{
    Low,
    Medium,
    High,
    Critical
}

/// <summary>
/// Validation scope
/// </summary>
public enum ValidationScope
{
    Minimal,    // Only critical validations
    Standard,   // Standard validation set
    Full,       // All validations including optional
    Custom      // Custom validation set
}