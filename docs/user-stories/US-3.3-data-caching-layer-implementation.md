# User Story US-3.3: Data Caching Layer Implementation

**Epic:** Data Integration & API Setup  
**Priority:** P0 (Must-Have)  
**Story Points:** 8  
**Sprint:** 5-6  

## User Story
**As a** system  
**I need** a robust caching layer for external API data  
**So that** I can reduce API costs, improve response times, and ensure system reliability even during API outages

## Acceptance Criteria
- [ ] Multi-tiered caching system with memory, distributed, and persistent layers
- [ ] Intelligent cache invalidation based on content type and data freshness requirements
- [ ] Cache warming strategies for popular content and peak usage periods
- [ ] Configurable TTL policies for different data types and usage patterns
- [ ] Cache hit/miss metrics and performance monitoring
- [ ] Graceful degradation when cache services are unavailable
- [ ] Data compression and serialization optimization for cache storage
- [ ] Cache coherence across multiple application instances

## Definition of Done
- [ ] Cache hit ratio > 75% for streaming availability data
- [ ] Cache hit ratio > 85% for metadata requests
- [ ] Average response time < 100ms for cached requests
- [ ] Cache storage costs stay within $50/month budget
- [ ] System remains functional when Redis is down (graceful degradation)
- [ ] Cache warming reduces cold start response times by 60%
- [ ] All cache operations are properly logged and monitored
- [ ] Cache consistency maintained across all application instances

## Implementation Tasks

### Backend Implementation
- [ ] Set up Redis cluster in Azure Cache for Redis
- [ ] Implement multi-level caching architecture (L1: Memory, L2: Redis, L3: Database)
- [ ] Create cache key generation and management service
- [ ] Build intelligent TTL management system
- [ ] Implement cache warming background service
- [ ] Add cache invalidation strategies and mechanisms
- [ ] Create cache monitoring and metrics collection
- [ ] Implement cache compression and serialization
- [ ] Add graceful degradation for cache failures
- [ ] Build cache administration and debugging tools

### Cache Architecture
```csharp
public interface ICacheService
{
    Task<T> GetAsync<T>(string key, CacheLevel level = CacheLevel.All);
    Task SetAsync<T>(string key, T value, TimeSpan? expiry = null, CacheLevel level = CacheLevel.All);
    Task RemoveAsync(string key, CacheLevel level = CacheLevel.All);
    Task RemoveByPatternAsync(string pattern, CacheLevel level = CacheLevel.All);
    Task<bool> ExistsAsync(string key, CacheLevel level = CacheLevel.All);
    Task WarmCacheAsync<T>(string key, Func<Task<T>> valueFactory, TimeSpan? expiry = null);
    Task<CacheStats> GetStatsAsync();
}

public class MultiLevelCacheService : ICacheService
{
    private readonly IMemoryCache _memoryCache;
    private readonly IDistributedCache _distributedCache;
    private readonly ICachePersistenceService _persistenceService;
    private readonly ICacheMetricsCollector _metricsCollector;
    private readonly ILogger<MultiLevelCacheService> _logger;
    private readonly IOptionsMonitor<CacheSettings> _settings;

    public async Task<T> GetAsync<T>(string key, CacheLevel level = CacheLevel.All)
    {
        var stopwatch = Stopwatch.StartNew();
        
        try
        {
            // L1: Memory Cache
            if (level.HasFlag(CacheLevel.Memory))
            {
                if (_memoryCache.TryGetValue(key, out T memoryValue))
                {
                    await _metricsCollector.RecordHitAsync("memory", key, stopwatch.ElapsedMilliseconds);
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
                        _memoryCache.Set(key, distributedValue, GetMemoryExpiry(key));
                    }
                    
                    await _metricsCollector.RecordHitAsync("distributed", key, stopwatch.ElapsedMilliseconds);
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
                    return persistentValue;
                }
            }

            await _metricsCollector.RecordMissAsync(key, stopwatch.ElapsedMilliseconds);
            return default(T);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Cache get operation failed for key: {Key}", key);
            await _metricsCollector.RecordErrorAsync(key, ex.GetType().Name);
            return default(T);
        }
    }
}

[Flags]
public enum CacheLevel
{
    Memory = 1,
    Distributed = 2,
    Persistent = 4,
    All = Memory | Distributed | Persistent
}
```

