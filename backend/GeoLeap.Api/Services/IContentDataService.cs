using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

/// <summary>
/// Unified interface for all external content data access
/// Provides abstraction over multiple streaming and metadata providers
/// </summary>
public interface IContentDataService
{
    /// <summary>
    /// Search for content across all available providers
    /// </summary>
    /// <param name="request">Search request parameters</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Unified search results</returns>
    Task<ContentSearchResult> SearchContentAsync(ContentSearchRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get detailed information about specific content
    /// </summary>
    /// <param name="contentId">Content identifier</param>
    /// <param name="type">Content type (movie, show)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Detailed content information</returns>
    Task<ContentDetails> GetContentDetailsAsync(string contentId, ContentType type, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get streaming availability for content across all regions
    /// </summary>
    /// <param name="contentId">Content identifier</param>
    /// <param name="countryCode">Specific country code (optional)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Streaming availability information</returns>
    Task<StreamingAvailabilityResponse> GetStreamingAvailabilityAsync(string contentId, string? countryCode = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get list of available streaming services
    /// </summary>
    /// <param name="countryCode">Country code filter (optional)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>List of streaming services</returns>
    Task<List<StreamingService>> GetAvailableServicesAsync(string? countryCode = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get detailed information about a person (actor, director, etc.)
    /// </summary>
    /// <param name="personId">Person identifier</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Person details</returns>
    Task<PersonDetails> GetPersonDetailsAsync(string personId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get list of available genres for a content type
    /// </summary>
    /// <param name="type">Content type</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>List of genres</returns>
    Task<List<Genre>> GetGenresAsync(ContentType type, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get health status of all providers
    /// </summary>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Provider health status information</returns>
    Task<ProviderHealthStatus> GetProvidersHealthAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Invalidate cache for specific content
    /// </summary>
    /// <param name="contentId">Content identifier</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task InvalidateCacheAsync(string contentId, CancellationToken cancellationToken = default);

    /// <summary>
    /// Warm up cache for popular content
    /// </summary>
    /// <param name="contentIds">List of content IDs to cache</param>
    /// <param name="cancellationToken">Cancellation token</param>
    Task WarmupCacheAsync(List<string> contentIds, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get autocomplete suggestions for search queries
    /// </summary>
    /// <param name="partialQuery">Partial query for autocomplete</param>
    /// <param name="maxResults">Maximum number of suggestions</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>List of autocomplete suggestions</returns>
    Task<List<string>> GetAutocompleteSuggestionsAsync(string partialQuery, int maxResults = 10, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Get popular content for trending searches - missing method for test compatibility
    /// </summary>
    /// <param name="contentType">Content type filter</param>
    /// <param name="country">Country filter</param>
    /// <param name="limit">Maximum number of results</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>List of popular content</returns>
    Task<List<ContentMetadata>> GetPopularContentAsync(ContentType? contentType = null, string? country = null, int limit = 20, CancellationToken cancellationToken = default);
}