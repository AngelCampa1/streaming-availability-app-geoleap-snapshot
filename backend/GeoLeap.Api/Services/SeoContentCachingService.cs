using System.Text;
using System.Text.Json;
using GeoLeap.Api.Models;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Caching.Memory;
using StackExchange.Redis;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service for SEO-optimized content caching strategy with multi-level caching
/// </summary>
public class SeoContentCachingService : ISeoContentCachingService
{
    private readonly IMemoryCache _memoryCache;
    private readonly IDistributedCache _distributedCache;
    private readonly IDatabase _redis;
    private readonly ILogger<SeoContentCachingService> _logger;
    private readonly IConfiguration _configuration;

    private readonly Dictionary<string, TimeSpan> _defaultTtls = new()
    {
        ["content"] = TimeSpan.FromHours(2),
        ["metadata"] = TimeSpan.FromHours(1),
        ["structured_data"] = TimeSpan.FromHours(4),
        ["sitemap"] = TimeSpan.FromHours(6),
        ["search"] = TimeSpan.FromMinutes(30),
        ["performance"] = TimeSpan.FromMinutes(15)
    };

    private readonly Dictionary<string, int> _cachePriorities = new()
    {
        ["content"] = 1,     // Highest priority
        ["metadata"] = 1,
        ["search"] = 2,      // High priority
        ["sitemap"] = 3,     // Medium priority
        ["structured_data"] = 3,
        ["performance"] = 4   // Lower priority
    };

    public SeoContentCachingService(
        IMemoryCache memoryCache,
        IDistributedCache distributedCache,
        IConnectionMultiplexer redis,
        ILogger<SeoContentCachingService> logger,
        IConfiguration configuration)
    {
        _memoryCache = memoryCache;
        _distributedCache = distributedCache;
        _redis = redis.GetDatabase();
        _logger = logger;
        _configuration = configuration;
    }

    public async Task CacheContentPageAsync(string slug, ContentPageResponse content, TimeSpan? ttl = null, CancellationToken cancellationToken = default)
    {
        try
        {
            var key = GetCacheKey("content", slug);
            var cacheOptions = GetCacheOptions("content", ttl);
            var serialized = JsonSerializer.Serialize(content);

            // Store in both memory and distributed cache
            await SetMultiLevelCacheAsync(key, serialized, cacheOptions, cancellationToken);

            _logger.LogDebug("Cached content page: {Slug}", slug);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error caching content page: {Slug}", slug);
        }
    }

    public async Task<ContentPageResponse?> GetCachedContentPageAsync(string slug, string? language = null, CancellationToken cancellationToken = default)
    {
        try
        {
            var key = GetCacheKey("content", $"{slug}_{language ?? "en-US"}");
            var cached = await GetMultiLevelCacheAsync(key, cancellationToken);

            if (cached != null)
            {
                var content = JsonSerializer.Deserialize<ContentPageResponse>(cached);
                _logger.LogDebug("Cache hit for content page: {Slug}", slug);
                return content;
            }

            _logger.LogDebug("Cache miss for content page: {Slug}", slug);
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting cached content page: {Slug}", slug);
            return null;
        }
    }

    public async Task CacheSeoMetadataAsync(string key, SeoMetadataResponse metadata, TimeSpan? ttl = null, CancellationToken cancellationToken = default)
    {
        try
        {
            var cacheKey = GetCacheKey("metadata", key);
            var cacheOptions = GetCacheOptions("metadata", ttl);
            var serialized = JsonSerializer.Serialize(metadata);

            await SetMultiLevelCacheAsync(cacheKey, serialized, cacheOptions, cancellationToken);

            _logger.LogDebug("Cached SEO metadata: {Key}", key);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error caching SEO metadata: {Key}", key);
        }
    }

    public async Task<SeoMetadataResponse?> GetCachedSeoMetadataAsync(string key, CancellationToken cancellationToken = default)
    {
        try
        {
            var cacheKey = GetCacheKey("metadata", key);
            var cached = await GetMultiLevelCacheAsync(cacheKey, cancellationToken);

            if (cached != null)
            {
                return JsonSerializer.Deserialize<SeoMetadataResponse>(cached);
            }

            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting cached SEO metadata: {Key}", key);
            return null;
        }
    }

