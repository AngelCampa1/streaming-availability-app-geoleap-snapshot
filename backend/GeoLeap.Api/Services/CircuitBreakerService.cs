using System;
using System.Collections.Concurrent;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using GeoLeap.Api.Exceptions;

namespace GeoLeap.Api.Services;

public class CircuitBreakerService : ICircuitBreakerService
{
    private readonly ILogger<CircuitBreakerService> _logger;
    private readonly CircuitBreakerOptions _options;
    private readonly ConcurrentDictionary<string, CircuitBreaker> _circuitBreakers;

    public CircuitBreakerService(ILogger<CircuitBreakerService> logger, IOptions<CircuitBreakerOptions> options)
    {
        _logger = logger;
        _options = options.Value;
        _circuitBreakers = new ConcurrentDictionary<string, CircuitBreaker>();
    }

    public async Task<T> ExecuteAsync<T>(string serviceName, Func<Task<T>> operation)
    {
        var circuitBreaker = GetOrCreateCircuitBreaker(serviceName);
        return await circuitBreaker.ExecuteAsync(operation);
    }

    public async Task ExecuteAsync(string serviceName, Func<Task> operation)
    {
        var circuitBreaker = GetOrCreateCircuitBreaker(serviceName);
        await circuitBreaker.ExecuteAsync(async () => 
        {
            await operation();
            return 0; // dummy return value
        });
    }

    public CircuitBreakerState GetState(string serviceName)
    {
        var circuitBreaker = GetOrCreateCircuitBreaker(serviceName);
        return circuitBreaker.State;
    }

    public async Task ResetAsync(string serviceName)
    {
        if (_circuitBreakers.TryGetValue(serviceName, out var circuitBreaker))
        {
            await circuitBreaker.ResetAsync();
            _logger.LogInformation("Circuit breaker for service {ServiceName} has been reset", serviceName);
        }
    }

    public async Task<CircuitBreakerMetrics> GetMetricsAsync(string serviceName)
    {
        var circuitBreaker = GetOrCreateCircuitBreaker(serviceName);
        return await circuitBreaker.GetMetricsAsync();
    }

    private CircuitBreaker GetOrCreateCircuitBreaker(string serviceName)
    {
        return _circuitBreakers.GetOrAdd(serviceName, _ => new CircuitBreaker(serviceName, _options, _logger));
    }
}

public class CircuitBreakerOptions
{
    public int FailureThreshold { get; set; } = 5;
    public TimeSpan OpenTimeout { get; set; } = TimeSpan.FromMinutes(1);
    public int HalfOpenMaxRetries { get; set; } = 3;
    public TimeSpan SamplingDuration { get; set; } = TimeSpan.FromMinutes(10);
    public int MinimumThroughput { get; set; } = 10;
}

public class CircuitBreaker
{
    private readonly string _serviceName;
    private readonly CircuitBreakerOptions _options;
    private readonly ILogger _logger;
    // FIXED: Week 1 Day 3 - Replaced lock with SemaphoreSlim for async-safe synchronization
    private readonly SemaphoreSlim _semaphore = new SemaphoreSlim(1, 1);

    private CircuitBreakerState _state = CircuitBreakerState.Closed;
    private int _failureCount = 0;
    private int _successCount = 0;
    private int _halfOpenRetryCount = 0;
    private DateTime? _lastFailureTime;
    private DateTime? _lastSuccessTime;
    private DateTime? _openedTime;

    public CircuitBreakerState State
    {
        get
        {
            // FIXED: Week 1 Day 3 - Use synchronous access for property getter
            // State changes are handled in async methods, this provides quick read-only access
            return _state;
        }
    }

    public CircuitBreaker(string serviceName, CircuitBreakerOptions options, ILogger logger)
    {
        _serviceName = serviceName;
        _options = options;
        _logger = logger;
    }

    public async Task<T> ExecuteAsync<T>(Func<Task<T>> operation)
    {
        // FIXED: Week 1 Day 3 - Use SemaphoreSlim for async-safe state check
        await _semaphore.WaitAsync();
        try
        {
            UpdateStateIfNecessary();

            if (_state == CircuitBreakerState.Open)
            {
                _logger.LogWarning("Circuit breaker for service {ServiceName} is open, rejecting request", _serviceName);
                throw new CircuitBreakerOpenException(_serviceName, _openedTime?.Add(_options.OpenTimeout));
            }

            if (_state == CircuitBreakerState.HalfOpen && _halfOpenRetryCount >= _options.HalfOpenMaxRetries)
            {
                _logger.LogWarning("Circuit breaker for service {ServiceName} is half-open and retry limit reached", _serviceName);
                throw new CircuitBreakerOpenException(_serviceName);
            }
        }
        finally
        {
            _semaphore.Release();
        }

        try
        {
            var result = await operation();
            await OnSuccessAsync();
            return result;
        }
        catch (Exception ex)
        {
            await OnFailureAsync(ex);
            throw;
        }
    }

