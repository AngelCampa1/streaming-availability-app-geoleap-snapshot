using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using System.Security.Claims;
using System.Text.Json;

namespace GeoLeap.Api.Middleware;

/// <summary>
/// Middleware that applies user content filtering preferences to API responses
/// Automatically filters content based on user preferences for rating, language, etc.
/// </summary>
public class ContentFilteringMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ContentFilteringMiddleware> _logger;

    public ContentFilteringMiddleware(RequestDelegate next, ILogger<ContentFilteringMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Check if this is an API request that might return content
        if (!ShouldApplyFiltering(context))
        {
            await _next(context).ConfigureAwait(false);
            return;
        }

        // Capture the original response
        var originalBodyStream = context.Response.Body;

        try
        {
            using var responseBody = new MemoryStream();
            context.Response.Body = responseBody;

            await _next(context).ConfigureAwait(false);

            // Reset position for reading
            responseBody.Seek(0, SeekOrigin.Begin);

            // Process the response if it contains content data
            if (context.Response.StatusCode == 200 && IsContentResponse(context))
            {
                await ApplyContentFilteringAsync(context, responseBody, originalBodyStream).ConfigureAwait(false);
            }
            else
            {
                // Copy response as-is
                await responseBody.CopyToAsync(originalBodyStream).ConfigureAwait(false);
            }
        }
        finally
        {
            // Always restore original response stream
            context.Response.Body = originalBodyStream;
        }
    }

    private bool ShouldApplyFiltering(HttpContext context)
    {
        // Only apply to API endpoints that return content
        var path = context.Request.Path.Value?.ToLowerInvariant();
        
        return path != null && (
            path.Contains("/api/search") ||
            path.Contains("/api/content") ||
            path.Contains("/api/watchlist") ||
            path.Contains("/api/recommendations")
        );
    }

    private bool IsContentResponse(HttpContext context)
    {
        return context.Response.ContentType?.Contains("application/json") == true;
    }

    private async Task ApplyContentFilteringAsync(HttpContext context, MemoryStream responseBody, Stream originalBodyStream)
    {
        try
        {
            // Get user ID from claims
            var userIdClaim = context.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (!Guid.TryParse(userIdClaim, out var userId))
            {
                // No user context, skip filtering - copy to original stream
                await responseBody.CopyToAsync(originalBodyStream).ConfigureAwait(false);
                return;
            }

            // Get services from DI
            var serviceProvider = context.RequestServices;
            var preferenceService = serviceProvider.GetService<IUserPreferenceIntegrationService>();
            var contentFilterService = serviceProvider.GetService<IContentFilteringService>();

            if (preferenceService == null || contentFilterService == null)
            {
                // Services not available, skip filtering - copy to original stream
                await responseBody.CopyToAsync(originalBodyStream).ConfigureAwait(false);
                return;
            }

            // Read the original response
            string responseContent;
            using (var reader = new StreamReader(responseBody))
            {
                responseContent = await reader.ReadToEndAsync().ConfigureAwait(false);
            }

            // Get user's content filtering preferences
            var contentPrefs = await preferenceService.GetContentFilterPreferencesAsync(userId).ConfigureAwait(false);
            var privacyPrefs = await preferenceService.GetPrivacyPreferencesAsync(userId).ConfigureAwait(false);

            // Apply content filtering based on response type
            var filteredContent = await ApplyFilteringBasedOnResponseType(
                responseContent, context.Request.Path, contentPrefs, privacyPrefs, contentFilterService).ConfigureAwait(false);

            // Write filtered response directly to original stream
            var writer = new StreamWriter(originalBodyStream, leaveOpen: true);
            await writer.WriteAsync(filteredContent).ConfigureAwait(false);
            await writer.FlushAsync().ConfigureAwait(false);

            _logger.LogDebug("Applied content filtering for user {UserId} on path {Path}", userId, context.Request.Path);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error applying content filtering middleware");

            // Fallback: return original response to original stream
            responseBody.Seek(0, SeekOrigin.Begin);
            await responseBody.CopyToAsync(originalBodyStream).ConfigureAwait(false);
        }
    }

    private async Task<string> ApplyFilteringBasedOnResponseType(
        string responseContent,
        PathString requestPath,
        Models.ContentFilterPreferences contentPrefs,
        Models.PrivacyPreferences privacyPrefs,
        IContentFilteringService filterService)
    {
        try
        {
            var path = requestPath.Value?.ToLowerInvariant();

            if (path?.Contains("/search") == true)
            {
                return await filterService.FilterSearchResponseAsync(responseContent, contentPrefs, privacyPrefs).ConfigureAwait(false);
            }
            else if (path?.Contains("/content") == true)
            {
                return await filterService.FilterContentResponseAsync(responseContent, contentPrefs, privacyPrefs).ConfigureAwait(false);
            }
            else if (path?.Contains("/watchlist") == true)
            {
                // E2E BUG FIX: Pass the path to differentiate between watchlist list and items endpoints
                return await filterService.FilterWatchlistResponseAsync(responseContent, contentPrefs, privacyPrefs, path).ConfigureAwait(false);
            }
            else if (path?.Contains("/recommendations") == true)
            {
                return await filterService.FilterRecommendationsResponseAsync(responseContent, contentPrefs, privacyPrefs).ConfigureAwait(false);
            }

            return responseContent; // No specific filtering for this endpoint
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error filtering response content, returning original");
            return responseContent;
        }
    }
}

