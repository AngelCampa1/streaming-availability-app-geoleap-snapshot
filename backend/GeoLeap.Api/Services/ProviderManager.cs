using GeoLeap.Api.Models;
using Hangfire;
using Microsoft.Extensions.Options;
using System.Collections.Concurrent;

namespace GeoLeap.Api.Services;

/// <summary>
/// Provider management system implementation with registration, discovery, and health monitoring
/// </summary>
public class ProviderManager : IProviderManager, IDisposable
{
    private readonly ConcurrentDictionary<string, IDataProvider> _providers = new();
    private readonly ConcurrentDictionary<string, ProviderHealth> _providerHealth = new();
    private readonly ConcurrentDictionary<string, ProviderStats> _providerStats = new();
    private readonly IOptionsMonitor<ProviderConfiguration> _configuration;
    private readonly ILogger<ProviderManager> _logger;
    private readonly Timer? _healthCheckTimer;
    private readonly SemaphoreSlim _healthCheckSemaphore = new(1, 1);
    private bool _disposed = false;
    
    public ProviderManager(
        IOptionsMonitor<ProviderConfiguration> configuration,
        ILogger<ProviderManager> logger)
    {
        _configuration = configuration;
        _logger = logger;
        
        // Start health check timer
        var healthCheckInterval = TimeSpan.FromMinutes(_configuration.CurrentValue.HealthCheck?.IntervalMinutes ?? 5);
        _healthCheckTimer = new Timer(async _ => await PerformHealthChecksAsync(), null, healthCheckInterval, healthCheckInterval);
    }
    
    public async Task RegisterProviderAsync(IDataProvider provider, CancellationToken cancellationToken = default)
    {
        if (provider == null) throw new ArgumentNullException(nameof(provider));
        
        _providers.AddOrUpdate(provider.Id, provider, (key, existing) => provider);
        
        // Initialize health status
        _providerHealth.AddOrUpdate(provider.Id, new ProviderHealth
        {
            ProviderId = provider.Id,
            ProviderName = provider.Name,
            IsHealthy = true,
            LastCheckTime = DateTime.UtcNow,
            AvailableCapabilities = provider.Capabilities,
            Stats = new ProviderStats()
        }, (key, existing) => existing);
        
        // Initialize stats
        _providerStats.AddOrUpdate(provider.Id, new ProviderStats(), (key, existing) => existing);
        
        _logger.LogInformation("Registered provider {ProviderId} ({ProviderName}) with capabilities {Capabilities}", 
            provider.Id, provider.Name, provider.Capabilities);
            
        // Perform initial health check
        // FIXED: Week 1 Day 5 - Use Hangfire for reliable provider health checks
        BackgroundJob.Enqueue(() => CheckProviderHealthAsync(provider.Id, CancellationToken.None));
    }
    
    public async Task UnregisterProviderAsync(string providerId, CancellationToken cancellationToken = default)
    {
        if (_providers.TryRemove(providerId, out var provider))
        {
            _providerHealth.TryRemove(providerId, out _);
            _providerStats.TryRemove(providerId, out _);
            
            _logger.LogInformation("Unregistered provider {ProviderId} ({ProviderName})", 
                providerId, provider.Name);
        }
    }
    
    public async Task<List<IDataProvider>> GetAvailableProvidersAsync(ProviderCapability capability, CancellationToken cancellationToken = default)
    {
        var availableProviders = new List<IDataProvider>();
        
        foreach (var provider in _providers.Values)
        {
            // Check if provider supports the required capability
            if (!provider.Capabilities.HasFlag(capability)) continue;
            
            // Check if provider is enabled in configuration
            var config = _configuration.CurrentValue.Providers?.GetValueOrDefault(provider.Id);
            if (config?.Enabled != true) continue;
            
            // Check provider health
            var health = _providerHealth.GetValueOrDefault(provider.Id);
            if (health?.IsHealthy != true) continue;
            
            // Check rate limiting
            if (!await provider.CanMakeRequestAsync(cancellationToken)) continue;
            
            availableProviders.Add(provider);
        }
        
        // Sort by priority
        availableProviders = availableProviders
            .OrderByDescending(p => GetProviderPriority(p.Id))
            .ThenBy(p => _providerHealth[p.Id].AverageResponseTime)
            .ToList();
            
        _logger.LogDebug("Found {Count} available providers for capability {Capability}", 
            availableProviders.Count, capability);
            
        return availableProviders;
    }
    
    public async Task<IDataProvider?> GetProviderAsync(string providerId, CancellationToken cancellationToken = default)
    {
        return _providers.GetValueOrDefault(providerId);
    }
    
