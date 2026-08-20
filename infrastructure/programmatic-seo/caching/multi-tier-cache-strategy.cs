using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;

namespace GeoLeap.Api.Infrastructure.Caching
{
    /// <summary>
    /// Multi-tier caching strategy for programmatic SEO system
    /// Targets >90% cache hit ratio with intelligent cache invalidation
    /// </summary>
    public interface IMultiTierCacheService
    {
        Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken = default) where T : class;
        Task SetAsync<T>(string key, T value, TimeSpan? expiry = null, CacheTier tier = CacheTier.All, CancellationToken cancellationToken = default) where T : class;
        Task RemoveAsync(string key, CacheTier tier = CacheTier.All, CancellationToken cancellationToken = default);
        Task RemoveByPatternAsync(string pattern, CacheTier tier = CacheTier.All, CancellationToken cancellationToken = default);
        Task<CacheStatistics> GetStatisticsAsync();
        Task WarmupAsync(List<string> keys, CancellationToken cancellationToken = default);
        Task<bool> ExistsAsync(string key, CacheTier tier = CacheTier.All, CancellationToken cancellationToken = default);
        Task InvalidateContentCacheAsync(string contentType, string contentId, CancellationToken cancellationToken = default);
    }

    public enum CacheTier
    {
        Memory,
        Redis,
        Database,
        All
    }

    public class CacheStatistics
    {
        public long MemoryCacheHits { get; set; }
        public long MemoryCacheMisses { get; set; }
        public long RedisCacheHits { get; set; }
        public long RedisCacheMisses { get; set; }
        public long DatabaseCacheHits { get; set; }
        public long DatabaseCacheMisses { get; set; }
        public double OverallHitRatio => TotalHits > 0 ? (double)TotalHits / (TotalHits + TotalMisses) * 100 : 0;
        public long TotalHits => MemoryCacheHits + RedisCacheHits + DatabaseCacheHits;
        public long TotalMisses => MemoryCacheMisses + RedisCacheMisses + DatabaseCacheMisses;
        public long MemoryCacheSize { get; set; }
        public long RedisCacheSize { get; set; }
        public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
        public Dictionary<string, int> TopKeys { get; set; } = new();
        public Dictionary<string, double> HitRatioByPattern { get; set; } = new();
    }

    public class MultiTierCacheService : IMultiTierCacheService
    {
        private readonly IMemoryCache _memoryCache;
        private readonly IDistributedCache _redisCache;
        private readonly IConnectionMultiplexer _redisConnection;
        private readonly ILogger<MultiTierCacheService> _logger;
        private readonly IConfiguration _configuration;
        
        // Statistics tracking
        private long _memoryCacheHits = 0;
        private long _memoryCacheMisses = 0;
        private long _redisCacheHits = 0;
        private long _redisCacheMisses = 0;
        private long _databaseCacheHits = 0;
        private long _databaseCacheMisses = 0;
        
        // Cache configuration
        private readonly TimeSpan _defaultMemoryCacheExpiry;
        private readonly TimeSpan _defaultRedisCacheExpiry;
        private readonly TimeSpan _longTermCacheExpiry;
        private readonly int _maxMemoryCacheSize;
        
        // Key patterns for different content types
        private readonly Dictionary<string, CacheConfiguration> _cacheConfigurations;
        
        public MultiTierCacheService(
            IMemoryCache memoryCache,
            IDistributedCache redisCache,
            IConnectionMultiplexer redisConnection,
            ILogger<MultiTierCacheService> logger,
            IConfiguration configuration)
        {
            _memoryCache = memoryCache;
            _redisCache = redisCache;
            _redisConnection = redisConnection;
            _logger = logger;
            _configuration = configuration;
            
            // Load cache configuration
            _defaultMemoryCacheExpiry = TimeSpan.FromMinutes(configuration.GetValue<int>("Cache:Memory:DefaultExpiryMinutes", 30));
            _defaultRedisCacheExpiry = TimeSpan.FromHours(configuration.GetValue<int>("Cache:Redis:DefaultExpiryHours", 4));
            _longTermCacheExpiry = TimeSpan.FromDays(configuration.GetValue<int>("Cache:Redis:LongTermExpiryDays", 7));
            _maxMemoryCacheSize = configuration.GetValue<int>("Cache:Memory:MaxSize", 1000);
            
            InitializeCacheConfigurations();
        }

        private void InitializeCacheConfigurations()
        {
            _cacheConfigurations = new Dictionary<string, CacheConfiguration>
            {
                ["movie:"] = new CacheConfiguration 
                { 
                    MemoryExpiry = TimeSpan.FromMinutes(45), 
                    RedisExpiry = TimeSpan.FromHours(6),
                    Priority = CachePriority.High,
                    PreferredTier = CacheTier.All
                },
                ["tv:"] = new CacheConfiguration 
                { 
                    MemoryExpiry = TimeSpan.FromMinutes(45), 
                    RedisExpiry = TimeSpan.FromHours(6),
                    Priority = CachePriority.High,
                    PreferredTier = CacheTier.All
                },
                ["streaming:"] = new CacheConfiguration 
                { 
                    MemoryExpiry = TimeSpan.FromMinutes(30), 
                    RedisExpiry = TimeSpan.FromHours(2),
                    Priority = CachePriority.High,
                    PreferredTier = CacheTier.All
                },
                ["search:"] = new CacheConfiguration 
                { 
                    MemoryExpiry = TimeSpan.FromMinutes(15), 
                    RedisExpiry = TimeSpan.FromHours(1),
                    Priority = CachePriority.Normal,
                    PreferredTier = CacheTier.All
                },
                ["popular:"] = new CacheConfiguration 
                { 
                    MemoryExpiry = TimeSpan.FromMinutes(60), 
                    RedisExpiry = TimeSpan.FromHours(8),
                    Priority = CachePriority.High,
                    PreferredTier = CacheTier.All
                },
                ["metadata:"] = new CacheConfiguration 
                { 
                    MemoryExpiry = TimeSpan.FromHours(2), 
                    RedisExpiry = TimeSpan.FromDays(1),
                    Priority = CachePriority.Normal,
                    PreferredTier = CacheTier.Redis
                },
                ["sitemap:"] = new CacheConfiguration 
                { 
                    MemoryExpiry = TimeSpan.FromHours(1), 
                    RedisExpiry = TimeSpan.FromHours(12),
                    Priority = CachePriority.Low,
                    PreferredTier = CacheTier.Redis
                },
                ["api:"] = new CacheConfiguration 
                { 
                    MemoryExpiry = TimeSpan.FromMinutes(10), 
                    RedisExpiry = TimeSpan.FromMinutes(30),
                    Priority = CachePriority.Normal,
                    PreferredTier = CacheTier.Memory
                }
            };
        }

        public async Task<T?> GetAsync<T>(string key, CancellationToken cancellationToken = default) where T : class
        {
            try
            {
                // Tier 1: Check memory cache first (fastest)
                if (_memoryCache.TryGetValue(key, out var memoryCachedValue))
                {
                    Interlocked.Increment(ref _memoryCacheHits);
                    _logger.LogDebug("Memory cache hit for key: {Key}", key);
                    
                    if (memoryCachedValue is T memoryResult)
                        return memoryResult;
                    
                    if (memoryCachedValue is string memoryJsonStr)
                    {
                        var memoryDeserialized = JsonSerializer.Deserialize<T>(memoryJsonStr);
                        if (memoryDeserialized != null)
                            return memoryDeserialized;
                    }
                }
                else
                {
                    Interlocked.Increment(ref _memoryCacheMisses);
                }

                // Tier 2: Check Redis cache (fast, distributed)
                var redisValue = await _redisCache.GetStringAsync(key, cancellationToken);
                if (!string.IsNullOrEmpty(redisValue))
                {
                    Interlocked.Increment(ref _redisCacheHits);
                    _logger.LogDebug("Redis cache hit for key: {Key}", key);

                    var redisDeserialized = JsonSerializer.Deserialize<T>(redisValue);
                    if (redisDeserialized != null)
                    {
                        // Store in memory cache for faster subsequent access
                        var config = GetCacheConfiguration(key);
                        var memoryOptions = new MemoryCacheEntryOptions
                        {
                            AbsoluteExpirationRelativeToNow = config.MemoryExpiry,
                            Priority = config.Priority,
                            Size = EstimateSize(redisDeserialized)
                        };
                        
                        _memoryCache.Set(key, redisDeserialized, memoryOptions);
                        
                        return redisDeserialized;
                    }
                }
                else
                {
                    Interlocked.Increment(ref _redisCacheMisses);
                }

                _logger.LogDebug("Cache miss for key: {Key}", key);
                return null;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving cached value for key: {Key}", key);
                return null;
            }
        }

        public async Task SetAsync<T>(string key, T value, TimeSpan? expiry = null, CacheTier tier = CacheTier.All, CancellationToken cancellationToken = default) where T : class
        {
            try
            {
                var config = GetCacheConfiguration(key);
                var json = JsonSerializer.Serialize(value);
                
                // Set in memory cache
                if (tier == CacheTier.Memory || tier == CacheTier.All)
                {
                    var memoryExpiry = expiry ?? config.MemoryExpiry;
                    var memoryOptions = new MemoryCacheEntryOptions
                    {
                        AbsoluteExpirationRelativeToNow = memoryExpiry,
                        Priority = config.Priority,
                        Size = EstimateSize(value)
                    };
                    
                    // Add cache eviction callback for statistics
                    memoryOptions.PostEvictionCallbacks.Add(new PostEvictionCallbackRegistration
                    {
                        EvictionCallback = OnMemoryCacheEviction
                    });
                    
                    _memoryCache.Set(key, value, memoryOptions);
                    _logger.LogDebug("Stored in memory cache: {Key}", key);
                }

                // Set in Redis cache
                if (tier == CacheTier.Redis || tier == CacheTier.All)
                {
                    var redisExpiry = expiry ?? config.RedisExpiry;
                    var options = new DistributedCacheEntryOptions
                    {
                        AbsoluteExpirationRelativeToNow = redisExpiry
                    };
                    
                    await _redisCache.SetStringAsync(key, json, options, cancellationToken);
                    
                    // Set expiry in Redis directly for better control
                    var database = _redisConnection.GetDatabase();
                    await database.KeyExpireAsync(key, redisExpiry);
                    
                    _logger.LogDebug("Stored in Redis cache: {Key} (expiry: {Expiry})", key, redisExpiry);
                }

                // Track cache set operations
                await TrackCacheOperation(key, "set", tier.ToString());
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error setting cached value for key: {Key}", key);
                throw;
            }
        }

        public async Task RemoveAsync(string key, CacheTier tier = CacheTier.All, CancellationToken cancellationToken = default)
        {
            try
            {
                if (tier == CacheTier.Memory || tier == CacheTier.All)
                {
                    _memoryCache.Remove(key);
                    _logger.LogDebug("Removed from memory cache: {Key}", key);
                }

                if (tier == CacheTier.Redis || tier == CacheTier.All)
                {
                    await _redisCache.RemoveAsync(key, cancellationToken);
                    _logger.LogDebug("Removed from Redis cache: {Key}", key);
                }

                await TrackCacheOperation(key, "remove", tier.ToString());
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error removing cached value for key: {Key}", key);
                throw;
            }
        }

        public async Task RemoveByPatternAsync(string pattern, CacheTier tier = CacheTier.All, CancellationToken cancellationToken = default)
        {
            try
            {
                if (tier == CacheTier.Redis || tier == CacheTier.All)
                {
                    var database = _redisConnection.GetDatabase();
                    var server = _redisConnection.GetServer(_redisConnection.GetEndPoints().First());
                    
                    // Use Redis SCAN to find matching keys
                    var keys = server.Keys(pattern: pattern);
                    var keyArray = keys.ToArray();
                    
                    if (keyArray.Length > 0)
                    {
                        await database.KeyDeleteAsync(keyArray);
                        _logger.LogInformation("Removed {Count} keys matching pattern {Pattern} from Redis", 
                            keyArray.Length, pattern);
                    }
                }

                if (tier == CacheTier.Memory || tier == CacheTier.All)
                {
                    // Memory cache doesn't support pattern removal directly
                    // This would require maintaining a key registry or using a custom implementation
                    _logger.LogWarning("Pattern-based removal not supported for memory cache: {Pattern}", pattern);
                }

                await TrackCacheOperation(pattern, "removeByPattern", tier.ToString());
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error removing cached values by pattern: {Pattern}", pattern);
                throw;
            }
        }

        public async Task<bool> ExistsAsync(string key, CacheTier tier = CacheTier.All, CancellationToken cancellationToken = default)
        {
            try
            {
                if (tier == CacheTier.Memory || tier == CacheTier.All)
                {
                    if (_memoryCache.TryGetValue(key, out _))
                        return true;
                }

                if (tier == CacheTier.Redis || tier == CacheTier.All)
                {
                    var database = _redisConnection.GetDatabase();
                    return await database.KeyExistsAsync(key);
                }

                return false;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking if key exists: {Key}", key);
                return false;
            }
        }

        public async Task<CacheStatistics> GetStatisticsAsync()
        {
            try
            {
                var database = _redisConnection.GetDatabase();
                var server = _redisConnection.GetServer(_redisConnection.GetEndPoints().First());
                
                // Get Redis info
                var redisInfo = await server.InfoAsync("memory");
                var redisUsedMemory = redisInfo.FirstOrDefault(x => x.Key == "used_memory")?.Value ?? "0";
                
                // Get top cache keys (would need implementation to track key access frequency)
                var topKeys = await GetTopCacheKeys();
                
                // Calculate hit ratios by pattern
                var hitRatiosByPattern = CalculateHitRatiosByPattern();
                
                return new CacheStatistics
                {
                    MemoryCacheHits = _memoryCacheHits,
                    MemoryCacheMisses = _memoryCacheMisses,
                    RedisCacheHits = _redisCacheHits,
                    RedisCacheMisses = _redisCacheMisses,
                    DatabaseCacheHits = _databaseCacheHits,
                    DatabaseCacheMisses = _databaseCacheMisses,
                    RedisCacheSize = long.TryParse(redisUsedMemory, out var size) ? size : 0,
                    TopKeys = topKeys,
                    HitRatioByPattern = hitRatiosByPattern
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting cache statistics");
                throw;
            }
        }

        public async Task WarmupAsync(List<string> keys, CancellationToken cancellationToken = default)
        {
            try
            {
                _logger.LogInformation("Starting cache warmup for {KeyCount} keys", keys.Count);
                
                var warmupTasks = keys.Select(async key =>
                {
                    try
                    {
                        // Check if key exists in Redis
                        if (await ExistsAsync(key, CacheTier.Redis, cancellationToken))
                        {
                            // Load into memory cache
                            await GetAsync<object>(key, cancellationToken);
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to warmup cache for key: {Key}", key);
                    }
                }).ToList();

                await Task.WhenAll(warmupTasks);
                
                _logger.LogInformation("Cache warmup completed for {KeyCount} keys", keys.Count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during cache warmup");
                throw;
            }
        }

        public async Task InvalidateContentCacheAsync(string contentType, string contentId, CancellationToken cancellationToken = default)
        {
            try
            {
                // Generate all possible cache keys for this content
                var keysToInvalidate = new List<string>
                {
                    $"{contentType}:{contentId}",
                    $"{contentType}:{contentId}:*",
                    $"search:*{contentId}*",
                    $"popular:{contentType}*",
                    $"sitemap:{contentType}*",
                    $"metadata:{contentType}:{contentId}*"
                };

                var invalidationTasks = keysToInvalidate.Select(pattern => 
                    RemoveByPatternAsync(pattern, CacheTier.All, cancellationToken));

                await Task.WhenAll(invalidationTasks);

                // Also clear related CDN cache (would integrate with CDN API)
                await InvalidateCdnCacheAsync(contentType, contentId);

                _logger.LogInformation("Cache invalidated for {ContentType}:{ContentId}", contentType, contentId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error invalidating cache for {ContentType}:{ContentId}", contentType, contentId);
                throw;
            }
        }

        private CacheConfiguration GetCacheConfiguration(string key)
        {
            var prefix = _cacheConfigurations.Keys.FirstOrDefault(k => key.StartsWith(k));
            return prefix != null ? _cacheConfigurations[prefix] : new CacheConfiguration
            {
                MemoryExpiry = _defaultMemoryCacheExpiry,
                RedisExpiry = _defaultRedisCacheExpiry,
                Priority = CachePriority.Normal,
                PreferredTier = CacheTier.All
            };
        }

        private long EstimateSize<T>(T value)
        {
            try
            {
                var json = JsonSerializer.Serialize(value);
                return System.Text.Encoding.UTF8.GetByteCount(json);
            }
            catch
            {
                return 1000; // Default estimate
            }
        }

        private void OnMemoryCacheEviction(object key, object? value, EvictionReason reason, object? state)
        {
            _logger.LogDebug("Memory cache evicted key {Key} for reason {Reason}", key, reason);
        }

        private async Task TrackCacheOperation(string key, string operation, string tier)
        {
            try
            {
                // Store cache operation statistics in Redis for analysis
                var statsKey = $"cache:stats:{DateTime.UtcNow:yyyy-MM-dd}";
                var database = _redisConnection.GetDatabase();
                
                await database.HashIncrementAsync(statsKey, $"{operation}:{tier}", 1);
                await database.KeyExpireAsync(statsKey, TimeSpan.FromDays(7));
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to track cache operation");
            }
        }

        private async Task<Dictionary<string, int>> GetTopCacheKeys()
        {
            try
            {
                var database = _redisConnection.GetDatabase();
                var statsKey = $"cache:stats:{DateTime.UtcNow:yyyy-MM-dd}";
                
                var allStats = await database.HashGetAllAsync(statsKey);
                
                return allStats
                    .Where(kv => kv.Name.ToString().Contains("get:"))
                    .ToDictionary(
                        kv => kv.Name.ToString().Replace("get:", ""),
                        kv => (int)kv.Value
                    )
                    .OrderByDescending(kv => kv.Value)
                    .Take(10)
                    .ToDictionary(kv => kv.Key, kv => kv.Value);
            }
            catch
            {
                return new Dictionary<string, int>();
            }
        }

        private Dictionary<string, double> CalculateHitRatiosByPattern()
        {
            var ratios = new Dictionary<string, double>();
            
            foreach (var config in _cacheConfigurations)
            {
                var pattern = config.Key.TrimEnd(':');
                // This would require more detailed tracking in a real implementation
                ratios[pattern] = 85.0; // Placeholder
            }
            
            return ratios;
        }

        private async Task InvalidateCdnCacheAsync(string contentType, string contentId)
        {
            try
            {
                // This would integrate with Azure CDN Management API
                // For now, log the invalidation request
                _logger.LogInformation("CDN cache invalidation requested for {ContentType}:{ContentId}", 
                    contentType, contentId);
                
                // Implementation would use Azure CDN REST API to purge cache
                // Example URLs to purge:
                var urlsToPurge = new[]
                {
                    $"/{contentType}/{contentId}",
                    $"/{contentType}/{contentId}/*",
                    $"/api/{contentType}/{contentId}",
                    $"/sitemap-{contentType}.xml"
                };
                
                _logger.LogDebug("Would purge CDN URLs: {Urls}", string.Join(", ", urlsToPurge));
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to invalidate CDN cache");
            }
        }
    }

    public class CacheConfiguration
    {
        public TimeSpan MemoryExpiry { get; set; } = TimeSpan.FromMinutes(30);
        public TimeSpan RedisExpiry { get; set; } = TimeSpan.FromHours(4);
        public CachePriority Priority { get; set; } = CachePriority.Normal;
        public CacheTier PreferredTier { get; set; } = CacheTier.All;
    }

    // Background service for cache warming and maintenance
    public class CacheWarmupService : BackgroundService
    {
        private readonly IMultiTierCacheService _cacheService;
        private readonly ILogger<CacheWarmupService> _logger;
        private readonly IConfiguration _configuration;

        public CacheWarmupService(
            IMultiTierCacheService cacheService,
            ILogger<CacheWarmupService> logger,
            IConfiguration configuration)
        {
            _cacheService = cacheService;
            _logger = logger;
            _configuration = configuration;
        }

        protected override async Task ExecuteAsync(CancellationToken stoppingToken)
        {
            _logger.LogInformation("Cache Warmup Service starting");

            while (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await PerformCacheWarmup();
                    await PerformCacheMaintenance();
                    
                    // Wait for next warmup cycle (default: every 4 hours)
                    var warmupInterval = _configuration.GetValue<int>("Cache:WarmupIntervalHours", 4);
                    await Task.Delay(TimeSpan.FromHours(warmupInterval), stoppingToken);
                }
                catch (OperationCanceledException)
                {
                    break;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error in cache warmup service");
                    await Task.Delay(TimeSpan.FromMinutes(30), stoppingToken);
                }
            }

            _logger.LogInformation("Cache Warmup Service stopped");
        }

        private async Task PerformCacheWarmup()
        {
            try
            {
                // Get popular content keys to warmup
                var popularKeys = await GetPopularContentKeys();
                
                await _cacheService.WarmupAsync(popularKeys);
                
                _logger.LogInformation("Cache warmup completed for {KeyCount} popular items", popularKeys.Count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to perform cache warmup");
            }
        }

        private async Task PerformCacheMaintenance()
        {
            try
            {
                var statistics = await _cacheService.GetStatisticsAsync();
                
                _logger.LogInformation("Cache Statistics - Hit Ratio: {HitRatio:F2}%, Memory Hits: {MemoryHits}, Redis Hits: {RedisHits}",
                    statistics.OverallHitRatio,
                    statistics.MemoryCacheHits,
                    statistics.RedisCacheHits);

                // Alert if hit ratio is below target
                if (statistics.OverallHitRatio < 90.0)
                {
                    _logger.LogWarning("Cache hit ratio {HitRatio:F2}% is below target of 90%", statistics.OverallHitRatio);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to perform cache maintenance");
            }
        }

        private async Task<List<string>> GetPopularContentKeys()
        {
            // This would query analytics to get most accessed content
            // For now, return some common patterns
            return new List<string>
            {
                "popular:movies:top100",
                "popular:tv:top100",
                "streaming:netflix:popular",
                "streaming:disney:popular",
                "streaming:hulu:popular",
                "search:trending",
                "metadata:genres:all",
                "metadata:countries:all"
            };
        }
    }
}