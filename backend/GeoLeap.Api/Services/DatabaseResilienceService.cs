using System;
using System.Data;
using System.Diagnostics;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using GeoLeap.Api.Data;
using GeoLeap.Api.Exceptions;

namespace GeoLeap.Api.Services;

public class DatabaseResilienceService : IDatabaseResilienceService
{
    private readonly ILogger<DatabaseResilienceService> _logger;
    private readonly IServiceProvider _serviceProvider;
    private readonly ICircuitBreakerService _circuitBreaker;
    private static readonly TimeSpan[] RetryDelays = { TimeSpan.FromMilliseconds(100), TimeSpan.FromMilliseconds(500), TimeSpan.FromSeconds(1) };

    public DatabaseResilienceService(
        ILogger<DatabaseResilienceService> logger, 
        IServiceProvider serviceProvider,
        ICircuitBreakerService circuitBreaker)
    {
        _logger = logger;
        _serviceProvider = serviceProvider;
        _circuitBreaker = circuitBreaker;
    }

    public async Task<T> ExecuteWithRetryAsync<T>(Func<Task<T>> operation, int maxRetries = 3)
    {
        return await _circuitBreaker.ExecuteAsync("database", async () =>
        {
            Exception? lastException = null;

            for (int attempt = 0; attempt < maxRetries; attempt++)
            {
                try
                {
                    _logger.LogDebug("Database operation attempt {Attempt}/{MaxRetries}", attempt + 1, maxRetries);
                    return await operation();
                }
                catch (Exception ex) when (IsRetryableException(ex))
                {
                    lastException = ex;
                    _logger.LogWarning(ex, "Database operation failed on attempt {Attempt}/{MaxRetries}. Will retry.", 
                        attempt + 1, maxRetries);

                    if (attempt < maxRetries - 1)
                    {
                        var delay = attempt < RetryDelays.Length ? RetryDelays[attempt] : RetryDelays[^1];
                        await Task.Delay(delay);
                    }
                }
                catch (Exception ex)
                {
                    // Non-retryable exception, fail immediately
                    _logger.LogError(ex, "Non-retryable database exception occurred");
                    HandleDbException(ex);
                    throw;
                }
            }

            // All retries exhausted
            if (lastException != null)
            {
                _logger.LogError(lastException, "Database operation failed after {MaxRetries} attempts", maxRetries);
                HandleDbException(lastException);
                throw new DatabaseException("Database operation failed after multiple retry attempts", lastException);
            }

            throw new DatabaseException("Database operation failed for unknown reason");
        });
    }

    public async Task ExecuteWithRetryAsync(Func<Task> operation, int maxRetries = 3)
    {
        await ExecuteWithRetryAsync(async () =>
        {
            await operation();
            return 0; // dummy return value
        }, maxRetries);
    }

    public async Task<T> ExecuteWithFallbackAsync<T>(Func<Task<T>> primaryOperation, Func<Task<T>> fallbackOperation)
    {
        try
        {
            return await ExecuteWithRetryAsync(primaryOperation);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Primary database operation failed, attempting fallback");
            
            try
            {
                var result = await fallbackOperation();
                _logger.LogInformation("Fallback operation succeeded");
                return result;
            }
            catch (Exception fallbackEx)
            {
                _logger.LogError(fallbackEx, "Fallback operation also failed");
                throw new DatabaseException("Both primary and fallback database operations failed", 
                    new AggregateException(ex, fallbackEx));
            }
        }
    }

    public async Task<bool> IsHealthyAsync()
    {
        try
        {
            var status = await GetHealthStatusAsync();
            return status.IsHealthy;
        }
        catch
        {
            return false;
        }
    }

    public async Task<DatabaseHealthStatus> GetHealthStatusAsync()
    {
        var stopwatch = Stopwatch.StartNew();
        
        try
        {
            using var scope = _serviceProvider.CreateScope();
            var dbContext = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            
            // Simple health check query
            await dbContext.Database.CanConnectAsync();
            
            stopwatch.Stop();
            
            // Get connection pool information (if available)
            var connectionPoolSize = GetConnectionPoolSize(dbContext);
            var activeConnections = GetActiveConnections(dbContext);
            
            return new DatabaseHealthStatus
            {
                IsHealthy = true,
                Status = "Healthy",
                ResponseTime = stopwatch.Elapsed,
                ConnectionPoolSize = connectionPoolSize,
                ActiveConnections = activeConnections,
                LastHealthCheck = DateTime.UtcNow
            };
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            
            _logger.LogError(ex, "Database health check failed");
            
            return new DatabaseHealthStatus
            {
                IsHealthy = false,
                Status = "Unhealthy",
                ResponseTime = stopwatch.Elapsed,
                ErrorMessage = ex.Message,
                LastHealthCheck = DateTime.UtcNow
            };
        }
    }

    public void HandleDbException(Exception exception)
    {
        switch (exception)
        {
            case DbUpdateException dbEx:
                _logger.LogError(dbEx, "Database update exception: {Message}", dbEx.Message);
                break;
            case InvalidOperationException invalidOpEx when invalidOpEx.Message.Contains("timeout"):
                _logger.LogError(invalidOpEx, "Database timeout exception: {Message}", invalidOpEx.Message);
                break;
            case TimeoutException timeoutEx:
                _logger.LogError(timeoutEx, "Database timeout exception: {Message}", timeoutEx.Message);
                break;
            default:
                _logger.LogError(exception, "General database exception: {Message}", exception.Message);
                break;
        }

        // You could add additional handling here like:
        // - Metrics collection
        // - Alerting
        // - Circuit breaker notifications
    }

    private static bool IsRetryableException(Exception exception)
    {
        return exception switch
        {
            TimeoutException => true,
            InvalidOperationException ex when ex.Message.Contains("timeout") => true,
            DbUpdateException ex when IsTransientFailure(ex) => true,
            _ when exception.Message.Contains("connection") => true,
            _ when exception.Message.Contains("network") => true,
            _ when exception.Message.Contains("timeout") => true,
            _ => false
        };
    }

    private static bool IsTransientFailure(DbUpdateException exception)
    {
        // Check for transient failure patterns
        var message = exception.Message.ToLowerInvariant();
        return message.Contains("deadlock") || 
               message.Contains("timeout") || 
               message.Contains("connection") ||
               message.Contains("network");
    }

    private static int GetConnectionPoolSize(DbContext dbContext)
    {
        try
        {
            // This would need to be implemented based on your specific database provider
            // For now, return a default value
            return 100; // Default pool size
        }
        catch
        {
            return -1; // Unknown
        }
    }

    private static int GetActiveConnections(DbContext dbContext)
    {
        try
        {
            // This would need to be implemented based on your specific database provider
            // You might query system tables or use provider-specific APIs
            return 0; // Unable to determine
        }
        catch
        {
            return -1; // Unknown
        }
    }
}