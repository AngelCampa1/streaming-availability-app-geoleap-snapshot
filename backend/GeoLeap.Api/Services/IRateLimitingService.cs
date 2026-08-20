using System;
using System.Threading.Tasks;

namespace GeoLeap.Api.Services;

public interface IRateLimitingService
{
    Task<RateLimitResult> CheckRateLimitAsync(string key, int maxRequests, TimeSpan window);
    Task<RateLimitResult> CheckRateLimitAsync(string userId, string endpoint, int maxRequests, TimeSpan window);
    Task ResetRateLimitAsync(string key);
    Task<RateLimitStats> GetRateLimitStatsAsync(string key);
}

public class RateLimitResult
{
    public bool IsAllowed { get; set; }
    public int RemainingRequests { get; set; }
    public TimeSpan RetryAfter { get; set; }
    public DateTime WindowResetTime { get; set; }
    public int TotalRequestsInWindow { get; set; }
}

public class RateLimitStats
{
    public string Key { get; set; } = string.Empty;
    public int RequestCount { get; set; }
    public int MaxRequests { get; set; }
    public DateTime WindowStart { get; set; }
    public DateTime WindowEnd { get; set; }
    public bool IsBlocked { get; set; }
}