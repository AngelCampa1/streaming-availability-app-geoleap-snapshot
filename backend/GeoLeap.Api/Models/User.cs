using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.AspNetCore.Identity;

namespace GeoLeap.Api.Models;

public class User : IdentityUser<Guid>
{
    public User()
    {
        Id = Guid.NewGuid();
    }

    [MaxLength(100)]
    public string FirstName { get; set; } = string.Empty;

    [MaxLength(100)]
    public string LastName { get; set; } = string.Empty;
    
    /// <summary>
    /// Computed full name property combining first and last name
    /// </summary>
    [NotMapped]
    public string FullName => $"{FirstName} {LastName}".Trim();

    [MaxLength(100)]
    public string? DisplayName { get; set; }

    [MaxLength(10)]
    public string Language { get; set; } = "en";
    
    [MaxLength(10)]
    public string PreferredLanguage { get; set; } = "en";
    
    [MaxLength(50)]
    public string Timezone { get; set; } = "UTC";

    [MaxLength(2)]
    public string? Country { get; set; }

    [MaxLength(500)]
    public string? ProfileImageUrl { get; set; }

    [MaxLength(500)]
    public string? Bio { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastLoginAt { get; set; }
    
    /// <summary>
    /// LastLogin alias for compatibility with AdminDataExportService
    /// </summary>
    public DateTime? LastLogin => LastLoginAt;
    
    public bool IsActive { get; set; } = true;
    
    // Payment information placeholder for test compatibility
    public string? PaymentInformation { get; set; }

    // OAuth Integration
    [MaxLength(100)]
    public string? GoogleId { get; set; }

    [MaxLength(100)]
    public string? AppleId { get; set; }

    // Audit fields
    public Guid? CreatedBy { get; set; }
    public DateTime ModifiedAt { get; set; } = DateTime.UtcNow;
    public Guid? ModifiedBy { get; set; }

    // Admin suspension fields
    public bool IsSuspended { get; set; } = false;
    public DateTime? SuspendedAt { get; set; }
    
    [MaxLength(500)]
    public string? SuspensionReason { get; set; }
    
    public DateTime? LastAdminAction { get; set; }

    // Navigation Properties
    public virtual ICollection<UserRole> UserRoles { get; set; } = new List<UserRole>();
    public virtual ICollection<UserAuditLog> AuditLogs { get; set; } = new List<UserAuditLog>();
    public virtual NotificationPreferences? NotificationPreferences { get; set; }
    public virtual ICollection<UserActivityLog> ActivityLogs { get; set; } = new List<UserActivityLog>();
    public virtual ICollection<SecurityEvent> SecurityEvents { get; set; } = new List<SecurityEvent>();
    public virtual SecurityPreferences? SecurityPreferences { get; set; }
    public virtual ICollection<UserSession> UserSessions { get; set; } = new List<UserSession>();

    // Onboarding properties
    public virtual UserOnboarding? Onboarding { get; set; }
    public virtual ICollection<UserStreamingService> StreamingServices { get; set; } = new List<UserStreamingService>();
    public virtual ICollection<UserRegionPreference> RegionPreferences { get; set; } = new List<UserRegionPreference>();
    public virtual ICollection<UserContentPreference> ContentPreferences { get; set; } = new List<UserContentPreference>();
    
    // Watchlist-related navigation properties
    public virtual ICollection<Watchlist> Watchlists { get; set; } = new List<Watchlist>();
    public virtual WatchlistNotificationSettings? WatchlistNotificationSettings { get; set; }
    public virtual NotificationPreferences? NotificationSettings { get; set; }

    // Additional properties needed by services
    public DateTime? DateOfBirth { get; set; }
    public DateTime? LastPasswordChangeDate { get; set; }
    
    [MaxLength(20)]
    public string SubscriptionTier { get; set; } = "free";

    // Account freeze properties for support service
    public DateTime? FrozenAt { get; set; }
    public Guid? FrozenBy { get; set; }
    
    [MaxLength(500)]
    public string? FreezeReason { get; set; }
    
    public DateTime? UnfreezeAt { get; set; }

    // Social and privacy navigation properties
    public virtual ICollection<SocialPrivacyConsent> SocialPrivacyConsents { get; set; } = new List<SocialPrivacyConsent>();
    
    // Computed properties for backwards compatibility

    [NotMapped]
    public DateTime UpdatedAt
    {
        get => ModifiedAt;
        set => ModifiedAt = value;
    }
}