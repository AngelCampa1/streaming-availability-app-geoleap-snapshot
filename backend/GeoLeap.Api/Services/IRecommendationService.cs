using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service interface for content recommendation engine
/// </summary>
public interface IRecommendationService
{
    /// <summary>
    /// Get personalized recommendations for user
    /// </summary>
    Task<RecommendationsResponse> GetPersonalizedRecommendationsAsync(Guid userId, GetRecommendationsRequest request);
    
    /// <summary>
    /// Get trending content based on recent popularity
    /// </summary>
    Task<RecommendationsResponse> GetTrendingContentAsync(GetRecommendationsRequest request);
    
    /// <summary>
    /// Get similar content recommendations based on content ID
    /// </summary>
    Task<RecommendationsResponse> GetSimilarContentAsync(string contentId, string contentType, GetRecommendationsRequest request);
    
    /// <summary>
    /// Get popular content recommendations
    /// </summary>
    Task<RecommendationsResponse> GetPopularContentAsync(GetRecommendationsRequest request);
    
    /// <summary>
    /// Get mixed recommendations (trending + personalized + popular)
    /// </summary>
    Task<RecommendationsResponse> GetMixedRecommendationsAsync(Guid userId, GetRecommendationsRequest request);
    
    /// <summary>
    /// Get user's recommendation settings
    /// </summary>
    Task<RecommendationSettingsDto> GetRecommendationSettingsAsync(Guid userId);
    
    /// <summary>
    /// Update user's recommendation settings
    /// </summary>
    Task<RecommendationSettingsDto> UpdateRecommendationSettingsAsync(Guid userId, UpdateRecommendationSettingsDto dto);
    
    /// <summary>
    /// Dismiss a recommendation for user
    /// </summary>
    Task DismissRecommendationAsync(Guid userId, DismissRecommendationDto dto);
    
    /// <summary>
    /// Get dismissed content for user
    /// </summary>
    Task<List<string>> GetDismissedContentAsync(Guid userId);
    
    /// <summary>
    /// Clear dismissed content for user
    /// </summary>
    Task ClearDismissedContentAsync(Guid userId);
    
    /// <summary>
    /// Train recommendation model with user feedback
    /// </summary>
    Task TrainModelWithFeedbackAsync(Guid userId, string contentId, string feedbackType, double weight = 1.0);
    
    /// <summary>
    /// Get recommendation explanation for debugging
    /// </summary>
    Task<string> GetRecommendationExplanationAsync(Guid userId, string contentId, string recommendationType);
    
    /// <summary>
    /// Refresh cached recommendations for user
    /// </summary>
    Task RefreshUserRecommendationsAsync(Guid userId);
    
    /// <summary>
    /// Get recommendation analytics for admin
    /// </summary>
    Task<RecommendationAnalytics> GetRecommendationAnalyticsAsync(DateTime? startDate = null, DateTime? endDate = null);
    
    /// <summary>
    /// Validate and fix recommendation data integrity
    /// </summary>
    Task<int> ValidateAndFixDataIntegrityAsync();
    
    // US-8.5 Filter support methods
    Task<FilterOptionsResponse> GetAvailableFilterOptionsAsync(string contentType = "all", string region = "US");
    Task<List<FilterOption>> GetAvailableGenresAsync(string contentType = "all", string region = "US");
    Task<List<FilterOption>> GetAvailableStreamingServicesAsync(string region = "US");
    Task<YearRange> GetAvailableYearRangesAsync(string contentType = "all");
}

/// <summary>
/// Analytics data for recommendation system performance
/// </summary>
public class RecommendationAnalytics
{
    public int TotalActiveUsers { get; set; }
    public int TotalRatings { get; set; }
    public int TotalInteractions { get; set; }
    public int TotalDismissals { get; set; }
    public double AverageRating { get; set; }
    public Dictionary<string, int> InteractionsByType { get; set; } = new();
    public Dictionary<string, int> ContentTypeDistribution { get; set; } = new();
    public Dictionary<string, double> GenrePopularity { get; set; } = new();
    public Dictionary<string, int> RecommendationTypeUsage { get; set; } = new();
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
    public TimeSpan AnalysisTimespan { get; set; }
}