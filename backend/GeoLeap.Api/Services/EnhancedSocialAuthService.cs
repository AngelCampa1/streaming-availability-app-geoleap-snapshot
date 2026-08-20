using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using System.Security.Cryptography;
using System.Text;
using System.Net.Http;

namespace GeoLeap.Api.Services;

/// <summary>
/// Enhanced OAuth 2.0 social media authentication service with advanced security and platform support
/// </summary>
public class EnhancedSocialAuthService : IEnhancedSocialAuthService
{
    private readonly ApplicationDbContext _context;
    private readonly ISocialTokenService _tokenService;
    private readonly ILoggerService _logger;
    private readonly IConfiguration _configuration;
    private readonly HttpClient _httpClient;
    private readonly IPrivacyService _privacyService;
    
    private readonly Dictionary<string, SocialPlatformConfig> _platformConfigs = new();

    public EnhancedSocialAuthService(
        ApplicationDbContext context,
        ISocialTokenService tokenService,
        ILoggerService logger,
        IConfiguration configuration,
        HttpClient httpClient,
        IPrivacyService privacyService)
    {
        _context = context;
        _tokenService = tokenService;
        _logger = logger;
        _configuration = configuration;
        _httpClient = httpClient;
        _privacyService = privacyService;
        
        InitializePlatformConfigs();
    }

    private void InitializePlatformConfigs()
    {
        _platformConfigs["facebook"] = new SocialPlatformConfig
        {
            Platform = "facebook",
            DisplayName = "Facebook",
            EncryptedClientId = _configuration["SocialAuth:Facebook:ClientId"] ?? "", // Note: Should be encrypted in production
            EncryptedClientSecret = _configuration["SocialAuth:Facebook:ClientSecret"] ?? "", // Note: Should be encrypted in production
            ClientSecret = _configuration["SocialAuth:Facebook:ClientSecret"] ?? "",
            AuthorizationEndpoint = "https://www.facebook.com/v18.0/dialog/oauth",
            TokenEndpoint = "https://graph.facebook.com/v18.0/oauth/access_token",
            TokenUrl = "https://graph.facebook.com/v18.0/oauth/access_token",
            UserInfoEndpoint = "https://graph.facebook.com/v18.0/me",
            UserInfoUrl = "https://graph.facebook.com/v18.0/me",
            DefaultScopes = "public_profile,email",
            OptionalScopes = "user_friends,user_posts,pages_read_engagement",
            SupportsRefreshToken = true,
            RateLimitPerHour = 200
        };

        _platformConfigs["twitter"] = new SocialPlatformConfig
        {
            Platform = "twitter",
            DisplayName = "Twitter/X",
            EncryptedClientId = _configuration["SocialAuth:Twitter:ClientId"] ?? "", // Note: Should be encrypted in production
            EncryptedClientSecret = _configuration["SocialAuth:Twitter:ClientSecret"] ?? "", // Note: Should be encrypted in production
            ClientSecret = _configuration["SocialAuth:Twitter:ClientSecret"] ?? "",
            AuthorizationEndpoint = "https://api.twitter.com/2/oauth2/authorize",
            TokenEndpoint = "https://api.twitter.com/2/oauth2/token",
            TokenUrl = "https://api.twitter.com/2/oauth2/token",
            UserInfoEndpoint = "https://api.twitter.com/2/users/me",
            UserInfoUrl = "https://api.twitter.com/2/users/me",
            DefaultScopes = "tweet.read,users.read",
            OptionalScopes = "tweet.write,follows.read,follows.write",
            SupportsRefreshToken = true,
            RateLimitPerHour = 300
        };

        _platformConfigs["instagram"] = new SocialPlatformConfig
        {
            Platform = "instagram",
            DisplayName = "Instagram",
            EncryptedClientId = _configuration["SocialAuth:Instagram:ClientId"] ?? "", // Note: Should be encrypted in production
            EncryptedClientSecret = _configuration["SocialAuth:Instagram:ClientSecret"] ?? "", // Note: Should be encrypted in production
            ClientSecret = _configuration["SocialAuth:Instagram:ClientSecret"] ?? "",
            AuthorizationEndpoint = "https://api.instagram.com/oauth/authorize",
            TokenEndpoint = "https://api.instagram.com/oauth/access_token",
            TokenUrl = "https://api.instagram.com/oauth/access_token",
            UserInfoEndpoint = "https://graph.instagram.com/me",
            UserInfoUrl = "https://graph.instagram.com/me",
            DefaultScopes = "user_profile,user_media",
            OptionalScopes = "user_posts",
            SupportsRefreshToken = true,
            RateLimitPerHour = 100
        };

        _platformConfigs["tiktok"] = new SocialPlatformConfig
        {
            Platform = "tiktok",
            DisplayName = "TikTok",
            EncryptedClientId = _configuration["SocialAuth:TikTok:ClientId"] ?? "", // Note: Should be encrypted in production
            EncryptedClientSecret = _configuration["SocialAuth:TikTok:ClientSecret"] ?? "", // Note: Should be encrypted in production
            ClientSecret = _configuration["SocialAuth:TikTok:ClientSecret"] ?? "",
            AuthorizationEndpoint = "https://www.tiktok.com/v2/auth/authorize/",
            TokenEndpoint = "https://open-api.tiktok.com/oauth/access_token/",
            TokenUrl = "https://open-api.tiktok.com/oauth/access_token/",
            UserInfoEndpoint = "https://open-api.tiktok.com/user/info/",
            UserInfoUrl = "https://open-api.tiktok.com/user/info/",
            DefaultScopes = "user.info.basic",
            OptionalScopes = "video.list,user.info.profile,user.info.stats",
            SupportsRefreshToken = true,
            RateLimitPerHour = 1000
        };
    }

