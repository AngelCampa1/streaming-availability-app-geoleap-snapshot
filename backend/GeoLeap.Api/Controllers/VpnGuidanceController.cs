using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services.VpnGuidanceServices;
using GeoLeap.Api.Extensions;
using System.ComponentModel.DataAnnotations;

namespace GeoLeap.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class VpnGuidanceController : ControllerBase
{
    private readonly Services.IVpnProviderService _vpnProviderService;
    private readonly Services.IVpnRecommendationService _vpnRecommendationService;
    private readonly IVpnLanguageRecommendationService _vpnLanguageRecommendationService;
    private readonly ILogger<VpnGuidanceController> _logger;

    public VpnGuidanceController(
        Services.IVpnProviderService vpnProviderService,
        Services.IVpnRecommendationService vpnRecommendationService,
        IVpnLanguageRecommendationService vpnLanguageRecommendationService,
        ILogger<VpnGuidanceController> logger)
    {
        _vpnProviderService = vpnProviderService;
        _vpnRecommendationService = vpnRecommendationService;
        _vpnLanguageRecommendationService = vpnLanguageRecommendationService;
        _logger = logger;
    }

    // GET: api/vpnguidance/providers
    [HttpGet("providers")]
    public async Task<ActionResult<IEnumerable<VpnProviderDto>>> GetProviders(
        [FromQuery] bool? featured = null,
        [FromQuery] decimal? maxPrice = null,
        [FromQuery] bool? supportsStreaming = null,
        [FromQuery] string? streamingService = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        try
        {
            var providers = await _vpnProviderService.GetProvidersAsync(
                featured, maxPrice, supportsStreaming, streamingService, page, pageSize);
            return Ok(providers);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving VPN providers");
            return StatusCode(500, "An error occurred while retrieving VPN providers");
        }
    }

    // GET: api/vpnguidance/providers/{id}
    [HttpGet("providers/{id:guid}")]
    public async Task<ActionResult<VpnProviderDto>> GetProvider(Guid id)
    {
        try
        {
            var provider = await _vpnProviderService.GetProviderByIdAsync(id);
            if (provider == null)
            {
                return NotFound($"VPN provider with ID {id} not found");
            }
            return Ok(provider);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving VPN provider {ProviderId}", id);
            return StatusCode(500, "An error occurred while retrieving the VPN provider");
        }
    }

    // GET: api/vpnguidance/recommendations
    [HttpGet("recommendations")]
    [AllowAnonymous] // US-9.1: Public endpoint for VPN recommendations
    public async Task<ActionResult<VpnRecommendationDto>> GetRecommendations(
        [FromQuery] VpnRecommendationType type = VpnRecommendationType.BestOverall,
        [FromQuery] decimal? budget = null,
        [FromQuery] List<string>? streamingServices = null,
        [FromQuery] bool? requiresP2P = null,
        [FromQuery] List<string>? audioLanguages = null,
        [FromQuery] List<string>? subtitleLanguages = null,
        [FromQuery] string? contentId = null)
    {
        try
        {
            // E2E BUG FIX: Support anonymous access - use Guid.Empty for unauthenticated users
            var userId = GetOptionalUserIdFromClaims() ?? Guid.Empty;
            var recommendations = await _vpnRecommendationService.GetRecommendationsAsync(
                userId, type, budget, streamingServices, requiresP2P);

            // If language parameters are provided and contentId is specified, rank by language compatibility
            if ((audioLanguages?.Any() == true || subtitleLanguages?.Any() == true) && !string.IsNullOrEmpty(contentId))
            {
                var rankedRecommendations = await _vpnLanguageRecommendationService.RankVpnRecommendationsByLanguageAsync(
                    new List<VpnRecommendationDto> { recommendations },
                    contentId,
                    audioLanguages ?? new List<string>(),
                    subtitleLanguages ?? new List<string>());

                return Ok(rankedRecommendations.FirstOrDefault() ?? recommendations);
            }

            return Ok(recommendations);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting VPN recommendations");
            return StatusCode(500, "An error occurred while generating recommendations");
        }
    }

