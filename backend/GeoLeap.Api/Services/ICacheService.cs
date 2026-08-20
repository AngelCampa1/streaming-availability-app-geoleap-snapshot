using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

public interface ICacheService
{
    Task<T?> GetAsync<T>(string key, CacheLevel level = CacheLevel.All);
    Task SetAsync<T>(string key, T value, TimeSpan? expiry = null, CacheLevel level = CacheLevel.All);
    Task RemoveAsync(string key, CacheLevel level = CacheLevel.All);
    Task RemoveByPatternAsync(string pattern, CacheLevel level = CacheLevel.All);
    Task<bool> ExistsAsync(string key, CacheLevel level = CacheLevel.All);
    Task WarmCacheAsync<T>(string key, Func<Task<T>> valueFactory, TimeSpan? expiry = null);
    Task<CacheStats> GetStatsAsync();
}

public interface ICacheMetricsCollector
{
    Task RecordHitAsync(string level, string key, long responseTimeMs);
    Task RecordMissAsync(string key, long responseTimeMs);
    Task RecordErrorAsync(string key, string errorType);
    Task<CacheStats> GetStatsAsync();
}

public interface ICachePersistenceService
{
    Task<T?> GetAsync<T>(string key);
    Task SetAsync<T>(string key, T value, TimeSpan? expiry = null);
    Task RemoveAsync(string key);
    Task RemoveByPatternAsync(string pattern);
    Task<bool> ExistsAsync(string key);
}

public interface ICacheKeyService
{
    string GenerateKey(CacheCategory category, params string[] components);
    string GenerateStreamingKey(string contentId, string? countryCode = null);
    string GenerateMetadataKey(int tmdbId, ContentType contentType, string language = "en-US");
    string GenerateSearchKey(string query, ContentType? contentType = null, string language = "en-US");
    string GenerateConfigurationKey(string configKey);
}

public interface ICacheTtlManager
{
    TimeSpan GetTtl(CacheCategory category, string key, object? value = null);
    TimeSpan GetMemoryTtl(string key);
    TimeSpan GetDistributedTtl(string key);
}

public interface ICacheInvalidationService
{
    Task InvalidateContentAsync(string contentId);
    Task InvalidateByGenreAsync(string genre);
    Task InvalidateStaleDataAsync();
    Task ScheduleInvalidationAsync(string key, DateTime invalidateAt);
    Task InvalidateByContentTypeAsync(ContentType contentType);
    Task InvalidateByLanguageAsync(string language);
}

[Flags]
public enum CacheLevel
{
    Memory = 1,
    Distributed = 2,
    Persistent = 4,
    All = Memory | Distributed | Persistent
}

public enum CacheCategory
{
    StreamingData,
    Metadata,
    Search,
    Images,
    UserPreferences,
    Configuration
}

