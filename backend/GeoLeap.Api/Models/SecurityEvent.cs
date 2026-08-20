using System.ComponentModel.DataAnnotations;

namespace GeoLeap.Api.Models;

public class SecurityEvent
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }

    [Required]
    [MaxLength(50)]
    public string EventType { get; set; } = string.Empty; // 'LOGIN_SUCCESS', 'LOGIN_FAILED', 'PASSWORD_CHANGE', etc.

    [MaxLength(45)]
    public string? IpAddress { get; set; }

    [MaxLength(1000)]
    public string? UserAgent { get; set; }

    [MaxLength(200)]
    public string? Location { get; set; } // Derived from IP

    public int RiskScore { get; set; } = 0; // 0-100 risk assessment

    public string? Details { get; set; } // JSON with additional context
    
    public string? Description { get; set; }
    
    public string? Metadata { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    /// <summary>
    /// Timestamp alias for compatibility with PerformanceIndexConfiguration
    /// </summary>
    public DateTime Timestamp => CreatedAt;
    
    /// <summary>
    /// Severity level based on risk score
    /// </summary>
    public string Severity => RiskScore switch
    {
        >= 80 => "Critical",
        >= 60 => "High",
        >= 40 => "Medium",
        >= 20 => "Low",
        _ => "Info"
    };

    // Navigation property
    public virtual User User { get; set; } = null!;
}