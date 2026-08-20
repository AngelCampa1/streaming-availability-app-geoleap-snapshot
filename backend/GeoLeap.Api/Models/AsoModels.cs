using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json.Serialization;

namespace GeoLeap.Api.Models;

#region ASO Core Models

/// <summary>
/// App Store Optimization keyword tracking with ML-powered discovery
/// </summary>
public class AsoKeyword
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    [StringLength(200)]
    public string Keyword { get; set; } = string.Empty;
    
    [Required]
    public AppStore AppStore { get; set; }
    
    [Required]
    [StringLength(100)]
    public string Country { get; set; } = "US";
    
    [StringLength(10)]
    public string Language { get; set; } = "en";
    
    // ML-powered metrics
    public int SearchVolume { get; set; }
    public double Difficulty { get; set; } // 0-100
    public double Relevance { get; set; } // 0-1
    public double ConversionPotential { get; set; } // 0-1
    
    // Ranking data
    public int? CurrentRank { get; set; }
    public int? BestRank { get; set; }
    public int? PreviousRank { get; set; }
    
    // Competition analysis
    public double CompetitionDensity { get; set; }
    public List<string> TopCompetitors { get; set; } = new();
    
    // Tracking metadata
    public KeywordSource Source { get; set; }
    public KeywordStatus Status { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
    public DateTime? LastRanked { get; set; }
    
    // User association - FIXED: Changed from int to Guid to match User.Id type
    public Guid UserId { get; set; }
    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;
    
    // Navigation properties
    public ICollection<KeywordRanking> Rankings { get; set; } = new List<KeywordRanking>();
    public ICollection<AsoAbTest> AbTests { get; set; } = new List<AsoAbTest>();
}

/// <summary>
/// App store listing optimization with A/B testing
/// </summary>
public class AppStoreListing
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    [StringLength(200)]
    public string AppName { get; set; } = string.Empty;
    
    [Required]
    [StringLength(500)]
    public string BundleId { get; set; } = string.Empty;
    
    [Required]
    public AppStore AppStore { get; set; }
    
    [Required]
    [StringLength(100)]
    public string Country { get; set; } = "US";
    
    [StringLength(10)]
    public string Language { get; set; } = "en";
    
    // Listing content
    [StringLength(30)] // App Store limit
    public string Title { get; set; } = string.Empty;
    
    [StringLength(30)] // App Store subtitle limit
    public string Subtitle { get; set; } = string.Empty;
    
    [StringLength(4000)] // App Store description limit
    public string Description { get; set; } = string.Empty;
    
    [StringLength(100)] // Keyword field limit
    public string Keywords { get; set; } = string.Empty;
    
    [StringLength(170)] // Promotional text limit
    public string PromotionalText { get; set; } = string.Empty;
    
    [StringLength(4000)] // Release notes limit
    public string ReleaseNotes { get; set; } = string.Empty;
    
    // Visual assets
    public List<string> Screenshots { get; set; } = new();
    public List<string> PreviewVideos { get; set; } = new();
    public string? IconUrl { get; set; }
    
    // Performance metrics
    public double ConversionRate { get; set; }
    public int Downloads { get; set; }
    public int Views { get; set; }
    public double Rating { get; set; }
    public int ReviewCount { get; set; }
    
    // A/B testing
    public bool IsTestVariant { get; set; }
    public int? ParentListingId { get; set; }
    [ForeignKey(nameof(ParentListingId))]
    public AppStoreListing? ParentListing { get; set; }
    
    // Status and metadata
    public ListingStatus Status { get; set; } = ListingStatus.Draft;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? PublishedAt { get; set; }
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
    
    // User association - FIXED: Changed from int to Guid to match User.Id type
    public Guid UserId { get; set; }
    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;
    
    // Navigation properties
    public ICollection<AppStoreListing> TestVariants { get; set; } = new List<AppStoreListing>();
    public ICollection<AsoAbTest> AbTests { get; set; } = new List<AsoAbTest>();
    public ICollection<AppStoreReview> Reviews { get; set; } = new List<AppStoreReview>();
}

