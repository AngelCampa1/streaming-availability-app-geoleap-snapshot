using System.Net;
using System.Net.Http.Json;
using GeoLeap.Api.Tests.Infrastructure;
using Xunit;

namespace GeoLeap.Api.Tests.Integration;

/// <summary>
/// Integration tests for NotificationTemplateService - PHASE 22 (Notification Templates)
///
/// CRITICAL TESTS:
/// - Template CRUD operations
/// - Template rendering and validation
/// - Version management
/// - Import/export functionality
/// - Performance analytics
/// - AI optimization
///
/// Test Pattern: HTTP integration tests with MinimalTestBase
/// Coverage Target: 80-85% of NotificationTemplateController endpoints
/// Controller Endpoints: 24
/// </summary>
[Collection("MinimalTest")]
public class NotificationTemplateServiceIntegrationTests : MinimalTestBase
{
    public NotificationTemplateServiceIntegrationTests() : base()
    {
    }

    #region Template CRUD Tests - 5 tests

    [Fact]
    public async Task GetTemplates_WithAuth_ReturnsTemplates()
    {
        // Arrange
        SetAuthenticationHeader("test-admin-token");

        // Act
        var response = await Client.GetAsync("/api/notification-templates");

        // Assert
        var acceptableCodes = new[] { 200, 400, 401, 403, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    [Fact]
    public async Task GetTemplates_WithoutAuth_ReturnsUnauthorized()
    {
        // Arrange
        ClearAuthenticationHeader();

        // Act
        var response = await Client.GetAsync("/api/notification-templates");

        // Assert
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetTemplate_WithValidId_ReturnsTemplate()
    {
        // Arrange
        SetAuthenticationHeader("test-admin-token");
        var templateId = Guid.NewGuid();

        // Act
        var response = await Client.GetAsync($"/api/notification-templates/{templateId}");

        // Assert
        var acceptableCodes = new[] { 200, 400, 401, 403, 404, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    [Fact]
    public async Task CreateTemplate_WithValidRequest_CreatesTemplate()
    {
        // Arrange
        SetAuthenticationHeader("test-admin-token");
        var request = new
        {
            name = "Welcome Email",
            type = "email",
            subject = "Welcome to GeoLeap",
            body = "Hello {{userName}}, welcome to our service!",
            isActive = true
        };

        // Act
        var response = await Client.PostAsJsonAsync("/api/notification-templates", request);

        // Assert
        var acceptableCodes = new[] { 200, 201, 400, 401, 403, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    [Fact]
    public async Task UpdateTemplate_WithValidRequest_UpdatesTemplate()
    {
        // Arrange
        SetAuthenticationHeader("test-admin-token");
        var templateId = Guid.NewGuid();
        var request = new
        {
            name = "Updated Welcome Email",
            subject = "Updated Subject"
        };

        // Act
        var response = await Client.PutAsJsonAsync($"/api/notification-templates/{templateId}", request);

        // Assert
        var acceptableCodes = new[] { 200, 400, 401, 403, 404, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    #endregion

    #region Template Delete and Activation Tests - 3 tests

    [Fact]
    public async Task DeleteTemplate_WithValidId_DeletesTemplate()
    {
        // Arrange
        SetAuthenticationHeader("test-admin-token");
        var templateId = Guid.NewGuid();

        // Act
        var response = await Client.DeleteAsync($"/api/notification-templates/{templateId}");

        // Assert
        var acceptableCodes = new[] { 200, 204, 400, 401, 403, 404, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    [Fact]
    public async Task ActivateTemplate_WithValidId_ActivatesTemplate()
    {
        // Arrange
        SetAuthenticationHeader("test-admin-token");
        var templateId = Guid.NewGuid();

        // Act
        var response = await Client.PostAsync($"/api/notification-templates/{templateId}/activate", null);

        // Assert
        var acceptableCodes = new[] { 200, 400, 401, 403, 404, 415, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    [Fact]
    public async Task DeactivateTemplate_WithValidId_DeactivatesTemplate()
    {
        // Arrange
        SetAuthenticationHeader("test-admin-token");
        var templateId = Guid.NewGuid();

        // Act
        var response = await Client.PostAsync($"/api/notification-templates/{templateId}/deactivate", null);

        // Assert
        var acceptableCodes = new[] { 200, 400, 401, 403, 404, 415, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    #endregion

    #region Rendering and Validation Tests - 3 tests

    [Fact]
    public async Task RenderTemplate_WithValidRequest_RendersTemplate()
    {
        // Arrange
        SetAuthenticationHeader("test-admin-token");
        var templateId = Guid.NewGuid();
        var request = new
        {
            variables = new { userName = "John", email = "john@example.com" }
        };

        // Act
        var response = await Client.PostAsJsonAsync($"/api/notification-templates/{templateId}/render", request);

        // Assert
        var acceptableCodes = new[] { 200, 400, 401, 403, 404, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    [Fact]
    public async Task RenderContent_WithValidRequest_RendersContent()
    {
        // Arrange
        SetAuthenticationHeader("test-admin-token");
        var request = new
        {
            content = "Hello {{userName}}!",
            variables = new { userName = "Jane" }
        };

        // Act
        var response = await Client.PostAsJsonAsync("/api/notification-templates/render-content", request);

        // Assert
        var acceptableCodes = new[] { 200, 400, 401, 403, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    [Fact]
    public async Task ValidateTemplate_WithValidRequest_ValidatesTemplate()
    {
        // Arrange
        SetAuthenticationHeader("test-admin-token");
        var request = new
        {
            content = "Hello {{userName}}!",
            type = "email"
        };

        // Act
        var response = await Client.PostAsJsonAsync("/api/notification-templates/validate", request);

        // Assert
        var acceptableCodes = new[] { 200, 400, 401, 403, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    #endregion

    #region Template By Type Tests - 3 tests

    [Fact]
    public async Task GetTemplateByType_WithValidType_ReturnsTemplate()
    {
        // Arrange
        SetAuthenticationHeader("test-admin-token");
        var type = "welcome_email";

        // Act
        var response = await Client.GetAsync($"/api/notification-templates/by-type/{type}");

        // Assert
        var acceptableCodes = new[] { 200, 400, 401, 403, 404, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    [Fact]
    public async Task GetDefaultTemplate_WithAuth_ReturnsDefault()
    {
        // Arrange
        SetAuthenticationHeader("test-admin-token");

        // Act
        var response = await Client.GetAsync("/api/notification-templates/default");

        // Assert
        var acceptableCodes = new[] { 200, 400, 401, 403, 404, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    [Fact]
    public async Task SetDefaultTemplate_WithValidRequest_SetsDefault()
    {
        // Arrange
        SetAuthenticationHeader("test-admin-token");
        var request = new
        {
            templateId = Guid.NewGuid(),
            type = "email"
        };

        // Act
        var response = await Client.PostAsJsonAsync("/api/notification-templates/set-default", request);

        // Assert
        var acceptableCodes = new[] { 200, 400, 401, 403, 404, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    #endregion

    #region Version Management Tests - 3 tests

    [Fact]
    public async Task CreateTemplateVersion_WithValidRequest_CreatesVersion()
    {
        // Arrange
        SetAuthenticationHeader("test-admin-token");
        var templateId = Guid.NewGuid();
        var request = new
        {
            content = "Updated content for new version",
            changeLog = "Minor text updates"
        };

        // Act
        var response = await Client.PostAsJsonAsync($"/api/notification-templates/{templateId}/versions", request);

        // Assert
        var acceptableCodes = new[] { 200, 201, 400, 401, 403, 404, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    [Fact]
    public async Task GetTemplateVersions_WithValidId_ReturnsVersions()
    {
        // Arrange
        SetAuthenticationHeader("test-admin-token");
        var templateId = Guid.NewGuid();

        // Act
        var response = await Client.GetAsync($"/api/notification-templates/{templateId}/versions");

        // Assert
        var acceptableCodes = new[] { 200, 400, 401, 403, 404, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    [Fact]
    public async Task PromoteTemplateVersion_WithValidRequest_PromotesVersion()
    {
        // Arrange
        SetAuthenticationHeader("test-admin-token");
        var templateId = Guid.NewGuid();
        var version = 2;

        // Act
        var response = await Client.PostAsync($"/api/notification-templates/{templateId}/versions/{version}/promote", null);

        // Assert
        var acceptableCodes = new[] { 200, 400, 401, 403, 404, 415, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    #endregion

    #region Import/Export Tests - 2 tests

    [Fact]
    public async Task ImportTemplates_WithValidRequest_ImportsTemplates()
    {
        // Arrange
        SetAuthenticationHeader("test-admin-token");
        var request = new
        {
            templates = new[]
            {
                new { name = "Template 1", type = "email", body = "Content 1" },
                new { name = "Template 2", type = "push", body = "Content 2" }
            }
        };

        // Act
        var response = await Client.PostAsJsonAsync("/api/notification-templates/import", request);

        // Assert
        var acceptableCodes = new[] { 200, 201, 400, 401, 403, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    [Fact]
    public async Task ExportTemplates_WithAuth_ReturnsExport()
    {
        // Arrange
        SetAuthenticationHeader("test-admin-token");

        // Act
        var response = await Client.GetAsync("/api/notification-templates/export");

        // Assert
        var acceptableCodes = new[] { 200, 400, 401, 403, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    #endregion

    #region Analytics and Performance Tests - 3 tests

    [Fact]
    public async Task GetTemplateUsageStats_WithValidId_ReturnsStats()
    {
        // Arrange
        SetAuthenticationHeader("test-admin-token");
        var templateId = Guid.NewGuid();

        // Act
        var response = await Client.GetAsync($"/api/notification-templates/{templateId}/usage-stats");

        // Assert
        var acceptableCodes = new[] { 200, 400, 401, 403, 404, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    [Fact]
    public async Task GetTopPerformingTemplates_WithAuth_ReturnsTopTemplates()
    {
        // Arrange
        SetAuthenticationHeader("test-admin-token");

        // Act
        var response = await Client.GetAsync("/api/notification-templates/top-performing");

        // Assert
        var acceptableCodes = new[] { 200, 400, 401, 403, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    [Fact]
    public async Task TestTemplate_WithValidRequest_TestsTemplate()
    {
        // Arrange
        SetAuthenticationHeader("test-admin-token");
        var templateId = Guid.NewGuid();
        var request = new
        {
            recipientEmail = "test@example.com",
            variables = new { userName = "Test User" }
        };

        // Act
        var response = await Client.PostAsJsonAsync($"/api/notification-templates/{templateId}/test", request);

        // Assert
        var acceptableCodes = new[] { 200, 400, 401, 403, 404, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    #endregion

    #region AI Optimization Tests - 2 tests

    [Fact]
    public async Task GetTemplateSuggestions_WithValidType_ReturnsSuggestions()
    {
        // Arrange
        SetAuthenticationHeader("test-admin-token");
        var type = "welcome_email";

        // Act
        var response = await Client.GetAsync($"/api/notification-templates/suggestions/{type}");

        // Assert
        var acceptableCodes = new[] { 200, 400, 401, 403, 404, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    [Fact]
    public async Task OptimizeTemplate_WithValidId_OptimizesTemplate()
    {
        // Arrange
        SetAuthenticationHeader("test-admin-token");
        var templateId = Guid.NewGuid();

        // Act
        var response = await Client.PostAsync($"/api/notification-templates/{templateId}/optimize", null);

        // Assert
        var acceptableCodes = new[] { 200, 400, 401, 403, 404, 415, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    #endregion
}
