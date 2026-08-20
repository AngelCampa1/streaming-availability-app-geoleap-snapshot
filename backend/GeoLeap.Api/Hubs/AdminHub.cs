using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Authorization;
using GeoLeap.Api.Services;
using System.Security.Claims;

namespace GeoLeap.Api.Hubs;

/// <summary>
/// SignalR hub for real-time admin notifications and updates
/// </summary>
[Authorize]
public class AdminHub : Hub
{
    private readonly IAdminNotificationService _notificationService;
    private readonly ILogger<AdminHub> _logger;

    public AdminHub(
        IAdminNotificationService notificationService,
        ILogger<AdminHub> logger)
    {
        _notificationService = notificationService;
        _logger = logger;
    }

    public override async Task OnConnectedAsync()
    {
        var userId = GetCurrentUserId();
        var correlationId = Context.ConnectionId;
        
        _logger.LogInformation("Admin user connected to real-time notifications", 
            new { UserId = userId, ConnectionId = Context.ConnectionId });

        if (userId != null)
        {
            // Add user to admin group for system-wide notifications
            await Groups.AddToGroupAsync(Context.ConnectionId, "AdminUsers");
            
            // Subscribe to user-specific notifications
            await _notificationService.SubscribeToRealtimeNotificationsAsync(
                userId.Value, Context.ConnectionId, correlationId);
            
            // Send current unread count
            var unreadCount = await _notificationService.GetUnreadCountAsync(userId.Value, correlationId);
            await Clients.Caller.SendAsync("UnreadCount", unreadCount);
        }

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = GetCurrentUserId();
        var correlationId = Context.ConnectionId;
        
        _logger.LogInformation("Admin user disconnected from real-time notifications", 
            new { UserId = userId, ConnectionId = Context.ConnectionId, Exception = exception?.Message });

        if (userId != null)
        {
            // Remove user from admin group
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, "AdminUsers");
            
            // Unsubscribe from user-specific notifications
            await _notificationService.UnsubscribeFromRealtimeNotificationsAsync(
                userId.Value, Context.ConnectionId, correlationId);
        }

        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// Join a specific notification group (e.g., for specific alert types)
    /// </summary>
    public async Task JoinGroup(string groupName)
    {
        var userId = GetCurrentUserId();
        
        _logger.LogInformation("Admin user joining notification group", 
            new { UserId = userId, ConnectionId = Context.ConnectionId, GroupName = groupName });

        await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
        await Clients.Caller.SendAsync("JoinedGroup", groupName);
    }

    /// <summary>
    /// Leave a specific notification group
    /// </summary>
    public async Task LeaveGroup(string groupName)
    {
        var userId = GetCurrentUserId();
        
        _logger.LogInformation("Admin user leaving notification group", 
            new { UserId = userId, ConnectionId = Context.ConnectionId, GroupName = groupName });

        await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);
        await Clients.Caller.SendAsync("LeftGroup", groupName);
    }

    /// <summary>
    /// Subscribe to specific notification types
    /// </summary>
    public async Task SubscribeToNotificationType(string notificationType)
    {
        var userId = GetCurrentUserId();
        
        _logger.LogInformation("Admin user subscribing to notification type", 
            new { UserId = userId, ConnectionId = Context.ConnectionId, NotificationType = notificationType });

        var groupName = $"NotificationType_{notificationType}";
        await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
        await Clients.Caller.SendAsync("SubscribedToType", notificationType);
    }

    /// <summary>
    /// Unsubscribe from specific notification types
    /// </summary>
    public async Task UnsubscribeFromNotificationType(string notificationType)
    {
        var userId = GetCurrentUserId();
        
        _logger.LogInformation("Admin user unsubscribing from notification type", 
            new { UserId = userId, ConnectionId = Context.ConnectionId, NotificationType = notificationType });

        var groupName = $"NotificationType_{notificationType}";
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);
        await Clients.Caller.SendAsync("UnsubscribedFromType", notificationType);
    }

    /// <summary>
    /// Ping to keep connection alive and get current status
    /// </summary>
    public async Task Ping()
    {
        var userId = GetCurrentUserId();
        var correlationId = Context.ConnectionId;
        
        var response = new
        {
            Timestamp = DateTime.UtcNow,
            UserId = userId,
            ConnectionId = Context.ConnectionId,
            Status = "Connected",
            UnreadCount = 0
        };

        if (userId != null)
        {
            var unreadCount = await _notificationService.GetUnreadCountAsync(userId.Value, correlationId);
            response = new 
            {
                response.Timestamp,
                response.UserId,
                response.ConnectionId,
                response.Status,
                UnreadCount = unreadCount
            };
        }

        await Clients.Caller.SendAsync("Pong", response);
    }

    /// <summary>
    /// Request recent notifications
    /// </summary>
    public async Task RequestRecentNotifications(int count = 10)
    {
        var userId = GetCurrentUserId();
        var correlationId = Context.ConnectionId;
        
        if (userId == null)
        {
            await Clients.Caller.SendAsync("Error", "User not authenticated");
            return;
        }

        try
        {
            var notifications = await _notificationService.GetNotificationsAsync(
                userId.Value, unreadOnly: false, page: 1, pageSize: count, correlationId: correlationId);
            
            await Clients.Caller.SendAsync("RecentNotifications", notifications);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving recent notifications for user {UserId}", userId);
            await Clients.Caller.SendAsync("Error", "Failed to retrieve recent notifications");
        }
    }

    /// <summary>
    /// Mark notification as read via SignalR
    /// </summary>
    public async Task MarkNotificationAsRead(Guid notificationId)
    {
        var userId = GetCurrentUserId();
        var correlationId = Context.ConnectionId;
        
        if (userId == null)
        {
            await Clients.Caller.SendAsync("Error", "User not authenticated");
            return;
        }

        try
        {
            var success = await _notificationService.MarkAsReadAsync(notificationId, userId.Value, correlationId);
            
            if (success)
            {
                var unreadCount = await _notificationService.GetUnreadCountAsync(userId.Value, correlationId);
                await Clients.Caller.SendAsync("NotificationMarkedAsRead", new { NotificationId = notificationId });
                await Clients.Caller.SendAsync("UnreadCount", unreadCount);
            }
            else
            {
                await Clients.Caller.SendAsync("Error", "Failed to mark notification as read");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error marking notification as read: {NotificationId} for user {UserId}", 
                notificationId, userId);
            await Clients.Caller.SendAsync("Error", "Failed to mark notification as read");
        }
    }

    private Guid? GetCurrentUserId()
    {
        var userIdClaim = Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(userIdClaim, out var userId) ? userId : null;
    }
}