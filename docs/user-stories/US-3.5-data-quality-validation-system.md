# User Story US-3.5: Data Quality & Validation System

**Epic:** Data Integration & API Setup  
**Priority:** P1 (Should-Have)  
**Story Points:** 5  
**Sprint:** 6-7  

## User Story
**As a** system administrator  
**I need** comprehensive data quality monitoring and validation  
**So that** users receive accurate, complete, and reliable content information while maintaining data integrity across all external sources

## Acceptance Criteria
- [ ] Real-time validation of all incoming API data with configurable rules
- [ ] Data completeness scoring and quality metrics for all content
- [ ] Automated detection and flagging of inconsistent or suspicious data
- [ ] Data enrichment and correction mechanisms for incomplete information
- [ ] Quality degradation alerts when data accuracy falls below thresholds
- [ ] Comprehensive audit trail for all data quality decisions
- [ ] Automated data reconciliation between multiple sources
- [ ] Performance impact < 50ms per validation operation

## Definition of Done
- [ ] All API responses pass through validation pipeline before caching/storage
- [ ] Data quality scores are calculated and stored for all content
- [ ] Inconsistent data is automatically flagged and reviewed
- [ ] Data enrichment fills gaps in incomplete records
- [ ] Quality monitoring dashboards show real-time metrics
- [ ] Alerts notify administrators of quality degradation
- [ ] Validation rules are configurable without code deployment
- [ ] Performance benchmarks are met for all validation operations

## Implementation Tasks

### Backend Implementation
- [ ] Design data validation framework and rule engine
- [ ] Create data quality scoring algorithms
- [ ] Implement data completeness assessment
- [ ] Build data enrichment and correction services
- [ ] Add inconsistency detection and reconciliation
- [ ] Create quality monitoring and alerting system
- [ ] Implement audit logging for quality decisions
- [ ] Build configurable validation rule management
- [ ] Add performance optimization for validation pipeline
- [ ] Create data quality reporting and analytics

### Data Validation Framework
```csharp
public interface IDataValidationService
{
    Task<ValidationResult> ValidateAsync<T>(T data, ValidationContext context);
    Task<DataQualityScore> CalculateQualityScoreAsync<T>(T data);
    Task<EnrichmentResult> EnrichDataAsync<T>(T data);
    Task<ReconciliationResult> ReconcileDataAsync<T>(List<T> conflictingData);
    Task RegisterValidationRuleAsync<T>(IValidationRule<T> rule);
}

public class DataValidationService : IDataValidationService
{
    private readonly IValidationRuleEngine _ruleEngine;
    private readonly IDataEnrichmentService _enrichmentService;
    private readonly IDataReconciliationService _reconciliationService;
    private readonly IQualityMetricsCollector _metricsCollector;
    private readonly ILogger<DataValidationService> _logger;

    public async Task<ValidationResult> ValidateAsync<T>(T data, ValidationContext context)
    {
        var stopwatch = Stopwatch.StartNew();
        var validationResult = new ValidationResult { IsValid = true, Warnings = new List<string>() };

        try
        {
            // Get applicable validation rules for this data type
            var rules = await _ruleEngine.GetRulesAsync<T>(context);
            
            foreach (var rule in rules)
            {
                var ruleResult = await rule.ValidateAsync(data, context);
                validationResult.MergeResult(ruleResult);
                
                if (ruleResult.Severity == ValidationSeverity.Critical && !ruleResult.IsValid)
                {
                    validationResult.IsValid = false;
                    break; // Stop on critical failures
                }
            }

            // Calculate data quality score
            validationResult.QualityScore = await CalculateQualityScoreAsync(data);

            // Log validation results
            await _metricsCollector.RecordValidationAsync(
                typeof(T).Name, 
                validationResult.IsValid, 
                validationResult.QualityScore,
                stopwatch.ElapsedMilliseconds
            );

            _logger.LogDebug("Validation completed for {DataType}: Valid={IsValid}, Score={Score}, Duration={Duration}ms",
                typeof(T).Name, validationResult.IsValid, validationResult.QualityScore, stopwatch.ElapsedMilliseconds);

            return validationResult;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Validation failed for {DataType}", typeof(T).Name);
            return new ValidationResult 
            { 
                IsValid = false, 
                Errors = new List<string> { $"Validation failed: {ex.Message}" }
            };
        }
    }

    public async Task<DataQualityScore> CalculateQualityScoreAsync<T>(T data)
    {
        var scoringRules = await _ruleEngine.GetScoringRulesAsync<T>();
        var scores = new Dictionary<string, double>();
        double totalWeight = 0;
        double weightedScore = 0;

        foreach (var rule in scoringRules)
        {
            var score = await rule.CalculateScoreAsync(data);
            scores[rule.Name] = score.Value;
            
            weightedScore += score.Value * rule.Weight;
            totalWeight += rule.Weight;
        }

        var finalScore = totalWeight > 0 ? weightedScore / totalWeight : 0;

        return new DataQualityScore
        {
            OverallScore = finalScore,
            ComponentScores = scores,
            Timestamp = DateTime.UtcNow,
            DataType = typeof(T).Name
        };
    }
}

public class ValidationResult
{
    public bool IsValid { get; set; }
    public DataQualityScore QualityScore { get; set; }
    public List<string> Errors { get; set; } = new();
    public List<string> Warnings { get; set; } = new();
    public Dictionary<string, object> Metadata { get; set; } = new();

    public void MergeResult(ValidationRuleResult ruleResult)
    {
        if (!ruleResult.IsValid && ruleResult.Severity == ValidationSeverity.Critical)
        {
            IsValid = false;
        }

        if (ruleResult.Errors?.Any() == true)
        {
            Errors.AddRange(ruleResult.Errors);
        }

        if (ruleResult.Warnings?.Any() == true)
        {
            Warnings.AddRange(ruleResult.Warnings);
        }
    }
}

public class DataQualityScore
{
    public double OverallScore { get; set; }
    public Dictionary<string, double> ComponentScores { get; set; }
    public DateTime Timestamp { get; set; }
    public string DataType { get; set; }
}
```

