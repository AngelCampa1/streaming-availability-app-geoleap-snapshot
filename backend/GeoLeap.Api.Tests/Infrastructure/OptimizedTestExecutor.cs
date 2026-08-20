using System.Collections.Concurrent;
using System.Diagnostics;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using GeoLeap.Api.Data;

namespace GeoLeap.Api.Tests.Infrastructure;

/// <summary>
/// Optimized Test Executor implementing US82 performance patterns
/// Provides systematic performance optimization for Phase 2 backend test execution
/// </summary>
public sealed class OptimizedTestExecutor : IAsyncDisposable
{
    private readonly MemoryOptimizer _memoryOptimizer;
    private readonly TimeoutManager _timeoutManager;
    private readonly OptimizedResourcePool _resourcePool;
    private readonly BatchProcessor _batchProcessor;
    private readonly TestPerformanceMonitor _performanceMonitor;
    private readonly ILogger<OptimizedTestExecutor> _logger;
    private bool _disposed = false;

    public OptimizedTestExecutor(ILogger<OptimizedTestExecutor> logger)
    {
        _logger = logger;
        _memoryOptimizer = new MemoryOptimizer();
        _timeoutManager = new TimeoutManager();
        _resourcePool = new OptimizedResourcePool();
        _batchProcessor = new BatchProcessor();
        _performanceMonitor = new TestPerformanceMonitor();
        
        _logger.LogInformation("🚀 OPTIMIZED EXECUTOR: Initialized with US82 performance patterns");
    }

