using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;

namespace GeoLeap.Api.Tests.Infrastructure;

public class TestAuthenticationHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public const string DefaultScheme = "Test";
    
    public TestAuthenticationHandler(IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger, UrlEncoder encoder)
        : base(options, logger, encoder)
    {
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        try
        {
            // CRITICAL FIX: Defensive programming for disposal scenarios
            if (Request?.Headers == null || Context?.RequestServices == null)
            {
                return Task.FromResult(AuthenticateResult.Fail("Request context unavailable"));
            }

            // Get authentication data with null checks
            var authHeader = Request.Headers.Authorization.FirstOrDefault();
            var testAuth = Request.Headers["X-Test-Auth"].FirstOrDefault();
            
            // Check endpoint authorization requirements
            var endpoint = Request.HttpContext.GetEndpoint();
            var allowAnonymous = endpoint?.Metadata?.GetMetadata<Microsoft.AspNetCore.Authorization.AllowAnonymousAttribute>() != null;
            var hasCustomAuth = endpoint?.Metadata?.GetMetadata<GeoLeap.Api.Attributes.RequirePermissionAttribute>() != null;
            var hasAuthorize = endpoint?.Metadata?.GetMetadata<Microsoft.AspNetCore.Authorization.AuthorizeAttribute>() != null;
            
            // CRITICAL FIX: For AllowAnonymous endpoints, provide anonymous authentication
            if (allowAnonymous)
            {
                // For anonymous endpoints, we should not authenticate at all
                // This allows the request to pass through without any auth checks
                Logger.LogDebug("AllowAnonymous endpoint detected for {Path}, skipping authentication", Request.Path);
                return Task.FromResult(AuthenticateResult.NoResult());
            }
            
            // Check controller-level authorization
            bool controllerRequiresAuth = false;
            var controllerActionDescriptor = Request.HttpContext.GetEndpoint()?.Metadata
                ?.GetMetadata<Microsoft.AspNetCore.Mvc.Controllers.ControllerActionDescriptor>();
                
            if (controllerActionDescriptor != null)
            {
                var controllerType = controllerActionDescriptor.ControllerTypeInfo;
                controllerRequiresAuth = controllerType.GetCustomAttributes(typeof(Microsoft.AspNetCore.Authorization.AuthorizeAttribute), true).Any();
            }
            
            // CRITICAL FIX: For endpoints that require authentication but have no auth header, FAIL with 401
            bool requiresAuthentication = hasCustomAuth || hasAuthorize || controllerRequiresAuth;
            
            if (requiresAuthentication && string.IsNullOrEmpty(authHeader) && string.IsNullOrEmpty(testAuth))
            {
                Logger.LogDebug("Authentication required but no auth header provided for {Path}", Request.Path);
                return Task.FromResult(AuthenticateResult.Fail("Authentication required"));
            }
            
            // If no auth required and no auth provided, allow through
            if (!requiresAuthentication && string.IsNullOrEmpty(authHeader) && string.IsNullOrEmpty(testAuth))
            {
                return Task.FromResult(AuthenticateResult.NoResult());
            }

            // Extract token from Bearer header or use test auth
            var token = authHeader?.StartsWith("Bearer ") == true ? authHeader.Substring(7) : authHeader;
            
            // Handle case where token is empty or just whitespace
            if (string.IsNullOrWhiteSpace(token) && string.IsNullOrWhiteSpace(testAuth))
            {
                return Task.FromResult(AuthenticateResult.Fail("Invalid authentication token"));
            }
            
            // Determine user based on token type
            Guid testUserId;
            string userEmail;
            string userRole;
            string userTier;

            if (token == "test-admin-token")
            {
                // Admin user with well-known ID
                testUserId = Guid.Parse("11111111-1111-1111-1111-111111111111");
                userEmail = "admin@test.com";
                userRole = "Admin";
                userTier = "Admin";
                
                // Debug logging for admin token
                Logger.LogInformation("TestAuthenticationHandler: Processing admin token for user {UserId}", testUserId);
            }
            else if (token == "test-user-token")
            {
                // Regular user
                testUserId = Guid.Parse("12345678-1234-1234-1234-123456789012");
                userEmail = "test@example.com";
                userRole = "User";
                userTier = "Free";
            }
            else if (token == "test-premium-token")
            {
                // Premium user
                testUserId = Guid.Parse("12345678-1234-1234-1234-123456789013");
                userEmail = "premium@example.com";
                userRole = "User";
                userTier = "Premium";
            }
            else if (token == "test-basic-token")
            {
                // Basic user
                testUserId = Guid.Parse("12345678-1234-1234-1234-123456789014");
                userEmail = "basic@example.com";
                userRole = "User";
                userTier = "Basic";
            }
            else
            {
                // Determine user tier based on test headers (fallback for other tests)
                var tierHeader = Request.Headers["X-Test-Tier"].FirstOrDefault();
                userTier = tierHeader switch
                {
                    "Premium" => "Premium",
                    "Basic" => "Basic", 
                    "Admin" => "Admin",
                    _ => "Free"
                };
                
                // Use test auth header if present
                if (!string.IsNullOrEmpty(testAuth))
                {
                    testUserId = Guid.Parse("12345678-1234-1234-1234-123456789012");
                    userEmail = "test@example.com";
                    userRole = testAuth == "admin" ? "Admin" : "User";
                    userTier = testAuth == "admin" ? "Admin" : userTier;
                }
                else
                {
                    // Use default test user
                    testUserId = Guid.Parse("12345678-1234-1234-1234-123456789012");
                    userEmail = "test@example.com";
                    userRole = "User";
                }
            }

            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, testUserId.ToString()),
                new Claim(ClaimTypes.Name, userEmail.Split('@')[0]),
                new Claim(ClaimTypes.Email, userEmail),
                new Claim(ClaimTypes.Role, userRole),
                new Claim("role", userRole), // Additional role claim for policy matching
                new Claim("sub", testUserId.ToString()),
                new Claim("jti", Guid.NewGuid().ToString()),
                new Claim("iat", DateTimeOffset.UtcNow.ToUnixTimeSeconds().ToString(), ClaimValueTypes.Integer64),
                new Claim("exp", DateTimeOffset.UtcNow.AddHours(1).ToUnixTimeSeconds().ToString(), ClaimValueTypes.Integer64),
                new Claim("tier", userTier),
                new Claim("subscription_tier", userTier),
                new Claim("user_id", testUserId.ToString()),
                new Claim("email", userEmail),
                new Claim("aud", "GeoLeapTestClient"),
                new Claim("iss", "GeoLeapTestApi")
            };

            var identity = new ClaimsIdentity(claims, DefaultScheme);
            var principal = new ClaimsPrincipal(identity);
            var ticket = new AuthenticationTicket(principal, DefaultScheme);

            return Task.FromResult(AuthenticateResult.Success(ticket));
        }
        catch (ObjectDisposedException)
        {
            // Service provider disposed during authentication - fail gracefully
            return Task.FromResult(AuthenticateResult.Fail("Service provider disposed"));
        }
        catch (InvalidOperationException ex) when (ex.Message.Contains("disposed"))
        {
            // Request context disposed - fail gracefully
            return Task.FromResult(AuthenticateResult.Fail("Request context disposed"));
        }
        catch (Exception ex)
        {
            Logger?.LogError(ex, "Error in test authentication handler");
            return Task.FromResult(AuthenticateResult.Fail($"Authentication error: {ex.Message}"));
        }
    }

    /// <summary>
    /// Helper method to create an authenticated client with specific user type
    /// CRITICAL FIX: Use X-Test-Auth header for test authentication scheme
    /// </summary>
    public static HttpClient CreateAuthenticatedClient(WebApplicationFactory<Program> factory, string tokenType = "test-user-token")
    {
        var client = factory.CreateClient();
        // CRITICAL FIX: Use X-Test-Auth header instead of Bearer token for test environment
        client.DefaultRequestHeaders.Add("X-Test-Auth", tokenType);
        return client;
    }

    /// <summary>
    /// Helper method to create an admin authenticated client
    /// </summary>
    public static HttpClient CreateAdminClient(WebApplicationFactory<Program> factory)
    {
        return CreateAuthenticatedClient(factory, "test-admin-token");
    }

    /// <summary>
    /// Helper method to create a premium user authenticated client
    /// </summary>
    public static HttpClient CreatePremiumClient(WebApplicationFactory<Program> factory)
    {
        return CreateAuthenticatedClient(factory, "test-premium-token");
    }

    /// <summary>
    /// Helper method to create a basic user authenticated client
    /// </summary>
    public static HttpClient CreateBasicClient(WebApplicationFactory<Program> factory)
    {
        return CreateAuthenticatedClient(factory, "test-basic-token");
    }

    /// <summary>
    /// Helper method to create an authenticated client with tier header
    /// CRITICAL FIX: Use X-Test-Auth header for test authentication scheme
    /// </summary>
    public static HttpClient CreateAuthenticatedClientWithTier(WebApplicationFactory<Program> factory, string tier)
    {
        var client = factory.CreateClient();
        // CRITICAL FIX: Use X-Test-Auth header instead of Bearer token
        client.DefaultRequestHeaders.Add("X-Test-Auth", "test-user-token");
        client.DefaultRequestHeaders.Add("X-Test-Tier", tier);
        return client;
    }
}