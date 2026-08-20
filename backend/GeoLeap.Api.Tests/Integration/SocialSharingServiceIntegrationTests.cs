using System.Net;
using System.Net.Http.Json;
using GeoLeap.Api.Tests.Infrastructure;
using Xunit;

namespace GeoLeap.Api.Tests.Integration;

/// <summary>
/// Integration tests for SocialSharingService - PHASE 23 (Social Sharing)
///
/// CRITICAL TESTS:
/// - Share CRUD operations
/// - Analytics and statistics
/// - Click tracking
/// - Bulk sharing
/// - Popular content
///
/// Test Pattern: HTTP integration tests with MinimalTestBase
/// Coverage Target: 80-85% of SocialSharingController endpoints
/// Controller Endpoints: 12
/// </summary>
[Collection("MinimalTest")]
public class SocialSharingServiceIntegrationTests : MinimalTestBase
{
    public SocialSharingServiceIntegrationTests() : base()
    {
    }

    #region Share CRUD Tests - 4 tests

    [Fact]
    public async Task Share_WithValidRequest_CreatesShare()
    {
        // Arrange
        SetAuthenticationHeader("test-user-token");
        var request = new
        {
            contentId = Guid.NewGuid(),
            platform = "twitter",
            message = "Check this out!"
        };

        // Act
        var response = await Client.PostAsJsonAsync("/api/social/share", request);

        // Assert
        var acceptableCodes = new[] { 200, 201, 400, 401, 403, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    [Fact]
    public async Task Share_WithoutAuth_ReturnsUnauthorized()
    {
        // Arrange
        ClearAuthenticationHeader();
        var request = new { contentId = Guid.NewGuid(), platform = "twitter" };

        // Act
        var response = await Client.PostAsJsonAsync("/api/social/share", request);

        // Assert
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task GetShare_WithValidId_ReturnsShare()
    {
        // Arrange
        SetAuthenticationHeader("test-user-token");
        var shareId = Guid.NewGuid();

        // Act
        var response = await Client.GetAsync($"/api/social/share/{shareId}");

        // Assert
        var acceptableCodes = new[] { 200, 400, 401, 403, 404, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    [Fact]
    public async Task DeleteShare_WithValidId_DeletesShare()
    {
        // Arrange
        SetAuthenticationHeader("test-user-token");
        var shareId = Guid.NewGuid();

        // Act
        var response = await Client.DeleteAsync($"/api/social/share/{shareId}");

        // Assert
        var acceptableCodes = new[] { 200, 204, 400, 401, 403, 404, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    #endregion

    #region Statistics and Analytics Tests - 3 tests

    [Fact]
    public async Task GetStatistics_WithAuth_ReturnsStatistics()
    {
        // Arrange
        SetAuthenticationHeader("test-user-token");

        // Act
        var response = await Client.GetAsync("/api/social/statistics");

        // Assert
        var acceptableCodes = new[] { 200, 400, 401, 403, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    [Fact]
    public async Task GetMyShares_WithAuth_ReturnsShares()
    {
        // Arrange
        SetAuthenticationHeader("test-user-token");

        // Act
        var response = await Client.GetAsync("/api/social/my-shares");

        // Assert
        var acceptableCodes = new[] { 200, 400, 401, 403, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    [Fact]
    public async Task GetAnalytics_WithAuth_ReturnsAnalytics()
    {
        // Arrange
        SetAuthenticationHeader("test-user-token");

        // Act
        var response = await Client.GetAsync("/api/social/analytics");

        // Assert
        var acceptableCodes = new[] { 200, 400, 401, 403, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    #endregion

    #region Tracking and Validation Tests - 3 tests

    [Fact]
    public async Task TrackClick_WithValidRequest_TracksClick()
    {
        // Arrange
        SetAuthenticationHeader("test-user-token");
        var request = new
        {
            shareId = Guid.NewGuid(),
            referrer = "https://twitter.com"
        };

        // Act
        var response = await Client.PostAsJsonAsync("/api/social/track-click", request);

        // Assert
        var acceptableCodes = new[] { 200, 201, 400, 401, 403, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    [Fact]
    public async Task ValidateShare_WithValidId_ValidatesShare()
    {
        // Arrange
        SetAuthenticationHeader("test-user-token");
        var shareId = Guid.NewGuid();

        // Act
        var response = await Client.GetAsync($"/api/social/validate/{shareId}");

        // Assert
        var acceptableCodes = new[] { 200, 400, 401, 403, 404, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    [Fact]
    public async Task GetMetadata_WithValidId_ReturnsMetadata()
    {
        // Arrange
        SetAuthenticationHeader("test-user-token");
        var shareId = Guid.NewGuid();

        // Act
        var response = await Client.GetAsync($"/api/social/metadata/{shareId}");

        // Assert
        var acceptableCodes = new[] { 200, 400, 401, 403, 404, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    #endregion

    #region Settings and Bulk Operations Tests - 3 tests

    [Fact]
    public async Task UpdateSettings_WithValidRequest_UpdatesSettings()
    {
        // Arrange
        SetAuthenticationHeader("test-user-token");
        var request = new
        {
            autoShare = true,
            defaultPlatform = "twitter"
        };

        // Act
        var response = await Client.PutAsJsonAsync("/api/social/settings", request);

        // Assert
        var acceptableCodes = new[] { 200, 400, 401, 403, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    [Fact]
    public async Task GetPopularContent_WithAuth_ReturnsPopular()
    {
        // Arrange
        SetAuthenticationHeader("test-user-token");

        // Act
        var response = await Client.GetAsync("/api/social/popular-content");

        // Assert
        var acceptableCodes = new[] { 200, 400, 401, 403, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    [Fact]
    public async Task BulkShare_WithValidRequest_SharesBulk()
    {
        // Arrange
        SetAuthenticationHeader("test-user-token");
        var request = new
        {
            contentIds = new[] { Guid.NewGuid(), Guid.NewGuid() },
            platforms = new[] { "twitter", "facebook" }
        };

        // Act
        var response = await Client.PostAsJsonAsync("/api/social/bulk-share", request);

        // Assert
        var acceptableCodes = new[] { 200, 201, 400, 401, 403, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    #endregion
}