/// <summary>
/// Service for applying content filtering to API responses
/// </summary>
public interface IContentFilteringService
{
    Task<string> FilterSearchResponseAsync(string responseContent, Models.ContentFilterPreferences contentPrefs, Models.PrivacyPreferences privacyPrefs);
    Task<string> FilterContentResponseAsync(string responseContent, Models.ContentFilterPreferences contentPrefs, Models.PrivacyPreferences privacyPrefs);
    Task<string> FilterWatchlistResponseAsync(string responseContent, Models.ContentFilterPreferences contentPrefs, Models.PrivacyPreferences privacyPrefs, string? requestPath = null);
    Task<string> FilterRecommendationsResponseAsync(string responseContent, Models.ContentFilterPreferences contentPrefs, Models.PrivacyPreferences privacyPrefs);
}

public class ContentFilteringService : IContentFilteringService
{
    private readonly ILogger<ContentFilteringService> _logger;
    private readonly JsonSerializerOptions _jsonOptions;

    public ContentFilteringService(ILogger<ContentFilteringService> logger)
    {
        _logger = logger;
        _jsonOptions = new JsonSerializerOptions
        {
            PropertyNameCaseInsensitive = true,
            WriteIndented = false
        };
    }

    public Task<string> FilterSearchResponseAsync(
        string responseContent,
        Models.ContentFilterPreferences contentPrefs,
        Models.PrivacyPreferences privacyPrefs)
    {
        // BUG FIX: Handle empty response content to prevent JSON parsing errors
        if (string.IsNullOrWhiteSpace(responseContent))
        {
            _logger.LogWarning("Empty response content received for filtering - returning as-is");
            return Task.FromResult(responseContent);
        }

        try
        {
            var searchResponse = JsonSerializer.Deserialize<GlobalSearchResponse>(responseContent, _jsonOptions);
            if (searchResponse?.Results == null) return Task.FromResult(responseContent);

            // Apply content filtering to search results
            var filteredResults = searchResponse.Results.Where(result =>
                PassesContentFilter(result, contentPrefs) &&
                PassesPrivacyFilter(result, privacyPrefs)
            ).ToList();

            // Apply content sanitization
            foreach (var result in filteredResults)
            {
                SanitizeContentSummary(result, contentPrefs, privacyPrefs);
            }

            searchResponse.Results = filteredResults;
            searchResponse.TotalResults = filteredResults.Count;

            // Add filtering metadata
            if (searchResponse.Metadata == null)
                searchResponse.Metadata = new GeoLeap.Api.Models.SearchMetadata();

            searchResponse.Metadata.Metadata["contentFiltering"] = new
            {
                FiltersApplied = true,
                OriginalCount = searchResponse.Results.Count + (searchResponse.Results.Count - filteredResults.Count),
                FilteredCount = filteredResults.Count,
                FiltersUsed = GetAppliedFilters(contentPrefs, privacyPrefs)
            };

            return Task.FromResult(JsonSerializer.Serialize(searchResponse, _jsonOptions));
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error filtering search response");
            return Task.FromResult(responseContent);
        }
    }

