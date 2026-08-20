using GeoLeap.Api.Models;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Options;
using System.Diagnostics;
using System.Text;
using System.Text.Json;

namespace GeoLeap.Api.Services;

public class MultiLevelCacheService : ICacheService
{
    private readonly IMemoryCache _memoryCache;
    private readonly IDistributedCache _distributedCache;
    private readonly ICachePersistenceService _persistenceService;
    private readonly ICacheMetricsCollector _metricsCollector;
    private readonly ICacheTtlManager _ttlManager;
    private readonly ILogger<MultiLevelCacheService> _logger;
    private readonly IOptionsMonitor<CacheSettings> _settings;

    public MultiLevelCacheService(
        IMemoryCache memoryCache,
        IDistributedCache distributedCache,
        ICachePersistenceService persistenceService,
        ICacheMetricsCollector metricsCollector,
        ICacheTtlManager ttlManager,
        ILogger<MultiLevelCacheService> logger,
        IOptionsMonitor<CacheSettings> settings)
    {
        _memoryCache = memoryCache;
        _distributedCache = distributedCache;
        _persistenceService = persistenceService;
        _metricsCollector = metricsCollector;
        _ttlManager = ttlManager;
        _logger = logger;
        _settings = settings;
    }

    public async Task<T?> GetAsync<T>(string key, CacheLevel level = CacheLevel.All)
    {
        var stopwatch = Stopwatch.StartNew();
        
        try
        {
            // L1: Memory Cache
            if (level.HasFlag(CacheLevel.Memory))
            {
                if (_memoryCache.TryGetValue(key, out T? memoryValue) && memoryValue != null)
                {
                    await _metricsCollector.RecordHitAsync("memory", key, stopwatch.ElapsedMilliseconds);
                    _logger.LogDebug("Cache hit (Memory): {Key} in {ElapsedMs}ms", key, stopwatch.ElapsedMilliseconds);
                    return memoryValue;
                }
            }

            // L2: Distributed Cache (Redis)
            if (level.HasFlag(CacheLevel.Distributed))
            {
                var distributedValue = await GetFromDistributedCacheAsync<T>(key);
                if (distributedValue != null)
                {
                    // Populate L1 cache
                    if (level.HasFlag(CacheLevel.Memory))
                    {
                        var memoryExpiry = _ttlManager.GetMemoryTtl(key);
                        _memoryCache.Set(key, distributedValue, memoryExpiry);
                    }
                    
                    await _metricsCollector.RecordHitAsync("distributed", key, stopwatch.ElapsedMilliseconds);
                    _logger.LogDebug("Cache hit (Distributed): {Key} in {ElapsedMs}ms", key, stopwatch.ElapsedMilliseconds);
                    return distributedValue;
                }
            }

            // L3: Persistent Cache (Database)
            if (level.HasFlag(CacheLevel.Persistent))
            {
                var persistentValue = await _persistenceService.GetAsync<T>(key);
                if (persistentValue != null)
                {
                    // Populate higher cache levels
                    await PopulateHigherLevelsAsync(key, persistentValue, level);
                    
                    await _metricsCollector.RecordHitAsync("persistent", key, stopwatch.ElapsedMilliseconds);
                    _logger.LogDebug("Cache hit (Persistent): {Key} in {ElapsedMs}ms", key, stopwatch.ElapsedMilliseconds);
                    return persistentValue;
                }
            }

            await _metricsCollector.RecordMissAsync(key, stopwatch.ElapsedMilliseconds);
            _logger.LogDebug("Cache miss: {Key} in {ElapsedMs}ms", key, stopwatch.ElapsedMilliseconds);
            return default;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Cache get operation failed for key: {Key}", key);
            await _metricsCollector.RecordErrorAsync(key, ex.GetType().Name);
            return default;
        }
    }

    public async Task SetAsync<T>(string key, T value, TimeSpan? expiry = null, CacheLevel level = CacheLevel.All)
    {
        try
        {
            if (value == null)
            {
                _logger.LogWarning("Attempted to cache null value for key: {Key}", key);
                return;
            }

            var ttl = expiry ?? _ttlManager.GetTtl(ExtractCategoryFromKey(key), key, value);

            // L1: Memory Cache
            if (level.HasFlag(CacheLevel.Memory))
            {
                var memoryTtl = _ttlManager.GetMemoryTtl(key);
                _memoryCache.Set(key, value, memoryTtl);
            }

            // L2: Distributed Cache (Redis)
            if (level.HasFlag(CacheLevel.Distributed))
            {
                await SetInDistributedCacheAsync(key, value, _ttlManager.GetDistributedTtl(key));
            }

            // L3: Persistent Cache (Database)
            if (level.HasFlag(CacheLevel.Persistent))
            {
                await _persistenceService.SetAsync(key, value, ttl);
            }

            _logger.LogDebug("Cache set operation completed for key: {Key}, TTL: {TTL}, Levels: {Levels}", 
                key, ttl, level);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Cache set operation failed for key: {Key}", key);
            await _metricsCollector.RecordErrorAsync(key, ex.GetType().Name);
        }
    }

