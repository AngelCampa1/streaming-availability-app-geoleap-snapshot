using System.ComponentModel.DataAnnotations;

namespace GeoLeap.Api.Models;

/// <summary>
/// Model for trending search queries
/// </summary>
public class TrendingSearch
{
    public TrendingSearch()
    {
        Query = string.Empty;
        TimeWindow = 86400000; // 24 hours
        LastUpdated = DateTime.UtcNow;
    }

    /// <summary>
    /// The search query text
    /// </summary>
    [Required]
    [MaxLength(500)]
    public string Query { get; set; }

    /// <summary>
    /// Number of times this query has been searched
    /// </summary>
    public int SearchCount { get; set; }

    /// <summary>
    /// Number of unique users who searched this
    /// </summary>
    public int UniqueUsers { get; set; }

    /// <summary>
    /// Trending score (higher = more trending)
    /// </summary>
    public decimal TrendingScore { get; set; }

    /// <summary>
    /// Time window for trending calculation in milliseconds
    /// </summary>
    public long TimeWindow { get; set; }

    /// <summary>
    /// Whether this search is rising in popularity
    /// </summary>
    public bool IsRising { get; set; }

    /// <summary>
    /// Category of the trending search
    /// </summary>
    [MaxLength(100)]
    public string? Category { get; set; }

    /// <summary>
    /// Optional image URL for visual representation
    /// </summary>
    [MaxLength(500)]
    public string? ImageUrl { get; set; }

    /// <summary>
    /// Percentage change in search volume
    /// </summary>
    public decimal? PercentageChange { get; set; }

    /// <summary>
    /// When this trending data was last updated
    /// </summary>
    public DateTime LastUpdated { get; set; }
}

/// <summary>
/// Search history record for analytics and trending calculations
/// </summary>
public class SearchHistoryRecord
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    /// <summary>
    /// User who performed the search
    /// </summary>
    public Guid UserId { get; set; }
    
    /// <summary>
    /// Search query text
    /// </summary>
    [Required]
    [MaxLength(500)]
    public string Query { get; set; } = string.Empty;
    
    /// <summary>
    /// Number of results returned
    /// </summary>
    public int ResultCount { get; set; }
    
    /// <summary>
    /// Region where search was performed
    /// </summary>
    [MaxLength(10)]
    public string Region { get; set; } = "US";
    
    /// <summary>
    /// When the search was performed
    /// </summary>
    public DateTime SearchedAt { get; set; } = DateTime.UtcNow;
    
    /// <summary>
    /// Whether user clicked on any results
    /// </summary>
    public bool HasClickthrough { get; set; }
    
    /// <summary>
    /// Search execution time in milliseconds
    /// </summary>
    public int ExecutionTimeMs { get; set; }
    
    /// <summary>
    /// User agent string
    /// </summary>
    [MaxLength(500)]
    public string? UserAgent { get; set; }
    
    /// <summary>
    /// IP address (hashed for privacy)
    /// </summary>
    [MaxLength(64)]
    public string? IpHash { get; set; }
}

/// <summary>
/// Autocomplete suggestion model
/// </summary>
public class AutocompleteSuggestion
{
    /// <summary>
    /// Suggestion text
    /// </summary>
    [Required]
    [MaxLength(500)]
    public string Text { get; set; } = string.Empty;
    
    /// <summary>
    /// Type of suggestion
    /// </summary>
    public AutocompleteSuggestionType Type { get; set; }
    
    /// <summary>
    /// Popularity score
    /// </summary>
    public decimal Score { get; set; }
    
    /// <summary>
    /// Year associated with the suggestion (for movies/shows)
    /// </summary>
    public int? Year { get; set; }
    
    /// <summary>
    /// Category or genre
    /// </summary>
    [MaxLength(100)]
    public string? Category { get; set; }
    
    /// <summary>
    /// Image URL for visual suggestions
    /// </summary>
    [MaxLength(500)]
    public string? ImageUrl { get; set; }
}

/// <summary>
/// Autocomplete suggestion types
/// </summary>
public enum AutocompleteSuggestionType
{
    Title = 1,
    Person = 2,
    Genre = 3,
    Keyword = 4,
    Series = 5,
    Movie = 6
}