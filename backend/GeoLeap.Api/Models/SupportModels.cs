using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;

namespace GeoLeap.Api.Models;

// Support Action Types
public enum SupportActionType
{
    BillingDataView = 0,
    PaymentProcess = 1,
    SubscriptionModification = 2,
    InvoiceRegeneration = 3,
    RefundProcess = 4,
    DataExport = 5,
    AccountStatusChange = 6,
    PaymentMethodUpdate = 7,
    BillingAddressUpdate = 8,
    TaxAdjustment = 9,
    CreditApplication = 10,
    DunningOverride = 11,
    PlanChange = 12,
    Pause = 13,
    Resume = 14,
    AccountFreeze = 15,
    AccountUnfreeze = 16,
    ConfigurationChange = 17
}

// Support Action Status
public enum SupportActionStatus
{
    Pending = 0,
    InProgress = 1,
    Completed = 2,
    Failed = 3,
    Cancelled = 4,
    RequiresApproval = 5,
    Approved = 6,
    Rejected = 7
}

// Refund Status
public enum RefundStatus
{
    Pending = 0,
    Processing = 1,
    Completed = 2,
    Failed = 3,
    Cancelled = 4,
    PartiallyRefunded = 5
}

// Support Refund Status (alias for compatibility)
public enum SupportRefundStatus
{
    Pending = 0,
    Approved = 1,
    Rejected = 2,
    Processed = 3
}

// Support Action Priority
public enum SupportPriority
{
    Low = 0,
    Normal = 1,
    High = 2,
    Urgent = 3,
    Critical = 4
}

// Support Action Entity
[Table("SupportActions")]
public class SupportAction
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public SupportActionType ActionType { get; set; }

    [Required]
    public SupportActionStatus Status { get; set; } = SupportActionStatus.Pending;

    [Required]
    public SupportPriority Priority { get; set; } = SupportPriority.Normal;

    [Required]
    public Guid SupportAgentId { get; set; }

    [Required]
    public Guid TargetUserId { get; set; }

    // Alias for TargetUserId for compatibility with SupportService
    [NotMapped]
    public Guid CustomerId => TargetUserId;
    
    // Additional alias for compatibility - UserId property
    [NotMapped]
    public Guid UserId => TargetUserId;
    
    // Additional property for AssignedTo compatibility
    [NotMapped]
    public Guid? AssignedTo => SupportAgentId;

    [MaxLength(500)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(2000)]
    public string Description { get; set; } = string.Empty;

    [MaxLength(2000)]
    public string? Reason { get; set; }

    [MaxLength(2000)]
    public string? Notes { get; set; }

    [MaxLength(100)]
    public string? CorrelationId { get; set; }

    // Related entity references
    public Guid? PaymentTransactionId { get; set; }
    public Guid? SubscriptionId { get; set; }
    public Guid? InvoiceId { get; set; }
    public Guid? RefundId { get; set; }

    // Approval workflow
    public Guid? ApprovedBy { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public Guid? RejectedBy { get; set; }
    public DateTime? RejectedAt { get; set; }
    
    [MaxLength(1000)]
    public string? ApprovalNotes { get; set; }
    
    [MaxLength(1000)]
    public string? RejectionReason { get; set; }

    // Audit fields
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }

    // Metadata for storing additional action-specific data
    [Column(TypeName = "nvarchar(max)")]
    public string MetadataJson { get; set; } = "{}";

    [NotMapped]
    public Dictionary<string, object> Metadata
    {
        get => string.IsNullOrEmpty(MetadataJson) 
            ? new Dictionary<string, object>() 
            : JsonSerializer.Deserialize<Dictionary<string, object>>(MetadataJson) ?? new Dictionary<string, object>();
        set => MetadataJson = JsonSerializer.Serialize(value);
    }

    // Alias for Metadata for compatibility with SupportService
    [NotMapped]
    public Dictionary<string, object> NewValues => Metadata;

    // Navigation Properties
    [ForeignKey("SupportAgentId")]
    public virtual User? SupportAgent { get; set; }

    [ForeignKey("TargetUserId")]
    public virtual User? TargetUser { get; set; }

    [ForeignKey("ApprovedBy")]
    public virtual User? ApprovalUser { get; set; }

    [ForeignKey("RejectedBy")]
    public virtual User? RejectionUser { get; set; }

    [ForeignKey("PaymentTransactionId")]
    public virtual PaymentTransaction? PaymentTransaction { get; set; }

    [ForeignKey("SubscriptionId")]
    public virtual Subscription? Subscription { get; set; }

    [ForeignKey("InvoiceId")]
    public virtual Invoice? Invoice { get; set; }

    public virtual ICollection<SupportActionAuditLog> AuditLogs { get; set; } = new List<SupportActionAuditLog>();
    public virtual ICollection<SupportRefund> Refunds { get; set; } = new List<SupportRefund>();
}

