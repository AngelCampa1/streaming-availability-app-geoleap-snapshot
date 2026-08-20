using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using GeoLeap.Api.Services;
using GeoLeap.Api.Extensions;
using Stripe;
using System.Text;

namespace GeoLeap.Api.Controllers;

[ApiController]
[Route("api/webhooks")]
[AllowAnonymous]  // Webhooks must be publicly accessible - signature verification provides security
public class StripeWebhookController : ControllerBase
{
    private readonly IPaymentService _paymentService;
    private readonly ILogger<StripeWebhookController> _logger;
    private readonly IConfiguration _configuration;

    public StripeWebhookController(
        IPaymentService paymentService, 
        ILogger<StripeWebhookController> logger,
        IConfiguration configuration)
    {
        _paymentService = paymentService;
        _logger = logger;
        _configuration = configuration;
    }

    [HttpPost("stripe")]
    public async Task<IActionResult> HandleStripeWebhook()
    {
        var correlationId = HttpContext.Items["CorrelationId"]?.ToString() ?? Guid.NewGuid().ToString();

        try
        {
            // Ensure body stream position is at beginning (EnableBuffering should allow this)
            if (HttpContext.Request.Body.CanSeek)
            {
                HttpContext.Request.Body.Position = 0;
            }

            // Read the request body as raw bytes to preserve exact content for signature verification
            // CRITICAL: Using StreamReader can modify encoding or strip BOM, breaking signature verification
            using var memoryStream = new MemoryStream();
            await HttpContext.Request.Body.CopyToAsync(memoryStream);
            var bodyBytes = memoryStream.ToArray();
            var json = Encoding.UTF8.GetString(bodyBytes);

            _logger.LogDebug("Webhook body length: {Length}, CanSeek: {CanSeek}, Raw bytes: {ByteCount}",
                json.Length, HttpContext.Request.Body.CanSeek, bodyBytes.Length);

            if (string.IsNullOrEmpty(json))
            {
                _logger.LogWarning("Empty webhook payload received");
                return this.StandardBadRequest("Empty payload");
            }

            // Get the Stripe signature
            var stripeSignature = Request.Headers["Stripe-Signature"].ToString();
            _logger.LogDebug("Stripe-Signature header: {Signature}", stripeSignature);

            if (string.IsNullOrEmpty(stripeSignature))
            {
                _logger.LogWarning("Missing Stripe signature header");
                return this.StandardBadRequest("Missing signature");
            }

            // Get webhook endpoint secret from configuration
            var webhookSecret = _configuration["Stripe:WebhookSecret"];
            // SECURITY: Never log the actual webhook secret - only log if it's configured
            _logger.LogDebug("WEBHOOK DEBUG - Secret configured: {IsConfigured}, Length: {Length}",
                !string.IsNullOrEmpty(webhookSecret),
                webhookSecret?.Length ?? 0);

            if (string.IsNullOrEmpty(webhookSecret))
            {
                _logger.LogError("Stripe webhook secret not configured");
                return StatusCode(500, "Webhook secret not configured");
            }

            // Verify the webhook signature
            Event stripeEvent;
            try
            {
                stripeEvent = EventUtility.ConstructEvent(json, stripeSignature, webhookSecret, tolerance: 300);
            }
            catch (StripeException ex)
            {
                _logger.LogWarning("WEBHOOK DEBUG - SIGNATURE FAILED! Error: {Error}", ex.Message);
                _logger.LogWarning("WEBHOOK DEBUG - Body length: {Length}, Body hash: {Hash}",
                    json.Length, Convert.ToBase64String(System.Security.Cryptography.SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(json))).Substring(0, 10));
                // SECURITY: Never log raw webhook body - use sanitized version only for debugging
                var sanitizedBody = GeoLeap.Api.Infrastructure.SensitiveDataFilter.SanitizeString(json);
                _logger.LogWarning("WEBHOOK DEBUG - First 200 chars of sanitized body: {Body}",
                    sanitizedBody.Length > 200 ? sanitizedBody.Substring(0, 200) : sanitizedBody);
                return this.StandardBadRequest("Invalid signature");
            }

            _logger.LogInformation("Processing Stripe webhook event {EventType} with ID {EventId}", 
                stripeEvent.Type, stripeEvent.Id);

            // Process the webhook event
            var processed = await _paymentService.ProcessWebhookAsync(
                stripeEvent.Id, 
                stripeEvent.Type, 
                json, 
                correlationId);

            if (processed)
            {
                _logger.LogInformation("Successfully processed webhook event {EventId}", stripeEvent.Id);
                return Ok(new { received = true });
            }
            else
            {
                _logger.LogWarning("Failed to process webhook event {EventId}", stripeEvent.Id);
                return StatusCode(500, "Failed to process webhook");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing Stripe webhook");
            return StatusCode(500, "Internal server error");
        }
    }
}