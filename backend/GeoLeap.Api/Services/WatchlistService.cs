using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using Hangfire;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using System.Text.Json;
using System.Text;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service for managing user watchlists with caching and real-time features
/// </summary>
public class WatchlistService : IWatchlistService
{
    private readonly ApplicationDbContext _context;
    private readonly IDistributedCache _cache;
    private readonly ILogger<WatchlistService> _logger;
    private readonly IWatchlistNotificationService _notificationService;
    private readonly IWatchlistAvailabilityService _availabilityService;
    private readonly IBackgroundJobClient _backgroundJobClient;

    public WatchlistService(
        ApplicationDbContext context,
        IDistributedCache cache,
        ILogger<WatchlistService> logger,
        IWatchlistNotificationService notificationService,
        IWatchlistAvailabilityService availabilityService,
        IBackgroundJobClient backgroundJobClient)
    {
        _context = context;
        _cache = cache;
        _logger = logger;
        _notificationService = notificationService;
        _availabilityService = availabilityService;
        _backgroundJobClient = backgroundJobClient;
    }

    public async Task<WatchlistDetailDto> CreateWatchlistAsync(Guid userId, CreateWatchlistDto dto)
    {
        try
        {
            // Validate category ownership if specified
            if (dto.CategoryId.HasValue)
            {
                var categoryExists = await _context.WatchlistCategories
                    .AnyAsync(c => c.Id == dto.CategoryId.Value && c.UserId == userId);
                    
                if (!categoryExists)
                {
                    throw new ArgumentException("Category not found or not accessible");
                }
            }

            // Handle default watchlist logic
            if (dto.IsDefault)
            {
                await _context.Watchlists
                    .Where(w => w.UserId == userId && w.IsDefault)
                    .ExecuteUpdateAsync(w => w.SetProperty(p => p.IsDefault, false));
            }

            var watchlist = new Watchlist
            {
                Name = dto.Name,
                Description = dto.Description,
                UserId = userId,
                CategoryId = dto.CategoryId,
                IsPublic = dto.IsPublic,
                IsDefault = dto.IsDefault,
                IsFavorite = dto.IsFavorite,
                SortOrder = dto.SortOrder,
                SortDirection = dto.SortDirection,
                CreatedBy = userId,
                UpdatedBy = userId
            };

            _context.Watchlists.Add(watchlist);
            await _context.SaveChangesAsync();

            // Log activity
            await LogActivityAsync(watchlist.Id, userId, "created", $"Created watchlist '{watchlist.Name}'");

            // Clear user's watchlist cache
            await InvalidateUserWatchlistCacheAsync(userId);

            return await MapToDetailDtoAsync(watchlist, userId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating watchlist for user {UserId}", userId);
            throw;
        }
    }

    public async Task<WatchlistDetailDto?> GetWatchlistAsync(Guid watchlistId, Guid userId)
    {
        try
        {
            var cacheKey = $"watchlist:{watchlistId}:{userId}";
            var cachedData = await _cache.GetStringAsync(cacheKey);
            
            if (!string.IsNullOrEmpty(cachedData))
            {
                var cached = JsonSerializer.Deserialize<WatchlistDetailDto>(cachedData);
                if (cached != null) return cached;
            }

            // ✅ OPTIMIZED: Load base watchlist first, then load related data separately to avoid N+1
            // This is more efficient than multiple ThenInclude operations
            var watchlist = await _context.Watchlists
                .Include(w => w.Category)
                .FirstOrDefaultAsync(w => w.Id == watchlistId);

            if (watchlist == null) return null;

            // Check access permissions
            if (!await HasWatchlistAccessAsync(watchlist, userId))
            {
                return null;
            }

            // ✅ OPTIMIZED: Load related data with separate targeted queries
            // Load items with active availability history
            var items = await _context.WatchlistItems
                .Where(i => i.WatchlistId == watchlistId)
                .Include(i => i.AvailabilityHistory.Where(h => h.IsActive))
                .AsSplitQuery()
                .ToListAsync();
            watchlist.Items = items;

            // Load shares with users
            var shares = await _context.WatchlistShares
                .Where(s => s.WatchlistId == watchlistId)
                .Include(s => s.SharedWithUser)
                .ToListAsync();
            watchlist.Shares = shares;

            // Load recent activities (limit to 10)
            var activities = await _context.WatchlistActivities
                .Where(a => a.WatchlistId == watchlistId)
                .Include(a => a.User)
                .OrderByDescending(a => a.CreatedAt)
                .Take(10)
                .ToListAsync();
            watchlist.Activities = activities;

            var result = await MapToDetailDtoAsync(watchlist, userId);

            // Cache for 5 minutes
            var cacheOptions = new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(5)
            };
            await _cache.SetStringAsync(cacheKey, JsonSerializer.Serialize(result), cacheOptions);

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting watchlist {WatchlistId} for user {UserId}", watchlistId, userId);
            throw;
        }
    }