    public async Task RemoveAsync(string key, CacheLevel level = CacheLevel.All)
    {
        try
        {
            // L1: Memory Cache
            if (level.HasFlag(CacheLevel.Memory))
            {
                _memoryCache.Remove(key);
            }

            // L2: Distributed Cache (Redis)
            if (level.HasFlag(CacheLevel.Distributed))
            {
                await _distributedCache.RemoveAsync(key);
            }

            // L3: Persistent Cache (Database)
            if (level.HasFlag(CacheLevel.Persistent))
            {
                await _persistenceService.RemoveAsync(key);
            }

            _logger.LogDebug("Cache remove operation completed for key: {Key}, Levels: {Levels}", key, level);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Cache remove operation failed for key: {Key}", key);
            await _metricsCollector.RecordErrorAsync(key, ex.GetType().Name);
        }
    }

    public async Task RemoveByPatternAsync(string pattern, CacheLevel level = CacheLevel.All)
    {
        try
        {
            // L1: Memory Cache - Cannot remove by pattern efficiently, skip
            // L2: Distributed Cache - Would require Redis key scanning, skip for performance
            // L3: Persistent Cache - Database supports LIKE patterns
            if (level.HasFlag(CacheLevel.Persistent))
            {
                await _persistenceService.RemoveByPatternAsync(pattern);
            }

            _logger.LogDebug("Cache pattern remove operation completed for pattern: {Pattern}, Levels: {Levels}", pattern, level);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Cache pattern remove operation failed for pattern: {Pattern}", pattern);
        }
    }

    public async Task<bool> ExistsAsync(string key, CacheLevel level = CacheLevel.All)
    {
        try
        {
            // Check L1: Memory Cache
            if (level.HasFlag(CacheLevel.Memory) && _memoryCache.TryGetValue(key, out _))
            {
                return true;
            }

            // Check L2: Distributed Cache (Redis)
            if (level.HasFlag(CacheLevel.Distributed))
            {
                var distributedValue = await _distributedCache.GetAsync(key);
                if (distributedValue != null)
                {
                    return true;
                }
            }

            // Check L3: Persistent Cache (Database)
            if (level.HasFlag(CacheLevel.Persistent))
            {
                return await _persistenceService.ExistsAsync(key);
            }

            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Cache exists check failed for key: {Key}", key);
            return false;
        }
    }

    public async Task WarmCacheAsync<T>(string key, Func<Task<T>> valueFactory, TimeSpan? expiry = null)
    {
        try
        {
            // Check if key already exists
            if (await ExistsAsync(key))
            {
                _logger.LogDebug("Cache warming skipped - key already exists: {Key}", key);
                return;
            }

            // Fetch data using the provided factory
            var value = await valueFactory();
            if (value != null)
            {
                await SetAsync(key, value, expiry);
                _logger.LogDebug("Cache warmed successfully for key: {Key}", key);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Cache warming failed for key: {Key}", key);
            await _metricsCollector.RecordErrorAsync(key, ex.GetType().Name);
        }
    }

    public async Task<CacheStats> GetStatsAsync()
    {
        return await _metricsCollector.GetStatsAsync();
    }

    private async Task<T?> GetFromDistributedCacheAsync<T>(string key)
    {
        try
        {
            var bytes = await _distributedCache.GetAsync(key);
            if (bytes == null) return default;

            var json = Encoding.UTF8.GetString(bytes);
            return JsonSerializer.Deserialize<T>(json);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to get value from distributed cache for key: {Key}", key);
            return default;
        }
    }

    private async Task SetInDistributedCacheAsync<T>(string key, T value, TimeSpan expiry)
    {
        try
        {
            var json = JsonSerializer.Serialize(value);
            var bytes = Encoding.UTF8.GetBytes(json);
            
            var options = new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = expiry
            };

            await _distributedCache.SetAsync(key, bytes, options);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to set value in distributed cache for key: {Key}", key);
        }
    }

    private async Task PopulateHigherLevelsAsync<T>(string key, T value, CacheLevel level)
    {
        try
        {
            // Populate distributed cache
            if (level.HasFlag(CacheLevel.Distributed))
            {
                var distributedTtl = _ttlManager.GetDistributedTtl(key);
                await SetInDistributedCacheAsync(key, value, distributedTtl);
            }

            // Populate memory cache
            if (level.HasFlag(CacheLevel.Memory))
            {
                var memoryTtl = _ttlManager.GetMemoryTtl(key);
                _memoryCache.Set(key, value, memoryTtl);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to populate higher cache levels for key: {Key}", key);
        }
    }

    private CacheCategory ExtractCategoryFromKey(string key)
    {
        var parts = key.Split(':');
        if (parts.Length >= 3 && Enum.TryParse<CacheCategory>(parts[2], true, out var category))
        {
            return category;
        }
        return CacheCategory.StreamingData; // Default fallback
    }
}