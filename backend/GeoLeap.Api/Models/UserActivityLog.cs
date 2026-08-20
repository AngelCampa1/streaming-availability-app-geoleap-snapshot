using System.ComponentModel.DataAnnotations;

namespace GeoLeap.Api.Models;

public class UserActivityLog
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public Guid UserId { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string ActivityType { get; set; } = string.Empty;
    
    [MaxLength(500)]
    public string? Description { get; set; }
    
    [MaxLength(45)]
    public string? IpAddress { get; set; }
    
    [MaxLength(1000)]
    public string? UserAgent { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    /// <summary>
    /// Timestamp alias for compatibility with PerformanceIndexConfiguration
    /// </summary>
    public DateTime Timestamp => CreatedAt;
    
    // Navigation property
    public virtual User User { get; set; } = null!;
}