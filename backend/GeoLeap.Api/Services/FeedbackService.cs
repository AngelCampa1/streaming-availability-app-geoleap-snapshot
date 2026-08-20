using System.Collections.Concurrent;
using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service for handling user feedback submissions via email
/// </summary>
public class FeedbackService : IFeedbackService
{
    private readonly IEmailService _emailService;
    private readonly ILogger<FeedbackService> _logger;
    private readonly IConfiguration _configuration;

    // In-memory rate limiting (resets on app restart)
    private static readonly ConcurrentDictionary<string, List<DateTime>> RateLimitTracker = new();
    private const int MaxSubmissionsPerHour = 10;

    private const string FeedbackRecipientEmail = "hello@example.com";

    public FeedbackService(
        IEmailService emailService,
        ILogger<FeedbackService> logger,
        IConfiguration configuration)
    {
        _emailService = emailService;
        _logger = logger;
        _configuration = configuration;
    }

    public async Task<FeedbackResponse> SubmitFeedbackAsync(
        FeedbackRequest request,
        string? userEmail,
        string? userId,
        string? userAgent,
        string? ipAddress)
    {
        try
        {
            // Check rate limit
            if (IsRateLimited(ipAddress))
            {
                _logger.LogWarning("Rate limit exceeded for IP: {IpAddress}", ipAddress ?? "unknown");
                return new FeedbackResponse
                {
                    Success = false,
                    Message = "Too many feedback submissions. Please try again later."
                };
            }

            // Track submission for rate limiting
            TrackSubmission(ipAddress);

            // Determine the sender email for the feedback
            var senderEmail = request.Email ?? userEmail ?? "Anonymous";
            var senderInfo = userId != null ? $"User ID: {userId}" : "Anonymous User";

            // Build email subject
            var categoryName = GetCategoryDisplayName(request.Category);
            var subject = $"[Feedback - {categoryName}] {(string.IsNullOrWhiteSpace(request.Subject) ? "User Feedback" : request.Subject)}";

            // Build HTML email body
            var htmlBody = BuildFeedbackEmailHtml(request, senderEmail, senderInfo, userAgent, ipAddress);

            // Send email
            var emailSent = await _emailService.SendEmailAsync(FeedbackRecipientEmail, subject, htmlBody);

            // Log the outcome but always return success to the user
            // The feedback was "received" even if email delivery failed
            if (emailSent)
            {
                _logger.LogInformation(
                    "Feedback submitted and email sent successfully. Category: {Category}, Platform: {Platform}, From: {SenderEmail}",
                    request.Category, request.Platform ?? "Unknown", senderEmail);
            }
            else
            {
                // Log the email failure but don't fail the user request
                // This handles development mode or temporary email service issues
                _logger.LogWarning(
                    "Feedback received but email sending failed. Category: {Category}, Platform: {Platform}, From: {SenderEmail}",
                    request.Category, request.Platform ?? "Unknown", senderEmail);
            }

            // Always return success to the user - their feedback was received
            return new FeedbackResponse
            {
                Success = true,
                Message = "Thank you for your feedback! We appreciate you taking the time to help us improve."
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error submitting feedback");
            return new FeedbackResponse
            {
                Success = false,
                Message = "An unexpected error occurred. Please try again later."
            };
        }
    }

    public IEnumerable<FeedbackCategoryDto> GetCategories()
    {
        return Enum.GetValues<FeedbackCategory>()
            .Select(c => new FeedbackCategoryDto
            {
                Value = (int)c,
                Name = c.ToString(),
                DisplayName = GetCategoryDisplayName(c)
            });
    }

    public bool IsRateLimited(string? ipAddress)
    {
        if (string.IsNullOrEmpty(ipAddress))
            return false;

        if (!RateLimitTracker.TryGetValue(ipAddress, out var submissions))
            return false;

        var oneHourAgo = DateTime.UtcNow.AddHours(-1);
        var recentSubmissions = submissions.Count(s => s > oneHourAgo);

        return recentSubmissions >= MaxSubmissionsPerHour;
    }

    private void TrackSubmission(string? ipAddress)
    {
        if (string.IsNullOrEmpty(ipAddress))
            return;

        var oneHourAgo = DateTime.UtcNow.AddHours(-1);

        RateLimitTracker.AddOrUpdate(
            ipAddress,
            _ => new List<DateTime> { DateTime.UtcNow },
            (_, existing) =>
            {
                lock (existing)
                {
                    existing.RemoveAll(t => t < oneHourAgo);
                    existing.Add(DateTime.UtcNow);
                }
                return existing;
            });

        // Cleanup IPs with no recent submissions
        foreach (var key in RateLimitTracker.Keys.ToList())
        {
            if (RateLimitTracker.TryGetValue(key, out var submissions) &&
                !submissions.Any(s => s > oneHourAgo))
            {
                RateLimitTracker.TryRemove(key, out _);
            }
        }
    }

    private static string GetCategoryDisplayName(FeedbackCategory category) => category switch
    {
        FeedbackCategory.General => "General",
        FeedbackCategory.Bug => "Bug Report",
        FeedbackCategory.FeatureRequest => "Feature Request",
        FeedbackCategory.Question => "Question",
        FeedbackCategory.Complaint => "Complaint",
        FeedbackCategory.Other => "Other",
        _ => category.ToString()
    };

    private static string BuildFeedbackEmailHtml(
        FeedbackRequest request,
        string senderEmail,
        string senderInfo,
        string? userAgent,
        string? ipAddress)
    {
        var categoryName = GetCategoryDisplayName(request.Category);
        var timestamp = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss UTC");
        var platform = request.Platform ?? "Unknown";

        return $@"
<!DOCTYPE html>
<html>
<head>
    <meta charset='utf-8'>
    <title>User Feedback</title>
</head>
<body style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;'>
    <div style='background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0;'>
        <h1 style='color: white; margin: 0; font-size: 24px;'>New Feedback Received</h1>
        <p style='color: rgba(255,255,255,0.9); margin: 10px 0 0 0;'>Category: {categoryName}</p>
    </div>

    <div style='background-color: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef; border-top: none;'>
        <table style='width: 100%; border-collapse: collapse; margin-bottom: 20px;'>
            <tr>
                <td style='padding: 8px 0; color: #6c757d; width: 120px;'>From:</td>
                <td style='padding: 8px 0; color: #212529;'>{senderEmail}</td>
            </tr>
            <tr>
                <td style='padding: 8px 0; color: #6c757d;'>User Info:</td>
                <td style='padding: 8px 0; color: #212529;'>{senderInfo}</td>
            </tr>
            <tr>
                <td style='padding: 8px 0; color: #6c757d;'>Platform:</td>
                <td style='padding: 8px 0; color: #212529;'>{platform}</td>
            </tr>
            <tr>
                <td style='padding: 8px 0; color: #6c757d;'>Timestamp:</td>
                <td style='padding: 8px 0; color: #212529;'>{timestamp}</td>
            </tr>
            {(string.IsNullOrEmpty(request.Subject) ? "" : $@"
            <tr>
                <td style='padding: 8px 0; color: #6c757d;'>Subject:</td>
                <td style='padding: 8px 0; color: #212529;'>{System.Net.WebUtility.HtmlEncode(request.Subject)}</td>
            </tr>")}
        </table>

        <div style='background-color: white; padding: 20px; border-radius: 8px; border: 1px solid #e9ecef;'>
            <h3 style='margin: 0 0 15px 0; color: #495057;'>Message</h3>
            <p style='margin: 0; color: #212529; white-space: pre-wrap; line-height: 1.6;'>{System.Net.WebUtility.HtmlEncode(request.Message)}</p>
        </div>

        <div style='margin-top: 20px; padding-top: 20px; border-top: 1px solid #e9ecef; font-size: 12px; color: #6c757d;'>
            <p style='margin: 0;'>IP Address: {ipAddress ?? "Unknown"}</p>
            <p style='margin: 5px 0 0 0;'>User Agent: {System.Net.WebUtility.HtmlEncode(userAgent ?? "Unknown")}</p>
        </div>
    </div>

    <div style='text-align: center; padding: 20px; font-size: 12px; color: #999;'>
        <p style='margin: 0;'>&copy; {DateTime.UtcNow.Year} GeoLeap. All rights reserved.</p>
    </div>
</body>
</html>";
    }
}
