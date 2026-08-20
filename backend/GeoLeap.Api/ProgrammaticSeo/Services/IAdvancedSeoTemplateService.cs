using GeoLeap.Api.ProgrammaticSeo.Models;

namespace GeoLeap.Api.ProgrammaticSeo.Services;

/// <summary>
/// Advanced SEO Template Management Service with intelligent variable injection and optimization
/// </summary>
public interface IAdvancedSeoTemplateService
{
    /// <summary>
    /// Create a new SEO template with validation and optimization
    /// </summary>
    Task<SeoTemplate> CreateTemplateAsync(CreateTemplateRequest request, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Update existing template with version control
    /// </summary>
    Task<SeoTemplate> UpdateTemplateAsync(string templateId, UpdateTemplateRequest request, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Get template with usage statistics and performance metrics
    /// </summary>
    Task<TemplateWithMetrics> GetTemplateWithMetricsAsync(string templateId, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Get all templates with filtering and pagination
    /// </summary>
    Task<PaginatedResult<SeoTemplate>> GetTemplatesAsync(TemplateFilter filter, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Clone an existing template with modifications
    /// </summary>
    Task<SeoTemplate> CloneTemplateAsync(string templateId, string newName, Dictionary<string, object>? modifications = null, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Validate template syntax and variable usage
    /// </summary>
    Task<TemplateValidationResult> ValidateTemplateAsync(string templateContent, IEnumerable<TemplateVariable> variables, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Preview template output with sample data
    /// </summary>
    Task<TemplatePreview> PreviewTemplateAsync(string templateId, Dictionary<string, object> sampleData, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Optimize template for better SEO performance
    /// </summary>
    Task<TemplateOptimizationResult> OptimizeTemplateAsync(string templateId, OptimizationSettings settings, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Analyze template performance and generate insights
    /// </summary>
    Task<TemplatePerformanceAnalysis> AnalyzeTemplatePerformanceAsync(string templateId, TimeSpan period, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Generate template variations for A/B testing
    /// </summary>
    Task<IEnumerable<TemplateVariation>> GenerateTemplateVariationsAsync(string templateId, int variationCount = 3, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Process template with dynamic variable injection
    /// </summary>
    Task<ProcessedTemplateResult> ProcessTemplateAsync(string templateId, Dictionary<string, object> variables, ProcessingOptions? options = null, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Batch process multiple data sets with the same template
    /// </summary>
    Task<IEnumerable<ProcessedTemplateResult>> BatchProcessTemplateAsync(string templateId, IEnumerable<Dictionary<string, object>> dataSets, ProcessingOptions? options = null, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Import template from external source
    /// </summary>
    Task<SeoTemplate> ImportTemplateAsync(TemplateImportRequest request, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Export template with all associated data
    /// </summary>
    Task<TemplateExportResult> ExportTemplateAsync(string templateId, ExportFormat format, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Archive or delete template
    /// </summary>
    Task<bool> ArchiveTemplateAsync(string templateId, bool permanent = false, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Get template usage statistics
    /// </summary>
    Task<TemplateUsageStats> GetTemplateUsageStatsAsync(string templateId, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Get recommendations for template improvements
    /// </summary>
    Task<IEnumerable<TemplateRecommendation>> GetTemplateRecommendationsAsync(string templateId, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Generate meta templates based on content patterns
    /// </summary>
    Task<IEnumerable<SeoTemplate>> GenerateMetaTemplatesAsync(MetaTemplateRequest request, CancellationToken cancellationToken = default);
}

public class CreateTemplateRequest
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string Category { get; set; } = string.Empty;
    public string Template { get; set; } = string.Empty;
    public IEnumerable<TemplateVariable> Variables { get; set; } = new List<TemplateVariable>();
    public TemplateSeoSettings SeoSettings { get; set; } = new();
    public bool AutoOptimization { get; set; } = false;
    public TemplateMetadata? Metadata { get; set; }
}

public class UpdateTemplateRequest
{
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? Category { get; set; }
    public string? Template { get; set; }
    public IEnumerable<TemplateVariable>? Variables { get; set; }
    public TemplateSeoSettings? SeoSettings { get; set; }
    public bool? AutoOptimization { get; set; }
    public bool? IsActive { get; set; }
    public TemplateMetadata? Metadata { get; set; }
}

public class TemplateWithMetrics
{
    public SeoTemplate Template { get; set; } = new();
    public TemplateMetrics Metrics { get; set; } = new();
    public IEnumerable<TemplateRecommendation> Recommendations { get; set; } = new List<TemplateRecommendation>();
}

public class TemplateFilter
{
    public string? Search { get; set; }
    public string? Category { get; set; }
    public bool? IsActive { get; set; }
    public DateTime? CreatedAfter { get; set; }
    public DateTime? CreatedBefore { get; set; }
    public double? MinPerformanceScore { get; set; }
    public int? MinUsageCount { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public string SortBy { get; set; } = "CreatedAt";
    public string SortOrder { get; set; } = "desc";
}

public class TemplateValidationResult
{
    public bool IsValid { get; set; }
    public IEnumerable<ValidationError> Errors { get; set; } = new List<ValidationError>();
    public IEnumerable<ValidationWarning> Warnings { get; set; } = new List<ValidationWarning>();
    public TemplateComplexityScore Complexity { get; set; } = new();
    public IEnumerable<string> UsedVariables { get; set; } = new List<string>();
    public IEnumerable<string> UnusedVariables { get; set; } = new List<string>();
}

public class TemplatePreview
{
    public string RenderedContent { get; set; } = string.Empty;
    public string RenderedTitle { get; set; } = string.Empty;
    public string RenderedMetaDescription { get; set; } = string.Empty;
    public string RenderedKeywords { get; set; } = string.Empty;
    public string? RenderedSchemaMarkup { get; set; }
    public TemplatePreviewMetrics Metrics { get; set; } = new();
    public IEnumerable<PreviewIssue> Issues { get; set; } = new List<PreviewIssue>();
}

public class TemplateOptimizationResult
{
    public string OptimizedTemplate { get; set; } = string.Empty;
    public TemplateSeoSettings OptimizedSeoSettings { get; set; } = new();
    public IEnumerable<OptimizationChange> Changes { get; set; } = new List<OptimizationChange>();
    public double PerformanceImprovement { get; set; } = 0.0;
    public TemplateOptimizationMetrics Metrics { get; set; } = new();
}

public class TemplatePerformanceAnalysis
{
    public string TemplateId { get; set; } = string.Empty;
    public TimeSpan AnalysisPeriod { get; set; }
    public PerformanceMetrics OverallMetrics { get; set; } = new();
    public IEnumerable<PerformanceTrend> Trends { get; set; } = new List<PerformanceTrend>();
    public IEnumerable<PerformanceInsight> Insights { get; set; } = new List<PerformanceInsight>();
    public CompetitiveComparison? CompetitiveData { get; set; }
    public IEnumerable<PerformanceRecommendation> Recommendations { get; set; } = new List<PerformanceRecommendation>();
}

public class TemplateVariation
{
    public string Id { get; set; } = Guid.NewGuid().ToString();
    public string Name { get; set; } = string.Empty;
    public string VariationType { get; set; } = string.Empty;
    public string ModifiedTemplate { get; set; } = string.Empty;
    public TemplateSeoSettings ModifiedSeoSettings { get; set; } = new();
    public IEnumerable<VariationChange> Changes { get; set; } = new List<VariationChange>();
    public double PredictedPerformanceImprovement { get; set; } = 0.0;
}

public class ProcessedTemplateResult
{
    public string Content { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string MetaDescription { get; set; } = string.Empty;
    public string Keywords { get; set; } = string.Empty;
    public string? SchemaMarkup { get; set; }
    public ProcessingMetadata Metadata { get; set; } = new();
    public IEnumerable<ProcessingWarning> Warnings { get; set; } = new List<ProcessingWarning>();
    public ContentQualityScore QualityScore { get; set; } = new();
}

public class ProcessingOptions
{
    public bool ValidateOutput { get; set; } = true;
    public bool OptimizeForSeo { get; set; } = true;
    public bool GenerateSchemaMarkup { get; set; } = true;
    public bool CheckContentQuality { get; set; } = true;
    public string? TargetAudience { get; set; }
    public IEnumerable<string>? TargetKeywords { get; set; }
    public int? MinWordCount { get; set; }
    public int? MaxWordCount { get; set; }
    public string? ContentTone { get; set; }
}

public class TemplateImportRequest
{
    public string Name { get; set; } = string.Empty;
    public string Source { get; set; } = string.Empty; // file, url, text
    public string Content { get; set; } = string.Empty;
    public string? Category { get; set; }
    public ImportFormat Format { get; set; } = ImportFormat.Html;
    public bool AutoDetectVariables { get; set; } = true;
    public bool GenerateSeoSettings { get; set; } = true;
}

public class TemplateExportResult
{
    public string Content { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public ExportMetadata Metadata { get; set; } = new();
}

public class TemplateUsageStats
{
    public string TemplateId { get; set; } = string.Empty;
    public int TotalUsages { get; set; } = 0;
    public int PagesGenerated { get; set; } = 0;
    public double AveragePerformanceScore { get; set; } = 0.0;
    public DateTime? LastUsed { get; set; }
    public IEnumerable<UsageTrend> UsageTrends { get; set; } = new List<UsageTrend>();
    public IEnumerable<TopVariable> TopVariables { get; set; } = new List<TopVariable>();
}

public class TemplateRecommendation
{
    public string Type { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public double Priority { get; set; } = 0.0;
    public double PotentialImpact { get; set; } = 0.0;
    public string? ActionRequired { get; set; }
    public Dictionary<string, object> Metadata { get; set; } = new();
}

public class MetaTemplateRequest
{
    public string ContentType { get; set; } = string.Empty;
    public IEnumerable<string> SampleContent { get; set; } = new List<string>();
    public IEnumerable<string> TargetKeywords { get; set; } = new List<string>();
    public string? Category { get; set; }
    public int TemplateCount { get; set; } = 3;
    public TemplateComplexity Complexity { get; set; } = TemplateComplexity.Medium;
}

// Supporting classes
public class TemplateMetadata
{
    public string? Author { get; set; }
    public string? Version { get; set; }
    public IEnumerable<string>? Tags { get; set; }
    public Dictionary<string, object>? CustomFields { get; set; }
}

public class TemplateMetrics
{
    public double PerformanceScore { get; set; } = 0.0;
    public double SeoScore { get; set; } = 0.0;
    public int TotalPagesGenerated { get; set; } = 0;
    public double AveragePagePerformance { get; set; } = 0.0;
    public double ConversionRate { get; set; } = 0.0;
    public DateTime? LastPerformanceUpdate { get; set; }
}

public class ValidationError
{
    public string Code { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public int? LineNumber { get; set; }
    public int? ColumnNumber { get; set; }
    public string Severity { get; set; } = "Error";
}

public class ValidationWarning
{
    public string Code { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Recommendation { get; set; } = string.Empty;
}

public class TemplateComplexityScore
{
    public double Overall { get; set; } = 0.0;
    public double VariableComplexity { get; set; } = 0.0;
    public double ConditionalLogicComplexity { get; set; } = 0.0;
    public double ContentComplexity { get; set; } = 0.0;
    public TemplateComplexity Level { get; set; } = TemplateComplexity.Low;
}

public class TemplatePreviewMetrics
{
    public int WordCount { get; set; } = 0;
    public double ReadabilityScore { get; set; } = 0.0;
    public double SeoScore { get; set; } = 0.0;
    public int HeadingCount { get; set; } = 0;
    public int LinkCount { get; set; } = 0;
    public double KeywordDensity { get; set; } = 0.0;
}

public class PreviewIssue
{
    public string Type { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Severity { get; set; } = string.Empty;
    public string? Suggestion { get; set; }
}

public class OptimizationChange
{
    public string Type { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? OldValue { get; set; }
    public string? NewValue { get; set; }
    public double Impact { get; set; } = 0.0;
}

public class TemplateOptimizationMetrics
{
    public double SeoScoreImprovement { get; set; } = 0.0;
    public double ReadabilityImprovement { get; set; } = 0.0;
    public double PerformanceImprovement { get; set; } = 0.0;
    public int OptimizationsApplied { get; set; } = 0;
}

public class PerformanceMetrics
{
    public double AverageViews { get; set; } = 0.0;
    public double AverageClicks { get; set; } = 0.0;
    public double AverageImpressions { get; set; } = 0.0;
    public double AverageClickThroughRate { get; set; } = 0.0;
    public double AveragePosition { get; set; } = 0.0;
    public double AverageBounceRate { get; set; } = 0.0;
    public double AverageTimeOnPage { get; set; } = 0.0;
}

public class PerformanceTrend
{
    public string Metric { get; set; } = string.Empty;
    public IEnumerable<AdvancedDataPoint> Data { get; set; } = new List<AdvancedDataPoint>();
    public double TrendDirection { get; set; } = 0.0; // Positive = improving, Negative = declining
    public double TrendStrength { get; set; } = 0.0; // 0-1 scale
}

public class AdvancedDataPoint
{
    public DateTime Date { get; set; }
    public double Value { get; set; }
    public Dictionary<string, object>? Metadata { get; set; }
}

public class PerformanceInsight
{
    public string Type { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public double Confidence { get; set; } = 0.0;
    public string? ActionRequired { get; set; }
}

public class VariationChange
{
    public string Component { get; set; } = string.Empty;
    public string ChangeType { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public double ExpectedImpact { get; set; } = 0.0;
}

public class ProcessingMetadata
{
    public DateTime ProcessedAt { get; set; } = DateTime.UtcNow;
    public TimeSpan ProcessingTime { get; set; }
    public Dictionary<string, object> Variables { get; set; } = new();
    public string ProcessingVersion { get; set; } = "1.0";
}

public class ProcessingWarning
{
    public string Type { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? Suggestion { get; set; }
}

public enum ImportFormat
{
    Html,
    Markdown,
    Text,
    Json
}

public enum ExportFormat
{
    Html,
    Markdown,
    Json,
    Zip
}

public enum TemplateComplexity
{
    Low,
    Medium,
    High,
    Expert
}

public class ExportMetadata
{
    public DateTime ExportedAt { get; set; } = DateTime.UtcNow;
    public string ExportedBy { get; set; } = string.Empty;
    public string Version { get; set; } = string.Empty;
    public int FileSize { get; set; } = 0;
}

public class UsageTrend
{
    public DateTime Date { get; set; }
    public int UsageCount { get; set; }
    public double PerformanceScore { get; set; }
}

public class TopVariable
{
    public string Name { get; set; } = string.Empty;
    public int UsageCount { get; set; }
    public double PerformanceImpact { get; set; }
}

public class CompetitiveComparison
{
    public double RelativePerformance { get; set; } = 0.0;
    public IEnumerable<CompetitorMetric> CompetitorMetrics { get; set; } = new List<CompetitorMetric>();
}

public class CompetitorMetric
{
    public string CompetitorName { get; set; } = string.Empty;
    public double PerformanceScore { get; set; }
    public Dictionary<string, double> Metrics { get; set; } = new();
}

public class PerformanceRecommendation
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public double Priority { get; set; } = 0.0;
    public double EstimatedImprovement { get; set; } = 0.0;
    public string Category { get; set; } = string.Empty;
}

public class PaginatedResult<T>
{
    public IEnumerable<T> Items { get; set; } = new List<T>();
    public int TotalCount { get; set; } = 0;
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public int TotalPages => (int)Math.Ceiling((double)TotalCount / PageSize);
    public bool HasNextPage => Page < TotalPages;
    public bool HasPreviousPage => Page > 1;
}