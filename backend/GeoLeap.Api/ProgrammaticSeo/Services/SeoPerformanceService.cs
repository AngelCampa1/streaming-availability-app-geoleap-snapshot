using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models; // Use main models namespace
using System.Text.Json;
using System.Diagnostics;

namespace GeoLeap.Api.ProgrammaticSeo.Services;

/// <summary>
/// Interface for SEO performance monitoring service
/// </summary>
public interface ISeoPerformanceService
{
    Task CollectMetricsAsync();
    Task<PerformanceTrendAnalysis> AnalyzePerformanceTrendsAsync(DateTime startDate, DateTime endDate);
    Task<List<GeoLeap.Api.Models.PerformanceRecommendation>> GenerateRecommendationsAsync();
}

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

            // Collect core web vitals
            await CollectCoreWebVitalsAsync();

            // Collect system performance
            await CollectSystemPerformanceAsync();

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
    /// Collect page-level performance metrics using existing SeoMetrics model
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
            var pageUrl = $"/{page.Slug}";
            var today = DateTime.UtcNow.Date;

            // Create individual metrics following the existing schema
            var metricsToAdd = new List<SeoMetrics>();

            // Daily views metric
            var dailyViews = await GetDailyViewsAsync(page.Slug);
            metricsToAdd.Add(new SeoMetrics
            {
                Url = pageUrl,
                Date = today,
                MetricType = "daily_views",
                Value = dailyViews,
                Source = "internal_analytics"
            });

            // Search position metric
            var searchPosition = await GetAveragePositionAsync(page.Slug);
            metricsToAdd.Add(new SeoMetrics
            {
                Url = pageUrl,
                Date = today,
                MetricType = "search_position",
                Value = (decimal)searchPosition,
                Source = "search_console"
            });

            // Click-through rate metric
            var ctr = await GetClickThroughRateAsync(page.Slug);
            metricsToAdd.Add(new SeoMetrics
            {
                Url = pageUrl,
                Date = today,
                MetricType = "click_through_rate",
                Value = (decimal)ctr,
                Source = "search_console"
            });

            // Bounce rate metric
            var bounceRate = await GetBounceRateAsync(page.Slug);
            metricsToAdd.Add(new SeoMetrics
            {
                Url = pageUrl,
                Date = today,
                MetricType = "bounce_rate",
                Value = (decimal)bounceRate,
                Source = "analytics"
            });

            // Check for existing metrics and update or add new ones
            foreach (var metric in metricsToAdd)
            {
                var existingMetric = await _context.SeoMetrics
                    .FirstOrDefaultAsync(m => m.Url == metric.Url && 
                                           m.Date == metric.Date && 
                                           m.MetricType == metric.MetricType);

                if (existingMetric != null)
                {
                    existingMetric.Value = metric.Value;
                    existingMetric.Source = metric.Source;
                }
                else
                {
                    _context.SeoMetrics.Add(metric);
                }
            }

            // Update page view count
            page.ViewCount = dailyViews;
            page.LastViewed = DateTime.UtcNow;
        }

        await _context.SaveChangesAsync();
        _logger.LogInformation("Collected page performance metrics for {Count} pages", pages.Count);
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

                // Store as metrics
                var pageUrl = $"/{page.Slug}";
                var today = DateTime.UtcNow.Date;

                var vitalMetrics = new List<SeoMetrics>
                {
                    new SeoMetrics
                    {
                        Url = pageUrl,
                        Date = today,
                        MetricType = "lcp",
                        Value = vitals.LargestContentfulPaint,
                        Source = "core_web_vitals"
                    },
                    new SeoMetrics
                    {
                        Url = pageUrl,
                        Date = today,
                        MetricType = "fid",
                        Value = vitals.FirstInputDelay,
                        Source = "core_web_vitals"
                    },
                    new SeoMetrics
                    {
                        Url = pageUrl,
                        Date = today,
                        MetricType = "cls",
                        Value = (decimal)vitals.CumulativeLayoutShift,
                        Source = "core_web_vitals"
                    }
                };

                foreach (var metric in vitalMetrics)
                {
                    var existing = await _context.SeoMetrics
                        .FirstOrDefaultAsync(m => m.Url == metric.Url && 
                                               m.Date == metric.Date && 
                                               m.MetricType == metric.MetricType);

                    if (existing != null)
                    {
                        existing.Value = metric.Value;
                    }
                    else
                    {
                        _context.SeoMetrics.Add(metric);
                    }
                }
            }

            await _context.SaveChangesAsync();
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
    /// Analyze performance trends using existing SeoMetrics
    /// </summary>
    public async Task<PerformanceTrendAnalysis> AnalyzePerformanceTrendsAsync(DateTime startDate, DateTime endDate)
    {
        var metrics = await _context.SeoMetrics
            .Where(m => m.Date >= startDate.Date && m.Date <= endDate.Date)
            .ToListAsync();

        var analysis = new PerformanceTrendAnalysis
        {
            StartDate = startDate,
            EndDate = endDate,
            TotalPages = metrics.Select(m => m.Url).Distinct().Count(),
            TotalViews = (int)metrics.Where(m => m.MetricType == "daily_views").Sum(m => m.Value),
            AveragePosition = (float)metrics.Where(m => m.MetricType == "search_position").DefaultIfEmpty().Average(m => m?.Value ?? 0),
            AverageClickThroughRate = (float)metrics.Where(m => m.MetricType == "click_through_rate").DefaultIfEmpty().Average(m => m?.Value ?? 0),
            AverageBounceRate = (float)metrics.Where(m => m.MetricType == "bounce_rate").DefaultIfEmpty().Average(m => m?.Value ?? 0),
            GeneratedAt = DateTime.UtcNow
        };

        // Get top performing pages
        analysis.TopPerformingPages = await GetTopPerformingPagesAsync(metrics);
        analysis.BottomPerformingPages = await GetBottomPerformingPagesAsync(metrics);
        analysis.TrendingKeywords = new List<string> { "trending keyword 1", "trending keyword 2", "trending keyword 3" };

        return analysis;
    }

    /// <summary>
    /// Generate performance recommendations
    /// </summary>
    public async Task<List<GeoLeap.Api.Models.PerformanceRecommendation>> GenerateRecommendationsAsync()
    {
        var recommendations = new List<GeoLeap.Api.Models.PerformanceRecommendation>();

        // Get recent bounce rate metrics
        var highBounceRateMetrics = await _context.SeoMetrics
            .Where(m => m.MetricType == "bounce_rate" && m.Value > 0.7m && m.Date >= DateTime.UtcNow.AddDays(-30))
            .OrderByDescending(m => m.Value)
            .Take(10)
            .ToListAsync();

        foreach (var metric in highBounceRateMetrics)
        {
            recommendations.Add(new GeoLeap.Api.Models.PerformanceRecommendation
            {
                Category = "High Bounce Rate",
                Title = $"High bounce rate on {metric.Url.TrimStart('/')}",
                Description = $"Page has a bounce rate of {metric.Value:P0}. Consider improving content quality, page loading speed, or user experience",
                Priority = "medium",
                Impact = "medium",
                EstimatedEffort = "medium"
            });
        }

        // Get poor search ranking metrics
        var lowRankingMetrics = await _context.SeoMetrics
            .Where(m => m.MetricType == "search_position" && m.Value > 10 && m.Date >= DateTime.UtcNow.AddDays(-30))
            .OrderByDescending(m => m.Value)
            .Take(10)
            .ToListAsync();

        foreach (var metric in lowRankingMetrics)
        {
            recommendations.Add(new GeoLeap.Api.Models.PerformanceRecommendation
            {
                Category = "Low Search Ranking",
                Title = $"Low search ranking for {metric.Url.TrimStart('/')}",
                Description = $"Page ranks at position {metric.Value:F1} in search results. Optimize content for target keywords, improve internal linking, and enhance meta tags",
                Priority = "high",
                Impact = "high",
                EstimatedEffort = "medium"
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

    private async Task<float> GetBounceRateAsync(string slug)
    {
        var random = new Random(slug.GetHashCode());
        return (float)(random.NextDouble() * 0.8 + 0.1); // 10-90%
    }

    private async Task<float> GetAveragePositionAsync(string slug)
    {
        var random = new Random(slug.GetHashCode());
        return (float)(random.NextDouble() * 20 + 1); // Position 1-21
    }

    private async Task<float> GetClickThroughRateAsync(string slug)
    {
        var random = new Random(slug.GetHashCode());
        return (float)(random.NextDouble() * 0.15 + 0.02); // 2-17%
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

    private async Task<List<GeoLeap.Api.ProgrammaticSeo.Models.TopPerformingPage>> GetTopPerformingPagesAsync(List<SeoMetrics> metrics)
    {
        var viewMetrics = metrics.Where(m => m.MetricType == "daily_views").ToList();
        var pagePerformance = viewMetrics
            .GroupBy(m => m.Url)
            .Select(g => new GeoLeap.Api.ProgrammaticSeo.Models.TopPerformingPage
            {
                Slug = g.Key.TrimStart('/'),
                Title = $"Page: {g.Key}",
                Views = (int)g.Sum(m => m.Value),
                Position = 5.0f, // Default position
                ClickThroughRate = 0.05f // Default CTR
            })
            .OrderByDescending(p => p.Views)
            .Take(10)
            .ToList();

        return pagePerformance;
    }

    private async Task<List<GeoLeap.Api.ProgrammaticSeo.Models.TopPerformingPage>> GetBottomPerformingPagesAsync(List<SeoMetrics> metrics)
    {
        var viewMetrics = metrics.Where(m => m.MetricType == "daily_views").ToList();
        var pagePerformance = viewMetrics
            .GroupBy(m => m.Url)
            .Select(g => new GeoLeap.Api.ProgrammaticSeo.Models.TopPerformingPage
            {
                Slug = g.Key.TrimStart('/'),
                Title = $"Page: {g.Key}",
                Views = (int)g.Sum(m => m.Value),
                Position = 15.0f, // Default position
                ClickThroughRate = 0.02f // Default CTR
            })
            .OrderBy(p => p.Views)
            .Take(10)
            .ToList();

        return pagePerformance;
    }

    #endregion
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
    public List<GeoLeap.Api.ProgrammaticSeo.Models.TopPerformingPage> TopPerformingPages { get; set; } = new();
    public List<GeoLeap.Api.ProgrammaticSeo.Models.TopPerformingPage> BottomPerformingPages { get; set; } = new();
    public List<string> TrendingKeywords { get; set; } = new();
    public DateTime GeneratedAt { get; set; }
}

// PerformanceRecommendation moved to avoid duplication

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

// TopPerformingPage is defined in ContentModels.cs to avoid duplication