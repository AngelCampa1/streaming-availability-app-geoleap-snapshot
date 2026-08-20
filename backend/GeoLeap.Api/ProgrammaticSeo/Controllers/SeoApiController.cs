using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.RateLimiting;
using GeoLeap.Api.ProgrammaticSeo.Models;
using GeoLeap.Api.ProgrammaticSeo.Services;
using System.ComponentModel.DataAnnotations;
using System.Text.Json;
using SeoInternalLink = GeoLeap.Api.ProgrammaticSeo.Models.InternalLink;
using SeoAnalytics = GeoLeap.Api.ProgrammaticSeo.Models.SeoAnalyticsResponse;

namespace GeoLeap.Api.ProgrammaticSeo.Controllers;

/// <summary>
/// RESTful API controller for programmatic SEO operations
/// Provides comprehensive endpoints for template management, content generation, and analytics
/// </summary>
[ApiController]
[Route("api/v1/seo")]
[Authorize(Roles = "Admin,ContentManager")]
[EnableRateLimiting("SeoApiPolicy")]
public class SeoApiController : ControllerBase
{
    private readonly ISeoTemplateService _templateService;
    private readonly IKeywordResearchService _keywordService;
    private readonly IContentMetadataService _contentMetadataService;
    private readonly ISeoBackgroundJobService? _backgroundJobService;
    private readonly ILogger<SeoApiController> _logger;
    
    public SeoApiController(
        ISeoTemplateService templateService,
        IKeywordResearchService keywordService,
        IContentMetadataService contentMetadataService,
        ILogger<SeoApiController> logger,
        ISeoBackgroundJobService? backgroundJobService = null)
    {
        _templateService = templateService;
        _keywordService = keywordService;
        _contentMetadataService = contentMetadataService;
        _backgroundJobService = backgroundJobService;
        _logger = logger;
    }
    
    #region Template Management
    
    /// <summary>
    /// Create a new SEO template
    /// </summary>
    [HttpPost("templates")]
    [ProducesResponseType(typeof(SeoTemplate), 201)]
    [ProducesResponseType(typeof(ValidationResult), 400)]
    public async Task<ActionResult<SeoTemplate>> CreateTemplate([FromBody] SeoTemplate template)
    {
        try
        {
            var validationErrors = await _templateService.GetTemplateErrorsAsync(template);
            if (validationErrors.Any())
            {
                return BadRequest(new ValidationResult(string.Join(", ", validationErrors)));
            }
            
            template.CreatedBy = User.Identity?.Name ?? "system";
            var createdTemplate = await _templateService.CreateTemplateAsync(template);
            
            _logger.LogInformation("SEO template created: {TemplateId} by {User}", createdTemplate.Id, template.CreatedBy);
            
            return CreatedAtAction(nameof(GetTemplate), new { id = createdTemplate.Id }, createdTemplate);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create SEO template");
            return StatusCode(500, new { error = "Failed to create template", details = ex.Message });
        }
    }
    
    /// <summary>
    /// Get SEO template by ID
    /// </summary>
    [HttpGet("templates/{id:int}")]
    [ProducesResponseType(typeof(SeoTemplate), 200)]
    [ProducesResponseType(404)]
    public async Task<ActionResult<SeoTemplate>> GetTemplate(int id)
    {
        var template = await _templateService.GetTemplateAsync(id);
        if (template == null)
        {
            return NotFound(new { error = $"Template with ID {id} not found" });
        }
        
        return Ok(template);
    }
    
    /// <summary>
    /// Get all SEO templates
    /// </summary>
    [HttpGet("templates")]
    [ProducesResponseType(typeof(List<SeoTemplate>), 200)]
    public async Task<ActionResult<List<SeoTemplate>>> GetTemplates(
        [FromQuery] string? type = null,
        [FromQuery] bool activeOnly = true)
    {
        var templates = string.IsNullOrEmpty(type)
            ? await _templateService.GetAllTemplatesAsync(activeOnly)
            : await _templateService.GetTemplatesByTypeAsync(type, activeOnly);
        
        return Ok(templates);
    }
    
