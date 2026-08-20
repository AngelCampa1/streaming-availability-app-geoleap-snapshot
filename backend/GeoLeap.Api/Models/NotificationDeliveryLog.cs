using System.ComponentModel.DataAnnotations;

namespace GeoLeap.Api.Models;

/// <summary>
/// Audit log for notification deliveries
/// Tracks when notifications were sent and through which channels
/// </summary>
public class NotificationDeliveryLog
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    public Guid UserId { get; set; }

    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [MaxLength(1000)]
    public string Message { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string Type { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string Channels { get; set; } = string.Empty;

    public bool Success { get; set; }

    [MaxLength(500)]
    public string? ErrorMessage { get; set; }
    
    [Required]
    [MaxLength(100)]
    public string NotificationType { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(50)]
    public string DeliveryMethod { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(20)]
    public string Status { get; set; } = "pending";

    public DateTime DeliveredAt { get; set; } = DateTime.UtcNow;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    /// <summary>
    /// Metadata associated with the notification delivery
    /// </summary>
    [MaxLength(2000)]
    public string? Metadata { get; set; }
    
    /// <summary>
    /// Timestamp when the notification was clicked/opened by the user
    /// </summary>
    public DateTime? ClickedAt { get; set; }

    // Navigation properties
    public virtual User User { get; set; } = null!;
}