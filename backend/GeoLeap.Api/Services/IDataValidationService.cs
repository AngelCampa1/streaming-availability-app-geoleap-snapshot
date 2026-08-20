using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service for data validation and quality assessment
/// </summary>
public interface IDataValidationService
{
    /// <summary>
    /// Validates data using registered validation rules
    /// </summary>
    Task<ValidationResult> ValidateAsync<T>(T data, ValidationContext context) where T : class;

    /// <summary>
    /// Calculates data quality score
    /// </summary>
    Task<DataQualityScore> CalculateQualityScoreAsync<T>(T data) where T : class;

    /// <summary>
    /// Enriches incomplete data
    /// </summary>
    Task<EnrichmentResult> EnrichDataAsync<T>(T data) where T : class;

    /// <summary>
    /// Reconciles conflicting data from multiple sources
    /// </summary>
    Task<ReconciliationResult> ReconcileDataAsync<T>(List<T> conflictingData) where T : class;

    /// <summary>
    /// Registers a validation rule for a specific data type
    /// </summary>
    Task RegisterValidationRuleAsync<T>(IValidationRule<T> rule) where T : class;

    /// <summary>
    /// Registers a scoring rule for quality assessment
    /// </summary>
    Task RegisterScoringRuleAsync<T>(IScoringRule<T> rule) where T : class;
}

/// <summary>
/// Rule engine for managing validation rules
/// </summary>
public interface IValidationRuleEngine
{
    /// <summary>
    /// Gets applicable validation rules for a data type
    /// </summary>
    Task<List<IValidationRule<T>>> GetRulesAsync<T>(ValidationContext context) where T : class;

    /// <summary>
    /// Gets scoring rules for quality calculation
    /// </summary>
    Task<List<IScoringRule<T>>> GetScoringRulesAsync<T>() where T : class;

    /// <summary>
    /// Registers a validation rule
    /// </summary>
    Task RegisterRuleAsync<T>(IValidationRule<T> rule) where T : class;

    /// <summary>
    /// Registers a scoring rule
    /// </summary>
    Task RegisterScoringRuleAsync<T>(IScoringRule<T> rule) where T : class;

    /// <summary>
    /// Updates rule configuration
    /// </summary>
    Task UpdateRuleConfigurationAsync(string ruleId, Dictionary<string, object> configuration);

    /// <summary>
    /// Gets rule configuration
    /// </summary>
    Task<ValidationRuleConfiguration?> GetRuleConfigurationAsync(string ruleId);
}

/// <summary>
/// Interface for validation rules
/// </summary>
public interface IValidationRule<T> where T : class
{
    string Id { get; }
    string Name { get; }
    string Description { get; }
    ValidationSeverity Severity { get; }
    
    /// <summary>
    /// Validates the data
    /// </summary>
    Task<ValidationRuleResult> ValidateAsync(T data, ValidationContext context);
    
    /// <summary>
    /// Determines if this rule should be applied in the given context
    /// </summary>
    bool ShouldApply(ValidationContext context);
}

/// <summary>
/// Interface for scoring rules
/// </summary>
public interface IScoringRule<T> where T : class
{
    string Name { get; }
    string Description { get; }
    double Weight { get; }
    
    /// <summary>
    /// Calculates quality score for the data
    /// </summary>
    Task<QualityScoreResult> CalculateScoreAsync(T data);
}

/// <summary>
/// Interface for data enrichment
/// </summary>
public interface IDataEnrichmentService
{
    /// <summary>
    /// Enriches content metadata
    /// </summary>
    Task<EnrichmentResult> EnrichContentMetadataAsync(ContentMetadata data);

    /// <summary>
    /// Enriches streaming availability data
    /// </summary>
    Task<EnrichmentResult> EnrichStreamingAvailabilityAsync(StreamingAvailabilityResponse data);

    /// <summary>
    /// Registers a data enricher
    /// </summary>
    Task RegisterEnricherAsync(IDataEnricher enricher);
}

/// <summary>
/// Interface for data enrichers
/// </summary>
public interface IDataEnricher
{
    /// <summary>
    /// Gets enricher name
    /// </summary>
    string Name { get; }
    
    /// <summary>
    /// Checks if this enricher can handle the given data type
    /// </summary>
    bool CanEnrich<T>() where T : class;
    
    /// <summary>
    /// Enriches the data
    /// </summary>
    Task<bool> EnrichAsync<T>(T data) where T : class;
    
