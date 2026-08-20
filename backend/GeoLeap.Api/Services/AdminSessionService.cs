using GeoLeap.Api.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Caching.Distributed;
using System.Text.Json;
using System.Collections.Concurrent;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service for admin session management
/// </summary>
public class AdminSessionService : IAdminSessionService
{
    private readonly ILogger<AdminSessionService> _logger;
    private readonly IDistributedCache _cache;
    // ✅ THREAD SAFETY FIX: Use ConcurrentBag instead of List for thread-safe collection
    private static readonly ConcurrentDictionary<Guid, ConcurrentBag<AdminSession>> _userSessions = new();
    private const string SESSION_CACHE_PREFIX = "admin_session:";
    private const int DEFAULT_SESSION_TIMEOUT_MINUTES = 60;

    public AdminSessionService(
        ILogger<AdminSessionService> logger,
        IDistributedCache cache)
    {
        _logger = logger;
        _cache = cache;
    }

    /// <summary>
    /// Create new admin session
    /// </summary>
    public async Task<AdminSession> CreateSessionAsync(AdminSessionRequest request, string correlationId)
    {
        try
        {
            _logger.LogInformation("[{CorrelationId}] Creating admin session for user {UserId}", correlationId, request.UserId);

            // FIXED: Week 1 Day 5 - Null reference warnings (CS8601/CS8602)
            var session = new AdminSession
            {
                Id = Guid.NewGuid(),
                UserId = request.UserId ?? Guid.Empty,
                IpAddress = request.IpAddress ?? "unknown",
                UserAgent = request.UserAgent ?? "unknown",
                CreatedAt = DateTime.UtcNow,
                LastActivity = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddMinutes(request.TimeoutMinutes > 0 ? request.TimeoutMinutes : DEFAULT_SESSION_TIMEOUT_MINUTES),
                IsActive = true,
                Permissions = request.Permissions ?? new List<string>(),
                Metadata = request.Metadata ?? new Dictionary<string, object>()
            };

            // Store in distributed cache
            var cacheKey = $"{SESSION_CACHE_PREFIX}{session.Id}";
            var serializedSession = JsonSerializer.Serialize(session);
            var cacheOptions = new DistributedCacheEntryOptions
            {
                AbsoluteExpiration = session.ExpiresAt
            };
            await _cache.SetStringAsync(cacheKey, serializedSession, cacheOptions);

            // Store in memory cache for quick lookups
            // ✅ THREAD SAFETY FIX: Use thread-safe ConcurrentBag.Add instead of List.Add
            _userSessions.AddOrUpdate(
                request.UserId ?? Guid.Empty,
                new ConcurrentBag<AdminSession> { session },
                (key, existingBag) =>
                {
                    existingBag.Add(session);
                    return existingBag;
                });

            _logger.LogInformation("[{CorrelationId}] Admin session created: {SessionId}", correlationId, session.Id);
            return session;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error creating admin session", correlationId);
            throw;
        }
    }

    /// <summary>
    /// Get active session by ID
    /// </summary>
    public async Task<AdminSessionInfo?> GetSessionAsync(Guid sessionId, string correlationId)
    {
        try
        {
            var cacheKey = $"{SESSION_CACHE_PREFIX}{sessionId}";
            var serializedSession = await _cache.GetStringAsync(cacheKey);

            if (string.IsNullOrEmpty(serializedSession))
            {
                return null;
            }

            var session = JsonSerializer.Deserialize<AdminSession>(serializedSession);

            // Check if session is still valid
            if (session?.IsActive == true && session!.ExpiresAt > DateTime.UtcNow)
            {
                return new AdminSessionInfo
                {
                    Id = session.Id,
                    UserId = session.UserId,
                    IpAddress = session.IpAddress,
                    UserAgent = session.UserAgent,
                    CreatedAt = session.CreatedAt,
                    LastActivity = session.LastActivity,
                    ExpiresAt = session.ExpiresAt,
                    IsActive = session.IsActive
                };
            }

            // Session expired, remove it
            if (session != null)
            {
                await InvalidateSessionAsync(sessionId, correlationId);
            }

            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error getting admin session {SessionId}", correlationId, sessionId);
            return null;
        }
    }

