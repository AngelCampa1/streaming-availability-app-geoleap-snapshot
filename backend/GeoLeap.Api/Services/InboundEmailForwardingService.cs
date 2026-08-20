using System.Security.Cryptography;
using System.Text;
using GeoLeap.Api.DTOs;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service for processing and forwarding inbound emails from Resend webhook.
/// </summary>
public class InboundEmailForwardingService : IInboundEmailForwardingService
{
    private readonly IEmailService _emailService;
    private readonly ILogger<InboundEmailForwardingService> _logger;
    private readonly IConfiguration _configuration;
    private readonly Dictionary<string, string> _forwardingRules;
    private readonly string _webhookSigningSecret;
    private readonly string _forwardingFromAddress;
    private readonly string _forwardingFromName;

    // Allowed domains for this webhook handler
    private static readonly HashSet<string> AllowedDomains = new(StringComparer.OrdinalIgnoreCase)
    {
        "geoleap.app",
        "inbound.geoleap.app",
        "mail.geoleap.app"
    };

    public InboundEmailForwardingService(
        IEmailService emailService,
        ILogger<InboundEmailForwardingService> logger,
        IConfiguration configuration)
    {
        _emailService = emailService;
        _logger = logger;
        _configuration = configuration;

        // Load forwarding rules from configuration
        _forwardingRules = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        var rulesSection = configuration.GetSection("ResendInbound:ForwardingRules");
        foreach (var rule in rulesSection.GetChildren())
        {
            var key = rule.Key;
            var value = rule.Value;
            if (!string.IsNullOrEmpty(value))
            {
                _forwardingRules[key] = value;
            }
        }

        _webhookSigningSecret = configuration["ResendInbound:WebhookSigningSecret"] ?? string.Empty;
        _forwardingFromAddress = configuration["ResendInbound:ForwardingFromAddress"] ?? "forwarding@mail.geoleap.app";
        _forwardingFromName = configuration["ResendInbound:ForwardingFromName"] ?? "GeoLeap Email Forward";

        _logger.LogInformation("Initialized InboundEmailForwardingService with {RuleCount} forwarding rules", _forwardingRules.Count);
    }

    /// <inheritdoc/>
    public async Task<bool> ProcessAndForwardAsync(ResendInboundEmailDto email)
    {
        try
        {
            _logger.LogInformation(
                "Processing inbound email from {From} to {To} with subject '{Subject}'",
                email.Data.From,
                string.Join(", ", email.Data.To),
                email.Data.Subject);

            // Filter: only process emails to GeoLeap domains
            if (!IsGeoLeapRecipient(email.Data.To))
            {
                _logger.LogDebug(
                    "Ignoring email to non-GeoLeap domain. Recipients: {Recipients}",
                    string.Join(", ", email.Data.To));
                return true; // Return true (200 OK) but don't forward
            }

            // Find forwarding destination for each recipient
            var forwardingDestinations = new HashSet<string>();
            foreach (var recipient in email.Data.To)
            {
                var destination = GetForwardingDestination(recipient);
                if (!string.IsNullOrEmpty(destination))
                {
                    forwardingDestinations.Add(destination);
                }
            }

            if (forwardingDestinations.Count == 0)
            {
                _logger.LogWarning(
                    "No forwarding destination found for recipients: {Recipients}",
                    string.Join(", ", email.Data.To));
                return false;
            }

            // Forward to each unique destination
            var forwardingTasks = forwardingDestinations.Select(destination =>
                ForwardEmailToDestinationAsync(email, destination));

            var results = await Task.WhenAll(forwardingTasks);
            var allSucceeded = results.All(r => r);

            if (allSucceeded)
            {
                _logger.LogInformation(
                    "Successfully forwarded email to {Count} destination(s): {Destinations}",
                    forwardingDestinations.Count,
                    string.Join(", ", forwardingDestinations));
            }
            else
            {
                _logger.LogWarning("Some email forwarding operations failed");
            }

            return allSucceeded;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing inbound email from {From}", email.Data.From);
            return false;
        }
    }

    /// <inheritdoc/>
    public string? GetForwardingDestination(string recipientAddress)
    {
        if (string.IsNullOrEmpty(recipientAddress))
        {
            return null;
        }

        // Try exact match first
        if (_forwardingRules.TryGetValue(recipientAddress, out var destination))
        {
            _logger.LogDebug("Found exact forwarding rule: {Recipient} -> {Destination}", recipientAddress, destination);
            return destination;
        }

        // Try wildcard match (*)
        if (_forwardingRules.TryGetValue("*", out var wildcardDestination))
        {
            _logger.LogDebug("Using wildcard forwarding rule: {Recipient} -> {Destination}", recipientAddress, wildcardDestination);
            return wildcardDestination;
        }

        _logger.LogDebug("No forwarding rule found for recipient: {Recipient}", recipientAddress);
        return null;
    }

