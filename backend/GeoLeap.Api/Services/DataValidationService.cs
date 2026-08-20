using System.Diagnostics;
using Microsoft.Extensions.Options;
using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

/// <summary>
/// Core data validation service implementation
/// </summary>
public class DataValidationService : IDataValidationService
{
    private readonly IValidationRuleEngine _ruleEngine;
    private readonly IDataEnrichmentService _enrichmentService;
    private readonly IDataReconciliationService _reconciliationService;
    private readonly IQualityMetricsCollector _metricsCollector;
    private readonly ILogger<DataValidationService> _logger;
    private readonly IOptionsMonitor<ValidationConfiguration> _configuration;

    public DataValidationService(
        IValidationRuleEngine ruleEngine,
        IDataEnrichmentService enrichmentService,
        IDataReconciliationService reconciliationService,
        IQualityMetricsCollector metricsCollector,
        ILogger<DataValidationService> logger,
        IOptionsMonitor<ValidationConfiguration> configuration)
    {
        _ruleEngine = ruleEngine;
        _enrichmentService = enrichmentService;
        _reconciliationService = reconciliationService;
        _metricsCollector = metricsCollector;
        _logger = logger;
        _configuration = configuration;
    }

    public async Task<ValidationResult> ValidateAsync<T>(T data, ValidationContext context) where T : class
    {
        var stopwatch = Stopwatch.StartNew();
        var validationResult = new ValidationResult 
        { 
            IsValid = true
        };

        try
        {
            _logger.LogDebug("Starting validation for {DataType} with correlation ID {CorrelationId}", 
                typeof(T).Name, context.CorrelationId);

            // Get applicable validation rules for this data type
            var rules = await _ruleEngine.GetRulesAsync<T>(context);
            // validationResult.Performance.RulesExecuted = rules.Count;

            // Use configured timeout
            using var cts = new CancellationTokenSource(_configuration.CurrentValue.GlobalTimeout);
            
            // Execute rules with concurrency limit
            var semaphore = new SemaphoreSlim(_configuration.CurrentValue.MaxConcurrentRules);
            var tasks = rules.Select(async rule =>
            {
                await semaphore.WaitAsync(cts.Token);
                try
                {
                    var ruleStopwatch = Stopwatch.StartNew();
                    var ruleResult = await rule.ValidateAsync(data, context);
                    ruleStopwatch.Stop();
                    
                    // validationResult.Performance.RuleExecutionTimes[rule.Name] = ruleStopwatch.Elapsed;
                    
                    // if (ruleResult.IsValid)
                    //     validationResult.Performance.RulesPassed++;
                    // else
                    //     validationResult.Performance.RulesFailed++;
                    
                    return ruleResult;
                }
                finally
                {
                    semaphore.Release();
                }
            });

            var ruleResults = await Task.WhenAll(tasks);

            // Process results
            foreach (var ruleResult in ruleResults)
            {
                // validationResult.MergeResult(ruleResult);
                
                if (ruleResult.Severity == ValidationSeverity.Critical && !ruleResult.IsValid)
                {
                    validationResult.IsValid = false;
                    _logger.LogWarning("Critical validation failure for {DataType}: {Errors}", 
                        typeof(T).Name, string.Join(", ", ruleResult.Errors));
                }
            }

            // Calculate data quality score
            // validationResult.QualityScore = await CalculateQualityScoreAsync(data);

            stopwatch.Stop();
            // validationResult.Performance.TotalExecutionTime = stopwatch.Elapsed;

            // Record metrics
            await _metricsCollector.RecordValidationAsync(
                typeof(T).Name, 
                validationResult.IsValid, 
                0, // validationResult.QualityScore?.OverallScore ?? 0,
                stopwatch.ElapsedMilliseconds,
                context.CorrelationId
            );

            _logger.LogInformation("Validation completed for {DataType}: Valid={IsValid}, Score={Score}, Duration={Duration}ms, Rules={RulesExecuted}",
                typeof(T).Name, validationResult.IsValid, 0, // validationResult.QualityScore?.OverallScore, 
                stopwatch.ElapsedMilliseconds, rules.Count);

            return validationResult;
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("Validation timeout for {DataType} after {Duration}ms", 
                typeof(T).Name, stopwatch.ElapsedMilliseconds);
            
            return new ValidationResult 
            { 
                IsValid = false, 
                Errors = new List<string> { "Validation operation timed out" }
            };
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

    public async Task<DataQualityScore> CalculateQualityScoreAsync<T>(T data) where T : class
    {
        try
        {
            var scoringRules = await _ruleEngine.GetScoringRulesAsync<T>();
            var scores = new Dictionary<string, double>();
            double totalWeight = 0;
            double weightedScore = 0;

            foreach (var rule in scoringRules)
            {
                try
                {
                    var score = await rule.CalculateScoreAsync(data);
                    scores[rule.Name] = score.Value;
                    
                    weightedScore += score.Value * rule.Weight;
                    totalWeight += rule.Weight;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to calculate score for rule {RuleName}", rule.Name);
                }
            }

            var finalScore = totalWeight > 0 ? weightedScore / totalWeight : 0;

            return new DataQualityScore
            {
                OverallScore = finalScore,
                ComponentScores = scores,
                Timestamp = DateTime.UtcNow,
                DataType = typeof(T).Name,
                CalculationMethod = "WeightedAverage",
                ScoreDetails = new Dictionary<string, object>
                {
                    { "TotalWeight", totalWeight },
                    { "RulesApplied", scoringRules.Count }
                }
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to calculate quality score for {DataType}", typeof(T).Name);
            return new DataQualityScore
            {
                OverallScore = 0,
                DataType = typeof(T).Name,
                ComponentScores = new Dictionary<string, double> { { "Error", 0 } }
            };
        }
    }

    public async Task<EnrichmentResult> EnrichDataAsync<T>(T data) where T : class
    {
        try
        {
            return typeof(T).Name switch
            {
                nameof(ContentMetadata) => await _enrichmentService.EnrichContentMetadataAsync(data as ContentMetadata ?? throw new ArgumentException("Invalid data type")),
                nameof(StreamingAvailabilityResponse) => await _enrichmentService.EnrichStreamingAvailabilityAsync(data as StreamingAvailabilityResponse ?? throw new ArgumentException("Invalid data type")),
                _ => new EnrichmentResult 
                { 
                    Success = false, 
                    Issues = new List<string> { $"No enrichment available for type {typeof(T).Name}" } 
                }
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Data enrichment failed for {DataType}", typeof(T).Name);
            return new EnrichmentResult 
            { 
                Success = false, 
                Issues = new List<string> { $"Enrichment failed: {ex.Message}" } 
            };
        }
    }

    public async Task<ReconciliationResult> ReconcileDataAsync<T>(List<T> conflictingData) where T : class
    {
        try
        {
            return typeof(T).Name switch
            {
                nameof(ContentMetadata) => await _reconciliationService.ReconcileContentMetadataAsync(
                    conflictingData.Cast<ContentMetadata>().ToList()),
                nameof(StreamingAvailabilityResponse) => await _reconciliationService.ReconcileStreamingAvailabilityAsync(
                    conflictingData.Cast<StreamingAvailabilityResponse>().ToList()),
                _ => new ReconciliationResult 
                { 
                    Success = false 
                }
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Data reconciliation failed for {DataType}", typeof(T).Name);
            return new ReconciliationResult 
            { 
                Success = false 
            };
        }
    }

    public async Task RegisterValidationRuleAsync<T>(IValidationRule<T> rule) where T : class
    {
        await _ruleEngine.RegisterRuleAsync(rule);
        _logger.LogInformation("Registered validation rule {RuleName} for {DataType}", rule.Name, typeof(T).Name);
    }

    public async Task RegisterScoringRuleAsync<T>(IScoringRule<T> rule) where T : class
    {
        await _ruleEngine.RegisterScoringRuleAsync(rule);
        _logger.LogInformation("Registered scoring rule {RuleName} for {DataType}", rule.Name, typeof(T).Name);
    }
}

/// <summary>
/// Validation rule engine implementation
/// </summary>
public class ValidationRuleEngine : IValidationRuleEngine
{
    private readonly Dictionary<Type, List<object>> _validationRules = new();
    private readonly Dictionary<Type, List<object>> _scoringRules = new();
    private readonly IOptionsMonitor<ValidationConfiguration> _configuration;
    private readonly ILogger<ValidationRuleEngine> _logger;
    private readonly SemaphoreSlim _semaphore = new(1, 1);

    public ValidationRuleEngine(
        IOptionsMonitor<ValidationConfiguration> configuration,
        ILogger<ValidationRuleEngine> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<List<IValidationRule<T>>> GetRulesAsync<T>(ValidationContext context) where T : class
    {
        await _semaphore.WaitAsync();
        try
        {
            var rules = new List<IValidationRule<T>>();
            
            if (_validationRules.TryGetValue(typeof(T), out var typeRules))
            {
                rules.AddRange(typeRules.Cast<IValidationRule<T>>());
            }

            // Filter rules based on context and configuration
            return rules.Where(r => ShouldApplyRule(r, context)).ToList();
        }
        finally
        {
            _semaphore.Release();
        }
    }

    public async Task<List<IScoringRule<T>>> GetScoringRulesAsync<T>() where T : class
    {
        await _semaphore.WaitAsync();
        try
        {
            var rules = new List<IScoringRule<T>>();
            
            if (_scoringRules.TryGetValue(typeof(T), out var typeRules))
            {
                rules.AddRange(typeRules.Cast<IScoringRule<T>>());
            }

            return rules;
        }
        finally
        {
            _semaphore.Release();
        }
    }

    public async Task RegisterRuleAsync<T>(IValidationRule<T> rule) where T : class
    {
        await _semaphore.WaitAsync();
        try
        {
            var type = typeof(T);
            if (!_validationRules.ContainsKey(type))
            {
                _validationRules[type] = new List<object>();
            }
            
            _validationRules[type].Add(rule);
            _logger.LogInformation("Registered validation rule {RuleId} for type {DataType}", rule.Id, type.Name);
        }
        finally
        {
            _semaphore.Release();
        }
    }

    public async Task RegisterScoringRuleAsync<T>(IScoringRule<T> rule) where T : class
    {
        await _semaphore.WaitAsync();
        try
        {
            var type = typeof(T);
            if (!_scoringRules.ContainsKey(type))
            {
                _scoringRules[type] = new List<object>();
            }
            
            _scoringRules[type].Add(rule);
            _logger.LogInformation("Registered scoring rule {RuleName} for type {DataType}", rule.Name, type.Name);
        }
        finally
        {
            _semaphore.Release();
        }
    }

    public Task UpdateRuleConfigurationAsync(string ruleId, Dictionary<string, object> configuration)
    {
        // Implementation would update rule configuration
        _logger.LogInformation("Updated configuration for rule {RuleId}", ruleId);
        return Task.CompletedTask;
    }

    public Task<ValidationRuleConfiguration?> GetRuleConfigurationAsync(string ruleId)
    {
        var config = _configuration.CurrentValue.Rules.GetValueOrDefault(ruleId);
        return Task.FromResult(config);
    }

    private bool ShouldApplyRule<T>(IValidationRule<T> rule, ValidationContext context) where T : class
    {
        // Check if rule is disabled in configuration
        var config = _configuration.CurrentValue.Rules.GetValueOrDefault(rule.Id);
        if (config?.Enabled == false) return false;

        // Check if rule should apply based on its own logic
        if (!rule.ShouldApply(context)) return false;

        // Apply context-specific filtering
        if (context.ContentType.HasValue && config?.ApplicableContentTypes?.Any() == true)
        {
            return config.ApplicableContentTypes.Contains(context.ContentType.Value);
        }

        // Check provider-specific rules
        if (!string.IsNullOrEmpty(context.ProviderId) && config?.ApplicableProviders?.Any() == true)
        {
            return config.ApplicableProviders.Contains(context.ProviderId);
        }

        return true;
    }
}