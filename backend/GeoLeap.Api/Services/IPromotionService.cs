using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service interface for managing promotions (synced with Stripe Coupons/Promotion Codes)
/// </summary>
public interface IPromotionService
{
    // ===== Admin Operations (Stripe is source of truth) =====

    /// <summary>
    /// Creates a new promotion in Stripe and syncs to local database
    /// </summary>
    Task<Promotion> CreatePromotionAsync(CreatePromotionRequest request);

    /// <summary>
    /// Updates promotion status in both Stripe and local database
    /// </summary>
    Task<Promotion> UpdatePromotionAsync(Guid id, UpdatePromotionRequest request);

    /// <summary>
    /// Toggles promotion active status in Stripe and local database
    /// </summary>
    Task<bool> TogglePromotionAsync(Guid id, bool isActive);

    /// <summary>
    /// Syncs all promotions from Stripe to local database
    /// </summary>
    Task SyncFromStripeAsync();

    /// <summary>
    /// Gets all promotions (from local database)
    /// </summary>
    Task<List<PromotionDto>> GetAllPromotionsAsync();

    /// <summary>
    /// Gets a specific promotion by ID
    /// </summary>
    Task<PromotionDto?> GetPromotionAsync(Guid id);

    /// <summary>
    /// Gets promotion statistics
    /// </summary>
    Task<PromotionStatsDto?> GetPromotionStatsAsync(Guid id);

    // ===== User Operations (Local queries for speed) =====

    /// <summary>
    /// Gets all active promotions available to users
    /// </summary>
    Task<List<PromotionDto>> GetActivePromotionsAsync(string? platform = null);

    /// <summary>
    /// Gets a promotion by its code
    /// </summary>
    Task<PromotionDto?> GetPromotionByCodeAsync(string code);

    /// <summary>
    /// Validates if a promotion code can be used by a specific user
    /// </summary>
    Task<ValidatePromotionResult> ValidatePromotionForUserAsync(string code, Guid userId, string platform = "web");

    /// <summary>
    /// Redeems a promotion for a user (primarily for mobile - web uses Stripe directly)
    /// </summary>
    Task<RedeemPromotionResult> RedeemPromotionAsync(Guid userId, RedeemPromotionRequest request, string? ipAddress = null, string? userAgent = null);

    /// <summary>
    /// Gets a user's redemption history
    /// </summary>
    Task<List<PromotionRedemptionDto>> GetUserRedemptionsAsync(Guid userId);

    // ===== Webhook Handlers (Keep local in sync with Stripe) =====

    /// <summary>
    /// Handles coupon created/updated/deleted events from Stripe
    /// </summary>
    Task HandleStripeCouponEventAsync(string eventType, string couponId, object? couponData = null);

    /// <summary>
    /// Handles promotion code created/updated events from Stripe
    /// </summary>
    Task HandleStripePromotionCodeEventAsync(string eventType, string promotionCodeId, object? promotionCodeData = null);

    /// <summary>
    /// Records a redemption from Stripe subscription webhook
    /// </summary>
    Task RecordStripeRedemptionAsync(string stripeSubscriptionId, string? stripePromotionCodeId, Guid userId);
}