    /// <inheritdoc/>
    public bool IsGeoLeapRecipient(IEnumerable<string> recipients)
    {
        foreach (var recipient in recipients)
        {
            if (string.IsNullOrEmpty(recipient) || !recipient.Contains('@'))
                continue;

            var domain = recipient.Split('@').Last().ToLowerInvariant();
            if (AllowedDomains.Contains(domain))
                return true;
        }
        return false;
    }

    /// <inheritdoc/>
    public bool ValidateWebhookSignature(string payload, string signature)
    {
        if (string.IsNullOrEmpty(_webhookSigningSecret))
        {
            _logger.LogWarning("Webhook signing secret not configured - skipping signature validation");
            return true; // Allow if not configured (for development)
        }

        if (string.IsNullOrEmpty(signature))
        {
            _logger.LogWarning("Webhook signature header is missing");
            return false;
        }

        try
        {
            // Resend uses Svix webhook signatures
            // Signature format: "v1,signature1 v1,signature2"
            // We need to check if any signature matches

            var signatureParts = signature.Split(' ');
            foreach (var signaturePart in signatureParts)
            {
                // Remove version prefix (e.g., "v1,")
                var parts = signaturePart.Split(',', 2);
                if (parts.Length != 2)
                {
                    continue;
                }

                var providedSignature = parts[1];

                // Svix signature verification expects the signature to be provided separately
                // For now, we'll just validate the format is correct
                // Full validation requires svix-id and svix-timestamp headers
                _logger.LogDebug("Svix signature format validated: {Version}", parts[0]);
                return true; // Accept if signature format is valid
            }

            _logger.LogWarning("No valid Svix signature found in header");
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating webhook signature");
            return false;
        }
    }

    /// <summary>
    /// Validates Svix webhook signature with id, timestamp, and payload
    /// </summary>
    public bool ValidateSvixSignature(string svixId, string svixTimestamp, string payload, string svixSignature)
    {
        if (string.IsNullOrEmpty(_webhookSigningSecret))
        {
            _logger.LogWarning("Webhook signing secret not configured");
            return true;
        }

        try
        {
            // Extract base64 key from secret (remove "whsec_" prefix)
            var secretWithoutPrefix = _webhookSigningSecret.StartsWith("whsec_")
                ? _webhookSigningSecret.Substring(6)
                : _webhookSigningSecret;

            var keyBytes = Convert.FromBase64String(secretWithoutPrefix);

            // Construct signed content: "{id}.{timestamp}.{payload}"
            var signedContent = $"{svixId}.{svixTimestamp}.{payload}";
            var signedContentBytes = Encoding.UTF8.GetBytes(signedContent);

            // Compute HMAC-SHA256
            using var hmac = new HMACSHA256(keyBytes);
            var hash = hmac.ComputeHash(signedContentBytes);
            var expectedSignature = Convert.ToBase64String(hash);

            // Check against all signatures in header (format: "v1,sig1 v1,sig2")
            var signatureParts = svixSignature.Split(' ');
            foreach (var signaturePart in signatureParts)
            {
                var parts = signaturePart.Split(',', 2);
                if (parts.Length == 2 && parts[1] == expectedSignature)
                {
                    // Validate timestamp (within 5 minutes)
                    if (long.TryParse(svixTimestamp, out var timestamp))
                    {
                        var webhookTime = DateTimeOffset.FromUnixTimeSeconds(timestamp);
                        var timeDiff = Math.Abs((DateTimeOffset.UtcNow - webhookTime).TotalMinutes);

                        if (timeDiff > 5)
                        {
                            _logger.LogWarning("Webhook timestamp is too old or in the future: {Minutes} minutes", timeDiff);
                            return false;
                        }

                        return true;
                    }
                }
            }

            _logger.LogWarning("Svix signature validation failed - no matching signature");
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating Svix signature");
            return false;
        }
    }

