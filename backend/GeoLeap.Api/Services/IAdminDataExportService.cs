using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service for handling data export requests and file generation
/// </summary>
public interface IAdminDataExportService
{
    /// <summary>
    /// Request a new data export
    /// </summary>
    Task<AdminDataExport> RequestDataExportAsync(
        AdminDataExportRequest request,
        Guid requestedBy,
        string correlationId);

    /// <summary>
    /// Get status of an export request
    /// </summary>
    Task<AdminDataExport?> GetExportStatusAsync(Guid exportId, string correlationId);

    /// <summary>
    /// Download completed export file
    /// </summary>
    Task<ExportDownloadResult?> DownloadExportAsync(
        Guid exportId,
        Guid userId,
        string correlationId);

    /// <summary>
    /// Get export requests for a specific user
    /// </summary>
    Task<List<AdminDataExport>> GetUserExportsAsync(
        Guid userId,
        ExportStatus? status,
        int page,
        int pageSize,
        string correlationId);

    /// <summary>
    /// Get all export requests (admin only)
    /// </summary>
    Task<List<AdminDataExport>> GetAllExportsAsync(
        ExportStatus? status,
        Guid? userId,
        int page,
        int pageSize,
        string correlationId);

    /// <summary>
    /// Cancel a pending export request
    /// </summary>
    Task<bool> CancelExportAsync(Guid exportId, Guid userId, string correlationId);

    /// <summary>
    /// Delete an export and its associated file
    /// </summary>
    Task<bool> DeleteExportAsync(Guid exportId, Guid userId, string correlationId);

    /// <summary>
    /// Get available export types and configurations
    /// </summary>
    Task<List<ExportTypeInfo>> GetAvailableExportTypesAsync(string correlationId);

    /// <summary>
    /// Get export statistics and usage analytics
    /// </summary>
    Task<Dictionary<string, object>> GetExportStatisticsAsync(
        DateTime startDate,
        DateTime endDate,
        string correlationId);

    /// <summary>
    /// Cleanup expired export files
    /// </summary>
    Task<CleanupResult> CleanupExpiredExportsAsync(
        int olderThanDays,
        bool dryRun,
        Guid performedBy,
        string correlationId);

    /// <summary>
    /// Preview export data (first 100 rows)
    /// </summary>
    Task<object> PreviewExportDataAsync(
        AdminDataExportRequest request,
        Guid userId,
        string correlationId);

    /// <summary>
    /// Schedule a recurring export
    /// </summary>
    Task<ScheduledExport> ScheduleRecurringExportAsync(
        ScheduleExportRequest request,
        Guid createdBy,
        string correlationId);

    /// <summary>
    /// Get scheduled export details
    /// </summary>
    Task<ScheduledExport?> GetScheduledExportAsync(Guid scheduleId, string correlationId);

    /// <summary>
    /// Execute scheduled exports
    /// </summary>
    Task ExecuteScheduledExportsAsync(string correlationId);

    /// <summary>
    /// Process export queue (background service)
    /// </summary>
    Task ProcessExportQueueAsync(string correlationId);

    /// <summary>
    /// Generate export file in specified format
    /// </summary>
    Task<string> GenerateExportFileAsync(
        AdminDataExport export,
        string correlationId);

    /// <summary>
    /// Validate export request parameters
    /// </summary>
    Task<ValidationResult> ValidateExportRequestAsync(
        AdminDataExportRequest request,
        string correlationId);

    /// <summary>
    /// Get export size estimate
    /// </summary>
    Task<ExportSizeEstimate> EstimateExportSizeAsync(
        AdminDataExportRequest request,
        string correlationId);
}

// Supporting models
public class ValidationResult
{
    public bool IsValid { get; set; }
    public List<string> Errors { get; set; } = new();
    public List<string> Warnings { get; set; } = new();
}

public class ExportSizeEstimate
{
    public long EstimatedRecords { get; set; }
    public long EstimatedSizeBytes { get; set; }
    public TimeSpan EstimatedDuration { get; set; }
    public bool RequiresStreaming { get; set; }
    public string RecommendedFormat { get; set; } = string.Empty;
}