### Cache Key Management
```csharp
public class CacheKeyService
{
    private readonly IOptionsMonitor<CacheSettings> _settings;
    private const string KeySeparator = ":";
    private const int MaxKeyLength = 250; // Redis limit

    public string GenerateKey(CacheCategory category, params string[] components)
    {
        var prefix = _settings.CurrentValue.KeyPrefix ?? "geoleap";
        var version = _settings.CurrentValue.DataVersion ?? "v1";
        
        var keyComponents = new List<string> { prefix, version, category.ToString().ToLower() };
        keyComponents.AddRange(components.Where(c => !string.IsNullOrEmpty(c)));
        
        var key = string.Join(KeySeparator, keyComponents.Select(SanitizeKeyComponent));
        
        // Ensure key length doesn't exceed Redis limits
        if (key.Length > MaxKeyLength)
        {
            var hash = ComputeHash(key);
            key = key.Substring(0, MaxKeyLength - hash.Length - 1) + KeySeparator + hash;
        }
        
        return key;
    }

    public string GenerateStreamingKey(string contentId, string countryCode = null)
    {
        var components = new List<string> { "streaming", contentId };
        if (!string.IsNullOrEmpty(countryCode)) components.Add(countryCode);
        return GenerateKey(CacheCategory.StreamingData, components.ToArray());
    }

    public string GenerateMetadataKey(int tmdbId, ContentType contentType, string language = "en-US")
    {
        return GenerateKey(CacheCategory.Metadata, contentType.ToString().ToLower(), tmdbId.ToString(), language);
    }

    public string GenerateSearchKey(string query, ContentType? contentType = null, string language = "en-US")
    {
        var components = new List<string> { "search", ComputeHash(query.ToLower()), language };
        if (contentType.HasValue) components.Add(contentType.Value.ToString().ToLower());
        return GenerateKey(CacheCategory.Search, components.ToArray());
    }

    private string SanitizeKeyComponent(string component)
    {
        return component.Replace(" ", "_").Replace(":", "_");
    }

    private string ComputeHash(string input)
    {
        using var sha1 = SHA1.Create();
        var hash = sha1.ComputeHash(Encoding.UTF8.GetBytes(input));
        return Convert.ToHexString(hash)[..8]; // First 8 characters
    }
}

public enum CacheCategory
{
    StreamingData,
    Metadata,
    Search,
    Images,
    UserPreferences,
    Configuration
}
```

### TTL Management System
```csharp
public class CacheTtlManager
{
    private readonly IOptionsMonitor<CacheSettings> _settings;
    private readonly Dictionary<CacheCategory, CacheTtlPolicy> _policies;

    public CacheTtlManager(IOptionsMonitor<CacheSettings> settings)
    {
        _settings = settings;
        _policies = InitializeTtlPolicies();
    }

    public TimeSpan GetTtl(CacheCategory category, string key, object value = null)
    {
        var policy = _policies.GetValueOrDefault(category, _policies[CacheCategory.StreamingData]);
        
        return category switch
        {
            CacheCategory.StreamingData => GetStreamingDataTtl(key, value),
            CacheCategory.Metadata => GetMetadataTtl(key, value),
            CacheCategory.Search => GetSearchTtl(key, value),
            CacheCategory.Images => TimeSpan.FromDays(7),
            CacheCategory.UserPreferences => TimeSpan.FromDays(30),
            CacheCategory.Configuration => TimeSpan.FromDays(1),
            _ => policy.DefaultTtl
        };
    }

    private TimeSpan GetStreamingDataTtl(string key, object value)
    {
        // Popular content: shorter TTL for fresher data
        // Obscure content: longer TTL to reduce API costs
        if (value is StreamingAvailabilityResponse streaming)
        {
            var popularity = streaming.Popularity ?? 0;
            return popularity switch
            {
                > 80 => TimeSpan.FromMinutes(30),  // Very popular
                > 60 => TimeSpan.FromHours(1),     // Popular
                > 40 => TimeSpan.FromHours(3),     // Moderately popular
                > 20 => TimeSpan.FromHours(6),     // Less popular
                _ => TimeSpan.FromHours(12)        // Obscure content
            };
        }
        
        return TimeSpan.FromHours(2); // Default
    }

    private TimeSpan GetMetadataTtl(string key, object value)
    {
        // Metadata changes less frequently than availability
        if (value is ContentMetadata metadata)
        {
            // Recent releases might get updated more often
            var releaseDate = metadata.ReleaseDate ?? DateTime.MinValue;
            var daysSinceRelease = (DateTime.UtcNow - releaseDate).TotalDays;
            
            return daysSinceRelease switch
            {
                < 30 => TimeSpan.FromHours(6),    // Recent releases
                < 365 => TimeSpan.FromHours(24),  // This year
                _ => TimeSpan.FromDays(7)         // Older content
            };
        }
        
        return TimeSpan.FromHours(24); // Default
    }

    private TimeSpan GetSearchTtl(string key, object value)
    {
        // Search results can be cached longer for popular queries
        return TimeSpan.FromHours(6);
    }

    private Dictionary<CacheCategory, CacheTtlPolicy> InitializeTtlPolicies()
    {
        return new Dictionary<CacheCategory, CacheTtlPolicy>
        {
            [CacheCategory.StreamingData] = new CacheTtlPolicy 
            { 
                DefaultTtl = TimeSpan.FromHours(2),
                MinTtl = TimeSpan.FromMinutes(15),
                MaxTtl = TimeSpan.FromHours(24)
            },
            [CacheCategory.Metadata] = new CacheTtlPolicy 
            { 
                DefaultTtl = TimeSpan.FromHours(24),
                MinTtl = TimeSpan.FromHours(1),
                MaxTtl = TimeSpan.FromDays(7)
            }
        };
    }
}

public class CacheTtlPolicy
{
    public TimeSpan DefaultTtl { get; set; }
    public TimeSpan MinTtl { get; set; }
    public TimeSpan MaxTtl { get; set; }
}
```

