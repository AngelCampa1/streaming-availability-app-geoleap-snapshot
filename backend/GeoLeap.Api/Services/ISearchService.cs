using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

/// <summary>
/// Global content search service interface
/// Provides unified search across all streaming availability and metadata providers
/// </summary>
public interface ISearchService
{
    /// <summary>
    /// Performs global search across all supported countries and streaming services
    /// </summary>
    /// <param name="request">Search request with query and filters</param>
    /// <param name="correlationId">Correlation ID for request tracking</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Global search response with aggregated results</returns>
    Task<GlobalSearchResponse> SearchGlobalContentAsync(
        GlobalSearchRequest request, 
        string correlationId,
        string? userId = null,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Get detailed search result with full streaming availability
    /// </summary>
    /// <param name="contentId">Content identifier from search result</param>
    /// <param name="contentType">Content type (movie or show)</param>
    /// <param name="correlationId">Correlation ID for request tracking</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Detailed content information with global availability</returns>
    Task<GlobalSearchResult> GetSearchResultDetailsAsync(
        string contentId, 
        ContentType contentType,
        string correlationId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Get search suggestions for query improvement
    /// </summary>
    /// <param name="query">Original query that returned poor results</param>
    /// <param name="correlationId">Correlation ID for request tracking</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>List of search suggestions</returns>
    Task<List<SearchSuggestion>> GetSearchSuggestionsAsync(
        string query, 
        string correlationId,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Get autocomplete suggestions for search queries
    /// </summary>
    /// <param name="partialQuery">Partial query for autocomplete</param>
    /// <param name="maxResults">Maximum number of suggestions</param>
    /// <param name="correlationId">Correlation ID for request tracking</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>List of autocomplete suggestions</returns>
    Task<List<string>> GetAutocompleteSuggestionsAsync(
        string partialQuery, 
        int maxResults = 10,
        string correlationId = "",
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Get popular content for trending searches
    /// </summary>
    /// <param name="contentType">Content type filter</param>
    /// <param name="country">Country filter</param>
    /// <param name="limit">Maximum number of results</param>
    /// <param name="correlationId">Correlation ID for request tracking</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>List of popular content</returns>
    Task<List<GlobalSearchResult>> GetPopularContentAsync(
        ContentType? contentType = null,
        string? country = null,
        int limit = 20,
        string correlationId = "",
        CancellationToken cancellationToken = default);

    // Add backward compatibility method for tests
    /// <summary>
    /// Backward compatibility search method for tests
    /// </summary>
    Task<SearchResponse<GlobalSearchResult>> SearchAsync(
        SearchRequest request,
        CancellationToken cancellationToken = default);
        
    /// <summary>
    /// Search content with additional parameters for test compatibility
    /// </summary>
    Task<SearchResponse<GlobalSearchResult>> SearchContentAsync(
        string query,
        ContentType? contentType,
        string? country = null,
        int page = 1,
        int pageSize = 10,
        CancellationToken cancellationToken = default);
        
    // US-8.5 Advanced filtering methods
    Task<List<Models.TrendingSearch>> GetTrendingSearchesAsync(int limit, string? region = null, CancellationToken cancellationToken = default);
    Task<List<GlobalSearchResult>> GetPopularContentAsync(ContentType contentType, string region, int limit, string correlationId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Record a search to user's search history
    /// </summary>
    /// <param name="userId">User identifier</param>
    /// <param name="query">Search query</param>
    /// <param name="resultCount">Number of results returned</param>
    /// <param name="region">Search region</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task RecordSearchAsync(Guid userId, string query, int resultCount, string region = "US", CancellationToken cancellationToken = default);
}