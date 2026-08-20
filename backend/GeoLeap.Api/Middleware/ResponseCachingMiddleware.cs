using Microsoft.Extensions.Caching.Distributed;
using System.Security.Cryptography;
using System.Text;

namespace GeoLeap.Api.Middleware;

/// <summary>
/// Middleware for intelligent HTTP response caching
/// PERFORMANCE: Reduces database load and improves response times
/// </summary>
public class ResponseCachingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly IDistributedCache _cache;
    private readonly ILogger<ResponseCachingMiddleware> _logger;
    private readonly IWebHostEnvironment _environment;

    // Cache durations for different endpoint types
    private static readonly TimeSpan DefaultCacheDuration = TimeSpan.FromMinutes(5);
    private static readonly TimeSpan ContentCacheDuration = TimeSpan.FromMinutes(30);
    private static readonly TimeSpan StaticDataCacheDuration = TimeSpan.FromHours(1);

    public ResponseCachingMiddleware(
        RequestDelegate next,
        IDistributedCache cache,
        ILogger<ResponseCachingMiddleware> logger,
        IWebHostEnvironment environment)
    {
        _next = next;
        _cache = cache;
        _logger = logger;
        _environment = environment;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Only cache GET requests
        if (context.Request.Method != HttpMethods.Get)
        {
            await _next(context);
            return;
        }

        // Skip caching for authenticated user-specific endpoints
        if (ShouldSkipCaching(context))
        {
            await _next(context);
            return;
        }

        var cacheKey = GenerateCacheKey(context);
        var cacheDuration = GetCacheDuration(context.Request.Path);

        try
        {
            // Try to get from cache
            var cachedResponse = await _cache.GetStringAsync(cacheKey);

            if (!string.IsNullOrEmpty(cachedResponse))
            {
                _logger.LogDebug("Cache HIT for key: {CacheKey}", cacheKey);

                context.Response.Headers.Append("X-Cache", "HIT");
                context.Response.ContentType = "application/json";
                context.Response.StatusCode = 200;

                await context.Response.WriteAsync(cachedResponse);
                return;
            }

            _logger.LogDebug("Cache MISS for key: {CacheKey}", cacheKey);
            context.Response.Headers.Append("X-Cache", "MISS");

            // Capture response body
            var originalBodyStream = context.Response.Body;
            using var responseBody = new MemoryStream();
            context.Response.Body = responseBody;

            await _next(context);

            // Only cache successful responses (200 OK)
            if (context.Response.StatusCode == 200 &&
                context.Response.ContentType?.Contains("application/json") == true)
            {
                responseBody.Seek(0, SeekOrigin.Begin);
                string responseText;
                using (var reader = new StreamReader(responseBody))
                {
                    responseText = await reader.ReadToEndAsync();
                }

                // Store in cache
                var cacheOptions = new DistributedCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = cacheDuration
                };

                await _cache.SetStringAsync(cacheKey, responseText, cacheOptions);
                _logger.LogDebug("Cached response for key: {CacheKey}, Duration: {Duration}",
                    cacheKey, cacheDuration);

                // Write response back
                responseBody.Seek(0, SeekOrigin.Begin);
                await responseBody.CopyToAsync(originalBodyStream);
            }
            else
            {
                // Write response without caching
                responseBody.Seek(0, SeekOrigin.Begin);
                await responseBody.CopyToAsync(originalBodyStream);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in response caching middleware");
            await _next(context);
        }
    }

    /// <summary>
    /// Determine if caching should be skipped for this request
    /// </summary>
    private bool ShouldSkipCaching(HttpContext context)
    {
        var path = context.Request.Path.Value?.ToLowerInvariant() ?? "";

        // Skip caching for user-specific endpoints
        if (path.Contains("/user/") ||
            path.Contains("/auth/") ||
            path.Contains("/subscription/") ||
            path.Contains("/payment/") ||
            path.Contains("/profile/"))
        {
            return true;
        }

        // Skip if Authorization header present (user-specific data)
        if (context.Request.Headers.ContainsKey("Authorization"))
        {
            return path.Contains("/watchlist") || // User-specific watchlists
                   path.Contains("/preferences") || // User preferences
                   path.Contains("/notifications"); // User notifications
        }

        return false;
    }

    /// <summary>
    /// Generate cache key from request
    /// PERFORMANCE: Includes query parameters and headers for accurate cache differentiation
    /// </summary>
    private string GenerateCacheKey(HttpContext context)
    {
        var keyBuilder = new StringBuilder();

        // Include path
        keyBuilder.Append(context.Request.Path.Value);

        // Include query string
        if (context.Request.QueryString.HasValue)
        {
            keyBuilder.Append(context.Request.QueryString.Value);
        }

        // Include Accept-Language header for localized content
        if (context.Request.Headers.TryGetValue("Accept-Language", out var language))
        {
            keyBuilder.Append($"|lang:{language}");
        }

        // Generate hash for consistent key length
        using var sha256 = SHA256.Create();
        var hashBytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(keyBuilder.ToString()));
        var hash = Convert.ToBase64String(hashBytes)
            .Replace("+", "-")
            .Replace("/", "_")
            .Replace("=", "");

        return $"response_cache:{hash}";
    }

    /// <summary>
    /// Get cache duration based on endpoint type
    /// PERFORMANCE: Longer caching for static/infrequently changing data
    /// </summary>
    private TimeSpan GetCacheDuration(PathString path)
    {
        var pathValue = path.Value?.ToLowerInvariant() ?? "";

        // Content metadata (movies, shows) - changes infrequently
        if (pathValue.Contains("/content/") ||
            pathValue.Contains("/search/") ||
            pathValue.Contains("/discover/"))
        {
            return ContentCacheDuration; // 30 minutes
        }

        // Static configuration data
        if (pathValue.Contains("/genres") ||
            pathValue.Contains("/streaming-services") ||
            pathValue.Contains("/vpn-providers"))
        {
            return StaticDataCacheDuration; // 1 hour
        }

        // Default for all other GET endpoints
        return DefaultCacheDuration; // 5 minutes
    }
}

/// <summary>
/// Extension method to register ResponseCachingMiddleware
/// </summary>
public static class ResponseCachingMiddlewareExtensions
{
    public static IApplicationBuilder UseResponseCaching(this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<ResponseCachingMiddleware>();
    }
}
