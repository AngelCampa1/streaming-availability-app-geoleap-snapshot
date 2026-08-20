using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Caching.Memory;
using GeoLeap.Api.Data;
using GeoLeap.Api.ProgrammaticSeo.Models;
using System.Text.Json;
using System.Diagnostics;
using Microsoft.Extensions.Configuration;

namespace GeoLeap.Api.ProgrammaticSeo.Services;

/// <summary>
/// Performance monitoring service for SEO system
/// Tracks page performance, search rankings, and system metrics
/// </summary>
public class SeoPerformanceService : ISeoPerformanceService
{
    private readonly ApplicationDbContext _context;
    private readonly IMemoryCache _cache;
    private readonly ILogger<SeoPerformanceService> _logger;
    private readonly IConfiguration _configuration;
    private readonly HttpClient _httpClient;

    public SeoPerformanceService(
        ApplicationDbContext context,
        IMemoryCache cache,
        ILogger<SeoPerformanceService> logger,
        IConfiguration configuration,
        HttpClient httpClient)
    {
        _context = context;
        _cache = cache;
        _logger = logger;
        _configuration = configuration;
        _httpClient = httpClient;
    }

    #region Performance Metrics Collection

    /// <summary>
    /// Collect comprehensive SEO performance metrics
    /// </summary>
    public async Task CollectMetricsAsync()
    {
        var stopwatch = Stopwatch.StartNew();

        try
        {
            // Collect page performance metrics
            await CollectPagePerformanceAsync();

            // Collect search console data (if configured)
            await CollectSearchConsoleDataAsync();

            // Collect core web vitals
            await CollectCoreWebVitalsAsync();

            // Collect system performance
            await CollectSystemPerformanceAsync();

            // Update performance scores
            await UpdatePerformanceScoresAsync();

            stopwatch.Stop();
            _logger.LogInformation("Performance metrics collection completed in {Duration}ms", stopwatch.ElapsedMilliseconds);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to collect performance metrics");
            throw;
        }
    }