    /// <summary>
    /// Update session activity and extend expiration
    /// </summary>
    public async Task<bool> UpdateSessionActivityAsync(Guid sessionId, string correlationId)
    {
        try
        {
            var sessionInfo = await GetSessionAsync(sessionId, correlationId);
            if (sessionInfo == null)
            {
                return false;
            }

            // We need to get the full session to update it
            var cacheKey = $"{SESSION_CACHE_PREFIX}{sessionId}";
            var serializedSession = await _cache.GetStringAsync(cacheKey);
            if (string.IsNullOrEmpty(serializedSession))
            {
                return false;
            }

            var session = JsonSerializer.Deserialize<AdminSession>(serializedSession);
            if (session == null)
            {
                return false;
            }

            // Update activity time and extend expiration
            session.LastActivity = DateTime.UtcNow;
            session.ExpiresAt = DateTime.UtcNow.AddMinutes(DEFAULT_SESSION_TIMEOUT_MINUTES);

            // Update in cache
            var updatedCacheKey = $"{SESSION_CACHE_PREFIX}{sessionId}";
            var updatedSerializedSession = JsonSerializer.Serialize(session);
            var cacheOptions = new DistributedCacheEntryOptions
            {
                AbsoluteExpiration = session.ExpiresAt
            };
            await _cache.SetStringAsync(updatedCacheKey, updatedSerializedSession, cacheOptions);

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error updating session activity for {SessionId}", correlationId, sessionId);
            return false;
        }
    }

    /// <summary>
    /// Get all active sessions for a user
    /// </summary>
    public async Task<List<AdminSession>> GetUserSessionsAsync(Guid userId, string correlationId)
    {
        try
        {
            await Task.CompletedTask; // Placeholder for async signature

            if (!_userSessions.TryGetValue(userId, out var sessions))
            {
                return new List<AdminSession>();
            }

            // Filter out expired sessions
            var activeSessions = sessions
                .Where(s => s.IsActive && s.ExpiresAt > DateTime.UtcNow)
                .OrderByDescending(s => s.LastActivity)
                .ToList();

            return activeSessions;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error getting user sessions for {UserId}", correlationId, userId);
            return new List<AdminSession>();
        }
    }

    /// <summary>
    /// Invalidate specific session
    /// </summary>
    public async Task<bool> InvalidateSessionAsync(Guid sessionId, string correlationId)
    {
        try
        {
            _logger.LogInformation("[{CorrelationId}] Invalidating admin session {SessionId}", correlationId, sessionId);

            // Remove from cache
            var cacheKey = $"{SESSION_CACHE_PREFIX}{sessionId}";
            await _cache.RemoveAsync(cacheKey);

            // Remove from memory cache
            // ✅ THREAD SAFETY FIX: ConcurrentBag doesn't support Remove, rebuild without the session
            foreach (var kvp in _userSessions)
            {
                var userSessions = kvp.Value;
                if (userSessions.Any(s => s.Id == sessionId))
                {
                    var updatedSessions = new ConcurrentBag<AdminSession>(userSessions.Where(s => s.Id != sessionId));
                    _userSessions.TryUpdate(kvp.Key, updatedSessions, userSessions);
                    break;
                }
            }

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error invalidating session {SessionId}", correlationId, sessionId);
            return false;
        }
    }

    /// <summary>
    /// Invalidate all sessions for a user
    /// </summary>
    public async Task<int> InvalidateUserSessionsAsync(Guid userId, string correlationId)
    {
        try
        {
            _logger.LogInformation("[{CorrelationId}] Invalidating all sessions for user {UserId}", correlationId, userId);

            if (!_userSessions.TryGetValue(userId, out var sessions))
            {
                return 0;
            }

            var invalidatedCount = 0;
            foreach (var session in sessions.ToList())
            {
                var success = await InvalidateSessionAsync(session.Id, correlationId);
                if (success)
                {
                    invalidatedCount++;
                }
            }

            // Clear the user's session list
            _userSessions.TryRemove(userId, out _);

            _logger.LogInformation("[{CorrelationId}] Invalidated {Count} sessions for user {UserId}", 
                correlationId, invalidatedCount, userId);

            return invalidatedCount;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error invalidating user sessions for {UserId}", correlationId, userId);
            return 0;
        }
    }

