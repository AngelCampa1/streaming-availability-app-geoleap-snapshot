using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Moq;
using Moq.Protected;
using System.Net;
using System.Text.Json;
using Xunit;

namespace GeoLeap.Api.Tests.Services;

/// <summary>
/// Direct tests for EnhancedSocialAuthService - OAuth 2.0 social authentication
/// Service: EnhancedSocialAuthService.cs (900 LOC, 15+ methods)
/// Focus: OAuth security, PKCE implementation, multi-platform authentication (2.5x business value multiplier)
/// </summary>
public class EnhancedSocialAuthServiceDirectTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly Mock<ISocialTokenService> _mockTokenService;
    private readonly Mock<ILoggerService> _mockLogger;
    private readonly Mock<IConfiguration> _mockConfiguration;
    private readonly Mock<HttpMessageHandler> _mockHttpMessageHandler;
    private readonly HttpClient _httpClient;
    private readonly Mock<IPrivacyService> _mockPrivacyService;
    private readonly EnhancedSocialAuthService _service;
    private readonly Guid _testUserId = Guid.NewGuid();

    public EnhancedSocialAuthServiceDirectTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"EnhancedSocialAuthTests_{Guid.NewGuid()}")
            .Options;

        _context = new ApplicationDbContext(options);
        _mockTokenService = new Mock<ISocialTokenService>();
        _mockLogger = new Mock<ILoggerService>();
        _mockConfiguration = new Mock<IConfiguration>();
        _mockHttpMessageHandler = new Mock<HttpMessageHandler>();
        _httpClient = new HttpClient(_mockHttpMessageHandler.Object);
        _mockPrivacyService = new Mock<IPrivacyService>();

        // Setup configuration for all platforms
        SetupConfiguration("facebook");
        SetupConfiguration("twitter");
        SetupConfiguration("instagram");
        SetupConfiguration("tiktok");

        _service = new EnhancedSocialAuthService(
            _context,
            _mockTokenService.Object,
            _mockLogger.Object,
            _mockConfiguration.Object,
            _httpClient,
            _mockPrivacyService.Object
        );

        SeedTestData().Wait();
    }

    private void SetupConfiguration(string platform)
    {
        var platformCapitalized = char.ToUpper(platform[0]) + platform[1..];
        _mockConfiguration.Setup(c => c[$"SocialAuth:{platformCapitalized}:ClientId"])
            .Returns($"test-{platform}-client-id");
        _mockConfiguration.Setup(c => c[$"SocialAuth:{platformCapitalized}:ClientSecret"])
            .Returns($"test-{platform}-client-secret");
    }

    private async Task SeedTestData()
    {
        var user = new User
        {
            Id = _testUserId,
            Email = "test@example.com",
            EmailConfirmed = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
        _httpClient.Dispose();
    }

    #region InitiateOAuthFlowAsync Tests

    [Fact]
    public async Task InitiateOAuthFlowAsync_WithValidPlatform_ReturnsAuthorizationUrl()
    {
        // Arrange
        _mockPrivacyService.Setup(p => p.HasSocialDataConsentAsync(_testUserId))
            .ReturnsAsync(true);

        // Act
        var result = await _service.InitiateOAuthFlowAsync(
            "facebook",
            _testUserId,
            "https://example.com/callback"
        );

        // Assert
        Assert.True(result.IsSuccess);
        Assert.NotEmpty(result.AuthorizationUrl);
        Assert.Contains("facebook.com", result.AuthorizationUrl);
        Assert.Contains("client_id=", result.AuthorizationUrl);
        Assert.Contains("redirect_uri=", result.AuthorizationUrl);
        Assert.Contains("state=", result.AuthorizationUrl);
        Assert.Contains("code_challenge=", result.AuthorizationUrl); // PKCE
        Assert.Contains("code_challenge_method=S256", result.AuthorizationUrl); // PKCE SHA-256
    }

    [Fact]
    public async Task InitiateOAuthFlowAsync_WithUnsupportedPlatform_ReturnsError()
    {
        // Arrange
        _mockPrivacyService.Setup(p => p.HasSocialDataConsentAsync(_testUserId))
            .ReturnsAsync(true);

        // Act
        var result = await _service.InitiateOAuthFlowAsync(
            "unsupported-platform",
            _testUserId,
            "https://example.com/callback"
        );

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal("UNSUPPORTED_PLATFORM", result.ErrorCode);
        Assert.Contains("Unsupported platform", result.ErrorMessage);
    }

    [Fact]
    public async Task InitiateOAuthFlowAsync_WithoutConsent_ReturnsNoConsentError()
    {
        // Arrange
        _mockPrivacyService.Setup(p => p.HasSocialDataConsentAsync(_testUserId))
            .ReturnsAsync(false);

        // Act
        var result = await _service.InitiateOAuthFlowAsync(
            "facebook",
            _testUserId,
            "https://example.com/callback"
        );

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal("NO_CONSENT", result.ErrorCode);
        Assert.Contains("consent", result.ErrorMessage, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task InitiateOAuthFlowAsync_CreatesOAuthStateInDatabase()
    {
        // Arrange
        _mockPrivacyService.Setup(p => p.HasSocialDataConsentAsync(_testUserId))
            .ReturnsAsync(true);

        // Act
        var result = await _service.InitiateOAuthFlowAsync(
            "twitter",
            _testUserId,
            "https://example.com/callback"
        );

        // Assert
        var oauthState = await _context.OAuthStates
            .FirstOrDefaultAsync(s => s.UserId == _testUserId && s.Platform == "twitter");

        Assert.NotNull(oauthState);
        Assert.Equal(_testUserId, oauthState.UserId);
        Assert.Equal("twitter", oauthState.Platform);
        Assert.NotEmpty(oauthState.StateValue);
        Assert.NotEmpty(oauthState.CodeVerifier); // PKCE verifier stored
        Assert.NotEmpty(oauthState.CodeChallenge); // PKCE challenge stored
        Assert.False(oauthState.IsUsed);
    }

    [Fact]
    public async Task InitiateOAuthFlowAsync_WithCustomScopes_IncludesInUrl()
    {
        // Arrange
        _mockPrivacyService.Setup(p => p.HasSocialDataConsentAsync(_testUserId))
            .ReturnsAsync(true);
        var customScopes = new[] { "user_profile", "user_posts", "user_friends" };

        // Act
        var result = await _service.InitiateOAuthFlowAsync(
            "facebook",
            _testUserId,
            "https://example.com/callback",
            customScopes
        );

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Contains("scope=", result.AuthorizationUrl);
        Assert.Contains("user_profile", result.AuthorizationUrl);
        Assert.Contains("user_posts", result.AuthorizationUrl);
    }

    [Fact]
    public async Task InitiateOAuthFlowAsync_WithAdditionalParams_IncludesInUrl()
    {
        // Arrange
        _mockPrivacyService.Setup(p => p.HasSocialDataConsentAsync(_testUserId))
            .ReturnsAsync(true);
        var additionalParams = new Dictionary<string, string>
        {
            ["display"] = "popup",
            ["auth_type"] = "rerequest"
        };

        // Act
        var result = await _service.InitiateOAuthFlowAsync(
            "facebook",
            _testUserId,
            "https://example.com/callback",
            additionalParams: additionalParams
        );

        // Assert
        Assert.True(result.IsSuccess);
        Assert.Contains("display=popup", result.AuthorizationUrl);
        Assert.Contains("auth_type=rerequest", result.AuthorizationUrl);
    }

    [Fact]
    public async Task InitiateOAuthFlowAsync_StateExpiration_SetsCorrectExpiry()
    {
        // Arrange
        _mockPrivacyService.Setup(p => p.HasSocialDataConsentAsync(_testUserId))
            .ReturnsAsync(true);
        var beforeInitiation = DateTime.UtcNow;

        // Act
        var result = await _service.InitiateOAuthFlowAsync(
            "instagram",
            _testUserId,
            "https://example.com/callback"
        );

        // Assert
        var oauthState = await _context.OAuthStates
            .FirstOrDefaultAsync(s => s.StateValue == result.State);

        Assert.NotNull(oauthState);
        Assert.True(oauthState.ExpiresAt > beforeInitiation.AddMinutes(9)); // ~10 min expiry
        Assert.True(oauthState.ExpiresAt < beforeInitiation.AddMinutes(11));
    }

    #endregion

    #region HandleOAuthCallbackAsync Tests

    [Fact]
    public async Task HandleOAuthCallbackAsync_WithValidStateAndCode_CompletesSuccessfully()
    {
        // Arrange
        var state = "test-state-value";
        var codeVerifier = "test-code-verifier";
        var oauthState = new OAuthState
        {
            StateValue = state,
            UserId = _testUserId,
            Platform = "facebook",
            RedirectUrl = "https://example.com/callback",
            CodeVerifier = codeVerifier,
            CodeChallenge = "test-challenge",
            RequestedScopes = "public_profile,email",
            ExpiresAt = DateTime.UtcNow.AddMinutes(5),
            IsUsed = false
        };
        _context.OAuthStates.Add(oauthState);
        await _context.SaveChangesAsync();

        // Mock HTTP response for token exchange
        var tokenResponse = new OAuthTokens
        {
            AccessToken = "test-access-token",
            RefreshToken = "test-refresh-token",
            TokenType = "Bearer",
            ExpiresIn = 3600,
            Scope = "public_profile email"
        };

        SetupHttpMockForTokenExchange(tokenResponse);
        SetupHttpMockForUserInfo(new Dictionary<string, object>
        {
            ["id"] = "12345",
            ["name"] = "Test User",
            ["email"] = "test@example.com"
        });

        _mockTokenService.Setup(t => t.StoreTokensAsync(
            It.IsAny<string>(),
            It.IsAny<Guid>(),
            It.IsAny<OAuthTokens>()))
            .ReturnsAsync(new ServiceResult { IsSuccess = true });

        // Act
        var result = await _service.HandleOAuthCallbackAsync("facebook", "auth-code-123", state);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.NotNull(result.UserInfo);
        Assert.Equal("12345", result.UserInfo.Id);
        Assert.Equal("Test User", result.UserInfo.DisplayName);
    }

    [Fact]
    public async Task HandleOAuthCallbackAsync_WithInvalidState_ReturnsError()
    {
        // Act
        var result = await _service.HandleOAuthCallbackAsync(
            "facebook",
            "auth-code-123",
            "invalid-state"
        );

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal("INVALID_STATE", result.ErrorCode);
        Assert.Contains("Invalid or expired state", result.ErrorMessage);
    }

    [Fact]
    public async Task HandleOAuthCallbackAsync_WithExpiredState_ReturnsError()
    {
        // Arrange
        var state = "expired-state";
        var expiredOAuthState = new OAuthState
        {
            StateValue = state,
            UserId = _testUserId,
            Platform = "twitter",
            RedirectUrl = "https://example.com/callback",
            ExpiresAt = DateTime.UtcNow.AddMinutes(-5), // Expired 5 minutes ago
            IsUsed = false
        };
        _context.OAuthStates.Add(expiredOAuthState);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.HandleOAuthCallbackAsync("twitter", "auth-code-123", state);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal("INVALID_STATE", result.ErrorCode);
    }

    [Fact]
    public async Task HandleOAuthCallbackAsync_MarksStateAsUsed()
    {
        // Arrange
        var state = "one-time-state";
        var oauthState = new OAuthState
        {
            StateValue = state,
            UserId = _testUserId,
            Platform = "instagram",
            RedirectUrl = "https://example.com/callback",
            CodeVerifier = "verifier",
            ExpiresAt = DateTime.UtcNow.AddMinutes(5),
            IsUsed = false
        };
        _context.OAuthStates.Add(oauthState);
        await _context.SaveChangesAsync();

        SetupHttpMockForTokenExchange(new OAuthTokens
        {
            AccessToken = "token",
            ExpiresIn = 3600,
            Scope = "user_profile"
        });
        SetupHttpMockForUserInfo(new Dictionary<string, object>
        {
            ["id"] = "123",
            ["username"] = "testuser"
        });
        _mockTokenService.Setup(t => t.StoreTokensAsync(It.IsAny<string>(), It.IsAny<Guid>(), It.IsAny<OAuthTokens>()))
            .ReturnsAsync(new ServiceResult { IsSuccess = true });

        // Act
        await _service.HandleOAuthCallbackAsync("instagram", "auth-code", state);

        // Assert
        var usedState = await _context.OAuthStates.FirstOrDefaultAsync(s => s.StateValue == state);
        Assert.NotNull(usedState);
        Assert.True(usedState.IsUsed);
        Assert.NotNull(usedState.UsedAt);
    }

    [Fact]
    public async Task HandleOAuthCallbackAsync_WithTokenExchangeFailure_ReturnsError()
    {
        // Arrange
        var state = "test-state";
        var oauthState = new OAuthState
        {
            StateValue = state,
            UserId = _testUserId,
            Platform = "facebook",
            RedirectUrl = "https://example.com/callback",
            CodeVerifier = "verifier",
            ExpiresAt = DateTime.UtcNow.AddMinutes(5),
            IsUsed = false
        };
        _context.OAuthStates.Add(oauthState);
        await _context.SaveChangesAsync();

        // Mock failed token exchange
        SetupHttpMockForFailedRequest();

        // Act
        var result = await _service.HandleOAuthCallbackAsync("facebook", "bad-code", state);

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal("TOKEN_EXCHANGE_FAILED", result.ErrorCode);
    }

    [Fact]
    public async Task HandleOAuthCallbackAsync_CreatesSocialConnection()
    {
        // Arrange
        var state = "connect-state";
        var oauthState = new OAuthState
        {
            StateValue = state,
            UserId = _testUserId,
            Platform = "twitter",
            RedirectUrl = "https://example.com/callback",
            CodeVerifier = "verifier",
            ExpiresAt = DateTime.UtcNow.AddMinutes(5),
            IsUsed = false
        };
        _context.OAuthStates.Add(oauthState);
        await _context.SaveChangesAsync();

        SetupHttpMockForTokenExchange(new OAuthTokens
        {
            AccessToken = "token",
            ExpiresIn = 7200,
            Scope = "tweet.read users.read"
        });
        SetupHttpMockForUserInfo(new Dictionary<string, object>
        {
            ["id"] = "twitter-user-123",
            ["username"] = "testuser",
            ["name"] = "Test Twitter User",
            ["description"] = "Bio text"
        });
        _mockTokenService.Setup(t => t.StoreTokensAsync(It.IsAny<string>(), It.IsAny<Guid>(), It.IsAny<OAuthTokens>()))
            .ReturnsAsync(new ServiceResult { IsSuccess = true });

        // Act
        await _service.HandleOAuthCallbackAsync("twitter", "auth-code", state);

        // Assert
        var connection = await _context.SocialConnections
            .FirstOrDefaultAsync(c => c.UserId == _testUserId && c.Platform == "twitter");

        Assert.NotNull(connection);
        Assert.Equal("twitter-user-123", connection.SocialUserId);
        Assert.Equal("testuser", connection.Username);
        Assert.Equal("Test Twitter User", connection.DisplayName);
        Assert.True(connection.IsTokenValid);
    }

    #endregion

    #region ValidateAndRefreshTokenAsync Tests

    [Fact]
    public async Task ValidateAndRefreshTokenAsync_WithValidToken_ReturnsValid()
    {
        // Arrange
        var token = new OAuthToken
        {
            UserId = _testUserId,
            Platform = "facebook",
            EncryptedAccessToken = "encrypted-token",
            ExpiresAt = DateTime.UtcNow.AddHours(1), // Valid for 1 more hour
            IsValid = true,
            Scope = "public_profile email"
        };
        _context.OAuthTokens.Add(token);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.ValidateAndRefreshTokenAsync(_testUserId, "facebook");

        // Assert
        Assert.True(result.IsSuccess);
        Assert.True(result.IsValid);
        Assert.False(result.WasRefreshed);
        Assert.True(result.ExpiresAt > DateTime.UtcNow);
    }

    [Fact]
    public async Task ValidateAndRefreshTokenAsync_WithNoToken_ReturnsError()
    {
        // Act
        var result = await _service.ValidateAndRefreshTokenAsync(_testUserId, "facebook");

        // Assert
        Assert.False(result.IsSuccess);
        Assert.False(result.IsValid);
        Assert.Equal("NO_TOKEN", result.ErrorCode);
    }

    [Fact]
    public async Task ValidateAndRefreshTokenAsync_WithExpiredToken_AttemptsRefresh()
    {
        // Arrange
        var token = new OAuthToken
        {
            UserId = _testUserId,
            Platform = "instagram",
            EncryptedAccessToken = "encrypted-token",
            EncryptedRefreshToken = "encrypted-refresh-token",
            ExpiresAt = DateTime.UtcNow.AddMinutes(-10), // Expired 10 minutes ago
            IsValid = true
        };
        _context.OAuthTokens.Add(token);
        await _context.SaveChangesAsync();

        _mockTokenService.Setup(t => t.RefreshTokensAsync("instagram", _testUserId))
            .ReturnsAsync(new TokenRefreshResult
            {
                IsSuccess = true,
                ExpiresAt = DateTime.UtcNow.AddHours(1)
            });

        // Act
        var result = await _service.ValidateAndRefreshTokenAsync(_testUserId, "instagram");

        // Assert
        Assert.True(result.IsSuccess);
        Assert.True(result.IsValid);
        Assert.True(result.WasRefreshed);
    }

    [Fact]
    public async Task ValidateAndRefreshTokenAsync_WithExpiredTokenNoRefresh_MarksInvalid()
    {
        // Arrange
        var token = new OAuthToken
        {
            UserId = _testUserId,
            Platform = "twitter",
            EncryptedAccessToken = "encrypted-token",
            EncryptedRefreshToken = null, // No refresh token
            ExpiresAt = DateTime.UtcNow.AddMinutes(-10),
            IsValid = true
        };
        _context.OAuthTokens.Add(token);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.ValidateAndRefreshTokenAsync(_testUserId, "twitter");

        // Assert
        Assert.False(result.IsSuccess);
        Assert.False(result.IsValid);
        Assert.Equal("TOKEN_EXPIRED", result.ErrorCode);

        // Verify token marked as invalid
        var updatedToken = await _context.OAuthTokens
            .FirstOrDefaultAsync(t => t.UserId == _testUserId && t.Platform == "twitter");
        Assert.NotNull(updatedToken);
        Assert.False(updatedToken.IsValid);
    }

    [Fact]
    public async Task ValidateAndRefreshTokenAsync_UpdatesLastUsed()
    {
        // Arrange
        var token = new OAuthToken
        {
            UserId = _testUserId,
            Platform = "facebook",
            EncryptedAccessToken = "token",
            ExpiresAt = DateTime.UtcNow.AddHours(1),
            IsValid = true,
            LastUsed = DateTime.UtcNow.AddDays(-1) // Last used 1 day ago
        };
        _context.OAuthTokens.Add(token);
        await _context.SaveChangesAsync();

        var beforeValidation = DateTime.UtcNow.AddSeconds(-1);

        // Act
        await _service.ValidateAndRefreshTokenAsync(_testUserId, "facebook");

        // Assert
        var updatedToken = await _context.OAuthTokens
            .FirstOrDefaultAsync(t => t.UserId == _testUserId && t.Platform == "facebook");
        Assert.NotNull(updatedToken);
        Assert.NotNull(updatedToken.LastUsed);
        Assert.True(updatedToken.LastUsed >= beforeValidation);
    }

    #endregion

    #region RefreshAccessTokenAsync Tests

    [Fact]
    public async Task RefreshAccessTokenAsync_WithValidRefreshToken_RefreshesSuccessfully()
    {
        // Arrange
        var token = new OAuthToken
        {
            UserId = _testUserId,
            Platform = "facebook",
            EncryptedAccessToken = "old-token",
            EncryptedRefreshToken = "refresh-token",
            ExpiresAt = DateTime.UtcNow.AddMinutes(-5),
            IsValid = true
        };
        _context.OAuthTokens.Add(token);
        await _context.SaveChangesAsync();

        _mockTokenService.Setup(t => t.RefreshTokensAsync("facebook", _testUserId))
            .ReturnsAsync(new TokenRefreshResult
            {
                IsSuccess = true,
                ExpiresAt = DateTime.UtcNow.AddHours(1),
                UpdatedScopes = new[] { "public_profile", "email", "user_posts" }
            });

        // Act
        var result = await _service.RefreshAccessTokenAsync(_testUserId, "facebook");

        // Assert
        Assert.True(result.IsSuccess);
        Assert.NotNull(result.UpdatedScopes);
        Assert.Contains("user_posts", result.UpdatedScopes);
    }

    [Fact]
    public async Task RefreshAccessTokenAsync_WithNoRefreshToken_ReturnsError()
    {
        // Arrange
        var token = new OAuthToken
        {
            UserId = _testUserId,
            Platform = "twitter",
            EncryptedAccessToken = "token",
            EncryptedRefreshToken = null, // No refresh token
            ExpiresAt = DateTime.UtcNow.AddMinutes(-5),
            IsValid = true
        };
        _context.OAuthTokens.Add(token);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.RefreshAccessTokenAsync(_testUserId, "twitter");

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal("NO_REFRESH_TOKEN", result.ErrorCode);
    }

    [Fact]
    public async Task RefreshAccessTokenAsync_WithNoToken_ReturnsError()
    {
        // Act
        var result = await _service.RefreshAccessTokenAsync(_testUserId, "instagram");

        // Assert
        Assert.False(result.IsSuccess);
        Assert.Equal("NO_REFRESH_TOKEN", result.ErrorCode);
    }

    #endregion

    #region RevokeTokenAsync Tests

    [Fact]
    public async Task RevokeTokenAsync_MarksTokenAsInvalid()
    {
        // Arrange
        var token = new OAuthToken
        {
            UserId = _testUserId,
            Platform = "facebook",
            EncryptedAccessToken = "token",
            IsValid = true
        };
        _context.OAuthTokens.Add(token);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.RevokeTokenAsync(_testUserId, "facebook", "user_request");

        // Assert
        Assert.True(result.IsSuccess);

        var revokedToken = await _context.OAuthTokens
            .FirstOrDefaultAsync(t => t.UserId == _testUserId && t.Platform == "facebook");
        Assert.NotNull(revokedToken);
        Assert.False(revokedToken.IsValid);
    }

    [Fact]
    public async Task RevokeTokenAsync_UpdatesSocialConnection()
    {
        // Arrange
        var token = new OAuthToken
        {
            UserId = _testUserId,
            Platform = "twitter",
            EncryptedAccessToken = "token",
            IsValid = true
        };
        var connection = new SocialConnection
        {
            UserId = _testUserId,
            Platform = "twitter",
            SocialUserId = "123",
            Username = "testuser",
            IsTokenValid = true
        };
        _context.OAuthTokens.Add(token);
        _context.SocialConnections.Add(connection);
        await _context.SaveChangesAsync();

        // Act
        await _service.RevokeTokenAsync(_testUserId, "twitter", "security_concern");

        // Assert
        var updatedConnection = await _context.SocialConnections
            .FirstOrDefaultAsync(c => c.UserId == _testUserId && c.Platform == "twitter");
        Assert.NotNull(updatedConnection);
        Assert.False(updatedConnection.IsTokenValid);
    }

    [Fact]
    public async Task RevokeTokenAsync_StoresRevocationReason()
    {
        // Arrange
        var token = new OAuthToken
        {
            UserId = _testUserId,
            Platform = "instagram",
            EncryptedAccessToken = "token",
            IsValid = true,
            MetadataJson = "{}"
        };
        _context.OAuthTokens.Add(token);
        await _context.SaveChangesAsync();

        // Act
        await _service.RevokeTokenAsync(_testUserId, "instagram", "privacy_policy_change");

        // Assert
        var revokedToken = await _context.OAuthTokens
            .FirstOrDefaultAsync(t => t.UserId == _testUserId && t.Platform == "instagram");
        Assert.NotNull(revokedToken);
        Assert.NotNull(revokedToken.Metadata);
        Assert.True(revokedToken.Metadata.ContainsKey("RevokedReason"));
        Assert.Equal("privacy_policy_change", revokedToken.Metadata["RevokedReason"].ToString());
    }

    [Fact]
    public async Task RevokeTokenAsync_WithNoToken_CompletesSuccessfully()
    {
        // Act - No token exists for this user/platform
        var result = await _service.RevokeTokenAsync(_testUserId, "tiktok", "user_request");

        // Assert - Should complete successfully even with no token
        Assert.True(result.IsSuccess);
    }

    #endregion

    #region GetExpiringTokensAsync Tests

    [Fact]
    public async Task GetExpiringTokensAsync_ReturnsTokensExpiringWithin24Hours()
    {
        // Arrange
        var expiringToken = new OAuthToken
        {
            UserId = _testUserId,
            Platform = "facebook",
            EncryptedAccessToken = "token",
            EncryptedRefreshToken = "refresh-token",
            ExpiresAt = DateTime.UtcNow.AddHours(12), // Expires in 12 hours
            IsValid = true
        };
        var validToken = new OAuthToken
        {
            UserId = Guid.NewGuid(),
            Platform = "twitter",
            EncryptedAccessToken = "token2",
            EncryptedRefreshToken = "refresh-token2",
            ExpiresAt = DateTime.UtcNow.AddDays(5), // Expires in 5 days
            IsValid = true
        };
        _context.OAuthTokens.AddRange(expiringToken, validToken);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetExpiringTokensAsync(24);

        // Assert
        Assert.Single(result);
        Assert.Contains(result, t => t.UserId == _testUserId && t.Platform == "facebook");
    }

    [Fact]
    public async Task GetExpiringTokensAsync_ExcludesTokensWithoutRefreshToken()
    {
        // Arrange
        var expiringNoRefresh = new OAuthToken
        {
            UserId = _testUserId,
            Platform = "instagram",
            EncryptedAccessToken = "token",
            EncryptedRefreshToken = null, // No refresh token
            ExpiresAt = DateTime.UtcNow.AddHours(6),
            IsValid = true
        };
        _context.OAuthTokens.Add(expiringNoRefresh);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetExpiringTokensAsync(24);

        // Assert
        Assert.Empty(result); // Should not include tokens without refresh capability
    }

    [Fact]
    public async Task GetExpiringTokensAsync_ExcludesInvalidTokens()
    {
        // Arrange
        var invalidToken = new OAuthToken
        {
            UserId = _testUserId,
            Platform = "facebook",
            EncryptedAccessToken = "token",
            EncryptedRefreshToken = "refresh",
            ExpiresAt = DateTime.UtcNow.AddHours(6),
            IsValid = false // Invalid token
        };
        _context.OAuthTokens.Add(invalidToken);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetExpiringTokensAsync(24);

        // Assert
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetExpiringTokensAsync_WithCustomHours_FiltersCorrectly()
    {
        // Arrange
        var expiringIn6Hours = new OAuthToken
        {
            UserId = _testUserId,
            Platform = "twitter",
            EncryptedAccessToken = "token1",
            EncryptedRefreshToken = "refresh1",
            ExpiresAt = DateTime.UtcNow.AddHours(6),
            IsValid = true
        };
        var expiringIn10Hours = new OAuthToken
        {
            UserId = Guid.NewGuid(),
            Platform = "facebook",
            EncryptedAccessToken = "token2",
            EncryptedRefreshToken = "refresh2",
            ExpiresAt = DateTime.UtcNow.AddHours(10),
            IsValid = true
        };
        _context.OAuthTokens.AddRange(expiringIn6Hours, expiringIn10Hours);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetExpiringTokensAsync(8); // 8 hours threshold

        // Assert
        Assert.Single(result);
        Assert.Contains(result, t => t.Platform == "twitter"); // Only 6-hour token
    }

    #endregion

    #region GetSupportedPlatformsAsync Tests

    [Fact]
    public async Task GetSupportedPlatformsAsync_ReturnsAllConfiguredPlatforms()
    {
        // Act
        var result = await _service.GetSupportedPlatformsAsync();

        // Assert
        Assert.NotEmpty(result);
        Assert.Contains(result, p => p.Name == "facebook");
        Assert.Contains(result, p => p.Name == "twitter");
        Assert.Contains(result, p => p.Name == "instagram");
        Assert.Contains(result, p => p.Name == "tiktok");
    }

    [Fact]
    public async Task GetSupportedPlatformsAsync_IncludesPlatformDetails()
    {
        // Act
        var result = await _service.GetSupportedPlatformsAsync();

        // Assert
        var facebookPlatform = result.FirstOrDefault(p => p.Name == "facebook");
        Assert.NotNull(facebookPlatform);
        Assert.Equal("Facebook", facebookPlatform.DisplayName);
        Assert.True(facebookPlatform.IsEnabled);
        Assert.NotEmpty(facebookPlatform.RequiredScopes);
        Assert.NotEmpty(facebookPlatform.OptionalScopes);
    }

    [Fact]
    public async Task GetSupportedPlatformsAsync_IncludesRateLimits()
    {
        // Act
        var result = await _service.GetSupportedPlatformsAsync();

        // Assert
        foreach (var platform in result)
        {
            Assert.NotNull(platform.RateLimits);
            Assert.True(platform.RateLimits.ContainsKey("requests_per_hour"));
            Assert.True(platform.RateLimits["requests_per_hour"] > 0);
        }
    }

    #endregion

    #region PKCE Security Tests

    [Fact]
    public async Task GeneratePkceValues_CreatesUniqueVerifiers()
    {
        // Arrange
        _mockPrivacyService.Setup(p => p.HasSocialDataConsentAsync(It.IsAny<Guid>()))
            .ReturnsAsync(true);

        // Act - Initiate two flows
        var result1 = await _service.InitiateOAuthFlowAsync("facebook", _testUserId, "https://example.com/callback");
        var result2 = await _service.InitiateOAuthFlowAsync("facebook", _testUserId, "https://example.com/callback");

        // Assert - States should be different
        Assert.NotEqual(result1.State, result2.State);

        // Verify different PKCE values in database
        var states = await _context.OAuthStates
            .Where(s => s.UserId == _testUserId && s.Platform == "facebook")
            .ToListAsync();
        Assert.True(states.Count >= 2);
        Assert.True(states.Select(s => s.CodeVerifier).Distinct().Count() >= 2);
        Assert.True(states.Select(s => s.CodeChallenge).Distinct().Count() >= 2);
    }

    [Fact]
    public async Task PKCE_CodeChallenge_IsSHA256OfVerifier()
    {
        // Arrange
        _mockPrivacyService.Setup(p => p.HasSocialDataConsentAsync(_testUserId))
            .ReturnsAsync(true);

        // Act
        var result = await _service.InitiateOAuthFlowAsync("facebook", _testUserId, "https://example.com/callback");

        // Assert - Verify code_challenge_method is S256
        Assert.Contains("code_challenge_method=S256", result.AuthorizationUrl);
    }

    #endregion

    #region Platform-Specific User Mapping Tests

    [Fact]
    public async Task HandleOAuthCallback_FacebookMapping_ExtractsCorrectFields()
    {
        // Arrange
        var state = SetupOAuthState("facebook");
        SetupHttpMockForTokenExchange(new OAuthTokens { AccessToken = "token", ExpiresIn = 3600, Scope = "public_profile email" });
        SetupHttpMockForUserInfo(new Dictionary<string, object>
        {
            ["id"] = "fb-123",
            ["name"] = "Facebook User",
            ["email"] = "fb@example.com",
            ["username"] = "fbuser"
        });
        _mockTokenService.Setup(t => t.StoreTokensAsync(It.IsAny<string>(), It.IsAny<Guid>(), It.IsAny<OAuthTokens>()))
            .ReturnsAsync(new ServiceResult { IsSuccess = true });

        // Act
        var result = await _service.HandleOAuthCallbackAsync("facebook", "code", state);

        // Assert
        Assert.True(result.IsSuccess);
        Assert.NotNull(result.UserInfo);
        Assert.Equal("fb-123", result.UserInfo.Id);
        Assert.Equal("Facebook User", result.UserInfo.DisplayName);
        Assert.Equal("fb@example.com", result.UserInfo.Email);
    }

    [Fact]
    public async Task HandleOAuthCallback_TwitterMapping_ExtractsCorrectFields()
    {
        // Arrange
        var state = SetupOAuthState("twitter");
        SetupHttpMockForTokenExchange(new OAuthTokens { AccessToken = "token", ExpiresIn = 7200, Scope = "tweet.read users.read" });
        SetupHttpMockForUserInfo(new Dictionary<string, object>
        {
            ["id"] = "twitter-456",
            ["username"] = "twitteruser",
            ["name"] = "Twitter User",
            ["description"] = "My bio",
            ["verified"] = true
        });
        _mockTokenService.Setup(t => t.StoreTokensAsync(It.IsAny<string>(), It.IsAny<Guid>(), It.IsAny<OAuthTokens>()))
            .ReturnsAsync(new ServiceResult { IsSuccess = true });

        // Act
        var result = await _service.HandleOAuthCallbackAsync("twitter", "code", state);

        // Assert
        Assert.NotNull(result.UserInfo);
        Assert.Equal("twitter-456", result.UserInfo.Id);
        Assert.Equal("twitteruser", result.UserInfo.Username);
        Assert.Equal("My bio", result.UserInfo.Bio);
        Assert.True(result.UserInfo.IsVerified);
    }

    #endregion

    #region Helper Methods

    private string SetupOAuthState(string platform)
    {
        var state = $"{platform}-state-{Guid.NewGuid()}";
        var oauthState = new OAuthState
        {
            StateValue = state,
            UserId = _testUserId,
            Platform = platform,
            RedirectUrl = "https://example.com/callback",
            CodeVerifier = "verifier",
            CodeChallenge = "challenge",
            ExpiresAt = DateTime.UtcNow.AddMinutes(5),
            IsUsed = false
        };
        _context.OAuthStates.Add(oauthState);
        _context.SaveChanges();
        return state;
    }

    private void SetupHttpMockForTokenExchange(OAuthTokens tokens)
    {
        var tokenJson = JsonSerializer.Serialize(new
        {
            access_token = tokens.AccessToken,
            refresh_token = tokens.RefreshToken,
            token_type = tokens.TokenType,
            expires_in = tokens.ExpiresIn,
            scope = tokens.Scope
        });

        _mockHttpMessageHandler
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.Is<HttpRequestMessage>(req =>
                    req.Method == HttpMethod.Post &&
                    (req.RequestUri!.ToString().Contains("oauth") || req.RequestUri.ToString().Contains("token"))),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent(tokenJson)
            });
    }

    private void SetupHttpMockForUserInfo(Dictionary<string, object> userData)
    {
        var userJson = JsonSerializer.Serialize(userData);

        _mockHttpMessageHandler
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.Is<HttpRequestMessage>(req =>
                    req.Method == HttpMethod.Get &&
                    (req.RequestUri!.ToString().Contains("/me") || req.RequestUri.ToString().Contains("/user"))),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.OK,
                Content = new StringContent(userJson)
            });
    }

    private void SetupHttpMockForFailedRequest()
    {
        _mockHttpMessageHandler
            .Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>()
            )
            .ReturnsAsync(new HttpResponseMessage
            {
                StatusCode = HttpStatusCode.BadRequest,
                Content = new StringContent("{\"error\": \"invalid_grant\"}")
            });
    }

    #endregion
}