// Support Action Audit Log
[Table("SupportActionAuditLogs")]
public class SupportActionAuditLog
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid SupportActionId { get; set; }

    [Required]
    public Guid UserId { get; set; }

    [Required]
    [MaxLength(100)]
    public string Event { get; set; } = string.Empty;

    // Alias for Event for compatibility with SupportService
    [NotMapped]
    public string EventName => Event;

    [MaxLength(1000)]
    public string? Description { get; set; }

    [MaxLength(1000)]
    public string? OldValues { get; set; }

    [MaxLength(1000)]
    public string? NewValues { get; set; }

    [MaxLength(100)]
    public string? IpAddress { get; set; }

    [MaxLength(500)]
    public string? UserAgent { get; set; }

    [MaxLength(100)]
    public string? CorrelationId { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Navigation Properties
    [ForeignKey("SupportActionId")]
    public virtual SupportAction? SupportAction { get; set; }

    [ForeignKey("UserId")]
    public virtual User? User { get; set; }
}

// Support Refund Entity
[Table("SupportRefunds")]
public class SupportRefund
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid SupportActionId { get; set; }

    [Required]
    public Guid PaymentTransactionId { get; set; }

    [Required]
    public Guid UserId { get; set; }

    [Required]
    [Column(TypeName = "decimal(18,2)")]
    public decimal RefundAmount { get; set; }

    [Required]
    [Column(TypeName = "decimal(18,2)")]
    public decimal OriginalAmount { get; set; }

    [Required]
    public RefundStatus Status { get; set; } = RefundStatus.Pending;

    [Required]
    [MaxLength(100)]
    public string RefundMethod { get; set; } = string.Empty; // "original_payment_method", "store_credit", etc.

    [MaxLength(100)]
    public string? StripeRefundId { get; set; }

    [MaxLength(1000)]
    public string? Reason { get; set; }

    [MaxLength(2000)]
    public string? InternalNotes { get; set; }

    [MaxLength(2000)]
    public string? CustomerNotes { get; set; }

    // Processing details
    public DateTime? ProcessedAt { get; set; }
    public Guid? ProcessedBy { get; set; }

    [MaxLength(1000)]
    public string? ProcessingError { get; set; }

    [MaxLength(100)]
    public string? CorrelationId { get; set; }

    // Audit fields
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Metadata for storing refund-specific data
    [Column(TypeName = "nvarchar(max)")]
    public string MetadataJson { get; set; } = "{}";

    [NotMapped]
    public Dictionary<string, object> Metadata
    {
        get => string.IsNullOrEmpty(MetadataJson) 
            ? new Dictionary<string, object>() 
            : JsonSerializer.Deserialize<Dictionary<string, object>>(MetadataJson) ?? new Dictionary<string, object>();
        set => MetadataJson = JsonSerializer.Serialize(value);
    }

    // Navigation Properties
    [ForeignKey("SupportActionId")]
    public virtual SupportAction? SupportAction { get; set; }

    [ForeignKey("PaymentTransactionId")]
    public virtual PaymentTransaction? PaymentTransaction { get; set; }

    [ForeignKey("UserId")]
    public virtual User? User { get; set; }

    [ForeignKey("ProcessedBy")]
    public virtual User? ProcessingAgent { get; set; }
}

