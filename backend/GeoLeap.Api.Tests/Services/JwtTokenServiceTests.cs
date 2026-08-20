using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace GeoLeap.Api.Tests.Services;

/// <summary>
/// Comprehensive tests for JwtTokenService - PHASE 1B (Authentication & Security)
///
/// CRITICAL TESTS:
/// - Access token generation with claims
/// - Refresh token generation and hashing
/// - Token validation (valid, expired, tampered)
/// - Token expiration checking
/// - RememberMe token extension
/// - Security: SHA256 hashing for refresh tokens
///
/// Test Pattern: Unit tests with real JWT functionality
/// Coverage Target: 95-100% of JwtTokenService methods
/// Service LOC: ~162 lines
/// </summary>
public class JwtTokenServiceTests
{
    private readonly Mock<ILogger<JwtTokenService>> _mockLogger;
    private readonly JwtSettings _jwtSettings;
    private readonly JwtTokenService _jwtTokenService;

    public JwtTokenServiceTests()
    {
        _mockLogger = new Mock<ILogger<JwtTokenService>>();

        // Setup JWT settings with test values
        _jwtSettings = new JwtSettings
        {
            Secret = "ThisIsAVeryLongSecretKeyForTestingPurposesOnly1234567890",
            Issuer = "GeoLeapTestIssuer",
            Audience = "GeoLeapTestAudience",
            AccessTokenExpirationMinutes = 60,
            RefreshTokenExpirationDays = 7,
            RememberMeTokenExpirationDays = 30
        };

        var jwtSettingsOptions = Options.Create(_jwtSettings);
        _jwtTokenService = new JwtTokenService(jwtSettingsOptions, _mockLogger.Object);
    }

    #region GenerateAccessToken Tests

