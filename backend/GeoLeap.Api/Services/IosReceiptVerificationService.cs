using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace GeoLeap.Api.Services;

/// <summary>
/// iOS App Store receipt verification service
/// Verifies receipts with Apple's servers (production and sandbox)
/// </summary>
public class IosReceiptVerificationService : IIosReceiptVerificationService
{
    private readonly HttpClient _httpClient;
    private readonly ILogger<IosReceiptVerificationService> _logger;
    private readonly IConfiguration _configuration;

    // Apple's receipt verification endpoints
    private const string ProductionUrl = "https://buy.itunes.apple.com/verifyReceipt";
    private const string SandboxUrl = "https://sandbox.itunes.apple.com/verifyReceipt";

    public IosReceiptVerificationService(
        IHttpClientFactory httpClientFactory,
        ILogger<IosReceiptVerificationService> logger,
        IConfiguration configuration)
    {
        _httpClient = httpClientFactory.CreateClient();
        _logger = logger;
        _configuration = configuration;
    }

    public async Task<ReceiptVerificationResult> VerifyReceiptAsync(string receiptData)
    {
        try
        {
            _logger.LogInformation("Verifying iOS receipt");

            var sharedSecret = _configuration["Apple:SharedSecret"];

            // Try production environment first
            var result = await VerifyWithAppleAsync(receiptData, ProductionUrl, sharedSecret);

            // If status is 21007, the receipt is from sandbox - try sandbox environment
            if (result?.Status == 21007)
            {
                _logger.LogInformation("Receipt is from sandbox, retrying with sandbox environment");
                result = await VerifyWithAppleAsync(receiptData, SandboxUrl, sharedSecret);
            }

            if (result == null || result.Status != 0)
            {
                var errorMessage = GetErrorMessage(result?.Status ?? -1);
                _logger.LogWarning("iOS receipt verification failed: {Status} - {Error}", result?.Status, errorMessage);

                return new ReceiptVerificationResult
                {
                    IsValid = false,
                    ErrorMessage = errorMessage
                };
            }

            // Extract subscription info from latest receipt info
            var latestReceipt = result.LatestReceiptInfo?.OrderByDescending(r => r.ExpiresDate).FirstOrDefault();

            if (latestReceipt == null)
            {
                return new ReceiptVerificationResult
                {
                    IsValid = false,
                    ErrorMessage = "No subscription found in receipt"
                };
            }

            var expirationDate = DateTimeOffset.FromUnixTimeMilliseconds(latestReceipt.ExpiresDateMs).DateTime;
            var autoRenew = result.PendingRenewalInfo?.FirstOrDefault()?.AutoRenewStatus == "1";

            return new ReceiptVerificationResult
            {
                IsValid = true,
                ExpirationDate = expirationDate,
                AutoRenew = autoRenew,
                ProductId = latestReceipt.ProductId,
                TransactionId = latestReceipt.TransactionId,
                OriginalTransactionId = latestReceipt.OriginalTransactionId,
                BundleId = result.Receipt?.BundleId
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error verifying iOS receipt");
            return new ReceiptVerificationResult
            {
                IsValid = false,
                ErrorMessage = "Verification service error"
            };
        }
    }

    private async Task<AppleReceiptResponse?> VerifyWithAppleAsync(string receiptData, string url, string? sharedSecret)
    {
        try
        {
            var requestBody = new
            {
                receipt_data = receiptData,
                password = sharedSecret,
                exclude_old_transactions = true
            };

            var jsonContent = JsonSerializer.Serialize(requestBody);
            var content = new StringContent(jsonContent, Encoding.UTF8, "application/json");

            var response = await _httpClient.PostAsync(url, content);
            var responseContent = await response.Content.ReadAsStringAsync();

            var result = JsonSerializer.Deserialize<AppleReceiptResponse>(responseContent, new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true
            });

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calling Apple verification API at {Url}", url);
            return null;
        }
    }

    private string GetErrorMessage(int status)
    {
        return status switch
        {
            0 => "Valid receipt",
            21000 => "The App Store could not read the JSON object you provided",
            21002 => "The data in the receipt-data property was malformed or missing",
            21003 => "The receipt could not be authenticated",
            21004 => "The shared secret you provided does not match the shared secret on file",
            21005 => "The receipt server is not currently available",
            21006 => "This receipt is valid but the subscription has expired",
            21007 => "This receipt is from the test environment, but it was sent to the production environment",
            21008 => "This receipt is from the production environment, but it was sent to the test environment",
            21009 => "Internal data access error",
            21010 => "The user account cannot be found or has been deleted",
            _ => $"Unknown error (status {status})"
        };
    }
}

// ============================================================
// APPLE API RESPONSE MODELS
// ============================================================

internal class AppleReceiptResponse
{
    [JsonPropertyName("status")]
    public int Status { get; set; }

    [JsonPropertyName("environment")]
    public string? Environment { get; set; }

    [JsonPropertyName("receipt")]
    public AppleReceipt? Receipt { get; set; }

    [JsonPropertyName("latest_receipt_info")]
    public List<AppleReceiptInfo>? LatestReceiptInfo { get; set; }

    [JsonPropertyName("latest_receipt")]
    public string? LatestReceipt { get; set; }

    [JsonPropertyName("pending_renewal_info")]
    public List<ApplePendingRenewalInfo>? PendingRenewalInfo { get; set; }
}

internal class AppleReceipt
{
    [JsonPropertyName("receipt_type")]
    public string? ReceiptType { get; set; }

    [JsonPropertyName("bundle_id")]
    public string? BundleId { get; set; }

    [JsonPropertyName("in_app")]
    public List<AppleReceiptInfo>? InApp { get; set; }
}

internal class AppleReceiptInfo
{
    [JsonPropertyName("product_id")]
    public string ProductId { get; set; } = string.Empty;

    [JsonPropertyName("transaction_id")]
    public string TransactionId { get; set; } = string.Empty;

    [JsonPropertyName("original_transaction_id")]
    public string OriginalTransactionId { get; set; } = string.Empty;

    [JsonPropertyName("purchase_date_ms")]
    public string PurchaseDateMs { get; set; } = string.Empty;

    [JsonPropertyName("expires_date")]
    public string ExpiresDate { get; set; } = string.Empty;

    [JsonPropertyName("expires_date_ms")]
    public long ExpiresDateMs { get; set; }

    [JsonPropertyName("is_trial_period")]
    public string IsTrialPeriod { get; set; } = "false";

    [JsonPropertyName("cancellation_date_ms")]
    public string? CancellationDateMs { get; set; }
}

internal class ApplePendingRenewalInfo
{
    [JsonPropertyName("auto_renew_status")]
    public string AutoRenewStatus { get; set; } = "0";

    [JsonPropertyName("product_id")]
    public string ProductId { get; set; } = string.Empty;

    [JsonPropertyName("expiration_intent")]
    public string? ExpirationIntent { get; set; }
}
