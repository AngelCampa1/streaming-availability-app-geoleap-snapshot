using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;

namespace GeoLeap.Api.Models;

/// <summary>
/// Core notification entity with full analytics support - US-8.2
/// </summary>
public class Notification
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public Guid UserId { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string Type { get; set; } = string.Empty; // availability_change, price_drop, content_expiring, etc.
    
    [Required]
    [MaxLength(20)]
    public string Priority { get; set; } = "medium"; // low, medium, high, critical
    
    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;
    
    [Required]
    public string Message { get; set; } = string.Empty;
    
    [MaxLength(500)]
    public string? ActionUrl { get; set; }
    
    [Column(TypeName = "nvarchar(max)")]
    public string? DataJson { get; set; }
    
    [Required]
    [MaxLength(20)]
    public string Status { get; set; } = "pending"; // pending, sent, delivered, failed, read
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ScheduledFor { get; set; }
    public DateTime? SentAt { get; set; }
    public DateTime? ReadAt { get; set; }
    public DateTime? ExpiresAt { get; set; }
    
    [MaxLength(100)]
    public string? CorrelationId { get; set; }
    
    [MaxLength(50)]
    public string? CampaignId { get; set; }
    
    // Additional properties for compatibility
    [MaxLength(50)]
    public string Category { get; set; } = string.Empty;
    
    [MaxLength(50)]
    public string? TemplateId { get; set; }
    
    [Column(TypeName = "nvarchar(max)")]
    public string? TemplateDataJson { get; set; }
    
    // Computed properties
    [NotMapped]
    public Dictionary<string, object>? Data
    {
        get => string.IsNullOrEmpty(DataJson) 
            ? null 
            : JsonSerializer.Deserialize<Dictionary<string, object>>(DataJson);
        set => DataJson = value != null 
            ? JsonSerializer.Serialize(value) 
            : null;
    }
    
    [NotMapped]
    public bool IsRead => ReadAt.HasValue;
    
    [NotMapped]
    public bool IsExpired => ExpiresAt.HasValue && ExpiresAt.Value < DateTime.UtcNow;
    
    [NotMapped]
    public Dictionary<string, object>? TemplateData
    {
        get => string.IsNullOrEmpty(TemplateDataJson) 
            ? null 
            : JsonSerializer.Deserialize<Dictionary<string, object>>(TemplateDataJson);
        set => TemplateDataJson = value != null 
            ? JsonSerializer.Serialize(value) 
            : null;
    }
    
    // Navigation properties
    [ForeignKey("UserId")]
    public virtual User User { get; set; } = null!;
    
    public virtual List<NotificationDelivery> Deliveries { get; set; } = new();
    public virtual List<NotificationInteraction> Interactions { get; set; } = new();
}

/// <summary>
/// Tracks delivery attempts across multiple channels - US-8.2
/// </summary>
public class NotificationDelivery
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public Guid NotificationId { get; set; }
    
    [Required]
    [MaxLength(20)]
    public string Channel { get; set; } = string.Empty; // email, push, sms, in_app
    
    [Required]
    [MaxLength(20)]
    public string Status { get; set; } = "pending"; // pending, sent, delivered, failed, bounced, rejected
    
    public DateTime AttemptedAt { get; set; } = DateTime.UtcNow;
    public DateTime? DeliveredAt { get; set; }
    
    [MaxLength(500)]
    public string? ErrorMessage { get; set; }
    
    [MaxLength(100)]
    public string? ExternalId { get; set; } // Provider-specific ID
    
    public int AttemptCount { get; set; } = 1;
    public DateTime? NextRetryAt { get; set; }
    
    // Additional properties for compatibility
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public int RetryCount { get; set; } = 0;
    public DateTime? LastRetryAt { get; set; }
    
    [Column(TypeName = "nvarchar(max)")]
    public string? MetadataJson { get; set; }
    
    // Navigation properties
    [ForeignKey("NotificationId")]
    public virtual Notification Notification { get; set; } = null!;
    
    [NotMapped]
    public Dictionary<string, object>? Metadata
    {
        get => string.IsNullOrEmpty(MetadataJson) 
            ? null 
            : JsonSerializer.Deserialize<Dictionary<string, object>>(MetadataJson);
        set => MetadataJson = value != null 
            ? JsonSerializer.Serialize(value) 
            : null;
    }
}

