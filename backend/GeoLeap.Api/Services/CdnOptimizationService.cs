using Microsoft.Extensions.Options;
using GeoLeap.Api.Models;
using System.Text.Json;

namespace GeoLeap.Api.Services;

/// <summary>
/// CDN optimization service for accelerating search content delivery
/// </summary>
public class CdnOptimizationService : ICdnOptimizationService
{
    private readonly ICacheService _cacheService;
    private readonly ILogger<CdnOptimizationService> _logger;
    private readonly CdnOptimizationOptions _options;
    private readonly HttpClient _httpClient;

    public CdnOptimizationService(
        ICacheService cacheService,
        ILogger<CdnOptimizationService> logger,
        IOptions<CdnOptimizationOptions> options,
        HttpClient httpClient)
    {
        _cacheService = cacheService;
        _logger = logger;
        _options = options.Value;
        _httpClient = httpClient;
    }

    /// <summary>
    /// Gets optimized CDN URL for static content
    /// </summary>
    public string GetCdnUrl(string contentPath, CdnContentType contentType)
    {
        if (!_options.EnableCdn)
        {
            return contentPath;
        }

        var cdnEndpoint = GetCdnEndpointForContentType(contentType);
        var optimizedPath = OptimizeContentPath(contentPath, contentType);
        
        return $"{cdnEndpoint.TrimEnd('/')}/{optimizedPath.TrimStart('/')}";
    }

