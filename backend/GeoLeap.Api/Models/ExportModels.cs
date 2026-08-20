using System.ComponentModel.DataAnnotations;

namespace GeoLeap.Api.Models;

/// <summary>
/// Export job status tracking model
/// </summary>
public class ExportJobStatus
{
    public Guid Id { get; set; }
    public string Status { get; set; } = string.Empty;
    public int Progress { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public int TotalRecords { get; set; }
    public int ProcessedRecords { get; set; }
    public string? ErrorMessage { get; set; }
    public string? FilePath { get; set; }
    public long FileSizeBytes { get; set; }
}

// Export status enumeration moved to AdminModels.cs to avoid duplication

/// <summary>
/// Export type information
/// </summary>
public class ExportTypeInfo
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public List<string> SupportedFormats { get; set; } = new();
    public Dictionary<string, object> Configuration { get; set; } = new();
}

/// <summary>
/// Export download result
/// </summary>
public class ExportDownloadResult
{
    public Stream FileStream { get; set; } = Stream.Null;
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    
    // Additional property for controller compatibility
    public string Format { get; set; } = string.Empty;
}

/// <summary>
/// Cleanup operation result
/// </summary>
public class CleanupResult
{
    public bool Success { get; set; }
    public int FilesDeleted { get; set; }
    public long BytesFreed { get; set; }
    public List<string> Errors { get; set; } = new();
    public string Message { get; set; } = string.Empty;
    
    // Additional properties for controller compatibility
    public int CleanedCount => FilesDeleted;
    public long FreedSpaceBytes => BytesFreed;
}

/// <summary>
/// Scheduled export configuration
/// </summary>
public class ScheduledExport
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public AdminDataExportRequest ExportRequest { get; set; } = new();
    public string CronExpression { get; set; } = string.Empty;
    public bool IsEnabled { get; set; }
    public Guid CreatedBy { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? LastExecuted { get; set; }
    public DateTime? NextExecution { get; set; }
    public List<string> Recipients { get; set; } = new();
}

/// <summary>
/// Schedule export request
/// </summary>
public class ScheduleExportRequest
{
    [Required]
    public string Name { get; set; } = string.Empty;
    
    [Required]
    public AdminDataExportRequest ExportRequest { get; set; } = new();
    
    [Required]
    public string CronExpression { get; set; } = string.Empty;
    
    public List<string> Recipients { get; set; } = new();
    public bool IsEnabled { get; set; } = true;
}

/// <summary>
/// Archive operation result
/// </summary>
public class ArchiveResult
{
    public bool Success { get; set; }
    public int ProcessedRecords { get; set; }
    public int ArchivedRecords { get; set; }
    public bool DryRun { get; set; }
    public string Message { get; set; } = string.Empty;
    public List<string> Errors { get; set; } = new();
    
    // Additional properties for controller compatibility
    public int ArchivedCount => ArchivedRecords;
    public string? ArchiveFile { get; set; }
}

/// <summary>
/// Compliance report
/// </summary>
public class ComplianceReport
{
    public string Standard { get; set; } = string.Empty;
    public DateRange ReportPeriod { get; set; } = new();
    public int TotalEvents { get; set; }
    public int SecurityEvents { get; set; }
    public int AccessEvents { get; set; }
    public DateTime GeneratedAt { get; set; }
    public Dictionary<string, object> Details { get; set; } = new();
}

/// <summary>
/// Date range helper
/// </summary>
public class DateRange
{
    public DateTime Start { get; set; }
    public DateTime End { get; set; }
}

/// <summary>
/// Security audit event
/// </summary>
public class SecurityAuditEvent
{
    public Guid Id { get; set; }
    public string EventType { get; set; } = string.Empty;
    public string Severity { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public Guid? UserId { get; set; }
    public string IpAddress { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public string? Metadata { get; set; }
}

/// <summary>
/// Bulk notification request
/// </summary>
public class BulkNotificationRequest
{
    public List<Guid> UserIds { get; set; } = new();
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Type { get; set; } = "Info";
    public Dictionary<string, object> Data { get; set; } = new();
    public DateTime? ScheduleFor { get; set; }
    public List<string> Channels { get; set; } = new(); // email, sms, push
    public string Priority { get; set; } = "Normal";
    public string? ActionUrl { get; set; }
}