using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using GeoLeap.Api.Attributes;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using System.Security.Claims;

namespace GeoLeap.Api.Controllers;

[ApiController]
[Route("api/admin/dashboard")]
[Authorize]
[RequirePermission("admin", "dashboard:view")]
public class AdminDashboardController : ControllerBase
{
    private readonly IBusinessMetricsService _businessMetrics;
    private readonly IAdvancedAdminUserService _userService;
    private readonly ISubscriptionAnalyticsService _subscriptionAnalytics;
    private readonly ILogger<AdminDashboardController> _logger;

    public AdminDashboardController(
        IBusinessMetricsService businessMetrics,
        IAdvancedAdminUserService userService,
        ISubscriptionAnalyticsService subscriptionAnalytics,
        ILogger<AdminDashboardController> logger)
    {
        _businessMetrics = businessMetrics;
        _userService = userService;
        _subscriptionAnalytics = subscriptionAnalytics;
        _logger = logger;
    }

    /// <summary>
    /// Get comprehensive business metrics for admin dashboard
    /// </summary>
    [HttpGet("metrics")]
    public async Task<ActionResult<BusinessMetricsResponse>> GetBusinessMetrics()
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var metrics = await _businessMetrics.GetBusinessMetricsAsync(correlationId);
            return Ok(metrics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving business metrics");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get real-time KPIs for dashboard widgets
    /// </summary>
    [HttpGet("kpis")]
    public async Task<ActionResult<BusinessKpis>> GetRealTimeKpis()
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var kpis = await _businessMetrics.GetRealTimeKpisAsync(correlationId);
            return Ok(kpis);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving real-time KPIs");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get metric trends for charts and graphs
    /// </summary>
    [HttpGet("trends/{metricName}")]
    public async Task<ActionResult<List<MetricTrend>>> GetMetricTrends(
        string metricName,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        [FromQuery] string granularity = "daily")
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var start = startDate ?? DateTime.UtcNow.AddDays(-30);
            var end = endDate ?? DateTime.UtcNow;
            
            var trends = await _businessMetrics.GetMetricTrendsAsync(
                metricName, start, end, granularity, correlationId);
            
            return Ok(trends);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving metric trends for {MetricName}", metricName);
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get active business alerts
    /// </summary>
    [HttpGet("alerts")]
    public async Task<ActionResult<List<BusinessAlert>>> GetActiveAlerts()
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var alerts = await _businessMetrics.GetActiveAlertsAsync(correlationId);
            return Ok(alerts);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving active alerts");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get user growth analytics
    /// </summary>
    [HttpGet("analytics/users")]
    public async Task<ActionResult<Dictionary<string, object>>> GetUserGrowthAnalytics(
        [FromQuery] DateTime startDate,
        [FromQuery] DateTime endDate)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var analytics = await _businessMetrics.GetUserGrowthAnalyticsAsync(
                startDate, endDate, correlationId);
            return Ok(analytics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving user growth analytics");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get revenue analytics breakdown
    /// </summary>
    [HttpGet("analytics/revenue")]
    public async Task<ActionResult<Dictionary<string, object>>> GetRevenueAnalytics(
        [FromQuery] DateTime startDate,
        [FromQuery] DateTime endDate)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var analytics = await _businessMetrics.GetRevenueAnalyticsAsync(
                startDate, endDate, correlationId);
            return Ok(analytics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving revenue analytics");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get subscription analytics summary
    /// </summary>
    [HttpGet("analytics/subscriptions")]
    public async Task<ActionResult<Dictionary<string, object>>> GetSubscriptionAnalytics(
        [FromQuery] DateTime startDate,
        [FromQuery] DateTime endDate)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var analytics = await _businessMetrics.GetSubscriptionAnalyticsAsync(
                startDate, endDate, correlationId);
            return Ok(analytics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving subscription analytics");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get support metrics overview
    /// </summary>
    [HttpGet("analytics/support")]
    public async Task<ActionResult<Dictionary<string, object>>> GetSupportMetrics(
        [FromQuery] DateTime startDate,
        [FromQuery] DateTime endDate)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var metrics = await _businessMetrics.GetSupportMetricsAsync(
                startDate, endDate, correlationId);
            return Ok(metrics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving support metrics");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get system performance metrics
    /// </summary>
    [HttpGet("analytics/system")]
    public async Task<ActionResult<Dictionary<string, object>>> GetSystemPerformanceMetrics()
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var metrics = await _businessMetrics.GetSystemPerformanceMetricsAsync(correlationId);
            return Ok(metrics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving system performance metrics");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get custom analytics based on request
    /// </summary>
    [HttpPost("analytics/custom")]
    public async Task<ActionResult<AdminAnalyticsResponse>> GetCustomAnalytics(
        [FromBody] AdminAnalyticsRequest request)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var analytics = await _businessMetrics.GetCustomAnalyticsAsync(request, correlationId);
            return Ok(analytics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving custom analytics");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get subscription analytics dashboard summary
    /// </summary>
    [HttpGet("subscription-analytics")]
    public async Task<ActionResult<SubscriptionAnalyticsSummary>> GetSubscriptionAnalyticsSummary()
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var summary = await _subscriptionAnalytics.GetDashboardSummaryAsync(correlationId);
            return Ok(summary);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving subscription analytics summary");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get comprehensive user statistics
    /// </summary>
    [HttpGet("user-statistics")]
    public async Task<ActionResult<Dictionary<string, object>>> GetUserStatistics(
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var statistics = await _userService.GetUserStatisticsAsync(fromDate, toDate, correlationId);
            return Ok(statistics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving user statistics");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Track a business event for analytics
    /// </summary>
    [HttpPost("track-event")]
    public async Task<ActionResult> TrackBusinessEvent([FromBody] TrackBusinessEventRequest request)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            await _businessMetrics.TrackBusinessEventAsync(
                request.EventType, request.Properties, correlationId);
            return Ok(new { Message = "Event tracked successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error tracking business event");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Refresh metrics cache
    /// </summary>
    [HttpPost("refresh-cache")]
    [RequirePermission("admin:cache:refresh")]
    public async Task<ActionResult> RefreshMetricsCache()
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            await _businessMetrics.RefreshMetricsCacheAsync(correlationId);
            return Ok(new { Message = "Metrics cache refreshed successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error refreshing metrics cache");
            return StatusCode(500, "Internal server error");
        }
    }

    private Guid? GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(userIdClaim, out var userId) ? userId : null;
    }
}

// Supporting DTOs
public class TrackBusinessEventRequest
{
    public string EventType { get; set; } = string.Empty;
    public Dictionary<string, object> Properties { get; set; } = new();
}