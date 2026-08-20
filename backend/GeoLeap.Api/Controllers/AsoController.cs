using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using GeoLeap.Api.Services;
using GeoLeap.Api.Models;
using GeoLeap.Api.Extensions;
using System.Security.Claims;

namespace GeoLeap.Api.Controllers;

/// <summary>
/// ASO (App Store Optimization) controller with ML-powered keyword discovery and comprehensive analytics
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AsoController : ControllerBase
{
    private readonly IAsoService _asoService;
    private readonly ILogger<AsoController> _logger;

    public AsoController(IAsoService asoService, ILogger<AsoController> logger)
    {
        _asoService = asoService;
        _logger = logger;
    }

    private Guid GetUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value ?? User.FindFirst("sub")?.Value;
        return Guid.TryParse(userIdClaim, out var userId) ? userId : throw new UnauthorizedAccessException("User ID not found");
    }

    #region Keyword Management

    /// <summary>
    /// Get all keywords for the authenticated user
    /// </summary>
    [HttpGet("keywords")]
    public async Task<ActionResult<List<AsoKeywordDto>>> GetKeywords(
        [FromQuery] AppStore? appStore = null,
        [FromQuery] string? country = null)
    {
        try
        {
            var userId = GetUserId();
            var keywords = await _asoService.GetKeywordsAsync(userId, appStore, country);
            return Ok(keywords);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving keywords");
            return StatusCode(500, "An error occurred while retrieving keywords");
        }
    }

    /// <summary>
    /// Get a specific keyword by ID
    /// </summary>
    [HttpGet("keywords/{id}")]
    public async Task<ActionResult<AsoKeywordDto>> GetKeyword(int id)
    {
        try
        {
            var userId = GetUserId();
            var keyword = await _asoService.GetKeywordAsync(id, userId);
            return Ok(keyword);
        }
        catch (KeyNotFoundException)
        {
            return NotFound($"Keyword {id} not found");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving keyword {Id}", id);
            return StatusCode(500, "An error occurred while retrieving the keyword");
        }
    }

    /// <summary>
    /// Create a new keyword
    /// </summary>
    [HttpPost("keywords")]
    public async Task<ActionResult<AsoKeywordDto>> CreateKeyword([FromBody] CreateAsoKeywordDto dto)
    {
        try
        {
            if (!ModelState.IsValid)
                return this.StandardBadRequest("Invalid request");

            var userId = GetUserId();
            var keyword = await _asoService.CreateKeywordAsync(dto, userId);
            return CreatedAtAction(nameof(GetKeyword), new { id = keyword.Id }, keyword);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating keyword '{Keyword}'", dto.Keyword);
            return StatusCode(500, "An error occurred while creating the keyword");
        }
    }

    /// <summary>
    /// Update an existing keyword
    /// </summary>
    [HttpPut("keywords/{id}")]
    public async Task<ActionResult<AsoKeywordDto>> UpdateKeyword(int id, [FromBody] CreateAsoKeywordDto dto)
    {
        try
        {
            if (!ModelState.IsValid)
                return this.StandardBadRequest("Invalid request");

            var userId = GetUserId();
            var keyword = await _asoService.UpdateKeywordAsync(id, dto, userId);
            return Ok(keyword);
        }
        catch (KeyNotFoundException)
        {
            return NotFound($"Keyword {id} not found");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating keyword {Id}", id);
            return StatusCode(500, "An error occurred while updating the keyword");
        }
    }

    /// <summary>
    /// Delete a keyword
    /// </summary>
    [HttpDelete("keywords/{id}")]
    public async Task<ActionResult> DeleteKeyword(int id)
    {
        try
        {
            var userId = GetUserId();
            var deleted = await _asoService.DeleteKeywordAsync(id, userId);
            
            if (!deleted)
                return NotFound($"Keyword {id} not found");

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting keyword {Id}", id);
            return StatusCode(500, "An error occurred while deleting the keyword");
        }
    }

    /// <summary>
    /// Bulk import keywords from CSV or list
    /// </summary>
    [HttpPost("keywords/bulk-import")]
    public async Task<ActionResult<List<AsoKeywordDto>>> BulkImportKeywords([FromBody] List<CreateAsoKeywordDto> keywords)
    {
        try
        {
            if (!ModelState.IsValid)
                return this.StandardBadRequest("Invalid request");

            var userId = GetUserId();
            var importedKeywords = await _asoService.BulkImportKeywordsAsync(keywords, userId);
            
            return Ok(new
            {
                ImportedCount = importedKeywords.Count,
                TotalRequested = keywords.Count,
                Keywords = importedKeywords
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error bulk importing keywords");
            return StatusCode(500, "An error occurred while importing keywords");
        }
    }

    #endregion

    #region ML-Powered Keyword Discovery

    /// <summary>
    /// Discover keywords using ML algorithms and competitor analysis
    /// </summary>
    [HttpPost("keywords/discover")]
    public async Task<ActionResult<List<AsoKeywordDto>>> DiscoverKeywords([FromBody] KeywordDiscoveryRequestDto request)
    {
        try
        {
            if (!ModelState.IsValid)
                return this.StandardBadRequest("Invalid request");

            var userId = GetUserId();
            var discoveredKeywords = await _asoService.DiscoverKeywordsAsync(request, userId);
            
            return Ok(new
            {
                DiscoveredCount = discoveredKeywords.Count,
                SeedKeywords = request.SeedKeywords,
                Keywords = discoveredKeywords
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error in keyword discovery");
            return StatusCode(500, "An error occurred during keyword discovery");
        }
    }

    /// <summary>
    /// Analyze competitor keywords
    /// </summary>
    [HttpPost("keywords/analyze-competitor")]
    public async Task<ActionResult<List<AsoKeywordDto>>> AnalyzeCompetitorKeywords(
        [FromQuery] string bundleId,
        [FromQuery] AppStore appStore,
        [FromQuery] string country = "US")
    {
        try
        {
            if (string.IsNullOrEmpty(bundleId))
                return this.StandardBadRequest("Bundle ID is required");

            var userId = GetUserId();
            var competitorKeywords = await _asoService.AnalyzeCompetitorKeywordsAsync(bundleId, appStore, country, userId);
            
            return Ok(new
            {
                CompetitorBundleId = bundleId,
                KeywordCount = competitorKeywords.Count,
                Keywords = competitorKeywords
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error analyzing competitor keywords for {BundleId}", bundleId);
            return StatusCode(500, "An error occurred while analyzing competitor keywords");
        }
    }

    /// <summary>
    /// Update keyword metrics using latest data
    /// </summary>
    [HttpPost("keywords/{id}/update-metrics")]
    public async Task<ActionResult> UpdateKeywordMetrics(int id)
    {
        try
        {
            await _asoService.UpdateKeywordMetricsAsync(id);
            return Ok(new { Message = "Keyword metrics updated successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating keyword metrics for {Id}", id);
            return StatusCode(500, "An error occurred while updating keyword metrics");
        }
    }

    /// <summary>
    /// Get keyword performance analytics
    /// </summary>
    [HttpGet("keywords/performance")]
    public async Task<ActionResult<Dictionary<string, object>>> GetKeywordPerformance(
        [FromQuery] DateTime? fromDate = null)
    {
        try
        {
            var userId = GetUserId();
            var performance = await _asoService.GetKeywordPerformanceAsync(userId, fromDate);
            return Ok(performance);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving keyword performance");
            return StatusCode(500, "An error occurred while retrieving keyword performance");
        }
    }

    #endregion

    #region App Store Listing Management

    /// <summary>
    /// Get all app store listings for the authenticated user
    /// </summary>
    [HttpGet("listings")]
    public async Task<ActionResult<List<AppStoreListingDto>>> GetListings(
        [FromQuery] AppStore? appStore = null)
    {
        try
        {
            var userId = GetUserId();
            var listings = await _asoService.GetListingsAsync(userId, appStore);
            return Ok(listings);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving listings");
            return StatusCode(500, "An error occurred while retrieving listings");
        }
    }

    /// <summary>
    /// Get a specific app store listing by ID
    /// </summary>
    [HttpGet("listings/{id}")]
    public async Task<ActionResult<AppStoreListingDto>> GetListing(int id)
    {
        try
        {
            var userId = GetUserId();
            var listing = await _asoService.GetListingAsync(id, userId);
            return Ok(listing);
        }
        catch (KeyNotFoundException)
        {
            return NotFound($"Listing {id} not found");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving listing {Id}", id);
            return StatusCode(500, "An error occurred while retrieving the listing");
        }
    }

    /// <summary>
    /// Create a new app store listing
    /// </summary>
    [HttpPost("listings")]
    public async Task<ActionResult<AppStoreListingDto>> CreateListing([FromBody] CreateAppStoreListingDto dto)
    {
        try
        {
            if (!ModelState.IsValid)
                return this.StandardBadRequest("Invalid request");

            var userId = GetUserId();
            var listing = await _asoService.CreateListingAsync(dto, userId);
            return CreatedAtAction(nameof(GetListing), new { id = listing.Id }, listing);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating listing '{AppName}'", dto.AppName);
            return StatusCode(500, "An error occurred while creating the listing");
        }
    }

    /// <summary>
    /// Update an existing app store listing
    /// </summary>
    [HttpPut("listings/{id}")]
    public async Task<ActionResult<AppStoreListingDto>> UpdateListing(int id, [FromBody] CreateAppStoreListingDto dto)
    {
        try
        {
            if (!ModelState.IsValid)
                return this.StandardBadRequest("Invalid request");

            var userId = GetUserId();
            var listing = await _asoService.UpdateListingAsync(id, dto, userId);
            return Ok(listing);
        }
        catch (KeyNotFoundException)
        {
            return NotFound($"Listing {id} not found");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating listing {Id}", id);
            return StatusCode(500, "An error occurred while updating the listing");
        }
    }

    /// <summary>
    /// Delete an app store listing
    /// </summary>
    [HttpDelete("listings/{id}")]
    public async Task<ActionResult> DeleteListing(int id)
    {
        try
        {
            var userId = GetUserId();
            var deleted = await _asoService.DeleteListingAsync(id, userId);
            
            if (!deleted)
                return NotFound($"Listing {id} not found");

            return NoContent();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting listing {Id}", id);
            return StatusCode(500, "An error occurred while deleting the listing");
        }
    }

    #endregion

    #region Review Management

    /// <summary>
    /// Get reviews for a specific app store listing
    /// </summary>
    [HttpGet("listings/{listingId}/reviews")]
    public async Task<ActionResult<List<AppStoreReview>>> GetReviews(
        int listingId,
        [FromQuery] DateTime? fromDate = null)
    {
        try
        {
            var userId = GetUserId();
            var reviews = await _asoService.GetReviewsAsync(listingId, userId, fromDate);
            return Ok(reviews);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving reviews for listing {ListingId}", listingId);
            return StatusCode(500, "An error occurred while retrieving reviews");
        }
    }

    /// <summary>
    /// Analyze sentiment for a specific review
    /// </summary>
    [HttpPost("reviews/{reviewId}/analyze-sentiment")]
    public async Task<ActionResult<AppStoreReview>> AnalyzeReviewSentiment(int reviewId)
    {
        try
        {
            var review = await _asoService.AnalyzeReviewSentimentAsync(reviewId);
            return Ok(review);
        }
        catch (KeyNotFoundException)
        {
            return NotFound($"Review {reviewId} not found");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error analyzing sentiment for review {ReviewId}", reviewId);
            return StatusCode(500, "An error occurred while analyzing review sentiment");
        }
    }

    /// <summary>
    /// Get review analytics for a listing
    /// </summary>
    [HttpGet("listings/{listingId}/reviews/analytics")]
    public async Task<ActionResult<Dictionary<string, object>>> GetReviewAnalytics(
        int listingId,
        [FromQuery] DateTime? fromDate = null)
    {
        try
        {
            var userId = GetUserId();
            var analytics = await _asoService.GetReviewAnalyticsAsync(listingId, userId, fromDate);
            return Ok(analytics);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving review analytics for listing {ListingId}", listingId);
            return StatusCode(500, "An error occurred while retrieving review analytics");
        }
    }

    /// <summary>
    /// Sync reviews from app store
    /// </summary>
    [HttpPost("listings/{listingId}/reviews/sync")]
    public async Task<ActionResult> SyncReviews(int listingId)
    {
        try
        {
            var userId = GetUserId();
            await _asoService.SyncReviewsAsync(listingId, userId);
            return Ok(new { Message = "Reviews synced successfully" });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error syncing reviews for listing {ListingId}", listingId);
            return StatusCode(500, "An error occurred while syncing reviews");
        }
    }

    #endregion

    #region A/B Testing

    /// <summary>
    /// Get all A/B tests for the authenticated user
    /// </summary>
    [HttpGet("ab-tests")]
    public async Task<ActionResult<List<AsoAbTest>>> GetAbTests(
        [FromQuery] AbTestStatus? status = null)
    {
        try
        {
            var userId = GetUserId();
            var abTests = await _asoService.GetAbTestsAsync(userId, status);
            return Ok(abTests);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving A/B tests");
            return StatusCode(500, "An error occurred while retrieving A/B tests");
        }
    }

    /// <summary>
    /// Get a specific A/B test by ID
    /// </summary>
    [HttpGet("ab-tests/{id}")]
    public async Task<ActionResult<AsoAbTest>> GetAbTest(int id)
    {
        try
        {
            var userId = GetUserId();
            var abTest = await _asoService.GetAbTestAsync(id, userId);
            return Ok(abTest);
        }
        catch (KeyNotFoundException)
        {
            return NotFound($"A/B test {id} not found");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving A/B test {Id}", id);
            return StatusCode(500, "An error occurred while retrieving the A/B test");
        }
    }

    /// <summary>
    /// Create a new A/B test
    /// </summary>
    [HttpPost("ab-tests")]
    public async Task<ActionResult<AsoAbTest>> CreateAbTest([FromBody] CreateAsoAbTestDto dto)
    {
        try
        {
            if (!ModelState.IsValid)
                return this.StandardBadRequest("Invalid request");

            var userId = GetUserId();
            var abTest = await _asoService.CreateAbTestAsync(dto, userId);
            return CreatedAtAction(nameof(GetAbTest), new { id = abTest.Id }, abTest);
        }
        catch (InvalidOperationException ex)
        {
            return this.StandardBadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating A/B test '{Name}'", dto.Name);
            return StatusCode(500, "An error occurred while creating the A/B test");
        }
    }

    /// <summary>
    /// Start an A/B test
    /// </summary>
    [HttpPost("ab-tests/{id}/start")]
    public async Task<ActionResult<AsoAbTest>> StartAbTest(int id)
    {
        try
        {
            var userId = GetUserId();
            var abTest = await _asoService.StartAbTestAsync(id, userId);
            return Ok(abTest);
        }
        catch (KeyNotFoundException)
        {
            return NotFound($"A/B test {id} not found");
        }
        catch (InvalidOperationException ex)
        {
            return this.StandardBadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error starting A/B test {Id}", id);
            return StatusCode(500, "An error occurred while starting the A/B test");
        }
    }

    /// <summary>
    /// Stop an A/B test
    /// </summary>
    [HttpPost("ab-tests/{id}/stop")]
    public async Task<ActionResult<AsoAbTest>> StopAbTest(int id)
    {
        try
        {
            var userId = GetUserId();
            var abTest = await _asoService.StopAbTestAsync(id, userId);
            return Ok(abTest);
        }
        catch (KeyNotFoundException)
        {
            return NotFound($"A/B test {id} not found");
        }
        catch (InvalidOperationException ex)
        {
            return this.StandardBadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error stopping A/B test {Id}", id);
            return StatusCode(500, "An error occurred while stopping the A/B test");
        }
    }

    /// <summary>
    /// Get A/B test results with statistical analysis
    /// </summary>
    [HttpGet("ab-tests/{id}/results")]
    public async Task<ActionResult<Dictionary<string, object>>> GetAbTestResults(int id)
    {
        try
        {
            var userId = GetUserId();
            var results = await _asoService.GetAbTestResultsAsync(id, userId);
            return Ok(results);
        }
        catch (KeyNotFoundException)
        {
            return NotFound($"A/B test {id} not found");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving A/B test results for {Id}", id);
            return StatusCode(500, "An error occurred while retrieving A/B test results");
        }
    }

    /// <summary>
    /// Update A/B test metrics
    /// </summary>
    [HttpPost("ab-tests/{id}/update-metrics")]
    public async Task<ActionResult> UpdateAbTestMetrics(int id)
    {
        try
        {
            await _asoService.UpdateAbTestMetricsAsync(id);
            return Ok(new { Message = "A/B test metrics updated successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating A/B test metrics for {Id}", id);
            return StatusCode(500, "An error occurred while updating A/B test metrics");
        }
    }

    #endregion

    #region Analytics and Reporting

    /// <summary>
    /// Get analytics for a specific listing
    /// </summary>
    [HttpGet("listings/{listingId}/analytics")]
    public async Task<ActionResult<List<AsoAnalyticsDto>>> GetAnalytics(
        int listingId,
        [FromQuery] DateTime fromDate,
        [FromQuery] DateTime toDate,
        [FromQuery] AnalyticsGranularity granularity = AnalyticsGranularity.Daily)
    {
        try
        {
            var userId = GetUserId();
            var analytics = await _asoService.GetAnalyticsAsync(listingId, userId, fromDate, toDate, granularity);
            return Ok(analytics);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving analytics for listing {ListingId}", listingId);
            return StatusCode(500, "An error occurred while retrieving analytics");
        }
    }

    /// <summary>
    /// Get competitor analysis for a listing
    /// </summary>
    [HttpGet("listings/{listingId}/competitor-analysis")]
    public async Task<ActionResult<Dictionary<string, object>>> GetCompetitorAnalysis(int listingId)
    {
        try
        {
            var userId = GetUserId();
            var analysis = await _asoService.GetCompetitorAnalysisAsync(listingId, userId);
            return Ok(analysis);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving competitor analysis for listing {ListingId}", listingId);
            return StatusCode(500, "An error occurred while retrieving competitor analysis");
        }
    }

    /// <summary>
    /// Get ranking trends for a listing
    /// </summary>
    [HttpGet("listings/{listingId}/ranking-trends")]
    public async Task<ActionResult<Dictionary<string, object>>> GetRankingTrends(
        int listingId,
        [FromQuery] DateTime? fromDate = null)
    {
        try
        {
            var userId = GetUserId();
            var trends = await _asoService.GetRankingTrendsAsync(listingId, userId, fromDate);
            return Ok(trends);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving ranking trends for listing {ListingId}", listingId);
            return StatusCode(500, "An error occurred while retrieving ranking trends");
        }
    }

    /// <summary>
    /// Generate comprehensive ASO report
    /// </summary>
    [HttpGet("reports/comprehensive")]
    public async Task<ActionResult<Dictionary<string, object>>> GenerateAsoReport(
        [FromQuery] DateTime fromDate,
        [FromQuery] DateTime toDate)
    {
        try
        {
            var userId = GetUserId();
            var report = await _asoService.GenerateAsoReportAsync(userId, fromDate, toDate);
            return Ok(report);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating ASO report");
            return StatusCode(500, "An error occurred while generating the ASO report");
        }
    }

    #endregion

    #region Cross-Platform Integration

    /// <summary>
    /// Synchronize ASO keywords with SEO keywords for unified strategy
    /// </summary>
    [HttpPost("integration/sync-seo-keywords")]
    public async Task<ActionResult<Dictionary<string, object>>> SynchronizeWithSeoKeywords()
    {
        try
        {
            var userId = GetUserId();
            var synchronizationResults = await _asoService.SynchronizeWithSeoKeywordsAsync(userId);
            return Ok(synchronizationResults);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error synchronizing SEO-ASO keywords");
            return StatusCode(500, "An error occurred while synchronizing keywords");
        }
    }

    /// <summary>
    /// Get web-to-app attribution data
    /// </summary>
    [HttpGet("integration/web-to-app-attribution")]
    public async Task<ActionResult<Dictionary<string, object>>> GetWebToAppAttribution(
        [FromQuery] DateTime? fromDate = null)
    {
        try
        {
            var userId = GetUserId();
            var attribution = await _asoService.GetWebToAppAttributionAsync(userId, fromDate);
            return Ok(attribution);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving web-to-app attribution");
            return StatusCode(500, "An error occurred while retrieving attribution data");
        }
    }

    /// <summary>
    /// Optimize deep links for better conversion tracking
    /// </summary>
    [HttpPost("listings/{listingId}/optimize-deep-links")]
    public async Task<ActionResult<List<string>>> OptimizeDeepLinks(int listingId)
    {
        try
        {
            var userId = GetUserId();
            var optimizedLinks = await _asoService.OptimizeDeepLinksAsync(listingId, userId);
            return Ok(new
            {
                ListingId = listingId,
                OptimizedLinksCount = optimizedLinks.Count,
                DeepLinks = optimizedLinks
            });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error optimizing deep links for listing {ListingId}", listingId);
            return StatusCode(500, "An error occurred while optimizing deep links");
        }
    }

    #endregion

    #region Health Check

    /// <summary>
    /// Health check endpoint for ASO service
    /// </summary>
    [HttpGet("health")]
    [AllowAnonymous]
    public ActionResult<object> HealthCheck()
    {
        return Ok(new
        {
            Service = "ASO API",
            Status = "Healthy",
            Timestamp = DateTime.UtcNow,
            Version = "1.0.0",
            Features = new[]
            {
                "Keyword Management",
                "ML-Powered Discovery",
                "A/B Testing",
                "Review Analytics",
                "Cross-Platform Integration",
                "Statistical Analysis"
            }
        });
    }

    #endregion
}