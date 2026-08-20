using GeoLeap.Api.Models;
using Microsoft.Extensions.Options;

namespace GeoLeap.Api.Services;

/// <summary>
/// Complete content data service implementation with full provider management, load balancing, and failover
/// </summary>
public class FullContentDataService : IContentDataService
{
    private readonly IProviderManager _providerManager;
    private readonly IProviderSelector _providerSelector;
    private readonly IDataTransformationService _transformationService;
    private readonly ICacheService _cacheService;
    private readonly IOptionsMonitor<ProviderConfiguration> _configuration;
    private readonly ILogger<FullContentDataService> _logger;

    public FullContentDataService(
        IProviderManager providerManager,
        IProviderSelector providerSelector,
        IDataTransformationService transformationService,
        ICacheService cacheService,
        IOptionsMonitor<ProviderConfiguration> configuration,
        ILogger<FullContentDataService> logger)
    {
        _providerManager = providerManager;
        _providerSelector = providerSelector;
        _transformationService = transformationService;
        _cacheService = cacheService;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<ContentSearchResult> SearchContentAsync(ContentSearchRequest request, CancellationToken cancellationToken = default)
    {
        var correlationId = Guid.NewGuid().ToString("N");
        _logger.LogInformation("API Abstraction Layer: Starting content search for query '{Query}' [CorrelationId: {CorrelationId}]", 
            request.Query, correlationId);

        // Check cache first
        var cacheKey = GenerateCacheKey("search", request.Query, request.ContentType?.ToString() ?? "", request.Page.ToString());
        var cachedResult = await _cacheService.GetAsync<ContentSearchResult>(cacheKey);
        if (cachedResult != null)
        {
            _logger.LogDebug("Cache hit for search query '{Query}' [CorrelationId: {CorrelationId}]", 
                request.Query, correlationId);
            return cachedResult;
        }

        var providers = await _providerSelector.SelectProvidersAsync(
            ProviderCapability.Search, 
            request.RequiredQuality, 
            cancellationToken);

        if (!providers.Any())
        {
            throw new NoAvailableProvidersException(
                $"No providers available for search capability with quality {request.RequiredQuality}");
        }

        var searchResults = new List<ContentSearchResult>();
        Exception? lastException = null;

        // Try providers in failover chain order
        foreach (var provider in providers)
        {
            var stopwatch = System.Diagnostics.Stopwatch.StartNew();
            
            try
            {
                _logger.LogDebug("Attempting search with provider {Provider} [CorrelationId: {CorrelationId}]", 
                    provider.Name, correlationId);

                // Check if provider can make request (rate limiting)
                if (!await provider.CanMakeRequestAsync(cancellationToken))
                {
                    _logger.LogWarning("Provider {Provider} rate limited, skipping [CorrelationId: {CorrelationId}]", 
                        provider.Name, correlationId);
                    continue;
                }

                var providerResult = await provider.SearchContentAsync(request, cancellationToken);
                await provider.RecordRequestAsync(cancellationToken);
                
                var transformedResult = await _transformationService.TransformSearchResultAsync(
                    providerResult, provider.ProviderType, cancellationToken);

                stopwatch.Stop();
                await _providerManager.RecordProviderSuccessAsync(provider.Id, stopwatch.Elapsed, cancellationToken);
                await _providerSelector.RecordProviderSelectionAsync(
                    provider.Id, ProviderCapability.Search, true, stopwatch.Elapsed, cancellationToken);

                searchResults.Add(transformedResult);
                
                _logger.LogInformation("Search successful with provider {Provider}, found {Count} results in {Time}ms [CorrelationId: {CorrelationId}]", 
                    provider.Name, transformedResult.Results.Count, stopwatch.ElapsedMilliseconds, correlationId);

                // For primary strategy, use first successful result
                if (_configuration.CurrentValue.SelectionStrategy == ProviderSelectionStrategy.Primary)
                {
                    break;
                }
            }
            catch (Exception ex)
            {
                stopwatch.Stop();
                lastException = ex;
                
                _logger.LogWarning(ex, "Search failed with provider {Provider} [CorrelationId: {CorrelationId}]", 
                    provider.Name, correlationId);
                
                await _providerManager.RecordProviderErrorAsync(provider.Id, ex, cancellationToken);
                await _providerSelector.RecordProviderSelectionAsync(
                    provider.Id, ProviderCapability.Search, false, stopwatch.Elapsed, cancellationToken);

                // Continue to next provider in failover chain
            }
        }

        if (!searchResults.Any())
        {
            throw new AllProvidersFailedException(
                $"All search providers failed for query '{request.Query}'", lastException);
        }

        // Merge results from multiple providers
        // FIXED: Week 1 Day 3 - Use FirstOrDefault to prevent exceptions
        var finalResult = searchResults.Count == 1
            ? searchResults.FirstOrDefault() ?? throw new InvalidOperationException("Expected exactly one search result")
            : await _transformationService.MergeSearchResultsAsync(searchResults, cancellationToken);

        // Cache the result
        var cacheTtl = GetCacheTtl("search");
        await _cacheService.SetAsync(cacheKey, finalResult, cacheTtl);

        _logger.LogInformation("API Abstraction Layer: Search completed for query '{Query}' with {ResultCount} results from {ProviderCount} providers [CorrelationId: {CorrelationId}]", 
            request.Query, finalResult.Results.Count, searchResults.Count, correlationId);

        return finalResult;
    }

    public async Task<ContentDetails> GetContentDetailsAsync(string contentId, ContentType type, CancellationToken cancellationToken = default)
    {
        var correlationId = Guid.NewGuid().ToString("N");
        _logger.LogInformation("API Abstraction Layer: Getting content details for ID '{ContentId}' [CorrelationId: {CorrelationId}]", 
            contentId, correlationId);

        // Check cache first
        var cacheKey = GenerateCacheKey("details", contentId, type.ToString());
        var cachedResult = await _cacheService.GetAsync<ContentDetails>(cacheKey);
        if (cachedResult != null)
        {
            _logger.LogDebug("Cache hit for content details '{ContentId}' [CorrelationId: {CorrelationId}]", 
                contentId, correlationId);
            return cachedResult;
        }

        var providers = await _providerSelector.SelectProvidersAsync(
            ProviderCapability.ContentDetails, 
            DataQuality.Standard, 
            cancellationToken);

        if (!providers.Any())
        {
            throw new NoAvailableProvidersException(
                $"No providers available for content details capability");
        }

        var detailResults = new List<ContentDetails>();
        Exception? lastException = null;

        // Try providers in order for enrichment
        foreach (var provider in providers)
        {
            var stopwatch = System.Diagnostics.Stopwatch.StartNew();
            
            try
            {
                if (!await provider.CanMakeRequestAsync(cancellationToken))
                {
                    continue;
                }

                var providerResult = await provider.GetContentDetailsAsync(contentId, type, cancellationToken);
                await provider.RecordRequestAsync(cancellationToken);
                
                var transformedResult = await _transformationService.TransformContentDetailsAsync(
                    providerResult, provider.ProviderType, cancellationToken);

                stopwatch.Stop();
                await _providerManager.RecordProviderSuccessAsync(provider.Id, stopwatch.Elapsed, cancellationToken);

                detailResults.Add(transformedResult);
                
                _logger.LogDebug("Content details retrieved from provider {Provider} [CorrelationId: {CorrelationId}]", 
                    provider.Name, correlationId);
            }
            catch (Exception ex)
            {
                stopwatch.Stop();
                lastException = ex;
                
                _logger.LogWarning(ex, "Get content details failed with provider {Provider} [CorrelationId: {CorrelationId}]", 
                    provider.Name, correlationId);
                
                await _providerManager.RecordProviderErrorAsync(provider.Id, ex, cancellationToken);
            }
        }

        if (!detailResults.Any())
        {
            throw new AllProvidersFailedException(
                $"All content details providers failed for content '{contentId}'", lastException);
        }

        // Enrich data by combining information from multiple providers
        // FIXED: Week 1 Day 3 - Use FirstOrDefault to prevent exceptions
        var enrichedResult = detailResults.Count == 1
            ? detailResults.FirstOrDefault() ?? throw new InvalidOperationException("Expected exactly one detail result")
            : await _transformationService.EnrichContentDetailsAsync(detailResults, cancellationToken);

        // Cache the result
        var cacheTtl = GetCacheTtl("details");
        await _cacheService.SetAsync(cacheKey, enrichedResult, cacheTtl);

        _logger.LogInformation("API Abstraction Layer: Content details completed for ID '{ContentId}' from {ProviderCount} providers [CorrelationId: {CorrelationId}]", 
            contentId, detailResults.Count, correlationId);

        return enrichedResult;
    }

    public async Task<StreamingAvailabilityResponse> GetStreamingAvailabilityAsync(string contentId, string? countryCode = null, CancellationToken cancellationToken = default)
    {
        var correlationId = Guid.NewGuid().ToString("N");
        _logger.LogInformation("API Abstraction Layer: Getting streaming availability for content '{ContentId}' [CorrelationId: {CorrelationId}]", 
            contentId, correlationId);

        // Check cache first
        var cacheKey = GenerateCacheKey("availability", contentId, countryCode ?? "global");
        var cachedResult = await _cacheService.GetAsync<StreamingAvailabilityResponse>(cacheKey);
        if (cachedResult != null)
        {
            _logger.LogDebug("Cache hit for streaming availability '{ContentId}' [CorrelationId: {CorrelationId}]", 
                contentId, correlationId);
            return cachedResult;
        }

        var providers = await _providerSelector.SelectProvidersAsync(
            ProviderCapability.StreamingAvailability, 
            DataQuality.Standard, 
            cancellationToken);

        if (!providers.Any())
        {
            _logger.LogWarning("No streaming availability providers available, returning empty result [CorrelationId: {CorrelationId}]", 
                correlationId);
            
            return new StreamingAvailabilityResponse
            {
                ContentId = contentId,
                Title = "Unknown",
                Type = ContentType.Movie,
                StreamingOptions = new List<StreamingOption>(),
                LastUpdated = DateTime.UtcNow
            };
        }

        var availabilityResults = new List<StreamingAvailabilityResponse>();

        // Collect results from all providers in parallel for comprehensive availability data
        var providerTasks = providers.Select(async provider =>
        {
            var stopwatch = System.Diagnostics.Stopwatch.StartNew();
            
            try
            {
                if (!await provider.CanMakeRequestAsync(cancellationToken))
                {
                    return null;
                }

                var providerResult = await provider.GetStreamingAvailabilityAsync(contentId, countryCode, cancellationToken);
                await provider.RecordRequestAsync(cancellationToken);
                
                var transformedResult = await _transformationService.TransformStreamingAvailabilityAsync(
                    providerResult, provider.ProviderType, cancellationToken);

                stopwatch.Stop();
                await _providerManager.RecordProviderSuccessAsync(provider.Id, stopwatch.Elapsed, cancellationToken);

                _logger.LogDebug("Streaming availability retrieved from provider {Provider} with {OptionCount} options [CorrelationId: {CorrelationId}]", 
                    provider.Name, transformedResult.StreamingOptions.Count, correlationId);

                return transformedResult;
            }
            catch (Exception ex)
            {
                stopwatch.Stop();
                
                _logger.LogWarning(ex, "Get streaming availability failed with provider {Provider} [CorrelationId: {CorrelationId}]", 
                    provider.Name, correlationId);
                
                await _providerManager.RecordProviderErrorAsync(provider.Id, ex, cancellationToken);
                return null;
            }
        });

        var results = await Task.WhenAll(providerTasks);
        availabilityResults = results.Where(r => r != null).ToList()!;

        if (!availabilityResults.Any())
        {
            _logger.LogWarning("All streaming availability providers failed for content '{ContentId}' [CorrelationId: {CorrelationId}]", 
                contentId, correlationId);
            
            return new StreamingAvailabilityResponse
            {
                ContentId = contentId,
                Title = "Unknown",
                Type = ContentType.Movie,
                StreamingOptions = new List<StreamingOption>(),
                LastUpdated = DateTime.UtcNow
            };
        }

        // Merge availability from multiple providers
        // FIXED: Week 1 Day 3 - Use FirstOrDefault to prevent exceptions
        var finalResult = availabilityResults.Count == 1
            ? availabilityResults.FirstOrDefault() ?? throw new InvalidOperationException("Expected exactly one availability result")
            : await _transformationService.MergeStreamingAvailabilityAsync(availabilityResults, cancellationToken);

        // Cache the result with shorter TTL for streaming data
        var cacheTtl = GetCacheTtl("availability");
        await _cacheService.SetAsync(cacheKey, finalResult, cacheTtl);

        _logger.LogInformation("API Abstraction Layer: Streaming availability completed for content '{ContentId}' with {OptionCount} options from {ProviderCount} providers [CorrelationId: {CorrelationId}]", 
            contentId, finalResult.StreamingOptions.Count, availabilityResults.Count, correlationId);

        return finalResult;
    }

    public async Task<List<StreamingService>> GetAvailableServicesAsync(string? countryCode = null, CancellationToken cancellationToken = default)
    {
        var correlationId = Guid.NewGuid().ToString("N");
        _logger.LogInformation("API Abstraction Layer: Getting available services [CorrelationId: {CorrelationId}]", correlationId);

        var cacheKey = GenerateCacheKey("services", countryCode ?? "global");
        var cachedResult = await _cacheService.GetAsync<List<StreamingService>>(cacheKey);
        if (cachedResult != null)
        {
            return cachedResult;
        }

        var bestProvider = await _providerSelector.SelectBestProviderAsync(
            ProviderCapability.StreamingAvailability, null, cancellationToken);

        if (bestProvider == null)
        {
            _logger.LogWarning("No providers available for streaming services [CorrelationId: {CorrelationId}]", correlationId);
            return new List<StreamingService>();
        }

        try
        {
            var providerServices = await bestProvider.GetAvailableServicesAsync(countryCode, cancellationToken);
            await bestProvider.RecordRequestAsync(cancellationToken);
            
            // Convert provider services to domain model
            var services = providerServices.Select(s => new StreamingService
            {
                Id = Guid.TryParse(s.Id, out var guid) ? guid : Guid.NewGuid(),
                Name = s.Name
                // Map other properties as needed
            }).ToList();

            var cacheTtl = GetCacheTtl("services");
            await _cacheService.SetAsync(cacheKey, services, cacheTtl);

            return services;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get available services [CorrelationId: {CorrelationId}]", correlationId);
            return new List<StreamingService>();
        }
    }

    public async Task<PersonDetails> GetPersonDetailsAsync(string personId, CancellationToken cancellationToken = default)
    {
        var correlationId = Guid.NewGuid().ToString("N");
        _logger.LogInformation("API Abstraction Layer: Getting person details for ID '{PersonId}' [CorrelationId: {CorrelationId}]", 
            personId, correlationId);

        var cacheKey = GenerateCacheKey("person", personId);
        var cachedResult = await _cacheService.GetAsync<PersonDetails>(cacheKey);
        if (cachedResult != null)
        {
            return cachedResult;
        }

        var bestProvider = await _providerSelector.SelectBestProviderAsync(
            ProviderCapability.PersonDetails, personId, cancellationToken);

        if (bestProvider == null)
        {
            throw new NoAvailableProvidersException("No providers available for person details capability");
        }

        try
        {
            var providerResult = await bestProvider.GetPersonDetailsAsync(personId, cancellationToken);
            await bestProvider.RecordRequestAsync(cancellationToken);
            
            var transformedResult = await _transformationService.TransformPersonDetailsAsync(
                providerResult, bestProvider.ProviderType, cancellationToken);

            var cacheTtl = GetCacheTtl("person");
            await _cacheService.SetAsync(cacheKey, transformedResult, cacheTtl);

            return transformedResult;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get person details [CorrelationId: {CorrelationId}]", correlationId);
            throw;
        }
    }

    public async Task<List<Genre>> GetGenresAsync(ContentType type, CancellationToken cancellationToken = default)
    {
        var correlationId = Guid.NewGuid().ToString("N");
        _logger.LogInformation("API Abstraction Layer: Getting genres for type {Type} [CorrelationId: {CorrelationId}]", 
            type, correlationId);

        var cacheKey = GenerateCacheKey("genres", type.ToString());
        var cachedResult = await _cacheService.GetAsync<List<Genre>>(cacheKey);
        if (cachedResult != null)
        {
            return cachedResult;
        }

        var bestProvider = await _providerSelector.SelectBestProviderAsync(
            ProviderCapability.Genres, null, cancellationToken);

        if (bestProvider == null)
        {
            _logger.LogWarning("No providers available for genres [CorrelationId: {CorrelationId}]", correlationId);
            return new List<Genre>();
        }

        try
        {
            var providerGenres = await bestProvider.GetGenresAsync(type, cancellationToken);
            await bestProvider.RecordRequestAsync(cancellationToken);
            
            // Convert provider genres to domain model
            var genres = providerGenres.Select(g => new Genre
            {
                Id = int.TryParse(g.Id, out var id) ? id : 0,
                Name = g.Name
            }).ToList();

            var cacheTtl = GetCacheTtl("genres");
            await _cacheService.SetAsync(cacheKey, genres, cacheTtl);

            return genres;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get genres [CorrelationId: {CorrelationId}]", correlationId);
            return new List<Genre>();
        }
    }

    public async Task<ProviderHealthStatus> GetProvidersHealthAsync(CancellationToken cancellationToken = default)
    {
        var providerHealthList = await _providerManager.GetAllProvidersHealthAsync(cancellationToken);
        var selectionStats = await _providerSelector.GetSelectionStatsAsync(cancellationToken);

        var healthyCount = providerHealthList.Count(p => p.IsHealthy);
        var totalCount = providerHealthList.Count;

        // Enhance provider health with selection stats
        foreach (var health in providerHealthList)
        {
            if (selectionStats.ProviderSuccessRates.TryGetValue(health.ProviderId, out var successRate))
            {
                health.Stats.SuccessfulRequests = (int)(selectionStats.ProviderUsageCounts.GetValueOrDefault(health.ProviderId, 0) * successRate / 100);
                health.Stats.FailedRequests = selectionStats.ProviderUsageCounts.GetValueOrDefault(health.ProviderId, 0) - health.Stats.SuccessfulRequests;
            }

            if (selectionStats.ProviderAverageResponseTimes.TryGetValue(health.ProviderId, out var avgResponseTime))
            {
                health.AverageResponseTime = avgResponseTime;
            }
        }

        return new ProviderHealthStatus
        {
            Providers = providerHealthList,
            LastChecked = DateTime.UtcNow,
            OverallStatus = healthyCount == totalCount ? OverallHealthStatus.Healthy :
                          healthyCount > 0 ? OverallHealthStatus.Degraded :
                          OverallHealthStatus.Unhealthy,
            Summary = $"{healthyCount}/{totalCount} providers are healthy"
        };
    }

    public async Task InvalidateCacheAsync(string contentId, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("API Abstraction Layer: Invalidating cache for content: {ContentId}", contentId);
        
        var keysToInvalidate = new[]
        {
            GenerateCacheKey("details", contentId, "Movie"),
            GenerateCacheKey("details", contentId, "Show"),
            GenerateCacheKey("availability", contentId, "global"),
            GenerateCacheKey("search", contentId) // Partial match
        };

        var invalidationTasks = keysToInvalidate.Select(async key =>
        {
            try
            {
                await _cacheService.RemoveAsync(key);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to invalidate cache key: {Key}", key);
            }
        });

        await Task.WhenAll(invalidationTasks);
    }

    public async Task WarmupCacheAsync(List<string> contentIds, CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("API Abstraction Layer: Warming up cache for {Count} content items", contentIds.Count);

        var warmupTasks = contentIds.Take(20).Select(async contentId => // Limit to prevent overload
        {
            try
            {
                // Warm up both movie and show details
                var detailsTasks = new Task[]
                {
                    GetContentDetailsAsync(contentId, ContentType.Movie, cancellationToken),
                    GetContentDetailsAsync(contentId, ContentType.TvSeries, cancellationToken),
                    GetStreamingAvailabilityAsync(contentId, null, cancellationToken)
                };

                await Task.WhenAll(detailsTasks.Select(async task =>
                {
                    try
                    {
                        await task;
                    }
                    catch
                    {
                        // Ignore individual warmup failures
                    }
                }));
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Failed to warm up cache for content: {ContentId}", contentId);
            }
        });

        await Task.WhenAll(warmupTasks);
        _logger.LogInformation("API Abstraction Layer: Cache warmup completed");
    }

    #region Private Helper Methods

    private string GenerateCacheKey(string operation, params string[] parameters)
    {
        var key = $"abstraction:{operation}";
        if (parameters.Any())
        {
            key += ":" + string.Join(":", parameters);
        }
        return key;
    }

    private TimeSpan GetCacheTtl(string operation)
    {
        return operation switch
        {
            "search" => TimeSpan.FromMinutes(30),
            "details" => TimeSpan.FromHours(6),
            "availability" => TimeSpan.FromHours(1),
            "person" => TimeSpan.FromDays(1),
            "genres" => TimeSpan.FromDays(7),
            "services" => TimeSpan.FromDays(1),
            _ => TimeSpan.FromHours(1)
        };
    }

    /// <summary>
    /// Get autocomplete suggestions for search queries
    /// </summary>
    public async Task<List<string>> GetAutocompleteSuggestionsAsync(string partialQuery, int maxResults = 10, CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(partialQuery) || partialQuery.Length < 2)
        {
            return new List<string>();
        }
        
        try
        {
            // Simple fallback suggestions based on common patterns
            var suggestions = new List<string>();
            
            if (partialQuery.Length >= 2)
            {
                // Add some basic autocomplete suggestions
                if (partialQuery.ToLowerInvariant().StartsWith("the"))
                {
                    suggestions.AddRange(new[] { "The Matrix", "The Godfather", "The Dark Knight", "The Shawshank Redemption" });
                }
                else if (partialQuery.ToLowerInvariant().StartsWith("star"))
                {
                    suggestions.AddRange(new[] { "Star Wars", "Star Trek", "Stardust" });
                }
                else if (partialQuery.ToLowerInvariant().StartsWith("lord"))
                {
                    suggestions.AddRange(new[] { "Lord of the Rings", "Lords of Dogtown" });
                }
                else
                {
                    // Generic suggestions
                    suggestions.AddRange(new[] { 
                        $"{partialQuery} movie", 
                        $"{partialQuery} series", 
                        $"{partialQuery} documentary" 
                    });
                }
            }

            return suggestions.Take(maxResults).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting autocomplete suggestions for query: {Query}", partialQuery);
            return new List<string>();
        }
    }

