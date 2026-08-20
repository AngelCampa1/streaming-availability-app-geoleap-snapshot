using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GeoLeap.Api.Models;

public class AdminAction
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public Guid AdminUserId { get; set; }
    
    public Guid? TargetUserId { get; set; }
    
    [Required]
    [MaxLength(100)]
    public string ActionType { get; set; } = string.Empty;
    
    [MaxLength(4000)]
    public string? Details { get; set; }
    
    [MaxLength(45)]
    public string? IpAddress { get; set; }
    
    [MaxLength(1000)]
    public string? UserAgent { get; set; }
    
    [Required]
    public Guid CorrelationId { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    /// <summary>
    /// Timestamp alias for compatibility with PerformanceIndexConfiguration
    /// </summary>
    public DateTime Timestamp => CreatedAt;
    
    // Navigation Properties
    public virtual User AdminUser { get; set; } = null!;
    public virtual User? TargetUser { get; set; }
}

public enum AdminActionType
{
    UserView,
    UserEdit,
    UserSuspend,
    UserUnsuspend,
    UserDeactivate,
    UserReactivate,
    RoleAssign,
    RoleRemove,
    PasswordReset,
    UserImpersonationStart,
    UserImpersonationEnd,
    DataExport,
    BulkOperation
}