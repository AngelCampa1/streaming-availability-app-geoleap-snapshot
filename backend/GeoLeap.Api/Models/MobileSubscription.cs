using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GeoLeap.Api.Models;

/// <summary>
/// Mobile In-App Purchase subscription record
/// Stores validated subscriptions from iOS and Android
/// </summary>
[Table("MobileSubscriptions")]
public class MobileSubscription
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public Guid UserId { get; set; }

    /// <summary>
    /// Subscription tier: free, basic, premium, pro
    /// </summary>
    [Required]
    [MaxLength(50)]
    public string Tier { get; set; } = "free";

    /// <summary>
    /// Subscription status: active, trial, canceled, expired, past_due
    /// </summary>
    [Required]
    [MaxLength(50)]
    public string Status { get; set; } = "inactive";

    /// <summary>
    /// Platform: ios or android
    /// </summary>
    [Required]
    [MaxLength(20)]
    public string Platform { get; set; } = string.Empty;

    /// <summary>
    /// IAP Product ID (e.g., com.geoleap.premium.monthly)
    /// </summary>
    [MaxLength(200)]
    public string? ProductId { get; set; }

    /// <summary>
    /// Transaction ID from app store
    /// </summary>
    [MaxLength(200)]
    public string? TransactionId { get; set; }

    /// <summary>
    /// Original transaction ID (iOS) - for tracking renewals
    /// </summary>
    [MaxLength(200)]
    public string? OriginalTransactionId { get; set; }

    /// <summary>
    /// iOS receipt data (base64)
    /// </summary>
    public string? ReceiptData { get; set; }

    /// <summary>
    /// Android purchase token
    /// </summary>
    [MaxLength(500)]
    public string? PurchaseToken { get; set; }

    /// <summary>
    /// Subscription start date
    /// </summary>
    public DateTime? StartDate { get; set; }

    /// <summary>
    /// Subscription end/expiry date
    /// </summary>
    public DateTime? EndDate { get; set; }

    /// <summary>
    /// Auto-renewal enabled
    /// </summary>
    public bool AutoRenew { get; set; } = true;

    /// <summary>
    /// Last time receipt was verified with store
    /// </summary>
    public DateTime? LastVerified { get; set; }

    /// <summary>
    /// Record creation timestamp
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Record last update timestamp
    /// </summary>
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Promotional access (server-side grant for mobile users)
    /// <summary>
    /// Reference to promotion that granted this access (if any)
    /// </summary>
    public Guid? PromotionId { get; set; }

    /// <summary>
    /// Start date of promotional access
    /// </summary>
    public DateTime? PromotionalAccessStart { get; set; }

    /// <summary>
    /// End date of promotional access
    /// </summary>
    public DateTime? PromotionalAccessEnd { get; set; }

    /// <summary>
    /// Whether current access is from a promotion (vs paid IAP)
    /// </summary>
    public bool IsPromotionalAccess { get; set; } = false;

    // Navigation properties
    [ForeignKey(nameof(UserId))]
    public virtual User? User { get; set; }

    [ForeignKey(nameof(PromotionId))]
    public virtual Promotion? Promotion { get; set; }
}
