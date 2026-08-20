using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GeoLeap.Api.Models;

// Payment Transaction Records
public class PaymentTransaction
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    [Required]
    [MaxLength(100)]
    public string StripePaymentIntentId { get; set; } = string.Empty;
    
    /// <summary>
    /// TransactionId alias for compatibility
    /// </summary>
    public string TransactionId => StripePaymentIntentId;

    [Required]
    [MaxLength(50)]
    public string Status { get; set; } = string.Empty; // pending, succeeded, failed, canceled

    [Required]
    [Column(TypeName = "decimal(18,2)")]
    public decimal Amount { get; set; }

    [Required]
    [MaxLength(3)]
    public string Currency { get; set; } = "USD";

    [MaxLength(500)]
    public string Description { get; set; } = string.Empty;

    public Guid? PaymentMethodId { get; set; }
    public PaymentMethod? PaymentMethod { get; set; }

    [MaxLength(100)]
    public string StripeCustomerId { get; set; } = string.Empty;

    [MaxLength(100)]
    public string StripeSubscriptionId { get; set; } = string.Empty;

    [MaxLength(2000)]
    public string FailureReason { get; set; } = string.Empty;

    [MaxLength(100)]
    public string CorrelationId { get; set; } = string.Empty;

    /// <summary>
    /// Idempotency key to prevent duplicate charges from network retries or double-clicks
    /// CRITICAL: This field prevents race conditions and duplicate payments
    /// Format: userId-amount-currency-timestamp or custom client-provided key
    /// Must be unique across all payment transactions
    /// </summary>
    [MaxLength(200)]
    public string IdempotencyKey { get; set; } = string.Empty;

    public Dictionary<string, object> Metadata { get; set; } = new();

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ProcessedAt { get; set; }

    // Retry mechanism fields
    public int RetryCount { get; set; } = 0;
    public DateTime? NextRetryAt { get; set; }
    public DateTime? LastRetryAt { get; set; }

    // Audit fields
    [MaxLength(45)]
    public string IpAddress { get; set; } = string.Empty;
    [MaxLength(500)]
    public string UserAgent { get; set; } = string.Empty;
}

// Stored Payment Methods (Tokenized)
public class PaymentMethod
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    [Required]
    [MaxLength(100)]
    public string StripePaymentMethodId { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string Type { get; set; } = string.Empty; // card, bank_account, etc.

    [MaxLength(4)]
    public string Last4 { get; set; } = string.Empty;

    [MaxLength(50)]
    public string Brand { get; set; } = string.Empty; // visa, mastercard, amex, etc.

    public int? ExpiryMonth { get; set; }
    public int? ExpiryYear { get; set; }

    [MaxLength(100)]
    public string Fingerprint { get; set; } = string.Empty;

    [MaxLength(2)]
    public string Country { get; set; } = string.Empty;

    [MaxLength(100)]
    public string Nickname { get; set; } = string.Empty;

    public bool IsDefault { get; set; } = false;
    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? DeletedAt { get; set; }

    // Navigation properties
    public List<PaymentTransaction> Transactions { get; set; } = new();
}

// Stripe Customer Records
public class StripeCustomer
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    [Required]
    [MaxLength(100)]
    public string StripeCustomerId { get; set; } = string.Empty;

    [MaxLength(255)]
    public string Email { get; set; } = string.Empty;

    [MaxLength(255)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(500)]
    public string Description { get; set; } = string.Empty;

    public Dictionary<string, object> Metadata { get; set; } = new();

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? DeletedAt { get; set; }

    // Navigation properties
    public List<PaymentMethod> PaymentMethods { get; set; } = new();
    public List<PaymentTransaction> Transactions { get; set; } = new();
    public List<Subscription> Subscriptions { get; set; } = new();
}

