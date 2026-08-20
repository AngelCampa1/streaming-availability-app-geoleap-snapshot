using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Security.Cryptography;
using System.Text;
using Xunit;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using WireMock.Server;
using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;
using GeoLeap.Api;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using System.Net.Http;
using System.Text.Json;

namespace GeoLeap.Api.Tests.SocialIntegration;

/// <summary>
/// Social Media Security Testing Suite
/// Tests OAuth security, token management, CSRF protection, and data encryption
/// </summary>
public class SocialSecurityTests : IClassFixture<WebApplicationFactory<Program>>, IDisposable
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;
    private readonly WireMockServer _mockSocialApi;

    public SocialSecurityTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
        _client = _factory.CreateClient();
        _mockSocialApi = WireMockServer.Start(port: 8090);
        SetupMockSocialApis();
    }

    #region OAuth Security Tests

    [Fact]
    public async Task OAuth_StateParameter_ShouldPreventCSRFAttacks()
    {
        // Arrange
        var validState = GenerateSecureRandomString(32);
        var invalidState = "malicious_state_parameter";
        
        // Store the valid state (simulating session storage)
        await StoreOAuthState("test_user", validState);
        
        // Act - Try callback with invalid state
        var response = await _client.GetAsync(
            $"/api/auth/callback/facebook?code=test_code&state={invalidState}");
        
        // Assert
        response.Should().HaveStatusCode(System.Net.HttpStatusCode.BadRequest);
        var content = await response.Content.ReadAsStringAsync();
        content.Should().Contain("Invalid state parameter");
    }

    [Fact]
    public async Task OAuth_StateParameter_ShouldBeSecurelyGenerated()
    {
        // Arrange & Act
        var response = await _client.GetAsync("/api/auth/facebook?redirect_uri=https://localhost:3000/callback");
        
        // Assert
        response.Should().HaveStatusCode(System.Net.HttpStatusCode.Redirect);
        var location = response.Headers.Location?.ToString();
        
        // Extract state parameter
        var stateMatch = System.Text.RegularExpressions.Regex.Match(location, @"state=([^&]+)");
        stateMatch.Success.Should().BeTrue();
        
        var state = Uri.UnescapeDataString(stateMatch.Groups[1].Value);
        
        // State should be cryptographically random and sufficiently long
        state.Length.Should().BeGreaterOrEqualTo(32);
        state.Should().MatchRegex(@"^[A-Za-z0-9+/]+=*$"); // Base64 pattern
    }

    [Fact]
    public async Task OAuth_PKCEChallenge_ShouldBeImplementedForTwitter()
    {
        // Arrange & Act
        var response = await _client.GetAsync("/api/auth/twitter?redirect_uri=https://localhost:3000/callback");
        
        // Assert
        response.Should().HaveStatusCode(System.Net.HttpStatusCode.Redirect);
        var location = response.Headers.Location?.ToString();
        
        // Twitter OAuth 2.0 should include PKCE parameters
        location.Should().Contain("code_challenge=");
        location.Should().Contain("code_challenge_method=S256");
        
        // Extract code challenge
        var challengeMatch = System.Text.RegularExpressions.Regex.Match(location, @"code_challenge=([^&]+)");
        challengeMatch.Success.Should().BeTrue();
        
        var challenge = Uri.UnescapeDataString(challengeMatch.Groups[1].Value);
        challenge.Length.Should().Be(43); // Base64url encoded SHA256 hash length
    }

    [Fact]
    public async Task OAuth_RedirectURI_ShouldValidateAllowedOrigins()
    {
        // Arrange
        var validRedirectUri = "https://localhost:3000/auth/callback";
        var invalidRedirectUri = "https://malicious-site.com/callback";
        
        // Act & Assert - Valid URI
        var validResponse = await _client.GetAsync($"/api/auth/facebook?redirect_uri={validRedirectUri}");
        validResponse.Should().HaveStatusCode(System.Net.HttpStatusCode.Redirect);
        
        // Act & Assert - Invalid URI
        var invalidResponse = await _client.GetAsync($"/api/auth/facebook?redirect_uri={invalidRedirectUri}");
        invalidResponse.Should().HaveStatusCode(System.Net.HttpStatusCode.BadRequest);
        
        var content = await invalidResponse.Content.ReadAsStringAsync();
        content.Should().Contain("Invalid redirect URI");
    }

    #endregion

    #region Token Security Tests

    [Fact]
    public async Task TokenStorage_ShouldEncryptAccessTokens()
    {
        // Arrange
        var accessToken = "sensitive_facebook_access_token_12345";
        var refreshToken = "sensitive_facebook_refresh_token_67890";
        
        var tokenData = new
        {
            userId = "test_user_123",
            platform = "facebook",
            accessToken = accessToken,
            refreshToken = refreshToken,
            expiresAt = DateTime.UtcNow.AddHours(1)
        };
        
        // Act
        var response = await _client.PostAsJsonAsync("/api/auth/store-tokens", tokenData);
        
        // Assert
        response.Should().HaveStatusCode(System.Net.HttpStatusCode.OK);
        
        // Verify tokens are encrypted in storage (this would typically check the database)
        // For this test, we assume the service encrypts tokens before storage
        var storedTokens = await GetStoredTokens("test_user_123", "facebook");
        storedTokens.Should().NotBeNull();
        storedTokens.AccessToken.Should().NotBe(accessToken); // Should be encrypted
        storedTokens.RefreshToken.Should().NotBe(refreshToken); // Should be encrypted
    }

    [Fact]
    public async Task TokenValidation_ShouldRejectMalformedTokens()
    {
        // Arrange
        var malformedTokens = new[]
        {
            "", // Empty token
            "short", // Too short
            "<script>alert('xss')</script>", // XSS attempt
            "../../../etc/passwd", // Path traversal attempt
            "'; DROP TABLE users; --", // SQL injection attempt
            new string('A', 10000) // Extremely long token
        };
        
        foreach (var token in malformedTokens)
        {
            // Act
            var request = new HttpRequestMessage(HttpMethod.Get, "/api/social/facebook/profile")
            {
                Headers = { { "Authorization", $"Bearer {token}" } }
            };
            
            var response = await _client.SendAsync(request);
            
            // Assert
            response.Should().HaveStatusCode(System.Net.HttpStatusCode.Unauthorized);
        }
    }

    [Fact]
    public async Task TokenRefresh_ShouldValidateRefreshTokenSignature()
    {
        // Arrange
        var validRefreshToken = GenerateValidRefreshToken();
        var invalidRefreshToken = "tampered_refresh_token_12345";
        
        SetupMockTokenRefresh(validRefreshToken, true);
        SetupMockTokenRefresh(invalidRefreshToken, false);
        
        // Act - Valid token
        var validRequest = new
        {
            platform = "facebook",
            refreshToken = validRefreshToken
        };
        var validResponse = await _client.PostAsJsonAsync("/api/auth/refresh", validRequest);
        
        // Act - Invalid token
        var invalidRequest = new
        {
            platform = "facebook",
            refreshToken = invalidRefreshToken
        };
        var invalidResponse = await _client.PostAsJsonAsync("/api/auth/refresh", invalidRequest);
        
        // Assert
        validResponse.Should().HaveStatusCode(System.Net.HttpStatusCode.OK);
        invalidResponse.Should().HaveStatusCode(System.Net.HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task TokenExpiry_ShouldAutomaticallyRefreshBeforeExpiration()
    {
        // Arrange
        var userId = "test_user_123";
        var expiringSoonToken = CreateExpiringToken(TimeSpan.FromMinutes(5)); // Expires in 5 minutes
        var refreshToken = GenerateValidRefreshToken();
        
        await StoreTokens(userId, "facebook", expiringSoonToken, refreshToken);
        SetupMockTokenRefresh(refreshToken, true);
        
        // Act - Make API call that should trigger token refresh
        var request = new HttpRequestMessage(HttpMethod.Get, $"/api/social/facebook/profile")
        {
            Headers = { { "X-User-ID", userId } }
        };
        
        var response = await _client.SendAsync(request);
        
        // Assert
        response.Should().HaveStatusCode(System.Net.HttpStatusCode.OK);
        
        // Verify new token was stored
        var updatedTokens = await GetStoredTokens(userId, "facebook");
        updatedTokens.AccessToken.Should().NotBe(expiringSoonToken);
        updatedTokens.ExpiresAt.Should().BeAfter(DateTime.UtcNow.AddHours(1));
    }

    #endregion

    #region Data Protection Tests

    [Fact]
    public async Task SensitiveData_ShouldBeEncryptedAtRest()
    {
        // Arrange
        var sensitiveUserData = new
        {
            userId = "test_user_123",
            socialProfile = new
            {
                email = "user@example.com",
                phone = "+1234567890",
                personalInfo = "Sensitive personal information",
                friendsList = new[] { "friend1", "friend2", "friend3" }
            },
            preferences = new
            {
                location = "New York, NY",
                interests = new[] { "movies", "music", "travel" }
            }
        };
        
        // Act
        var response = await _client.PostAsJsonAsync("/api/social/store-profile", sensitiveUserData);
        
        // Assert
        response.Should().HaveStatusCode(System.Net.HttpStatusCode.OK);
        
        // Verify data is encrypted in storage
        var storedData = await GetStoredProfileData("test_user_123");
        storedData.Should().NotBeNull();
        
        // Email and phone should be encrypted (not plaintext)
        storedData.Email.Should().NotBe(sensitiveUserData.socialProfile.email);
        storedData.Phone.Should().NotBe(sensitiveUserData.socialProfile.phone);
        storedData.PersonalInfo.Should().NotBe(sensitiveUserData.socialProfile.personalInfo);
    }

    [Fact]
    public async Task DataTransmission_ShouldUseTLSEncryption()
    {
        // Arrange
        var sensitiveRequest = new
        {
            accessToken = "sensitive_access_token",
            personalData = "Sensitive user data"
        };
        
        // Act
        var response = await _client.PostAsJsonAsync("/api/social/process-data", sensitiveRequest);
        
        // Assert - This test verifies that the client is configured to use HTTPS
        _client.BaseAddress?.Scheme.Should().Be("https");
        response.Should().HaveStatusCode(System.Net.HttpStatusCode.OK);
    }

    [Fact]
    public async Task PersonalData_ShouldImplementProperAccessControls()
    {
        // Arrange
        var userAId = "user_a_123";
        var userBId = "user_b_456";
        
        await CreateUserProfile(userAId, "User A's private data");
        await CreateUserProfile(userBId, "User B's private data");
        
        // Act - User A tries to access User B's data
        var request = new HttpRequestMessage(HttpMethod.Get, $"/api/social/profile/{userBId}")
        {
            Headers = { { "X-User-ID", userAId } }
        };
        
        var response = await _client.SendAsync(request);
        
        // Assert
        response.Should().HaveStatusCode(System.Net.HttpStatusCode.Forbidden);
    }

    #endregion

    #region Input Validation and Sanitization Tests

    [Fact]
    public async Task SocialInput_ShouldSanitizeUserGeneratedContent()
    {
        // Arrange
        var maliciousInputs = new[]
        {
            "<script>alert('xss')</script>",
            "javascript:alert('xss')",
            "<img src=x onerror=alert('xss')>",
            "'; DROP TABLE users; --",
            "../../../etc/passwd",
            "${7*7}", // Template injection
            "{{7*7}}", // Template injection
            "%3Cscript%3Ealert('xss')%3C/script%3E" // URL encoded XSS
        };
        
        foreach (var input in maliciousInputs)
        {
            var socialPost = new
            {
                userId = "test_user",
                platform = "facebook",
                content = input,
                title = input
            };
            
            // Act
            var response = await _client.PostAsJsonAsync("/api/social/create-post", socialPost);
            
            // Assert - Should either reject or sanitize
            if (response.IsSuccessStatusCode)
            {
                var content = await response.Content.ReadAsStringAsync();
                var result = JsonSerializer.Deserialize<Dictionary<string, object>>(content);
                
                // Verify content is sanitized (no script tags, etc.)
                var sanitizedContent = result["sanitized_content"].ToString();
                sanitizedContent.Should().NotContain("<script>");
                sanitizedContent.Should().NotContain("javascript:");
                sanitizedContent.Should().NotContain("onerror=");
            }
            else
            {
                // Request should be rejected with appropriate error
                response.Should().HaveStatusCode(System.Net.HttpStatusCode.BadRequest);
            }
        }
    }

    [Theory]
    [InlineData("facebook")]
    [InlineData("twitter")]
    [InlineData("instagram")]
    [InlineData("tiktok")]
    public async Task SocialPlatformAPI_ShouldValidateParameterLength(string platform)
    {
        // Arrange
        var oversizedData = new
        {
            userId = new string('A', 1000), // Very long user ID
            content = new string('B', 10000), // Very long content
            metadata = string.Join("", Enumerable.Repeat("metadata", 1000)) // Very long metadata
        };
        
        // Act
        var response = await _client.PostAsJsonAsync($"/api/social/{platform}/post", oversizedData);
        
        // Assert
        response.Should().HaveStatusCode(System.Net.HttpStatusCode.BadRequest);
        var content = await response.Content.ReadAsStringAsync();
        content.Should().Contain("exceeds maximum length");
    }

    #endregion

    #region Rate Limiting and DDoS Protection Tests

    [Fact]
    public async Task SocialAPI_ShouldImplementRateLimiting()
    {
        // Arrange
        var userId = "test_user_rate_limit";
        var requests = new List<Task<HttpResponseMessage>>();
        
        // Act - Send many requests rapidly
        for (int i = 0; i < 50; i++)
        {
            var request = new HttpRequestMessage(HttpMethod.Get, "/api/social/facebook/profile")
            {
                Headers = 
                {
                    { "Authorization", "Bearer valid_test_token" },
                    { "X-User-ID", userId }
                }
            };
            requests.Add(_client.SendAsync(request));
        }
        
        var responses = await Task.WhenAll(requests);
        
        // Assert
        var rateLimitedResponses = responses.Where(r => r.StatusCode == System.Net.HttpStatusCode.TooManyRequests);
        rateLimitedResponses.Should().NotBeEmpty("Rate limiting should be triggered with many rapid requests");
        
        // Check rate limit headers
        var rateLimitedResponse = rateLimitedResponses.First();
        rateLimitedResponse.Headers.Should().ContainKey("X-RateLimit-Limit");
        rateLimitedResponse.Headers.Should().ContainKey("X-RateLimit-Remaining");
        rateLimitedResponse.Headers.Should().ContainKey("Retry-After");
    }

    [Fact]
    public async Task SocialAPI_ShouldHandleBurstTraffic()
    {
        // Arrange
        var burstSize = 20;
        var normalRequestDelay = TimeSpan.FromMilliseconds(100);
        
        // Act - Send burst of requests
        var burstTasks = new List<Task<(HttpResponseMessage Response, TimeSpan Duration)>>();
        
        for (int i = 0; i < burstSize; i++)
        {
            burstTasks.Add(TimedRequest($"/api/social/facebook/friends?page={i}"));
        }
        
        var burstResults = await Task.WhenAll(burstTasks);
        
        // Act - Send normal requests after burst
        await Task.Delay(TimeSpan.FromSeconds(2)); // Wait for rate limit to reset
        
        var normalTasks = new List<Task<(HttpResponseMessage Response, TimeSpan Duration)>>();
        for (int i = 0; i < 5; i++)
        {
            normalTasks.Add(TimedRequest("/api/social/facebook/profile"));
            await Task.Delay(normalRequestDelay);
        }
        
        var normalResults = await Task.WhenAll(normalTasks);
        
        // Assert
        var successfulBurstRequests = burstResults.Where(r => r.Response.IsSuccessStatusCode);
        var successfulNormalRequests = normalResults.Where(r => r.Response.IsSuccessStatusCode);
        
        successfulBurstRequests.Should().NotBeEmpty("Some burst requests should succeed");
        successfulNormalRequests.Should().HaveCount(5, "All normal requests should succeed after rate limit reset");
        
        // Response times should be reasonable
        var avgBurstTime = burstResults.Average(r => r.Duration.TotalMilliseconds);
        var avgNormalTime = normalResults.Average(r => r.Duration.TotalMilliseconds);
        
        avgBurstTime.Should().BeLessThan(2000); // Burst requests should complete within 2 seconds
        avgNormalTime.Should().BeLessThan(500); // Normal requests should be faster
    }

    #endregion

    #region Privacy and Compliance Security Tests

    [Fact]
    public async Task PrivacyControls_ShouldEnforceDataAccessPermissions()
    {
        // Arrange
        var userId = "privacy_test_user";
        var restrictedPermissions = new
        {
            allowProfileAccess = false,
            allowFriendsAccess = false,
            allowActivityTracking = false
        };
        
        await SetUserPrivacySettings(userId, restrictedPermissions);
        
        // Act - Try to access restricted data
        var profileResponse = await _client.GetAsync($"/api/social/facebook/profile?user_id={userId}");
        var friendsResponse = await _client.GetAsync($"/api/social/facebook/friends?user_id={userId}");
        var activityResponse = await _client.GetAsync($"/api/social/activity?user_id={userId}");
        
        // Assert
        profileResponse.Should().HaveStatusCode(System.Net.HttpStatusCode.Forbidden);
        friendsResponse.Should().HaveStatusCode(System.Net.HttpStatusCode.Forbidden);
        activityResponse.Should().HaveStatusCode(System.Net.HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task DataRetention_ShouldAutomaticallyDeleteExpiredData()
    {
        // Arrange
        var userId = "data_retention_user";
        var oldData = new
        {
            userId = userId,
            socialActivity = "Old social activity data",
            createdAt = DateTime.UtcNow.AddYears(-3), // 3 years old
            retentionPeriod = TimeSpan.FromYears(2) // 2 year retention
        };
        
        await CreateSocialActivityData(oldData);
        
        // Act - Trigger data retention cleanup
        var cleanupResponse = await _client.PostAsync("/api/privacy/cleanup-expired-data", null);
        
        // Assert
        cleanupResponse.Should().HaveStatusCode(System.Net.HttpStatusCode.OK);
        
        // Verify old data is deleted
        var dataResponse = await _client.GetAsync($"/api/social/activity?user_id={userId}");
        dataResponse.Should().HaveStatusCode(System.Net.HttpStatusCode.NotFound);
    }

    #endregion

    #region Helper Methods

    private void SetupMockSocialApis()
    {
        _mockSocialApi
            .Given(Request.Create().WithPath("/oauth/token").UsingPost())
            .RespondWith(Response.Create()
                .WithStatusCode(200)
                .WithHeader("Content-Type", "application/json")
                .WithBody(JsonSerializer.Serialize(new
                {
                    access_token = "mock_access_token",
                    refresh_token = "mock_refresh_token",
                    expires_in = 3600
                })));
    }

    private string GenerateSecureRandomString(int length)
    {
        using var rng = RandomNumberGenerator.Create();
        var bytes = new byte[length];
        rng.GetBytes(bytes);
        return Convert.ToBase64String(bytes)[..length];
    }

    private async Task StoreOAuthState(string userId, string state)
    {
        var stateData = new { userId, state, createdAt = DateTime.UtcNow };
        await _client.PostAsJsonAsync("/api/auth/store-state", stateData);
    }

    private async Task<TokenInfo> GetStoredTokens(string userId, string platform)
    {
        var response = await _client.GetAsync($"/api/auth/tokens?user_id={userId}&platform={platform}");
        if (response.IsSuccessStatusCode)
        {
            var content = await response.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<TokenInfo>(content, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        }
        return null;
    }

    private string GenerateValidRefreshToken()
    {
        // This would generate a properly signed refresh token
        // For testing, we'll use a mock token
        return "valid_refresh_token_with_signature_" + Guid.NewGuid().ToString("N");
    }

    private void SetupMockTokenRefresh(string refreshToken, bool isValid)
    {
        if (isValid)
        {
            _mockSocialApi
                .Given(Request.Create()
                    .WithPath("/oauth/token")
                    .UsingPost()
                    .WithBody($"*{refreshToken}*"))
                .RespondWith(Response.Create()
                    .WithStatusCode(200)
                    .WithHeader("Content-Type", "application/json")
                    .WithBody(JsonSerializer.Serialize(new
                    {
                        access_token = "new_access_token",
                        expires_in = 3600
                    })));
        }
        else
        {
            _mockSocialApi
                .Given(Request.Create()
                    .WithPath("/oauth/token")
                    .UsingPost()
                    .WithBody($"*{refreshToken}*"))
                .RespondWith(Response.Create()
                    .WithStatusCode(401)
                    .WithHeader("Content-Type", "application/json")
                    .WithBody(JsonSerializer.Serialize(new
                    {
                        error = "invalid_grant",
                        error_description = "Invalid refresh token"
                    })));
        }
    }

    private string CreateExpiringToken(TimeSpan expiresIn)
    {
        var expiryTime = DateTimeOffset.UtcNow.Add(expiresIn).ToUnixTimeSeconds();
        return $"expiring_token_{expiryTime}_{Guid.NewGuid():N}";
    }

    private async Task StoreTokens(string userId, string platform, string accessToken, string refreshToken)
    {
        var tokenData = new
        {
            userId,
            platform,
            accessToken,
            refreshToken,
            expiresAt = DateTime.UtcNow.AddHours(1)
        };
        await _client.PostAsJsonAsync("/api/auth/store-tokens", tokenData);
    }

    private async Task<ProfileData> GetStoredProfileData(string userId)
    {
        var response = await _client.GetAsync($"/api/social/stored-profile?user_id={userId}");
        if (response.IsSuccessStatusCode)
        {
            var content = await response.Content.ReadAsStringAsync();
            return JsonSerializer.Deserialize<ProfileData>(content, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        }
        return null;
    }

    private async Task CreateUserProfile(string userId, string privateData)
    {
        var profileData = new { userId, privateData, createdAt = DateTime.UtcNow };
        await _client.PostAsJsonAsync("/api/social/create-profile", profileData);
    }

    private async Task<(HttpResponseMessage Response, TimeSpan Duration)> TimedRequest(string endpoint)
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        var request = new HttpRequestMessage(HttpMethod.Get, endpoint)
        {
            Headers = { { "Authorization", "Bearer test_token" } }
        };
        var response = await _client.SendAsync(request);
        stopwatch.Stop();
        return (response, stopwatch.Elapsed);
    }

    private async Task SetUserPrivacySettings(string userId, object permissions)
    {
        var privacyData = new { userId, permissions, updatedAt = DateTime.UtcNow };
        await _client.PostAsJsonAsync("/api/privacy/settings", privacyData);
    }

    private async Task CreateSocialActivityData(object activityData)
    {
        await _client.PostAsJsonAsync("/api/social/create-activity", activityData);
    }

    public void Dispose()
    {
        _mockSocialApi?.Stop();
        _client?.Dispose();
    }

    #endregion

    #region Helper Classes

    private class TokenInfo
    {
        public string AccessToken { get; set; } = string.Empty;
        public string RefreshToken { get; set; } = string.Empty;
        public DateTime ExpiresAt { get; set; }
    }

    private class ProfileData
    {
        public string Email { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string PersonalInfo { get; set; } = string.Empty;
    }

    #endregion
}