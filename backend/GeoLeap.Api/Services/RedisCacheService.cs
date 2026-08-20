using System.Text.Json;
using StackExchange.Redis;

namespace GeoLeap.Api.Services;

/// <summary>
/// Redis cache service with cache-aside pattern support
/// Provides convenient methods for Redis caching operations
/// </summary>
public interface IRedisCacheService
{
    Task<T?> GetOrSetAsync<T>(string key, Func<Task<T>> factory, TimeSpan? expiry = null);
    Task<T?> GetAsync<T>(string key);
    Task SetAsync<T>(string key, T value, TimeSpan? expiry = null);
    Task RemoveAsync(string key);
    Task RemoveByPatternAsync(string pattern);
    Task<bool> ExistsAsync(string key);
    Task<long> IncrementAsync(string key, long value = 1, TimeSpan? expiry = null);
    Task<long> DecrementAsync(string key, long value = 1, TimeSpan? expiry = null);
}

public class RedisCacheService : IRedisCacheService
{
    private readonly IConnectionMultiplexer? _redis;
    private readonly ILogger<RedisCacheService> _logger;
    private readonly JsonSerializerOptions _jsonOptions;

    public RedisCacheService(
        IConnectionMultiplexer? redis,
        ILogger<RedisCacheService> logger)
    {
        _redis = redis;
        _logger = logger;
        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
            WriteIndented = false
        };
    }

    public async Task<T?> GetOrSetAsync<T>(string key, Func<Task<T>> factory, TimeSpan? expiry = null)
    {
        if (_redis == null)
        {
            _logger.LogDebug("Redis not configured, executing factory directly for key: {Key}", key);
            return await factory();
        }

        try
        {
            var db = _redis.GetDatabase();
            var cached = await db.StringGetAsync(key);

            if (cached.HasValue)
            {
                _logger.LogDebug("Cache hit for key: {Key}", key);
                return JsonSerializer.Deserialize<T>((string)cached!, _jsonOptions);
            }

            _logger.LogDebug("Cache miss for key: {Key}, executing factory", key);
            var value = await factory();

            if (value != null)
            {
                var json = JsonSerializer.Serialize(value, _jsonOptions);
                await db.StringSetAsync(key, json, expiry ?? TimeSpan.FromMinutes(30));
            }

            return value;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Redis operation failed for key: {Key}, falling back to factory", key);
            return await factory();
        }
    }

    public async Task<T?> GetAsync<T>(string key)
    {
        if (_redis == null)
        {
            _logger.LogDebug("Redis not configured, returning default for key: {Key}", key);
            return default;
        }

        try
        {
            var db = _redis.GetDatabase();
            var cached = await db.StringGetAsync(key);

            if (cached.HasValue)
            {
                return JsonSerializer.Deserialize<T>((string)cached!, _jsonOptions);
            }

            return default;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Redis GET operation failed for key: {Key}", key);
            return default;
        }
    }

    public async Task SetAsync<T>(string key, T value, TimeSpan? expiry = null)
    {
        if (_redis == null)
        {
            _logger.LogDebug("Redis not configured, skipping SET for key: {Key}", key);
            return;
        }

        try
        {
            var db = _redis.GetDatabase();
            var json = JsonSerializer.Serialize(value, _jsonOptions);
            await db.StringSetAsync(key, json, expiry ?? TimeSpan.FromMinutes(30));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Redis SET operation failed for key: {Key}", key);
        }
    }

    public async Task RemoveAsync(string key)
    {
        if (_redis == null)
        {
            _logger.LogDebug("Redis not configured, skipping REMOVE for key: {Key}", key);
            return;
        }

        try
        {
            var db = _redis.GetDatabase();
            await db.KeyDeleteAsync(key);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Redis REMOVE operation failed for key: {Key}", key);
        }
    }

    public async Task RemoveByPatternAsync(string pattern)
    {
        if (_redis == null)
        {
            _logger.LogDebug("Redis not configured, skipping REMOVE BY PATTERN for pattern: {Pattern}", pattern);
            return;
        }

        try
        {
            var server = _redis.GetServer(_redis.GetEndPoints().First());
            var keys = server.Keys(pattern: pattern);
            var db = _redis.GetDatabase();

            foreach (var key in keys)
            {
                await db.KeyDeleteAsync(key);
            }

            _logger.LogInformation("Removed keys matching pattern: {Pattern}", pattern);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Redis REMOVE BY PATTERN operation failed for pattern: {Pattern}", pattern);
        }
    }

    public async Task<bool> ExistsAsync(string key)
    {
        if (_redis == null)
        {
            _logger.LogDebug("Redis not configured, returning false for EXISTS check: {Key}", key);
            return false;
        }

        try
        {
            var db = _redis.GetDatabase();
            return await db.KeyExistsAsync(key);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Redis EXISTS operation failed for key: {Key}", key);
            return false;
        }
    }

    public async Task<long> IncrementAsync(string key, long value = 1, TimeSpan? expiry = null)
    {
        if (_redis == null)
        {
            _logger.LogDebug("Redis not configured, returning 0 for INCREMENT: {Key}", key);
            return 0;
        }

        try
        {
            var db = _redis.GetDatabase();
            var result = await db.StringIncrementAsync(key, value);

            if (expiry.HasValue)
            {
                await db.KeyExpireAsync(key, expiry.Value);
            }

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Redis INCREMENT operation failed for key: {Key}", key);
            return 0;
        }
    }

    public async Task<long> DecrementAsync(string key, long value = 1, TimeSpan? expiry = null)
    {
        if (_redis == null)
        {
            _logger.LogDebug("Redis not configured, returning 0 for DECREMENT: {Key}", key);
            return 0;
        }

        try
        {
            var db = _redis.GetDatabase();
            var result = await db.StringDecrementAsync(key, value);

            if (expiry.HasValue)
            {
                await db.KeyExpireAsync(key, expiry.Value);
            }

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Redis DECREMENT operation failed for key: {Key}", key);
            return 0;
        }
    }
}
