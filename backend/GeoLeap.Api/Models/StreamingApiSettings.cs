namespace GeoLeap.Api.Models;

public class StreamingApiSettings
{
    public const string SectionName = "StreamingApi";

    public string BaseUrl { get; set; } = "https://streaming-availability.p.rapidapi.com";
    public string ApiKey { get; set; } = string.Empty;
    public int TimeoutMs { get; set; } = 30000;
    public int RetryCount { get; set; } = 3;
    public int CircuitBreakerFailureThreshold { get; set; } = 5;
    public int CircuitBreakerRecoveryTimeoutMs { get; set; } = 60000;
    public int RateLimitPerMinute { get; set; } = 100;
    public int CacheDurationMinutes { get; set; } = 60;
    public decimal DailyBudgetLimit { get; set; } = 10m;
    public decimal MonthlyBudgetLimit { get; set; } = 200m;
    public decimal CostPerCall { get; set; } = 0.001m;
}