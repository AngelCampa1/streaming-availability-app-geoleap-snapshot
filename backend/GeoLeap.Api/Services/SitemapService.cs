using System.Text;
using System.Xml;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service for generating and managing XML sitemaps with intelligent priority scoring
/// </summary>
public class SitemapService : ISitemapService
{
    private readonly ApplicationDbContext _context;
    private readonly IMemoryCache _cache;
    private readonly ILogger<SitemapService> _logger;
    private readonly ISearchAnalyticsService _searchAnalytics;
    private readonly IConfiguration _configuration;
    private readonly HttpClient _httpClient;

    private const int MaxUrlsPerSitemap = 50000;
    private const long MaxSitemapSizeBytes = 50 * 1024 * 1024; // 50MB

    private readonly Dictionary<string, decimal> _basePriorities = new()
    {
        { "home", 1.0m },
        { "movie", 0.8m },
        { "tv-show", 0.8m },
        { "genre", 0.6m },
        { "search", 0.4m },
        { "person", 0.5m },
        { "about", 0.3m },
        { "privacy", 0.2m },
        { "terms", 0.2m },
        { "contact", 0.3m },
        { "support", 0.3m }
    };

    public SitemapService(
        ApplicationDbContext context,
        IMemoryCache cache,
        ILogger<SitemapService> logger,
        ISearchAnalyticsService searchAnalytics,
        IConfiguration configuration,
        HttpClient httpClient)
    {
        _context = context;
        _cache = cache;
        _logger = logger;
        _searchAnalytics = searchAnalytics;
        _configuration = configuration;
        _httpClient = httpClient;
    }

    public async Task<string> GenerateMainSitemapAsync(SitemapGenerationRequest? request = null, CancellationToken cancellationToken = default)
    {
        try
        {
            const string cacheKey = "main_sitemap";
            
            if (_cache?.TryGetValue(cacheKey, out string? cachedSitemap) == true)
                return cachedSitemap!;

            var query = _context.SitemapEntries.Where(se => se.IsActive);

            // Apply filters from request
            if (request?.IncludeContentTypes?.Any() == true)
            {
                query = query.Where(se => request.IncludeContentTypes.Contains(se.ContentType));
            }

            if (request?.ExcludeUrls?.Any() == true)
            {
                query = query.Where(se => !request.ExcludeUrls.Contains(se.Url));
            }

            if (!string.IsNullOrEmpty(request?.Language))
            {
                query = query.Where(se => se.Language == request.Language);
            }

            var entries = await query
                .OrderByDescending(se => se.Priority)
                .ThenBy(se => se.LastModified)
                .Take(MaxUrlsPerSitemap)
                .ToListAsync(cancellationToken);

            var sitemap = GenerateXmlSitemap(entries, request?.IncludeImages == true);

            // Cache for 1 hour (only if cache is available)
            _cache?.Set(cacheKey, sitemap, TimeSpan.FromHours(1));

            _logger.LogInformation("Generated main sitemap with {Count} URLs", entries.Count);
            
            return sitemap;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating main sitemap");
            throw;
        }
    }

    public async Task<string> GenerateSitemapIndexAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var baseUrl = GetBaseUrl();
            var contentTypes = await _context.SitemapEntries
                .Where(se => se.IsActive)
                .GroupBy(se => se.ContentType)
                .Select(g => new { ContentType = g.Key, Count = g.Count() })
                .ToListAsync(cancellationToken);

