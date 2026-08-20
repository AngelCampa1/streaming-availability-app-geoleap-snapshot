using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using System.Text.Json;

namespace GeoLeap.Api.Services;

/// <summary>
/// Watchlist service with privacy preference integration
/// Extends existing WatchlistService with privacy-aware operations
/// </summary>
public interface IPrivacyAwareWatchlistService
{
    Task<WatchlistDetailDto> CreateWatchlistWithPrivacyAsync(Guid userId, CreateWatchlistDto dto);
    Task<WatchlistDetailDto?> GetWatchlistWithPrivacyCheckAsync(Guid watchlistId, Guid requestingUserId);
    Task<List<WatchlistSummaryDto>> GetUserWatchlistsWithPrivacyAsync(Guid userId, Guid? requestingUserId = null);
    Task<List<WatchlistSummaryDto>> GetPublicWatchlistsAsync(Guid? requestingUserId = null, int page = 1, int pageSize = 20);
    Task<WatchlistSharingInfo> GetWatchlistSharingInfoAsync(Guid watchlistId, Guid userId);
    Task<bool> UpdateWatchlistPrivacyAsync(Guid watchlistId, Guid userId, WatchlistPrivacySettings settings);
    Task<bool> CanUserAccessWatchlistAsync(Guid watchlistId, Guid requestingUserId);
    Task<List<WatchlistDetailDto>> GetFriendWatchlistsAsync(Guid userId);
    Task<WatchlistActivitySummary> GetWatchlistActivityAsync(Guid watchlistId, Guid requestingUserId);
    Task<bool> ShareWatchlistWithUsersAsync(Guid watchlistId, Guid ownerId, List<Guid> userIds, WatchlistPermission permission);
}

public class PrivacyAwareWatchlistService : IPrivacyAwareWatchlistService
{
    private readonly IWatchlistService _baseWatchlistService;
    private readonly IUserPreferenceIntegrationService _preferenceService;
    private readonly ApplicationDbContext _context;
    private readonly IDistributedCache _cache;
    private readonly ILogger<PrivacyAwareWatchlistService> _logger;
    
    private readonly TimeSpan _privacyCheckCacheExpiration = TimeSpan.FromMinutes(10);

    public PrivacyAwareWatchlistService(
        IWatchlistService baseWatchlistService,
        IUserPreferenceIntegrationService preferenceService,
        ApplicationDbContext context,
        IDistributedCache cache,
        ILogger<PrivacyAwareWatchlistService> logger)
    {
        _baseWatchlistService = baseWatchlistService;
        _preferenceService = preferenceService;
        _context = context;
        _cache = cache;
        _logger = logger;
    }

    public async Task<WatchlistDetailDto> CreateWatchlistWithPrivacyAsync(Guid userId, CreateWatchlistDto dto)
    {
        try
        {
            // Get user's privacy preferences
            var privacyPrefs = await _preferenceService.GetPrivacyPreferencesAsync(userId);
            
            // Apply privacy defaults to watchlist creation
            var enhancedDto = new CreateWatchlistDto
            {
                Name = dto.Name,
                Description = dto.Description,
                CategoryId = dto.CategoryId,
                
                // Apply privacy preference defaults
                IsPublic = dto.IsPublic && privacyPrefs.WatchlistVisibility != "private",
                IsDefault = dto.IsDefault,
                IsFavorite = dto.IsFavorite,
                SortOrder = dto.SortOrder,
                SortDirection = dto.SortDirection
            };

            // If user prefers private watchlists, force privacy
            if (privacyPrefs.WatchlistVisibility == "private")
            {
                enhancedDto.IsPublic = false;
            }

            var watchlist = await _baseWatchlistService.CreateWatchlistAsync(userId, enhancedDto);

            // Apply additional privacy settings based on preferences
            await ApplyPrivacyPreferencesToWatchlistAsync(watchlist.Id, userId, privacyPrefs);

            _logger.LogInformation("Created privacy-aware watchlist {WatchlistId} for user {UserId} with visibility {Visibility}", 
                watchlist.Id, userId, privacyPrefs.WatchlistVisibility);

            return watchlist;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating privacy-aware watchlist for user {UserId}", userId);
            throw;
        }
    }

