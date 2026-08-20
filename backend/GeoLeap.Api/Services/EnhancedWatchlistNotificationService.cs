using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace GeoLeap.Api.Services;

/// <summary>
/// Enhanced watchlist notification service that integrates with the new NotificationEngine for US-8.2
/// </summary>
public class EnhancedWatchlistNotificationService : IWatchlistNotificationService
{
    private readonly INotificationEngine _notificationEngine;
    private readonly IDbContextFactory<ApplicationDbContext> _contextFactory;
    private readonly ILogger<EnhancedWatchlistNotificationService> _logger;
    private readonly INotificationPreferencesService _preferencesService;

    public EnhancedWatchlistNotificationService(
        INotificationEngine notificationEngine,
        IDbContextFactory<ApplicationDbContext> contextFactory,
        ILogger<EnhancedWatchlistNotificationService> logger,
        INotificationPreferencesService preferencesService)
    {
        _notificationEngine = notificationEngine;
        _contextFactory = contextFactory;
        _logger = logger;
        _preferencesService = preferencesService;
    }

    public async Task NotifyAvailabilityChangeAsync(Guid userId, WatchlistItemDto item, List<WatchlistItemAvailabilityDto> newAvailability)
    {
        await NotifyAvailabilityChangeAsync(userId, item, newAvailability, "en", Guid.NewGuid().ToString());
    }

