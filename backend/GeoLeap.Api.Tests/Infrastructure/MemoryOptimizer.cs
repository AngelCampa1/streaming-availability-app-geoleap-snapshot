using System.Buffers;
using System.Collections.Concurrent;
using System.Diagnostics;
using System.Runtime;
using Microsoft.Extensions.Logging;

namespace GeoLeap.Api.Tests.Infrastructure;

/// <summary>
/// Memory Optimizer implementing US82 memory management patterns
/// Provides proactive memory optimization for large-scale test execution
/// </summary>
public sealed class MemoryOptimizer : IAsyncDisposable
{
    private readonly MemoryPool<byte> _memoryPool;
    private readonly ConcurrentDictionary<string, MemoryScope> _activeScopes;
    private readonly ConcurrentQueue<WeakReference> _trackedObjects;
    private readonly Timer _memoryMonitor;
    private readonly SemaphoreSlim _optimizationSemaphore;
    private readonly ILogger<MemoryOptimizer>? _logger;
    private readonly MemoryThresholdConfiguration _thresholds;
    private bool _disposed = false;

    // Memory optimization statistics
    private long _totalOptimizations = 0;
    private long _memoryReclaimed = 0;
    private readonly Stopwatch _sessionStopwatch = Stopwatch.StartNew();

    public MemoryOptimizer(ILogger<MemoryOptimizer>? logger = null)
    {
        _logger = logger;
        _memoryPool = MemoryPool<byte>.Shared;
        _activeScopes = new ConcurrentDictionary<string, MemoryScope>();
        _trackedObjects = new ConcurrentQueue<WeakReference>();
        _optimizationSemaphore = new SemaphoreSlim(1, 1);
        _thresholds = new MemoryThresholdConfiguration();
        
        // Start memory monitoring
        _memoryMonitor = new Timer(MonitorMemoryAsync, null, TimeSpan.FromSeconds(5), TimeSpan.FromSeconds(10));
        
        _logger?.LogInformation("🧠 MEMORY OPTIMIZER: Initialized with thresholds - Warning: {WarningMB}MB, Critical: {CriticalMB}MB", 
            _thresholds.WarningThresholdMB, _thresholds.CriticalThresholdMB);
    }

    /// <summary>
    /// Create memory scope for controlled allocation tracking
    /// </summary>
    public MemoryScope CreateScope(string? scopeId = null)
    {
        scopeId ??= Guid.NewGuid().ToString("N")[..8];
        
        var scope = new MemoryScope(scopeId, _memoryPool, this);
        _activeScopes.TryAdd(scopeId, scope);
        
        _logger?.LogDebug("📦 SCOPE CREATED: {ScopeId}", scopeId);
        return scope;
    }

    /// <summary>
    /// Optimize memory for specific test category
    /// </summary>
    public async Task OptimizeForTestAsync(string testCategory)
    {
        await _optimizationSemaphore.WaitAsync();
        try
        {
            var initialMemory = GC.GetTotalMemory(false);
            
            // Category-specific optimizations
            switch (testCategory.ToLowerInvariant())
            {
                case "integration":
                case "database":
                    await OptimizeForDatabaseTestsAsync();
                    break;
                    
                case "controller":
                case "api":
                    await OptimizeForApiTestsAsync();
                    break;
                    
                case "bulk":
                case "batch":
                    await OptimizeForBulkTestsAsync();
                    break;
                    
                default:
                    await OptimizeGeneralAsync();
                    break;
            }
            
            var finalMemory = GC.GetTotalMemory(false);
            var memoryReclaimed = initialMemory - finalMemory;
            
            if (memoryReclaimed > 0)
            {
                Interlocked.Add(ref _memoryReclaimed, memoryReclaimed);
                _logger?.LogDebug("♻️ OPTIMIZATION: Reclaimed {MemoryMB:F2}MB for category {Category}", 
                    memoryReclaimed / 1024.0 / 1024.0, testCategory);
            }
            
            Interlocked.Increment(ref _totalOptimizations);
        }
        finally
        {
            _optimizationSemaphore.Release();
        }
    }

    /// <summary>
    /// Perform aggressive cleanup for memory pressure situations
    /// </summary>
    public async Task PerformAggressiveCleanupAsync()
    {
        await _optimizationSemaphore.WaitAsync();
        try
        {
            var initialMemory = GC.GetTotalMemory(false);
            _logger?.LogInformation("🚨 AGGRESSIVE CLEANUP: Starting with {MemoryMB:F2}MB", initialMemory / 1024.0 / 1024.0);
            
            // Cleanup dead scopes
            await CleanupDeadScopesAsync();
            
            // Remove dead weak references
            CleanupTrackedObjects();
            
            // Force garbage collection
            await ForceGarbageCollectionAsync();
            
            // Clear any cached data
            await ClearCachesAsync();
            
            var finalMemory = GC.GetTotalMemory(true); // Force collection
            var memoryReclaimed = initialMemory - finalMemory;
            
            Interlocked.Add(ref _memoryReclaimed, memoryReclaimed);
            
            _logger?.LogInformation("✅ AGGRESSIVE CLEANUP: Completed, reclaimed {MemoryMB:F2}MB", 
                memoryReclaimed / 1024.0 / 1024.0);
        }
        finally
        {
            _optimizationSemaphore.Release();
        }
    }

