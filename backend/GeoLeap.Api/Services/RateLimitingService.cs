using System;
using System.Collections.Concurrent;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using GeoLeap.Api.Exceptions;

namespace GeoLeap.Api.Services;

public class RateLimitingService : IRateLimitingService
{
    private readonly IMemoryCache _cache;
    private readonly ILogger<RateLimitingService> _logger;
    private readonly SemaphoreSlim _semaphore = new(1, 1);

    public RateLimitingService(IMemoryCache cache, ILogger<RateLimitingService> logger)
    {
        _cache = cache;
        _logger = logger;
    }

    public async Task<RateLimitResult> CheckRateLimitAsync(string key, int maxRequests, TimeSpan window)
    {
        // Guard clause: 0 or negative maxRequests should always block
        if (maxRequests <= 0)
        {
            _logger.LogDebug("Rate limit check for key {Key}: maxRequests={MaxRequests} <= 0, blocking", key, maxRequests);
            return new RateLimitResult
            {
                IsAllowed = false,
                RemainingRequests = 0,
                RetryAfter = window,
                WindowResetTime = DateTime.UtcNow.Add(window),
                TotalRequestsInWindow = 0
            };
        }

        await _semaphore.WaitAsync();
        try
        {
            var now = DateTime.UtcNow;
            var windowKey = GetWindowKey(key, window, now);
            
            if (!_cache.TryGetValue(windowKey, out RateLimitWindow? rateLimitWindow) || rateLimitWindow == null)
            {
                rateLimitWindow = new RateLimitWindow
                {
                    StartTime = GetWindowStart(now, window),
                    RequestCount = 1,
                    MaxRequests = maxRequests
                };

                var windowExpiry = rateLimitWindow.StartTime.Add(window).AddSeconds(1); // Add buffer
                _cache.Set(windowKey, rateLimitWindow, new MemoryCacheEntryOptions
                {
                    AbsoluteExpiration = windowExpiry,
                    Size = 1 // Required when SizeLimit is set
                });

                _logger.LogDebug("Rate limit window created for key {Key}: {RequestCount}/{MaxRequests}", 
                    key, rateLimitWindow.RequestCount, maxRequests);

                return new RateLimitResult
                {
                    IsAllowed = true,
                    RemainingRequests = maxRequests - 1,
                    RetryAfter = TimeSpan.Zero,
                    WindowResetTime = rateLimitWindow.StartTime.Add(window),
                    TotalRequestsInWindow = 1
                };
            }

            // Check if we're in a new window
            var currentWindowStart = GetWindowStart(now, window);
            if (rateLimitWindow.StartTime < currentWindowStart)
            {
                // New window, reset counter
                rateLimitWindow.StartTime = currentWindowStart;
                rateLimitWindow.RequestCount = 1;
                rateLimitWindow.MaxRequests = maxRequests;

                // Update cache with reset window
                var windowExpiry = rateLimitWindow.StartTime.Add(window).AddSeconds(1); // Add buffer
                _cache.Set(windowKey, rateLimitWindow, new MemoryCacheEntryOptions
                {
                    AbsoluteExpiration = windowExpiry,
                    Size = 1 // Required when SizeLimit is set
                });

                _logger.LogDebug("Rate limit window reset for key {Key}: {RequestCount}/{MaxRequests}", 
                    key, rateLimitWindow.RequestCount, maxRequests);

                return new RateLimitResult
                {
                    IsAllowed = true,
                    RemainingRequests = maxRequests - 1,
                    RetryAfter = TimeSpan.Zero,
                    WindowResetTime = currentWindowStart.Add(window),
                    TotalRequestsInWindow = 1
                };
            }

            // Check if limit is exceeded
            if (rateLimitWindow.RequestCount >= maxRequests)
            {
                var retryAfter = rateLimitWindow.StartTime.Add(window) - now;

                _logger.LogWarning("Rate limit exceeded for key {Key}: {RequestCount}/{MaxRequests}. Retry after {RetryAfter}",
                    key, rateLimitWindow.RequestCount, maxRequests, retryAfter);

                return new RateLimitResult
                {
                    IsAllowed = false,
                    RemainingRequests = 0,
                    RetryAfter = retryAfter > TimeSpan.Zero ? retryAfter : TimeSpan.Zero,
                    WindowResetTime = rateLimitWindow.StartTime.Add(window),
                    TotalRequestsInWindow = rateLimitWindow.RequestCount
                };
            }

            // RACE CONDITION FIX: Increment counter and update cache atomically
            // Keep this operation within the semaphore-protected section
            rateLimitWindow.RequestCount++;

            // Update cache with incremented counter immediately
            var expiry = rateLimitWindow.StartTime.Add(window).AddSeconds(1); // Add buffer
            _cache.Set(windowKey, rateLimitWindow, new MemoryCacheEntryOptions
            {
                AbsoluteExpiration = expiry,
                Size = 1 // Required when SizeLimit is set
            });

            _logger.LogDebug("Rate limit updated for key {Key}: {RequestCount}/{MaxRequests}",
                key, rateLimitWindow.RequestCount, maxRequests);

            // Create result with current values
            var result = new RateLimitResult
            {
                IsAllowed = true,
                RemainingRequests = maxRequests - rateLimitWindow.RequestCount,
                RetryAfter = TimeSpan.Zero,
                WindowResetTime = rateLimitWindow.StartTime.Add(window),
                TotalRequestsInWindow = rateLimitWindow.RequestCount
            };

            return result;
        }
        finally
        {
            _semaphore.Release();
        }
    }