// Subscription Management
public class Subscription
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public Guid StripeCustomerId { get; set; }
    public StripeCustomer StripeCustomer { get; set; } = null!;

    [Required]
    [MaxLength(100)]
    public string StripeSubscriptionId { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string StripePriceId { get; set; } = string.Empty;
    
    /// <summary>
    /// Plan ID for compatibility
    /// </summary>
    public string PlanId => StripePriceId;

    [Required]
    [MaxLength(50)]
    public string Status { get; set; } = string.Empty; // active, past_due, canceled, etc.

    [Required]
    [MaxLength(50)]
    public string PlanType { get; set; } = "premium"; // basic, premium, pro

    [Required]
    [Column(TypeName = "decimal(18,2)")]
    public decimal Amount { get; set; }
    
    /// <summary>
    /// Price alias for compatibility
    /// </summary>
    public decimal Price => Amount;

    [Required]
    [MaxLength(3)]
    public string Currency { get; set; } = "USD";

    [Required]
    [MaxLength(20)]
    public string Interval { get; set; } = "month"; // month, year

    public int IntervalCount { get; set; } = 1;

    public DateTime CurrentPeriodStart { get; set; }
    public DateTime CurrentPeriodEnd { get; set; }

    public DateTime? CanceledAt { get; set; }
    public bool CancelAtPeriodEnd { get; set; }
    public bool IsCanceled { get; set; } = false;

    // Pause/Resume functionality for support operations
    public DateTime? PausedAt { get; set; }
    public DateTime? ResumeAt { get; set; }

    public DateTime? TrialStart { get; set; }
    public DateTime? TrialEnd { get; set; }

    // Additional properties for service compatibility
    public DateTime? StartedAt { get; set; }
    public DateTime? EndDate { get; set; }
    public DateTime? UpdatedDate { get; set; }
    public DateTime? StartDate { get; set; }
    public string? BillingCycle { get; set; }
    
    // Properties for AdvancedAdminUserService compatibility
    public string PlanName => PlanType;
    public string BillingInterval => Interval;
    public string? CancellationReason { get; set; }

    public Dictionary<string, object> Metadata { get; set; } = new();

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public List<PaymentTransaction> Transactions { get; set; } = new();
}

