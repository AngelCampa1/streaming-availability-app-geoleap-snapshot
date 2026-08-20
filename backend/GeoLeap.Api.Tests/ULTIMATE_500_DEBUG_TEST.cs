using System.Net;
using System.Text.Json;
using Xunit;
using GeoLeap.Api.Tests.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using StackExchange.Redis;

namespace GeoLeap.Api.Tests;

/// <summary>
/// ULTIMATE DEBUG TEST to capture the EXACT exception causing HTTP 500 errors
/// This will tell us exactly what's failing so we can fix it immediately
/// </summary>
[Collection("NonParallel")]
public class ULTIMATE_500_DEBUG_TEST : StableTestBase
{
    [Fact]
    public async Task CaptureExactExceptionCausingHTTP500()
    {
        Console.WriteLine("🔍 ULTIMATE DEBUG TEST - Capturing exact 500 error details");
        
        try
        {
            // Test the simplest endpoint to capture exact error
            var response = await Client.GetAsync("/api/health");
            var content = await response.Content.ReadAsStringAsync();
            
            Console.WriteLine($"📊 Response Status: {response.StatusCode}");
            Console.WriteLine($"📊 Response Content: {content}");
            Console.WriteLine($"📊 Response Headers: {string.Join(", ", response.Headers.Select(h => $"{h.Key}={string.Join(",", h.Value)}"))}");
            
            // Check if response contains any exception details
            if (content.Contains("Exception") || content.Contains("Error"))
            {
                Console.WriteLine($"❌ EXACT ERROR CAPTURED: {content}");
                
                try
                {
                    // Try to parse as JSON to get structured error details
                    var errorObject = JsonDocument.Parse(content);
                    Console.WriteLine($"🔍 Structured Error: {errorObject.RootElement}");
                }
                catch
                {
                    Console.WriteLine($"🔍 Raw Error (not JSON): {content}");
                }
            }
            
            // Additional debugging - check if specific services are working
            await DebugServiceResolution();
            
            Assert.True(response.StatusCode == HttpStatusCode.OK, 
                $"EXPECTED: OK (200), ACTUAL: {response.StatusCode} - Content: {content}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ EXCEPTION DURING TEST: {ex.GetType().Name}: {ex.Message}");
            Console.WriteLine($"❌ STACK TRACE: {ex.StackTrace}");
            throw;
        }
    }
    
    [Fact]
    public async Task DebugServiceResolution()
    {
        Console.WriteLine("🔧 DEBUGGING: Service resolution issues...");
        
        try
        {
            // Check Redis service
            using var scope = Factory.Services.CreateScope();
            var redis = scope.ServiceProvider.GetService<IConnectionMultiplexer>();
            Console.WriteLine($"🔍 Redis Service: {(redis != null ? "✅ Available" : "❌ NULL")}");
            
            if (redis != null)
            {
                Console.WriteLine($"🔍 Redis IsConnected: {redis.IsConnected}");
                Console.WriteLine($"🔍 Redis Type: {redis.GetType().FullName}");
            }
            
            // Check logger
            var logger = scope.ServiceProvider.GetService<ILogger<ULTIMATE_500_DEBUG_TEST>>();
            Console.WriteLine($"🔍 Logger Service: {(logger != null ? "✅ Available" : "❌ NULL")}");
            
            // Check database context
            var dbContext = scope.ServiceProvider.GetService<GeoLeap.Api.Data.ApplicationDbContext>();
            Console.WriteLine($"🔍 DbContext Service: {(dbContext != null ? "✅ Available" : "❌ NULL")}");
            
            Console.WriteLine("✅ Service resolution debugging complete");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ SERVICE RESOLUTION ERROR: {ex.GetType().Name}: {ex.Message}");
        }
    }
    
    [Fact]
    public async Task TestAllBasicEndpoints()
    {
        Console.WriteLine("🔍 Testing all basic endpoints to identify patterns...");
        
        var endpoints = new[]
        {
            "/api/health",
            "/api/health/live", 
            "/api/test/health",
            "/"
        };
        
        foreach (var endpoint in endpoints)
        {
            try
            {
                Console.WriteLine($"🔍 Testing endpoint: {endpoint}");
                var response = await Client.GetAsync(endpoint);
                var content = await response.Content.ReadAsStringAsync();
                
                Console.WriteLine($"   📊 {endpoint} -> {response.StatusCode}");
                if (response.StatusCode != HttpStatusCode.OK)
                {
                    Console.WriteLine($"   📊 Error Content: {content.Substring(0, Math.Min(200, content.Length))}...");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"   ❌ {endpoint} -> Exception: {ex.Message}");
            }
        }
    }
}