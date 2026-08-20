using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service for generating and managing XML sitemaps with intelligent priority scoring
/// </summary>
public interface ISitemapService
{
    /// <summary>
    /// Generate main XML sitemap with all URLs
    /// </summary>
    Task<string> GenerateMainSitemapAsync(SitemapGenerationRequest? request = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Generate sitemap index for multiple sitemaps
    /// </summary>
    Task<string> GenerateSitemapIndexAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Generate content-specific sitemap (movies, TV shows, etc.)
    /// </summary>
    Task<string> GenerateContentSitemapAsync(string contentType, int page = 1, int pageSize = 50000, CancellationToken cancellationToken = default);

    /// <summary>
    /// Generate image sitemap for content images
    /// </summary>
    Task<string> GenerateImageSitemapAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Generate news sitemap for latest content
    /// </summary>
    Task<string> GenerateNewsSitemapAsync(int days = 7, CancellationToken cancellationToken = default);

    /// <summary>
    /// Update sitemap entries for content
    /// </summary>
    Task<int> UpdateSitemapEntriesAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Calculate intelligent priority score for URL
    /// </summary>
    Task<decimal> CalculatePriorityScoreAsync(string contentType, Guid? contentId = null, Dictionary<string, object>? metadata = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Submit sitemap to search engines
    /// </summary>
    Task<bool> SubmitSitemapAsync(string sitemapUrl, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get sitemap statistics and health
    /// </summary>
    Task<SitemapStats> GetSitemapStatsAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Validate sitemap XML format
    /// </summary>
    Task<SitemapValidationResult> ValidateSitemapAsync(string xmlContent, CancellationToken cancellationToken = default);

    /// <summary>
    /// Add or update sitemap entry
    /// </summary>
    Task<SitemapEntry> AddOrUpdateSitemapEntryAsync(string url, string contentType, Guid? contentId = null, Dictionary<string, object>? metadata = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Remove sitemap entries
    /// </summary>
    Task<int> RemoveSitemapEntriesAsync(List<string> urls, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get change frequency recommendation
    /// </summary>
    string GetChangeFrequency(string contentType, DateTime? lastModified = null);

    /// <summary>
    /// Generate robots.txt content
    /// </summary>
    Task<string> GenerateRobotsTxtAsync(CancellationToken cancellationToken = default);
}

/// <summary>
/// Sitemap generation statistics
/// </summary>
public class SitemapStats
{
    public int TotalUrls { get; set; }
    public Dictionary<string, int> UrlsByContentType { get; set; } = new();
    public Dictionary<string, int> UrlsByChangeFrequency { get; set; } = new();
    public decimal AveragePriority { get; set; }
    public DateTime LastGenerated { get; set; }
    public DateTime LastSubmitted { get; set; }
    public List<string> ActiveSitemaps { get; set; } = new();
    public long TotalSizeBytes { get; set; }
}

/// <summary>
/// Sitemap validation result
/// </summary>
public class SitemapValidationResult
{
    public bool IsValid { get; set; }
    public List<string> Errors { get; set; } = new();
    public List<string> Warnings { get; set; } = new();
    public int UrlCount { get; set; }
    public long SizeBytes { get; set; }
    public DateTime ValidatedAt { get; set; } = DateTime.UtcNow;
}