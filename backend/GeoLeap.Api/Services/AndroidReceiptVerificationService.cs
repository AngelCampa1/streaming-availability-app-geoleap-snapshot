using Google.Apis.AndroidPublisher.v3;
using Google.Apis.Auth.OAuth2;
using Google.Apis.Services;
using System.Text.Json;

namespace GeoLeap.Api.Services;

/// <summary>
/// Android Play Store receipt verification service
/// Verifies purchases with Google Play Developer API
/// </summary>
public class AndroidReceiptVerificationService : IAndroidReceiptVerificationService
{
    private readonly ILogger<AndroidReceiptVerificationService> _logger;
    private readonly IConfiguration _configuration;
    private AndroidPublisherService? _androidPublisherService;

    public AndroidReceiptVerificationService(
        ILogger<AndroidReceiptVerificationService> logger,
        IConfiguration configuration)
    {
        _logger = logger;
        _configuration = configuration;
        InitializeService();
    }

    private void InitializeService()
    {
        try
        {
            var serviceAccountJson = _configuration["Google:PlayStore:ServiceAccountJson"];

            if (string.IsNullOrEmpty(serviceAccountJson))
            {
                _logger.LogWarning("Google Play service account not configured, receipt verification will fail");
                return;
            }

            var credential = GoogleCredential.FromJson(serviceAccountJson)
                .CreateScoped(AndroidPublisherService.Scope.Androidpublisher);

            _androidPublisherService = new AndroidPublisherService(new BaseClientService.Initializer
            {
                HttpClientInitializer = credential,
                ApplicationName = "GeoLeap"
            });

            _logger.LogInformation("Android Publisher service initialized successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to initialize Android Publisher service");
        }
    }

    public async Task<ReceiptVerificationResult> VerifyPurchaseAsync(string packageName, string productId, string purchaseToken)
    {
        try
        {
            _logger.LogInformation("Verifying Android purchase for product {ProductId}", productId);

            if (_androidPublisherService == null)
            {
                _logger.LogError("Android Publisher service not initialized");
                return new ReceiptVerificationResult
                {
                    IsValid = false,
                    ErrorMessage = "Verification service not available"
                };
            }

            // Get purchase details from Google Play
            var request = _androidPublisherService.Purchases.Subscriptions.Get(packageName, productId, purchaseToken);
            var subscriptionPurchase = await request.ExecuteAsync();

            if (subscriptionPurchase == null)
            {
                _logger.LogWarning("No subscription found for product {ProductId}", productId);
                return new ReceiptVerificationResult
                {
                    IsValid = false,
                    ErrorMessage = "Subscription not found"
                };
            }

            // Check if subscription is valid
            var isValid = subscriptionPurchase.PaymentState == 1; // 1 = Payment received

            if (!isValid)
            {
                var errorMessage = GetPaymentStateMessage(subscriptionPurchase.PaymentState);
                _logger.LogWarning("Android subscription payment state: {PaymentState} - {Message}",
                    subscriptionPurchase.PaymentState, errorMessage);

                return new ReceiptVerificationResult
                {
                    IsValid = false,
                    ErrorMessage = errorMessage
                };
            }

            // Subscriptions must include a Google-issued future expiry. Never synthesize
            // subscription time when Google omits or returns an expired expiry.
            var expiryTimeMillis = subscriptionPurchase.ExpiryTimeMillis;
            if (!expiryTimeMillis.HasValue)
            {
                _logger.LogWarning("Android subscription missing expiry for product {ProductId}", productId);
                return new ReceiptVerificationResult
                {
                    IsValid = false,
                    ErrorMessage = "Subscription expiry was missing from Google Play"
                };
            }

            var expirationDate = DateTimeOffset.FromUnixTimeMilliseconds(expiryTimeMillis.Value).UtcDateTime;
            if (expirationDate <= DateTime.UtcNow)
            {
                _logger.LogWarning("Android subscription expired for product {ProductId}, expiry {ExpiryDate}", productId, expirationDate);
                return new ReceiptVerificationResult
                {
                    IsValid = false,
                    ErrorMessage = "Subscription has expired"
                };
            }

            // Check auto-renew status
            var autoRenew = subscriptionPurchase.AutoRenewing ?? false;

            return new ReceiptVerificationResult
            {
                IsValid = true,
                ExpirationDate = expirationDate,
                AutoRenew = autoRenew,
                ProductId = productId,
                TransactionId = subscriptionPurchase.OrderId
            };
        }
        catch (Google.GoogleApiException ex)
        {
            _logger.LogError(ex, "Google API error verifying Android purchase: {StatusCode} - {Message}",
                ex.HttpStatusCode, ex.Message);

            return new ReceiptVerificationResult
            {
                IsValid = false,
                ErrorMessage = $"Verification failed: {ex.Message}"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error verifying Android purchase");
            return new ReceiptVerificationResult
            {
                IsValid = false,
                ErrorMessage = "Verification service error"
            };
        }
    }

    private string GetPaymentStateMessage(int? paymentState)
    {
        return paymentState switch
        {
            0 => "Payment pending",
            1 => "Payment received",
            2 => "Free trial",
            3 => "Pending deferred upgrade/downgrade",
            _ => "Unknown payment state"
        };
    }
}
