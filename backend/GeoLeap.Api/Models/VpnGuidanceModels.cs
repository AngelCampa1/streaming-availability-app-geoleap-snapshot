using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace GeoLeap.Api.Models;

// Core VPN Provider Models
public class VpnProvider
{
    public Guid Id { get; set; }
    
    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;
    
    [MaxLength(500)]
    public string Description { get; set; } = string.Empty;
    
    [Required, Url]
    public string WebsiteUrl { get; set; } = string.Empty;
    
    public string? AffiliateUrl { get; set; }
    
    [MaxLength(255)]
    public string? LogoUrl { get; set; }
    
    // Pricing Information
    [Column(TypeName = "decimal(10,2)")]
    public decimal MonthlyPrice { get; set; }
    
    [Column(TypeName = "decimal(10,2)")]
    public decimal AnnualPrice { get; set; }
    
    public bool HasFreeTrial { get; set; }
    
    public int? FreeTrialDays { get; set; }
    
    // Features
    public int ServerCount { get; set; }
    
    public int CountryCount { get; set; }
    
    public bool SupportsP2P { get; set; }
    
    public bool SupportsStreaming { get; set; }
    
    public bool HasKillSwitch { get; set; }
    
    public bool HasNoLogsPolicy { get; set; }
    
    // Connection Limits
    public int? MaxSimultaneousConnections { get; set; }
    
    // Platform Support
    [MaxLength(1000)]
    public string SupportedPlatforms { get; set; } = string.Empty; // JSON array of platforms
    
    // Performance Metrics
    public double? AverageSpeedRating { get; set; } // 1-10 scale
    
    public double? ReliabilityRating { get; set; } // 1-10 scale
    
    // User Experience
    public double? EaseOfUseRating { get; set; } // 1-10 scale
    
    public double? CustomerSupportRating { get; set; } // 1-10 scale
    
    // Overall Rating (calculated from community ratings)
    public double? OverallRating { get; set; } // 1-5 scale
    
    public int TotalRatings { get; set; }
    
    // Metadata
    public DateTime CreatedAt { get; set; }
    
    public DateTime UpdatedAt { get; set; }
    
    public bool IsActive { get; set; } = true;
    
    public bool IsFeatured { get; set; }
    
    public int DisplayOrder { get; set; }
    
    [MaxLength(1000)]
    public string? AdminNotes { get; set; }
    
    // Navigation Properties
    public virtual ICollection<VpnProviderRating> Ratings { get; set; } = new List<VpnProviderRating>();
    
    public virtual ICollection<VpnStreamingCompatibility> StreamingCompatibilities { get; set; } = new List<VpnStreamingCompatibility>();
    
    public virtual ICollection<VpnServerLocation> ServerLocations { get; set; } = new List<VpnServerLocation>();
}

// Community Rating System
public class VpnProviderRating
{
    public Guid Id { get; set; }
    
    public Guid VpnProviderId { get; set; }
    
    public Guid UserId { get; set; }
    
    // Rating Type (thumbs up/down or 1-5 stars)
    public VpnRatingType RatingType { get; set; }
    
    // For thumbs up/down: 1 = thumbs up, 0 = thumbs down
    // For stars: 1-5 scale
    public int Rating { get; set; }
    
    [MaxLength(1000)]
    public string? Review { get; set; }
    
    // Specific rating categories
    public int? SpeedRating { get; set; } // 1-5
    
    public int? ReliabilityRating { get; set; } // 1-5
    
    public int? EaseOfUseRating { get; set; } // 1-5
    
    public int? CustomerSupportRating { get; set; } // 1-5
    
    public int? ValueForMoneyRating { get; set; } // 1-5
    
    // Metadata
    public DateTime CreatedAt { get; set; }
    
    public DateTime? UpdatedAt { get; set; }
    
    public bool IsVerified { get; set; } // For verified users or purchases
    
    public bool IsHelpful { get; set; } // Community feedback
    
    public int HelpfulVotes { get; set; }
    
    public int UnhelpfulVotes { get; set; }
    
    [MaxLength(45)] // IPv6 length
    public string? IpAddress { get; set; }
    
    [MaxLength(1000)]
    public string? UserAgent { get; set; }
    
