using System.Collections.Concurrent;
using System.Diagnostics;
using Microsoft.Extensions.Logging;

namespace GeoLeap.Api.Tests.Infrastructure;

/// <summary>
/// Test Performance Monitor implementing US82 performance monitoring patterns
/// Provides comprehensive real-time performance monitoring and alerting for test execution
/// </summary>
public sealed class TestPerformanceMonitor : IAsyncDisposable
{
    private readonly ConcurrentDictionary<string, PerformanceMetric> _metrics;
    private readonly ConcurrentQueue<PerformanceEvent> _eventHistory;
    private readonly Timer _monitoringTimer;
    private readonly Timer _alertingTimer;
    private readonly ILogger<TestPerformanceMonitor>? _logger;
    private readonly PerformanceThresholds _thresholds;
    private readonly AlertingSystem _alertingSystem;
    private bool _disposed = false;

    // Monitoring statistics
    private long _totalMetricsCollected = 0;
    private long _totalAlertsTriggered = 0;
    private readonly Stopwatch _sessionStopwatch = Stopwatch.StartNew();

    public TestPerformanceMonitor(ILogger<TestPerformanceMonitor>? logger = null)
    {
        _logger = logger;
        _metrics = new ConcurrentDictionary<string, PerformanceMetric>();
        _eventHistory = new ConcurrentQueue<PerformanceEvent>();
        _thresholds = new PerformanceThresholds();
        _alertingSystem = new AlertingSystem(_logger);
        
        // Start monitoring timers
        _monitoringTimer = new Timer(CollectMetricsAsync, null, TimeSpan.FromSeconds(1), TimeSpan.FromSeconds(5));
        _alertingTimer = new Timer(CheckAlertsAsync, null, TimeSpan.FromSeconds(10), TimeSpan.FromSeconds(30));
        
        _logger?.LogInformation("📊 PERFORMANCE MONITOR: Initialized with {MetricTypes} metric types", 
            Enum.GetValues<PerformanceMetricType>().Length);
    }

    /// <summary>
    /// Record performance metric for monitoring
    /// </summary>
    public void RecordMetric(string name, double value, PerformanceMetricType type, Dictionary<string, object>? metadata = null)
    {
        var metricKey = $"{type}:{name}";
        var timestamp = DateTime.UtcNow;
        
        var metric = _metrics.AddOrUpdate(metricKey, 
            _ => new PerformanceMetric(name, type, value, timestamp),
            (_, existing) => existing.UpdateValue(value, timestamp));
        
        // Add to event history
        _eventHistory.Enqueue(new PerformanceEvent
        {
            Timestamp = timestamp,
            MetricName = name,
            MetricType = type,
            Value = value,
            Metadata = metadata ?? new Dictionary<string, object>()
        });
        
        // Limit event history size
        while (_eventHistory.Count > 10000)
        {
            _eventHistory.TryDequeue(out _);
        }
        
        Interlocked.Increment(ref _totalMetricsCollected);
        
        // Check for immediate alerts
        CheckMetricThreshold(metric);
        
        _logger?.LogDebug("📈 METRIC: {MetricType}:{Name} = {Value}", type, name, value);
    }

    /// <summary>
    /// Record test execution performance
    /// </summary>
    public void RecordTestExecution(string testName, TimeSpan duration, bool success, long memoryUsed)
    {
        RecordMetric($"test.{testName}.duration", duration.TotalMilliseconds, PerformanceMetricType.Duration);
        RecordMetric($"test.{testName}.memory", memoryUsed, PerformanceMetricType.Memory);
        RecordMetric("test.execution.rate", 1, PerformanceMetricType.Rate);
        
        if (success)
        {
            RecordMetric("test.success.rate", 1, PerformanceMetricType.Rate);
        }
        else
        {
            RecordMetric("test.failure.rate", 1, PerformanceMetricType.Rate);
        }
    }

    /// <summary>
    /// Get optimization metrics for performance analysis
    /// </summary>
    public async Task<OptimizationMetrics> GetOptimizationMetricsAsync()
    {
        var currentMetrics = _metrics.Values.ToArray();
        
        var memoryOptimizations = currentMetrics
            .Where(m => m.Name.Contains("memory.optimization"))
            .ToArray();
        
        var timeoutMetrics = currentMetrics
            .Where(m => m.Name.Contains("timeout"))
            .ToArray();
        
        var resourceMetrics = currentMetrics
            .Where(m => m.Type == PerformanceMetricType.Resource)
            .ToArray();
        
        await Task.CompletedTask;
        
        return new OptimizationMetrics
        {
            MemoryOptimizationRatio = CalculateOptimizationRatio(memoryOptimizations),
            TimeoutPreventionRate = CalculateTimeoutPreventionRate(timeoutMetrics),
            ResourcePoolEfficiency = CalculateResourceEfficiency(resourceMetrics),
            OptimizationActionsApplied = (int)memoryOptimizations.Sum(m => m.TotalSamples)
        };
    }

