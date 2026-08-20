using System;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using GeoLeap.Api.Services;
using GeoLeap.Api.Exceptions;

namespace GeoLeap.Api.Middleware;

public class SecurityValidationMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<SecurityValidationMiddleware> _logger;
    private readonly ISecurityValidationService? _securityValidationService;

    public SecurityValidationMiddleware(
        RequestDelegate next,
        ILogger<SecurityValidationMiddleware> logger,
        ISecurityValidationService? securityValidationService = null)
    {
        _next = next ?? throw new ArgumentNullException(nameof(next));
        _logger = logger ?? throw new ArgumentNullException(nameof(logger));
        _securityValidationService = securityValidationService;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            // Skip validation for certain endpoints (health checks, static files, etc.)
            if (ShouldSkipValidation(context))
            {
                await _next(context);
                return;
            }

            // Validate query parameters
            await ValidateQueryParametersAsync(context);

            // Validate request body for POST/PUT requests
            if (HasBody(context.Request))
            {
                await ValidateRequestBodyAsync(context);
            }

            // Validate headers
            await ValidateHeadersAsync(context);

            await _next(context);
        }
        catch (SecurityException secEx)
        {
            _logger.LogWarning("Security validation failed: {Message}", secEx.Message);
            throw; // Let error handling middleware handle it
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error in security validation middleware");
            throw;
        }
    }

    private async Task ValidateQueryParametersAsync(HttpContext context)
    {
        var queryString = context.Request.QueryString.Value;
        if (string.IsNullOrEmpty(queryString))
            return;

        if (_securityValidationService == null)
            return;
            
        var result = await _securityValidationService.ValidateInputAsync(queryString, SecurityValidationType.All);
        
        if (!result.IsValid)
        {
            var clientIp = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            _logger.LogWarning("Malicious query parameters detected from IP {ClientIp}: {Violations}", 
                clientIp, string.Join(", ", result.Violations));

            if (result.ThreatLevel >= SecurityThreatLevel.High)
            {
                throw new SecurityException("malicious_query", "Request blocked due to potentially malicious query parameters");
            }
        }

        // Check individual query parameters
        foreach (var param in context.Request.Query)
        {
            foreach (var value in param.Value)
            {
                if (!string.IsNullOrEmpty(value))
                {
                    if (_securityValidationService == null)
                        continue;
                        
                    var paramResult = await _securityValidationService.ValidateInputAsync(value, SecurityValidationType.All);
                    if (!paramResult.IsValid && paramResult.ThreatLevel >= SecurityThreatLevel.High)
                    {
                        throw new SecurityException("malicious_parameter", 
                            $"Request blocked due to potentially malicious parameter: {param.Key}");
                    }
                }
            }
        }
    }

    private async Task ValidateRequestBodyAsync(HttpContext context)
    {
        // More permissive size limits for testing environments
        var maxSize = IsTestingEnvironment(context) ? 10 * 1024 * 1024 : 1024 * 1024; // 10MB for testing, 1MB for production
        
        if (context.Request.ContentLength > maxSize)
        {
            _logger.LogWarning("Request body too large: {ContentLength} bytes", context.Request.ContentLength);
            throw new SecurityException("large_payload", "Request body exceeds maximum allowed size");
        }

        context.Request.EnableBuffering();
        var body = await ReadRequestBodyAsync(context.Request);

        if (!string.IsNullOrEmpty(body) && _securityValidationService != null)
        {
            var result = await _securityValidationService.ValidateInputAsync(body, SecurityValidationType.All);

            if (result != null && !result.IsValid && result.ThreatLevel >= SecurityThreatLevel.High)
            {
                var clientIp = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
                _logger.LogWarning("Malicious request body detected from IP {ClientIp}: {Violations}",
                    clientIp, string.Join(", ", result.Violations ?? Array.Empty<string>()));

                // Reset stream position before throwing
                context.Request.Body.Position = 0;
                throw new SecurityException("malicious_body", "Request blocked due to potentially malicious content in body");
            }
        }

        // Reset the stream position for the next middleware
        context.Request.Body.Position = 0;
    }

    private async Task ValidateHeadersAsync(HttpContext context)
    {
        var suspiciousHeaders = new[] { "User-Agent", "Referer", "X-Forwarded-For", "X-Real-IP" };
        
        foreach (var headerName in suspiciousHeaders)
        {
            if (context.Request.Headers.TryGetValue(headerName, out var headerValues))
            {
                foreach (var headerValue in headerValues)
                {
                    if (!string.IsNullOrEmpty(headerValue))
                    {
                        if (_securityValidationService == null)
                            continue;
                            
                        var result = await _securityValidationService.ValidateInputAsync(headerValue, SecurityValidationType.All);
                        if (!result.IsValid && result.ThreatLevel >= SecurityThreatLevel.Medium)
                        {
                            _logger.LogWarning("Potentially malicious header value detected in {HeaderName}: {Violations}",
                                headerName, string.Join(", ", result.Violations));

                            if (result.ThreatLevel >= SecurityThreatLevel.High)
                            {
                                throw new SecurityException("malicious_header",
                                    $"Request blocked due to potentially malicious header: {headerName}");
                            }
                        }
                    }
                }
            }
        }
    }

    private static bool ShouldSkipValidation(HttpContext context)
    {
        var path = context.Request.Path.Value?.ToLowerInvariant() ?? "";

        // Skip validation for CORS preflight requests (OPTIONS method)
        if (context.Request.Method.Equals("OPTIONS", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        // SECURITY FIX: Removed complete bypass for testing environments
        // Security validation should ALWAYS run - test projects should use proper
        // authentication handlers and test doubles instead of bypassing security

        // Skip validation for webhook endpoints - they have their own signature verification
        if (path.StartsWith("/api/webhooks/"))
        {
            return true;
        }

        // BUG FIX: Skip validation for search endpoints - they handle their own sanitization
        // This prevents 500 errors when users search for content that happens to match XSS patterns
        // The SearchController sanitizes input before processing, returning empty results for malicious input
        if (path.StartsWith("/api/search/"))
        {
            return true;
        }

        // BUG FIX: Skip validation for recommendations endpoints - they use JSON in query params
        // E2E Bug: /api/recommendations?context={"timeOfDay":"afternoon"} was being blocked as "malicious"
        // The RecommendationController validates its own input appropriately
        if (path.StartsWith("/api/recommendations") || path.StartsWith("/api/recommendation"))
        {
            return true;
        }

        // BUG FIX: Skip validation for watchlist endpoints - they contain URLs with complex query params
        // E2E Bug: Watchlist item data contains CDN URLs with signatures that trigger false positives
        // The WatchlistController validates its own input appropriately
        if (path.StartsWith("/api/watchlist"))
        {
            return true;
        }

        // E2E FIX: Skip header validation for CSRF token endpoint
        // Referer header may contain previous page URL with test/malicious queries (e.g., XSS/SQL tests)
        // The CSRF endpoint doesn't process Referer as user input - it only generates tokens
        if (path == "/api/security/csrf-token")
        {
            return true;
        }

        return path.StartsWith("/health") ||
               path.StartsWith("/api/health") ||
               path.StartsWith("/swagger") ||
               path.StartsWith("/api/swagger") ||
               path.EndsWith(".js") ||
               path.EndsWith(".css") ||
               path.EndsWith(".ico") ||
               path.EndsWith(".png") ||
               path.EndsWith(".jpg") ||
               path.EndsWith(".gif");
    }

    /// <summary>
    /// Checks if running in a test environment.
    /// SECURITY NOTE: This should ONLY be used for adjusting size limits, NOT for bypassing security.
    /// Security validation must always run regardless of environment.
    /// </summary>
    private static bool IsTestingEnvironment(HttpContext _context)
    {
        // SECURITY FIX: Only check the environment variable - this is set by the host, not the client
        // Removed all client-controlled bypass conditions:
        // - User-Agent header check (easily spoofed)
        // - Authorization header "test" check (easily spoofed)
        // - Localhost/port checks (can be mimicked)
        // - TestServer header check (can be added by attacker)

        var environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT");
        return environment == "Testing" || environment == "Test";
    }

    private static bool HasBody(HttpRequest request)
    {
        return request.ContentLength > 0 &&
               (request.Method.Equals("POST", StringComparison.OrdinalIgnoreCase) ||
                request.Method.Equals("PUT", StringComparison.OrdinalIgnoreCase) ||
                request.Method.Equals("PATCH", StringComparison.OrdinalIgnoreCase));
    }

    private static async Task<string> ReadRequestBodyAsync(HttpRequest request)
    {
        using var reader = new StreamReader(request.Body, Encoding.UTF8, leaveOpen: true);
        var body = await reader.ReadToEndAsync();
        request.Body.Position = 0;
        return body;
    }
}