/// <summary>
/// App store reviews with sentiment analysis
/// </summary>
public class AppStoreReview
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    [StringLength(500)]
    public string ReviewId { get; set; } = string.Empty; // External review ID
    
    [Required]
    public int ListingId { get; set; }
    [ForeignKey(nameof(ListingId))]
    public AppStoreListing Listing { get; set; } = null!;
    
    [Required]
    [StringLength(200)]
    public string ReviewerName { get; set; } = string.Empty;
    
    [Range(1, 5)]
    public int Rating { get; set; }
    
    [StringLength(500)]
    public string Title { get; set; } = string.Empty;
    
    [StringLength(4000)]
    public string Content { get; set; } = string.Empty;
    
    [StringLength(20)]
    public string Version { get; set; } = string.Empty;
    
    [Required]
    public DateTime ReviewDate { get; set; }
    
    [Required]
    [StringLength(100)]
    public string Country { get; set; } = "US";
    
    [StringLength(10)]
    public string Language { get; set; } = "en";
    
    // Sentiment analysis results
    public double SentimentScore { get; set; } // -1 to 1
    public SentimentLabel SentimentLabel { get; set; }
    public double Confidence { get; set; }
    
    // Topic extraction
    public List<string> Topics { get; set; } = new();
    public List<string> Issues { get; set; } = new();
    public List<string> Compliments { get; set; } = new();
    
    // Response tracking
    public bool HasDeveloperResponse { get; set; }
    public string? DeveloperResponse { get; set; }
    public DateTime? ResponseDate { get; set; }
    
    // Metadata
    public bool IsHelpful { get; set; }
    public bool IsVerifiedPurchase { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Keyword ranking tracking over time
/// </summary>
public class KeywordRanking
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    public int KeywordId { get; set; }
    [ForeignKey(nameof(KeywordId))]
    public AsoKeyword Keyword { get; set; } = null!;
    
    [Required]
    public int ListingId { get; set; }
    [ForeignKey(nameof(ListingId))]
    public AppStoreListing Listing { get; set; } = null!;
    
    [Required]
    public int Rank { get; set; }
    
    public int? PreviousRank { get; set; }
    public int RankChange => PreviousRank.HasValue ? PreviousRank.Value - Rank : 0;
    
    [Required]
    public DateTime RankedAt { get; set; } = DateTime.UtcNow;
    
    // Additional context
    public int? CategoryRank { get; set; }
    public string? Category { get; set; }
    public double? VisibilityScore { get; set; }
}

/// <summary>
/// A/B testing for app store optimizations
/// </summary>
public class AsoAbTest
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    [StringLength(200)]
    public string Name { get; set; } = string.Empty;
    
    [StringLength(1000)]
    public string Description { get; set; } = string.Empty;
    
    [Required]
    public AbTestType Type { get; set; }
    
    [Required]
    public AbTestStatus Status { get; set; } = AbTestStatus.Draft;
    
    // Test configuration
    public int ControlListingId { get; set; }
    [ForeignKey(nameof(ControlListingId))]
    public AppStoreListing ControlListing { get; set; } = null!;
    
    public int VariantListingId { get; set; }
    [ForeignKey(nameof(VariantListingId))]
    public AppStoreListing VariantListing { get; set; } = null!;
    
    public double TrafficSplit { get; set; } = 0.5; // 50/50 split default
    
    // Test metrics
    public AbTestMetrics ControlMetrics { get; set; } = new();
    public AbTestMetrics VariantMetrics { get; set; } = new();
    
    // Statistical analysis
    public double? StatisticalSignificance { get; set; }
    public double? ConfidenceLevel { get; set; } = 0.95;
    public bool IsStatisticallySignificant { get; set; }
    
    // Test timeline
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
    
    // User association - FIXED: Changed from int to Guid to match User.Id type
    public Guid UserId { get; set; }
    [ForeignKey(nameof(UserId))]
    public User User { get; set; } = null!;
    
    // Associated keywords for keyword-specific tests
    public List<int> KeywordIds { get; set; } = new();
}

/// <summary>
/// App store analytics aggregation
/// </summary>
public class AsoAnalytics
{
    [Key]
    public int Id { get; set; }
    
    [Required]
    public int ListingId { get; set; }
    [ForeignKey(nameof(ListingId))]
    public AppStoreListing Listing { get; set; } = null!;
    
    [Required]
    public DateTime Date { get; set; }
    
    [Required]
    public AnalyticsGranularity Granularity { get; set; }
    
    // Core metrics
    public int Views { get; set; }
    public int Downloads { get; set; }
    public double ConversionRate { get; set; }
    
