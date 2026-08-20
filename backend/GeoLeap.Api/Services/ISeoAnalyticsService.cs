using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service for SEO analytics, tracking, and insights
/// </summary>
public interface ISeoAnalyticsService
{
    /// <summary>
    /// Record SEO metrics for a URL
    /// </summary>
    Task RecordSeoMetricAsync(SeoMetrics metric, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get SEO analytics data
    /// </summary>
    Task<SeoAnalyticsResponse> GetSeoAnalyticsAsync(SeoAnalyticsRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get top performing keywords
    /// </summary>
    Task<Dictionary<string, int>> GetTopKeywordsAsync(DateTime? startDate = null, DateTime? endDate = null, int limit = 20, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get top performing pages
    /// </summary>
    Task<Dictionary<string, int>> GetTopPagesAsync(DateTime? startDate = null, DateTime? endDate = null, int limit = 20, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get SEO performance trends
    /// </summary>
    Task<Dictionary<string, decimal>> GetPerformanceTrendsAsync(DateTime? startDate = null, DateTime? endDate = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Analyze SEO issues across the site
    /// </summary>
    Task<List<SeoIssue>> AnalyzeSeoIssuesAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Get click-through rates for content
    /// </summary>
    Task<Dictionary<string, decimal>> GetClickThroughRatesAsync(DateTime? startDate = null, DateTime? endDate = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get search ranking data
    /// </summary>
    Task<Dictionary<string, List<RankingData>>> GetSearchRankingsAsync(List<string>? keywords = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Track organic traffic metrics
    /// </summary>
    Task<OrganicTrafficReport> GetOrganicTrafficReportAsync(DateTime? startDate = null, DateTime? endDate = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get content performance insights
    /// </summary>
    Task<List<ContentPerformanceInsight>> GetContentPerformanceInsightsAsync(DateTime? startDate = null, DateTime? endDate = null, int limit = 50, CancellationToken cancellationToken = default);

    /// <summary>
    /// Generate SEO audit report
    /// </summary>
    Task<SeoAuditReport> GenerateSeoAuditReportAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Get competitor analysis data
    /// </summary>
    Task<CompetitorAnalysis> GetCompetitorAnalysisAsync(List<string> competitorDomains, CancellationToken cancellationToken = default);

    /// <summary>
    /// Track keyword performance over time
    /// </summary>
    Task<KeywordPerformanceReport> GetKeywordPerformanceAsync(string keyword, DateTime? startDate = null, DateTime? endDate = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get search console integration data
    /// </summary>
    Task<SearchConsoleData> GetSearchConsoleDataAsync(DateTime? startDate = null, DateTime? endDate = null, CancellationToken cancellationToken = default);
}

/// <summary>
/// Search ranking data for keywords
/// </summary>
public class RankingData
{
    public string Keyword { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public int Position { get; set; }
    public DateTime Date { get; set; }
    public string SearchEngine { get; set; } = "google";
    public string Country { get; set; } = "US";
    public string Device { get; set; } = "desktop";
    public int SearchVolume { get; set; }
    public decimal Difficulty { get; set; }
}

/// <summary>
/// Organic traffic analytics report
/// </summary>
public class OrganicTrafficReport
{
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public int TotalSessions { get; set; }
    public int TotalUsers { get; set; }
    public int TotalPageViews { get; set; }
    public double AverageSessionDuration { get; set; }
    public decimal BounceRate { get; set; }
    public Dictionary<string, int> TopLandingPages { get; set; } = new();
    public Dictionary<string, int> TopKeywords { get; set; } = new();
    public Dictionary<string, int> TrafficByDevice { get; set; } = new();
    public Dictionary<string, int> TrafficByCountry { get; set; } = new();
    public List<DailyTrafficData> DailyTraffic { get; set; } = new();
}

/// <summary>
/// Daily traffic data point
/// </summary>
public class DailyTrafficData
{
    public DateTime Date { get; set; }
    public int Sessions { get; set; }
    public int Users { get; set; }
    public int PageViews { get; set; }
    public decimal BounceRate { get; set; }
    public double AvgSessionDuration { get; set; }
}

/// <summary>
/// Content performance insights
/// </summary>
public class ContentPerformanceInsight
{
    public string Url { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public int Impressions { get; set; }
    public int Clicks { get; set; }
    public decimal ClickThroughRate { get; set; }
    public double AveragePosition { get; set; }
    public int OrganicTraffic { get; set; }
    public decimal ConversionRate { get; set; }
    public List<string> TopKeywords { get; set; } = new();
    public string PerformanceGrade { get; set; } = string.Empty; // A, B, C, D, F
    public List<string> Recommendations { get; set; } = new();
}

/// <summary>
/// SEO audit report
/// </summary>
public class SeoAuditReport
{
    public DateTime AuditDate { get; set; } = DateTime.UtcNow;
    public int OverallScore { get; set; }
    public SeoAuditSummary Summary { get; set; } = new();
    public List<SeoIssue> Issues { get; set; } = new();
    public Dictionary<string, SeoAuditCategory> Categories { get; set; } = new();
    public List<string> Recommendations { get; set; } = new();
    public SeoAuditTechnical Technical { get; set; } = new();
    public SeoAuditContent Content { get; set; } = new();
    public SeoAuditPerformance Performance { get; set; } = new();
}

/// <summary>
/// SEO audit summary
/// </summary>
public class SeoAuditSummary
{
    public int TotalPages { get; set; }
    public int CrawlablePages { get; set; }
    public int IndexablePages { get; set; }
    public int IssuesFound { get; set; }
    public int CriticalIssues { get; set; }
    public int WarningsCount { get; set; }
    public double AveragePageSpeed { get; set; }
    public int MobileOptimizedPages { get; set; }
    public int PagesWithStructuredData { get; set; }
}

/// <summary>
/// SEO audit category scoring
/// </summary>
public class SeoAuditCategory
{
    public string Name { get; set; } = string.Empty;
    public int Score { get; set; }
    public int MaxScore { get; set; }
    public string Status { get; set; } = string.Empty; // pass, warning, fail
    public List<string> Issues { get; set; } = new();
    public List<string> Recommendations { get; set; } = new();
}

/// <summary>
/// Technical SEO audit data
/// </summary>
public class SeoAuditTechnical
{
    public bool HasRobotsTxt { get; set; }
    public bool HasXmlSitemap { get; set; }
    public bool Has404Page { get; set; }
    public bool HasHttpsRedirect { get; set; }
    public int DuplicateContentPages { get; set; }
    public int BrokenLinksCount { get; set; }
    public int PagesWithoutMetaDescription { get; set; }
    public int PagesWithoutTitleTag { get; set; }
    public double AveragePageLoadTime { get; set; }
    public int MobileFriendlyPages { get; set; }
    public Dictionary<string, int> StatusCodeDistribution { get; set; } = new();
}

/// <summary>
/// Content SEO audit data
/// </summary>
public class SeoAuditContent
{
    public int TotalWordsCount { get; set; }
    public double AverageWordsPerPage { get; set; }
    public int ThinContentPages { get; set; }
    public int DuplicateTitleTags { get; set; }
    public int DuplicateMetaDescriptions { get; set; }
    public int PagesWithoutH1 { get; set; }
    public int ImagesWithoutAltText { get; set; }
    public double KeywordDensityAverage { get; set; }
    public int InternalLinksCount { get; set; }
    public int ExternalLinksCount { get; set; }
}

/// <summary>
/// Performance SEO audit data
/// </summary>
public class SeoAuditPerformance
{
    public double AverageLoadTime { get; set; }
    public double AverageLCP { get; set; }
    public double AverageFID { get; set; }
    public decimal AverageCLS { get; set; }
    public int MobileSpeedScore { get; set; }
    public int DesktopSpeedScore { get; set; }
    public List<string> PerformanceIssues { get; set; } = new();
    public Dictionary<string, double> CoreWebVitalsStatus { get; set; } = new();
}

/// <summary>
/// Competitor analysis data
/// </summary>
public class CompetitorAnalysis
{
    public DateTime AnalysisDate { get; set; } = DateTime.UtcNow;
    public List<CompetitorData> Competitors { get; set; } = new();
    public Dictionary<string, CompetitorComparison> Comparisons { get; set; } = new();
    public List<KeywordGap> KeywordGaps { get; set; } = new();
    public List<string> Opportunities { get; set; } = new();
}

/// <summary>
/// Individual competitor data
/// </summary>
public class CompetitorData
{
    public string Domain { get; set; } = string.Empty;
    public int EstimatedTraffic { get; set; }
    public int KeywordsRanking { get; set; }
    public int BacklinksCount { get; set; }
    public int DomainRating { get; set; }
    public List<string> TopKeywords { get; set; } = new();
    public double AveragePosition { get; set; }
}

/// <summary>
/// Competitor comparison data
/// </summary>
public class CompetitorComparison
{
    public string Metric { get; set; } = string.Empty;
    public double OurValue { get; set; }
    public double CompetitorAverage { get; set; }
    public double Difference { get; set; }
    public string Status { get; set; } = string.Empty; // ahead, behind, similar
}

/// <summary>
/// Keyword gap analysis
/// </summary>
public class KeywordGap
{
    public string Keyword { get; set; } = string.Empty;
    public int SearchVolume { get; set; }
    public decimal Difficulty { get; set; }
    public int CompetitorsRanking { get; set; }
    public int? OurPosition { get; set; }
    public string Opportunity { get; set; } = string.Empty; // high, medium, low
}

/// <summary>
/// Keyword performance over time
/// </summary>
public class KeywordPerformanceReport
{
    public string Keyword { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public List<KeywordDataPoint> Performance { get; set; } = new();
    public KeywordSummary Summary { get; set; } = new();
    public List<string> RelatedKeywords { get; set; } = new();
}

/// <summary>
/// Keyword performance data point
/// </summary>
public class KeywordDataPoint
{
    public DateTime Date { get; set; }
    public int Position { get; set; }
    public int Impressions { get; set; }
    public int Clicks { get; set; }
    public decimal ClickThroughRate { get; set; }
    public int SearchVolume { get; set; }
}

/// <summary>
/// Keyword performance summary
/// </summary>
public class KeywordSummary
{
    public double AveragePosition { get; set; }
    public int TotalImpressions { get; set; }
    public int TotalClicks { get; set; }
    public decimal AverageClickThroughRate { get; set; }
    public int PositionChange { get; set; }
    public string Trend { get; set; } = string.Empty; // improving, declining, stable
    public int SearchVolume { get; set; }
    public decimal Difficulty { get; set; }
}

/// <summary>
/// Google Search Console integration data
/// </summary>
public class SearchConsoleData
{
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public int TotalImpressions { get; set; }
    public int TotalClicks { get; set; }
    public decimal AverageClickThroughRate { get; set; }
    public double AveragePosition { get; set; }
    public List<SearchConsoleQuery> TopQueries { get; set; } = new();
    public List<SearchConsolePage> TopPages { get; set; } = new();
    public Dictionary<string, int> ClicksByDevice { get; set; } = new();
    public Dictionary<string, int> ClicksByCountry { get; set; } = new();
    public List<SearchConsoleIssue> CoverageIssues { get; set; } = new();
}

/// <summary>
/// Search Console query data
/// </summary>
public class SearchConsoleQuery
{
    public string Query { get; set; } = string.Empty;
    public int Impressions { get; set; }
    public int Clicks { get; set; }
    public decimal ClickThroughRate { get; set; }
    public double AveragePosition { get; set; }
}

/// <summary>
/// Search Console page data
/// </summary>
public class SearchConsolePage
{
    public string Page { get; set; } = string.Empty;
    public int Impressions { get; set; }
    public int Clicks { get; set; }
    public decimal ClickThroughRate { get; set; }
    public double AveragePosition { get; set; }
}

/// <summary>
/// Search Console coverage issue
/// </summary>
public class SearchConsoleIssue
{
    public string IssueType { get; set; } = string.Empty;
    public int AffectedPages { get; set; }
    public string Severity { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public List<string> ExampleUrls { get; set; } = new();
}