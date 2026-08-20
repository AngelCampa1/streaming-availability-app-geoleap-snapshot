using System.Security.Claims;

namespace GeoLeap.Api.Services;

public interface IJwtTokenService
{
    string GenerateAccessToken(ClaimsIdentity claimsIdentity, bool rememberMe = false);
    string GenerateRefreshToken();
    string HashRefreshToken(string token);
    ClaimsPrincipal? ValidateToken(string token, bool validateLifetime = true);
    DateTime GetTokenExpiration(string token);
    bool IsTokenExpired(string token);
}