    // Navigation Properties
    public virtual VpnProvider VpnProvider { get; set; } = null!;
    
    public virtual User User { get; set; } = null!;
}

public enum VpnRatingType
{
    ThumbsUpDown = 1,
    FiveStars = 2
}

// VPN Server Locations
public class VpnServerLocation
{
    public Guid Id { get; set; }
    
    public Guid VpnProviderId { get; set; }
    
    [Required, MaxLength(100)]
    public string Country { get; set; } = string.Empty;
    
    [Required, MaxLength(3)]
    public string CountryCode { get; set; } = string.Empty; // ISO 3166-1 alpha-3
    
    [MaxLength(100)]
    public string? City { get; set; }
    
    public int ServerCount { get; set; }
    
    public bool IsOptimizedForStreaming { get; set; }
    
    public bool IsP2PFriendly { get; set; }
    
    public DateTime CreatedAt { get; set; }
    
    public DateTime UpdatedAt { get; set; }
    
    // Navigation Properties
    public virtual VpnProvider VpnProvider { get; set; } = null!;
}

// Streaming Service Compatibility
public class VpnStreamingCompatibility
{
    public Guid Id { get; set; }
    
    public Guid VpnProviderId { get; set; }
    
    public Guid StreamingServiceId { get; set; }
    
    public VpnStreamingStatus Status { get; set; }
    
    [MaxLength(500)]
    public string? Notes { get; set; }
    
    public DateTime LastTested { get; set; }
    
    public DateTime CreatedAt { get; set; }
    
    public DateTime UpdatedAt { get; set; }
    
    // Specific regions where this compatibility is confirmed
    [MaxLength(1000)]
    public string? CompatibleRegions { get; set; } // JSON array
    
    // Navigation Properties
    public virtual VpnProvider VpnProvider { get; set; } = null!;
    
    public virtual StreamingService StreamingService { get; set; } = null!;
}

public enum VpnStreamingStatus
{
    NotTested = 0,
    WorksReliably = 1,
    WorksSometimes = 2,
    DoesNotWork = 3,
    Blocked = 4
}

// VPN Setup Guides
public class VpnSetupGuide
{
    public Guid Id { get; set; }
    
    public Guid VpnProviderId { get; set; }
    
    [Required, MaxLength(200)]
    public string Title { get; set; } = string.Empty;
    
    [Required, MaxLength(100)]
    public string Platform { get; set; } = string.Empty; // Windows, macOS, iOS, Android, etc.
    
    [Required]
    public string Content { get; set; } = string.Empty; // Rich text/HTML content
    
    public int StepCount { get; set; }
    
    public TimeSpan EstimatedTime { get; set; }
    
    public VpnDifficultyLevel Difficulty { get; set; }
    
    [MaxLength(1000)]
    public string? Prerequisites { get; set; }
    
    [MaxLength(1000)]
    public string? TroubleshootingTips { get; set; }
    
    public DateTime CreatedAt { get; set; }
    
    public DateTime UpdatedAt { get; set; }
    
    public bool IsActive { get; set; } = true;
    
    public int ViewCount { get; set; }
    
    public double? HelpfulnessRating { get; set; }
    
    public int HelpfulnessVotes { get; set; }
    
    // Navigation Properties
    public virtual VpnProvider VpnProvider { get; set; } = null!;
}

public enum VpnDifficultyLevel
{
    Beginner = 1,
    Intermediate = 2,
    Advanced = 3
}

// Legal Disclaimers Management
public class VpnLegalDisclaimer
{
    public Guid Id { get; set; }
    
    [Required, MaxLength(100)]
    public string Title { get; set; } = string.Empty;
    
    [Required]
    public string Content { get; set; } = string.Empty;
    
    public VpnDisclaimerType Type { get; set; }
    
    [MaxLength(10)]
    public string? CountryCode { get; set; } // For country-specific disclaimers
    
    public bool IsRequired { get; set; } = true;
    
    public int DisplayOrder { get; set; }
    
    public DateTime EffectiveDate { get; set; }
    
    public DateTime? ExpirationDate { get; set; }
    
    public DateTime CreatedAt { get; set; }
    
    public DateTime UpdatedAt { get; set; }
    
    public bool IsActive { get; set; } = true;
    
