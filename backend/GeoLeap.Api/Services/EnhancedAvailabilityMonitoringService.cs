using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace GeoLeap.Api.Services;

/// <summary>
/// Enhanced availability monitoring service with advanced features for US-8.2
/// </summary>
public class EnhancedAvailabilityMonitoringService : IWatchlistAvailabilityService
{
    private readonly ApplicationDbContext _context;
    private readonly IStreamingAvailabilityClient _streamingClient;
    private readonly IWatchlistNotificationService _notificationService;
    private readonly ILogger<EnhancedAvailabilityMonitoringService> _logger;
    private readonly IDistributedCache _cache;
    private readonly INotificationEngine _notificationEngine;
    private readonly AvailabilityMonitoringOptions _options;

    public EnhancedAvailabilityMonitoringService(
        ApplicationDbContext context,
        IStreamingAvailabilityClient streamingClient,
        IWatchlistNotificationService notificationService,
        ILogger<EnhancedAvailabilityMonitoringService> logger,
        IDistributedCache cache,
        INotificationEngine notificationEngine,
        IOptions<AvailabilityMonitoringOptions> options)
    {
        _context = context;
        _streamingClient = streamingClient;
        _notificationService = notificationService;
        _logger = logger;
        _cache = cache;
        _notificationEngine = notificationEngine;
        _options = options.Value;
    }

    public async Task CheckItemAvailabilityAsync(Guid itemId)
    {
        try
        {
            var correlationId = Guid.NewGuid().ToString();
            _logger.LogInformation("Starting availability check for item {ItemId} with correlation {CorrelationId}", itemId, correlationId);

            var item = await _context.WatchlistItems
                .Include(i => i.Watchlist)
                    .ThenInclude(w => w.User)
                .Include(i => i.AvailabilityHistory.Where(h => h.IsActive))
                .FirstOrDefaultAsync(i => i.Id == itemId);

            if (item == null)
            {
                _logger.LogWarning("Item {ItemId} not found during availability check", itemId);
                return;
            }

            // Check if user has availability monitoring enabled
            var userSettings = await GetUserNotificationSettingsAsync(item.Watchlist.UserId);
            if (!userSettings.NotifyOnAvailabilityChange)
            {
                _logger.LogDebug("User {UserId} has availability notifications disabled, skipping check", item.Watchlist.UserId);
                return;
            }

            // Get user's region preferences
            var userRegion = await GetUserRegionAsync(item.Watchlist.UserId);
            var newAvailability = await GetCurrentAvailabilityAsync(item.ContentType, item.ContentId, userRegion);
            
            // Compare with current availability and detect changes
            var currentAvailability = item.AvailabilityHistory.Where(h => h.IsActive).ToList();
            var changes = await AnalyzeAvailabilityChangesAsync(item, currentAvailability, newAvailability, correlationId);

            if (changes.HasChanges)
            {
                await ProcessAvailabilityChangesAsync(item, changes, newAvailability, correlationId);
            }

            // Update tracking information
            await UpdateItemTrackingInfoAsync(item, newAvailability);

            _logger.LogInformation("Completed availability check for item {ItemId}, changes detected: {HasChanges}", itemId, changes.HasChanges);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking availability for item {ItemId}", itemId);
            
            // Record the error for monitoring
            await RecordMonitoringErrorAsync(itemId, ex);
        }
    }

