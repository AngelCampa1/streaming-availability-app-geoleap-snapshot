using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

/// <summary>
/// ASO (App Store Optimization) service interface with ML-powered keyword discovery
/// </summary>
public interface IAsoService
{
    // Keyword management
    Task<List<AsoKeywordDto>> GetKeywordsAsync(Guid userId, AppStore? appStore = null, string? country = null);
    Task<AsoKeywordDto> GetKeywordAsync(int id, Guid userId);
    Task<AsoKeywordDto> CreateKeywordAsync(CreateAsoKeywordDto dto, Guid userId);
    Task<AsoKeywordDto> UpdateKeywordAsync(int id, CreateAsoKeywordDto dto, Guid userId);
    Task<bool> DeleteKeywordAsync(int id, Guid userId);
    
    // ML-powered keyword discovery
    Task<List<AsoKeywordDto>> DiscoverKeywordsAsync(KeywordDiscoveryRequestDto request, Guid userId);
    Task<List<AsoKeywordDto>> AnalyzeCompetitorKeywordsAsync(string bundleId, AppStore appStore, string country, Guid userId);
    Task UpdateKeywordMetricsAsync(int keywordId);
    
    // App store listing management
    Task<List<AppStoreListingDto>> GetListingsAsync(Guid userId, AppStore? appStore = null);
    Task<AppStoreListingDto> GetListingAsync(int id, Guid userId);
    Task<AppStoreListingDto> CreateListingAsync(CreateAppStoreListingDto dto, Guid userId);
    Task<AppStoreListingDto> UpdateListingAsync(int id, CreateAppStoreListingDto dto, Guid userId);
    Task<bool> DeleteListingAsync(int id, Guid userId);
    
    // Review management with sentiment analysis
    Task<List<AppStoreReview>> GetReviewsAsync(int listingId, Guid userId, DateTime? fromDate = null);
    Task<AppStoreReview> AnalyzeReviewSentimentAsync(int reviewId);
    Task<Dictionary<string, object>> GetReviewAnalyticsAsync(int listingId, Guid userId, DateTime? fromDate = null);
    Task SyncReviewsAsync(int listingId, Guid userId);
    
    // A/B testing with statistical significance
    Task<AsoAbTest> CreateAbTestAsync(CreateAsoAbTestDto dto, Guid userId);
    Task<AsoAbTest> GetAbTestAsync(int id, Guid userId);
    Task<List<AsoAbTest>> GetAbTestsAsync(Guid userId, AbTestStatus? status = null);
    Task<AsoAbTest> StartAbTestAsync(int id, Guid userId);
    Task<AsoAbTest> StopAbTestAsync(int id, Guid userId);
    Task<Dictionary<string, object>> GetAbTestResultsAsync(int id, Guid userId);
    Task UpdateAbTestMetricsAsync(int id);
    
    // Analytics and reporting
    Task<List<AsoAnalyticsDto>> GetAnalyticsAsync(int listingId, Guid userId, DateTime fromDate, DateTime toDate, AnalyticsGranularity granularity = AnalyticsGranularity.Daily);
    Task<Dictionary<string, object>> GetKeywordPerformanceAsync(Guid userId, DateTime? fromDate = null);
    Task<Dictionary<string, object>> GetCompetitorAnalysisAsync(int listingId, Guid userId);
    Task<Dictionary<string, object>> GetRankingTrendsAsync(int listingId, Guid userId, DateTime? fromDate = null);
    
    // Cross-platform integration
    Task<Dictionary<string, object>> SynchronizeWithSeoKeywordsAsync(Guid userId);
    Task<Dictionary<string, object>> GetWebToAppAttributionAsync(Guid userId, DateTime? fromDate = null);
    Task<List<string>> OptimizeDeepLinksAsync(int listingId, Guid userId);
    
    // Bulk operations
    Task<List<AsoKeywordDto>> BulkImportKeywordsAsync(List<CreateAsoKeywordDto> keywords, Guid userId);
    Task<bool> BulkUpdateKeywordRankingsAsync(List<KeywordRanking> rankings);
    Task<Dictionary<string, object>> GenerateAsoReportAsync(Guid userId, DateTime fromDate, DateTime toDate);
}