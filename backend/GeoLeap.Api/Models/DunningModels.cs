using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GeoLeap.Api.Models;

public class FailedPayment
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    [Required]
    public Guid PaymentTransactionId { get; set; }
    public PaymentTransaction PaymentTransaction { get; set; } = null!;

    public Guid? SubscriptionId { get; set; }
    public Subscription? Subscription { get; set; }

    [Required]
    [MaxLength(50)]
    public string FailureType { get; set; } = string.Empty; // card_declined, insufficient_funds, expired_card, etc.

    [Required]
    [MaxLength(100)]
    public string StripeDeclineCode { get; set; } = string.Empty;

    [MaxLength(500)]
    public string FailureReason { get; set; } = string.Empty;

    [Column(TypeName = "decimal(18,2)")]
    public decimal Amount { get; set; }

    [Required]
    [MaxLength(3)]
    public string Currency { get; set; } = "USD";

    [Required]
    [MaxLength(50)]
    public string RecoveryStatus { get; set; } = "active"; // active, resolved, abandoned, expired

    public int RetryCount { get; set; } = 0;
    public int MaxRetryAttempts { get; set; } = 3;

    public DateTime? NextRetryAt { get; set; }
    public DateTime? LastRetryAt { get; set; }
    public DateTime? ResolvedAt { get; set; }

    public bool IsRetriable { get; set; } = true;
    public bool RequiresAction { get; set; } = true; // User needs to update payment method

    [MaxLength(100)]
    public string CorrelationId { get; set; } = string.Empty;

    public Dictionary<string, object> Metadata { get; set; } = new();

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public List<PaymentRetryAttempt> PaymentRetryAttempts { get; set; } = new();
    public List<DunningCampaignExecution> CampaignExecutions { get; set; } = new();
}

public class PaymentRetryAttempt
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public Guid FailedPaymentId { get; set; }
    public FailedPayment FailedPayment { get; set; } = null!;

    [Required]
    public Guid PaymentTransactionId { get; set; }
    public PaymentTransaction PaymentTransaction { get; set; } = null!;

    [Required]
    [MaxLength(50)]
    public string AttemptType { get; set; } = string.Empty; // automatic, manual, user_initiated

    [Required]
    [MaxLength(50)]
    public string Status { get; set; } = string.Empty; // pending, succeeded, failed, skipped

    [MaxLength(100)]
    public string StripeDeclineCode { get; set; } = string.Empty;

    [MaxLength(500)]
    public string FailureReason { get; set; } = string.Empty;

    public int AttemptNumber { get; set; }

    public TimeSpan DelayFromPrevious { get; set; }

    [MaxLength(100)]
    public string CorrelationId { get; set; } = string.Empty;

    public Dictionary<string, object> Metadata { get; set; } = new();

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? AttemptedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
}

public class DunningCampaign
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(500)]
    public string Description { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string TriggerType { get; set; } = string.Empty; // failed_payment, subscription_past_due, grace_period_ending

    [Required]
    [MaxLength(50)]
    public string CustomerSegment { get; set; } = "all"; // all, premium, new, long_term, high_value

    public bool IsActive { get; set; } = true;

    public int Priority { get; set; } = 1; // Higher numbers = higher priority

    // Campaign timing
    public TimeSpan DelayAfterTrigger { get; set; }
    public TimeSpan? SequenceInterval { get; set; }
    public int MaxExecutions { get; set; } = 5;

    // Campaign settings
    public bool RequireGracePeriod { get; set; } = true;
    public bool StopOnPaymentSuccess { get; set; } = true;
    public bool StopOnAccountCancellation { get; set; } = true;

    [MaxLength(100)]
    public string CreatedBy { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ArchivedAt { get; set; }

    // Navigation properties
    public List<DunningStep> Steps { get; set; } = new();
    public List<DunningCampaignExecution> Executions { get; set; } = new();
}

public class DunningStep
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public Guid CampaignId { get; set; }
    public DunningCampaign Campaign { get; set; } = null!;

    [Required]
    public int StepNumber { get; set; }

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string NotificationType { get; set; } = string.Empty; // email, in_app, sms, push

    [Required]
    [MaxLength(200)]
    public string Subject { get; set; } = string.Empty;

    [Required]
    public string MessageTemplate { get; set; } = string.Empty;

    public TimeSpan DelayFromPrevious { get; set; }

    [MaxLength(50)]
    public string UrgencyLevel { get; set; } = "normal"; // low, normal, high, urgent

    public bool RequiresResponse { get; set; } = false;
    public bool IsActive { get; set; } = true;

    // A/B testing
    [MaxLength(100)]
    public string TestVariant { get; set; } = "default";
    public int TrafficAllocation { get; set; } = 100; // Percentage of traffic

    public Dictionary<string, object> TemplateVariables { get; set; } = new();

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public List<DunningNotification> Notifications { get; set; } = new();
}

