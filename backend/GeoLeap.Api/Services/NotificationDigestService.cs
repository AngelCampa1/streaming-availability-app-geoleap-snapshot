using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace GeoLeap.Api.Services;

/// <summary>
/// Background service for processing digest notifications - US-8.2 Feature
/// </summary>
public class NotificationDigestService : BackgroundService
{
    private readonly IServiceScopeFactory _serviceScopeFactory;
    private readonly ILogger<NotificationDigestService> _logger;
    private readonly TimeSpan _checkInterval = TimeSpan.FromMinutes(30); // Check every 30 minutes

    public NotificationDigestService(
        IServiceScopeFactory serviceScopeFactory,
        ILogger<NotificationDigestService> logger)
    {
        _serviceScopeFactory = serviceScopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Notification Digest Service started");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var now = DateTime.UtcNow;

                // Only run digest processing during the delivery window (8-11 AM UTC)
                // Outside this window, skip DB queries to allow Neon compute to suspend
                if (now.Hour >= 8 && now.Hour <= 11)
                {
                    await ProcessScheduledDigestsAsync();
                    await ProcessExpiringContentNotificationsAsync();

                    // Run cleanup once per day (only at 8 AM hour)
                    if (now.Hour == 8)
                    {
                        await CleanupOldNotificationLogsAsync();
                    }
                }

                await Task.Delay(_checkInterval, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                // Expected when cancellation is requested
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in NotificationDigestService execution");
                // Wait a bit before retrying to avoid tight error loops
                await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken);
            }
        }

        _logger.LogInformation("Notification Digest Service stopped");
    }

    private async Task ProcessScheduledDigestsAsync()
    {
        using var scope = _serviceScopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var notificationService = scope.ServiceProvider.GetRequiredService<IWatchlistNotificationService>();

        var now = DateTime.UtcNow;
        var timeOfDay = now.TimeOfDay;

        try
        {
            // Process weekly digests (check if it's the right day and time)
            if (ShouldProcessWeeklyDigests(now))
            {
                var weeklyUsers = await GetUsersForDigest(context, "weekly", timeOfDay);
                _logger.LogInformation("Processing weekly digests for {UserCount} users", weeklyUsers.Count);

                var weeklyTasks = weeklyUsers.Select(async userId =>
                {
                    try
                    {
                        await notificationService.SendWeeklyDigestAsync(userId);
                        await RecordDigestSentAsync(context, userId, "weekly_digest");
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to send weekly digest to user {UserId}", userId);
                    }
                });

                await Task.WhenAll(weeklyTasks);
            }

            // Process monthly digests (first day of month)
            if (ShouldProcessMonthlyDigests(now))
            {
                var monthlyUsers = await GetUsersForDigest(context, "monthly", timeOfDay);
                _logger.LogInformation("Processing monthly digests for {UserCount} users", monthlyUsers.Count);

                var monthlyTasks = monthlyUsers.Select(async userId =>
                {
                    try
                    {
                        await notificationService.SendMonthlyDigestAsync(userId);
                        await RecordDigestSentAsync(context, userId, "monthly_digest");
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to send monthly digest to user {UserId}", userId);
                    }
                });

                await Task.WhenAll(monthlyTasks);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing scheduled digests");
        }
    }

    private async Task ProcessExpiringContentNotificationsAsync()
    {
        using var scope = _serviceScopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var notificationService = scope.ServiceProvider.GetRequiredService<IWatchlistNotificationService>();

        try
        {
            // Find content expiring in the next 7 days
            var expiringThreshold = DateTime.UtcNow.AddDays(7);
            
            var expiringContent = await context.WatchlistItemAvailabilities
                .Where(a => a.IsActive && 
                           a.AvailableUntil.HasValue && 
                           a.AvailableUntil.Value <= expiringThreshold &&
                           a.AvailableUntil.Value > DateTime.UtcNow)
                .Include(a => a.WatchlistItem)
                    .ThenInclude(i => i.Watchlist)
                        .ThenInclude(w => w.User)
                .GroupBy(a => a.WatchlistItem.Watchlist.UserId)
                .ToListAsync();

            foreach (var userGroup in expiringContent)
            {
                var userId = userGroup.Key;
                
                // Check if user wants expiring content notifications
                var settings = await context.WatchlistNotificationSettings
                    .FirstOrDefaultAsync(s => s.UserId == userId);
                
                if (settings?.NotifyOnContentExpiring != true) continue;

                // Check if we've already notified about these items recently
                var recentNotifications = await context.NotificationDeliveryLogs
                    .Where(n => n.UserId == userId && 
                           n.Type == "content_expiring" &&
                           n.DeliveredAt >= DateTime.UtcNow.AddHours(-12))
                    .CountAsync();

                if (recentNotifications > 0) continue; // Already notified recently

                var contentExpirationDtos = userGroup.Select(a => new ContentExpirationDto
                {
                    Item = MapToWatchlistItemDto(a.WatchlistItem),
                    ServiceName = a.ServiceName,
                    ExpirationDate = a.AvailableUntil!.Value,
                    DaysUntilExpiration = (a.AvailableUntil.Value - DateTime.UtcNow).Days
                }).ToList();

                try
                {
                    await notificationService.NotifyContentExpiringAsync(userId, contentExpirationDtos);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to send expiring content notification to user {UserId}", userId);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing expiring content notifications");
        }
    }

    private async Task CleanupOldNotificationLogsAsync()
    {
        using var scope = _serviceScopeFactory.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        try
        {
            // Delete notification logs older than 90 days
            var cutoffDate = DateTime.UtcNow.AddDays(-90);
            
            var oldLogs = await context.NotificationDeliveryLogs
                .Where(n => n.DeliveredAt < cutoffDate)
                .CountAsync();

            if (oldLogs > 0)
            {
                await context.NotificationDeliveryLogs
                    .Where(n => n.DeliveredAt < cutoffDate)
                    .ExecuteDeleteAsync();

                _logger.LogInformation("Cleaned up {LogCount} old notification logs", oldLogs);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error cleaning up old notification logs");
        }
    }

    private bool ShouldProcessWeeklyDigests(DateTime now)
    {
        // Process weekly digests once per day during the digest delivery window
        return now.Hour >= 8 && now.Hour <= 11; // Between 8-11 AM UTC
    }

    private bool ShouldProcessMonthlyDigests(DateTime now)
    {
        // Process monthly digests on the first 3 days of the month during delivery window
        return now.Day <= 3 && now.Hour >= 8 && now.Hour <= 11;
    }

    private async Task<List<Guid>> GetUsersForDigest(ApplicationDbContext context, string digestType, TimeSpan currentTime)
    {
        var query = context.WatchlistNotificationSettings.AsQueryable();

        if (digestType == "weekly")
        {
            // Get users who want weekly digests and it's their preferred day
            var currentDayOfWeek = (int)DateTime.UtcNow.DayOfWeek;
            query = query.Where(s => s.WeeklyDigest && s.WeeklyDigestDay == currentDayOfWeek);
        }
        else if (digestType == "monthly")
        {
            // Get users who want monthly digests and it's their preferred day of month
            var currentDay = DateTime.UtcNow.Day;
            query = query.Where(s => s.MonthlyDigest && s.MonthlyDigestDay == currentDay);
        }

        // Filter by digest delivery time (within 1 hour of preferred time)
        var users = await query
            .Where(s => s.DigestDeliveryTime == null || 
                       (s.DigestDeliveryTime.Value.Hours == currentTime.Hours ||
                        Math.Abs(s.DigestDeliveryTime.Value.Hours - currentTime.Hours) <= 1))
            .Select(s => s.UserId)
            .ToListAsync();

        // Filter out users who already received this digest type today
        var today = DateTime.UtcNow.Date;
        var usersWithRecentDigests = await context.NotificationDeliveryLogs
            .Where(n => users.Contains(n.UserId) && 
                       n.Type == $"{digestType}_digest" &&
                       n.DeliveredAt >= today)
            .Select(n => n.UserId)
            .ToListAsync();

        return users.Except(usersWithRecentDigests).ToList();
    }

    private async Task RecordDigestSentAsync(ApplicationDbContext context, Guid userId, string digestType)
    {
        var log = new NotificationDeliveryLog
        {
            UserId = userId,
            Type = digestType,
            Title = $"{digestType} digest",
            Message = $"Digest delivered via email",
            Channels = "email",
            Success = true,
            DeliveredAt = DateTime.UtcNow
        };

        context.NotificationDeliveryLogs.Add(log);
        await context.SaveChangesAsync();
    }

    private WatchlistItemDto MapToWatchlistItemDto(WatchlistItem item)
    {
        return new WatchlistItemDto
        {
            Id = item.Id,
            WatchlistId = item.WatchlistId,
            ContentType = item.ContentType,
            ContentId = item.ContentId,
            Title = item.Title,
            Overview = item.Overview,
            PosterUrl = item.PosterUrl,
            BackdropUrl = item.BackdropUrl,
            ReleaseYear = item.ReleaseYear,
            Rating = item.Rating,
            Runtime = item.Runtime,
            Genres = string.IsNullOrEmpty(item.Genres) 
                ? new List<string>() 
                : System.Text.Json.JsonSerializer.Deserialize<List<string>>(item.Genres) ?? new List<string>(),
            StreamingServices = string.IsNullOrEmpty(item.StreamingServices) 
                ? new List<string>() 
                : System.Text.Json.JsonSerializer.Deserialize<List<string>>(item.StreamingServices) ?? new List<string>(),
            Status = item.Status ?? "",
            Priority = item.Priority,
            IsWatched = item.IsWatched,
            WatchedAt = item.WatchedAt,
            UserRating = item.UserRating,
            UserNotes = item.UserNotes,
            Tags = string.IsNullOrEmpty(item.Tags) 
                ? new List<string>() 
                : System.Text.Json.JsonSerializer.Deserialize<List<string>>(item.Tags) ?? new List<string>(),
            AddedAt = item.AddedAt,
            UpdatedAt = item.UpdatedAt,
            IsCurrentlyAvailable = item.IsCurrentlyAvailable,
            LastAvailabilityCheck = item.LastAvailabilityCheck,
            CurrentAvailability = new List<WatchlistItemAvailabilityDto>()
        };
    }
}