    public async Task<OAuthInitiationResult> InitiateOAuthFlowAsync(string platform, Guid userId, 
        string redirectUrl, string[]? scopes = null, Dictionary<string, string>? additionalParams = null)
    {
        try
        {
            var config = GetPlatformConfig(platform);
            if (config == null)
            {
                return new OAuthInitiationResult 
                { 
                    IsSuccess = false, 
                    ErrorMessage = $"Unsupported platform: {platform}",
                    ErrorCode = "UNSUPPORTED_PLATFORM"
                };
            }

            // Check user's privacy consent
            var hasConsent = await _privacyService.HasSocialDataConsentAsync(userId);
            if (!hasConsent)
            {
                return new OAuthInitiationResult 
                { 
                    IsSuccess = false, 
                    ErrorMessage = "User has not provided consent for social data collection",
                    ErrorCode = "NO_CONSENT"
                };
            }

            // SECURITY: Generate secure state parameter and PKCE verifier
            var state = GenerateSecureState();
            var (codeVerifier, codeChallenge) = GeneratePkceValues();

            var stateEntity = new OAuthState
            {
                StateValue = state,
                UserId = userId,
                Platform = platform,
                RedirectUrl = redirectUrl,
                RequestedScopes = string.Join(",", scopes ?? config.DefaultScopes.Split(',', StringSplitOptions.RemoveEmptyEntries)),
                CodeVerifier = codeVerifier, // PKCE: Store verifier for token exchange
                CodeChallenge = codeChallenge, // PKCE: Challenge sent to auth server
                ExpiresAt = DateTime.UtcNow.AddMinutes(10),
                IpAddress = GetClientIpAddress(),
                UserAgent = GetUserAgent()
            };

            _context.OAuthStates.Add(stateEntity);
            await _context.SaveChangesAsync();

            // SECURITY: Build authorization URL with PKCE
            var scopesToUse = scopes ?? config.DefaultScopes.Split(',', StringSplitOptions.RemoveEmptyEntries);
            var authUrl = BuildAuthorizationUrl(config, redirectUrl, state, scopesToUse, codeChallenge, additionalParams);

            await _logger.LogAsync("INFO", $"OAuth flow initiated for user {userId} on platform {platform}");

            return new OAuthInitiationResult
            {
                IsSuccess = true,
                AuthorizationUrl = authUrl,
                State = state,
                ExpiresAt = stateEntity.ExpiresAt
            };
        }
        catch (Exception ex)
        {
            await _logger.LogAsync("ERROR", $"Failed to initiate OAuth flow: {ex.Message}");
            return new OAuthInitiationResult 
            { 
                IsSuccess = false, 
                ErrorMessage = "Failed to initiate OAuth flow",
                ErrorCode = "OAUTH_INITIATION_FAILED"
            };
        }
    }

