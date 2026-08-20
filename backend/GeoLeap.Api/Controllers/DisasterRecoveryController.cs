using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using GeoLeap.Api.Services;

namespace GeoLeap.Api.Controllers;

[Authorize(Roles = "Admin")]
[ApiController]
[Route("api/admin/disaster-recovery")]
public class DisasterRecoveryController : ControllerBase
{
    private readonly IDisasterRecoveryService _disasterRecoveryService;
    private readonly ILogger<DisasterRecoveryController> _logger;

    public DisasterRecoveryController(IDisasterRecoveryService disasterRecoveryService, ILogger<DisasterRecoveryController> logger)
    {
        _disasterRecoveryService = disasterRecoveryService;
        _logger = logger;
    }

    [HttpPost("point-in-time")]
    public async Task<IActionResult> PerformPointInTimeRecovery([FromBody] PointInTimeRecoveryRequest request)
    {
        try
        {
            _logger.LogInformation("Starting point-in-time recovery to: {RecoveryPoint}", request.RecoveryPoint);
            var result = await _disasterRecoveryService.PerformPointInTimeRecoveryAsync(request);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Point-in-time recovery failed");
            return StatusCode(500, new { message = "Point-in-time recovery failed", error = ex.Message });
        }
    }

    [HttpPost("export")]
    public async Task<IActionResult> ExportCriticalData([FromBody] DataExportRequest request)
    {
        try
        {
            _logger.LogInformation("Exporting critical data");
            var result = await _disasterRecoveryService.ExportCriticalDataAsync(request);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Critical data export failed");
            return StatusCode(500, new { message = "Critical data export failed", error = ex.Message });
        }
    }

    [HttpGet("health-check")]
    public async Task<IActionResult> PerformSystemHealthCheck()
    {
        try
        {
            _logger.LogInformation("Performing system health check");
            var result = await _disasterRecoveryService.PerformSystemHealthCheckAsync();
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "System health check failed");
            return StatusCode(500, new { message = "System health check failed", error = ex.Message });
        }
    }

    [HttpGet("consistency-check")]
    public async Task<IActionResult> PerformConsistencyCheck()
    {
        try
        {
            _logger.LogInformation("Performing database consistency check");
            var result = await _disasterRecoveryService.PerformConsistencyCheckAsync();
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Consistency check failed");
            return StatusCode(500, new { message = "Consistency check failed", error = ex.Message });
        }
    }

    [HttpPost("test")]
    public async Task<IActionResult> PerformRecoveryTest([FromBody] RecoveryTestRequest request)
    {
        try
        {
            _logger.LogInformation("Performing recovery test: {TestType}", request.TestType);
            var result = await _disasterRecoveryService.PerformRecoveryTestAsync(request);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Recovery test failed");
            return StatusCode(500, new { message = "Recovery test failed", error = ex.Message });
        }
    }

    [HttpPost("replicate")]
    public async Task<IActionResult> ReplicateData([FromBody] ReplicationRequest request)
    {
        try
        {
            _logger.LogInformation("Starting data replication to: {TargetRegion}", request.TargetRegion);
            var result = await _disasterRecoveryService.ReplicateDataAsync(request);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Data replication failed");
            return StatusCode(500, new { message = "Data replication failed", error = ex.Message });
        }
    }

    [HttpPost("emergency-shutdown")]
    public async Task<IActionResult> PerformEmergencyShutdown([FromBody] EmergencyShutdownRequest request)
    {
        try
        {
            _logger.LogWarning("Emergency shutdown requested. Reason: {Reason}", request.Reason);
            var result = await _disasterRecoveryService.PerformEmergencyShutdownAsync(request);
            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Emergency shutdown failed");
            return StatusCode(500, new { message = "Emergency shutdown failed", error = ex.Message });
        }
    }
}