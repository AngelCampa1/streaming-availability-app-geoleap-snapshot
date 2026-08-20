using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using GeoLeap.Api.Endpoints;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;

namespace GeoLeap.Api.Controllers;

/// <summary>
/// Controller for handling user feedback submissions
/// </summary>
[ApiController]
[Route("api/[controller]")]
public class FeedbackController : ControllerBase
{
    private readonly IFeedbackService _feedbackService;
    private readonly ILeadTurnstileVerifier _turnstileVerifier;
    private readonly IRateLimitingService _rateLimitingService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<FeedbackController> _logger;
    private const int EmailRateLimitPerWindow = 3;
    private static readonly TimeSpan EmailRateLimitWindow = TimeSpan.FromMinutes(10);

    public FeedbackController(
        IFeedbackService feedbackService,
        ILogger<FeedbackController> logger,
        ILeadTurnstileVerifier turnstileVerifier,
        IRateLimitingService rateLimitingService,
        IConfiguration configuration)
    {
        _feedbackService = feedbackService;
        _turnstileVerifier = turnstileVerifier;
        _rateLimitingService = rateLimitingService;
        _configuration = configuration;
        _logger = logger;
    }

    /// <summary>
    /// Submit user feedback (allows both authenticated and anonymous users)
    /// </summary>
    /// <param name="request">The feedback request</param>
    /// <returns>Response indicating success or failure</returns>
    [HttpPost]
    [AllowAnonymous]
    [ProducesResponseType(typeof(FeedbackResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(FeedbackResponse), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(FeedbackResponse), StatusCodes.Status429TooManyRequests)]
    public async Task<ActionResult<FeedbackResponse>> SubmitFeedback([FromBody] FeedbackRequest request)
    {
        if (!string.IsNullOrWhiteSpace(request.CompanyWebsite))
        {
            return Ok(SuccessResponse());
        }

        if (!ModelState.IsValid)
        {
            var errors = ModelState.Values
                .SelectMany(v => v.Errors)
                .Select(e => e.ErrorMessage)
                .ToList();

            return BadRequest(new FeedbackResponse
            {
                Success = false,
                Message = string.Join(" ", errors)
            });
        }

        // Get IP address for rate limiting
        var ipAddress = GetClientIpAddress();

        // Check rate limit before processing
        if (_feedbackService.IsRateLimited(ipAddress))
        {
            return StatusCode(StatusCodes.Status429TooManyRequests, new FeedbackResponse
            {
                Success = false,
                Message = "Too many feedback submissions. Please try again later."
            });
        }

        // Get authenticated user info if available
        string? userEmail = null;
        string? userId = null;

        if (User.Identity?.IsAuthenticated == true)
        {
            userEmail = User.FindFirst(System.Security.Claims.ClaimTypes.Email)?.Value;
            userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        }

        var turnstileResult = await _turnstileVerifier.VerifyAsync(
            request.TurnstileToken ?? request.CfTurnstileResponse,
            ipAddress == "unknown" ? null : ipAddress,
            HttpContext.RequestAborted);

        if (!turnstileResult.Success)
        {
            _logger.LogWarning("Feedback Turnstile verification failed: {Reason}", turnstileResult.Reason);
            return StatusCode(StatusCodes.Status403Forbidden);
        }

        var contactEmail = NormalizeEmail(request.Email);
        if (!string.IsNullOrWhiteSpace(contactEmail))
        {
            var emailLimit = await _rateLimitingService.CheckRateLimitAsync(
                $"feedback:email:{contactEmail}",
                EmailRateLimitPerWindow,
                EmailRateLimitWindow);

            if (!emailLimit.IsAllowed)
            {
                return StatusCode(StatusCodes.Status429TooManyRequests, new FeedbackResponse
                {
                    Success = false,
                    Message = "Too many feedback submissions. Please try again later."
                });
            }
        }

        // Get user agent
        var userAgent = Request.Headers.UserAgent.ToString();

        var response = await _feedbackService.SubmitFeedbackAsync(
            request,
            userEmail,
            userId,
            userAgent,
            ipAddress);

        if (response.Success)
        {
            return Ok(response);
        }

        return BadRequest(response);
    }

    /// <summary>
    /// Get available feedback categories
    /// </summary>
    /// <returns>List of feedback categories</returns>
    [HttpGet("categories")]
    [AllowAnonymous]
    [ProducesResponseType(typeof(IEnumerable<FeedbackCategoryDto>), StatusCodes.Status200OK)]
    public ActionResult<IEnumerable<FeedbackCategoryDto>> GetCategories()
    {
        var categories = _feedbackService.GetCategories();
        return Ok(categories);
    }

    private string? GetClientIpAddress()
    {
        return LeadEndpoints.GetClientIp(HttpContext, _configuration);
    }

    private static string? NormalizeEmail(string? email)
    {
        return string.IsNullOrWhiteSpace(email)
            ? null
            : email.Trim().ToLowerInvariant();
    }

    private static FeedbackResponse SuccessResponse()
    {
        return new FeedbackResponse
        {
            Success = true,
            Message = "Thank you for your feedback! We appreciate you taking the time to help us improve."
        };
    }
}
