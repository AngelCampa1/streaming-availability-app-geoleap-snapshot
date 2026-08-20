using Xunit;
using Moq;
using Moq.Protected;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Logging;
using GeoLeap.Api.Services;
using GeoLeap.Api.Models;
using System.Net;
using System.Text;
using System.Text.Json;

namespace GeoLeap.Api.Tests.Services;

/// <summary>
/// Direct tests for StreamingAvailabilityClient - Phase 3.6
/// Tests external API integration, caching, error handling, and usage tracking
/// Coverage: API calls, cache hit/miss, retry logic, data normalization
/// </summary>
public class StreamingAvailabilityClientDirectTests : IDisposable
{
    private readonly StreamingAvailabilityClient _client;
    private readonly Mock<HttpMessageHandler> _mockHttpHandler;
    private readonly Mock<IOptionsMonitor<StreamingApiSettings>> _mockSettings;
    private readonly Mock<ILogger<StreamingAvailabilityClient>> _mockLogger;
    private readonly Mock<IDistributedCache> _mockCache;
    private readonly Mock<IStreamingApiErrorHandler> _mockErrorHandler;
    private readonly Mock<IApiUsageTracker> _mockUsageTracker;
    private readonly Mock<IStreamingDataNormalizer> _mockNormalizer;
    private readonly HttpClient _httpClient;

    private readonly StreamingApiSettings _testSettings = new()
    {
        BaseUrl = "https://api.streaming-availability.com",
        ApiKey = "test_api_key",
        TimeoutMs = 5000,
        CacheDurationMinutes = 60,
        CostPerCall = 0.01m
    };

