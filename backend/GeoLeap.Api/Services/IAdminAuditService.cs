using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service for comprehensive audit logging and analysis
/// </summary>
public interface IAdminAuditService
{
    /// <summary>
    /// Get audit logs with advanced filtering and search
    /// </summary>
    Task<AdminAuditLogResponse> GetAuditLogsAsync(AdminAuditLogRequest request, string correlationId);

    /// <summary>
    /// Get specific audit log entry
    /// </summary>
    Task<AdminAuditLogEntry?> GetAuditLogAsync(Guid auditLogId, string correlationId);

    /// <summary>
    /// Export audit logs in various formats
    /// </summary>
    Task<Stream> ExportAuditLogsAsync(
        AdminAuditLogRequest searchRequest,
        string format,
        Guid requestedBy,
        string correlationId);

    /// <summary>
    /// Get audit statistics and analytics
    /// </summary>
    Task<Dictionary<string, object>> GetAuditStatisticsAsync(
        DateTime startDate,
        DateTime endDate,
        string groupBy,
        string correlationId);

    /// <summary>
    /// Get failed action patterns for security analysis
    /// </summary>
    Task<List<FailedActionPattern>> GetFailedActionPatternsAsync(
        DateTime startDate,
        DateTime endDate,
        int minOccurrences,
        string correlationId);

    /// <summary>
    /// Get user activity timeline for audit purposes
    /// </summary>
    Task<List<UserAuditTimelineEntry>> GetUserAuditTimelineAsync(
        Guid userId,
        DateTime startDate,
        DateTime endDate,
        int page,
        int pageSize,
        string correlationId);

    /// <summary>
    /// Get security events and anomalies
    /// </summary>
    Task<List<SecurityAuditEvent>> GetSecurityEventsAsync(
        DateTime startDate,
        DateTime endDate,
        string? severity,
        int page,
        int pageSize,
        string correlationId);

    /// <summary>
    /// Get correlated actions by correlation ID
    /// </summary>
    Task<List<AdminAuditLogEntry>> GetCorrelatedActionsAsync(string correlationId, string requestCorrelationId);

    /// <summary>
    /// Archive old audit logs to reduce database size
    /// </summary>
    Task<ArchiveResult> ArchiveOldAuditLogsAsync(
        int olderThanDays,
        bool dryRun,
        Guid performedBy,
        string correlationId);

    /// <summary>
    /// Generate compliance report for audit logs
    /// </summary>
    Task<ComplianceReport> GenerateComplianceReportAsync(
        DateTime startDate,
        DateTime endDate,
        string complianceStandard,
        string correlationId);

    /// <summary>
    /// Log admin action for audit trail
    /// </summary>
    Task LogAdminActionAsync(
        Guid adminUserId,
        string action,
        string resource,
        Dictionary<string, object>? details,
        bool success,
        string? errorMessage,
        Guid? affectedUserId,
        string ipAddress,
        string? userAgent,
        string correlationId);

    /// <summary>
    /// Log security event for monitoring
    /// </summary>
    Task LogSecurityEventAsync(
        string eventType,
        string severity,
        string description,
        Guid? userId,
        string ipAddress,
        Dictionary<string, object>? metadata,
        string correlationId);

    /// <summary>
    /// Detect suspicious activity patterns
    /// </summary>
    Task<List<SuspiciousActivityPattern>> DetectSuspiciousActivityAsync(
        DateTime startDate,
        DateTime endDate,
        string correlationId);

    /// <summary>
    /// Get audit retention policy status
    /// </summary>
    Task<AuditRetentionStatus> GetRetentionStatusAsync(string correlationId);

    /// <summary>
    /// Update audit retention policy
    /// </summary>
    Task<bool> UpdateRetentionPolicyAsync(
        AuditRetentionPolicy policy,
        Guid updatedBy,
        string correlationId);
}

// Supporting models
public class SuspiciousActivityPattern
{
    public string PatternType { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string RiskLevel { get; set; } = string.Empty;
    public int OccurrenceCount { get; set; }
    public List<Guid> InvolvedUsers { get; set; } = new();
    public List<string> IpAddresses { get; set; } = new();
    public DateTime FirstDetected { get; set; }
    public DateTime LastDetected { get; set; }
    public Dictionary<string, object> PatternData { get; set; } = new();
}

public class AuditRetentionStatus
{
    public int TotalAuditLogs { get; set; }
    public int CurrentRetentionDays { get; set; }
    public DateTime OldestLogDate { get; set; }
    public long DatabaseSizeMB { get; set; }
    public int EligibleForArchival { get; set; }
    public DateTime LastArchivalDate { get; set; }
    public string RetentionPolicy { get; set; } = string.Empty;
}

public class AuditRetentionPolicy
{
    public int RetentionDays { get; set; }
    public bool AutoArchiveEnabled { get; set; }
    public int ArchiveAfterDays { get; set; }
    public string ArchiveLocation { get; set; } = string.Empty;
    public bool CompressArchives { get; set; }
    public List<string> CriticalActionsToRetain { get; set; } = new();
}