### Validation Rule Engine
```csharp
public interface IValidationRuleEngine
{
    Task<List<IValidationRule<T>>> GetRulesAsync<T>(ValidationContext context);
    Task<List<IScoringRule<T>>> GetScoringRulesAsync<T>();
    Task RegisterRuleAsync<T>(IValidationRule<T> rule);
    Task RegisterScoringRuleAsync<T>(IScoringRule<T> rule);
    Task UpdateRuleConfigurationAsync(string ruleId, Dictionary<string, object> configuration);
}

public interface IValidationRule<T>
{
    string Id { get; }
    string Name { get; }
    ValidationSeverity Severity { get; }
    Task<ValidationRuleResult> ValidateAsync(T data, ValidationContext context);
}

public interface IScoringRule<T>
{
    string Name { get; }
    double Weight { get; }
    Task<QualityScoreResult> CalculateScoreAsync(T data);
}

public class ValidationRuleEngine : IValidationRuleEngine
{
    private readonly Dictionary<Type, List<object>> _validationRules = new();
    private readonly Dictionary<Type, List<object>> _scoringRules = new();
    private readonly IOptionsMonitor<ValidationConfiguration> _configuration;

    public async Task<List<IValidationRule<T>>> GetRulesAsync<T>(ValidationContext context)
    {
        var rules = new List<IValidationRule<T>>();
        
        if (_validationRules.TryGetValue(typeof(T), out var typeRules))
        {
            rules.AddRange(typeRules.Cast<IValidationRule<T>>());
        }

        // Filter rules based on context
        return rules.Where(r => ShouldApplyRule(r, context)).ToList();
    }

    private bool ShouldApplyRule<T>(IValidationRule<T> rule, ValidationContext context)
    {
        var config = _configuration.CurrentValue.Rules.GetValueOrDefault(rule.Id);
        if (config?.Enabled == false) return false;

        // Apply context-specific filtering
        if (context.ContentType.HasValue && config?.ApplicableContentTypes?.Any() == true)
        {
            return config.ApplicableContentTypes.Contains(context.ContentType.Value);
        }

        return true;
    }
}

public enum ValidationSeverity
{
    Info,
    Warning,
    Error,
    Critical
}

public class ValidationContext
{
    public string ProviderId { get; set; }
    public ContentType? ContentType { get; set; }
    public string CountryCode { get; set; }
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    public Dictionary<string, object> Properties { get; set; } = new();
}
```

