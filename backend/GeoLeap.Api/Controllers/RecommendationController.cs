using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using System.Security.Claims;
using System.ComponentModel.DataAnnotations;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using GeoLeap.Api.Extensions;

namespace GeoLeap.Api.Controllers;

/// <summary>
/// Controller for content recommendations and rating system
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
[EnableRateLimiting("ContentPolicy")]
public class RecommendationController : ControllerBase
{
    private readonly IRecommendationService _recommendationService;
    private readonly IContentRatingService _ratingService;
    private readonly ILogger<RecommendationController> _logger;

    public RecommendationController(
        IRecommendationService recommendationService,
        IContentRatingService ratingService,
        ILogger<RecommendationController> logger)
    {
        _recommendationService = recommendationService;
        _ratingService = ratingService;
        _logger = logger;
    }

    /// <summary>
    /// Get personalized recommendations for the authenticated user with advanced filtering
    /// </summary>
    [HttpGet("personalized")]
    public async Task<ActionResult<RecommendationsResponse>> GetPersonalizedRecommendations(
        [FromQuery] string type = "all",
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20,
        [FromQuery] string[]? genres = null,
        [FromQuery] string[]? services = null,
        [FromQuery] decimal? minRating = null,
        [FromQuery] int? minYear = null,
        [FromQuery] int? maxYear = null,
        [FromQuery] string sortBy = "relevance",
        [FromQuery] string sortDirection = "desc")
    {
        try
        {
            var userId = GetCurrentUserId();
            var request = new GetRecommendationsRequest
            {
                RecommendationType = "personalized",
                Page = page,
                Limit = Math.Min(limit, 50), // Cap at 50
                ContentTypes = type == "all" ? null : new List<string> { type },
                Filters = new ContentSearchFilters
                {
                    Genres = genres?.ToList(),
                    StreamingServices = services?.ToList(),
                    MinRating = minRating,
                    MinYear = minYear,
                    MaxYear = maxYear,
                    SortBy = Enum.TryParse<ContentSortBy>(sortBy, true, out var parsedSort) ? parsedSort : ContentSortBy.Popularity,
                    SortDirection = sortDirection.ToLowerInvariant() == "asc" ? SortDirection.Ascending : SortDirection.Descending
                }
            };

            var recommendations = await _recommendationService.GetPersonalizedRecommendationsAsync(userId, request);
            return Ok(recommendations);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting personalized recommendations");
            return StatusCode(500, new { message = "An error occurred while getting recommendations" });
        }
    }

    /// <summary>
    /// Get trending content recommendations
    /// </summary>
    [HttpGet("trending")]
    [AllowAnonymous]
    public async Task<ActionResult<RecommendationsResponse>> GetTrendingContent(
        [FromQuery] string type = "all",
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20)
    {
        try
        {
            var request = new GetRecommendationsRequest
            {
                RecommendationType = "trending",
                Page = page,
                Limit = Math.Min(limit, 50),
                ContentTypes = type == "all" ? null : new List<string> { type }
            };

            var recommendations = await _recommendationService.GetTrendingContentAsync(request);
            return Ok(recommendations);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting trending content");
            return StatusCode(500, new { message = "An error occurred while getting trending content" });
        }
    }

    /// <summary>
    /// Get similar content recommendations based on a specific content item
    /// </summary>
    [HttpGet("similar/{contentId}")]
    [AllowAnonymous]
    public async Task<ActionResult<RecommendationsResponse>> GetSimilarContent(
        [Required] string contentId,
        [FromQuery] string contentType = "movie",
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20)
    {
        try
        {
            var request = new GetRecommendationsRequest
            {
                RecommendationType = "similar",
                ContentId = contentId,
                Page = page,
                Limit = Math.Min(limit, 50)
            };

            var recommendations = await _recommendationService.GetSimilarContentAsync(contentId, contentType, request);
            return Ok(recommendations);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting similar content for {ContentId}", contentId);
            return StatusCode(500, new { message = "An error occurred while getting similar content" });
        }
    }

