using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using GeoLeap.Api.Data;
using GeoLeap.Api.Services;
using NSubstitute;
using StackExchange.Redis;
using Microsoft.AspNetCore.Authentication;

namespace GeoLeap.Api.Tests.Infrastructure;

/// <summary>
/// Fast Discovery Test Factory - Optimized for rapid test discovery and execution
/// Eliminates blocking operations that cause test hangs during discovery phase
/// </summary>
public class FastDiscoveryTestFactory : WebApplicationFactory<Program>
{
    private readonly string _databaseName;
    private bool _disposed = false;

    public FastDiscoveryTestFactory()
    {
        _databaseName = $"FastTest_{Guid.NewGuid():N}";
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder
            .UseEnvironment("Testing")
            .ConfigureAppConfiguration((context, config) =>
            {
                config.Sources.Clear();
                config.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["ConnectionStrings:DefaultConnection"] = "DataSource=:memory:",
                    ["JWT:Secret"] = "fast-test-key-that-is-long-enough-for-hmacsha256-security-validation",
                    ["JWT:Issuer"] = "fast-test-issuer",
                    ["JWT:Audience"] = "fast-test-audience", 
                    ["JWT:ExpiryMinutes"] = "60",
                    ["ASPNETCORE_ENVIRONMENT"] = "Testing",
                    ["Logging:LogLevel:Default"] = "Critical" // Minimal logging
                });
            })
            .ConfigureServices(services =>
            {
                // CRITICAL: Remove all hosted services that can block discovery
                RemoveAllHostedServices(services);
                
                // Configure fast in-memory database
                ConfigureFastDatabase(services);
                
                // Mock external services without blocking
                ConfigureFastMocks(services);
                
                // Configure test authentication without external dependencies
                services.AddAuthentication("Test")
                    .AddScheme<AuthenticationSchemeOptions, TestAuthenticationHandler>("Test", options => { });
            })
            .ConfigureLogging(logging =>
            {
                // logging.ClearProviders(); // No logging for fastest startup - Commented out for .NET 9
            });
    }

    private void RemoveAllHostedServices(IServiceCollection services)
    {
        var hostedServices = services.Where(s => s.ServiceType == typeof(IHostedService)).ToList();
        foreach (var service in hostedServices)
        {
            services.Remove(service);
        }
    }

    private void ConfigureFastDatabase(IServiceCollection services)
    {
        // Remove existing DbContext registrations
        var contextDescriptor = services.SingleOrDefault(d => d.ServiceType == typeof(DbContextOptions<ApplicationDbContext>));
        if (contextDescriptor != null) services.Remove(contextDescriptor);

        var appContextDescriptor = services.SingleOrDefault(d => d.ServiceType == typeof(ApplicationDbContext));
        if (appContextDescriptor != null) services.Remove(appContextDescriptor);

        // Add fast in-memory database
        services.AddDbContext<ApplicationDbContext>(options =>
        {
            options.UseInMemoryDatabase(_databaseName);
            options.EnableSensitiveDataLogging(false);
            options.EnableServiceProviderCaching(false);
            options.EnableDetailedErrors(false);
        });
    }

    private void ConfigureFastMocks(IServiceCollection services)
    {
        // Mock Redis without blocking operations
        var mockRedisDatabase = Substitute.For<IDatabase>();
        var mockConnectionMultiplexer = Substitute.For<IConnectionMultiplexer>();
        mockConnectionMultiplexer.GetDatabase(Arg.Any<int>(), Arg.Any<object>()).Returns(mockRedisDatabase);
        
        // Remove existing Redis registration
        var redisDescriptor = services.SingleOrDefault(d => d.ServiceType == typeof(IConnectionMultiplexer));
        if (redisDescriptor != null) services.Remove(redisDescriptor);
        
        services.AddSingleton(mockConnectionMultiplexer);

        // Mock essential services only (minimal set for fast discovery)
        services.AddScoped(_ => Substitute.For<IAuthService>());
        services.AddScoped(_ => Substitute.For<ISearchService>());
        services.AddScoped(_ => Substitute.For<IContentService>());
        services.AddScoped(_ => Substitute.For<IPaymentService>());
        services.AddScoped(_ => Substitute.For<ISubscriptionService>());
        services.AddScoped(_ => Substitute.For<IUserProfileService>());
        services.AddScoped(_ => Substitute.For<IAdminUserManagementService>());
        
        // Mock validation services to prevent DI resolution failures
        services.AddScoped(_ => Substitute.For<IPasswordValidationService>());
        services.AddScoped(_ => Substitute.For<IRateLimitingService>());
        services.AddScoped(_ => Substitute.For<IRbacService>());
    }

    protected override void Dispose(bool disposing)
    {
        if (!_disposed && disposing)
        {
            _disposed = true;
        }
        base.Dispose(disposing);
    }
}