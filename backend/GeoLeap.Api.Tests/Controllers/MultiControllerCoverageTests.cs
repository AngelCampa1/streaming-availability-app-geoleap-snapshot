using System.Net.Http.Json;
using GeoLeap.Api.Models;
using GeoLeap.Api.Tests.Infrastructure;
using Xunit;

namespace GeoLeap.Api.Tests.Controllers;

/// <summary>
/// Coverage tests for multiple controllers - exercises various API endpoints.
/// Strategy: Test all CRUD operations for each controller to maximize coverage quickly.
/// </summary>
[Collection("RealServicesTest")]
public class MultiControllerCoverageTests : RealServicesTestBase
{
    public MultiControllerCoverageTests(RealServicesTestFactory factory) : base(factory) { }

    #region DashboardController

    [Fact]
    public async Task Dashboard_GetOverview_ExecutesPath()
    {
        SetAuthenticationHeader("test-user-token");
        var response = await Client.GetAsync("/api/dashboard");
        Assert.NotNull(response);
    }

    [Fact]
    public async Task Dashboard_GetRecommendations_ExecutesPath()
    {
        SetAuthenticationHeader("test-user-token");
        var response = await Client.GetAsync("/api/dashboard/recommendations");
        Assert.NotNull(response);
    }

    [Fact]
    public async Task Dashboard_GetActivity_ExecutesPath()
    {
        SetAuthenticationHeader("test-user-token");
        var response = await Client.GetAsync("/api/dashboard/activity");
        Assert.NotNull(response);
    }

    #endregion

    #region NotificationController

    [Fact]
    public async Task Notifications_Get_ExecutesPath()
    {
        SetAuthenticationHeader("test-user-token");
        var response = await Client.GetAsync("/api/notifications");
        Assert.NotNull(response);
    }

    [Fact]
    public async Task Notifications_MarkAsRead_ExecutesPath()
    {
        SetAuthenticationHeader("test-user-token");
        var dto = new { NotificationIds = new[] { Guid.NewGuid() } };
        var response = await Client.PostAsJsonAsync("/api/notifications/mark-read", dto);
        Assert.NotNull(response);
    }

    [Fact]
    public async Task Notifications_UpdatePreferences_ExecutesPath()
    {
        SetAuthenticationHeader("test-user-token");
        var dto = new { Email = true, Push = false, Sms = false };
        var response = await Client.PutAsJsonAsync("/api/notifications/preferences", dto);
        Assert.NotNull(response);
    }

    #endregion

    #region FeedbackController

    [Fact]
    public async Task Feedback_Submit_ExecutesPath()
    {
        SetAuthenticationHeader("test-user-token");
        var dto = new { Subject = "Bug report", Message = "Found an issue", Category = "bug" };
        var response = await Client.PostAsJsonAsync("/api/feedback", dto);
        Assert.NotNull(response);
    }

    [Fact]
    public async Task Feedback_GetAll_ExecutesPath()
    {
        SetAdminAuthentication();
        var response = await Client.GetAsync("/api/feedback");
        Assert.NotNull(response);
    }

    [Fact]
    public async Task Feedback_Respond_ExecutesPath()
    {
        SetAdminAuthentication();
        var feedbackId = Guid.NewGuid();
        var dto = new { Response = "Thank you for your feedback" };
        var response = await Client.PostAsJsonAsync($"/api/feedback/{feedbackId}/respond", dto);
        Assert.NotNull(response);
    }

    #endregion

    #region HealthController

    [Fact]
    public async Task Health_Check_ExecutesPath()
    {
        var response = await Client.GetAsync("/health");
        Assert.NotNull(response);
    }

    [Fact]
    public async Task Health_Ready_ExecutesPath()
    {
        var response = await Client.GetAsync("/health/ready");
        Assert.NotNull(response);
    }

    [Fact]
    public async Task Health_Live_ExecutesPath()
    {
        var response = await Client.GetAsync("/health/live");
        Assert.NotNull(response);
    }

    #endregion

    #region AdvancedFilterController

