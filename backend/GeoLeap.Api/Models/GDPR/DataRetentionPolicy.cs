using System.ComponentModel.DataAnnotations;

namespace GeoLeap.Api.Models.GDPR;

/// <summary>
/// Data retention policy configuration for GDPR compliance
/// </summary>
public class DataRetentionPolicy
{
    [Key]
    public Guid Id { get; set; }
    
    [Required]
    [StringLength(100)]
    public string DataType { get; set; } = string.Empty; // e.g., "notification_logs", "user_preferences", "watchlist_data"
    
    [Required]
    public int RetentionDays { get; set; }
    
    [StringLength(200)]
    public string Description { get; set; } = string.Empty;
    
    [Required]
    public bool IsActive { get; set; } = true;
    
    [Required]
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime? UpdatedAt { get; set; }
    
    [StringLength(100)]
    public string CreatedBy { get; set; } = "system";
    
    /// <summary>
    /// Whether this data type should be automatically purged when retention period expires
    /// </summary>
    public bool AutoPurge { get; set; } = true;
    
    /// <summary>
    /// Legal basis for data retention (e.g., "legitimate_interest", "contract", "legal_obligation")
    /// </summary>
    [StringLength(50)]
    public string LegalBasis { get; set; } = "legitimate_interest";
}