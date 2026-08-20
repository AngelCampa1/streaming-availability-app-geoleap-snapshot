using Microsoft.Extensions.Caching.Distributed;
using System.Text.Json;

namespace GeoLeap.Api.Middleware;

public class LoginRateLimitMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IDistributedCache _cache;
    private readonly ILogger<LoginRateLimitMiddleware> _logger;
    private readonly IWebHostEnvironment _environment;

    // Environment-specific rate limits
    private readonly int _maxLoginAttempts;
    private readonly int _maxRegistrationAttempts;
    private static readonly TimeSpan TimeWindow = TimeSpan.FromMinutes(5); // Changed from 1 minute to 5 minutes for better UX

    public LoginRateLimitMiddleware(
        RequestDelegate next,
        IDistributedCache cache,
        ILogger<LoginRateLimitMiddleware> logger,
        IWebHostEnvironment environment)
    {
        _next = next;
        _cache = cache;
        _logger = logger;
        _environment = environment;

        // SECURITY FIX: Reduced development limits from 100 to 20 to better simulate production
        // while still allowing E2E tests to run
        // Production: 10 login attempts and 10 registration attempts per 5 minutes per IP
        // NOTE: 3 registrations was too restrictive - users behind NAT/shared IPs (offices, cafes, universities)
        // would hit the limit very quickly. Increased to 10 to allow legitimate users while still preventing abuse.
        _maxLoginAttempts = environment.IsDevelopment() || environment.IsEnvironment("Testing") ? 20 : 10;
        _maxRegistrationAttempts = environment.IsDevelopment() || environment.IsEnvironment("Testing") ? 20 : 10;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Apply rate limiting to both login and registration endpoints
        if (IsLoginEndpoint(context) || IsRegistrationEndpoint(context))
        {
            try
            {
                var isRegistration = IsRegistrationEndpoint(context);
                var maxAttempts = isRegistration ? _maxRegistrationAttempts : _maxLoginAttempts;
                var endpointType = isRegistration ? "registration" : "login";
                var ipAddress = GetClientIpAddress(context);
                var rateLimitKey = $"{endpointType}_rate_limit_{ipAddress}";

                var requestInfo = await GetRequestInfoAsync(rateLimitKey);

                // Clean old requests outside the time window
                var cutoff = DateTime.UtcNow.Subtract(TimeWindow);
                requestInfo.Requests = requestInfo.Requests.Where(r => r > cutoff).ToList();

                if (requestInfo.Requests.Count >= maxAttempts)
                {
                    _logger.LogWarning("Rate limit exceeded for IP: {IpAddress} on {Endpoint}. {RequestCount} requests in {TimeWindow}. Limit: {MaxAttempts}",
                        ipAddress, endpointType, requestInfo.Requests.Count, TimeWindow, maxAttempts);

                    // CRITICAL: Set CORS headers even for rate-limited responses
                    // This prevents browsers from showing CORS errors instead of the actual rate limit error
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
                        message = $"Too many {endpointType} attempts. Please try again in {TimeWindow.TotalMinutes} minutes. ({requestInfo.Requests.Count}/{maxAttempts} requests)",
                        errors = new[] { $"Rate limit exceeded: {requestInfo.Requests.Count}/{maxAttempts} requests in {TimeWindow.TotalMinutes} minute(s). This is a security measure to prevent brute force attacks." }
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
            catch (Exception ex)
            {
                // Log the error but don't block the request - graceful degradation
                _logger.LogWarning(ex, "Rate limiting cache unavailable, allowing request to proceed");
            }
        }

        await _next(context);
    }

    private static bool IsLoginEndpoint(HttpContext context)
    {
        return context.Request.Method == "POST" &&
               context.Request.Path.StartsWithSegments("/api/auth/login");
    }

    private static bool IsRegistrationEndpoint(HttpContext context)
    {
        return context.Request.Method == "POST" &&
               context.Request.Path.StartsWithSegments("/api/auth/register");
    }

    private string GetClientIpAddress(HttpContext context)
    {
        // FIXED: Week 1 Day 4 - Prevent IP spoofing by validating trusted proxies (Bug #11)
        var clientIp = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";

        // Only trust forwarded headers from known proxies
        var trustedProxies = new[] { "127.0.0.1", "::1" };
        var remoteIp = context.Connection.RemoteIpAddress?.ToString() ?? "";

        if (trustedProxies.Contains(remoteIp))
        {
            var ipAddress = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
            if (string.IsNullOrEmpty(ipAddress))
            {
                ipAddress = context.Request.Headers["X-Real-IP"].FirstOrDefault();
            }
            if (!string.IsNullOrEmpty(ipAddress) && System.Net.IPAddress.TryParse(ipAddress.Split(',')[0].Trim(), out _))
            {
                clientIp = ipAddress.Split(',')[0].Trim();
            }
        }

        return clientIp;
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
            _logger.LogError(ex, "Error retrieving rate limit info for key: {Key}", key);
            return new RequestInfo();
        }
    }

    private class RequestInfo
    {
        public List<DateTime> Requests { get; set; } = new();
    }
}