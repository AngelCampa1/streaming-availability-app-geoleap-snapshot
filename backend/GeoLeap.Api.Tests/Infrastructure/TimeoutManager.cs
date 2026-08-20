using System.Collections.Concurrent;
using System.Diagnostics;
using Microsoft.Extensions.Logging;

namespace GeoLeap.Api.Tests.Infrastructure;

/// <summary>
/// Timeout Manager implementing US82 timeout resolution patterns
/// Provides comprehensive timeout management with proper async/await patterns
/// </summary>
public sealed class TimeoutManager : IDisposable
{
    private readonly ConcurrentDictionary<string, TimeoutContext> _activeTimeouts;
    private readonly TimeoutPolicyRegistry _policyRegistry;
    private readonly Timer _monitoringTimer;
    private readonly ILogger<TimeoutManager>? _logger;
    private bool _disposed = false;

    // Timeout statistics
    private long _totalTimeouts = 0;
    private long _preventedTimeouts = 0;
    private readonly Stopwatch _sessionStopwatch = Stopwatch.StartNew();

    public TimeoutManager(ILogger<TimeoutManager>? logger = null)
    {
        _logger = logger;
        _activeTimeouts = new ConcurrentDictionary<string, TimeoutContext>();
        _policyRegistry = new TimeoutPolicyRegistry();
        
        // Start monitoring timer
        _monitoringTimer = new Timer(MonitorTimeoutsAsync, null, TimeSpan.FromSeconds(1), TimeSpan.FromSeconds(5));
        
        _logger?.LogInformation("⏰ TIMEOUT MANAGER: Initialized with monitoring interval 5s");
    }

    /// <summary>
    /// Create timeout context with automatic cancellation
    /// </summary>
    public TimeoutContext CreateTimeout(int timeoutMs, string? operationType = null)
    {
        var timeoutId = Guid.NewGuid().ToString("N")[..8];
        var policy = _policyRegistry.GetPolicy(operationType ?? "default");
        
        var effectiveTimeout = Math.Min(timeoutMs, policy.MaxTimeoutMs);
        var context = new TimeoutContext(timeoutId, effectiveTimeout, policy, this);
        
        _activeTimeouts.TryAdd(timeoutId, context);
        
        _logger?.LogDebug("⏰ TIMEOUT CREATED: {TimeoutId} for {TimeoutMs}ms ({OperationType})", 
            timeoutId, effectiveTimeout, operationType ?? "default");
        
        return context;
    }

    /// <summary>
    /// Create timeout with custom cancellation token source
    /// </summary>
    public TimeoutContext CreateTimeoutWithSource(TimeSpan timeout, CancellationTokenSource? parentSource = null)
    {
        var timeoutId = Guid.NewGuid().ToString("N")[..8];
        var policy = _policyRegistry.GetPolicy("custom");
        
        var combinedSource = parentSource != null
            ? CancellationTokenSource.CreateLinkedTokenSource(parentSource.Token)
            : new CancellationTokenSource();
            
        var context = new TimeoutContext(timeoutId, (int)timeout.TotalMilliseconds, policy, this, combinedSource);
        
        _activeTimeouts.TryAdd(timeoutId, context);
        
        _logger?.LogDebug("⏰ CUSTOM TIMEOUT: {TimeoutId} for {TimeoutMs}ms with parent token", 
            timeoutId, timeout.TotalMilliseconds);
        
        return context;
    }

    /// <summary>
    /// Execute operation with timeout and retry policy
    /// </summary>
    public async Task<T> ExecuteWithTimeoutAsync<T>(
        Func<CancellationToken, Task<T>> operation,
        string operationType,
        int timeoutMs = 30000,
        CancellationToken parentToken = default)
    {
        var policy = _policyRegistry.GetPolicy(operationType);
        var attempts = 0;
        Exception? lastException = null;

        while (attempts < policy.MaxRetries)
        {
            attempts++;
            
            using var timeoutContext = CreateTimeout(timeoutMs, operationType);
            var combinedToken = CombineTokens(timeoutContext.Token, parentToken);

            try
            {
                var result = await operation(combinedToken);
                
                if (attempts > 1)
                {
                    Interlocked.Increment(ref _preventedTimeouts);
                    _logger?.LogInformation("✅ RETRY SUCCESS: {OperationType} succeeded on attempt {Attempt}", 
                        operationType, attempts);
                }
                
                return result;
            }
            catch (OperationCanceledException) when (timeoutContext.Token.IsCancellationRequested)
            {
                Interlocked.Increment(ref _totalTimeouts);
                lastException = new TimeoutException($"Operation '{operationType}' timed out after {timeoutMs}ms (attempt {attempts})");
                
                _logger?.LogWarning("⏰ TIMEOUT: {OperationType} attempt {Attempt} timed out", 
                    operationType, attempts);
                
                if (attempts < policy.MaxRetries)
                {
                    var delayMs = policy.CalculateBackoffDelay(attempts);
                    _logger?.LogInformation("🔄 RETRY: Retrying {OperationType} in {DelayMs}ms", 
                        operationType, delayMs);
                    
                    await Task.Delay(delayMs, parentToken);
                }
            }
            catch (OperationCanceledException) when (parentToken.IsCancellationRequested)
            {
                throw; // Parent cancellation - don't retry
            }
            catch (Exception ex)
            {
                lastException = ex;
                
                if (!policy.ShouldRetryOnException(ex))
                {
                    throw;
                }
                
                _logger?.LogWarning(ex, "⚠️ EXCEPTION: {OperationType} attempt {Attempt} failed", 
                    operationType, attempts);
                
                if (attempts < policy.MaxRetries)
                {
                    var delayMs = policy.CalculateBackoffDelay(attempts);
                    await Task.Delay(delayMs, parentToken);
                }
            }
        }

        throw lastException ?? new TimeoutException($"Operation '{operationType}' failed after {attempts} attempts");
    }

