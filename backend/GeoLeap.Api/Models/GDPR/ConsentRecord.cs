using System.ComponentModel.DataAnnotations;

namespace GeoLeap.Api.Models.GDPR;

/// <summary>
/// GDPR consent tracking record for user data processing consent
/// </summary>
public class ConsentRecord
{
    [Key]
    public Guid Id { get; set; }
    
    [Required]
    public Guid UserId { get; set; }
    
    [Required]
    [StringLength(100)]
    public string Purpose { get; set; } = string.Empty; // e.g., "marketing", "analytics", "notifications"
    
    [Required]
    public bool ConsentGiven { get; set; }
    
    [Required]
    public DateTime ConsentDate { get; set; }
    
    public DateTime? ConsentWithdrawnDate { get; set; }
    
    [StringLength(50)]
    public string ConsentMethod { get; set; } = string.Empty; // e.g., "checkbox", "api", "email"
    
    [StringLength(500)]
    public string? ConsentText { get; set; } // The exact text user consented to
    
    [StringLength(20)]
    public string Version { get; set; } = "1.0"; // Version of consent text/terms
    
    [StringLength(45)]
    public string? IpAddress { get; set; } // IP when consent was given
    
    [StringLength(500)]
    public string? UserAgent { get; set; } // User agent when consent was given
    
    public bool IsActive { get; set; } = true;
    
    // Navigation properties
    public User User { get; set; } = null!;
}