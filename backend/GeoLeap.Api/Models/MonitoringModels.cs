using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GeoLeap.Api.Models;

/// <summary>
/// System health metrics for real-time monitoring
/// </summary>
public class MonitoringSystemHealthMetrics
{
    public string OverallStatus { get; set; } = string.Empty;
    public int HealthScore { get; set; }
    public double CpuUsagePercent { get; set; }
    public long MemoryUsageMB { get; set; }
    public long AvailableMemoryMB { get; set; }
    public bool DatabaseHealthy { get; set; }
    public bool RedisHealthy { get; set; }
    public int UptimeSeconds { get; set; }
    public int ActiveConnections { get; set; }
    public double RequestsPerMinute { get; set; }
    public double ErrorRate { get; set; }
    public DateTime LastUpdated { get; set; }
}

/// <summary>
/// Azure infrastructure metrics
/// </summary>
public class InfrastructureMetrics
{
    public string AzureRegion { get; set; } = string.Empty;
    public double AppServiceCpuPercentage { get; set; }
    public double AppServiceMemoryPercentage { get; set; }
    public double SqlDatabaseDtuPercentage { get; set; }
    public double SqlDatabaseStoragePercentage { get; set; }
    public double CdnCacheHitRatio { get; set; }
    public double CdnBandwidthUsageMbps { get; set; }
    public double NetworkLatencyMs { get; set; }
    public double DiskIoOperationsPerSecond { get; set; }
    public DateTime LastUpdated { get; set; }
}

/// <summary>
/// Alert system metrics
/// </summary>
public class AlertMetrics
{
    public int ActiveAlerts { get; set; }
    public int Alerts24Hours { get; set; }
    public int Alerts7Days { get; set; }
    public int CriticalAlerts24Hours { get; set; }
    public int WarningAlerts24Hours { get; set; }
    public int InfoAlerts24Hours { get; set; }
    public double AverageResolutionTimeMinutes { get; set; }
    public string MostFrequentAlertType { get; set; } = string.Empty;
    public DateTime LastUpdated { get; set; }
}

/// <summary>
/// Monitoring alert entity for database storage
/// </summary>
[Table("MonitoringAlerts")]
public class MonitoringAlert
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [Required]
    public string Description { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    public string Severity { get; set; } = string.Empty; // Critical, Warning, Info

    [Required]
    [MaxLength(50)]
    public string Category { get; set; } = string.Empty; // Performance, Infrastructure, Security, etc.

    [Required]
    [MaxLength(100)]
    public string Source { get; set; } = string.Empty; // System component that triggered the alert

    [Required]
    [MaxLength(20)]
    public string Status { get; set; } = string.Empty; // Active, Acknowledged, Resolved

    public DateTime CreatedAt { get; set; }

    [MaxLength(100)]
    public string? CreatedBy { get; set; }

    public DateTime? AcknowledgedAt { get; set; }

    [MaxLength(100)]
    public string? AcknowledgedBy { get; set; }

    public DateTime? ResolvedAt { get; set; }

    [MaxLength(100)]
    public string? ResolvedBy { get; set; }

    [MaxLength(500)]
    public string? ResolutionNotes { get; set; }

    public string? Metadata { get; set; } // JSON string for additional data

    [NotMapped]
    public TimeSpan? ResolutionTime => ResolvedAt.HasValue ? ResolvedAt.Value - CreatedAt : null;

    [NotMapped]
    public bool IsActive => Status == "Active";

    [NotMapped]
    public bool IsCritical => Severity == "Critical";
}

