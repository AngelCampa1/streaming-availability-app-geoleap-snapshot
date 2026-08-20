using System.ComponentModel.DataAnnotations;
using GeoLeap.Api.Data;

namespace GeoLeap.Api.Models;

// Simple API Response models - REMOVED to avoid duplication with UnifiedModels.cs

// Response DTOs for content endpoints
public class ContentSitemapResponse
{
    public List<ContentSitemapEntry> Content { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public bool HasMore { get; set; }
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
}

public class ContentSitemapEntry
{
    public string Id { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public DateTime? LastModified { get; set; }
    public int? ReleaseYear { get; set; }
    public double Priority { get; set; } = 0.5;
    public string? PosterUrl { get; set; }
}

// Enhanced ContentData for SEO optimization
public class ContentData
{
    public string Id { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? OriginalTitle { get; set; }
    public string? Overview { get; set; }
    public string? Tagline { get; set; }
    public int? Year { get; set; }
    public int? ReleaseYear { get; set; }
    public DateTime? ReleaseDate { get; set; }
    public decimal? Rating { get; set; }
    public int? VoteCount { get; set; }
    public decimal Popularity { get; set; }
    public int? Runtime { get; set; }
    public int? RuntimeMinutes { get; set; }
    public string? ContentRating { get; set; }
    public string? Language { get; set; }
    public bool IsAdult { get; set; }
    public List<string> Genres { get; set; } = new();
    public string[]? GenreNames { get; set; }
    public string? PrimaryGenre { get; set; }
    public string? PosterUrl { get; set; }
    public string? BackdropUrl { get; set; }
    public string? ImageUrl { get; set; }
    public string? Status { get; set; }
    public string? Homepage { get; set; }
    public string? OriginalLanguage { get; set; }
    public List<string> ProductionCountries { get; set; } = new();
    public string Slug { get; set; } = string.Empty;
    public List<string> Cast { get; set; } = new();
    public List<string> Crew { get; set; } = new();
    public List<StreamingAvailability> StreamingOptions { get; set; } = new();
    public List<ExternalId> ExternalIds { get; set; } = new();
    public int AvailableCountriesCount { get; set; }
    public int AvailableServicesCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? LastUpdated { get; set; }
    public ContentMetadata Metadata { get; set; } = new();
}


/// <summary>
/// Content statistics for analytics and reporting
/// </summary>
public class ContentStatistics
{
    public int TotalMovies { get; set; }
    public int TotalTvShows { get; set; }
    public int TotalDocumentaries { get; set; }
    public int TotalAnime { get; set; }
    public int TotalContent { get; set; }
    public DateTime LastUpdated { get; set; }
    public List<GenreStatistic> TopGenres { get; set; } = new();
    public List<YearStatistic> ContentByYear { get; set; } = new();
    public int UniqueStreamingServices { get; set; }
    public int TotalStreamingOptions { get; set; }
}

public class GenreStatistic
{
    public string Genre { get; set; } = string.Empty;
    public int Count { get; set; }
    public double Percentage { get; set; }
}

public class YearStatistic
{
    public int Year { get; set; }
    public int Count { get; set; }
    public string Type { get; set; } = string.Empty;
}

// Missing request models for tests
public class ContentBatchRequest
{
    [Required]
    public List<string> ContentIds { get; set; } = new();
}

// Re-add ContentSearchRequest and ContentSearchResult to fix compilation errors
public class ContentSearchRequest
{
    public string Query { get; set; } = string.Empty;
    public ContentType? ContentType { get; set; }
    public string[]? Genres { get; set; }
    public int? MinYear { get; set; }
    public int? MaxYear { get; set; }
    public decimal? MinRating { get; set; }
    public decimal? MaxRating { get; set; }
    public string? Language { get; set; }
    public string? CountryCode { get; set; }
    public string[]? Countries { get; set; }
    public DataQuality RequiredQuality { get; set; } = DataQuality.Standard;
    public bool IncludeAdult { get; set; } = false;
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public string? SortBy { get; set; } = "popularity";
    public string? SortOrder { get; set; } = "desc";
}

public class ContentSearchResult
{
    public List<ContentData> Results { get; set; } = new();
    public int TotalResults { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }
    public string Query { get; set; } = string.Empty;
    public bool HasNextPage { get; set; }
    public bool HasPreviousPage { get; set; }
    public bool HasMore { get; set; }
    public DateTime SearchedAt { get; set; } = DateTime.UtcNow;
    public TimeSpan ResponseTime { get; set; }
    public List<string> DataSources { get; set; } = new();
}

public class PaginatedResult<T>
{
    public List<T> Items { get; set; } = new();
    public int TotalItems { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }
    public bool HasNextPage { get; set; }
    public bool HasPreviousPage { get; set; }
}

// Missing DTOs for search functionality
public class SearchResultsDto
{
    public List<SearchResultDto> Results { get; set; } = new();
    public int TotalResults { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages { get; set; }
    public bool HasNextPage { get; set; }
    public bool HasPreviousPage { get; set; }
    public string Query { get; set; } = string.Empty;
    public DateTime SearchedAt { get; set; } = DateTime.UtcNow;
}

public class SearchResultDto
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string? Overview { get; set; }
    public decimal? Rating { get; set; }
    public int? ReleaseYear { get; set; }
    public DateTime? ReleaseDate { get; set; }
    public string[]? GenreNames { get; set; }
    public string? PosterUrl { get; set; }
    public List<string> StreamingServices { get; set; } = new();
    public string? Language { get; set; }
    public int? Runtime { get; set; }
}