using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using System.Security.Claims;
using System.Text.Encodings.Web;
using System.Net;
using Xunit;

namespace GeoLeap.Api.Tests.Templates;

/// <summary>
/// Simple authentication test template - copy-paste ready
/// Single auth handler for testing protected endpoints
/// </summary>
public class SimpleAuthTest : SimpleTestBase
{
    private HttpClient CreateAuthenticatedClient(string role = "User")
    {
        var client = CreateClient();
        
        // Add authorization header for test auth handler
        client.DefaultRequestHeaders.Authorization = 
            new System.Net.Http.Headers.AuthenticationHeaderValue("Test", role);
        
        return client;
    }

    [Fact]
    public async Task ProtectedEndpoint_WithoutAuth_ReturnsUnauthorized()
    {
        // Arrange
        using var client = CreateClient();

        // Act
        var response = await client.GetAsync("/api/protected");

        // Assert
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task ProtectedEndpoint_WithAuth_ReturnsSuccess()
    {
        // Arrange
        using var client = CreateAuthenticatedClient();

        // Act
        var response = await client.GetAsync("/api/protected");

        // Assert
        response.EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task AdminEndpoint_WithUserRole_ReturnsForbidden()
    {
        // Arrange
        using var client = CreateAuthenticatedClient("User");

        // Act
        var response = await client.GetAsync("/api/admin");

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public async Task AdminEndpoint_WithAdminRole_ReturnsSuccess()
    {
        // Arrange
        using var client = CreateAuthenticatedClient("Admin");

        // Act
        var response = await client.GetAsync("/api/admin");

        // Assert
        response.EnsureSuccessStatusCode();
    }

    [Fact]
    public async Task Login_WithValidCredentials_ReturnsToken()
    {
        // Arrange
        using var client = CreateClient();
        var loginData = new 
        { 
            Email = "test@example.com",
            Password = "Test123!" 
        };

        // Act
        var response = await client.PostAsync("/api/auth/login", JsonContent(loginData));

        // Assert
        response.EnsureSuccessStatusCode();
        
        var result = await DeserializeResponse<dynamic>(response);
        Assert.NotNull(result.token);
    }
}

/// <summary>
/// Simple test authentication handler
/// Add this to your SimpleWebApplicationFactory in ConfigureServices:
/// 
/// services.AddAuthentication("Test")
///     .AddScheme<TestAuthenticationSchemeOptions, TestAuthenticationHandler>(
///         "Test", options => {});
/// </summary>
public class TestAuthenticationHandler : AuthenticationHandler<TestAuthenticationSchemeOptions>
{
    public TestAuthenticationHandler(IOptionsMonitor<TestAuthenticationSchemeOptions> options,
        ILoggerFactory logger, UrlEncoder encoder, ISystemClock clock)
        : base(options, logger, encoder, clock)
    {
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var authHeader = Request.Headers["Authorization"].ToString();
        
        if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Test "))
        {
            return Task.FromResult(AuthenticateResult.NoResult());
        }

        var role = authHeader.Substring("Test ".Length);
        
        var claims = new[]
        {
            new Claim(ClaimTypes.Name, "TestUser"),
            new Claim(ClaimTypes.Email, "test@example.com"),
            new Claim(ClaimTypes.Role, role)
        };

        var identity = new ClaimsIdentity(claims, "Test");
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, "Test");

        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}

public class TestAuthenticationSchemeOptions : AuthenticationSchemeOptions { }

/*
HOW TO USE THIS TEMPLATE:

1. Copy this file to your test project
2. Add the TestAuthenticationHandler to your SimpleWebApplicationFactory:

   services.AddAuthentication("Test")
       .AddScheme<TestAuthenticationSchemeOptions, TestAuthenticationHandler>(
           "Test", options => {});

3. Update endpoint URLs to match your protected routes
4. Add more roles and claims as needed for your tests

COMMON AUTH TEST PATTERNS:
- Test unauthorized access returns 401
- Test forbidden access returns 403
- Test successful authentication
- Test role-based authorization
- Test JWT token generation/validation
*/