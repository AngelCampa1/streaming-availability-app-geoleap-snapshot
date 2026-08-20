using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace GeoLeap.Api.Services;

public class SessionManagementService : ISessionManagementService
{
    private readonly ApplicationDbContext _context;
    private readonly ISecurityService _securityService;
    private readonly ILogger<SessionManagementService> _logger;

    public SessionManagementService(ApplicationDbContext context, ISecurityService securityService, ILogger<SessionManagementService> logger)
    {
        _context = context;
        _securityService = securityService;
        _logger = logger;
    }

    public async Task<IEnumerable<UserSession>> GetActiveUserSessionsAsync(Guid userId)
    {
        try
        {
            return await _context.UserSessions
                .Where(us => us.UserId == userId && us.IsActive && us.ExpiresAt > DateTime.UtcNow)
                .OrderByDescending(us => us.LastAccessedAt)
                .ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving active sessions for user {UserId}", userId);
            throw;
        }
    }

    public async Task<UserSession?> GetCurrentSessionAsync(Guid userId, string refreshToken)
    {
        try
        {
            return await _context.UserSessions
                .FirstOrDefaultAsync(us => us.UserId == userId && 
                                         us.RefreshToken == refreshToken && 
                                         us.IsActive && 
                                         us.ExpiresAt > DateTime.UtcNow);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving current session for user {UserId}", userId);
            throw;
        }
    }

