using System.Collections.Concurrent;
using System.Diagnostics;
using Microsoft.Extensions.Logging;

namespace GeoLeap.Api.Tests.Infrastructure;

/// <summary>
/// Batch Processor implementing US82 batch processing patterns
/// Provides efficient batch operations for bulk test scenarios with intelligent grouping
/// </summary>
public sealed class BatchProcessor : IAsyncDisposable
{
    private readonly ConcurrentDictionary<string, BatchExecution> _activeBatches;
    private readonly BatchingStrategy _batchingStrategy;
    private readonly Timer _monitoringTimer;
    private readonly ILogger<BatchProcessor>? _logger;
    private readonly SemaphoreSlim _batchSemaphore;
    private bool _disposed = false;

    // Batch statistics
    private long _totalBatchesProcessed = 0;
    private long _totalItemsProcessed = 0;
    private readonly Stopwatch _sessionStopwatch = Stopwatch.StartNew();

    public BatchProcessor(ILogger<BatchProcessor>? logger = null)
    {
        _logger = logger;
        _activeBatches = new ConcurrentDictionary<string, BatchExecution>();
        _batchingStrategy = new BatchingStrategy();
        _batchSemaphore = new SemaphoreSlim(Environment.ProcessorCount * 2, Environment.ProcessorCount * 2);
        
        // Start monitoring timer
        _monitoringTimer = new Timer(MonitorBatchesAsync, null, TimeSpan.FromSeconds(5), TimeSpan.FromSeconds(10));
        
        _logger?.LogInformation("📦 BATCH PROCESSOR: Initialized with max concurrent batches: {MaxBatches}", 
            Environment.ProcessorCount * 2);
    }

    /// <summary>
    /// Process items in optimized batches with intelligent grouping
    /// </summary>
    public async Task<BatchProcessingResult<T>> ProcessBatchAsync<T>(
        IEnumerable<T> items,
        Func<T, CancellationToken, Task<BatchItemResult<T>>> processor,
        BatchProcessingOptions? options = null,
        CancellationToken cancellationToken = default)
    {
        options ??= new BatchProcessingOptions();
        var batchId = Guid.NewGuid().ToString("N")[..8];
        
        _logger?.LogInformation("▶️ BATCH START: {BatchId} with {ItemCount} items", batchId, items.Count());
        
        var execution = new BatchExecution(batchId, items.Count(), options);
        _activeBatches.TryAdd(batchId, execution);
        
        try
        {
            await _batchSemaphore.WaitAsync(cancellationToken);
            
            var results = await ProcessItemsInBatchesAsync(items, processor, options, batchId, cancellationToken);
            
            var batchResult = new BatchProcessingResult<T>
            {
                BatchId = batchId,
                TotalItems = items.Count(),
                Results = results,
                ExecutionTime = execution.Stopwatch.Elapsed,
                SuccessCount = results.Count(r => r.Success),
                FailureCount = results.Count(r => !r.Success),
                ThroughputItemsPerSecond = CalculateThroughput(results.Length, execution.Stopwatch.Elapsed)
            };
            
            Interlocked.Increment(ref _totalBatchesProcessed);
            Interlocked.Add(ref _totalItemsProcessed, results.Length);
            
            _logger?.LogInformation("✅ BATCH COMPLETED: {BatchId} - {SuccessCount}/{TotalCount} successful in {Duration}ms", 
                batchId, batchResult.SuccessCount, batchResult.TotalItems, 
                batchResult.ExecutionTime.TotalMilliseconds);
            
            return batchResult;
        }
        finally
        {
            _activeBatches.TryRemove(batchId, out _);
            _batchSemaphore.Release();
        }
    }