    /// <summary>
    /// Gets enrichment priority (higher values run first)
    /// </summary>
    int Priority { get; }
}

/// <summary>
/// Interface for data reconciliation
/// </summary>
public interface IDataReconciliationService
{
    /// <summary>
    /// Reconciles content metadata from multiple sources
    /// </summary>
    Task<ReconciliationResult> ReconcileContentMetadataAsync(List<ContentMetadata> conflictingData);

    /// <summary>
    /// Reconciles streaming availability from multiple sources
    /// </summary>
    Task<ReconciliationResult> ReconcileStreamingAvailabilityAsync(List<StreamingAvailabilityResponse> conflictingData);

    /// <summary>
    /// Registers a reconciliation strategy
    /// </summary>
    Task RegisterReconciliationStrategyAsync<T>(IReconciliationStrategy<T> strategy) where T : class;
}

/// <summary>
/// Interface for reconciliation strategies
/// </summary>
public interface IReconciliationStrategy<T> where T : class
{
    /// <summary>
    /// Gets strategy name
    /// </summary>
    string Name { get; }
    
    /// <summary>
    /// Checks if this strategy can handle the given data type
    /// </summary>
    bool CanReconcile(List<T> data);
    
    /// <summary>
    /// Reconciles conflicting data
    /// </summary>
    Task<ReconciliationResult> ReconcileAsync(List<T> conflictingData);
    
    /// <summary>
    /// Gets reconciliation priority (higher values run first)
    /// </summary>
    int Priority { get; }
}

/// <summary>
/// Interface for quality metrics collection
/// </summary>
public interface IQualityMetricsCollector
{
    /// <summary>
    /// Records validation metrics
    /// </summary>
    Task RecordValidationAsync(string dataType, bool isValid, double qualityScore, long durationMs, string? correlationId = null);

    /// <summary>
    /// Gets recent metrics for monitoring
    /// </summary>
    Task<List<QualityMetric>> GetRecentMetricsAsync(TimeSpan timeSpan);

    /// <summary>
    /// Forces immediate persistence of queued metrics (for testing)
    /// </summary>
    Task FlushMetricsAsync();

    /// <summary>
    /// Gets quality trends over time
    /// </summary>
    Task<Dictionary<string, List<QualityMetric>>> GetQualityTrendsAsync(TimeSpan timeSpan);

    /// <summary>
    /// Cleans up old metrics
    /// </summary>
    Task CleanupMetricsAsync(TimeSpan retentionPeriod);
}

/// <summary>
/// Interface for alerting service
/// </summary>
public interface IAlertingService
{
    /// <summary>
    /// Sends a quality degradation alert
    /// </summary>
    Task SendQualityAlertAsync(QualityAlert alert);

    /// <summary>
    /// Registers an alert handler
    /// </summary>
    Task RegisterAlertHandlerAsync(IAlertHandler handler);
}

/// <summary>
/// Interface for alert handlers
/// </summary>
public interface IAlertHandler
{
    /// <summary>
    /// Gets handler name
    /// </summary>
    string Name { get; }
    
    /// <summary>
    /// Handles an alert
    /// </summary>
    Task HandleAlertAsync(QualityAlert alert);
    
    /// <summary>
    /// Checks if this handler can handle the alert
    /// </summary>
    bool CanHandle(QualityAlert alert);
}

/// <summary>
/// Interface for data consistency checking
/// </summary>
public interface IDataConsistencyChecker
{
    /// <summary>
    /// Checks data consistency
    /// </summary>
    Task<List<ConsistencyIssue>> CheckConsistencyAsync<T>(T data) where T : class;

    /// <summary>
    /// Checks consistency across multiple data items
    /// </summary>
    Task<List<ConsistencyIssue>> CheckConsistencyAcrossDataAsync<T>(List<T> dataItems) where T : class;
}

/// <summary>
/// Represents a consistency issue
/// </summary>
public class ConsistencyIssue
{
    public string Field { get; set; } = string.Empty;
    public string Issue { get; set; } = string.Empty;
    public string Expected { get; set; } = string.Empty;
    public string Actual { get; set; } = string.Empty;
    public ConsistencyLevel Level { get; set; }
}

/// <summary>
/// Consistency issue severity levels
/// </summary>
public enum ConsistencyLevel
{
    Minor,
    Moderate,
    Major,
    Critical
}