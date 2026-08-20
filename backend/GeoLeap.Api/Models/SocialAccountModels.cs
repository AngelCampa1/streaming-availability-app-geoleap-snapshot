using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;

namespace GeoLeap.Api.Models;

/// <summary>
/// Enhanced social account model with comprehensive platform integration
/// </summary>
public class SocialAccount
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
    
    [StringLength(100)]
    public string SocialUserId { get; set; } = string.Empty;
    
    [StringLength(100)]
    public string Username { get; set; } = string.Empty;
    
    [StringLength(200)]
    public string DisplayName { get; set; } = string.Empty;
    
    [StringLength(320)]
    public string Email { get; set; } = string.Empty;
    
    [StringLength(500)]
    public string ProfileImageUrl { get; set; } = string.Empty;
    
    [StringLength(2000)]
    public string Bio { get; set; } = string.Empty;
    
    // Social metrics
    public long FollowersCount { get; set; } = 0;
    
    public long FollowingCount { get; set; } = 0;
    
    public long PostsCount { get; set; } = 0;
    
    public double EngagementRate { get; set; } = 0.0;
    
    public bool IsVerified { get; set; } = false;
    
    public bool IsBusiness { get; set; } = false;
    
    public bool IsCreator { get; set; } = false;
    
    // Location and demographics
    [StringLength(200)]
    public string? Location { get; set; }
    
    [StringLength(200)]
    public string? Website { get; set; }
    
    [StringLength(10)]
    public string? Language { get; set; }
    
    [StringLength(100)]
    public string? TimeZone { get; set; }
    
    // Account status
    public bool IsActive { get; set; } = true;
    
    public bool IsPrivate { get; set; } = false;
    
    public DateTime ConnectedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime? LastSyncAt { get; set; }
    
    public DateTime? LastActivityAt { get; set; }
    
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    // Scoring and analytics
    public double InfluenceScore { get; set; } = 0.0;
    
    public double ContentQualityScore { get; set; } = 0.0;
    
    public double NetworkReachScore { get; set; } = 0.0;
    
    // Platform-specific data
    [Column(TypeName = "nvarchar(max)")]
    public string PlatformDataJson { get; set; } = "{}";
    
    [NotMapped]
    public Dictionary<string, object>? PlatformData
    {
        get => string.IsNullOrEmpty(PlatformDataJson) || PlatformDataJson == "{}" 
            ? new Dictionary<string, object>()
            : JsonSerializer.Deserialize<Dictionary<string, object>>(PlatformDataJson);
        set => PlatformDataJson = value == null ? "{}" : JsonSerializer.Serialize(value);
    }
    
    // Navigation properties
    public virtual List<SocialPost> Posts { get; set; } = new();
    
    public virtual List<SocialInteraction> Interactions { get; set; } = new();
}

/// <summary>
/// Social media post data with engagement metrics
/// </summary>
public class SocialPost
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public Guid SocialAccountId { get; set; }
    
    [ForeignKey(nameof(SocialAccountId))]
    public virtual SocialAccount SocialAccount { get; set; } = null!;
    
    [Required]
    [StringLength(100)]
    public string PlatformPostId { get; set; } = string.Empty;
    
    [StringLength(50)]
    public string PostType { get; set; } = string.Empty; // text, image, video, story
    
    [Column(TypeName = "nvarchar(max)")]
    public string Content { get; set; } = string.Empty;
    
    [StringLength(2000)]
    public string? MediaUrls { get; set; } // JSON array
    
    [StringLength(1000)]
    public string? Hashtags { get; set; } // JSON array
    
    [StringLength(500)]
    public string? Mentions { get; set; } // JSON array
    
    public DateTime PostedAt { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Engagement metrics
    public long LikesCount { get; set; } = 0;
    
    public long CommentsCount { get; set; } = 0;
    
    public long SharesCount { get; set; } = 0;
    
    public long ViewsCount { get; set; } = 0;
    
    public double EngagementRate { get; set; } = 0.0;
    
    public double ReachEstimate { get; set; } = 0.0;
    
    // Content analysis
    [StringLength(100)]
    public string? SentimentScore { get; set; } // positive, negative, neutral
    
    [StringLength(500)]
    public string? TopicsJson { get; set; } // AI-detected topics
    
    [Column(TypeName = "nvarchar(max)")]
    public string MetadataJson { get; set; } = "{}";
    
    [NotMapped]
    public List<string>? Topics
    {
        get => string.IsNullOrEmpty(TopicsJson) || TopicsJson == "[]" 
            ? new List<string>()
            : JsonSerializer.Deserialize<List<string>>(TopicsJson);
        set => TopicsJson = value == null ? "[]" : JsonSerializer.Serialize(value);
    }
}