    /// <summary>
    /// Update an existing SEO template
    /// </summary>
    [HttpPut("templates/{id:int}")]
    [ProducesResponseType(typeof(SeoTemplate), 200)]
    [ProducesResponseType(404)]
    [ProducesResponseType(typeof(ValidationResult), 400)]
    public async Task<ActionResult<SeoTemplate>> UpdateTemplate(int id, [FromBody] SeoTemplate template)
    {
        if (id != template.Id)
        {
            return BadRequest(new { error = "Template ID mismatch" });
        }
        
        var existingTemplate = await _templateService.GetTemplateAsync(id);
        if (existingTemplate == null)
        {
            return NotFound(new { error = $"Template with ID {id} not found" });
        }
        
        try
        {
            var validationErrors = await _templateService.GetTemplateErrorsAsync(template);
            if (validationErrors.Any())
            {
                return BadRequest(new ValidationResult(string.Join(", ", validationErrors)));
            }
            
            var updatedTemplate = await _templateService.UpdateTemplateAsync(template);
            
            _logger.LogInformation("SEO template updated: {TemplateId} by {User}", id, User.Identity?.Name);
            
            return Ok(updatedTemplate);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update SEO template {TemplateId}", id);
            return StatusCode(500, new { error = "Failed to update template", details = ex.Message });
        }
    }
    
    /// <summary>
    /// Delete an SEO template
    /// </summary>
    [HttpDelete("templates/{id:int}")]
    [ProducesResponseType(204)]
    [ProducesResponseType(404)]
    public async Task<IActionResult> DeleteTemplate(int id)
    {
        var success = await _templateService.DeleteTemplateAsync(id);
        if (!success)
        {
            return NotFound(new { error = $"Template with ID {id} not found" });
        }
        
        _logger.LogInformation("SEO template deleted: {TemplateId} by {User}", id, User.Identity?.Name);
        
        return NoContent();
    }
    
