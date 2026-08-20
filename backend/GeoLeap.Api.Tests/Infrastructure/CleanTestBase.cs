using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace GeoLeap.Api.Tests.Infrastructure;

/// <summary>
/// Clean, minimal test base class that prevents hanging issues
/// Uses simplified factory and proper disposal patterns
/// </summary>
public abstract class CleanTestBase : IAsyncDisposable
{
    protected readonly CleanTestFactory Factory;
    protected readonly HttpClient Client;

    protected CleanTestBase()
    {
        Factory = new CleanTestFactory();
        Client = Factory.CreateClient();
        
        // Set default authentication header
        Client.DefaultRequestHeaders.Authorization = 
            new System.Net.Http.Headers.AuthenticationHeaderValue("Test", "token");
    }

    /// <summary>
    /// Get a service from the test container
    /// </summary>
    protected T GetService<T>() where T : notnull
    {
        return Factory.Services.GetRequiredService<T>();
    }

    /// <summary>
    /// Get a scoped service (creates a new scope)
    /// </summary>
    protected T GetScopedService<T>() where T : notnull
    {
        using var scope = Factory.Services.CreateScope();
        return scope.ServiceProvider.GetRequiredService<T>();
    }

    public virtual async ValueTask DisposeAsync()
    {
        Client?.Dispose();
        if (Factory != null)
            await Factory.DisposeAsync();
        GC.SuppressFinalize(this);
    }
}

/// <summary>
/// Collection definition to prevent parallel test execution which can cause hanging
/// </summary>
[CollectionDefinition("Sequential")]
public class SequentialCollection : ICollectionFixture<object>
{
}