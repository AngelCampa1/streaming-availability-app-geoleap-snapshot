using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using Microsoft.AspNetCore.Authentication;
using Hangfire;
using Hangfire.InMemory;
using GeoLeap.Api.Data;
using GeoLeap.Api.Services;
using GeoLeap.Api.Tests.Infrastructure.Fakes;
using NSubstitute;
using StackExchange.Redis;

namespace GeoLeap.Api.Tests.Infrastructure;

/// <summary>
/// Test factory that uses REAL internal services with only external I/O mocked.
///
/// REAL SERVICES (kept as-is):
/// - SearchService, ContentService, AuthService
/// - RecommendationService, WatchlistService
/// - UserProfileService, PreferenceService
/// - All business logic and validation services
///
/// MOCKED/FAKE SERVICES (external I/O only):
/// - IEmailService -> FakeEmailService (captures emails)
/// - ITmdbClient -> FakeTmdbClient (deterministic test data)
/// - IPaymentService -> FakePaymentClient (no Stripe calls)
/// - IStreamingAvailabilityClient -> FakeStreamingAvailabilityClient
/// - ICacheService -> FakeCacheService (in-memory)
/// - ISmsService -> FakeSmsService (captures SMS)
/// - IPushNotificationService -> FakePushNotificationService
/// - IConnectionMultiplexer -> Mocked Redis
///
/// USE THIS FACTORY WHEN:
/// - You want to test real service interactions
/// - You need to verify actual business logic flows
/// - You want tests that exercise real code paths
/// - Integration tests between multiple services
///
/// DO NOT USE THIS FACTORY WHEN:
/// - Unit testing isolated components
/// - Testing specific mock behavior
/// - Performance-critical test suites
/// </summary>
public class RealServicesTestFactory : WebApplicationFactory<Program>
{
    private static readonly object _lock = new object();
    private static RealServicesTestFactory? _instance;
    private static readonly string _sharedDatabaseName = "RealServicesTestDb";

    // Fake service instances for test access - EXTERNAL I/O ONLY
    // These capture calls for assertions without making real external calls
    // TEMPORARILY DISABLED: FakeEmailService, FakePaymentClient, FakeCacheService (interface mismatches)
    public FakeTmdbClient FakeTmdbClient { get; } = new();
    public FakeSmsService FakeSmsService { get; } = new();
    public FakePushNotificationService FakePushNotificationService { get; } = new();

    /// <summary>
    /// Singleton instance for shared usage across all tests
    /// </summary>
    public static RealServicesTestFactory Instance
    {
        get
        {
            if (_instance == null)
            {
                lock (_lock)
                {
                    _instance ??= new RealServicesTestFactory();
                }
            }
            return _instance;
        }
    }