    /// <summary>
    /// Caches popular search results in CDN for global acceleration
    /// </summary>
    public async Task CachePopularSearchResultsAsync(
        List<GlobalSearchResult> popularResults,
        string cacheKey,
        TimeSpan ttl,
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (!_options.EnableCdn || !_options.CacheSearchResults)
            {
                return;
            }

            _logger.LogInformation("Caching {Count} popular search results in CDN with key {CacheKey}", 
                popularResults.Count, cacheKey);

            // Optimize results for CDN caching
            var optimizedResults = await OptimizeResultsForCdn(popularResults);
            
            // Cache in local Redis first
            await _cacheService.SetAsync($"cdn_search_{cacheKey}", optimizedResults, ttl);

            // Push to CDN if edge caching is enabled
            if (_options.EnableEdgeCaching)
            {
                await PushToCdnEdgeAsync(cacheKey, optimizedResults, ttl, cancellationToken);
            }

            _logger.LogInformation("Successfully cached search results in CDN for key {CacheKey}", cacheKey);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to cache search results in CDN for key {CacheKey}", cacheKey);
            // Don't throw - CDN caching is optional enhancement
        }
    }

    /// <summary>
    /// Retrieves cached search results from CDN
    /// </summary>
    public async Task<List<GlobalSearchResult>?> GetCachedSearchResultsAsync(
        string cacheKey,
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (!_options.EnableCdn || !_options.CacheSearchResults)
            {
                return null;
            }

            _logger.LogDebug("Retrieving cached search results from CDN for key {CacheKey}", cacheKey);

            // Try CDN edge cache first
            if (_options.EnableEdgeCaching)
            {
                var edgeResults = await GetFromCdnEdgeAsync(cacheKey, cancellationToken);
                if (edgeResults != null)
                {
                    _logger.LogInformation("Cache hit from CDN edge for key {CacheKey}", cacheKey);
                    return edgeResults;
                }
            }

            // Fall back to local Redis cache
            var cachedResults = await _cacheService.GetAsync<List<CdnOptimizedResult>>($"cdn_search_{cacheKey}");
            if (cachedResults != null)
            {
                _logger.LogInformation("Cache hit from local Redis for CDN key {CacheKey}", cacheKey);
                return RestoreResultsFromCdn(cachedResults);
            }

            return null;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to retrieve cached search results from CDN for key {CacheKey}", cacheKey);
            return null;
        }
    }

    /// <summary>
    /// Pre-warms CDN cache with popular content
    /// </summary>
    public async Task WarmCdnCacheAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            if (!_options.EnableCdn || !_options.EnableCacheWarming)
            {
                return;
            }

            _logger.LogInformation("Starting CDN cache warming for popular content");

            var warmingTasks = new List<Task>();

            // Warm popular search queries
            if (_options.WarmPopularQueries)
            {
                warmingTasks.Add(WarmPopularQueriesAsync(cancellationToken));
            }

            // Warm static assets
            if (_options.WarmStaticAssets)
            {
                warmingTasks.Add(WarmStaticAssetsAsync(cancellationToken));
            }

            // Warm image assets
            if (_options.WarmImageAssets)
            {
                warmingTasks.Add(WarmImageAssetsAsync(cancellationToken));
            }

            await Task.WhenAll(warmingTasks);

            _logger.LogInformation("CDN cache warming completed successfully");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "CDN cache warming failed");
        }
    }

    /// <summary>
    /// Invalidates CDN cache for updated content
    /// </summary>
    public async Task InvalidateCdnCacheAsync(
        string cacheKey,
        CdnContentType contentType,
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (!_options.EnableCdn)
            {
                return;
            }

            _logger.LogInformation("Invalidating CDN cache for key {CacheKey}, type {ContentType}", 
                cacheKey, contentType);

            var invalidationTasks = new List<Task>();

            // Invalidate local cache
            invalidationTasks.Add(_cacheService.RemoveAsync($"cdn_search_{cacheKey}"));

            // Invalidate CDN edge cache
            if (_options.EnableEdgeCaching)
            {
                invalidationTasks.Add(InvalidateCdnEdgeAsync(cacheKey, contentType, cancellationToken));
            }

            await Task.WhenAll(invalidationTasks);

            _logger.LogInformation("Successfully invalidated CDN cache for key {CacheKey}", cacheKey);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to invalidate CDN cache for key {CacheKey}", cacheKey);
        }
    }

    /// <summary>
    /// Gets CDN performance metrics
    /// </summary>
    public async Task<CdnPerformanceMetrics> GetCdnPerformanceMetricsAsync(
        DateTime from,
        DateTime to,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // In a real implementation, this would query CDN provider APIs
            var metrics = new CdnPerformanceMetrics
            {
                CacheHitRate = await GetCdnCacheHitRateAsync(from, to, cancellationToken),
                BandwidthSaved = await GetBandwidthSavedAsync(from, to, cancellationToken),
                AverageResponseTime = await GetAverageCdnResponseTimeAsync(from, to, cancellationToken),
                TotalRequests = await GetTotalCdnRequestsAsync(from, to, cancellationToken),
                EdgeLocations = await GetActiveEdgeLocationsAsync(cancellationToken),
                DataTransfer = await GetDataTransferMetricsAsync(from, to, cancellationToken)
            };

            return metrics;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve CDN performance metrics");
            return new CdnPerformanceMetrics(); // Return empty metrics on error
        }
    }

    private string GetCdnEndpointForContentType(CdnContentType contentType)
    {
        return contentType switch
        {
            CdnContentType.Images => _options.ImagesCdnEndpoint,
            CdnContentType.StaticAssets => _options.StaticAssetsCdnEndpoint,
            CdnContentType.SearchResults => _options.ApiCdnEndpoint,
            CdnContentType.Videos => _options.VideosCdnEndpoint,
            _ => _options.DefaultCdnEndpoint
        };
    }

    private string OptimizeContentPath(string contentPath, CdnContentType contentType)
    {
        var optimizedPath = contentPath;

        // Add versioning for cache busting
        if (_options.EnableVersioning && !contentPath.Contains("?v="))
        {
            var separator = contentPath.Contains("?") ? "&" : "?";
            optimizedPath = $"{contentPath}{separator}v={_options.ContentVersion}";
        }

        // Add content type specific optimizations
        optimizedPath = contentType switch
        {
            CdnContentType.Images => OptimizeImagePath(optimizedPath),
            CdnContentType.Videos => OptimizeVideoPath(optimizedPath),
            _ => optimizedPath
        };

        return optimizedPath;
    }

    private string OptimizeImagePath(string imagePath)
    {
        // Add image optimization parameters
        if (_options.OptimizeImages)
        {
            var separator = imagePath.Contains("?") ? "&" : "?";
            imagePath = $"{imagePath}{separator}format=webp&quality={_options.ImageQuality}";
        }

        return imagePath;
    }

    private string OptimizeVideoPath(string videoPath)
    {
        // Add video optimization parameters if needed
        return videoPath;
    }

    private async Task<List<CdnOptimizedResult>> OptimizeResultsForCdn(List<GlobalSearchResult> results)
    {
        var optimizedResults = new List<CdnOptimizedResult>();

        foreach (var result in results)
        {
            var optimized = new CdnOptimizedResult
            {
                Id = result.Id,
                Title = result.Title,
                Type = result.Type,
                Year = result.Year,
                Rating = result.Rating.HasValue ? (decimal?)result.Rating.Value : null,
                RuntimeMinutes = result.RuntimeMinutes,
                RelevanceScore = (decimal)result.RelevanceScore,
                
                // Optimize image URLs for CDN
                PosterUrl = !string.IsNullOrEmpty(result.PosterUrl) 
                    ? GetCdnUrl(result.PosterUrl, CdnContentType.Images) 
                    : null,
                BackdropUrl = !string.IsNullOrEmpty(result.BackdropUrl) 
                    ? GetCdnUrl(result.BackdropUrl, CdnContentType.Images) 
                    : null,

                // Serialize complex objects to JSON for efficient caching
                StreamingOptionsJson = JsonSerializer.Serialize(result.StreamingOptions),
                GenresJson = JsonSerializer.Serialize(result.Genres),
                MatchedFieldsJson = JsonSerializer.Serialize(result.MatchedFields),
                ExternalIdsJson = JsonSerializer.Serialize(result.ExternalIds)
            };

            optimizedResults.Add(optimized);
        }

        return optimizedResults;
    }

    private List<GlobalSearchResult> RestoreResultsFromCdn(List<CdnOptimizedResult> cdnResults)
    {
        var results = new List<GlobalSearchResult>();

        foreach (var cdnResult in cdnResults)
        {
            var result = new GlobalSearchResult
            {
                Id = cdnResult.Id,
                Title = cdnResult.Title,
                Type = cdnResult.Type,
                Year = cdnResult.Year,
                Rating = cdnResult.Rating.HasValue ? (double?)cdnResult.Rating.Value : null,
                RuntimeMinutes = cdnResult.RuntimeMinutes,
                RelevanceScore = (double)cdnResult.RelevanceScore,
                PosterUrl = cdnResult.PosterUrl ?? string.Empty,
                BackdropUrl = cdnResult.BackdropUrl ?? string.Empty,
                
                // Deserialize JSON back to objects
                StreamingOptions = JsonSerializer.Deserialize<List<GlobalStreamingOption>>(cdnResult.StreamingOptionsJson) ?? new List<GlobalStreamingOption>(),
                Genres = JsonSerializer.Deserialize<List<string>>(cdnResult.GenresJson) ?? new List<string>(),
                MatchedFields = JsonSerializer.Deserialize<List<string>>(cdnResult.MatchedFieldsJson) ?? new List<string>(),
                ExternalIds = JsonSerializer.Deserialize<List<ExternalId>>(cdnResult.ExternalIdsJson) ?? new List<ExternalId>()
            };

            results.Add(result);
        }

        return results;
    }

    private List<StreamingOption> ConvertGlobalStreamingOptions(List<GlobalStreamingOption> globalOptions)
    {
        return globalOptions.Select(go => new StreamingOption
        {
            ServiceId = go.Service,
            ServiceName = go.Service,
            Type = Enum.TryParse<StreamingType>(go.Type.ToString(), true, out var streamingType) ? streamingType : StreamingType.Subscription,
            Price = go.Price,
            Currency = go.Currency,
            StreamingUrl = go.Url,
            CountryCode = go.CountryCode,
            LastUpdated = go.LastUpdated
        }).ToList();
    }

    private async Task PushToCdnEdgeAsync(string cacheKey, List<CdnOptimizedResult> results, TimeSpan ttl, CancellationToken cancellationToken)
    {
        // Implementation would depend on CDN provider (Azure CDN, CloudFlare, AWS CloudFront, etc.)
        // This is a placeholder for the actual CDN integration
        _logger.LogDebug("Pushing cache key {CacheKey} to CDN edge with TTL {TTL}", cacheKey, ttl);
        
        if (!string.IsNullOrEmpty(_options.CdnApiEndpoint))
        {
            var payload = JsonSerializer.Serialize(new
            {
                key = cacheKey,
                data = results,
                ttl = (int)ttl.TotalSeconds
            });

            var content = new StringContent(payload, System.Text.Encoding.UTF8, "application/json");
            await _httpClient.PostAsync($"{_options.CdnApiEndpoint}/cache", content, cancellationToken);
        }
    }

    private async Task<List<GlobalSearchResult>?> GetFromCdnEdgeAsync(string cacheKey, CancellationToken cancellationToken)
    {
        if (string.IsNullOrEmpty(_options.CdnApiEndpoint))
        {
            return null;
        }

        try
        {
            var response = await _httpClient.GetAsync($"{_options.CdnApiEndpoint}/cache/{cacheKey}", cancellationToken);
            if (response.IsSuccessStatusCode)
            {
                var json = await response.Content.ReadAsStringAsync(cancellationToken);
                var cdnResults = JsonSerializer.Deserialize<List<CdnOptimizedResult>>(json);
                return cdnResults != null ? RestoreResultsFromCdn(cdnResults) : null;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to retrieve from CDN edge for key {CacheKey}", cacheKey);
        }

        return null;
    }

    private async Task InvalidateCdnEdgeAsync(string cacheKey, CdnContentType contentType, CancellationToken cancellationToken)
    {
        if (string.IsNullOrEmpty(_options.CdnApiEndpoint))
        {
            return;
        }

        try
        {
            await _httpClient.DeleteAsync($"{_options.CdnApiEndpoint}/cache/{cacheKey}", cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to invalidate CDN edge cache for key {CacheKey}", cacheKey);
        }
    }

    private async Task WarmPopularQueriesAsync(CancellationToken cancellationToken)
    {
        // Implementation would warm CDN with popular search queries
        _logger.LogDebug("Warming CDN cache with popular search queries");
        await Task.Delay(100, cancellationToken); // Placeholder
    }

    private async Task WarmStaticAssetsAsync(CancellationToken cancellationToken)
    {
        // Implementation would warm CDN with static assets
        _logger.LogDebug("Warming CDN cache with static assets");
        await Task.Delay(100, cancellationToken); // Placeholder
    }

    private async Task WarmImageAssetsAsync(CancellationToken cancellationToken)
    {
        // Implementation would warm CDN with popular images
        _logger.LogDebug("Warming CDN cache with popular images");
        await Task.Delay(100, cancellationToken); // Placeholder
    }

    // Placeholder implementations for CDN metrics (would integrate with actual CDN provider APIs)
    private async Task<decimal> GetCdnCacheHitRateAsync(DateTime from, DateTime to, CancellationToken cancellationToken)
    {
        await Task.Delay(10, cancellationToken);
        return 85.5m; // Example: 85.5% cache hit rate
    }

    private async Task<long> GetBandwidthSavedAsync(DateTime from, DateTime to, CancellationToken cancellationToken)
    {
        await Task.Delay(10, cancellationToken);
        return 1024 * 1024 * 500; // Example: 500 MB saved
    }

    private async Task<int> GetAverageCdnResponseTimeAsync(DateTime from, DateTime to, CancellationToken cancellationToken)
    {
        await Task.Delay(10, cancellationToken);
        return 45; // Example: 45ms average response time
    }

    private async Task<long> GetTotalCdnRequestsAsync(DateTime from, DateTime to, CancellationToken cancellationToken)
    {
        await Task.Delay(10, cancellationToken);
        return 50000; // Example: 50,000 requests
    }

    private async Task<List<string>> GetActiveEdgeLocationsAsync(CancellationToken cancellationToken)
    {
        await Task.Delay(10, cancellationToken);
        return new List<string> { "US-East", "US-West", "EU-West", "Asia-Pacific" };
    }

    private async Task<CdnDataTransferMetrics> GetDataTransferMetricsAsync(DateTime from, DateTime to, CancellationToken cancellationToken)
    {
        await Task.Delay(10, cancellationToken);
        return new CdnDataTransferMetrics
        {
            TotalDataTransfer = 2L * 1024 * 1024 * 1024, // 2 GB
            OriginDataTransfer = 300L * 1024 * 1024, // 300 MB
            CacheDataTransfer = 2L * 1024 * 1024 * 1024 - (300L * 1024 * 1024) // Remainder from cache
        };
    }
}

/// <summary>
/// Interface for CDN optimization service
/// </summary>
public interface ICdnOptimizationService
{
    string GetCdnUrl(string contentPath, CdnContentType contentType);
    
    Task CachePopularSearchResultsAsync(
        List<GlobalSearchResult> popularResults,
        string cacheKey,
        TimeSpan ttl,
        CancellationToken cancellationToken = default);
        
    Task<List<GlobalSearchResult>?> GetCachedSearchResultsAsync(
        string cacheKey,
        CancellationToken cancellationToken = default);
        
    Task WarmCdnCacheAsync(CancellationToken cancellationToken = default);
    
    Task InvalidateCdnCacheAsync(
        string cacheKey,
        CdnContentType contentType,
        CancellationToken cancellationToken = default);
        
    Task<CdnPerformanceMetrics> GetCdnPerformanceMetricsAsync(
        DateTime from,
        DateTime to,
        CancellationToken cancellationToken = default);
}

/// <summary>
/// CDN content types for optimization
/// </summary>
public enum CdnContentType
{
    Images,
    Videos,
    StaticAssets,
    SearchResults,
    ApiResponses
}

/// <summary>
/// CDN-optimized result for efficient caching
/// </summary>
public class CdnOptimizedResult
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public ContentType Type { get; set; }
    public int? Year { get; set; }
    public decimal? Rating { get; set; }
    public int? RuntimeMinutes { get; set; }
    public decimal RelevanceScore { get; set; }
    public string? PosterUrl { get; set; }
    public string? BackdropUrl { get; set; }
    public string StreamingOptionsJson { get; set; } = "[]";
    public string GenresJson { get; set; } = "[]";
    public string MatchedFieldsJson { get; set; } = "[]";
    public string ExternalIdsJson { get; set; } = "[]";
}

