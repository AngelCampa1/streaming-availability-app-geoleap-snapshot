using System.Collections.Concurrent;
using GeoLeap.Api.Services;

namespace GeoLeap.Api.Tests.Infrastructure.Fakes;

/// <summary>
/// Fake implementation of IPushNotificationService that captures all notifications for test verification.
/// Does NOT send any actual push notifications - all operations are in-memory only.
/// </summary>
public class FakePushNotificationService : IPushNotificationService
{
    private readonly ConcurrentBag<SentPushNotification> _sentNotifications = new();
    private readonly ConcurrentDictionary<string, DeviceToken> _deviceTokens = new();
    private readonly ConcurrentDictionary<Guid, int> _failureConfig = new();
    private bool _shouldFail = false;

    /// <summary>
    /// All push notifications that have been "sent" through this fake service
    /// </summary>
    public IReadOnlyCollection<SentPushNotification> SentNotifications => _sentNotifications.ToList().AsReadOnly();

    /// <summary>
    /// All registered device tokens
    /// </summary>
    public IReadOnlyCollection<DeviceToken> RegisteredTokens => _deviceTokens.Values.ToList().AsReadOnly();

    /// <summary>
    /// Configure the fake to fail all push notification operations
    /// </summary>
    public void SetShouldFail(bool shouldFail)
    {
        _shouldFail = shouldFail;
    }

    /// <summary>
    /// Configure a user to fail the next N notification attempts
    /// </summary>
    public void ConfigureFailure(Guid userId, int failCount = 1)
    {
        _failureConfig[userId] = failCount;
    }

    /// <summary>
    /// Clear all sent notifications and registered tokens
    /// </summary>
    public void Reset()
    {
        _sentNotifications.Clear();
        _deviceTokens.Clear();
        _failureConfig.Clear();
        _shouldFail = false;
    }

    /// <summary>
    /// Get all notifications sent to a specific user
    /// </summary>
    public IReadOnlyCollection<SentPushNotification> GetNotificationsForUser(Guid userId)
    {
        return _sentNotifications
            .Where(n => n.UserId == userId)
            .ToList()
            .AsReadOnly();
    }

    /// <summary>
    /// Get all notifications with a specific category
    /// </summary>
    public IReadOnlyCollection<SentPushNotification> GetNotificationsByCategory(string category)
    {
        return _sentNotifications
            .Where(n => n.Category.Equals(category, StringComparison.OrdinalIgnoreCase))
            .ToList()
            .AsReadOnly();
    }

    private bool ShouldFail(Guid userId)
    {
        if (_shouldFail) return true;

        if (_failureConfig.TryGetValue(userId, out var failCount) && failCount > 0)
        {
            _failureConfig[userId] = failCount - 1;
            if (_failureConfig[userId] <= 0)
                _failureConfig.TryRemove(userId, out _);
            return true;
        }
        return false;
    }

    public Task<bool> SendPushNotificationAsync(Guid userId, string title, string body, string correlationId)
    {
        return SendPushNotificationAsync(userId, title, body, "general", null);
    }

    public Task<bool> SendPushNotificationAsync(Guid userId, string title, string message, string category, Dictionary<string, object>? data)
    {
        if (ShouldFail(userId))
            return Task.FromResult(false);

        // Check if user has registered device tokens
        var userTokens = _deviceTokens.Values.Where(t => t.UserId == userId).ToList();

        var externalId = Guid.NewGuid().ToString();
        _sentNotifications.Add(new SentPushNotification
        {
            UserId = userId,
            Title = title,
            Message = message,
            Category = category,
            Data = data ?? new Dictionary<string, object>(),
            ExternalId = externalId,
            SentAt = DateTime.UtcNow,
            Status = userTokens.Any() ? "delivered" : "no_device",
            DeviceCount = userTokens.Count
        });

        return Task.FromResult(userTokens.Any());
    }

    public Task<bool> RegisterDeviceTokenAsync(Guid userId, string deviceToken, string platform, string correlationId)
    {
        if (_shouldFail)
            return Task.FromResult(false);

        _deviceTokens[deviceToken] = new DeviceToken
        {
            UserId = userId,
            Token = deviceToken,
            Platform = platform,
            RegisteredAt = DateTime.UtcNow
        };

        return Task.FromResult(true);
    }

    public Task<bool> UnregisterDeviceTokenAsync(string deviceToken, string correlationId)
    {
        if (_shouldFail)
            return Task.FromResult(false);

        return Task.FromResult(_deviceTokens.TryRemove(deviceToken, out _));
    }

    public Task<Dictionary<string, object>> GetPushDeliveryStatusAsync(string externalId)
    {
        var notification = _sentNotifications.FirstOrDefault(n => n.ExternalId == externalId);

        if (notification == null)
        {
            return Task.FromResult(new Dictionary<string, object>
            {
                ["status"] = "not_found",
                ["externalId"] = externalId
            });
        }

        return Task.FromResult(new Dictionary<string, object>
        {
            ["status"] = notification.Status,
            ["externalId"] = externalId,
            ["userId"] = notification.UserId,
            ["sentAt"] = notification.SentAt,
            ["deliveredAt"] = notification.SentAt.AddMilliseconds(500),
            ["deviceCount"] = notification.DeviceCount
        });
    }
}

/// <summary>
/// Represents a push notification that was "sent" through the fake service
/// </summary>
public class SentPushNotification
{
    public Guid UserId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public Dictionary<string, object> Data { get; set; } = new();
    public string ExternalId { get; set; } = string.Empty;
    public DateTime SentAt { get; set; }
    public string Status { get; set; } = "pending";
    public int DeviceCount { get; set; }
}

/// <summary>
/// Represents a registered device token
/// </summary>
public class DeviceToken
{
    public Guid UserId { get; set; }
    public string Token { get; set; } = string.Empty;
    public string Platform { get; set; } = string.Empty;
    public DateTime RegisteredAt { get; set; }
}
