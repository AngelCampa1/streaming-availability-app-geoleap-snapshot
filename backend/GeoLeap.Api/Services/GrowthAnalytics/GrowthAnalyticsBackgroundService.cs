using GeoLeap.Api.Data;
using GeoLeap.Api.Models.GrowthAnalytics;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace GeoLeap.Api.Services.GrowthAnalytics;

/// <summary>
/// Background service implementation for growth analytics processing
/// </summary>
public class GrowthAnalyticsBackgroundService : IGrowthAnalyticsBackgroundService
{
    private readonly ApplicationDbContext _context;
    private readonly IGrowthTrackingService _trackingService;
    private readonly IAttributionService _attributionService;
    private readonly ILogger<GrowthAnalyticsBackgroundService> _logger;
    private readonly IConfiguration _configuration;
    
    private static readonly SemaphoreSlim _processingLock = new(1, 1);
    private static DateTime _lastProcessingRun = DateTime.MinValue;
    private static DateTime _lastAttributionRun = DateTime.MinValue;
    private static DateTime _lastCleanupRun = DateTime.MinValue;
    private static bool _isProcessingRunning = false;
    
    public GrowthAnalyticsBackgroundService(
        ApplicationDbContext context,
        IGrowthTrackingService trackingService,
        IAttributionService attributionService,
        ILogger<GrowthAnalyticsBackgroundService> logger,
        IConfiguration configuration)
    {
        _context = context;
        _trackingService = trackingService;
        _attributionService = attributionService;
        _logger = logger;
        _configuration = configuration;
    }
    
    public async Task ProcessPendingEventsAsync(int batchSize = 100, CancellationToken cancellationToken = default)
    {
        if (!await _processingLock.WaitAsync(1000, cancellationToken))
        {
            _logger.LogWarning("Processing already in progress, skipping batch");
            return;
        }
        
        try
        {
            _isProcessingRunning = true;
            var startTime = DateTime.UtcNow;
            
            _logger.LogInformation("Starting background event processing, batch size: {BatchSize}", batchSize);
            
            await _trackingService.ProcessPendingEventsAsync(batchSize, cancellationToken);
            
            _lastProcessingRun = DateTime.UtcNow;
            var duration = _lastProcessingRun - startTime;
            
            _logger.LogInformation("Completed background event processing in {Duration}ms", duration.TotalMilliseconds);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process pending events in background");
            throw;
        }
        finally
        {
            _isProcessingRunning = false;
            _processingLock.Release();
        }
    }
    
