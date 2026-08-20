using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace GeoLeap.Api.Models;

/// <summary>
/// SEO metadata for content pages
/// </summary>
[Index(nameof(ContentId), nameof(ContentType))]
[Index(nameof(Slug), IsUnique = true)]
[Index(nameof(LastUpdated))]
[Index(nameof(IsActive))]
public class SeoMetadata
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Reference to the content (optional for non-content pages)
    /// </summary>
    public Guid? ContentId { get; set; }

    /// <summary>
    /// Type of content (movie, tv-show, genre, search, etc.)
    /// </summary>
    [Required]
    [MaxLength(50)]
    public string ContentType { get; set; } = string.Empty;

    /// <summary>
    /// SEO-friendly URL slug
    /// </summary>
    [Required]
    [MaxLength(200)]
    public string Slug { get; set; } = string.Empty;
    
    /// <summary>
    /// Path alias for compatibility with PerformanceIndexConfiguration
    /// </summary>
    public string Path => $"/{Slug}";

    /// <summary>
    /// Page title for SEO (55-60 chars recommended)
    /// </summary>
    [Required]
    [MaxLength(70)]
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Meta description (155-160 chars recommended)
    /// </summary>
    [Required]
    [MaxLength(170)]
    public string Description { get; set; } = string.Empty;

    /// <summary>
    /// Primary keywords (comma-separated)
    /// </summary>
    [MaxLength(500)]
    public string Keywords { get; set; } = string.Empty;

    /// <summary>
    /// Canonical URL to prevent duplicate content
    /// </summary>
    [MaxLength(500)]
    public string? CanonicalUrl { get; set; }

    /// <summary>
    /// Open Graph title (may differ from page title)
    /// </summary>
    [MaxLength(100)]
    public string? OgTitle { get; set; }

    /// <summary>
    /// Open Graph description
    /// </summary>
    [MaxLength(300)]
    public string? OgDescription { get; set; }

    /// <summary>
    /// Open Graph image URL
    /// </summary>
    [MaxLength(500)]
    public string? OgImage { get; set; }

    /// <summary>
    /// Open Graph type (website, article, video.movie, etc.)
    /// </summary>
    [MaxLength(50)]
    public string OgType { get; set; } = "website";

    /// <summary>
    /// Twitter Card type
    /// </summary>
    [MaxLength(50)]
    public string TwitterCardType { get; set; } = "summary_large_image";

    /// <summary>
    /// JSON-LD structured data
    /// </summary>
    [Column(TypeName = "ntext")]
    public string? StructuredData { get; set; }

    /// <summary>
    /// Page priority for sitemap (0.0 - 1.0)
    /// </summary>
    [Column(TypeName = "decimal(3,2)")]
    public decimal Priority { get; set; } = 0.5m;

    /// <summary>
    /// Change frequency for sitemap
    /// </summary>
    [MaxLength(20)]
    public string ChangeFrequency { get; set; } = "weekly";

    /// <summary>
    /// Whether this page should be indexed
    /// </summary>
    public bool IsIndexable { get; set; } = true;

    /// <summary>
    /// Whether this page should be followed by crawlers
    /// </summary>
    public bool IsFollowable { get; set; } = true;

    /// <summary>
    /// Whether this metadata is active
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// When this metadata was created
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// When this metadata was last updated
    /// </summary>
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
    
    /// <summary>
    /// UpdatedAt alias for compatibility with PerformanceIndexConfiguration
    /// </summary>
    public DateTime UpdatedAt => LastUpdated;

    /// <summary>
    /// Language code for this metadata
    /// </summary>
    [MaxLength(10)]
    public string Language { get; set; } = "en-US";

    /// <summary>
    /// Alternative language versions
    /// </summary>
    [MaxLength(2000)]
    public string? AlternateLanguages { get; set; }
}

/// <summary>
/// Sitemap entry for XML sitemap generation
/// </summary>
[Index(nameof(Url), IsUnique = true)]
[Index(nameof(ChangeFrequency), nameof(Priority))]
[Index(nameof(LastModified))]
public class SitemapEntry
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// The URL of the page
    /// </summary>
    [Required]
    [MaxLength(500)]
    public string Url { get; set; } = string.Empty;

    /// <summary>
    /// When the page was last modified
    /// </summary>
    public DateTime LastModified { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Change frequency
    /// </summary>
    [Required]
    [MaxLength(20)]
    public string ChangeFrequency { get; set; } = "weekly";

    /// <summary>
    /// Priority (0.0 - 1.0)
    /// </summary>
    [Column(TypeName = "decimal(3,2)")]
    public decimal Priority { get; set; } = 0.5m;

    /// <summary>
    /// Whether this URL should be included in sitemap
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Type of content for this URL
    /// </summary>
    [MaxLength(50)]
    public string ContentType { get; set; } = string.Empty;

    /// <summary>
    /// Associated content ID (if applicable)
    /// </summary>
    public Guid? ContentId { get; set; }

    /// <summary>
    /// Language for this URL
    /// </summary>
    [MaxLength(10)]
    public string Language { get; set; } = "en-US";
}

