# User Story US-3.4: API Abstraction Layer

**Epic:** Data Integration & API Setup  
**Priority:** P1 (Should-Have)  
**Story Points:** 5  
**Sprint:** 6  

## User Story
**As a** developer  
**I need** a unified abstraction layer for all external API interactions  
**So that** I can easily manage multiple data sources, implement consistent error handling, and enable seamless API provider switching

## Acceptance Criteria
- [ ] Unified interface for all external streaming and metadata APIs
- [ ] Provider-agnostic data models with automatic transformation
- [ ] Configurable API provider switching without code changes
- [ ] Consistent error handling and retry logic across all providers
- [ ] Request/response logging and monitoring for all API calls
- [ ] Load balancing and failover between multiple API providers
- [ ] Rate limiting and quota management per provider
- [ ] Automatic data source selection based on availability and cost

## Definition of Done
- [ ] Single interface provides access to all external data sources
- [ ] API provider can be switched via configuration without deployment
- [ ] All API responses are normalized to consistent internal format
- [ ] Error handling is uniform across all providers
- [ ] Failover works automatically when primary provider is unavailable
- [ ] Load balancing distributes requests optimally across providers
- [ ] Comprehensive logging tracks all provider interactions
- [ ] Performance metrics are collected for all providers

## Implementation Tasks

### Backend Implementation
- [ ] Design unified data access interface
- [ ] Create provider registration and discovery system
- [ ] Implement provider-specific adapters
- [ ] Build data transformation and normalization engine
- [ ] Add provider load balancing and failover logic
- [ ] Create unified error handling and retry policies
- [ ] Implement provider health checking and monitoring
- [ ] Add configuration-driven provider selection
- [ ] Build comprehensive logging and metrics collection
- [ ] Create provider performance analytics

### Unified Data Access Interface
```csharp
public interface IContentDataService
{
    Task<ContentSearchResult> SearchContentAsync(ContentSearchRequest request);
    Task<ContentDetails> GetContentDetailsAsync(string contentId, ContentType type);
    Task<StreamingAvailability> GetStreamingAvailabilityAsync(string contentId, string countryCode = null);
    Task<List<StreamingService>> GetAvailableServicesAsync(string countryCode = null);
    Task<PersonDetails> GetPersonDetailsAsync(string personId);
    Task<List<Genre>> GetGenresAsync(ContentType type);
    Task<ProviderHealthStatus> GetProvidersHealthAsync();
}

public class ContentDataService : IContentDataService
{
    private readonly IProviderManager _providerManager;
    private readonly IDataTransformationService _transformationService;
    private readonly IProviderSelector _providerSelector;
    private readonly ICacheService _cacheService;
    private readonly ILogger<ContentDataService> _logger;

    public async Task<ContentSearchResult> SearchContentAsync(ContentSearchRequest request)
    {
        var cacheKey = GenerateCacheKey("search", request);
        var cached = await _cacheService.GetAsync<ContentSearchResult>(cacheKey);
        if (cached != null) return cached;

        var providers = await _providerSelector.SelectProvidersAsync(
            ProviderCapability.Search, 
            request.RequiredQuality
        );

        ContentSearchResult result = null;
        Exception lastException = null;

        foreach (var provider in providers)
        {
            try
            {
                _logger.LogDebug("Attempting search with provider {Provider}", provider.Name);
                
                var providerResult = await provider.SearchContentAsync(request);
                result = await _transformationService.TransformSearchResultAsync(providerResult, provider.ProviderType);
                
                await _cacheService.SetAsync(cacheKey, result, GetCacheTtl(request));
                
                _logger.LogInformation("Search successful with provider {Provider}, found {Count} results", 
                    provider.Name, result.Results.Count);
                break;
            }
            catch (Exception ex)
            {
                lastException = ex;
                _logger.LogWarning(ex, "Search failed with provider {Provider}", provider.Name);
                await _providerManager.RecordProviderErrorAsync(provider.Id, ex);
                
                // Continue to next provider
            }
        }

        if (result == null)
        {
            throw new AllProvidersFailedException("All search providers failed", lastException);
        }

        return result;
    }

    public async Task<StreamingAvailability> GetStreamingAvailabilityAsync(string contentId, string countryCode = null)
    {
        var providers = await _providerSelector.SelectProvidersAsync(
            ProviderCapability.StreamingAvailability,
            DataQuality.Standard
        );

        var availabilityTasks = providers.Select(async provider =>
        {
            try
            {
                var availability = await provider.GetStreamingAvailabilityAsync(contentId, countryCode);
                return await _transformationService.TransformStreamingAvailabilityAsync(availability, provider.ProviderType);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to get availability from provider {Provider}", provider.Name);
                return null;
            }
        });

        var results = await Task.WhenAll(availabilityTasks);
        var validResults = results.Where(r => r != null).ToList();

        if (!validResults.Any())
        {
            throw new NoAvailableProvidersException("No providers could retrieve streaming availability");
        }

        // Merge results from multiple providers
        return await _transformationService.MergeStreamingAvailabilityAsync(validResults);
    }
}
```

