using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;

namespace GeoLeap.Api.Models;

/// <summary>
/// Represents a social sharing event for analytics tracking
/// </summary>
public class SocialShareEvent
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public Guid UserId { get; set; }
    
    [ForeignKey(nameof(UserId))]
    public virtual User User { get; set; } = null!;
    
    [Required]
    [StringLength(100)]
    public string ContentType { get; set; } = string.Empty; // "movie", "tv_show", "search_result"
    
    [Required]
    [StringLength(200)]
    public string ContentId { get; set; } = string.Empty; // TMDb ID or search query hash
    
    [StringLength(500)]
    public string ContentTitle { get; set; } = string.Empty;
    
    [StringLength(2000)]
    public string ContentDescription { get; set; } = string.Empty;
    
    [Required]
    [StringLength(50)]
    public string Platform { get; set; } = string.Empty; // "facebook", "twitter", "instagram", etc.
    
    [Required]
    [StringLength(100)]
    public string ShareMethod { get; set; } = string.Empty; // "native_share", "modal", "direct_api"
    
    [StringLength(2000)]
    public string ShareUrl { get; set; } = string.Empty;
    
    [StringLength(2000)]
    public string CustomMessage { get; set; } = string.Empty;
    
    [StringLength(500)]
    public string Hashtags { get; set; } = string.Empty;
    
    [StringLength(200)]
    public string UtmCampaign { get; set; } = string.Empty;
    
    [StringLength(200)]
    public string UtmSource { get; set; } = string.Empty;
    
    [StringLength(200)]
    public string UtmMedium { get; set; } = string.Empty;
    
    [StringLength(500)]
    public string UtmContent { get; set; } = string.Empty;
    
    public bool IsSuccessful { get; set; }
    
    [StringLength(1000)]
    public string? ErrorMessage { get; set; }
    
    [StringLength(100)]
    public string? ErrorCode { get; set; }
    
    [StringLength(100)]
    public string DeviceType { get; set; } = string.Empty; // "mobile", "desktop", "tablet"
    
    [StringLength(200)]
    public string UserAgent { get; set; } = string.Empty;
    
    [StringLength(100)]
    public string IpAddress { get; set; } = string.Empty;
    
    [StringLength(100)]
    public string Country { get; set; } = string.Empty;
    
    [StringLength(100)]
    public string City { get; set; } = string.Empty;
    
    [StringLength(50)]
    public string Status { get; set; } = "pending"; // "pending", "completed", "failed"
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    [StringLength(100)]
    public string CorrelationId { get; set; } = string.Empty;
    
    [StringLength(2000)]
    public string ShareMessage { get; set; } = string.Empty;
    
    public DateTime? CompletedAt { get; set; }
    
    public DateTime? FailedAt { get; set; }
    
    // Metadata for storing share-specific information
    [Column(TypeName = "nvarchar(max)")]
    public string MetadataJson { get; set; } = "{}";

    [NotMapped]
    public Dictionary<string, object>? Metadata
    {
        get => string.IsNullOrEmpty(MetadataJson) || MetadataJson == "{}" 
            ? null 
            : JsonSerializer.Deserialize<Dictionary<string, object>>(MetadataJson);
        set => MetadataJson = value == null ? "{}" : JsonSerializer.Serialize(value);
    }
    
    // Click tracking
    public int ClickCount { get; set; } = 0;
    
    // Additional properties for service compatibility
    public string ShareId { get; set; } = string.Empty;
    public string EventType { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Tracks click events on shared links for conversion attribution
/// </summary>
public class ShareClickEvent
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public Guid ShareEventId { get; set; }
    
    [ForeignKey(nameof(ShareEventId))]
    public virtual SocialShareEvent ShareEvent { get; set; } = null!;
    
    public Guid? ClickerUserId { get; set; } // User who clicked (if authenticated)
    
    [ForeignKey(nameof(ClickerUserId))]
    public virtual User? ClickerUser { get; set; }
    
    [StringLength(100)]
    public string SessionId { get; set; } = string.Empty;
    
    [StringLength(2000)]
    public string ReferrerUrl { get; set; } = string.Empty;
    
    [StringLength(100)]
    public string Platform { get; set; } = string.Empty; // Platform where the click originated
    
    [StringLength(100)]
    public string DeviceType { get; set; } = string.Empty;
    
    [StringLength(200)]
    public string UserAgent { get; set; } = string.Empty;
    
    [StringLength(100)]
    public string IpAddress { get; set; } = string.Empty;
    
    [StringLength(100)]
    public string Country { get; set; } = string.Empty;
    
    [StringLength(100)]
    public string City { get; set; } = string.Empty;
    
    public bool IsNewUser { get; set; }
    
    public bool ResultedInRegistration { get; set; }
    
    public bool ResultedInSubscription { get; set; }
    
    public DateTime? RegistrationDate { get; set; }
    
    public DateTime? SubscriptionDate { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    [StringLength(100)]
    public string CorrelationId { get; set; } = string.Empty;
}

/// <summary>
/// A/B test variations for share button optimization
/// </summary>
public class ShareAbTest
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    [StringLength(200)]
    public string TestName { get; set; } = string.Empty;
    
    [Required]
    [StringLength(100)]
    public string VariantName { get; set; } = string.Empty;
    
    [StringLength(1000)]
    public string Description { get; set; } = string.Empty;
    
    [StringLength(5000)]
    public string ConfigurationJson { get; set; } = string.Empty; // JSON config for the variant
    
    public double TrafficPercentage { get; set; } = 50.0; // Percentage of users to show this variant
    
    public bool IsActive { get; set; } = true;
    
    public DateTime StartDate { get; set; } = DateTime.UtcNow;
    
    public DateTime? EndDate { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    [Required]
    public Guid CreatedBy { get; set; }
    
    // Navigation properties
    public virtual ICollection<ShareAbTestParticipation> Participations { get; set; } = new List<ShareAbTestParticipation>();
}

/// <summary>
/// Tracks user participation in A/B tests
/// </summary>
public class ShareAbTestParticipation
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public Guid TestId { get; set; }
    
    [ForeignKey(nameof(TestId))]
    public virtual ShareAbTest Test { get; set; } = null!;
    
    [Required]
    public Guid UserId { get; set; }
    
    [ForeignKey(nameof(UserId))]
    public virtual User User { get; set; } = null!;
    
    [Required]
    [StringLength(100)]
    public string VariantAssigned { get; set; } = string.Empty;
    
    public DateTime AssignedAt { get; set; } = DateTime.UtcNow;
    
    public bool HasShared { get; set; } = false;
    
    public DateTime? FirstShareAt { get; set; }
    
    public int TotalShares { get; set; } = 0;
    
    public int TotalClicks { get; set; } = 0;
    
    public int TotalConversions { get; set; } = 0;
}

