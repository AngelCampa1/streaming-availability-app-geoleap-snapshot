using System.ComponentModel.DataAnnotations;

namespace GeoLeap.Api.Models;

public class UserProfileDto
{
    public Guid Id { get; set; }
    public string? Email { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string? DisplayName { get; set; }
    public string? TimeZone { get; set; }
    public string Language { get; set; } = "en";
    public string? ProfileImageUrl { get; set; }
    public string? Bio { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? LastLoginAt { get; set; }
    public bool EmailVerified { get; set; }
    
    // Connected accounts
    public bool HasGoogleAccount { get; set; }
    public bool HasAppleAccount { get; set; }
    
    // Notification preferences
    public NotificationPreferencesDto? NotificationPreferences { get; set; }
}

public class UpdateUserProfileDto
{
    [MaxLength(100)]
    public string FirstName { get; set; } = string.Empty;
    
    [MaxLength(100)]
    public string LastName { get; set; } = string.Empty;
    
    [MaxLength(100)]
    public string? DisplayName { get; set; }
    
    [MaxLength(50)]
    public string? TimeZone { get; set; }
    
    [MaxLength(10)]
    [RegularExpression("^[a-z]{2}(-[A-Z]{2})?$", ErrorMessage = "Language must be in format 'en' or 'en-US'")]
    public string Language { get; set; } = "en";
    
    [MaxLength(500)]
    [Url(ErrorMessage = "Profile image URL must be a valid URL")]
    public string? ProfileImageUrl { get; set; }
    
    [MaxLength(500)]
    public string? Bio { get; set; }
}

public class ChangeEmailRequestDto
{
    [Required]
    [EmailAddress]
    public string NewEmail { get; set; } = string.Empty;
    
    [Required]
    public string CurrentPassword { get; set; } = string.Empty;
}

public class VerifyEmailChangeDto
{
    [Required]
    public string Token { get; set; } = string.Empty;
}

public class DeleteAccountRequestDto
{
    [Required]
    [RegularExpression("^DELETE$", ErrorMessage = "Confirmation must be DELETE")]
    public string Confirmation { get; set; } = string.Empty;
}

public class NotificationPreferencesDto
{
    public bool EmailNotifications { get; set; } = true;
    public bool PushNotifications { get; set; } = true;
    public bool MarketingEmails { get; set; } = false;
    public bool WeeklyDigest { get; set; } = true;
}

public class UserActivityLogDto
{
    public Guid Id { get; set; }
    public string ActivityType { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? IpAddress { get; set; }
    public string? UserAgent { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class SocialAccountDto
{
    public string Provider { get; set; } = string.Empty;
    public bool IsConnected { get; set; }
    public DateTime? ConnectedAt { get; set; }
    public string? AccountEmail { get; set; }
}

public class DisconnectSocialAccountDto
{
    [Required]
    public string Provider { get; set; } = string.Empty;
    
    [Required]
    public string Password { get; set; } = string.Empty;
}
