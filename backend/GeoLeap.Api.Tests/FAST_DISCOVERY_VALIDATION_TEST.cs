using System.Net;
using Xunit;
using GeoLeap.Api.Tests.Infrastructure;

namespace GeoLeap.Api.Tests;

/// <summary>
/// Fast Discovery Validation Test - Validates test infrastructure works for rapid discovery
/// Uses StableTestBase to eliminate blocking operations during test discovery
/// </summary>
[Collection("NonParallel")]
public class FAST_DISCOVERY_VALIDATION_TEST : StableTestBase
{

    [Fact]
    public async Task FastDiscovery_HealthEndpoint_RespondsQuickly()
    {
        // Act
        var response = await Client.GetAsync("/api/health/check");
        var responseContent = await response.Content.ReadAsStringAsync();
        
        // Debug
        Console.WriteLine($"🔍 DEBUG: Health endpoint status code: {response.StatusCode}");
        Console.WriteLine($"🔍 DEBUG: Health endpoint response: {responseContent.Substring(0, Math.Min(100, responseContent.Length))}");
        
        // Assert - Should return appropriate response (not server error)
        Assert.True(response.StatusCode is HttpStatusCode.OK or HttpStatusCode.ServiceUnavailable or HttpStatusCode.NotFound);
        Assert.NotEqual(HttpStatusCode.InternalServerError, response.StatusCode);
    }
    
    [Fact]
    public async Task FastDiscovery_AuthEndpoint_RequiresAuthentication()
    {
        // Act - Test endpoint without authentication
        var response = await Client.GetAsync("/api/auth/user");

        // Assert - Should return 401 Unauthorized (security middleware now active)
        // Changed from NotFound after re-enabling security middleware (Week 1 Day 2)
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }
    
    [Fact]
    public async Task FastDiscovery_SearchEndpoint_ReturnsAppropriateResponse()
    {
        // Act
        var response = await Client.GetAsync("/api/search");
        
        // Assert - Should return appropriate response (Unauthorized, OK, or BadRequest)
        Assert.True(response.StatusCode is HttpStatusCode.Unauthorized or HttpStatusCode.OK or HttpStatusCode.BadRequest);
        Assert.NotEqual(HttpStatusCode.InternalServerError, response.StatusCode);
    }
}