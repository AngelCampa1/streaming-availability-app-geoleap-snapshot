using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

/// <summary>
/// Factory for creating social media platform providers
/// </summary>
public class SocialPlatformProviderFactory : ISocialPlatformProviderFactory
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<SocialPlatformProviderFactory> _logger;
    private readonly Dictionary<string, Type> _providerTypes;

    public SocialPlatformProviderFactory(IServiceProvider serviceProvider, ILogger<SocialPlatformProviderFactory> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
        
        // Map platform names to provider types
        _providerTypes = new Dictionary<string, Type>(StringComparer.OrdinalIgnoreCase)
        {
            ["facebook"] = typeof(FacebookProvider),
            ["twitter"] = typeof(TwitterProvider), 
            ["instagram"] = typeof(InstagramProvider),
            ["tiktok"] = typeof(TikTokProvider)
        };
    }

    public async Task<ISocialPlatformProvider> GetProviderAsync(string platform)
    {
        if (!_providerTypes.TryGetValue(platform, out var providerType))
        {
            throw new ArgumentException($"Unsupported platform: {platform}");
        }

        try
        {
            var provider = _serviceProvider.GetRequiredService(providerType) as ISocialPlatformProvider;
            if (provider == null)
            {
                throw new InvalidOperationException($"Failed to create provider for platform {platform}");
            }

            return provider;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating provider for platform {Platform}", platform);
            throw;
        }
    }

    public async Task<List<ISocialPlatformProvider>> GetAllProvidersAsync()
    {
        var providers = new List<ISocialPlatformProvider>();
        
        foreach (var kvp in _providerTypes)
        {
            try
            {
                var provider = await GetProviderAsync(kvp.Key);
                providers.Add(provider);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to load provider for platform {Platform}", kvp.Key);
            }
        }

        return providers;
    }

    public bool IsPlatformSupported(string platform)
    {
        return _providerTypes.ContainsKey(platform);
    }
}

/// <summary>
/// Base class for social media platform providers
/// </summary>
public abstract class BaseSocialPlatformProvider : ISocialPlatformProvider
{
    protected readonly IHttpClientFactory _httpClientFactory;
    protected readonly IConfiguration _configuration;
    protected readonly ILogger _logger;
    protected readonly string _clientId;
    protected readonly string _clientSecret;

    public abstract string PlatformName { get; }
    public abstract string DisplayName { get; }

    protected BaseSocialPlatformProvider(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger logger)
    {
        _httpClientFactory = httpClientFactory;
        _configuration = configuration;
        _logger = logger;
        
        var section = $"SocialAuth:{PlatformName}";
        _clientId = _configuration[$"{section}:ClientId"] ?? 
            throw new InvalidOperationException($"Missing configuration: {section}:ClientId");
        _clientSecret = _configuration[$"{section}:ClientSecret"] ?? 
            throw new InvalidOperationException($"Missing configuration: {section}:ClientSecret");
    }

    public abstract Task<string> GenerateAuthorizationUrlAsync(string redirectUrl, string state, string[] scopes);
    
    public abstract Task<TokenExchangeResult> ExchangeCodeForTokensAsync(string code, string redirectUrl);
    
    public abstract Task<TokenExchangeResult> RefreshTokensAsync(string refreshToken);
    
    public abstract Task RevokeTokenAsync(string accessToken);
    
    public abstract Task<SocialProfile?> GetUserProfileAsync(string accessToken, bool includePrivateData = false);
    
    public abstract Task<SocialFriendsResult> GetFriendsAsync(string accessToken, int limit = 50, string? cursor = null);
    
    public abstract Task<SocialPostResult> PostContentAsync(string accessToken, SocialPostRequest request);
    
    public abstract Dictionary<string, int> GetRateLimits();
    
    public abstract Task<bool> ValidateTokenAsync(string accessToken);
    
    public abstract string[] GetSupportedScopes();
    
    protected async Task<HttpClient> CreateHttpClientAsync()
    {
        var client = _httpClientFactory.CreateClient();
        client.DefaultRequestHeaders.Add("User-Agent", "GeoLeap/1.0");
        return client;
    }
}

/// <summary>
/// Facebook/Meta platform provider
/// </summary>
public class FacebookProvider : BaseSocialPlatformProvider
{
    private const string BaseUrl = "https://graph.facebook.com/v18.0";
    private const string AuthUrl = "https://www.facebook.com/v18.0/dialog/oauth";

    public override string PlatformName => "facebook";
    public override string DisplayName => "Facebook";

    public FacebookProvider(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<FacebookProvider> logger)
        : base(httpClientFactory, configuration, logger)
    {
    }

    public override Task<string> GenerateAuthorizationUrlAsync(string redirectUrl, string state, string[] scopes)
    {
        var scopeString = string.Join(",", scopes);
        var authUrl = $"{AuthUrl}?client_id={_clientId}&redirect_uri={Uri.EscapeDataString(redirectUrl)}&scope={Uri.EscapeDataString(scopeString)}&state={state}&response_type=code";
        return Task.FromResult(authUrl);
    }