/// <summary>
/// CDN performance metrics
/// </summary>
public class CdnPerformanceMetrics
{
    public decimal CacheHitRate { get; set; }
    public long BandwidthSaved { get; set; }
    public int AverageResponseTime { get; set; }
    public long TotalRequests { get; set; }
    public List<string> EdgeLocations { get; set; } = new();
    public CdnDataTransferMetrics DataTransfer { get; set; } = new();
}

/// <summary>
/// CDN data transfer metrics
/// </summary>
public class CdnDataTransferMetrics
{
    public long TotalDataTransfer { get; set; }
    public long OriginDataTransfer { get; set; }
    public long CacheDataTransfer { get; set; }
}

/// <summary>
/// Configuration options for CDN optimization
/// </summary>
public class CdnOptimizationOptions
{
    public bool EnableCdn { get; set; } = true;
    public bool CacheSearchResults { get; set; } = true;
    public bool EnableEdgeCaching { get; set; } = true;
    public bool EnableCacheWarming { get; set; } = true;
    public bool WarmPopularQueries { get; set; } = true;
    public bool WarmStaticAssets { get; set; } = true;
    public bool WarmImageAssets { get; set; } = true;
    public bool EnableVersioning { get; set; } = true;
    public bool OptimizeImages { get; set; } = true;
    public int ImageQuality { get; set; } = 85;
    public string ContentVersion { get; set; } = "1.0";
    
    public string DefaultCdnEndpoint { get; set; } = "";
    public string ImagesCdnEndpoint { get; set; } = "";
    public string VideosCdnEndpoint { get; set; } = "";
    public string StaticAssetsCdnEndpoint { get; set; } = "";
    public string ApiCdnEndpoint { get; set; } = "";
    public string CdnApiEndpoint { get; set; } = "";
}