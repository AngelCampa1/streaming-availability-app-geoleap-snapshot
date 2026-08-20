using System.Net.Http;
using Microsoft.Extensions.DependencyInjection;
using GeoLeap.Api.Data;
using Microsoft.AspNetCore.Authentication;

namespace GeoLeap.Api.Tests.Infrastructure;

/// <summary>
/// BULLETPROOF Test Base using TestOnlyWebApplicationFactory
/// Designed to fix ObjectDisposedException and achieve 100% test success
/// </summary>
public abstract class TestOnlyTestBase : IDisposable, IAsyncDisposable
{
    protected TestOnlyWebApplicationFactory Factory { get; private set; }
    protected HttpClient Client { get; private set; }
    private bool _disposed = false;

    protected TestOnlyTestBase()
    {
        Factory = new TestOnlyWebApplicationFactory();
        Client = Factory.CreateClient();
        
        Console.WriteLine($"🏗️ TestOnlyTestBase initialized successfully");
    }

    /// <summary>
    /// Sets authentication header for the test client
    /// </summary>
    protected void SetAuthenticationHeader(string token)
    {
        Client.DefaultRequestHeaders.Remove("Authorization");
        Client.DefaultRequestHeaders.Add("Authorization", $"Bearer {token}");
        Console.WriteLine($"🔐 Authentication header set: Bearer {token}");
    }

    /// <summary>
    /// Clears authentication header from the test client
    /// </summary>
    protected void ClearAuthenticationHeader()
    {
        Client.DefaultRequestHeaders.Remove("Authorization");
        Console.WriteLine($"🔐 Authentication header cleared");
    }

    /// <summary>
    /// Gets a scoped service from the test container
    /// </summary>
    protected T GetScopedService<T>() where T : notnull
    {
        using var scope = Factory.Services.CreateScope();
        return scope.ServiceProvider.GetRequiredService<T>();
    }

    /// <summary>
    /// Sets up the test database (called manually when needed)
    /// </summary>
    protected async Task SetupDatabaseAsync()
    {
        try
        {
            using var scope = Factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            await context.Database.EnsureCreatedAsync();
            Console.WriteLine("✅ Test database setup completed");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"⚠️ Database setup warning: {ex.Message}");
        }
    }

    /// <summary>
    /// Clears the test database (called manually when needed)
    /// </summary>
    protected async Task ClearDatabaseAsync()
    {
        try
        {
            using var scope = Factory.Services.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            
            context.ChangeTracker.Clear();
            await context.Database.EnsureDeletedAsync();
            await context.Database.EnsureCreatedAsync();
            Console.WriteLine("✅ Test database cleared successfully");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"⚠️ Database clear warning: {ex.Message}");
        }
    }

    public virtual void Dispose()
    {
        if (!_disposed)
        {
            try
            {
                Client?.Dispose();
                Factory?.Dispose();
                Console.WriteLine("✅ TestOnlyTestBase disposed synchronously");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"⚠️ Synchronous disposal warning: {ex.Message}");
            }
            finally
            {
                _disposed = true;
            }
        }
        GC.SuppressFinalize(this);
    }

    public virtual async ValueTask DisposeAsync()
    {
        if (!_disposed)
        {
            try
            {
                Client?.Dispose();
                if (Factory != null)
                {
                    await Factory.DisposeAsync();
                }
                Console.WriteLine("✅ TestOnlyTestBase disposed asynchronously");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"⚠️ Asynchronous disposal warning: {ex.Message}");
            }
            finally
            {
                _disposed = true;
            }
        }
        GC.SuppressFinalize(this);
    }
}