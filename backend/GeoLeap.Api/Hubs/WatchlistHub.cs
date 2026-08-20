using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Authorization;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using System.Security.Claims;

namespace GeoLeap.Api.Hubs;

/// <summary>
/// SignalR hub for real-time watchlist updates and notifications
/// </summary>
[Authorize]
public class WatchlistHub : Hub
{
    private readonly IWatchlistService _watchlistService;
    private readonly ILogger<WatchlistHub> _logger;

    public WatchlistHub(IWatchlistService watchlistService, ILogger<WatchlistHub> logger)
    {
        _watchlistService = watchlistService;
        _logger = logger;
    }

    /// <summary>
    /// Called when client connects to the hub
    /// </summary>
    public override async Task OnConnectedAsync()
    {
        try
        {
            var userId = GetCurrentUserId();
            var userIdString = userId.ToString();

            // Join user-specific group for personalized notifications
            await Groups.AddToGroupAsync(Context.ConnectionId, $"user_{userIdString}");

            // Join groups for shared watchlists
            var watchlists = await _watchlistService.GetUserWatchlistsAsync(userId, includeShared: true);
            var sharedWatchlists = watchlists.Where(w => w.UserId != userId);

            foreach (var watchlist in sharedWatchlists)
            {
                await Groups.AddToGroupAsync(Context.ConnectionId, $"watchlist_{watchlist.Id}");
            }

            _logger.LogInformation("User {UserId} connected to WatchlistHub", userId);
            await base.OnConnectedAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during WatchlistHub connection");
            throw;
        }
    }

    /// <summary>
    /// Called when client disconnects from the hub
    /// </summary>
    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        try
        {
            var userId = GetCurrentUserId();
            _logger.LogInformation("User {UserId} disconnected from WatchlistHub", userId);
            await base.OnDisconnectedAsync(exception);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during WatchlistHub disconnection");
        }
    }

    /// <summary>
    /// Join a specific watchlist group for real-time updates
    /// </summary>
    public async Task JoinWatchlistGroup(string watchlistId)
    {
        try
        {
            if (!Guid.TryParse(watchlistId, out var parsedWatchlistId))
            {
                await Clients.Caller.SendAsync("Error", "Invalid watchlist ID");
                return;
            }

            var userId = GetCurrentUserId();
            
            // Verify user has access to this watchlist
            var watchlist = await _watchlistService.GetWatchlistAsync(parsedWatchlistId, userId);
            if (watchlist == null)
            {
                await Clients.Caller.SendAsync("Error", "Watchlist not found or not accessible");
                return;
            }

            await Groups.AddToGroupAsync(Context.ConnectionId, $"watchlist_{watchlistId}");
            await Clients.Caller.SendAsync("JoinedWatchlistGroup", watchlistId);
            
            _logger.LogInformation("User {UserId} joined watchlist group {WatchlistId}", userId, watchlistId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error joining watchlist group {WatchlistId}", watchlistId);
            await Clients.Caller.SendAsync("Error", "Failed to join watchlist group");
        }
    }

    /// <summary>
    /// Leave a specific watchlist group
    /// </summary>
    public async Task LeaveWatchlistGroup(string watchlistId)
    {
        try
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"watchlist_{watchlistId}");
            await Clients.Caller.SendAsync("LeftWatchlistGroup", watchlistId);
            
            var userId = GetCurrentUserId();
            _logger.LogInformation("User {UserId} left watchlist group {WatchlistId}", userId, watchlistId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error leaving watchlist group {WatchlistId}", watchlistId);
            await Clients.Caller.SendAsync("Error", "Failed to leave watchlist group");
        }
    }

    /// <summary>
    /// Send typing indicator when user is editing watchlist
    /// </summary>
    public async Task SendTypingIndicator(string watchlistId, string action)
    {
        try
        {
            var userId = GetCurrentUserId();
            var userName = Context.User?.Identity?.Name ?? "Unknown";

            await Clients.OthersInGroup($"watchlist_{watchlistId}")
                .SendAsync("TypingIndicator", new
                {
                    UserId = userId,
                    UserName = userName,
                    Action = action, // "editing_item", "editing_watchlist", etc.
                    Timestamp = DateTime.UtcNow
                });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending typing indicator");
        }
    }

    /// <summary>
    /// Request current online users for a watchlist
    /// </summary>
    public async Task GetOnlineUsers(string watchlistId)
    {
        try
        {
            // This would require tracking online users - simplified implementation
            var userId = GetCurrentUserId();
            await Clients.Caller.SendAsync("OnlineUsers", new { WatchlistId = watchlistId, Count = 1 });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting online users for watchlist {WatchlistId}", watchlistId);
        }
    }

    /// <summary>
    /// Send a comment or note about a watchlist item
    /// </summary>
    public async Task SendItemComment(string watchlistId, string itemId, string comment)
    {
        try
        {
            if (string.IsNullOrWhiteSpace(comment))
            {
                await Clients.Caller.SendAsync("Error", "Comment cannot be empty");
                return;
            }

            var userId = GetCurrentUserId();
            var userName = Context.User?.Identity?.Name ?? "Unknown";

            var commentData = new
            {
                WatchlistId = watchlistId,
                ItemId = itemId,
                Comment = comment,
                UserId = userId,
                UserName = userName,
                Timestamp = DateTime.UtcNow
            };

            await Clients.Group($"watchlist_{watchlistId}")
                .SendAsync("ItemComment", commentData);

            _logger.LogInformation("User {UserId} commented on item {ItemId} in watchlist {WatchlistId}", 
                userId, itemId, watchlistId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending item comment");
            await Clients.Caller.SendAsync("Error", "Failed to send comment");
        }
    }

    private Guid GetCurrentUserId()
    {
        var userIdClaim = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            throw new UnauthorizedAccessException("User ID not found in token");
        }
        return userId;
    }
}

