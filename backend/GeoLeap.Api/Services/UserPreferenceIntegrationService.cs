using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using System.Text.Json;

namespace GeoLeap.Api.Services;

/// <summary>
/// Centralized service for integrating user preferences across the application
/// Provides cached, performance-optimized preference lookups with fallback to defaults
/// </summary>
public interface IUserPreferenceIntegrationService
{
    Task<T> GetUserPreferenceAsync<T>(Guid userId, string categoryKey, string preferenceKey, T? defaultValue = default);
    Task<Dictionary<string, object>> GetUserPreferencesForCategoryAsync(Guid userId, string categoryKey);
    Task<SearchPreferences> GetSearchPreferencesAsync(Guid userId);
    Task<Models.NotificationPreferences> GetNotificationPreferencesAsync(Guid userId);
    Task<PrivacyPreferences> GetPrivacyPreferencesAsync(Guid userId);
    Task<ContentFilterPreferences> GetContentFilterPreferencesAsync(Guid userId);
    Task<ThemePreferences> GetThemePreferencesAsync(Guid userId);
    Task<GeographicPreferences> GetGeographicPreferencesAsync(Guid userId);
    Task<LanguagePreferences> GetLanguagePreferencesAsync(Guid userId);
    Task InvalidateUserPreferenceCacheAsync(Guid userId);
    Task WarmupPreferencesAsync(Guid userId);
    
    // Additional methods for comprehensive preference management
    Task<UserPreferencesAggregate> GetUserPreferencesAggregateAsync(Guid userId);
    Task<bool> UpdateSearchPreferencesAsync(Guid userId, SearchPreferences preferences);
    Task<bool> UpdateContentFilterPreferencesAsync(Guid userId, ContentFilterPreferences preferences);
    Task<bool> UpdatePrivacyPreferencesAsync(Guid userId, PrivacyPreferences preferences);
    Task<bool> ResolvePreferenceConflictAsync(Guid userId, PreferenceConflict conflict);
    Task<List<PreferenceConflict>> GetPendingConflictsAsync(Guid userId);
}

public class UserPreferenceIntegrationService : IUserPreferenceIntegrationService
{
    private readonly ApplicationDbContext _context;
    private readonly IMemoryCache _cache;
    private readonly ILogger<UserPreferenceIntegrationService> _logger;
    private readonly IPreferenceService _preferenceService;
    
    private readonly TimeSpan _cacheExpiration = TimeSpan.FromMinutes(15);
    private readonly TimeSpan _fallbackCacheExpiration = TimeSpan.FromMinutes(5);
    
    /// <summary>
    /// Helper method to set cache entries with required size when SizeLimit is configured
    /// </summary>
    private void SetCacheValue<T>(string key, T value, TimeSpan expiration)
    {
        var options = new MemoryCacheEntryOptions
        {
            AbsoluteExpirationRelativeToNow = expiration,
            Size = 1 // Required when SizeLimit is set
        };
        _cache.Set(key, value, options);
    }
    
    public UserPreferenceIntegrationService(
        ApplicationDbContext context,
        IMemoryCache cache,
        ILogger<UserPreferenceIntegrationService> logger,
        IPreferenceService preferenceService)
    {
        _context = context;
        _cache = cache;
        _logger = logger;
        _preferenceService = preferenceService;
    }

    public async Task<T> GetUserPreferenceAsync<T>(Guid userId, string categoryKey, string preferenceKey, T? defaultValue = default)
    {
        var cacheKey = $"user_pref:{userId}:{categoryKey}:{preferenceKey}";
        
        if (_cache.TryGetValue(cacheKey, out T cachedValue))
        {
            return cachedValue;
        }

        try
        {
            var preferenceValue = await _preferenceService.ResolvePreferenceValueAsync(userId, categoryKey, preferenceKey);
            
            if (preferenceValue != null)
            {
                var typedValue = ConvertToType<T>(preferenceValue, defaultValue);
                SetCacheValue(cacheKey, typedValue, _cacheExpiration);
                return typedValue;
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to retrieve preference {CategoryKey}.{PreferenceKey} for user {UserId}", 
                categoryKey, preferenceKey, userId);
        }

        // Cache the default value temporarily to avoid repeated lookups
        SetCacheValue(cacheKey, defaultValue, _fallbackCacheExpiration);
        return defaultValue;
    }

