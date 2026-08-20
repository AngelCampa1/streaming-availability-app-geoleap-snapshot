using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service for generating and managing SEO metadata
/// </summary>
public interface ISeoMetadataService
{
    /// <summary>
    /// Generate optimized SEO metadata for content
    /// </summary>
    Task<SeoMetadataResponse> GenerateMetadataAsync(SeoMetadataRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// Generate metadata specifically for content details
    /// </summary>
    Task<SeoMetadataResponse> GenerateContentMetadataAsync(ContentDetails content, string? language = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Generate metadata for search result pages
    /// </summary>
    Task<SeoMetadataResponse> GenerateSearchMetadataAsync(string query, string? genre = null, int? year = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Generate metadata for genre/category pages
    /// </summary>
    Task<SeoMetadataResponse> GenerateGenreMetadataAsync(string genre, string? language = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Optimize keywords based on content and search data
    /// </summary>
    Task<List<string>> OptimizeKeywordsAsync(string content, List<string>? existingKeywords = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Generate canonical URL for content
    /// </summary>
    string GenerateCanonicalUrl(string contentType, string slug, string? language = null);

    /// <summary>
    /// Save SEO metadata to database
    /// </summary>
    Task<SeoMetadata> SaveMetadataAsync(SeoMetadataRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// Update existing SEO metadata
    /// </summary>
    Task<SeoMetadata?> UpdateMetadataAsync(Guid id, SeoMetadataRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get SEO metadata by slug
    /// </summary>
    Task<SeoMetadata?> GetMetadataBySlugAsync(string slug, string? language = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get SEO metadata by content ID
    /// </summary>
    Task<SeoMetadata?> GetMetadataByContentIdAsync(Guid contentId, string? language = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Bulk update metadata for content type
    /// </summary>
    Task<int> BulkUpdateMetadataAsync(string contentType, CancellationToken cancellationToken = default);

    /// <summary>
    /// Validate SEO metadata quality
    /// </summary>
    Task<List<SeoIssue>> ValidateMetadataAsync(SeoMetadata metadata, CancellationToken cancellationToken = default);
}