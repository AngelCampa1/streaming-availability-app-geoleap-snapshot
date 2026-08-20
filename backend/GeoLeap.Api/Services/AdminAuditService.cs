using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service for comprehensive audit logging and analysis
/// </summary>
public class AdminAuditService : IAdminAuditService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<AdminAuditService> _logger;

    public AdminAuditService(ApplicationDbContext context, ILogger<AdminAuditService> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Get audit logs with advanced filtering and search
    /// </summary>
    public async Task<AdminAuditLogResponse> GetAuditLogsAsync(AdminAuditLogRequest request, string correlationId)
    {
        try
        {
            _logger.LogInformation("[{CorrelationId}] Retrieving audit logs with request: {@Request}", correlationId, request);

            var query = _context.AuditLogs.AsQueryable();

            // Apply filters
            if (request.StartDate.HasValue)
                query = query.Where(a => a.CreatedAt >= request.StartDate.Value);

            if (request.EndDate.HasValue)
                query = query.Where(a => a.CreatedAt <= request.EndDate.Value);

            if (!string.IsNullOrEmpty(request.Action))
                query = query.Where(a => a.Action.Contains(request.Action));

            if (!string.IsNullOrEmpty(request.Entity))
                query = query.Where(a => a.EntityType.Contains(request.Entity));

            if (request.UserId.HasValue)
                query = query.Where(a => a.UserId == request.UserId.Value);

            var totalCount = await query.CountAsync();

            var logs = await query
                .OrderByDescending(a => a.CreatedAt)
                .Skip((request.Page - 1) * request.PageSize)
                .Take(request.PageSize)
                .Select(a => new AdminAuditLogEntry
                {
                    Id = a.Id,
                    UserId = a.UserId,
                    Action = a.Action,
                    EntityType = a.EntityType ?? string.Empty,
                    EntityId = a.EntityId ?? string.Empty,
                    OldValues = a.OldValues ?? string.Empty,
                    NewValues = a.NewValues ?? string.Empty,
                    CreatedAt = a.CreatedAt,
                    IpAddress = a.IpAddress ?? string.Empty,
                    UserAgent = a.UserAgent ?? string.Empty
                })
                .ToListAsync();

            return new AdminAuditLogResponse
            {
                Logs = logs,
                TotalCount = totalCount,
                Page = request.Page,
                PageSize = request.PageSize,
                TotalPages = (int)Math.Ceiling((double)totalCount / request.PageSize)
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error retrieving audit logs", correlationId);
            throw;
        }
    }

    /// <summary>
    /// Get specific audit log entry
    /// </summary>
    public async Task<AdminAuditLogEntry?> GetAuditLogAsync(Guid auditLogId, string correlationId)
    {
        try
        {
            var log = await _context.AuditLogs
                .Where(a => a.Id == auditLogId)
                .Select(a => new AdminAuditLogEntry
                {
                    Id = a.Id,
                    UserId = a.UserId,
                    Action = a.Action,
                    EntityType = a.EntityType ?? string.Empty,
                    EntityId = a.EntityId ?? string.Empty,
                    OldValues = a.OldValues ?? string.Empty,
                    NewValues = a.NewValues ?? string.Empty,
                    CreatedAt = a.CreatedAt,
                    IpAddress = a.IpAddress ?? string.Empty,
                    UserAgent = a.UserAgent ?? string.Empty
                })
                .FirstOrDefaultAsync();

            return log;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error retrieving audit log {AuditLogId}", correlationId, auditLogId);
            throw;
        }
    }

    /// <summary>
    /// Export audit logs in various formats
    /// </summary>
    public async Task<Stream> ExportAuditLogsAsync(
        AdminAuditLogRequest searchRequest,
        string format,
        Guid requestedBy,
        string correlationId)
    {
        try
        {
            _logger.LogInformation("[{CorrelationId}] Exporting audit logs in format: {Format}", correlationId, format);

            // Get all matching logs without pagination
            var fullRequest = new AdminAuditLogRequest
            {
                UserId = searchRequest.UserId,
                Action = searchRequest.Action,
                EntityId = searchRequest.EntityId,
                EntityType = searchRequest.EntityType,
                StartDate = searchRequest.StartDate,
                EndDate = searchRequest.EndDate,
                IpAddress = searchRequest.IpAddress,
                UserAgent = searchRequest.UserAgent,
                Page = 1,
                PageSize = 10000
            };
            var response = await GetAuditLogsAsync(fullRequest, correlationId);

            var stream = new MemoryStream();
            var writer = new StreamWriter(stream);

            if (format.Equals("csv", StringComparison.OrdinalIgnoreCase))
            {
                // Write CSV header
                await writer.WriteLineAsync("Id,UserId,Action,EntityType,EntityId,CreatedAt,IpAddress");

                // Write data rows
                foreach (var log in response.Logs)
                {
                    await writer.WriteLineAsync($"{log.Id},{log.UserId},{log.Action},{log.EntityType},{log.EntityId},{log.CreatedAt:yyyy-MM-dd HH:mm:ss},{log.IpAddress}");
                }
            }
            else
            {
                // Default to JSON
                var json = JsonSerializer.Serialize(response.Logs, new JsonSerializerOptions { WriteIndented = true });
                await writer.WriteAsync(json);
            }

            await writer.FlushAsync();
            stream.Position = 0;

            return stream;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error exporting audit logs", correlationId);
            throw;
        }
    }

    /// <summary>
    /// Get audit statistics and analytics
    /// </summary>
    public async Task<Dictionary<string, object>> GetAuditStatisticsAsync(
        DateTime startDate,
        DateTime endDate,
        string groupBy,
        string correlationId)
    {
        try
        {
            var query = _context.AuditLogs
                .Where(a => a.CreatedAt >= startDate && a.CreatedAt <= endDate);

            var stats = new Dictionary<string, object>();

            // Total count
            stats["totalEntries"] = await query.CountAsync();

            // Group by action
            stats["byAction"] = await query
                .GroupBy(a => a.Action)
                .Select(g => new { Action = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Action, x => (object)x.Count);

            // Group by entity type
            stats["byEntityType"] = await query
                .GroupBy(a => a.EntityType)
                .Select(g => new { EntityType = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.EntityType, x => (object)x.Count);

            // Daily counts
            stats["dailyCounts"] = await query
                .GroupBy(a => a.CreatedAt.Date)
                .Select(g => new { Date = g.Key, Count = g.Count() })
                .OrderBy(x => x.Date)
                .ToDictionaryAsync(x => x.Date.ToString("yyyy-MM-dd"), x => (object)x.Count);

            return stats;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error generating audit statistics", correlationId);
            throw;
        }
    }

    /// <summary>
    /// Get failed action patterns for security analysis
    /// </summary>
    public async Task<List<FailedActionPattern>> GetFailedActionPatternsAsync(
        DateTime startDate,
        DateTime endDate,
        int minOccurrences,
        string correlationId)
    {
        try
        {
            var patterns = await _context.AuditLogs
                .Where(a => a.CreatedAt >= startDate && a.CreatedAt <= endDate)
                .Where(a => a.Action.Contains("Failed") || a.Action.Contains("Error"))
                .GroupBy(a => new { a.Action, a.IpAddress })
                .Where(g => g.Count() >= minOccurrences)
                .Select(g => new FailedActionPattern
                {
                    Action = g.Key.Action ?? string.Empty,
                    IpAddress = g.Key.IpAddress ?? string.Empty,
                    Count = g.Count(),
                    FirstOccurrence = g.Min(a => a.CreatedAt),
                    LastOccurrence = g.Max(a => a.CreatedAt)
                })
                .OrderByDescending(p => p.Count)
                .ToListAsync();

            return patterns;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error retrieving failed action patterns", correlationId);
            throw;
        }
    }

    /// <summary>
    /// Get user activity timeline for audit purposes
    /// </summary>
    public async Task<List<UserAuditTimelineEntry>> GetUserAuditTimelineAsync(
        Guid userId,
        DateTime startDate,
        DateTime endDate,
        int page,
        int pageSize,
        string correlationId)
    {
        try
        {
            var query = _context.AuditLogs
                .Where(a => a.UserId == userId)
                .Where(a => a.CreatedAt >= startDate && a.CreatedAt <= endDate);

            var timeline = await query
                .OrderByDescending(a => a.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(a => new UserAuditTimelineEntry
                {
                    Id = a.Id,
                    Action = a.Action ?? string.Empty,
                    EntityType = a.EntityType ?? string.Empty,
                    EntityId = a.EntityId ?? string.Empty,
                    CreatedAt = a.CreatedAt,
                    IpAddress = a.IpAddress ?? string.Empty,
                    Details = a.NewValues
                })
                .ToListAsync();

            return timeline;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error retrieving user audit timeline for user {UserId}", correlationId, userId);
            throw;
        }
    }

    /// <summary>
    /// Get security events and anomalies
    /// </summary>
    public async Task<List<SecurityAuditEvent>> GetSecurityEventsAsync(
        DateTime startDate,
        DateTime endDate,
        string? severity,
        int page,
        int pageSize,
        string correlationId)
    {
        try
        {
            var query = _context.SecurityEvents
                .Where(e => e.CreatedAt >= startDate && e.CreatedAt <= endDate);

            if (!string.IsNullOrEmpty(severity))
                query = query.Where(e => e.Severity == severity);

            var events = await query
                .OrderByDescending(e => e.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(e => new SecurityAuditEvent
                {
                    Id = e.Id,
                    EventType = e.EventType ?? string.Empty,
                    Severity = e.Severity ?? string.Empty,
                    Description = e.Description ?? string.Empty,
                    UserId = e.UserId,
                    IpAddress = e.IpAddress ?? string.Empty,
                    CreatedAt = e.CreatedAt,
                    Metadata = e.Metadata
                })
                .ToListAsync();

            return events;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error retrieving security events", correlationId);
            throw;
        }
    }

    /// <summary>
    /// Get correlated actions by correlation ID
    /// </summary>
    public async Task<List<AdminAuditLogEntry>> GetCorrelatedActionsAsync(string correlationId, string requestCorrelationId)
    {
        try
        {
            var actions = await _context.AuditLogs
                .Where(a => a.CorrelationId == correlationId)
                .Select(a => new AdminAuditLogEntry
                {
                    Id = a.Id,
                    UserId = a.UserId,
                    Action = a.Action,
                    EntityType = a.EntityType ?? string.Empty,
                    EntityId = a.EntityId ?? string.Empty,
                    OldValues = a.OldValues ?? string.Empty,
                    NewValues = a.NewValues ?? string.Empty,
                    CreatedAt = a.CreatedAt,
                    IpAddress = a.IpAddress ?? string.Empty,
                    UserAgent = a.UserAgent ?? string.Empty
                })
                .ToListAsync();

            return actions;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{RequestCorrelationId}] Error retrieving correlated actions for {CorrelationId}", requestCorrelationId, correlationId);
            throw;
        }
    }

    /// <summary>
    /// Archive old audit logs to reduce database size
    /// </summary>
    public async Task<ArchiveResult> ArchiveOldAuditLogsAsync(
        int olderThanDays,
        bool dryRun,
        Guid performedBy,
        string correlationId)
    {
        try
        {
            var cutoffDate = DateTime.UtcNow.AddDays(-olderThanDays);
            var query = _context.AuditLogs.Where(a => a.CreatedAt < cutoffDate);
            var eligibleCount = await query.CountAsync();

            if (dryRun)
            {
                return new ArchiveResult
                {
                    Success = true,
                    ProcessedRecords = eligibleCount,
                    ArchivedRecords = 0,
                    DryRun = true,
                    Message = $"Would archive {eligibleCount} audit log records"
                };
            }

            var recordsToArchive = await query.ToListAsync();
            _context.AuditLogs.RemoveRange(recordsToArchive);
            await _context.SaveChangesAsync();

            return new ArchiveResult
            {
                Success = true,
                ProcessedRecords = eligibleCount,
                ArchivedRecords = eligibleCount,
                DryRun = false,
                Message = $"Successfully archived {eligibleCount} audit log records"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error archiving audit logs", correlationId);
            throw;
        }
    }

    /// <summary>
    /// Generate compliance report for audit logs
    /// </summary>
    public async Task<ComplianceReport> GenerateComplianceReportAsync(
        DateTime startDate,
        DateTime endDate,
        string complianceStandard,
        string correlationId)
    {
        try
        {
            var logs = await _context.AuditLogs
                .Where(a => a.CreatedAt >= startDate && a.CreatedAt <= endDate)
                .ToListAsync();

            var report = new ComplianceReport
            {
                Standard = complianceStandard,
                ReportPeriod = new DateRange { Start = startDate, End = endDate },
                TotalEvents = logs.Count,
                SecurityEvents = logs.Count(l => l.Action.Contains("Security")),
                AccessEvents = logs.Count(l => l.Action.Contains("Access")),
                GeneratedAt = DateTime.UtcNow
            };

            return report;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error generating compliance report", correlationId);
            throw;
        }
    }

    /// <summary>
    /// Log admin action for audit trail
    /// </summary>
    public async Task LogAdminActionAsync(
        Guid adminUserId,
        string action,
        string resource,
        Dictionary<string, object>? details,
        bool success,
        string? errorMessage,
        Guid? affectedUserId,
        string ipAddress,
        string? userAgent,
        string correlationId)
    {
        try
        {
            var auditLog = new AuditLog
            {
                Id = Guid.NewGuid(),
                UserId = adminUserId,
                Action = $"Admin: {action}",
                EntityType = resource,
                EntityId = affectedUserId?.ToString() ?? resource,
                NewValues = JsonSerializer.Serialize(details ?? new Dictionary<string, object>()),
                OldValues = success ? "SUCCESS" : $"FAILED: {errorMessage}",
                CreatedAt = DateTime.UtcNow,
                IpAddress = ipAddress,
                UserAgent = userAgent,
                CorrelationId = correlationId
            };

            _context.AuditLogs.Add(auditLog);
            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error logging admin action", correlationId);
            throw;
        }
    }

    /// <summary>
    /// Log security event for monitoring
    /// </summary>
    public async Task LogSecurityEventAsync(
        string eventType,
        string severity,
        string description,
        Guid? userId,
        string ipAddress,
        Dictionary<string, object>? metadata,
        string correlationId)
    {
        try
        {
            var securityEvent = new SecurityEvent
            {
                Id = Guid.NewGuid(),
                EventType = eventType,
                Description = description,
                UserId = userId ?? Guid.Empty,
                IpAddress = ipAddress,
                Metadata = JsonSerializer.Serialize(metadata ?? new Dictionary<string, object>()),
                CreatedAt = DateTime.UtcNow
            };

            _context.SecurityEvents.Add(securityEvent);
            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error logging security event", correlationId);
            throw;
        }
    }

    /// <summary>
    /// Detect suspicious activity patterns
    /// </summary>
    public async Task<List<SuspiciousActivityPattern>> DetectSuspiciousActivityAsync(
        DateTime startDate,
        DateTime endDate,
        string correlationId)
    {
        try
        {
            var patterns = new List<SuspiciousActivityPattern>();

            // Pattern 1: Multiple failed logins from same IP
            var failedLogins = await _context.AuditLogs
                .Where(a => a.CreatedAt >= startDate && a.CreatedAt <= endDate)
                .Where(a => a.Action.Contains("Failed") && a.Action.Contains("Login"))
                .GroupBy(a => a.IpAddress)
                .Where(g => g.Count() >= 5)
                .Select(g => new SuspiciousActivityPattern
                {
                    PatternType = "Multiple Failed Logins",
                    Description = $"Multiple failed login attempts from IP {g.Key}",
                    RiskLevel = "High",
                    OccurrenceCount = g.Count(),
                    IpAddresses = new List<string> { g.Key ?? string.Empty },
                    FirstDetected = g.Min(a => a.CreatedAt),
                    LastDetected = g.Max(a => a.CreatedAt)
                })
                .ToListAsync();

            patterns.AddRange(failedLogins);
            return patterns;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error detecting suspicious activity", correlationId);
            throw;
        }
    }

    /// <summary>
    /// Get audit retention policy status
    /// </summary>
    public async Task<AuditRetentionStatus> GetRetentionStatusAsync(string correlationId)
    {
        try
        {
            var totalLogs = await _context.AuditLogs.CountAsync();
            var oldestLog = await _context.AuditLogs.MinAsync(a => (DateTime?)a.CreatedAt);
            oldestLog ??= DateTime.UtcNow;
            
            return new AuditRetentionStatus
            {
                TotalAuditLogs = totalLogs,
                CurrentRetentionDays = 365,
                OldestLogDate = oldestLog ?? DateTime.UtcNow,
                DatabaseSizeMB = totalLogs * 2 / 1024, // Rough estimate
                EligibleForArchival = await _context.AuditLogs.CountAsync(a => a.CreatedAt < DateTime.UtcNow.AddDays(-365)),
                LastArchivalDate = DateTime.UtcNow.AddMonths(-1),
                RetentionPolicy = "Standard 365-day retention"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error getting retention status", correlationId);
            throw;
        }
    }

    /// <summary>
    /// Update audit retention policy
    /// </summary>
    public async Task<bool> UpdateRetentionPolicyAsync(
        AuditRetentionPolicy policy,
        Guid updatedBy,
        string correlationId)
    {
        try
        {
            // In a real implementation, this would update configuration
            await LogAdminActionAsync(
                updatedBy,
                "Update Retention Policy",
                "AuditRetentionPolicy",
                new Dictionary<string, object> 
                {
                    { "retentionDays", policy.RetentionDays },
                    { "autoArchiveEnabled", policy.AutoArchiveEnabled }
                },
                true,
                null,
                null,
                "127.0.0.1",
                null,
                correlationId);

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error updating retention policy", correlationId);
            throw;
        }
    }
}
