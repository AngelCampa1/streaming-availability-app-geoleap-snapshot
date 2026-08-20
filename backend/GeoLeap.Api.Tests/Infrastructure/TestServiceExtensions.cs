using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using NSubstitute;
using GeoLeap.Api.Services;
using AspNetCoreRateLimit;
using FluentValidation;
using FluentValidation.AspNetCore;
using Microsoft.Extensions.Hosting;
using Microsoft.AspNetCore.Builder;

namespace GeoLeap.Api.Tests.Infrastructure;

/// <summary>
/// Test-specific service extensions that provide mock implementations
/// These bypass external dependencies that cause 500 errors in test environment
/// </summary>
public static class TestServiceExtensions
{
    /// <summary>
    /// Replaces AddComprehensiveLogging with test-safe logging configuration
    /// </summary>
    public static WebApplicationBuilder AddTestLogging(this WebApplicationBuilder builder)
    {
        // Simple console logging for tests - no external dependencies
        builder.Logging.ClearProviders();
        builder.Logging.AddConsole();
        builder.Logging.SetMinimumLevel(LogLevel.Warning); // Reduce noise in tests
        
        return builder;
    }
    
    /// <summary>
    /// Replaces AddSecurityServices with test-safe mock implementations
    /// </summary>
    public static IServiceCollection AddTestSecurityServices(this IServiceCollection services, IConfiguration configuration)
    {
        // Mock password hashing service
        var mockPasswordHashingService = Substitute.For<IPasswordHashingService>();
        mockPasswordHashingService.HashPassword(Arg.Any<string>()).Returns("hashed_password");
        mockPasswordHashingService.VerifyPassword(Arg.Any<string>(), Arg.Any<string>()).Returns(true);
        services.AddSingleton(mockPasswordHashingService);

        // Simple antiforgery for tests
        services.AddAntiforgery(options =>
        {
            options.HeaderName = "X-CSRF-TOKEN";
        });

        // Mock rate limiting services to avoid external dependencies
        services.AddMemoryCache();
        services.AddSingleton<IRateLimitConfiguration>(provider => Substitute.For<IRateLimitConfiguration>());
        
        // FluentValidation - keep this as it's internal
        services.AddFluentValidationAutoValidation();
        services.AddFluentValidationClientsideAdapters();
        
        return services;
    }

    /// <summary>
    /// Replaces AddSecureCors with test-safe CORS configuration
    /// </summary>
    public static IServiceCollection AddTestCors(this IServiceCollection services)
    {
        services.AddCors(options =>
        {
            options.AddPolicy("Test", policy =>
            {
                policy.AllowAnyOrigin()
                      .AllowAnyHeader()
                      .AllowAnyMethod();
            });
        });

        return services;
    }

    /// <summary>
    /// Replaces AddSecureSessions with test-safe session configuration
    /// </summary>
    public static IServiceCollection AddTestSessions(this IServiceCollection services)
    {
        services.AddDistributedMemoryCache();
        services.AddSession(options =>
        {
            options.IdleTimeout = TimeSpan.FromMinutes(20);
            options.Cookie.HttpOnly = true;
            options.Cookie.IsEssential = true;
        });

        return services;
    }

    /// <summary>
    /// Replaces AddDatabaseLogging with no-op for tests
    /// </summary>
    public static void AddTestDatabaseLogging(this IServiceCollection services)
    {
        // No-op for tests - avoid interceptor dependencies
    }

    /// <summary>
    /// Test-safe request logging configuration
    /// </summary>
    public static void ConfigureTestRequestLogging(this WebApplication app)
    {
        // No-op for tests - avoid logging middleware dependencies
    }
}