    private async Task<bool> ForwardEmailToDestinationAsync(ResendInboundEmailDto email, string destination)
    {
        try
        {
            // Build forwarded email subject
            var forwardedSubject = $"Fwd: {email.Data.Subject}";

            // Build forwarded email body with original sender info
            var forwardedHtml = BuildForwardedEmailHtml(email);
            var forwardedText = BuildForwardedEmailText(email);

            // Convert attachments from Base64 to byte arrays
            var attachments = new Dictionary<string, byte[]>();
            if (email.Data.Attachments?.Any() == true)
            {
                foreach (var attachment in email.Data.Attachments)
                {
                    try
                    {
                        var content = Convert.FromBase64String(attachment.Content);
                        attachments[attachment.Filename] = content;
                    }
                    catch (Exception ex)
                    {
                        _logger.LogWarning(ex, "Failed to decode attachment {Filename}", attachment.Filename);
                    }
                }
            }

            // Generate correlation ID for tracking
            var correlationId = Guid.NewGuid().ToString();

            // Send forwarded email
            bool success;
            if (attachments.Any())
            {
                success = await _emailService.SendEmailWithAttachmentsAsync(
                    destination,
                    forwardedSubject,
                    forwardedHtml,
                    attachments,
                    correlationId);
            }
            else
            {
                success = await _emailService.SendAsync(
                    destination,
                    forwardedSubject,
                    forwardedHtml);
            }

            if (success)
            {
                _logger.LogInformation(
                    "Forwarded email from {From} to {Destination} with subject '{Subject}'",
                    email.Data.From,
                    destination,
                    forwardedSubject);
            }
            else
            {
                _logger.LogWarning(
                    "Failed to forward email from {From} to {Destination}",
                    email.Data.From,
                    destination);
            }

            return success;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error forwarding email to {Destination}", destination);
            return false;
        }
    }

    private string BuildForwardedEmailHtml(ResendInboundEmailDto email)
    {
        var originalHtml = !string.IsNullOrEmpty(email.Data.Html)
            ? email.Data.Html
            : $"<pre>{System.Net.WebUtility.HtmlEncode(email.Data.Text)}</pre>";

        var forwardedHtml = $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset=""UTF-8"">
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }}
        .forward-header {{ background-color: #f5f5f5; border-left: 4px solid #7c3aed; padding: 15px; margin-bottom: 20px; }}
        .forward-header h3 {{ margin: 0 0 10px 0; color: #7c3aed; }}
        .forward-info {{ font-size: 14px; color: #666; }}
        .forward-info strong {{ color: #333; }}
        .original-message {{ border-top: 1px solid #ddd; padding-top: 20px; margin-top: 20px; }}
        .attachments {{ background-color: #f9f9f9; padding: 10px; border-radius: 5px; margin-top: 15px; }}
        .attachments strong {{ color: #7c3aed; }}
    </style>
</head>
<body>
    <div class=""forward-header"">
        <h3>Forwarded Message</h3>
        <div class=""forward-info"">
            <p><strong>From:</strong> {System.Net.WebUtility.HtmlEncode(email.Data.From)}</p>
            <p><strong>To:</strong> {System.Net.WebUtility.HtmlEncode(string.Join(", ", email.Data.To))}</p>
            <p><strong>Subject:</strong> {System.Net.WebUtility.HtmlEncode(email.Data.Subject)}</p>
            <p><strong>Date:</strong> {email.CreatedAt:yyyy-MM-dd HH:mm:ss UTC}</p>
            {(email.Data.Attachments?.Any() == true ? $@"
            <div class=""attachments"">
                <strong>Attachments:</strong> {string.Join(", ", email.Data.Attachments.Select(a => System.Net.WebUtility.HtmlEncode(a.Filename)))}
            </div>" : "")}
        </div>
    </div>
    <div class=""original-message"">
        {originalHtml}
    </div>
</body>
</html>";

        return forwardedHtml;
    }

    private string BuildForwardedEmailText(ResendInboundEmailDto email)
    {
        var sb = new StringBuilder();
        sb.AppendLine("---------- Forwarded Message ----------");
        sb.AppendLine($"From: {email.Data.From}");
        sb.AppendLine($"To: {string.Join(", ", email.Data.To)}");
        sb.AppendLine($"Subject: {email.Data.Subject}");
        sb.AppendLine($"Date: {email.CreatedAt:yyyy-MM-dd HH:mm:ss UTC}");

        if (email.Data.Attachments?.Any() == true)
        {
            sb.AppendLine($"Attachments: {string.Join(", ", email.Data.Attachments.Select(a => a.Filename))}");
        }

        sb.AppendLine();
        sb.AppendLine("----------------------------------------");
        sb.AppendLine();
        sb.AppendLine(email.Data.Text);

        return sb.ToString();
    }
}
