using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using System.ComponentModel.DataAnnotations;

namespace GeoLeap.Api.Controllers;

/// <summary>
/// SEO-focused API endpoints for server-side rendering and content optimization
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class SeoController : ControllerBase
{
    private readonly ISeoMetadataService _seoMetadataService;
    private readonly IStructuredDataService _structuredDataService;
    private readonly ISitemapService _sitemapService;
    private readonly IContentService _contentService;
    private readonly ISearchService _searchService;
    private readonly IMemoryCache _cache;
    private readonly ILogger<SeoController> _logger;

    public SeoController(
        ISeoMetadataService seoMetadataService,
        IStructuredDataService structuredDataService,
        ISitemapService sitemapService,
        IContentService contentService,
        ISearchService searchService,
        IMemoryCache cache,
        ILogger<SeoController> logger)
    {
        _seoMetadataService = seoMetadataService;
        _structuredDataService = structuredDataService;
        _sitemapService = sitemapService;
        _contentService = contentService;
        _searchService = searchService;
        _cache = cache;
        _logger = logger;
    }

    /// <summary>
    /// Get content page data optimized for SSR
    /// </summary>
    [HttpGet("content/{slug}")]
    [ProducesResponseType(typeof(ContentPageResponse), 200)]
    [ProducesResponseType(404)]
    public async Task<ActionResult<ContentPageResponse>> GetContentPageAsync(
        string slug, 
        [FromQuery] string? language = "en-US",
        [FromQuery] bool includeRelated = true,
        [FromQuery] bool includeStreamingOptions = true,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var cacheKey = $"content_page_{slug}_{language}_{includeRelated}_{includeStreamingOptions}";
            
            if (_cache.TryGetValue(cacheKey, out ContentPageResponse? cachedResponse))
                return Ok(cachedResponse);

            // Get SEO metadata first to find content ID
            var seoMetadata = await _seoMetadataService.GetMetadataBySlugAsync(slug, language, cancellationToken);
            if (seoMetadata == null)
                return NotFound($"Content not found for slug: {slug}");

            var response = new ContentPageResponse();

            // Get content details
            if (seoMetadata.ContentId.HasValue)
            {
                var contentDetails = await GetContentDetailsAsync(seoMetadata.ContentId.Value, cancellationToken);
                response.Content = contentDetails;

                if (contentDetails != null)
                {
                    // Generate SEO metadata
                    response.Seo = await _seoMetadataService.GenerateContentMetadataAsync(contentDetails, language, cancellationToken);

                    // Get related content
                    if (includeRelated)
                    {
                        response.RelatedContent = await GetRelatedContentAsync(contentDetails, cancellationToken);
                    }

                    // Get streaming options
                    if (includeStreamingOptions)
                    {
                        response.StreamingOptions = await GetStreamingOptionsAsync(seoMetadata.ContentId.Value, cancellationToken);
                    }

                    // Get suggested internal links
                    response.SuggestedLinks = await GetSuggestedLinksAsync(slug, contentDetails.Genres, cancellationToken);
                }
            }
            else
            {
                // Handle non-content pages (genre, search, static pages)
                response.Seo = new SeoMetadataResponse
                {
                    Title = seoMetadata.Title,
                    Description = seoMetadata.Description,
                    Keywords = seoMetadata.Keywords,
                    CanonicalUrl = seoMetadata.CanonicalUrl
                };
            }

            // Cache for 30 minutes
            _cache.Set(cacheKey, response, TimeSpan.FromMinutes(30));

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting content page for slug: {Slug}", slug);
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get search results page optimized for SEO
    /// </summary>
    [HttpGet("search")]
    [ProducesResponseType(typeof(ContentSearchResult), 200)]
    public async Task<ActionResult<ContentSearchResult>> GetSearchPageAsync(
        [FromQuery, Required] string query,
        [FromQuery] string? genre = null,
        [FromQuery] int? year = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var searchRequest = new ContentSearchRequest
            {
                Query = query,
                Page = page,
                PageSize = pageSize,
                MinYear = year,
                MaxYear = year
            };

            if (!string.IsNullOrEmpty(genre))
            {
                // Convert genre string to appropriate filter
                // This would need to match your search service implementation
            }

            // Convert to SearchRequest for compatibility
            var legacyRequest = new SearchRequest
            {
                Query = searchRequest.Query,
                Page = searchRequest.Page,
                PageSize = searchRequest.PageSize
            };

            var searchResults = await _searchService.SearchAsync(legacyRequest, cancellationToken);

            // Generate SEO metadata for search page
            var seoMetadata = await _seoMetadataService.GenerateSearchMetadataAsync(query, genre, year, cancellationToken);

            // Add SEO metadata to response
            Response.Headers.Append("X-SEO-Title", seoMetadata.Title);
            Response.Headers.Append("X-SEO-Description", seoMetadata.Description);
            Response.Headers.Append("X-SEO-Keywords", seoMetadata.Keywords);

            return Ok(searchResults);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting search page for query: {Query}", query);
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get genre page data optimized for SEO
    /// </summary>
    [HttpGet("genre/{genre}")]
    [ProducesResponseType(typeof(ContentSearchResult), 200)]
    public async Task<ActionResult<ContentSearchResult>> GetGenrePageAsync(
        string genre,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? language = "en-US",
        CancellationToken cancellationToken = default)
    {
        try
        {
            var cacheKey = $"genre_page_{genre}_{page}_{pageSize}_{language}";
            
            if (_cache.TryGetValue(cacheKey, out ContentSearchResult? cachedResults))
                return Ok(cachedResults);

            // Get content for genre
            var searchRequest = new ContentSearchRequest
            {
                Query = genre,
                Page = page,
                PageSize = pageSize,
                Language = language
            };

            var legacyRequest = new SearchRequest
            {
                Query = searchRequest.Query,
                Page = searchRequest.Page,
                PageSize = searchRequest.PageSize
            };
            
            var searchResults = await _searchService.SearchAsync(legacyRequest, cancellationToken);

            // Generate SEO metadata for genre page
            var seoMetadata = await _seoMetadataService.GenerateGenreMetadataAsync(genre, language, cancellationToken);

            // Add SEO metadata to response headers
            Response.Headers.Append("X-SEO-Title", seoMetadata.Title);
            Response.Headers.Append("X-SEO-Description", seoMetadata.Description);
            Response.Headers.Append("X-SEO-Keywords", seoMetadata.Keywords);

            // Cache for 1 hour
            _cache.Set(cacheKey, searchResults, TimeSpan.FromHours(1));

            return Ok(searchResults);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting genre page for: {Genre}", genre);
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get SEO metadata for a specific page
    /// </summary>
    [HttpGet("metadata")]
    [ProducesResponseType(typeof(SeoMetadataResponse), 200)]
    public async Task<ActionResult<SeoMetadataResponse>> GetMetadataAsync(
        [FromQuery, Required] string slug,
        [FromQuery] string? language = "en-US",
        CancellationToken cancellationToken = default)
    {
        try
        {
            var metadata = await _seoMetadataService.GetMetadataBySlugAsync(slug, language, cancellationToken);
            if (metadata == null)
                return NotFound($"Metadata not found for slug: {slug}");

            var response = new SeoMetadataResponse
            {
                ContentId = metadata.ContentId?.ToString() ?? "",
                ContentType = metadata.ContentType,
                Title = metadata.Title,
                Description = metadata.Description,
                Keywords = metadata.Keywords,
                CanonicalUrl = metadata.CanonicalUrl,
                StructuredData = metadata.StructuredData,
                LastUpdated = metadata.LastUpdated
            };

            // Add Open Graph and Twitter metadata
            if (!string.IsNullOrEmpty(metadata.OgTitle))
            {
                response.OpenGraphData.Add("title", metadata.OgTitle);
                response.OpenGraphData.Add("description", metadata.OgDescription ?? metadata.Description);
                response.OpenGraphData.Add("type", metadata.OgType);
                response.OpenGraphData.Add("image", metadata.OgImage ?? "");
            }

            response.TwitterCardData.Add("card", metadata.TwitterCardType);

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting metadata for slug: {Slug}", slug);
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get structured data for a content page
    /// </summary>
    [HttpGet("structured-data/{slug}")]
    [ProducesResponseType(typeof(string), 200)]
    public async Task<ActionResult<string>> GetStructuredDataAsync(
        string slug,
        [FromQuery] string? language = "en-US",
        CancellationToken cancellationToken = default)
    {
        try
        {
            var seoMetadata = await _seoMetadataService.GetMetadataBySlugAsync(slug, language, cancellationToken);
            if (seoMetadata == null)
                return NotFound($"Content not found for slug: {slug}");

            if (seoMetadata.ContentId.HasValue)
            {
                var contentDetails = await GetContentDetailsAsync(seoMetadata.ContentId.Value, cancellationToken);
                if (contentDetails != null)
                {
                    var structuredData = contentDetails.Type == TmdbContentType.Movie
                        ? await _structuredDataService.GenerateMovieStructuredDataAsync(contentDetails, cancellationToken: cancellationToken)
                        : await _structuredDataService.GenerateTvSeriesStructuredDataAsync(contentDetails, cancellationToken: cancellationToken);

                    return Ok(structuredData);
                }
            }

            return Ok(seoMetadata.StructuredData ?? "{}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting structured data for slug: {Slug}", slug);
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get breadcrumb data for navigation
    /// </summary>
    [HttpGet("breadcrumbs")]
    [ProducesResponseType(typeof(List<GeoLeap.Api.Models.BreadcrumbItem>), 200)]
    public async Task<ActionResult<List<GeoLeap.Api.Models.BreadcrumbItem>>> GetBreadcrumbsAsync(
        [FromQuery, Required] string path,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var breadcrumbs = GenerateBreadcrumbs(path);
            return Ok(breadcrumbs);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating breadcrumbs for path: {Path}", path);
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Get popular content for homepage
    /// </summary>
    [HttpGet("popular")]
    [ProducesResponseType(typeof(List<ContentSummary>), 200)]
    public async Task<ActionResult<List<ContentSummary>>> GetPopularContentAsync(
        [FromQuery] ContentType? contentType = null,
        [FromQuery] int limit = 20,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var cacheKey = $"popular_content_{contentType}_{limit}";
            
            if (_cache.TryGetValue(cacheKey, out List<ContentSummary>? cachedContent))
                return Ok(cachedContent);

            var searchRequest = new ContentSearchRequest
            {
                Query = "*",
                ContentType = contentType,
                PageSize = limit
            };

            var legacyRequest = new SearchRequest
            {
                Query = searchRequest.Query,
                Page = searchRequest.Page,
                PageSize = searchRequest.PageSize
            };
            
            var searchResults = await _searchService.SearchAsync(legacyRequest, cancellationToken);
            var popularContent = searchResults.Results
                .Select(r => new ContentSummary 
                { 
                    Id = r.Id, 
                    Title = r.Title, 
                    Type = r.Type, 
                    Overview = r.Overview,
                    Year = r.Year,
                    Rating = r.Rating.HasValue ? (decimal?)r.Rating.Value : null,
                    Genres = r.Genres.ToList(),
                    ImageUrl = r.ImageUrl
                })
                .OrderByDescending(r => r.Rating)
                .ToList();

            // Cache for 2 hours
            _cache.Set(cacheKey, popularContent, TimeSpan.FromHours(2));

            return Ok(popularContent);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting popular content");
            return StatusCode(500, "Internal server error");
        }
    }

    /// <summary>
    /// Validate SEO metadata for a page
    /// </summary>
    [HttpPost("validate-metadata")]
    [ProducesResponseType(typeof(List<SeoIssue>), 200)]
    public async Task<ActionResult<List<SeoIssue>>> ValidateMetadataAsync(
        [FromBody] SeoMetadataRequest request,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var metadata = new SeoMetadata
            {
                ContentId = request.ContentId,
                ContentType = request.ContentType,
                Slug = request.Slug,
                Title = request.Title,
                Description = request.Description ?? "",
                Keywords = request.Keywords?.Any() == true ? string.Join(", ", request.Keywords) : "",
                CanonicalUrl = request.CanonicalUrl,
                Language = request.Language
            };

            var issues = await _seoMetadataService.ValidateMetadataAsync(metadata, cancellationToken);
            return Ok(issues);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating metadata");
            return StatusCode(500, "Internal server error");
        }
    }

    private async Task<ContentDetails?> GetContentDetailsAsync(Guid contentId, CancellationToken cancellationToken)
    {
        try
        {
            // This would need to be adapted based on your content service implementation
            // For now, returning null as placeholder
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting content details for ID: {ContentId}", contentId);
            return null;
        }
    }

    private async Task<List<ContentSummary>?> GetRelatedContentAsync(ContentDetails content, CancellationToken cancellationToken)
    {
        try
        {
            if (!content.Genres.Any())
                return null;

            var firstGenre = content.Genres.FirstOrDefault();
            if (firstGenre == null)
                return null;

            var searchRequest = new ContentSearchRequest
            {
                Query = firstGenre,
                ContentType = content.Type == TmdbContentType.Movie ? ContentType.Movie : ContentType.TvSeries,
                PageSize = 5
            };

            var legacyRequest = new SearchRequest
            {
                Query = searchRequest.Query,
                Page = searchRequest.Page,
                PageSize = searchRequest.PageSize
            };
            
            var searchResults = await _searchService.SearchAsync(legacyRequest, cancellationToken);
            return searchResults.Results
                .Where(r => r.Id != content.Id.ToString())
                .Take(4)
                .Select(r => new ContentSummary
                {
                    Id = r.Id,
                    Title = r.Title,
                    Type = r.Type,
                    Overview = r.Overview,
                    Year = r.Year,
                    Rating = r.Rating.HasValue ? (decimal?)r.Rating.Value : null,
                    Genres = r.Genres?.ToList() ?? new List<string>(),
                    ImageUrl = r.ImageUrl ?? string.Empty
                })
                .ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting related content");
            return null;
        }
    }

    private async Task<List<ContentStreamingOption>?> GetStreamingOptionsAsync(Guid contentId, CancellationToken cancellationToken)
    {
        try
        {
            // This would query the streaming options from your database
            // Placeholder implementation
            return new List<ContentStreamingOption>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting streaming options for content: {ContentId}", contentId);
            return null;
        }
    }

    private async Task<List<InternalLink>?> GetSuggestedLinksAsync(string currentSlug, List<string> genres, CancellationToken cancellationToken)
    {
        try
        {
            var suggestions = new List<InternalLink>();
            var baseUrl = Request.Scheme + "://" + Request.Host;

            // Suggest genre pages
            foreach (var genre in genres.Take(2))
            {
                suggestions.Add(new InternalLink
                {
                    SourceUrl = $"{baseUrl}/content/{currentSlug}",
                    TargetUrl = $"{baseUrl}/genre/{genre.ToLower()}",
                    AnchorText = $"More {genre} Movies",
                    Relevance = 0.8m,
                    Context = $"Explore more {genre} content"
                });
            }

            // Suggest search page
            suggestions.Add(new InternalLink
            {
                SourceUrl = $"{baseUrl}/content/{currentSlug}",
                TargetUrl = $"{baseUrl}/search",
                AnchorText = "Search Movies & TV Shows",
                Relevance = 0.6m,
                Context = "Find more content to watch"
            });

            return suggestions;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting suggested links");
            return null;
        }
    }

    private List<GeoLeap.Api.Models.BreadcrumbItem> GenerateBreadcrumbs(string path)
    {
        var breadcrumbs = new List<GeoLeap.Api.Models.BreadcrumbItem>();
        var baseUrl = Request.Scheme + "://" + Request.Host;

        // Always start with home
        breadcrumbs.Add(new GeoLeap.Api.Models.BreadcrumbItem
        {
            Name = "Home",
            Url = baseUrl,
            Position = 1
        });

        var pathSegments = path.Trim('/').Split('/');
        var currentPath = "";

        for (int i = 0; i < pathSegments.Length; i++)
        {
            currentPath += "/" + pathSegments[i];
            var name = pathSegments[i].Replace("-", " ").ToTitleCase();

            breadcrumbs.Add(new GeoLeap.Api.Models.BreadcrumbItem
            {
                Name = name,
                Url = baseUrl + currentPath,
                Position = i + 2
            });
        }

        return breadcrumbs;
    }
}

public static class StringExtensions
{
    public static string ToTitleCase(this string input)
    {
        if (string.IsNullOrEmpty(input))
            return string.Empty;

        var words = input.Split(' ');
        for (int i = 0; i < words.Length; i++)
        {
            if (words[i].Length > 0)
            {
                words[i] = char.ToUpper(words[i][0]) + words[i].Substring(1).ToLower();
            }
        }

        return string.Join(' ', words);
    }
}