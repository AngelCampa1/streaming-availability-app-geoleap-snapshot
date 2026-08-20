using System.ComponentModel.DataAnnotations;

namespace GeoLeap.Api.ProgrammaticSeo.Models;

/// <summary>
/// Filter for template queries
/// </summary>
public class TemplateFilter
{
    public string? Name { get; set; }
    public string? Type { get; set; }
    public string? Category { get; set; }
    public bool? IsActive { get; set; }
    public DateTime? CreatedAfter { get; set; }
    public DateTime? CreatedBefore { get; set; }
    public string? CreatedBy { get; set; }
    public int? MinPriority { get; set; }
    public int? MaxPriority { get; set; }
    public string? SearchTerm { get; set; }
    public string? SortBy { get; set; } = "CreatedAt";
    public string? SortDirection { get; set; } = "desc";
    public int PageSize { get; set; } = 20;
    public int Page { get; set; } = 1;
}

/// <summary>
/// Request for creating a new template
/// </summary>
public class CreateTemplateRequest
{
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;
    
    [Required]
    public string Type { get; set; } = string.Empty;
    
    [Required]
    public string Template { get; set; } = string.Empty;
    
    public string MetaTitle { get; set; } = string.Empty;
    public string MetaDescription { get; set; } = string.Empty;
    public string H1Template { get; set; } = string.Empty;
    public string UrlPattern { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public int Priority { get; set; } = 0;
    public bool IndexPage { get; set; } = true;
    public bool FollowLinks { get; set; } = true;
    public string? CanonicalPattern { get; set; }
    public int? RefreshIntervalHours { get; set; }
    public string Variables { get; set; } = "{}";
    public List<TemplateVariable> VariablesList { get; set; } = new();
    public SeoSettings? SeoSettings { get; set; }
    public bool AutoOptimization { get; set; } = false;
}

/// <summary>
/// Request for updating an existing template
/// </summary>
public class UpdateTemplateRequest
{
    [MaxLength(100)]
    public string? Name { get; set; }
    
    public string? Type { get; set; }
    public string? Template { get; set; }
    public string? MetaTitle { get; set; }
    public string? MetaDescription { get; set; }
    public string? H1Template { get; set; }
    public string? UrlPattern { get; set; }
    public string? Category { get; set; }
    public string? Description { get; set; }
    public bool? IsActive { get; set; }
    public int? Priority { get; set; }
    public bool? IndexPage { get; set; }
    public bool? FollowLinks { get; set; }
    public string? CanonicalPattern { get; set; }
    public int? RefreshIntervalHours { get; set; }
    public string? Variables { get; set; }
    public List<TemplateVariable>? VariablesList { get; set; }
    public SeoSettings? SeoSettings { get; set; }
    public bool? AutoOptimization { get; set; }
}

/// <summary>
/// Format options for importing templates
/// </summary>
public enum ImportFormat
{
    Json,
    Csv,
    Excel,
    Xml,
    Yaml,
    Liquid
}

/// <summary>
/// Format options for exporting templates
/// </summary>
public enum ExportFormat
{
    Json,
    Csv,
    Excel,
    Xml,
    Yaml,
    Pdf,
    Html
}

/// <summary>
/// Processed template with runtime data
/// </summary>
public class ProcessedTemplate
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string ProcessedContent { get; set; } = string.Empty;
    public Dictionary<string, object> Variables { get; set; } = new();
    public DateTime ProcessedAt { get; set; } = DateTime.UtcNow;
    public TimeSpan ProcessingTime { get; set; }
    public string ProcessedBy { get; set; } = string.Empty;
    public int ContentLength { get; set; }
    public int VariableCount { get; set; }
    public bool ProcessingSuccessful { get; set; } = true;
    public string? ProcessingErrors { get; set; }
    public Dictionary<string, object> Metadata { get; set; } = new();
    
    // Additional properties for compatibility
    public string Content => ProcessedContent;
    public string Title { get; set; } = string.Empty;
    public string MetaDescription { get; set; } = string.Empty;
    public string SchemaMarkup { get; set; } = string.Empty;
    public double QualityScore { get; set; } = 0.8;
}