    public async Task<OAuthCallbackResult> HandleOAuthCallbackAsync(string platform, string code, string state)
    {
        try
        {
            // Validate state parameter
            var stateEntity = await _context.OAuthStates
                .FirstOrDefaultAsync(s => s.StateValue == state && s.Platform == platform && !s.IsUsed);

            if (stateEntity == null || stateEntity.ExpiresAt < DateTime.UtcNow)
            {
                return new OAuthCallbackResult 
                { 
                    IsSuccess = false, 
                    ErrorMessage = "Invalid or expired state parameter",
                    ErrorCode = "INVALID_STATE"
                };
            }

            // Mark state as used
            stateEntity.IsUsed = true;
            stateEntity.UsedAt = DateTime.UtcNow;

            var config = GetPlatformConfig(platform);
            if (config == null)
            {
                return new OAuthCallbackResult 
                { 
                    IsSuccess = false, 
                    ErrorMessage = $"Unsupported platform: {platform}",
                    ErrorCode = "UNSUPPORTED_PLATFORM"
                };
            }

            // SECURITY: Exchange code for access token with PKCE code_verifier
            var tokens = await ExchangeCodeForTokensAsync(config, code, stateEntity.RedirectUrl, stateEntity.CodeVerifier);
            if (tokens == null)
            {
                return new OAuthCallbackResult 
                { 
                    IsSuccess = false, 
                    ErrorMessage = "Failed to exchange authorization code for access token",
                    ErrorCode = "TOKEN_EXCHANGE_FAILED"
                };
            }

            // Get user info from platform
            var userInfo = await GetUserInfoAsync(config, tokens.AccessToken);
            if (userInfo == null)
            {
                return new OAuthCallbackResult 
                { 
                    IsSuccess = false, 
                    ErrorMessage = "Failed to retrieve user information from platform",
                    ErrorCode = "USER_INFO_FAILED"
                };
            }

            // Store encrypted tokens
            await StoreTokensAsync(stateEntity.UserId, platform, tokens);

            // Create or update social connection
            await CreateOrUpdateSocialConnectionAsync(stateEntity.UserId, platform, userInfo, tokens.Scope);

            await _context.SaveChangesAsync();

            await _logger.LogAsync("INFO", 
                $"OAuth callback processed successfully for user {stateEntity.UserId} on platform {platform}");

            return new OAuthCallbackResult
            {
                IsSuccess = true,
                UserInfo = userInfo,
                GrantedScopes = tokens.Scope.Split(' ', StringSplitOptions.RemoveEmptyEntries),
                TokenExpiresAt = DateTime.UtcNow.AddSeconds(tokens.ExpiresIn)
            };
        }
        catch (Exception ex)
        {
            await _logger.LogAsync("ERROR", $"Failed to handle OAuth callback: {ex.Message}");
            return new OAuthCallbackResult 
            { 
                IsSuccess = false, 
                ErrorMessage = "Failed to process OAuth callback",
                ErrorCode = "CALLBACK_PROCESSING_FAILED"
            };
        }
    }

    public async Task<TokenValidationResult> ValidateAndRefreshTokenAsync(Guid userId, string platform)
    {
        try
        {
            var token = await _context.OAuthTokens
                .FirstOrDefaultAsync(t => t.UserId == userId && t.Platform == platform && t.IsValid);

            if (token == null)
            {
                return new TokenValidationResult 
                { 
                    IsSuccess = false, 
                    IsValid = false,
                    ErrorMessage = "No valid token found",
                    ErrorCode = "NO_TOKEN"
                };
            }

            // Check if token is expired
            if (token.ExpiresAt <= DateTime.UtcNow)
            {
                // Try to refresh the token
                if (!string.IsNullOrEmpty(token.EncryptedRefreshToken))
                {
                    var refreshResult = await RefreshAccessTokenAsync(userId, platform);
                    if (refreshResult.IsSuccess)
                    {
                        return new TokenValidationResult
                        {
                            IsSuccess = true,
                            IsValid = true,
                            WasRefreshed = true,
                            ExpiresAt = refreshResult.ExpiresAt
                        };
                    }
                }

                // Mark token as invalid if refresh failed
                token.IsValid = false;
                await _context.SaveChangesAsync();

                return new TokenValidationResult 
                { 
                    IsSuccess = false, 
                    IsValid = false,
                    ErrorMessage = "Token expired and refresh failed",
                    ErrorCode = "TOKEN_EXPIRED"
                };
            }

            // Token is still valid
            token.LastUsed = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return new TokenValidationResult
            {
                IsSuccess = true,
                IsValid = true,
                ExpiresAt = token.ExpiresAt,
                WasRefreshed = false
            };
        }
        catch (Exception ex)
        {
            await _logger.LogAsync("ERROR", $"Failed to validate token: {ex.Message}");
            return new TokenValidationResult 
            { 
                IsSuccess = false, 
                IsValid = false,
                ErrorMessage = "Token validation failed",
                ErrorCode = "VALIDATION_FAILED"
            };
        }
    }

