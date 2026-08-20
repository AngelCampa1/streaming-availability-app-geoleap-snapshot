using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using System.ComponentModel.DataAnnotations;
using SystemValidationResult = System.ComponentModel.DataAnnotations.ValidationResult;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service for managing user preferences with inheritance, validation, and audit logging
/// </summary>
public interface IPreferenceService
{
    Task<UserPreferenceDto?> GetUserPreferenceAsync(Guid userId, string categoryKey, string preferenceKey);
    Task<List<UserPreferenceDto>> GetUserPreferencesAsync(Guid userId, string? categoryKey = null);
    Task<PreferenceCategoryDto> GetPreferenceCategoryTreeAsync(string? rootCategoryKey = null);
    Task<List<DefaultPreferenceDto>> GetDefaultPreferencesAsync(string? categoryKey = null);
    Task<UserPreferenceDto> SetUserPreferenceAsync(Guid userId, UpdateUserPreferenceRequest request, string? ipAddress = null, string? userAgent = null);
    Task<List<UserPreferenceDto>> BulkUpdatePreferencesAsync(Guid userId, BulkUpdatePreferencesRequest request, string? ipAddress = null, string? userAgent = null);
    Task<bool> DeleteUserPreferenceAsync(Guid userId, string categoryKey, string preferenceKey, string? ipAddress = null, string? userAgent = null);
    Task<object> ResolvePreferenceValueAsync(Guid userId, string categoryKey, string preferenceKey);
    Task<Dictionary<string, object>> ResolveAllPreferencesAsync(Guid userId);
    Task<string> ExportUserPreferencesAsync(Guid userId, PreferenceExportRequest request);
    Task<List<SystemValidationResult>> ImportUserPreferencesAsync(Guid userId, PreferenceImportRequest request, string? ipAddress = null, string? userAgent = null);
    Task<bool> ValidatePreferenceValueAsync(string categoryKey, string preferenceKey, object value, string dataType);
    Task SeedDefaultPreferencesAsync();
}

