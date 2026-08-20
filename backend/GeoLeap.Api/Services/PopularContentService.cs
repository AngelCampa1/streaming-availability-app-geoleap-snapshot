using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

public class PopularContentService : IPopularContentService
{
    private readonly ILogger<PopularContentService> _logger;
    private readonly ICacheService _cacheService;
    private readonly ICacheKeyService _cacheKeyService;

    // Hardcoded popular content for cache warming - in production this would come from analytics
    private static readonly List<PopularContent> _hardcodedPopularContent = new()
    {
        new() { Id = "tt0111161", Type = ContentType.Movie, Title = "The Shawshank Redemption", Popularity = 95 },
        new() { Id = "tt0068646", Type = ContentType.Movie, Title = "The Godfather", Popularity = 94 },
        new() { Id = "tt0468569", Type = ContentType.Movie, Title = "The Dark Knight", Popularity = 93 },
        new() { Id = "tt0050083", Type = ContentType.Movie, Title = "12 Angry Men", Popularity = 92 },
        new() { Id = "tt0108052", Type = ContentType.Movie, Title = "Schindler's List", Popularity = 91 },
        new() { Id = "tt0167260", Type = ContentType.Movie, Title = "The Lord of the Rings: The Return of the King", Popularity = 90 },
        new() { Id = "tt0110912", Type = ContentType.Movie, Title = "Pulp Fiction", Popularity = 89 },
        new() { Id = "tt0060196", Type = ContentType.Movie, Title = "The Good, the Bad and the Ugly", Popularity = 88 },
        new() { Id = "tt0137523", Type = ContentType.Movie, Title = "Fight Club", Popularity = 87 },
        new() { Id = "tt0120737", Type = ContentType.Movie, Title = "The Lord of the Rings: The Fellowship of the Ring", Popularity = 86 },
        new() { Id = "tt0944947", Type = ContentType.TvSeries, Title = "Game of Thrones", Popularity = 95 },
        new() { Id = "tt0903747", Type = ContentType.TvSeries, Title = "Breaking Bad", Popularity = 94 },
        new() { Id = "tt1475582", Type = ContentType.TvSeries, Title = "Sherlock", Popularity = 93 },
        new() { Id = "tt0413573", Type = ContentType.TvSeries, Title = "Grey's Anatomy", Popularity = 92 },
        new() { Id = "tt0436992", Type = ContentType.TvSeries, Title = "Doctor Who", Popularity = 91 },
        new() { Id = "tt0386676", Type = ContentType.TvSeries, Title = "The Office", Popularity = 90 },
        new() { Id = "tt0417299", Type = ContentType.TvSeries, Title = "Avatar: The Last Airbender", Popularity = 89 },
        new() { Id = "tt2356777", Type = ContentType.TvSeries, Title = "True Detective", Popularity = 88 },
        new() { Id = "tt2707408", Type = ContentType.TvSeries, Title = "Narcos", Popularity = 87 },
        new() { Id = "tt1399103", Type = ContentType.TvSeries, Title = "Cosmos: A Space-Time Odyssey", Popularity = 86 }
    };

    private static readonly List<string> _hardcodedPopularQueries = new()
    {
        "Marvel", "Star Wars", "Harry Potter", "DC Comics", "Game of Thrones",
        "Breaking Bad", "Stranger Things", "The Office", "Friends", "Batman",
        "Spider-Man", "Avengers", "Lord of the Rings", "Fast and Furious", "John Wick",
        "Mission Impossible", "James Bond", "Jurassic Park", "Star Trek", "Disney",
        "Pixar", "Netflix Original", "HBO Max", "Amazon Prime", "Apple TV+",
        "Action Movies", "Comedy Movies", "Drama Series", "Sci-Fi", "Horror",
        "Romance", "Thriller", "Documentary", "Anime", "K-Drama",
        "True Crime", "Mystery", "Adventure", "Fantasy", "Biography",
        "Crime", "Family", "History", "Music", "War Movies",
        "Western", "Sport", "Musical", "Superhero", "Zombie"
    };

    public PopularContentService(
        ILogger<PopularContentService> logger,
        ICacheService cacheService,
        ICacheKeyService cacheKeyService)
    {
        _logger = logger;
        _cacheService = cacheService;
        _cacheKeyService = cacheKeyService;
    }

