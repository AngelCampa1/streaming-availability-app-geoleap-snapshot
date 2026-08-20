using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using GeoLeap.Api.Hubs;
using GeoLeap.Api.Middleware;
using System.ComponentModel.DataAnnotations;
using SystemValidationResult = System.ComponentModel.DataAnnotations.ValidationResult;

namespace GeoLeap.Api.Controllers;

/// <summary>
/// API controller for managing user preferences with real-time synchronization
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class PreferencesController : ControllerBase
{
    private readonly IPreferenceService _preferenceService;
    private readonly IPreferenceHubService _hubService;
    private readonly ILogger<PreferencesController> _logger;

    public PreferencesController(
        IPreferenceService preferenceService,
        IPreferenceHubService hubService,
        ILogger<PreferencesController> logger)
    {
        _preferenceService = preferenceService;
        _hubService = hubService;
        _logger = logger;
    }

    /// <summary>
    /// Get all user preferences, optionally filtered by category
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<UserPreferenceDto>>> GetUserPreferences([FromQuery] string? categoryKey = null)
    {
        var correlationId = GetCorrelationId();
        try
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized(ErrorResponseFactory.CreateUnauthorizedError(correlationId, Request.Path, correlationId));

            var preferences = await _preferenceService.GetUserPreferencesAsync(userId.Value, categoryKey);
            return Ok(preferences);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get user preferences");
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "Failed to get user preferences", correlationId));
        }
    }

    /// <summary>
    /// Get a specific user preference
    /// </summary>
    [HttpGet("{categoryKey}/{preferenceKey}")]
    public async Task<ActionResult<UserPreferenceDto>> GetUserPreference(string categoryKey, string preferenceKey)
    {
        var correlationId = GetCorrelationId();
        try
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized(ErrorResponseFactory.CreateUnauthorizedError(correlationId, Request.Path, correlationId));

            var preference = await _preferenceService.GetUserPreferenceAsync(userId.Value, categoryKey, preferenceKey);
            if (preference == null)
                return NotFound(ErrorResponseFactory.CreateNotFoundError(correlationId, Request.Path, "Preference", $"{categoryKey}.{preferenceKey}", correlationId));

            return Ok(preference);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get user preference {CategoryKey}.{PreferenceKey}", categoryKey, preferenceKey);
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "Failed to get user preference", correlationId));
        }
    }

    /// <summary>
    /// Get resolved preference value (with default fallback)
    /// </summary>
    [HttpGet("{categoryKey}/{preferenceKey}/resolved")]
    public async Task<ActionResult<object>> GetResolvedPreference(string categoryKey, string preferenceKey)
    {
        var correlationId = GetCorrelationId();
        try
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized(ErrorResponseFactory.CreateUnauthorizedError(correlationId, Request.Path, correlationId));

            var value = await _preferenceService.ResolvePreferenceValueAsync(userId.Value, categoryKey, preferenceKey);
            return Ok(new { CategoryKey = categoryKey, PreferenceKey = preferenceKey, Value = value });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to resolve preference {CategoryKey}.{PreferenceKey}", categoryKey, preferenceKey);
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "Failed to resolve preference", correlationId));
        }
    }

    /// <summary>
    /// Get all resolved preferences for the user
    /// </summary>
    [HttpGet("resolved")]
    public async Task<ActionResult<Dictionary<string, object>>> GetAllResolvedPreferences()
    {
        var correlationId = GetCorrelationId();
        try
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized(ErrorResponseFactory.CreateUnauthorizedError(correlationId, Request.Path, correlationId));

            var preferences = await _preferenceService.ResolveAllPreferencesAsync(userId.Value);
            return Ok(preferences);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to resolve all preferences");
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "Failed to resolve all preferences", correlationId));
        }
    }

    /// <summary>
    /// Set or update a user preference
    /// </summary>
    [HttpPut("{categoryKey}/{preferenceKey}")]
    public async Task<ActionResult<UserPreferenceDto>> SetUserPreference(
        string categoryKey,
        string preferenceKey,
        [FromBody] object preferenceValue,
        [FromQuery] string dataType = "string",
        [FromQuery] int priority = 100)
    {
        var correlationId = GetCorrelationId();
        try
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized(ErrorResponseFactory.CreateUnauthorizedError(correlationId, Request.Path, correlationId));

            var request = new UpdateUserPreferenceRequest
            {
                CategoryKey = categoryKey,
                PreferenceKey = preferenceKey,
                PreferenceValue = preferenceValue,
                DataType = dataType,
                Priority = priority
            };

            var result = await _preferenceService.SetUserPreferenceAsync(
                userId.Value,
                request,
                GetClientIP(),
                Request.Headers.UserAgent);

            // Notify all user devices of the change (non-blocking - don't fail request if hub fails)
            try
            {
                await _hubService.NotifyPreferenceChanged(userId.Value, categoryKey, preferenceKey, preferenceValue, "updated");
            }
            catch (Exception hubEx)
            {
                _logger.LogWarning(hubEx, "Hub notification failed for preference {CategoryKey}.{PreferenceKey} - preference saved but real-time update skipped", categoryKey, preferenceKey);
            }

            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ErrorResponseFactory.CreateBadRequestError(correlationId, Request.Path, ex.Message, correlationId));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to set user preference {CategoryKey}.{PreferenceKey}", categoryKey, preferenceKey);
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "Failed to set user preference", correlationId));
        }
    }

    /// <summary>
    /// Bulk update multiple preferences
    /// </summary>
    [HttpPut("bulk")]
    public async Task<ActionResult<List<UserPreferenceDto>>> BulkUpdatePreferences([FromBody] BulkUpdatePreferencesRequest request)
    {
        var correlationId = GetCorrelationId();
        try
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized(ErrorResponseFactory.CreateUnauthorizedError(correlationId, Request.Path, correlationId));

            var results = await _preferenceService.BulkUpdatePreferencesAsync(
                userId.Value,
                request,
                GetClientIP(),
                Request.Headers.UserAgent);

            // Notify all user devices of bulk changes (non-blocking - don't fail request if hub fails)
            try
            {
                await _hubService.NotifyBulkPreferencesChanged(userId.Value, results, "bulk_updated");
            }
            catch (Exception hubEx)
            {
                _logger.LogWarning(hubEx, "Hub notification failed for bulk preference update - preferences saved but real-time update skipped");
            }

            return Ok(results);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ErrorResponseFactory.CreateBadRequestError(correlationId, Request.Path, ex.Message, correlationId));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to bulk update preferences");
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "Failed to bulk update preferences", correlationId));
        }
    }

    /// <summary>
    /// Delete a user preference (revert to default)
    /// </summary>
    [HttpDelete("{categoryKey}/{preferenceKey}")]
    public async Task<ActionResult> DeleteUserPreference(string categoryKey, string preferenceKey)
    {
        var correlationId = GetCorrelationId();
        try
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized(ErrorResponseFactory.CreateUnauthorizedError(correlationId, Request.Path, correlationId));

            var deleted = await _preferenceService.DeleteUserPreferenceAsync(
                userId.Value,
                categoryKey,
                preferenceKey,
                GetClientIP(),
                Request.Headers.UserAgent);

            if (!deleted)
                return NotFound(ErrorResponseFactory.CreateNotFoundError(correlationId, Request.Path, "Preference", $"{categoryKey}.{preferenceKey}", correlationId));

            // Notify all user devices of the deletion (non-blocking - don't fail request if hub fails)
            try
            {
                await _hubService.NotifyPreferenceDeleted(userId.Value, categoryKey, preferenceKey);
            }
            catch (Exception hubEx)
            {
                _logger.LogWarning(hubEx, "Hub notification failed for preference deletion {CategoryKey}.{PreferenceKey} - preference deleted but real-time update skipped", categoryKey, preferenceKey);
            }

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete user preference {CategoryKey}.{PreferenceKey}", categoryKey, preferenceKey);
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "Failed to delete user preference", correlationId));
        }
    }

    /// <summary>
    /// Get preference category tree
    /// </summary>
    [HttpGet("categories")]
    public async Task<ActionResult<PreferenceCategoryDto>> GetPreferenceCategories([FromQuery] string? rootCategoryKey = null)
    {
        var correlationId = GetCorrelationId();
        try
        {
            var categoryTree = await _preferenceService.GetPreferenceCategoryTreeAsync(rootCategoryKey);
            return Ok(categoryTree);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get preference categories");
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "Failed to get preference categories", correlationId));
        }
    }

    /// <summary>
    /// Get default preferences for a category
    /// </summary>
    [HttpGet("defaults")]
    public async Task<ActionResult<List<DefaultPreferenceDto>>> GetDefaultPreferences([FromQuery] string? categoryKey = null)
    {
        var correlationId = GetCorrelationId();
        try
        {
            var defaults = await _preferenceService.GetDefaultPreferencesAsync(categoryKey);
            return Ok(defaults);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get default preferences");
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "Failed to get default preferences", correlationId));
        }
    }

    /// <summary>
    /// Export user preferences
    /// </summary>
    [HttpPost("export")]
    public async Task<ActionResult> ExportPreferences([FromBody] PreferenceExportRequest request)
    {
        var correlationId = GetCorrelationId();
        try
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized(ErrorResponseFactory.CreateUnauthorizedError(correlationId, Request.Path, correlationId));

            var exportData = await _preferenceService.ExportUserPreferencesAsync(userId.Value, request);

            var fileName = $"preferences_export_{DateTime.UtcNow:yyyyMMdd_HHmmss}.json";
            return File(System.Text.Encoding.UTF8.GetBytes(exportData), "application/json", fileName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to export preferences");
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "Failed to export preferences", correlationId));
        }
    }

    /// <summary>
    /// Import user preferences
    /// </summary>
    [HttpPost("import")]
    public async Task<ActionResult<List<SystemValidationResult>>> ImportPreferences([FromBody] PreferenceImportRequest request)
    {
        var correlationId = GetCorrelationId();
        try
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized(ErrorResponseFactory.CreateUnauthorizedError(correlationId, Request.Path, correlationId));

            var validationResults = await _preferenceService.ImportUserPreferencesAsync(
                userId.Value,
                request,
                GetClientIP(),
                Request.Headers.UserAgent);

            if (validationResults.Any())
                return BadRequest(validationResults);

            // If successful and not validation-only, notify devices (non-blocking - don't fail request if hub fails)
            if (!request.ValidateOnly)
            {
                try
                {
                    await _hubService.NotifyUserDevices(userId.Value, "Preferences imported successfully", new { ImportedAt = DateTime.UtcNow });
                }
                catch (Exception hubEx)
                {
                    _logger.LogWarning(hubEx, "Hub notification failed for preference import - preferences imported but real-time update skipped");
                }
            }

            return Ok(new { Message = request.ValidateOnly ? "Validation successful" : "Import successful", ValidationResults = validationResults });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(ErrorResponseFactory.CreateBadRequestError(correlationId, Request.Path, ex.Message, correlationId));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to import preferences");
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "Failed to import preferences", correlationId));
        }
    }

    /// <summary>
    /// Validate preference value without saving
    /// </summary>
    [HttpPost("validate")]
    public async Task<ActionResult<bool>> ValidatePreference([FromBody] UpdateUserPreferenceRequest request)
    {
        var correlationId = GetCorrelationId();
        try
        {
            var isValid = await _preferenceService.ValidatePreferenceValueAsync(
                request.CategoryKey,
                request.PreferenceKey,
                request.PreferenceValue,
                request.DataType);

            return Ok(new { IsValid = isValid });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to validate preference");
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "Failed to validate preference", correlationId));
        }
    }

    /// <summary>
    /// Reset all preferences to defaults
    /// </summary>
    [HttpPost("reset")]
    public async Task<ActionResult> ResetPreferences([FromQuery] string? categoryKey = null)
    {
        var correlationId = GetCorrelationId();
        try
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized(ErrorResponseFactory.CreateUnauthorizedError(correlationId, Request.Path, correlationId));

            var preferences = await _preferenceService.GetUserPreferencesAsync(userId.Value, categoryKey);

            foreach (var preference in preferences)
            {
                await _preferenceService.DeleteUserPreferenceAsync(
                    userId.Value,
                    preference.CategoryKey,
                    preference.PreferenceKey,
                    GetClientIP(),
                    Request.Headers.UserAgent);
            }

            // Notify devices of reset (non-blocking - don't fail request if hub fails)
            try
            {
                await _hubService.NotifyUserDevices(userId.Value, "Preferences reset to defaults", new
                {
                    ResetAt = DateTime.UtcNow,
                    CategoryKey = categoryKey,
                    AffectedPreferences = preferences.Count
                });
            }
            catch (Exception hubEx)
            {
                _logger.LogWarning(hubEx, "Hub notification failed for preference reset - preferences reset but real-time update skipped");
            }

            return Ok(new { Message = $"Reset {preferences.Count} preferences to defaults" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to reset preferences");
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "Failed to reset preferences", correlationId));
        }
    }

    /// <summary>
    /// Get preference change history
    /// </summary>
    [HttpGet("history")]
    public async Task<ActionResult> GetPreferenceHistory(
        [FromQuery] string? categoryKey = null,
        [FromQuery] string? preferenceKey = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        var correlationId = GetCorrelationId();
        try
        {
            var userId = GetUserId();
            if (userId == null) return Unauthorized(ErrorResponseFactory.CreateUnauthorizedError(correlationId, Request.Path, correlationId));

            // This would typically be implemented in the preference service
            // For now, return a placeholder response
            return Ok(new { Message = "History endpoint not fully implemented" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get preference history");
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "Failed to get preference history", correlationId));
        }
    }

    private Guid? GetUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(userIdClaim, out var userId) ? userId : null;
    }

    private string GetCorrelationId()
    {
        return HttpContext.GetCorrelationId() ?? HttpContext.TraceIdentifier;
    }

    private string? GetClientIP()
    {
        return HttpContext.Connection.RemoteIpAddress?.ToString() ?? 
               Request.Headers["X-Forwarded-For"].FirstOrDefault() ??
               Request.Headers["X-Real-IP"].FirstOrDefault();
    }
}

