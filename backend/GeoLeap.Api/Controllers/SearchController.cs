using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.RateLimiting;
using System.ComponentModel.DataAnnotations;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using GeoLeap.Api.Extensions;
using GeoLeap.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace GeoLeap.Api.Controllers;

/// <summary>
/// Controller for advanced content search with comprehensive filtering and sorting capabilities
/// </summary>
[ApiController]
[Route("api/[controller]")]
[EnableRateLimiting("SearchPolicy")]
public class SearchController : ControllerBase
{
    // BUG FIX: Regex for sanitizing search input - removes HTML tags and special characters
    private static readonly System.Text.RegularExpressions.Regex HtmlTagRegex =
        new(@"<[^>]*>", System.Text.RegularExpressions.RegexOptions.Compiled);

    /// <summary>
    /// Sanitize search input to prevent XSS and API errors from HTML/script tags
    /// </summary>
    private static string SanitizeSearchInput(string? input)
    {
        if (string.IsNullOrWhiteSpace(input))
            return string.Empty;

        // Remove HTML tags (including script tags)
        var sanitized = HtmlTagRegex.Replace(input, string.Empty);

        // Remove any remaining angle brackets
        sanitized = sanitized.Replace("<", "").Replace(">", "");

        // Trim and limit length
        return sanitized.Trim();
    }

    private readonly ISearchService _searchService;
    private readonly IAdvancedFilterService _advancedFilterService;
    private readonly ILogger<SearchController> _logger;
    private readonly ApplicationDbContext _context;
    private readonly IStreamingAvailabilityClient _streamingClient;
    private readonly IUserStreamingSubscriptionService _subscriptionService;
    private readonly IGeoLocationService _geoLocationService;
    private readonly ISearchLimitService _searchLimitService;
    private readonly IAnonymousUserService _anonymousUserService;
    private readonly IWebHostEnvironment _env;

    public SearchController(
        ISearchService searchService,
        IAdvancedFilterService advancedFilterService,
        ILogger<SearchController> logger,
        ApplicationDbContext context,
        IStreamingAvailabilityClient streamingClient,
        IUserStreamingSubscriptionService subscriptionService,
        IGeoLocationService geoLocationService,
        ISearchLimitService searchLimitService,
        IAnonymousUserService anonymousUserService,
        IWebHostEnvironment env)
    {
        _searchService = searchService;
        _advancedFilterService = advancedFilterService;
        _logger = logger;
        _context = context;
        _streamingClient = streamingClient;
        _subscriptionService = subscriptionService;
        _geoLocationService = geoLocationService;
        _searchLimitService = searchLimitService;
        _anonymousUserService = anonymousUserService;
        _env = env;
    }

