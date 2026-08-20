using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service for managing admin user sessions with enhanced security
/// </summary>
public interface IAdminSessionService
{
    /// <summary>
    /// Get active admin sessions
    /// </summary>
    Task<List<AdminSessionInfo>> GetActiveSessionsAsync(AdminSessionRequest request, string correlationId);

    /// <summary>
    /// Get session details by ID
    /// </summary>
    Task<AdminSessionInfo?> GetSessionAsync(Guid sessionId, string correlationId);

    /// <summary>
    /// Create new admin session
    /// </summary>
    Task<AdminSessionInfo> CreateSessionAsync(
        Guid userId,
        string ipAddress,
        string userAgent,
        Dictionary<string, object>? sessionData,
        string correlationId);

    /// <summary>
    /// Update session last accessed time
    /// </summary>
    Task UpdateSessionAccessAsync(Guid sessionId, string correlationId);

    /// <summary>
    /// Terminate specific session
    /// </summary>
    Task<bool> TerminateSessionAsync(Guid sessionId, Guid terminatedBy, string reason, string correlationId);

    /// <summary>
    /// Terminate all sessions for a user
    /// </summary>
    Task<int> TerminateUserSessionsAsync(Guid userId, Guid terminatedBy, string reason, string correlationId);

    /// <summary>
    /// Validate session is still active and valid
    /// </summary>
    Task<bool> ValidateSessionAsync(Guid sessionId, string ipAddress, string correlationId);

    /// <summary>
    /// Get session statistics
    /// </summary>
    Task<Dictionary<string, object>> GetSessionStatisticsAsync(
        DateTime startDate,
        DateTime endDate,
        string correlationId);

    /// <summary>
    /// Cleanup expired sessions
    /// </summary>
    Task<int> CleanupExpiredSessionsAsync(string correlationId);

    /// <summary>
    /// Force session timeout for security breach
    /// </summary>
    Task ForceSessionTimeoutAsync(Guid sessionId, string reason, string correlationId);

    /// <summary>
    /// Get concurrent session count for user
    /// </summary>
    Task<int> GetUserConcurrentSessionCountAsync(Guid userId, string correlationId);

    /// <summary>
    /// Check for suspicious session activity
    /// </summary>
    Task<List<SuspiciousSessionActivity>> DetectSuspiciousActivityAsync(
        DateTime startDate,
        DateTime endDate,
        string correlationId);
}

// Supporting models
public class SuspiciousSessionActivity
{
    public Guid SessionId { get; set; }
    public Guid UserId { get; set; }
    public string UserEmail { get; set; } = string.Empty;
    public string ActivityType { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string RiskLevel { get; set; } = string.Empty;
    public DateTime DetectedAt { get; set; }
    public List<string> IpAddresses { get; set; } = new();
    public Dictionary<string, object> SuspiciousIndicators { get; set; } = new();
}