/// <summary>
/// SEO performance metrics tracking
/// </summary>
[Index(nameof(Url))]
[Index(nameof(Date))]
[Index(nameof(MetricType))]
public class SeoMetrics
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// URL being tracked
    /// </summary>
    [Required]
    [MaxLength(500)]
    public string Url { get; set; } = string.Empty;

    /// <summary>
    /// Date of the metric
    /// </summary>
    public DateTime Date { get; set; } = DateTime.UtcNow.Date;

    /// <summary>
    /// Type of metric (organic_traffic, ranking, ctr, etc.)
    /// </summary>
    [Required]
    [MaxLength(50)]
    public string MetricType { get; set; } = string.Empty;

    /// <summary>
    /// Metric value
    /// </summary>
    [Column(TypeName = "decimal(18,6)")]
    public decimal Value { get; set; }

    /// <summary>
    /// Additional metadata for the metric
    /// </summary>
    [MaxLength(1000)]
    public string? Metadata { get; set; }

    /// <summary>
    /// Source of the metric data
    /// </summary>
    [MaxLength(50)]
    public string Source { get; set; } = string.Empty;
}

// DTO Classes for API responses
public class SeoMetadataResponse
{
    public string ContentId { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Keywords { get; set; } = string.Empty;
    public string? CanonicalUrl { get; set; }
    public Dictionary<string, string> OpenGraphData { get; set; } = new();
    public Dictionary<string, string> TwitterCardData { get; set; } = new();
    public string? StructuredData { get; set; }
    public DateTime LastUpdated { get; set; }
}

public class StructuredDataResponse
{
    public string? JsonLd { get; set; }
    public Dictionary<string, object> SchemaData { get; set; } = new();
}

public class SitemapGenerationRequest
{
    public string? ContentType { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 1000;
    public string Language { get; set; } = "en-US";
    public bool IncludeImages { get; set; } = true;
    public List<string>? IncludeContentTypes { get; set; }
    public List<string>? ExcludeUrls { get; set; }
}

public class ContentPageRequest
{
    public string Type { get; set; } = string.Empty;
    public string Id { get; set; } = string.Empty;
}

public class PerformanceMetricsRequest
{
    public string Url { get; set; } = string.Empty;
    public string DeviceType { get; set; } = "desktop";
    public string Strategy { get; set; } = "desktop";
}

public class PerformanceMetricsResponse
{
    public List<MetricDataPoint> Metrics { get; set; } = new();
    public string Status { get; set; } = string.Empty;
}

public class MetricDataPoint
{
    public string Name { get; set; } = string.Empty;
    public double Value { get; set; }
    public string Unit { get; set; } = string.Empty;
}

public class CoreWebVitalsData
{
    public double? LargestContentfulPaint { get; set; }
    public double? FirstInputDelay { get; set; }
    public decimal? CumulativeLayoutShift { get; set; }
    public double? FirstContentfulPaint { get; set; }
    public double? TimeToInteractive { get; set; }
    public int? PerformanceScore { get; set; }
    public string Status { get; set; } = string.Empty; // good, needs-improvement, poor
}

public class PerformanceRecommendations
{
    public List<string> Recommendations { get; set; } = new();
}

public class SeoAnalyticsRequest
{
    public string Url { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
}

public class SeoAnalyticsResponse
{
    public List<SeoMetrics> Metrics { get; set; } = new();
}

public class SeoIssue
{
    public string Type { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Severity { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public List<string> Recommendations { get; set; } = new();
    public string Recommendation { get; set; } = string.Empty;
}

public class SeoSummary
{
    public int TotalPages { get; set; }
    public int IndexedPages { get; set; }
    public double AverageRanking { get; set; }
    public int TotalKeywords { get; set; }
    public List<SeoIssue> TopIssues { get; set; } = new();
}

public class ContentPerformanceData
{
    public string Url { get; set; } = string.Empty;
    public int PageViews { get; set; }
    public double AverageTimeOnPage { get; set; }
    public double BounceRate { get; set; }
    public List<string> TopKeywords { get; set; } = new();
    public string ContentId { get; set; } = string.Empty;
    public int TotalSearches { get; set; }
    public int TotalClicks { get; set; }
    public decimal ClickThroughRate { get; set; }
    public int UniqueUsers { get; set; }
    public List<string> TopSearchTerms { get; set; } = new();
}