    public async Task<WatchlistDetailDto?> GetWatchlistWithPrivacyCheckAsync(Guid watchlistId, Guid requestingUserId)
    {
        try
        {
            // Check if user can access this watchlist
            var canAccess = await CanUserAccessWatchlistAsync(watchlistId, requestingUserId);
            if (!canAccess)
            {
                _logger.LogWarning("User {UserId} denied access to watchlist {WatchlistId} due to privacy settings", 
                    requestingUserId, watchlistId);
                return null;
            }

            // Get the watchlist through base service
            var watchlist = await _baseWatchlistService.GetWatchlistAsync(watchlistId, requestingUserId);
            if (watchlist == null) return null;

            // Apply privacy filtering to the returned data
            return await ApplyPrivacyFilteringToWatchlistAsync(watchlist, requestingUserId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting privacy-aware watchlist {WatchlistId} for user {UserId}", 
                watchlistId, requestingUserId);
            return null;
        }
    }

    public async Task<List<WatchlistSummaryDto>> GetUserWatchlistsWithPrivacyAsync(Guid userId, Guid? requestingUserId = null)
    {
        try
        {
            // If requesting user is different from owner, check privacy
            if (requestingUserId.HasValue && requestingUserId.Value != userId)
            {
                var ownerPrivacyPrefs = await _preferenceService.GetPrivacyPreferencesAsync(userId);
                
                // If owner has private watchlists, only show what they allow
                if (ownerPrivacyPrefs.WatchlistVisibility == "private")
                {
                    return new List<WatchlistSummaryDto>(); // Return empty list for private users
                }
                
                if (ownerPrivacyPrefs.WatchlistVisibility == "friends")
                {
                    // Check if requesting user is a friend
                    var areFriends = await AreUsersFriendsAsync(userId, requestingUserId.Value);
                    if (!areFriends)
                    {
                        return new List<WatchlistSummaryDto>();
                    }
                }
            }

            // Get watchlists from base service
            var watchlists = await _baseWatchlistService.GetUserWatchlistsAsync(userId);
            
            // Filter based on privacy settings if requesting user is different
            if (requestingUserId.HasValue && requestingUserId.Value != userId)
            {
                watchlists = await FilterWatchlistsByPrivacyAsync(watchlists, requestingUserId.Value);
            }

            _logger.LogDebug("Retrieved {Count} privacy-filtered watchlists for user {UserId}", 
                watchlists.Count, userId);

            return watchlists;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting privacy-aware watchlists for user {UserId}", userId);
            return new List<WatchlistSummaryDto>();
        }
    }

