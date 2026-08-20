using Microsoft.AspNetCore.Mvc;

namespace GeoLeap.Api.Attributes;

/// <summary>
/// Predefined response cache profiles for common scenarios
/// </summary>
public static class CacheProfiles
{
    /// <summary>
    /// Cache for 5 minutes - good for frequently changing data
    /// </summary>
    public const string Short = "Short";

    /// <summary>
    /// Cache for 30 minutes - good for semi-static data
    /// </summary>
    public const string Medium = "Medium";

    /// <summary>
    /// Cache for 2 hours - good for static content
    /// </summary>
    public const string Long = "Long";

    /// <summary>
    /// Cache for 24 hours - good for rarely changing data
    /// </summary>
    public const string VeryLong = "VeryLong";

    /// <summary>
    /// No caching - for dynamic/user-specific data
    /// </summary>
    public const string NoCache = "NoCache";

    /// <summary>
    /// Client-only caching for 5 minutes
    /// </summary>
    public const string ClientOnly = "ClientOnly";
}

/// <summary>
/// Extension methods for configuring response caching
/// </summary>
public static class ResponseCacheExtensions
{
    /// <summary>
    /// Adds response caching configuration to services
    /// </summary>
    public static IServiceCollection AddResponseCachingProfiles(this IServiceCollection services)
    {
        services.AddResponseCaching(options =>
        {
            options.MaximumBodySize = 1024 * 1024; // 1MB max cache size per response
            options.UseCaseSensitivePaths = false;
        });

        services.AddControllers(options =>
        {
            // Short cache (5 minutes)
            options.CacheProfiles.Add(CacheProfiles.Short, new CacheProfile
            {
                Duration = 300, // 5 minutes
                Location = ResponseCacheLocation.Any,
                VaryByHeader = "Accept,Accept-Language",
                VaryByQueryKeys = new[] { "*" }
            });

            // Medium cache (30 minutes)
            options.CacheProfiles.Add(CacheProfiles.Medium, new CacheProfile
            {
                Duration = 1800, // 30 minutes
                Location = ResponseCacheLocation.Any,
                VaryByHeader = "Accept,Accept-Language",
                VaryByQueryKeys = new[] { "*" }
            });

            // Long cache (2 hours)
            options.CacheProfiles.Add(CacheProfiles.Long, new CacheProfile
            {
                Duration = 7200, // 2 hours
                Location = ResponseCacheLocation.Any,
                VaryByHeader = "Accept,Accept-Language",
                VaryByQueryKeys = new[] { "*" }
            });

            // Very long cache (24 hours)
            options.CacheProfiles.Add(CacheProfiles.VeryLong, new CacheProfile
            {
                Duration = 86400, // 24 hours
                Location = ResponseCacheLocation.Any,
                VaryByHeader = "Accept,Accept-Language",
                VaryByQueryKeys = new[] { "*" }
            });

            // No cache
            options.CacheProfiles.Add(CacheProfiles.NoCache, new CacheProfile
            {
                Duration = 0,
                Location = ResponseCacheLocation.None,
                NoStore = true
            });

            // Client-only cache (5 minutes)
            options.CacheProfiles.Add(CacheProfiles.ClientOnly, new CacheProfile
            {
                Duration = 300, // 5 minutes
                Location = ResponseCacheLocation.Client,
                VaryByHeader = "Accept,Accept-Language"
            });
        });

        return services;
    }
}

/// <summary>
/// Helper attributes for common caching scenarios
/// </summary>

/// <summary>
/// Short cache (5 minutes) - Use for frequently changing data
/// </summary>
public class ShortCacheAttribute : ResponseCacheAttribute
{
    public ShortCacheAttribute()
    {
        CacheProfileName = CacheProfiles.Short;
    }
}

/// <summary>
/// Medium cache (30 minutes) - Use for semi-static data
/// </summary>
public class MediumCacheAttribute : ResponseCacheAttribute
{
    public MediumCacheAttribute()
    {
        CacheProfileName = CacheProfiles.Medium;
    }
}

/// <summary>
/// Long cache (2 hours) - Use for static content
/// </summary>
public class LongCacheAttribute : ResponseCacheAttribute
{
    public LongCacheAttribute()
    {
        CacheProfileName = CacheProfiles.Long;
    }
}

/// <summary>
/// Very long cache (24 hours) - Use for rarely changing data
/// </summary>
public class VeryLongCacheAttribute : ResponseCacheAttribute
{
    public VeryLongCacheAttribute()
    {
        CacheProfileName = CacheProfiles.VeryLong;
    }
}

/// <summary>
/// No caching - Use for dynamic/user-specific data
/// </summary>
public class NoCacheAttribute : ResponseCacheAttribute
{
    public NoCacheAttribute()
    {
        CacheProfileName = CacheProfiles.NoCache;
    }
}

/// <summary>
/// Client-only caching - Use when caching on client but not server
/// </summary>
public class ClientOnlyCacheAttribute : ResponseCacheAttribute
{
    public ClientOnlyCacheAttribute()
    {
        CacheProfileName = CacheProfiles.ClientOnly;
    }
}

/// <summary>
/// Custom cache duration attribute
/// </summary>
public class CustomCacheAttribute : ResponseCacheAttribute
{
    public CustomCacheAttribute(int durationSeconds)
    {
        Duration = durationSeconds;
        Location = ResponseCacheLocation.Any;
        VaryByHeader = "Accept,Accept-Language";
    }
}

/// <summary>
/// Documentation on when to use each cache duration
/// </summary>
public static class CachingGuidelines
{
    /// <summary>
    /// Use SHORT cache (5 minutes) for:
    /// - Trending content
    /// - Recently added items
    /// - User activity feeds
    /// - Search suggestions (varies by user behavior)
    /// </summary>
    public const string ShortCacheGuidelines = "5 minutes - Frequently changing data";

    /// <summary>
    /// Use MEDIUM cache (30 minutes) for:
    /// - Content lists with filters
    /// - Catalog pages
    /// - Platform availability (changes occasionally)
    /// - Genre lists
    /// </summary>
    public const string MediumCacheGuidelines = "30 minutes - Semi-static data";

    /// <summary>
    /// Use LONG cache (2 hours) for:
    /// - Content metadata (title, description, images)
    /// - Category lists
    /// - VPN provider lists
    /// - Static configuration data
    /// </summary>
    public const string LongCacheGuidelines = "2 hours - Static content";

    /// <summary>
    /// Use VERY LONG cache (24 hours) for:
    /// - Content images/posters
    /// - Static reference data
    /// - Country lists
    /// - Language lists
    /// </summary>
    public const string VeryLongCacheGuidelines = "24 hours - Rarely changing data";

    /// <summary>
    /// Use NO CACHE for:
    /// - User-specific data (watchlists, preferences)
    /// - Authentication endpoints
    /// - Payment transactions
    /// - Real-time notifications
    /// - Admin operations
    /// </summary>
    public const string NoCacheGuidelines = "No caching - Dynamic/sensitive data";

    /// <summary>
    /// Use CLIENT ONLY cache for:
    /// - Personalized recommendations
    /// - User dashboards
    /// - Profile data
    /// </summary>
    public const string ClientOnlyCacheGuidelines = "Client caching only - Per-user data";
}
