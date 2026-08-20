using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;

namespace GeoLeap.Api.Models.GrowthAnalytics;

/// <summary>
/// Represents a growth tracking event with comprehensive attribution data
/// </summary>
public class GrowthEvent
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    /// <summary>
    /// Event name (e.g., 'page_view', 'signup', 'subscription_start')
    /// </summary>
    [Required, MaxLength(100)]
    public string EventName { get; set; } = string.Empty;
    
    /// <summary>
    /// Event category for grouping (e.g., 'acquisition', 'activation', 'retention')
    /// </summary>
    [Required, MaxLength(50)]
    public string Category { get; set; } = string.Empty;
    
    /// <summary>
    /// User identifier (anonymized for privacy compliance)
    /// </summary>
    [MaxLength(100)]
    public string? UserId { get; set; }
    
    /// <summary>
    /// Anonymous session identifier
    /// </summary>
    [Required, MaxLength(100)]
    public string SessionId { get; set; } = string.Empty;
    
    /// <summary>
    /// Device fingerprint for cross-session tracking
    /// </summary>
    [MaxLength(100)]
    public string? DeviceId { get; set; }
    
    /// <summary>
    /// Timestamp when the event occurred (client-side)
    /// </summary>
    public DateTime ClientTimestamp { get; set; }
    
    /// <summary>
    /// Timestamp when the event was received by server
    /// </summary>
    public DateTime ServerTimestamp { get; set; } = DateTime.UtcNow;
    
    /// <summary>
    /// Event properties as JSON (flexible schema)
    /// </summary>
    [Column(TypeName = "nvarchar(max)")]
    public string Properties { get; set; } = "{}";
    
    /// <summary>
    /// Parsed event properties for easy access
    /// </summary>
    [NotMapped]
    public Dictionary<string, object> ParsedProperties
    {
        get => JsonSerializer.Deserialize<Dictionary<string, object>>(Properties) ?? new();
        set => Properties = JsonSerializer.Serialize(value);
    }
    
    // Attribution fields
    /// <summary>
    /// UTM source parameter
    /// </summary>
    [MaxLength(200)]
    public string? UtmSource { get; set; }
    
    /// <summary>
    /// UTM medium parameter
    /// </summary>
    [MaxLength(200)]
    public string? UtmMedium { get; set; }
    
    /// <summary>
    /// UTM campaign parameter
    /// </summary>
    [MaxLength(200)]
    public string? UtmCampaign { get; set; }
    
    /// <summary>
    /// UTM term parameter
    /// </summary>
    [MaxLength(200)]
    public string? UtmTerm { get; set; }
    
    /// <summary>
    /// UTM content parameter
    /// </summary>
    [MaxLength(200)]
    public string? UtmContent { get; set; }
    
    /// <summary>
    /// Referrer URL
    /// </summary>
    [MaxLength(500)]
    public string? Referrer { get; set; }
    
    /// <summary>
    /// Landing page URL
    /// </summary>
    [MaxLength(500)]
    public string? LandingPage { get; set; }
    
    // Technical fields
    /// <summary>
    /// IP address for geo-location (anonymized after processing)
    /// </summary>
    [MaxLength(45)]
    public string? IpAddress { get; set; }
    
    /// <summary>
    /// User agent string
    /// </summary>
    [MaxLength(500)]
    public string? UserAgent { get; set; }
    
    /// <summary>
    /// Screen resolution
    /// </summary>
    [MaxLength(20)]
    public string? ScreenResolution { get; set; }
    
    /// <summary>
    /// Viewport size
    /// </summary>
    [MaxLength(20)]
    public string? ViewportSize { get; set; }
    
    /// <summary>
    /// Device type (desktop, mobile, tablet)
    /// </summary>
    [MaxLength(20)]
    public string? DeviceType { get; set; }
    
    /// <summary>
    /// Operating system
    /// </summary>
    [MaxLength(50)]
    public string? OperatingSystem { get; set; }
    
    /// <summary>
    /// Browser name and version
    /// </summary>
    [MaxLength(100)]
    public string? Browser { get; set; }
    
    /// <summary>
    /// Geographic country code
    /// </summary>
    [MaxLength(10)]
    public string? Country { get; set; }
    
    /// <summary>
    /// Geographic region/state
    /// </summary>
    [MaxLength(100)]
    public string? Region { get; set; }
    
    /// <summary>
    /// Geographic city
    /// </summary>
    [MaxLength(100)]
    public string? City { get; set; }
    
    /// <summary>
    /// Event value (for conversion tracking)
    /// </summary>
    [Column(TypeName = "decimal(18,2)")]
    public decimal? EventValue { get; set; }
    
    /// <summary>
    /// Currency code for event value
    /// </summary>
    [MaxLength(10)]
    public string? Currency { get; set; }
    
    /// <summary>
    /// Processing status for batch operations
    /// </summary>
    public GrowthEventStatus Status { get; set; } = GrowthEventStatus.Pending;
    
    /// <summary>
    /// Error message if processing failed
    /// </summary>
    [MaxLength(500)]
    public string? ErrorMessage { get; set; }
    
    /// <summary>
    /// Version of the tracking SDK that sent this event
    /// </summary>
    [MaxLength(20)]
    public string? SdkVersion { get; set; }
    
    /// <summary>
    /// GDPR consent status at the time of event
    /// </summary>
    public bool HasConsent { get; set; } = false;
    
    /// <summary>
    /// Consent categories granted (marketing, analytics, etc.)
    /// </summary>
    [MaxLength(200)]
    public string? ConsentCategories { get; set; }
    
    // Indexing for query performance
    public int CreatedDay => ClientTimestamp.DayOfYear;
    public int CreatedWeek => System.Globalization.CultureInfo.InvariantCulture.Calendar.GetWeekOfYear(
        ClientTimestamp, System.Globalization.CalendarWeekRule.FirstDay, DayOfWeek.Monday);
    public int CreatedMonth => ClientTimestamp.Month;
    public int CreatedYear => ClientTimestamp.Year;
}

/// <summary>
/// Event processing status
/// </summary>
public enum GrowthEventStatus
{
    Pending = 0,
    Processed = 1,
    Failed = 2,
    Ignored = 3
}