    public async Task CalculateRecentAttributionAsync(int lookbackHours = 24, CancellationToken cancellationToken = default)
    {
        try
        {
            var startTime = DateTime.UtcNow;
            var cutoffTime = startTime.AddHours(-lookbackHours);
            
            _logger.LogInformation("Starting attribution calculation for events since {CutoffTime}", cutoffTime);
            
            // Get recent conversion events that need attribution calculation
            var conversionEvents = await _context.GrowthEvents
                .Where(e => e.Category == "conversion" && 
                           e.ServerTimestamp >= cutoffTime &&
                           !string.IsNullOrEmpty(e.UserId))
                .Select(e => e.Id)
                .ToListAsync(cancellationToken);
            
            if (conversionEvents.Any())
            {
                _logger.LogInformation("Processing attribution for {Count} conversion events", conversionEvents.Count);
                
                // Process attribution in smaller batches to avoid memory issues
                var batchSize = 50;
                for (int i = 0; i < conversionEvents.Count; i += batchSize)
                {
                    var batch = conversionEvents.Skip(i).Take(batchSize);
                    await _attributionService.CalculateBatchAttributionAsync(batch, null);
                    
                    if (cancellationToken.IsCancellationRequested)
                        break;
                }
            }
            
            _lastAttributionRun = DateTime.UtcNow;
            var duration = _lastAttributionRun - startTime;
            
            _logger.LogInformation("Completed attribution calculation in {Duration}ms for {Count} events", 
                duration.TotalMilliseconds, conversionEvents.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to calculate recent attribution");
            throw;
        }
    }
    
    public async Task CleanupOldEventsAsync(int retentionDays = 365, CancellationToken cancellationToken = default)
    {
        try
        {
            var startTime = DateTime.UtcNow;
            var cutoffDate = startTime.AddDays(-retentionDays);
            
            _logger.LogInformation("Starting cleanup of events older than {CutoffDate} ({RetentionDays} days)", 
                cutoffDate, retentionDays);
            
            // Get count first for logging
            var oldEventsCount = await _context.GrowthEvents
                .CountAsync(e => e.ServerTimestamp < cutoffDate, cancellationToken);
            
            if (oldEventsCount > 0)
            {
                // Delete in batches to avoid locking issues
                var batchSize = 1000;
                var deletedTotal = 0;
                
                // BUG FIX: Add cancellation token check to infinite while loop
                while (!cancellationToken.IsCancellationRequested)
                {
                    var batch = await _context.GrowthEvents
                        .Where(e => e.ServerTimestamp < cutoffDate)
                        .Take(batchSize)
                        .ToListAsync(cancellationToken);
                    
                    if (!batch.Any())
                        break;
                    
                    _context.GrowthEvents.RemoveRange(batch);
                    await _context.SaveChangesAsync(cancellationToken);
                    
                    deletedTotal += batch.Count;
                    
                    _logger.LogDebug("Deleted batch of {BatchCount} old events, total: {DeletedTotal}", 
                        batch.Count, deletedTotal);
                    
                    if (cancellationToken.IsCancellationRequested)
                        break;
                }
                
                _logger.LogInformation("Cleanup completed: deleted {DeletedTotal} events older than {RetentionDays} days", 
                    deletedTotal, retentionDays);
            }
            else
            {
                _logger.LogInformation("No old events found for cleanup");
            }
            
            _lastCleanupRun = DateTime.UtcNow;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to cleanup old events");
            throw;
        }
    }
    
    public async Task GenerateDailyAggregationsAsync(DateTime date, CancellationToken cancellationToken = default)
    {
        try
        {
            var startTime = DateTime.UtcNow;
            var dayStart = date.Date;
            var dayEnd = dayStart.AddDays(1);
            
            _logger.LogInformation("Generating daily aggregations for {Date}", date.ToString("yyyy-MM-dd"));
            
            // Generate basic event aggregations
            var eventsByCategory = await _context.GrowthEvents
                .Where(e => e.ServerTimestamp >= dayStart && e.ServerTimestamp < dayEnd)
                .GroupBy(e => e.Category)
                .Select(g => new { Category = g.Key, Count = g.Count(), Value = g.Sum(e => e.EventValue ?? 0) })
                .ToListAsync(cancellationToken);
            
            // Generate channel aggregations
            var eventsByChannel = await _context.GrowthEvents
                .Where(e => e.ServerTimestamp >= dayStart && e.ServerTimestamp < dayEnd)
                .GroupBy(e => e.UtmSource ?? "direct")
                .Select(g => new { Channel = g.Key, Count = g.Count(), Value = g.Sum(e => e.EventValue ?? 0) })
                .ToListAsync(cancellationToken);
            
            // Store aggregations (in a real implementation, these would go to a separate aggregations table)
            var aggregationData = new
            {
                Date = date.ToString("yyyy-MM-dd"),
                EventsByCategory = eventsByCategory,
                EventsByChannel = eventsByChannel,
                GeneratedAt = DateTime.UtcNow
            };
            
            var json = JsonSerializer.Serialize(aggregationData);
            _logger.LogInformation("Generated daily aggregations: {Json}", json);
            
            var duration = DateTime.UtcNow - startTime;
            _logger.LogInformation("Completed daily aggregations in {Duration}ms", duration.TotalMilliseconds);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate daily aggregations for {Date}", date);
            throw;
        }
    }
    
    public async Task UpdateChannelPerformanceAsync(DateTime startDate, DateTime endDate, CancellationToken cancellationToken = default)
    {
        try
        {
            var startTime = DateTime.UtcNow;
            
            _logger.LogInformation("Updating channel performance from {StartDate} to {EndDate}", 
                startDate.ToString("yyyy-MM-dd"), endDate.ToString("yyyy-MM-dd"));
            
            var performance = await _attributionService.GetChannelPerformanceAsync(startDate, endDate);
            
            // In a real implementation, this would update a separate channel performance table
            var performanceJson = JsonSerializer.Serialize(performance);
            _logger.LogInformation("Updated channel performance data: {PerformanceJson}", performanceJson);
            
            var duration = DateTime.UtcNow - startTime;
            _logger.LogInformation("Completed channel performance update in {Duration}ms", duration.TotalMilliseconds);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update channel performance");
            throw;
        }
    }
    
    public async Task ProcessFraudDetectionAsync(int batchSize = 1000, CancellationToken cancellationToken = default)
    {
        try
        {
            var startTime = DateTime.UtcNow;
            var cutoffTime = startTime.AddHours(-1); // Process events from last hour
            
            _logger.LogInformation("Starting fraud detection for events since {CutoffTime}", cutoffTime);
            
            var suspiciousEvents = await _context.GrowthEvents
                .Where(e => e.ServerTimestamp >= cutoffTime && e.Status == GrowthEventStatus.Processed)
                .Take(batchSize)
                .ToListAsync(cancellationToken);
            
            var flaggedCount = 0;
            
            foreach (var evt in suspiciousEvents)
            {
                // Simple fraud detection logic
                var isSuspicious = await DetectFraudulentEvent(evt);
                
                if (isSuspicious)
                {
                    evt.Status = GrowthEventStatus.Failed;
                    evt.ErrorMessage = "Flagged by fraud detection";
                    flaggedCount++;
                }
            }
            
            if (flaggedCount > 0)
            {
                await _context.SaveChangesAsync(cancellationToken);
            }
            
            var duration = DateTime.UtcNow - startTime;
            _logger.LogInformation("Completed fraud detection in {Duration}ms, flagged {FlaggedCount} of {TotalCount} events", 
                duration.TotalMilliseconds, flaggedCount, suspiciousEvents.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process fraud detection");
            throw;
        }
    }
    
    public async Task<BackgroundProcessingStatus> GetProcessingStatusAsync()
    {
        try
        {
            var today = DateTime.UtcNow.Date;
            
            var status = new BackgroundProcessingStatus
            {
                PendingEvents = await _context.GrowthEvents.CountAsync(e => e.Status == GrowthEventStatus.Pending),
                ProcessedEventsToday = await _context.GrowthEvents.CountAsync(e => e.Status == GrowthEventStatus.Processed && e.ServerTimestamp >= today),
                FailedEventsToday = await _context.GrowthEvents.CountAsync(e => e.Status == GrowthEventStatus.Failed && e.ServerTimestamp >= today),
                LastProcessingRun = _lastProcessingRun,
                LastAttributionRun = _lastAttributionRun,
                LastCleanupRun = _lastCleanupRun,
                IsProcessingRunning = _isProcessingRunning
            };
            
            // Add queue statuses (simplified for demo)
            status.QueueStatuses.Add(new ProcessingQueueStatus
            {
                QueueName = "EventProcessing",
                PendingJobs = status.PendingEvents,
                ProcessingJobs = _isProcessingRunning ? 1 : 0,
                CompletedJobsToday = status.ProcessedEventsToday,
                FailedJobsToday = status.FailedEventsToday,
                LastActivity = _lastProcessingRun
            });
            
            return status;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get processing status");
            throw;
        }
    }
    
    private async Task<bool> DetectFraudulentEvent(GrowthEvent evt)
    {
        // Simple fraud detection logic - can be enhanced with ML models
        try
        {
            // Check for suspicious patterns
            
            // 1. Too many events from same IP in short time
            if (!string.IsNullOrEmpty(evt.IpAddress))
            {
                var recentEventsFromIp = await _context.GrowthEvents
                    .CountAsync(e => e.IpAddress == evt.IpAddress && 
                               e.ServerTimestamp >= evt.ServerTimestamp.AddMinutes(-5));
                
                if (recentEventsFromIp > 100) // More than 100 events in 5 minutes
                {
                    return true;
                }
            }
            
            // 2. Suspicious user agent patterns
            if (!string.IsNullOrEmpty(evt.UserAgent))
            {
                var suspiciousAgents = new[] { "bot", "crawler", "spider", "scraper" };
                if (suspiciousAgents.Any(agent => evt.UserAgent.ToLower().Contains(agent)))
                {
                    return true;
                }
            }
            
            // 3. Impossible geo-location jumps (would need previous event location)
            // This would require storing and comparing geo-locations
            
            // 4. Suspicious event values
            if (evt.EventValue.HasValue && evt.EventValue > 10000) // Values over $10,000
            {
                return true;
            }
            
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error during fraud detection for event {EventId}", evt.Id);
            return false;
        }
    }
}