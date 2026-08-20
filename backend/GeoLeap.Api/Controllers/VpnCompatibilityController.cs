using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services.VpnGuidanceServices;
using GeoLeap.Api.Extensions;
using System.Security.Claims;

namespace GeoLeap.Api.Controllers;

[ApiController]
[Route("api/vpn")]
[EnableRateLimiting("ContentPolicy")]
[Produces("application/json")]
public class VpnCompatibilityController : ControllerBase
{
    private readonly IVpnStreamingCompatibilityService _compatibilityService;
    private readonly ILogger<VpnCompatibilityController> _logger;

    public VpnCompatibilityController(
        IVpnStreamingCompatibilityService compatibilityService,
        ILogger<VpnCompatibilityController> logger)
    {
        _compatibilityService = compatibilityService;
        _logger = logger;
    }

    /// <summary>
    /// Check VPN provider compatibility with streaming service
    /// </summary>
    [HttpGet("compatibility")]
    public Task<ActionResult<VpnCompatibilityDto>> GetVpnStreamingCompatibility(
        [FromQuery] string provider,
        [FromQuery] string service,
        [FromQuery] string? region = "US",
        CancellationToken cancellationToken = default)
    {
        try
        {
            var compatibility = GetMockCompatibility(provider, service, region);

            if (compatibility == null)
            {
                return Task.FromResult<ActionResult<VpnCompatibilityDto>>(NotFound(new { message = "No compatibility data found for this combination" }));
            }

            return Task.FromResult<ActionResult<VpnCompatibilityDto>>(Ok(compatibility));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking compatibility for {Provider} + {Service} in {Region}",
                provider, service, region);
            return Task.FromResult<ActionResult<VpnCompatibilityDto>>(StatusCode(500, new { message = "An error occurred while checking compatibility" }));
        }
    }

    /// <summary>
    /// Get optimal VPN servers for streaming
    /// </summary>
    [HttpPost("optimal-servers")]
    public Task<ActionResult<OptimalServerDto>> GetOptimalServers(
        [FromBody] OptimalServerRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (string.IsNullOrEmpty(request.VpnProvider) || string.IsNullOrEmpty(request.StreamingService))
            {
                return Task.FromResult<ActionResult<OptimalServerDto>>(this.StandardBadRequest("VpnProvider and StreamingService are required"));
            }

            var optimalServers = new OptimalServerDto
            {
                VpnProvider = request.VpnProvider,
                StreamingService = request.StreamingService,
                Region = request.ContentRegion ?? "US",
                RecommendedServers = GetMockOptimalServers(request.VpnProvider, request.StreamingService, request.ContentRegion),
                LastUpdated = DateTime.UtcNow,
                PerformanceScore = 8.5,
                EstimatedSpeed = "95mbps"
            };

            return Task.FromResult<ActionResult<OptimalServerDto>>(Ok(optimalServers));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting optimal servers for {Provider} + {Service}",
                request.VpnProvider, request.StreamingService);
            return Task.FromResult<ActionResult<OptimalServerDto>>(StatusCode(500, new { message = "An error occurred while getting server recommendations" }));
        }
    }

    private VpnCompatibilityDto? GetMockCompatibility(string provider, string service, string? region)
    {
        // Mock compatibility data based on known VPN-service combinations
        var compatibilityMap = new Dictionary<(string, string, string), string>
        {
            [("nordvpn", "netflix", "us")] = "WorksReliably",
            [("expressvpn", "bbc iplayer", "uk")] = "WorksReliably", 
            [("surfshark", "hulu", "us")] = "WorksReliably",
            [("cyberghost", "disney+", "ca")] = "WorksSometimes"
        };

        var key = (provider.ToLowerInvariant(), service.ToLowerInvariant(), region?.ToLowerInvariant() ?? "us");
        
        if (!compatibilityMap.TryGetValue(key, out var status))
        {
            status = "NotTested";
        }

        return new VpnCompatibilityDto
        {
            VpnProvider = provider,
            StreamingService = service,
            Region = region ?? "US",
            CompatibilityStatus = status,
            LastTested = DateTime.UtcNow.AddDays(-Random.Shared.Next(1, 30)),
            Notes = $"Compatibility test for {provider} with {service} in {region}",
            RecommendedServers = GetMockOptimalServers(provider, service, region),
            UserRating = Random.Shared.NextDouble() * 2 + 3.0, // 3.0 to 5.0
            TestCount = Random.Shared.Next(10, 100)
        };
    }

    private List<VpnServerDto> GetMockOptimalServers(string provider, string service, string? region)
    {
        var servers = new List<VpnServerDto>();
        
        // Generate mock server recommendations based on region
        var serverLocations = region?.ToUpperInvariant() switch
        {
            "US" => new[] { "New York", "Los Angeles", "Chicago" },
            "UK" => new[] { "London", "Manchester", "Edinburgh" },
            "CA" => new[] { "Toronto", "Vancouver", "Montreal" },
            "AU" => new[] { "Sydney", "Melbourne", "Perth" },
            "DE" => new[] { "Berlin", "Munich", "Frankfurt" },
            _ => new[] { "New York", "London", "Amsterdam" }
        };

        foreach (var location in serverLocations.Take(3))
        {
            servers.Add(new VpnServerDto
            {
                ServerName = $"{provider}-{location.Replace(" ", "").ToLowerInvariant()}-{Random.Shared.Next(1, 99):D2}",
                Location = location,
                Country = region ?? "US",
                LoadPercentage = Random.Shared.Next(10, 80),
                OptimizedForStreaming = true,
                EstimatedSpeed = $"{Random.Shared.Next(80, 150)}mbps",
                PingMs = Random.Shared.Next(15, 60),
                RecommendationScore = Random.Shared.NextDouble() * 2 + 8.0 // 8.0 to 10.0
            });
        }

        return servers;
    }
}

// DTOs
public class OptimalServerRequest
{
    public string VpnProvider { get; set; } = string.Empty;
    public string StreamingService { get; set; } = string.Empty;
    public string? ContentRegion { get; set; }
    public string? UserLocation { get; set; }
    public string? PreferredQuality { get; set; }
    public string? ConnectionSpeed { get; set; }
}

public class VpnCompatibilityDto
{
    public string VpnProvider { get; set; } = string.Empty;
    public string StreamingService { get; set; } = string.Empty;
    public string Region { get; set; } = string.Empty;
    public string CompatibilityStatus { get; set; } = string.Empty;
    public DateTime LastTested { get; set; }
    public string? Notes { get; set; }
    public List<VpnServerDto> RecommendedServers { get; set; } = new();
    public double UserRating { get; set; }
    public int TestCount { get; set; }
}

public class OptimalServerDto
{
    public string VpnProvider { get; set; } = string.Empty;
    public string StreamingService { get; set; } = string.Empty;
    public string Region { get; set; } = string.Empty;
    public List<VpnServerDto> RecommendedServers { get; set; } = new();
    public DateTime LastUpdated { get; set; }
    public double PerformanceScore { get; set; }
    public string EstimatedSpeed { get; set; } = string.Empty;
}

public class VpnServerDto
{
    public string ServerName { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    public int LoadPercentage { get; set; }
    public bool OptimizedForStreaming { get; set; }
    public string EstimatedSpeed { get; set; } = string.Empty;
    public int PingMs { get; set; }
    public double RecommendationScore { get; set; }
}