    /// <summary>
    /// Get optimization summary for performance analysis
    /// </summary>
    public async Task<OptimizationSummary> GetOptimizationSummaryAsync()
    {
        var metrics = await GetOptimizationMetricsAsync();
        
        return new OptimizationSummary
        {
            OverallEfficiencyGain = (metrics.MemoryOptimizationRatio + metrics.TimeoutPreventionRate + metrics.ResourcePoolEfficiency) / 3.0,
            AppliedOptimizations = new List<string>
            {
                $"Memory optimization ratio: {metrics.MemoryOptimizationRatio:P1}",
                $"Timeout prevention rate: {metrics.TimeoutPreventionRate:P1}",
                $"Resource pool efficiency: {metrics.ResourcePoolEfficiency:P1}"
            },
            RecommendedImprovements = new List<string>
            {
                metrics.MemoryOptimizationRatio < 0.8 ? "Consider more aggressive memory optimization" : null,
                metrics.TimeoutPreventionRate < 0.9 ? "Review timeout configurations" : null,
                metrics.ResourcePoolEfficiency < 0.7 ? "Optimize resource pool settings" : null
            }.Where(x => x != null).ToList()
        };
    }

    private void CheckMetricThreshold(PerformanceMetric metric)
    {
        var threshold = _thresholds.GetThreshold(metric.Type, metric.Name);
        if (threshold != null && metric.CurrentValue > threshold.CriticalValue)
        {
            var alert = new PerformanceAlert
            {
                Timestamp = DateTime.UtcNow,
                MetricName = metric.Name,
                MetricType = metric.Type,
                CurrentValue = metric.CurrentValue,
                ThresholdValue = threshold.CriticalValue,
                Severity = AlertSeverity.Critical,
                Message = $"{metric.Type}:{metric.Name} exceeded critical threshold: {metric.CurrentValue} > {threshold.CriticalValue}"
            };
            
            _alertingSystem.TriggerAlert(alert);
            Interlocked.Increment(ref _totalAlertsTriggered);
        }
    }

    private double CalculateOptimizationRatio(PerformanceMetric[] metrics)
    {
        if (metrics.Length == 0) return 1.0;
        
        var optimizationEvents = metrics.Where(m => m.Name.Contains("optimization")).ToArray();
        return optimizationEvents.Length > 0 ? optimizationEvents.Average(m => m.CurrentValue) / 100.0 : 1.0;
    }

    private double CalculateTimeoutPreventionRate(PerformanceMetric[] metrics)
    {
        var preventedMetrics = metrics.Where(m => m.Name.Contains("prevented")).ToArray();
        var occurredMetrics = metrics.Where(m => m.Name.Contains("occurred")).ToArray();
        
        var totalPrevented = preventedMetrics.Sum(m => m.TotalSamples);
        var totalOccurred = occurredMetrics.Sum(m => m.TotalSamples);
        var total = totalPrevented + totalOccurred;
        
        return total > 0 ? (double)totalPrevented / total : 1.0;
    }

    private double CalculateResourceEfficiency(PerformanceMetric[] metrics)
    {
        if (metrics.Length == 0) return 1.0;
        
        // Calculate based on resource utilization vs allocation
        return metrics.Average(m => Math.Min(1.0, m.CurrentValue / 100.0));
    }

    private async void CollectMetricsAsync(object? state)
    {
        try
        {
            // System metrics
            var currentMemory = GC.GetTotalMemory(false);
            RecordMetric("system.memory.usage", currentMemory, PerformanceMetricType.Memory);
            
            // Performance metrics
            var activeMetrics = _metrics.Count;
            RecordMetric("system.metrics.active", activeMetrics, PerformanceMetricType.Resource);
            
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "❌ METRICS: Error during metric collection");
        }
        
        await Task.CompletedTask;
    }

    private async void CheckAlertsAsync(object? state)
    {
        try
        {
            await _alertingSystem.ProcessPendingAlertsAsync();
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "❌ ALERTS: Error during alert processing");
        }
    }

    public async ValueTask DisposeAsync()
    {
        if (_disposed)
            return;

        _disposed = true;

        try
        {
            _logger?.LogInformation("🧹 DISPOSAL: Disposing TestPerformanceMonitor");
            
            _monitoringTimer?.Dispose();
            _alertingTimer?.Dispose();
            
            await _alertingSystem.DisposeAsync();
            
            _logger?.LogInformation("✅ DISPOSAL: TestPerformanceMonitor disposed - Collected {TotalMetrics} metrics, Triggered {TotalAlerts} alerts", 
                _totalMetricsCollected, _totalAlertsTriggered);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "❌ DISPOSAL: Error during TestPerformanceMonitor disposal");
        }
    }
}

/// <summary>
/// Performance metric tracking
/// </summary>
public class PerformanceMetric
{
    public string Name { get; }
    public PerformanceMetricType Type { get; }
    public double CurrentValue { get; private set; }
    public double MinValue { get; private set; }
    public double MaxValue { get; private set; }
    public double AverageValue { get; private set; }
    public long TotalSamples { get; private set; }
    public DateTime LastUpdated { get; private set; }
    
