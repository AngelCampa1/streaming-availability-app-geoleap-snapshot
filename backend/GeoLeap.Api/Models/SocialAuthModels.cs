using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;

namespace GeoLeap.Api.Models;

/// <summary>
/// Social platform OAuth configuration for multi-tenant support
/// </summary>
public class SocialPlatformConfig
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    [StringLength(50)]
    public string Platform { get; set; } = string.Empty;
    
    [Required]
    [StringLength(200)]
    public string DisplayName { get; set; } = string.Empty;
    
    [Required]
    [Column(TypeName = "nvarchar(max)")]
    public string EncryptedClientId { get; set; } = string.Empty;
    
    [Required]
    [Column(TypeName = "nvarchar(max)")]
    public string EncryptedClientSecret { get; set; } = string.Empty;
    
    [Required]
    [StringLength(2000)]
    public string RedirectUri { get; set; } = string.Empty;
    
    [StringLength(1000)]
    public string AuthorizationEndpoint { get; set; } = string.Empty;
    
    [StringLength(1000)]
    public string TokenEndpoint { get; set; } = string.Empty;
    
    [StringLength(1000)]
    public string UserInfoEndpoint { get; set; } = string.Empty;
    
    [StringLength(1000)]
    public string RevokeEndpoint { get; set; } = string.Empty;
    
    [StringLength(500)]
    public string DefaultScopes { get; set; } = string.Empty;
    
    [StringLength(500)]
    public string OptionalScopes { get; set; } = string.Empty;
    
    public bool IsEnabled { get; set; } = true;
    
    public bool SupportsRefreshToken { get; set; } = true;
    
    public bool SupportsPosting { get; set; } = false;
    
    public bool SupportsFriendDiscovery { get; set; } = false;
    
    public int TokenExpiryMinutes { get; set; } = 60;
    
    public int RateLimitPerHour { get; set; } = 1000;
    
    // Social sharing configuration properties
    public string PlatformName { get; set; } = string.Empty;
    
    public int CharacterLimit { get; set; } = 280;
    
    public bool SupportsImages { get; set; } = true;
    
    public bool SupportsHashtags { get; set; } = true;
    
    public int SortOrder { get; set; } = 0;
    
    // OAuth endpoint properties
    public string ClientSecret { get; set; } = string.Empty;
    
    public string TokenUrl { get; set; } = string.Empty;
    
    public string UserInfoUrl { get; set; } = string.Empty;
    
    [Column(TypeName = "nvarchar(max)")]
    public string PlatformSpecificConfigJson { get; set; } = "{}";
    
    [NotMapped]
    public Dictionary<string, object>? PlatformSpecificConfig
    {
        get => string.IsNullOrEmpty(PlatformSpecificConfigJson) || PlatformSpecificConfigJson == "{}" 
            ? new Dictionary<string, object>()
            : JsonSerializer.Deserialize<Dictionary<string, object>>(PlatformSpecificConfigJson);
        set => PlatformSpecificConfigJson = value == null ? "{}" : JsonSerializer.Serialize(value);
    }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    public Guid? CreatedBy { get; set; }
    
    public Guid? UpdatedBy { get; set; }
    
    // Soft delete support
    public bool IsDeleted { get; set; } = false;
    
    public DateTime? DeletedAt { get; set; }
    
    public Guid? DeletedBy { get; set; }
    
    // Navigation properties
    public virtual ICollection<SocialConnection> Connections { get; set; } = new List<SocialConnection>();
    
    public virtual ICollection<OAuthToken> OAuthTokens { get; set; } = new List<OAuthToken>();
}