/// <summary>
/// Tracks user interactions with notifications - US-8.2 Analytics
/// </summary>
public class NotificationInteraction
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public Guid NotificationId { get; set; }
    
    [Required]
    [MaxLength(20)]
    public string InteractionType { get; set; } = string.Empty; // opened, clicked, dismissed, unsubscribed
    
    public DateTime InteractionAt { get; set; } = DateTime.UtcNow;
    
    [MaxLength(500)]
    public string? InteractionUrl { get; set; }
    
    [MaxLength(100)]
    public string? UserAgent { get; set; }
    
    [MaxLength(50)]
    public string? IpAddress { get; set; }
    
    [MaxLength(50)]
    public string? DeviceType { get; set; }
    
    [MaxLength(50)]
    public string? Platform { get; set; }
    
    [Column(TypeName = "nvarchar(max)")]
    public string? ContextJson { get; set; }
    
    // Navigation properties
    [ForeignKey("NotificationId")]
    public virtual Notification Notification { get; set; } = null!;
    
    [NotMapped]
    public Dictionary<string, object>? Context
    {
        get => string.IsNullOrEmpty(ContextJson) 
            ? null 
            : JsonSerializer.Deserialize<Dictionary<string, object>>(ContextJson);
        set => ContextJson = value != null 
            ? JsonSerializer.Serialize(value) 
            : null;
    }
}

/// <summary>
/// Template system for notification content - US-8.2
/// </summary>
public class NotificationTemplate
{
    [Key]
    [MaxLength(100)]
    public string Id { get; set; } = string.Empty; // e.g., "availability_change_email"
    
    [Required]
    [MaxLength(50)]
    public string Type { get; set; } = string.Empty; // availability_change, price_drop, etc.
    
    [Required]
    [MaxLength(20)]
    public string Channel { get; set; } = string.Empty; // email, push, sms, in_app
    
    [Required]
    [MaxLength(200)]
    public string Subject { get; set; } = string.Empty;
    
    [Required]
    public string Template { get; set; } = string.Empty; // DotLiquid template
    
    [MaxLength(10)]
    public string Version { get; set; } = "1.0";
    
    [MaxLength(5)]
    public string Language { get; set; } = "en";
    
    public bool IsActive { get; set; } = true;
    
    [Column(TypeName = "nvarchar(max)")]
    public string? DefaultDataJson { get; set; }
    
    [Column(TypeName = "nvarchar(max)")]
    public string? ValidationRulesJson { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    [MaxLength(100)]
    public string CreatedBy { get; set; } = "system";
    
    [NotMapped]
    public Dictionary<string, object>? DefaultData
    {
        get => string.IsNullOrEmpty(DefaultDataJson) 
            ? null 
            : JsonSerializer.Deserialize<Dictionary<string, object>>(DefaultDataJson);
        set => DefaultDataJson = value != null 
            ? JsonSerializer.Serialize(value) 
            : null;
    }
    
    [NotMapped]
    public Dictionary<string, object>? ValidationRules
    {
        get => string.IsNullOrEmpty(ValidationRulesJson) 
            ? null 
            : JsonSerializer.Deserialize<Dictionary<string, object>>(ValidationRulesJson);
        set => ValidationRulesJson = value != null 
            ? JsonSerializer.Serialize(value) 
            : null;
    }
}

/// <summary>
/// User notification preferences with granular controls - US-8.2 Enhanced
/// </summary>
public class NotificationSettings
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public Guid UserId { get; set; }
    
    // Global notification controls
    public bool GloballyEnabled { get; set; } = true;
    public DateTime? GlobalDisabledUntil { get; set; }
    
    // Channel preferences
    public bool EmailEnabled { get; set; } = true;
    public bool PushEnabled { get; set; } = true;
    public bool SmsEnabled { get; set; } = false;
    public bool InAppEnabled { get; set; } = true;
    
    // Notification type preferences (JSON for flexibility)
    [Column(TypeName = "nvarchar(max)")]
    public string NotificationTypesJson { get; set; } = "{}";
    
    // Frequency controls
    [MaxLength(20)]
    public string DefaultFrequency { get; set; } = "immediate"; // immediate, hourly, daily, weekly
    
    public int MaxNotificationsPerHour { get; set; } = 10;
    public int MaxNotificationsPerDay { get; set; } = 50;
    
    // Timing preferences
    public TimeSpan? QuietHoursStart { get; set; }
    public TimeSpan? QuietHoursEnd { get; set; }
    
    [MaxLength(50)]
    public string TimeZone { get; set; } = "UTC";
    
