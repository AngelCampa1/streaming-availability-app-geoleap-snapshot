using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

/// <summary>
/// Provider selection service with load balancing and failover logic
/// </summary>
public interface IProviderSelector
{
    /// <summary>
    /// Select best providers for the given capability based on configured strategy
    /// </summary>
    Task<List<IDataProvider>> SelectProvidersAsync(ProviderCapability capability, DataQuality requiredQuality, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Select the single best provider for a specific capability
    /// </summary>
    Task<IDataProvider?> SelectBestProviderAsync(ProviderCapability capability, string? contentId = null, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Select providers in failover chain order (primary first, then fallbacks)
    /// </summary>
    Task<List<IDataProvider>> SelectFailoverChainAsync(ProviderCapability capability, DataQuality requiredQuality, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Select providers for load balancing (multiple providers to distribute load)
    /// </summary>
    Task<List<IDataProvider>> SelectLoadBalancedProvidersAsync(ProviderCapability capability, int maxProviders = 3, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Select providers based on cost optimization
    /// </summary>
    Task<List<IDataProvider>> SelectCostOptimizedProvidersAsync(ProviderCapability capability, decimal maxCostPerRequest, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Select providers based on data quality requirements
    /// </summary>
    Task<List<IDataProvider>> SelectByQualityAsync(ProviderCapability capability, DataQuality requiredQuality, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Get provider selection statistics
    /// </summary>
    Task<ProviderSelectionStats> GetSelectionStatsAsync(CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Record provider selection result for analytics
    /// </summary>
    Task RecordProviderSelectionAsync(string providerId, ProviderCapability capability, bool success, TimeSpan responseTime, CancellationToken cancellationToken = default);
}

/// <summary>
/// Provider selection statistics
/// </summary>
public class ProviderSelectionStats
{
    public Dictionary<string, int> ProviderUsageCounts { get; set; } = new();
    public Dictionary<string, double> ProviderSuccessRates { get; set; } = new();
    public Dictionary<string, TimeSpan> ProviderAverageResponseTimes { get; set; } = new();
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
}