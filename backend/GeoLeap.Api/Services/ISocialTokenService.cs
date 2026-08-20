using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service interface for secure OAuth token management
/// </summary>
public interface ISocialTokenService
{
    /// <summary>
    /// Store OAuth tokens securely with encryption
    /// </summary>
    Task<ServiceResult> StoreTokensAsync(string platform, Guid userId, OAuthTokens tokens);
    
    /// <summary>
    /// Retrieve and decrypt OAuth tokens for user
    /// </summary>
    Task<OAuthTokens?> GetTokensAsync(string platform, Guid userId);
    
    /// <summary>
    /// Refresh OAuth tokens using refresh token
    /// </summary>
    Task<TokenRefreshResult> RefreshTokensAsync(string platform, Guid userId);
    
    /// <summary>
    /// Validate if tokens are still valid and not expired
    /// </summary>
    Task<bool> ValidateTokensAsync(string platform, Guid userId);
    
    /// <summary>
    /// Revoke and delete stored tokens
    /// </summary>
    Task<ServiceResult> RevokeTokensAsync(string platform, Guid userId);
    
    /// <summary>
    /// Get token expiry information
    /// </summary>
    Task<TokenExpiryInfo?> GetTokenExpiryAsync(string platform, Guid userId);
    
    /// <summary>
    /// Update token metadata (last used, permissions, etc.)
    /// </summary>
    Task UpdateTokenMetadataAsync(string platform, Guid userId, Dictionary<string, object> metadata);
    
    /// <summary>
    /// Get all tokens that are about to expire for proactive refresh
    /// </summary>
    Task<List<ExpiringToken>> GetExpiringTokensAsync(TimeSpan beforeExpiry);
    
    /// <summary>
    /// Rotate encryption keys for enhanced security
    /// </summary>
    Task<ServiceResult> RotateEncryptionKeysAsync();
    
    /// <summary>
    /// Audit token usage and access patterns
    /// </summary>
    void LogTokenUsage(string platform, Guid userId, string operation, bool success, string? errorMessage = null);
}