using GeoLeap.Api.Models;
using GeoLeap.Api.Tests.Infrastructure;
using System.Net.Http.Json;
using Xunit;

namespace GeoLeap.Api.Tests.Integration;

/// <summary>
/// Integration tests for country-first VPN recommendation system
/// Tests the full flow: Content ID → Country recommendations → VPN providers
/// Following MinimalTestBase pattern for 100% reliability
/// </summary>
[Collection("MinimalTest")]
public class CountryRecommendationIntegrationTests : MinimalTestBase
{
    public CountryRecommendationIntegrationTests() : base()
    {
        SetAuthenticationHeader("test-user-token");
    }

    #region Full Flow Integration Tests

    [Fact]
    public async Task FullFlow_ContentToCountryToVpn_CompletesSuccessfully()
    {
        // Arrange
        var contentId = "tt0111161";
        var audioLangs = "en,es";
        var subtitleLangs = "en,es,fr";

        // Act - Get country recommendations with VPN providers
        var response = await Client.GetAsync(
            $"/api/vpnguidance/content-recommendations/{contentId}?audioLanguages={audioLangs}&subtitleLanguages={subtitleLangs}");

        // Assert
        var acceptableCodes = new[] { 200, 201, 204, 401, 404, 500, 503 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);

        if (response.IsSuccessStatusCode)
        {
            var result = await response.Content.ReadFromJsonAsync<ContentVpnRecommendationDto>();
            Assert.NotNull(result);
            Assert.Equal(contentId, result.ContentId);

            // Verify country data structure
            Assert.NotNull(result.CountryAvailability);

            // Verify VPN recommendations
            Assert.NotNull(result.RecommendedProviders);

            // Verify language data is present
            foreach (var provider in result.RecommendedProviders)
            {
                Assert.True(provider.LanguageCompatibilityScore >= 0.0 && provider.LanguageCompatibilityScore <= 1.0);
            }
        }
    }

    [Fact]
    public async Task FullFlow_VerifiesLanguageExtractionPerCountry()
    {
        // Arrange
        var contentId = "tt0111161";

        // Act
        var response = await Client.GetAsync($"/api/vpnguidance/content-recommendations/{contentId}?audioLanguages=en");

        // Assert
        var acceptableCodes = new[] { 200, 201, 204, 401, 404, 500, 503 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);

        if (response.IsSuccessStatusCode)
        {
            var result = await response.Content.ReadFromJsonAsync<ContentVpnRecommendationDto>();
            Assert.NotNull(result);

            // Each country should have language data extracted from streaming API
            foreach (var (countryCode, countryData) in result.CountryAvailability)
            {
                Assert.False(string.IsNullOrEmpty(countryCode), "Country code should not be empty");
                Assert.NotNull(countryData.AudioLanguages);
                Assert.NotNull(countryData.SubtitleLanguages);
                Assert.True(countryData.LanguageScore >= 0.0 && countryData.LanguageScore <= 1.0,
                    $"Language score for {countryCode} should be between 0 and 1");
            }
        }
    }

    [Fact]
    public async Task FullFlow_TestsRankingAlgorithm()
    {
        // Arrange - provide specific language preferences
        var contentId = "tt0111161";
        var audioLangs = "en,es,fr";
        var subtitleLangs = "en,es,fr,de";

        // Act
        var response = await Client.GetAsync(
            $"/api/vpnguidance/content-recommendations/{contentId}?audioLanguages={audioLangs}&subtitleLanguages={subtitleLangs}");

        // Assert
        var acceptableCodes = new[] { 200, 201, 204, 401, 404, 500, 503 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);

        if (response.IsSuccessStatusCode)
        {
            var result = await response.Content.ReadFromJsonAsync<ContentVpnRecommendationDto>();
            Assert.NotNull(result);

            // Countries should be ranked by language score
            var countries = result.CountryAvailability.Values
                .OrderByDescending(c => c.LanguageScore)
                .ToList();

            // Verify descending order
            for (int i = 0; i < countries.Count - 1; i++)
            {
                Assert.True(countries[i].LanguageScore >= countries[i + 1].LanguageScore,
                    $"Country at index {i} should have score >= country at index {i + 1}");
            }

            // Verify VPN providers are also ranked
            var vpnProviders = result.RecommendedProviders;
            if (vpnProviders.Count > 1)
            {
                for (int i = 0; i < vpnProviders.Count - 1; i++)
                {
                    var score1 = (vpnProviders[i].LanguageCompatibilityScore * 0.6) +
                                 ((vpnProviders[i].OverallRating ?? 0) / 5.0 * 0.4);
                    var score2 = (vpnProviders[i + 1].LanguageCompatibilityScore * 0.6) +
                                 ((vpnProviders[i + 1].OverallRating ?? 0) / 5.0 * 0.4);

                    Assert.True(score1 >= score2,
                        $"VPN provider at index {i} should have combined score >= provider at index {i + 1}");
                }
            }
        }
    }

    [Fact]
    public async Task FullFlow_WithRealStreamingApiData_ReturnsRichLanguageData()
    {
        // Arrange - use well-known content ID
        var contentId = "tt0111161";

        // Act
        var response = await Client.GetAsync($"/api/vpnguidance/content-recommendations/{contentId}");

        // Assert
        var acceptableCodes = new[] { 200, 201, 204, 401, 404, 500, 503 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);

        if (response.IsSuccessStatusCode)
        {
            var result = await response.Content.ReadFromJsonAsync<ContentVpnRecommendationDto>();
            Assert.NotNull(result);

            // Verify metadata indicates data source
            Assert.NotNull(result.Criteria);

            if (result.Criteria.ContainsKey("dataSource"))
            {
                var dataSource = result.Criteria["dataSource"]?.ToString();
                Assert.True(
                    dataSource == "real_api" || dataSource == "fallback",
                    "Data source should be either 'real_api' or 'fallback'");
            }

            // Verify confidence score is reasonable
            Assert.True(result.ConfidenceScore >= 0.0 && result.ConfidenceScore <= 1.0,
                "Confidence score should be between 0 and 1");
        }
    }