    // Search metrics
    public int OrganicViews { get; set; }
    public int SearchViews { get; set; }
    public int BrowseViews { get; set; }
    public int ReferralViews { get; set; }
    
    // Keyword performance
    public Dictionary<string, int> KeywordViews { get; set; } = new();
    public Dictionary<string, double> KeywordConversions { get; set; } = new();
    
    // Review metrics
    public double AverageRating { get; set; }
    public int TotalReviews { get; set; }
    public int NewReviews { get; set; }
    public double SentimentScore { get; set; }
    
    // Ranking metrics
    public Dictionary<string, int> CategoryRankings { get; set; } = new();
    public Dictionary<string, int> KeywordRankings { get; set; } = new();
    
    // Competitor analysis
    public Dictionary<string, CompetitorMetrics> CompetitorData { get; set; } = new();
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

#endregion

#region Supporting Models and DTOs

/// <summary>
/// A/B test metrics container
/// </summary>
public class AbTestMetrics
{
    public int Views { get; set; }
    public int Downloads { get; set; }
    public double ConversionRate { get; set; }
    public int UniqueUsers { get; set; }
    public double AverageRating { get; set; }
    public int ReviewCount { get; set; }
    public double Revenue { get; set; }
    public Dictionary<string, double> CustomMetrics { get; set; } = new();
}

/// <summary>
/// Competitor analysis metrics
/// </summary>
public class CompetitorMetrics
{
    public string AppName { get; set; } = string.Empty;
    public string BundleId { get; set; } = string.Empty;
    public int Rank { get; set; }
    public double Rating { get; set; }
    public int ReviewCount { get; set; }
    public int EstimatedDownloads { get; set; }
    public List<string> TopKeywords { get; set; } = new();
}

#endregion

#region Enumerations

public enum AppStore
{
    iOS = 1,
    GooglePlay = 2,
    Both = 3
}

public enum KeywordSource
{
    Manual = 1,
    MLDiscovery = 2,
    CompetitorAnalysis = 3,
    SearchConsole = 4,
    AppStoreConnect = 5
}

public enum KeywordStatus
{
    Active = 1,
    Inactive = 2,
    Testing = 3,
    Archived = 4
}

public enum ListingStatus
{
    Draft = 1,
    InReview = 2,
    Live = 3,
    Rejected = 4,
    Archived = 5
}

public enum SentimentLabel
{
    VeryNegative = 1,
    Negative = 2,
    Neutral = 3,
    Positive = 4,
    VeryPositive = 5
}

public enum AbTestType
{
    Title = 1,
    Subtitle = 2,
    Description = 3,
    Keywords = 4,
    Screenshots = 5,
    Icon = 6,
    Full = 7 // All elements
}

public enum AbTestStatus
{
    Draft = 1,
    Running = 2,
    Completed = 3,
    Stopped = 4,
    Archived = 5
}

public enum AnalyticsGranularity
{
    Hourly = 1,
    Daily = 2,
    Weekly = 3,
    Monthly = 4
}

#endregion

#region DTOs

public class AsoKeywordDto
{
    public int Id { get; set; }
    public string Keyword { get; set; } = string.Empty;
    public AppStore AppStore { get; set; }
    public string Country { get; set; } = string.Empty;
    public string Language { get; set; } = string.Empty;
    public int SearchVolume { get; set; }
    public double Difficulty { get; set; }
    public double Relevance { get; set; }
    public double ConversionPotential { get; set; }
    public int? CurrentRank { get; set; }
    public int? BestRank { get; set; }
    public int? PreviousRank { get; set; }
    public double CompetitionDensity { get; set; }
    public List<string> TopCompetitors { get; set; } = new();
    public KeywordSource Source { get; set; }
    public KeywordStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime LastUpdated { get; set; }
}

public class CreateAsoKeywordDto
{
    [Required]
    [StringLength(200)]
    public string Keyword { get; set; } = string.Empty;
    
    [Required]
    public AppStore AppStore { get; set; }
    
    [Required]
    [StringLength(100)]
    public string Country { get; set; } = "US";
    
    [StringLength(10)]
    public string Language { get; set; } = "en";
    