    public async Task<List<WatchlistSummaryDto>> GetPublicWatchlistsAsync(Guid? requestingUserId = null, int page = 1, int pageSize = 20)
    {
        try
        {
            var publicWatchlists = await _context.Watchlists
                .Where(w => w.IsPublic)
                .Include(w => w.User)
                .Include(w => w.Items)
                .OrderByDescending(w => w.UpdatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var result = new List<WatchlistSummaryDto>();

            foreach (var watchlist in publicWatchlists)
            {
                // Check owner's privacy preferences
                var ownerPrivacyPrefs = await _preferenceService.GetPrivacyPreferencesAsync(watchlist.UserId);
                
                // Respect owner's global sharing preferences
                if (!ownerPrivacyPrefs.AllowDataSharing && requestingUserId.HasValue && 
                    requestingUserId.Value != watchlist.UserId)
                {
                    continue; // Skip if owner doesn't allow data sharing
                }

                var summary = new WatchlistSummaryDto
                {
                    Id = watchlist.Id,
                    Name = watchlist.Name,
                    Description = watchlist.Description,
                    ItemCount = watchlist.Items.Count,
                    IsPublic = watchlist.IsPublic,
                    IsDefault = watchlist.IsDefault,
                    CreatedAt = watchlist.CreatedAt,
                    UpdatedAt = watchlist.UpdatedAt,
                    
                    // Apply privacy filtering to owner information
                    OwnerInfo = new OwnerInfoDto
                    {
                        UserId = watchlist.UserId,
                        UserName = watchlist.User?.UserName ?? "Unknown",
                        DisplayName = watchlist.User?.UserName,
                        AvatarUrl = null,
                        IsCurrentUser = requestingUserId == watchlist.UserId,
                        MemberSince = watchlist.User?.CreatedAt ?? DateTime.UtcNow
                    }
                };

                result.Add(summary);
            }

            _logger.LogDebug("Retrieved {Count} public watchlists with privacy filtering", result.Count);
            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting public watchlists with privacy filtering");
            return new List<WatchlistSummaryDto>();
        }
    }

    public async Task<WatchlistSharingInfo> GetWatchlistSharingInfoAsync(Guid watchlistId, Guid userId)
    {
        try
        {
            var watchlist = await _context.Watchlists
                .FirstOrDefaultAsync(w => w.Id == watchlistId && w.UserId == userId);

            if (watchlist == null)
            {
                throw new ArgumentException("Watchlist not found or not accessible");
            }

            var userPrivacyPrefs = await _preferenceService.GetPrivacyPreferencesAsync(userId);
            
            var sharingInfo = new WatchlistSharingInfo
            {
                WatchlistId = watchlistId,
                IsPublic = watchlist.IsPublic,
                CanShare = userPrivacyPrefs.AllowDataSharing,
                CurrentVisibility = userPrivacyPrefs.WatchlistVisibility,
                AllowedVisibilityOptions = GetAllowedVisibilityOptions(userPrivacyPrefs),
                SharingRestrictions = GetSharingRestrictions(userPrivacyPrefs)
            };

            return sharingInfo;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting sharing info for watchlist {WatchlistId}", watchlistId);
            throw;
        }
    }

    public async Task<bool> UpdateWatchlistPrivacyAsync(Guid watchlistId, Guid userId, WatchlistPrivacySettings settings)
    {
        try
        {
            var watchlist = await _context.Watchlists
                .FirstOrDefaultAsync(w => w.Id == watchlistId && w.UserId == userId);

            if (watchlist == null)
            {
                return false;
            }

            var userPrivacyPrefs = await _preferenceService.GetPrivacyPreferencesAsync(userId);
            
            // Validate privacy settings against user preferences
            if (!ValidatePrivacySettings(settings, userPrivacyPrefs))
            {
                _logger.LogWarning("Privacy settings validation failed for watchlist {WatchlistId}", watchlistId);
                return false;
            }

            // Update watchlist privacy settings
            watchlist.IsPublic = settings.IsPublic && userPrivacyPrefs.WatchlistVisibility != "private";
            watchlist.UpdatedAt = DateTime.UtcNow;
            watchlist.UpdatedBy = userId;

            await _context.SaveChangesAsync();

            // Clear relevant caches
            await InvalidateWatchlistCachesAsync(watchlistId, userId);

            _logger.LogInformation("Updated privacy settings for watchlist {WatchlistId}", watchlistId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating privacy settings for watchlist {WatchlistId}", watchlistId);
            return false;
        }
    }

    public async Task<bool> CanUserAccessWatchlistAsync(Guid watchlistId, Guid requestingUserId)
    {
        var cacheKey = $"watchlist_access:{watchlistId}:{requestingUserId}";
        var cachedResult = await _cache.GetStringAsync(cacheKey);
        
        if (!string.IsNullOrEmpty(cachedResult) && bool.TryParse(cachedResult, out var cached))
        {
            return cached;
        }

        try
        {
            var watchlist = await _context.Watchlists
                .FirstOrDefaultAsync(w => w.Id == watchlistId);

            if (watchlist == null)
            {
                return false;
            }

            // Owner always has access
            if (watchlist.UserId == requestingUserId)
            {
                await _cache.SetStringAsync(cacheKey, "true", new DistributedCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = _privacyCheckCacheExpiration
                });
                return true;
            }

            // Check if watchlist is public
            if (watchlist.IsPublic)
            {
                // Still need to check owner's privacy preferences
                var ownerPrivacyPrefs = await _preferenceService.GetPrivacyPreferencesAsync(watchlist.UserId);
                
                if (!ownerPrivacyPrefs.AllowDataSharing)
                {
                    await _cache.SetStringAsync(cacheKey, "false", new DistributedCacheEntryOptions
                    {
                        AbsoluteExpirationRelativeToNow = _privacyCheckCacheExpiration
                    });
                    return false;
                }

                await _cache.SetStringAsync(cacheKey, "true", new DistributedCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = _privacyCheckCacheExpiration
                });
                return true;
            }

            // Check owner's privacy preferences for non-public watchlists
            var privacyPrefs = await _preferenceService.GetPrivacyPreferencesAsync(watchlist.UserId);
            
            if (privacyPrefs.WatchlistVisibility == "friends")
            {
                var areFriends = await AreUsersFriendsAsync(watchlist.UserId, requestingUserId);
                await _cache.SetStringAsync(cacheKey, areFriends.ToString().ToLower(), new DistributedCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = _privacyCheckCacheExpiration
                });
                return areFriends;
            }

            // Default to no access for private watchlists
            await _cache.SetStringAsync(cacheKey, "false", new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = _privacyCheckCacheExpiration
            });
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking watchlist access for user {UserId} to watchlist {WatchlistId}", 
                requestingUserId, watchlistId);
            return false;
        }
    }

    public async Task<List<WatchlistDetailDto>> GetFriendWatchlistsAsync(Guid userId)
    {
        try
        {
            // Get user's friends (simplified - in real implementation this would use a proper friends system)
            var friendIds = await GetUserFriendsAsync(userId);
            
            if (!friendIds.Any())
            {
                return new List<WatchlistDetailDto>();
            }

            var friendWatchlists = new List<WatchlistDetailDto>();

            foreach (var friendId in friendIds)
            {
                var friendWatchlistSummaries = await GetUserWatchlistsWithPrivacyAsync(friendId, userId);
                
                // Convert summaries to details for friends
                foreach (var summary in friendWatchlistSummaries)
                {
                    var detail = await GetWatchlistWithPrivacyCheckAsync(summary.Id, userId);
                    if (detail != null)
                    {
                        friendWatchlists.Add(detail);
                    }
                }
            }

            _logger.LogDebug("Retrieved {Count} friend watchlists for user {UserId}", friendWatchlists.Count, userId);
            return friendWatchlists;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting friend watchlists for user {UserId}", userId);
            return new List<WatchlistDetailDto>();
        }
    }

    public async Task<WatchlistActivitySummary> GetWatchlistActivityAsync(Guid watchlistId, Guid requestingUserId)
    {
        try
        {
            // Check access first
            var canAccess = await CanUserAccessWatchlistAsync(watchlistId, requestingUserId);
            if (!canAccess)
            {
                return new WatchlistActivitySummary { WatchlistId = watchlistId, HasAccess = false };
            }

            var watchlist = await _context.Watchlists
                .Include(w => w.Activities.OrderByDescending(a => a.CreatedAt).Take(10))
                .FirstOrDefaultAsync(w => w.Id == watchlistId);

            if (watchlist == null)
            {
                return new WatchlistActivitySummary { WatchlistId = watchlistId, HasAccess = false };
            }

            // Get owner's privacy preferences to filter activity visibility
            var ownerPrivacyPrefs = await _preferenceService.GetPrivacyPreferencesAsync(watchlist.UserId);
            
            var activities = watchlist.Activities.ToList();
            
            // Filter activities based on privacy settings
            if (requestingUserId != watchlist.UserId && !ownerPrivacyPrefs.ShowRealTimeActivity)
            {
                // Only show basic activities, not detailed viewing history
                activities = activities.Where(a => 
                    a.ActivityType == "added" || 
                    a.ActivityType == "removed" ||
                    a.ActivityType == "created"
                ).ToList();
            }

            return new WatchlistActivitySummary
            {
                WatchlistId = watchlistId,
                HasAccess = true,
                RecentActivities = activities.Select(a => new ActivitySummary
                {
                    Type = a.ActivityType,
                    Description = a.Description,
                    CreatedAt = a.CreatedAt,
                    UserId = ownerPrivacyPrefs.ShowRealTimeActivity || requestingUserId == watchlist.UserId 
                        ? a.UserId : (Guid?)null
                }).ToList(),
                ShowsFullActivity = ownerPrivacyPrefs.ShowRealTimeActivity || requestingUserId == watchlist.UserId
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting watchlist activity for {WatchlistId}", watchlistId);
            return new WatchlistActivitySummary { WatchlistId = watchlistId, HasAccess = false };
        }
    }

    public async Task<bool> ShareWatchlistWithUsersAsync(Guid watchlistId, Guid ownerId, List<Guid> userIds, WatchlistPermission permission)
    {
        try
        {
            // Check owner's sharing preferences
            var ownerPrivacyPrefs = await _preferenceService.GetPrivacyPreferencesAsync(ownerId);
            
            if (!ownerPrivacyPrefs.AllowDataSharing)
            {
                _logger.LogWarning("User {UserId} attempted to share watchlist but has data sharing disabled", ownerId);
                return false;
            }

            // Verify watchlist ownership
            var watchlist = await _context.Watchlists
                .FirstOrDefaultAsync(w => w.Id == watchlistId && w.UserId == ownerId);

            if (watchlist == null)
            {
                return false;
            }

            // Create sharing records (simplified implementation)
            var sharingRecords = userIds.Select(userId => new Models.WatchlistShare
            {
                WatchlistId = watchlistId,
                SharedWithUserId = userId,
                PermissionLevel = permission.ToString().ToLower(),
                CreatedBy = ownerId,
                CreatedAt = DateTime.UtcNow
            }).ToList();

            _context.WatchlistShares.AddRange(sharingRecords);
            await _context.SaveChangesAsync();

            // Clear access caches for shared users
            foreach (var userId in userIds)
            {
                await _cache.RemoveAsync($"watchlist_access:{watchlistId}:{userId}");
            }

            _logger.LogInformation("Shared watchlist {WatchlistId} with {UserCount} users", watchlistId, userIds.Count);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sharing watchlist {WatchlistId} with users", watchlistId);
            return false;
        }
    }

    // Private helper methods

    private async Task ApplyPrivacyPreferencesToWatchlistAsync(Guid watchlistId, Guid userId, PrivacyPreferences privacyPrefs)
    {
        // Apply additional privacy settings based on user preferences
        // This could include setting up notification preferences, activity tracking, etc.
        
        if (!privacyPrefs.ShowRealTimeActivity)
        {
            // Disable activity tracking for this watchlist
            await _context.WatchlistSettings
                .Where(s => s.WatchlistId == watchlistId)
                .ExecuteUpdateAsync(s => s.SetProperty(p => p.TrackActivity, false));
        }
    }

    private async Task<WatchlistDetailDto> ApplyPrivacyFilteringToWatchlistAsync(WatchlistDetailDto watchlist, Guid requestingUserId)
    {
        // Apply privacy filtering to sensitive information
        if (requestingUserId != watchlist.UserId)
        {
            var ownerPrivacyPrefs = await _preferenceService.GetPrivacyPreferencesAsync(watchlist.UserId);
            
            if (!ownerPrivacyPrefs.ShowRealTimeActivity)
            {
                // Remove or anonymize sensitive activity data
                watchlist.RecentActivity = new List<WatchlistActivityDto>();
            }
        }

        return watchlist;
    }

    private async Task<List<WatchlistSummaryDto>> FilterWatchlistsByPrivacyAsync(List<WatchlistSummaryDto> watchlists, Guid requestingUserId)
    {
        var filteredWatchlists = new List<WatchlistSummaryDto>();

        foreach (var watchlist in watchlists)
        {
            var canAccess = await CanUserAccessWatchlistAsync(watchlist.Id, requestingUserId);
            if (canAccess)
            {
                filteredWatchlists.Add(watchlist);
            }
        }

        return filteredWatchlists;
    }

    private async Task<bool> AreUsersFriendsAsync(Guid userId1, Guid userId2)
    {
        // Simplified friends check - in a real implementation this would check a proper friends/connections table
        // For now, assume users can be friends if they both have privacy settings that allow it
        var user1Prefs = await _preferenceService.GetPrivacyPreferencesAsync(userId1);
        var user2Prefs = await _preferenceService.GetPrivacyPreferencesAsync(userId2);
        
        return user1Prefs.AllowProfileLinking && user2Prefs.AllowProfileLinking;
    }

    private async Task<List<Guid>> GetUserFriendsAsync(Guid userId)
    {
        // Simplified friends retrieval - in a real implementation this would query a friends table
        // For now, return empty list
        return new List<Guid>();
    }

    private async Task<WatchlistUserInfoDto> GetFilteredOwnerInfoAsync(User owner, PrivacyPreferences privacyPrefs, Guid? requestingUserId)
    {
        return new WatchlistUserInfoDto
        {
            Id = owner.Id,
            Username = privacyPrefs.AllowProfileLinking || requestingUserId == owner.Id ? owner.UserName : "Anonymous",
            DisplayName = privacyPrefs.AllowProfileLinking || requestingUserId == owner.Id ? owner.UserName : "Anonymous User",
            ShowsPublicProfile = privacyPrefs.AllowProfileLinking
        };
    }

    private List<string> GetAllowedVisibilityOptions(PrivacyPreferences privacyPrefs)
    {
        var options = new List<string> { "private" };
        
        if (privacyPrefs.AllowDataSharing)
        {
            options.Add("friends");
            options.Add("public");
        }
        
        return options;
    }

    private List<string> GetSharingRestrictions(PrivacyPreferences privacyPrefs)
    {
        var restrictions = new List<string>();
        
        if (!privacyPrefs.AllowDataSharing)
        {
            restrictions.Add("Data sharing disabled in privacy settings");
        }
        
        if (!privacyPrefs.ShowRealTimeActivity)
        {
            restrictions.Add("Activity visibility limited");
        }
        
        return restrictions;
    }

    private bool ValidatePrivacySettings(WatchlistPrivacySettings settings, PrivacyPreferences userPrefs)
    {
        // Validate that requested settings don't violate user's privacy preferences
        if (settings.IsPublic && userPrefs.WatchlistVisibility == "private")
        {
            return false;
        }
        
        if (settings.IsPublic && !userPrefs.AllowDataSharing)
        {
            return false;
        }
        
        return true;
    }

    private async Task InvalidateWatchlistCachesAsync(Guid watchlistId, Guid userId)
    {
        var keysToRemove = new[]
        {
            $"watchlist:{watchlistId}:{userId}",
            $"watchlist_access:{watchlistId}:{userId}",
            $"user_watchlists:{userId}"
        };

        foreach (var key in keysToRemove)
        {
            await _cache.RemoveAsync(key);
        }
    }
}

