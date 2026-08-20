using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service interface for managing social sharing functionality
/// </summary>
public interface ISocialSharingService
{
    /// <summary>
    /// Create a new social share
    /// </summary>
    /// <param name="request">Share creation request</param>
    /// <param name="userId">User creating the share</param>
    /// <returns>Created social share DTO</returns>
    Task<Models.SocialShareDto> CreateShareAsync(Models.CreateSocialShareRequest request, string userId);
    
    /// <summary>
    /// Get share analytics for a platform
    /// </summary>
    /// <param name="platform">Platform filter</param>
    /// <param name="startDate">Start date for analytics</param>
    /// <param name="endDate">End date for analytics</param>
    /// <returns>Share analytics data</returns>
    Task<SocialSharingAnalyticsDto> GetShareAnalyticsAsync(string platform, DateTime? startDate, DateTime? endDate);
    
    /// <summary>
    /// Track a share click event
    /// </summary>
    /// <param name="shareId">Share ID that was clicked</param>
    /// <param name="clickData">Click tracking data</param>
    /// <returns>True if tracking was successful</returns>
    Task<bool> TrackShareClickAsync(Guid shareId, Dictionary<string, object> clickData);
    
    /// <summary>
    /// Get popular shared content
    /// </summary>
    /// <param name="contentType">Content type filter</param>
    /// <param name="platform">Platform filter</param>
    /// <param name="limit">Maximum results to return</param>
    /// <returns>List of popular shared content</returns>
    Task<List<ContentSharePerformance>> GetPopularSharedContentAsync(string? contentType = null, string? platform = null, int limit = 20);
    
    /// <summary>
    /// Generate share link for content
    /// </summary>
    /// <param name="request">Share link generation request</param>
    /// <param name="userId">User generating the link</param>
    /// <param name="correlationId">Correlation ID for tracking</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Generated share link response</returns>
    Task<ShareLinkResponse> GenerateShareLinkAsync(ShareContentRequest request, Guid userId, string correlationId, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Get user sharing preferences
    /// </summary>
    /// <param name="userId">User ID</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>User sharing preferences</returns>
    Task<SocialSharingPreferences> GetUserSharingPreferencesAsync(Guid userId, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Update user sharing preferences
    /// </summary>
    /// <param name="userId">User ID</param>
    /// <param name="preferences">Updated preferences</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Updated preferences</returns>
    Task<SocialSharingPreferences> UpdateUserSharingPreferencesAsync(Guid userId, SocialSharingPreferences preferences, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Update share event status
    /// </summary>
    /// <param name="shareEventId">Share event ID</param>
    /// <param name="status">New status</param>
    /// <param name="errorMessage">Optional error message</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Task</returns>
    Task UpdateShareEventStatusAsync(Guid shareEventId, ShareStatus status, string? errorMessage = null, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Get available social media platforms
    /// </summary>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>List of available platforms</returns>
    Task<List<SocialPlatformConfig>> GetAvailablePlatformsAsync(CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Get content sharing metrics
    /// </summary>
    /// <param name="contentId">Content ID</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Content sharing metrics</returns>
    Task<SocialShareMetrics> GetContentSharingMetricsAsync(string contentId, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Get sharing analytics data
    /// </summary>
    /// <param name="request">Analytics request</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Sharing analytics</returns>
    Task<List<SocialShareEvent>> GetSharingAnalyticsAsync(ShareAnalyticsRequest request, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Update conversion tracking for share event
    /// </summary>
    /// <param name="shareEventId">Share event ID</param>
    /// <param name="newUserId">New user ID who converted</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Task</returns>
    Task UpdateConversionTrackingAsync(Guid shareEventId, Guid newUserId, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Track share link click event
    /// </summary>
    /// <param name="shareId">Share ID</param>
    /// <param name="clickData">Click tracking data</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Task</returns>
    Task TrackShareLinkClickAsync(Guid shareId, Dictionary<string, object> clickData, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Create share link for content (alias for GenerateShareLinkAsync for test compatibility)
    /// </summary>
    /// <param name="request">Share link generation request</param>
    /// <param name="userId">User generating the link</param>
    /// <param name="correlationId">Correlation ID for tracking</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>Generated share link response</returns>
    Task<ShareLinkResponse> CreateShareLinkAsync(ShareContentRequest request, Guid userId, string correlationId, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Track click event (alias for TrackShareClickAsync for test compatibility)
    /// </summary>
    /// <param name="shareId">Share ID that was clicked</param>
    /// <param name="clickData">Click tracking data</param>
    /// <returns>True if tracking was successful</returns>
    Task<bool> TrackClickAsync(Guid shareId, Dictionary<string, object> clickData);
    
    /// <summary>
    /// Get analytics data (alias for GetShareAnalyticsAsync for test compatibility)
    /// </summary>
    /// <param name="platform">Platform filter</param>
    /// <param name="startDate">Start date for analytics</param>
    /// <param name="endDate">End date for analytics</param>
    /// <returns>Share analytics data</returns>
    Task<SocialSharingAnalyticsDto> GetAnalyticsAsync(string platform, DateTime? startDate, DateTime? endDate);
    
    /// <summary>
    /// Get user shares
    /// </summary>
    /// <param name="userId">User ID</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>List of user shares</returns>
    Task<List<SocialShareEvent>> GetUserSharesAsync(Guid userId, CancellationToken cancellationToken = default);
    
    /// <summary>
    /// Delete a share
    /// </summary>
    /// <param name="shareId">Share ID to delete</param>
    /// <param name="cancellationToken">Cancellation token</param>
    /// <returns>True if deleted successfully</returns>
    Task<bool> DeleteShareAsync(Guid shareId, CancellationToken cancellationToken = default);
}