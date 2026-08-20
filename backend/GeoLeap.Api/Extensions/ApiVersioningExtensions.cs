using Asp.Versioning;
using Asp.Versioning.ApiExplorer;

namespace GeoLeap.Api.Extensions;

/// <summary>
/// Extension methods for configuring API versioning
/// Supports URL segment, query string, and header-based versioning
/// </summary>
public static class ApiVersioningExtensions
{
    public static IServiceCollection AddApiVersioningConfiguration(this IServiceCollection services)
    {
        services.AddApiVersioning(options =>
        {
            // Default API version when not specified
            options.DefaultApiVersion = new ApiVersion(1, 0);

            // Use default version when client doesn't specify
            options.AssumeDefaultVersionWhenUnspecified = true;

            // Report available API versions in response headers
            options.ReportApiVersions = true;

            // Support multiple versioning schemes
            options.ApiVersionReader = ApiVersionReader.Combine(
                new UrlSegmentApiVersionReader(),
                new QueryStringApiVersionReader("api-version"),
                new HeaderApiVersionReader("X-API-Version")
            );
        })
        .AddApiExplorer(options =>
        {
            // Format version as "'v'major[.minor][-status]"
            options.GroupNameFormat = "'v'VVV";

            // Substitute version in URL
            options.SubstituteApiVersionInUrl = true;
        });

        return services;
    }

    public static IEndpointRouteBuilder MapVersionedEndpoints(this IEndpointRouteBuilder endpoints)
    {
        var versionSet = endpoints.NewApiVersionSet()
            .HasApiVersion(new ApiVersion(1, 0))
            .HasApiVersion(new ApiVersion(2, 0))
            .ReportApiVersions()
            .Build();

        // Example versioned endpoint
        endpoints.MapGet("/api/v{version:apiVersion}/status", () => Results.Ok(new
        {
            Status = "OK",
            Version = "v{version}",
            Timestamp = DateTime.UtcNow
        }))
        .WithApiVersionSet(versionSet)
        .MapToApiVersion(1.0)
        .WithName("GetStatus_V1")
        .WithTags("Status");

        return endpoints;
    }
}