    public override async Task<TokenExchangeResult> ExchangeCodeForTokensAsync(string code, string redirectUrl)
    {
        try
        {
            using var client = await CreateHttpClientAsync();
            
            var tokenUrl = $"{BaseUrl}/oauth/access_token";
            var parameters = new Dictionary<string, string>
            {
                ["client_id"] = _clientId,
                ["client_secret"] = _clientSecret,
                ["redirect_uri"] = redirectUrl,
                ["code"] = code
            };

            var response = await client.PostAsync(tokenUrl, new FormUrlEncodedContent(parameters));
            var content = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                return new TokenExchangeResult 
                { 
                    IsSuccess = false, 
                    ErrorMessage = $"Facebook token exchange failed: {content}" 
                };
            }

            var tokenData = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(content);
            
            var tokens = new OAuthTokens
            {
                AccessToken = tokenData["access_token"].ToString()!,
                TokenType = "Bearer",
                ExpiresIn = int.Parse(tokenData["expires_in"].ToString()!),
                IssuedAt = DateTime.UtcNow
            };

            return new TokenExchangeResult
            {
                IsSuccess = true,
                Tokens = tokens,
                GrantedScopes = new[] { "public_profile", "email" }
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error exchanging Facebook authorization code");
            return new TokenExchangeResult 
            { 
                IsSuccess = false, 
                ErrorMessage = "Failed to exchange authorization code" 
            };
        }
    }

    public override async Task<TokenExchangeResult> RefreshTokensAsync(string refreshToken)
    {
        // Facebook access tokens are long-lived and don't need refresh
        // We would need to exchange short-lived tokens for long-lived ones
        return new TokenExchangeResult 
        { 
            IsSuccess = false, 
            ErrorMessage = "Facebook tokens do not support refresh" 
        };
    }

    public override async Task RevokeTokenAsync(string accessToken)
    {
        try
        {
            using var client = await CreateHttpClientAsync();
            var revokeUrl = $"{BaseUrl}/me/permissions?access_token={accessToken}";
            await client.DeleteAsync(revokeUrl);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error revoking Facebook token");
        }
    }

    public override async Task<SocialProfile?> GetUserProfileAsync(string accessToken, bool includePrivateData = false)
    {
        try
        {
            using var client = await CreateHttpClientAsync();
            
            var fields = includePrivateData 
                ? "id,name,email,picture.type(large),friends.summary(true)"
                : "id,name,picture.type(large)";
            
            var profileUrl = $"{BaseUrl}/me?fields={fields}&access_token={accessToken}";
            var response = await client.GetAsync(profileUrl);
            var content = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                return null;
            }

            var profileData = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(content);
            
            return new SocialProfile
            {
                Id = profileData["id"].ToString()!,
                Username = profileData["id"].ToString()!, // Facebook uses ID as username
                DisplayName = profileData.GetValueOrDefault("name")?.ToString() ?? "",
                Email = profileData.GetValueOrDefault("email")?.ToString() ?? "",
                ProfileImageUrl = ExtractProfileImageUrl(profileData),
                FollowersCount = ExtractFriendsCount(profileData),
                AdditionalData = profileData
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting Facebook user profile");
            return null;
        }
    }

    public override async Task<SocialFriendsResult> GetFriendsAsync(string accessToken, int limit = 50, string? cursor = null)
    {
        try
        {
            using var client = await CreateHttpClientAsync();
            
            var friendsUrl = $"{BaseUrl}/me/friends?limit={limit}&access_token={accessToken}";
            if (!string.IsNullOrEmpty(cursor))
            {
                friendsUrl += $"&after={cursor}";
            }

            var response = await client.GetAsync(friendsUrl);
            var content = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                return new SocialFriendsResult 
                { 
                    IsSuccess = false, 
                    ErrorMessage = "Failed to retrieve Facebook friends" 
                };
            }

            var friendsData = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(content);
            var friends = new List<SocialFriend>();

            if (friendsData.ContainsKey("data"))
            {
                var friendsList = System.Text.Json.JsonSerializer.Deserialize<List<Dictionary<string, object>>>(
                    friendsData["data"].ToString()!);

                friends = friendsList.Select(f => new SocialFriend
                {
                    Id = f["id"].ToString()!,
                    Username = f["id"].ToString()!,
                    DisplayName = f.GetValueOrDefault("name")?.ToString() ?? "",
                    ConnectionType = "friend"
                }).ToList();
            }

            var paging = friendsData.GetValueOrDefault("paging") as Dictionary<string, object>;
            var nextCursor = paging?.GetValueOrDefault("cursors") as Dictionary<string, object>;
            
            return new SocialFriendsResult
            {
                IsSuccess = true,
                Friends = friends,
                NextCursor = nextCursor?.GetValueOrDefault("after")?.ToString(),
                TotalCount = friends.Count
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting Facebook friends");
            return new SocialFriendsResult 
            { 
                IsSuccess = false, 
                ErrorMessage = "Failed to retrieve friends" 
            };
        }
    }

    public override async Task<SocialPostResult> PostContentAsync(string accessToken, SocialPostRequest request)
    {
        try
        {
            using var client = await CreateHttpClientAsync();
            
            var postUrl = $"{BaseUrl}/me/feed";
            var parameters = new Dictionary<string, string>
            {
                ["message"] = request.Content,
                ["access_token"] = accessToken
            };

            var response = await client.PostAsync(postUrl, new FormUrlEncodedContent(parameters));
            var content = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                return new SocialPostResult 
                { 
                    IsSuccess = false, 
                    ErrorMessage = $"Facebook post failed: {content}" 
                };
            }

            var postData = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(content);
            var postId = postData["id"].ToString()!;

            return new SocialPostResult
            {
                IsSuccess = true,
                PostId = postId,
                PostUrl = $"https://facebook.com/{postId}"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error posting to Facebook");
            return new SocialPostResult 
            { 
                IsSuccess = false, 
                ErrorMessage = "Failed to post content" 
            };
        }
    }

