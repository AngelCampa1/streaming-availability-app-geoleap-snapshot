using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using GeoLeap.Api.Models;

namespace GeoLeap.Api.Hubs;

/// <summary>
/// SignalR hub for real-time preference synchronization across devices
/// </summary>
[Authorize]
public class PreferencesHub : Hub
{
    private readonly ILogger<PreferencesHub> _logger;
    
    public PreferencesHub(ILogger<PreferencesHub> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Join a user-specific group for receiving preference updates
    /// </summary>
    public async Task JoinUserPreferenceGroup()
    {
        var userId = GetUserId();
        if (userId != null)
        {
            var groupName = $"user_preferences_{userId}";
            await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
            _logger.LogInformation("User {UserId} joined preference group {GroupName}", userId, groupName);
        }
    }

    /// <summary>
    /// Leave the user-specific preference group
    /// </summary>
    public async Task LeaveUserPreferenceGroup()
    {
        var userId = GetUserId();
        if (userId != null)
        {
            var groupName = $"user_preferences_{userId}";
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);
            _logger.LogInformation("User {UserId} left preference group {GroupName}", userId, groupName);
        }
    }

    /// <summary>
    /// Subscribe to specific preference category updates
    /// </summary>
    public async Task SubscribeToCategory(string categoryKey)
    {
        var userId = GetUserId();
        if (userId != null)
        {
            var groupName = $"user_preferences_{userId}_{categoryKey}";
            await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
            _logger.LogInformation("User {UserId} subscribed to category {CategoryKey}", userId, categoryKey);
        }
    }

    /// <summary>
    /// Unsubscribe from specific preference category updates
    /// </summary>
    public async Task UnsubscribeFromCategory(string categoryKey)
    {
        var userId = GetUserId();
        if (userId != null)
        {
            var groupName = $"user_preferences_{userId}_{categoryKey}";
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, groupName);
            _logger.LogInformation("User {UserId} unsubscribed from category {CategoryKey}", userId, categoryKey);
        }
    }

    /// <summary>
    /// Request current preference values for synchronization
    /// </summary>
    public async Task RequestSync(List<string>? categoryKeys = null)
    {
        var userId = GetUserId();
        if (userId != null)
        {
            await Clients.Caller.SendAsync("SyncRequested", new
            {
                UserId = userId,
                Categories = categoryKeys,
                RequestedAt = DateTime.UtcNow
            });
            
            _logger.LogInformation("Sync requested for user {UserId} with categories {Categories}", 
                userId, categoryKeys != null ? string.Join(", ", categoryKeys) : "all");
        }
    }

    /// <summary>
    /// Ping for connection health check
    /// </summary>
    public async Task Ping()
    {
        await Clients.Caller.SendAsync("Pong", DateTime.UtcNow);
    }

    public override async Task OnConnectedAsync()
    {
        var userId = GetUserId();
        if (userId != null)
        {
            await JoinUserPreferenceGroup();
            _logger.LogInformation("User {UserId} connected to PreferencesHub with connection {ConnectionId}", 
                userId, Context.ConnectionId);
        }
        
        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var userId = GetUserId();
        if (userId != null)
        {
            _logger.LogInformation("User {UserId} disconnected from PreferencesHub with connection {ConnectionId}. Exception: {Exception}", 
                userId, Context.ConnectionId, exception?.Message);
        }
        
        await base.OnDisconnectedAsync(exception);
    }

    private string? GetUserId()
    {
        return Context.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
    }
}

/// <summary>
/// Service for sending preference updates through SignalR
/// </summary>
public interface IPreferenceHubService
{
    Task NotifyPreferenceChanged(Guid userId, string categoryKey, string preferenceKey, object newValue, string action);
    Task NotifyBulkPreferencesChanged(Guid userId, List<UserPreferenceDto> preferences, string action);
    Task NotifyPreferenceDeleted(Guid userId, string categoryKey, string preferenceKey);
    Task NotifyUserDevices(Guid userId, string message, object data);
}