    public Guid CreatedByUserId { get; set; }
    
    public Guid? UpdatedByUserId { get; set; }
    
    [MaxLength(500)]
    public string? AdminNotes { get; set; }
}

public enum VpnDisclaimerType
{
    General = 1,
    Legal = 2,
    Privacy = 3,
    Streaming = 4,
    P2P = 5,
    CountrySpecific = 6
}

// VPN Best Practices Content
public class VpnBestPractice
{
    public Guid Id { get; set; }
    
    [Required, MaxLength(200)]
    public string Title { get; set; } = string.Empty;
    
    [MaxLength(500)]
    public string Summary { get; set; } = string.Empty;
    
    [Required]
    public string Content { get; set; } = string.Empty;
    
    public VpnPracticeCategory Category { get; set; }
    
    public VpnPracticeImportance ImportanceLevel { get; set; }
    
    [MaxLength(1000)]
    public string? Tags { get; set; } // JSON array
    
    public int DisplayOrder { get; set; }
    
    public bool IsActive { get; set; } = true;
    
    public DateTime CreatedAt { get; set; }
    
    public DateTime UpdatedAt { get; set; }
    
    public int ViewCount { get; set; }
    
    public double? HelpfulnessRating { get; set; }
    
    public int HelpfulnessVotes { get; set; }
    
    public Guid CreatedByUserId { get; set; }
    
    public Guid? UpdatedByUserId { get; set; }
}

public enum VpnPracticeCategory
{
    Security = 1,
    Privacy = 2,
    Performance = 3,
    Streaming = 4,
    P2PFileSharing = 5,
    Mobile = 6,
    Troubleshooting = 7,
    Legal = 8
}

public enum VpnPracticeImportance
{
    Low = 1,
    Medium = 2,
    High = 3,
    Critical = 4
}

// User VPN Preferences and History
public class UserVpnPreference
{
    public Guid Id { get; set; }
    
    public Guid UserId { get; set; }
    
    // Preferred VPN features
    public bool PrefersNoLogsPolicy { get; set; } = true;
    
    public bool RequiresKillSwitch { get; set; } = true;
    
    public bool NeedsStreamingSupport { get; set; }
    
    public bool NeedsP2PSupport { get; set; }
    
    // Budget preferences
    [Column(TypeName = "decimal(10,2)")]
    public decimal? MaxMonthlyBudget { get; set; }
    
    [Column(TypeName = "decimal(10,2)")]
    public decimal? MaxAnnualBudget { get; set; }
    
    // Platform requirements
    [MaxLength(1000)]
    public string? RequiredPlatforms { get; set; } // JSON array
    
    // Location preferences
    [MaxLength(1000)]
    public string? PreferredServerCountries { get; set; } // JSON array
    
    public int? MinServerCount { get; set; }
    
    public int? MinCountryCount { get; set; }
    
    // Connection requirements
    public int? RequiredSimultaneousConnections { get; set; }
    
    // Streaming service priorities
    [MaxLength(1000)]
    public string? ImportantStreamingServices { get; set; } // JSON array of streaming service IDs
    
    public DateTime CreatedAt { get; set; }
    
    public DateTime UpdatedAt { get; set; }
    
    // Navigation Properties
    public virtual User User { get; set; } = null!;
}

// Analytics and Tracking
public class VpnGuidanceAnalytics
{
    public Guid Id { get; set; }
    
    public Guid? UserId { get; set; } // Null for anonymous users
    
    public VpnGuidanceEventType EventType { get; set; }
    
    public Guid? VpnProviderId { get; set; }
    
    public Guid? GuideId { get; set; }
    
    [MaxLength(1000)]
    public string? EventData { get; set; } // JSON with additional context
    
    [MaxLength(45)]
    public string? IpAddress { get; set; }
    
    [MaxLength(1000)]
    public string? UserAgent { get; set; }
    
    [MaxLength(2000)]
    public string? Referrer { get; set; }
    
    public DateTime Timestamp { get; set; }
    
    [MaxLength(36)]
    public string? SessionId { get; set; }
}