    /// <summary>
    /// Process database operations in optimized batches
    /// </summary>
    public async Task<BatchDatabaseResult> ProcessDatabaseBatchAsync<T>(
        IEnumerable<T> entities,
        Func<IEnumerable<T>, CancellationToken, Task<DatabaseOperationResult>> batchOperation,
        BatchProcessingOptions? options = null,
        CancellationToken cancellationToken = default)
    {
        options ??= new BatchProcessingOptions { BatchSize = 100 }; // Larger batches for DB operations
        var batchId = Guid.NewGuid().ToString("N")[..8];
        
        _logger?.LogInformation("🗄️ DB BATCH START: {BatchId} with {EntityCount} entities", batchId, entities.Count());
        
        var execution = new BatchExecution(batchId, entities.Count(), options);
        _activeBatches.TryAdd(batchId, execution);
        
        try
        {
            var entityBatches = _batchingStrategy.CreateOptimizedBatches(entities, options.BatchSize);
            var results = new ConcurrentBag<DatabaseOperationResult>();
            var semaphore = new SemaphoreSlim(options.MaxConcurrency);
            
            var tasks = entityBatches.Select(async batch =>
            {
                await semaphore.WaitAsync(cancellationToken);
                try
                {
                    var result = await batchOperation(batch, cancellationToken);
                    results.Add(result);
                }
                finally
                {
                    semaphore.Release();
                }
            });
            
            await Task.WhenAll(tasks);
            
            var batchResult = new BatchDatabaseResult
            {
                BatchId = batchId,
                TotalEntities = entities.Count(),
                TotalBatches = entityBatches.Count(),
                Results = results.ToArray(),
                ExecutionTime = execution.Stopwatch.Elapsed,
                SuccessfulBatches = results.Count(r => r.Success),
                FailedBatches = results.Count(r => !r.Success)
            };
            
            _logger?.LogInformation("✅ DB BATCH COMPLETED: {BatchId} - {SuccessfulBatches}/{TotalBatches} batches successful", 
                batchId, batchResult.SuccessfulBatches, batchResult.TotalBatches);
            
            return batchResult;
        }
        finally
        {
            _activeBatches.TryRemove(batchId, out _);
        }
    }

    /// <summary>
    /// Process HTTP requests in optimized batches with connection pooling
    /// </summary>
    public async Task<BatchHttpResult> ProcessHttpBatchAsync<TRequest, TResponse>(
        IEnumerable<TRequest> requests,
        Func<TRequest, CancellationToken, Task<HttpOperationResult<TResponse>>> httpOperation,
        BatchProcessingOptions? options = null,
        CancellationToken cancellationToken = default)
    {
        options ??= new BatchProcessingOptions { BatchSize = 20, MaxConcurrency = 10 }; // Conservative for HTTP
        var batchId = Guid.NewGuid().ToString("N")[..8];
        
        _logger?.LogInformation("🌐 HTTP BATCH START: {BatchId} with {RequestCount} requests", batchId, requests.Count());
        
        var execution = new BatchExecution(batchId, requests.Count(), options);
        _activeBatches.TryAdd(batchId, execution);
        
        try
        {
            var requestBatches = _batchingStrategy.CreateOptimizedBatches(requests, options.BatchSize);
            var results = new ConcurrentBag<HttpOperationResult<TResponse>>();
            var semaphore = new SemaphoreSlim(options.MaxConcurrency);
            
            var tasks = requestBatches.SelectMany(batch => batch.Select(async request =>
            {
                await semaphore.WaitAsync(cancellationToken);
                try
                {
                    var result = await httpOperation(request, cancellationToken);
                    results.Add(result);
                }
                finally
                {
                    semaphore.Release();
                }
            }));
            
            await Task.WhenAll(tasks);
            
            var batchResult = new BatchHttpResult
            {
                BatchId = batchId,
                TotalRequests = requests.Count(),
                Results = results.ToArray(),
                ExecutionTime = execution.Stopwatch.Elapsed,
                SuccessfulRequests = results.Count(r => r.Success),
                FailedRequests = results.Count(r => !r.Success),
                AverageResponseTime = results.Where(r => r.Success).Average(r => r.ResponseTime.TotalMilliseconds)
            };
            
            _logger?.LogInformation("✅ HTTP BATCH COMPLETED: {BatchId} - {SuccessfulRequests}/{TotalRequests} requests successful", 
                batchId, batchResult.SuccessfulRequests, batchResult.TotalRequests);
            
            return batchResult;
        }
        finally
        {
            _activeBatches.TryRemove(batchId, out _);
        }
    }

    /// <summary>
    /// Get progress of active batches
    /// </summary>
    public BatchProgressReport GetBatchProgress()
    {
        var activeBatches = _activeBatches.Values.ToArray();
        
        return new BatchProgressReport
        {
            ActiveBatches = activeBatches.Length,
            TotalBatchesProcessed = _totalBatchesProcessed,
            TotalItemsProcessed = _totalItemsProcessed,
            SessionDuration = _sessionStopwatch.Elapsed,
            OverallThroughput = CalculateThroughput(_totalItemsProcessed, _sessionStopwatch.Elapsed),
            BatchDetails = activeBatches.Select(b => new BatchProgressDetail
            {
                BatchId = b.BatchId,
                TotalItems = b.TotalItems,
                Progress = b.GetProgress(),
                ElapsedTime = b.Stopwatch.Elapsed
            }).ToList()
        };
    }

    #region Private Implementation