    public override Dictionary<string, int> GetRateLimits()
    {
        return new Dictionary<string, int>
        {
            ["requests_per_hour"] = 200,
            ["requests_per_day"] = 4800
        };
    }

    public override async Task<bool> ValidateTokenAsync(string accessToken)
    {
        try
        {
            using var client = await CreateHttpClientAsync();
            var validateUrl = $"{BaseUrl}/me?access_token={accessToken}";
            var response = await client.GetAsync(validateUrl);
            return response.IsSuccessStatusCode;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to validate Facebook access token");
            return false;
        }
    }

    public override string[] GetSupportedScopes()
    {
        return new[] { "public_profile", "email", "user_friends", "user_posts", "publish_to_groups" };
    }

    private string ExtractProfileImageUrl(Dictionary<string, object> profileData)
    {
        try
        {
            if (profileData.ContainsKey("picture"))
            {
                var picture = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(
                    profileData["picture"].ToString()!);
                var data = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(
                    picture["data"].ToString()!);
                return data["url"].ToString()!;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to extract profile picture URL from Facebook data");
        }
        
        return "";
    }

    private int ExtractFriendsCount(Dictionary<string, object> profileData)
    {
        try
        {
            if (profileData.ContainsKey("friends"))
            {
                var friends = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(
                    profileData["friends"].ToString()!);
                var summary = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(
                    friends["summary"].ToString()!);
                return int.Parse(summary["total_count"].ToString()!);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to extract friends count from Facebook data");
        }
        
        return 0;
    }
}

/// <summary>
/// Twitter/X platform provider implementation
/// </summary>
public class TwitterProvider : BaseSocialPlatformProvider
{
    public override string PlatformName => "twitter";
    public override string DisplayName => "Twitter/X";

    public TwitterProvider(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<TwitterProvider> logger)
        : base(httpClientFactory, configuration, logger)
    {
    }

    public override Task<string> GenerateAuthorizationUrlAsync(string redirectUrl, string state, string[] scopes)
    {
        try
        {
            var scopeString = string.Join(" ", scopes);
            var authUrl = $"https://twitter.com/i/oauth2/authorize?response_type=code&client_id={_clientId}&redirect_uri={Uri.EscapeDataString(redirectUrl)}&scope={Uri.EscapeDataString(scopeString)}&state={state}&code_challenge=challenge&code_challenge_method=plain";
            
            _logger.LogInformation("Generated Twitter authorization URL for state {State}", state);
            return Task.FromResult(authUrl);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating Twitter authorization URL");
            throw;
        }
    }

    public override async Task<TokenExchangeResult> ExchangeCodeForTokensAsync(string code, string redirectUrl)
    {
        try
        {
            using var client = await CreateHttpClientAsync();
            
            var tokenUrl = "https://api.twitter.com/2/oauth2/token";
            var parameters = new Dictionary<string, string>
            {
                ["code"] = code,
                ["grant_type"] = "authorization_code",
                ["client_id"] = _clientId,
                ["redirect_uri"] = redirectUrl,
                ["code_verifier"] = "challenge"
            };

            var authHeader = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes($"{_clientId}:{_clientSecret}"));
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", authHeader);

            var response = await client.PostAsync(tokenUrl, new FormUrlEncodedContent(parameters));
            var content = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Twitter token exchange failed: {Content}", content);
                return new TokenExchangeResult 
                { 
                    IsSuccess = false, 
                    ErrorMessage = $"Twitter token exchange failed: {content}" 
                };
            }

            var tokenData = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(content);
            
            var tokens = new OAuthTokens
            {
                AccessToken = tokenData["access_token"].ToString()!,
                RefreshToken = tokenData.ContainsKey("refresh_token") ? tokenData["refresh_token"].ToString() : null,
                TokenType = "Bearer",
                ExpiresIn = tokenData.ContainsKey("expires_in") ? int.Parse(tokenData["expires_in"].ToString()!) : 7200,
                Scope = tokenData.ContainsKey("scope") ? tokenData["scope"].ToString()! : string.Join(" ", GetSupportedScopes()),
                IssuedAt = DateTime.UtcNow
            };

            _logger.LogInformation("Successfully exchanged Twitter authorization code for tokens");
            return new TokenExchangeResult
            {
                IsSuccess = true,
                Tokens = tokens,
                GrantedScopes = tokens.Scope.Split(' ')
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error exchanging Twitter authorization code");
            return new TokenExchangeResult 
            { 
                IsSuccess = false, 
                ErrorMessage = "Failed to exchange authorization code" 
            };
        }
    }

    public override async Task<TokenExchangeResult> RefreshTokensAsync(string refreshToken)
    {
        try
        {
            using var client = await CreateHttpClientAsync();
            
            var tokenUrl = "https://api.twitter.com/2/oauth2/token";
            var parameters = new Dictionary<string, string>
            {
                ["refresh_token"] = refreshToken,
                ["grant_type"] = "refresh_token",
                ["client_id"] = _clientId
            };

            var authHeader = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes($"{_clientId}:{_clientSecret}"));
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", authHeader);

            var response = await client.PostAsync(tokenUrl, new FormUrlEncodedContent(parameters));
            var content = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Twitter token refresh failed: {Content}", content);
                return new TokenExchangeResult 
                { 
                    IsSuccess = false, 
                    ErrorMessage = $"Twitter token refresh failed: {content}" 
                };
            }

            var tokenData = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(content);
            
            var tokens = new OAuthTokens
            {
                AccessToken = tokenData["access_token"].ToString()!,
                RefreshToken = tokenData.ContainsKey("refresh_token") ? tokenData["refresh_token"].ToString() : refreshToken,
                TokenType = "Bearer",
                ExpiresIn = tokenData.ContainsKey("expires_in") ? int.Parse(tokenData["expires_in"].ToString()!) : 7200,
                IssuedAt = DateTime.UtcNow
            };

            _logger.LogInformation("Successfully refreshed Twitter tokens");
            return new TokenExchangeResult
            {
                IsSuccess = true,
                Tokens = tokens
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error refreshing Twitter tokens");
            return new TokenExchangeResult 
            { 
                IsSuccess = false, 
                ErrorMessage = "Failed to refresh tokens" 
            };
        }
    }