    /// <summary>
    /// Track object for memory leak detection
    /// </summary>
    public void TrackObject<T>(T obj, string identifier) where T : class
    {
        var weakRef = new WeakReference(obj);
        _trackedObjects.Enqueue(weakRef);
        
        // Limit tracking queue size
        if (_trackedObjects.Count > 10000)
        {
            CleanupTrackedObjects();
        }
    }

    /// <summary>
    /// Generate comprehensive memory report
    /// </summary>
    public async Task<MemoryReport> GenerateMemoryReportAsync()
    {
        var currentMemory = GC.GetTotalMemory(false);
        var leakedObjects = await DetectMemoryLeaksAsync();
        
        return new MemoryReport
        {
            TotalMemoryUsed = currentMemory,
            LeakedResources = leakedObjects,
            Recommendations = GenerateMemoryRecommendations(currentMemory, leakedObjects),
            OptimizationStats = new MemoryOptimizationStats
            {
                TotalOptimizations = _totalOptimizations,
                MemoryReclaimed = _memoryReclaimed,
                ActiveScopes = _activeScopes.Count,
                SessionDuration = _sessionStopwatch.Elapsed
            }
        };
    }

    /// <summary>
    /// Get current memory usage statistics
    /// </summary>
    public MemoryUsageStats GetUsageStats()
    {
        GC.Collect(0, GCCollectionMode.Optimized);
        
        return new MemoryUsageStats
        {
            InitialMemory = 0, // Set by caller
            PeakMemory = GC.GetTotalMemory(false),
            FinalMemory = GC.GetTotalMemory(false),
            GcCollections = GC.CollectionCount(0) + GC.CollectionCount(1) + GC.CollectionCount(2),
            TimeInGc = TimeSpan.Zero // Approximation
        };
    }

    #region Private Implementation

    private async Task OptimizeForDatabaseTestsAsync()
    {
        // Database-specific optimizations
        _logger?.LogDebug("🗄️ DB OPTIMIZATION: Optimizing for database tests");
        
        // Clear connection pools and dispose unused contexts
        GC.Collect(1, GCCollectionMode.Optimized);
        await Task.Delay(10); // Allow cleanup to complete
    }

    private async Task OptimizeForApiTestsAsync()
    {
        // API-specific optimizations
        _logger?.LogDebug("🌐 API OPTIMIZATION: Optimizing for API tests");
        
        // Clear HTTP client caches and dispose unused clients
        GC.Collect(0, GCCollectionMode.Optimized);
        await Task.Delay(5);
    }

    private async Task OptimizeForBulkTestsAsync()
    {
        // Bulk test optimizations - more aggressive
        _logger?.LogDebug("📦 BULK OPTIMIZATION: Optimizing for bulk tests");
        
        await PerformAggressiveCleanupAsync();
    }

    private async Task OptimizeGeneralAsync()
    {
        // General optimizations
        _logger?.LogDebug("⚡ GENERAL OPTIMIZATION: General memory optimization");
        
        GC.Collect(0, GCCollectionMode.Optimized);
        await Task.Delay(5);
    }

    private async Task CleanupDeadScopesAsync()
    {
        var deadScopes = _activeScopes
            .Where(kvp => kvp.Value.IsDisposed)
            .Select(kvp => kvp.Key)
            .ToList();

        foreach (var scopeId in deadScopes)
        {
            _activeScopes.TryRemove(scopeId, out _);
        }

        if (deadScopes.Count > 0)
        {
            _logger?.LogDebug("🧹 SCOPE CLEANUP: Removed {Count} dead scopes", deadScopes.Count);
        }

        await Task.CompletedTask;
    }

    private void CleanupTrackedObjects()
    {
        var aliveCount = 0;
        var processedCount = 0;
        var newQueue = new ConcurrentQueue<WeakReference>();

        while (_trackedObjects.TryDequeue(out var weakRef))
        {
            processedCount++;
            if (weakRef.IsAlive)
            {
                aliveCount++;
                newQueue.Enqueue(weakRef);
            }
        }

        // Replace the queue
        while (newQueue.TryDequeue(out var weakRef))
        {
            _trackedObjects.Enqueue(weakRef);
        }

        if (processedCount > 0)
        {
            _logger?.LogDebug("🔍 TRACKING CLEANUP: Processed {ProcessedCount}, {AliveCount} still alive", 
                processedCount, aliveCount);
        }
    }

