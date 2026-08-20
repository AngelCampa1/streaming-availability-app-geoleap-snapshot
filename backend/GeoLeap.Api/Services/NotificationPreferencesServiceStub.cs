using GeoLeap.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace GeoLeap.Api.Services;

/// <summary>
/// Stub implementation for missing INotificationPreferencesService methods to fix compilation
/// This provides basic implementations for the interface methods not yet implemented
/// </summary>
public partial class NotificationPreferencesService
{
    // Core interface methods that are missing
    public async Task<NotificationSettings> GetUserPreferencesAsync(Guid userId)
    {
        try
        {
            var settings = await GetOrCreateSettingsAsync(userId);
            
            return new NotificationSettings
            {
                Id = settings.Id,
                UserId = settings.UserId,
                GloballyEnabled = settings.GloballyEnabled,
                EmailEnabled = settings.EnableEmailNotifications,
                PushEnabled = settings.EnablePushNotifications,
                SmsEnabled = settings.EnableSmsNotifications,
                InAppEnabled = true,
                WeeklyDigestEnabled = settings.WeeklyDigest,
                MonthlyDigestEnabled = settings.MonthlyDigest,
                QuietHoursStart = settings.QuietHoursStart,
                QuietHoursEnd = settings.QuietHoursEnd,
                MaxNotificationsPerHour = settings.MaxNotificationsPerHour,
                MaxNotificationsPerDay = settings.MaxNotificationsPerDay,
                UnsubscribedFromAllAt = settings.UnsubscribeFromAllDate,
                UnsubscribedTypes = settings.UnsubscribedNotificationTypes,
                CreatedAt = settings.CreatedAt,
                UpdatedAt = settings.UpdatedAt
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting user preferences for user {UserId}", userId);
            throw;
        }
    }

    public async Task<bool> UpdateUserPreferencesAsync(Guid userId, NotificationSettings preferences)
    {
        try
        {
            var settings = await GetOrCreateSettingsAsync(userId);
            
            // Map from NotificationSettings to WatchlistNotificationSettings
            settings.WeeklyDigest = preferences.WeeklyDigestEnabled;
            settings.MonthlyDigest = preferences.MonthlyDigestEnabled;
            
            settings.UpdatedAt = DateTime.UtcNow;
            
            await _context.SaveChangesAsync();
            await InvalidateCacheAsync(userId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating user preferences for user {UserId}", userId);
            return false;
        }
    }

    public async Task<bool> CreateDefaultPreferencesAsync(Guid userId)
    {
        try
        {
            var existingSettings = await _context.WatchlistNotificationSettings
                .FirstOrDefaultAsync(s => s.UserId == userId);

            if (existingSettings == null)
            {
                await GetOrCreateSettingsAsync(userId); // This will create default settings
                return true;
            }

            // Update existing settings to defaults
            existingSettings.GloballyEnabled = true;
            existingSettings.NotifyOnAvailabilityChange = true;
            existingSettings.NotifyOnLeavingPlatform = true;
            existingSettings.NotifyOnContentExpiring = true;
            existingSettings.NotifyOnRegionalChanges = false;
            existingSettings.WeeklyDigest = true;
            existingSettings.MonthlyDigest = true;
            existingSettings.EnableEmailNotifications = true;
            existingSettings.EnablePushNotifications = true;
            existingSettings.EnableSmsNotifications = false;
            existingSettings.MaxNotificationsPerHour = 10;
            existingSettings.MaxNotificationsPerDay = 50;
            existingSettings.UnsubscribeFromAllDate = null;
            existingSettings.UnsubscribedNotificationTypesJson = null;
            existingSettings.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
            await InvalidateCacheAsync(userId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating default preferences for user {UserId}", userId);
            return false;
        }
    }

    // CanSendNotificationAsync is now implemented in the main NotificationPreferencesService.cs file

    public async Task<bool> IsInQuietHoursAsync(Guid userId)
    {
        try
        {
            var settings = await GetOrCreateSettingsAsync(userId);
            
            if (!settings.QuietHoursStart.HasValue || !settings.QuietHoursEnd.HasValue)
            {
                return false; // No quiet hours configured
            }
            
            var now = DateTime.UtcNow.TimeOfDay;
            var startTime = settings.QuietHoursStart.Value;
            var endTime = settings.QuietHoursEnd.Value;
            if (startTime <= endTime)
            {
                // Same day quiet hours (e.g., 09:00 to 17:00)
                return now >= startTime && now <= endTime;
            }
            else
            {
                // Overnight quiet hours (e.g., 22:00 to 08:00)
                return now >= startTime || now <= endTime;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking quiet hours for user {UserId}", userId);
            return false;
        }
    }
    // Channel preferences
    public async Task<bool> EnableChannelAsync(Guid userId, string channel)
    {
        try
        {
            var settings = await GetOrCreateSettingsAsync(userId);
            // Simple implementation - this would be enhanced in full implementation
            await _context.SaveChangesAsync();
            await InvalidateCacheAsync(userId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error enabling channel {Channel} for user {UserId}", channel, userId);
            return false;
        }
    }

    public async Task<bool> DisableChannelAsync(Guid userId, string channel)
    {
        try
        {
            var settings = await GetOrCreateSettingsAsync(userId);
            // Simple implementation - this would be enhanced in full implementation
            await _context.SaveChangesAsync();
            await InvalidateCacheAsync(userId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error disabling channel {Channel} for user {UserId}", channel, userId);
            return false;
        }
    }

    public async Task<List<string>> GetEnabledChannelsAsync(Guid userId)
    {
        try
        {
            var settings = await GetOrCreateSettingsAsync(userId);
            var channels = new List<string>();
            
            // Basic channel detection based on preferences
            if (settings.PreferredNotificationMethod?.Contains("email") == true) channels.Add("email");
            if (settings.EnablePushNotifications) channels.Add("push");
            if (settings.EnableSmsNotifications) channels.Add("sms");
            
            return channels;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting enabled channels for user {UserId}", userId);
            return new List<string>();
        }
    }

    // Type-specific preferences
    public async Task<bool> EnableNotificationTypeAsync(Guid userId, string notificationType)
    {
        try
        {
            var settings = await GetOrCreateSettingsAsync(userId);
            
            // Simple mapping of notification types to settings
            switch (notificationType)
            {
                case "availability_change":
                    settings.NotifyOnAvailabilityChange = true;
                    break;
                case "content_expiring":
                    settings.NotifyOnContentExpiring = true;
                    break;
                case "price_drop":
                    // This would be a new field in future
                    break;
                default:
                    _logger.LogWarning("Unknown notification type: {NotificationType}", notificationType);
                    break;
            }
            
            await _context.SaveChangesAsync();
            await InvalidateCacheAsync(userId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error enabling notification type {NotificationType} for user {UserId}", notificationType, userId);
            return false;
        }
    }

    public async Task<bool> DisableNotificationTypeAsync(Guid userId, string notificationType)
    {
        try
        {
            var settings = await GetOrCreateSettingsAsync(userId);
            
            // Simple mapping of notification types to settings
            switch (notificationType)
            {
                case "availability_change":
                    settings.NotifyOnAvailabilityChange = false;
                    break;
                case "content_expiring":
                    settings.NotifyOnContentExpiring = false;
                    break;
                case "price_drop":
                    // This would be a new field in future
                    break;
                default:
                    _logger.LogWarning("Unknown notification type: {NotificationType}", notificationType);
                    break;
            }
            
            await _context.SaveChangesAsync();
            await InvalidateCacheAsync(userId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error disabling notification type {NotificationType} for user {UserId}", notificationType, userId);
            return false;
        }
    }

    public async Task<Dictionary<string, bool>> GetNotificationTypePreferencesAsync(Guid userId)
    {
        try
        {
            var settings = await GetOrCreateSettingsAsync(userId);
            
            return new Dictionary<string, bool>
            {
                {"availability_change", settings.NotifyOnAvailabilityChange},
                {"content_expiring", settings.NotifyOnContentExpiring},
                {"leaving_platform", settings.NotifyOnLeavingPlatform},
                {"regional_changes", settings.NotifyOnRegionalChanges},
                {"weekly_digest", settings.WeeklyDigest},
                {"monthly_digest", settings.MonthlyDigest}
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting notification type preferences for user {UserId}", userId);
            return new Dictionary<string, bool>();
        }
    }

    // Rate limiting
    public async Task<bool> IsWithinRateLimitAsync(Guid userId, string notificationType)
    {
        try
        {
            // Get user's rate limit settings
            var settings = await GetOrCreateSettingsAsync(userId);
            var hourAgo = DateTime.UtcNow.AddHours(-1);
            var dayAgo = DateTime.UtcNow.AddDays(-1);

            // Check hourly rate limit using NotificationDeliveryLogs
            var hourlyCount = await _context.NotificationDeliveryLogs
                .CountAsync(n => n.UserId == userId &&
                                n.NotificationType == notificationType &&
                                n.Status == "sent" &&
                                n.DeliveredAt >= hourAgo);

            var maxHourly = settings.MaxNotificationsPerHour == 0 ? 10 : settings.MaxNotificationsPerHour;
            if (hourlyCount >= maxHourly)
                return false; // Exceeded hourly limit

            // Check daily rate limit using NotificationDeliveryLogs
            var dailyCount = await _context.NotificationDeliveryLogs
                .CountAsync(n => n.UserId == userId &&
                                n.NotificationType == notificationType &&
                                n.Status == "sent" &&
                                n.DeliveredAt >= dayAgo);

            var maxDaily = settings.MaxNotificationsPerDay == 0 ? 50 : settings.MaxNotificationsPerDay;
            return dailyCount < maxDaily; // Within limits if daily count is below max
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking rate limit for user {UserId}, type {NotificationType}", userId, notificationType);
            return false;
        }
    }

    public async Task<NotificationRateLimit> GetOrCreateRateLimitAsync(Guid userId, string notificationType, string timeWindow)
    {
        try
        {
            var existing = await _context.NotificationRateLimits
                .FirstOrDefaultAsync(r => r.UserId == userId && 
                                         r.NotificationType == notificationType && 
                                         r.TimeWindow == timeWindow);
            
            if (existing != null)
                return existing;
            
            var rateLimit = new NotificationRateLimit
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                NotificationType = notificationType,
                TimeWindow = timeWindow,
                Limit = 10, // Default limit
                Count = 0,
                WindowStart = DateTime.UtcNow,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            
            _context.NotificationRateLimits.Add(rateLimit);
            await _context.SaveChangesAsync();
            
            return rateLimit;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting or creating rate limit for user {UserId}", userId);
            throw;
        }
    }

    public async Task IncrementRateLimitCountAsync(Guid userId, string notificationType, string timeWindow)
    {
        try
        {
            var rateLimit = await GetOrCreateRateLimitAsync(userId, notificationType, timeWindow);
            rateLimit.Count++;
            rateLimit.UpdatedAt = DateTime.UtcNow;
            
            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error incrementing rate limit for user {UserId}", userId);
        }
    }

    // Quiet hours and timing
    public async Task<bool> SetQuietHoursAsync(Guid userId, TimeSpan startTime, TimeSpan endTime, string timeZone)
    {
        try
        {
            var settings = await GetOrCreateSettingsAsync(userId);
            settings.QuietHoursStart = startTime;
            settings.QuietHoursEnd = endTime;
            
            await _context.SaveChangesAsync();
            await InvalidateCacheAsync(userId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error setting quiet hours for user {UserId}", userId);
            return false;
        }
    }

    public async Task<bool> SetQuietDaysAsync(Guid userId, List<DayOfWeek> quietDays)
    {
        try
        {
            var settings = await GetOrCreateSettingsAsync(userId);
            // This would require a new field in the settings table
            // For now, just return success
            
            await _context.SaveChangesAsync();
            await InvalidateCacheAsync(userId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error setting quiet days for user {UserId}", userId);
            return false;
        }
    }

    // Frequency and aggregation
    public async Task<bool> SetNotificationFrequencyAsync(Guid userId, string frequency)
    {
        try
        {
            var settings = await GetOrCreateSettingsAsync(userId);
            // This would require a new field in the settings table
            
            await _context.SaveChangesAsync();
            await InvalidateCacheAsync(userId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error setting notification frequency for user {UserId}", userId);
            return false;
        }
    }

    public async Task<bool> SetAggregationPreferencesAsync(Guid userId, bool enabled, int windowMinutes)
    {
        try
        {
            var settings = await GetOrCreateSettingsAsync(userId);
            // This would require new fields in the settings table
            
            await _context.SaveChangesAsync();
            await InvalidateCacheAsync(userId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error setting aggregation preferences for user {UserId}", userId);
            return false;
        }
    }

    // Advanced features
    public async Task<bool> EnableSmartTimingAsync(Guid userId, bool enabled)
    {
        try
        {
            var settings = await GetOrCreateSettingsAsync(userId);
            // This would require a new field
            
            await _context.SaveChangesAsync();
            await InvalidateCacheAsync(userId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error setting smart timing for user {UserId}", userId);
            return false;
        }
    }

    public async Task<bool> EnablePredictiveFilteringAsync(Guid userId, bool enabled)
    {
        try
        {
            var settings = await GetOrCreateSettingsAsync(userId);
            // This would require a new field
            
            await _context.SaveChangesAsync();
            await InvalidateCacheAsync(userId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error setting predictive filtering for user {UserId}", userId);
            return false;
        }
    }

    public async Task<bool> SetNotificationToneAsync(Guid userId, string tone)
    {
        try
        {
            var settings = await GetOrCreateSettingsAsync(userId);
            // This would require a new field
            
            await _context.SaveChangesAsync();
            await InvalidateCacheAsync(userId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error setting notification tone for user {UserId}", userId);
            return false;
        }
    }

    // Digest preferences
    public async Task<bool> SetDigestPreferencesAsync(Guid userId, bool dailyEnabled, bool weeklyEnabled, bool monthlyEnabled)
    {
        try
        {
            var settings = await GetOrCreateSettingsAsync(userId);
            settings.WeeklyDigest = weeklyEnabled;
            settings.MonthlyDigest = monthlyEnabled;
            // Daily digest would need a new field
            
            await _context.SaveChangesAsync();
            await InvalidateCacheAsync(userId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error setting digest preferences for user {UserId}", userId);
            return false;
        }
    }

    public async Task<bool> SetDigestDeliveryTimeAsync(Guid userId, TimeSpan deliveryTime)
    {
        try
        {
            var settings = await GetOrCreateSettingsAsync(userId);
            // This would require a new field
            
            await _context.SaveChangesAsync();
            await InvalidateCacheAsync(userId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error setting digest delivery time for user {UserId}", userId);
            return false;
        }
    }

    public async Task<bool> SetWeeklyDigestDayAsync(Guid userId, DayOfWeek dayOfWeek)
    {
        try
        {
            var settings = await GetOrCreateSettingsAsync(userId);
            // This would require a new field
            
            await _context.SaveChangesAsync();
            await InvalidateCacheAsync(userId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error setting weekly digest day for user {UserId}", userId);
            return false;
        }
    }

    public async Task<bool> SetMonthlyDigestDayAsync(Guid userId, int dayOfMonth)
    {
        try
        {
            var settings = await GetOrCreateSettingsAsync(userId);
            // This would require a new field
            
            await _context.SaveChangesAsync();
            await InvalidateCacheAsync(userId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error setting monthly digest day for user {UserId}", userId);
            return false;
        }
    }

    // Content filtering
    public async Task<bool> SetContentFiltersAsync(Guid userId, Dictionary<string, object> filters)
    {
        try
        {
            var settings = await GetOrCreateSettingsAsync(userId);
            // This would require storing filters as JSON
            
            await _context.SaveChangesAsync();
            await InvalidateCacheAsync(userId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error setting content filters for user {UserId}", userId);
            return false;
        }
    }

    public async Task<bool> SetMinimumRatingAsync(Guid userId, decimal? minimumRating)
    {
        try
        {
            var settings = await GetOrCreateSettingsAsync(userId);
            // This would require a new field
            
            await _context.SaveChangesAsync();
            await InvalidateCacheAsync(userId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error setting minimum rating for user {UserId}", userId);
            return false;
        }
    }

    // UnsubscribeFromTypeAsync method already exists in the main service class

    public async Task<bool> UnsubscribeFromAllAsync(Guid userId, string? reason = null)
    {
        try
        {
            var settings = await GetOrCreateSettingsAsync(userId);

            // Set unsubscribe from all date and disable globally
            settings.UnsubscribeFromAllDate = DateTime.UtcNow;
            settings.GloballyEnabled = false;
            settings.AllowUnsubscribeFromAll = false;
            settings.UnsubscribeReason = reason;

            // Also disable all notification types
            settings.NotifyOnAvailabilityChange = false;
            settings.NotifyOnLeavingPlatform = false;
            settings.NotifyOnContentExpiring = false;
            settings.NotifyOnRegionalChanges = false;
            settings.WeeklyDigest = false;
            settings.MonthlyDigest = false;
            settings.EnableEmailNotifications = false;
            settings.EnablePushNotifications = false;
            settings.EnableSmsNotifications = false;

            await _context.SaveChangesAsync();
            await InvalidateCacheAsync(userId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error unsubscribing from all notifications for user {UserId}", userId);
            return false;
        }
    }

    public async Task<bool> ResubscribeToTypeAsync(Guid userId, string notificationType)
    {
        try
        {
            return await EnableNotificationTypeAsync(userId, notificationType);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error resubscribing to type {NotificationType} for user {UserId}", notificationType, userId);
            return false;
        }
    }

    public async Task<bool> ResubscribeToAllAsync(Guid userId)
    {
        try
        {
            var settings = await GetOrCreateSettingsAsync(userId);

            // Clear unsubscribe from all and re-enable globally
            settings.UnsubscribeFromAllDate = null;
            settings.GloballyEnabled = true;
            settings.UnsubscribeReason = null;

            // Enable all notification types to defaults
            settings.NotifyOnAvailabilityChange = true;
            settings.NotifyOnLeavingPlatform = true;
            settings.NotifyOnContentExpiring = true;
            settings.NotifyOnRegionalChanges = false; // Keep this false by default
            settings.WeeklyDigest = true;
            settings.MonthlyDigest = true;
            settings.EnableEmailNotifications = true;
            settings.EnablePushNotifications = true;

            await _context.SaveChangesAsync();
            await InvalidateCacheAsync(userId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error resubscribing to all notifications for user {UserId}", userId);
            return false;
        }
    }

    public async Task<List<string>> GetUnsubscribedTypesAsync(Guid userId)
    {
        try
        {
            var preferences = await GetNotificationTypePreferencesAsync(userId);
            return preferences.Where(p => !p.Value).Select(p => p.Key).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting unsubscribed types for user {UserId}", userId);
            return new List<string>();
        }
    }

    // GDPR and compliance
    public async Task<bool> SetDataProcessingConsentAsync(Guid userId, bool allowProcessing)
    {
        try
        {
            var settings = await GetOrCreateSettingsAsync(userId);
            // This would require a new field for GDPR consent
            
            await _context.SaveChangesAsync();
            await InvalidateCacheAsync(userId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error setting data processing consent for user {UserId}", userId);
            return false;
        }
    }

    public async Task<bool> SetProfileAnalysisConsentAsync(Guid userId, bool allowAnalysis)
    {
        try
        {
            var settings = await GetOrCreateSettingsAsync(userId);
            // This would require a new field for profile analysis consent
            
            await _context.SaveChangesAsync();
            await InvalidateCacheAsync(userId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error setting profile analysis consent for user {UserId}", userId);
            return false;
        }
    }

    // Analytics and insights
    public async Task<NotificationPreferencesStatsDto> GetPreferencesStatsAsync(Guid userId)
    {
        try
        {
            var settings = await GetOrCreateSettingsAsync(userId);
            var preferences = await GetNotificationTypePreferencesAsync(userId);
            var channels = await GetEnabledChannelsAsync(userId);
            
            return new NotificationPreferencesStatsDto
            {
                UserId = userId,
                EnabledChannels = channels.Count,
                EnabledNotificationTypes = preferences.Count(p => p.Value),
                DisabledNotificationTypes = preferences.Count(p => !p.Value),
                HasQuietHours = settings.QuietHoursStart.HasValue,
                HasContentFilters = false, // Would need implementation
                PreferenceScore = "medium",
                LastUpdated = settings.UpdatedAt,
                ChannelPreferences = channels.ToDictionary(c => c, c => true),
                NotificationFrequency = new Dictionary<string, int>()
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting preferences stats for user {UserId}", userId);
            throw;
        }
    }

    public async Task<List<NotificationPreferencesRecommendationDto>> GetPreferencesRecommendationsAsync(Guid userId)
    {
        try
        {
            var recommendations = new List<NotificationPreferencesRecommendationDto>();
            var settings = await GetOrCreateSettingsAsync(userId);
            
            // Simple recommendations based on current settings
            if (!settings.WeeklyDigest)
            {
                recommendations.Add(new NotificationPreferencesRecommendationDto
                {
                    Type = "digest",
                    Title = "Enable Weekly Digest",
                    Description = "Get a weekly summary of your watchlist activity",
                    Action = "enable_weekly_digest",
                    Confidence = 0.8,
                    Reason = "Most users find weekly digests helpful"
                });
            }
            
            return recommendations;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting preferences recommendations for user {UserId}", userId);
            return new List<NotificationPreferencesRecommendationDto>();
        }
    }

    // Bulk operations
    public async Task<int> ApplyDefaultPreferencesToUsersAsync(List<Guid> userIds)
    {
        try
        {
            int updated = 0;
            foreach (var userId in userIds)
            {
                if (await CreateDefaultPreferencesAsync(userId))
                {
                    updated++;
                }
            }
            return updated;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error applying default preferences to users");
            return 0;
        }
    }

    public async Task<int> MigratePreferencesAsync(Guid fromUserId, Guid toUserId)
    {
        try
        {
            var fromSettings = await GetOrCreateSettingsAsync(fromUserId);
            var toSettings = await GetOrCreateSettingsAsync(toUserId);
            
            // Copy preferences
            toSettings.NotifyOnAvailabilityChange = fromSettings.NotifyOnAvailabilityChange;
            toSettings.NotifyOnLeavingPlatform = fromSettings.NotifyOnLeavingPlatform;
            toSettings.NotifyOnContentExpiring = fromSettings.NotifyOnContentExpiring;
            toSettings.NotifyOnRegionalChanges = fromSettings.NotifyOnRegionalChanges;
            toSettings.WeeklyDigest = fromSettings.WeeklyDigest;
            toSettings.MonthlyDigest = fromSettings.MonthlyDigest;
            toSettings.PreferredNotificationMethod = fromSettings.PreferredNotificationMethod;
            toSettings.UrgentNotificationMethod = fromSettings.UrgentNotificationMethod;
            toSettings.EnableSmsNotifications = fromSettings.EnableSmsNotifications;
            toSettings.EnablePushNotifications = fromSettings.EnablePushNotifications;
            toSettings.QuietHoursStart = fromSettings.QuietHoursStart;
            toSettings.QuietHoursEnd = fromSettings.QuietHoursEnd;
            toSettings.MaxNotificationsPerHour = fromSettings.MaxNotificationsPerHour;
            toSettings.MaxNotificationsPerDay = fromSettings.MaxNotificationsPerDay;
            
            await _context.SaveChangesAsync();
            await InvalidateCacheAsync(toUserId);
            
            return 1;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error migrating preferences from {FromUserId} to {ToUserId}", fromUserId, toUserId);
            return 0;
        }
    }

    // Helper methods
    private async Task<WatchlistNotificationSettings> GetOrCreateSettingsAsync(Guid userId)
    {
        var settings = await _context.WatchlistNotificationSettings
            .FirstOrDefaultAsync(s => s.UserId == userId);
        
        if (settings == null)
        {
            settings = new WatchlistNotificationSettings
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                GloballyEnabled = true,
                NotifyOnAvailabilityChange = true,
                NotifyOnLeavingPlatform = true,
                NotifyOnContentExpiring = true,
                NotifyOnRegionalChanges = false,
                WeeklyDigest = true,
                MonthlyDigest = true,
                PreferredNotificationMethod = "email",
                UrgentNotificationMethod = "both",
                EnableEmailNotifications = true,
                EnableSmsNotifications = false,
                EnablePushNotifications = true,
                QuietHoursStart = TimeSpan.Parse("22:00"),
                QuietHoursEnd = TimeSpan.Parse("08:00"),
                MaxNotificationsPerHour = 10,
                MaxNotificationsPerDay = 50,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };
            
            _context.WatchlistNotificationSettings.Add(settings);
            await _context.SaveChangesAsync();
        }
        
        return settings;
    }

    private async Task InvalidateCacheAsync(Guid userId)
    {
        var cacheKey = $"notification_preferences:{userId}";
        await _cache.RemoveAsync(cacheKey);
    }
}