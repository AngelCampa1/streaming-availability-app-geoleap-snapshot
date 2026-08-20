using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using GeoLeap.Api.Attributes;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using System.Security.Claims;

namespace GeoLeap.Api.Controllers;

[ApiController]
[Route("api/admin/audit")]
[Authorize]
[RequirePermission("admin", "audit:view")]
public class AdminAuditController : ControllerBase
{
    private readonly IAdminAuditService _auditService;
    private readonly ILogger<AdminAuditController> _logger;

    public AdminAuditController(
        IAdminAuditService auditService,
        ILogger<AdminAuditController> logger)
    {
        _auditService = auditService;
        _logger = logger;
    }

    /// <summary>
    /// Search audit logs with advanced filtering
    /// </summary>
    [HttpGet("logs")]
    public async Task<ActionResult<AdminAuditLogResponse>> GetAuditLogs([FromQuery] AdminAuditLogRequest request)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var result = await _auditService.GetAuditLogsAsync(request, correlationId);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving audit logs");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get specific audit log entry
    /// </summary>
    [HttpGet("logs/{auditLogId:guid}")]
    public async Task<ActionResult<AdminAuditLogEntry>> GetAuditLog(Guid auditLogId)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var auditLog = await _auditService.GetAuditLogAsync(auditLogId, correlationId);
            
            if (auditLog == null)
                return NotFound($"Audit log with ID {auditLogId} not found");

            return Ok(auditLog);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving audit log {AuditLogId}", auditLogId);
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Export audit logs in various formats
    /// </summary>
    [HttpPost("logs/export")]
    [RequirePermission("admin:audit:export")]
    public async Task<IActionResult> ExportAuditLogs([FromBody] AuditLogExportRequest request)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var requestedBy = GetCurrentUserId();
            
            if (requestedBy == null)
                return Unauthorized("User ID not found in token");

            var dataStream = await _auditService.ExportAuditLogsAsync(
                request.SearchRequest, request.Format, requestedBy.Value, correlationId);

            var contentType = request.Format.ToLower() switch
            {
                "csv" => "text/csv",
                "json" => "application/json",
                "xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                _ => "application/octet-stream"
            };

