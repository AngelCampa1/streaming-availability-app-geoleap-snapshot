using GeoLeap.Api.Services;
using GeoLeap.Api.Middleware;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;

namespace GeoLeap.Api.Extensions;

/// <summary>
/// Extension methods for registering preference-related services
/// Registers all preference integration services and their dependencies
/// </summary>
public static class PreferenceServiceExtensions
{
    /// <summary>
    /// Adds all preference-related services to the DI container
    /// </summary>
    public static IServiceCollection AddPreferenceServices(this IServiceCollection services)
    {
        // Core preference services (assuming these exist from US-8.3)
        services.AddScoped<IPreferenceService, PreferenceService>();
        
        // Central preference integration service
        services.AddScoped<IUserPreferenceIntegrationService, UserPreferenceIntegrationService>();
        
        // Enhanced search services with preference integration
        services.AddScoped<IPreferenceAwareSearchService, PreferenceAwareSearchService>();
        
        // Enhanced filter services with preference integration
        services.AddScoped<IPreferenceAwareFilterService, PreferenceAwareFilterService>();
        
        // Enhanced notification services with preference integration
        services.AddScoped<IPreferenceAwareNotificationService, PreferenceAwareNotificationService>();
        
        // Enhanced watchlist services with privacy preference integration
        services.AddScoped<IPrivacyAwareWatchlistService, PrivacyAwareWatchlistService>();
        
        // Content filtering services
        services.AddScoped<IContentFilteringService, ContentFilteringService>();
        
        // Performance monitoring for preferences
        services.AddScoped<IPreferencePerformanceMonitoringService, PreferencePerformanceMonitoringService>();
        
        return services;
    }
    
    /// <summary>
    /// Adds preference-aware enhancements to existing services
    /// This replaces base services with preference-aware versions where appropriate
    /// </summary>
    public static IServiceCollection AddPreferenceAwareEnhancements(this IServiceCollection services)
    {
        // TODO: Implement service decoration when decorator library is available
        // For now, preference-aware services are registered as scoped services above
        return services;
    }
    
    /// <summary>
    /// Adds preference caching configuration optimized for performance
    /// </summary>
    public static IServiceCollection AddPreferenceCaching(this IServiceCollection services)
    {
        // Add specialized caching for preferences
        // Note: MemoryCache configuration is handled globally in Program.cs
        // services.AddScoped<IPreferenceCacheService, PreferenceCacheServiceImpl>();
        
        return services;
    }
    
    /// <summary>
    /// Adds preference-aware background services
    /// </summary>
    public static IServiceCollection AddPreferenceBackgroundServices(this IServiceCollection services)
    {
        // Add background service to warm up preference caches
        services.AddHostedService<PreferenceCacheWarmupService>();
        
        // Add background service to clean up expired preference data
        services.AddHostedService<PreferenceCleanupService>();
        
        return services;
    }
}

/// <summary>
/// Specialized caching service for preferences with optimized patterns
/// </summary>
public interface IPreferenceCacheService
{
    Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken = default);
    Task SetAsync<T>(string key, T value, TimeSpan expiration, CancellationToken cancellationToken = default);
    Task RemoveAsync(string key, CancellationToken cancellationToken = default);
    Task RemoveByPatternAsync(string pattern, CancellationToken cancellationToken = default);
}

public class PreferenceCacheService : IPreferenceCacheService
{
    private readonly Microsoft.Extensions.Caching.Distributed.IDistributedCache _distributedCache;
    private readonly Microsoft.Extensions.Caching.Memory.IMemoryCache _memoryCache;
    private readonly ILogger<PreferenceCacheService> _logger;

    public PreferenceCacheService(
        Microsoft.Extensions.Caching.Distributed.IDistributedCache distributedCache,
        Microsoft.Extensions.Caching.Memory.IMemoryCache memoryCache,
        ILogger<PreferenceCacheService> logger)
    {
        _distributedCache = distributedCache;
        _memoryCache = memoryCache;
        _logger = logger;
    }

