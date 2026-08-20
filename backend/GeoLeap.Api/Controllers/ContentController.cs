using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using GeoLeap.Api.Middleware;
using System.ComponentModel.DataAnnotations;
using GeoLeap.Api.Data;
using System.Text.Json;

namespace GeoLeap.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Produces("application/json")]
public class ContentController : ControllerBase
{
    private readonly IContentService _contentService;
    private readonly ISearchService _searchService;
    private readonly IStreamingAvailabilityClient _streamingClient;
    private readonly ISeoMetadataService _seoMetadataService;
    private readonly IStructuredDataService _structuredDataService;
    private readonly ILoggerService _logger;
    private readonly string _correlationId;

    public ContentController(
        IContentService contentService,
        ISearchService searchService,
        IStreamingAvailabilityClient streamingClient,
        ISeoMetadataService seoMetadataService,
        IStructuredDataService structuredDataService,
        ILoggerService logger,
        IHttpContextAccessor httpContextAccessor)
    {
        _contentService = contentService;
        _searchService = searchService;
        _streamingClient = streamingClient;
        _seoMetadataService = seoMetadataService;
        _structuredDataService = structuredDataService;
        _logger = logger;
        _correlationId = httpContextAccessor.HttpContext?.TraceIdentifier ?? Guid.NewGuid().ToString();
    }

