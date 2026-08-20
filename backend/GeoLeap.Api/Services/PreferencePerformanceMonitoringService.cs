using Sentry;
using Sentry.Protocol;
using Microsoft.Extensions.Logging;
using System.Diagnostics;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service for monitoring performance impact of preference integrations
/// Tracks timing, cache hit rates, and performance metrics
/// </summary>
public interface IPreferencePerformanceMonitoringService
{
    IDisposable TrackPreferenceOperation(string operationName, Guid userId, Dictionary<string, string>? properties = null);
    Task LogPreferenceCacheHitAsync(string cacheKey, bool hit, TimeSpan lookupTime);
    Task LogPreferenceIntegrationMetricsAsync(string serviceName, int preferenceCount, TimeSpan processingTime, bool success);
    Task TrackPreferenceFilteringImpactAsync(string endpoint, int originalCount, int filteredCount, TimeSpan filteringTime);
    Task LogSlowPreferenceOperationAsync(string operation, TimeSpan duration, Guid userId, Dictionary<string, object>? metadata = null);
    Task<PerformanceMetrics> GetPreferencePerformanceMetricsAsync(TimeSpan timeWindow);
    Task AlertOnPerformanceThresholdAsync(string operation, TimeSpan duration, TimeSpan threshold);
}

public class PreferencePerformanceMonitoringService : IPreferencePerformanceMonitoringService
{
    private readonly ILogger<PreferencePerformanceMonitoringService> _logger;

    // Performance thresholds
    private readonly TimeSpan _slowOperationThreshold = TimeSpan.FromMilliseconds(200);
    private readonly TimeSpan _verySlowOperationThreshold = TimeSpan.FromMilliseconds(500);

    public PreferencePerformanceMonitoringService(
        ILogger<PreferencePerformanceMonitoringService> logger)
    {
        _logger = logger;
    }

    public IDisposable TrackPreferenceOperation(string operationName, Guid userId, Dictionary<string, string>? properties = null)
    {
        var startTime = DateTimeOffset.UtcNow;
        return new DisposableAction(() =>
        {
            var duration = DateTimeOffset.UtcNow - startTime;
            SentrySdk.AddBreadcrumb(
                $"Preference.{operationName} completed ({duration.TotalMilliseconds:F0}ms)",
                "preference",
                data: new Dictionary<string, string>(properties ?? new Dictionary<string, string>())
                {
                    ["user_id"] = userId.ToString(),
                    ["operation"] = operationName,
                    ["duration_ms"] = duration.TotalMilliseconds.ToString("F0")
                },
                level: BreadcrumbLevel.Info);
        });
    }

    private sealed class DisposableAction : IDisposable
    {
        private readonly Action _action;
        private bool _disposed;

        public DisposableAction(Action action) => _action = action;

        public void Dispose()
        {
            if (!_disposed)
            {
                _disposed = true;
                _action();
            }
        }
    }

