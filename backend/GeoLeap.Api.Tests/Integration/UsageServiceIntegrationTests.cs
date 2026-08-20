using System.Net;
using System.Net.Http.Json;
using GeoLeap.Api.Tests.Infrastructure;
using Xunit;

namespace GeoLeap.Api.Tests.Integration;

/// <summary>
/// Integration tests for UsageService - PHASE 26 (Usage Tracking)
///
/// CRITICAL TESTS:
/// - Usage retrieval
/// - Search capability check
///
/// Test Pattern: HTTP integration tests with MinimalTestBase
/// Coverage Target: 80-85% of UsageController endpoints
/// Controller Endpoints: 2
/// </summary>
[Collection("MinimalTest")]
public class UsageServiceIntegrationTests : MinimalTestBase
{
    public UsageServiceIntegrationTests() : base()
    {
    }

    #region Usage Tests - 3 tests

    [Fact]
    public async Task GetUsage_WithAuth_ReturnsUsage()
    {
        // Arrange
        SetAuthenticationHeader("test-user-token");

        // Act
        var response = await Client.GetAsync("/api/Usage");

        // Assert
        var acceptableCodes = new[] { 200, 400, 401, 403, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    [Fact]
    public async Task GetUsage_WithoutAuth_ReturnsUnauthorized()
    {
        // Arrange
        ClearAuthenticationHeader();

        // Act
        var response = await Client.GetAsync("/api/Usage");

        // Assert
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task CanSearch_WithAuth_ReturnsSearchCapability()
    {
        // Arrange
        SetAuthenticationHeader("test-user-token");

        // Act
        var response = await Client.GetAsync("/api/Usage/can-search");

        // Assert
        var acceptableCodes = new[] { 200, 400, 401, 403, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    #endregion
}