    /// <summary>
    /// Execute batch of tests with comprehensive optimization
    /// Applies memory management, timeout control, and resource pooling
    /// </summary>
    public async Task<BatchTestResult> ExecuteBatchAsync(TestBatch batch)
    {
        var stopwatch = Stopwatch.StartNew();
        _logger.LogInformation("▶️ BATCH EXECUTION: Starting batch {BatchId} with {TestCount} tests", 
            batch.Id, batch.Tests.Count);

        await using var context = await _resourcePool.AcquireContextAsync(batch.ResourceProfile);
        await using var memoryScope = _memoryOptimizer.CreateScope();
        
        var results = new ConcurrentBag<TestResult>();
        var semaphore = new SemaphoreSlim(batch.MaxConcurrency);
        var executionMetrics = new ConcurrentDictionary<string, ExecutionMetric>();

        try
        {
            var tasks = batch.Tests.Select(async test =>
            {
                await semaphore.WaitAsync();
                try
                {
                    using var timeout = _timeoutManager.CreateTimeout(test.TimeoutMs);
                    var result = await ExecuteTestWithOptimizationAsync(test, timeout.Token);
                    results.Add(result);
                    
                    // Track execution metrics
                    executionMetrics.TryAdd(test.Name, new ExecutionMetric
                    {
                        Duration = result.Duration,
                        MemoryUsed = result.MemoryUsed,
                        Success = result.Success
                    });
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "❌ BATCH EXECUTION: Test {TestName} failed", test.Name);
                    results.Add(new TestResult
                    {
                        TestName = test.Name,
                        Success = false,
                        Error = ex.Message,
                        Duration = TimeSpan.Zero
                    });
                }
                finally
                {
                    semaphore.Release();
                }
            });

            await Task.WhenAll(tasks);
            stopwatch.Stop();

            var batchResult = new BatchTestResult
            {
                BatchId = batch.Id,
                Results = results.ToArray(),
                MemoryUsage = memoryScope.GetUsageStats(),
                ExecutionTime = stopwatch.Elapsed,
                ConcurrencyLevel = batch.MaxConcurrency,
                OptimizationMetrics = await _performanceMonitor.GetOptimizationMetricsAsync()
            };

            _logger.LogInformation("✅ BATCH COMPLETED: {BatchId} - {SuccessCount}/{TotalCount} passed in {Duration}ms", 
                batch.Id, 
                batchResult.Results.Count(r => r.Success), 
                batchResult.Results.Length,
                batchResult.ExecutionTime.TotalMilliseconds);

            return batchResult;
        }
        finally
        {
            // Ensure cleanup regardless of outcome
            await PerformBatchCleanupAsync(batch.Id);
        }
    }

    /// <summary>
    /// Execute single test with comprehensive optimization patterns
    /// </summary>
    private async Task<TestResult> ExecuteTestWithOptimizationAsync(TestDefinition test, CancellationToken cancellationToken)
    {
        var testStopwatch = Stopwatch.StartNew();
        var initialMemory = GC.GetTotalMemory(false);

        try
        {
            // Pre-execution optimization
            await _memoryOptimizer.OptimizeForTestAsync(test.Category);
            
            // Execute with timeout and cancellation support
            var result = await ExecuteTestCoreAsync(test, cancellationToken);
            
            testStopwatch.Stop();
            var finalMemory = GC.GetTotalMemory(false);

            return new TestResult
            {
                TestName = test.Name,
                Success = result.Success,
                Duration = testStopwatch.Elapsed,
                MemoryUsed = finalMemory - initialMemory,
                Error = result.Error,
                Category = test.Category
            };
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            testStopwatch.Stop();
            _logger.LogWarning("⏰ TIMEOUT: Test {TestName} timed out after {Duration}ms", 
                test.Name, testStopwatch.ElapsedMilliseconds);
            
            return new TestResult
            {
                TestName = test.Name,
                Success = false,
                Duration = testStopwatch.Elapsed,
                Error = $"Test timed out after {test.TimeoutMs}ms",
                Category = test.Category
            };
        }
        catch (Exception ex)
        {
            testStopwatch.Stop();
            _logger.LogError(ex, "❌ ERROR: Test {TestName} failed with exception", test.Name);
            
            return new TestResult
            {
                TestName = test.Name,
                Success = false,
                Duration = testStopwatch.Elapsed,
                Error = ex.Message,
                Category = test.Category
            };
        }
    }

    /// <summary>
    /// Core test execution with resource isolation
    /// </summary>
    private async Task<CoreTestResult> ExecuteTestCoreAsync(TestDefinition test, CancellationToken cancellationToken)
    {
        await using var isolatedScope = await _resourcePool.CreateIsolatedScopeAsync(test.ResourceRequirements);
        
        try
        {
            // Execute the actual test operation
            var success = await test.ExecutionDelegate(isolatedScope.ServiceProvider, cancellationToken);
            
            return new CoreTestResult { Success = success };
        }
        catch (Exception ex)
        {
            return new CoreTestResult { Success = false, Error = ex.Message };
        }
    }

    /// <summary>
    /// Perform comprehensive cleanup after batch execution
    /// </summary>
    private async Task PerformBatchCleanupAsync(string batchId)
    {
        try
        {
            _logger.LogDebug("🧹 CLEANUP: Starting batch cleanup for {BatchId}", batchId);
            
            // Memory optimization
            await _memoryOptimizer.PerformAggressiveCleanupAsync();
            
            // Resource pool cleanup
            await _resourcePool.CleanupBatchResourcesAsync(batchId);
            
            // Timeout manager cleanup
            _timeoutManager.CancelAll();
            
            _logger.LogDebug("✅ CLEANUP: Batch cleanup completed for {BatchId}", batchId);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "⚠️ CLEANUP: Warning during batch cleanup for {BatchId}", batchId);
        }
    }

    /// <summary>
    /// Get comprehensive performance metrics
    /// </summary>
    public async Task<PerformanceReport> GeneratePerformanceReportAsync()
    {
        return new PerformanceReport
        {
            MemoryMetrics = await _memoryOptimizer.GenerateMemoryReportAsync(),
            ResourceMetrics = await _resourcePool.GenerateResourceReportAsync(),
            TimeoutMetrics = _timeoutManager.GenerateTimeoutReport(),
            OverallOptimization = await _performanceMonitor.GetOptimizationSummaryAsync()
        };
    }

    public async ValueTask DisposeAsync()
    {
        if (_disposed)
            return;

        _disposed = true;

        try
        {
            _logger.LogInformation("🧹 DISPOSAL: Disposing OptimizedTestExecutor");
            
            await _memoryOptimizer.DisposeAsync();
            await _resourcePool.DisposeAsync();
            _timeoutManager.Dispose();
            await _batchProcessor.DisposeAsync();
            await _performanceMonitor.DisposeAsync();
            
            _logger.LogInformation("✅ DISPOSAL: OptimizedTestExecutor disposed successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "❌ DISPOSAL: Error during OptimizedTestExecutor disposal");
        }
    }
}

/// <summary>
/// Test batch configuration for optimized execution
/// </summary>
public class TestBatch
{
    public string Id { get; set; } = Guid.NewGuid().ToString("N")[..8];
    public List<TestDefinition> Tests { get; set; } = new();
    public int MaxConcurrency { get; set; } = Environment.ProcessorCount;
    public string ResourceProfile { get; set; } = "default";
    public TimeSpan MaxExecutionTime { get; set; } = TimeSpan.FromMinutes(10);
}