    /// <summary>
    /// Collect page-level performance metrics
    /// </summary>
    private async Task CollectPagePerformanceAsync()
    {
        var pages = await _context.SeoPages
            .Where(p => p.IsPublished)
            .OrderByDescending(p => p.ViewCount)
            .Take(1000) // Focus on top 1000 pages
            .ToListAsync();

        foreach (var page in pages)
        {
            var metrics = new SeoMetrics
            {
                PageId = page.Id,
                MetricDate = DateTime.UtcNow.Date,
                LastUpdated = DateTime.UtcNow
            };

            // Simulate page views (in production, integrate with Google Analytics)
            metrics.DailyViews = await GetDailyViewsAsync(page.Slug);
            metrics.WeeklyViews = await GetWeeklyViewsAsync(page.Slug);
            metrics.MonthlyViews = await GetMonthlyViewsAsync(page.Slug);
            metrics.UniqueVisitors = await GetUniqueVisitorsAsync(page.Slug);
            metrics.BounceRate = await GetBounceRateAsync(page.Slug);
            metrics.AverageTimeOnPage = await GetAverageTimeOnPageAsync(page.Slug);

            // Search performance metrics
            metrics.SearchImpressions = await GetSearchImpressionsAsync(page.Slug);
            metrics.SearchClicks = await GetSearchClicksAsync(page.Slug);
            metrics.AveragePosition = await GetAveragePositionAsync(page.Slug);

            // Content quality metrics
            metrics.BacklinkCount = await GetBacklinkCountAsync(page.Slug);
            metrics.InternalLinkCount = CountInternalLinks(page.Content);
            metrics.SocialShares = await GetSocialSharesAsync(page.Slug);
            metrics.ContentQualityScore = CalculateContentQualityScore(page);

            // Check if metrics already exist for today
            var existingMetrics = await _context.SeoMetrics
                .FirstOrDefaultAsync(m => m.PageId == page.Id && m.MetricDate == metrics.MetricDate);

            if (existingMetrics != null)
            {
                // Update existing metrics
                existingMetrics.DailyViews = metrics.DailyViews;
                existingMetrics.WeeklyViews = metrics.WeeklyViews;
                existingMetrics.MonthlyViews = metrics.MonthlyViews;
                existingMetrics.UniqueVisitors = metrics.UniqueVisitors;
                existingMetrics.BounceRate = metrics.BounceRate;
                existingMetrics.AverageTimeOnPage = metrics.AverageTimeOnPage;
                existingMetrics.SearchImpressions = metrics.SearchImpressions;
                existingMetrics.SearchClicks = metrics.SearchClicks;
                existingMetrics.AveragePosition = metrics.AveragePosition;
                existingMetrics.BacklinkCount = metrics.BacklinkCount;
                existingMetrics.InternalLinkCount = metrics.InternalLinkCount;
                existingMetrics.SocialShares = metrics.SocialShares;
                existingMetrics.ContentQualityScore = metrics.ContentQualityScore;
                existingMetrics.LastUpdated = DateTime.UtcNow;
            }
            else
            {
                _context.SeoMetrics.Add(metrics);
            }

            // Update page view count
            page.ViewCount = metrics.DailyViews;
            page.LastViewed = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
        _logger.LogInformation("Collected page performance metrics for {Count} pages", pages.Count);
    }

    /// <summary>
    /// Collect Google Search Console data
    /// </summary>
    private async Task CollectSearchConsoleDataAsync()
    {
        var searchConsoleApiKey = _configuration["GoogleSearchConsole:ApiKey"];
        if (string.IsNullOrEmpty(searchConsoleApiKey))
        {
            _logger.LogWarning("Google Search Console API key not configured, skipping search console data collection");
            return;
        }

        try
        {
            // Implementation would integrate with Google Search Console API
            // For now, we'll use placeholder data
            _logger.LogInformation("Search Console data collection would occur here with API integration");
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to collect Search Console data");
        }
    }

    /// <summary>
    /// Collect Core Web Vitals data
    /// </summary>
    private async Task CollectCoreWebVitalsAsync()
    {
        try
        {
            var pages = await _context.SeoPages
                .Where(p => p.IsPublished)
                .Take(100) // Sample top pages
                .ToListAsync();

            foreach (var page in pages)
            {
                var vitals = await MeasureCoreWebVitalsAsync(page.Slug);
                
                // Store core web vitals in cache for quick access
                var cacheKey = $"core_web_vitals_{page.Id}";
                _cache.Set(cacheKey, vitals, TimeSpan.FromHours(6));
            }

            _logger.LogInformation("Collected Core Web Vitals for {Count} pages", pages.Count);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to collect Core Web Vitals");
        }
    }

    /// <summary>
    /// Collect system performance metrics
    /// </summary>
    private async Task CollectSystemPerformanceAsync()
    {
        var systemMetrics = new
        {
            Timestamp = DateTime.UtcNow,
            CpuUsage = await GetCpuUsageAsync(),
            MemoryUsage = await GetMemoryUsageAsync(),
            DiskUsage = await GetDiskUsageAsync(),
            DatabaseConnections = await GetDatabaseConnectionCountAsync(),
            CacheHitRate = await GetCacheHitRateAsync(),
            AverageResponseTime = await GetAverageResponseTimeAsync()
        };

        // Store in cache for dashboard access
        _cache.Set("system_performance", systemMetrics, TimeSpan.FromMinutes(5));
        _logger.LogInformation("Collected system performance metrics");
    }

    #endregion

    #region Performance Analysis

    /// <summary>
    /// Analyze performance trends
    /// </summary>
    public async Task<PerformanceTrendAnalysis> AnalyzePerformanceTrendsAsync(DateTime startDate, DateTime endDate)
    {
        var metrics = await _context.SeoMetrics
            .Where(m => m.MetricDate >= startDate && m.MetricDate <= endDate)
            .Include(m => m.Page)
            .ToListAsync();

        var analysis = new PerformanceTrendAnalysis
        {
            StartDate = startDate,
            EndDate = endDate,
            TotalPages = metrics.Select(m => m.PageId).Distinct().Count(),
            TotalViews = metrics.Sum(m => m.DailyViews),
            AveragePosition = metrics.Average(m => m.AveragePosition),
            AverageClickThroughRate = metrics.Where(m => m.SearchImpressions > 0).Average(m => m.ClickThroughRate),
            AverageBounceRate = metrics.Average(m => m.BounceRate),
            TopPerformingPages = GetTopPerformingPages(metrics),
            BottomPerformingPages = GetBottomPerformingPages(metrics),
            TrendingKeywords = await GetTrendingKeywordsFromMetricsAsync(metrics),
            GeneratedAt = DateTime.UtcNow
        };

        return analysis;
    }

    /// <summary>
    /// Generate performance recommendations
    /// </summary>
    public async Task<List<PerformanceRecommendation>> GenerateRecommendationsAsync()
    {
        var recommendations = new List<PerformanceRecommendation>();

        // Analyze pages with high bounce rates
        var highBounceRatePages = await _context.SeoMetrics
            .Where(m => m.BounceRate > 0.7f && m.DailyViews > 10)
            .Include(m => m.Page)
            .OrderByDescending(m => m.BounceRate)
            .Take(10)
            .ToListAsync();

        foreach (var page in highBounceRatePages)
        {
            recommendations.Add(new PerformanceRecommendation
            {
                Type = "High Bounce Rate",
                PageId = page.PageId,
                PageSlug = page.Page.Slug,
                Issue = $"Page has a bounce rate of {page.BounceRate:P0}",
                Recommendation = "Consider improving content quality, page loading speed, or user experience",
                Priority = "Medium",
                EstimatedImpact = "10-20% improvement in user engagement",
                CreatedAt = DateTime.UtcNow
            });
        }

        // Analyze pages with low search positions
        var lowRankingPages = await _context.SeoMetrics
            .Where(m => m.AveragePosition > 10 && m.SearchImpressions > 100)
            .Include(m => m.Page)
            .OrderByDescending(m => m.AveragePosition)
            .Take(10)
            .ToListAsync();

        foreach (var page in lowRankingPages)
        {
            recommendations.Add(new PerformanceRecommendation
            {
                Type = "Low Search Ranking",
                PageId = page.PageId,
                PageSlug = page.Page.Slug,
                Issue = $"Page ranks at position {page.AveragePosition:F1} in search results",
                Recommendation = "Optimize content for target keywords, improve internal linking, and enhance meta tags",
                Priority = "High",
                EstimatedImpact = "20-50% increase in organic traffic",
                CreatedAt = DateTime.UtcNow
            });
        }

        _logger.LogInformation("Generated {Count} performance recommendations", recommendations.Count);
        return recommendations;
    }

    #endregion

    #region Helper Methods

    private async Task<int> GetDailyViewsAsync(string slug)
    {
        // Placeholder implementation - integrate with Google Analytics
        var random = new Random(slug.GetHashCode());
        return random.Next(10, 1000);
    }

    private async Task<int> GetWeeklyViewsAsync(string slug)
    {
        var dailyViews = await GetDailyViewsAsync(slug);
        return dailyViews * 7;
    }

    private async Task<int> GetMonthlyViewsAsync(string slug)
    {
        var dailyViews = await GetDailyViewsAsync(slug);
        return dailyViews * 30;
    }

    private async Task<int> GetUniqueVisitorsAsync(string slug)
    {
        var dailyViews = await GetDailyViewsAsync(slug);
        return (int)(dailyViews * 0.8f); // Assume 80% unique visitors
    }

    private async Task<float> GetBounceRateAsync(string slug)
    {
        var random = new Random(slug.GetHashCode());
        return (float)(random.NextDouble() * 0.8 + 0.1); // 10-90%
    }

    private async Task<TimeSpan> GetAverageTimeOnPageAsync(string slug)
    {
        var random = new Random(slug.GetHashCode());
        return TimeSpan.FromSeconds(random.Next(30, 300));
    }

    private async Task<int> GetSearchImpressionsAsync(string slug)
    {
        var random = new Random(slug.GetHashCode());
        return random.Next(100, 10000);
    }

    private async Task<int> GetSearchClicksAsync(string slug)
    {
        var impressions = await GetSearchImpressionsAsync(slug);
        return (int)(impressions * 0.05f); // 5% CTR
    }

    private async Task<float> GetAveragePositionAsync(string slug)
    {
        var random = new Random(slug.GetHashCode());
        return (float)(random.NextDouble() * 20 + 1); // Position 1-21
    }

    private async Task<int> GetBacklinkCountAsync(string slug)
    {
        var random = new Random(slug.GetHashCode());
        return random.Next(0, 50);
    }

    private int CountInternalLinks(string content)
    {
        if (string.IsNullOrEmpty(content)) return 0;
        
        var linkPattern = @"<a[^>]*href\s*=\s*[""']/[^""']*[""'][^>]*>";
        var matches = System.Text.RegularExpressions.Regex.Matches(content, linkPattern);
        return matches.Count;
    }

    private async Task<int> GetSocialSharesAsync(string slug)
    {
        var random = new Random(slug.GetHashCode());
        return random.Next(0, 100);
    }

    private float CalculateContentQualityScore(SeoPage page)
    {
        float score = 0;
        
        // Word count factor (optimal: 1000-2000 words)
        if (page.WordCount >= 1000 && page.WordCount <= 2000)
            score += 25;
        else if (page.WordCount >= 500)
            score += 15;
        
        // Meta title length (optimal: 50-60 characters)
        if (!string.IsNullOrEmpty(page.MetaTitle) && page.MetaTitle.Length >= 50 && page.MetaTitle.Length <= 60)
            score += 20;
        
        // Meta description length (optimal: 150-160 characters)
        if (!string.IsNullOrEmpty(page.MetaDescription) && page.MetaDescription.Length >= 150 && page.MetaDescription.Length <= 160)
            score += 20;
        
        // H1 presence
        if (!string.IsNullOrEmpty(page.H1))
            score += 15;
        
        // Internal links count (optimal: 3-10)
        var internalLinks = CountInternalLinks(page.Content);
        if (internalLinks >= 3 && internalLinks <= 10)
            score += 20;
        
        return Math.Min(100, score);
    }

    private async Task<CoreWebVitals> MeasureCoreWebVitalsAsync(string slug)
    {
        // Placeholder implementation - in production, use PageSpeed Insights API
        var random = new Random(slug.GetHashCode());
        
        return new CoreWebVitals
        {
            LargestContentfulPaint = random.Next(1000, 4000), // ms
            FirstInputDelay = random.Next(50, 300), // ms
            CumulativeLayoutShift = (float)(random.NextDouble() * 0.3), // score
            FirstContentfulPaint = random.Next(500, 2000), // ms
            TimeToInteractive = random.Next(2000, 8000), // ms
            MeasuredAt = DateTime.UtcNow
        };
    }

    private async Task<float> GetCpuUsageAsync()
    {
        // Simplified CPU usage simulation
        return (float)(new Random().NextDouble() * 50 + 10); // 10-60%
    }

    private async Task<float> GetMemoryUsageAsync()
    {
        // Simplified memory usage simulation
        return (float)(new Random().NextDouble() * 70 + 20); // 20-90%
    }

    private async Task<float> GetDiskUsageAsync()
    {
        // Simplified disk usage simulation
        return (float)(new Random().NextDouble() * 80 + 10); // 10-90%
    }

    private async Task<int> GetDatabaseConnectionCountAsync()
    {
        // Simplified database connections simulation
        return new Random().Next(5, 100);
    }

    private async Task<float> GetCacheHitRateAsync()
    {
        // Simplified cache hit rate simulation
        return (float)(new Random().NextDouble() * 0.4 + 0.6); // 60-100%
    }

    private async Task<float> GetAverageResponseTimeAsync()
    {
        // Simplified response time simulation
        return (float)(new Random().NextDouble() * 500 + 100); // 100-600ms
    }

    private async Task UpdatePerformanceScoresAsync()
    {
        var pages = await _context.SeoPages
            .Include(p => p.Template)
            .Where(p => p.IsPublished)
            .ToListAsync();

        foreach (var page in pages)
        {
            var metrics = await _context.SeoMetrics
                .Where(m => m.PageId == page.Id)
                .OrderByDescending(m => m.MetricDate)
                .FirstOrDefaultAsync();

            if (metrics != null)
            {
                // Update search ranking based on metrics
                page.SearchRanking = metrics.AveragePosition;
                
                // Update primary keyword based on best performing keyword
                // This would be determined by actual keyword tracking
            }
        }

        await _context.SaveChangesAsync();
    }

    private List<TopPerformingPage> GetTopPerformingPages(List<SeoMetrics> metrics)
    {
        return metrics
            .GroupBy(m => m.PageId)
            .Select(g => new TopPerformingPage
            {
                PageId = g.Key,
                Slug = g.First().Page?.Slug ?? "",
                Title = g.First().Page?.MetaTitle ?? "",
                Views = g.Sum(m => m.DailyViews),
                Position = g.Average(m => m.AveragePosition),
                ClickThroughRate = g.Where(m => m.SearchImpressions > 0).DefaultIfEmpty().Average(m => m?.ClickThroughRate ?? 0)
            })
            .OrderByDescending(p => p.Views)
            .Take(10)
            .ToList();
    }

    private List<TopPerformingPage> GetBottomPerformingPages(List<SeoMetrics> metrics)
    {
        return metrics
            .GroupBy(m => m.PageId)
            .Select(g => new TopPerformingPage
            {
                PageId = g.Key,
                Slug = g.First().Page?.Slug ?? "",
                Title = g.First().Page?.MetaTitle ?? "",
                Views = g.Sum(m => m.DailyViews),
                Position = g.Average(m => m.AveragePosition),
                ClickThroughRate = g.Where(m => m.SearchImpressions > 0).DefaultIfEmpty().Average(m => m?.ClickThroughRate ?? 0)
            })
            .OrderBy(p => p.Views)
            .Take(10)
            .ToList();
    }

    private async Task<List<string>> GetTrendingKeywordsFromMetricsAsync(List<SeoMetrics> metrics)
    {
        // Placeholder implementation - would analyze actual keyword performance
        return new List<string> { "trending keyword 1", "trending keyword 2", "trending keyword 3" };
    }

    #endregion
}

/// <summary>
/// Interface for SEO performance service
/// </summary>
public interface ISeoPerformanceService
{
    Task CollectMetricsAsync();
    Task<PerformanceTrendAnalysis> AnalyzePerformanceTrendsAsync(DateTime startDate, DateTime endDate);
    Task<List<PerformanceRecommendation>> GenerateRecommendationsAsync();
}

/// <summary>
/// Performance trend analysis result
/// </summary>
public class PerformanceTrendAnalysis
{
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public int TotalPages { get; set; }
    public int TotalViews { get; set; }
    public float AveragePosition { get; set; }
    public float AverageClickThroughRate { get; set; }
    public float AverageBounceRate { get; set; }
    public List<TopPerformingPage> TopPerformingPages { get; set; } = new();
    public List<TopPerformingPage> BottomPerformingPages { get; set; } = new();
    public List<string> TrendingKeywords { get; set; } = new();
    public DateTime GeneratedAt { get; set; }
}

/// <summary>
/// Performance recommendation
/// </summary>
public class PerformanceRecommendation
{
    public string Type { get; set; } = string.Empty;
    public long PageId { get; set; }
    public string PageSlug { get; set; } = string.Empty;
    public string Issue { get; set; } = string.Empty;
    public string Recommendation { get; set; } = string.Empty;
    public string Priority { get; set; } = string.Empty;
    public string EstimatedImpact { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// Core Web Vitals metrics
/// </summary>
public class CoreWebVitals
{
    public int LargestContentfulPaint { get; set; } // ms
    public int FirstInputDelay { get; set; } // ms
    public float CumulativeLayoutShift { get; set; } // score
    public int FirstContentfulPaint { get; set; } // ms
    public int TimeToInteractive { get; set; } // ms
    public DateTime MeasuredAt { get; set; }
}