/// <summary>
/// Admin controller for managing system-wide preference defaults
/// </summary>
[ApiController]
[Route("api/admin/preferences")]
[Authorize(Roles = "Admin")]
public class AdminPreferencesController : ControllerBase
{
    private readonly IPreferenceService _preferenceService;
    private readonly ILogger<AdminPreferencesController> _logger;

    public AdminPreferencesController(IPreferenceService preferenceService, ILogger<AdminPreferencesController> logger)
    {
        _preferenceService = preferenceService;
        _logger = logger;
    }

    private string GetCorrelationId()
    {
        return HttpContext.GetCorrelationId() ?? HttpContext.TraceIdentifier;
    }

    /// <summary>
    /// Seed default preferences
    /// </summary>
    [HttpPost("seed")]
    public async Task<ActionResult> SeedDefaultPreferences()
    {
        var correlationId = GetCorrelationId();
        try
        {
            await _preferenceService.SeedDefaultPreferencesAsync();
            return Ok(new { Message = "Default preferences seeded successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to seed default preferences");
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "Failed to seed default preferences", correlationId));
        }
    }

    /// <summary>
    /// Get all default preferences
    /// </summary>
    [HttpGet("defaults")]
    public async Task<ActionResult<List<DefaultPreferenceDto>>> GetAllDefaults()
    {
        var correlationId = GetCorrelationId();
        try
        {
            var defaults = await _preferenceService.GetDefaultPreferencesAsync();
            return Ok(defaults);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get all default preferences");
            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(correlationId, Request.Path, "Failed to get all default preferences", correlationId));
        }
    }
}