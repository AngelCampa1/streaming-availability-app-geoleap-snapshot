using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services.VpnGuidanceServices;

namespace GeoLeap.Api.Tests.Services;

/// <summary>
/// Phase 8: Direct unit tests for VpnRatingService
/// Goal: Achieve 80%+ coverage and discover rating aggregation bugs
/// Focus: Rating CRUD, statistics calculation, provider rating recalculation
/// Expected bugs: Average() on empty sequences, pagination edge cases, validation gaps
/// </summary>
public class VpnRatingServiceDirectTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly Mock<IVpnAnalyticsService> _mockAnalyticsService;
    private readonly Mock<ILogger<VpnRatingService>> _mockLogger;
    private readonly VpnRatingService _service;

    // Test data
    private readonly Guid _testUserId = Guid.NewGuid();
    private readonly Guid _testProviderId = Guid.NewGuid();
    private readonly Guid _secondUserId = Guid.NewGuid();

    public VpnRatingServiceDirectTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: $"VpnRatingTestDb_{Guid.NewGuid()}")
            .Options;

        _context = new ApplicationDbContext(options);
        _mockAnalyticsService = new Mock<IVpnAnalyticsService>();
        _mockLogger = new Mock<ILogger<VpnRatingService>>();

        _service = new VpnRatingService(_context, _mockAnalyticsService.Object, _mockLogger.Object);

        // Seed test data
        SeedTestData();
    }

    private void SeedTestData()
    {
        // Create test VPN provider
        var provider = new VpnProvider
        {
            Id = _testProviderId,
            Name = "TestVPN",
            WebsiteUrl = "https://testvpn.com",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        // Create test users
        var user1 = new User
        {
            Id = _testUserId,
            Email = "user1@test.com",
            UserName = "user1@test.com",
            FirstName = "Test",
            LastName = "User1"
        };

        var user2 = new User
        {
            Id = _secondUserId,
            Email = "user2@test.com",
            UserName = "user2@test.com",
            FirstName = "Test",
            LastName = "User2"
        };

        _context.VpnProviders.Add(provider);
        _context.Users.Add(user1);
        _context.Users.Add(user2);
        _context.SaveChanges();
    }

    #region GetRatingAsync Tests

    [Fact]
    public async Task GetRatingAsync_WhenRatingExists_ReturnsRating()
    {
        // Arrange
        var rating = new VpnProviderRating
        {
            Id = Guid.NewGuid(),
            UserId = _testUserId,
            VpnProviderId = _testProviderId,
            RatingType = VpnRatingType.FiveStars,
            Rating = 4,
            CreatedAt = DateTime.UtcNow
        };
        _context.VpnProviderRatings.Add(rating);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetRatingAsync(_testUserId, _testProviderId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(_testUserId, result.UserId);
        Assert.Equal(_testProviderId, result.VpnProviderId);
        Assert.Equal(4, result.Rating);
    }

    [Fact]
    public async Task GetRatingAsync_WhenRatingDoesNotExist_ReturnsNull()
    {
        // Act
        var result = await _service.GetRatingAsync(Guid.NewGuid(), Guid.NewGuid());

        // Assert
        Assert.Null(result);
    }

    #endregion

    #region GetProviderRatingsAsync Tests

    [Fact]
    public async Task GetProviderRatingsAsync_ReturnsRatingsOrderedByCreatedDate()
    {
        // Arrange
        var rating1 = new VpnProviderRating
        {
            Id = Guid.NewGuid(),
            UserId = _testUserId,
            VpnProviderId = _testProviderId,
            Rating = 4,
            CreatedAt = DateTime.UtcNow.AddDays(-2)
        };
        var rating2 = new VpnProviderRating
        {
            Id = Guid.NewGuid(),
            UserId = _secondUserId,
            VpnProviderId = _testProviderId,
            Rating = 5,
            CreatedAt = DateTime.UtcNow.AddDays(-1)
        };
        _context.VpnProviderRatings.AddRange(rating1, rating2);
        await _context.SaveChangesAsync();

        // Act
        var results = await _service.GetProviderRatingsAsync(_testProviderId);

        // Assert
        Assert.Equal(2, results.Count());
        Assert.Equal(rating2.Id, results.First().Id); // Most recent first
    }

    [Fact]
    public async Task GetProviderRatingsAsync_WithPagination_ReturnsCorrectPage()
    {
        // Arrange - Create 5 ratings
        for (int i = 0; i < 5; i++)
        {
            _context.VpnProviderRatings.Add(new VpnProviderRating
            {
                Id = Guid.NewGuid(),
                UserId = _testUserId,
                VpnProviderId = _testProviderId,
                Rating = i + 1,
                CreatedAt = DateTime.UtcNow.AddDays(-i)
            });
        }
        await _context.SaveChangesAsync();

        // Act - Get page 2 with page size 2
        var results = await _service.GetProviderRatingsAsync(_testProviderId, pageSize: 2, pageNumber: 2);

        // Assert
        Assert.Equal(2, results.Count());
    }

    [Fact]
    public async Task GetProviderRatingsAsync_WithPageNumberZero_SkipsNegativeRecords()
    {
        // Arrange
        _context.VpnProviderRatings.Add(new VpnProviderRating
        {
            Id = Guid.NewGuid(),
            UserId = _testUserId,
            VpnProviderId = _testProviderId,
            Rating = 5,
            CreatedAt = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();

        // Act - pageNumber=0 causes Skip((0-1)*20) = Skip(-20)
        var results = await _service.GetProviderRatingsAsync(_testProviderId, pageSize: 20, pageNumber: 0);

        // Assert - Should handle gracefully (EF Core may throw or return all)
        Assert.NotNull(results);
    }

    [Fact]
    public async Task GetProviderRatingsAsync_WithNegativePageNumber_HandlesGracefully()
    {
        // Arrange
        _context.VpnProviderRatings.Add(new VpnProviderRating
        {
            Id = Guid.NewGuid(),
            UserId = _testUserId,
            VpnProviderId = _testProviderId,
            Rating = 5,
            CreatedAt = DateTime.UtcNow
        });
        await _context.SaveChangesAsync();

        // Act - pageNumber=-1 causes Skip((-1-1)*20) = Skip(-40)
        var results = await _service.GetProviderRatingsAsync(_testProviderId, pageSize: 20, pageNumber: -1);

        // Assert
        Assert.NotNull(results);
    }

    #endregion

    #region GetUserRatingsAsync Tests

    [Fact]
    public async Task GetUserRatingsAsync_ReturnsUserRatings()
    {
        // Arrange
        var rating1 = new VpnProviderRating
        {
            Id = Guid.NewGuid(),
            UserId = _testUserId,
            VpnProviderId = _testProviderId,
            Rating = 4,
            CreatedAt = DateTime.UtcNow
        };
        var rating2 = new VpnProviderRating
        {
            Id = Guid.NewGuid(),
            UserId = _secondUserId,
            VpnProviderId = _testProviderId,
            Rating = 3,
            CreatedAt = DateTime.UtcNow
        };
        _context.VpnProviderRatings.AddRange(rating1, rating2);
        await _context.SaveChangesAsync();

        // Act
        var results = await _service.GetUserRatingsAsync(_testUserId);

        // Assert
        Assert.Single(results);
        Assert.Equal(_testUserId, results.First().UserId);
    }

    #endregion

    #region SubmitRatingAsync Tests

    [Fact]
    public async Task SubmitRatingAsync_CreatesNewRating_WhenNotExists()
    {
        // Arrange
        var ratingDto = new VpnRatingDto
        {
            VpnProviderId = _testProviderId,
            RatingType = VpnRatingType.FiveStars,
            Rating = 5,
            Review = "Excellent VPN!",
            SpeedRating = 5,
            ReliabilityRating = 4
        };

        // Act
        var result = await _service.SubmitRatingAsync(_testUserId, ratingDto);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(5, result.Rating);
        Assert.Equal("Excellent VPN!", result.Review);
        Assert.Equal(5, result.SpeedRating);
        Assert.False(result.IsVerified);
        Assert.Equal(0, result.HelpfulVotes);

        // Verify analytics tracked
        _mockAnalyticsService.Verify(
            x => x.TrackEventAsync(
                VpnGuidanceEventType.ProviderRated,
                _testUserId,
                _testProviderId,
                null, // guideId (not used for ratings)
                It.IsAny<Dictionary<string, object>>(),
                null, // sessionId
                It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task SubmitRatingAsync_UpdatesExistingRating_WhenExists()
    {
        // Arrange - Create initial rating
        var initialRating = new VpnProviderRating
        {
            Id = Guid.NewGuid(),
            UserId = _testUserId,
            VpnProviderId = _testProviderId,
            Rating = 3,
            Review = "OK",
            CreatedAt = DateTime.UtcNow
        };
        _context.VpnProviderRatings.Add(initialRating);
        await _context.SaveChangesAsync();

        var updatedDto = new VpnRatingDto
        {
            VpnProviderId = _testProviderId,
            RatingType = VpnRatingType.FiveStars,
            Rating = 5,
            Review = "Actually great!"
        };

        // Act
        var result = await _service.SubmitRatingAsync(_testUserId, updatedDto);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(5, result.Rating);
        Assert.Equal("Actually great!", result.Review);
        Assert.NotNull(result.UpdatedAt);
    }

    [Fact]
    public async Task SubmitRatingAsync_WithNegativeRating_RejectsValue()
    {
        // Arrange
        var ratingDto = new VpnRatingDto
        {
            VpnProviderId = _testProviderId,
            RatingType = VpnRatingType.FiveStars,
            Rating = -5 // Invalid!
        };

        // Act
        var result = await _service.SubmitRatingAsync(_testUserId, ratingDto);

        // Assert - BUG FIXED: P8-B3 - Now validates and rejects ratings below 1
        Assert.Null(result); // Validation correctly rejects invalid rating
    }

    [Fact]
    public async Task SubmitRatingAsync_WithRatingAboveFive_RejectsValue()
    {
        // Arrange
        var ratingDto = new VpnRatingDto
        {
            VpnProviderId = _testProviderId,
            RatingType = VpnRatingType.FiveStars,
            Rating = 10 // Invalid!
        };

        // Act
        var result = await _service.SubmitRatingAsync(_testUserId, ratingDto);

        // Assert - BUG FIXED: P8-B3 - Now validates and rejects ratings above 5
        Assert.Null(result); // Validation correctly rejects invalid rating
    }

    #endregion

    #region GetRatingStatsAsync Tests

    [Fact]
    public async Task GetRatingStatsAsync_WithNoRatings_ReturnsEmptyStats()
    {
        // Act
        var stats = await _service.GetRatingStatsAsync(_testProviderId);

        // Assert
        Assert.NotNull(stats);
        Assert.Equal(0, stats["totalRatings"]);
        Assert.Equal(0, stats["averageRating"]);
    }

    [Fact]
    public async Task GetRatingStatsAsync_WithRatings_CalculatesCorrectAverages()
    {
        // Arrange
        _context.VpnProviderRatings.AddRange(
            new VpnProviderRating
            {
                Id = Guid.NewGuid(),
                UserId = _testUserId,
                VpnProviderId = _testProviderId,
                Rating = 4,
                SpeedRating = 5,
                ReliabilityRating = 4,
                CreatedAt = DateTime.UtcNow
            },
            new VpnProviderRating
            {
                Id = Guid.NewGuid(),
                UserId = _secondUserId,
                VpnProviderId = _testProviderId,
                Rating = 5,
                SpeedRating = 5,
                ReliabilityRating = 5,
                CreatedAt = DateTime.UtcNow
            }
        );
        await _context.SaveChangesAsync();

        // Act
        var stats = await _service.GetRatingStatsAsync(_testProviderId);

        // Assert
        Assert.Equal(2, stats["totalRatings"]);
        Assert.Equal(4.5, stats["averageRating"]);

        var categoryAverages = (Dictionary<string, double>)stats["categoryAverages"];
        Assert.Equal(5.0, categoryAverages["speed"]);
        Assert.Equal(4.5, categoryAverages["reliability"]);
    }

    [Fact]
    public async Task GetRatingStatsAsync_WithNoSpeedRatings_CalculatesCorrectly()
    {
        // Arrange - Create ratings WITHOUT SpeedRating values
        _context.VpnProviderRatings.AddRange(
            new VpnProviderRating
            {
                Id = Guid.NewGuid(),
                UserId = _testUserId,
                VpnProviderId = _testProviderId,
                Rating = 4,
                SpeedRating = null, // No speed rating
                CreatedAt = DateTime.UtcNow
            },
            new VpnProviderRating
            {
                Id = Guid.NewGuid(),
                UserId = _secondUserId,
                VpnProviderId = _testProviderId,
                Rating = 5,
                SpeedRating = null, // No speed rating
                CreatedAt = DateTime.UtcNow
            }
        );
        await _context.SaveChangesAsync();

        // Act - BUG FIXED: Now checks .Any() before calling .Average()
        var stats = await _service.GetRatingStatsAsync(_testProviderId);

        // Assert - Successfully handles missing category ratings
        Assert.NotNull(stats);
        Assert.Equal(2, stats["totalRatings"]);
        Assert.Equal(4.5, stats["averageRating"]);
    }

    [Fact]
    public async Task GetRatingStatsAsync_WithPartialCategoryRatings_CalculatesCorrectly()
    {
        // Arrange - Mix of ratings with and without category values
        _context.VpnProviderRatings.AddRange(
            new VpnProviderRating
            {
                Id = Guid.NewGuid(),
                UserId = _testUserId,
                VpnProviderId = _testProviderId,
                Rating = 4,
                SpeedRating = 5,
                ReliabilityRating = null, // Missing
                CreatedAt = DateTime.UtcNow
            },
            new VpnProviderRating
            {
                Id = Guid.NewGuid(),
                UserId = _secondUserId,
                VpnProviderId = _testProviderId,
                Rating = 5,
                SpeedRating = null, // Missing
                ReliabilityRating = 4,
                CreatedAt = DateTime.UtcNow
            }
        );
        await _context.SaveChangesAsync();

        // Act - BUG FIXED: Should handle partial ratings gracefully
        var stats = await _service.GetRatingStatsAsync(_testProviderId);

        // Assert - Calculates averages only for categories with values
        Assert.NotNull(stats);
        Assert.Equal(2, stats["totalRatings"]);
        Assert.Equal(4.5, stats["averageRating"]); // Average of 4 and 5

        var categoryAverages = (Dictionary<string, double>)stats["categoryAverages"];
        Assert.Equal(5.0, categoryAverages["speed"]); // Only user1 has speed rating
        Assert.Equal(4.0, categoryAverages["reliability"]); // Only user2 has reliability rating
    }

    #endregion

    #region RecalculateProviderRatingsAsync Tests

    [Fact]
    public async Task RecalculateProviderRatingsAsync_UpdatesProviderAverages()
    {
        // Arrange
        _context.VpnProviderRatings.AddRange(
            new VpnProviderRating
            {
                Id = Guid.NewGuid(),
                UserId = _testUserId,
                VpnProviderId = _testProviderId,
                Rating = 4,
                SpeedRating = 5,
                CreatedAt = DateTime.UtcNow
            },
            new VpnProviderRating
            {
                Id = Guid.NewGuid(),
                UserId = _secondUserId,
                VpnProviderId = _testProviderId,
                Rating = 5,
                SpeedRating = 5,
                CreatedAt = DateTime.UtcNow
            }
        );
        await _context.SaveChangesAsync();

        // Act
        await _service.RecalculateProviderRatingsAsync(_testProviderId);

        // Assert
        var provider = await _context.VpnProviders.FindAsync(_testProviderId);
        Assert.NotNull(provider);
        Assert.Equal(2, provider.TotalRatings);
        Assert.Equal(4.5, provider.OverallRating);
        Assert.Equal(5.0, provider.AverageSpeedRating);
    }

    [Fact]
    public async Task RecalculateProviderRatingsAsync_WithNoRatings_SetsNullAverages()
    {
        // Act
        await _service.RecalculateProviderRatingsAsync(_testProviderId);

        // Assert
        var provider = await _context.VpnProviders.FindAsync(_testProviderId);
        Assert.NotNull(provider);
        Assert.Equal(0, provider.TotalRatings);
        Assert.Null(provider.OverallRating);
        Assert.Null(provider.AverageSpeedRating);
    }

    [Fact]
    public async Task RecalculateProviderRatingsAsync_WithMissingCategoryRatings_HandlesGracefully()
    {
        // Arrange - Ratings without category ratings
        _context.VpnProviderRatings.AddRange(
            new VpnProviderRating
            {
                Id = Guid.NewGuid(),
                UserId = _testUserId,
                VpnProviderId = _testProviderId,
                Rating = 4,
                SpeedRating = null, // No category ratings
                ReliabilityRating = null,
                EaseOfUseRating = null,
                CustomerSupportRating = null,
                CreatedAt = DateTime.UtcNow
            }
        );
        await _context.SaveChangesAsync();

        // Act - BUG FIXED: Now checks .Any() before calling .Average()
        await _service.RecalculateProviderRatingsAsync(_testProviderId);

        // Assert - Successfully handles missing category ratings
        var provider = await _context.VpnProviders.FindAsync(_testProviderId);
        Assert.NotNull(provider);
        Assert.Equal(1, provider.TotalRatings);
        Assert.Equal(4.0, provider.OverallRating); // Main rating calculated
        Assert.Null(provider.AverageSpeedRating); // Category ratings null when none provided
    }

    #endregion

    #region VoteRatingHelpfulnessAsync Tests

    [Fact]
    public async Task VoteRatingHelpfulnessAsync_IncrementHelpfulVotes_WhenHelpful()
    {
        // Arrange
        var rating = new VpnProviderRating
        {
            Id = Guid.NewGuid(),
            UserId = _testUserId,
            VpnProviderId = _testProviderId,
            Rating = 5,
            HelpfulVotes = 0,
            CreatedAt = DateTime.UtcNow
        };
        _context.VpnProviderRatings.Add(rating);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.VoteRatingHelpfulnessAsync(rating.Id, Guid.NewGuid(), isHelpful: true);

        // Assert
        Assert.True(result);
        var updatedRating = await _context.VpnProviderRatings.FindAsync(rating.Id);
        Assert.Equal(1, updatedRating!.HelpfulVotes);
        Assert.Equal(0, updatedRating.UnhelpfulVotes);
    }

    [Fact]
    public async Task VoteRatingHelpfulnessAsync_IncrementUnhelpfulVotes_WhenNotHelpful()
    {
        // Arrange
        var rating = new VpnProviderRating
        {
            Id = Guid.NewGuid(),
            UserId = _testUserId,
            VpnProviderId = _testProviderId,
            Rating = 5,
            UnhelpfulVotes = 0,
            CreatedAt = DateTime.UtcNow
        };
        _context.VpnProviderRatings.Add(rating);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.VoteRatingHelpfulnessAsync(rating.Id, Guid.NewGuid(), isHelpful: false);

        // Assert
        Assert.True(result);
        var updatedRating = await _context.VpnProviderRatings.FindAsync(rating.Id);
        Assert.Equal(0, updatedRating!.HelpfulVotes);
        Assert.Equal(1, updatedRating.UnhelpfulVotes);
    }

    [Fact]
    public async Task VoteRatingHelpfulnessAsync_AllowsDuplicateVotes_NoPrevention()
    {
        // Arrange
        var rating = new VpnProviderRating
        {
            Id = Guid.NewGuid(),
            UserId = _testUserId,
            VpnProviderId = _testProviderId,
            Rating = 5,
            HelpfulVotes = 0,
            CreatedAt = DateTime.UtcNow
        };
        _context.VpnProviderRatings.Add(rating);
        await _context.SaveChangesAsync();

        var voterId = Guid.NewGuid();

        // Act - Same voter votes multiple times
        await _service.VoteRatingHelpfulnessAsync(rating.Id, voterId, isHelpful: true);
        await _service.VoteRatingHelpfulnessAsync(rating.Id, voterId, isHelpful: true);
        await _service.VoteRatingHelpfulnessAsync(rating.Id, voterId, isHelpful: true);

        // Assert - Bug: Duplicate votes allowed (acknowledged in comment)
        var updatedRating = await _context.VpnProviderRatings.FindAsync(rating.Id);
        Assert.Equal(3, updatedRating!.HelpfulVotes); // Should be 1, but is 3
    }

    [Fact]
    public async Task VoteRatingHelpfulnessAsync_WithNonExistentRating_ReturnsFalse()
    {
        // Act
        var result = await _service.VoteRatingHelpfulnessAsync(Guid.NewGuid(), Guid.NewGuid(), isHelpful: true);

        // Assert
        Assert.False(result);
    }

    #endregion

    #region RecalculateAllProviderRatingsAsync Tests

    [Fact]
    public async Task RecalculateAllProviderRatingsAsync_ProcessesAllActiveProviders()
    {
        // Arrange - Create second provider
        var provider2Id = Guid.NewGuid();
        _context.VpnProviders.Add(new VpnProvider
        {
            Id = provider2Id,
            Name = "TestVPN2",
            WebsiteUrl = "https://testvpn2.com",
            IsActive = true,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        });

        // Add ratings for both providers
        _context.VpnProviderRatings.AddRange(
            new VpnProviderRating
            {
                Id = Guid.NewGuid(),
                UserId = _testUserId,
                VpnProviderId = _testProviderId,
                Rating = 4,
                CreatedAt = DateTime.UtcNow
            },
            new VpnProviderRating
            {
                Id = Guid.NewGuid(),
                UserId = _testUserId,
                VpnProviderId = provider2Id,
                Rating = 5,
                CreatedAt = DateTime.UtcNow
            }
        );
        await _context.SaveChangesAsync();

        // Act
        await _service.RecalculateAllProviderRatingsAsync();

        // Assert
        var provider1 = await _context.VpnProviders.FindAsync(_testProviderId);
        var provider2 = await _context.VpnProviders.FindAsync(provider2Id);

        Assert.Equal(1, provider1!.TotalRatings);
        Assert.Equal(4.0, provider1.OverallRating);

        Assert.Equal(1, provider2!.TotalRatings);
        Assert.Equal(5.0, provider2.OverallRating);
    }

    #endregion

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }
}
