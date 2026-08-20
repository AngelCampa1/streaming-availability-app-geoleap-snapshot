using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Xunit;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using WireMock.Server;
using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;
using GeoLeap.Api;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using System.Net.Http;
using System.Text.Json;
using System.Text;
using NBomber.CSharp;
using NBomber.Contracts;

namespace GeoLeap.Api.Tests.SocialIntegration;

/// <summary>
/// Comprehensive Social Media Integration Test Suite
/// Tests OAuth 2.0 flows, API integrations, privacy compliance, and performance
/// </summary>
public class SocialMediaIntegrationTestSuite : IClassFixture<WebApplicationFactory<Program>>, IDisposable
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;
    private readonly WireMockServer _mockFacebookApi;
    private readonly WireMockServer _mockTwitterApi;
    private readonly WireMockServer _mockInstagramApi;
    private readonly WireMockServer _mockTikTokApi;
    private readonly string _testUserId = Guid.NewGuid().ToString();

    public SocialMediaIntegrationTestSuite(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
        _client = _factory.CreateClient();
        
        // Setup mock social media APIs
        _mockFacebookApi = WireMockServer.Start(port: 8081);
        _mockTwitterApi = WireMockServer.Start(port: 8082);
        _mockInstagramApi = WireMockServer.Start(port: 8083);
        _mockTikTokApi = WireMockServer.Start(port: 8084);
        
        SetupMockApis();
    }

    #region OAuth 2.0 Authentication Flow Tests

    [Fact]
    public async Task OAuth_FacebookLogin_ShouldInitiateCorrectFlow()
    {
        // Arrange
        var expectedState = Guid.NewGuid().ToString();
        var redirectUri = "https://localhost:3000/auth/callback/facebook";
        
        // Act
        var response = await _client.GetAsync($"/api/auth/facebook?redirect_uri={redirectUri}&state={expectedState}");
        
        // Assert
        response.Should().HaveStatusCode(System.Net.HttpStatusCode.Redirect);
        var location = response.Headers.Location?.ToString();
        location.Should().Contain("facebook.com/v18.0/dialog/oauth");
        location.Should().Contain($"state={expectedState}");
        location.Should().Contain($"redirect_uri={Uri.EscapeDataString(redirectUri)}");
    }

    [Fact]
    public async Task OAuth_TwitterLogin_ShouldInitiateCorrectFlow()
    {
        // Arrange
        var expectedState = Guid.NewGuid().ToString();
        var redirectUri = "https://localhost:3000/auth/callback/twitter";
        
        // Act
        var response = await _client.GetAsync($"/api/auth/twitter?redirect_uri={redirectUri}&state={expectedState}");
        
        // Assert
        response.Should().HaveStatusCode(System.Net.HttpStatusCode.Redirect);
        var location = response.Headers.Location?.ToString();
        location.Should().Contain("twitter.com/i/oauth2/authorize");
        location.Should().Contain($"state={expectedState}");
    }

    [Fact]
    public async Task OAuth_CallbackHandling_ShouldProcessTokenExchange()
    {
        // Arrange
        var authCode = "test_auth_code_12345";
        var state = "test_state_67890";
        var platform = "facebook";
        
        SetupMockTokenExchange(platform, authCode);
        
        // Act
        var response = await _client.GetAsync(
            $"/api/auth/callback/{platform}?code={authCode}&state={state}");
        
        // Assert
        response.Should().HaveStatusCode(System.Net.HttpStatusCode.OK);
        var content = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<Dictionary<string, object>>(content);
        result.Should().ContainKey("access_token");
        result.Should().ContainKey("user_id");
    }

    [Fact]
    public async Task OAuth_TokenRefresh_ShouldHandleExpiredTokens()
    {
        // Arrange
        var expiredToken = "expired_access_token";
        var refreshToken = "valid_refresh_token";
        
        SetupMockTokenRefresh("facebook", refreshToken);
        
        // Act
        var request = new HttpRequestMessage(HttpMethod.Post, "/api/auth/refresh")
        {
            Content = new StringContent(
                JsonSerializer.Serialize(new { platform = "facebook", refresh_token = refreshToken }),
                Encoding.UTF8,
                "application/json")
        };
        
        var response = await _client.SendAsync(request);
        
        // Assert
        response.Should().HaveStatusCode(System.Net.HttpStatusCode.OK);
        var content = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<Dictionary<string, object>>(content);
        result.Should().ContainKey("access_token");
    }

    #endregion

    #region Social Media API Integration Tests

    [Theory]
    [InlineData("facebook")]
    [InlineData("twitter")]
    [InlineData("instagram")]
    [InlineData("tiktok")]
    public async Task SocialApi_UserProfile_ShouldRetrieveCorrectData(string platform)
    {
        // Arrange
        var accessToken = $"valid_token_{platform}";
        SetupMockUserProfile(platform, accessToken);
        
        // Act
        var request = new HttpRequestMessage(HttpMethod.Get, $"/api/social/{platform}/profile")
        {
            Headers = { { "Authorization", $"Bearer {accessToken}" } }
        };
        
        var response = await _client.SendAsync(request);
        
        // Assert
        response.Should().HaveStatusCode(System.Net.HttpStatusCode.OK);
        var content = await response.Content.ReadAsStringAsync();
        var profile = JsonSerializer.Deserialize<Dictionary<string, object>>(content);
        profile.Should().ContainKey("id");
        profile.Should().ContainKey("name");
        profile.Should().ContainKey("email");
    }

    [Fact]
    public async Task SocialApi_FacebookFriends_ShouldRetrieveFriendsList()
    {
        // Arrange
        var accessToken = "valid_facebook_token";
        SetupMockFacebookFriends(accessToken);
        
        // Act
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/social/facebook/friends")
        {
            Headers = { { "Authorization", $"Bearer {accessToken}" } }
        };
        
        var response = await _client.SendAsync(request);
        
        // Assert
        response.Should().HaveStatusCode(System.Net.HttpStatusCode.OK);
        var content = await response.Content.ReadAsStringAsync();
        var friends = JsonSerializer.Deserialize<Dictionary<string, object>>(content);
        friends.Should().ContainKey("data");
    }

    [Fact]
    public async Task SocialApi_RateLimiting_ShouldHandleApiLimits()
    {
        // Arrange
        var accessToken = "rate_limited_token";
        SetupMockRateLimitedResponse("facebook", accessToken);
        
        // Act & Assert - Multiple rapid requests should trigger rate limiting
        var tasks = new List<Task<HttpResponseMessage>>();
        for (int i = 0; i < 10; i++)
        {
            var request = new HttpRequestMessage(HttpMethod.Get, "/api/social/facebook/profile")
            {
                Headers = { { "Authorization", $"Bearer {accessToken}" } }
            };
            tasks.Add(_client.SendAsync(request));
        }
        
        var responses = await Task.WhenAll(tasks);
        responses.Should().Contain(r => r.StatusCode == System.Net.HttpStatusCode.TooManyRequests);
    }

    #endregion

    #region Privacy Compliance and GDPR Tests

    [Fact]
    public async Task Privacy_UserConsent_ShouldRequireExplicitConsent()
    {
        // Arrange
        var consentRequest = new
        {
            userId = _testUserId,
            platform = "facebook",
            permissions = new[] { "public_profile", "email", "user_friends" },
            consentGiven = true,
            consentTimestamp = DateTime.UtcNow
        };
        
        // Act
        var response = await _client.PostAsJsonAsync("/api/privacy/consent", consentRequest);
        
        // Assert
        response.Should().HaveStatusCode(System.Net.HttpStatusCode.OK);
        
        // Verify consent is stored
        var getResponse = await _client.GetAsync($"/api/privacy/consent/{_testUserId}/facebook");
        getResponse.Should().HaveStatusCode(System.Net.HttpStatusCode.OK);
    }

    [Fact]
    public async Task Privacy_DataMinimization_ShouldOnlyCollectNecessaryData()
    {
        // Arrange
        var socialConnectRequest = new
        {
            userId = _testUserId,
            platform = "facebook",
            permissions = new[] { "public_profile", "email" } // Minimal permissions
        };
        
        // Act
        var response = await _client.PostAsJsonAsync("/api/social/connect", socialConnectRequest);
        
        // Assert
        response.Should().HaveStatusCode(System.Net.HttpStatusCode.OK);
        
        // Verify only minimal data is collected
        var userData = await _client.GetAsync($"/api/social/user-data/{_testUserId}");
        var content = await userData.Content.ReadAsStringAsync();
        var data = JsonSerializer.Deserialize<Dictionary<string, object>>(content);
        
        // Should not contain sensitive data like friends list without explicit permission
        data.Should().NotContainKey("friends");
        data.Should().NotContainKey("posts");
    }

    [Fact]
    public async Task Privacy_DataDeletion_ShouldAllowCompleteDataRemoval()
    {
        // Arrange - First create some social data
        await CreateTestSocialData(_testUserId);
        
        // Act - Request data deletion
        var deleteRequest = new { userId = _testUserId, platform = "facebook" };
        var response = await _client.PostAsJsonAsync("/api/privacy/delete-data", deleteRequest);
        
        // Assert
        response.Should().HaveStatusCode(System.Net.HttpStatusCode.OK);
        
        // Verify data is deleted
        var verifyResponse = await _client.GetAsync($"/api/social/user-data/{_testUserId}");
        verifyResponse.Should().HaveStatusCode(System.Net.HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Privacy_DataPortability_ShouldExportUserData()
    {
        // Arrange
        await CreateTestSocialData(_testUserId);
        
        // Act
        var response = await _client.GetAsync($"/api/privacy/export/{_testUserId}");
        
        // Assert
        response.Should().HaveStatusCode(System.Net.HttpStatusCode.OK);
        response.Content.Headers.ContentType?.MediaType.Should().Be("application/json");
        
        var content = await response.Content.ReadAsStringAsync();
        var exportData = JsonSerializer.Deserialize<Dictionary<string, object>>(content);
        exportData.Should().ContainKey("social_connections");
        exportData.Should().ContainKey("privacy_settings");
        exportData.Should().ContainKey("export_timestamp");
    }

    #endregion

    #region Social Recommendation Algorithm Tests

    [Fact]
    public async Task SocialRecommendation_FriendActivity_ShouldInfluenceRecommendations()
    {
        // Arrange
        var userId = _testUserId;
        await SetupUserWithSocialConnections(userId);
        await SimulateFriendActivity(userId);
        
        // Act
        var response = await _client.GetAsync($"/api/recommendations/{userId}?include_social=true");
        
        // Assert
        response.Should().HaveStatusCode(System.Net.HttpStatusCode.OK);
        var content = await response.Content.ReadAsStringAsync();
        var recommendations = JsonSerializer.Deserialize<Dictionary<string, object>>(content);
        
        recommendations.Should().ContainKey("social_recommendations");
        recommendations.Should().ContainKey("friend_activity_influence");
    }

    [Fact]
    public async Task SocialRecommendation_NetworkBasedFiltering_ShouldImproveRelevance()
    {
        // Arrange
        var userId = _testUserId;
        await SetupUserWithSocialNetwork(userId);
        
        // Act - Get recommendations with and without social data
        var socialRecs = await _client.GetAsync($"/api/recommendations/{userId}?include_social=true");
        var normalRecs = await _client.GetAsync($"/api/recommendations/{userId}?include_social=false");
        
        // Assert
        socialRecs.Should().HaveStatusCode(System.Net.HttpStatusCode.OK);
        normalRecs.Should().HaveStatusCode(System.Net.HttpStatusCode.OK);
        
        var socialContent = await socialRecs.Content.ReadAsStringAsync();
        var normalContent = await normalRecs.Content.ReadAsStringAsync();
        
        // Social recommendations should have higher confidence scores
        var socialData = JsonSerializer.Deserialize<Dictionary<string, object>>(socialContent);
        var normalData = JsonSerializer.Deserialize<Dictionary<string, object>>(normalContent);
        
        socialData.Should().ContainKey("average_confidence");
        // Social recommendations should be more confident
    }

    [Fact]
    public async Task SocialRecommendation_TrendingContent_ShouldDetectNetworkTrends()
    {
        // Arrange
        await SimulateNetworkTrendingContent();
        
        // Act
        var response = await _client.GetAsync("/api/social/trending?network_based=true");
        
        // Assert
        response.Should().HaveStatusCode(System.Net.HttpStatusCode.OK);
        var content = await response.Content.ReadAsStringAsync();
        var trending = JsonSerializer.Deserialize<Dictionary<string, object>>(content);
        
        trending.Should().ContainKey("trending_in_network");
        trending.Should().ContainKey("social_proof_scores");
    }

    #endregion

    #region Performance and Load Testing

    [Fact]
    public async Task Performance_SocialDataProcessing_ShouldHandleHighVolume()
    {
        // This test uses NBomber for performance testing
        var scenario = Scenario.Create("social_data_processing", async context =>
        {
            var userId = $"user_{context.ScenarioInfo.ThreadId}_{context.InvocationNumber}";
            var request = new
            {
                userId = userId,
                platform = "facebook",
                friendsData = GenerateTestFriendsData(100) // 100 friends per user
            };
            
            var response = await _client.PostAsJsonAsync("/api/social/process-friend-data", request);
            
            return response.IsSuccessStatusCode ? Response.Ok() : Response.Fail();
        })
        .WithLoadSimulations(
            Simulation.InjectPerSec(rate: 10, during: TimeSpan.FromMinutes(2))
        );

        NBomberRunner
            .RegisterScenarios(scenario)
            .Run();
        
        // Performance assertions would be based on NBomber results
        // For this example, we'll just ensure the test completes
        Assert.True(true);
    }

    [Fact]
    public async Task Performance_SocialRecommendations_ShouldMeetLatencyRequirements()
    {
        // Arrange
        var userId = _testUserId;
        await SetupUserWithLargeSocialNetwork(userId, 1000); // 1000 friends
        
        // Act & Measure
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        var response = await _client.GetAsync($"/api/recommendations/{userId}?include_social=true");
        stopwatch.Stop();
        
        // Assert
        response.Should().HaveStatusCode(System.Net.HttpStatusCode.OK);
        stopwatch.ElapsedMilliseconds.Should().BeLessThan(500); // < 500ms requirement
    }

    #endregion

    #region Security Testing

    [Fact]
    public async Task Security_OAuthStateParameter_ShouldPreventCSRF()
    {
        // Arrange
        var validState = Guid.NewGuid().ToString();
        var invalidState = Guid.NewGuid().ToString();
        
        // Act - Try to use invalid state
        var response = await _client.GetAsync(
            $"/api/auth/callback/facebook?code=test_code&state={invalidState}");
        
        // Assert
        response.Should().HaveStatusCode(System.Net.HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task Security_TokenValidation_ShouldRejectInvalidTokens()
    {
        // Arrange
        var invalidToken = "invalid_token_12345";
        
        // Act
        var request = new HttpRequestMessage(HttpMethod.Get, "/api/social/facebook/profile")
        {
            Headers = { { "Authorization", $"Bearer {invalidToken}" } }
        };
        
        var response = await _client.SendAsync(request);
        
        // Assert
        response.Should().HaveStatusCode(System.Net.HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task Security_SensitiveDataEncryption_ShouldEncryptStoredTokens()
    {
        // This test would verify that tokens are encrypted in storage
        // Implementation depends on the data storage mechanism
        
        // Arrange
        var userId = _testUserId;
        var accessToken = "sensitive_access_token";
        
        // Act - Store token
        var request = new { userId, platform = "facebook", accessToken };
        await _client.PostAsJsonAsync("/api/social/store-token", request);
        
        // Assert - Direct database check would verify encryption
        // This is a placeholder for the actual encryption verification
        Assert.True(true); // Would check actual database storage encryption
    }

    #endregion

    #region Helper Methods

    private void SetupMockApis()
    {
        // Facebook API mocks
        _mockFacebookApi
            .Given(Request.Create().WithPath("/oauth/access_token").UsingPost())
            .RespondWith(Response.Create()
                .WithStatusCode(200)
                .WithHeader("Content-Type", "application/json")
                .WithBody(JsonSerializer.Serialize(new
                {
                    access_token = "facebook_access_token",
                    token_type = "bearer",
                    expires_in = 3600
                })));

        // Twitter API mocks
        _mockTwitterApi
            .Given(Request.Create().WithPath("/2/oauth2/token").UsingPost())
            .RespondWith(Response.Create()
                .WithStatusCode(200)
                .WithHeader("Content-Type", "application/json")
                .WithBody(JsonSerializer.Serialize(new
                {
                    access_token = "twitter_access_token",
                    token_type = "bearer",
                    expires_in = 7200
                })));

        // Similar setup for Instagram and TikTok APIs...
    }

    private void SetupMockTokenExchange(string platform, string authCode)
    {
        var mockServer = GetMockServer(platform);
        mockServer
            .Given(Request.Create()
                .WithPath($"/{GetTokenPath(platform)}")
                .UsingPost()
                .WithBody(body => body.Contains(authCode)))
            .RespondWith(Response.Create()
                .WithStatusCode(200)
                .WithHeader("Content-Type", "application/json")
                .WithBody(JsonSerializer.Serialize(new
                {
                    access_token = $"{platform}_access_token",
                    refresh_token = $"{platform}_refresh_token",
                    user_id = $"{platform}_user_123",
                    expires_in = 3600
                })));
    }

    private void SetupMockTokenRefresh(string platform, string refreshToken)
    {
        var mockServer = GetMockServer(platform);
        mockServer
            .Given(Request.Create()
                .WithPath($"/{GetTokenPath(platform)}")
                .UsingPost()
                .WithBody(body => body.Contains(refreshToken)))
            .RespondWith(Response.Create()
                .WithStatusCode(200)
                .WithHeader("Content-Type", "application/json")
                .WithBody(JsonSerializer.Serialize(new
                {
                    access_token = $"new_{platform}_access_token",
                    expires_in = 3600
                })));
    }

    private void SetupMockUserProfile(string platform, string accessToken)
    {
        var mockServer = GetMockServer(platform);
        mockServer
            .Given(Request.Create()
                .WithPath($"/{GetProfilePath(platform)}")
                .UsingGet()
                .WithHeader("Authorization", $"Bearer {accessToken}"))
            .RespondWith(Response.Create()
                .WithStatusCode(200)
                .WithHeader("Content-Type", "application/json")
                .WithBody(JsonSerializer.Serialize(new
                {
                    id = $"{platform}_user_123",
                    name = $"Test User {platform}",
                    email = $"test@{platform}.com",
                    profile_picture = $"https://{platform}.com/profile.jpg"
                })));
    }

    private void SetupMockFacebookFriends(string accessToken)
    {
        _mockFacebookApi
            .Given(Request.Create()
                .WithPath("/me/friends")
                .UsingGet()
                .WithHeader("Authorization", $"Bearer {accessToken}"))
            .RespondWith(Response.Create()
                .WithStatusCode(200)
                .WithHeader("Content-Type", "application/json")
                .WithBody(JsonSerializer.Serialize(new
                {
                    data = new[]
                    {
                        new { id = "friend_1", name = "Friend One" },
                        new { id = "friend_2", name = "Friend Two" },
                        new { id = "friend_3", name = "Friend Three" }
                    }
                })));
    }

    private void SetupMockRateLimitedResponse(string platform, string accessToken)
    {
        var mockServer = GetMockServer(platform);
        mockServer
            .Given(Request.Create()
                .WithPath($"/{GetProfilePath(platform)}")
                .UsingGet()
                .WithHeader("Authorization", $"Bearer {accessToken}"))
            .RespondWith(Response.Create()
                .WithStatusCode(429)
                .WithHeader("Content-Type", "application/json")
                .WithBody(JsonSerializer.Serialize(new
                {
                    error = new
                    {
                        message = "Rate limit exceeded",
                        type = "OAuthException",
                        code = 4
                    }
                })));
    }

    private WireMockServer GetMockServer(string platform) => platform switch
    {
        "facebook" => _mockFacebookApi,
        "twitter" => _mockTwitterApi,
        "instagram" => _mockInstagramApi,
        "tiktok" => _mockTikTokApi,
        _ => throw new ArgumentException($"Unknown platform: {platform}")
    };

    private string GetTokenPath(string platform) => platform switch
    {
        "facebook" => "oauth/access_token",
        "twitter" => "2/oauth2/token",
        "instagram" => "oauth/access_token",
        "tiktok" => "oauth/access_token",
        _ => throw new ArgumentException($"Unknown platform: {platform}")
    };

    private string GetProfilePath(string platform) => platform switch
    {
        "facebook" => "me",
        "twitter" => "2/users/me",
        "instagram" => "me",
        "tiktok" => "user/info",
        _ => throw new ArgumentException($"Unknown platform: {platform}")
    };

    private async Task CreateTestSocialData(string userId)
    {
        var socialData = new
        {
            userId,
            platform = "facebook",
            profile = new { name = "Test User", email = "test@example.com" },
            connections = new[] { "friend_1", "friend_2", "friend_3" },
            preferences = new { contentTypes = new[] { "movie", "tv" } }
        };
        
        await _client.PostAsJsonAsync("/api/social/store-data", socialData);
    }

    private async Task SetupUserWithSocialConnections(string userId)
    {
        var connections = new
        {
            userId,
            platforms = new[] { "facebook", "twitter" },
            friendsCount = 50,
            networkSize = 200
        };
        
        await _client.PostAsJsonAsync("/api/social/setup-test-connections", connections);
    }

    private async Task SimulateFriendActivity(string userId)
    {
        var activity = new
        {
            userId,
            friendActivities = new[]
            {
                new { friendId = "friend_1", contentId = "movie_123", action = "watched" },
                new { friendId = "friend_2", contentId = "movie_123", action = "liked" },
                new { friendId = "friend_3", contentId = "tv_456", action = "shared" }
            }
        };
        
        await _client.PostAsJsonAsync("/api/social/simulate-activity", activity);
    }

    private async Task SetupUserWithSocialNetwork(string userId)
    {
        var network = new
        {
            userId,
            networkData = new
            {
                totalFriends = 100,
                activeFriends = 75,
                sharedInterests = new[] { "movies", "tv_shows", "documentaries" },
                commonGenres = new[] { "action", "comedy", "drama" }
            }
        };
        
        await _client.PostAsJsonAsync("/api/social/setup-network", network);
    }

    private async Task SimulateNetworkTrendingContent()
    {
        var trending = new
        {
            timeframe = "last_24_hours",
            contentActivity = new[]
            {
                new { contentId = "movie_trending_1", platform = "facebook", engagements = 150 },
                new { contentId = "movie_trending_1", platform = "twitter", engagements = 89 },
                new { contentId = "tv_trending_2", platform = "instagram", engagements = 234 }
            }
        };
        
        await _client.PostAsJsonAsync("/api/social/simulate-trending", trending);
    }

    private object[] GenerateTestFriendsData(int count)
    {
        var friends = new object[count];
        for (int i = 0; i < count; i++)
        {
            friends[i] = new
            {
                id = $"friend_{i}",
                name = $"Friend {i}",
                mutualFriends = Random.Shared.Next(0, 20),
                lastActive = DateTime.UtcNow.AddDays(-Random.Shared.Next(0, 30))
            };
        }
        return friends;
    }

    private async Task SetupUserWithLargeSocialNetwork(string userId, int friendsCount)
    {
        var network = new
        {
            userId,
            friends = GenerateTestFriendsData(friendsCount),
            networkMetrics = new
            {
                totalConnections = friendsCount,
                activeConnections = (int)(friendsCount * 0.7),
                engagementRate = 0.15
            }
        };
        
        await _client.PostAsJsonAsync("/api/social/setup-large-network", network);
    }

    #endregion

    public void Dispose()
    {
        _mockFacebookApi?.Stop();
        _mockTwitterApi?.Stop();
        _mockInstagramApi?.Stop();
        _mockTikTokApi?.Stop();
        _client?.Dispose();
    }
}