using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using System.IO.Compression;
using System.Text;
using System.Text.Json;

namespace GeoLeap.Api.Services;

public class CachePersistenceService : ICachePersistenceService
{
    private readonly ApplicationDbContext _context;
    private readonly IOptionsMonitor<CacheSettings> _settings;
    private readonly ILogger<CachePersistenceService> _logger;

    public CachePersistenceService(
        ApplicationDbContext context,
        IOptionsMonitor<CacheSettings> settings,
        ILogger<CachePersistenceService> logger)
    {
        _context = context;
        _settings = settings;
        _logger = logger;
    }

    public async Task<T?> GetAsync<T>(string key)
    {
        try
        {
            var entry = await _context.Set<CachePersistenceEntry>()
                .FirstOrDefaultAsync(e => e.Key == key && e.ExpiresAt > DateTime.UtcNow);

            if (entry == null)
            {
                return default;
            }

            // Update access statistics
            entry.LastAccessedAt = DateTime.UtcNow;
            entry.AccessCount++;
            await _context.SaveChangesAsync();

            // Deserialize value
            var value = entry.IsCompressed 
                ? DecompressValue(entry.Value)
                : entry.Value;

            return JsonSerializer.Deserialize<T>(value);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get cache entry from persistence store for key: {Key}", key);
            return default;
        }
    }

    public async Task SetAsync<T>(string key, T value, TimeSpan? expiry = null)
    {
        try
        {
            var serializedValue = JsonSerializer.Serialize(value);
            var originalSize = Encoding.UTF8.GetByteCount(serializedValue);
            
            var shouldCompress = _settings.CurrentValue.Compression.Enabled && 
                                originalSize >= _settings.CurrentValue.Compression.MinSize;
            
            var finalValue = shouldCompress ? CompressValue(serializedValue) : serializedValue;
            var compressedSize = shouldCompress ? Encoding.UTF8.GetByteCount(finalValue) : originalSize;

            var expiresAt = DateTime.UtcNow.Add(expiry ?? TimeSpan.FromDays(7));
            var category = ExtractCategoryFromKey(key);

            // Remove existing entry if it exists
            var existingEntry = await _context.Set<CachePersistenceEntry>()
                .FirstOrDefaultAsync(e => e.Key == key);

            if (existingEntry != null)
            {
                _context.Set<CachePersistenceEntry>().Remove(existingEntry);
            }

            // Add new entry
            var newEntry = new CachePersistenceEntry
            {
                Key = key,
                Value = finalValue,
                Category = category,
                ExpiresAt = expiresAt,
                IsCompressed = shouldCompress,
                OriginalSize = originalSize,
                CompressedSize = compressedSize,
                ContentType = typeof(T).Name
            };

            _context.Set<CachePersistenceEntry>().Add(newEntry);
            await _context.SaveChangesAsync();

            _logger.LogDebug("Cache entry persisted: Key={Key}, OriginalSize={OriginalSize}, CompressedSize={CompressedSize}, Compressed={IsCompressed}",
                key, originalSize, compressedSize, shouldCompress);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to persist cache entry for key: {Key}", key);
        }
    }

    public async Task RemoveAsync(string key)
    {
        try
        {
            var entry = await _context.Set<CachePersistenceEntry>()
                .FirstOrDefaultAsync(e => e.Key == key);

            if (entry != null)
            {
                _context.Set<CachePersistenceEntry>().Remove(entry);
                await _context.SaveChangesAsync();
                
                _logger.LogDebug("Cache entry removed from persistence store: {Key}", key);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to remove cache entry from persistence store for key: {Key}", key);
        }
    }

    public async Task RemoveByPatternAsync(string pattern)
    {
        try
        {
            // Convert glob pattern to SQL LIKE pattern
            var likePattern = pattern.Replace("*", "%").Replace("?", "_");
            
            var entriesToRemove = await _context.Set<CachePersistenceEntry>()
                .Where(e => EF.Functions.Like(e.Key, likePattern))
                .ToListAsync();

            if (entriesToRemove.Any())
            {
                _context.Set<CachePersistenceEntry>().RemoveRange(entriesToRemove);
                await _context.SaveChangesAsync();
                
                _logger.LogInformation("Removed {Count} cache entries from persistence store matching pattern: {Pattern}", 
                    entriesToRemove.Count, pattern);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to remove cache entries by pattern from persistence store: {Pattern}", pattern);
        }
    }

    public async Task<bool> ExistsAsync(string key)
    {
        try
        {
            return await _context.Set<CachePersistenceEntry>()
                .AnyAsync(e => e.Key == key && e.ExpiresAt > DateTime.UtcNow);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to check cache entry existence in persistence store for key: {Key}", key);
            return false;
        }
    }

    public async Task CleanupExpiredEntriesAsync()
    {
        try
        {
            var expiredEntries = await _context.Set<CachePersistenceEntry>()
                .Where(e => e.ExpiresAt <= DateTime.UtcNow)
                .ToListAsync();

            if (expiredEntries.Any())
            {
                _context.Set<CachePersistenceEntry>().RemoveRange(expiredEntries);
                await _context.SaveChangesAsync();
                
                _logger.LogInformation("Cleaned up {Count} expired cache entries from persistence store", expiredEntries.Count);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to cleanup expired cache entries from persistence store");
        }
    }

    private string CompressValue(string value)
    {
        var bytes = Encoding.UTF8.GetBytes(value);
        using var compressedStream = new MemoryStream();
        using (var gzipStream = new GZipStream(compressedStream, CompressionMode.Compress))
        {
            gzipStream.Write(bytes, 0, bytes.Length);
        }
        return Convert.ToBase64String(compressedStream.ToArray());
    }

    private string DecompressValue(string compressedValue)
    {
        var compressedBytes = Convert.FromBase64String(compressedValue);
        using var compressedStream = new MemoryStream(compressedBytes);
        using var gzipStream = new GZipStream(compressedStream, CompressionMode.Decompress);
        using var resultStream = new MemoryStream();
        gzipStream.CopyTo(resultStream);
        return Encoding.UTF8.GetString(resultStream.ToArray());
    }

    private string ExtractCategoryFromKey(string key)
    {
        var parts = key.Split(':');
        if (parts.Length >= 3)
        {
            return parts[2];
        }
        return CacheCategory.StreamingData.ToString().ToLower();
    }
}