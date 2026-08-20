using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using System.Security.Cryptography;
using System.Text;

namespace GeoLeap.Api.Services;

/// <summary>
/// OAuth 2.0 social media authentication service implementation
/// </summary>
public class SocialAuthService : ISocialAuthService
{
    private readonly ApplicationDbContext _context;
    private readonly ISocialTokenService _tokenService;
    private readonly ILoggerService _logger;
    private readonly IConfiguration _configuration;
    private readonly ISocialPlatformProviderFactory _providerFactory;
    private readonly ISocialRecommendationEngine _recommendationEngine;
    private readonly IPrivacyService _privacyService;
    
    private readonly Dictionary<string, SocialPlatformInfo> _supportedPlatforms = new()
    {
        ["facebook"] = new() 
        { 
            Name = "facebook", 
            DisplayName = "Facebook", 
            IsEnabled = true,
            RequiredScopes = new[] { "public_profile", "email" },
            OptionalScopes = new[] { "user_friends", "user_posts" },
            SupportsPosting = true,
            SupportsFriends = true,
            RateLimits = new Dictionary<string, int> { ["requests_per_hour"] = 200 }
        },
        ["twitter"] = new() 
        { 
            Name = "twitter", 
            DisplayName = "Twitter/X", 
            IsEnabled = true,
            RequiredScopes = new[] { "read", "write" },
            OptionalScopes = new[] { "users.read", "follows.read" },
            SupportsPosting = true,
            SupportsFriends = true,
            RateLimits = new Dictionary<string, int> { ["requests_per_15min"] = 300 }
        },
        ["instagram"] = new() 
        { 
            Name = "instagram", 
            DisplayName = "Instagram", 
            IsEnabled = true,
            RequiredScopes = new[] { "user_profile", "user_media" },
            OptionalScopes = new[] { "user_posts" },
            SupportsPosting = true,
            SupportsFriends = false,
            RateLimits = new Dictionary<string, int> { ["requests_per_hour"] = 100 }
        },
        ["tiktok"] = new() 
        { 
            Name = "tiktok", 
            DisplayName = "TikTok", 
            IsEnabled = true,
            RequiredScopes = new[] { "user.info.basic" },
            OptionalScopes = new[] { "video.list", "user.info.profile" },
            SupportsPosting = false,
            SupportsFriends = false,
            RateLimits = new Dictionary<string, int> { ["requests_per_day"] = 1000 }
        }
    };

    public SocialAuthService(
        ApplicationDbContext context,
        ISocialTokenService tokenService,
        ILoggerService logger,
        IConfiguration configuration,
        ISocialPlatformProviderFactory providerFactory,
        ISocialRecommendationEngine recommendationEngine,
        IPrivacyService privacyService)
    {
        _context = context;
        _tokenService = tokenService;
        _logger = logger;
        _configuration = configuration;
        _providerFactory = providerFactory;
        _recommendationEngine = recommendationEngine;
        _privacyService = privacyService;
    }

