using Xunit;
using GeoLeap.Api.Tests.Infrastructure;

namespace GeoLeap.Api.Tests;

/// <summary>
/// ULTRA MINIMAL TEST - Uses StableTestBase for reliable infrastructure
/// Updated from problematic WebApplicationFactory to proven stable approach
/// </summary>
[Collection("NonParallel")]
public class ULTRA_MINIMAL_TEST : StableTestBase
{
    [Fact]
    public void BasicTest_ShouldNotTimeout()
    {
        // Test that StableTestBase infrastructure works
        Assert.NotNull(Factory);
        Assert.NotNull(Client);
        
        Console.WriteLine("✅ ULTRA MINIMAL: StableTestBase infrastructure working perfectly");
    }
}