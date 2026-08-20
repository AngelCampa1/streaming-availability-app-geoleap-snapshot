using GeoLeap.Api.Models;
using Microsoft.Extensions.Options;
using System.Collections.Concurrent;

namespace GeoLeap.Api.Services;

/// <summary>
/// Provider selection service with advanced load balancing and failover strategies
/// </summary>
public class ProviderSelector : IProviderSelector
{
    private readonly IProviderManager _providerManager;
    private readonly IOptionsMonitor<ProviderConfiguration> _configuration;
    private readonly ILogger<ProviderSelector> _logger;
    private readonly ConcurrentDictionary<string, ProviderSelectionStats> _selectionStats = new();
    private readonly ConcurrentDictionary<string, DateTime> _lastProviderUsage = new();
    private readonly Random _random = new();

    public ProviderSelector(
        IProviderManager providerManager,
        IOptionsMonitor<ProviderConfiguration> configuration,
        ILogger<ProviderSelector> logger)
    {
        _providerManager = providerManager;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<List<IDataProvider>> SelectProvidersAsync(ProviderCapability capability, DataQuality requiredQuality, CancellationToken cancellationToken = default)
    {
        var strategy = _configuration.CurrentValue.SelectionStrategy;
        
        _logger.LogDebug("Selecting providers for capability {Capability} with quality {Quality} using strategy {Strategy}", 
            capability, requiredQuality, strategy);

        return strategy switch
        {
            ProviderSelectionStrategy.Primary => await SelectPrimaryProviderOnlyAsync(capability, cancellationToken),
            ProviderSelectionStrategy.LoadBalanced => await SelectLoadBalancedProvidersAsync(capability, 3, cancellationToken),
            ProviderSelectionStrategy.FailoverChain => await SelectFailoverChainAsync(capability, requiredQuality, cancellationToken),
            ProviderSelectionStrategy.BestQuality => await SelectByQualityAsync(capability, requiredQuality, cancellationToken),
            ProviderSelectionStrategy.CostOptimized => await SelectCostOptimizedProvidersAsync(capability, 1.0m, cancellationToken),
            _ => await SelectFailoverChainAsync(capability, requiredQuality, cancellationToken)
        };
    }

    public async Task<IDataProvider?> SelectBestProviderAsync(ProviderCapability capability, string? contentId = null, CancellationToken cancellationToken = default)
    {
        var providers = await _providerManager.GetAvailableProvidersAsync(capability, cancellationToken);
        if (!providers.Any())
        {
            _logger.LogWarning("No available providers found for capability {Capability}", capability);
            return null;
        }

        // Score providers based on multiple factors
        var providerScores = new Dictionary<IDataProvider, double>();
        
        foreach (var provider in providers)
        {
            var score = await CalculateProviderScoreAsync(provider, capability, cancellationToken);
            providerScores[provider] = score;
        }

        // FIXED: Week 1 Day 5 - Use FirstOrDefault to prevent exceptions when selecting best provider
        var bestProviderPair = providerScores.OrderByDescending(kvp => kvp.Value).FirstOrDefault();
        if (bestProviderPair.Key == null)
        {
            _logger.LogWarning("No providers available for capability {Capability}", capability);
            return null;
        }

        var bestProvider = bestProviderPair.Key;
        _logger.LogDebug("Selected best provider {ProviderId} with score {Score} for capability {Capability}",
            bestProvider.Id, providerScores[bestProvider], capability);

        return bestProvider;
    }

    public async Task<List<IDataProvider>> SelectFailoverChainAsync(ProviderCapability capability, DataQuality requiredQuality, CancellationToken cancellationToken = default)
    {
        var providers = await _providerManager.GetAvailableProvidersAsync(capability, cancellationToken);
        if (!providers.Any())
        {
            return new List<IDataProvider>();
        }

        // Filter by quality requirements
        var qualifiedProviders = await FilterByQualityAsync(providers, requiredQuality, cancellationToken);
        
        // Sort by priority and health
        var failoverChain = qualifiedProviders
            .OrderByDescending(p => _providerManager.GetProviderPriority(p.Id))
            .ThenByDescending(p => GetProviderHealthScore(p.Id))
            .ThenBy(p => GetProviderAverageResponseTime(p.Id))
            .ToList();

        _logger.LogDebug("Created failover chain with {Count} providers for capability {Capability}", 
            failoverChain.Count, capability);

        return failoverChain;
    }

    public async Task<List<IDataProvider>> SelectLoadBalancedProvidersAsync(ProviderCapability capability, int maxProviders = 3, CancellationToken cancellationToken = default)
    {
        var providers = await _providerManager.GetAvailableProvidersAsync(capability, cancellationToken);
        if (!providers.Any())
        {
            return new List<IDataProvider>();
        }

        // Apply load balancing algorithm
        var algorithm = _configuration.CurrentValue.LoadBalancing?.Algorithm ?? "WeightedRoundRobin";
        
        var selectedProviders = algorithm switch
        {
            "RoundRobin" => SelectRoundRobin(providers, maxProviders),
            "WeightedRoundRobin" => SelectWeightedRoundRobin(providers, maxProviders),
            "LeastConnections" => await SelectLeastConnectionsAsync(providers, maxProviders, cancellationToken),
            "Random" => SelectRandom(providers, maxProviders),
            _ => SelectWeightedRoundRobin(providers, maxProviders)
        };

        _logger.LogDebug("Load balanced selection returned {Count} providers using {Algorithm} algorithm", 
            selectedProviders.Count, algorithm);

        return selectedProviders;
    }

    public async Task<List<IDataProvider>> SelectCostOptimizedProvidersAsync(ProviderCapability capability, decimal maxCostPerRequest, CancellationToken cancellationToken = default)
    {
        var providers = await _providerManager.GetAvailableProvidersAsync(capability, cancellationToken);
        if (!providers.Any())
        {
            return new List<IDataProvider>();
        }

        var costOptimizedProviders = new List<(IDataProvider Provider, decimal Cost)>();
        
        foreach (var provider in providers)
        {
            var cost = await GetProviderCostPerRequestAsync(provider.Id, cancellationToken);
            if (cost <= maxCostPerRequest)
            {
                costOptimizedProviders.Add((provider, cost));
            }
        }

        // Sort by cost (cheapest first) then by quality
        var selectedProviders = costOptimizedProviders
            .OrderBy(p => p.Cost)
            .ThenByDescending(p => GetProviderHealthScore(p.Provider.Id))
            .Select(p => p.Provider)
            .ToList();

        _logger.LogDebug("Cost optimization selected {Count} providers under ${MaxCost} per request", 
            selectedProviders.Count, maxCostPerRequest);

        return selectedProviders;
    }

    public async Task<List<IDataProvider>> SelectByQualityAsync(ProviderCapability capability, DataQuality requiredQuality, CancellationToken cancellationToken = default)
    {
        var providers = await _providerManager.GetAvailableProvidersAsync(capability, cancellationToken);
        if (!providers.Any())
        {
            return new List<IDataProvider>();
        }

        var qualifiedProviders = await FilterByQualityAsync(providers, requiredQuality, cancellationToken);
        
        // Sort by data quality score (highest first)
        var qualityRankedProviders = qualifiedProviders
            .OrderByDescending(p => GetProviderQualityScore(p.Id, capability))
            .ThenByDescending(p => GetProviderHealthScore(p.Id))
            .ToList();

        _logger.LogDebug("Quality-based selection returned {Count} providers meeting {Quality} requirements", 
            qualityRankedProviders.Count, requiredQuality);

        return qualityRankedProviders;
    }

    public async Task<ProviderSelectionStats> GetSelectionStatsAsync(CancellationToken cancellationToken = default)
    {
        var allProviders = await _providerManager.GetAllProvidersHealthAsync(cancellationToken);
        var stats = new ProviderSelectionStats();

        foreach (var provider in allProviders)
        {
            var providerStats = await _providerManager.GetProviderStatsAsync(provider.ProviderId, cancellationToken);
            
            stats.ProviderUsageCounts[provider.ProviderId] = providerStats.RequestsToday;
            stats.ProviderSuccessRates[provider.ProviderId] = providerStats.SuccessRate;
            stats.ProviderAverageResponseTimes[provider.ProviderId] = providerStats.AverageResponseTime;
        }

        return stats;
    }

    public async Task RecordProviderSelectionAsync(string providerId, ProviderCapability capability, bool success, TimeSpan responseTime, CancellationToken cancellationToken = default)
    {
        _lastProviderUsage[providerId] = DateTime.UtcNow;
        
        if (success)
        {
            await _providerManager.RecordProviderSuccessAsync(providerId, responseTime, cancellationToken);
        }
        else
        {
            await _providerManager.RecordProviderErrorAsync(providerId, new Exception("Provider selection failed"), cancellationToken);
        }

        _logger.LogDebug("Recorded provider selection: {ProviderId}, Success: {Success}, ResponseTime: {ResponseTime}ms", 
            providerId, success, responseTime.TotalMilliseconds);
    }

    #region Private Methods

    private async Task<List<IDataProvider>> SelectPrimaryProviderOnlyAsync(ProviderCapability capability, CancellationToken cancellationToken)
    {
        var primaryConfig = _configuration.CurrentValue.PrimaryProviders?.GetValueOrDefault(capability.ToString());
        
        if (!string.IsNullOrEmpty(primaryConfig))
        {
            var primaryProvider = await _providerManager.GetProviderAsync(primaryConfig, cancellationToken);
            if (primaryProvider != null)
            {
                var availableProviders = await _providerManager.GetAvailableProvidersAsync(capability, cancellationToken);
                if (availableProviders.Contains(primaryProvider))
                {
                    return new List<IDataProvider> { primaryProvider };
                }
            }
        }

        // Fallback to any available provider
        var providers = await _providerManager.GetAvailableProvidersAsync(capability, cancellationToken);
        return providers.Take(1).ToList();
    }

    private async Task<double> CalculateProviderScoreAsync(IDataProvider provider, ProviderCapability capability, CancellationToken cancellationToken)
    {
        var score = 0.0;
        
        // Health score (0-30 points)
        var healthScore = GetProviderHealthScore(provider.Id);
        score += healthScore * 30;
        
        // Performance score (0-25 points)
        var avgResponseTime = GetProviderAverageResponseTime(provider.Id);
        var performanceScore = Math.Max(0, 1.0 - (avgResponseTime.TotalSeconds / 10.0)); // Normalize to 10 seconds max
        score += performanceScore * 25;
        
        // Priority score (0-20 points)
        var priority = _providerManager.GetProviderPriority(provider.Id);
        var priorityScore = Math.Min(1.0, priority / 10.0); // Normalize to 0-1
        score += priorityScore * 20;
        
        // Success rate score (0-15 points)
        var stats = await _providerManager.GetProviderStatsAsync(provider.Id, cancellationToken);
        var successRate = stats.SuccessRate / 100.0; // Convert percentage to 0-1
        score += successRate * 15;
        
        // Load balancing score (0-10 points) - prefer less recently used providers
        var lastUsed = _lastProviderUsage.GetValueOrDefault(provider.Id, DateTime.MinValue);
        var timeSinceLastUse = DateTime.UtcNow - lastUsed;
        var loadBalanceScore = Math.Min(1.0, timeSinceLastUse.TotalMinutes / 60.0); // Normalize to 1 hour
        score += loadBalanceScore * 10;
        
        return Math.Max(0, Math.Min(100, score)); // Ensure 0-100 range
    }

    private async Task<List<IDataProvider>> FilterByQualityAsync(List<IDataProvider> providers, DataQuality requiredQuality, CancellationToken cancellationToken)
    {
        var qualifiedProviders = new List<IDataProvider>();
        
        foreach (var provider in providers)
        {
            var providerQuality = GetProviderQualityLevel(provider.Id);
            if (providerQuality >= requiredQuality)
            {
                qualifiedProviders.Add(provider);
            }
        }
        
        return qualifiedProviders;
    }

    private List<IDataProvider> SelectRoundRobin(List<IDataProvider> providers, int maxProviders)
    {
        // Simple round-robin based on provider ID hash
        var sorted = providers.OrderBy(p => p.Id.GetHashCode()).ToList();
        return sorted.Take(maxProviders).ToList();
    }

    private List<IDataProvider> SelectWeightedRoundRobin(List<IDataProvider> providers, int maxProviders)
    {
        var weightedProviders = new List<(IDataProvider Provider, int Weight)>();
        
        foreach (var provider in providers)
        {
            var config = _configuration.CurrentValue.Providers?.GetValueOrDefault(provider.Id);
            var weight = config?.Weight ?? 1;
            weightedProviders.Add((provider, weight));
        }
        
        // Select providers based on weights
        var selected = new List<IDataProvider>();
        var totalWeight = weightedProviders.Sum(p => p.Weight);
        
        for (int i = 0; i < maxProviders && weightedProviders.Any(); i++)
        {
            var randomValue = _random.Next(totalWeight);
            var cumulativeWeight = 0;
            
            foreach (var (provider, weight) in weightedProviders)
            {
                cumulativeWeight += weight;
                if (randomValue < cumulativeWeight)
                {
                    selected.Add(provider);
                    weightedProviders.Remove((provider, weight));
                    totalWeight -= weight;
                    break;
                }
            }
        }
        
        return selected;
    }

    private async Task<List<IDataProvider>> SelectLeastConnectionsAsync(List<IDataProvider> providers, int maxProviders, CancellationToken cancellationToken)
    {
        var providerConnections = new Dictionary<IDataProvider, int>();
        
        foreach (var provider in providers)
        {
            var stats = await _providerManager.GetProviderStatsAsync(provider.Id, cancellationToken);
            // Use requests in the last minute as a proxy for active connections
            providerConnections[provider] = stats.RequestsToday; // Simplified
        }
        
        return providerConnections
            .OrderBy(kvp => kvp.Value)
            .Take(maxProviders)
            .Select(kvp => kvp.Key)
            .ToList();
    }

    private List<IDataProvider> SelectRandom(List<IDataProvider> providers, int maxProviders)
    {
        return providers.OrderBy(x => _random.Next()).Take(maxProviders).ToList();
    }

    private double GetProviderHealthScore(string providerId)
    {
        // This would typically get actual health metrics
        // For now, return a default score
        return 0.9; // 90% health
    }

    private TimeSpan GetProviderAverageResponseTime(string providerId)
    {
        // This would typically get actual response time metrics
        // For now, return a default value
        return TimeSpan.FromSeconds(1.5);
    }

    private async Task<decimal> GetProviderCostPerRequestAsync(string providerId, CancellationToken cancellationToken)
    {
        var config = _configuration.CurrentValue.Providers?.GetValueOrDefault(providerId);
        return config?.CostPerRequest ?? 0.01m; // Default 1 cent per request
    }

    private double GetProviderQualityScore(string providerId, ProviderCapability capability)
    {
        // This would typically be based on data completeness, accuracy metrics, etc.
        // For now, return provider-specific defaults
        return providerId switch
        {
            "tmdb" => 0.95, // TMDb has high quality metadata
            "streaming-availability" => 0.85, // Good streaming data
            _ => 0.75 // Default quality
        };
    }

    private DataQuality GetProviderQualityLevel(string providerId)
    {
        return providerId switch
        {
            "tmdb" => DataQuality.Premium,
            "streaming-availability" => DataQuality.Standard,
            _ => DataQuality.Basic
        };
    }

    #endregion
}