### Provider Management System
```csharp
public interface IProviderManager
{
    Task<List<IDataProvider>> GetAvailableProvidersAsync(ProviderCapability capability);
    Task<IDataProvider> GetProviderAsync(string providerId);
    Task RegisterProviderAsync(IDataProvider provider);
    Task<ProviderHealth> CheckProviderHealthAsync(string providerId);
    Task RecordProviderErrorAsync(string providerId, Exception error);
    Task<ProviderStats> GetProviderStatsAsync(string providerId);
}

public class ProviderManager : IProviderManager
{
    private readonly Dictionary<string, IDataProvider> _providers = new();
    private readonly Dictionary<string, ProviderHealth> _providerHealth = new();
    private readonly IOptionsMonitor<ProviderConfiguration> _configuration;
    private readonly ILogger<ProviderManager> _logger;

    public async Task RegisterProviderAsync(IDataProvider provider)
    {
        _providers[provider.Id] = provider;
        _providerHealth[provider.Id] = new ProviderHealth 
        { 
            ProviderId = provider.Id,
            IsHealthy = true,
            LastCheckTime = DateTime.UtcNow
        };

        _logger.LogInformation("Registered provider {ProviderId} ({ProviderName})", 
            provider.Id, provider.Name);

        // Start health monitoring for this provider
        _ = Task.Run(() => MonitorProviderHealthAsync(provider));
    }

    public async Task<List<IDataProvider>> GetAvailableProvidersAsync(ProviderCapability capability)
    {
        var availableProviders = new List<IDataProvider>();

        foreach (var provider in _providers.Values)
        {
            if (!provider.Capabilities.HasFlag(capability)) continue;

            var health = _providerHealth.GetValueOrDefault(provider.Id);
            var config = _configuration.CurrentValue.Providers.GetValueOrDefault(provider.Id);

            if (health?.IsHealthy == true && config?.Enabled == true)
            {
                availableProviders.Add(provider);
            }
        }

        return availableProviders.OrderBy(p => GetProviderPriority(p.Id)).ToList();
    }

    private async Task MonitorProviderHealthAsync(IDataProvider provider)
    {
        while (true)
        {
            try
            {
                var isHealthy = await provider.CheckHealthAsync();
                var health = _providerHealth[provider.Id];
                
                if (health.IsHealthy != isHealthy)
                {
                    _logger.LogInformation("Provider {ProviderId} health changed: {IsHealthy}", 
                        provider.Id, isHealthy);
                }

                health.IsHealthy = isHealthy;
                health.LastCheckTime = DateTime.UtcNow;

                if (!isHealthy)
                {
                    health.ConsecutiveFailures++;
                    if (health.ConsecutiveFailures >= 5)
                    {
                        _logger.LogError("Provider {ProviderId} has failed health checks 5 times consecutively", 
                            provider.Id);
                    }
                }
                else
                {
                    health.ConsecutiveFailures = 0;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Health check failed for provider {ProviderId}", provider.Id);
            }

            await Task.Delay(TimeSpan.FromMinutes(5)); // Check every 5 minutes
        }
    }
}

public interface IDataProvider
{
    string Id { get; }
    string Name { get; }
    ProviderType ProviderType { get; }
    ProviderCapability Capabilities { get; }
    
    Task<bool> CheckHealthAsync();
    Task<ProviderSearchResult> SearchContentAsync(ContentSearchRequest request);
    Task<ProviderContentDetails> GetContentDetailsAsync(string contentId, ContentType type);
    Task<ProviderStreamingAvailability> GetStreamingAvailabilityAsync(string contentId, string countryCode);
    Task<ProviderStats> GetStatsAsync();
}

[Flags]
public enum ProviderCapability
{
    Search = 1,
    ContentDetails = 2,
    StreamingAvailability = 4,
    PersonDetails = 8,
    Images = 16,
    All = Search | ContentDetails | StreamingAvailability | PersonDetails | Images
}

public enum ProviderType
{
    StreamingAvailability,
    ContentMetadata,
    Images,
    Reviews
}
```

