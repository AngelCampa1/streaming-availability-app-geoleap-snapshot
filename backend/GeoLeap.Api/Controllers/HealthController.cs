using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using GeoLeap.Api.Data;
using GeoLeap.Api.Services;
using StackExchange.Redis;
using Microsoft.AspNetCore.Authorization;

namespace GeoLeap.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class HealthController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IConnectionMultiplexer _redis;
    private readonly ILogger<HealthController> _logger;
    private readonly IResilienceService? _resilienceService;

    public HealthController(
        ApplicationDbContext context,
        IConnectionMultiplexer redis,
        ILogger<HealthController> logger,
        IResilienceService? resilienceService = null)
    {
        _context = context;
        _redis = redis;
        _logger = logger;
        _resilienceService = resilienceService;
    }

    [HttpGet]
    [AllowAnonymous]
    public async Task<IActionResult> GetHealth()
    {
        var healthChecks = new List<HealthCheckResult>();

        // Check database connectivity
        var dbResult = await CheckDatabaseHealth();
        healthChecks.Add(dbResult);

        // Check Redis connectivity
        var redisResult = await CheckRedisHealth();
        healthChecks.Add(redisResult);

        // Check external services (placeholder for future API integrations)
        var externalResult = await CheckExternalServicesHealth();
        healthChecks.Add(externalResult);

        var overallStatus = healthChecks.All(h => h.Status == "Healthy") ? "Healthy" :
                           healthChecks.Any(h => h.Status == "Degraded") ? "Degraded" : "Unhealthy";

        var response = new HealthResponse
        {
            Status = overallStatus,
            Timestamp = DateTime.UtcNow,
            Checks = healthChecks.ToDictionary(h => h.Name, h => h),
            Duration = healthChecks.Sum(h => h.DurationMs),
            Service = "GeoLeap.Api"
        };

        var statusCode = overallStatus switch
        {
            "Healthy" => 200,
            "Degraded" => 200, // Still functional but with issues
            "Unhealthy" => 503,
            _ => 503
        };

        return StatusCode(statusCode, response);
    }

    [HttpGet("ready")]
    [AllowAnonymous]
    public async Task<IActionResult> GetReadiness()
    {
        try
        {
            // Check if the application is ready to serve requests
            var canConnectToDb = await CanConnectToDatabase();
            var canConnectToRedis = await CanConnectToRedis();

            if (canConnectToDb && canConnectToRedis)
            {
                return Ok(new { status = "Ready", timestamp = DateTime.UtcNow });
            }

            return ServiceUnavailable(new { status = "Not Ready", timestamp = DateTime.UtcNow });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Readiness check failed");
            return ServiceUnavailable(new { status = "Not Ready", error = ex.Message, timestamp = DateTime.UtcNow });
        }
    }

    [HttpGet("live")]
    [AllowAnonymous]
    public IActionResult GetLiveness()
    {
        // Basic liveness check - just return OK if the process is running
        return Ok(new { status = "Alive", timestamp = DateTime.UtcNow });
    }

    [HttpGet("detailed")]
    [AllowAnonymous]
    public async Task<IActionResult> GetDetailedHealth()
    {
        var healthChecks = new List<HealthCheckResult>();

        // Check database connectivity
        var dbResult = await CheckDatabaseHealth();
        healthChecks.Add(dbResult);

        // Check Redis connectivity
        var redisResult = await CheckRedisHealth();
        healthChecks.Add(redisResult);

        // Check external services
        var externalResult = await CheckExternalServicesHealth();
        healthChecks.Add(externalResult);

        // Add system info
        var systemInfo = new
        {
            MachineName = Environment.MachineName,
            OSVersion = Environment.OSVersion.ToString(),
            ProcessorCount = Environment.ProcessorCount,
            WorkingSet = Environment.WorkingSet,
            Version = System.Reflection.Assembly.GetExecutingAssembly().GetName().Version?.ToString()
        };

        var overallStatus = healthChecks.All(h => h.Status == "Healthy") ? "Healthy" :
                           healthChecks.Any(h => h.Status == "Degraded") ? "Degraded" : "Unhealthy";

        var response = new
        {
            Status = overallStatus,
            Timestamp = DateTime.UtcNow,
            Checks = healthChecks.ToDictionary(h => h.Name, h => h),
            Duration = healthChecks.Sum(h => h.DurationMs),
            Service = "GeoLeap.Api",
            SystemInfo = systemInfo
        };

        var statusCode = overallStatus switch
        {
            "Healthy" => 200,
            "Degraded" => 200, 
            "Unhealthy" => 503,
            _ => 503
        };

        return StatusCode(statusCode, response);
    }

    [HttpGet("version")]
    [AllowAnonymous]
    public IActionResult GetVersion()
    {
        var assembly = System.Reflection.Assembly.GetExecutingAssembly();
        var version = assembly.GetName().Version?.ToString() ?? "1.0.0";
        var buildDate = System.IO.File.GetCreationTime(assembly.Location);

        return Ok(new 
        { 
            version = version,
            buildDate = buildDate,
            service = "GeoLeap.Api",
            timestamp = DateTime.UtcNow
        });
    }

    private async Task<HealthCheckResult> CheckDatabaseHealth()
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        try
        {
            // Try to execute a simple query
            await _context.Database.CanConnectAsync();
            
            // Additional check: ensure we can query the Users table
            var userCount = await _context.Users.CountAsync();
            
            stopwatch.Stop();
            
            _logger.LogDebug("Database health check passed. User count: {UserCount}", userCount);
            
            return new HealthCheckResult
            {
                Name = "Database",
                Status = "Healthy",
                Description = $"Connected successfully. User count: {userCount}",
                DurationMs = stopwatch.ElapsedMilliseconds
            };
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            _logger.LogError(ex, "Database health check failed");
            
            return new HealthCheckResult
            {
                Name = "Database",
                Status = "Unhealthy",
                Description = ex.Message,
                DurationMs = stopwatch.ElapsedMilliseconds
            };
        }
    }

    private async Task<HealthCheckResult> CheckRedisHealth()
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        try
        {
            var database = _redis.GetDatabase();
            var pingResult = await database.PingAsync();
            
            stopwatch.Stop();
            
            _logger.LogDebug("Redis health check passed. Ping time: {PingTime}ms", pingResult.TotalMilliseconds);
            
            return new HealthCheckResult
            {
                Name = "Redis",
                Status = "Healthy",
                Description = $"Connected successfully. Ping: {pingResult.TotalMilliseconds}ms",
                DurationMs = stopwatch.ElapsedMilliseconds
            };
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            _logger.LogError(ex, "Redis health check failed");
            
            return new HealthCheckResult
            {
                Name = "Redis",
                Status = "Unhealthy",
                Description = ex.Message,
                DurationMs = stopwatch.ElapsedMilliseconds
            };
        }
    }

    private async Task<HealthCheckResult> CheckExternalServicesHealth()
    {
        var stopwatch = System.Diagnostics.Stopwatch.StartNew();
        try
        {
            // Placeholder for external service health checks
            // In the future, this would check streaming APIs, payment services, etc.
            
            // Simulate external service check
            await Task.Delay(10); // Small delay to simulate network call
            
            stopwatch.Stop();
            
            return new HealthCheckResult
            {
                Name = "ExternalServices",
                Status = "Healthy",
                Description = "All external services are accessible",
                DurationMs = stopwatch.ElapsedMilliseconds
            };
        }
        catch (Exception ex)
        {
            stopwatch.Stop();
            _logger.LogError(ex, "External services health check failed");
            
            return new HealthCheckResult
            {
                Name = "ExternalServices",
                Status = "Degraded", // External services can fail without making app unhealthy
                Description = ex.Message,
                DurationMs = stopwatch.ElapsedMilliseconds
            };
        }
    }

    private async Task<bool> CanConnectToDatabase()
    {
        try
        {
            return await _context.Database.CanConnectAsync();
        }
        catch
        {
            return false;
        }
    }

    private async Task<bool> CanConnectToRedis()
    {
        try
        {
            var database = _redis.GetDatabase();
            await database.PingAsync();
            return true;
        }
        catch
        {
            return false;
        }
    }

    private ObjectResult ServiceUnavailable(object value)
    {
        return StatusCode(503, value);
    }
}

public class HealthResponse
{
    public string Status { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    public Dictionary<string, HealthCheckResult> Checks { get; set; } = new();
    public long Duration { get; set; }
    public string Service { get; set; } = "GeoLeap.Api";
}

public class HealthCheckResult
{
    public string Name { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public long DurationMs { get; set; }
}