/// <summary>
/// Social interactions and engagement tracking
/// </summary>
public class SocialInteraction
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public Guid SocialAccountId { get; set; }
    
    [ForeignKey(nameof(SocialAccountId))]
    public virtual SocialAccount SocialAccount { get; set; } = null!;
    
    [StringLength(50)]
    public string InteractionType { get; set; } = string.Empty; // like, comment, share, follow, mention
    
    [StringLength(100)]
    public string? TargetPostId { get; set; }
    
    [StringLength(100)]
    public string? TargetUserId { get; set; }
    
    [StringLength(200)]
    public string? TargetUsername { get; set; }
    
    [Column(TypeName = "nvarchar(max)")]
    public string? InteractionContent { get; set; }
    
    public DateTime InteractionAt { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public bool IsInbound { get; set; } = true; // true = received, false = sent
    
    [Column(TypeName = "nvarchar(max)")]
    public string MetadataJson { get; set; } = "{}";
}

/// <summary>
/// Friend and follower relationship tracking
/// </summary>
public class SocialRelationship
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public Guid SocialAccountId { get; set; }
    
    [ForeignKey(nameof(SocialAccountId))]
    public virtual SocialAccount SocialAccount { get; set; } = null!;
    
    [Required]
    [StringLength(100)]
    public string RelatedUserId { get; set; } = string.Empty;
    
    [StringLength(100)]
    public string RelatedUsername { get; set; } = string.Empty;
    
    [StringLength(200)]
    public string RelatedDisplayName { get; set; } = string.Empty;
    
    [StringLength(500)]
    public string? RelatedProfileImage { get; set; }
    
    [StringLength(50)]
    public string RelationshipType { get; set; } = string.Empty; // follower, following, friend, mutual
    
    public DateTime EstablishedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime? LastInteractionAt { get; set; }
    
    public double RelationshipStrength { get; set; } = 1.0;
    
    public bool IsActive { get; set; } = true;
    
    public bool IsVerified { get; set; } = false;
    
    // Cross-platform relationship tracking
    public Guid? GeoLeapUserId { get; set; } // If this person is also a GeoLeap user
    
    [ForeignKey(nameof(GeoLeapUserId))]
    public virtual User? GeoLeapUser { get; set; }
    
    [Column(TypeName = "nvarchar(max)")]
    public string MetadataJson { get; set; } = "{}";
}

/// <summary>
/// Content sharing analytics and tracking
/// </summary>
public class SocialContentShare
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public Guid UserId { get; set; }
    
    [ForeignKey(nameof(UserId))]
    public virtual User User { get; set; } = null!;
    
    [StringLength(200)]
    public string ContentId { get; set; } = string.Empty; // Movie/show ID
    
    [StringLength(100)]
    public string ContentType { get; set; } = string.Empty; // movie, tv_show, episode
    
    [StringLength(500)]
    public string ContentTitle { get; set; } = string.Empty;
    
    [StringLength(50)]
    public string Platform { get; set; } = string.Empty;
    
    [StringLength(100)]
    public string ShareType { get; set; } = string.Empty; // watchlist_add, rating, review, recommendation
    
    [Column(TypeName = "nvarchar(max)")]
    public string ShareContent { get; set; } = string.Empty;
    
    [StringLength(500)]
    public string? MediaUrl { get; set; }
    
    public DateTime SharedAt { get; set; } = DateTime.UtcNow;
    
    // Engagement metrics
    public int LikesCount { get; set; } = 0;
    
    public int CommentsCount { get; set; } = 0;
    
    public int SharesCount { get; set; } = 0;
    
    public int ClicksCount { get; set; } = 0;
    
    public double EngagementRate { get; set; } = 0.0;
    
    [StringLength(100)]
    public string? PlatformPostId { get; set; }
    
    [StringLength(500)]
    public string? PostUrl { get; set; }
    
    [Column(TypeName = "nvarchar(max)")]
    public string MetadataJson { get; set; } = "{}";
}

/// <summary>
/// Social proof and influence scoring
/// </summary>
public class SocialProofScore
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public Guid UserId { get; set; }
    
    [ForeignKey(nameof(UserId))]
    public virtual User User { get; set; } = null!;
    
    [StringLength(50)]
    public string Platform { get; set; } = string.Empty;
    
    // Overall scores
    public double OverallScore { get; set; } = 0.0;
    
    public double InfluenceScore { get; set; } = 0.0;
    
    public double EngagementScore { get; set; } = 0.0;
    
    public double ContentQualityScore { get; set; } = 0.0;
    
    public double NetworkScore { get; set; } = 0.0;
    
    public double ActivityScore { get; set; } = 0.0;
    
    // Detailed metrics
    public long TotalFollowers { get; set; } = 0;
    
    public long TotalConnections { get; set; } = 0;
    
    public double AverageEngagementRate { get; set; } = 0.0;
    
    public int PostsLast30Days { get; set; } = 0;
    
    public int InteractionsLast30Days { get; set; } = 0;
    
    // Ranking and percentile
    public int GlobalRank { get; set; } = 0;
    
    public double Percentile { get; set; } = 0.0;
    
    [StringLength(50)]
    public string InfluenceTier { get; set; } = "beginner"; // beginner, rising, influencer, celebrity
    
    public DateTime CalculatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    [Column(TypeName = "nvarchar(max)")]
    public string ScoreBreakdownJson { get; set; } = "{}";
    
    [NotMapped]
    public Dictionary<string, double>? ScoreBreakdown
    {
        get => string.IsNullOrEmpty(ScoreBreakdownJson) || ScoreBreakdownJson == "{}" 
            ? new Dictionary<string, double>()
            : JsonSerializer.Deserialize<Dictionary<string, double>>(ScoreBreakdownJson);
        set => ScoreBreakdownJson = value == null ? "{}" : JsonSerializer.Serialize(value);
    }
}