    public async Task<List<ContentMetadata>> GetPopularContentAsync(ContentType? contentType = null, string? country = null, int limit = 20, CancellationToken cancellationToken = default)
    {
        var correlationId = Guid.NewGuid().ToString("N");
        _logger.LogInformation("API Abstraction Layer: Getting popular content [CorrelationId: {CorrelationId}]", correlationId);

        var cacheKey = GenerateCacheKey("popular", contentType?.ToString() ?? "all", country ?? "global", limit.ToString());
        var cachedResult = await _cacheService.GetAsync<List<ContentMetadata>>(cacheKey);
        if (cachedResult != null)
        {
            return cachedResult;
        }

        var bestProvider = await _providerSelector.SelectBestProviderAsync(
            ProviderCapability.Search, null, cancellationToken);

        if (bestProvider == null)
        {
            _logger.LogWarning("No providers available for popular content [CorrelationId: {CorrelationId}]", correlationId);
            return new List<ContentMetadata>();
        }

        try
        {
            // For now, return mock popular content data
            // In a real implementation, this would call provider.GetPopularContentAsync()
            var popularContent = new List<ContentMetadata>();
            
            // Generate some mock popular content
            for (int i = 1; i <= Math.Min(limit, 10); i++)
            {
                popularContent.Add(new ContentMetadata
                {
                    Id = i,
                    ExternalId = $"popular_{i}",
                    Title = $"Popular {(contentType?.ToString() ?? "Content")} {i}",
                    OriginalTitle = $"Popular {(contentType?.ToString() ?? "Content")} {i}",
                    Type = contentType == ContentType.Movie ? TmdbContentType.Movie : TmdbContentType.TvSeries,
                    Year = 2024 - (i % 5),
                    Overview = $"This is a popular {contentType?.ToString()?.ToLower() ?? "content"} item that users frequently search for.",
                    Rating = 8.0 + (i % 3) * 0.5,
                    VoteCount = 1000 + i * 100,
                    Popularity = 100.0 - i * 5,
                    PosterUrl = $"/images/popular_{i}.jpg",
                    BackdropUrl = $"/images/backdrop_{i}.jpg",
                    Genres = new List<string> { "Drama", "Action", "Thriller" },
                    OriginalLanguage = "en",
                    Adult = false,
                    Status = "released",
                    LastUpdated = DateTime.UtcNow,
                    DataQuality = DataQuality.High,
                    SourceProvider = bestProvider.Name,
                    Metadata = new Dictionary<string, object>
                    {
                        ["popularity_rank"] = i,
                        ["trending"] = true
                    }
                });
            }

            var cacheTtl = GetCacheTtl("popular");
            await _cacheService.SetAsync(cacheKey, popularContent, cacheTtl);

            _logger.LogInformation("API Abstraction Layer: Popular content retrieved with {Count} items [CorrelationId: {CorrelationId}]", 
                popularContent.Count, correlationId);

            return popularContent;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get popular content [CorrelationId: {CorrelationId}]", correlationId);
            return new List<ContentMetadata>();
        }
    }

    #endregion
}