    public async Task CacheStructuredDataAsync(string slug, string jsonLd, TimeSpan? ttl = null, CancellationToken cancellationToken = default)
    {
        try
        {
            var key = GetCacheKey("structured_data", slug);
            var cacheOptions = GetCacheOptions("structured_data", ttl);

            await SetMultiLevelCacheAsync(key, jsonLd, cacheOptions, cancellationToken);

            _logger.LogDebug("Cached structured data: {Slug}", slug);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error caching structured data: {Slug}", slug);
        }
    }

    public async Task<string?> GetCachedStructuredDataAsync(string slug, CancellationToken cancellationToken = default)
    {
        try
        {
            var key = GetCacheKey("structured_data", slug);
            return await GetMultiLevelCacheAsync(key, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting cached structured data: {Slug}", slug);
            return null;
        }
    }

    public async Task CacheSitemapAsync(string sitemapType, string xmlContent, TimeSpan? ttl = null, CancellationToken cancellationToken = default)
    {
        try
        {
            var key = GetCacheKey("sitemap", sitemapType);
            var cacheOptions = GetCacheOptions("sitemap", ttl);

            await SetMultiLevelCacheAsync(key, xmlContent, cacheOptions, cancellationToken);

            _logger.LogDebug("Cached sitemap: {SitemapType}", sitemapType);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error caching sitemap: {SitemapType}", sitemapType);
        }
    }

    public async Task<string?> GetCachedSitemapAsync(string sitemapType, CancellationToken cancellationToken = default)
    {
        try
        {
            var key = GetCacheKey("sitemap", sitemapType);
            return await GetMultiLevelCacheAsync(key, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting cached sitemap: {SitemapType}", sitemapType);
            return null;
        }
    }

    public async Task PreWarmCacheAsync(List<string> urls, CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation("Pre-warming cache for {Count} URLs", urls.Count);

            var tasks = urls.Select(async url =>
            {
                try
                {
                    // This would call your content services to generate and cache content
                    // For now, just log the pre-warming attempt
                    _logger.LogDebug("Pre-warming cache for URL: {Url}", url);

                    // Simulate cache warming delay
                    await Task.Delay(100, cancellationToken);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to pre-warm cache for URL: {Url}", url);
                }
            });

            await Task.WhenAll(tasks);

            _logger.LogInformation("Completed cache pre-warming");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error pre-warming cache");
        }
    }

    public async Task InvalidateCacheAsync(string pattern, CancellationToken cancellationToken = default)
    {
        try
        {
            // For memory cache, we can't easily pattern match, so we'll clear related categories
            if (pattern.Contains("content"))
            {
                await InvalidateCacheCategory("content", cancellationToken);
            }

            if (pattern.Contains("metadata"))
            {
                await InvalidateCacheCategory("metadata", cancellationToken);
            }

            if (pattern.Contains("sitemap"))
            {
                await InvalidateCacheCategory("sitemap", cancellationToken);
            }

            // For Redis, we can use pattern-based deletion
            try
            {
                var endpoint = _redis.Multiplexer.GetEndPoints().FirstOrDefault();
                if (endpoint == null)
                {
                    _logger.LogWarning("No Redis endpoints available for cache key scan");
                    return;
                }
                var server = _redis.Multiplexer.GetServer(endpoint);
                var keys = server.Keys(pattern: $"*{pattern}*");
                
                foreach (var key in keys)
                {
                    await _redis.KeyDeleteAsync(key);
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not invalidate Redis cache with pattern: {Pattern}", pattern);
            }

            _logger.LogInformation("Invalidated cache with pattern: {Pattern}", pattern);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error invalidating cache with pattern: {Pattern}", pattern);
        }
    }

    public async Task CacheSearchResultsAsync(string query, ContentSearchResult results, TimeSpan? ttl = null, CancellationToken cancellationToken = default)
    {
        try
        {
            var key = GetCacheKey("search", GenerateSearchCacheKey(query));
            var cacheOptions = GetCacheOptions("search", ttl);
            var serialized = JsonSerializer.Serialize(results);

            await SetMultiLevelCacheAsync(key, serialized, cacheOptions, cancellationToken);

            _logger.LogDebug("Cached search results: {Query}", query);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error caching search results: {Query}", query);
        }
    }

    public async Task<ContentSearchResult?> GetCachedSearchResultsAsync(string query, Dictionary<string, object>? filters = null, CancellationToken cancellationToken = default)
    {
        try
        {
            var key = GetCacheKey("search", GenerateSearchCacheKey(query, filters));
            var cached = await GetMultiLevelCacheAsync(key, cancellationToken);

            if (cached != null)
            {
                return JsonSerializer.Deserialize<ContentSearchResult>(cached);
            }

            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting cached search results: {Query}", query);
            return null;
        }
    }

    public async Task CachePerformanceMetricsAsync(string url, PerformanceMetricsResponse metrics, TimeSpan? ttl = null, CancellationToken cancellationToken = default)
    {
        try
        {
            var key = GetCacheKey("performance", url);
            var cacheOptions = GetCacheOptions("performance", ttl);
            var serialized = JsonSerializer.Serialize(metrics);

            await SetMultiLevelCacheAsync(key, serialized, cacheOptions, cancellationToken);

            _logger.LogDebug("Cached performance metrics: {Url}", url);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error caching performance metrics: {Url}", url);
        }
    }

    public async Task<PerformanceMetricsResponse?> GetCachedPerformanceMetricsAsync(string url, CancellationToken cancellationToken = default)
    {
        try
        {
            var key = GetCacheKey("performance", url);
            var cached = await GetMultiLevelCacheAsync(key, cancellationToken);

            if (cached != null)
            {
                return JsonSerializer.Deserialize<PerformanceMetricsResponse>(cached);
            }

            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting cached performance metrics: {Url}", url);
            return null;
        }
    }

    public async Task<CacheStatistics> GetCacheStatisticsAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var stats = new CacheStatistics();

            // Get memory cache statistics (if available through reflection or custom tracking)
            // For now, we'll provide placeholder data structure

            stats.CategoryStats = new Dictionary<string, CacheCategoryStats>();

            foreach (var category in _defaultTtls.Keys)
            {
                stats.CategoryStats[category] = new CacheCategoryStats
                {
                    Category = category,
                    KeyCount = 0, // Would track actual count
                    MemoryUsed = 0, // Would track actual usage
                    HitCount = 0, // Would track from metrics
                    MissCount = 0, // Would track from metrics
                    AverageTtl = _defaultTtls[category]
                };
            }

            return stats;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting cache statistics");
            return new CacheStatistics();
        }
    }

