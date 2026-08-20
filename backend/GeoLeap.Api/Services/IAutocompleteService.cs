using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

/// <summary>
/// Advanced autocomplete service interface for intelligent search suggestions
/// </summary>
public interface IAutocompleteService
{
    /// <summary>
    /// Get intelligent autocomplete suggestions with ranking and context
    /// </summary>
    /// <param name="partialQuery">Partial query for autocomplete</param>
    /// <param name="maxResults">Maximum number of suggestions</param>
    /// <param name="userId">User ID for personalized suggestions</param>
    /// <param name="correlationId">Correlation ID for request tracking</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>List of ranked autocomplete suggestions</returns>
    Task<List<AutocompleteSuggestion>> GetIntelligentSuggestionsAsync(
        string partialQuery,
        int maxResults = 10,
        string? userId = null,
        string correlationId = "",
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Get recent search history for the user
    /// </summary>
    /// <param name="userId">User ID</param>
    /// <param name="maxResults">Maximum number of recent searches</param>
    /// <param name="correlationId">Correlation ID for request tracking</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>List of recent searches</returns>
    Task<List<SearchHistoryItem>> GetRecentSearchesAsync(
        string userId,
        int maxResults = 10,
        string correlationId = "",
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Get trending searches for suggestion
    /// </summary>
    /// <param name="maxResults">Maximum number of trending searches</param>
    /// <param name="timeWindow">Time window for trending analysis</param>
    /// <param name="correlationId">Correlation ID for request tracking</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>List of trending searches</returns>
    Task<List<TrendingSearch>> GetTrendingSearchesAsync(
        int maxResults = 10,
        TimeSpan? timeWindow = null,
        string correlationId = "",
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Track a search query for analytics and personalization
    /// </summary>
    /// <param name="query">Search query</param>
    /// <param name="userId">User ID</param>
    /// <param name="resultCount">Number of results returned</param>
    /// <param name="correlationId">Correlation ID for request tracking</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Task</returns>
    Task TrackSearchAsync(
        string query,
        string userId,
        int resultCount,
        string correlationId = "",
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Clear user's search history
    /// </summary>
    /// <param name="userId">User ID</param>
    /// <param name="correlationId">Correlation ID for request tracking</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Task</returns>
    Task ClearSearchHistoryAsync(
        string userId,
        string correlationId = "",
        CancellationToken cancellationToken = default);
}

/// <summary>
/// Enhanced autocomplete suggestion with ranking and metadata
/// </summary>
public class AutocompleteSuggestion
{
    public string Text { get; set; } = string.Empty;
    public AutocompleteSuggestionType Type { get; set; }
    public decimal Score { get; set; }
    public string? ContentId { get; set; }
    public ContentType? ContentType { get; set; }
    public string? PosterUrl { get; set; }
    public int? Year { get; set; }
    public List<string> Genres { get; set; } = new();
    public decimal? Rating { get; set; }
    public int EstimatedResults { get; set; }
    public Dictionary<string, object> Metadata { get; set; } = new();
}

/// <summary>
/// Types of autocomplete suggestions
/// </summary>
public enum AutocompleteSuggestionType
{
    Title,          // Movie or TV show title
    Person,         // Actor, director, etc.
    Genre,          // Genre name
    Character,      // Character name
    Collection,     // Franchise or collection
    Trending,       // Trending search
    History,        // User's search history
    Typo            // Typo correction
}

/// <summary>
/// User's search history item
/// </summary>
public class SearchHistoryItem
{
    public string Query { get; set; } = string.Empty;
    public DateTime SearchedAt { get; set; }
    public int ResultCount { get; set; }
    public bool WasSuccessful => ResultCount > 0;
}

/// <summary>
/// Trending search item
/// </summary>
public class TrendingSearch
{
    public string Query { get; set; } = string.Empty;
    public int SearchCount { get; set; }
    public int UniqueUsers { get; set; }
    public decimal TrendingScore { get; set; }
    public long TimeWindow { get; set; } // TimeWindow in milliseconds to match frontend
    public bool IsRising { get; set; }
}