using Microsoft.Extensions.Logging;
using Sentry;
using GeoLeap.Api.Models;
using GeoLeap.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace GeoLeap.Api.Services;

/// <summary>
/// Notification service that integrates with user notification preferences
/// Extends the base NotificationService with preference-aware delivery
/// </summary>
public interface IPreferenceAwareNotificationService
{
    Task<bool> SendNotificationWithPreferencesAsync(
        Guid userId, 
        string title, 
        string message, 
        string type = "info",
        NotificationChannel channels = NotificationChannel.All);
    
    Task<int> SendBulkNotificationWithPreferencesAsync(
        IEnumerable<Guid> userIds, 
        string title, 
        string message, 
        string type = "info",
        NotificationChannel channels = NotificationChannel.All);
    
    Task<bool> ShouldSendNotificationAsync(Guid userId, string type, NotificationChannel channel);
    
    Task<List<NotificationChannel>> GetUserEnabledChannelsAsync(Guid userId);
    
    Task<NotificationDeliveryPreference> GetUserDeliveryPreferencesAsync(Guid userId);
    
    Task<bool> SendPersonalizedNotificationAsync(
        Guid userId,
        string templateKey,
        Dictionary<string, object> templateData,
        string type = "info");
}

public class PreferenceAwareNotificationService : IPreferenceAwareNotificationService
{
    private readonly INotificationService _baseNotificationService;
    private readonly IUserPreferenceIntegrationService _preferenceService;
    private readonly ILogger<PreferenceAwareNotificationService> _logger;
    private readonly ApplicationDbContext _context;

    public PreferenceAwareNotificationService(
        INotificationService baseNotificationService,
        IUserPreferenceIntegrationService preferenceService,
        ILogger<PreferenceAwareNotificationService> logger,
        ApplicationDbContext context)
    {
        _baseNotificationService = baseNotificationService;
        _preferenceService = preferenceService;
        _logger = logger;
        _context = context;
    }

    public async Task<bool> SendNotificationWithPreferencesAsync(
        Guid userId, 
        string title, 
        string message, 
        string type = "info",
        NotificationChannel channels = NotificationChannel.All)
    {
        try
        {
            _logger.LogInformation("Sending preference-aware notification to user {UserId}: {Title}", userId, title);

            // Check if user wants to receive this type of notification
            var shouldSend = await ShouldSendNotificationAsync(userId, type, channels);
            if (!shouldSend)
            {
                _logger.LogDebug("Notification blocked by user preferences for user {UserId}, type {Type}", userId, type);
                
                SentrySdk.AddBreadcrumb("NotificationBlockedByPreferences", "notification",
                    data: new Dictionary<string, string>
                    {
                        ["user_id"] = userId.ToString(),
                        ["notification_type"] = type,
                        ["title"] = title,
                        ["reason"] = "user_preference"
                    });
                
                return false;
            }

            // Get user's enabled notification channels
            var enabledChannels = await GetUserEnabledChannelsAsync(userId);
            var deliveryPrefs = await GetUserDeliveryPreferencesAsync(userId);

            var deliveryResults = new List<bool>();

            // Send via enabled channels
            foreach (var channel in enabledChannels)
            {
                if ((channels & channel) == channel) // Check if this channel is requested
                {
                    var delivered = await DeliverViaChannelAsync(
                        userId, title, message, type, channel, deliveryPrefs);
                    deliveryResults.Add(delivered);
                }
            }

            var anyDelivered = deliveryResults.Any(r => r);
            
            if (anyDelivered)
            {
                // Log successful delivery
                await LogNotificationDeliveryAsync(userId, title, message, type, enabledChannels, true);
                
                SentrySdk.AddBreadcrumb($"PreferenceAwareNotificationSent: {title}", "notification",
                    data: new Dictionary<string, string>
                    {
                        ["user_id"] = userId.ToString(),
                        ["notification_type"] = type,
                        ["title"] = title,
                        ["channels"] = string.Join(",", enabledChannels),
                        ["delivery_success"] = "true"
                    });
            }

            return anyDelivered;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send preference-aware notification to user {UserId}", userId);
            
            // Fallback to base notification service
            return await _baseNotificationService.SendNotificationAsync(userId, title, message, type);
        }
    }

