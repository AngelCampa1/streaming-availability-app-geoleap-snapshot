using System.Net.Http.Headers;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using GeoLeap.Api.Data;
using GeoLeap.Api.Services;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services.ValidationServices;
using GeoLeap.Api.Services.GrowthAnalytics;
using GeoLeap.Api.Tests.Infrastructure.MockServices;
using GeoLeap.Api.Hubs;
using NSubstitute;
using StackExchange.Redis;

namespace GeoLeap.Api.Tests.Infrastructure;

/// <summary>
/// FIXED MINIMAL TEST BASE - Simplified to prevent test host crashes
/// Eliminates complex singleton pattern and excessive logging that were causing hangs
/// Uses standard WebApplicationFactory pattern with proper async handling
/// </summary>
public abstract class FixedMinimalTestBase : IDisposable
{
    protected readonly WebApplicationFactory<Program> Factory;
    protected readonly HttpClient Client;
    private bool _disposed = false;

    protected FixedMinimalTestBase()
    {
        // Use standard factory pattern - no singleton to prevent deadlocks
        Factory = new WebApplicationFactory<Program>()
            .WithWebHostBuilder(builder =>
            {
                builder.ConfigureServices(services =>
                {
                    // Configure database
                    var dbContextDescriptor = services.SingleOrDefault(d => d.ServiceType == typeof(DbContextOptions<ApplicationDbContext>));
                    if (dbContextDescriptor != null) services.Remove(dbContextDescriptor);
                    var applicationDbContextDescriptor = services.SingleOrDefault(d => d.ServiceType == typeof(ApplicationDbContext));
                    if (applicationDbContextDescriptor != null) services.Remove(applicationDbContextDescriptor);

                    services.AddDbContext<ApplicationDbContext>(options =>
                    {
                        options.UseInMemoryDatabase($"TestDb_{Guid.NewGuid()}");
                        options.EnableSensitiveDataLogging(false);
                    });

                    // Mock Redis
                    var mockRedis = Substitute.For<IDatabase>();
                    var mockConnectionMultiplexer = Substitute.For<IConnectionMultiplexer>();
                    mockConnectionMultiplexer.GetDatabase(Arg.Any<int>(), Arg.Any<object>()).Returns(mockRedis);
                    var redisDescriptor = services.SingleOrDefault(d => d.ServiceType == typeof(IConnectionMultiplexer));
                    if (redisDescriptor != null) services.Remove(redisDescriptor);
                    services.AddSingleton(mockConnectionMultiplexer);

                    // Essential service mocks only
                    var mockAuthService = Substitute.For<IAuthService>();
                    mockAuthService.RegisterAsync(Arg.Any<RegisterDto>(), Arg.Any<string>(), Arg.Any<string>())
                        .Returns(Task.FromResult(new AuthResponseDto { Success = true, Message = "Test registration" }));
                    mockAuthService.LoginAsync(Arg.Any<LoginDto>(), Arg.Any<string>(), Arg.Any<string>(), Arg.Any<string>())
                        .Returns(Task.FromResult(new AuthResponseDto { Success = true, Message = "Test login" }));
                    services.AddTransient<IAuthService>(_ => mockAuthService);

                    // Mock other essential services
                    services.AddTransient<ICircuitBreakerService>(_ => Substitute.For<ICircuitBreakerService>());
                    services.AddTransient<IRateLimitingService>(_ => Substitute.For<IRateLimitingService>());
                    services.AddTransient<ISecurityValidationService>(_ => Substitute.For<ISecurityValidationService>());
                    services.AddTransient<IDatabaseResilienceService>(_ => Substitute.For<IDatabaseResilienceService>());
                    services.AddTransient<IJwtTokenService>(_ => Substitute.For<IJwtTokenService>());
                    services.AddTransient<IEmailService>(_ => Substitute.For<IEmailService>());
                    services.AddTransient<INotificationService>(_ => Substitute.For<INotificationService>());
                    services.AddTransient<ICacheService>(_ => Substitute.For<ICacheService>());
                    services.AddTransient<ISearchService>(_ => Substitute.For<ISearchService>());
                    services.AddTransient<IContentService>(_ => Substitute.For<IContentService>());
                    services.AddTransient<IPaymentService>(_ => Substitute.For<IPaymentService>());
                    services.AddTransient<ISubscriptionService>(_ => Substitute.For<ISubscriptionService>());
                });

                // Set environment
                builder.UseSetting("environment", "Testing");
            });

        Client = Factory.CreateClient();
    }

    /// <summary>
    /// Set authentication header for tests that need it
    /// </summary>
    protected void SetAuthenticationHeader(string token = "test-user-token")
    {
        Client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", token);
    }

    /// <summary>
    /// Set admin authentication header
    /// </summary>
    protected void SetAdminAuthenticationHeader()
    {
        SetAuthenticationHeader("test-admin-token");
    }

    /// <summary>
    /// Clear authentication header
    /// </summary>
    protected void ClearAuthenticationHeader()
    {
        Client.DefaultRequestHeaders.Authorization = null;
    }

    public virtual void Dispose()
    {
        if (!_disposed)
        {
            _disposed = true;
            Client?.Dispose();
            Factory?.Dispose();
        }
    }
}