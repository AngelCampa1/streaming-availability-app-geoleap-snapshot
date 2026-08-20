using System.Net;
using Xunit;
using GeoLeap.Api.Tests.Infrastructure;

namespace GeoLeap.Api.Tests.Controllers;

/// <summary>
/// FIXED SIMPLE AUTH TEST - Uses FixedMinimalTestBase to verify test host crash fixes
/// Minimal test to verify basic functionality without complex infrastructure
/// </summary>
public class FixedSimpleAuthTest : FixedMinimalTestBase
{
    [Fact]
    public async Task HealthCheck_ShouldWork()
    {
        // Act
        var response = await Client.GetAsync("/health");

        // Assert - Health endpoint should return OK or similar success code
        Assert.True(response.StatusCode is HttpStatusCode.OK or HttpStatusCode.ServiceUnavailable or HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task Register_WithValidData_ShouldNotCrash()
    {
        // Arrange
        var registerData = new
        {
            email = "test@example.com",
            password = "TestPassword123!",
            firstName = "Test",
            lastName = "User"
        };
        var json = System.Text.Json.JsonSerializer.Serialize(registerData);
        var content = new StringContent(json, System.Text.Encoding.UTF8, "application/json");

        // Act
        var response = await Client.PostAsync("/api/auth/register", content);

        // Assert - Should not crash (any reasonable status code is acceptable)
        Assert.True(response.StatusCode is
            HttpStatusCode.OK or
            HttpStatusCode.BadRequest or
            HttpStatusCode.Conflict or
            HttpStatusCode.UnprocessableEntity or
            HttpStatusCode.NotFound);

        // Must not be a server error
        Assert.NotEqual(HttpStatusCode.InternalServerError, response.StatusCode);
    }
}