using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

/// <summary>
/// Social recommendation engine interface for content and user recommendations
/// </summary>
public interface ISocialRecommendationEngine
{
    /// <summary>
    /// Generate content recommendations based on social network analysis
    /// </summary>
    Task<List<ContentRecommendation>> GenerateRecommendationsAsync(Guid userId, string? contentType = null, int limit = 20);
    
    /// <summary>
    /// Generate user recommendations for friend discovery
    /// </summary>
    Task<List<UserRecommendation>> GenerateUserRecommendationsAsync(Guid userId, int limit = 10);
    
    /// <summary>
    /// Analyze social network to find content trends
    /// </summary>
    Task<List<TrendingContent>> AnalyzeTrendingContentAsync(string? platform = null, TimeSpan? timeWindow = null);
    
    /// <summary>
    /// Update recommendation models with user interaction data
    /// </summary>
    Task UpdateRecommendationModelAsync(Guid userId, string contentId, RecommendationFeedback feedback);
    
    /// <summary>
    /// Generate personalized recommendations based on user's social connections and preferences
    /// </summary>
    Task<List<ContentRecommendation>> GetPersonalizedRecommendationsAsync(Guid userId, int limit = 20);
    
    /// <summary>
    /// Get personalized hashtag recommendations
    /// </summary>
    Task<List<HashtagRecommendation>> GetHashtagRecommendationsAsync(Guid userId, string content, int limit = 10);
    
    /// <summary>
    /// Analyze social influence scores for users
    /// </summary>
    Task<Dictionary<Guid, double>> CalculateSocialInfluenceScoresAsync(List<Guid> userIds);
    
    /// <summary>
    /// Find potential viral content based on early engagement patterns
    /// </summary>
    Task<List<ViralContentPrediction>> PredictViralContentAsync(TimeSpan lookbackWindow, double confidenceThreshold = 0.7);
    
    /// <summary>
    /// Generate audience insights for content creators
    /// </summary>
    Task<AudienceInsights> GenerateAudienceInsightsAsync(Guid userId, string? platform = null);
}


/// <summary>
/// Models for recommendation engine
/// </summary>
public class UserRecommendation
{
    public Guid UserId { get; set; }
    
    public string Username { get; set; } = string.Empty;
    
    public string DisplayName { get; set; } = string.Empty;
    
    public string ProfileImageUrl { get; set; } = string.Empty;
    
    public double Score { get; set; }
    
    public string Reason { get; set; } = string.Empty;
    
    public string[] CommonInterests { get; set; } = Array.Empty<string>();
    
    public string[] MutualConnections { get; set; } = Array.Empty<string>();
    
    public bool IsVerified { get; set; }
}

public class TrendingContent
{
    public string ContentId { get; set; } = string.Empty;
    
    public string ContentType { get; set; } = string.Empty;
    
    public string Title { get; set; } = string.Empty;
    
    public string Description { get; set; } = string.Empty;
    
    public string ImageUrl { get; set; } = string.Empty;
    
    public long ShareCount { get; set; }
    
    public long InteractionCount { get; set; }
    
    public double TrendingScore { get; set; }
    
    public string[] PopularPlatforms { get; set; } = Array.Empty<string>();
    
    public TimeSpan TrendingDuration { get; set; }
    
    // Additional properties for social proof calculation
    public int UniqueSharers { get; set; }
    
    public long TotalEngagement { get; set; }
    
    public double SocialProofScore { get; set; }
    
    public double TrendMomentum { get; set; }
    
    public int InfluencerShareCount { get; set; }
    
    public string RankingTier { get; set; } = string.Empty;
    
    public DateTime LatestShareAt { get; set; }
}

public class RecommendationFeedback
{
    public string Action { get; set; } = string.Empty; // clicked, shared, ignored, hidden
    
    public double Rating { get; set; } = 0.0; // 0-5 rating
    
    public string? Comment { get; set; }
    
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
    
    public Dictionary<string, object>? Metadata { get; set; }
}

public class HashtagRecommendation
{
    public string Hashtag { get; set; } = string.Empty;
    
    public double Score { get; set; }
    
    public long UsageCount { get; set; }
    
    public string Category { get; set; } = string.Empty;
    
    public bool IsTrending { get; set; }
}

public class ViralContentPrediction
{
    public string ContentId { get; set; } = string.Empty;
    
    public string ContentType { get; set; } = string.Empty;
    
    public string Title { get; set; } = string.Empty;
    
    public double ViralProbability { get; set; }
    
    public string[] PredictedPlatforms { get; set; } = Array.Empty<string>();
    
    public DateTime PredictedPeakTime { get; set; }
    
    public long EstimatedReach { get; set; }
    
    public string[] KeyFactors { get; set; } = Array.Empty<string>();
}

public class AudienceInsights
{
    public Guid UserId { get; set; }
    
    public int TotalFollowers { get; set; }
    
    public Dictionary<string, double> DemographicBreakdown { get; set; } = new();
    
    public Dictionary<string, int> InterestCategories { get; set; } = new();
    
    public Dictionary<string, double> EngagementRates { get; set; } = new();
    
    public string[] TopPerformingContentTypes { get; set; } = Array.Empty<string>();
    
    public Dictionary<string, TimeSpan> BestPostingTimes { get; set; } = new();
    
    public double AverageEngagementRate { get; set; }
    
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// Models for privacy service
/// </summary>
public class SocialConsentRecord
{
    public Guid Id { get; set; }
    
    public Guid UserId { get; set; }
    
    public string ConsentType { get; set; } = string.Empty;
    
    public bool Granted { get; set; }
    
    public string? LegalBasis { get; set; }
    
    public DateTime ConsentGivenAt { get; set; }
    
    public DateTime? ConsentRevokedAt { get; set; }
    
    public string ConsentVersion { get; set; } = string.Empty;
    
    public string? ConsentEvidence { get; set; }
}

