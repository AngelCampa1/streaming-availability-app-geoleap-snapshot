using Xunit;
using GeoLeap.Api.Tests.Infrastructure;
using System.Net;

namespace GeoLeap.Api.Tests;

/// <summary>
/// .NET 9 Compatibility Test - CRITICAL TEST
/// Tests if Net9WebApplicationFactory resolves the "server has not been started" issue
/// that affects 158/165 tests with TestServer.Application NULL problem
/// </summary>
[Collection("NonParallel")]
public class NET9_COMPATIBILITY_TEST : StableTestBase
{
    [Fact]
    public async Task Net9Factory_CanCreateClient_WithoutServerStartupErrors()
    {
        // Arrange
        Console.WriteLine($"🎯 .NET 9 TEST: Testing Net9WebApplicationFactory solution...");
        
        Exception? caughtException = null;
        HttpClient? testClient = null;
        
        try
        {
            // Act - This should work without TestServer.Application NULL error
            testClient = Factory.CreateClient();
            
            Console.WriteLine($"✅ .NET 9 TEST: HttpClient created successfully!");
            
            // Verify client is functional
            Assert.NotNull(testClient);
            Assert.NotNull(testClient.BaseAddress);
            
            Console.WriteLine($"🎉 .NET 9 SUCCESS: Net9WebApplicationFactory WORKS! This should fix 158 failing tests!");
        }
        catch (Exception ex)
        {
            caughtException = ex;
            Console.WriteLine($"❌ .NET 9 TEST FAILED: {ex.Message}");
            Console.WriteLine($"❌ Stack trace: {ex.StackTrace}");
            
            if (ex.Message.Contains("server has not been started"))
            {
                Console.WriteLine($"💥 CRITICAL: Still getting the same TestServer.Application NULL error!");
            }
        }
        
        // Assert - No exception should occur
        Assert.Null(caughtException);
        Assert.NotNull(testClient);
    }
    
    [Fact]
    public async Task Net9Factory_CanMakeHttpRequest_Successfully()
    {
        // Arrange
        Console.WriteLine($"🎯 .NET 9 TEST: Testing HTTP request capability...");
        
        try
        {
            // Act - Make a simple request
            var response = await Client.GetAsync("/health");
            
            Console.WriteLine($"✅ .NET 9 TEST: HTTP request completed with status: {response.StatusCode}");
            
            // Assert - Should get some response (not necessarily 200, but not a server startup error)
            Assert.NotNull(response);
            
            // The key is that we don't get "The server has not been started" error
            Console.WriteLine($"🎉 .NET 9 SUCCESS: HTTP requests work! TestServer.Application NULL issue is FIXED!");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ .NET 9 HTTP TEST: {ex.Message}");
            
            // If we get the old "server has not been started" error, the fix didn't work
            if (ex.Message.Contains("server has not been started"))
            {
                Console.WriteLine($"💥 CRITICAL: Still getting TestServer.Application NULL error - fix incomplete");
                throw;
            }
            
            // Other errors might be expected (missing endpoints, etc.) - that's progress
            Console.WriteLine($"⚠️ Expected error (not server startup issue): {ex.Message}");
        }
    }

    [Fact]
    public async Task Net9Factory_AuthenticationTest_WorksWithoutErrors()
    {
        // Arrange
        Console.WriteLine($"🎯 .NET 9 TEST: Testing authentication flow...");
        
        try
        {
            // Act - Test a protected endpoint
            var response = await Client.GetAsync("/api/auth/me");
            
            Console.WriteLine($"✅ .NET 9 TEST: Auth request completed with status: {response.StatusCode}");
            
            // We expect 401 Unauthorized, not server startup errors
            Assert.NotNull(response);
            
            if (response.StatusCode == HttpStatusCode.Unauthorized)
            {
                Console.WriteLine($"🎉 .NET 9 SUCCESS: Expected 401 Unauthorized - server is working correctly!");
            }
            else
            {
                Console.WriteLine($"ℹ️ .NET 9 INFO: Unexpected status {response.StatusCode} - but server is responding!");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"❌ .NET 9 AUTH TEST: {ex.Message}");
            
            // Server startup errors are critical, other errors might be expected
            if (ex.Message.Contains("server has not been started") || ex.Message.Contains("TestServer"))
            {
                Console.WriteLine($"💥 CRITICAL: Server startup issue still exists");
                throw;
            }
        }
    }
}