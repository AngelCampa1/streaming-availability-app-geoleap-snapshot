using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service interface for real-time social activity aggregation
/// </summary>
public interface ISocialActivityService
{
    /// <summary>
    /// Track real-time social activity event
    /// </summary>
    Task TrackActivityAsync(SocialActivity activity);
    
    /// <summary>
    /// Get real-time activity feed for user
    /// </summary>
    Task<List<SocialActivity>> GetActivityFeedAsync(Guid userId, int limit = 50, DateTime? since = null);
    
    /// <summary>
    /// Get activity feed for user's social network
    /// </summary>
    Task<List<SocialActivity>> GetNetworkActivityFeedAsync(Guid userId, int limit = 50, DateTime? since = null);
    
    /// <summary>
    /// Get trending activities across all users
    /// </summary>
    Task<List<TrendingActivity>> GetTrendingActivitiesAsync(TimeSpan timeWindow, int limit = 20);
    
    /// <summary>
    /// Get activity analytics for user
    /// </summary>
    Task<ActivityAnalytics> GetActivityAnalyticsAsync(Guid userId, DateTime? startDate = null, DateTime? endDate = null);
    
    /// <summary>
    /// Subscribe to real-time activity updates
    /// </summary>
    Task SubscribeToActivityUpdatesAsync(Guid userId, string connectionId);
    
    /// <summary>
    /// Unsubscribe from real-time activity updates
    /// </summary>
    Task UnsubscribeFromActivityUpdatesAsync(string connectionId);
}

/// <summary>
/// Models for social activity aggregation
/// </summary>
public class TrendingActivity
{
    public string ActivityType { get; set; } = string.Empty;
    
    public string ContentId { get; set; } = string.Empty;
    
    public string ContentTitle { get; set; } = string.Empty;
    
    public string Platform { get; set; } = string.Empty;
    
    public int ActivityCount { get; set; }
    
    public int UniqueUsers { get; set; }
    
    public double TrendingScore { get; set; }
    
    public DateTime LastActivity { get; set; }
}

public class ActivityAnalytics
{
    public Guid UserId { get; set; }
    
    public int TotalActivities { get; set; }
    
    public Dictionary<string, int> ActivitiesByType { get; set; } = new();
    
    public Dictionary<string, int> ActivitiesByPlatform { get; set; } = new();
    
    public Dictionary<DateTime, int> DailyActivity { get; set; } = new();
    
    public double AverageActivitiesPerDay { get; set; }
    
    public DateTime? LastActivityAt { get; set; }
    
    public string MostActiveTimeOfDay { get; set; } = string.Empty;
}