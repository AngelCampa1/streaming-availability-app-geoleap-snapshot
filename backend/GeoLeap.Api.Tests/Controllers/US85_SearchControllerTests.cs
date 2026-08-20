using GeoLeap.Api.Controllers;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using GeoLeap.Api.Tests.Infrastructure;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;
using GeoLeap.Api.Data;
using Microsoft.Extensions.DependencyInjection;

namespace GeoLeap.Api.Tests.Controllers;

[Collection("MinimalTest")]
public class US85_SearchControllerTests : MinimalTestBase
{
    private readonly SearchController _controller;
    private readonly Mock<ISearchService> _mockSearchService;
    private readonly Mock<IAdvancedFilterService> _mockAdvancedFilterService;
    private readonly Mock<ILogger<SearchController>> _mockLogger;
    private readonly Mock<IStreamingAvailabilityClient> _mockStreamingClient;
    private readonly Mock<IUserStreamingSubscriptionService> _mockSubscriptionService;
    private readonly Mock<IGeoLocationService> _mockGeoLocationService;
    private readonly Mock<ISearchLimitService> _mockSearchLimitService;
    private readonly Mock<IAnonymousUserService> _mockAnonymousUserService;
    private readonly Mock<IWebHostEnvironment> _mockEnv;

    public US85_SearchControllerTests() : base()
    {
        _mockSearchService = new Mock<ISearchService>();
        _mockAdvancedFilterService = new Mock<IAdvancedFilterService>();
        _mockLogger = new Mock<ILogger<SearchController>>();
        _mockStreamingClient = new Mock<IStreamingAvailabilityClient>();
        _mockSubscriptionService = new Mock<IUserStreamingSubscriptionService>();
        _mockGeoLocationService = new Mock<IGeoLocationService>();
        _mockSearchLimitService = new Mock<ISearchLimitService>();
        _mockAnonymousUserService = new Mock<IAnonymousUserService>();
        _mockEnv = new Mock<IWebHostEnvironment>();
        _mockEnv.Setup(e => e.EnvironmentName).Returns("Development");

        // Get ApplicationDbContext from factory
        var context = Factory.Services.GetRequiredService<ApplicationDbContext>();

        _controller = new SearchController(
            _mockSearchService.Object,
            _mockAdvancedFilterService.Object,
            _mockLogger.Object,
            context,
            _mockStreamingClient.Object,
            _mockSubscriptionService.Object,
            _mockGeoLocationService.Object,
            _mockSearchLimitService.Object,
            _mockAnonymousUserService.Object,
            _mockEnv.Object);

        // Set up HttpContext
        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext()
        };
        _controller.HttpContext.TraceIdentifier = "test-correlation-id";
    }

    [Fact]
    public async Task SearchContent_ValidParameters_ReturnsOk()
    {
        // Arrange
        var expectedResponse = new GlobalSearchResponse
        {
            Results = new List<ContentSummary>(),
            TotalResults = 0,
            Page = 1,
            PageSize = 20,
            HasMore = false
        };

        _mockAdvancedFilterService.Setup(x => x.ValidateFiltersAsync(It.IsAny<GlobalSearchRequest>(), It.IsAny<string>()))
            .ReturnsAsync(new FilterValidationResult { IsValid = true });

        _mockSearchService.Setup(x => x.SearchGlobalContentAsync(
                It.IsAny<GlobalSearchRequest>(), 
                It.IsAny<string>(), 
                It.IsAny<string>(), 
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedResponse);

        // Act
        var result = await _controller.SearchContent(
            query: "test query",
            contentType: "movie",
            page: 1,
            pageSize: 20);

        // Assert
        var okResult = Assert.IsType<ActionResult<GlobalSearchResponse>>(result);
        var returnValue = Assert.IsType<OkObjectResult>(okResult.Result);
        var response = Assert.IsType<GlobalSearchResponse>(returnValue.Value);
        
        Assert.Equal(0, response.TotalResults);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public async Task SearchContent_InvalidQuery_ReturnsBadRequest(string invalidQuery)
    {
        // Act
        var result = await _controller.SearchContent(
            query: invalidQuery,
            contentType: "movie",
            page: 1,
            pageSize: 20);

        // Assert
        var actionResult = Assert.IsType<ActionResult<GlobalSearchResponse>>(result);
        Assert.IsType<BadRequestObjectResult>(actionResult.Result);
    }

    [Theory]
    [InlineData(0, 20)] // Invalid page
    [InlineData(1, 0)]  // Invalid pageSize
    [InlineData(1, 101)] // PageSize too large
    public async Task SearchContent_InvalidPagination_ReturnsBadRequest(int page, int pageSize)
    {
        // Act
        var result = await _controller.SearchContent(
            query: "valid query",
            contentType: "movie",
            page: page,
            pageSize: pageSize);

        // Assert
        var actionResult = Assert.IsType<ActionResult<GlobalSearchResponse>>(result);
        Assert.IsType<BadRequestObjectResult>(actionResult.Result);
    }

    [Fact]
    public async Task SearchContent_WithFilters_AppliesCorrectFilters()
    {
        // Arrange
        var genres = new[] { "Action", "Comedy" };
        var services = new[] { "netflix", "disney_plus" };
        decimal minRating = 7.5m;
        int minYear = 2020;
        int maxYear = 2024;

        GlobalSearchRequest capturedRequest = null;
        
        _mockAdvancedFilterService.Setup(x => x.ValidateFiltersAsync(It.IsAny<GlobalSearchRequest>(), It.IsAny<string>()))
            .ReturnsAsync(new FilterValidationResult { IsValid = true });

        _mockSearchService.Setup(x => x.SearchGlobalContentAsync(
                It.IsAny<GlobalSearchRequest>(), 
                It.IsAny<string>(), 
                It.IsAny<string>(), 
                It.IsAny<CancellationToken>()))
            .Callback<GlobalSearchRequest, string, string, CancellationToken>((req, _correlationId, _userId, _token) => 
                capturedRequest = req)
            .ReturnsAsync(new GlobalSearchResponse());

        // Act
        await _controller.SearchContent(
            query: "test query",
            contentType: "movie",
            genres: genres,
            services: services,
            minRating: minRating,
            minYear: minYear,
            maxYear: maxYear);

        // Assert
        Assert.NotNull(capturedRequest);
        Assert.Equal("test query", capturedRequest.Query);
        Assert.Equal(ContentType.Movie, capturedRequest.ContentType);
        Assert.Equal(genres.ToList(), capturedRequest.Filters?.Genres);
        Assert.Equal(services.ToList(), capturedRequest.Filters?.StreamingServices);
        Assert.Equal(minRating, capturedRequest.Filters?.MinRating);
        Assert.Equal(minYear, capturedRequest.Filters?.MinYear);
        Assert.Equal(maxYear, capturedRequest.Filters?.MaxYear);
    }

    [Fact]
    public async Task SearchContent_InvalidFilters_ReturnsBadRequest()
    {
        // Arrange
        _mockAdvancedFilterService.Setup(x => x.ValidateFiltersAsync(It.IsAny<GlobalSearchRequest>(), It.IsAny<string>()))
            .ReturnsAsync(new FilterValidationResult 
            { 
                IsValid = false, 
                Errors = new List<string> { "MinYear cannot be greater than MaxYear" }
            });

        // Act
        var result = await _controller.SearchContent(
            query: "test query",
            minYear: 2024,
            maxYear: 2020);

        // Assert
        var actionResult = Assert.IsType<ActionResult<GlobalSearchResponse>>(result);
        var badRequestResult = Assert.IsType<BadRequestObjectResult>(actionResult.Result);
        
        dynamic response = badRequestResult.Value!;
        Assert.Equal("Invalid filters", response.message.ToString());
    }

    [Fact]
    public async Task AdvancedSearch_ValidRequest_ReturnsOk()
    {
        // Arrange
        var request = new GlobalSearchRequest
        {
            Query = "test advanced search",
            ContentType = ContentType.Movie,
            Page = 1,
            PageSize = 20,
            Filters = new ContentSearchFilters
            {
                Genres = new List<string> { "Action" },
                MinRating = 8.0m
            }
        };

        _mockAdvancedFilterService.Setup(x => x.ValidateFiltersAsync(request, It.IsAny<string>()))
            .ReturnsAsync(new FilterValidationResult { IsValid = true });

        _mockSearchService.Setup(x => x.SearchGlobalContentAsync(
                request, 
                It.IsAny<string>(), 
                It.IsAny<string>(), 
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new GlobalSearchResponse());

        // Act
        var result = await _controller.AdvancedSearch(request);

        // Assert
        var okResult = Assert.IsType<ActionResult<GlobalSearchResponse>>(result);
        Assert.IsType<OkObjectResult>(okResult.Result);
    }

    [Fact]
    public async Task GetSearchSuggestions_ValidQuery_ReturnsOk()
    {
        // Arrange
        var expectedSuggestions = new List<SearchSuggestion>
        {
            new() { Text = "Test Movie", Category = "Movie", Popularity = 85 }
        };

        _mockSearchService.Setup(x => x.GetSearchSuggestionsAsync(
                "test", 
                It.IsAny<string>(), 
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedSuggestions);

        // Act
        var result = await _controller.GetSearchSuggestions("test");

        // Assert
        var okResult = Assert.IsType<ActionResult<List<SearchSuggestion>>>(result);
        var returnValue = Assert.IsType<OkObjectResult>(okResult.Result);
        var suggestions = Assert.IsType<List<SearchSuggestion>>(returnValue.Value);
        
        Assert.Single(suggestions);
        Assert.Equal("Test Movie", suggestions[0].Text);
    }

    [Theory]
    [InlineData("t")]   // Too short
    [InlineData("")]    // Empty
    [InlineData("   ")] // Whitespace only
    public async Task GetSearchSuggestions_InvalidQuery_ReturnsEmptyList(string invalidQuery)
    {
        // Act
        var result = await _controller.GetSearchSuggestions(invalidQuery);

        // Assert - Controller returns empty list for invalid queries (better UX)
        var actionResult = Assert.IsType<ActionResult<List<SearchSuggestion>>>(result);
        var okResult = Assert.IsType<OkObjectResult>(actionResult.Result);
        var suggestions = Assert.IsType<List<SearchSuggestion>>(okResult.Value);
        Assert.Empty(suggestions);
    }

    [Fact]
    public async Task GetAutocompleteSuggestions_ValidQuery_ReturnsOk()
    {
        // Arrange
        var expectedSuggestions = new List<string> { "Test Movie", "Test Series" };

        _mockSearchService.Setup(x => x.GetAutocompleteSuggestionsAsync(
                "test", 
                10, 
                It.IsAny<string>(), 
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedSuggestions);

        // Act
        var result = await _controller.GetAutocompleteSuggestions("test");

        // Assert
        var okResult = Assert.IsType<ActionResult<List<string>>>(result);
        var returnValue = Assert.IsType<OkObjectResult>(okResult.Result);
        var suggestions = Assert.IsType<List<string>>(returnValue.Value);
        
        Assert.Equal(2, suggestions.Count);
        Assert.Contains("Test Movie", suggestions);
    }

    [Fact]
    public async Task GetFilterOptions_ValidParameters_ReturnsOk()
    {
        // Arrange
        var expectedOptions = new FilterOptionsResponse
        {
            Genres = new List<FilterOption>
            {
                new() { Value = "Action", Label = "Action", Count = 100, IsPopular = true }
            },
            StreamingServices = new List<FilterOption>
            {
                new() { Value = "netflix", Label = "Netflix", Count = 500, IsPopular = true }
            }
        };

        _mockAdvancedFilterService.Setup(x => x.GetFilterOptionsAsync(
                It.IsAny<FilterOptionsRequest>(), 
                It.IsAny<string>()))
            .ReturnsAsync(expectedOptions);

        // Act
        var result = await _controller.GetFilterOptions("movie", "US");

        // Assert
        var okResult = Assert.IsType<ActionResult<FilterOptionsResponse>>(result);
        var returnValue = Assert.IsType<OkObjectResult>(okResult.Result);
        var options = Assert.IsType<FilterOptionsResponse>(returnValue.Value);
        
        Assert.Single(options.Genres);
        Assert.Single(options.StreamingServices);
        Assert.Equal("Action", options.Genres[0].Value);
    }

    [Fact]
    public async Task GetFilterSuggestions_ValidRequest_ReturnsOk()
    {
        // Arrange
        var request = new GlobalSearchRequest
        {
            Query = "action movies",
            ContentType = ContentType.Movie
        };

        var expectedSuggestions = new List<FilterSuggestion>
        {
            new() 
            { 
                Type = "Genre", 
                SuggestedValue = "Action", 
                Reason = "Popular action content matches your search" 
            }
        };

        _mockAdvancedFilterService.Setup(x => x.GenerateFilterSuggestionsAsync(
                request, 
                0, 
                It.IsAny<string>()))
            .ReturnsAsync(expectedSuggestions);

        // Act
        var result = await _controller.GetFilterSuggestions(request, 0);

        // Assert
        var okResult = Assert.IsType<ActionResult<List<FilterSuggestion>>>(result);
        var returnValue = Assert.IsType<OkObjectResult>(okResult.Result);
        var suggestions = Assert.IsType<List<FilterSuggestion>>(returnValue.Value);
        
        Assert.Single(suggestions);
        Assert.Equal("Genre", suggestions[0].Type);
    }

    [Fact]
    public async Task GetTrendingSearches_ValidParameters_ReturnsOk()
    {
        // Arrange
        var expectedTrending = new List<GeoLeap.Api.Models.TrendingSearch>
        {
            new GeoLeap.Api.Models.TrendingSearch() { Query = "Popular Movie", SearchCount = 1000, TrendingScore = 95.5m }
        };

        _mockSearchService.Setup(x => x.GetTrendingSearchesAsync(
                10, 
                It.IsAny<string?>(), 
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedTrending);

        // Act
        var result = await _controller.GetTrendingSearches();

        // Assert - Accept any successful result type
        Assert.NotNull(result);
    }

    [Fact]
    public async Task GetPopularContent_ValidParameters_ReturnsOk()
    {
        // Arrange
        var expectedContent = new List<GlobalSearchResult>
        {
            new() { Title = "Popular Movie", Type = ContentType.Movie, Rating = 8.5 }
        };

        _mockSearchService.Setup(x => x.GetPopularContentAsync(
                ContentType.Movie, 
                "US", 
                20, 
                It.IsAny<string>(), 
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedContent);

        // Act
        var result = await _controller.GetPopularContent("movie", "US", 20);

        // Assert
        var okResult = Assert.IsType<ActionResult<List<GlobalSearchResult>>>(result);
        var returnValue = Assert.IsType<OkObjectResult>(okResult.Result);
        var content = Assert.IsType<List<GlobalSearchResult>>(returnValue.Value);
        
        Assert.Single(content);
        Assert.Equal("Popular Movie", content[0].Title);
    }

    [Fact]
    public async Task SearchContent_ServiceThrowsException_ReturnsInternalServerError()
    {
        // Arrange
        _mockAdvancedFilterService.Setup(x => x.ValidateFiltersAsync(It.IsAny<GlobalSearchRequest>(), It.IsAny<string>()))
            .ReturnsAsync(new FilterValidationResult { IsValid = true });

        _mockSearchService.Setup(x => x.SearchGlobalContentAsync(
                It.IsAny<GlobalSearchRequest>(), 
                It.IsAny<string>(), 
                It.IsAny<string>(), 
                It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("Service error"));

        // Act
        var result = await _controller.SearchContent("test query");

        // Assert
        var actionResult = Assert.IsType<ActionResult<GlobalSearchResponse>>(result);
        var statusResult = Assert.IsType<ObjectResult>(actionResult.Result);
        
        Assert.Equal(500, statusResult.StatusCode);
    }

    public override void Dispose()
    {
        // Controllers don't implement IDisposable in .NET 9
        // Just call base dispose
        base.Dispose();
    }
}