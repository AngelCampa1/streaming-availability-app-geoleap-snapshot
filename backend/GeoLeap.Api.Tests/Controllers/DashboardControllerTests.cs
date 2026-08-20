using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using System.Security.Claims;
using GeoLeap.Api.Controllers;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;

namespace GeoLeap.Api.Tests.Controllers;

public class DashboardControllerTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly Mock<ILogger<DashboardController>> _mockLogger;
    private readonly Mock<ITmdbClient> _mockTmdbClient;
    private readonly Mock<IImageService> _mockImageService;
    private readonly DashboardController _controller;
    private readonly Guid _testUserId = Guid.NewGuid();

    public DashboardControllerTests()
    {
        // Setup in-memory database
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
            .Options;

        _context = new ApplicationDbContext(options);
        _mockLogger = new Mock<ILogger<DashboardController>>();
        _mockTmdbClient = new Mock<ITmdbClient>();
        _mockImageService = new Mock<IImageService>();

        // Setup ImageService mock to return constructed URLs
        _mockImageService.Setup(x => x.ConstructTmdbUrl(It.IsAny<string>(), It.IsAny<ImageSize>()))
            .Returns<string?, ImageSize>((path, size) =>
            {
                if (string.IsNullOrWhiteSpace(path)) return string.Empty;
                if (path.StartsWith("http")) return path; // Already absolute
                if (path.StartsWith("/")) return $"https://image.tmdb.org/t/p/w500{path}"; // Construct full URL
                return string.Empty;
            });

        _controller = new DashboardController(_mockLogger.Object, _context, _mockTmdbClient.Object, _mockImageService.Object);

        // Setup user claims
        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, _testUserId.ToString())
        };
        var identity = new ClaimsIdentity(claims, "TestAuthType");
        var claimsPrincipal = new ClaimsPrincipal(identity);

        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = claimsPrincipal }
        };
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    [Fact]
    public async Task GetStatsAsync_ReturnsActualSearchCount_FromSearchHistory()
    {
        // Arrange - Seed search history
        var searchHistory = new List<SearchHistory>
        {
            new SearchHistory { UserId = _testUserId, Query = "Inception", SearchedAt = DateTime.UtcNow.AddDays(-1), ResultCount = 5 },
            new SearchHistory { UserId = _testUserId, Query = "The Matrix", SearchedAt = DateTime.UtcNow.AddDays(-2), ResultCount = 3 },
            new SearchHistory { UserId = _testUserId, Query = "Interstellar", SearchedAt = DateTime.UtcNow.AddDays(-3), ResultCount = 7 }
        };

        await _context.SearchHistories.AddRangeAsync(searchHistory);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetStatsAsync();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var stats = Assert.IsType<DashboardStats>(okResult.Value);
        Assert.Equal(3, stats.TotalSearches); // Should return actual count, not hardcoded 42
    }

    [Fact]
    public async Task GetStatsAsync_ReturnsActualWatchlistCount_FromWatchlistItems()
    {
        // Arrange - Seed watchlist data
        var watchlist = new Watchlist
        {
            Id = Guid.NewGuid(),
            UserId = _testUserId,
            Name = "My Watchlist",
            IsActive = true
        };

        var watchlistItems = new List<WatchlistItem>
        {
            new WatchlistItem { Id = Guid.NewGuid(), WatchlistId = watchlist.Id, Title = "Inception", ContentType = "Movie", ContentId = "tmdb:27205", AddedAt = DateTime.UtcNow },
            new WatchlistItem { Id = Guid.NewGuid(), WatchlistId = watchlist.Id, Title = "Breaking Bad", ContentType = "TvSeries", ContentId = "tmdb:1396", AddedAt = DateTime.UtcNow },
            new WatchlistItem { Id = Guid.NewGuid(), WatchlistId = watchlist.Id, Title = "The Matrix", ContentType = "Movie", ContentId = "tmdb:603", AddedAt = DateTime.UtcNow },
            new WatchlistItem { Id = Guid.NewGuid(), WatchlistId = watchlist.Id, Title = "Game of Thrones", ContentType = "TvSeries", ContentId = "tmdb:1399", AddedAt = DateTime.UtcNow },
            new WatchlistItem { Id = Guid.NewGuid(), WatchlistId = watchlist.Id, Title = "Interstellar", ContentType = "Movie", ContentId = "tmdb:157336", AddedAt = DateTime.UtcNow }
        };

        await _context.Watchlists.AddAsync(watchlist);
        await _context.WatchlistItems.AddRangeAsync(watchlistItems);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetStatsAsync();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var stats = Assert.IsType<DashboardStats>(okResult.Value);
        Assert.Equal(5, stats.WatchlistItems); // Should return actual count, not hardcoded 8
    }

    [Fact]
    public async Task GetStatsAsync_ReturnsCorrectSearchesThisMonth_FilteredByDate()
    {
        // Arrange - Seed search history with dates in current month and previous months
        var firstDayOfMonth = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);

        var searchHistory = new List<SearchHistory>
        {
            new SearchHistory { UserId = _testUserId, Query = "Recent 1", SearchedAt = DateTime.UtcNow.AddDays(-1), ResultCount = 5 },
            new SearchHistory { UserId = _testUserId, Query = "Recent 2", SearchedAt = DateTime.UtcNow.AddDays(-5), ResultCount = 3 },
            new SearchHistory { UserId = _testUserId, Query = "Recent 3", SearchedAt = firstDayOfMonth.AddDays(2), ResultCount = 2 },
            new SearchHistory { UserId = _testUserId, Query = "Old 1", SearchedAt = firstDayOfMonth.AddDays(-10), ResultCount = 7 }, // Previous month
            new SearchHistory { UserId = _testUserId, Query = "Old 2", SearchedAt = firstDayOfMonth.AddDays(-30), ResultCount = 4 } // Two months ago
        };

        await _context.SearchHistories.AddRangeAsync(searchHistory);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetStatsAsync();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var stats = Assert.IsType<DashboardStats>(okResult.Value);
        Assert.Equal(3, stats.SearchesThisMonth); // Should only count searches from current month
        Assert.Equal(5, stats.TotalSearches); // Total should include all searches
    }

    [Fact]
    public async Task GetStatsAsync_ReturnsZeroCounts_WhenUserHasNoData()
    {
        // Arrange - No data seeded for this user

        // Act
        var result = await _controller.GetStatsAsync();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var stats = Assert.IsType<DashboardStats>(okResult.Value);
        Assert.Equal(0, stats.TotalSearches);
        Assert.Equal(0, stats.WatchlistItems);
        Assert.Equal(0, stats.SearchesThisMonth);
        Assert.Null(stats.LastSearchDate); // Should be null when no searches exist
    }

    [Fact]
    public async Task GetSavedContentAsync_ReturnsRealWatchlistItems()
    {
        // Arrange
        var watchlist = new Watchlist
        {
            Id = Guid.NewGuid(),
            UserId = _testUserId,
            Name = "My Watchlist",
            IsActive = true
        };

        var watchlistItems = new List<WatchlistItem>
        {
            new WatchlistItem
            {
                Id = Guid.NewGuid(),
                WatchlistId = watchlist.Id,
                Title = "Real Movie 1",
                ContentType = "Movie",
                ContentId = "tmdb:10001",
                ReleaseYear = 2020,
                PosterUrl = "https://image.tmdb.org/t/p/w500/abc123.jpg",
                AddedAt = DateTime.UtcNow.AddDays(-1)
            },
            new WatchlistItem
            {
                Id = Guid.NewGuid(),
                WatchlistId = watchlist.Id,
                Title = "Real TV Show 1",
                ContentType = "TvSeries",
                ContentId = "tmdb:10002",
                ReleaseYear = 2021,
                PosterUrl = "https://image.tmdb.org/t/p/w500/def456.jpg",
                AddedAt = DateTime.UtcNow.AddDays(-2)
            }
        };

        await _context.Watchlists.AddAsync(watchlist);
        await _context.WatchlistItems.AddRangeAsync(watchlistItems);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetSavedContentAsync(limit: 10);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var content = Assert.IsType<List<SavedContentItem>>(okResult.Value);
        Assert.Equal(2, content.Count);
        Assert.Contains(content, c => c.Title == "Real Movie 1"); // Should NOT return "The Matrix" (mock data)
        Assert.Contains(content, c => c.Title == "Real TV Show 1"); // Should NOT return "Game of Thrones" (mock data)
    }

    [Fact]
    public async Task GetSavedContentAsync_RespectsLimitParameter()
    {
        // Arrange
        var watchlist = new Watchlist
        {
            Id = Guid.NewGuid(),
            UserId = _testUserId,
            Name = "My Watchlist",
            IsActive = true
        };

        var watchlistItems = Enumerable.Range(1, 10).Select(i => new WatchlistItem
        {
            Id = Guid.NewGuid(),
            WatchlistId = watchlist.Id,
            Title = $"Movie {i}",
            ContentType = "Movie",
            ContentId = $"tmdb:{20000 + i}",
            AddedAt = DateTime.UtcNow.AddDays(-i)
        }).ToList();

        await _context.Watchlists.AddAsync(watchlist);
        await _context.WatchlistItems.AddRangeAsync(watchlistItems);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetSavedContentAsync(limit: 5);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var content = Assert.IsType<List<SavedContentItem>>(okResult.Value);
        Assert.Equal(5, content.Count); // Should respect limit parameter
    }

    [Fact]
    public async Task GetSavedContentAsync_OrdersByMostRecentlyAdded()
    {
        // Arrange
        var watchlist = new Watchlist
        {
            Id = Guid.NewGuid(),
            UserId = _testUserId,
            Name = "My Watchlist",
            IsActive = true
        };

        var watchlistItems = new List<WatchlistItem>
        {
            new WatchlistItem { Id = Guid.NewGuid(), WatchlistId = watchlist.Id, Title = "Oldest", ContentType = "Movie", ContentId = "tmdb:30001", AddedAt = DateTime.UtcNow.AddDays(-10) },
            new WatchlistItem { Id = Guid.NewGuid(), WatchlistId = watchlist.Id, Title = "Newest", ContentType = "Movie", ContentId = "tmdb:30002", AddedAt = DateTime.UtcNow },
            new WatchlistItem { Id = Guid.NewGuid(), WatchlistId = watchlist.Id, Title = "Middle", ContentType = "Movie", ContentId = "tmdb:30003", AddedAt = DateTime.UtcNow.AddDays(-5) }
        };

        await _context.Watchlists.AddAsync(watchlist);
        await _context.WatchlistItems.AddRangeAsync(watchlistItems);
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetSavedContentAsync();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var content = Assert.IsType<List<SavedContentItem>>(okResult.Value);
        Assert.Equal("Newest", content[0].Title); // Most recently added should be first
        Assert.Equal("Middle", content[1].Title);
        Assert.Equal("Oldest", content[2].Title);
    }

    [Fact]
    public async Task GetSavedContentAsync_ReturnsEmptyArray_WhenNoWatchlistItems()
    {
        // Arrange - No watchlist items for this user

        // Act
        var result = await _controller.GetSavedContentAsync();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var content = Assert.IsType<List<SavedContentItem>>(okResult.Value);
        Assert.Empty(content); // Should return empty array, not mock data
    }

    [Fact]
    public async Task GetTrendingAsync_FetchesFromTmdb_ReturnsContentList()
    {
        // Arrange - Mock TMDB client to return trending content
        var mockMovies = new List<ContentMetadata>
        {
            new ContentMetadata
            {
                TmdbId = 12345,
                Title = "Trending Movie 1",
                Type = TmdbContentType.Movie,
                PosterPath = "/poster1.jpg",
                ReleaseDate = DateTime.Parse("2023-01-01"),
                Popularity = 95.5
            }
        };

        var mockTvShows = new List<ContentMetadata>
        {
            new ContentMetadata
            {
                TmdbId = 67890,
                Title = "Trending TV 1",
                Type = TmdbContentType.TvSeries,
                PosterPath = "/poster2.jpg",
                ReleaseDate = DateTime.Parse("2023-02-01"),
                Popularity = 88.3
            }
        };

        _mockTmdbClient.Setup(x => x.GetPopularMoviesAsync(1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(mockMovies);
        _mockTmdbClient.Setup(x => x.GetPopularTvShowsAsync(1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(mockTvShows);

        // Act
        var result = await _controller.GetTrendingAsync();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var content = Assert.IsType<List<TrendingContentItem>>(okResult.Value);
        Assert.Equal(2, content.Count);
        Assert.Contains(content, c => c.Title == "Trending Movie 1"); // Should NOT return "Wednesday" (mock data)
        Assert.Contains(content, c => c.Title == "Trending TV 1");
    }

    [Fact]
    public async Task GetTrendingAsync_RespectsLimitParameter()
    {
        // Arrange
        var mockMovies = Enumerable.Range(1, 10).Select(i => new ContentMetadata
        {
            TmdbId = i,
            Title = $"Movie {i}",
            Type = TmdbContentType.Movie,
            Popularity = 90.0 - i
        }).ToList();

        var mockTvShows = new List<ContentMetadata>();

        _mockTmdbClient.Setup(x => x.GetPopularMoviesAsync(1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(mockMovies);
        _mockTmdbClient.Setup(x => x.GetPopularTvShowsAsync(1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(mockTvShows);

        // Act
        var result = await _controller.GetTrendingAsync(limit: 5);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var content = Assert.IsType<List<TrendingContentItem>>(okResult.Value);
        Assert.Equal(5, content.Count); // Should respect limit
    }

    [Fact]
    public async Task GetTrendingAsync_HandlesTmdbFailure_ReturnsEmptyList()
    {
        // Arrange - Mock TMDB client to throw exception
        _mockTmdbClient.Setup(x => x.GetPopularMoviesAsync(1, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("TMDB API unavailable"));
        _mockTmdbClient.Setup(x => x.GetPopularTvShowsAsync(1, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("TMDB API unavailable"));

        // Act
        var result = await _controller.GetTrendingAsync();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var content = Assert.IsType<List<TrendingContentItem>>(okResult.Value);
        Assert.Empty(content); // Should return empty list on error, not throw exception
    }

    // ============================================================
    // B3: StreamingServicesConnected — real DB count (not hardcoded 0)
    // ============================================================

    [Fact]
    public async Task GetStatsAsync_ReturnsActualStreamingServicesCount_FromUserStreamingServices()
    {
        // Arrange — seed 2 active + 1 inactive UserStreamingService for the test user
        var streamingService1 = new GeoLeap.Api.Models.StreamingService { Id = Guid.NewGuid(), Name = "Netflix" };
        var streamingService2 = new GeoLeap.Api.Models.StreamingService { Id = Guid.NewGuid(), Name = "Hulu" };
        var streamingService3 = new GeoLeap.Api.Models.StreamingService { Id = Guid.NewGuid(), Name = "Disney+" };
        _context.StreamingServices.AddRange(streamingService1, streamingService2, streamingService3);
        await _context.SaveChangesAsync();

        _context.UserStreamingServices.AddRange(
            new UserStreamingService { Id = Guid.NewGuid(), UserId = _testUserId, StreamingServiceId = streamingService1.Id, IsActive = true },
            new UserStreamingService { Id = Guid.NewGuid(), UserId = _testUserId, StreamingServiceId = streamingService2.Id, IsActive = true },
            new UserStreamingService { Id = Guid.NewGuid(), UserId = _testUserId, StreamingServiceId = streamingService3.Id, IsActive = false } // inactive
        );
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetStatsAsync();

        // Assert — only 2 active services counted
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var stats = Assert.IsType<DashboardStats>(okResult.Value);
        Assert.Equal(2, stats.StreamingServicesConnected);
    }

    [Fact]
    public async Task GetStatsAsync_WhenNoStreamingServicesConnected_ReturnsZero()
    {
        // Arrange — no UserStreamingService rows for the test user
        // Act
        var result = await _controller.GetStatsAsync();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var stats = Assert.IsType<DashboardStats>(okResult.Value);
        Assert.Equal(0, stats.StreamingServicesConnected);
    }

    // ============================================================
    // B4: AvailableOn — parsed from StreamingServices JSON column
    // ============================================================

    [Fact]
    public async Task GetSavedContentAsync_ParsesStreamingServicesJson_FromWatchlistItem()
    {
        // Arrange
        var watchlist = new Watchlist
        {
            Id = Guid.NewGuid(),
            UserId = _testUserId,
            Name = "Test Watchlist",
            IsActive = true
        };
        _context.Watchlists.Add(watchlist);
        await _context.SaveChangesAsync();

        var watchlistItem = new WatchlistItem
        {
            Id = Guid.NewGuid(),
            WatchlistId = watchlist.Id,
            Title = "The Crown",
            ContentType = "TvSeries",
            ContentId = "tmdb:65494",
            AddedAt = DateTime.UtcNow,
            StreamingServices = "[\"Netflix\",\"Amazon Prime\"]"
        };
        _context.WatchlistItems.Add(watchlistItem);
        await _context.SaveChangesAsync();

        _mockImageService.Setup(x => x.ConstructTmdbUrl(It.IsAny<string>(), It.IsAny<ImageSize>()))
            .Returns(string.Empty);

        // Act
        var result = await _controller.GetSavedContentAsync(limit: 10);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var items = Assert.IsType<List<SavedContentItem>>(okResult.Value);
        var item = Assert.Single(items);
        Assert.Equal(2, item.AvailableOn.Length);
        Assert.Contains("Netflix", item.AvailableOn);
        Assert.Contains("Amazon Prime", item.AvailableOn);
    }

    [Fact]
    public async Task GetSavedContentAsync_WhenStreamingServicesIsNull_ReturnsEmptyAvailableOn()
    {
        // Arrange
        var watchlist = new Watchlist
        {
            Id = Guid.NewGuid(),
            UserId = _testUserId,
            Name = "Test Watchlist 2",
            IsActive = true
        };
        _context.Watchlists.Add(watchlist);
        await _context.SaveChangesAsync();

        var watchlistItem = new WatchlistItem
        {
            Id = Guid.NewGuid(),
            WatchlistId = watchlist.Id,
            Title = "Stranger Things",
            ContentType = "TvSeries",
            ContentId = "tmdb:66732",
            AddedAt = DateTime.UtcNow,
            StreamingServices = null // no data stored
        };
        _context.WatchlistItems.Add(watchlistItem);
        await _context.SaveChangesAsync();

        _mockImageService.Setup(x => x.ConstructTmdbUrl(It.IsAny<string>(), It.IsAny<ImageSize>()))
            .Returns(string.Empty);

        // Act
        var result = await _controller.GetSavedContentAsync(limit: 10);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var items = Assert.IsType<List<SavedContentItem>>(okResult.Value);
        var item = Assert.Single(items);
        Assert.Empty(item.AvailableOn);
    }
}
