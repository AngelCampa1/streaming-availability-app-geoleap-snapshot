using GeoLeap.Api.Controllers;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service for managing mobile In-App Purchases (iOS and Android)
/// Handles receipt verification, subscription sync, and feature access control
/// </summary>
public interface IMobileSubscriptionService
{
    /// <summary>
    /// Verify iOS App Store receipt and activate subscription
    /// </summary>
    Task<MobileSubscriptionResponse> VerifyIosReceiptAsync(Guid userId, IosReceiptRequest request);

    /// <summary>
    /// Verify Android Play Store receipt and activate subscription
    /// </summary>
    Task<MobileSubscriptionResponse> VerifyAndroidReceiptAsync(Guid userId, AndroidReceiptRequest request);

    /// <summary>
    /// Get current subscription status for user
    /// </summary>
    Task<MobileSubscriptionStatus> GetSubscriptionStatusAsync(Guid userId);

    /// <summary>
    /// Sync subscription with app store (checks for renewals, expirations, etc.)
    /// </summary>
    Task<MobileSubscriptionResponse> SyncSubscriptionAsync(Guid userId, SyncSubscriptionRequest request);

    /// <summary>
    /// Restore previous purchases (for app reinstalls)
    /// </summary>
    Task<RestorePurchasesResponse> RestorePurchasesAsync(Guid userId, RestorePurchasesRequest request);

    /// <summary>
    /// Cancel subscription (marks for cancellation at period end)
    /// </summary>
    Task<MobileSubscriptionResponse> CancelSubscriptionAsync(Guid userId);

    /// <summary>
    /// Check if user has access to a specific feature
    /// </summary>
    Task<bool> HasFeatureAccessAsync(Guid userId, string featureId);

    /// <summary>
    /// Get available subscription plans for platform
    /// </summary>
    Task<List<MobileSubscriptionPlan>> GetAvailablePlansAsync(string platform);
}
