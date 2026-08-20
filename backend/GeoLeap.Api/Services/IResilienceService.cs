using Polly;

namespace GeoLeap.Api.Services;

public interface IResilienceService
{
    /// <summary>
    /// Get a retry policy for external API calls with exponential backoff
    /// </summary>
    ResiliencePipeline GetRetryPipeline(string operationName);

    /// <summary>
    /// Get a circuit breaker pipeline for critical dependencies
    /// </summary>
    ResiliencePipeline GetCircuitBreakerPipeline(string serviceName);

    /// <summary>
    /// Get a combined pipeline with retry, circuit breaker, and timeout
    /// </summary>
    ResiliencePipeline GetCompletePipeline(string serviceName);

    /// <summary>
    /// Execute an async operation with retry logic
    /// </summary>
    Task<T> ExecuteWithRetryAsync<T>(Func<CancellationToken, Task<T>> operation, string operationName, CancellationToken cancellationToken = default);

    /// <summary>
    /// Execute an async operation with circuit breaker protection
    /// </summary>
    Task<T> ExecuteWithCircuitBreakerAsync<T>(Func<CancellationToken, Task<T>> operation, string serviceName, CancellationToken cancellationToken = default);

    /// <summary>
    /// Execute an async operation with full resilience (retry + circuit breaker + timeout)
    /// </summary>
    Task<T> ExecuteWithFullResilienceAsync<T>(Func<CancellationToken, Task<T>> operation, string serviceName, CancellationToken cancellationToken = default);
}