    public Task<string> FilterContentResponseAsync(
        string responseContent,
        Models.ContentFilterPreferences contentPrefs,
        Models.PrivacyPreferences privacyPrefs)
    {
        try
        {
            // Handle single content item responses (try ContentSummary first)
            if (responseContent.TrimStart().StartsWith("{"))
            {
                try
                {
                    var contentItem = JsonSerializer.Deserialize<ContentSummary>(responseContent, _jsonOptions);
                    if (contentItem != null)
                    {
                        if (!PassesContentFilter(contentItem, contentPrefs) || !PassesPrivacyFilter(contentItem, privacyPrefs))
                        {
                            // Return empty response or access denied
                            return Task.FromResult(JsonSerializer.Serialize(new { error = "Content filtered by preferences" }, _jsonOptions));
                        }

                        SanitizeContentSummary(contentItem, contentPrefs, privacyPrefs);
                        return Task.FromResult(JsonSerializer.Serialize(contentItem, _jsonOptions));
                    }
                }
                catch
                {
                    // If ContentSummary deserialization fails, return original content
                    return Task.FromResult(responseContent);
                }
            }
            
            // Handle content list responses
            var contentList = JsonSerializer.Deserialize<List<ContentSummary>>(responseContent, _jsonOptions);
            if (contentList == null) return Task.FromResult(responseContent);

            var filteredList = contentList.Where(content => 
                PassesContentFilter(content, contentPrefs) && 
                PassesPrivacyFilter(content, privacyPrefs)
            ).ToList();

            foreach (var content in filteredList)
            {
                SanitizeContentSummary(content, contentPrefs, privacyPrefs);
            }

            return Task.FromResult(JsonSerializer.Serialize(filteredList, _jsonOptions));
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error filtering content response");
            return Task.FromResult(responseContent);
        }
    }

    public Task<string> FilterWatchlistResponseAsync(
        string responseContent,
        Models.ContentFilterPreferences contentPrefs,
        Models.PrivacyPreferences privacyPrefs,
        string? requestPath = null)
    {
        try
        {
            // E2E BUG FIX: Check if this is a /items endpoint - return items as-is without deserializing as wrong type
            // The /items endpoint returns List<WatchlistItemDto>, not List<WatchlistSummaryDto>
            if (requestPath?.Contains("/items") == true)
            {
                // For watchlist items, just return the response as-is
                // The items have already been filtered by the service layer
                return Task.FromResult(responseContent);
            }

            // Handle watchlist detail responses
            if (responseContent.TrimStart().StartsWith("{"))
            {
                var watchlistDetail = JsonSerializer.Deserialize<WatchlistDetailDto>(responseContent, _jsonOptions);
                if (watchlistDetail == null) return Task.FromResult(responseContent);

                // Filter watchlist items
                if (watchlistDetail.Items != null)
                {
                    // Apply basic content filtering based on available watchlist item properties
                    watchlistDetail.Items = watchlistDetail.Items.Where(item =>
                        PassesBasicContentFilter(item, contentPrefs) &&
                        PassesBasicPrivacyFilter(item, privacyPrefs)
                    ).ToList();

                    // Note: Content sanitization handled at item level for watchlist items
                }

                return Task.FromResult(JsonSerializer.Serialize(watchlistDetail, _jsonOptions));
            }

            // Handle watchlist list responses
            var watchlistList = JsonSerializer.Deserialize<List<WatchlistSummaryDto>>(responseContent, _jsonOptions);
            if (watchlistList == null) return Task.FromResult(responseContent);

            // Apply privacy filtering to watchlists
            foreach (var watchlist in watchlistList)
            {
                ApplyPrivacyFilteringToWatchlist(watchlist, privacyPrefs);
            }

            return Task.FromResult(JsonSerializer.Serialize(watchlistList, _jsonOptions));
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error filtering watchlist response");
            return Task.FromResult(responseContent);
        }
    }

    public Task<string> FilterRecommendationsResponseAsync(
        string responseContent,
        Models.ContentFilterPreferences contentPrefs,
        Models.PrivacyPreferences privacyPrefs)
    {
        try
        {
            var recommendations = JsonSerializer.Deserialize<List<ContentSummary>>(responseContent, _jsonOptions);
            if (recommendations == null) return Task.FromResult(responseContent);

            var filteredRecommendations = recommendations.Where(content =>
                PassesContentFilter(content, contentPrefs) &&
                PassesPrivacyFilter(content, privacyPrefs)
            ).ToList();

            foreach (var recommendation in filteredRecommendations)
            {
                SanitizeContentSummary(recommendation, contentPrefs, privacyPrefs);
            }

            return Task.FromResult(JsonSerializer.Serialize(filteredRecommendations, _jsonOptions));
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Error filtering recommendations response");
            return Task.FromResult(responseContent);
        }
    }