/// <summary>
/// Individual test definition with optimization parameters
/// </summary>
public class TestDefinition
{
    public string Name { get; set; } = string.Empty;
    public string Category { get; set; } = "general";
    public int TimeoutMs { get; set; } = 30000; // 30 seconds default
    public Dictionary<string, object> ResourceRequirements { get; set; } = new();
    public Func<IServiceProvider, CancellationToken, Task<bool>> ExecutionDelegate { get; set; } = (_, _) => Task.FromResult(true);
}

/// <summary>
/// Test execution result with performance metrics
/// </summary>
public class TestResult
{
    public string TestName { get; set; } = string.Empty;
    public bool Success { get; set; }
    public TimeSpan Duration { get; set; }
    public long MemoryUsed { get; set; }
    public string? Error { get; set; }
    public string Category { get; set; } = string.Empty;
}

/// <summary>
/// Core test result without performance metrics
/// </summary>
public class CoreTestResult
{
    public bool Success { get; set; }
    public string? Error { get; set; }
}

/// <summary>
/// Batch execution result with comprehensive metrics
/// </summary>
public class BatchTestResult
{
    public string BatchId { get; set; } = string.Empty;
    public TestResult[] Results { get; set; } = Array.Empty<TestResult>();
    public MemoryUsageStats MemoryUsage { get; set; } = new();
    public TimeSpan ExecutionTime { get; set; }
    public int ConcurrencyLevel { get; set; }
    public OptimizationMetrics OptimizationMetrics { get; set; } = new();
    
    public double SuccessRate => Results.Length > 0 ? (double)Results.Count(r => r.Success) / Results.Length : 0.0;
    public TimeSpan AverageTestDuration => Results.Length > 0 ? 
        TimeSpan.FromMilliseconds(Results.Average(r => r.Duration.TotalMilliseconds)) : TimeSpan.Zero;
}

/// <summary>
/// Execution metric for performance tracking
/// </summary>
public class ExecutionMetric
{
    public TimeSpan Duration { get; set; }
    public long MemoryUsed { get; set; }
    public bool Success { get; set; }
}

/// <summary>
/// Memory usage statistics
/// </summary>
public class MemoryUsageStats
{
    public long InitialMemory { get; set; }
    public long PeakMemory { get; set; }
    public long FinalMemory { get; set; }
    public int GcCollections { get; set; }
    public TimeSpan TimeInGc { get; set; }
}

/// <summary>
/// Optimization metrics for performance analysis
/// </summary>
public class OptimizationMetrics
{
    public double MemoryOptimizationRatio { get; set; }
    public double TimeoutPreventionRate { get; set; }
    public double ResourcePoolEfficiency { get; set; }
    public int OptimizationActionsApplied { get; set; }
}

/// <summary>
/// Comprehensive performance report
/// </summary>
public class PerformanceReport
{
    public MemoryReport MemoryMetrics { get; set; } = new();
    public ResourceReport ResourceMetrics { get; set; } = new();
    public TimeoutReport TimeoutMetrics { get; set; } = new();
    public OptimizationSummary OverallOptimization { get; set; } = new();
}

// Supporting classes for comprehensive reporting
public class MemoryReport
{
    public long TotalMemoryUsed { get; set; }
    public List<string> LeakedResources { get; set; } = new();
    public List<string> Recommendations { get; set; } = new();
    public MemoryOptimizationStats OptimizationStats { get; set; } = new();
}

public class ResourceReport
{
    public int ActiveConnections { get; set; }
    public int PooledConnections { get; set; }
    public double PoolEfficiency { get; set; }
    public List<string> ResourceBottlenecks { get; set; } = new();
    public TimeSpan SessionDuration { get; set; }
    public long TotalResourcesCreated { get; set; }
    public double ResourceReuseRate { get; set; }
}

public class TimeoutReport
{
    public int TotalTimeouts { get; set; }
    public int PreventedTimeouts { get; set; }
    public int ActiveTimeouts { get; set; }
    public List<string> TimeoutPatterns { get; set; } = new();
    public TimeSpan SessionDuration { get; set; }
    public double SuccessRate { get; set; }
}

public class OptimizationSummary
{
    public double OverallEfficiencyGain { get; set; }
    public List<string> AppliedOptimizations { get; set; } = new();
    public List<string> RecommendedImprovements { get; set; } = new();
}