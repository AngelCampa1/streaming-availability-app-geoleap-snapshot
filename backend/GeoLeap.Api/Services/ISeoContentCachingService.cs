using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service for SEO-optimized content caching strategy
/// </summary>
public interface ISeoContentCachingService
{
    /// <summary>
    /// Cache content page data for fast SSR
    /// </summary>
    Task CacheContentPageAsync(string slug, ContentPageResponse content, TimeSpan? ttl = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get cached content page data
    /// </summary>
    Task<ContentPageResponse?> GetCachedContentPageAsync(string slug, string? language = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Cache SEO metadata
    /// </summary>
    Task CacheSeoMetadataAsync(string key, SeoMetadataResponse metadata, TimeSpan? ttl = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get cached SEO metadata
    /// </summary>
    Task<SeoMetadataResponse?> GetCachedSeoMetadataAsync(string key, CancellationToken cancellationToken = default);

    /// <summary>
    /// Cache structured data
    /// </summary>
    Task CacheStructuredDataAsync(string slug, string jsonLd, TimeSpan? ttl = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get cached structured data
    /// </summary>
    Task<string?> GetCachedStructuredDataAsync(string slug, CancellationToken cancellationToken = default);

    /// <summary>
    /// Cache sitemap XML
    /// </summary>
    Task CacheSitemapAsync(string sitemapType, string xmlContent, TimeSpan? ttl = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get cached sitemap XML
    /// </summary>
    Task<string?> GetCachedSitemapAsync(string sitemapType, CancellationToken cancellationToken = default);

    /// <summary>
    /// Pre-warm cache for critical pages
    /// </summary>
    Task PreWarmCacheAsync(List<string> urls, CancellationToken cancellationToken = default);

    /// <summary>
    /// Invalidate cache for URL patterns
    /// </summary>
    Task InvalidateCacheAsync(string pattern, CancellationToken cancellationToken = default);

    /// <summary>
    /// Cache search results for common queries
    /// </summary>
    Task CacheSearchResultsAsync(string query, ContentSearchResult results, TimeSpan? ttl = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get cached search results
    /// </summary>
    Task<ContentSearchResult?> GetCachedSearchResultsAsync(string query, Dictionary<string, object>? filters = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Cache performance metrics
    /// </summary>
    Task CachePerformanceMetricsAsync(string url, PerformanceMetricsResponse metrics, TimeSpan? ttl = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get cached performance metrics
    /// </summary>
    Task<PerformanceMetricsResponse?> GetCachedPerformanceMetricsAsync(string url, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get cache statistics for monitoring
    /// </summary>
    Task<CacheStatistics> GetCacheStatisticsAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Optimize cache based on usage patterns
    /// </summary>
    Task OptimizeCacheAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Clear all SEO-related cache
    /// </summary>
    Task ClearAllCacheAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Set cache warming schedule
    /// </summary>
    Task SetCacheWarmingScheduleAsync(List<CacheWarmingRule> rules, CancellationToken cancellationToken = default);
}

/// <summary>
/// Cache statistics for monitoring
/// </summary>
public class CacheStatistics
{
    public int TotalKeys { get; set; }
    public long TotalMemoryUsed { get; set; }
    public int HitCount { get; set; }
    public int MissCount { get; set; }
    public decimal HitRatio => (HitCount + MissCount) > 0 ? (decimal)HitCount / (HitCount + MissCount) * 100 : 0;
    public Dictionary<string, CacheCategoryStats> CategoryStats { get; set; } = new();
    public DateTime LastOptimized { get; set; }
    public List<string> TopAccessedKeys { get; set; } = new();
    public List<string> LeastAccessedKeys { get; set; } = new();
    public TimeSpan AverageResponseTime { get; set; }
}

/// <summary>
/// Cache statistics by category
/// </summary>
public class CacheCategoryStats
{
    public string Category { get; set; } = string.Empty;
    public int KeyCount { get; set; }
    public long MemoryUsed { get; set; }
    public int HitCount { get; set; }
    public int MissCount { get; set; }
    public decimal HitRatio => (HitCount + MissCount) > 0 ? (decimal)HitCount / (HitCount + MissCount) * 100 : 0;
    public TimeSpan AverageTtl { get; set; }
}

/// <summary>
/// Cache warming rule configuration
/// </summary>
public class CacheWarmingRule
{
    public string Name { get; set; } = string.Empty;
    public string UrlPattern { get; set; } = string.Empty;
    public string Schedule { get; set; } = string.Empty; // Cron expression
    public TimeSpan Ttl { get; set; } = TimeSpan.FromHours(1);
    public int Priority { get; set; } = 1; // 1 = highest, 5 = lowest
    public bool IsActive { get; set; } = true;
    public List<string> Conditions { get; set; } = new(); // Additional conditions
    public DateTime LastExecuted { get; set; }
}

/// <summary>
/// Cache entry metadata
/// </summary>
public class CacheEntryMetadata
{
    public string Key { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; }
    public int AccessCount { get; set; }
    public DateTime LastAccessed { get; set; }
    public long SizeBytes { get; set; }
    public Dictionary<string, string> Tags { get; set; } = new();
    public int Priority { get; set; } = 1;
}