/// <summary>
/// OAuth 2.0 token storage with encryption
/// </summary>
public class OAuthToken
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public Guid UserId { get; set; }
    
    [ForeignKey(nameof(UserId))]
    public virtual User User { get; set; } = null!;
    
    [Required]
    [StringLength(50)]
    public string Platform { get; set; } = string.Empty;
    
    public Guid? PlatformConfigId { get; set; }
    
    [ForeignKey(nameof(PlatformConfigId))]
    public virtual SocialPlatformConfig? PlatformConfig { get; set; }
    
    [Required]
    [Column(TypeName = "nvarchar(max)")]
    public string EncryptedAccessToken { get; set; } = string.Empty;
    
    [Column(TypeName = "nvarchar(max)")]
    public string? EncryptedRefreshToken { get; set; }
    
    [StringLength(500)]
    public string Scope { get; set; } = string.Empty;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime ExpiresAt { get; set; }
    
    public DateTime? LastRefreshed { get; set; }
    
    public DateTime? LastUsed { get; set; }
    
    [StringLength(100)]
    public string TokenType { get; set; } = "Bearer";
    
    public bool IsValid { get; set; } = true;
    
    [StringLength(100)]
    public string? EncryptionKeyId { get; set; }
    
    [Column(TypeName = "nvarchar(max)")]
    public string MetadataJson { get; set; } = "{}";
    
    [NotMapped]
    public Dictionary<string, object>? Metadata
    {
        get => string.IsNullOrEmpty(MetadataJson) || MetadataJson == "{}" 
            ? new Dictionary<string, object>()
            : JsonSerializer.Deserialize<Dictionary<string, object>>(MetadataJson);
        set => MetadataJson = value == null ? "{}" : JsonSerializer.Serialize(value);
    }
}

/// <summary>
/// Social media platform connection information
/// </summary>
public class SocialConnection
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public Guid UserId { get; set; }
    
    [ForeignKey(nameof(UserId))]
    public virtual User User { get; set; } = null!;
    
    [Required]
    [StringLength(50)]
    public string Platform { get; set; } = string.Empty;
    
    public Guid? PlatformConfigId { get; set; }
    
    [ForeignKey(nameof(PlatformConfigId))]
    public virtual SocialPlatformConfig? PlatformConfig { get; set; }
    
    [StringLength(100)]
    public string SocialUserId { get; set; } = string.Empty;
    
    [StringLength(100)]
    public string Username { get; set; } = string.Empty;
    
    [StringLength(200)]
    public string DisplayName { get; set; } = string.Empty;
    
    [StringLength(500)]
    public string ProfileImageUrl { get; set; } = string.Empty;
    
    [StringLength(1000)]
    public string Bio { get; set; } = string.Empty;
    
    public DateTime ConnectedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime? LastTokenRefresh { get; set; }
    
    public bool IsTokenValid { get; set; } = true;
    
    [StringLength(500)]
    public string GrantedScopes { get; set; } = string.Empty;
    
    public int FollowersCount { get; set; } = 0;
    
    public int FollowingCount { get; set; } = 0;
    
    public bool IsVerified { get; set; } = false;
    
    [Column(TypeName = "nvarchar(max)")]
    public string ProfileDataJson { get; set; } = "{}";
    
    [NotMapped]
    public Dictionary<string, object>? ProfileData
    {
        get => string.IsNullOrEmpty(ProfileDataJson) || ProfileDataJson == "{}" 
            ? new Dictionary<string, object>()
            : JsonSerializer.Deserialize<Dictionary<string, object>>(ProfileDataJson);
        set => ProfileDataJson = value == null ? "{}" : JsonSerializer.Serialize(value);
    }
    
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Social activity tracking for real-time feeds
/// </summary>
public class SocialActivity
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public Guid UserId { get; set; }
    
    [ForeignKey(nameof(UserId))]
    public virtual User User { get; set; } = null!;
    
    [Required]
    [StringLength(50)]
    public string Platform { get; set; } = string.Empty;
    
    [Required]
    [StringLength(50)]
    public string ActivityType { get; set; } = string.Empty; // share, like, comment, follow, etc.
    
    [StringLength(200)]
    public string ContentId { get; set; } = string.Empty;
    
    [StringLength(500)]
    public string ContentTitle { get; set; } = string.Empty;
    
    [StringLength(100)]
    public string ContentType { get; set; } = string.Empty;
    
    [StringLength(1000)]
    public string Description { get; set; } = string.Empty;
    
    [StringLength(500)]
    public string ImageUrl { get; set; } = string.Empty;
    
    [StringLength(2000)]
    public string TargetUrl { get; set; } = string.Empty;
    
    public Guid? TargetUserId { get; set; } // User who was followed, content owner, etc.
    
    [ForeignKey(nameof(TargetUserId))]
    public virtual User? TargetUser { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public bool IsPublic { get; set; } = true;
    
    [Column(TypeName = "nvarchar(max)")]
    public string MetadataJson { get; set; } = "{}";
    
    [NotMapped]
    public Dictionary<string, object>? Metadata
    {
        get => string.IsNullOrEmpty(MetadataJson) || MetadataJson == "{}" 
            ? new Dictionary<string, object>()
            : JsonSerializer.Deserialize<Dictionary<string, object>>(MetadataJson);
        set => MetadataJson = value == null ? "{}" : JsonSerializer.Serialize(value);
    }
}