    public async Task<Dictionary<string, object>> GetUserPreferencesForCategoryAsync(Guid userId, string categoryKey)
    {
        var cacheKey = $"user_prefs_category:{userId}:{categoryKey}";
        
        if (_cache.TryGetValue(cacheKey, out Dictionary<string, object> cachedPrefs))
        {
            return cachedPrefs;
        }

        try
        {
            var allPreferences = await _preferenceService.ResolveAllPreferencesAsync(userId);
            var categoryPreferences = allPreferences
                .Where(kvp => kvp.Key.StartsWith($"{categoryKey}."))
                .ToDictionary(
                    kvp => kvp.Key.Substring(categoryKey.Length + 1), 
                    kvp => kvp.Value);

            SetCacheValue(cacheKey, categoryPreferences, _cacheExpiration);
            return categoryPreferences;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve preferences for category {CategoryKey} for user {UserId}", 
                categoryKey, userId);
            return new Dictionary<string, object>();
        }
    }

    public async Task<SearchPreferences> GetSearchPreferencesAsync(Guid userId)
    {
        var cacheKey = $"search_prefs:{userId}";
        
        if (_cache.TryGetValue(cacheKey, out SearchPreferences cachedPrefs))
        {
            return cachedPrefs;
        }

        var prefs = new SearchPreferences
        {
            DefaultContentType = await GetUserPreferenceAsync(userId, "search", "default_content_type", ContentType.All),
            PreferredGenres = await GetUserPreferenceAsync<List<string>>(userId, "search", "preferred_genres", new List<string>()),
            PreferredServices = await GetUserPreferenceAsync<List<string>>(userId, "search", "preferred_services", new List<string>()),
            MaxRating = await GetUserPreferenceAsync<decimal?>(userId, "search", "max_rating", null),
            MinRating = await GetUserPreferenceAsync<decimal?>(userId, "search", "min_rating", null),
            PreferFreeContent = await GetUserPreferenceAsync(userId, "search", "prefer_free_content", false),
            ExcludeAdultContent = await GetUserPreferenceAsync(userId, "privacy", "exclude_adult_content", true),
            DefaultSortBy = await GetUserPreferenceAsync(userId, "search", "default_sort_by", "relevance"),
            ResultsPerPage = await GetUserPreferenceAsync(userId, "search", "results_per_page", 20),
            EnablePersonalization = await GetUserPreferenceAsync(userId, "search", "enable_personalization", true)
        };

        SetCacheValue(cacheKey, prefs, _cacheExpiration);
        return prefs;
    }

    public async Task<Models.NotificationPreferences> GetNotificationPreferencesAsync(Guid userId)
    {
        var cacheKey = $"notification_prefs:{userId}";
        
        if (_cache.TryGetValue(cacheKey, out Models.NotificationPreferences cachedPrefs))
        {
            return cachedPrefs;
        }

        var prefs = new Models.NotificationPreferences
        {
            EmailNotifications = await GetUserPreferenceAsync(userId, "notifications", "email_enabled", true),
            PushNotifications = await GetUserPreferenceAsync(userId, "notifications", "push_enabled", true),
            SmsNotifications = await GetUserPreferenceAsync(userId, "notifications", "sms_enabled", false),
            SystemAlerts = await GetUserPreferenceAsync(userId, "notifications", "system_alerts", true),
            BusinessAlerts = await GetUserPreferenceAsync(userId, "notifications", "business_alerts", true),
            SecurityAlerts = await GetUserPreferenceAsync(userId, "notifications", "security_alerts", true),
            PaymentAlerts = await GetUserPreferenceAsync(userId, "notifications", "payment_alerts", true),
            UpdateNotifications = await GetUserPreferenceAsync(userId, "notifications", "update_notifications", true),
            MarketingEmails = await GetUserPreferenceAsync(userId, "notifications", "marketing_emails", false),
            WeeklyDigest = await GetUserPreferenceAsync(userId, "notifications", "weekly_digest", true),
            WatchlistUpdates = await GetUserPreferenceAsync(userId, "notifications", "watchlist_updates", true),
            NewContentAlerts = await GetUserPreferenceAsync(userId, "notifications", "new_content_alerts", true),
            PriceDropAlerts = await GetUserPreferenceAsync(userId, "notifications", "price_drop_alerts", true)
        };

        SetCacheValue(cacheKey, prefs, _cacheExpiration);
        return prefs;
    }

    public async Task<PrivacyPreferences> GetPrivacyPreferencesAsync(Guid userId)
    {
        var cacheKey = $"privacy_prefs:{userId}";
        
        if (_cache.TryGetValue(cacheKey, out PrivacyPreferences cachedPrefs))
        {
            return cachedPrefs;
        }

        var prefs = new PrivacyPreferences
        {
            WatchlistVisibility = await GetUserPreferenceAsync(userId, "privacy", "watchlist_visibility", "private"),
            AllowDataSharing = await GetUserPreferenceAsync(userId, "privacy", "allow_data_sharing", false),
            ShowRealTimeActivity = await GetUserPreferenceAsync(userId, "privacy", "show_realtime_activity", false),
            AllowRecommendations = await GetUserPreferenceAsync(userId, "privacy", "allow_recommendations", true),
            ShareViewingHistory = await GetUserPreferenceAsync(userId, "privacy", "share_viewing_history", false),
            AllowProfileLinking = await GetUserPreferenceAsync(userId, "privacy", "allow_profile_linking", false),
            ShowOnlineStatus = await GetUserPreferenceAsync(userId, "privacy", "show_online_status", false),
            AllowAnalytics = await GetUserPreferenceAsync(userId, "privacy", "allow_analytics", true)
        };

        SetCacheValue(cacheKey, prefs, _cacheExpiration);
        return prefs;
    }

    public async Task<ContentFilterPreferences> GetContentFilterPreferencesAsync(Guid userId)
    {
        var cacheKey = $"content_filter_prefs:{userId}";
        
        if (_cache.TryGetValue(cacheKey, out ContentFilterPreferences cachedPrefs))
        {
            return cachedPrefs;
        }

        var prefs = new ContentFilterPreferences
        {
            MaxContentRating = await GetUserPreferenceAsync(userId, "content", "max_content_rating", "R"),
            ExcludedGenres = await GetUserPreferenceAsync<List<string>>(userId, "content", "excluded_genres", new List<string>()),
            PreferredLanguages = await GetUserPreferenceAsync<List<string>>(userId, "content", "preferred_languages", new List<string> { "en" }),
            MinimumRating = await GetUserPreferenceAsync<decimal?>(userId, "content", "minimum_rating", null),
            HideExplicitContent = await GetUserPreferenceAsync(userId, "content", "hide_explicit_content", false),
            ShowOnlySubtitled = await GetUserPreferenceAsync(userId, "content", "show_only_subtitled", false),
            PreferHDContent = await GetUserPreferenceAsync(userId, "content", "prefer_hd_content", true),
            ExcludeExpiredContent = await GetUserPreferenceAsync(userId, "content", "exclude_expired_content", true)
        };

        SetCacheValue(cacheKey, prefs, _cacheExpiration);
        return prefs;
    }

    public async Task<ThemePreferences> GetThemePreferencesAsync(Guid userId)
    {
        var cacheKey = $"theme_prefs:{userId}";
        
        if (_cache.TryGetValue(cacheKey, out ThemePreferences cachedPrefs))
        {
            return cachedPrefs;
        }

        var prefs = new ThemePreferences
        {
            Theme = await GetUserPreferenceAsync(userId, "ui", "theme", "light"),
            AccentColor = await GetUserPreferenceAsync(userId, "ui", "accent_color", "#007bff"),
            FontSize = await GetUserPreferenceAsync(userId, "ui", "font_size", "medium"),
            HighContrast = await GetUserPreferenceAsync(userId, "ui", "high_contrast", false),
            ReducedMotion = await GetUserPreferenceAsync(userId, "ui", "reduced_motion", false),
            CompactView = await GetUserPreferenceAsync(userId, "ui", "compact_view", false),
            ShowThumbnails = await GetUserPreferenceAsync(userId, "ui", "show_thumbnails", true),
            AutoPlayTrailers = await GetUserPreferenceAsync(userId, "ui", "autoplay_trailers", false)
        };

        SetCacheValue(cacheKey, prefs, _cacheExpiration);
        return prefs;
    }

    public async Task<GeographicPreferences> GetGeographicPreferencesAsync(Guid userId)
    {
        var cacheKey = $"geo_prefs:{userId}";
        
        if (_cache.TryGetValue(cacheKey, out GeographicPreferences cachedPrefs))
        {
            return cachedPrefs;
        }

        var prefs = new GeographicPreferences
        {
            PrimaryRegion = await GetUserPreferenceAsync(userId, "geographic", "primary_region", "US"),
            AdditionalRegions = await GetUserPreferenceAsync<List<string>>(userId, "geographic", "additional_regions", new List<string>()),
            TimeZone = await GetUserPreferenceAsync(userId, "geographic", "timezone", "UTC"),
            CurrencyPreference = await GetUserPreferenceAsync(userId, "geographic", "currency", "USD"),
            ShowGlobalContent = await GetUserPreferenceAsync(userId, "geographic", "show_global_content", true),
            HideRegionLocked = await GetUserPreferenceAsync(userId, "geographic", "hide_region_locked", false),
            AutoDetectLocation = await GetUserPreferenceAsync(userId, "geographic", "auto_detect_location", true)
        };

        SetCacheValue(cacheKey, prefs, _cacheExpiration);
        return prefs;
    }

    public async Task<LanguagePreferences> GetLanguagePreferencesAsync(Guid userId)
    {
        var cacheKey = $"lang_prefs:{userId}";
        
        if (_cache.TryGetValue(cacheKey, out LanguagePreferences cachedPrefs))
        {
            return cachedPrefs;
        }

        var prefs = new LanguagePreferences
        {
            InterfaceLanguage = await GetUserPreferenceAsync(userId, "language", "interface_language", "en"),
            PreferredAudioLanguages = await GetUserPreferenceAsync<List<string>>(userId, "language", "preferred_audio_languages", new List<string> { "en" }),
            PreferredSubtitleLanguages = await GetUserPreferenceAsync<List<string>>(userId, "language", "preferred_subtitle_languages", new List<string> { "en" }),
            ShowOnlyNativeLanguage = await GetUserPreferenceAsync(userId, "language", "show_only_native_language", false),
            AutoTranslateDescriptions = await GetUserPreferenceAsync(userId, "language", "auto_translate_descriptions", false),
            PreferOriginalLanguage = await GetUserPreferenceAsync(userId, "language", "prefer_original_language", false)
        };

        SetCacheValue(cacheKey, prefs, _cacheExpiration);
        return prefs;
    }

    public async Task InvalidateUserPreferenceCacheAsync(Guid userId)
    {
        var cacheKeys = new[]
        {
            $"search_prefs:{userId}",
            $"notification_prefs:{userId}",
            $"privacy_prefs:{userId}",
            $"content_filter_prefs:{userId}",
            $"theme_prefs:{userId}",
            $"geo_prefs:{userId}",
            $"lang_prefs:{userId}"
        };

        foreach (var key in cacheKeys)
        {
            _cache.Remove(key);
        }

        // Also invalidate individual preference keys
        var keysToRemove = new List<string>();
        if (_cache is MemoryCache mc)
        {
            var field = typeof(MemoryCache).GetField("_coherentState", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
            if (field?.GetValue(mc) is object coherentState)
            {
                var entriesCollection = coherentState.GetType().GetProperty("EntriesCollection", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
                if (entriesCollection?.GetValue(coherentState) is IDictionary<object, object> entries)
                {
                    foreach (var entry in entries)
                    {
                        if (entry.Key.ToString()?.StartsWith($"user_pref:{userId}:") == true ||
                            entry.Key.ToString()?.StartsWith($"user_prefs_category:{userId}:") == true)
                        {
                            keysToRemove.Add(entry.Key.ToString()!);
                        }
                    }
                }
            }
        }

        foreach (var key in keysToRemove)
        {
            _cache.Remove(key);
        }

        _logger.LogInformation("Invalidated preference cache for user {UserId}", userId);
    }

    public async Task WarmupPreferencesAsync(Guid userId)
    {
        try
        {
            // Pre-load all preference categories to warm up the cache
            var tasks = new Task[]
            {
                GetSearchPreferencesAsync(userId),
                GetNotificationPreferencesAsync(userId),
                GetPrivacyPreferencesAsync(userId),
                GetContentFilterPreferencesAsync(userId),
                GetThemePreferencesAsync(userId),
                GetGeographicPreferencesAsync(userId),
                GetLanguagePreferencesAsync(userId)
            };

            await Task.WhenAll(tasks);
            _logger.LogDebug("Warmed up preferences cache for user {UserId}", userId);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to warm up preferences cache for user {UserId}", userId);
        }
    }

    private T ConvertToType<T>(object value, T defaultValue)
    {
        try
        {
            if (value == null) return defaultValue;
            
            if (value is T directValue) return directValue;
            
            if (typeof(T) == typeof(string)) return (T)(object)value.ToString()!;
            
            if (value is JsonElement jsonElement)
            {
                return JsonSerializer.Deserialize<T>(jsonElement.GetRawText()) ?? defaultValue;
            }
            
            if (value is string jsonString && !string.IsNullOrEmpty(jsonString))
            {
                try
                {
                    return JsonSerializer.Deserialize<T>(jsonString) ?? defaultValue;
                }
                catch
                {
                    // If JSON deserialization fails, try direct conversion
                }
            }
            
            return (T)Convert.ChangeType(value, typeof(T)) ?? defaultValue;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to convert preference value to type {Type}, using default", typeof(T).Name);
            return defaultValue;
        }
    }

    // Additional implementation methods for comprehensive preference management
    public async Task<UserPreferencesAggregate> GetUserPreferencesAggregateAsync(Guid userId)
    {
        try
        {
            var cacheKey = $"user_preferences_aggregate:{userId}";
            if (_cache.TryGetValue(cacheKey, out UserPreferencesAggregate cachedAggregate))
            {
                return cachedAggregate;
            }

            var contentTask = GetContentFilterPreferencesAsync(userId);
            var privacyTask = GetPrivacyPreferencesAsync(userId);
            var searchTask = GetSearchPreferencesAsync(userId);
            var geoTask = GetGeographicPreferencesAsync(userId);

            // ✅ OPTIMIZED: Use await for each task result instead of .Result to avoid potential deadlocks
            var contentFiltering = await contentTask;
            var privacy = await privacyTask;
            var search = await searchTask;
            var geographic = await geoTask;

            var aggregate = new UserPreferencesAggregate
            {
                UserId = userId,
                ContentFiltering = contentFiltering,
                Privacy = privacy,
                Search = search,
                Geographic = geographic,
                UpdatedAt = DateTime.UtcNow
            };

            SetCacheValue(cacheKey, aggregate, _cacheExpiration);
            return aggregate;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get user preferences aggregate for user {UserId}", userId);
            return new UserPreferencesAggregate { UserId = userId };
        }
    }

    public async Task<bool> UpdateSearchPreferencesAsync(Guid userId, SearchPreferences preferences)
    {
        try
        {
            var updates = new Dictionary<string, object>
            {
                { "default_content_type", preferences.DefaultContentType },
                { "preferred_genres", preferences.PreferredGenres },
                { "min_rating", preferences.MinRating },
                { "max_rating", preferences.MaxRating },
                { "default_sort_by", preferences.DefaultSortBy },
                { "results_per_page", preferences.ResultsPerPage },
                { "exclude_adult_content", preferences.ExcludeAdultContent },
                { "prefer_free_content", preferences.PreferFreeContent },
                { "enable_personalization", preferences.EnablePersonalization }
            };

            var success = await UpdatePreferencesInCategoryAsync(userId, "search", updates);
            
            if (success)
            {
                await InvalidateUserPreferenceCacheAsync(userId);
            }

            return success;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update search preferences for user {UserId}", userId);
            return false;
        }
    }

    public async Task<bool> UpdateContentFilterPreferencesAsync(Guid userId, ContentFilterPreferences preferences)
    {
        try
        {
            var updates = new Dictionary<string, object>
            {
                { "max_content_rating", preferences.MaxContentRating ?? "R" },
                { "excluded_genres", preferences.ExcludedGenres },
                { "minimum_rating", preferences.MinimumRating },
                { "preferred_languages", preferences.PreferredLanguages },
                { "excluded_languages", preferences.ExcludedLanguages },
                { "allow_adult_content", preferences.AllowAdultContent },
                { "preferred_streaming_services", preferences.PreferredStreamingServices },
                { "excluded_streaming_services", preferences.ExcludedStreamingServices }
            };

            var success = await UpdatePreferencesInCategoryAsync(userId, "content", updates);
            
            if (success)
            {
                await InvalidateUserPreferenceCacheAsync(userId);
            }

            return success;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update content filter preferences for user {UserId}", userId);
            return false;
        }
    }

    public async Task<bool> UpdatePrivacyPreferencesAsync(Guid userId, PrivacyPreferences preferences)
    {
        try
        {
            var updates = new Dictionary<string, object>
            {
                { "allow_recommendations", preferences.AllowRecommendations },
                { "allow_data_collection", preferences.AllowDataCollection },
                { "allow_analytics", preferences.AllowAnalytics },
                { "allow_personalization", preferences.AllowPersonalization },
                { "allow_third_party_sharing", preferences.AllowThirdPartySharing },
                { "allow_marketing", preferences.AllowMarketing },
                { "data_retention_period", preferences.DataRetentionPeriod },
                { "allow_cookies", preferences.AllowCookies },
                { "allow_tracking", preferences.AllowTracking },
                { "consent_given_at", preferences.ConsentGivenAt },
                { "consent_version", preferences.ConsentVersion }
            };

            var success = await UpdatePreferencesInCategoryAsync(userId, "privacy", updates);
            
            if (success)
            {
                await InvalidateUserPreferenceCacheAsync(userId);
            }

            return success;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update privacy preferences for user {UserId}", userId);
            return false;
        }
    }

    public async Task<bool> ResolvePreferenceConflictAsync(Guid userId, PreferenceConflict conflict)
    {
        try
        {
            object? resolvedValue = conflict.ResolutionStrategy switch
            {
                "last_write_wins" => conflict.IncomingValue,
                "first_write_wins" => conflict.CurrentValue,
                "user_decides" => conflict.ResolvedValue ?? conflict.CurrentValue,
                "merge" => MergeConflictValues(conflict.CurrentValue, conflict.IncomingValue),
                _ => conflict.IncomingValue
            };

            // Update the preference with resolved value
            var userPref = await _context.UserPreferences
                .FirstOrDefaultAsync(p => p.UserId == userId && 
                                        p.CategoryKey == conflict.ConflictType && 
                                        p.PreferenceKey == conflict.ConflictingField);

            if (userPref != null)
            {
                userPref.SetValue(resolvedValue);
                await _context.SaveChangesAsync();

                // Mark conflict as resolved
                conflict.ResolvedAt = DateTime.UtcNow;
                conflict.ResolvedValue = resolvedValue;

                await InvalidateUserPreferenceCacheAsync(userId);
                return true;
            }

            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to resolve preference conflict for user {UserId}", userId);
            return false;
        }
    }

    public async Task<List<PreferenceConflict>> GetPendingConflictsAsync(Guid userId)
    {
        try
        {
            // In a real implementation, this would query a conflicts table
            // For now, return empty list as conflicts are resolved immediately
            await Task.CompletedTask;
            return new List<PreferenceConflict>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get pending conflicts for user {UserId}", userId);
            return new List<PreferenceConflict>();
        }
    }

    // Private helper methods
    private async Task<bool> UpdatePreferencesInCategoryAsync(Guid userId, string category, Dictionary<string, object> updates)
    {
        try
        {
            foreach (var (key, value) in updates)
            {
                var existing = await _context.UserPreferences
                    .FirstOrDefaultAsync(p => p.UserId == userId && 
                                            p.CategoryKey == category && 
                                            p.PreferenceKey == key);

                if (existing != null)
                {
                    existing.SetValue(value);
                }
                else
                {
                    var newPref = new UserPreference
                    {
                        UserId = userId,
                        CategoryKey = category,
                        PreferenceKey = key,
                        DataType = GetDataType(value)
                    };
                    newPref.SetValue(value);
                    _context.UserPreferences.Add(newPref);
                }
            }

            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update preferences in category {Category} for user {UserId}", category, userId);
            return false;
        }
    }

    private object? MergeConflictValues(object? current, object? incoming)
    {
        // Simple merge strategy - for lists, combine them; for other types, use incoming
        if (current is List<string> currentList && incoming is List<string> incomingList)
        {
            return currentList.Union(incomingList).Distinct().ToList();
        }
        
        return incoming;
    }

    private string GetDataType(object value)
    {
        return value switch
        {
            bool => "boolean",
            int or long or decimal or double => "number",
            List<string> => "array",
            DateTime => "datetime",
            _ => "string"
        };
    }
}

/// <summary>
/// Theme preferences for UI customization - separate from other models  
/// </summary>
public class ThemePreferences
{
    public string Theme { get; set; } = "light"; // light
    public string AccentColor { get; set; } = "#007bff";
    public string FontSize { get; set; } = "medium"; // small, medium, large
    public bool HighContrast { get; set; } = false;
    public bool ReducedMotion { get; set; } = false;
    public bool CompactView { get; set; } = false;
    public bool ShowThumbnails { get; set; } = true;
    public bool AutoPlayTrailers { get; set; } = false;
}

public class LanguagePreferences
{
    public string InterfaceLanguage { get; set; } = "en";
    public List<string> PreferredAudioLanguages { get; set; } = new() { "en" };
    public List<string> PreferredSubtitleLanguages { get; set; } = new() { "en" };
    public bool ShowOnlyNativeLanguage { get; set; } = false;
    public bool AutoTranslateDescriptions { get; set; } = false;
    public bool PreferOriginalLanguage { get; set; } = false;
}