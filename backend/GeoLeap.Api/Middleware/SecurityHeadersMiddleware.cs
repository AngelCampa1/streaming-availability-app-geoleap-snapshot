using Microsoft.Extensions.Primitives;

namespace GeoLeap.Api.Middleware;

/// <summary>
/// Middleware to add comprehensive security headers to all HTTP responses.
/// Implements OWASP security best practices for web applications.
/// SECURITY: Enhanced with additional headers for defense-in-depth protection
/// </summary>
public class SecurityHeadersMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<SecurityHeadersMiddleware> _logger;
    private readonly IWebHostEnvironment _environment;

    public SecurityHeadersMiddleware(
        RequestDelegate next,
        ILogger<SecurityHeadersMiddleware> logger,
        IWebHostEnvironment environment)
    {
        _next = next;
        _logger = logger;
        _environment = environment;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Add comprehensive security headers before processing request
        AddSecurityHeaders(context);

        await _next(context);
    }

    private void AddSecurityHeaders(HttpContext context)
    {
        var headers = context.Response.Headers;

        // Remove potentially dangerous headers that leak server information
        headers.Remove("Server");
        headers.Remove("X-Powered-By");
        headers.Remove("X-AspNet-Version");
        headers.Remove("X-AspNetMvc-Version");

        // X-Content-Type-Options: Prevent MIME-type sniffing
        // Protects against attacks where browser interprets files as different MIME types
        headers.TryAdd("X-Content-Type-Options", "nosniff");

        // X-Frame-Options: Prevent clickjacking attacks
        // Prevents the page from being loaded in an iframe on another domain
        headers.TryAdd("X-Frame-Options", "DENY");

        // X-XSS-Protection: Enable browser's XSS filter (legacy browsers)
        // Modern browsers use CSP instead, but this provides defense in depth
        headers.TryAdd("X-XSS-Protection", "1; mode=block");

        // Referrer-Policy: Control referrer information
        // Prevents leaking sensitive URL parameters to external sites
        headers.TryAdd("Referrer-Policy", "strict-origin-when-cross-origin");

        // Content Security Policy for API (backend)
        // Note: Frontend has its own CSP in Next.js config
        var csp = "default-src 'self'; " +
                  "script-src 'self'; " +
                  "style-src 'self'; " +
                  "img-src 'self' data: https:; " +
                  "font-src 'self'; " +
                  "connect-src 'self'; " +
                  "frame-ancestors 'none'; " +
                  "base-uri 'self'; " +
                  "form-action 'self';";
        headers.TryAdd("Content-Security-Policy", csp);

        // Strict-Transport-Security (HSTS): Force HTTPS
        // Only add in production to avoid certificate issues in development
        if (!_environment.IsDevelopment() && context.Request.IsHttps)
        {
            // max-age=31536000 (1 year), includeSubDomains, preload
            headers.TryAdd("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload");
        }

        // Permissions-Policy: Control browser features and APIs
        // Restricts access to sensitive APIs like camera, microphone, geolocation
        headers.TryAdd("Permissions-Policy",
            "accelerometer=(), " +
            "camera=(), " +
            "geolocation=(), " +
            "gyroscope=(), " +
            "magnetometer=(), " +
            "microphone=(), " +
            "payment=(), " +
            "usb=()");

        // Cross-Origin-Resource-Policy: Protect against Spectre attacks
        // E2E Bug Fix: Use 'cross-origin' for API endpoints to allow CORS access from frontend
        // 'same-site' blocks cross-origin requests which breaks our frontend-backend split architecture
        // Note: The CORS middleware already handles access control with specific allowed origins
        if (context.Request.Path.StartsWithSegments("/api"))
        {
            headers.TryAdd("Cross-Origin-Resource-Policy", "cross-origin");
        }
        else
        {
            // Non-API endpoints (static files, swagger, etc.) can use stricter policy
            headers.TryAdd("Cross-Origin-Resource-Policy", "same-site");
        }

        // Cross-Origin-Opener-Policy: Isolate browsing context
        // Protects against cross-origin attacks
        headers.TryAdd("Cross-Origin-Opener-Policy", "same-origin");

        // Cache-Control: Prevent caching of sensitive API data
        // Apply stricter rules to API responses
        if (context.Request.Path.StartsWithSegments("/api"))
        {
            headers["Cache-Control"] = "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0";
            headers["Pragma"] = "no-cache";
            headers["Expires"] = "0";
        }

        _logger.LogDebug("Security headers added to response for path: {Path}", context.Request.Path);
    }
}

/// <summary>
/// Extension method to register SecurityHeadersMiddleware
/// </summary>
public static class SecurityHeadersMiddlewareExtensions
{
    public static IApplicationBuilder UseSecurityHeaders(this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<SecurityHeadersMiddleware>();
    }
}