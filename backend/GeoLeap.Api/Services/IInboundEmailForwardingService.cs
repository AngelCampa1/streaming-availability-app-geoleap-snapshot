using GeoLeap.Api.DTOs;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service for processing and forwarding inbound emails from Resend webhook.
/// </summary>
public interface IInboundEmailForwardingService
{
    /// <summary>
    /// Process an inbound email from Resend webhook and forward it to the configured destination.
    /// </summary>
    /// <param name="email">The inbound email data from the webhook</param>
    /// <returns>True if email was successfully processed and forwarded, false otherwise</returns>
    Task<bool> ProcessAndForwardAsync(ResendInboundEmailDto email);

    /// <summary>
    /// Get the forwarding destination for a given recipient address.
    /// </summary>
    /// <param name="recipientAddress">The original recipient address</param>
    /// <returns>The forwarding destination address, or null if no rule matches</returns>
    string? GetForwardingDestination(string recipientAddress);

    /// <summary>
    /// Check if any recipient belongs to a GeoLeap domain.
    /// </summary>
    /// <param name="recipients">The list of recipient email addresses</param>
    /// <returns>True if any recipient is a GeoLeap domain, false otherwise</returns>
    bool IsGeoLeapRecipient(IEnumerable<string> recipients);

    /// <summary>
    /// Validate the webhook signature to ensure the request came from Resend.
    /// </summary>
    /// <param name="payload">The raw webhook payload</param>
    /// <param name="signature">The signature from the webhook headers</param>
    /// <returns>True if signature is valid, false otherwise</returns>
    bool ValidateWebhookSignature(string payload, string signature);

    /// <summary>
    /// Validates Svix webhook signature with id, timestamp, and payload.
    /// </summary>
    /// <param name="svixId">The svix-id header value</param>
    /// <param name="svixTimestamp">The svix-timestamp header value</param>
    /// <param name="payload">The raw webhook payload</param>
    /// <param name="svixSignature">The svix-signature header value</param>
    /// <returns>True if signature is valid and timestamp is within acceptable range, false otherwise</returns>
    bool ValidateSvixSignature(string svixId, string svixTimestamp, string payload, string svixSignature);
}
