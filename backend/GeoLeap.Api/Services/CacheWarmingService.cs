using GeoLeap.Api.Models;
using Microsoft.Extensions.Options;

namespace GeoLeap.Api.Services;

public class CacheWarmingService : BackgroundService
{
    private readonly IOptionsMonitor<CacheSettings> _settings;
    private readonly ILogger<CacheWarmingService> _logger;
    private readonly IServiceScopeFactory _serviceScopeFactory;

    public CacheWarmingService(
        IOptionsMonitor<CacheSettings> settings,
        ILogger<CacheWarmingService> logger,
        IServiceScopeFactory serviceScopeFactory)
    {
        _settings = settings;
        _logger = logger;
        _serviceScopeFactory = serviceScopeFactory;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Cache warming service started");

        // Wait 5 minutes before starting initial warming to allow application to fully start
        await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            if (!_settings.CurrentValue.Warming.Enabled)
            {
                _logger.LogInformation("Cache warming is disabled, waiting...");
                await Task.Delay(TimeSpan.FromHours(1), stoppingToken);
                continue;
            }

            try
            {
                _logger.LogInformation("Starting cache warming cycle");
                var warmingStartTime = DateTime.UtcNow;

                using (var scope = _serviceScopeFactory.CreateScope())
                {
                    // Run warming operations in parallel for better performance
                    var warmingTasks = new[]
                    {
                        WarmPopularContentCache(scope.ServiceProvider, stoppingToken),
                        WarmSearchCache(scope.ServiceProvider, stoppingToken),
                        WarmMetadataCache(scope.ServiceProvider, stoppingToken),
                        WarmTrendingContentCache(scope.ServiceProvider, stoppingToken)
                    };

                    await Task.WhenAll(warmingTasks);
                }

                var warmingDuration = DateTime.UtcNow - warmingStartTime;
                _logger.LogInformation("Cache warming cycle completed in {Duration}", warmingDuration);

                // Wait for the configured interval before next warming cycle
                var interval = _settings.CurrentValue.Warming.WarmingInterval;
                await Task.Delay(interval, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                _logger.LogInformation("Cache warming service is shutting down");
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during cache warming cycle");
                await Task.Delay(TimeSpan.FromMinutes(15), stoppingToken);
            }
        }

        _logger.LogInformation("Cache warming service stopped");
    }

