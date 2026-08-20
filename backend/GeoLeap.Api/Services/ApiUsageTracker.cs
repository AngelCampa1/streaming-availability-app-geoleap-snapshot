using Sentry;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Options;
using GeoLeap.Api.Models;
using GeoLeap.Api.Data;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace GeoLeap.Api.Services;

public class ApiUsageTracker : IApiUsageTracker
{
    private readonly ApplicationDbContext _context;
    private readonly IDistributedCache _cache;
    private readonly IOptionsMonitor<StreamingApiSettings> _settings;
    private readonly ILogger<ApiUsageTracker> _logger;
    private readonly IApiCostManager _costManager;

    public ApiUsageTracker(
        ApplicationDbContext context,
        IDistributedCache cache,
        IOptionsMonitor<StreamingApiSettings> settings,
        ILogger<ApiUsageTracker> logger,
        IApiCostManager costManager)
    {
        _context = context;
        _cache = cache;
        _settings = settings;
        _logger = logger;
        _costManager = costManager;
    }

    public async Task TrackApiCallAsync(
        string endpoint, 
        bool success, 
        int responseTimeMs, 
        decimal estimatedCost, 
        string? correlationId = null, 
        string? errorMessage = null, 
        int httpStatusCode = 200)
    {
        try
        {
            // Save to database
            var usage = new ApiUsageRecord
            {
                Endpoint = endpoint,
                Timestamp = DateTime.UtcNow,
                Success = success,
                ResponseTimeMs = responseTimeMs,
                EstimatedCost = estimatedCost,
                CorrelationId = correlationId,
                ErrorMessage = errorMessage,
                HttpStatusCode = httpStatusCode
            };

            _context.ApiUsageRecords.Add(usage);
            await _context.SaveChangesAsync();

            // Update cache counters
            await UpdateCacheCountersAsync(estimatedCost, success);

            // Send telemetry
            SentrySdk.AddBreadcrumb(
                $"streaming_api.calls: {endpoint} ({(success ? "success" : "failed")})",
                "api",
                data: new Dictionary<string, string>
                {
                    ["endpoint"] = endpoint,
                    ["success"] = success.ToString(),
                    ["correlation_id"] = correlationId ?? "unknown",
                    ["cost"] = estimatedCost.ToString(),
                    ["response_time_ms"] = responseTimeMs.ToString()
                },
                level: success ? BreadcrumbLevel.Info : BreadcrumbLevel.Error);

            if (!success)
            {
                SentrySdk.AddBreadcrumb(
                    $"streaming_api.error: {endpoint}",
                    "api_error",
                    data: new Dictionary<string, string>
                    {
                        ["endpoint"] = endpoint,
                        ["error"] = errorMessage ?? "unknown_error",
                        ["status_code"] = httpStatusCode.ToString()
                    },
                    level: BreadcrumbLevel.Error);
            }

            _logger.LogInformation(
                "API call tracked: Endpoint={Endpoint}, Success={Success}, ResponseTime={ResponseTime}ms, Cost={Cost}, CorrelationId={CorrelationId}",
                endpoint, success, responseTimeMs, estimatedCost, correlationId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to track API usage for endpoint {Endpoint}", endpoint);
            // Don't throw - usage tracking failure shouldn't break the main flow
        }
    }

    public async Task<ApiUsageStats> GetUsageStatsAsync()
    {
        try
        {
            var today = DateTime.UtcNow.Date;
            var monthStart = new DateTime(today.Year, today.Month, 1);

            // Try cache first
            var cacheKey = $"usage_stats_{today:yyyyMMdd}";
            var cachedStats = await GetFromCacheAsync<ApiUsageStats>(cacheKey);
            if (cachedStats != null)
            {
                return cachedStats;
            }

            // Get from database
            var dailyStats = await _context.ApiUsageRecords
                .Where(r => r.Timestamp >= today && r.Timestamp < today.AddDays(1))
                .GroupBy(r => 1)
                .Select(g => new
                {
                    Calls = g.Count(),
                    Cost = g.Sum(r => r.EstimatedCost)
                })
                .FirstOrDefaultAsync();

            var monthlyStats = await _context.ApiUsageRecords
                .Where(r => r.Timestamp >= monthStart && r.Timestamp < monthStart.AddMonths(1))
                .GroupBy(r => 1)
                .Select(g => new
                {
                    Calls = g.Count(),
                    Cost = g.Sum(r => r.EstimatedCost)
                })
                .FirstOrDefaultAsync();

            var stats = new ApiUsageStats
            {
                CallsToday = dailyStats?.Calls ?? 0,
                CallsThisMonth = monthlyStats?.Calls ?? 0,
                CostToday = dailyStats?.Cost ?? 0,
                CostThisMonth = monthlyStats?.Cost ?? 0,
                RemainingCalls = Math.Max(0, _settings.CurrentValue.RateLimitPerMinute - (dailyStats?.Calls ?? 0)),
                ResetDate = today.AddDays(1)
            };

            // Cache for 5 minutes
            await SetCacheAsync(cacheKey, stats, TimeSpan.FromMinutes(5));

            return stats;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting usage stats");
            return new ApiUsageStats(); // Return empty stats on error
        }
    }

    public async Task<bool> CanMakeApiCallAsync()
    {
        return await _costManager.CanMakeApiCallAsync();
    }

    public async Task<decimal> GetDailyCostAsync()
    {
        return await _costManager.GetDailyCostAsync();
    }

    public async Task<decimal> GetMonthlyCostAsync()
    {
        return await _costManager.GetMonthlyCostAsync();
    }

    public async Task<int> GetDailyCallCountAsync()
    {
        try
        {
            var today = DateTime.UtcNow.Date;
            return await _context.ApiUsageRecords
                .Where(r => r.Timestamp >= today && r.Timestamp < today.AddDays(1))
                .CountAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting daily call count");
            return 0;
        }
    }

    public async Task<int> GetMonthlyCallCountAsync()
    {
        try
        {
            var monthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
            return await _context.ApiUsageRecords
                .Where(r => r.Timestamp >= monthStart && r.Timestamp < monthStart.AddMonths(1))
                .CountAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting monthly call count");
            return 0;
        }
    }

    private async Task UpdateCacheCountersAsync(decimal cost, bool success)
    {
        try
        {
            var today = DateTime.UtcNow.Date;
            var dailyCostKey = $"daily_cost_{today:yyyyMMdd}";
            var dailyCallKey = $"daily_calls_{today:yyyyMMdd}";

            // Update daily cost
            var currentCostStr = await _cache.GetStringAsync(dailyCostKey);
            var currentCost = decimal.TryParse(currentCostStr, out var cost1) ? cost1 : 0;
            await _cache.SetStringAsync(dailyCostKey, (currentCost + cost).ToString(), 
                new DistributedCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromDays(1)
                });

            // Update daily calls
            var currentCallsStr = await _cache.GetStringAsync(dailyCallKey);
            var currentCalls = int.TryParse(currentCallsStr, out var calls) ? calls : 0;
            await _cache.SetStringAsync(dailyCallKey, (currentCalls + 1).ToString(),
                new DistributedCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromDays(1)
                });
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to update cache counters");
        }
    }

    private async Task<T?> GetFromCacheAsync<T>(string key) where T : class
    {
        try
        {
            var cachedValue = await _cache.GetStringAsync(key);
            if (!string.IsNullOrEmpty(cachedValue))
            {
                return JsonSerializer.Deserialize<T>(cachedValue);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error retrieving from cache with key {Key}", key);
        }

        return null;
    }

    private async Task SetCacheAsync<T>(string key, T value, TimeSpan expiration)
    {
        try
        {
            var json = JsonSerializer.Serialize(value);
            var options = new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = expiration
            };
            await _cache.SetStringAsync(key, json, options);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error setting cache with key {Key}", key);
        }
    }
}