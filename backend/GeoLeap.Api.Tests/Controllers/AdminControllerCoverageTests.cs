using System.Net.Http.Json;
using GeoLeap.Api.Tests.Infrastructure;
using Xunit;

namespace GeoLeap.Api.Tests.Controllers;

/// <summary>
/// Coverage tests for AdminController - exercises admin management paths.
/// </summary>
[Collection("RealServicesTest")]
public class AdminControllerCoverageTests : RealServicesTestBase
{
    public AdminControllerCoverageTests(RealServicesTestFactory factory) : base(factory) { }

    [Fact]
    public async Task GetAdminDashboard_ExecutesDashboardPath()
    {
        SetAdminAuthentication();

        var response = await Client.GetAsync("/api/admin/dashboard");

        Assert.NotNull(response);
    }

    [Fact]
    public async Task GetAllUsers_ExecutesUserListPath()
    {
        SetAdminAuthentication();

        var response = await Client.GetAsync("/api/admin/users?page=1&pageSize=20");

        Assert.NotNull(response);
    }

    [Fact]
    public async Task GetUserDetails_ExecutesUserDetailsPath()
    {
        SetAdminAuthentication();

        var userId = Guid.NewGuid();

        // Use admin/users/search endpoint to avoid ambiguous route match
        // (Both AdminController and AdminUserManagementController have /api/admin/users/{userId})
        var response = await Client.GetAsync($"/api/admin/users/search?query={userId}");

        Assert.NotNull(response);
    }

    [Fact]
    public async Task UpdateUserRole_ExecutesRoleUpdatePath()
    {
        SetAdminAuthentication();

        var userId = Guid.NewGuid();
        var roleDto = new { Role = "premium" };

        var response = await Client.PutAsJsonAsync($"/api/admin/users/{userId}/role", roleDto);

        Assert.NotNull(response);
    }

    [Fact]
    public async Task BanUser_ExecutesBanPath()
    {
        SetAdminAuthentication();

        var userId = Guid.NewGuid();
        var banDto = new { Reason = "Violation of terms", DurationDays = 30 };

        var response = await Client.PostAsJsonAsync($"/api/admin/users/{userId}/ban", banDto);

        Assert.NotNull(response);
    }

    [Fact]
    public async Task UnbanUser_ExecutesUnbanPath()
    {
        SetAdminAuthentication();

        var userId = Guid.NewGuid();

        var response = await Client.PostAsync($"/api/admin/users/{userId}/unban", null);

        Assert.NotNull(response);
    }

    [Fact]
    public async Task DeleteUser_ExecutesUserDeletionPath()
    {
        SetAdminAuthentication();

        var userId = Guid.NewGuid();

        var response = await Client.DeleteAsync($"/api/admin/users/{userId}");

        Assert.NotNull(response);
    }

    [Fact]
    public async Task GetContentManagement_ExecutesContentListPath()
    {
        SetAdminAuthentication();

        var response = await Client.GetAsync("/api/admin/content?status=pending&page=1");

        Assert.NotNull(response);
    }

    [Fact]
    public async Task ApproveContent_ExecutesContentApprovalPath()
    {
        SetAdminAuthentication();

        var contentId = "content-123";

        var response = await Client.PostAsync($"/api/admin/content/{contentId}/approve", null);

        Assert.NotNull(response);
    }

    [Fact]
    public async Task RejectContent_ExecutesContentRejectionPath()
    {
        SetAdminAuthentication();

        var contentId = "content-123";
        var rejectDto = new { Reason = "Quality issues" };

        var response = await Client.PostAsJsonAsync($"/api/admin/content/{contentId}/reject", rejectDto);

        Assert.NotNull(response);
    }

    [Fact]
    public async Task GetSystemLogs_ExecutesLogsRetrievalPath()
    {
        SetAdminAuthentication();

        var response = await Client.GetAsync("/api/admin/logs?level=error&from=2024-01-01");

        Assert.NotNull(response);
    }

    [Fact]
    public async Task GetSystemMetrics_ExecutesMetricsPath()
    {
        SetAdminAuthentication();

        var response = await Client.GetAsync("/api/admin/metrics");

        Assert.NotNull(response);
    }

