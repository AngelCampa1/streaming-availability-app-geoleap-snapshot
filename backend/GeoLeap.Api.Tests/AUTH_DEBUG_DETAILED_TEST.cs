using System.Net;
using System.Text.Json;
using Xunit;
using GeoLeap.Api.Tests.Infrastructure;

namespace GeoLeap.Api.Tests;

/// <summary>
/// DETAILED AUTH DEBUG TEST to capture exact auth endpoint error
/// </summary>
[Collection("NonParallel")]
public class AUTH_DEBUG_DETAILED_TEST : StableTestBase
{
    [Fact]
    public async Task AuthEndpoint_DebugExactError_WithDetailedLogging()
    {
        Console.WriteLine("🔍 DETAILED AUTH DEBUG: Testing /api/auth/register with full error capture");
        
        // Arrange
        var registerData = new
        {
            email = "test@example.com", 
            password = "TestPassword123!",
            firstName = "Test",
            lastName = "User"
        };
        var jsonContent = JsonSerializer.Serialize(registerData);
        var httpContent = new StringContent(jsonContent, System.Text.Encoding.UTF8, "application/json");
        
        // Act
        var response = await Client.PostAsync("/api/auth/register", httpContent);
        var responseContent = await response.Content.ReadAsStringAsync();
        
        // Debug output
        Console.WriteLine($"📊 Status Code: {response.StatusCode}");
        Console.WriteLine($"📊 Full Response: {responseContent}");
        Console.WriteLine($"📊 Response Headers: {string.Join(", ", response.Headers.Select(h => $"{h.Key}={string.Join(",", h.Value)}"))}");
        
        if (response.StatusCode == HttpStatusCode.InternalServerError && responseContent.Contains("correlationId"))
        {
            try
            {
                var errorObject = JsonDocument.Parse(responseContent);
                Console.WriteLine($"🔍 CorrelationId: {errorObject.RootElement.GetProperty("correlationId").GetString()}");
                Console.WriteLine($"🔍 TraceId: {errorObject.RootElement.GetProperty("traceId").GetString()}");
                Console.WriteLine($"🔍 Timestamp: {errorObject.RootElement.GetProperty("timestamp").GetString()}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"⚠️ Could not parse structured error: {ex.Message}");
            }
        }
        
        // For debugging - don't fail the test, just log results
        Console.WriteLine($"✅ Auth debug test completed - Status: {response.StatusCode}");
    }
}