    public async Task LogPreferenceCacheHitAsync(string cacheKey, bool hit, TimeSpan lookupTime)
    {
        try
        {
            var eventName = hit ? "PreferenceCacheHit" : "PreferenceCacheMiss";

            SentrySdk.AddBreadcrumb(
                $"{eventName}: {cacheKey} ({lookupTime.TotalMilliseconds:F2}ms)",
                "preference_cache",
                data: new Dictionary<string, string>
                {
                    ["cache_key"] = cacheKey,
                    ["lookup_time_ms"] = lookupTime.TotalMilliseconds.ToString("F2"),
                    ["cache_type"] = GetCacheTypeFromKey(cacheKey)
                },
                level: hit ? BreadcrumbLevel.Info : BreadcrumbLevel.Warning);

            if (!hit)
            {
                _logger.LogDebug("Cache miss for preference key: {CacheKey}, lookup time: {LookupTime}ms",
                    cacheKey, lookupTime.TotalMilliseconds);
            }

            if (lookupTime > _slowOperationThreshold)
            {
                _logger.LogWarning("Slow preference cache lookup: {CacheKey}, time: {LookupTime}ms",
                    cacheKey, lookupTime.TotalMilliseconds);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error logging preference cache metrics");
        }
    }

    public async Task LogPreferenceIntegrationMetricsAsync(
        string serviceName,
        int preferenceCount,
        TimeSpan processingTime,
        bool success)
    {
        try
        {
            SentrySdk.AddBreadcrumb(
                $"PreferenceIntegration: {serviceName} ({processingTime.TotalMilliseconds:F2}ms, {preferenceCount} prefs)",
                "preference",
                data: new Dictionary<string, string>
                {
                    ["service_name"] = serviceName,
                    ["preference_count"] = preferenceCount.ToString(),
                    ["processing_time_ms"] = processingTime.TotalMilliseconds.ToString("F2"),
                    ["success"] = success.ToString(),
                    ["performance_category"] = GetPerformanceCategory(processingTime)
                },
                level: success ? BreadcrumbLevel.Info : BreadcrumbLevel.Error);

            if (processingTime > _verySlowOperationThreshold)
            {
                _logger.LogWarning("Very slow preference integration in service {ServiceName}: {ProcessingTime}ms for {PreferenceCount} preferences",
                    serviceName, processingTime.TotalMilliseconds, preferenceCount);

                await AlertOnPerformanceThresholdAsync($"PreferenceIntegration.{serviceName}", processingTime, _verySlowOperationThreshold);
            }
            else if (processingTime > _slowOperationThreshold)
            {
                _logger.LogInformation("Slow preference integration in service {ServiceName}: {ProcessingTime}ms for {PreferenceCount} preferences",
                    serviceName, processingTime.TotalMilliseconds, preferenceCount);
            }

            if (!success)
            {
                _logger.LogError("Failed preference integration in service {ServiceName} after {ProcessingTime}ms",
                    serviceName, processingTime.TotalMilliseconds);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error logging preference integration metrics");
        }
    }

    public async Task TrackPreferenceFilteringImpactAsync(
        string endpoint,
        int originalCount,
        int filteredCount,
        TimeSpan filteringTime)
    {
        try
        {
            var filteredPercentage = originalCount > 0 ? (double)(originalCount - filteredCount) / originalCount * 100 : 0;
            var throughput = originalCount / Math.Max(filteringTime.TotalSeconds, 0.001);

            SentrySdk.AddBreadcrumb(
                $"PreferenceFiltering: {endpoint} ({filteredPercentage:F1}% filtered in {filteringTime.TotalMilliseconds:F2}ms)",
                "preference_filter",
                data: new Dictionary<string, string>
                {
                    ["endpoint"] = endpoint,
                    ["original_count"] = originalCount.ToString(),
                    ["filtered_count"] = filteredCount.ToString(),
                    ["items_removed"] = (originalCount - filteredCount).ToString(),
                    ["filtering_time_ms"] = filteringTime.TotalMilliseconds.ToString("F2"),
                    ["filtered_percentage"] = filteredPercentage.ToString("F1"),
                    ["items_per_second"] = throughput.ToString("F0"),
                    ["performance_impact"] = GetFilteringPerformanceImpact(filteringTime, originalCount)
                },
                level: BreadcrumbLevel.Info);

            if (filteredPercentage > 50)
            {
                _logger.LogInformation("High filtering rate on {Endpoint}: {FilteredPercentage:F1}% of items filtered",
                    endpoint, filteredPercentage);
            }

            if (filteringTime > TimeSpan.FromMilliseconds(100))
            {
                _logger.LogWarning("Slow content filtering on {Endpoint}: {FilteringTime}ms for {OriginalCount} items",
                    endpoint, filteringTime.TotalMilliseconds, originalCount);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error tracking preference filtering impact");
        }
    }

    public async Task LogSlowPreferenceOperationAsync(
        string operation,
        TimeSpan duration,
        Guid userId,
        Dictionary<string, object>? metadata = null)
    {
        try
        {
            var properties = new Dictionary<string, string>
            {
                ["operation"] = operation,
                ["user_id"] = userId.ToString(),
                ["duration_ms"] = duration.TotalMilliseconds.ToString("F2"),
                ["severity"] = duration > _verySlowOperationThreshold ? "high" : "medium"
            };

            if (metadata != null)
            {
                foreach (var kvp in metadata)
                {
                    properties[$"metadata_{kvp.Key}"] = kvp.Value?.ToString() ?? "";
                }
            }

            SentrySdk.AddBreadcrumb(
                $"SlowPreferenceOperation: {operation} ({duration.TotalMilliseconds:F2}ms)",
                "preference",
                data: properties,
                level: BreadcrumbLevel.Warning);

            _logger.LogWarning("Slow preference operation detected: {Operation} took {Duration}ms for user {UserId}",
                operation, duration.TotalMilliseconds, userId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error logging slow preference operation");
        }
    }

    public async Task<PerformanceMetrics> GetPreferencePerformanceMetricsAsync(TimeSpan timeWindow)
    {
        try
        {
            // In a real implementation, this would query Sentry or a metrics database
            // For now, return a simulated response

            var metrics = new PerformanceMetrics
            {
                TimeWindow = timeWindow,
                GeneratedAt = DateTime.UtcNow,

                // Cache metrics
                CacheHitRate = 0.85, // 85% cache hit rate
                AverageCacheLookupTime = TimeSpan.FromMilliseconds(12),

                // Operation metrics
                AveragePreferenceLoadTime = TimeSpan.FromMilliseconds(45),
                AverageFilteringTime = TimeSpan.FromMilliseconds(23),

                // Integration metrics
                TotalPreferenceOperations = 15423,
                SuccessfulOperations = 15398,
                FailedOperations = 25,

                // Performance impact
                AverageFilteringImpact = 18.5, // 18.5% of items filtered on average
                SlowOperationCount = 156,
                VerySlowOperationCount = 23,

                // Top slow operations
                TopSlowOperations = new List<SlowOperationInfo>
                {
                    new() { Operation = "SearchService.ApplyPreferences", AverageDuration = TimeSpan.FromMilliseconds(245), Count = 45 },
                    new() { Operation = "FilterService.ApplyContentFilters", AverageDuration = TimeSpan.FromMilliseconds(189), Count = 67 },
                    new() { Operation = "WatchlistService.ApplyPrivacyFilters", AverageDuration = TimeSpan.FromMilliseconds(134), Count = 23 }
                }
            };

            _logger.LogInformation("Generated preference performance metrics for {TimeWindow}", timeWindow);
            return metrics;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating preference performance metrics");
            return new PerformanceMetrics { TimeWindow = timeWindow, GeneratedAt = DateTime.UtcNow };
        }
    }

    public async Task AlertOnPerformanceThresholdAsync(string operation, TimeSpan duration, TimeSpan threshold)
    {
        try
        {
            if (duration <= threshold) return;

            var exceedanceRatio = duration.TotalMilliseconds / threshold.TotalMilliseconds;
            var severity = exceedanceRatio switch
            {
                > 5 => "critical",
                > 3 => "high",
                > 2 => "medium",
                _ => "low"
            };

            SentrySdk.AddBreadcrumb(
                $"PreferencePerformanceAlert: {operation} ({duration.TotalMilliseconds:F2}ms, {exceedanceRatio:F2}x over threshold)",
                "performance_alert",
                data: new Dictionary<string, string>
                {
                    ["operation"] = operation,
                    ["duration_ms"] = duration.TotalMilliseconds.ToString("F2"),
                    ["threshold_ms"] = threshold.TotalMilliseconds.ToString("F2"),
                    ["severity"] = severity,
                    ["exceedance_ratio"] = exceedanceRatio.ToString("F2")
                },
                level: severity is "critical" or "high" ? BreadcrumbLevel.Error : BreadcrumbLevel.Warning);

            if (severity == "critical" || severity == "high")
            {
                _logger.LogError("Performance threshold exceeded for {Operation}: {Duration}ms (threshold: {Threshold}ms, {ExceedanceRatio}x over)",
                    operation, duration.TotalMilliseconds, threshold.TotalMilliseconds, exceedanceRatio);
            }
            else
            {
                _logger.LogWarning("Performance threshold exceeded for {Operation}: {Duration}ms (threshold: {Threshold}ms)",
                    operation, duration.TotalMilliseconds, threshold.TotalMilliseconds);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending performance alert for operation {Operation}", operation);
        }
    }

    private string GetCacheTypeFromKey(string cacheKey)
    {
        if (cacheKey.Contains("search_prefs")) return "search_preferences";
        if (cacheKey.Contains("notification_prefs")) return "notification_preferences";
        if (cacheKey.Contains("privacy_prefs")) return "privacy_preferences";
        if (cacheKey.Contains("content_filter_prefs")) return "content_filter_preferences";
        if (cacheKey.Contains("user_pref")) return "individual_preference";
        if (cacheKey.Contains("user_prefs_category")) return "category_preferences";
        return "unknown";
    }

    private string GetPerformanceCategory(TimeSpan duration)
    {
        return duration.TotalMilliseconds switch
        {
            < 50 => "excellent",
            < 100 => "good",
            < 200 => "acceptable",
            < 500 => "slow",
            _ => "very_slow"
        };
    }

    private string GetFilteringPerformanceImpact(TimeSpan filteringTime, int itemCount)
    {
        var itemsPerMs = itemCount / Math.Max(filteringTime.TotalMilliseconds, 1);

        return itemsPerMs switch
        {
            > 10 => "minimal",
            > 5 => "low",
            > 2 => "moderate",
            > 1 => "high",
            _ => "severe"
        };
    }
}

/// <summary>
/// Performance metrics for preference operations
/// </summary>
public class PerformanceMetrics
{
    public TimeSpan TimeWindow { get; set; }
    public DateTime GeneratedAt { get; set; }

    // Cache metrics
    public double CacheHitRate { get; set; }
    public TimeSpan AverageCacheLookupTime { get; set; }

    // Operation timing
    public TimeSpan AveragePreferenceLoadTime { get; set; }
    public TimeSpan AverageFilteringTime { get; set; }

    // Volume metrics
    public int TotalPreferenceOperations { get; set; }
    public int SuccessfulOperations { get; set; }
    public int FailedOperations { get; set; }

    // Performance impact
    public double AverageFilteringImpact { get; set; } // Percentage of items filtered
    public int SlowOperationCount { get; set; }
    public int VerySlowOperationCount { get; set; }

    // Top problematic operations
    public List<SlowOperationInfo> TopSlowOperations { get; set; } = new();

    public double SuccessRate => TotalPreferenceOperations > 0
        ? (double)SuccessfulOperations / TotalPreferenceOperations * 100
        : 0;
}

public class SlowOperationInfo
{
    public string Operation { get; set; } = string.Empty;
    public TimeSpan AverageDuration { get; set; }
    public int Count { get; set; }
}
