using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using GeoLeap.Api.Services;
using GeoLeap.Api.Models;
using GeoLeap.Api.Middleware;
using System.Security.Claims;
using Microsoft.AspNetCore.RateLimiting;
using System.ComponentModel.DataAnnotations;

namespace GeoLeap.Api.Controllers;

/// <summary>
/// Controller for managing user watchlists and watchlist items
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
[EnableRateLimiting("ContentPolicy")]
public class WatchlistController : ControllerBase
{
    private readonly IWatchlistService _watchlistService;
    private readonly ILogger<WatchlistController> _logger;

    public WatchlistController(IWatchlistService watchlistService, ILogger<WatchlistController> logger)
    {
        _watchlistService = watchlistService;
        _logger = logger;
    }

    /// <summary>
    /// Get all watchlists for the current user
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<WatchlistSummaryDto>>> GetUserWatchlists(
        [FromQuery] bool includeShared = true)
    {
        var correlationId = GetCorrelationId();
        try
        {
            var userId = GetCurrentUserId();
            var watchlists = await _watchlistService.GetUserWatchlistsAsync(userId, includeShared);
            return Ok(watchlists);
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized(ErrorResponseFactory.CreateUnauthorizedError(correlationId, Request.Path, correlationId));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting user watchlists");
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "An error occurred while retrieving watchlists", correlationId));
        }
    }

    /// <summary>
    /// Get a specific watchlist by ID
    /// </summary>
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<WatchlistDetailDto>> GetWatchlist(Guid id)
    {
        var correlationId = GetCorrelationId();
        try
        {
            var userId = GetCurrentUserId();
            var watchlist = await _watchlistService.GetWatchlistAsync(id, userId);

            if (watchlist == null)
            {
                return NotFound(ErrorResponseFactory.CreateNotFoundError(correlationId, Request.Path, "Watchlist", id.ToString(), correlationId));
            }

            return Ok(watchlist);
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized(ErrorResponseFactory.CreateUnauthorizedError(correlationId, Request.Path, correlationId));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting watchlist {WatchlistId}", id);
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "An error occurred while retrieving the watchlist", correlationId));
        }
    }

    /// <summary>
    /// Create a new watchlist
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<WatchlistDetailDto>> CreateWatchlist([FromBody] CreateWatchlistDto dto)
    {
        var correlationId = GetCorrelationId();
        try
        {
            if (!ModelState.IsValid)
            {
                var validationErrors = ModelState
                    .Where(x => x.Value?.Errors.Count > 0)
                    .ToDictionary(x => x.Key, x => x.Value!.Errors.Select(e => e.ErrorMessage).ToArray());
                return BadRequest(ErrorResponseFactory.CreateValidationError(correlationId, Request.Path, validationErrors, correlationId));
            }

            var userId = GetCurrentUserId();
            var watchlist = await _watchlistService.CreateWatchlistAsync(userId, dto);

            return CreatedAtAction(
                nameof(GetWatchlist),
                new { id = watchlist.Id },
                watchlist);
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized(ErrorResponseFactory.CreateUnauthorizedError(correlationId, Request.Path, correlationId));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ErrorResponseFactory.CreateBadRequestError(correlationId, Request.Path, ex.Message, correlationId));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating watchlist");
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "An error occurred while creating the watchlist", correlationId));
        }
    }

    /// <summary>
    /// Update an existing watchlist
    /// </summary>
    [HttpPut("{id:guid}")]
    public async Task<ActionResult<WatchlistDetailDto>> UpdateWatchlist(Guid id, [FromBody] UpdateWatchlistDto dto)
    {
        var correlationId = GetCorrelationId();
        try
        {
            if (!ModelState.IsValid)
            {
                var validationErrors = ModelState
                    .Where(x => x.Value?.Errors.Count > 0)
                    .ToDictionary(x => x.Key, x => x.Value!.Errors.Select(e => e.ErrorMessage).ToArray());
                return BadRequest(ErrorResponseFactory.CreateValidationError(correlationId, Request.Path, validationErrors, correlationId));
            }

            var userId = GetCurrentUserId();
            var watchlist = await _watchlistService.UpdateWatchlistAsync(id, userId, dto);

            if (watchlist == null)
            {
                return NotFound(ErrorResponseFactory.CreateNotFoundError(correlationId, Request.Path, "Watchlist", id.ToString(), correlationId));
            }

            return Ok(watchlist);
        }
        catch (UnauthorizedAccessException)
        {
            return StatusCode(403, ErrorResponseFactory.CreateForbiddenError(correlationId, Request.Path, null, correlationId));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ErrorResponseFactory.CreateBadRequestError(correlationId, Request.Path, ex.Message, correlationId));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating watchlist {WatchlistId}", id);
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "An error occurred while updating the watchlist", correlationId));
        }
    }

    /// <summary>
    /// Delete a watchlist
    /// </summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteWatchlist(Guid id)
    {
        var correlationId = GetCorrelationId();
        try
        {
            var userId = GetCurrentUserId();
            var success = await _watchlistService.DeleteWatchlistAsync(id, userId);

            if (!success)
            {
                return NotFound(ErrorResponseFactory.CreateNotFoundError(correlationId, Request.Path, "Watchlist", id.ToString(), correlationId));
            }

            return NoContent();
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized(ErrorResponseFactory.CreateUnauthorizedError(correlationId, Request.Path, correlationId));
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ErrorResponseFactory.CreateBadRequestError(correlationId, Request.Path, ex.Message, correlationId));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting watchlist {WatchlistId}", id);
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "An error occurred while deleting the watchlist", correlationId));
        }
    }

    /// <summary>
    /// Get items in a specific watchlist
    /// </summary>
    [HttpGet("{id:guid}/items")]
    public async Task<ActionResult<List<WatchlistItemDto>>> GetWatchlistItems(
        Guid id,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var correlationId = GetCorrelationId();
        try
        {
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 100) pageSize = 50;

            var userId = GetCurrentUserId();
            var items = await _watchlistService.GetWatchlistItemsAsync(id, userId, page, pageSize);

            return Ok(items);
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized(ErrorResponseFactory.CreateUnauthorizedError(correlationId, Request.Path, correlationId));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting items for watchlist {WatchlistId}", id);
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "An error occurred while retrieving watchlist items", correlationId));
        }
    }

    /// <summary>
    /// Add an item to a watchlist
    /// </summary>
    [HttpPost("{id:guid}/items")]
    public async Task<ActionResult<WatchlistItemDto>> AddItemToWatchlist(Guid id, [FromBody] AddWatchlistItemDto dto)
    {
        var correlationId = GetCorrelationId();
        try
        {
            if (!ModelState.IsValid)
            {
                var validationErrors = ModelState
                    .Where(x => x.Value?.Errors.Count > 0)
                    .ToDictionary(x => x.Key, x => x.Value!.Errors.Select(e => e.ErrorMessage).ToArray());
                return BadRequest(ErrorResponseFactory.CreateValidationError(correlationId, Request.Path, validationErrors, correlationId));
            }

            var userId = GetCurrentUserId();
            var item = await _watchlistService.AddItemToWatchlistAsync(id, userId, dto);

            return CreatedAtAction(
                nameof(GetWatchlistItem),
                new { id, itemId = item.Id },
                item);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ErrorResponseFactory.CreateBadRequestError(correlationId, Request.Path, ex.Message, correlationId));
        }
        catch (UnauthorizedAccessException)
        {
            return StatusCode(403, ErrorResponseFactory.CreateForbiddenError(correlationId, Request.Path, null, correlationId));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new ApiErrorBuilder()
                .WithCode(ErrorCodes.CONFLICT)
                .WithMessage(ex.Message)
                .WithRetryable(false)
                .WithCorrelationId(correlationId)
                .WithPath(Request.Path)
                .WithTraceId(correlationId)
                .Build());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error adding item to watchlist {WatchlistId}", id);
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "An error occurred while adding the item", correlationId));
        }
    }

    /// <summary>
    /// Get a specific watchlist item
    /// </summary>
    [HttpGet("{id:guid}/items/{itemId:guid}")]
    public async Task<ActionResult<WatchlistItemDto>> GetWatchlistItem(Guid id, Guid itemId)
    {
        var correlationId = GetCorrelationId();
        try
        {
            var userId = GetCurrentUserId();
            var items = await _watchlistService.GetWatchlistItemsAsync(id, userId, 1, 1000);
            var item = items.FirstOrDefault(i => i.Id == itemId);

            if (item == null)
            {
                return NotFound(ErrorResponseFactory.CreateNotFoundError(correlationId, Request.Path, "WatchlistItem", itemId.ToString(), correlationId));
            }

            return Ok(item);
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized(ErrorResponseFactory.CreateUnauthorizedError(correlationId, Request.Path, correlationId));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting item {ItemId} from watchlist {WatchlistId}", itemId, id);
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "An error occurred while retrieving the item", correlationId));
        }
    }

    /// <summary>
    /// Update a watchlist item
    /// </summary>
    [HttpPut("items/{itemId:guid}")]
    public async Task<ActionResult<WatchlistItemDto>> UpdateWatchlistItem(Guid itemId, [FromBody] UpdateWatchlistItemDto dto)
    {
        var correlationId = GetCorrelationId();
        try
        {
            if (!ModelState.IsValid)
            {
                var validationErrors = ModelState
                    .Where(x => x.Value?.Errors.Count > 0)
                    .ToDictionary(x => x.Key, x => x.Value!.Errors.Select(e => e.ErrorMessage).ToArray());
                return BadRequest(ErrorResponseFactory.CreateValidationError(correlationId, Request.Path, validationErrors, correlationId));
            }

            var userId = GetCurrentUserId();
            var item = await _watchlistService.UpdateWatchlistItemAsync(itemId, userId, dto);

            if (item == null)
            {
                return NotFound(ErrorResponseFactory.CreateNotFoundError(correlationId, Request.Path, "WatchlistItem", itemId.ToString(), correlationId));
            }

            return Ok(item);
        }
        catch (UnauthorizedAccessException)
        {
            return StatusCode(403, ErrorResponseFactory.CreateForbiddenError(correlationId, Request.Path, null, correlationId));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating watchlist item {ItemId}", itemId);
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "An error occurred while updating the item", correlationId));
        }
    }

    /// <summary>
    /// Remove an item from a watchlist
    /// </summary>
    [HttpDelete("items/{itemId:guid}")]
    public async Task<IActionResult> RemoveWatchlistItem(Guid itemId)
    {
        var correlationId = GetCorrelationId();
        try
        {
            var userId = GetCurrentUserId();
            var success = await _watchlistService.RemoveItemFromWatchlistAsync(itemId, userId);

            if (!success)
            {
                return NotFound(ErrorResponseFactory.CreateNotFoundError(correlationId, Request.Path, "WatchlistItem", itemId.ToString(), correlationId));
            }

            return NoContent();
        }
        catch (UnauthorizedAccessException)
        {
            return StatusCode(403, ErrorResponseFactory.CreateForbiddenError(correlationId, Request.Path, null, correlationId));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error removing watchlist item {ItemId}", itemId);
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "An error occurred while removing the item", correlationId));
        }
    }

    /// <summary>
    /// Move an item to another watchlist
    /// </summary>
    [HttpPost("items/{itemId:guid}/move")]
    public async Task<IActionResult> MoveWatchlistItem(Guid itemId, [FromBody] MoveItemDto dto)
    {
        var correlationId = GetCorrelationId();
        try
        {
            if (!ModelState.IsValid)
            {
                var validationErrors = ModelState
                    .Where(x => x.Value?.Errors.Count > 0)
                    .ToDictionary(x => x.Key, x => x.Value!.Errors.Select(e => e.ErrorMessage).ToArray());
                return BadRequest(ErrorResponseFactory.CreateValidationError(correlationId, Request.Path, validationErrors, correlationId));
            }

            var userId = GetCurrentUserId();
            var success = await _watchlistService.MoveItemToWatchlistAsync(itemId, dto.TargetWatchlistId, userId);

            if (!success)
            {
                return NotFound(ErrorResponseFactory.CreateNotFoundError(correlationId, Request.Path, "WatchlistItem or target Watchlist", itemId.ToString(), correlationId));
            }

            return Ok(new { message = "Item moved successfully" });
        }
        catch (UnauthorizedAccessException)
        {
            return StatusCode(403, ErrorResponseFactory.CreateForbiddenError(correlationId, Request.Path, null, correlationId));
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new ApiErrorBuilder()
                .WithCode(ErrorCodes.CONFLICT)
                .WithMessage(ex.Message)
                .WithRetryable(false)
                .WithCorrelationId(correlationId)
                .WithPath(Request.Path)
                .WithTraceId(correlationId)
                .Build());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error moving watchlist item {ItemId}", itemId);
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "An error occurred while moving the item", correlationId));
        }
    }

    /// <summary>
    /// Perform bulk operations on watchlist items
    /// </summary>
    [HttpPost("bulk")]
    public async Task<ActionResult<BulkOperationResult>> BulkOperation([FromBody] BulkWatchlistItemOperationDto dto)
    {
        var correlationId = GetCorrelationId();
        try
        {
            if (!ModelState.IsValid)
            {
                var validationErrors = ModelState
                    .Where(x => x.Value?.Errors.Count > 0)
                    .ToDictionary(x => x.Key, x => x.Value!.Errors.Select(e => e.ErrorMessage).ToArray());
                return BadRequest(ErrorResponseFactory.CreateValidationError(correlationId, Request.Path, validationErrors, correlationId));
            }

            var userId = GetCurrentUserId();
            var result = await _watchlistService.BulkOperationAsync(userId, dto);

            return Ok(result);
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized(ErrorResponseFactory.CreateUnauthorizedError(correlationId, Request.Path, correlationId));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ErrorResponseFactory.CreateBadRequestError(correlationId, Request.Path, ex.Message, correlationId));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error performing bulk operation");
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "An error occurred while performing the bulk operation", correlationId));
        }
    }

    /// <summary>
    /// Search watchlists
    /// </summary>
    [HttpGet("search")]
    public async Task<ActionResult<List<WatchlistSummaryDto>>> SearchWatchlists(
        [FromQuery] string query,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10)
    {
        var correlationId = GetCorrelationId();
        try
        {
            if (string.IsNullOrWhiteSpace(query))
            {
                var validationErrors = new Dictionary<string, string[]> { { "query", new[] { "Search query is required" } } };
                return BadRequest(ErrorResponseFactory.CreateValidationError(correlationId, Request.Path, validationErrors, correlationId));
            }

            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 50) pageSize = 10;

            var userId = GetCurrentUserId();
            var watchlists = await _watchlistService.SearchWatchlistsAsync(userId, query, page, pageSize);

            return Ok(watchlists);
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized(ErrorResponseFactory.CreateUnauthorizedError(correlationId, Request.Path, correlationId));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error searching watchlists");
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "An error occurred while searching watchlists", correlationId));
        }
    }

    /// <summary>
    /// Search items within a watchlist
    /// </summary>
    [HttpGet("{id:guid}/search")]
    public async Task<ActionResult<List<WatchlistItemDto>>> SearchWatchlistItems(
        Guid id,
        [FromQuery] string query,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var correlationId = GetCorrelationId();
        try
        {
            if (string.IsNullOrWhiteSpace(query))
            {
                var validationErrors = new Dictionary<string, string[]> { { "query", new[] { "Search query is required" } } };
                return BadRequest(ErrorResponseFactory.CreateValidationError(correlationId, Request.Path, validationErrors, correlationId));
            }

            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 50) pageSize = 20;

            var userId = GetCurrentUserId();
            var items = await _watchlistService.SearchWatchlistItemsAsync(id, userId, query, page, pageSize);

            return Ok(items);
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized(ErrorResponseFactory.CreateUnauthorizedError(correlationId, Request.Path, correlationId));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error searching watchlist items");
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "An error occurred while searching watchlist items", correlationId));
        }
    }

    /// <summary>
    /// Get user's watchlist analytics
    /// </summary>
    [HttpGet("analytics")]
    public async Task<ActionResult<WatchlistAnalyticsDto>> GetAnalytics()
    {
        var correlationId = GetCorrelationId();
        try
        {
            var userId = GetCurrentUserId();
            var analytics = await _watchlistService.GetUserAnalyticsAsync(userId);

            return Ok(analytics);
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized(ErrorResponseFactory.CreateUnauthorizedError(correlationId, Request.Path, correlationId));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting watchlist analytics");
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "An error occurred while retrieving analytics", correlationId));
        }
    }

    /// <summary>
    /// Get watchlist activity log
    /// </summary>
    [HttpGet("{id:guid}/activities")]
    public async Task<ActionResult<List<WatchlistActivityDto>>> GetWatchlistActivities(
        Guid id,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        var correlationId = GetCorrelationId();
        try
        {
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 100) pageSize = 20;

            var userId = GetCurrentUserId();
            var activities = await _watchlistService.GetWatchlistActivitiesAsync(id, userId, page, pageSize);

            return Ok(activities);
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized(ErrorResponseFactory.CreateUnauthorizedError(correlationId, Request.Path, correlationId));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting watchlist activities");
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "An error occurred while retrieving activities", correlationId));
        }
    }

    /// <summary>
    /// Export watchlists
    /// </summary>
    [HttpPost("export")]
    public async Task<IActionResult> ExportWatchlists([FromBody] WatchlistExportDto dto)
    {
        var correlationId = GetCorrelationId();
        try
        {
            if (!ModelState.IsValid)
            {
                var validationErrors = ModelState
                    .Where(x => x.Value?.Errors.Count > 0)
                    .ToDictionary(x => x.Key, x => x.Value!.Errors.Select(e => e.ErrorMessage).ToArray());
                return BadRequest(ErrorResponseFactory.CreateValidationError(correlationId, Request.Path, validationErrors, correlationId));
            }

            var userId = GetCurrentUserId();
            var result = await _watchlistService.ExportWatchlistsAsync(userId, dto);

            return File(result.Data, result.ContentType, result.FileName);
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized(ErrorResponseFactory.CreateUnauthorizedError(correlationId, Request.Path, correlationId));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ErrorResponseFactory.CreateBadRequestError(correlationId, Request.Path, ex.Message, correlationId));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error exporting watchlists");
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "An error occurred while exporting watchlists", correlationId));
        }
    }

    /// <summary>
    /// Get notification settings for watchlists
    /// </summary>
    [HttpGet("notifications/settings")]
    public async Task<ActionResult<Models.WatchlistNotificationSettingsDto>> GetNotificationSettings()
    {
        var correlationId = GetCorrelationId();
        try
        {
            var userId = GetCurrentUserId();
            var settings = await _watchlistService.GetNotificationSettingsAsync(userId);

            return Ok(settings);
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized(ErrorResponseFactory.CreateUnauthorizedError(correlationId, Request.Path, correlationId));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting notification settings");
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "An error occurred while retrieving notification settings", correlationId));
        }
    }

    /// <summary>
    /// Update notification settings for watchlists
    /// </summary>
    [HttpPut("notifications/settings")]
    public async Task<ActionResult<Models.WatchlistNotificationSettingsDto>> UpdateNotificationSettings([FromBody] Models.WatchlistNotificationSettingsDto dto)
    {
        var correlationId = GetCorrelationId();
        try
        {
            if (!ModelState.IsValid)
            {
                var validationErrors = ModelState
                    .Where(x => x.Value?.Errors.Count > 0)
                    .ToDictionary(x => x.Key, x => x.Value!.Errors.Select(e => e.ErrorMessage).ToArray());
                return BadRequest(ErrorResponseFactory.CreateValidationError(correlationId, Request.Path, validationErrors, correlationId));
            }

            var userId = GetCurrentUserId();
            var settings = await _watchlistService.UpdateNotificationSettingsAsync(userId, dto);

            return Ok(settings);
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized(ErrorResponseFactory.CreateUnauthorizedError(correlationId, Request.Path, correlationId));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating notification settings");
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "An error occurred while updating notification settings", correlationId));
        }
    }

    // ========== Categories API ==========

    /// <summary>
    /// Get all categories for the current user
    /// </summary>
    [HttpGet("categories")]
    public async Task<ActionResult<List<WatchlistCategoryDto>>> GetCategories()
    {
        var correlationId = GetCorrelationId();
        try
        {
            var userId = GetCurrentUserId();
            var categories = await _watchlistService.GetUserCategoriesAsync(userId);
            return Ok(categories);
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized(ErrorResponseFactory.CreateUnauthorizedError(correlationId, Request.Path, correlationId));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting user categories");
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "An error occurred while retrieving categories", correlationId));
        }
    }

    /// <summary>
    /// Create a new category
    /// </summary>
    [HttpPost("categories")]
    public async Task<ActionResult<WatchlistCategoryDto>> CreateCategory([FromBody] CreateWatchlistCategoryDto dto)
    {
        var correlationId = GetCorrelationId();
        try
        {
            if (!ModelState.IsValid)
            {
                var validationErrors = ModelState
                    .Where(x => x.Value?.Errors.Count > 0)
                    .ToDictionary(x => x.Key, x => x.Value!.Errors.Select(e => e.ErrorMessage).ToArray());
                return BadRequest(ErrorResponseFactory.CreateValidationError(correlationId, Request.Path, validationErrors, correlationId));
            }

            var userId = GetCurrentUserId();
            var category = await _watchlistService.CreateCategoryAsync(userId, dto);
            return CreatedAtAction(nameof(GetCategories), category);
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized(ErrorResponseFactory.CreateUnauthorizedError(correlationId, Request.Path, correlationId));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ErrorResponseFactory.CreateBadRequestError(correlationId, Request.Path, ex.Message, correlationId));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating category");
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "An error occurred while creating the category", correlationId));
        }
    }

    /// <summary>
    /// Update an existing category
    /// </summary>
    [HttpPut("categories/{id:guid}")]
    public async Task<ActionResult<WatchlistCategoryDto>> UpdateCategory(Guid id, [FromBody] CreateWatchlistCategoryDto dto)
    {
        var correlationId = GetCorrelationId();
        try
        {
            if (!ModelState.IsValid)
            {
                var validationErrors = ModelState
                    .Where(x => x.Value?.Errors.Count > 0)
                    .ToDictionary(x => x.Key, x => x.Value!.Errors.Select(e => e.ErrorMessage).ToArray());
                return BadRequest(ErrorResponseFactory.CreateValidationError(correlationId, Request.Path, validationErrors, correlationId));
            }

            var userId = GetCurrentUserId();
            var category = await _watchlistService.UpdateCategoryAsync(id, userId, dto);

            if (category == null)
            {
                return NotFound(ErrorResponseFactory.CreateNotFoundError(correlationId, Request.Path, "Category", id.ToString(), correlationId));
            }

            return Ok(category);
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized(ErrorResponseFactory.CreateUnauthorizedError(correlationId, Request.Path, correlationId));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating category {CategoryId}", id);
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "An error occurred while updating the category", correlationId));
        }
    }

    /// <summary>
    /// Delete a category
    /// </summary>
    [HttpDelete("categories/{id:guid}")]
    public async Task<IActionResult> DeleteCategory(Guid id)
    {
        var correlationId = GetCorrelationId();
        try
        {
            var userId = GetCurrentUserId();
            var success = await _watchlistService.DeleteCategoryAsync(id, userId);

            if (!success)
            {
                return NotFound(ErrorResponseFactory.CreateNotFoundError(correlationId, Request.Path, "Category", id.ToString(), correlationId));
            }

            return NoContent();
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized(ErrorResponseFactory.CreateUnauthorizedError(correlationId, Request.Path, correlationId));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting category {CategoryId}", id);
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "An error occurred while deleting the category", correlationId));
        }
    }

    // ========== Shares API ==========

    /// <summary>
    /// Get shares for a watchlist
    /// </summary>
    [HttpGet("shares")]
    public async Task<ActionResult<List<WatchlistShareDto>>> GetShares([FromQuery] Guid watchlistId)
    {
        var correlationId = GetCorrelationId();
        try
        {
            var userId = GetCurrentUserId();
            var shares = await _watchlistService.GetWatchlistSharesAsync(watchlistId, userId);
            return Ok(shares);
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized(ErrorResponseFactory.CreateUnauthorizedError(correlationId, Request.Path, correlationId));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting watchlist shares");
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "An error occurred while retrieving shares", correlationId));
        }
    }

    /// <summary>
    /// Create a new share
    /// </summary>
    [HttpPost("shares")]
    public async Task<ActionResult<WatchlistShareDto>> CreateShare([FromBody] CreateShareDto dto)
    {
        var correlationId = GetCorrelationId();
        try
        {
            if (!ModelState.IsValid)
            {
                var validationErrors = ModelState
                    .Where(x => x.Value?.Errors.Count > 0)
                    .ToDictionary(x => x.Key, x => x.Value!.Errors.Select(e => e.ErrorMessage).ToArray());
                return BadRequest(ErrorResponseFactory.CreateValidationError(correlationId, Request.Path, validationErrors, correlationId));
            }

            var userId = GetCurrentUserId();
            var shareDto = new ShareWatchlistDto
            {
                SharedWithEmail = dto.SharedWithEmail,
                PermissionLevel = dto.PermissionLevel
            };
            var share = await _watchlistService.ShareWatchlistAsync(dto.WatchlistId, userId, shareDto);
            return CreatedAtAction(nameof(GetShares), new { watchlistId = dto.WatchlistId }, share);
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized(ErrorResponseFactory.CreateUnauthorizedError(correlationId, Request.Path, correlationId));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ErrorResponseFactory.CreateBadRequestError(correlationId, Request.Path, ex.Message, correlationId));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating share");
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "An error occurred while creating the share", correlationId));
        }
    }

    /// <summary>
    /// Revoke a share
    /// </summary>
    [HttpDelete("shares/{shareId:guid}")]
    public async Task<IActionResult> RevokeShare(Guid shareId)
    {
        var correlationId = GetCorrelationId();
        try
        {
            var userId = GetCurrentUserId();
            var success = await _watchlistService.RevokeWatchlistShareAsync(shareId, userId);

            if (!success)
            {
                return NotFound(ErrorResponseFactory.CreateNotFoundError(correlationId, Request.Path, "Share", shareId.ToString(), correlationId));
            }

            return NoContent();
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized(ErrorResponseFactory.CreateUnauthorizedError(correlationId, Request.Path, correlationId));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error revoking share {ShareId}", shareId);
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "An error occurred while revoking the share", correlationId));
        }
    }

    /// <summary>
    /// Get a shared watchlist by token (public access)
    /// </summary>
    [AllowAnonymous]
    [HttpGet("shared/{token}")]
    public async Task<ActionResult<WatchlistDetailDto>> GetSharedWatchlist(string token)
    {
        var correlationId = GetCorrelationId();
        try
        {
            var watchlist = await _watchlistService.GetSharedWatchlistAsync(token);

            if (watchlist == null)
            {
                return NotFound(ErrorResponseFactory.CreateNotFoundError(correlationId, Request.Path, "SharedWatchlist", token, correlationId));
            }

            return Ok(watchlist);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting shared watchlist with token");
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "An error occurred while retrieving the shared watchlist", correlationId));
        }
    }

    // ========== Views API ==========

    /// <summary>
    /// Get all views for the current user
    /// </summary>
    [HttpGet("views")]
    public async Task<ActionResult<List<WatchlistViewDto>>> GetViews()
    {
        var correlationId = GetCorrelationId();
        try
        {
            var userId = GetCurrentUserId();
            var views = await _watchlistService.GetUserViewsAsync(userId);
            return Ok(views);
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized(ErrorResponseFactory.CreateUnauthorizedError(correlationId, Request.Path, correlationId));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting user views");
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "An error occurred while retrieving views", correlationId));
        }
    }

    /// <summary>
    /// Create a new view
    /// </summary>
    [HttpPost("views")]
    public async Task<ActionResult<WatchlistViewDto>> CreateView([FromBody] CreateWatchlistViewDto dto)
    {
        var correlationId = GetCorrelationId();
        try
        {
            if (!ModelState.IsValid)
            {
                var validationErrors = ModelState
                    .Where(x => x.Value?.Errors.Count > 0)
                    .ToDictionary(x => x.Key, x => x.Value!.Errors.Select(e => e.ErrorMessage).ToArray());
                return BadRequest(ErrorResponseFactory.CreateValidationError(correlationId, Request.Path, validationErrors, correlationId));
            }

            var userId = GetCurrentUserId();
            var view = await _watchlistService.CreateViewAsync(userId, dto);
            return CreatedAtAction(nameof(GetViews), view);
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized(ErrorResponseFactory.CreateUnauthorizedError(correlationId, Request.Path, correlationId));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ErrorResponseFactory.CreateBadRequestError(correlationId, Request.Path, ex.Message, correlationId));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating view");
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "An error occurred while creating the view", correlationId));
        }
    }

    /// <summary>
    /// Update an existing view
    /// </summary>
    [HttpPut("views/{id:guid}")]
    public async Task<ActionResult<WatchlistViewDto>> UpdateView(Guid id, [FromBody] CreateWatchlistViewDto dto)
    {
        var correlationId = GetCorrelationId();
        try
        {
            if (!ModelState.IsValid)
            {
                var validationErrors = ModelState
                    .Where(x => x.Value?.Errors.Count > 0)
                    .ToDictionary(x => x.Key, x => x.Value!.Errors.Select(e => e.ErrorMessage).ToArray());
                return BadRequest(ErrorResponseFactory.CreateValidationError(correlationId, Request.Path, validationErrors, correlationId));
            }

            var userId = GetCurrentUserId();
            var view = await _watchlistService.UpdateViewAsync(id, userId, dto);

            if (view == null)
            {
                return NotFound(ErrorResponseFactory.CreateNotFoundError(correlationId, Request.Path, "View", id.ToString(), correlationId));
            }

            return Ok(view);
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized(ErrorResponseFactory.CreateUnauthorizedError(correlationId, Request.Path, correlationId));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating view {ViewId}", id);
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "An error occurred while updating the view", correlationId));
        }
    }

    /// <summary>
    /// Delete a view
    /// </summary>
    [HttpDelete("views/{id:guid}")]
    public async Task<IActionResult> DeleteView(Guid id)
    {
        var correlationId = GetCorrelationId();
        try
        {
            var userId = GetCurrentUserId();
            var success = await _watchlistService.DeleteViewAsync(id, userId);

            if (!success)
            {
                return NotFound(ErrorResponseFactory.CreateNotFoundError(correlationId, Request.Path, "View", id.ToString(), correlationId));
            }

            return NoContent();
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized(ErrorResponseFactory.CreateUnauthorizedError(correlationId, Request.Path, correlationId));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting view {ViewId}", id);
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "An error occurred while deleting the view", correlationId));
        }
    }

    // ========== Availability API ==========

    /// <summary>
    /// Get availability information for a watchlist item
    /// </summary>
    [HttpGet("items/{itemId:guid}/availability")]
    public async Task<ActionResult<List<WatchlistItemAvailabilityDto>>> GetItemAvailability(Guid itemId)
    {
        var correlationId = GetCorrelationId();
        try
        {
            var userId = GetCurrentUserId();
            var availability = await _watchlistService.GetItemAvailabilityAsync(itemId, userId);

            if (availability == null)
            {
                return NotFound(ErrorResponseFactory.CreateNotFoundError(correlationId, Request.Path, "WatchlistItem", itemId.ToString(), correlationId));
            }

            return Ok(availability);
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized(ErrorResponseFactory.CreateUnauthorizedError(correlationId, Request.Path, correlationId));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting availability for item {ItemId}", itemId);
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "An error occurred while retrieving availability", correlationId));
        }
    }

    /// <summary>
    /// Trigger availability refresh for a watchlist item
    /// </summary>
    [HttpPost("items/{itemId:guid}/refresh-availability")]
    public async Task<IActionResult> RefreshItemAvailability(Guid itemId)
    {
        var correlationId = GetCorrelationId();
        try
        {
            var userId = GetCurrentUserId();
            var success = await _watchlistService.RefreshItemAvailabilityAsync(itemId, userId);

            if (!success)
            {
                return NotFound(ErrorResponseFactory.CreateNotFoundError(correlationId, Request.Path, "WatchlistItem", itemId.ToString(), correlationId));
            }

            return Ok(new { message = "Availability refresh triggered" });
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized(ErrorResponseFactory.CreateUnauthorizedError(correlationId, Request.Path, correlationId));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error refreshing availability for item {ItemId}", itemId);
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "An error occurred while refreshing availability", correlationId));
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

    private string GetCorrelationId()
    {
        return HttpContext.GetCorrelationId() ?? HttpContext.TraceIdentifier;
    }
}

/// <summary>
/// DTO for creating a share
/// </summary>
public class CreateShareDto
{
    [Required]
    public Guid WatchlistId { get; set; }

    [EmailAddress]
    [MaxLength(500)]
    public string? SharedWithEmail { get; set; }

    [Required]
    [MaxLength(20)]
    public string PermissionLevel { get; set; } = "view";
}

/// <summary>
/// DTO for moving an item between watchlists
/// </summary>
public class MoveItemDto
{
    [Required]
    public Guid TargetWatchlistId { get; set; }
}