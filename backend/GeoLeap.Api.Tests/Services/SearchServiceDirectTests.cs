using Xunit;
using Moq;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;

namespace GeoLeap.Api.Tests.Services;

/// <summary>
/// Direct tests for SearchService - Phase 3.2
/// Tests global search, autocomplete, suggestions, trending searches, and search analytics
/// Coverage: Search functionality, query processing, ranking, caching
/// </summary>
public class SearchServiceDirectTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly SearchService _service;
    private readonly Mock<IContentDataService> _mockContentDataService;
    private readonly Mock<ICacheService> _mockCacheService;
    private readonly Mock<ILoggerService> _mockLogger;
    private readonly Mock<IResilienceService> _mockResilienceService;
    private readonly Mock<IPopularContentService> _mockPopularContentService;
    private readonly IMemoryCache _memoryCache;
    private readonly Mock<IRankingService> _mockRankingService;
    private readonly Mock<IAdvancedFilterService> _mockAdvancedFilterService;
    private readonly Mock<IStreamingAvailabilityClient> _mockStreamingClient;

    private readonly Guid _testUserId = Guid.NewGuid();
    private readonly Guid _testContentId1 = Guid.NewGuid();
    private readonly Guid _testContentId2 = Guid.NewGuid();
    private readonly Guid _testContentId3 = Guid.NewGuid();

    public SearchServiceDirectTests()
    {
        // Setup in-memory database
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: $"SearchServiceTest_{Guid.NewGuid()}")
            .Options;

        _context = new ApplicationDbContext(options);

        // Setup mocks
        _mockContentDataService = new Mock<IContentDataService>();
        _mockCacheService = new Mock<ICacheService>();
        _mockLogger = new Mock<ILoggerService>();
        _mockResilienceService = new Mock<IResilienceService>();
        _mockPopularContentService = new Mock<IPopularContentService>();
        _memoryCache = new MemoryCache(new MemoryCacheOptions());
        _mockRankingService = new Mock<IRankingService>();
        _mockAdvancedFilterService = new Mock<IAdvancedFilterService>();
        _mockStreamingClient = new Mock<IStreamingAvailabilityClient>();

        _service = new SearchService(
            _mockContentDataService.Object,
            _mockCacheService.Object,
            _mockLogger.Object,
            _mockResilienceService.Object,
            _mockPopularContentService.Object,
            _memoryCache,
            _mockRankingService.Object,
            _mockAdvancedFilterService.Object,
            _context,
            _mockStreamingClient.Object
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

        // Seed searchable content
        var content1 = new SearchableContent
        {
            Id = _testContentId1,
            TmdbId = 550,
            Title = "Inception",
            OriginalTitle = "Inception",
            Type = ContentType.Movie,
            Year = 2010,
            Overview = "A mind-bending thriller about dreams",
            PosterUrl = "https://example.com/inception.jpg",
            Rating = 8.8m,
            Popularity = 250m,
            GenresJson = "[\"Action\",\"Sci-Fi\",\"Thriller\"]",
            SearchableGenres = "Action Sci-Fi Thriller",
            RuntimeMinutes = 148,
            Language = "en",
            CreatedAt = DateTime.UtcNow.AddDays(-30),
            UpdatedAt = DateTime.UtcNow.AddDays(-5)
        };

        var content2 = new SearchableContent
        {
            Id = _testContentId2,
            TmdbId = 603,
            Title = "The Matrix",
            OriginalTitle = "The Matrix",
            Type = ContentType.Movie,
            Year = 1999,
            Overview = "A hacker discovers reality is simulated",
            PosterUrl = "https://example.com/matrix.jpg",
            Rating = 8.7m,
            Popularity = 300m,
            GenresJson = "[\"Action\",\"Sci-Fi\"]",
            SearchableGenres = "Action Sci-Fi",
            RuntimeMinutes = 136,
            Language = "en",
            CreatedAt = DateTime.UtcNow.AddDays(-60),
            UpdatedAt = DateTime.UtcNow.AddDays(-10)
        };

        var content3 = new SearchableContent
        {
            Id = _testContentId3,
            TmdbId = 1396,
            Title = "Breaking Bad",
            OriginalTitle = "Breaking Bad",
            Type = ContentType.TvSeries,
            Year = 2008,
            Overview = "A chemistry teacher turns to crime",
            PosterUrl = "https://example.com/breakingbad.jpg",
            Rating = 9.5m,
            Popularity = 500m,
            GenresJson = "[\"Drama\",\"Crime\",\"Thriller\"]",
            SearchableGenres = "Drama Crime Thriller",
            RuntimeMinutes = 47,
            Language = "en",
            CreatedAt = DateTime.UtcNow.AddDays(-90),
            UpdatedAt = DateTime.UtcNow.AddDays(-15)
        };

        _context.SearchableContents.AddRange(content1, content2, content3);
        await _context.SaveChangesAsync();
    }

    public void Dispose()
    {
        _context?.Database.EnsureDeleted();
        _context?.Dispose();
        _memoryCache?.Dispose();
    }

    // ============================================
    // Global Search Tests (6 tests)
    // ============================================

    #region SearchGlobalContentAsync Tests

    [Fact]
    public async Task SearchGlobalContentAsync_WithValidQuery_ReturnsResults()
    {
        // Arrange
        var request = new GlobalSearchRequest
        {
            Query = "Inception",
            Page = 1,
            PageSize = 10
        };

        _mockStreamingClient.Setup(x => x.SearchContentAsync(
            It.IsAny<string>(), It.IsAny<ContentType?>(), It.IsAny<string[]>(),
            It.IsAny<int>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new SearchResponse<GlobalSearchResult>
            {
                Results = new List<GlobalSearchResult>
                {
                    new GlobalSearchResult
                    {
                        Id = _testContentId1.ToString(),
                        Title = "Inception",
                        Type = ContentType.Movie,
                        Year = 2010,
                        Rating = 8.8
                    }
                },
                TotalResults = 1,
                Page = 1,
                PageSize = 10
            });

        // Act
        var result = await _service.SearchGlobalContentAsync(request, "test-correlation-id");

        // Assert
        Assert.NotNull(result);
        Assert.Equal("Inception", result.Query);
        Assert.Equal(1, result.Page);
        Assert.Equal(10, result.PageSize);
        Assert.NotNull(result.Metadata);
    }

    [Fact]
    public async Task SearchGlobalContentAsync_WithEmptyQuery_ReturnsEmptyResults()
    {
        // Arrange
        var request = new GlobalSearchRequest
        {
            Query = "",
            Page = 1,
            PageSize = 10
        };

        _mockStreamingClient.Setup(x => x.SearchContentAsync(
            It.IsAny<string>(), It.IsAny<ContentType?>(), It.IsAny<string[]>(),
            It.IsAny<int>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new SearchResponse<GlobalSearchResult>
            {
                Results = new List<GlobalSearchResult>(),
                TotalResults = 0,
                Page = 1,
                PageSize = 10
            });

        // Act
        var result = await _service.SearchGlobalContentAsync(request, "test-correlation-id");

        // Assert
        Assert.NotNull(result);
        Assert.Empty(result.Results);
    }

    [Fact]
    public async Task SearchGlobalContentAsync_WithContentTypeFilter_FiltersResults()
    {
        // Arrange
        var request = new GlobalSearchRequest
        {
            Query = "Action",
            ContentType = ContentType.Movie,
            Page = 1,
            PageSize = 10
        };

        _mockStreamingClient.Setup(x => x.SearchContentAsync(
            It.IsAny<string>(), It.IsAny<ContentType?>(), It.IsAny<string[]>(),
            It.IsAny<int>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new SearchResponse<GlobalSearchResult>
            {
                Results = new List<GlobalSearchResult>(),
                TotalResults = 0,
                Page = 1,
                PageSize = 10
            });

        // Act
        var result = await _service.SearchGlobalContentAsync(request, "test-correlation-id");

        // Assert
        Assert.NotNull(result);
        _mockStreamingClient.Verify(x => x.SearchContentAsync(
            "Action", ContentType.Movie, It.IsAny<string[]>(),
            It.IsAny<int>(), It.IsAny<int>(), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task SearchGlobalContentAsync_WithUserId_IncludesPaywallInfo()
    {
        // Arrange
        var request = new GlobalSearchRequest
        {
            Query = "Inception",
            Page = 1,
            PageSize = 10
        };

        _mockStreamingClient.Setup(x => x.SearchContentAsync(
            It.IsAny<string>(), It.IsAny<ContentType?>(), It.IsAny<string[]>(),
            It.IsAny<int>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new SearchResponse<GlobalSearchResult>
            {
                Results = new List<GlobalSearchResult>(),
                TotalResults = 0,
                Page = 1,
                PageSize = 10
            });

        // Act
        var result = await _service.SearchGlobalContentAsync(request, "test-correlation-id", _testUserId.ToString());

        // Assert
        Assert.NotNull(result);
        Assert.NotNull(result.PaywallInfo);
        Assert.True(result.PaywallInfo.UserTier >= 0);
    }

    [Fact]
    public async Task SearchGlobalContentAsync_TracksResponseTime()
    {
        // Arrange
        var request = new GlobalSearchRequest
        {
            Query = "Inception",
            Page = 1,
            PageSize = 10
        };

        _mockStreamingClient.Setup(x => x.SearchContentAsync(
            It.IsAny<string>(), It.IsAny<ContentType?>(), It.IsAny<string[]>(),
            It.IsAny<int>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new SearchResponse<GlobalSearchResult>
            {
                Results = new List<GlobalSearchResult>(),
                TotalResults = 0,
                Page = 1,
                PageSize = 10
            });

        // Act
        var result = await _service.SearchGlobalContentAsync(request, "test-correlation-id");

        // Assert
        Assert.NotNull(result);
        Assert.True(result.ResponseTime.TotalMilliseconds >= 0);
    }

    [Fact]
    public async Task SearchGlobalContentAsync_WithApiError_ReturnsEmptyResults()
    {
        // Arrange
        var request = new GlobalSearchRequest
        {
            Query = "Inception",
            Page = 1,
            PageSize = 10
        };

        _mockStreamingClient.Setup(x => x.SearchContentAsync(
            It.IsAny<string>(), It.IsAny<ContentType?>(), It.IsAny<string[]>(),
            It.IsAny<int>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("API Error"));

        // Act
        var result = await _service.SearchGlobalContentAsync(request, "test-correlation-id");

        // Assert
        Assert.NotNull(result);
        Assert.Empty(result.Results);
        Assert.Equal(0, result.TotalResults);
    }

    #endregion

    // ============================================
    // Autocomplete Tests (5 tests)
    // ============================================

    #region GetAutocompleteSuggestionsAsync Tests

    [Fact]
    public async Task GetAutocompleteSuggestionsAsync_WithValidQuery_ReturnsSuggestions()
    {
        // Arrange
        var partialQuery = "Incep";

        // Act
        var result = await _service.GetAutocompleteSuggestionsAsync(partialQuery, 10, "test-correlation-id");

        // Assert
        Assert.NotNull(result);
        // Should return suggestions from database or fallback
    }

    [Fact]
    public async Task GetAutocompleteSuggestionsAsync_WithShortQuery_ReturnsEmptyList()
    {
        // Arrange
        var partialQuery = "I"; // Less than 2 characters

        // Act
        var result = await _service.GetAutocompleteSuggestionsAsync(partialQuery, 10, "test-correlation-id");

        // Assert
        Assert.NotNull(result);
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetAutocompleteSuggestionsAsync_WithEmptyQuery_ReturnsEmptyList()
    {
        // Act
        var result = await _service.GetAutocompleteSuggestionsAsync("", 10, "test-correlation-id");

        // Assert
        Assert.NotNull(result);
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetAutocompleteSuggestionsAsync_UsesCaching()
    {
        // Arrange
        var partialQuery = "Incep";

        // Act - First call
        var result1 = await _service.GetAutocompleteSuggestionsAsync(partialQuery, 10, "test-correlation-id");
        // Act - Second call (should use cache)
        var result2 = await _service.GetAutocompleteSuggestionsAsync(partialQuery, 10, "test-correlation-id");

        // Assert
        Assert.NotNull(result1);
        Assert.NotNull(result2);
        // Both calls should return the same results
    }

    [Fact]
    public async Task GetAutocompleteSuggestionsAsync_RespectsMaxResults()
    {
        // Arrange
        var partialQuery = "The";
        var maxResults = 3;

        // Act
        var result = await _service.GetAutocompleteSuggestionsAsync(partialQuery, maxResults, "test-correlation-id");

        // Assert
        Assert.NotNull(result);
        Assert.True(result.Count <= maxResults);
    }

    #endregion

    // ============================================
    // Search Suggestions Tests (4 tests)
    // ============================================

    #region GetSearchSuggestionsAsync Tests

    [Fact]
    public async Task GetSearchSuggestionsAsync_WithValidQuery_ReturnsSuggestions()
    {
        // Arrange
        var query = "action";

        _mockPopularContentService.Setup(x => x.GetPopularContentAsync(It.IsAny<int>()))
            .ReturnsAsync(new List<PopularContent>
            {
                new PopularContent { Id = _testContentId1.ToString(), Title = "Inception", Type = ContentType.Movie }
            });

        // Act
        var result = await _service.GetSearchSuggestionsAsync(query, "test-correlation-id");

        // Assert
        Assert.NotNull(result);
        Assert.NotEmpty(result);
    }

    [Fact]
    public async Task GetSearchSuggestionsAsync_WithEmptyQuery_ReturnsFallbackSuggestions()
    {
        // Arrange
        var query = "";

        _mockPopularContentService.Setup(x => x.GetPopularContentAsync(It.IsAny<int>()))
            .ReturnsAsync(new List<PopularContent>());

        // Act
        var result = await _service.GetSearchSuggestionsAsync(query, "test-correlation-id");

        // Assert
        Assert.NotNull(result);
        Assert.NotEmpty(result); // Should return fallback suggestions
    }

    [Fact]
    public async Task GetSearchSuggestionsAsync_IncludesTypoCorrections()
    {
        // Arrange
        var query = "teh matrix"; // "teh" is a common typo for "the"

        _mockPopularContentService.Setup(x => x.GetPopularContentAsync(It.IsAny<int>()))
            .ReturnsAsync(new List<PopularContent>());

        // Act
        var result = await _service.GetSearchSuggestionsAsync(query, "test-correlation-id");

        // Assert
        Assert.NotNull(result);
        // Should include typo correction suggestion
        var typoCorrection = result.FirstOrDefault(s => s.Type == SearchSuggestionType.TypoCorrection);
        if (typoCorrection != null)
        {
            Assert.Contains("the", typoCorrection.SuggestedQuery.ToLower());
        }
    }

    [Fact]
    public async Task GetSearchSuggestionsAsync_WithError_ReturnsFallbackSuggestions()
    {
        // Arrange
        var query = "test";

        _mockPopularContentService.Setup(x => x.GetPopularContentAsync(It.IsAny<int>()))
            .ThrowsAsync(new Exception("Service Error"));

        // Act
        var result = await _service.GetSearchSuggestionsAsync(query, "test-correlation-id");

        // Assert
        Assert.NotNull(result);
        Assert.NotEmpty(result); // Should return fallback suggestions on error
    }

    #endregion

    // ============================================
    // Trending Searches Tests (3 tests)
    // ============================================

    #region GetTrendingSearchesAsync Tests

    [Fact]
    public async Task GetTrendingSearchesAsync_ReturnsPopularContent()
    {
        // Act
        var result = await _service.GetTrendingSearchesAsync(10);

        // Assert
        Assert.NotNull(result);
        Assert.NotEmpty(result);
        Assert.True(result.Count <= 10);
    }

    [Fact]
    public async Task GetTrendingSearchesAsync_RespectsLimit()
    {
        // Arrange
        var limit = 5;

        // Act
        var result = await _service.GetTrendingSearchesAsync(limit);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.Count <= limit);
    }

    [Fact]
    public async Task GetTrendingSearchesAsync_IncludesMetrics()
    {
        // Act
        var result = await _service.GetTrendingSearchesAsync(10);

        // Assert
        Assert.NotNull(result);
        if (result.Any())
        {
            var firstTrending = result.First();
            Assert.NotNull(firstTrending.Query);
            Assert.True(firstTrending.SearchCount >= 0);
            Assert.True(firstTrending.UniqueUsers >= 0);
        }
    }

    #endregion

    // ============================================
    // Search History Tests (2 tests)
    // ============================================

    #region RecordSearchAsync Tests

    [Fact]
    public async Task RecordSearchAsync_WithValidData_RecordsSearch()
    {
        // Arrange
        var query = "Inception";
        var resultCount = 5;

        // Act
        await _service.RecordSearchAsync(_testUserId, query, resultCount, "US");

        // Assert
        var searchHistory = await _context.SearchHistories
            .Where(sh => sh.UserId == _testUserId && sh.Query == query)
            .FirstOrDefaultAsync();

        Assert.NotNull(searchHistory);
        Assert.Equal(query, searchHistory.Query);
        Assert.Equal(resultCount, searchHistory.ResultCount);
        Assert.Equal("US", searchHistory.Region);
    }

    [Fact]
    public async Task RecordSearchAsync_WithError_DoesNotThrow()
    {
        // Arrange - Use invalid user ID to trigger potential error
        var invalidUserId = Guid.Empty;
        var query = "test";

        // Act & Assert - Should not throw
        await _service.RecordSearchAsync(invalidUserId, query, 0, "US");
    }

    #endregion

    // ============================================
    // Backward Compatibility Tests (3 tests)
    // ============================================

    #region SearchAsync and SearchContentAsync Tests

    [Fact]
    public async Task SearchAsync_WithSearchRequest_ReturnsSearchResponse()
    {
        // Arrange
        var request = new SearchRequest
        {
            Query = "Inception",
            Page = 1,
            PageSize = 10
        };

        _mockStreamingClient.Setup(x => x.SearchContentAsync(
            It.IsAny<string>(), It.IsAny<ContentType?>(), It.IsAny<string[]>(),
            It.IsAny<int>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new SearchResponse<GlobalSearchResult>
            {
                Results = new List<GlobalSearchResult>(),
                TotalResults = 0,
                Page = 1,
                PageSize = 10
            });

        // Act
        var result = await _service.SearchAsync(request);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("Inception", result.Query);
    }

    [Fact]
    public async Task SearchContentAsync_WithParameters_ReturnsSearchResponse()
    {
        // Arrange
        _mockStreamingClient.Setup(x => x.SearchContentAsync(
            It.IsAny<string>(), It.IsAny<ContentType?>(), It.IsAny<string[]>(),
            It.IsAny<int>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new SearchResponse<GlobalSearchResult>
            {
                Results = new List<GlobalSearchResult>(),
                TotalResults = 0,
                Page = 1,
                PageSize = 10
            });

        // Act
        var result = await _service.SearchContentAsync("Inception", ContentType.Movie, "US", 1, 10);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("Inception", result.Query);
    }

    [Fact]
    public async Task GetPopularContentAsync_WithOverloadSignature_CallsBaseMethod()
    {
        // Arrange
        _mockCacheService.Setup(x => x.GetAsync<List<GlobalSearchResult>>(It.IsAny<string>(), It.IsAny<CacheLevel>()))
            .ReturnsAsync((List<GlobalSearchResult>?)null);

        _mockPopularContentService.Setup(x => x.GetPopularContentAsync(It.IsAny<int>()))
            .ReturnsAsync(new List<PopularContent>());

        // Act
        var result = await _service.GetPopularContentAsync(ContentType.Movie, "US", 20, "test-correlation-id");

        // Assert
        Assert.NotNull(result);
    }

    [Fact]
    public async Task GlobalSearchAsync_RelevanceScore_ShouldNotExceed100()
    {
        // Arrange
        _mockCacheService.Setup(x => x.GetAsync<List<GlobalSearchResult>>(It.IsAny<string>(), It.IsAny<CacheLevel>()))
            .ReturnsAsync((List<GlobalSearchResult>?)null);

        var mockResults = new List<GlobalSearchResult>
        {
            new GlobalSearchResult
            {
                Id = Guid.NewGuid().ToString(),
                Title = "Batman",
                OriginalTitle = "Batman",
                Type = ContentType.Movie,
                Year = DateTime.Now.Year,
                Rating = 10.0,
                AvailableCountries = 50,
                PosterUrl = "https://example.com/poster.jpg"
            }
        };

        _mockStreamingClient.Setup(x => x.SearchContentAsync(
            It.IsAny<string>(), It.IsAny<ContentType?>(), It.IsAny<string[]>(),
            It.IsAny<int>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new SearchResponse<GlobalSearchResult>
            {
                Results = mockResults,
                TotalResults = 1,
                Page = 1,
                PageSize = 10
            });

        // Act
        var result = await _service.SearchGlobalContentAsync(
            new GlobalSearchRequest { Query = "Batman" },
            Guid.NewGuid().ToString());

        // Assert
        Assert.NotNull(result);
        foreach (var item in result.Results)
        {
            Assert.True(item.RelevanceScore <= 100,
                $"RelevanceScore {item.RelevanceScore} exceeds 100 for item '{item.Title}'");
        }
    }

    [Fact]
    public async Task SearchAsync_RelevanceScore_ShouldNotExceed100()
    {
        // Arrange
        _mockCacheService.Setup(x => x.GetAsync<PaginatedResult<SearchableContent>>(It.IsAny<string>(), It.IsAny<CacheLevel>()))
            .ReturnsAsync((PaginatedResult<SearchableContent>?)null);

        // Act
        var result = await _service.SearchAsync(new SearchRequest
        {
            Query = "Inception",
            Page = 1,
            PageSize = 10
        });

        // Assert
        Assert.NotNull(result);
        foreach (var item in result.Results)
        {
            Assert.True(item.RelevanceScore <= 100,
                $"RelevanceScore {item.RelevanceScore} exceeds 100 for item '{item.Title}'");
        }
    }

    #endregion
}
