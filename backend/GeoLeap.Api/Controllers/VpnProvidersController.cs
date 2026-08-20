using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services.VpnGuidanceServices;
using GeoLeap.Api.Extensions;
using GeoLeap.Api.Filters;
using System.Security.Claims;

namespace GeoLeap.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[EnableRateLimiting("ContentPolicy")]
[Produces("application/json")]
public class VpnProvidersController : ControllerBase
{
    private readonly IVpnProviderService _vpnProviderService;
    private readonly IVpnRatingService _vpnRatingService;
    private readonly ILogger<VpnProvidersController> _logger;

    public VpnProvidersController(
        IVpnProviderService vpnProviderService,
        IVpnRatingService vpnRatingService,
        ILogger<VpnProvidersController> logger)
    {
        _vpnProviderService = vpnProviderService;
        _vpnRatingService = vpnRatingService;
        _logger = logger;
    }

    /// <summary>
    /// Get all VPN providers
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<IEnumerable<VpnProviderDto>>> GetVpnProviders(
        [FromQuery] bool includeInactive = false,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var providers = await _vpnProviderService.GetAllVpnProvidersAsync(includeInactive, cancellationToken);
            return Ok(providers);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving VPN providers");
            return StatusCode(500, new { message = "An error occurred while retrieving VPN providers" });
        }
    }

    /// <summary>
    /// Get featured VPN providers
    /// </summary>
    [HttpGet("featured")]
    public async Task<ActionResult<IEnumerable<VpnProviderDto>>> GetFeaturedVpnProviders(
        CancellationToken cancellationToken = default)
    {
        try
        {
            var providers = await _vpnProviderService.GetFeaturedVpnProvidersAsync(cancellationToken);
            return Ok(providers);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving featured VPN providers");
            return StatusCode(500, new { message = "An error occurred while retrieving featured VPN providers" });
        }
    }

    /// <summary>
    /// Get a specific VPN provider by ID
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<VpnProviderDto>> GetVpnProvider(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var provider = await _vpnProviderService.GetVpnProviderAsync(id, cancellationToken);
            if (provider == null)
            {
                return NotFound(new { message = "VPN provider not found" });
            }

            // Track provider view
            var userId = GetCurrentUserId();
            var sessionId = HttpContext.Session.Id;
            await _vpnProviderService.TrackProviderViewAsync(id, userId, sessionId, cancellationToken);

            return Ok(provider);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving VPN provider {ProviderId}", id);
            return StatusCode(500, new { message = "An error occurred while retrieving the VPN provider" });
        }
    }

    /// <summary>
    /// Search VPN providers with filters
    /// </summary>
    [HttpGet("search")]
    public async Task<ActionResult<IEnumerable<VpnProviderDto>>> SearchVpnProviders(
        [FromQuery] string? searchTerm = null,
        [FromQuery] decimal? maxMonthlyPrice = null,
        [FromQuery] decimal? maxAnnualPrice = null,
        [FromQuery] bool? supportsStreaming = null,
        [FromQuery] bool? supportsP2P = null,
        [FromQuery] bool? hasKillSwitch = null,
        [FromQuery] bool? hasNoLogsPolicy = null,
        [FromQuery] int? minServerCount = null,
        [FromQuery] int? minCountryCount = null,
        [FromQuery] List<string>? requiredPlatforms = null,
        [FromQuery] List<string>? requiredCountries = null,
        [FromQuery] double? minRating = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var providers = await _vpnProviderService.SearchVpnProvidersAsync(
                searchTerm, maxMonthlyPrice, maxAnnualPrice, supportsStreaming, supportsP2P,
                hasKillSwitch, hasNoLogsPolicy, minServerCount, minCountryCount,
                requiredPlatforms, requiredCountries, minRating, cancellationToken);

            return Ok(providers);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error searching VPN providers");
            return StatusCode(500, new { message = "An error occurred while searching VPN providers" });
        }
    }

    /// <summary>
    /// Get VPN provider recommendations
    /// </summary>
    [HttpGet("recommendations")]
    public async Task<ActionResult<VpnRecommendationDto>> GetRecommendations(
        [FromQuery] VpnRecommendationType? recommendationType = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = GetCurrentUserId();
            var recommendations = await _vpnProviderService.GetRecommendationsAsync(userId, recommendationType, cancellationToken);
            return Ok(recommendations);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting VPN recommendations");
            return StatusCode(500, new { message = "An error occurred while getting recommendations" });
        }
    }

    /// <summary>
    /// Get personalized VPN provider recommendations
    /// </summary>
    [HttpGet("recommendations/personalized")]
    [Authorize]
    public async Task<ActionResult<VpnRecommendationDto>> GetPersonalizedRecommendations(
        CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (!userId.HasValue)
            {
                return Unauthorized(new { message = "Authentication required for personalized recommendations" });
            }

            var recommendations = await _vpnProviderService.GetPersonalizedRecommendationsAsync(userId.Value, cancellationToken);
            return Ok(recommendations);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting personalized VPN recommendations");
            return StatusCode(500, new { message = "An error occurred while getting personalized recommendations" });
        }
    }

    /// <summary>
    /// Compare multiple VPN providers
    /// </summary>
    [HttpPost("compare")]
    public async Task<ActionResult<VpnProviderComparisonDto>> CompareProviders(
        [FromBody] CompareProvidersRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (request.ProviderIds?.Count < 2)
            {
                return this.StandardBadRequest("At least 2 providers are required for comparison");
            }

            if (request.ProviderIds == null || request.ProviderIds.Count > 5)
            {
                return this.StandardBadRequest("Cannot compare more than 5 providers at once");
            }

            var comparison = await _vpnProviderService.CompareProvidersAsync(
                request.ProviderIds,
                request.ComparisonCriteria ?? new VpnComparisonCriteria(),
                cancellationToken);

            return Ok(comparison);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error comparing VPN providers");
            return StatusCode(500, new { message = "An error occurred while comparing providers" });
        }
    }

    /// <summary>
    /// Track a provider click (website or affiliate)
    /// </summary>
    [HttpPost("{id:guid}/click")]
    public async Task<ActionResult> TrackProviderClick(
        Guid id,
        [FromBody] ProviderClickRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = GetCurrentUserId();
            var sessionId = HttpContext.Session.Id;
            
            await _vpnProviderService.TrackProviderClickAsync(
                id, userId, sessionId, request.IsAffiliateClick, cancellationToken);

            return Ok(new { message = "Click tracked successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error tracking provider click for {ProviderId}", id);
            return StatusCode(500, new { message = "An error occurred while tracking the click" });
        }
    }

    /// <summary>
    /// Submit a rating for a VPN provider
    /// </summary>
    [HttpPost("{id:guid}/ratings")]
    [Authorize]
    public async Task<ActionResult<VpnProviderRating>> SubmitRating(
        Guid id,
        [FromBody] VpnRatingDto rating,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var userId = GetCurrentUserId();
            if (!userId.HasValue)
            {
                return Unauthorized(new { message = "Authentication required to submit ratings" });
            }

            rating.VpnProviderId = id; // Ensure the provider ID matches the route
            var submittedRating = await _vpnRatingService.SubmitRatingAsync(userId.Value, rating, cancellationToken);
            
            if (submittedRating == null)
            {
                return this.StandardBadRequest("Failed to submit rating");
            }

            return Ok(submittedRating);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error submitting rating for provider {ProviderId}", id);
            return StatusCode(500, new { message = "An error occurred while submitting the rating" });
        }
    }

    /// <summary>
    /// Get ratings for a VPN provider
    /// </summary>
    [HttpGet("{id:guid}/ratings")]
    public async Task<ActionResult<IEnumerable<VpnProviderRating>>> GetProviderRatings(
        Guid id,
        [FromQuery] int pageSize = 20,
        [FromQuery] int pageNumber = 1,
        CancellationToken cancellationToken = default)
    {
        try
        {
            if (pageSize > 100) pageSize = 100; // Limit page size
            if (pageNumber < 1) pageNumber = 1;
            
            var ratings = await _vpnRatingService.GetProviderRatingsAsync(id, pageSize, pageNumber, cancellationToken);
            return Ok(ratings);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving ratings for provider {ProviderId}", id);
            return StatusCode(500, new { message = "An error occurred while retrieving ratings" });
        }
    }

    /// <summary>
    /// Get rating statistics for a VPN provider
    /// </summary>
    [HttpGet("{id:guid}/ratings/stats")]
    public async Task<ActionResult<Dictionary<string, object>>> GetRatingStats(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var stats = await _vpnRatingService.GetRatingStatsAsync(id, cancellationToken);
            return Ok(stats);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving rating stats for provider {ProviderId}", id);
            return StatusCode(500, new { message = "An error occurred while retrieving rating statistics" });
        }
    }

    /// <summary>
    /// Create a new VPN provider (Admin only)
    /// </summary>
    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<VpnProviderDto>> CreateVpnProvider(
        [FromBody] VpnProvider provider,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var createdProvider = await _vpnProviderService.CreateVpnProviderAsync(provider, cancellationToken);
            if (createdProvider == null)
            {
                return this.StandardBadRequest("Failed to create VPN provider");
            }

            return CreatedAtAction(nameof(GetVpnProvider), new { id = createdProvider.Id }, createdProvider);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating VPN provider {ProviderName}", provider.Name);
            return StatusCode(500, new { message = "An error occurred while creating the VPN provider" });
        }
    }

    /// <summary>
    /// Update a VPN provider (Admin only)
    /// </summary>
    [HttpPut("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<VpnProviderDto>> UpdateVpnProvider(
        Guid id,
        [FromBody] VpnProvider provider,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var updatedProvider = await _vpnProviderService.UpdateVpnProviderAsync(id, provider, cancellationToken);
            if (updatedProvider == null)
            {
                return NotFound(new { message = "VPN provider not found" });
            }

            return Ok(updatedProvider);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating VPN provider {ProviderId}", id);
            return StatusCode(500, new { message = "An error occurred while updating the VPN provider" });
        }
    }

    /// <summary>
    /// Delete a VPN provider (Admin only)
    /// </summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult> DeleteVpnProvider(
        Guid id,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var deleted = await _vpnProviderService.DeleteVpnProviderAsync(id, cancellationToken);
            if (!deleted)
            {
                return NotFound(new { message = "VPN provider not found" });
            }

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting VPN provider {ProviderId}", id);
            return StatusCode(500, new { message = "An error occurred while deleting the VPN provider" });
        }
    }

    private Guid? GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(userIdClaim, out var userId) ? userId : null;
    }
}

// Request DTOs
public class CompareProvidersRequest
{
    public List<Guid> ProviderIds { get; set; } = new();
    public VpnComparisonCriteria? ComparisonCriteria { get; set; }
}

public class ProviderClickRequest
{
    public bool IsAffiliateClick { get; set; } = false;
}
