using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using GeoLeap.Api.Extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.ComponentModel.DataAnnotations;

namespace GeoLeap.Api.Controllers;

/// <summary>
/// User behavior analytics and tracking API controller
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize] // Require authentication for analytics access
public class UserBehaviorController : ControllerBase
{
    private readonly IUserBehaviorService _userBehaviorService;
    private readonly ILogger<UserBehaviorController> _logger;

    public UserBehaviorController(
        IUserBehaviorService userBehaviorService,
        ILogger<UserBehaviorController> logger)
    {
        _userBehaviorService = userBehaviorService;
        _logger = logger;
    }

    /// <summary>
    /// Track a single user behavior event
    /// </summary>
    [HttpPost("events")]
    [AllowAnonymous] // Allow anonymous tracking for public events
    public async Task<IActionResult> TrackEvent([FromBody] GeoLeap.Api.Models.UserBehaviorEventRequest request)
    {
        try
        {
            var clientIP = HttpContext.Connection.RemoteIpAddress?.ToString();
            var userAgent = HttpContext.Request.Headers["User-Agent"].ToString();
            
            var success = await _userBehaviorService.TrackEventAsync(request, clientIP, userAgent);
            
            if (success)
            {
                return Ok(new { success = true, eventId = Guid.NewGuid() });
            }
            else
            {
                return this.StandardBadRequest("Failed to track event");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to track user behavior event: {EventType}", request.EventType);
            return this.StandardBadRequest(ex.Message);
        }
    }

    /// <summary>
    /// Batch track multiple user behavior events for better performance
    /// </summary>
    [HttpPost("events/batch")]
    [AllowAnonymous] // Allow anonymous batch tracking
    public async Task<IActionResult> TrackEventsBatch([FromBody] UserBehaviorBatchRequest request)
    {
        try
        {
            if (!request.Events.Any())
            {
                return this.StandardBadRequest("No events provided");
            }

            if (request.Events.Count() > 100)
            {
                return this.StandardBadRequest("Maximum 100 events per batch");
            }

            var clientIP = HttpContext.Connection.RemoteIpAddress?.ToString();
            var userAgent = HttpContext.Request.Headers["User-Agent"].ToString();
            
            var trackedCount = await _userBehaviorService.TrackEventsAsync(request.Events, clientIP, userAgent);
            
            return Ok(new { 
                success = true, 
                trackedCount = trackedCount, 
                totalCount = request.Events.Count() 
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to batch track user behavior events");
            return this.StandardBadRequest(ex.Message);
        }
    }

    /// <summary>
    /// Get comprehensive user behavior analytics dashboard
    /// </summary>
    [HttpGet("dashboard")]
    public async Task<IActionResult> GetDashboard(
        [FromQuery, Required] DateTime startDate,
        [FromQuery, Required] DateTime endDate,
        [FromQuery] string? userId = null)
    {
        try
        {
            if (startDate >= endDate)
            {
                return this.StandardBadRequest("Start date must be before end date");
            }

            if ((endDate - startDate).TotalDays > 90)
            {
                return this.StandardBadRequest("Date range cannot exceed 90 days for dashboard");
            }

            var dashboard = await _userBehaviorService.GetDashboardAsync(startDate, endDate, userId);
            return Ok(dashboard);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get user behavior dashboard");
            return this.StandardBadRequest(ex.Message);
        }
    }

    /// <summary>
    /// Get real-time user behavior metrics for live monitoring
    /// </summary>
    [HttpGet("realtime")]
    public async Task<IActionResult> GetRealTimeMetrics()
    {
        try
        {
            var metrics = await _userBehaviorService.GetRealTimeMetricsAsync();
            return Ok(metrics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get real-time user behavior metrics");
            return this.StandardBadRequest(ex.Message);
        }
    }

    /// <summary>
    /// Get page performance analytics
    /// </summary>
    [HttpGet("pages/analytics")]
    public async Task<IActionResult> GetPageAnalytics(
        [FromQuery, Required] DateTime startDate,
        [FromQuery, Required] DateTime endDate,
        [FromQuery] int limit = 50)
    {
        try
        {
            if (startDate >= endDate)
            {
                return this.StandardBadRequest("Start date must be before end date");
            }

            if (limit > 100)
            {
                return this.StandardBadRequest("Limit cannot exceed 100");
            }

            var analytics = await _userBehaviorService.GetPageAnalyticsAsync(startDate, endDate, limit);
            return Ok(analytics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get page analytics");
            return this.StandardBadRequest(ex.Message);
        }
    }

    /// <summary>
    /// Get detailed page performance report
    /// </summary>
    [HttpGet("pages/{pageUrl}/performance")]
    public async Task<IActionResult> GetPagePerformance(
        string pageUrl,
        [FromQuery, Required] DateTime startDate,
        [FromQuery, Required] DateTime endDate)
    {
        try
        {
            if (string.IsNullOrEmpty(pageUrl))
            {
                return this.StandardBadRequest("Page URL is required");
            }

            // Decode URL
            pageUrl = Uri.UnescapeDataString(pageUrl);

            var performance = await _userBehaviorService.GetPagePerformanceAsync(pageUrl, startDate, endDate);
            return Ok(performance);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get page performance for {PageUrl}", pageUrl);
            return this.StandardBadRequest(ex.Message);
        }
    }

    /// <summary>
    /// Get user session analytics
    /// </summary>
    [HttpGet("sessions")]
    public async Task<IActionResult> GetSessionAnalytics(
        [FromQuery, Required] DateTime startDate,
        [FromQuery, Required] DateTime endDate,
        [FromQuery] string? userId = null,
        [FromQuery] int limit = 100)
    {
        try
        {
            if (startDate >= endDate)
            {
                return this.StandardBadRequest("Start date must be before end date");
            }

            if (limit > 1000)
            {
                return this.StandardBadRequest("Limit cannot exceed 1000");
            }

            var sessions = await _userBehaviorService.GetSessionAnalyticsAsync(startDate, endDate, userId, limit);
            return Ok(sessions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get session analytics");
            return this.StandardBadRequest(ex.Message);
        }
    }

    /// <summary>
    /// Get user journey and funnel analysis
    /// </summary>
    [HttpGet("journey")]
    public async Task<IActionResult> GetUserJourney(
        [FromQuery, Required] DateTime startDate,
        [FromQuery, Required] DateTime endDate,
        [FromQuery] string? startPage = null,
        [FromQuery] string? endPage = null)
    {
        try
        {
            if (startDate >= endDate)
            {
                return this.StandardBadRequest("Start date must be before end date");
            }

            var journey = await _userBehaviorService.GetUserJourneyAsync(startDate, endDate, startPage, endPage);
            return Ok(journey);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get user journey");
            return this.StandardBadRequest(ex.Message);
        }
    }

    /// <summary>
    /// Get device and browser analytics
    /// </summary>
    [HttpGet("devices")]
    public async Task<IActionResult> GetDeviceAnalytics(
        [FromQuery, Required] DateTime startDate,
        [FromQuery, Required] DateTime endDate)
    {
        try
        {
            if (startDate >= endDate)
            {
                return this.StandardBadRequest("Start date must be before end date");
            }

            var devices = await _userBehaviorService.GetDeviceAnalyticsAsync(startDate, endDate);
            return Ok(devices);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get device analytics");
            return this.StandardBadRequest(ex.Message);
        }
    }

    /// <summary>
    /// Get geographic user distribution analytics
    /// </summary>
    [HttpGet("geographic")]
    public async Task<IActionResult> GetGeographicAnalytics(
        [FromQuery, Required] DateTime startDate,
        [FromQuery, Required] DateTime endDate)
    {
        try
        {
            if (startDate >= endDate)
            {
                return this.StandardBadRequest("Start date must be before end date");
            }

            var geographic = await _userBehaviorService.GetGeographicAnalyticsAsync(startDate, endDate);
            return Ok(geographic);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get geographic analytics");
            return this.StandardBadRequest(ex.Message);
        }
    }

    /// <summary>
    /// Get interaction heatmap data for a specific page
    /// </summary>
    [HttpGet("heatmap")]
    public async Task<IActionResult> GetHeatmapData(
        [FromQuery, Required] string pageUrl,
        [FromQuery, Required] DateTime startDate,
        [FromQuery, Required] DateTime endDate)
    {
        try
        {
            if (string.IsNullOrEmpty(pageUrl))
            {
                return this.StandardBadRequest("Page URL is required");
            }

            if (startDate >= endDate)
            {
                return this.StandardBadRequest("Start date must be before end date");
            }

            var heatmap = await _userBehaviorService.GetHeatmapDataAsync(pageUrl, startDate, endDate);
            return Ok(heatmap);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get heatmap data for {PageUrl}", pageUrl);
            return this.StandardBadRequest(ex.Message);
        }
    }

    /// <summary>
    /// Create or update user session
    /// </summary>
    [HttpPost("sessions")]
    [AllowAnonymous]
    public async Task<IActionResult> CreateSession([FromBody] CreateSessionRequest request)
    {
        try
        {
            if (string.IsNullOrEmpty(request.SessionId))
            {
                return this.StandardBadRequest("Session ID is required");
            }

            var clientIP = HttpContext.Connection.RemoteIpAddress?.ToString();
            var userAgent = HttpContext.Request.Headers["User-Agent"].ToString();
            
            var session = await _userBehaviorService.CreateOrUpdateSessionAsync(
                request.SessionId, request.UserId, clientIP, userAgent);
            
            return Ok(new { success = true, sessionId = session.SessionId });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create session {SessionId}", request.SessionId);
            return this.StandardBadRequest(ex.Message);
        }
    }

    /// <summary>
    /// End user session
    /// </summary>
    [HttpPost("sessions/{sessionId}/end")]
    [AllowAnonymous]
    public async Task<IActionResult> EndSession(string sessionId, [FromBody] EndSessionRequest? request = null)
    {
        try
        {
            if (string.IsNullOrEmpty(sessionId))
            {
                return this.StandardBadRequest("Session ID is required");
            }

            var success = await _userBehaviorService.EndSessionAsync(sessionId, request?.EndTime);
            
            if (success)
            {
                return Ok(new { success = true, message = "Session ended successfully" });
            }
            else
            {
                return NotFound(new { success = false, error = "Session not found" });
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to end session {SessionId}", sessionId);
            return this.StandardBadRequest(ex.Message);
        }
    }

    /// <summary>
    /// Get session details
    /// </summary>
    [HttpGet("sessions/{sessionId}")]
    public async Task<IActionResult> GetSession(string sessionId)
    {
        try
        {
            if (string.IsNullOrEmpty(sessionId))
            {
                return this.StandardBadRequest("Session ID is required");
            }

            var session = await _userBehaviorService.GetSessionAsync(sessionId);
            
            if (session == null)
            {
                return NotFound(new { error = "Session not found" });
            }

            return Ok(session);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get session {SessionId}", sessionId);
            return this.StandardBadRequest(ex.Message);
        }
    }

    /// <summary>
    /// Get active sessions count
    /// </summary>
    [HttpGet("sessions/active/count")]
    public async Task<IActionResult> GetActiveSessionsCount()
    {
        try
        {
            var count = await _userBehaviorService.GetActiveSessionsCountAsync();
            return Ok(new { activeSessionsCount = count, timestamp = DateTime.UtcNow });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get active sessions count");
            return this.StandardBadRequest(ex.Message);
        }
    }

    /// <summary>
    /// Get user-specific analytics
    /// </summary>
    [HttpGet("users/{userId}/analytics")]
    public async Task<IActionResult> GetUserAnalytics(
        string userId,
        [FromQuery, Required] DateTime startDate,
        [FromQuery, Required] DateTime endDate)
    {
        try
        {
            if (string.IsNullOrEmpty(userId))
            {
                return this.StandardBadRequest("User ID is required");
            }

            if (startDate >= endDate)
            {
                return this.StandardBadRequest("Start date must be before end date");
            }

            var analytics = await _userBehaviorService.GetUserAnalyticsAsync(userId, startDate, endDate);
            return Ok(analytics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get user analytics for {UserId}", userId);
            return this.StandardBadRequest(ex.Message);
        }
    }

    /// <summary>
    /// Get user events history
    /// </summary>
    [HttpGet("users/{userId}/events")]
    public async Task<IActionResult> GetUserEvents(
        string userId,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        [FromQuery] int limit = 1000)
    {
        try
        {
            if (string.IsNullOrEmpty(userId))
            {
                return this.StandardBadRequest("User ID is required");
            }

            if (limit > 5000)
            {
                return this.StandardBadRequest("Limit cannot exceed 5000");
            }

            var events = await _userBehaviorService.GetUserEventsAsync(userId, startDate, endDate, limit);
            return Ok(events);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get user events for {UserId}", userId);
            return this.StandardBadRequest(ex.Message);
        }
    }

    /// <summary>
    /// Get user sessions history
    /// </summary>
    [HttpGet("users/{userId}/sessions")]
    public async Task<IActionResult> GetUserSessions(
        string userId,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        [FromQuery] int limit = 100)
    {
        try
        {
            if (string.IsNullOrEmpty(userId))
            {
                return this.StandardBadRequest("User ID is required");
            }

            if (limit > 1000)
            {
                return this.StandardBadRequest("Limit cannot exceed 1000");
            }

            var sessions = await _userBehaviorService.GetUserSessionsAsync(userId, startDate, endDate, limit);
            return Ok(sessions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get user sessions for {UserId}", userId);
            return this.StandardBadRequest(ex.Message);
        }
    }

    /// <summary>
    /// Analyze conversion funnel performance
    /// </summary>
    [HttpPost("funnel/analyze")]
    public async Task<IActionResult> AnalyzeConversionFunnel([FromBody] ConversionFunnelRequest request)
    {
        try
        {
            if (request.Steps == null || !request.Steps.Any())
            {
                return this.StandardBadRequest("Funnel steps are required");
            }

            if (request.Steps.Count() > 10)
            {
                return this.StandardBadRequest("Maximum 10 funnel steps allowed");
            }

            if (request.StartDate >= request.EndDate)
            {
                return this.StandardBadRequest("Start date must be before end date");
            }

            var analysis = await _userBehaviorService.GetConversionFunnelAsync(
                request.Steps.ToList(), request.StartDate, request.EndDate);
            
            return Ok(analysis);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to analyze conversion funnel");
            return this.StandardBadRequest(ex.Message);
        }
    }

    /// <summary>
    /// Get conversion analytics by dimension
    /// </summary>
    [HttpGet("conversions")]
    public async Task<IActionResult> GetConversionAnalytics(
        [FromQuery, Required] DateTime startDate,
        [FromQuery, Required] DateTime endDate,
        [FromQuery] string? dimension = null)
    {
        try
        {
            if (startDate >= endDate)
            {
                return this.StandardBadRequest("Start date must be before end date");
            }

            var analytics = await _userBehaviorService.GetConversionAnalyticsAsync(startDate, endDate, dimension);
            return Ok(analytics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get conversion analytics");
            return this.StandardBadRequest(ex.Message);
        }
    }

    /// <summary>
    /// Get system tracking statistics
    /// </summary>
    [HttpGet("stats")]
    public async Task<IActionResult> GetTrackingStats()
    {
        try
        {
            var stats = await _userBehaviorService.GetTrackingStatsAsync();
            return Ok(stats);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get tracking stats");
            return this.StandardBadRequest(ex.Message);
        }
    }

    /// <summary>
    /// Delete user data for GDPR compliance
    /// </summary>
    [HttpDelete("users/{userId}/data")]
    public async Task<IActionResult> DeleteUserData(string userId)
    {
        try
        {
            if (string.IsNullOrEmpty(userId))
            {
                return this.StandardBadRequest("User ID is required");
            }

            var success = await _userBehaviorService.DeleteUserDataAsync(userId);
            
            if (success)
            {
                return Ok(new { success = true, message = "User data deleted successfully" });
            }
            else
            {
                return this.StandardBadRequest("Failed to delete user data");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete user data for {UserId}", userId);
            return this.StandardBadRequest(ex.Message);
        }
    }

    /// <summary>
    /// Anonymize user data for GDPR compliance
    /// </summary>
    [HttpPost("users/{userId}/anonymize")]
    public async Task<IActionResult> AnonymizeUserData(string userId)
    {
        try
        {
            if (string.IsNullOrEmpty(userId))
            {
                return this.StandardBadRequest("User ID is required");
            }

            var success = await _userBehaviorService.AnonymizeUserDataAsync(userId);
            
            if (success)
            {
                return Ok(new { success = true, message = "User data anonymized successfully" });
            }
            else
            {
                return this.StandardBadRequest("Failed to anonymize user data");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to anonymize user data for {UserId}", userId);
            return this.StandardBadRequest(ex.Message);
        }
    }

    /// <summary>
    /// Export user data for GDPR data request
    /// </summary>
    [HttpGet("users/{userId}/export")]
    public async Task<IActionResult> ExportUserData(string userId)
    {
        try
        {
            if (string.IsNullOrEmpty(userId))
            {
                return this.StandardBadRequest("User ID is required");
            }

            var export = await _userBehaviorService.ExportUserDataAsync(userId);
            return Ok(export);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to export user data for {UserId}", userId);
            return this.StandardBadRequest(ex.Message);
        }
    }

    /// <summary>
    /// Get cohort analysis
    /// </summary>
    [HttpGet("cohorts")]
    public async Task<IActionResult> GetCohortAnalysis(
        [FromQuery, Required] DateTime startDate,
        [FromQuery, Required] DateTime endDate,
        [FromQuery] string cohortType = "weekly")
    {
        try
        {
            if (startDate >= endDate)
            {
                return this.StandardBadRequest("Start date must be before end date");
            }

            var validCohortTypes = new[] { "daily", "weekly", "monthly" };
            if (!validCohortTypes.Contains(cohortType.ToLower()))
            {
                return this.StandardBadRequest("Invalid cohort type. Use: daily, weekly, or monthly");
            }

            var analysis = await _userBehaviorService.GetCohortAnalysisAsync(startDate, endDate, cohortType);
            return Ok(analysis);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get cohort analysis");
            return this.StandardBadRequest(ex.Message);
        }
    }

    /// <summary>
    /// Get A/B testing insights
    /// </summary>
    [HttpGet("abtests/{testId}/insights")]
    public async Task<IActionResult> GetABTestInsights(
        string testId,
        [FromQuery, Required] DateTime startDate,
        [FromQuery, Required] DateTime endDate)
    {
        try
        {
            if (string.IsNullOrEmpty(testId))
            {
                return this.StandardBadRequest("Test ID is required");
            }

            if (startDate >= endDate)
            {
                return this.StandardBadRequest("Start date must be before end date");
            }

            var insights = await _userBehaviorService.GetABTestInsightsAsync(testId, startDate, endDate);
            return Ok(insights);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get A/B test insights for {TestId}", testId);
            return this.StandardBadRequest(ex.Message);
        }
    }

    /// <summary>
    /// Get behavior predictions for a user
    /// </summary>
    [HttpGet("users/{userId}/predictions")]
    public async Task<IActionResult> GetBehaviorPredictions(string userId)
    {
        try
        {
            if (string.IsNullOrEmpty(userId))
            {
                return this.StandardBadRequest("User ID is required");
            }

            var predictions = await _userBehaviorService.GetBehaviorPredictionsAsync(userId);
            return Ok(predictions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get behavior predictions for {UserId}", userId);
            return this.StandardBadRequest(ex.Message);
        }
    }
}

/// <summary>
/// Request models for user behavior controller
/// </summary>
public class CreateSessionRequest
{
    [Required, MaxLength(100)]
    public string SessionId { get; set; } = string.Empty;
    
    [MaxLength(100)]
    public string? UserId { get; set; }
}

public class EndSessionRequest
{
    public DateTime? EndTime { get; set; }
}

public class ConversionFunnelRequest
{
    [Required]
    public DateTime StartDate { get; set; }
    
    [Required]
    public DateTime EndDate { get; set; }
    
    [Required]
    public IEnumerable<string> Steps { get; set; } = new List<string>();
}