public class DunningCampaignExecution
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public Guid CampaignId { get; set; }
    public DunningCampaign Campaign { get; set; } = null!;

    [Required]
    public Guid FailedPaymentId { get; set; }
    public FailedPayment FailedPayment { get; set; } = null!;

    [Required]
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    [Required]
    [MaxLength(50)]
    public string Status { get; set; } = "active"; // active, completed, stopped, failed

    public int CurrentStepNumber { get; set; } = 0;
    public int TotalExecutions { get; set; } = 0;

    public DateTime? NextExecutionAt { get; set; }
    public DateTime? LastExecutedAt { get; set; }
    public DateTime? CompletedAt { get; set; }

    [MaxLength(100)]
    public string CompletionReason { get; set; } = string.Empty; // payment_recovered, grace_expired, user_cancelled, etc.

    [MaxLength(100)]
    public string CorrelationId { get; set; } = string.Empty;

    public Dictionary<string, object> ExecutionMetadata { get; set; } = new();

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public List<DunningNotification> Notifications { get; set; } = new();
}

public class DunningNotification
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public Guid CampaignExecutionId { get; set; }
    public DunningCampaignExecution CampaignExecution { get; set; } = null!;

    [Required]
    public Guid StepId { get; set; }
    public DunningStep Step { get; set; } = null!;

    [Required]
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    [Required]
    [MaxLength(50)]
    public string NotificationType { get; set; } = string.Empty; // email, in_app, sms, push

    [Required]
    [MaxLength(200)]
    public string Subject { get; set; } = string.Empty;

    [Required]
    public string Message { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string Status { get; set; } = "pending"; // pending, sent, delivered, failed, opened, clicked

    [MaxLength(500)]
    public string ErrorMessage { get; set; } = string.Empty;

    public int RetryCount { get; set; } = 0;
    public DateTime? NextRetryAt { get; set; }

    // Delivery tracking
    public DateTime? SentAt { get; set; }
    public DateTime? DeliveredAt { get; set; }
    public DateTime? OpenedAt { get; set; }
    public DateTime? ClickedAt { get; set; }

    [MaxLength(100)]
    public string ExternalId { get; set; } = string.Empty; // Provider-specific ID (SendGrid, Twilio, etc.)

    [MaxLength(100)]
    public string CorrelationId { get; set; } = string.Empty;

    public Dictionary<string, object> DeliveryMetadata { get; set; } = new();

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class GracePeriod
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    [Required]
    public Guid FailedPaymentId { get; set; }
    public FailedPayment FailedPayment { get; set; } = null!;

    public Guid? SubscriptionId { get; set; }
    public Subscription? Subscription { get; set; }

    [Required]
    [MaxLength(50)]
    public string Status { get; set; } = "active"; // active, resolved, expired, cancelled

    [Required]
    [MaxLength(50)]
    public string GracePeriodType { get; set; } = "payment_failure"; // payment_failure, subscription_past_due, billing_dispute

    public int GracePeriodDays { get; set; } = 7;

    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; }
    public DateTime? ResolvedAt { get; set; }

    // Service limitation settings
    public bool LimitFeatures { get; set; } = false;
    public List<string> RestrictedFeatures { get; set; } = new();
    public bool ShowGracePeriodWarnings { get; set; } = true;

    [MaxLength(100)]
    public string CorrelationId { get; set; } = string.Empty;

    public Dictionary<string, object> Metadata { get; set; } = new();

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class PaymentRecoverySession
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    [Required]
    public Guid FailedPaymentId { get; set; }
    public FailedPayment FailedPayment { get; set; } = null!;

    [Required]
    [MaxLength(100)]
    public string SessionToken { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string Status { get; set; } = "active"; // active, completed, expired, cancelled

    [MaxLength(200)]
    public string RecoveryUrl { get; set; } = string.Empty;

    public DateTime? LastAccessedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public DateTime? CompletedAt { get; set; }

    [MaxLength(50)]
    public string CompletionType { get; set; } = string.Empty; // payment_updated, payment_succeeded, user_cancelled

    [MaxLength(100)]
    public string CorrelationId { get; set; } = string.Empty;

    public Dictionary<string, object> SessionMetadata { get; set; } = new();

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

public class DunningAnalytics
{
    [Key]
    public Guid Id { get; set; }

    public Guid? UserId { get; set; }
    public User? User { get; set; }

    [Required]
    [MaxLength(50)]
    public string EventType { get; set; } = string.Empty; // payment_failed, retry_attempted, notification_sent, recovery_completed

    [Required]
    [MaxLength(50)]
    public string FailureType { get; set; } = string.Empty;

    public Guid? CampaignId { get; set; }
    public DunningCampaign? Campaign { get; set; }

    public Guid? StepId { get; set; }
    public DunningStep? Step { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal? Amount { get; set; }

    [MaxLength(3)]
    public string Currency { get; set; } = string.Empty;

    [MaxLength(50)]
    public string NotificationType { get; set; } = string.Empty;

    public bool WasSuccessful { get; set; } = false;

    public int DaysSinceFailure { get; set; } = 0;
    public int RecoveryAttempt { get; set; } = 0;

    [MaxLength(100)]
    public string CorrelationId { get; set; } = string.Empty;

    public Dictionary<string, object> AnalyticsMetadata { get; set; } = new();

    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

public class DunningConfiguration
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string Key { get; set; } = string.Empty;

    [Required]
    public string Value { get; set; } = string.Empty;

    [MaxLength(500)]
    public string Description { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string Category { get; set; } = string.Empty; // retry_rules, grace_periods, notifications, etc.

    [MaxLength(50)]
    public string DataType { get; set; } = "string"; // string, int, bool, json

    public bool IsActive { get; set; } = true;
    public bool IsEditable { get; set; } = true;

    [MaxLength(100)]
    public string UpdatedBy { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

// DTOs for API responses
public class FailedPaymentDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string FailureType { get; set; } = string.Empty;
    public string FailureReason { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Currency { get; set; } = string.Empty;
    public string RecoveryStatus { get; set; } = string.Empty;
    public int RetryCount { get; set; }
    public DateTime? NextRetryAt { get; set; }
    public bool IsRetriable { get; set; }
    public bool RequiresAction { get; set; }
    public DateTime CreatedAt { get; set; }
    public PaymentTransactionDto? PaymentTransaction { get; set; }
    public SubscriptionDto? Subscription { get; set; }
}

public class GracePeriodDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Status { get; set; } = string.Empty;
    public string GracePeriodType { get; set; } = string.Empty;
    public int GracePeriodDays { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public bool LimitFeatures { get; set; }
    public List<string> RestrictedFeatures { get; set; } = new();
    public bool ShowGracePeriodWarnings { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class DunningCampaignDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string TriggerType { get; set; } = string.Empty;
    public string CustomerSegment { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public int StepCount { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class PaymentRecoverySessionDto
{
    public Guid Id { get; set; }
    public string Status { get; set; } = string.Empty;
    public string RecoveryUrl { get; set; } = string.Empty;
    public DateTime ExpiresAt { get; set; }
    public FailedPaymentDto FailedPayment { get; set; } = null!;
}

// Request DTOs
public class CreateDunningCampaignRequest
{
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(500)]
    public string Description { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string TriggerType { get; set; } = string.Empty;

    [MaxLength(50)]
    public string CustomerSegment { get; set; } = "all";

    public TimeSpan DelayAfterTrigger { get; set; }
    public TimeSpan? SequenceInterval { get; set; }
    public int MaxExecutions { get; set; } = 5;

    public List<CreateDunningStepRequest> Steps { get; set; } = new();
}

public class CreateDunningStepRequest
{
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string NotificationType { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    public string Subject { get; set; } = string.Empty;

    [Required]
    public string MessageTemplate { get; set; } = string.Empty;

    public TimeSpan DelayFromPrevious { get; set; }

    [MaxLength(50)]
    public string UrgencyLevel { get; set; } = "normal";
}

public class ManualPaymentRetryRequest
{
    [Required]
    public Guid FailedPaymentId { get; set; }

    [MaxLength(500)]
    public string Reason { get; set; } = string.Empty;

    public bool ForceRetry { get; set; } = false;
}

public class UpdateGracePeriodRequest
{
    public int? ExtendDays { get; set; }
    
    [MaxLength(500)]
    public string Reason { get; set; } = string.Empty;
    
    public bool? LimitFeatures { get; set; }
    
    public List<string>? RestrictedFeatures { get; set; }
}