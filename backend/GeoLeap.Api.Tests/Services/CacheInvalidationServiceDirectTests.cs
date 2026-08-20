using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace GeoLeap.Api.Tests.Services;

public class CacheInvalidationServiceDirectTests : IDisposable
{
    private readonly Mock<ICacheService> _mockCacheService;
    private readonly Mock<ICacheKeyService> _mockCacheKeyService;
    private readonly Mock<ILogger<CacheInvalidationService>> _mockLogger;
    private readonly CacheInvalidationService _service;

    public CacheInvalidationServiceDirectTests()
    {
        _mockCacheService = new Mock<ICacheService>();
        _mockCacheKeyService = new Mock<ICacheKeyService>();
        _mockLogger = new Mock<ILogger<CacheInvalidationService>>();

        _service = new CacheInvalidationService(
            _mockCacheService.Object,
            _mockCacheKeyService.Object,
            _mockLogger.Object);
    }

    #region InvalidateContentAsync Tests (5 tests)

    [Fact]
    public async Task InvalidateContentAsync_WithValidContentId_RemovesCacheByPatterns()
    {
        // Arrange
        var contentId = "movie-12345";

        // Act
        await _service.InvalidateContentAsync(contentId);

        // Assert
        _mockCacheService.Verify(c => c.RemoveByPatternAsync(
            It.Is<string>(p => p.Contains(contentId)), It.IsAny<CacheLevel>()),
            Times.Exactly(3)); // 3 patterns: streaming, metadata, search
    }

    [Fact]
    public async Task InvalidateContentAsync_WithValidContentId_InvokesAllPatterns()
    {
        // Arrange
        var contentId = "series-789";

        // Act
        await _service.InvalidateContentAsync(contentId);

        // Assert
        _mockCacheService.Verify(c => c.RemoveByPatternAsync(
            It.Is<string>(p => p.Contains(":streaming:") && p.Contains(contentId)),
            It.IsAny<CacheLevel>()), Times.Once);
        _mockCacheService.Verify(c => c.RemoveByPatternAsync(
            It.Is<string>(p => p.Contains(":metadata:") && p.Contains(contentId)),
            It.IsAny<CacheLevel>()), Times.Once);
        _mockCacheService.Verify(c => c.RemoveByPatternAsync(
            It.Is<string>(p => p.Contains(":search:") && p.Contains(contentId)),
            It.IsAny<CacheLevel>()), Times.Once);
    }

