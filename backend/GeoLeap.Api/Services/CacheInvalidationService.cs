using GeoLeap.Api.Models;
using System.Collections.Concurrent;

namespace GeoLeap.Api.Services;

public class CacheInvalidationService : ICacheInvalidationService
{
    private readonly ICacheService _cacheService;
    private readonly ICacheKeyService _cacheKeyService;
    private readonly ILogger<CacheInvalidationService> _logger;
    private readonly ConcurrentDictionary<string, DateTime> _invalidationTracking;
    private readonly Timer _scheduledInvalidationTimer;

    public CacheInvalidationService(
        ICacheService cacheService,
        ICacheKeyService cacheKeyService,
        ILogger<CacheInvalidationService> logger)
    {
        _cacheService = cacheService;
        _cacheKeyService = cacheKeyService;
        _logger = logger;
        _invalidationTracking = new ConcurrentDictionary<string, DateTime>();
        
        // Run scheduled invalidation check every 5 minutes
        _scheduledInvalidationTimer = new Timer(ProcessScheduledInvalidations, null, 
            TimeSpan.FromMinutes(5), TimeSpan.FromMinutes(5));
    }

    public async Task InvalidateContentAsync(string contentId)
    {
        try
        {
            var patterns = new[]
            {
                $"*:streaming:{contentId}*",
                $"*:metadata:*:{contentId}*",
                $"*:search:*{contentId}*"
            };

            var invalidationTasks = patterns.Select(pattern => 
                _cacheService.RemoveByPatternAsync(pattern));

            await Task.WhenAll(invalidationTasks);

            _logger.LogInformation("Invalidated cache for content {ContentId}", contentId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to invalidate cache for content {ContentId}", contentId);
        }
    }

    public async Task InvalidateByGenreAsync(string genre)
    {
        try
        {
            var patterns = new[]
            {
                $"*:search:*{genre.ToLower()}*",
                $"*:metadata:*{genre.ToLower()}*"
            };

            var invalidationTasks = patterns.Select(pattern => 
                _cacheService.RemoveByPatternAsync(pattern));

            await Task.WhenAll(invalidationTasks);

            _logger.LogInformation("Invalidated search cache for genre {Genre}", genre);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to invalidate cache for genre {Genre}", genre);
        }
    }

    public async Task InvalidateStaleDataAsync()
    {
        try
        {
            // Remove cache entries that haven't been accessed in 30 days
            var cutoffDate = DateTime.UtcNow.AddDays(-30);
            
            var patterns = new[]
            {
                "*:streaming:*",
                "*:metadata:*",
                "*:search:*"
            };

            var invalidationTasks = patterns.Select(pattern => 
                _cacheService.RemoveByPatternAsync(pattern, CacheLevel.Persistent));

            await Task.WhenAll(invalidationTasks);

            _logger.LogInformation("Removed stale cache entries older than {CutoffDate}", cutoffDate);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to remove stale cache entries");
        }
    }

    public async Task ScheduleInvalidationAsync(string key, DateTime invalidateAt)
    {
        try
        {
            _invalidationTracking[key] = invalidateAt;
            
            var delay = invalidateAt - DateTime.UtcNow;
            if (delay > TimeSpan.Zero && delay <= TimeSpan.FromDays(7)) // Don't schedule too far in the future
            {
                _ = Task.Delay(delay).ContinueWith(async _ =>
                {
                    try
                    {
                        await _cacheService.RemoveAsync(key);
                        _invalidationTracking.TryRemove(key, out var _);
                        _logger.LogInformation("Scheduled invalidation completed for key {Key}", key);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Scheduled invalidation failed for key {Key}", key);
                    }
                }, TaskScheduler.Default);
            }

            _logger.LogDebug("Scheduled invalidation for key {Key} at {InvalidateAt}", key, invalidateAt);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to schedule invalidation for key {Key}", key);
        }
    }

    public async Task InvalidateByContentTypeAsync(ContentType contentType)
    {
        try
        {
            var contentTypeStr = contentType.ToString().ToLower();
            var patterns = new[]
            {
                $"*:streaming:*:{contentTypeStr}*",
                $"*:metadata:{contentTypeStr}:*",
                $"*:search:*{contentTypeStr}*"
            };

            var invalidationTasks = patterns.Select(pattern => 
                _cacheService.RemoveByPatternAsync(pattern));

            await Task.WhenAll(invalidationTasks);

            _logger.LogInformation("Invalidated cache for content type {ContentType}", contentType);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to invalidate cache for content type {ContentType}", contentType);
        }
    }

    public async Task InvalidateByLanguageAsync(string language)
    {
        try
        {
            var patterns = new[]
            {
                $"*:metadata:*:{language}*",
                $"*:search:*:{language}*"
            };

            var invalidationTasks = patterns.Select(pattern => 
                _cacheService.RemoveByPatternAsync(pattern));

            await Task.WhenAll(invalidationTasks);

            _logger.LogInformation("Invalidated cache for language {Language}", language);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to invalidate cache for language {Language}", language);
        }
    }

    private void ProcessScheduledInvalidations(object? state)
    {
        try
        {
            var now = DateTime.UtcNow;
            var expiredKeys = _invalidationTracking
                .Where(kvp => kvp.Value <= now)
                .Select(kvp => kvp.Key)
                .ToList();

            foreach (var key in expiredKeys)
            {
                _ = Task.Run(async () =>
                {
                    try
                    {
                        await _cacheService.RemoveAsync(key);
                        _invalidationTracking.TryRemove(key, out var _);
                        _logger.LogDebug("Processed scheduled invalidation for key {Key}", key);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to process scheduled invalidation for key {Key}", key);
                    }
                });
            }

            if (expiredKeys.Count > 0)
            {
                _logger.LogInformation("Processed {Count} scheduled cache invalidations", expiredKeys.Count);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing scheduled cache invalidations");
        }
    }

    public void Dispose()
    {
        _scheduledInvalidationTimer?.Dispose();
    }
}