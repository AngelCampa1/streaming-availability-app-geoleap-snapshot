using GeoLeap.Api.Models.AdvancedUserBehavior;
using GeoLeap.Api.Services.UserBehavior;
using GeoLeap.Api.Extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.ComponentModel.DataAnnotations;

namespace GeoLeap.Api.Controllers;

/// <summary>
/// User Behavior Analytics tracking and reporting API
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize] // Require authentication for analytics access
public class UserBehaviorAnalyticsController : ControllerBase
{
    private readonly IUserBehaviorAnalyticsService _analyticsService;
    private readonly ILogger<UserBehaviorAnalyticsController> _logger;
    
    public UserBehaviorAnalyticsController(
        IUserBehaviorAnalyticsService analyticsService,
        ILogger<UserBehaviorAnalyticsController> logger)
    {
        _analyticsService = analyticsService;
        _logger = logger;
    }
    
    /// <summary>
    /// Track a single user behavior event
    /// </summary>
    [HttpPost("events")]
    [AllowAnonymous] // Allow anonymous tracking for public events
    public async Task<IActionResult> TrackEvent([FromBody] UserBehaviorEventRequest request)
    {
        try
        {
            var behaviorEvent = await MapRequestToEvent(request);
            var success = await _analyticsService.TrackEventAsync(behaviorEvent);
            
            if (success)
            {
                return Ok(new { success = true, eventId = behaviorEvent.Id });
            }
            else
            {
                return this.StandardBadRequest("Failed to track event");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to track user behavior event");
            return this.StandardBadRequest(ex.Message);
        }
    }
    
    /// <summary>
    /// Batch track multiple events (high performance)
    /// </summary>
    [HttpPost("events/batch")]
    [AllowAnonymous] // Allow anonymous batch tracking
    public async Task<IActionResult> TrackEvents([FromBody] IEnumerable<UserBehaviorEventRequest> requests)
    {
        try
        {
            var events = new List<UserBehaviorEvent>();
            foreach (var request in requests)
            {
                var behaviorEvent = await MapRequestToEvent(request);
                events.Add(behaviorEvent);
            }
            
            var tracked = await _analyticsService.TrackEventsAsync(events);
            
            return Ok(new { success = true, trackedCount = tracked, totalCount = events.Count });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to batch track user behavior events");
            return this.StandardBadRequest(ex.Message);
        }
    }
    
    /// <summary>
    /// Get user behavior events for a specific user
    /// </summary>
    [HttpGet("users/{userId}/events")]
    public async Task<IActionResult> GetUserEvents(
        string userId,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        [FromQuery] bool respectConsent = true)
    {
        try
        {
            var events = await _analyticsService.GetUserEventsAsync(userId, startDate, endDate, respectConsent);
            return Ok(events);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get user behavior events for {UserId}", userId);
            return this.StandardBadRequest(ex.Message);
        }
    }
    
    /// <summary>
    /// Get events by category
    /// </summary>
    [HttpGet("events/category/{category}")]
    public async Task<IActionResult> GetEventsByCategory(
        string category,
        [FromQuery, Required] DateTime startDate,
        [FromQuery, Required] DateTime endDate,
        [FromQuery] int limit = 1000)
    {
        try
        {
            if (startDate >= endDate)
            {
                return this.StandardBadRequest("Start date must be before end date");
            }

            // ✅ SECURITY FIX: Validate limit parameter to prevent excessive data retrieval
            if (limit < 1 || limit > 10000)
            {
                return this.StandardBadRequest("Limit must be between 1 and 10000");
            }

            var events = await _analyticsService.GetEventsByCategoryAsync(category, startDate, endDate, limit);
            return Ok(events);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get events by category: {Category}", category);
            return this.StandardBadRequest(ex.Message);
        }
    }
    
    /// <summary>
    /// Get events by event type
    /// </summary>
    [HttpGet("events/type/{eventType}")]
    public async Task<IActionResult> GetEventsByType(
        string eventType,
        [FromQuery, Required] DateTime startDate,
        [FromQuery, Required] DateTime endDate,
        [FromQuery] int limit = 1000)
    {
        try
        {
            if (startDate >= endDate)
            {
                return this.StandardBadRequest("Start date must be before end date");
            }

            // ✅ SECURITY FIX: Validate limit parameter to prevent excessive data retrieval
            if (limit < 1 || limit > 10000)
            {
                return this.StandardBadRequest("Limit must be between 1 and 10000");
            }

            var events = await _analyticsService.GetEventsByTypeAsync(eventType, startDate, endDate, limit);
            return Ok(events);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get events by type: {EventType}", eventType);
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
            var session = await _analyticsService.GetSessionAsync(sessionId);
            
            if (session == null)
            {
                return NotFound(new { error = "Session not found" });
            }
            
            return Ok(session);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get session: {SessionId}", sessionId);
            return this.StandardBadRequest(ex.Message);
        }
    }
    
    /// <summary>
    /// Get all sessions for a user
    /// </summary>
    [HttpGet("users/{userId}/sessions")]
    public async Task<IActionResult> GetUserSessions(
        string userId,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null)
    {
        try
        {
            var sessions = await _analyticsService.GetUserSessionsAsync(userId, startDate, endDate);
            return Ok(sessions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get user sessions for {UserId}", userId);
            return this.StandardBadRequest(ex.Message);
        }
    }
    
    /// <summary>
    /// Get page performance analytics
    /// </summary>
    [HttpGet("analytics/page-performance")]
    public async Task<IActionResult> GetPagePerformance(
        [FromQuery] string? pageUrl = null,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null)
    {
        try
        {
            var analytics = await _analyticsService.GetPagePerformanceAsync(pageUrl, startDate, endDate);
            return Ok(analytics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get page performance analytics");
            return this.StandardBadRequest(ex.Message);
        }
    }
    
    /// <summary>
    /// Get user journey analytics
    /// </summary>
    [HttpGet("analytics/user-journey")]
    public async Task<IActionResult> GetUserJourney(
        [FromQuery] string? userId = null,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null)
    {
        try
        {
            var analytics = await _analyticsService.GetUserJourneyAsync(userId, startDate, endDate);
            return Ok(analytics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get user journey analytics");
            return this.StandardBadRequest(ex.Message);
        }
    }
    
    /// <summary>
    /// Analyze conversion funnel
    /// </summary>
    [HttpPost("analytics/funnel")]
    public async Task<IActionResult> AnalyzeFunnel([FromBody] FunnelAnalysisRequest request)
    {
        try
        {
            if (request.StartDate >= request.EndDate)
            {
                return this.StandardBadRequest("Start date must be before end date");
            }
            
            if (!request.EventTypes.Any())
            {
                return this.StandardBadRequest("At least one event type is required");
            }
            
            var funnel = await _analyticsService.AnalyzeFunnelAsync(request.FunnelName, request.EventTypes, request.StartDate, request.EndDate);
            return Ok(funnel);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to analyze funnel: {FunnelName}", request.FunnelName);
            return this.StandardBadRequest(ex.Message);
        }
    }
    
    /// <summary>
    /// Get cohort analysis
    /// </summary>
    [HttpGet("analytics/cohort")]
    public async Task<IActionResult> GetCohortAnalysis(
        [FromQuery, Required] DateTime cohortStart,
        [FromQuery, Required] DateTime cohortEnd,
        [FromQuery] string cohortCriteria = "first_visit")
    {
        try
        {
            if (cohortStart >= cohortEnd)
            {
                return this.StandardBadRequest("Cohort start must be before cohort end");
            }
            
            var cohortAnalysis = await _analyticsService.GetCohortAnalysisAsync(cohortStart, cohortEnd, cohortCriteria);
            return Ok(cohortAnalysis);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get cohort analysis");
            return this.StandardBadRequest(ex.Message);
        }
    }
    
    /// <summary>
    /// Get real-time analytics dashboard data
    /// </summary>
    [HttpGet("analytics/realtime")]
    public async Task<IActionResult> GetRealTimeAnalytics()
    {
        try
        {
            var analytics = await _analyticsService.GetRealTimeAnalyticsAsync();
            return Ok(analytics);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get real-time analytics");
            return this.StandardBadRequest(ex.Message);
        }
    }
    
    /// <summary>
    /// Get behavior insights and recommendations
    /// </summary>
    [HttpGet("insights")]
    public async Task<IActionResult> GetInsights(
        [FromQuery] string? category = null,
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null)
    {
        try
        {
            var insights = await _analyticsService.GetInsightsAsync(category, startDate, endDate);
            return Ok(insights);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get behavior insights");
            return this.StandardBadRequest(ex.Message);
        }
    }
    
    /// <summary>
    /// Calculate new insights for a period
    /// </summary>
    [HttpPost("insights/calculate")]
    public async Task<IActionResult> CalculateInsights([FromBody] InsightCalculationRequest request)
    {
        try
        {
            if (request.StartDate >= request.EndDate)
            {
                return this.StandardBadRequest("Start date must be before end date");
            }
            
            var insights = await _analyticsService.CalculateInsightsAsync(request.StartDate, request.EndDate);
            return Ok(insights);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to calculate insights");
            return this.StandardBadRequest(ex.Message);
        }
    }
    
    /// <summary>
    /// Get user segmentation
    /// </summary>
    [HttpGet("analytics/segmentation")]
    public async Task<IActionResult> GetUserSegmentation(
        [FromQuery, Required] DateTime startDate,
        [FromQuery, Required] DateTime endDate,
        [FromQuery] string segmentationCriteria = "engagement")
    {
        try
        {
            if (startDate >= endDate)
            {
                return this.StandardBadRequest("Start date must be before end date");
            }
            
            var segmentation = await _analyticsService.GetUserSegmentationAsync(startDate, endDate, segmentationCriteria);
            return Ok(segmentation);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get user segmentation");
            return this.StandardBadRequest(ex.Message);
        }
    }
    
    /// <summary>
    /// Get A/B test performance analytics
    /// </summary>
    [HttpGet("analytics/abtest/{experimentId}")]
    public async Task<IActionResult> GetAbTestPerformance(Guid experimentId)
    {
        try
        {
            var performance = await _analyticsService.GetAbTestPerformanceAsync(experimentId);
            return Ok(performance);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get A/B test performance for experiment {ExperimentId}", experimentId);
            return this.StandardBadRequest(ex.Message);
        }
    }
    
    /// <summary>
    /// Get processing statistics for monitoring
    /// </summary>
    [HttpGet("stats")]
    public async Task<IActionResult> GetProcessingStats()
    {
        try
        {
            var stats = await _analyticsService.GetProcessingStatsAsync();
            return Ok(stats);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get processing stats");
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
            var success = await _analyticsService.DeleteUserDataAsync(userId);
            
            if (success)
            {
                return Ok(new { success = true, message = "User behavior data deleted successfully" });
            }
            else
            {
                return this.StandardBadRequest("Failed to delete user behavior data");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete user behavior data for {UserId}", userId);
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
            var success = await _analyticsService.AnonymizeUserDataAsync(userId);
            
            if (success)
            {
                return Ok(new { success = true, message = "User behavior data anonymized successfully" });
            }
            else
            {
                return this.StandardBadRequest("Failed to anonymize user behavior data");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to anonymize user behavior data for {UserId}", userId);
            return this.StandardBadRequest(ex.Message);
        }
    }
    
    /// <summary>
    /// Trigger manual cleanup of old data
    /// </summary>
    [HttpPost("maintenance/cleanup")]
    public async Task<IActionResult> CleanupOldData([FromBody] DataCleanupRequest request)
    {
        try
        {
            var cleanedCount = await _analyticsService.CleanupOldDataAsync(request.CutoffDate);
            return Ok(new { success = true, cleanedRecords = cleanedCount });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to cleanup old behavior data");
            return this.StandardBadRequest(ex.Message);
        }
    }
    
    private async Task<UserBehaviorEvent> MapRequestToEvent(UserBehaviorEventRequest request)
    {
        var behaviorEvent = new UserBehaviorEvent
        {
            EventType = request.EventType,
            Category = request.Category,
            UserId = request.UserId,
            SessionId = request.SessionId,
            DeviceId = request.DeviceId,
            ClientTimestamp = request.ClientTimestamp,
            PageUrl = request.PageUrl,
            Referrer = request.Referrer,
            ElementSelector = request.ElementSelector,
            ElementText = request.ElementText,
            TimeOnPage = request.TimeOnPage,
            ScrollDepth = request.ScrollDepth,
            MouseX = request.MouseX,
            MouseY = request.MouseY,
            SearchQuery = request.SearchQuery,
            SearchResultCount = request.SearchResultCount,
            ContentId = request.ContentId,
            ContentType = request.ContentType,
            ContentCategory = request.ContentCategory,
            InteractionDuration = request.InteractionDuration,
            FormCompletionPercentage = request.FormCompletionPercentage,
            FormFieldName = request.FormFieldName,
            ErrorMessage = request.ErrorMessage,
            ErrorCode = request.ErrorCode,
            Properties = request.Properties ?? "{}",
            ScreenResolution = request.ScreenResolution,
            ViewportSize = request.ViewportSize,
            EventValue = request.EventValue,
            Currency = request.Currency,
            ExperimentId = request.ExperimentId,
            ExperimentVariant = request.ExperimentVariant,
            SdkVersion = request.SdkVersion,
            HasConsent = request.HasConsent,
            ConsentCategories = request.ConsentCategories
        };
        
        // Enrich with server-side data
        var clientIP = HttpContext.Connection.RemoteIpAddress?.ToString();
        var userAgent = HttpContext.Request.Headers["User-Agent"].ToString();
        
        behaviorEvent = await _analyticsService.EnrichEventAsync(behaviorEvent, clientIP, userAgent);
        
        return behaviorEvent;
    }
}

/// <summary>
/// Request model for tracking user behavior events
/// </summary>
public class UserBehaviorEventRequest
{
    [Required, MaxLength(100)]
    public string EventType { get; set; } = string.Empty;
    
    [Required, MaxLength(50)]
    public string Category { get; set; } = string.Empty;
    
    [MaxLength(100)]
    public string? UserId { get; set; }
    
    [Required, MaxLength(100)]
    public string SessionId { get; set; } = string.Empty;
    
    [MaxLength(100)]
    public string? DeviceId { get; set; }
    
    public DateTime ClientTimestamp { get; set; } = DateTime.UtcNow;
    
    [MaxLength(500)]
    public string? PageUrl { get; set; }
    
    [MaxLength(500)]
    public string? Referrer { get; set; }
    
    [MaxLength(200)]
    public string? ElementSelector { get; set; }
    
    [MaxLength(500)]
    public string? ElementText { get; set; }
    
    public int? TimeOnPage { get; set; }
    
    public decimal? ScrollDepth { get; set; }
    
    public int? MouseX { get; set; }
    
    public int? MouseY { get; set; }
    
    [MaxLength(500)]
    public string? SearchQuery { get; set; }
    
    public int? SearchResultCount { get; set; }
    
    [MaxLength(100)]
    public string? ContentId { get; set; }
    
    [MaxLength(50)]
    public string? ContentType { get; set; }
    
    [MaxLength(100)]
    public string? ContentCategory { get; set; }
    
    public int? InteractionDuration { get; set; }
    
    public decimal? FormCompletionPercentage { get; set; }
    
    [MaxLength(100)]
    public string? FormFieldName { get; set; }
    
    [MaxLength(500)]
    public string? ErrorMessage { get; set; }
    
    [MaxLength(50)]
    public string? ErrorCode { get; set; }
    
    public string? Properties { get; set; }
    
    [MaxLength(20)]
    public string? ScreenResolution { get; set; }
    
    [MaxLength(20)]
    public string? ViewportSize { get; set; }
    
    public decimal? EventValue { get; set; }
    
    [MaxLength(10)]
    public string? Currency { get; set; }
    
    public Guid? ExperimentId { get; set; }
    
    [MaxLength(50)]
    public string? ExperimentVariant { get; set; }
    
    [MaxLength(20)]
    public string? SdkVersion { get; set; }
    
    public bool HasConsent { get; set; } = false;
    
    [MaxLength(200)]
    public string? ConsentCategories { get; set; }
}

/// <summary>
/// Request model for funnel analysis
/// </summary>
public class FunnelAnalysisRequest
{
    [Required, MaxLength(200)]
    public string FunnelName { get; set; } = string.Empty;
    
    [Required]
    public IEnumerable<string> EventTypes { get; set; } = new List<string>();
    
    [Required]
    public DateTime StartDate { get; set; }
    
    [Required]
    public DateTime EndDate { get; set; }
}

/// <summary>
/// Request model for insight calculation
/// </summary>
public class InsightCalculationRequest
{
    [Required]
    public DateTime StartDate { get; set; }
    
    [Required]
    public DateTime EndDate { get; set; }
}

/// <summary>
/// Request model for data cleanup
/// </summary>
public class DataCleanupRequest
{
    [Required]
    public DateTime CutoffDate { get; set; }
}