    /// <summary>
    /// Get content details by ID and type for SEO content pages
    /// </summary>
    [HttpGet("{type}/{id}")]
    [AllowAnonymous]
    [ResponseCache(Duration = 900)] // 15 minutes
    public async Task<ActionResult<ContentData>> GetContent(
        [Required] string type, 
        [Required] string id)
    {
        try
        {
            _logger.LogBusinessEvent("content_page_requested", new
            {
                ContentType = type,
                ContentId = id,
                CorrelationId = _correlationId,
                UserAgent = Request.Headers.UserAgent.ToString(),
                IpAddress = Request.HttpContext.Connection.RemoteIpAddress?.ToString()
            });

            if (!IsValidContentType(type))
            {
                return BadRequest(ErrorResponseFactory.CreateBadRequestError(_correlationId, Request.Path, $"Invalid content type: {type}", _correlationId));
            }

            var content = await _contentService.GetContentByIdAsync(id, type);
            if (content == null)
            {
                _logger.LogBusinessEvent("content_not_found", new
                {
                    ContentType = type,
                    ContentId = id,
                    CorrelationId = _correlationId
                });

                return NotFound(ErrorResponseFactory.CreateNotFoundError(_correlationId, Request.Path, "Content", $"{type}/{id}", _correlationId));
            }

            _logger.LogBusinessEvent("content_page_served", new
            {
                ContentType = type,
                ContentId = id,
                Title = content.Title,
                CorrelationId = _correlationId
            });

            return Ok(content);
        }
        catch (Exception ex)
        {
            _logger.LogBusinessEvent("content_page_error", new
            {
                ContentType = type,
                ContentId = id,
                Error = ex.Message,
                CorrelationId = _correlationId
            });

            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(_correlationId, Request.Path, "An error occurred while retrieving content", _correlationId));
        }
    }

    /// <summary>
    /// Get related content recommendations for internal linking
    /// </summary>
    [HttpGet("related")]
    [AllowAnonymous]
    [ResponseCache(Duration = 3600)] // 1 hour
    public async Task<ActionResult<List<ContentData>>> GetRelatedContent(
        [Required] [FromQuery] string contentId,
        string? genres = null,
        int limit = 10)
    {
        try
        {
            _logger.LogBusinessEvent("related_content_requested", new
            {
                ContentId = contentId,
                ContentType = "all",
                Genres = genres,
                Limit = limit,
                CorrelationId = _correlationId
            });

            if (limit < 1 || limit > 50)
            {
                return BadRequest(ErrorResponseFactory.CreateBadRequestError(_correlationId, Request.Path, "Limit must be between 1 and 50", _correlationId));
            }

            var relatedContent = await _contentService.GetRelatedContentAsync(contentId, genres?.Split(','), limit);
            
            _logger.LogBusinessEvent("related_content_served", new
            {
                ContentId = contentId,
                ResultCount = relatedContent.Count,
                CorrelationId = _correlationId
            });

            return Ok(relatedContent);
        }
        catch (Exception ex)
        {
            _logger.LogBusinessEvent("related_content_error", new
            {
                ContentId = contentId,
                Error = ex.Message,
                CorrelationId = _correlationId
            });

            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(_correlationId, Request.Path, "An error occurred while retrieving related content", _correlationId));
        }
    }

    /// <summary>
    /// Get popular content for sitemap generation and homepage features
    /// </summary>
    [HttpGet("popular")]
    [AllowAnonymous]
    [ResponseCache(Duration = 86400)] // 24 hours
    public async Task<ActionResult<List<ContentData>>> GetPopularContent(
        string type = "all",
        int limit = 100)
    {
        try
        {
            _logger.LogBusinessEvent("popular_content_requested", new
            {
                ContentType = type,
                Limit = limit,
                CorrelationId = _correlationId
            });

            if (limit < 1 || limit > 1000)
            {
                return BadRequest(ErrorResponseFactory.CreateBadRequestError(_correlationId, Request.Path, "Limit must be between 1 and 1000", _correlationId));
            }

            var popularContent = await _contentService.GetPopularContentAsync(type, limit);
            
            _logger.LogBusinessEvent("popular_content_served", new
            {
                ContentType = type,
                ResultCount = popularContent.Count,
                CorrelationId = _correlationId
            });

            return Ok(popularContent);
        }
        catch (Exception ex)
        {
            _logger.LogBusinessEvent("popular_content_error", new
            {
                ContentType = type,
                Error = ex.Message,
                CorrelationId = _correlationId
            });

            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(_correlationId, Request.Path, "An error occurred while retrieving popular content", _correlationId));
        }
    }

    /// <summary>
    /// Get content by slug for SEO-friendly URLs
    /// </summary>
    [HttpGet("slug/{type}/{slug}")]
    [AllowAnonymous]
    [ResponseCache(Duration = 900)] // 15 minutes
    public async Task<ActionResult<ContentData>> GetContentBySlug(
        [Required] string type,
        [Required] string slug)
    {
        try
        {
            _logger.LogBusinessEvent("content_slug_requested", new
            {
                ContentType = type,
                Slug = slug,
                CorrelationId = _correlationId
            });

            if (!IsValidContentType(type))
            {
                return BadRequest(ErrorResponseFactory.CreateBadRequestError(_correlationId, Request.Path, $"Invalid content type: {type}", _correlationId));
            }

            var content = await _contentService.GetContentBySlugAsync(type, slug);
            if (content == null)
            {
                _logger.LogBusinessEvent("content_slug_not_found", new
                {
                    ContentType = type,
                    Slug = slug,
                    CorrelationId = _correlationId
                });

                return NotFound(ErrorResponseFactory.CreateNotFoundError(_correlationId, Request.Path, "Content", $"{type}/{slug}", _correlationId));
            }

            _logger.LogBusinessEvent("content_slug_served", new
            {
                ContentType = type,
                Slug = slug,
                ContentId = content.Id,
                Title = content.Title,
                CorrelationId = _correlationId
            });

            return Ok(content);
        }
        catch (Exception ex)
        {
            _logger.LogBusinessEvent("content_slug_error", new
            {
                ContentType = type,
                Slug = slug,
                Error = ex.Message,
                CorrelationId = _correlationId
            });

            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(_correlationId, Request.Path, "An error occurred while retrieving content", _correlationId));
        }
    }

    /// <summary>
    /// Get streaming availability for specific content
    /// </summary>
    [HttpGet("{type}/{id}/streaming")]
    [AllowAnonymous]
    [ResponseCache(Duration = 1800)] // 30 minutes
    public async Task<ActionResult<List<StreamingAvailability>>> GetStreamingAvailability(
        [Required] string type,
        [Required] string id,
        string country = "US")
    {
        try
        {
            _logger.LogBusinessEvent("streaming_availability_requested", new
            {
                ContentType = type,
                ContentId = id,
                Country = country,
                CorrelationId = _correlationId
            });

            if (!IsValidContentType(type))
            {
                return BadRequest(ErrorResponseFactory.CreateBadRequestError(_correlationId, Request.Path, $"Invalid content type: {type}", _correlationId));
            }

            var streamingOptions = await _contentService.GetStreamingAvailabilityAsync(id, type, country);
            
            _logger.LogBusinessEvent("streaming_availability_served", new
            {
                ContentType = type,
                ContentId = id,
                Country = country,
                OptionsCount = streamingOptions.Count,
                CorrelationId = _correlationId
            });

            return Ok(streamingOptions);
        }
        catch (Exception ex)
        {
            _logger.LogBusinessEvent("streaming_availability_error", new
            {
                ContentType = type,
                ContentId = id,
                Country = country,
                Error = ex.Message,
                CorrelationId = _correlationId
            });

            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(_correlationId, Request.Path, "An error occurred while retrieving streaming availability", _correlationId));
        }
    }

    /// <summary>
    /// Get content for sitemap generation with pagination
    /// </summary>
    [HttpGet("sitemap")]
    [AllowAnonymous]
    [ResponseCache(Duration = 43200)] // 12 hours
    public async Task<ActionResult<ContentSitemapResponse>> GetContentForSitemap(
        int page = 1,
        int pageSize = 1000,
        string type = "all",
        DateTime? modifiedSince = null)
    {
        try
        {
            _logger.LogBusinessEvent("sitemap_content_requested", new
            {
                Page = page,
                PageSize = pageSize,
                ContentType = type,
                ModifiedSince = modifiedSince,
                CorrelationId = _correlationId
            });

            if (page < 1)
            {
                return BadRequest(ErrorResponseFactory.CreateBadRequestError(_correlationId, Request.Path, "Page must be 1 or greater", _correlationId));
            }

            if (pageSize < 1 || pageSize > 10000)
            {
                return BadRequest(ErrorResponseFactory.CreateBadRequestError(_correlationId, Request.Path, "PageSize must be between 1 and 10000", _correlationId));
            }

            var sitemapData = await _contentService.GetContentForSitemapAsync(page, pageSize, type, modifiedSince);
            
            _logger.LogBusinessEvent("sitemap_content_served", new
            {
                Page = page,
                PageSize = pageSize,
                ContentType = type,
                ResultCount = sitemapData.Content.Count,
                TotalCount = sitemapData.TotalCount,
                CorrelationId = _correlationId
            });

            return Ok(sitemapData);
        }
        catch (Exception ex)
        {
            _logger.LogBusinessEvent("sitemap_content_error", new
            {
                Page = page,
                PageSize = pageSize,
                ContentType = type,
                Error = ex.Message,
                CorrelationId = _correlationId
            });

            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(_correlationId, Request.Path, "An error occurred while retrieving sitemap content", _correlationId));
        }
    }

    /// <summary>
    /// Search for content with enhanced metadata for SEO
    /// </summary>
    [HttpGet("search")]
    [AllowAnonymous]
    [ResponseCache(Duration = 600)] // 10 minutes
    public async Task<ActionResult<ContentSearchResult>> SearchContent(
        [Required] string query,
        string type = "all",
        int page = 1,
        int pageSize = 20,
        string? country = "US")
    {
        try
        {
            _logger.LogBusinessEvent("content_search_requested", new
            {
                Query = query,
                ContentType = type,
                Page = page,
                PageSize = pageSize,
                Country = country,
                CorrelationId = _correlationId
            });

            if (string.IsNullOrWhiteSpace(query))
            {
                return BadRequest(ErrorResponseFactory.CreateBadRequestError(_correlationId, Request.Path, "Query parameter is required", _correlationId));
            }

            if (page < 1)
            {
                return BadRequest(ErrorResponseFactory.CreateBadRequestError(_correlationId, Request.Path, "Page must be 1 or greater", _correlationId));
            }

            if (pageSize < 1 || pageSize > 50)
            {
                return BadRequest(ErrorResponseFactory.CreateBadRequestError(_correlationId, Request.Path, "PageSize must be between 1 and 50", _correlationId));
            }

            var searchResults = await _contentService.SearchContentAsync(query, type, page, pageSize, country);
            
            _logger.LogBusinessEvent("content_search_served", new
            {
                Query = query,
                ContentType = type,
                Page = page,
                PageSize = pageSize,
                ResultCount = searchResults.Results.Count,
                TotalResults = searchResults.TotalResults,
                CorrelationId = _correlationId
            });

            return Ok(searchResults);
        }
        catch (Exception ex)
        {
            _logger.LogBusinessEvent("content_search_error", new
            {
                Query = query,
                ContentType = type,
                Error = ex.Message,
                CorrelationId = _correlationId
            });

            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(_correlationId, Request.Path, "An error occurred while searching content", _correlationId));
        }
    }

    /// <summary>
    /// Get multiple content items by batch request
    /// </summary>
    [HttpPost("batch")]
    [AllowAnonymous]
    [ResponseCache(Duration = 900)] // 15 minutes
    public async Task<ActionResult<List<ContentData>>> GetContentBatch(
        [FromBody] ContentBatchRequest request)
    {
        try
        {
            if (request == null || request.ContentIds == null || !request.ContentIds.Any())
            {
                return BadRequest(ErrorResponseFactory.CreateBadRequestError(_correlationId, Request.Path, "ContentIds cannot be null or empty", _correlationId));
            }

            if (request.ContentIds.Count > 50)
            {
                return BadRequest(ErrorResponseFactory.CreateBadRequestError(_correlationId, Request.Path, "Cannot request more than 50 content IDs at once", _correlationId));
            }

            _logger.LogBusinessEvent("content_batch_requested", new
            {
                ContentIdCount = request.ContentIds.Count,
                CorrelationId = _correlationId
            });

            var contentList = await _contentService.GetContentBatchAsync(request.ContentIds);

            _logger.LogBusinessEvent("content_batch_served", new
            {
                RequestedCount = request.ContentIds.Count,
                ServedCount = contentList.Count,
                CorrelationId = _correlationId
            });

            return Ok(contentList);
        }
        catch (Exception ex)
        {
            _logger.LogBusinessEvent("content_batch_error", new
            {
                Error = ex.Message,
                CorrelationId = _correlationId
            });

            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(_correlationId, Request.Path, "An error occurred while retrieving batch content", _correlationId));
        }
    }

    /// <summary>
    /// Search content with POST method for complex filters
    /// </summary>
    [HttpPost("search")]
    [AllowAnonymous]
    [ResponseCache(Duration = 600)] // 10 minutes
    public async Task<ActionResult<PaginatedResult<ContentData>>> SearchContent(
        [FromBody] ContentSearchRequest request)
    {
        try
        {
            if (request == null)
            {
                return BadRequest(ErrorResponseFactory.CreateBadRequestError(_correlationId, Request.Path, "Search request cannot be null", _correlationId));
            }

            if (string.IsNullOrWhiteSpace(request.Query) && (request.Genres == null || !request.Genres.Any()))
            {
                return BadRequest(ErrorResponseFactory.CreateBadRequestError(_correlationId, Request.Path, "Query or genres must be provided", _correlationId));
            }

            _logger.LogBusinessEvent("content_search_post_requested", new
            {
                Query = request.Query,
                ContentType = request.ContentType,
                Page = request.Page,
                PageSize = request.PageSize,
                CorrelationId = _correlationId
            });

            var searchResults = await _contentService.SearchContentAsync(request);

            _logger.LogBusinessEvent("content_search_post_served", new
            {
                Query = request.Query,
                Page = request.Page,
                PageSize = request.PageSize,
                ResultCount = searchResults.Items.Count,
                TotalResults = searchResults.TotalItems,
                CorrelationId = _correlationId
            });

            return Ok(searchResults);
        }
        catch (Exception ex)
        {
            _logger.LogBusinessEvent("content_search_post_error", new
            {
                Query = request?.Query,
                Error = ex.Message,
                CorrelationId = _correlationId
            });

            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(_correlationId, Request.Path, "An error occurred while searching content", _correlationId));
        }
    }

    /// <summary>
    /// Get SEO metadata for specific content
    /// </summary>
    [HttpGet("{id}/metadata")]
    [AllowAnonymous]
    [ResponseCache(Duration = 1800)] // 30 minutes
    public async Task<ActionResult<ContentMetadata>> GetContentMetadata(
        [Required] string id,
        string? type = "movie")
    {
        try
        {
            _logger.LogBusinessEvent("content_metadata_requested", new
            {
                ContentId = id,
                ContentType = type,
                CorrelationId = _correlationId
            });

            if (!IsValidContentType(type ?? "movie"))
            {
                return BadRequest(ErrorResponseFactory.CreateBadRequestError(_correlationId, Request.Path, $"Invalid content type: {type}", _correlationId));
            }

            var metadata = await _seoMetadataService.GetMetadataBySlugAsync(id, "en-US");
            if (metadata == null)
            {
                // Generate default metadata if none exists
                var content = await _contentService.GetContentByIdAsync(id, type ?? "movie");
                if (content != null)
                {
                    var request = new SeoMetadataRequest
                    {
                        ContentType = type ?? "movie",
                        Slug = id,
                        Title = content.Title,
                        Description = content.Overview ?? $"Watch {content.Title} online. Find streaming options and more information about this {type ?? "movie"}.",
                        Language = "en-US"
                    };
                    var generatedMetadata = await _seoMetadataService.GenerateMetadataAsync(request);
                    
                    var generatedResponse = new ContentMetadata
                    {
                        Id = int.TryParse(id, out var intId) ? intId : 0,
                        Title = generatedMetadata.Title,
                        Description = generatedMetadata.Description,
                        Keywords = generatedMetadata.Keywords.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList(),
                        OpenGraphData = generatedMetadata.OpenGraphData,
                        TwitterCardData = generatedMetadata.TwitterCardData,
                        StructuredData = string.IsNullOrEmpty(generatedMetadata.StructuredData) ? 
                            new Dictionary<string, object>() : 
                            JsonSerializer.Deserialize<Dictionary<string, object>>(generatedMetadata.StructuredData) ?? new Dictionary<string, object>()
                    };
                    
                    return Ok(generatedResponse);
                }
                
                // Generate minimal fallback metadata for testing or unknown content
                var fallbackResponse = new ContentMetadata
                {
                    Id = int.TryParse(id, out var fallbackIntId) ? fallbackIntId : 0,
                    Title = $"Content {id}",
                    Description = $"Watch {id} online. Find streaming options and discover where to watch this {type ?? "movie"}.",
                    Keywords = new List<string> { "streaming", "watch online", "movies", "tv shows" },
                    OpenGraphData = new Dictionary<string, string>
                    {
                        ["title"] = $"Content {id}",
                        ["description"] = $"Watch {id} online.",
                        ["type"] = type == "movie" ? "video.movie" : "video.tv_show",
                        ["image"] = ""
                    },
                    TwitterCardData = new Dictionary<string, string>
                    {
                        ["card"] = "summary_large_image",
                        ["title"] = $"Content {id}",
                        ["description"] = $"Watch {id} online.",
                        ["image"] = ""
                    },
                    StructuredData = new Dictionary<string, object>()
                };
                
                return Ok(fallbackResponse);
            }

            var response = new ContentMetadata
            {
                Id = int.TryParse(id, out var metadataIntId) ? metadataIntId : 0,
                Title = metadata.Title,
                Description = metadata.Description,
                Keywords = metadata.Keywords.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList(),
                OpenGraphData = new Dictionary<string, string>
                {
                    ["title"] = metadata.OgTitle ?? metadata.Title,
                    ["description"] = metadata.OgDescription ?? metadata.Description,
                    ["image"] = metadata.OgImage ?? "",
                    ["type"] = metadata.OgType
                },
                TwitterCardData = new Dictionary<string, string>
                {
                    ["card"] = metadata.TwitterCardType,
                    ["title"] = metadata.Title,
                    ["description"] = metadata.Description,
                    ["image"] = metadata.OgImage ?? ""
                },
                StructuredData = string.IsNullOrEmpty(metadata.StructuredData) ? 
                    new Dictionary<string, object>() : 
                    JsonSerializer.Deserialize<Dictionary<string, object>>(metadata.StructuredData) ?? new Dictionary<string, object>()
            };

            _logger.LogBusinessEvent("content_metadata_served", new
            {
                ContentId = id,
                ContentType = type,
                CorrelationId = _correlationId
            });

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogBusinessEvent("content_metadata_error", new
            {
                ContentId = id,
                ContentType = type,
                Error = ex.Message,
                CorrelationId = _correlationId
            });

            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(_correlationId, Request.Path, "An error occurred while retrieving content metadata", _correlationId));
        }
    }

    /// <summary>
    /// Get structured data for specific content
    /// </summary>
    [HttpGet("{id}/structured-data")]
    [AllowAnonymous]
    [ResponseCache(Duration = 1800)] // 30 minutes
    public async Task<ActionResult<Dictionary<string, object>>> GetContentStructuredData(
        [Required] string id,
        string? type = "movie")
    {
        try
        {
            _logger.LogBusinessEvent("content_structured_data_requested", new
            {
                ContentId = id,
                ContentType = type,
                CorrelationId = _correlationId
            });

            if (!IsValidContentType(type ?? "movie"))
            {
                return BadRequest(ErrorResponseFactory.CreateBadRequestError(_correlationId, Request.Path, $"Invalid content type: {type}", _correlationId));
            }

            // Get content details first
            var content = await _contentService.GetContentByIdAsync(id, type ?? "movie");
            if (content == null)
            {
                return NotFound(ErrorResponseFactory.CreateNotFoundError(_correlationId, Request.Path, "Content", id, _correlationId));
            }

            // Convert ContentData to ContentDetails for structured data generation
            var contentDetails = new ContentDetails
            {
                Id = int.TryParse(content.Id, out var intId) ? intId : 0,
                Title = content.Title,
                OriginalTitle = content.OriginalTitle,
                Overview = content.Overview,
                Type = content.Type == "movie" ? TmdbContentType.Movie : TmdbContentType.TvSeries,
                ReleaseDate = content.ReleaseYear.HasValue ? new DateTime(content.ReleaseYear.Value, 1, 1) : null,
                Genres = content.Genres?.ToList() ?? new List<string>(),
                Runtime = content.Runtime ?? 0,
                VoteAverage = content.Rating.HasValue ? (double)content.Rating.Value : null,
                VoteCount = content.VoteCount ?? 0,
                PosterPath = content.PosterUrl,
                BackdropPath = content.BackdropUrl,
                Cast = new List<CastMember>(),
                Crew = new List<CrewMember>(),
                ProductionCountries = content.ProductionCountries?.ToList() ?? new List<string>(),
                OriginalLanguages = new List<string> { content.OriginalLanguage ?? "en" }
            };

            string structuredDataJson;
            if (content.Type == "movie")
            {
                structuredDataJson = await _structuredDataService.GenerateMovieStructuredDataAsync(contentDetails);
            }
            else
            {
                structuredDataJson = await _structuredDataService.GenerateTvSeriesStructuredDataAsync(contentDetails);
            }

            // Parse and return the structured data as a Dictionary
            var structuredDataDict = string.IsNullOrEmpty(structuredDataJson) ?
                new Dictionary<string, object>
                {
                    ["@context"] = "https://schema.org",
                    ["@type"] = content.Type == "movie" ? "Movie" : "TVSeries",
                    ["name"] = content.Title,
                    ["description"] = content.Overview ?? $"Information about {content.Title}",
                    ["datePublished"] = content.ReleaseYear?.ToString() ?? DateTime.UtcNow.Year.ToString(),
                    ["genre"] = content.Genres?.ToArray() ?? Array.Empty<string>(),
                    ["url"] = $"/content/{type}/{content.Id}",
                    ["image"] = content.PosterUrl ?? ""
                } :
                JsonSerializer.Deserialize<Dictionary<string, object>>(structuredDataJson) ?? 
                new Dictionary<string, object>();

            _logger.LogBusinessEvent("content_structured_data_served", new
            {
                ContentId = id,
                ContentType = type,
                CorrelationId = _correlationId
            });

            return Ok(structuredDataDict);
        }
        catch (Exception ex)
        {
            _logger.LogBusinessEvent("content_structured_data_error", new
            {
                ContentId = id,
                ContentType = type,
                Error = ex.Message,
                CorrelationId = _correlationId
            });

            return StatusCode(500, ErrorResponseFactory.CreateInternalServerError(_correlationId, Request.Path, "An error occurred while retrieving structured data", _correlationId));
        }
    }

    private static bool IsValidContentType(string type)
    {
        return type.ToLowerInvariant() switch
        {
            "movie" or "movies" => true,
            "tv" or "tv-show" or "series" => true,
            "documentary" or "documentaries" => true,
            "anime" => true,
            "all" => true,
            _ => false
        };
    }
}