### Provider Implementations
```csharp
public class StreamingAvailabilityProvider : IDataProvider
{
    public string Id => "streaming-availability";
    public string Name => "Streaming Availability API";
    public ProviderType ProviderType => ProviderType.StreamingAvailability;
    public ProviderCapability Capabilities => ProviderCapability.Search | ProviderCapability.StreamingAvailability;

    private readonly IStreamingAvailabilityClient _client;
    private readonly ILogger<StreamingAvailabilityProvider> _logger;

    public async Task<ProviderSearchResult> SearchContentAsync(ContentSearchRequest request)
    {
        var result = await _client.SearchContentAsync(request.Query, request.ContentType);
        
        return new ProviderSearchResult
        {
            Results = result.Results.Select(r => new ProviderContentSummary
            {
                Id = r.ContentId,
                Title = r.Title,
                Type = r.Type,
                Year = r.Year,
                ProviderId = Id
            }).ToList(),
            TotalCount = result.TotalCount,
            Page = result.Page,
            ProviderId = Id
        };
    }

    public async Task<ProviderStreamingAvailability> GetStreamingAvailabilityAsync(string contentId, string countryCode)
    {
        var availability = await _client.GetAvailabilityAsync(contentId, ContentType.Movie); // Determine type somehow
        
        return new ProviderStreamingAvailability
        {
            ContentId = contentId,
            StreamingOptions = availability.StreamingOptions.Select(so => new ProviderStreamingOption
            {
                ServiceId = so.ServiceId,
                ServiceName = so.ServiceName,
                CountryCode = so.CountryCode,
                Type = so.Type,
                Price = so.Price,
                Currency = so.Currency,
                StreamingUrl = so.StreamingUrl
            }).ToList(),
            ProviderId = Id
        };
    }

    public async Task<bool> CheckHealthAsync()
    {
        try
        {
            var services = await _client.GetSupportedServicesAsync();
            return services.Any();
        }
        catch
        {
            return false;
        }
    }
}

public class TmdbProvider : IDataProvider
{
    public string Id => "tmdb";
    public string Name => "The Movie Database";
    public ProviderType ProviderType => ProviderType.ContentMetadata;
    public ProviderCapability Capabilities => ProviderCapability.Search | 
                                              ProviderCapability.ContentDetails | 
                                              ProviderCapability.PersonDetails | 
                                              ProviderCapability.Images;

    private readonly ITmdbClient _client;

    public async Task<ProviderSearchResult> SearchContentAsync(ContentSearchRequest request)
    {
        var result = await _client.SearchMultiAsync(request.Query);
        
        return new ProviderSearchResult
        {
            Results = result.Results.Select(r => new ProviderContentSummary
            {
                Id = r.TmdbId.ToString(),
                Title = r.Title,
                Type = r.Type,
                Year = r.ReleaseDate?.Year,
                ProviderId = Id
            }).ToList(),
            ProviderId = Id
        };
    }

    public async Task<ProviderContentDetails> GetContentDetailsAsync(string contentId, ContentType type)
    {
        var details = type == ContentType.Movie 
            ? await _client.GetMovieDetailsAsync(int.Parse(contentId))
            : await _client.GetTvShowDetailsAsync(int.Parse(contentId));
            
        return new ProviderContentDetails
        {
            Id = contentId,
            Title = details.Title,
            Overview = details.Overview,
            ReleaseDate = details.ReleaseDate,
            Genres = details.Genres,
            Cast = details.Cast?.Select(c => new ProviderCastMember
            {
                Name = c.Name,
                Character = c.Character,
                ProfilePath = c.ProfilePath
            }).ToList(),
            ProviderId = Id
        };
    }
}
```