    private async Task<BatchItemResult<T>[]> ProcessItemsInBatchesAsync<T>(
        IEnumerable<T> items,
        Func<T, CancellationToken, Task<BatchItemResult<T>>> processor,
        BatchProcessingOptions options,
        string batchId,
        CancellationToken cancellationToken)
    {
        var itemBatches = _batchingStrategy.CreateOptimizedBatches(items, options.BatchSize);
        var results = new ConcurrentBag<BatchItemResult<T>>();
        var semaphore = new SemaphoreSlim(options.MaxConcurrency);
        
        var tasks = itemBatches.SelectMany(batch => batch.Select(async item =>
        {
            await semaphore.WaitAsync(cancellationToken);
            try
            {
                var result = await processor(item, cancellationToken);
                results.Add(result);
                
                // Update batch progress
                if (_activeBatches.TryGetValue(batchId, out var execution))
                {
                    execution.IncrementProgress();
                }
            }
            catch (Exception ex)
            {
                results.Add(new BatchItemResult<T>
                {
                    Item = item,
                    Success = false,
                    Error = ex.Message,
                    ProcessingTime = TimeSpan.Zero
                });
            }
            finally
            {
                semaphore.Release();
            }
        }));
        
        await Task.WhenAll(tasks);
        
        return results.ToArray();
    }

    private double CalculateThroughput(long itemCount, TimeSpan duration)
    {
        return duration.TotalSeconds > 0 ? itemCount / duration.TotalSeconds : 0.0;
    }

    private async void MonitorBatchesAsync(object? state)
    {
        try
        {
            var activeBatches = _activeBatches.Values.ToArray();
            
            if (activeBatches.Length > 0)
            {
                foreach (var batch in activeBatches)
                {
                    var progress = batch.GetProgress();
                    _logger?.LogDebug("📊 BATCH PROGRESS: {BatchId} - {Progress:P1} ({ProcessedItems}/{TotalItems})", 
                        batch.BatchId, progress, batch.ProcessedItems, batch.TotalItems);
                }
            }
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "❌ MONITOR: Error during batch monitoring");
        }
        
        await Task.CompletedTask;
    }

    #endregion

    public async ValueTask DisposeAsync()
    {
        if (_disposed)
            return;

        _disposed = true;

        try
        {
            _logger?.LogInformation("🧹 DISPOSAL: Disposing BatchProcessor");
            
            _monitoringTimer?.Dispose();
            
            // Wait for active batches to complete or cancel them
            var activeBatches = _activeBatches.Values.ToArray();
            if (activeBatches.Length > 0)
            {
                _logger?.LogInformation("⏳ DISPOSAL: Waiting for {Count} active batches to complete", activeBatches.Length);
                
                // Give batches a chance to complete gracefully
                await Task.Delay(TimeSpan.FromSeconds(5));
            }
            
            _activeBatches.Clear();
            _batchSemaphore.Dispose();
            
            _logger?.LogInformation("✅ DISPOSAL: BatchProcessor disposed - Processed {TotalBatches} batches with {TotalItems} items", 
                _totalBatchesProcessed, _totalItemsProcessed);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "❌ DISPOSAL: Error during BatchProcessor disposal");
        }
    }
}

/// <summary>
/// Batching strategy for optimizing batch sizes and grouping
/// </summary>
public class BatchingStrategy
{
    /// <summary>
    /// Create optimized batches from items
    /// </summary>
    public List<List<T>> CreateOptimizedBatches<T>(IEnumerable<T> items, int batchSize)
    {
        var batches = new List<List<T>>();
        var currentBatch = new List<T>();
        
        foreach (var item in items)
        {
            currentBatch.Add(item);
            
            if (currentBatch.Count >= batchSize)
            {
                batches.Add(currentBatch);
                currentBatch = new List<T>();
            }
        }
        
        // Add remaining items
        if (currentBatch.Count > 0)
        {
            batches.Add(currentBatch);
        }
        
        return batches;
    }

    /// <summary>
    /// Calculate optimal batch size based on item characteristics
    /// </summary>
    public int CalculateOptimalBatchSize<T>(IEnumerable<T> items, string operationType)
    {
        var itemCount = items.Count();
        
        return operationType.ToLowerInvariant() switch
        {
            "database" => Math.Min(100, Math.Max(10, itemCount / 10)),
            "http" => Math.Min(20, Math.Max(5, itemCount / 20)),
            "file" => Math.Min(50, Math.Max(10, itemCount / 15)),
            _ => Math.Min(25, Math.Max(5, itemCount / 10))
        };
    }
}

