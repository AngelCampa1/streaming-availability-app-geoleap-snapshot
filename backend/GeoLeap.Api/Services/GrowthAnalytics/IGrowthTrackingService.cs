using GeoLeap.Api.Models.GrowthAnalytics;

namespace GeoLeap.Api.Services.GrowthAnalytics;

/// <summary>
/// Service for tracking and processing growth events
/// </summary>
public interface IGrowthTrackingService
{
    /// <summary>
    /// Track a single growth event
    /// </summary>
    Task<bool> TrackEventAsync(GrowthEvent growthEvent, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Batch track multiple events (high performance)
    /// </summary>
    Task<int> TrackEventsAsync(IEnumerable<GrowthEvent> events, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Process pending events in background queue
    /// </summary>
    Task ProcessPendingEventsAsync(int batchSize = 100, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Validate event data and enrich with server-side information
    /// </summary>
    Task<GrowthEvent> EnrichEventAsync(GrowthEvent growthEvent, string? ipAddress, string? userAgent);
    
    /// <summary>
    /// Get events for a specific user/session with privacy compliance
    /// </summary>
    Task<IEnumerable<GrowthEvent>> GetUserEventsAsync(string userId, DateTime? startDate = null, DateTime? endDate = null, bool respectConsent = true);
    
    /// <summary>
    /// Get events by category and date range
    /// </summary>
    Task<IEnumerable<GrowthEvent>> GetEventsByCategoryAsync(string category, DateTime startDate, DateTime endDate, int limit = 1000);
    
    /// <summary>
    /// Delete user data for GDPR compliance
    /// </summary>
    Task<bool> DeleteUserDataAsync(string userId);
    
    /// <summary>
    /// Anonymize user data while preserving analytics value
    /// </summary>
    Task<bool> AnonymizeUserDataAsync(string userId);
    
    /// <summary>
    /// Get event statistics for monitoring
    /// </summary>
    Task<EventProcessingStats> GetProcessingStatsAsync();
}

/// <summary>
/// Event processing statistics
/// </summary>
public class EventProcessingStats
{
    public int TotalEvents { get; set; }
    public int PendingEvents { get; set; }
    public int ProcessedEvents { get; set; }
    public int FailedEvents { get; set; }
    public int EventsToday { get; set; }
    public int EventsThisHour { get; set; }
    public double AvgProcessingTimeMs { get; set; }
    public DateTime LastProcessedAt { get; set; }
    public List<EventCategoryStats> CategoryStats { get; set; } = new();
}

/// <summary>
/// Statistics by event category
/// </summary>
public class EventCategoryStats
{
    public string Category { get; set; } = string.Empty;
    public int Count { get; set; }
    public decimal Percentage { get; set; }
}