/// <summary>
/// Performance metrics for SEO operations
/// </summary>
public class PerformanceMetrics
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public string Operation { get; set; } = string.Empty;
    public TimeSpan Duration { get; set; }
    public long MemoryUsage { get; set; }
    public int CpuUsage { get; set; }
    public long NetworkBytes { get; set; }
    public int DatabaseQueries { get; set; }
    public int CacheHits { get; set; }
    public int CacheMisses { get; set; }
    public int ErrorCount { get; set; }
    public double ThroughputPerSecond { get; set; }
    public Dictionary<string, object> CustomMetrics { get; set; } = new();
    public string? UserId { get; set; }
    public string? SessionId { get; set; }
    
    // Additional properties required by SeoPageGenerationService
    public double AverageViews { get; set; } = 0.0;
    public double AverageClicks { get; set; } = 0.0;
    public double AverageImpressions { get; set; } = 0.0;
    public double AverageClickThroughRate { get; set; } = 0.0;
    public double AveragePosition { get; set; } = 0.0;
    public double AverageBounceRate { get; set; } = 0.0;
    public double AverageTimeOnPage { get; set; } = 0.0;
}

/// <summary>
/// Optimization metrics and recommendations
/// </summary>
public class OptimizationMetrics
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public DateTime AnalyzedAt { get; set; } = DateTime.UtcNow;
    public string TargetEntity { get; set; } = string.Empty; // template, page, etc.
    public string EntityId { get; set; } = string.Empty;
    public double PerformanceScore { get; set; }
    public double SeoScore { get; set; }
    public double ContentQualityScore { get; set; }
    public double TechnicalScore { get; set; }
    public List<string> Recommendations { get; set; } = new();
    public List<string> Issues { get; set; } = new();
    public List<string> Opportunities { get; set; } = new();
    public Dictionary<string, double> DetailedScores { get; set; } = new();
    public TimeSpan AnalysisDuration { get; set; }
    public string AnalysisVersion { get; set; } = "1.0";
    
    // Additional properties required by SeoPageGenerationService
    public double CurrentPerformance { get; set; }
    public double TargetPerformance { get; set; }
    public double EstimatedImprovement { get; set; }
    public int AnalyzedPages { get; set; }
}

/// <summary>
/// Warning encountered during validation
/// </summary>
public class ValidationWarning
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Code { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Field { get; set; } = string.Empty;
    public string Severity { get; set; } = "Warning"; // Warning, Error, Info
    public string? Suggestion { get; set; }
    public Dictionary<string, object> Context { get; set; } = new();
    public DateTime DetectedAt { get; set; } = DateTime.UtcNow;
    public string Source { get; set; } = string.Empty;
}

/// <summary>
/// Performance trend data over time
/// </summary>
public class PerformanceTrend
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string MetricName { get; set; } = string.Empty;
    public DateTime PeriodStart { get; set; }
    public DateTime PeriodEnd { get; set; }
    public List<DataPoint> DataPoints { get; set; } = new();
    public double AverageValue { get; set; }
    public double MinValue { get; set; }
    public double MaxValue { get; set; }
    public double TrendSlope { get; set; }
    public string TrendDirection { get; set; } = string.Empty; // Improving, Declining, Stable
    public double VariabilityScore { get; set; }
    public List<string> Insights { get; set; } = new();
    
    // Additional properties required by SeoPageGenerationService
    public string Metric { get; set; } = string.Empty;
    public IEnumerable<DataPoint> Data { get; set; } = new List<DataPoint>();
    public double TrendStrength { get; set; } = 0.0;
}

/// <summary>
/// Performance improvement recommendation
/// </summary>
public class PerformanceRecommendation
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty; // Performance, SEO, Content, Technical
    public string Priority { get; set; } = string.Empty; // High, Medium, Low
    public string Impact { get; set; } = string.Empty; // High, Medium, Low
    public string Effort { get; set; } = string.Empty; // High, Medium, Low
    public List<string> ActionItems { get; set; } = new();
    public Dictionary<string, object> Metrics { get; set; } = new();
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string Source { get; set; } = string.Empty;
    public string? TargetEntity { get; set; }
    public bool IsImplemented { get; set; } = false;
    public DateTime? ImplementedAt { get; set; }
    
    // Additional properties required by SeoPerformanceService
    public string Type { get; set; } = string.Empty;
    public string PageSlug { get; set; } = string.Empty;
    public string Issue { get; set; } = string.Empty;
    public string Recommendation { get; set; } = string.Empty;
    public string EstimatedImpact { get; set; } = string.Empty;
    public string EstimatedImprovement { get; set; } = string.Empty;
}