/// <summary>
/// Social recommendations based on network analysis
/// </summary>
public class SocialRecommendation
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public Guid UserId { get; set; }
    
    [ForeignKey(nameof(UserId))]
    public virtual User User { get; set; } = null!;
    
    [Required]
    [StringLength(50)]
    public string RecommendationType { get; set; } = string.Empty; // content, user, hashtag
    
    [StringLength(200)]
    public string ContentId { get; set; } = string.Empty;
    
    [StringLength(500)]
    public string ContentTitle { get; set; } = string.Empty;
    
    [StringLength(100)]
    public string ContentType { get; set; } = string.Empty;
    
    public double Score { get; set; } = 0.0;
    
    [StringLength(200)]
    public string Reason { get; set; } = string.Empty;
    
    [StringLength(500)]
    public string SourcePlatforms { get; set; } = string.Empty; // JSON array
    
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime ExpiresAt { get; set; }
    
    public bool IsActive { get; set; } = true;
    
    [Column(TypeName = "nvarchar(max)")]
    public string RecommendationDataJson { get; set; } = "{}";
    
    [NotMapped]
    public Dictionary<string, object>? RecommendationData
    {
        get => string.IsNullOrEmpty(RecommendationDataJson) || RecommendationDataJson == "{}" 
            ? new Dictionary<string, object>()
            : JsonSerializer.Deserialize<Dictionary<string, object>>(RecommendationDataJson);
        set => RecommendationDataJson = value == null ? "{}" : JsonSerializer.Serialize(value);
    }
}

/// <summary>
/// Social graph connections for friend discovery
/// </summary>
public class SocialGraphConnection
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public Guid FromUserId { get; set; }
    
    [ForeignKey(nameof(FromUserId))]
    public virtual User FromUser { get; set; } = null!;
    
    [Required]
    public Guid ToUserId { get; set; }
    
    [ForeignKey(nameof(ToUserId))]
    public virtual User ToUser { get; set; } = null!;
    
    [Required]
    [StringLength(50)]
    public string Platform { get; set; } = string.Empty;
    
    [Required]
    [StringLength(50)]
    public string ConnectionType { get; set; } = string.Empty; // friend, follower, following, mutual
    
    public double Strength { get; set; } = 1.0; // Connection strength score
    
    public DateTime EstablishedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime LastInteractionAt { get; set; } = DateTime.UtcNow;
    
    public bool IsActive { get; set; } = true;
    
    public bool IsVerified { get; set; } = false;
    
    [Column(TypeName = "nvarchar(max)")]
    public string ConnectionDataJson { get; set; } = "{}";
    
    [NotMapped]
    public Dictionary<string, object>? ConnectionData
    {
        get => string.IsNullOrEmpty(ConnectionDataJson) || ConnectionDataJson == "{}" 
            ? new Dictionary<string, object>()
            : JsonSerializer.Deserialize<Dictionary<string, object>>(ConnectionDataJson);
        set => ConnectionDataJson = value == null ? "{}" : JsonSerializer.Serialize(value);
    }
}

