using GeoLeap.Api.Models.GrowthAnalytics;

namespace GeoLeap.Api.Services.GrowthAnalytics;

/// <summary>
/// Background service for processing analytics events and calculations
/// </summary>
public interface IGrowthAnalyticsBackgroundService
{
    /// <summary>
    /// Process pending events in batch
    /// </summary>
    Task ProcessPendingEventsAsync(int batchSize = 100, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Calculate attribution for recent conversions
    /// </summary>
    Task CalculateRecentAttributionAsync(int lookbackHours = 24, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Clean up old event data for GDPR compliance
    /// </summary>
    Task CleanupOldEventsAsync(int retentionDays = 365, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Generate daily analytics aggregations
    /// </summary>
    Task GenerateDailyAggregationsAsync(DateTime date, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Update channel performance metrics
    /// </summary>
    Task UpdateChannelPerformanceAsync(DateTime startDate, DateTime endDate, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Process fraud detection on events
    /// </summary>
    Task ProcessFraudDetectionAsync(int batchSize = 1000, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Get background processing status
    /// </summary>
    Task<BackgroundProcessingStatus> GetProcessingStatusAsync();
}

/// <summary>
/// Background processing status information
/// </summary>
public class BackgroundProcessingStatus
{
    public int PendingEvents { get; set; }
    public int ProcessedEventsToday { get; set; }
    public int FailedEventsToday { get; set; }
    public DateTime LastProcessingRun { get; set; }
    public DateTime LastAttributionRun { get; set; }
    public DateTime LastCleanupRun { get; set; }
    public bool IsProcessingRunning { get; set; }
    public string? LastError { get; set; }
    public List<ProcessingQueueStatus> QueueStatuses { get; set; } = new();
}

/// <summary>
/// Status for individual processing queues
/// </summary>
public class ProcessingQueueStatus
{
    public string QueueName { get; set; } = string.Empty;
    public int PendingJobs { get; set; }
    public int ProcessingJobs { get; set; }
    public int CompletedJobsToday { get; set; }
    public int FailedJobsToday { get; set; }
    public DateTime LastActivity { get; set; }
}