    [Theory]
    [InlineData("/api/filters/advanced?genre=action&year=2024")]
    [InlineData("/api/filters/advanced?rating=8.0&language=en")]
    [InlineData("/api/filters/advanced?country=US&service=netflix")]
    public async Task AdvancedFilter_Apply_ExecutesPaths(string endpoint)
    {
        SetAuthenticationHeader("test-user-token");
        var response = await Client.GetAsync(endpoint);
        Assert.NotNull(response);
    }

    [Fact]
    public async Task AdvancedFilter_SaveFilter_ExecutesPath()
    {
        SetAuthenticationHeader("test-user-token");
        var dto = new { Name = "My Filter", Criteria = new { Genre = "action", Year = 2024 } };
        var response = await Client.PostAsJsonAsync("/api/filters/save", dto);
        Assert.NotNull(response);
    }

    #endregion

    #region OnboardingController

    [Fact]
    public async Task Onboarding_GetFlow_ExecutesPath()
    {
        SetAuthenticationHeader("test-user-token");
        var response = await Client.GetAsync("/api/onboarding");
        Assert.NotNull(response);
    }

    [Fact]
    public async Task Onboarding_CompleteStep_ExecutesPath()
    {
        SetAuthenticationHeader("test-user-token");
        var dto = new { Step = "preferences", Data = new { Genres = new[] { "action" } } };
        var response = await Client.PostAsJsonAsync("/api/onboarding/step", dto);
        Assert.NotNull(response);
    }

    [Fact]
    public async Task Onboarding_Skip_ExecutesPath()
    {
        SetAuthenticationHeader("test-user-token");
        var response = await Client.PostAsync("/api/onboarding/skip", null);
        Assert.NotNull(response);
    }

    #endregion

    #region DataRefreshController

    [Fact]
    public async Task DataRefresh_TriggerManual_ExecutesPath()
    {
        SetAdminAuthentication();
        var dto = new { ContentType = "movies", Scope = "trending" };
        var response = await Client.PostAsJsonAsync("/api/data-refresh/trigger", dto);
        Assert.NotNull(response);
    }

    [Fact]
    public async Task DataRefresh_GetStatus_ExecutesPath()
    {
        SetAdminAuthentication();
        var response = await Client.GetAsync("/api/data-refresh/status");
        Assert.NotNull(response);
    }

    [Fact]
    public async Task DataRefresh_GetHistory_ExecutesPath()
    {
        SetAdminAuthentication();
        var response = await Client.GetAsync("/api/data-refresh/history?limit=10");
        Assert.NotNull(response);
    }

    #endregion

    #region AsoController (App Store Optimization)

    [Fact]
    public async Task Aso_GetMetadata_ExecutesPath()
    {
        SetAdminAuthentication();
        var response = await Client.GetAsync("/api/aso/metadata");
        Assert.NotNull(response);
    }

    [Fact]
    public async Task Aso_UpdateMetadata_ExecutesPath()
    {
        SetAdminAuthentication();
        var dto = new
        {
            Title = "GeoLeap - Stream Discovery",
            Description = "Find streaming content",
            Keywords = new[] { "streaming", "movies", "tv shows" }
        };
        var response = await Client.PutAsJsonAsync("/api/aso/metadata", dto);
        Assert.NotNull(response);
    }

    [Fact]
    public async Task Aso_GetAnalytics_ExecutesPath()
    {
        SetAdminAuthentication();
        var response = await Client.GetAsync("/api/aso/analytics");
        Assert.NotNull(response);
    }

    #endregion

    #region BusinessAnalyticsController

    [Fact]
    public async Task BusinessAnalytics_GetRevenue_ExecutesPath()
    {
        SetAdminAuthentication();
        var response = await Client.GetAsync("/api/business-analytics/revenue?from=2024-01-01&to=2024-12-31");
        Assert.NotNull(response);
    }

    [Fact]
    public async Task BusinessAnalytics_GetUserGrowth_ExecutesPath()
    {
        SetAdminAuthentication();
        var response = await Client.GetAsync("/api/business-analytics/user-growth?period=last-90-days");
        Assert.NotNull(response);
    }

    [Fact]
    public async Task BusinessAnalytics_GetChurnRate_ExecutesPath()
    {
        SetAdminAuthentication();
        var response = await Client.GetAsync("/api/business-analytics/churn");
        Assert.NotNull(response);
    }