/// <summary>
/// Real-time social activity feed for user dashboards
/// </summary>
public class SocialActivityFeed
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
    [StringLength(50)]
    public string ActivityType { get; set; } = string.Empty; // share, like, comment, follow, etc.
    
    [StringLength(200)]
    public string ActivityTitle { get; set; } = string.Empty;
    
    [StringLength(1000)]
    public string ActivityDescription { get; set; } = string.Empty;
    
    [StringLength(200)]
    public string ContentId { get; set; } = string.Empty;
    
    [StringLength(500)]
    public string ContentTitle { get; set; } = string.Empty;
    
    [StringLength(100)]
    public string ContentType { get; set; } = string.Empty;
    
    [StringLength(500)]
    public string ImageUrl { get; set; } = string.Empty;
    
    [StringLength(2000)]
    public string TargetUrl { get; set; } = string.Empty;
    
    public Guid? TargetUserId { get; set; } // User who was followed, content owner, etc.
    
    [ForeignKey(nameof(TargetUserId))]
    public virtual User? TargetUser { get; set; }
    
    [StringLength(200)]
    public string TargetUserDisplayName { get; set; } = string.Empty;
    
    public DateTime ActivityTimestamp { get; set; } = DateTime.UtcNow;
    
    public bool IsPublic { get; set; } = true;
    
    public bool IsVerified { get; set; } = false;
    
    public int EngagementCount { get; set; } = 0;
    
    public double ImportanceScore { get; set; } = 1.0;
    
    [StringLength(50)]
    public string Priority { get; set; } = "normal"; // low, normal, high, urgent
    
    [Column(TypeName = "nvarchar(max)")]
    public string ActivityDataJson { get; set; } = "{}";
    
    [NotMapped]
    public Dictionary<string, object>? ActivityData
    {
        get => string.IsNullOrEmpty(ActivityDataJson) || ActivityDataJson == "{}" 
            ? new Dictionary<string, object>()
            : JsonSerializer.Deserialize<Dictionary<string, object>>(ActivityDataJson);
        set => ActivityDataJson = value == null ? "{}" : JsonSerializer.Serialize(value);
    }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Soft delete support
    public bool IsDeleted { get; set; } = false;
    
    public DateTime? DeletedAt { get; set; }
    
    // Feed management
    public bool IsRead { get; set; } = false;
    
    public DateTime? ReadAt { get; set; }
    
    public bool IsBookmarked { get; set; } = false;
    
    public DateTime? BookmarkedAt { get; set; }
    
    public bool IsHidden { get; set; } = false;
    
    public DateTime? HiddenAt { get; set; }
    
    // ML recommendation tracking
    public double RelevanceScore { get; set; } = 1.0;
    
    public bool IsRecommended { get; set; } = false;
    
    [StringLength(200)]
    public string? RecommendationReason { get; set; }
    
    // Legacy compatibility properties (marked as obsolete)
    [Obsolete("Use ActivityTitle instead")]
    [NotMapped]
    public string Title 
    { 
        get => ActivityTitle; 
        set => ActivityTitle = value; 
    }
    
    [Obsolete("Use ActivityDescription instead")]
    [NotMapped]
    public string Description 
    { 
        get => ActivityDescription; 
        set => ActivityDescription = value; 
    }
    
    [Obsolete("Use TargetUrl instead")]
    [NotMapped]
    public string? ActionUrl 
    { 
        get => TargetUrl; 
        set => TargetUrl = value ?? string.Empty; 
    }
    
    [Obsolete("Use TargetUserId instead")]
    [NotMapped]
    public Guid? RelatedUserId 
    { 
        get => TargetUserId; 
        set => TargetUserId = value; 
    }
    
    [Obsolete("Use TargetUser instead")]
    [NotMapped]
    public virtual User? RelatedUser 
    { 
        get => TargetUser; 
        set => TargetUser = value; 
    }
    
    [Obsolete("Use ActivityTimestamp instead")]
    [NotMapped]
    public DateTime ActivityAt 
    { 
        get => ActivityTimestamp; 
        set => ActivityTimestamp = value; 
    }
    
    [Obsolete("Use IsRecommended instead")]
    [NotMapped]
    public bool IsRelevant 
    { 
        get => IsRecommended; 
        set => IsRecommended = value; 
    }
    
    [Obsolete("Use ActivityDataJson instead")]
    [NotMapped]
    public string MetadataJson 
    { 
        get => ActivityDataJson; 
        set => ActivityDataJson = value; 
    }
}