    public async Task<bool> RevokeSessionAsync(Guid sessionId, Guid userId)
    {
        try
        {
            var session = await _context.UserSessions
                .FirstOrDefaultAsync(us => us.Id == sessionId && us.UserId == userId);

            if (session == null)
            {
                _logger.LogWarning("Attempted to revoke non-existent session {SessionId} for user {UserId}", sessionId, userId);
                return false;
            }

            session.IsActive = false;
            session.RevokedAt = DateTime.UtcNow;
            session.IsCurrentSession = false;

            await _context.SaveChangesAsync();

            // Log security event
            await _securityService.LogSecurityEventAsync(userId, "SESSION_REVOKED", 
                session.IpAddress ?? "Unknown", session.UserAgent ?? "Unknown", 
                $"Session {sessionId} revoked by user");

            _logger.LogInformation("Session {SessionId} revoked for user {UserId}", sessionId, userId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error revoking session {SessionId} for user {UserId}", sessionId, userId);
            throw;
        }
    }

    public async Task<int> RevokeAllUserSessionsAsync(Guid userId, Guid? excludeSessionId = null)
    {
        try
        {
            var sessions = await _context.UserSessions
                .Where(us => us.UserId == userId && us.IsActive)
                .ToListAsync();

            if (excludeSessionId.HasValue)
            {
                sessions = sessions.Where(s => s.Id != excludeSessionId.Value).ToList();
            }

            foreach (var session in sessions)
            {
                session.IsActive = false;
                session.RevokedAt = DateTime.UtcNow;
                session.IsCurrentSession = false;
            }

            await _context.SaveChangesAsync();

            // Log security event
            await _securityService.LogSecurityEventAsync(userId, "ALL_SESSIONS_REVOKED", 
                "System", "System", 
                $"{sessions.Count} sessions revoked by user");

            _logger.LogInformation("Revoked {Count} sessions for user {UserId}", sessions.Count, userId);
            return sessions.Count;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error revoking all sessions for user {UserId}", userId);
            throw;
        }
    }

    public async Task<bool> UpdateSessionActivityAsync(Guid sessionId)
    {
        try
        {
            var session = await _context.UserSessions
                .FirstOrDefaultAsync(us => us.Id == sessionId && us.IsActive);

            if (session == null)
                return false;

            session.LastAccessedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating session activity for session {SessionId}", sessionId);
            throw;
        }
    }

    public async Task<UserSession> CreateSessionAsync(Guid userId, string refreshToken, string ipAddress, string userAgent, string? deviceInfo = null)
    {
        try
        {
            var location = await _securityService.GetLocationFromIpAsync(ipAddress);
            var deviceDetails = ParseDeviceDetails(userAgent);

            var session = new UserSession
            {
                UserId = userId,
                RefreshToken = refreshToken,
                DeviceInfo = deviceInfo,
                IpAddress = ipAddress,
                UserAgent = userAgent,
                CreatedAt = DateTime.UtcNow,
                LastAccessedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddDays(30), // Default 30-day expiry
                IsActive = true,
                DeviceName = deviceDetails.DeviceName,
                OperatingSystem = deviceDetails.OperatingSystem,
                Browser = deviceDetails.Browser,
                Location = location,
                IsCurrentSession = true
            };

            // Mark other sessions as not current
            await MarkOtherSessionsAsNotCurrentAsync(userId);

            _context.UserSessions.Add(session);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Created new session {SessionId} for user {UserId}", session.Id, userId);
            return session;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating session for user {UserId}", userId);
            throw;
        }
    }

    public async Task CleanupExpiredSessionsAsync()
    {
        try
        {
            var expiredSessions = await _context.UserSessions
                .Where(us => us.ExpiresAt <= DateTime.UtcNow || (!us.IsActive && us.RevokedAt <= DateTime.UtcNow.AddDays(-7)))
                .ToListAsync();

            if (expiredSessions.Any())
            {
                _context.UserSessions.RemoveRange(expiredSessions);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Cleaned up {Count} expired sessions", expiredSessions.Count);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during session cleanup");
            throw;
        }
    }

    public async Task<bool> IsSessionValidAsync(Guid sessionId)
    {
        try
        {
            return await _context.UserSessions
                .AnyAsync(us => us.Id == sessionId && us.IsActive && us.ExpiresAt > DateTime.UtcNow);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating session {SessionId}", sessionId);
            return false;
        }
    }

    public async Task<SessionStatistics> GetUserSessionStatisticsAsync(Guid userId)
    {
        try
        {
            var activeSessions = await _context.UserSessions
                .Where(us => us.UserId == userId && us.IsActive && us.ExpiresAt > DateTime.UtcNow)
                .CountAsync();

            var totalSessions = await _context.UserSessions
                .Where(us => us.UserId == userId)
                .CountAsync();

            var lastSession = await _context.UserSessions
                .Where(us => us.UserId == userId)
                .OrderByDescending(us => us.LastAccessedAt)
                .FirstOrDefaultAsync();

            return new SessionStatistics
            {
                ActiveSessions = activeSessions,
                TotalSessions = totalSessions,
                LastLoginAt = lastSession?.LastAccessedAt,
                LastLoginLocation = lastSession?.Location,
                LastLoginDevice = lastSession?.DeviceName ?? lastSession?.OperatingSystem
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving session statistics for user {UserId}", userId);
            throw;
        }
    }

    private async Task MarkOtherSessionsAsNotCurrentAsync(Guid userId)
    {
        var currentSessions = await _context.UserSessions
            .Where(us => us.UserId == userId && us.IsCurrentSession)
            .ToListAsync();

        foreach (var session in currentSessions)
        {
            session.IsCurrentSession = false;
        }
    }

    private (string? DeviceName, string? OperatingSystem, string? Browser) ParseDeviceDetails(string userAgent)
    {
        if (string.IsNullOrEmpty(userAgent))
            return (null, null, null);

        var ua = userAgent.ToLower();

        // Extract OS
        string? os = null;
        if (ua.Contains("windows")) os = "Windows";
        else if (ua.Contains("macintosh") || ua.Contains("mac os")) os = "macOS";
        else if (ua.Contains("linux")) os = "Linux";
        else if (ua.Contains("android")) os = "Android";
        else if (ua.Contains("iphone")) os = "iOS (iPhone)";
        else if (ua.Contains("ipad")) os = "iOS (iPad)";

        // Extract Browser
        string? browser = null;
        if (ua.Contains("firefox")) browser = "Firefox";
        else if (ua.Contains("chrome") && !ua.Contains("edge")) browser = "Chrome";
        else if (ua.Contains("safari") && !ua.Contains("chrome")) browser = "Safari";
        else if (ua.Contains("edge")) browser = "Edge";
        else if (ua.Contains("opera")) browser = "Opera";

        // Extract device name (simplified)
        string? deviceName = null;
        if (ua.Contains("iphone")) deviceName = "iPhone";
        else if (ua.Contains("ipad")) deviceName = "iPad";
        else if (ua.Contains("android")) deviceName = "Android Device";
        else if (ua.Contains("mobile")) deviceName = "Mobile Device";
        else deviceName = "Desktop";

        return (deviceName, os, browser);
    }
}