    public override async Task RevokeTokenAsync(string accessToken)
    {
        try
        {
            using var client = await CreateHttpClientAsync();
            
            var revokeUrl = "https://api.twitter.com/2/oauth2/revoke";
            var parameters = new Dictionary<string, string>
            {
                ["token"] = accessToken,
                ["client_id"] = _clientId
            };

            var authHeader = Convert.ToBase64String(System.Text.Encoding.UTF8.GetBytes($"{_clientId}:{_clientSecret}"));
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Basic", authHeader);

            var response = await client.PostAsync(revokeUrl, new FormUrlEncodedContent(parameters));
            
            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("Successfully revoked Twitter token");
            }
            else
            {
                _logger.LogWarning("Failed to revoke Twitter token: {StatusCode}", response.StatusCode);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error revoking Twitter token");
        }
    }

    public override async Task<SocialProfile?> GetUserProfileAsync(string accessToken, bool includePrivateData = false)
    {
        try
        {
            using var client = await CreateHttpClientAsync();
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
            
            var fields = includePrivateData 
                ? "id,name,username,profile_image_url,description,public_metrics,verified"
                : "id,name,username,profile_image_url,verified";
            
            var profileUrl = $"https://api.twitter.com/2/users/me?user.fields={fields}";
            var response = await client.GetAsync(profileUrl);
            var content = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Failed to get Twitter user profile: {Content}", content);
                return null;
            }

            var responseData = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(content);
            if (!responseData.ContainsKey("data")) return null;
            
            var userData = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(responseData["data"].ToString()!);
            
            var profile = new SocialProfile
            {
                Id = userData["id"].ToString()!,
                Username = userData.GetValueOrDefault("username")?.ToString() ?? "",
                DisplayName = userData.GetValueOrDefault("name")?.ToString() ?? "",
                ProfileImageUrl = userData.GetValueOrDefault("profile_image_url")?.ToString() ?? "",
                Bio = userData.GetValueOrDefault("description")?.ToString() ?? "",
                IsVerified = userData.ContainsKey("verified") && bool.Parse(userData["verified"].ToString()!),
                AdditionalData = userData
            };

            if (includePrivateData && userData.ContainsKey("public_metrics"))
            {
                var metrics = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(userData["public_metrics"].ToString()!);
                if (metrics.ContainsKey("followers_count"))
                    profile.FollowersCount = int.Parse(metrics["followers_count"].ToString()!);
                if (metrics.ContainsKey("following_count"))
                    profile.FollowingCount = int.Parse(metrics["following_count"].ToString()!);
            }

            _logger.LogInformation("Successfully retrieved Twitter user profile for user {UserId}", profile.Id);
            return profile;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting Twitter user profile");
            return null;
        }
    }

    public override async Task<SocialFriendsResult> GetFriendsAsync(string accessToken, int limit = 50, string? cursor = null)
    {
        try
        {
            using var client = await CreateHttpClientAsync();
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
            
            var followingUrl = $"https://api.twitter.com/2/users/me/following?max_results={Math.Min(limit, 1000)}&user.fields=id,name,username,profile_image_url,verified";
            if (!string.IsNullOrEmpty(cursor))
            {
                followingUrl += $"&pagination_token={cursor}";
            }

            var response = await client.GetAsync(followingUrl);
            var content = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Failed to get Twitter following: {Content}", content);
                return new SocialFriendsResult 
                { 
                    IsSuccess = false, 
                    ErrorMessage = "Failed to retrieve Twitter following" 
                };
            }

            var responseData = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(content);
            var friends = new List<SocialFriend>();

            if (responseData.ContainsKey("data"))
            {
                var friendsList = System.Text.Json.JsonSerializer.Deserialize<List<Dictionary<string, object>>>(
                    responseData["data"].ToString()!);

                friends = friendsList.Select(f => new SocialFriend
                {
                    Id = f["id"].ToString()!,
                    Username = f.GetValueOrDefault("username")?.ToString() ?? "",
                    DisplayName = f.GetValueOrDefault("name")?.ToString() ?? "",
                    ProfileImageUrl = f.GetValueOrDefault("profile_image_url")?.ToString() ?? "",
                    ConnectionType = "following"
                }).ToList();
            }

            var nextCursor = string.Empty;
            if (responseData.ContainsKey("meta"))
            {
                var meta = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(responseData["meta"].ToString()!);
                nextCursor = meta.GetValueOrDefault("next_token")?.ToString();
            }
            
            _logger.LogInformation("Successfully retrieved {Count} Twitter following", friends.Count);
            return new SocialFriendsResult
            {
                IsSuccess = true,
                Friends = friends,
                NextCursor = nextCursor,
                TotalCount = friends.Count
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting Twitter friends");
            return new SocialFriendsResult 
            { 
                IsSuccess = false, 
                ErrorMessage = "Failed to retrieve friends" 
            };
        }
    }

    public override async Task<SocialPostResult> PostContentAsync(string accessToken, SocialPostRequest request)
    {
        try
        {
            using var client = await CreateHttpClientAsync();
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
            
            var postUrl = "https://api.twitter.com/2/tweets";
            var tweetData = new
            {
                text = request.Content
            };

            var jsonContent = new StringContent(
                System.Text.Json.JsonSerializer.Serialize(tweetData),
                System.Text.Encoding.UTF8,
                "application/json");

            var response = await client.PostAsync(postUrl, jsonContent);
            var content = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Twitter post failed: {Content}", content);
                return new SocialPostResult 
                { 
                    IsSuccess = false, 
                    ErrorMessage = $"Twitter post failed: {content}" 
                };
            }

            var responseData = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(content);
            if (!responseData.ContainsKey("data")) 
            {
                return new SocialPostResult 
                { 
                    IsSuccess = false, 
                    ErrorMessage = "Invalid response from Twitter API" 
                };
            }

            var tweetInfo = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(responseData["data"].ToString()!);
            var tweetId = tweetInfo["id"].ToString()!;

            _logger.LogInformation("Successfully posted tweet with ID {TweetId}", tweetId);
            return new SocialPostResult
            {
                IsSuccess = true,
                PostId = tweetId,
                PostUrl = $"https://twitter.com/i/status/{tweetId}"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error posting to Twitter");
            return new SocialPostResult 
            { 
                IsSuccess = false, 
                ErrorMessage = "Failed to post content" 
            };
        }
    }

    public override Dictionary<string, int> GetRateLimits()
    {
        return new Dictionary<string, int>
        {
            ["requests_per_15min"] = 300
        };
    }

    public override async Task<bool> ValidateTokenAsync(string accessToken)
    {
        try
        {
            using var client = await CreateHttpClientAsync();
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
            
            var validateUrl = "https://api.twitter.com/2/users/me";
            var response = await client.GetAsync(validateUrl);
            
            var isValid = response.IsSuccessStatusCode;
            _logger.LogInformation("Twitter token validation result: {IsValid}", isValid);
            return isValid;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating Twitter token");
            return false;
        }
    }

    public override string[] GetSupportedScopes()
    {
        return new[] { "tweet.read", "tweet.write", "users.read", "follows.read", "follows.write" };
    }
}

