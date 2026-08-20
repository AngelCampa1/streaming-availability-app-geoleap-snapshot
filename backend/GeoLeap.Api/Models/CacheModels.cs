namespace GeoLeap.Api.Models;

public class CacheStats
{
    public long TotalHits { get; set; }
    public long TotalMisses { get; set; }
    public double HitRatio { get; set; }
    public double AverageResponseTime { get; set; }
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
    public Dictionary<string, CategoryStats> CategoryStats { get; set; } = new();
    public Dictionary<string, LevelStats> LevelStats { get; set; } = new();
}

public class CategoryStats
{
    public long Hits { get; set; }
    public long Misses { get; set; }
    public double HitRatio => Hits + Misses > 0 ? (double)Hits / (Hits + Misses) : 0;
    public double AverageResponseTime { get; set; }
    public long TotalRequests => Hits + Misses;
}

public class LevelStats
{
    public long Hits { get; set; }
    public double AverageResponseTime { get; set; }
    public long Errors { get; set; }
}

public class CacheMetrics
{
    public string Key { get; set; } = string.Empty;
    public string Level { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public long HitCount { get; set; }
    public long MissCount { get; set; }
    public long ErrorCount { get; set; }
    public double AverageResponseTime { get; set; }
    public DateTime LastAccessed { get; set; } = DateTime.UtcNow;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class CacheEntry<T>
{
    public T Value { get; set; } = default!;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; }
    public string Key { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public bool IsCompressed { get; set; }
    public long OriginalSize { get; set; }
    public long CompressedSize { get; set; }
}


public class PopularContent
{
    public string Id { get; set; } = string.Empty;
    public ContentType Type { get; set; }
    public string Title { get; set; } = string.Empty;
    public int Popularity { get; set; }
    public DateTime LastRequested { get; set; } = DateTime.UtcNow;
}