### Cache Warming Service
```csharp
public class CacheWarmingService : BackgroundService
{
    private readonly ICacheService _cacheService;
    private readonly IStreamingAvailabilityClient _streamingClient;
    private readonly ITmdbClient _tmdbClient;
    private readonly IPopularContentService _popularContentService;
    private readonly ILogger<CacheWarmingService> _logger;

    public CacheWarmingService(
        ICacheService cacheService,
        IStreamingAvailabilityClient streamingClient,
        ITmdbClient tmdbClient,
        IPopularContentService popularContentService,
        ILogger<CacheWarmingService> logger)
    {
        _cacheService = cacheService;
        _streamingClient = streamingClient;
        _tmdbClient = tmdbClient;
        _popularContentService = popularContentService;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Cache warming service started");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await WarmPopularContentCache();
                await WarmSearchCache();
                await WarmMetadataCache();
                
                // Wait 4 hours before next warming cycle
                await Task.Delay(TimeSpan.FromHours(4), stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during cache warming cycle");
                await Task.Delay(TimeSpan.FromMinutes(15), stoppingToken);
            }
        }
    }

    private async Task WarmPopularContentCache()
    {
        var popularContent = await _popularContentService.GetPopularContentAsync(100);
        
        var warmingTasks = popularContent.Select(async content =>
        {
            try
            {
                var streamingKey = _cacheKeyService.GenerateStreamingKey(content.Id);
                
                if (!await _cacheService.ExistsAsync(streamingKey))
                {
                    await _cacheService.WarmCacheAsync(
                        streamingKey,
                        () => _streamingClient.GetAvailabilityAsync(content.Id, content.Type),
                        TimeSpan.FromHours(1)
                    );
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to warm cache for content {ContentId}", content.Id);
            }
        });

        await Task.WhenAll(warmingTasks);
        _logger.LogInformation("Warmed cache for {Count} popular content items", popularContent.Count);
    }

    private async Task WarmSearchCache()
    {
        var popularSearches = await _popularContentService.GetPopularSearchQueriesAsync(50);
        
        var warmingTasks = popularSearches.Select(async searchQuery =>
        {
            try
            {
                var searchKey = _cacheKeyService.GenerateSearchKey(searchQuery);
                
                if (!await _cacheService.ExistsAsync(searchKey))
                {
                    await _cacheService.WarmCacheAsync(
                        searchKey,
                        () => _tmdbClient.SearchMultiAsync(searchQuery),
                        TimeSpan.FromHours(6)
                    );
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to warm search cache for query {Query}", searchQuery);
            }
        });

        await Task.WhenAll(warmingTasks);
        _logger.LogInformation("Warmed search cache for {Count} popular queries", popularSearches.Count);
    }
}
```

### Cache Invalidation System
```csharp
public class CacheInvalidationService
{
    private readonly ICacheService _cacheService;
    private readonly ILogger<CacheInvalidationService> _logger;
    private readonly Dictionary<string, DateTime> _invalidationTracking;

    public async Task InvalidateContentAsync(string contentId)
    {
        var patterns = new[]
        {
            $"*:streaming:{contentId}*",
            $"*:metadata:*:{contentId}*",
            $"*:search:*{contentId}*"
        };

        foreach (var pattern in patterns)
        {
            await _cacheService.RemoveByPatternAsync(pattern);
        }

        _logger.LogInformation("Invalidated cache for content {ContentId}", contentId);
    }

    public async Task InvalidateByGenreAsync(string genre)
    {
        await _cacheService.RemoveByPatternAsync($"*:search:*{genre}*");
        _logger.LogInformation("Invalidated search cache for genre {Genre}", genre);
    }

    public async Task InvalidateStaleDataAsync()
    {
        // Remove cache entries that haven't been accessed in 30 days
        await _cacheService.RemoveByPatternAsync("*:streaming:*", TimeSpan.FromDays(30));
        await _cacheService.RemoveByPatternAsync("*:metadata:*", TimeSpan.FromDays(30));
        
        _logger.LogInformation("Removed stale cache entries");
    }

    public async Task ScheduleInvalidationAsync(string key, DateTime invalidateAt)
    {
        _invalidationTracking[key] = invalidateAt;
        
        var delay = invalidateAt - DateTime.UtcNow;
        if (delay > TimeSpan.Zero)
        {
            _ = Task.Delay(delay).ContinueWith(async _ =>
            {
                await _cacheService.RemoveAsync(key);
                _invalidationTracking.Remove(key);
                _logger.LogInformation("Scheduled invalidation completed for key {Key}", key);
            });
        }
    }
}
```

