using System.Security.Claims;
using GeoLeap.Api.Services;

namespace GeoLeap.Api.Middleware;

public class AuthorizationMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<AuthorizationMiddleware> _logger;

    public AuthorizationMiddleware(RequestDelegate next, ILogger<AuthorizationMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, IRbacService rbacService)
    {
        // Log all requests for debugging
        _logger.LogInformation("AuthorizationMiddleware: Processing request to {Path} with method {Method}",
            context.Request.Path, context.Request.Method);

        // Skip authorization for public endpoints
        if (IsPublicEndpoint(context.Request.Path, context.Request.Method))
        {
            _logger.LogInformation("AuthorizationMiddleware: Public endpoint {Path} - allowing through", context.Request.Path);
            await _next(context);
            return;
        }

        // Extract user ID from claims
        var userIdClaim = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            _logger.LogWarning("AuthorizationMiddleware: Unauthorized access attempt to {Path} - No valid user ID (IsPublicEndpoint returned false)", context.Request.Path);
            context.Response.StatusCode = 401;
            await context.Response.WriteAsync("Unauthorized");
            return;
        }

        // Check if endpoint requires specific permission
        var requiredPermission = GetRequiredPermission(context.Request.Path, context.Request.Method);
        if (!string.IsNullOrEmpty(requiredPermission))
        {
            var hasPermission = await rbacService.HasPermissionAsync(userId, requiredPermission);
            
            if (!hasPermission)
            {
                _logger.LogWarning("Access denied for user {UserId} to {Path} - Missing permission {Permission}", 
                    userId, context.Request.Path, requiredPermission);
                
                // Log the failed access attempt
                var (resource, action) = ParsePermission(requiredPermission);
                await rbacService.LogAccessAttemptAsync(userId, resource, action, false, 
                    "Access denied - insufficient permissions", 
                    GetClientIpAddress(context), 
                    GetUserAgent(context));
                
                context.Response.StatusCode = 403;
                await context.Response.WriteAsync("Forbidden");
                return;
            }

            // Log successful access
            var (successResource, successAction) = ParsePermission(requiredPermission);
            await rbacService.LogAccessAttemptAsync(userId, successResource, successAction, true, 
                "Access granted", 
                GetClientIpAddress(context), 
                GetUserAgent(context));
        }

        await _next(context);
    }

    private static bool IsPublicEndpoint(PathString path, string method)
    {
        // E2E Bug Fix: Allow all OPTIONS preflight requests through for CORS
        if (method.Equals("OPTIONS", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        // Get the path as a string for easier comparison
        var pathString = path.Value?.ToLowerInvariant() ?? string.Empty;

        var publicPaths = new[]
        {
            "/health",
            "/api/health",
            "/api/auth/login",
            "/api/auth/register",
            "/api/auth/forgot-password",
            "/api/auth/reset-password",
            "/api/auth/verify-email",
            "/api/auth/resend-verification",
            "/api/auth/google",
            "/api/auth/google-callback",
            "/api/auth/apple",
            "/api/auth/apple-callback",
            "/signin-google", // Mock OAuth callback endpoint
            "/signin-apple", // Mock OAuth callback endpoint
            "/api/simpleauth/login", // Add simpleauth endpoints for testing
            "/api/simpleauth/register",
            "/api/test", // CRITICAL FIX: Allow all test endpoints for test suite
            "/api/content", // Allow anonymous content reads: every ContentController endpoint is [AllowAnonymous] and SSR renders content detail/anime deep links for logged-out visitors
            "/api/search", // Allow anonymous access to search endpoint
            "/api/search/autocomplete", // Allow anonymous access to autocomplete
            "/api/search/autocomplete/enhanced", // Allow anonymous access to enhanced autocomplete
            "/api/search/history", // Allow anonymous access to search history (returns empty for unauthenticated)
            "/api/security/csrf-token", // Allow anonymous access to CSRF token endpoint
            "/api/filters/options", // Allow anonymous access to advanced filter endpoints
            "/api/streaming/availability", // US-9.1: Allow anonymous access to streaming availability
            "/api/streaming/vpn-compatibility", // US-9.1: Allow anonymous access to VPN compatibility check
            "/api/filters/validate",
            "/api/filters/suggestions",
            "/api/filters/analyze",
            "/api/streaming-services", // Allow anonymous access to streaming service endpoints
            "/api/support/categories", // Allow anonymous access to support categories
            "/api/support/faq", // Allow anonymous access to FAQ endpoints
            "/api/public",
            "/api/onboarding/popular-services",
            // US-9.1: VPN Guidance System - Public endpoints
            "/api/vpnguidance", // Allow anonymous access to all VPN guidance endpoints
            "/api/community/ratings", // Allow anonymous access to community ratings
            "/api/community/reviews", // Allow anonymous access to community reviews
            "/api/streaming/deeplinks", // Allow anonymous access to streaming deep links
            "/api/legal/disclaimers", // Allow anonymous access to legal disclaimers
            "/api/affiliate", // Allow anonymous access to affiliate endpoints
            "/api/webhooks/stripe", // Stripe webhooks - security via signature verification
            "/api/stripe/webhook", // Alternative Stripe webhook endpoint - security via signature verification
            "/api/webhooks/resend", // Resend webhooks - security via HMAC-SHA256 signature verification
            "/api/feedback", // Feedback endpoints - allow anonymous access for user feedback
            "/api/leads" // Public marketing lead capture endpoints
        };

        // Check public paths first - use simple string starts with for more reliable matching
        foreach (var publicPath in publicPaths)
        {
            if (pathString.StartsWith(publicPath.ToLowerInvariant()))
            {
                return true;
            }
        }

        // For streaming services, specific endpoints are public
        if (pathString.StartsWith("/api/streaming-services"))
        {
            // GET endpoints for catalog browsing (have [AllowAnonymous] attribute)
            if (method.Equals("GET", StringComparison.OrdinalIgnoreCase))
            {
                var publicStreamingPaths = new[]
                {
                    "/api/streaming-services", // GetAllStreamingServices
                    "/api/streaming-services/popular", // GetPopularStreamingServices
                    "/api/streaming-services/category/", // GetStreamingServicesByCategory
                    "/api/streaming-services/type/" // GetStreamingServicesByType
                };
                
                // Allow exact match for base endpoint or if path starts with specific public endpoints
                if (pathString == "/api/streaming-services" || 
                    publicStreamingPaths.Skip(1).Any(publicPath => pathString.StartsWith(publicPath)))
                {
                    return true;
                }
                
                // Allow GUID-based single service lookup: /api/streaming-services/{guid}
                if (pathString.StartsWith("/api/streaming-services/") && 
                    !pathString.Contains("/user"))
                {
                    var segments = pathString.Split('/');
                    if (segments.Length == 4 && Guid.TryParse(segments[3], out _))
                    {
                        return true; // GetStreamingService(Guid id)
                    }
                }
            }
            
            // POST endpoints that allow anonymous access
            if (method.Equals("POST", StringComparison.OrdinalIgnoreCase))
            {
                if (pathString == "/api/streaming-services/recommendations")
                {
                    return true; // GetRecommendations - allows anonymous access
                }
            }
        }
        
        return false;
    }

    private static string? GetRequiredPermission(PathString path, string method)
    {
        // Map API endpoints to required permissions
        var pathString = path.Value?.ToLowerInvariant() ?? string.Empty;

        // Admin endpoints
        if (pathString.StartsWith("/api/admin/users"))
        {
            return method.ToUpperInvariant() switch
            {
                "GET" => "admin:users:view",
                "POST" or "PUT" or "DELETE" => "admin:users:manage",
                _ => "admin:users:view"
            };
        }

        if (pathString.StartsWith("/api/admin/roles"))
        {
            return "admin:roles:manage";
        }

        if (pathString.StartsWith("/api/admin/analytics"))
        {
            return "admin:analytics:view";
        }

        if (pathString.StartsWith("/api/admin"))
        {
            return "admin:system:configure";
        }

        // Content endpoints
        if (pathString.StartsWith("/api/content/search"))
        {
            // This would be determined by user's subscription level
            // For now, require basic search permission
            return "content:search:basic";
        }

        if (pathString.StartsWith("/api/content/details"))
        {
            return "content:details:view";
        }

        // User profile endpoints
        if (pathString.StartsWith("/api/user/profile"))
        {
            return method.ToUpperInvariant() switch
            {
                "GET" => "user:profile:view",
                "PUT" or "PATCH" => "user:profile:edit",
                _ => "user:profile:view"
            };
        }

        if (pathString.StartsWith("/api/user/watchlist"))
        {
            return "user:watchlist:manage";
        }

        if (pathString.StartsWith("/api/user/preferences"))
        {
            return "user:preferences:manage";
        }

        // Dashboard endpoints - require Dashboard:View permission (granted to all authenticated users)
        if (pathString.StartsWith("/api/dashboard"))
        {
            return "Dashboard:View";
        }

        // User subscriptions (streaming services) - require authentication only
        if (pathString.StartsWith("/api/usersubscriptions"))
        {
            return null; // Authenticated but no specific permission required
        }

        // Default: require authentication but no specific permission
        return null;
    }

    private static (string resource, string action) ParsePermission(string permission)
    {
        var parts = permission.Split(':');
        if (parts.Length >= 2)
        {
            return (parts[0], string.Join(":", parts[1..]));
        }
        return ("unknown", "unknown");
    }

    private static string GetClientIpAddress(HttpContext context)
    {
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

    private static string GetUserAgent(HttpContext context)
    {
        return context.Request.Headers["User-Agent"].FirstOrDefault() ?? "unknown";
    }
}
