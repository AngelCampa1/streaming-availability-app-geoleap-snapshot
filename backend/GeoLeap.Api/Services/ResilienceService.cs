using Polly;
using Polly.CircuitBreaker;
using Polly.Retry;
using Polly.Timeout;
using GeoLeap.Api.Exceptions;
using System.Collections.Concurrent;

namespace GeoLeap.Api.Services;

public class ResilienceService : IResilienceService
{
    private readonly ILogger<ResilienceService> _logger;
    private readonly ConcurrentDictionary<string, ResiliencePipeline> _pipelines = new();

    public ResilienceService(ILogger<ResilienceService> logger)
    {
        _logger = logger;
    }

    public ResiliencePipeline GetRetryPipeline(string operationName)
    {
        return _pipelines.GetOrAdd($"retry_{operationName}", _ =>
        {
            return new ResiliencePipelineBuilder()
                .AddRetry(new RetryStrategyOptions
                {
                    ShouldHandle = new PredicateBuilder().Handle<HttpRequestException>()
                        .Handle<TaskCanceledException>()
                        .Handle<ExternalServiceException>(),
                    MaxRetryAttempts = 3,
                    Delay = TimeSpan.FromSeconds(1),
                    BackoffType = DelayBackoffType.Exponential,
                    UseJitter = true,
                    OnRetry = args =>
                    {
                        _logger.LogWarning("Retry {AttemptNumber} for {OperationName} after {Delay}ms. Outcome: {Outcome}",
                            args.AttemptNumber,
                            operationName,
                            args.RetryDelay.TotalMilliseconds,
                            args.Outcome);
                        return ValueTask.CompletedTask;
                    }
                })
                .Build();
        });
    }

    public ResiliencePipeline GetCircuitBreakerPipeline(string serviceName)
    {
        return _pipelines.GetOrAdd($"cb_{serviceName}", _ =>
        {
            return new ResiliencePipelineBuilder()
                .AddCircuitBreaker(new CircuitBreakerStrategyOptions
                {
                    ShouldHandle = new PredicateBuilder().Handle<HttpRequestException>()
                        .Handle<ExternalServiceException>()
                        .Handle<TaskCanceledException>(),
                    FailureRatio = 0.5, // Open circuit when 50% of requests fail
                    SamplingDuration = TimeSpan.FromSeconds(30), // Sample period
                    MinimumThroughput = 5, // Minimum requests before circuit can open
                    BreakDuration = TimeSpan.FromSeconds(30), // How long circuit stays open
                    OnOpened = args =>
                    {
                        _logger.LogError("Circuit breaker OPENED for {ServiceName}. Outcome: {Outcome}",
                            serviceName, args.Outcome);
                        return ValueTask.CompletedTask;
                    },
                    OnClosed = args =>
                    {
                        _logger.LogInformation("Circuit breaker CLOSED for {ServiceName}",
                            serviceName);
                        return ValueTask.CompletedTask;
                    },
                    OnHalfOpened = args =>
                    {
                        _logger.LogWarning("Circuit breaker HALF-OPEN for {ServiceName}",
                            serviceName);
                        return ValueTask.CompletedTask;
                    }
                })
                .Build();
        });
    }