    public async Task<int> SendBulkNotificationWithPreferencesAsync(
        IEnumerable<Guid> userIds, 
        string title, 
        string message, 
        string type = "info",
        NotificationChannel channels = NotificationChannel.All)
    {
        var userIdList = userIds.ToList();
        var successCount = 0;

        try
        {
            _logger.LogInformation("Sending bulk preference-aware notification to {UserCount} users", userIdList.Count);

            // Process notifications in parallel batches to avoid overwhelming the system
            var batchSize = 50;
            var batches = userIdList.Chunk(batchSize);

            foreach (var batch in batches)
            {
                var tasks = batch.Select(async userId =>
                {
                    try
                    {
                        var success = await SendNotificationWithPreferencesAsync(userId, title, message, type, channels);
                        return success ? 1 : 0;
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to send notification to user {UserId} in bulk operation", userId);
                        return 0;
                    }
                });

                var results = await Task.WhenAll(tasks);
                successCount += results.Sum();
            }

            SentrySdk.AddBreadcrumb($"BulkPreferenceAwareNotificationSent: {successCount}/{userIdList.Count}", "notification",
                data: new Dictionary<string, string>
                {
                    ["total_users"] = userIdList.Count.ToString(),
                    ["success_count"] = successCount.ToString(),
                    ["notification_type"] = type,
                    ["title"] = title
                });

            _logger.LogInformation("Bulk preference-aware notification completed: {SuccessCount}/{TotalCount}", 
                successCount, userIdList.Count);

            return successCount;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in bulk preference-aware notification");
            
            // Fallback to base service
            return await _baseNotificationService.SendBulkNotificationAsync(userIds, title, message, type);
        }
    }

