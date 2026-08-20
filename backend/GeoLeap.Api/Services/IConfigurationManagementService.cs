using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service for managing application configuration settings
/// </summary>
public interface IConfigurationManagementService
{
    /// <summary>
    /// Get all configuration settings
    /// </summary>
    Task<List<AdminConfigurationSetting>> GetConfigurationSettingsAsync(
        string? category = null,
        string correlationId = "");

    /// <summary>
    /// Get specific configuration setting
    /// </summary>
    Task<AdminConfigurationSetting?> GetConfigurationSettingAsync(string key, string correlationId);

    /// <summary>
    /// Update configuration setting
    /// </summary>
    Task<bool> UpdateConfigurationSettingAsync(
        UpdateConfigurationRequest request,
        Guid updatedBy,
        string correlationId);

    /// <summary>
    /// Create new configuration setting
    /// </summary>
    Task<AdminConfigurationSetting> CreateConfigurationSettingAsync(
        AdminConfigurationSetting setting,
        Guid createdBy,
        string correlationId);

    /// <summary>
    /// Delete configuration setting
    /// </summary>
    Task<bool> DeleteConfigurationSettingAsync(
        string key,
        Guid deletedBy,
        string reason,
        string correlationId);

    /// <summary>
    /// Validate configuration setting value
    /// </summary>
    Task<ValidationResult> ValidateConfigurationValueAsync(
        string key,
        string value,
        string correlationId);

    /// <summary>
    /// Get configuration change history
    /// </summary>
    Task<List<ConfigurationChangeHistory>> GetConfigurationHistoryAsync(
        string? key,
        DateTime? startDate,
        DateTime? endDate,
        int page = 1,
        int pageSize = 50,
        string correlationId = "");

    /// <summary>
    /// Backup current configuration
    /// </summary>
    Task<ConfigurationBackup> CreateConfigurationBackupAsync(
        string description,
        Guid createdBy,
        string correlationId);

    /// <summary>
    /// Restore configuration from backup
    /// </summary>
    Task<bool> RestoreConfigurationFromBackupAsync(
        Guid backupId,
        Guid restoredBy,
        string correlationId);

    /// <summary>
    /// Get configuration backups
    /// </summary>
    Task<List<ConfigurationBackup>> GetConfigurationBackupsAsync(string correlationId);

    /// <summary>
    /// Get configuration categories
    /// </summary>
    Task<List<string>> GetConfigurationCategoriesAsync(string correlationId);

    /// <summary>
    /// Bulk update configuration settings
    /// </summary>
    Task<Dictionary<string, bool>> BulkUpdateConfigurationSettingsAsync(
        Dictionary<string, string> settings,
        Guid updatedBy,
        string reason,
        string correlationId);

    /// <summary>
    /// Get configuration setting usage analytics
    /// </summary>
    Task<Dictionary<string, object>> GetConfigurationUsageAnalyticsAsync(
        DateTime startDate,
        DateTime endDate,
        string correlationId);

    /// <summary>
    /// Reset configuration setting to default
    /// </summary>
    Task<bool> ResetConfigurationToDefaultAsync(
        string key,
        Guid resetBy,
        string correlationId);

    /// <summary>
    /// Import configuration settings from file
    /// </summary>
    Task<ConfigurationImportResult> ImportConfigurationAsync(
        Stream configurationData,
        string format,
        bool overwriteExisting,
        Guid importedBy,
        string correlationId);

    /// <summary>
    /// Export configuration settings to file
    /// </summary>
    Task<Stream> ExportConfigurationAsync(
        List<string>? keys,
        string format,
        string correlationId);
}

// Supporting models
public class ConfigurationChangeHistory
{
    public Guid Id { get; set; }
    public string Key { get; set; } = string.Empty;
    public string? OldValue { get; set; }
    public string NewValue { get; set; } = string.Empty;
    public Guid ChangedBy { get; set; }
    public string ChangedByEmail { get; set; } = string.Empty;
    public DateTime ChangedAt { get; set; }
    public string? Reason { get; set; }
    public string? ValidationResult { get; set; }
    public bool IsSuccessful { get; set; }
}

public class ConfigurationBackup
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public Guid CreatedBy { get; set; }
    public string CreatedByEmail { get; set; } = string.Empty;
    public int SettingCount { get; set; }
    public long FileSizeBytes { get; set; }
    public string? FilePath { get; set; }
    public Dictionary<string, object>? Metadata { get; set; }
}

public class ConfigurationImportResult
{
    public int TotalSettings { get; set; }
    public int ImportedSettings { get; set; }
    public int UpdatedSettings { get; set; }
    public int SkippedSettings { get; set; }
    public List<string> Errors { get; set; } = new();
    public List<string> Warnings { get; set; } = new();
    public DateTime ImportedAt { get; set; }
    public Guid ImportedBy { get; set; }
}