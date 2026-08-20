using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Configuration;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using GeoLeap.Api.Data;
using GeoLeap.Api.Services;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services.ValidationServices;
using NSubstitute;
using StackExchange.Redis;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.Extensions.Logging;
using Microsoft.IdentityModel.Tokens;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authorization;
using System.Text.Encodings.Web;
using Microsoft.Extensions.Options;

namespace GeoLeap.Api.Tests.Infrastructure;

/// <summary>
/// UNIFIED WebApplicationFactory - Consolidates all test infrastructure patterns
/// 
/// This factory combines the best features from all previous implementations:
/// - UltraStableTestFactory: ServiceProvider disposal safety and comprehensive mocking
/// - Net9WebApplicationFactory: .NET 9 compatibility patterns
/// - SimpleWebApplicationFactory: Configuration management
/// - OptimizedWebApplicationFactory: Resource efficiency patterns
/// 
/// ELIMINATES: Multiple competing factories causing resource conflicts
/// PROVIDES: Single, proven, stable test infrastructure for ALL tests
/// </summary>
public class UnifiedWebApplicationFactory : WebApplicationFactory<Program>
{
    private readonly string _databaseName;
    private bool _disposed = false;
    private readonly object _disposeLock = new object();
    private static int _instanceCounter = 0;

