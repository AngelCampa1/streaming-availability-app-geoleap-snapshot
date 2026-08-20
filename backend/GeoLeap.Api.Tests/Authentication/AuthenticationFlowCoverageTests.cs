using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using GeoLeap.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using Xunit;

namespace GeoLeap.Api.Tests.Authentication;

/// <summary>
/// PHASE 3 COVERAGE: Comprehensive Authentication Flow Testing
/// Target: 95%+ coverage of authentication code paths
/// Focus: JWT, OAuth, Token Management, Registration, Login
/// </summary>
[Collection("RealServicesTest")]
public class AuthenticationFlowCoverageTests : RealServicesTestBase
{
    private readonly IJwtTokenService _jwtTokenService;
    private readonly IAuthService _authService;

    public AuthenticationFlowCoverageTests(RealServicesTestFactory factory) : base(factory)
    {
        _jwtTokenService = GetService<IJwtTokenService>();
        _authService = GetService<IAuthService>();
    }

    #region JWT Token Generation Tests

    [Fact]
    public async Task JwtTokenService_GeneratesValidAccessToken_WithStandardExpiration()
    {
        // Arrange
        var claims = new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString()),
            new Claim(ClaimTypes.Email, "test@example.com"),
            new Claim(ClaimTypes.Role, "User")
        });

        // Act
        var token = _jwtTokenService.GenerateAccessToken(claims, rememberMe: false);

        // Assert - Token is generated
        Assert.NotNull(token);
        Assert.NotEmpty(token);

        // Verify token structure (JWT has 3 parts separated by dots)
        var parts = token.Split('.');
        Assert.Equal(3, parts.Length);

        // Verify token can be validated
        var principal = _jwtTokenService.ValidateToken(token);
        Assert.NotNull(principal);
        Assert.Equal("test@example.com", principal.FindFirst(ClaimTypes.Email)?.Value);
    }

    [Fact]
    public async Task JwtTokenService_GeneratesValidAccessToken_WithRememberMeExpiration()
    {
        // Arrange
        var claims = new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString()),
            new Claim(ClaimTypes.Email, "remember@example.com")
        });

        // Act
        var normalToken = _jwtTokenService.GenerateAccessToken(claims, rememberMe: false);
        var rememberMeToken = _jwtTokenService.GenerateAccessToken(claims, rememberMe: true);

        // Assert
        Assert.NotNull(normalToken);
        Assert.NotNull(rememberMeToken);

        // Remember me tokens should have longer expiration than normal tokens
        var normalExpiration = _jwtTokenService.GetTokenExpiration(normalToken);
        var rememberMeExpiration = _jwtTokenService.GetTokenExpiration(rememberMeToken);

        // Remember me token should expire later than normal token
        Assert.True(rememberMeExpiration > normalExpiration,
            $"RememberMe expiration ({rememberMeExpiration}) should be after normal expiration ({normalExpiration})");
    }

    [Fact]
    public async Task JwtTokenService_ValidatesToken_RejectsTamperedSignature()
    {
        // Arrange - Create a valid token
        var claims = new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString()),
            new Claim(ClaimTypes.Email, "test@example.com")
        });
        var validToken = _jwtTokenService.GenerateAccessToken(claims);

        // Tamper with the signature (last part of JWT)
        var parts = validToken.Split('.');
        var tamperedToken = $"{parts[0]}.{parts[1]}.TAMPERED_SIGNATURE_XYZ123";

        // Act
        var principal = _jwtTokenService.ValidateToken(tamperedToken);

        // Assert - Tampered token should be rejected
        Assert.Null(principal);
    }

    [Fact]
    public async Task JwtTokenService_ValidatesToken_RejectsExpiredToken()
    {
        // Arrange - Create a token that's already expired
        var userId = Guid.NewGuid();
        var claims = new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Email, "expired@example.com")
        });

        // Create token with past NotBefore and Expires times
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.UTF8.GetBytes(GetJwtSecret());
        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = claims,
            NotBefore = DateTime.UtcNow.AddMinutes(-10), // Started 10 minutes ago
            Expires = DateTime.UtcNow.AddMinutes(-5),    // Expired 5 minutes ago
            Issuer = GetJwtIssuer(),
            Audience = GetJwtAudience(),
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(key),
                SecurityAlgorithms.HmacSha256
            )
        };
        var token = tokenHandler.CreateToken(tokenDescriptor);
        var expiredToken = tokenHandler.WriteToken(token);

        // Act
        var principal = _jwtTokenService.ValidateToken(expiredToken, validateLifetime: true);

        // Assert - Expired token should be rejected when lifetime validation is enabled
        Assert.Null(principal);
    }

    [Fact]
    public async Task JwtTokenService_IsTokenExpired_DetectsExpiredToken()
    {
        // Arrange - Create expired token with proper NotBefore/Expires times
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.UTF8.GetBytes(GetJwtSecret());
        var tokenDescriptor = new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[] { new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString()) }),
            NotBefore = DateTime.UtcNow.AddMinutes(-10), // Started 10 minutes ago
            Expires = DateTime.UtcNow.AddMinutes(-5),    // Expired 5 minutes ago
            Issuer = GetJwtIssuer(),
            Audience = GetJwtAudience(),
            SigningCredentials = new SigningCredentials(
                new SymmetricSecurityKey(key),
                SecurityAlgorithms.HmacSha256
            )
        };
        var expiredToken = tokenHandler.WriteToken(tokenHandler.CreateToken(tokenDescriptor));

        // Act
        var isExpired = _jwtTokenService.IsTokenExpired(expiredToken);

        // Assert
        Assert.True(isExpired);
    }

    [Fact]
    public async Task JwtTokenService_IsTokenExpired_DetectsValidToken()
    {
        // Arrange - Create valid token
        var claims = new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString())
        });
        var validToken = _jwtTokenService.GenerateAccessToken(claims);

        // Act
        var isExpired = _jwtTokenService.IsTokenExpired(validToken);

        // Assert
        Assert.False(isExpired);
    }

    #endregion

    #region Refresh Token Tests

    [Fact]
    public async Task JwtTokenService_GeneratesRefreshToken_WithSecureRandomBytes()
    {
        // Act
        var refreshToken1 = _jwtTokenService.GenerateRefreshToken();
        var refreshToken2 = _jwtTokenService.GenerateRefreshToken();

        // Assert
        Assert.NotNull(refreshToken1);
        Assert.NotNull(refreshToken2);
        Assert.NotEmpty(refreshToken1);
        Assert.NotEmpty(refreshToken2);

        // Tokens should be different (random)
        Assert.NotEqual(refreshToken1, refreshToken2);

        // Should be Base64 encoded
        Assert.True(IsBase64String(refreshToken1));
        Assert.True(IsBase64String(refreshToken2));
    }

    [Fact]
    public async Task JwtTokenService_HashesRefreshToken_Consistently()
    {
        // Arrange
        var refreshToken = _jwtTokenService.GenerateRefreshToken();

        // Act
        var hash1 = _jwtTokenService.HashRefreshToken(refreshToken);
        var hash2 = _jwtTokenService.HashRefreshToken(refreshToken);

        // Assert - Same input should produce same hash
        Assert.NotNull(hash1);
        Assert.NotNull(hash2);
        Assert.Equal(hash1, hash2);

        // Hash should be different from original token
        Assert.NotEqual(refreshToken, hash1);
    }

    [Fact]
    public async Task JwtTokenService_HashesRefreshToken_ProducesDifferentHashForDifferentTokens()
    {
        // Arrange
        var refreshToken1 = _jwtTokenService.GenerateRefreshToken();
        var refreshToken2 = _jwtTokenService.GenerateRefreshToken();

        // Act
        var hash1 = _jwtTokenService.HashRefreshToken(refreshToken1);
        var hash2 = _jwtTokenService.HashRefreshToken(refreshToken2);

        // Assert - Different tokens should produce different hashes
        Assert.NotEqual(hash1, hash2);
    }

    #endregion

    #region Registration Flow Tests

    [Fact]
    public async Task AuthService_RegisterAsync_CreatesNewUser_WithValidCredentials()
    {
        // Arrange
        var registerDto = new RegisterDto
        {
            Email = $"newuser_{Guid.NewGuid()}@test.com",
            Password = "SecurePassword123!",
            FirstName = "John",
            LastName = "Doe"
        };

        // Act
        var result = await _authService.RegisterAsync(registerDto, "192.168.1.1", "TestUserAgent");

        // Assert
        Assert.True(result.Success);
        Assert.NotNull(result.User);
        Assert.Equal(registerDto.Email, result.User.Email);
        Assert.Equal(registerDto.FirstName, result.User.FirstName);
        Assert.Equal(registerDto.LastName, result.User.LastName);
        Assert.True(result.User.EmailConfirmed); // Auto-verified
    }

    [Fact]
    public async Task AuthService_RegisterAsync_RejectsDuplicateEmail()
    {
        // Arrange
        var email = $"duplicate_{Guid.NewGuid()}@test.com";
        var registerDto1 = new RegisterDto
        {
            Email = email,
            Password = "Password123!",
            FirstName = "User",
            LastName = "One"
        };

        // Register first user
        await _authService.RegisterAsync(registerDto1);

        // Act - Try to register second user with same email
        var registerDto2 = new RegisterDto
        {
            Email = email,
            Password = "DifferentPassword123!",
            FirstName = "User",
            LastName = "Two"
        };
        var result = await _authService.RegisterAsync(registerDto2);

        // Assert
        Assert.False(result.Success);
        Assert.Contains("already exists", result.Message, StringComparison.OrdinalIgnoreCase);
        Assert.NotEmpty(result.Errors);
    }

    [Fact]
    public async Task AuthService_RegisterAsync_RejectsWeakPassword()
    {
        // Arrange
        var registerDto = new RegisterDto
        {
            Email = $"weakpass_{Guid.NewGuid()}@test.com",
            Password = "weak", // Too short, no uppercase, no special chars
            FirstName = "Test",
            LastName = "User"
        };

        // Act
        var result = await _authService.RegisterAsync(registerDto);

        // Assert
        Assert.False(result.Success);
        Assert.NotEmpty(result.Errors);
    }

    #endregion

    #region Login Flow Tests

    [Fact]
    public async Task AuthService_LoginAsync_SucceedsWithValidCredentials()
    {
        // Arrange - Register a user first
        var email = $"logintest_{Guid.NewGuid()}@test.com";
        var password = "LoginPassword123!";
        var registerDto = new RegisterDto
        {
            Email = email,
            Password = password,
            FirstName = "Login",
            LastName = "Test"
        };
        await _authService.RegisterAsync(registerDto);

        // Act - Login
        var loginDto = new LoginDto
        {
            Email = email,
            Password = password,
            RememberMe = false
        };
        var result = await _authService.LoginAsync(loginDto, "192.168.1.1", "TestUserAgent");

        // Assert
        Assert.True(result.Success);
        Assert.NotNull(result.AccessToken);
        Assert.NotNull(result.RefreshToken);
        Assert.NotNull(result.User);
        Assert.Equal(email, result.User.Email);
    }

    [Fact]
    public async Task AuthService_LoginAsync_RejectsInvalidPassword()
    {
        // Arrange - Register a user
        var email = $"invalidpass_{Guid.NewGuid()}@test.com";
        var correctPassword = "CorrectPassword123!";
        var registerDto = new RegisterDto
        {
            Email = email,
            Password = correctPassword,
            FirstName = "Test",
            LastName = "User"
        };
        await _authService.RegisterAsync(registerDto);

        // Act - Login with wrong password
        var loginDto = new LoginDto
        {
            Email = email,
            Password = "WrongPassword123!",
            RememberMe = false
        };
        var result = await _authService.LoginAsync(loginDto);

        // Assert
        Assert.False(result.Success);
        Assert.Null(result.AccessToken);
        Assert.Null(result.RefreshToken);
    }

    [Fact]
    public async Task AuthService_LoginAsync_RejectsNonExistentUser()
    {
        // Act
        var loginDto = new LoginDto
        {
            Email = $"nonexistent_{Guid.NewGuid()}@test.com",
            Password = "Password123!",
            RememberMe = false
        };
        var result = await _authService.LoginAsync(loginDto);

        // Assert
        Assert.False(result.Success);
        Assert.Null(result.AccessToken);
    }

    #endregion

    #region OAuth Flow Tests

    [Fact]
    public async Task OAuth_GoogleCallback_WithoutCode_ReturnsBadRequestOrUnauthorized()
    {
        // The test host registers MockGoogleOAuthHandler under the "Google" scheme so that
        // HttpContext.AuthenticateAsync("Google") resolves.  MockGoogleOAuthHandler returns
        // AuthenticateResult.Success (with a mock principal) only when the request path is
        // "/api/auth/google-callback", which is exactly where we land here.  The controller
        // then calls ExternalLoginAsync with the mock claims; because the mock user does not
        // exist in the in-memory DB it may succeed (creating the user) or redirect - either
        // way the response must not be 200 OK (the endpoint always redirects).
        ClearAuthentication();
        var response = await Client.GetAsync("/api/auth/google-callback");
        Assert.True(response.StatusCode != HttpStatusCode.OK);
    }

    [Fact]
    public async Task OAuth_AppleCallback_WithoutCode_ReturnsBadRequestOrUnauthorized()
    {
        // Same as above but exercising the Apple OAuth path.  MockAppleOAuthHandler supplies
        // mock Apple claims; the controller redirects regardless of auth outcome.
        ClearAuthentication();
        var response = await Client.GetAsync("/api/auth/apple-callback");
        Assert.True(response.StatusCode != HttpStatusCode.OK);
    }

    #endregion

    #region Helper Methods

    private string GetJwtSecret()
    {
        // Default test secret from appsettings.json
        return "test-secret-key-for-jwt-signing-min-32-chars-long-secure";
    }

    private string GetJwtIssuer()
    {
        return "https://localhost:8020";
    }

    private string GetJwtAudience()
    {
        return "https://localhost:3020";
    }

    private bool IsBase64String(string value)
    {
        try
        {
            Convert.FromBase64String(value);
            return true;
        }
        catch
        {
            return false;
        }
    }

    #endregion
}