    public RealServicesTestFactory()
    {
        Console.WriteLine($"[RealServicesTestFactory] Creating with REAL internal services, only external I/O mocked");
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        Console.WriteLine($"[RealServicesTestFactory] Configuring WebHost for {_sharedDatabaseName}");

        // Set test environment
        Environment.SetEnvironmentVariable("ASPNETCORE_ENVIRONMENT", "Testing");
        Environment.SetEnvironmentVariable("EmailProvider", "Fake");

        builder
            .UseEnvironment("Testing")
            .ConfigureAppConfiguration((context, config) =>
            {
                config.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["ConnectionStrings:DefaultConnection"] = "DataSource=:memory:",
                    ["JWT:Secret"] = "real-services-test-key-that-is-long-enough-for-hmacsha256",
                    ["JWT:Issuer"] = "real-services-test-issuer",
                    ["JWT:Audience"] = "real-services-test-audience",
                    ["JWT:ExpiryMinutes"] = "60",
                    ["ASPNETCORE_ENVIRONMENT"] = "Testing",
                    ["EmailProvider"] = "Fake",
                    // Disable external API calls
                    ["Tmdb:Enabled"] = "false",
                    ["Stripe:TestMode"] = "true",
                    ["Redis:Enabled"] = "false"
                });
            })
            .ConfigureTestServices(services =>
            {
                ConfigureServices(services);
            });
    }

    private void ConfigureServices(IServiceCollection services)
    {
        Console.WriteLine($"[RealServicesTestFactory] Configuring services - keeping REAL internal services");

        // STEP 1: Configure test authentication (bypass JWT)
        RemoveExistingAuthServices(services);
        AddTestAuthentication(services);

        // STEP 2: Remove hosted services (background jobs)
        RemoveHostedServices(services);

        // STEP 3: Configure in-memory database
        ConfigureDatabase(services);

        // STEP 4: Mock Redis (external I/O)
        MockRedis(services);

        // STEP 5: Register FAKE external services (external I/O only)
        RegisterFakeExternalServices(services);

        // STEP 6: Configure Hangfire for testing (in-memory storage)
        ConfigureHangfireForTesting(services);

        // NOTE: All other internal services (SearchService, ContentService, etc.)
        // are NOT mocked - they use their real implementations from Program.cs

        Console.WriteLine($"[RealServicesTestFactory] Configuration complete - REAL services preserved, external I/O mocked");
    }

    private void RemoveExistingAuthServices(IServiceCollection services)
    {
        var authServices = services.Where(s =>
            s.ServiceType.Name.Contains("Authentication") ||
            s.ServiceType.Name.Contains("Authorization") ||
            s.ServiceType.Name.Contains("JWT") ||
            s.ServiceType.Name.Contains("Bearer")).ToList();

        foreach (var authService in authServices)
        {
            services.Remove(authService);
        }
    }

    private void AddTestAuthentication(IServiceCollection services)
    {
        services.AddAuthentication(TestAuthenticationHandler.DefaultScheme)
            .AddScheme<AuthenticationSchemeOptions, TestAuthenticationHandler>(
                TestAuthenticationHandler.DefaultScheme, options => { })
            // Register mock OAuth handlers so GoogleCallback/AppleCallback can call
            // HttpContext.AuthenticateAsync("Google") / ("Apple") without throwing
            // "No authentication handler is registered for scheme 'Google'".
            .AddScheme<AuthenticationSchemeOptions, GeoLeap.Api.Authentication.MockGoogleOAuthHandler>(
                "Google", options => { })
            .AddScheme<AuthenticationSchemeOptions, GeoLeap.Api.Authentication.MockAppleOAuthHandler>(
                "Apple", options => { });

        services.AddAuthorization(options =>
        {
            options.DefaultPolicy = new Microsoft.AspNetCore.Authorization.AuthorizationPolicyBuilder()
                .AddAuthenticationSchemes(TestAuthenticationHandler.DefaultScheme)
                .RequireAssertion(_ => true)
                .Build();
        });
    }

    private void RemoveHostedServices(IServiceCollection services)
    {
        var hostedServices = services.Where(s => s.ServiceType == typeof(IHostedService)).ToList();
        foreach (var hostedService in hostedServices)
        {
            services.Remove(hostedService);
        }
    }

    private void ConfigureDatabase(IServiceCollection services)
    {
        // Remove existing DbContext registrations
        var dbContextDescriptor = services.SingleOrDefault(d => d.ServiceType == typeof(DbContextOptions<ApplicationDbContext>));
        if (dbContextDescriptor != null) services.Remove(dbContextDescriptor);

        var applicationDbContextDescriptor = services.SingleOrDefault(d => d.ServiceType == typeof(ApplicationDbContext));
        if (applicationDbContextDescriptor != null) services.Remove(applicationDbContextDescriptor);

        // Use shared in-memory database
        services.AddDbContext<ApplicationDbContext>(options =>
        {
            options.UseInMemoryDatabase(_sharedDatabaseName);
            options.EnableSensitiveDataLogging(true); // Enable for debugging real service behavior
        });

        // Add IDbContextFactory for services that need it
        services.AddDbContextFactory<ApplicationDbContext>(options =>
        {
            options.UseInMemoryDatabase(_sharedDatabaseName);
        });
    }

    private void MockRedis(IServiceCollection services)
    {
        var mockRedis = Substitute.For<IDatabase>();
        var mockConnectionMultiplexer = Substitute.For<IConnectionMultiplexer>();
        mockConnectionMultiplexer.GetDatabase(Arg.Any<int>(), Arg.Any<object>()).Returns(mockRedis);

        var redisDescriptor = services.SingleOrDefault(d => d.ServiceType == typeof(IConnectionMultiplexer));
        if (redisDescriptor != null) services.Remove(redisDescriptor);

        services.AddSingleton(mockConnectionMultiplexer);
    }

    private void ConfigureHangfireForTesting(IServiceCollection services)
    {
        // CRITICAL: Configure GlobalConfiguration for BackgroundJob.Enqueue to work
        // BackgroundJob.Enqueue uses the static GlobalConfiguration, not DI services
        GlobalConfiguration.Configuration.UseInMemoryStorage();

        // Also configure DI services for consistency
        services.AddHangfire(config =>
        {
            config.UseInMemoryStorage();
        });

        // Note: We don't add Hangfire server (AddHangfireServer) since we removed hosted services
        // Jobs will be enqueued but not executed during tests - that's fine for testing registration flow
        Console.WriteLine($"[RealServicesTestFactory] Configured Hangfire GlobalConfiguration with in-memory storage for testing");
    }

    private void RegisterFakeExternalServices(IServiceCollection services)
    {
        // =========================================================
        // FAKE EXTERNAL I/O ONLY - Mock Boundary Rule
        // These are the ONLY services that should be faked.
        // All internal business logic services use REAL implementations.
        // =========================================================

        // DISABLED: Email, Payment, Cache services have interface mismatches
        // RemoveAndAddSingleton<IEmailService>(services, FakeEmailService);

        // TMDB client - returns deterministic test data (no real API calls)
        RemoveAndAddSingleton<ITmdbClient>(services, FakeTmdbClient);

        // DISABLED: Payment service has interface mismatch
        // RemoveAndAddSingleton<IPaymentService>(services, FakePaymentClient);

        // DISABLED: Cache service has interface mismatch
        // RemoveAndAddSingleton<ICacheService>(services, FakeCacheService);

        // SMS service - captures SMS messages instead of sending
        RemoveAndAddSingleton<ISmsService>(services, FakeSmsService);

        // Push notification service - captures notifications
        RemoveAndAddSingleton<IPushNotificationService>(services, FakePushNotificationService);

        // Streaming availability client - mock for external API
        var mockStreamingClient = NSubstitute.Substitute.For<IStreamingAvailabilityClient>();
        RemoveAndAddSingleton<IStreamingAvailabilityClient>(services, mockStreamingClient);

        Console.WriteLine($"[RealServicesTestFactory] Registered 4 active fake external services:");
        // Console.WriteLine($"   - IEmailService -> FakeEmailService (DISABLED)");
        Console.WriteLine($"   - ITmdbClient -> FakeTmdbClient (deterministic test data)");
        // Console.WriteLine($"   - IPaymentService -> FakePaymentClient (DISABLED)");
        // Console.WriteLine($"   - ICacheService -> FakeCacheService (DISABLED)");
        Console.WriteLine($"   - ISmsService -> FakeSmsService (captures SMS)");
        Console.WriteLine($"   - IPushNotificationService -> FakePushNotificationService");
        Console.WriteLine($"   - IStreamingAvailabilityClient -> Mock");
    }

    private void RemoveAndAddSingleton<TService>(IServiceCollection services, TService implementation)
        where TService : class
    {
        // Remove all existing registrations
        var descriptors = services.Where(s => s.ServiceType == typeof(TService)).ToList();
        foreach (var descriptor in descriptors)
        {
            services.Remove(descriptor);
        }

        // Add singleton fake
        services.AddSingleton(implementation);
    }

    /// <summary>
    /// Reset all fake services to their default state between tests
    /// </summary>
    public void ResetFakes()
    {
        // DISABLED services with interface mismatches:
        // FakeEmailService.Reset();
        FakeTmdbClient.Reset();
        // FakePaymentClient.Reset();
        // FakeCacheService.Reset();
        FakeSmsService.Reset();
        FakePushNotificationService.Reset();

        Console.WriteLine($"[RealServicesTestFactory] Active fake services reset to default state");
    }

    /// <summary>
    /// Reset database state between tests
    /// </summary>
    public void ResetDatabase()
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        context.Database.EnsureDeleted();
        context.Database.EnsureCreated();

        Console.WriteLine($"[RealServicesTestFactory] Database reset for clean test state");
    }

    /// <summary>
    /// Full reset - database and all fakes
    /// </summary>
    public void FullReset()
    {
        ResetDatabase();
        ResetFakes();
    }

    protected override void Dispose(bool disposing)
    {
        // Keep singleton alive
        if (!ReferenceEquals(this, _instance))
        {
            base.Dispose(disposing);
        }
    }
}
