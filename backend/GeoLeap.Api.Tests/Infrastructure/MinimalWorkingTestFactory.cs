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
using GeoLeap.Api.Services.GrowthAnalytics;
using NSubstitute;
using StackExchange.Redis;

namespace GeoLeap.Api.Tests.Infrastructure;

/// <summary>
/// PERFORMANCE-OPTIMIZED Test Factory for MinimalTestBase
/// Uses the singleton MinimalWebApplicationFactory for maximum performance
/// Eliminates database creation overhead while maintaining test isolation
/// </summary>
public class MinimalWorkingTestFactory : IDisposable
{
    private readonly MinimalWebApplicationFactory _factory;
    private bool _disposed = false;

    public MinimalWorkingTestFactory()
    {
        Console.WriteLine($"⚡ PERFORMANCE: Creating MinimalWorkingTestFactory using singleton pattern");
        
        // Use the singleton factory for maximum performance
        _factory = MinimalWebApplicationFactory.Instance;
        
        Console.WriteLine($"✅ PERFORMANCE: MinimalWorkingTestFactory ready - using shared infrastructure");
    }

    public HttpClient CreateClient()
    {
        var client = _factory.CreateClient();
        Console.WriteLine($"🌐 PERFORMANCE: HTTP client created from shared factory");
        return client;
    }

    public IServiceProvider Services => _factory.Services;

    public void Dispose()
    {
        if (!_disposed)
        {
            _disposed = true;
            Console.WriteLine($"🧹 PERFORMANCE: MinimalWorkingTestFactory disposing (keeping shared factory alive)");
            
            // DO NOT dispose the singleton factory - let it stay alive for performance
            // The singleton will handle its own lifecycle
        }
    }
}