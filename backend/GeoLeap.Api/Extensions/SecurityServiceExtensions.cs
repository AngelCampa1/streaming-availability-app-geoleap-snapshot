using GeoLeap.Api.Services;
using AspNetCoreRateLimit;
using FluentValidation;
using FluentValidation.AspNetCore;

namespace GeoLeap.Api.Extensions;

public static class SecurityServiceExtensions
{
    public static IServiceCollection AddSecurityServices(this IServiceCollection services, IConfiguration configuration)
    {
        // Password hashing service
        services.AddScoped<IPasswordHashingService, PasswordHashingService>();

        // Determine if running in development (HTTP allowed)
        var isDevelopment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") == "Development";

        // CSRF Protection
        services.AddAntiforgery(options =>
        {
            options.HeaderName = "X-CSRF-TOKEN";
            options.Cookie.Name = isDevelopment ? "X-CSRF-TOKEN" : "__Host-X-CSRF-TOKEN";
            options.Cookie.SameSite = SameSiteMode.Strict;
            options.Cookie.SecurePolicy = isDevelopment ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always;
            options.Cookie.HttpOnly = true;
        });

        // Rate Limiting
        services.AddMemoryCache();
        services.Configure<IpRateLimitOptions>(configuration.GetSection("IpRateLimiting"));
        services.Configure<IpRateLimitPolicies>(configuration.GetSection("IpRateLimitPolicies"));
        services.AddInMemoryRateLimiting();
        services.AddSingleton<IRateLimitConfiguration, RateLimitConfiguration>();

        // FluentValidation - CRITICAL: Add ASP.NET Core integration
        services.AddFluentValidationAutoValidation();
        services.AddFluentValidationClientsideAdapters();
        services.AddValidatorsFromAssemblyContaining<Program>();

        return services;
    }

    public static IServiceCollection AddSecureCors(this IServiceCollection services)
    {
        services.AddCors(options =>
        {
            options.AddPolicy("Development", policy =>
            {
                policy.WithOrigins(
                          "http://localhost:3000",
                          "https://localhost:3000",
                          "http://localhost:3020",
                          "https://localhost:3020",
                          "http://localhost:8020",
                          "https://localhost:8020",
                          "https://dev-api.geoleap.app",
                          "https://dev-ws.geoleap.app"
                      )
                      .AllowAnyHeader()
                      .AllowAnyMethod()
                      .AllowCredentials()
                      // BUG-005 FIX: Expose headers needed by frontend
                      // E2E Bug Fix: Expose both casings of correlation ID header
                      .WithExposedHeaders(
                          "X-CSRF-TOKEN",
                          "X-Rate-Limit-Remaining",
                          "X-Rate-Limit-Reset",
                          "Token-Expired",
                          "X-Correlation-ID",
                          "x-correlation-id"
                      );
            });

            // SECURITY FIX: Replaced AllowAnyOrigin() with specific mobile app origins
            // Mobile apps should use custom URL schemes or known API endpoints
            options.AddPolicy("Mobile", policy =>
            {
                // Mobile apps typically use custom URL schemes or don't send Origin headers
                // Use SetIsOriginAllowed with validation instead of AllowAnyOrigin()
                policy.SetIsOriginAllowed(origin =>
                      {
                          // Allow known mobile app schemes
                          if (origin.StartsWith("geoleap://", StringComparison.OrdinalIgnoreCase) ||
                              origin.StartsWith("exp://", StringComparison.OrdinalIgnoreCase) ||
                              origin.StartsWith("capacitor://", StringComparison.OrdinalIgnoreCase))
                          {
                              return true;
                          }

                          // Allow localhost for development (React Native Metro bundler)
                          if (origin.StartsWith("http://localhost:") ||
                              origin.StartsWith("http://127.0.0.1:") ||
                              origin.StartsWith("http://10.0.2.2:")) // Android emulator localhost
                          {
                              return true;
                          }

                          // Allow production API domain
                          if (origin.Contains("geoleap.app", StringComparison.OrdinalIgnoreCase) ||
                              origin.Contains("geoleap.com", StringComparison.OrdinalIgnoreCase))
                          {
                              return true;
                          }

                          // Deny all other origins
                          return false;
                      })
                      .AllowAnyHeader()
                      .AllowAnyMethod()
                      .AllowCredentials() // Now safe because we're not using AllowAnyOrigin()
                      .WithExposedHeaders(
                          "X-CSRF-TOKEN",
                          "X-Rate-Limit-Remaining",
                          "X-Rate-Limit-Reset",
                          "Token-Expired",
                          "X-Correlation-ID"
                      )
                      .SetPreflightMaxAge(TimeSpan.FromMinutes(10)); // Cache preflight for 10 minutes
            });

            options.AddPolicy("Production", policy =>
            {
                policy.WithOrigins(
                          "https://geoleap.com",
                          "https://www.geoleap.com",
                          "https://geoleap.app",
                          "https://www.geoleap.app",
                          "https://api.geoleap.app",
                          "https://ws.geoleap.app"
                      )
                      .AllowAnyHeader()
                      .AllowAnyMethod()
                      .AllowCredentials()
                      // E2E Bug Fix: Expose headers needed by frontend (matching Development policy)
                      .WithExposedHeaders(
                          "X-CSRF-TOKEN",
                          "X-Rate-Limit-Remaining",
                          "X-Rate-Limit-Reset",
                          "Token-Expired",
                          "X-Correlation-ID",
                          "x-correlation-id"
                      );
            });

            options.AddPolicy("Staging", policy =>
            {
                policy.WithOrigins(
                          "https://staging.geoleap.app",
                          "https://staging-api.geoleap.app",
                          "https://staging-ws.geoleap.app"
                      )
                      .AllowAnyHeader()
                      .AllowAnyMethod()
                      .AllowCredentials()
                      // E2E Bug Fix: Expose headers needed by frontend
                      .WithExposedHeaders(
                          "X-CSRF-TOKEN",
                          "X-Rate-Limit-Remaining",
                          "X-Rate-Limit-Reset",
                          "Token-Expired",
                          "X-Correlation-ID",
                          "x-correlation-id"
                      );
            });
        });

        return services;
    }

    public static IServiceCollection AddSecureSessions(this IServiceCollection services)
    {
        var aspNetEnv = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT");
        var isNonProduction = aspNetEnv == "Development" || aspNetEnv == "Testing" || aspNetEnv == "Test";

        // BUG FIX: AddDistributedMemoryCache is REQUIRED for sessions to work
        // Without this, session middleware cannot store session data and will fail
        services.AddDistributedMemoryCache();

        services.AddSession(options =>
        {
            // E2E Bug Fix: Use __Secure- prefix for production (allows cross-subdomain)
            // __Host- requires same-origin which doesn't work with frontend/API on different subdomains
            // Use SameSite=None to allow cross-origin requests (frontend at geoleap.app, API at api.geoleap.app)
            options.Cookie.Name = isNonProduction ? "SessionId" : "__Secure-SessionId";
            options.Cookie.HttpOnly = true;
            options.Cookie.SecurePolicy = isNonProduction ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always;
            // Lax allows the cookie to be sent with top-level navigations and same-site requests
            // None would allow all cross-origin requests but requires HTTPS
            options.Cookie.SameSite = isNonProduction ? SameSiteMode.Lax : SameSiteMode.None;
            options.Cookie.Domain = isNonProduction ? null : ".geoleap.app"; // Allow cookie sharing across subdomains
            options.IdleTimeout = TimeSpan.FromMinutes(30);
        });

        return services;
    }
}