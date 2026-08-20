using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

public interface IRankingService
{
    Task<RankingResponse> RankSearchResultsAsync(RankingRequest request, CancellationToken cancellationToken = default);
    
    Task<RelevanceScore> CalculateRelevanceScoreAsync(GlobalSearchResult result, string query, CancellationToken cancellationToken = default);
    
    Task<PopularityScore> CalculatePopularityScoreAsync(GlobalSearchResult result, CancellationToken cancellationToken = default);
    
    Task<AvailabilityScore> CalculateAvailabilityScoreAsync(GlobalSearchResult result, CancellationToken cancellationToken = default);
    
    Task<FreshnessScore> CalculateFreshnessScoreAsync(GlobalSearchResult result, CancellationToken cancellationToken = default);
    
    Task<PersonalizationScore> CalculatePersonalizationScoreAsync(GlobalSearchResult result, string? userId, CancellationToken cancellationToken = default);
    
    Task<ClickThroughRateScore> CalculateClickThroughRateScoreAsync(GlobalSearchResult result, string query, CancellationToken cancellationToken = default);
    
    Task<List<FuzzyMatchResult>> FindFuzzyMatchesAsync(string query, List<string> candidates, decimal threshold = 0.8m, CancellationToken cancellationToken = default);
    
    Task<TypoCorrection> SuggestTypoCorrectionAsync(string query, CancellationToken cancellationToken = default);
    
    Task<UserPreferences> GetUserPreferencesAsync(string userId, CancellationToken cancellationToken = default);
    
    Task UpdateUserPreferencesAsync(string userId, UserPreferences preferences, CancellationToken cancellationToken = default);
    
    Task RecordSearchInteractionAsync(string userId, string query, string contentId, bool wasClicked, CancellationToken cancellationToken = default);
    
    Task<ContentPopularityData> GetContentPopularityDataAsync(string contentId, CancellationToken cancellationToken = default);
    
    Task UpdateContentPopularityAsync(string contentId, ContentPopularityData popularityData, CancellationToken cancellationToken = default);
}