/// <summary>
/// User's privacy consent for social features
/// </summary>
public class SocialPrivacyConsent
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public Guid UserId { get; set; }
    
    [ForeignKey(nameof(UserId))]
    public virtual User User { get; set; } = null!;
    
    public bool AllowSocialDataCollection { get; set; } = false;
    
    public bool AllowFriendDiscovery { get; set; } = false;
    
    public bool AllowSocialRecommendations { get; set; } = false;
    
    public bool AllowActivityTracking { get; set; } = false;
    
    public bool AllowProfileMatching { get; set; } = false;
    
    public bool AllowSocialAnalytics { get; set; } = false;
    
    public bool ShareDataWithThirdParties { get; set; } = false;
    
    [StringLength(1000)]
    public string SpecificPlatformConsents { get; set; } = "{}"; // JSON object with platform-specific consents
    
    public DateTime ConsentGivenAt { get; set; } = DateTime.UtcNow;
    
    public DateTime? ConsentRevokedAt { get; set; }
    
    public bool IsGdprCompliant { get; set; } = true;
    
    [StringLength(200)]
    public string ConsentVersion { get; set; } = "1.0";
    
    [StringLength(100)]
    public string GdprLawfulBasis { get; set; } = "consent";
    
    public bool IsActive { get; set; } = true;
    
    public DateTime? LastConsentUpdate { get; set; }
    
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// OAuth state tracking for security
/// </summary>
public class OAuthState
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    [StringLength(100)]
    public string StateValue { get; set; } = string.Empty;
    
    [Required]
    public Guid UserId { get; set; }
    
    [Required]
    [StringLength(50)]
    public string Platform { get; set; } = string.Empty;
    
    [StringLength(2000)]
    public string RedirectUrl { get; set; } = string.Empty;
    
    [StringLength(500)]
    public string RequestedScopes { get; set; } = string.Empty;

    /// <summary>
    /// PKCE code_verifier (RFC 7636) - stored for token exchange
    /// SECURITY: Prevents authorization code interception attacks
    /// </summary>
    [StringLength(128)]
    public string? CodeVerifier { get; set; }

    /// <summary>
    /// PKCE code_challenge (RFC 7636) - sent to authorization server
    /// SECURITY: SHA-256 hash of code_verifier
    /// </summary>
    [StringLength(128)]
    public string? CodeChallenge { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime ExpiresAt { get; set; } = DateTime.UtcNow.AddMinutes(10);

    public bool IsUsed { get; set; } = false;

    public DateTime? UsedAt { get; set; }

    [StringLength(100)]
    public string IpAddress { get; set; } = string.Empty;

    [StringLength(500)]
    public string UserAgent { get; set; } = string.Empty;
}

/// <summary>
/// Request/Response models for API endpoints
/// </summary>
public class ConnectSocialAccountRequest
{
    [Required]
    public string RedirectUrl { get; set; } = string.Empty;
    
    public string[]? Scopes { get; set; }
    
    public Dictionary<string, string>? AdditionalParameters { get; set; }
}

public class OAuthCallbackRequest
{
    [Required]
    public string Code { get; set; } = string.Empty;
    
    [Required]
    public string State { get; set; } = string.Empty;
    
    public string? Error { get; set; }
    
    public string? ErrorDescription { get; set; }
}

public class SocialPostRequest
{
    [Required]
    public string Content { get; set; } = string.Empty;
    
    public string[]? MediaUrls { get; set; }
    
    public string[]? Hashtags { get; set; }
    
    public Dictionary<string, string>? PlatformSpecificData { get; set; }
    
    public bool SchedulePost { get; set; } = false;
    
    public DateTime? ScheduledFor { get; set; }
}

public class UpdateSocialPreferencesRequest
{
    public bool AllowSocialSharing { get; set; } = true;
    
    public bool AllowFriendDiscovery { get; set; } = false;
    
    public bool AllowRecommendations { get; set; } = true;
    
    public bool AllowActivityTracking { get; set; } = false;
    
    public string[]? PreferredPlatforms { get; set; }
    
    public Dictionary<string, object>? PlatformSettings { get; set; }
}

/// <summary>
/// Result models for service operations
/// </summary>
public class OAuthInitiationResult : ServiceResult
{
    public string AuthorizationUrl { get; set; } = string.Empty;
    
    public string State { get; set; } = string.Empty;
    
    public DateTime ExpiresAt { get; set; }
}

public class OAuthCallbackResult : ServiceResult
{
    public SocialProfile? UserInfo { get; set; }
    
    public string[]? GrantedScopes { get; set; }
    
    public DateTime TokenExpiresAt { get; set; }
}

public class SocialFriendsResult : ServiceResult
{
    public List<SocialFriend> Friends { get; set; } = new();
    
    public string? NextCursor { get; set; }
    
    public int TotalCount { get; set; }
}

public class SocialPostResult : ServiceResult
{
    public string PostId { get; set; } = string.Empty;
    
    public string PostUrl { get; set; } = string.Empty;
    
    public DateTime PostedAt { get; set; } = DateTime.UtcNow;
}

public class SocialImportResult : ServiceResult
{
    public int ImportedConnections { get; set; }
    
    public int SkippedConnections { get; set; }
    
    public string[]? Errors { get; set; }
}

public class TokenRefreshResult : ServiceResult
{
    public DateTime ExpiresAt { get; set; }
    
    public string[]? UpdatedScopes { get; set; }
}

public class TokenValidationResult : ServiceResult
{
    public bool IsValid { get; set; }
    
