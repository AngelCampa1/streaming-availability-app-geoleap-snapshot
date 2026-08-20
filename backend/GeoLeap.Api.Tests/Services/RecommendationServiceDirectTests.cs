using Xunit;
using Moq;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;

namespace GeoLeap.Api.Tests.Services;

/// <summary>
/// Direct tests for RecommendationService - Phase 3.3
/// Tests recommendation generation, settings management, and basic operations
/// Coverage: Settings CRUD, error handling, response structures
/// </summary>
public class RecommendationServiceDirectTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly RecommendationService _service;
    private readonly Mock<IContentService> _mockContentService;
    private readonly Mock<GeoLeap.Api.Services.IContentRatingService> _mockRatingService;
    private readonly Mock<ICacheService> _mockCacheService;
    private readonly Mock<ILogger<RecommendationService>> _mockLogger;

    private readonly Guid _testUserId = Guid.NewGuid();

    public RecommendationServiceDirectTests()
    {
        // Setup in-memory database
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: $"RecommendationServiceTest_{Guid.NewGuid()}")
            .Options;

        _context = new ApplicationDbContext(options);

        // Setup mocks
        _mockContentService = new Mock<IContentService>();
        _mockRatingService = new Mock<GeoLeap.Api.Services.IContentRatingService>();
        _mockCacheService = new Mock<ICacheService>();
        _mockLogger = new Mock<ILogger<RecommendationService>>();

        _service = new RecommendationService(
            _context,
            _mockContentService.Object,
            _mockRatingService.Object,
            _mockCacheService.Object,
            _mockLogger.Object
        );

        // Seed test data
        SeedTestData().Wait();
    }

    private async Task SeedTestData()
    {
        // Seed test user
        var testUser = new User
        {
            Id = _testUserId,
            UserName = "testuser@example.com",
            Email = "testuser@example.com",
            EmailConfirmed = true
        };
        _context.Users.Add(testUser);

        // Seed recommendation settings
        var settings = new RecommendationSettings
        {
            Id = Guid.NewGuid(),
            UserId = _testUserId,
            EnableRecommendations = true,
            UseCollaborativeFiltering = true,
            UseContentBasedFiltering = true,
            IncludeAdultContent = false,
            MinimumRating = 6.0m,
            PreferredLanguages = "en,es",
            ExcludedGenres = "Horror",
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
        _context.RecommendationSettings.Add(settings);

        await _context.SaveChangesAsync();
    }

    public void Dispose()
    {
        _context?.Database.EnsureDeleted();
        _context?.Dispose();
    }

    // ============================================
    // Settings Management Tests (5 tests)
    // ============================================

    #region Settings Management

    [Fact]
    public async Task GetRecommendationSettingsAsync_WithExistingSettings_ReturnsSettings()
    {
        // Act
        var result = await _service.GetRecommendationSettingsAsync(_testUserId);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.EnableRecommendations);
        Assert.True(result.UseCollaborativeFiltering);
        Assert.True(result.UseContentBasedFiltering);
        Assert.Equal(6.0m, result.MinimumRating);
    }

    [Fact]
    public async Task GetRecommendationSettingsAsync_WithNoSettings_CreatesDefault()
    {
        // Arrange
        var newUserId = Guid.NewGuid();
        var newUser = new User
        {
            Id = newUserId,
            UserName = "newuser@example.com",
            Email = "newuser@example.com",
            EmailConfirmed = true
        };
        _context.Users.Add(newUser);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetRecommendationSettingsAsync(newUserId);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.EnableRecommendations); // Default is true
    }

    [Fact]
    public async Task UpdateRecommendationSettingsAsync_WithValidData_UpdatesSettings()
    {
        // Arrange
        var updateDto = new UpdateRecommendationSettingsDto
        {
            EnableRecommendations = false,
            UseCollaborativeFiltering = false,
            MinimumRating = 7.5m,
            PreferredLanguages = new List<string> { "en", "fr" }
        };

        // Act
        var result = await _service.UpdateRecommendationSettingsAsync(_testUserId, updateDto);

        // Assert
        Assert.NotNull(result);
        Assert.False(result.EnableRecommendations);
        Assert.False(result.UseCollaborativeFiltering);
        Assert.Equal(7.5m, result.MinimumRating);
        Assert.Equal(2, result.PreferredLanguages.Count);
        Assert.Contains("en", result.PreferredLanguages);
        Assert.Contains("fr", result.PreferredLanguages);

        // Verify database was updated
        var settings = await _context.RecommendationSettings.FirstOrDefaultAsync(s => s.UserId == _testUserId);
        Assert.NotNull(settings);
        Assert.False(settings.EnableRecommendations);
    }

    [Fact]
    public async Task UpdateRecommendationSettingsAsync_WithNewUser_CreatesSettings()
    {
        // Arrange
        var newUserId = Guid.NewGuid();
        var newUser = new User
        {
            Id = newUserId,
            UserName = "newuser2@example.com",
            Email = "newuser2@example.com",
            EmailConfirmed = true
        };
        _context.Users.Add(newUser);
        await _context.SaveChangesAsync();

        var updateDto = new UpdateRecommendationSettingsDto
        {
            EnableRecommendations = false,
            MinimumRating = 8.0m
        };

        // Act
        var result = await _service.UpdateRecommendationSettingsAsync(newUserId, updateDto);

        // Assert
        Assert.NotNull(result);
        Assert.False(result.EnableRecommendations);
        Assert.Equal(8.0m, result.MinimumRating);
    }

    [Fact]
    public async Task UpdateRecommendationSettingsAsync_UpdatesTimestamp()
    {
        // Arrange
        var updateDto = new UpdateRecommendationSettingsDto
        {
            EnableRecommendations = true,
            MinimumRating = 5.0m
        };

        var beforeUpdate = DateTime.UtcNow;

        // Act
        await _service.UpdateRecommendationSettingsAsync(_testUserId, updateDto);

        // Assert
        var settings = await _context.RecommendationSettings.FirstOrDefaultAsync(s => s.UserId == _testUserId);
        Assert.NotNull(settings);
        Assert.True(settings.UpdatedAt >= beforeUpdate);
    }

    #endregion

    // ============================================
    // Personalized Recommendations Tests (5 tests)
    // ============================================

    #region Personalized Recommendations

    [Fact]
    public async Task GetPersonalizedRecommendationsAsync_WithRecommendationsDisabled_ReturnsEmpty()
    {
        // Arrange
        var settings = await _context.RecommendationSettings.FirstOrDefaultAsync(s => s.UserId == _testUserId);
        settings!.EnableRecommendations = false;
        await _context.SaveChangesAsync();

        var request = new GetRecommendationsRequest { Page = 1, Limit = 10 };

        // Act
        var result = await _service.GetPersonalizedRecommendationsAsync(_testUserId, request);

        // Assert
        Assert.NotNull(result);
        Assert.Empty(result.Recommendations);
        Assert.Equal("personalized", result.RecommendationType);
    }

    [Fact]
    public async Task GetPersonalizedRecommendationsAsync_WithCachedResults_ReturnsCached()
    {
        // Arrange
        var cachedRecs = new List<RecommendationResult>
        {
            new RecommendationResult
            {
                ContentId = "123",
                Title = "Cached Movie",
                RecommendationScore = 95.0
            }
        };

        _mockCacheService.Setup(x => x.GetAsync<List<RecommendationResult>>(
            It.IsAny<string>(), It.IsAny<CacheLevel>()))
            .ReturnsAsync(cachedRecs);

        var request = new GetRecommendationsRequest { Page = 1, Limit = 10 };

        // Act
        var result = await _service.GetPersonalizedRecommendationsAsync(_testUserId, request);

        // Assert
        Assert.NotNull(result);
        Assert.Single(result.Recommendations);
        Assert.Equal("Cached Movie", result.Recommendations[0].Title);
        Assert.Equal("personalized", result.RecommendationType);
    }

    [Fact]
    public async Task GetPersonalizedRecommendationsAsync_WithNoCache_GeneratesRecommendations()
    {
        // Arrange
        _mockCacheService.Setup(x => x.GetAsync<List<RecommendationResult>>(
            It.IsAny<string>(), It.IsAny<CacheLevel>()))
            .ReturnsAsync((List<RecommendationResult>?)null);

        _mockRatingService.Setup(x => x.GetUserPreferencesFromRatingsAsync(_testUserId))
            .ReturnsAsync(new UserContentPreferences
            {
                PreferredGenres = new List<string> { "Action", "Sci-Fi" },
                PreferredContentTypes = new List<string> { "Movie" }
            });

        _mockCacheService.Setup(x => x.SetAsync(
            It.IsAny<string>(), It.IsAny<List<RecommendationResult>>(), It.IsAny<TimeSpan>(), It.IsAny<CacheLevel>()))
            .Returns(Task.CompletedTask);

        var request = new GetRecommendationsRequest { Page = 1, Limit = 10 };

        // Act
        var result = await _service.GetPersonalizedRecommendationsAsync(_testUserId, request);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("personalized", result.RecommendationType);
        _mockCacheService.Verify(x => x.SetAsync(
            It.IsAny<string>(), It.IsAny<List<RecommendationResult>>(), TimeSpan.FromHours(1), It.IsAny<CacheLevel>()),
            Times.Once);
    }

    [Fact]
    public async Task GetPersonalizedRecommendationsAsync_WithError_ReturnsEmptyResponse()
    {
        // Arrange
        _mockCacheService.Setup(x => x.GetAsync<List<RecommendationResult>>(
            It.IsAny<string>(), It.IsAny<CacheLevel>()))
            .ThrowsAsync(new Exception("Cache error"));

        var request = new GetRecommendationsRequest { Page = 1, Limit = 10 };

        // Act
        var result = await _service.GetPersonalizedRecommendationsAsync(_testUserId, request);

        // Assert
        Assert.NotNull(result);
        Assert.Empty(result.Recommendations);
        Assert.Equal("personalized", result.RecommendationType);
    }

    [Fact]
    public async Task GetPersonalizedRecommendationsAsync_TracksResponseTime()
    {
        // Arrange
        _mockCacheService.Setup(x => x.GetAsync<List<RecommendationResult>>(
            It.IsAny<string>(), It.IsAny<CacheLevel>()))
            .ReturnsAsync((List<RecommendationResult>?)null);

        _mockRatingService.Setup(x => x.GetUserPreferencesFromRatingsAsync(_testUserId))
            .ReturnsAsync(new UserContentPreferences { PreferredGenres = new List<string>() });

        var request = new GetRecommendationsRequest { Page = 1, Limit = 10 };

        // Act
        var result = await _service.GetPersonalizedRecommendationsAsync(_testUserId, request);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.ResponseTime.TotalMilliseconds >= 0);
    }

    #endregion

    // ============================================
    // Trending Content Tests (3 tests)
    // ============================================

    #region Trending Content

    [Fact]
    public async Task GetTrendingContentAsync_WithCachedResults_ReturnsCached()
    {
        // Arrange
        var cachedRecs = new List<RecommendationResult>
        {
            new RecommendationResult
            {
                ContentId = "456",
                Title = "Trending Movie",
                RecommendationScore = 85.0,
                RecommendationType = "trending"
            }
        };

        _mockCacheService.Setup(x => x.GetAsync<List<RecommendationResult>>(
            It.IsAny<string>(), It.IsAny<CacheLevel>()))
            .ReturnsAsync(cachedRecs);

        var request = new GetRecommendationsRequest { Page = 1, Limit = 10 };

        // Act
        var result = await _service.GetTrendingContentAsync(request);

        // Assert
        Assert.NotNull(result);
        Assert.Single(result.Recommendations);
        Assert.Equal("Trending Movie", result.Recommendations[0].Title);
        Assert.Equal("trending", result.RecommendationType);
    }

    [Fact]
    public async Task GetTrendingContentAsync_WithError_ReturnsEmptyResponse()
    {
        // Arrange
        _mockCacheService.Setup(x => x.GetAsync<List<RecommendationResult>>(
            It.IsAny<string>(), It.IsAny<CacheLevel>()))
            .ThrowsAsync(new Exception("Cache error"));

        var request = new GetRecommendationsRequest { Page = 1, Limit = 10 };

        // Act
        var result = await _service.GetTrendingContentAsync(request);

        // Assert
        Assert.NotNull(result);
        Assert.Empty(result.Recommendations);
        Assert.Equal("trending", result.RecommendationType);
    }

    [Fact]
    public async Task GetTrendingContentAsync_TracksResponseTime()
    {
        // Arrange
        _mockCacheService.Setup(x => x.GetAsync<List<RecommendationResult>>(
            It.IsAny<string>(), It.IsAny<CacheLevel>()))
            .ReturnsAsync((List<RecommendationResult>?)null);

        var request = new GetRecommendationsRequest { Page = 1, Limit = 10 };

        // Act
        var result = await _service.GetTrendingContentAsync(request);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.ResponseTime.TotalMilliseconds >= 0);
    }

    #endregion

    // ============================================
    // Similar Content Tests (4 tests)
    // ============================================

    #region Similar Content

    [Fact]
    public async Task GetSimilarContentAsync_WithCachedResults_ReturnsCached()
    {
        // Arrange
        var cachedRecs = new List<RecommendationResult>
        {
            new RecommendationResult
            {
                ContentId = "789",
                Title = "Similar Movie",
                RecommendationScore = 75.0,
                RecommendationType = "similar"
            }
        };

        _mockCacheService.Setup(x => x.GetAsync<List<RecommendationResult>>(
            It.IsAny<string>(), It.IsAny<CacheLevel>()))
            .ReturnsAsync(cachedRecs);

        var request = new GetRecommendationsRequest { Page = 1, Limit = 10 };

        // Act
        var result = await _service.GetSimilarContentAsync("123", "Movie", request);

        // Assert
        Assert.NotNull(result);
        Assert.Single(result.Recommendations);
        Assert.Equal("Similar Movie", result.Recommendations[0].Title);
        Assert.Equal("similar", result.RecommendationType);
    }

    [Fact]
    public async Task GetSimilarContentAsync_WithInvalidContentId_ReturnsEmpty()
    {
        // Arrange
        _mockCacheService.Setup(x => x.GetAsync<List<RecommendationResult>>(
            It.IsAny<string>(), It.IsAny<CacheLevel>()))
            .ReturnsAsync((List<RecommendationResult>?)null);

        _mockContentService.Setup(x => x.GetContentByIdAsync(It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync((ContentData?)null);

        var request = new GetRecommendationsRequest { Page = 1, Limit = 10 };

        // Act
        var result = await _service.GetSimilarContentAsync("invalid-id", "Movie", request);

        // Assert
        Assert.NotNull(result);
        Assert.Empty(result.Recommendations);
        Assert.Equal("similar", result.RecommendationType);
    }

    [Fact]
    public async Task GetSimilarContentAsync_WithError_ReturnsEmptyResponse()
    {
        // Arrange
        _mockCacheService.Setup(x => x.GetAsync<List<RecommendationResult>>(
            It.IsAny<string>(), It.IsAny<CacheLevel>()))
            .ThrowsAsync(new Exception("Cache error"));

        var request = new GetRecommendationsRequest { Page = 1, Limit = 10 };

        // Act
        var result = await _service.GetSimilarContentAsync("123", "Movie", request);

        // Assert
        Assert.NotNull(result);
        Assert.Empty(result.Recommendations);
        Assert.Equal("similar", result.RecommendationType);
    }

    [Fact]
    public async Task GetSimilarContentAsync_TracksResponseTime()
    {
        // Arrange
        _mockCacheService.Setup(x => x.GetAsync<List<RecommendationResult>>(
            It.IsAny<string>(), It.IsAny<CacheLevel>()))
            .ReturnsAsync((List<RecommendationResult>?)null);

        _mockContentService.Setup(x => x.GetContentByIdAsync(It.IsAny<string>(), It.IsAny<string>()))
            .ReturnsAsync((ContentData?)null);

        var request = new GetRecommendationsRequest { Page = 1, Limit = 10 };

        // Act
        var result = await _service.GetSimilarContentAsync("123", "Movie", request);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.ResponseTime.TotalMilliseconds >= 0);
    }

    #endregion

    // ============================================
    // Popular Content Tests (3 tests)
    // ============================================

    #region Popular Content

    [Fact]
    public async Task GetPopularContentAsync_WithCachedResults_ReturnsCached()
    {
        // Arrange
        var cachedRecs = new List<RecommendationResult>
        {
            new RecommendationResult
            {
                ContentId = "999",
                Title = "Popular Movie",
                RecommendationScore = 90.0,
                RecommendationType = "popular"
            }
        };

        _mockCacheService.Setup(x => x.GetAsync<List<RecommendationResult>>(
            It.IsAny<string>(), It.IsAny<CacheLevel>()))
            .ReturnsAsync(cachedRecs);

        var request = new GetRecommendationsRequest { Page = 1, Limit = 10 };

        // Act
        var result = await _service.GetPopularContentAsync(request);

        // Assert
        Assert.NotNull(result);
        Assert.Single(result.Recommendations);
        Assert.Equal("Popular Movie", result.Recommendations[0].Title);
        Assert.Equal("popular", result.RecommendationType);
    }

    [Fact]
    public async Task GetPopularContentAsync_WithError_ReturnsEmptyResponse()
    {
        // Arrange
        _mockCacheService.Setup(x => x.GetAsync<List<RecommendationResult>>(
            It.IsAny<string>(), It.IsAny<CacheLevel>()))
            .ThrowsAsync(new Exception("Cache error"));

        var request = new GetRecommendationsRequest { Page = 1, Limit = 10 };

        // Act
        var result = await _service.GetPopularContentAsync(request);

        // Assert
        Assert.NotNull(result);
        Assert.Empty(result.Recommendations);
        Assert.Equal("popular", result.RecommendationType);
    }

    [Fact]
    public async Task GetPopularContentAsync_TracksResponseTime()
    {
        // Arrange
        _mockCacheService.Setup(x => x.GetAsync<List<RecommendationResult>>(
            It.IsAny<string>(), It.IsAny<CacheLevel>()))
            .ReturnsAsync((List<RecommendationResult>?)null);

        var request = new GetRecommendationsRequest { Page = 1, Limit = 10 };

        // Act
        var result = await _service.GetPopularContentAsync(request);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.ResponseTime.TotalMilliseconds >= 0);
    }

    #endregion

    // ============================================
    // Data Integrity Tests (B2 fix)
    // ============================================

    #region Data Integrity

    [Fact]
    public async Task ValidateAndFixDataIntegrityAsync_WithDuplicateRatings_KeepsOnlyLatest()
    {
        // Arrange: seed 3 ratings for the same (UserId, ContentId) pair
        var userId = Guid.NewGuid();
        var user = new User { Id = userId, UserName = "dedup@example.com", Email = "dedup@example.com", EmailConfirmed = true };
        _context.Users.Add(user);

        var contentId = "movie-dedup-1";
        var baseTime = DateTime.UtcNow.AddDays(-3);

        var ratings = new[]
        {
            new ContentRating { Id = Guid.NewGuid(), UserId = userId, ContentId = contentId, ContentType = "movie", Rating = 3, CreatedAt = baseTime, UpdatedAt = baseTime },
            new ContentRating { Id = Guid.NewGuid(), UserId = userId, ContentId = contentId, ContentType = "movie", Rating = 4, CreatedAt = baseTime.AddDays(1), UpdatedAt = baseTime.AddDays(1) },
            new ContentRating { Id = Guid.NewGuid(), UserId = userId, ContentId = contentId, ContentType = "movie", Rating = 5, CreatedAt = baseTime.AddDays(2), UpdatedAt = baseTime.AddDays(2) },
        };
        _context.ContentRatings.AddRange(ratings);
        await _context.SaveChangesAsync();

        // Act
        var removedCount = await _service.ValidateAndFixDataIntegrityAsync();

        // Assert: 2 duplicates removed, 1 most-recent record remains
        Assert.Equal(2, removedCount);
        var remaining = await _context.ContentRatings
            .Where(r => r.UserId == userId && r.ContentId == contentId)
            .ToListAsync();
        Assert.Single(remaining);
        Assert.Equal(5, remaining[0].Rating); // Latest record (highest UpdatedAt) kept
    }

    [Fact]
    public async Task ValidateAndFixDataIntegrityAsync_WithNoDuplicates_ReturnsZero()
    {
        // Arrange: each user/contentId pair is unique
        var userId = Guid.NewGuid();
        var user = new User { Id = userId, UserName = "nodedup@example.com", Email = "nodedup@example.com", EmailConfirmed = true };
        _context.Users.Add(user);

        _context.ContentRatings.AddRange(new[]
        {
            new ContentRating { Id = Guid.NewGuid(), UserId = userId, ContentId = "movie-a", ContentType = "movie", Rating = 3, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
            new ContentRating { Id = Guid.NewGuid(), UserId = userId, ContentId = "movie-b", ContentType = "movie", Rating = 4, CreatedAt = DateTime.UtcNow, UpdatedAt = DateTime.UtcNow },
        });
        await _context.SaveChangesAsync();

        // Act
        var removedCount = await _service.ValidateAndFixDataIntegrityAsync();

        // Assert
        Assert.Equal(0, removedCount);
    }

    #endregion
}