/// <summary>
/// Instagram platform provider (placeholder)
/// </summary>
public class InstagramProvider : BaseSocialPlatformProvider
{
    public override string PlatformName => "instagram";
    public override string DisplayName => "Instagram";

    public InstagramProvider(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<InstagramProvider> logger)
        : base(httpClientFactory, configuration, logger)
    {
    }

    public override Task<string> GenerateAuthorizationUrlAsync(string redirectUrl, string state, string[] scopes)
    {
        try
        {
            var scopeString = string.Join(",", scopes);
            var authUrl = $"https://api.instagram.com/oauth/authorize?client_id={_clientId}&redirect_uri={Uri.EscapeDataString(redirectUrl)}&scope={Uri.EscapeDataString(scopeString)}&response_type=code&state={state}";
            
            _logger.LogInformation("Generated Instagram authorization URL for state {State}", state);
            return Task.FromResult(authUrl);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating Instagram authorization URL");
            throw;
        }
    }

    public override async Task<TokenExchangeResult> ExchangeCodeForTokensAsync(string code, string redirectUrl)
    {
        try
        {
            using var client = await CreateHttpClientAsync();
            
            var tokenUrl = "https://api.instagram.com/oauth/access_token";
            var parameters = new Dictionary<string, string>
            {
                ["client_id"] = _clientId,
                ["client_secret"] = _clientSecret,
                ["grant_type"] = "authorization_code",
                ["redirect_uri"] = redirectUrl,
                ["code"] = code
            };

            var response = await client.PostAsync(tokenUrl, new FormUrlEncodedContent(parameters));
            var content = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Instagram token exchange failed: {Content}", content);
                return new TokenExchangeResult 
                { 
                    IsSuccess = false, 
                    ErrorMessage = $"Instagram token exchange failed: {content}" 
                };
            }

            var tokenData = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(content);
            
            var tokens = new OAuthTokens
            {
                AccessToken = tokenData["access_token"].ToString()!,
                TokenType = "Bearer",
                ExpiresIn = tokenData.ContainsKey("expires_in") ? int.Parse(tokenData["expires_in"].ToString()!) : 3600,
                IssuedAt = DateTime.UtcNow
            };

            _logger.LogInformation("Successfully exchanged Instagram authorization code for tokens");
            return new TokenExchangeResult
            {
                IsSuccess = true,
                Tokens = tokens,
                GrantedScopes = new[] { "user_profile", "user_media" }
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error exchanging Instagram authorization code");
            return new TokenExchangeResult 
            { 
                IsSuccess = false, 
                ErrorMessage = "Failed to exchange authorization code" 
            };
        }
    }

