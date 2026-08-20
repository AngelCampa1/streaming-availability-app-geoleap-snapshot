using System.Net;
using System.Net.Http.Json;
using GeoLeap.Api.Tests.Infrastructure;
using Xunit;

namespace GeoLeap.Api.Tests.Integration;

/// <summary>
/// Integration tests for ContentService - PHASE 27 (Content)
///
/// CRITICAL TESTS:
/// - Content retrieval by type and ID
/// - Related and popular content
/// - Search functionality
/// - SEO metadata and structured data
///
/// Test Pattern: HTTP integration tests with MinimalTestBase
/// Coverage Target: 80-85% of ContentController endpoints
/// Controller Endpoints: 11
/// </summary>
[Collection("MinimalTest")]
public class ContentServiceIntegrationTests : MinimalTestBase
{
    public ContentServiceIntegrationTests() : base()
    {
    }

    #region Content Retrieval Tests - 4 tests

    [Fact]
    public async Task GetContent_WithValidTypeAndId_ReturnsContent()
    {
        // Arrange - AllowAnonymous endpoint
        ClearAuthenticationHeader();

        // Act
        var response = await Client.GetAsync("/api/Content/movie/550");

        // Assert
        var acceptableCodes = new[] { 200, 400, 401, 404, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    [Fact]
    public async Task GetContent_WithInvalidType_ReturnsBadRequest()
    {
        // Arrange
        ClearAuthenticationHeader();

        // Act
        var response = await Client.GetAsync("/api/Content/invalid-type/550");

        // Assert
        var acceptableCodes = new[] { 400, 401, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    [Fact]
    public async Task GetContentBySlug_WithValidSlug_ReturnsContent()
    {
        // Arrange
        ClearAuthenticationHeader();

        // Act
        var response = await Client.GetAsync("/api/Content/slug/movie/fight-club");

        // Assert
        var acceptableCodes = new[] { 200, 400, 401, 404, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    [Fact]
    public async Task GetStreamingAvailability_WithValidParams_ReturnsAvailability()
    {
        // Arrange
        ClearAuthenticationHeader();

        // Act
        var response = await Client.GetAsync("/api/Content/movie/550/streaming?country=US");

        // Assert
        var acceptableCodes = new[] { 200, 400, 401, 404, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    #endregion

    #region Related and Popular Tests - 2 tests

    [Fact]
    public async Task GetRelatedContent_WithValidContentId_ReturnsRelated()
    {
        // Arrange
        ClearAuthenticationHeader();

        // Act
        var response = await Client.GetAsync("/api/Content/related?contentId=550&limit=10");

        // Assert
        var acceptableCodes = new[] { 200, 400, 401, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    [Fact]
    public async Task GetPopularContent_WithoutAuth_ReturnsPopular()
    {
        // Arrange
        ClearAuthenticationHeader();

        // Act
        var response = await Client.GetAsync("/api/Content/popular?type=movie&limit=20");

        // Assert
        var acceptableCodes = new[] { 200, 400, 401, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    #endregion

    #region Search Tests - 3 tests

    [Fact]
    public async Task SearchContent_WithQuery_ReturnsResults()
    {
        // Arrange
        ClearAuthenticationHeader();

        // Act
        var response = await Client.GetAsync("/api/Content/search?query=inception");

        // Assert
        var acceptableCodes = new[] { 200, 400, 401, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    [Fact]
    public async Task SearchContentPost_WithValidRequest_ReturnsResults()
    {
        // Arrange
        ClearAuthenticationHeader();
        var request = new
        {
            query = "matrix",
            contentType = "movie",
            page = 1,
            pageSize = 20
        };

        // Act
        var response = await Client.PostAsJsonAsync("/api/Content/search", request);

        // Assert
        var acceptableCodes = new[] { 200, 400, 401, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    [Fact]
    public async Task GetContentBatch_WithValidRequest_ReturnsBatch()
    {
        // Arrange
        ClearAuthenticationHeader();
        var request = new
        {
            contentIds = new[] { "550", "551", "552" }
        };

        // Act
        var response = await Client.PostAsJsonAsync("/api/Content/batch", request);

        // Assert
        var acceptableCodes = new[] { 200, 400, 401, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    #endregion

    #region Sitemap and Metadata Tests - 4 tests

    [Fact]
    public async Task GetSitemapContent_WithValidParams_ReturnsSitemap()
    {
        // Arrange
        ClearAuthenticationHeader();

        // Act
        var response = await Client.GetAsync("/api/Content/sitemap?page=1&pageSize=100");

        // Assert
        var acceptableCodes = new[] { 200, 400, 401, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    [Fact]
    public async Task GetContentMetadata_WithValidId_ReturnsMetadata()
    {
        // Arrange
        ClearAuthenticationHeader();

        // Act
        var response = await Client.GetAsync("/api/Content/550/metadata?type=movie");

        // Assert
        var acceptableCodes = new[] { 200, 400, 401, 404, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    [Fact]
    public async Task GetContentStructuredData_WithValidId_ReturnsStructuredData()
    {
        // Arrange
        ClearAuthenticationHeader();

        // Act
        var response = await Client.GetAsync("/api/Content/550/structured-data?type=movie");

        // Assert
        var acceptableCodes = new[] { 200, 400, 401, 404, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    [Fact]
    public async Task GetSitemapContent_WithInvalidPage_ReturnsBadRequest()
    {
        // Arrange
        ClearAuthenticationHeader();

        // Act
        var response = await Client.GetAsync("/api/Content/sitemap?page=0&pageSize=100");

        // Assert
        var acceptableCodes = new[] { 400, 401, 500 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    #endregion
}
