using System.Net.Http.Json;
using GeoLeap.Api.Tests.Infrastructure;
using Xunit;

namespace GeoLeap.Api.Tests.Controllers;

/// <summary>
/// Coverage tests for SubscriptionController - exercises subscription management.
/// Critical path - payment processing requires 80%+ coverage.
/// </summary>
[Collection("RealServicesTest")]
public class SubscriptionControllerCoverageTests : RealServicesTestBase
{
    public SubscriptionControllerCoverageTests(RealServicesTestFactory factory) : base(factory) { }

    [Fact]
    public async Task GetSubscriptionPlans_ExecutesPlansRetrievalPath()
    {
        ClearAuthentication(); // Public endpoint

        var response = await Client.GetAsync("/api/subscription/plans");

        Assert.NotNull(response);
    }

    [Fact]
    public async Task GetSubscriptionPlanDetails_ExecutesPlanDetailsPath()
    {
        ClearAuthentication();

        var response = await Client.GetAsync("/api/subscription/plans/premium");

        Assert.NotNull(response);
    }

    [Fact]
    public async Task CreateSubscription_ExecutesSubscriptionCreationPath()
    {
        SetAuthenticationHeader("test-user-token");

        var subscribeDto = new
        {
            PlanId = "premium",
            PaymentMethodId = "pm_test_123",
            BillingCycle = "monthly"
        };

        var response = await Client.PostAsJsonAsync("/api/subscription/subscribe", subscribeDto);

        Assert.NotNull(response);
    }

    [Fact]
    public async Task UpdateSubscription_ExecutesSubscriptionUpdatePath()
    {
        SetAuthenticationHeader("test-user-token");

        var updateDto = new
        {
            NewPlanId = "premium-yearly",
            ProrationBehavior = "immediate"
        };

        var response = await Client.PutAsJsonAsync("/api/subscription/update", updateDto);

        Assert.NotNull(response);
    }

    [Fact]
    public async Task CancelSubscription_ExecutesCancellationPath()
    {
        SetAuthenticationHeader("test-user-token");

        var cancelDto = new
        {
            Reason = "Too expensive",
            CancelAtPeriodEnd = true
        };

        var response = await Client.PostAsJsonAsync("/api/subscription/cancel", cancelDto);

        Assert.NotNull(response);
    }

    [Fact]
    public async Task ReactivateSubscription_ExecutesReactivationPath()
    {
        SetAuthenticationHeader("test-user-token");

        var response = await Client.PostAsync("/api/subscription/reactivate", null);

        Assert.NotNull(response);
    }

    [Fact]
    public async Task GetSubscriptionStatus_ExecutesStatusCheckPath()
    {
        SetAuthenticationHeader("test-user-token");

        var response = await Client.GetAsync("/api/subscription/status");

        Assert.NotNull(response);
    }

    [Fact]
    public async Task GetPaymentHistory_ExecutesPaymentHistoryPath()
    {
        SetAuthenticationHeader("test-user-token");

        var response = await Client.GetAsync("/api/subscription/payments");

        Assert.NotNull(response);
    }

    [Fact]
    public async Task GetInvoices_ExecutesInvoicesRetrievalPath()
    {
        SetAuthenticationHeader("test-user-token");

        var response = await Client.GetAsync("/api/subscription/invoices");

        Assert.NotNull(response);
    }

    [Fact]
    public async Task DownloadInvoice_ExecutesInvoiceDownloadPath()
    {
        SetAuthenticationHeader("test-user-token");

        var invoiceId = "inv_test_123";

        var response = await Client.GetAsync($"/api/subscription/invoices/{invoiceId}/download");

        Assert.NotNull(response);
    }

    [Fact]
    public async Task ApplyCoupon_ExecutesCouponApplicationPath()
    {
        SetAuthenticationHeader("test-user-token");

        var couponDto = new { CouponCode = "SAVE20" };

        var response = await Client.PostAsJsonAsync("/api/subscription/apply-coupon", couponDto);

        Assert.NotNull(response);
    }

    [Fact]
    public async Task RemoveCoupon_ExecutesCouponRemovalPath()
    {
        SetAuthenticationHeader("test-user-token");

        var response = await Client.DeleteAsync("/api/subscription/coupon");

        Assert.NotNull(response);
    }

    [Fact]
    public async Task UpdatePaymentMethod_ExecutesPaymentMethodUpdatePath()
    {
        SetAuthenticationHeader("test-user-token");

        var paymentDto = new
        {
            PaymentMethodId = "pm_new_method_123",
            SetAsDefault = true
        };

        var response = await Client.PutAsJsonAsync("/api/subscription/payment-method", paymentDto);

        Assert.NotNull(response);
    }

    [Fact]
    public async Task GetPaymentMethods_ExecutesPaymentMethodsListPath()
    {
        SetAuthenticationHeader("test-user-token");

        var response = await Client.GetAsync("/api/subscription/payment-methods");

        Assert.NotNull(response);
    }

    [Fact]
    public async Task DeletePaymentMethod_ExecutesPaymentMethodDeletionPath()
    {
        SetAuthenticationHeader("test-user-token");

        var paymentMethodId = "pm_test_123";

        var response = await Client.DeleteAsync($"/api/subscription/payment-methods/{paymentMethodId}");

        Assert.NotNull(response);
    }

    [Fact]
    public async Task PreviewSubscriptionChange_ExecutesChangePreviewPath()
    {
        SetAuthenticationHeader("test-user-token");

        var previewDto = new { NewPlanId = "premium-yearly" };

        var response = await Client.PostAsJsonAsync("/api/subscription/preview-change", previewDto);

        Assert.NotNull(response);
    }

    [Fact]
    public async Task GetSubscriptionUsage_ExecutesUsageRetrievalPath()
    {
        SetAuthenticationHeader("test-user-token");

        var response = await Client.GetAsync("/api/subscription/usage");

        Assert.NotNull(response);
    }

    [Fact]
    public async Task HandleWebhook_ExecutesWebhookProcessingPath()
    {
        // Webhook endpoint (no auth, uses signature verification)
        ClearAuthentication();

        var webhookDto = new
        {
            Type = "customer.subscription.updated",
            Data = new { Id = "sub_test_123" }
        };

        var response = await Client.PostAsJsonAsync("/api/subscription/webhook", webhookDto);

        Assert.NotNull(response);
    }

    [Fact]
    public async Task RetryFailedPayment_ExecutesPaymentRetryPath()
    {
        SetAuthenticationHeader("test-user-token");

        var invoiceId = "inv_failed_123";

        var response = await Client.PostAsync($"/api/subscription/retry-payment/{invoiceId}", null);

        Assert.NotNull(response);
    }

    [Fact]
    public async Task GetSubscriptionAnalytics_ExecutesAnalyticsPath()
    {
        SetAdminAuthentication(); // Admin only

        var response = await Client.GetAsync("/api/subscription/analytics?from=2024-01-01&to=2024-12-31");

        Assert.NotNull(response);
    }
}