    public async Task NotifyAvailabilityChangeAsync(Guid userId, WatchlistItemDto item, List<WatchlistItemAvailabilityDto> newAvailability, string language, string correlationId)
    {
        try
        {
            // Check user preferences
            var canSend = await _preferencesService.CanSendNotificationAsync(userId, "availability_change", new List<string> { "email", "push" });
            if (!canSend) return;

            var services = newAvailability.Where(a => a.IsActive).Select(a => a.ServiceName).ToList();
            var lastService = services.LastOrDefault();
            var servicesList = services.Count > 1 && lastService != null
                ? $"{string.Join(", ", services.Take(services.Count - 1))} and {lastService}"
                : services.FirstOrDefault() ?? "streaming services";

            var request = new NotificationRequest
            {
                UserId = userId,
                Type = "availability_change",
                Priority = "medium",
                Title = "Content Now Available!",
                Message = $"{item.Title} is now available on {servicesList}",
                TemplateId = "watchlist_availability_change",
                Channels = new List<string> { "email", "push" },
                Data = new Dictionary<string, object>
                {
                    {"itemTitle", item.Title},
                    {"itemPoster", item.PosterUrl ?? ""},
                    {"itemOverview", item.Overview ?? ""},
                    {"services", services},
                    {"availability", newAvailability},
                    {"watchNowUrl", $"/watch/{item.ContentId}"},
                    {"manageWatchlistUrl", $"/watchlist/{item.WatchlistId}"}
                },
                Metadata = new Dictionary<string, object>
                {
                    {"category", "watchlist"},
                    {"templateId", "watchlist_availability_change"},
                    {"itemId", item.Id.ToString()},
                    {"watchlistId", item.WatchlistId.ToString()},
                    {"contentType", item.ContentType},
                    {"contentId", item.ContentId},
                    {"language", language}
                }
            };

            await _notificationEngine.SendNotificationAsync(request, correlationId);
            _logger.LogInformation("Availability change notification sent for user {UserId}, item {ItemId}", userId, item.Id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending availability change notification for user {UserId}, item {ItemId}", userId, item.Id);
        }
    }

    public async Task NotifyWatchlistSharedAsync(Guid userId, WatchlistDetailDto watchlist, WatchlistShareDto share)
    {
        try
        {
            var canSend = await _preferencesService.CanSendNotificationAsync(userId, "watchlist_shared", new List<string> { "email", "push" });
            if (!canSend) return;

            var request = new NotificationRequest
            {
                UserId = userId,
                Type = "watchlist_shared",
                Priority = "low",
                Title = "Watchlist Shared",
                Message = $"{share.SharedWithEmail} shared a watchlist with you: {watchlist.Name}",
                Channels = new List<string> { "email", "push" },
                Data = new Dictionary<string, object>
                {
                    {"watchlistName", watchlist.Name},
                    {"watchlistDescription", watchlist.Description ?? ""},
                    {"sharedByEmail", share.SharedWithEmail},
                    {"itemCount", watchlist.Items?.Count ?? 0},
                    {"viewWatchlistUrl", $"/watchlist/{watchlist.Id}"}
                }
            };

            await _notificationEngine.SendNotificationAsync(request);
            _logger.LogInformation("Watchlist shared notification sent for user {UserId}, watchlist {WatchlistId}", userId, watchlist.Id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending watchlist shared notification for user {UserId}, watchlist {WatchlistId}", userId, watchlist.Id);
        }
    }

    public async Task NotifyNewRecommendationAsync(Guid userId, List<WatchlistItemDto> recommendations)
    {
        try
        {
            var canSend = await _preferencesService.CanSendNotificationAsync(userId, "recommendations", new List<string> { "email", "push" });
            if (!canSend) return;

            var count = recommendations.Count;
            var firstItem = recommendations.FirstOrDefault();

            var request = new NotificationRequest
            {
                UserId = userId,
                Type = "recommendations",
                Priority = "low",
                Title = count == 1 ? "New Recommendation" : $"{count} New Recommendations",
                Message = count == 1 ? $"We found something you might like: {firstItem?.Title}" : $"We found {count} new shows and movies you might enjoy",
                Channels = new List<string> { "email", "push" },
                Data = new Dictionary<string, object>
                {
                    {"recommendationCount", count},
                    {"recommendations", recommendations.Take(5).ToList()},
                    {"viewRecommendationsUrl", "/recommendations"}
                }
            };

            await _notificationEngine.SendNotificationAsync(request);
            _logger.LogInformation("New recommendation notification sent for user {UserId}, {Count} recommendations", userId, count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending recommendation notification for user {UserId}", userId);
        }
    }

    public async Task NotifyPriceDropAsync(Guid userId, WatchlistItemDto item, decimal oldPrice, decimal newPrice, string service)
    {
        try
        {
            var canSend = await _preferencesService.CanSendNotificationAsync(userId, "price_drop", new List<string> { "email", "push" });
            if (!canSend) return;

            var savings = oldPrice - newPrice;
            var savingsPercent = Math.Round((savings / oldPrice) * 100, 1);

            var request = new NotificationRequest
            {
                UserId = userId,
                Type = "price_drop",
                Priority = "medium",
                Title = "Price Drop Alert!",
                Message = $"{item.Title} is now ${newPrice:F2} (was ${oldPrice:F2}) on {service} - Save ${savings:F2}!",
                Channels = new List<string> { "email", "push" },
                Data = new Dictionary<string, object>
                {
                    {"itemTitle", item.Title},
                    {"itemPoster", item.PosterUrl ?? ""},
                    {"service", service},
                    {"oldPrice", oldPrice},
                    {"newPrice", newPrice},
                    {"savings", savings},
                    {"savingsPercent", savingsPercent},
                    {"currency", "USD"},
                    {"watchNowUrl", $"/watch/{item.ContentId}"},
                    {"validUntil", DateTime.UtcNow.AddDays(7).ToString("yyyy-MM-dd")}
                }
            };

            await _notificationEngine.SendNotificationAsync(request);
            _logger.LogInformation("Price drop notification sent for user {UserId}, item {ItemId}, savings ${Savings:F2}", userId, item.Id, savings);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending price drop notification for user {UserId}, item {ItemId}", userId, item.Id);
        }
    }

    public async Task NotifyNewReleaseAsync(Guid userId, WatchlistItemDto item)
    {
        try
        {
            var canSend = await _preferencesService.CanSendNotificationAsync(userId, "new_releases", new List<string> { "email", "push" });
            if (!canSend) return;

            var request = new NotificationRequest
            {
                UserId = userId,
                Type = "new_releases",
                Priority = "medium",
                Title = "New Release Alert!",
                Message = $"{item.Title} has been released and is now available to watch",
                Channels = new List<string> { "email", "push" },
                Data = new Dictionary<string, object>
                {
                    {"itemTitle", item.Title},
                    {"itemPoster", item.PosterUrl ?? ""},
                    {"itemOverview", item.Overview ?? ""},
                    {"releaseYear", item.ReleaseYear},
                    {"rating", item.Rating ?? 0},
                    {"watchNowUrl", $"/watch/{item.ContentId}"},
                    {"addToWatchlistUrl", $"/watchlist/add/{item.ContentId}"}
                }
            };

            await _notificationEngine.SendNotificationAsync(request);
            _logger.LogInformation("New release notification sent for user {UserId}, item {ItemId}", userId, item.Id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending new release notification for user {UserId}, item {ItemId}", userId, item.Id);
        }
    }

    public async Task SendBulkNotificationAsync(List<Guid> userIds, string subject, string message, string type = "info")
    {
        try
        {
            var tasks = userIds.Select(async userId =>
            {
                var canSend = await _preferencesService.CanSendNotificationAsync(userId, type, new List<string> { "email", "push" });
                if (!canSend) return;

                var request = new NotificationRequest
                {
                    UserId = userId,
                    Type = type,
                    Priority = "low",
                    Title = subject,
                    Message = message,
                    Channels = new List<string> { "email", "push" },
                    Data = new Dictionary<string, object>
                    {
                        {"subject", subject},
                        {"message", message},
                        {"type", type}
                    }
                };

                await _notificationEngine.SendNotificationAsync(request);
            });

            await Task.WhenAll(tasks);
            _logger.LogInformation("Bulk notification sent to {UserCount} users", userIds.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending bulk notification to {UserCount} users", userIds.Count);
        }
    }

    public async Task NotifyLeavingPlatformAsync(Guid userId, WatchlistItemDto item, string serviceName, DateTime leavingDate, int daysUntilRemoval)
    {
        try
        {
            var canSend = await _preferencesService.CanSendNotificationAsync(userId, "content_expiring", new List<string> { "email", "push" });
            if (!canSend) return;

            var urgency = daysUntilRemoval <= 1 ? "critical" : daysUntilRemoval <= 7 ? "high" : "medium";

            var request = new NotificationRequest
            {
                UserId = userId,
                Type = "content_expiring",
                Priority = urgency,
                Title = "Content Leaving Soon!",
                Message = $"{item.Title} is leaving {serviceName} in {daysUntilRemoval} day{(daysUntilRemoval == 1 ? "" : "s")}",
                Channels = new List<string> { "email", "push" },
                Data = new Dictionary<string, object>
                {
                    {"itemTitle", item.Title},
                    {"itemPoster", item.PosterUrl ?? ""},
                    {"serviceName", serviceName},
                    {"leavingDate", leavingDate.ToString("MMMM dd, yyyy")},
                    {"daysUntilRemoval", daysUntilRemoval},
                    {"urgency", urgency},
                    {"watchNowUrl", $"/watch/{item.ContentId}"},
                    {"findAlternativesUrl", $"/search?q={Uri.EscapeDataString(item.Title)}"}
                }
            };

            await _notificationEngine.SendNotificationAsync(request);
            _logger.LogInformation("Leaving platform notification sent for user {UserId}, item {ItemId}, leaving in {Days} days", userId, item.Id, daysUntilRemoval);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending leaving platform notification for user {UserId}, item {ItemId}", userId, item.Id);
        }
    }

    public async Task NotifyRegionalAvailabilityChangeAsync(Guid userId, WatchlistItemDto item, List<RegionalAvailabilityChangeDto> changes)
    {
        try
        {
            var canSend = await _preferencesService.CanSendNotificationAsync(userId, "regional_changes", new List<string> { "email", "push" });
            if (!canSend) return;

            var newRegions = changes.Where(c => c.ChangeType == "added").ToList();
            var removedRegions = changes.Where(c => c.ChangeType == "removed").ToList();

            var message = "";
            if (newRegions.Any() && removedRegions.Any())
            {
                message = $"{item.Title} availability updated in {newRegions.Count + removedRegions.Count} regions";
            }
            else if (newRegions.Any())
            {
                message = $"{item.Title} is now available in {newRegions.Count} new region{(newRegions.Count == 1 ? "" : "s")}";
            }
            else if (removedRegions.Any())
            {
                message = $"{item.Title} is no longer available in {removedRegions.Count} region{(removedRegions.Count == 1 ? "" : "s")}";
            }

            var request = new NotificationRequest
            {
                UserId = userId,
                Type = "regional_changes",
                Priority = "low",
                Title = "Regional Availability Update",
                Message = message,
                Channels = new List<string> { "email", "push" },
                Data = new Dictionary<string, object>
                {
                    {"itemTitle", item.Title},
                    {"itemPoster", item.PosterUrl ?? ""},
                    {"changes", changes},
                    {"newRegions", newRegions},
                    {"removedRegions", removedRegions},
                    {"viewDetailsUrl", $"/content/{item.ContentId}/availability"}
                }
            };

            await _notificationEngine.SendNotificationAsync(request);
            _logger.LogInformation("Regional availability change notification sent for user {UserId}, item {ItemId}, {ChangeCount} changes", userId, item.Id, changes.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending regional availability change notification for user {UserId}, item {ItemId}", userId, item.Id);
        }
    }

    public async Task SendWeeklyDigestAsync(Guid userId)
    {
        try
        {
            var canSend = await _preferencesService.CanSendNotificationAsync(userId, "weekly_digest", new List<string> { "email" });
            if (!canSend) return;

            // Get weekly activity data
            using var context = _contextFactory.CreateDbContext();
            var weekAgo = DateTime.UtcNow.AddDays(-7);

            var watchlistActivity = await context.WatchlistItems
                .Include(wi => wi.Watchlist)
                .Where(wi => wi.Watchlist.UserId == userId && wi.UpdatedAt >= weekAgo)
                .OrderByDescending(wi => wi.UpdatedAt)
                .Take(10)
                .ToListAsync();

            var availabilityChanges = await context.WatchlistItemAvailabilities
                .Include(wa => wa.WatchlistItem)
                    .ThenInclude(wi => wi.Watchlist)
                .Where(wa => wa.WatchlistItem.Watchlist.UserId == userId && wa.CreatedAt >= weekAgo)
                .OrderByDescending(wa => wa.CreatedAt)
                .Take(10)
                .ToListAsync();

            if (!watchlistActivity.Any() && !availabilityChanges.Any())
            {
                _logger.LogDebug("No weekly activity for user {UserId}, skipping digest", userId);
                return;
            }

            var request = new NotificationRequest
            {
                UserId = userId,
                Type = "weekly_digest",
                Priority = "low",
                Title = "Your Weekly Watchlist Update",
                Message = $"Here's what happened with your watchlist this week",
                Channels = new List<string> { "email" },
                Data = new Dictionary<string, object>
                {
                    {"weekStartDate", weekAgo.ToString("MMMM dd, yyyy")},
                    {"weekEndDate", DateTime.UtcNow.ToString("MMMM dd, yyyy")},
                    {"watchlistActivity", watchlistActivity.Take(5).Select(MapToItemDto).ToList()},
                    {"availabilityChanges", availabilityChanges.Take(5).ToList()},
                    {"totalActivityCount", watchlistActivity.Count + availabilityChanges.Count},
                    {"viewWatchlistUrl", "/watchlist"}
                }
            };

            await _notificationEngine.SendNotificationAsync(request);
            _logger.LogInformation("Weekly digest sent for user {UserId}", userId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending weekly digest for user {UserId}", userId);
        }
    }

    public async Task SendMonthlyDigestAsync(Guid userId)
    {
        try
        {
            var canSend = await _preferencesService.CanSendNotificationAsync(userId, "monthly_digest", new List<string> { "email" });
            if (!canSend) return;

            // Get monthly statistics
            using var context = _contextFactory.CreateDbContext();
            var monthAgo = DateTime.UtcNow.AddDays(-30);

            var stats = await GetMonthlyStatsAsync(context, userId, monthAgo);

            var request = new NotificationRequest
            {
                UserId = userId,
                Type = "monthly_digest",
                Priority = "low",
                Title = "Your Monthly Watchlist Summary",
                Message = "Here's your watchlist activity from the past month",
                Channels = new List<string> { "email" },
                Data = new Dictionary<string, object>
                {
                    {"monthStartDate", monthAgo.ToString("MMMM dd, yyyy")},
                    {"monthEndDate", DateTime.UtcNow.ToString("MMMM dd, yyyy")},
                    {"stats", stats},
                    {"viewWatchlistUrl", "/watchlist"},
                    {"viewStatsUrl", "/profile/stats"}
                }
            };

            await _notificationEngine.SendNotificationAsync(request);
            _logger.LogInformation("Monthly digest sent for user {UserId}", userId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending monthly digest for user {UserId}", userId);
        }
    }

    public async Task ProcessPendingDigestNotificationsAsync()
    {
        try
        {
            using var context = _contextFactory.CreateDbContext();

            // Process weekly digests
            var usersForWeeklyDigest = await context.WatchlistNotificationSettings
                .Where(s => s.WeeklyDigest && s.User.IsActive)
                .Select(s => s.UserId)
                .ToListAsync();

            var weeklyTasks = usersForWeeklyDigest.Select(SendWeeklyDigestAsync);
            await Task.WhenAll(weeklyTasks);

            // Process monthly digests (only on 1st of month)
            if (DateTime.UtcNow.Day == 1)
            {
                var usersForMonthlyDigest = await context.WatchlistNotificationSettings
                    .Where(s => s.MonthlyDigest && s.User.IsActive)
                    .Select(s => s.UserId)
                    .ToListAsync();

                var monthlyTasks = usersForMonthlyDigest.Select(SendMonthlyDigestAsync);
                await Task.WhenAll(monthlyTasks);
            }

            _logger.LogInformation("Processed digest notifications for {WeeklyCount} weekly and {MonthlyCount} monthly recipients",
                usersForWeeklyDigest.Count, DateTime.UtcNow.Day == 1 ? "processed" : "skipped");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing pending digest notifications");
        }
    }

    public async Task NotifyContentExpiringAsync(Guid userId, List<ContentExpirationDto> expiringContent)
    {
        try
        {
            var canSend = await _preferencesService.CanSendNotificationAsync(userId, "content_expiring", new List<string> { "email", "push" });
            if (!canSend) return;

            var criticalContent = expiringContent.Where(c => c.DaysUntilExpiry <= 3).ToList();
            var urgentContent = expiringContent.Where(c => c.DaysUntilExpiry > 3 && c.DaysUntilExpiry <= 7).ToList();

            var priority = criticalContent.Any() ? "critical" : urgentContent.Any() ? "high" : "medium";
            var count = expiringContent.Count;

            // FIXED: Week 1 Day 3 - Use FirstOrDefault to prevent exceptions
            var firstExpiring = expiringContent.FirstOrDefault();

            var request = new NotificationRequest
            {
                UserId = userId,
                Type = "content_expiring",
                Priority = priority,
                Title = count == 1 ? "Content Expiring Soon" : $"{count} Items Expiring Soon",
                Message = count == 1 && firstExpiring != null ?
                    $"{firstExpiring.Title} is leaving {firstExpiring.ServiceName} in {firstExpiring.DaysUntilExpiry} days" :
                    $"{count} items from your watchlist are expiring soon",
                Channels = new List<string> { "email", "push" },
                Data = new Dictionary<string, object>
                {
                    {"expiringContent", expiringContent},
                    {"criticalContent", criticalContent},
                    {"urgentContent", urgentContent},
                    {"totalCount", count},
                    {"viewWatchlistUrl", "/watchlist?filter=expiring"}
                }
            };

            await _notificationEngine.SendNotificationAsync(request);
            _logger.LogInformation("Content expiring notification sent for user {UserId}, {Count} items", userId, count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending content expiring notification for user {UserId}", userId);
        }
    }

    public async Task SendPersonalizedRecommendationDigestAsync(Guid userId, List<WatchlistItemDto> recommendations, string digestType)
    {
        try
        {
            var canSend = await _preferencesService.CanSendNotificationAsync(userId, "recommendation_digest", new List<string> { "email" });
            if (!canSend) return;

            var request = new NotificationRequest
            {
                UserId = userId,
                Type = "recommendation_digest",
                Priority = "low",
                Title = $"Your {digestType.Replace("_", " ").ToTitleCase()} Recommendations",
                Message = $"We found {recommendations.Count} new recommendations based on your preferences",
                Channels = new List<string> { "email" },
                Data = new Dictionary<string, object>
                {
                    {"digestType", digestType},
                    {"recommendations", recommendations.Take(10).ToList()},
                    {"totalCount", recommendations.Count},
                    {"viewRecommendationsUrl", "/recommendations"}
                }
            };

            await _notificationEngine.SendNotificationAsync(request);
            _logger.LogInformation("Personalized recommendation digest sent for user {UserId}, type {DigestType}, {Count} recommendations", userId, digestType, recommendations.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending personalized recommendation digest for user {UserId}, type {DigestType}", userId, digestType);
        }
    }

    public async Task NotifyPriceDropsAsync(Guid userId, List<PriceDropDto> priceDrops)
    {
        try
        {
            var canSend = await _preferencesService.CanSendNotificationAsync(userId, "price_drop", new List<string> { "email", "push" });
            if (!canSend) return;

            var totalSavings = priceDrops.Sum(p => p.OldPrice - p.NewPrice);
            var count = priceDrops.Count;

            // FIXED: Week 1 Day 3 - Use FirstOrDefault to prevent exceptions
            var firstDrop = priceDrops.FirstOrDefault();

            var request = new NotificationRequest
            {
                UserId = userId,
                Type = "price_drop",
                Priority = "medium",
                Title = count == 1 ? "Price Drop Alert!" : $"{count} Price Drops Found!",
                Message = count == 1 && firstDrop != null ?
                    $"{firstDrop.Title} price dropped to ${firstDrop.NewPrice:F2}" :
                    $"Save ${totalSavings:F2} on {count} items from your watchlist",
                Channels = new List<string> { "email", "push" },
                Data = new Dictionary<string, object>
                {
                    {"priceDrops", priceDrops},
                    {"totalSavings", totalSavings},
                    {"totalCount", count},
                    {"currency", "USD"},
                    {"viewDealsUrl", "/deals"}
                }
            };

            await _notificationEngine.SendNotificationAsync(request);
            _logger.LogInformation("Price drops notification sent for user {UserId}, {Count} items, ${Savings:F2} total savings", userId, count, totalSavings);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending price drops notification for user {UserId}", userId);
        }
    }

    public async Task FlushPendingNotificationsAsync(Guid userId)
    {
        try
        {
            // This method is for testing - flush any pending aggregated notifications immediately
            _logger.LogInformation("Flushing pending notifications for user {UserId}", userId);
            
            // In a real implementation, this would process any batched/queued notifications
            // For now, we'll just log that the flush was requested
            await Task.CompletedTask;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error flushing notifications for user {UserId}", userId);
        }
    }

    private async Task<object> GetMonthlyStatsAsync(ApplicationDbContext context, Guid userId, DateTime monthAgo)
    {
        var watchlistItems = await context.WatchlistItems
            .Include(wi => wi.Watchlist)
            .Where(wi => wi.Watchlist.UserId == userId)
            .ToListAsync();

        // ✅ PERFORMANCE: Use Count(predicate) instead of Where().Count() for better efficiency
        var itemsAdded = watchlistItems.Count(wi => wi.AddedAt >= monthAgo);
        var itemsWatched = watchlistItems.Count(wi => wi.IsWatched && wi.WatchedAt >= monthAgo);
        var totalItems = watchlistItems.Count;
        var totalRuntime = watchlistItems.Where(wi => wi.IsWatched && wi.Runtime.HasValue).Sum(wi => wi.Runtime.Value);

        return new
        {
            itemsAdded,
            itemsWatched,
            totalItems,
            totalRuntimeMinutes = totalRuntime,
            totalRuntimeHours = Math.Round(totalRuntime / 60.0, 1),
            watchedPercentage = totalItems > 0 ? Math.Round((double)itemsWatched / totalItems * 100, 1) : 0
        };
    }

    private WatchlistItemDto MapToItemDto(WatchlistItem item)
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
            Status = item.Status ?? "",
            Priority = item.Priority,
            IsWatched = item.IsWatched,
            WatchedAt = item.WatchedAt,
            UserRating = item.UserRating,
            UserNotes = item.UserNotes,
            AddedAt = item.AddedAt,
            UpdatedAt = item.UpdatedAt,
            IsCurrentlyAvailable = item.IsCurrentlyAvailable,
            LastAvailabilityCheck = item.LastAvailabilityCheck
        };
    }
}

// Extension method for title case
public static class StringExtensions
{
    public static string ToTitleCase(this string input)
    {
        if (string.IsNullOrEmpty(input))
            return string.Empty;

        // Replace underscores with spaces and convert to title case
        var processed = input.Replace("_", " ").ToLower();
        return System.Globalization.CultureInfo.CurrentCulture.TextInfo.ToTitleCase(processed);
    }
}

// DTOs moved to GeoLeap.Api.Models.NotificationDtos to avoid namespace conflicts