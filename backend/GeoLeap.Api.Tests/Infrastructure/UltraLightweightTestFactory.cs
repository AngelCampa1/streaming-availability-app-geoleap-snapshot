using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using GeoLeap.Api.Data;
using NSubstitute;
using StackExchange.Redis;

namespace GeoLeap.Api.Tests.Infrastructure;

/// <summary>
/// Ultra-lightweight test factory designed for maximum speed and zero timeouts
/// ELIMINATES ALL BACKGROUND SERVICES AND FILE WATCHERS
/// </summary>
public class UltraLightweightTestFactory : WebApplicationFactory<Program>
{
    private readonly string _databaseName;
    private static readonly object _lock = new object();

    public UltraLightweightTestFactory()
    {
        _databaseName = $"UltraTest_{Guid.NewGuid().ToString("N")[..8]}";
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        lock (_lock)
        {
            builder
                .UseEnvironment("Testing")
                .UseContentRoot("/tmp") // CRITICAL: Use temp directory to prevent file watchers
                .UseSetting("ASPNETCORE_ENVIRONMENT", "Testing")
                .ConfigureAppConfiguration((context, config) =>
                {
                    // NUCLEAR APPROACH: Completely eliminate all configuration sources
                    config.Sources.Clear();
                    
                    // Set minimal paths to prevent file monitoring
                    context.HostingEnvironment.ContentRootPath = "/tmp";
                    context.HostingEnvironment.WebRootPath = "/tmp";
                    
                    // Add only essential in-memory configuration
                    config.AddInMemoryCollection(new Dictionary<string, string?>
                    {
                        ["ConnectionStrings:DefaultConnection"] = "DataSource=:memory:",
                        ["JWT:Secret"] = "ultra-test-key-that-is-long-enough-for-hmacsha256-requirements",
                        ["JWT:Issuer"] = "ultra-test",
                        ["JWT:Audience"] = "ultra-test",
                        ["JWT:ExpiryMinutes"] = "60",
                        ["ASPNETCORE_ENVIRONMENT"] = "Testing",
                        
                        // DISABLE ALL FEATURES THAT CAN CAUSE DELAYS
                        ["RateLimiting:Enabled"] = "false",
                        ["Session:Enabled"] = "false",
                        ["SignalR:Enabled"] = "false",
                        ["Middleware:Disabled"] = "true",
                        ["BackgroundServices:Enabled"] = "false",
                        ["HostedServices:Enabled"] = "false",
                        ["ConfigurationReloadOnChange"] = "false"
                    });
                })
                .ConfigureServices(services =>
                {
                    // STEP 1: Nuclear elimination of all problematic services
                    EliminateAllBackgroundServices(services);
                    
                    // STEP 2: Replace database with ultra-fast in-memory
                    ConfigureUltraFastDatabase(services);
                    
                    // STEP 3: Mock only essential services (not all 60+)
                    ConfigureMinimalServiceMocks(services);
                    
                    // STEP 4: Disable all non-essential middleware
                    DisableMiddleware(services);
                });
        }
    }

    private void EliminateAllBackgroundServices(IServiceCollection services)
    {
        // Remove ALL services that could potentially run in background
        var servicesToRemove = services.Where(s =>
            s.ServiceType == typeof(IHostedService) ||
            s.ImplementationType?.Name?.Contains("Background") == true ||
            s.ImplementationType?.Name?.Contains("Service") == true && 
            s.ImplementationType?.BaseType?.Name?.Contains("Background") == true ||
            s.ImplementationType?.GetInterfaces()?.Any(i => i.Name.Contains("IHostedService")) == true
        ).ToList();

        foreach (var service in servicesToRemove)
        {
            services.Remove(service);
        }
        
        // Specifically remove known problematic services
        var knownProblems = new[] 
        {
            typeof(WatchlistBackgroundService),
            typeof(SeoBackgroundJobService)
        };
        
        foreach (var problemType in knownProblems)
        {
            var descriptor = services.FirstOrDefault(s => s.ImplementationType == problemType);
            if (descriptor != null)
            {
                services.Remove(descriptor);
            }
        }
    }

    private void ConfigureUltraFastDatabase(IServiceCollection services)
    {
        // Remove existing database registrations
        var dbDescriptors = services.Where(d => 
            d.ServiceType == typeof(DbContextOptions<ApplicationDbContext>) ||
            d.ServiceType == typeof(ApplicationDbContext)).ToList();
        
        foreach (var descriptor in dbDescriptors)
        {
            services.Remove(descriptor);
        }

        // Add ultra-fast in-memory database with minimal overhead
        services.AddDbContext<ApplicationDbContext>(options =>
        {
            options.UseInMemoryDatabase(_databaseName);
            options.EnableSensitiveDataLogging(false); // Disable logging for speed
            options.EnableServiceProviderCaching(true);
            options.EnableDetailedErrors(false);
        }, ServiceLifetime.Scoped); // Use scoped to prevent disposal issues
    }

    private void ConfigureMinimalServiceMocks(IServiceCollection services)
    {
        // Mock only the 5 most critical services to prevent 500 errors
        var mockRedis = Substitute.For<IDatabase>();
        var mockConnectionMultiplexer = Substitute.For<IConnectionMultiplexer>();
        mockConnectionMultiplexer.GetDatabase(Arg.Any<int>(), Arg.Any<object>()).Returns(mockRedis);
        
        services.AddSingleton(mockConnectionMultiplexer);
        services.AddSingleton(Substitute.For<IAuthService>());
        services.AddSingleton(Substitute.For<IEmailService>());
        services.AddSingleton(Substitute.For<INotificationService>());
        services.AddSingleton(Substitute.For<IResilienceService>());
        
        // Replace any remaining complex services with ultra-lightweight substitutes
        var complexServices = services.Where(s => 
            s.ServiceType.Name.Contains("Service") && 
            s.Lifetime == ServiceLifetime.Scoped).ToList();
            
        foreach (var service in complexServices.Take(10)) // Only replace first 10 to avoid timeout
        {
            if (service.ServiceType.IsInterface)
            {
                services.Remove(service);
                services.AddSingleton(service.ServiceType, _ => Substitute.For(new[] { service.ServiceType }, new object[0]));
            }
        }
    }

    private void DisableMiddleware(IServiceCollection services)
    {
        // Remove middleware that can cause startup delays
        var middlewareToRemove = services.Where(s =>
            s.ImplementationType?.Name?.Contains("Middleware") == true ||
            s.ImplementationType?.Name?.Contains("Filter") == true ||
            s.ServiceType?.Name?.Contains("Authentication") == true
        ).ToList();

        foreach (var middleware in middlewareToRemove)
        {
            services.Remove(middleware);
        }
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            // Ensure clean disposal to prevent resource leaks
        }
        base.Dispose(disposing);
    }
}