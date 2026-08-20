using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace GeoLeap.Api.ProgrammaticSeo.Models;

/// <summary>
/// SEO Template for dynamic page generation
/// </summary>
public class SeoTemplate
{
    public int Id { get; set; }
    
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;
    
    [Required]
    public string Type { get; set; } = string.Empty; // location, comparison, genre, year, trending
    
    [Required]
    public string Template { get; set; } = string.Empty; // Liquid template content
    
    public string MetaTitle { get; set; } = string.Empty;
    public string MetaDescription { get; set; } = string.Empty;
    public string H1Template { get; set; } = string.Empty;
    public string UrlPattern { get; set; } = string.Empty; // /movies/{genre}/{year}/{location}
    
    public bool IsActive { get; set; } = true;
    public int Priority { get; set; } = 0; // For A/B testing
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public string CreatedBy { get; set; } = string.Empty;
    
    // Template variables definition
    public string Variables { get; set; } = "{}"; // JSON object with variable definitions
    public List<TemplateVariable> VariablesList { get; set; } = new();
    public string Category { get; set; } = string.Empty;
    
    // SEO settings
    public bool IndexPage { get; set; } = true;
    public bool FollowLinks { get; set; } = true;
    public string? CanonicalPattern { get; set; }
    public int? RefreshIntervalHours { get; set; }
    
    // Additional properties required by services
    public string Description { get; set; } = string.Empty;
    public SeoSettings? SeoSettings { get; set; }
    public string? SeoSettingsObject { get; set; }
    public bool AutoOptimization { get; set; } = false;
    public ICollection<SeoPage> Pages { get; set; } = new List<SeoPage>();
    public double AveragePerformanceScore { get; set; } = 0.0;
    public int UsageCount { get; set; } = 0;
    public int TotalPagesGenerated { get; set; } = 0;
    public double AverageSeoScore { get; set; } = 0.0;
}

/// <summary>
/// Generated SEO Page instance
/// </summary>
public class SeoPage
{
    public long Id { get; set; }
    
    [Required]
    public int TemplateId { get; set; }
    public SeoTemplate Template { get; set; } = null!;
    
    [Required]
    [MaxLength(500)]
    public string Slug { get; set; } = string.Empty; // URL slug
    
    [Required]
    public string Content { get; set; } = string.Empty; // Generated HTML content
    
    public string MetaTitle { get; set; } = string.Empty;
    public string MetaDescription { get; set; } = string.Empty;
    public string H1 { get; set; } = string.Empty;
    public string? CanonicalUrl { get; set; }
    
    // Variable values used for this page
    public string VariableValues { get; set; } = "{}"; // JSON object
    
    // SEO metrics
    public int ViewCount { get; set; } = 0;
    public DateTime? LastViewed { get; set; }
    public DateTime? LastIndexed { get; set; }
    public float? SearchRanking { get; set; }
    public string? PrimaryKeyword { get; set; }
    public int KeywordDensity { get; set; } = 0;
    
    // Content metadata
    public int WordCount { get; set; } = 0;
    public int ReadingTimeMinutes { get; set; } = 0;
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastUpdated { get; set; }
    public bool IsPublished { get; set; } = true;
    
    // Performance tracking
    public TimeSpan? GenerationTime { get; set; }
    public string? GenerationLog { get; set; }
    
    // Additional properties required by service implementations
    public string Url { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public DateTime? PublishedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public SeoPageStatus Status { get; set; } = SeoPageStatus.Draft;
    public double SeoScore { get; set; } = 0.0;
    public string Category { get; set; } = string.Empty;
    public string Keywords { get; set; } = string.Empty;
    public string MetaKeywords { get; set; } = string.Empty;
    public string SchemaMarkup { get; set; } = string.Empty;
    public Dictionary<string, object> ContentVariablesDictionary { get; set; } = new();
    public List<string> KeywordsList { get; set; } = new();
    public double ReadabilityScore { get; set; } = 0.0;
    public double KeywordDensityScore { get; set; } = 0.0;
    public string Author { get; set; } = string.Empty;
}

/// <summary>
/// Keyword research and tracking
/// </summary>
public class SeoKeyword
{
    public int Id { get; set; }
    
    [Required]
    [MaxLength(200)]
    public string Keyword { get; set; } = string.Empty;
    