    public async Task<OAuthInitiationResult> InitiateOAuthFlowAsync(string platform, Guid userId, string redirectUrl, string[]? scopes = null)
    {
        try
        {
            if (!_supportedPlatforms.ContainsKey(platform.ToLower()))
            {
                return new OAuthInitiationResult 
                { 
                    IsSuccess = false, 
                    ErrorMessage = $"Unsupported platform: {platform}" 
                };
            }

            var platformInfo = _supportedPlatforms[platform.ToLower()];
            if (!platformInfo.IsEnabled)
            {
                return new OAuthInitiationResult 
                { 
                    IsSuccess = false, 
                    ErrorMessage = $"Platform {platform} is currently disabled" 
                };
            }

            // Generate secure state parameter
            var state = GenerateSecureState();
            var expiresAt = DateTime.UtcNow.AddMinutes(10);

            // Store OAuth state for verification
            var oauthState = new OAuthState
            {
                StateValue = state,
                UserId = userId,
                Platform = platform.ToLower(),
                RedirectUrl = redirectUrl,
                RequestedScopes = string.Join(",", scopes ?? platformInfo.RequiredScopes),
                ExpiresAt = expiresAt,
                IpAddress = GetClientIpAddress(),
                UserAgent = GetUserAgent()
            };

            _context.OAuthStates.Add(oauthState);
            await _context.SaveChangesAsync();

            // Get platform provider and generate authorization URL
            var provider = await _providerFactory.GetProviderAsync(platform);
            var authUrl = await provider.GenerateAuthorizationUrlAsync(
                redirectUrl, 
                state, 
                scopes ?? platformInfo.RequiredScopes
            );

            _logger.LogBusinessEvent("OAuth_Initiated", new 
            { 
                Platform = platform, 
                UserId = userId, 
                State = state 
            });

            return new OAuthInitiationResult
            {
                IsSuccess = true,
                AuthorizationUrl = authUrl,
                State = state,
                ExpiresAt = expiresAt
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error initiating OAuth flow for platform {Platform}", platform);
            return new OAuthInitiationResult 
            { 
                IsSuccess = false, 
                ErrorMessage = "Failed to initiate OAuth flow" 
            };
        }
    }

    public async Task<OAuthCallbackResult> HandleCallbackAsync(string platform, string code, string state, Guid userId)
    {
        try
        {
            // Validate OAuth state
            var storedState = await _context.OAuthStates
                .FirstOrDefaultAsync(s => s.StateValue == state && 
                                         s.UserId == userId && 
                                         s.Platform == platform.ToLower() && 
                                         !s.IsUsed && 
                                         s.ExpiresAt > DateTime.UtcNow);

            if (storedState == null)
            {
                return new OAuthCallbackResult 
                { 
                    IsSuccess = false, 
                    ErrorMessage = "Invalid or expired OAuth state" 
                };
            }

            // Mark state as used
            storedState.IsUsed = true;
            storedState.UsedAt = DateTime.UtcNow;

            // Exchange authorization code for tokens
            var provider = await _providerFactory.GetProviderAsync(platform);
            var tokenResponse = await provider.ExchangeCodeForTokensAsync(code, storedState.RedirectUrl);

            if (!tokenResponse.IsSuccess)
            {
                return new OAuthCallbackResult 
                { 
                    IsSuccess = false, 
                    ErrorMessage = tokenResponse.ErrorMessage 
                };
            }

            // Store tokens securely
            var storeResult = await _tokenService.StoreTokensAsync(platform, userId, tokenResponse.Tokens!);
            if (!storeResult.IsSuccess)
            {
                return new OAuthCallbackResult 
                { 
                    IsSuccess = false, 
                    ErrorMessage = "Failed to store OAuth tokens" 
                };
            }

            // Get user profile from social platform
            var userProfile = await provider.GetUserProfileAsync(tokenResponse.Tokens!.AccessToken);

            // Create or update social connection
            var connection = await _context.SocialConnections
                .FirstOrDefaultAsync(c => c.UserId == userId && c.Platform == platform.ToLower());

            if (connection == null)
            {
                connection = new SocialConnection
                {
                    UserId = userId,
                    Platform = platform.ToLower()
                };
                _context.SocialConnections.Add(connection);
            }

            // Update connection with profile data
            if (userProfile != null)
            {
                connection.SocialUserId = userProfile.Id;
                connection.Username = userProfile.Username;
                connection.DisplayName = userProfile.DisplayName;
                connection.ProfileImageUrl = userProfile.ProfileImageUrl;
                connection.Bio = userProfile.Bio;
                connection.FollowersCount = userProfile.FollowersCount;
                connection.FollowingCount = userProfile.FollowingCount;
                connection.IsVerified = userProfile.IsVerified;
                connection.ProfileData = userProfile.AdditionalData ?? new Dictionary<string, object>();
            }

            connection.ConnectedAt = DateTime.UtcNow;
            connection.LastTokenRefresh = DateTime.UtcNow;
            connection.IsTokenValid = true;
            connection.GrantedScopes = string.Join(",", tokenResponse.GrantedScopes ?? Array.Empty<string>());
            connection.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Track social activity
            await TrackSocialActivityAsync(platform, userId, SocialActivityType.ConnectionImport, new Dictionary<string, object>
            {
                ["platform"] = platform,
                ["connected_at"] = DateTime.UtcNow,
                ["profile_id"] = userProfile?.Id ?? "unknown"
            });

            _logger.LogBusinessEvent("OAuth_Connected", new 
            { 
                Platform = platform, 
                UserId = userId, 
                ProfileId = userProfile?.Id 
            });

            return new OAuthCallbackResult
            {
                IsSuccess = true,
                UserInfo = userProfile,
                GrantedScopes = tokenResponse.GrantedScopes,
                TokenExpiresAt = tokenResponse.Tokens!.IssuedAt.AddSeconds(tokenResponse.Tokens.ExpiresIn)
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error handling OAuth callback for platform {Platform}", platform);
            return new OAuthCallbackResult 
            { 
                IsSuccess = false, 
                ErrorMessage = "Failed to complete OAuth flow" 
            };
        }
    }

    public async Task<ServiceResult> DisconnectAccountAsync(string platform, Guid userId)
    {
        try
        {
            // Get connection
            var connection = await _context.SocialConnections
                .FirstOrDefaultAsync(c => c.UserId == userId && c.Platform == platform.ToLower());

            if (connection == null)
            {
                return new ServiceResult 
                { 
                    IsSuccess = false, 
                    ErrorMessage = "Social account connection not found" 
                };
            }

            // Revoke tokens
            await _tokenService.RevokeTokensAsync(platform, userId);

            // Remove connection
            _context.SocialConnections.Remove(connection);

            // Remove related data based on user preferences
            var privacyConsent = await GetPrivacyConsentAsync(userId);
            if (privacyConsent.AllowSocialDataCollection == false)
            {
                // Remove social activities
                var activities = await _context.SocialActivities
                    .Where(a => a.UserId == userId && a.Platform == platform.ToLower())
                    .ToListAsync();
                _context.SocialActivities.RemoveRange(activities);

                // Remove social graph connections
                var graphConnections = await _context.SocialGraphConnections
                    .Where(g => (g.FromUserId == userId || g.ToUserId == userId) && 
                               g.Platform == platform.ToLower())
                    .ToListAsync();
                _context.SocialGraphConnections.RemoveRange(graphConnections);
            }

            await _context.SaveChangesAsync();

            _logger.LogBusinessEvent("OAuth_Disconnected", new 
            { 
                Platform = platform, 
                UserId = userId 
            });

            return new ServiceResult { IsSuccess = true };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error disconnecting social account for platform {Platform}", platform);
            return new ServiceResult 
            { 
                IsSuccess = false, 
                ErrorMessage = "Failed to disconnect social account" 
            };
        }
    }

    public async Task<List<SocialConnection>> GetConnectedAccountsAsync(Guid userId)
    {
        try
        {
            return await _context.SocialConnections
                .Where(c => c.UserId == userId)
                .OrderBy(c => c.Platform)
                .ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving connected social accounts for user {UserId}", userId);
            return new List<SocialConnection>();
        }
    }

    public async Task<SocialProfile?> GetSocialProfileAsync(string platform, Guid userId, bool includePrivateData = false)
    {
        try
        {
            var tokens = await _tokenService.GetTokensAsync(platform, userId);
            if (tokens == null)
            {
                throw new UnauthorizedAccessException("No valid tokens found for platform");
            }

            var provider = await _providerFactory.GetProviderAsync(platform);
            var profile = await provider.GetUserProfileAsync(tokens.AccessToken, includePrivateData);

            return profile;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving social profile for platform {Platform}", platform);
            return null;
        }
    }

    public async Task<SocialFriendsResult> GetSocialFriendsAsync(string platform, Guid userId, int limit = 50, string? cursor = null)
    {
        try
        {
            var tokens = await _tokenService.GetTokensAsync(platform, userId);
            if (tokens == null)
            {
                return new SocialFriendsResult 
                { 
                    IsSuccess = false, 
                    ErrorMessage = "No valid tokens found for platform" 
                };
            }

            var provider = await _providerFactory.GetProviderAsync(platform);
            var friendsResult = await provider.GetFriendsAsync(tokens.AccessToken, limit, cursor);

            // Check for registered users
            if (friendsResult.IsSuccess && friendsResult.Friends.Any())
            {
                var socialIds = friendsResult.Friends.Select(f => f.Id).ToList();
                var registeredConnections = await _context.SocialConnections
                    .Where(c => c.Platform == platform.ToLower() && socialIds.Contains(c.SocialUserId))
                    .Select(c => new { c.SocialUserId, c.UserId })
                    .ToListAsync();

                foreach (var friend in friendsResult.Friends)
                {
                    var registered = registeredConnections.FirstOrDefault(r => r.SocialUserId == friend.Id);
                    if (registered != null)
                    {
                        friend.IsRegisteredUser = true;
                        friend.GeoLeapUserId = registered.UserId;
                    }
                }
            }

            return friendsResult;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving social friends for platform {Platform}", platform);
            return new SocialFriendsResult 
            { 
                IsSuccess = false, 
                ErrorMessage = "Failed to retrieve social friends" 
            };
        }
    }

    public async Task<SocialPostResult> PostToSocialMediaAsync(string platform, Guid userId, SocialPostRequest request)
    {
        try
        {
            var platformInfo = _supportedPlatforms.GetValueOrDefault(platform.ToLower());
            if (platformInfo == null || !platformInfo.SupportsPosting)
            {
                return new SocialPostResult 
                { 
                    IsSuccess = false, 
                    ErrorMessage = $"Platform {platform} does not support posting" 
                };
            }

            var tokens = await _tokenService.GetTokensAsync(platform, userId);
            if (tokens == null)
            {
                return new SocialPostResult 
                { 
                    IsSuccess = false, 
                    ErrorMessage = "No valid tokens found for platform" 
                };
            }

            var provider = await _providerFactory.GetProviderAsync(platform);
            var postResult = await provider.PostContentAsync(tokens.AccessToken, request);

            if (postResult.IsSuccess)
            {
                // Track social activity
                await TrackSocialActivityAsync(platform, userId, SocialActivityType.Post, new Dictionary<string, object>
                {
                    ["post_id"] = postResult.PostId,
                    ["content_length"] = request.Content.Length,
                    ["has_media"] = request.MediaUrls?.Any() == true,
                    ["hashtag_count"] = request.Hashtags?.Length ?? 0
                });
            }

            return postResult;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error posting to social media platform {Platform}", platform);
            return new SocialPostResult 
            { 
                IsSuccess = false, 
                ErrorMessage = "Failed to post to social media" 
            };
        }
    }

    public async Task<List<SocialPlatformInfo>> GetAvailablePlatformsAsync()
    {
        return _supportedPlatforms.Values.Where(p => p.IsEnabled).ToList();
    }

    public async Task<SocialPreferences> UpdateSocialPreferencesAsync(Guid userId, UpdateSocialPreferencesRequest request)
    {
        try
        {
            var preferences = await _context.SocialSharingPreferences
                .FirstOrDefaultAsync(p => p.UserId == userId);

            if (preferences == null)
            {
                preferences = new SocialSharingPreferences { UserId = userId };
                _context.SocialSharingPreferences.Add(preferences);
            }

            preferences.AllowSocialSharing = request.AllowSocialSharing;
            preferences.EnableViralIncentives = request.AllowRecommendations;
            preferences.EnableAnalyticsTracking = request.AllowActivityTracking;
            preferences.PreferredPlatforms = string.Join(",", request.PreferredPlatforms ?? Array.Empty<string>());
            preferences.PlatformPreferences = JsonSerializer.Serialize(request.PlatformSettings ?? new Dictionary<string, object>());
            preferences.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return new SocialPreferences
            {
                AllowSocialSharing = preferences.AllowSocialSharing,
                AllowFriendDiscovery = request.AllowFriendDiscovery,
                AllowRecommendations = preferences.EnableViralIncentives,
                AllowActivityTracking = preferences.EnableAnalyticsTracking,
                PreferredPlatforms = request.PreferredPlatforms ?? Array.Empty<string>(),
                PlatformSettings = request.PlatformSettings ?? new Dictionary<string, object>()
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating social preferences for user {UserId}", userId);
            throw;
        }
    }

    public async Task<SocialAnalytics> GetSocialAnalyticsAsync(Guid userId, DateTime? startDate = null, DateTime? endDate = null)
    {
        try
        {
            startDate ??= DateTime.UtcNow.AddDays(-30);
            endDate ??= DateTime.UtcNow;

            var connections = await _context.SocialConnections
                .Where(c => c.UserId == userId)
                .CountAsync();

            var activities = await _context.SocialActivities
                .Where(a => a.UserId == userId && 
                           a.CreatedAt >= startDate && 
                           a.CreatedAt <= endDate)
                .GroupBy(a => a.Platform)
                .Select(g => new { Platform = g.Key, Count = g.Count() })
                .ToListAsync();

            var activityByType = await _context.SocialActivities
                .Where(a => a.UserId == userId && 
                           a.CreatedAt >= startDate && 
                           a.CreatedAt <= endDate)
                .GroupBy(a => a.ActivityType)
                .Select(g => new { ActivityType = g.Key, Count = g.Count() })
                .ToListAsync();

            var lastActivity = await _context.SocialActivities
                .Where(a => a.UserId == userId)
                .OrderByDescending(a => a.CreatedAt)
                .Select(a => a.CreatedAt)
                .FirstOrDefaultAsync();

            return new SocialAnalytics
            {
                TotalConnections = connections,
                TotalPosts = activityByType.Where(a => a.ActivityType == "Post").Sum(a => a.Count),
                TotalInteractions = activities.Sum(a => a.Count),
                PlatformBreakdown = activities.ToDictionary(a => a.Platform, a => a.Count),
                ActivityByType = activityByType.ToDictionary(a => a.ActivityType, a => a.Count),
                LastActivity = lastActivity == default ? null : lastActivity
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving social analytics for user {UserId}", userId);
            throw;
        }
    }

    public async Task<SocialImportResult> ImportSocialConnectionsAsync(string platform, Guid userId, bool respectPrivacy = true)
    {
        try
        {
            var privacyConsent = await GetPrivacyConsentAsync(userId);
            if (respectPrivacy && !privacyConsent.AllowFriendDiscovery)
            {
                return new SocialImportResult 
                { 
                    IsSuccess = false, 
                    ErrorMessage = "User has not consented to friend discovery" 
                };
            }

            var friendsResult = await GetSocialFriendsAsync(platform, userId, 1000);
            if (!friendsResult.IsSuccess || !friendsResult.Friends.Any())
            {
                return new SocialImportResult 
                { 
                    IsSuccess = false, 
                    ErrorMessage = "No friends found to import" 
                };
            }

            var importedCount = 0;
            var skippedCount = 0;
            var errors = new List<string>();

            foreach (var friend in friendsResult.Friends.Where(f => f.IsRegisteredUser))
            {
                try
                {
                    var existingConnection = await _context.SocialGraphConnections
                        .AnyAsync(g => g.FromUserId == userId && 
                                      g.ToUserId == friend.GeoLeapUserId!.Value && 
                                      g.Platform == platform.ToLower());

                    if (!existingConnection)
                    {
                        var connection = new SocialGraphConnection
                        {
                            FromUserId = userId,
                            ToUserId = friend.GeoLeapUserId!.Value,
                            Platform = platform.ToLower(),
                            ConnectionType = friend.ConnectionType,
                            EstablishedAt = friend.ConnectedSince ?? DateTime.UtcNow,
                            LastInteractionAt = DateTime.UtcNow,
                            IsActive = true,
                            ConnectionData = new Dictionary<string, object>
                            {
                                ["imported_from"] = platform,
                                ["friend_username"] = friend.Username,
                                ["friend_display_name"] = friend.DisplayName
                            }
                        };

                        _context.SocialGraphConnections.Add(connection);
                        importedCount++;
                    }
                    else
                    {
                        skippedCount++;
                    }
                }
                catch (Exception ex)
                {
                    errors.Add($"Failed to import connection for {friend.Username}: {ex.Message}");
                    skippedCount++;
                }
            }

            await _context.SaveChangesAsync();

            return new SocialImportResult
            {
                IsSuccess = true,
                ImportedConnections = importedCount,
                SkippedConnections = skippedCount,
                Errors = errors.ToArray()
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error importing social connections for platform {Platform}", platform);
            return new SocialImportResult 
            { 
                IsSuccess = false, 
                ErrorMessage = "Failed to import social connections" 
            };
        }
    }

    public async Task<List<ContentRecommendation>> GetSocialRecommendationsAsync(Guid userId, string? contentType = null, int limit = 20)
    {
        try
        {
            return await _recommendationEngine.GenerateRecommendationsAsync(userId, contentType, limit);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving social recommendations for user {UserId}", userId);
            return new List<ContentRecommendation>();
        }
    }

    public async Task TrackSocialActivityAsync(string platform, Guid userId, SocialActivityType activityType, Dictionary<string, object> metadata)
    {
        try
        {
            var activity = new SocialActivity
            {
                UserId = userId,
                Platform = platform.ToLower(),
                ActivityType = activityType.ToString(),
                CreatedAt = DateTime.UtcNow,
                Metadata = metadata,
                IsPublic = true
            };

            // Extract common fields from metadata
            if (metadata.ContainsKey("content_id"))
                activity.ContentId = metadata["content_id"].ToString() ?? "";
            if (metadata.ContainsKey("content_title"))
                activity.ContentTitle = metadata["content_title"].ToString() ?? "";
            if (metadata.ContainsKey("content_type"))
                activity.ContentType = metadata["content_type"].ToString() ?? "";
            if (metadata.ContainsKey("description"))
                activity.Description = metadata["description"].ToString() ?? "";
            if (metadata.ContainsKey("image_url"))
                activity.ImageUrl = metadata["image_url"].ToString() ?? "";
            if (metadata.ContainsKey("target_url"))
                activity.TargetUrl = metadata["target_url"].ToString() ?? "";

            _context.SocialActivities.Add(activity);
            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error tracking social activity for platform {Platform}", platform);
        }
    }

    public async Task<List<SocialActivity>> GetSocialActivityFeedAsync(Guid userId, int limit = 50, DateTime? since = null)
    {
        try
        {
            var query = _context.SocialActivities
                .Where(a => a.UserId == userId && a.IsPublic);

            if (since.HasValue)
                query = query.Where(a => a.CreatedAt >= since.Value);

            return await query
                .OrderByDescending(a => a.CreatedAt)
                .Take(limit)
                .ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving social activity feed for user {UserId}", userId);
            return new List<SocialActivity>();
        }
    }

    public async Task<TokenValidationResult> ValidateAndRefreshTokensAsync(string platform, Guid userId)
    {
        try
        {
            var isValid = await _tokenService.ValidateTokensAsync(platform, userId);
            
            if (!isValid)
            {
                var refreshResult = await _tokenService.RefreshTokensAsync(platform, userId);
                return new TokenValidationResult
                {
                    IsSuccess = refreshResult.IsSuccess,
                    IsValid = refreshResult.IsSuccess,
                    ExpiresAt = refreshResult.IsSuccess ? refreshResult.ExpiresAt : null,
                    WasRefreshed = refreshResult.IsSuccess,
                    ErrorMessage = refreshResult.ErrorMessage
                };
            }

            var expiryInfo = await _tokenService.GetTokenExpiryAsync(platform, userId);
            
            return new TokenValidationResult
            {
                IsSuccess = true,
                IsValid = true,
                ExpiresAt = expiryInfo?.ExpiresAt,
                WasRefreshed = false
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating tokens for platform {Platform}", platform);
            return new TokenValidationResult 
            { 
                IsSuccess = false, 
                IsValid = false, 
                ErrorMessage = "Failed to validate tokens" 
            };
        }
    }

    public async Task<SocialPrivacyConsent> GetPrivacyConsentAsync(Guid userId)
    {
        var consent = await _context.SocialPrivacyConsents
            .FirstOrDefaultAsync(c => c.UserId == userId);

        if (consent == null)
        {
            // Create default privacy consent (GDPR compliant - opt-in)
            consent = new SocialPrivacyConsent
            {
                UserId = userId,
                AllowSocialDataCollection = false,
                AllowFriendDiscovery = false,
                AllowSocialRecommendations = false,
                AllowActivityTracking = false,
                AllowProfileMatching = false,
                AllowSocialAnalytics = false,
                ShareDataWithThirdParties = false,
                IsGdprCompliant = true,
                ConsentVersion = "1.0"
            };

            _context.SocialPrivacyConsents.Add(consent);
            await _context.SaveChangesAsync();
        }

        return consent;
    }

    public async Task UpdatePrivacyConsentAsync(Guid userId, SocialPrivacyConsent consent)
    {
        var existingConsent = await _context.SocialPrivacyConsents
            .FirstOrDefaultAsync(c => c.UserId == userId);

        if (existingConsent != null)
        {
            existingConsent.AllowSocialDataCollection = consent.AllowSocialDataCollection;
            existingConsent.AllowFriendDiscovery = consent.AllowFriendDiscovery;
            existingConsent.AllowSocialRecommendations = consent.AllowSocialRecommendations;
            existingConsent.AllowActivityTracking = consent.AllowActivityTracking;
            existingConsent.AllowProfileMatching = consent.AllowProfileMatching;
            existingConsent.AllowSocialAnalytics = consent.AllowSocialAnalytics;
            existingConsent.ShareDataWithThirdParties = consent.ShareDataWithThirdParties;
            existingConsent.UpdatedAt = DateTime.UtcNow;
        }
        else
        {
            consent.UserId = userId;
            _context.SocialPrivacyConsents.Add(consent);
        }

        await _context.SaveChangesAsync();
    }

    private string GenerateSecureState()
    {
        using var rng = RandomNumberGenerator.Create();
        var bytes = new byte[32];
        rng.GetBytes(bytes);
        return Convert.ToBase64String(bytes).Replace("/", "_").Replace("+", "-").Replace("=", "");
    }

    private string GetClientIpAddress()
    {
        // This would be injected from HttpContext in a real implementation
        return "127.0.0.1";
    }

    private string GetUserAgent()
    {
        // This would be injected from HttpContext in a real implementation
        return "GeoLeap/1.0";
    }
}