    private async Task WarmPopularContentCache(IServiceProvider serviceProvider, CancellationToken cancellationToken)
    {
        try
        {
            var cacheService = serviceProvider.GetRequiredService<ICacheService>();
            var cacheKeyService = serviceProvider.GetRequiredService<ICacheKeyService>();
            var streamingClient = serviceProvider.GetRequiredService<IStreamingAvailabilityClient>();
            var popularContentService = serviceProvider.GetRequiredService<IPopularContentService>();
            
            var limit = _settings.CurrentValue.Warming.PopularContentLimit;
            var popularContent = await popularContentService.GetPopularContentAsync(limit);
            
            var warmingTasks = popularContent.Select(async content =>
            {
                if (cancellationToken.IsCancellationRequested) return;

                try
                {
                    var streamingKey = cacheKeyService.GenerateStreamingKey(content.Id);
                    
                    if (!await cacheService.ExistsAsync(streamingKey))
                    {
                        await cacheService.WarmCacheAsync(
                            streamingKey,
                            () => streamingClient.GetAvailabilityAsync(content.Id, content.Type, cancellationToken),
                            TimeSpan.FromHours(1)
                        );
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to warm cache for content {ContentId}", content.Id);
                }
            });

            await Task.WhenAll(warmingTasks);
            _logger.LogInformation("Warmed cache for {Count} popular content items", popularContent.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to warm popular content cache");
        }
    }

    private async Task WarmSearchCache(IServiceProvider serviceProvider, CancellationToken cancellationToken)
    {
        try
        {
            var cacheService = serviceProvider.GetRequiredService<ICacheService>();
            var cacheKeyService = serviceProvider.GetRequiredService<ICacheKeyService>();
            var tmdbClient = serviceProvider.GetRequiredService<ITmdbClient>();
            var popularContentService = serviceProvider.GetRequiredService<IPopularContentService>();
            
            var limit = _settings.CurrentValue.Warming.PopularSearchLimit;
            var popularSearches = await popularContentService.GetPopularSearchQueriesAsync(limit);
            
            var warmingTasks = popularSearches.Select(async searchQuery =>
            {
                if (cancellationToken.IsCancellationRequested) return;

                try
                {
                    var searchKey = cacheKeyService.GenerateSearchKey(searchQuery);
                    
                    if (!await cacheService.ExistsAsync(searchKey))
                    {
                        await cacheService.WarmCacheAsync(
                            searchKey,
                            () => tmdbClient.SearchMultiAsync(searchQuery, 1, "en-US", false),
                            TimeSpan.FromHours(6)
                        );
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to warm search cache for query {Query}", searchQuery);
                }
            });

            await Task.WhenAll(warmingTasks);
            _logger.LogInformation("Warmed search cache for {Count} popular queries", popularSearches.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to warm search cache");
        }
    }

    private async Task WarmMetadataCache(IServiceProvider serviceProvider, CancellationToken cancellationToken)
    {
        try
        {
            var cacheService = serviceProvider.GetRequiredService<ICacheService>();
            var cacheKeyService = serviceProvider.GetRequiredService<ICacheKeyService>();
            var tmdbClient = serviceProvider.GetRequiredService<ITmdbClient>();
            var popularContentService = serviceProvider.GetRequiredService<IPopularContentService>();
            
            var popularContent = await popularContentService.GetPopularContentAsync(50);
            
            var warmingTasks = popularContent.Select(async content =>
            {
                if (cancellationToken.IsCancellationRequested) return;

                try
                {
                    // Extract TMDb ID from content ID if possible
                    if (int.TryParse(content.Id.Replace("tt", ""), out var tmdbId))
                    {
                        var metadataKey = cacheKeyService.GenerateMetadataKey(tmdbId, content.Type);
                        
                        if (!await cacheService.ExistsAsync(metadataKey))
                        {
                            await cacheService.WarmCacheAsync(
                                metadataKey,
                                async () =>
                                {
                                    return content.Type == ContentType.Movie
                                        ? await tmdbClient.GetMovieDetailsAsync(tmdbId, "en-US")
                                        : await tmdbClient.GetTvShowDetailsAsync(tmdbId, "en-US");
                                },
                                TimeSpan.FromHours(24)
                            );
                        }
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to warm metadata cache for content {ContentId}", content.Id);
                }
            });

            await Task.WhenAll(warmingTasks);
            _logger.LogInformation("Warmed metadata cache for {Count} popular content items", popularContent.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to warm metadata cache");
        }
    }

    private async Task WarmTrendingContentCache(IServiceProvider serviceProvider, CancellationToken cancellationToken)
    {
        try
        {
            var cacheService = serviceProvider.GetRequiredService<ICacheService>();
            var cacheKeyService = serviceProvider.GetRequiredService<ICacheKeyService>();
            var streamingClient = serviceProvider.GetRequiredService<IStreamingAvailabilityClient>();
            var tmdbClient = serviceProvider.GetRequiredService<ITmdbClient>();
            var popularContentService = serviceProvider.GetRequiredService<IPopularContentService>();
            
            var trendingContent = await popularContentService.GetTrendingContentAsync(25);
            var trendingQueries = await popularContentService.GetTrendingSearchQueriesAsync(15);
            
            // Warm trending content
            var contentTasks = trendingContent.Select(async content =>
            {
                if (cancellationToken.IsCancellationRequested) return;

                try
                {
                    var streamingKey = cacheKeyService.GenerateStreamingKey(content.Id);
                    
                    if (!await cacheService.ExistsAsync(streamingKey))
                    {
                        await cacheService.WarmCacheAsync(
                            streamingKey,
                            () => streamingClient.GetAvailabilityAsync(content.Id, content.Type, cancellationToken),
                            TimeSpan.FromMinutes(30) // Shorter TTL for trending
                        );
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to warm trending content cache for {ContentId}", content.Id);
                }
            });

            // Warm trending searches
            var searchTasks = trendingQueries.Select(async query =>
            {
                if (cancellationToken.IsCancellationRequested) return;

                try
                {
                    var searchKey = cacheKeyService.GenerateSearchKey(query);
                    
                    if (!await cacheService.ExistsAsync(searchKey))
                    {
                        await cacheService.WarmCacheAsync(
                            searchKey,
                            () => tmdbClient.SearchMultiAsync(query, 1, "en-US", false),
                            TimeSpan.FromHours(2) // Shorter TTL for trending
                        );
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to warm trending search cache for query {Query}", query);
                }
            });

            await Task.WhenAll(contentTasks.Concat(searchTasks));
            _logger.LogInformation("Warmed trending cache for {ContentCount} content items and {QueryCount} queries", 
                trendingContent.Count, trendingQueries.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to warm trending cache");
        }
    }

    public override async Task StopAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Cache warming service is stopping...");
        await base.StopAsync(stoppingToken);
    }
}