### Content-Specific Validation Rules
```csharp
public class ContentMetadataValidationRule : IValidationRule<ContentMetadata>
{
    public string Id => "content-metadata-validation";
    public string Name => "Content Metadata Validation";
    public ValidationSeverity Severity => ValidationSeverity.Error;

    public async Task<ValidationRuleResult> ValidateAsync(ContentMetadata data, ValidationContext context)
    {
        var result = new ValidationRuleResult { IsValid = true };

        // Required fields validation
        if (string.IsNullOrWhiteSpace(data.Title))
        {
            result.IsValid = false;
            result.Errors.Add("Title is required");
        }

        // Title length validation
        if (data.Title?.Length > 500)
        {
            result.IsValid = false;
            result.Errors.Add("Title exceeds maximum length of 500 characters");
        }

        // Release date validation
        if (data.ReleaseDate.HasValue)
        {
            if (data.ReleaseDate.Value > DateTime.UtcNow.AddYears(5))
            {
                result.Warnings.Add("Release date is more than 5 years in the future");
            }
            
            if (data.ReleaseDate.Value < new DateTime(1900, 1, 1))
            {
                result.Warnings.Add("Release date is before 1900");
            }
        }

        // Rating validation
        if (data.VoteAverage.HasValue && (data.VoteAverage < 0 || data.VoteAverage > 10))
        {
            result.IsValid = false;
            result.Errors.Add("Vote average must be between 0 and 10");
        }

        // Genre validation
        if (data.Genres?.Any() == true)
        {
            var validGenres = await GetValidGenresAsync(data.Type);
            var invalidGenres = data.Genres.Where(g => !validGenres.Contains(g, StringComparer.OrdinalIgnoreCase)).ToList();
            
            if (invalidGenres.Any())
            {
                result.Warnings.Add($"Unknown genres detected: {string.Join(", ", invalidGenres)}");
            }
        }

        return result;
    }

    private async Task<List<string>> GetValidGenresAsync(ContentType contentType)
    {
        // Return predefined list of valid genres for the content type
        return contentType switch
        {
            ContentType.Movie => new List<string> { "Action", "Adventure", "Comedy", "Drama", "Horror", "Romance", "Sci-Fi", "Thriller" },
            ContentType.TvShow => new List<string> { "Action", "Comedy", "Drama", "Documentary", "Reality", "News", "Kids" },
            _ => new List<string>()
        };
    }
}

public class StreamingAvailabilityValidationRule : IValidationRule<StreamingAvailabilityResponse>
{
    public string Id => "streaming-availability-validation";
    public string Name => "Streaming Availability Validation";
    public ValidationSeverity Severity => ValidationSeverity.Warning;

    public async Task<ValidationRuleResult> ValidateAsync(StreamingAvailabilityResponse data, ValidationContext context)
    {
        var result = new ValidationRuleResult { IsValid = true };

        // Validate streaming options
        if (data.StreamingOptions?.Any() == true)
        {
            foreach (var option in data.StreamingOptions)
            {
                // Validate service information
                if (string.IsNullOrWhiteSpace(option.ServiceName))
                {
                    result.Warnings.Add($"Missing service name for option {option.ServiceId}");
                }

                // Validate country code format
                if (!IsValidCountryCode(option.CountryCode))
                {
                    result.Warnings.Add($"Invalid country code: {option.CountryCode}");
                }

                // Validate pricing information
                if (option.Type == StreamingType.Rental || option.Type == StreamingType.Purchase)
                {
                    if (!option.Price.HasValue)
                    {
                        result.Warnings.Add($"Missing price for {option.Type} option on {option.ServiceName}");
                    }
                    else if (option.Price <= 0)
                    {
                        result.Warnings.Add($"Invalid price {option.Price} for {option.Type} option");
                    }
                }

                // Validate streaming URL
                if (!string.IsNullOrWhiteSpace(option.StreamingUrl) && !Uri.IsWellFormedUriString(option.StreamingUrl, UriKind.Absolute))
                {
                    result.Warnings.Add($"Invalid streaming URL: {option.StreamingUrl}");
                }
            }
        }
        else
        {
            result.Warnings.Add("No streaming options available");
        }

        return result;
    }

    private bool IsValidCountryCode(string countryCode)
    {
        return !string.IsNullOrWhiteSpace(countryCode) && 
               countryCode.Length == 2 && 
               countryCode.All(char.IsLetter);
    }
}
```