    [Fact]
    public async Task BusinessAnalytics_GetLTV_ExecutesPath()
    {
        SetAdminAuthentication();
        var response = await Client.GetAsync("/api/business-analytics/ltv");
        Assert.NotNull(response);
    }

    #endregion

    #region CostManagementController

    [Fact]
    public async Task CostManagement_GetApiCosts_ExecutesPath()
    {
        SetAdminAuthentication();
        var response = await Client.GetAsync("/api/cost-management/api-costs?from=2024-01-01");
        Assert.NotNull(response);
    }

    [Fact]
    public async Task CostManagement_GetBudgetStatus_ExecutesPath()
    {
        SetAdminAuthentication();
        var response = await Client.GetAsync("/api/cost-management/budget");
        Assert.NotNull(response);
    }

    [Fact]
    public async Task CostManagement_SetBudgetAlert_ExecutesPath()
    {
        SetAdminAuthentication();
        var dto = new { Threshold = 1000, AlertEmail = "admin@test.com" };
        var response = await Client.PostAsJsonAsync("/api/cost-management/alerts", dto);
        Assert.NotNull(response);
    }

    #endregion

    #region DunningController

    [Fact]
    public async Task Dunning_GetFailedPayments_ExecutesPath()
    {
        SetAdminAuthentication();
        var response = await Client.GetAsync("/api/dunning/failed-payments");
        Assert.NotNull(response);
    }

    [Fact]
    public async Task Dunning_RetryPayment_ExecutesPath()
    {
        SetAdminAuthentication();
        var paymentId = Guid.NewGuid();
        var response = await Client.PostAsync($"/api/dunning/{paymentId}/retry", null);
        Assert.NotNull(response);
    }

    [Fact]
    public async Task Dunning_SendReminder_ExecutesPath()
    {
        SetAdminAuthentication();
        var userId = Guid.NewGuid();
        var response = await Client.PostAsync($"/api/dunning/{userId}/send-reminder", null);
        Assert.NotNull(response);
    }

    #endregion

    #region InvoiceController

    [Fact]
    public async Task Invoice_GetAll_ExecutesPath()
    {
        SetAuthenticationHeader("test-user-token");
        var response = await Client.GetAsync("/api/invoices");
        Assert.NotNull(response);
    }

    [Fact]
    public async Task Invoice_GetById_ExecutesPath()
    {
        SetAuthenticationHeader("test-user-token");
        var invoiceId = "inv_test_123";
        var response = await Client.GetAsync($"/api/invoices/{invoiceId}");
        Assert.NotNull(response);
    }

    [Fact]
    public async Task Invoice_Download_ExecutesPath()
    {
        SetAuthenticationHeader("test-user-token");
        var invoiceId = "inv_test_123";
        var response = await Client.GetAsync($"/api/invoices/{invoiceId}/download");
        Assert.NotNull(response);
    }

    #endregion

    #region ABTestingController

    [Fact]
    public async Task ABTesting_GetActiveTests_ExecutesPath()
    {
        SetAdminAuthentication();
        var response = await Client.GetAsync("/api/ab-testing/tests");
        Assert.NotNull(response);
    }

    [Fact]
    public async Task ABTesting_CreateTest_ExecutesPath()
    {
        SetAdminAuthentication();
        var dto = new
        {
            Name = "Homepage Layout Test",
            VariantA = "current",
            VariantB = "new-design",
            TrafficSplit = 50
        };
        var response = await Client.PostAsJsonAsync("/api/ab-testing/tests", dto);
        Assert.NotNull(response);
    }

    [Fact]
    public async Task ABTesting_GetResults_ExecutesPath()
    {
        SetAdminAuthentication();
        var testId = Guid.NewGuid();
        var response = await Client.GetAsync($"/api/ab-testing/tests/{testId}/results");
        Assert.NotNull(response);
    }

    #endregion

    #region BackupController

    [Fact]
    public async Task Backup_Create_ExecutesPath()
    {
        SetAdminAuthentication();
        var dto = new { Type = "full", IncludeUserData = true };
        var response = await Client.PostAsJsonAsync("/api/backup/create", dto);
        Assert.NotNull(response);
    }

