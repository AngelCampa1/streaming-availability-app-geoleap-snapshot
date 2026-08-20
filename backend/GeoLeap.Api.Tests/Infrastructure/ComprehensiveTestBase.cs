using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using GeoLeap.Api.Data;
using GeoLeap.Api.Services;
using GeoLeap.Api.Models;
using NSubstitute;
using StackExchange.Redis;
using System.Net.Http.Headers;

namespace GeoLeap.Api.Tests.Infrastructure;

/// <summary>
/// COMPREHENSIVE Test Base with 100% Service Coverage
/// Fixes the 500 errors by mocking ALL 80+ services from Program.cs
/// Optimized for resource management and high test throughput
/// </summary>
public abstract class ComprehensiveTestBase : IAsyncDisposable
{
    protected readonly ComprehensiveWebApplicationFactory Factory;
    protected readonly HttpClient Client;
    private bool _disposed = false;

    protected ComprehensiveTestBase()
    {
        try
        {
            Console.WriteLine($"🚀 COMPREHENSIVE BASE: Initializing with complete service mocking...");
            
            Factory = new ComprehensiveWebApplicationFactory();
            Client = Factory.CreateClient();
            
            // Configure default test settings
            Client.Timeout = TimeSpan.FromMinutes(2); // Prevent timeouts
            
            Console.WriteLine($"✅ COMPREHENSIVE SUCCESS: Full test infrastructure ready");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ COMPREHENSIVE BASE FAILED: {ex.Message}");
            throw;
        }
    }

    /// <summary>
    /// Add authentication header for tests that need it
    /// </summary>
    protected void SetAuthenticationHeader(string token = "test-token-123")
    {
        Client.DefaultRequestHeaders.Authorization = 
            new AuthenticationHeaderValue("Bearer", token);
    }

    /// <summary>
    /// Remove authentication header
    /// </summary>
    protected void ClearAuthenticationHeader()
    {
        Client.DefaultRequestHeaders.Authorization = null;
    }

    public virtual async ValueTask DisposeAsync()
    {
        if (_disposed)
            return;
            
        _disposed = true;
        
        try
        {
            Client?.Dispose();
            Factory?.Dispose();
            
            // Force garbage collection to prevent resource accumulation
            GC.Collect();
            GC.WaitForPendingFinalizers();
            
            Console.WriteLine($"✅ COMPREHENSIVE BASE: Disposed cleanly");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"⚠️ COMPREHENSIVE BASE: Disposal warning: {ex.Message}");
        }
        
        await Task.CompletedTask;
    }
}

/// <summary>
/// COMPREHENSIVE WebApplicationFactory that mocks ALL services from Program.cs
/// This eliminates 500 errors by ensuring complete service dependency resolution
/// </summary>
public class ComprehensiveWebApplicationFactory : WebApplicationFactory<Program>
{
    private readonly string _databaseName;

    public ComprehensiveWebApplicationFactory()
    {
        _databaseName = $"TestDb_{Guid.NewGuid().ToString("N")[..8]}";
        Console.WriteLine($"🔧 COMPREHENSIVE FACTORY: Creating with database: {_databaseName}");
    }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        var contentRoot = GetWebProjectPath();
        
        builder
            .UseEnvironment("Testing")
            .UseContentRoot(contentRoot)
            .ConfigureAppConfiguration((context, config) =>
            {
                config.Sources.Clear();
                
                config.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["ConnectionStrings:DefaultConnection"] = "DataSource=:memory:",
                    ["ConnectionStrings:Redis"] = "", // Disable Redis
                    ["JWT:Secret"] = "test-key-that-is-long-enough-for-hmacsha256",
                    ["JWT:Issuer"] = "test-issuer", 
                    ["JWT:Audience"] = "test-audience",
                    ["JWT:ExpiryMinutes"] = "60",
                    ["CacheSettings:Memory:SizeLimit"] = "1000",
                    ["CacheSettings:Memory:CompactionPercentage"] = "0.25",
                    ["CacheSettings:Memory:ExpirationScanFrequency"] = "00:05:00",
                    // Stripe configuration for payment services
                    ["Stripe:SecretKey"] = "sk_test_51MockedStripeKey",
                    ["Stripe:PublishableKey"] = "pk_test_MockedStripePublishable",
                    ["Stripe:WebhookSecret"] = "whsec_MockedWebhookSecret",
                    // Email service configuration
                    ["EmailSettings:SmtpServer"] = "test-smtp.example.com",
                    ["EmailSettings:Port"] = "587",
                    ["EmailSettings:Username"] = "test@example.com",
                    ["EmailSettings:Password"] = "test-password",
                    ["EmailSettings:EnableSsl"] = "true",
                    // External API keys for mocking
                    ["TMDB:ApiKey"] = "test-tmdb-key",
                    ["StreamingAvailability:ApiKey"] = "test-streaming-key"
                });
                
