using System.ComponentModel.DataAnnotations;

namespace GeoLeap.Api.Models;

public class NotificationPreferences
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public Guid UserId { get; set; }
    
    public bool EmailNotifications { get; set; } = true;
    public bool PushNotifications { get; set; } = true;
    public bool SmsNotifications { get; set; } = false;
    public bool SystemAlerts { get; set; } = true;
    public bool BusinessAlerts { get; set; } = true;
    public bool UserActionAlerts { get; set; } = true;
    public bool SecurityAlerts { get; set; } = true;
    public bool PaymentAlerts { get; set; } = true;
    public bool UpdateNotifications { get; set; } = true;
    public bool MarketingEmails { get; set; } = false;
    public bool MarketingNotifications { get; set; } = false;
    public bool WeeklyDigest { get; set; } = true;
    public bool WatchlistUpdates { get; set; } = true;
    public bool NewContentAlerts { get; set; } = true;
    public bool PriceDropAlerts { get; set; } = true;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime ModifiedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation property
    public virtual User User { get; set; } = null!;
}