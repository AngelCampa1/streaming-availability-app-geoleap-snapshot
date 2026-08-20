using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GeoLeap.Api.Models.AdvancedUserBehavior;

/// <summary>
/// Represents a user session with aggregated behavior metrics
/// </summary>
public class UserBehaviorSession
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    /// <summary>
    /// Session identifier (matches events)
    /// </summary>
    [Required, MaxLength(100)]
    public string SessionId { get; set; } = string.Empty;
    
    /// <summary>
    /// User identifier (nullable for anonymous sessions)
    /// </summary>
    [MaxLength(100)]
    public string? UserId { get; set; }
    
    /// <summary>
    /// Device fingerprint
    /// </summary>
    [MaxLength(100)]
    public string? DeviceId { get; set; }
    
    /// <summary>
    /// Session start timestamp
    /// </summary>
    public DateTime StartTime { get; set; }
    
    /// <summary>
    /// Session end timestamp
    /// </summary>
    public DateTime? EndTime { get; set; }
    
    /// <summary>
    /// Total session duration in seconds
    /// </summary>
    public int DurationSeconds { get; set; }
    
    /// <summary>
    /// Total number of page views in session
    /// </summary>
    public int PageViews { get; set; }
    
    /// <summary>
    /// Total number of events in session
    /// </summary>
    public int EventCount { get; set; }
    
    /// <summary>
    /// Landing page URL
    /// </summary>
    [MaxLength(500)]
    public string? LandingPage { get; set; }
    
    /// <summary>
    /// Exit page URL
    /// </summary>
    [MaxLength(500)]
    public string? ExitPage { get; set; }
    
    /// <summary>
    /// Referrer URL
    /// </summary>
    [MaxLength(500)]
    public string? Referrer { get; set; }
    
    /// <summary>
    /// UTM source
    /// </summary>
    [MaxLength(200)]
    public string? UtmSource { get; set; }
    
    /// <summary>
    /// UTM medium
    /// </summary>
    [MaxLength(200)]
    public string? UtmMedium { get; set; }
    
    /// <summary>
    /// UTM campaign
    /// </summary>
    [MaxLength(200)]
    public string? UtmCampaign { get; set; }
    
    /// <summary>
    /// Maximum scroll depth reached in session
    /// </summary>
    public decimal? MaxScrollDepth { get; set; }
    
    /// <summary>
    /// Number of search queries performed
    /// </summary>
    public int SearchCount { get; set; }
    
    /// <summary>
    /// Number of content interactions
    /// </summary>
    public int ContentInteractions { get; set; }
    
    /// <summary>
    /// Number of form interactions
    /// </summary>
    public int FormInteractions { get; set; }
    
    /// <summary>
    /// Number of errors encountered
    /// </summary>
    public int ErrorCount { get; set; }
    
    /// <summary>
    /// Did the session result in a conversion?
    /// </summary>
    public bool HasConversion { get; set; }
    
    /// <summary>
    /// Conversion type (signup, purchase, etc.)
    /// </summary>
    [MaxLength(50)]
    public string? ConversionType { get; set; }
    
    /// <summary>
    /// Conversion value
    /// </summary>
    [Column(TypeName = "decimal(18,2)")]
    public decimal? ConversionValue { get; set; }
    
    /// <summary>
    /// Is this a bounce session (single page view)
    /// </summary>
    public bool IsBounce { get; set; }
    
    /// <summary>
    /// Device type
    /// </summary>
    [MaxLength(20)]
    public string? DeviceType { get; set; }
    
    /// <summary>
    /// Operating system
    /// </summary>
    [MaxLength(50)]
    public string? OperatingSystem { get; set; }
    
    /// <summary>
    /// Browser
    /// </summary>
    [MaxLength(100)]
    public string? Browser { get; set; }
    
    /// <summary>
    /// Country
    /// </summary>
    [MaxLength(10)]
    public string? Country { get; set; }
    
    /// <summary>
    /// Region
    /// </summary>
    [MaxLength(100)]
    public string? Region { get; set; }
    
    /// <summary>
    /// City
    /// </summary>
    [MaxLength(100)]
    public string? City { get; set; }
    
    /// <summary>
    /// A/B test experiment ID
    /// </summary>
    public Guid? ExperimentId { get; set; }
    
    /// <summary>
    /// A/B test variant
    /// </summary>
    [MaxLength(50)]
    public string? ExperimentVariant { get; set; }
    
    /// <summary>
    /// GDPR consent status
    /// </summary>
    public bool HasConsent { get; set; } = false;
    
    /// <summary>
    /// Is this user a returning visitor?
    /// </summary>
    public bool IsReturningVisitor { get; set; }
    
    /// <summary>
    /// Days since last visit
    /// </summary>
    public int? DaysSinceLastVisit { get; set; }
    
    /// <summary>
    /// Session quality score (0-100)
    /// </summary>
    public int QualityScore { get; set; }
    
    /// <summary>
    /// Engagement score (0-100)
    /// </summary>
    public int EngagementScore { get; set; }
    
    /// <summary>
    /// Navigation to UserBehaviorEvents
    /// </summary>
    public virtual ICollection<UserBehaviorEvent> Events { get; set; } = new List<UserBehaviorEvent>();
}