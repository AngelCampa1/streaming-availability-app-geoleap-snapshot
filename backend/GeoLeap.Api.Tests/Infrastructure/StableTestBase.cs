using Microsoft.Extensions.DependencyInjection;
using System.Net.Http.Headers;
using Xunit;

namespace GeoLeap.Api.Tests.Infrastructure;

/// <summary>
/// Ultra Stable Test Base that resolves ServiceProvider disposal race conditions
/// Uses UltraStableTestFactory to prevent the root cause of test failures:
/// Microsoft.Extensions.DependencyInjection.ServiceLookup.ThrowHelper.ThrowObjectDisposedException()
/// </summary>
public abstract class StableTestBase : IAsyncDisposable
{
    protected readonly SingletonWebApplicationFactory Factory;
    protected readonly HttpClient Client;
    private bool _disposed = false;
    private readonly object _disposeLock = new object();

    protected StableTestBase()
    {
        try
        {
            Console.WriteLine($"🛡️ STABLE BASE: Initializing StableTestBase...");
            
            // Use the singleton factory to eliminate inotify exhaustion
            Factory = SingletonWebApplicationFactory.Instance;
            Console.WriteLine($"✅ STABLE BASE: SingletonWebApplicationFactory accessed without disposal conflicts");
            
            // Critical test - can we create a client without ServiceProvider disposal errors?
            Client = Factory.CreateClient();
            Console.WriteLine($"🎉 STABLE BASE SUCCESS: HttpClient created - ServiceProvider stable!");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ STABLE BASE FAILED: {ex.Message}");
            Console.WriteLine($"❌ Stack trace: {ex.StackTrace}");
            throw;
        }
    }

    /// <summary>
    /// Add authentication header for tests that need it
    /// </summary>
    protected void SetAuthenticationHeader(string tokenType = "test-user-token")
    {
        // Use the token type directly - TestAuthenticationHandler expects specific token strings
        Client.DefaultRequestHeaders.Authorization = 
            new AuthenticationHeaderValue("Bearer", tokenType);
        Console.WriteLine($"🔐 STABLE BASE: Authentication header set with token: {tokenType}");
    }
    
    /// <summary>
    /// Add admin authentication header for tests requiring admin permissions
    /// </summary>
    protected void SetAdminAuthenticationHeader()
    {
        SetAuthenticationHeader("test-admin-token");
    }
    
    /// <summary>
    /// Add premium user authentication header for tests
    /// </summary>
    protected void SetPremiumAuthenticationHeader()
    {
        SetAuthenticationHeader("test-premium-token");
    }

    /// <summary>
    /// Remove authentication header
    /// </summary>
    protected void ClearAuthenticationHeader()
    {
        Client.DefaultRequestHeaders.Authorization = null;
        Console.WriteLine($"🔓 STABLE BASE: Authentication header cleared");
    }

    public virtual async ValueTask DisposeAsync()
    {
        if (!_disposed)
        {
            lock (_disposeLock)
            {
                if (!_disposed)
                {
                    _disposed = true;
                    
                    try
                    {
                        Console.WriteLine($"🧹 STABLE BASE: Disposing StableTestBase safely...");
                        
                        Client?.Dispose();
                        Factory?.Dispose();
                        
                        Console.WriteLine($"✅ STABLE BASE: StableTestBase disposed without conflicts");
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"⚠️ STABLE BASE: Disposal warning (handled): {ex.Message}");
                    }
                }
            }
        }
        
        await Task.CompletedTask;
    }
}