    public async Task CheckUserWatchlistAvailabilityAsync(Guid userId)
    {
        try
        {
            var correlationId = Guid.NewGuid().ToString();
            _logger.LogInformation("Starting user watchlist availability check for user {UserId} with correlation {CorrelationId}", userId, correlationId);

            // Get user's notification settings to avoid unnecessary work
            var userSettings = await GetUserNotificationSettingsAsync(userId);
            if (!userSettings.NotifyOnAvailabilityChange)
            {
                _logger.LogDebug("User {UserId} has availability notifications disabled, skipping user check", userId);
                return;
            }

            var staleThreshold = DateTime.UtcNow.AddHours(-_options.StaleCheckHours);
            
            var items = await _context.WatchlistItems
                .Include(i => i.Watchlist)
                .Where(i => i.Watchlist.UserId == userId && 
                    i.Watchlist.User.IsActive &&
                    (!i.LastAvailabilityCheck.HasValue || i.LastAvailabilityCheck.Value < staleThreshold))
                .OrderBy(i => i.LastAvailabilityCheck ?? DateTime.MinValue)
                .Take(_options.MaxItemsPerUserCheck)
                .ToListAsync();

            if (!items.Any())
            {
                _logger.LogDebug("No stale items found for user {UserId}", userId);
                return;
            }

            // Process items with rate limiting
            var semaphore = new SemaphoreSlim(_options.ConcurrentItemChecks, _options.ConcurrentItemChecks);
            var tasks = items.Select(async item =>
            {
                await semaphore.WaitAsync();
                try
                {
                    await CheckItemAvailabilityAsync(item.Id);
                    await Task.Delay(_options.ItemCheckDelayMs); // Rate limiting
                }
                finally
                {
                    semaphore.Release();
                }
            });

            await Task.WhenAll(tasks);

            _logger.LogInformation("Completed user watchlist availability check for user {UserId}, processed {ItemCount} items", userId, items.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking user watchlist availability for user {UserId}", userId);
        }
    }

    public async Task CheckAllWatchlistsAvailabilityAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var correlationId = Guid.NewGuid().ToString();
            _logger.LogInformation("Starting global availability check with correlation {CorrelationId}", correlationId);

            var batchSize = _options.GlobalCheckBatchSize;
            var processed = 0;
            var staleThreshold = DateTime.UtcNow.AddDays(-_options.StaleCheckDays);

            var totalItems = await _context.WatchlistItems
                .Include(i => i.Watchlist)
                .CountAsync(i => i.Watchlist.User.IsActive &&
                    (!i.LastAvailabilityCheck.HasValue || i.LastAvailabilityCheck.Value < staleThreshold));

            _logger.LogInformation("Found {TotalItems} items requiring availability check", totalItems);

            while (processed < totalItems)
            {
                var items = await _context.WatchlistItems
                    .Include(i => i.Watchlist)
                        .ThenInclude(w => w.User)
                    .Where(i => i.Watchlist.User.IsActive &&
                        (!i.LastAvailabilityCheck.HasValue || i.LastAvailabilityCheck.Value < staleThreshold))
                    .OrderBy(i => i.LastAvailabilityCheck ?? DateTime.MinValue)
                    .Skip(processed)
                    .Take(batchSize)
                    .ToListAsync();

                if (!items.Any()) break;

                // Group by user to respect user notification preferences
                var userGroups = items.GroupBy(i => i.Watchlist.UserId);
                
                var userTasks = userGroups.Select(async userGroup =>
                {
                    var userId = userGroup.Key;
                    var userSettings = await GetUserNotificationSettingsAsync(userId);
                    
                    if (userSettings.NotifyOnAvailabilityChange)
                    {
                        var itemTasks = userGroup.Select(item => CheckItemAvailabilityAsync(item.Id));
                        await Task.WhenAll(itemTasks);
                    }
                });

                await Task.WhenAll(userTasks);

                processed += items.Count;
                
                // Add delay between batches to avoid overwhelming external APIs
                if (processed < totalItems)
                {
                    await Task.Delay(_options.BatchDelayMs);
                }

                _logger.LogInformation("Processed {ProcessedCount}/{TotalCount} items in global availability check", processed, totalItems);
            }

            // Record successful completion metrics
            await RecordMonitoringMetricsAsync("global_check", processed, correlationId);

            _logger.LogInformation("Completed global availability check, processed {ProcessedCount} items", processed);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during global availability check");
            throw;
        }
    }

    public async Task UpdateItemAvailabilityAsync(Guid itemId, List<WatchlistItemAvailabilityDto> newAvailability)
    {
        try
        {
            var item = await _context.WatchlistItems
                .Include(i => i.AvailabilityHistory)
                .FirstOrDefaultAsync(i => i.Id == itemId);

            if (item == null)
            {
                _logger.LogWarning("Item {ItemId} not found for availability update", itemId);
                return;
            }

            // Archive current availability records
            var activeRecords = item.AvailabilityHistory.Where(h => h.IsActive).ToList();
            foreach (var record in activeRecords)
            {
                record.IsActive = false;
                record.UpdatedAt = DateTime.UtcNow;
            }

            // Add new availability records
            foreach (var availability in newAvailability.Where(a => a.IsActive))
            {
                var record = new WatchlistItemAvailability
                {
                    Id = Guid.NewGuid(),
                    WatchlistItemId = itemId,
                    ServiceName = availability.ServiceName,
                    CountryCode = availability.CountryCode,
                    AvailabilityType = availability.AvailabilityType,
                    Price = availability.Price,
                    Currency = availability.Currency,
                    StreamingUrl = availability.StreamingUrl,
                    AvailableFrom = availability.AvailableFrom,
                    AvailableUntil = availability.AvailableUntil,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };

                _context.WatchlistItemAvailabilities.Add(record);
            }

            // Update item status
            item.IsCurrentlyAvailable = newAvailability.Any(a => a.IsActive);
            item.LastAvailabilityCheck = DateTime.UtcNow;
            item.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Clear relevant caches
            await InvalidateCacheAsync(item.ContentType, item.ContentId);

            _logger.LogInformation("Updated availability for item {ItemId}, currently available: {IsAvailable}", itemId, item.IsCurrentlyAvailable);
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
            var cacheKey = $"availability:v2:{contentType}:{contentId}:{countryCode ?? "US"}";
            var cachedData = await _cache.GetStringAsync(cacheKey);
            
            if (!string.IsNullOrEmpty(cachedData))
            {
                var cached = JsonSerializer.Deserialize<List<WatchlistItemAvailabilityDto>>(cachedData);
                if (cached != null)
                {
                    _logger.LogDebug("Retrieved availability from cache for {ContentType} {ContentId}", contentType, contentId);
                    return cached;
                }
            }

            // Call streaming availability API with retry logic
            var availability = await CallStreamingApiWithRetryAsync(contentId, contentType, countryCode);
            var result = MapToAvailabilityDtos(availability, countryCode ?? "US");

            // Cache with intelligent expiration based on availability status
            var cacheExpiration = result.Any(a => a.IsActive) ? 
                TimeSpan.FromHours(_options.ActiveContentCacheHours) : 
                TimeSpan.FromHours(_options.InactiveContentCacheHours);

            var cacheOptions = new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = cacheExpiration
            };

            await _cache.SetStringAsync(cacheKey, JsonSerializer.Serialize(result), cacheOptions);

            _logger.LogInformation("Retrieved availability from API for {ContentType} {ContentId}, found {AvailabilityCount} services", contentType, contentId, result.Count);
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting availability for {ContentType} {ContentId}", contentType, contentId);
            return new List<WatchlistItemAvailabilityDto>();
        }
    }

    private async Task<StreamingAvailabilityResponse?> CallStreamingApiWithRetryAsync(string contentId, string contentType, string? countryCode)
    {
        var contentTypeEnum = contentType.ToLower() == "movie" ? ContentType.Movie : ContentType.TvSeries;
        var maxRetries = _options.ApiRetryAttempts;
        var baseDelayMs = _options.ApiRetryBaseDelayMs;

        for (int attempt = 0; attempt <= maxRetries; attempt++)
        {
            try
            {
                return await _streamingClient.GetAvailabilityAsync(contentId, contentTypeEnum);
            }
            catch (Exception ex) when (attempt < maxRetries)
            {
                var delayMs = baseDelayMs * Math.Pow(2, attempt); // Exponential backoff
                _logger.LogWarning(ex, "API call failed (attempt {Attempt}/{MaxAttempts}), retrying in {DelayMs}ms", attempt + 1, maxRetries + 1, delayMs);
                await Task.Delay(TimeSpan.FromMilliseconds(delayMs));
            }
        }

        throw new InvalidOperationException($"Failed to get availability after {maxRetries + 1} attempts");
    }

    private List<WatchlistItemAvailabilityDto> MapToAvailabilityDtos(StreamingAvailabilityResponse? response, string countryCode)
    {
        if (response?.StreamingOptions == null)
            return new List<WatchlistItemAvailabilityDto>();

        return response.StreamingOptions.Select(option => new WatchlistItemAvailabilityDto
        {
            ServiceName = option.ServiceName ?? "Unknown",
            CountryCode = countryCode,
            AvailabilityType = option.Type.ToString(),
            Price = option.Price,
            Currency = option.Currency,
            StreamingUrl = option.StreamingUrl,
            AvailableFrom = DateTime.UtcNow,
            AvailableUntil = option.ExpiresAt,
            IsActive = !option.ExpiresAt.HasValue || option.ExpiresAt.Value > DateTime.UtcNow
        }).ToList();
    }

    private async Task<AvailabilityChangeAnalysis> AnalyzeAvailabilityChangesAsync(
        WatchlistItem item,
        List<WatchlistItemAvailability> currentAvailability,
        List<WatchlistItemAvailabilityDto> newAvailability,
        string correlationId)
    {
        var analysis = new AvailabilityChangeAnalysis();

        var currentServices = currentAvailability.ToDictionary(c => c.ServiceName, c => c);
        var newServices = newAvailability.ToDictionary(n => n.ServiceName, n => n);

        // Detect new services
        analysis.NewServices = newServices.Keys.Except(currentServices.Keys).ToList();
        
        // Detect removed services
        analysis.RemovedServices = currentServices.Keys.Except(newServices.Keys).ToList();

        // Detect price changes
        foreach (var serviceName in currentServices.Keys.Intersect(newServices.Keys))
        {
            var current = currentServices[serviceName];
            var newItem = newServices[serviceName];

            if (current.Price != newItem.Price && current.Price.HasValue && newItem.Price.HasValue)
            {
                analysis.PriceChanges.Add(new AvailabilityPriceChange
                {
                    ServiceName = serviceName,
                    OldPrice = current.Price.Value,
                    NewPrice = newItem.Price.Value,
                    IsPriceDrop = newItem.Price < current.Price
                });
            }
        }

        // Detect expiration changes
        foreach (var serviceName in currentServices.Keys.Intersect(newServices.Keys))
        {
            var current = currentServices[serviceName];
            var newItem = newServices[serviceName];

            if (current.AvailableUntil != newItem.AvailableUntil)
            {
                analysis.ExpirationChanges.Add(new ExpirationChange
                {
                    ServiceName = serviceName,
                    OldExpiration = current.AvailableUntil,
                    NewExpiration = newItem.AvailableUntil
                });
            }
        }

        analysis.HasChanges = analysis.NewServices.Any() || 
                             analysis.RemovedServices.Any() || 
                             analysis.PriceChanges.Any() || 
                             analysis.ExpirationChanges.Any();

        _logger.LogDebug("Analyzed availability changes for item {ItemId}: New={NewCount}, Removed={RemovedCount}, PriceChanges={PriceCount}, ExpirationChanges={ExpirationCount}",
            item.Id, analysis.NewServices.Count, analysis.RemovedServices.Count, analysis.PriceChanges.Count, analysis.ExpirationChanges.Count);

        return analysis;
    }

    private async Task ProcessAvailabilityChangesAsync(WatchlistItem item, AvailabilityChangeAnalysis changes, List<WatchlistItemAvailabilityDto> newAvailabilityDtos, string correlationId)
    {
        var itemDto = MapToItemDto(item);

        // Send availability change notification for new/removed services
        if (changes.NewServices.Any() || changes.RemovedServices.Any())
        {
            await _notificationService.NotifyAvailabilityChangeAsync(item.Watchlist.UserId, itemDto, newAvailabilityDtos, "en", correlationId);
        }

        // Send price drop notifications
        var priceDrops = changes.PriceChanges.Where(pc => pc.IsPriceDrop).ToList();
        foreach (var priceDrop in priceDrops)
        {
            await _notificationService.NotifyPriceDropAsync(
                item.Watchlist.UserId, 
                itemDto, 
                priceDrop.OldPrice, 
                priceDrop.NewPrice, 
                priceDrop.ServiceName);
        }

        // Send expiration notifications for items leaving soon
        var soonExpiring = changes.ExpirationChanges
            .Where(ec => ec.NewExpiration.HasValue && 
                        ec.NewExpiration.Value <= DateTime.UtcNow.AddDays(7) &&
                        (!ec.OldExpiration.HasValue || ec.OldExpiration.Value > DateTime.UtcNow.AddDays(7)))
            .ToList();

        foreach (var expiring in soonExpiring)
        {
            var daysUntilRemoval = (int)(expiring.NewExpiration!.Value - DateTime.UtcNow).TotalDays;
            await _notificationService.NotifyLeavingPlatformAsync(
                item.Watchlist.UserId,
                itemDto,
                expiring.ServiceName,
                expiring.NewExpiration.Value,
                Math.Max(1, daysUntilRemoval));
        }

        // Update the availability records
        await UpdateItemAvailabilityAsync(item.Id, newAvailabilityDtos);
    }

    private async Task UpdateItemTrackingInfoAsync(WatchlistItem item, List<WatchlistItemAvailabilityDto> newAvailability)
    {
        try
        {
            item.LastAvailabilityCheck = DateTime.UtcNow;
            item.IsCurrentlyAvailable = newAvailability.Any(a => a.IsActive);
            item.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            _logger.LogDebug("Successfully updated tracking info for item {ItemId}, LastAvailabilityCheck: {LastCheck}", 
                item.Id, item.LastAvailabilityCheck);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update tracking info for item {ItemId}", item.Id);
            throw;
        }
    }

    private async Task<WatchlistNotificationSettingsDto> GetUserNotificationSettingsAsync(Guid userId)
    {
        var cacheKey = $"user_notification_settings:{userId}";
        var cachedSettings = await _cache.GetStringAsync(cacheKey);

        if (!string.IsNullOrEmpty(cachedSettings))
        {
            var cached = JsonSerializer.Deserialize<WatchlistNotificationSettingsDto>(cachedSettings);
            if (cached != null) return cached;
        }

        var settings = await _context.WatchlistNotificationSettings
            .FirstOrDefaultAsync(s => s.UserId == userId);

        var dto = settings != null ? new WatchlistNotificationSettingsDto
        {
            NotifyOnAvailabilityChange = settings.NotifyOnAvailabilityChange,
            NotifyOnLeavingPlatform = settings.NotifyOnLeavingPlatform,
            NotifyOnContentExpiring = settings.NotifyOnContentExpiring,
            NotifyOnRegionalChanges = settings.NotifyOnRegionalChanges,
            WeeklyDigest = settings.WeeklyDigest,
            MonthlyDigest = settings.MonthlyDigest
        } : new WatchlistNotificationSettingsDto
        {
            NotifyOnAvailabilityChange = true,
            NotifyOnLeavingPlatform = true,
            NotifyOnContentExpiring = true,
            NotifyOnRegionalChanges = false,
            WeeklyDigest = true,
            MonthlyDigest = true
        };

        var cacheOptions = new DistributedCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(30)
        };
        await _cache.SetStringAsync(cacheKey, JsonSerializer.Serialize(dto), cacheOptions);

        return dto;
    }

    private async Task<string> GetUserRegionAsync(Guid userId)
    {
        var userRegion = await _context.UserRegionPreferences
            .Where(r => r.UserId == userId)
            .Select(r => r.CountryCode)
            .FirstOrDefaultAsync();

        return userRegion ?? _options.DefaultRegion;
    }

    private async Task InvalidateCacheAsync(string contentType, string contentId)
    {
        var patterns = new[]
        {
            $"availability:v2:{contentType}:{contentId}:*",
            $"user_notification_settings:*"
        };

        // Note: In a real implementation, you'd want a more sophisticated cache invalidation
        // For now, we'll just log the cache invalidation request
        _logger.LogDebug("Cache invalidation requested for patterns: {Patterns}", string.Join(", ", patterns));
        await Task.CompletedTask;
    }

    private async Task RecordMonitoringErrorAsync(Guid itemId, Exception exception)
    {
        try
        {
            // Record monitoring metrics for error tracking
            await _notificationEngine.SendNotificationAsync(new NotificationRequest
            {
                UserId = Guid.Empty, // System notification
                Type = "system_error",
                Category = "monitoring",
                Priority = "low",
                Title = "Availability Monitoring Error",
                Message = $"Error monitoring item {itemId}: {exception.Message}",
                Channels = new List<string> { "system_log" },
                Metadata = new Dictionary<string, object>
                {
                    {"itemId", itemId.ToString()},
                    {"errorType", exception.GetType().Name},
                    {"errorMessage", exception.Message},
                    {"stackTrace", exception.StackTrace ?? ""}
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to record monitoring error for item {ItemId}", itemId);
        }
    }

    private async Task RecordMonitoringMetricsAsync(string operationType, int itemCount, string correlationId)
    {
        try
        {
            await _notificationEngine.SendNotificationAsync(new NotificationRequest
            {
                UserId = Guid.Empty, // System notification
                Type = "system_metrics",
                Category = "monitoring",
                Priority = "low",
                Title = "Availability Monitoring Metrics",
                Message = $"Completed {operationType} operation for {itemCount} items",
                Channels = new List<string> { "system_metrics" },
                Metadata = new Dictionary<string, object>
                {
                    {"operationType", operationType},
                    {"itemCount", itemCount},
                    {"correlationId", correlationId},
                    {"timestamp", DateTime.UtcNow.ToString("O")}
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to record monitoring metrics for operation {OperationType}", operationType);
        }
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

// Configuration options for availability monitoring
public class AvailabilityMonitoringOptions
{
    public int StaleCheckHours { get; set; } = 6;
    public int StaleCheckDays { get; set; } = 1;
    public int MaxItemsPerUserCheck { get; set; } = 50;
    public int ConcurrentItemChecks { get; set; } = 5;
    public int ItemCheckDelayMs { get; set; } = 100;
    public int GlobalCheckBatchSize { get; set; } = 100;
    public int BatchDelayMs { get; set; } = 1000;
    public int ActiveContentCacheHours { get; set; } = 1;
    public int InactiveContentCacheHours { get; set; } = 6;
    public int ApiRetryAttempts { get; set; } = 3;
    public int ApiRetryBaseDelayMs { get; set; } = 1000;
    public string DefaultRegion { get; set; } = "US";
}

// Analysis result classes
public class AvailabilityChangeAnalysis
{
    public bool HasChanges { get; set; }
    public List<string> NewServices { get; set; } = new();
    public List<string> RemovedServices { get; set; } = new();
    public List<AvailabilityPriceChange> PriceChanges { get; set; } = new();
    public List<ExpirationChange> ExpirationChanges { get; set; } = new();
}

public class AvailabilityPriceChange
{
    public string ServiceName { get; set; } = "";
    public decimal OldPrice { get; set; }
    public decimal NewPrice { get; set; }
    public bool IsPriceDrop { get; set; }
}

public class ExpirationChange
{
    public string ServiceName { get; set; } = "";
    public DateTime? OldExpiration { get; set; }
    public DateTime? NewExpiration { get; set; }
}