public enum VpnGuidanceEventType
{
    ProviderViewed = 1,
    ProviderRated = 2,
    ProviderClicked = 3,
    AffiliateClicked = 4,
    GuideViewed = 5,
    GuideRated = 6,
    ComparisonPerformed = 7,
    FilterApplied = 8,
    SearchPerformed = 9,
    SetupStarted = 10,
    SetupCompleted = 11,
    SupportContactInitiated = 12
}

// DTOs for API responses
public class VpnProviderDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string WebsiteUrl { get; set; } = string.Empty;
    public string? AffiliateUrl { get; set; }
    public string? LogoUrl { get; set; }
    public decimal MonthlyPrice { get; set; }
    public decimal AnnualPrice { get; set; }
    public bool HasFreeTrial { get; set; }
    public int? FreeTrialDays { get; set; }
    public int ServerCount { get; set; }
    public int CountryCount { get; set; }
    public bool SupportsP2P { get; set; }
    public bool SupportsStreaming { get; set; }
    public bool HasKillSwitch { get; set; }
    public bool HasNoLogsPolicy { get; set; }
    public int? MaxSimultaneousConnections { get; set; }
    public List<string> SupportedPlatforms { get; set; } = new();
    public double? OverallRating { get; set; }
    public int TotalRatings { get; set; }
    public bool IsFeatured { get; set; }
    public List<VpnStreamingCompatibilityDto> StreamingCompatibilities { get; set; } = new();
    public List<VpnServerLocationDto> ServerLocations { get; set; } = new();

    // Language compatibility fields
    public double LanguageCompatibilityScore { get; set; }
    public List<string> AudioLanguages { get; set; } = new();
    public List<string> SubtitleLanguages { get; set; } = new();
    public string? LanguageMatchQuality { get; set; } // "Perfect", "Good", "Partial", "Limited"
    public List<string> LanguageWarnings { get; set; } = new();
}

public class VpnStreamingCompatibilityDto
{
    public Guid StreamingServiceId { get; set; }
    public string StreamingServiceName { get; set; } = string.Empty;
    public VpnStreamingStatus Status { get; set; }
    public string? Notes { get; set; }
    public DateTime LastTested { get; set; }
    public List<string>? CompatibleRegions { get; set; }
}

public class VpnServerLocationDto
{
    public string Country { get; set; } = string.Empty;
    public string CountryCode { get; set; } = string.Empty;
    public string? City { get; set; }
    public int ServerCount { get; set; }
    public bool IsOptimizedForStreaming { get; set; }
    public bool IsP2PFriendly { get; set; }
}

public class VpnProviderComparisonDto
{
    public List<VpnProviderDto> Providers { get; set; } = new();
    public VpnComparisonCriteria ComparisonCriteria { get; set; } = new();
    public Dictionary<string, object> ComparisonMatrix { get; set; } = new();
}

public class VpnComparisonCriteria
{
    public bool ComparePrice { get; set; } = true;
    public bool CompareFeatures { get; set; } = true;
    public bool CompareRatings { get; set; } = true;
    public bool CompareStreaming { get; set; }
    public bool CompareServers { get; set; } = true;
    public List<Guid>? SpecificStreamingServices { get; set; }
}

public class VpnRatingDto
{
    public Guid VpnProviderId { get; set; }
    public VpnRatingType RatingType { get; set; }
    public int Rating { get; set; }
    public string? Review { get; set; }
    public int? SpeedRating { get; set; }
    public int? ReliabilityRating { get; set; }
    public int? EaseOfUseRating { get; set; }
    public int? CustomerSupportRating { get; set; }
    public int? ValueForMoneyRating { get; set; }
}

