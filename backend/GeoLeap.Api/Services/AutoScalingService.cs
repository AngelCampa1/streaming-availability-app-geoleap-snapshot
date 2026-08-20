using Microsoft.Extensions.Options;
using System.Diagnostics;

namespace GeoLeap.Api.Services;

/// <summary>
/// Auto-scaling service for handling peak search traffic loads
/// </summary>
public class AutoScalingService : IAutoScalingService
{
    private readonly ILogger<AutoScalingService> _logger;
    private readonly AutoScalingOptions _options;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IDisposable? _cpuCounter;
    private readonly IDisposable? _memoryCounter;
    private readonly Timer _monitoringTimer;
    // FIXED: Week 1 Day 3 - Replaced lock with SemaphoreSlim for async-safe synchronization
    private readonly SemaphoreSlim _scalingSemaphore = new SemaphoreSlim(1, 1);

    private int _currentInstanceCount = 1;
    private DateTime _lastScaleAction = DateTime.UtcNow;
    private readonly Queue<ScalingMetric> _metricsHistory = new Queue<ScalingMetric>();
    private const int MaxMetricsHistorySize = 1000; // Prevent unbounded growth

    public AutoScalingService(
        ILogger<AutoScalingService> logger,
        IOptions<AutoScalingOptions> options,
        IServiceScopeFactory scopeFactory)
    {
        _logger = logger;
        _options = options.Value;
        _scopeFactory = scopeFactory;

        // Initialize performance counters (Windows only)
        // PerformanceCounter is Windows-only; not initialized on other platforms

        // Start monitoring timer
        _monitoringTimer = new Timer(MonitorAndScale, null, 
            TimeSpan.FromSeconds(_options.MonitoringIntervalSeconds), 
            TimeSpan.FromSeconds(_options.MonitoringIntervalSeconds));

        _logger.LogInformation("Auto-scaling service initialized with monitoring interval {Interval}s", 
            _options.MonitoringIntervalSeconds);
    }

    /// <summary>
    /// Gets current scaling status and metrics
    /// </summary>
    public async Task<AutoScalingStatus> GetScalingStatusAsync()
    {
        var currentMetrics = await CollectCurrentMetricsAsync();
        
        return new AutoScalingStatus
        {
            CurrentInstanceCount = _currentInstanceCount,
            TargetInstanceCount = CalculateTargetInstanceCount(currentMetrics),
            LastScaleAction = _lastScaleAction,
            CurrentCpuUsage = currentMetrics.CpuUsagePercent,
            CurrentMemoryUsage = currentMetrics.MemoryUsagePercent,
            CurrentRequestRate = currentMetrics.RequestsPerSecond,
            ScalingRecommendation = GetScalingRecommendation(currentMetrics),
            MetricsHistory = _metricsHistory.ToList(),
            IsScalingEnabled = _options.EnableAutoScaling
        };
    }

    /// <summary>
    /// Manually triggers scaling evaluation
    /// </summary>
    public async Task<ScalingAction> EvaluateScalingAsync()
    {
        var metrics = await CollectCurrentMetricsAsync();
        return await EvaluateScalingDecisionAsync(metrics);
    }

    /// <summary>
    /// Configures scaling policies dynamically
    /// </summary>
    public Task ConfigureScalingPolicyAsync(ScalingPolicy policy)
    {
        _logger.LogInformation("Updating auto-scaling policy: {Policy}", policy.Name);

        // Update scaling thresholds
        _options.CpuScaleOutThreshold = policy.CpuScaleOutThreshold;
        _options.CpuScaleInThreshold = policy.CpuScaleInThreshold;
        _options.MemoryScaleOutThreshold = policy.MemoryScaleOutThreshold;
        _options.MemoryScaleInThreshold = policy.MemoryScaleInThreshold;
        _options.RequestRateScaleOutThreshold = policy.RequestRateScaleOutThreshold;
        _options.RequestRateScaleInThreshold = policy.RequestRateScaleInThreshold;

        _logger.LogInformation("Auto-scaling policy updated successfully");
        
        return Task.CompletedTask;
    }