/// <summary>
/// Batch execution tracking
/// </summary>
public class BatchExecution
{
    public string BatchId { get; }
    public int TotalItems { get; }
    public BatchProcessingOptions Options { get; }
    public Stopwatch Stopwatch { get; }
    public long ProcessedItems => _processedItems;
    
    private long _processedItems = 0;

    public BatchExecution(string batchId, int totalItems, BatchProcessingOptions options)
    {
        BatchId = batchId;
        TotalItems = totalItems;
        Options = options;
        Stopwatch = Stopwatch.StartNew();
    }

    public void IncrementProgress()
    {
        Interlocked.Increment(ref _processedItems);
    }

    public double GetProgress()
    {
        return TotalItems > 0 ? (double)_processedItems / TotalItems : 1.0;
    }
}

/// <summary>
/// Batch processing options
/// </summary>
public class BatchProcessingOptions
{
    public int BatchSize { get; set; } = 25;
    public int MaxConcurrency { get; set; } = Environment.ProcessorCount;
    public TimeSpan Timeout { get; set; } = TimeSpan.FromMinutes(5);
    public bool FailFast { get; set; } = false;
    public RetryPolicy? RetryPolicy { get; set; }
}

/// <summary>
/// Batch processing result
/// </summary>
public class BatchProcessingResult<T>
{
    public string BatchId { get; set; } = string.Empty;
    public int TotalItems { get; set; }
    public BatchItemResult<T>[] Results { get; set; } = Array.Empty<BatchItemResult<T>>();
    public TimeSpan ExecutionTime { get; set; }
    public int SuccessCount { get; set; }
    public int FailureCount { get; set; }
    public double ThroughputItemsPerSecond { get; set; }
    public double SuccessRate => TotalItems > 0 ? (double)SuccessCount / TotalItems : 0.0;
}

/// <summary>
/// Batch item result
/// </summary>
public class BatchItemResult<T>
{
    public T Item { get; set; } = default!;
    public bool Success { get; set; }
    public string? Error { get; set; }
    public TimeSpan ProcessingTime { get; set; }
    public object? Result { get; set; }
}

/// <summary>
/// Database batch result
/// </summary>
public class BatchDatabaseResult
{
    public string BatchId { get; set; } = string.Empty;
    public int TotalEntities { get; set; }
    public int TotalBatches { get; set; }
    public DatabaseOperationResult[] Results { get; set; } = Array.Empty<DatabaseOperationResult>();
    public TimeSpan ExecutionTime { get; set; }
    public int SuccessfulBatches { get; set; }
    public int FailedBatches { get; set; }
}

/// <summary>
/// HTTP batch result
/// </summary>
public class BatchHttpResult
{
    public string BatchId { get; set; } = string.Empty;
    public int TotalRequests { get; set; }
    public object[] Results { get; set; } = Array.Empty<object>();
    public TimeSpan ExecutionTime { get; set; }
    public int SuccessfulRequests { get; set; }
    public int FailedRequests { get; set; }
    public double AverageResponseTime { get; set; }
}

/// <summary>
/// Batch progress report
/// </summary>
public class BatchProgressReport
{
    public int ActiveBatches { get; set; }
    public long TotalBatchesProcessed { get; set; }
    public long TotalItemsProcessed { get; set; }
    public TimeSpan SessionDuration { get; set; }
    public double OverallThroughput { get; set; }
    public List<BatchProgressDetail> BatchDetails { get; set; } = new();
}

/// <summary>
/// Individual batch progress detail
/// </summary>
public class BatchProgressDetail
{
    public string BatchId { get; set; } = string.Empty;
    public int TotalItems { get; set; }
    public double Progress { get; set; }
    public TimeSpan ElapsedTime { get; set; }
}

/// <summary>
/// Database operation result
/// </summary>
public class DatabaseOperationResult
{
    public bool Success { get; set; }
    public int AffectedRecords { get; set; }
    public string? Error { get; set; }
    public TimeSpan ExecutionTime { get; set; }
}

/// <summary>
/// HTTP operation result
/// </summary>
public class HttpOperationResult<T>
{
    public bool Success { get; set; }
    public T? Response { get; set; }
    public string? Error { get; set; }
    public TimeSpan ResponseTime { get; set; }
    public int StatusCode { get; set; }
}

/// <summary>
/// Retry policy for batch operations
/// </summary>
public class RetryPolicy
{
    public int MaxRetries { get; set; } = 3;
    public TimeSpan BaseDelay { get; set; } = TimeSpan.FromMilliseconds(500);
    public double BackoffMultiplier { get; set; } = 2.0;
    public TimeSpan MaxDelay { get; set; } = TimeSpan.FromSeconds(30);
}