    /// <summary>
    /// Clone an existing template
    /// </summary>
    [HttpPost("templates/{id:int}/clone")]
    [ProducesResponseType(typeof(SeoTemplate), 201)]
    [ProducesResponseType(404)]
    public async Task<ActionResult<SeoTemplate>> CloneTemplate(int id, [FromBody] CloneTemplateRequest request)
    {
        try
        {
            var clonedTemplate = await _templateService.CloneTemplateAsync(id, request.NewName);
            
            _logger.LogInformation("SEO template cloned: {OriginalId} -> {NewId} by {User}", id, clonedTemplate.Id, User.Identity?.Name);
            
            return CreatedAtAction(nameof(GetTemplate), new { id = clonedTemplate.Id }, clonedTemplate);
        }
        catch (ArgumentException ex)
        {
            return NotFound(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to clone SEO template {TemplateId}", id);
            return StatusCode(500, new { error = "Failed to clone template", details = ex.Message });
        }
    }
    
    /// <summary>
    /// Validate template before saving
    /// </summary>
    [HttpPost("templates/validate")]
    [ProducesResponseType(typeof(TemplateValidationResult), 200)]
    public async Task<ActionResult<TemplateValidationResult>> ValidateTemplate([FromBody] SeoTemplate template)
    {
        var errors = await _templateService.GetTemplateErrorsAsync(template);
        var variables = await _templateService.ParseTemplateVariablesAsync(template.Template);
        
        return Ok(new TemplateValidationResult
        {
            IsValid = !errors.Any(),
            Errors = errors,
            Variables = variables
        });
    }
    
    #endregion
    
    #region Page Generation
    
    /// <summary>
    /// Generate a single SEO page with full content pipeline
    /// </summary>
    [HttpPost("pages/generate")]
    [ProducesResponseType(typeof(SeoPage), 201)]
    [ProducesResponseType(typeof(ValidationResult), 400)]
    public async Task<ActionResult<SeoPage>> GeneratePage([FromBody] SeoGenerationRequest request)
    {
        try
        {
            // Step 1: Generate the page content
            var page = await _templateService.GeneratePageAsync(request);
            
            // Step 2: Generate and inject internal links
            var internalLinks = await _templateService.GenerateInternalLinksAsync(request.TemplateId);
            if (internalLinks.ContainsKey(page.Id))
            {
                page.Content = await _templateService.InjectInternalLinksAsync(page.Content, internalLinks[page.Id]);
            }
            
            // Step 3: Enrich with content metadata
            if (request.Variables.ContainsKey("contentId") && request.Variables.ContainsKey("contentType"))
            {
                var contentId = request.Variables["contentId"].ToString();
                var contentType = request.Variables["contentType"].ToString();
                var metadata = await _contentMetadataService.GetContentMetadataAsync(contentId!, contentType!);
                
                if (metadata != null)
                {
                    // Update page with enriched metadata
                    page.PrimaryKeyword = metadata.Keywords?.FirstOrDefault();
                    
                    // Add metadata to variables for future use
                    var updatedVariables = request.Variables.ToDictionary(kv => kv.Key, kv => kv.Value);
                    updatedVariables["enriched_metadata"] = metadata;
                    page.VariableValues = JsonSerializer.Serialize(updatedVariables);
                }
            }
            
            // Step 4: Schedule background job for performance monitoring
            if (_backgroundJobService != null)
            {
                await _backgroundJobService.ScheduleDelayedJobAsync<ISeoPerformanceService>(
                    service => service.CollectMetricsAsync(),
                    TimeSpan.FromMinutes(5)
                );
            }
            
            _logger.LogInformation("SEO page fully generated with pipeline: {PageId} from template {TemplateId}", page.Id, request.TemplateId);
            
            return CreatedAtAction(nameof(GetPage), new { slug = page.Slug }, page);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate SEO page for template {TemplateId}", request.TemplateId);
            return StatusCode(500, new { error = "Failed to generate page", details = ex.Message });
        }
    }
    
    /// <summary>
    /// Start batch page generation
    /// </summary>
    [HttpPost("pages/generate/batch")]
    [ProducesResponseType(typeof(SeoBatchJob), 202)]
    [ProducesResponseType(typeof(ValidationResult), 400)]
    public async Task<ActionResult<SeoBatchJob>> StartBatchGeneration([FromBody] SeoBatchGenerationRequest request)
    {
        try
        {
            if (request.VariableSets.Count > 10000)
            {
                return BadRequest(new { error = "Batch size cannot exceed 10,000 pages" });
            }
            
            var job = await _templateService.StartBatchJobAsync(request);
            
            _logger.LogInformation("Batch SEO generation started: Job {JobId} with {PageCount} pages", job.Id, request.VariableSets.Count);
            
            return AcceptedAtAction(nameof(GetBatchJob), new { jobId = job.Id }, job);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to start batch generation");
            return StatusCode(500, new { error = "Failed to start batch generation", details = ex.Message });
        }
    }
    
    /// <summary>
    /// Get SEO page by slug
    /// </summary>
    [HttpGet("pages/{slug}")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(SeoPage), 200)]
    [ProducesResponseType(404)]
    public async Task<ActionResult<SeoPage>> GetPage(string slug)
    {
        var page = await _templateService.GetPageBySlugAsync(slug);
        if (page == null)
        {
            return NotFound(new { error = $"Page with slug '{slug}' not found" });
        }
        
        return Ok(page);
    }
    
    /// <summary>
    /// Get pages by template ID
    /// </summary>
    [HttpGet("templates/{templateId:int}/pages")]
    [ProducesResponseType(typeof(List<SeoPage>), 200)]
    public async Task<ActionResult<List<SeoPage>>> GetPagesByTemplate(
        int templateId,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50)
    {
        if (pageSize > 100) pageSize = 100;
        
        var pages = await _templateService.GetPagesByTemplateAsync(templateId, page, pageSize);
        return Ok(pages);
    }
    