    public async Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken = default)
    {
        // Try memory cache first (fastest)
        if (_memoryCache.TryGetValue(key, out object? cachedValue) && cachedValue is T memoryValue)
        {
            return memoryValue;
        }

        // Try distributed cache (if available)
        var distributedValue = await _distributedCache.GetStringAsync(key, cancellationToken);
        if (distributedValue != null)
        {
            try
            {
                var deserializedValue = System.Text.Json.JsonSerializer.Deserialize<T>(distributedValue);
                
                // Store in memory cache for faster future access
                var cacheEntryOptions = new Microsoft.Extensions.Caching.Memory.MemoryCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5),
                    Priority = Microsoft.Extensions.Caching.Memory.CacheItemPriority.Normal,
                    Size = 1 // Always set Size to handle both SizeLimit and non-SizeLimit configurations
                };
                _memoryCache.Set(key, deserializedValue, cacheEntryOptions);
                
                return deserializedValue;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to deserialize cached preference value for key: {Key}", key);
            }
        }

        return default(T);
    }

    public async Task SetAsync<T>(string key, T value, TimeSpan expiration, CancellationToken cancellationToken = default)
    {
        // Store in memory cache with proper options
        var cacheEntryOptions = new Microsoft.Extensions.Caching.Memory.MemoryCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = expiration,
            Priority = Microsoft.Extensions.Caching.Memory.CacheItemPriority.Normal,
            Size = 1 // Always set Size to handle both SizeLimit and non-SizeLimit configurations
        };
        
        _memoryCache.Set(key, value, cacheEntryOptions);

        // Store in distributed cache
        try
        {
            var serializedValue = System.Text.Json.JsonSerializer.Serialize(value);
            await _distributedCache.SetStringAsync(key, serializedValue, new Microsoft.Extensions.Caching.Distributed.DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = expiration
            }, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to store preference value in distributed cache for key: {Key}", key);
        }
    }

    public async Task RemoveAsync(string key, CancellationToken cancellationToken = default)
    {
        _memoryCache.Remove(key);
        await _distributedCache.RemoveAsync(key, cancellationToken);
    }

    public async Task RemoveByPatternAsync(string pattern, CancellationToken cancellationToken = default)
    {
        // This is a simplified implementation - in production you'd want a more sophisticated pattern matching
        _logger.LogInformation("Pattern-based cache removal requested for pattern: {Pattern}", pattern);
        
        // For memory cache, we can't easily enumerate keys, so this is a no-op
        // For distributed cache (Redis), you would implement pattern-based deletion
        
        await Task.CompletedTask;
    }
}

/// <summary>
/// Background service to warm up preference caches on startup
/// </summary>
public class PreferenceCacheWarmupService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<PreferenceCacheWarmupService> _logger;

    public PreferenceCacheWarmupService(IServiceProvider serviceProvider, ILogger<PreferenceCacheWarmupService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            // Wait for application to start
            await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
            
            using var scope = _serviceProvider.CreateScope();
            var preferenceService = scope.ServiceProvider.GetService<IUserPreferenceIntegrationService>();
            
            if (preferenceService != null)
            {
                _logger.LogInformation("Starting preference cache warmup");
                
                // In a real implementation, you would warm up caches for active users
                // For now, this is a placeholder
                _logger.LogInformation("Preference cache warmup completed");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during preference cache warmup");
        }
    }
}

/// <summary>
/// Background service to clean up expired preference data
/// </summary>
public class PreferenceCleanupService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<PreferenceCleanupService> _logger;

    public PreferenceCleanupService(IServiceProvider serviceProvider, ILogger<PreferenceCleanupService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                using var scope = _serviceProvider.CreateScope();
                
                // Clean up expired preference data every hour
                await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
                
                _logger.LogDebug("Running preference cleanup");
                
                // In a real implementation, you would clean up expired preference history, etc.
                
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during preference cleanup");
                await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken); // Wait before retrying
            }
        }
    }
}