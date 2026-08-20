using GeoLeap.Api.Models;
using System.Linq.Expressions;

namespace GeoLeap.Api.Data.Repositories;

/// <summary>
/// Specialized repository interface for Content entity operations
/// </summary>
public interface IContentRepository : IRepository<SearchableContent, int>
{
    // Content search and discovery
    Task<SearchableContent?> GetByTitleAsync(string title, CancellationToken cancellationToken = default);
    Task<SearchableContent?> GetByExternalIdAsync(string externalId, string source, CancellationToken cancellationToken = default);
    Task<bool> ExternalIdExistsAsync(string externalId, string source, CancellationToken cancellationToken = default);
    
    // Content filtering and search
    Task<(IEnumerable<SearchableContent> Content, int TotalCount)> SearchContentAsync(
        string? query = null,
        ContentType? contentType = null,
        IEnumerable<string>? genres = null,
        int? minYear = null,
        int? maxYear = null,
        double? minRating = null,
        double? maxRating = null,
        IEnumerable<string>? streamingServices = null,
        string? country = null,
        int page = 1,
        int pageSize = 20,
        string? sortBy = null,
        bool sortDescending = false,
        CancellationToken cancellationToken = default);

    // Content analytics
    Task<IEnumerable<SearchableContent>> GetPopularContentAsync(
        ContentType? contentType = null, 
        int limit = 20, 
        CancellationToken cancellationToken = default);
        
    Task<IEnumerable<SearchableContent>> GetTrendingContentAsync(
        int days = 7, 
        int limit = 20, 
        CancellationToken cancellationToken = default);
        
    Task<IEnumerable<SearchableContent>> GetRecentlyAddedAsync(
        int days = 30, 
        int limit = 50, 
        CancellationToken cancellationToken = default);

    // Content categorization
    Task<IEnumerable<SearchableContent>> GetByGenreAsync(
        string genre, 
        int skip = 0, 
        int take = 50, 
        CancellationToken cancellationToken = default);
        
    Task<IEnumerable<SearchableContent>> GetByYearAsync(
        int year, 
        int skip = 0, 
        int take = 50, 
        CancellationToken cancellationToken = default);
        
    Task<IEnumerable<SearchableContent>> GetByRatingRangeAsync(
        double minRating, 
        double maxRating, 
        int skip = 0, 
        int take = 50, 
        CancellationToken cancellationToken = default);

    // Streaming availability
    Task<IEnumerable<SearchableContent>> GetAvailableOnServiceAsync(
        string serviceName, 
        string? country = null, 
        CancellationToken cancellationToken = default);
        
    Task<IEnumerable<ContentStreamingOption>> GetStreamingOptionsAsync(
        int contentId, 
        string? country = null, 
        CancellationToken cancellationToken = default);

    // Content statistics
    Task<Dictionary<string, int>> GetContentStatisticsAsync(CancellationToken cancellationToken = default);
    Task<Dictionary<string, int>> GetGenreCountsAsync(CancellationToken cancellationToken = default);
    Task<Dictionary<int, int>> GetYearCountsAsync(CancellationToken cancellationToken = default);
    Task<Dictionary<ContentType, int>> GetContentTypeCountsAsync(CancellationToken cancellationToken = default);

    // Content recommendations
    Task<IEnumerable<SearchableContent>> GetSimilarContentAsync(
        int contentId, 
        int limit = 10, 
        CancellationToken cancellationToken = default);
        
    Task<IEnumerable<SearchableContent>> GetRecommendedForUserAsync(
        Guid userId, 
        int limit = 20, 
        CancellationToken cancellationToken = default);

    // Content management
    Task<int> BulkUpdateStreamingAvailabilityAsync(
        IEnumerable<int> contentIds, 
        string serviceName, 
        string country, 
        bool isAvailable, 
        CancellationToken cancellationToken = default);
        
    Task<int> BulkUpdateRatingsAsync(
        IDictionary<int, double> contentRatings, 
        CancellationToken cancellationToken = default);

    // Search optimization
    Task<IEnumerable<SearchableContent>> FullTextSearchAsync(
        string searchTerm, 
        int limit = 50, 
        CancellationToken cancellationToken = default);
        
    Task<IEnumerable<string>> GetAutocompleteSuggestionsAsync(
        string partial, 
        int limit = 10, 
        CancellationToken cancellationToken = default);

    // Content quality and metadata
    Task<IEnumerable<SearchableContent>> GetContentMissingMetadataAsync(
        CancellationToken cancellationToken = default);
        
    Task<IEnumerable<SearchableContent>> GetLowQualityContentAsync(
        double minRatingThreshold = 3.0, 
        CancellationToken cancellationToken = default);

    // Export and reporting
    Task<IEnumerable<SearchableContent>> GetContentForExportAsync(
        Expression<Func<SearchableContent, bool>>? filter = null,
        CancellationToken cancellationToken = default);

    // Legacy compatibility methods
    Task<SearchableContent?> FindByTitleAsync(string title);
    Task<List<SearchableContent>> SearchAsync(string query, ContentType? contentType = null, int skip = 0, int take = 50);
    Task<List<SearchableContent>> GetPopularContentAsync(ContentType? contentType = null, int limit = 20);
    Task<List<SearchableContent>> GetTrendingContentAsync(int days = 7, int limit = 20);
    Task<SearchableContent?> GetByExternalIdAsync(string externalId, string source);
    Task<bool> ExternalIdExistsAsync(string externalId, string source);
    Task<List<SearchableContent>> GetByGenreAsync(string genre, int skip = 0, int take = 50);
    Task<List<SearchableContent>> GetByYearAsync(int year, int skip = 0, int take = 50);
    Task<List<SearchableContent>> GetByRatingRangeAsync(double minRating, double maxRating, int skip = 0, int take = 50);
    Task<List<SearchableContent>> GetRecentlyAddedAsync(int days = 30, int limit = 50);
    Task<int> GetTotalCountAsync();
    Task<int> GetCountByTypeAsync(ContentType contentType);
}