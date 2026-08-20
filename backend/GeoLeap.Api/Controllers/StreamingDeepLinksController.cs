using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using GeoLeap.Api.Services;
using GeoLeap.Api.Models;
using GeoLeap.Api.Extensions;

namespace GeoLeap.Api.Controllers
{
    /// <summary>
    /// Controller for streaming deep link generation and tracking
    /// </summary>
    [ApiController]
    [Route("api/streaming/deeplinks")]
    public class StreamingDeepLinksController : ControllerBase
    {
        private readonly IStreamingDeepLinkService _deepLinkService;
        private readonly ILogger<StreamingDeepLinksController> _logger;

        public StreamingDeepLinksController(
            IStreamingDeepLinkService deepLinkService,
            ILogger<StreamingDeepLinksController> logger)
        {
            _deepLinkService = deepLinkService;
            _logger = logger;
        }

        /// <summary>
        /// Generate a deep link for streaming content
        /// </summary>
        [HttpPost("generate")]
        [Authorize]
        public async Task<ActionResult<DeepLinkGenerationResponse>> GenerateDeepLink([FromBody] DeepLinkGenerationRequest request)
        {
            try
            {
                _logger.LogInformation("Generating deep link for {Service} - {ContentId}", 
                    request.StreamingService, request.ContentId);

                var result = await _deepLinkService.GenerateDeepLinkAsync(request);
                
                if (!result.Success)
                {
                    return BadRequest(result);
                }

                return Ok(result);
            }
            catch (ArgumentException ex)
            {
                _logger.LogWarning(ex, "Invalid request for deep link generation");
                return this.StandardBadRequest(ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating deep link");
                return StatusCode(500, new { Error = "Internal server error" });
            }
        }

        /// <summary>
        /// Track link click analytics
        /// </summary>
        [HttpPost("track-click")]
        [AllowAnonymous]
        public async Task<ActionResult> TrackClick([FromBody] LinkClickTrackingRequest request)
        {
            try
            {
                _logger.LogInformation("Tracking click for link {LinkId}", request.LinkId);

                var success = await _deepLinkService.TrackLinkClickAsync(request);
                
                if (!success)
                {
                    return this.StandardBadRequest("Failed to track click");
                }

                return Ok(new { Success = true, Message = "Click tracked successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error tracking click for link {LinkId}", request.LinkId);
                return StatusCode(500, new { Error = "Internal server error" });
            }
        }

        /// <summary>
        /// Track link performance metrics
        /// </summary>
        [HttpPost("track-performance")]
        [AllowAnonymous]
        public async Task<ActionResult> TrackPerformance([FromBody] LinkPerformanceTrackingRequest request)
        {
            try
            {
                _logger.LogInformation("Tracking performance for link {LinkId}", request.LinkId);

                var success = await _deepLinkService.TrackLinkPerformanceAsync(request);
                
                if (!success)
                {
                    return this.StandardBadRequest("Failed to track performance");
                }

                return Ok(new { Success = true, Message = "Performance tracked successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error tracking performance for link {LinkId}", request.LinkId);
                return StatusCode(500, new { Error = "Internal server error" });
            }
        }

        /// <summary>
        /// Get link analytics data
        /// </summary>
        [HttpGet("analytics")]
        [Authorize]
        public async Task<ActionResult<AnalyticsDataResponse>> GetAnalytics(
            [FromQuery] string? dateRange = null,
            [FromQuery] string? vpnProvider = null)
        {
            try
            {
                _logger.LogInformation("Getting analytics data for date range {DateRange}, VPN provider {VpnProvider}", 
                    dateRange, vpnProvider);

                var analytics = await _deepLinkService.GetLinkAnalyticsAsync(dateRange, vpnProvider);
                return Ok(analytics);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting analytics data");
                return StatusCode(500, new { Error = "Internal server error" });
            }
        }

        /// <summary>
        /// Generate analytics report
        /// </summary>
        [HttpPost("reports")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult> GenerateReport([FromBody] AnalyticsReportRequest request)
        {
            try
            {
                _logger.LogInformation("Generating analytics report for period {Start} to {End}", 
                    request.DateRange.Start, request.DateRange.End);

                var report = await _deepLinkService.GenerateAnalyticsReportAsync(request);
                return Ok(report);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating analytics report");
                return StatusCode(500, new { Error = "Internal server error" });
            }
        }
    }

}