/// <summary>
/// Aggregated viral metrics for performance dashboards
/// </summary>
public class ViralMetrics
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public DateTime MetricDate { get; set; }
    
    [Required]
    [StringLength(50)]
    public string MetricType { get; set; } = string.Empty; // "daily", "weekly", "monthly"
    
    [StringLength(100)]
    public string Platform { get; set; } = string.Empty; // "all" or specific platform
    
    public long TotalShares { get; set; } = 0;
    
    public long TotalClicks { get; set; } = 0;
    
    public long TotalRegistrations { get; set; } = 0;
    
    public long TotalSubscriptions { get; set; } = 0;
    
    public decimal ViralCoefficient { get; set; } = 0.0m;
    
    public decimal ShareToClickRate { get; set; } = 0.0m;
    
    public decimal ClickToRegistrationRate { get; set; } = 0.0m;
    
    public decimal RegistrationToSubscriptionRate { get; set; } = 0.0m;
    
    public decimal AverageSharesPerUser { get; set; } = 0.0m;
    
    public decimal AverageClicksPerShare { get; set; } = 0.0m;
    
    public long UniqueSharers { get; set; } = 0;
    
    public long UniqueClickers { get; set; } = 0;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Content performance tracking for shared content
/// </summary>
public class ContentSharePerformance
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    [StringLength(200)]
    public string ContentId { get; set; } = string.Empty;
    
    [Required]
    [StringLength(100)]
    public string ContentType { get; set; } = string.Empty;
    
    [StringLength(500)]
    public string ContentTitle { get; set; } = string.Empty;
    
    [StringLength(500)]
    public string Title { get; set; } = string.Empty;
    
    public long ShareCount { get; set; } = 0;
    
    public DateTime? LastSharedAt { get; set; }
    
    public double PopularityScore { get; set; } = 0.0;
    
    [StringLength(100)]
    public string Genre { get; set; } = string.Empty;
    
    public int? ReleaseYear { get; set; }
    
    public decimal? Rating { get; set; }
    
    public long TotalShares { get; set; } = 0;
    
    public long TotalClicks { get; set; } = 0;
    
    public long TotalConversions { get; set; } = 0;
    
    public decimal ShareVelocity { get; set; } = 0.0m; // Shares per day trending
    
    [StringLength(100)]
    public string TopSharingPlatform { get; set; } = string.Empty;
    
    public decimal PlatformEngagementRate { get; set; } = 0.0m;
    
    public DateTime FirstShareDate { get; set; }
    
    public DateTime LastShareDate { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// DTOs for API responses
/// </summary>
public class SocialSharingAnalyticsDto
{
    public int TotalShares { get; set; }
    public int SuccessfulShares { get; set; }
    public int FailedShares { get; set; }
    public Dictionary<string, int> SharesByPlatform { get; set; } = new();
    public Dictionary<string, int> MostSharedContent { get; set; } = new();
    public string Period { get; set; } = string.Empty;

    public class ShareEventDto
    {
        public Guid Id { get; set; }
        public string ContentType { get; set; } = string.Empty;
        public string ContentTitle { get; set; } = string.Empty;
        public string Platform { get; set; } = string.Empty;
        public string ShareMethod { get; set; } = string.Empty;
        public bool IsSuccessful { get; set; }
        public string DeviceType { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; }
    }
    
    public class ViralMetricsDto
    {
        public DateTime MetricDate { get; set; }
        public string Platform { get; set; } = string.Empty;
        public long TotalShares { get; set; }
        public long TotalClicks { get; set; }
        public long TotalRegistrations { get; set; }
        public decimal ViralCoefficient { get; set; }
        public decimal ShareToClickRate { get; set; }
        public decimal ClickToRegistrationRate { get; set; }
        public decimal AverageSharesPerUser { get; set; }
    }
    
    public class ContentPerformanceDto
    {
        public string ContentId { get; set; } = string.Empty;
        public string ContentTitle { get; set; } = string.Empty;
        public string ContentType { get; set; } = string.Empty;
        public long TotalShares { get; set; }
        public long TotalClicks { get; set; }
        public decimal ShareVelocity { get; set; }
        public string TopSharingPlatform { get; set; } = string.Empty;
        public decimal EngagementRate { get; set; }
    }
    
    public class AbTestResultDto
    {
        public string TestName { get; set; } = string.Empty;
        public string VariantName { get; set; } = string.Empty;
        public int Participants { get; set; }
        public int Shares { get; set; }
        public int Clicks { get; set; }
        public int Conversions { get; set; }
        public decimal ShareRate { get; set; }
        public decimal ClickThroughRate { get; set; }
        public decimal ConversionRate { get; set; }
        public decimal StatisticalSignificance { get; set; }
    }
}

/// <summary>
/// User's social sharing preferences for privacy control
/// </summary>
public class SocialSharingPreferences
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public Guid UserId { get; set; }
    
    [ForeignKey(nameof(UserId))]
    public virtual User User { get; set; } = null!;
    
    public bool EnableAnalyticsTracking { get; set; } = true;
    
    public bool ShareUserInfo { get; set; } = false;
    
    public bool EnableLocationTracking { get; set; } = false;
    
    [StringLength(1000)]
    public string PreferredPlatforms { get; set; } = string.Empty; // JSON array
    
    [StringLength(500)]
    public string DefaultHashtags { get; set; } = string.Empty;
    
    public bool EnableCustomMessages { get; set; } = true;
    
    public bool EnableViralIncentives { get; set; } = true;
    
    public bool AllowSocialSharing { get; set; } = true;
    
    public bool ShareWithPersonalInfo { get; set; } = false;
    
    public bool AllowShareAnalytics { get; set; } = true;
    
    public bool AutoGenerateHashtags { get; set; } = true;
    
    [StringLength(2000)]
    public string PlatformPreferences { get; set; } = string.Empty; // JSON
    
    [StringLength(5000)]
    public string CustomShareTemplates { get; set; } = string.Empty; // JSON
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Share link model for tracking generated share links
/// </summary>
public class ShareLink
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    [StringLength(100)]
    public string ShortCode { get; set; } = string.Empty;
    
    [Required]
    [StringLength(2000)]
    public string OriginalUrl { get; set; } = string.Empty;
    
    [StringLength(200)]
    public string ContentId { get; set; } = string.Empty;
    
    [StringLength(100)]
    public string ContentType { get; set; } = string.Empty;
    
    [StringLength(50)]
    public string Platform { get; set; } = string.Empty;
    
    public Guid CreatedBy { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public bool IsActive { get; set; } = true;
    
    public int ClickCount { get; set; } = 0;
    
    public DateTime? LastClickedAt { get; set; }
    
    public virtual ICollection<ShareLinkClick> ClickEvents { get; set; } = new List<ShareLinkClick>();
}

/// <summary>
/// Core SocialShare model for database entities - for test compatibility
/// </summary>
public class SocialShare
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public Guid UserId { get; set; }
    
    [Required]
    [StringLength(200)]
    public string ContentId { get; set; } = string.Empty;
    
    [StringLength(500)]
    public string ContentTitle { get; set; } = string.Empty;
    
    [Required]
    [StringLength(50)]
    public string Platform { get; set; } = string.Empty;
    
    [Required]
    [StringLength(2000)]
    public string ShareUrl { get; set; } = string.Empty;
    
    public bool IsSuccessful { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    /// <summary>
    /// Number of clicks on this shared link - for test compatibility
    /// </summary>
    public int ShareClicks { get; set; } = 0;
    
    /// <summary>
    /// Alias for ShareClicks for test compatibility
    /// </summary>
    public int ClickCount 
    { 
        get => ShareClicks; 
        set => ShareClicks = value; 
    }
}

/// <summary>
/// Share link click tracking for attribution
/// </summary>
public class ShareLinkClick
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public Guid ShareEventId { get; set; }
    
    [ForeignKey(nameof(ShareEventId))]
    public virtual SocialShareEvent ShareEvent { get; set; } = null!;
    
    [StringLength(100)]
    public string IpAddress { get; set; } = string.Empty;
    
    [StringLength(200)]
    public string UserAgent { get; set; } = string.Empty;
    
    [StringLength(2000)]
    public string Referer { get; set; } = string.Empty;
    
    public Guid? UserId { get; set; }
    
    [ForeignKey(nameof(UserId))]
    public virtual User? User { get; set; }
    
    public bool ResultedInRegistration { get; set; } = false;
    
    public DateTime RegistrationDate { get; set; }
    
    public DateTime ClickedAt { get; set; } = DateTime.UtcNow;
    
    [StringLength(10)]
    public string CountryCode { get; set; } = string.Empty;
    
    [StringLength(2000)]
    public string RefererUrl { get; set; } = string.Empty;
    
    public bool ConvertedToRegistration { get; set; } = false;
    
    public Guid? ConvertedUserId { get; set; }
    
    public virtual User? ConvertedUser { get; set; }
    
    public DateTime? ConversionDate { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    [StringLength(100)]
    public string CorrelationId { get; set; } = string.Empty;
}

/// <summary>
/// Aggregated metrics for shared content
/// </summary>
public class SocialShareMetrics
{
    public string ContentId { get; set; } = string.Empty;
    public string ContentTitle { get; set; } = string.Empty;
    public long TotalShares { get; set; }
    public long TotalClicks { get; set; }
    public decimal ClickThroughRate { get; set; }
    public decimal ViralCoefficient { get; set; }
    public Dictionary<string, long> PlatformBreakdown { get; set; } = new();
    public double ConversionRate { get; set; }
    public DateTime LastSharedAt { get; set; }
    public DateTime LastUpdated { get; set; }
}

/// <summary>
/// Social platform configuration for share limits and settings
/// </summary>
public class SocialSharingPlatformConfig
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    [StringLength(50)]
    public string PlatformName { get; set; } = string.Empty;
    
    [StringLength(100)]
    public string DisplayName { get; set; } = string.Empty;
    
    public bool IsEnabled { get; set; } = true;
    
    public int CharacterLimit { get; set; } = 280;
    
    public bool SupportsHashtags { get; set; } = true;
    
    public bool SupportsImages { get; set; } = true;
    
    [StringLength(200)]
    public string ApiEndpoint { get; set; } = string.Empty;
    
    [StringLength(500)]
    public string DefaultHashtags { get; set; } = string.Empty;
    
    public int SortOrder { get; set; } = 0;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Share status enumeration
/// </summary>
public enum ShareStatus
{
    Pending = 0,
    InProgress = 1,
    Completed = 2,
    Failed = 3,
    Cancelled = 4
}

/// <summary>
/// Request models for social sharing
/// </summary>
public class ShareContentRequest
{
    [Required]
    public string ContentType { get; set; } = string.Empty;
    
    [Required]
    public string ContentId { get; set; } = string.Empty;
    
    public string ContentTitle { get; set; } = string.Empty;
    
    public string ContentDescription { get; set; } = string.Empty;
    
    [Required]
    public string Platform { get; set; } = string.Empty;
    
    public string ShareMethod { get; set; } = "modal";
    
    public Guid? UserId { get; set; }
    
    public string CustomMessage { get; set; } = string.Empty;
    
    public string Hashtags { get; set; } = string.Empty;
    
    public string UtmCampaign { get; set; } = string.Empty;
    
    public string UtmSource { get; set; } = string.Empty;
    
    public string UtmMedium { get; set; } = string.Empty;
    
    public string UtmContent { get; set; } = string.Empty;
    
    public string DeviceType { get; set; } = string.Empty;
    
    public string UserAgent { get; set; } = string.Empty;
    
    public string IpAddress { get; set; } = string.Empty;
    
    public Dictionary<string, string>? UtmParameters { get; set; } = new();
    
    public bool IncludePersonalInfo { get; set; } = false;
    
    public bool TrackAnalytics { get; set; } = true;
}

/// <summary>
/// Response model for share link generation
/// </summary>
public class ShareLinkResponse
{
    public Guid ShareEventId { get; set; }
    
    public string ShareUrl { get; set; } = string.Empty;
    
    public string ShortUrl { get; set; } = string.Empty;
    
    public string PreviewImageUrl { get; set; } = string.Empty;
    
    public string OpenGraphTitle { get; set; } = string.Empty;
    
    public string OpenGraphDescription { get; set; } = string.Empty;
    
    public string TwitterTitle { get; set; } = string.Empty;
    
    public string TwitterDescription { get; set; } = string.Empty;
    
    public bool Success { get; set; } = true;
    
    public string? ErrorMessage { get; set; }
    
    public string ShareMessage { get; set; } = string.Empty;
    
    public string ImageUrl { get; set; } = string.Empty;
    
    public Dictionary<string, object>? Metadata { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Analytics request for share performance tracking
/// </summary>
public class ShareAnalyticsRequest
{
    public DateTime? StartDate { get; set; }
    
    public DateTime? EndDate { get; set; }
    
    public string? Platform { get; set; }
    
    public string? ContentType { get; set; }
    
    public string? ContentId { get; set; }
    
    public int Limit { get; set; } = 100;
    
    public int Offset { get; set; } = 0;
}

/// <summary>
/// Content sharing metrics for admin dashboard
/// </summary>
public class ContentSharingMetrics
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    [StringLength(200)]
    public string ContentId { get; set; } = string.Empty;
    
    [Required]
    [StringLength(100)]
    public string ContentType { get; set; } = string.Empty;
    
    [StringLength(500)]
    public string ContentTitle { get; set; } = string.Empty;
    
    public long TotalShares { get; set; } = 0;
    
    public long TotalClicks { get; set; } = 0;
    
    public long TotalViews { get; set; } = 0;
    
    public decimal ShareToViewRatio { get; set; } = 0.0m;
    
    public decimal ClickThroughRate { get; set; } = 0.0m;
    
    public decimal ViralCoefficient { get; set; } = 0.0m;
    
    public double ConversionRate { get; set; } = 0.0;
    
    [StringLength(100)]
    public string TopSharingPlatform { get; set; } = string.Empty;
    
    public DateTime FirstSharedAt { get; set; }
    
    public DateTime LastSharedAt { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Short URL mappings for share link tracking
/// </summary>
public class ShareLinkMapping
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    [StringLength(100)]
    public string ShortCode { get; set; } = string.Empty;
    
    [Required]
    [StringLength(2000)]
    public string OriginalUrl { get; set; } = string.Empty;
    
    [Required]
    public Guid ShareEventId { get; set; }
    
    [ForeignKey(nameof(ShareEventId))]
    public virtual SocialShareEvent ShareEvent { get; set; } = null!;
    
    public long ClickCount { get; set; } = 0;
    
    public bool IsActive { get; set; } = true;
    
    public DateTime? ExpiresAt { get; set; }
    
    public DateTime? LastClickedAt { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    [StringLength(100)]
    public string CorrelationId { get; set; } = string.Empty;
}

/// <summary>
/// Open Graph meta data for social sharing
/// </summary>
public class OpenGraphData
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string Type { get; set; } = "website";
    public string SiteName { get; set; } = "GeoLeap";
    public Dictionary<string, string> AdditionalProperties { get; set; } = new();
}

/// <summary>
/// Twitter Card meta data for social sharing
/// </summary>
public class TwitterCardData
{
    public string Card { get; set; } = "summary_large_image";
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string ImageUrl { get; set; } = string.Empty;
    public string Site { get; set; } = "@GeoLeap";
    public string Creator { get; set; } = "@GeoLeap";
    public Dictionary<string, string> AdditionalProperties { get; set; } = new();
}

/// <summary>
/// Admin model classes for missing dependencies
/// </summary>
// Note: Duplicate models moved to ExportModels.cs and AdminModels.cs to avoid conflicts

// ConfigurationChangeHistory and ConfigurationBackup moved to MissingModels.cs

/// <summary>
/// Request models for social sharing analytics
/// </summary>
public class SocialSharingAnalyticsRequest
{
    public class TrackShareEventRequest
    {
        [Required]
        public string ContentType { get; set; } = string.Empty;
        
        [Required]
        public string ContentId { get; set; } = string.Empty;
        
        public string ContentTitle { get; set; } = string.Empty;
        public string ContentDescription { get; set; } = string.Empty;
        
        [Required]
        public string Platform { get; set; } = string.Empty;
        
        [Required]
        public string ShareMethod { get; set; } = string.Empty;
        
        public string ShareUrl { get; set; } = string.Empty;
        public string CustomMessage { get; set; } = string.Empty;
        public string Hashtags { get; set; } = string.Empty;
        public string UtmCampaign { get; set; } = string.Empty;
        public string UtmSource { get; set; } = string.Empty;
        public string UtmMedium { get; set; } = string.Empty;
        public string UtmContent { get; set; } = string.Empty;
        public bool IsSuccessful { get; set; } = true;
        public string? ErrorMessage { get; set; }
        public string? ErrorCode { get; set; }
        public string DeviceType { get; set; } = string.Empty;
        public string UserAgent { get; set; } = string.Empty;
    }
    
    public class TrackClickEventRequest
    {
        [Required]
        public Guid ShareEventId { get; set; }
        
        public string SessionId { get; set; } = string.Empty;
        public string ReferrerUrl { get; set; } = string.Empty;
        public string Platform { get; set; } = string.Empty;
        public string DeviceType { get; set; } = string.Empty;
        public string UserAgent { get; set; } = string.Empty;
        public bool IsNewUser { get; set; }
    }
    
    public class AnalyticsFilterRequest
    {
        public DateTime? StartDate { get; set; }
        public DateTime? EndDate { get; set; }
        public string? Platform { get; set; }
        public string? ContentType { get; set; }
        public string? DeviceType { get; set; }
        public string MetricType { get; set; } = "daily"; // daily, weekly, monthly
        public int Limit { get; set; } = 100;
        public int Offset { get; set; } = 0;
    }

/// <summary>
/// Social platforms enumeration for cross-platform sharing
/// </summary>
public enum SocialPlatform
{
    Facebook = 0,
    Twitter = 1,
    Instagram = 2,
    WhatsApp = 3,
    TikTok = 4,
    LinkedIn = 5,
    Pinterest = 6,
    YouTube = 7,
    Reddit = 8,
    Snapchat = 9,
    Discord = 10,
    Telegram = 11
}

/// <summary>
/// Share link model for generated social sharing links
/// </summary>
public class ShareLinkModel
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    [StringLength(2000)]
    public string Url { get; set; } = string.Empty;
    
    [StringLength(200)]
    public string ShortUrl { get; set; } = string.Empty;
    
    [Required]
    public SocialPlatform Platform { get; set; }
    
    [Required]
    [StringLength(200)]
    public string ContentId { get; set; } = string.Empty;
    
    [StringLength(500)]
    public string ContentTitle { get; set; } = string.Empty;
    
    [Required]
    public string UserId { get; set; } = string.Empty;
    
    [StringLength(2000)]
    public string ShareMessage { get; set; } = string.Empty;
    
    [StringLength(500)]
    public string Hashtags { get; set; } = string.Empty;
    
    [StringLength(2000)]
    public string ImageUrl { get; set; } = string.Empty;
    
    [StringLength(200)]
    public string UtmCampaign { get; set; } = string.Empty;
    
    [StringLength(200)]
    public string UtmSource { get; set; } = string.Empty;
    
    [StringLength(200)]
    public string UtmMedium { get; set; } = string.Empty;
    
    [StringLength(500)]
    public string UtmContent { get; set; } = string.Empty;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ExpiresAt { get; set; }
    
    public bool IsActive { get; set; } = true;
    
    public Dictionary<string, object>? Metadata { get; set; }
}

/// <summary>
/// User privacy settings model for social sharing
/// </summary>
public class UserPrivacySettings
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public Guid UserId { get; set; }
    
    [ForeignKey(nameof(UserId))]
    public virtual User User { get; set; } = null!;
    
    public bool AllowSocialSharing { get; set; } = true;
    public bool ShareWithPersonalInfo { get; set; } = false;
    public bool AllowShareAnalytics { get; set; } = true;
    public bool AutoGenerateHashtags { get; set; } = true;
    public bool EnableLocationSharing { get; set; } = false;
    public bool ShareActivityPublicly { get; set; } = false;
    public bool AllowSocialLogin { get; set; } = true;
    public bool EnableSocialNotifications { get; set; } = true;
    
    [StringLength(2000)]
    public string PlatformPreferences { get; set; } = string.Empty; // JSON serialized preferences per platform
    
    [StringLength(5000)]
    public string CustomShareTemplates { get; set; } = string.Empty; // JSON serialized custom templates
    
    [StringLength(1000)]
    public string BlockedPlatforms { get; set; } = string.Empty; // JSON array of blocked platform names
    
    [StringLength(1000)]
    public string PreferredHashtags { get; set; } = string.Empty; // Default hashtags for sharing
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}

// Add missing DTOs for test compatibility

// Models moved to OnboardingModels.cs for better organization

// Missing models for PaywallService tests
public class PaywallRequest
{
    public Guid UserId { get; set; }
    public string? SubscriptionTier { get; set; }
    public string? Feature { get; set; }
    public Dictionary<string, object>? Metadata { get; set; } = new();
}

public class PaywallResult
{
    public bool ShouldShowPaywall { get; set; }
    public string? PaywallMessage { get; set; }
    public string? RedirectUrl { get; set; }
    public Dictionary<string, object>? PaywallData { get; set; } = new();
}

// DTOs already defined above - removed duplicates

public class PlatformShareStats
{
    public string Platform { get; set; } = string.Empty;
    public int ShareCount { get; set; }
    public int ClickCount { get; set; }
    public double ClickThroughRate { get; set; }
}

public class OpenGraphData
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Image { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string Type { get; set; } = "website";
}

public class TwitterCardData
{
    public string Card { get; set; } = "summary";
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Image { get; set; } = string.Empty;
    public string Site { get; set; } = string.Empty;
}


}
