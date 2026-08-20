using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using Microsoft.EntityFrameworkCore;
using Hangfire;

namespace GeoLeap.Api.Services;

/// <summary>
/// Background service for monitoring content availability changes - US-8.2
/// </summary>
public interface IAvailabilityMonitoringService
{
    Task MonitorAvailabilityChangesAsync(string correlationId = "");
    Task ProcessAvailabilityChangeNotificationsAsync(string correlationId = "");
    Task MonitorPriceChangesAsync(string correlationId = "");
    Task ProcessContentExpirationNotificationsAsync(string correlationId = "");
    Task ProcessScheduledDigestsAsync(string correlationId = "");
    Task CleanupOldNotificationsAsync(string correlationId = "");
    
    // Manual trigger methods
    Task TriggerAvailabilityCheckAsync(Guid? userId = null, string correlationId = "");
    Task TriggerDigestGenerationAsync(string digestType, string correlationId = "");
}

/// <summary>
/// Implementation of availability monitoring service using Hangfire
/// </summary>
public class AvailabilityMonitoringService : IAvailabilityMonitoringService
{
    private readonly ApplicationDbContext _context;
    private readonly INotificationEngine _notificationEngine;
    private readonly IWatchlistNotificationService _watchlistNotificationService;
    private readonly ILogger<AvailabilityMonitoringService> _logger;
    private readonly IServiceProvider _serviceProvider;

    public AvailabilityMonitoringService(
        ApplicationDbContext context,
        INotificationEngine notificationEngine,
        IWatchlistNotificationService watchlistNotificationService,
        ILogger<AvailabilityMonitoringService> logger,
        IServiceProvider serviceProvider)
    {
        _context = context;
        _notificationEngine = notificationEngine;
        _watchlistNotificationService = watchlistNotificationService;
        _logger = logger;
        _serviceProvider = serviceProvider;
    }