/// <summary>
/// Metadata for export operations
/// </summary>
public class ExportMetadata
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string ExportType { get; set; } = string.Empty;
    public ExportFormat Format { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string CreatedBy { get; set; } = string.Empty;
    public int TotalRecords { get; set; }
    public long FileSizeBytes { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string? FilePath { get; set; }
    public Dictionary<string, object> Filters { get; set; } = new();
    public List<string> IncludedFields { get; set; } = new();
    public TimeSpan GenerationTime { get; set; }
    public string Status { get; set; } = "Pending"; // Pending, InProgress, Completed, Failed
    public string? ErrorMessage { get; set; }
    public DateTime? CompletedAt { get; set; }
    public string? DownloadUrl { get; set; }
    public DateTime? ExpiresAt { get; set; }
    
    // Additional properties for compatibility
    public DateTime ExportedAt { get; set; } = DateTime.UtcNow;
    public int TotalPages { get; set; } = 0;
    public string Compression { get; set; } = "none";
}

/// <summary>
/// Request for keyword research
/// </summary>
public class KeywordResearchRequest
{
    public string BaseKeyword { get; set; } = string.Empty;
    public string? TargetAudience { get; set; }
    public List<string> CompetitorUrls { get; set; } = new();
    public string? ContentType { get; set; }
    public string? Location { get; set; }
    public int MaxResults { get; set; } = 50;
    public bool IncludeLongTail { get; set; } = true;
    public bool IncludeQuestions { get; set; } = true;
    public double MinSearchVolume { get; set; } = 0;
    public double MaxDifficulty { get; set; } = 100;
    public double MaxKeywordDifficulty { get; set; } = 100;
    public ContentCategory? ContentCategory { get; set; }
}

/// <summary>
/// Content category enumeration
/// </summary>
public enum ContentCategory
{
    Movie,
    TvShow,
    Streaming,
    Music,
    Gaming,
    Sports,
    News,
    Technology,
    Lifestyle,
    Travel,
    Food,
    Health,
    Education,
    Business,
    Entertainment,
    Other
}

/// <summary>
/// Request for competitor analysis
/// </summary>
public class CompetitorAnalysisRequest
{
    public List<string> CompetitorUrls { get; set; } = new();
    public string TargetKeyword { get; set; } = string.Empty;
    public int MaxCompetitors { get; set; } = 10;
    public bool AnalyzeContent { get; set; } = true;
    public bool AnalyzeBacklinks { get; set; } = true;
    public bool AnalyzeTechnical { get; set; } = true;
}

/// <summary>
/// Request for keyword trends
/// </summary>
public class KeywordTrendsRequest
{
    public List<string> Keywords { get; set; } = new();
    public string Period { get; set; } = "12m"; // 1m, 3m, 6m, 12m, 24m
    public string? Region { get; set; }
    public bool IncludeSeasonality { get; set; } = true;
    public bool IncludeRelatedTerms { get; set; } = false;
}

/// <summary>
/// Request for long-tail keyword generation
/// </summary>
public class LongTailRequest
{
    public string BaseKeyword { get; set; } = string.Empty;
    public int MaxVariations { get; set; } = 20;
    public List<string> Modifiers { get; set; } = new();
    public string? ContentType { get; set; }
    public bool IncludeQuestions { get; set; } = true;
    public bool IncludeLocal { get; set; } = false;
    public double MinSearchVolume { get; set; } = 0;
}

/// <summary>
/// Request for cloning a template
/// </summary>
public class CloneTemplateRequest
{
    public string NewName { get; set; } = string.Empty;
    public Dictionary<string, object> Modifications { get; set; } = new();
    public bool CopyMetrics { get; set; } = false;
    public bool CopyPages { get; set; } = false;
}

/// <summary>
/// Request for template preview
/// </summary>
public class TemplatePreviewRequest
{
    public Dictionary<string, object> SampleData { get; set; } = new();
    public bool IncludeMetaTags { get; set; } = true;
    public bool IncludeStructuredData { get; set; } = true;
    public string? PreviewSize { get; set; } = "desktop"; // desktop, tablet, mobile
}

