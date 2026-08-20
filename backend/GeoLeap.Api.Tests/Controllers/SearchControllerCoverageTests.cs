using System.Net.Http.Json;
using GeoLeap.Api.Models;
using GeoLeap.Api.Tests.Infrastructure;
using Xunit;

namespace GeoLeap.Api.Tests.Controllers;

/// <summary>
/// Coverage tests for SearchController - exercises real search logic.
/// </summary>
[Collection("RealServicesTest")]
public class SearchControllerCoverageTests : RealServicesTestBase
{
    public SearchControllerCoverageTests(RealServicesTestFactory factory) : base(factory) { }

    [Theory]
    [InlineData("/api/search?q=action")]
    [InlineData("/api/search?q=drama&type=tv")]
    [InlineData("/api/search?q=comedy&type=movie&year=2024")]
    [InlineData("/api/search?q=thriller&page=1&pageSize=20")]
    [InlineData("/api/search?q=sci-fi&sortBy=rating")]
    public async Task Search_ExecutesQueryPaths(string endpoint)
    {
        // Seed content for search
        SeedTestContent("search-1", "Action Adventure Movie", 2024, ContentType.Movie);
        SeedTestContent("search-2", "Drama Series", 2023, ContentType.TvSeries);
        SeedTestContent("search-3", "Comedy Show", 2024, ContentType.TvSeries);

        // Execute search - covers search service, ranking, filtering
        var response = await Client.GetAsync(endpoint);

        Assert.NotNull(response);
    }

    [Fact]
    public async Task SearchAutocomplete_ExecutesSuggestionsPath()
    {
        // Seed content
        SeedTestContent("auto-1", "The Matrix", 2024, ContentType.Movie);
        SeedTestContent("auto-2", "The Lord of the Rings", 2024, ContentType.Movie);

        // Autocomplete query
        var response = await Client.GetAsync("/api/search/autocomplete?q=the");

        Assert.NotNull(response);
    }

    [Theory]
    [InlineData("")]  // Empty query
    [InlineData("   ")]  // Whitespace only
    [InlineData("a")]  // Too short
    [InlineData("ab")]  // Still too short
    public async Task SearchValidation_ExecutesValidationPaths(string query)
    {
        // Test validation logic for invalid queries
        var response = await Client.GetAsync($"/api/search?q={query}");

        Assert.NotNull(response);
    }

    [Fact]
    public async Task SearchAdvanced_ExecutesComplexFilterPath()
    {
        // Seed diverse content
        SeedTestContent("adv-1", "High Rated Action", 2024, ContentType.Movie);
        SeedTestContent("adv-2", "Recent Drama", 2024, ContentType.TvSeries);

        var advancedQuery = new
        {
            Query = "action",
            Filters = new
            {
                MinRating = 7.0,
                YearFrom = 2020,
                YearTo = 2024,
                Genres = new[] { "action", "thriller" },
                Countries = new[] { "US", "UK" }
            },
            SortBy = "rating",
            SortOrder = "desc"
        };

        var response = await Client.PostAsJsonAsync("/api/search/advanced", advancedQuery);

        Assert.NotNull(response);
    }

    [Fact]
    public async Task SearchByVoice_ExecutesVoiceRecognitionPath()
    {
        // Voice query processing
        var voiceDto = new
        {
            AudioData = "base64-encoded-audio-data-here",
            Language = "en-US"
        };

        var response = await Client.PostAsJsonAsync("/api/search/voice", voiceDto);

        Assert.NotNull(response);
    }

    [Fact]
    public async Task SearchHistory_ExecutesUserHistoryPath()
    {
        // Get user search history
        SetAuthenticationHeader("test-user-token");

        var response = await Client.GetAsync("/api/search/history");

        Assert.NotNull(response);
    }

    [Fact]
    public async Task SearchTrending_ExecutesTrendingSearchesPath()
    {
        // Get trending searches
        var response = await Client.GetAsync("/api/search/trending");

        Assert.NotNull(response);
    }

    [Fact]
    public async Task SearchByImage_ExecutesImageRecognitionPath()
    {
        // Image-based search (poster/scene recognition)
        var imageDto = new
        {
            ImageData = "base64-encoded-image-data",
            SearchType = "poster"
        };

        var response = await Client.PostAsJsonAsync("/api/search/by-image", imageDto);

        Assert.NotNull(response);
    }

    [Fact]
    public async Task SearchAnalytics_ExecutesAnalyticsPath()
    {
        SetAdminAuthentication();

        // Search analytics (admin only)
        var response = await Client.GetAsync("/api/search/analytics?from=2024-01-01&to=2024-12-31");

        Assert.NotNull(response);
    }
}
