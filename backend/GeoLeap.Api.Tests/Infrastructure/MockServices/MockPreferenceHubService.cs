using GeoLeap.Api.Services;
using GeoLeap.Api.Hubs;
using GeoLeap.Api.Models;

namespace GeoLeap.Api.Tests.Infrastructure.MockServices;

/// <summary>
/// Mock implementation of PreferenceHubService for US83 tests
/// Provides comprehensive preference synchronization functionality
/// </summary>
public class MockPreferenceHubService : IPreferenceHubService
{
    public Task NotifyPreferenceChanged(Guid userId, string categoryKey, string preferenceKey, object newValue, string action)
    {
        // Mock implementation - no-op for tests
        return Task.CompletedTask;
    }

    public Task NotifyBulkPreferencesChanged(Guid userId, List<UserPreferenceDto> preferences, string action)
    {
        // Mock implementation - no-op for tests
        return Task.CompletedTask;
    }

    public Task NotifyPreferenceDeleted(Guid userId, string categoryKey, string preferenceKey)
    {
        // Mock implementation - no-op for tests
        return Task.CompletedTask;
    }

    public Task NotifyUserDevices(Guid userId, string message, object data)
    {
        // Mock implementation - no-op for tests
        return Task.CompletedTask;
    }

    public Task<object> GetUserPreferencesAsync(Guid userId)
    {
        var preferences = new
        {
            UserId = userId,
            StreamingPreferences = new
            {
                PreferredServices = new[] { "Netflix", "Disney+", "Hulu" },
                PreferredGenres = new[] { "Action", "Comedy", "Drama" },
                ContentRating = "PG-13",
                Language = "en",
                SubtitlePreference = "auto"
            },
            VpnPreferences = new
            {
                PreferredProviders = new[] { "NordVPN", "ExpressVPN" },
                PreferredRegions = new[] { "US", "UK", "CA" },
                AutoConnect = true,
                ProtocolPreference = "auto"
            },
            NotificationPreferences = new
            {
                EmailNotifications = true,
                PushNotifications = true,
                WeeklyDigest = true,
                QuietHours = new { Start = "22:00", End = "08:00" }
            },
            PrivacySettings = new
            {
                ShareUsageData = false,
                PersonalizedRecommendations = true,
                ThirdPartyTracking = false
            },
            LastUpdated = DateTime.UtcNow.AddDays(-2),
            SyncStatus = "Synchronized"
        };

        return Task.FromResult((object)preferences);
    }

    public Task<bool> UpdateUserPreferencesAsync(Guid userId, object preferences)
    {
        // Mock successful update
        return Task.FromResult(true);
    }

    public Task<object> SyncPreferencesAsync(Guid userId)
    {
        var syncResult = new
        {
            UserId = userId,
            SyncStatus = "Success",
            LastSyncTime = DateTime.UtcNow,
            SynchronizedSections = new[] 
            { 
                "StreamingPreferences", 
                "VpnPreferences", 
                "NotificationPreferences", 
                "PrivacySettings" 
            },
            ConflictsResolved = 0,
            NextSyncTime = DateTime.UtcNow.AddHours(1)
        };

        return Task.FromResult((object)syncResult);
    }

    public Task<object> GetPreferenceSyncStatusAsync(Guid userId)
    {
        var status = new
        {
            UserId = userId,
            OverallStatus = "Synchronized",
            LastSyncTime = DateTime.UtcNow.AddMinutes(-15),
            SectionStatus = new
            {
                StreamingPreferences = "Synchronized",
                VpnPreferences = "Synchronized", 
                NotificationPreferences = "Synchronized",
                PrivacySettings = "Synchronized"
            },
            PendingChanges = 0,
            SyncErrors = new object[0],
            NextScheduledSync = DateTime.UtcNow.AddHours(1)
        };

        return Task.FromResult((object)status);
    }

    public Task<bool> ResetPreferencesToDefaultAsync(Guid userId)
    {
        // Mock successful reset
        return Task.FromResult(true);
    }

    public Task<object> ExportUserPreferencesAsync(Guid userId, string format = "json")
    {
        var exportData = format.ToLower() switch
        {
            "json" => (object)new
            {
                Format = "JSON",
                Data = GetUserPreferencesAsync(userId).Result,
                ExportedAt = DateTime.UtcNow,
                Version = "1.0"
            },
            "csv" => (object)new
            {
                Format = "CSV",
                Data = "Section,Setting,Value\nStreaming,PreferredService,Netflix\nVPN,PreferredProvider,NordVPN",
                ExportedAt = DateTime.UtcNow,
                Version = "1.0"
            },
            _ => (object)new
            {
                Format = "Unknown",
                Error = "Unsupported format",
                SupportedFormats = new[] { "json", "csv" }
            }
        };

        return Task.FromResult((object)exportData);
    }

    public Task<bool> ImportUserPreferencesAsync(Guid userId, object preferencesData, string format = "json")
    {
        // Mock successful import
        return Task.FromResult(true);
    }
}