// Webhook Events from Stripe
public class WebhookEvent
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    [MaxLength(100)]
    public string StripeEventId { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string EventType { get; set; } = string.Empty;

    [Required]
    public string EventData { get; set; } = string.Empty; // JSON data

    [Required]
    [MaxLength(50)]
    public string ProcessingStatus { get; set; } = "pending"; // pending, processed, failed

    [MaxLength(2000)]
    public string ProcessingError { get; set; } = string.Empty;

    public int ProcessingAttempts { get; set; } = 0;
    
    // Alias for ProcessingAttempts for compatibility with PaymentService
    public int? RetryCount 
    { 
        get => ProcessingAttempts; 
        set => ProcessingAttempts = value ?? 0; 
    }
    
    public DateTime? ProcessedAt { get; set; }
    public DateTime? NextRetryAt { get; set; }

    [MaxLength(100)]
    public string CorrelationId { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

// Payment Analytics and Metrics
public class PaymentAnalytics
{
    [Key]
    public Guid Id { get; set; }

    public Guid? UserId { get; set; }
    public User? User { get; set; }

    [Required]
    [MaxLength(50)]
    public string EventType { get; set; } = string.Empty; // payment_attempt, payment_success, payment_failure, subscription_created, etc.

    [Required]
    [MaxLength(50)]
    public string PaymentMethod { get; set; } = string.Empty;

    [Column(TypeName = "decimal(18,2)")]
    public decimal? Amount { get; set; }

    [MaxLength(3)]
    public string Currency { get; set; } = string.Empty;

    [MaxLength(100)]
    public string FailureCode { get; set; } = string.Empty;

    [MaxLength(500)]
    public string FailureMessage { get; set; } = string.Empty;

    public int ProcessingTimeMs { get; set; } = 0;

    [MaxLength(2)]
    public string Country { get; set; } = string.Empty;

    [MaxLength(100)]
    public string CorrelationId { get; set; } = string.Empty;

    public Dictionary<string, object> Metadata { get; set; } = new();

    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

// Payment Settings and Configuration
public class PaymentConfiguration
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

    [MaxLength(50)]
    public string Category { get; set; } = string.Empty; // stripe, pricing, limits, etc.

    public bool IsActive { get; set; } = true;
    public bool IsSecure { get; set; } = false; // For sensitive config values

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    [MaxLength(100)]
    public string CreatedBy { get; set; } = string.Empty; // Admin who created

    [MaxLength(100)]
    public string UpdatedBy { get; set; } = string.Empty; // Admin who updated
}

// Payment DTOs for API responses
public class PaymentTransactionDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Status { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Currency { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime? ProcessedAt { get; set; }
    public string FailureReason { get; set; } = string.Empty;

    // Additional properties for service compatibility
    public string PaymentIntentId { get; set; } = string.Empty;
    public string TransactionId { get; set; } = string.Empty;
    public Dictionary<string, object> Metadata { get; set; } = new();

    /// <summary>
    /// Stripe client secret for confirming the payment on the frontend
    /// Only populated when creating a new payment intent
    /// </summary>
    public string? ClientSecret { get; set; }

    /// <summary>
    /// Stripe payment intent ID - used by frontend for payment status sync
    /// </summary>
    public string StripePaymentIntentId { get; set; } = string.Empty;
}

public class PaymentIntentResponse
{
    public string PaymentIntentId { get; set; } = string.Empty;
    public string ClientSecret { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Currency { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public Dictionary<string, object> Metadata { get; set; } = new();
    
    // Additional properties for service compatibility
    public bool IsSuccess { get; set; } = true;
    public string ErrorMessage { get; set; } = string.Empty;
}

public class PaymentMethodDto
{
    public Guid Id { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Last4 { get; set; } = string.Empty;
    public string Brand { get; set; } = string.Empty;
    public int? ExpiryMonth { get; set; }
    public int? ExpiryYear { get; set; }
    public bool IsDefault { get; set; }
    public bool IsActive { get; set; }
    public string Country { get; set; } = string.Empty;
    public string Nickname { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public bool IsExpiringSoon { get; set; }
    public string DisplayName { get; set; } = string.Empty;
}

public class SubscriptionDto
{
    public Guid Id { get; set; }
    public Guid? UserId { get; set; }
    public string? PlanId { get; set; }
    public string Status { get; set; } = string.Empty;
    public PaymentStatus PaymentStatus { get; set; }
    public string PlanType { get; set; } = string.Empty;
    public decimal Amount { get; set; }
    public string Currency { get; set; } = string.Empty;
    public string Interval { get; set; } = string.Empty;
    public DateTime CurrentPeriodStart { get; set; }
    public DateTime CurrentPeriodEnd { get; set; }
    public DateTime? StartedAt { get; set; }
    public bool IsCanceled { get; set; }
    public DateTime? CanceledAt { get; set; }
    public DateTime? TrialEnd { get; set; }
    
    // Additional properties for service compatibility
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public DateTime? NextBillingDate { get; set; }
    public string? BillingCycle { get; set; }
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

// Request DTOs
public class CreatePaymentIntentRequest
{
    [Required]
    [Range(0.50, 999999.99)]
    public decimal Amount { get; set; }

    [Required]
    [MaxLength(3)]
    public string Currency { get; set; } = "USD";

    [MaxLength(500)]
    public string Description { get; set; } = string.Empty;

    public Guid? PaymentMethodId { get; set; }

    /// <summary>
    /// Optional idempotency key provided by the client for duplicate prevention
    /// If not provided, server will generate one based on userId-amount-currency-timestamp
    /// </summary>
    [MaxLength(200)]
    public string? IdempotencyKey { get; set; }

    public Dictionary<string, object> Metadata { get; set; } = new();
}

public class CreateSubscriptionRequest
{
    [Required]
    [MaxLength(100)]
    public string PriceId { get; set; } = string.Empty;
    
    // Add PlanId for backward compatibility with tests
    public string PlanId
    {
        get => PriceId;
        set => PriceId = value;
    }

    public Guid? PaymentMethodId { get; set; }

    [MaxLength(50)]
    public string PlanType { get; set; } = "premium";

    public Dictionary<string, object> Metadata { get; set; } = new();
    public int? TrialPeriodDays { get; set; }
}

public class PaymentMethodRequest
{
    [Required]
    [MaxLength(100)]
    public string StripePaymentMethodId { get; set; } = string.Empty;

    public bool SetAsDefault { get; set; } = false;
    
    [MaxLength(100)]
    public string Nickname { get; set; } = string.Empty;
}

public class UpdatePaymentMethodRequest
{
    [MaxLength(100)]
    public string Nickname { get; set; } = string.Empty;
    
    public bool? SetAsDefault { get; set; }
    
    public int? ExpiryMonth { get; set; }
    
    public int? ExpiryYear { get; set; }
}

public class PaymentMethodValidationRequest
{
    [Required]
    [MaxLength(100)]
    public string StripePaymentMethodId { get; set; } = string.Empty;
    
    // Property for test compatibility
    public string PaymentMethodId
    {
        get => StripePaymentMethodId;
        set => StripePaymentMethodId = value;
    }
}

// Additional models for test compatibility
public enum SubscriptionStatus
{
    Active,
    PastDue,
    Canceled,
    Unpaid,
    Trialing,
    Incomplete,
    IncompleteExpired
}

public enum PaymentStatus
{
    Pending,
    Processing,
    Succeeded,
    Failed,
    Canceled,
    RequiresAction,
    RequiresPaymentMethod,
    RequiresConfirmation,
    Active
}

// Cancel subscription request for test compatibility
public class CancelSubscriptionRequest
{
    [MaxLength(1000)]
    public string Reason { get; set; } = string.Empty;
    
    public bool CancelAtPeriodEnd { get; set; } = true;
    
    // Add ImmediateCancel property for test compatibility
    public bool ImmediateCancel { get; set; } = false;
    
    public Dictionary<string, object> Metadata { get; set; } = new();
}

public class SubscriptionPlan
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(500)]
    public string Description { get; set; } = string.Empty;
    
    [Required]
    [Column(TypeName = "decimal(18,2)")]
    public decimal Price { get; set; }
    
    [Required]
    [MaxLength(10)]
    public string Currency { get; set; } = "USD";
    
    [Required]
    [MaxLength(50)]
    public string BillingPeriod { get; set; } = "monthly"; // monthly, yearly
    
    [Required]
    public SubscriptionTier Tier { get; set; } = SubscriptionTier.Free;
    
    public bool IsActive { get; set; } = true;
    
    [MaxLength(100)]
    public string StripePriceId { get; set; } = string.Empty;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    // Features included in this plan
    public int MaxSearchResultsPerQuery { get; set; } = 10;
    public int MaxDailySearches { get; set; } = 10;
    public bool CanViewStreamingUrls { get; set; } = false;
    public bool CanViewPricing { get; set; } = false;
    public bool CanAccessAdvancedFilters { get; set; } = false;
    
    /// <summary>
    /// Billing interval for test compatibility
    /// </summary>
    public string Interval { get; set; } = "monthly";
    
    /// <summary>
    /// Plan features as list for test compatibility
    /// </summary>
    public List<string> Features { get; set; } = new();
    
    /// <summary>
    /// Billing cycle for service compatibility (alias for BillingPeriod)
    /// </summary>
    public string? BillingCycle { get; set; }

    /// <summary>
    /// Number of free trial days before billing begins (null = no trial)
    /// </summary>
    public int? TrialPeriodDays { get; set; }
}

public class PaymentRequest
{
    [Required]
    [Range(0.50, 999999.99)]
    public decimal Amount { get; set; }
    
    [Required]
    [MaxLength(3)]
    public string Currency { get; set; } = "USD";
    
    [MaxLength(500)]
    public string Description { get; set; } = string.Empty;
    
    public Guid? PaymentMethodId { get; set; }
    
    public Dictionary<string, object> Metadata { get; set; } = new();
}

public class PaymentResult
{
    public bool Success { get; set; }
    
    public string PaymentIntentId { get; set; } = string.Empty;
    
    public string Status { get; set; } = string.Empty;
    
    public decimal Amount { get; set; }
    
    public string Currency { get; set; } = string.Empty;
    
    public string? FailureReason { get; set; }
    
    public Dictionary<string, object> Metadata { get; set; } = new();
    
    public DateTime ProcessedAt { get; set; } = DateTime.UtcNow;
    
    // Missing property for test compatibility
    public string TransactionId { get; set; } = string.Empty;
    
    // Add missing properties for test compatibility
    public string? ErrorMessage { get; set; }
    public string? ErrorCode { get; set; }
    
    // Additional properties for test compatibility - now settable
    public bool IsSuccessful { get; set; }
    public string PaymentId { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    
    // Constructor to maintain compatibility
    public PaymentResult()
    {
        IsSuccessful = Success;
        PaymentId = PaymentIntentId;
        Message = ErrorMessage ?? FailureReason ?? "";
    }
}

// Missing DTOs for test compatibility
public class RefundRequest
{
    [Required]
    [Range(0.01, 999999.99)]
    public decimal Amount { get; set; }
    
    [MaxLength(500)]
    public string Reason { get; set; } = string.Empty;
    
    [Required]
    public string PaymentIntentId { get; set; } = string.Empty;
    
    // Additional properties for test compatibility
    public string PaymentId
    {
        get => PaymentIntentId;
        set => PaymentIntentId = value;
    }
    
    public Dictionary<string, object> Metadata { get; set; } = new();
}

// Missing DTO for subscription updates
public class UpdateSubscriptionRequest
{
    public string? PlanId { get; set; }
    public string? NewPlanId { get; set; }
    public string? PlanType { get; set; }
    public bool? CancelAtPeriodEnd { get; set; }
    public string ProrationBehavior { get; set; } = "create_prorations";
    public Dictionary<string, object> Metadata { get; set; } = new();
}

// Missing DTO for subscription renewal
public class RenewSubscriptionRequest
{
    public string? PlanId { get; set; }
    public Guid? PaymentMethodId { get; set; }
    public Dictionary<string, object> Metadata { get; set; } = new();
}

// Missing refund result for test compatibility
public class RefundResult
{
    public bool Success { get; set; }
    public string RefundId { get; set; } = string.Empty;
    public RefundStatus RefundStatus { get; set; }
    public decimal Amount { get; set; }
    public string Currency { get; set; } = "USD";
    public string Reason { get; set; } = string.Empty;
    public Guid PaymentTransactionId { get; set; }
    public DateTime ProcessedAt { get; set; } = DateTime.UtcNow;
    public string? ErrorMessage { get; set; }
}

/// <summary>
/// Result model for payment analytics aggregation
/// </summary>
public class PaymentAnalyticsResult
{
    public decimal TotalRevenue { get; set; }
    public int TransactionCount { get; set; }
    public decimal AverageTransactionValue { get; set; }
    public DateTime PeriodStart { get; set; }
    public DateTime PeriodEnd { get; set; }
}

/// <summary>
/// User usage metrics for subscription management
/// </summary>
public class UsageMetrics
{
    public int TotalSearches { get; set; }
    public int CurrentPeriodSearches { get; set; }
    public Guid UserId { get; set; }
    public DateTime PeriodStart { get; set; }
    public DateTime PeriodEnd { get; set; }
}