    public ResiliencePipeline GetCompletePipeline(string serviceName)
    {
        return _pipelines.GetOrAdd($"complete_{serviceName}", _ =>
        {
            return new ResiliencePipelineBuilder()
                // Add timeout first
                .AddTimeout(new TimeoutStrategyOptions
                {
                    Timeout = TimeSpan.FromSeconds(30),
                    OnTimeout = args =>
                    {
                        _logger.LogWarning("Timeout occurred for {ServiceName} after {Timeout}ms",
                            serviceName, args.Timeout.TotalMilliseconds);
                        return ValueTask.CompletedTask;
                    }
                })
                // Add retry strategy
                .AddRetry(new RetryStrategyOptions
                {
                    ShouldHandle = new PredicateBuilder().Handle<HttpRequestException>()
                        .Handle<TaskCanceledException>()
                        .Handle<ExternalServiceException>()
                        .Handle<TimeoutRejectedException>(),
                    MaxRetryAttempts = 3,
                    Delay = TimeSpan.FromSeconds(1),
                    BackoffType = DelayBackoffType.Exponential,
                    UseJitter = true,
                    OnRetry = args =>
                    {
                        _logger.LogWarning("Retry {AttemptNumber} for {ServiceName} after {Delay}ms. Outcome: {Outcome}",
                            args.AttemptNumber,
                            serviceName,
                            args.RetryDelay.TotalMilliseconds,
                            args.Outcome);
                        return ValueTask.CompletedTask;
                    }
                })
                // Add circuit breaker last
                .AddCircuitBreaker(new CircuitBreakerStrategyOptions
                {
                    ShouldHandle = new PredicateBuilder().Handle<HttpRequestException>()
                        .Handle<ExternalServiceException>()
                        .Handle<TaskCanceledException>()
                        .Handle<TimeoutRejectedException>(),
                    FailureRatio = 0.5,
                    SamplingDuration = TimeSpan.FromSeconds(30),
                    MinimumThroughput = 5,
                    BreakDuration = TimeSpan.FromSeconds(30),
                    OnOpened = args =>
                    {
                        _logger.LogError("Circuit breaker OPENED for {ServiceName}. Outcome: {Outcome}",
                            serviceName, args.Outcome);
                        return ValueTask.CompletedTask;
                    },
                    OnClosed = args =>
                    {
                        _logger.LogInformation("Circuit breaker CLOSED for {ServiceName}",
                            serviceName);
                        return ValueTask.CompletedTask;
                    },
                    OnHalfOpened = args =>
                    {
                        _logger.LogWarning("Circuit breaker HALF-OPEN for {ServiceName}",
                            serviceName);
                        return ValueTask.CompletedTask;
                    }
                })
                .Build();
        });
    }

    public async Task<T> ExecuteWithRetryAsync<T>(Func<CancellationToken, Task<T>> operation, string operationName, CancellationToken cancellationToken = default)
    {
        var pipeline = GetRetryPipeline(operationName);
        return await pipeline.ExecuteAsync(async (token) =>
        {
            try
            {
                return await operation(token);
            }
            catch (Exception ex) when (!(ex is OperationCanceledException))
            {
                _logger.LogError(ex, "Error in operation {OperationName}", operationName);
                throw;
            }
        }, cancellationToken);
    }

    public async Task<T> ExecuteWithCircuitBreakerAsync<T>(Func<CancellationToken, Task<T>> operation, string serviceName, CancellationToken cancellationToken = default)
    {
        var pipeline = GetCircuitBreakerPipeline(serviceName);
        return await pipeline.ExecuteAsync(async (token) =>
        {
            try
            {
                return await operation(token);
            }
            catch (BrokenCircuitException ex)
            {
                _logger.LogError("Circuit breaker is open for {ServiceName}", serviceName);
                throw new ExternalServiceException(serviceName, "Service is temporarily unavailable due to repeated failures", ex);
            }
            catch (Exception ex) when (!(ex is OperationCanceledException))
            {
                _logger.LogError(ex, "Error in service {ServiceName}", serviceName);
                throw;
            }
        }, cancellationToken);
    }

    public async Task<T> ExecuteWithFullResilienceAsync<T>(Func<CancellationToken, Task<T>> operation, string serviceName, CancellationToken cancellationToken = default)
    {
        var pipeline = GetCompletePipeline(serviceName);
        return await pipeline.ExecuteAsync(async (token) =>
        {
            try
            {
                return await operation(token);
            }
            catch (BrokenCircuitException ex)
            {
                _logger.LogError("Circuit breaker is open for {ServiceName}", serviceName);
                throw new ExternalServiceException(serviceName, "Service is temporarily unavailable due to repeated failures", ex);
            }
            catch (TimeoutRejectedException ex)
            {
                _logger.LogError("Timeout occurred for {ServiceName}", serviceName);
                throw new ExternalServiceException(serviceName, "Service request timed out", ex);
            }
            catch (Exception ex) when (!(ex is OperationCanceledException))
            {
                _logger.LogError(ex, "Error in service {ServiceName}", serviceName);
                throw;
            }
        }, cancellationToken);
    }
}