### Data Quality Scoring Rules
```csharp
public class ContentCompletenessScore : IScoringRule<ContentMetadata>
{
    public string Name => "Completeness";
    public double Weight => 0.3;

    public async Task<QualityScoreResult> CalculateScoreAsync(ContentMetadata data)
    {
        var totalFields = 15; // Total number of important fields
        var completedFields = 0;

        if (!string.IsNullOrWhiteSpace(data.Title)) completedFields++;
        if (!string.IsNullOrWhiteSpace(data.Overview)) completedFields++;
        if (data.ReleaseDate.HasValue) completedFields++;
        if (data.VoteAverage.HasValue) completedFields++;
        if (data.VoteCount > 0) completedFields++;
        if (!string.IsNullOrWhiteSpace(data.PosterPath)) completedFields++;
        if (!string.IsNullOrWhiteSpace(data.BackdropPath)) completedFields++;
        if (data.Genres?.Any() == true) completedFields++;
        if (data.Cast?.Any() == true) completedFields++;
        if (data.Crew?.Any() == true) completedFields++;
        if (data.ProductionCountries?.Any() == true) completedFields++;
        if (data.OriginalLanguages?.Any() == true) completedFields++;
        if (data.Runtime.HasValue) completedFields++;
        if (!string.IsNullOrWhiteSpace(data.Status)) completedFields++;
        if (data.ExternalIds?.Any() == true) completedFields++;

        var score = (double)completedFields / totalFields * 100;
        
        return new QualityScoreResult { Value = score };
    }
}

public class DataFreshnessScore : IScoringRule<StreamingAvailabilityResponse>
{
    public string Name => "Freshness";
    public double Weight => 0.2;

    public async Task<QualityScoreResult> CalculateScoreAsync(StreamingAvailabilityResponse data)
    {
        var hoursSinceUpdate = (DateTime.UtcNow - data.LastUpdated).TotalHours;
        
        var score = hoursSinceUpdate switch
        {
            < 1 => 100,      // Very fresh
            < 6 => 90,       // Fresh
            < 24 => 75,      // Acceptable
            < 72 => 50,      // Somewhat stale
            _ => 25          // Stale
        };

        return new QualityScoreResult { Value = score };
    }
}

public class ConsistencyScore : IScoringRule<ContentMetadata>
{
    public string Name => "Consistency";
    public double Weight => 0.25;
    private readonly IDataConsistencyChecker _consistencyChecker;

    public async Task<QualityScoreResult> CalculateScoreAsync(ContentMetadata data)
    {
        var consistencyIssues = await _consistencyChecker.CheckConsistencyAsync(data);
        
        var totalChecks = 10; // Number of consistency checks
        var passedChecks = totalChecks - consistencyIssues.Count;
        
        var score = (double)passedChecks / totalChecks * 100;
        
        return new QualityScoreResult { Value = score };
    }
}
```

