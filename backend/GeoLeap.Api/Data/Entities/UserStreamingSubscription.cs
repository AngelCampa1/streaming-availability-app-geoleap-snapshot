using System.ComponentModel.DataAnnotations;
using GeoLeap.Api.Models;

namespace GeoLeap.Api.Data.Entities;

/// <summary>
/// Represents a user's external streaming service subscription (Netflix, HBO, etc.)
/// for VPN-based content access functionality
/// </summary>
public class UserStreamingSubscription
{
    [Key]
    public Guid Id { get; set; }

    [Required]
    public Guid UserId { get; set; }

    /// <summary>
    /// Navigation property to User
    /// </summary>
    public User User { get; set; } = null!;

    /// <summary>
    /// Streaming service identifier (e.g., "netflix", "hbo", "disney")
    /// Matches service IDs from Streaming Availability API
    /// </summary>
    [Required]
    [MaxLength(100)]
    public string ServiceId { get; set; } = string.Empty;

    /// <summary>
    /// Display name of the streaming service (e.g., "Netflix", "HBO Max", "Disney+")
    /// </summary>
    [Required]
    [MaxLength(200)]
    public string ServiceName { get; set; } = string.Empty;

    /// <summary>
    /// Whether this subscription is currently active
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// When the subscription was added to user's profile
    /// </summary>
    public DateTime AddedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// When the subscription was removed (null if still active)
    /// </summary>
    public DateTime? RemovedAt { get; set; }

    /// <summary>
    /// Optional: User's subscription tier (e.g., "basic", "standard", "premium")
    /// </summary>
    [MaxLength(50)]
    public string? SubscriptionTier { get; set; }

    /// <summary>
    /// Optional: User notes about this subscription
    /// </summary>
    [MaxLength(500)]
    public string? Notes { get; set; }
}
