using Xunit;
using Moq;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Caching.Distributed;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;

namespace GeoLeap.Api.Tests.Services;

/// <summary>
/// Direct tests for NotificationPreferencesService - Phase 4.2
/// Tests user notification preferences, opt-in/out, channel selection, rate limiting
/// Coverage: CRUD operations, quiet hours, unsubscribe, bulk operations, GDPR
/// </summary>
public class NotificationPreferencesServiceDirectTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly NotificationPreferencesService _service;
    private readonly Mock<IDistributedCache> _mockCache;
    private readonly Mock<ILogger<NotificationPreferencesService>> _mockLogger;

    private readonly Guid _testUserId = Guid.NewGuid();
    private readonly Guid _otherUserId = Guid.NewGuid();

    public NotificationPreferencesServiceDirectTests()
    {
        // Setup in-memory database
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: $"NotificationPreferencesTest_{Guid.NewGuid()}")
            .Options;

        _context = new ApplicationDbContext(options);

        // Setup mocks (boundary-only)
        _mockCache = new Mock<IDistributedCache>();
        _mockLogger = new Mock<ILogger<NotificationPreferencesService>>();

        // Mock cache returns null by default (cache miss)
        _mockCache.Setup(c => c.GetAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((byte[]?)null);

        _service = new NotificationPreferencesService(
            _context,
            _mockCache.Object,
            _mockLogger.Object
        );

        // Seed test data
        SeedTestData().Wait();
    }

    private async Task SeedTestData()
    {
        // Seed test users
        _context.Users.Add(new User
        {
            Id = _testUserId,
            UserName = "testuser@example.com",
            Email = "testuser@example.com",
            EmailConfirmed = true,
            DisplayName = "Test User"
        });

        _context.Users.Add(new User
        {
            Id = _otherUserId,
            UserName = "otheruser@example.com",
            Email = "otheruser@example.com",
            EmailConfirmed = true,
            DisplayName = "Other User"
        });

        await _context.SaveChangesAsync();
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    // Core Preference Management Tests
    [Fact]
    public async Task GetUserPreferencesAsync_WithNoExistingPreferences_CreatesDefaults()
    {
        // Act
        var result = await _service.GetUserPreferencesAsync(_testUserId);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.GloballyEnabled);
        Assert.True(result.EmailEnabled);
        Assert.True(result.PushEnabled);
        Assert.Equal(10, result.MaxNotificationsPerHour);
        Assert.Equal(50, result.MaxNotificationsPerDay);

        // Verify default preferences were created in database
        var savedSettings = await _context.WatchlistNotificationSettings
            .FirstOrDefaultAsync(s => s.UserId == _testUserId);
        Assert.NotNull(savedSettings);
    }

    [Fact]
    public async Task GetUserPreferencesAsync_WithExistingPreferences_ReturnsFromDatabase()
    {
        // Arrange - Create existing preferences
        var existingSettings = new WatchlistNotificationSettings
        {
            UserId = _testUserId,
            GloballyEnabled = false,
            EnableEmailNotifications = false,
            EnablePushNotifications = true,
            MaxNotificationsPerHour = 5,
            MaxNotificationsPerDay = 20
        };
        _context.WatchlistNotificationSettings.Add(existingSettings);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetUserPreferencesAsync(_testUserId);

        // Assert
        Assert.NotNull(result);
        Assert.False(result.GloballyEnabled);
        Assert.False(result.EmailEnabled);
        Assert.True(result.PushEnabled);
        Assert.Equal(5, result.MaxNotificationsPerHour);
        Assert.Equal(20, result.MaxNotificationsPerDay);
    }

    [Fact]
    public async Task UpdateUserPreferencesAsync_WithValidRequest_UpdatesSuccessfully()
    {
        // Arrange - Create default preferences first
        await _service.CreateDefaultPreferencesAsync(_testUserId);

        var updateRequest = new UpdateNotificationPreferencesRequest
        {
            GloballyEnabled = false,
            EmailEnabled = false,
            PushEnabled = true,
            MaxNotificationsPerHour = 15,
            MaxNotificationsPerDay = 75
        };

        // Act
        var result = await _service.UpdateUserPreferencesAsync(_testUserId, updateRequest);

        // Assert
        Assert.True(result);

        // Verify database was updated
        var updated = await _context.WatchlistNotificationSettings
            .FirstOrDefaultAsync(s => s.UserId == _testUserId);
        Assert.NotNull(updated);
        Assert.False(updated.GloballyEnabled);
        Assert.True(updated.EnablePushNotifications);
        Assert.Equal(15, updated.MaxNotificationsPerHour);
        Assert.Equal(75, updated.MaxNotificationsPerDay);

        // Verify cache was invalidated
        _mockCache.Verify(c => c.RemoveAsync(
            It.Is<string>(key => key.Contains(_testUserId.ToString())),
            It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task UpdateUserPreferencesAsync_WithInvalidRateLimits_NormalizesValues()
    {
        // Arrange
        await _service.CreateDefaultPreferencesAsync(_testUserId);

        var updateRequest = new UpdateNotificationPreferencesRequest
        {
            MaxNotificationsPerHour = -10, // Invalid negative value
            MaxNotificationsPerDay = 600   // Exceeds maximum
        };

        // Act
        var result = await _service.UpdateUserPreferencesAsync(_testUserId, updateRequest);

        // Assert
        Assert.True(result);

        var updated = await _context.WatchlistNotificationSettings
            .FirstOrDefaultAsync(s => s.UserId == _testUserId);
        Assert.NotNull(updated);
        Assert.Equal(10, updated.MaxNotificationsPerHour); // Normalized to default
        Assert.Equal(500, updated.MaxNotificationsPerDay);  // Capped at maximum
    }

    [Fact]
    public async Task CreateDefaultPreferencesAsync_WithNewUser_CreatesDefaults()
    {
        // Act
        var result = await _service.CreateDefaultPreferencesAsync(_testUserId);

        // Assert
        Assert.True(result);

        var settings = await _context.WatchlistNotificationSettings
            .FirstOrDefaultAsync(s => s.UserId == _testUserId);
        Assert.NotNull(settings);
        Assert.True(settings.GloballyEnabled);
        Assert.True(settings.NotifyOnAvailabilityChange);
        Assert.True(settings.NotifyOnNewReleases);
        Assert.Equal("email", settings.PreferredNotificationMethod);
    }

    [Fact]
    public async Task CreateDefaultPreferencesAsync_WithExistingSettings_UpdatesToDefaults()
    {
        // Arrange - Create existing settings with custom values
        var existingSettings = new WatchlistNotificationSettings
        {
            UserId = _testUserId,
            GloballyEnabled = false,
            MaxNotificationsPerHour = 3
        };
        _context.WatchlistNotificationSettings.Add(existingSettings);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.CreateDefaultPreferencesAsync(_testUserId);

        // Assert
        Assert.True(result);

        var updated = await _context.WatchlistNotificationSettings
            .FirstOrDefaultAsync(s => s.UserId == _testUserId);
        Assert.NotNull(updated);
        Assert.True(updated.GloballyEnabled);
        Assert.Equal(10, updated.MaxNotificationsPerHour); // Reset to default
    }

    // Channel Management Tests
    [Fact]
    public async Task GetEnabledChannelsAsync_WithMultipleChannels_ReturnsEnabledList()
    {
        // Arrange
        var settings = new WatchlistNotificationSettings
        {
            UserId = _testUserId,
            EnableEmailNotifications = true,
            EnablePushNotifications = true,
            EnableSmsNotifications = false,
            EnableInAppNotifications = true
        };
        _context.WatchlistNotificationSettings.Add(settings);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetEnabledChannelsAsync(_testUserId, "test_notification");

        // Assert
        Assert.NotNull(result);
        Assert.Contains("email", result);
        Assert.Contains("push", result);
        Assert.Contains("in_app", result);
        Assert.DoesNotContain("sms", result);
    }

    [Fact]
    public async Task GetEnabledChannelsAsync_WithNoChannels_ReturnsFallbackInApp()
    {
        // Arrange - All channels disabled
        var settings = new WatchlistNotificationSettings
        {
            UserId = _testUserId,
            EnableEmailNotifications = false,
            EnablePushNotifications = false,
            EnableSmsNotifications = false,
            EnableInAppNotifications = false
        };
        _context.WatchlistNotificationSettings.Add(settings);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetEnabledChannelsAsync(_testUserId, "test_notification");

        // Assert
        Assert.NotNull(result);
        Assert.Contains("in_app", result); // Fallback to in-app
    }

    // Quiet Hours Tests
    [Fact]
    public async Task IsInQuietHoursAsync_WithCurrentTimeInQuietHours_ReturnsTrue()
    {
        // Arrange
        var now = DateTime.UtcNow.TimeOfDay;
        var quietStart = now.Add(TimeSpan.FromHours(-1));
        var quietEnd = now.Add(TimeSpan.FromHours(1));

        var settings = new WatchlistNotificationSettings
        {
            UserId = _testUserId,
            QuietHoursStart = quietStart,
            QuietHoursEnd = quietEnd
        };
        _context.WatchlistNotificationSettings.Add(settings);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.IsInQuietHoursAsync(_testUserId);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public async Task IsInQuietHoursAsync_WithCurrentTimeOutsideQuietHours_ReturnsFalse()
    {
        // Arrange
        var now = DateTime.UtcNow.TimeOfDay;
        var quietStart = now.Add(TimeSpan.FromHours(2));
        var quietEnd = now.Add(TimeSpan.FromHours(4));

        var settings = new WatchlistNotificationSettings
        {
            UserId = _testUserId,
            QuietHoursStart = quietStart,
            QuietHoursEnd = quietEnd
        };
        _context.WatchlistNotificationSettings.Add(settings);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.IsInQuietHoursAsync(_testUserId);

        // Assert
        Assert.False(result);
    }

    // Rate Limiting Tests
    [Fact]
    public async Task HasReachedRateLimitAsync_WithinLimits_ReturnsFalse()
    {
        // Arrange
        var settings = new WatchlistNotificationSettings
        {
            UserId = _testUserId,
            MaxNotificationsPerHour = 10,
            MaxNotificationsPerDay = 50
        };
        _context.WatchlistNotificationSettings.Add(settings);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.HasReachedRateLimitAsync(_testUserId, "availability_change");

        // Assert
        Assert.False(result); // No delivery logs, so within limits
    }

    [Fact]
    public async Task HasReachedRateLimitAsync_ExceededHourlyLimit_ReturnsTrue()
    {
        // Arrange
        var settings = new WatchlistNotificationSettings
        {
            UserId = _testUserId,
            MaxNotificationsPerHour = 5,
            MaxNotificationsPerDay = 50
        };
        _context.WatchlistNotificationSettings.Add(settings);

        // Add 6 delivery logs in last hour (exceeds limit of 5)
        var now = DateTime.UtcNow;
        for (int i = 0; i < 6; i++)
        {
            _context.NotificationDeliveryLogs.Add(new NotificationDeliveryLog
            {
                Id = Guid.NewGuid(),
                UserId = _testUserId,
                Title = "Test Notification",
                Message = "Test notification message",
                Type = "availability_change",
                Channels = "email",
                NotificationType = "availability_change",
                DeliveryMethod = "email",
                Status = "sent",
                Success = true,
                DeliveredAt = now.AddMinutes(-30)
            });
        }

        await _context.SaveChangesAsync();

        // Act
        var result = await _service.HasReachedRateLimitAsync(_testUserId, "availability_change");

        // Assert
        Assert.True(result); // Exceeded hourly limit
    }

    // CanSendNotification Tests
    [Fact]
    public async Task CanSendNotificationAsync_WithAllConditionsMet_ReturnsTrue()
    {
        // Arrange
        var settings = new WatchlistNotificationSettings
        {
            UserId = _testUserId,
            GloballyEnabled = true,
            MaxNotificationsPerHour = 10,
            MaxNotificationsPerDay = 50,
            QuietHoursStart = null,
            QuietHoursEnd = null,
            UnsubscribedNotificationTypes = new List<string>()
        };
        _context.WatchlistNotificationSettings.Add(settings);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.CanSendNotificationAsync(_testUserId, "availability_change");

        // Assert
        Assert.True(result);
    }

    [Fact]
    public async Task CanSendNotificationAsync_WithGloballyDisabled_ReturnsFalse()
    {
        // Arrange
        var settings = new WatchlistNotificationSettings
        {
            UserId = _testUserId,
            GloballyEnabled = false
        };
        _context.WatchlistNotificationSettings.Add(settings);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.CanSendNotificationAsync(_testUserId, "availability_change");

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task CanSendNotificationAsync_WithUnsubscribedFromAll_ReturnsFalse()
    {
        // Arrange
        var settings = new WatchlistNotificationSettings
        {
            UserId = _testUserId,
            GloballyEnabled = true,
            UnsubscribeFromAllDate = DateTime.UtcNow.AddDays(-1)
        };
        _context.WatchlistNotificationSettings.Add(settings);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.CanSendNotificationAsync(_testUserId, "availability_change");

        // Assert
        Assert.False(result);
    }

    // Unsubscribe Tests
    [Fact]
    public async Task UnsubscribeFromTypeAsync_WithValidType_UnsubscribesSuccessfully()
    {
        // Arrange
        var settings = new WatchlistNotificationSettings
        {
            UserId = _testUserId,
            UnsubscribedNotificationTypes = new List<string>()
        };
        _context.WatchlistNotificationSettings.Add(settings);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.UnsubscribeFromTypeAsync(_testUserId, "price_drop", "Too many emails");

        // Assert
        Assert.True(result);

        var updated = await _context.WatchlistNotificationSettings
            .FirstOrDefaultAsync(s => s.UserId == _testUserId);
        Assert.NotNull(updated);
        Assert.Contains("price_drop", updated.UnsubscribedNotificationTypes);
    }

    [Fact]
    public async Task UnsubscribeFromAllAsync_WithValidUser_UnsubscribesSuccessfully()
    {
        // Arrange
        var settings = new WatchlistNotificationSettings
        {
            UserId = _testUserId,
            AllowUnsubscribeFromAll = true
        };
        _context.WatchlistNotificationSettings.Add(settings);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.UnsubscribeFromAllAsync(_testUserId, "No longer interested");

        // Assert
        Assert.True(result);

        var updated = await _context.WatchlistNotificationSettings
            .FirstOrDefaultAsync(s => s.UserId == _testUserId);
        Assert.NotNull(updated);
        Assert.False(updated.AllowUnsubscribeFromAll);
        Assert.NotNull(updated.UnsubscribeFromAllDate);
        Assert.Equal("No longer interested", updated.UnsubscribeReason);
    }

    // Bulk Operations Tests
    [Fact]
    public async Task UpdateBulkPreferencesAsync_WithMultipleUsers_UpdatesAll()
    {
        // Arrange
        var user1 = Guid.NewGuid();
        var user2 = Guid.NewGuid();

        _context.WatchlistNotificationSettings.Add(new WatchlistNotificationSettings
        {
            UserId = user1,
            GloballyEnabled = true,
            EnablePushNotifications = false
        });

        _context.WatchlistNotificationSettings.Add(new WatchlistNotificationSettings
        {
            UserId = user2,
            GloballyEnabled = true,
            EnablePushNotifications = false
        });

        await _context.SaveChangesAsync();

        var request = new BulkPreferencesUpdateRequest
        {
            GloballyEnabled = false,
            PushEnabled = true
        };

        // Act
        var result = await _service.UpdateBulkPreferencesAsync(new List<Guid> { user1, user2 }, request);

        // Assert
        Assert.True(result);

        var updated1 = await _context.WatchlistNotificationSettings.FirstOrDefaultAsync(s => s.UserId == user1);
        var updated2 = await _context.WatchlistNotificationSettings.FirstOrDefaultAsync(s => s.UserId == user2);

        Assert.False(updated1!.GloballyEnabled);
        Assert.True(updated1.EnablePushNotifications);
        Assert.False(updated2!.GloballyEnabled);
        Assert.True(updated2.EnablePushNotifications);
    }

    // Analytics Tests
    [Fact]
    public async Task GetPreferencesStatsAsync_WithMultipleUsers_ReturnsStatistics()
    {
        // Arrange
        _context.WatchlistNotificationSettings.Add(new WatchlistNotificationSettings
        {
            UserId = Guid.NewGuid(),
            AllowUnsubscribeFromAll = true,
            PreferredNotificationMethod = "email",
            EnablePushNotifications = true
        });

        _context.WatchlistNotificationSettings.Add(new WatchlistNotificationSettings
        {
            UserId = Guid.NewGuid(),
            AllowUnsubscribeFromAll = false,
            PreferredNotificationMethod = "push",
            EnablePushNotifications = false,
            UnsubscribeFromAllDate = DateTime.UtcNow.AddDays(-5)
        });

        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetPreferencesStatsAsync();

        // Assert
        Assert.NotNull(result);
        Assert.Equal(2, result.TotalUsers);
        Assert.Equal(1, result.EnabledUsers);
        Assert.Equal(1, result.DisabledUsers);
        Assert.Equal(1, result.RecentUnsubscribes);
    }

    // GDPR Tests
    [Fact]
    public async Task DeleteUserDataAsync_WithValidUser_DeletesAllNotificationData()
    {
        // Arrange
        var userId = Guid.NewGuid();

        // Create settings
        _context.WatchlistNotificationSettings.Add(new WatchlistNotificationSettings
        {
            UserId = userId,
            GloballyEnabled = true
        });

        // Create notification
        var notificationId = Guid.NewGuid();
        _context.Notifications.Add(new Notification
        {
            Id = notificationId,
            UserId = userId,
            Type = "test",
            Title = "Test",
            Message = "Test"
        });

        await _context.SaveChangesAsync();

        // Act
        var result = await _service.DeleteUserDataAsync(userId);

        // Assert
        Assert.True(result);

        var deletedSettings = await _context.WatchlistNotificationSettings
            .FirstOrDefaultAsync(s => s.UserId == userId);
        var deletedNotifications = await _context.Notifications
            .Where(n => n.UserId == userId)
            .ToListAsync();

        Assert.Null(deletedSettings);
        Assert.Empty(deletedNotifications);

        // Verify cache was cleared
        _mockCache.Verify(c => c.RemoveAsync(
            It.Is<string>(key => key.Contains(userId.ToString())),
            It.IsAny<CancellationToken>()),
            Times.Once);
    }
}
