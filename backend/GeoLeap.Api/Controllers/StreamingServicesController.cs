using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using GeoLeap.Api.Models;
using GeoLeap.Api.Extensions;
using System.Security.Claims;

namespace GeoLeap.Api.Controllers;

/// <summary>
/// Controller for streaming services information
/// </summary>
[ApiController]
[Route("api/streaming-services")]
public class StreamingServicesController : ControllerBase
{
    private readonly ILogger<StreamingServicesController> _logger;

    // In-memory storage for user streaming services (would be database in production)
    private static readonly System.Collections.Concurrent.ConcurrentDictionary<string, List<InMemoryUserStreamingService>> _userServices = new();

    public StreamingServicesController(ILogger<StreamingServicesController> logger)
    {
        _logger = logger;
    }

    /// <summary>
    /// Get list of available streaming services
    /// </summary>
    [HttpGet]
    [AllowAnonymous]
    [ResponseCache(Duration = 86400)] // Cache for 24 hours
    [ProducesResponseType(typeof(List<StreamingService>), 200)]
    [ProducesResponseType(500)]
    public async Task<ActionResult<List<StreamingService>>> GetStreamingServicesAsync(
        [FromQuery] string? country = "US",
        CancellationToken cancellationToken = default)
    {
        try
        {
            var services = new List<StreamingService>
            {
                new StreamingService
                {
                    Id = "netflix",
                    Name = "Netflix",
                    LogoUrl = "https://example.com/logos/netflix.png",
                    Website = "https://netflix.com",
                    Countries = new[] { "US", "CA", "GB", "AU", "DE", "FR", "JP" },
                    ServiceTypes = new[] { "subscription" },
                    IsActive = true,
                    MonthlyPrice = 15.49m,
                    Currency = "USD",
                    Description = "Leading streaming service with original content"
                },
                new StreamingService
                {
                    Id = "amazon-prime",
                    Name = "Amazon Prime Video",
                    LogoUrl = "https://example.com/logos/prime.png",
                    Website = "https://amazon.com/primevideo",
                    Countries = new[] { "US", "CA", "GB", "AU", "DE", "FR", "JP" },
                    ServiceTypes = new[] { "subscription", "rent", "buy" },
                    IsActive = true,
                    MonthlyPrice = 8.99m,
                    Currency = "USD",
                    Description = "Amazon's streaming service with Prime membership benefits"
                },
                new StreamingService
                {
                    Id = "disney-plus",
                    Name = "Disney+",
                    LogoUrl = "https://example.com/logos/disney.png",
                    Website = "https://disneyplus.com",
                    Countries = new[] { "US", "CA", "GB", "AU", "DE", "FR" },
                    ServiceTypes = new[] { "subscription" },
                    IsActive = true,
                    MonthlyPrice = 7.99m,
                    Currency = "USD",
                    Description = "Disney's streaming service for family entertainment"
                },
                new StreamingService
                {
                    Id = "hbo-max",
                    Name = "HBO Max",
                    LogoUrl = "https://example.com/logos/hbo.png",
                    Website = "https://hbomax.com",
                    Countries = new[] { "US" },
                    ServiceTypes = new[] { "subscription" },
                    IsActive = true,
                    MonthlyPrice = 14.99m,
                    Currency = "USD",
                    Description = "HBO's premium streaming service"
                },
                new StreamingService
                {
                    Id = "apple-tv",
                    Name = "Apple TV+",
                    LogoUrl = "https://example.com/logos/apple.png",
                    Website = "https://tv.apple.com",
                    Countries = new[] { "US", "CA", "GB", "AU", "DE", "FR", "JP" },
                    ServiceTypes = new[] { "subscription", "rent", "buy" },
                    IsActive = true,
                    MonthlyPrice = 6.99m,
                    Currency = "USD",
                    Description = "Apple's streaming service with original content"
                },
                new StreamingService
                {
                    Id = "hulu",
                    Name = "Hulu",
                    LogoUrl = "https://example.com/logos/hulu.png",
                    Website = "https://hulu.com",
                    Countries = new[] { "US" },
                    ServiceTypes = new[] { "subscription" },
                    IsActive = true,
                    MonthlyPrice = 7.99m,
                    Currency = "USD",
                    Description = "Popular US streaming service with current TV shows"
                }
            };

            // Filter by country if specified
            if (!string.IsNullOrEmpty(country))
            {
                services = services.Where(s => s.Countries.Contains(country, StringComparer.OrdinalIgnoreCase)).ToList();
            }

            return Ok(services);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting streaming services for country: {Country}", country);
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get streaming service by ID
    /// </summary>
    [HttpGet("{id}")]
    [AllowAnonymous]
    [ResponseCache(Duration = 86400)]
    [ProducesResponseType(typeof(StreamingService), 200)]
    [ProducesResponseType(404)]
    [ProducesResponseType(500)]
    public async Task<ActionResult<StreamingService>> GetStreamingServiceAsync(
        string id,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var services = await GetAllServices();
            var service = services.FirstOrDefault(s => s.Id.Equals(id, StringComparison.OrdinalIgnoreCase));
            
            if (service == null)
            {
                return NotFound($"Streaming service '{id}' not found");
            }

            return Ok(service);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting streaming service: {ServiceId}", id);
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get streaming service availability by country
    /// </summary>
    [HttpGet("availability")]
    [AllowAnonymous]
    [ResponseCache(Duration = 86400)]
    [ProducesResponseType(typeof(Dictionary<string, List<string>>), 200)]
    [ProducesResponseType(500)]
    public async Task<ActionResult<Dictionary<string, List<string>>>> GetAvailabilityMapAsync(
        CancellationToken cancellationToken = default)
    {
        try
        {
            var services = await GetAllServices();
            var availabilityMap = new Dictionary<string, List<string>>();

            foreach (var service in services)
            {
                foreach (var country in service.Countries)
                {
                    if (!availabilityMap.ContainsKey(country))
                    {
                        availabilityMap[country] = new List<string>();
                    }
                    availabilityMap[country].Add(service.Name);
                }
            }

            return Ok(availabilityMap);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting streaming availability map");
            return StatusCode(500, "Internal server error");
        }
    }

    private async Task<List<StreamingService>> GetAllServices()
    {
        // This would normally come from database, but for testing return hardcoded data
        return new List<StreamingService>
        {
            new StreamingService
            {
                Id = "netflix",
                Name = "Netflix",
                LogoUrl = "https://example.com/logos/netflix.png",
                Website = "https://netflix.com",
                Countries = new[] { "US", "CA", "GB", "AU", "DE", "FR", "JP" },
                ServiceTypes = new[] { "subscription" },
                IsActive = true,
                MonthlyPrice = 15.49m,
                Currency = "USD",
                Description = "Leading streaming service with original content"
            },
            new StreamingService
            {
                Id = "amazon-prime",
                Name = "Amazon Prime Video",
                LogoUrl = "https://example.com/logos/prime.png",
                Website = "https://amazon.com/primevideo",
                Countries = new[] { "US", "CA", "GB", "AU", "DE", "FR", "JP" },
                ServiceTypes = new[] { "subscription", "rent", "buy" },
                IsActive = true,
                MonthlyPrice = 8.99m,
                Currency = "USD",
                Description = "Amazon's streaming service with Prime membership benefits"
            }
        };
    }

    #region User Streaming Services Endpoints

    /// <summary>
    /// Get user's streaming services and available services
    /// </summary>
    [HttpGet("user")]
    [Authorize]
    [ProducesResponseType(typeof(SimpleUserStreamingServicesResponse), 200)]
    [ProducesResponseType(401)]
    [ProducesResponseType(500)]
    public async Task<ActionResult<SimpleUserStreamingServicesResponse>> GetUserServicesAsync(
        [FromQuery] string? countryCode = "US",
        CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "anonymous";
            var allServices = await GetAllServices();

            if (!_userServices.TryGetValue(userId, out var userServices))
            {
                userServices = new List<InMemoryUserStreamingService>();
            }

            // Filter by country if specified
            var availableServices = allServices
                .Where(s => string.IsNullOrEmpty(countryCode) || s.Countries.Contains(countryCode, StringComparer.OrdinalIgnoreCase))
                .Select(s => new SimpleStreamingServiceDto
                {
                    Id = s.Id,
                    Name = s.Name,
                    LogoUrl = s.LogoUrl,
                    Website = s.Website,
                    Description = s.Description,
                    MonthlyPrice = s.MonthlyPrice,
                    Currency = s.Currency,
                    IsActive = s.IsActive,
                    AvailableCountries = s.Countries.ToList(),
                    ServiceTypes = s.ServiceTypes.ToList()
                })
                .ToList();

            return Ok(new SimpleUserStreamingServicesResponse
            {
                UserServices = userServices,
                AvailableServices = availableServices,
                TotalUserServices = userServices.Count,
                TotalAvailableServices = availableServices.Count
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting user streaming services");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get user's active streaming services
    /// </summary>
    [HttpGet("user/active")]
    [Authorize]
    [ProducesResponseType(typeof(List<InMemoryUserStreamingService>), 200)]
    [ProducesResponseType(401)]
    [ProducesResponseType(500)]
    public async Task<ActionResult<List<InMemoryUserStreamingService>>> GetActiveUserServicesAsync(
        CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "anonymous";

            if (!_userServices.TryGetValue(userId, out var userServices))
            {
                return Ok(new List<InMemoryUserStreamingService>());
            }

            var activeServices = userServices.Where(s => s.IsActive).ToList();
            return Ok(activeServices);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting active user streaming services");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Add a streaming service to user's list
    /// </summary>
    [HttpPost("user")]
    [Authorize]
    [ProducesResponseType(typeof(InMemoryUserStreamingService), 201)]
    [ProducesResponseType(400)]
    [ProducesResponseType(401)]
    [ProducesResponseType(500)]
    public async Task<ActionResult<InMemoryUserStreamingService>> AddUserServiceAsync(
        [FromBody] SimpleAddStreamingServiceRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "anonymous";
            var allServices = await GetAllServices();

            var service = allServices.FirstOrDefault(s => s.Id == request.StreamingServiceId);
            if (service == null)
            {
                return this.StandardBadRequest($"Streaming service '{request.StreamingServiceId}' not found");
            }

            if (!_userServices.TryGetValue(userId, out var userServices))
            {
                userServices = new List<InMemoryUserStreamingService>();
                _userServices[userId] = userServices;
            }

            // Check if already exists
            if (userServices.Any(s => s.StreamingServiceId == request.StreamingServiceId))
            {
                return this.StandardBadRequest("Service already added to user's list");
            }

            var newUserService = new InMemoryUserStreamingService
            {
                Id = Guid.NewGuid().ToString(),
                StreamingServiceId = request.StreamingServiceId,
                ServiceName = service.Name,
                IsActive = true,
                AddedAt = DateTime.UtcNow,
                PrioritizeInResults = request.PrioritizeInResults ?? false,
                ShowInRecommendations = request.ShowInRecommendations ?? true
            };

            userServices.Add(newUserService);

            return CreatedAtAction(nameof(GetUserServicesAsync), newUserService);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding user streaming service");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Update user's streaming service preferences
    /// </summary>
    [HttpPut("user/{streamingServiceId}")]
    [Authorize]
    [ProducesResponseType(typeof(InMemoryUserStreamingService), 200)]
    [ProducesResponseType(400)]
    [ProducesResponseType(401)]
    [ProducesResponseType(404)]
    [ProducesResponseType(500)]
    public async Task<ActionResult<InMemoryUserStreamingService>> UpdateUserServiceAsync(
        string streamingServiceId,
        [FromBody] SimpleUpdateStreamingServiceRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "anonymous";

            if (!_userServices.TryGetValue(userId, out var userServices))
            {
                return NotFound("No services found for user");
            }

            var service = userServices.FirstOrDefault(s => s.StreamingServiceId == streamingServiceId);
            if (service == null)
            {
                return NotFound($"Service '{streamingServiceId}' not found in user's list");
            }

            service.PrioritizeInResults = request.PrioritizeInResults;
            service.ShowInRecommendations = request.ShowInRecommendations;

            return Ok(service);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating user streaming service");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Remove a streaming service from user's list
    /// </summary>
    [HttpDelete("user/{streamingServiceId}")]
    [Authorize]
    [ProducesResponseType(204)]
    [ProducesResponseType(401)]
    [ProducesResponseType(404)]
    [ProducesResponseType(500)]
    public async Task<ActionResult> RemoveUserServiceAsync(
        string streamingServiceId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "anonymous";

            if (!_userServices.TryGetValue(userId, out var userServices))
            {
                return NotFound("No services found for user");
            }

            var service = userServices.FirstOrDefault(s => s.StreamingServiceId == streamingServiceId);
            if (service == null)
            {
                return NotFound($"Service '{streamingServiceId}' not found in user's list");
            }

            userServices.Remove(service);

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing user streaming service");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Bulk add streaming services to user's list
    /// </summary>
    [HttpPost("user/bulk")]
    [Authorize]
    [ProducesResponseType(typeof(List<InMemoryUserStreamingService>), 201)]
    [ProducesResponseType(400)]
    [ProducesResponseType(401)]
    [ProducesResponseType(500)]
    public async Task<ActionResult<List<InMemoryUserStreamingService>>> BulkAddUserServicesAsync(
        [FromBody] List<SimpleAddStreamingServiceRequest> requests,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "anonymous";
            var allServices = await GetAllServices();
            var addedServices = new List<InMemoryUserStreamingService>();

            if (!_userServices.TryGetValue(userId, out var userServices))
            {
                userServices = new List<InMemoryUserStreamingService>();
                _userServices[userId] = userServices;
            }

            foreach (var request in requests)
            {
                var service = allServices.FirstOrDefault(s => s.Id == request.StreamingServiceId);
                if (service == null || userServices.Any(s => s.StreamingServiceId == request.StreamingServiceId))
                {
                    continue; // Skip invalid or existing services
                }

                var newUserService = new InMemoryUserStreamingService
                {
                    Id = Guid.NewGuid().ToString(),
                    StreamingServiceId = request.StreamingServiceId,
                    ServiceName = service.Name,
                    IsActive = true,
                    AddedAt = DateTime.UtcNow,
                    PrioritizeInResults = request.PrioritizeInResults ?? false,
                    ShowInRecommendations = request.ShowInRecommendations ?? true
                };

                userServices.Add(newUserService);
                addedServices.Add(newUserService);
            }

            return CreatedAtAction(nameof(GetUserServicesAsync), addedServices);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error bulk adding user streaming services");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Bulk remove streaming services from user's list
    /// </summary>
    [HttpPost("user/bulk-remove")]
    [Authorize]
    [ProducesResponseType(204)]
    [ProducesResponseType(401)]
    [ProducesResponseType(500)]
    public async Task<ActionResult> BulkRemoveUserServicesAsync(
        [FromBody] List<string> streamingServiceIds,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "anonymous";

            if (!_userServices.TryGetValue(userId, out var userServices))
            {
                return NoContent();
            }

            userServices.RemoveAll(s => streamingServiceIds.Contains(s.StreamingServiceId));

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error bulk removing user streaming services");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get user's streaming service statistics
    /// </summary>
    [HttpGet("user/stats")]
    [Authorize]
    [ProducesResponseType(typeof(Dictionary<string, int>), 200)]
    [ProducesResponseType(401)]
    [ProducesResponseType(500)]
    public async Task<ActionResult<Dictionary<string, int>>> GetUserServiceStatsAsync(
        CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "anonymous";

            if (!_userServices.TryGetValue(userId, out var userServices))
            {
                return Ok(new Dictionary<string, int>
                {
                    { "total", 0 },
                    { "active", 0 },
                    { "prioritized", 0 }
                });
            }

            return Ok(new Dictionary<string, int>
            {
                { "total", userServices.Count },
                { "active", userServices.Count(s => s.IsActive) },
                { "prioritized", userServices.Count(s => s.PrioritizeInResults) }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting user streaming service stats");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Check if user has any streaming services selected
    /// </summary>
    [HttpGet("user/has-services")]
    [Authorize]
    [ProducesResponseType(typeof(bool), 200)]
    [ProducesResponseType(401)]
    [ProducesResponseType(500)]
    public async Task<ActionResult<bool>> HasUserServicesAsync(
        CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? "anonymous";

            if (!_userServices.TryGetValue(userId, out var userServices))
            {
                return Ok(false);
            }

            return Ok(userServices.Any(s => s.IsActive));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking user streaming services");
            return StatusCode(500, "Internal server error");
        }
    }

    #endregion
}

public class StreamingService
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string LogoUrl { get; set; } = string.Empty;
    public string Website { get; set; } = string.Empty;
    public string[] Countries { get; set; } = Array.Empty<string>();
    public string[] ServiceTypes { get; set; } = Array.Empty<string>();
    public bool IsActive { get; set; } = true;
    public decimal MonthlyPrice { get; set; }
    public string Currency { get; set; } = "USD";
    public string Description { get; set; } = string.Empty;
    public List<string> SupportedRegions { get; set; } = new();
}

// In-memory user streaming service for this controller (uses string IDs for REST API compatibility)
public class InMemoryUserStreamingService
{
    public string Id { get; set; } = string.Empty;
    public string StreamingServiceId { get; set; } = string.Empty;
    public string ServiceName { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
    public DateTime AddedAt { get; set; }
    public DateTime? RemovedAt { get; set; }
    public bool PrioritizeInResults { get; set; }
    public bool ShowInRecommendations { get; set; } = true;
}

// Simple request/response DTOs for this controller (to avoid conflicts with Models namespace)
public class SimpleUserStreamingServicesResponse
{
    public List<InMemoryUserStreamingService> UserServices { get; set; } = new();
    public List<SimpleStreamingServiceDto> AvailableServices { get; set; } = new();
    public int TotalUserServices { get; set; }
    public int TotalAvailableServices { get; set; }
}

public class SimpleStreamingServiceDto
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string LogoUrl { get; set; } = string.Empty;
    public string Website { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public decimal MonthlyPrice { get; set; }
    public string Currency { get; set; } = "USD";
    public bool IsActive { get; set; } = true;
    public List<string> AvailableCountries { get; set; } = new();
    public List<string> ServiceTypes { get; set; } = new();
}

public class SimpleAddStreamingServiceRequest
{
    public string StreamingServiceId { get; set; } = string.Empty;
    public bool? PrioritizeInResults { get; set; }
    public bool? ShowInRecommendations { get; set; }
}

public class SimpleUpdateStreamingServiceRequest
{
    public string StreamingServiceId { get; set; } = string.Empty;
    public bool PrioritizeInResults { get; set; }
    public bool ShowInRecommendations { get; set; }
}