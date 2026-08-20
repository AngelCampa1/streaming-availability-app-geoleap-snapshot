namespace GeoLeap.Api.Models;

public class CacheSettings
{
    public const string SectionName = "CacheSettings";
    
    public string KeyPrefix { get; set; } = "geoleap";
    public string DataVersion { get; set; } = "v1";
    public RedisSettings Redis { get; set; } = new();
    public MemorySettings Memory { get; set; } = new();
    public WarmingSettings Warming { get; set; } = new();
    public CompressionSettings Compression { get; set; } = new();
}

public class RedisSettings
{
    public string ConnectionString { get; set; } = string.Empty;
    public int DefaultDatabase { get; set; } = 0;
    public TimeSpan KeyExpiry { get; set; } = TimeSpan.FromHours(2);
    public int MaxRetries { get; set; } = 3;
    public TimeSpan RetryDelay { get; set; } = TimeSpan.FromSeconds(1);
    public TimeSpan CommandTimeout { get; set; } = TimeSpan.FromSeconds(5);
    public bool AbortOnConnectFail { get; set; } = false;
}

public class MemorySettings
{
    public long SizeLimit { get; set; } = 100000000; // 100MB
    public double CompactionPercentage { get; set; } = 0.25;
    public TimeSpan ExpirationScanFrequency { get; set; } = TimeSpan.FromMinutes(5);
}

public class WarmingSettings
{
    public bool Enabled { get; set; } = true;
    public int PopularContentLimit { get; set; } = 100;
    public int PopularSearchLimit { get; set; } = 50;
    public TimeSpan WarmingInterval { get; set; } = TimeSpan.FromHours(4);
}

public class CompressionSettings
{
    public bool Enabled { get; set; } = true;
    public int MinSize { get; set; } = 1024; // 1KB
    public string Algorithm { get; set; } = "gzip";
}

public class CacheTtlPolicy
{
    public TimeSpan DefaultTtl { get; set; }
    public TimeSpan MinTtl { get; set; }
    public TimeSpan MaxTtl { get; set; }
}