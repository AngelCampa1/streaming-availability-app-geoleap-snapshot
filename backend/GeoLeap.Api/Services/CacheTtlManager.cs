using GeoLeap.Api.Models;
using Microsoft.Extensions.Options;

namespace GeoLeap.Api.Services;

public class CacheTtlManager : ICacheTtlManager
{
    private readonly IOptionsMonitor<CacheSettings> _settings;
    private readonly Dictionary<CacheCategory, CacheTtlPolicy> _policies;

    public CacheTtlManager(IOptionsMonitor<CacheSettings> settings)
    {
        _settings = settings;
        _policies = InitializeTtlPolicies();
    }

    public TimeSpan GetTtl(CacheCategory category, string key, object? value = null)
    {
        var policy = _policies.GetValueOrDefault(category, _policies[CacheCategory.StreamingData]);
        
        return category switch
        {
            CacheCategory.StreamingData => GetStreamingDataTtl(key, value),
            CacheCategory.Metadata => GetMetadataTtl(key, value),
            CacheCategory.Search => GetSearchTtl(key, value),
            CacheCategory.Images => TimeSpan.FromDays(7),
            CacheCategory.UserPreferences => TimeSpan.FromDays(30),
            CacheCategory.Configuration => TimeSpan.FromDays(1),
            _ => policy.DefaultTtl
        };
    }

    public TimeSpan GetMemoryTtl(string key)
    {
        // Memory cache uses shorter TTLs to prevent memory pressure
        var category = ExtractCategoryFromKey(key);
        return category switch
        {
            CacheCategory.StreamingData => TimeSpan.FromMinutes(30),
            CacheCategory.Metadata => TimeSpan.FromHours(2),
            CacheCategory.Search => TimeSpan.FromHours(1),
            CacheCategory.Images => TimeSpan.FromHours(4),
            CacheCategory.UserPreferences => TimeSpan.FromHours(6),
            CacheCategory.Configuration => TimeSpan.FromHours(12),
            _ => TimeSpan.FromMinutes(30)
        };
    }

    public TimeSpan GetDistributedTtl(string key)
    {
        // Distributed cache (Redis) uses longer TTLs
        var category = ExtractCategoryFromKey(key);
        return category switch
        {
            CacheCategory.StreamingData => TimeSpan.FromHours(6),
            CacheCategory.Metadata => TimeSpan.FromDays(1),
            CacheCategory.Search => TimeSpan.FromHours(6),
            CacheCategory.Images => TimeSpan.FromDays(7),
            CacheCategory.UserPreferences => TimeSpan.FromDays(30),
            CacheCategory.Configuration => TimeSpan.FromDays(1),
            _ => TimeSpan.FromHours(2)
        };
    }

    private TimeSpan GetStreamingDataTtl(string key, object? value)
    {
        // For streaming data, use different TTL based on content type
        if (value is StreamingAvailabilityResponse streaming)
        {
            // Use shorter TTL for movies (change more often) vs shows
            return streaming.Type switch
            {
                ContentType.Movie => TimeSpan.FromHours(1),
                ContentType.TvSeries => TimeSpan.FromHours(3),
                _ => TimeSpan.FromHours(2)
            };
        }
        
        return TimeSpan.FromHours(2); // Default
    }

    private TimeSpan GetMetadataTtl(string key, object? value)
    {
        // Metadata changes less frequently than availability
        if (value is ContentMetadata metadata)
        {
            // Recent releases might get updated more often
            var releaseDate = metadata.ReleaseDate ?? DateTime.MinValue;
            var daysSinceRelease = (DateTime.UtcNow - releaseDate).TotalDays;
            
            return daysSinceRelease switch
            {
                < 30 => TimeSpan.FromHours(6),    // Recent releases
                < 365 => TimeSpan.FromHours(24),  // This year
                _ => TimeSpan.FromDays(7)         // Older content
            };
        }
        
        return TimeSpan.FromHours(24); // Default
    }

    private TimeSpan GetSearchTtl(string key, object? value)
    {
        // Search results can be cached longer for popular queries
        return TimeSpan.FromHours(6);
    }

    private CacheCategory ExtractCategoryFromKey(string key)
    {
        var parts = key.Split(':');
        if (parts.Length >= 3 && Enum.TryParse<CacheCategory>(parts[2], true, out var category))
        {
            return category;
        }
        return CacheCategory.StreamingData; // Default fallback
    }

    private Dictionary<CacheCategory, CacheTtlPolicy> InitializeTtlPolicies()
    {
        return new Dictionary<CacheCategory, CacheTtlPolicy>
        {
            [CacheCategory.StreamingData] = new CacheTtlPolicy 
            { 
                DefaultTtl = TimeSpan.FromHours(2),
                MinTtl = TimeSpan.FromMinutes(15),
                MaxTtl = TimeSpan.FromHours(24)
            },
            [CacheCategory.Metadata] = new CacheTtlPolicy 
            { 
                DefaultTtl = TimeSpan.FromHours(24),
                MinTtl = TimeSpan.FromHours(1),
                MaxTtl = TimeSpan.FromDays(7)
            },
            [CacheCategory.Search] = new CacheTtlPolicy 
            { 
                DefaultTtl = TimeSpan.FromHours(6),
                MinTtl = TimeSpan.FromMinutes(30),
                MaxTtl = TimeSpan.FromHours(12)
            },
            [CacheCategory.Images] = new CacheTtlPolicy 
            { 
                DefaultTtl = TimeSpan.FromDays(7),
                MinTtl = TimeSpan.FromHours(24),
                MaxTtl = TimeSpan.FromDays(30)
            },
            [CacheCategory.UserPreferences] = new CacheTtlPolicy 
            { 
                DefaultTtl = TimeSpan.FromDays(30),
                MinTtl = TimeSpan.FromDays(1),
                MaxTtl = TimeSpan.FromDays(90)
            },
            [CacheCategory.Configuration] = new CacheTtlPolicy 
            { 
                DefaultTtl = TimeSpan.FromDays(1),
                MinTtl = TimeSpan.FromHours(1),
                MaxTtl = TimeSpan.FromDays(7)
            }
        };
    }
}