    public async Task<List<WatchlistSummaryDto>> GetUserWatchlistsAsync(Guid userId, bool includeShared = true)
    {
        try
        {
            var cacheKey = $"user_watchlists:{userId}:{includeShared}";
            var cachedData = await _cache.GetStringAsync(cacheKey);
            
            if (!string.IsNullOrEmpty(cachedData))
            {
                var cached = JsonSerializer.Deserialize<List<WatchlistSummaryDto>>(cachedData);
                if (cached != null) return cached;
            }

            var query = _context.Watchlists
                .Include(w => w.Category)
                .Include(w => w.Items)
                .Include(w => w.User)
                .Include(w => w.Shares)
                .AsQueryable();

            if (includeShared)
            {
                // Get owned and shared watchlists
                query = query.Where(w => w.UserId == userId || 
                    w.Shares.Any(s => s.SharedWithUserId == userId && s.IsActive && 
                        (s.ExpiresAt == null || s.ExpiresAt > DateTime.UtcNow)));
            }
            else
            {
                // Get only owned watchlists
                query = query.Where(w => w.UserId == userId);
            }

            var watchlists = await query
                .OrderBy(w => w.IsFavorite ? 0 : 1)
                .ThenBy(w => w.IsDefault ? 0 : 1)
                .ThenByDescending(w => w.UpdatedAt)
                .ToListAsync();

            var result = watchlists.Select(w => MapToSummaryDto(w, userId)).ToList();

            // Cache for 2 minutes
            var cacheOptions = new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(2)
            };
            await _cache.SetStringAsync(cacheKey, JsonSerializer.Serialize(result), cacheOptions);

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting watchlists for user {UserId}", userId);
            throw;
        }
    }

    public async Task<WatchlistDetailDto?> UpdateWatchlistAsync(Guid watchlistId, Guid userId, UpdateWatchlistDto dto)
    {
        try
        {
            var watchlist = await _context.Watchlists
                .FirstOrDefaultAsync(w => w.Id == watchlistId);

            if (watchlist == null) return null;

            // Check permissions
            if (!await HasWatchlistEditAccessAsync(watchlist, userId))
            {
                throw new UnauthorizedAccessException("No permission to edit this watchlist");
            }

            // Update fields
            if (!string.IsNullOrEmpty(dto.Name))
                watchlist.Name = dto.Name;
            
            if (dto.Description != null)
                watchlist.Description = dto.Description;

            if (dto.CategoryId.HasValue)
            {
                var categoryExists = await _context.WatchlistCategories
                    .AnyAsync(c => c.Id == dto.CategoryId.Value && c.UserId == userId);
                    
                if (categoryExists)
                    watchlist.CategoryId = dto.CategoryId;
            }

            if (dto.IsPublic.HasValue)
                watchlist.IsPublic = dto.IsPublic.Value;

            if (dto.IsDefault.HasValue && dto.IsDefault.Value)
            {
                // Remove default flag from other watchlists
                await _context.Watchlists
                    .Where(w => w.UserId == userId && w.Id != watchlistId && w.IsDefault)
                    .ExecuteUpdateAsync(w => w.SetProperty(p => p.IsDefault, false));
                
                watchlist.IsDefault = true;
            }
            else if (dto.IsDefault.HasValue)
            {
                watchlist.IsDefault = false;
            }

            if (dto.IsFavorite.HasValue)
                watchlist.IsFavorite = dto.IsFavorite.Value;

            if (!string.IsNullOrEmpty(dto.SortOrder))
                watchlist.SortOrder = dto.SortOrder;

            if (!string.IsNullOrEmpty(dto.SortDirection))
                watchlist.SortDirection = dto.SortDirection;

            watchlist.UpdatedAt = DateTime.UtcNow;
            watchlist.UpdatedBy = userId;

            await _context.SaveChangesAsync();

            // Log activity
            await LogActivityAsync(watchlistId, userId, "updated", $"Updated watchlist settings");

            // Clear cache
            await InvalidateWatchlistCacheAsync(watchlistId, userId);

            return await GetWatchlistAsync(watchlistId, userId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating watchlist {WatchlistId} for user {UserId}", watchlistId, userId);
            throw;
        }
    }

    public async Task<bool> DeleteWatchlistAsync(Guid watchlistId, Guid userId)
    {
        try
        {
            var watchlist = await _context.Watchlists
                .FirstOrDefaultAsync(w => w.Id == watchlistId && w.UserId == userId);

            if (watchlist == null) return false;

            // Don't allow deletion of default watchlist if it's the only one
            if (watchlist.IsDefault)
            {
                var otherWatchlists = await _context.Watchlists
                    .CountAsync(w => w.UserId == userId && w.Id != watchlistId);
                
                if (otherWatchlists == 0)
                {
                    throw new InvalidOperationException("Cannot delete the only watchlist. Create another one first.");
                }
            }

            _context.Watchlists.Remove(watchlist);
            await _context.SaveChangesAsync();

            // Clear cache
            await InvalidateUserWatchlistCacheAsync(userId);

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting watchlist {WatchlistId} for user {UserId}", watchlistId, userId);
            throw;
        }
    }

    public async Task<WatchlistItemDto> AddItemToWatchlistAsync(Guid watchlistId, Guid userId, AddWatchlistItemDto dto)
    {
        try
        {
            var watchlist = await _context.Watchlists
                .FirstOrDefaultAsync(w => w.Id == watchlistId);

            if (watchlist == null)
                throw new ArgumentException("Watchlist not found");

            if (!await HasWatchlistEditAccessAsync(watchlist, userId))
                throw new UnauthorizedAccessException("No permission to edit this watchlist");

            // Check if item already exists in watchlist
            var existingItem = await _context.WatchlistItems
                .FirstOrDefaultAsync(i => i.WatchlistId == watchlistId && 
                    i.ContentId == dto.ContentId && i.ContentType == dto.ContentType);

            if (existingItem != null)
                throw new InvalidOperationException("Item already exists in watchlist");

            var item = new WatchlistItem
            {
                WatchlistId = watchlistId,
                ContentType = dto.ContentType,
                ContentId = dto.ContentId,
                Title = dto.Title,
                Overview = dto.Overview,
                PosterUrl = dto.PosterUrl,
                BackdropUrl = dto.BackdropUrl,
                ReleaseYear = dto.ReleaseYear,
                Rating = dto.Rating,
                Runtime = dto.Runtime,
                Genres = dto.Genres != null ? JsonSerializer.Serialize(dto.Genres) : null,
                StreamingServices = dto.StreamingServices != null ? JsonSerializer.Serialize(dto.StreamingServices) : null,
                Status = dto.Status,
                Priority = dto.Priority,
                UserNotes = dto.UserNotes,
                Tags = dto.Tags != null ? JsonSerializer.Serialize(dto.Tags) : null,
                AddedBy = userId,
                UpdatedBy = userId
            };

            _context.WatchlistItems.Add(item);

            // Update watchlist timestamp
            watchlist.UpdatedAt = DateTime.UtcNow;
            watchlist.UpdatedBy = userId;

            await _context.SaveChangesAsync();

            // Log activity
            await LogActivityAsync(watchlistId, userId, "item_added", $"Added '{item.Title}' to watchlist", item.Id);

            // Check availability in background
            // FIXED: Week 1 Day 4 - Use Hangfire for reliable background job execution
            // FIXED: BUG-BE-014 - Use injected IBackgroundJobClient instead of static API
            _backgroundJobClient.Enqueue(() => _availabilityService.CheckItemAvailabilityAsync(item.Id));

            // Clear cache
            await InvalidateWatchlistCacheAsync(watchlistId, userId);

            return MapToItemDto(item);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding item to watchlist {WatchlistId} for user {UserId}", watchlistId, userId);
            throw;
        }
    }

    public async Task<WatchlistItemDto?> UpdateWatchlistItemAsync(Guid itemId, Guid userId, UpdateWatchlistItemDto dto)
    {
        try
        {
            var item = await _context.WatchlistItems
                .Include(i => i.Watchlist)
                .FirstOrDefaultAsync(i => i.Id == itemId);

            if (item == null) return null;

            if (!await HasWatchlistEditAccessAsync(item.Watchlist, userId))
                throw new UnauthorizedAccessException("No permission to edit this item");

            // Update fields
            if (!string.IsNullOrEmpty(dto.Status))
                item.Status = dto.Status;

            if (dto.Priority.HasValue)
                item.Priority = dto.Priority.Value;

            if (dto.IsWatched.HasValue)
            {
                item.IsWatched = dto.IsWatched.Value;
                if (dto.IsWatched.Value && !item.WatchedAt.HasValue)
                {
                    item.WatchedAt = dto.WatchedAt ?? DateTime.UtcNow;
                }
                else if (!dto.IsWatched.Value)
                {
                    item.WatchedAt = null;
                    item.UserRating = null;
                }
            }

            if (dto.WatchedAt.HasValue)
                item.WatchedAt = dto.WatchedAt;

            if (dto.UserRating.HasValue)
                item.UserRating = dto.UserRating;

            if (dto.UserNotes != null)
                item.UserNotes = dto.UserNotes;

            if (dto.Tags != null)
                item.Tags = JsonSerializer.Serialize(dto.Tags);

            item.UpdatedAt = DateTime.UtcNow;
            item.UpdatedBy = userId;

            // Update watchlist timestamp
            item.Watchlist.UpdatedAt = DateTime.UtcNow;
            item.Watchlist.UpdatedBy = userId;

            await _context.SaveChangesAsync();

            // Log activity
            var changes = new List<string>();
            if (dto.IsWatched.HasValue) changes.Add($"marked as {(dto.IsWatched.Value ? "watched" : "unwatched")}");
            if (dto.UserRating.HasValue) changes.Add($"rated {dto.UserRating.Value}/10");
            if (!string.IsNullOrEmpty(dto.Status)) changes.Add($"status changed to {dto.Status}");

            await LogActivityAsync(item.WatchlistId, userId, "item_updated", 
                $"Updated '{item.Title}': {string.Join(", ", changes)}", item.Id);

            // Clear cache
            await InvalidateWatchlistCacheAsync(item.WatchlistId, userId);

            return MapToItemDto(item);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating watchlist item {ItemId} for user {UserId}", itemId, userId);
            throw;
        }
    }

    public async Task<bool> RemoveItemFromWatchlistAsync(Guid itemId, Guid userId)
    {
        try
        {
            var item = await _context.WatchlistItems
                .Include(i => i.Watchlist)
                .FirstOrDefaultAsync(i => i.Id == itemId);

            if (item == null) return false;

            if (!await HasWatchlistEditAccessAsync(item.Watchlist, userId))
                throw new UnauthorizedAccessException("No permission to edit this watchlist");

            var title = item.Title;
            var watchlistId = item.WatchlistId;

            _context.WatchlistItems.Remove(item);

            // Update watchlist timestamp
            item.Watchlist.UpdatedAt = DateTime.UtcNow;
            item.Watchlist.UpdatedBy = userId;

            await _context.SaveChangesAsync();

            // Log activity
            await LogActivityAsync(watchlistId, userId, "item_removed", $"Removed '{title}' from watchlist");

            // Clear cache
            await InvalidateWatchlistCacheAsync(watchlistId, userId);

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing item {ItemId} for user {UserId}", itemId, userId);
            throw;
        }
    }

    public async Task<bool> MoveItemToWatchlistAsync(Guid itemId, Guid targetWatchlistId, Guid userId)
    {
        try
        {
            var item = await _context.WatchlistItems
                .Include(i => i.Watchlist)
                .FirstOrDefaultAsync(i => i.Id == itemId);

            if (item == null) return false;

            var targetWatchlist = await _context.Watchlists
                .FirstOrDefaultAsync(w => w.Id == targetWatchlistId);

            if (targetWatchlist == null) return false;

            // Check permissions for both watchlists
            if (!await HasWatchlistEditAccessAsync(item.Watchlist, userId) ||
                !await HasWatchlistEditAccessAsync(targetWatchlist, userId))
            {
                throw new UnauthorizedAccessException("No permission to move this item");
            }

            // Check if item already exists in target watchlist
            var existingItem = await _context.WatchlistItems
                .AnyAsync(i => i.WatchlistId == targetWatchlistId && 
                    i.ContentId == item.ContentId && i.ContentType == item.ContentType);

            if (existingItem)
                throw new InvalidOperationException("Item already exists in target watchlist");

            var oldWatchlistId = item.WatchlistId;
            var title = item.Title;

            item.WatchlistId = targetWatchlistId;
            item.UpdatedAt = DateTime.UtcNow;
            item.UpdatedBy = userId;

            // Update both watchlist timestamps
            item.Watchlist.UpdatedAt = DateTime.UtcNow;
            targetWatchlist.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Log activities
            await LogActivityAsync(oldWatchlistId, userId, "item_removed", $"Moved '{title}' to another watchlist");
            await LogActivityAsync(targetWatchlistId, userId, "item_added", $"Moved '{title}' from another watchlist", item.Id);

            // Clear cache for both watchlists
            await InvalidateWatchlistCacheAsync(oldWatchlistId, userId);
            await InvalidateWatchlistCacheAsync(targetWatchlistId, userId);

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error moving item {ItemId} to watchlist {TargetWatchlistId} for user {UserId}", 
                itemId, targetWatchlistId, userId);
            throw;
        }
    }

    public async Task<List<WatchlistItemDto>> GetWatchlistItemsAsync(Guid watchlistId, Guid userId, int page = 1, int pageSize = 50)
    {
        try
        {
            var watchlist = await _context.Watchlists
                .FirstOrDefaultAsync(w => w.Id == watchlistId);

            if (watchlist == null || !await HasWatchlistAccessAsync(watchlist, userId))
                return new List<WatchlistItemDto>();

            // Build base query
            var query = _context.WatchlistItems
                .Include(i => i.AvailabilityHistory.Where(h => h.IsActive))
                .Where(i => i.WatchlistId == watchlistId);

            // Apply proper EF Core compatible sorting
            var isDescending = watchlist.SortDirection == "DESC";
            query = watchlist.SortOrder switch
            {
                "Title" => isDescending ? query.OrderByDescending(i => i.Title) : query.OrderBy(i => i.Title),
                "Rating" => isDescending ? query.OrderByDescending(i => i.Rating) : query.OrderBy(i => i.Rating),
                "ReleaseYear" => isDescending ? query.OrderByDescending(i => i.ReleaseYear) : query.OrderBy(i => i.ReleaseYear),
                "Priority" => isDescending ? query.OrderByDescending(i => i.Priority) : query.OrderBy(i => i.Priority),
                _ => isDescending ? query.OrderByDescending(i => i.AddedAt) : query.OrderBy(i => i.AddedAt) // Default: DateAdded
            };

            var items = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .AsSplitQuery()
                .ToListAsync();

            return items.Select(MapToItemDto).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting items for watchlist {WatchlistId} and user {UserId}", watchlistId, userId);
            throw;
        }
    }

    // Implementation continues with remaining methods...
    // [Additional methods like BulkOperationAsync, CreateCategoryAsync, etc. would follow the same pattern]

    #region Private Helper Methods

    private async Task<bool> HasWatchlistAccessAsync(Watchlist watchlist, Guid userId)
    {
        if (watchlist.UserId == userId) return true;

        return await _context.WatchlistShares
            .AnyAsync(s => s.WatchlistId == watchlist.Id && 
                s.SharedWithUserId == userId && 
                s.IsActive && 
                (s.ExpiresAt == null || s.ExpiresAt > DateTime.UtcNow));
    }

    private async Task<bool> HasWatchlistEditAccessAsync(Watchlist watchlist, Guid userId)
    {
        if (watchlist.UserId == userId) return true;

        return await _context.WatchlistShares
            .AnyAsync(s => s.WatchlistId == watchlist.Id && 
                s.SharedWithUserId == userId && 
                s.IsActive && 
                (s.ExpiresAt == null || s.ExpiresAt > DateTime.UtcNow) &&
                (s.PermissionLevel == "edit" || s.PermissionLevel == "admin"));
    }

    private Task LogActivityAsync(Guid watchlistId, Guid userId, string activityType, string description, Guid? itemId = null)
    {
        var activity = new WatchlistActivity
        {
            WatchlistId = watchlistId,
            WatchlistItemId = itemId,
            UserId = userId,
            ActivityType = activityType,
            Description = description,
            CreatedAt = DateTime.UtcNow
        };

        _context.WatchlistActivities.Add(activity);
        // Note: SaveChangesAsync is called by the calling method
        return Task.CompletedTask;
    }

    private async Task InvalidateWatchlistCacheAsync(Guid watchlistId, Guid userId)
    {
        var keys = new[]
        {
            $"watchlist:{watchlistId}:{userId}",
            $"user_watchlists:{userId}:True",
            $"user_watchlists:{userId}:False"
        };

        foreach (var key in keys)
        {
            await _cache.RemoveAsync(key);
        }
    }

    private async Task InvalidateUserWatchlistCacheAsync(Guid userId)
    {
        var keys = new[]
        {
            $"user_watchlists:{userId}:True",
            $"user_watchlists:{userId}:False"
        };

        foreach (var key in keys)
        {
            await _cache.RemoveAsync(key);
        }
    }

    private WatchlistSummaryDto MapToSummaryDto(Watchlist watchlist, Guid currentUserId)
    {
        return new WatchlistSummaryDto
        {
            Id = watchlist.Id,
            Name = watchlist.Name,
            Description = watchlist.Description,
            UserId = watchlist.UserId,
            UserName = watchlist.User?.UserName ?? "",
            Category = watchlist.Category != null ? new WatchlistCategoryDto
            {
                Id = watchlist.Category.Id,
                Name = watchlist.Category.Name,
                Color = watchlist.Category.Color,
                Icon = watchlist.Category.Icon
            } : null,
            IsPublic = watchlist.IsPublic,
            IsDefault = watchlist.IsDefault,
            IsFavorite = watchlist.IsFavorite,
            SortOrder = watchlist.SortOrder,
            SortDirection = watchlist.SortDirection,
            CreatedAt = watchlist.CreatedAt,
            UpdatedAt = watchlist.UpdatedAt,
            ItemCount = watchlist.Items?.Count ?? 0,
            LastActivityAt = watchlist.Activities?.OrderByDescending(a => a.CreatedAt).FirstOrDefault()?.CreatedAt,
            CanEdit = watchlist.UserId == currentUserId,
            CanShare = watchlist.UserId == currentUserId
        };
    }

    private Task<WatchlistDetailDto> MapToDetailDtoAsync(Watchlist watchlist, Guid currentUserId)
    {
        var summary = MapToSummaryDto(watchlist, currentUserId);

        var detailDto = new WatchlistDetailDto
        {
            Id = summary.Id,
            Name = summary.Name,
            Description = summary.Description,
            UserId = summary.UserId,
            UserName = summary.UserName,
            Category = summary.Category,
            IsPublic = summary.IsPublic,
            IsDefault = summary.IsDefault,
            IsFavorite = summary.IsFavorite,
            SortOrder = summary.SortOrder,
            SortDirection = summary.SortDirection,
            CreatedAt = summary.CreatedAt,
            UpdatedAt = summary.UpdatedAt,
            ItemCount = summary.ItemCount,
            LastActivityAt = summary.LastActivityAt,
            CanEdit = summary.CanEdit,
            CanShare = summary.CanShare,
            Items = watchlist.Items?.Select(MapToItemDto).ToList() ?? new List<WatchlistItemDto>(),
            Shares = watchlist.Shares?.Select(share => MapToShareDto(share)).ToList() ?? new List<WatchlistShareDto>(),
            RecentActivities = watchlist.Activities?.Select(MapToActivityDto).ToList() ?? new List<WatchlistActivityDto>()
        };

        return Task.FromResult(detailDto);
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
            Genres = !string.IsNullOrEmpty(item.Genres) ? 
                JsonSerializer.Deserialize<List<string>>(item.Genres) ?? new List<string>() : 
                new List<string>(),
            StreamingServices = !string.IsNullOrEmpty(item.StreamingServices) ? 
                JsonSerializer.Deserialize<List<string>>(item.StreamingServices) ?? new List<string>() : 
                new List<string>(),
            Status = item.Status ?? "",
            Priority = item.Priority,
            IsWatched = item.IsWatched,
            WatchedAt = item.WatchedAt,
            UserRating = item.UserRating,
            UserNotes = item.UserNotes,
            Tags = !string.IsNullOrEmpty(item.Tags) ? 
                JsonSerializer.Deserialize<List<string>>(item.Tags) ?? new List<string>() : 
                new List<string>(),
            AddedAt = item.AddedAt,
            UpdatedAt = item.UpdatedAt,
            IsCurrentlyAvailable = item.IsCurrentlyAvailable,
            LastAvailabilityCheck = item.LastAvailabilityCheck,
            CurrentAvailability = item.AvailabilityHistory?.Where(h => h.IsActive)
                .Select(MapToAvailabilityDto).ToList() ?? new List<WatchlistItemAvailabilityDto>()
        };
    }

    private WatchlistItemAvailabilityDto MapToAvailabilityDto(WatchlistItemAvailability availability)
    {
        return new WatchlistItemAvailabilityDto
        {
            Id = availability.Id,
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
    }

    private WatchlistShareDto MapToShareDto(Models.WatchlistShare share)
    {
        return new WatchlistShareDto
        {
            Id = share.Id,
            WatchlistId = share.WatchlistId,
            SharedWithUserId = share.SharedWithUserId,
            SharedWithUserName = share.SharedWithUser?.UserName,
            SharedWithEmail = share.SharedWithUser?.Email,
            PermissionLevel = share.PermissionLevel,
            ShareToken = share.ShareToken,
            IsActive = share.IsActive,
            ExpiresAt = share.ExpiresAt,
            CreatedAt = share.CreatedAt,
            CreatedBy = share.CreatedBy,
            AcceptedAt = share.AcceptedAt,
            LastAccessedAt = share.LastAccessedAt
        };
    }

    private WatchlistActivityDto MapToActivityDto(WatchlistActivity activity)
    {
        return new WatchlistActivityDto
        {
            Id = activity.Id,
            WatchlistId = activity.WatchlistId,
            WatchlistItemId = activity.WatchlistItemId,
            WatchlistItemTitle = activity.WatchlistItem?.Title,
            UserId = activity.UserId,
            UserName = activity.User?.UserName ?? "",
            ActivityType = activity.ActivityType,
            Description = activity.Description,
            Metadata = !string.IsNullOrEmpty(activity.Metadata) ? 
                JsonSerializer.Deserialize<Dictionary<string, object>>(activity.Metadata) : null,
            CreatedAt = activity.CreatedAt
        };
    }

    private object GetSortExpression(string sortOrder, bool descending)
    {
        // This would need to be implemented with proper LINQ expressions
        // For now, returning a placeholder
        return sortOrder switch
        {
            "Title" => descending ? "Title DESC" : "Title",
            "DateAdded" => descending ? "AddedAt DESC" : "AddedAt",
            "Rating" => descending ? "Rating DESC" : "Rating",
            "ReleaseYear" => descending ? "ReleaseYear DESC" : "ReleaseYear",
            "Priority" => descending ? "Priority DESC" : "Priority",
            _ => descending ? "AddedAt DESC" : "AddedAt"
        };
    }

    #endregion

    // Placeholder implementations for remaining interface methods
    public async Task<BulkOperationResult> BulkOperationAsync(Guid userId, BulkWatchlistItemOperationDto dto)
    {
        try
        {
            _logger.LogInformation("Processing bulk operation {Operation} for user {UserId} on {Count} items", 
                dto.Operation, userId, dto.ItemIds.Count);

            var result = new BulkOperationResult();
            var items = await _context.WatchlistItems
                .Where(wi => dto.ItemIds.Contains(wi.Id) && 
                            _context.Watchlists.Any(w => w.Id == wi.WatchlistId && w.UserId == userId))
                .ToListAsync();

            foreach (var item in items)
            {
                try
                {
                    switch (dto.Operation.ToLower())
                    {
                        case "move":
                            if (dto.TargetWatchlistId.HasValue)
                            {
                                var targetWatchlist = await _context.Watchlists
                                    .FirstOrDefaultAsync(w => w.Id == dto.TargetWatchlistId.Value && w.UserId == userId);
                                if (targetWatchlist != null)
                                {
                                    item.WatchlistId = dto.TargetWatchlistId.Value;
                                    item.UpdatedAt = DateTime.UtcNow;
                                }
                            }
                            break;
                        case "delete":
                            _context.WatchlistItems.Remove(item);
                            break;
                        case "mark_watched":
                            item.IsWatched = dto.IsWatched ?? true;
                            item.WatchedAt = dto.IsWatched == true ? DateTime.UtcNow : null;
                            item.UpdatedAt = DateTime.UtcNow;
                            break;
                        case "update_status":
                            if (!string.IsNullOrEmpty(dto.NewStatus))
                            {
                                item.Status = dto.NewStatus;
                                item.UpdatedAt = DateTime.UtcNow;
                            }
                            break;
                    }
                    result.SuccessCount++;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Error processing bulk operation on item {ItemId}", item.Id);
                    result.FailureCount++;
                    result.Errors.Add($"Failed to process item {item.Id}: {ex.Message}");
                }
            }

            await _context.SaveChangesAsync();
            _logger.LogInformation("Bulk operation completed: {Success} success, {Failure} failures", 
                result.SuccessCount, result.FailureCount);
            
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error performing bulk operation");
            return new BulkOperationResult
            {
                FailureCount = dto.ItemIds.Count,
                Errors = new List<string> { ex.Message }
            };
        }
    }

    public async Task<WatchlistCategoryDto> CreateCategoryAsync(Guid userId, CreateWatchlistCategoryDto dto)
    {
        try
        {
            _logger.LogInformation("Creating watchlist category {Name} for user {UserId}", dto.Name, userId);

            var category = new WatchlistCategory
            {
                Id = Guid.NewGuid(),
                Name = dto.Name,
                Description = dto.Description,
                Color = dto.Color,
                Icon = dto.Icon,
                UserId = userId,
                SortOrder = dto.SortOrder,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.WatchlistCategories.Add(category);
            await _context.SaveChangesAsync();

            var result = new WatchlistCategoryDto
            {
                Id = category.Id,
                Name = category.Name,
                Description = category.Description,
                Color = category.Color,
                Icon = category.Icon,
                UserId = category.UserId,
                SortOrder = category.SortOrder,
                IsActive = category.IsActive,
                CreatedAt = category.CreatedAt,
                UpdatedAt = category.UpdatedAt,
                WatchlistCount = 0
            };

            _logger.LogInformation("Successfully created category {CategoryId}", category.Id);
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating watchlist category");
            throw;
        }
    }

    public async Task<List<WatchlistCategoryDto>> GetUserCategoriesAsync(Guid userId)
    {
        try
        {
            _logger.LogInformation("Getting categories for user {UserId}", userId);

            var categories = await _context.WatchlistCategories
                .Where(wc => wc.UserId == userId && wc.IsActive)
                .OrderBy(wc => wc.SortOrder)
                .ThenBy(wc => wc.Name)
                .Select(wc => new WatchlistCategoryDto
                {
                    Id = wc.Id,
                    Name = wc.Name,
                    Description = wc.Description,
                    Color = wc.Color,
                    Icon = wc.Icon,
                    UserId = wc.UserId,
                    SortOrder = wc.SortOrder,
                    IsActive = wc.IsActive,
                    CreatedAt = wc.CreatedAt,
                    UpdatedAt = wc.UpdatedAt,
                    WatchlistCount = _context.Watchlists.Count(w => w.CategoryId == wc.Id && w.UserId == userId)
                })
                .ToListAsync();

            _logger.LogInformation("Found {Count} categories for user {UserId}", categories.Count, userId);
            return categories;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting user categories");
            throw;
        }
    }

    public async Task<bool> DeleteCategoryAsync(Guid categoryId, Guid userId)
    {
        try
        {
            _logger.LogInformation("Deleting category {CategoryId} for user {UserId}", categoryId, userId);

            var category = await _context.WatchlistCategories
                .FirstOrDefaultAsync(wc => wc.Id == categoryId && wc.UserId == userId);

            if (category == null)
            {
                _logger.LogWarning("Category {CategoryId} not found for user {UserId}", categoryId, userId);
                return false;
            }

            // Check if any watchlists are using this category
            var watchlistsUsingCategory = await _context.Watchlists
                .CountAsync(w => w.CategoryId == categoryId && w.UserId == userId);

            if (watchlistsUsingCategory > 0)
            {
                // Soft delete by marking as inactive
                category.IsActive = false;
                category.UpdatedAt = DateTime.UtcNow;
                _logger.LogInformation("Soft deleted category {CategoryId} (has {Count} watchlists)", categoryId, watchlistsUsingCategory);
            }
            else
            {
                // Hard delete since no watchlists are using it
                _context.WatchlistCategories.Remove(category);
                _logger.LogInformation("Hard deleted category {CategoryId}", categoryId);
            }

            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting category {CategoryId}", categoryId);
            throw;
        }
    }

    public async Task<WatchlistCategoryDto?> UpdateCategoryAsync(Guid categoryId, Guid userId, CreateWatchlistCategoryDto dto)
    {
        try
        {
            _logger.LogInformation("Updating category {CategoryId} for user {UserId}", categoryId, userId);

            var category = await _context.WatchlistCategories
                .FirstOrDefaultAsync(wc => wc.Id == categoryId && wc.UserId == userId);

            if (category == null)
            {
                _logger.LogWarning("Category {CategoryId} not found for user {UserId}", categoryId, userId);
                return null;
            }

            category.Name = dto.Name;
            category.Description = dto.Description;
            category.Color = dto.Color;
            category.Icon = dto.Icon;
            category.SortOrder = dto.SortOrder;
            category.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            var watchlistCount = await _context.Watchlists
                .CountAsync(w => w.CategoryId == categoryId && w.UserId == userId);

            return new WatchlistCategoryDto
            {
                Id = category.Id,
                Name = category.Name,
                Description = category.Description,
                Color = category.Color,
                Icon = category.Icon,
                UserId = category.UserId,
                SortOrder = category.SortOrder,
                IsActive = category.IsActive,
                CreatedAt = category.CreatedAt,
                UpdatedAt = category.UpdatedAt,
                WatchlistCount = watchlistCount
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating category {CategoryId}", categoryId);
            throw;
        }
    }

    // ========== Views API ==========

    public async Task<List<WatchlistViewDto>> GetUserViewsAsync(Guid userId)
    {
        try
        {
            _logger.LogInformation("Getting views for user {UserId}", userId);

            var views = await _context.Set<WatchlistView>()
                .Where(v => v.UserId == userId && v.IsActive)
                .OrderBy(v => v.SortOrder)
                .ThenBy(v => v.Name)
                .Select(v => new WatchlistViewDto
                {
                    Id = v.Id,
                    Name = v.Name,
                    Description = v.Description,
                    FilterJson = v.FilterJson,
                    Color = v.Color,
                    Icon = v.Icon,
                    UserId = v.UserId,
                    SortOrder = v.SortOrder,
                    IsActive = v.IsActive,
                    CreatedAt = v.CreatedAt,
                    UpdatedAt = v.UpdatedAt
                })
                .ToListAsync();

            return views;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting views for user {UserId}", userId);
            throw;
        }
    }

    public async Task<WatchlistViewDto> CreateViewAsync(Guid userId, CreateWatchlistViewDto dto)
    {
        try
        {
            _logger.LogInformation("Creating view for user {UserId}", userId);

            var view = new WatchlistView
            {
                Name = dto.Name,
                Description = dto.Description,
                FilterJson = dto.FilterJson,
                Color = dto.Color,
                Icon = dto.Icon,
                UserId = userId,
                SortOrder = dto.SortOrder,
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.Set<WatchlistView>().Add(view);
            await _context.SaveChangesAsync();

            return new WatchlistViewDto
            {
                Id = view.Id,
                Name = view.Name,
                Description = view.Description,
                FilterJson = view.FilterJson,
                Color = view.Color,
                Icon = view.Icon,
                UserId = view.UserId,
                SortOrder = view.SortOrder,
                IsActive = view.IsActive,
                CreatedAt = view.CreatedAt,
                UpdatedAt = view.UpdatedAt
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating view for user {UserId}", userId);
            throw;
        }
    }

    public async Task<WatchlistViewDto?> UpdateViewAsync(Guid viewId, Guid userId, CreateWatchlistViewDto dto)
    {
        try
        {
            _logger.LogInformation("Updating view {ViewId} for user {UserId}", viewId, userId);

            var view = await _context.Set<WatchlistView>()
                .FirstOrDefaultAsync(v => v.Id == viewId && v.UserId == userId);

            if (view == null)
            {
                _logger.LogWarning("View {ViewId} not found for user {UserId}", viewId, userId);
                return null;
            }

            view.Name = dto.Name;
            view.Description = dto.Description;
            view.FilterJson = dto.FilterJson;
            view.Color = dto.Color;
            view.Icon = dto.Icon;
            view.SortOrder = dto.SortOrder;
            view.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            return new WatchlistViewDto
            {
                Id = view.Id,
                Name = view.Name,
                Description = view.Description,
                FilterJson = view.FilterJson,
                Color = view.Color,
                Icon = view.Icon,
                UserId = view.UserId,
                SortOrder = view.SortOrder,
                IsActive = view.IsActive,
                CreatedAt = view.CreatedAt,
                UpdatedAt = view.UpdatedAt
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating view {ViewId}", viewId);
            throw;
        }
    }

    public async Task<bool> DeleteViewAsync(Guid viewId, Guid userId)
    {
        try
        {
            _logger.LogInformation("Deleting view {ViewId} for user {UserId}", viewId, userId);

            var view = await _context.Set<WatchlistView>()
                .FirstOrDefaultAsync(v => v.Id == viewId && v.UserId == userId);

            if (view == null)
            {
                _logger.LogWarning("View {ViewId} not found for user {UserId}", viewId, userId);
                return false;
            }

            // Soft delete
            view.IsActive = false;
            view.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting view {ViewId}", viewId);
            throw;
        }
    }

    // ========== Availability API ==========

    public async Task<List<WatchlistItemAvailabilityDto>?> GetItemAvailabilityAsync(Guid itemId, Guid userId)
    {
        try
        {
            _logger.LogInformation("Getting availability for item {ItemId}", itemId);

            // Verify item belongs to user's watchlist
            var item = await _context.WatchlistItems
                .Include(wi => wi.Watchlist)
                .Include(wi => wi.AvailabilityHistory)
                .FirstOrDefaultAsync(wi => wi.Id == itemId && wi.Watchlist.UserId == userId);

            if (item == null)
            {
                return null;
            }

            return item.AvailabilityHistory
                .Where(a => a.IsActive)
                .Select(a => new WatchlistItemAvailabilityDto
                {
                    Id = a.Id,
                    ServiceName = a.ServiceName,
                    CountryCode = a.CountryCode,
                    AvailabilityType = a.AvailabilityType,
                    Price = a.Price,
                    Currency = a.Currency,
                    StreamingUrl = a.StreamingUrl,
                    AvailableFrom = a.AvailableFrom,
                    AvailableUntil = a.AvailableUntil,
                    IsActive = a.IsActive,
                    IsAvailable = a.IsAvailable,
                    Region = a.Region,
                    LastChecked = a.LastChecked
                })
                .ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting availability for item {ItemId}", itemId);
            throw;
        }
    }

    public async Task<bool> RefreshItemAvailabilityAsync(Guid itemId, Guid userId)
    {
        try
        {
            _logger.LogInformation("Refreshing availability for item {ItemId}", itemId);

            // Verify item belongs to user's watchlist
            var item = await _context.WatchlistItems
                .Include(wi => wi.Watchlist)
                .FirstOrDefaultAsync(wi => wi.Id == itemId && wi.Watchlist.UserId == userId);

            if (item == null)
            {
                return false;
            }

            // Queue background job for availability refresh
            _backgroundJobClient.Enqueue(() => _availabilityService.CheckItemAvailabilityAsync(itemId));

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error refreshing availability for item {ItemId}", itemId);
            throw;
        }
    }

    public async Task<WatchlistShareDto> ShareWatchlistAsync(Guid watchlistId, Guid userId, ShareWatchlistDto dto)
    {
        try
        {
            _logger.LogInformation("Sharing watchlist {WatchlistId} by user {UserId}", watchlistId, userId);

            var watchlist = await _context.Watchlists
                .FirstOrDefaultAsync(w => w.Id == watchlistId && w.UserId == userId);

            if (watchlist == null)
            {
                throw new InvalidOperationException($"Watchlist {watchlistId} not found or not accessible by user {userId}");
            }

            var share = new Models.WatchlistShare
            {
                Id = Guid.NewGuid(),
                WatchlistId = watchlistId,
                SharedWithUserId = dto.SharedWithUserId,
                SharedWithEmail = dto.SharedWithEmail,
                PermissionLevel = dto.PermissionLevel,
                ShareToken = Guid.NewGuid().ToString("N")[..16], // Short token
                IsActive = true,
                ExpiresAt = dto.ExpiresAt,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = userId
            };

            _context.WatchlistShares.Add(share);
            await _context.SaveChangesAsync();

            var result = new WatchlistShareDto
            {
                Id = share.Id,
                WatchlistId = share.WatchlistId,
                SharedWithUserId = share.SharedWithUserId,
                SharedWithEmail = share.SharedWithEmail,
                PermissionLevel = share.PermissionLevel,
                ShareToken = share.ShareToken,
                IsActive = share.IsActive,
                ExpiresAt = share.ExpiresAt,
                CreatedAt = share.CreatedAt,
                CreatedBy = share.CreatedBy,
                CreatedByUserName = _context.Users.Where(u => u.Id == userId).Select(u => u.DisplayName ?? u.Email).FirstOrDefault() ?? ""
            };

            _logger.LogInformation("Successfully created watchlist share {ShareId}", share.Id);
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sharing watchlist {WatchlistId}", watchlistId);
            throw;
        }
    }

    public async Task<bool> RevokeWatchlistShareAsync(Guid shareId, Guid userId)
    {
        try
        {
            _logger.LogInformation("Revoking watchlist share {ShareId} by user {UserId}", shareId, userId);

            var share = await _context.WatchlistShares
                .Include(ws => ws.Watchlist)
                .FirstOrDefaultAsync(ws => ws.Id == shareId && ws.Watchlist.UserId == userId);

            if (share == null)
            {
                _logger.LogWarning("Share {ShareId} not found or not accessible by user {UserId}", shareId, userId);
                return false;
            }

            share.IsActive = false;

            await _context.SaveChangesAsync();
            _logger.LogInformation("Successfully revoked share {ShareId}", shareId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error revoking share {ShareId}", shareId);
            throw;
        }
    }

    public async Task<List<WatchlistShareDto>> GetWatchlistSharesAsync(Guid watchlistId, Guid userId)
    {
        try
        {
            _logger.LogInformation("Getting shares for watchlist {WatchlistId} by user {UserId}", watchlistId, userId);

            var shares = await _context.WatchlistShares
                .Include(ws => ws.Watchlist)
                .Include(ws => ws.SharedWithUser)
                .Where(ws => ws.WatchlistId == watchlistId && ws.Watchlist.UserId == userId)
                .Select(ws => new WatchlistShareDto
                {
                    Id = ws.Id,
                    WatchlistId = ws.WatchlistId,
                    SharedWithUserId = ws.SharedWithUserId,
                    SharedWithUserName = ws.SharedWithUser != null ? (ws.SharedWithUser.DisplayName ?? ws.SharedWithUser.Email) : null,
                    SharedWithEmail = ws.SharedWithEmail,
                    PermissionLevel = ws.PermissionLevel,
                    ShareToken = ws.ShareToken,
                    IsActive = ws.IsActive,
                    ExpiresAt = ws.ExpiresAt,
                    CreatedAt = ws.CreatedAt,
                    CreatedBy = ws.CreatedBy,
                    CreatedByUserName = "",
                    AcceptedAt = ws.AcceptedAt,
                    LastAccessedAt = ws.LastAccessedAt
                })
                .ToListAsync();

            _logger.LogInformation("Found {Count} shares for watchlist {WatchlistId}", shares.Count, watchlistId);
            return shares;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting watchlist shares");
            throw;
        }
    }

    public async Task<WatchlistDetailDto?> GetSharedWatchlistAsync(string shareToken)
    {
        try
        {
            _logger.LogInformation("Getting shared watchlist with token {ShareToken}", shareToken);

            var share = await _context.WatchlistShares
                .Include(ws => ws.Watchlist)
                .ThenInclude(w => w.User)
                .Include(ws => ws.Watchlist)
                .ThenInclude(w => w.Category)
                .FirstOrDefaultAsync(ws => ws.ShareToken == shareToken && ws.IsActive &&
                    (ws.ExpiresAt == null || ws.ExpiresAt > DateTime.UtcNow));

            if (share?.Watchlist == null)
            {
                _logger.LogWarning("Shared watchlist not found or expired for token {ShareToken}", shareToken);
                return null;
            }

            // Update last accessed time
            share.LastAccessedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();

            var watchlist = share.Watchlist;
            var items = await _context.WatchlistItems
                .Where(wi => wi.WatchlistId == watchlist.Id)
                .OrderBy(wi => wi.AddedAt)
                .Select(wi => new WatchlistItemDto
                {
                    Id = wi.Id,
                    WatchlistId = wi.WatchlistId,
                    ContentType = wi.ContentType,
                    ContentId = wi.ContentId,
                    Title = wi.Title,
                    TmdbId = wi.TmdbId,
                    Type = wi.ContentType,
                    Year = wi.ReleaseYear,
                    Overview = wi.Overview,
                    PosterUrl = wi.PosterUrl,
                    BackdropUrl = wi.BackdropUrl,
                    ReleaseYear = wi.ReleaseYear,
                    Rating = wi.Rating,
                    Runtime = wi.Runtime,
                    Genres = new List<string>(), // Processed separately
                    StreamingServices = new List<string>(), // Processed separately
                    Status = wi.Status ?? string.Empty,
                    Priority = wi.Priority,
                    IsWatched = wi.IsWatched,
                    WatchedAt = wi.WatchedAt,
                    UserRating = wi.UserRating,
                    UserNotes = wi.UserNotes,
                    Tags = wi.UserNotes != null ? new List<string> { wi.UserNotes } : new List<string>(),
                    AddedAt = wi.AddedAt,
                    UpdatedAt = wi.UpdatedAt,
                    IsCurrentlyAvailable = wi.IsCurrentlyAvailable,
                    LastAvailabilityCheck = wi.LastAvailabilityCheck
                })
                .ToListAsync();

            var result = new WatchlistDetailDto
            {
                Id = watchlist.Id,
                Name = watchlist.Name,
                Description = watchlist.Description,
                UserId = watchlist.UserId,
                UserName = watchlist.User?.DisplayName ?? watchlist.User?.Email ?? "",
                Category = watchlist.Category != null ? new WatchlistCategoryDto
                {
                    Id = watchlist.Category.Id,
                    Name = watchlist.Category.Name,
                    Description = watchlist.Category.Description,
                    Color = watchlist.Category.Color,
                    Icon = watchlist.Category.Icon
                } : null,
                IsPublic = watchlist.IsPublic,
                IsDefault = watchlist.IsDefault,
                IsFavorite = watchlist.IsFavorite,
                SortOrder = watchlist.SortOrder,
                SortDirection = watchlist.SortDirection,
                CreatedAt = watchlist.CreatedAt,
                UpdatedAt = watchlist.UpdatedAt,
                ItemCount = items.Count,
                LastActivityAt = watchlist.LastActivityAt,
                HasNewUpdates = false,
                CanEdit = share.PermissionLevel == "edit",
                CanShare = false, // Shared users can't share
                Items = items,
                OwnerInfo = new OwnerInfoDto
                {
                    UserId = watchlist.UserId,
                    UserName = watchlist.User?.Email ?? "",
                    DisplayName = watchlist.User?.DisplayName,
                    IsCurrentUser = false,
                    MemberSince = watchlist.User?.CreatedAt ?? DateTime.UtcNow
                }
            };

            _logger.LogInformation("Successfully retrieved shared watchlist {WatchlistId} with {ItemCount} items", 
                watchlist.Id, items.Count);
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting shared watchlist");
            throw;
        }
    }

    public async Task<bool> AcceptWatchlistShareAsync(Guid shareId, Guid userId)
    {
        try
        {
            _logger.LogInformation("User {UserId} accepting watchlist share {ShareId}", userId, shareId);

            var share = await _context.WatchlistShares
                .FirstOrDefaultAsync(ws => ws.Id == shareId && 
                    (ws.SharedWithUserId == userId || ws.SharedWithEmail == _context.Users.Where(u => u.Id == userId).Select(u => u.Email).FirstOrDefault()));

            if (share == null)
            {
                _logger.LogWarning("Share {ShareId} not found or not accessible by user {UserId}", shareId, userId);
                return false;
            }

            if (share.ExpiresAt.HasValue && share.ExpiresAt < DateTime.UtcNow)
            {
                _logger.LogWarning("Share {ShareId} has expired", shareId);
                return false;
            }

            share.AcceptedAt = DateTime.UtcNow;
            share.SharedWithUserId = userId; // Link to actual user if was shared by email
            // share.UpdatedAt = DateTime.UtcNow; // Property doesn't exist

            await _context.SaveChangesAsync();
            _logger.LogInformation("Successfully accepted share {ShareId}", shareId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error accepting share {ShareId}", shareId);
            throw;
        }
    }

    public async Task<WatchlistAnalyticsDto> GetUserAnalyticsAsync(Guid userId)
    {
        try
        {
            _logger.LogInformation("Getting analytics for user {UserId}", userId);

            var userWatchlists = await _context.Watchlists
                .Where(w => w.UserId == userId)
                .ToListAsync();

            var userItems = await _context.WatchlistItems
                .Where(wi => userWatchlists.Select(w => w.Id).Contains(wi.WatchlistId))
                .ToListAsync();

            var analytics = new WatchlistAnalyticsDto
            {
                TotalWatchlists = userWatchlists.Count,
                TotalItems = userItems.Count,
                WatchedItems = userItems.Count(wi => wi.IsWatched),
                UnwatchedItems = userItems.Count(wi => !wi.IsWatched),
                AvailableItems = userItems.Count(wi => wi.IsCurrentlyAvailable),
                UnavailableItems = userItems.Count(wi => !wi.IsCurrentlyAvailable),
                LastActivityAt = userWatchlists.Max(w => w.LastActivityAt)
            };

            // Status breakdown
            analytics.ItemsByStatus = userItems
                .Where(wi => wi.Status != null)
                .GroupBy(wi => wi.Status!)
                .ToDictionary(g => g.Key, g => g.Count());

            // Genre breakdown
            var allGenres = userItems
                .Where(wi => !string.IsNullOrEmpty(wi.Genres))
                .SelectMany(wi => wi.Genres!.Split(',').Where(s => !string.IsNullOrWhiteSpace(s)))
                .Where(g => !string.IsNullOrEmpty(g));
            analytics.ItemsByGenre = allGenres
                .GroupBy(g => g)
                .ToDictionary(g => g.Key, g => g.Count());

            // Service breakdown
            var allServices = userItems
                .Where(wi => !string.IsNullOrEmpty(wi.StreamingServices))
                .SelectMany(wi => wi.StreamingServices!.Split(',').Where(s => !string.IsNullOrWhiteSpace(s)))
                .Where(s => !string.IsNullOrEmpty(s));
            analytics.ItemsByService = allServices
                .GroupBy(s => s)
                .ToDictionary(s => s.Key, s => s.Count());

            // Year breakdown
            analytics.ItemsByYear = userItems
                .Where(wi => wi.ReleaseYear.HasValue)
                .GroupBy(wi => wi.ReleaseYear!.Value.ToString())
                .ToDictionary(g => g.Key, g => g.Count());

            // Average user rating
            var ratedItems = userItems.Where(wi => wi.UserRating.HasValue).ToList();
            analytics.AverageUserRating = ratedItems.Count > 0 ? ratedItems.Average(wi => wi.UserRating!.Value) : 0;

            // Most active watchlists
            analytics.MostActiveWatchlists = userWatchlists
                .Where(w => w.LastActivityAt.HasValue)
                .OrderByDescending(w => w.LastActivityAt)
                .Take(5)
                .Select(w => new WatchlistSummaryDto
                {
                    Id = w.Id,
                    Name = w.Name,
                    Description = w.Description,
                    ItemCount = userItems.Count(wi => wi.WatchlistId == w.Id),
                    LastActivityAt = w.LastActivityAt,
                    CreatedAt = w.CreatedAt,
                    UpdatedAt = w.UpdatedAt
                })
                .ToList();

            _logger.LogInformation("Generated analytics for user {UserId}: {Watchlists} watchlists, {Items} items", 
                userId, analytics.TotalWatchlists, analytics.TotalItems);
            return analytics;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting user analytics");
            throw;
        }
    }

    public async Task<List<WatchlistActivityDto>> GetWatchlistActivitiesAsync(Guid watchlistId, Guid userId, int page = 1, int pageSize = 20)
    {
        try
        {
            _logger.LogInformation("Getting activities for watchlist {WatchlistId} by user {UserId}", watchlistId, userId);

            // Verify user has access to this watchlist
            var hasAccess = await _context.Watchlists.AnyAsync(w => w.Id == watchlistId && w.UserId == userId) ||
                           await _context.WatchlistShares.AnyAsync(ws => ws.WatchlistId == watchlistId && 
                               ws.SharedWithUserId == userId && ws.IsActive &&
                               (ws.ExpiresAt == null || ws.ExpiresAt > DateTime.UtcNow));

            if (!hasAccess)
            {
                _logger.LogWarning("User {UserId} does not have access to watchlist {WatchlistId}", userId, watchlistId);
                return new List<WatchlistActivityDto>();
            }

            var activities = await _context.WatchlistActivities
                .Include(wa => wa.User)
                .Include(wa => wa.WatchlistItem)
                .Where(wa => wa.WatchlistId == watchlistId)
                .OrderByDescending(wa => wa.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(wa => new WatchlistActivityDto
                {
                    Id = wa.Id,
                    WatchlistId = wa.WatchlistId,
                    WatchlistItemId = wa.WatchlistItemId,
                    WatchlistItemTitle = wa.WatchlistItem != null ? wa.WatchlistItem.Title : null,
                    UserId = wa.UserId,
                    UserName = wa.User != null ? (wa.User.DisplayName ?? wa.User.Email ?? string.Empty) : string.Empty,
                    ActivityType = wa.ActivityType,
                    Description = wa.Description,
                    Metadata = null, // Processed separately to avoid expression tree issues
                    CreatedAt = wa.CreatedAt
                })
                .ToListAsync();

            _logger.LogInformation("Found {Count} activities for watchlist {WatchlistId}", activities.Count, watchlistId);
            return activities;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting watchlist activities");
            throw;
        }
    }

    public async Task<ExportResult> ExportWatchlistsAsync(Guid userId, WatchlistExportDto dto)
    {
        try
        {
            _logger.LogInformation("Exporting {Count} watchlists for user {UserId} in {Format} format", 
                dto.WatchlistIds.Count, userId, dto.Format);

            var watchlists = await _context.Watchlists
                .Include(w => w.Category)
                .Where(w => dto.WatchlistIds.Contains(w.Id) && w.UserId == userId)
                .ToListAsync();

            var watchlistItems = await _context.WatchlistItems
                .Where(wi => dto.WatchlistIds.Contains(wi.WatchlistId))
                .ToListAsync();

            byte[] data;
            string contentType;
            string fileName;

            if (dto.Format.ToLower() == "csv")
            {
                var csv = new System.Text.StringBuilder();
                csv.AppendLine("WatchlistName,ItemTitle,ContentType,ContentId,Status,IsWatched,UserRating,AddedAt");

                foreach (var watchlist in watchlists)
                {
                    var items = watchlistItems.Where(wi => wi.WatchlistId == watchlist.Id);
                    foreach (var item in items)
                    {
                        csv.AppendLine($"\"{watchlist.Name}\",\"{item.Title}\",{item.ContentType},{item.ContentId},{item.Status},{item.IsWatched},{item.UserRating},{item.AddedAt:yyyy-MM-dd}");
                    }
                }

                data = System.Text.Encoding.UTF8.GetBytes(csv.ToString());
                contentType = "text/csv";
                fileName = $"watchlists-{DateTime.UtcNow:yyyyMMdd}.csv";
            }
            else // JSON
            {
                var exportData = watchlists.Select(w => new
                {
                    w.Id,
                    w.Name,
                    w.Description,
                    Category = w.Category?.Name,
                    w.CreatedAt,
                    Items = watchlistItems.Where(wi => wi.WatchlistId == w.Id).Select(wi => new
                    {
                        wi.Title,
                        wi.ContentType,
                        wi.ContentId,
                        wi.Status,
                        wi.IsWatched,
                        wi.UserRating,
                        wi.UserNotes,
                        wi.AddedAt,
                        Genres = wi.Genres != null ? wi.Genres.Split(',').Where(s => !string.IsNullOrWhiteSpace(s)).ToList() : null,
                        StreamingServices = wi.StreamingServices != null ? wi.StreamingServices.Split(',').Where(s => !string.IsNullOrWhiteSpace(s)).ToList() : null,
                        Availability = dto.IncludeAvailability ? new { wi.IsCurrentlyAvailable, wi.LastAvailabilityCheck } : null
                    })
                });

                var json = System.Text.Json.JsonSerializer.Serialize(exportData, new System.Text.Json.JsonSerializerOptions { WriteIndented = true });
                data = System.Text.Encoding.UTF8.GetBytes(json);
                contentType = "application/json";
                fileName = $"watchlists-{DateTime.UtcNow:yyyyMMdd}.json";
            }

            var result = new ExportResult
            {
                FileName = fileName,
                Data = data,
                ContentType = contentType,
                RecordCount = watchlistItems.Count
            };

            _logger.LogInformation("Successfully exported {Count} watchlists with {ItemCount} items", 
                watchlists.Count, watchlistItems.Count);
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error exporting watchlists");
            throw;
        }
    }

    public async Task<List<WatchlistSummaryDto>> SearchWatchlistsAsync(Guid userId, string query, int page = 1, int pageSize = 10)
    {
        try
        {
            _logger.LogInformation("Searching watchlists for user {UserId} with query '{Query}'", userId, query);

            var searchResults = await _context.Watchlists
                .Include(w => w.Category)
                .Include(w => w.User)
                .Where(w => w.UserId == userId && 
                           (w.Name.Contains(query) || 
                            (w.Description != null && w.Description.Contains(query))))
                .OrderByDescending(w => w.UpdatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(w => new WatchlistSummaryDto
                {
                    Id = w.Id,
                    Name = w.Name,
                    Description = w.Description,
                    UserId = w.UserId,
                    UserName = w.User != null ? (w.User.DisplayName ?? w.User.Email ?? string.Empty) : string.Empty,
                    Category = w.Category != null ? new WatchlistCategoryDto
                    {
                        Id = w.Category.Id,
                        Name = w.Category.Name,
                        Description = w.Category.Description,
                        Color = w.Category.Color,
                        Icon = w.Category.Icon
                    } : null,
                    IsPublic = w.IsPublic,
                    IsDefault = w.IsDefault,
                    IsFavorite = w.IsFavorite,
                    SortOrder = w.SortOrder,
                    SortDirection = w.SortDirection,
                    CreatedAt = w.CreatedAt,
                    UpdatedAt = w.UpdatedAt,
                    ItemCount = _context.WatchlistItems.Count(wi => wi.WatchlistId == w.Id),
                    LastActivityAt = w.LastActivityAt,
                    HasNewUpdates = false, // Would need additional logic to determine
                    CanEdit = true, // User's own watchlists
                    CanShare = true
                })
                .ToListAsync();

            _logger.LogInformation("Found {Count} watchlists matching query '{Query}'", searchResults.Count, query);
            return searchResults;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error searching watchlists");
            throw;
        }
    }

    public async Task<List<WatchlistItemDto>> SearchWatchlistItemsAsync(Guid watchlistId, Guid userId, string query, int page = 1, int pageSize = 20)
    {
        try
        {
            _logger.LogInformation("Searching items in watchlist {WatchlistId} for user {UserId} with query '{Query}'", 
                watchlistId, userId, query);

            // Verify user has access to this watchlist
            var hasAccess = await _context.Watchlists.AnyAsync(w => w.Id == watchlistId && w.UserId == userId) ||
                           await _context.WatchlistShares.AnyAsync(ws => ws.WatchlistId == watchlistId && 
                               ws.SharedWithUserId == userId && ws.IsActive &&
                               (ws.ExpiresAt == null || ws.ExpiresAt > DateTime.UtcNow));

            if (!hasAccess)
            {
                _logger.LogWarning("User {UserId} does not have access to watchlist {WatchlistId}", userId, watchlistId);
                return new List<WatchlistItemDto>();
            }

            var searchResults = await _context.WatchlistItems
                .Where(wi => wi.WatchlistId == watchlistId && 
                            (wi.Title.Contains(query) || 
                             (wi.Overview != null && wi.Overview.Contains(query)) ||
                             (wi.UserNotes != null && wi.UserNotes.Contains(query))))
                .OrderBy(wi => wi.Title)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(wi => new WatchlistItemDto
                {
                    Id = wi.Id,
                    WatchlistId = wi.WatchlistId,
                    ContentType = wi.ContentType,
                    ContentId = wi.ContentId,
                    Title = wi.Title,
                    TmdbId = wi.TmdbId,
                    Type = wi.ContentType,
                    Year = wi.ReleaseYear,
                    Overview = wi.Overview,
                    PosterUrl = wi.PosterUrl,
                    BackdropUrl = wi.BackdropUrl,
                    ReleaseYear = wi.ReleaseYear,
                    Rating = wi.Rating,
                    Runtime = wi.Runtime,
                    Genres = new List<string>(), // Processed separately
                    StreamingServices = new List<string>(), // Processed separately
                    Status = wi.Status ?? string.Empty,
                    Priority = wi.Priority,
                    IsWatched = wi.IsWatched,
                    WatchedAt = wi.WatchedAt,
                    UserRating = wi.UserRating,
                    UserNotes = wi.UserNotes,
                    Tags = wi.UserNotes != null ? new List<string> { wi.UserNotes } : new List<string>(),
                    AddedAt = wi.AddedAt,
                    UpdatedAt = wi.UpdatedAt,
                    IsCurrentlyAvailable = wi.IsCurrentlyAvailable,
                    LastAvailabilityCheck = wi.LastAvailabilityCheck
                })
                .ToListAsync();

            _logger.LogInformation("Found {Count} items matching query '{Query}' in watchlist {WatchlistId}", 
                searchResults.Count, query, watchlistId);
            return searchResults;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error searching watchlist items");
            throw;
        }
    }

    public async Task UpdateItemAvailabilityAsync(Guid itemId, List<WatchlistItemAvailabilityDto> availability)
    {
        try
        {
            _logger.LogInformation("Updating availability for item {ItemId} with {Count} availability records", 
                itemId, availability.Count);

            var item = await _context.WatchlistItems.FirstOrDefaultAsync(wi => wi.Id == itemId);
            if (item == null)
            {
                _logger.LogWarning("Watchlist item {ItemId} not found", itemId);
                return;
            }

            // Remove existing availability records
            var existingAvailability = await _context.WatchlistItemAvailabilities
                .Where(wia => wia.WatchlistItemId == itemId)
                .ToListAsync();
            _context.WatchlistItemAvailabilities.RemoveRange(existingAvailability);

            // Add new availability records
            foreach (var avail in availability)
            {
                var availabilityRecord = new WatchlistItemAvailability
                {
                    Id = Guid.NewGuid(),
                    WatchlistItemId = itemId,
                    ServiceName = avail.ServiceName,
                    CountryCode = avail.CountryCode,
                    AvailabilityType = avail.AvailabilityType,
                    Price = avail.Price,
                    Currency = avail.Currency,
                    StreamingUrl = avail.StreamingUrl,
                    AvailableFrom = avail.AvailableFrom,
                    AvailableUntil = avail.AvailableUntil,
                    IsActive = avail.IsActive,
                    LastChecked = DateTime.UtcNow,
                    CreatedAt = DateTime.UtcNow,
                    UpdatedAt = DateTime.UtcNow
                };
                _context.WatchlistItemAvailabilities.Add(availabilityRecord);
            }

            // Update item availability status
            item.IsCurrentlyAvailable = availability.Any(a => a.IsActive);
            item.LastAvailabilityCheck = DateTime.UtcNow;
            item.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            _logger.LogInformation("Successfully updated availability for item {ItemId}", itemId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating item availability");
            throw;
        }
    }

    public async Task<List<WatchlistItemDto>> GetItemsWithAvailabilityChangesAsync(Guid userId, DateTime since)
    {
        try
        {
            _logger.LogInformation("Getting items with availability changes for user {UserId} since {Since}", userId, since);

            var userWatchlistIds = await _context.Watchlists
                .Where(w => w.UserId == userId)
                .Select(w => w.Id)
                .ToListAsync();

            var itemsWithChanges = await _context.WatchlistItems
                .Where(wi => userWatchlistIds.Contains(wi.WatchlistId) && 
                            wi.LastAvailabilityCheck.HasValue && 
                            wi.LastAvailabilityCheck > since)
                .Select(wi => new WatchlistItemDto
                {
                    Id = wi.Id,
                    WatchlistId = wi.WatchlistId,
                    ContentType = wi.ContentType,
                    ContentId = wi.ContentId,
                    Title = wi.Title,
                    TmdbId = wi.TmdbId,
                    Type = wi.ContentType,
                    Year = wi.ReleaseYear,
                    Overview = wi.Overview,
                    PosterUrl = wi.PosterUrl,
                    BackdropUrl = wi.BackdropUrl,
                    ReleaseYear = wi.ReleaseYear,
                    Rating = wi.Rating,
                    Runtime = wi.Runtime,
                    Genres = new List<string>(), // Processed separately
                    StreamingServices = new List<string>(), // Processed separately
                    Status = wi.Status ?? string.Empty,
                    Priority = wi.Priority,
                    IsWatched = wi.IsWatched,
                    WatchedAt = wi.WatchedAt,
                    UserRating = wi.UserRating,
                    UserNotes = wi.UserNotes,
                    Tags = wi.UserNotes != null ? new List<string> { wi.UserNotes } : new List<string>(),
                    AddedAt = wi.AddedAt,
                    UpdatedAt = wi.UpdatedAt,
                    IsCurrentlyAvailable = wi.IsCurrentlyAvailable,
                    LastAvailabilityCheck = wi.LastAvailabilityCheck
                })
                .ToListAsync();

            _logger.LogInformation("Found {Count} items with availability changes since {Since}", itemsWithChanges.Count, since);
            return itemsWithChanges;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting items with availability changes");
            throw;
        }
    }

    public async Task<WatchlistNotificationSettingsDto> GetNotificationSettingsAsync(Guid userId)
    {
        try
        {
            _logger.LogInformation("Getting notification settings for user {UserId}", userId);

            var settings = await _context.WatchlistNotificationSettings
                .FirstOrDefaultAsync(wns => wns.UserId == userId);

            if (settings == null)
            {
                // Return default settings
                var defaultSettings = new WatchlistNotificationSettingsDto
                {
                    GloballyEnabled = true,
                    NotifyOnAvailabilityChange = true,
                    NotifyOnNewReleases = true,
                    NotifyOnPriceDrops = true,
                    NotifyOnSharedWatchlist = true,
                    NotifyOnRecommendations = true,
                    EnableEmailNotifications = true,
                    EnablePushNotifications = true,
                    EnableInAppNotifications = true,
                    PreferredNotificationMethod = "email",
                    MinimumRating = 6.0m,
                    MaxNotificationsPerHour = 10,
                    MaxNotificationsPerDay = 20,
                    EnableRetries = true,
                    MaxRetryAttempts = 3,
                    RetryDelayMinutes = 5
                };

                _logger.LogInformation("Returning default notification settings for user {UserId}", userId);
                return defaultSettings;
            }

            var dto = new WatchlistNotificationSettingsDto
            {
                GloballyEnabled = settings.GloballyEnabled,
                NotifyOnAvailabilityChange = settings.NotifyOnAvailabilityChange,
                NotifyOnNewReleases = settings.NotifyOnNewReleases,
                NotifyOnPriceDrops = settings.NotifyOnPriceDrops,
                NotifyOnSharedWatchlist = settings.NotifyOnSharedWatchlist,
                NotifyOnRecommendations = settings.NotifyOnRecommendations,
                EnableEmailNotifications = settings.EnableEmailNotifications,
                EnablePushNotifications = settings.EnablePushNotifications,
                EnableInAppNotifications = settings.EnableInAppNotifications,
                PreferredNotificationMethod = settings.PreferredNotificationMethod,
                MinimumRating = settings.MinimumRating,
                MaxNotificationsPerHour = settings.MaxNotificationsPerHour,
                MaxNotificationsPerDay = settings.MaxNotificationsPerDay,
                EnableRetries = settings.EnableRetries,
                MaxRetryAttempts = settings.MaxRetryAttempts,
                RetryDelayMinutes = settings.RetryDelayMinutes
            };

            _logger.LogInformation("Retrieved notification settings for user {UserId}", userId);
            return dto;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting notification settings");
            throw;
        }
    }

    public async Task<WatchlistNotificationSettingsDto> UpdateNotificationSettingsAsync(Guid userId, WatchlistNotificationSettingsDto dto)
    {
        try
        {
            _logger.LogInformation("Updating notification settings for user {UserId}", userId);

            var settings = await _context.WatchlistNotificationSettings
                .FirstOrDefaultAsync(wns => wns.UserId == userId);

            if (settings == null)
            {
                settings = new WatchlistNotificationSettings
                {
                    Id = Guid.NewGuid(),
                    UserId = userId,
                    CreatedAt = DateTime.UtcNow
                };
                _context.WatchlistNotificationSettings.Add(settings);
            }

            // Update settings from DTO
            settings.GloballyEnabled = dto.GloballyEnabled;
            settings.NotifyOnAvailabilityChange = dto.NotifyOnAvailabilityChange;
            settings.NotifyOnNewReleases = dto.NotifyOnNewReleases;
            settings.NotifyOnPriceDrops = dto.NotifyOnPriceDrops;
            settings.NotifyOnSharedWatchlist = dto.NotifyOnSharedWatchlist;
            settings.NotifyOnRecommendations = dto.NotifyOnRecommendations;
            settings.EnableEmailNotifications = dto.EnableEmailNotifications;
            settings.EnablePushNotifications = dto.EnablePushNotifications;
            settings.EnableInAppNotifications = dto.EnableInAppNotifications;
            settings.PreferredNotificationMethod = dto.PreferredNotificationMethod;
            settings.MinimumRating = dto.MinimumRating;
            settings.MaxNotificationsPerHour = dto.MaxNotificationsPerHour;
            settings.MaxNotificationsPerDay = dto.MaxNotificationsPerDay;
            settings.EnableRetries = dto.EnableRetries ?? false;
            settings.MaxRetryAttempts = dto.MaxRetryAttempts ?? 3;
            settings.RetryDelayMinutes = dto.RetryDelayMinutes ?? 5;
            settings.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            _logger.LogInformation("Successfully updated notification settings for user {UserId}", userId);

            return dto;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating notification settings");
            throw;
        }
    }
}