            var xmlBuilder = new StringBuilder();
            xmlBuilder.AppendLine("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
            xmlBuilder.AppendLine("<sitemapindex xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">");

            // Main sitemap
            xmlBuilder.AppendLine($"  <sitemap>");
            xmlBuilder.AppendLine($"    <loc>{baseUrl}/sitemap.xml</loc>");
            xmlBuilder.AppendLine($"    <lastmod>{DateTime.UtcNow:yyyy-MM-ddTHH:mm:ssZ}</lastmod>");
            xmlBuilder.AppendLine($"  </sitemap>");

            // Content-specific sitemaps
            foreach (var contentType in contentTypes.Where(ct => ct.Count > 1000))
            {
                var pageCount = (int)Math.Ceiling((double)contentType.Count / MaxUrlsPerSitemap);
                
                for (int page = 1; page <= pageCount; page++)
                {
                    xmlBuilder.AppendLine($"  <sitemap>");
                    xmlBuilder.AppendLine($"    <loc>{baseUrl}/sitemap-{contentType.ContentType}-{page}.xml</loc>");
                    xmlBuilder.AppendLine($"    <lastmod>{DateTime.UtcNow:yyyy-MM-ddTHH:mm:ssZ}</lastmod>");
                    xmlBuilder.AppendLine($"  </sitemap>");
                }
            }

            // Image sitemap
            xmlBuilder.AppendLine($"  <sitemap>");
            xmlBuilder.AppendLine($"    <loc>{baseUrl}/sitemap-images.xml</loc>");
            xmlBuilder.AppendLine($"    <lastmod>{DateTime.UtcNow:yyyy-MM-ddTHH:mm:ssZ}</lastmod>");
            xmlBuilder.AppendLine($"  </sitemap>");

            // News sitemap
            xmlBuilder.AppendLine($"  <sitemap>");
            xmlBuilder.AppendLine($"    <loc>{baseUrl}/sitemap-news.xml</loc>");
            xmlBuilder.AppendLine($"    <lastmod>{DateTime.UtcNow:yyyy-MM-ddTHH:mm:ssZ}</lastmod>");
            xmlBuilder.AppendLine($"  </sitemap>");

            xmlBuilder.AppendLine("</sitemapindex>");

            return xmlBuilder.ToString();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating sitemap index");
            throw;
        }
    }

    public async Task<string> GenerateContentSitemapAsync(string contentType, int page = 1, int pageSize = 50000, CancellationToken cancellationToken = default)
    {
        try
        {
            var skip = (page - 1) * pageSize;
            
            var entries = await _context.SitemapEntries
                .Where(se => se.IsActive && se.ContentType == contentType)
                .OrderByDescending(se => se.Priority)
                .ThenBy(se => se.LastModified)
                .Skip(skip)
                .Take(pageSize)
                .ToListAsync(cancellationToken);

            return GenerateXmlSitemap(entries);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating content sitemap for {ContentType}", contentType);
            throw;
        }
    }

    public async Task<string> GenerateImageSitemapAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            // Placeholder for content with images
            // This would query actual content from database
            var contentWithImages = new List<dynamic>();