    public int SearchVolume { get; set; } = 0;
    public float CompetitionScore { get; set; } = 0.0f; // 0-1 scale
    public float KeywordDifficulty { get; set; } = 0.0f; // 0-100 scale
    public decimal? CostPerClick { get; set; }
    
    // Trending data
    public float TrendingScore { get; set; } = 0.0f;
    public DateTime? TrendingDate { get; set; }
    public string TrendingReason { get; set; } = string.Empty; // new_release, viral_content, etc.
    
    // Associations
    public string ContentType { get; set; } = string.Empty; // movie, tv, genre, location
    public string? ContentId { get; set; } // Associated content ID if applicable
    public string Category { get; set; } = string.Empty;
    
    // Metadata
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
    public DateTime? LastRankingUpdate { get; set; }
    
    // Related keywords for clustering
    public string RelatedKeywords { get; set; } = "[]"; // JSON array
    public bool IsLongTail { get; set; } = false;
    public int WordCount { get; set; } = 1;
}

/// <summary>
/// Batch generation job tracking
/// </summary>
public class SeoBatchJob
{
    public long Id { get; set; }
    
    [Required]
    public string JobName { get; set; } = string.Empty;
    
    public int TemplateId { get; set; }
    public SeoTemplate Template { get; set; } = null!;
    
    public int TotalPages { get; set; } = 0;
    public int CompletedPages { get; set; } = 0;
    public int FailedPages { get; set; } = 0;
    
    public BatchJobStatus Status { get; set; } = BatchJobStatus.Pending;
    public string? ErrorLog { get; set; }
    public float ProgressPercentage => TotalPages > 0 ? (float)CompletedPages / TotalPages * 100 : 0;
    
    // Job configuration
    public string Configuration { get; set; } = "{}"; // JSON job settings
    public int BatchSize { get; set; } = 100;
    public int ConcurrencyLimit { get; set; } = 5;
    public TimeSpan? EstimatedDuration { get; set; }
    
    // Timing
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public TimeSpan? ActualDuration => CompletedAt?.Subtract(StartedAt ?? CreatedAt);
    
    public string CreatedBy { get; set; } = string.Empty;
}

/// <summary>
/// Content clustering to prevent duplication
/// </summary>
public class ContentCluster
{
    public int Id { get; set; }
    
    [Required]
    [MaxLength(100)]
    public string ClusterName { get; set; } = string.Empty;
    
    public string ContentType { get; set; } = string.Empty; // movie, tv, genre
    public string ClusteringCriteria { get; set; } = string.Empty; // genre+year, location+type, etc.
    
    public int MaxPagesPerCluster { get; set; } = 50;
    public int CurrentPageCount { get; set; } = 0;
    public bool IsActive { get; set; } = true;
    
    // Similarity thresholds
    public float TitleSimilarityThreshold { get; set; } = 0.8f;
    public float ContentSimilarityThreshold { get; set; } = 0.7f;
    public float KeywordOverlapThreshold { get; set; } = 0.6f;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
    
    // Associated pages
    public ICollection<SeoPage> Pages { get; set; } = new List<SeoPage>();
}

/// <summary>
/// SEO performance metrics and analytics
/// </summary>
public class SeoMetrics
{
    public long Id { get; set; }
    
    public long PageId { get; set; }
    public SeoPage Page { get; set; } = null!;
    
    // Traffic metrics
    public int DailyViews { get; set; } = 0;
    public int WeeklyViews { get; set; } = 0;
    public int MonthlyViews { get; set; } = 0;
    public int UniqueVisitors { get; set; } = 0;
    public float BounceRate { get; set; } = 0.0f;
    public TimeSpan AverageTimeOnPage { get; set; }
    
    // Search metrics
    public int SearchImpressions { get; set; } = 0;
    public int SearchClicks { get; set; } = 0;
    public float ClickThroughRate => SearchImpressions > 0 ? (float)SearchClicks / SearchImpressions : 0;
    public float AveragePosition { get; set; } = 0.0f;
    
    // Content quality metrics
    public int BacklinkCount { get; set; } = 0;
    public int InternalLinkCount { get; set; } = 0;
    public int SocialShares { get; set; } = 0;
    public float ContentQualityScore { get; set; } = 0.0f; // 0-100
    
