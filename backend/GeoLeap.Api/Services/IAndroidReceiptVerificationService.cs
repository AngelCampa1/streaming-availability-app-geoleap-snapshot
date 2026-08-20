namespace GeoLeap.Api.Services;

/// <summary>
/// Service for verifying Android Play Store purchases
/// </summary>
public interface IAndroidReceiptVerificationService
{
    /// <summary>
    /// Verify purchase with Google Play Store
    /// </summary>
    Task<ReceiptVerificationResult> VerifyPurchaseAsync(string packageName, string productId, string purchaseToken);
}
