using Microsoft.Extensions.DependencyInjection;
using System.Net.Http.Headers;

namespace GeoLeap.Api.Tests.Infrastructure;

/// <summary>
/// .NET 9 Compatible Test Base for Minimal APIs
/// Uses Net9WebApplicationFactory to resolve "server has not been started" issues
/// Should work with top-level statements and Program class entry points
/// </summary>
public abstract class Net9TestBase : IAsyncDisposable
{
    protected readonly SingletonWebApplicationFactory Factory;
    protected readonly HttpClient Client;
    private bool _disposed = false;

    protected Net9TestBase()
    {
        try
        {
            Console.WriteLine($"🎯 .NET 9 BASE: Initializing Net9TestBase...");
            
            Factory = SingletonWebApplicationFactory.Instance;
            Console.WriteLine($"✅ .NET 9 BASE: Net9WebApplicationFactory created");
            
            // This is the critical test - can we create a client without "server has not been started" error?
            Client = Factory.CreateClient();
            Console.WriteLine($"🎉 .NET 9 SUCCESS: HttpClient created successfully - TestServer.Application should not be NULL!");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ .NET 9 BASE FAILED: {ex.Message}");
            Console.WriteLine($"❌ Stack trace: {ex.StackTrace}");
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
        Console.WriteLine($"🔐 .NET 9 BASE: Authentication header set");
    }

    /// <summary>
    /// Remove authentication header
    /// </summary>
    protected void ClearAuthenticationHeader()
    {
        Client.DefaultRequestHeaders.Authorization = null;
        Console.WriteLine($"🔓 .NET 9 BASE: Authentication header cleared");
    }

    public virtual async ValueTask DisposeAsync()
    {
        if (_disposed)
            return;
            
        _disposed = true;
        
        try
        {
            Console.WriteLine($"🧹 .NET 9 BASE: Disposing Net9TestBase...");
            
            Client?.Dispose();
            Factory?.Dispose();
            
            Console.WriteLine($"✅ .NET 9 BASE: StableTestBase disposed cleanly");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"⚠️ .NET 9 BASE: Disposal warning: {ex.Message}");
        }
        
        await Task.CompletedTask;
    }
}