    public KeywordSource Source { get; set; } = KeywordSource.Manual;
    public KeywordStatus Status { get; set; } = KeywordStatus.Active;
}

public class AppStoreListingDto
{
    public int Id { get; set; }
    public string AppName { get; set; } = string.Empty;
    public string BundleId { get; set; } = string.Empty;
    public AppStore AppStore { get; set; }
    public string Country { get; set; } = string.Empty;
    public string Language { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Subtitle { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Keywords { get; set; } = string.Empty;
    public string PromotionalText { get; set; } = string.Empty;
    public string ReleaseNotes { get; set; } = string.Empty;
    public List<string> Screenshots { get; set; } = new();
    public List<string> PreviewVideos { get; set; } = new();
    public string? IconUrl { get; set; }
    public double ConversionRate { get; set; }
    public int Downloads { get; set; }
    public int Views { get; set; }
    public double Rating { get; set; }
    public int ReviewCount { get; set; }
    public ListingStatus Status { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? PublishedAt { get; set; }
}

public class CreateAppStoreListingDto
{
    [Required]
    [StringLength(200)]
    public string AppName { get; set; } = string.Empty;
    
    [Required]
    [StringLength(500)]
    public string BundleId { get; set; } = string.Empty;
    
    [Required]
    public AppStore AppStore { get; set; }
    
    [Required]
    [StringLength(100)]
    public string Country { get; set; } = "US";
    
    [StringLength(10)]
    public string Language { get; set; } = "en";
    
    [StringLength(30)]
    public string Title { get; set; } = string.Empty;
    
    [StringLength(30)]
    public string Subtitle { get; set; } = string.Empty;
    
    [StringLength(4000)]
    public string Description { get; set; } = string.Empty;
    
    [StringLength(100)]
    public string Keywords { get; set; } = string.Empty;
    
    [StringLength(170)]
    public string PromotionalText { get; set; } = string.Empty;
    
    [StringLength(4000)]
    public string ReleaseNotes { get; set; } = string.Empty;
    
    public List<string> Screenshots { get; set; } = new();
    public List<string> PreviewVideos { get; set; } = new();
    public string? IconUrl { get; set; }
}

public class AsoAnalyticsDto
{
    public DateTime Date { get; set; }
    public AnalyticsGranularity Granularity { get; set; }
    public int Views { get; set; }
    public int Downloads { get; set; }
    public double ConversionRate { get; set; }
    public int OrganicViews { get; set; }
    public int SearchViews { get; set; }
    public int BrowseViews { get; set; }
    public int ReferralViews { get; set; }
    public Dictionary<string, int> KeywordViews { get; set; } = new();
    public Dictionary<string, double> KeywordConversions { get; set; } = new();
    public double AverageRating { get; set; }
    public int TotalReviews { get; set; }
    public int NewReviews { get; set; }
    public double SentimentScore { get; set; }
    public Dictionary<string, int> CategoryRankings { get; set; } = new();
    public Dictionary<string, int> KeywordRankings { get; set; } = new();
    public Dictionary<string, CompetitorMetrics> CompetitorData { get; set; } = new();
}

public class CreateAsoAbTestDto
{
    [Required]
    [StringLength(200)]
    public string Name { get; set; } = string.Empty;
    
    [StringLength(1000)]
    public string Description { get; set; } = string.Empty;
    
    [Required]
    public AbTestType Type { get; set; }
    
    [Required]
    public int ControlListingId { get; set; }
    
    [Required]
    public int VariantListingId { get; set; }
    
    [Range(0.1, 0.9)]
    public double TrafficSplit { get; set; } = 0.5;
    
    [Range(0.8, 0.99)]
    public double ConfidenceLevel { get; set; } = 0.95;
    
    public List<int> KeywordIds { get; set; } = new();
}

public class KeywordDiscoveryRequestDto
{
    [Required]
    [StringLength(500)]
    public string SeedKeywords { get; set; } = string.Empty; // Comma-separated
    
    [Required]
    public AppStore AppStore { get; set; }
    
    [Required]
    [StringLength(100)]
    public string Country { get; set; } = "US";
    
    [StringLength(10)]
    public string Language { get; set; } = "en";
    
    [StringLength(500)]
    public string? CompetitorBundleIds { get; set; } // Comma-separated
    
    [Range(10, 1000)]
    public int MaxResults { get; set; } = 100;
    
    [Range(0.1, 1.0)]
    public double MinRelevance { get; set; } = 0.3;
}

#endregion