using GeoLeap.Api.ProgrammaticSeo.Models;

namespace GeoLeap.Api.ProgrammaticSeo.Services;

/// <summary>
/// Interface for content metadata service - handles content freshness and trending detection
/// </summary>
public interface IContentMetadataService
{
    // Content Freshness System
    Task UpdateContentTrendingScoresAsync();
    Task<List<TrendingContent>> GetTrendingContentAsync(int hours = 24);
    Task<List<ContentMetadata>> ImportStreamingAvailabilityAsync(string country = "US");
    Task<List<StaleContent>> DetectStaleContentAsync(int maxDaysOld = 30);
    Task<int> AutoRefreshStaleContentAsync(int batchSize = 50);
    
    // Content Enrichment
    Task<ContentMetadata> EnrichContentMetadataAsync(ContentMetadata content);
    Task<List<ContentVariant>> GenerateContentVariantsAsync(long contentId, int variantCount = 3);
}