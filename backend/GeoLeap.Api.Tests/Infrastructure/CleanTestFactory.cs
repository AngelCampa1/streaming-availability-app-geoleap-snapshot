using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using GeoLeap.Api.Data;
using GeoLeap.Api.Services;
using GeoLeap.Api.Services.ValidationServices;
using GeoLeap.Api.Services.GrowthAnalytics;
using GeoLeap.Api.Models.GrowthAnalytics;
using NSubstitute;
using StackExchange.Redis;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;
using System.Security.Claims;
using System.Text.Encodings.Web;

namespace GeoLeap.Api.Tests.Infrastructure;

/// <summary>
/// Clean, minimal WebApplicationFactory that eliminates hanging issues
/// Uses simplified service registration and proper disposal patterns
/// </summary>
public class CleanTestFactory : WebApplicationFactory<Program>
{
    private readonly string _databaseName;
    private static int _instanceCounter = 0;

    public CleanTestFactory()
    {
        var instanceId = Interlocked.Increment(ref _instanceCounter);
        _databaseName = $"CleanTestDb_{instanceId}_{DateTime.UtcNow.Ticks}";
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        
        builder.ConfigureAppConfiguration((context, config) =>
        {
            config.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["ConnectionStrings:DefaultConnection"] = $"DataSource=:memory:",
                ["Logging:LogLevel:Default"] = "Warning",
                ["Logging:LogLevel:Microsoft"] = "Warning", 
                ["Logging:LogLevel:Microsoft.Hosting.Lifetime"] = "Warning"
            });
        });

        builder.ConfigureServices(services =>
        {
            // Remove existing DbContext registrations
            var dbContextDescriptor = services.SingleOrDefault(d => d.ServiceType == typeof(DbContextOptions<ApplicationDbContext>));
            if (dbContextDescriptor != null)
                services.Remove(dbContextDescriptor);

            var dbContextServiceDescriptor = services.SingleOrDefault(d => d.ServiceType == typeof(ApplicationDbContext));
            if (dbContextServiceDescriptor != null)
                services.Remove(dbContextServiceDescriptor);

            // Add clean in-memory database
            services.AddDbContext<ApplicationDbContext>(options =>
            {
                options.UseInMemoryDatabase(_databaseName);
                options.EnableSensitiveDataLogging(false);
                options.EnableServiceProviderCaching(false);
                options.UseQueryTrackingBehavior(QueryTrackingBehavior.NoTracking);
            });

            // Mock external services to prevent hanging
            services.AddSingleton(_ => Substitute.For<IConnectionMultiplexer>());
            services.AddScoped(_ => Substitute.For<IDatabase>());
            
            // Mock Growth Analytics services for US-7.5 testing
            var mockGrowthTrackingService = Substitute.For<IGrowthTrackingService>();
            var mockAttributionService = Substitute.For<IAttributionService>();
            var mockBackgroundService = Substitute.For<IGrowthAnalyticsBackgroundService>();
            
            // Setup basic return values for Growth Analytics mocks
            mockGrowthTrackingService.TrackEventAsync(Arg.Any<GrowthEvent>(), Arg.Any<CancellationToken>())
                .Returns(Task.FromResult(true));
            mockGrowthTrackingService.TrackEventsAsync(Arg.Any<IEnumerable<GrowthEvent>>(), Arg.Any<CancellationToken>())
                .Returns(Task.FromResult(1));
            mockGrowthTrackingService.GetProcessingStatsAsync()
                .Returns(Task.FromResult(new EventProcessingStats()));
            
            mockAttributionService.CalculateAttributionAsync(Arg.Any<Guid>())
                .Returns(Task.FromResult(new AttributionResult()));
            
            services.AddTransient<IGrowthTrackingService>(_ => mockGrowthTrackingService);
            services.AddTransient<IAttributionService>(_ => mockAttributionService);
            services.AddTransient<IGrowthAnalyticsBackgroundService>(_ => mockBackgroundService);
            
            // Mock existing services to prevent external dependencies
            // Only mock services that actually exist in the codebase

            // Add test authentication
            services.AddAuthentication("Test")
                .AddScheme<AuthenticationSchemeOptions, CleanTestAuthHandler>("Test", options => { });
        });

        builder.UseDefaultServiceProvider(options =>
        {
            options.ValidateScopes = false;
            options.ValidateOnBuild = false;
        });
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            // Clean disposal - no complex operations
        }
        base.Dispose(disposing);
    }

    public override async ValueTask DisposeAsync()
    {
        // Simple async disposal
        await base.DisposeAsync();
    }
}

/// <summary>
/// Minimal test authentication handler that always succeeds
/// </summary>
public class CleanTestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
#pragma warning disable CS0618 // Type or member is obsolete
    public CleanTestAuthHandler(IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger, UrlEncoder encoder, ISystemClock clock)
        : base(options, logger, encoder, clock)
#pragma warning restore CS0618 // Type or member is obsolete
    {
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        // CRITICAL FIX: Support admin role for AdminController tests
        var isAdminRequest = Request.Headers.ContainsKey("X-Test-Role");
        
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.Name, "TestUser"),
            new Claim(ClaimTypes.NameIdentifier, "test-user-id"),
            new Claim("user_id", "test-user-id")
        };

        // Add admin role if requested
        if (isAdminRequest)
        {
            claims.Add(new Claim(ClaimTypes.Role, "Admin"));
            claims.Add(new Claim("role", "admin"));
        }

        var identity = new ClaimsIdentity(claims, "Test");
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, "Test");

        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}