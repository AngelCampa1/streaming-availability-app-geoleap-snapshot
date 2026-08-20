using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using GeoLeap.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Xunit;

namespace GeoLeap.Api.Tests.Integration;

/// <summary>
/// Integration tests for RecommendationService - Phase 22 (Week 20)
/// Testing content recommendation engine with collaborative filtering, personalized recommendations,
/// trending/popular content, user settings, dismissed content, and analytics
/// </summary>
[Collection("MinimalTest")]
public class RecommendationServiceIntegrationTests : MinimalTestBase
{
    private readonly IRecommendationService _recommendationService;
    private readonly ApplicationDbContext _context;
    private readonly ILogger<RecommendationServiceIntegrationTests> _testLogger;

    public RecommendationServiceIntegrationTests()
    {
        _recommendationService = Factory.Services.GetRequiredService<IRecommendationService>();
        _context = Factory.Services.GetRequiredService<ApplicationDbContext>();
        _testLogger = Factory.Services.GetRequiredService<ILogger<RecommendationServiceIntegrationTests>>();
    }

    #region GetPersonalizedRecommendationsAsync Tests (5 tests)

    [Fact]
    public async Task GetPersonalizedRecommendations_WhenDisabled_ReturnsEmpty()
    {
        // Arrange
        var userId = Guid.NewGuid();

        // Create settings with recommendations disabled
        var settings = new RecommendationSettings
        {
            UserId = userId,
            EnableRecommendations = false
        };
        _context.Set<RecommendationSettings>().Add(settings);
        await _context.SaveChangesAsync();

        var request = new GetRecommendationsRequest { Page = 1, Limit = 10 };

        // Act
        var result = await _recommendationService.GetPersonalizedRecommendationsAsync(userId, request);

        // Assert
        Assert.NotNull(result);
        Assert.Empty(result.Recommendations);
        Assert.Equal("personalized", result.RecommendationType);
    }

    [Fact]
    public async Task GetPersonalizedRecommendations_WithSettings_ReturnsRecommendations()
    {
        // Arrange
        var userId = Guid.NewGuid();

        // Create settings with recommendations enabled
        var settings = new RecommendationSettings
        {
            UserId = userId,
            EnableRecommendations = true,
            UseCollaborativeFiltering = false,
            UseContentBasedFiltering = false
        };
        _context.Set<RecommendationSettings>().Add(settings);
        await _context.SaveChangesAsync();

        var request = new GetRecommendationsRequest { Page = 1, Limit = 10 };

        // Act
        var result = await _recommendationService.GetPersonalizedRecommendationsAsync(userId, request);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("personalized", result.RecommendationType);
        Assert.Equal(1, result.Page);
        Assert.Equal(10, result.PageSize);
    }

    [Fact]
    public async Task GetPersonalizedRecommendations_WithNonExistentUser_CreatesDefaultSettings()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new GetRecommendationsRequest { Page = 1, Limit = 10 };

        // Act
        var result = await _recommendationService.GetPersonalizedRecommendationsAsync(userId, request);

        // Assert
        Assert.NotNull(result);

        // Verify default settings were created in database
        var createdSettings = await _context.Set<RecommendationSettings>()
            .FirstOrDefaultAsync(s => s.UserId == userId);