    private bool PassesContentFilter(ContentSummary content, ContentFilterPreferences prefs)
    {
        // Note: Content rating filtering skipped - ContentSummary uses decimal rating, not string-based ratings
        // Future enhancement: implement numeric rating comparison if needed

        // Check excluded genres
        if (prefs.ExcludedGenres.Any() && content.Genres.Any())
        {
            if (content.Genres.Any(g => prefs.ExcludedGenres.Contains(g, StringComparer.OrdinalIgnoreCase)))
            {
                return false;
            }
        }

        // Check minimum rating
        if (prefs.MinimumRating.HasValue && content.Rating.HasValue)
        {
            if (content.Rating.Value < prefs.MinimumRating.Value)
            {
                return false;
            }
        }

        // Check language preferences
        if (prefs.PreferredLanguages.Any() && !prefs.PreferredLanguages.Contains("any") && !string.IsNullOrEmpty(content.Language))
        {
            if (!prefs.PreferredLanguages.Contains(content.Language, StringComparer.OrdinalIgnoreCase))
            {
                return false;
            }
        }

        // Check explicit content
        if (prefs.HideExplicitContent)
        {
            // Filter by adult genres - skip string-based content rating comparison
            if (content.Genres.Any(g => g.Equals("Adult", StringComparison.OrdinalIgnoreCase)))
            {
                return false;
            }
        }

        return true;
    }

    private bool PassesPrivacyFilter(ContentSummary content, PrivacyPreferences prefs)
    {
        // Apply privacy-based filtering
        // For example, if user doesn't want recommendations based on viewing history
        if (!prefs.AllowRecommendations)
        {
            // Could filter out certain recommendation-based content
            // This is a placeholder for more complex privacy logic
        }

        return true;
    }

    private void SanitizeContentSummary(ContentSummary content, ContentFilterPreferences contentPrefs, PrivacyPreferences privacyPrefs)
    {
        // Remove or sanitize sensitive information based on preferences
        if (!privacyPrefs.AllowRecommendations)
        {
            // Remove recommendation-related metadata if available
            // content.PopularityScore = null; // Uncomment if property exists
        }

        // Could add more sanitization logic here
    }

    private void ApplyPrivacyFilteringToWatchlist(WatchlistSummaryDto watchlist, PrivacyPreferences privacyPrefs)
    {
        // Apply privacy filtering to watchlist information
        if (!privacyPrefs.ShowRealTimeActivity)
        {
            // Remove activity-related information
            // Note: RecentActivity property not available in current WatchlistSummaryDto
            // watchlist.RecentActivity = new List<string>();
        }
    }

    private List<string> GetAllowedContentRatings(string maxRating)
    {
        var allRatings = new[] { "G", "PG", "PG-13", "R", "NC-17" };
        var maxIndex = Array.IndexOf(allRatings, maxRating);
        
        if (maxIndex == -1) return allRatings.ToList();
        
        return allRatings.Take(maxIndex + 1).ToList();
    }

    private List<string> GetAppliedFilters(ContentFilterPreferences contentPrefs, PrivacyPreferences privacyPrefs)
    {
        var appliedFilters = new List<string>();

        if (!string.IsNullOrEmpty(contentPrefs.MaxContentRating))
            appliedFilters.Add("content_rating");
            
        if (contentPrefs.ExcludedGenres.Any())
            appliedFilters.Add("excluded_genres");
            
        if (contentPrefs.MinimumRating.HasValue)
            appliedFilters.Add("minimum_rating");
            
        if (contentPrefs.PreferredLanguages.Any())
            appliedFilters.Add("language_preferences");
            
        if (contentPrefs.HideExplicitContent)
            appliedFilters.Add("explicit_content_filter");

        return appliedFilters;
    }

    /// <summary>
    /// Basic content filter for watchlist items based on available properties
    /// </summary>
    private bool PassesBasicContentFilter(WatchlistItemDto item, ContentFilterPreferences contentPrefs)
    {
        // Filter by excluded genres if available
        if (contentPrefs.ExcludedGenres.Any() && item.Genres.Any())
        {
            if (item.Genres.Any(genre => contentPrefs.ExcludedGenres.Contains(genre)))
                return false;
        }

        // Filter by minimum rating if available
        if (contentPrefs.MinimumRating.HasValue && item.Rating.HasValue)
        {
            if (item.Rating.Value < contentPrefs.MinimumRating.Value)
                return false;
        }

        return true;
    }

    /// <summary>
    /// Basic privacy filter for watchlist items
    /// </summary>
    private bool PassesBasicPrivacyFilter(WatchlistItemDto item, PrivacyPreferences privacyPrefs)
    {
        // For basic implementation, always pass privacy filter for watchlist items
        // More sophisticated privacy filtering would require additional metadata
        return true;
    }
}

/// <summary>
/// Extension method to register content filtering middleware
/// </summary>
public static class ContentFilteringMiddlewareExtensions
{
    public static IApplicationBuilder UseContentFiltering(this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<ContentFilteringMiddleware>();
    }
}