public class VpnSetupGuideDto
{
    public Guid Id { get; set; }
    public Guid VpnProviderId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Platform { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public int StepCount { get; set; }
    public TimeSpan EstimatedTime { get; set; }
    public VpnDifficultyLevel Difficulty { get; set; }
    public string? Prerequisites { get; set; }
    public string? TroubleshootingTips { get; set; }
    public double? HelpfulnessRating { get; set; }
    public int HelpfulnessVotes { get; set; }
}

public class VpnBestPracticeDto
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Summary { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public VpnPracticeCategory Category { get; set; }
    public VpnPracticeImportance ImportanceLevel { get; set; }
    public List<string> Tags { get; set; } = new();
    public double? HelpfulnessRating { get; set; }
    public int HelpfulnessVotes { get; set; }
    public int DisplayOrder { get; set; }
}

public class VpnRecommendationDto
{
    public List<VpnProviderDto> RecommendedProviders { get; set; } = new();
    public string RecommendationReason { get; set; } = string.Empty;
    public VpnRecommendationType RecommendationType { get; set; }
    public double ConfidenceScore { get; set; }
    public Dictionary<string, object> Criteria { get; set; } = new();
}

// Language-aware VPN recommendation DTOs
public class ContentVpnRecommendationDto : VpnRecommendationDto
{
    public string ContentId { get; set; } = string.Empty;
    public string ContentTitle { get; set; } = string.Empty;
    public Dictionary<string, CountryLanguageAvailability> CountryAvailability { get; set; } = new();
}

public class CountryLanguageAvailability
{
    public string CountryCode { get; set; } = string.Empty;
    public string CountryName { get; set; } = string.Empty;
    public List<string> AudioLanguages { get; set; } = new();
    public List<string> SubtitleLanguages { get; set; } = new();
    public double LanguageScore { get; set; }
    public bool IsRecommended { get; set; }
}

public enum VpnRecommendationType
{
    BestOverall = 1,
    BestValue = 2,
    BestForStreaming = 3,
    BestForP2P = 4,
    BestForBeginners = 5,
    BestForSecurity = 6,
    BestForSpeed = 7
}

// VPN Effectiveness Tracking Models for US-9.3

// VPN Effectiveness Test Results
public class VpnEffectivenessTest
{
    public Guid Id { get; set; }
    
    public Guid VpnProviderId { get; set; }
    
    public Guid StreamingServiceId { get; set; }
    
    [Required, MaxLength(10)]
    public string RegionCode { get; set; } = string.Empty; // ISO country code
    
    [MaxLength(100)]
    public string? ServerLocation { get; set; }
    
    public VpnTestType TestType { get; set; }
    
    public VpnTestResult Result { get; set; }
    
    public DateTime TestTimestamp { get; set; }
    
    // Performance Metrics
    public double? ConnectionSpeedMbps { get; set; }
    
    public int? LatencyMs { get; set; }
    
    public double? ReliabilityScore { get; set; } // 0-1 scale
    
    public bool AccessSuccessful { get; set; }
    
    [MaxLength(500)]
    public string? ErrorMessage { get; set; }
    
    [MaxLength(1000)]
    public string? TestDetails { get; set; } // JSON metadata
    
    // Test Infrastructure Info
    [MaxLength(100)]
    public string TestingNodeId { get; set; } = string.Empty;
    
    [MaxLength(1000)]
    public string? UserAgent { get; set; }
    
    public double TestDurationSeconds { get; set; }
    
    // Navigation Properties
    public virtual VpnProvider VpnProvider { get; set; } = null!;
    
    public virtual StreamingService StreamingService { get; set; } = null!;
}

public enum VpnTestType
{
    Automated = 1,
    UserReported = 2,
    Crowdsourced = 3,
    Scheduled = 4
}

public enum VpnTestResult
{
    Success = 1,
    Failed = 2,
    Blocked = 3,
    Timeout = 4,
    ConnectionError = 5,
    ContentNotAvailable = 6
}

// Real-time Effectiveness Aggregation
public class VpnEffectivenessSnapshot
{
    public Guid Id { get; set; }
    
    public Guid VpnProviderId { get; set; }
    
    public Guid StreamingServiceId { get; set; }
    
    [Required, MaxLength(10)]
    public string RegionCode { get; set; } = string.Empty;
    
    // Effectiveness Metrics (last 24 hours)
    public double SuccessRate { get; set; } // 0-1 scale
    
    public double AverageSpeedMbps { get; set; }
    
    public double AverageLatencyMs { get; set; }
    
    public double ReliabilityScore { get; set; }
    
    // Confidence Indicators
    public int TotalTestsLast24h { get; set; }
    
    public int AutomatedTestsLast24h { get; set; }
    
    public int UserReportsLast24h { get; set; }
    
    public double ConfidenceScore { get; set; } // 0-1 scale based on sample size & recency
    
    public DateTime LastUpdated { get; set; }
    