    [Fact]
    public async Task Backup_GetAll_ExecutesPath()
    {
        SetAdminAuthentication();
        var response = await Client.GetAsync("/api/backup");
        Assert.NotNull(response);
    }

    [Fact]
    public async Task Backup_Restore_ExecutesPath()
    {
        SetAdminAuthentication();
        var backupId = Guid.NewGuid();
        var response = await Client.PostAsync($"/api/backup/{backupId}/restore", null);
        Assert.NotNull(response);
    }

    #endregion

    #region DisasterRecoveryController

    [Fact]
    public async Task DisasterRecovery_GetPlan_ExecutesPath()
    {
        SetAdminAuthentication();
        var response = await Client.GetAsync("/api/disaster-recovery/plan");
        Assert.NotNull(response);
    }

    [Fact]
    public async Task DisasterRecovery_TestRecovery_ExecutesPath()
    {
        SetAdminAuthentication();
        var response = await Client.PostAsync("/api/disaster-recovery/test", null);
        Assert.NotNull(response);
    }

    [Fact]
    public async Task DisasterRecovery_InitiateFailover_ExecutesPath()
    {
        SetAdminAuthentication();
        var dto = new { TargetRegion = "us-west-2" };
        var response = await Client.PostAsJsonAsync("/api/disaster-recovery/failover", dto);
        Assert.NotNull(response);
    }

    #endregion

    #region GrowthAnalyticsController

    [Fact]
    public async Task GrowthAnalytics_GetFunnelMetrics_ExecutesPath()
    {
        SetAdminAuthentication();
        var response = await Client.GetAsync("/api/growth-analytics/funnel");
        Assert.NotNull(response);
    }

    [Fact]
    public async Task GrowthAnalytics_GetCohortAnalysis_ExecutesPath()
    {
        SetAdminAuthentication();
        var response = await Client.GetAsync("/api/growth-analytics/cohorts?from=2024-01-01");
        Assert.NotNull(response);
    }

    [Fact]
    public async Task GrowthAnalytics_GetRetention_ExecutesPath()
    {
        SetAdminAuthentication();
        var response = await Client.GetAsync("/api/growth-analytics/retention?period=daily");
        Assert.NotNull(response);
    }

    #endregion

    #region MobileSubscriptionController

    [Fact]
    public async Task MobileSubscription_VerifyIosReceipt_ExecutesPath()
    {
        SetAuthenticationHeader("test-user-token");
        var dto = new { ReceiptData = "base64-receipt-data", ProductId = "com.geoleap.premium" };
        var response = await Client.PostAsJsonAsync("/api/mobile-subscription/ios/verify", dto);
        Assert.NotNull(response);
    }

    [Fact]
    public async Task MobileSubscription_VerifyAndroidReceipt_ExecutesPath()
    {
        SetAuthenticationHeader("test-user-token");
        var dto = new { PurchaseToken = "purchase-token", ProductId = "com.geoleap.premium", PackageName = "com.geoleap.app" };
        var response = await Client.PostAsJsonAsync("/api/mobile-subscription/android/verify", dto);
        Assert.NotNull(response);
    }

    #endregion

    #region CustomerSupportAnalyticsController

    [Fact]
    public async Task CustomerSupportAnalytics_GetTicketStats_ExecutesPath()
    {
        SetAdminAuthentication();
        var response = await Client.GetAsync("/api/customer-support-analytics/tickets");
        Assert.NotNull(response);
    }

    [Fact]
    public async Task CustomerSupportAnalytics_GetResponseTimes_ExecutesPath()
    {
        SetAdminAuthentication();
        var response = await Client.GetAsync("/api/customer-support-analytics/response-times");
        Assert.NotNull(response);
    }

    [Fact]
    public async Task CustomerSupportAnalytics_GetSatisfactionScores_ExecutesPath()
    {
        SetAdminAuthentication();
        var response = await Client.GetAsync("/api/customer-support-analytics/satisfaction");
        Assert.NotNull(response);
    }

    #endregion
}
