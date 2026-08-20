using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;

namespace GeoLeap.Api.Models;

/// <summary>
/// Comprehensive user behavior tracking model
/// </summary>
public class UserBehaviorEvent
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    /// <summary>
    /// User identifier (can be anonymous)
    /// </summary>
    [MaxLength(100)]
    public string? UserId { get; set; }
    
    /// <summary>
    /// Session identifier for grouping user actions
    /// </summary>
    [Required, MaxLength(100)]
    public string SessionId { get; set; } = string.Empty;
    
    /// <summary>
    /// Event type (page_view, click, scroll, search, etc.)
    /// </summary>
    [Required, MaxLength(50)]
    public string EventType { get; set; } = string.Empty;
    
    /// <summary>
    /// Page or route where the event occurred
    /// </summary>
    [Required, MaxLength(500)]
    public string PageUrl { get; set; } = string.Empty;
    
    /// <summary>
    /// Page title or name
    /// </summary>
    [MaxLength(200)]
    public string? PageTitle { get; set; }
    
    /// <summary>
    /// Element that triggered the event (button, link, etc.)
    /// </summary>
    [MaxLength(200)]
    public string? ElementTarget { get; set; }
    
    /// <summary>
    /// Text content of the clicked element
    /// </summary>
    [MaxLength(500)]
    public string? ElementText { get; set; }
    
    /// <summary>
    /// CSS selector path to the element
    /// </summary>
    [MaxLength(1000)]
    public string? ElementSelector { get; set; }
    
    /// <summary>
    /// Timestamp when the event occurred (client-side)
    /// </summary>
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    
    /// <summary>
    /// Time spent on page in milliseconds
    /// </summary>
    public int? TimeOnPage { get; set; }
    
    /// <summary>
    /// Scroll depth percentage (0-100)
    /// </summary>
    public decimal? ScrollDepth { get; set; }
    
    /// <summary>
    /// Mouse X coordinate (for heatmap analysis)
    /// </summary>
    public int? MouseX { get; set; }
    
    /// <summary>
    /// Mouse Y coordinate (for heatmap analysis)
    /// </summary>
    public int? MouseY { get; set; }
    
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
    /// Browser information
    /// </summary>
    [MaxLength(100)]
    public string? Browser { get; set; }
    
    /// <summary>
    /// Operating system
    /// </summary>
    [MaxLength(50)]
    public string? OperatingSystem { get; set; }
    
    /// <summary>
    /// Referrer URL
    /// </summary>
    [MaxLength(500)]
    public string? Referrer { get; set; }
    
    /// <summary>
    /// Additional event properties as JSON
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
    
    /// <summary>
    /// GDPR consent status
    /// </summary>
    public bool HasConsent { get; set; } = false;
    
    /// <summary>
    /// User's country code (for geo analytics)
    /// </summary>
    [MaxLength(10)]
    public string? Country { get; set; }
    
    /// <summary>
    /// IP address (anonymized after processing)
    /// </summary>
    [MaxLength(45)]
    public string? IpAddress { get; set; }
    
    /// <summary>
    /// User agent string
    /// </summary>
    [MaxLength(500)]
    public string? UserAgent { get; set; }
}


/// <summary>
/// Page performance and user behavior metrics
/// </summary>
public class PageAnalytics
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    /// <summary>
    /// Page URL or route
    /// </summary>
    [Required, MaxLength(500)]
    public string PageUrl { get; set; } = string.Empty;
    
    /// <summary>
    /// Date for the analytics period
    /// </summary>
    [Required]
    public DateTime Date { get; set; }
    
    /// <summary>
    /// Total page views
    /// </summary>
    public int PageViews { get; set; } = 0;
    
    /// <summary>
    /// Unique page views
    /// </summary>
    public int UniqueViews { get; set; } = 0;
    
    /// <summary>
    /// Average time spent on page (seconds)
    /// </summary>
    public decimal AvgTimeOnPage { get; set; } = 0;
    
    /// <summary>
    /// Bounce rate percentage
    /// </summary>
    public decimal BounceRate { get; set; } = 0;
    
    /// <summary>
    /// Exit rate percentage
    /// </summary>
    public decimal ExitRate { get; set; } = 0;
    
    /// <summary>
    /// Average scroll depth percentage
    /// </summary>
    public decimal AvgScrollDepth { get; set; } = 0;
    
    /// <summary>
    /// Number of interactions on page
    /// </summary>
    public int Interactions { get; set; } = 0;
    
    /// <summary>
    /// Conversion rate percentage
    /// </summary>
    public decimal ConversionRate { get; set; } = 0;
    
    /// <summary>
    /// Page load performance score (1-100)
    /// </summary>
    public int? PerformanceScore { get; set; }
    
    /// <summary>
    /// Mobile traffic percentage
    /// </summary>
    public decimal MobileTrafficPercentage { get; set; } = 0;
}

/// <summary>
/// Request DTOs for user behavior tracking
/// </summary>
public class UserBehaviorEventRequest
{
    [MaxLength(100)]
    public string? UserId { get; set; }
    
