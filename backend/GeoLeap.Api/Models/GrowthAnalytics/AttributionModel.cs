using System.ComponentModel.DataAnnotations;

namespace GeoLeap.Api.Models.GrowthAnalytics;

/// <summary>
/// Attribution model configuration for multi-touch attribution
/// </summary>
public class AttributionModel
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    /// <summary>
    /// Model name (e.g., "Last Click", "First Touch", "Time Decay")
    /// </summary>
    [Required, MaxLength(100)]
    public string Name { get; set; } = string.Empty;
    
    /// <summary>
    /// Model description
    /// </summary>
    [MaxLength(500)]
    public string? Description { get; set; }
    
    /// <summary>
    /// Attribution model type
    /// </summary>
    public AttributionModelType Type { get; set; }
    
    /// <summary>
    /// Configuration parameters as JSON
    /// </summary>
    public string Configuration { get; set; } = "{}";
    
    /// <summary>
    /// Lookback window in days
    /// </summary>
    public int LookbackWindowDays { get; set; } = 30;
    
    /// <summary>
    /// Whether this is the default model
    /// </summary>
    public bool IsDefault { get; set; } = false;
    
    /// <summary>
    /// Whether this model is active
    /// </summary>
    public bool IsActive { get; set; } = true;
    
    /// <summary>
    /// When this model was created
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    /// <summary>
    /// When this model was last updated
    /// </summary>
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    /// <summary>
    /// User who created this model
    /// </summary>
    [MaxLength(100)]
    public string? CreatedBy { get; set; }
}

/// <summary>
/// Types of attribution models supported
/// </summary>
public enum AttributionModelType
{
    LastClick = 1,
    FirstClick = 2,
    Linear = 3,
    TimeDecay = 4,
    PositionBased = 5,
    DataDriven = 6,
    Custom = 99
}

/// <summary>
/// Attribution result for a conversion event
/// </summary>
public class AttributionResult
{
    public Guid ConversionEventId { get; set; }
    public Guid AttributionModelId { get; set; }
    public List<AttributionTouch> Touches { get; set; } = new();
    public DateTime CalculatedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Individual touchpoint in the attribution chain
/// </summary>
public class AttributionTouch
{
    public Guid EventId { get; set; }
    public string TouchpointType { get; set; } = string.Empty; // "organic", "paid", "direct", etc.
    public string? UtmSource { get; set; }
    public string? UtmMedium { get; set; }
    public string? UtmCampaign { get; set; }
    public DateTime TouchpointTime { get; set; }
    public decimal AttributionWeight { get; set; }
    public decimal AttributedValue { get; set; }
    public int PositionInJourney { get; set; }
    public TimeSpan TimeToConversion { get; set; }
}