public class PreferenceHubService : IPreferenceHubService
{
    private readonly IHubContext<PreferencesHub> _hubContext;
    private readonly ILogger<PreferenceHubService> _logger;

    public PreferenceHubService(IHubContext<PreferencesHub> hubContext, ILogger<PreferenceHubService> logger)
    {
        _hubContext = hubContext;
        _logger = logger;
    }

    public async Task NotifyPreferenceChanged(Guid userId, string categoryKey, string preferenceKey, object newValue, string action)
    {
        var userGroup = $"user_preferences_{userId}";
        var categoryGroup = $"user_preferences_{userId}_{categoryKey}";

        var notification = new
        {
            UserId = userId,
            CategoryKey = categoryKey,
            PreferenceKey = preferenceKey,
            NewValue = newValue,
            Action = action,
            Timestamp = DateTime.UtcNow
        };

        try
        {
            // Send to general user preference group
            await _hubContext.Clients.Group(userGroup).SendAsync("PreferenceChanged", notification);
            
            // Send to specific category group
            await _hubContext.Clients.Group(categoryGroup).SendAsync("PreferenceChanged", notification);

            _logger.LogDebug("Preference change notification sent for user {UserId}: {CategoryKey}.{PreferenceKey}", 
                userId, categoryKey, preferenceKey);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send preference change notification for user {UserId}", userId);
        }
    }

    public async Task NotifyBulkPreferencesChanged(Guid userId, List<UserPreferenceDto> preferences, string action)
    {
        var userGroup = $"user_preferences_{userId}";
        
        var notification = new
        {
            UserId = userId,
            Preferences = preferences,
            Action = action,
            Timestamp = DateTime.UtcNow
        };

        try
        {
            await _hubContext.Clients.Group(userGroup).SendAsync("BulkPreferencesChanged", notification);

            // Also send category-specific notifications
            var categoryGroups = preferences
                .Select(p => p.CategoryKey)
                .Distinct()
                .Select(c => $"user_preferences_{userId}_{c}");

            foreach (var categoryGroup in categoryGroups)
            {
                var categoryParts = categoryGroup.Split('_');
                var lastPart = categoryParts.LastOrDefault();
                if (lastPart == null) continue;
                var categoryPrefs = preferences.Where(p => p.CategoryKey == lastPart).ToList();
                await _hubContext.Clients.Group(categoryGroup).SendAsync("BulkPreferencesChanged", new
                {
                    UserId = userId,
                    Preferences = categoryPrefs,
                    Action = action,
                    Timestamp = DateTime.UtcNow
                });
            }

            _logger.LogDebug("Bulk preference change notification sent for user {UserId}: {Count} preferences", 
                userId, preferences.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send bulk preference change notification for user {UserId}", userId);
        }
    }

    public async Task NotifyPreferenceDeleted(Guid userId, string categoryKey, string preferenceKey)
    {
        await NotifyPreferenceChanged(userId, categoryKey, preferenceKey, null!, "deleted");
    }

    public async Task NotifyUserDevices(Guid userId, string message, object data)
    {
        var userGroup = $"user_preferences_{userId}";

        var notification = new
        {
            Message = message,
            Data = data,
            Timestamp = DateTime.UtcNow
        };

        try
        {
            await _hubContext.Clients.Group(userGroup).SendAsync("UserDeviceNotification", notification);
            _logger.LogDebug("Device notification sent to user {UserId}: {Message}", userId, message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send device notification to user {UserId}", userId);
        }
    }
}

/// <summary>
/// Extension methods for configuring preferences SignalR hub
/// </summary>
public static class PreferencesHubExtensions
{
    public static void MapPreferencesHub(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapHub<PreferencesHub>("/hubs/preferences");
    }

    public static IServiceCollection AddPreferencesSignalR(this IServiceCollection services)
    {
        services.AddSignalR(options =>
        {
            options.EnableDetailedErrors = true;
            options.MaximumReceiveMessageSize = 65536; // 64KB
            options.StreamBufferCapacity = 10;
        });

        services.AddScoped<IPreferenceHubService, PreferenceHubService>();
        
        return services;
    }
}