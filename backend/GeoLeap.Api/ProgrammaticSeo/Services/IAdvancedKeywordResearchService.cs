using GeoLeap.Api.ProgrammaticSeo.Models;

namespace GeoLeap.Api.ProgrammaticSeo.Services;

/// <summary>
/// Advanced Keyword Research Service with AI-powered analysis and competition insights
/// </summary>
public interface IAdvancedKeywordResearchService
{
    /// <summary>
    /// Discover keyword opportunities with search volume and competition analysis
    /// </summary>
    Task<IEnumerable<KeywordOpportunity>> DiscoverKeywordOpportunitiesAsync(
        KeywordResearchRequest request, 
        CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Analyze competitor keywords and strategies
    /// </summary>
    Task<CompetitorAnalysis> AnalyzeCompetitorsAsync(
        IEnumerable<string> competitorUrls, 
        string targetKeyword, 
        CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Get search volume trends and seasonal patterns
    /// </summary>
    Task<KeywordTrendAnalysis> GetKeywordTrendsAsync(
        IEnumerable<string> keywords, 
        TimeSpan period, 
        CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Generate long-tail keyword variations
    /// </summary>
    Task<IEnumerable<string>> GenerateLongTailVariationsAsync(
        string baseKeyword, 
        int maxVariations = 50, 
        CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Analyze SERP features and ranking opportunities
    /// </summary>
    Task<SerpAnalysis> AnalyzeSerpFeaturesAsync(
        string keyword, 
        string location = "US", 
        CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Calculate keyword difficulty score
    /// </summary>
    Task<KeywordDifficultyScore> CalculateKeywordDifficultyAsync(
        string keyword, 
        CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Get related keywords and semantic variations
    /// </summary>
    Task<IEnumerable<RelatedKeyword>> GetRelatedKeywordsAsync(
        string keyword, 
        int maxResults = 100, 
        CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Analyze content gaps and opportunities
    /// </summary>
    Task<ContentGapAnalysis> AnalyzeContentGapsAsync(
        IEnumerable<string> targetKeywords, 
        IEnumerable<string> competitorUrls, 
        CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Get search intent classification for keywords
    /// </summary>
    Task<SearchIntentAnalysis> ClassifySearchIntentAsync(
        IEnumerable<string> keywords, 
        CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Monitor keyword rankings over time
    /// </summary>
    Task<KeywordRankingHistory> GetKeywordRankingHistoryAsync(
        string keyword, 
        string domain, 
        TimeSpan period, 
        CancellationToken cancellationToken = default);
}

public class KeywordResearchRequest
{
    public IEnumerable<string> SeedKeywords { get; set; } = new List<string>();
    public IEnumerable<string> ExcludeKeywords { get; set; } = new List<string>();
    public int MinSearchVolume { get; set; } = 100;
    public int MaxSearchVolume { get; set; } = 1000000;
    public double MaxKeywordDifficulty { get; set; } = 70;
    public IEnumerable<string> TargetCountries { get; set; } = new[] { "US" };
    public IEnumerable<string> TargetLanguages { get; set; } = new[] { "en" };
    public bool IncludeLongTail { get; set; } = true;
    public bool IncludeQuestions { get; set; } = true;
    public bool IncludeCommercial { get; set; } = true;
    public ContentCategory? ContentCategory { get; set; }
    public int MaxResults { get; set; } = 1000;
}

public class KeywordOpportunity
{
    public string Keyword { get; set; } = string.Empty;
    public int SearchVolume { get; set; }
    public double KeywordDifficulty { get; set; }
    public double CompetitionLevel { get; set; }
    public decimal CostPerClick { get; set; }
    public SearchIntent Intent { get; set; }
    public IEnumerable<int> TrendData { get; set; } = new List<int>();
    public IEnumerable<string> RelatedKeywords { get; set; } = new List<string>();
    public double EstimatedTraffic { get; set; }
    public double OpportunityScore { get; set; }
    public SerpFeatures SerpFeatures { get; set; } = new();
    public SeasonalityData Seasonality { get; set; } = new();
    public CompetitorPresence CompetitorData { get; set; } = new();
}

public class CompetitorAnalysis
{
    public string TargetKeyword { get; set; } = string.Empty;
    public IEnumerable<CompetitorProfile> Competitors { get; set; } = new List<CompetitorProfile>();
    public IEnumerable<KeywordGap> KeywordGaps { get; set; } = new List<KeywordGap>();
    public IEnumerable<ContentGap> ContentGaps { get; set; } = new List<ContentGap>();
    public CompetitiveMetrics OverallMetrics { get; set; } = new();
    public IEnumerable<OpportunityInsight> Opportunities { get; set; } = new List<OpportunityInsight>();
}

public class CompetitorProfile
{
    public string Domain { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public int Ranking { get; set; }
    public double AuthorityScore { get; set; }
    public int Backlinks { get; set; }
    public int OrganicKeywords { get; set; }
    public double EstimatedTraffic { get; set; }
    public IEnumerable<string> TopKeywords { get; set; } = new List<string>();
    public ContentStrategy Strategy { get; set; } = new();
}

public class KeywordTrendAnalysis
{
    public IEnumerable<KeywordTrend> Trends { get; set; } = new List<KeywordTrend>();
    public SeasonalityInsights Seasonality { get; set; } = new();
    public TrendPredictions Predictions { get; set; } = new();
    public VolatilityMetrics Volatility { get; set; } = new();
}

public class KeywordTrend
{
    public string Keyword { get; set; } = string.Empty;
    public IEnumerable<DataPoint> HistoricalData { get; set; } = new List<DataPoint>();
    public double GrowthRate { get; set; }
    public TrendDirection Direction { get; set; }
    public double Volatility { get; set; }
}

public class SerpAnalysis
{
    public string Keyword { get; set; } = string.Empty;
    public IEnumerable<SerpResult> OrganicResults { get; set; } = new List<SerpResult>();
    public SerpFeatures Features { get; set; } = new();
    public double CompetitionLevel { get; set; }
    public IEnumerable<RankingOpportunity> Opportunities { get; set; } = new List<RankingOpportunity>();
    public LocalSearchData LocalData { get; set; } = new();
}

public class KeywordDifficultyScore
{
    public string Keyword { get; set; } = string.Empty;
    public double OverallDifficulty { get; set; }
    public DifficultyFactors Factors { get; set; } = new();
    public IEnumerable<RankingStrategy> Strategies { get; set; } = new List<RankingStrategy>();
    public TimeEstimate TimeToRank { get; set; } = new();
}

public class RelatedKeyword
{
    public string Keyword { get; set; } = string.Empty;
    public double RelevanceScore { get; set; }
    public int SearchVolume { get; set; }
    public double Difficulty { get; set; }
    public RelationshipType Relationship { get; set; }
    public SemanticCluster Cluster { get; set; } = new();
}

public class ContentGapAnalysis
{
    public IEnumerable<ContentGap> Gaps { get; set; } = new List<ContentGap>();
    public IEnumerable<ContentOpportunity> Opportunities { get; set; } = new List<ContentOpportunity>();
    public CompetitiveLandscape Landscape { get; set; } = new();
    public IEnumerable<TopicCluster> TopicClusters { get; set; } = new List<TopicCluster>();
}

public class SearchIntentAnalysis
{
    public IEnumerable<KeywordIntent> Classifications { get; set; } = new List<KeywordIntent>();
    public IntentDistribution Distribution { get; set; } = new();
    public IEnumerable<ContentRecommendation> ContentRecommendations { get; set; } = new List<ContentRecommendation>();
}

public class KeywordRankingHistory
{
    public string Keyword { get; set; } = string.Empty;
    public string Domain { get; set; } = string.Empty;
    public IEnumerable<RankingDataPoint> History { get; set; } = new List<RankingDataPoint>();
    public RankingMetrics Metrics { get; set; } = new();
    public IEnumerable<RankingEvent> Events { get; set; } = new List<RankingEvent>();
}

// Supporting classes
public class SerpFeatures
{
    public bool FeaturedSnippet { get; set; }
    public bool PeopleAlsoAsk { get; set; }
    public bool KnowledgeGraph { get; set; }
    public bool LocalPack { get; set; }
    public bool ImagePack { get; set; }
    public bool VideoPack { get; set; }
    public bool ShoppingResults { get; set; }
    public bool NewsResults { get; set; }
}

public class SeasonalityData
{
    public IEnumerable<SeasonalPeak> Peaks { get; set; } = new List<SeasonalPeak>();
    public double SeasonalityScore { get; set; }
    public IEnumerable<MonthlyTrend> MonthlyTrends { get; set; } = new List<MonthlyTrend>();
}

public class CompetitorPresence
{
    public int TotalCompetitors { get; set; }
    public double AverageAuthorityScore { get; set; }
    public IEnumerable<string> TopCompetitors { get; set; } = new List<string>();
}

public enum SearchIntent
{
    Informational,
    Commercial,
    Transactional,
    Navigational,
    Local
}

public enum ContentCategory
{
    Movie,
    TvShow,
    Streaming,
    Entertainment,
    Technology,
    Review
}

public enum TrendDirection
{
    Rising,
    Declining,
    Stable,
    Volatile
}

public enum RelationshipType
{
    Synonym,
    Related,
    LongTail,
    Semantic,
    Question
}

// Additional supporting classes for advanced keyword research

public class SerpResult
{
    public int Position { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Domain { get; set; } = string.Empty;
    public double AuthorityScore { get; set; }
    public bool HasRichSnippets { get; set; }
}

public class RankingOpportunity
{
    public int Position { get; set; }
    public string Opportunity { get; set; } = string.Empty;
    public string Difficulty { get; set; } = string.Empty;
    public string Strategy { get; set; } = string.Empty;
    public double EstimatedTraffic { get; set; }
}

public class LocalSearchData
{
    public bool HasLocalIntent { get; set; }
    public List<string> Locations { get; set; } = new();
    public double LocalSearchVolume { get; set; }
}

public class DifficultyFactors
{
    public double CompetitionLevel { get; set; }
    public double DomainAuthorityRequired { get; set; }
    public double ContentQualityRequired { get; set; }
    public double BacklinksRequired { get; set; }
    public int ContentLength { get; set; }
    public double TopicalAuthority { get; set; }
}

public class RankingStrategy
{
    public string Strategy { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public double SuccessProbability { get; set; }
    public TimeSpan EstimatedTime { get; set; }
    public string Priority { get; set; } = string.Empty;
    public IEnumerable<string> Requirements { get; set; } = new List<string>();
}

public class TimeEstimate
{
    public TimeSpan MinTime { get; set; }
    public TimeSpan MaxTime { get; set; }
    public TimeSpan AverageTime { get; set; }
    public double Confidence { get; set; }
}

public class SemanticCluster
{
    public string ClusterName { get; set; } = string.Empty;
    public IEnumerable<string> RelatedTerms { get; set; } = new List<string>();
    public double Coherence { get; set; }
}

public class SeasonalPeak
{
    public string Month { get; set; } = string.Empty;
    public double Intensity { get; set; }
    public string Reason { get; set; } = string.Empty;
}

public class MonthlyTrend
{
    public string Month { get; set; } = string.Empty;
    public double RelativeVolume { get; set; }
    public double YearOverYearChange { get; set; }
}

public class ContentStrategy
{
    public string ApproachType { get; set; } = string.Empty;
    public IEnumerable<string> TopTopics { get; set; } = new List<string>();
    public double ContentFrequency { get; set; }
    public string PrimaryFormat { get; set; } = string.Empty;
}

public class DataPoint
{
    public DateTime Date { get; set; }
    public double Value { get; set; }
    public string Source { get; set; } = string.Empty;
    public Dictionary<string, object> Metadata { get; set; } = new();
}

public class SeasonalityInsights
{
    public bool HasSeasonality { get; set; }
    public double SeasonalityScore { get; set; }
    public IEnumerable<SeasonalPeak> Peaks { get; set; } = new List<SeasonalPeak>();
    public string Pattern { get; set; } = string.Empty;
}

public class TrendPredictions
{
    public double GrowthRate { get; set; }
    public string TrendDirection { get; set; } = string.Empty;
    public double Confidence { get; set; }
    public IEnumerable<TrendForecast> Forecasts { get; set; } = new List<TrendForecast>();
}

public class TrendForecast
{
    public DateTime Date { get; set; }
    public double PredictedVolume { get; set; }
    public double ConfidenceInterval { get; set; }
}

public class VolatilityMetrics
{
    public double Volatility { get; set; }
    public double StandardDeviation { get; set; }
    public double VarianceCoefficient { get; set; }
}

public class CompetitiveLandscape
{
    public int TotalCompetitors { get; set; }
    public double AverageAuthorityScore { get; set; }
    public double KeywordOverlap { get; set; }
    public IEnumerable<string> ContentGaps { get; set; } = new List<string>();
    public IEnumerable<string> Opportunities { get; set; } = new List<string>();
}

public class TopicCluster
{
    public string Name { get; set; } = string.Empty;
    public List<string> Keywords { get; set; } = new();
    public string CentralKeyword { get; set; } = string.Empty;
    public double RelevanceScore { get; set; }
}

public class IntentDistribution
{
    public double Informational { get; set; }
    public double Commercial { get; set; }
    public double Transactional { get; set; }
    public double Navigational { get; set; }
    public double Local { get; set; }
}

public class ContentRecommendation
{
    public SearchIntent Intent { get; set; }
    public string ContentType { get; set; } = string.Empty;
    public string Priority { get; set; } = string.Empty;
    public int KeywordCount { get; set; }
    public List<string> Examples { get; set; } = new();
}

public class RankingDataPoint
{
    public DateTime Date { get; set; }
    public int Position { get; set; }
    public int Volume { get; set; }
    public int Clicks { get; set; }
    public int Impressions { get; set; }
}

public class RankingMetrics
{
    public double AveragePosition { get; set; }
    public int BestPosition { get; set; }
    public int WorstPosition { get; set; }
    public string Trend { get; set; } = string.Empty;
    public double Volatility { get; set; }
}

public class RankingEvent
{
    public DateTime Date { get; set; }
    public string EventType { get; set; } = string.Empty;
    public int PositionChange { get; set; }
    public string Impact { get; set; } = string.Empty;
}

public class CompetitorContent
{
    public string Url { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public int WordCount { get; set; }
    public double KeywordDensity { get; set; }
    public bool HasVideo { get; set; }
    public bool HasImages { get; set; }
    public double LoadTime { get; set; }
    public bool MobileOptimized { get; set; }
}