    public DateTime LastSuccessfulTest { get; set; }
    
    public DateTime? LastFailedTest { get; set; }
    
    // Trend Analysis
    public double SuccessRateTrend { get; set; } // -1 to 1 (declining to improving)
    
    public EffectivenessStatus CurrentStatus { get; set; }
    
    [MaxLength(500)]
    public string? StatusNotes { get; set; }
    
    // Navigation Properties
    public virtual VpnProvider VpnProvider { get; set; } = null!;
    
    public virtual StreamingService StreamingService { get; set; } = null!;
}

public enum EffectivenessStatus
{
    Excellent = 1,
    Good = 2,
    Fair = 3,
    Poor = 4,
    Critical = 5,
    Unknown = 6
}

// User Effectiveness Feedback
public class VpnUserEffectivenessFeedback
{
    public Guid Id { get; set; }
    
    public Guid UserId { get; set; }
    
    public Guid VpnProviderId { get; set; }
    
    public Guid StreamingServiceId { get; set; }
    
    [Required, MaxLength(10)]
    public string RegionCode { get; set; } = string.Empty;
    
    [MaxLength(100)]
    public string? ServerLocation { get; set; }
    
    public bool WasSuccessful { get; set; }
    
    public VpnUserRating? SpeedRating { get; set; } // 1-5 scale
    
    public VpnUserRating? ReliabilityRating { get; set; } // 1-5 scale
    
    public VpnUserRating? OverallExperience { get; set; } // 1-5 scale
    
    [MaxLength(1000)]
    public string? Comments { get; set; }
    
    [MaxLength(500)]
    public string? IssuesEncountered { get; set; }
    
    public DateTime TestDate { get; set; }
    
    public DateTime CreatedAt { get; set; }
    
    // User Context
    [MaxLength(45)]
    public string? IpAddress { get; set; }
    
    [MaxLength(1000)]
    public string? UserAgent { get; set; }
    
    public bool IsVerified { get; set; } // Verified VPN subscriber
    
    // Helpfulness Voting
    public int HelpfulVotes { get; set; }
    
    public int UnhelpfulVotes { get; set; }
    
    // Navigation Properties
    public virtual User User { get; set; } = null!;
    
    public virtual VpnProvider VpnProvider { get; set; } = null!;
    
    public virtual StreamingService StreamingService { get; set; } = null!;
}

public enum VpnUserRating
{
    Excellent = 5,
    Good = 4,
    Average = 3,
    Poor = 2,
    Terrible = 1
}

// Historical Effectiveness Tracking
public class VpnEffectivenessHistory
{
    public Guid Id { get; set; }
    
    public Guid VpnProviderId { get; set; }
    
    public Guid StreamingServiceId { get; set; }
    
    [Required, MaxLength(10)]
    public string RegionCode { get; set; } = string.Empty;
    
    public DateTime PeriodStart { get; set; }
    
    public DateTime PeriodEnd { get; set; }
    
    // Aggregated Metrics for Period
    public double SuccessRate { get; set; }
    
    public double AverageSpeedMbps { get; set; }
    
    public double AverageLatencyMs { get; set; }
    
    public double ReliabilityScore { get; set; }
    
    public int TotalTests { get; set; }
    
    public int SuccessfulTests { get; set; }
    
    public int FailedTests { get; set; }
    
    public int UserFeedbackCount { get; set; }
    
    public double AverageUserRating { get; set; }
    
    // Confidence and Quality Indicators
    public double ConfidenceScore { get; set; }
    
    public EffectivenessStatus Status { get; set; }
    
    // Navigation Properties
    public virtual VpnProvider VpnProvider { get; set; } = null!;
    
    public virtual StreamingService StreamingService { get; set; } = null!;
}

// Effectiveness Alert Configuration
public class VpnEffectivenessAlert
{
    public Guid Id { get; set; }
    
    public Guid? VpnProviderId { get; set; } // Null for global alerts
    
    public Guid? StreamingServiceId { get; set; } // Null for provider-wide alerts
    
    [MaxLength(10)]
    public string? RegionCode { get; set; } // Null for all regions
    
    public VpnAlertType AlertType { get; set; }
    
    public VpnAlertSeverity Severity { get; set; }
    
