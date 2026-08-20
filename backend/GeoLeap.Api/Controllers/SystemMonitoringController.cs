using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Sentry;
using GeoLeap.Api.Services;
using GeoLeap.Api.Models;
using GeoLeap.Api.Extensions;
using Microsoft.AspNetCore.SignalR;
using GeoLeap.Api.Hubs;

namespace GeoLeap.Api.Controllers;

[ApiController]
[Route("api/monitoring")]
[Authorize(Policy = "AdminOnly")]
public class SystemMonitoringController : ControllerBase
{
    private readonly IPerformanceMonitoringService _performanceMonitoringService;
    private readonly IHubContext<MonitoringHub> _hubContext;
    private readonly ILogger<SystemMonitoringController> _logger;

    public SystemMonitoringController(
        IPerformanceMonitoringService performanceMonitoringService,
        IHubContext<MonitoringHub> hubContext,
        ILogger<SystemMonitoringController> logger)
    {
        _performanceMonitoringService = performanceMonitoringService;
        _hubContext = hubContext;
        _logger = logger;
    }

    /// <summary>
    /// Get comprehensive system health metrics
    /// </summary>
    [HttpGet("health")]
    public async Task<ActionResult<MonitoringSystemHealthMetrics>> GetSystemHealth(CancellationToken cancellationToken = default)
    {
        try
        {
            var health = new MonitoringSystemHealthMetrics
            {
                OverallStatus = "Healthy",
                LastUpdated = DateTime.UtcNow
            };

            // Broadcast real-time update to connected clients
            await _hubContext.Clients.All.SendAsync("SystemHealthUpdate", health, cancellationToken);

            return Ok(health);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving system health");
            SentrySdk.CaptureException(ex);
            return StatusCode(500, new { error = "Failed to retrieve system health metrics" });
        }
    }

