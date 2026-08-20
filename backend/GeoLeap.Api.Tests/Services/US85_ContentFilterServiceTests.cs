using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using GeoLeap.Api.Tests.Infrastructure;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace GeoLeap.Api.Tests.Services;

[Collection("MinimalTest")]
public class US85_ContentFilterServiceTests : MinimalTestBase
{
    private readonly ContentFilterService _service;
    private readonly ApplicationDbContext _context;
    private readonly IMemoryCache _cache;
    private readonly Mock<ILogger<ContentFilterService>> _mockLogger;
    private readonly Mock<ILoggerService> _mockLoggerService;
    private readonly IServiceScope _scope;

    public US85_ContentFilterServiceTests() : base()
    {
        _scope = Factory.Services.CreateScope();
        _context = _scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        _cache = _scope.ServiceProvider.GetRequiredService<IMemoryCache>();
        _mockLogger = new Mock<ILogger<ContentFilterService>>();
        _mockLoggerService = new Mock<ILoggerService>();

        _service = new ContentFilterService(
            _context,
            _cache,
            _mockLogger.Object,
            _mockLoggerService.Object);
    }

    [Fact]
    public async Task GetAvailableFilterOptionsAsync_ValidRequest_ReturnsFilterOptions()
    {
        // Arrange
        await SeedTestData();

        // Act
        var result = await _service.GetAvailableFilterOptionsAsync("movie", "US");

        // Assert
        Assert.NotNull(result);
        Assert.NotEmpty(result.Genres);
        Assert.NotEmpty(result.StreamingServices);
        Assert.True(result.AvailableYearRange.MinYear > 0);
        Assert.True(result.AvailableYearRange.MaxYear >= result.AvailableYearRange.MinYear);
    }

    [Fact]
    public async Task GetAvailableGenresAsync_WithContent_ReturnsGenreOptions()
    {
        // Arrange
        await SeedTestData();

        // Act
        var result = await _service.GetAvailableGenresAsync("movie", "US");

        // Assert
        Assert.NotNull(result);
        if (result.Any())
        {
            var firstGenre = result.First();
            Assert.NotEmpty(firstGenre.Value);
            Assert.NotEmpty(firstGenre.Label);
            Assert.True(firstGenre.Count > 0);
        }
    }

    [Fact]
    public async Task GetAvailableServicesAsync_WithRegion_ReturnsServiceOptions()
    {
        // Arrange
        await SeedTestData();

        // Act
        var result = await _service.GetAvailableServicesAsync("US");

        // Assert
        Assert.NotNull(result);
        // Should return default services if no data in database
        Assert.NotEmpty(result);
        Assert.Contains(result, s => s.Value == "netflix");
    }

    [Fact]
    public async Task GetAvailableYearRangesAsync_WithContent_ReturnsValidRange()
    {
        // Arrange
        await SeedTestData();

        // Act
        var result = await _service.GetAvailableYearRangesAsync("movie");

        // Assert
        Assert.NotNull(result);
        Assert.True(result.MinYear >= 1900);
        Assert.True(result.MaxYear <= DateTime.Now.Year + 1);
        Assert.True(result.MostCommonYear > 0);
    }