    [AutomaticRetry(Attempts = 3, DelaysInSeconds = new[] { 60, 300, 900 })]
    public async Task MonitorAvailabilityChangesAsync(string correlationId = "")
    {
        using var activity = _logger.BeginScope(new Dictionary<string, object>
        {
            ["CorrelationId"] = correlationId,
            ["JobType"] = "AvailabilityMonitoring"
        });

        try
        {
            _logger.LogInformation("Starting availability monitoring job");

            // Get all users with active watchlists and availability notifications enabled
            var usersToCheck = await GetUsersForAvailabilityMonitoringAsync();

            _logger.LogInformation("Found {UserCount} users to check for availability changes", usersToCheck.Count);

            var processedCount = 0;
            var changesDetected = 0;

            foreach (var user in usersToCheck)
            {
                try
                {
                    var changes = await CheckUserAvailabilityChangesAsync(user.Id, correlationId);
                    if (changes.Any())
                    {
                        changesDetected += changes.Count;
                        await ProcessUserAvailabilityChangesAsync(user.Id, changes, correlationId);
                    }
                    
                    // Always update LastAvailabilityCheck regardless of changes
                    await UpdateLastAvailabilityCheckAsync(user.Id);
                    
                    processedCount++;

                    // Add small delay to avoid overwhelming external APIs
                    if (processedCount % 10 == 0)
                    {
                        await Task.Delay(1000);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to check availability changes for user {UserId}", user.Id);
                    // Continue with other users
                }
            }

            _logger.LogInformation("Availability monitoring completed: {ProcessedUsers} users processed, {ChangesDetected} changes detected",
                processedCount, changesDetected);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Availability monitoring job failed");
            throw;
        }
    }

    [AutomaticRetry(Attempts = 2, DelaysInSeconds = new[] { 30, 180 })]
    public async Task ProcessAvailabilityChangeNotificationsAsync(string correlationId = "")
    {
        using var activity = _logger.BeginScope(new Dictionary<string, object>
        {
            ["CorrelationId"] = correlationId,
            ["JobType"] = "AvailabilityNotificationProcessing"
        });

        try
        {
            _logger.LogInformation("Processing availability change notifications");

            // Get pending availability changes that need notifications
            var pendingChanges = await GetPendingAvailabilityChangesAsync();

            _logger.LogInformation("Found {ChangeCount} pending availability changes to notify", pendingChanges.Count);

            var notificationsSent = 0;

            foreach (var change in pendingChanges)
            {
                try
                {
                    await ProcessAvailabilityChangeNotificationAsync(change, correlationId);
                    notificationsSent++;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to send availability change notification for change {ChangeId}", change.Id);
                }
            }

            _logger.LogInformation("Availability change notification processing completed: {NotificationsSent} notifications sent",
                notificationsSent);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Availability change notification processing failed");
            throw;
        }
    }

    [AutomaticRetry(Attempts = 3, DelaysInSeconds = new[] { 120, 600, 1800 })]
    public async Task MonitorPriceChangesAsync(string correlationId = "")
    {
        using var activity = _logger.BeginScope(new Dictionary<string, object>
        {
            ["CorrelationId"] = correlationId,
            ["JobType"] = "PriceMonitoring"
        });

        try
        {
            _logger.LogInformation("Starting price monitoring job");

            var usersToCheck = await GetUsersForPriceMonitoringAsync();
            
            _logger.LogInformation("Found {UserCount} users to check for price changes", usersToCheck.Count);

            var processedCount = 0;
            var priceChangesDetected = 0;

            foreach (var user in usersToCheck)
            {
                try
                {
                    var priceChanges = await CheckUserPriceChangesAsync(user.Id, correlationId);
                    if (priceChanges.Any())
                    {
                        priceChangesDetected += priceChanges.Count;
                        await ProcessUserPriceChangesAsync(user.Id, priceChanges, correlationId);
                    }
                    
                    processedCount++;

                    // Rate limiting
                    if (processedCount % 20 == 0)
                    {
                        await Task.Delay(2000);
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to check price changes for user {UserId}", user.Id);
                }
            }

            _logger.LogInformation("Price monitoring completed: {ProcessedUsers} users processed, {PriceChanges} price changes detected",
                processedCount, priceChangesDetected);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Price monitoring job failed");
            throw;
        }
    }

    [AutomaticRetry(Attempts = 2, DelaysInSeconds = new[] { 60, 300 })]
    public async Task ProcessContentExpirationNotificationsAsync(string correlationId = "")
    {
        using var activity = _logger.BeginScope(new Dictionary<string, object>
        {
            ["CorrelationId"] = correlationId,
            ["JobType"] = "ContentExpirationNotifications"
        });

        try
        {
            _logger.LogInformation("Processing content expiration notifications");

            var usersToNotify = await GetUsersForContentExpirationNotificationsAsync();
            
            _logger.LogInformation("Found {UserCount} users to check for expiring content", usersToNotify.Count);

            var notificationsSent = 0;

            foreach (var user in usersToNotify)
            {
                try
                {
                    var expiringContent = await GetExpiringContentForUserAsync(user.Id, correlationId);
                    if (expiringContent.Any())
                    {
                        await _watchlistNotificationService.NotifyContentExpiringAsync(user.Id, expiringContent);
                        notificationsSent++;
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to send content expiration notifications for user {UserId}", user.Id);
                }
            }

            _logger.LogInformation("Content expiration notification processing completed: {NotificationsSent} notifications sent",
                notificationsSent);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Content expiration notification processing failed");
            throw;
        }
    }

    [AutomaticRetry(Attempts = 2, DelaysInSeconds = new[] { 300, 900 })]
    public async Task ProcessScheduledDigestsAsync(string correlationId = "")
    {
        using var activity = _logger.BeginScope(new Dictionary<string, object>
        {
            ["CorrelationId"] = correlationId,
            ["JobType"] = "ScheduledDigests"
        });

        try
        {
            _logger.LogInformation("Processing scheduled digest notifications");

            var now = DateTime.UtcNow;
            var digestsSent = 0;

            // Process daily digests
            if (now.Hour == 9 && now.Minute <= 5) // Run at 9 AM UTC with 5-minute window
            {
                var dailyDigestUsers = await GetUsersForDailyDigestAsync();
                foreach (var user in dailyDigestUsers)
                {
                    try
                    {
                        await SendDailyDigestAsync(user.Id, correlationId);
                        digestsSent++;
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to send daily digest to user {UserId}", user.Id);
                    }
                }
                _logger.LogInformation("Sent {Count} daily digests", dailyDigestUsers.Count);
            }

            // Process weekly digests
            if (now.DayOfWeek == DayOfWeek.Monday && now.Hour == 9 && now.Minute <= 5)
            {
                var weeklyDigestUsers = await GetUsersForWeeklyDigestAsync();
                foreach (var user in weeklyDigestUsers)
                {
                    try
                    {
                        await _watchlistNotificationService.SendWeeklyDigestAsync(user.Id);
                        digestsSent++;
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to send weekly digest to user {UserId}", user.Id);
                    }
                }
                _logger.LogInformation("Sent {Count} weekly digests", weeklyDigestUsers.Count);
            }

            // Process monthly digests
            if (now.Day == 1 && now.Hour == 10 && now.Minute <= 5) // First day of month at 10 AM UTC
            {
                var monthlyDigestUsers = await GetUsersForMonthlyDigestAsync();
                foreach (var user in monthlyDigestUsers)
                {
                    try
                    {
                        await _watchlistNotificationService.SendMonthlyDigestAsync(user.Id);
                        digestsSent++;
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to send monthly digest to user {UserId}", user.Id);
                    }
                }
                _logger.LogInformation("Sent {Count} monthly digests", monthlyDigestUsers.Count);
            }

            if (digestsSent > 0)
            {
                _logger.LogInformation("Scheduled digest processing completed: {DigestsSent} digests sent", digestsSent);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Scheduled digest processing failed");
            throw;
        }
    }

    [AutomaticRetry(Attempts = 1)]
    public async Task CleanupOldNotificationsAsync(string correlationId = "")
    {
        using var activity = _logger.BeginScope(new Dictionary<string, object>
        {
            ["CorrelationId"] = correlationId,
            ["JobType"] = "NotificationCleanup"
        });

        try
        {
            _logger.LogInformation("Starting notification cleanup job");

            var cutoffDate = DateTime.UtcNow.AddDays(-90); // Keep notifications for 90 days
            
            // Archive old notifications instead of deleting
            var oldNotifications = await _context.Notifications
                .Where(n => n.CreatedAt < cutoffDate && n.Status != "archived")
                .Take(1000) // Process in batches
                .ToListAsync();

            foreach (var notification in oldNotifications)
            {
                notification.Status = "archived";
            }

            await _context.SaveChangesAsync();

            // Clean up old delivery logs
            var oldDeliveryLogs = await _context.NotificationDeliveries
                .Where(d => d.AttemptedAt < cutoffDate.AddDays(-30)) // Keep delivery logs for 60 days total
                .Take(1000)
                .ToListAsync();

            _context.NotificationDeliveries.RemoveRange(oldDeliveryLogs);

            // Clean up old rate limit records
            var oldRateLimits = await _context.NotificationRateLimits
                .Where(r => r.WindowEnd < DateTime.UtcNow.AddDays(-7)) // Keep rate limits for 7 days
                .Take(1000)
                .ToListAsync();

            _context.NotificationRateLimits.RemoveRange(oldRateLimits);

            // Clean up completed queue items
            var oldQueueItems = await _context.NotificationQueues
                .Where(q => (q.Status == "completed" || q.Status == "failed") && 
                           q.ProcessedAt < DateTime.UtcNow.AddDays(-7))
                .Take(1000)
                .ToListAsync();

            _context.NotificationQueues.RemoveRange(oldQueueItems);

            await _context.SaveChangesAsync();

            _logger.LogInformation("Notification cleanup completed: archived {ArchivedCount} notifications, removed {DeliveryLogsCount} delivery logs, {RateLimitsCount} rate limits, {QueueItemsCount} queue items",
                oldNotifications.Count, oldDeliveryLogs.Count, oldRateLimits.Count, oldQueueItems.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Notification cleanup job failed");
            throw;
        }
    }

    // Manual trigger methods
    public async Task TriggerAvailabilityCheckAsync(Guid? userId = null, string correlationId = "")
    {
        if (userId.HasValue)
        {
            _logger.LogInformation("Triggering availability check for user {UserId}", userId.Value);
            var changes = await CheckUserAvailabilityChangesAsync(userId.Value, correlationId);
            if (changes.Any())
            {
                await ProcessUserAvailabilityChangesAsync(userId.Value, changes, correlationId);
            }
        }
        else
        {
            _logger.LogInformation("Triggering availability check for all users");
            BackgroundJob.Enqueue<IAvailabilityMonitoringService>(s => s.MonitorAvailabilityChangesAsync(correlationId));
        }
    }

    public async Task TriggerDigestGenerationAsync(string digestType, string correlationId = "")
    {
        _logger.LogInformation("Triggering {DigestType} digest generation", digestType);
        
        switch (digestType.ToLower())
        {
            case "daily":
                var dailyUsers = await GetUsersForDailyDigestAsync();
                foreach (var user in dailyUsers)
                {
                    BackgroundJob.Enqueue<IAvailabilityMonitoringService>(s => SendDailyDigestAsync(user.Id, correlationId));
                }
                break;
                
            case "weekly":
                var weeklyUsers = await GetUsersForWeeklyDigestAsync();
                foreach (var user in weeklyUsers)
                {
                    BackgroundJob.Enqueue<IWatchlistNotificationService>(s => s.SendWeeklyDigestAsync(user.Id));
                }
                break;
                
            case "monthly":
                var monthlyUsers = await GetUsersForMonthlyDigestAsync();
                foreach (var user in monthlyUsers)
                {
                    BackgroundJob.Enqueue<IWatchlistNotificationService>(s => s.SendMonthlyDigestAsync(user.Id));
                }
                break;
        }
    }

    // Private helper methods
    private async Task<List<User>> GetUsersForAvailabilityMonitoringAsync()
    {
        return await _context.Users
            .Include(u => u.WatchlistNotificationSettings)
            .Include(u => u.Watchlists.Where(w => w.IsActive))
            .Where(u => u.WatchlistNotificationSettings != null && u.WatchlistNotificationSettings.NotifyOnAvailabilityChange &&
                       u.Watchlists.Any(w => w.IsActive && w.Items.Any()))
            .ToListAsync();
    }

    private async Task<List<User>> GetUsersForPriceMonitoringAsync()
    {
        return await _context.Users
            .Include(u => u.WatchlistNotificationSettings)
            .Include(u => u.Watchlists.Where(w => w.IsActive))
            .Where(u => u.WatchlistNotificationSettings != null && u.WatchlistNotificationSettings.NotifyOnPriceDrops &&
                       u.Watchlists.Any(w => w.IsActive))
            .ToListAsync();
    }

    private async Task<List<User>> GetUsersForContentExpirationNotificationsAsync()
    {
        return await _context.Users
            .Include(u => u.WatchlistNotificationSettings)
            .Where(u => u.WatchlistNotificationSettings != null && u.WatchlistNotificationSettings.NotifyOnContentExpiring)
            .ToListAsync();
    }

    private async Task<List<User>> GetUsersForDailyDigestAsync()
    {
        return await _context.Users
            .Include(u => u.NotificationSettings)
            .Where(u => u.WatchlistNotificationSettings != null && u.WatchlistNotificationSettings.WeeklyDigest)
            .ToListAsync();
    }

    private async Task<List<User>> GetUsersForWeeklyDigestAsync()
    {
        return await _context.Users
            .Include(u => u.WatchlistNotificationSettings)
            .Where(u => u.WatchlistNotificationSettings != null && u.WatchlistNotificationSettings.WeeklyDigest)
            .ToListAsync();
    }

    private async Task<List<User>> GetUsersForMonthlyDigestAsync()
    {
        return await _context.Users
            .Include(u => u.WatchlistNotificationSettings)
            .Where(u => u.WatchlistNotificationSettings != null && u.WatchlistNotificationSettings.MonthlyDigest)
            .ToListAsync();
    }

    private async Task<List<AvailabilityChange>> CheckUserAvailabilityChangesAsync(Guid userId, string correlationId)
    {
        var changes = new List<AvailabilityChange>();

        // Get user's watchlist items
        var watchlistItems = await _context.WatchlistItems
            .Include(wi => wi.AvailabilityHistory)
            .Where(wi => wi.Watchlist.UserId == userId && wi.Watchlist.IsActive)
            .ToListAsync();

        foreach (var item in watchlistItems)
        {
            try
            {
                // Check for availability changes (this would integrate with external APIs)
                var currentAvailability = await GetCurrentAvailabilityAsync(item, correlationId);
                var lastKnownAvailability = item.AvailabilityHistory
                    .OrderByDescending(a => a.LastChecked)
                    .FirstOrDefault();

                if (lastKnownAvailability == null || HasAvailabilityChanged(lastKnownAvailability, currentAvailability))
                {
                    changes.Add(new AvailabilityChange
                    {
                        UserId = userId,
                        WatchlistItemId = item.Id,
                        ChangeType = DetermineChangeType(lastKnownAvailability, currentAvailability),
                        OldAvailability = lastKnownAvailability,
                        NewAvailability = currentAvailability,
                        DetectedAt = DateTime.UtcNow
                    });

                    // Update the availability record
                    if (lastKnownAvailability != null)
                    {
                        lastKnownAvailability.IsAvailable = currentAvailability.IsAvailable;
                        lastKnownAvailability.LastChecked = DateTime.UtcNow;
                    }
                    else
                    {
                        _context.WatchlistItemAvailabilities.Add(currentAvailability);
                    }
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to check availability for watchlist item {ItemId}", item.Id);
            }
        }

        if (changes.Any())
        {
            await _context.SaveChangesAsync();
        }

        return changes;
    }

    private async Task<List<PriceChange>> CheckUserPriceChangesAsync(Guid userId, string correlationId)
    {
        var priceChanges = new List<PriceChange>();

        // Implementation would check for price changes in streaming services
        // This is a placeholder for the actual price monitoring logic
        
        _logger.LogDebug("Checking price changes for user {UserId}", userId);
        
        return priceChanges;
    }

    private async Task ProcessUserAvailabilityChangesAsync(Guid userId, List<AvailabilityChange> changes, string correlationId)
    {
        foreach (var change in changes)
        {
            try
            {
                var item = await _context.WatchlistItems
                    .Include(wi => wi.Watchlist)
                    .FirstOrDefaultAsync(wi => wi.Id == change.WatchlistItemId);

                if (item != null)
                {
                    var itemDto = MapToWatchlistItemDto(item);
                    var availabilityDto = change.NewAvailability != null ? 
                        new List<WatchlistItemAvailabilityDto> { MapToAvailabilityDto(change.NewAvailability) } :
                        new List<WatchlistItemAvailabilityDto>();

                    await _watchlistNotificationService.NotifyAvailabilityChangeAsync(
                        userId, itemDto, availabilityDto);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to process availability change for item {ItemId}", change.WatchlistItemId);
            }
        }
    }

    private async Task ProcessUserPriceChangesAsync(Guid userId, List<PriceChange> priceChanges, string correlationId)
    {
        foreach (var priceChange in priceChanges)
        {
            try
            {
                var item = await _context.WatchlistItems
                    .FirstOrDefaultAsync(wi => wi.Id == priceChange.WatchlistItemId);

                if (item != null)
                {
                    var itemDto = MapToWatchlistItemDto(item);
                    await _watchlistNotificationService.NotifyPriceDropAsync(
                        userId, itemDto, priceChange.OldPrice, priceChange.NewPrice, priceChange.ServiceName);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to process price change for item {ItemId}", priceChange.WatchlistItemId);
            }
        }
    }

    private async Task<WatchlistItemAvailability> GetCurrentAvailabilityAsync(WatchlistItem item, string correlationId)
    {
        // This would integrate with external streaming availability APIs
        // For now, return a placeholder
        return new WatchlistItemAvailability
        {
            WatchlistItemId = item.Id,
            ServiceName = "Netflix", // Example
            IsAvailable = true,
            LastChecked = DateTime.UtcNow,
            Region = "US"
        };
    }

    private bool HasAvailabilityChanged(WatchlistItemAvailability oldAvailability, WatchlistItemAvailability newAvailability)
    {
        return oldAvailability.IsAvailable != newAvailability.IsAvailable ||
               oldAvailability.ServiceName != newAvailability.ServiceName ||
               oldAvailability.Region != newAvailability.Region;
    }

    private async Task UpdateLastAvailabilityCheckAsync(Guid userId)
    {
        try
        {
            var watchlistItems = await _context.WatchlistItems
                .Where(wi => wi.Watchlist.UserId == userId)
                .ToListAsync();

            foreach (var item in watchlistItems)
            {
                item.LastAvailabilityCheck = DateTime.UtcNow;
            }

            await _context.SaveChangesAsync();
            _logger.LogDebug("Updated LastAvailabilityCheck for {ItemCount} items for user {UserId}", 
                watchlistItems.Count, userId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update LastAvailabilityCheck for user {UserId}", userId);
        }
    }

    private string DetermineChangeType(WatchlistItemAvailability? oldAvailability, WatchlistItemAvailability newAvailability)
    {
        if (oldAvailability == null)
            return "initial_check";
            
        if (!oldAvailability.IsAvailable && newAvailability.IsAvailable)
            return "became_available";
            
        if (oldAvailability.IsAvailable && !newAvailability.IsAvailable)
            return "became_unavailable";
            
        return "service_changed";
    }

    private async Task<List<AvailabilityChange>> GetPendingAvailabilityChangesAsync()
    {
        // This would query a table of pending availability changes
        // For now, return empty list
        return new List<AvailabilityChange>();
    }

    private async Task ProcessAvailabilityChangeNotificationAsync(AvailabilityChange change, string correlationId)
    {
        // Process individual availability change notification
        _logger.LogInformation("Processing availability change notification for user {UserId}, item {ItemId}",
            change.UserId, change.WatchlistItemId);
    }

    private async Task<List<ContentExpirationDto>> GetExpiringContentForUserAsync(Guid userId, string correlationId)
    {
        // This would query for content that's expiring soon for the user
        // Implementation depends on data source for expiration information
        return new List<ContentExpirationDto>();
    }

    private async Task SendDailyDigestAsync(Guid userId, string correlationId)
    {
        _logger.LogInformation("Sending daily digest to user {UserId}", userId);
        
        // Implementation would compile daily activity and send digest
        // This integrates with the existing digest service
    }

    // Helper mapping methods
    private WatchlistItemDto MapToWatchlistItemDto(WatchlistItem item)
    {
        return new WatchlistItemDto
        {
            Id = item.Id,
            TmdbId = item.TmdbId,
            Title = item.Title,
            Type = item.Type,
            Year = item.Year,
            PosterUrl = item.PosterUrl,
            Rating = item.Rating,
            AddedAt = item.AddedAt
        };
    }

    private WatchlistItemAvailabilityDto MapToAvailabilityDto(WatchlistItemAvailability availability)
    {
        return new WatchlistItemAvailabilityDto
        {
            Id = availability.Id,
            ServiceName = availability.ServiceName,
            IsAvailable = availability.IsAvailable,
            Region = availability.Region,
            LastChecked = availability.LastChecked
        };
    }
}

// Supporting DTOs for availability monitoring
public class AvailabilityChange
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public Guid WatchlistItemId { get; set; }
    public string ChangeType { get; set; } = string.Empty;
    public WatchlistItemAvailability? OldAvailability { get; set; }
    public WatchlistItemAvailability? NewAvailability { get; set; }
    public DateTime DetectedAt { get; set; }
    public bool NotificationSent { get; set; }
}

public class PriceChange
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public Guid WatchlistItemId { get; set; }
    public string ServiceName { get; set; } = string.Empty;
    public decimal OldPrice { get; set; }
    public decimal NewPrice { get; set; }
    public DateTime DetectedAt { get; set; }
    public bool NotificationSent { get; set; }
}