    [Required, MaxLength(100)]
    public string SessionId { get; set; } = string.Empty;
    
    [Required, MaxLength(50)]
    public string EventType { get; set; } = string.Empty;
    
    [Required, MaxLength(500)]
    public string PageUrl { get; set; } = string.Empty;
    
    [MaxLength(200)]
    public string? PageTitle { get; set; }
    
    [MaxLength(200)]
    public string? ElementTarget { get; set; }
    
    [MaxLength(500)]
    public string? ElementText { get; set; }
    
    [MaxLength(1000)]
    public string? ElementSelector { get; set; }
    
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    
    public int? TimeOnPage { get; set; }
    
    public decimal? ScrollDepth { get; set; }
    
    public int? MouseX { get; set; }
    
    public int? MouseY { get; set; }
    
    [MaxLength(20)]
    public string? ScreenResolution { get; set; }
    
    [MaxLength(20)]
    public string? ViewportSize { get; set; }
    
    [MaxLength(500)]
    public string? Referrer { get; set; }
    
    public Dictionary<string, object>? Properties { get; set; }
    
    public bool HasConsent { get; set; } = false;
}

/// <summary>
/// Batch request for multiple behavior events
/// </summary>
public class UserBehaviorBatchRequest
{
    [Required]
    public IEnumerable<UserBehaviorEventRequest> Events { get; set; } = new List<UserBehaviorEventRequest>();
}

/// <summary>
/// User behavior analytics dashboard response
/// </summary>
public class UserBehaviorDashboard
{
    public DateTime PeriodStart { get; set; }
    public DateTime PeriodEnd { get; set; }
    public UserBehaviorOverview Overview { get; set; } = new();
    public List<PagePerformanceMetric> TopPages { get; set; } = new();
    public List<UserPathStep> CommonUserPaths { get; set; } = new();
    public List<DeviceMetric> DeviceBreakdown { get; set; } = new();
    public List<GeographicMetric> GeographicBreakdown { get; set; } = new();
    public List<InteractionHotspot> Hotspots { get; set; } = new();
}

public class UserBehaviorOverview
{
    public int TotalUsers { get; set; }
    public int TotalSessions { get; set; }
    public int TotalPageViews { get; set; }
    public decimal AvgSessionDuration { get; set; }
    public decimal BounceRate { get; set; }
    public decimal ConversionRate { get; set; }
    public int TotalInteractions { get; set; }
    public decimal AvgScrollDepth { get; set; }
}

public class PagePerformanceMetric
{
    public string PageUrl { get; set; } = string.Empty;
    public string PageTitle { get; set; } = string.Empty;
    public int Views { get; set; }
    public int UniqueViews { get; set; }
    public decimal AvgTimeOnPage { get; set; }
    public decimal BounceRate { get; set; }
    public decimal ExitRate { get; set; }
    public decimal ConversionRate { get; set; }
    public int Interactions { get; set; }
}

public class UserPathStep
{
    public string FromPage { get; set; } = string.Empty;
    public string ToPage { get; set; } = string.Empty;
    public int Count { get; set; }
    public decimal Percentage { get; set; }
}

public class DeviceMetric
{
    public string DeviceType { get; set; } = string.Empty;
    public int Users { get; set; }
    public int Sessions { get; set; }
    public decimal Percentage { get; set; }
    public decimal AvgSessionDuration { get; set; }
    public decimal BounceRate { get; set; }
}

public class GeographicMetric
{
    public string Country { get; set; } = string.Empty;
    public string CountryName { get; set; } = string.Empty;
    public int Users { get; set; }
    public int Sessions { get; set; }
    public decimal Percentage { get; set; }
    public decimal AvgSessionDuration { get; set; }
}

public class InteractionHotspot
{
    public string PageUrl { get; set; } = string.Empty;
    public string ElementSelector { get; set; } = string.Empty;
    public string ElementText { get; set; } = string.Empty;
    public int Clicks { get; set; }
    public decimal ClickRate { get; set; }
    public int AvgMouseX { get; set; }
    public int AvgMouseY { get; set; }
}

/// <summary>
/// Real-time user behavior metrics for live dashboard
/// </summary>
public class RealTimeUserBehavior
{
    public int ActiveUsers { get; set; }
    public int ActiveSessions { get; set; }
    public List<LivePageView> LivePageViews { get; set; } = new();
    public List<RecentUserAction> RecentActions { get; set; } = new();
    public decimal CurrentConversionRate { get; set; }
    public string TrendingPage { get; set; } = string.Empty;
}

public class LivePageView
{
    public string PageUrl { get; set; } = string.Empty;
    public string PageTitle { get; set; } = string.Empty;
    public int ActiveUsers { get; set; }
    public DateTime LastActivity { get; set; }
}

public class RecentUserAction
{
    public string ActionType { get; set; } = string.Empty;
    public string PageUrl { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    public string UserType { get; set; } = string.Empty; // anonymous, registered
}