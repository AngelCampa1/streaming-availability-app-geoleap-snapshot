using System.ComponentModel.DataAnnotations;

namespace GeoLeap.Api.Models;

/// <summary>
/// Onboarding session model for tracking user setup progress
/// </summary>
public class OnboardingSession
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string SessionData { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
    public bool IsCompleted { get; set; } = false;
}

// SocialShare model moved to SocialSharingModels.cs to avoid duplication