    public StreamingAvailabilityClientDirectTests()
    {
        _mockHttpHandler = new Mock<HttpMessageHandler>();
        _httpClient = new HttpClient(_mockHttpHandler.Object);

        _mockSettings = new Mock<IOptionsMonitor<StreamingApiSettings>>();
        _mockSettings.Setup(s => s.CurrentValue).Returns(_testSettings);

        _mockLogger = new Mock<ILogger<StreamingAvailabilityClient>>();
        _mockCache = new Mock<IDistributedCache>();
        _mockErrorHandler = new Mock<IStreamingApiErrorHandler>();
        _mockUsageTracker = new Mock<IApiUsageTracker>();
        _mockNormalizer = new Mock<IStreamingDataNormalizer>();

        // Default: cache returns null (cache miss)
        _mockCache.Setup(c => c.GetAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((byte[]?)null);

        // Default: usage tracker allows API calls
        _mockUsageTracker.Setup(t => t.CanMakeApiCallAsync())
            .ReturnsAsync(true);

        _client = new StreamingAvailabilityClient(
            _httpClient,
            _mockSettings.Object,
            _mockLogger.Object,
            _mockCache.Object,
            _mockErrorHandler.Object,
            _mockUsageTracker.Object,
            _mockNormalizer.Object
        );
    }

    public void Dispose()
    {
        _httpClient.Dispose();
    }

    // GetAvailabilityAsync Tests

    [Fact]
    public async Task GetAvailabilityAsync_WithCacheHit_ReturnsCachedResult()
    {
        // Arrange
        var contentId = "movie_123";
        var cachedResponse = new StreamingAvailabilityResponse
        {
            ContentId = contentId,
            Title = "Test Movie",
            Available = true
        };

        var cacheKey = $"streaming_availability_{contentId}_Movie";
        _mockCache.Setup(c => c.GetAsync(cacheKey, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(cachedResponse)));

        // Act
        var result = await _client.GetAvailabilityAsync(contentId, ContentType.Movie);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(contentId, result.ContentId);
        Assert.Equal("Test Movie", result.Title);
        Assert.True(result.Available);

        // Verify no HTTP call was made
        _mockHttpHandler.Protected().Verify(
            "SendAsync",
            Times.Never(),
            ItExpr.IsAny<HttpRequestMessage>(),
            ItExpr.IsAny<CancellationToken>()
        );
    }

    [Fact]
    public async Task GetAvailabilityAsync_WithCacheMiss_CallsApiAndCachesResult()
    {
        // Arrange
        var contentId = "movie_456";
        var apiResponse = new V2BasicDetailsResponse
        {
            Shows = new List<V2ShowResult>
            {
                new V2ShowResult
                {
                    Id = contentId,
                    Title = "New Movie",
                    Year = 2024
                }
            }
        };

        var legacyResponse = new StreamingAvailabilityResponse
        {
            ContentId = contentId,
            Title = "New Movie",
            Available = true
        };

        SetupHttpResponse(HttpStatusCode.OK, apiResponse);

        _mockErrorHandler.Setup(h => h.ExecuteWithRetryAsync(
            It.IsAny<Func<Task<HttpResponseMessage>>>(),
            It.IsAny<string>(),
            It.IsAny<CancellationToken>()))
            .Returns<Func<Task<HttpResponseMessage>>, string, CancellationToken>((func, _, _) => func());

        _mockNormalizer.Setup(n => n.ConvertToLegacyResponse(It.IsAny<V2ShowResult>()))
            .Returns(legacyResponse);

        // Act
        var result = await _client.GetAvailabilityAsync(contentId, ContentType.Movie);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(contentId, result.ContentId);

        // Verify cache was set
        _mockCache.Verify(c => c.SetAsync(
            It.Is<string>(k => k.Contains(contentId)),
            It.IsAny<byte[]>(),
            It.IsAny<DistributedCacheEntryOptions>(),
            It.IsAny<CancellationToken>()),
            Times.Once);

        // Verify usage was tracked
        _mockUsageTracker.Verify(t => t.TrackApiCallAsync(
            It.IsAny<string>(),
            true,
            It.IsAny<int>(),
            It.IsAny<decimal>(),
            It.IsAny<string?>(),
            null,
            200),
            Times.Once);
    }

    [Fact]
    public async Task GetAvailabilityAsync_WithBudgetExceeded_ThrowsException()
    {
        // Arrange
        _mockUsageTracker.Setup(t => t.CanMakeApiCallAsync())
            .ReturnsAsync(false);

        // Act & Assert
        var exception = await Assert.ThrowsAsync<StreamingApiException>(() =>
            _client.GetAvailabilityAsync("movie_999", ContentType.Movie));

        Assert.Contains("API usage budget exceeded", exception.Message);
    }

    [Fact]
    public async Task GetAvailabilityAsync_WithApiFailure_ThrowsAndTracksError()
    {
        // Arrange
        SetupHttpResponse(HttpStatusCode.InternalServerError, "API Error");

        _mockErrorHandler.Setup(h => h.ExecuteWithRetryAsync(
            It.IsAny<Func<Task<HttpResponseMessage>>>(),
            It.IsAny<string>(),
            It.IsAny<CancellationToken>()))
            .Returns<Func<Task<HttpResponseMessage>>, string, CancellationToken>((func, _, _) => func());

        // Act & Assert
        await Assert.ThrowsAsync<StreamingApiException>(() =>
            _client.GetAvailabilityAsync("movie_error", ContentType.Movie));

        // Verify error was tracked
        _mockUsageTracker.Verify(t => t.TrackApiCallAsync(
            It.IsAny<string>(),
            false,
            It.IsAny<int>(),
            It.IsAny<decimal>(),
            It.IsAny<string?>(),
            It.IsAny<string?>(),
            500),
            Times.Once);
    }

    // SearchContentAsync Tests

    [Fact]
    public async Task SearchContentAsync_WithCacheHit_ReturnsCachedResults()
    {
        // Arrange
        var query = "matrix";
        var cachedResults = new SearchResponse<GlobalSearchResult>
        {
            Results = new List<GlobalSearchResult>
            {
                new GlobalSearchResult { Id = "show_1", Title = "The Matrix", Available = true }
            },
            TotalResults = 1,
            Page = 1,
            PageSize = 10
        };

        // Setup cache to return results
        _mockCache.Setup(c => c.GetAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(cachedResults)));

        // Act
        var result = await _client.SearchContentAsync(query);

        // Assert
        Assert.NotNull(result);
        Assert.Single(result.Results);
        Assert.Equal("The Matrix", result.Results[0].Title);

        // Verify no HTTP call was made
        _mockHttpHandler.Protected().Verify(
            "SendAsync",
            Times.Never(),
            ItExpr.IsAny<HttpRequestMessage>(),
            ItExpr.IsAny<CancellationToken>()
        );
    }

