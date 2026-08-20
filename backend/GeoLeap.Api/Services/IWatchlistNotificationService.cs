using GeoLeap.Api.Models;
using GeoLeap.Api.Data;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service for managing watchlist notifications - US-8.2 Enhanced
/// </summary>
public interface IWatchlistNotificationService
{
    // Existing methods
    Task NotifyAvailabilityChangeAsync(Guid userId, WatchlistItemDto item, List<WatchlistItemAvailabilityDto> newAvailability);
    Task NotifyAvailabilityChangeAsync(Guid userId, WatchlistItemDto item, List<WatchlistItemAvailabilityDto> newAvailability, string language, string correlationId);
    Task NotifyWatchlistSharedAsync(Guid userId, WatchlistDetailDto watchlist, WatchlistShareDto share);
    Task NotifyNewRecommendationAsync(Guid userId, List<WatchlistItemDto> recommendations);
    Task NotifyPriceDropAsync(Guid userId, WatchlistItemDto item, decimal oldPrice, decimal newPrice, string service);
    Task NotifyNewReleaseAsync(Guid userId, WatchlistItemDto item);
    Task SendBulkNotificationAsync(List<Guid> userIds, string subject, string message, string type = "info");
    
    // US-8.2 Extensions: Advanced Availability Notifications
    Task NotifyLeavingPlatformAsync(Guid userId, WatchlistItemDto item, string serviceName, DateTime leavingDate, int daysUntilRemoval);
    Task NotifyRegionalAvailabilityChangeAsync(Guid userId, WatchlistItemDto item, List<RegionalAvailabilityChangeDto> changes);
    Task SendWeeklyDigestAsync(Guid userId);
    Task SendMonthlyDigestAsync(Guid userId);
    Task ProcessPendingDigestNotificationsAsync();
    Task NotifyContentExpiringAsync(Guid userId, List<ContentExpirationDto> expiringContent);
    Task SendPersonalizedRecommendationDigestAsync(Guid userId, List<WatchlistItemDto> recommendations, string digestType);
    Task NotifyPriceDropsAsync(Guid userId, List<PriceDropDto> priceDrops);
    
    // Testing support method
    Task FlushPendingNotificationsAsync(Guid userId);
}