// Customer Billing Data Access Log (for RBAC and auditing)
[Table("CustomerBillingAccessLogs")]
public class CustomerBillingAccessLog
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid SupportAgentId { get; set; }

    [Required]
    public Guid CustomerId { get; set; }

    [Required]
    [MaxLength(100)]
    public string AccessType { get; set; } = string.Empty; // "view_billing", "view_payments", "view_invoices", etc.

    [MaxLength(200)]
    public string? AccessedResource { get; set; }

    [MaxLength(100)]
    public string? DataMaskingLevel { get; set; } // "full", "partial", "masked"

    [MaxLength(1000)]
    public string? Justification { get; set; }

    [MaxLength(100)]
    public string? IpAddress { get; set; }

    [MaxLength(500)]
    public string? UserAgent { get; set; }

    [MaxLength(100)]
    public string? CorrelationId { get; set; }

    public DateTime AccessedAt { get; set; } = DateTime.UtcNow;

    // Navigation Properties
    [ForeignKey("SupportAgentId")]
    public virtual User? SupportAgent { get; set; }

    [ForeignKey("CustomerId")]
    public virtual User? Customer { get; set; }
}

// Support DTOs
public class CreateSupportActionRequest
{
    [Required]
    public SupportActionType ActionType { get; set; }

    [Required]
    public Guid TargetUserId { get; set; }

    [Required]
    [MaxLength(500)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [MaxLength(2000)]
    public string Description { get; set; } = string.Empty;

    [MaxLength(2000)]
    public string? Reason { get; set; }

    [MaxLength(2000)]
    public string? Notes { get; set; }

    public SupportPriority Priority { get; set; } = SupportPriority.Normal;

    // Related entity references
    public Guid? PaymentTransactionId { get; set; }
    public Guid? SubscriptionId { get; set; }
    public Guid? InvoiceId { get; set; }

    public Dictionary<string, object>? Metadata { get; set; }
}

public class ApproveSupportActionRequest
{
    [Required]
    public Guid SupportActionId { get; set; }

    [Required]
    public bool Approve { get; set; }

    [MaxLength(1000)]
    public string? Notes { get; set; }
}

public class ProcessRefundRequest
{
    [Required]
    public Guid PaymentTransactionId { get; set; }

    [Required]
    [Range(0.01, double.MaxValue)]
    public decimal RefundAmount { get; set; }

    [Required]
    [MaxLength(100)]
    public string RefundMethod { get; set; } = "original_payment_method";

    [Required]
    [MaxLength(1000)]
    public string Reason { get; set; } = string.Empty;

    [MaxLength(2000)]
    public string? InternalNotes { get; set; }

    [MaxLength(2000)]
    public string? CustomerNotes { get; set; }