    public async Task<TokenRefreshResult> RefreshAccessTokenAsync(Guid userId, string platform)
    {
        try
        {
            var token = await _context.OAuthTokens
                .FirstOrDefaultAsync(t => t.UserId == userId && t.Platform == platform && t.IsValid);

            if (token == null || string.IsNullOrEmpty(token.EncryptedRefreshToken))
            {
                return new TokenRefreshResult 
                { 
                    IsSuccess = false, 
                    ErrorMessage = "No refresh token available",
                    ErrorCode = "NO_REFRESH_TOKEN"
                };
            }

            var config = GetPlatformConfig(platform);
            if (config == null)
            {
                return new TokenRefreshResult 
                { 
                    IsSuccess = false, 
                    ErrorMessage = $"Unsupported platform: {platform}",
                    ErrorCode = "UNSUPPORTED_PLATFORM"
                };
            }

            // The SocialTokenService handles decryption internally, so we'll use refresh flow directly
            var refreshResult = await _tokenService.RefreshTokensAsync(platform, userId);
            
            if (!refreshResult.IsSuccess)
            {
                return new TokenRefreshResult
                {
                    IsSuccess = false,
                    ErrorMessage = refreshResult.ErrorMessage
                };
            }
            
            // Token was successfully refreshed by SocialTokenService
            return new TokenRefreshResult
            {
                IsSuccess = true,
                ExpiresAt = refreshResult.ExpiresAt,
                UpdatedScopes = refreshResult.UpdatedScopes
            };
        }
        catch (Exception ex)
        {
            await _logger.LogAsync("ERROR", $"Failed to refresh token: {ex.Message}");
            return new TokenRefreshResult 
            { 
                IsSuccess = false, 
                ErrorMessage = "Token refresh failed",
                ErrorCode = "REFRESH_ERROR"
            };
        }
    }

    public async Task<ServiceResult> RevokeTokenAsync(Guid userId, string platform, string reason = "user_request")
    {
        try
        {
            var token = await _context.OAuthTokens
                .FirstOrDefaultAsync(t => t.UserId == userId && t.Platform == platform && t.IsValid);

            if (token != null)
            {
                token.IsValid = false;
                // Store revocation info in metadata
                var metadata = token.Metadata ?? new Dictionary<string, object>();
                metadata["RevokedAt"] = DateTime.UtcNow;
                metadata["RevokedReason"] = reason;
                token.Metadata = metadata;

                // Also disconnect the social connection
                var connection = await _context.SocialConnections
                    .FirstOrDefaultAsync(c => c.UserId == userId && c.Platform == platform);

                if (connection != null)
                {
                    connection.IsTokenValid = false;
                }

                await _context.SaveChangesAsync();

                await _logger.LogAsync("INFO", 
                    $"Token revoked for user {userId} on platform {platform}. Reason: {reason}");
            }

            return new ServiceResult { IsSuccess = true };
        }
        catch (Exception ex)
        {
            await _logger.LogAsync("ERROR", $"Failed to revoke token: {ex.Message}");
            return new ServiceResult 
            { 
                IsSuccess = false, 
                ErrorMessage = "Failed to revoke token",
                ErrorCode = "REVOKE_FAILED"
            };
        }
    }

    public async Task<List<ExpiringToken>> GetExpiringTokensAsync(int hoursUntilExpiry = 24)
    {
        var expiryThreshold = DateTime.UtcNow.AddHours(hoursUntilExpiry);
        
        return await _context.OAuthTokens
            .Where(t => t.IsValid && t.ExpiresAt <= expiryThreshold && !string.IsNullOrEmpty(t.EncryptedRefreshToken))
            .Select(t => new ExpiringToken
            {
                UserId = t.UserId,
                Platform = t.Platform,
                ExpiresAt = t.ExpiresAt,
                HasRefreshToken = !string.IsNullOrEmpty(t.EncryptedRefreshToken)
            })
            .ToListAsync();
    }