### Data Transformation Service
```csharp
public interface IDataTransformationService
{
    Task<ContentSearchResult> TransformSearchResultAsync(ProviderSearchResult providerResult, ProviderType providerType);
    Task<ContentDetails> TransformContentDetailsAsync(ProviderContentDetails providerDetails, ProviderType providerType);
    Task<StreamingAvailability> TransformStreamingAvailabilityAsync(ProviderStreamingAvailability providerAvailability, ProviderType providerType);
    Task<StreamingAvailability> MergeStreamingAvailabilityAsync(List<StreamingAvailability> availabilityData);
}

public class DataTransformationService : IDataTransformationService
{
    private readonly ILogger<DataTransformationService> _logger;
    private readonly Dictionary<ProviderType, IDataTransformer> _transformers;

    public DataTransformationService(IEnumerable<IDataTransformer> transformers, ILogger<DataTransformationService> logger)
    {
        _logger = logger;
        _transformers = transformers.ToDictionary(t => t.ProviderType, t => t);
    }

    public async Task<ContentSearchResult> TransformSearchResultAsync(ProviderSearchResult providerResult, ProviderType providerType)
    {
        if (!_transformers.TryGetValue(providerType, out var transformer))
        {
            throw new UnsupportedProviderTypeException($"No transformer available for provider type: {providerType}");
        }

        var transformed = await transformer.TransformSearchResultAsync(providerResult);
        
        _logger.LogDebug("Transformed search result from {ProviderType}: {ResultCount} items", 
            providerType, transformed.Results.Count);

        return transformed;
    }

    public async Task<StreamingAvailability> MergeStreamingAvailabilityAsync(List<StreamingAvailability> availabilityData)
    {
        if (!availabilityData.Any()) return null;

        var merged = new StreamingAvailability
        {
            ContentId = availabilityData.First().ContentId,
            StreamingOptions = new List<StreamingOption>()
        };

        // Merge streaming options from all providers, removing duplicates
        var allOptions = availabilityData.SelectMany(a => a.StreamingOptions).ToList();
        var uniqueOptions = new Dictionary<string, StreamingOption>();

        foreach (var option in allOptions)
        {
            var key = $"{option.ServiceId}:{option.CountryCode}:{option.Type}";
            
            if (!uniqueOptions.ContainsKey(key) || IsMoreRecentData(option, uniqueOptions[key]))
            {
                uniqueOptions[key] = option;
            }
        }

        merged.StreamingOptions = uniqueOptions.Values.ToList();
        merged.LastUpdated = availabilityData.Max(a => a.LastUpdated);

        _logger.LogDebug("Merged streaming availability from {ProviderCount} providers: {OptionCount} unique options",
            availabilityData.Count, merged.StreamingOptions.Count);

        return merged;
    }

    private bool IsMoreRecentData(StreamingOption newOption, StreamingOption existingOption)
    {
        // Prefer data with more recent timestamps or more complete information
        return newOption.LastUpdated > existingOption.LastUpdated ||
               (!string.IsNullOrEmpty(newOption.StreamingUrl) && string.IsNullOrEmpty(existingOption.StreamingUrl));
    }
}
```