### Cache Metrics and Monitoring
```csharp
public class CacheMetricsCollector : ICacheMetricsCollector
{
    private readonly IMetricsLogger _metricsLogger;
    private readonly ILogger<CacheMetricsCollector> _logger;
    private readonly ConcurrentDictionary<string, CacheMetrics> _metrics;

    public async Task RecordHitAsync(string level, string key, long responseTimeMs)
    {
        var category = ExtractCategoryFromKey(key);
        
        _metricsLogger.Counter("cache.hits")
            .WithTag("level", level)
            .WithTag("category", category)
            .Increment();
            
        _metricsLogger.Histogram("cache.response_time")
            .WithTag("level", level)
            .WithTag("category", category)
            .Record(responseTimeMs);

        await UpdateMetricsAsync(level, category, true, responseTimeMs);
    }

    public async Task RecordMissAsync(string key, long responseTimeMs)
    {
        var category = ExtractCategoryFromKey(key);
        
        _metricsLogger.Counter("cache.misses")
            .WithTag("category", category)
            .Increment();

        await UpdateMetricsAsync("all", category, false, responseTimeMs);
    }

    public async Task<CacheStats> GetStatsAsync()
    {
        var stats = new CacheStats();
        
        foreach (var metric in _metrics.Values)
        {
            stats.TotalHits += metric.HitCount;
            stats.TotalMisses += metric.MissCount;
            stats.AverageResponseTime += metric.AverageResponseTime;
        }

        if (_metrics.Count > 0)
        {
            stats.AverageResponseTime /= _metrics.Count;
            stats.HitRatio = (double)stats.TotalHits / (stats.TotalHits + stats.TotalMisses);
        }

        return stats;
    }
}

public class CacheStats
{
    public long TotalHits { get; set; }
    public long TotalMisses { get; set; }
    public double HitRatio { get; set; }
    public double AverageResponseTime { get; set; }
    public Dictionary<string, CategoryStats> CategoryStats { get; set; } = new();
}
```

### Configuration
```json
{
  "CacheSettings": {
    "KeyPrefix": "geoleap",
    "DataVersion": "v1",
    "Redis": {
      "ConnectionString": "[Retrieved from Azure Key Vault]",
      "DefaultDatabase": 0,
      "KeyExpiry": "02:00:00",
      "MaxRetries": 3,
      "RetryDelay": "00:00:01"
    },
    "Memory": {
      "SizeLimit": 100000000,
      "CompactionPercentage": 0.25,
      "ExpirationScanFrequency": "00:05:00"
    },
    "Warming": {
      "Enabled": true,
      "PopularContentLimit": 100,
      "PopularSearchLimit": 50,
      "WarmingInterval": "04:00:00"
    },
    "Compression": {
      "Enabled": true,
      "MinSize": 1024,
      "Algorithm": "gzip"
    }
  }
}
```

## Testing Strategy
- [ ] Unit tests for cache service implementations
- [ ] Integration tests with Redis cluster
- [ ] Performance tests measuring hit ratios and response times
- [ ] Load tests simulating high traffic scenarios
- [ ] Failover tests when cache services are unavailable
- [ ] Cache warming effectiveness tests
- [ ] Memory usage and leak tests
- [ ] TTL expiration accuracy tests
- [ ] Cache invalidation pattern tests

## Dependencies
- Azure Cache for Redis setup and configuration
- Streaming API integration (US-3.1) for cache data sources
- Metadata API integration (US-3.2) for cache data sources
- Logging infrastructure (US-1.3) for cache operations
- Error handling system (US-1.4) for graceful degradation
- Monitoring infrastructure for metrics collection

## Success Metrics
- **Cache hit ratio:** > 75% for streaming data, > 85% for metadata
- **Response time improvement:** > 60% faster for cached requests
- **Cost reduction:** > 40% reduction in external API calls
- **System reliability:** > 99.5% uptime even during cache failures
- **Cache efficiency:** Storage costs < $50/month
- **Memory usage:** < 500MB per application instance
- **Cache warming effectiveness:** > 80% of warmed data accessed within 24 hours

## Monitoring and Alerting
- Real-time cache hit/miss ratio dashboards
- Cache storage utilization alerts
- Redis cluster health monitoring
- Cache warming success/failure tracking
- Performance degradation alerts when hit ratio drops below thresholds
- Cost monitoring for cache infrastructure