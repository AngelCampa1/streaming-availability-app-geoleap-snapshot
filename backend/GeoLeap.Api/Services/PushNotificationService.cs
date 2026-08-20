using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System.Text.Json;
using System.Collections.Concurrent;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service for push notification system
/// </summary>
public class PushNotificationService : IPushNotificationService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<PushNotificationService> _logger;
    private static readonly ConcurrentDictionary<Guid, List<DeviceToken>> _userDevices = new();
    private static readonly ConcurrentDictionary<string, NotificationDeliveryStatus> _deliveryStatus = new();

    public PushNotificationService(
        ApplicationDbContext context,
        ILogger<PushNotificationService> logger)
    {
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Send push notification to user
    /// </summary>
    public async Task<bool> SendPushNotificationAsync(Guid userId, string title, string body, string correlationId)
    {
        return await SendPushNotificationAsync(userId, title, body, correlationId, null);
    }

    /// <summary>
    /// Send push notification to user with additional data
    /// </summary>
    public async Task<bool> SendPushNotificationAsync(
        Guid userId, 
        string title, 
        string body, 
        string correlationId, 
        Dictionary<string, object>? data = null)
    {
        try
        {
            _logger.LogInformation("[{CorrelationId}] Sending push notification to user {UserId}: {Title}", 
                correlationId, userId, title);

            // Get user's device tokens
            var devices = await GetUserDeviceTokensAsync(userId, correlationId);
            
            if (!devices.Any())
            {
                _logger.LogWarning("[{CorrelationId}] No device tokens found for user {UserId}", correlationId, userId);
                return false;
            }

            var notification = new PushNotification
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Title = title,
                Body = body,
                Data = data ?? new Dictionary<string, object>(),
                CreatedAt = DateTime.UtcNow,
                Status = "Pending"
            };

            var deliveryResults = new List<bool>();
            
            foreach (var device in devices)
            {
                try
                {
                    var success = await SendToDeviceAsync(device, notification, correlationId);
                    deliveryResults.Add(success);
                    
                    // Track delivery status
                    var externalId = $"{notification.Id}_{device.Token}";
                    _deliveryStatus.TryAdd(externalId, new NotificationDeliveryStatus
                    {
                        ExternalId = externalId,
                        Status = success ? "Delivered" : "Failed",
                        DeliveredAt = success ? DateTime.UtcNow : null,
                        Error = success ? null : "Delivery failed",
                        Attempts = 1
                    });
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "[{CorrelationId}] Failed to send notification to device {DeviceToken}", 
                        correlationId, device.Token);
                    deliveryResults.Add(false);
                }
            }

            // Update notification status
            var successfulDeliveries = deliveryResults.Count(r => r);
            notification.Status = successfulDeliveries > 0 ? "Delivered" : "Failed";
            notification.DeliveredAt = successfulDeliveries > 0 ? DateTime.UtcNow : null;

            // Store notification (in a real implementation, this would be in the database)
            _logger.LogInformation("[{CorrelationId}] Push notification sent: {SuccessCount}/{TotalCount} devices",
                correlationId, successfulDeliveries, devices.Count);

            return successfulDeliveries > 0;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error sending push notification to user {UserId}", correlationId, userId);
            return false;
        }
    }

    /// <summary>
    /// Register device token for push notifications
    /// </summary>
    public async Task<bool> RegisterDeviceTokenAsync(Guid userId, string deviceToken, string platform, string correlationId)
    {
        try
        {
            _logger.LogInformation("[{CorrelationId}] Registering device token for user {UserId} on {Platform}", 
                correlationId, userId, platform);

            var device = new DeviceToken
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Token = deviceToken,
                Platform = platform.ToLower(),
                IsActive = true,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            // Store in memory cache (in production, use database)
            _userDevices.AddOrUpdate(
                userId,
                new List<DeviceToken> { device },
                (key, existingDevices) =>
                {
                    // Remove existing token if it exists
                    var existingDevice = existingDevices.FirstOrDefault(d => d.Token == deviceToken);
                    if (existingDevice != null)
                    {
                        existingDevices.Remove(existingDevice);
                    }
                    
                    existingDevices.Add(device);
                    return existingDevices;
                });

            _logger.LogInformation("[{CorrelationId}] Device token registered successfully for user {UserId}", 
                correlationId, userId);

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error registering device token for user {UserId}", correlationId, userId);
            return false;
        }
    }

    /// <summary>
    /// Unregister device token
    /// </summary>
    public async Task<bool> UnregisterDeviceTokenAsync(string deviceToken, string correlationId)
    {
        try
        {
            _logger.LogInformation("[{CorrelationId}] Unregistering device token: {DeviceToken}", 
                correlationId, deviceToken.Substring(0, Math.Min(8, deviceToken.Length)) + "...");

            await Task.CompletedTask; // Placeholder for async signature

            var removed = false;
            foreach (var userDevices in _userDevices.Values)
            {
                var device = userDevices.FirstOrDefault(d => d.Token == deviceToken);
                if (device != null)
                {
                    userDevices.Remove(device);
                    removed = true;
                    break;
                }
            }

            if (removed)
            {
                _logger.LogInformation("[{CorrelationId}] Device token unregistered successfully", correlationId);
            }
            else
            {
                _logger.LogWarning("[{CorrelationId}] Device token not found for unregistration", correlationId);
            }

            return removed;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error unregistering device token", correlationId);
            return false;
        }
    }

    /// <summary>
    /// Get push notification delivery status
    /// </summary>
    public async Task<Dictionary<string, object>> GetPushDeliveryStatusAsync(string externalId)
    {
        try
        {
            await Task.CompletedTask; // Placeholder for async signature

            if (_deliveryStatus.TryGetValue(externalId, out var status))
            {
                return new Dictionary<string, object>
                {
                    { "externalId", status.ExternalId },
                    { "status", status.Status },
                    { "deliveredAt", status.DeliveredAt },
                    { "error", status.Error },
                    { "attempts", status.Attempts },
                    { "lastAttempt", status.LastAttempt }
                };
            }

            return new Dictionary<string, object>
            {
                { "externalId", externalId },
                { "status", "NotFound" },
                { "error", "Delivery status not found" }
            };
        }
        catch (Exception ex)
        {
            return new Dictionary<string, object>
            {
                { "externalId", externalId },
                { "status", "Error" },
                { "error", ex.Message }
            };
        }
    }

    private async Task<List<DeviceToken>> GetUserDeviceTokensAsync(Guid userId, string correlationId)
    {
        await Task.CompletedTask; // Placeholder for async signature
        
        if (_userDevices.TryGetValue(userId, out var devices))
        {
            // Return only active devices
            return devices.Where(d => d.IsActive).ToList();
        }

        return new List<DeviceToken>();
    }

    private async Task<bool> SendToDeviceAsync(DeviceToken device, PushNotification notification, string correlationId)
    {
        try
        {
            await Task.CompletedTask; // Placeholder for async signature

            // In a real implementation, this would integrate with push notification providers:
            // - Azure Notification Hubs for cross-platform notifications
            // - Apple Push Notification Service (APNS) for iOS
            // - Web Push Protocol for browsers

            _logger.LogInformation("[{CorrelationId}] Sending notification to {Platform} device: {DeviceToken}", 
                correlationId, device.Platform, device.Token.Substring(0, Math.Min(8, device.Token.Length)) + "...");

            // Simulate platform-specific sending
            switch (device.Platform.ToLower())
            {
                case "ios":
                case "apple":
                    return await SendApnsPushNotificationAsync(device, notification, correlationId);
                    
                case "android":
                    return await SendAndroidPushNotificationAsync(device, notification, correlationId);
                    
                case "web":
                case "browser":
                    return await SendWebPushNotificationAsync(device, notification, correlationId);
                    
                default:
                    _logger.LogWarning("[{CorrelationId}] Unsupported platform: {Platform}", correlationId, device.Platform);
                    return false;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[{CorrelationId}] Error sending to device {DeviceToken}", 
                correlationId, device.Token.Substring(0, Math.Min(8, device.Token.Length)) + "...");
            return false;
        }
    }

    private async Task<bool> SendApnsPushNotificationAsync(DeviceToken device, PushNotification notification, string correlationId)
    {
        await Task.Delay(100); // Simulate API call delay
        
        // Mock APNS integration
        _logger.LogInformation("[{CorrelationId}] APNS notification sent successfully", correlationId);
        return true;
    }

    private async Task<bool> SendAndroidPushNotificationAsync(DeviceToken device, PushNotification notification, string correlationId)
    {
        await Task.Delay(150); // Simulate API call delay

        // Mock Azure Notification Hub integration for Android
        _logger.LogInformation("[{CorrelationId}] Android notification sent successfully via Azure Notification Hub", correlationId);
        return true;
    }

    private async Task<bool> SendWebPushNotificationAsync(DeviceToken device, PushNotification notification, string correlationId)
    {
        await Task.Delay(80); // Simulate API call delay
        
        // Mock Web Push integration
        _logger.LogInformation("[{CorrelationId}] Web Push notification sent successfully", correlationId);
        return true;
    }
}

// Helper classes
public class DeviceToken
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Token { get; set; } = string.Empty;
    public string Platform { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class PushNotification
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public Dictionary<string, object> Data { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime? DeliveredAt { get; set; }
}

public class NotificationDeliveryStatus
{
    public string ExternalId { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime? DeliveredAt { get; set; }
    public string? Error { get; set; }
    public int Attempts { get; set; }
    public DateTime? LastAttempt { get; set; }
}