    public Task<List<SocialPlatformInfo>> GetSupportedPlatformsAsync()
    {
        var platforms = _platformConfigs.Values.Select(config => new SocialPlatformInfo
        {
            Name = config.Platform,
            DisplayName = config.DisplayName,
            IsEnabled = !string.IsNullOrEmpty(config.EncryptedClientId),
            RequiredScopes = config.DefaultScopes.Split(',', StringSplitOptions.RemoveEmptyEntries),
            OptionalScopes = config.OptionalScopes.Split(',', StringSplitOptions.RemoveEmptyEntries),
            SupportsPosting = config.SupportsPosting,
            SupportsFriends = config.SupportsFriendDiscovery,
            RateLimits = new Dictionary<string, int> { ["requests_per_hour"] = config.RateLimitPerHour }
        }).ToList();

        return Task.FromResult(platforms);
    }

    #region Private Helper Methods

    private SocialPlatformConfig? GetPlatformConfig(string platform)
    {
        return _platformConfigs.TryGetValue(platform.ToLower(), out var config) ? config : null;
    }

    private static string GenerateSecureState()
    {
        var bytes = new byte[32];
        using (var rng = RandomNumberGenerator.Create())
        {
            rng.GetBytes(bytes);
        }
        return Convert.ToBase64String(bytes).Replace("+", "-").Replace("/", "_").Replace("=", "");
    }

    private string BuildAuthorizationUrl(SocialPlatformConfig config, string redirectUrl, string state,
        string[] scopes, string codeChallenge, Dictionary<string, string>? additionalParams = null)
    {
        var queryParams = new Dictionary<string, string>
        {
            ["client_id"] = config.EncryptedClientId,
            ["redirect_uri"] = redirectUrl,
            ["scope"] = string.Join(" ", scopes),
            ["state"] = state,
            ["response_type"] = "code",
            // SECURITY: Add PKCE parameters (RFC 7636)
            ["code_challenge"] = codeChallenge,
            ["code_challenge_method"] = "S256" // SHA-256 hash
        };

        if (additionalParams != null)
        {
            foreach (var param in additionalParams)
            {
                queryParams[param.Key] = param.Value;
            }
        }

        var queryString = string.Join("&", queryParams.Select(kvp =>
            $"{Uri.EscapeDataString(kvp.Key)}={Uri.EscapeDataString(kvp.Value)}"));

        return $"{config.AuthorizationEndpoint}?{queryString}";
    }

    /// <summary>
    /// Generate PKCE code verifier and challenge (RFC 7636)
    /// SECURITY: Proof Key for Code Exchange prevents authorization code interception attacks
    /// </summary>
    private (string codeVerifier, string codeChallenge) GeneratePkceValues()
    {
        // Generate cryptographically random code_verifier (43-128 characters)
        var randomBytes = new byte[64];
        using (var rng = System.Security.Cryptography.RandomNumberGenerator.Create())
        {
            rng.GetBytes(randomBytes);
        }

        // Base64-URL encode (RFC 4648 Section 5)
        var codeVerifier = Convert.ToBase64String(randomBytes)
            .Replace("+", "-")
            .Replace("/", "_")
            .Replace("=", "");

        // Generate code_challenge = BASE64URL(SHA256(code_verifier))
        using (var sha256 = System.Security.Cryptography.SHA256.Create())
        {
            var challengeBytes = sha256.ComputeHash(System.Text.Encoding.UTF8.GetBytes(codeVerifier));
            var codeChallenge = Convert.ToBase64String(challengeBytes)
                .Replace("+", "-")
                .Replace("/", "_")
                .Replace("=", "");

            return (codeVerifier, codeChallenge);
        }
    }