    /// <summary>
    /// Global search endpoint for POST requests with full request body support (Frontend uses this)
    /// </summary>
    [HttpPost("global")]
    [AllowAnonymous]
    [Produces("application/json")]
    public async Task<ActionResult<GlobalSearchResponse>> SearchGlobalContent(
        [FromBody] GlobalSearchRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;

            Console.WriteLine($"*** SearchController.SearchGlobalContent called with Query='{request?.Query}' ***");

            // DEBUG: Log the incoming request details
            _logger.LogInformation("DEBUG: SearchGlobalContent called. Request.Query='{Query}', Request.ContentType='{ContentType}'",
                request?.Query, Request?.ContentType);

            // Validate request
            // FIXED: Week 1 Day 5 - Null reference warnings (CS8601/CS8602)
            if (request == null || string.IsNullOrWhiteSpace(request.Query) || request.Query.Length > 500)
            {
                _logger.LogWarning("DEBUG: Query validation failed. Query='{Query}', IsNullOrWhiteSpace={IsNullOrWhiteSpace}, Length={Length}",
                    request?.Query, string.IsNullOrWhiteSpace(request?.Query), request?.Query?.Length ?? 0);
                return this.StandardBadRequest("Query must be between 1 and 500 characters");
            }

            // BUG FIX: Sanitize search input to prevent XSS and API errors from HTML/script tags
            var sanitizedQuery = SanitizeSearchInput(request.Query);
            if (string.IsNullOrWhiteSpace(sanitizedQuery))
            {
                _logger.LogWarning("Search query was empty after sanitization. Original: '{OriginalQuery}'", request.Query);
                // Return empty results instead of error for better UX
                return Ok(new GlobalSearchResponse
                {
                    Query = request.Query,
                    Results = new List<ContentSummary>(),
                    TotalResults = 0,
                    Page = 1,
                    PageSize = request.PageSize,
                    HasMore = false,
                    SearchedAt = DateTime.UtcNow,
                    ResponseTime = TimeSpan.Zero,
                    Metadata = new SearchMetadata
                    {
                        CorrelationId = correlationId,
                        UsedCache = false,
                        FuzzyMatchUsed = false
                    }
                });
            }
            // Update request with sanitized query
            request.Query = sanitizedQuery;

            // 2-Step Conversion Funnel: Check search limits via Redis
            // Anonymous: 1 search total → signup_required
            // Free: 5 searches/day → upgrade_required
            // Premium: Unlimited
            var userIdString = User.FindFirst("sub")?.Value ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            Guid? userId = null;
            if (!string.IsNullOrEmpty(userIdString) && Guid.TryParse(userIdString, out var parsedUserId))
            {
                userId = parsedUserId;
            }

            // Get anonymous tracking identifiers
            var anonymousId = _anonymousUserService.GetAnonymousId(HttpContext);
            var ipFingerprint = _anonymousUserService.GenerateIpFingerprint(HttpContext);

            // Check and increment search limits
            var limitResult = await _searchLimitService.CheckAndIncrementAsync(
                userId, anonymousId, ipFingerprint, cancellationToken);

            if (!limitResult.CanSearch)
            {
                _logger.LogInformation(
                    "Search blocked: UserId={UserId}, AnonId={AnonId}, Reason={Reason}, Used={Used}/{Limit}",
                    userId, anonymousId?.Substring(0, Math.Min(8, anonymousId?.Length ?? 0)),
                    limitResult.BlockReason, limitResult.SearchesUsed, limitResult.SearchLimit);

                var blockMessage = limitResult.BlockReason == "signup_required"
                    ? "Create a free account to get 5 searches per day"
                    : "You've used all 5 free searches today. Upgrade for unlimited searches.";

                return StatusCode(403, new SearchBlockedResponse
                {
                    BlockReason = limitResult.BlockReason ?? "unknown",
                    SearchesUsed = limitResult.SearchesUsed,
                    SearchLimit = limitResult.SearchLimit,
                    ResetsAt = limitResult.ResetsAt,
                    UpgradeUrl = "/pricing",
                    Message = blockMessage
                });
            }

            // Get user's subscribed services for filtering/ranking
            if (userId.HasValue)
            {
                try
                {
                    var userServiceIds = await _subscriptionService.GetUserServiceIdsAsync(userId.Value, cancellationToken);
                    if (userServiceIds?.Any() == true)
                    {
                        request.UserSubscribedServices = userServiceIds;
                    }
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to get user subscriptions for search enrichment");
                    // Continue without subscription data - non-blocking
                }
            }
            else
            {
                // For anonymous users, check X-User-Services header
                var servicesHeader = Request.Headers["X-User-Services"].FirstOrDefault();
                if (!string.IsNullOrEmpty(servicesHeader))
                {
                    request.UserSubscribedServices = servicesHeader
                        .Split(',', StringSplitOptions.RemoveEmptyEntries)
                        .Select(s => s.Trim())
                        .Where(s => !string.IsNullOrEmpty(s))
                        .ToList();
                }
            }

            // Execute search
            var searchResults = await _searchService.SearchGlobalContentAsync(
                request,
                correlationId,
                userIdString,
                cancellationToken);

            _logger.LogDebug("Search history - UserId: {UserId}, IsAuthenticated: {IsAuthenticated}",
                userId, User.Identity?.IsAuthenticated);

            if (userId.HasValue)
            {
                _logger.LogInformation("Recording search for user {UserId}: {Query}", userId, request.Query);
                try
                {
                    await _searchService.RecordSearchAsync(userId.Value, request.Query, searchResults.TotalResults, "US", CancellationToken.None);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to record search history for user {UserId}", userId);
                }
            }
            else
            {
                _logger.LogDebug("Anonymous search - not recording history. AnonId: {AnonId}",
                    anonymousId?.Substring(0, Math.Min(8, anonymousId?.Length ?? 0)));
            }

            return Ok(searchResults);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during global content search");
            return StatusCode(500, new { message = "An error occurred while searching content" });
        }
    }

    /// <summary>
    /// Search content with advanced filtering, sorting, and pagination
    /// </summary>
    [HttpGet]
    [AllowAnonymous]
    public async Task<ActionResult<GlobalSearchResponse>> SearchContent(
        [FromQuery, Required] string query,
        [FromQuery] string contentType = "all",
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string[]? genres = null,
        [FromQuery] string[]? services = null,
        [FromQuery] decimal? minRating = null,
        [FromQuery] decimal? maxRating = null,
        [FromQuery] int? minYear = null,
        [FromQuery] int? maxYear = null,
        [FromQuery] int? minRuntime = null,
        [FromQuery] int? maxRuntime = null,
        [FromQuery] string? language = null,
        [FromQuery] string region = "US",
        [FromQuery] string sortBy = "relevance",
        [FromQuery] string sortDirection = "desc",
        [FromQuery] bool includeAdult = false,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;

            // Input validation
            if (string.IsNullOrWhiteSpace(query) || query.Length > 500)
            {
                return this.StandardBadRequest("Query must be between 1 and 500 characters");
            }

            if (page < 1 || pageSize < 1 || pageSize > 100)
            {
                return this.StandardBadRequest("Invalid pagination parameters");
            }

            // Parse content type
            var parsedContentType = contentType.ToLowerInvariant() switch
            {
                "movie" => ContentType.Movie,
                "tv" or "series" or "tvseries" => ContentType.TvSeries,
                "documentary" => ContentType.Documentary,
                "person" => ContentType.Person,
                "all" => ContentType.All,
                _ => ContentType.All
            };

            // Build search request
            var searchRequest = new GlobalSearchRequest
            {
                Query = query.Trim(),
                // Only set ContentType if it's not "All" - otherwise leave as null to avoid filtering
                ContentType = parsedContentType == ContentType.All ? null : parsedContentType,
                Region = region,
                Page = page,
                PageSize = pageSize,
                SortBy = sortBy,
                SortDirection = sortDirection.ToLowerInvariant() == "asc" ? SortDirection.Ascending : SortDirection.Descending,
                IncludeAdult = includeAdult,
                Filters = new ContentSearchFilters
                {
                    Genres = genres?.ToList(),
                    StreamingServices = services?.ToList(),
                    MinRating = minRating,
                    MaxRating = maxRating,
                    MinYear = minYear,
                    MaxYear = maxYear,
                    MinRuntime = minRuntime,
                    MaxRuntime = maxRuntime,
                    Language = language,
                    Country = region,
                    IncludeAdult = includeAdult
                }
            };

            // Validate filters
            var validationResult = await _advancedFilterService.ValidateFiltersAsync(searchRequest, correlationId);
            if (!validationResult.IsValid)
            {
                return BadRequest(new 
                { 
                    message = "Invalid filters", 
                    errors = validationResult.Errors,
                    warnings = validationResult.Warnings 
                });
            }

            // Execute search
            var searchResults = await _searchService.SearchGlobalContentAsync(
                searchRequest, 
                correlationId, 
                null, 
                cancellationToken);

            // Log search metrics
            _logger.LogInformation("Search completed: Query={Query}, Results={ResultCount}, Time={ResponseTime}ms",
                query, searchResults.TotalResults, searchResults.ResponseTime.TotalMilliseconds);

            var userIdString = User.FindFirst("sub")?.Value ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            _logger.LogDebug("Search history - UserIdString: {UserIdString}, IsAuthenticated: {IsAuthenticated}, Claims: {Claims}",
                userIdString, User.Identity?.IsAuthenticated, string.Join(", ", User.Claims.Select(c => $"{c.Type}={c.Value}")));

            if (!string.IsNullOrEmpty(userIdString) && Guid.TryParse(userIdString, out var userId))
            {
                _logger.LogInformation("Recording search for user {UserId}: {Query}", userId, query);
                try
                {
                    await _searchService.RecordSearchAsync(userId, query, searchResults.TotalResults, region, CancellationToken.None);
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to record search history for user {UserId}", userId);
                }
            }
            else
            {
                _logger.LogWarning("Unable to record search - UserIdString: {UserIdString}, User authenticated: {IsAuthenticated}",
                    userIdString, User.Identity?.IsAuthenticated);
            }

            return Ok(searchResults);
        }
        catch (ArgumentException ex)
        {
            _logger.LogWarning(ex, "Invalid search parameters: {Message}", ex.Message);
            return this.StandardBadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during content search");
            return StatusCode(500, new { message = "An error occurred while searching content" });
        }
    }

    /// <summary>
    /// Advanced search with complex filter combinations
    /// </summary>
    [HttpPost("advanced")]
    [AllowAnonymous]
    public async Task<ActionResult<GlobalSearchResponse>> AdvancedSearch(
        [FromBody] GlobalSearchRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;

            // Input validation
            if (string.IsNullOrWhiteSpace(request.Query) || request.Query.Length > 500)
            {
                return this.StandardBadRequest("Query must be between 1 and 500 characters");
            }

            if (request.Page < 1 || request.PageSize < 1 || request.PageSize > 100)
            {
                return this.StandardBadRequest("Invalid pagination parameters");
            }

            // Validate filters
            var validationResult = await _advancedFilterService.ValidateFiltersAsync(request, correlationId);
            if (!validationResult.IsValid)
            {
                return BadRequest(new 
                { 
                    message = "Invalid filters", 
                    errors = validationResult.Errors,
                    warnings = validationResult.Warnings,
                    suggestions = validationResult.Suggestions 
                });
            }

            // Execute search
            var searchResults = await _searchService.SearchGlobalContentAsync(
                request,
                correlationId,
                null,
                cancellationToken);

            // Record search history for authenticated users (fire and forget - don't block response)
            var userIdString = User.FindFirst("sub")?.Value ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            _logger.LogDebug("Advanced search history - UserIdString: {UserIdString}, IsAuthenticated: {IsAuthenticated}",
                userIdString, User.Identity?.IsAuthenticated);

            if (!string.IsNullOrEmpty(userIdString) && Guid.TryParse(userIdString, out var userId))
            {
                _logger.LogInformation("Recording advanced search for user {UserId}: {Query}", userId, request.Query);
                _ = _searchService.RecordSearchAsync(userId, request.Query, searchResults.TotalResults, request.Region ?? "US", CancellationToken.None);
            }
            else
            {
                _logger.LogWarning("Unable to record advanced search - UserIdString: {UserIdString}, User authenticated: {IsAuthenticated}",
                    userIdString, User.Identity?.IsAuthenticated);
            }

            return Ok(searchResults);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during advanced search");
            return StatusCode(500, new { message = "An error occurred while performing advanced search" });
        }
    }

    /// <summary>
    /// Get search suggestions based on partial query
    /// </summary>
    [HttpGet("suggestions")]
    [AllowAnonymous]
    public async Task<ActionResult<List<SearchSuggestion>>> GetSearchSuggestions(
        [FromQuery, Required] string query,
        [FromQuery] int maxResults = 10,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // BUG FIX: Sanitize input to prevent XSS/API errors
            var sanitizedQuery = SanitizeSearchInput(query);
            if (string.IsNullOrWhiteSpace(sanitizedQuery) || sanitizedQuery.Length < 2)
            {
                return Ok(new List<SearchSuggestion>()); // Return empty for invalid/sanitized queries
            }

            var correlationId = HttpContext.TraceIdentifier;
            var suggestions = await _searchService.GetSearchSuggestionsAsync(sanitizedQuery, correlationId, cancellationToken);

            return Ok(suggestions.Take(maxResults).ToList());
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting search suggestions");
            return Ok(new List<SearchSuggestion>()); // Return empty instead of 500 for better UX
        }
    }

    /// <summary>
    /// Get autocomplete suggestions for search input
    /// </summary>
    [HttpGet("autocomplete")]
    [AllowAnonymous]
    public async Task<ActionResult<List<string>>> GetAutocompleteSuggestions(
        [FromQuery, Required] string query,
        [FromQuery] int maxResults = 10,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // BUG FIX: Sanitize input to prevent XSS/API errors from HTML/script tags
            var sanitizedQuery = SanitizeSearchInput(query);
            if (string.IsNullOrWhiteSpace(sanitizedQuery) || sanitizedQuery.Length < 2)
            {
                return Ok(new List<string>()); // Return empty for invalid/sanitized queries
            }

            var correlationId = HttpContext.TraceIdentifier;
            var suggestions = await _searchService.GetAutocompleteSuggestionsAsync(
                sanitizedQuery, maxResults, correlationId, cancellationToken);

            return Ok(suggestions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting autocomplete suggestions");
            return Ok(new List<string>()); // Return empty instead of 500 for better UX
        }
    }

    /// <summary>
    /// Get enhanced autocomplete suggestions with rich metadata
    /// </summary>
    [HttpGet("autocomplete/enhanced")]
    [AllowAnonymous]
    public async Task<IActionResult> GetEnhancedAutocompleteSuggestions(
        [FromQuery, Required] string query,
        [FromQuery] int maxResults = 8,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // BUG FIX: Sanitize input to prevent XSS/API errors from HTML/script tags
            var sanitizedQuery = SanitizeSearchInput(query);
            if (string.IsNullOrWhiteSpace(sanitizedQuery) || sanitizedQuery.Length < 2)
            {
                return Ok(new List<EnhancedAutocompleteSuggestion>());
            }

            var correlationId = HttpContext.TraceIdentifier;
            var basicSuggestions = await _searchService.GetAutocompleteSuggestionsAsync(
                sanitizedQuery, maxResults, correlationId, cancellationToken);

            // Transform basic suggestions to enhanced format
            var enhancedSuggestions = basicSuggestions.Select((suggestion, index) => new EnhancedAutocompleteSuggestion
            {
                Text = suggestion,
                Type = DetermineSuggestionType(suggestion),
                Score = 1.0 - (index * 0.1), // Higher score for earlier results
                Genres = new List<string>(),
                EstimatedResults = 0,
                Metadata = new Dictionary<string, object>()
            }).ToList();

            return Ok(enhancedSuggestions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting enhanced autocomplete suggestions");
            return Ok(new List<EnhancedAutocompleteSuggestion>()); // Return empty list instead of error for autocomplete
        }
    }

    private static string DetermineSuggestionType(string suggestion)
    {
        // Simple heuristic to determine suggestion type
        if (suggestion.Contains("genre:", StringComparison.OrdinalIgnoreCase) ||
            new[] { "action", "comedy", "drama", "thriller", "horror", "sci-fi", "romance" }
            .Any(g => suggestion.IndexOf(g, StringComparison.OrdinalIgnoreCase) >= 0))
        {
            return "Genre";
        }

        if (suggestion.Contains("actor:", StringComparison.OrdinalIgnoreCase) ||
            suggestion.Contains("director:", StringComparison.OrdinalIgnoreCase))
        {
            return "Person";
        }

        return "Title";
    }

    /// <summary>
    /// DEBUG: Simple test endpoint to verify JSON binding
    /// </summary>
    [HttpPost("debug")]
    [AllowAnonymous]
    public ActionResult<GlobalSearchRequest> DebugSearchBinding([FromBody] GlobalSearchRequest request)
    {
        if (!_env.IsDevelopment())
            return NotFound();

        _logger.LogInformation("DEBUG: DebugSearchBinding called with Query='{Query}'", request?.Query);
        return Ok(request);
    }

    /// <summary>
    /// MINIMAL TEST: Force chunked encoding by setting headers
    /// </summary>
    [HttpGet("trending-test")]
    [AllowAnonymous]
    public async Task GetTrendingSearchesTest()
    {
        _logger.LogInformation("Minimal test endpoint - forcing chunked encoding");
        var testData = new List<Models.TrendingSearch>
        {
            new Models.TrendingSearch { Query = "test", SearchCount = 100, TrendingScore = 1.5m }
        };

        var json = System.Text.Json.JsonSerializer.Serialize(testData, new System.Text.Json.JsonSerializerOptions
        {
            PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase
        });

        // FORCE chunked encoding by removing Content-Length header
        Response.Headers.Remove("Content-Length");
        Response.ContentType = "application/json; charset=utf-8";
        Response.StatusCode = 200;

        await Response.StartAsync();  // Start the response
        await Response.WriteAsync(json);
        await Response.CompleteAsync(); // Complete the response

        _logger.LogInformation("Chunked write complete, JSON length: {Length}", json.Length);
    }

  
    /// <summary>
    /// Get trending searches for discovery
    /// </summary>
    [HttpGet("trending")]
    [AllowAnonymous]
    [Produces("application/json")]
    public async Task<IActionResult> GetTrendingSearches(
        [FromQuery] int limit = 10,
        [FromQuery] string? region = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation("GetTrendingSearches called with limit={Limit}, region={Region}", limit, region);
            var trendingSearches = await _searchService.GetTrendingSearchesAsync(limit, region, cancellationToken);
            _logger.LogInformation("Retrieved {Count} trending searches", trendingSearches?.Count ?? 0);

            var results = trendingSearches ?? new List<Models.TrendingSearch>();

            // FIX: Use ContentResult instead of OkObjectResult to bypass response buffering bug
            var json = System.Text.Json.JsonSerializer.Serialize(results, new System.Text.Json.JsonSerializerOptions
            {
                PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase
            });

            return Content(json, "application/json");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting trending searches");
            return Content("[]", "application/json");
        }
    }

    /// <summary>
    /// Get user's search history
    /// </summary>
    [HttpGet("history")]
    [AllowAnonymous] // Allow anonymous users, will return empty for non-authenticated
    [Produces("application/json")]
    public async Task<IActionResult> GetSearchHistory(
        [FromQuery] int maxResults = 20,
        CancellationToken cancellationToken = default)
    {
        try
        {
            // If user is not authenticated, return empty JSON array
            var userIdString = User.FindFirst("sub")?.Value ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdString))
            {
                return Ok(new List<Models.SearchHistoryItem>());
            }

            if (!Guid.TryParse(userIdString, out var userId))
            {
                return Ok(new List<Models.SearchHistoryItem>());
            }

            // Query search history from database
            var history = await _context.SearchHistories
                .Where(sh => sh.UserId == userId)
                .OrderByDescending(sh => sh.SearchedAt)
                .Take(maxResults)
                .Select(sh => new Models.SearchHistoryItem
                {
                    Id = sh.Id.ToString(),
                    Query = sh.Query,
                    Timestamp = sh.SearchedAt,
                    ResultsFound = sh.ResultCount
                })
                .ToListAsync(cancellationToken);

            return Ok(history);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting search history");
            return Ok(new List<Models.SearchHistoryItem>()); // Return empty array instead of error for better UX
        }
    }

    /// <summary>
    /// Clear user's search history
    /// </summary>
    [HttpDelete("history")]
    [Authorize] // Require authentication to delete history
    public async Task<ActionResult> ClearSearchHistory()
    {
        try
        {
            var userIdString = User.FindFirst("sub")?.Value ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userIdString))
            {
                return Unauthorized();
            }

            if (!Guid.TryParse(userIdString, out var userId))
            {
                return Unauthorized();
            }

            // Delete all search history for the user
            var historyToDelete = await _context.SearchHistories
                .Where(sh => sh.UserId == userId)
                .ToListAsync();

            _context.SearchHistories.RemoveRange(historyToDelete);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Search history cleared successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error clearing search history");
            return StatusCode(500, new { message = "An error occurred while clearing search history" });
        }
    }

    /// <summary>
    /// Get popular content across all categories
    /// </summary>
    [HttpGet("popular")]
    [AllowAnonymous]
    public async Task<ActionResult<List<GlobalSearchResult>>> GetPopularContent(
        [FromQuery] string contentType = "all",
        [FromQuery] string region = "US",
        [FromQuery] int limit = 20,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var parsedContentType = contentType.ToLowerInvariant() switch
            {
                "movie" => ContentType.Movie,
                "tv" or "series" or "tvseries" => ContentType.TvSeries,
                "documentary" => ContentType.Documentary,
                "all" => ContentType.All,
                _ => ContentType.All
            };

            var correlationId = HttpContext.TraceIdentifier;
            var popularContent = await _searchService.GetPopularContentAsync(
                parsedContentType, region, limit, correlationId, cancellationToken);
            
            return Ok(popularContent);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting popular content");
            return StatusCode(500, new { message = "An error occurred while getting popular content" });
        }
    }

    /// <summary>
    /// Get available filter options for the frontend
    /// </summary>
    [HttpGet("filter-options")]
    [AllowAnonymous]
    public async Task<ActionResult<FilterOptionsResponse>> GetFilterOptions(
        [FromQuery] string contentType = "all",
        [FromQuery] string region = "US",
        CancellationToken cancellationToken = default)
    {
        try
        {
            var request = new FilterOptionsRequest
            {
                ContentType = contentType.ToLowerInvariant() switch
                {
                    "movie" => ContentType.Movie,
                    "tv" or "series" or "tvseries" => ContentType.TvSeries,
                    "documentary" => ContentType.Documentary,
                    "all" => ContentType.All,
                    _ => ContentType.All
                },
                Region = region
            };

            var correlationId = HttpContext.TraceIdentifier;
            var filterOptions = await _advancedFilterService.GetFilterOptionsAsync(request, correlationId);
            
            return Ok(filterOptions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting filter options");
            return StatusCode(500, new { message = "An error occurred while getting filter options" });
        }
    }

    /// <summary>
    /// Generate filter suggestions to improve search results
    /// </summary>
    [HttpPost("filter-suggestions")]
    [AllowAnonymous]
    public async Task<ActionResult<List<FilterSuggestion>>> GetFilterSuggestions(
        [FromBody] GlobalSearchRequest request,
        [FromQuery] int currentResults = 0,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var suggestions = await _advancedFilterService.GenerateFilterSuggestionsAsync(
                request, currentResults, correlationId);
            
            return Ok(suggestions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating filter suggestions");
            return StatusCode(500, new { message = "An error occurred while generating filter suggestions" });
        }
    }

    /// <summary>
    /// Get detailed search analytics (Admin only)
    /// </summary>
    [HttpGet("analytics")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<object>> GetSearchAnalytics(
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null,
        [FromQuery] int limit = 100)
    {
        try
        {
            // This would typically call a dedicated analytics service
            // For now, return a placeholder response
            return Ok(new 
            { 
                message = "Search analytics endpoint",
                fromDate,
                toDate,
                limit,
                note = "Implementation pending - requires dedicated analytics service"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting search analytics");
            return StatusCode(500, new { message = "An error occurred while getting search analytics" });
        }
    }

    // ============================================================================
    // VPN STREAMING AVAILABILITY ENDPOINTS
    // ============================================================================

    /// <summary>
    /// Get detailed streaming availability for a show across all countries
    /// Used for VPN-based content access feature
    /// </summary>
    [HttpGet("shows/{showId}/streaming-details")]
    [AllowAnonymous]
    [Produces("application/json")]
    public async Task<ActionResult<ShowStreamingDetails>> GetShowStreamingDetails(
        string showId,
        CancellationToken cancellationToken = default)
    {
        try
        {
            _logger.LogInformation("Getting streaming details for show {ShowId}", showId);

            // Get user's subscriptions - either from authenticated user or from header for anonymous users
            List<string>? userServiceIds = null;
            if (User.Identity?.IsAuthenticated == true)
            {
                var userIdClaim = User.FindFirst("sub")?.Value ?? User.FindFirst("userId")?.Value;
                if (Guid.TryParse(userIdClaim, out var userId))
                {
                    userServiceIds = await _subscriptionService.GetUserServiceIdsAsync(userId, cancellationToken);
                    _logger.LogDebug("User {UserId} has {Count} subscriptions", userId, userServiceIds.Count);
                }
            }
            else
            {
                // For anonymous users, check for X-User-Services header (from localStorage selections)
                var servicesHeader = Request.Headers["X-User-Services"].FirstOrDefault();
                if (!string.IsNullOrEmpty(servicesHeader))
                {
                    userServiceIds = servicesHeader.Split(',', StringSplitOptions.RemoveEmptyEntries)
                        .Select(s => s.Trim())
                        .Where(s => !string.IsNullOrEmpty(s))
                        .ToList();
                    _logger.LogDebug("Anonymous user provided {Count} services via header", userServiceIds.Count);
                }
            }

            // Auto-detect user's country
            string? userCountry = _geoLocationService.GetCountryFromHeaders(HttpContext.Request);
            if (string.IsNullOrEmpty(userCountry))
            {
                var ipAddress = HttpContext.Connection.RemoteIpAddress;
                userCountry = await _geoLocationService.GetCountryFromIPAsync(ipAddress, cancellationToken);
            }

            _logger.LogDebug("Detected user country: {Country}", userCountry);

            // Get show details with user-specific enrichment
            ShowStreamingDetails? details = null;
            try
            {
                details = await _streamingClient.GetShowDetailsAsync(
                    showId,
                    userServiceIds,
                    userCountry,
                    cancellationToken);
            }
            catch (Exception apiEx)
            {
                _logger.LogWarning(apiEx, "External streaming API failed for show {ShowId}, returning fallback response", showId);
                // Return a 503 Service Unavailable with helpful message instead of 500
                return StatusCode(503, new
                {
                    message = "Streaming data temporarily unavailable. Please try again later.",
                    showId = showId,
                    retryAfterSeconds = 60
                });
            }

            if (details == null)
            {
                return NotFound(new { message = $"No streaming details found for show {showId}" });
            }

            return Ok(details);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting streaming details for show {ShowId}", showId);
            return StatusCode(500, new { message = "An error occurred while getting streaming details" });
        }
    }

    /// <summary>
    /// Get user's current location information
    /// </summary>
    [HttpGet("location")]
    [AllowAnonymous]
    [Produces("application/json")]
    public async Task<ActionResult<UserLocationResponse>> GetUserLocation(
        CancellationToken cancellationToken = default)
    {
        try
        {
            // Try headers first (fastest)
            var countryCode = _geoLocationService.GetCountryFromHeaders(HttpContext.Request);
            var autoDetected = false;

            // Fall back to IP-based detection
            if (string.IsNullOrEmpty(countryCode))
            {
                var ipAddress = HttpContext.Connection.RemoteIpAddress;
                countryCode = await _geoLocationService.GetCountryFromIPAsync(ipAddress, cancellationToken);
                autoDetected = true;
            }

            var countryName = _geoLocationService.GetCountryName(countryCode ?? "us");

            return Ok(new UserLocationResponse
            {
                CountryCode = countryCode ?? "us",
                CountryName = countryName,
                AutoDetected = autoDetected
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error detecting user location");
            return StatusCode(500, new { message = "An error occurred while detecting location" });
        }
    }
}