    /// <summary>
    /// Cancel all active timeouts
    /// </summary>
    public void CancelAll()
    {
        var activeTimeouts = _activeTimeouts.Values.ToArray();
        
        foreach (var timeout in activeTimeouts)
        {
            try
            {
                timeout.Cancel();
            }
            catch (Exception ex)
            {
                _logger?.LogWarning(ex, "⚠️ CANCEL ERROR: Failed to cancel timeout {TimeoutId}", 
                    timeout.TimeoutId);
            }
        }
        
        _activeTimeouts.Clear();
        
        _logger?.LogInformation("🚫 CANCEL ALL: Cancelled {Count} active timeouts", activeTimeouts.Length);
    }

    /// <summary>
    /// Generate timeout report for performance analysis
    /// </summary>
    public TimeoutReport GenerateTimeoutReport()
    {
        var activeCount = _activeTimeouts.Count;
        var patterns = AnalyzeTimeoutPatterns();
        
        return new TimeoutReport
        {
            TotalTimeouts = (int)_totalTimeouts,
            PreventedTimeouts = (int)_preventedTimeouts,
            ActiveTimeouts = activeCount,
            TimeoutPatterns = patterns,
            SessionDuration = _sessionStopwatch.Elapsed,
            SuccessRate = _totalTimeouts > 0 ? (double)_preventedTimeouts / (_totalTimeouts + _preventedTimeouts) : 1.0
        };
    }

    #region Private Implementation

    private CancellationToken CombineTokens(CancellationToken timeoutToken, CancellationToken parentToken)
    {
        if (parentToken == CancellationToken.None)
            return timeoutToken;
            
        return CancellationTokenSource.CreateLinkedTokenSource(timeoutToken, parentToken).Token;
    }

    private List<string> AnalyzeTimeoutPatterns()
    {
        var patterns = new List<string>();
        
        if (_totalTimeouts > 10)
        {
            patterns.Add($"High timeout frequency: {_totalTimeouts} timeouts in {_sessionStopwatch.Elapsed:hh\\:mm\\:ss}");
        }
        
        if (_totalTimeouts > 0 && _preventedTimeouts > _totalTimeouts * 2)
        {
            patterns.Add("Retry policy effectively preventing timeouts");
        }
        
        var activeCount = _activeTimeouts.Count;
        if (activeCount > 50)
        {
            patterns.Add($"High number of concurrent operations: {activeCount}");
        }
        
        return patterns;
    }

    private async void MonitorTimeoutsAsync(object? state)
    {
        try
        {
            var now = DateTime.UtcNow;
            var expiredTimeouts = new List<string>();
            
            foreach (var kvp in _activeTimeouts)
            {
                var timeout = kvp.Value;
                
                if (timeout.IsExpired(now))
                {
                    expiredTimeouts.Add(kvp.Key);
                    
                    try
                    {
                        timeout.Cancel();
                    }
                    catch (Exception ex)
                    {
                        _logger?.LogWarning(ex, "⚠️ MONITOR: Failed to cancel expired timeout {TimeoutId}", 
                            kvp.Key);
                    }
                }
            }
            
            // Cleanup expired timeouts
            foreach (var timeoutId in expiredTimeouts)
            {
                _activeTimeouts.TryRemove(timeoutId, out _);
            }
            
            if (expiredTimeouts.Count > 0)
            {
                _logger?.LogDebug("🧹 MONITOR: Cleaned up {Count} expired timeouts", expiredTimeouts.Count);
            }
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "❌ MONITOR: Error during timeout monitoring");
        }
        
        await Task.CompletedTask;
    }

    internal void NotifyTimeoutDisposed(string timeoutId)
    {
        _activeTimeouts.TryRemove(timeoutId, out _);
        _logger?.LogDebug("⏰ DISPOSED: Timeout {TimeoutId}", timeoutId);
    }

    #endregion

    public void Dispose()
    {
        if (_disposed)
            return;

        _disposed = true;

        try
        {
            _logger?.LogInformation("🧹 DISPOSAL: Disposing TimeoutManager");
            
            _monitoringTimer?.Dispose();
            CancelAll();
            
            _logger?.LogInformation("✅ DISPOSAL: TimeoutManager disposed - Total timeouts: {Total}, Prevented: {Prevented}", 
                _totalTimeouts, _preventedTimeouts);
        }
        catch (Exception ex)
        {
            _logger?.LogError(ex, "❌ DISPOSAL: Error during TimeoutManager disposal");
        }
    }
}