            var xmlBuilder = new StringBuilder();
            xmlBuilder.AppendLine("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
            xmlBuilder.AppendLine("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\" xmlns:image=\"http://www.google.com/schemas/sitemap-image/1.1\">");

            var baseUrl = GetBaseUrl();

            foreach (var content in contentWithImages)
            {
                var contentUrl = $"{baseUrl}/{content.Type.ToString().ToLower()}/{GenerateSlug(content.Title)}";
                
                xmlBuilder.AppendLine("  <url>");
                xmlBuilder.AppendLine($"    <loc>{EscapeXml(contentUrl)}</loc>");
                xmlBuilder.AppendLine($"    <lastmod>{content.UpdatedAt:yyyy-MM-ddTHH:mm:ssZ}</lastmod>");
                xmlBuilder.AppendLine($"    <changefreq>monthly</changefreq>");
                xmlBuilder.AppendLine($"    <priority>0.8</priority>");

                // Add poster image
                if (!string.IsNullOrEmpty(content.PosterUrl))
                {
                    xmlBuilder.AppendLine("    <image:image>");
                    xmlBuilder.AppendLine($"      <image:loc>{EscapeXml(content.PosterUrl)}</image:loc>");
                    xmlBuilder.AppendLine($"      <image:caption>{EscapeXml($"{content.Title} Poster")}</image:caption>");
                    xmlBuilder.AppendLine($"      <image:title>{EscapeXml(content.Title)}</image:title>");
                    xmlBuilder.AppendLine("    </image:image>");
                }

                // Add backdrop image
                if (!string.IsNullOrEmpty(content.BackdropUrl))
                {
                    xmlBuilder.AppendLine("    <image:image>");
                    xmlBuilder.AppendLine($"      <image:loc>{EscapeXml(content.BackdropUrl)}</image:loc>");
                    xmlBuilder.AppendLine($"      <image:caption>{EscapeXml($"{content.Title} Backdrop")}</image:caption>");
                    xmlBuilder.AppendLine($"      <image:title>{EscapeXml(content.Title)}</image:title>");
                    xmlBuilder.AppendLine("    </image:image>");
                }

                xmlBuilder.AppendLine("  </url>");
            }

            xmlBuilder.AppendLine("</urlset>");

            return xmlBuilder.ToString();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating image sitemap");
            throw;
        }
    }

    public async Task<string> GenerateNewsSitemapAsync(int days = 7, CancellationToken cancellationToken = default)
    {
        try
        {
            var cutoffDate = DateTime.UtcNow.AddDays(-days);
            
            // Placeholder for recent content
            var recentContent = new List<dynamic>();

            var xmlBuilder = new StringBuilder();
            xmlBuilder.AppendLine("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
            xmlBuilder.AppendLine("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\" xmlns:news=\"http://www.google.com/schemas/sitemap-news/0.9\">");

            var baseUrl = GetBaseUrl();

            foreach (var content in recentContent)
            {
                var contentUrl = $"{baseUrl}/{content.Type.ToString().ToLower()}/{GenerateSlug(content.Title)}";
                
                xmlBuilder.AppendLine("  <url>");
                xmlBuilder.AppendLine($"    <loc>{EscapeXml(contentUrl)}</loc>");
                xmlBuilder.AppendLine("    <news:news>");
                xmlBuilder.AppendLine("      <news:publication>");
                xmlBuilder.AppendLine("        <news:name>GeoLeap</news:name>");
                xmlBuilder.AppendLine("        <news:language>en</news:language>");
                xmlBuilder.AppendLine("      </news:publication>");
                xmlBuilder.AppendLine($"      <news:publication_date>{content.CreatedAt:yyyy-MM-ddTHH:mm:ssZ}</news:publication_date>");
                xmlBuilder.AppendLine($"      <news:title>{EscapeXml($"Watch {content.Title} Online")}</news:title>");
                xmlBuilder.AppendLine($"      <news:keywords>{EscapeXml(string.Join(", ", content.Genres))}</news:keywords>");
                xmlBuilder.AppendLine("    </news:news>");
                xmlBuilder.AppendLine("  </url>");
            }

            xmlBuilder.AppendLine("</urlset>");

            return xmlBuilder.ToString();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating news sitemap");
            throw;
        }
    }

    public async Task<int> UpdateSitemapEntriesAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var updated = 0;

            // Placeholder for content entries
            var content = new List<dynamic>();

            // Placeholder - would iterate through actual content
            // foreach (var item in content) { ... }

            // Add static pages
            var staticPages = new[]
            {
                new { Url = GetBaseUrl(), ContentType = "home", Priority = 1.0m },
                new { Url = $"{GetBaseUrl()}/about", ContentType = "about", Priority = 0.3m },
                new { Url = $"{GetBaseUrl()}/privacy", ContentType = "privacy", Priority = 0.2m },
                new { Url = $"{GetBaseUrl()}/terms", ContentType = "terms", Priority = 0.2m },
                new { Url = $"{GetBaseUrl()}/contact", ContentType = "contact", Priority = 0.3m },
                new { Url = $"{GetBaseUrl()}/support", ContentType = "support", Priority = 0.3m }
            };

            foreach (var page in staticPages)
            {
                await AddOrUpdateSitemapEntryAsync(page.Url, page.ContentType, null, 
                    new Dictionary<string, object> { { "priority", page.Priority } }, cancellationToken);
                updated++;
            }

            _logger.LogInformation("Updated {Count} sitemap entries", updated);
            return updated;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating sitemap entries");
            throw;
        }
    }

    public async Task<decimal> CalculatePriorityScoreAsync(string contentType, Guid? contentId = null, Dictionary<string, object>? metadata = null, CancellationToken cancellationToken = default)
    {
        try
        {
            var basePriority = _basePriorities.GetValueOrDefault(contentType.ToLower(), 0.5m);
            var score = basePriority;

            if (contentId.HasValue)
            {
                // Placeholder for content-specific metrics
                // var content = await _context.SearchableContent
                //     .FirstOrDefaultAsync(sc => sc.Id == contentId, cancellationToken);
                var content = new { Popularity = 100m, Rating = (decimal?)7.5m, ViewCount = 1000, AvailableServicesCount = 5, Year = (int?)2023 };

                if (content != null)
                {
                    // Adjust based on popularity (0.0 - 0.2 boost)
                    var popularityBoost = Math.Min(0.2m, content.Popularity / 1000m * 0.2m);
                    score += popularityBoost;

                    // Adjust based on rating (0.0 - 0.1 boost)
                    if (content.Rating.HasValue)
                    {
                        var ratingBoost = Math.Min(0.1m, (content.Rating.Value - 5m) / 5m * 0.1m);
                        score += Math.Max(0m, ratingBoost);
                    }

                    // Adjust based on view count (0.0 - 0.1 boost)
                    var viewBoost = Math.Min(0.1m, content.ViewCount / 10000m * 0.1m);
                    score += viewBoost;

                    // Adjust based on streaming availability (0.0 - 0.1 boost)
                    var availabilityBoost = Math.Min(0.1m, content.AvailableServicesCount / 20m * 0.1m);
                    score += availabilityBoost;

                    // Reduce priority for older content
                    if (content.Year.HasValue)
                    {
                        var currentYear = DateTime.UtcNow.Year;
                        var ageYears = currentYear - content.Year.Value;
                        if (ageYears > 5)
                        {
                            var agePenalty = Math.Min(0.2m, (ageYears - 5) / 20m * 0.2m);
                            score -= agePenalty;
                        }
                    }
                }

                // Placeholder for search analytics data
                try
                {
                    // This would integrate with search analytics service
                    var searchBoost = 0.05m; // Placeholder boost
                    score += searchBoost;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Could not get search analytics for content {ContentId}", contentId);
                }
            }

            // Apply metadata-based adjustments
            if (metadata != null)
            {
                if (metadata.TryGetValue("priority", out var priorityOverride) && 
                    priorityOverride is decimal overrideValue)
                {
                    score = overrideValue;
                }

                if (metadata.TryGetValue("boost", out var boost) && 
                    boost is decimal boostValue)
                {
                    score += boostValue;
                }
            }

            // Ensure score is within valid range
            return Math.Max(0.0m, Math.Min(1.0m, score));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calculating priority score for {ContentType}/{ContentId}", 
                contentType, contentId);
            return _basePriorities.GetValueOrDefault(contentType.ToLower(), 0.5m);
        }
    }

    public async Task<bool> SubmitSitemapAsync(string sitemapUrl, CancellationToken cancellationToken = default)
    {
        try
        {
            var searchEngines = new[]
            {
                $"https://www.google.com/ping?sitemap={Uri.EscapeDataString(sitemapUrl)}",
                $"https://www.bing.com/ping?sitemap={Uri.EscapeDataString(sitemapUrl)}"
            };

            var success = true;

            foreach (var url in searchEngines)
            {
                try
                {
                    var response = await _httpClient.GetAsync(url, cancellationToken);
                    if (!response.IsSuccessStatusCode)
                    {
                        _logger.LogWarning("Failed to submit sitemap to {Url}: {StatusCode}", url, response.StatusCode);
                        success = false;
                    }
                    else
                    {
                        _logger.LogInformation("Successfully submitted sitemap to {Url}", url);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error submitting sitemap to {Url}", url);
                    success = false;
                }
            }

            return success;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error submitting sitemap {Url}", sitemapUrl);
            return false;
        }
    }

    public async Task<SitemapStats> GetSitemapStatsAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var entries = await _context.SitemapEntries
                .Where(se => se.IsActive)
                .GroupBy(se => se.ContentType)
                .Select(g => new { ContentType = g.Key, Count = g.Count() })
                .ToListAsync(cancellationToken);

            var changeFrequencyStats = await _context.SitemapEntries
                .Where(se => se.IsActive)
                .GroupBy(se => se.ChangeFrequency)
                .Select(g => new { ChangeFrequency = g.Key, Count = g.Count() })
                .ToListAsync(cancellationToken);

            var averagePriority = await _context.SitemapEntries
                .Where(se => se.IsActive)
                .AverageAsync(se => se.Priority, cancellationToken);

            return new SitemapStats
            {
                TotalUrls = entries.Sum(e => e.Count),
                UrlsByContentType = entries.ToDictionary(e => e.ContentType, e => e.Count),
                UrlsByChangeFrequency = changeFrequencyStats.ToDictionary(e => e.ChangeFrequency, e => e.Count),
                AveragePriority = averagePriority,
                LastGenerated = DateTime.UtcNow,
                ActiveSitemaps = new List<string> { "main", "images", "news" }
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting sitemap stats");
            throw;
        }
    }

    public async Task<SitemapValidationResult> ValidateSitemapAsync(string xmlContent, CancellationToken cancellationToken = default)
    {
        var result = new SitemapValidationResult();

        try
        {
            var xmlDoc = new XmlDocument();
            xmlDoc.LoadXml(xmlContent);

            result.SizeBytes = Encoding.UTF8.GetByteCount(xmlContent);
            result.IsValid = true;

            // Check size limit
            if (result.SizeBytes > MaxSitemapSizeBytes)
            {
                result.Errors.Add($"Sitemap size {result.SizeBytes:N0} bytes exceeds maximum of {MaxSitemapSizeBytes:N0} bytes");
                result.IsValid = false;
            }

            // Count URLs
            var urlNodes = xmlDoc.SelectNodes("//url | //sitemap");
            result.UrlCount = urlNodes?.Count ?? 0;

            // Check URL count limit
            if (result.UrlCount > MaxUrlsPerSitemap)
            {
                result.Errors.Add($"Sitemap contains {result.UrlCount:N0} URLs, exceeding maximum of {MaxUrlsPerSitemap:N0}");
                result.IsValid = false;
            }

            // Validate URL format
            var locNodes = xmlDoc.SelectNodes("//loc");
            if (locNodes != null)
            {
                foreach (XmlNode locNode in locNodes)
                {
                    var url = locNode.InnerText;
                    if (!Uri.TryCreate(url, UriKind.Absolute, out var uri))
                    {
                        result.Errors.Add($"Invalid URL format: {url}");
                        result.IsValid = false;
                    }
                    else if (uri.Scheme != "https" && uri.Scheme != "http")
                    {
                        result.Warnings.Add($"Non-HTTP(S) URL: {url}");
                    }
                }
            }

            // Check for required elements
            var urlsetNode = xmlDoc.SelectSingleNode("urlset") ?? xmlDoc.SelectSingleNode("sitemapindex");
            if (urlsetNode == null)
            {
                result.Errors.Add("Missing root element (urlset or sitemapindex)");
                result.IsValid = false;
            }

            return result;
        }
        catch (XmlException ex)
        {
            result.IsValid = false;
            result.Errors.Add($"Invalid XML: {ex.Message}");
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating sitemap");
            result.IsValid = false;
            result.Errors.Add("Validation error occurred");
            return result;
        }
    }

    public async Task<SitemapEntry> AddOrUpdateSitemapEntryAsync(string url, string contentType, Guid? contentId = null, Dictionary<string, object>? metadata = null, CancellationToken cancellationToken = default)
    {
        try
        {
            var existingEntry = await _context.SitemapEntries
                .FirstOrDefaultAsync(se => se.Url == url, cancellationToken);

            if (existingEntry != null)
            {
                // Update existing entry
                existingEntry.LastModified = DateTime.UtcNow;
                existingEntry.Priority = await CalculatePriorityScoreAsync(contentType, contentId, metadata, cancellationToken);
                existingEntry.ChangeFrequency = GetChangeFrequency(contentType);
                existingEntry.ContentId = contentId;
            }
            else
            {
                // Create new entry
                existingEntry = new SitemapEntry
                {
                    Url = url,
                    ContentType = contentType,
                    ContentId = contentId,
                    Priority = await CalculatePriorityScoreAsync(contentType, contentId, metadata, cancellationToken),
                    ChangeFrequency = GetChangeFrequency(contentType),
                    LastModified = DateTime.UtcNow,
                    IsActive = true,
                    Language = "en-US"
                };

                _context.SitemapEntries.Add(existingEntry);
            }

            await _context.SaveChangesAsync(cancellationToken);
            return existingEntry;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding/updating sitemap entry for URL: {Url}", url);
            throw;
        }
    }

    public async Task<int> RemoveSitemapEntriesAsync(List<string> urls, CancellationToken cancellationToken = default)
    {
        try
        {
            var entries = await _context.SitemapEntries
                .Where(se => urls.Contains(se.Url))
                .ToListAsync(cancellationToken);

            foreach (var entry in entries)
            {
                entry.IsActive = false;
            }

            await _context.SaveChangesAsync(cancellationToken);
            
            _logger.LogInformation("Removed {Count} sitemap entries", entries.Count);
            return entries.Count;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing sitemap entries");
            throw;
        }
    }

    public string GetChangeFrequency(string contentType, DateTime? lastModified = null)
    {
        return contentType.ToLower() switch
        {
            "home" => "daily",
            "movie" => "monthly",
            "tv-show" => "weekly",
            "genre" => "weekly",
            "search" => "daily",
            "person" => "monthly",
            _ => "monthly"
        };
    }

    public async Task<string> GenerateRobotsTxtAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var baseUrl = GetBaseUrl();
            var robotsTxt = new StringBuilder();

            robotsTxt.AppendLine("User-agent: *");
            robotsTxt.AppendLine("Allow: /");
            robotsTxt.AppendLine();
            
            // Disallow admin and API endpoints
            robotsTxt.AppendLine("User-agent: *");
            robotsTxt.AppendLine("Disallow: /admin/");
            robotsTxt.AppendLine("Disallow: /api/");
            robotsTxt.AppendLine("Disallow: /_next/");
            robotsTxt.AppendLine("Disallow: /private/");
            robotsTxt.AppendLine();

            // Add sitemap references
            robotsTxt.AppendLine($"Sitemap: {baseUrl}/sitemap.xml");
            robotsTxt.AppendLine($"Sitemap: {baseUrl}/sitemap-index.xml");
            robotsTxt.AppendLine();

            // Crawl delay for different user agents
            robotsTxt.AppendLine("User-agent: Googlebot");
            robotsTxt.AppendLine("Crawl-delay: 1");
            robotsTxt.AppendLine();

            robotsTxt.AppendLine("User-agent: Bingbot");
            robotsTxt.AppendLine("Crawl-delay: 1");
            robotsTxt.AppendLine();

            return robotsTxt.ToString();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating robots.txt");
            throw;
        }
    }

    private string GenerateXmlSitemap(List<SitemapEntry> entries, bool includeImages = false)
    {
        var xmlBuilder = new StringBuilder();
        xmlBuilder.AppendLine("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
        
        if (includeImages)
        {
            xmlBuilder.AppendLine("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\" xmlns:image=\"http://www.google.com/schemas/sitemap-image/1.1\">");
        }
        else
        {
            xmlBuilder.AppendLine("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">");
        }

        foreach (var entry in entries)
        {
            xmlBuilder.AppendLine("  <url>");
            xmlBuilder.AppendLine($"    <loc>{EscapeXml(entry.Url)}</loc>");
            xmlBuilder.AppendLine($"    <lastmod>{entry.LastModified:yyyy-MM-ddTHH:mm:ssZ}</lastmod>");
            xmlBuilder.AppendLine($"    <changefreq>{entry.ChangeFrequency}</changefreq>");
            xmlBuilder.AppendLine($"    <priority>{entry.Priority:F1}</priority>");
            xmlBuilder.AppendLine("  </url>");
        }

        xmlBuilder.AppendLine("</urlset>");
        return xmlBuilder.ToString();
    }

    private string GenerateSlug(string title)
    {
        if (string.IsNullOrEmpty(title))
            return string.Empty;

        return title.ToLowerInvariant()
            .Replace(" ", "-")
            .Replace("'", "")
            .Replace("\"", "")
            .Replace(":", "")
            .Replace("?", "")
            .Replace("!", "")
            .Replace(",", "")
            .Replace(".", "");
    }

    private string GetBaseUrl()
    {
        return _configuration["BaseUrl"] ?? "https://geoleap.com";
    }

    private string EscapeXml(string text)
    {
        return text.Replace("&", "&amp;")
                   .Replace("<", "&lt;")
                   .Replace(">", "&gt;")
                   .Replace("\"", "&quot;")
                   .Replace("'", "&apos;");
    }
}