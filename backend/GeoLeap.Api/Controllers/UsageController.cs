using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using GeoLeap.Api.Services;
using System.Security.Claims;

namespace GeoLeap.Api.Controllers;

[ApiController]
[Route("api/users/usage")]
[Authorize]
public class UsageController : ControllerBase
{
    private readonly IUsageService _usageService;
    private readonly ILogger<UsageController> _logger;

    public UsageController(
        IUsageService usageService,
        ILogger<UsageController> logger)
    {
        _usageService = usageService;
        _logger = logger;
    }

    /// <summary>
    /// Get current user's usage statistics
    /// </summary>
    /// <returns>Usage statistics including searches used, limit, and remaining</returns>
    [HttpGet]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> GetUsage()
    {
        try
        {
            // Extract user ID from claims
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                           ?? User.FindFirst("sub")?.Value
                           ?? User.FindFirst("userId")?.Value;

            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            {
                _logger.LogWarning("Unauthorized access attempt - invalid or missing user ID claim");
                return Unauthorized(new { message = "User not authenticated" });
            }

            var usage = await _usageService.GetUserUsageAsync(userId);

            return Ok(new
            {
                searchesUsed = usage.SearchesUsed,
                searchesLimit = usage.SearchesLimit,
                searchesRemaining = usage.SearchesRemaining,
                period = usage.Period,
                resetDate = usage.ResetDate,
                tier = usage.Tier
            });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "User not found");
            return NotFound(new { message = "User not found" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting user usage");
            return StatusCode(500, new { message = "An error occurred while retrieving usage statistics" });
        }
    }

    /// <summary>
    /// Check if user can perform a search (has remaining searches)
    /// </summary>
    /// <returns>Boolean indicating if user can perform search</returns>
    [HttpGet("can-search")]
    [ProducesResponseType(typeof(object), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> CanSearch()
    {
        try
        {
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value
                           ?? User.FindFirst("sub")?.Value
                           ?? User.FindFirst("userId")?.Value;

            if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
            {
                return Unauthorized(new { message = "User not authenticated" });
            }

            var canSearch = await _usageService.CanPerformSearchAsync(userId);
            var remaining = await _usageService.GetRemainingSearchesAsync(userId);

            return Ok(new
            {
                canSearch,
                searchesRemaining = remaining
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking if user can search");
            return StatusCode(500, new { message = "An error occurred" });
        }
    }
}