    /// <summary>
    /// Gets recommended scaling policies for different scenarios
    /// </summary>
    public Task<List<ScalingPolicy>> GetRecommendedPoliciesAsync()
    {
        var policies = new List<ScalingPolicy>
        {
            new ScalingPolicy
            {
                Name = "Conservative",
                Description = "Conservative scaling with higher thresholds to minimize costs",
                CpuScaleOutThreshold = 80,
                CpuScaleInThreshold = 30,
                MemoryScaleOutThreshold = 85,
                MemoryScaleInThreshold = 35,
                RequestRateScaleOutThreshold = 800,
                RequestRateScaleInThreshold = 200,
                MinInstances = 1,
                MaxInstances = 5
            },
            new ScalingPolicy
            {
                Name = "Aggressive",
                Description = "Aggressive scaling for maximum performance with higher costs",
                CpuScaleOutThreshold = 60,
                CpuScaleInThreshold = 20,
                MemoryScaleOutThreshold = 70,
                MemoryScaleInThreshold = 25,
                RequestRateScaleOutThreshold = 500,
                RequestRateScaleInThreshold = 100,
                MinInstances = 2,
                MaxInstances = 20
            },
            new ScalingPolicy
            {
                Name = "Balanced",
                Description = "Balanced scaling for optimal cost-performance ratio",
                CpuScaleOutThreshold = 70,
                CpuScaleInThreshold = 25,
                MemoryScaleOutThreshold = 80,
                MemoryScaleInThreshold = 30,
                RequestRateScaleOutThreshold = 600,
                RequestRateScaleInThreshold = 150,
                MinInstances = 1,
                MaxInstances = 10
            },
            new ScalingPolicy
            {
                Name = "Search-Optimized",
                Description = "Optimized specifically for search workloads with burst capacity",
                CpuScaleOutThreshold = 65,
                CpuScaleInThreshold = 20,
                MemoryScaleOutThreshold = 75,
                MemoryScaleInThreshold = 25,
                RequestRateScaleOutThreshold = 1000, // Higher threshold for search bursts
                RequestRateScaleInThreshold = 200,
                MinInstances = 2, // Always keep search instances warm
                MaxInstances = 15
            }
        };

        return Task.FromResult(policies);
    }

