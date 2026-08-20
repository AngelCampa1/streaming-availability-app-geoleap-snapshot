using GeoLeap.Api.Models;
using GeoLeap.Api.Data;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service for tracking and updating watchlist item availability
/// </summary>
public interface IWatchlistAvailabilityService
{
    Task CheckItemAvailabilityAsync(Guid itemId);
    Task CheckUserWatchlistAvailabilityAsync(Guid userId);
    Task CheckAllWatchlistsAvailabilityAsync(CancellationToken cancellationToken = default);
    Task UpdateItemAvailabilityAsync(Guid itemId, List<WatchlistItemAvailabilityDto> newAvailability);
    Task<List<WatchlistItemAvailabilityDto>> GetCurrentAvailabilityAsync(string contentType, string contentId, string? countryCode = null);
}

/// <summary>
/// Implementation of watchlist availability service
/// </summary>
public class WatchlistAvailabilityService : IWatchlistAvailabilityService
{
    private readonly ApplicationDbContext _context;
    private readonly IStreamingAvailabilityClient _streamingClient;
    private readonly IWatchlistNotificationService _notificationService;
    private readonly ILogger<WatchlistAvailabilityService> _logger;
    private readonly IDistributedCache _cache;

    public WatchlistAvailabilityService(
        ApplicationDbContext context,
        IStreamingAvailabilityClient streamingClient,
        IWatchlistNotificationService notificationService,
        ILogger<WatchlistAvailabilityService> logger,
        IDistributedCache cache)
    {
        _context = context;
        _streamingClient = streamingClient;
        _notificationService = notificationService;
        _logger = logger;
        _cache = cache;
    }

    public async Task CheckItemAvailabilityAsync(Guid itemId)
    {
        try
        {
            var item = await _context.WatchlistItems
                .Include(i => i.Watchlist)
                    .ThenInclude(w => w.User)
                .Include(i => i.AvailabilityHistory)
                .FirstOrDefaultAsync(i => i.Id == itemId);

            if (item == null) return;

            // Get user's region preferences or default to US
            var userRegion = await _context.UserRegionPreferences
                .Where(r => r.UserId == item.Watchlist.UserId)
                .Select(r => r.CountryCode)
                .FirstOrDefaultAsync() ?? "US";

            var newAvailability = await GetCurrentAvailabilityAsync(item.ContentType, item.ContentId, userRegion);
            
            // Compare with current availability
            var currentAvailability = item.AvailabilityHistory
                .Where(h => h.IsActive)
                .ToList();

            var hasChanges = await CompareAndUpdateAvailabilityAsync(item, currentAvailability, newAvailability);

            if (hasChanges)
            {
                // Notify user of changes
                var itemDto = MapToItemDto(item);
                await _notificationService.NotifyAvailabilityChangeAsync(
                    item.Watchlist.UserId, 
                    itemDto, 
                    newAvailability);
            }

            // Update last check time
            item.LastAvailabilityCheck = DateTime.UtcNow;
            item.IsCurrentlyAvailable = newAvailability.Any(a => a.IsActive);
            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking availability for item {ItemId}", itemId);
        }
    }

    public async Task CheckUserWatchlistAvailabilityAsync(Guid userId)
    {
        try
        {
            var items = await _context.WatchlistItems
                .Include(i => i.Watchlist)
                .Where(i => i.Watchlist.UserId == userId && 
                    (!i.LastAvailabilityCheck.HasValue || 
                     i.LastAvailabilityCheck.Value < DateTime.UtcNow.AddHours(-6)))
                .ToListAsync();

            var tasks = items.Select(item => CheckItemAvailabilityAsync(item.Id));
            await Task.WhenAll(tasks);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking availability for user {UserId}", userId);
        }
    }

    public async Task CheckAllWatchlistsAvailabilityAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var batchSize = 100;
            var processed = 0;

            // BUG FIX: Add cancellation token support to infinite while loop
            while (!cancellationToken.IsCancellationRequested)
            {
                var items = await _context.WatchlistItems
                    .Include(i => i.Watchlist)
                    .Where(i => !i.LastAvailabilityCheck.HasValue || 
                        i.LastAvailabilityCheck.Value < DateTime.UtcNow.AddDays(-1))
                    .OrderBy(i => i.LastAvailabilityCheck ?? DateTime.MinValue)
                    .Skip(processed)
                    .Take(batchSize)
                    .ToListAsync(cancellationToken);

                if (!items.Any()) break;

                var tasks = items.Select(item => CheckItemAvailabilityAsync(item.Id));
                await Task.WhenAll(tasks);

                processed += items.Count;
                
                // Add delay to avoid rate limiting
                await Task.Delay(TimeSpan.FromSeconds(1));
            }

