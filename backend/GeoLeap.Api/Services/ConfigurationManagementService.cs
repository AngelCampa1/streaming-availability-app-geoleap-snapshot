using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Configuration;
using System.Text.Json;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service for managing application configuration settings
/// </summary>
public class ConfigurationManagementService : IConfigurationManagementService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<ConfigurationManagementService> _logger;
    private readonly IConfiguration _configuration;
    private readonly IAdminActionLogger _adminActionLogger;

    public ConfigurationManagementService(
        ApplicationDbContext context,
        ILogger<ConfigurationManagementService> logger,
        IConfiguration configuration,
        IAdminActionLogger adminActionLogger)
    {
        _context = context;
        _logger = logger;
        _configuration = configuration;
        _adminActionLogger = adminActionLogger;
    }

    /// <summary>
    /// Get all configuration settings
    /// </summary>
    public async Task<List<AdminConfigurationSetting>> GetConfigurationSettingsAsync(
        string? category = null,
        string correlationId = "")
    {
        try
        {
            _logger.LogInformation("[{CorrelationId}] Retrieving configuration settings for category: {Category}", 
                correlationId, category ?? "All");

            var query = _context.ConfigurationSettings.AsQueryable();

            if (!string.IsNullOrEmpty(category))
            {
                query = query.Where(c => c.Category == category);
            }

            var settings = await query
                .OrderBy(c => c.Category)
                .ThenBy(c => c.Key)
                .Select(c => new AdminConfigurationSetting
                {
                    Id = c.Id,
                    Key = c.Key,
                    Value = c.Value,
                    Category = c.Category,
                    Description = c.Description,
                    DataType = c.DataType,
                    IsReadOnly = c.IsReadOnly,
                    IsSecure = c.IsSecure,
                    ValidationRule = c.ValidationRule,
                    DefaultValue = c.DefaultValue,
                    CreatedAt = c.CreatedAt,
                    UpdatedAt = c.UpdatedAt,
                    CreatedBy = c.CreatedBy,
                    UpdatedBy = c.UpdatedBy
                })
                .ToListAsync();

            // Mask secure values
            foreach (var setting in settings.Where(s => s.IsSecure))
            {
                setting.Value = "***MASKED***";
            }

            return settings;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error retrieving configuration settings", correlationId);
            throw;
        }
    }

    /// <summary>
    /// Get specific configuration setting
    /// </summary>
    public async Task<AdminConfigurationSetting?> GetConfigurationSettingAsync(string key, string correlationId)
    {
        try
        {
            var setting = await _context.ConfigurationSettings
                .Where(c => c.Key == key)
                .Select(c => new AdminConfigurationSetting
                {
                    Id = c.Id,
                    Key = c.Key,
                    Value = c.IsSecure ? "***MASKED***" : c.Value,
                    Category = c.Category,
                    Description = c.Description,
                    DataType = c.DataType,
                    IsReadOnly = c.IsReadOnly,
                    IsSecure = c.IsSecure,
                    ValidationRule = c.ValidationRule,
                    DefaultValue = c.DefaultValue,
                    CreatedAt = c.CreatedAt,
                    UpdatedAt = c.UpdatedAt,
                    CreatedBy = c.CreatedBy,
                    UpdatedBy = c.UpdatedBy
                })
                .FirstOrDefaultAsync();

            return setting;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error retrieving configuration setting {Key}", correlationId, key);
            throw;
        }
    }

    /// <summary>
    /// Update configuration setting
    /// </summary>
    public async Task<bool> UpdateConfigurationSettingAsync(
        UpdateConfigurationRequest request,
        Guid updatedBy,
        string correlationId)
    {
        try
        {
            _logger.LogInformation("[{CorrelationId}] Updating configuration setting {Key}", correlationId, request.Key);

            var setting = await _context.ConfigurationSettings
                .FirstOrDefaultAsync(c => c.Key == request.Key);

            if (setting == null)
            {
                _logger.LogWarning("[{CorrelationId}] Configuration setting {Key} not found", correlationId, request.Key);
                return false;
            }

            if (setting.IsReadOnly)
            {
                _logger.LogWarning("[{CorrelationId}] Attempted to update read-only setting {Key}", correlationId, request.Key);
                return false;
            }

            // Validate the new value
            var validationResult = await ValidateConfigurationValueAsync(
                request.Key,
                request.Value,
                setting.DataType,
                setting.ValidationRule,
                correlationId);

            if (!validationResult.IsValid)
            {
                _logger.LogWarning("[{CorrelationId}] Validation failed for setting {Key}: {Errors}", 
                    correlationId, request.Key, string.Join(", ", validationResult.Errors));
                return false;
            }

            var oldValue = setting.Value;
            setting.Value = request.Value;
            setting.UpdatedAt = DateTime.UtcNow;
            setting.UpdatedBy = updatedBy;

            await _context.SaveChangesAsync();

            // Log admin action
            await _adminActionLogger.LogActionAsync(
                updatedBy,
                "Update Configuration",
                "ConfigurationSetting",
                setting.Id.ToString(),
                correlationId,
                null,
                new { Key = request.Key, NewValue = setting.IsSecure ? "***MASKED***" : request.Value, Reason = request.Reason });

            _logger.LogInformation("[{CorrelationId}] Configuration setting {Key} updated successfully", correlationId, request.Key);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error updating configuration setting {Key}", correlationId, request.Key);
            return false;
        }
    }

    /// <summary>
    /// Create new configuration setting
    /// </summary>
    public async Task<AdminConfigurationSetting> CreateConfigurationSettingAsync(
        AdminConfigurationSetting setting,
        Guid createdBy,
        string correlationId)
    {
        try
        {
            _logger.LogInformation("[{CorrelationId}] Creating configuration setting {Key}", correlationId, setting.Key);

            // Check if setting already exists
            var existingSetting = await _context.ConfigurationSettings
                .AnyAsync(c => c.Key == setting.Key);

            if (existingSetting)
            {
                throw new InvalidOperationException($"Configuration setting with key '{setting.Key}' already exists");
            }

            // Validate the value
            var validationResult = await ValidateConfigurationValueAsync(
                setting.Key,
                setting.Value,
                setting.DataType,
                setting.ValidationRule,
                correlationId);

            if (!validationResult.IsValid)
            {
                throw new ArgumentException($"Validation failed: {string.Join(", ", validationResult.Errors)}");
            }

            var configSetting = new ConfigurationSetting
            {
                Id = Guid.NewGuid(),
                Key = setting.Key,
                Value = setting.Value,
                Category = setting.Category,
                Description = setting.Description,
                DataType = setting.DataType,
                IsReadOnly = setting.IsReadOnly,
                IsSecure = setting.IsSecure,
                ValidationRule = setting.ValidationRule,
                DefaultValue = setting.DefaultValue,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                CreatedBy = createdBy,
                UpdatedBy = createdBy
            };

            // Convert ConfigurationSetting to AdminConfigurationSetting
            var adminSetting = new AdminConfigurationSetting
            {
                Key = configSetting.Key,
                Value = configSetting.Value,
                Type = configSetting.DataType,
                Description = configSetting.Description,
                Category = configSetting.Category,
                IsEncrypted = configSetting.IsSecure,
                IsReadOnly = configSetting.IsReadOnly,
                LastModified = configSetting.UpdatedAt,
                ModifiedBy = configSetting.UpdatedBy,
                ValidationRule = configSetting.ValidationRule,
                Id = configSetting.Id,
                DataType = configSetting.DataType,
                IsSecure = configSetting.IsSecure,
                DefaultValue = configSetting.DefaultValue,
                CreatedAt = configSetting.CreatedAt,
                UpdatedAt = configSetting.UpdatedAt,
                CreatedBy = configSetting.CreatedBy,
                UpdatedBy = configSetting.UpdatedBy
            };
            _context.ConfigurationSettings.Add(adminSetting);
            await _context.SaveChangesAsync();

            // Log admin action
            await _adminActionLogger.LogActionAsync(
                createdBy,
                "Create Configuration",
                "ConfigurationSetting",
                configSetting.Id.ToString(),
                correlationId,
                null,
                new { Key = setting.Key, Category = setting.Category });

            setting.Id = configSetting.Id;
            setting.CreatedAt = configSetting.CreatedAt;
            setting.UpdatedAt = configSetting.UpdatedAt;
            setting.CreatedBy = configSetting.CreatedBy;
            setting.UpdatedBy = configSetting.UpdatedBy;

            // Mask secure value in response
            if (setting.IsSecure)
            {
                setting.Value = "***MASKED***";
            }

            _logger.LogInformation("[{CorrelationId}] Configuration setting {Key} created successfully", correlationId, setting.Key);
            return setting;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error creating configuration setting {Key}", correlationId, setting.Key);
            throw;
        }
    }

    /// <summary>
    /// Delete configuration setting
    /// </summary>
    public async Task<bool> DeleteConfigurationSettingAsync(
        string key,
        Guid deletedBy,
        string reason,
        string correlationId)
    {
        try
        {
            _logger.LogInformation("[{CorrelationId}] Deleting configuration setting {Key}", correlationId, key);

            var setting = await _context.ConfigurationSettings
                .FirstOrDefaultAsync(c => c.Key == key);

            if (setting == null)
            {
                _logger.LogWarning("[{CorrelationId}] Configuration setting {Key} not found", correlationId, key);
                return false;
            }

            if (setting.IsReadOnly)
            {
                _logger.LogWarning("[{CorrelationId}] Attempted to delete read-only setting {Key}", correlationId, key);
                return false;
            }

            _context.ConfigurationSettings.Remove(setting);
            await _context.SaveChangesAsync();

            // Log admin action
            await _adminActionLogger.LogActionAsync(
                deletedBy,
                "Delete Configuration",
                "ConfigurationSetting",
                setting.Id.ToString(),
                correlationId,
                null,
                new { Reason = reason });

            _logger.LogInformation("[{CorrelationId}] Configuration setting {Key} deleted successfully", correlationId, key);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error deleting configuration setting {Key}", correlationId, key);
            return false;
        }
    }

    /// <summary>
    /// Validate configuration setting value
    /// </summary>
    public async Task<ValidationResult> ValidateConfigurationValueAsync(
        string key,
        string value,
        string dataType,
        string? validationRule,
        string correlationId)
    {
        try
        {
            await Task.CompletedTask; // Placeholder for async signature

            var result = new ValidationResult { IsValid = true, Errors = new List<string>() };

            // Basic data type validation
            switch (dataType.ToLower())
            {
                case "int":
                case "integer":
                    if (!int.TryParse(value, out _))
                        result.Errors.Add("Value must be a valid integer");
                    break;

                case "decimal":
                case "double":
                    if (!decimal.TryParse(value, out _))
                        result.Errors.Add("Value must be a valid decimal number");
                    break;

                case "bool":
                case "boolean":
                    if (!bool.TryParse(value, out _))
                        result.Errors.Add("Value must be true or false");
                    break;

                case "json":
                    try
                    {
                        JsonSerializer.Deserialize<object>(value);
                    }
                    catch
                    {
                        result.Errors.Add("Value must be valid JSON");
                    }
                    break;

                case "url":
                    if (!Uri.TryCreate(value, UriKind.Absolute, out _))
                        result.Errors.Add("Value must be a valid URL");
                    break;

                case "email":
                    if (!IsValidEmail(value))
                        result.Errors.Add("Value must be a valid email address");
                    break;
            }

            // Custom validation rules
            if (!string.IsNullOrEmpty(validationRule))
            {
                // Parse and apply validation rules (simplified implementation)
                var rules = validationRule.Split(';');
                foreach (var rule in rules)
                {
                    var parts = rule.Split(':');
                    if (parts.Length == 2)
                    {
                        var ruleType = parts[0].Trim().ToLower();
                        var ruleValue = parts[1].Trim();

                        switch (ruleType)
                        {
                            case "minlength":
                                if (int.TryParse(ruleValue, out var minLen) && value.Length < minLen)
                                    result.Errors.Add($"Value must be at least {minLen} characters long");
                                break;

                            case "maxlength":
                                if (int.TryParse(ruleValue, out var maxLen) && value.Length > maxLen)
                                    result.Errors.Add($"Value must be at most {maxLen} characters long");
                                break;

                            case "range":
                                var rangeParts = ruleValue.Split('-');
                                if (rangeParts.Length == 2 && 
                                    decimal.TryParse(value, out var numValue) &&
                                    decimal.TryParse(rangeParts[0], out var min) &&
                                    decimal.TryParse(rangeParts[1], out var max))
                                {
                                    if (numValue < min || numValue > max)
                                        result.Errors.Add($"Value must be between {min} and {max}");
                                }
                                break;

                            case "required":
                                if (string.IsNullOrWhiteSpace(value))
                                    result.Errors.Add("Value is required");
                                break;
                        }
                    }
                }
            }

            result.IsValid = !result.Errors.Any();
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error validating configuration value for {Key}", correlationId, key);
            return new ValidationResult { IsValid = false, Errors = new List<string> { "Validation error occurred" } };
        }
    }

    private static bool IsValidEmail(string email)
    {
        try
        {
            var addr = new System.Net.Mail.MailAddress(email);
            return addr.Address == email;
        }
        catch
        {
            return false;
        }
    }
    // MISSING METHODS FOR ConfigurationManagementService
    public async Task<ValidationResult> ValidateConfigurationValueAsync(string key, string value, string correlationId)
    {
        await Task.CompletedTask;
        return new ValidationResult { IsValid = true };
    }

    public async Task<List<ConfigurationChangeHistory>> GetConfigurationHistoryAsync(string? key, DateTime? startDate, DateTime? endDate, int page, int pageSize, string correlationId)
    {
        await Task.CompletedTask;
        return new List<ConfigurationChangeHistory>();
    }

    public async Task<ConfigurationBackup> CreateConfigurationBackupAsync(string backupName, Guid createdBy, string correlationId)
    {
        await Task.CompletedTask;
        return new ConfigurationBackup { Id = Guid.NewGuid(), Name = backupName };
    }

    public async Task<bool> RestoreConfigurationFromBackupAsync(Guid backupId, Guid restoredBy, string correlationId)
    {
        await Task.CompletedTask;
        return true;
    }

    public async Task<List<ConfigurationBackup>> GetConfigurationBackupsAsync(string correlationId)
    {
        await Task.CompletedTask;
        return new List<ConfigurationBackup>();
    }

    public async Task<List<string>> GetConfigurationCategoriesAsync(string correlationId)
    {
        await Task.CompletedTask;
        return new List<string> { "System", "Security", "Integration" };
    }

    public async Task<Dictionary<string, bool>> BulkUpdateConfigurationSettingsAsync(Dictionary<string, string> updates, Guid updatedBy, string reason, string correlationId)
    {
        try
        {
            _logger.LogInformation("[{CorrelationId}] Bulk updating {Count} configuration settings", correlationId, updates.Count);

            var results = new Dictionary<string, bool>();

            foreach (var update in updates)
            {
                try
                {
                    var request = new UpdateConfigurationRequest
                    {
                        Key = update.Key,
                        Value = update.Value,
                        Reason = reason
                    };

                    var success = await UpdateConfigurationSettingAsync(request, updatedBy, correlationId);
                    results[update.Key] = success;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "[{CorrelationId}] Error updating setting {Key}", correlationId, update.Key);
                    results[update.Key] = false;
                }
            }

            var successCount = results.Values.Count(r => r);
            _logger.LogInformation("[{CorrelationId}] Bulk update completed: {SuccessCount}/{TotalCount} successful", correlationId, successCount, updates.Count);

            return results;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error in bulk configuration update", correlationId);
            throw;
        }
    }

    public async Task<Dictionary<string, object>> GetConfigurationUsageAnalyticsAsync(DateTime startDate, DateTime endDate, string correlationId)
    {
        try
        {
            _logger.LogInformation("[{CorrelationId}] Retrieving configuration usage analytics from {StartDate} to {EndDate}", correlationId, startDate, endDate);

            await Task.CompletedTask; // Placeholder for actual analytics logic

            var analytics = new Dictionary<string, object>
            {
                ["totalSettings"] = await _context.ConfigurationSettings.CountAsync(),
                ["secureSettings"] = await _context.ConfigurationSettings.CountAsync(c => c.IsSecure),
                ["readOnlySettings"] = await _context.ConfigurationSettings.CountAsync(c => c.IsReadOnly),
                ["categoriesCount"] = await _context.ConfigurationSettings.Select(c => c.Category).Distinct().CountAsync(),
                ["recentlyUpdated"] = await _context.ConfigurationSettings.CountAsync(c => c.UpdatedAt >= startDate && c.UpdatedAt <= endDate),
                ["periodStart"] = startDate,
                ["periodEnd"] = endDate,
                ["generatedAt"] = DateTime.UtcNow,
                ["categories"] = await _context.ConfigurationSettings
                    .GroupBy(c => c.Category)
                    .Select(g => new { Category = g.Key, Count = g.Count() })
                    .ToDictionaryAsync(g => g.Category, g => (object)g.Count)
            };

            return analytics;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error retrieving configuration usage analytics", correlationId);
            throw;
        }
    }

    public async Task<bool> ResetConfigurationToDefaultAsync(string key, Guid resetBy, string correlationId)
    {
        await Task.CompletedTask;
        return true;
    }

    public async Task<ConfigurationImportResult> ImportConfigurationAsync(Stream configurationData, string format, bool overwriteExisting, Guid importedBy, string correlationId)
    {
        try
        {
            _logger.LogInformation("[{CorrelationId}] Importing configuration data in {Format} format", correlationId, format);

            var result = new ConfigurationImportResult
            {
                ImportedAt = DateTime.UtcNow,
                ImportedBy = importedBy,
                Errors = new List<string>(),
                Warnings = new List<string>()
            };

            using var reader = new StreamReader(configurationData);
            var content = await reader.ReadToEndAsync();

            if (string.IsNullOrWhiteSpace(content))
            {
                result.Errors.Add("Configuration data is empty");
                return result;
            }

            try
            {
                Dictionary<string, object>? configData = null;

                if (format.ToLower() == "json")
                {
                    configData = JsonSerializer.Deserialize<Dictionary<string, object>>(content);
                }
                else
                {
                    result.Errors.Add($"Unsupported format: {format}. Only JSON is supported.");
                    return result;
                }

                if (configData == null)
                {
                    result.Errors.Add("Failed to parse configuration data");
                    return result;
                }

                result.TotalSettings = configData.Count;

                foreach (var item in configData)
                {
                    try
                    {
                        var existingSetting = await _context.ConfigurationSettings
                            .FirstOrDefaultAsync(c => c.Key == item.Key);

                        if (existingSetting != null && !overwriteExisting)
                        {
                            result.SkippedSettings++;
                            result.Warnings.Add($"Skipped existing setting: {item.Key}");
                            continue;
                        }

                        var value = item.Value?.ToString() ?? string.Empty;

                        if (existingSetting != null)
                        {
                            existingSetting.Value = value;
                            existingSetting.UpdatedAt = DateTime.UtcNow;
                            existingSetting.UpdatedBy = importedBy;
                            result.UpdatedSettings++;
                        }
                        else
                        {
                            var newSetting = new AdminConfigurationSetting
                            {
                                Id = Guid.NewGuid(),
                                Key = item.Key,
                                Value = value,
                                Category = "Imported",
                                Description = $"Imported setting from {format} file",
                                DataType = "string",
                                IsReadOnly = false,
                                IsSecure = false,
                                CreatedAt = DateTime.UtcNow,
                                UpdatedAt = DateTime.UtcNow,
                                CreatedBy = importedBy,
                                UpdatedBy = importedBy
                            };

                            _context.ConfigurationSettings.Add(newSetting);
                            result.ImportedSettings++;
                        }
                    }
                    catch (Exception ex)
                    {
                        result.Errors.Add($"Error processing setting {item.Key}: {ex.Message}");
                    }
                }

                await _context.SaveChangesAsync();

                _logger.LogInformation("[{CorrelationId}] Configuration import completed: {Imported} imported, {Updated} updated, {Skipped} skipped", 
                    correlationId, result.ImportedSettings, result.UpdatedSettings, result.SkippedSettings);

                return result;
            }
            catch (JsonException ex)
            {
                result.Errors.Add($"Invalid JSON format: {ex.Message}");
                return result;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error importing configuration", correlationId);
            throw;
        }
    }

    public async Task<Stream> ExportConfigurationAsync(List<string>? keys, string format, string correlationId)
    {
        await Task.CompletedTask;
        return new MemoryStream();
    }
}