/// <summary>
/// Request model for creating alerts
/// </summary>
public class CreateAlertRequest
{
    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [Required]
    public string Description { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    public string Severity { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string Category { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string Source { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? CreatedBy { get; set; }

    public string? Metadata { get; set; }
}

/// <summary>
/// Alert acknowledgment request
/// </summary>
public class AcknowledgeAlertRequest
{
    [Required]
    public int AlertId { get; set; }

    [Required]
    [MaxLength(100)]
    public string AcknowledgedBy { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Notes { get; set; }
}

/// <summary>
/// Alert resolution request
/// </summary>
public class ResolveAlertRequest
{
    [Required]
    public int AlertId { get; set; }

    [Required]
    [MaxLength(100)]
    public string ResolvedBy { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? ResolutionNotes { get; set; }
}

/// <summary>
/// Performance threshold configuration
/// </summary>
[Table("PerformanceThresholds")]
public class PerformanceThreshold
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string MetricName { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string Category { get; set; } = string.Empty;

    public double WarningThreshold { get; set; }
    public double CriticalThreshold { get; set; }

    [Required]
    [MaxLength(20)]
    public string ComparisonOperator { get; set; } = string.Empty; // GreaterThan, LessThan, Equals

    public bool IsEnabled { get; set; } = true;

    [MaxLength(200)]
    public string? Description { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime? LastModified { get; set; }

    [MaxLength(100)]
    public string? CreatedBy { get; set; }

    [MaxLength(100)]
    public string? LastModifiedBy { get; set; }
}

/// <summary>
/// Azure Monitor alert rule configuration
/// </summary>
[Table("AzureMonitorAlertRules")]
public class AzureMonitorAlertRule
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required]
    public string Description { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    public string Severity { get; set; } = string.Empty;

    [Required]
    public string TargetResourceId { get; set; } = string.Empty; // Azure resource ID

    [Required]
    public string MetricName { get; set; } = string.Empty;

    [Required]
    [MaxLength(20)]
    public string Operator { get; set; } = string.Empty; // GreaterThan, LessThan, etc.

    public double Threshold { get; set; }

    [Required]
    [MaxLength(20)]
    public string Aggregation { get; set; } = string.Empty; // Average, Maximum, Minimum, etc.

    public int WindowSizeMinutes { get; set; } = 5; // Time window for evaluation

    public int EvaluationFrequencyMinutes { get; set; } = 1; // How often to evaluate

    public bool IsEnabled { get; set; } = true;

    public string? ActionGroupIds { get; set; } // JSON array of Azure Action Group IDs

    public DateTime CreatedAt { get; set; }
    public DateTime? LastModified { get; set; }

    [MaxLength(100)]
    public string? CreatedBy { get; set; }

    [MaxLength(100)]
    public string? LastModifiedBy { get; set; }
}

/// <summary>
/// Real-time monitoring dashboard configuration
/// </summary>
public class MonitoringDashboardConfig
{
    public List<string> EnabledMetrics { get; set; } = new();
    public int RefreshIntervalSeconds { get; set; } = 30;
    public int HistoryHours { get; set; } = 24;
    public bool ShowInfrastructureMetrics { get; set; } = true;
    public bool ShowApplicationMetrics { get; set; } = true;
    public bool ShowAlerts { get; set; } = true;
    public string? CustomDashboardUrl { get; set; }
}

/// <summary>
/// Availability test result
/// </summary>
[Table("AvailabilityTestResults")]
public class AvailabilityTestResult
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string TestName { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    public string Url { get; set; } = string.Empty;

    [MaxLength(50)]
    public string? Location { get; set; }

    public bool Success { get; set; }
    public int ResponseTimeMs { get; set; }
    public int StatusCode { get; set; }

    [MaxLength(1000)]
    public string? ErrorMessage { get; set; }

    public DateTime TestTime { get; set; }
    public DateTime CreatedAt { get; set; }

    public string? ResponseHeaders { get; set; } // JSON string
    public string? ResponseBody { get; set; } // For failed tests, may contain error details
}

/// <summary>
/// Custom performance counter data
/// </summary>
[Table("CustomPerformanceCounters")]
public class CustomPerformanceCounter
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string CounterName { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string Category { get; set; } = string.Empty;

    [MaxLength(50)]
    public string? Instance { get; set; }

    public double Value { get; set; }

    [MaxLength(20)]
    public string? Unit { get; set; }

    public DateTime Timestamp { get; set; }

    public string? Properties { get; set; } // JSON string for additional metadata
}

/// <summary>
/// Application Insights query result wrapper
/// </summary>
public class ApplicationInsightsQueryResult
{
    public bool Success { get; set; }
    public string? ErrorMessage { get; set; }
    public List<Dictionary<string, object>> Results { get; set; } = new();
    public DateTime QueryTime { get; set; }
    public TimeSpan ExecutionDuration { get; set; }
}

/// <summary>
/// Monitoring alert summary for dashboards
/// </summary>
public class AlertSummary
{
    public int TotalAlerts { get; set; }
    public int CriticalAlerts { get; set; }
    public int WarningAlerts { get; set; }
    public int InfoAlerts { get; set; }
    public int AcknowledgedAlerts { get; set; }
    public int ResolvedAlerts { get; set; }
    public double AverageResolutionTimeHours { get; set; }
    public List<string> TopAlertCategories { get; set; } = new();
    public DateTime LastAlertTime { get; set; }
}