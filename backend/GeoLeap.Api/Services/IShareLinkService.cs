using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service interface for managing share links and URL shortening
/// </summary>
public interface IShareLinkService
{
    /// <summary>
    /// Generate a shareable link for content
    /// </summary>
    /// <param name="request">Share content request</param>
    /// <param name="platform">Target platform</param>
    /// <returns>Generated share link response</returns>
    Task<ShareLinkResponse> GenerateShareLinkAsync(ShareContentRequest request, string platform);
    
    /// <summary>
    /// Shorten a URL for sharing
    /// </summary>
    /// <param name="originalUrl">Original long URL</param>
    /// <param name="userId">User ID</param>
    /// <returns>Shortened URL</returns>
    Task<string> ShortenUrlAsync(string originalUrl, Guid userId);
    
    /// <summary>
    /// Expand a shortened URL to its original form
    /// </summary>
    /// <param name="shortUrl">Shortened URL or code</param>
    /// <returns>Original URL</returns>
    Task<string?> ExpandUrlAsync(string shortUrl);
    
    /// <summary>
    /// Track a click on a share link
    /// </summary>
    /// <param name="shortCode">Short URL code that was clicked</param>
    /// <param name="clickData">Click tracking data</param>
    /// <returns>Original URL to redirect to</returns>
    Task<string?> TrackClickAndGetUrlAsync(string shortCode, Dictionary<string, object> clickData);
    
    /// <summary>
    /// Get click analytics for a share link
    /// </summary>
    /// <param name="shareEventId">Share event ID</param>
    /// <returns>Click analytics data</returns>
    Task<Dictionary<string, object>> GetLinkAnalyticsAsync(Guid shareEventId);
    
    /// <summary>
    /// Resolve a share link code to its original URL
    /// </summary>
    /// <param name="shareCode">Share link code</param>
    /// <param name="ipAddress">Client IP address</param>
    /// <param name="userAgent">Client user agent</param>
    /// <param name="referer">Referer URL</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Original URL</returns>
    Task<string> ResolveShareLinkAsync(string shareCode, string ipAddress, string userAgent, string? referer, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Get analytics for a share link by share code
    /// </summary>
    /// <param name="shareCode">Share code</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Share link analytics</returns>
    Task<Dictionary<string, object>> GetShareLinkAnalyticsAsync(string shareCode, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Create a trackable link with UTM parameters
    /// </summary>
    /// <param name="baseUrl">Base URL to make trackable</param>
    /// <param name="utmParams">UTM parameters to append</param>
    /// <param name="shareEventId">Share event ID for tracking</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Trackable URL</returns>
    Task<string> CreateTrackableLinkAsync(string baseUrl, Dictionary<string, string> utmParams, Guid shareEventId, CancellationToken cancellationToken = default);
}