    /// <summary>
    /// Get session statistics
    /// </summary>
    public async Task<AdminSessionStatistics> GetSessionStatisticsAsync(string correlationId)
    {
        try
        {
            await Task.CompletedTask; // Placeholder for async signature

            var now = DateTime.UtcNow;
            var allSessions = _userSessions.Values.SelectMany(sessions => sessions).ToList();

            var activeSessions = allSessions.Where(s => s.IsActive && s.ExpiresAt > now).ToList();

            var stats = new AdminSessionStatistics
            {
                TotalActiveSessions = activeSessions.Count,
                UniqueActiveUsers = activeSessions.Select(s => s.UserId).Distinct().Count(),
                AverageSessionDuration = activeSessions.Any() 
                    ? TimeSpan.FromMinutes(activeSessions.Average(s => (now - s.CreatedAt).TotalMinutes))
                    : TimeSpan.Zero,
                SessionsCreatedToday = allSessions.Count(s => s.CreatedAt.Date == now.Date),
                SessionsByHour = activeSessions
                    .GroupBy(s => s.CreatedAt.Hour)
                    .ToDictionary(g => g.Key.ToString(), g => g.Count()),
                TopUserAgents = activeSessions
                    .GroupBy(s => s.UserAgent)
                    .OrderByDescending(g => g.Count())
                    .Take(5)
                    .ToDictionary(g => g.Key, g => g.Count()),
                TopIpAddresses = activeSessions
                    .GroupBy(s => s.IpAddress)
                    .OrderByDescending(g => g.Count())
                    .Take(10)
                    .ToDictionary(g => g.Key, g => g.Count())
            };

            return stats;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error getting session statistics", correlationId);
            throw;
        }
    }

    /// <summary>
    /// Cleanup expired sessions
    /// </summary>
    public async Task<int> CleanupExpiredSessionsAsync(string correlationId)
    {
        try
        {
            _logger.LogInformation("[{CorrelationId}] Cleaning up expired admin sessions", correlationId);

            var cleanedCount = 0;
            var now = DateTime.UtcNow;

            foreach (var kvp in _userSessions.ToList())
            {
                var userId = kvp.Key;
                var sessions = kvp.Value;

                var expiredSessions = sessions.Where(s => s.ExpiresAt <= now || !s.IsActive).ToList();
                
                foreach (var expiredSession in expiredSessions)
                {
                    await InvalidateSessionAsync(expiredSession.Id, correlationId);
                    cleanedCount++;
                }
            }

            _logger.LogInformation("[{CorrelationId}] Cleaned up {Count} expired sessions", correlationId, cleanedCount);
            return cleanedCount;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error cleaning up expired sessions", correlationId);
            return 0;
        }
    }

    /// <summary>
    /// Get active admin sessions
    /// </summary>
    public async Task<List<AdminSessionInfo>> GetActiveSessionsAsync(AdminSessionRequest request, string correlationId)
    {
        try
        {
            _logger.LogInformation("[{CorrelationId}] Getting active admin sessions", correlationId);

            var allSessions = new List<AdminSessionInfo>();
            var now = DateTime.UtcNow;

            foreach (var userSessions in _userSessions.Values)
            {
                foreach (var session in userSessions.Where(s => s.IsActive && s.ExpiresAt > now))
                {
                    allSessions.Add(new AdminSessionInfo
                    {
                        Id = session.Id,
                        UserId = session.UserId,
                        IpAddress = session.IpAddress,
                        UserAgent = session.UserAgent,
                        CreatedAt = session.CreatedAt,
                        LastActivity = session.LastActivity,
                        ExpiresAt = session.ExpiresAt,
                        IsActive = session.IsActive
                    });
                }
            }

            await Task.CompletedTask;
            return allSessions.OrderByDescending(s => s.LastActivity).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error getting active sessions", correlationId);
            throw;
        }
    }

