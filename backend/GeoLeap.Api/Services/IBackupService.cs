namespace GeoLeap.Api.Services;

public interface IBackupService
{
    Task<BackupResult> CreateBackupAsync(CreateBackupRequest request);
    Task<RestoreResult> RestoreBackupAsync(RestoreBackupRequest request);
    Task<BackupScheduleResult> ScheduleBackupAsync(ScheduleBackupRequest request);
    Task<BackupVerificationResult> VerifyBackupAsync(BackupVerificationRequest request);
    Task<BackupHistoryResult> GetBackupHistoryAsync(int page = 1, int pageSize = 20);
    Task<BackupCleanupResult> CleanupOldBackupsAsync(BackupCleanupRequest request);
    Task<ConfigurationBackupResult> BackupConfigurationAsync(ConfigurationBackupRequest request);
    Task<BackupResult> CreateEncryptedBackupAsync(EncryptedBackupRequest request);
}

public class BackupResult
{
    public Guid BackupId { get; set; }
    public string Status { get; set; } = "success";
    public string? BackupPath { get; set; }
    public long FileSizeBytes { get; set; }
    public DateTime CreatedAt { get; set; }
    public string? Message { get; set; }
}

public class RestoreResult
{
    public bool Success { get; set; }
    public string Status { get; set; } = "completed";
    public int RestoredRecords { get; set; }
    public DateTime RestoredAt { get; set; }
    public string? Message { get; set; }
}

public class BackupScheduleResult
{
    public Guid ScheduleId { get; set; }
    public string Status { get; set; } = "scheduled";
    public DateTime NextRunTime { get; set; }
    public string? CronExpression { get; set; }
}

public class BackupVerificationResult
{
    public Guid BackupId { get; set; }
    public bool IsValid { get; set; } = true;
    public bool IntegrityCheckPassed { get; set; } = true;
    public bool CompletenessCheckPassed { get; set; } = true;
    public bool EncryptionCheckPassed { get; set; } = true;
    public DateTime VerifiedAt { get; set; }
}

public class BackupHistoryResult
{
    public List<BackupRecord> Backups { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}

public class BackupRecord
{
    public Guid Id { get; set; }
    public string BackupType { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public long FileSizeBytes { get; set; }
    public string Status { get; set; } = "completed";
}

public class BackupCleanupResult
{
    public int DeletedBackups { get; set; }
    public long FreedSpaceBytes { get; set; }
    public string Status { get; set; } = "completed";
}

public class ConfigurationBackupResult
{
    public Guid BackupId { get; set; }
    public string Status { get; set; } = "completed";
    public int ConfigurationsBackedUp { get; set; }
    public DateTime CreatedAt { get; set; }
}

// Request classes
public class CreateBackupRequest
{
    public string BackupType { get; set; } = "full";
    public bool IncludeUserData { get; set; } = true;
    public bool IncludeContentData { get; set; } = true;
    public bool IncludeSystemData { get; set; } = true;
    public bool Compression { get; set; } = true;
    public string? Description { get; set; }
}

public class RestoreBackupRequest
{
    public Guid BackupId { get; set; }
    public string RecoveryType { get; set; } = "selective";
    public bool RestoreUsers { get; set; } = true;
    public bool RestoreContent { get; set; } = true;
    public bool VerifyIntegrity { get; set; } = true;
}

public class ScheduleBackupRequest
{
    public string Name { get; set; } = string.Empty;
    public string CronExpression { get; set; } = string.Empty;
    public string BackupType { get; set; } = "incremental";
    public bool IsActive { get; set; } = true;
    public int RetentionDays { get; set; } = 30;
    public bool NotifyOnComplete { get; set; } = false;
    public string? NotificationEmail { get; set; }
}

public class BackupVerificationRequest
{
    public Guid BackupId { get; set; }
    public bool CheckIntegrity { get; set; } = true;
    public bool CheckCompleteness { get; set; } = true;
    public bool CheckEncryption { get; set; } = true;
}

public class BackupCleanupRequest
{
    public int RetentionDays { get; set; } = 30;
    public int KeepMinimumBackups { get; set; } = 5;
    public bool DeleteCorruptedBackups { get; set; } = true;
    public bool DryRun { get; set; } = false;
}

public class ConfigurationBackupRequest
{
    public bool IncludeSecrets { get; set; } = false;
    public bool IncludeUserSettings { get; set; } = true;
    public bool IncludeSystemSettings { get; set; } = true;
    public bool IncludeIntegrationConfigs { get; set; } = true;
}

public class EncryptedBackupRequest : CreateBackupRequest
{
    public BackupEncryption Encryption { get; set; } = new();
    public bool IncludeSensitiveData { get; set; } = true;
    public bool ValidateEncryption { get; set; } = true;
}

public class BackupEncryption
{
    public bool Enabled { get; set; } = true;
    public string Algorithm { get; set; } = "AES256";
    public bool KeyRotation { get; set; } = true;
}