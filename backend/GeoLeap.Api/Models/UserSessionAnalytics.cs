using System.ComponentModel.DataAnnotations;

namespace GeoLeap.Api.Models;

/// <summary>
/// User session analytics data with aggregated metrics
/// Separate from UserSession (auth) to avoid conflicts
/// </summary>
public class UserSessionAnalytics
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    /// <summary>
    /// Session identifier
    /// </summary>
    [Required, MaxLength(100)]
    public string SessionId { get; set; } = string.Empty;
    
    /// <summary>
    /// User identifier (can be anonymous)
    /// </summary>
    [MaxLength(100)]
    public string? UserId { get; set; }
    
    /// <summary>
    /// Session start time
    /// </summary>
    public DateTime StartTime { get; set; } = DateTime.UtcNow;
    
    /// <summary>
    /// Session end time (null if active)
    /// </summary>
    public DateTime? EndTime { get; set; }
    
    /// <summary>
    /// Total session duration in minutes
    /// </summary>
    public int? Duration { get; set; }
    
    /// <summary>
    /// Number of pages viewed in session
    /// </summary>
    public int PageViews { get; set; } = 0;
    
    /// <summary>
    /// Number of unique pages viewed
    /// </summary>
    public int UniquePages { get; set; } = 0;
    
    /// <summary>
    /// Number of clicks/interactions
    /// </summary>
    public int Interactions { get; set; } = 0;
    
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
    /// Maximum scroll depth reached in session
    /// </summary>
    public decimal? MaxScrollDepth { get; set; }
    
    /// <summary>
    /// Average time spent per page
    /// </summary>
    public decimal? AvgTimePerPage { get; set; }
    
    /// <summary>
    /// Session bounce indicator (single page session)
    /// </summary>
    public bool IsBounce { get; set; } = false;
    
    /// <summary>
    /// Session conversion indicator
    /// </summary>
    public bool IsConversion { get; set; } = false;
    
    /// <summary>
    /// Conversion type (signup, purchase, etc.)
    /// </summary>
    [MaxLength(50)]
    public string? ConversionType { get; set; }
    
    /// <summary>
    /// Device information
    /// </summary>
    [MaxLength(20)]
    public string? DeviceType { get; set; }
    
    /// <summary>
    /// Browser information
    /// </summary>
    [MaxLength(100)]
    public string? Browser { get; set; }
    
    /// <summary>
    /// Geographic country
    /// </summary>
    [MaxLength(10)]
    public string? Country { get; set; }
    
    /// <summary>
    /// Traffic source/referrer
    /// </summary>
    [MaxLength(500)]
    public string? Source { get; set; }
    
    /// <summary>
    /// UTM campaign information
    /// </summary>
    [MaxLength(200)]
    public string? Campaign { get; set; }
    
    /// <summary>
    /// UTM medium information
    /// </summary>
    [MaxLength(200)]
    public string? Medium { get; set; }
}