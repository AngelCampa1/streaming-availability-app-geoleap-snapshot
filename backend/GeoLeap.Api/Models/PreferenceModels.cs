using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;

namespace GeoLeap.Api.Models;

/// <summary>
/// User preferences with hierarchical structure and JSON support
/// </summary>
public class UserPreference
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid UserId { get; set; }

    [Required]
    [MaxLength(100)]
    public string CategoryKey { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    public string PreferenceKey { get; set; } = string.Empty;

    /// <summary>
    /// JSON value supporting complex preference structures
    /// </summary>
    [Column(TypeName = "json")]
    public string PreferenceValue { get; set; } = "{}";

    /// <summary>
    /// Data type for validation (string, number, boolean, array, object)
    /// </summary>
    [MaxLength(50)]
    public string DataType { get; set; } = "string";

    /// <summary>
    /// Indicates if this preference overrides system defaults
    /// </summary>
    public bool IsUserOverride { get; set; } = true;

    /// <summary>
    /// Priority level for preference inheritance (higher = more priority)
    /// </summary>
    public int Priority { get; set; } = 100;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Navigation property
    /// </summary>
    public virtual User User { get; set; } = null!;
    public virtual PreferenceCategory Category { get; set; } = null!;

    /// <summary>
    /// Typed value accessor for common types
    /// </summary>
    public T GetValue<T>()
    {
        try
        {
            return JsonSerializer.Deserialize<T>(PreferenceValue) ?? default(T)!;
        }
        catch
        {
            return default(T)!;
        }
    }

    /// <summary>
    /// Set typed value with automatic JSON serialization
    /// </summary>
    public void SetValue<T>(T value)
    {
        PreferenceValue = JsonSerializer.Serialize(value);
        UpdatedAt = DateTime.UtcNow;
    }
}