                Console.WriteLine($"✅ COMPREHENSIVE: Configuration loaded");
            })
            .ConfigureServices(services =>
            {
                Console.WriteLine($"🔧 COMPREHENSIVE: Starting complete service override...");
                
                // Replace database with in-memory
                OverrideDatabaseServices(services);
                
                // Mock ALL external dependencies (complete list from Program.cs)
                MockAllProductionServices(services);
                
                // Disable resource-intensive services
                DisableHostedServices(services);
                
                Console.WriteLine($"✅ COMPREHENSIVE: All 80+ services mocked successfully");
            });
    }

    private string GetWebProjectPath()
    {
        var currentDir = Directory.GetCurrentDirectory();
        var webProjectDir = Path.Combine(currentDir, "..", "GeoLeap.Api");
        
        if (Directory.Exists(webProjectDir))
        {
            return Path.GetFullPath(webProjectDir);
        }
        
        return currentDir;
    }

    private void OverrideDatabaseServices(IServiceCollection services)
    {
        // Remove existing database registrations
        RemoveService<DbContextOptions<ApplicationDbContext>>(services);
        RemoveService<ApplicationDbContext>(services);

        // Add in-memory database
        services.AddDbContext<ApplicationDbContext>(options =>
        {
            options.UseInMemoryDatabase(_databaseName);
            options.EnableSensitiveDataLogging(false); // Reduce noise
            options.EnableDetailedErrors(false);
        });

        Console.WriteLine($"💾 COMPREHENSIVE: In-memory database configured");
    }

    private void MockAllProductionServices(IServiceCollection services)
    {
        // INFRASTRUCTURE SERVICES
        MockInfrastructureServices(services);
        
        // AUTHENTICATION & SECURITY SERVICES  
        MockAuthenticationServices(services);
        
        // BUSINESS SERVICES
        MockBusinessServices(services);
        
        // CONTENT & SEARCH SERVICES
        MockContentServices(services);
        
        // PAYMENT & SUBSCRIPTION SERVICES
        MockPaymentServices(services);
        
        // SEO & ANALYTICS SERVICES
        MockSeoServices(services);
        
        // EXTERNAL API SERVICES
        MockExternalApiServices(services);
        
        // ADMIN & MANAGEMENT SERVICES
        MockAdminServices(services);
        
        // VALIDATION & ENRICHMENT SERVICES
        MockValidationServices(services);
        
        Console.WriteLine($"🎯 COMPREHENSIVE: Complete service mocking completed");
    }

    private void MockInfrastructureServices(IServiceCollection services)
    {
        // Redis services
        var mockRedis = Substitute.For<IDatabase>();
        var mockConnectionMultiplexer = Substitute.For<IConnectionMultiplexer>();
        mockConnectionMultiplexer.GetDatabase(Arg.Any<int>(), Arg.Any<object>()).Returns(mockRedis);
        RemoveService<IConnectionMultiplexer>(services);
        services.AddSingleton(mockConnectionMultiplexer);

        // Circuit breaker and resilience
        services.AddSingleton<ICircuitBreakerService>(Substitute.For<ICircuitBreakerService>());
        services.AddSingleton<IResilienceService>(Substitute.For<IResilienceService>());
        services.AddScoped<IRateLimitingService>(provider => Substitute.For<IRateLimitingService>());
        services.AddScoped<ISecurityValidationService>(provider => Substitute.For<ISecurityValidationService>());
        services.AddScoped<IDatabaseResilienceService>(provider => Substitute.For<IDatabaseResilienceService>());
        
        // Caching services
        services.AddScoped<ICacheService>(provider => Substitute.For<ICacheService>());
        services.AddScoped<ICacheKeyService>(provider => Substitute.For<ICacheKeyService>());
        services.AddScoped<ICacheTtlManager>(provider => Substitute.For<ICacheTtlManager>());
        services.AddScoped<ICacheMetricsCollector>(provider => Substitute.For<ICacheMetricsCollector>());
        services.AddScoped<ICachePersistenceService>(provider => Substitute.For<ICachePersistenceService>());
        services.AddScoped<ICacheInvalidationService>(provider => Substitute.For<ICacheInvalidationService>());

        Console.WriteLine($"⚡ COMPREHENSIVE: Infrastructure services mocked");
    }

    private void MockAuthenticationServices(IServiceCollection services)
    {
        // Core auth services with configured behaviors
        var mockAuthService = Substitute.For<IAuthService>();
        ConfigureAuthServiceMock(mockAuthService);
        services.AddTransient<IAuthService>(_ => mockAuthService);
        
        services.AddTransient<IJwtTokenService>(provider => Substitute.For<IJwtTokenService>());
        services.AddTransient<IPasswordResetService>(provider => Substitute.For<IPasswordResetService>());
        services.AddTransient<IPasswordValidationService>(provider => Substitute.For<IPasswordValidationService>());
        services.AddTransient<IAccountLockoutService>(provider => Substitute.For<IAccountLockoutService>());
        services.AddTransient<ISessionService>(provider => Substitute.For<ISessionService>());
        services.AddTransient<ISessionManagementService>(provider => Substitute.For<ISessionManagementService>());
        services.AddTransient<ISecurityService>(provider => Substitute.For<ISecurityService>());
        services.AddScoped<IRbacService>(provider => Substitute.For<IRbacService>());

        // Password hashing
        var mockPasswordHashing = Substitute.For<IPasswordHashingService>();
        mockPasswordHashing.HashPassword(Arg.Any<string>()).Returns("hashed_password");
        mockPasswordHashing.VerifyPassword(Arg.Any<string>(), Arg.Any<string>()).Returns(true);
        services.AddScoped<IPasswordHashingService>(_ => mockPasswordHashing);

        Console.WriteLine($"🔐 COMPREHENSIVE: Authentication services mocked");
    }

    private void MockBusinessServices(IServiceCollection services)
    {
        services.AddScoped<IUserProfileService>(provider => Substitute.For<IUserProfileService>());
        services.AddScoped<IOnboardingService>(provider => Substitute.For<IOnboardingService>());
        services.AddScoped<IStreamingServiceManagementService>(provider => Substitute.For<IStreamingServiceManagementService>());
        services.AddScoped<IEmailService>(provider => Substitute.For<IEmailService>());
        services.AddScoped<ILoggerService>(provider => Substitute.For<ILoggerService>());
        services.AddScoped<INotificationService>(provider => Substitute.For<INotificationService>());
        services.AddScoped<IImageService>(provider => Substitute.For<IImageService>());
        services.AddScoped<IBackupService>(provider => Substitute.For<IBackupService>());
        services.AddScoped<IDisasterRecoveryService>(provider => Substitute.For<IDisasterRecoveryService>());

        Console.WriteLine($"💼 COMPREHENSIVE: Business services mocked");
    }

    private void MockContentServices(IServiceCollection services)
    {
        // Simple service substitutes - let controllers handle the logic
        services.AddScoped<IContentService>(provider => Substitute.For<IContentService>());
        services.AddScoped<ISearchService>(provider => Substitute.For<ISearchService>());
        services.AddScoped<IAutocompleteService>(provider => Substitute.For<IAutocompleteService>());
        services.AddScoped<IAdvancedFilterService>(provider => Substitute.For<IAdvancedFilterService>());
        services.AddScoped<IContentLinkingService>(provider => Substitute.For<IContentLinkingService>());
        services.AddScoped<ILocalizedContentService>(provider => Substitute.For<ILocalizedContentService>());
        services.AddScoped<IPopularContentService>(provider => Substitute.For<IPopularContentService>());
        services.AddScoped<IDatabaseOptimizationService>(provider => Substitute.For<IDatabaseOptimizationService>());
        services.AddScoped<IProgressiveLoadingService>(provider => Substitute.For<IProgressiveLoadingService>());
        services.AddScoped<ICdnOptimizationService>(provider => Substitute.For<ICdnOptimizationService>());
        services.AddScoped<IAutoScalingService>(provider => Substitute.For<IAutoScalingService>());
        services.AddScoped<IPaywallService>(provider => Substitute.For<IPaywallService>());
        services.AddScoped<IRankingService>(provider => Substitute.For<IRankingService>());
        services.AddScoped<IFuzzyMatchingService>(provider => Substitute.For<IFuzzyMatchingService>());
        services.AddScoped<IABTestingService>(provider => Substitute.For<IABTestingService>());
        services.AddScoped<ISearchAnalyticsService>(provider => Substitute.For<ISearchAnalyticsService>());

        Console.WriteLine($"📚 COMPREHENSIVE: Content services mocked");
    }

    private void MockPaymentServices(IServiceCollection services)
    {
        // Configure Stripe client first
        RemoveService<Stripe.StripeClient>(services);
        services.AddSingleton<Stripe.StripeClient>(provider => 
        {
            var config = provider.GetService<IConfiguration>();
            var stripeSecretKey = config?["Stripe:SecretKey"] ?? "sk_test_51MockedStripeKey";
            return new Stripe.StripeClient(stripeSecretKey);
        });
        
        // Simple service substitutes - let controllers handle the logic
        services.AddScoped<IPaymentService>(provider => Substitute.For<IPaymentService>());
        services.AddScoped<IPaymentMethodService>(provider => Substitute.For<IPaymentMethodService>());
        services.AddScoped<ISubscriptionService>(provider => Substitute.For<ISubscriptionService>());
        services.AddScoped<ISubscriptionErrorHandlingService>(provider => Substitute.For<ISubscriptionErrorHandlingService>());
        services.AddScoped<ISubscriptionRecoveryService>(provider => Substitute.For<ISubscriptionRecoveryService>());
        services.AddScoped<ISubscriptionAnalyticsService>(provider => Substitute.For<ISubscriptionAnalyticsService>());
        services.AddScoped<ITaxCalculationService>(provider => Substitute.For<ITaxCalculationService>());
        services.AddScoped<IInvoicePdfService>(provider => Substitute.For<IInvoicePdfService>());
        services.AddScoped<IBillingAddressService>(provider => Substitute.For<IBillingAddressService>());
        services.AddScoped<IInvoiceDeliveryService>(provider => Substitute.For<IInvoiceDeliveryService>());
        services.AddScoped<IAccountingExportService>(provider => Substitute.For<IAccountingExportService>());
        services.AddScoped<IInvoiceService>(provider => Substitute.For<IInvoiceService>());
        services.AddScoped<IDunningService>(provider => Substitute.For<IDunningService>());
        
        // Stripe services with configuration
        services.AddScoped<Stripe.RefundService>(provider => 
        {
            var stripeClient = provider.GetRequiredService<Stripe.StripeClient>();
            return new Stripe.RefundService(stripeClient);
        });
        services.AddScoped<Stripe.PaymentMethodService>(provider => 
        {
            var stripeClient = provider.GetRequiredService<Stripe.StripeClient>();
            return new Stripe.PaymentMethodService(stripeClient);
        });
        services.AddScoped<Stripe.CustomerService>(provider => 
        {
            var stripeClient = provider.GetRequiredService<Stripe.StripeClient>();
            return new Stripe.CustomerService(stripeClient);
        });

        Console.WriteLine($"💳 COMPREHENSIVE: Payment services mocked");
    }

    private void MockSeoServices(IServiceCollection services)
    {
        services.AddScoped<ISeoMetadataService>(provider => Substitute.For<ISeoMetadataService>());
        services.AddScoped<IStructuredDataService>(provider => Substitute.For<IStructuredDataService>());
        services.AddScoped<ISitemapService>(provider => Substitute.For<ISitemapService>());
        services.AddScoped<IPerformanceMonitoringService>(provider => Substitute.For<IPerformanceMonitoringService>());
        services.AddScoped<ISeoAnalyticsService>(provider => Substitute.For<ISeoAnalyticsService>());
        services.AddScoped<ISeoContentCachingService>(provider => Substitute.For<ISeoContentCachingService>());
        services.AddScoped<ISocialSharingService>(provider => Substitute.For<ISocialSharingService>());
        services.AddScoped<IMetaTagGenerationService>(provider => Substitute.For<IMetaTagGenerationService>());
        services.AddScoped<IShareLinkService>(provider => Substitute.For<IShareLinkService>());
        services.AddScoped<ISocialSharingAnalyticsService>(provider => Substitute.For<ISocialSharingAnalyticsService>());

        Console.WriteLine($"🔍 COMPREHENSIVE: SEO services mocked");
    }

    private void MockExternalApiServices(IServiceCollection services)
    {
        services.AddScoped<IStreamingAvailabilityClient>(provider => Substitute.For<IStreamingAvailabilityClient>());
        services.AddScoped<ITmdbClient>(provider => Substitute.For<ITmdbClient>());
        services.AddScoped<IStreamingApiErrorHandler>(provider => Substitute.For<IStreamingApiErrorHandler>());
        services.AddScoped<IStreamingDataNormalizer>(provider => Substitute.For<IStreamingDataNormalizer>());
        services.AddScoped<IApiUsageTracker>(provider => Substitute.For<IApiUsageTracker>());
        services.AddScoped<IApiCostManager>(provider => Substitute.For<IApiCostManager>());
        services.AddScoped<IApiCostTracker>(provider => Substitute.For<IApiCostTracker>());
        services.AddScoped<IBudgetManager>(provider => Substitute.For<IBudgetManager>());
        services.AddScoped<IProviderCostCalculator>(provider => Substitute.For<IProviderCostCalculator>());
        services.AddScoped<ICostOptimizationEngine>(provider => Substitute.For<ICostOptimizationEngine>());

        Console.WriteLine($"🌐 COMPREHENSIVE: External API services mocked");
    }

    private void MockAdminServices(IServiceCollection services)
    {
        services.AddScoped<IAdminUserManagementService>(provider => Substitute.For<IAdminUserManagementService>());
        services.AddScoped<IAdminActionLogger>(provider => Substitute.For<IAdminActionLogger>());
        services.AddScoped<ISupportService>(provider => Substitute.For<ISupportService>());
        services.AddScoped<IBusinessMetricsService>(provider => Substitute.For<IBusinessMetricsService>());

        Console.WriteLine($"👑 COMPREHENSIVE: Admin services mocked");
    }

    private void MockValidationServices(IServiceCollection services)
    {
        services.AddScoped<IDataValidationService>(provider => Substitute.For<IDataValidationService>());
        services.AddScoped<IValidationRuleEngine>(provider => Substitute.For<IValidationRuleEngine>());
        services.AddScoped<IDataEnrichmentService>(provider => Substitute.For<IDataEnrichmentService>());
        services.AddScoped<IDataReconciliationService>(provider => Substitute.For<IDataReconciliationService>());
        services.AddScoped<IDataConsistencyChecker>(provider => Substitute.For<IDataConsistencyChecker>());
        services.AddSingleton<IQualityMetricsCollector>(provider => Substitute.For<IQualityMetricsCollector>());
        services.AddSingleton<IAlertingService>(provider => Substitute.For<IAlertingService>());
        
        // Data providers and transformation
        services.AddScoped<IProviderManager>(provider => Substitute.For<IProviderManager>());
        services.AddScoped<IProviderSelector>(provider => Substitute.For<IProviderSelector>());
        services.AddScoped<IDataTransformationService>(provider => Substitute.For<IDataTransformationService>());
        services.AddScoped<IContentDataService>(provider => Substitute.For<IContentDataService>());

        Console.WriteLine($"✅ COMPREHENSIVE: Validation services mocked");
    }

    private void DisableHostedServices(IServiceCollection services)
    {
        // Remove hosted services that consume resources in tests
        var hostedServices = services
            .Where(s => s.ServiceType == typeof(IHostedService))
            .ToList();
            
        foreach (var service in hostedServices)
        {
            services.Remove(service);
        }

        Console.WriteLine($"🛑 COMPREHENSIVE: Disabled {hostedServices.Count} hosted services");
    }

    private void ConfigureAuthServiceMock(IAuthService mockAuthService)
    {
        // Configure successful responses for all auth operations
        mockAuthService.RegisterAsync(Arg.Any<RegisterDto>(), Arg.Any<string>(), Arg.Any<string>())
            .Returns(Task.FromResult(new AuthResponseDto
            {
                Success = true,
                Message = "Registration successful",
                AccessToken = "test-access-token",
                RefreshToken = "test-refresh-token",
                TokenExpiration = DateTime.UtcNow.AddHours(1),
                User = new UserInfoDto
                {
                    Id = Guid.NewGuid(),
                    Email = "test@example.com",
                    FirstName = "Test",
                    LastName = "User"
                }
            }));

        mockAuthService.LoginAsync(Arg.Any<LoginDto>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>())
            .Returns(Task.FromResult(new AuthResponseDto
            {
                Success = true,
                Message = "Login successful",
                AccessToken = "test-access-token",
                RefreshToken = "test-refresh-token",
                TokenExpiration = DateTime.UtcNow.AddHours(1),
                User = new UserInfoDto
                {
                    Id = Guid.NewGuid(),
                    Email = "test@example.com",
                    FirstName = "Test",
                    LastName = "User"
                }
            }));

        mockAuthService.RefreshTokenAsync(Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>())
            .Returns(Task.FromResult<TokenResponseDto?>(new TokenResponseDto
            {
                AccessToken = "refreshed-access-token",
                RefreshToken = "refreshed-refresh-token",
                TokenExpiration = DateTime.UtcNow.AddHours(1)
            }));

        mockAuthService.LogoutAsync(Arg.Any<string>()).Returns(Task.FromResult(true));
    }


    private void RemoveService<T>(IServiceCollection services)
    {
        var descriptor = services.SingleOrDefault(d => d.ServiceType == typeof(T));
        if (descriptor != null)
            services.Remove(descriptor);
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            Console.WriteLine($"🗑️ COMPREHENSIVE: Disposing factory: {_databaseName}");
        }
        base.Dispose(disposing);
    }
}