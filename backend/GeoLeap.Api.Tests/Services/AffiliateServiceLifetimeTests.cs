using System;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using GeoLeap.Api.Data;
using GeoLeap.Api.Services;
using Xunit;

namespace GeoLeap.Api.Tests.Services;

/// <summary>
/// Regression guard for the DI lifetime of <see cref="IAffiliateService"/>.
///
/// Program.cs registers <c>IDbContextFactory&lt;ApplicationDbContext&gt;</c> as a Scoped
/// service. <see cref="AffiliateService"/> consumes that factory, so it MUST be registered
/// Scoped (or Transient). Registering it as a Singleton makes a singleton consume a scoped
/// service, which the ASP.NET Core DI container rejects via scope validation
/// (ValidateScopes / ValidateOnBuild are enabled by the host in Development). That failure
/// previously prevented the API from booting locally in the Development environment.
/// </summary>
public class AffiliateServiceLifetimeTests
{
    private static ServiceCollection BuildBaseServices()
    {
        var services = new ServiceCollection();

        // Mirror the production registration: the DbContext factory is Scoped.
        services.AddDbContextFactory<ApplicationDbContext>(
            options => options.UseInMemoryDatabase($"AffiliateLifetimeTestDb_{Guid.NewGuid()}"),
            ServiceLifetime.Scoped);
        services.AddLogging();

        return services;
    }

    [Fact]
    public async Task AffiliateService_RegisteredScoped_PassesScopeValidation()
    {
        var services = BuildBaseServices();
        services.AddScoped<IAffiliateService, AffiliateService>();

        // Build with the same validation the Development host applies.
        // AffiliateService is IAsyncDisposable, so dispose the provider/scope asynchronously.
        await using var provider = services.BuildServiceProvider(new ServiceProviderOptions
        {
            ValidateScopes = true,
            ValidateOnBuild = true,
        });

        await using var scope = provider.CreateAsyncScope();
        var resolved = scope.ServiceProvider.GetRequiredService<IAffiliateService>();

        Assert.NotNull(resolved);
        Assert.IsType<AffiliateService>(resolved);
    }

    [Fact]
    public void AffiliateService_RegisteredSingleton_FailsScopeValidation()
    {
        // Documents the original bug: a Singleton cannot consume the Scoped
        // IDbContextFactory, so building the provider with validation must throw.
        var services = BuildBaseServices();
        services.AddSingleton<IAffiliateService, AffiliateService>();

        // ValidateOnBuild surfaces every validation failure wrapped in an AggregateException.
        var aggregate = Assert.Throws<AggregateException>(() =>
            services.BuildServiceProvider(new ServiceProviderOptions
            {
                ValidateScopes = true,
                ValidateOnBuild = true,
            }));

        // The underlying failure is a scope violation: the singleton AffiliateService
        // cannot consume the scoped IDbContextFactory. Assert on the inner exception so the
        // test fails loudly if some unrelated validation error ever masks this regression.
        var inner = Assert.IsType<InvalidOperationException>(Assert.Single(aggregate.InnerExceptions));
        Assert.Contains(nameof(AffiliateService), inner.Message);
        Assert.Contains("scoped", inner.Message, StringComparison.OrdinalIgnoreCase);
    }
}