    /// <summary>
    /// Get popular content recommendations
    /// </summary>
    [HttpGet("popular")]
    [AllowAnonymous]
    public async Task<ActionResult<RecommendationsResponse>> GetPopularContent(
        [FromQuery] string type = "all",
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20)
    {
        try
        {
            var request = new GetRecommendationsRequest
            {
                RecommendationType = "popular",
                Page = page,
                Limit = Math.Min(limit, 50),
                ContentTypes = type == "all" ? null : new List<string> { type }
            };

            var recommendations = await _recommendationService.GetPopularContentAsync(request);
            return Ok(recommendations);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting popular content");
            return StatusCode(500, new { message = "An error occurred while getting popular content" });
        }
    }

    /// <summary>
    /// Get mixed recommendations (personalized + trending + popular)
    /// </summary>
    [HttpGet("mixed")]
    public async Task<ActionResult<RecommendationsResponse>> GetMixedRecommendations(
        [FromQuery] string type = "all",
        [FromQuery] int page = 1,
        [FromQuery] int limit = 20)
    {
        try
        {
            var userId = GetCurrentUserId();
            var request = new GetRecommendationsRequest
            {
                RecommendationType = "mixed",
                Page = page,
                Limit = Math.Min(limit, 50),
                ContentTypes = type == "all" ? null : new List<string> { type }
            };

            var recommendations = await _recommendationService.GetMixedRecommendationsAsync(userId, request);
            return Ok(recommendations);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting mixed recommendations");
            return StatusCode(500, new { message = "An error occurred while getting recommendations" });
        }
    }

