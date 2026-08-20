using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GeoLeap.Api.Models;

/// <summary>
/// Represents a promotional offer (synced with Stripe Coupons/Promotion Codes)
/// </summary>
[Table("Promotions")]
public class Promotion
{
    [Key]
    public Guid Id { get; set; }

    /// <summary>
    /// Internal name for the promotion
    /// </summary>
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Customer-facing promotion code (e.g., "LAUNCH100")
    /// </summary>
    [MaxLength(50)]
    public string? Code { get; set; }

    /// <summary>
    /// User-facing description of the promotion
    /// </summary>
    [MaxLength(500)]
    public string Description { get; set; } = string.Empty;

    // Stripe References
    /// <summary>
    /// Stripe Coupon ID (e.g., "launch-3mo-free")
    /// </summary>
    [Required]
    [MaxLength(100)]
    public string StripeCouponId { get; set; } = string.Empty;

    /// <summary>
    /// Stripe Promotion Code ID (e.g., "promo_xxx")
    /// </summary>
    [MaxLength(100)]
    public string? StripePromotionCodeId { get; set; }

    // Local tracking (mirrors Stripe for quick access)
    /// <summary>
    /// Whether the promotion is currently active
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Maximum number of times this promotion can be redeemed (null = unlimited)
    /// </summary>
    public int? MaxRedemptions { get; set; }

    /// <summary>
    /// Current number of redemptions (updated via webhook)
    /// </summary>
    public int CurrentRedemptions { get; set; } = 0;

    /// <summary>
    /// Expiration date for the promotion
    /// </summary>
    public DateTime? ExpiresAt { get; set; }

    // Offer details (for display without Stripe API call)
    /// <summary>
    /// Percentage off (0-100). Use 100 for free offers.
    /// </summary>
    public int PercentOff { get; set; } = 0;

    /// <summary>
    /// Fixed amount off (in cents). Alternative to PercentOff.
    /// </summary>
    [Column(TypeName = "decimal(18,2)")]
    public decimal? AmountOff { get; set; }

    /// <summary>
    /// Currency for AmountOff
    /// </summary>
    [MaxLength(3)]
    public string? AmountOffCurrency { get; set; }

    /// <summary>
    /// Duration type: once, repeating, forever
    /// </summary>
    [Required]
    [MaxLength(20)]
    public string Duration { get; set; } = "once";

    /// <summary>
    /// Number of months the discount applies (for repeating duration)
    /// </summary>
    public int? DurationInMonths { get; set; }

    /// <summary>
    /// Target subscription plan type (e.g., "premium", "pro")
    /// </summary>
    [MaxLength(50)]
    public string? TargetPlanType { get; set; }

    /// <summary>
    /// Whether this promotion is only for first-time subscribers
    /// </summary>
    public bool FirstTimeOnly { get; set; } = false;

    /// <summary>
    /// Whether this promotion auto-applies without a code
    /// </summary>
    public bool AutoApply { get; set; } = false;

    /// <summary>
    /// Whether this promotion is available for mobile users
    /// </summary>
    public bool AvailableOnMobile { get; set; } = true;

    /// <summary>
    /// Whether this promotion is available for web users
    /// </summary>
    public bool AvailableOnWeb { get; set; } = true;

    /// <summary>
    /// Minimum amount required for the promotion (in cents)
    /// </summary>
    [Column(TypeName = "decimal(18,2)")]
    public decimal? MinimumAmount { get; set; }

    /// <summary>
    /// Currency for MinimumAmount
    /// </summary>
    [MaxLength(3)]
    public string? MinimumAmountCurrency { get; set; }

    /// <summary>
    /// Additional metadata (JSON)
    /// </summary>
    public string? Metadata { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation properties
    public virtual ICollection<PromotionRedemption> Redemptions { get; set; } = new List<PromotionRedemption>();
}

/// <summary>
/// Tracks promotion redemptions (for analytics and mobile users)
/// </summary>
[Table("PromotionRedemptions")]
public class PromotionRedemption
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public Guid PromotionId { get; set; }

    [Required]
    public Guid UserId { get; set; }

    public DateTime RedeemedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Platform where redemption occurred: web, ios, android
    /// </summary>
    [Required]
    [MaxLength(20)]
    public string Platform { get; set; } = "web";

    /// <summary>
    /// Stripe Subscription ID (for web users)
    /// </summary>
    [MaxLength(100)]
    public string? StripeSubscriptionId { get; set; }

    /// <summary>
    /// IP address for fraud prevention
    /// </summary>
    [MaxLength(45)]
    public string? IpAddress { get; set; }

    /// <summary>
    /// User agent for analytics
    /// </summary>
    [MaxLength(500)]
    public string? UserAgent { get; set; }

    // Navigation properties
    [ForeignKey(nameof(PromotionId))]
    public virtual Promotion Promotion { get; set; } = null!;

    [ForeignKey(nameof(UserId))]
    public virtual User User { get; set; } = null!;
}

// DTOs for API requests/responses

public class CreatePromotionRequest
{
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [MaxLength(50)]
    public string? Code { get; set; }

    [MaxLength(500)]
    public string? Description { get; set; }

    /// <summary>
    /// Percentage off (0-100). Use 100 for free offers.
    /// </summary>
    [Range(0, 100)]
    public int? PercentOff { get; set; }

    /// <summary>
    /// Fixed amount off (in smallest currency unit, e.g., cents)
    /// </summary>
    public long? AmountOff { get; set; }

    /// <summary>
    /// Currency for AmountOff (required if AmountOff is set)
    /// </summary>
    [MaxLength(3)]
    public string? Currency { get; set; }

