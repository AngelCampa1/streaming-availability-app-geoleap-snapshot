using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;

namespace GeoLeap.Api.Models.AdvancedUserBehavior;

/// <summary>
/// Represents a user behavior tracking event with comprehensive analytics data
/// </summary>
public class UserBehaviorEvent
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    /// <summary>
    /// Event type (e.g., 'page_view', 'button_click', 'search', 'content_interaction')
    /// </summary>
    [Required, MaxLength(100)]
    public string EventType { get; set; } = string.Empty;
    
    /// <summary>
    /// Event category for grouping (e.g., 'navigation', 'engagement', 'conversion')
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
    /// Page or screen where the event occurred
    /// </summary>
    [MaxLength(500)]
    public string? PageUrl { get; set; }
    
    /// <summary>
    /// Previous page or referrer
    /// </summary>
    [MaxLength(500)]
    public string? Referrer { get; set; }
    
    /// <summary>
    /// Element that triggered the event (e.g., button ID, link text)
    /// </summary>
    [MaxLength(200)]
    public string? ElementSelector { get; set; }
    
    /// <summary>
    /// Text content of the element (for buttons, links, etc.)
    /// </summary>
    [MaxLength(500)]
    public string? ElementText { get; set; }
    
    /// <summary>
    /// Time spent on the page/screen before this event (in seconds)
    /// </summary>
    public int? TimeOnPage { get; set; }
    
    /// <summary>
    /// Scroll depth percentage when event occurred
    /// </summary>
    public decimal? ScrollDepth { get; set; }
    
    /// <summary>
    /// Mouse position X coordinate (for click events)
    /// </summary>
    public int? MouseX { get; set; }
    
    /// <summary>
    /// Mouse position Y coordinate (for click events)
    /// </summary>
    public int? MouseY { get; set; }
    
    /// <summary>
    /// Search query (for search events)
    /// </summary>
    [MaxLength(500)]
    public string? SearchQuery { get; set; }
    
    /// <summary>
    /// Number of search results (for search events)
    /// </summary>
    public int? SearchResultCount { get; set; }
    
    /// <summary>
    /// Content ID (for content interaction events)
    /// </summary>
    [MaxLength(100)]
    public string? ContentId { get; set; }
    
    /// <summary>
    /// Content type (movie, series, etc.)
    /// </summary>
    [MaxLength(50)]
    public string? ContentType { get; set; }
    
    /// <summary>
    /// Content category or genre
    /// </summary>
    [MaxLength(100)]
    public string? ContentCategory { get; set; }
    
    /// <summary>
    /// Interaction duration (for video, content viewing)
    /// </summary>
    public int? InteractionDuration { get; set; }
    
    /// <summary>
    /// Form completion percentage (for form events)
    /// </summary>
    public decimal? FormCompletionPercentage { get; set; }
    
    /// <summary>
    /// Form field that triggered the event
    /// </summary>
    [MaxLength(100)]
    public string? FormFieldName { get; set; }
    
    /// <summary>
    /// Error message (for error events)
    /// </summary>
    [MaxLength(500)]
    public string? ErrorMessage { get; set; }
    
    /// <summary>
    /// Error code (for error events)
    /// </summary>
    [MaxLength(50)]
    public string? ErrorCode { get; set; }
    
    /// <summary>
    /// Additional event properties as JSON (flexible schema)
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
    /// A/B test experiment ID
    /// </summary>
    public Guid? ExperimentId { get; set; }
    
    /// <summary>
    /// A/B test variant
    /// </summary>
    [MaxLength(50)]
    public string? ExperimentVariant { get; set; }
    
    /// <summary>
    /// Processing status for batch operations
    /// </summary>
    public UserBehaviorEventStatus Status { get; set; } = UserBehaviorEventStatus.Pending;
    
    /// <summary>
    /// Error message if processing failed
    /// </summary>
    [MaxLength(500)]
    public string? ProcessingError { get; set; }
    
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
    /// Consent categories granted (analytics, marketing, etc.)
    /// </summary>
    [MaxLength(200)]
    public string? ConsentCategories { get; set; }
    
    /// <summary>
    /// Session sequence number for ordering events
    /// </summary>
    public int SessionSequence { get; set; }
    
    /// <summary>
    /// Is this the first event in the session?
    /// </summary>
    public bool IsSessionStart { get; set; }
    
    /// <summary>
    /// Is this the last event in the session?
    /// </summary>
    public bool IsSessionEnd { get; set; }
    
    /// <summary>
    /// Total session duration at time of event (in seconds)
    /// </summary>
    public int? SessionDuration { get; set; }
    
    /// <summary>
    /// Number of pages viewed in session before this event
    /// </summary>
    public int? PageViewsInSession { get; set; }
    
    /// <summary>
    /// Is this user a returning visitor?
    /// </summary>
    public bool IsReturningVisitor { get; set; }
    
    /// <summary>
    /// Days since last visit
    /// </summary>
    public int? DaysSinceLastVisit { get; set; }
    
    /// <summary>
    /// Total number of sessions for this user
    /// </summary>
    public int? UserSessionCount { get; set; }
    
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
public enum UserBehaviorEventStatus
{
    Pending = 0,
    Processed = 1,
    Failed = 2,
    Ignored = 3
}