    // GET: api/vpnguidance/countries-for-content/{contentId}
    /// <summary>
    /// NEW: Gets country recommendations for content with VPN providers as secondary information (country-first approach)
    /// </summary>
    /// <param name="contentId">ID of the content to access</param>
    /// <param name="audioLanguages">Preferred audio languages (optional, e.g., "en", "es", "fr")</param>
    /// <param name="subtitleLanguages">Preferred subtitle languages (optional, e.g., "en", "es", "fr")</param>
    /// <param name="streamingService">Filter by specific streaming service (optional)</param>
    /// <returns>Countries ranked by language match with available VPN providers</returns>
    /// <response code="200">Returns countries ranked by language availability with VPN provider options</response>
    /// <response code="400">Invalid content ID provided</response>
    /// <response code="404">No country recommendations found for the specified content</response>
    /// <response code="500">Internal server error occurred</response>
    [HttpGet("countries-for-content/{contentId}")]
    [AllowAnonymous]
    public async Task<ActionResult<ContentCountryRecommendationsDto>> GetCountriesForContent(
        string contentId,
        [FromQuery] List<string>? audioLanguages = null,
        [FromQuery] List<string>? subtitleLanguages = null,
        [FromQuery] string? streamingService = null)
    {
        if (string.IsNullOrWhiteSpace(contentId))
        {
            return this.StandardBadRequest("Content ID is required");
        }

        try
        {
            _logger.LogInformation(
                "Getting country recommendations (country-first) for {ContentId} with audio: {Audio}, subtitles: {Subs}",
                contentId,
                audioLanguages != null ? string.Join(", ", audioLanguages) : "none",
                subtitleLanguages != null ? string.Join(", ", subtitleLanguages) : "none");

            var recommendations = await _vpnLanguageRecommendationService.GetCountryRecommendationsForContentAsync(
                contentId,
                audioLanguages,
                subtitleLanguages,
                streamingService);

            if (recommendations == null || !recommendations.Countries.Any())
            {
                _logger.LogWarning("No country recommendations found for content {ContentId}", contentId);
                return NotFound(new
                {
                    message = $"No country recommendations found for content {contentId}",
                    contentId = contentId,
                    reason = "Content may not be available for streaming or no data available"
                });
            }

            _logger.LogInformation(
                "Successfully generated {Count} country recommendations for content {ContentId} with confidence {Confidence}",
                recommendations.Countries.Count,
                contentId,
                recommendations.ConfidenceScore);

            return Ok(recommendations);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting country recommendations for {ContentId}", contentId);
            return StatusCode(500, new
            {
                message = "An error occurred while generating country recommendations",
                contentId = contentId,
                error = ex.Message
            });
        }
    }

    // GET: api/vpnguidance/content-recommendations/{contentId}
    /// <summary>
    /// Gets VPN recommendations for specific content with language compatibility analysis using real streaming API data
    /// (Legacy endpoint - consider using /countries-for-content for country-first approach)
    /// </summary>
    /// <param name="contentId">ID of the content to access</param>
    /// <param name="audioLanguages">Preferred audio languages (optional, e.g., "en", "es", "fr")</param>
    /// <param name="subtitleLanguages">Preferred subtitle languages (optional, e.g., "en", "es", "fr")</param>
    /// <param name="contentType">Type of content: movie or tv (optional)</param>
    /// <param name="userCountry">User's current country for prioritization (optional, e.g., "us", "gb", "ca")</param>
    /// <returns>Content-specific VPN recommendations with language scores and country availability</returns>
    /// <response code="200">Returns VPN recommendations with real language data from streaming API</response>
    /// <response code="400">Invalid content ID provided</response>
    /// <response code="404">No VPN recommendations found for the specified content</response>
    /// <response code="500">Internal server error occurred</response>
    [HttpGet("content-recommendations/{contentId}")]
    [AllowAnonymous]
    public async Task<ActionResult<ContentVpnRecommendationDto>> GetContentRecommendations(
        string contentId,
        [FromQuery] List<string>? audioLanguages = null,
        [FromQuery] List<string>? subtitleLanguages = null,
        [FromQuery] string? contentType = null,
        [FromQuery] string? userCountry = null)
    {
        if (string.IsNullOrWhiteSpace(contentId))
        {
            return this.StandardBadRequest("Content ID is required");
        }

        try
        {
            _logger.LogInformation(
                "Getting content VPN recommendations for {ContentId} with audio languages: {Audio}, subtitle languages: {Subs}, user country: {Country}",
                contentId,
                audioLanguages != null ? string.Join(", ", audioLanguages) : "none",
                subtitleLanguages != null ? string.Join(", ", subtitleLanguages) : "none",
                userCountry ?? "not specified");

            var recommendations = await _vpnLanguageRecommendationService.GetContentVpnRecommendationsAsync(
                contentId,
                audioLanguages,
                subtitleLanguages,
                contentType);

            if (recommendations == null || !recommendations.RecommendedProviders.Any())
            {
                _logger.LogWarning("No VPN recommendations found for content {ContentId}", contentId);
                return NotFound(new
                {
                    message = $"No VPN recommendations found for content {contentId}",
                    contentId = contentId,
                    reason = "Content may not be available for streaming or no VPN providers have suitable server locations"
                });
            }

            // Log successful recommendation generation
            _logger.LogInformation(
                "Successfully generated {Count} VPN recommendations for content {ContentId} with confidence score {Confidence}",
                recommendations.RecommendedProviders.Count,
                contentId,
                recommendations.ConfidenceScore);

            return Ok(recommendations);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting content VPN recommendations for {ContentId}", contentId);
            return StatusCode(500, new
            {
                message = "An error occurred while generating content-specific recommendations",
                contentId = contentId,
                error = ex.Message
            });
        }
    }