    public async Task OptimizeCacheAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation("Starting cache optimization");

            // Remove expired entries (this would be more sophisticated in a real implementation)
            await RemoveExpiredEntriesAsync(cancellationToken);

            // Compact memory cache if needed
            if (_memoryCache is MemoryCache mc)
            {
                mc.Compact(0.1); // Remove 10% of entries based on priority
            }

            _logger.LogInformation("Cache optimization completed");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error optimizing cache");
        }
    }

    public async Task ClearAllCacheAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogWarning("Clearing all SEO cache");

            // Clear memory cache (if possible)
            if (_memoryCache is MemoryCache mc)
            {
                mc.Clear();
            }

            // Clear distributed cache (pattern-based for Redis)
            try
            {
                var endpoint = _redis.Multiplexer.GetEndPoints().FirstOrDefault();
                if (endpoint == null)
                {
                    _logger.LogWarning("No Redis endpoints available for cache key scan");
                    return;
                }
                var server = _redis.Multiplexer.GetServer(endpoint);
                var keys = server.Keys(pattern: "seo:*");
                
                if (keys.Any())
                {
                    await _redis.KeyDeleteAsync(keys.ToArray());
                }
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Could not clear distributed cache");
            }

            _logger.LogInformation("All SEO cache cleared");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error clearing all cache");
        }
    }

    public async Task SetCacheWarmingScheduleAsync(List<CacheWarmingRule> rules, CancellationToken cancellationToken = default)
    {
        try
        {
            // This would integrate with a job scheduler like Hangfire or Quartz
            // For now, just log the rules being set

            _logger.LogInformation("Setting {Count} cache warming rules", rules.Count);

            foreach (var rule in rules)
            {
                _logger.LogDebug("Cache warming rule: {Name} - {UrlPattern} - {Schedule}", 
                    rule.Name, rule.UrlPattern, rule.Schedule);
            }

            // In a real implementation, this would:
            // 1. Store the rules in a database
            // 2. Schedule background jobs based on the cron expressions
            // 3. Execute the cache warming logic periodically
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error setting cache warming schedule");
        }
    }

    // Helper methods

    private string GetCacheKey(string category, string identifier)
    {
        return $"seo:{category}:{identifier}";
    }

    private MemoryCacheEntryOptions GetCacheOptions(string category, TimeSpan? ttl = null)
    {
        var options = new MemoryCacheEntryOptions();
        
        options.AbsoluteExpirationRelativeToNow = ttl ?? _defaultTtls.GetValueOrDefault(category, TimeSpan.FromHours(1));
        
        // Set priority based on category
        options.Priority = _cachePriorities.GetValueOrDefault(category, 3) switch
        {
            1 => CacheItemPriority.High,
            2 => CacheItemPriority.Normal,
            3 => CacheItemPriority.Low,
            _ => CacheItemPriority.NeverRemove
        };

        // Add sliding expiration for frequently accessed items
        if (category == "content" || category == "metadata")
        {
            options.SlidingExpiration = TimeSpan.FromMinutes(30);
        }

        return options;
    }

    private DistributedCacheEntryOptions GetDistributedCacheOptions(string category, TimeSpan? ttl = null)
    {
        var options = new DistributedCacheEntryOptions();
        
        options.AbsoluteExpirationRelativeToNow = ttl ?? _defaultTtls.GetValueOrDefault(category, TimeSpan.FromHours(1));

        // Add sliding expiration for frequently accessed items
        if (category == "content" || category == "metadata")
        {
            options.SlidingExpiration = TimeSpan.FromMinutes(30);
        }

        return options;
    }

    private async Task SetMultiLevelCacheAsync(string key, string value, MemoryCacheEntryOptions memoryOptions, CancellationToken cancellationToken)
    {
        try
        {
            // Set in memory cache (fastest access)
            _memoryCache.Set(key, value, memoryOptions);

            // Set in distributed cache (shared across instances)
            var distributedOptions = new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = memoryOptions.AbsoluteExpirationRelativeToNow,
                SlidingExpiration = memoryOptions.SlidingExpiration
            };

            await _distributedCache.SetStringAsync(key, value, distributedOptions, cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error setting multi-level cache for key: {Key}", key);
        }
    }

    private async Task<string?> GetMultiLevelCacheAsync(string key, CancellationToken cancellationToken)
    {
        try
        {
            // Try memory cache first (fastest)
            if (_memoryCache.TryGetValue(key, out string? memoryValue))
            {
                return memoryValue;
            }

            // Try distributed cache second
            var distributedValue = await _distributedCache.GetStringAsync(key, cancellationToken);
            
            if (distributedValue != null)
            {
                // Store back in memory cache for faster future access
                var options = new MemoryCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(30),
                    Priority = CacheItemPriority.Normal
                };
                
                _memoryCache.Set(key, distributedValue, options);
                return distributedValue;
            }

            return null;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error getting multi-level cache for key: {Key}", key);
            return null;
        }
    }

    private string GenerateSearchCacheKey(string query, Dictionary<string, object>? filters = null)
    {
        var keyBuilder = new StringBuilder(query.ToLowerInvariant());

        if (filters?.Any() == true)
        {
            var sortedFilters = filters.OrderBy(f => f.Key);
            foreach (var filter in sortedFilters)
            {
                keyBuilder.Append($"_{filter.Key}:{filter.Value}");
            }
        }

        // Hash the key if it's too long
        var key = keyBuilder.ToString();
        if (key.Length > 200)
        {
            key = key.GetHashCode().ToString();
        }

        return key;
    }

    private async Task InvalidateCacheCategory(string category, CancellationToken cancellationToken)
    {
        try
        {
            // This is a simplified approach - in a real implementation,
            // you'd need to track cache keys by category
            _logger.LogDebug("Invalidating cache category: {Category}", category);

            // Clear distributed cache entries for this category
            var server = _redis.Multiplexer.GetServer(_redis.Multiplexer.GetEndPoints().First());
            var keys = server.Keys(pattern: $"seo:{category}:*");
            
            if (keys.Any())
            {
                await _redis.KeyDeleteAsync(keys.ToArray());
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error invalidating cache category: {Category}", category);
        }
    }

    private async Task RemoveExpiredEntriesAsync(CancellationToken cancellationToken)
    {
        try
        {
            // This would remove expired entries from distributed cache
            // For Redis, expired keys are automatically removed
            // For other distributed caches, you might need custom logic

            _logger.LogDebug("Removing expired cache entries");

            // Placeholder for expired entry removal logic
            await Task.CompletedTask;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error removing expired cache entries");
        }
    }
}