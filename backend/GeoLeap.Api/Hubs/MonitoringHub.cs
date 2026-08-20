using Microsoft.AspNetCore.SignalR;
using Microsoft.AspNetCore.Authorization;

namespace GeoLeap.Api.Hubs;

/// <summary>
/// SignalR hub for real-time monitoring updates
/// </summary>
[Authorize(Policy = "AdminOnly")]
public class MonitoringHub : Hub
{
    private readonly ILogger<MonitoringHub> _logger;

    public MonitoringHub(ILogger<MonitoringHub> logger)
    {
        _logger = logger;
    }

    public override async Task OnConnectedAsync()
    {
        var connectionId = Context.ConnectionId;
        var userIdentifier = Context.UserIdentifier;
        
        _logger.LogInformation("Monitoring client connected: {ConnectionId}, User: {User}", connectionId, userIdentifier);
        
        // Add to monitoring group
        await Groups.AddToGroupAsync(connectionId, "MonitoringClients");
        
        // Send welcome message with connection info
        await Clients.Caller.SendAsync("ConnectionEstablished", new
        {
            ConnectionId = connectionId,
            ConnectedAt = DateTime.UtcNow,
            Message = "Connected to monitoring hub"
        });

        await base.OnConnectedAsync();
    }

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        var connectionId = Context.ConnectionId;
        var userIdentifier = Context.UserIdentifier;
        
        _logger.LogInformation("Monitoring client disconnected: {ConnectionId}, User: {User}, Exception: {Exception}", 
            connectionId, userIdentifier, exception?.Message);
        
        // Remove from monitoring group
        await Groups.RemoveFromGroupAsync(connectionId, "MonitoringClients");