    // Date tracking
    public DateTime MetricDate { get; set; } = DateTime.UtcNow.Date;
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Dynamic content variables for template injection
/// </summary>
public class ContentVariable
{
    public int Id { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string Name { get; set; } = string.Empty; // location, genre, year, title, etc.
    
    [Required]
    public string Value { get; set; } = string.Empty;
    
    public string VariableType { get; set; } = "string"; // string, number, date, array, object
    public string Category { get; set; } = "content"; // content, location, time, meta
    
    // For dynamic data sources
    public string? DataSource { get; set; } // API endpoint, database query, static
    public DateTime? LastRefreshed { get; set; }
    public int RefreshIntervalHours { get; set; } = 24;
    
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Template variable definitions and validation
/// </summary>
public class TemplateVariable
{
    [JsonPropertyName("name")]
    public string Name { get; set; } = string.Empty;
    
    [JsonPropertyName("type")]
    public string Type { get; set; } = "string";
    
    [JsonPropertyName("required")]
    public bool Required { get; set; } = false;
    
    [JsonPropertyName("defaultValue")]
    public string? DefaultValue { get; set; }
    
    [JsonPropertyName("validation")]
    public VariableValidation? Validation { get; set; }
    
    [JsonPropertyName("description")]
    public string? Description { get; set; }
}

public class VariableValidation
{
    [JsonPropertyName("minLength")]
    public int? MinLength { get; set; }
    
    [JsonPropertyName("maxLength")]
    public int? MaxLength { get; set; }
    
    [JsonPropertyName("pattern")]
    public string? Pattern { get; set; }
    
    [JsonPropertyName("allowedValues")]
    public string[]? AllowedValues { get; set; }
}

/// <summary>
/// Batch job status enumeration
/// </summary>
public enum BatchJobStatus
{
    Pending = 0,
    Running = 1,
    Paused = 2,
    Completed = 3,
    Failed = 4,
    Cancelled = 5
}

/// <summary>
/// SEO generation request model
/// </summary>
public class SeoGenerationRequest
{
    [Required]
    public int TemplateId { get; set; }
    
    [Required]
    public Dictionary<string, object> Variables { get; set; } = new();
    
    public string? CustomSlug { get; set; }
    public bool ForceRegenerate { get; set; } = false;
    public bool PublishImmediately { get; set; } = true;
    public string? BatchJobName { get; set; }
}

/// <summary>
/// Batch generation request for multiple pages
/// </summary>
public class SeoBatchGenerationRequest
{
    [Required]
    public int TemplateId { get; set; }
    
    [Required]
    [MinLength(1)]
    public List<Dictionary<string, object>> VariableSets { get; set; } = new();
    
    public string JobName { get; set; } = string.Empty;
    public int BatchSize { get; set; } = 100;
    public int ConcurrencyLimit { get; set; } = 5;
    public bool PublishImmediately { get; set; } = true;
    public bool ForceRegenerate { get; set; } = false;
}

/// <summary>
/// SEO analytics response model
/// </summary>
public class SeoAnalyticsResponse
{
    public int TotalPages { get; set; }
    public int PublishedPages { get; set; }
    public int TotalViews { get; set; }
    public int UniqueVisitors { get; set; }
    public float AveragePosition { get; set; }
    public float AverageClickThroughRate { get; set; }
    public float AverageBounceRate { get; set; }
    
    public List<TopPerformingPage> TopPages { get; set; } = new();
    public List<KeywordPerformance> TopKeywords { get; set; } = new();
    public Dictionary<string, int> PagesByTemplate { get; set; } = new();
    public Dictionary<string, object> TrendingMetrics { get; set; } = new();
}

public class TopPerformingPage
{
    public long PageId { get; set; }
    public string Slug { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public int Views { get; set; }
    public float Position { get; set; }
    public float ClickThroughRate { get; set; }
}

public class KeywordPerformance
{
    public string Keyword { get; set; } = string.Empty;
    public int SearchVolume { get; set; }
    public float Position { get; set; }
    public int Clicks { get; set; }
    public float ClickThroughRate { get; set; }
}

/// <summary>
/// Internal link between SEO pages
/// </summary>
public class InternalLink
{
    public long TargetPageId { get; set; }
    public string TargetSlug { get; set; } = string.Empty;
    public string TargetTitle { get; set; } = string.Empty;
    public string LinkText { get; set; } = string.Empty;
    public float RelevanceScore { get; set; }
    public string LinkType { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// Link cluster for organizing related pages
/// </summary>
public class LinkCluster
{
    public string Name { get; set; } = string.Empty;
    public List<SeoPage> Pages { get; set; } = new();
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// Point in content where links can be injected
/// </summary>
public class LinkInjectionPoint
{
    public int Position { get; set; }
    public string Context { get; set; } = string.Empty;
    public float Score { get; set; }
}

/// <summary>
/// Content metadata for streaming content
/// </summary>
public class ContentMetadata
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string[] Genres { get; set; } = Array.Empty<string>();
    public int? ReleaseYear { get; set; }
    public float? ImdbRating { get; set; }
    public float? TmdbRating { get; set; }
    public float PopularityScore { get; set; }
    public string PosterUrl { get; set; } = string.Empty;
    public string BackdropUrl { get; set; } = string.Empty;
    public string TrailerUrl { get; set; } = string.Empty;
    public string SeoTitle { get; set; } = string.Empty;
    public string SeoDescription { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string[] Cast { get; set; } = Array.Empty<string>();
    public string[] Directors { get; set; } = Array.Empty<string>();
    public int? Runtime { get; set; }
    public string ContentRating { get; set; } = string.Empty;
    public string[] AvailableCountries { get; set; } = Array.Empty<string>();
    public Dictionary<string, StreamingProvider[]> Availability { get; set; } = new();
    public string[] Keywords { get; set; } = Array.Empty<string>();
    public float TrendingScore { get; set; }
    public DateTime? LastTrendingUpdate { get; set; }
    public DateTime LastUpdated { get; set; }
    public DateTime CreatedAt { get; set; }
    public bool IsActive { get; set; }
}

/// <summary>
/// Streaming provider information
/// </summary>
public class StreamingProvider
{
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string LogoUrl { get; set; } = string.Empty;
    public string WatchUrl { get; set; } = string.Empty;
    public DateTime LastVerified { get; set; }
}

/// <summary>
/// Trending content information
/// </summary>
public class TrendingContent
{
    public string ContentId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public float TrendingScore { get; set; }
    public string TrendingReason { get; set; } = string.Empty;
    public DateTime TrendingDate { get; set; }
    public string Country { get; set; } = string.Empty;
}

/// <summary>
/// Content location statistics
/// </summary>
public class ContentLocationStats
{
    public string Country { get; set; } = string.Empty;
    public int TotalContent { get; set; }
    public int MovieCount { get; set; }
    public int TvShowCount { get; set; }
    public Dictionary<string, int> GenreDistribution { get; set; } = new();
    public Dictionary<string, int> ProviderDistribution { get; set; } = new();
    public DateTime LastUpdated { get; set; }
}

/// <summary>
/// Trending analytics data
/// </summary>
public class TrendingAnalytics
{
    public string ContentType { get; set; } = string.Empty;
    public Dictionary<string, float> TrendingByGenre { get; set; } = new();
    public Dictionary<string, float> TrendingByCountry { get; set; } = new();
    public List<TrendingContent> TopTrending { get; set; } = new();
    public DateTime AnalysisDate { get; set; }
}

/// <summary>
/// Content validation error
/// </summary>
public class ContentValidationError
{
    public string ContentId { get; set; } = string.Empty;
    public string ErrorType { get; set; } = string.Empty;
    public string ErrorMessage { get; set; } = string.Empty;
    public string Field { get; set; } = string.Empty;
    public DateTime DetectedAt { get; set; }
}

/// <summary>
/// Content quality report
/// </summary>
public class ContentQualityReport
{
    public int TotalContent { get; set; }
    public int CompleteContent { get; set; }
    public int IncompleteContent { get; set; }
    public float QualityScore { get; set; }
    public List<ContentValidationError> Errors { get; set; } = new();
    public Dictionary<string, int> IssueBreakdown { get; set; } = new();
    public DateTime GeneratedAt { get; set; }
}

/// <summary>
/// Batch operation result
/// </summary>
public class BatchOperationResult
{
    public int TotalItems { get; set; }
    public int SuccessfulItems { get; set; }
    public int FailedItems { get; set; }
    public List<string> Errors { get; set; } = new();
    public TimeSpan Duration { get; set; }
    public DateTime CompletedAt { get; set; }
}

/// <summary>
/// Content update request
/// </summary>
public class ContentUpdateRequest
{
    public string ContentId { get; set; } = string.Empty;
    public Dictionary<string, object> Updates { get; set; } = new();
    public string UpdateReason { get; set; } = string.Empty;
}

/// <summary>
/// Content opportunity for keyword research
/// </summary>
public class ContentOpportunity
{
    public string Keyword { get; set; } = string.Empty;
    public int SearchVolume { get; set; }
    public float Competition { get; set; }
    public float OpportunityScore { get; set; }
    public string ContentType { get; set; } = string.Empty;
    public string SuggestedTitle { get; set; } = string.Empty;
    public List<string> RelatedKeywords { get; set; } = new();
}

/// <summary>
/// Keyword cluster for organization
/// </summary>
public class KeywordCluster
{
    public string ClusterName { get; set; } = string.Empty;
    public List<SeoKeyword> Keywords { get; set; } = new();
    public string PrimaryKeyword { get; set; } = string.Empty;
    public float AverageVolume { get; set; }
    public float AverageCompetition { get; set; }
}

/// <summary>
/// Keyword performance report
/// </summary>
public class KeywordPerformanceReport
{
    public string Keyword { get; set; } = string.Empty;
    public int SearchVolume { get; set; }
    public float AveragePosition { get; set; }
    public int Clicks { get; set; }
    public int Impressions { get; set; }
    public float ClickThroughRate { get; set; }
    public List<KeywordRankingHistory> RankingHistory { get; set; } = new();
    public DateTime ReportDate { get; set; }
}

/// <summary>
/// Keyword ranking history
/// </summary>
public class KeywordRankingHistory
{
    public DateTime Date { get; set; }
    public float Position { get; set; }
    public int Volume { get; set; }
    public string SearchEngine { get; set; } = "google";
}

// Additional classes that were missing
public class TemplateSeoSettings
{
    public string TitlePattern { get; set; } = string.Empty;
    public string DescriptionPattern { get; set; } = string.Empty;
    public string KeywordPattern { get; set; } = string.Empty;
    public object? StructuredData { get; set; }
    public string? CanonicalUrlPattern { get; set; }
    public string[]? MetaTags { get; set; }
    public bool NoIndex { get; set; } = false;
    public bool NoFollow { get; set; } = false;
}

public class SeoPagePerformanceHistory
{
    public long Id { get; set; }
    public string PageId { get; set; } = string.Empty;
    public DateTime Date { get; set; }
    public int Views { get; set; }
    public int Clicks { get; set; }
    public int Impressions { get; set; }
    public double AveragePosition { get; set; }
    public double ClickThroughRate { get; set; }
    public double BounceRate { get; set; }
    public TimeSpan AverageTimeOnPage { get; set; }
    public double SeoScore { get; set; }
    public double ReadabilityScore { get; set; }
    public double? LargestContentfulPaint { get; set; }
    public double? FirstInputDelay { get; set; }
    public DateTime RecordedAt { get; set; } = DateTime.UtcNow;
    public double? CumulativeLayoutShift { get; set; }
    public bool CoreWebVitalsPassed { get; set; }
    public int? PerformanceScore { get; set; }
    public int? AccessibilityScore { get; set; }
    public int? SeoLighthouseScore { get; set; }
    public int? BestPracticesScore { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// SEO Settings configuration
/// </summary>
public class SeoSettings
{
    public bool IndexPage { get; set; } = true;
    public bool FollowLinks { get; set; } = true;
    public string? CanonicalPattern { get; set; }
    public int? RefreshIntervalHours { get; set; }
    public bool AutoOptimization { get; set; } = false;
    public string TitlePattern { get; set; } = string.Empty;
    public string DescriptionPattern { get; set; } = string.Empty;
    public string KeywordPattern { get; set; } = string.Empty;
    public string StructuredData { get; set; } = string.Empty;
    public Dictionary<string, object> CustomSettings { get; set; } = new();
}
