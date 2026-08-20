using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using GeoLeap.Api.Attributes;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using GeoLeap.Api.Extensions;
using System.Security.Claims;
using System.ComponentModel.DataAnnotations;

namespace GeoLeap.Api.Controllers;

[ApiController]
[Route("api/admin/export")]
[Authorize]
[RequirePermission("admin", "data:export")]
public class AdminDataExportController : ControllerBase
{
    private readonly IAdminDataExportService _exportService;
    private readonly ILogger<AdminDataExportController> _logger;

    public AdminDataExportController(
        IAdminDataExportService exportService,
        ILogger<AdminDataExportController> logger)
    {
        _exportService = exportService;
        _logger = logger;
    }

    /// <summary>
    /// Request data export with various filters and formats
    /// </summary>
    [HttpPost("request")]
    public async Task<ActionResult<AdminDataExport>> RequestDataExport([FromBody] AdminDataExportRequest request)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var requestedBy = GetCurrentUserId();
            
            if (requestedBy == null)
                return Unauthorized("User ID not found in token");

            var export = await _exportService.RequestDataExportAsync(request, requestedBy.Value, correlationId);
            
            return CreatedAtAction(nameof(GetExportStatus), new { exportId = export.Id }, export);
        }
        catch (ArgumentException ex)
        {
            return this.StandardBadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error requesting data export");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get status of data export request
    /// </summary>
    [HttpGet("{exportId:guid}/status")]
    public async Task<ActionResult<AdminDataExport>> GetExportStatus(Guid exportId)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var export = await _exportService.GetExportStatusAsync(exportId, correlationId);
            
            if (export == null)
                return NotFound($"Export with ID {exportId} not found");

            return Ok(export);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving export status for {ExportId}", exportId);
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Download completed export file
    /// </summary>
    [HttpGet("{exportId:guid}/download")]
    public async Task<IActionResult> DownloadExport(Guid exportId)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var userId = GetCurrentUserId();
            
            if (userId == null)
                return Unauthorized("User ID not found in token");

            var result = await _exportService.DownloadExportAsync(exportId, userId.Value, correlationId);
            
            if (result == null)
                return NotFound("Export file not found or not ready");

            var contentType = result.Format.ToLower() switch
            {
                "csv" => "text/csv",
                "json" => "application/json",
                "xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "pdf" => "application/pdf",
                _ => "application/octet-stream"
            };

            return File(result.FileStream, contentType, result.FileName);
        }
        catch (UnauthorizedAccessException)
        {
            return Forbid("You don't have permission to download this export");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error downloading export {ExportId}", exportId);
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get list of export requests for current user
    /// </summary>
    [HttpGet("my-exports")]
    public async Task<ActionResult<List<AdminDataExport>>> GetMyExports(
        [FromQuery] ExportStatus? status = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var userId = GetCurrentUserId();
            
            if (userId == null)
                return Unauthorized("User ID not found in token");

            var exports = await _exportService.GetUserExportsAsync(userId.Value, status, page, pageSize, correlationId);
            return Ok(exports);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving user exports");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get all export requests (admin only)
    /// </summary>
    [HttpGet("all")]
    [RequirePermission("admin:exports:view-all")]
    public async Task<ActionResult<List<AdminDataExport>>> GetAllExports(
        [FromQuery] ExportStatus? status = null,
        [FromQuery] Guid? userId = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var exports = await _exportService.GetAllExportsAsync(status, userId, page, pageSize, correlationId);
            return Ok(exports);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving all exports");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Cancel pending export request
    /// </summary>
    [HttpPost("{exportId:guid}/cancel")]
    public async Task<ActionResult> CancelExport(Guid exportId)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var userId = GetCurrentUserId();
            
            if (userId == null)
                return Unauthorized("User ID not found in token");

            var success = await _exportService.CancelExportAsync(exportId, userId.Value, correlationId);
            
            if (!success)
                return this.StandardBadRequest("Export cannot be cancelled or not found");

            return Ok(new { Message = "Export cancelled successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error cancelling export {ExportId}", exportId);
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Delete completed export
    /// </summary>
    [HttpDelete("{exportId:guid}")]
    [RequirePermission("admin:exports:delete")]
    public async Task<ActionResult> DeleteExport(Guid exportId)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var userId = GetCurrentUserId();
            
            if (userId == null)
                return Unauthorized("User ID not found in token");

            var success = await _exportService.DeleteExportAsync(exportId, userId.Value, correlationId);
            
            if (!success)
                return NotFound("Export not found or cannot be deleted");

            return Ok(new { Message = "Export deleted successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting export {ExportId}", exportId);
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get available export types and their configurations
    /// </summary>
    [HttpGet("types")]
    public async Task<ActionResult<List<ExportTypeInfo>>> GetExportTypes()
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var exportTypes = await _exportService.GetAvailableExportTypesAsync(correlationId);
            return Ok(exportTypes);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving export types");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get export statistics and usage analytics
    /// </summary>
    [HttpGet("statistics")]
    [RequirePermission("admin:exports:analytics")]
    public async Task<ActionResult<Dictionary<string, object>>> GetExportStatistics(
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var start = startDate ?? DateTime.UtcNow.AddDays(-30);
            var end = endDate ?? DateTime.UtcNow;
            
            var statistics = await _exportService.GetExportStatisticsAsync(start, end, correlationId);
            return Ok(statistics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving export statistics");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Cleanup expired exports
    /// </summary>
    [HttpPost("cleanup")]
    [RequirePermission("admin:exports:cleanup")]
    public async Task<ActionResult> CleanupExpiredExports([FromBody] CleanupExportsRequest request)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var performedBy = GetCurrentUserId();
            
            if (performedBy == null)
                return Unauthorized("User ID not found in token");

            var result = await _exportService.CleanupExpiredExportsAsync(
                request.OlderThanDays, request.DryRun, performedBy.Value, correlationId);
            
            return Ok(new { 
                Message = request.DryRun ? "Dry run completed" : "Cleanup completed successfully",
                CleanedCount = result.CleanedCount,
                FreedSpaceBytes = result.FreedSpaceBytes
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error cleaning up expired exports");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Preview data before export (first 100 rows)
    /// </summary>
    [HttpPost("preview")]
    public async Task<ActionResult<object>> PreviewExportData([FromBody] AdminDataExportRequest request)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var userId = GetCurrentUserId();
            
            if (userId == null)
                return Unauthorized("User ID not found in token");

            var preview = await _exportService.PreviewExportDataAsync(request, userId.Value, correlationId);
            return Ok(preview);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating export preview");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Schedule recurring export
    /// </summary>
    [HttpPost("schedule")]
    [RequirePermission("admin:exports:schedule")]
    public async Task<ActionResult<ScheduledExport>> ScheduleRecurringExport([FromBody] ScheduleExportRequest request)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var createdBy = GetCurrentUserId();
            
            if (createdBy == null)
                return Unauthorized("User ID not found in token");

            var scheduleRequest = new Models.ScheduleExportRequest
            {
                Name = request.Name ?? string.Empty,
                ExportRequest = request.ExportRequest,
                CronExpression = request.Schedule,
                Recipients = request.EmailRecipients,
                IsEnabled = request.IsActive
            };
            var scheduledExport = await _exportService.ScheduleRecurringExportAsync(
                scheduleRequest, createdBy.Value, correlationId);
            
            return CreatedAtAction(nameof(GetScheduledExport), new { scheduleId = scheduledExport.Id }, scheduledExport);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error scheduling recurring export");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get scheduled export details
    /// </summary>
    [HttpGet("schedules/{scheduleId:guid}")]
    [RequirePermission("admin:exports:schedule")]
    public async Task<ActionResult<ScheduledExport>> GetScheduledExport(Guid scheduleId)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var scheduledExport = await _exportService.GetScheduledExportAsync(scheduleId, correlationId);
            
            if (scheduledExport == null)
                return NotFound($"Scheduled export with ID {scheduleId} not found");

            return Ok(scheduledExport);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving scheduled export {ScheduleId}", scheduleId);
            return StatusCode(500, "Internal server error");
        }
    }

    private Guid? GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(userIdClaim, out var userId) ? userId : null;
    }
}

// Supporting DTOs and models
public class ExportDownloadResult
{
    public Stream FileStream { get; set; } = null!;
    public string FileName { get; set; } = string.Empty;
    public string Format { get; set; } = string.Empty;
}

public class ExportTypeInfo
{
    public string Type { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public List<string> SupportedFormats { get; set; } = new();
    public List<ExportColumn> AvailableColumns { get; set; } = new();
    public Dictionary<string, object> DefaultFilters { get; set; } = new();
    public bool RequiresDateRange { get; set; }
    public int MaxRecords { get; set; }
}

public class ExportColumn
{
    public string Name { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string DataType { get; set; } = string.Empty;
    public bool IsDefault { get; set; }
    public bool IsRequired { get; set; }
}

public class CleanupExportsRequest
{
    [Range(1, 365)]
    public int OlderThanDays { get; set; } = 30;
    
    public bool DryRun { get; set; } = true;
}

public class CleanupResult
{
    public int CleanedCount { get; set; }
    public long FreedSpaceBytes { get; set; }
}

public class ScheduleExportRequest
{
    [Required]
    public AdminDataExportRequest ExportRequest { get; set; } = new();
    
    [Required]
    public string Schedule { get; set; } = string.Empty; // Cron expression
    
    public string? Name { get; set; }
    public string? Description { get; set; }
    public List<string> EmailRecipients { get; set; } = new();
    public bool IsActive { get; set; } = true;
    public DateTime? EndDate { get; set; }
}

public class ScheduledExport
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Schedule { get; set; } = string.Empty;
    public AdminDataExportRequest ExportRequest { get; set; } = new();
    public List<string> EmailRecipients { get; set; } = new();
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? LastRunAt { get; set; }
    public DateTime? NextRunAt { get; set; }
    public DateTime? EndDate { get; set; }
    public Guid CreatedBy { get; set; }
    public int ExecutionCount { get; set; }
}