    public async Task<bool> ShouldSendNotificationAsync(Guid userId, string type, NotificationChannel channel)
    {
        try
        {
            var notificationPrefs = await _preferenceService.GetNotificationPreferencesAsync(userId);
            
            // Check global notification preferences first
            if (!IsChannelEnabled(channel, notificationPrefs))
            {
                return false;
            }

            // Check specific notification type preferences
            return type.ToLowerInvariant() switch
            {
                "system" or "system_alert" => notificationPrefs.SystemAlerts,
                "business" or "business_alert" => notificationPrefs.BusinessAlerts,
                "security" or "security_alert" => notificationPrefs.SecurityAlerts,
                "payment" or "payment_alert" => notificationPrefs.PaymentAlerts,
                "marketing" or "marketing_email" => notificationPrefs.MarketingEmails,
                "update" or "update_notification" => notificationPrefs.UpdateNotifications,
                "digest" or "weekly_digest" => notificationPrefs.WeeklyDigest,
                "watchlist" or "watchlist_update" => notificationPrefs.WatchlistUpdates,
                "new_content" or "content_alert" => notificationPrefs.NewContentAlerts,
                "price_drop" or "price_alert" => notificationPrefs.PriceDropAlerts,
                _ => true // Allow unknown types by default
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error checking notification preferences for user {UserId}, defaulting to allow", userId);
            return true; // Default to allowing notifications on error
        }
    }

    public async Task<List<NotificationChannel>> GetUserEnabledChannelsAsync(Guid userId)
    {
        try
        {
            var notificationPrefs = await _preferenceService.GetNotificationPreferencesAsync(userId);
            var enabledChannels = new List<NotificationChannel>();

            if (notificationPrefs.EmailNotifications)
                enabledChannels.Add(NotificationChannel.Email);
                
            if (notificationPrefs.PushNotifications)
                enabledChannels.Add(NotificationChannel.Push);
                
            if (notificationPrefs.SmsNotifications)
                enabledChannels.Add(NotificationChannel.SMS);

            return enabledChannels;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error getting enabled channels for user {UserId}, defaulting to email", userId);
            return new List<NotificationChannel> { NotificationChannel.Email };
        }
    }

    public async Task<NotificationDeliveryPreference> GetUserDeliveryPreferencesAsync(Guid userId)
    {
        try
        {
            var languagePrefs = await _preferenceService.GetLanguagePreferencesAsync(userId);
            var geoPrefs = await _preferenceService.GetGeographicPreferencesAsync(userId);
            var themePrefs = await _preferenceService.GetThemePreferencesAsync(userId);

            return new NotificationDeliveryPreference
            {
                PreferredLanguage = languagePrefs.InterfaceLanguage,
                TimeZone = geoPrefs.TimeZone,
                PreferredTheme = themePrefs.Theme,
                HighContrast = themePrefs.HighContrast,
                ReducedMotion = themePrefs.ReducedMotion,
                CompactView = themePrefs.CompactView
            };
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error getting delivery preferences for user {UserId}, using defaults", userId);
            return new NotificationDeliveryPreference();
        }
    }

    public async Task<bool> SendPersonalizedNotificationAsync(
        Guid userId,
        string templateKey,
        Dictionary<string, object> templateData,
        string type = "info")
    {
        try
        {
            // Get user delivery preferences
            var deliveryPrefs = await GetUserDeliveryPreferencesAsync(userId);
            
            // Get localized template
            var template = await GetLocalizedTemplateAsync(templateKey, deliveryPrefs.PreferredLanguage);
            
            // Render template with user data
            var personalizedContent = RenderTemplate(template, templateData, deliveryPrefs);
            
            // Send using preference-aware delivery
            return await SendNotificationWithPreferencesAsync(
                userId, 
                personalizedContent.Title, 
                personalizedContent.Message, 
                type);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error sending personalized notification to user {UserId} with template {TemplateKey}", 
                userId, templateKey);
            
            // Fallback to simple notification
            return await SendNotificationWithPreferencesAsync(
                userId,
                "Notification",
                "You have a new notification.",
                type);
        }
    }

    private bool IsChannelEnabled(NotificationChannel channel, NotificationPreferences prefs)
    {
        return channel switch
        {
            NotificationChannel.Email => prefs.EmailNotifications,
            NotificationChannel.Push => prefs.PushNotifications,
            NotificationChannel.SMS => prefs.SmsNotifications,
            NotificationChannel.All => prefs.EmailNotifications || prefs.PushNotifications || prefs.SmsNotifications,
            _ => false
        };
    }

