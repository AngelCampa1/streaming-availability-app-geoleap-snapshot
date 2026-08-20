using GeoLeap.Api.ProgrammaticSeo.Models;

namespace GeoLeap.Api.ProgrammaticSeo.Services;

/// <summary>
/// Service interface for streaming content metadata integration and freshness management
/// </summary>
public interface IContentMetadataService
{
    // Content Metadata Integration
    Task<List<Models.ContentMetadata>> ImportStreamingAvailabilityAsync(string country = "US");
    Task<List<Models.ContentMetadata>> ImportTrendingContentAsync(int days = 7);
    Task<Models.ContentMetadata?> GetContentMetadataAsync(string contentId, string contentType);
    Task<List<Models.ContentMetadata>> GetContentByGenreAsync(string genre, int limit = 100);
    Task<List<Models.ContentMetadata>> GetContentByLocationAsync(string country, int limit = 100);
    
    // Content Freshness Management
    Task<int> RefreshOutdatedContentAsync(int batchSize = 500);
    Task<List<Models.ContentMetadata>> DetectContentChangesAsync(DateTime? since = null);
    Task UpdateContentAvailabilityAsync(string contentId, string country, bool isAvailable);
    Task<Dictionary<string, DateTime>> GetLastUpdateTimestampsAsync();
    
    // Automated Content Discovery
    Task<List<Models.ContentMetadata>> DiscoverNewContentAsync(string[] genres, int maxResults = 50);
    Task<List<Models.ContentMetadata>> FindContentGapsAsync(string country, string genre);
    Task<List<string>> GetMissingContentMetadataAsync();
    Task AutoUpdateContentFromSourcesAsync();
    
    // Content Enhancement
    Task EnhanceContentWithMetadataAsync(string contentId);
    Task<Models.ContentMetadata> EnrichContentDataAsync(Models.ContentMetadata content);
    Task UpdateContentPopularityScoresAsync();
    Task<List<Models.ContentMetadata>> GetContentNeedingEnhancementAsync(int limit = 100);
    
    // Location-Based Content Management
    Task<Dictionary<string, List<Models.ContentMetadata>>> GetContentAvailabilityMapAsync();
    Task<List<string>> GetAvailableCountriesForContentAsync(string contentId);
    Task UpdateLocationBasedAvailabilityAsync();
    Task<Models.ContentLocationStats> GetLocationStatsAsync(string country);
    
    // Trending and Analytics
    Task<List<Models.TrendingContent>> GetTrendingContentByLocationAsync(string country, int days = 7);
    Task<List<Models.ContentMetadata>> PredictUpcomingTrendingContentAsync(int daysAhead = 30);
    Task<Models.TrendingAnalytics> AnalyzeContentTrendsAsync(string contentType, int days = 30);
    Task UpdateContentTrendingScoresAsync();
    
    // Data Quality and Validation
    Task<List<Models.ContentValidationError>> ValidateContentDataAsync();
    Task<int> CleanupIncompleteContentAsync();
    Task<Models.ContentQualityReport> GenerateQualityReportAsync();
    Task<List<string>> DetectDuplicateContentAsync(float similarityThreshold = 0.9f);
    
    // Batch Operations
    Task<Models.BatchOperationResult> BatchUpdateContentAsync(List<Models.ContentUpdateRequest> updates);
    Task<Models.BatchOperationResult> BatchImportContentAsync(List<Models.ContentMetadata> contentList);
    Task ScheduleAutomaticUpdatesAsync(TimeSpan interval);
    
    // Content Relationships
    Task<List<Models.ContentMetadata>> GetSimilarContentAsync(string contentId, int limit = 20);
    Task<List<Models.ContentMetadata>> GetContentByActorAsync(string actorName, int limit = 50);
    Task<List<Models.ContentMetadata>> GetContentByDirectorAsync(string directorName, int limit = 50);
    Task UpdateContentRelationshipsAsync();
}