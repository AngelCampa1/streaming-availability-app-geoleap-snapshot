using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using GeoLeap.Api.Services;
using GeoLeap.Api.Models;
using System.Security.Claims;
using static GeoLeap.Api.Models.SocialSharingAnalyticsRequest;

namespace GeoLeap.Api.Controllers;

/// <summary>
/// Controller for social sharing analytics and viral growth tracking
/// </summary>
[ApiController]
[Route("api/social-sharing/analytics")]
[Authorize]
public class SocialSharingAnalyticsController : ControllerBase
{
    private readonly ISocialSharingAnalyticsService _analyticsService;
    private readonly ILogger<SocialSharingAnalyticsController> _logger;

    public SocialSharingAnalyticsController(
        ISocialSharingAnalyticsService analyticsService,
        ILogger<SocialSharingAnalyticsController> logger)
    {
        _analyticsService = analyticsService;
        _logger = logger;
    }

    /// <summary>
    /// Track a social sharing event
    /// </summary>
    [HttpPost("track/share")]
    public async Task<ActionResult<Guid>> TrackShareEvent([FromBody] TrackShareEventRequest request)
    {
        var correlationId = HttpContext.TraceIdentifier;
        var userId = GetUserId();
        var ipAddress = GetClientIpAddress();

        try
        {
            var shareEventId = await _analyticsService.TrackShareEventAsync(userId, request, ipAddress, correlationId);
            return Ok(new { ShareEventId = shareEventId });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to track share event for user {UserId}", userId);
            return StatusCode(500, new { error = "Failed to track share event" });
        }
    }

    /// <summary>
    /// Track a click on a shared link
    /// </summary>
    [HttpPost("track/click")]
    [AllowAnonymous] // Allow anonymous users to click shared links
    public async Task<ActionResult<Guid>> TrackClickEvent([FromBody] TrackClickEventRequest request)
    {
        var correlationId = HttpContext.TraceIdentifier;
        var ipAddress = GetClientIpAddress();

        try
        {
            var clickEventId = await _analyticsService.TrackClickEventAsync(request, ipAddress, correlationId);
            return Ok(new { ClickEventId = clickEventId });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to track click event for share {ShareEventId}", request.ShareEventId);
            return StatusCode(500, new { error = "Failed to track click event" });
        }
    }