### Provider Selection Strategy
```csharp
public interface IProviderSelector
{
    Task<List<IDataProvider>> SelectProvidersAsync(ProviderCapability capability, DataQuality requiredQuality);
    Task<IDataProvider> SelectBestProviderAsync(ProviderCapability capability, string contentId = null);
}

public class ProviderSelector : IProviderSelector
{
    private readonly IProviderManager _providerManager;
    private readonly IOptionsMonitor<ProviderConfiguration> _configuration;
    private readonly ILogger<ProviderSelector> _logger;

    public async Task<List<IDataProvider>> SelectProvidersAsync(ProviderCapability capability, DataQuality requiredQuality)
    {
        var availableProviders = await _providerManager.GetAvailableProvidersAsync(capability);
        var selectedProviders = new List<IDataProvider>();

        // Apply selection strategy based on configuration
        var strategy = _configuration.CurrentValue.SelectionStrategy;

        switch (strategy)
        {
            case ProviderSelectionStrategy.Primary:
                selectedProviders = SelectPrimaryProvider(availableProviders, capability);
                break;
                
            case ProviderSelectionStrategy.LoadBalanced:
                selectedProviders = SelectLoadBalanced(availableProviders, capability);
                break;
                
            case ProviderSelectionStrategy.FailoverChain:
                selectedProviders = SelectFailoverChain(availableProviders, capability);
                break;
                
            case ProviderSelectionStrategy.BestQuality:
                selectedProviders = SelectByQuality(availableProviders, capability, requiredQuality);
                break;
        }

        _logger.LogDebug("Selected {Count} providers for capability {Capability} with strategy {Strategy}",
            selectedProviders.Count, capability, strategy);

        return selectedProviders;
    }

    private List<IDataProvider> SelectPrimaryProvider(List<IDataProvider> availableProviders, ProviderCapability capability)
    {
        var primaryConfig = _configuration.CurrentValue.PrimaryProviders.GetValueOrDefault(capability);
        
        if (!string.IsNullOrEmpty(primaryConfig))
        {
            var primaryProvider = availableProviders.FirstOrDefault(p => p.Id == primaryConfig);
            if (primaryProvider != null)
            {
                return new List<IDataProvider> { primaryProvider };
            }
        }

        // Fall back to first available provider
        return availableProviders.Take(1).ToList();
    }

    private List<IDataProvider> SelectLoadBalanced(List<IDataProvider> availableProviders, ProviderCapability capability)
    {
        // Implement weighted round-robin based on provider performance
        var weights = new Dictionary<string, int>();
        
        foreach (var provider in availableProviders)
        {
            var config = _configuration.CurrentValue.Providers.GetValueOrDefault(provider.Id);
            weights[provider.Id] = config?.Weight ?? 1;
        }

        return availableProviders.OrderByDescending(p => weights.GetValueOrDefault(p.Id, 1)).ToList();
    }

    private List<IDataProvider> SelectFailoverChain(List<IDataProvider> availableProviders, ProviderCapability capability)
    {
        // Return all providers ordered by priority for failover
        return availableProviders.OrderByDescending(p => GetProviderPriority(p.Id)).ToList();
    }
}

public enum ProviderSelectionStrategy
{
    Primary,
    LoadBalanced,
    FailoverChain,
    BestQuality
}

public enum DataQuality
{
    Basic,
    Standard,
    Premium
}
```

### Configuration
```json
{
  "ProviderConfiguration": {
    "SelectionStrategy": "FailoverChain",
    "PrimaryProviders": {
      "StreamingAvailability": "streaming-availability",
      "ContentDetails": "tmdb",
      "Search": "tmdb"
    },
    "Providers": {
      "streaming-availability": {
        "Enabled": true,
        "Weight": 10,
        "Priority": 1,
        "MaxConcurrentRequests": 10,
        "TimeoutSeconds": 30
      },
      "tmdb": {
        "Enabled": true,
        "Weight": 10,
        "Priority": 1,
        "MaxConcurrentRequests": 20,
        "TimeoutSeconds": 15
      }
    },
    "HealthCheck": {
      "IntervalMinutes": 5,
      "TimeoutSeconds": 10,
      "FailureThreshold": 5
    },
    "LoadBalancing": {
      "Algorithm": "WeightedRoundRobin",
      "UpdateIntervalMinutes": 10
    }
  }
}
```

## Testing Strategy
- [ ] Unit tests for abstraction layer components
- [ ] Integration tests with multiple provider configurations
- [ ] Provider failover and recovery tests
- [ ] Load balancing distribution tests
- [ ] Data transformation accuracy tests
- [ ] Provider health monitoring tests
- [ ] Configuration change tests without deployment
- [ ] Performance comparison tests between providers

## Dependencies
- Streaming Availability API integration (US-3.1)
- Content Metadata API integration (US-3.2)
- Data Caching Layer (US-3.3) for performance optimization
- Logging infrastructure (US-1.3) for provider monitoring
- Error handling system (US-1.4) for consistent error management
- Configuration management system

## Success Metrics
- **Provider switching time:** < 1 second for configuration changes
- **Failover response time:** < 5 seconds to detect and switch providers
- **Data consistency:** > 95% accuracy in data transformation
- **Provider availability:** > 99% successful requests through abstraction layer
- **Load distribution:** Even request distribution when load balancing enabled
- **Error recovery:** < 1% permanent failures after provider failover
- **Response time:** < 10% overhead compared to direct provider calls

## Monitoring and Alerting
- Provider health status dashboards
- Request distribution and load balancing metrics
- Data transformation success/failure rates
- Provider response time comparisons
- Failover event tracking and alerts
- Configuration change audit logs