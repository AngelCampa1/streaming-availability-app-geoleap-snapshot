namespace GeoLeap.Api.Services;

public interface IDisasterRecoveryService
{
    Task<PointInTimeRecoveryResult> PerformPointInTimeRecoveryAsync(PointInTimeRecoveryRequest request);
    Task<DataExportResult> ExportCriticalDataAsync(DataExportRequest request);
    Task<SystemHealthResult> PerformSystemHealthCheckAsync();
    Task<ConsistencyCheckResult> PerformConsistencyCheckAsync();
    Task<RecoveryTestResult> PerformRecoveryTestAsync(RecoveryTestRequest request);
    Task<ReplicationResult> ReplicateDataAsync(ReplicationRequest request);
    Task<EmergencyShutdownResult> PerformEmergencyShutdownAsync(EmergencyShutdownRequest request);
}

public class PointInTimeRecoveryResult
{
    public bool Success { get; set; } = true;
    public string Status { get; set; } = "completed";
    public DateTime RecoveryPoint { get; set; }
    public int RecoveredTables { get; set; }
    public int RecoveredRecords { get; set; }
    public DateTime CompletedAt { get; set; }
    public string? Message { get; set; }
}

public class DataExportResult
{
    public Guid ExportId { get; set; }
    public string Status { get; set; } = "completed";
    public string ExportPath { get; set; } = string.Empty;
    public long FileSizeBytes { get; set; }
    public int ExportedRecords { get; set; }
    public DateTime CreatedAt { get; set; }
    public bool IsEncrypted { get; set; }
}

public class SystemHealthResult
{
    public string OverallStatus { get; set; } = "healthy";
    public List<HealthCheck> Checks { get; set; } = new();
    public DateTime CheckedAt { get; set; }
    public bool ReadyForRecovery { get; set; } = true;
}

public class HealthCheck
{
    public string Component { get; set; } = string.Empty;
    public string Status { get; set; } = "healthy";
    public string? Message { get; set; }
}

public class ConsistencyCheckResult
{
    public string Status { get; set; } = "consistent";
    public List<ConsistencyIssue> Issues { get; set; } = new();
    public DateTime CheckedAt { get; set; }
    public int TablesChecked { get; set; }
    public bool IsConsistent { get; set; } = true;
}

// ConsistencyIssue class is defined in IDataValidationService.cs to avoid duplication

public class RecoveryTestResult
{
    public bool Success { get; set; } = true;
    public string Status { get; set; } = "completed";
    public string TestType { get; set; } = string.Empty;
    public DateTime StartedAt { get; set; }
    public DateTime CompletedAt { get; set; }
    public List<string> Steps { get; set; } = new();
}

public class ReplicationResult
{
    public Guid ReplicationId { get; set; }
    public string Status { get; set; } = "completed";
    public string TargetRegion { get; set; } = string.Empty;
    public long ReplicatedBytes { get; set; }
    public int ReplicatedTables { get; set; }
    public DateTime CompletedAt { get; set; }
}

public class EmergencyShutdownResult
{
    public bool Success { get; set; } = true;
    public string Status { get; set; } = "shutdown_initiated";
    public DateTime InitiatedAt { get; set; }
    public bool EmergencyBackupCreated { get; set; }
    public Guid? EmergencyBackupId { get; set; }
    public string? Message { get; set; }
}

// Request classes
public class PointInTimeRecoveryRequest
{
    public DateTime RecoveryPoint { get; set; }
    public string RecoveryType { get; set; } = "point_in_time";
    public string[] Tables { get; set; } = Array.Empty<string>();
    public bool ValidateBeforeRecovery { get; set; } = true;
}

public class DataExportRequest
{
    public string ExportType { get; set; } = "critical_data";
    /// <summary>
    /// EntityType alias for compatibility
    /// </summary>
    public string EntityType => ExportType;
    public bool IncludeUsers { get; set; } = true;
    public bool IncludeSubscriptions { get; set; } = true;
    public bool IncludePaymentData { get; set; } = false;
    public string Format { get; set; } = "json";
    public bool Encrypt { get; set; } = true;
    public bool SplitFiles { get; set; } = false;
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
}

public class RecoveryTestRequest
{
    public string TestType { get; set; } = "simulated_recovery";
    public DateTime BackupPoint { get; set; }
    public bool ValidateDataIntegrity { get; set; } = true;
    public bool RollbackOnFailure { get; set; } = true;
}

public class ReplicationRequest
{
    public string TargetRegion { get; set; } = string.Empty;
    public string ReplicationType { get; set; } = "asynchronous";
    public bool IncludeMetadata { get; set; } = true;
    public bool CompressTransfer { get; set; } = true;
    public bool ValidateTransfer { get; set; } = true;
}

public class EmergencyShutdownRequest
{
    public string ShutdownType { get; set; } = "graceful";
    public bool FlushPendingOperations { get; set; } = true;
    public bool CreateEmergencyBackup { get; set; } = true;
    public bool NotifyAdministrators { get; set; } = true;
    public string? Reason { get; set; }
}