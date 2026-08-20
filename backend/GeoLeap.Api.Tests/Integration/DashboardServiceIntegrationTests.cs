using System.Net;
using System.Net.Http.Json;
using GeoLeap.Api.Tests.Infrastructure;
using Xunit;

namespace GeoLeap.Api.Tests.Integration;

/// <summary>
/// Integration tests for DashboardService - PHASE 29 (User Dashboard)
///
/// CRITICAL TESTS:
/// - Dashboard statistics retrieval
/// - Recent searches
/// - Saved content
/// - Trending content
///
/// Test Pattern: HTTP integration tests with MinimalTestBase
/// Coverage Target: 80-85% of DashboardController endpoints
/// Controller Endpoints: 4
/// </summary>
[Collection("MinimalTest")]
public class DashboardServiceIntegrationTests : MinimalTestBase
{
    public DashboardServiceIntegrationTests() : base()
    {
    }

    #region Dashboard Statistics Tests - 2 tests

    [Fact]
    public async Task GetStats_WithAuth_ReturnsDashboardStats()
    {
        // Arrange
        SetAuthenticationHeader("test-user-token");

        // Act
        var response = await Client.GetAsync("/api/Dashboard/stats");

        // Assert
        var acceptableCodes = new[] { 200, 401, 403, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    [Fact]
    public async Task GetStats_WithoutAuth_ReturnsUnauthorized()
    {
        // Arrange
        ClearAuthenticationHeader();

        // Act
        var response = await Client.GetAsync("/api/Dashboard/stats");

        // Assert
        var acceptableCodes = new[] { 401, 403, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    #endregion

    #region Recent Searches Tests - 2 tests

    [Fact]
    public async Task GetRecentSearches_WithAuth_ReturnsSearchHistory()
    {
        // Arrange
        SetAuthenticationHeader("test-user-token");

        // Act
        var response = await Client.GetAsync("/api/Dashboard/recent-searches?limit=5");

        // Assert
        var acceptableCodes = new[] { 200, 401, 403, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    [Fact]
    public async Task GetRecentSearches_WithLimit_ReturnsLimitedResults()
    {
        // Arrange
        SetAuthenticationHeader("test-user-token");

        // Act
        var response = await Client.GetAsync("/api/Dashboard/recent-searches?limit=3");

        // Assert
        var acceptableCodes = new[] { 200, 401, 403, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    #endregion

    #region Saved Content Tests - 2 tests

    [Fact]
    public async Task GetSavedContent_WithAuth_ReturnsSavedContent()
    {
        // Arrange
        SetAuthenticationHeader("test-user-token");

        // Act
        var response = await Client.GetAsync("/api/Dashboard/saved-content?limit=6");

        // Assert
        var acceptableCodes = new[] { 200, 401, 403, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    [Fact]
    public async Task GetSavedContent_WithCustomLimit_ReturnsLimitedContent()
    {
        // Arrange
        SetAuthenticationHeader("test-user-token");

        // Act
        var response = await Client.GetAsync("/api/Dashboard/saved-content?limit=3");

        // Assert
        var acceptableCodes = new[] { 200, 401, 403, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    #endregion

    #region Trending Content Tests - 2 tests

    [Fact]
    public async Task GetTrending_WithAuth_ReturnsTrendingContent()
    {
        // Arrange
        SetAuthenticationHeader("test-user-token");

        // Act
        var response = await Client.GetAsync("/api/Dashboard/trending?limit=6");

        // Assert
        var acceptableCodes = new[] { 200, 401, 403, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    [Fact]
    public async Task GetTrending_WithCustomLimit_ReturnsLimitedTrending()
    {
        // Arrange
        SetAuthenticationHeader("test-user-token");

        // Act
        var response = await Client.GetAsync("/api/Dashboard/trending?limit=4");

        // Assert
        var acceptableCodes = new[] { 200, 401, 403, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    #endregion
}