    public UnifiedWebApplicationFactory()
    {
        var instanceId = Interlocked.Increment(ref _instanceCounter);
        _databaseName = $"UnifiedTestDb_{instanceId}_{Guid.NewGuid().ToString("N")[..8]}";
        Console.WriteLine($"🏭 UNIFIED FACTORY: Created instance #{instanceId} with database: {_databaseName}");
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        Console.WriteLine($"🔧 UNIFIED FACTORY: Configuring WebHost for {_databaseName}");

        // CRITICAL: Prevent service provider disposal conflicts (from UltraStableTestFactory)
        builder
            .UseEnvironment("Testing")
            .ConfigureAppConfiguration((context, config) =>
            {
                ConfigureTestConfiguration(config);
            })
            .ConfigureServices(services =>
            {
                try 
                {
                    // STEP 1: Remove problematic services that cause disposal conflicts
                    RemoveHostedAndBackgroundServices(services);
                    
                    // STEP 2: Configure stable database with proper lifecycle
                    ConfigureInMemoryDatabase(services);
                    
                    // STEP 3: Mock external dependencies with stable lifecycle  
                    MockExternalServices(services);
                    
                    // STEP 4: Comprehensive service mocking (prevents DI resolution errors)
                    ConfigureComprehensiveServiceMocks(services);
                    
                    // STEP 5: BYPASS AUTHENTICATION COMPLETELY - Remove [Authorize] enforcement
                    ConfigureAuthenticationBypass(services);
                    
                    Console.WriteLine($"✅ UNIFIED FACTORY: All services configured for {_databaseName}");
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"❌ UNIFIED FACTORY: Service configuration error: {ex.Message}");
                    throw;
                }
            })
            .ConfigureLogging(logging =>
            {
                // Minimize logging to reduce disposal conflicts
                logging.ClearProviders();
                logging.SetMinimumLevel(LogLevel.Warning);
            });
    }

    private void ConfigureTestConfiguration(IConfigurationBuilder config)
    {
        Console.WriteLine($"🔧 UNIFIED FACTORY: EMERGENCY inotify fix - disabling ALL file watchers");
        
        // CRITICAL inotify FIX: Clear ALL configuration sources that create file watchers
        config.Sources.Clear();
        
        // Add comprehensive in-memory configuration (NO file-based sources)
        config.AddInMemoryCollection(new Dictionary<string, string?>
        {
            // Database
            ["ConnectionStrings:DefaultConnection"] = "DataSource=:memory:",
            
            // JWT Authentication
            ["JWT:Secret"] = "unified-test-key-that-is-long-enough-for-hmacsha256-security-algorithm",
            ["JWT:Issuer"] = "unified-test-issuer",
            ["JWT:Audience"] = "unified-test-audience", 
            ["JWT:ExpiryMinutes"] = "60",
            
            // Environment
            ["ASPNETCORE_ENVIRONMENT"] = "Testing",
            ["DOTNET_ENVIRONMENT"] = "Testing",
            
            // Logging
            ["Logging:LogLevel:Default"] = "Warning",
            ["Logging:LogLevel:Microsoft"] = "Warning",
            ["Logging:LogLevel:Microsoft.EntityFrameworkCore"] = "Warning",
            ["Logging:LogLevel:Microsoft.Extensions"] = "Warning",
            
            // External Services (mocked)
            ["ConnectionStrings:Redis"] = "",
            ["Sentry:Dsn"] = "",
            
            // Feature Toggles - Disable everything for test stability
            ["RateLimiting:Enabled"] = "false",
            ["Session:Enabled"] = "false", 
            ["SignalR:Enabled"] = "false",
            ["BackgroundServices:Enabled"] = "false",
            ["HostedServices:Enabled"] = "false",
            
            // API Keys (test values)
            ["StreamingApiSettings:ApiKey"] = "test-key",
            ["TmdbSettings:ApiKey"] = "test-tmdb-key",
            ["Stripe:SecretKey"] = "sk_test_fake_key_for_testing",
            ["Stripe:PublishableKey"] = "pk_test_fake_key_for_testing",
            
            // CRITICAL: Disable configuration file monitoring completely
            ["hostBuilder:reloadConfigOnChange"] = "false",
            ["hostBuilder:suppressStatusMessages"] = "true",
            
            // CRITICAL: Disable problematic middleware for tests
            ["SecurityValidation:Enabled"] = "false",
            ["RateLimiting:Enabled"] = "false",
            ["CORS:Enabled"] = "false"
        });
        
        Console.WriteLine($"✅ UNIFIED FACTORY: inotify FIXED - Zero file watchers for {_databaseName}");
    }

    private void RemoveHostedAndBackgroundServices(IServiceCollection services)
    {
        Console.WriteLine($"🚫 UNIFIED FACTORY: Removing hosted services to prevent disposal conflicts");
        
        var servicesToRemove = new List<ServiceDescriptor>();
        
        foreach (var service in services.ToList())
        {
            var shouldRemove = false;
            var reason = "";
            
            // Remove IHostedService registrations
            if (service.ServiceType == typeof(IHostedService))
            {
                shouldRemove = true;
                reason = "IHostedService";
            }
            
            // Remove BackgroundService implementations  
            if (service.ImplementationType != null)
            {
                if (typeof(BackgroundService).IsAssignableFrom(service.ImplementationType) ||
                    typeof(IHostedService).IsAssignableFrom(service.ImplementationType))
                {
                    shouldRemove = true;
                    reason = $"Background/Hosted service: {service.ImplementationType.Name}";
                }
            }
            
            // Remove specific problematic services by name pattern
            if (service.ImplementationType?.Name != null)
            {
                var problematicPatterns = new[] { "Warming", "Monitor", "Processor", "Registration" };
                if (problematicPatterns.Any(pattern => service.ImplementationType.Name.Contains(pattern)))
                {
                    shouldRemove = true;
                    reason = $"Problematic service: {service.ImplementationType.Name}";
                }
            }
            
            if (shouldRemove)
            {
                servicesToRemove.Add(service);
                Console.WriteLine($"🚫 UNIFIED FACTORY: Removing {reason}");
            }
        }
        
        foreach (var service in servicesToRemove)
        {
            services.Remove(service);
        }
        
        Console.WriteLine($"✅ UNIFIED FACTORY: Removed {servicesToRemove.Count} hosted services");
    }

    private void ConfigureInMemoryDatabase(IServiceCollection services)
    {
        // Remove existing database registrations cleanly
        var descriptorsToRemove = services.Where(d => 
            d.ServiceType == typeof(DbContextOptions<ApplicationDbContext>) ||
            d.ServiceType == typeof(ApplicationDbContext)
        ).ToList();
        
        foreach (var descriptor in descriptorsToRemove)
        {
            services.Remove(descriptor);
        }

        // Add stable in-memory database with proper lifecycle
        services.AddDbContext<ApplicationDbContext>(options =>
        {
            options.UseInMemoryDatabase(_databaseName);
            // Disable change tracking for performance and stability
            options.UseQueryTrackingBehavior(QueryTrackingBehavior.NoTracking);
        }, ServiceLifetime.Scoped);

        Console.WriteLine($"💾 UNIFIED FACTORY: In-memory database configured: {_databaseName}");
    }

    private void MockExternalServices(IServiceCollection services)
    {
        // Mock Redis with stable lifecycle
        var mockRedis = Substitute.For<IDatabase>();
        var mockConnectionMultiplexer = Substitute.For<IConnectionMultiplexer>();
        mockConnectionMultiplexer.GetDatabase(Arg.Any<int>(), Arg.Any<object>()).Returns(mockRedis);
        
        // Configure Redis mock for HealthController
        mockConnectionMultiplexer.IsConnected.Returns(true);
        mockRedis.PingAsync(Arg.Any<CommandFlags>()).Returns(Task.FromResult(TimeSpan.FromMilliseconds(1)));
        
        var redisDescriptor = services.SingleOrDefault(d => d.ServiceType == typeof(IConnectionMultiplexer));
        if (redisDescriptor != null) services.Remove(redisDescriptor);
        services.AddSingleton(mockConnectionMultiplexer);

        // Mock other external services that could cause disposal conflicts
        services.AddSingleton(Substitute.For<IResilienceService>());

        Console.WriteLine($"🔗 UNIFIED FACTORY: External services mocked with stable lifecycle");
    }

    private void ConfigureComprehensiveServiceMocks(IServiceCollection services)
    {
        // Auth services with enhanced configuration
        var mockAuthService = Substitute.For<IAuthService>();
        ConfigureAuthServiceMock(mockAuthService);
        services.AddTransient<IAuthService>(_ => mockAuthService);
        services.AddTransient<IPasswordResetService>(_ => Substitute.For<IPasswordResetService>());
        services.AddTransient<IPasswordValidationService>(_ => Substitute.For<IPasswordValidationService>());
        
        // Rate limiting service mock that prevents null reference exceptions
        var mockRateLimitingService = Substitute.For<IRateLimitingService>();
        ConfigureRateLimitingServiceMock(mockRateLimitingService);
        services.AddTransient<IRateLimitingService>(_ => mockRateLimitingService);
        
        // CRITICAL: Mock SecurityValidationService to prevent null reference in middleware
        var mockSecurityValidationService = Substitute.For<ISecurityValidationService>();
        mockSecurityValidationService.ValidateInputAsync(Arg.Any<string>(), Arg.Any<SecurityValidationType>())
            .Returns(Task.FromResult(new SecurityValidationResult { IsValid = true, ThreatLevel = SecurityThreatLevel.None }));
        mockSecurityValidationService.IsSqlInjectionAttemptAsync(Arg.Any<string>())
            .Returns(Task.FromResult(false));
        mockSecurityValidationService.IsXssAttemptAsync(Arg.Any<string>())
            .Returns(Task.FromResult(false));
        mockSecurityValidationService.SanitizeInputAsync(Arg.Any<string>())
            .Returns(callInfo => Task.FromResult(callInfo.Arg<string>()));
        mockSecurityValidationService.IsExcessivelyLongAsync(Arg.Any<string>(), Arg.Any<int>())
            .Returns(Task.FromResult(false));
        mockSecurityValidationService.AssessThreatLevelAsync(Arg.Any<string>())
            .Returns(Task.FromResult(SecurityThreatLevel.None));
        services.AddTransient<ISecurityValidationService>(_ => mockSecurityValidationService);

        // Core application services - comprehensive list to prevent DI failures
        var coreServices = new[]
        {
            // Security & Authentication  
            typeof(ICircuitBreakerService), typeof(IDatabaseResilienceService), 
            typeof(IRbacService), typeof(IJwtTokenService),
            typeof(IAccountLockoutService), typeof(ISessionService), typeof(IPasswordHashingService),
            
            // User & Profile Management
            typeof(IUserProfileService), typeof(IOnboardingService), typeof(IStreamingServiceManagementService),
            typeof(IEmailService), typeof(ISecurityService), typeof(ISessionManagementService),
            typeof(IAdminUserManagementService), typeof(INotificationService),
            
            // Content & Media
            typeof(IImageService), typeof(IContentLinkingService), typeof(ILocalizedContentService),
            typeof(IPopularContentService), typeof(IContentService), typeof(ISeoMetadataService),
            
            // Caching & Performance
            typeof(ICacheService), typeof(ICacheKeyService), typeof(ICacheTtlManager), 
            typeof(ICacheMetricsCollector), typeof(ICachePersistenceService), typeof(ICacheInvalidationService),
            
            // Data & Validation
            typeof(IDataValidationService), typeof(IBusinessRuleValidationService),
            typeof(IValidationRuleEngine), typeof(IDataEnrichmentService), typeof(IDataReconciliationService),
            typeof(IDataConsistencyChecker), typeof(IQualityMetricsCollector), typeof(IAlertingService),
            
            // Search & Discovery
            typeof(ISearchService), typeof(IAutocompleteService), typeof(IAdvancedFilterService),
            
            // Payment & Subscription
            typeof(IPaymentService), typeof(ISubscriptionService),
            
            // External APIs
            typeof(IStreamingAvailabilityClient), typeof(ITmdbClient), typeof(IStreamingApiErrorHandler),
            typeof(IStreamingDataNormalizer), typeof(IApiUsageTracker), typeof(IApiCostManager),
            
            // Cost Management
            typeof(IApiCostTracker), typeof(IBudgetManager), typeof(IProviderCostCalculator),
            typeof(ICostOptimizationEngine), typeof(IProviderManager), typeof(IProviderSelector),
            
            // Data Processing
            typeof(IDataTransformationService), typeof(IContentDataService), typeof(IAlertHandler),
            
            // Logging & Monitoring
            typeof(ILoggerService), typeof(IAdminActionLogger)
        };

        foreach (var serviceType in coreServices)
        {
            services.AddTransient(serviceType, _ => Substitute.For(new Type[] { serviceType }, new object[0]));
        }

        Console.WriteLine($"🎯 UNIFIED FACTORY: {coreServices.Length} core services mocked");
    }

    private void ConfigureAuthenticationBypass(IServiceCollection services)
    {
        // REVOLUTIONARY APPROACH: Completely bypass authentication middleware
        // This removes [Authorize] enforcement entirely for tests
        
        Console.WriteLine($"🚫 UNIFIED FACTORY: AUTHENTICATION BYPASS - Removing ALL authentication enforcement");
        
        // Remove authentication and authorization services
        var authServices = services.Where(s => 
            s.ServiceType.Name.Contains("Authentication") ||
            s.ServiceType.Name.Contains("Authorization") ||
            s.ServiceType.Name.Contains("JWT") ||
            s.ServiceType.Name.Contains("Bearer")).ToList();
            
        foreach (var authService in authServices)
        {
            services.Remove(authService);
            Console.WriteLine($"🚫 Removed auth service: {authService.ServiceType.Name}");
        }
        
        // Configure authentication to use TestAuthenticationHandler as DEFAULT
        services.AddAuthentication(TestAuthenticationHandler.DefaultScheme)
            .AddScheme<AuthenticationSchemeOptions, TestAuthenticationHandler>(
                TestAuthenticationHandler.DefaultScheme, options => { });
        
        services.AddAuthorization(options =>
        {
            // Make ALL policies pass automatically
            options.DefaultPolicy = new AuthorizationPolicyBuilder()
                .AddAuthenticationSchemes(TestAuthenticationHandler.DefaultScheme)
                .RequireAssertion(_ => true) // Always authorize
                .Build();
        });
        
        Console.WriteLine($"✅ UNIFIED FACTORY: Authentication completely bypassed - all [Authorize] attributes will pass");
    }

    private void ConfigureAuthServiceMock(IAuthService mockAuthService)
    {
        // Configure successful responses for all auth operations
        mockAuthService.RegisterAsync(Arg.Any<RegisterDto>(), Arg.Any<string>(), Arg.Any<string>())
            .Returns(Task.FromResult(new AuthResponseDto { Success = true, Message = "Test registration successful" }));

        mockAuthService.LoginAsync(Arg.Any<LoginDto>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>())
            .Returns(Task.FromResult(new AuthResponseDto { Success = true, Message = "Test login successful" }));

        mockAuthService.RefreshTokenAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>())
            .Returns(Task.FromResult<TokenResponseDto?>(new TokenResponseDto()));

        mockAuthService.LogoutAsync(Arg.Any<string>()).Returns(Task.FromResult(true));
        
        mockAuthService.GetUserInfoAsync(Arg.Any<Guid>())
            .Returns(Task.FromResult<UserInfoDto?>(new UserInfoDto { Id = Guid.NewGuid() }));

        Console.WriteLine($"🔐 UNIFIED FACTORY: Auth service mock configured");
    }
    
    private void ConfigureRateLimitingServiceMock(IRateLimitingService mockRateLimitingService)
    {
        // Always allow requests in test environment
        var allowedResult = new RateLimitResult
        {
            IsAllowed = true,
            RemainingRequests = 999,
            TotalRequestsInWindow = 1,
            WindowResetTime = DateTime.UtcNow.AddMinutes(1),
            RetryAfter = TimeSpan.Zero
        };
        
        mockRateLimitingService.CheckRateLimitAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<int>(), Arg.Any<TimeSpan>())
            .Returns(Task.FromResult(allowedResult));
            
        mockRateLimitingService.CheckRateLimitAsync(Arg.Any<string>(), Arg.Any<int>(), Arg.Any<TimeSpan>())
            .Returns(Task.FromResult(allowedResult));

        Console.WriteLine($"🚦 UNIFIED FACTORY: Rate limiting service configured to always allow");
    }

    protected override void Dispose(bool disposing)
    {
        if (!_disposed && disposing)
        {
            lock (_disposeLock)
            {
                if (!_disposed)
                {
                    Console.WriteLine($"🧹 UNIFIED FACTORY: Disposing factory: {_databaseName}");
                    _disposed = true;
                }
            }
        }
        
        base.Dispose(disposing);
    }
}