    [Required, MaxLength(200)]
    public string Title { get; set; } = string.Empty;
    
    [MaxLength(1000)]
    public string Description { get; set; } = string.Empty;
    
    // Alert Conditions
    public double? SuccessRateThreshold { get; set; }
    
    public double? SpeedThresholdMbps { get; set; }
    
    public int? MinTestSampleSize { get; set; }
    
    public bool IsActive { get; set; } = true;
    
    public DateTime CreatedAt { get; set; }
    
    public DateTime? TriggeredAt { get; set; }
    
    public DateTime? ResolvedAt { get; set; }
    
    public Guid CreatedByUserId { get; set; }
    
    // Navigation Properties
    public virtual VpnProvider? VpnProvider { get; set; }
    
    public virtual StreamingService? StreamingService { get; set; }
}

public enum VpnAlertType
{
    EffectivenessDropped = 1,
    ServiceBlocked = 2,
    SpeedDegraded = 3,
    HighFailureRate = 4,
    NoRecentData = 5,
    NewServiceIssue = 6
}

public enum VpnAlertSeverity
{
    Low = 1,
    Medium = 2,
    High = 3,
    Critical = 4
}

// Machine Learning Prediction Models
public class VpnEffectivenessPrediction
{
    public Guid Id { get; set; }
    
    public Guid VpnProviderId { get; set; }
    
    public Guid StreamingServiceId { get; set; }
    
    [Required, MaxLength(10)]
    public string RegionCode { get; set; } = string.Empty;
    
    public DateTime PredictionDate { get; set; }
    
    public DateTime PredictionMadeAt { get; set; }
    
    // Predicted Metrics
    public double PredictedSuccessRate { get; set; }
    
    public double PredictedSpeedMbps { get; set; }
    
    public EffectivenessStatus PredictedStatus { get; set; }
    
    public double PredictionConfidence { get; set; } // 0-1 scale
    
    // Model Information
    [MaxLength(100)]
    public string ModelVersion { get; set; } = string.Empty;
    
    [MaxLength(1000)]
    public string? FeatureInputs { get; set; } // JSON of input features
    
    // Validation (populated after actual results)
    public double? ActualSuccessRate { get; set; }
    
    public double? ActualSpeedMbps { get; set; }
    
    public EffectivenessStatus? ActualStatus { get; set; }
    
    public double? PredictionAccuracy { get; set; }
    
    // Navigation Properties
    public virtual VpnProvider VpnProvider { get; set; } = null!;
    
