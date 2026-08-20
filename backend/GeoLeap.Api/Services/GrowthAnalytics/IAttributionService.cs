using GeoLeap.Api.Models.GrowthAnalytics;

namespace GeoLeap.Api.Services.GrowthAnalytics;

/// <summary>
/// Service for multi-touch attribution analysis
/// </summary>
public interface IAttributionService
{
    /// <summary>
    /// Calculate attribution for a conversion event
    /// </summary>
    Task<AttributionResult> CalculateAttributionAsync(Guid conversionEventId, Guid? modelId = null);
    
    /// <summary>
    /// Calculate attribution for multiple conversion events in batch
    /// </summary>
    Task<IEnumerable<AttributionResult>> CalculateBatchAttributionAsync(IEnumerable<Guid> conversionEventIds, Guid? modelId = null);
    
    /// <summary>
    /// Get user's touchpoint journey leading to a conversion
    /// </summary>
    Task<List<AttributionTouch>> GetUserJourneyAsync(string userId, DateTime conversionDate, int lookbackDays = 30);
    
    /// <summary>
    /// Create a new attribution model
    /// </summary>
    Task<AttributionModel> CreateAttributionModelAsync(AttributionModel model);
    
    /// <summary>
    /// Update an existing attribution model
    /// </summary>
    Task<AttributionModel?> UpdateAttributionModelAsync(Guid modelId, AttributionModel model);
    
    /// <summary>
    /// Get all attribution models
    /// </summary>
    Task<IEnumerable<AttributionModel>> GetAttributionModelsAsync();
    
    /// <summary>
    /// Get the default attribution model
    /// </summary>
    Task<AttributionModel?> GetDefaultAttributionModelAsync();
    
    /// <summary>
    /// Get attribution summary for a time period
    /// </summary>
    Task<AttributionSummaryResult> GetAttributionSummaryAsync(DateTime startDate, DateTime endDate, Guid? modelId = null);
    
    /// <summary>
    /// Compare different attribution models for the same conversions
    /// </summary>
    Task<AttributionModelComparisonResult> CompareAttributionModelsAsync(DateTime startDate, DateTime endDate, IEnumerable<Guid> modelIds);
    
    /// <summary>
    /// Get channel performance based on attribution
    /// </summary>
    Task<IEnumerable<ChannelPerformanceResult>> GetChannelPerformanceAsync(DateTime startDate, DateTime endDate, Guid? modelId = null);
}

/// <summary>
/// Attribution summary for a time period
/// </summary>
public class AttributionSummaryResult
{
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public Guid AttributionModelId { get; set; }
    public string ModelName { get; set; } = string.Empty;
    public int TotalConversions { get; set; }
    public decimal TotalAttributedValue { get; set; }
    public List<ChannelAttributionSummary> Channels { get; set; } = new();
    public List<TouchpointPositionSummary> TouchpointPositions { get; set; } = new();
    public TimeSpan AverageTimeToConversion { get; set; }
    public decimal AverageTouchpoints { get; set; }
}

/// <summary>
/// Attribution summary by channel
/// </summary>
public class ChannelAttributionSummary
{
    public string Channel { get; set; } = string.Empty;
    public int Conversions { get; set; }
    public decimal AttributedValue { get; set; }
    public decimal AttributedPercentage { get; set; }
    public decimal AverageAttribution { get; set; }
    public int FirstTouchConversions { get; set; }
    public int LastTouchConversions { get; set; }
    public int AssistedConversions { get; set; }
}

/// <summary>
/// Attribution by touchpoint position in journey
/// </summary>
public class TouchpointPositionSummary
{
    public int Position { get; set; }
    public string PositionLabel { get; set; } = string.Empty; // "First", "Middle", "Last"
    public int Touchpoints { get; set; }
    public decimal AttributedValue { get; set; }
    public decimal AverageAttribution { get; set; }
}

/// <summary>
/// Comparison result between attribution models
/// </summary>
public class AttributionModelComparisonResult
{
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public List<ModelComparisonSummary> Models { get; set; } = new();
    public List<ChannelComparisonResult> ChannelComparisons { get; set; } = new();
}

/// <summary>
/// Attribution model comparison summary
/// </summary>
public class ModelComparisonSummary
{
    public Guid ModelId { get; set; }
    public string ModelName { get; set; } = string.Empty;
    public AttributionModelType ModelType { get; set; }
    public int TotalConversions { get; set; }
    public decimal TotalAttributedValue { get; set; }
    public decimal TopChannelPercentage { get; set; }
    public string TopChannel { get; set; } = string.Empty;
}

/// <summary>
/// Channel comparison across attribution models
/// </summary>
public class ChannelComparisonResult
{
    public string Channel { get; set; } = string.Empty;
    public List<ChannelModelResult> ModelResults { get; set; } = new();
    public decimal VariancePercentage { get; set; }
    public decimal StandardDeviation { get; set; }
}

/// <summary>
/// Channel result for a specific attribution model
/// </summary>
public class ChannelModelResult
{
    public Guid ModelId { get; set; }
    public string ModelName { get; set; } = string.Empty;
    public decimal AttributedValue { get; set; }
    public decimal AttributedPercentage { get; set; }
    public int Rank { get; set; }
}

/// <summary>
/// Channel performance metrics
/// </summary>
public class ChannelPerformanceResult
{
    public string Channel { get; set; } = string.Empty;
    public string Source { get; set; } = string.Empty;
    public string Medium { get; set; } = string.Empty;
    public string Campaign { get; set; } = string.Empty;
    public int Impressions { get; set; }
    public int Clicks { get; set; }
    public int Conversions { get; set; }
    public decimal AttributedValue { get; set; }
    public decimal ClickThroughRate { get; set; }
    public decimal ConversionRate { get; set; }
    public decimal CostPerClick { get; set; }
    public decimal CostPerConversion { get; set; }
    public decimal ReturnOnAdSpend { get; set; }
    public TimeSpan AverageTimeToConversion { get; set; }
}