    public async Task<ProviderHealth> CheckProviderHealthAsync(string providerId, CancellationToken cancellationToken = default)
    {
        if (!_providers.TryGetValue(providerId, out var provider))
        {
            // Provider not yet registered - return unhealthy status instead of throwing
            // This handles race condition where Hangfire jobs run before providers are registered
            _logger.LogDebug("Provider {ProviderId} not yet registered, skipping health check", providerId);
            return new ProviderHealth
            {
                ProviderId = providerId,
                ProviderName = providerId,
                IsHealthy = false,
                LastCheckTime = DateTime.UtcNow,
                LastError = "Provider not yet registered"
            };
        }
        
        var health = _providerHealth.GetValueOrDefault(providerId, new ProviderHealth
        {
            ProviderId = providerId,
            ProviderName = provider.Name
        });
        
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        
        try
        {
            var isHealthy = await provider.CheckHealthAsync(cancellationToken);
            stopwatch.Stop();
            
            health.IsHealthy = isHealthy;
            health.LastCheckTime = DateTime.UtcNow;
            health.AverageResponseTime = CalculateAverageResponseTime(health, stopwatch.Elapsed);
            health.LastError = null;
            
            if (isHealthy)
            {
                health.ConsecutiveFailures = 0;
                _logger.LogDebug("Provider {ProviderId} health check passed in {ResponseTime}ms", 
                    providerId, stopwatch.ElapsedMilliseconds);
            }
            else
            {
                health.ConsecutiveFailures++;
                _logger.LogWarning("Provider {ProviderId} health check failed (consecutive failures: {Failures})", 
                    providerId, health.ConsecutiveFailures);
            }
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            health.IsHealthy = false;
            health.LastCheckTime = DateTime.UtcNow;
            health.LastError = ex.Message;
            health.ConsecutiveFailures++;
            
            _logger.LogError(ex, "Provider {ProviderId} health check threw exception (consecutive failures: {Failures})", 
                providerId, health.ConsecutiveFailures);
        }
        
        _providerHealth.AddOrUpdate(providerId, health, (key, existing) => health);
        return health;
    }
    
    public async Task RecordProviderErrorAsync(string providerId, Exception error, CancellationToken cancellationToken = default)
    {
        if (_providerStats.TryGetValue(providerId, out var stats))
        {
            stats.FailedRequests++;
            
            _logger.LogWarning("Recorded error for provider {ProviderId}: {Error}", 
                providerId, error.Message);
        }
        
        // Update health status
        if (_providerHealth.TryGetValue(providerId, out var health))
        {
            health.ConsecutiveFailures++;
            health.LastError = error.Message;
            
            // Mark as unhealthy if too many consecutive failures
            var threshold = _configuration.CurrentValue.HealthCheck?.FailureThreshold ?? 5;
            if (health.ConsecutiveFailures >= threshold)
            {
                health.IsHealthy = false;
                _logger.LogError("Provider {ProviderId} marked as unhealthy after {Failures} consecutive failures", 
                    providerId, health.ConsecutiveFailures);
            }
        }
    }
    
    public async Task RecordProviderSuccessAsync(string providerId, TimeSpan responseTime, CancellationToken cancellationToken = default)
    {
        if (_providerStats.TryGetValue(providerId, out var stats))
        {
            stats.SuccessfulRequests++;
            stats.AverageResponseTime = CalculateAverageResponseTime(stats.AverageResponseTime, responseTime);
        }
        
        // Update health status
        if (_providerHealth.TryGetValue(providerId, out var health))
        {
            health.ConsecutiveFailures = 0;
            health.AverageResponseTime = CalculateAverageResponseTime(health, responseTime);
            health.IsHealthy = true;
        }
    }
    
    public async Task<ProviderStats> GetProviderStatsAsync(string providerId, CancellationToken cancellationToken = default)
    {
        return _providerStats.GetValueOrDefault(providerId, new ProviderStats());
    }
    
    public async Task<List<ProviderHealth>> GetAllProvidersHealthAsync(CancellationToken cancellationToken = default)
    {
        return _providerHealth.Values.ToList();
    }
    
    public async Task SetProviderEnabledAsync(string providerId, bool enabled, CancellationToken cancellationToken = default)
    {
        // This would typically update configuration or database
        // For now, we'll log the change
        _logger.LogInformation("Provider {ProviderId} enabled status changed to {Enabled}", 
            providerId, enabled);
    }
    
    public int GetProviderPriority(string providerId)
    {
        var config = _configuration.CurrentValue.Providers?.GetValueOrDefault(providerId);
        return config?.Priority ?? 0;
    }
    
    public async Task StartHealthMonitoringAsync(CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Provider health monitoring started");
        await PerformHealthChecksAsync();
    }
    
    public async Task StopHealthMonitoringAsync(CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("Provider health monitoring stopped");
    }
    
    private async Task PerformHealthChecksAsync()
    {
        if (!await _healthCheckSemaphore.WaitAsync(1000))
        {
            _logger.LogDebug("Health check already in progress, skipping");
            return;
        }
        
        try
        {
            var providers = _providers.Keys.ToList();
            var healthCheckTasks = providers.Select(async providerId =>
            {
                try
                {
                    await CheckProviderHealthAsync(providerId);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error performing health check for provider {ProviderId}", providerId);
                }
            });
            
            await Task.WhenAll(healthCheckTasks);
            
            _logger.LogDebug("Completed health checks for {Count} providers", providers.Count);
        }
        finally
        {
            _healthCheckSemaphore.Release();
        }
    }
    
    private TimeSpan CalculateAverageResponseTime(ProviderHealth health, TimeSpan newResponseTime)
    {
        // Simple moving average calculation
        var currentAvg = health.AverageResponseTime.TotalMilliseconds;
        var newAvg = currentAvg == 0 ? newResponseTime.TotalMilliseconds : (currentAvg * 0.8) + (newResponseTime.TotalMilliseconds * 0.2);
        return TimeSpan.FromMilliseconds(newAvg);
    }
    
    private TimeSpan CalculateAverageResponseTime(TimeSpan currentAverage, TimeSpan newResponseTime)
    {
        var currentAvg = currentAverage.TotalMilliseconds;
        var newAvg = currentAvg == 0 ? newResponseTime.TotalMilliseconds : (currentAvg * 0.8) + (newResponseTime.TotalMilliseconds * 0.2);
        return TimeSpan.FromMilliseconds(newAvg);
    }
    
    public void Dispose()
    {
        if (!_disposed)
        {
            _healthCheckTimer?.Dispose();
            _healthCheckSemaphore?.Dispose();
            _disposed = true;
        }
    }
}