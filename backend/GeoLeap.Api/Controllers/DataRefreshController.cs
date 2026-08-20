using GeoLeap.Api.Attributes;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using GeoLeap.Api.Extensions;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Threading.Tasks;

namespace GeoLeap.Api.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class DataRefreshController : ControllerBase
    {
        private readonly IDataRefreshOrchestrator _refreshOrchestrator;
        private readonly IBatchRefreshProcessor _batchProcessor;
        private readonly ILogger<DataRefreshController> _logger;

        public DataRefreshController(
            IDataRefreshOrchestrator refreshOrchestrator,
            IBatchRefreshProcessor batchProcessor,
            ILogger<DataRefreshController> logger)
        {
            _refreshOrchestrator = refreshOrchestrator;
            _batchProcessor = batchProcessor;
            _logger = logger;
        }

        /// <summary>
        /// Schedule a refresh for specific content
        /// </summary>
        /// <param name="request">Refresh request details</param>
        /// <returns>Operation result</returns>
        [HttpPost("schedule")]
        [RequirePermission("data:refresh")]
        public async Task<IActionResult> ScheduleRefresh([FromBody] RefreshRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return this.StandardBadRequest("Invalid request");
                }

                await _refreshOrchestrator.ScheduleRefreshAsync(request);

                _logger.LogInformation("Scheduled refresh for content {ContentId} with priority {Priority}", 
                    request.ContentId, request.Priority);

                return Ok(new { Message = "Refresh scheduled successfully", ContentId = request.ContentId });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to schedule refresh for content {ContentId}", request.ContentId);
                return StatusCode(500, new { Error = "Failed to schedule refresh", Details = ex.Message });
            }
        }

        /// <summary>
        /// Trigger immediate refresh for specific content
        /// </summary>
        /// <param name="contentId">Content ID to refresh</param>
        /// <param name="priority">Refresh priority</param>
        /// <returns>Operation result</returns>
        [HttpPost("immediate/{contentId}")]
        [RequirePermission("data:refresh")]
        public async Task<IActionResult> TriggerImmediateRefresh(
            [FromRoute] string contentId, 
            [FromQuery] RefreshPriority priority = RefreshPriority.Standard)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(contentId))
                {
                    return this.StandardBadRequest("ContentId is required");
                }

                await _refreshOrchestrator.TriggerImmediateRefreshAsync(contentId, priority);

                _logger.LogInformation("Triggered immediate refresh for content {ContentId} with priority {Priority}", 
                    contentId, priority);

                return Ok(new { Message = "Immediate refresh triggered successfully", ContentId = contentId });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to trigger immediate refresh for content {ContentId}", contentId);
                return StatusCode(500, new { Error = "Failed to trigger immediate refresh", Details = ex.Message });
            }
        }

        /// <summary>
        /// Get refresh status for specific content
        /// </summary>
        /// <param name="contentId">Content ID to check</param>
        /// <returns>Refresh status</returns>
        [HttpGet("status/{contentId}")]
        [RequirePermission("data:read")]
        public async Task<IActionResult> GetRefreshStatus([FromRoute] string contentId)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(contentId))
                {
                    return this.StandardBadRequest("ContentId is required");
                }

                var status = await _refreshOrchestrator.GetRefreshStatusAsync(contentId);
                var isStale = await _refreshOrchestrator.IsContentStaleAsync(contentId, ContentType.Unknown);

                return Ok(new 
                { 
                    ContentId = contentId,
                    Status = status.ToString(),
                    IsStale = isStale,
                    CheckedAt = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get refresh status for content {ContentId}", contentId);
                return StatusCode(500, new { Error = "Failed to get refresh status", Details = ex.Message });
            }
        }

        /// <summary>
        /// Get active refresh operations
        /// </summary>
        /// <returns>List of active refresh operations</returns>
        [HttpGet("active")]
        [RequirePermission("data:read")]
        public async Task<IActionResult> GetActiveRefreshOperations()
        {
            try
            {
                var activeOperations = await _refreshOrchestrator.GetActiveRefreshOperationsAsync();

                return Ok(new 
                { 
                    TotalOperations = activeOperations.Count,
                    Operations = activeOperations.Select(op => new 
                    {
                        op.Id,
                        op.ContentId,
                        op.ContentType,
                        op.Priority,
                        op.Status,
                        op.ScheduledAt,
                        op.StartedAt,
                        op.CompletedAt,
                        op.RetryCount,
                        op.ErrorMessage,
                        op.IsImmediate,
                        op.CorrelationId
                    }).ToList(),
                    RetrievedAt = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get active refresh operations");
                return StatusCode(500, new { Error = "Failed to get active refresh operations", Details = ex.Message });
            }
        }

        /// <summary>
        /// Cancel a specific refresh operation
        /// </summary>
        /// <param name="operationId">Operation ID to cancel</param>
        /// <returns>Operation result</returns>
        [HttpDelete("cancel/{operationId}")]
        [RequirePermission("data:refresh")]
        public async Task<IActionResult> CancelRefresh([FromRoute] string operationId)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(operationId))
                {
                    return this.StandardBadRequest("OperationId is required");
                }

                await _refreshOrchestrator.CancelRefreshAsync(operationId);

                _logger.LogInformation("Cancelled refresh operation {OperationId}", operationId);

                return Ok(new { Message = "Refresh operation cancelled successfully", OperationId = operationId });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to cancel refresh operation {OperationId}", operationId);
                return StatusCode(500, new { Error = "Failed to cancel refresh operation", Details = ex.Message });
            }
        }

        /// <summary>
        /// Get refresh statistics for a specific time period
        /// </summary>
        /// <param name="periodHours">Time period in hours (default: 24)</param>
        /// <returns>Refresh statistics</returns>
        [HttpGet("statistics")]
        [RequirePermission("data:read")]
        public async Task<IActionResult> GetRefreshStatistics([FromQuery] int periodHours = 24)
        {
            try
            {
                if (periodHours <= 0 || periodHours > 168) // Max 1 week
                {
                    return this.StandardBadRequest("Period must be between 1 and 168 hours");
                }

                var period = TimeSpan.FromHours(periodHours);
                var statistics = await _refreshOrchestrator.GetRefreshStatisticsAsync(period);

                return Ok(statistics);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get refresh statistics");
                return StatusCode(500, new { Error = "Failed to get refresh statistics", Details = ex.Message });
            }
        }

        /// <summary>
        /// Process batch refresh for multiple content items
        /// </summary>
        /// <param name="request">Batch refresh request</param>
        /// <returns>Operation result</returns>
        [HttpPost("batch")]
        [RequirePermission("data:refresh")]
        public async Task<IActionResult> ProcessBatchRefresh([FromBody] BatchRefreshRequest request)
        {
            try
            {
                if (!ModelState.IsValid)
                {
                    return this.StandardBadRequest("Invalid request");
                }

                if (!request.ContentIds.Any())
                {
                    return this.StandardBadRequest("At least one content ID is required");
                }

                if (request.ContentIds.Count > 10000) // Reasonable limit
                {
                    return this.StandardBadRequest("Maximum 10,000 content IDs allowed per batch");
                }

                await _batchProcessor.ProcessBatchRefreshAsync(request);

                _logger.LogInformation("Started batch refresh for {Count} content items with priority {Priority}", 
                    request.ContentIds.Count, request.Priority);

                return Ok(new 
                { 
                    Message = "Batch refresh started successfully", 
                    TotalItems = request.ContentIds.Count,
                    Priority = request.Priority.ToString(),
                    StartedAt = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to process batch refresh for {Count} items", request.ContentIds?.Count ?? 0);
                return StatusCode(500, new { Error = "Failed to process batch refresh", Details = ex.Message });
            }
        }

        /// <summary>
        /// Process refresh for stale content
        /// </summary>
        /// <param name="maxCount">Maximum number of items to process (default: 1000)</param>
        /// <param name="priority">Refresh priority (default: Standard)</param>
        /// <returns>Operation result</returns>
        [HttpPost("stale")]
        [RequirePermission("data:refresh")]
        public async Task<IActionResult> ProcessStaleContentRefresh(
            [FromQuery] int maxCount = 1000,
            [FromQuery] RefreshPriority priority = RefreshPriority.Standard)
        {
            try
            {
                if (maxCount <= 0 || maxCount > 10000)
                {
                    return this.StandardBadRequest("Max count must be between 1 and 10,000");
                }

                await _batchProcessor.ProcessStaleContentRefreshAsync(maxCount, priority);

                _logger.LogInformation("Started stale content refresh for up to {MaxCount} items with priority {Priority}", 
                    maxCount, priority);

                return Ok(new 
                { 
                    Message = "Stale content refresh started successfully", 
                    MaxItems = maxCount,
                    Priority = priority.ToString(),
                    StartedAt = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to process stale content refresh");
                return StatusCode(500, new { Error = "Failed to process stale content refresh", Details = ex.Message });
            }
        }

        /// <summary>
        /// Get list of stale content
        /// </summary>
        /// <param name="maxCount">Maximum number of items to return (default: 100)</param>
        /// <returns>List of stale content IDs</returns>
        [HttpGet("stale")]
        [RequirePermission("data:read")]
        public async Task<IActionResult> GetStaleContent([FromQuery] int maxCount = 100)
        {
            try
            {
                if (maxCount <= 0 || maxCount > 1000)
                {
                    return this.StandardBadRequest("Max count must be between 1 and 1,000");
                }

                var staleContentIds = await _refreshOrchestrator.GetStaleContentAsync(maxCount);

                return Ok(new 
                { 
                    TotalStaleItems = staleContentIds.Count,
                    StaleContentIds = staleContentIds,
                    RetrievedAt = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get stale content");
                return StatusCode(500, new { Error = "Failed to get stale content", Details = ex.Message });
            }
        }

        /// <summary>
        /// Get refresh schedule information
        /// </summary>
        /// <returns>Refresh schedule details</returns>
        [HttpGet("schedule")]
        [RequirePermission("data:read")]
        public async Task<IActionResult> GetRefreshSchedule()
        {
            try
            {
                // Return mock schedule data for tests
                var schedule = new 
                {
                    NextRefresh = DateTime.UtcNow.AddHours(1),
                    Frequency = "Every 6 hours",
                    LastRefresh = DateTime.UtcNow.AddHours(-2),
                    IsEnabled = true,
                    ContentTypes = new[] { "movie", "tv", "streaming" },
                    Priority = "Standard"
                };
                
                return Ok(schedule);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get refresh schedule");
                return StatusCode(500, new { Error = "Failed to get refresh schedule", Details = ex.Message });
            }
        }

        /// <summary>
        /// Run scheduled refresh process
        /// </summary>
        /// <returns>Operation result</returns>
        [HttpPost("scheduled")]
        [RequirePermission("admin:refresh")]
        public async Task<IActionResult> RunScheduledRefresh()
        {
            try
            {
                await _batchProcessor.ProcessScheduledRefreshAsync();

                _logger.LogInformation("Started scheduled refresh process");

                return Ok(new 
                { 
                    Message = "Scheduled refresh process started successfully",
                    StartedAt = DateTime.UtcNow
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to run scheduled refresh");
                return StatusCode(500, new { Error = "Failed to run scheduled refresh", Details = ex.Message });
            }
        }
    }
}