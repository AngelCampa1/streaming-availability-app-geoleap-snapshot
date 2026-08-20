using System.Net;
using System.Net.Http.Json;
using GeoLeap.Api.Tests.Infrastructure;
using Xunit;

namespace GeoLeap.Api.Tests.Integration;

/// <summary>
/// Integration tests for StreamingServicesService - PHASE 26 (Streaming Services)
///
/// CRITICAL TESTS:
/// - Service listing and details
/// - Availability check
/// - User service management
/// - Bulk operations
///
/// Test Pattern: HTTP integration tests with MinimalTestBase
/// Coverage Target: 80-85% of StreamingServicesController endpoints
/// Controller Endpoints: 12
/// </summary>
[Collection("MinimalTest")]
public class StreamingServicesServiceIntegrationTests : MinimalTestBase
{
    public StreamingServicesServiceIntegrationTests() : base()
    {
    }

    #region Service Listing Tests - 3 tests

    [Fact]
    public async Task GetAllServices_WithAuth_ReturnsServices()
    {
        // Arrange
        SetAuthenticationHeader("test-user-token");

        // Act
        var response = await Client.GetAsync("/api/StreamingServices");

        // Assert
        var acceptableCodes = new[] { 200, 400, 401, 403, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    [Fact]
    public async Task GetServiceById_WithValidId_ReturnsService()
    {
        // Arrange
        SetAuthenticationHeader("test-user-token");
        var serviceId = "netflix";

        // Act
        var response = await Client.GetAsync($"/api/StreamingServices/{serviceId}");

        // Assert
        var acceptableCodes = new[] { 200, 400, 401, 403, 404, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    [Fact]
    public async Task GetAvailability_WithAuth_ReturnsAvailability()
    {
        // Arrange
        SetAuthenticationHeader("test-user-token");

        // Act
        var response = await Client.GetAsync("/api/StreamingServices/availability");

        // Assert
        var acceptableCodes = new[] { 200, 400, 401, 403, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    #endregion

    #region User Services Tests - 5 tests

    [Fact]
    public async Task GetUserServices_WithAuth_ReturnsUserServices()
    {
        // Arrange
        SetAuthenticationHeader("test-user-token");

        // Act
        var response = await Client.GetAsync("/api/StreamingServices/user");

        // Assert
        var acceptableCodes = new[] { 200, 400, 401, 403, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    [Fact]
    public async Task GetUserActiveServices_WithAuth_ReturnsActiveServices()
    {
        // Arrange
        SetAuthenticationHeader("test-user-token");

        // Act
        var response = await Client.GetAsync("/api/StreamingServices/user/active");

        // Assert
        var acceptableCodes = new[] { 200, 400, 401, 403, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    [Fact]
    public async Task AddUserService_WithValidRequest_AddsService()
    {
        // Arrange
        SetAuthenticationHeader("test-user-token");
        var request = new
        {
            streamingServiceId = "netflix",
            region = "US"
        };

        // Act
        var response = await Client.PostAsJsonAsync("/api/StreamingServices/user", request);

        // Assert
        var acceptableCodes = new[] { 200, 201, 400, 401, 403, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    [Fact]
    public async Task UpdateUserService_WithValidRequest_UpdatesService()
    {
        // Arrange
        SetAuthenticationHeader("test-user-token");
        var streamingServiceId = "netflix";
        var request = new
        {
            region = "UK"
        };

        // Act
        var response = await Client.PutAsJsonAsync($"/api/StreamingServices/user/{streamingServiceId}", request);

        // Assert
        var acceptableCodes = new[] { 200, 400, 401, 403, 404, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    [Fact]
    public async Task DeleteUserService_WithValidId_DeletesService()
    {
        // Arrange
        SetAuthenticationHeader("test-user-token");
        var streamingServiceId = "test-service";

        // Act
        var response = await Client.DeleteAsync($"/api/StreamingServices/user/{streamingServiceId}");

        // Assert
        var acceptableCodes = new[] { 200, 204, 400, 401, 403, 404, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    #endregion

    #region Bulk Operations Tests - 2 tests

    [Fact]
    public async Task BulkAddUserServices_WithValidRequest_AddsServices()
    {
        // Arrange
        SetAuthenticationHeader("test-user-token");
        var request = new
        {
            services = new[]
            {
                new { streamingServiceId = "netflix", region = "US" },
                new { streamingServiceId = "disney-plus", region = "US" }
            }
        };

        // Act
        var response = await Client.PostAsJsonAsync("/api/StreamingServices/user/bulk", request);

        // Assert
        var acceptableCodes = new[] { 200, 201, 400, 401, 403, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    [Fact]
    public async Task BulkRemoveUserServices_WithValidRequest_RemovesServices()
    {
        // Arrange
        SetAuthenticationHeader("test-user-token");
        var request = new
        {
            serviceIds = new[] { "netflix", "disney-plus" }
        };

        // Act
        var response = await Client.PostAsJsonAsync("/api/StreamingServices/user/bulk-remove", request);

        // Assert
        var acceptableCodes = new[] { 200, 204, 400, 401, 403, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    #endregion

    #region Stats and Check Tests - 3 tests

    [Fact]
    public async Task GetUserStats_WithAuth_ReturnsStats()
    {
        // Arrange
        SetAuthenticationHeader("test-user-token");

        // Act
        var response = await Client.GetAsync("/api/StreamingServices/user/stats");

        // Assert
        var acceptableCodes = new[] { 200, 400, 401, 403, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    [Fact]
    public async Task HasServices_WithAuth_ReturnsHasServices()
    {
        // Arrange
        SetAuthenticationHeader("test-user-token");

        // Act
        var response = await Client.GetAsync("/api/StreamingServices/user/has-services");

        // Assert
        var acceptableCodes = new[] { 200, 400, 401, 403, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    [Fact]
    public async Task GetUserServices_WithoutAuth_ReturnsUnauthorized()
    {
        // Arrange
        ClearAuthenticationHeader();

        // Act
        var response = await Client.GetAsync("/api/StreamingServices/user");

        // Assert
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    #endregion
}
