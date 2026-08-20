using System.ComponentModel.DataAnnotations;

namespace GeoLeap.Api.Models;

/// <summary>
/// Entity for tracking user search history for autocomplete personalization
/// </summary>
public class SearchHistory
{
    [Key]
    public int Id { get; set; }

    [Required]
    public Guid UserId { get; set; }

    [Required]
    [MaxLength(500)]
    public string Query { get; set; } = string.Empty;
    
    /// <summary>
    /// SearchTerm alias for compatibility with PerformanceIndexConfiguration
    /// </summary>
    public string SearchTerm => Query;

    [Required]
    public DateTime SearchedAt { get; set; } = DateTime.UtcNow;
    
    /// <summary>
    /// Date alias for compatibility with PerformanceIndexConfiguration
    /// </summary>
    public DateTime Date => SearchedAt.Date;

    public int ResultCount { get; set; }

    public bool WasSuccessful => ResultCount > 0;

    /// <summary>
    /// Search execution time in milliseconds
    /// </summary>
    public int ExecutionTimeMs { get; set; }

    /// <summary>
    /// Search type/context for analytics
    /// </summary>
    [MaxLength(50)]
    public string SearchType { get; set; } = "General";

    /// <summary>
    /// Region/country context for the search
    /// </summary>
    [MaxLength(10)]
    public string Region { get; set; } = "US";

    /// <summary>
    /// Correlation ID for tracking
    /// </summary>
    [MaxLength(100)]
    public string? CorrelationId { get; set; }

    /// <summary>
    /// Additional metadata stored as JSON
    /// </summary>
    public string? Metadata { get; set; }

    // Navigation properties
    public User User { get; set; } = null!;
}

/// <summary>
/// Entity for tracking global search trends
/// </summary>
public class SearchTrend
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(500)]
    public string Query { get; set; } = string.Empty;
    
    /// <summary>
    /// SearchTerm alias for compatibility with PerformanceIndexConfiguration
    /// </summary>
    public string SearchTerm => Query;

    [Required]
    public DateTime Date { get; set; } = DateTime.UtcNow.Date;

    public int SearchCount { get; set; } = 1;

    public int UniqueUsers { get; set; } = 1;

    public decimal TrendingScore { get; set; }

    public bool IsRising { get; set; }

    /// <summary>
    /// Time window for trending calculation (in hours)
    /// </summary>
    public int TimeWindowHours { get; set; } = 24;

    /// <summary>
    /// Last time this trend was updated
    /// </summary>
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
}