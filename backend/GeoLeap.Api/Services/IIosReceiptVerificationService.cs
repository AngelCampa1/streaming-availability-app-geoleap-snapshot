namespace GeoLeap.Api.Services;

/// <summary>
/// Service for verifying iOS App Store receipts
/// </summary>
public interface IIosReceiptVerificationService
{
    /// <summary>
    /// Verify receipt with Apple App Store
    /// </summary>
    Task<ReceiptVerificationResult> VerifyReceiptAsync(string receiptData);
}

/// <summary>
/// Receipt verification result
/// </summary>
public class ReceiptVerificationResult
{
    public bool IsValid { get; set; }
    public string? ErrorMessage { get; set; }
    public DateTime? ExpirationDate { get; set; }
    public bool AutoRenew { get; set; }
    public string? ProductId { get; set; }
    public string? TransactionId { get; set; }
    public string? OriginalTransactionId { get; set; }
    public string? BundleId { get; set; }
}
