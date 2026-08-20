using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GeoLeap.Api.Models;

[Table("UserAuditLogs")]
public class UserAuditLog
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid UserId { get; set; }

    [Required]
    [MaxLength(100)]
    public string Action { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string Resource { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string Details { get; set; } = string.Empty;

    [MaxLength(50)]
    public string IpAddress { get; set; } = string.Empty;

    [MaxLength(500)]
    public string UserAgent { get; set; } = string.Empty;

    public bool Success { get; set; } = true;
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    
    // Additional properties for AdminAuditService compatibility
    public string EntityType { get; set; } = string.Empty;
    public string EntityId { get; set; } = string.Empty;
    public string? NewValues { get; set; }
    public string? OldValues { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string? CorrelationId { get; set; }

    // Optional: For role/permission changes
    public Guid? AffectedUserId { get; set; }
    public Guid? RoleId { get; set; }
    public Guid? PermissionId { get; set; }

    // Navigation Properties
    [ForeignKey("UserId")]
    public virtual User User { get; set; } = null!;

    [ForeignKey("AffectedUserId")]
    public virtual User? AffectedUser { get; set; }

    [ForeignKey("RoleId")]
    public virtual Role? Role { get; set; }

    [ForeignKey("PermissionId")]
    public virtual Permission? Permission { get; set; }
}