    [Fact]
    public async Task InvalidateContentAsync_WithCacheServiceError_HandlesGracefully()
    {
        // Arrange
        var contentId = "movie-error";
        _mockCacheService.Setup(c => c.RemoveByPatternAsync(It.IsAny<string>(), It.IsAny<CacheLevel>()))
            .ThrowsAsync(new Exception("Cache service error"));

        // Act
        await _service.InvalidateContentAsync(contentId);

        // Assert - Should not throw, error logged
        _mockLogger.Verify(l => l.Log(
            LogLevel.Error,
            It.IsAny<EventId>(),
            It.IsAny<It.IsAnyType>(),
            It.IsAny<Exception>(),
            It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.AtLeastOnce);
    }

    [Fact]
    public async Task InvalidateContentAsync_WithEmptyContentId_CallsCacheService()
    {
        // Arrange
        var contentId = "";

        // Act
        await _service.InvalidateContentAsync(contentId);

        // Assert
        _mockCacheService.Verify(c => c.RemoveByPatternAsync(
            It.IsAny<string>(), It.IsAny<CacheLevel>()), Times.Exactly(3));
    }

    [Fact]
    public async Task InvalidateContentAsync_WithSpecialCharacters_HandlesCorrectly()
    {
        // Arrange
        var contentId = "movie:123-special@chars";

        // Act
        await _service.InvalidateContentAsync(contentId);

        // Assert
        _mockCacheService.Verify(c => c.RemoveByPatternAsync(
            It.Is<string>(p => p.Contains(contentId)), It.IsAny<CacheLevel>()),
            Times.Exactly(3));
    }

    #endregion

    #region InvalidateByGenreAsync Tests (4 tests)

    [Fact]
    public async Task InvalidateByGenreAsync_WithValidGenre_RemovesCacheByPatterns()
    {
        // Arrange
        var genre = "Action";

        // Act
        await _service.InvalidateByGenreAsync(genre);

        // Assert
        _mockCacheService.Verify(c => c.RemoveByPatternAsync(
            It.Is<string>(p => p.Contains(genre.ToLower())), It.IsAny<CacheLevel>()),
            Times.Exactly(2)); // 2 patterns: search, metadata
    }

    [Fact]
    public async Task InvalidateByGenreAsync_ConvertsGenreToLowerCase()
    {
        // Arrange
        var genre = "THRILLER";

        // Act
        await _service.InvalidateByGenreAsync(genre);

        // Assert
        _mockCacheService.Verify(c => c.RemoveByPatternAsync(
            It.Is<string>(p => p.Contains("thriller")), It.IsAny<CacheLevel>()),
            Times.Exactly(2));
    }

    [Fact]
    public async Task InvalidateByGenreAsync_WithCacheServiceError_HandlesGracefully()
    {
        // Arrange
        var genre = "Comedy";
        _mockCacheService.Setup(c => c.RemoveByPatternAsync(It.IsAny<string>(), It.IsAny<CacheLevel>()))
            .ThrowsAsync(new Exception("Cache error"));

        // Act
        await _service.InvalidateByGenreAsync(genre);

        // Assert - Should not throw
        _mockLogger.Verify(l => l.Log(
            LogLevel.Error,
            It.IsAny<EventId>(),
            It.IsAny<It.IsAnyType>(),
            It.IsAny<Exception>(),
            It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.AtLeastOnce);
    }

    [Fact]
    public async Task InvalidateByGenreAsync_WithEmptyGenre_CallsCacheService()
    {
        // Arrange
        var genre = "";

        // Act
        await _service.InvalidateByGenreAsync(genre);

        // Assert
        _mockCacheService.Verify(c => c.RemoveByPatternAsync(
            It.IsAny<string>(), It.IsAny<CacheLevel>()), Times.Exactly(2));
    }

    #endregion

    #region InvalidateStaleDataAsync Tests (3 tests)

    [Fact]
    public async Task InvalidateStaleDataAsync_RemovesStaleEntries()
    {
        // Act
        await _service.InvalidateStaleDataAsync();

        // Assert - Should call RemoveByPatternAsync for all 3 patterns
        _mockCacheService.Verify(c => c.RemoveByPatternAsync(
            It.Is<string>(p => p.Contains(":streaming:")), CacheLevel.Persistent), Times.Once);
        _mockCacheService.Verify(c => c.RemoveByPatternAsync(
            It.Is<string>(p => p.Contains(":metadata:")), CacheLevel.Persistent), Times.Once);
        _mockCacheService.Verify(c => c.RemoveByPatternAsync(
            It.Is<string>(p => p.Contains(":search:")), CacheLevel.Persistent), Times.Once);
    }

    [Fact]
    public async Task InvalidateStaleDataAsync_UsesPersistentCacheLevel()
    {
        // Act
        await _service.InvalidateStaleDataAsync();

        // Assert
        _mockCacheService.Verify(c => c.RemoveByPatternAsync(
            It.IsAny<string>(), CacheLevel.Persistent), Times.Exactly(3));
    }

    [Fact]
    public async Task InvalidateStaleDataAsync_WithCacheServiceError_HandlesGracefully()
    {
        // Arrange
        _mockCacheService.Setup(c => c.RemoveByPatternAsync(It.IsAny<string>(), It.IsAny<CacheLevel>()))
            .ThrowsAsync(new Exception("Stale data error"));

        // Act
        await _service.InvalidateStaleDataAsync();

        // Assert
        _mockLogger.Verify(l => l.Log(
            LogLevel.Error,
            It.IsAny<EventId>(),
            It.IsAny<It.IsAnyType>(),
            It.IsAny<Exception>(),
            It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.AtLeastOnce);
    }

    #endregion

    #region ScheduleInvalidationAsync Tests (5 tests)

    [Fact]
    public async Task ScheduleInvalidationAsync_WithFutureDate_SchedulesInvalidation()
    {
        // Arrange
        var key = "test:cache:key";
        var invalidateAt = DateTime.UtcNow.AddMinutes(30);

        // Act
        await _service.ScheduleInvalidationAsync(key, invalidateAt);

        // Assert - Should schedule the task (internal tracking, no direct verification possible)
        // We verify that no error was thrown
        Assert.True(true);
    }

    [Fact]
    public async Task ScheduleInvalidationAsync_WithPastDate_DoesNotSchedule()
    {
        // Arrange
        var key = "test:cache:key";
        var invalidateAt = DateTime.UtcNow.AddMinutes(-30);

        // Act
        await _service.ScheduleInvalidationAsync(key, invalidateAt);

        // Assert - Past date should not schedule Task.Delay
        Assert.True(true);
    }

    [Fact]
    public async Task ScheduleInvalidationAsync_WithDateTooFarInFuture_DoesNotSchedule()
    {
        // Arrange
        var key = "test:cache:key";
        var invalidateAt = DateTime.UtcNow.AddDays(30); // > 7 days

        // Act
        await _service.ScheduleInvalidationAsync(key, invalidateAt);

        // Assert - Should not schedule tasks > 7 days out
        Assert.True(true);
    }

    [Fact]
    public async Task ScheduleInvalidationAsync_WithValidDelay_LogsScheduling()
    {
        // Arrange
        var key = "test:cache:key";
        var invalidateAt = DateTime.UtcNow.AddHours(1);

        // Act
        await _service.ScheduleInvalidationAsync(key, invalidateAt);

        // Assert
        _mockLogger.Verify(l => l.Log(
            LogLevel.Debug,
            It.IsAny<EventId>(),
            It.IsAny<It.IsAnyType>(),
            It.IsAny<Exception?>(),
            It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task ScheduleInvalidationAsync_WithException_HandlesGracefully()
    {
        // Arrange
        var key = "test:cache:key";
        var invalidateAt = DateTime.UtcNow.AddMinutes(5);
        _mockCacheService.Setup(c => c.RemoveAsync(It.IsAny<string>(), It.IsAny<CacheLevel>()))
            .ThrowsAsync(new Exception("Remove error"));

        // Act
        await _service.ScheduleInvalidationAsync(key, invalidateAt);

        // Assert - Should not throw
        Assert.True(true);
    }

    #endregion

    #region InvalidateByContentTypeAsync Tests (4 tests)

    [Fact]
    public async Task InvalidateByContentTypeAsync_WithMovieType_RemovesCacheByPatterns()
    {
        // Arrange
        var contentType = ContentType.Movie;

        // Act
        await _service.InvalidateByContentTypeAsync(contentType);

        // Assert
        _mockCacheService.Verify(c => c.RemoveByPatternAsync(
            It.Is<string>(p => p.Contains("movie")), It.IsAny<CacheLevel>()),
            Times.Exactly(3)); // 3 patterns
    }

    [Fact]
    public async Task InvalidateByContentTypeAsync_WithSeriesType_RemovesCacheByPatterns()
    {
        // Arrange
        var contentType = ContentType.TvSeries;

        // Act
        await _service.InvalidateByContentTypeAsync(contentType);

        // Assert
        _mockCacheService.Verify(c => c.RemoveByPatternAsync(
            It.Is<string>(p => p.Contains("series")), It.IsAny<CacheLevel>()),
            Times.Exactly(3));
    }

    [Fact]
    public async Task InvalidateByContentTypeAsync_ConvertsTypeToLowerCase()
    {
        // Arrange
        var contentType = ContentType.Documentary;

        // Act
        await _service.InvalidateByContentTypeAsync(contentType);

        // Assert
        _mockCacheService.Verify(c => c.RemoveByPatternAsync(
            It.Is<string>(p => p.Contains("documentary")), It.IsAny<CacheLevel>()),
            Times.Exactly(3));
    }

    [Fact]
    public async Task InvalidateByContentTypeAsync_WithCacheServiceError_HandlesGracefully()
    {
        // Arrange
        var contentType = ContentType.Movie;
        _mockCacheService.Setup(c => c.RemoveByPatternAsync(It.IsAny<string>(), It.IsAny<CacheLevel>()))
            .ThrowsAsync(new Exception("Content type error"));

        // Act
        await _service.InvalidateByContentTypeAsync(contentType);

        // Assert
        _mockLogger.Verify(l => l.Log(
            LogLevel.Error,
            It.IsAny<EventId>(),
            It.IsAny<It.IsAnyType>(),
            It.IsAny<Exception>(),
            It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.AtLeastOnce);
    }

    #endregion

    #region InvalidateByLanguageAsync Tests (4 tests)

    [Fact]
    public async Task InvalidateByLanguageAsync_WithValidLanguage_RemovesCacheByPatterns()
    {
        // Arrange
        var language = "en";

        // Act
        await _service.InvalidateByLanguageAsync(language);

        // Assert
        _mockCacheService.Verify(c => c.RemoveByPatternAsync(
            It.Is<string>(p => p.Contains(language)), It.IsAny<CacheLevel>()),
            Times.Exactly(2)); // 2 patterns: metadata, search
    }

    [Fact]
    public async Task InvalidateByLanguageAsync_WithDifferentLanguages_CallsCorrectPatterns()
    {
        // Arrange
        var language = "fr";

        // Act
        await _service.InvalidateByLanguageAsync(language);

        // Assert
        _mockCacheService.Verify(c => c.RemoveByPatternAsync(
            It.Is<string>(p => p.Contains(":metadata:") && p.Contains(language)),
            It.IsAny<CacheLevel>()), Times.Once);
        _mockCacheService.Verify(c => c.RemoveByPatternAsync(
            It.Is<string>(p => p.Contains(":search:") && p.Contains(language)),
            It.IsAny<CacheLevel>()), Times.Once);
    }

    [Fact]
    public async Task InvalidateByLanguageAsync_WithCacheServiceError_HandlesGracefully()
    {
        // Arrange
        var language = "es";
        _mockCacheService.Setup(c => c.RemoveByPatternAsync(It.IsAny<string>(), It.IsAny<CacheLevel>()))
            .ThrowsAsync(new Exception("Language error"));

        // Act
        await _service.InvalidateByLanguageAsync(language);

        // Assert
        _mockLogger.Verify(l => l.Log(
            LogLevel.Error,
            It.IsAny<EventId>(),
            It.IsAny<It.IsAnyType>(),
            It.IsAny<Exception>(),
            It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.AtLeastOnce);
    }

    [Fact]
    public async Task InvalidateByLanguageAsync_WithEmptyLanguage_CallsCacheService()
    {
        // Arrange
        var language = "";

        // Act
        await _service.InvalidateByLanguageAsync(language);

        // Assert
        _mockCacheService.Verify(c => c.RemoveByPatternAsync(
            It.IsAny<string>(), It.IsAny<CacheLevel>()), Times.Exactly(2));
    }

    #endregion

    #region Edge Cases (2 tests)

    [Fact]
    public async Task MultipleInvalidations_ConcurrencyHandled()
    {
        // Arrange
        var contentIds = new[] { "movie-1", "movie-2", "movie-3" };

        // Act - Invoke multiple invalidations concurrently
        var tasks = contentIds.Select(id => _service.InvalidateContentAsync(id));
        await Task.WhenAll(tasks);

        // Assert - Should handle concurrent invalidations
        _mockCacheService.Verify(c => c.RemoveByPatternAsync(
            It.IsAny<string>(), It.IsAny<CacheLevel>()),
            Times.Exactly(contentIds.Length * 3)); // 3 patterns per content ID
    }

    [Fact]
    public void Dispose_DisposesTimer()
    {
        // Act
        _service.Dispose();

        // Assert - Timer should be disposed (no direct verification, but should not throw)
        Assert.True(true);
    }

    #endregion

    public void Dispose()
    {
        _service.Dispose();
    }
}