    public async Task<RateLimitResult> CheckRateLimitAsync(string userId, string endpoint, int maxRequests, TimeSpan window)
    {
        var key = $"user:{userId}:endpoint:{endpoint}";
        return await CheckRateLimitAsync(key, maxRequests, window);
    }

    public async Task ResetRateLimitAsync(string key)
    {
        await _semaphore.WaitAsync();
        try
        {
            // Remove rate limits for common window sizes
            // MemoryCache doesn't support pattern-based removal, so we try common windows
            var now = DateTime.UtcNow;
            var commonWindows = new[]
            {
                TimeSpan.FromSeconds(1),
                TimeSpan.FromSeconds(10),
                TimeSpan.FromSeconds(30),
                TimeSpan.FromMinutes(1),
                TimeSpan.FromMinutes(5),
                TimeSpan.FromMinutes(10),
                TimeSpan.FromMinutes(15),
                TimeSpan.FromMinutes(30),
                TimeSpan.FromHours(1),
                TimeSpan.FromHours(24)
            };

            foreach (var window in commonWindows)
            {
                var windowKey = GetWindowKey(key, window, now);
                _cache.Remove(windowKey);
            }

            // Also try removing the raw key as fallback
            _cache.Remove(key);

            _logger.LogInformation("Rate limit reset for key {Key}", key);
        }
        finally
        {
            _semaphore.Release();
        }
    }

    public async Task<RateLimitStats> GetRateLimitStatsAsync(string key)
    {
        await _semaphore.WaitAsync();
        try
        {
            var now = DateTime.UtcNow;
            var window = TimeSpan.FromMinutes(1); // Default window for stats
            var windowKey = GetWindowKey(key, window, now);
            
            if (_cache.TryGetValue(windowKey, out RateLimitWindow? rateLimitWindow) && rateLimitWindow != null)
            {
                return new RateLimitStats
                {
                    Key = key,
                    RequestCount = rateLimitWindow.RequestCount,
                    MaxRequests = rateLimitWindow.MaxRequests,
                    WindowStart = rateLimitWindow.StartTime,
                    WindowEnd = rateLimitWindow.StartTime.Add(window),
                    IsBlocked = rateLimitWindow.RequestCount >= rateLimitWindow.MaxRequests
                };
            }

            return new RateLimitStats
            {
                Key = key,
                RequestCount = 0,
                MaxRequests = 0,
                WindowStart = GetWindowStart(now, window),
                WindowEnd = GetWindowStart(now, window).Add(window),
                IsBlocked = false
            };
        }
        finally
        {
            _semaphore.Release();
        }
    }

    private static string GetWindowKey(string key, TimeSpan window, DateTime now)
    {
        var windowStart = GetWindowStart(now, window);
        return $"ratelimit:{key}:{windowStart.Ticks}";
    }

    private static DateTime GetWindowStart(DateTime now, TimeSpan window)
    {
        var windowTicks = window.Ticks;
        var windowStartTicks = (now.Ticks / windowTicks) * windowTicks;
        return new DateTime(windowStartTicks, DateTimeKind.Utc);
    }
}

internal class RateLimitWindow
{
    public DateTime StartTime { get; set; }
    public int RequestCount { get; set; }
    public int MaxRequests { get; set; }
}