    /// <summary>
    /// Rate content with 1-5 star rating
    /// </summary>
    [HttpPost("rate")]
    public async Task<ActionResult<ContentRatingDto>> RateContent([FromBody] CreateContentRatingDto dto)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return this.StandardBadRequest("Invalid request");
            }

            var userId = GetCurrentUserId();
            var rating = await _ratingService.RateContentAsync(userId, dto);
            return Ok(rating);
        }
        catch (ArgumentException ex)
        {
            return this.StandardBadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error rating content");
            return StatusCode(500, new { message = "An error occurred while rating content" });
        }
    }

    /// <summary>
    /// Update an existing content rating
    /// </summary>
    [HttpPut("rate/{ratingId:guid}")]
    public async Task<ActionResult<ContentRatingDto>> UpdateRating(
        Guid ratingId,
        [FromBody] UpdateContentRatingDto dto)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return this.StandardBadRequest("Invalid request");
            }

            var userId = GetCurrentUserId();
            var rating = await _ratingService.UpdateRatingAsync(userId, ratingId, dto);
            
            if (rating == null)
            {
                return NotFound(new { message = "Rating not found or not accessible" });
            }

            return Ok(rating);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating rating {RatingId}", ratingId);
            return StatusCode(500, new { message = "An error occurred while updating rating" });
        }
    }

    /// <summary>
    /// Get user's rating for specific content
    /// </summary>
    [HttpGet("rate/{contentId}")]
    public async Task<ActionResult<ContentRatingDto>> GetUserRating(
        [Required] string contentId,
        [FromQuery] string contentType = "movie")
    {
        try
        {
            var userId = GetCurrentUserId();
            var rating = await _ratingService.GetUserRatingAsync(userId, contentId, contentType);
            
            if (rating == null)
            {
                return NotFound(new { message = "Rating not found" });
            }

            return Ok(rating);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting user rating for content {ContentId}", contentId);
            return StatusCode(500, new { message = "An error occurred while getting rating" });
        }
    }

    /// <summary>
    /// Get all user's ratings with pagination
    /// </summary>
    [HttpGet("rate")]
    public async Task<ActionResult<List<ContentRatingDto>>> GetUserRatings(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        try
        {
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 100) pageSize = 20;

            var userId = GetCurrentUserId();
            var ratings = await _ratingService.GetUserRatingsAsync(userId, page, pageSize);
            return Ok(ratings);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting user ratings");
            return StatusCode(500, new { message = "An error occurred while getting ratings" });
        }
    }

    /// <summary>
    /// Delete a user's rating
    /// </summary>
    [HttpDelete("rate/{ratingId:guid}")]
    public async Task<IActionResult> DeleteRating(Guid ratingId)
    {
        try
        {
            var userId = GetCurrentUserId();
            var success = await _ratingService.DeleteRatingAsync(userId, ratingId);
            
            if (!success)
            {
                return NotFound(new { message = "Rating not found" });
            }

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting rating {RatingId}", ratingId);
            return StatusCode(500, new { message = "An error occurred while deleting rating" });
        }
    }

    /// <summary>
    /// Get rating statistics for content
    /// </summary>
    [HttpGet("stats/{contentId}")]
    [AllowAnonymous]
    public async Task<ActionResult> GetContentRatingStats(
        [Required] string contentId,
        [FromQuery] string contentType = "movie")
    {
        try
        {
            var (averageRating, totalRatings) = await _ratingService.GetContentRatingStatsAsync(contentId, contentType);
            return Ok(new
            {
                ContentId = contentId,
                ContentType = contentType,
                AverageRating = Math.Round(averageRating, 1),
                TotalRatings = totalRatings
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting rating stats for content {ContentId}", contentId);
            return StatusCode(500, new { message = "An error occurred while getting rating statistics" });
        }
    }

    /// <summary>
    /// Get user's recommendation settings
    /// </summary>
    [HttpGet("settings")]
    public async Task<ActionResult<RecommendationSettingsDto>> GetRecommendationSettings()
    {
        try
        {
            var userId = GetCurrentUserId();
            var settings = await _recommendationService.GetRecommendationSettingsAsync(userId);
            return Ok(settings);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting recommendation settings");
            return StatusCode(500, new { message = "An error occurred while getting settings" });
        }
    }

    /// <summary>
    /// Update user's recommendation settings
    /// </summary>
    [HttpPut("settings")]
    public async Task<ActionResult<RecommendationSettingsDto>> UpdateRecommendationSettings(
        [FromBody] UpdateRecommendationSettingsDto dto)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return this.StandardBadRequest("Invalid request");
            }

            var userId = GetCurrentUserId();
            var settings = await _recommendationService.UpdateRecommendationSettingsAsync(userId, dto);
            return Ok(settings);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating recommendation settings");
            return StatusCode(500, new { message = "An error occurred while updating settings" });
        }
    }

    /// <summary>
    /// Dismiss a recommendation
    /// </summary>
    [HttpPost("dismiss")]
    public async Task<IActionResult> DismissRecommendation([FromBody] DismissRecommendationDto dto)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return this.StandardBadRequest("Invalid request");
            }

            var userId = GetCurrentUserId();
            await _recommendationService.DismissRecommendationAsync(userId, dto);
            return Ok(new { message = "Recommendation dismissed successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error dismissing recommendation");
            return StatusCode(500, new { message = "An error occurred while dismissing recommendation" });
        }
    }

    /// <summary>
    /// Get user's dismissed content
    /// </summary>
    [HttpGet("dismissed")]
    public async Task<ActionResult<List<string>>> GetDismissedContent()
    {
        try
        {
            var userId = GetCurrentUserId();
            var dismissedContent = await _recommendationService.GetDismissedContentAsync(userId);
            return Ok(dismissedContent);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting dismissed content");
            return StatusCode(500, new { message = "An error occurred while getting dismissed content" });
        }
    }

    /// <summary>
    /// Clear all dismissed content for user
    /// </summary>
    [HttpDelete("dismissed")]
    public async Task<IActionResult> ClearDismissedContent()
    {
        try
        {
            var userId = GetCurrentUserId();
            await _recommendationService.ClearDismissedContentAsync(userId);
            return Ok(new { message = "Dismissed content cleared successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error clearing dismissed content");
            return StatusCode(500, new { message = "An error occurred while clearing dismissed content" });
        }
    }

    /// <summary>
    /// Provide feedback on recommendation quality
    /// </summary>
    [HttpPost("feedback")]
    public async Task<IActionResult> ProvideFeedback(
        [FromBody] RecommendationFeedbackDto dto)
    {
        try
        {
            if (!ModelState.IsValid)
            {
                return this.StandardBadRequest("Invalid request");
            }

            var userId = GetCurrentUserId();
            await _recommendationService.TrainModelWithFeedbackAsync(userId, dto.ContentId, dto.FeedbackType, dto.Weight);
            return Ok(new { message = "Feedback recorded successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error providing feedback");
            return StatusCode(500, new { message = "An error occurred while recording feedback" });
        }
    }

    /// <summary>
    /// Refresh user's cached recommendations
    /// </summary>
    [HttpPost("refresh")]
    public async Task<IActionResult> RefreshRecommendations()
    {
        try
        {
            var userId = GetCurrentUserId();
            await _recommendationService.RefreshUserRecommendationsAsync(userId);
            return Ok(new { message = "Recommendations refreshed successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error refreshing recommendations");
            return StatusCode(500, new { message = "An error occurred while refreshing recommendations" });
        }
    }

    /// <summary>
    /// Get explanation for a specific recommendation (for debugging)
    /// </summary>
    [HttpGet("explain/{contentId}")]
    public async Task<ActionResult<string>> GetRecommendationExplanation(
        [Required] string contentId,
        [FromQuery] string recommendationType = "personalized")
    {
        try
        {
            var userId = GetCurrentUserId();
            var explanation = await _recommendationService.GetRecommendationExplanationAsync(userId, contentId, recommendationType);
            return Ok(new { ContentId = contentId, Explanation = explanation });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting recommendation explanation");
            return StatusCode(500, new { message = "An error occurred while getting explanation" });
        }
    }

    /// <summary>
    /// Get user's content preferences derived from ratings
    /// </summary>
    [HttpGet("preferences")]
    public async Task<ActionResult<UserContentPreferences>> GetUserPreferences()
    {
        try
        {
            var userId = GetCurrentUserId();
            var preferences = await _ratingService.GetUserPreferencesFromRatingsAsync(userId);
            return Ok(preferences);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting user preferences");
            return StatusCode(500, new { message = "An error occurred while getting user preferences" });
        }
    }

    /// <summary>
    /// Get available filter options for content discovery
    /// </summary>
    [HttpGet("filter-options")]
    [AllowAnonymous]
    public async Task<ActionResult<FilterOptionsResponse>> GetFilterOptions(
        [FromQuery] string contentType = "all",
        [FromQuery] string region = "US")
    {
        try
        {
            var filterOptions = await _recommendationService.GetAvailableFilterOptionsAsync(contentType, region);
            return Ok(filterOptions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting filter options");
            return StatusCode(500, new { message = "An error occurred while getting filter options" });
        }
    }

    /// <summary>
    /// Get available genres for filtering with content counts
    /// </summary>
    [HttpGet("genres")]
    [AllowAnonymous]
    public async Task<ActionResult<List<FilterOption>>> GetAvailableGenres(
        [FromQuery] string contentType = "all",
        [FromQuery] string region = "US")
    {
        try
        {
            var genres = await _recommendationService.GetAvailableGenresAsync(contentType, region);
            return Ok(genres);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting available genres");
            return StatusCode(500, new { message = "An error occurred while getting genres" });
        }
    }

    /// <summary>
    /// Get available streaming services for filtering with content counts
    /// </summary>
    [HttpGet("services")]
    [AllowAnonymous]
    public async Task<ActionResult<List<FilterOption>>> GetAvailableServices(
        [FromQuery] string region = "US")
    {
        try
        {
            var services = await _recommendationService.GetAvailableStreamingServicesAsync(region);
            return Ok(services);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting available services");
            return StatusCode(500, new { message = "An error occurred while getting streaming services" });
        }
    }

    /// <summary>
    /// Get year ranges for filtering based on available content
    /// </summary>
    [HttpGet("year-ranges")]
    [AllowAnonymous]
    public async Task<ActionResult<YearRange>> GetYearRanges(
        [FromQuery] string contentType = "all")
    {
        try
        {
            var yearRange = await _recommendationService.GetAvailableYearRangesAsync(contentType);
            return Ok(yearRange);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting year ranges");
            return StatusCode(500, new { message = "An error occurred while getting year ranges" });
        }
    }

    private Guid GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            throw new UnauthorizedAccessException("User ID not found in token");
        }
        return userId;
    }
}

/// <summary>
/// DTO for recommendation feedback
/// </summary>
public class RecommendationFeedbackDto
{
    [Required]
    public string ContentId { get; set; } = string.Empty;
    
    [Required]
    public string FeedbackType { get; set; } = string.Empty; // liked, disliked, not_relevant, etc.
    
    [Range(0.1, 2.0)]
    public double Weight { get; set; } = 1.0;
}