    public virtual StreamingService StreamingService { get; set; } = null!;
}

// DTOs for VPN Effectiveness API
public class VpnEffectivenessDto
{
    public Guid VpnProviderId { get; set; }
    public string VpnProviderName { get; set; } = string.Empty;
    public Guid StreamingServiceId { get; set; }
    public string StreamingServiceName { get; set; } = string.Empty;
    public string RegionCode { get; set; } = string.Empty;
    public string RegionName { get; set; } = string.Empty;
    public double SuccessRate { get; set; }
    public double AverageSpeedMbps { get; set; }
    public double AverageLatencyMs { get; set; }
    public double ReliabilityScore { get; set; }
    public double ConfidenceScore { get; set; }
    public EffectivenessStatus Status { get; set; }
    public int TotalTestsLast24h { get; set; }
    public DateTime LastUpdated { get; set; }
    public DateTime? LastSuccessfulTest { get; set; }
    public double? SuccessRateTrend { get; set; }
}

public class VpnEffectivenessTrendDto
{
    public Guid VpnProviderId { get; set; }
    public Guid StreamingServiceId { get; set; }
    public string RegionCode { get; set; } = string.Empty;
    public List<VpnEffectivenessDataPoint> DataPoints { get; set; } = new();
    public Dictionary<string, object> TrendAnalysis { get; set; } = new();
}

public class VpnEffectivenessDataPoint
{
    public DateTime Timestamp { get; set; }
    public double SuccessRate { get; set; }
    public double SpeedMbps { get; set; }
    public double LatencyMs { get; set; }
    public int TestCount { get; set; }
    public EffectivenessStatus Status { get; set; }
}

public class VpnUserFeedbackDto
{
    public Guid VpnProviderId { get; set; }
    public Guid StreamingServiceId { get; set; }
    public string RegionCode { get; set; } = string.Empty;
    public string? ServerLocation { get; set; }
    public bool WasSuccessful { get; set; }
    public VpnUserRating? SpeedRating { get; set; }
    public VpnUserRating? ReliabilityRating { get; set; }
    public VpnUserRating? OverallExperience { get; set; }
    public string? Comments { get; set; }
    public string? IssuesEncountered { get; set; }
    public DateTime TestDate { get; set; }
}

public class VpnEffectivenessFilterDto
{
    public List<Guid>? VpnProviderIds { get; set; }
    public List<Guid>? StreamingServiceIds { get; set; }
    public List<string>? RegionCodes { get; set; }
    public EffectivenessStatus? MinStatus { get; set; }
    public double? MinSuccessRate { get; set; }
    public double? MinSpeedMbps { get; set; }
    public double? MinConfidenceScore { get; set; }
    public DateTime? SinceDate { get; set; }
    public int? LimitResults { get; set; }
    public bool IncludePredictions { get; set; }
}

public class VpnEffectivenessSummaryDto
{
    public List<VpnEffectivenessDto> ProviderSummaries { get; set; } = new();
    public Dictionary<string, object> OverallStatistics { get; set; } = new();
    public List<VpnEffectivenessAlert> ActiveAlerts { get; set; } = new();
    public DateTime GeneratedAt { get; set; }
    public string GeneratedForRegion { get; set; } = string.Empty;
}

// NEW: Country-first VPN recommendation models (US-9.x enhancement)

/// <summary>
/// VPN provider summary for display within country recommendations
/// </summary>
public class VpnProviderSummary
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? LogoUrl { get; set; }
    public int ServerCountInCountry { get; set; }
    public double? OverallRating { get; set; }
    public decimal MonthlyPrice { get; set; }
    public string? AffiliateUrl { get; set; }
    public bool WorksWithNetflix { get; set; } // From VpnStreamingCompatibility
    public bool WorksWithPrimeVideo { get; set; }
    public bool WorksWithDisneyPlus { get; set; }
}

/// <summary>
/// Country recommendation with language availability and VPN provider options
/// </summary>
public class CountryRecommendationDto
{
    public string CountryCode { get; set; } = string.Empty;
    public string CountryName { get; set; } = string.Empty;
    public string CountryFlag { get; set; } = string.Empty; // Emoji flag

    // Language availability
    public List<string> AudioLanguages { get; set; } = new();
    public List<string> SubtitleLanguages { get; set; } = new();
    public double LanguageScore { get; set; }
    public string LanguageMatchQuality { get; set; } = string.Empty; // Perfect/Good/Partial

    // Why this country is recommended
    public List<string> LanguageHighlights { get; set; } = new();
    // e.g., ["English audio available", "Multiple subtitle options"]

    // VPN providers that work in this country
    public List<VpnProviderSummary> AvailableVpnProviders { get; set; } = new();

    // Streaming service availability
    public List<string> StreamingServices { get; set; } = new(); // Netflix, Prime, etc.

    public int Rank { get; set; } // 1 = best match
}

/// <summary>
/// Content-specific country recommendations with VPN providers as secondary information
/// </summary>
public class ContentCountryRecommendationsDto
{
    public string ContentId { get; set; } = string.Empty;
    public string ContentTitle { get; set; } = string.Empty;
    public List<string> UserAudioLanguages { get; set; } = new();
    public List<string> UserSubtitleLanguages { get; set; } = new();

    // Bug 10 fix: Renamed from RecommendedCountries to Countries to match frontend type
    public List<CountryRecommendationDto> Countries { get; set; } = new();

    // Bug 10 fix: Added TotalCountries alias for frontend compatibility
    public int TotalCountries => Countries.Count;

    // Summary stats (kept for backwards compatibility)
    public int TotalCountriesAnalyzed { get; set; }
    public int CountriesWithPerfectMatch { get; set; }
    public int CountriesWithGoodMatch { get; set; }

    // Recommendation metadata
    public double ConfidenceScore { get; set; }
    public string DataSource { get; set; } = string.Empty; // "real_api" or "fallback"
    public DateTime GeneratedAt { get; set; }
}
