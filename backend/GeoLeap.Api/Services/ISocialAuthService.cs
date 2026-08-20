using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service interface for OAuth 2.0 social media authentication
/// </summary>
public interface ISocialAuthService
{
    /// <summary>
    /// Initiate OAuth 2.0 authorization flow for social platform
    /// </summary>
    Task<OAuthInitiationResult> InitiateOAuthFlowAsync(string platform, Guid userId, string redirectUrl, string[]? scopes = null);
    
    /// <summary>
    /// Handle OAuth 2.0 callback and exchange code for tokens
    /// </summary>
    Task<OAuthCallbackResult> HandleCallbackAsync(string platform, string code, string state, Guid userId);
    
    /// <summary>
    /// Disconnect social media account and revoke tokens
    /// </summary>
    Task<ServiceResult> DisconnectAccountAsync(string platform, Guid userId);
    
    /// <summary>
    /// Get all connected social accounts for user
    /// </summary>
    Task<List<SocialConnection>> GetConnectedAccountsAsync(Guid userId);
    
    /// <summary>
    /// Get user profile data from social platform
    /// </summary>
    Task<SocialProfile?> GetSocialProfileAsync(string platform, Guid userId, bool includePrivateData = false);
    
    /// <summary>
    /// Get friends/connections from social platform
    /// </summary>
    Task<SocialFriendsResult> GetSocialFriendsAsync(string platform, Guid userId, int limit = 50, string? cursor = null);
    
    /// <summary>
    /// Post content to social media platform
    /// </summary>
    Task<SocialPostResult> PostToSocialMediaAsync(string platform, Guid userId, SocialPostRequest request);
    
    /// <summary>
    /// Get available social media platforms and their configurations
    /// </summary>
    Task<List<SocialPlatformInfo>> GetAvailablePlatformsAsync();
    
    /// <summary>
    /// Update user's social sharing preferences
    /// </summary>
    Task<SocialPreferences> UpdateSocialPreferencesAsync(Guid userId, UpdateSocialPreferencesRequest request);
    
    /// <summary>
    /// Get social analytics for user
    /// </summary>
    Task<SocialAnalytics> GetSocialAnalyticsAsync(Guid userId, DateTime? startDate = null, DateTime? endDate = null);
    
    /// <summary>
    /// Import user's social connections for friend discovery
    /// </summary>
    Task<SocialImportResult> ImportSocialConnectionsAsync(string platform, Guid userId, bool respectPrivacy = true);
    
    /// <summary>
    /// Get recommended content based on social network analysis
    /// </summary>
    Task<List<ContentRecommendation>> GetSocialRecommendationsAsync(Guid userId, string? contentType = null, int limit = 20);
    
    /// <summary>
    /// Track social activity for real-time feed updates
    /// </summary>
    Task TrackSocialActivityAsync(string platform, Guid userId, SocialActivityType activityType, Dictionary<string, object> metadata);
    
    /// <summary>
    /// Get real-time social activity feed for user
    /// </summary>
    Task<List<SocialActivity>> GetSocialActivityFeedAsync(Guid userId, int limit = 50, DateTime? since = null);
    
    /// <summary>
    /// Validate and refresh OAuth tokens if needed
    /// </summary>
    Task<TokenValidationResult> ValidateAndRefreshTokensAsync(string platform, Guid userId);
    
    /// <summary>
    /// Get user's privacy consent status for social features
    /// </summary>
    Task<SocialPrivacyConsent> GetPrivacyConsentAsync(Guid userId);
    
    /// <summary>
    /// Update user's privacy consent for social features
    /// </summary>
    Task UpdatePrivacyConsentAsync(Guid userId, SocialPrivacyConsent consent);
}