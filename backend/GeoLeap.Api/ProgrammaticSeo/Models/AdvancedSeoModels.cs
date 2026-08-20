namespace GeoLeap.Api.ProgrammaticSeo.Models;

// Missing types from IAdvancedKeywordResearchService.cs
public class ContentStrategy
{
    public string Strategy { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public int ContentLength { get; set; }
    public string UpdateFrequency { get; set; } = string.Empty;
    public IEnumerable<string> Topics { get; set; } = new List<string>();
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
    public double Confidence { get; set; }
}

public class VolatilityMetrics
{
    public double Volatility { get; set; }
    public double StandardDeviation { get; set; }
    public double VarianceCoefficient { get; set; }
}

public class DataPoint
{
    public DateTime Date { get; set; }
    public double Value { get; set; }
    public string? Source { get; set; }
    public Dictionary<string, object> Metadata { get; set; } = new();
}

public class SerpResult
{
    public int Position { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Domain { get; set; } = string.Empty;
    public double AuthorityScore { get; set; }
}

public class RankingOpportunity
{
    public string Keyword { get; set; } = string.Empty;
    public int CurrentPosition { get; set; }
    public int TargetPosition { get; set; }
    public double DifficultyScore { get; set; }
    public string Strategy { get; set; } = string.Empty;
}

public class LocalSearchData
{
    public bool HasLocalIntent { get; set; }
    public IEnumerable<string> Locations { get; set; } = new List<string>();
    public double LocalSearchVolume { get; set; }
}

public class DifficultyFactors
{
    public double CompetitionLevel { get; set; }
    public double DomainAuthorityRequired { get; set; }
    public double ContentQualityRequired { get; set; }
    public double BacklinksRequired { get; set; }
}

public class RankingStrategy
{
    public string Strategy { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public double SuccessProbability { get; set; }
    public TimeSpan EstimatedTime { get; set; }
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
    public IEnumerable<string> Keywords { get; set; } = new List<string>();
    public double RelevanceScore { get; set; }
}

public class ContentGap
{
    public string Topic { get; set; } = string.Empty;
    public string MissingContent { get; set; } = string.Empty;
    public double OpportunityScore { get; set; }
    public IEnumerable<string> RelatedKeywords { get; set; } = new List<string>();
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

public class CompetitiveLandscape
{
    public IEnumerable<CompetitorProfile> Competitors { get; set; } = new List<CompetitorProfile>();
    public double AverageCompetition { get; set; }
    public double MarketSaturation { get; set; }
}

public class TopicCluster
{
    public string Topic { get; set; } = string.Empty;
    public IEnumerable<string> Keywords { get; set; } = new List<string>();
    public double RelevanceScore { get; set; }
}

public enum SearchIntent
{
    Informational,
    Commercial,
    Transactional,
    Navigational,
    Local
}

public class KeywordIntent
{
    public string Keyword { get; set; } = string.Empty;
    public SearchIntent Intent { get; set; }
    public double Confidence { get; set; }
}

public class IntentDistribution
{
    public double InformationalPercentage { get; set; }
    public double CommercialPercentage { get; set; }
    public double TransactionalPercentage { get; set; }
    public double NavigationalPercentage { get; set; }
}

public class ContentRecommendation
{
    public string ContentType { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public IEnumerable<string> TargetKeywords { get; set; } = new List<string>();
}

public class RankingDataPoint
{
    public DateTime Date { get; set; }
    public int Position { get; set; }
    public int SearchVolume { get; set; }
    public string SearchEngine { get; set; } = "google";
}

public class RankingMetrics
{
    public double AveragePosition { get; set; }
    public double BestPosition { get; set; }
    public double PositionChange { get; set; }
    public double Volatility { get; set; }
}

public class RankingEvent
{
    public DateTime Date { get; set; }
    public string EventType { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public double PositionImpact { get; set; }
}

public class SeasonalPeak
{
    public string Month { get; set; } = string.Empty;
    public double RelativeVolume { get; set; }
    public string Reason { get; set; } = string.Empty;
}

public class MonthlyTrend
{
    public string Month { get; set; } = string.Empty;
    public double Volume { get; set; }
    public double ChangeFromPrevious { get; set; }
}

public class KeywordGap
{
    public string Keyword { get; set; } = string.Empty;
    public int CompetitorPosition { get; set; }
    public int OurPosition { get; set; }
    public double OpportunityScore { get; set; }
}

public class CompetitiveMetrics
{
    public double AverageAuthorityScore { get; set; }
    public double AverageContentLength { get; set; }
    public double AverageBacklinks { get; set; }
    public double CompetitionIntensity { get; set; }
}

public class OpportunityInsight
{
    public string Insight { get; set; } = string.Empty;
    public string RecommendedAction { get; set; } = string.Empty;
    public double ImpactScore { get; set; }
    public double EffortRequired { get; set; }
}

// Missing types from ISeoPageGenerationService.cs
public enum SeoPageStatus
{
    Draft = 0,
    Published = 1,
    Archived = 2,
    Pending = 3,
    Error = 4
}

public enum SeoJobPriority
{
    Low = 0,
    Medium = 1,
    High = 2,
    Critical = 3
}

public enum SeoJobStatus
{
    Pending = 0,
    Running = 1,
    Completed = 2,
    Failed = 3,
    Cancelled = 4
}

public class SeoGenerationJob
{
    public string Id { get; set; } = string.Empty;
    public string TemplateId { get; set; } = string.Empty;
    public SeoJobStatus Status { get; set; }
    public SeoJobPriority Priority { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public double Progress { get; set; }
    public string? ErrorMessage { get; set; }
    public int ProcessedCount { get; set; }
    public int TotalCount { get; set; }
    public int BatchSize { get; set; } = 50;
    public string Configuration { get; set; } = "{}";
    public int SuccessCount { get; set; } = 0;
    public int ErrorCount { get; set; } = 0;
    public List<string> ErrorMessages { get; set; } = new();
}

public class PageGenerationOptions
{
    public bool OptimizeImages { get; set; } = true;
    public bool GenerateMetaTags { get; set; } = true;
    public bool ValidateContent { get; set; } = true;
    public bool CompressContent { get; set; } = false;
}

public class BatchGenerationOptions
{
    public int ConcurrencyLimit { get; set; } = 5;
    public TimeSpan? DelayBetweenBatches { get; set; }
    public bool ContinueOnError { get; set; } = true;
    public bool ValidateBeforeGeneration { get; set; } = true;
}

public class GenerationError
{
    public string ErrorMessage { get; set; } = string.Empty;
    public string ErrorCode { get; set; } = string.Empty;
    public string? Data { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

public class BatchGenerationMetrics
{
    public TimeSpan AverageGenerationTime { get; set; }
    public double SuccessRate { get; set; }
    public int TotalMemoryUsage { get; set; }
    public int TotalProcessingTime { get; set; }
}

public class RegenerationOptions
{
    public bool UpdateMetadata { get; set; } = true;
    public bool PreserveCustomChanges { get; set; } = true;
    public bool RegenerateSchemaMarkup { get; set; } = true;
    public bool UpdatePerformanceMetrics { get; set; } = true;
    public IEnumerable<string>? FieldsToUpdate { get; set; }
    public IEnumerable<string>? FieldsToPreserve { get; set; }
    public bool RegenerateImages { get; set; } = false;
    public Dictionary<string, object> NewData { get; set; } = new();
}

public class RegenerationError
{
    public string PageId { get; set; } = string.Empty;
    public string ErrorMessage { get; set; } = string.Empty;
    public string ErrorCode { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

public class DataSourceConfig
{
    public string Type { get; set; } = string.Empty; // api, database, file
    public string ConnectionString { get; set; } = string.Empty;
    public Dictionary<string, string> Parameters { get; set; } = new();
}

public class DataMappingConfig
{
    public Dictionary<string, string> FieldMappings { get; set; } = new();
    public Dictionary<string, string> Transformations { get; set; } = new();
}

public class GenerationFilters
{
    public Dictionary<string, object> Filters { get; set; } = new();
    public int? MaxRecords { get; set; }
    public string? OrderBy { get; set; }
}

public class DataProcessingError
{
    public string RecordId { get; set; } = string.Empty;
    public string ErrorMessage { get; set; } = string.Empty;
    public string ErrorType { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

public class DataSourceMetrics
{
    public int TotalRecordsProcessed { get; set; }
    public TimeSpan ProcessingTime { get; set; }
    public double AverageRecordProcessingTime { get; set; }
    public int ErrorCount { get; set; }
}

public class ValidationError
{
    public string Field { get; set; } = string.Empty;
    public string ErrorMessage { get; set; } = string.Empty;
    public string ErrorCode { get; set; } = string.Empty;
    public object? Value { get; set; }
    
    // Additional properties for compatibility
    public string Code { get => ErrorCode; set => ErrorCode = value; }
    public string Message { get => ErrorMessage; set => ErrorMessage = value; }
}

public class PageGenerationPreview
{
    public string PreviewHtml { get; set; } = string.Empty;
    public string MetaTitle { get; set; } = string.Empty;
    public string MetaDescription { get; set; } = string.Empty;
    public IEnumerable<string> Keywords { get; set; } = new List<string>();
    public Dictionary<string, object> UsedVariables { get; set; } = new();
}

public class GenerationMetrics
{
    public int TotalPages { get; set; }
    public int PagesGenerated { get; set; }
    public TimeSpan AverageGenerationTime { get; set; }
    public double SuccessRate { get; set; }
    public DateTime PeriodStart { get; set; }
    public DateTime PeriodEnd { get; set; }
}

public class OptimizationCriteria
{
    public string PrimaryGoal { get; set; } = string.Empty; // speed, quality, seo
    public Dictionary<string, double> Weights { get; set; } = new();
    public Dictionary<string, object> Constraints { get; set; } = new();
}

public class GenerationOptimizationResult
{
    public Dictionary<string, object> OptimizedSettings { get; set; } = new();
    public double PerformanceImprovement { get; set; }
    public string RecommendedChanges { get; set; } = string.Empty;
}

public class PageExportRequest
{
    public IEnumerable<string> PageIds { get; set; } = new List<string>();
    public string Format { get; set; } = "html"; // html, pdf, json
    public Dictionary<string, object> Options { get; set; } = new();
}

public class PageExportResult
{
    public string ExportId { get; set; } = string.Empty;
    public string DownloadUrl { get; set; } = string.Empty;
    public int ExportedPages { get; set; }
    public string Format { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class PageImportRequest
{
    public string Source { get; set; } = string.Empty;
    public string Format { get; set; } = string.Empty;
    public Dictionary<string, object> ImportOptions { get; set; } = new();
}

public class PageImportResult
{
    public string ImportId { get; set; } = string.Empty;
    public int ImportedPages { get; set; }
    public int SkippedPages { get; set; }
    public IEnumerable<string> Errors { get; set; } = new List<string>();
}

public class BulkOperationResult
{
    public int TotalItems { get; set; }
    public int ProcessedItems { get; set; }
    public int SuccessfulItems { get; set; }
    public int FailedItems { get; set; }
    public int SkippedItems { get; set; }
    public int AffectedItems { get; set; }
    public IEnumerable<string> Errors { get; set; } = new List<string>();
    public IEnumerable<OperationError> DetailedErrors { get; set; } = new List<OperationError>();
    public TimeSpan Duration { get; set; }
}

public class OperationError
{
    public string Id { get; set; } = string.Empty;
    public string ErrorCode { get; set; } = string.Empty;
    public string ErrorMessage { get; set; } = string.Empty;
    public string? Source { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public Dictionary<string, object>? AdditionalData { get; set; }
    
    // Additional properties required by SeoPageGenerationService
    public string ItemId { get; set; } = string.Empty;
    public string Message { get => ErrorMessage; set => ErrorMessage = value; }
}

public class SitemapGenerationRequest
{
    public IEnumerable<string>? PageIds { get; set; }
    public string? TemplateId { get; set; }
    public Dictionary<string, object> Options { get; set; } = new();
}

public class SitemapGenerationResult
{
    public string SitemapUrl { get; set; } = string.Empty;
    public int IncludedPages { get; set; }
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
}

public class SchemaGenerationRequest
{
    public IEnumerable<string> PageIds { get; set; } = new List<string>();
    public string SchemaType { get; set; } = string.Empty;
    public Dictionary<string, object> SchemaProperties { get; set; } = new();
}

public class SchemaMarkupResult
{
    public Dictionary<string, string> GeneratedSchemas { get; set; } = new(); // PageId -> Schema JSON
    public int GeneratedCount { get; set; }
    public IEnumerable<string> Errors { get; set; } = new List<string>();
}

public class GenerationPerformanceAnalysis
{
    public string TemplateId { get; set; } = string.Empty;
    public TimeSpan AverageGenerationTime { get; set; }
    public double SuccessRate { get; set; }
    public double QualityScore { get; set; }
    public IEnumerable<PerformanceBottleneck> Bottlenecks { get; set; } = new List<PerformanceBottleneck>();
    public Dictionary<string, object> Recommendations { get; set; } = new();
}

public class PerformanceBottleneck
{
    public string Component { get; set; } = string.Empty;
    public TimeSpan AverageTime { get; set; }
    public double ImpactScore { get; set; }
    public string Recommendation { get; set; } = string.Empty;
}

public class GenerationJobMetrics
{
    public TimeSpan TotalProcessingTime { get; set; }
    public TimeSpan AverageItemProcessingTime { get; set; }
    public int MemoryUsage { get; set; }
    public double CpuUsage { get; set; }
}