### Data Enrichment Service
```csharp
public interface IDataEnrichmentService
{
    Task<EnrichmentResult> EnrichContentMetadataAsync(ContentMetadata data);
    Task<EnrichmentResult> EnrichStreamingAvailabilityAsync(StreamingAvailabilityResponse data);
}

public class DataEnrichmentService : IDataEnrichmentService
{
    private readonly List<IDataEnricher> _enrichers;
    private readonly ILogger<DataEnrichmentService> _logger;

    public async Task<EnrichmentResult> EnrichContentMetadataAsync(ContentMetadata data)
    {
        var result = new EnrichmentResult { OriginalData = data, EnrichedData = data };
        var enrichedData = (ContentMetadata)data.Clone();

        foreach (var enricher in _enrichers.Where(e => e.CanEnrich<ContentMetadata>()))
        {
            try
            {
                var enrichmentApplied = await enricher.EnrichAsync(enrichedData);
                if (enrichmentApplied)
                {
                    result.EnrichmentSteps.Add(enricher.GetType().Name);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Enrichment failed with {EnricherType}", enricher.GetType().Name);
            }
        }

        result.EnrichedData = enrichedData;
        result.Success = result.EnrichmentSteps.Any();

        return result;
    }
}

public interface IDataEnricher
{
    bool CanEnrich<T>();
    Task<bool> EnrichAsync<T>(T data);
}

public class MissingGenreEnricher : IDataEnricher
{
    private readonly ITmdbClient _tmdbClient;
    private readonly Dictionary<string, List<string>> _titleGenreMap;

    public bool CanEnrich<T>() => typeof(T) == typeof(ContentMetadata);

    public async Task<bool> EnrichAsync<T>(T data)
    {
        if (data is ContentMetadata metadata && (metadata.Genres?.Any() != true))
        {
            // Try to infer genres from title keywords
            var inferredGenres = await InferGenresFromTitleAsync(metadata.Title);
            if (inferredGenres.Any())
            {
                metadata.Genres = inferredGenres;
                return true;
            }
        }

        return false;
    }

    private async Task<List<string>> InferGenresFromTitleAsync(string title)
    {
        var genres = new List<string>();
        var titleLower = title.ToLower();

        // Simple keyword-based genre inference
        if (titleLower.Contains("horror") || titleLower.Contains("nightmare")) genres.Add("Horror");
        if (titleLower.Contains("comedy") || titleLower.Contains("funny")) genres.Add("Comedy");
        if (titleLower.Contains("action") || titleLower.Contains("fighter")) genres.Add("Action");
        if (titleLower.Contains("love") || titleLower.Contains("romance")) genres.Add("Romance");

        return genres;
    }
}
```

### Data Reconciliation Service
```csharp
public interface IDataReconciliationService
{
    Task<ReconciliationResult> ReconcileContentMetadataAsync(List<ContentMetadata> conflictingData);
    Task<ReconciliationResult> ReconcileStreamingAvailabilityAsync(List<StreamingAvailabilityResponse> conflictingData);
}

public class DataReconciliationService : IDataReconciliationService
{
    private readonly ILogger<DataReconciliationService> _logger;

    public async Task<ReconciliationResult> ReconcileContentMetadataAsync(List<ContentMetadata> conflictingData)
    {
        if (!conflictingData.Any()) return new ReconciliationResult { Success = false };

        var reconciled = new ContentMetadata();
        var conflicts = new List<DataConflict>();

        // Use voting or priority-based reconciliation
        reconciled.Title = GetMostFrequentValue(conflictingData.Select(d => d.Title).ToList(), conflicts, "Title");
        reconciled.Overview = GetLongestValue(conflictingData.Select(d => d.Overview).ToList());
        reconciled.ReleaseDate = GetMostRecentValue(conflictingData.Select(d => d.ReleaseDate).ToList());
        reconciled.VoteAverage = GetAverageValue(conflictingData.Select(d => d.VoteAverage).ToList());
        
        // Merge genres from all sources
        reconciled.Genres = conflictingData
            .SelectMany(d => d.Genres ?? new List<string>())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        // Merge cast information
        reconciled.Cast = MergeCastInformation(conflictingData.SelectMany(d => d.Cast ?? new List<CastMember>()).ToList());

        return new ReconciliationResult
        {
            Success = true,
            ReconciledData = reconciled,
            Conflicts = conflicts,
            SourceCount = conflictingData.Count
        };
    }

    private string GetMostFrequentValue(List<string> values, List<DataConflict> conflicts, string fieldName)
    {
        var nonEmptyValues = values.Where(v => !string.IsNullOrWhiteSpace(v)).ToList();
        if (!nonEmptyValues.Any()) return null;

        var groups = nonEmptyValues.GroupBy(v => v, StringComparer.OrdinalIgnoreCase).ToList();
        
        if (groups.Count > 1)
        {
            conflicts.Add(new DataConflict
            {
                FieldName = fieldName,
                ConflictingValues = groups.Select(g => g.Key).ToList(),
                ResolutionStrategy = "MostFrequent"
            });
        }

        return groups.OrderByDescending(g => g.Count()).First().Key;
    }

    private string GetLongestValue(List<string> values)
    {
        return values
            .Where(v => !string.IsNullOrWhiteSpace(v))
            .OrderByDescending(v => v.Length)
            .FirstOrDefault();
    }

    private List<CastMember> MergeCastInformation(List<CastMember> allCast)
    {
        return allCast
            .GroupBy(c => c.Name, StringComparer.OrdinalIgnoreCase)
            .Select(g => g.OrderBy(c => c.Order).First()) // Take the one with the lowest order (most important)
            .OrderBy(c => c.Order)
            .Take(20) // Limit to top 20 cast members
            .ToList();
    }
}

public class DataConflict
{
    public string FieldName { get; set; }
    public List<string> ConflictingValues { get; set; }
    public string ResolutionStrategy { get; set; }
    public string ResolvedValue { get; set; }
}

public class ReconciliationResult
{
    public bool Success { get; set; }
    public object ReconciledData { get; set; }
    public List<DataConflict> Conflicts { get; set; } = new();
    public int SourceCount { get; set; }
}
```

