using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;

namespace GeoLeap.Api.Controllers;

/// <summary>
/// Controller for serving XML sitemaps and robots.txt
/// </summary>
[ApiController]
public class SitemapController : ControllerBase
{
    private readonly ISitemapService _sitemapService;
    private readonly ILogger<SitemapController> _logger;

    public SitemapController(ISitemapService sitemapService, ILogger<SitemapController> logger)
    {
        _sitemapService = sitemapService;
        _logger = logger;
    }

    /// <summary>
    /// Get main XML sitemap
    /// </summary>
    [HttpGet("/sitemap.xml")]
    [Produces("application/xml")]
    public async Task<ActionResult> GetSitemapAsync(
        [FromQuery] string? contentType = null,
        [FromQuery] string? language = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var request = new SitemapGenerationRequest
            {
                IncludeContentTypes = !string.IsNullOrEmpty(contentType) ? new List<string> { contentType } : null,
                Language = language,
                IncludeImages = false
            };

            var sitemap = await _sitemapService.GenerateMainSitemapAsync(request, cancellationToken);
            
            Response.Headers.Append("Content-Type", "application/xml; charset=utf-8");
            Response.Headers.Append("Cache-Control", "public, max-age=3600"); // Cache for 1 hour
            
            return Content(sitemap, "application/xml");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating sitemap");
            return StatusCode(500, "Error generating sitemap");
        }
    }

    /// <summary>
    /// Get sitemap index
    /// </summary>
    [HttpGet("/sitemap-index.xml")]
    [Produces("application/xml")]
    public async Task<ActionResult> GetSitemapIndexAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var sitemapIndex = await _sitemapService.GenerateSitemapIndexAsync(cancellationToken);
            
            Response.Headers.Append("Content-Type", "application/xml; charset=utf-8");
            Response.Headers.Append("Cache-Control", "public, max-age=3600");
            
            return Content(sitemapIndex, "application/xml");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating sitemap index");
            return StatusCode(500, "Error generating sitemap index");
        }
    }

    /// <summary>
    /// Get content-specific sitemap
    /// </summary>
    [HttpGet("/sitemap-{contentType}-{page}.xml")]
    [Produces("application/xml")]
    public async Task<ActionResult> GetContentSitemapAsync(
        string contentType, 
        int page,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var sitemap = await _sitemapService.GenerateContentSitemapAsync(contentType, page, cancellationToken: cancellationToken);
            
            Response.Headers.Append("Content-Type", "application/xml; charset=utf-8");
            Response.Headers.Append("Cache-Control", "public, max-age=3600");
            
            return Content(sitemap, "application/xml");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating content sitemap for {ContentType} page {Page}", contentType, page);
            return StatusCode(500, "Error generating content sitemap");
        }
    }

    /// <summary>
    /// Get image sitemap
    /// </summary>
    [HttpGet("/sitemap-images.xml")]
    [Produces("application/xml")]
    public async Task<ActionResult> GetImageSitemapAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var sitemap = await _sitemapService.GenerateImageSitemapAsync(cancellationToken);
            
            Response.Headers.Append("Content-Type", "application/xml; charset=utf-8");
            Response.Headers.Append("Cache-Control", "public, max-age=3600");
            
            return Content(sitemap, "application/xml");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating image sitemap");
            return StatusCode(500, "Error generating image sitemap");
        }
    }

    /// <summary>
    /// Get news sitemap
    /// </summary>
    [HttpGet("/sitemap-news.xml")]
    [Produces("application/xml")]
    public async Task<ActionResult> GetNewsSitemapAsync(
        [FromQuery] int days = 7,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var sitemap = await _sitemapService.GenerateNewsSitemapAsync(days, cancellationToken);
            
            Response.Headers.Append("Content-Type", "application/xml; charset=utf-8");
            Response.Headers.Append("Cache-Control", "public, max-age=1800"); // Cache for 30 minutes (news is more dynamic)
            
            return Content(sitemap, "application/xml");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating news sitemap");
            return StatusCode(500, "Error generating news sitemap");
        }
    }

    /// <summary>
    /// Get robots.txt
    /// </summary>
    [HttpGet("/robots.txt")]
    [Produces("text/plain")]
    public async Task<ActionResult> GetRobotsTxtAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var robotsTxt = await _sitemapService.GenerateRobotsTxtAsync(cancellationToken);
            
            Response.Headers.Append("Content-Type", "text/plain; charset=utf-8");
            Response.Headers.Append("Cache-Control", "public, max-age=86400"); // Cache for 24 hours
            
            return Content(robotsTxt, "text/plain");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating robots.txt");
            return StatusCode(500, "Error generating robots.txt");
        }
    }

    /// <summary>
    /// Get sitemap statistics (admin endpoint)
    /// </summary>
    [HttpGet("/api/admin/sitemap/stats")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(SitemapStats), 200)]
    [ProducesResponseType(401)]
    [ProducesResponseType(403)]
    public async Task<ActionResult<SitemapStats>> GetSitemapStatsAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var stats = await _sitemapService.GetSitemapStatsAsync(cancellationToken);
            return Ok(stats);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting sitemap stats");
            return StatusCode(500, "Error getting sitemap stats");
        }
    }

    /// <summary>
    /// Update sitemap entries (admin endpoint)
    /// </summary>
    [HttpPost("/api/admin/sitemap/update")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(int), 200)]
    [ProducesResponseType(401)]
    [ProducesResponseType(403)]
    public async Task<ActionResult<int>> UpdateSitemapEntriesAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var updated = await _sitemapService.UpdateSitemapEntriesAsync(cancellationToken);
            return Ok(updated);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating sitemap entries");
            return StatusCode(500, "Error updating sitemap entries");
        }
    }

    /// <summary>
    /// Submit sitemap to search engines (admin endpoint)
    /// </summary>
    [HttpPost("/api/admin/sitemap/submit")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(bool), 200)]
    [ProducesResponseType(401)]
    [ProducesResponseType(403)]
    public async Task<ActionResult<bool>> SubmitSitemapAsync(
        [FromQuery] string? sitemapUrl = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var baseUrl = $"{Request.Scheme}://{Request.Host}";
            var url = sitemapUrl ?? $"{baseUrl}/sitemap.xml";
            
            var success = await _sitemapService.SubmitSitemapAsync(url, cancellationToken);
            return Ok(success);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error submitting sitemap");
            return StatusCode(500, "Error submitting sitemap");
        }
    }

    /// <summary>
    /// Validate sitemap XML (admin endpoint)
    /// </summary>
    [HttpPost("/api/admin/sitemap/validate")]
    [Authorize(Roles = "Admin")]
    [ProducesResponseType(typeof(SitemapValidationResult), 200)]
    [ProducesResponseType(401)]
    [ProducesResponseType(403)]
    public async Task<ActionResult<SitemapValidationResult>> ValidateSitemapAsync(
        [FromBody] string xmlContent,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var validation = await _sitemapService.ValidateSitemapAsync(xmlContent, cancellationToken);
            return Ok(validation);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating sitemap");
            return StatusCode(500, "Error validating sitemap");
        }
    }
}