public class PreferenceService : IPreferenceService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<PreferenceService> _logger;

    public PreferenceService(ApplicationDbContext context, ILogger<PreferenceService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<UserPreferenceDto?> GetUserPreferenceAsync(Guid userId, string categoryKey, string preferenceKey)
    {
        var preference = await _context.UserPreferences
            .FirstOrDefaultAsync(p => p.UserId == userId && p.CategoryKey == categoryKey && p.PreferenceKey == preferenceKey);

        return preference == null ? null : MapToDto(preference);
    }

    public async Task<List<UserPreferenceDto>> GetUserPreferencesAsync(Guid userId, string? categoryKey = null)
    {
        var query = _context.UserPreferences.Where(p => p.UserId == userId);
        
        if (!string.IsNullOrEmpty(categoryKey))
            query = query.Where(p => p.CategoryKey == categoryKey);

        var preferences = await query.OrderBy(p => p.CategoryKey).ThenBy(p => p.PreferenceKey).ToListAsync();
        
        return preferences.Select(MapToDto).ToList();
    }

    public async Task<PreferenceCategoryDto> GetPreferenceCategoryTreeAsync(string? rootCategoryKey = null)
    {
        var categories = await _context.PreferenceCategories
            .Where(c => c.IsVisible)
            .OrderBy(c => c.SortOrder)
            .ToListAsync();

        return BuildCategoryTree(categories, rootCategoryKey);
    }

    public async Task<List<DefaultPreferenceDto>> GetDefaultPreferencesAsync(string? categoryKey = null)
    {
        var query = _context.DefaultPreferences.Include(d => d.Category).AsQueryable();
        
        if (!string.IsNullOrEmpty(categoryKey))
            query = query.Where(d => d.Category.CategoryKey == categoryKey);

        var defaults = await query.OrderBy(d => d.Category.CategoryKey).ThenBy(d => d.PreferenceKey).ToListAsync();
        
        return defaults.Select(MapToDto).ToList();
    }

    public async Task<UserPreferenceDto> SetUserPreferenceAsync(Guid userId, UpdateUserPreferenceRequest request, string? ipAddress = null, string? userAgent = null)
    {
        // Validate the preference value
        var isValid = await ValidatePreferenceValueAsync(request.CategoryKey, request.PreferenceKey, request.PreferenceValue, request.DataType);
        if (!isValid)
            throw new ArgumentException($"Invalid preference value for {request.CategoryKey}.{request.PreferenceKey}");

        var existing = await _context.UserPreferences
            .FirstOrDefaultAsync(p => p.UserId == userId && p.CategoryKey == request.CategoryKey && p.PreferenceKey == request.PreferenceKey);

        string? oldValue = null;
        UserPreference preference;

        if (existing != null)
        {
            oldValue = existing.PreferenceValue;
            existing.PreferenceValue = JsonSerializer.Serialize(request.PreferenceValue);
            existing.DataType = request.DataType;
            existing.Priority = request.Priority;
            existing.UpdatedAt = DateTime.UtcNow;
            preference = existing;
        }
        else
        {
            preference = new UserPreference
            {
                UserId = userId,
                CategoryKey = request.CategoryKey,
                PreferenceKey = request.PreferenceKey,
                PreferenceValue = JsonSerializer.Serialize(request.PreferenceValue),
                DataType = request.DataType,
                Priority = request.Priority,
                IsUserOverride = true
            };
            _context.UserPreferences.Add(preference);
        }

        // Log the change
        await LogPreferenceChangeAsync(userId, request.CategoryKey, request.PreferenceKey, 
            oldValue, preference.PreferenceValue, existing != null ? "updated" : "created", 
            ipAddress, userAgent);

        await _context.SaveChangesAsync();
        return MapToDto(preference);
    }

    public async Task<List<UserPreferenceDto>> BulkUpdatePreferencesAsync(Guid userId, BulkUpdatePreferencesRequest request, string? ipAddress = null, string? userAgent = null)
    {
        var results = new List<UserPreferenceDto>();

        if (!request.MergeMode)
        {
            // Delete all existing preferences if not in merge mode
            var existingPreferences = await _context.UserPreferences.Where(p => p.UserId == userId).ToListAsync();
            _context.UserPreferences.RemoveRange(existingPreferences);
            
            foreach (var pref in existingPreferences)
            {
                await LogPreferenceChangeAsync(userId, pref.CategoryKey, pref.PreferenceKey,
                    pref.PreferenceValue, null, "deleted", ipAddress, userAgent);
            }
        }

        foreach (var prefRequest in request.Preferences)
        {
            try
            {
                var result = await SetUserPreferenceAsync(userId, prefRequest, ipAddress, userAgent);
                results.Add(result);
            }
            catch (Exception ex)
            {
                _logger.LogWarning("Failed to update preference {CategoryKey}.{PreferenceKey}: {Error}", 
                    prefRequest.CategoryKey, prefRequest.PreferenceKey, ex.Message);
            }
        }

        return results;
    }

    public async Task<bool> DeleteUserPreferenceAsync(Guid userId, string categoryKey, string preferenceKey, string? ipAddress = null, string? userAgent = null)
    {
        var preference = await _context.UserPreferences
            .FirstOrDefaultAsync(p => p.UserId == userId && p.CategoryKey == categoryKey && p.PreferenceKey == preferenceKey);

        if (preference == null)
            return false;

        await LogPreferenceChangeAsync(userId, categoryKey, preferenceKey,
            preference.PreferenceValue, null, "deleted", ipAddress, userAgent);

        _context.UserPreferences.Remove(preference);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<object> ResolvePreferenceValueAsync(Guid userId, string categoryKey, string preferenceKey)
    {
        // First try to get user preference
        var userPref = await _context.UserPreferences
            .FirstOrDefaultAsync(p => p.UserId == userId && p.CategoryKey == categoryKey && p.PreferenceKey == preferenceKey);

        if (userPref != null)
        {
            try
            {
                return JsonSerializer.Deserialize<object>(userPref.PreferenceValue) ?? new object();
            }
            catch
            {
                _logger.LogWarning("Failed to deserialize user preference value for {CategoryKey}.{PreferenceKey}", categoryKey, preferenceKey);
            }
        }

        // Fall back to default preference
        var defaultPref = await _context.DefaultPreferences
            .Include(d => d.Category)
            .FirstOrDefaultAsync(d => d.Category.CategoryKey == categoryKey && d.PreferenceKey == preferenceKey);

        if (defaultPref != null)
        {
            try
            {
                return JsonSerializer.Deserialize<object>(defaultPref.DefaultValue) ?? new object();
            }
            catch
            {
                _logger.LogWarning("Failed to deserialize default preference value for {CategoryKey}.{PreferenceKey}", categoryKey, preferenceKey);
            }
        }

        // Return empty object if nothing found
        return new object();
    }

    public async Task<Dictionary<string, object>> ResolveAllPreferencesAsync(Guid userId)
    {
        var result = new Dictionary<string, object>();

        // Get all default preferences first
        var defaults = await _context.DefaultPreferences
            .Include(d => d.Category)
            .Where(d => d.IsUserConfigurable)
            .ToListAsync();

        foreach (var def in defaults)
        {
            var key = $"{def.Category.CategoryKey}.{def.PreferenceKey}";
            try
            {
                result[key] = JsonSerializer.Deserialize<object>(def.DefaultValue) ?? new object();
            }
            catch
            {
                result[key] = new object();
            }
        }

        // Override with user preferences
        var userPrefs = await _context.UserPreferences
            .Where(p => p.UserId == userId)
            .OrderBy(p => p.Priority)
            .ToListAsync();

        foreach (var pref in userPrefs)
        {
            var key = $"{pref.CategoryKey}.{pref.PreferenceKey}";
            try
            {
                result[key] = JsonSerializer.Deserialize<object>(pref.PreferenceValue) ?? new object();
            }
            catch
            {
                _logger.LogWarning("Failed to deserialize user preference {Key}", key);
            }
        }

        return result;
    }

    public async Task<string> ExportUserPreferencesAsync(Guid userId, PreferenceExportRequest request)
    {
        var query = _context.UserPreferences.Where(p => p.UserId == userId);

        if (request.CategoryKeys?.Any() == true)
            query = query.Where(p => request.CategoryKeys.Contains(p.CategoryKey));

        var preferences = await query.ToListAsync();
        var exportData = new
        {
            UserId = userId,
            ExportedAt = DateTime.UtcNow,
            Preferences = preferences.Select(p => new
            {
                p.CategoryKey,
                p.PreferenceKey,
                PreferenceValue = JsonSerializer.Deserialize<object>(p.PreferenceValue),
                p.DataType,
                p.Priority,
                p.UpdatedAt
            }).ToList()
        };

        if (request.IncludeDefaults)
        {
            var defaultQuery = _context.DefaultPreferences.Include(d => d.Category).AsQueryable();
            if (request.CategoryKeys?.Any() == true)
                defaultQuery = defaultQuery.Where(d => request.CategoryKeys.Contains(d.Category.CategoryKey));

            var defaults = await defaultQuery.ToListAsync();
            var exportWithDefaults = new
            {
                exportData.UserId,
                exportData.ExportedAt,
                exportData.Preferences,
                DefaultPreferences = defaults.Select(d => new
                {
                    CategoryKey = d.Category.CategoryKey,
                    d.PreferenceKey,
                    DefaultValue = JsonSerializer.Deserialize<object>(d.DefaultValue),
                    d.DataType,
                    d.DisplayName,
                    d.Description
                }).ToList()
            };
            
            return JsonSerializer.Serialize(exportWithDefaults, new JsonSerializerOptions { WriteIndented = true });
        }

        return JsonSerializer.Serialize(exportData, new JsonSerializerOptions { WriteIndented = true });
    }

    public async Task<List<SystemValidationResult>> ImportUserPreferencesAsync(Guid userId, PreferenceImportRequest request, string? ipAddress = null, string? userAgent = null)
    {
        var validationResults = new List<SystemValidationResult>();

        try
        {
            var importData = JsonSerializer.Deserialize<JsonElement>(request.Data);
            
            if (!importData.TryGetProperty("Preferences", out var preferencesElement))
            {
                validationResults.Add(new SystemValidationResult("Invalid import format: missing 'Preferences' property"));
                return validationResults;
            }

            var preferences = new List<UpdateUserPreferenceRequest>();
            
            foreach (var prefElement in preferencesElement.EnumerateArray())
            {
                try
                {
                    var categoryKey = prefElement.GetProperty("CategoryKey").GetString();
                    var preferenceKey = prefElement.GetProperty("PreferenceKey").GetString();
                    var preferenceValue = prefElement.GetProperty("PreferenceValue");
                    var dataType = prefElement.TryGetProperty("DataType", out var dtElement) ? dtElement.GetString() : "string";
                    var priority = prefElement.TryGetProperty("Priority", out var prElement) ? prElement.GetInt32() : 100;

                    if (string.IsNullOrEmpty(categoryKey) || string.IsNullOrEmpty(preferenceKey))
                        continue;

                    preferences.Add(new UpdateUserPreferenceRequest
                    {
                        CategoryKey = categoryKey,
                        PreferenceKey = preferenceKey,
                        PreferenceValue = JsonSerializer.Deserialize<object>(preferenceValue.GetRawText()) ?? new object(),
                        DataType = dataType ?? "string",
                        Priority = priority
                    });
                }
                catch (Exception ex)
                {
                    validationResults.Add(new SystemValidationResult($"Invalid preference format: {ex.Message}"));
                }
            }

            if (request.ValidateOnly)
            {
                // Only validate, don't import
                foreach (var pref in preferences)
                {
                    var isValid = await ValidatePreferenceValueAsync(pref.CategoryKey, pref.PreferenceKey, pref.PreferenceValue, pref.DataType);
                    if (!isValid)
                        validationResults.Add(new SystemValidationResult($"Invalid value for {pref.CategoryKey}.{pref.PreferenceKey}"));
                }
            }
            else
            {
                // Perform the import
                await BulkUpdatePreferencesAsync(userId, new BulkUpdatePreferencesRequest
                {
                    Preferences = preferences,
                    MergeMode = !request.OverwriteExisting
                }, ipAddress, userAgent);
            }
        }
        catch (Exception ex)
        {
            validationResults.Add(new SystemValidationResult($"Import failed: {ex.Message}"));
        }

        return validationResults;
    }

    public async Task<bool> ValidatePreferenceValueAsync(string categoryKey, string preferenceKey, object value, string dataType)
    {
        // Get validation schema from default preference if available
        var defaultPref = await _context.DefaultPreferences
            .Include(d => d.Category)
            .FirstOrDefaultAsync(d => d.Category.CategoryKey == categoryKey && d.PreferenceKey == preferenceKey);

        // Basic data type validation
        try
        {
            switch (dataType.ToLower())
            {
                case "string":
                    return value is string;
                case "number":
                case "integer":
                    return value is int or long or double or decimal;
                case "boolean":
                    return value is bool;
                case "array":
                    return value is System.Collections.IEnumerable;
                case "object":
                    return value != null;
                default:
                    return true; // Unknown type, allow
            }
        }
        catch
        {
            return false;
        }
    }

    public async Task SeedDefaultPreferencesAsync()
    {
        // Check if preferences are already seeded
        if (await _context.PreferenceCategories.AnyAsync())
            return;

        // Create default categories
        var categories = new[]
        {
            new PreferenceCategory { CategoryKey = "ui", DisplayName = "User Interface", Description = "User interface preferences", IconClass = "fas fa-desktop", SortOrder = 1 },
            new PreferenceCategory { CategoryKey = "notifications", DisplayName = "Notifications", Description = "Notification preferences", IconClass = "fas fa-bell", SortOrder = 2 },
            new PreferenceCategory { CategoryKey = "privacy", DisplayName = "Privacy & Security", Description = "Privacy and security settings", IconClass = "fas fa-shield-alt", SortOrder = 3 },
            new PreferenceCategory { CategoryKey = "account", DisplayName = "Account Settings", Description = "Account-related preferences", IconClass = "fas fa-user-cog", SortOrder = 4 },
            new PreferenceCategory { CategoryKey = "streaming", DisplayName = "Streaming Preferences", Description = "Content and streaming preferences", IconClass = "fas fa-play", SortOrder = 5 }
        };

        _context.PreferenceCategories.AddRange(categories);
        await _context.SaveChangesAsync();

        // Create default preferences
        var defaults = new[]
        {
            new DefaultPreference { CategoryId = categories[0].Id, PreferenceKey = "theme", DisplayName = "Theme", Description = "Application theme", DefaultValue = "\"light\"", DataType = "string", IsUserConfigurable = true },
            new DefaultPreference { CategoryId = categories[0].Id, PreferenceKey = "language", DisplayName = "Language", Description = "Interface language", DefaultValue = "\"en\"", DataType = "string", IsUserConfigurable = true },
            new DefaultPreference { CategoryId = categories[1].Id, PreferenceKey = "email_notifications", DisplayName = "Email Notifications", Description = "Enable email notifications", DefaultValue = "true", DataType = "boolean", IsUserConfigurable = true },
            new DefaultPreference { CategoryId = categories[1].Id, PreferenceKey = "push_notifications", DisplayName = "Push Notifications", Description = "Enable push notifications", DefaultValue = "true", DataType = "boolean", IsUserConfigurable = true },
            new DefaultPreference { CategoryId = categories[2].Id, PreferenceKey = "data_sharing", DisplayName = "Data Sharing", Description = "Allow data sharing for analytics", DefaultValue = "false", DataType = "boolean", IsUserConfigurable = true },
            new DefaultPreference { CategoryId = categories[3].Id, PreferenceKey = "auto_play", DisplayName = "Auto Play", Description = "Auto play video content", DefaultValue = "true", DataType = "boolean", IsUserConfigurable = true }
        };

        _context.DefaultPreferences.AddRange(defaults);
        await _context.SaveChangesAsync();
    }

    private async Task LogPreferenceChangeAsync(Guid userId, string categoryKey, string preferenceKey, string? oldValue, string? newValue, string action, string? ipAddress, string? userAgent)
    {
        var history = new PreferenceHistory
        {
            UserId = userId,
            CategoryKey = categoryKey,
            PreferenceKey = preferenceKey,
            OldValue = oldValue,
            NewValue = newValue ?? "{}",
            Action = action,
            ChangeSource = "user",
            IpAddress = ipAddress,
            UserAgent = userAgent
        };

        _context.PreferenceHistory.Add(history);
    }

    private static UserPreferenceDto MapToDto(UserPreference preference)
    {
        return new UserPreferenceDto
        {
            Id = preference.Id,
            CategoryKey = preference.CategoryKey,
            PreferenceKey = preference.PreferenceKey,
            PreferenceValue = JsonSerializer.Deserialize<object>(preference.PreferenceValue) ?? new object(),
            DataType = preference.DataType,
            IsUserOverride = preference.IsUserOverride,
            Priority = preference.Priority,
            UpdatedAt = preference.UpdatedAt
        };
    }

    private static DefaultPreferenceDto MapToDto(DefaultPreference preference)
    {
        return new DefaultPreferenceDto
        {
            Id = preference.Id,
            CategoryKey = preference.Category.CategoryKey,
            PreferenceKey = preference.PreferenceKey,
            DisplayName = preference.DisplayName,
            Description = preference.Description,
            DefaultValue = JsonSerializer.Deserialize<object>(preference.DefaultValue) ?? new object(),
            DataType = preference.DataType,
            IsUserConfigurable = preference.IsUserConfigurable,
            RequiresRestart = preference.RequiresRestart,
            ValidationSchema = preference.ValidationSchema
        };
    }

    private PreferenceCategoryDto BuildCategoryTree(List<PreferenceCategory> categories, string? rootCategoryKey)
    {
        var rootCategory = string.IsNullOrEmpty(rootCategoryKey) 
            ? categories.FirstOrDefault(c => c.ParentCategoryId == null) 
            : categories.FirstOrDefault(c => c.CategoryKey == rootCategoryKey);

        if (rootCategory == null)
        {
            return new PreferenceCategoryDto
            {
                CategoryKey = "root",
                DisplayName = "All Preferences",
                ChildCategories = categories.Where(c => c.ParentCategoryId == null)
                    .Select(c => BuildCategoryTreeRecursive(categories, c))
                    .ToList()
            };
        }

        return BuildCategoryTreeRecursive(categories, rootCategory);
    }

    private PreferenceCategoryDto BuildCategoryTreeRecursive(List<PreferenceCategory> categories, PreferenceCategory category)
    {
        return new PreferenceCategoryDto
        {
            Id = category.Id,
            CategoryKey = category.CategoryKey,
            DisplayName = category.DisplayName,
            Description = category.Description,
            ParentCategoryId = category.ParentCategoryId,
            SortOrder = category.SortOrder,
            IconClass = category.IconClass,
            IsVisible = category.IsVisible,
            ChildCategories = categories.Where(c => c.ParentCategoryId == category.Id)
                .Select(c => BuildCategoryTreeRecursive(categories, c))
                .ToList()
        };
    }
}