    private async Task<bool> DeliverViaChannelAsync(
        Guid userId,
        string title,
        string message,
        string type,
        NotificationChannel channel,
        NotificationDeliveryPreference deliveryPrefs)
    {
        try
        {
            // Customize content based on delivery preferences
            var customizedContent = CustomizeContentForChannel(title, message, channel, deliveryPrefs);
            
            // Simulate delivery via different channels
            switch (channel)
            {
                case NotificationChannel.Email:
                    return await DeliverViaEmailAsync(userId, customizedContent.Title, customizedContent.Message, type, deliveryPrefs);
                    
                case NotificationChannel.Push:
                    return await DeliverViaPushAsync(userId, customizedContent.Title, customizedContent.Message, type);
                    
                case NotificationChannel.SMS:
                    return await DeliverViaSmsAsync(userId, customizedContent.Title, customizedContent.Message, type);
                    
                default:
                    return false;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error delivering notification via {Channel} to user {UserId}", channel, userId);
            return false;
        }
    }

    private async Task<bool> DeliverViaEmailAsync(
        Guid userId, 
        string title, 
        string message, 
        string type,
        NotificationDeliveryPreference prefs)
    {
        // In a real implementation, this would use an email service
        // For now, use the base notification service
        _logger.LogInformation("Delivering email notification to user {UserId}: {Title}", userId, title);
        return await _baseNotificationService.SendNotificationAsync(userId, title, message, type);
    }

    private async Task<bool> DeliverViaPushAsync(Guid userId, string title, string message, string type)
    {
        // In a real implementation, this would use a push notification service
        _logger.LogInformation("Delivering push notification to user {UserId}: {Title}", userId, title);
        await Task.Delay(25); // Simulate push delivery
        return true;
    }

    private async Task<bool> DeliverViaSmsAsync(Guid userId, string title, string message, string type)
    {
        // In a real implementation, this would use an SMS service
        _logger.LogInformation("Delivering SMS notification to user {UserId}: {Title}", userId, title);
        await Task.Delay(30); // Simulate SMS delivery
        return true;
    }

    private (string Title, string Message) CustomizeContentForChannel(
        string title,
        string message,
        NotificationChannel channel,
        NotificationDeliveryPreference prefs)
    {
        switch (channel)
        {
            case NotificationChannel.SMS:
                // Truncate for SMS
                var truncatedTitle = title.Length > 50 ? title.Substring(0, 47) + "..." : title;
                var truncatedMessage = message.Length > 140 ? message.Substring(0, 137) + "..." : message;
                return (truncatedTitle, truncatedMessage);
                
            case NotificationChannel.Push:
                // Optimize for push notifications
                var shortTitle = title.Length > 60 ? title.Substring(0, 57) + "..." : title;
                var shortMessage = message.Length > 200 ? message.Substring(0, 197) + "..." : message;
                return (shortTitle, shortMessage);
                
            default:
                return (title, message);
        }
    }

    private async Task<NotificationTemplate> GetLocalizedTemplateAsync(string templateKey, string language)
    {
        // In a real implementation, this would fetch from a template service
        // For now, return a simple template
        return new NotificationTemplate
        {
            Key = templateKey,
            Language = language,
            TitleTemplate = "{{title}}",
            MessageTemplate = "{{message}}"
        };
    }

    private (string Title, string Message) RenderTemplate(
        NotificationTemplate template,
        Dictionary<string, object> data,
        NotificationDeliveryPreference prefs)
    {
        // Simple template rendering
        var title = template.TitleTemplate;
        var message = template.MessageTemplate;

        foreach (var kvp in data)
        {
            var placeholder = $"{{{{{kvp.Key}}}}}";
            title = title.Replace(placeholder, kvp.Value?.ToString() ?? "");
            message = message.Replace(placeholder, kvp.Value?.ToString() ?? "");
        }

        return (title, message);
    }

    private async Task LogNotificationDeliveryAsync(
        Guid userId,
        string title,
        string message,
        string type,
        List<NotificationChannel> channels,
        bool success)
    {
        try
        {
            var log = new NotificationDeliveryLog
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                Title = title,
                Message = message,
                Type = type,
                Channels = string.Join(",", channels),
                DeliveredAt = DateTime.UtcNow,
                Success = success
            };

            _context.NotificationDeliveryLogs.Add(log);
            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to log notification delivery for user {UserId}", userId);
        }
    }
}

/// <summary>
/// Notification delivery channel flags
/// </summary>
[Flags]
public enum NotificationChannel
{
    None = 0,
    Email = 1,
    Push = 2,
    SMS = 4,
    All = Email | Push | SMS
}

/// <summary>
/// User's notification delivery preferences
/// </summary>
public class NotificationDeliveryPreference
{
    public string PreferredLanguage { get; set; } = "en";
    public string TimeZone { get; set; } = "UTC";
    public string PreferredTheme { get; set; } = "light";
    public bool HighContrast { get; set; } = false;
    public bool ReducedMotion { get; set; } = false;
    public bool CompactView { get; set; } = false;
}

/// <summary>
/// Notification template for localization
/// </summary>
public class NotificationTemplate
{
    public string Key { get; set; } = string.Empty;
    public string Language { get; set; } = "en";
    public string TitleTemplate { get; set; } = string.Empty;
    public string MessageTemplate { get; set; } = string.Empty;
}