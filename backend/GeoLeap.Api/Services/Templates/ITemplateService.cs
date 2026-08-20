using System.Globalization;

namespace GeoLeap.Api.Services.Templates;

/// <summary>
/// Interface for email template processing with localization and variable substitution
/// </summary>
public interface ITemplateService
{
    /// <summary>
    /// Renders an email template with the specified parameters
    /// </summary>
    /// <param name="templateName">Name of the template to render</param>
    /// <param name="variables">Dictionary of variables to substitute in template</param>
    /// <param name="language">Target language/culture</param>
    /// <param name="includeImages">Whether to include images in the template</param>
    /// <returns>Rendered template content</returns>
    Task<TemplateResult> RenderTemplateAsync(
        string templateName, 
        Dictionary<string, object> variables, 
        string language = "en-US",
        bool includeImages = true);

    /// <summary>
    /// Gets localized subject line for a template
    /// </summary>
    Task<string> GetLocalizedSubjectAsync(string templateName, string language, Dictionary<string, object>? variables = null);

    /// <summary>
    /// Validates if a template exists for the specified language
    /// </summary>
    bool TemplateExists(string templateName, string language);

    /// <summary>
    /// Gets available languages for a template
    /// </summary>
    Task<List<string>> GetAvailableLanguagesAsync(string templateName);

    /// <summary>
    /// Precompiles templates for better performance
    /// </summary>
    Task PrecompileTemplatesAsync();
}

/// <summary>
/// Result of template rendering operation
/// </summary>
public class TemplateResult
{
    public string HtmlContent { get; set; } = string.Empty;
    public string PlainTextContent { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public List<TemplateImage> Images { get; set; } = new();
    public string Language { get; set; } = "en-US";
    public Dictionary<string, object> ResolvedVariables { get; set; } = new();
    public bool HasErrors { get; set; }
    public List<string> Errors { get; set; } = new();
}

/// <summary>
/// Represents an image in the template
/// </summary>
public class TemplateImage
{
    public string Name { get; set; } = string.Empty;
    public string ContentId { get; set; } = string.Empty;
    public string Base64Content { get; set; } = string.Empty;
    public string MimeType { get; set; } = string.Empty;
    public string AltText { get; set; } = string.Empty;
}

/// <summary>
/// Template metadata for different notification types
/// </summary>
public class NotificationTemplate
{
    public string Name { get; set; } = string.Empty;
    public NotificationType Type { get; set; }
    public Dictionary<string, string> Subjects { get; set; } = new(); // Language -> Subject
    public Dictionary<string, string> HtmlTemplates { get; set; } = new(); // Language -> HTML
    public Dictionary<string, string> PlainTextTemplates { get; set; } = new(); // Language -> Text
    public List<string> RequiredVariables { get; set; } = new();
    public List<string> OptionalVariables { get; set; } = new();
    public List<TemplateImage> DefaultImages { get; set; } = new();
    public DateTime LastModified { get; set; }
    public bool IsActive { get; set; } = true;
}

/// <summary>
/// Supported notification types for templates
/// </summary>
public enum NotificationType
{
    WelcomeEmail,
    ContentLeavingPlatform,
    ContentAvailable,
    RegionalAvailabilityChange,
    ContentExpiring,
    WeeklyDigest,
    MonthlyDigest,
    PersonalizedRecommendations,
    PasswordReset,
    EmailVerification,
    PaymentReminder,
    SubscriptionExpiring,
    WatchlistItemAdded,
    WatchlistShared
}