    private async Task<OAuthTokens?> ExchangeCodeForTokensAsync(SocialPlatformConfig config, string code, string redirectUrl, string? codeVerifier = null)
    {
        try
        {
            var requestData = new Dictionary<string, string>
            {
                ["client_id"] = config.EncryptedClientId,
                ["client_secret"] = config.ClientSecret,
                ["code"] = code,
                ["redirect_uri"] = redirectUrl,
                ["grant_type"] = "authorization_code"
            };

            // SECURITY: Add PKCE code_verifier if present
            if (!string.IsNullOrEmpty(codeVerifier))
            {
                requestData["code_verifier"] = codeVerifier;
            }

            var content = new FormUrlEncodedContent(requestData);
            var response = await _httpClient.PostAsync(config.TokenUrl, content);

            if (response.IsSuccessStatusCode)
            {
                var responseContent = await response.Content.ReadAsStringAsync();
                return JsonSerializer.Deserialize<OAuthTokens>(responseContent);
            }

            return null;
        }
        catch (Exception ex)
        {
            await _logger.LogAsync("ERROR", $"Token exchange failed: {ex.Message}");
            return null;
        }
    }

    private async Task<SocialProfile?> GetUserInfoAsync(SocialPlatformConfig config, string accessToken)
    {
        try
        {
            var request = new HttpRequestMessage(HttpMethod.Get, config.UserInfoUrl);
            request.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);

            var response = await _httpClient.SendAsync(request);

            if (response.IsSuccessStatusCode)
            {
                var responseContent = await response.Content.ReadAsStringAsync();
                var userData = JsonSerializer.Deserialize<Dictionary<string, object>>(responseContent);

                return MapUserData(config.Platform, userData);
            }

            return null;
        }
        catch (Exception ex)
        {
            await _logger.LogAsync("ERROR", $"User info fetch failed: {ex.Message}");
            return null;
        }
    }

    private async Task<OAuthTokens?> RefreshTokensAsync(SocialPlatformConfig config, string refreshToken)
    {
        try
        {
            var requestData = new Dictionary<string, string>
            {
                ["client_id"] = config.EncryptedClientId,
                ["client_secret"] = config.ClientSecret,
                ["refresh_token"] = refreshToken,
                ["grant_type"] = "refresh_token"
            };

            var content = new FormUrlEncodedContent(requestData);
            var response = await _httpClient.PostAsync(config.TokenUrl, content);

            if (response.IsSuccessStatusCode)
            {
                var responseContent = await response.Content.ReadAsStringAsync();
                return JsonSerializer.Deserialize<OAuthTokens>(responseContent);
            }

            return null;
        }
        catch (Exception ex)
        {
            await _logger.LogAsync("ERROR", $"Token refresh failed: {ex.Message}");
            return null;
        }
    }

    private SocialProfile MapUserData(string platform, Dictionary<string, object>? userData)
    {
        if (userData == null) return new SocialProfile();

        return platform.ToLower() switch
        {
            "facebook" => MapFacebookUser(userData),
            "twitter" => MapTwitterUser(userData),
            "instagram" => MapInstagramUser(userData),
            "tiktok" => MapTikTokUser(userData),
            _ => new SocialProfile()
        };
    }

    private SocialProfile MapFacebookUser(Dictionary<string, object> userData)
    {
        return new SocialProfile
        {
            Id = userData.TryGetValue("id", out var id) ? id.ToString() ?? "" : "",
            Username = userData.TryGetValue("username", out var username) ? username.ToString() ?? "" : "",
            DisplayName = userData.TryGetValue("name", out var name) ? name.ToString() ?? "" : "",
            Email = userData.TryGetValue("email", out var email) ? email.ToString() ?? "" : "",
            ProfileImageUrl = userData.TryGetValue("picture", out var picture) && picture is JsonElement pictureElement
                ? pictureElement.GetProperty("data").GetProperty("url").GetString() ?? ""
                : "",
            AdditionalData = userData
        };
    }

    private SocialProfile MapTwitterUser(Dictionary<string, object> userData)
    {
        return new SocialProfile
        {
            Id = userData.TryGetValue("id", out var id) ? id.ToString() ?? "" : "",
            Username = userData.TryGetValue("username", out var username) ? username.ToString() ?? "" : "",
            DisplayName = userData.TryGetValue("name", out var name) ? name.ToString() ?? "" : "",
            Bio = userData.TryGetValue("description", out var bio) ? bio.ToString() ?? "" : "",
            FollowersCount = userData.TryGetValue("public_metrics", out var metrics) && metrics is JsonElement metricsElement
                ? metricsElement.GetProperty("followers_count").GetInt32()
                : 0,
            IsVerified = userData.TryGetValue("verified", out var verified) &&
                (verified is JsonElement verifiedElement ? verifiedElement.GetBoolean() : verified is bool b && b),
            AdditionalData = userData
        };
    }

    private SocialProfile MapInstagramUser(Dictionary<string, object> userData)
    {
        return new SocialProfile
        {
            Id = userData.TryGetValue("id", out var id) ? id.ToString() ?? "" : "",
            Username = userData.TryGetValue("username", out var username) ? username.ToString() ?? "" : "",
            DisplayName = userData.TryGetValue("name", out var name) ? name.ToString() ?? "" : "",
            FollowersCount = userData.TryGetValue("followers_count", out var followers) ? (int)followers : 0,
            FollowingCount = userData.TryGetValue("follows_count", out var following) ? (int)following : 0,
            AdditionalData = userData
        };
    }

    private SocialProfile MapTikTokUser(Dictionary<string, object> userData)
    {
        var userInfo = userData.TryGetValue("data", out var data) && data is JsonElement dataElement
            ? dataElement.GetProperty("user")
            : new JsonElement();

        return new SocialProfile
        {
            Id = userInfo.TryGetProperty("open_id", out var id) ? id.GetString() ?? "" : "",
            Username = userInfo.TryGetProperty("username", out var username) ? username.GetString() ?? "" : "",
            DisplayName = userInfo.TryGetProperty("display_name", out var name) ? name.GetString() ?? "" : "",
            Bio = userInfo.TryGetProperty("bio_description", out var bio) ? bio.GetString() ?? "" : "",
            FollowersCount = userInfo.TryGetProperty("follower_count", out var followers) ? followers.GetInt32() : 0,
            FollowingCount = userInfo.TryGetProperty("following_count", out var following) ? following.GetInt32() : 0,
            IsVerified = userInfo.TryGetProperty("is_verified", out var verified) && verified.GetBoolean(),
            AdditionalData = userData
        };
    }

    private async Task StoreTokensAsync(Guid userId, string platform, OAuthTokens tokens)
    {
        // Use the dedicated SocialTokenService for secure token storage
        var result = await _tokenService.StoreTokensAsync(platform, userId, tokens);
        
        if (!result.IsSuccess)
        {
            await _logger.LogAsync("ERROR", $"Failed to store tokens for platform {platform}: {result.ErrorMessage}");
            throw new InvalidOperationException($"Failed to store OAuth tokens: {result.ErrorMessage}");
        }
    }

    private async Task CreateOrUpdateSocialConnectionAsync(Guid userId, string platform, SocialProfile userInfo, string scope)
    {
        var existingConnection = await _context.SocialConnections
            .FirstOrDefaultAsync(c => c.UserId == userId && c.Platform == platform);

        if (existingConnection != null)
        {
            existingConnection.Username = userInfo.Username;
            existingConnection.DisplayName = userInfo.DisplayName;
            existingConnection.ProfileImageUrl = userInfo.ProfileImageUrl;
            existingConnection.Bio = userInfo.Bio;
            existingConnection.FollowersCount = userInfo.FollowersCount;
            existingConnection.FollowingCount = userInfo.FollowingCount;
            existingConnection.IsVerified = userInfo.IsVerified;
            existingConnection.IsTokenValid = true;
            existingConnection.GrantedScopes = scope;
            existingConnection.UpdatedAt = DateTime.UtcNow;
            existingConnection.ProfileData = userInfo.AdditionalData;
        }
        else
        {
            var newConnection = new SocialConnection
            {
                UserId = userId,
                Platform = platform,
                SocialUserId = userInfo.Id,
                Username = userInfo.Username,
                DisplayName = userInfo.DisplayName,
                ProfileImageUrl = userInfo.ProfileImageUrl,
                Bio = userInfo.Bio,
                FollowersCount = userInfo.FollowersCount,
                FollowingCount = userInfo.FollowingCount,
                IsVerified = userInfo.IsVerified,
                IsTokenValid = true,
                GrantedScopes = scope,
                ProfileData = userInfo.AdditionalData
            };

            _context.SocialConnections.Add(newConnection);
        }
    }

    // Add missing fields to fix compilation
    public async Task<List<SocialConnection>> GetConnectedAccountsAsync(Guid userId)
    {
        try
        {
            return await _context.SocialConnections
                .Where(c => c.UserId == userId && c.IsTokenValid)
                .OrderBy(c => c.ConnectedAt)
                .ToListAsync();
        }
        catch (Exception ex)
        {
            await _logger.LogAsync("ERROR", $"Failed to get connected accounts: {ex.Message}");
            return new List<SocialConnection>();
        }
    }

    public async Task<SocialProfile?> GetSocialProfileAsync(string platform, Guid userId, bool includePrivateData = false)
    {
        try
        {
            // Get the user's token for this platform
            var validation = await ValidateAndRefreshTokenAsync(userId, platform);
            if (!validation.IsSuccess || !validation.IsValid)
            {
                return null;
            }

            var token = await _context.OAuthTokens
                .FirstOrDefaultAsync(t => t.UserId == userId && t.Platform == platform && t.IsValid);

            if (token == null)
            {
                return null;
            }

            var config = GetPlatformConfig(platform);
            if (config == null)
            {
                return null;
            }

            // Get the tokens using the token service (it handles decryption internally)
            var tokens = await _tokenService.GetTokensAsync(platform, userId);
            if (tokens == null)
            {
                return null;
            }

            var userInfo = await GetUserInfoAsync(config, tokens.AccessToken);
            return userInfo;
        }
        catch (Exception ex)
        {
            await _logger.LogAsync("ERROR", $"Failed to get social profile: {ex.Message}");
            return null;
        }
    }

    public async Task<List<SocialPlatformInfo>> GetAvailablePlatformsAsync()
    {
        return await GetSupportedPlatformsAsync();
    }

    public async Task<SocialPreferences> UpdateSocialPreferencesAsync(Guid userId, UpdateSocialPreferencesRequest request)
    {
        try
        {
            // Update privacy consent based on preferences
            var consent = await _context.SocialPrivacyConsents
                .FirstOrDefaultAsync(c => c.UserId == userId) ?? new SocialPrivacyConsent { UserId = userId };

            consent.AllowSocialDataCollection = request.AllowSocialSharing;
            consent.AllowFriendDiscovery = request.AllowFriendDiscovery;
            consent.AllowSocialRecommendations = request.AllowRecommendations;
            consent.AllowActivityTracking = request.AllowActivityTracking;
            consent.UpdatedAt = DateTime.UtcNow;

            if (consent.Id == Guid.Empty)
            {
                _context.SocialPrivacyConsents.Add(consent);
            }

            await _context.SaveChangesAsync();

            return new SocialPreferences
            {
                AllowSocialSharing = request.AllowSocialSharing,
                AllowFriendDiscovery = request.AllowFriendDiscovery,
                AllowRecommendations = request.AllowRecommendations,
                AllowActivityTracking = request.AllowActivityTracking,
                PreferredPlatforms = request.PreferredPlatforms ?? Array.Empty<string>(),
                PlatformSettings = request.PlatformSettings ?? new Dictionary<string, object>()
            };
        }
        catch (Exception ex)
        {
            await _logger.LogAsync("ERROR", $"Failed to update social preferences: {ex.Message}");
            throw;
        }
    }

    private string GetClientIpAddress()
    {
        // This should be implemented to get the actual client IP from HttpContext
        return "127.0.0.1";
    }

    private string GetUserAgent()
    {
        // This should be implemented to get the actual user agent from HttpContext
        return "GeoLeap-Social-Client/1.0";
    }

    #endregion
}

// SocialPlatformConfig is defined in Models/SocialAuthModels.cs

/// <summary>
/// Interface for enhanced social authentication service
/// </summary>
public interface IEnhancedSocialAuthService
{
    Task<OAuthInitiationResult> InitiateOAuthFlowAsync(string platform, Guid userId, string redirectUrl, 
        string[]? scopes = null, Dictionary<string, string>? additionalParams = null);
    Task<OAuthCallbackResult> HandleOAuthCallbackAsync(string platform, string code, string state);
    Task<TokenValidationResult> ValidateAndRefreshTokenAsync(Guid userId, string platform);
    Task<TokenRefreshResult> RefreshAccessTokenAsync(Guid userId, string platform);
    Task<ServiceResult> RevokeTokenAsync(Guid userId, string platform, string reason = "user_request");
    Task<List<ExpiringToken>> GetExpiringTokensAsync(int hoursUntilExpiry = 24);
    Task<List<SocialPlatformInfo>> GetSupportedPlatformsAsync();
}