    /// <summary>
    /// Create new admin session
    /// </summary>
    public async Task<AdminSessionInfo> CreateSessionAsync(
        Guid userId,
        string ipAddress,
        string userAgent,
        Dictionary<string, object>? sessionData,
        string correlationId)
    {
        try
        {
            var request = new AdminSessionRequest
            {
                UserId = userId,
                IpAddress = ipAddress,
                UserAgent = userAgent,
                Metadata = sessionData
            };

            var session = await CreateSessionAsync(request, correlationId);

            return new AdminSessionInfo
            {
                Id = session.Id,
                UserId = session.UserId,
                IpAddress = session.IpAddress,
                UserAgent = session.UserAgent,
                CreatedAt = session.CreatedAt,
                LastActivity = session.LastActivity,
                ExpiresAt = session.ExpiresAt,
                IsActive = session.IsActive
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error creating admin session", correlationId);
            throw;
        }
    }

    /// <summary>
    /// Update session last accessed time
    /// </summary>
    public async Task UpdateSessionAccessAsync(Guid sessionId, string correlationId)
    {
        try
        {
            await UpdateSessionActivityAsync(sessionId, correlationId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error updating session access", correlationId);
            throw;
        }
    }

    /// <summary>
    /// Terminate specific session
    /// </summary>
    public async Task<bool> TerminateSessionAsync(Guid sessionId, Guid terminatedBy, string reason, string correlationId)
    {
        try
        {
            _logger.LogInformation("[{CorrelationId}] Terminating session {SessionId} by user {TerminatedBy}, reason: {Reason}", 
                correlationId, sessionId, terminatedBy, reason);

            return await InvalidateSessionAsync(sessionId, correlationId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error terminating session", correlationId);
            return false;
        }
    }

    /// <summary>
    /// Terminate all sessions for a user
    /// </summary>
    public async Task<int> TerminateUserSessionsAsync(Guid userId, Guid terminatedBy, string reason, string correlationId)
    {
        try
        {
            _logger.LogInformation("[{CorrelationId}] Terminating all sessions for user {UserId} by {TerminatedBy}, reason: {Reason}", 
                correlationId, userId, terminatedBy, reason);

            return await InvalidateUserSessionsAsync(userId, correlationId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error terminating user sessions", correlationId);
            return 0;
        }
    }

    /// <summary>
    /// Validate session is still active and valid
    /// </summary>
    public async Task<bool> ValidateSessionAsync(Guid sessionId, string ipAddress, string correlationId)
    {
        try
        {
            var session = await GetSessionAsync(sessionId, correlationId);
            
            if (session == null || !session.IsActive || session.ExpiresAt <= DateTime.UtcNow)
            {
                return false;
            }

            // Check IP address consistency for security
            if (!string.IsNullOrEmpty(ipAddress) && session!.IpAddress != ipAddress)
            {
                _logger.LogWarning("[{CorrelationId}] IP address mismatch for session {SessionId}: expected {Expected}, got {Actual}",
                    correlationId, sessionId, session.IpAddress, ipAddress);
                return false;
            }

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error validating session", correlationId);
            return false;
        }
    }

    /// <summary>
    /// Get session statistics
    /// </summary>
    public async Task<Dictionary<string, object>> GetSessionStatisticsAsync(
        DateTime startDate,
        DateTime endDate,
        string correlationId)
    {
        try
        {
            _logger.LogInformation("[{CorrelationId}] Getting session statistics from {StartDate} to {EndDate}", 
                correlationId, startDate, endDate);

            var now = DateTime.UtcNow;
            var allSessions = _userSessions.Values.SelectMany(sessions => sessions).ToList();
            var activeSessions = allSessions.Where(s => s.IsActive && s.ExpiresAt > now).ToList();
            var periodSessions = allSessions.Where(s => s.CreatedAt >= startDate && s.CreatedAt <= endDate).ToList();

            var stats = new Dictionary<string, object>
            {
                ["totalActiveSessions"] = activeSessions.Count,
                ["uniqueActiveUsers"] = activeSessions.Select(s => s.UserId).Distinct().Count(),
                ["sessionsInPeriod"] = periodSessions.Count,
                ["averageSessionDuration"] = activeSessions.Any() 
                    ? activeSessions.Average(s => (now - s.CreatedAt).TotalMinutes)
                    : 0,
                ["sessionsByDay"] = periodSessions
                    .GroupBy(s => s.CreatedAt.Date)
                    .ToDictionary(g => g.Key.ToString("yyyy-MM-dd"), g => (object)g.Count()),
                ["topUserAgents"] = activeSessions
                    .GroupBy(s => s.UserAgent)
                    .OrderByDescending(g => g.Count())
                    .Take(5)
                    .ToDictionary(g => g.Key, g => (object)g.Count()),
                ["topIpAddresses"] = activeSessions
                    .GroupBy(s => s.IpAddress)
                    .OrderByDescending(g => g.Count())
                    .Take(10)
                    .ToDictionary(g => g.Key, g => (object)g.Count()),
                ["periodStart"] = startDate,
                ["periodEnd"] = endDate,
                ["generatedAt"] = DateTime.UtcNow
            };

            await Task.CompletedTask;
            return stats;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error getting session statistics", correlationId);
            throw;
        }
    }

    /// <summary>
    /// Force session timeout for security breach
    /// </summary>
    public async Task ForceSessionTimeoutAsync(Guid sessionId, string reason, string correlationId)
    {
        try
        {
            _logger.LogWarning("[{CorrelationId}] Forcing session timeout for {SessionId}, reason: {Reason}", 
                correlationId, sessionId, reason);

            await InvalidateSessionAsync(sessionId, correlationId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error forcing session timeout", correlationId);
            throw;
        }
    }

    /// <summary>
    /// Get concurrent session count for user
    /// </summary>
    public async Task<int> GetUserConcurrentSessionCountAsync(Guid userId, string correlationId)
    {
        try
        {
            var sessions = await GetUserSessionsAsync(userId, correlationId);
            return sessions.Count(s => s.IsActive);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error getting user concurrent session count", correlationId);
            return 0;
        }
    }

    /// <summary>
    /// Check for suspicious session activity
    /// </summary>
    public async Task<List<SuspiciousSessionActivity>> DetectSuspiciousActivityAsync(
        DateTime startDate,
        DateTime endDate,
        string correlationId)
    {
        try
        {
            _logger.LogInformation("[{CorrelationId}] Detecting suspicious session activity from {StartDate} to {EndDate}", 
                correlationId, startDate, endDate);

            var suspiciousActivities = new List<SuspiciousSessionActivity>();
            var allSessions = _userSessions.Values.SelectMany(sessions => sessions).ToList();
            var periodSessions = allSessions.Where(s => s.CreatedAt >= startDate && s.CreatedAt <= endDate).ToList();

            // Check for multiple IP addresses per user
            var userIpGroups = periodSessions
                .GroupBy(s => s.UserId)
                .Where(g => g.Select(s => s.IpAddress).Distinct().Count() > 3) // More than 3 different IPs
                .ToList();

            foreach (var userGroup in userIpGroups)
            {
                var ipAddresses = userGroup.Select(s => s.IpAddress).Distinct().ToList();
                // FIXED: Week 1 Day 5 - Use FirstOrDefault to prevent exceptions when detecting suspicious activity
                var firstSession = userGroup.FirstOrDefault();
                if (firstSession == null) continue;

                suspiciousActivities.Add(new SuspiciousSessionActivity
                {
                    SessionId = firstSession.Id,
                    UserId = userGroup.Key,
                    UserEmail = "user@example.com", // Would come from user lookup
                    ActivityType = "MultipleIPs",
                    Description = $"User accessed from {ipAddresses.Count} different IP addresses",
                    RiskLevel = "Medium",
                    DetectedAt = DateTime.UtcNow,
                    IpAddresses = ipAddresses,
                    SuspiciousIndicators = new Dictionary<string, object>
                    {
                        ["ipCount"] = ipAddresses.Count,
                        ["sessionCount"] = userGroup.Count()
                    }
                });
            }

            // Check for rapid session creation
            var rapidCreationUsers = periodSessions
                .GroupBy(s => s.UserId)
                .Where(g => g.Count() > 10) // More than 10 sessions in period
                .ToList();

            foreach (var userGroup in rapidCreationUsers)
            {
                // FIXED: Week 1 Day 5 - Use FirstOrDefault to prevent exceptions when detecting rapid session creation
                var firstSession = userGroup.FirstOrDefault();
                if (firstSession == null) continue;

                suspiciousActivities.Add(new SuspiciousSessionActivity
                {
                    SessionId = firstSession.Id,
                    UserId = userGroup.Key,
                    UserEmail = "user@example.com",
                    ActivityType = "RapidSessions",
                    Description = $"User created {userGroup.Count()} sessions in short timeframe",
                    RiskLevel = "High",
                    DetectedAt = DateTime.UtcNow,
                    IpAddresses = userGroup.Select(s => s.IpAddress).Distinct().ToList(),
                    SuspiciousIndicators = new Dictionary<string, object>
                    {
                        ["sessionCount"] = userGroup.Count(),
                        ["timeSpan"] = (endDate - startDate).TotalHours
                    }
                });
            }

            await Task.CompletedTask;
            return suspiciousActivities;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error detecting suspicious activity", correlationId);
            throw;
        }
    }
}
