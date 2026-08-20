using System.ComponentModel.DataAnnotations;

namespace GeoLeap.Api.Models.GrowthAnalytics;

/// <summary>
/// Growth analytics alert configuration
/// </summary>
public class GrowthAlert
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required, MaxLength(200)]
    public string Name { get; set; } = string.Empty;
    
    [MaxLength(1000)]
    public string? Description { get; set; }
    
    [Required, MaxLength(100)]
    public string UserId { get; set; } = string.Empty;
    
    /// <summary>
    /// Metric to monitor (conversion_rate, traffic_drop, etc.)
    /// </summary>
    [Required, MaxLength(100)]
    public string Metric { get; set; } = string.Empty;
    
    /// <summary>
    /// Alert condition (threshold, percentage_change, etc.)
    /// </summary>
    public AlertCondition Condition { get; set; }
    
    /// <summary>
    /// Threshold value for the condition
    /// </summary>
    public decimal ThresholdValue { get; set; }
    
    /// <summary>
    /// Time window for evaluation (e.g., "1h", "24h", "7d")
    /// </summary>
    [MaxLength(20)]
    public string TimeWindow { get; set; } = "1h";
    
    /// <summary>
    /// How often to evaluate this alert
    /// </summary>
    [MaxLength(20)]
    public string EvaluationFrequency { get; set; } = "5m";
    
    /// <summary>
    /// Notification channels (email, slack, webhook)
    /// </summary>
    public List<string> NotificationChannels { get; set; } = new();
    
    /// <summary>
    /// Alert severity level
    /// </summary>
    public AlertSeverity Severity { get; set; } = AlertSeverity.Medium;
    
    public bool IsEnabled { get; set; } = true;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastEvaluatedAt { get; set; }
    
    /// <summary>
    /// Additional configuration as JSON
    /// </summary>
    public string Configuration { get; set; } = "{}";
}

/// <summary>
/// Alert trigger record
/// </summary>
public class AlertTrigger
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public Guid AlertId { get; set; }
    public GrowthAlert Alert { get; set; } = null!;
    
    /// <summary>
    /// Value that triggered the alert
    /// </summary>
    public decimal TriggerValue { get; set; }
    
    /// <summary>
    /// Threshold that was exceeded
    /// </summary>
    public decimal ThresholdValue { get; set; }
    
    /// <summary>
    /// Alert message generated
    /// </summary>
    [MaxLength(1000)]
    public string Message { get; set; } = string.Empty;
    
    /// <summary>
    /// Additional context data as JSON
    /// </summary>
    public string Context { get; set; } = "{}";
    
    public DateTime TriggeredAt { get; set; } = DateTime.UtcNow;
    
    /// <summary>
    /// Whether notifications were sent successfully
    /// </summary>
    public bool NotificationsSent { get; set; } = false;
    
    /// <summary>
    /// Error message if notification failed
    /// </summary>
    [MaxLength(500)]
    public string? NotificationError { get; set; }
}

/// <summary>
/// Alert condition types
/// </summary>
public enum AlertCondition
{
    GreaterThan = 0,
    LessThan = 1,
    GreaterThanOrEqual = 2,
    LessThanOrEqual = 3,
    PercentageIncrease = 4,
    PercentageDecrease = 5,
    ThresholdCrossed = 6,
    AnomalyDetected = 7
}

/// <summary>
/// Alert severity levels
/// </summary>
public enum AlertSeverity
{
    Low = 0,
    Medium = 1,
    High = 2,
    Critical = 3
}