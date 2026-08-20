using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;

namespace GeoLeap.Api.Services;

public interface IDatabaseResilienceService
{
    Task<T> ExecuteWithRetryAsync<T>(Func<Task<T>> operation, int maxRetries = 3);
    Task ExecuteWithRetryAsync(Func<Task> operation, int maxRetries = 3);
    Task<T> ExecuteWithFallbackAsync<T>(Func<Task<T>> primaryOperation, Func<Task<T>> fallbackOperation);
    Task<bool> IsHealthyAsync();
    Task<DatabaseHealthStatus> GetHealthStatusAsync();
    void HandleDbException(Exception exception);
}

public class DatabaseHealthStatus
{
    public bool IsHealthy { get; set; }
    public string Status { get; set; } = string.Empty;
    public TimeSpan? ResponseTime { get; set; }
    public string? ErrorMessage { get; set; }
    public int ConnectionPoolSize { get; set; }
    public int ActiveConnections { get; set; }
    public DateTime LastHealthCheck { get; set; }
}