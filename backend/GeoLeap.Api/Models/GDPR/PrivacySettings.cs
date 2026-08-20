using System.ComponentModel.DataAnnotations;

namespace GeoLeap.Api.Models.GDPR;

/// <summary>
/// User privacy settings for GDPR compliance
/// </summary>
public class PrivacySettings
{
    [Key]
    public Guid Id { get; set; }
    
    [Required]
    public Guid UserId { get; set; }
    
    /// <summary>
    /// User has explicitly consented to data processing
    /// </summary>
    [Required]
    public bool EnableDataProcessing { get; set; } = false;
    
    /// <summary>
    /// Allow personalized content and recommendations
    /// </summary>
    [Required]
    public bool AllowPersonalization { get; set; } = false;
    
    /// <summary>
    /// Allow sharing data with third parties (with consent)
    /// </summary>
    [Required]
    public bool AllowThirdPartySharing { get; set; } = false;
    
    /// <summary>
    /// Allow marketing communications
    /// </summary>
    [Required]
    public bool AllowMarketingCommunications { get; set; } = false;
    
    /// <summary>
    /// Allow analytics and usage tracking
    /// </summary>
    [Required]
    public bool AllowAnalytics { get; set; } = false;
    
    /// <summary>
    /// Data retention preference (in days, max allowed by policy)
    /// </summary>
    public int? PreferredRetentionDays { get; set; }
    
    /// <summary>
    /// User's preferred data export format
    /// </summary>
    [StringLength(20)]
    public string PreferredExportFormat { get; set; } = "json"; // "json", "xml", "csv"
    
    /// <summary>
    /// Whether to include detailed metadata in data exports
    /// </summary>
    public bool IncludeMetadataInExports { get; set; } = true;
    
    /// <summary>
    /// Minimum data processing - only essential data
    /// </summary>
    public bool MinimalDataProcessing { get; set; } = false;
    
    [Required]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime? UpdatedAt { get; set; }
    
    /// <summary>
    /// Last time user reviewed their privacy settings
    /// </summary>
    public DateTime? LastReviewedAt { get; set; }
    
    // Navigation properties
    public User User { get; set; } = null!;
}

/// <summary>
/// Result of GDPR data export operation
/// </summary>
public class GdprDataExportResult
{
    public Guid UserId { get; set; }
    public DateTime ExportedAt { get; set; }
    public string Data { get; set; } = string.Empty;
    public string Format { get; set; } = "JSON";
    public bool Success { get; set; }
    public string? ErrorMessage { get; set; }
    public long DataSize { get; set; }
    public string ExportId { get; set; } = Guid.NewGuid().ToString();
    public DateTime? ExpiresAt { get; set; }
    public bool IsEncrypted { get; set; }
    public string? DownloadUrl { get; set; }
}

/// <summary>
/// Data retention item for GDPR compliance tracking
/// </summary>
public class DataRetentionItem
{
    public Guid Id { get; set; }
    public string DataType { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public DateTime LastAccessedAt { get; set; }
    public int RetentionDays { get; set; }
    public bool ShouldBeDeleted { get; set; }
}