using System.ComponentModel.DataAnnotations.Schema;

namespace GeoLeap.Api.Models;

// Core Web Vitals Performance Models
[Table("core_web_vitals")]
public class CoreWebVitals
{
    public Guid Id { get; set; }
    public string Url { get; set; } = string.Empty;
    public double? LargestContentfulPaint { get; set; }
    public double? FirstInputDelay { get; set; }
    public double? CumulativeLayoutShift { get; set; }
    public double? FirstContentfulPaint { get; set; }
    public double? TimeToInteractive { get; set; }
    public int? PerformanceScore { get; set; }
    public DateTime Date { get; set; }
    public DateTime Timestamp { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    /// <summary>
    /// MeasuredAt alias for compatibility with PerformanceIndexConfiguration
    /// </summary>
    public DateTime MeasuredAt => Timestamp;
}

/// <summary>
/// Core Web Vitals metrics response model
/// </summary>
public class CoreWebVitalsMetrics
{
    public string Url { get; set; } = string.Empty;
    public double LargestContentfulPaint { get; set; }
    public double FirstInputDelay { get; set; }
    public decimal CumulativeLayoutShift { get; set; }
    public double FirstContentfulPaint { get; set; }
    public double TimeToInteractive { get; set; }
    public int PerformanceScore { get; set; }
    public string Status { get; set; } = "good";
    public DateTime MeasuredAt { get; set; }
}

/// <summary>
/// Response time metrics model
/// </summary>
public class ResponseTimeMetrics
{
    public string Endpoint { get; set; } = string.Empty;
    public double AverageResponseTime { get; set; }
    public double MedianResponseTime { get; set; }
    public double P95ResponseTime { get; set; }
    public double P99ResponseTime { get; set; }
    public double MinResponseTime { get; set; }
    public double MaxResponseTime { get; set; }
    public int TotalRequests { get; set; }
    public int SlowRequests { get; set; }
    public int ErrorRequests { get; set; }
    public DateTime MeasuredAt { get; set; }
    public string Status { get; set; } = "good";
}

/// <summary>
/// Database performance metrics model
/// </summary>
public class DatabasePerformanceMetrics
{
    public double AverageQueryTime { get; set; }
    public int SlowQueries { get; set; }
    public int TotalQueries { get; set; }
    public int ConnectionCount { get; set; }
    public int MaxConnections { get; set; }
    public int DeadlockCount { get; set; }
    public double LockWaitTime { get; set; }
    public decimal IndexEfficiency { get; set; }
    public decimal BufferHitRatio { get; set; }
    public DateTime MeasuredAt { get; set; }
    public string Status { get; set; } = "good";
}

/// <summary>
/// Caching metrics model
/// </summary>
public class CachingMetrics
{
    public decimal HitRate { get; set; }
    public decimal MissRate { get; set; }
    public int TotalRequests { get; set; }
    public int CacheHits { get; set; }
    public int CacheMisses { get; set; }
    public int EvictionCount { get; set; }
    public string CacheSize { get; set; } = string.Empty;
    public string MaxCacheSize { get; set; } = string.Empty;
    public double AverageRequestTime { get; set; }
    public double CachedRequestTime { get; set; }
    public double UncachedRequestTime { get; set; }
    public DateTime MeasuredAt { get; set; }
    public bool IsEnabled { get; set; }
    public string Status { get; set; } = "good";
}

/// <summary>
/// Compression metrics model
/// </summary>
public class CompressionMetrics
{
    public bool GzipEnabled { get; set; }
    public bool BrotliEnabled { get; set; }
    public decimal AverageCompressionRatio { get; set; }
    public long TotalCompressedBytes { get; set; }
    public long TotalUncompressedBytes { get; set; }
    public long BytesSaved { get; set; }
    public List<string> CompressionTypes { get; set; } = new();
    public List<string> SupportedMimeTypes { get; set; } = new();
    public DateTime MeasuredAt { get; set; }
    public string Status { get; set; } = "good";
}

/// <summary>
/// Performance validation request model
/// </summary>
public class PerformanceValidationRequest
{
    public string Url { get; set; } = string.Empty;
    public List<string> TestTypes { get; set; } = new();
    public Dictionary<string, object> Options { get; set; } = new();
}

/// <summary>
/// Performance validation result model
/// </summary>
public class PerformanceValidationResult
{
    public string Url { get; set; } = string.Empty;
    public DateTime ValidationDate { get; set; }
    public string OverallStatus { get; set; } = "good";
    public int OverallScore { get; set; }
    public List<ValidationCheck> Validations { get; set; } = new();
}

/// <summary>
/// Individual validation check result
/// </summary>
public class ValidationCheck
{
    public string Name { get; set; } = string.Empty;
    public string Status { get; set; } = "good";
    public string Message { get; set; } = string.Empty;
    public int Score { get; set; }
    public bool Passed { get; set; }
    public List<string> Recommendations { get; set; } = new();
}

/// <summary>
/// Performance recommendation model
/// </summary>
public class PerformanceRecommendation
{
    public string Category { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Priority { get; set; } = "medium";
    public string Impact { get; set; } = "medium";
    public string EstimatedEffort { get; set; } = "medium";
    public List<string> Resources { get; set; } = new();
    
    // Additional properties required by SeoPerformanceService
    public string Type { get; set; } = string.Empty;
    public string PageSlug { get; set; } = string.Empty;
    public string Issue { get; set; } = string.Empty;
    public string Recommendation { get; set; } = string.Empty;
    public string EstimatedImpact { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Real-time performance metrics model
/// </summary>
public class RealtimePerformanceMetrics
{
    public DateTime Timestamp { get; set; }
    public int ActiveUsers { get; set; }
    public int RequestsPerSecond { get; set; }
    public double AverageResponseTime { get; set; }
    public decimal ErrorRate { get; set; }
    public decimal CpuUsage { get; set; }
    public decimal MemoryUsage { get; set; }
    public decimal DiskUsage { get; set; }
    public double NetworkLatency { get; set; }
    public int DatabaseConnections { get; set; }
    public decimal CacheHitRate { get; set; }
    public string Status { get; set; } = "healthy";
}

/// <summary>
/// SEO content page response model
/// </summary>
public class ContentPageResponse
{
    public ContentDetails? Content { get; set; }
    public SeoMetadataResponse? Seo { get; set; }
    public List<ContentSummary>? RelatedContent { get; set; }
    public List<ContentStreamingOption>? StreamingOptions { get; set; }
    public List<InternalLink>? SuggestedLinks { get; set; }
}


/// <summary>
/// Internal link suggestion model
/// </summary>
public class InternalLink
{
    public string SourceUrl { get; set; } = string.Empty;
    public string TargetUrl { get; set; } = string.Empty;
    public string AnchorText { get; set; } = string.Empty;
    public decimal Relevance { get; set; }
    public string Context { get; set; } = string.Empty;
    public string LinkType { get; set; } = "contextual";
}

/// <summary>
/// Breadcrumb navigation item
/// </summary>
public class BreadcrumbItem
{
    public string Name { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public int Position { get; set; }
    public bool IsCurrentPage { get; set; } = false;
}

/// <summary>
/// SEO metadata request model
/// </summary>
public class SeoMetadataRequest
{
    public Guid? ContentId { get; set; }
    public string ContentType { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public List<string>? Keywords { get; set; }
    public string? CanonicalUrl { get; set; }
    public string Language { get; set; } = "en-US";
}


/// <summary>
/// Content DTO for API responses (test compatibility)
/// </summary>
public class ContentDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Overview { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string Type { get; set; } = "movie";
    public int? Year { get; set; }
    public decimal? Rating { get; set; }
    public List<StreamingAvailabilityDto> StreamingAvailability { get; set; } = new();
    public List<string> Genres { get; set; } = new();
    public string ImageUrl { get; set; } = string.Empty;
}

/// <summary>
/// Streaming availability DTO for API responses (test compatibility)
/// </summary>
public class StreamingAvailabilityDto
{
    public string ServiceName { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    public string StreamingType { get; set; } = string.Empty;
    public decimal Price { get; set; }
}