    public async Task<List<PopularContent>> GetPopularContentAsync(int limit = 100)
    {
        try
        {
            var cacheKey = _cacheKeyService.GenerateConfigurationKey("popular_content");
            var cached = await _cacheService.GetAsync<List<PopularContent>>(cacheKey);
            
            if (cached != null)
            {
                return cached.Take(limit).ToList();
            }

            // In production, this would query analytics data
            // For now, return hardcoded popular content
            var popularContent = _hardcodedPopularContent
                .OrderByDescending(c => c.Popularity)
                .Take(limit)
                .ToList();

            // Cache for 6 hours
            await _cacheService.SetAsync(cacheKey, popularContent, TimeSpan.FromHours(6));

            _logger.LogDebug("Retrieved {Count} popular content items", popularContent.Count);
            return popularContent;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get popular content");
            return new List<PopularContent>();
        }
    }

    public async Task<List<string>> GetPopularSearchQueriesAsync(int limit = 50)
    {
        try
        {
            var cacheKey = _cacheKeyService.GenerateConfigurationKey("popular_queries");
            var cached = await _cacheService.GetAsync<List<string>>(cacheKey);
            
            if (cached != null)
            {
                return cached.Take(limit).ToList();
            }

            // In production, this would query analytics data
            // For now, return hardcoded popular queries
            var popularQueries = _hardcodedPopularQueries.Take(limit).ToList();

            // Cache for 12 hours
            await _cacheService.SetAsync(cacheKey, popularQueries, TimeSpan.FromHours(12));

            _logger.LogDebug("Retrieved {Count} popular search queries", popularQueries.Count);
            return popularQueries;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get popular search queries");
            return new List<string>();
        }
    }

    public async Task TrackContentRequestAsync(string contentId, ContentType contentType, string title)
    {
        try
        {
            // In production, this would track to analytics system
            _logger.LogDebug("Content request tracked: {ContentId} ({ContentType}) - {Title}", 
                contentId, contentType, title);
            
            await Task.CompletedTask;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to track content request for {ContentId}", contentId);
        }
    }

    public async Task TrackSearchQueryAsync(string query)
    {
        try
        {
            // In production, this would track to analytics system
            _logger.LogDebug("Search query tracked: {Query}", query);
            
            await Task.CompletedTask;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to track search query: {Query}", query);
        }
    }

    public async Task<List<PopularContent>> GetTrendingContentAsync(int limit = 50)
    {
        try
        {
            var cacheKey = _cacheKeyService.GenerateConfigurationKey("trending_content");
            var cached = await _cacheService.GetAsync<List<PopularContent>>(cacheKey);
            
            if (cached != null)
            {
                return cached.Take(limit).ToList();
            }

            // Return subset of popular content as trending
            var trending = _hardcodedPopularContent
                .OrderByDescending(c => c.Popularity)
                .Take(limit)
                .Select(c => new PopularContent
                {
                    Id = c.Id,
                    Type = c.Type,
                    Title = c.Title,
                    Popularity = Math.Max(80, c.Popularity - 5), // Slightly lower popularity for trending
                    LastRequested = DateTime.UtcNow.AddHours(-Random.Shared.Next(1, 24))
                })
                .ToList();

            // Cache for 2 hours - trending changes more frequently
            await _cacheService.SetAsync(cacheKey, trending, TimeSpan.FromHours(2));

            _logger.LogDebug("Retrieved {Count} trending content items", trending.Count);
            return trending;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get trending content");
            return new List<PopularContent>();
        }
    }

    public async Task<List<string>> GetTrendingSearchQueriesAsync(int limit = 25)
    {
        try
        {
            var cacheKey = _cacheKeyService.GenerateConfigurationKey("trending_queries");
            var cached = await _cacheService.GetAsync<List<string>>(cacheKey);
            
            if (cached != null)
            {
                return cached.Take(limit).ToList();
            }

            // Return subset of popular queries as trending
            var trending = _hardcodedPopularQueries
                .OrderBy(_ => Random.Shared.Next()) // Randomize for variety
                .Take(limit)
                .ToList();

            // Cache for 1 hour - trending changes frequently
            await _cacheService.SetAsync(cacheKey, trending, TimeSpan.FromHours(1));

            _logger.LogDebug("Retrieved {Count} trending search queries", trending.Count);
            return trending;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get trending search queries");
            return new List<string>();
        }
    }
}