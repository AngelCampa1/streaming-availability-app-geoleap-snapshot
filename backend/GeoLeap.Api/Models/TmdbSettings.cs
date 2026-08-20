namespace GeoLeap.Api.Models;

public class TmdbSettings
{
    public const string SectionName = "TMDb";

    public string BaseUrl { get; set; } = "https://api.themoviedb.org/3/";
    public string ImageBaseUrl { get; set; } = "https://image.tmdb.org/t/p/";
    public string ApiKey { get; set; } = string.Empty;
    public int TimeoutMs { get; set; } = 10000;
    public int RetryCount { get; set; } = 3;
    public int CircuitBreakerFailureThreshold { get; set; } = 5;
    public int CircuitBreakerRecoveryTimeoutMs { get; set; } = 30000;
    public int RateLimitPerSecond { get; set; } = 4;
    public int MaxRequestsPer10Seconds { get; set; } = 40;
    public int CacheDurationHours { get; set; } = 24;
    public int SearchCacheDurationHours { get; set; } = 6;
    public int GenreCacheDurationDays { get; set; } = 30;
    public int ImageCacheDurationDays { get; set; } = 7;
    public string DefaultLanguage { get; set; } = "en-US";
}