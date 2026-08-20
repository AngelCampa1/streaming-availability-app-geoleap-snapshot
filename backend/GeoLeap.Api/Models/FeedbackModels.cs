using System.ComponentModel.DataAnnotations;

namespace GeoLeap.Api.Models;

/// <summary>
/// Categories for user feedback submissions
/// </summary>
public enum FeedbackCategory
{
    General = 0,
    Bug = 1,
    FeatureRequest = 2,
    Question = 3,
    Complaint = 4,
    Other = 5
}

/// <summary>
/// Request model for submitting user feedback
/// </summary>
public class FeedbackRequest
{
    /// <summary>
    /// The feedback message content (required)
    /// </summary>
    [Required(ErrorMessage = "Message is required")]
    [StringLength(2000, MinimumLength = 10, ErrorMessage = "Message must be between 10 and 2000 characters")]
    public string Message { get; set; } = string.Empty;

    /// <summary>
    /// Optional subject line for the feedback
    /// </summary>
    [StringLength(100, ErrorMessage = "Subject cannot exceed 100 characters")]
    public string? Subject { get; set; }

    /// <summary>
    /// Category of the feedback
    /// </summary>
    public FeedbackCategory Category { get; set; } = FeedbackCategory.General;

    /// <summary>
    /// Optional email for anonymous users who want a response
    /// </summary>
    [EmailAddress(ErrorMessage = "Invalid email format")]
    [StringLength(256, ErrorMessage = "Email cannot exceed 256 characters")]
    public string? Email { get; set; }

    /// <summary>
    /// Cloudflare Turnstile token.
    /// </summary>
    public string? TurnstileToken { get; set; }

    /// <summary>
    /// Cloudflare Turnstile response field name used by some clients.
    /// </summary>
    public string? CfTurnstileResponse { get; set; }

    /// <summary>
    /// Honeypot field. Legitimate clients should leave this blank.
    /// </summary>
    [StringLength(2048)]
    public string? CompanyWebsite { get; set; }

    /// <summary>
    /// Platform the feedback is submitted from (Web, Mobile, etc.)
    /// </summary>
    [StringLength(50)]
    public string? Platform { get; set; }
}

/// <summary>
/// Response model for feedback submission
/// </summary>
public class FeedbackResponse
{
    /// <summary>
    /// Whether the feedback was successfully submitted
    /// </summary>
    public bool Success { get; set; }

    /// <summary>
    /// User-friendly message about the submission result
    /// </summary>
    public string Message { get; set; } = string.Empty;
}

/// <summary>
/// DTO for returning available feedback categories
/// </summary>
public class FeedbackCategoryDto
{
    public int Value { get; set; }
    public string Name { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
}
