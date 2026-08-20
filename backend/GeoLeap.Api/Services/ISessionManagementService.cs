using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

public interface ISessionManagementService
{
    Task<IEnumerable<UserSession>> GetActiveUserSessionsAsync(Guid userId);
    Task<UserSession?> GetCurrentSessionAsync(Guid userId, string refreshToken);
    Task<bool> RevokeSessionAsync(Guid sessionId, Guid userId);
    Task<int> RevokeAllUserSessionsAsync(Guid userId, Guid? excludeSessionId = null);
    Task<bool> UpdateSessionActivityAsync(Guid sessionId);
    Task<UserSession> CreateSessionAsync(Guid userId, string refreshToken, string ipAddress, string userAgent, string? deviceInfo = null);
    Task CleanupExpiredSessionsAsync();
    Task<bool> IsSessionValidAsync(Guid sessionId);
    Task<SessionStatistics> GetUserSessionStatisticsAsync(Guid userId);
}

public class SessionStatistics
{
    public int ActiveSessions { get; set; }
    public int TotalSessions { get; set; }
    public DateTime? LastLoginAt { get; set; }
    public string? LastLoginLocation { get; set; }
    public string? LastLoginDevice { get; set; }
}