    [Fact]
    public void GenerateAccessToken_WithValidClaims_ReturnsValidToken()
    {
        // Arrange
        var claims = new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString()),
            new Claim(ClaimTypes.Email, "test@test.com"),
            new Claim(ClaimTypes.Name, "Test User")
        });

        // Act
        var token = _jwtTokenService.GenerateAccessToken(claims);

        // Assert
        Assert.NotNull(token);
        Assert.NotEmpty(token);

        // Verify it's a valid JWT format (3 parts separated by dots)
        var tokenParts = token.Split('.');
        Assert.Equal(3, tokenParts.Length);
    }

    [Fact]
    public void GenerateAccessToken_WithRememberMe_ExtendsExpiration()
    {
        // Arrange
        var claims = new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString()),
            new Claim(ClaimTypes.Email, "test@test.com")
        });

        // Act
        var normalToken = _jwtTokenService.GenerateAccessToken(claims, rememberMe: false);
        var rememberMeToken = _jwtTokenService.GenerateAccessToken(claims, rememberMe: true);

        // Assert
        Assert.NotNull(normalToken);
        Assert.NotNull(rememberMeToken);

        var normalExpiration = _jwtTokenService.GetTokenExpiration(normalToken);
        var rememberMeExpiration = _jwtTokenService.GetTokenExpiration(rememberMeToken);

        // RememberMe token should expire much later
        Assert.True(rememberMeExpiration > normalExpiration);
        Assert.True((rememberMeExpiration - DateTime.UtcNow).TotalDays > 20); // Should be ~30 days
    }

    [Fact]
    public void GenerateAccessToken_WithUserId_IncludesUserIdClaim()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var claims = new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Email, "test@test.com")
        });

        // Act
        var token = _jwtTokenService.GenerateAccessToken(claims);
        var principal = _jwtTokenService.ValidateToken(token);

        // Assert
        Assert.NotNull(principal);
        var userIdClaim = principal.FindFirst(ClaimTypes.NameIdentifier);
        Assert.NotNull(userIdClaim);
        Assert.Equal(userId.ToString(), userIdClaim.Value);
    }

    [Fact]
    public void GenerateAccessToken_WithMultipleClaims_IncludesAllClaims()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var claims = new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Email, "test@test.com"),
            new Claim(ClaimTypes.Name, "Test User"),
            new Claim(ClaimTypes.Role, "Admin"),
            new Claim("custom_claim", "custom_value")
        });

        // Act
        var token = _jwtTokenService.GenerateAccessToken(claims);
        var principal = _jwtTokenService.ValidateToken(token);

        // Assert
        Assert.NotNull(principal);
        Assert.Equal(userId.ToString(), principal.FindFirst(ClaimTypes.NameIdentifier)?.Value);
        Assert.Equal("test@test.com", principal.FindFirst(ClaimTypes.Email)?.Value);
        Assert.Equal("Test User", principal.FindFirst(ClaimTypes.Name)?.Value);
        Assert.Equal("Admin", principal.FindFirst(ClaimTypes.Role)?.Value);
        Assert.Equal("custom_value", principal.FindFirst("custom_claim")?.Value);
    }

    [Fact]
    public void GenerateAccessToken_ExpiresAfterConfiguredTime()
    {
        // Arrange
        var claims = new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString())
        });

        // Act
        var token = _jwtTokenService.GenerateAccessToken(claims, rememberMe: false);
        var expiration = _jwtTokenService.GetTokenExpiration(token);

        // Assert
        var expectedExpiration = DateTime.UtcNow.AddMinutes(_jwtSettings.AccessTokenExpirationMinutes);
        Assert.True(expiration > DateTime.UtcNow);
        Assert.True(expiration <= expectedExpiration.AddSeconds(5)); // Allow 5 second tolerance
    }

    #endregion

    #region GenerateRefreshToken Tests

    [Fact]
    public void GenerateRefreshToken_ReturnsBase64String()
    {
        // Act
        var refreshToken = _jwtTokenService.GenerateRefreshToken();

        // Assert
        Assert.NotNull(refreshToken);
        Assert.NotEmpty(refreshToken);

        // Verify it's valid Base64
        var bytes = Convert.FromBase64String(refreshToken);
        Assert.Equal(64, bytes.Length); // Should be 64 bytes
    }

    [Fact]
    public void GenerateRefreshToken_GeneratesUniqueTokens()
    {
        // Act
        var token1 = _jwtTokenService.GenerateRefreshToken();
        var token2 = _jwtTokenService.GenerateRefreshToken();
        var token3 = _jwtTokenService.GenerateRefreshToken();

        // Assert
        Assert.NotEqual(token1, token2);
        Assert.NotEqual(token2, token3);
        Assert.NotEqual(token1, token3);
    }

    [Fact]
    public void GenerateRefreshToken_UsesSecureRandomGeneration()
    {
        // Generate multiple tokens and verify they're different
        var tokens = new HashSet<string>();

        for (int i = 0; i < 100; i++)
        {
            var token = _jwtTokenService.GenerateRefreshToken();
            tokens.Add(token);
        }

        // All 100 tokens should be unique
        Assert.Equal(100, tokens.Count);
    }

    #endregion

    #region HashRefreshToken Tests

    [Fact]
    public void HashRefreshToken_ReturnsDeterministicHash()
    {
        // Arrange
        var token = "test_refresh_token_123";

        // Act
        var hash1 = _jwtTokenService.HashRefreshToken(token);
        var hash2 = _jwtTokenService.HashRefreshToken(token);

        // Assert
        Assert.Equal(hash1, hash2); // Same input should produce same hash
    }

    [Fact]
    public void HashRefreshToken_DifferentTokensProduceDifferentHashes()
    {
        // Arrange
        var token1 = "refresh_token_1";
        var token2 = "refresh_token_2";

        // Act
        var hash1 = _jwtTokenService.HashRefreshToken(token1);
        var hash2 = _jwtTokenService.HashRefreshToken(token2);

        // Assert
        Assert.NotEqual(hash1, hash2);
    }

    [Fact]
    public void HashRefreshToken_ReturnsBase64EncodedHash()
    {
        // Arrange
        var token = _jwtTokenService.GenerateRefreshToken();

        // Act
        var hash = _jwtTokenService.HashRefreshToken(token);

        // Assert
        Assert.NotNull(hash);
        Assert.NotEmpty(hash);

        // Verify it's valid Base64
        var hashBytes = Convert.FromBase64String(hash);
        Assert.Equal(32, hashBytes.Length); // SHA256 produces 32 bytes
    }

    [Fact]
    public void HashRefreshToken_IsIrreversible()
    {
        // Arrange
        var originalToken = _jwtTokenService.GenerateRefreshToken();

        // Act
        var hash = _jwtTokenService.HashRefreshToken(originalToken);

        // Assert
        // Hash should not contain the original token
        Assert.NotEqual(originalToken, hash);
        Assert.DoesNotContain(originalToken, hash);
    }

    #endregion

    #region ValidateToken Tests

    [Fact]
    public void ValidateToken_WithValidToken_ReturnsPrincipal()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var claims = new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, userId.ToString()),
            new Claim(ClaimTypes.Email, "test@test.com")
        });
        var token = _jwtTokenService.GenerateAccessToken(claims);

        // Act
        var principal = _jwtTokenService.ValidateToken(token);

        // Assert
        Assert.NotNull(principal);
        Assert.Equal(userId.ToString(), principal.FindFirst(ClaimTypes.NameIdentifier)?.Value);
    }

    [Fact]
    public void ValidateToken_WithInvalidToken_ReturnsNull()
    {
        // Arrange
        var invalidToken = "invalid.token.here";

        // Act
        var principal = _jwtTokenService.ValidateToken(invalidToken);

        // Assert
        Assert.Null(principal);
    }

    [Fact]
    public void ValidateToken_WithTamperedToken_ReturnsNull()
    {
        // Arrange
        var claims = new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString())
        });
        var token = _jwtTokenService.GenerateAccessToken(claims);

        // Tamper with the token by changing one character
        var tamperedToken = token.Substring(0, token.Length - 5) + "XXXXX";

        // Act
        var principal = _jwtTokenService.ValidateToken(tamperedToken);

        // Assert
        Assert.Null(principal);
    }

    [Fact]
    public void ValidateToken_WithExpiredToken_ReturnsNullWhenValidateLifetimeTrue()
    {
        // Arrange - Create an expired token manually using JwtSecurityTokenHandler
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = System.Text.Encoding.UTF8.GetBytes(_jwtSettings.Secret);
        var tokenDescriptor = new Microsoft.IdentityModel.Tokens.SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString())
            }),
            NotBefore = DateTime.UtcNow.AddMinutes(-10), // Started 10 minutes ago
            Expires = DateTime.UtcNow.AddMinutes(-5),    // Expired 5 minutes ago
            Issuer = _jwtSettings.Issuer,
            Audience = _jwtSettings.Audience,
            SigningCredentials = new Microsoft.IdentityModel.Tokens.SigningCredentials(
                new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(key),
                Microsoft.IdentityModel.Tokens.SecurityAlgorithms.HmacSha256)
        };
        var expiredToken = tokenHandler.WriteToken(tokenHandler.CreateToken(tokenDescriptor));

        // Act
        var principal = _jwtTokenService.ValidateToken(expiredToken, validateLifetime: true);

        // Assert
        Assert.Null(principal);
    }

    [Fact]
    public void ValidateToken_WithExpiredToken_ReturnsPrincipalWhenValidateLifetimeFalse()
    {
        // Arrange - Create an expired token manually using JwtSecurityTokenHandler
        var userId = Guid.NewGuid();
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = System.Text.Encoding.UTF8.GetBytes(_jwtSettings.Secret);
        var tokenDescriptor = new Microsoft.IdentityModel.Tokens.SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.NameIdentifier, userId.ToString())
            }),
            NotBefore = DateTime.UtcNow.AddMinutes(-10), // Started 10 minutes ago
            Expires = DateTime.UtcNow.AddMinutes(-5),    // Expired 5 minutes ago
            Issuer = _jwtSettings.Issuer,
            Audience = _jwtSettings.Audience,
            SigningCredentials = new Microsoft.IdentityModel.Tokens.SigningCredentials(
                new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(key),
                Microsoft.IdentityModel.Tokens.SecurityAlgorithms.HmacSha256)
        };
        var expiredToken = tokenHandler.WriteToken(tokenHandler.CreateToken(tokenDescriptor));

        // Act
        var principal = _jwtTokenService.ValidateToken(expiredToken, validateLifetime: false);

        // Assert
        Assert.NotNull(principal);
        Assert.Equal(userId.ToString(), principal.FindFirst(ClaimTypes.NameIdentifier)?.Value);
    }

    [Fact]
    public void ValidateToken_WithWrongIssuer_ReturnsNull()
    {
        // Arrange
        var wrongSettings = new JwtSettings
        {
            Secret = _jwtSettings.Secret,
            Issuer = "WrongIssuer", // Different issuer
            Audience = _jwtSettings.Audience,
            AccessTokenExpirationMinutes = 60,
            RefreshTokenExpirationDays = 7,
            RememberMeTokenExpirationDays = 30
        };

        var wrongService = new JwtTokenService(Options.Create(wrongSettings), _mockLogger.Object);
        var claims = new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString())
        });

        var token = wrongService.GenerateAccessToken(claims);

        // Act - Validate with correct service (different issuer)
        var principal = _jwtTokenService.ValidateToken(token);

        // Assert
        Assert.Null(principal);
    }

    #endregion

    #region GetTokenExpiration Tests

    [Fact]
    public void GetTokenExpiration_WithValidToken_ReturnsCorrectExpiration()
    {
        // Arrange
        var claims = new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString())
        });
        var token = _jwtTokenService.GenerateAccessToken(claims);

        // Act
        var expiration = _jwtTokenService.GetTokenExpiration(token);

        // Assert
        Assert.True(expiration > DateTime.UtcNow);
        var expectedExpiration = DateTime.UtcNow.AddMinutes(_jwtSettings.AccessTokenExpirationMinutes);
        Assert.True(expiration <= expectedExpiration.AddSeconds(5)); // 5 second tolerance
    }

    [Fact]
    public void GetTokenExpiration_WithInvalidToken_ReturnsMinValue()
    {
        // Arrange
        var invalidToken = "invalid.token.value";

        // Act
        var expiration = _jwtTokenService.GetTokenExpiration(invalidToken);

        // Assert
        Assert.Equal(DateTime.MinValue, expiration);
    }

    [Fact]
    public void GetTokenExpiration_WithRememberMeToken_ReturnsExtendedExpiration()
    {
        // Arrange
        var claims = new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString())
        });
        var rememberMeToken = _jwtTokenService.GenerateAccessToken(claims, rememberMe: true);

        // Act
        var expiration = _jwtTokenService.GetTokenExpiration(rememberMeToken);

        // Assert
        var expectedExpiration = DateTime.UtcNow.AddDays(_jwtSettings.RememberMeTokenExpirationDays);
        Assert.True(expiration > DateTime.UtcNow.AddDays(20)); // At least 20+ days
        Assert.True(expiration <= expectedExpiration.AddSeconds(5));
    }

    #endregion

    #region IsTokenExpired Tests

    [Fact]
    public void IsTokenExpired_WithValidToken_ReturnsFalse()
    {
        // Arrange
        var claims = new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString())
        });
        var token = _jwtTokenService.GenerateAccessToken(claims);

        // Act
        var isExpired = _jwtTokenService.IsTokenExpired(token);

        // Assert
        Assert.False(isExpired);
    }

    [Fact]
    public void IsTokenExpired_WithExpiredToken_ReturnsTrue()
    {
        // Arrange - Create an expired token manually using JwtSecurityTokenHandler
        var tokenHandler = new JwtSecurityTokenHandler();
        var key = System.Text.Encoding.UTF8.GetBytes(_jwtSettings.Secret);
        var tokenDescriptor = new Microsoft.IdentityModel.Tokens.SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity(new[]
            {
                new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString())
            }),
            NotBefore = DateTime.UtcNow.AddMinutes(-10), // Started 10 minutes ago
            Expires = DateTime.UtcNow.AddMinutes(-5),    // Expired 5 minutes ago
            Issuer = _jwtSettings.Issuer,
            Audience = _jwtSettings.Audience,
            SigningCredentials = new Microsoft.IdentityModel.Tokens.SigningCredentials(
                new Microsoft.IdentityModel.Tokens.SymmetricSecurityKey(key),
                Microsoft.IdentityModel.Tokens.SecurityAlgorithms.HmacSha256)
        };
        var expiredToken = tokenHandler.WriteToken(tokenHandler.CreateToken(tokenDescriptor));

        // Act
        var isExpired = _jwtTokenService.IsTokenExpired(expiredToken);

        // Assert
        Assert.True(isExpired);
    }

    [Fact]
    public void IsTokenExpired_WithInvalidToken_ReturnsTrue()
    {
        // Arrange
        var invalidToken = "invalid.token.value";

        // Act
        var isExpired = _jwtTokenService.IsTokenExpired(invalidToken);

        // Assert
        Assert.True(isExpired); // Invalid tokens are considered expired
    }

    #endregion

    #region Security Tests

    [Fact]
    public void GenerateAccessToken_UsesSameSecretForConsistency()
    {
        // Arrange
        var claims = new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString())
        });

        // Act
        var token = _jwtTokenService.GenerateAccessToken(claims);
        var principal = _jwtTokenService.ValidateToken(token);

        // Assert
        // Token generated and validated by same service should work
        Assert.NotNull(principal);
    }

    [Fact]
    public void JwtTokenService_EnforcesHmacSha256Algorithm()
    {
        // Arrange
        var claims = new ClaimsIdentity(new[]
        {
            new Claim(ClaimTypes.NameIdentifier, Guid.NewGuid().ToString())
        });
        var token = _jwtTokenService.GenerateAccessToken(claims);

        // Act
        var handler = new JwtSecurityTokenHandler();
        var jwtToken = handler.ReadJwtToken(token);

        // Assert
        Assert.Equal("HS256", jwtToken.Header.Alg);
    }

    #endregion
}