    public async Task ResetAsync()
    {
        // FIXED: Week 1 Day 3 - Use SemaphoreSlim for async-safe reset
        await _semaphore.WaitAsync();
        try
        {
            _state = CircuitBreakerState.Closed;
            _failureCount = 0;
            _successCount = 0;
            _halfOpenRetryCount = 0;
            _lastFailureTime = null;
            _lastSuccessTime = null;
            _openedTime = null;
        }
        finally
        {
            _semaphore.Release();
        }
    }

    public async Task<CircuitBreakerMetrics> GetMetricsAsync()
    {
        // FIXED: Week 1 Day 3 - Use SemaphoreSlim for async-safe metrics retrieval
        await _semaphore.WaitAsync();
        try
        {
            UpdateStateIfNecessary();

            var totalCount = _failureCount + _successCount;
            var failureRate = totalCount > 0 ? (double)_failureCount / totalCount : 0;

            return new CircuitBreakerMetrics
            {
                ServiceName = _serviceName,
                State = _state,
                FailureCount = _failureCount,
                SuccessCount = _successCount,
                LastFailureTime = _lastFailureTime,
                LastSuccessTime = _lastSuccessTime,
                NextRetryTime = _openedTime?.Add(_options.OpenTimeout).Subtract(DateTime.UtcNow),
                FailureRate = failureRate
            };
        }
        finally
        {
            _semaphore.Release();
        }
    }

    private async Task OnSuccessAsync()
    {
        // FIXED: Week 1 Day 3 - Use SemaphoreSlim for async-safe success handling
        await _semaphore.WaitAsync();
        try
        {
            _successCount++;
            _lastSuccessTime = DateTime.UtcNow;

            if (_state == CircuitBreakerState.HalfOpen)
            {
                _logger.LogInformation("Circuit breaker for service {ServiceName} closing after successful request", _serviceName);
                _state = CircuitBreakerState.Closed;
                _failureCount = 0;
                _halfOpenRetryCount = 0;
            }
        }
        finally
        {
            _semaphore.Release();
        }
    }

    private async Task OnFailureAsync(Exception exception)
    {
        // FIXED: Week 1 Day 3 - Use SemaphoreSlim for async-safe failure handling
        await _semaphore.WaitAsync();
        try
        {
            _failureCount++;
            _lastFailureTime = DateTime.UtcNow;

            _logger.LogWarning(exception, "Request failed for service {ServiceName}. Failure count: {FailureCount}",
                _serviceName, _failureCount);

            if (_state == CircuitBreakerState.HalfOpen)
            {
                _halfOpenRetryCount++;
                if (_halfOpenRetryCount >= _options.HalfOpenMaxRetries)
                {
                    _logger.LogWarning("Circuit breaker for service {ServiceName} opening after half-open failures", _serviceName);
                    _state = CircuitBreakerState.Open;
                    _openedTime = DateTime.UtcNow;
                }
            }
            else if (_state == CircuitBreakerState.Closed && _failureCount >= _options.FailureThreshold)
            {
                var totalCount = _failureCount + _successCount;
                if (totalCount >= _options.MinimumThroughput)
                {
                    _logger.LogWarning("Circuit breaker for service {ServiceName} opening after {FailureCount} failures",
                        _serviceName, _failureCount);
                    _state = CircuitBreakerState.Open;
                    _openedTime = DateTime.UtcNow;
                }
            }
        }
        finally
        {
            _semaphore.Release();
        }
    }

    private void UpdateStateIfNecessary()
    {
        if (_state == CircuitBreakerState.Open && _openedTime.HasValue)
        {
            var timeSinceOpened = DateTime.UtcNow - _openedTime.Value;
            if (timeSinceOpened >= _options.OpenTimeout)
            {
                _logger.LogInformation("Circuit breaker for service {ServiceName} moving to half-open state", _serviceName);
                _state = CircuitBreakerState.HalfOpen;
                _halfOpenRetryCount = 0;
            }
        }

        // Reset counters if sampling duration has passed
        if (_lastFailureTime.HasValue || _lastSuccessTime.HasValue)
        {
            var lastActivity = _lastFailureTime > _lastSuccessTime ? _lastFailureTime : _lastSuccessTime;
            if (lastActivity.HasValue && DateTime.UtcNow - lastActivity.Value >= _options.SamplingDuration)
            {
                _failureCount = 0;
                _successCount = 0;
            }
        }
    }
}