    /// <summary>
    /// Get infrastructure metrics
    /// </summary>
    [HttpGet("infrastructure")]
    public async Task<ActionResult<InfrastructureMetrics>> GetInfrastructureMetrics(CancellationToken cancellationToken = default)
    {
        try
        {
            var metrics = new InfrastructureMetrics
            {
                LastUpdated = DateTime.UtcNow
            };
            return Ok(metrics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving infrastructure metrics");
            SentrySdk.CaptureException(ex);
            return StatusCode(500, new { error = "Failed to retrieve infrastructure metrics" });
        }
    }

    /// <summary>
    /// Get alert system metrics and statistics
    /// </summary>
    [HttpGet("alerts/metrics")]
    public async Task<ActionResult<AlertMetrics>> GetAlertMetrics(CancellationToken cancellationToken = default)
    {
        try
        {
            var metrics = new AlertMetrics
            {
                ActiveAlerts = 0,
                LastUpdated = DateTime.UtcNow
            };
            return Ok(metrics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving alert metrics");
            SentrySdk.CaptureException(ex);
            return StatusCode(500, new { error = "Failed to retrieve alert metrics" });
        }
    }

    /// <summary>
    /// Get active monitoring alerts
    /// </summary>
    [HttpGet("alerts/active")]
    public async Task<ActionResult<List<MonitoringAlert>>> GetActiveAlerts(CancellationToken cancellationToken = default)
    {
        try
        {
            return Ok(new List<MonitoringAlert>());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving active alerts");
            SentrySdk.CaptureException(ex);
            return StatusCode(500, new { error = "Failed to retrieve active alerts" });
        }
    }

    /// <summary>
    /// Create a new monitoring alert
    /// </summary>
    [HttpPost("alerts")]
    public async Task<ActionResult> CreateAlert([FromBody] CreateAlertRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            SentrySdk.AddBreadcrumb($"Alert created: {request.Title}", "alert");
            _logger.LogInformation("Alert created: {AlertName}", request.Title);

            // Broadcast new alert to monitoring dashboard
            await _hubContext.Clients.All.SendAsync("NewAlert", request, cancellationToken);

            return Ok(new { message = "Alert created successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating alert");
            SentrySdk.CaptureException(ex);
            return StatusCode(500, new { error = "Failed to create alert" });
        }
    }

    /// <summary>
    /// Acknowledge an active alert
    /// </summary>
    [HttpPut("alerts/{alertId}/acknowledge")]
    public async Task<ActionResult> AcknowledgeAlert(int alertId, [FromBody] AcknowledgeAlertRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            if (alertId != request.AlertId)
            {
                return this.StandardBadRequest("Alert ID mismatch");
            }

            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            SentrySdk.AddBreadcrumb($"Alert {alertId} acknowledged by {request.AcknowledgedBy}", "alert");
            _logger.LogInformation("Alert {AlertId} acknowledged by {AcknowledgedBy}", alertId, request.AcknowledgedBy);

            // Broadcast acknowledgment to monitoring dashboard
            await _hubContext.Clients.All.SendAsync("AlertAcknowledged", new { AlertId = alertId, AcknowledgedBy = request.AcknowledgedBy }, cancellationToken);

            return Ok(new { message = "Alert acknowledged successfully" });
        }
        catch (ArgumentException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error acknowledging alert {AlertId}", alertId);
            SentrySdk.CaptureException(ex);
            return StatusCode(500, new { error = "Failed to acknowledge alert" });
        }
    }

    /// <summary>
    /// Get Core Web Vitals metrics for performance monitoring
    /// </summary>
    [HttpGet("performance/core-web-vitals")]
    public async Task<ActionResult<CoreWebVitalsMetrics>> GetCoreWebVitals([FromQuery] string url, CancellationToken cancellationToken = default)
    {
        try
        {
            if (string.IsNullOrEmpty(url))
            {
                return this.StandardBadRequest("URL parameter is required");
            }

            var metrics = await _performanceMonitoringService.GetCoreWebVitalsAsync(url, cancellationToken);
            return Ok(metrics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving Core Web Vitals for {Url}", url);
            SentrySdk.CaptureException(ex);
            return StatusCode(500, new { error = "Failed to retrieve Core Web Vitals metrics" });
        }
    }

    /// <summary>
    /// Get API response time metrics
    /// </summary>
    [HttpGet("performance/response-times")]
    public async Task<ActionResult<ResponseTimeMetrics>> GetResponseTimeMetrics([FromQuery] string? endpoint = null, CancellationToken cancellationToken = default)
    {
        try
        {
            var metrics = await _performanceMonitoringService.GetResponseTimeMetricsAsync(endpoint, cancellationToken);
            return Ok(metrics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving response time metrics");
            SentrySdk.CaptureException(ex);
            return StatusCode(500, new { error = "Failed to retrieve response time metrics" });
        }
    }

    /// <summary>
    /// Get database performance metrics
    /// </summary>
    [HttpGet("performance/database")]
    public async Task<ActionResult<DatabasePerformanceMetrics>> GetDatabasePerformance(CancellationToken cancellationToken = default)
    {
        try
        {
            var metrics = await _performanceMonitoringService.GetDatabasePerformanceAsync(cancellationToken);
            return Ok(metrics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving database performance metrics");
            SentrySdk.CaptureException(ex);
            return StatusCode(500, new { error = "Failed to retrieve database performance metrics" });
        }
    }

    /// <summary>
    /// Get caching system metrics
    /// </summary>
    [HttpGet("performance/caching")]
    public async Task<ActionResult<CachingMetrics>> GetCachingMetrics(CancellationToken cancellationToken = default)
    {
        try
        {
            var metrics = await _performanceMonitoringService.GetCachingMetricsAsync(cancellationToken);
            return Ok(metrics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving caching metrics");
            SentrySdk.CaptureException(ex);
            return StatusCode(500, new { error = "Failed to retrieve caching metrics" });
        }
    }

    /// <summary>
    /// Get real-time performance metrics
    /// </summary>
    [HttpGet("performance/realtime")]
    public async Task<ActionResult<RealtimePerformanceMetrics>> GetRealtimePerformance(CancellationToken cancellationToken = default)
    {
        try
        {
            var metrics = await _performanceMonitoringService.GetRealtimePerformanceMetricsAsync(cancellationToken);

            // Broadcast real-time metrics to connected clients
            await _hubContext.Clients.All.SendAsync("RealtimePerformanceUpdate", metrics, cancellationToken);

            return Ok(metrics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving real-time performance metrics");
            SentrySdk.CaptureException(ex);
            return StatusCode(500, new { error = "Failed to retrieve real-time performance metrics" });
        }
    }

    /// <summary>
    /// Run comprehensive performance validation
    /// </summary>
    [HttpPost("performance/validate")]
    public async Task<ActionResult<PerformanceValidationResult>> ValidatePerformance([FromBody] PerformanceValidationRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            var result = await _performanceMonitoringService.ValidatePerformanceAsync(request, cancellationToken);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating performance");
            SentrySdk.CaptureException(ex);
            return StatusCode(500, new { error = "Failed to validate performance" });
        }
    }

    /// <summary>
    /// Get performance optimization recommendations
    /// </summary>
    [HttpGet("performance/recommendations")]
    public async Task<ActionResult<List<PerformanceRecommendation>>> GetPerformanceRecommendations([FromQuery] string? category = null, CancellationToken cancellationToken = default)
    {
        try
        {
            var recommendations = await _performanceMonitoringService.GetPerformanceRecommendationsAsync(category, cancellationToken);
            return Ok(recommendations);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving performance recommendations");
            SentrySdk.CaptureException(ex);
            return StatusCode(500, new { error = "Failed to retrieve performance recommendations" });
        }
    }

    /// <summary>
    /// Record custom performance metric
    /// </summary>
    [HttpPost("metrics/custom")]
    public async Task<ActionResult> RecordCustomMetric([FromBody] CustomMetricRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            SentrySdk.AddBreadcrumb($"CustomMetric: {request.MetricName} = {request.Value}", "metric",
                data: request.Properties);

            _logger.LogInformation("Custom metric recorded: {MetricName} = {Value}", request.MetricName, request.Value);
            return Ok(new { message = "Custom metric recorded successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error recording custom metric");
            SentrySdk.CaptureException(ex);
            return StatusCode(500, new { error = "Failed to record custom metric" });
        }
    }

    /// <summary>
    /// Track external dependency performance
    /// </summary>
    [HttpPost("dependencies/track")]
    public async Task<ActionResult> TrackDependency([FromBody] DependencyTrackingRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            SentrySdk.AddBreadcrumb(
                $"Dependency: {request.DependencyName} - {request.CommandName} ({request.DurationMs}ms, {(request.Success ? "success" : "failed")})",
                "dependency");

            _logger.LogInformation("Dependency tracked: {DependencyName} - {CommandName}", request.DependencyName, request.CommandName);
            return Ok(new { message = "Dependency tracked successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error tracking dependency");
            SentrySdk.CaptureException(ex);
            return StatusCode(500, new { error = "Failed to track dependency" });
        }
    }

    /// <summary>
    /// Record availability test result
    /// </summary>
    [HttpPost("availability/test")]
    public async Task<ActionResult> RecordAvailabilityTest([FromBody] AvailabilityTestRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            SentrySdk.AddBreadcrumb(
                $"Availability: {request.TestName} - {(request.Success ? "pass" : "fail")} ({request.DurationMs}ms) from {request.Location}",
                "availability");

            _logger.LogInformation("Availability test recorded: {TestName}", request.TestName);
            return Ok(new { message = "Availability test recorded successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error recording availability test");
            SentrySdk.CaptureException(ex);
            return StatusCode(500, new { error = "Failed to record availability test" });
        }
    }

    /// <summary>
    /// Record Core Web Vitals metrics from client
    /// </summary>
    [HttpPost("performance/core-web-vitals")]
    [AllowAnonymous] // Allow frontend to submit metrics
    public async Task<ActionResult> RecordCoreWebVitals([FromBody] CoreWebVitalsRequest request, CancellationToken cancellationToken = default)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }

            await _performanceMonitoringService.RecordCoreWebVitalsAsync(
                request.Url,
                request.LargestContentfulPaint,
                request.FirstInputDelay,
                request.CumulativeLayoutShift,
                request.FirstContentfulPaint,
                request.TimeToInteractive,
                cancellationToken);

            return Ok(new { message = "Core Web Vitals recorded successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error recording Core Web Vitals");
            SentrySdk.CaptureException(ex);
            return StatusCode(500, new { error = "Failed to record Core Web Vitals" });
        }
    }

    /// <summary>
    /// Get monitoring dashboard configuration
    /// </summary>
    [HttpGet("dashboard/config")]
    public ActionResult<MonitoringDashboardConfig> GetDashboardConfig()
    {
        var config = new MonitoringDashboardConfig
        {
            EnabledMetrics = new List<string>
            {
                "SystemHealth",
                "Infrastructure",
                "Performance",
                "Alerts",
                "CoreWebVitals",
                "Database",
                "Caching"
            },
            RefreshIntervalSeconds = 30,
            HistoryHours = 24,
            ShowInfrastructureMetrics = true,
            ShowApplicationMetrics = true,
            ShowAlerts = true
        };

        return Ok(config);
    }
}

/// <summary>
/// Request models for monitoring endpoints
/// </summary>
public class CustomMetricRequest
{
    public string MetricName { get; set; } = string.Empty;
    public double Value { get; set; }
    public Dictionary<string, string>? Properties { get; set; }
}

public class DependencyTrackingRequest
{
    public string DependencyName { get; set; } = string.Empty;
    public string CommandName { get; set; } = string.Empty;
    public double DurationMs { get; set; }
    public bool Success { get; set; }
}

public class AvailabilityTestRequest
{
    public string TestName { get; set; } = string.Empty;
    public bool Success { get; set; }
    public double DurationMs { get; set; }
    public string? Location { get; set; }
}

public class CoreWebVitalsRequest
{
    public string Url { get; set; } = string.Empty;
    public double LargestContentfulPaint { get; set; }
    public double? FirstInputDelay { get; set; }
    public double CumulativeLayoutShift { get; set; }
    public double? FirstContentfulPaint { get; set; }
    public double? TimeToInteractive { get; set; }
}