    /// <summary>
    /// Get batch job status
    /// </summary>
    [HttpGet("batch-jobs/{jobId:long}")]
    [ProducesResponseType(typeof(SeoBatchJob), 200)]
    [ProducesResponseType(404)]
    public Task<ActionResult<SeoBatchJob>> GetBatchJob(long jobId)
    {
        // Implementation would retrieve from database
        return Task.FromResult<ActionResult<SeoBatchJob>>(NotFound()); // Placeholder
    }
    
    #endregion
    
    #region Keyword Research
    
    /// <summary>
    /// Discover keywords based on seed keyword
    /// </summary>
    [HttpPost("keywords/discover")]
    [ProducesResponseType(typeof(List<SeoKeyword>), 200)]
    public async Task<ActionResult<List<SeoKeyword>>> DiscoverKeywords([FromBody] KeywordDiscoveryRequest request)
    {
        try
        {
            var keywords = await _keywordService.DiscoverKeywordsAsync(request.SeedKeyword, request.MaxResults);
            
            _logger.LogInformation("Discovered {Count} keywords for seed '{Seed}'", keywords.Count, request.SeedKeyword);
            
            return Ok(keywords);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to discover keywords for '{Seed}'", request.SeedKeyword);
            return StatusCode(500, new { error = "Failed to discover keywords", details = ex.Message });
        }
    }
    
    /// <summary>
    /// Get trending keywords
    /// </summary>
    [HttpGet("keywords/trending")]
    [ProducesResponseType(typeof(List<SeoKeyword>), 200)]
    public async Task<ActionResult<List<SeoKeyword>>> GetTrendingKeywords(
        [FromQuery] string contentType = "all",
        [FromQuery] int days = 7)
    {
        var keywords = await _keywordService.GetTrendingKeywordsAsync(contentType, days);
        return Ok(keywords);
    }
    
    /// <summary>
    /// Analyze a specific keyword
    /// </summary>
    [HttpPost("keywords/analyze")]
    [ProducesResponseType(typeof(SeoKeyword), 200)]
    public async Task<ActionResult<SeoKeyword>> AnalyzeKeyword([FromBody] KeywordAnalysisRequest request)
    {
        try
        {
            var keyword = await _keywordService.AnalyzeKeywordAsync(request.Keyword);
            return Ok(keyword);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to analyze keyword '{Keyword}'", request.Keyword);
            return StatusCode(500, new { error = "Failed to analyze keyword", details = ex.Message });
        }
    }
    
    /// <summary>
    /// Get low competition keywords
    /// </summary>
    [HttpGet("keywords/low-competition")]
    [ProducesResponseType(typeof(List<string>), 200)]
    public async Task<ActionResult<List<string>>> GetLowCompetitionKeywords(
        [FromQuery] string category = "streaming",
        [FromQuery] int maxDifficulty = 30)
    {
        var keywords = await _keywordService.GetLowCompetitionKeywordsAsync(category, maxDifficulty);
        return Ok(keywords);
    }
    
    #endregion
    
    #region Content Metadata
    
