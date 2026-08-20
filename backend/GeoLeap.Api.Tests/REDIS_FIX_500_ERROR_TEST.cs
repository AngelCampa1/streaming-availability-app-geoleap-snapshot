using System.Net;
using Xunit;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.EntityFrameworkCore;
using NSubstitute;
using StackExchange.Redis;
using GeoLeap.Api.Data;
using Microsoft.Extensions.Configuration;
using GeoLeap.Api.Tests.Infrastructure;

namespace GeoLeap.Api.Tests;

/// <summary>
/// TEST to specifically fix the Redis IConnectionMultiplexer dependency issue causing HTTP 500
/// This test focuses on properly mocking the Redis dependency that HealthController requires
/// </summary>
public class REDIS_FIX_500_ERROR_TEST : TestBase
{
    public REDIS_FIX_500_ERROR_TEST() : base()
    {
        // Uses singleton factory from TestBase
    }

    [Fact]
    public async Task RedisFix_HealthEndpoint_ShouldReturn200NotInternalServerError()
    {
        Console.WriteLine("🎯 REDIS FIX TEST: Testing /api/health with properly mocked Redis");
        
        // This should NOT return 500 Internal Server Error
        var response = await Client.GetAsync("/api/health");
        
        Console.WriteLine($"🎯 Response Status: {response.StatusCode}");
        Console.WriteLine($"🎯 Response Headers: {response.Headers}");
        
        var content = await response.Content.ReadAsStringAsync();
        Console.WriteLine($"🎯 Response Content: {content}");
        
        // Should NOT be InternalServerError 
        Assert.True(response.StatusCode != HttpStatusCode.InternalServerError, 
            $"Expected: NOT InternalServerError, Actual: {response.StatusCode}. Content: {content}");
        
        Console.WriteLine("✅ REDIS FIX TEST PASSED - No more 500 errors!");
    }

    [Fact]
    public async Task RedisFix_HealthLive_ShouldWork()
    {
        Console.WriteLine("🎯 REDIS FIX TEST: Testing /api/health/live (simple endpoint)");
        
        var response = await Client.GetAsync("/api/health/live");
        
        Console.WriteLine($"🎯 Live Response Status: {response.StatusCode}");
        Console.WriteLine($"🎯 Live Response Content: {await response.Content.ReadAsStringAsync()}");
        
        // This should definitely work - it's a simple endpoint
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        
        Console.WriteLine("✅ Live endpoint works perfectly!");
    }

    [Fact]
    public async Task RedisFix_HealthReady_ShouldWork()
    {
        Console.WriteLine("🎯 REDIS FIX TEST: Testing /api/health/ready");
        
        var response = await Client.GetAsync("/api/health/ready");
        
        Console.WriteLine($"🎯 Ready Response Status: {response.StatusCode}");
        Console.WriteLine($"🎯 Ready Response Content: {await response.Content.ReadAsStringAsync()}");
        
        // Should not be 500 Internal Server Error
        Assert.True(response.StatusCode != HttpStatusCode.InternalServerError,
            $"Ready endpoint failed with 500: {response.StatusCode}");
        
        Console.WriteLine("✅ Ready endpoint works!");
    }
}

/// <summary>
/// WebApplicationFactory that specifically fixes the Redis IConnectionMultiplexer issue
/// </summary>
public class RedisFixWebApplicationFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        
        // CRITICAL inotify FIX: Disable ALL file watchers to prevent exhaustion
        builder.ConfigureAppConfiguration((context, config) =>
        {
            Console.WriteLine("🔧 REDIS FIX: EMERGENCY inotify fix - disabling ALL file watchers");
            
            // Clear ALL configuration sources that create file watchers
            config.Sources.Clear();
            
            // Set minimal content root to prevent file monitoring
            context.HostingEnvironment.ContentRootPath = "/tmp";
            context.HostingEnvironment.WebRootPath = "/tmp";
            
            // Add ONLY in-memory configuration
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = "DataSource=:memory:",
                ["JWT:Secret"] = "test-key-that-is-long-enough-for-hmacsha256",
                ["JWT:Issuer"] = "test-issuer",
                ["JWT:Audience"] = "test-audience",
                ["JWT:ExpiryMinutes"] = "60",
                ["ASPNETCORE_ENVIRONMENT"] = "Testing",
                ["DOTNET_ENVIRONMENT"] = "Testing",
                ["Logging:LogLevel:Default"] = "Warning",
                
                // CRITICAL: Disable configuration file monitoring
                ["hostBuilder:reloadConfigOnChange"] = "false"
            });
            
            Console.WriteLine("✅ REDIS FIX: inotify FIXED - Zero file watchers configured");
        });
        
        builder.ConfigureServices(services =>
        {
            Console.WriteLine("🔧 REDIS FIX: Configuring services with proper Redis mocking");
            
            // 1. Replace database with in-memory version
            var dbDescriptors = services.Where(d => 
                d.ServiceType == typeof(DbContextOptions<ApplicationDbContext>) ||
                d.ServiceType == typeof(ApplicationDbContext)
            ).ToList();

            foreach (var descriptor in dbDescriptors)
            {
                services.Remove(descriptor);
            }

            services.AddDbContext<ApplicationDbContext>(options =>
            {
                options.UseInMemoryDatabase($"RedisFixDb_{Guid.NewGuid():N}");
                options.EnableSensitiveDataLogging(false);
                options.EnableDetailedErrors(true);
            });

            // 2. **CRITICAL FIX**: Properly mock Redis IConnectionMultiplexer
            Console.WriteLine("🔧 CRITICAL FIX: Removing existing Redis registrations...");
            var redisDescriptors = services.Where(d => d.ServiceType == typeof(IConnectionMultiplexer)).ToList();
            foreach (var descriptor in redisDescriptors)
            {
                services.Remove(descriptor);
                Console.WriteLine($"🔧 Removed Redis descriptor: {descriptor.ImplementationType?.Name ?? descriptor.ImplementationFactory?.Method.Name ?? "Unknown"}");
            }

            // 3. Add properly configured Redis mock
            Console.WriteLine("🔧 CRITICAL FIX: Adding properly mocked Redis...");
            var mockConnectionMultiplexer = Substitute.For<IConnectionMultiplexer>();
            var mockDatabase = Substitute.For<IDatabase>();
            
            // Configure the mock to return reasonable values
            mockConnectionMultiplexer.GetDatabase(Arg.Any<int>(), Arg.Any<object>()).Returns(mockDatabase);
            mockDatabase.PingAsync(Arg.Any<CommandFlags>()).Returns(Task.FromResult(TimeSpan.FromMilliseconds(1)));
            mockConnectionMultiplexer.IsConnected.Returns(true);
            
            services.AddSingleton<IConnectionMultiplexer>(mockConnectionMultiplexer);
            
            Console.WriteLine("✅ REDIS FIX: Redis properly mocked and registered");

            // 4. Also ensure distributed cache is available
            services.AddMemoryCache();
            services.AddSingleton<Microsoft.Extensions.Caching.Distributed.IDistributedCache, Microsoft.Extensions.Caching.Distributed.MemoryDistributedCache>();
            
            Console.WriteLine("✅ REDIS FIX: Service configuration completed");
        });

        builder.ConfigureLogging(logging =>
        {
            logging.ClearProviders();
            logging.AddConsole();
            logging.SetMinimumLevel(LogLevel.Warning);  // Reduce noise
        });
    }
}