            _logger.LogInformation("Completed availability check for {ProcessedCount} items", processed);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during bulk availability check");
        }
    }

    public async Task UpdateItemAvailabilityAsync(Guid itemId, List<WatchlistItemAvailabilityDto> newAvailability)
    {
        try
        {
            var item = await _context.WatchlistItems
                .Include(i => i.AvailabilityHistory)
                .FirstOrDefaultAsync(i => i.Id == itemId);

            if (item == null) return;

            // Deactivate current availability records
            foreach (var existing in item.AvailabilityHistory.Where(h => h.IsActive))
            {
                existing.IsActive = false;
                existing.UpdatedAt = DateTime.UtcNow;
            }

            // Add new availability records
            foreach (var availability in newAvailability)
            {
                var record = new WatchlistItemAvailability
                {
                    WatchlistItemId = itemId,
                    ServiceName = availability.ServiceName,
                    CountryCode = availability.CountryCode,
                    AvailabilityType = availability.AvailabilityType,
                    Price = availability.Price,
                    Currency = availability.Currency,
                    StreamingUrl = availability.StreamingUrl,
                    AvailableFrom = availability.AvailableFrom,
                    AvailableUntil = availability.AvailableUntil,
                    IsActive = availability.IsActive
                };

                _context.WatchlistItemAvailabilities.Add(record);
            }

            item.IsCurrentlyAvailable = newAvailability.Any(a => a.IsActive);
            item.LastAvailabilityCheck = DateTime.UtcNow;
            item.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Clear cache
            await _cache.RemoveAsync($"availability:{item.ContentType}:{item.ContentId}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating availability for item {ItemId}", itemId);
            throw;
        }
    }

    public async Task<List<WatchlistItemAvailabilityDto>> GetCurrentAvailabilityAsync(string contentType, string contentId, string? countryCode = null)
    {
        try
        {
            var cacheKey = $"availability:{contentType}:{contentId}:{countryCode ?? "US"}";
            var cachedData = await _cache.GetStringAsync(cacheKey);
            
            if (!string.IsNullOrEmpty(cachedData))
            {
                var cached = JsonSerializer.Deserialize<List<WatchlistItemAvailabilityDto>>(cachedData);
                if (cached != null) return cached;
            }

            // Call streaming availability API 
            // Convert string contentType to enum
            var contentTypeEnum = contentType.ToLower() == "movie" ? ContentType.Movie : ContentType.TvSeries;
            var availability = await _streamingClient.GetAvailabilityAsync(contentId, contentTypeEnum);
            
            var result = new List<WatchlistItemAvailabilityDto>();
            
            if (availability?.StreamingOptions != null)
            {
                foreach (var option in availability.StreamingOptions)
                {
                    result.Add(new WatchlistItemAvailabilityDto
                    {
                        ServiceName = option.ServiceName ?? "Unknown",
                        CountryCode = countryCode ?? "US",
                        AvailabilityType = option.Type.ToString(),
                        Price = option.Price,
                        Currency = option.Currency,
                        StreamingUrl = option.StreamingUrl,
                        AvailableFrom = DateTime.UtcNow,
                        AvailableUntil = option.ExpiresAt,
                        IsActive = true
                    });
                }
            }

            // Cache for 1 hour
            var cacheOptions = new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromHours(1)
            };
            await _cache.SetStringAsync(cacheKey, JsonSerializer.Serialize(result), cacheOptions);

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting availability for {ContentType} {ContentId}", contentType, contentId);
            return new List<WatchlistItemAvailabilityDto>();
        }
    }

    private async Task<bool> CompareAndUpdateAvailabilityAsync(
        WatchlistItem item, 
        List<WatchlistItemAvailability> current, 
        List<WatchlistItemAvailabilityDto> newAvailability)
    {
        var hasChanges = false;

        // Check for new services
        var currentServices = current.Select(c => c.ServiceName).ToHashSet();
        var newServices = newAvailability.Select(n => n.ServiceName).ToHashSet();

        if (!currentServices.SetEquals(newServices))
        {
            hasChanges = true;
            await UpdateItemAvailabilityAsync(item.Id, newAvailability);
        }
        else
        {
            // Check for price changes
            foreach (var newItem in newAvailability)
            {
                var existingItem = current.FirstOrDefault(c => c.ServiceName == newItem.ServiceName);
                if (existingItem != null && existingItem.Price != newItem.Price)
                {
                    if (existingItem.Price.HasValue && newItem.Price.HasValue && 
                        newItem.Price < existingItem.Price)
                    {
                        // Price drop detected
                        var itemDto = MapToItemDto(item);
                        await _notificationService.NotifyPriceDropAsync(
                            item.Watchlist.UserId,
                            itemDto,
                            existingItem.Price.Value,
                            newItem.Price.Value,
                            newItem.ServiceName);
                    }
                    hasChanges = true;
                }
            }

            if (hasChanges)
            {
                await UpdateItemAvailabilityAsync(item.Id, newAvailability);
            }
        }

        return hasChanges;
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