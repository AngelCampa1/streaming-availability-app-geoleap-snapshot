using Microsoft.Extensions.Caching.Distributed;
using System.Text.Json;

namespace GeoLeap.Api.Middleware;

/// <summary>
/// Middleware to prevent distributed password reset attacks by rate limiting requests per IP address.
/// Enforces a maximum of 10 password reset requests per hour per IP.
/// </summary>
public class PasswordResetRateLimitMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IDistributedCache _cache;
    private readonly ILogger<PasswordResetRateLimitMiddleware> _logger;
    private readonly IWebHostEnvironment _environment;

    // Rate limit configuration - SECURITY HARDENED
    private readonly int _maxAttempts;
    private static readonly TimeSpan TimeWindow = TimeSpan.FromHours(1); // 1 hour window

    public PasswordResetRateLimitMiddleware(
        RequestDelegate next,
        IDistributedCache cache,
        ILogger<PasswordResetRateLimitMiddleware> logger,
        IWebHostEnvironment environment)
    {
        _next = next;
        _cache = cache;
        _logger = logger;
        _environment = environment;

        // SECURITY: Stricter limits - 3 attempts per hour in production (reduced from 10)
        // Higher limits for development/testing to avoid blocking legitimate tests
        _maxAttempts = environment.IsDevelopment() || environment.IsEnvironment("Testing") ? 100 : 3;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Only apply rate limiting to password reset endpoints
        if (IsPasswordResetEndpoint(context))
        {
            var ipAddress = GetClientIpAddress(context);
            var rateLimitKey = $"password_reset_rate_limit_{ipAddress}";

            var requestInfo = await GetRequestInfoAsync(rateLimitKey);

            // Clean old requests outside the time window
            var cutoff = DateTime.UtcNow.Subtract(TimeWindow);
            requestInfo.Requests = requestInfo.Requests.Where(r => r > cutoff).ToList();

            if (requestInfo.Requests.Count >= _maxAttempts)
            {
                _logger.LogWarning(
                    "Password reset rate limit exceeded for IP: {IpAddress}. {RequestCount} requests in {TimeWindow}. Limit: {MaxAttempts}",
                    ipAddress,
                    requestInfo.Requests.Count,
                    TimeWindow,
                    _maxAttempts);

                // Set CORS headers for rate-limited responses
                if (context.Request.Headers.ContainsKey("Origin"))
                {
                    var origin = context.Request.Headers["Origin"].ToString();
                    if (_environment.IsDevelopment() && (origin.Contains("localhost:3020") || origin.Contains("localhost:3000")))
                    {
                        context.Response.Headers.Append("Access-Control-Allow-Origin", origin);
                        context.Response.Headers.Append("Access-Control-Allow-Credentials", "true");
                    }
                }

                context.Response.StatusCode = 429; // Too Many Requests
                context.Response.ContentType = "application/json";

                var response = new
                {
                    success = false,
                    message = $"Too many password reset attempts. Please try again later. ({requestInfo.Requests.Count}/{_maxAttempts} requests)",
                    errors = new[] { $"Rate limit exceeded: {requestInfo.Requests.Count}/{_maxAttempts} requests in {TimeWindow.TotalHours} hour(s)" },
                    retryAfter = TimeWindow.TotalSeconds
                };

                await context.Response.WriteAsync(JsonSerializer.Serialize(response));
                return;
            }

            // Add current request
            requestInfo.Requests.Add(DateTime.UtcNow);

            var options = new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeWindow
            };

            await _cache.SetStringAsync(rateLimitKey, JsonSerializer.Serialize(requestInfo), options);
        }

        await _next(context);
    }

    private static bool IsPasswordResetEndpoint(HttpContext context)
    {
        return context.Request.Method == "POST" &&
               (context.Request.Path.StartsWithSegments("/api/auth/forgot-password") ||
                context.Request.Path.StartsWithSegments("/api/auth/reset-password"));
    }

    private string GetClientIpAddress(HttpContext context)
    {
        // Check for IP from reverse proxy headers first
        var ipAddress = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (string.IsNullOrEmpty(ipAddress))
        {
            ipAddress = context.Request.Headers["X-Real-IP"].FirstOrDefault();
        }
        if (string.IsNullOrEmpty(ipAddress))
        {
            ipAddress = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        }
        return ipAddress;
    }

    private async Task<RequestInfo> GetRequestInfoAsync(string key)
    {
        try
        {
            var requestInfoJson = await _cache.GetStringAsync(key);

            if (string.IsNullOrEmpty(requestInfoJson))
                return new RequestInfo();

            return JsonSerializer.Deserialize<RequestInfo>(requestInfoJson) ?? new RequestInfo();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving password reset rate limit info for key: {Key}", key);
            return new RequestInfo();
        }
    }

    private class RequestInfo
    {
        public List<DateTime> Requests { get; set; } = new();
    }
}