    public DateTime? ExpiresAt { get; set; }
    
    public bool WasRefreshed { get; set; }
}

/// <summary>
/// Data models for API responses
/// </summary>
public class SocialProfile
{
    public string Id { get; set; } = string.Empty;
    
    public string Username { get; set; } = string.Empty;
    
    public string DisplayName { get; set; } = string.Empty;
    
    public string Email { get; set; } = string.Empty;
    
    public string ProfileImageUrl { get; set; } = string.Empty;
    
    public string Bio { get; set; } = string.Empty;
    
    public int FollowersCount { get; set; }
    
    public int FollowingCount { get; set; }
    
    public bool IsVerified { get; set; }
    
    public Dictionary<string, object>? AdditionalData { get; set; }
}

public class SocialFriend
{
    public string Id { get; set; } = string.Empty;
    
    public string Username { get; set; } = string.Empty;
    
    public string DisplayName { get; set; } = string.Empty;
    
    public string ProfileImageUrl { get; set; } = string.Empty;
    
    public string ConnectionType { get; set; } = string.Empty; // friend, follower, following, mutual
    
    public DateTime? ConnectedSince { get; set; }
    
    public bool IsRegisteredUser { get; set; } // Whether they're also a GeoLeap user
    
    public Guid? GeoLeapUserId { get; set; } // If they're a registered user
}

public class SocialPlatformInfo
{
    public string Name { get; set; } = string.Empty;
    
    public string DisplayName { get; set; } = string.Empty;
    
    public bool IsEnabled { get; set; }
    
    public string[] RequiredScopes { get; set; } = Array.Empty<string>();
    
    public string[] OptionalScopes { get; set; } = Array.Empty<string>();
    
    public bool SupportsPosting { get; set; }
    
    public bool SupportsFriends { get; set; }
    
    public Dictionary<string, int>? RateLimits { get; set; }
}

public class SocialPreferences
{
    public bool AllowSocialSharing { get; set; }
    
    public bool AllowFriendDiscovery { get; set; }
    
    public bool AllowRecommendations { get; set; }
    
    public bool AllowActivityTracking { get; set; }
    
    public string[] PreferredPlatforms { get; set; } = Array.Empty<string>();
    
    public Dictionary<string, object> PlatformSettings { get; set; } = new();
}

