using System.Net;
using Xunit;
using GeoLeap.Api.Tests.Infrastructure;

namespace GeoLeap.Api.Tests;

/// <summary>
/// ULTRA STABLE Infrastructure Validation Test
/// Tests the StableTestBase to validate it resolves ServiceProvider disposal race conditions
/// </summary>
[Collection("NonParallel")]
public class ULTRA_STABLE_VALIDATION_TEST : StableTestBase
{

    [Fact]
    public async Task StableInfrastructure_HealthEndpoint_WorksWithoutDisposalIssues()
    {
        Console.WriteLine("🛡️ ULTRA STABLE TEST: Testing health endpoint with stable infrastructure");
        
        try
        {
            var response = await Client.GetAsync("/api/health");
            var content = await response.Content.ReadAsStringAsync();
            
            Console.WriteLine($"📊 Status: {response.StatusCode}");
            Console.WriteLine($"📊 Content Length: {content?.Length ?? 0}");
            
            // The key test: NO ServiceProvider disposal exceptions
            Assert.True(response.StatusCode != HttpStatusCode.InternalServerError,
                $"Health endpoint returned 500 error: {content}");
                
            Console.WriteLine("✅ ULTRA STABLE TEST: Health endpoint working without disposal issues");
        }
        catch (ObjectDisposedException ex)
        {
            Assert.Fail($"ServiceProvider disposal issue detected: {ex.Message}");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ Exception (not disposal related): {ex.GetType().Name}: {ex.Message}");
            throw;
        }
    }

    [Fact]
    public async Task StableInfrastructure_MultipleRequests_NoRaceConditions()
    {
        Console.WriteLine("🛡️ ULTRA STABLE TEST: Testing multiple requests for race conditions");
        
        var tasks = new List<Task<HttpStatusCode>>();
        
        for (int i = 0; i < 5; i++)
        {
            tasks.Add(Task.Run(async () =>
            {
                var response = await Client.GetAsync("/api/health");
                Console.WriteLine($"🔄 Request {i} completed with status: {response.StatusCode}");
                return response.StatusCode;
            }));
        }
        
        var results = await Task.WhenAll(tasks);
        
        // All requests should complete without disposal errors
        foreach (var statusCode in results)
        {
            Assert.True(statusCode != HttpStatusCode.InternalServerError,
                $"Request failed with {statusCode} - should not have disposal issues");
        }
        
        Console.WriteLine($"✅ ULTRA STABLE TEST: {results.Length} concurrent requests completed successfully");
    }
}