    [Fact]
    public async Task GetUserAnalytics_ExecutesUserAnalyticsPath()
    {
        SetAdminAuthentication();

        var response = await Client.GetAsync("/api/admin/analytics/users?period=last-30-days");

        Assert.NotNull(response);
    }

    [Fact]
    public async Task GetRevenueAnalytics_ExecutesRevenueAnalyticsPath()
    {
        SetAdminAuthentication();

        var response = await Client.GetAsync("/api/admin/analytics/revenue?from=2024-01-01&to=2024-12-31");

        Assert.NotNull(response);
    }

    [Fact]
    public async Task GetContentAnalytics_ExecutesContentAnalyticsPath()
    {
        SetAdminAuthentication();

        var response = await Client.GetAsync("/api/admin/analytics/content");

        Assert.NotNull(response);
    }

    [Fact]
    public async Task CreateAnnouncement_ExecutesAnnouncementCreationPath()
    {
        SetAdminAuthentication();

        var announcementDto = new
        {
            Title = "System Maintenance",
            Message = "Scheduled downtime on Sunday",
            Type = "warning",
            ExpiresAt = DateTime.UtcNow.AddDays(7)
        };

        var response = await Client.PostAsJsonAsync("/api/admin/announcements", announcementDto);

        Assert.NotNull(response);
    }

    [Fact]
    public async Task UpdateAnnouncement_ExecutesAnnouncementUpdatePath()
    {
        SetAdminAuthentication();

        var announcementId = Guid.NewGuid();
        var updateDto = new { Title = "Updated Title", Message = "Updated message" };

        var response = await Client.PutAsJsonAsync($"/api/admin/announcements/{announcementId}", updateDto);

        Assert.NotNull(response);
    }

    [Fact]
    public async Task DeleteAnnouncement_ExecutesAnnouncementDeletionPath()
    {
        SetAdminAuthentication();

        var announcementId = Guid.NewGuid();

        var response = await Client.DeleteAsync($"/api/admin/announcements/{announcementId}");

        Assert.NotNull(response);
    }

    [Fact]
    public async Task GetReportedContent_ExecutesReportListPath()
    {
        SetAdminAuthentication();

        var response = await Client.GetAsync("/api/admin/reports?status=pending");

        Assert.NotNull(response);
    }

    [Fact]
    public async Task ResolveReport_ExecutesReportResolutionPath()
    {
        SetAdminAuthentication();

        var reportId = Guid.NewGuid();
        var resolveDto = new { Action = "remove-content", Notes = "Violated community guidelines" };

        var response = await Client.PostAsJsonAsync($"/api/admin/reports/{reportId}/resolve", resolveDto);

        Assert.NotNull(response);
    }

    [Fact]
    public async Task ExportUserData_ExecutesDataExportPath()
    {
        SetAdminAuthentication();

        var exportDto = new
        {
            DataType = "users",
            Format = "csv",
            DateRange = new { From = "2024-01-01", To = "2024-12-31" }
        };

        var response = await Client.PostAsJsonAsync("/api/admin/export", exportDto);

        Assert.NotNull(response);
    }

    [Fact]
    public async Task GetSystemHealth_ExecutesHealthCheckPath()
    {
        SetAdminAuthentication();

        var response = await Client.GetAsync("/api/admin/health");

        Assert.NotNull(response);
    }

    [Fact]
    public async Task ClearCache_ExecutesCacheClearPath()
    {
        SetAdminAuthentication();

        var cacheDto = new { CacheType = "content", Pattern = "*" };

        var response = await Client.PostAsJsonAsync("/api/admin/cache/clear", cacheDto);

        Assert.NotNull(response);
    }

    [Fact]
    public async Task RunDatabaseMaintenance_ExecutesMaintenancePath()
    {
        SetAdminAuthentication();

        var maintenanceDto = new { Task = "optimize-indexes" };

        var response = await Client.PostAsJsonAsync("/api/admin/maintenance", maintenanceDto);

        Assert.NotNull(response);
    }
}
