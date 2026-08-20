using System;
using System.Net;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using GeoLeap.Api.Services;
using GeoLeap.Api.Models;
using GeoLeap.Api.Exceptions;

namespace GeoLeap.Api.Middleware;

public class RateLimitingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RateLimitingMiddleware> _logger;
    private readonly IRateLimitingService _rateLimitingService;

    // Rate limit configurations for different endpoints
    // NOTE: Login and registration limits increased from 5/3 to 10/10 to accommodate users behind
    // shared IPs (offices, cafes, universities, NAT) while still preventing abuse
    private readonly Dictionary<string, (int maxRequests, TimeSpan window)> _endpointLimits = new()
    {
        ["/api/auth/login"] = (10, TimeSpan.FromMinutes(5)),     // 10 requests per 5 minutes
        ["/api/auth/register"] = (10, TimeSpan.FromMinutes(5)),  // 10 requests per 5 minutes
        ["/api/search"] = (100, TimeSpan.FromMinutes(1)),        // 100 requests per minute
        ["/api/content"] = (200, TimeSpan.FromMinutes(1)),       // 200 requests per minute
        ["default"] = (1000, TimeSpan.FromMinutes(1))            // Default: 1000 requests per minute
    };

    public RateLimitingMiddleware(
        RequestDelegate next,
        ILogger<RateLimitingMiddleware> logger,
        IRateLimitingService rateLimitingService)
    {
        _next = next;
        _logger = logger;
        _rateLimitingService = rateLimitingService;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            // Skip rate limiting for certain endpoints
            if (ShouldSkipRateLimit(context))
            {
                await _next(context);
                return;
            }

            var rateLimitResult = await CheckRateLimitAsync(context);
            
            if (rateLimitResult?.IsAllowed == false)
            {
                await HandleRateLimitExceededAsync(context, rateLimitResult);
                return;
            }

            // Add rate limit headers to response
            if (rateLimitResult != null)
            {
                AddRateLimitHeaders(context.Response, rateLimitResult);
            }

            await _next(context);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in rate limiting middleware");
            throw;
        }
    }

    private async Task<RateLimitResult> CheckRateLimitAsync(HttpContext context)
    {
        var clientId = GetClientIdentifier(context);
        var endpoint = GetEndpointKey(context);
        var (maxRequests, window) = GetRateLimitForEndpoint(endpoint);

        _logger.LogDebug("Checking rate limit for client {ClientId} on endpoint {Endpoint}: {MaxRequests} per {Window}",
            clientId, endpoint, maxRequests, window);

        return await _rateLimitingService.CheckRateLimitAsync(clientId, endpoint, maxRequests, window);
    }

    private async Task HandleRateLimitExceededAsync(HttpContext context, RateLimitResult rateLimitResult)
    {
        var clientId = GetClientIdentifier(context);
        var endpoint = GetEndpointKey(context);
        
        _logger.LogWarning("Rate limit exceeded for client {ClientId} on endpoint {Endpoint}. Retry after {RetryAfter}",
            clientId, endpoint, rateLimitResult.RetryAfter);

        context.Response.StatusCode = (int)HttpStatusCode.TooManyRequests;
        context.Response.Headers["Retry-After"] = ((int)rateLimitResult.RetryAfter.TotalSeconds).ToString();
        context.Response.Headers["X-RateLimit-Limit"] = rateLimitResult.TotalRequestsInWindow.ToString();
        context.Response.Headers["X-RateLimit-Remaining"] = "0";
        context.Response.Headers["X-RateLimit-Reset"] = rateLimitResult.WindowResetTime.ToString("O");
        context.Response.ContentType = "application/json";

        var correlationId = GetCorrelationIdFromHeaders(context) ?? context.TraceIdentifier;
        var errorResponse = ErrorResponseFactory.CreateRateLimitError(
            correlationId, 
            context.Request.Path, 
            rateLimitResult.RetryAfter, 
            context.TraceIdentifier);

        var jsonResponse = JsonSerializer.Serialize(errorResponse, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        await context.Response.WriteAsync(jsonResponse);
    }

    private static void AddRateLimitHeaders(HttpResponse response, RateLimitResult rateLimitResult)
    {
        response.Headers["X-RateLimit-Limit"] = rateLimitResult.TotalRequestsInWindow.ToString();
        response.Headers["X-RateLimit-Remaining"] = rateLimitResult.RemainingRequests.ToString();
        response.Headers["X-RateLimit-Reset"] = rateLimitResult.WindowResetTime.ToString("O");
    }

    private static string GetClientIdentifier(HttpContext context)
    {
        // Try to get user ID first
        var userId = context.User?.Identity?.Name;
        if (!string.IsNullOrEmpty(userId))
        {
            return $"user:{userId}";
        }

        // Fall back to IP address
        var clientIp = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";

        // FIXED: Week 1 Day 4 - Validate forwarded IP headers to prevent spoofing (Bug #11)
        // Only trust X-Forwarded-For from known proxies/load balancers
        // In production, configure trusted proxy IPs in appsettings.json
        var trustedProxies = new[] { "127.0.0.1", "::1" }; // Localhost only by default
        var remoteIp = context.Connection.RemoteIpAddress?.ToString() ?? "";

        if (trustedProxies.Contains(remoteIp))
        {
            // Only parse forwarded headers if request comes from trusted proxy
            if (context.Request.Headers.TryGetValue("X-Forwarded-For", out var forwardedFor))
            {
                var forwardedIp = forwardedFor.ToString().Split(',')[0].Trim();
                if (!string.IsNullOrEmpty(forwardedIp) && IsValidIpAddress(forwardedIp))
                {
                    clientIp = forwardedIp;
                }
            }
            else if (context.Request.Headers.TryGetValue("X-Real-IP", out var realIp))
            {
                var realIpValue = realIp.ToString().Trim();
                if (!string.IsNullOrEmpty(realIpValue) && IsValidIpAddress(realIpValue))
                {
                    clientIp = realIpValue;
                }
            }
        }
        // If not from trusted proxy, use direct connection IP (prevents spoofing)

        return $"ip:{clientIp}";
    }

    private static bool IsValidIpAddress(string ipAddress)
    {
        // FIXED: Week 1 Day 4 - Validate IP addresses to prevent injection
        return System.Net.IPAddress.TryParse(ipAddress, out _);
    }

    private static string GetEndpointKey(HttpContext context)
    {
        var path = context.Request.Path.Value?.ToLowerInvariant() ?? "";
        var method = context.Request.Method.ToUpperInvariant();

        // Normalize path to match configured limits
        foreach (var endpointPattern in new[] { "/api/auth/login", "/api/auth/register", "/api/search", "/api/content" })
        {
            if (path.StartsWith(endpointPattern))
            {
                return endpointPattern;
            }
        }

        return "default";
    }

    private (int maxRequests, TimeSpan window) GetRateLimitForEndpoint(string endpoint)
    {
        return _endpointLimits.TryGetValue(endpoint, out var limit) ? limit : _endpointLimits["default"];
    }

    private static bool ShouldSkipRateLimit(HttpContext context)
    {
        // Skip rate limiting for CORS preflight requests
        if (context.Request.Method.Equals("OPTIONS", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        var path = context.Request.Path.Value?.ToLowerInvariant() ?? "";

        return path.StartsWith("/health") ||
               path.StartsWith("/api/health") ||
               path.StartsWith("/api/search") ||   // TEMPORARY: Disable rate limiting for search endpoints
               path.StartsWith("/swagger") ||
               path.StartsWith("/api/swagger") ||
               path.EndsWith(".js") ||
               path.EndsWith(".css") ||
               path.EndsWith(".ico") ||
               path.EndsWith(".png") ||
               path.EndsWith(".jpg") ||
               path.EndsWith(".gif");
    }

    private static string? GetCorrelationIdFromHeaders(HttpContext context)
    {
        return context.Request.Headers.TryGetValue("X-Correlation-ID", out var correlationId) 
            ? correlationId.ToString() 
            : null;
    }
}