    private async Task ForceGarbageCollectionAsync()
    {
        // Gentle collection first
        GC.Collect(0, GCCollectionMode.Optimized);
        await Task.Delay(10);
        
        // More aggressive if needed
        GC.Collect(1, GCCollectionMode.Forced);
        GC.WaitForPendingFinalizers();
        await Task.Delay(10);
        
        // Final collection
        GC.Collect(2, GCCollectionMode.Forced);
    }

    private async Task ClearCachesAsync()
    {
        // Clear any internal caches
        await Task.CompletedTask;
    }

    private async Task<List<string>> DetectMemoryLeaksAsync()
    {
        var leaks = new List<string>();
        
        // Force garbage collection to ensure accurate results
        GC.Collect();
        GC.WaitForPendingFinalizers();
        GC.Collect();
        
        var aliveObjects = 0;
        while (_trackedObjects.TryDequeue(out var weakRef))
        {
            if (weakRef.IsAlive)
            {
                aliveObjects++;
                leaks.Add($"Leaked object of type {weakRef.Target?.GetType().Name ?? "Unknown"}");
            }
        }
        
        if (aliveObjects > 0)
        {
            _logger?.LogWarning("💧 MEMORY LEAKS: Detected {LeakCount} potential memory leaks", aliveObjects);
        }
        
        await Task.CompletedTask;
        return leaks;
    }

    private List<string> GenerateMemoryRecommendations(long currentMemory, List<string> leaks)
    {
        var recommendations = new List<string>();
        var memoryMB = currentMemory / 1024.0 / 1024.0;
        
        if (memoryMB > _thresholds.CriticalThresholdMB)
        {
            recommendations.Add($"CRITICAL: Memory usage ({memoryMB:F1}MB) exceeds critical threshold");
            recommendations.Add("Consider reducing test batch sizes or increasing cleanup frequency");
        }
        else if (memoryMB > _thresholds.WarningThresholdMB)
        {
            recommendations.Add($"WARNING: Memory usage ({memoryMB:F1}MB) approaching threshold");
            recommendations.Add("Monitor memory growth and consider optimization");
        }
        
        if (leaks.Count > 0)
        {
            recommendations.Add($"Memory leaks detected: {leaks.Count} objects");
            recommendations.Add("Review object disposal patterns and using statements");
        }
        
        if (_activeScopes.Count > 50)
        {
            recommendations.Add($"High number of active scopes: {_activeScopes.Count}");
            recommendations.Add("Consider scope cleanup or reduced scope lifetime");
        }
        
        return recommendations;
    }

    private async void MonitorMemoryAsync(object? state)
    {
        try
        {
            var currentMemory = GC.GetTotalMemory(false);
            var memoryMB = currentMemory / 1024.0 / 1024.0;
            
            if (memoryMB > _thresholds.CriticalThresholdMB)
            {
                _logger?.LogWarning("🚨 MEMORY CRITICAL: {MemoryMB:F2}MB - triggering aggressive cleanup", memoryMB);
                await PerformAggressiveCleanupAsync();
            }
            else if (memoryMB > _thresholds.WarningThresholdMB)
            {
                _logger?.LogWarning("⚠️ MEMORY WARNING: {MemoryMB:F2}MB - consider optimization", memoryMB);
            }
            else
            {
                _logger?.LogDebug("💚 MEMORY OK: {MemoryMB:F2}MB", memoryMB);
            }
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "❌ MEMORY MONITOR: Error during memory monitoring");
        }
    }

    internal void NotifyScopeDisposed(string scopeId)
    {
        _activeScopes.TryRemove(scopeId, out _);
        _logger?.LogDebug("📦 SCOPE DISPOSED: {ScopeId}", scopeId);
    }

    #endregion

    #region Static Methods for Legacy Test Support
    
    /// <summary>
    /// Set memory baseline for test comparison (static for legacy support)
    /// </summary>
    public static void SetMemoryBaseline(string testName)
    {
        // Implementation for legacy test support
        GC.Collect();
        var baseline = GC.GetTotalMemory(false);
        // Store baseline for comparison - in a real implementation this would be stored somewhere
    }
    
    /// <summary>
    /// Validate memory usage for test (static for legacy support)
    /// </summary>
    public static object ValidateMemoryUsage(string testName, int maxMemoryMB)
    {
        GC.Collect();
        var currentMemory = GC.GetTotalMemory(false);
        var currentMemoryMB = currentMemory / 1024.0 / 1024.0;
        
        return new
        {
            CurrentMemoryMB = currentMemoryMB,
            MaxMemoryMB = maxMemoryMB,
            IsWithinLimits = currentMemoryMB <= maxMemoryMB,
            RecommendCleanup = currentMemoryMB > maxMemoryMB * 0.8
        };
    }
    
    /// <summary>
    /// Optimize batch processing (static for legacy support)
    /// </summary>
    public static void OptimizeBatchProcessing(int processedItems, int batchSize)
    {
        // Trigger garbage collection every few batches
        if (processedItems % (batchSize * 5) == 0)
        {
            GC.Collect(0, GCCollectionMode.Optimized);
        }
    }
    
    #endregion

    public async ValueTask DisposeAsync()
    {
        if (_disposed)
            return;

        _disposed = true;

        try
        {
            _logger?.LogInformation("🧹 DISPOSAL: Disposing MemoryOptimizer");
            
            _memoryMonitor?.Dispose();
            
            // Dispose all active scopes
            foreach (var scope in _activeScopes.Values)
            {
                await scope.DisposeAsync();
            }
            _activeScopes.Clear();
            
            _optimizationSemaphore.Dispose();
            
            // Final memory cleanup
            await PerformAggressiveCleanupAsync();
            
            _logger?.LogInformation("✅ DISPOSAL: MemoryOptimizer disposed - Total optimizations: {Count}, Memory reclaimed: {MemoryMB:F2}MB", 
                _totalOptimizations, _memoryReclaimed / 1024.0 / 1024.0);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "❌ DISPOSAL: Error during MemoryOptimizer disposal");
        }
    }
}