/// <summary>
/// Enhanced social analytics for comprehensive tracking
/// </summary>
public class SocialAnalytics
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public Guid UserId { get; set; }
    
    [ForeignKey(nameof(UserId))]
    public virtual User User { get; set; } = null!;
    
    [Required]
    [StringLength(50)]
    public string Platform { get; set; } = string.Empty;
    
    public Guid? PlatformConfigId { get; set; }
    
    [ForeignKey(nameof(PlatformConfigId))]
    public virtual SocialPlatformConfig? PlatformConfig { get; set; }
    
    // Connection metrics
    public int TotalConnections { get; set; } = 0;
    
    public int ActiveConnections { get; set; } = 0;
    
    public int TotalFriends { get; set; } = 0;
    
    public int TotalFollowers { get; set; } = 0;
    
    public int TotalFollowing { get; set; } = 0;
    
    // Activity metrics
    public int TotalPosts { get; set; } = 0;
    
    public int TotalShares { get; set; } = 0;
    
    public int TotalLikes { get; set; } = 0;
    
    public int TotalComments { get; set; } = 0;
    
    public int TotalInteractions { get; set; } = 0;
    
    // Content metrics
    public int TotalContentRecommendations { get; set; } = 0;
    
    public int AcceptedRecommendations { get; set; } = 0;
    
    public double RecommendationAcceptanceRate { get; set; } = 0.0;
    
    // Engagement metrics
    public double AverageEngagementRate { get; set; } = 0.0;
    
    public double InfluenceScore { get; set; } = 0.0;
    
    public double ReachScore { get; set; } = 0.0;
    
    // Time-based metrics
    public DateTime? FirstActivityAt { get; set; }
    
    public DateTime? LastActivity { get; set; }
    
    public DateTime? LastActivityAt { get; set; }
    
    public int DaysActive { get; set; } = 0;
    
    public double AverageSessionDuration { get; set; } = 0.0;
    
    // Privacy and compliance metrics
    public int DataExportRequests { get; set; } = 0;
    
    public int DataDeletionRequests { get; set; } = 0;
    
    public DateTime? LastPrivacyUpdate { get; set; }
    
    // Period information
    public DateTime PeriodStart { get; set; } = DateTime.UtcNow.Date;
    
    public DateTime PeriodEnd { get; set; } = DateTime.UtcNow.Date.AddDays(1).AddTicks(-1);
    
    [StringLength(20)]
    public string PeriodType { get; set; } = "daily"; // daily, weekly, monthly, yearly
    
    // Platform breakdown data
    [Column(TypeName = "nvarchar(max)")]
    public string PlatformBreakdownJson { get; set; } = "{}";
    
    [NotMapped]
    public Dictionary<string, int> PlatformBreakdown 
    { 
        get => string.IsNullOrEmpty(PlatformBreakdownJson) || PlatformBreakdownJson == "{}" 
            ? new Dictionary<string, int>()
            : JsonSerializer.Deserialize<Dictionary<string, int>>(PlatformBreakdownJson) ?? new Dictionary<string, int>();
        set => PlatformBreakdownJson = value == null ? "{}" : JsonSerializer.Serialize(value);
    }
    
    // Activity type breakdown data
    [Column(TypeName = "nvarchar(max)")]
    public string ActivityByTypeJson { get; set; } = "{}";
    
    [NotMapped]
    public Dictionary<string, int> ActivityByType 
    { 
        get => string.IsNullOrEmpty(ActivityByTypeJson) || ActivityByTypeJson == "{}" 
            ? new Dictionary<string, int>()
            : JsonSerializer.Deserialize<Dictionary<string, int>>(ActivityByTypeJson) ?? new Dictionary<string, int>();
        set => ActivityByTypeJson = value == null ? "{}" : JsonSerializer.Serialize(value);
    }
    
    // Raw analytics data
    [Column(TypeName = "nvarchar(max)")]
    public string RawAnalyticsJson { get; set; } = "{}";
    
    [NotMapped]
    public Dictionary<string, object>? RawAnalytics
    {
        get => string.IsNullOrEmpty(RawAnalyticsJson) || RawAnalyticsJson == "{}" 
            ? new Dictionary<string, object>()
            : JsonSerializer.Deserialize<Dictionary<string, object>>(RawAnalyticsJson);
        set => RawAnalyticsJson = value == null ? "{}" : JsonSerializer.Serialize(value);
    }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    // Soft delete support
    public bool IsDeleted { get; set; } = false;
    
    public DateTime? DeletedAt { get; set; }
}

public class ContentRecommendation
{
    public string ContentId { get; set; } = string.Empty;
    
    public string ContentType { get; set; } = string.Empty;
    
    public string Title { get; set; } = string.Empty;
    
    public string Description { get; set; } = string.Empty;
    
    public string ImageUrl { get; set; } = string.Empty;
    
    public double Score { get; set; }
    
    public string Reason { get; set; } = string.Empty;
    
    public string[] SourcePlatforms { get; set; } = Array.Empty<string>();
}

public class OAuthTokens
{
    public string AccessToken { get; set; } = string.Empty;
    
    public string? RefreshToken { get; set; }
    
    public string TokenType { get; set; } = "Bearer";
    
    public int ExpiresIn { get; set; }
    
    public string Scope { get; set; } = string.Empty;
    
    public DateTime IssuedAt { get; set; } = DateTime.UtcNow;
    
    public Dictionary<string, object>? AdditionalData { get; set; }
}

public class TokenExpiryInfo
{
    public DateTime ExpiresAt { get; set; }
    
    public bool IsExpired { get; set; }
    
    public TimeSpan TimeUntilExpiry { get; set; }
    
    public bool HasRefreshToken { get; set; }
}

public class ExpiringToken
{
    public Guid UserId { get; set; }
    
    public string Platform { get; set; } = string.Empty;
    
    public DateTime ExpiresAt { get; set; }
    
    public bool HasRefreshToken { get; set; }
}

/// <summary>
/// Enumerations for social features
/// </summary>
public enum SocialActivityType
{
    Share = 0,
    Like = 1,
    Comment = 2,
    Follow = 3,
    Unfollow = 4,
    Post = 5,
    Repost = 6,
    ProfileUpdate = 7,
    ConnectionImport = 8
}

public class ServiceResult
{
    public bool IsSuccess { get; set; }
    
    public string? ErrorMessage { get; set; }
    
    public string? ErrorCode { get; set; }
    
    public Dictionary<string, object>? AdditionalData { get; set; }
}