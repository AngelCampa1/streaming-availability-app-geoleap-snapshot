using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service interface for generating social media meta tags
/// </summary>
public interface IMetaTagGenerationService
{
    /// <summary>
    /// Generate Open Graph meta tags for content
    /// </summary>
    /// <param name="content">Content metadata</param>
    /// <param name="customMessage">Custom share message</param>
    /// <returns>Open Graph data</returns>
    Task<OpenGraphData> GenerateOpenGraphDataAsync(ContentMetadata content, string? customMessage = null);
    
    /// <summary>
    /// Generate Twitter Card meta tags for content
    /// </summary>
    /// <param name="content">Content metadata</param>
    /// <param name="customMessage">Custom share message</param>
    /// <returns>Twitter Card data</returns>
    Task<TwitterCardData> GenerateTwitterCardDataAsync(ContentMetadata content, string? customMessage = null);
    
    /// <summary>
    /// Generate meta tags for a share URL
    /// </summary>
    /// <param name="shareUrl">Share URL</param>
    /// <param name="contentId">Content identifier</param>
    /// <param name="platform">Target platform</param>
    /// <returns>Meta tag HTML string</returns>
    Task<string> GenerateMetaTagsHtmlAsync(string shareUrl, string contentId, string platform = "facebook");
    
    /// <summary>
    /// Get meta tags HTML for content
    /// </summary>
    /// <param name="shareUrl">Share URL</param>
    /// <param name="contentId">Content identifier</param>
    /// <param name="platform">Target platform</param>
    /// <returns>Meta tags HTML</returns>
    Task<string> GetMetaTagsHtmlAsync(string shareUrl, string contentId, string platform = "facebook");
}