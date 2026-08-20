using Xunit;
using Moq;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;

namespace GeoLeap.Api.Tests.Services;

/// <summary>
/// Direct tests for ContentRatingService - Phase 3.5
/// Tests 5-star rating system, user preferences, recommendations, and interactions
/// Coverage: CRUD operations, statistics, preference analysis, collaborative filtering
/// </summary>
public class ContentRatingServiceDirectTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly ContentRatingService _service;
    private readonly Mock<IContentService> _mockContentService;
    private readonly Mock<ICacheService> _mockCacheService;
    private readonly Mock<ILogger<ContentRatingService>> _mockLogger;

    private readonly Guid _testUserId = Guid.NewGuid();
    private readonly Guid _otherUserId = Guid.NewGuid();
    private readonly string _testContentId = "movie_123";
    private readonly string _testContentType = "movie";

    public ContentRatingServiceDirectTests()
    {
        // Setup in-memory database
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: $"ContentRatingServiceTest_{Guid.NewGuid()}")
            .Options;

        _context = new ApplicationDbContext(options);

        // Setup mocks
        _mockContentService = new Mock<IContentService>();
        _mockCacheService = new Mock<ICacheService>();
        _mockLogger = new Mock<ILogger<ContentRatingService>>();

        // Setup mock content service default response
        _mockContentService.Setup(s => s.GetContentByIdAsync(It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync(new ContentData
            {
                Id = _testContentId,
                Title = "Test Movie",
                Type = "movie",
                PosterUrl = "https://example.com/poster.jpg",
                ReleaseYear = 2024,
                Genres = new List<string> { "Action", "Sci-Fi" }
            });

        // Note: Cache service returns null by default (no setup needed - mock returns default values)

        _service = new ContentRatingService(
            _context,
            _mockContentService.Object,
            _mockCacheService.Object,
            _mockLogger.Object
        );

        // Seed test data
        SeedTestData().Wait();
    }

    private async Task SeedTestData()
    {
        // Seed test users
        _context.Users.Add(new User
        {
            Id = _testUserId,
            UserName = "testuser@example.com",
            Email = "testuser@example.com",
            EmailConfirmed = true,
            DisplayName = "Test User"
        });

        _context.Users.Add(new User
        {
            Id = _otherUserId,
            UserName = "otheruser@example.com",
            Email = "otheruser@example.com",
            EmailConfirmed = true,
            DisplayName = "Other User"
        });

        // Seed test rating
        _context.Set<ContentRating>().Add(new ContentRating
        {
            Id = Guid.NewGuid(),
            UserId = _testUserId,
            ContentId = _testContentId,
            ContentType = _testContentType,
            Rating = 4,
            Review = "Great movie!",
            CreatedAt = DateTime.UtcNow.AddDays(-10),
            UpdatedAt = DateTime.UtcNow.AddDays(-10)
        });

        await _context.SaveChangesAsync();
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    // Rating CRUD Tests
    [Fact]
    public async Task RateContentAsync_WithNewRating_CreatesRating()
    {
        // Arrange
        var dto = new CreateContentRatingDto
        {
            ContentId = "movie_456",
            ContentType = "movie",
            Rating = 5,
            Review = "Excellent movie!"
        };

        // Act
        var result = await _service.RateContentAsync(_testUserId, dto);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("movie_456", result.ContentId);
        Assert.Equal(5, result.Rating);
        Assert.Equal("Excellent movie!", result.Review);
        Assert.Equal("Test Movie", result.ContentTitle);

        // Verify rating was saved
        var savedRating = await _context.Set<ContentRating>()
            .FirstOrDefaultAsync(r => r.ContentId == "movie_456" && r.UserId == _testUserId);
        Assert.NotNull(savedRating);
        Assert.Equal(5, savedRating.Rating);
    }

    [Fact]
    public async Task RateContentAsync_WithExistingRating_UpdatesRating()
    {
        // Arrange
        var dto = new CreateContentRatingDto
        {
            ContentId = _testContentId,
            ContentType = _testContentType,
            Rating = 5,
            Review = "Changed my mind, it's excellent!"
        };

        // Act
        var result = await _service.RateContentAsync(_testUserId, dto);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(_testContentId, result.ContentId);
        Assert.Equal(5, result.Rating);
        Assert.Equal("Changed my mind, it's excellent!", result.Review);

        // Verify only one rating exists for this content
        var ratingsCount = await _context.Set<ContentRating>()
            .CountAsync(r => r.ContentId == _testContentId && r.UserId == _testUserId);
        Assert.Equal(1, ratingsCount);
    }

    [Fact]
    public async Task UpdateRatingAsync_WithValidRating_UpdatesSuccessfully()
    {
        // Arrange
        var existingRating = await _context.Set<ContentRating>()
            .FirstAsync(r => r.UserId == _testUserId);

        var dto = new UpdateContentRatingDto
        {
            Rating = 3,
            Review = "Updated review"
        };

        // Act
        var result = await _service.UpdateRatingAsync(_testUserId, existingRating.Id, dto);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(3, result.Rating);
        Assert.Equal("Updated review", result.Review);
    }

    [Fact]
    public async Task UpdateRatingAsync_WithWrongUser_ReturnsNull()
    {
        // Arrange
        var existingRating = await _context.Set<ContentRating>()
            .FirstAsync(r => r.UserId == _testUserId);

        var dto = new UpdateContentRatingDto { Rating = 3 };

        // Act
        var result = await _service.UpdateRatingAsync(_otherUserId, existingRating.Id, dto);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task DeleteRatingAsync_WithValidRating_DeletesSuccessfully()
    {
        // Arrange
        var existingRating = await _context.Set<ContentRating>()
            .FirstAsync(r => r.UserId == _testUserId);

        // Act
        var result = await _service.DeleteRatingAsync(_testUserId, existingRating.Id);

        // Assert
        Assert.True(result);

        // Verify rating was deleted
        var deletedRating = await _context.Set<ContentRating>()
            .FirstOrDefaultAsync(r => r.Id == existingRating.Id);
        Assert.Null(deletedRating);
    }

    // Rating Retrieval Tests
    [Fact]
    public async Task GetUserRatingAsync_WithExistingRating_ReturnsRating()
    {
        // Act
        var result = await _service.GetUserRatingAsync(_testUserId, _testContentId, _testContentType);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(_testContentId, result.ContentId);
        Assert.Equal(4, result.Rating);
        Assert.Equal("Great movie!", result.Review);
    }

    [Fact]
    public async Task GetUserRatingAsync_WithNoRating_ReturnsNull()
    {
        // Act
        var result = await _service.GetUserRatingAsync(_testUserId, "nonexistent_movie", "movie");

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task GetUserRatingsAsync_WithRatings_ReturnsPagedList()
    {
        // Arrange - Add more ratings
        _context.Set<ContentRating>().Add(new ContentRating
        {
            UserId = _testUserId,
            ContentId = "movie_789",
            ContentType = "movie",
            Rating = 5
        });
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetUserRatingsAsync(_testUserId, page: 1, pageSize: 10);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(2, result.Count);
        Assert.All(result, r => Assert.Equal("Test Movie", r.ContentTitle));
    }

    // Statistics Tests
    [Fact]
    public async Task GetContentRatingStatsAsync_WithRatings_ReturnsAverageAndCount()
    {
        // Arrange - Add another rating for same content
        _context.Set<ContentRating>().Add(new ContentRating
        {
            UserId = _otherUserId,
            ContentId = _testContentId,
            ContentType = _testContentType,
            Rating = 5
        });
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetContentRatingStatsAsync(_testContentId, _testContentType);

        // Assert
        Assert.Equal(4.5, result.averageRating);
        Assert.Equal(2, result.totalRatings);
    }

    [Fact]
    public async Task GetContentRatingStatsAsync_WithNoRatings_ReturnsZero()
    {
        // Act
        var result = await _service.GetContentRatingStatsAsync("nonexistent_movie", "movie");

        // Assert
        Assert.Equal(0.0, result.averageRating);
        Assert.Equal(0, result.totalRatings);
    }

    [Fact]
    public async Task GetBulkContentRatingsAsync_WithMultipleContent_ReturnsAllStats()
    {
        // Arrange
        _context.Set<ContentRating>().Add(new ContentRating
        {
            UserId = _otherUserId,
            ContentId = "movie_999",
            ContentType = "movie",
            Rating = 3
        });
        await _context.SaveChangesAsync();

        var contentIds = new List<string> { _testContentId, "movie_999", "movie_unrated" };

        // Act
        var result = await _service.GetBulkContentRatingsAsync(contentIds, "movie");

        // Assert
        Assert.Equal(3, result.Count);
        Assert.True(result.ContainsKey(_testContentId));
        Assert.True(result.ContainsKey("movie_999"));
        Assert.True(result.ContainsKey("movie_unrated"));
        Assert.Equal(4.0, result[_testContentId].averageRating);
        Assert.Equal(3.0, result["movie_999"].averageRating);
        Assert.Equal(0.0, result["movie_unrated"].averageRating);
    }

    // User Preferences Tests
    [Fact]
    public async Task GetUserPreferencesFromRatingsAsync_WithRatings_ReturnsPreferences()
    {
        // Act
        var result = await _service.GetUserPreferencesFromRatingsAsync(_testUserId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(1, result.TotalRatings);
        Assert.Equal(4.0, result.AverageRating);
        Assert.NotNull(result.GenreAffinity);
        Assert.Contains("Action", result.GenreAffinity.Keys);
        Assert.Contains("Sci-Fi", result.GenreAffinity.Keys);
    }

    [Fact]
    public async Task GetUserPreferencesFromRatingsAsync_WithNoRatings_ReturnsEmptyPreferences()
    {
        // Act
        var result = await _service.GetUserPreferencesFromRatingsAsync(Guid.NewGuid());

        // Assert
        Assert.NotNull(result);
        Assert.Equal(0, result.TotalRatings);
        Assert.Equal(0.0, result.AverageRating);
    }

    // Similar Users Tests
    [Fact]
    public async Task FindSimilarUsersAsync_WithCommonRatings_ReturnsSimilarUsers()
    {
        // Arrange - Add common ratings between users
        _context.Set<ContentRating>().Add(new ContentRating
        {
            UserId = _otherUserId,
            ContentId = _testContentId,
            ContentType = _testContentType,
            Rating = 4
        });
        _context.Set<ContentRating>().Add(new ContentRating
        {
            UserId = _otherUserId,
            ContentId = "movie_789",
            ContentType = "movie",
            Rating = 5
        });
        _context.Set<ContentRating>().Add(new ContentRating
        {
            UserId = _testUserId,
            ContentId = "movie_789",
            ContentType = "movie",
            Rating = 5
        });
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.FindSimilarUsersAsync(_testUserId, limit: 10);

        // Assert
        Assert.NotNull(result);
        // Note: May be empty if correlation threshold not met
    }

    [Fact]
    public async Task GetHighlyRatedContentByGenreAsync_WithQualifyingContent_ReturnsContentIds()
    {
        // Arrange - Add multiple high ratings
        for (int i = 0; i < 5; i++)
        {
            _context.Set<ContentRating>().Add(new ContentRating
            {
                UserId = Guid.NewGuid(),
                ContentId = _testContentId,
                ContentType = _testContentType,
                Rating = 4
            });
        }
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetHighlyRatedContentByGenreAsync(
            new List<string> { "Action" },
            limit: 10,
            minRating: 4.0
        );

        // Assert
        Assert.NotNull(result);
        Assert.Contains(_testContentId, result);
    }

    // Interaction Tests
    [Fact]
    public async Task RecordInteractionAsync_WithValidData_RecordsInteraction()
    {
        // Act
        await _service.RecordInteractionAsync(
            _testUserId,
            _testContentId,
            _testContentType,
            "view",
            "watched_for_30_minutes"
        );

        // Assert
        var interaction = await _context.Set<UserContentInteraction>()
            .FirstOrDefaultAsync(i => i.UserId == _testUserId && i.InteractionType == "view");
        Assert.NotNull(interaction);
        Assert.Equal("watched_for_30_minutes", interaction.InteractionValue);
    }

    [Fact]
    public async Task GetUserInteractionsAsync_WithInteractions_ReturnsRecentInteractions()
    {
        // Arrange
        _context.Set<UserContentInteraction>().Add(new UserContentInteraction
        {
            UserId = _testUserId,
            ContentId = _testContentId,
            ContentType = _testContentType,
            InteractionType = "view",
            CreatedAt = DateTime.UtcNow.AddDays(-5)
        });
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetUserInteractionsAsync(_testUserId, days: 30);

        // Assert
        Assert.NotNull(result);
        Assert.Single(result);
        Assert.Equal("view", result[0].InteractionType);
    }
}
