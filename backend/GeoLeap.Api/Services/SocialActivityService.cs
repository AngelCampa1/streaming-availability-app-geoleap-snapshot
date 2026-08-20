using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.SignalR;
using Microsoft.Extensions.Caching.Memory;
using GeoLeap.Api.Hubs;

namespace GeoLeap.Api.Services;

/// <summary>
/// Real-time social activity aggregation service implementation
/// </summary>
public class SocialActivityService : ISocialActivityService
{
    private readonly ApplicationDbContext _context;
    private readonly ILoggerService _logger;
    private readonly IHubContext<SocialActivityHub> _hubContext;
    private readonly IMemoryCache _memoryCache;
    private static readonly Dictionary<string, string> _connectionUserMap = new();
    private static readonly object _connectionLock = new();

    public SocialActivityService(
        ApplicationDbContext context,
        ILoggerService logger,
        IHubContext<SocialActivityHub> hubContext,
        IMemoryCache memoryCache)
    {
        _context = context;
        _logger = logger;
        _hubContext = hubContext;
        _memoryCache = memoryCache;
    }

    public async Task TrackActivityAsync(SocialActivity activity)
    {
        try
        {
            _context.SocialActivities.Add(activity);
            await _context.SaveChangesAsync();

            // Notify real-time subscribers
            await NotifyActivitySubscribersAsync(activity);

            // Update trending activities cache
            await UpdateTrendingActivitiesCacheAsync(activity);

            _logger.LogBusinessEvent("SocialActivityTracked", new 
            { 
                UserId = activity.UserId,
                Platform = activity.Platform,
                ActivityType = activity.ActivityType,
                ContentId = activity.ContentId
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error tracking social activity for user {UserId}", activity.UserId);
        }
    }

    public async Task<List<SocialActivity>> GetActivityFeedAsync(Guid userId, int limit = 50, DateTime? since = null)
    {
        try
        {
            var cacheKey = $"activity_feed_{userId}_{limit}_{since?.Ticks}";
            if (_memoryCache.TryGetValue(cacheKey, out List<SocialActivity>? cachedFeed))
            {
                return cachedFeed ?? new List<SocialActivity>();
            }

            var query = _context.SocialActivities
                .Where(a => a.UserId == userId && a.IsPublic);

            if (since.HasValue)
            {
                query = query.Where(a => a.CreatedAt >= since.Value);
            }

            var activities = await query
                .OrderByDescending(a => a.CreatedAt)
                .Take(limit)
                .ToListAsync();

            // Cache for 5 minutes
            _memoryCache.Set(cacheKey, activities, TimeSpan.FromMinutes(5));

            return activities;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving activity feed for user {UserId}", userId);
            return new List<SocialActivity>();
        }
    }

    public async Task<List<SocialActivity>> GetNetworkActivityFeedAsync(Guid userId, int limit = 50, DateTime? since = null)
    {
        try
        {
            // Get user's social network connections
            var networkUserIds = await _context.SocialGraphConnections
                .Where(g => g.FromUserId == userId || g.ToUserId == userId)
                .Select(g => g.FromUserId == userId ? g.ToUserId : g.FromUserId)
                .Distinct()
                .ToListAsync();

            networkUserIds.Add(userId); // Include user's own activities

            var query = _context.SocialActivities
                .Where(a => networkUserIds.Contains(a.UserId) && a.IsPublic);

            if (since.HasValue)
            {
                query = query.Where(a => a.CreatedAt >= since.Value);
            }

            var activities = await query
                .Include(a => a.User)
                .OrderByDescending(a => a.CreatedAt)
                .Take(limit)
                .ToListAsync();

            return activities;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving network activity feed for user {UserId}", userId);
            return new List<SocialActivity>();
        }
    }

    public async Task<List<TrendingActivity>> GetTrendingActivitiesAsync(TimeSpan timeWindow, int limit = 20)
    {
        try
        {
            var cacheKey = $"trending_activities_{timeWindow.TotalHours}_{limit}";
            if (_memoryCache.TryGetValue(cacheKey, out List<TrendingActivity>? cachedTrending))
            {
                return cachedTrending ?? new List<TrendingActivity>();
            }

            var cutoffTime = DateTime.UtcNow.Subtract(timeWindow);

            var trendingData = await _context.SocialActivities
                .Where(a => a.CreatedAt >= cutoffTime && a.IsPublic)
                .GroupBy(a => new 
                { 
                    a.ActivityType, 
                    a.ContentId, 
                    a.ContentTitle, 
                    a.Platform 
                })
                .Select(g => new
                {
                    g.Key.ActivityType,
                    g.Key.ContentId,
                    g.Key.ContentTitle,
                    g.Key.Platform,
                    ActivityCount = g.Count(),
                    UniqueUsers = g.Select(a => a.UserId).Distinct().Count(),
                    LastActivity = g.Max(a => a.CreatedAt)
                })
                .Where(t => t.ActivityCount >= 3) // Minimum threshold for trending
                .OrderByDescending(t => t.ActivityCount * t.UniqueUsers)
                .Take(limit)
                .ToListAsync();

            var trending = trendingData.Select(t => new TrendingActivity
            {
                ActivityType = t.ActivityType,
                ContentId = t.ContentId,
                ContentTitle = t.ContentTitle,
                Platform = t.Platform,
                ActivityCount = t.ActivityCount,
                UniqueUsers = t.UniqueUsers,
                TrendingScore = CalculateTrendingScore(t.ActivityCount, t.UniqueUsers, t.LastActivity),
                LastActivity = t.LastActivity
            })
            .OrderByDescending(t => t.TrendingScore)
            .ToList();

            // Cache for 10 minutes
            _memoryCache.Set(cacheKey, trending, TimeSpan.FromMinutes(10));

            return trending;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving trending activities");
            return new List<TrendingActivity>();
        }
    }

    public async Task<ActivityAnalytics> GetActivityAnalyticsAsync(Guid userId, DateTime? startDate = null, DateTime? endDate = null)
    {
        try
        {
            startDate ??= DateTime.UtcNow.AddDays(-30);
            endDate ??= DateTime.UtcNow;

            var activities = await _context.SocialActivities
                .Where(a => a.UserId == userId && 
                           a.CreatedAt >= startDate && 
                           a.CreatedAt <= endDate)
                .ToListAsync();

            var activitiesByType = activities
                .GroupBy(a => a.ActivityType)
                .ToDictionary(g => g.Key, g => g.Count());

            var activitiesByPlatform = activities
                .GroupBy(a => a.Platform)
                .ToDictionary(g => g.Key, g => g.Count());

            var dailyActivity = activities
                .GroupBy(a => a.CreatedAt.Date)
                .ToDictionary(g => g.Key, g => g.Count());

            var totalDays = (endDate.Value - startDate.Value).TotalDays;
            var averagePerDay = totalDays > 0 ? activities.Count / totalDays : 0;

            var mostActiveHour = activities
                .GroupBy(a => a.CreatedAt.Hour)
                .OrderByDescending(g => g.Count())
                .FirstOrDefault()?.Key ?? 12;

            return new ActivityAnalytics
            {
                UserId = userId,
                TotalActivities = activities.Count,
                ActivitiesByType = activitiesByType,
                ActivitiesByPlatform = activitiesByPlatform,
                DailyActivity = dailyActivity,
                AverageActivitiesPerDay = averagePerDay,
                LastActivityAt = activities.MaxBy(a => a.CreatedAt)?.CreatedAt,
                MostActiveTimeOfDay = $"{mostActiveHour:00}:00"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving activity analytics for user {UserId}", userId);
            return new ActivityAnalytics { UserId = userId };
        }
    }

    public async Task SubscribeToActivityUpdatesAsync(Guid userId, string connectionId)
    {
        try
        {
            lock (_connectionLock)
            {
                _connectionUserMap[connectionId] = userId.ToString();
            }

            await _hubContext.Groups.AddToGroupAsync(connectionId, $"user_{userId}");
            
            _logger.LogBusinessEvent("ActivitySubscriptionAdded", new 
            { 
                UserId = userId,
                ConnectionId = connectionId 
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error subscribing to activity updates for user {UserId}", userId);
        }
    }

    public async Task UnsubscribeFromActivityUpdatesAsync(string connectionId)
    {
        try
        {
            string? userId = null;
            lock (_connectionLock)
            {
                if (_connectionUserMap.TryGetValue(connectionId, out userId))
                {
                    _connectionUserMap.Remove(connectionId);
                }
            }

            if (userId != null)
            {
                await _hubContext.Groups.RemoveFromGroupAsync(connectionId, $"user_{userId}");
            }

            _logger.LogBusinessEvent("ActivitySubscriptionRemoved", new 
            { 
                UserId = userId,
                ConnectionId = connectionId 
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error unsubscribing from activity updates for connection {ConnectionId}", connectionId);
        }
    }

    // Private helper methods
    private async Task NotifyActivitySubscribersAsync(SocialActivity activity)
    {
        try
        {
            // Notify user's own subscribers
            await _hubContext.Clients.Group($"user_{activity.UserId}")
                .SendAsync("ActivityUpdate", new
                {
                    activity.Id,
                    activity.UserId,
                    activity.Platform,
                    activity.ActivityType,
                    activity.ContentId,
                    activity.ContentTitle,
                    activity.ContentType,
                    activity.Description,
                    activity.CreatedAt,
                    activity.IsPublic
                });

            // Notify network connections if activity is public
            if (activity.IsPublic)
            {
                var networkUserIds = await _context.SocialGraphConnections
                    .Where(g => g.FromUserId == activity.UserId || g.ToUserId == activity.UserId)
                    .Select(g => g.FromUserId == activity.UserId ? g.ToUserId : g.FromUserId)
                    .ToListAsync();

                foreach (var networkUserId in networkUserIds)
                {
                    await _hubContext.Clients.Group($"user_{networkUserId}")
                        .SendAsync("NetworkActivityUpdate", new
                        {
                            activity.Id,
                            activity.UserId,
                            activity.Platform,
                            activity.ActivityType,
                            activity.ContentId,
                            activity.ContentTitle,
                            activity.ContentType,
                            activity.Description,
                            activity.CreatedAt,
                            UserDisplayName = activity.User?.Email ?? "Unknown User"
                        });
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error notifying activity subscribers");
        }
    }

    private async Task UpdateTrendingActivitiesCacheAsync(SocialActivity activity)
    {
        try
        {
            // Invalidate trending activities cache to force refresh
            var cacheKeysToRemove = new[]
            {
                "trending_activities_1_20",
                "trending_activities_6_20",
                "trending_activities_24_20"
            };

            foreach (var key in cacheKeysToRemove)
            {
                _memoryCache.Remove(key);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating trending activities cache");
        }
    }

    private double CalculateTrendingScore(int activityCount, int uniqueUsers, DateTime lastActivity)
    {
        var recencyHours = (DateTime.UtcNow - lastActivity).TotalHours;
        var recencyScore = Math.Max(0, 24 - recencyHours) / 24.0; // Decay over 24 hours
        var engagementScore = Math.Log10(activityCount + 1) * Math.Log10(uniqueUsers + 1);
        
        return engagementScore * (0.7 + recencyScore * 0.3);
    }
}

/// <summary>
/// SignalR Hub for real-time social activity updates
/// </summary>
public class SocialActivityHub : Hub
{
    private readonly ISocialActivityService _activityService;

    public SocialActivityHub(ISocialActivityService activityService)
    {
        _activityService = activityService;
    }

    public async Task SubscribeToActivities(string userId)
    {
        if (Guid.TryParse(userId, out var userGuid))
        {
            await _activityService.SubscribeToActivityUpdatesAsync(userGuid, Context.ConnectionId);
        }
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        await _activityService.UnsubscribeFromActivityUpdatesAsync(Context.ConnectionId);
        await base.OnDisconnectedAsync(exception);
    }
}