    [Fact]
    public async Task ValidateFiltersAsync_ValidFilters_ReturnsValid()
    {
        // Arrange
        var request = new GlobalSearchRequest
        {
            Query = "test",
            Filters = new ContentSearchFilters
            {
                MinRating = 7.0m,
                MaxRating = 9.0m,
                MinYear = 2000,
                MaxYear = 2024,
                MinRuntime = 90,
                MaxRuntime = 180
            }
        };

        // Act
        var result = await _service.ValidateFiltersAsync(request);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.IsValid);
        Assert.Empty(result.Errors);
    }

    [Theory]
    [InlineData(2024, 2020)] // MinYear > MaxYear
    [InlineData(2000, 1800)] // MaxYear < MinYear (edge case)
    public async Task ValidateFiltersAsync_InvalidYearRange_ReturnsInvalid(int minYear, int maxYear)
    {
        // Arrange
        var request = new GlobalSearchRequest
        {
            Query = "test",
            Filters = new ContentSearchFilters
            {
                MinYear = minYear,
                MaxYear = maxYear
            }
        };

        // Act
        var result = await _service.ValidateFiltersAsync(request);

        // Assert
        Assert.NotNull(result);
        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.Contains("MinYear cannot be greater than MaxYear"));
    }

    [Theory]
    [InlineData(9.0, 7.0)] // MinRating > MaxRating
    [InlineData(-1.0, 5.0)] // MinRating < 0
    [InlineData(5.0, 11.0)] // MaxRating > 10
    public async Task ValidateFiltersAsync_InvalidRatingRange_ReturnsInvalidOrWarnings(decimal minRating, decimal maxRating)
    {
        // Arrange
        var request = new GlobalSearchRequest
        {
            Query = "test",
            Filters = new ContentSearchFilters
            {
                MinRating = minRating,
                MaxRating = maxRating
            }
        };

        // Act
        var result = await _service.ValidateFiltersAsync(request);

        // Assert
        Assert.NotNull(result);
        if (minRating > maxRating)
        {
            Assert.False(result.IsValid);
            Assert.Contains(result.Errors, e => e.Contains("MinRating cannot be greater than MaxRating"));
        }
        else if (minRating < 0 || maxRating > 10)
        {
            Assert.False(result.IsValid);
            Assert.True(result.Errors.Any(e => e.Contains("Rating must be between 0 and 10")));
        }
    }

    [Fact]
    public async Task GenerateFilterSuggestionsAsync_TooManyResults_SuggestsNarrowing()
    {
        // Arrange
        var request = new GlobalSearchRequest
        {
            Query = "popular movies"
        };

        // Act
        var result = await _service.GenerateFilterSuggestionsAsync(request, currentResultCount: 150);

        // Assert
        Assert.NotNull(result);
        Assert.NotEmpty(result);
        Assert.Contains(result, s => s.Reason.Contains("Too many results"));
    }

    [Fact]
    public async Task GenerateFilterSuggestionsAsync_TooFewResults_SuggestsBroadening()
    {
        // Arrange
        var request = new GlobalSearchRequest
        {
            Query = "obscure movie",
            Filters = new ContentSearchFilters
            {
                MinRating = 9.0m,
                MinYear = 2023
            }
        };

        // Act
        var result = await _service.GenerateFilterSuggestionsAsync(request, currentResultCount: 2);

        // Assert
        Assert.NotNull(result);
        Assert.Contains(result, s => s.Reason.Contains("Lower minimum rating") || s.Reason.Contains("Include older content"));
    }

    [Fact]
    public void ApplyFilters_WithContentTypeFilter_FiltersCorrectly()
    {
        // Arrange
        var query = new List<SearchableContent>
        {
            new() { Id = Guid.NewGuid(), Title = "Movie 1", Type = ContentType.Movie },
            new() { Id = Guid.NewGuid(), Title = "Series 1", Type = ContentType.TvSeries },
            new() { Id = Guid.NewGuid(), Title = "Movie 2", Type = ContentType.Movie }
        }.AsQueryable();

        var filters = new ContentSearchFilters
        {
            ContentType = ContentType.Movie
        };

        // Act
        var result = _service.ApplyFilters(query, filters);

        // Assert
        var filtered = result.ToList();
        Assert.Equal(2, filtered.Count);
        Assert.All(filtered, item => Assert.Equal(ContentType.Movie, item.Type));
    }

    [Fact]
    public void ApplyFilters_WithRatingFilter_FiltersCorrectly()
    {
        // Arrange
        var query = new List<SearchableContent>
        {
            new() { Id = Guid.NewGuid(), Title = "Low Rated", Rating = 5.0m },
            new() { Id = Guid.NewGuid(), Title = "High Rated", Rating = 8.5m },
            new() { Id = Guid.NewGuid(), Title = "Medium Rated", Rating = 7.0m }
        }.AsQueryable();

        var filters = new ContentSearchFilters
        {
            MinRating = 7.0m,
            MaxRating = 9.0m
        };

        // Act
        var result = _service.ApplyFilters(query, filters);

        // Assert
        var filtered = result.ToList();
        Assert.Equal(2, filtered.Count);
        Assert.All(filtered, item => Assert.True(item.Rating >= 7.0m && item.Rating <= 9.0m));
    }

    [Fact]
    public void ApplyFilters_WithYearFilter_FiltersCorrectly()
    {
        // Arrange
        var query = new List<SearchableContent>
        {
            new() { Id = Guid.NewGuid(), Title = "Old Movie", Year = 1990 },
            new() { Id = Guid.NewGuid(), Title = "Recent Movie", Year = 2022 },
            new() { Id = Guid.NewGuid(), Title = "New Movie", Year = 2024 }
        }.AsQueryable();

        var filters = new ContentSearchFilters
        {
            MinYear = 2020,
            MaxYear = 2023
        };

        // Act
        var result = _service.ApplyFilters(query, filters);

        // Assert
        var filtered = result.ToList();
        Assert.Single(filtered);
        Assert.Equal("Recent Movie", filtered[0].Title);
        Assert.Equal(2022, filtered[0].Year);
    }

    [Fact]
    public void ApplyFilters_WithGenreFilter_FiltersCorrectly()
    {
        // Arrange
        var query = new List<SearchableContent>
        {
            new() { Id = Guid.NewGuid(), Title = "Action Movie", GenresJson = "[\"Action\", \"Adventure\"]" },
            new() { Id = Guid.NewGuid(), Title = "Comedy Movie", GenresJson = "[\"Comedy\", \"Romance\"]" },
            new() { Id = Guid.NewGuid(), Title = "Action Comedy", GenresJson = "[\"Action\", \"Comedy\"]" }
        }.AsQueryable();

        var filters = new ContentSearchFilters
        {
            Genres = new List<string> { "Action" }
        };

        // Act
        var result = _service.ApplyFilters(query, filters);

        // Assert
        var filtered = result.ToList();
        Assert.Equal(2, filtered.Count);
        Assert.Contains(filtered, m => m.Title == "Action Movie");
        Assert.Contains(filtered, m => m.Title == "Action Comedy");
    }

    [Fact]
    public void ApplyFilters_WithAdultContentFilter_FiltersCorrectly()
    {
        // Arrange
        var query = new List<SearchableContent>
        {
            new() { Id = Guid.NewGuid(), Title = "Family Movie", IsAdult = false },
            new() { Id = Guid.NewGuid(), Title = "Adult Movie", IsAdult = true },
            new() { Id = Guid.NewGuid(), Title = "Another Family Movie", IsAdult = false }
        }.AsQueryable();

        var filters = new ContentSearchFilters
        {
            IncludeAdult = false
        };

        // Act
        var result = _service.ApplyFilters(query, filters);

        // Assert
        var filtered = result.ToList();
        Assert.Equal(2, filtered.Count);
        Assert.All(filtered, item => Assert.False(item.IsAdult));
    }

    [Fact]
    public void ApplyFilters_NullFilters_ReturnsOriginalQuery()
    {
        // Arrange
        var query = new List<SearchableContent>
        {
            new() { Id = Guid.NewGuid(), Title = "Test Movie" }
        }.AsQueryable();

        // Act
        var result = _service.ApplyFilters(query, null);

        // Assert
        Assert.Equal(query, result);
    }

    private async Task SeedTestData()
    {
        // Clear any existing data
        _context.SearchableContents.RemoveRange(_context.SearchableContents);
        _context.ContentStreamingOptions.RemoveRange(_context.ContentStreamingOptions);
        
        // Add test content
        var content1 = new SearchableContent
        {
            Id = Guid.NewGuid(),
            Title = "Test Movie 1",
            Type = ContentType.Movie,
            Year = 2022,
            Rating = 8.5m,
            GenresJson = "[\"Action\", \"Adventure\"]",
            RuntimeMinutes = 120,
            Language = "en",
            IsAdult = false,
            Popularity = 85.5m
        };

        var content2 = new SearchableContent
        {
            Id = Guid.NewGuid(),
            Title = "Test Series 1",
            Type = ContentType.TvSeries,
            Year = 2023,
            Rating = 7.8m,
            GenresJson = "[\"Drama\", \"Comedy\"]",
            Language = "en",
            IsAdult = false,
            Popularity = 72.3m
        };

        _context.SearchableContents.AddRange(content1, content2);

        // Add streaming options
        var streamingOption = new ContentStreamingOption
        {
            ContentId = content1.Id,
            CountryCode = "US",
            ServiceId = "netflix",
            ServiceName = "Netflix",
            StreamingType = StreamingType.Subscription,
            LastUpdated = DateTime.UtcNow
        };

        _context.ContentStreamingOptions.Add(streamingOption);
        await _context.SaveChangesAsync();
    }

    public override void Dispose()
    {
        _scope?.Dispose();
        base.Dispose();
    }
}