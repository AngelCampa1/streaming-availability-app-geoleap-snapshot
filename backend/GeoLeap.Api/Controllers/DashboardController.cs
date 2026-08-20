using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using System.Security.Claims;
using System.Text.Json;

namespace GeoLeap.Api.Controllers;

/// <summary>
/// Controller for user dashboard data and statistics
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly ILogger<DashboardController> _logger;
    private readonly ApplicationDbContext _context;
    private readonly ITmdbClient _tmdbClient;
    private readonly IImageService _imageService;

    public DashboardController(
        ILogger<DashboardController> logger,
        ApplicationDbContext context,
        ITmdbClient tmdbClient,
        IImageService imageService)
    {
        _logger = logger;
        _context = context;
        _tmdbClient = tmdbClient;
        _imageService = imageService;
    }

    /// <summary>
    /// Get user dashboard statistics
    /// </summary>
    [HttpGet("stats")]
    [ProducesResponseType(typeof(DashboardStats), 200)]
    [ProducesResponseType(401)]
    [ProducesResponseType(500)]
    public async Task<ActionResult<DashboardStats>> GetStatsAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
            {
                // Return empty stats for anonymous users
                return Ok(new DashboardStats
                {
                    TotalSearches = 0,
                    SavedContent = 0,
                    WatchlistItems = 0,
                    StreamingServicesConnected = 0,
                    LastSearchDate = null,
                    AccountCreatedDate = DateTime.UtcNow,
                    SubscriptionTier = "Free",
                    SearchesThisMonth = 0,
                    SearchesRemaining = 10
                });
            }

            // Fetch real data from database
            var firstDayOfMonth = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);

            var totalSearches = await _context.SearchHistories
                .Where(sh => sh.UserId == userId)
                .CountAsync(cancellationToken);

            var searchesThisMonth = await _context.SearchHistories
                .Where(sh => sh.UserId == userId && sh.SearchedAt >= firstDayOfMonth)
                .CountAsync(cancellationToken);

            var watchlistItems = await _context.WatchlistItems
                .Where(wi => wi.Watchlist.UserId == userId && wi.Watchlist.IsActive)
                .CountAsync(cancellationToken);

            var lastSearchDate = await _context.SearchHistories
                .Where(sh => sh.UserId == userId)
                .OrderByDescending(sh => sh.SearchedAt)
                .Select(sh => (DateTime?)sh.SearchedAt)
                .FirstOrDefaultAsync(cancellationToken);

            var streamingServicesConnected = await _context.UserStreamingServices
                .CountAsync(s => s.UserId == userId && s.IsActive, cancellationToken);

            var user = await _context.Users.FindAsync(new object[] { userId }, cancellationToken);

            var stats = new DashboardStats
            {
                TotalSearches = totalSearches,
                SavedContent = watchlistItems, // Using watchlist items as saved content count
                WatchlistItems = watchlistItems,
                StreamingServicesConnected = streamingServicesConnected,
                LastSearchDate = lastSearchDate,
                AccountCreatedDate = user?.CreatedAt ?? DateTime.UtcNow,
                SubscriptionTier = user?.SubscriptionTier ?? "Free",
                SearchesThisMonth = searchesThisMonth,
                SearchesRemaining = user?.SubscriptionTier == "Premium" ? null : Math.Max(0, 10 - searchesThisMonth)
            };

            return Ok(stats);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting dashboard stats");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get user's recent searches
    /// </summary>
    [HttpGet("recent-searches")]
    [ProducesResponseType(typeof(List<SearchHistoryItem>), 200)]
    [ProducesResponseType(401)]
    [ProducesResponseType(500)]
    public async Task<ActionResult<List<SearchHistoryItem>>> GetRecentSearchesAsync(
        [FromQuery] int limit = 5,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
            {
                return Ok(new List<SearchHistoryItem>());
            }

            // Fetch actual search history from database
            var searches = await _context.SearchHistories
                .Where(sh => sh.UserId == userId)
                .OrderByDescending(sh => sh.SearchedAt)
                .Take(limit)
                .Select(sh => new SearchHistoryItem
                {
                    Id = sh.Id.ToString(),
                    Query = sh.Query,
                    SearchedAt = sh.SearchedAt,
                    ResultCount = sh.ResultCount,
                    ContentType = "All" // Default since we don't store content type in search history
                })
                .ToListAsync(cancellationToken);

            return Ok(searches);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting recent searches");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get user's saved/bookmarked content
    /// </summary>
    [HttpGet("saved-content")]
    [ProducesResponseType(typeof(List<SavedContentItem>), 200)]
    [ProducesResponseType(401)]
    [ProducesResponseType(500)]
    public async Task<ActionResult<List<SavedContentItem>>> GetSavedContentAsync(
        [FromQuery] int limit = 6,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var userIdString = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdString) || !Guid.TryParse(userIdString, out var userId))
            {
                return Ok(new List<SavedContentItem>());
            }

            // Fetch real data from watchlist
            var watchlistItems = await _context.WatchlistItems
                .Where(wi => wi.Watchlist.UserId == userId && wi.Watchlist.IsActive)
                .OrderByDescending(wi => wi.AddedAt)
                .Take(limit)
                .ToListAsync(cancellationToken);

            // Transform poster URLs to full TMDB URLs
            var content = watchlistItems.Select(wi => new SavedContentItem
            {
                Id = wi.Id.ToString(),
                Title = wi.Title,
                ContentType = wi.ContentType,
                Year = wi.ReleaseYear,
                PosterUrl = _imageService.ConstructTmdbUrl(wi.PosterUrl, ImageSize.W500),
                SavedAt = wi.AddedAt,
                AvailableOn = ParseStreamingServicesJson(wi.StreamingServices)
            }).ToList();

            return Ok(content);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting saved content");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get trending content recommendations
    /// </summary>
    [HttpGet("trending")]
    [ProducesResponseType(typeof(List<TrendingContentItem>), 200)]
    [ProducesResponseType(401)]
    [ProducesResponseType(500)]
    public async Task<ActionResult<List<TrendingContentItem>>> GetTrendingAsync(
        [FromQuery] int limit = 6,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // Fetch trending content from TMDB
            var movies = await _tmdbClient.GetPopularMoviesAsync(1, cancellationToken);
            var tvShows = await _tmdbClient.GetPopularTvShowsAsync(1, cancellationToken);

            // Combine and map to TrendingContentItem
            var allContent = movies.Concat(tvShows)
                .OrderByDescending(c => c.Popularity)
                .Take(limit)
                .Select(c => new TrendingContentItem
                {
                    Id = c.TmdbId.ToString(),
                    Title = c.Title ?? "Unknown",
                    ContentType = c.Type == TmdbContentType.Movie ? "Movie" : "TvSeries",
                    Year = c.ReleaseDate?.Year,
                    PosterUrl = _imageService.ConstructTmdbUrl(c.PosterPath, ImageSize.W500),
                    TrendingScore = (int)(c.Popularity ?? 0),
                    AvailableOn = Array.Empty<string>() // TODO: Add streaming availability later
                })
                .ToList();

            return Ok(allContent);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching trending content from TMDB");
            // Return empty list on error instead of throwing
            return Ok(new List<TrendingContentItem>());
        }
    }

    /// <summary>
    /// Parse a JSON array string (e.g. ["Netflix","Hulu"]) stored on a watchlist item
    /// into a string array. Returns an empty array when the value is null or invalid JSON.
    /// </summary>
    private static string[] ParseStreamingServicesJson(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return Array.Empty<string>();

        try
        {
            return JsonSerializer.Deserialize<string[]>(json) ?? Array.Empty<string>();
        }
        catch (JsonException)
        {
            return Array.Empty<string>();
        }
    }
}

// Dashboard DTOs
public class DashboardStats
{
    public int TotalSearches { get; set; }
    public int SavedContent { get; set; }
    public int WatchlistItems { get; set; }
    public int StreamingServicesConnected { get; set; }
    public DateTime? LastSearchDate { get; set; }
    public DateTime AccountCreatedDate { get; set; }
    public string SubscriptionTier { get; set; } = "Free";
    public int SearchesThisMonth { get; set; }
    public int? SearchesRemaining { get; set; } // null = unlimited
}

public class SearchHistoryItem
{
    public string Id { get; set; } = string.Empty;
    public string Query { get; set; } = string.Empty;
    public DateTime SearchedAt { get; set; }
    public int ResultCount { get; set; }
    public string? ContentType { get; set; }
}

public class SavedContentItem
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public int? Year { get; set; }
    public string? PosterUrl { get; set; }
    public DateTime SavedAt { get; set; }
    public string[] AvailableOn { get; set; } = Array.Empty<string>();
}

public class TrendingContentItem
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public int? Year { get; set; }
    public string? PosterUrl { get; set; }
    public int TrendingScore { get; set; }
    public string[] AvailableOn { get; set; } = Array.Empty<string>();
}