    /// <summary>
    /// Duration type: once, repeating, forever
    /// </summary>
    [Required]
    public string Duration { get; set; } = "once";

    /// <summary>
    /// Number of months (required if duration is "repeating")
    /// </summary>
    public int? DurationInMonths { get; set; }

    /// <summary>
    /// Maximum redemptions allowed
    /// </summary>
    public int? MaxRedemptions { get; set; }

    /// <summary>
    /// Expiration date (Unix timestamp)
    /// </summary>
    public long? RedeemBy { get; set; }

    /// <summary>
    /// Target plan type (e.g., "premium")
    /// </summary>
    [MaxLength(50)]
    public string? TargetPlanType { get; set; }

    /// <summary>
    /// Only available to first-time subscribers
    /// </summary>
    public bool FirstTimeOnly { get; set; } = false;

    /// <summary>
    /// Auto-apply to all eligible users
    /// </summary>
    public bool AutoApply { get; set; } = false;

    /// <summary>
    /// Available on mobile platforms
    /// </summary>
    public bool AvailableOnMobile { get; set; } = true;

    /// <summary>
    /// Available on web platform
    /// </summary>
    public bool AvailableOnWeb { get; set; } = true;

    /// <summary>
    /// Minimum purchase amount required
    /// </summary>
    public long? MinimumAmount { get; set; }

    /// <summary>
    /// Currency for minimum amount
    /// </summary>
    [MaxLength(3)]
    public string? MinimumAmountCurrency { get; set; }

    /// <summary>
    /// Additional metadata
    /// </summary>
    public Dictionary<string, string>? Metadata { get; set; }
}

public class UpdatePromotionRequest
{
    public bool? IsActive { get; set; }

    [MaxLength(200)]
    public string? Name { get; set; }

    [MaxLength(500)]
    public string? Description { get; set; }

    public bool? AvailableOnMobile { get; set; }
    public bool? AvailableOnWeb { get; set; }

    public Dictionary<string, string>? Metadata { get; set; }
}

public class PromotionDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Code { get; set; }
    public string Description { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public int? MaxRedemptions { get; set; }
    public int CurrentRedemptions { get; set; }
    public int? RemainingRedemptions => MaxRedemptions.HasValue ? MaxRedemptions.Value - CurrentRedemptions : null;
    public DateTime? ExpiresAt { get; set; }
    public int PercentOff { get; set; }
    public decimal? AmountOff { get; set; }
    public string? AmountOffCurrency { get; set; }
    public string Duration { get; set; } = string.Empty;
    public int? DurationInMonths { get; set; }
    public string? TargetPlanType { get; set; }
    public bool FirstTimeOnly { get; set; }
    public bool AutoApply { get; set; }
    public bool AvailableOnMobile { get; set; }
    public bool AvailableOnWeb { get; set; }
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Human-readable discount description
    /// </summary>
    public string DiscountDescription
    {
        get
        {
            var discount = PercentOff > 0
                ? $"{PercentOff}% off"
                : AmountOff.HasValue
                    ? $"{AmountOffCurrency} {AmountOff:F2} off"
                    : "Free";

            var duration = Duration switch
            {
                "once" => "first payment",
                "forever" => "forever",
                "repeating" => DurationInMonths.HasValue ? $"for {DurationInMonths} months" : "repeating",
                _ => Duration
            };

            return $"{discount} {duration}";
        }
    }
}

public class PromotionStatsDto
{
    public Guid PromotionId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Code { get; set; }
    public int TotalRedemptions { get; set; }
    public int? MaxRedemptions { get; set; }
    public int? RemainingRedemptions => MaxRedemptions.HasValue ? MaxRedemptions.Value - TotalRedemptions : null;
    public decimal UsagePercentage => MaxRedemptions.HasValue && MaxRedemptions.Value > 0
        ? Math.Round((decimal)TotalRedemptions / MaxRedemptions.Value * 100, 2)
        : 0;
    public int WebRedemptions { get; set; }
    public int IosRedemptions { get; set; }
    public int AndroidRedemptions { get; set; }
    public DateTime? FirstRedemption { get; set; }
    public DateTime? LastRedemption { get; set; }
}

public class ValidatePromotionResult
{
    public bool IsValid { get; set; }
    public string? ErrorMessage { get; set; }
    public PromotionDto? Promotion { get; set; }
}

public class RedeemPromotionRequest
{
    [Required]
    [MaxLength(50)]
    public string Code { get; set; } = string.Empty;

    /// <summary>
    /// Platform: web, ios, android
    /// </summary>
    [Required]
    [MaxLength(20)]
    public string Platform { get; set; } = "web";
}

public class RedeemPromotionResult
{
    public bool Success { get; set; }
    public string? ErrorMessage { get; set; }
    public PromotionRedemptionDto? Redemption { get; set; }

    /// <summary>
    /// For web users: Stripe promotion code ID to use with subscription
    /// </summary>
    public string? StripePromotionCodeId { get; set; }

    /// <summary>
    /// For mobile users: Subscription tier granted
    /// </summary>
    public string? GrantedTier { get; set; }

    /// <summary>
    /// For mobile users: Access expiration date
    /// </summary>
    public DateTime? AccessExpiresAt { get; set; }
}

public class PromotionRedemptionDto
{
    public Guid Id { get; set; }
    public Guid PromotionId { get; set; }
    public string PromotionName { get; set; } = string.Empty;
    public string? PromotionCode { get; set; }
    public DateTime RedeemedAt { get; set; }
    public string Platform { get; set; } = string.Empty;
}
