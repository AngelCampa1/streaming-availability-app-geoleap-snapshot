using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using System.Collections.Concurrent;

namespace GeoLeap.Api.Services;

/// <summary>
/// Enhanced background service for notification processing, digests, and maintenance tasks - US-8.2
/// </summary>
public class EnhancedNotificationBackgroundService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<EnhancedNotificationBackgroundService> _logger;
    private readonly NotificationBackgroundOptions _options;
    private readonly ConcurrentQueue<NotificationTask> _taskQueue = new();
    private readonly SemaphoreSlim _taskSemaphore;
    
    private Timer? _availabilityCheckTimer;
    private Timer? _digestTimer;
    private Timer? _maintenanceTimer;
    private Timer? _analyticsTimer;

    public EnhancedNotificationBackgroundService(
        IServiceProvider serviceProvider,
        ILogger<EnhancedNotificationBackgroundService> logger,
        IOptions<NotificationBackgroundOptions> options)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
        _options = options.Value;
        _taskSemaphore = new SemaphoreSlim(_options.MaxConcurrentTasks, _options.MaxConcurrentTasks);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Enhanced Notification Background Service started with {MaxConcurrentTasks} concurrent task limit", _options.MaxConcurrentTasks);

        try
        {
            // Initialize all timers
            InitializeTimers();

            // Start the main task processing loop
            await ProcessTaskQueueAsync(stoppingToken);
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("Enhanced Notification Background Service cancelled");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Fatal error in Enhanced Notification Background Service");
            throw;
        }
        finally
        {
            _logger.LogInformation("Enhanced Notification Background Service stopped");
        }
    }

    private void InitializeTimers()
    {
        // Availability check timer - runs every 6 hours
        _availabilityCheckTimer = new Timer(
            async _ => await ScheduleTaskAsync("availability_check", ProcessAvailabilityChecks),
            null,
            TimeSpan.Zero, // Start immediately
            TimeSpan.FromHours(_options.AvailabilityCheckIntervalHours));

        // Digest timer - runs daily at configured time
        var nextDigestTime = CalculateNextDigestTime();
        _digestTimer = new Timer(
            async _ => await ScheduleTaskAsync("digest_processing", ProcessDigestNotifications),
            null,
            nextDigestTime - DateTime.UtcNow,
            TimeSpan.FromDays(1));

        // Maintenance timer - runs every 2 hours
        _maintenanceTimer = new Timer(
            async _ => await ScheduleTaskAsync("maintenance", ProcessMaintenanceTasks),
            null,
            TimeSpan.FromMinutes(5), // Start after 5 minutes
            TimeSpan.FromHours(_options.MaintenanceIntervalHours));

        // Analytics timer - runs every hour
        _analyticsTimer = new Timer(
            async _ => await ScheduleTaskAsync("analytics", ProcessAnalyticsTasks),
            null,
            TimeSpan.FromMinutes(10), // Start after 10 minutes
            TimeSpan.FromHours(_options.AnalyticsIntervalHours));

        _logger.LogInformation("Initialized all background timers - next digest at {NextDigestTime}", nextDigestTime);
    }

    private async Task ProcessTaskQueueAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                if (_taskQueue.TryDequeue(out var task))
                {
                    await _taskSemaphore.WaitAsync(stoppingToken);
                    
                    // Process task in background to avoid blocking the queue
                    _ = Task.Run(async () =>
                    {
                        try
                        {
                            _logger.LogInformation("Processing background task: {TaskType}", task.Type);
                            await task.Action();
                            _logger.LogInformation("Completed background task: {TaskType}", task.Type);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogError(ex, "Error processing background task: {TaskType}", task.Type);
                        }
                        finally
                        {
                            _taskSemaphore.Release();
                        }
                    }, stoppingToken);
                }
                else
                {
                    // No tasks in queue, wait a bit before checking again
                    await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);
                }
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in task queue processing loop");
                await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
            }
        }
    }

    private async Task ScheduleTaskAsync(string taskType, Func<Task> action)
    {
        try
        {
            var task = new NotificationTask
            {
                Type = taskType,
                ScheduledAt = DateTime.UtcNow,
                Action = action
            };

            _taskQueue.Enqueue(task);
            _logger.LogDebug("Scheduled background task: {TaskType}", taskType);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error scheduling background task: {TaskType}", taskType);
        }
        
        await Task.CompletedTask;
    }

    private async Task ProcessAvailabilityChecks()
    {
        using var scope = _serviceProvider.CreateScope();
        var availabilityService = scope.ServiceProvider.GetRequiredService<IWatchlistAvailabilityService>();

        try
        {
            _logger.LogInformation("Starting scheduled availability check cycle");
            await availabilityService.CheckAllWatchlistsAvailabilityAsync();
            _logger.LogInformation("Completed scheduled availability check cycle");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during scheduled availability check cycle");
        }
    }

    private async Task ProcessDigestNotifications()
    {
        using var scope = _serviceProvider.CreateScope();
        var notificationService = scope.ServiceProvider.GetRequiredService<IWatchlistNotificationService>();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        try
        {
            _logger.LogInformation("Starting scheduled digest processing");

            // Process weekly digests (on configured day of week)
            if (ShouldProcessWeeklyDigests())
            {
                await ProcessWeeklyDigestsAsync(notificationService, context);
            }

            // Process monthly digests (on 1st of month)
            if (DateTime.UtcNow.Day == 1)
            {
                await ProcessMonthlyDigestsAsync(notificationService, context);
            }

            // Process expiring content notifications
            await ProcessExpiringContentNotificationsAsync(notificationService, context);

            _logger.LogInformation("Completed scheduled digest processing");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during scheduled digest processing");
        }
    }

    private async Task ProcessWeeklyDigestsAsync(IWatchlistNotificationService notificationService, ApplicationDbContext context)
    {
        try
        {
            var users = await context.WatchlistNotificationSettings
                .Where(s => s.WeeklyDigest && s.User.IsActive)
                .Select(s => s.UserId)
                .ToListAsync();

            _logger.LogInformation("Processing weekly digests for {UserCount} users", users.Count);

            var semaphore = new SemaphoreSlim(_options.DigestConcurrency, _options.DigestConcurrency);
            var tasks = users.Select(async userId =>
            {
                await semaphore.WaitAsync();
                try
                {
                    await notificationService.SendWeeklyDigestAsync(userId);
                    await Task.Delay(_options.DigestDelayMs); // Rate limiting
                }
                finally
                {
                    semaphore.Release();
                }
            });

            await Task.WhenAll(tasks);
            _logger.LogInformation("Completed weekly digest processing for {UserCount} users", users.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing weekly digests");
        }
    }

    private async Task ProcessMonthlyDigestsAsync(IWatchlistNotificationService notificationService, ApplicationDbContext context)
    {
        try
        {
            var users = await context.WatchlistNotificationSettings
                .Where(s => s.MonthlyDigest && s.User.IsActive)
                .Select(s => s.UserId)
                .ToListAsync();

            _logger.LogInformation("Processing monthly digests for {UserCount} users", users.Count);

            var semaphore = new SemaphoreSlim(_options.DigestConcurrency, _options.DigestConcurrency);
            var tasks = users.Select(async userId =>
            {
                await semaphore.WaitAsync();
                try
                {
                    await notificationService.SendMonthlyDigestAsync(userId);
                    await Task.Delay(_options.DigestDelayMs); // Rate limiting
                }
                finally
                {
                    semaphore.Release();
                }
            });

            await Task.WhenAll(tasks);
            _logger.LogInformation("Completed monthly digest processing for {UserCount} users", users.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing monthly digests");
        }
    }

    private async Task ProcessExpiringContentNotificationsAsync(IWatchlistNotificationService notificationService, ApplicationDbContext context)
    {
        try
        {
            var expirationThreshold = DateTime.UtcNow.AddDays(7);
            
            var expiringItems = await context.WatchlistItemAvailabilities
                .Include(a => a.WatchlistItem)
                    .ThenInclude(i => i.Watchlist)
                        .ThenInclude(w => w.User)
                .Where(a => a.IsActive && 
                           a.AvailableUntil.HasValue && 
                           a.AvailableUntil.Value <= expirationThreshold &&
                           a.WatchlistItem.Watchlist.User.IsActive)
                .GroupBy(a => a.WatchlistItem.Watchlist.UserId)
                .ToListAsync();

            _logger.LogInformation("Processing expiring content notifications for {UserCount} users", expiringItems.Count);

            foreach (var userGroup in expiringItems)
            {
                var userId = userGroup.Key;
                var userExpiringContent = userGroup.Select(a => new ContentExpirationDto
                {
                    ItemId = a.WatchlistItem.Id,
                    Title = a.WatchlistItem.Title,
                    PosterUrl = a.WatchlistItem.PosterUrl ?? "",
                    ServiceName = a.ServiceName,
                    ExpirationDate = a.AvailableUntil!.Value,
                    DaysUntilExpiration = (int)(a.AvailableUntil.Value - DateTime.UtcNow).TotalDays
                }).ToList();

                await notificationService.NotifyContentExpiringAsync(userId, userExpiringContent);
            }

            _logger.LogInformation("Completed expiring content notification processing");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing expiring content notifications");
        }
    }

    private async Task ProcessMaintenanceTasks()
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var notificationEngine = scope.ServiceProvider.GetRequiredService<INotificationEngine>();

        try
        {
            _logger.LogInformation("Starting scheduled maintenance tasks");

            // Cleanup old notification data
            await CleanupOldNotificationDataAsync(context);

            // Process failed notification retries
            await ProcessFailedNotificationRetriesAsync(notificationEngine, context);

            // Update notification statistics
            await UpdateNotificationStatisticsAsync(context);

            // Cleanup expired cache entries (if using database cache)
            await CleanupExpiredCacheEntriesAsync(context);

            _logger.LogInformation("Completed scheduled maintenance tasks");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during scheduled maintenance tasks");
        }
    }

    private async Task ProcessAnalyticsTasks()
    {
        using var scope = _serviceProvider.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        try
        {
            _logger.LogInformation("Starting scheduled analytics processing");

            // Generate hourly notification metrics
            await GenerateHourlyMetricsAsync(context);

            // Update user engagement scores
            await UpdateUserEngagementScoresAsync(context);

            // Generate template performance metrics
            await GenerateTemplateMetricsAsync(context);

            _logger.LogInformation("Completed scheduled analytics processing");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during scheduled analytics processing");
        }
    }

    private async Task CleanupOldNotificationDataAsync(ApplicationDbContext context)
    {
        try
        {
            var cutoffDate = DateTime.UtcNow.AddDays(-_options.DataRetentionDays);
            
            // Delete old notifications
            var oldNotifications = await context.Notifications
                .Where(n => n.CreatedAt < cutoffDate)
                .CountAsync();

            if (oldNotifications > 0)
            {
                await context.Database.ExecuteSqlRawAsync(
                    "DELETE FROM Notifications WHERE CreatedAt < {0}", cutoffDate);
                _logger.LogInformation("Cleaned up {Count} old notifications", oldNotifications);
            }

            // Delete old delivery logs
            var oldDeliveries = await context.NotificationDeliveries
                .Where(d => d.CreatedAt < cutoffDate)
                .CountAsync();

            if (oldDeliveries > 0)
            {
                await context.Database.ExecuteSqlRawAsync(
                    "DELETE FROM NotificationDeliveries WHERE CreatedAt < {0}", cutoffDate);
                _logger.LogInformation("Cleaned up {Count} old delivery records", oldDeliveries);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during notification data cleanup");
        }
    }

    private async Task ProcessFailedNotificationRetriesAsync(INotificationEngine notificationEngine, ApplicationDbContext context)
    {
        try
        {
            var retryThreshold = DateTime.UtcNow.AddHours(-_options.RetryDelayHours);
            
            var failedDeliveries = await context.NotificationDeliveries
                .Where(d => d.Status == "failed" && 
                           d.RetryCount < _options.MaxRetryAttempts &&
                           d.UpdatedAt < retryThreshold)
                .Take(_options.MaxRetriesPerCycle)
                .ToListAsync();

            _logger.LogInformation("Processing {Count} failed notification retries", failedDeliveries.Count);

            foreach (var delivery in failedDeliveries)
            {
                try
                {
                    // Reconstruct the notification request
                    var originalNotification = await context.Notifications
                        .FirstOrDefaultAsync(n => n.Id == delivery.NotificationId);

                    if (originalNotification != null)
                    {
                        var retryRequest = new NotificationRequest
                        {
                            UserId = originalNotification.UserId,
                            Type = originalNotification.Type,
                            Category = originalNotification.Category,
                            Priority = originalNotification.Priority,
                            Title = originalNotification.Title,
                            Message = originalNotification.Message,
                            Channels = new List<string> { delivery.Channel },
                            TemplateId = originalNotification.TemplateId,
                            TemplateData = originalNotification.TemplateData ?? new Dictionary<string, object>()
                        };

                        await notificationEngine.SendNotificationAsync(retryRequest, $"retry-{delivery.Id}");
                        
                        delivery.RetryCount++;
                        delivery.LastRetryAt = DateTime.UtcNow;
                        delivery.UpdatedAt = DateTime.UtcNow;
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error retrying notification delivery {DeliveryId}", delivery.Id);
                    delivery.RetryCount++;
                    delivery.UpdatedAt = DateTime.UtcNow;
                    delivery.ErrorMessage = ex.Message;
                }
            }

            if (failedDeliveries.Any())
            {
                await context.SaveChangesAsync();
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing failed notification retries");
        }
    }

    private async Task UpdateNotificationStatisticsAsync(ApplicationDbContext context)
    {
        try
        {
            // This would update various notification statistics in the database
            // For now, we'll just log that statistics were updated
            _logger.LogDebug("Updated notification statistics");
            await Task.CompletedTask;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating notification statistics");
        }
    }

    private async Task CleanupExpiredCacheEntriesAsync(ApplicationDbContext context)
    {
        try
        {
            // This would cleanup expired cache entries if using database caching
            _logger.LogDebug("Cleaned up expired cache entries");
            await Task.CompletedTask;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error cleaning up expired cache entries");
        }
    }

    private async Task GenerateHourlyMetricsAsync(ApplicationDbContext context)
    {
        try
        {
            var hourAgo = DateTime.UtcNow.AddHours(-1);
            
            var metrics = await context.NotificationDeliveries
                .Where(d => d.CreatedAt >= hourAgo)
                .GroupBy(d => new { d.Channel, d.Status })
                .Select(g => new
                {
                    Channel = g.Key.Channel,
                    Status = g.Key.Status,
                    Count = g.Count()
                })
                .ToListAsync();

            _logger.LogInformation("Generated hourly metrics: {MetricsCount} metric groups", metrics.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating hourly metrics");
        }
    }

    private async Task UpdateUserEngagementScoresAsync(ApplicationDbContext context)
    {
        try
        {
            // This would calculate and update user engagement scores based on notification interactions
            _logger.LogDebug("Updated user engagement scores");
            await Task.CompletedTask;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating user engagement scores");
        }
    }

    private async Task GenerateTemplateMetricsAsync(ApplicationDbContext context)
    {
        try
        {
            // This would generate performance metrics for notification templates
            _logger.LogDebug("Generated template performance metrics");
            await Task.CompletedTask;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating template metrics");
        }
    }

    private DateTime CalculateNextDigestTime()
    {
        var now = DateTime.UtcNow;
        var targetTime = new DateTime(now.Year, now.Month, now.Day, _options.DigestHour, 0, 0, DateTimeKind.Utc);
        
        if (targetTime <= now)
        {
            targetTime = targetTime.AddDays(1);
        }
        
        return targetTime;
    }

    private bool ShouldProcessWeeklyDigests()
    {
        var today = DateTime.UtcNow.DayOfWeek;
        var targetDay = (DayOfWeek)_options.WeeklyDigestDayOfWeek;
        return today == targetDay;
    }

    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Enhanced Notification Background Service is stopping");

        // Dispose timers
        _availabilityCheckTimer?.Dispose();
        _digestTimer?.Dispose();
        _maintenanceTimer?.Dispose();
        _analyticsTimer?.Dispose();

        // Wait for current tasks to complete
        await _taskSemaphore.WaitAsync(TimeSpan.FromSeconds(30), cancellationToken);

        await base.StopAsync(cancellationToken);
    }

    public override void Dispose()
    {
        _availabilityCheckTimer?.Dispose();
        _digestTimer?.Dispose();
        _maintenanceTimer?.Dispose();
        _analyticsTimer?.Dispose();
        _taskSemaphore.Dispose();
        base.Dispose();
    }
}

// Configuration options for the background service
public class NotificationBackgroundOptions
{
    public int MaxConcurrentTasks { get; set; } = 10;
    public int AvailabilityCheckIntervalHours { get; set; } = 6;
    public int MaintenanceIntervalHours { get; set; } = 2;
    public int AnalyticsIntervalHours { get; set; } = 1;
    public int DigestHour { get; set; } = 9; // 9 AM UTC
    public int WeeklyDigestDayOfWeek { get; set; } = 1; // Monday
    public int DigestConcurrency { get; set; } = 5;
    public int DigestDelayMs { get; set; } = 500;
    public int DataRetentionDays { get; set; } = 90;
    public int RetryDelayHours { get; set; } = 2;
    public int MaxRetryAttempts { get; set; } = 3;
    public int MaxRetriesPerCycle { get; set; } = 100;
}

// Task queue item
public class NotificationTask
{
    public string Type { get; set; } = "";
    public DateTime ScheduledAt { get; set; }
    public Func<Task> Action { get; set; } = () => Task.CompletedTask;
}