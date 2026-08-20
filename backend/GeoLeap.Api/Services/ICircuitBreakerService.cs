using System;
using System.Threading.Tasks;

namespace GeoLeap.Api.Services;

public interface ICircuitBreakerService
{
    Task<T> ExecuteAsync<T>(string serviceName, Func<Task<T>> operation);
    Task ExecuteAsync(string serviceName, Func<Task> operation);
    CircuitBreakerState GetState(string serviceName);
    // FIXED: Week 1 Day 3 - Made async for SemaphoreSlim compatibility
    Task ResetAsync(string serviceName);
    Task<CircuitBreakerMetrics> GetMetricsAsync(string serviceName);
}

public enum CircuitBreakerState
{
    Closed,
    Open,
    HalfOpen
}

public class CircuitBreakerMetrics
{
    public string ServiceName { get; set; } = string.Empty;
    public CircuitBreakerState State { get; set; }
    public int FailureCount { get; set; }
    public int SuccessCount { get; set; }
    public DateTime? LastFailureTime { get; set; }
    public DateTime? LastSuccessTime { get; set; }
    public TimeSpan? NextRetryTime { get; set; }
    public double FailureRate { get; set; }
}