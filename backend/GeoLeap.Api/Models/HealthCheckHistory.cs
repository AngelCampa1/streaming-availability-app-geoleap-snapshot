namespace GeoLeap.Api.Models;

public class HealthCheckHistory
{
    public Guid Id { get; set; }
    public string Service { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    public TimeSpan ResponseTime { get; set; }
    public string? ErrorMessage { get; set; }
    public Dictionary<string, object>? Details { get; set; }
    
    // Missing properties causing compilation errors
    public string ComponentName { get; set; } = string.Empty;
    public double ResponseTimeMs { get; set; }
    public string? Message { get; set; }
    public DateTime CheckedAt { get; set; } = DateTime.UtcNow;
    public Dictionary<string, object>? Metrics { get; set; }
}

public enum HealthStatus
{
    Healthy,
    Degraded,
    Unhealthy,
    Unknown
}