using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

/// <summary>
/// Provider management system for registering, discovering, and monitoring data providers
/// </summary>
public interface IProviderManager
{
    /// <summary>
    /// Get all available providers that support the specified capability
    /// </summary>
    Task<List<IDataProvider>> GetAvailableProvidersAsync(ProviderCapability capability, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Get a specific provider by ID
    /// </summary>
    Task<IDataProvider?> GetProviderAsync(string providerId, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Register a new provider
    /// </summary>
    Task RegisterProviderAsync(IDataProvider provider, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Unregister a provider
    /// </summary>
    Task UnregisterProviderAsync(string providerId, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Check health status of a specific provider
    /// </summary>
    Task<ProviderHealth> CheckProviderHealthAsync(string providerId, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Record an error for a provider for health monitoring
    /// </summary>
    Task RecordProviderErrorAsync(string providerId, Exception error, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Record a successful operation for a provider
    /// </summary>
    Task RecordProviderSuccessAsync(string providerId, TimeSpan responseTime, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Get provider statistics
    /// </summary>
    Task<ProviderStats> GetProviderStatsAsync(string providerId, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Get all providers health status
    /// </summary>
    Task<List<ProviderHealth>> GetAllProvidersHealthAsync(CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Enable or disable a provider
    /// </summary>
    Task SetProviderEnabledAsync(string providerId, bool enabled, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Get provider priority for load balancing
    /// </summary>
    int GetProviderPriority(string providerId);
    
    /// <summary>
    /// Start background health monitoring
    /// </summary>
    Task StartHealthMonitoringAsync(CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Stop background health monitoring
    /// </summary>
    Task StopHealthMonitoringAsync(CancellationToken cancellationToken = default);
}