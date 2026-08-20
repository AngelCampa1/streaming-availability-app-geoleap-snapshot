using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service interface for content management and SEO-optimized content delivery
/// </summary>
public interface IContentService
{
    /// <summary>
    /// Get content details by ID and type for SEO content pages
    /// </summary>
    Task<ContentData?> GetContentByIdAsync(string id, string type);

    /// <summary>
    /// Get content by SEO-friendly slug
    /// </summary>
    Task<ContentData?> GetContentBySlugAsync(string type, string slug);

    /// <summary>
    /// Get related content recommendations for internal linking
    /// </summary>
    Task<List<ContentData>> GetRelatedContentAsync(string contentId, string[]? genres = null, int limit = 10);

    /// <summary>
    /// Get popular content for sitemap generation and homepage features
    /// </summary>
    Task<List<ContentData>> GetPopularContentAsync(string type = "all", int limit = 100);

    /// <summary>
    /// Get streaming availability for specific content
    /// </summary>
    Task<List<StreamingAvailability>> GetStreamingAvailabilityAsync(string id, string type, string country = "US");

    /// <summary>
    /// Get content for sitemap generation with pagination
    /// </summary>
    Task<ContentSitemapResponse> GetContentForSitemapAsync(int page = 1, int pageSize = 1000, string type = "all", DateTime? modifiedSince = null);

    /// <summary>
    /// Search for content with enhanced metadata for SEO
    /// </summary>
    Task<ContentSearchResult> SearchContentAsync(string query, string type = "all", int page = 1, int pageSize = 20, string? country = "US");

    /// <summary>
    /// Transform SearchableContent to ContentData format
    /// </summary>
    ContentData TransformToContentData(SearchableContent searchableContent);

    /// <summary>
    /// Generate SEO-friendly slug for content
    /// </summary>
    string GenerateSlug(string title, int? year = null, string? id = null);

    /// <summary>
    /// Parse content ID from SEO slug
    /// </summary>
    (string? id, string? title) ParseSlug(string slug);

    /// <summary>
    /// Get content metadata for SEO optimization
    /// </summary>
    Task<ContentMetadata> GetContentMetadataAsync(string id, string type);

    /// <summary>
    /// Update content last modified timestamp
    /// </summary>
    Task UpdateContentTimestampAsync(string id, string type);

    /// <summary>
    /// Get trending content based on search analytics
    /// </summary>
    Task<List<ContentData>> GetTrendingContentAsync(string type = "all", int limit = 20, int days = 7);

    /// <summary>
    /// Get content by genre for category pages
    /// </summary>
    Task<List<ContentData>> GetContentByGenreAsync(string genre, string type = "all", int page = 1, int pageSize = 20);

    /// <summary>
    /// Get content by release year for year pages
    /// </summary>
    Task<List<ContentData>> GetContentByYearAsync(int year, string type = "all", int page = 1, int pageSize = 20);

    /// <summary>
    /// Get content statistics for analytics
    /// </summary>
    Task<ContentStatistics> GetContentStatisticsAsync();

    /// <summary>
    /// Get content details by type and ID - alternative signature for compatibility
    /// </summary>
    Task<ContentData?> GetContentDetailsAsync(string type, string id);

    /// <summary>
    /// Get multiple content items by their IDs
    /// </summary>
    Task<List<ContentData>> GetContentByIdsAsync(List<string> ids);

    /// <summary>
    /// Search content with advanced filters
    /// </summary>
    Task<List<ContentData>> SearchContentWithFiltersAsync(string query, ContentSearchFilters filters, int page = 1, int pageSize = 20);

    /// <summary>
    /// Get multiple content items by batch request
    /// </summary>
    Task<List<ContentData>> GetContentBatchAsync(List<string> contentIds);

    /// <summary>
    /// Search content using ContentSearchRequest
    /// </summary>
    Task<PaginatedResult<ContentData>> SearchContentAsync(ContentSearchRequest request);
}

