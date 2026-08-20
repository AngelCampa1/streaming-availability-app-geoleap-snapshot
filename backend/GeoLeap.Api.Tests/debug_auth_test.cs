using System.Net;
using System.Text.Json;
using Xunit;
using GeoLeap.Api.Tests.Infrastructure;

namespace GeoLeap.Api.Tests;

[Collection("NonParallel")]
public class DEBUG_AUTH_STATUS_TEST : StableTestBase
{
    [Fact]
    public async Task Debug_UserProfile_StatusCode()
    {
        // Test without auth
        var responseNoAuth = await Client.GetAsync("/api/user-profile");
        Console.WriteLine($"❌ No Auth Status: {responseNoAuth.StatusCode}");
        
        // Test with auth
        SetAuthenticationHeader("test-user-token");
        var responseWithAuth = await Client.GetAsync("/api/user-profile");
        Console.WriteLine($"✅ With Auth Status: {responseWithAuth.StatusCode}");
        
        // Always pass - this is just for debugging
        Assert.True(true);
    }
}