// Supporting models for privacy-aware watchlist operations

public class WatchlistSharingInfo
{
    public Guid WatchlistId { get; set; }
    public bool IsPublic { get; set; }
    public bool CanShare { get; set; }
    public string CurrentVisibility { get; set; } = "private";
    public List<string> AllowedVisibilityOptions { get; set; } = new();
    public List<string> SharingRestrictions { get; set; } = new();
}

public class WatchlistPrivacySettings
{
    public bool IsPublic { get; set; }
    public bool AllowSharing { get; set; }
    public bool TrackActivity { get; set; } = true;
    public List<Guid> SharedWithUsers { get; set; } = new();
}

public class WatchlistActivitySummary
{
    public Guid WatchlistId { get; set; }
    public bool HasAccess { get; set; }
    public List<ActivitySummary> RecentActivities { get; set; } = new();
    public bool ShowsFullActivity { get; set; }
}

public class ActivitySummary
{
    public string Type { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public Guid? UserId { get; set; } // Null if privacy settings hide user identity
}

public class WatchlistUserInfoDto
{
    public Guid Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public bool ShowsPublicProfile { get; set; }
}

public class WatchlistShare
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid WatchlistId { get; set; }
    public Guid SharedWithUserId { get; set; }
    public Guid SharedByUserId { get; set; }
    public WatchlistPermission Permission { get; set; }
    public DateTime SharedAt { get; set; } = DateTime.UtcNow;
}

public class WatchlistSettings
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid WatchlistId { get; set; }
    public bool TrackActivity { get; set; } = true;
    public bool AllowNotifications { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public enum WatchlistPermission
{
    View = 1,
    Edit = 2,
    Share = 3,
    Admin = 4
}