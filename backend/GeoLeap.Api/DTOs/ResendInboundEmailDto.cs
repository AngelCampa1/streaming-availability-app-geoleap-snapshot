namespace GeoLeap.Api.DTOs;

/// <summary>
/// Represents the webhook payload from Resend for inbound emails.
/// </summary>
public record ResendInboundEmailDto
{
    /// <summary>
    /// Event type (e.g., "email.received")
    /// </summary>
    public string Type { get; init; } = string.Empty;

    /// <summary>
    /// Timestamp when the event was created
    /// </summary>
    public DateTime CreatedAt { get; init; }

    /// <summary>
    /// Email data payload
    /// </summary>
    public ResendEmailData Data { get; init; } = new();
}

/// <summary>
/// Represents the email data within the inbound webhook payload.
/// </summary>
public record ResendEmailData
{
    /// <summary>
    /// Sender email address
    /// </summary>
    public string From { get; init; } = string.Empty;

    /// <summary>
    /// List of recipient email addresses
    /// </summary>
    public List<string> To { get; init; } = new();

    /// <summary>
    /// Email subject line
    /// </summary>
    public string Subject { get; init; } = string.Empty;

    /// <summary>
    /// Plain text email body
    /// </summary>
    public string Text { get; init; } = string.Empty;

    /// <summary>
    /// HTML email body
    /// </summary>
    public string Html { get; init; } = string.Empty;

    /// <summary>
    /// Email headers
    /// </summary>
    public Dictionary<string, string> Headers { get; init; } = new();

    /// <summary>
    /// Email attachments
    /// </summary>
    public List<ResendAttachment> Attachments { get; init; } = new();

    /// <summary>
    /// Email message ID
    /// </summary>
    public string MessageId { get; init; } = string.Empty;

    /// <summary>
    /// Reply-To address if specified
    /// </summary>
    public string? ReplyTo { get; init; }
}

/// <summary>
/// Represents an email attachment in the inbound webhook payload.
/// </summary>
public record ResendAttachment
{
    /// <summary>
    /// Attachment filename
    /// </summary>
    public string Filename { get; init; } = string.Empty;

    /// <summary>
    /// MIME content type
    /// </summary>
    public string ContentType { get; init; } = string.Empty;

    /// <summary>
    /// Base64-encoded attachment content
    /// </summary>
    public string Content { get; init; } = string.Empty;

    /// <summary>
    /// Attachment size in bytes
    /// </summary>
    public long Size { get; init; }
}
