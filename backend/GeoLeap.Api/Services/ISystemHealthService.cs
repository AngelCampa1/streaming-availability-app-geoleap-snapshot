using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service for monitoring system health and performance metrics
/// </summary>
public interface ISystemHealthService
{
    /// <summary>
    /// Get overall system health status
    /// </summary>
    Task<SystemHealthStatus> GetSystemHealthAsync(string correlationId);

    /// <summary>
    /// Get health status for specific component
    /// </summary>
    Task<ComponentHealth> GetComponentHealthAsync(string componentName, string correlationId);

    /// <summary>
    /// Get system performance metrics
    /// </summary>
    Task<SystemMetrics> GetSystemMetricsAsync(string correlationId);

    /// <summary>
    /// Get active system alerts
    /// </summary>
    Task<List<SystemAlert>> GetActiveAlertsAsync(string correlationId);

    /// <summary>
    /// Create system alert
    /// </summary>
    Task<SystemAlert> CreateAlertAsync(
        string type,
        string severity,
        string message,
        Dictionary<string, object>? metadata,
        string correlationId);

    /// <summary>
    /// Resolve system alert
    /// </summary>
    Task<bool> ResolveAlertAsync(Guid alertId, string resolvedBy, string correlationId);

    /// <summary>
    /// Run comprehensive health check
    /// </summary>
    Task<HealthCheckResult> RunHealthCheckAsync(string correlationId);

    /// <summary>
    /// Get system resource usage trends
    /// </summary>
    Task<Dictionary<string, List<DataPoint>>> GetResourceUsageTrendsAsync(
        DateTime startDate,
        DateTime endDate,
        string granularity,
        string correlationId);

    /// <summary>
    /// Get application performance metrics
    /// </summary>
    Task<Dictionary<string, object>> GetApplicationMetricsAsync(string correlationId);

    /// <summary>
    /// Get database performance metrics
    /// </summary>
    Task<Dictionary<string, object>> GetDatabaseMetricsAsync(string correlationId);

    /// <summary>
    /// Get cache performance metrics
    /// </summary>
    Task<Dictionary<string, object>> GetCacheMetricsAsync(string correlationId);

    /// <summary>
    /// Get API performance metrics
    /// </summary>
    Task<Dictionary<string, object>> GetApiMetricsAsync(string correlationId);

    /// <summary>
    /// Schedule maintenance window
    /// </summary>
    Task<MaintenanceWindow> ScheduleMaintenanceAsync(
        DateTime startTime,
        DateTime endTime,
        string description,
        string scheduledBy,
        string correlationId);

    /// <summary>
    /// Get scheduled maintenance windows
    /// </summary>
    Task<List<MaintenanceWindow>> GetScheduledMaintenanceAsync(string correlationId);
}

// Supporting models
public class HealthCheckResult
{
    public string Status { get; set; } = string.Empty;
    public DateTime CheckedAt { get; set; }
    public TimeSpan Duration { get; set; }
    public Dictionary<string, ComponentHealth> Components { get; set; } = new();
    public List<string> Issues { get; set; } = new();
    public List<string> Recommendations { get; set; } = new();
    public double OverallScore { get; set; }
}

public class MaintenanceWindow
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public DateTime StartTime { get; set; }
    public DateTime EndTime { get; set; }
    public string Status { get; set; } = string.Empty;
    public string ScheduledBy { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public List<string> AffectedServices { get; set; } = new();
    public Dictionary<string, object>? Metadata { get; set; }
}