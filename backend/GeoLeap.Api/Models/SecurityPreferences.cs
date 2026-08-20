using System.ComponentModel.DataAnnotations;

namespace GeoLeap.Api.Models;

public class SecurityPreferences
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid UserId { get; set; }

    public bool EmailSecurityAlerts { get; set; } = true;

    public bool EmailLoginNotifications { get; set; } = false;

    public bool TwoFactorEnabled { get; set; } = false; // For future 2FA implementation

    public bool SecurityQuestionEnabled { get; set; } = false;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime ModifiedAt { get; set; } = DateTime.UtcNow;

    // Navigation property
    public virtual User User { get; set; } = null!;
}