    /// <summary>
    /// Simulates scaling action (in real implementation, would call cloud provider APIs)
    /// </summary>
    public async Task<bool> ExecuteScalingActionAsync(ScalingAction action)
    {
        try
        {
            _logger.LogInformation("Executing scaling action: {Action} to {TargetCount} instances", 
                action.ActionType, action.TargetInstanceCount);

            switch (action.ActionType)
            {
                case ScalingActionType.ScaleOut:
                    return await ScaleOutAsync(action.TargetInstanceCount);
                
                case ScalingActionType.ScaleIn:
                    return await ScaleInAsync(action.TargetInstanceCount);
                
                case ScalingActionType.NoAction:
                    _logger.LogDebug("No scaling action required");
                    return true;
                
                default:
                    _logger.LogWarning("Unknown scaling action type: {ActionType}", action.ActionType);
                    return false;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to execute scaling action: {Action}", action.ActionType);
            return false;
        }
    }

    /// <summary>
    /// Gets scaling history for analysis
    /// </summary>
    public Task<List<ScalingEvent>> GetScalingHistoryAsync(DateTime from, DateTime to)
    {
        // In a real implementation, this would query persistent storage
        var events = new List<ScalingEvent>
        {
            new ScalingEvent
            {
                Timestamp = DateTime.UtcNow.AddMinutes(-30),
                ActionType = ScalingActionType.ScaleOut,
                FromInstanceCount = 2,
                ToInstanceCount = 4,
                Reason = "High CPU usage (75%) and request rate (850 req/s)",
                Success = true
            },
            new ScalingEvent
            {
                Timestamp = DateTime.UtcNow.AddHours(-2),
                ActionType = ScalingActionType.ScaleIn,
                FromInstanceCount = 4,
                ToInstanceCount = 2,
                Reason = "Low resource usage sustained for 10 minutes",
                Success = true
            }
        }.Where(e => e.Timestamp >= from && e.Timestamp <= to).ToList();

        return Task.FromResult(events);
    }

    private void MonitorAndScale(object? state)
    {
        // Timer callback must not be async void - use fire-and-forget with error handling
        _ = MonitorAndScaleAsync().ContinueWith(t =>
        {
            if (t.IsFaulted)
            {
                _logger.LogError(t.Exception, "Error during auto-scaling monitoring");
            }
        }, TaskScheduler.Default);
    }

    private async Task MonitorAndScaleAsync()
    {
        try
        {
            if (!_options.EnableAutoScaling)
            {
                return;
            }

            var metrics = await CollectCurrentMetricsAsync();
            AddMetricsToHistory(metrics);

            var scalingAction = await EvaluateScalingDecisionAsync(metrics);
            
            if (scalingAction.ActionType != ScalingActionType.NoAction)
            {
                // FIXED: Week 1 Day 3 - Replaced lock with SemaphoreSlim and .Result with await
                await _scalingSemaphore.WaitAsync();
                try
                {
                    // Check cooldown period
                    var timeSinceLastAction = DateTime.UtcNow - _lastScaleAction;
                    if (timeSinceLastAction < TimeSpan.FromSeconds(_options.ScalingCooldownSeconds))
                    {
                        _logger.LogDebug("Scaling action skipped due to cooldown period. Time since last action: {Time}s",
                            timeSinceLastAction.TotalSeconds);
                        return;
                    }

                    // Execute scaling action - FIXED: Use await instead of .Result to prevent deadlock
                    var success = await ExecuteScalingActionAsync(scalingAction);
                    if (success)
                    {
                        _lastScaleAction = DateTime.UtcNow;
                        _currentInstanceCount = scalingAction.TargetInstanceCount;
                    }
                }
                finally
                {
                    _scalingSemaphore.Release();
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during auto-scaling monitoring");
        }
    }

    private async Task<ScalingMetric> CollectCurrentMetricsAsync()
    {
        try
        {
            // Collect system metrics
            var cpuUsage = GetCpuUsage();
            var memoryUsage = GetMemoryUsage();
            var requestRate = await GetRequestRateAsync();
            var responseTime = await GetAverageResponseTimeAsync();
            var errorRate = await GetErrorRateAsync();

            return new ScalingMetric
            {
                Timestamp = DateTime.UtcNow,
                CpuUsagePercent = cpuUsage,
                MemoryUsagePercent = memoryUsage,
                RequestsPerSecond = requestRate,
                AverageResponseTimeMs = responseTime,
                ErrorRatePercent = errorRate,
                ActiveConnections = await GetActiveConnectionsAsync(),
                QueueLength = await GetQueueLengthAsync()
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to collect some scaling metrics, using defaults");
            return new ScalingMetric
            {
                Timestamp = DateTime.UtcNow,
                CpuUsagePercent = 50, // Default values if metrics collection fails
                MemoryUsagePercent = 60,
                RequestsPerSecond = 100,
                AverageResponseTimeMs = 200,
                ErrorRatePercent = 1
            };
        }
    }

    private async Task<ScalingAction> EvaluateScalingDecisionAsync(ScalingMetric metrics)
    {
        var targetInstanceCount = CalculateTargetInstanceCount(metrics);
        
        if (targetInstanceCount > _currentInstanceCount)
        {
            return new ScalingAction
            {
                ActionType = ScalingActionType.ScaleOut,
                CurrentInstanceCount = _currentInstanceCount,
                TargetInstanceCount = targetInstanceCount,
                Reason = $"Scale out triggered by: CPU {metrics.CpuUsagePercent:F1}%, Memory {metrics.MemoryUsagePercent:F1}%, Requests {metrics.RequestsPerSecond}/s",
                Confidence = CalculateScalingConfidence(metrics, ScalingActionType.ScaleOut)
            };
        }
        else if (targetInstanceCount < _currentInstanceCount)
        {
            // Only scale in if sustained low usage
            if (IsScaleInSustained())
            {
                return new ScalingAction
                {
                    ActionType = ScalingActionType.ScaleIn,
                    CurrentInstanceCount = _currentInstanceCount,
                    TargetInstanceCount = targetInstanceCount,
                    Reason = $"Scale in triggered by sustained low usage: CPU {metrics.CpuUsagePercent:F1}%, Memory {metrics.MemoryUsagePercent:F1}%, Requests {metrics.RequestsPerSecond}/s",
                    Confidence = CalculateScalingConfidence(metrics, ScalingActionType.ScaleIn)
                };
            }
        }

        return new ScalingAction
        {
            ActionType = ScalingActionType.NoAction,
            CurrentInstanceCount = _currentInstanceCount,
            TargetInstanceCount = _currentInstanceCount,
            Reason = "Current metrics within acceptable range",
            Confidence = 1.0m
        };
    }

    private int CalculateTargetInstanceCount(ScalingMetric metrics)
    {
        var targetFromCpu = CalculateInstancesFromCpu(metrics.CpuUsagePercent);
        var targetFromMemory = CalculateInstancesFromMemory(metrics.MemoryUsagePercent);
        var targetFromRequestRate = CalculateInstancesFromRequestRate(metrics.RequestsPerSecond);

        // Take the highest requirement
        var targetCount = Math.Max(targetFromCpu, Math.Max(targetFromMemory, targetFromRequestRate));

        // Apply constraints
        targetCount = Math.Max(_options.MinInstances, Math.Min(_options.MaxInstances, targetCount));

        return targetCount;
    }

    private int CalculateInstancesFromCpu(double cpuUsage)
    {
        if (cpuUsage > _options.CpuScaleOutThreshold)
        {
            // Scale out: add instances based on how much we exceed threshold
            var excessUsage = cpuUsage - _options.CpuScaleOutThreshold;
            var additionalInstances = (int)Math.Ceiling(excessUsage / 20); // Add 1 instance per 20% excess
            return _currentInstanceCount + additionalInstances;
        }
        else if (cpuUsage < _options.CpuScaleInThreshold)
        {
            // Scale in: remove instances based on how much below threshold
            var targetUsage = 60; // Target 60% CPU usage
            var requiredInstances = (int)Math.Ceiling((_currentInstanceCount * cpuUsage) / targetUsage);
            return Math.Max(1, requiredInstances);
        }

        return _currentInstanceCount;
    }

    private int CalculateInstancesFromMemory(double memoryUsage)
    {
        if (memoryUsage > _options.MemoryScaleOutThreshold)
        {
            var excessUsage = memoryUsage - _options.MemoryScaleOutThreshold;
            var additionalInstances = (int)Math.Ceiling(excessUsage / 15); // Add 1 instance per 15% excess
            return _currentInstanceCount + additionalInstances;
        }
        else if (memoryUsage < _options.MemoryScaleInThreshold)
        {
            var targetUsage = 65; // Target 65% memory usage
            var requiredInstances = (int)Math.Ceiling((_currentInstanceCount * memoryUsage) / targetUsage);
            return Math.Max(1, requiredInstances);
        }

        return _currentInstanceCount;
    }

    private int CalculateInstancesFromRequestRate(double requestRate)
    {
        var requestsPerInstance = _options.MaxRequestsPerInstance;
        
        if (requestRate > _options.RequestRateScaleOutThreshold)
        {
            var requiredInstances = (int)Math.Ceiling(requestRate / requestsPerInstance);
            return requiredInstances;
        }
        else if (requestRate < _options.RequestRateScaleInThreshold)
        {
            var requiredInstances = Math.Max(1, (int)Math.Ceiling(requestRate / requestsPerInstance));
            return requiredInstances;
        }

        return _currentInstanceCount;
    }

    private bool IsScaleInSustained()
    {
        if (_metricsHistory.Count < _options.SustainedPeriodMinutes)
        {
            return false;
        }

        var recentMetrics = _metricsHistory.TakeLast(_options.SustainedPeriodMinutes);
        return recentMetrics.All(m => 
            m.CpuUsagePercent < _options.CpuScaleInThreshold && 
            m.MemoryUsagePercent < _options.MemoryScaleInThreshold &&
            m.RequestsPerSecond < _options.RequestRateScaleInThreshold);
    }

    private decimal CalculateScalingConfidence(ScalingMetric metrics, ScalingActionType actionType)
    {
        // Calculate confidence based on how far metrics are from thresholds
        var confidence = 0.5m; // Base confidence

        if (actionType == ScalingActionType.ScaleOut)
        {
            if (metrics.CpuUsagePercent > _options.CpuScaleOutThreshold)
                confidence += 0.3m * (decimal)((metrics.CpuUsagePercent - _options.CpuScaleOutThreshold) / 20);
            
            if (metrics.MemoryUsagePercent > _options.MemoryScaleOutThreshold)
                confidence += 0.2m * (decimal)((metrics.MemoryUsagePercent - _options.MemoryScaleOutThreshold) / 15);
        }

        return Math.Min(1.0m, confidence);
    }

    private ScalingRecommendation GetScalingRecommendation(ScalingMetric metrics)
    {
        var targetCount = CalculateTargetInstanceCount(metrics);
        
        if (targetCount > _currentInstanceCount)
        {
            return ScalingRecommendation.ScaleOut;
        }
        else if (targetCount < _currentInstanceCount && IsScaleInSustained())
        {
            return ScalingRecommendation.ScaleIn;
        }
        
        return ScalingRecommendation.Maintain;
    }

    private void AddMetricsToHistory(ScalingMetric metrics)
    {
        _metricsHistory.Enqueue(metrics);
        
        // Keep only recent history (sliding window)
        while (_metricsHistory.Count > _options.MetricsHistorySize)
        {
            _metricsHistory.Dequeue();
        }
    }

    // Platform-specific metric collection methods
    private double GetCpuUsage()
    {
        try
        {
            // Fallback: estimate from process working set
            using var process = Process.GetCurrentProcess();
            return Math.Min(100, (process.WorkingSet64 / 1024.0 / 1024.0) / 10); // Rough estimate
        }
        catch
        {
            return 0;
        }
    }

    private double GetMemoryUsage()
    {
        try
        {
            return GC.GetTotalMemory(false) / 1024.0 / 1024.0 / 10; // Rough estimate based on GC memory
        }
        catch
        {
            return 0;
        }
    }

    private async Task<double> GetRequestRateAsync()
    {
        // In a real implementation, this would query request metrics from the web server or monitoring system
        // For now, return a simulated value
        await Task.Delay(1);
        return Random.Shared.NextDouble() * 500 + 100; // 100-600 requests/second
    }

    private async Task<double> GetAverageResponseTimeAsync()
    {
        await Task.Delay(1);
        return Random.Shared.NextDouble() * 200 + 100; // 100-300ms
    }

    private async Task<double> GetErrorRateAsync()
    {
        await Task.Delay(1);
        return Random.Shared.NextDouble() * 5; // 0-5% error rate
    }

    private async Task<int> GetActiveConnectionsAsync()
    {
        await Task.Delay(1);
        return Random.Shared.Next(50, 500); // 50-500 active connections
    }

    private async Task<int> GetQueueLengthAsync()
    {
        await Task.Delay(1);
        return Random.Shared.Next(0, 20); // 0-20 queued requests
    }

    private async Task<bool> ScaleOutAsync(int targetInstanceCount)
    {
        _logger.LogInformation("Scaling out from {Current} to {Target} instances", 
            _currentInstanceCount, targetInstanceCount);

        // In a real implementation, this would call cloud provider APIs (Azure, AWS, GCP)
        // For now, simulate the scaling action
        await Task.Delay(1000); // Simulate deployment time

        _logger.LogInformation("Scale out completed successfully");
        return true;
    }

    private async Task<bool> ScaleInAsync(int targetInstanceCount)
    {
        _logger.LogInformation("Scaling in from {Current} to {Target} instances", 
            _currentInstanceCount, targetInstanceCount);

        // In a real implementation, this would gracefully shut down instances
        await Task.Delay(500); // Simulate shutdown time

        _logger.LogInformation("Scale in completed successfully");
        return true;
    }

    public void Dispose()
    {
        _monitoringTimer?.Dispose();
        _cpuCounter?.Dispose();
        _memoryCounter?.Dispose();
    }
}

/// <summary>
/// Interface for auto-scaling service
/// </summary>
public interface IAutoScalingService : IDisposable
{
    Task<AutoScalingStatus> GetScalingStatusAsync();
    Task<ScalingAction> EvaluateScalingAsync();
    Task ConfigureScalingPolicyAsync(ScalingPolicy policy);
    Task<List<ScalingPolicy>> GetRecommendedPoliciesAsync();
    Task<bool> ExecuteScalingActionAsync(ScalingAction action);
    Task<List<ScalingEvent>> GetScalingHistoryAsync(DateTime from, DateTime to);
}

/// <summary>
/// Auto-scaling configuration options
/// </summary>
public class AutoScalingOptions
{
    public bool EnableAutoScaling { get; set; } = true;
    public int MonitoringIntervalSeconds { get; set; } = 60;
    public int ScalingCooldownSeconds { get; set; } = 300;
    public int SustainedPeriodMinutes { get; set; } = 5;
    public int MetricsHistorySize { get; set; } = 60;
    
    public int MinInstances { get; set; } = 1;
    public int MaxInstances { get; set; } = 10;
    public int MaxRequestsPerInstance { get; set; } = 1000;
    
    public double CpuScaleOutThreshold { get; set; } = 70;
    public double CpuScaleInThreshold { get; set; } = 25;
    public double MemoryScaleOutThreshold { get; set; } = 80;
    public double MemoryScaleInThreshold { get; set; } = 30;
    public double RequestRateScaleOutThreshold { get; set; } = 800;
    public double RequestRateScaleInThreshold { get; set; } = 200;
}

/// <summary>
/// Scaling metrics for decision making
/// </summary>
public class ScalingMetric
{
    public DateTime Timestamp { get; set; }
    public double CpuUsagePercent { get; set; }
    public double MemoryUsagePercent { get; set; }
    public double RequestsPerSecond { get; set; }
    public double AverageResponseTimeMs { get; set; }
    public double ErrorRatePercent { get; set; }
    public int ActiveConnections { get; set; }
    public int QueueLength { get; set; }
}

/// <summary>
/// Auto-scaling status information
/// </summary>
public class AutoScalingStatus
{
    public int CurrentInstanceCount { get; set; }
    public int TargetInstanceCount { get; set; }
    public DateTime LastScaleAction { get; set; }
    public double CurrentCpuUsage { get; set; }
    public double CurrentMemoryUsage { get; set; }
    public double CurrentRequestRate { get; set; }
    public ScalingRecommendation ScalingRecommendation { get; set; }
    public List<ScalingMetric> MetricsHistory { get; set; } = new();
    public bool IsScalingEnabled { get; set; }
}

/// <summary>
/// Scaling action to be executed
/// </summary>
public class ScalingAction
{
    public ScalingActionType ActionType { get; set; }
    public int CurrentInstanceCount { get; set; }
    public int TargetInstanceCount { get; set; }
    public string Reason { get; set; } = string.Empty;
    public decimal Confidence { get; set; }
}

/// <summary>
/// Scaling policy configuration
/// </summary>
public class ScalingPolicy
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public double CpuScaleOutThreshold { get; set; }
    public double CpuScaleInThreshold { get; set; }
    public double MemoryScaleOutThreshold { get; set; }
    public double MemoryScaleInThreshold { get; set; }
    public double RequestRateScaleOutThreshold { get; set; }
    public double RequestRateScaleInThreshold { get; set; }
    public int MinInstances { get; set; }
    public int MaxInstances { get; set; }
}

/// <summary>
/// Scaling event history
/// </summary>
public class ScalingEvent
{
    public DateTime Timestamp { get; set; }
    public ScalingActionType ActionType { get; set; }
    public int FromInstanceCount { get; set; }
    public int ToInstanceCount { get; set; }
    public string Reason { get; set; } = string.Empty;
    public bool Success { get; set; }
}

/// <summary>
/// Scaling action types
/// </summary>
public enum ScalingActionType
{
    NoAction,
    ScaleOut,
    ScaleIn
}

/// <summary>
/// Scaling recommendations
/// </summary>
public enum ScalingRecommendation
{
    Maintain,
    ScaleOut,
    ScaleIn
}