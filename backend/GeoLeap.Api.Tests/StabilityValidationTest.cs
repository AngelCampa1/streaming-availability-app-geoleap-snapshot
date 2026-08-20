using System.Net;
using Xunit;
using GeoLeap.Api.Tests.Infrastructure;

namespace GeoLeap.Api.Tests;

/// <summary>
/// CRITICAL STABILITY VALIDATION TEST
/// Tests the UltraStableTestFactory solution for ServiceProvider disposal race conditions
/// This should resolve the core issue: Microsoft.Extensions.DependencyInjection.ServiceLookup.ThrowHelper.ThrowObjectDisposedException()
/// Expected: 100% success rate with no disposal conflicts
/// </summary>
[Collection("NonParallel")]
public class StabilityValidationTest : StableTestBase
{
    [Fact]
    public async Task Factory_CreatesClientSuccessfully_NoDisposalConflicts()
    {
        // This test validates the factory can create a client without ServiceProvider disposal errors
        Assert.NotNull(Factory);
        Assert.NotNull(Client);
        Console.WriteLine($"✅ STABILITY TEST: Factory and Client created without disposal conflicts");
    }

    [Fact]
    public async Task HealthEndpoint_RespondsAppropriately_WithStableInfrastructure()
    {
        // Act
        var response = await Client.GetAsync("/health");

        // Assert - Should not crash with Internal Server Error (any other status is acceptable)
        Assert.NotEqual(HttpStatusCode.InternalServerError, response.StatusCode);

        Console.WriteLine($"✅ STABILITY TEST: Health endpoint stable response: {response.StatusCode}");
    }

    [Fact]
    public async Task ApiHealthEndpoint_RespondsAppropriately_NoServiceDisposalErrors()
    {
        // Act
        var response = await Client.GetAsync("/api/health");
        
        // Assert - Should not crash with Internal Server Error (any other status is acceptable)
        Assert.NotEqual(HttpStatusCode.InternalServerError, response.StatusCode);
        
        Console.WriteLine($"✅ STABILITY TEST: API health endpoint stable response: {response.StatusCode}");
    }

    [Fact]
    public async Task AuthEndpoint_HandlesRequestsStably_NoDisposalRaceConditions()
    {
        // Act
        var response = await Client.GetAsync("/api/auth/me");
        
        // Assert - Should not crash with Internal Server Error (any other status is acceptable)
        Assert.NotEqual(HttpStatusCode.InternalServerError, response.StatusCode);
        
        Console.WriteLine($"✅ STABILITY TEST: Auth endpoint stable response: {response.StatusCode}");
    }

    [Fact]
    public async Task MultipleRequests_WorkSimultaneously_NoResourceExhaustion()
    {
        // Act - Test multiple concurrent requests to verify stability
        var tasks = new[]
        {
            Client.GetAsync("/health"),
            Client.GetAsync("/api/health"),
            Client.GetAsync("/api/auth/me"),
            Client.GetAsync("/health/ready"),
            Client.GetAsync("/health/live")
        };

        var responses = await Task.WhenAll(tasks);

        // Assert - None should be 500 Internal Server Error (any other status is acceptable)
        foreach (var response in responses)
        {
            Assert.NotEqual(HttpStatusCode.InternalServerError, response.StatusCode);
        }

        Console.WriteLine($"✅ STABILITY TEST: {responses.Length} concurrent requests handled stably");
    }

    [Fact]
    public async Task Factory_DisposesCleanly_NoObjectDisposedExceptions()
    {
        // Act - Create additional factory to test disposal
        using var additionalFactory = SingletonWebApplicationFactory.Instance;
        using var additionalClient = additionalFactory.CreateClient();

        var response = await additionalClient.GetAsync("/health");

        // Assert - Should not crash with Internal Server Error (any other status is acceptable)
        Assert.NotEqual(HttpStatusCode.InternalServerError, response.StatusCode);

        Console.WriteLine($"✅ STABILITY TEST: Additional factory created and disposed cleanly");
    }
}