    [Fact]
    public async Task SearchContentAsync_WithCacheMiss_CallsApiAndReturnsResults()
    {
        // Arrange
        var query = "inception";
        var apiShows = new List<V2ShowResult>
        {
            new V2ShowResult
            {
                Id = "show_inception",
                Title = "Inception",
                Year = 2010,
                Overview = "Dream heist movie"
            }
        };

        SetupHttpResponse(HttpStatusCode.OK, apiShows);

        _mockErrorHandler.Setup(h => h.ExecuteWithRetryAsync(
            It.IsAny<Func<Task<HttpResponseMessage>>>(),
            It.IsAny<string>(),
            It.IsAny<CancellationToken>()))
            .Returns<Func<Task<HttpResponseMessage>>, string, CancellationToken>((func, _, _) => func());

        _mockNormalizer.Setup(n => n.ConvertToLegacyResponse(It.IsAny<V2ShowResult>()))
            .Returns(new StreamingAvailabilityResponse
            {
                ContentId = "show_inception",
                Title = "Inception",
                Type = ContentType.Movie,
                Available = true
            });

        _mockNormalizer.Setup(n => n.GetImageUrl(It.IsAny<ExternalImageSet?>()))
            .Returns("https://example.com/poster.jpg");

        // Act
        var result = await _client.SearchContentAsync(query);

        // Assert
        Assert.NotNull(result);
        Assert.Single(result.Results);
        Assert.Equal("Inception", result.Results[0].Title);

        // Verify cache was set
        _mockCache.Verify(c => c.SetAsync(
            It.IsAny<string>(),
            It.IsAny<byte[]>(),
            It.IsAny<DistributedCacheEntryOptions>(),
            It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task SearchContentAsync_WithContentTypeFilter_FiltersResults()
    {
        // Arrange
        var query = "breaking bad";
        var apiShows = new List<V2ShowResult>
        {
            new V2ShowResult { Id = "show_1", Title = "Breaking Bad", Year = 2008 }
        };

        SetupHttpResponse(HttpStatusCode.OK, apiShows);

        _mockErrorHandler.Setup(h => h.ExecuteWithRetryAsync(
            It.IsAny<Func<Task<HttpResponseMessage>>>(),
            It.IsAny<string>(),
            It.IsAny<CancellationToken>()))
            .Returns<Func<Task<HttpResponseMessage>>, string, CancellationToken>((func, _, _) => func());

        _mockNormalizer.Setup(n => n.ConvertToLegacyResponse(It.IsAny<V2ShowResult>()))
            .Returns(new StreamingAvailabilityResponse
            {
                ContentId = "show_1",
                Title = "Breaking Bad",
                Type = ContentType.TvSeries,
                Available = true
            });

        _mockNormalizer.Setup(n => n.GetImageUrl(It.IsAny<ExternalImageSet?>()))
            .Returns("https://example.com/poster.jpg");

        // Act
        var result = await _client.SearchContentAsync(query, contentType: ContentType.TvSeries);

        // Assert
        Assert.NotNull(result);
        Assert.Single(result.Results);

        // Verify HTTP request included showType parameter
        _mockHttpHandler.Protected().Verify(
            "SendAsync",
            Times.Once(),
            ItExpr.Is<HttpRequestMessage>(req =>
                req.RequestUri!.ToString().Contains("showType=tvseries")),
            ItExpr.IsAny<CancellationToken>()
        );
    }

    [Fact]
    public async Task SearchContentAsync_WithBudgetExceeded_ThrowsException()
    {
        // Arrange
        _mockUsageTracker.Setup(t => t.CanMakeApiCallAsync())
            .ReturnsAsync(false);

        // Act & Assert
        var exception = await Assert.ThrowsAsync<StreamingApiException>(() =>
            _client.SearchContentAsync("test query"));

        Assert.Contains("API usage budget exceeded", exception.Message);
    }

    // GetSupportedServicesAsync Tests

    [Fact]
    public async Task GetSupportedServicesAsync_WithCacheHit_ReturnsCachedServices()
    {
        // Arrange
        var cachedServices = new List<StreamingService>
        {
            new StreamingService { Name = "Netflix", DisplayName = "Netflix" }
        };

        _mockCache.Setup(c => c.GetAsync("supported_services", It.IsAny<CancellationToken>()))
            .ReturnsAsync(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(cachedServices)));

        // Act
        var result = await _client.GetSupportedServicesAsync();

        // Assert
        Assert.NotNull(result);
        Assert.Single(result);
        Assert.Equal("Netflix", result[0].Name);
    }

    [Fact]
    public async Task GetSupportedServicesAsync_WithCacheMiss_ReturnsStaticListAndCaches()
    {
        // Act
        var result = await _client.GetSupportedServicesAsync();

        // Assert
        Assert.NotNull(result);
        Assert.NotEmpty(result);
        Assert.Contains(result, s => s.Name == "Netflix");
        Assert.Contains(result, s => s.Name == "Amazon Prime Video");
        Assert.Contains(result, s => s.Name == "Disney+");

        // Verify cache was set with 24 hour expiration
        _mockCache.Verify(c => c.SetAsync(
            "supported_services",
            It.IsAny<byte[]>(),
            It.Is<DistributedCacheEntryOptions>(o =>
                o.AbsoluteExpirationRelativeToNow == TimeSpan.FromHours(24)),
            It.IsAny<CancellationToken>()),
            Times.Once);
    }

    // GetSupportedCountriesAsync Tests

    [Fact]
    public async Task GetSupportedCountriesAsync_WithCacheHit_ReturnsCachedCountries()
    {
        // Arrange
        var cachedCountries = new List<Country>
        {
            new Country { Code = "us", Name = "United States", Currency = "USD" }
        };

        _mockCache.Setup(c => c.GetAsync("supported_countries", It.IsAny<CancellationToken>()))
            .ReturnsAsync(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(cachedCountries)));

        // Act
        var result = await _client.GetSupportedCountriesAsync();

        // Assert
        Assert.NotNull(result);
        Assert.Single(result);
        Assert.Equal("us", result[0].Code);
    }

    [Fact]
    public async Task GetSupportedCountriesAsync_WithCacheMiss_ReturnsStaticListAndCaches()
    {
        // Act
        var result = await _client.GetSupportedCountriesAsync();

        // Assert
        Assert.NotNull(result);
        Assert.NotEmpty(result);
        Assert.Contains(result, c => c.Code == "us");
        Assert.Contains(result, c => c.Code == "ca");
        Assert.Contains(result, c => c.Code == "gb");

        // Verify cache was set with 24 hour expiration
        _mockCache.Verify(c => c.SetAsync(
            "supported_countries",
            It.IsAny<byte[]>(),
            It.Is<DistributedCacheEntryOptions>(o =>
                o.AbsoluteExpirationRelativeToNow == TimeSpan.FromHours(24)),
            It.IsAny<CancellationToken>()),
            Times.Once);
    }

    // GetShowDetailsAsync Tests

    [Fact]
    public async Task GetShowDetailsAsync_WithCacheHit_ReturnsCachedDetails()
    {
        // Arrange
        var showId = "show_123";
        var cachedShow = new V2ShowResult
        {
            Id = showId,
            Title = "Test Show",
            Year = 2024
        };

        _mockCache.Setup(c => c.GetAsync($"show_details_{showId}", It.IsAny<CancellationToken>()))
            .ReturnsAsync(Encoding.UTF8.GetBytes(JsonSerializer.Serialize(cachedShow)));

        var showDetails = new ShowStreamingDetails
        {
            Id = showId,
            Title = "Test Show",
            Year = 2024
        };

        _mockNormalizer.Setup(n => n.NormalizeShowDetails(
            It.IsAny<V2ShowResult>(),
            It.IsAny<List<string>?>(),
            It.IsAny<string?>()))
            .Returns(showDetails);

        // Act
        var result = await _client.GetShowDetailsAsync(showId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(showId, result.Id);
        Assert.Equal("Test Show", result.Title);

        // Verify no HTTP call was made
        _mockHttpHandler.Protected().Verify(
            "SendAsync",
            Times.Never(),
            ItExpr.IsAny<HttpRequestMessage>(),
            ItExpr.IsAny<CancellationToken>()
        );
    }

    [Fact]
    public async Task GetShowDetailsAsync_WithCacheMiss_CallsApiAndCachesResult()
    {
        // Arrange
        var showId = "show_456";
        var apiShow = new V2ShowResult
        {
            Id = showId,
            Title = "New Show",
            Year = 2024
        };

        SetupHttpResponse(HttpStatusCode.OK, apiShow);

        _mockErrorHandler.Setup(h => h.ExecuteWithRetryAsync(
            It.IsAny<Func<Task<HttpResponseMessage>>>(),
            It.IsAny<string>(),
            It.IsAny<CancellationToken>()))
            .Returns<Func<Task<HttpResponseMessage>>, string, CancellationToken>((func, _, _) => func());

        var showDetails = new ShowStreamingDetails
        {
            Id = showId,
            Title = "New Show",
            Year = 2024
        };

        _mockNormalizer.Setup(n => n.NormalizeShowDetails(
            It.IsAny<V2ShowResult>(),
            It.IsAny<List<string>?>(),
            It.IsAny<string?>()))
            .Returns(showDetails);

        // Act
        var result = await _client.GetShowDetailsAsync(showId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(showId, result.Id);

        // Verify cache was set with 24 hour expiration
        _mockCache.Verify(c => c.SetAsync(
            $"show_details_{showId}",
            It.IsAny<byte[]>(),
            It.Is<DistributedCacheEntryOptions>(o =>
                o.AbsoluteExpirationRelativeToNow == TimeSpan.FromHours(24)),
            It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task GetShowDetailsAsync_WithBudgetExceeded_ThrowsException()
    {
        // Arrange
        _mockUsageTracker.Setup(t => t.CanMakeApiCallAsync())
            .ReturnsAsync(false);

        // Act & Assert
        var exception = await Assert.ThrowsAsync<StreamingApiException>(() =>
            _client.GetShowDetailsAsync("show_999"));

        Assert.Contains("API usage budget exceeded", exception.Message);
    }

    // GetUsageStatsAsync Test

    [Fact]
    public async Task GetUsageStatsAsync_DelegatesToUsageTracker()
    {
        // Arrange
        var expectedStats = new ApiUsageStats
        {
            CallsToday = 50,
            CallsThisMonth = 100,
            CostToday = 0.50m,
            CostThisMonth = 1.00m,
            RemainingCalls = 900
        };

        _mockUsageTracker.Setup(t => t.GetUsageStatsAsync())
            .ReturnsAsync(expectedStats);

        // Act
        var result = await _client.GetUsageStatsAsync();

        // Assert
        Assert.NotNull(result);
        Assert.Equal(50, result.CallsToday);
        Assert.Equal(100, result.CallsThisMonth);
        Assert.Equal(0.50m, result.CostToday);

        _mockUsageTracker.Verify(t => t.GetUsageStatsAsync(), Times.Once);
    }

    // IsHealthyAsync Tests

    [Fact]
    public async Task IsHealthyAsync_WithSuccessfulResponse_ReturnsTrue()
    {
        // Arrange
        SetupHttpResponse(HttpStatusCode.OK, "OK");

        // Act
        var result = await _client.IsHealthyAsync();

        // Assert
        Assert.True(result);
    }

    [Fact]
    public async Task IsHealthyAsync_WithFailedResponse_ReturnsFalse()
    {
        // Arrange
        SetupHttpResponse(HttpStatusCode.ServiceUnavailable, "Service Unavailable");

        // Act
        var result = await _client.IsHealthyAsync();

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task IsHealthyAsync_WithException_ReturnsFalse()
    {
        // Arrange
        _mockHttpHandler.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ThrowsAsync(new HttpRequestException("Network error"));

        // Act
        var result = await _client.IsHealthyAsync();

        // Assert
        Assert.False(result);
    }

    // Helper Methods

    private void SetupHttpResponse(HttpStatusCode statusCode, object content)
    {
        var json = JsonSerializer.Serialize(content);
        var response = new HttpResponseMessage
        {
            StatusCode = statusCode,
            Content = new StringContent(json, Encoding.UTF8, "application/json")
        };

        _mockHttpHandler.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(response);
    }

    private void SetupHttpResponse(HttpStatusCode statusCode, string content)
    {
        var response = new HttpResponseMessage
        {
            StatusCode = statusCode,
            Content = new StringContent(content, Encoding.UTF8, "text/plain")
        };

        _mockHttpHandler.Protected()
            .Setup<Task<HttpResponseMessage>>(
                "SendAsync",
                ItExpr.IsAny<HttpRequestMessage>(),
                ItExpr.IsAny<CancellationToken>())
            .ReturnsAsync(response);
    }
}