    /// <summary>
    /// Import streaming availability data
    /// </summary>
    [HttpPost("content/import/streaming")]
    [ProducesResponseType(typeof(ImportResult), 200)]
    public async Task<ActionResult<ImportResult>> ImportStreamingAvailability([FromQuery] string country = "US")
    {
        try
        {
            var metadata = await _contentMetadataService.ImportStreamingAvailabilityAsync(country);
            
            return Ok(new ImportResult
            {
                ImportedCount = metadata.Count,
                ImportedAt = DateTime.UtcNow,
                Source = "streaming_availability"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to import streaming availability for {Country}", country);
            return StatusCode(500, new { error = "Failed to import data", details = ex.Message });
        }
    }
    
    /// <summary>
    /// Get content metadata
    /// </summary>
    [HttpGet("content/{contentId}/metadata")]
    [ProducesResponseType(typeof(Models.ContentMetadata), 200)]
    [ProducesResponseType(404)]
    public async Task<ActionResult<Models.ContentMetadata>> GetContentMetadata(string contentId, [FromQuery] string contentType = "movie")
    {
        var metadata = await _contentMetadataService.GetContentMetadataAsync(contentId, contentType);
        if (metadata == null)
        {
            return NotFound(new { error = $"Content metadata not found for ID '{contentId}'" });
        }
        
        return Ok(metadata);
    }
    
    /// <summary>
    /// Get trending content by location
    /// </summary>
    [HttpGet("content/trending")]
    [ProducesResponseType(typeof(List<Models.TrendingContent>), 200)]
    public async Task<ActionResult<List<Models.TrendingContent>>> GetTrendingContent(
        [FromQuery] string country = "US",
        [FromQuery] int days = 7)
    {
        var trending = await _contentMetadataService.GetTrendingContentByLocationAsync(country, days);
        return Ok(trending);
    }
    
    #endregion
    
    #region Analytics
    
    /// <summary>
    /// Get comprehensive SEO analytics
    /// </summary>
    [HttpGet("analytics")]
    [ProducesResponseType(typeof(SeoAnalytics), 200)]
    public async Task<ActionResult<SeoAnalytics>> GetAnalytics(
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null)
    {
        var analytics = await _templateService.GetAnalyticsAsync(startDate, endDate);
        return Ok(analytics);
    }
    
    /// <summary>
    /// Get top performing pages
    /// </summary>
    [HttpGet("analytics/top-pages")]
    [ProducesResponseType(typeof(List<TopPerformingPage>), 200)]
    public async Task<ActionResult<List<TopPerformingPage>>> GetTopPerformingPages([FromQuery] int count = 10)
    {
        var pages = await _templateService.GetTopPerformingPagesAsync(count);
        return Ok(pages);
    }
    
    /// <summary>
    /// Generate XML sitemap
    /// </summary>
    [HttpGet("sitemap.xml")]
    [AllowAnonymous]
    [Produces("application/xml")]
    public async Task<IActionResult> GetSitemap([FromQuery] List<int>? templateIds = null)
    {
        var xmlSitemap = await _templateService.GenerateXmlSitemapAsync(templateIds);
        return Content(xmlSitemap, "application/xml");
    }
    
    #endregion
    
    #region Health and Maintenance
    
    /// <summary>
    /// Refresh outdated pages
    /// </summary>
    [HttpPost("maintenance/refresh")]
    [ProducesResponseType(typeof(MaintenanceResult), 200)]
    public async Task<ActionResult<MaintenanceResult>> RefreshOutdatedPages([FromQuery] int batchSize = 100)
    {
        var refreshedCount = await _templateService.RefreshOutdatedPagesAsync(batchSize);
        
        return Ok(new MaintenanceResult
        {
            Operation = "refresh_pages",
            ProcessedCount = refreshedCount,
            CompletedAt = DateTime.UtcNow
        });
    }
    
    /// <summary>
    /// Detect duplicate content
    /// </summary>
    [HttpPost("maintenance/detect-duplicates")]
    [ProducesResponseType(typeof(List<SeoPage>), 200)]
    public async Task<ActionResult<List<SeoPage>>> DetectDuplicates([FromQuery] float threshold = 0.8f)
    {
        var duplicates = await _templateService.DetectDuplicateContentAsync(threshold);
        return Ok(duplicates);
    }
    
    /// <summary>
    /// Get system health status
    /// </summary>
    [HttpGet("health")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(HealthStatus), 200)]
    public async Task<ActionResult<HealthStatus>> GetHealthStatus()
    {
        var stats = await _templateService.GetSitemapStatsAsync();
        
        return Ok(new HealthStatus
        {
            Status = "healthy",
            Timestamp = DateTime.UtcNow,
            Statistics = stats
        });
    }
    
    /// <summary>
    /// Comprehensive SEO pipeline that generates pages with full automation
    /// </summary>
    [HttpPost("pipeline/generate")]
    [ProducesResponseType(typeof(SeoGenerationPipelineResult), 201)]
    public async Task<ActionResult<SeoGenerationPipelineResult>> RunFullSeoGeneration([FromBody] SeoGenerationPipelineRequest request)
    {
        try
        {
            var result = new SeoGenerationPipelineResult
            {
                TemplateId = request.TemplateId,
                StartedAt = DateTime.UtcNow
            };
            
            // Step 1: Keyword research for the content
            var keywords = await _keywordService.DiscoverKeywordsAsync(request.SeedKeyword, 50);
            result.KeywordsDiscovered = keywords.Count;
            
            // Step 2: Get trending content for variables
            var trendingContent = await _contentMetadataService.GetTrendingContentByLocationAsync(request.Country, 7);
            
            // Step 3: Generate variable sets from content and keywords
            var variableSets = new List<Dictionary<string, object>>();
            
            foreach (var content in trendingContent.Take(request.MaxPages))
            {
                var variables = new Dictionary<string, object>
                {
                    ["title"] = content.Title,
                    ["contentId"] = content.ContentId,
                    ["contentType"] = content.Type,
                    ["country"] = request.Country,
                    ["keywords"] = keywords.Take(5).Select(k => k.Keyword).ToArray()
                };
                
                // Add trending keywords
                if (keywords.Any())
                {
                    variables["primaryKeyword"] = keywords.First().Keyword;
                    variables["relatedKeywords"] = keywords.Skip(1).Take(3).Select(k => k.Keyword).ToArray();
                }
                
                variableSets.Add(variables);
            }
            
            // Step 4: Start batch generation
            var batchRequest = new SeoBatchGenerationRequest
            {
                TemplateId = request.TemplateId,
                VariableSets = variableSets,
                JobName = $"SEO Pipeline - {request.SeedKeyword} - {DateTime.UtcNow:yyyy-MM-dd}",
                PublishImmediately = request.PublishImmediately,
                BatchSize = 10,
                ConcurrencyLimit = 3
            };
            
            var batchJob = await _templateService.StartBatchJobAsync(batchRequest);
            result.BatchJobId = batchJob.Id;
            
            // Step 5: Schedule performance monitoring
            if (_backgroundJobService != null)
            {
                await _backgroundJobService.ScheduleDelayedJobAsync<ISeoPerformanceService>(
                    service => service.CollectMetricsAsync(),
                    TimeSpan.FromMinutes(10)
                );
            }
            
            result.CompletedAt = DateTime.UtcNow;
            result.Success = true;
            result.Message = $"SEO pipeline started successfully. Generated {variableSets.Count} pages for batch processing.";
            
            _logger.LogInformation("Full SEO pipeline completed for keyword '{SeedKeyword}' with {PageCount} pages", request.SeedKeyword, variableSets.Count);
            
            return CreatedAtAction(nameof(GetBatchJob), new { jobId = batchJob.Id }, result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "SEO pipeline failed for keyword '{SeedKeyword}'", request.SeedKeyword);
            return StatusCode(500, new 
            { 
                error = "SEO pipeline failed", 
                details = ex.Message,
                seedKeyword = request.SeedKeyword
            });
        }
    }
    
    /// <summary>
    /// Get comprehensive SEO dashboard data
    /// </summary>
    [HttpGet("dashboard")]
    [ProducesResponseType(typeof(SeoDashboardData), 200)]
    public async Task<ActionResult<SeoDashboardData>> GetDashboard()
    {
        try
        {
            var dashboard = new SeoDashboardData
            {
                GeneratedAt = DateTime.UtcNow
            };
            
            // Get analytics data
            var analytics = await _templateService.GetAnalyticsAsync(DateTime.UtcNow.AddDays(-30), DateTime.UtcNow);
            dashboard.TotalPages = analytics.TotalPages;
            dashboard.PublishedPages = analytics.PublishedPages;
            dashboard.TotalViews = analytics.TotalViews;
            dashboard.UniqueVisitors = analytics.UniqueVisitors;
            
            // Get trending keywords
            var trendingKeywords = await _keywordService.GetTrendingKeywordsAsync("all", 7);
            dashboard.TrendingKeywords = trendingKeywords.Take(10).Select(k => k.Keyword).ToArray();
            
            // Get top performing pages
            var topPages = await _templateService.GetTopPerformingPagesAsync(10);
            dashboard.TopPerformingPages = topPages;
            
            // Get recent batch jobs
            dashboard.RecentBatchJobs = new List<SeoBatchJob>(); // Would get from database
            
            // Get system performance (from cache if available)
            dashboard.SystemPerformance = new Dictionary<string, object>();
            
            return Ok(dashboard);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load SEO dashboard");
            return StatusCode(500, new { error = "Failed to load dashboard", details = ex.Message });
        }
    }
    
    #endregion
}

#region Request/Response Models

public class CloneTemplateRequest
{
    [Required]
    [MaxLength(100)]
    public string NewName { get; set; } = string.Empty;
    
