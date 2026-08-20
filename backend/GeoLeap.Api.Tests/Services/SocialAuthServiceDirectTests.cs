using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Moq;
using Xunit;

namespace GeoLeap.Api.Tests.Services;

/// <summary>
/// Direct tests for SocialAuthService - OAuth 2.0 social media authentication
/// Phase 4.3 - HIGH PRIORITY
/// Target: 20 tests covering OAuth flows, token management, privacy, and social features
/// </summary>
public class SocialAuthServiceDirectTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly SocialAuthService _service;
    private readonly Mock<ISocialTokenService> _mockTokenService;
    private readonly Mock<ILoggerService> _mockLogger;
    private readonly Mock<IConfiguration> _mockConfiguration;
    private readonly Mock<ISocialPlatformProviderFactory> _mockProviderFactory;
    private readonly Mock<ISocialRecommendationEngine> _mockRecommendationEngine;
    private readonly Mock<IPrivacyService> _mockPrivacyService;

    private readonly Guid _testUserId = Guid.NewGuid();
    private const string TestPlatform = "facebook";

    public SocialAuthServiceDirectTests()
    {
        // In-memory database setup
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"SocialAuthServiceTests_{Guid.NewGuid()}")
            .Options;

        _context = new ApplicationDbContext(options);

        // Mock external dependencies only (boundary-only mocking)
        _mockTokenService = new Mock<ISocialTokenService>();
        _mockLogger = new Mock<ILoggerService>();
        _mockConfiguration = new Mock<IConfiguration>();
        _mockProviderFactory = new Mock<ISocialPlatformProviderFactory>();
        _mockRecommendationEngine = new Mock<ISocialRecommendationEngine>();
        _mockPrivacyService = new Mock<IPrivacyService>();

        _service = new SocialAuthService(
            _context,
            _mockTokenService.Object,
            _mockLogger.Object,
            _mockConfiguration.Object,
            _mockProviderFactory.Object,
            _mockRecommendationEngine.Object,
            _mockPrivacyService.Object
        );
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    #region OAuth Flow Initiation Tests

    [Fact]
    public async Task InitiateOAuthFlowAsync_ValidPlatform_ReturnsSuccess()
    {
        // Arrange
        var redirectUrl = "https://app.geoleap.com/auth/callback";
        var mockProvider = new Mock<ISocialPlatformProvider>();
        mockProvider
            .Setup(p => p.GenerateAuthorizationUrlAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string[]>()))
            .ReturnsAsync("https://facebook.com/oauth/authorize?state=abc123");

        _mockProviderFactory
            .Setup(f => f.GetProviderAsync(TestPlatform))
            .ReturnsAsync(mockProvider.Object);

        // Act
        var result = await _service.InitiateOAuthFlowAsync(TestPlatform, _testUserId, redirectUrl);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.NotNull(result.AuthorizationUrl);
        Assert.NotNull(result.State);
        Assert.True(result.ExpiresAt > DateTime.UtcNow);

        // Verify OAuth state was saved
        var savedState = await _context.OAuthStates
            .FirstOrDefaultAsync(s => s.UserId == _testUserId && s.Platform == TestPlatform);
        Assert.NotNull(savedState);
        Assert.Equal(redirectUrl, savedState.RedirectUrl);
        Assert.False(savedState.IsUsed);
    }

    [Fact]
    public async Task InitiateOAuthFlowAsync_UnsupportedPlatform_ReturnsError()
    {
        // Arrange
        var unsupportedPlatform = "unsupported";
        var redirectUrl = "https://app.geoleap.com/auth/callback";

        // Act
        var result = await _service.InitiateOAuthFlowAsync(unsupportedPlatform, _testUserId, redirectUrl);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Contains("Unsupported platform", result.ErrorMessage);
    }

    [Fact]
    public async Task InitiateOAuthFlowAsync_WithCustomScopes_UsesCustomScopes()
    {
        // Arrange
        var redirectUrl = "https://app.geoleap.com/auth/callback";
        var customScopes = new[] { "email", "profile", "user_posts" };
        var mockProvider = new Mock<ISocialPlatformProvider>();

        string[]? capturedScopes = null;
        mockProvider
            .Setup(p => p.GenerateAuthorizationUrlAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string[]>()))
            .Callback<string, string, string[]>((url, state, scopes) => capturedScopes = scopes)
            .ReturnsAsync("https://facebook.com/oauth/authorize");

        _mockProviderFactory
            .Setup(f => f.GetProviderAsync(TestPlatform))
            .ReturnsAsync(mockProvider.Object);

        // Act
        var result = await _service.InitiateOAuthFlowAsync(TestPlatform, _testUserId, redirectUrl, customScopes);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.NotNull(capturedScopes);
        Assert.Equal(customScopes, capturedScopes);
    }

    #endregion

    #region OAuth Callback Tests

    [Fact]
    public async Task HandleCallbackAsync_ValidStateAndCode_ReturnsSuccess()
    {
        // Arrange
        var state = "test_state_123";
        var code = "auth_code_456";
        var redirectUrl = "https://app.geoleap.com/auth/callback";

        // Create valid OAuth state
        var oauthState = new OAuthState
        {
            StateValue = state,
            UserId = _testUserId,
            Platform = TestPlatform,
            RedirectUrl = redirectUrl,
            RequestedScopes = "public_profile,email",
            ExpiresAt = DateTime.UtcNow.AddMinutes(10),
            IsUsed = false
        };
        _context.OAuthStates.Add(oauthState);
        await _context.SaveChangesAsync();

        // Mock provider token exchange
        var mockProvider = new Mock<ISocialPlatformProvider>();
        var tokenResponse = new TokenExchangeResult
        {
            IsSuccess = true,
            Tokens = new OAuthTokens
            {
                AccessToken = "access_token_123",
                RefreshToken = "refresh_token_456",
                ExpiresIn = 3600,
                IssuedAt = DateTime.UtcNow
            },
            GrantedScopes = new[] { "public_profile", "email" }
        };

        var userProfile = new SocialProfile
        {
            Id = "social_123",
            Username = "testuser",
            DisplayName = "Test User",
            Email = "test@example.com"
        };

        mockProvider
            .Setup(p => p.ExchangeCodeForTokensAsync(code, redirectUrl))
            .ReturnsAsync(tokenResponse);
        mockProvider
            .Setup(p => p.GetUserProfileAsync(It.IsAny<string>(), It.IsAny<bool>()))
            .ReturnsAsync(userProfile);

        _mockProviderFactory
            .Setup(f => f.GetProviderAsync(TestPlatform))
            .ReturnsAsync(mockProvider.Object);

        _mockTokenService
            .Setup(t => t.StoreTokensAsync(TestPlatform, _testUserId, It.IsAny<OAuthTokens>()))
            .ReturnsAsync(new ServiceResult { IsSuccess = true });

        // Act
        var result = await _service.HandleCallbackAsync(TestPlatform, code, state, _testUserId);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.NotNull(result.UserInfo);
        Assert.Equal("social_123", result.UserInfo.Id);
        Assert.Equal("testuser", result.UserInfo.Username);

        // Verify OAuth state was marked as used
        var usedState = await _context.OAuthStates.FirstOrDefaultAsync(s => s.StateValue == state);
        Assert.NotNull(usedState);
        Assert.True(usedState.IsUsed);
        Assert.NotNull(usedState.UsedAt);

        // Verify social connection was created
        var connection = await _context.SocialConnections
            .FirstOrDefaultAsync(c => c.UserId == _testUserId && c.Platform == TestPlatform);
        Assert.NotNull(connection);
        Assert.Equal("social_123", connection.SocialUserId);
        Assert.Equal("testuser", connection.Username);
        Assert.True(connection.IsTokenValid);
    }

    [Fact]
    public async Task HandleCallbackAsync_InvalidState_ReturnsError()
    {
        // Arrange
        var invalidState = "invalid_state";
        var code = "auth_code";

        // Act
        var result = await _service.HandleCallbackAsync(TestPlatform, code, invalidState, _testUserId);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Contains("Invalid or expired OAuth state", result.ErrorMessage);
    }

    [Fact]
    public async Task HandleCallbackAsync_ExpiredState_ReturnsError()
    {
        // Arrange
        var state = "expired_state";
        var code = "auth_code";

        var expiredState = new OAuthState
        {
            StateValue = state,
            UserId = _testUserId,
            Platform = TestPlatform,
            RedirectUrl = "https://app.geoleap.com/auth/callback",
            RequestedScopes = "public_profile",
            ExpiresAt = DateTime.UtcNow.AddMinutes(-5), // Expired
            IsUsed = false
        };
        _context.OAuthStates.Add(expiredState);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.HandleCallbackAsync(TestPlatform, code, state, _testUserId);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Contains("Invalid or expired OAuth state", result.ErrorMessage);
    }

    #endregion

    #region Account Management Tests

    [Fact]
    public async Task DisconnectAccountAsync_ExistingConnection_RemovesConnection()
    {
        // Arrange
        var connection = new SocialConnection
        {
            UserId = _testUserId,
            Platform = TestPlatform,
            SocialUserId = "social_123",
            Username = "testuser",
            ConnectedAt = DateTime.UtcNow
        };
        _context.SocialConnections.Add(connection);
        await _context.SaveChangesAsync();

        _mockTokenService
            .Setup(t => t.RevokeTokensAsync(TestPlatform, _testUserId))
            .ReturnsAsync(new ServiceResult { IsSuccess = true });

        // Act
        var result = await _service.DisconnectAccountAsync(TestPlatform, _testUserId);

        // Assert
        Assert.True(result.IsSuccess);

        var removedConnection = await _context.SocialConnections
            .FirstOrDefaultAsync(c => c.UserId == _testUserId && c.Platform == TestPlatform);
        Assert.Null(removedConnection);
    }

    [Fact]
    public async Task DisconnectAccountAsync_NonExistentConnection_ReturnsError()
    {
        // Act
        var result = await _service.DisconnectAccountAsync(TestPlatform, _testUserId);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Contains("connection not found", result.ErrorMessage);
    }

    [Fact]
    public async Task DisconnectAccountAsync_WithPrivacyPreferences_RemovesSocialData()
    {
        // Arrange
        var connection = new SocialConnection
        {
            UserId = _testUserId,
            Platform = TestPlatform,
            SocialUserId = "social_123"
        };
        _context.SocialConnections.Add(connection);

        // Add social activities
        _context.SocialActivities.Add(new SocialActivity
        {
            UserId = _testUserId,
            Platform = TestPlatform,
            ActivityType = "Post"
        });

        // Add privacy consent that disallows data collection
        _context.SocialPrivacyConsents.Add(new SocialPrivacyConsent
        {
            UserId = _testUserId,
            AllowSocialDataCollection = false
        });

        await _context.SaveChangesAsync();

        _mockTokenService
            .Setup(t => t.RevokeTokensAsync(TestPlatform, _testUserId))
            .ReturnsAsync(new ServiceResult { IsSuccess = true });

        // Act
        var result = await _service.DisconnectAccountAsync(TestPlatform, _testUserId);

        // Assert
        Assert.True(result.IsSuccess);

        var activities = await _context.SocialActivities
            .Where(a => a.UserId == _testUserId && a.Platform == TestPlatform)
            .ToListAsync();
        Assert.Empty(activities);
    }

    [Fact]
    public async Task GetConnectedAccountsAsync_ReturnsUserConnections()
    {
        // Arrange
        _context.SocialConnections.AddRange(
            new SocialConnection { UserId = _testUserId, Platform = "facebook", SocialUserId = "fb_123" },
            new SocialConnection { UserId = _testUserId, Platform = "twitter", SocialUserId = "tw_456" },
            new SocialConnection { UserId = Guid.NewGuid(), Platform = "facebook", SocialUserId = "fb_789" }
        );
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetConnectedAccountsAsync(_testUserId);

        // Assert
        Assert.Equal(2, result.Count);
        Assert.All(result, c => Assert.Equal(_testUserId, c.UserId));
    }

    #endregion

    #region Social Platform Tests

    [Fact]
    public async Task GetAvailablePlatformsAsync_ReturnsEnabledPlatforms()
    {
        // Act
        var result = await _service.GetAvailablePlatformsAsync();

        // Assert
        Assert.NotEmpty(result);
        Assert.All(result, p => Assert.True(p.IsEnabled));
        Assert.Contains(result, p => p.Name == "facebook");
        Assert.Contains(result, p => p.Name == "twitter");
    }

    [Fact]
    public async Task PostToSocialMediaAsync_PlatformSupportsPosting_ReturnsSuccess()
    {
        // Arrange
        var postRequest = new SocialPostRequest
        {
            Content = "Check out this amazing content!",
            Hashtags = new[] { "streaming", "geoleap" }
        };

        var mockProvider = new Mock<ISocialPlatformProvider>();
        mockProvider
            .Setup(p => p.PostContentAsync(It.IsAny<string>(), postRequest))
            .ReturnsAsync(new SocialPostResult
            {
                IsSuccess = true,
                PostId = "post_123",
                PostUrl = "https://facebook.com/posts/123"
            });

        _mockProviderFactory
            .Setup(f => f.GetProviderAsync(TestPlatform))
            .ReturnsAsync(mockProvider.Object);

        _mockTokenService
            .Setup(t => t.GetTokensAsync(TestPlatform, _testUserId))
            .ReturnsAsync(new OAuthTokens { AccessToken = "token_123" });

        // Act
        var result = await _service.PostToSocialMediaAsync(TestPlatform, _testUserId, postRequest);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Equal("post_123", result.PostId);

        // Verify activity was tracked
        var activity = await _context.SocialActivities
            .FirstOrDefaultAsync(a => a.UserId == _testUserId && a.ActivityType == "Post");
        Assert.NotNull(activity);
    }

    [Fact]
    public async Task PostToSocialMediaAsync_PlatformDoesNotSupportPosting_ReturnsError()
    {
        // Arrange
        var platform = "tiktok"; // TikTok doesn't support posting in the implementation
        var postRequest = new SocialPostRequest { Content = "Test post" };

        // Act
        var result = await _service.PostToSocialMediaAsync(platform, _testUserId, postRequest);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Contains("does not support posting", result.ErrorMessage);
    }

    #endregion

    #region Social Preferences Tests

    [Fact]
    public async Task UpdateSocialPreferencesAsync_CreatesNewPreferences()
    {
        // Arrange
        var request = new UpdateSocialPreferencesRequest
        {
            AllowSocialSharing = true,
            AllowRecommendations = true,
            AllowActivityTracking = false,
            AllowFriendDiscovery = true,
            PreferredPlatforms = new[] { "facebook", "twitter" }
        };

        // Act
        var result = await _service.UpdateSocialPreferencesAsync(_testUserId, request);

        // Assert
        Assert.True(result.AllowSocialSharing);
        Assert.True(result.AllowRecommendations);
        Assert.False(result.AllowActivityTracking);

        var saved = await _context.SocialSharingPreferences
            .FirstOrDefaultAsync(p => p.UserId == _testUserId);
        Assert.NotNull(saved);
        Assert.True(saved.AllowSocialSharing);
    }

    [Fact]
    public async Task UpdateSocialPreferencesAsync_UpdatesExistingPreferences()
    {
        // Arrange
        var existing = new SocialSharingPreferences
        {
            UserId = _testUserId,
            AllowSocialSharing = false,
            EnableViralIncentives = false
        };
        _context.SocialSharingPreferences.Add(existing);
        await _context.SaveChangesAsync();

        var request = new UpdateSocialPreferencesRequest
        {
            AllowSocialSharing = true,
            AllowRecommendations = true,
            AllowActivityTracking = true,
            AllowFriendDiscovery = false
        };

        // Act
        var result = await _service.UpdateSocialPreferencesAsync(_testUserId, request);

        // Assert
        Assert.True(result.AllowSocialSharing);
        Assert.True(result.AllowRecommendations);

        var updated = await _context.SocialSharingPreferences
            .FirstOrDefaultAsync(p => p.UserId == _testUserId);
        Assert.NotNull(updated);
        Assert.True(updated.AllowSocialSharing);
        Assert.True(updated.EnableViralIncentives);
    }

    #endregion

    #region Analytics Tests

    [Fact]
    public async Task GetSocialAnalyticsAsync_ReturnsActivitySummary()
    {
        // Arrange
        var startDate = DateTime.UtcNow.AddDays(-30);

        _context.SocialConnections.AddRange(
            new SocialConnection { UserId = _testUserId, Platform = "facebook" },
            new SocialConnection { UserId = _testUserId, Platform = "twitter" }
        );

        _context.SocialActivities.AddRange(
            new SocialActivity
            {
                UserId = _testUserId,
                Platform = "facebook",
                ActivityType = "Post",
                CreatedAt = DateTime.UtcNow.AddDays(-5)
            },
            new SocialActivity
            {
                UserId = _testUserId,
                Platform = "facebook",
                ActivityType = "Share",
                CreatedAt = DateTime.UtcNow.AddDays(-3)
            },
            new SocialActivity
            {
                UserId = _testUserId,
                Platform = "twitter",
                ActivityType = "Post",
                CreatedAt = DateTime.UtcNow.AddDays(-1)
            }
        );

        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetSocialAnalyticsAsync(_testUserId, startDate);

        // Assert
        Assert.Equal(2, result.TotalConnections);
        Assert.Equal(2, result.TotalPosts);
        Assert.Equal(3, result.TotalInteractions);
        Assert.Equal(2, result.PlatformBreakdown.Count);
        Assert.Equal(2, result.PlatformBreakdown["facebook"]);
        Assert.Equal(1, result.PlatformBreakdown["twitter"]);
    }

    #endregion

    #region Privacy Tests

    [Fact]
    public async Task GetPrivacyConsentAsync_NoExistingConsent_CreatesDefaultGdprCompliant()
    {
        // Act
        var result = await _service.GetPrivacyConsentAsync(_testUserId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(_testUserId, result.UserId);
        Assert.False(result.AllowSocialDataCollection); // GDPR compliant - opt-in
        Assert.False(result.AllowFriendDiscovery);
        Assert.False(result.AllowSocialRecommendations);
        Assert.True(result.IsGdprCompliant);
    }

    [Fact]
    public async Task UpdatePrivacyConsentAsync_UpdatesExistingConsent()
    {
        // Arrange
        var existing = await _service.GetPrivacyConsentAsync(_testUserId);
        existing.AllowSocialDataCollection = true;
        existing.AllowFriendDiscovery = true;

        // Act
        await _service.UpdatePrivacyConsentAsync(_testUserId, existing);

        // Assert
        var updated = await _context.SocialPrivacyConsents
            .FirstOrDefaultAsync(c => c.UserId == _testUserId);
        Assert.NotNull(updated);
        Assert.True(updated.AllowSocialDataCollection);
        Assert.True(updated.AllowFriendDiscovery);
    }

    [Fact]
    public async Task ImportSocialConnectionsAsync_WithoutConsent_ReturnsError()
    {
        // Arrange
        var consent = new SocialPrivacyConsent
        {
            UserId = _testUserId,
            AllowFriendDiscovery = false
        };
        _context.SocialPrivacyConsents.Add(consent);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.ImportSocialConnectionsAsync(TestPlatform, _testUserId, respectPrivacy: true);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Contains("not consented to friend discovery", result.ErrorMessage);
    }

    #endregion

    #region Token Validation Tests

    [Fact]
    public async Task ValidateAndRefreshTokensAsync_ValidTokens_ReturnsValid()
    {
        // Arrange
        _mockTokenService
            .Setup(t => t.ValidateTokensAsync(TestPlatform, _testUserId))
            .ReturnsAsync(true);

        _mockTokenService
            .Setup(t => t.GetTokenExpiryAsync(TestPlatform, _testUserId))
            .ReturnsAsync(new TokenExpiryInfo { ExpiresAt = DateTime.UtcNow.AddHours(1) });

        // Act
        var result = await _service.ValidateAndRefreshTokensAsync(TestPlatform, _testUserId);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.True(result.IsValid);
        Assert.False(result.WasRefreshed);
        Assert.NotNull(result.ExpiresAt);
    }

    [Fact]
    public async Task ValidateAndRefreshTokensAsync_InvalidTokens_RefreshesTokens()
    {
        // Arrange
        _mockTokenService
            .Setup(t => t.ValidateTokensAsync(TestPlatform, _testUserId))
            .ReturnsAsync(false);

        _mockTokenService
            .Setup(t => t.RefreshTokensAsync(TestPlatform, _testUserId))
            .ReturnsAsync(new TokenRefreshResult
            {
                IsSuccess = true,
                ExpiresAt = DateTime.UtcNow.AddHours(1)
            });

        // Act
        var result = await _service.ValidateAndRefreshTokensAsync(TestPlatform, _testUserId);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.True(result.IsValid);
        Assert.True(result.WasRefreshed);
    }

    #endregion
}