    private double _totalSum;

    public PerformanceMetric(string name, PerformanceMetricType type, double initialValue, DateTime timestamp)
    {
        Name = name;
        Type = type;
        CurrentValue = initialValue;
        MinValue = initialValue;
        MaxValue = initialValue;
        AverageValue = initialValue;
        TotalSamples = 1;
        LastUpdated = timestamp;
        _totalSum = initialValue;
    }

    public PerformanceMetric UpdateValue(double value, DateTime timestamp)
    {
        CurrentValue = value;
        MinValue = Math.Min(MinValue, value);
        MaxValue = Math.Max(MaxValue, value);
        TotalSamples++;
        _totalSum += value;
        AverageValue = _totalSum / TotalSamples;
        LastUpdated = timestamp;
        
        return this;
    }
}

/// <summary>
/// Performance metric types
/// </summary>
public enum PerformanceMetricType
{
    Duration,
    Memory,
    Throughput,
    Rate,
    Resource,
    Count
}

/// <summary>
/// Performance event for history tracking
/// </summary>
public class PerformanceEvent
{
    public DateTime Timestamp { get; set; }
    public string MetricName { get; set; } = string.Empty;
    public PerformanceMetricType MetricType { get; set; }
    public double Value { get; set; }
    public Dictionary<string, object> Metadata { get; set; } = new();
}

/// <summary>
/// Performance alert
/// </summary>
public class PerformanceAlert
{
    public DateTime Timestamp { get; set; }
    public string MetricName { get; set; } = string.Empty;
    public PerformanceMetricType MetricType { get; set; }
    public double CurrentValue { get; set; }
    public double ThresholdValue { get; set; }
    public AlertSeverity Severity { get; set; }
    public string Message { get; set; } = string.Empty;
}

/// <summary>
/// Alert severity levels
/// </summary>
public enum AlertSeverity
{
    Info,
    Warning,
    Critical
}

/// <summary>
/// Performance thresholds configuration
/// </summary>
public class PerformanceThresholds
{
    public PerformanceThreshold Memory { get; set; } = new() { WarningValue = 512 * 1024 * 1024, CriticalValue = 1024 * 1024 * 1024 }; // 512MB/1GB
    public PerformanceThreshold Duration { get; set; } = new() { WarningValue = 30000, CriticalValue = 60000 }; // 30s/60s
    public PerformanceThreshold Throughput { get; set; } = new() { WarningValue = 5, CriticalValue = 1 }; // items/second
    public PerformanceThreshold Rate { get; set; } = new() { WarningValue = 0.8, CriticalValue = 0.5 }; // success rate
    
    public PerformanceThreshold? GetThreshold(PerformanceMetricType type, string metricName)
    {
        return type switch
        {
            PerformanceMetricType.Memory => Memory,
            PerformanceMetricType.Duration => Duration,
            PerformanceMetricType.Throughput => Throughput,
            PerformanceMetricType.Rate when metricName.Contains("success") => Rate,
            _ => null
        };
    }
}

/// <summary>
/// Individual performance threshold
/// </summary>
public class PerformanceThreshold
{
    public double WarningValue { get; set; }
    public double CriticalValue { get; set; }
}

/// <summary>
/// Alerting system for performance monitoring
/// </summary>
public class AlertingSystem : IAsyncDisposable
{
    private readonly ConcurrentQueue<PerformanceAlert> _pendingAlerts;
    private readonly ILogger? _logger;
    private bool _disposed = false;

    public AlertingSystem(ILogger? logger)
    {
        _logger = logger;
        _pendingAlerts = new ConcurrentQueue<PerformanceAlert>();
    }

    public void TriggerAlert(PerformanceAlert alert)
    {
        _pendingAlerts.Enqueue(alert);
        
        // Immediate logging for critical alerts
        if (alert.Severity == AlertSeverity.Critical)
        {
            _logger?.LogCritical("🚨 CRITICAL ALERT: {Message}", alert.Message);
        }
        else if (alert.Severity == AlertSeverity.Warning)
        {
            _logger?.LogWarning("⚠️ WARNING ALERT: {Message}", alert.Message);
        }
    }

    public async Task ProcessPendingAlertsAsync()
    {
        var processedAlerts = new List<PerformanceAlert>();
        
        while (_pendingAlerts.TryDequeue(out var alert))
        {
            processedAlerts.Add(alert);
        }
        
        if (processedAlerts.Count > 0)
        {
            _logger?.LogInformation("📢 ALERTS: Processed {Count} performance alerts", processedAlerts.Count);
        }
        
        await Task.CompletedTask;
    }

    public async ValueTask DisposeAsync()
    {
        if (_disposed)
            return;

        _disposed = true;
        
        await ProcessPendingAlertsAsync();
    }
}