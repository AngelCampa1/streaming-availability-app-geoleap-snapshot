using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

public interface ISessionService
{
    Task<UserSession> CreateSessionAsync(Guid userId, string refreshToken, string? deviceInfo = null, 
        string? ipAddress = null, string? userAgent = null, bool rememberMe = false);
    Task<UserSession?> GetSessionByRefreshTokenAsync(string refreshToken);
    Task<bool> RevokeSessionAsync(string refreshToken);
    Task<bool> RevokeAllUserSessionsAsync(Guid userId);
    Task<List<UserSession>> GetActiveUserSessionsAsync(Guid userId);
    Task<bool> RefreshSessionAsync(string oldRefreshToken, string newRefreshToken);
    Task CleanupExpiredSessionsAsync();
}