### Quality Monitoring and Alerting
```csharp
public class DataQualityMonitor : BackgroundService
{
    private readonly IDataValidationService _validationService;
    private readonly IQualityMetricsCollector _metricsCollector;
    private readonly IAlertingService _alertingService;
    private readonly IOptionsMonitor<QualityMonitoringSettings> _settings;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await CheckQualityThresholds();
                await GenerateQualityReport();
                
                await Task.Delay(_settings.CurrentValue.CheckInterval, stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during quality monitoring cycle");
                await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);
            }
        }
    }

    private async Task CheckQualityThresholds()
    {
        var metrics = await _metricsCollector.GetRecentMetricsAsync(TimeSpan.FromHours(1));
        
        foreach (var metric in metrics.GroupBy(m => m.DataType))
        {
            var avgQuality = metric.Average(m => m.QualityScore);
            var threshold = _settings.CurrentValue.QualityThresholds.GetValueOrDefault(metric.Key, 70.0);
            
            if (avgQuality < threshold)
            {
                await _alertingService.SendQualityAlertAsync(new QualityAlert
                {
                    DataType = metric.Key,
                    AverageQuality = avgQuality,
                    Threshold = threshold,
                    SampleSize = metric.Count(),
                    Timestamp = DateTime.UtcNow
                });
            }
        }
    }
}
```

## Testing Strategy
- [ ] Unit tests for validation rules and scoring algorithms
- [ ] Integration tests with real API data samples
- [ ] Performance tests for validation pipeline throughput
- [ ] Data quality regression tests
- [ ] Enrichment accuracy tests
- [ ] Reconciliation logic tests
- [ ] Alert trigger tests for quality degradation
- [ ] Configuration change tests for validation rules

## Dependencies
- API Abstraction Layer (US-3.4) for data input
- Data Caching Layer (US-3.3) for storing quality scores
- Logging infrastructure (US-1.3) for audit trails
- Error handling system (US-1.4) for validation failures
- Alerting system for quality notifications

## Success Metrics
- **Validation performance:** < 50ms per validation operation
- **Data quality improvement:** > 15% increase in average quality scores
- **False positive rate:** < 5% for validation alerts
- **Enrichment success rate:** > 60% of incomplete data enriched
- **Reconciliation accuracy:** > 90% successful conflict resolution
- **Alert responsiveness:** Quality issues detected within 15 minutes
- **System impact:** < 10% performance overhead for validation

## Monitoring and Alerting
- Real-time data quality score dashboards
- Validation performance metrics tracking
- Quality degradation alerts and notifications
- Data enrichment success/failure rates
- Reconciliation conflict reports
- Provider-specific quality comparisons