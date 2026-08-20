using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace GeoLeap.Api.Services;

public class SessionService : ISessionService
{
    private readonly ApplicationDbContext _context;
    private readonly JwtSettings _jwtSettings;
    private readonly IJwtTokenService _jwtTokenService;
    private readonly ILogger<SessionService> _logger;

    public SessionService(
        ApplicationDbContext context,
        IOptions<JwtSettings> jwtSettings,
        IJwtTokenService jwtTokenService,
        ILogger<SessionService> logger)
    {
        _context = context;
        _jwtSettings = jwtSettings.Value;
        _jwtTokenService = jwtTokenService;
        _logger = logger;
    }

    public async Task<UserSession> CreateSessionAsync(Guid userId, string refreshToken, string? deviceInfo = null,
        string? ipAddress = null, string? userAgent = null, bool rememberMe = false)
    {
        try
        {
            var expirationDays = rememberMe ? _jwtSettings.RememberMeTokenExpirationDays : _jwtSettings.RefreshTokenExpirationDays;

            // SECURITY FIX: Hash refresh token before storing in database
            // This prevents token theft if database is compromised
            var hashedToken = _jwtTokenService.HashRefreshToken(refreshToken);

            var session = new UserSession
            {
                UserId = userId,
                RefreshToken = hashedToken, // Store hashed token, not plain text
                DeviceInfo = deviceInfo,
                IpAddress = ipAddress,
                UserAgent = userAgent,
                ExpiresAt = DateTime.UtcNow.AddDays(expirationDays),
                IsActive = true
            };

            _context.UserSessions.Add(session);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Created new session for user: {UserId}, SessionId: {SessionId}", userId, session.Id);

            return session;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating session for user: {UserId}", userId);
            throw;
        }
    }

    public async Task<UserSession?> GetSessionByRefreshTokenAsync(string refreshToken)
    {
        try
        {
            // SECURITY FIX: Hash the incoming token to compare with stored hash
            var hashedToken = _jwtTokenService.HashRefreshToken(refreshToken);

            return await _context.UserSessions
                .Include(s => s.User)
                .FirstOrDefaultAsync(s => s.RefreshToken == hashedToken && s.IsActive && s.ExpiresAt > DateTime.UtcNow);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving session by refresh token");
            return null;
        }
    }

    public async Task<bool> RevokeSessionAsync(string refreshToken)
    {
        try
        {
            // SECURITY FIX: Hash the incoming token to find the session
            var hashedToken = _jwtTokenService.HashRefreshToken(refreshToken);

            var session = await _context.UserSessions
                .FirstOrDefaultAsync(s => s.RefreshToken == hashedToken);

            if (session == null)
                return false;

            session.IsActive = false;
            session.RevokedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            _logger.LogInformation("Revoked session: {SessionId} for user: {UserId}", session.Id, session.UserId);

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error revoking session with refresh token");
            return false;
        }
    }

    public async Task<bool> RevokeAllUserSessionsAsync(Guid userId)
    {
        try
        {
            var sessions = await _context.UserSessions
                .Where(s => s.UserId == userId && s.IsActive)
                .ToListAsync();

            foreach (var session in sessions)
            {
                session.IsActive = false;
            }

            await _context.SaveChangesAsync();

            _logger.LogInformation("Revoked {SessionCount} sessions for user: {UserId}", sessions.Count, userId);
            
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error revoking all sessions for user: {UserId}", userId);
            return false;
        }
    }

    public async Task<List<UserSession>> GetActiveUserSessionsAsync(Guid userId)
    {
        try
        {
            return await _context.UserSessions
                .Where(s => s.UserId == userId && s.IsActive && s.ExpiresAt > DateTime.UtcNow)
                .OrderByDescending(s => s.LastAccessedAt)
                .ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving active sessions for user: {UserId}", userId);
            return new List<UserSession>();
        }
    }

    public async Task<bool> RefreshSessionAsync(string oldRefreshToken, string newRefreshToken)
    {
        try
        {
            // SECURITY FIX (Phase 19): Hash old token before lookup
            // BUG FIX: Was comparing plain text oldRefreshToken against hashed database tokens
            var hashedOldToken = _jwtTokenService.HashRefreshToken(oldRefreshToken);

            var session = await _context.UserSessions
                .FirstOrDefaultAsync(s => s.RefreshToken == hashedOldToken && s.IsActive);

            if (session == null)
                return false;

            // SECURITY FIX (Phase 19): Hash new token before storage
            // CRITICAL BUG FIX: Was storing new token as plain text (OWASP A02:2021 vulnerability)
            session.RefreshToken = _jwtTokenService.HashRefreshToken(newRefreshToken);
            session.LastAccessedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Refreshed session: {SessionId} for user: {UserId}", session.Id, session.UserId);

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error refreshing session");
            return false;
        }
    }

    public async Task CleanupExpiredSessionsAsync()
    {
        try
        {
            var expiredSessions = await _context.UserSessions
                .Where(s => s.ExpiresAt <= DateTime.UtcNow || !s.IsActive)
                .ToListAsync();

            _context.UserSessions.RemoveRange(expiredSessions);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Cleaned up {ExpiredSessionCount} expired sessions", expiredSessions.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error cleaning up expired sessions");
        }
    }
}