/// <summary>
/// Service for sending real-time notifications through SignalR
/// </summary>
public interface IWatchlistRealtimeService
{
    Task NotifyWatchlistUpdatedAsync(Guid watchlistId, string updateType, object data);
    Task NotifyItemAddedAsync(Guid watchlistId, WatchlistItemDto item);
    Task NotifyItemUpdatedAsync(Guid watchlistId, WatchlistItemDto item);
    Task NotifyItemRemovedAsync(Guid watchlistId, Guid itemId, string itemTitle);
    Task NotifyAvailabilityChangedAsync(Guid userId, WatchlistItemDto item);
    Task NotifyWatchlistSharedAsync(Guid targetUserId, WatchlistDetailDto watchlist);
}

/// <summary>
/// Implementation of real-time notification service
/// </summary>
public class WatchlistRealtimeService : IWatchlistRealtimeService
{
    private readonly IHubContext<WatchlistHub> _hubContext;
    private readonly ILogger<WatchlistRealtimeService> _logger;

    public WatchlistRealtimeService(IHubContext<WatchlistHub> hubContext, ILogger<WatchlistRealtimeService> logger)
    {
        _hubContext = hubContext;
        _logger = logger;
    }

    public async Task NotifyWatchlistUpdatedAsync(Guid watchlistId, string updateType, object data)
    {
        try
        {
            await _hubContext.Clients.Group($"watchlist_{watchlistId}")
                .SendAsync("WatchlistUpdated", new
                {
                    WatchlistId = watchlistId,
                    UpdateType = updateType,
                    Data = data,
                    Timestamp = DateTime.UtcNow
                });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error notifying watchlist update for {WatchlistId}", watchlistId);
        }
    }

    public async Task NotifyItemAddedAsync(Guid watchlistId, WatchlistItemDto item)
    {
        try
        {
            await _hubContext.Clients.Group($"watchlist_{watchlistId}")
                .SendAsync("ItemAdded", new
                {
                    WatchlistId = watchlistId,
                    Item = item,
                    Timestamp = DateTime.UtcNow
                });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error notifying item added for watchlist {WatchlistId}", watchlistId);
        }
    }

    public async Task NotifyItemUpdatedAsync(Guid watchlistId, WatchlistItemDto item)
    {
        try
        {
            await _hubContext.Clients.Group($"watchlist_{watchlistId}")
                .SendAsync("ItemUpdated", new
                {
                    WatchlistId = watchlistId,
                    Item = item,
                    Timestamp = DateTime.UtcNow
                });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error notifying item updated for watchlist {WatchlistId}", watchlistId);
        }
    }

    public async Task NotifyItemRemovedAsync(Guid watchlistId, Guid itemId, string itemTitle)
    {
        try
        {
            await _hubContext.Clients.Group($"watchlist_{watchlistId}")
                .SendAsync("ItemRemoved", new
                {
                    WatchlistId = watchlistId,
                    ItemId = itemId,
                    ItemTitle = itemTitle,
                    Timestamp = DateTime.UtcNow
                });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error notifying item removed for watchlist {WatchlistId}", watchlistId);
        }
    }

    public async Task NotifyAvailabilityChangedAsync(Guid userId, WatchlistItemDto item)
    {
        try
        {
            await _hubContext.Clients.Group($"user_{userId}")
                .SendAsync("AvailabilityChanged", new
                {
                    Item = item,
                    Timestamp = DateTime.UtcNow
                });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error notifying availability change for user {UserId}", userId);
        }
    }

    public async Task NotifyWatchlistSharedAsync(Guid targetUserId, WatchlistDetailDto watchlist)
    {
        try
        {
            await _hubContext.Clients.Group($"user_{targetUserId}")
                .SendAsync("WatchlistShared", new
                {
                    Watchlist = watchlist,
                    Timestamp = DateTime.UtcNow
                });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error notifying watchlist share for user {UserId}", targetUserId);
        }
    }
}