    [Column(TypeName = "nvarchar(max)")]
    public string QuietDaysJson { get; set; } = "[]"; // Days of week as JSON array
    
    // Content filtering
    [Column(TypeName = "nvarchar(max)")]
    public string ContentFiltersJson { get; set; } = "{}";
    
    public decimal? MinimumRating { get; set; }
    
    // Aggregation settings
    public bool AggregateNotifications { get; set; } = true;
    public int AggregationWindowMinutes { get; set; } = 30;
    
    // Advanced features
    public bool EnableSmartTiming { get; set; } = false;
    public bool EnablePredictiveFiltering { get; set; } = false;
    
    [MaxLength(20)]
    public string NotificationTone { get; set; } = "friendly"; // friendly, professional, minimal
    
    // Digest preferences
    public bool DailyDigestEnabled { get; set; } = false;
    public bool WeeklyDigestEnabled { get; set; } = true;
    public bool MonthlyDigestEnabled { get; set; } = false;
    
    public TimeSpan DigestDeliveryTime { get; set; } = new TimeSpan(9, 0, 0); // 9 AM
    public DayOfWeek WeeklyDigestDay { get; set; } = DayOfWeek.Monday;
    public int MonthlyDigestDay { get; set; } = 1; // 1st of month
    
    // GDPR and compliance
    public bool AllowDataProcessing { get; set; } = true;
    public bool AllowProfileAnalysis { get; set; } = true;
    
    [Column(TypeName = "nvarchar(max)")]
    public string UnsubscribedTypesJson { get; set; } = "[]";
    
    public DateTime? UnsubscribedFromAllAt { get; set; }
    
    [MaxLength(500)]
    public string? UnsubscribeReason { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    [ForeignKey("UserId")]
    public virtual User User { get; set; } = null!;
    
    // Computed properties
    [NotMapped]
    public Dictionary<string, bool> NotificationTypes
    {
        get => string.IsNullOrEmpty(NotificationTypesJson) 
            ? new Dictionary<string, bool>() 
            : JsonSerializer.Deserialize<Dictionary<string, bool>>(NotificationTypesJson) ?? new();
        set => NotificationTypesJson = JsonSerializer.Serialize(value);
    }
    
    [NotMapped]
    public List<DayOfWeek> QuietDays
    {
        get => string.IsNullOrEmpty(QuietDaysJson) 
            ? new List<DayOfWeek>() 
            : JsonSerializer.Deserialize<List<DayOfWeek>>(QuietDaysJson) ?? new();
        set => QuietDaysJson = JsonSerializer.Serialize(value);
    }
    
    [NotMapped]
    public Dictionary<string, object> ContentFilters
    {
        get => string.IsNullOrEmpty(ContentFiltersJson) 
            ? new Dictionary<string, object>() 
            : JsonSerializer.Deserialize<Dictionary<string, object>>(ContentFiltersJson) ?? new();
        set => ContentFiltersJson = JsonSerializer.Serialize(value);
    }
    
    [NotMapped]
    public List<string> UnsubscribedTypes
    {
        get => string.IsNullOrEmpty(UnsubscribedTypesJson) 
            ? new List<string>() 
            : JsonSerializer.Deserialize<List<string>>(UnsubscribedTypesJson) ?? new();
        set => UnsubscribedTypesJson = JsonSerializer.Serialize(value);
    }
    
    [NotMapped]
    public bool IsInQuietHours
    {
        get
        {
            if (!QuietHoursStart.HasValue || !QuietHoursEnd.HasValue)
                return false;
                
            var now = DateTime.UtcNow.TimeOfDay;
            var start = QuietHoursStart.Value;
            var end = QuietHoursEnd.Value;
            
            if (start <= end)
                return now >= start && now <= end;
            else
                return now >= start || now <= end; // Crosses midnight
        }
    }
    
    [NotMapped]
    public bool IsQuietDay => QuietDays.Contains(DateTime.UtcNow.DayOfWeek);
    
    [NotMapped]
    public bool IsGloballyUnsubscribed => UnsubscribedFromAllAt.HasValue;
}

/// <summary>
/// Campaign management for bulk notifications - US-8.2
/// </summary>
public class NotificationCampaign
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;
    
    [MaxLength(500)]
    public string? Description { get; set; }
    
    [Required]
    [MaxLength(100)]
    public string TemplateId { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(20)]
    public string Status { get; set; } = "draft"; // draft, scheduled, running, completed, failed, cancelled
    
