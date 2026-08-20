using GeoLeap.Api.Models.GrowthAnalytics;
using GeoLeap.Api.Services.GrowthAnalytics;
using GeoLeap.Api.Extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.ComponentModel.DataAnnotations;

namespace GeoLeap.Api.Controllers;

/// <summary>
/// Growth Analytics tracking and reporting API
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize] // Require authentication for analytics access
public class GrowthAnalyticsController : ControllerBase
{
    private readonly IGrowthTrackingService _trackingService;
    private readonly IAttributionService _attributionService;
    private readonly ILogger<GrowthAnalyticsController> _logger;
    
    public GrowthAnalyticsController(
        IGrowthTrackingService trackingService,
        IAttributionService attributionService,
        ILogger<GrowthAnalyticsController> logger)
    {
        _trackingService = trackingService;
        _attributionService = attributionService;
        _logger = logger;
    }
    
    /// <summary>
    /// Track a single growth event
    /// </summary>
    [HttpPost("events")]
    [AllowAnonymous] // Allow anonymous tracking for public events
    public async Task<IActionResult> TrackEvent([FromBody] GrowthEventRequest request)
    {
        try
        {
            var growthEvent = await MapRequestToEvent(request);
            var success = await _trackingService.TrackEventAsync(growthEvent);
            
            if (success)
            {
                return Ok(new { success = true, eventId = growthEvent.Id });
            }
            else
            {
                return this.StandardBadRequest("Failed to track event");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to track growth event");
            return this.StandardBadRequest(ex.Message);
        }
    }
    
    /// <summary>
    /// Batch track multiple events (high performance)
    /// </summary>
    [HttpPost("events/batch")]
    [AllowAnonymous] // Allow anonymous batch tracking
    public async Task<IActionResult> TrackEvents([FromBody] IEnumerable<GrowthEventRequest> requests)
    {
        try
        {
            var events = new List<GrowthEvent>();
            foreach (var request in requests)
            {
                var growthEvent = await MapRequestToEvent(request);
                events.Add(growthEvent);
            }
            
            var tracked = await _trackingService.TrackEventsAsync(events);
            
            return Ok(new { success = true, trackedCount = tracked, totalCount = events.Count });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to batch track growth events");
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
            var stats = await _trackingService.GetProcessingStatsAsync();
            return Ok(stats);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get processing stats");
            return this.StandardBadRequest(ex.Message);
        }
    }
    
    /// <summary>
    /// Get attribution analysis for a conversion event
    /// </summary>
    [HttpGet("attribution/{conversionEventId}")]
    public async Task<IActionResult> GetAttribution(Guid conversionEventId, [FromQuery] Guid? modelId = null)
    {
        try
        {
            var attribution = await _attributionService.CalculateAttributionAsync(conversionEventId, modelId);
            return Ok(attribution);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to calculate attribution for event {EventId}", conversionEventId);
            return this.StandardBadRequest(ex.Message);
        }
    }
    
    /// <summary>
    /// Get attribution summary for a time period
    /// </summary>
    [HttpGet("attribution/summary")]
    public async Task<IActionResult> GetAttributionSummary(
        [FromQuery, Required] DateTime startDate,
        [FromQuery, Required] DateTime endDate,
        [FromQuery] Guid? modelId = null)
    {
        try
        {
            if (startDate >= endDate)
            {
                return this.StandardBadRequest("Start date must be before end date");
            }

            if ((endDate - startDate).TotalDays > 365)
            {
                return this.StandardBadRequest("Date range cannot exceed 365 days");
            }
            
            var summary = await _attributionService.GetAttributionSummaryAsync(startDate, endDate, modelId);
            return Ok(summary);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get attribution summary");
            return this.StandardBadRequest(ex.Message);
        }
    }
    
    /// <summary>
    /// Get channel performance metrics
    /// </summary>
    [HttpGet("channels/performance")]
    public async Task<IActionResult> GetChannelPerformance(
        [FromQuery, Required] DateTime startDate,
        [FromQuery, Required] DateTime endDate,
        [FromQuery] Guid? modelId = null)
    {
        try
        {
            var performance = await _attributionService.GetChannelPerformanceAsync(startDate, endDate, modelId);
            return Ok(performance);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get channel performance");
            return this.StandardBadRequest(ex.Message);
        }
    }
    
    /// <summary>
    /// Compare attribution models
    /// </summary>
    [HttpPost("attribution/compare")]
    public async Task<IActionResult> CompareAttributionModels([FromBody] AttributionComparisonRequest request)
    {
        try
        {
            if (request.StartDate >= request.EndDate)
            {
                return this.StandardBadRequest("Start date must be before end date");
            }
            
            var comparison = await _attributionService.CompareAttributionModelsAsync(
                request.StartDate, request.EndDate, request.ModelIds);
            return Ok(comparison);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to compare attribution models");
            return this.StandardBadRequest(ex.Message);
        }
    }
    
    /// <summary>
    /// Get all attribution models
    /// </summary>
    [HttpGet("attribution/models")]
    public async Task<IActionResult> GetAttributionModels()
    {
        try
        {
            var models = await _attributionService.GetAttributionModelsAsync();
            return Ok(models);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get attribution models");
            return this.StandardBadRequest(ex.Message);
        }
    }
    
    /// <summary>
    /// Create a new attribution model
    /// </summary>
    [HttpPost("attribution/models")]
    public async Task<IActionResult> CreateAttributionModel([FromBody] AttributionModel model)
    {
        try
        {
            var created = await _attributionService.CreateAttributionModelAsync(model);
            return CreatedAtAction(nameof(GetAttributionModels), new { id = created.Id }, created);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create attribution model");
            return this.StandardBadRequest(ex.Message);
        }
    }
    
    /// <summary>
    /// Get user journey leading to conversion
    /// </summary>
    [HttpGet("journey/{userId}")]
    public async Task<IActionResult> GetUserJourney(string userId, [FromQuery] DateTime conversionDate, [FromQuery] int lookbackDays = 30)
    {
        try
        {
            var journey = await _attributionService.GetUserJourneyAsync(userId, conversionDate, lookbackDays);
            return Ok(journey);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get user journey for {UserId}", userId);
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
            var success = await _trackingService.DeleteUserDataAsync(userId);
            
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
            var success = await _trackingService.AnonymizeUserDataAsync(userId);
            
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
    
    private async Task<GrowthEvent> MapRequestToEvent(GrowthEventRequest request)
    {
        var growthEvent = new GrowthEvent
        {
            EventName = request.EventName,
            Category = request.Category,
            UserId = request.UserId,
            SessionId = request.SessionId,
            DeviceId = request.DeviceId,
            ClientTimestamp = request.ClientTimestamp,
            Properties = request.Properties ?? "{}",
            UtmSource = request.UtmSource,
            UtmMedium = request.UtmMedium,
            UtmCampaign = request.UtmCampaign,
            UtmTerm = request.UtmTerm,
            UtmContent = request.UtmContent,
            Referrer = request.Referrer,
            LandingPage = request.LandingPage,
            ScreenResolution = request.ScreenResolution,
            ViewportSize = request.ViewportSize,
            EventValue = request.EventValue,
            Currency = request.Currency,
            SdkVersion = request.SdkVersion,
            HasConsent = request.HasConsent,
            ConsentCategories = request.ConsentCategories
        };
        
        // Enrich with server-side data
        var clientIP = HttpContext.Connection.RemoteIpAddress?.ToString();
        var userAgent = HttpContext.Request.Headers["User-Agent"].ToString();
        
        growthEvent = await _trackingService.EnrichEventAsync(growthEvent, clientIP, userAgent);
        
        return growthEvent;
    }
}

/// <summary>
/// Request model for tracking growth events
/// </summary>
public class GrowthEventRequest
{
    [Required, MaxLength(100)]
    public string EventName { get; set; } = string.Empty;
    
    [Required, MaxLength(50)]
    public string Category { get; set; } = string.Empty;
    
    [MaxLength(100)]
    public string? UserId { get; set; }
    
    [Required, MaxLength(100)]
    public string SessionId { get; set; } = string.Empty;
    
    [MaxLength(100)]
    public string? DeviceId { get; set; }
    
    public DateTime ClientTimestamp { get; set; } = DateTime.UtcNow;
    
    public string? Properties { get; set; }
    
    [MaxLength(200)]
    public string? UtmSource { get; set; }
    
    [MaxLength(200)]
    public string? UtmMedium { get; set; }
    
    [MaxLength(200)]
    public string? UtmCampaign { get; set; }
    
    [MaxLength(200)]
    public string? UtmTerm { get; set; }
    
    [MaxLength(200)]
    public string? UtmContent { get; set; }
    
    [MaxLength(500)]
    public string? Referrer { get; set; }
    
    [MaxLength(500)]
    public string? LandingPage { get; set; }
    
    [MaxLength(20)]
    public string? ScreenResolution { get; set; }
    
    [MaxLength(20)]
    public string? ViewportSize { get; set; }
    
    public decimal? EventValue { get; set; }
    
    [MaxLength(10)]
    public string? Currency { get; set; }
    
    [MaxLength(20)]
    public string? SdkVersion { get; set; }
    
    public bool HasConsent { get; set; } = false;
    
    [MaxLength(200)]
    public string? ConsentCategories { get; set; }
}

/// <summary>
/// Request model for attribution model comparison
/// </summary>
public class AttributionComparisonRequest
{
    [Required]
    public DateTime StartDate { get; set; }
    
    [Required]
    public DateTime EndDate { get; set; }
    
    [Required]
    public IEnumerable<Guid> ModelIds { get; set; } = new List<Guid>();
}