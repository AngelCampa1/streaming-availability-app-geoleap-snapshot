using Microsoft.AspNetCore.Mvc;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using GeoLeap.Api.Extensions;

namespace GeoLeap.Api.Controllers;

/// <summary>
/// Controller for Core Web Vitals and performance monitoring APIs
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class PerformanceController : ControllerBase
{
    private readonly IPerformanceMonitoringService _performanceService;
    private readonly ILogger<PerformanceController> _logger;

    public PerformanceController(
        IPerformanceMonitoringService performanceService,
        ILogger<PerformanceController> logger)
    {
        _performanceService = performanceService;
        _logger = logger;
    }

    /// <summary>
    /// Get Core Web Vitals metrics for a specific URL
    /// </summary>
    [HttpGet("core-web-vitals")]
    [ProducesResponseType(typeof(CoreWebVitalsMetrics), 200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(500)]
    public async Task<ActionResult<CoreWebVitalsMetrics>> GetCoreWebVitalsAsync(
        [FromQuery] string url,
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (string.IsNullOrEmpty(url))
            {
                return this.StandardBadRequest("URL parameter is required");
            }

            var metrics = await _performanceService.GetCoreWebVitalsAsync(url, cancellationToken);
            return Ok(metrics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting Core Web Vitals for URL: {Url}", url);
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get response time metrics for API endpoints
    /// </summary>
    [HttpGet("response-time")]
    [ProducesResponseType(typeof(ResponseTimeMetrics), 200)]
    [ProducesResponseType(500)]
    public async Task<ActionResult<ResponseTimeMetrics>> GetResponseTimeMetricsAsync(
        [FromQuery] string? endpoint = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var metrics = await _performanceService.GetResponseTimeMetricsAsync(endpoint, cancellationToken);
            return Ok(metrics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting response time metrics");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get database performance metrics
    /// </summary>
    [HttpGet("database")]
    [ProducesResponseType(typeof(DatabasePerformanceMetrics), 200)]
    [ProducesResponseType(500)]
    public async Task<ActionResult<DatabasePerformanceMetrics>> GetDatabasePerformanceAsync(
        CancellationToken cancellationToken = default)
    {
        try
        {
            var metrics = await _performanceService.GetDatabasePerformanceAsync(cancellationToken);
            return Ok(metrics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting database performance metrics");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get caching metrics and configuration
    /// </summary>
    [HttpGet("caching")]
    [ProducesResponseType(typeof(CachingMetrics), 200)]
    [ProducesResponseType(500)]
    public async Task<ActionResult<CachingMetrics>> GetCachingMetricsAsync(
        CancellationToken cancellationToken = default)
    {
        try
        {
            var metrics = await _performanceService.GetCachingMetricsAsync(cancellationToken);
            return Ok(metrics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting caching metrics");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get compression metrics and effectiveness
    /// </summary>
    [HttpGet("compression")]
    [ProducesResponseType(typeof(CompressionMetrics), 200)]
    [ProducesResponseType(500)]
    public async Task<ActionResult<CompressionMetrics>> GetCompressionMetricsAsync(
        CancellationToken cancellationToken = default)
    {
        try
        {
            var metrics = await _performanceService.GetCompressionMetricsAsync(cancellationToken);
            return Ok(metrics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting compression metrics");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Validate performance for a specific URL
    /// </summary>
    [HttpPost("validate")]
    [ProducesResponseType(typeof(PerformanceValidationResult), 200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(500)]
    public async Task<ActionResult<PerformanceValidationResult>> ValidatePerformanceAsync(
        [FromBody] PerformanceValidationRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (request == null || string.IsNullOrEmpty(request.Url))
            {
                return this.StandardBadRequest("Valid request with URL is required");
            }

            var result = await _performanceService.ValidatePerformanceAsync(request, cancellationToken);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating performance for URL: {Url}", request?.Url);
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get performance recommendations
    /// </summary>
    [HttpGet("recommendations")]
    [ProducesResponseType(typeof(List<PerformanceRecommendation>), 200)]
    [ProducesResponseType(500)]
    public async Task<ActionResult<List<PerformanceRecommendation>>> GetRecommendationsAsync(
        [FromQuery] string? category = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var recommendations = await _performanceService.GetPerformanceRecommendationsAsync(category, cancellationToken);
            return Ok(recommendations);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting performance recommendations");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get real-time performance metrics
    /// </summary>
    [HttpGet("realtime")]
    [ProducesResponseType(typeof(RealtimePerformanceMetrics), 200)]
    [ProducesResponseType(500)]
    public async Task<ActionResult<RealtimePerformanceMetrics>> GetRealtimeMetricsAsync(
        CancellationToken cancellationToken = default)
    {
        try
        {
            var metrics = await _performanceService.GetRealtimePerformanceMetricsAsync(cancellationToken);
            return Ok(metrics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting real-time performance metrics");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Record Core Web Vitals metrics (for client-side reporting)
    /// </summary>
    [HttpPost("core-web-vitals")]
    [ProducesResponseType(200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(500)]
    public async Task<ActionResult> RecordCoreWebVitalsAsync(
        [FromBody] CoreWebVitalsRecordRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (request == null || string.IsNullOrEmpty(request.Url))
            {
                return this.StandardBadRequest("Valid request with URL is required");
            }

            await _performanceService.RecordCoreWebVitalsAsync(
                request.Url,
                request.LargestContentfulPaint,
                request.FirstInputDelay,
                request.CumulativeLayoutShift,
                request.FirstContentfulPaint,
                request.TimeToInteractive,
                cancellationToken);

            return Ok();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error recording Core Web Vitals for URL: {Url}", request?.Url);
            return StatusCode(500, "Internal server error");
        }
    }
}

/// <summary>
/// Request model for recording Core Web Vitals
/// </summary>
public class CoreWebVitalsRecordRequest
{
    public string Url { get; set; } = string.Empty;
    public double LargestContentfulPaint { get; set; }
    public double? FirstInputDelay { get; set; }
    public double CumulativeLayoutShift { get; set; }
    public double? FirstContentfulPaint { get; set; }
    public double? TimeToInteractive { get; set; }
}