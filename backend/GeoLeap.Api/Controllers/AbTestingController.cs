using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using GeoLeap.Api.Services.GrowthAnalytics;
using GeoLeap.Api.Models.GrowthAnalytics;
using GeoLeap.Api.Extensions;

namespace GeoLeap.Api.Controllers;

/// <summary>
/// A/B testing and experimentation endpoints for US-7.5
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AbTestingController : ControllerBase
{
    private readonly IAbTestingService _abTestingService;
    private readonly ILogger<AbTestingController> _logger;
    
    public AbTestingController(IAbTestingService abTestingService, ILogger<AbTestingController> logger)
    {
        _abTestingService = abTestingService;
        _logger = logger;
    }
    
    /// <summary>
    /// Create a new A/B test experiment
    /// </summary>
    [HttpPost("experiments")]
    public async Task<IActionResult> CreateExperiment([FromBody] AbTestExperiment experiment)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return this.StandardBadRequest("Invalid request");
            }

            var result = await _abTestingService.CreateExperimentAsync(experiment);
            return CreatedAtAction(nameof(GetExperimentResults), new { id = result.Id }, result);
        }
        catch (ArgumentException ex)
        {
            return this.StandardBadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create A/B test experiment");
            return StatusCode(500, "Failed to create experiment");
        }
    }
    
    /// <summary>
    /// Get user's assignment for an experiment
    /// </summary>
    [HttpGet("experiments/{experimentId:guid}/assignment")]
    public async Task<IActionResult> GetUserAssignment(Guid experimentId, [FromQuery] string? userId = null)
    {
        try
        {
            // Use authenticated user ID if not provided
            userId ??= User.Identity?.Name ?? "anonymous";
            
            var assignment = await _abTestingService.AssignUserToVariantAsync(experimentId, userId);
            
            if (assignment == null)
            {
                return Ok(new { assigned = false, message = "User not in experiment traffic" });
            }
            
            return Ok(new { 
                assigned = true, 
                experimentId = assignment.ExperimentId,
                variantId = assignment.VariantId,
                assignedAt = assignment.AssignedAt
            });
        }
        catch (ArgumentException ex)
        {
            return this.StandardBadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get user assignment for experiment {ExperimentId}", experimentId);
            return StatusCode(500, "Failed to get assignment");
        }
    }
    
    /// <summary>
    /// Track conversion event for A/B test
    /// </summary>
    [HttpPost("experiments/{experimentId:guid}/conversions")]
    public async Task<IActionResult> TrackConversion(
        Guid experimentId, 
        [FromBody] ConversionRequest request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return this.StandardBadRequest("Invalid request");
            }

            var userId = request.UserId ?? User.Identity?.Name ?? "anonymous";
            
            var tracked = await _abTestingService.TrackConversionAsync(
                experimentId, 
                userId, 
                request.ConversionEvent, 
                request.Value);
            
            return Ok(new { tracked, userId, conversionEvent = request.ConversionEvent });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to track conversion for experiment {ExperimentId}", experimentId);
            return StatusCode(500, "Failed to track conversion");
        }
    }
    
    /// <summary>
    /// Get experiment results and statistics
    /// </summary>
    [HttpGet("experiments/{experimentId:guid}/results")]
    public async Task<IActionResult> GetExperimentResults(Guid experimentId)
    {
        try
        {
            var results = await _abTestingService.GetExperimentResultsAsync(experimentId);
            return Ok(results);
        }
        catch (ArgumentException ex)
        {
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get results for experiment {ExperimentId}", experimentId);
            return StatusCode(500, "Failed to get experiment results");
        }
    }
    
    /// <summary>
    /// Get all active experiments
    /// </summary>
    [HttpGet("experiments/active")]
    public async Task<IActionResult> GetActiveExperiments()
    {
        try
        {
            var experiments = await _abTestingService.GetActiveExperimentsAsync();
            return Ok(experiments);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get active experiments");
            return StatusCode(500, "Failed to get active experiments");
        }
    }
    
    /// <summary>
    /// Update experiment status
    /// </summary>
    [HttpPatch("experiments/{experimentId:guid}/status")]
    public async Task<IActionResult> UpdateExperimentStatus(
        Guid experimentId, 
        [FromBody] ExperimentStatusRequest request)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return this.StandardBadRequest("Invalid request");
            }

            var updated = await _abTestingService.UpdateExperimentStatusAsync(experimentId, request.Status);
            
            if (!updated)
            {
                return NotFound("Experiment not found");
            }
            
            return Ok(new { experimentId, status = request.Status, updatedAt = DateTime.UtcNow });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update experiment {ExperimentId} status", experimentId);
            return StatusCode(500, "Failed to update experiment status");
        }
    }
}

/// <summary>
/// Request model for tracking conversions
/// </summary>
public class ConversionRequest
{
    public string? UserId { get; set; }
    public string ConversionEvent { get; set; } = string.Empty;
    public decimal? Value { get; set; }
}

/// <summary>
/// Request model for updating experiment status
/// </summary>
public class ExperimentStatusRequest
{
    public ExperimentStatus Status { get; set; }
}