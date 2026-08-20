using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

/// <summary>
/// Factory interface for creating social media platform providers
/// </summary>
public interface ISocialPlatformProviderFactory
{
    /// <summary>
    /// Get provider for specified social media platform
    /// </summary>
    Task<ISocialPlatformProvider> GetProviderAsync(string platform);
    
    /// <summary>
    /// Get all available platform providers
    /// </summary>
    Task<List<ISocialPlatformProvider>> GetAllProvidersAsync();
    
    /// <summary>
    /// Check if platform is supported
    /// </summary>
    bool IsPlatformSupported(string platform);
}

/// <summary>
/// Interface for social media platform-specific providers
/// </summary>
public interface ISocialPlatformProvider
{
    /// <summary>
    /// Platform name (facebook, twitter, etc.)
    /// </summary>
    string PlatformName { get; }
    
    /// <summary>
    /// Platform display name
    /// </summary>
    string DisplayName { get; }
    
    /// <summary>
    /// Generate OAuth authorization URL
    /// </summary>
    Task<string> GenerateAuthorizationUrlAsync(string redirectUrl, string state, string[] scopes);
    
    /// <summary>
    /// Exchange authorization code for access tokens
    /// </summary>
    Task<TokenExchangeResult> ExchangeCodeForTokensAsync(string code, string redirectUrl);
    
    /// <summary>
    /// Refresh OAuth tokens
    /// </summary>
    Task<TokenExchangeResult> RefreshTokensAsync(string refreshToken);
    
    /// <summary>
    /// Revoke OAuth token
    /// </summary>
    Task RevokeTokenAsync(string accessToken);
    
    /// <summary>
    /// Get user profile information
    /// </summary>
    Task<SocialProfile?> GetUserProfileAsync(string accessToken, bool includePrivateData = false);
    
    /// <summary>
    /// Get user's friends/connections
    /// </summary>
    Task<SocialFriendsResult> GetFriendsAsync(string accessToken, int limit = 50, string? cursor = null);
    
    /// <summary>
    /// Post content to social media platform
    /// </summary>
    Task<SocialPostResult> PostContentAsync(string accessToken, SocialPostRequest request);
    
    /// <summary>
    /// Get platform-specific rate limits
    /// </summary>
    Dictionary<string, int> GetRateLimits();
    
    /// <summary>
    /// Validate access token
    /// </summary>
    Task<bool> ValidateTokenAsync(string accessToken);
    
    /// <summary>
    /// Get supported scopes for this platform
    /// </summary>
    string[] GetSupportedScopes();
}

/// <summary>
/// Result of token exchange operation
/// </summary>
public class TokenExchangeResult : ServiceResult
{
    public OAuthTokens? Tokens { get; set; }
    
    public string[]? GrantedScopes { get; set; }
}