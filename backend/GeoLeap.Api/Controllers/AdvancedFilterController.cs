using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.ComponentModel.DataAnnotations;
using System.Security.Claims;

namespace GeoLeap.Api.Controllers;

/// <summary>
/// Controller for advanced search filtering capabilities
/// </summary>
[ApiController]
[Route("api/filters")]
[Authorize]
public class AdvancedFilterController : ControllerBase
{
    private readonly IAdvancedFilterService _advancedFilterService;
    private readonly ILoggerService _loggerService;
    private readonly IRbacService _rbacService;

    public AdvancedFilterController(
        IAdvancedFilterService advancedFilterService,
        ILoggerService loggerService,
        IRbacService rbacService)
    {
        _advancedFilterService = advancedFilterService;
        _loggerService = loggerService;
        _rbacService = rbacService;
    }

    /// <summary>
    /// Get available filter options based on current search context
    /// </summary>
    /// <param name="request">Filter options request</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Available filter options with counts</returns>
    [HttpPost("options")]
    [AllowAnonymous]
    public async Task<IActionResult> GetFilterOptions(
        [FromBody] FilterOptionsRequest request,
        CancellationToken cancellationToken = default)
    {
        var correlationId = HttpContext.TraceIdentifier;

        try
        {
            _loggerService.LogBusinessEvent("GetFilterOptions", new 
            { 
                CorrelationId = correlationId,
                ContentType = request.ContentType,
                Language = request.Language
            });

            var response = await _advancedFilterService.GetFilterOptionsAsync(request, correlationId);

            _loggerService.LogBusinessEvent("FilterOptionsRetrieved", new 
            { 
                CorrelationId = correlationId,
                GenreCount = response.Genres.Count,
                ServiceCount = response.StreamingServices.Count
            });

            return Ok(response);
        }
        catch (Exception ex)
        {
            _loggerService.LogSecurityEvent("FilterOptionsError", "system", ex.Message, new 
            { 
                CorrelationId = correlationId,
                ContentType = request.ContentType
            });

            return StatusCode(500, new ApiErrorResponse
            {
                CorrelationId = correlationId,
                Error = new ApiError
                {
                    Code = "FILTER_OPTIONS_ERROR",
                    Message = "An error occurred while retrieving filter options",
                    Details = ex.Message
                },
                Timestamp = DateTime.UtcNow,
                Path = Request.Path
            });
        }
    }

    /// <summary>
    /// Validate filter parameters for a search request
    /// </summary>
    /// <param name="request">Global search request with filters to validate</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Filter validation result</returns>
    [HttpPost("validate")]
    [AllowAnonymous]
    public async Task<IActionResult> ValidateFilters(
        [FromBody] GlobalSearchRequest request,
        CancellationToken cancellationToken = default)
    {
        var correlationId = HttpContext.TraceIdentifier;

        try
        {
            _loggerService.LogBusinessEvent("ValidatingFilters", new 
            { 
                CorrelationId = correlationId,
                Query = request.Query
            });

            var validation = await _advancedFilterService.ValidateFiltersAsync(request, correlationId);

            _loggerService.LogBusinessEvent("FilterValidationCompleted", new 
            { 
                CorrelationId = correlationId,
                IsValid = validation.IsValid,
                ErrorCount = validation.Errors.Count
            });

            return Ok(validation);
        }
        catch (Exception ex)
        {
            _loggerService.LogSecurityEvent("FilterValidationError", "system", ex.Message, new 
            { 
                CorrelationId = correlationId
            });

            return StatusCode(500, new ApiErrorResponse
            {
                CorrelationId = correlationId,
                Error = new ApiError
                {
                    Code = "FILTER_VALIDATION_ERROR",
                    Message = "An error occurred while validating filters",
                    Details = ex.Message
                },
                Timestamp = DateTime.UtcNow,
                Path = Request.Path
            });
        }
    }

    /// <summary>
    /// Generate filter suggestions to improve search results
    /// </summary>
    /// <param name="request">Search request to generate suggestions for</param>
    /// <param name="resultCount">Current number of search results</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>List of filter suggestions</returns>
    [HttpPost("suggestions")]
    [AllowAnonymous]
    public async Task<IActionResult> GetFilterSuggestions(
        [FromBody] GlobalSearchRequest request,
        [FromQuery] int resultCount = 0,
        CancellationToken cancellationToken = default)
    {
        var correlationId = HttpContext.TraceIdentifier;

        try
        {
            _loggerService.LogBusinessEvent("GeneratingFilterSuggestions", new 
            { 
                CorrelationId = correlationId,
                Query = request.Query,
                ResultCount = resultCount
            });

            var suggestions = await _advancedFilterService.GenerateFilterSuggestionsAsync(
                request, resultCount, correlationId);

            _loggerService.LogBusinessEvent("FilterSuggestionsGenerated", new 
            { 
                CorrelationId = correlationId,
                SuggestionCount = suggestions.Count
            });

            return Ok(suggestions);
        }
        catch (Exception ex)
        {
            _loggerService.LogSecurityEvent("FilterSuggestionsError", "system", ex.Message, new 
            { 
                CorrelationId = correlationId
            });

            return StatusCode(500, new ApiErrorResponse
            {
                CorrelationId = correlationId,
                Error = new ApiError
                {
                    Code = "FILTER_SUGGESTIONS_ERROR",
                    Message = "An error occurred while generating filter suggestions",
                    Details = ex.Message
                },
                Timestamp = DateTime.UtcNow,
                Path = Request.Path
            });
        }
    }