/// <summary>
/// Hierarchical preference categories for organization
/// </summary>
public class PreferenceCategory
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(100)]
    public string CategoryKey { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    public string DisplayName { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Description { get; set; }

    /// <summary>
    /// Parent category for hierarchical structure
    /// </summary>
    public Guid? ParentCategoryId { get; set; }

    /// <summary>
    /// Display order within parent category
    /// </summary>
    public int SortOrder { get; set; } = 0;

    /// <summary>
    /// Category icon for UI display
    /// </summary>
    [MaxLength(100)]
    public string? IconClass { get; set; }

    /// <summary>
    /// Whether this category is visible to users
    /// </summary>
    public bool IsVisible { get; set; } = true;

    /// <summary>
    /// Whether this category requires admin access
    /// </summary>
    public bool RequiresAdmin { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Navigation properties
    /// </summary>
    public virtual PreferenceCategory? ParentCategory { get; set; }
    public virtual ICollection<PreferenceCategory> ChildCategories { get; set; } = new List<PreferenceCategory>();
    public virtual ICollection<UserPreference> UserPreferences { get; set; } = new List<UserPreference>();
    public virtual ICollection<DefaultPreference> DefaultPreferences { get; set; } = new List<DefaultPreference>();
}

/// <summary>
/// System default preferences that serve as fallbacks
/// </summary>
public class DefaultPreference
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid CategoryId { get; set; }

    [Required]
    [MaxLength(200)]
    public string PreferenceKey { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    public string DisplayName { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Description { get; set; }

    /// <summary>
    /// Default JSON value
    /// </summary>
    [Column(TypeName = "json")]
    public string DefaultValue { get; set; } = "{}";

    /// <summary>
    /// Data type for validation
    /// </summary>
    [MaxLength(50)]
    public string DataType { get; set; } = "string";

    /// <summary>
    /// JSON schema for validation
    /// </summary>
    [Column(TypeName = "json")]
    public string? ValidationSchema { get; set; }

    /// <summary>
    /// Whether users can override this preference
    /// </summary>
    public bool IsUserConfigurable { get; set; } = true;

    /// <summary>
    /// Whether this preference requires restart to take effect
    /// </summary>
    public bool RequiresRestart { get; set; } = false;

    /// <summary>
    /// Priority level for inheritance
    /// </summary>
    public int Priority { get; set; } = 0;

    /// <summary>
    /// Scope of the preference (user, system, global)
    /// </summary>
    [MaxLength(50)]
    public string Scope { get; set; } = "user";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Navigation properties
    /// </summary>
    public virtual PreferenceCategory Category { get; set; } = null!;

    /// <summary>
    /// Typed default value accessor
    /// </summary>
    public T GetDefaultValue<T>()
    {
        try
        {
            return JsonSerializer.Deserialize<T>(DefaultValue) ?? default(T)!;
        }
        catch
        {
            return default(T)!;
        }
    }
}

/// <summary>
/// Audit trail for preference changes
/// </summary>
public class PreferenceHistory
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid UserId { get; set; }

    [Required]
    [MaxLength(100)]
    public string CategoryKey { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    public string PreferenceKey { get; set; } = string.Empty;

    /// <summary>
    /// Previous value before change
    /// </summary>
    [Column(TypeName = "json")]
    public string? OldValue { get; set; }

    /// <summary>
    /// New value after change
    /// </summary>
    [Column(TypeName = "json")]
    public string NewValue { get; set; } = "{}";

    /// <summary>
    /// Action type (created, updated, deleted, imported)
    /// </summary>
    [MaxLength(50)]
    public string Action { get; set; } = "updated";

    /// <summary>
    /// Source of the change (user, admin, import, system)
    /// </summary>
    [MaxLength(50)]
    public string ChangeSource { get; set; } = "user";

    /// <summary>
    /// IP address of the user making the change
    /// </summary>
    [MaxLength(45)]
    public string? IpAddress { get; set; }

    /// <summary>
    /// User agent string
    /// </summary>
    [MaxLength(500)]
    public string? UserAgent { get; set; }

    /// <summary>
    /// Additional metadata about the change
    /// </summary>
    [Column(TypeName = "json")]
    public string? Metadata { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Navigation properties
    /// </summary>
    public virtual User User { get; set; } = null!;
}

/// <summary>
/// Data Transfer Objects for API responses
/// </summary>
public class UserPreferenceDto
{
    public Guid Id { get; set; }
    public string CategoryKey { get; set; } = string.Empty;
    public string PreferenceKey { get; set; } = string.Empty;
    public object PreferenceValue { get; set; } = new();
    public string DataType { get; set; } = "string";
    public bool IsUserOverride { get; set; }
    public int Priority { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class PreferenceCategoryDto
{
    public Guid Id { get; set; }
    public string CategoryKey { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public Guid? ParentCategoryId { get; set; }
    public int SortOrder { get; set; }
    public string? IconClass { get; set; }
    public bool IsVisible { get; set; }
    public List<PreferenceCategoryDto> ChildCategories { get; set; } = new();
    public List<UserPreferenceDto> Preferences { get; set; } = new();
}

public class DefaultPreferenceDto
{
    public Guid Id { get; set; }
    public string CategoryKey { get; set; } = string.Empty;
    public string PreferenceKey { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string? Description { get; set; }
    public object DefaultValue { get; set; } = new();
    public string DataType { get; set; } = "string";
    public bool IsUserConfigurable { get; set; }
    public bool RequiresRestart { get; set; }
    public string? ValidationSchema { get; set; }
}

/// <summary>
/// Request DTOs for API operations
/// </summary>
public class UpdateUserPreferenceRequest
{
    [Required]
    public string CategoryKey { get; set; } = string.Empty;

    [Required]
    public string PreferenceKey { get; set; } = string.Empty;

    [Required]
    public object PreferenceValue { get; set; } = new();

    public string DataType { get; set; } = "string";
    public int Priority { get; set; } = 100;
}

public class BulkUpdatePreferencesRequest
{
    [Required]
    public List<UpdateUserPreferenceRequest> Preferences { get; set; } = new();

    public bool MergeMode { get; set; } = true; // If false, replaces all preferences
}

public class PreferenceExportRequest
{
    public List<string>? CategoryKeys { get; set; }
    public bool IncludeDefaults { get; set; } = false;
    public string Format { get; set; } = "json";
}

public class PreferenceImportRequest
{
    [Required]
    public string Data { get; set; } = string.Empty;

    public string Format { get; set; } = "json";
    public bool OverwriteExisting { get; set; } = true;
    public bool ValidateOnly { get; set; } = false;
}