    public override async Task<TokenExchangeResult> RefreshTokensAsync(string refreshToken)
    {
        try
        {
            using var client = await CreateHttpClientAsync();
            
            var tokenUrl = "https://graph.instagram.com/refresh_access_token";
            var parameters = new Dictionary<string, string>
            {
                ["grant_type"] = "ig_refresh_token",
                ["access_token"] = refreshToken
            };

            var queryString = string.Join("&", parameters.Select(kv => $"{kv.Key}={Uri.EscapeDataString(kv.Value)}"));
            var response = await client.GetAsync($"{tokenUrl}?{queryString}");
            var content = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Instagram token refresh failed: {Content}", content);
                return new TokenExchangeResult 
                { 
                    IsSuccess = false, 
                    ErrorMessage = $"Instagram token refresh failed: {content}" 
                };
            }

            var tokenData = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(content);
            
            var tokens = new OAuthTokens
            {
                AccessToken = tokenData["access_token"].ToString()!,
                TokenType = "Bearer",
                ExpiresIn = tokenData.ContainsKey("expires_in") ? int.Parse(tokenData["expires_in"].ToString()!) : 3600,
                IssuedAt = DateTime.UtcNow
            };

            _logger.LogInformation("Successfully refreshed Instagram tokens");
            return new TokenExchangeResult
            {
                IsSuccess = true,
                Tokens = tokens
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error refreshing Instagram tokens");
            return new TokenExchangeResult 
            { 
                IsSuccess = false, 
                ErrorMessage = "Failed to refresh tokens" 
            };
        }
    }

    public override async Task RevokeTokenAsync(string accessToken)
    {
        try
        {
            // Instagram doesn't have a specific revoke endpoint
            // The token will naturally expire or can be invalidated through the UI
            _logger.LogInformation("Instagram token revocation requested - token will expire naturally");
            await Task.CompletedTask;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during Instagram token revocation");
        }
    }

