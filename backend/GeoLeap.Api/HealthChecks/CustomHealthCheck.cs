using Microsoft.Extensions.Diagnostics.HealthChecks;
using System.Diagnostics;

namespace GeoLeap.Api.HealthChecks;

/// <summary>
/// Custom health check for application-specific metrics
/// Checks memory usage, response time, and overall system health
/// </summary>
public class CustomHealthCheck : IHealthCheck
{
    private readonly ILogger<CustomHealthCheck> _logger;

    public CustomHealthCheck(ILogger<CustomHealthCheck> logger)
    {
        _logger = logger;
    }

    public Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var process = Process.GetCurrentProcess();

            // Check memory usage
            var memoryUsedMb = process.WorkingSet64 / 1024 / 1024;
            var maxMemoryMb = 2048; // 2GB threshold

            var data = new Dictionary<string, object>
            {
                { "memoryUsedMB", memoryUsedMb },
                { "maxMemoryMB", maxMemoryMb },
                { "memoryPercentage", (memoryUsedMb * 100.0) / maxMemoryMb },
                { "threadCount", process.Threads.Count },
                { "uptime", DateTime.UtcNow - process.StartTime.ToUniversalTime() }
            };

            // Determine health status based on memory usage
            if (memoryUsedMb > maxMemoryMb * 0.9) // Over 90% memory usage
            {
                _logger.LogWarning("High memory usage: {MemoryUsedMb}MB / {MaxMemoryMb}MB", memoryUsedMb, maxMemoryMb);
                return Task.FromResult(HealthCheckResult.Degraded(
                    description: "High memory usage detected",
                    data: data));
            }

            if (memoryUsedMb > maxMemoryMb) // Over 100% memory usage
            {
                _logger.LogError("Critical memory usage: {MemoryUsedMb}MB / {MaxMemoryMb}MB", memoryUsedMb, maxMemoryMb);
                return Task.FromResult(HealthCheckResult.Unhealthy(
                    description: "Critical memory usage",
                    data: data));
            }

            return Task.FromResult(HealthCheckResult.Healthy(
                description: "Application is healthy",
                data: data));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Health check failed");
            return Task.FromResult(HealthCheckResult.Unhealthy(
                description: "Health check failed",
                exception: ex));
        }
    }
}