        await base.OnDisconnectedAsync(exception);
    }

    /// <summary>
    /// Join specific monitoring channel
    /// </summary>
    public async Task JoinMonitoringChannel(string channelName)
    {
        try
        {
            var validChannels = new[] { "SystemHealth", "Infrastructure", "Alerts", "Performance" };
            
            if (!validChannels.Contains(channelName))
            {
                await Clients.Caller.SendAsync("Error", $"Invalid channel name: {channelName}");
                return;
            }

            await Groups.AddToGroupAsync(Context.ConnectionId, $"Monitoring_{channelName}");
            
            _logger.LogInformation("Client {ConnectionId} joined monitoring channel: {Channel}", 
                Context.ConnectionId, channelName);
                
            await Clients.Caller.SendAsync("ChannelJoined", new
            {
                Channel = channelName,
                JoinedAt = DateTime.UtcNow
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error joining monitoring channel: {Channel}", channelName);
            await Clients.Caller.SendAsync("Error", "Failed to join monitoring channel");
        }
    }

    /// <summary>
    /// Leave specific monitoring channel
    /// </summary>
    public async Task LeaveMonitoringChannel(string channelName)
    {
        try
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"Monitoring_{channelName}");
            
            _logger.LogInformation("Client {ConnectionId} left monitoring channel: {Channel}", 
                Context.ConnectionId, channelName);
                
            await Clients.Caller.SendAsync("ChannelLeft", new
            {
                Channel = channelName,
                LeftAt = DateTime.UtcNow
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error leaving monitoring channel: {Channel}", channelName);
            await Clients.Caller.SendAsync("Error", "Failed to leave monitoring channel");
        }
    }

    /// <summary>
    /// Request current status for all monitoring metrics
    /// </summary>
    public async Task RequestCurrentStatus()
    {
        try
        {
            _logger.LogInformation("Client {ConnectionId} requested current status", Context.ConnectionId);
            
            // This would typically trigger a refresh of all metrics
            await Clients.Caller.SendAsync("StatusRequested", new
            {
                RequestedAt = DateTime.UtcNow,
                Message = "Status refresh initiated"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error handling status request");
            await Clients.Caller.SendAsync("Error", "Failed to request current status");
        }
    }

    /// <summary>
    /// Set client-specific monitoring preferences
    /// </summary>
    public async Task SetMonitoringPreferences(MonitoringPreferences preferences)
    {
        try
        {
            // Store preferences in connection state or database
            // For now, just acknowledge the preference update
            
            _logger.LogInformation("Client {ConnectionId} updated monitoring preferences: {@Preferences}", 
                Context.ConnectionId, preferences);
                
            await Clients.Caller.SendAsync("PreferencesUpdated", new
            {
                Preferences = preferences,
                UpdatedAt = DateTime.UtcNow
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating monitoring preferences");
            await Clients.Caller.SendAsync("Error", "Failed to update preferences");
        }
    }

    /// <summary>
    /// Acknowledge an alert from the client
    /// </summary>
    public async Task AcknowledgeAlert(int alertId, string acknowledgedBy)
    {
        try
        {
            _logger.LogInformation("Client {ConnectionId} acknowledged alert {AlertId} by {User}", 
                Context.ConnectionId, alertId, acknowledgedBy);
            
            // Broadcast acknowledgment to all monitoring clients
            await Clients.Group("MonitoringClients").SendAsync("AlertAcknowledged", new
            {
                AlertId = alertId,
                AcknowledgedBy = acknowledgedBy,
                AcknowledgedAt = DateTime.UtcNow,
                ConnectionId = Context.ConnectionId
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error acknowledging alert {AlertId}", alertId);
            await Clients.Caller.SendAsync("Error", "Failed to acknowledge alert");
        }
    }
}

/// <summary>
/// Client monitoring preferences
/// </summary>
public class MonitoringPreferences
{
    public bool EnableRealTimeUpdates { get; set; } = true;
    public int RefreshIntervalSeconds { get; set; } = 30;
    public List<string> EnabledChannels { get; set; } = new();
    public bool ShowCriticalAlertsOnly { get; set; } = false;
    public bool EnableSoundNotifications { get; set; } = false;
    public bool EnableDesktopNotifications { get; set; } = false;
}

/// <summary>
/// Extension methods for MonitoringHub
/// </summary>
public static class MonitoringHubExtensions
{
    /// <summary>
    /// Send system health update to all monitoring clients
    /// </summary>
    public static async Task SendSystemHealthUpdate(this IHubContext<MonitoringHub> hubContext, object healthMetrics)
    {
        await hubContext.Clients.Group("Monitoring_SystemHealth").SendAsync("SystemHealthUpdate", healthMetrics);
    }

    /// <summary>
    /// Send infrastructure metrics update to subscribed clients
    /// </summary>
    public static async Task SendInfrastructureUpdate(this IHubContext<MonitoringHub> hubContext, object infrastructureMetrics)
    {
        await hubContext.Clients.Group("Monitoring_Infrastructure").SendAsync("InfrastructureUpdate", infrastructureMetrics);
    }

    /// <summary>
    /// Send new alert to all monitoring clients
    /// </summary>
    public static async Task SendNewAlert(this IHubContext<MonitoringHub> hubContext, object alert)
    {
        await hubContext.Clients.Group("MonitoringClients").SendAsync("NewAlert", alert);
    }

    /// <summary>
    /// Send performance metrics update to subscribed clients
    /// </summary>
    public static async Task SendPerformanceUpdate(this IHubContext<MonitoringHub> hubContext, object performanceMetrics)
    {
        await hubContext.Clients.Group("Monitoring_Performance").SendAsync("PerformanceUpdate", performanceMetrics);
    }

    /// <summary>
    /// Broadcast critical alert to all clients with high priority
    /// </summary>
    public static async Task BroadcastCriticalAlert(this IHubContext<MonitoringHub> hubContext, object criticalAlert)
    {
        await hubContext.Clients.All.SendAsync("CriticalAlert", new
        {
            Alert = criticalAlert,
            Timestamp = DateTime.UtcNow,
            Priority = "Critical",
            RequiresImmediateAttention = true
        });
    }
}