using Xunit;

namespace GeoLeap.Api.Tests;

/// <summary>
/// Minimal Discovery Test - Validates xUnit discovery works without dependencies
/// This test has zero dependencies and should always work for discovery validation
/// </summary>
public class MINIMAL_DISCOVERY_TEST
{
    [Fact]
    public void Discovery_Should_Find_This_Test()
    {
        // This test validates that xUnit can discover tests
        Assert.True(true, "If this test is discovered and runs, discovery is working");
    }
    
    [Fact]
    public void Discovery_Mathematical_Operation_Works()
    {
        // Simple test that requires no external dependencies
        var result = 2 + 2;
        Assert.Equal(4, result);
    }
    
    [Fact] 
    public void Discovery_String_Operations_Work()
    {
        // Another simple test with no dependencies
        var text = "Hello World";
        Assert.Contains("World", text);
    }
}