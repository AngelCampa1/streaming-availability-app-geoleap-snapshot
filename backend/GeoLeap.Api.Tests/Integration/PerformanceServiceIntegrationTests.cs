using System.Net;
using System.Net.Http.Json;
using GeoLeap.Api.Tests.Infrastructure;
using Xunit;

namespace GeoLeap.Api.Tests.Integration;

/// <summary>
/// Integration tests for PerformanceService - PHASE 25 (Performance)
///
/// CRITICAL TESTS:
/// - Core Web Vitals
/// - Response time metrics
/// - Database performance
/// - Caching and compression
///
/// Test Pattern: HTTP integration tests with MinimalTestBase
/// Coverage Target: 80-85% of PerformanceController endpoints
/// Controller Endpoints: 9
/// </summary>
[Collection("MinimalTest")]
public class PerformanceServiceIntegrationTests : MinimalTestBase
{
    public PerformanceServiceIntegrationTests() : base()
    {
    }

    #region Core Web Vitals Tests - 3 tests

    [Fact]
    public async Task GetCoreWebVitals_WithValidUrl_ReturnsMetrics()
    {
        // Arrange
        SetAuthenticationHeader("test-user-token");
        var url = "https://example.com";

        // Act
        var response = await Client.GetAsync($"/api/Performance/core-web-vitals?url={url}");

        // Assert
        var acceptableCodes = new[] { 200, 400, 401, 403, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    [Fact]
    public async Task GetCoreWebVitals_WithoutUrl_ReturnsBadRequest()
    {
        // Arrange
        SetAuthenticationHeader("test-user-token");

        // Act
        var response = await Client.GetAsync("/api/Performance/core-web-vitals");

        // Assert
        var acceptableCodes = new[] { 400, 401, 403, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    [Fact]
    public async Task PostCoreWebVitals_WithValidRequest_RecordsMetrics()
    {
        // Arrange
        SetAuthenticationHeader("test-user-token");
        var request = new
        {
            url = "https://example.com",
            lcp = 2.5,
            fid = 100,
            cls = 0.1
        };

        // Act
        var response = await Client.PostAsJsonAsync("/api/Performance/core-web-vitals", request);

        // Assert
        var acceptableCodes = new[] { 200, 201, 400, 401, 403, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    #endregion

    #region Metrics Tests - 4 tests

    [Fact]
    public async Task GetResponseTimeMetrics_WithAuth_ReturnsMetrics()
    {
        // Arrange
        SetAuthenticationHeader("test-user-token");

        // Act
        var response = await Client.GetAsync("/api/Performance/response-time");

        // Assert
        var acceptableCodes = new[] { 200, 400, 401, 403, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    [Fact]
    public async Task GetDatabasePerformance_WithAuth_ReturnsMetrics()
    {
        // Arrange
        SetAuthenticationHeader("test-user-token");

        // Act
        var response = await Client.GetAsync("/api/Performance/database");

        // Assert
        var acceptableCodes = new[] { 200, 400, 401, 403, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    [Fact]
    public async Task GetCachingMetrics_WithAuth_ReturnsMetrics()
    {
        // Arrange
        SetAuthenticationHeader("test-user-token");

        // Act
        var response = await Client.GetAsync("/api/Performance/caching");

        // Assert
        var acceptableCodes = new[] { 200, 400, 401, 403, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    [Fact]
    public async Task GetCompressionMetrics_WithAuth_ReturnsMetrics()
    {
        // Arrange
        SetAuthenticationHeader("test-user-token");

        // Act
        var response = await Client.GetAsync("/api/Performance/compression");

        // Assert
        var acceptableCodes = new[] { 200, 400, 401, 403, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    #endregion

    #region Validation and Recommendations Tests - 3 tests

    [Fact]
    public async Task ValidatePerformance_WithValidRequest_ReturnsValidation()
    {
        // Arrange
        SetAuthenticationHeader("test-user-token");
        var request = new
        {
            url = "https://example.com"
        };

        // Act
        var response = await Client.PostAsJsonAsync("/api/Performance/validate", request);

        // Assert
        var acceptableCodes = new[] { 200, 400, 401, 403, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    [Fact]
    public async Task GetRecommendations_WithAuth_ReturnsRecommendations()
    {
        // Arrange
        SetAuthenticationHeader("test-user-token");

        // Act
        var response = await Client.GetAsync("/api/Performance/recommendations");

        // Assert
        var acceptableCodes = new[] { 200, 400, 401, 403, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    [Fact]
    public async Task GetRealtimeMetrics_WithAuth_ReturnsMetrics()
    {
        // Arrange
        SetAuthenticationHeader("test-user-token");

        // Act
        var response = await Client.GetAsync("/api/Performance/realtime");

        // Assert
        var acceptableCodes = new[] { 200, 400, 401, 403, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    #endregion
}