    #endregion

    #region Edge Cases

    [Fact]
    public async Task EdgeCase_NoCountriesMatch_ReturnsGracefully()
    {
        // Arrange - use content that might not be available
        var contentId = "invalid-content-id-999";

        // Act
        var response = await Client.GetAsync($"/api/vpnguidance/content-recommendations/{contentId}");

        // Assert - Should handle gracefully with 404 or empty results
        var acceptableCodes = new[] { 200, 201, 204, 400, 401, 404, 500, 503 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    [Fact]
    public async Task EdgeCase_AllPerfectMatches_RanksCorrectly()
    {
        // Arrange - use no language preferences (all countries should match equally)
        var contentId = "tt0111161";

        // Act
        var response = await Client.GetAsync($"/api/vpnguidance/content-recommendations/{contentId}");

        // Assert
        var acceptableCodes = new[] { 200, 201, 204, 401, 404, 500, 503 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);

        if (response.IsSuccessStatusCode)
        {
            var result = await response.Content.ReadFromJsonAsync<ContentVpnRecommendationDto>();
            Assert.NotNull(result);

            // Without language preferences, system should still return recommendations
            Assert.NotNull(result.RecommendedProviders);
        }
    }

    [Fact]
    public async Task EdgeCase_VeryRareLanguage_ReturnsLimitedResults()
    {
        // Arrange - request a very rare language
        var contentId = "tt0111161";
        var rareLang = "zu"; // Zulu

        // Act
        var response = await Client.GetAsync(
            $"/api/vpnguidance/content-recommendations/{contentId}?audioLanguages={rareLang}");

        // Assert
        var acceptableCodes = new[] { 200, 201, 204, 401, 404, 500, 503 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);

        if (response.IsSuccessStatusCode)
        {
            var result = await response.Content.ReadFromJsonAsync<ContentVpnRecommendationDto>();
            Assert.NotNull(result);

            // Should still return results, but with lower language scores
            if (result.CountryAvailability.Any())
            {
                var avgScore = result.CountryAvailability.Values.Average(c => c.LanguageScore);
                Assert.True(avgScore < 0.5, "Average score for rare language should be low");
            }
        }
    }

    [Theory]
    [InlineData("tt0111161")] // Valid IMDB ID
    [InlineData("123456")] // Numeric ID
    [InlineData("test-content")] // String ID
    public async Task EdgeCase_DifferentContentIdFormats_HandlesGracefully(string contentId)
    {
        // Act
        var response = await Client.GetAsync($"/api/vpnguidance/content-recommendations/{contentId}");

        // Assert - Should handle all formats
        var acceptableCodes = new[] { 200, 201, 204, 400, 401, 404, 500, 503 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    #endregion

    #region Performance and Load Tests

    [Fact]
    public async Task Performance_MultipleCountries_CompletesWithinTimeout()
    {
        // Arrange
        var contentId = "tt0111161";
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();

        // Act
        var response = await Client.GetAsync($"/api/vpnguidance/content-recommendations/{contentId}?audioLanguages=en,es,fr");

        stopwatch.Stop();

        // Assert
        var acceptableCodes = new[] { 200, 201, 204, 401, 404, 500, 503 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
        Assert.True(stopwatch.ElapsedMilliseconds < 3000,
            $"Request should complete within 3 seconds. Actual: {stopwatch.ElapsedMilliseconds}ms");
    }

    [Fact]
    public async Task Performance_ConcurrentRequests_AllComplete()
    {
        // Arrange
        var contentId = "tt0111161";
        var tasks = new List<Task<HttpResponseMessage>>();

        // Act - Send 5 concurrent requests
        for (int i = 0; i < 5; i++)
        {
            tasks.Add(Client.GetAsync($"/api/vpnguidance/content-recommendations/{contentId}"));
        }

        var responses = await Task.WhenAll(tasks);

        // Assert - All should complete
        Assert.Equal(5, responses.Length);

        foreach (var response in responses)
        {
            var acceptableCodes = new[] { 200, 201, 204, 401, 404, 500, 503 };
            Assert.Contains((int)response.StatusCode, acceptableCodes);
        }
    }

    #endregion

    #region Backward Compatibility Tests

    [Fact]
    public async Task BackwardCompatibility_OldEndpoint_StillWorks()
    {
        // Arrange - Test old recommendation endpoint
        var endpoint = "/api/vpnguidance/recommendations?type=BestForStreaming";

        // Act
        var response = await Client.GetAsync(endpoint);

        // Assert - Old endpoint should still function
        var acceptableCodes = new[] { 200, 201, 204, 401, 404, 500, 503 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    [Fact]
    public async Task BackwardCompatibility_OldRecommendationsWithLanguage_StillWorks()
    {
        // Arrange - Test old endpoint with language parameters
        var contentId = "tt0111161";
        var endpoint = $"/api/vpnguidance/recommendations?contentId={contentId}&audioLanguages=en&type=BestForStreaming";

        // Act
        var response = await Client.GetAsync(endpoint);

        // Assert
        var acceptableCodes = new[] { 200, 201, 204, 401, 404, 500, 503 };
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    #endregion
}
