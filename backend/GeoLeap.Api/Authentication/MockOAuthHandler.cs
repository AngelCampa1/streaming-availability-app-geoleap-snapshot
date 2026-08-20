using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;

namespace GeoLeap.Api.Authentication;

/// <summary>
/// Mock OAuth authentication handler for testing Google and Apple OAuth flows
/// without requiring real OAuth credentials from Google/Apple developer consoles.
/// </summary>
public class MockOAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public MockOAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder)
        : base(options, logger, encoder)
    {
    }

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        // This is called when checking if user is authenticated
        // For OAuth flow, we don't need to implement this
        await Task.CompletedTask;
        return AuthenticateResult.NoResult();
    }

    protected override async Task HandleChallengeAsync(AuthenticationProperties properties)
    {
        // This is called when [Authorize] attribute triggers OAuth flow
        // We'll simulate the OAuth redirect flow here

        var provider = Scheme.Name; // "MockGoogle" or "MockApple"
        var returnUrl = properties.RedirectUri ?? "/";

        // Simulate OAuth provider login page
        // In real OAuth, user would be redirected to Google/Apple login
        // Here we'll create a mock callback with test user data

        var callbackUrl = BuildCallbackUrl(provider, returnUrl);

        Logger.LogInformation("Mock OAuth Challenge initiated for {Provider}. Redirecting to: {CallbackUrl}",
            provider, callbackUrl);

        Response.Redirect(callbackUrl);
        await Task.CompletedTask;
    }

    private string BuildCallbackUrl(string provider, string returnUrl)
    {
        // Simulate OAuth callback with mock authorization code
        var callbackPath = provider == "MockGoogle" ? "/signin-google" : "/signin-apple";
        var mockAuthCode = $"mock_auth_code_{Guid.NewGuid():N}";
        var state = returnUrl;

        return $"{callbackPath}?code={mockAuthCode}&state={state}";
    }
}

/// <summary>
/// Mock Google OAuth authentication handler that simulates Google Sign-In
/// </summary>
public class MockGoogleOAuthHandler : AuthenticationHandler<Microsoft.AspNetCore.Authentication.AuthenticationSchemeOptions>
{
    public MockGoogleOAuthHandler(
        IOptionsMonitor<Microsoft.AspNetCore.Authentication.AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder)
        : base(options, logger, encoder)
    {
    }

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        Logger.LogInformation("MockGoogleOAuthHandler.HandleAuthenticateAsync called for path: {Path}", Request.Path);

        // Check if this is a callback from "Google" (our mock)
        if (!Request.Path.Equals("/api/auth/google-callback", StringComparison.OrdinalIgnoreCase))
        {
            Logger.LogInformation("Path {Path} does not match callback path, returning NoResult", Request.Path);
            return AuthenticateResult.NoResult();
        }

        // Simulate successful OAuth callback from Google
        // Use exact claim names that the controller expects
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, $"google_mock_{Guid.NewGuid():N}"),
            new Claim("email", "mockgoogle@test.com"),  // Controller expects "email", not ClaimTypes.Email
            new Claim("given_name", "Mock"),  // Controller expects "given_name", not ClaimTypes.GivenName
            new Claim("family_name", "GoogleUser"),  // Controller expects "family_name", not ClaimTypes.Surname
            new Claim("provider", "Google"),
            new Claim("email_verified", "true"),
            new Claim("sub", $"google_mock_{Guid.NewGuid():N}")  // External login ID
        };

        var identity = new ClaimsIdentity(claims, Scheme.Name);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, Scheme.Name);

        Logger.LogInformation("Mock Google OAuth authentication successful for {Email}", "mockgoogle@test.com");

        await Task.CompletedTask;
        return AuthenticateResult.Success(ticket);
    }

    protected override async Task HandleChallengeAsync(AuthenticationProperties properties)
    {
        // This is called when the OAuth flow is initiated (user clicks "Sign in with Google")
        // Simply redirect to the callback - the HandleAuthenticateAsync will provide the mock user data

        Logger.LogInformation("Mock Google OAuth challenge initiated - redirecting to callback");

        // Redirect to callback endpoint where HandleAuthenticateAsync will be called
        Response.Redirect("/api/auth/google-callback");
        await Task.CompletedTask;
    }
}

/// <summary>
/// Mock Apple OAuth authentication handler that simulates Sign in with Apple
/// </summary>
public class MockAppleOAuthHandler : AuthenticationHandler<Microsoft.AspNetCore.Authentication.AuthenticationSchemeOptions>
{
    public MockAppleOAuthHandler(
        IOptionsMonitor<Microsoft.AspNetCore.Authentication.AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder)
        : base(options, logger, encoder)
    {
    }

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        // Check if this is a callback from "Apple" (our mock)
        if (!Request.Path.Equals("/api/auth/apple-callback", StringComparison.OrdinalIgnoreCase))
        {
            return AuthenticateResult.NoResult();
        }

        // Simulate successful OAuth callback from Apple
        // Apple supports "Hide My Email" feature
        // Use exact claim names that the controller expects
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, $"apple_mock_{Guid.NewGuid():N}"),
            new Claim("email", "mockapple@privaterelay.appleid.com"), // Controller expects "email", not ClaimTypes.Email
            new Claim("given_name", "Mock"), // Controller expects "given_name", not ClaimTypes.GivenName
            new Claim("family_name", "AppleUser"), // Controller expects "family_name", not ClaimTypes.Surname
            new Claim("provider", "Apple"),
            new Claim("email_verified", "true"),
            new Claim("real_user_status", "2"), // Apple's indicator for real users
            new Claim("sub", $"apple_mock_{Guid.NewGuid():N}")  // External login ID
        };

        var identity = new ClaimsIdentity(claims, Scheme.Name);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, Scheme.Name);

        Logger.LogInformation("Mock Apple OAuth authentication successful for {Email}", "mockapple@privaterelay.appleid.com");

        await Task.CompletedTask;
        return AuthenticateResult.Success(ticket);
    }

    protected override async Task HandleChallengeAsync(AuthenticationProperties properties)
    {
        // This is called when the OAuth flow is initiated (user clicks "Sign in with Apple")
        // Simply redirect to the callback - the HandleAuthenticateAsync will provide the mock user data

        Logger.LogInformation("Mock Apple OAuth challenge initiated - redirecting to callback");

        // Redirect to callback endpoint where HandleAuthenticateAsync will be called
        Response.Redirect("/api/auth/apple-callback");
        await Task.CompletedTask;
    }
}
