using GeoLeap.Api.ProgrammaticSeo.Models;

namespace GeoLeap.Api.ProgrammaticSeo.Services;

/// <summary>
/// Service interface for automated keyword research and trending content detection
/// </summary>
public interface IKeywordResearchService
{
    // Keyword Discovery
    Task<List<SeoKeyword>> DiscoverKeywordsAsync(string seedKeyword, int maxResults = 100);
    Task<List<SeoKeyword>> GetTrendingKeywordsAsync(string contentType = "all", int days = 7);
    Task<List<SeoKeyword>> AnalyzeCompetitorKeywordsAsync(string competitorDomain);
    Task<List<SeoKeyword>> GetSeasonalKeywordsAsync(string category, int monthsAhead = 3);
    
    // Keyword Analysis
    Task<SeoKeyword> AnalyzeKeywordAsync(string keyword);
    Task<float> CalculateKeywordDifficultyAsync(string keyword);
    Task<int> GetSearchVolumeAsync(string keyword);
    Task<decimal?> GetCostPerClickAsync(string keyword);
    Task<float> CalculateCompetitionScoreAsync(string keyword);
    
    // Keyword Clustering
    Task<List<List<SeoKeyword>>> ClusterKeywordsBySemanticsAsync(List<SeoKeyword> keywords);
    Task<List<SeoKeyword>> GetRelatedKeywordsAsync(string keyword, float similarityThreshold = 0.7f);
    Task<Dictionary<string, List<SeoKeyword>>> GroupKeywordsByIntentAsync(List<SeoKeyword> keywords);
    
    // Trending Analysis
    Task<List<SeoKeyword>> DetectTrendingContentAsync(string contentType);
    Task<List<string>> GetViralTopicsAsync(int hours = 24);
    Task<Dictionary<string, float>> AnalyzeTrendVelocityAsync(List<string> keywords);
    Task<List<SeoKeyword>> PredictUpcomingTrendsAsync(string category, int daysAhead = 30);
    
    // Content Opportunity Analysis
    Task<List<ContentOpportunity>> FindContentGapsAsync(string niche);
    Task<List<string>> GetLowCompetitionKeywordsAsync(string category, int maxDifficulty = 30);
    Task<Dictionary<string, int>> AnalyzeKeywordSeasonsAsync(List<string> keywords);
    Task<List<KeywordCluster>> GetKeywordClustersForTemplatesAsync();
    
    // Performance Tracking
    Task<KeywordPerformanceReport> GetKeywordPerformanceAsync(string keyword, DateTime? startDate = null, DateTime? endDate = null);
    Task<List<SeoKeyword>> GetUnderperformingKeywordsAsync(int minSearchVolume = 100);
    Task<Dictionary<string, object>> GetKeywordRankingsAsync(List<string> keywords);
    
    // Automation
    Task<int> RefreshKeywordDataAsync(int batchSize = 500);
    Task ScheduleKeywordResearchAsync(string category, TimeSpan interval);
    Task<List<SeoKeyword>> AutoGenerateKeywordVariationsAsync(string baseKeyword);
    
    // Integration
    Task ImportKeywordsFromSearchConsoleAsync(int days = 30);
    Task<List<SeoKeyword>> AnalyzeCurrentContentKeywordsAsync();
    Task SyncKeywordsWithContentAsync();
}

/// <summary>
/// Content opportunity model
/// </summary>
public class ContentOpportunity
{
    public string Keyword { get; set; } = string.Empty;
    public int SearchVolume { get; set; }
    public float Competition { get; set; }
    public float OpportunityScore { get; set; }
    public string ContentType { get; set; } = string.Empty;
    public string Reasoning { get; set; } = string.Empty;
    public List<string> RelatedKeywords { get; set; } = new();
}

/// <summary>
/// Keyword cluster model
/// </summary>
public class KeywordCluster
{
    public string ClusterName { get; set; } = string.Empty;
    public string PrimaryKeyword { get; set; } = string.Empty;
    public List<SeoKeyword> Keywords { get; set; } = new();
    public float ClusterStrength { get; set; }
    public string SearchIntent { get; set; } = string.Empty;
    public int TotalSearchVolume { get; set; }
    public float AverageCompetition { get; set; }
}

/// <summary>
/// Keyword performance report
/// </summary>
public class KeywordPerformanceReport
{
    public string Keyword { get; set; } = string.Empty;
    public int CurrentRanking { get; set; }
    public int PreviousRanking { get; set; }
    public int RankingChange => PreviousRanking - CurrentRanking;
    public int Clicks { get; set; }
    public int Impressions { get; set; }
    public float ClickThroughRate => Impressions > 0 ? (float)Clicks / Impressions : 0;
    public DateTime ReportDate { get; set; }
}