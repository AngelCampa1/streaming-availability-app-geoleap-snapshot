using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GeoLeap.Api.Models;

public class UserSession
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public Guid UserId { get; set; }
    
    [Required]
    [MaxLength(255)]
    public string RefreshToken { get; set; } = string.Empty;
    
    [MaxLength(500)]
    public string? SessionToken { get; set; }
    
    [MaxLength(500)]
    public string? DeviceInfo { get; set; }
    
    [MaxLength(45)]
    public string? IpAddress { get; set; }
    
    [MaxLength(1000)]
    public string? UserAgent { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime LastAccessedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime ExpiresAt { get; set; }
    
    public bool IsActive { get; set; } = true;
    
    public DateTime? RevokedAt { get; set; }
    
    [MaxLength(100)]
    public string? DeviceName { get; set; }
    
    [MaxLength(50)]
    public string? OperatingSystem { get; set; }
    
    [MaxLength(50)]
    public string? Browser { get; set; }
    
    [MaxLength(200)]
    public string? Location { get; set; }
    
    public bool IsCurrentSession { get; set; } = false;
    
    public DateTime? EndedAt { get; set; }
    
    /// <summary>
    /// Alias for EndedAt (for compatibility with BusinessAnalyticsController)
    /// </summary>
    [NotMapped]
    public DateTime? EndTime => EndedAt;
    
    /// <summary>
    /// Alias for LastAccessedAt (for compatibility with BusinessAnalyticsController)
    /// </summary>
    [NotMapped]
    public DateTime LastActivity => LastAccessedAt;
    
    // Navigation property
    public virtual User User { get; set; } = null!;
    
    // Computed properties for analytics compatibility
    [NotMapped]
    public string SessionId => Id.ToString();
    
    [NotMapped]
    public int UniquePages { get; set; } = 0;
    
    [NotMapped]
    public int PageViews { get; set; } = 0;
    
    [NotMapped]
    public int Interactions { get; set; } = 0;
    
    [NotMapped]
    public decimal? AvgTimePerPage { get; set; }
    
    [NotMapped]
    public bool IsBounce { get; set; } = false;
    
    [NotMapped]
    public bool IsConversion { get; set; } = false;
    
    [NotMapped]
    public string? ConversionType { get; set; }
    
    [NotMapped]
    public DateTime StartTime => CreatedAt;
    
    [NotMapped]
    public string? LandingPage { get; set; }
    
    [NotMapped]
    public string? ExitPage { get; set; }
}