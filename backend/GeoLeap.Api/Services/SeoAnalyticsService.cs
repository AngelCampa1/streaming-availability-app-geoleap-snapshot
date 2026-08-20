using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service for SEO analytics and performance tracking
/// </summary>
public class SeoAnalyticsService : ISeoAnalyticsService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<SeoAnalyticsService> _logger;

    public SeoAnalyticsService(
        ApplicationDbContext context,
        ILogger<SeoAnalyticsService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task RecordSeoMetricAsync(SeoMetrics metric, CancellationToken cancellationToken = default)
    {
        try
        {
            _context.SeoMetrics.Add(metric);
            await _context.SaveChangesAsync(cancellationToken);
            _logger.LogInformation("Recorded SEO metric for URL: {Url}", metric.Url);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error recording SEO metric");
            throw;
        }
    }

    public async Task<SeoAnalyticsResponse> GetSeoAnalyticsAsync(SeoAnalyticsRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            var startDate = request.StartDate ?? DateTime.UtcNow.AddDays(-30);
            var endDate = request.EndDate ?? DateTime.UtcNow;

            var metrics = await _context.SeoMetrics
                .Where(m => m.Date >= startDate && m.Date <= endDate)
                .ToListAsync(cancellationToken);

            // Map generic SeoMetrics to expected values using MetricType
            var impressionsMetrics = metrics.Where(m => m.MetricType == "impressions");
            var clicksMetrics = metrics.Where(m => m.MetricType == "clicks");
            var positionMetrics = metrics.Where(m => m.MetricType == "position");
            var ctrMetrics = metrics.Where(m => m.MetricType == "ctr");

            return new SeoAnalyticsResponse
            {
                StartDate = startDate,
                EndDate = endDate,
                TotalImpressions = (int)impressionsMetrics.Sum(m => m.Value),
                TotalClicks = (int)clicksMetrics.Sum(m => m.Value),
                AveragePosition = positionMetrics.Any() ? (double)positionMetrics.Average(m => m.Value) : 0,
                AverageClickThroughRate = ctrMetrics.Any() ? (double)ctrMetrics.Average(m => m.Value) : 0,
                TopPages = clicksMetrics.GroupBy(m => m.Url)
                    .OrderByDescending(g => g.Sum(m => m.Value))
                    .Take(10)
                    .ToDictionary(g => g.Key, g => (int)g.Sum(m => m.Value))
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting SEO analytics");
            throw;
        }
    }

    public async Task<Dictionary<string, int>> GetTopKeywordsAsync(DateTime? startDate = null, DateTime? endDate = null, int limit = 20, CancellationToken cancellationToken = default)
    {
        try
        {
            var start = startDate ?? DateTime.UtcNow.AddDays(-30);
            var end = endDate ?? DateTime.UtcNow;

            // Use SeoMetrics for keyword data
            var keywordMetrics = await _context.SeoMetrics
                .Where(m => m.Date >= start && m.Date <= end && m.MetricType == "keyword")
                .GroupBy(m => m.Metadata ?? "unknown")
                .OrderByDescending(g => g.Sum(m => m.Value))
                .Take(limit)
                .ToDictionaryAsync(g => g.Key, g => (int)g.Sum(m => m.Value), cancellationToken);

            // If no data, return sample data
            if (!keywordMetrics.Any())
            {
                return new Dictionary<string, int>
                {
                    ["streaming"] = 1500,
                    ["watch online"] = 1200,
                    ["movies"] = 1000,
                    ["tv shows"] = 800,
                    ["netflix"] = 750
                };
            }

            return keywordMetrics;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting top keywords");
            return new Dictionary<string, int>();
        }
    }

    public async Task<Dictionary<string, int>> GetTopPagesAsync(DateTime? startDate = null, DateTime? endDate = null, int limit = 20, CancellationToken cancellationToken = default)
    {
        try
        {
            var start = startDate ?? DateTime.UtcNow.AddDays(-30);
            var end = endDate ?? DateTime.UtcNow;

            var pageViews = await _context.SeoMetrics
                .Where(m => m.Date >= start && m.Date <= end && m.MetricType == "pageviews")
                .GroupBy(m => m.Url)
                .OrderByDescending(g => g.Sum(m => m.Value))
                .Take(limit)
                .ToDictionaryAsync(g => g.Key, g => (int)g.Sum(m => m.Value), cancellationToken);

            return pageViews;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting top pages");
            return new Dictionary<string, int>();
        }
    }

    public async Task<Dictionary<string, decimal>> GetPerformanceTrendsAsync(DateTime? startDate = null, DateTime? endDate = null, CancellationToken cancellationToken = default)
    {
        try
        {
            var start = startDate ?? DateTime.UtcNow.AddDays(-30);
            var end = endDate ?? DateTime.UtcNow;

            var trends = await _context.SeoMetrics
                .Where(m => m.Date >= start && m.Date <= end && m.MetricType == "ctr")
                .GroupBy(m => m.Date)
                .OrderBy(g => g.Key)
                .ToDictionaryAsync(
                    g => g.Key.ToString("yyyy-MM-dd"),
                    g => g.Average(m => m.Value),
                    cancellationToken);

            return trends;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting performance trends");
            return new Dictionary<string, decimal>();
        }
    }

    public async Task<List<SeoIssue>> AnalyzeSeoIssuesAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var issues = new List<SeoIssue>();

            // Check for missing meta descriptions
            var metadataWithoutDescriptions = await _context.SeoMetadata
                .Where(m => string.IsNullOrEmpty(m.Description))
                .CountAsync(cancellationToken);

            if (metadataWithoutDescriptions > 0)
            {
                issues.Add(new SeoIssue
                {
                    Type = "Missing Meta Descriptions",
                    Severity = "High",
                    Description = $"{metadataWithoutDescriptions} pages are missing meta descriptions",
                    Url = "/admin/seo/metadata",
                    Recommendation = "Add meta descriptions to improve search engine visibility"
                });
            }

            return issues;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error analyzing SEO issues");
            return new List<SeoIssue>();
        }
    }

    public async Task<Dictionary<string, decimal>> GetClickThroughRatesAsync(DateTime? startDate = null, DateTime? endDate = null, CancellationToken cancellationToken = default)
    {
        try
        {
            var start = startDate ?? DateTime.UtcNow.AddDays(-30);
            var end = endDate ?? DateTime.UtcNow;

            var ctrs = await _context.SeoMetrics
                .Where(m => m.Date >= start && m.Date <= end && m.MetricType == "ctr")
                .GroupBy(m => m.Url)
                .ToDictionaryAsync(
                    g => g.Key,
                    g => g.Average(m => m.Value),
                    cancellationToken);

            return ctrs;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting click-through rates");
            return new Dictionary<string, decimal>();
        }
    }

    public async Task<Dictionary<string, List<RankingData>>> GetSearchRankingsAsync(List<string>? keywords = null, CancellationToken cancellationToken = default)
    {
        // Placeholder - would integrate with rank tracking APIs
        var rankings = new Dictionary<string, List<RankingData>>();
        var keywordList = keywords ?? new List<string> { "streaming", "movies", "tv shows" };
        
        foreach (var keyword in keywordList)
        {
            rankings[keyword] = new List<RankingData>
            {
                new RankingData
                {
                    Keyword = keyword,
                    Position = Random.Shared.Next(1, 100),
                    Date = DateTime.UtcNow,
                    SearchVolume = Random.Shared.Next(1000, 10000),
                    Difficulty = (decimal)Random.Shared.NextDouble() * 100
                }
            };
        }

        return rankings;
    }

    public async Task<OrganicTrafficReport> GetOrganicTrafficReportAsync(DateTime? startDate = null, DateTime? endDate = null, CancellationToken cancellationToken = default)
    {
        try
        {
            var start = startDate ?? DateTime.UtcNow.AddDays(-30);
            var end = endDate ?? DateTime.UtcNow;

            var clickMetrics = await _context.SeoMetrics
                .Where(m => m.Date >= start && m.Date <= end && m.MetricType == "clicks")
                .ToListAsync(cancellationToken);

            var pageViewMetrics = await _context.SeoMetrics
                .Where(m => m.Date >= start && m.Date <= end && m.MetricType == "pageviews")
                .ToListAsync(cancellationToken);

            return new OrganicTrafficReport
            {
                StartDate = start,
                EndDate = end,
                TotalSessions = (int)clickMetrics.Sum(m => m.Value),
                TotalUsers = clickMetrics.Count,
                TotalPageViews = (int)pageViewMetrics.Sum(m => m.Value),
                AverageSessionDuration = 180, // Placeholder
                BounceRate = 0.45m, // Placeholder
                TopLandingPages = clickMetrics.GroupBy(m => m.Url)
                    .OrderByDescending(g => g.Sum(m => m.Value))
                    .Take(10)
                    .ToDictionary(g => g.Key, g => (int)g.Sum(m => m.Value))
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting organic traffic report");
            throw;
        }
    }

    public async Task<List<ContentPerformanceInsight>> GetContentPerformanceInsightsAsync(DateTime? startDate = null, DateTime? endDate = null, int limit = 50, CancellationToken cancellationToken = default)
    {
        try
        {
            var start = startDate ?? DateTime.UtcNow.AddDays(-30);
            var end = endDate ?? DateTime.UtcNow;

            // Get URLs with metrics
            var urlsWithMetrics = await _context.SeoMetrics
                .Where(m => m.Date >= start && m.Date <= end)
                .GroupBy(m => m.Url)
                .Take(limit)
                .Select(g => new ContentPerformanceInsight
                {
                    Url = g.Key,
                    Impressions = (int)g.Where(m => m.MetricType == "impressions").Sum(m => m.Value),
                    Clicks = (int)g.Where(m => m.MetricType == "clicks").Sum(m => m.Value),
                    ClickThroughRate = g.Where(m => m.MetricType == "ctr").Any() ? g.Where(m => m.MetricType == "ctr").Average(m => m.Value) : 0,
                    AveragePosition = g.Where(m => m.MetricType == "position").Any() ? (double)g.Where(m => m.MetricType == "position").Average(m => m.Value) : 0,
                    OrganicTraffic = (int)g.Where(m => m.MetricType == "organic").Sum(m => m.Value),
                    ConversionRate = 0.05m, // Placeholder
                    PerformanceGrade = "B", // Placeholder
                    Recommendations = new List<string> { "Improve meta description", "Add internal links" }
                })
                .ToListAsync(cancellationToken);

            return urlsWithMetrics;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting content performance insights");
            return new List<ContentPerformanceInsight>();
        }
    }

    public async Task<SeoAuditReport> GenerateSeoAuditReportAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var totalPages = await _context.SeoMetadata.CountAsync(cancellationToken);
            var issues = await AnalyzeSeoIssuesAsync(cancellationToken);

            return new SeoAuditReport
            {
                AuditDate = DateTime.UtcNow,
                OverallScore = 85,
                Summary = new SeoAuditSummary
                {
                    TotalPages = totalPages,
                    CrawlablePages = totalPages,
                    IndexablePages = Math.Max(0, totalPages - 5),
                    IssuesFound = issues.Count,
                    CriticalIssues = issues.Count(i => i.Severity == "High"),
                    WarningsCount = issues.Count(i => i.Severity == "Medium"),
                    AveragePageSpeed = 2.1,
                    MobileOptimizedPages = Math.Max(0, totalPages - 2),
                    PagesWithStructuredData = Math.Max(0, totalPages / 2)
                },
                Issues = issues
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating SEO audit report");
            throw;
        }
    }

    public async Task<CompetitorAnalysis> GetCompetitorAnalysisAsync(List<string> competitorDomains, CancellationToken cancellationToken = default)
    {
        // Placeholder - would integrate with SEO tools APIs
        return new CompetitorAnalysis
        {
            AnalysisDate = DateTime.UtcNow,
            Competitors = competitorDomains.Select(domain => new CompetitorData
            {
                Domain = domain,
                EstimatedTraffic = Random.Shared.Next(10000, 1000000),
                KeywordsRanking = Random.Shared.Next(1000, 100000),
                BacklinksCount = Random.Shared.Next(100, 10000),
                DomainRating = Random.Shared.Next(30, 90),
                TopKeywords = new List<string> { "streaming", "movies", "tv shows" },
                AveragePosition = Random.Shared.NextDouble() * 50 + 1
            }).ToList()
        };
    }

    public async Task<KeywordPerformanceReport> GetKeywordPerformanceAsync(string keyword, DateTime? startDate = null, DateTime? endDate = null, CancellationToken cancellationToken = default)
    {
        // Placeholder implementation
        return new KeywordPerformanceReport
        {
            Keyword = keyword,
            StartDate = startDate ?? DateTime.UtcNow.AddDays(-30),
            EndDate = endDate ?? DateTime.UtcNow,
            Summary = new KeywordSummary
            {
                AveragePosition = 15.5,
                TotalImpressions = 5000,
                TotalClicks = 250,
                AverageClickThroughRate = 0.05m,
                PositionChange = -2,
                Trend = "improving",
                SearchVolume = 8000,
                Difficulty = 0.65m
            }
        };
    }

    public async Task<SearchConsoleData> GetSearchConsoleDataAsync(DateTime? startDate = null, DateTime? endDate = null, CancellationToken cancellationToken = default)
    {
        try
        {
            var start = startDate ?? DateTime.UtcNow.AddDays(-30);
            var end = endDate ?? DateTime.UtcNow;

            var metrics = await _context.SeoMetrics
                .Where(m => m.Date >= start && m.Date <= end)
                .ToListAsync(cancellationToken);

            var impressionsMetrics = metrics.Where(m => m.MetricType == "impressions");
            var clicksMetrics = metrics.Where(m => m.MetricType == "clicks");
            var ctrMetrics = metrics.Where(m => m.MetricType == "ctr");
            var positionMetrics = metrics.Where(m => m.MetricType == "position");

            return new SearchConsoleData
            {
                StartDate = start,
                EndDate = end,
                TotalImpressions = (int)impressionsMetrics.Sum(m => m.Value),
                TotalClicks = (int)clicksMetrics.Sum(m => m.Value),
                AverageClickThroughRate = ctrMetrics.Any() ? ctrMetrics.Average(m => m.Value) : 0,
                AveragePosition = positionMetrics.Any() ? (double)positionMetrics.Average(m => m.Value) : 0,
                TopQueries = new List<SearchConsoleQuery>
                {
                    new SearchConsoleQuery { Query = "streaming movies", Clicks = 500, Impressions = 10000, ClickThroughRate = 0.05m, AveragePosition = 12.5 }
                },
                TopPages = clicksMetrics.GroupBy(m => m.Url)
                    .Select(g => new SearchConsolePage
                    {
                        Page = g.Key,
                        Clicks = (int)g.Sum(m => m.Value),
                        Impressions = (int)impressionsMetrics.Where(m => m.Url == g.Key).Sum(m => m.Value),
                        ClickThroughRate = ctrMetrics.Where(m => m.Url == g.Key).Any() ? ctrMetrics.Where(m => m.Url == g.Key).Average(m => m.Value) : 0,
                        AveragePosition = positionMetrics.Where(m => m.Url == g.Key).Any() ? (double)positionMetrics.Where(m => m.Url == g.Key).Average(m => m.Value) : 0
                    })
                    .Take(20)
                    .ToList()
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting Search Console data");
            throw;
        }
    }
}

// Request/Response classes for the service
public class SeoAnalyticsRequest
{
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string? Url { get; set; }
    public string? ContentType { get; set; }
}

public class SeoAnalyticsResponse
{
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public int TotalImpressions { get; set; }
    public int TotalClicks { get; set; }
    public double AveragePosition { get; set; }
    public double AverageClickThroughRate { get; set; }
    public Dictionary<string, int> TopPages { get; set; } = new();
}