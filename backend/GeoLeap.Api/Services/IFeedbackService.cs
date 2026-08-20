using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service interface for handling user feedback submissions
/// </summary>
public interface IFeedbackService
{
    /// <summary>
    /// Submits user feedback and sends email notification
    /// </summary>
    /// <param name="request">The feedback request containing message, category, and optional contact info</param>
    /// <param name="userEmail">Email of the authenticated user (if logged in)</param>
    /// <param name="userId">ID of the authenticated user (if logged in)</param>
    /// <param name="userAgent">Browser/app user agent string</param>
    /// <param name="ipAddress">IP address of the submitter</param>
    /// <returns>Response indicating success or failure</returns>
    Task<FeedbackResponse> SubmitFeedbackAsync(
        FeedbackRequest request,
        string? userEmail,
        string? userId,
        string? userAgent,
        string? ipAddress);

    /// <summary>
    /// Gets all available feedback categories
    /// </summary>
    /// <returns>List of feedback category DTOs</returns>
    IEnumerable<FeedbackCategoryDto> GetCategories();

    /// <summary>
    /// Checks if the IP address has exceeded the rate limit
    /// </summary>
    /// <param name="ipAddress">IP address to check</param>
    /// <returns>True if rate limited, false otherwise</returns>
    bool IsRateLimited(string? ipAddress);
}