    public bool SendNotification { get; set; } = true;
}

public class SupportActionResponse
{
    public Guid Id { get; set; }
    public SupportActionType ActionType { get; set; }
    public string ActionTypeName { get; set; } = string.Empty;
    public SupportActionStatus Status { get; set; }
    public string StatusName { get; set; } = string.Empty;
    public SupportPriority Priority { get; set; }
    public string PriorityName { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? Reason { get; set; }
    public string? Notes { get; set; }
    public string? CorrelationId { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public UserBasicInfo? SupportAgent { get; set; }
    public UserBasicInfo? TargetUser { get; set; }
    public UserBasicInfo? ApprovalUser { get; set; }
    public string? ApprovalNotes { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public Dictionary<string, object> Metadata { get; set; } = new();
}

public class CustomerBillingDataResponse
{
    public Guid CustomerId { get; set; }
    public UserBasicInfo CustomerInfo { get; set; } = new();
    public List<MaskedPaymentTransaction> Transactions { get; set; } = new();
    public List<MaskedSubscription> Subscriptions { get; set; } = new();
    public List<MaskedInvoice> Invoices { get; set; } = new();
    public List<MaskedPaymentMethod> PaymentMethods { get; set; } = new();
    public BillingAddressInfo? BillingAddress { get; set; }
    public string DataMaskingLevel { get; set; } = "partial";
    public DateTime AccessedAt { get; set; } = DateTime.UtcNow;
}

public class MaskedPaymentTransaction
{
    public Guid Id { get; set; }
    public string MaskedAmount { get; set; } = string.Empty; // e.g., "$X9.99" for partial masking
    public string Status { get; set; } = string.Empty;
    public string MaskedPaymentMethodInfo { get; set; } = string.Empty; // e.g., "**** 1234"
    public DateTime CreatedAt { get; set; }
    public string? CorrelationId { get; set; }
}

public class MaskedSubscription
{
    public Guid Id { get; set; }
    public string PlanName { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string MaskedPrice { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public bool AutoRenew { get; set; }
}

public class MaskedInvoice
{
    public Guid Id { get; set; }
    public string InvoiceNumber { get; set; } = string.Empty;
    public string MaskedAmount { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime IssueDate { get; set; }
    public DateTime? DueDate { get; set; }
}

public class MaskedPaymentMethod
{
    public Guid Id { get; set; }
    public string MaskedCardNumber { get; set; } = string.Empty; // e.g., "**** **** **** 1234"
    public string CardBrand { get; set; } = string.Empty;
    public string ExpiryMonth { get; set; } = string.Empty;
    public string ExpiryYear { get; set; } = string.Empty;
    public bool IsDefault { get; set; }
    public bool IsActive { get; set; }
}

public class BillingAddressInfo
{
    public string? AddressLine1 { get; set; }
    public string? AddressLine2 { get; set; }
    public string? City { get; set; }
    public string? StateProvince { get; set; }
    public string? PostalCode { get; set; }
    public string? Country { get; set; }
}

public class UserBasicInfo
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public bool IsActive { get; set; }
}

public class RefundResponse
{
    public Guid Id { get; set; }
    public Guid SupportActionId { get; set; }
    public decimal RefundAmount { get; set; }
    public decimal OriginalAmount { get; set; }
    public RefundStatus Status { get; set; }
    public string StatusName { get; set; } = string.Empty;
    public string RefundMethod { get; set; } = string.Empty;
    public string? StripeRefundId { get; set; }
    public string? Reason { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? ProcessedAt { get; set; }
    public UserBasicInfo? ProcessingAgent { get; set; }
}

public class ManualPaymentRequest
{
    [Required]
    public Guid CustomerId { get; set; }

    [Required]
    [Range(0.01, double.MaxValue)]
    public decimal Amount { get; set; }

    [Required]
    [MaxLength(100)]
    public string PaymentMethod { get; set; } = string.Empty; // "cash", "check", "bank_transfer", etc.

    [MaxLength(100)]
    public string? Reference { get; set; }

    [MaxLength(1000)]
    public string? Notes { get; set; }

    [MaxLength(2000)]
    public string? InternalNotes { get; set; }

    public Guid? InvoiceId { get; set; }
    public Guid? SubscriptionId { get; set; }

    public bool SendConfirmation { get; set; } = true;
}

public class SubscriptionModificationRequest
{
    [Required]
    public Guid SubscriptionId { get; set; }

    [Required]
    [MaxLength(100)]
    public string ModificationType { get; set; } = string.Empty; // "plan_change", "pause", "cancel", "reactivate"

    public string? NewPlan { get; set; }
    public DateTime? EffectiveDate { get; set; }
    public bool? ProrateBilling { get; set; }

    [MaxLength(1000)]
    public string? Reason { get; set; }

    [MaxLength(2000)]
    public string? Notes { get; set; }

    public bool SendNotification { get; set; } = true;
    public bool RequireApproval { get; set; } = false;
}