    [Column(TypeName = "nvarchar(max)")]
    public string TargetCriteriaJson { get; set; } = "{}";
    
    [Column(TypeName = "nvarchar(max)")]
    public string TemplateDataJson { get; set; } = "{}";
    
    public DateTime? ScheduledFor { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    
    // Progress tracking
    public int TargetUserCount { get; set; }
    public int ProcessedCount { get; set; }
    public int SuccessCount { get; set; }
    public int FailureCount { get; set; }
    public int SkippedCount { get; set; }
    
    [MaxLength(100)]
    public string CreatedBy { get; set; } = "system";
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    public virtual List<Notification> Notifications { get; set; } = new();
    
    // Computed properties
    [NotMapped]
    public Dictionary<string, object> TargetCriteria
    {
        get => string.IsNullOrEmpty(TargetCriteriaJson) 
            ? new Dictionary<string, object>() 
            : JsonSerializer.Deserialize<Dictionary<string, object>>(TargetCriteriaJson) ?? new();
        set => TargetCriteriaJson = JsonSerializer.Serialize(value);
    }
    
    [NotMapped]
    public Dictionary<string, object> TemplateData
    {
        get => string.IsNullOrEmpty(TemplateDataJson) 
            ? new Dictionary<string, object>() 
            : JsonSerializer.Deserialize<Dictionary<string, object>>(TemplateDataJson) ?? new();
        set => TemplateDataJson = JsonSerializer.Serialize(value);
    }
    
    [NotMapped]
    public double ProgressPercentage => TargetUserCount > 0 
        ? (double)ProcessedCount / TargetUserCount * 100 
        : 0;
        
    [NotMapped]
    public double SuccessRate => ProcessedCount > 0 
        ? (double)SuccessCount / ProcessedCount * 100 
        : 0;
}

/// <summary>
/// Rate limiting and throttling for notifications - US-8.2 Anti-spam
/// </summary>
public class NotificationRateLimit
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public Guid UserId { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string NotificationType { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(20)]
    public string TimeWindow { get; set; } = string.Empty; // hour, day, week, month
    
    public DateTime WindowStart { get; set; }
    public DateTime WindowEnd { get; set; }
    
    public int Count { get; set; }
    public int Limit { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    [ForeignKey("UserId")]
    public virtual User User { get; set; } = null!;
    
    [NotMapped]
    public bool IsExceeded => Count >= Limit;
    
    [NotMapped]
    public bool IsExpired => DateTime.UtcNow > WindowEnd;
}

/// <summary>
/// Queue management for background processing - US-8.2
/// </summary>
public class NotificationQueue
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public Guid NotificationId { get; set; }
    
    [Required]
    [MaxLength(20)]
    public string Priority { get; set; } = "medium"; // low, medium, high, critical
    
    [Required]
    [MaxLength(20)]
    public string Status { get; set; } = "pending"; // pending, processing, completed, failed, retrying
    
    public DateTime QueuedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ProcessedAt { get; set; }
    public DateTime? ScheduledFor { get; set; }
    
    public int RetryCount { get; set; } = 0;
    public DateTime? NextRetryAt { get; set; }
    
    [MaxLength(500)]
    public string? ErrorMessage { get; set; }
    
    [MaxLength(100)]
    public string? ProcessorId { get; set; }
    
    // Navigation properties
    [ForeignKey("NotificationId")]
    public virtual Notification Notification { get; set; } = null!;
    
    [NotMapped]
    public bool IsReadyToProcess => Status == "pending" && 
        (ScheduledFor == null || ScheduledFor <= DateTime.UtcNow);
        
    [NotMapped]
    public bool NeedsRetry => Status == "failed" && 
        NextRetryAt.HasValue && NextRetryAt <= DateTime.UtcNow;
}

/// <summary>
/// Notification validation result DTO - specific to notification engine
/// </summary>
public class NotificationValidationResult
{
    public bool IsValid { get; set; }
    public List<NotificationValidationError> Errors { get; set; } = new();
    public List<NotificationValidationWarning> Warnings { get; set; } = new();
}

/// <summary>
/// Notification validation error DTO
/// </summary>
public class NotificationValidationError
{
    public string Field { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public object? Value { get; set; }
}

/// <summary>
/// Notification validation warning DTO
/// </summary>
public class NotificationValidationWarning
{
    public string Field { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public object? Value { get; set; }
}