    public override async Task<SocialProfile?> GetUserProfileAsync(string accessToken, bool includePrivateData = false)
    {
        try
        {
            using var client = await CreateHttpClientAsync();
            
            var fields = includePrivateData 
                ? "id,username,account_type,media_count"
                : "id,username";
            
            var profileUrl = $"https://graph.instagram.com/me?fields={fields}&access_token={accessToken}";
            var response = await client.GetAsync(profileUrl);
            var content = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Failed to get Instagram user profile: {Content}", content);
                return null;
            }

            var userData = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(content);
            
            var profile = new SocialProfile
            {
                Id = userData["id"].ToString()!,
                Username = userData.GetValueOrDefault("username")?.ToString() ?? "",
                DisplayName = userData.GetValueOrDefault("username")?.ToString() ?? "",
                AdditionalData = userData
            };

            _logger.LogInformation("Successfully retrieved Instagram user profile for user {UserId}", profile.Id);
            return profile;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting Instagram user profile");
            return null;
        }
    }

    public override async Task<SocialFriendsResult> GetFriendsAsync(string accessToken, int limit = 50, string? cursor = null)
    {
        try
        {
            // Instagram Basic Display API doesn't provide friends/following endpoints
            // This would require Instagram Business API which needs approval
            _logger.LogInformation("Instagram friends API requires Business API approval - returning empty result");
            
            return new SocialFriendsResult
            {
                IsSuccess = true,
                Friends = new List<SocialFriend>(),
                NextCursor = null,
                TotalCount = 0
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting Instagram friends");
            return new SocialFriendsResult 
            { 
                IsSuccess = false, 
                ErrorMessage = "Failed to retrieve friends" 
            };
        }
    }

    public override async Task<SocialPostResult> PostContentAsync(string accessToken, SocialPostRequest request)
    {
        try
        {
            // Instagram Basic Display API is read-only
            // Posting requires Instagram Content Publishing API which needs approval
            _logger.LogInformation("Instagram posting requires Content Publishing API approval");
            
            return new SocialPostResult 
            { 
                IsSuccess = false, 
                ErrorMessage = "Instagram posting requires Content Publishing API approval" 
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error posting to Instagram");
            return new SocialPostResult 
            { 
                IsSuccess = false, 
                ErrorMessage = "Failed to post content" 
            };
        }
    }

    public override Dictionary<string, int> GetRateLimits()
    {
        return new Dictionary<string, int>
        {
            ["requests_per_hour"] = 100
        };
    }

    public override async Task<bool> ValidateTokenAsync(string accessToken)
    {
        try
        {
            using var client = await CreateHttpClientAsync();
            
            var validateUrl = $"https://graph.instagram.com/me?access_token={accessToken}";
            var response = await client.GetAsync(validateUrl);
            
            var isValid = response.IsSuccessStatusCode;
            _logger.LogInformation("Instagram token validation result: {IsValid}", isValid);
            return isValid;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating Instagram token");
            return false;
        }
    }

    public override string[] GetSupportedScopes()
    {
        return new[] { "user_profile", "user_media" };
    }
}

/// <summary>
/// TikTok platform provider (placeholder)
/// </summary>
public class TikTokProvider : BaseSocialPlatformProvider
{
    public override string PlatformName => "tiktok";
    public override string DisplayName => "TikTok";

    public TikTokProvider(
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<TikTokProvider> logger)
        : base(httpClientFactory, configuration, logger)
    {
    }

    public override Task<string> GenerateAuthorizationUrlAsync(string redirectUrl, string state, string[] scopes)
    {
        try
        {
            var scopeString = string.Join(",", scopes);
            var authUrl = $"https://www.tiktok.com/auth/authorize/?client_key={_clientId}&scope={Uri.EscapeDataString(scopeString)}&response_type=code&redirect_uri={Uri.EscapeDataString(redirectUrl)}&state={state}";
            
            _logger.LogInformation("Generated TikTok authorization URL for state {State}", state);
            return Task.FromResult(authUrl);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating TikTok authorization URL");
            throw;
        }
    }

    public override async Task<TokenExchangeResult> ExchangeCodeForTokensAsync(string code, string redirectUrl)
    {
        try
        {
            using var client = await CreateHttpClientAsync();
            
            var tokenUrl = "https://open-api.tiktok.com/oauth/access_token/";
            var parameters = new
            {
                client_key = _clientId,
                client_secret = _clientSecret,
                code = code,
                grant_type = "authorization_code",
                redirect_uri = redirectUrl
            };

            var jsonContent = new StringContent(
                System.Text.Json.JsonSerializer.Serialize(parameters),
                System.Text.Encoding.UTF8,
                "application/json");

            var response = await client.PostAsync(tokenUrl, jsonContent);
            var content = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("TikTok token exchange failed: {Content}", content);
                return new TokenExchangeResult 
                { 
                    IsSuccess = false, 
                    ErrorMessage = $"TikTok token exchange failed: {content}" 
                };
            }

            var responseData = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(content);
            
            if (!responseData.ContainsKey("data"))
            {
                return new TokenExchangeResult 
                { 
                    IsSuccess = false, 
                    ErrorMessage = "Invalid response from TikTok API" 
                };
            }

            var tokenData = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(responseData["data"].ToString()!);
            
            var tokens = new OAuthTokens
            {
                AccessToken = tokenData["access_token"].ToString()!,
                RefreshToken = tokenData.ContainsKey("refresh_token") ? tokenData["refresh_token"].ToString() : null,
                TokenType = "Bearer",
                ExpiresIn = tokenData.ContainsKey("expires_in") ? int.Parse(tokenData["expires_in"].ToString()!) : 86400,
                Scope = tokenData.ContainsKey("scope") ? tokenData["scope"].ToString()! : string.Join(",", GetSupportedScopes()),
                IssuedAt = DateTime.UtcNow
            };

            _logger.LogInformation("Successfully exchanged TikTok authorization code for tokens");
            return new TokenExchangeResult
            {
                IsSuccess = true,
                Tokens = tokens,
                GrantedScopes = tokens.Scope.Split(',')
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error exchanging TikTok authorization code");
            return new TokenExchangeResult 
            { 
                IsSuccess = false, 
                ErrorMessage = "Failed to exchange authorization code" 
            };
        }
    }

    public override async Task<TokenExchangeResult> RefreshTokensAsync(string refreshToken)
    {
        try
        {
            using var client = await CreateHttpClientAsync();
            
            var tokenUrl = "https://open-api.tiktok.com/oauth/refresh_token/";
            var parameters = new
            {
                client_key = _clientId,
                client_secret = _clientSecret,
                grant_type = "refresh_token",
                refresh_token = refreshToken
            };

            var jsonContent = new StringContent(
                System.Text.Json.JsonSerializer.Serialize(parameters),
                System.Text.Encoding.UTF8,
                "application/json");

            var response = await client.PostAsync(tokenUrl, jsonContent);
            var content = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("TikTok token refresh failed: {Content}", content);
                return new TokenExchangeResult 
                { 
                    IsSuccess = false, 
                    ErrorMessage = $"TikTok token refresh failed: {content}" 
                };
            }

            var responseData = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(content);
            
            if (!responseData.ContainsKey("data"))
            {
                return new TokenExchangeResult 
                { 
                    IsSuccess = false, 
                    ErrorMessage = "Invalid response from TikTok API" 
                };
            }

            var tokenData = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(responseData["data"].ToString()!);
            
            var tokens = new OAuthTokens
            {
                AccessToken = tokenData["access_token"].ToString()!,
                RefreshToken = tokenData.ContainsKey("refresh_token") ? tokenData["refresh_token"].ToString() : refreshToken,
                TokenType = "Bearer",
                ExpiresIn = tokenData.ContainsKey("expires_in") ? int.Parse(tokenData["expires_in"].ToString()!) : 86400,
                IssuedAt = DateTime.UtcNow
            };

            _logger.LogInformation("Successfully refreshed TikTok tokens");
            return new TokenExchangeResult
            {
                IsSuccess = true,
                Tokens = tokens
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error refreshing TikTok tokens");
            return new TokenExchangeResult 
            { 
                IsSuccess = false, 
                ErrorMessage = "Failed to refresh tokens" 
            };
        }
    }

    public override async Task RevokeTokenAsync(string accessToken)
    {
        try
        {
            using var client = await CreateHttpClientAsync();
            
            var revokeUrl = "https://open-api.tiktok.com/oauth/revoke/";
            var parameters = new
            {
                client_key = _clientId,
                client_secret = _clientSecret,
                token = accessToken
            };

            var jsonContent = new StringContent(
                System.Text.Json.JsonSerializer.Serialize(parameters),
                System.Text.Encoding.UTF8,
                "application/json");

            var response = await client.PostAsync(revokeUrl, jsonContent);
            
            if (response.IsSuccessStatusCode)
            {
                _logger.LogInformation("Successfully revoked TikTok token");
            }
            else
            {
                _logger.LogWarning("Failed to revoke TikTok token: {StatusCode}", response.StatusCode);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error revoking TikTok token");
        }
    }

    public override async Task<SocialProfile?> GetUserProfileAsync(string accessToken, bool includePrivateData = false)
    {
        try
        {
            using var client = await CreateHttpClientAsync();
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
            
            var fields = includePrivateData 
                ? "open_id,union_id,avatar_url,display_name,bio_description,profile_deep_link,is_verified,follower_count,following_count,likes_count,video_count"
                : "open_id,avatar_url,display_name";
            
            var profileUrl = $"https://open-api.tiktok.com/user/info/?fields={fields}";
            var response = await client.GetAsync(profileUrl);
            var content = await response.Content.ReadAsStringAsync();

            if (!response.IsSuccessStatusCode)
            {
                _logger.LogError("Failed to get TikTok user profile: {Content}", content);
                return null;
            }

            var responseData = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(content);
            if (!responseData.ContainsKey("data")) return null;
            
            var userData = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(responseData["data"].ToString()!);
            if (!userData.ContainsKey("user")) return null;
            
            var userInfo = System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(userData["user"].ToString()!);
            
            var profile = new SocialProfile
            {
                Id = userInfo.GetValueOrDefault("open_id")?.ToString() ?? "",
                Username = userInfo.GetValueOrDefault("union_id")?.ToString() ?? "",
                DisplayName = userInfo.GetValueOrDefault("display_name")?.ToString() ?? "",
                ProfileImageUrl = userInfo.GetValueOrDefault("avatar_url")?.ToString() ?? "",
                Bio = userInfo.GetValueOrDefault("bio_description")?.ToString() ?? "",
                IsVerified = userInfo.ContainsKey("is_verified") && bool.Parse(userInfo["is_verified"].ToString()!),
                AdditionalData = userInfo
            };

            if (includePrivateData)
            {
                if (userInfo.ContainsKey("follower_count"))
                    profile.FollowersCount = int.Parse(userInfo["follower_count"].ToString()!);
                if (userInfo.ContainsKey("following_count"))
                    profile.FollowingCount = int.Parse(userInfo["following_count"].ToString()!);
            }

            _logger.LogInformation("Successfully retrieved TikTok user profile for user {UserId}", profile.Id);
            return profile;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting TikTok user profile");
            return null;
        }
    }

    public override async Task<SocialFriendsResult> GetFriendsAsync(string accessToken, int limit = 50, string? cursor = null)
    {
        try
        {
            // TikTok API doesn't provide friends/following endpoints in the current version
            _logger.LogInformation("TikTok friends API not available in current API version - returning empty result");
            
            return new SocialFriendsResult
            {
                IsSuccess = true,
                Friends = new List<SocialFriend>(),
                NextCursor = null,
                TotalCount = 0
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting TikTok friends");
            return new SocialFriendsResult 
            { 
                IsSuccess = false, 
                ErrorMessage = "Failed to retrieve friends" 
            };
        }
    }

    public override async Task<SocialPostResult> PostContentAsync(string accessToken, SocialPostRequest request)
    {
        try
        {
            // TikTok posting would require video upload which is complex
            // This would need the Content Posting API
            _logger.LogInformation("TikTok posting requires Content Posting API and video upload");
            
            return new SocialPostResult 
            { 
                IsSuccess = false, 
                ErrorMessage = "TikTok posting requires Content Posting API and video upload" 
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error posting to TikTok");
            return new SocialPostResult 
            { 
                IsSuccess = false, 
                ErrorMessage = "Failed to post content" 
            };
        }
    }

    public override Dictionary<string, int> GetRateLimits()
    {
        return new Dictionary<string, int>
        {
            ["requests_per_day"] = 1000
        };
    }

    public override async Task<bool> ValidateTokenAsync(string accessToken)
    {
        try
        {
            using var client = await CreateHttpClientAsync();
            client.DefaultRequestHeaders.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", accessToken);
            
            var validateUrl = "https://open-api.tiktok.com/user/info/?fields=open_id";
            var response = await client.GetAsync(validateUrl);
            
            var isValid = response.IsSuccessStatusCode;
            _logger.LogInformation("TikTok token validation result: {IsValid}", isValid);
            return isValid;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating TikTok token");
            return false;
        }
    }

    public override string[] GetSupportedScopes()
    {
        return new[] { "user.info.basic", "video.list" };
    }
}