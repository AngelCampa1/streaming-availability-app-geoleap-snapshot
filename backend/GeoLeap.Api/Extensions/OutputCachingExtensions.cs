using Microsoft.AspNetCore.OutputCaching;

namespace GeoLeap.Api.Extensions;

/// <summary>
/// Extension methods for configuring .NET 9 Output Caching
/// Provides optimized caching policies for different endpoint types
/// </summary>
public static class OutputCachingExtensions
{
    public static IServiceCollection AddOutputCachingConfiguration(this IServiceCollection services)
    {
        services.AddOutputCache(options =>
        {
            // Base policy - applies to all cached endpoints by default
            // E2E Bug Fix: Include Origin header in Vary to ensure CORS headers are cached correctly
            options.AddBasePolicy(builder => builder
                .Expire(TimeSpan.FromMinutes(5))
                .Tag("default")
                .SetVaryByQuery("*") // Vary by all query parameters
                .SetVaryByHeader("Accept", "Accept-Encoding", "Origin"));

            // Content policy - for movie/TV show data
            options.AddPolicy("content", builder => builder
                .Expire(TimeSpan.FromMinutes(10))
                .Tag("content")
                .SetVaryByQuery("page", "limit", "sort")
                .SetVaryByHeader("Accept-Language", "Origin"));

            // Search policy - for search results
            options.AddPolicy("search", builder => builder
                .Expire(TimeSpan.FromMinutes(5))
                .Tag("search")
                .SetVaryByQuery("q", "type", "page")
                .SetVaryByHeader("Accept-Language", "Origin"));

            // Static policy - for rarely changing data
            options.AddPolicy("static", builder => builder
                .Expire(TimeSpan.FromHours(1))
                .Tag("static")
                .SetVaryByHeader("Origin"));

            // User-specific policy - NOT cached (dynamic per user)
            options.AddPolicy("user-specific", builder => builder
                .NoCache());

            // Authenticated policy - cache per user
            options.AddPolicy("authenticated", builder => builder
                .Expire(TimeSpan.FromMinutes(5))
                .Tag("authenticated")
                .SetVaryByHeader("Authorization", "Origin"));

            // Streaming availability policy - moderate caching
            options.AddPolicy("streaming", builder => builder
                .Expire(TimeSpan.FromMinutes(15))
                .Tag("streaming")
                .SetVaryByQuery("country", "service")
                .SetVaryByHeader("Origin"));

            // SEO policy - long caching for SEO data
            options.AddPolicy("seo", builder => builder
                .Expire(TimeSpan.FromHours(24))
                .Tag("seo")
                .SetVaryByHeader("Origin"));
        });

        return services;
    }

    public static IEndpointRouteBuilder MapCachedEndpoints(this IEndpointRouteBuilder endpoints)
    {
        // Example: Content endpoint with output caching
        endpoints.MapGet("/api/content/{id}", async (string id) =>
        {
            // Simulate fetching content
            await Task.Delay(100); // Simulate database call
            return Results.Ok(new
            {
                Id = id,
                Title = "Sample Content",
                CachedAt = DateTime.UtcNow
            });
        })
        .CacheOutput("content")
        .WithName("GetContentById")
        .WithTags("Content");

        // Example: Search endpoint with output caching
        endpoints.MapGet("/api/search", async (string q) =>
        {
            // Simulate search operation
            await Task.Delay(50);
            return Results.Ok(new
            {
                Query = q,
                Results = new[] { "Result 1", "Result 2" },
                CachedAt = DateTime.UtcNow
            });
        })
        .CacheOutput("search")
        .WithName("Search")
        .WithTags("Search");

        return endpoints;
    }
}