    public Dictionary<string, object>? Modifications { get; set; }
}

public class TemplateValidationResult
{
    public bool IsValid { get; set; }
    public List<string> Errors { get; set; } = new();
    public Dictionary<string, object> Variables { get; set; } = new();
}

public class KeywordDiscoveryRequest
{
    [Required]
    [MaxLength(200)]
    public string SeedKeyword { get; set; } = string.Empty;
    
    [Range(1, 1000)]
    public int MaxResults { get; set; } = 100;
}

public class KeywordAnalysisRequest
{
    [Required]
    [MaxLength(200)]
    public string Keyword { get; set; } = string.Empty;
}

public class ImportResult
{
    public int ImportedCount { get; set; }
    public DateTime ImportedAt { get; set; }
    public string Source { get; set; } = string.Empty;
}

public class MaintenanceResult
{
    public string Operation { get; set; } = string.Empty;
    public int ProcessedCount { get; set; }
    public DateTime CompletedAt { get; set; }
}

public class HealthStatus
{
    public string Status { get; set; } = string.Empty;
    public DateTime Timestamp { get; set; }
    public Dictionary<string, object> Statistics { get; set; } = new();
}

public class ValidationResult
{
    public string Message { get; set; } = string.Empty;
    
    public ValidationResult(string message)
    {
        Message = message;
    }
}

/// <summary>
/// Request model for the comprehensive SEO pipeline
/// </summary>
public class SeoGenerationPipelineRequest
{
    public int TemplateId { get; set; }
    public string SeedKeyword { get; set; } = string.Empty;
    public string Country { get; set; } = "US";
    public int MaxPages { get; set; } = 50;
    public bool PublishImmediately { get; set; } = true;
}

/// <summary>
/// Result model for the comprehensive SEO pipeline
/// </summary>
public class SeoGenerationPipelineResult
{
    public int TemplateId { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public long BatchJobId { get; set; }
    public int KeywordsDiscovered { get; set; }
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
}

/// <summary>
/// SEO dashboard data model
/// </summary>
public class SeoDashboardData
{
    public DateTime GeneratedAt { get; set; }
    public int TotalPages { get; set; }
    public int PublishedPages { get; set; }
    public int TotalViews { get; set; }
    public int UniqueVisitors { get; set; }
    public string[] TrendingKeywords { get; set; } = Array.Empty<string>();
    public List<TopPerformingPage> TopPerformingPages { get; set; } = new();
    public List<SeoBatchJob> RecentBatchJobs { get; set; } = new();
    public Dictionary<string, object> SystemPerformance { get; set; } = new();
}

#endregion