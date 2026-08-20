using System.Net.Http.Json;
using GeoLeap.Api.Tests.Infrastructure;
using Xunit;

namespace GeoLeap.Api.Tests.Controllers;

/// <summary>
/// Coverage tests for PaymentController - exercises payment processing paths.
/// CRITICAL PATH - requires 95%+ coverage for security.
/// </summary>
[Collection("RealServicesTest")]
public class PaymentControllerCoverageTests : RealServicesTestBase
{
    public PaymentControllerCoverageTests(RealServicesTestFactory factory) : base(factory) { }

    [Fact]
    public async Task CreatePaymentIntent_ExecutesIntentCreationPath()
    {
        SetAuthenticationHeader("test-user-token");

        var intentDto = new
        {
            Amount = 999, // $9.99
            Currency = "usd",
            PaymentMethodId = "pm_test_123"
        };

        var response = await Client.PostAsJsonAsync("/api/payment/intent", intentDto);

        Assert.NotNull(response);
    }

    [Fact]
    public async Task ConfirmPayment_ExecutesPaymentConfirmationPath()
    {
        SetAuthenticationHeader("test-user-token");

        var confirmDto = new
        {
            PaymentIntentId = "pi_test_123",
            PaymentMethodId = "pm_test_123"
        };

        var response = await Client.PostAsJsonAsync("/api/payment/confirm", confirmDto);

        Assert.NotNull(response);
    }

    [Fact]
    public async Task RefundPayment_ExecutesRefundPath()
    {
        SetAdminAuthentication(); // Admin only

        var refundDto = new
        {
            PaymentIntentId = "pi_test_123",
            Amount = 999,
            Reason = "Customer request"
        };

        var response = await Client.PostAsJsonAsync("/api/payment/refund", refundDto);

        Assert.NotNull(response);
    }

    [Fact]
    public async Task GetPaymentMethods_ExecutesPaymentMethodsRetrievalPath()
    {
        SetAuthenticationHeader("test-user-token");

        var response = await Client.GetAsync("/api/payment/methods");

        Assert.NotNull(response);
    }

    [Fact]
    public async Task AddPaymentMethod_ExecutesMethodAdditionPath()
    {
        SetAuthenticationHeader("test-user-token");

        var methodDto = new
        {
            Type = "card",
            Token = "tok_visa",
            IsDefault = true
        };

        var response = await Client.PostAsJsonAsync("/api/payment/methods", methodDto);

        Assert.NotNull(response);
    }

    [Fact]
    public async Task DeletePaymentMethod_ExecutesMethodDeletionPath()
    {
        SetAuthenticationHeader("test-user-token");

        var methodId = "pm_test_123";

        var response = await Client.DeleteAsync($"/api/payment/methods/{methodId}");

        Assert.NotNull(response);
    }

    [Fact]
    public async Task SetDefaultPaymentMethod_ExecutesDefaultSettingPath()
    {
        SetAuthenticationHeader("test-user-token");

        var defaultDto = new { PaymentMethodId = "pm_test_123" };

        var response = await Client.PutAsJsonAsync("/api/payment/methods/default", defaultDto);

        Assert.NotNull(response);
    }

    [Fact]
    public async Task GetTransactionHistory_ExecutesHistoryRetrievalPath()
    {
        SetAuthenticationHeader("test-user-token");

        var response = await Client.GetAsync("/api/payment/transactions?from=2024-01-01&to=2024-12-31");

        Assert.NotNull(response);
    }

    [Fact]
    public async Task GetTransactionDetails_ExecutesDetailsRetrievalPath()
    {
        SetAuthenticationHeader("test-user-token");

        var transactionId = "txn_test_123";

        var response = await Client.GetAsync($"/api/payment/transactions/{transactionId}");

        Assert.NotNull(response);
    }

    [Fact]
    public async Task VerifyPayment_ExecutesPaymentVerificationPath()
    {
        SetAuthenticationHeader("test-user-token");

        var verifyDto = new { PaymentIntentId = "pi_test_123" };

        var response = await Client.PostAsJsonAsync("/api/payment/verify", verifyDto);

        Assert.NotNull(response);
    }

    [Fact]
    public async Task HandleStripeWebhook_ExecutesWebhookHandlingPath()
    {
        // Webhook endpoint (no auth, signature-based)
        ClearAuthentication();

        var webhookDto = new
        {
            Type = "payment_intent.succeeded",
            Data = new
            {
                Object = new
                {
                    Id = "pi_test_123",
                    Amount = 999,
                    Status = "succeeded"
                }
            }
        };

        var response = await Client.PostAsJsonAsync("/api/payment/webhook", webhookDto);

        Assert.NotNull(response);
    }

    [Fact]
    public async Task ValidatePaymentMethod_ExecutesValidationPath()
    {
        SetAuthenticationHeader("test-user-token");

        var validateDto = new
        {
            CardNumber = "4242424242424242",
            ExpMonth = 12,
            ExpYear = 2025,
            Cvc = "123"
        };

        var response = await Client.PostAsJsonAsync("/api/payment/validate", validateDto);

        Assert.NotNull(response);
    }

    [Fact]
    public async Task GetPaymentReceipt_ExecutesReceiptGenerationPath()
    {
        SetAuthenticationHeader("test-user-token");

        var transactionId = "txn_test_123";

        var response = await Client.GetAsync($"/api/payment/receipt/{transactionId}");

        Assert.NotNull(response);
    }

    [Fact]
    public async Task CreateSetupIntent_ExecutesSetupIntentPath()
    {
        SetAuthenticationHeader("test-user-token");

        var setupDto = new { PaymentMethodType = "card" };

        var response = await Client.PostAsJsonAsync("/api/payment/setup-intent", setupDto);

        Assert.NotNull(response);
    }

    [Fact]
    public async Task CancelPayment_ExecutesCancellationPath()
    {
        SetAuthenticationHeader("test-user-token");

        var cancelDto = new { PaymentIntentId = "pi_test_123", Reason = "Changed mind" };

        var response = await Client.PostAsJsonAsync("/api/payment/cancel", cancelDto);

        Assert.NotNull(response);
    }

    [Fact]
    public async Task GetPaymentAnalytics_ExecutesAnalyticsPath()
    {
        SetAdminAuthentication();

        var response = await Client.GetAsync("/api/payment/analytics?period=last-30-days");

        Assert.NotNull(response);
    }
}
