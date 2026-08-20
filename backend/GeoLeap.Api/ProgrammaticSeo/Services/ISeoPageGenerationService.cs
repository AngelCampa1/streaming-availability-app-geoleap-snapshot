using GeoLeap.Api.ProgrammaticSeo.Models;

namespace GeoLeap.Api.ProgrammaticSeo.Services;

/// <summary>
/// Advanced SEO Page Generation Service with batch processing and intelligent optimization
/// </summary>
public interface ISeoPageGenerationService
{
    /// <summary>
    /// Generate a single SEO page from template and data
    /// </summary>
    Task<SeoPage> GeneratePageAsync(PageGenerationRequest request, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Generate multiple pages in batch with progress tracking
    /// </summary>
    Task<BatchGenerationResult> GeneratePagesAsync(BatchGenerationRequest request, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Schedule batch generation as background job
    /// </summary>
    Task<string> ScheduleBatchGenerationAsync(BatchGenerationRequest request, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Get generation job status and progress
    /// </summary>
    Task<GenerationJobStatus> GetGenerationStatusAsync(string jobId, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Cancel running generation job
    /// </summary>
    Task<bool> CancelGenerationAsync(string jobId, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Regenerate existing page with updated data
    /// </summary>
    Task<SeoPage> RegeneratePageAsync(long pageId, Dictionary<string, object>? newData = null, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Bulk regenerate multiple pages
    /// </summary>
    Task<BulkRegenerationResult> RegeneratePagesAsync(IEnumerable<long> pageIds, RegenerationOptions? options = null, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Generate pages from data source (API, database, file)
    /// </summary>
    Task<DataSourceGenerationResult> GenerateFromDataSourceAsync(DataSourceGenerationRequest request, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Validate page generation request
    /// </summary>
    Task<GenerationValidationResult> ValidateGenerationRequestAsync(PageGenerationRequest request, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Preview page generation without saving
    /// </summary>
    Task<PageGenerationPreview> PreviewPageGenerationAsync(PageGenerationRequest request, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Get generation statistics and metrics
    /// </summary>
    Task<GenerationMetrics> GetGenerationMetricsAsync(TimeSpan? period = null, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Optimize page generation settings
    /// </summary>
    Task<GenerationOptimizationResult> OptimizeGenerationSettingsAsync(string templateId, OptimizationCriteria criteria, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Export generated pages in various formats
    /// </summary>
    Task<PageExportResult> ExportPagesAsync(PageExportRequest request, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Import pages from external source
    /// </summary>
    Task<PageImportResult> ImportPagesAsync(PageImportRequest request, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Archive or delete pages in bulk
    /// </summary>
    Task<BulkOperationResult> ArchivePagesAsync(IEnumerable<long> pageIds, bool permanent = false, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Generate sitemap for SEO pages
    /// </summary>
    Task<SitemapGenerationResult> GenerateSitemapAsync(SitemapGenerationRequest request, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Generate schema markup for pages
    /// </summary>
    Task<SchemaMarkupResult> GenerateSchemaMarkupAsync(SchemaGenerationRequest request, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Analyze page generation performance
    /// </summary>
    Task<GenerationPerformanceAnalysis> AnalyzeGenerationPerformanceAsync(string templateId, CancellationToken cancellationToken = default);
}

public class PageGenerationRequest
{
    public int TemplateId { get; set; }
    public Dictionary<string, object> Variables { get; set; } = new();
    public string? Slug { get; set; }
    public string? Title { get; set; }
    public string? MetaDescription { get; set; }
    public IEnumerable<string>? Keywords { get; set; }
    public SeoPageStatus Status { get; set; } = SeoPageStatus.Draft;
    public bool PublishImmediately { get; set; } = false;
    public bool OptimizeForSeo { get; set; } = true;
    public bool GenerateSchemaMarkup { get; set; } = true;
    public bool ValidateQuality { get; set; } = true;
    public string? Category { get; set; }
    public string? Author { get; set; }
    public DateTime? PublishDate { get; set; }
    public PageGenerationOptions? Options { get; set; }
}

public class BatchGenerationRequest
{
    public int TemplateId { get; set; }
    public IEnumerable<Dictionary<string, object>> DataSets { get; set; } = new List<Dictionary<string, object>>();
    public SeoJobPriority Priority { get; set; } = SeoJobPriority.Medium;
    public bool PublishImmediately { get; set; } = false;
    public bool OptimizeForSeo { get; set; } = true;
    public bool GenerateSchemaMarkup { get; set; } = true;
    public bool ValidateQuality { get; set; } = true;
    public string? Category { get; set; }
    public string? Author { get; set; }
    public BatchGenerationOptions? Options { get; set; }
    public string? NotificationEmail { get; set; }
    public int BatchSize { get; set; } = 50;
    public TimeSpan? Delay { get; set; }
}

public class BatchGenerationResult
{
    public string JobId { get; set; } = string.Empty;
    public int TotalPages { get; set; }
    public int SuccessfulPages { get; set; }
    public int FailedPages { get; set; }
    public IEnumerable<SeoPage> GeneratedPages { get; set; } = new List<SeoPage>();
    public IEnumerable<GenerationError> Errors { get; set; } = new List<GenerationError>();
    public TimeSpan Duration { get; set; }
    public BatchGenerationMetrics Metrics { get; set; } = new();
}

public class GenerationJobStatus
{
    public string JobId { get; set; } = string.Empty;
    public SeoJobStatus Status { get; set; }
    public double Progress { get; set; }
    public int TotalItems { get; set; }
    public int ProcessedItems { get; set; }
    public int SuccessfulItems { get; set; }
    public int FailedItems { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public TimeSpan? EstimatedRemaining { get; set; }
    public IEnumerable<string> ErrorMessages { get; set; } = new List<string>();
    public GenerationJobMetrics Metrics { get; set; } = new();
}

public class BulkRegenerationResult
{
    public int TotalPages { get; set; }
    public int RegeneratedPages { get; set; }
    public int SkippedPages { get; set; }
    public int FailedPages { get; set; }
    public IEnumerable<SeoPage> UpdatedPages { get; set; } = new List<SeoPage>();
    public IEnumerable<RegenerationError> Errors { get; set; } = new List<RegenerationError>();
    public TimeSpan Duration { get; set; }
}

public class DataSourceGenerationRequest
{
    public int TemplateId { get; set; }
    public DataSourceConfig DataSource { get; set; } = new();
    public DataMappingConfig DataMapping { get; set; } = new();
    public GenerationFilters? Filters { get; set; }
    public BatchGenerationOptions? Options { get; set; }
    public string? NotificationEmail { get; set; }
}

public class DataSourceGenerationResult
{
    public string JobId { get; set; } = string.Empty;
    public int TotalRecords { get; set; }
    public int ProcessedRecords { get; set; }
    public int GeneratedPages { get; set; }
    public int SkippedRecords { get; set; }
    public IEnumerable<DataProcessingError> Errors { get; set; } = new List<DataProcessingError>();
    public DataSourceMetrics Metrics { get; set; } = new();
}

public class GenerationValidationResult
{
    public bool IsValid { get; set; }
    public IEnumerable<ValidationError> Errors { get; set; } = new List<ValidationError>();
    public IEnumerable<ValidationWarning> Warnings { get; set; } = new List<ValidationWarning>();
    public GenerationComplexityScore Complexity { get; set; } = new();
    public EstimatedResources ResourceEstimate { get; set; } = new();
}

public class PageGenerationPreview
{
    public string PreviewHtml { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string MetaDescription { get; set; } = string.Empty;
    public string Keywords { get; set; } = string.Empty;
    public string? SchemaMarkup { get; set; }
    public string Slug { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public ContentQualityScore QualityScore { get; set; } = new();
    public SeoAnalysisResult SeoAnalysis { get; set; } = new();
    public IEnumerable<PreviewRecommendation> Recommendations { get; set; } = new List<PreviewRecommendation>();
}

public class GenerationMetrics
{
    public int TotalPagesGenerated { get; set; }
    public int PagesGeneratedToday { get; set; }
    public int PagesGeneratedThisWeek { get; set; }
    public int PagesGeneratedThisMonth { get; set; }
    public double AverageGenerationTime { get; set; }
    public double AverageQualityScore { get; set; }
    public double SuccessRate { get; set; }
    public IEnumerable<GenerationTrend> Trends { get; set; } = new List<GenerationTrend>();
    public IEnumerable<TemplateUsageMetric> TemplateUsage { get; set; } = new List<TemplateUsageMetric>();
    public GenerationResourceUsage ResourceUsage { get; set; } = new();
}

public class GenerationOptimizationResult
{
    public int TemplateId { get; set; }
    public GenerationSettings OptimizedSettings { get; set; } = new();
    public IEnumerable<OptimizationRecommendation> Recommendations { get; set; } = new List<OptimizationRecommendation>();
    public double PredictedImprovement { get; set; }
    public OptimizationMetrics Metrics { get; set; } = new();
}

public class PageExportRequest
{
    public IEnumerable<long>? PageIds { get; set; }
    public PageExportFilter? Filter { get; set; }
    public Models.ExportFormat Format { get; set; } = Models.ExportFormat.Json;
    public bool IncludeMetadata { get; set; } = true;
    public bool IncludeContent { get; set; } = true;
    public bool IncludePerformanceData { get; set; } = false;
    public string? FileName { get; set; }
    public CompressionFormat Compression { get; set; } = CompressionFormat.None;
}

public class PageExportResult
{
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public byte[] Data { get; set; } = Array.Empty<byte>();
    public int ExportedPagesCount { get; set; }
    public ExportMetadata Metadata { get; set; } = new();
}

public class PageImportRequest
{
    public string FileName { get; set; } = string.Empty;
    public byte[] Data { get; set; } = Array.Empty<byte>();
    public ImportFormat Format { get; set; } = ImportFormat.Json;
    public bool ValidateBeforeImport { get; set; } = true;
    public bool OverwriteExisting { get; set; } = false;
    public string? DefaultTemplate { get; set; }
    public ImportOptions? Options { get; set; }
}

public class PageImportResult
{
    public int TotalPages { get; set; }
    public int ImportedPages { get; set; }
    public int SkippedPages { get; set; }
    public int FailedPages { get; set; }
    public IEnumerable<SeoPage> ImportedPagesList { get; set; } = new List<SeoPage>();
    public IEnumerable<ImportError> Errors { get; set; } = new List<ImportError>();
    public ImportMetadata Metadata { get; set; } = new();
}

public class BulkOperationResult
{
    public int TotalPages { get; set; }
    public int SuccessfulOperations { get; set; }
    public int FailedOperations { get; set; }
    public IEnumerable<BulkOperationError> Errors { get; set; } = new List<BulkOperationError>();
    public TimeSpan Duration { get; set; }
}

public class SitemapGenerationRequest
{
    public IEnumerable<long>? PageIds { get; set; }
    public SitemapFilter? Filter { get; set; }
    public SitemapFormat Format { get; set; } = SitemapFormat.Xml;
    public bool IncludeImages { get; set; } = true;
    public bool IncludeVideos { get; set; } = false;
    public bool IncludeAlternateLanguages { get; set; } = false;
    public int MaxUrls { get; set; } = 50000;
    public string? BaseUrl { get; set; }
}

public class SitemapGenerationResult
{
    public string SitemapContent { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public int IncludedUrls { get; set; }
    public int ExcludedUrls { get; set; }
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
    public SitemapMetadata Metadata { get; set; } = new();
}

public class SchemaGenerationRequest
{
    public IEnumerable<long> PageIds { get; set; } = new List<long>();
    public string? SchemaType { get; set; }
    public bool ValidateSchema { get; set; } = true;
    public bool MinifyOutput { get; set; } = false;
    public SchemaFormat Format { get; set; } = SchemaFormat.JsonLd;
}

public class SchemaMarkupResult
{
    public Dictionary<string, string> PageSchemas { get; set; } = new();
    public IEnumerable<SchemaValidationError> ValidationErrors { get; set; } = new List<SchemaValidationError>();
    public SchemaStatistics Statistics { get; set; } = new();
}

public class GenerationPerformanceAnalysis
{
    public int TemplateId { get; set; }
    public PerformanceMetrics OverallPerformance { get; set; } = new();
    public IEnumerable<PerformanceTrend> Trends { get; set; } = new List<PerformanceTrend>();
    public IEnumerable<PerformanceBottleneck> Bottlenecks { get; set; } = new List<PerformanceBottleneck>();
    public IEnumerable<PerformanceRecommendation> Recommendations { get; set; } = new List<PerformanceRecommendation>();
    public ResourceUtilizationMetrics ResourceMetrics { get; set; } = new();
}

// Supporting classes and enums
public class PageGenerationOptions
{
    public int MaxRetries { get; set; } = 3;
    public TimeSpan Timeout { get; set; } = TimeSpan.FromMinutes(5);
    public bool SkipDuplicates { get; set; } = true;
    public bool OptimizeImages { get; set; } = true;
    public bool GenerateAltText { get; set; } = true;
    public bool CompressContent { get; set; } = false;
    public QualityThresholds QualityThresholds { get; set; } = new();
}

public class BatchGenerationOptions : PageGenerationOptions
{
    public int ConcurrencyLevel { get; set; } = Environment.ProcessorCount;
    public TimeSpan DelayBetweenBatches { get; set; } = TimeSpan.Zero;
    public bool ContinueOnError { get; set; } = true;
    public bool NotifyOnCompletion { get; set; } = true;
    public bool GenerateProgressReports { get; set; } = true;
    public int ProgressReportInterval { get; set; } = 100; // Pages
}


public class DataSourceConfig
{
    public DataSourceType Type { get; set; } = DataSourceType.Database;
    public string ConnectionString { get; set; } = string.Empty;
    public string? Query { get; set; }
    public string? TableName { get; set; }
    public string? ApiEndpoint { get; set; }
    public Dictionary<string, string>? Headers { get; set; }
    public string? FilePath { get; set; }
    public DataFormat FileFormat { get; set; } = DataFormat.Json;
    public DataSourceCredentials? Credentials { get; set; }
    public int BatchSize { get; set; } = 1000;
    public TimeSpan Timeout { get; set; } = TimeSpan.FromMinutes(30);
}

public class DataMappingConfig
{
    public Dictionary<string, string> FieldMappings { get; set; } = new();
    public Dictionary<string, object> DefaultValues { get; set; } = new();
    public Dictionary<string, string> Transformations { get; set; } = new();
    public IEnumerable<DataValidationRule> ValidationRules { get; set; } = new List<DataValidationRule>();
}

public class GenerationFilters
{
    public int? MinRecords { get; set; }
    public int? MaxRecords { get; set; }
    public Dictionary<string, object>? WhereConditions { get; set; }
    public IEnumerable<string>? ExcludeFields { get; set; }
    public IEnumerable<string>? RequiredFields { get; set; }
    public DateTime? CreatedAfter { get; set; }
    public DateTime? CreatedBefore { get; set; }
}

public class OptimizationCriteria
{
    public double TargetQualityScore { get; set; } = 80.0;
    public double TargetPerformanceScore { get; set; } = 90.0;
    public TimeSpan MaxGenerationTime { get; set; } = TimeSpan.FromMinutes(2);
    public int MinWordCount { get; set; } = 300;
    public int MaxWordCount { get; set; } = 2000;
    public IEnumerable<string>? PriorityKeywords { get; set; }
    public string? OptimizationFocus { get; set; } // "speed", "quality", "seo"
}

public class GenerationComplexityScore
{
    public double Overall { get; set; }
    public double TemplateComplexity { get; set; }
    public double DataComplexity { get; set; }
    public double ProcessingComplexity { get; set; }
    public GenerationComplexityLevel Level { get; set; }
}

public class EstimatedResources
{
    public TimeSpan EstimatedTime { get; set; }
    public int EstimatedMemoryUsage { get; set; } // MB
    public int EstimatedCpuUsage { get; set; } // Percentage
    public int EstimatedDiskSpace { get; set; } // MB
    public double EstimatedCost { get; set; } // USD
}

public class SeoAnalysisResult
{
    public double OverallScore { get; set; }
    public double TitleScore { get; set; }
    public double MetaDescriptionScore { get; set; }
    public double ContentScore { get; set; }
    public double KeywordScore { get; set; }
    public double StructureScore { get; set; }
    public IEnumerable<SeoIssue> Issues { get; set; } = new List<SeoIssue>();
}

public class PreviewRecommendation
{
    public string Type { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public double Priority { get; set; }
    public string? ActionRequired { get; set; }
}

// Additional supporting classes, errors, and metrics would be defined here...

public enum DataSourceType
{
    Database,
    Api,
    File,
    WebScraping,
    RSS,
    GraphQL
}

public enum DataFormat
{
    Json,
    Csv,
    Xml,
    Excel,
    Yaml
}

public enum CompressionFormat
{
    None,
    Zip,
    Gzip
}

public enum SitemapFormat
{
    Xml,
    Text
}

public enum SchemaFormat
{
    JsonLd,
    Microdata,
    RDFa
}

public enum GenerationComplexityLevel
{
    Simple,
    Moderate,
    Complex,
    Expert
}

// Error classes
public class GenerationError
{
    public string PageId { get; set; } = string.Empty;
    public string ErrorCode { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? StackTrace { get; set; }
    public Dictionary<string, object>? Context { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}

public class RegenerationError : GenerationError
{
    public string Reason { get; set; } = string.Empty;
    public bool IsRecoverable { get; set; }
}

public class DataProcessingError
{
    public int RecordIndex { get; set; }
    public string Field { get; set; } = string.Empty;
    public string ErrorType { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public object? OriginalValue { get; set; }
}

public class ImportError
{
    public int LineNumber { get; set; }
    public string Field { get; set; } = string.Empty;
    public string ErrorType { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string? Suggestion { get; set; }
}

public class BulkOperationError
{
    public string PageId { get; set; } = string.Empty;
    public string Operation { get; set; } = string.Empty;
    public string ErrorMessage { get; set; } = string.Empty;
    public bool IsRetryable { get; set; }
}

public class SchemaValidationError
{
    public string PageId { get; set; } = string.Empty;
    public string SchemaType { get; set; } = string.Empty;
    public string Property { get; set; } = string.Empty;
    public string ErrorMessage { get; set; } = string.Empty;
    public string Severity { get; set; } = string.Empty;
}

public class SeoIssue
{
    public string Type { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Severity { get; set; } = string.Empty;
    public string? Recommendation { get; set; }
}

// Metrics classes
public class BatchGenerationMetrics
{
    public double ThroughputPagesPerSecond { get; set; }
    public double AveragePageGenerationTime { get; set; }
    public double AverageQualityScore { get; set; }
    public int PeakMemoryUsage { get; set; }
    public double CpuUtilization { get; set; }
}

public class GenerationJobMetrics
{
    public double CurrentThroughput { get; set; }
    public double AverageGenerationTime { get; set; }
    public int MemoryUsage { get; set; }
    public double CpuUsage { get; set; }
    public int QueueLength { get; set; }
}

public class DataSourceMetrics
{
    public int TotalRecordsRead { get; set; }
    public double DataRetrievalTime { get; set; }
    public double DataProcessingTime { get; set; }
    public int DuplicateRecords { get; set; }
    public int InvalidRecords { get; set; }
}

public class GenerationTrend
{
    public DateTime Date { get; set; }
    public int PagesGenerated { get; set; }
    public double AverageQualityScore { get; set; }
    public double AverageGenerationTime { get; set; }
}

public class TemplateUsageMetric
{
    public int TemplateId { get; set; }
    public string TemplateName { get; set; } = string.Empty;
    public int UsageCount { get; set; }
    public double AveragePerformance { get; set; }
}

public class GenerationResourceUsage
{
    public double AverageMemoryUsage { get; set; }
    public double AverageCpuUsage { get; set; }
    public double AverageDiskIo { get; set; }
    public double AverageNetworkIo { get; set; }
}

public class OptimizationRecommendation
{
    public string Type { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public double Impact { get; set; }
    public string? Implementation { get; set; }
}

public class GenerationSettings
{
    public int ConcurrencyLevel { get; set; }
    public TimeSpan Timeout { get; set; }
    public int BatchSize { get; set; }
    public bool OptimizeForSpeed { get; set; }
    public bool OptimizeForQuality { get; set; }
    public QualityThresholds QualityThresholds { get; set; } = new();
}

public class QualityThresholds
{
    public double MinSeoScore { get; set; } = 70.0;
    public double MinReadabilityScore { get; set; } = 60.0;
    public int MinWordCount { get; set; } = 300;
    public int MaxWordCount { get; set; } = 2000;
    public double MinKeywordDensity { get; set; } = 1.0;
    public double MaxKeywordDensity { get; set; } = 3.0;
}

public class PageExportFilter
{
    public string? Category { get; set; }
    public SeoPageStatus? Status { get; set; }
    public DateTime? CreatedAfter { get; set; }
    public DateTime? CreatedBefore { get; set; }
    public double? MinPerformanceScore { get; set; }
    public string? TemplateId { get; set; }
    public IEnumerable<string>? Keywords { get; set; }
}

public class ImportOptions
{
    public bool ValidateUrls { get; set; } = true;
    public bool CheckDuplicates { get; set; } = true;
    public bool GenerateMissingMetadata { get; set; } = true;
    public bool OptimizeContent { get; set; } = true;
    public string? DefaultCategory { get; set; }
    public string? DefaultAuthor { get; set; }
}

public class ImportMetadata
{
    public DateTime ImportedAt { get; set; } = DateTime.UtcNow;
    public string ImportedBy { get; set; } = string.Empty;
    public string SourceFileName { get; set; } = string.Empty;
    public int OriginalFileSize { get; set; }
    public TimeSpan ProcessingTime { get; set; }
}

public class SitemapFilter
{
    public SeoPageStatus? Status { get; set; }
    public DateTime? ModifiedAfter { get; set; }
    public string? Category { get; set; }
    public bool? IndexableOnly { get; set; }
    public double? MinPriority { get; set; }
}

public class SitemapMetadata
{
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
    public string Generator { get; set; } = "GeoLeap SEO System";
    public int TotalUrls { get; set; }
    public int ImageUrls { get; set; }
    public int VideoUrls { get; set; }
    public string Version { get; set; } = "1.0";
}

public class SchemaStatistics
{
    public int TotalSchemas { get; set; }
    public int ValidSchemas { get; set; }
    public int InvalidSchemas { get; set; }
    public Dictionary<string, int> SchemaTypes { get; set; } = new();
    public int TotalProperties { get; set; }
}

public class PerformanceBottleneck
{
    public string Component { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public double Impact { get; set; }
    public string? Resolution { get; set; }
}

public class ResourceUtilizationMetrics
{
    public double MemoryUtilization { get; set; }
    public double CpuUtilization { get; set; }
    public double DiskUtilization { get; set; }
    public double NetworkUtilization { get; set; }
    public int ActiveConnections { get; set; }
}

public class DataSourceCredentials
{
    public string? Username { get; set; }
    public string? Password { get; set; }
    public string? ApiKey { get; set; }
    public string? Token { get; set; }
    public Dictionary<string, string>? CustomCredentials { get; set; }
}

public class DataValidationRule
{
    public string Field { get; set; } = string.Empty;
    public string Rule { get; set; } = string.Empty;
    public string? ErrorMessage { get; set; }
    public bool IsRequired { get; set; }
}