/// <summary>
/// Timeout context for managing individual operation timeouts
/// </summary>
public sealed class TimeoutContext : IDisposable
{
    private readonly CancellationTokenSource _cancellationTokenSource;
    private readonly TimeoutPolicy _policy;
    private readonly TimeoutManager _manager;
    private readonly DateTime _startTime;
    private readonly int _timeoutMs;
    private bool _disposed = false;

    public string TimeoutId { get; }
    public CancellationToken Token => _cancellationTokenSource.Token;
    public bool IsExpired(DateTime currentTime) => (currentTime - _startTime).TotalMilliseconds > _timeoutMs;

    internal TimeoutContext(string timeoutId, int timeoutMs, TimeoutPolicy policy, TimeoutManager manager, CancellationTokenSource? customSource = null)
    {
        TimeoutId = timeoutId;
        _timeoutMs = timeoutMs;
        _policy = policy;
        _manager = manager;
        _startTime = DateTime.UtcNow;
        
        _cancellationTokenSource = customSource ?? new CancellationTokenSource();
        _cancellationTokenSource.CancelAfter(timeoutMs);
    }

    public void Cancel()
    {
        if (!_disposed && !_cancellationTokenSource.IsCancellationRequested)
        {
            _cancellationTokenSource.Cancel();
        }
    }

    public void Dispose()
    {
        if (_disposed)
            return;

        _disposed = true;

        try
        {
            _cancellationTokenSource?.Dispose();
            _manager.NotifyTimeoutDisposed(TimeoutId);
        }
        catch
        {
            // Ignore disposal errors
        }
    }
}

/// <summary>
/// Timeout policy registry for different operation types
/// </summary>
public class TimeoutPolicyRegistry
{
    private readonly ConcurrentDictionary<string, TimeoutPolicy> _policies;

    public TimeoutPolicyRegistry()
    {
        _policies = new ConcurrentDictionary<string, TimeoutPolicy>();
        
        // Register default policies
        RegisterDefaultPolicies();
    }

    public TimeoutPolicy GetPolicy(string operationType)
    {
        return _policies.GetOrAdd(operationType, _ => CreateDefaultPolicy());
    }

    public void RegisterPolicy(string operationType, TimeoutPolicy policy)
    {
        _policies.AddOrUpdate(operationType, policy, (_, _) => policy);
    }

    private void RegisterDefaultPolicies()
    {
        // Database operations
        RegisterPolicy("database", new TimeoutPolicy
        {
            MaxTimeoutMs = 60000, // 1 minute
            MaxRetries = 3,
            BaseDelayMs = 1000,
            MaxDelayMs = 10000,
            BackoffMultiplier = 2.0
        });

        // HTTP operations
        RegisterPolicy("http", new TimeoutPolicy
        {
            MaxTimeoutMs = 30000, // 30 seconds
            MaxRetries = 2,
            BaseDelayMs = 500,
            MaxDelayMs = 5000,
            BackoffMultiplier = 1.5
        });

        // File operations
        RegisterPolicy("file", new TimeoutPolicy
        {
            MaxTimeoutMs = 15000, // 15 seconds
            MaxRetries = 1,
            BaseDelayMs = 100,
            MaxDelayMs = 1000,
            BackoffMultiplier = 1.0
        });

        // Default policy
        RegisterPolicy("default", CreateDefaultPolicy());
    }

    private TimeoutPolicy CreateDefaultPolicy()
    {
        return new TimeoutPolicy
        {
            MaxTimeoutMs = 30000, // 30 seconds
            MaxRetries = 2,
            BaseDelayMs = 1000,
            MaxDelayMs = 5000,
            BackoffMultiplier = 2.0
        };
    }
}

/// <summary>
/// Timeout policy configuration
/// </summary>
public class TimeoutPolicy
{
    public int MaxTimeoutMs { get; set; } = 30000;
    public int MaxRetries { get; set; } = 2;
    public int BaseDelayMs { get; set; } = 1000;
    public int MaxDelayMs { get; set; } = 5000;
    public double BackoffMultiplier { get; set; } = 2.0;
    public HashSet<Type> RetriableExceptions { get; set; } = new()
    {
        typeof(TimeoutException),
        typeof(TaskCanceledException),
        typeof(HttpRequestException)
    };

    public int CalculateBackoffDelay(int attempt)
    {
        var delay = BaseDelayMs * Math.Pow(BackoffMultiplier, attempt - 1);
        return (int)Math.Min(delay, MaxDelayMs);
    }

    public bool ShouldRetryOnException(Exception exception)
    {
        return RetriableExceptions.Contains(exception.GetType()) ||
               exception.InnerException != null && RetriableExceptions.Contains(exception.InnerException.GetType());
    }
}