    // GET: api/vpnguidance/compare
    [HttpGet("compare")]
    public async Task<ActionResult<VpnProviderComparisonDto>> CompareProviders(
        [FromQuery] List<Guid> providerIds,
        [FromQuery] bool comparePrice = true,
        [FromQuery] bool compareFeatures = true,
        [FromQuery] bool compareRatings = true,
        [FromQuery] bool compareStreaming = false)
    {
        if (providerIds == null || providerIds.Count < 2)
        {
            return this.StandardBadRequest("At least 2 provider IDs are required for comparison");
        }

        if (providerIds.Count > 10)
        {
            return this.StandardBadRequest("Cannot compare more than 10 providers at once");
        }

        try
        {
            var comparison = await _vpnProviderService.CompareProvidersAsync(
                providerIds, comparePrice, compareFeatures, compareRatings, compareStreaming);
            return Ok(comparison);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error comparing VPN providers");
            return StatusCode(500, "An error occurred while comparing providers");
        }
    }

    // POST: api/vpnguidance/providers/{id}/rate
    [HttpPost("providers/{id:guid}/rate")]
    [AllowAnonymous] // US-9.1: Allow public rating (optional auth for tracking)
    public async Task<ActionResult> RateProvider(Guid id, [FromBody] VpnRatingDto ratingDto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            // E2E BUG FIX: Support anonymous ratings - use Guid.Empty for unauthenticated users
            var userId = GetOptionalUserIdFromClaims() ?? Guid.Empty;
            await _vpnProviderService.RateProviderAsync(userId, id, ratingDto);
            return Ok(new { message = "Rating submitted successfully" });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error rating VPN provider {ProviderId}", id);
            return StatusCode(500, "An error occurred while submitting the rating");
        }
    }

    // GET: api/vpnguidance/providers/{id}/streaming-compatibility
    [HttpGet("providers/{id:guid}/streaming-compatibility")]
    public async Task<ActionResult<IEnumerable<Models.VpnStreamingCompatibilityDto>>> GetStreamingCompatibility(Guid id)
    {
        try
        {
            var compatibility = await _vpnProviderService.GetStreamingCompatibilityAsync(id);
            return Ok(compatibility);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving streaming compatibility for provider {ProviderId}", id);
            return StatusCode(500, "An error occurred while retrieving streaming compatibility");
        }
    }

    // GET: api/vpnguidance/setup-guides
    [HttpGet("setup-guides")]
    public async Task<ActionResult<IEnumerable<VpnSetupGuideDto>>> GetSetupGuides(
        [FromQuery] Guid? providerId = null,
        [FromQuery] string? platform = null)
    {
        try
        {
            var guides = await _vpnProviderService.GetSetupGuidesAsync(providerId, platform);
            return Ok(guides);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving setup guides");
            return StatusCode(500, "An error occurred while retrieving setup guides");
        }
    }

    // GET: api/vpnguidance/best-practices
    [HttpGet("best-practices")]
    public async Task<ActionResult<IEnumerable<VpnBestPracticeDto>>> GetBestPractices(
        [FromQuery] VpnPracticeCategory? category = null,
        [FromQuery] VpnPracticeImportance? importance = null)
    {
        try
        {
            var practices = await _vpnProviderService.GetBestPracticesAsync(category, importance);
            return Ok(practices);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving best practices");
            return StatusCode(500, "An error occurred while retrieving best practices");
        }
    }

    // GET: api/vpnguidance/legal-disclaimers
    [HttpGet("legal-disclaimers")]
    public async Task<ActionResult<IEnumerable<VpnLegalDisclaimer>>> GetLegalDisclaimers(
        [FromQuery] string? countryCode = null)
    {
        try
        {
            var disclaimers = await _vpnProviderService.GetLegalDisclaimersAsync(countryCode);
            return Ok(disclaimers);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving legal disclaimers");
            return StatusCode(500, "An error occurred while retrieving legal disclaimers");
        }
    }

    // POST: api/vpnguidance/preferences
    [HttpPost("preferences")]
    [AllowAnonymous] // US-9.1: Allow saving preferences (optional auth)
    public async Task<ActionResult> SaveUserPreferences([FromBody] UserVpnPreference preferences)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            // E2E BUG FIX: Support anonymous preferences - use Guid.Empty for unauthenticated users
            var userId = GetOptionalUserIdFromClaims() ?? Guid.Empty;
            preferences.UserId = userId;
            await _vpnProviderService.SaveUserPreferencesAsync(preferences);
            return Ok(new { message = "Preferences saved successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error saving user VPN preferences");
            return StatusCode(500, "An error occurred while saving preferences");
        }
    }

    // GET: api/vpnguidance/preferences
    [HttpGet("preferences")]
    [AllowAnonymous] // US-9.1: Allow getting preferences (optional auth)
    public async Task<ActionResult<UserVpnPreference>> GetUserPreferences()
    {
        try
        {
            // E2E BUG FIX: Support anonymous access - use Guid.Empty for unauthenticated users
            var userId = GetOptionalUserIdFromClaims() ?? Guid.Empty;
            var preferences = await _vpnProviderService.GetUserPreferencesAsync(userId);
            if (preferences == null)
            {
                return NotFound("No preferences found for user");
            }
            return Ok(preferences);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving user VPN preferences");
            return StatusCode(500, "An error occurred while retrieving preferences");
        }
    }

    // POST: api/vpnguidance/analytics/track
    [HttpPost("analytics/track")]
    public async Task<ActionResult> TrackEvent([FromBody] VpnGuidanceAnalytics analytics)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            // Set tracking metadata
            analytics.IpAddress = Request.HttpContext.Connection.RemoteIpAddress?.ToString();
            analytics.UserAgent = Request.Headers.UserAgent.FirstOrDefault();
            analytics.Referrer = Request.Headers.Referer.FirstOrDefault();
            analytics.Timestamp = DateTime.UtcNow;

            if (User.Identity?.IsAuthenticated == true)
            {
                analytics.UserId = GetUserIdFromClaims();
            }

            await _vpnProviderService.TrackAnalyticsEventAsync(analytics);
            return Ok(new { message = "Event tracked successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error tracking analytics event");
            return StatusCode(500, "An error occurred while tracking the event");
        }
    }

    // GET: api/vpnguidance/search
    [HttpGet("search")]
    public async Task<ActionResult<IEnumerable<VpnProviderDto>>> SearchProviders(
        [FromQuery, Required] string query,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20)
    {
        if (string.IsNullOrWhiteSpace(query))
        {
            return this.StandardBadRequest("Search query is required");
        }

        try
        {
            var results = await _vpnProviderService.SearchProvidersAsync(query, page, pageSize);
            return Ok(results);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error searching VPN providers");
            return StatusCode(500, "An error occurred while searching providers");
        }
    }

    private Guid GetUserIdFromClaims()
    {
        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == "userId" || c.Type == "sub");
        if (userIdClaim != null && Guid.TryParse(userIdClaim.Value, out var userId))
        {
            return userId;
        }

        // User must be authenticated with valid user ID claim
        throw new UnauthorizedAccessException("User ID not found in authentication token. User must be properly authenticated.");
    }

    /// <summary>
    /// Gets user ID from claims for optional authentication scenarios.
    /// Returns null if user is not authenticated instead of throwing.
    /// Use this for [AllowAnonymous] endpoints that support both authenticated and anonymous access.
    /// </summary>
    private Guid? GetOptionalUserIdFromClaims()
    {
        if (User.Identity?.IsAuthenticated != true)
        {
            return null;
        }

        var userIdClaim = User.Claims.FirstOrDefault(c => c.Type == "userId" || c.Type == "sub");
        if (userIdClaim != null && Guid.TryParse(userIdClaim.Value, out var userId))
        {
            return userId;
        }

        return null;
    }
}