            var fileName = $"audit_logs_{DateTime.UtcNow:yyyyMMdd_HHmmss}.{request.Format}";
            return File(dataStream, contentType, fileName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error exporting audit logs");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get audit statistics and analytics
    /// </summary>
    [HttpGet("statistics")]
    public async Task<ActionResult<Dictionary<string, object>>> GetAuditStatistics(
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        [FromQuery] string? groupBy = "day")
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var start = startDate ?? DateTime.UtcNow.AddDays(-30);
            var end = endDate ?? DateTime.UtcNow;
            
            var statistics = await _auditService.GetAuditStatisticsAsync(start, end, groupBy ?? "day", correlationId);
            return Ok(statistics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving audit statistics");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get failed action patterns for security analysis
    /// </summary>
    [HttpGet("failed-actions")]
    [RequirePermission("admin:security:view")]
    public async Task<ActionResult<List<FailedActionPattern>>> GetFailedActionPatterns(
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        [FromQuery] int minOccurrences = 5)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var start = startDate ?? DateTime.UtcNow.AddDays(-7);
            var end = endDate ?? DateTime.UtcNow;
            
            var patterns = await _auditService.GetFailedActionPatternsAsync(start, end, minOccurrences, correlationId);
            return Ok(patterns);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving failed action patterns");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get user activity timeline for audit purposes
    /// </summary>
    [HttpGet("users/{userId:guid}/timeline")]
    public async Task<ActionResult<List<UserAuditTimelineEntry>>> GetUserAuditTimeline(
        Guid userId,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var start = startDate ?? DateTime.UtcNow.AddDays(-30);
            var end = endDate ?? DateTime.UtcNow;
            
            var timeline = await _auditService.GetUserAuditTimelineAsync(
                userId, start, end, page, pageSize, correlationId);
            
            return Ok(timeline);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving user audit timeline for {UserId}", userId);
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get security events and anomalies
    /// </summary>
    [HttpGet("security-events")]
    [RequirePermission("admin:security:view")]
    public async Task<ActionResult<List<SecurityAuditEvent>>> GetSecurityEvents(
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        [FromQuery] string? severity = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var start = startDate ?? DateTime.UtcNow.AddDays(-7);
            var end = endDate ?? DateTime.UtcNow;
            
            var events = await _auditService.GetSecurityEventsAsync(
                start, end, severity, page, pageSize, correlationId);
            
            return Ok(events);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving security events");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get admin action correlation analysis
    /// </summary>
    [HttpGet("correlation/{correlationId}")]
    public async Task<ActionResult<List<AdminAuditLogEntry>>> GetCorrelatedActions(string correlationId)
    {
        try
        {
            var requestCorrelationId = HttpContext.TraceIdentifier;
            var correlatedActions = await _auditService.GetCorrelatedActionsAsync(correlationId, requestCorrelationId);
            return Ok(correlatedActions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving correlated actions for {CorrelationId}", correlationId);
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Archive old audit logs
    /// </summary>
    [HttpPost("archive")]
    [RequirePermission("admin:audit:archive")]
    public async Task<ActionResult> ArchiveOldAuditLogs([FromBody] ArchiveAuditLogsRequest request)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var performedBy = GetCurrentUserId();
            
            if (performedBy == null)
                return Unauthorized("User ID not found in token");

            var result = await _auditService.ArchiveOldAuditLogsAsync(
                request.OlderThanDays, request.DryRun, performedBy.Value, correlationId);
            
            return Ok(new { 
                Message = request.DryRun ? "Dry run completed" : "Archive operation completed",
                ArchivedCount = result.ArchivedCount,
                ArchiveFile = result.ArchiveFile
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error archiving old audit logs");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get compliance report for audit logs
    /// </summary>
    [HttpGet("compliance-report")]
    [RequirePermission("admin:compliance:view")]
    public async Task<ActionResult<ComplianceReport>> GetComplianceReport(
        [FromQuery] DateTime startDate,
        [FromQuery] DateTime endDate,
        [FromQuery] string? complianceStandard = "SOX")
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var report = await _auditService.GenerateComplianceReportAsync(
                startDate, endDate, complianceStandard ?? "SOX", correlationId);
            
            return Ok(report);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating compliance report");
            return StatusCode(500, "Internal server error");
        }
    }

    private Guid? GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(userIdClaim, out var userId) ? userId : null;
    }
}

// Supporting DTOs
public class AuditLogExportRequest
{
    public AdminAuditLogRequest SearchRequest { get; set; } = new();
    public string Format { get; set; } = "csv";
}

public class ArchiveAuditLogsRequest
{
    public int OlderThanDays { get; set; } = 365;
    public bool DryRun { get; set; } = true;
}

public class ArchiveResult
{
    public int ArchivedCount { get; set; }
    public string? ArchiveFile { get; set; }
}

public class FailedActionPattern
{
    public string Action { get; set; } = string.Empty;
    public string Resource { get; set; } = string.Empty;
    public int FailureCount { get; set; }
    public List<string> CommonErrors { get; set; } = new();
    public List<string> IpAddresses { get; set; } = new();
    public DateTime FirstOccurrence { get; set; }
    public DateTime LastOccurrence { get; set; }
    public string RiskLevel { get; set; } = string.Empty;
}

public class UserAuditTimelineEntry
{
    public Guid Id { get; set; }
    public DateTime Timestamp { get; set; }
    public string Action { get; set; } = string.Empty;
    public string Resource { get; set; } = string.Empty;
    public bool Success { get; set; }
    public string? Details { get; set; }
    public string IpAddress { get; set; } = string.Empty;
    public string? UserAgent { get; set; }
    public string? CorrelationId { get; set; }
}

public class SecurityAuditEvent
{
    public Guid Id { get; set; }
    public string EventType { get; set; } = string.Empty;
    public string Severity { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    public Guid? UserId { get; set; }
    public string? UserEmail { get; set; }
    public string IpAddress { get; set; } = string.Empty;
    public Dictionary<string, object>? Metadata { get; set; }
    public bool IsResolved { get; set; }
    public DateTime? ResolvedAt { get; set; }
}

public class ComplianceReport
{
    public string Standard { get; set; } = string.Empty;
    public DateTime ReportPeriodStart { get; set; }
    public DateTime ReportPeriodEnd { get; set; }
    public Dictionary<string, object> Metrics { get; set; } = new();
    public List<string> ComplianceIssues { get; set; } = new();
    public List<string> Recommendations { get; set; } = new();
    public Dictionary<string, int> ActionCounts { get; set; } = new();
    public double ComplianceScore { get; set; }
    public DateTime GeneratedAt { get; set; }
}