using System.Net;
using System.Text.Json;
using Xunit;
using GeoLeap.Api.Tests.Infrastructure;

namespace GeoLeap.Api.Tests.Controllers;

/// <summary>
/// Invoice Controller Tests using StableTestBase pattern.
/// Validates authentication enforcement, structured error responses,
/// and correct HTTP status codes for InvoiceController endpoints.
/// </summary>
[Collection("InvoiceControllerTests")]
public class SimpleInvoiceControllerTest : StableTestBase
{
    [Fact]
    public async Task GetUserInvoices_RequiresAuthentication()
    {
        // Act - Without authentication
        var response = await Client.GetAsync("/api/invoice");

        // Assert - Should require authentication
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetUserInvoices_WithAuth_ReturnsNonServerError()
    {
        // Arrange
        SetAuthenticationHeader("test-user-token");

        // Act
        var response = await Client.GetAsync("/api/invoice");

        // Assert - Should not return 500 (UnauthorizedAccessException must be caught properly)
        Assert.True(
            (int)response.StatusCode < 500,
            $"Expected non-server error, got {response.StatusCode}");

        // Clean up
        ClearAuthenticationHeader();
    }

    [Fact]
    public async Task GetInvoice_RequiresAuthentication()
    {
        // Act - Without authentication
        var fakeId = Guid.NewGuid();
        var response = await Client.GetAsync($"/api/invoice/{fakeId}");

        // Assert - Should require authentication
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetInvoice_NotFound_ReturnsNotFoundWithStructuredResponse()
    {
        // Arrange
        SetAuthenticationHeader("test-user-token");
        var fakeId = Guid.NewGuid();

        // Act
        var response = await Client.GetAsync($"/api/invoice/{fakeId}");
        var responseBody = await response.Content.ReadAsStringAsync();

        // Assert - Should return 404 (not 500 from swallowed UnauthorizedAccessException)
        Assert.True(
            response.StatusCode == HttpStatusCode.NotFound ||
            response.StatusCode == HttpStatusCode.Unauthorized,
            $"Expected NotFound or Unauthorized, got {response.StatusCode}");

        // If we got 404, verify the response is structured JSON (not a plain string)
        if (response.StatusCode == HttpStatusCode.NotFound)
        {
            var jsonDoc = JsonDocument.Parse(responseBody);
            var root = jsonDoc.RootElement;
            Assert.True(
                root.TryGetProperty("error", out _) || root.TryGetProperty("code", out _),
                $"Expected structured error response with 'error' or 'code' property, got: {responseBody}");
        }

        // Clean up
        ClearAuthenticationHeader();
    }

    [Fact]
    public async Task DownloadInvoicePdf_RequiresAuthentication()
    {
        // Act - Without authentication
        var fakeId = Guid.NewGuid();
        var response = await Client.GetAsync($"/api/invoice/{fakeId}/pdf");

        // Assert - Should require authentication
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetInvoiceAnalytics_WithAuth_ReturnsNonServerError()
    {
        // Arrange
        SetAuthenticationHeader("test-user-token");

        // Act
        var response = await Client.GetAsync("/api/invoice/analytics");

        // Assert - Should not return 500
        Assert.True(
            (int)response.StatusCode < 500,
            $"Expected non-server error, got {response.StatusCode}");

        // Clean up
        ClearAuthenticationHeader();
    }
}