    /// <summary>
    /// Analyze applied filters and get summary information
    /// </summary>
    /// <param name="request">Search request with filters to analyze</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Applied filters analysis</returns>
    [HttpPost("analyze")]
    [AllowAnonymous]
    public async Task<IActionResult> AnalyzeAppliedFilters(
        [FromBody] GlobalSearchRequest request,
        CancellationToken cancellationToken = default)
    {
        var correlationId = HttpContext.TraceIdentifier;

        try
        {
            _loggerService.LogBusinessEvent("AnalyzingFilters", new 
            { 
                CorrelationId = correlationId,
                Query = request.Query
            });

            var analysis = await _advancedFilterService.AnalyzeAppliedFiltersAsync(request, correlationId);

            _loggerService.LogBusinessEvent("FilterAnalysisCompleted", new 
            { 
                CorrelationId = correlationId,
                TotalFilters = analysis.TotalFiltersApplied,
                Complexity = analysis.Complexity
            });

            return Ok(analysis);
        }
        catch (Exception ex)
        {
            _loggerService.LogSecurityEvent("FilterAnalysisError", "system", ex.Message, new 
            { 
                CorrelationId = correlationId
            });

            return StatusCode(500, new ApiErrorResponse
            {
                CorrelationId = correlationId,
                Error = new ApiError
                {
                    Code = "FILTER_ANALYSIS_ERROR",
                    Message = "An error occurred while analyzing filters",
                    Details = ex.Message
                },
                Timestamp = DateTime.UtcNow,
                Path = Request.Path
            });
        }
    }

    /// <summary>
    /// Optimize filters for better performance (Admin only)
    /// </summary>
    /// <param name="request">Search request with filters to optimize</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Optimized search request</returns>
    [HttpPost("optimize")]
    public async Task<IActionResult> OptimizeFilters(
        [FromBody] GlobalSearchRequest request,
        CancellationToken cancellationToken = default)
    {
        var correlationId = HttpContext.TraceIdentifier;
        var userId = GetUserId();

        try
        {
            // Check admin permissions
            var hasPermission = await _rbacService.HasPermissionAsync(userId, "filter.optimize");

            if (!hasPermission)
            {
                _loggerService.LogSecurityEvent("UnauthorizedFilterOptimization", userId.ToString(), "User attempted filter optimization without permission", new 
                { 
                    CorrelationId = correlationId,
                    User = HttpContext.User.Identity?.Name
                });

                return Forbid();
            }

            _loggerService.LogBusinessEvent("OptimizingFilters", new 
            { 
                CorrelationId = correlationId,
                Query = request.Query,
                UserId = userId
            });

            var optimizedRequest = await _advancedFilterService.OptimizeFiltersAsync(request, correlationId);

            _loggerService.LogBusinessEvent("FilterOptimizationCompleted", new 
            { 
                CorrelationId = correlationId,
                UserId = userId
            });

            return Ok(optimizedRequest);
        }
        catch (Exception ex)
        {
            _loggerService.LogSecurityEvent("FilterOptimizationError", userId.ToString(), ex.Message, new 
            { 
                CorrelationId = correlationId
            });

            return StatusCode(500, new ApiErrorResponse
            {
                CorrelationId = correlationId,
                Error = new ApiError
                {
                    Code = "FILTER_OPTIMIZATION_ERROR",
                    Message = "An error occurred while optimizing filters",
                    Details = ex.Message
                },
                Timestamp = DateTime.UtcNow,
                Path = Request.Path
            });
        }
    }

    /// <summary>
    /// Clear filter cache (Admin only)
    /// </summary>
    /// <param name="cacheKeys">Specific cache keys to clear (optional)</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Success response</returns>
    [HttpPost("cache/clear")]
    public async Task<IActionResult> ClearFilterCache(
        [FromBody] List<string>? cacheKeys = null,
        CancellationToken cancellationToken = default)
    {
        var correlationId = HttpContext.TraceIdentifier;
        var userId = GetUserId();

        try
        {
            // Check admin permissions
            var hasPermission = await _rbacService.HasPermissionAsync(userId, "cache.clear");

            if (!hasPermission)
            {
                _loggerService.LogSecurityEvent("UnauthorizedCacheClear", userId.ToString(), "User attempted cache clearing without permission", new 
                { 
                    CorrelationId = correlationId,
                    User = HttpContext.User.Identity?.Name
                });

                return Forbid();
            }

            _loggerService.LogBusinessEvent("ClearingFilterCache", new 
            { 
                CorrelationId = correlationId,
                SpecificKeys = cacheKeys?.Count ?? 0,
                UserId = userId
            });

            await _advancedFilterService.InvalidateFilterCacheAsync(cacheKeys, correlationId);

            _loggerService.LogBusinessEvent("FilterCacheCleared", new 
            { 
                CorrelationId = correlationId,
                UserId = userId
            });

            return Ok(new { message = "Filter cache cleared successfully", correlationId });
        }
        catch (Exception ex)
        {
            _loggerService.LogSecurityEvent("FilterCacheClearError", userId.ToString(), ex.Message, new 
            { 
                CorrelationId = correlationId
            });

            return StatusCode(500, new ApiErrorResponse
            {
                CorrelationId = correlationId,
                Error = new ApiError
                {
                    Code = "CACHE_CLEAR_ERROR",
                    Message = "An error occurred while clearing the filter cache",
                    Details = ex.Message
                },
                Timestamp = DateTime.UtcNow,
                Path = Request.Path
            });
        }
    }

    private Guid GetUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            throw new UnauthorizedAccessException("User ID not found in token");
        }
        return userId;
    }
}