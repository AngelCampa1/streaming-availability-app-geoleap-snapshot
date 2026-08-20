using GeoLeap.Api.Models;
using System.Collections.Concurrent;

namespace GeoLeap.Api.Services;

public class CacheMetricsCollector : ICacheMetricsCollector
{
    private readonly ILogger<CacheMetricsCollector> _logger;
    private readonly ConcurrentDictionary<string, CacheMetrics> _metrics;
    private readonly ConcurrentDictionary<string, CategoryStats> _categoryStats;
    private readonly ConcurrentDictionary<string, LevelStats> _levelStats;
    private readonly object _statsLock = new();

    public CacheMetricsCollector(ILogger<CacheMetricsCollector> logger)
    {
        _logger = logger;
        _metrics = new ConcurrentDictionary<string, CacheMetrics>();
        _categoryStats = new ConcurrentDictionary<string, CategoryStats>();
        _levelStats = new ConcurrentDictionary<string, LevelStats>();
    }

    public async Task RecordHitAsync(string level, string key, long responseTimeMs)
    {
        var category = ExtractCategoryFromKey(key);
        
        // Update metrics
        await UpdateMetricsAsync(level, category, true, responseTimeMs);
        
        // Update category stats
        _categoryStats.AddOrUpdate(category, 
            new CategoryStats { Hits = 1, AverageResponseTime = responseTimeMs },
            (_, existing) => 
            {
                existing.Hits++;
                existing.AverageResponseTime = CalculateNewAverage(existing.AverageResponseTime, existing.TotalRequests - 1, responseTimeMs);
                return existing;
            });

        // Update level stats
        _levelStats.AddOrUpdate(level,
            new LevelStats { Hits = 1, AverageResponseTime = responseTimeMs },
            (_, existing) =>
            {
                existing.Hits++;
                existing.AverageResponseTime = CalculateNewAverage(existing.AverageResponseTime, existing.Hits - 1, responseTimeMs);
                return existing;
            });

        _logger.LogDebug("Cache hit recorded: Level={Level}, Category={Category}, ResponseTime={ResponseTime}ms", 
            level, category, responseTimeMs);
    }

    public async Task RecordMissAsync(string key, long responseTimeMs)
    {
        var category = ExtractCategoryFromKey(key);
        
        // Update metrics
        await UpdateMetricsAsync("all", category, false, responseTimeMs);
        
        // Update category stats
        _categoryStats.AddOrUpdate(category,
            new CategoryStats { Misses = 1, AverageResponseTime = responseTimeMs },
            (_, existing) =>
            {
                existing.Misses++;
                existing.AverageResponseTime = CalculateNewAverage(existing.AverageResponseTime, existing.TotalRequests - 1, responseTimeMs);
                return existing;
            });

        _logger.LogDebug("Cache miss recorded: Category={Category}, ResponseTime={ResponseTime}ms", 
            category, responseTimeMs);
    }

    public async Task RecordErrorAsync(string key, string errorType)
    {
        var category = ExtractCategoryFromKey(key);
        var metricKey = $"{category}:all";
        
        _metrics.AddOrUpdate(metricKey,
            new CacheMetrics 
            { 
                Key = key, 
                Level = "all", 
                Category = category, 
                ErrorCount = 1,
                LastAccessed = DateTime.UtcNow
            },
            (_, existing) =>
            {
                existing.ErrorCount++;
                existing.LastAccessed = DateTime.UtcNow;
                return existing;
            });

        _logger.LogWarning("Cache error recorded: Category={Category}, ErrorType={ErrorType}, Key={Key}", 
            category, errorType, key);

        await Task.CompletedTask;
    }

    public async Task<CacheStats> GetStatsAsync()
    {
        lock (_statsLock)
        {
            var stats = new CacheStats();
            
            foreach (var metric in _metrics.Values)
            {
                stats.TotalHits += metric.HitCount;
                stats.TotalMisses += metric.MissCount;
            }

            if (stats.TotalHits + stats.TotalMisses > 0)
            {
                stats.HitRatio = (double)stats.TotalHits / (stats.TotalHits + stats.TotalMisses);
            }

            // Calculate average response time across all metrics
            var totalResponseTime = 0.0;
            var totalRequests = 0L;
            
            foreach (var metric in _metrics.Values)
            {
                var requests = metric.HitCount + metric.MissCount;
                totalResponseTime += metric.AverageResponseTime * requests;
                totalRequests += requests;
            }

            if (totalRequests > 0)
            {
                stats.AverageResponseTime = totalResponseTime / totalRequests;
            }

            // Copy category and level stats
            stats.CategoryStats = new Dictionary<string, CategoryStats>(_categoryStats);
            stats.LevelStats = new Dictionary<string, LevelStats>(_levelStats);
            stats.LastUpdated = DateTime.UtcNow;

            return stats;
        }
    }

    private async Task UpdateMetricsAsync(string level, string category, bool isHit, long responseTimeMs)
    {
        var metricKey = $"{category}:{level}";
        
        _metrics.AddOrUpdate(metricKey,
            new CacheMetrics 
            { 
                Key = metricKey, 
                Level = level, 
                Category = category,
                HitCount = isHit ? 1 : 0,
                MissCount = isHit ? 0 : 1,
                AverageResponseTime = responseTimeMs,
                LastAccessed = DateTime.UtcNow
            },
            (_, existing) =>
            {
                if (isHit)
                {
                    existing.HitCount++;
                }
                else
                {
                    existing.MissCount++;
                }
                
                var totalRequests = existing.HitCount + existing.MissCount;
                existing.AverageResponseTime = CalculateNewAverage(existing.AverageResponseTime, totalRequests - 1, responseTimeMs);
                existing.LastAccessed = DateTime.UtcNow;
                
                return existing;
            });

        await Task.CompletedTask;
    }

    private double CalculateNewAverage(double currentAverage, long currentCount, long newValue)
    {
        if (currentCount == 0) return newValue;
        return (currentAverage * currentCount + newValue) / (currentCount + 1);
    }

    private string ExtractCategoryFromKey(string key)
    {
        var parts = key.Split(':');
        if (parts.Length >= 3)
        {
            return parts[2];
        }
        return CacheCategory.StreamingData.ToString().ToLower();
    }
}