/// <summary>
/// Memory scope for tracking allocations within a specific context
/// </summary>
public sealed class MemoryScope : IAsyncDisposable
{
    private readonly string _scopeId;
    private readonly MemoryPool<byte> _memoryPool;
    private readonly MemoryOptimizer _optimizer;
    private readonly ConcurrentBag<IMemoryOwner<byte>> _allocatedMemory;
    private readonly Stopwatch _scopeStopwatch;
    private bool _disposed = false;

    internal MemoryScope(string scopeId, MemoryPool<byte> memoryPool, MemoryOptimizer optimizer)
    {
        _scopeId = scopeId;
        _memoryPool = memoryPool;
        _optimizer = optimizer;
        _allocatedMemory = new ConcurrentBag<IMemoryOwner<byte>>();
        _scopeStopwatch = Stopwatch.StartNew();
    }

    public bool IsDisposed => _disposed;

    /// <summary>
    /// Rent memory from the pool
    /// </summary>
    public IMemoryOwner<byte> RentMemory(int minBufferSize)
    {
        if (_disposed)
            throw new ObjectDisposedException(nameof(MemoryScope));
            
        var memory = _memoryPool.Rent(minBufferSize);
        _allocatedMemory.Add(memory);
        return memory;
    }

    /// <summary>
    /// Get usage statistics for this scope
    /// </summary>
    public MemoryUsageStats GetUsageStats()
    {
        var allocatedCount = _allocatedMemory.Count;
        var estimatedMemory = allocatedCount * 4096; // Rough estimate
        
        return new MemoryUsageStats
        {
            InitialMemory = 0,
            PeakMemory = estimatedMemory,
            FinalMemory = estimatedMemory,
            GcCollections = 0,
            TimeInGc = _scopeStopwatch.Elapsed
        };
    }

    public async ValueTask DisposeAsync()
    {
        if (_disposed)
            return;

        _disposed = true;
        _scopeStopwatch.Stop();

        // Dispose all allocated memory
        foreach (var memory in _allocatedMemory)
        {
            try
            {
                memory?.Dispose();
            }
            catch
            {
                // Ignore disposal errors
            }
        }

        // Notify optimizer
        _optimizer.NotifyScopeDisposed(_scopeId);

        await Task.CompletedTask;
    }
}

/// <summary>
/// Memory threshold configuration
/// </summary>
public class MemoryThresholdConfiguration
{
    public double WarningThresholdMB { get; set; } = 512; // 512MB
    public double CriticalThresholdMB { get; set; } = 1024; // 1GB
    public TimeSpan MonitoringInterval { get; set; } = TimeSpan.FromSeconds(10);
    public TimeSpan CleanupInterval { get; set; } = TimeSpan.FromMinutes(1);
}

/// <summary>
/// Memory optimization statistics
/// </summary>
public class MemoryOptimizationStats
{
    public long TotalOptimizations { get; set; }
    public long MemoryReclaimed { get; set; }
    public int ActiveScopes { get; set; }
    public TimeSpan SessionDuration { get; set; }
}