using GeoLeap.Api.DTOs;
using GeoLeap.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Text.Json;

namespace GeoLeap.Api.Controllers;

/// <summary>
/// Controller for handling Resend webhook events.
/// </summary>
[ApiController]
[Route("api/webhooks/resend")]
[AllowAnonymous]
public class ResendWebhookController : ControllerBase
{
    private readonly IInboundEmailForwardingService _forwardingService;
    private readonly ILogger<ResendWebhookController> _logger;

    public ResendWebhookController(
        IInboundEmailForwardingService forwardingService,
        ILogger<ResendWebhookController> logger)
    {
        _forwardingService = forwardingService;
        _logger = logger;
    }

    /// <summary>
    /// Webhook endpoint for receiving inbound emails from Resend.
    /// </summary>
    /// <param name="webhookPayload">The webhook payload from Resend</param>
    /// <returns>200 OK if processed successfully, 400 Bad Request if validation fails</returns>
    [HttpPost("inbound")]
    [Consumes("application/json")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status500InternalServerError)]
    public async Task<IActionResult> HandleInboundEmail([FromBody] ResendInboundEmailDto webhookPayload)
    {
        try
        {
            _logger.LogInformation(
                "Received Resend webhook event: {EventType} at {Timestamp}",
                webhookPayload.Type,
                webhookPayload.CreatedAt);

            // Validate Svix webhook signature
            if (Request.Headers.TryGetValue("svix-id", out var svixId) &&
                Request.Headers.TryGetValue("svix-timestamp", out var svixTimestamp) &&
                Request.Headers.TryGetValue("svix-signature", out var svixSignature))
            {
                var rawBody = await GetRawBodyAsync();
                if (!_forwardingService.ValidateSvixSignature(
                    svixId.ToString(),
                    svixTimestamp.ToString(),
                    rawBody,
                    svixSignature.ToString()))
                {
                    _logger.LogWarning("Svix webhook signature validation failed");
                    return BadRequest(new { error = "Invalid webhook signature" });
                }
            }
            else
            {
                _logger.LogWarning("Svix webhook headers missing - signature validation skipped");
            }

            // Process only email.received events
            if (webhookPayload.Type != "email.received")
            {
                _logger.LogInformation("Ignoring non-email event type: {EventType}", webhookPayload.Type);
                return Ok(new { message = "Event type not processed" });
            }

            // Validate email data
            if (string.IsNullOrEmpty(webhookPayload.Data.From))
            {
                _logger.LogWarning("Received webhook with missing 'from' field");
                return BadRequest(new { error = "Missing 'from' field in email data" });
            }

            if (webhookPayload.Data.To == null || webhookPayload.Data.To.Count == 0)
            {
                _logger.LogWarning("Received webhook with missing 'to' field");
                return BadRequest(new { error = "Missing 'to' field in email data" });
            }

            // Process and forward the email
            var success = await _forwardingService.ProcessAndForwardAsync(webhookPayload);

            if (success)
            {
                _logger.LogInformation(
                    "Successfully processed inbound email from {From} to {To}",
                    webhookPayload.Data.From,
                    string.Join(", ", webhookPayload.Data.To));

                return Ok(new
                {
                    message = "Email forwarded successfully",
                    from = webhookPayload.Data.From,
                    to = webhookPayload.Data.To,
                    subject = webhookPayload.Data.Subject
                });
            }
            else
            {
                _logger.LogWarning(
                    "Failed to process inbound email from {From} to {To}",
                    webhookPayload.Data.From,
                    string.Join(", ", webhookPayload.Data.To));

                return StatusCode(StatusCodes.Status500InternalServerError, new
                {
                    error = "Failed to forward email",
                    from = webhookPayload.Data.From,
                    to = webhookPayload.Data.To
                });
            }
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Failed to parse webhook payload");
            return BadRequest(new { error = "Invalid JSON payload" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error processing webhook");
            return StatusCode(StatusCodes.Status500InternalServerError, new
            {
                error = "Internal server error processing webhook"
            });
        }
    }

    /// <summary>
    /// Health check endpoint for the Resend webhook.
    /// </summary>
    /// <returns>200 OK with status information</returns>
    [HttpGet("health")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public IActionResult HealthCheck()
    {
        return Ok(new
        {
            status = "healthy",
            service = "Resend Webhook Handler",
            timestamp = DateTime.UtcNow
        });
    }

    private async Task<string> GetRawBodyAsync()
    {
        Request.EnableBuffering();
        Request.Body.Position = 0;
        using var reader = new StreamReader(Request.Body, leaveOpen: true);
        var rawBody = await reader.ReadToEndAsync();
        Request.Body.Position = 0;
        return rawBody;
    }
}
