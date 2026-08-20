using System.ComponentModel.DataAnnotations;

namespace GeoLeap.Api.Models;

public class UserImpersonationSession
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public Guid AdminUserId { get; set; }
    
    [Required]
    public Guid ImpersonatedUserId { get; set; }
    
    [Required]
    [MaxLength(255)]
    public string SessionToken { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(500)]
    public string Reason { get; set; } = string.Empty;
    
    public DateTime StartedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime? EndedAt { get; set; }
    
    public bool IsActive { get; set; } = true;
    
    [MaxLength(100)]
    public string? EndReason { get; set; }
    
    // Navigation Properties
    public virtual User AdminUser { get; set; } = null!;
    public virtual User ImpersonatedUser { get; set; } = null!;
}

public enum ImpersonationEndReason
{
    Timeout,
    ManualEnd,
    AdminTerminated,
    SessionExpired
}