    /// <summary>
    /// Update click event with conversion information
    /// </summary>
    [HttpPut("track/click/{clickEventId}/conversion")]
    public async Task<ActionResult> UpdateClickConversion(
        Guid clickEventId, 
        [FromBody] UpdateConversionRequest request)
    {
        var correlationId = HttpContext.TraceIdentifier;

        try
        {
            await _analyticsService.UpdateClickEventConversionAsync(
                clickEventId, 
                request.ResultedInRegistration, 
                request.ResultedInSubscription, 
                correlationId);
            
            return Ok(new { message = "Conversion updated successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update conversion for click {ClickEventId}", clickEventId);
            return StatusCode(500, new { error = "Failed to update conversion" });
        }
    }

    /// <summary>
    /// Get viral metrics dashboard data
    /// </summary>
    [HttpGet("dashboard/viral-metrics")]
    [Authorize(Roles = "admin,analytics_viewer")]
    public async Task<ActionResult> GetViralMetrics([FromQuery] AnalyticsFilterRequest filter)
    {
        var correlationId = HttpContext.TraceIdentifier;

        try
        {
            var metrics = await _analyticsService.GetViralMetricsAsync(filter, correlationId);
            return Ok(new { Metrics = metrics });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get viral metrics");
            return StatusCode(500, new { error = "Failed to retrieve viral metrics" });
        }
    }

    /// <summary>
    /// Get real-time viral metrics
    /// </summary>
    [HttpGet("dashboard/real-time")]
    [Authorize(Roles = "admin,analytics_viewer")]
    public async Task<ActionResult> GetRealTimeMetrics()
    {
        var correlationId = HttpContext.TraceIdentifier;

        try
        {
            var metrics = await _analyticsService.GetRealTimeViralMetricsAsync(correlationId);
            return Ok(new { RealTimeMetrics = metrics, LastUpdated = DateTime.UtcNow });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get real-time metrics");
            return StatusCode(500, new { error = "Failed to retrieve real-time metrics" });
        }
    }

    /// <summary>
    /// Get content performance analytics
    /// </summary>
    [HttpGet("content-performance")]
    [Authorize(Roles = "admin,analytics_viewer")]
    public async Task<ActionResult> GetContentPerformance([FromQuery] AnalyticsFilterRequest filter)
    {
        var correlationId = HttpContext.TraceIdentifier;

        try
        {
            var performance = await _analyticsService.GetContentPerformanceAsync(filter, correlationId);
            return Ok(new { ContentPerformance = performance });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get content performance");
            return StatusCode(500, new { error = "Failed to retrieve content performance" });
        }
    }

    /// <summary>
    /// Get platform-specific performance analytics
    /// </summary>
    [HttpGet("platform-performance")]
    [Authorize(Roles = "admin,analytics_viewer")]
    public async Task<ActionResult> GetPlatformPerformance([FromQuery] AnalyticsFilterRequest filter)
    {
        var correlationId = HttpContext.TraceIdentifier;

        try
        {
            var performance = await _analyticsService.GetPlatformPerformanceAsync(filter, correlationId);
            return Ok(new { PlatformPerformance = performance });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get platform performance");
            return StatusCode(500, new { error = "Failed to retrieve platform performance" });
        }
    }

    /// <summary>
    /// Get conversion funnel analytics
    /// </summary>
    [HttpGet("conversion-funnel")]
    [Authorize(Roles = "admin,analytics_viewer")]
    public async Task<ActionResult> GetConversionFunnel([FromQuery] AnalyticsFilterRequest filter)
    {
        var correlationId = HttpContext.TraceIdentifier;

        try
        {
            var funnel = await _analyticsService.GetConversionFunnelAsync(filter, correlationId);
            return Ok(new { ConversionFunnel = funnel });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get conversion funnel");
            return StatusCode(500, new { error = "Failed to retrieve conversion funnel" });
        }
    }

    /// <summary>
    /// Get sharing cohort analysis
    /// </summary>
    [HttpGet("cohort-analysis")]
    [Authorize(Roles = "admin,analytics_viewer")]
    public async Task<ActionResult> GetCohortAnalysis([FromQuery] AnalyticsFilterRequest filter)
    {
        var correlationId = HttpContext.TraceIdentifier;

        try
        {
            var cohorts = await _analyticsService.GetSharingCohortAnalysisAsync(filter, correlationId);
            return Ok(new { CohortAnalysis = cohorts });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get cohort analysis");
            return StatusCode(500, new { error = "Failed to retrieve cohort analysis" });
        }
    }

    /// <summary>
    /// Get A/B test results
    /// </summary>
    [HttpGet("ab-tests")]
    [Authorize(Roles = "admin")]
    public async Task<ActionResult> GetAbTestResults([FromQuery] Guid? testId)
    {
        var correlationId = HttpContext.TraceIdentifier;

        try
        {
            var results = await _analyticsService.GetAbTestResultsAsync(testId, correlationId);
            return Ok(new { AbTestResults = results });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get A/B test results");
            return StatusCode(500, new { error = "Failed to retrieve A/B test results" });
        }
    }

    /// <summary>
    /// Create new A/B test
    /// </summary>
    [HttpPost("ab-tests")]
    [Authorize(Roles = "admin")]
    public async Task<ActionResult> CreateAbTest([FromBody] CreateAbTestRequest request)
    {
        var correlationId = HttpContext.TraceIdentifier;
        var createdBy = GetUserId();

        try
        {
            var testId = await _analyticsService.CreateAbTestAsync(
                request.TestName,
                request.VariantName,
                request.Description,
                request.ConfigurationJson,
                request.TrafficPercentage,
                createdBy,
                correlationId);

            return CreatedAtAction(nameof(GetAbTestResults), new { testId }, new { TestId = testId });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create A/B test");
            return StatusCode(500, new { error = "Failed to create A/B test" });
        }
    }

    /// <summary>
    /// Get user's A/B test assignment
    /// </summary>
    [HttpGet("ab-tests/assignment/{testName}")]
    public async Task<ActionResult> GetUserAbTestAssignment(string testName)
    {
        var correlationId = HttpContext.TraceIdentifier;
        var userId = GetUserId();

        try
        {
            var assignment = await _analyticsService.GetUserAbTestAssignmentAsync(userId, testName, correlationId);
            return Ok(new { TestName = testName, Assignment = assignment ?? "control" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get A/B test assignment");
            return Ok(new { TestName = testName, Assignment = "control" }); // Default to control on error
        }
    }

    /// <summary>
    /// Calculate viral coefficient
    /// </summary>
    [HttpGet("viral-coefficient")]
    [Authorize(Roles = "admin,analytics_viewer")]
    public async Task<ActionResult> CalculateViralCoefficient(
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        [FromQuery] string? platform)
    {
        var correlationId = HttpContext.TraceIdentifier;
        var start = startDate ?? DateTime.UtcNow.AddDays(-30);
        var end = endDate ?? DateTime.UtcNow;

        try
        {
            var coefficient = await _analyticsService.CalculateViralCoefficientAsync(start, end, platform, correlationId);
            return Ok(new { 
                ViralCoefficient = coefficient,
                Period = new { StartDate = start, EndDate = end },
                Platform = platform ?? "all"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to calculate viral coefficient");
            return StatusCode(500, new { error = "Failed to calculate viral coefficient" });
        }
    }

    /// <summary>
    /// Get sharing velocity trends
    /// </summary>
    [HttpGet("velocity-trends")]
    [Authorize(Roles = "admin,analytics_viewer")]
    public async Task<ActionResult> GetVelocityTrends([FromQuery] AnalyticsFilterRequest filter)
    {
        var correlationId = HttpContext.TraceIdentifier;

        try
        {
            var trends = await _analyticsService.GetSharingVelocityTrendsAsync(filter, correlationId);
            return Ok(new { VelocityTrends = trends });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get velocity trends");
            return StatusCode(500, new { error = "Failed to retrieve velocity trends" });
        }
    }

    /// <summary>
    /// Get geographic sharing distribution
    /// </summary>
    [HttpGet("geographic-distribution")]
    [Authorize(Roles = "admin,analytics_viewer")]
    public async Task<ActionResult> GetGeographicDistribution([FromQuery] AnalyticsFilterRequest filter)
    {
        var correlationId = HttpContext.TraceIdentifier;

        try
        {
            var distribution = await _analyticsService.GetGeographicSharingDistributionAsync(filter, correlationId);
            return Ok(new { GeographicDistribution = distribution });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get geographic distribution");
            return StatusCode(500, new { error = "Failed to retrieve geographic distribution" });
        }
    }

    /// <summary>
    /// Get device sharing patterns
    /// </summary>
    [HttpGet("device-patterns")]
    [Authorize(Roles = "admin,analytics_viewer")]
    public async Task<ActionResult> GetDevicePatterns([FromQuery] AnalyticsFilterRequest filter)
    {
        var correlationId = HttpContext.TraceIdentifier;

        try
        {
            var patterns = await _analyticsService.GetDeviceSharingPatternsAsync(filter, correlationId);
            return Ok(new { DevicePatterns = patterns });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get device patterns");
            return StatusCode(500, new { error = "Failed to retrieve device patterns" });
        }
    }

    /// <summary>
    /// Get trending shared content
    /// </summary>
    [HttpGet("trending-content")]
    [Authorize(Roles = "admin,analytics_viewer")]
    public async Task<ActionResult> GetTrendingContent([FromQuery] int limit = 10)
    {
        var correlationId = HttpContext.TraceIdentifier;

        try
        {
            var trending = await _analyticsService.GetTrendingSharedContentAsync(limit, correlationId);
            return Ok(new { TrendingContent = trending });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get trending content");
            return StatusCode(500, new { error = "Failed to retrieve trending content" });
        }
    }

    /// <summary>
    /// Export analytics data
    /// </summary>
    [HttpPost("export")]
    [Authorize(Roles = "admin")]
    public async Task<ActionResult> ExportData([FromBody] ExportDataRequest request)
    {
        var correlationId = HttpContext.TraceIdentifier;

        try
        {
            var filter = new AnalyticsFilterRequest
            {
                StartDate = request.StartDate,
                EndDate = request.EndDate,
                Platform = request.Platform,
                ContentType = request.ContentType
            };

            var stream = await _analyticsService.ExportAnalyticsDataAsync(filter, request.Format, correlationId);
            var fileName = $"social-sharing-analytics-{DateTime.UtcNow:yyyyMMdd}.{request.Format.ToLower()}";

            return File(stream, GetContentType(request.Format), fileName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to export analytics data");
            return StatusCode(500, new { error = "Failed to export data" });
        }
    }

    /// <summary>
    /// Get analytics health status
    /// </summary>
    [HttpGet("health")]
    [Authorize(Roles = "admin")]
    public async Task<ActionResult> GetHealth()
    {
        var correlationId = HttpContext.TraceIdentifier;

        try
        {
            var health = await _analyticsService.GetAnalyticsHealthAsync(correlationId);
            return Ok(health);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get analytics health");
            return StatusCode(500, new { error = "Failed to retrieve health status" });
        }
    }

    /// <summary>
    /// Refresh analytics cache
    /// </summary>
    [HttpPost("refresh-cache")]
    [Authorize(Roles = "admin")]
    public async Task<ActionResult> RefreshCache()
    {
        var correlationId = HttpContext.TraceIdentifier;

        try
        {
            await _analyticsService.RefreshAnalyticsCacheAsync(correlationId);
            return Ok(new { message = "Analytics cache refreshed successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to refresh analytics cache");
            return StatusCode(500, new { error = "Failed to refresh cache" });
        }
    }

    /// <summary>
    /// Generate aggregated metrics for a specific date
    /// </summary>
    [HttpPost("generate-metrics")]
    [Authorize(Roles = "admin")]
    public async Task<ActionResult> GenerateMetrics([FromBody] GenerateMetricsRequest request)
    {
        var correlationId = HttpContext.TraceIdentifier;

        try
        {
            await _analyticsService.GenerateAggregatedMetricsAsync(request.Date, correlationId);
            return Ok(new { message = "Metrics generated successfully", Date = request.Date });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate metrics for date {Date}", request.Date);
            return StatusCode(500, new { error = "Failed to generate metrics" });
        }
    }

    // Helper methods
    private Guid GetUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(userIdClaim, out var userId) ? userId : Guid.Empty;
    }

    private string GetClientIpAddress()
    {
        return HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    }

    private string GetContentType(string format)
    {
        return format.ToLower() switch
        {
            "csv" => "text/csv",
            "json" => "application/json",
            "excel" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            _ => "text/plain"
        };
    }
}

// Request models for controller endpoints
public class UpdateConversionRequest
{
    public bool ResultedInRegistration { get; set; }
    public bool ResultedInSubscription { get; set; }
}

public class CreateAbTestRequest
{
    public string TestName { get; set; } = string.Empty;
    public string VariantName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string ConfigurationJson { get; set; } = string.Empty;
    public double TrafficPercentage { get; set; } = 50.0;
}

public class ExportDataRequest
{
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string? Platform { get; set; }
    public string? ContentType { get; set; }
    public string Format { get; set; } = "CSV";
}

public class GenerateMetricsRequest
{
    public DateTime Date { get; set; } = DateTime.UtcNow.Date;
}