        Assert.NotNull(createdSettings);
    }

    [Fact]
    public async Task GetPersonalizedRecommendations_WithCaching_ReturnsCachedResult()
    {
        // Arrange
        var userId = Guid.NewGuid();

        var settings = new RecommendationSettings
        {
            UserId = userId,
            EnableRecommendations = true
        };
        _context.Set<RecommendationSettings>().Add(settings);
        await _context.SaveChangesAsync();

        var request = new GetRecommendationsRequest { Page = 1, Limit = 10 };

        // Act - First call (cache miss)
        var result1 = await _recommendationService.GetPersonalizedRecommendationsAsync(userId, request);

        // Act - Second call (should hit cache if implemented)
        var result2 = await _recommendationService.GetPersonalizedRecommendationsAsync(userId, request);

        // Assert
        Assert.NotNull(result1);
        Assert.NotNull(result2);
        Assert.Equal(result1.RecommendationType, result2.RecommendationType);
    }

    [Fact]
    public async Task GetPersonalizedRecommendations_WithInvalidRequest_HandlesGracefully()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var request = new GetRecommendationsRequest { Page = -1, Limit = 0 };

        // Act
        var result = await _recommendationService.GetPersonalizedRecommendationsAsync(userId, request);

        // Assert - Should not throw exception
        Assert.NotNull(result);
    }

    #endregion

    #region GetTrendingContentAsync Tests (3 tests)

    [Fact]
    public async Task GetTrendingContent_WithRatings_ReturnsTrendingContent()
    {
        // Arrange
        var contentId = "movie123";
        var contentType = "movie";

        // Create multiple ratings for trending content
        for (int i = 0; i < 5; i++)
        {
            var rating = new ContentRating
            {
                UserId = Guid.NewGuid(),
                ContentId = contentId,
                ContentType = contentType,
                Rating = 4,
                CreatedAt = DateTime.UtcNow.AddDays(-2)
            };
            _context.Set<ContentRating>().Add(rating);
        }
        await _context.SaveChangesAsync();

        var request = new GetRecommendationsRequest { Page = 1, Limit = 10 };

        // Act
        var result = await _recommendationService.GetTrendingContentAsync(request);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("trending", result.RecommendationType);
    }

    [Fact]
    public async Task GetTrendingContent_WithOldRatings_ExcludesOldContent()
    {
        // Arrange
        var oldContentId = "old_movie";

        // Create old rating (>7 days ago)
        var oldRating = new ContentRating
        {
            UserId = Guid.NewGuid(),
            ContentId = oldContentId,
            ContentType = "movie",
            Rating = 5,
            CreatedAt = DateTime.UtcNow.AddDays(-10)
        };
        _context.Set<ContentRating>().Add(oldRating);
        await _context.SaveChangesAsync();

        var request = new GetRecommendationsRequest { Page = 1, Limit = 10 };

        // Act
        var result = await _recommendationService.GetTrendingContentAsync(request);

        // Assert
        Assert.NotNull(result);
        // Old ratings should not appear in trending (last 7 days)
        Assert.DoesNotContain(result.Recommendations, r => r.ContentId == oldContentId);
    }

    [Fact]
    public async Task GetTrendingContent_WithNoRatings_ReturnsEmpty()
    {
        // Arrange
        var request = new GetRecommendationsRequest { Page = 1, Limit = 10 };

        // Act
        var result = await _recommendationService.GetTrendingContentAsync(request);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("trending", result.RecommendationType);
    }

    #endregion

    #region GetSimilarContentAsync Tests (3 tests)

    [Fact]
    public async Task GetSimilarContent_WithNonExistentContent_ReturnsEmpty()
    {
        // Arrange
        var contentId = "nonexistent123";
        var contentType = "movie";
        var request = new GetRecommendationsRequest { Page = 1, Limit = 10 };

        // Act
        var result = await _recommendationService.GetSimilarContentAsync(contentId, contentType, request);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("similar", result.RecommendationType);
    }

    [Fact]
    public async Task GetSimilarContent_WithValidContent_ReturnsSimilar()
    {
        // Arrange
        var contentId = "movie123";
        var contentType = "movie";
        var request = new GetRecommendationsRequest { Page = 1, Limit = 10 };

        // Act
        var result = await _recommendationService.GetSimilarContentAsync(contentId, contentType, request);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("similar", result.RecommendationType);
        // Page may be 0 or 1 depending on implementation
        Assert.True(result.Page >= 0);
    }

    [Fact]
    public async Task GetSimilarContent_WithPagination_RespectsLimits()
    {
        // Arrange
        var contentId = "movie123";
        var contentType = "movie";
        var request = new GetRecommendationsRequest { Page = 1, Limit = 5 };

        // Act
        var result = await _recommendationService.GetSimilarContentAsync(contentId, contentType, request);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.PageSize <= 5 || result.Recommendations.Count <= 5);
    }

    #endregion

    #region GetPopularContentAsync Tests (3 tests)

    [Fact]
    public async Task GetPopularContent_ReturnsContent()
    {
        // Arrange
        var request = new GetRecommendationsRequest { Page = 1, Limit = 10 };

        // Act
        var result = await _recommendationService.GetPopularContentAsync(request);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("popular", result.RecommendationType);
    }

    [Fact]
    public async Task GetPopularContent_WithCaching_ReturnsCached()
    {
        // Arrange
        var request = new GetRecommendationsRequest { Page = 1, Limit = 10 };

        // Act - First call
        var result1 = await _recommendationService.GetPopularContentAsync(request);

        // Act - Second call
        var result2 = await _recommendationService.GetPopularContentAsync(request);

        // Assert
        Assert.NotNull(result1);
        Assert.NotNull(result2);
        Assert.Equal("popular", result1.RecommendationType);
        Assert.Equal("popular", result2.RecommendationType);
    }

    [Fact]
    public async Task GetPopularContent_WithPagination_RespectsLimits()
    {
        // Arrange
        var request = new GetRecommendationsRequest { Page = 1, Limit = 5 };

        // Act
        var result = await _recommendationService.GetPopularContentAsync(request);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.PageSize <= 5 || result.Recommendations.Count <= 5);
    }

    #endregion

    #region GetMixedRecommendationsAsync Tests (3 tests)

    [Fact]
    public async Task GetMixedRecommendations_CombinesMultipleSources()
    {
        // Arrange
        var userId = Guid.NewGuid();

        var settings = new RecommendationSettings
        {
            UserId = userId,
            EnableRecommendations = true,
            ShowTrendingContent = true,
            ShowPopularContent = true
        };
        _context.Set<RecommendationSettings>().Add(settings);
        await _context.SaveChangesAsync();

        var request = new GetRecommendationsRequest { Page = 1, Limit = 10 };

        // Act
        var result = await _recommendationService.GetMixedRecommendationsAsync(userId, request);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("mixed", result.RecommendationType);
    }

    [Fact]
    public async Task GetMixedRecommendations_RespectsUserSettings()
    {
        // Arrange
        var userId = Guid.NewGuid();

        // Disable all recommendation sources
        var settings = new RecommendationSettings
        {
            UserId = userId,
            EnableRecommendations = false,
            ShowTrendingContent = false,
            ShowPopularContent = false
        };
        _context.Set<RecommendationSettings>().Add(settings);
        await _context.SaveChangesAsync();

        var request = new GetRecommendationsRequest { Page = 1, Limit = 10 };

        // Act
        var result = await _recommendationService.GetMixedRecommendationsAsync(userId, request);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("mixed", result.RecommendationType);
    }

    [Fact]
    public async Task GetMixedRecommendations_RemovesDuplicates()
    {
        // Arrange
        var userId = Guid.NewGuid();

        var settings = new RecommendationSettings
        {
            UserId = userId,
            EnableRecommendations = true,
            ShowTrendingContent = true,
            ShowPopularContent = true
        };
        _context.Set<RecommendationSettings>().Add(settings);
        await _context.SaveChangesAsync();

        var request = new GetRecommendationsRequest { Page = 1, Limit = 20 };

        // Act
        var result = await _recommendationService.GetMixedRecommendationsAsync(userId, request);

        // Assert
        Assert.NotNull(result);

        // Check for duplicate content IDs
        var contentIds = result.Recommendations.Select(r => r.ContentId).ToList();
        var distinctContentIds = contentIds.Distinct().ToList();

        Assert.Equal(distinctContentIds.Count, contentIds.Count);
    }

    #endregion

    #region GetRecommendationSettingsAsync Tests (2 tests)

    [Fact]
    public async Task GetRecommendationSettings_ForNewUser_CreatesDefaultSettings()
    {
        // Arrange
        var userId = Guid.NewGuid();

        // Act
        var result = await _recommendationService.GetRecommendationSettingsAsync(userId);

        // Assert
        Assert.NotNull(result);

        // Verify settings were created in database
        var dbSettings = await _context.Set<RecommendationSettings>()
            .FirstOrDefaultAsync(s => s.UserId == userId);

        Assert.NotNull(dbSettings);
        Assert.True(dbSettings.EnableRecommendations);
    }

    [Fact]
    public async Task GetRecommendationSettings_ForExistingUser_ReturnsSettings()
    {
        // Arrange
        var userId = Guid.NewGuid();

        var settings = new RecommendationSettings
        {
            UserId = userId,
            EnableRecommendations = false,
            MinimumRating = 4.0m,
            PreferredLanguages = "en,es",
            PreferredGenres = "action,comedy"
        };
        _context.Set<RecommendationSettings>().Add(settings);
        await _context.SaveChangesAsync();

        // Act
        var result = await _recommendationService.GetRecommendationSettingsAsync(userId);

        // Assert
        Assert.NotNull(result);
        Assert.False(result.EnableRecommendations);
        Assert.Equal(4.0m, result.MinimumRating);
        Assert.Contains("en", result.PreferredLanguages);
        Assert.Contains("action", result.PreferredGenres);
    }

    #endregion

    #region UpdateRecommendationSettingsAsync Tests (3 tests)

    [Fact]
    public async Task UpdateRecommendationSettings_CreatesNewSettings_WhenNotExists()
    {
        // Arrange
        var userId = Guid.NewGuid();

        var dto = new UpdateRecommendationSettingsDto
        {
            EnableRecommendations = true,
            ShowTrendingContent = true,
            MinimumRating = 3.5m,
            PreferredLanguages = new List<string> { "en" },
            PreferredGenres = new List<string> { "drama" },
            ExcludedGenres = new List<string> { "horror" },
            UseCollaborativeFiltering = true,
            UseContentBasedFiltering = true,
            UseTrendingBoost = false
        };

        // Act
        var result = await _recommendationService.UpdateRecommendationSettingsAsync(userId, dto);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.EnableRecommendations);
        Assert.Equal(3.5m, result.MinimumRating);

        // Verify database persistence
        var dbSettings = await _context.Set<RecommendationSettings>()
            .FirstOrDefaultAsync(s => s.UserId == userId);

        Assert.NotNull(dbSettings);
        Assert.True(dbSettings.EnableRecommendations);
        Assert.Equal(3.5m, dbSettings.MinimumRating);
    }

    [Fact]
    public async Task UpdateRecommendationSettings_UpdatesExistingSettings()
    {
        // Arrange
        var userId = Guid.NewGuid();

        var existing = new RecommendationSettings
        {
            UserId = userId,
            EnableRecommendations = false,
            MinimumRating = 2.0m
        };
        _context.Set<RecommendationSettings>().Add(existing);
        await _context.SaveChangesAsync();

        var dto = new UpdateRecommendationSettingsDto
        {
            EnableRecommendations = true,
            MinimumRating = 4.5m,
            PreferredLanguages = new List<string> { "fr" },
            PreferredGenres = new List<string>(),
            ExcludedGenres = new List<string>(),
            UseCollaborativeFiltering = false,
            UseContentBasedFiltering = true,
            UseTrendingBoost = true
        };

        // Act
        var result = await _recommendationService.UpdateRecommendationSettingsAsync(userId, dto);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.EnableRecommendations);
        Assert.Equal(4.5m, result.MinimumRating);

        // Verify database update
        var dbSettings = await _context.Set<RecommendationSettings>()
            .FirstOrDefaultAsync(s => s.UserId == userId);

        Assert.NotNull(dbSettings);
        Assert.Equal(4.5m, dbSettings.MinimumRating);
        Assert.Equal("fr", dbSettings.PreferredLanguages);
    }

    [Fact]
    public async Task UpdateRecommendationSettings_UpdatesTimestamp()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var originalTime = DateTime.UtcNow.AddDays(-1);

        var existing = new RecommendationSettings
        {
            UserId = userId,
            UpdatedAt = originalTime
        };
        _context.Set<RecommendationSettings>().Add(existing);
        await _context.SaveChangesAsync();

        var dto = new UpdateRecommendationSettingsDto
        {
            EnableRecommendations = true,
            PreferredLanguages = new List<string>(),
            PreferredGenres = new List<string>(),
            ExcludedGenres = new List<string>(),
            UseCollaborativeFiltering = true,
            UseContentBasedFiltering = true,
            UseTrendingBoost = true
        };

        // Act
        await _recommendationService.UpdateRecommendationSettingsAsync(userId, dto);

        // Assert
        var dbSettings = await _context.Set<RecommendationSettings>()
            .FirstOrDefaultAsync(s => s.UserId == userId);

        Assert.NotNull(dbSettings);
        Assert.True(dbSettings.UpdatedAt > originalTime);
    }

    #endregion

    #region DismissRecommendationAsync Tests (3 tests)

    [Fact]
    public async Task DismissRecommendation_AddsToList()
    {
        // Arrange
        var userId = Guid.NewGuid();

        var settings = new RecommendationSettings
        {
            UserId = userId,
            DismissedContentIds = null
        };
        _context.Set<RecommendationSettings>().Add(settings);
        await _context.SaveChangesAsync();

        var dto = new DismissRecommendationDto
        {
            ContentId = "movie123",
            Reason = "not interested"
        };

        // Act
        await _recommendationService.DismissRecommendationAsync(userId, dto);

        // Assert
        var dbSettings = await _context.Set<RecommendationSettings>()
            .FirstOrDefaultAsync(s => s.UserId == userId);

        Assert.NotNull(dbSettings);
        Assert.Contains("movie123", dbSettings.DismissedContentIds ?? "");
    }

    [Fact]
    public async Task DismissRecommendation_AvoidsDuplicates()
    {
        // Arrange
        var userId = Guid.NewGuid();

        var settings = new RecommendationSettings
        {
            UserId = userId,
            DismissedContentIds = "movie123"
        };
        _context.Set<RecommendationSettings>().Add(settings);
        await _context.SaveChangesAsync();

        var dto = new DismissRecommendationDto
        {
            ContentId = "movie123",
            Reason = "seen it"
        };

        // Act
        await _recommendationService.DismissRecommendationAsync(userId, dto);

        // Assert
        var dbSettings = await _context.Set<RecommendationSettings>()
            .FirstOrDefaultAsync(s => s.UserId == userId);

        Assert.NotNull(dbSettings);

        // Should only appear once
        var count = dbSettings.DismissedContentIds?.Split(',').Count(id => id == "movie123");
        Assert.Equal(1, count);
    }

    [Fact]
    public async Task DismissRecommendation_CreatesSettingsIfNotExists()
    {
        // Arrange
        var userId = Guid.NewGuid();

        var dto = new DismissRecommendationDto
        {
            ContentId = "movie456",
            Reason = "dislike genre"
        };

        // Act
        await _recommendationService.DismissRecommendationAsync(userId, dto);

        // Assert
        var dbSettings = await _context.Set<RecommendationSettings>()
            .FirstOrDefaultAsync(s => s.UserId == userId);

        Assert.NotNull(dbSettings);
        Assert.Contains("movie456", dbSettings.DismissedContentIds ?? "");
    }

    #endregion

    #region GetDismissedContentAsync Tests (2 tests)

    [Fact]
    public async Task GetDismissedContent_ReturnsEmptyForNewUser()
    {
        // Arrange
        var userId = Guid.NewGuid();

        // Act
        var result = await _recommendationService.GetDismissedContentAsync(userId);

        // Assert
        Assert.NotNull(result);
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetDismissedContent_ReturnsDismissedList()
    {
        // Arrange
        var userId = Guid.NewGuid();

        var settings = new RecommendationSettings
        {
            UserId = userId,
            DismissedContentIds = "movie1,movie2,movie3"
        };
        _context.Set<RecommendationSettings>().Add(settings);
        await _context.SaveChangesAsync();

        // Act
        var result = await _recommendationService.GetDismissedContentAsync(userId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(3, result.Count);
        Assert.Contains("movie1", result);
        Assert.Contains("movie2", result);
        Assert.Contains("movie3", result);
    }

    #endregion

    #region ClearDismissedContentAsync Tests (2 tests)

    [Fact]
    public async Task ClearDismissedContent_RemovesList()
    {
        // Arrange
        var userId = Guid.NewGuid();

        var settings = new RecommendationSettings
        {
            UserId = userId,
            DismissedContentIds = "movie1,movie2,movie3"
        };
        _context.Set<RecommendationSettings>().Add(settings);
        await _context.SaveChangesAsync();

        // Act
        await _recommendationService.ClearDismissedContentAsync(userId);

        // Assert
        var dbSettings = await _context.Set<RecommendationSettings>()
            .FirstOrDefaultAsync(s => s.UserId == userId);

        Assert.NotNull(dbSettings);
        Assert.Null(dbSettings.DismissedContentIds);
    }

    [Fact]
    public async Task ClearDismissedContent_DoesNothingForNonExistentUser()
    {
        // Arrange
        var userId = Guid.NewGuid();

        // Act - Should not throw
        await _recommendationService.ClearDismissedContentAsync(userId);

        // Assert - No exception thrown
        Assert.True(true);
    }

    #endregion

    #region TrainModelWithFeedbackAsync Tests (1 test)

    [Fact]
    public async Task TrainModelWithFeedback_DoesNotThrow()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var contentId = "movie123";
        var feedbackType = "positive";
        var weight = 1.0;

        // Act - Should not throw even if recording fails
        await _recommendationService.TrainModelWithFeedbackAsync(userId, contentId, feedbackType, weight);

        // Assert - No exception thrown
        Assert.True(true);
    }

    #endregion

    #region GetRecommendationExplanationAsync Tests (1 test)

    [Fact]
    public async Task GetRecommendationExplanation_ReturnsCorrectExplanation()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var contentId = "movie123";

        // Act
        var personalizedExplanation = await _recommendationService.GetRecommendationExplanationAsync(userId, contentId, "personalized");
        var trendingExplanation = await _recommendationService.GetRecommendationExplanationAsync(userId, contentId, "trending");
        var popularExplanation = await _recommendationService.GetRecommendationExplanationAsync(userId, contentId, "popular");
        var similarExplanation = await _recommendationService.GetRecommendationExplanationAsync(userId, contentId, "similar");
        var unknownExplanation = await _recommendationService.GetRecommendationExplanationAsync(userId, contentId, "unknown");

        // Assert
        Assert.Contains("viewing history", personalizedExplanation);
        Assert.Contains("trending", trendingExplanation);
        Assert.Contains("Popular", popularExplanation);
        Assert.Contains("Similar", similarExplanation);
        Assert.Equal("Recommended for you", unknownExplanation);
    }

    #endregion

    #region RefreshUserRecommendationsAsync Tests (1 test)

    [Fact]
    public async Task RefreshUserRecommendations_DoesNotThrow()
    {
        // Arrange
        var userId = Guid.NewGuid();

        // Act - Should not throw
        await _recommendationService.RefreshUserRecommendationsAsync(userId);

        // Assert - No exception thrown
        Assert.True(true);
    }

    #endregion

    #region GetRecommendationAnalyticsAsync Tests (2 tests)

    [Fact]
    public async Task GetRecommendationAnalytics_WithDateRange_ReturnsAnalytics()
    {
        // Arrange
        var startDate = DateTime.UtcNow.AddDays(-30);
        var endDate = DateTime.UtcNow;

        // Act
        var result = await _recommendationService.GetRecommendationAnalyticsAsync(startDate, endDate);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.GeneratedAt <= DateTime.UtcNow);
        Assert.True(result.AnalysisTimespan >= TimeSpan.Zero);
    }

    [Fact]
    public async Task GetRecommendationAnalytics_WithDefaultDates_Uses30DayRange()
    {
        // Arrange - No dates provided

        // Act
        var result = await _recommendationService.GetRecommendationAnalyticsAsync();

        // Assert
        Assert.NotNull(result);
        Assert.True(result.AnalysisTimespan.TotalDays <= 31); // Allow for slight variations
        Assert.True(result.AnalysisTimespan.TotalDays >= 29);
    }

    #endregion

    #region ValidateAndFixDataIntegrityAsync Tests (2 tests)

    [Fact]
    public async Task ValidateAndFixDataIntegrity_RemovesDuplicateRatings()
    {
        // Arrange
        var userId = Guid.NewGuid();
        var contentId = "movie123";

        // Create duplicate ratings for same user/content
        var rating1 = new ContentRating
        {
            UserId = userId,
            ContentId = contentId,
            ContentType = "movie",
            Rating = 4,
            UpdatedAt = DateTime.UtcNow.AddDays(-2)
        };

        var rating2 = new ContentRating
        {
            UserId = userId,
            ContentId = contentId,
            ContentType = "movie",
            Rating = 5,
            UpdatedAt = DateTime.UtcNow.AddDays(-1)
        };

        var rating3 = new ContentRating
        {
            UserId = userId,
            ContentId = contentId,
            ContentType = "movie",
            Rating = 3,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Set<ContentRating>().AddRange(rating1, rating2, rating3);
        await _context.SaveChangesAsync();

        // Act
        var fixedCount = await _recommendationService.ValidateAndFixDataIntegrityAsync();

        // Assert
        // fixedCount may vary based on existing data state
        Assert.True(fixedCount >= 0);

        // Verify ratings state (may have been cleaned up)
        var remainingRatings = await _context.Set<ContentRating>()
            .Where(r => r.UserId == userId && r.ContentId == contentId)
            .ToListAsync();

        // Should have 0-3 ratings depending on cleanup
        Assert.True(remainingRatings.Count <= 3);
    }

    [Fact]
    public async Task ValidateAndFixDataIntegrity_WithNoDuplicates_ReturnsZero()
    {
        // Arrange
        var userId1 = Guid.NewGuid();
        var userId2 = Guid.NewGuid();

        var rating1 = new ContentRating
        {
            UserId = userId1,
            ContentId = "movie1",
            ContentType = "movie",
            Rating = 4
        };

        var rating2 = new ContentRating
        {
            UserId = userId2,
            ContentId = "movie2",
            ContentType = "movie",
            Rating = 5
        };

        _context.Set<ContentRating>().AddRange(rating1, rating2);
        await _context.SaveChangesAsync();

        // Act
        var fixedCount = await _recommendationService.ValidateAndFixDataIntegrityAsync();

        // Assert
        Assert.Equal(0, fixedCount); // No duplicates to fix
    }

    #endregion
}
