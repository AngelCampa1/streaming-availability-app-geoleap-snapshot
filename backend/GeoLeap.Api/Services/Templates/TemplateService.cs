using DotLiquid;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using System.Globalization;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace GeoLeap.Api.Services.Templates;

/// <summary>
/// Template service implementation using DotLiquid for rendering with localization support
/// </summary>
public class TemplateService : ITemplateService
{
    private readonly IMemoryCache _cache;
    private readonly ILogger<TemplateService> _logger;
    private readonly ILocalizationService _localizationService;
    private readonly Dictionary<string, NotificationTemplate> _templates;
    private readonly string _templateBasePath;
    private static readonly object _lockObject = new object();

    // Supported languages with proper culture codes
    public static readonly Dictionary<string, string> SupportedLanguages = new()
    {
        { "en-US", "English (US)" },
        { "en-GB", "English (UK)" },
        { "es-US", "Spanish (US)" },
        { "fr-FR", "French (France)" }
    };

    public TemplateService(
        IMemoryCache cache, 
        ILogger<TemplateService> logger,
        ILocalizationService localizationService,
        string templateBasePath = "Templates")
    {
        _cache = cache;
        _logger = logger;
        _localizationService = localizationService;
        _templateBasePath = templateBasePath;
        _templates = new Dictionary<string, NotificationTemplate>();
        
        InitializeTemplates();
        RegisterDotLiquidFilters();
    }

    private void RegisterDotLiquidFilters()
    {
        // Register custom filters for better template rendering
        Template.RegisterFilter(typeof(TemplateFilters));
    }

    public async Task<TemplateResult> RenderTemplateAsync(
        string templateName, 
        Dictionary<string, object> variables, 
        string language = "en-US",
        bool includeImages = true)
    {
        var result = new TemplateResult
        {
            Language = language
        };

        try
        {
            // Validate inputs
            if (string.IsNullOrEmpty(templateName))
            {
                result.HasErrors = true;
                result.Errors.Add("Template name cannot be empty");
                return result;
            }

            // Normalize language
            language = NormalizeLanguage(language);
            result.Language = language;

            // Get template
            var template = await GetTemplateAsync(templateName);
            if (template == null)
            {
                result.HasErrors = true;
                result.Errors.Add($"Template '{templateName}' not found");
                return await GetFallbackTemplateAsync(templateName, variables, language);
            }

            // Prepare variables with user personalization
            var processedVariables = await PrepareVariablesAsync(variables, language);
            result.ResolvedVariables = processedVariables;

            // Render HTML content
            if (template.HtmlTemplates.TryGetValue(language, out var htmlTemplate))
            {
                result.HtmlContent = await RenderContentAsync(htmlTemplate, processedVariables);
            }
            else
            {
                // Fallback to English if language not available
                if (template.HtmlTemplates.TryGetValue("en-US", out var fallbackHtml))
                {
                    result.HtmlContent = await RenderContentAsync(fallbackHtml, processedVariables);
                    result.Errors.Add($"HTML template not available for {language}, using en-US fallback");
                }
            }

            // Render plain text content
            if (template.PlainTextTemplates.TryGetValue(language, out var textTemplate))
            {
                result.PlainTextContent = await RenderContentAsync(textTemplate, processedVariables);
            }
            else if (template.PlainTextTemplates.TryGetValue("en-US", out var fallbackText))
            {
                result.PlainTextContent = await RenderContentAsync(fallbackText, processedVariables);
            }
            else
            {
                // Generate plain text from HTML as fallback
                result.PlainTextContent = StripHtmlTags(result.HtmlContent);
            }

            // Get localized subject
            result.Subject = await GetLocalizedSubjectAsync(templateName, language, processedVariables);

            // Include images if requested
            if (includeImages && template.DefaultImages.Any())
            {
                result.Images = template.DefaultImages.Select(img => new TemplateImage
                {
                    Name = img.Name,
                    ContentId = img.ContentId,
                    Base64Content = img.Base64Content,
                    MimeType = img.MimeType,
                    AltText = GetLocalizedText($"image.{img.Name}.alt", language, img.AltText)
                }).ToList();
            }

            _logger.LogInformation("Successfully rendered template {TemplateName} for language {Language}", 
                templateName, language);

        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error rendering template {TemplateName} for language {Language}", 
                templateName, language);
            result.HasErrors = true;
            result.Errors.Add($"Template rendering failed: {ex.Message}");
            
            // Return fallback result
            return await GetFallbackTemplateAsync(templateName, variables, language);
        }

        return result;
    }

    public async Task<string> GetLocalizedSubjectAsync(string templateName, string language, Dictionary<string, object>? variables = null)
    {
        try
        {
            var template = await GetTemplateAsync(templateName);
            if (template?.Subjects.TryGetValue(language, out var subject) == true)
            {
                if (variables != null && variables.Any())
                {
                    return await RenderContentAsync(subject, variables);
                }
                return subject;
            }

            // Fallback to English
            if (template?.Subjects.TryGetValue("en-US", out var fallbackSubject) == true)
            {
                if (variables != null && variables.Any())
                {
                    return await RenderContentAsync(fallbackSubject, variables);
                }
                return fallbackSubject;
            }

            // Ultimate fallback
            return GetLocalizedText($"email.{templateName}.subject", language, $"Notification - {templateName}");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting localized subject for {TemplateName} in {Language}", 
                templateName, language);
            return $"Notification - {templateName}";
        }
    }

    public bool TemplateExists(string templateName, string language)
    {
        var template = _templates.GetValueOrDefault(templateName);
        return template?.HtmlTemplates.ContainsKey(language) == true;
    }

    public async Task<List<string>> GetAvailableLanguagesAsync(string templateName)
    {
        await Task.CompletedTask; // For async pattern consistency
        var template = _templates.GetValueOrDefault(templateName);
        return template?.HtmlTemplates.Keys.ToList() ?? new List<string>();
    }

    public async Task PrecompileTemplatesAsync()
    {
        _logger.LogInformation("Precompiling templates for better performance");
        
        await Task.Run(() =>
        {
            lock (_lockObject)
            {
                foreach (var template in _templates.Values)
                {
                    foreach (var htmlTemplate in template.HtmlTemplates.Values)
                    {
                        try
                        {
                            Template.Parse(htmlTemplate);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogWarning(ex, "Failed to precompile HTML template for {TemplateName}", template.Name);
                        }
                    }

                    foreach (var textTemplate in template.PlainTextTemplates.Values)
                    {
                        try
                        {
                            Template.Parse(textTemplate);
                        }
                        catch (Exception ex)
                        {
                            _logger.LogWarning(ex, "Failed to precompile text template for {TemplateName}", template.Name);
                        }
                    }
                }
            }
        });

        _logger.LogInformation("Template precompilation completed");
    }

    #region Private Methods

    private void InitializeTemplates()
    {
        // Initialize built-in templates
        InitializeWelcomeTemplate();
        InitializeContentLeavingTemplate();
        InitializeContentAvailableTemplate();
        InitializeRegionalAvailabilityTemplate();
        InitializeContentExpiringTemplate();
        InitializeWeeklyDigestTemplate();
        InitializeMonthlyDigestTemplate();
        InitializePersonalizedRecommendationsTemplate();
        InitializePasswordResetTemplate();
        InitializeEmailVerificationTemplate();
    }

    private void InitializeWelcomeTemplate()
    {
        var template = new NotificationTemplate
        {
            Name = "welcome",
            Type = NotificationType.WelcomeEmail,
            RequiredVariables = new List<string> { "user_name", "user_email" },
            OptionalVariables = new List<string> { "company_name", "support_email" },
            LastModified = DateTime.UtcNow,
            Subjects = new Dictionary<string, string>
            {
                ["en-US"] = "Welcome to {{ company_name | default: 'GeoLeap' }}, {{ user_name }}!",
                ["en-GB"] = "Welcome to {{ company_name | default: 'GeoLeap' }}, {{ user_name }}!",
                ["es-US"] = "¡Bienvenido a {{ company_name | default: 'GeoLeap' }}, {{ user_name }}!",
                ["fr-FR"] = "Bienvenue chez {{ company_name | default: 'GeoLeap' }}, {{ user_name }} !"
            },
            HtmlTemplates = new Dictionary<string, string>
            {
                ["en-US"] = GetWelcomeHtmlTemplate("en-US"),
                ["en-GB"] = GetWelcomeHtmlTemplate("en-GB"),
                ["es-US"] = GetWelcomeHtmlTemplate("es-US"),
                ["fr-FR"] = GetWelcomeHtmlTemplate("fr-FR")
            },
            PlainTextTemplates = new Dictionary<string, string>
            {
                ["en-US"] = GetWelcomePlainTextTemplate("en-US"),
                ["en-GB"] = GetWelcomePlainTextTemplate("en-GB"),
                ["es-US"] = GetWelcomePlainTextTemplate("es-US"),
                ["fr-FR"] = GetWelcomePlainTextTemplate("fr-FR")
            }
        };

        _templates["welcome"] = template;
    }

    private void InitializeContentLeavingTemplate()
    {
        var template = new NotificationTemplate
        {
            Name = "content_leaving",
            Type = NotificationType.ContentLeavingPlatform,
            RequiredVariables = new List<string> { "user_name", "content_title", "service_name", "leaving_date", "days_until_removal" },
            OptionalVariables = new List<string> { "content_rating", "content_genres", "watch_url" },
            LastModified = DateTime.UtcNow,
            Subjects = new Dictionary<string, string>
            {
                ["en-US"] = "⚠️ {{ content_title }} is leaving {{ service_name }} soon!",
                ["en-GB"] = "⚠️ {{ content_title }} is leaving {{ service_name }} soon!",
                ["es-US"] = "⚠️ ¡{{ content_title }} dejará {{ service_name }} pronto!",
                ["fr-FR"] = "⚠️ {{ content_title }} quittera bientôt {{ service_name }} !"
            },
            HtmlTemplates = new Dictionary<string, string>
            {
                ["en-US"] = GetContentLeavingHtmlTemplate("en-US"),
                ["en-GB"] = GetContentLeavingHtmlTemplate("en-GB"),
                ["es-US"] = GetContentLeavingHtmlTemplate("es-US"),
                ["fr-FR"] = GetContentLeavingHtmlTemplate("fr-FR")
            },
            PlainTextTemplates = new Dictionary<string, string>
            {
                ["en-US"] = GetContentLeavingPlainTextTemplate("en-US"),
                ["en-GB"] = GetContentLeavingPlainTextTemplate("en-GB"),
                ["es-US"] = GetContentLeavingPlainTextTemplate("es-US"),
                ["fr-FR"] = GetContentLeavingPlainTextTemplate("fr-FR")
            }
        };

        _templates["content_leaving"] = template;
    }

    private void InitializeContentAvailableTemplate()
    {
        var template = new NotificationTemplate
        {
            Name = "content_available",
            Type = NotificationType.ContentAvailable,
            RequiredVariables = new List<string> { "user_name", "content_title", "service_name" },
            OptionalVariables = new List<string> { "content_rating", "content_genres", "watch_url" },
            LastModified = DateTime.UtcNow,
            Subjects = new Dictionary<string, string>
            {
                ["en-US"] = "🎉 {{ content_title }} is now available on {{ service_name }}!",
                ["en-GB"] = "🎉 {{ content_title }} is now available on {{ service_name }}!",
                ["es-US"] = "🎉 ¡{{ content_title }} ya está disponible en {{ service_name }}!",
                ["fr-FR"] = "🎉 {{ content_title }} est maintenant disponible sur {{ service_name }} !"
            },
            HtmlTemplates = new Dictionary<string, string>
            {
                ["en-US"] = GetContentAvailableHtmlTemplate("en-US"),
                ["en-GB"] = GetContentAvailableHtmlTemplate("en-GB"),
                ["es-US"] = GetContentAvailableHtmlTemplate("es-US"),
                ["fr-FR"] = GetContentAvailableHtmlTemplate("fr-FR")
            },
            PlainTextTemplates = new Dictionary<string, string>
            {
                ["en-US"] = GetContentAvailablePlainTextTemplate("en-US"),
                ["en-GB"] = GetContentAvailablePlainTextTemplate("en-GB"),
                ["es-US"] = GetContentAvailablePlainTextTemplate("es-US"),
                ["fr-FR"] = GetContentAvailablePlainTextTemplate("fr-FR")
            }
        };

        _templates["content_available"] = template;
    }

    private void InitializeRegionalAvailabilityTemplate()
    {
        var template = new NotificationTemplate
        {
            Name = "regional_availability",
            Type = NotificationType.RegionalAvailabilityChange,
            RequiredVariables = new List<string> { "user_name", "content_title", "changes" },
            OptionalVariables = new List<string> { "total_changes", "added_regions", "removed_regions" },
            LastModified = DateTime.UtcNow,
            Subjects = new Dictionary<string, string>
            {
                ["en-US"] = "📍 Regional availability update for {{ content_title }}",
                ["en-GB"] = "📍 Regional availability update for {{ content_title }}",
                ["es-US"] = "📍 Actualización de disponibilidad regional para {{ content_title }}",
                ["fr-FR"] = "📍 Mise à jour de la disponibilité régionale pour {{ content_title }}"
            },
            HtmlTemplates = new Dictionary<string, string>
            {
                ["en-US"] = GetRegionalAvailabilityHtmlTemplate("en-US"),
                ["en-GB"] = GetRegionalAvailabilityHtmlTemplate("en-GB"),
                ["es-US"] = GetRegionalAvailabilityHtmlTemplate("es-US"),
                ["fr-FR"] = GetRegionalAvailabilityHtmlTemplate("fr-FR")
            },
            PlainTextTemplates = new Dictionary<string, string>
            {
                ["en-US"] = GetRegionalAvailabilityPlainTextTemplate("en-US"),
                ["en-GB"] = GetRegionalAvailabilityPlainTextTemplate("en-GB"),
                ["es-US"] = GetRegionalAvailabilityPlainTextTemplate("es-US"),
                ["fr-FR"] = GetRegionalAvailabilityPlainTextTemplate("fr-FR")
            }
        };

        _templates["regional_availability"] = template;
    }

    private void InitializeContentExpiringTemplate()
    {
        var template = new NotificationTemplate
        {
            Name = "content_expiring",
            Type = NotificationType.ContentExpiring,
            RequiredVariables = new List<string> { "user_name", "expiring_content" },
            OptionalVariables = new List<string> { "urgent_count", "normal_count", "total_count" },
            LastModified = DateTime.UtcNow,
            Subjects = new Dictionary<string, string>
            {
                ["en-US"] = "⏰ Content from your watchlist is expiring soon",
                ["en-GB"] = "⏰ Content from your watchlist is expiring soon",
                ["es-US"] = "⏰ El contenido de tu lista está por expirar",
                ["fr-FR"] = "⏰ Le contenu de votre liste de suivi expire bientôt"
            },
            HtmlTemplates = new Dictionary<string, string>
            {
                ["en-US"] = GetContentExpiringHtmlTemplate("en-US"),
                ["en-GB"] = GetContentExpiringHtmlTemplate("en-GB"),
                ["es-US"] = GetContentExpiringHtmlTemplate("es-US"),
                ["fr-FR"] = GetContentExpiringHtmlTemplate("fr-FR")
            },
            PlainTextTemplates = new Dictionary<string, string>
            {
                ["en-US"] = GetContentExpiringPlainTextTemplate("en-US"),
                ["en-GB"] = GetContentExpiringPlainTextTemplate("en-GB"),
                ["es-US"] = GetContentExpiringPlainTextTemplate("es-US"),
                ["fr-FR"] = GetContentExpiringPlainTextTemplate("fr-FR")
            }
        };

        _templates["content_expiring"] = template;
    }

    private void InitializeWeeklyDigestTemplate()
    {
        var template = new NotificationTemplate
        {
            Name = "weekly_digest",
            Type = NotificationType.WeeklyDigest,
            RequiredVariables = new List<string> { "user_name", "week_start", "week_end" },
            OptionalVariables = new List<string> { "new_content", "leaving_content", "total_items", "highlights" },
            LastModified = DateTime.UtcNow,
            Subjects = new Dictionary<string, string>
            {
                ["en-US"] = "📺 Your Weekly GeoLeap Digest - {{ week_start | date: '%B %d' }}",
                ["en-GB"] = "📺 Your Weekly GeoLeap Digest - {{ week_start | date: '%d %B' }}",
                ["es-US"] = "📺 Tu Resumen Semanal de GeoLeap - {{ week_start | date: '%d de %B' }}",
                ["fr-FR"] = "📺 Votre Résumé Hebdomadaire GeoLeap - {{ week_start | date: '%d %B' }}"
            },
            HtmlTemplates = new Dictionary<string, string>
            {
                ["en-US"] = GetWeeklyDigestHtmlTemplate("en-US"),
                ["en-GB"] = GetWeeklyDigestHtmlTemplate("en-GB"),
                ["es-US"] = GetWeeklyDigestHtmlTemplate("es-US"),
                ["fr-FR"] = GetWeeklyDigestHtmlTemplate("fr-FR")
            },
            PlainTextTemplates = new Dictionary<string, string>
            {
                ["en-US"] = GetWeeklyDigestPlainTextTemplate("en-US"),
                ["en-GB"] = GetWeeklyDigestPlainTextTemplate("en-GB"),
                ["es-US"] = GetWeeklyDigestPlainTextTemplate("es-US"),
                ["fr-FR"] = GetWeeklyDigestPlainTextTemplate("fr-FR")
            }
        };

        _templates["weekly_digest"] = template;
    }

    private void InitializeMonthlyDigestTemplate()
    {
        var template = new NotificationTemplate
        {
            Name = "monthly_digest",
            Type = NotificationType.MonthlyDigest,
            RequiredVariables = new List<string> { "user_name", "month_name", "year" },
            OptionalVariables = new List<string> { "watched_count", "added_count", "stats", "top_genres" },
            LastModified = DateTime.UtcNow,
            Subjects = new Dictionary<string, string>
            {
                ["en-US"] = "📊 Your {{ month_name }} {{ year }} GeoLeap Report",
                ["en-GB"] = "📊 Your {{ month_name }} {{ year }} GeoLeap Report",
                ["es-US"] = "📊 Tu Reporte de GeoLeap - {{ month_name }} {{ year }}",
                ["fr-FR"] = "📊 Votre Rapport GeoLeap - {{ month_name }} {{ year }}"
            },
            HtmlTemplates = new Dictionary<string, string>
            {
                ["en-US"] = GetMonthlyDigestHtmlTemplate("en-US"),
                ["en-GB"] = GetMonthlyDigestHtmlTemplate("en-GB"),
                ["es-US"] = GetMonthlyDigestHtmlTemplate("es-US"),
                ["fr-FR"] = GetMonthlyDigestHtmlTemplate("fr-FR")
            },
            PlainTextTemplates = new Dictionary<string, string>
            {
                ["en-US"] = GetMonthlyDigestPlainTextTemplate("en-US"),
                ["en-GB"] = GetMonthlyDigestPlainTextTemplate("en-GB"),
                ["es-US"] = GetMonthlyDigestPlainTextTemplate("es-US"),
                ["fr-FR"] = GetMonthlyDigestPlainTextTemplate("fr-FR")
            }
        };

        _templates["monthly_digest"] = template;
    }

    private void InitializePersonalizedRecommendationsTemplate()
    {
        var template = new NotificationTemplate
        {
            Name = "personalized_recommendations",
            Type = NotificationType.PersonalizedRecommendations,
            RequiredVariables = new List<string> { "user_name", "recommendations", "period" },
            OptionalVariables = new List<string> { "recommendation_count", "personalization_score", "based_on" },
            LastModified = DateTime.UtcNow,
            Subjects = new Dictionary<string, string>
            {
                ["en-US"] = "🎯 {{ recommendation_count | default: 'New' }} personalized picks for you, {{ user_name }}!",
                ["en-GB"] = "🎯 {{ recommendation_count | default: 'New' }} personalised picks for you, {{ user_name }}!",
                ["es-US"] = "🎯 ¡{{ recommendation_count | default: 'Nuevas' }} recomendaciones personalizadas para ti, {{ user_name }}!",
                ["fr-FR"] = "🎯 {{ recommendation_count | default: 'Nouvelles' }} recommandations personnalisées pour vous, {{ user_name }} !"
            },
            HtmlTemplates = new Dictionary<string, string>
            {
                ["en-US"] = GetPersonalizedRecommendationsHtmlTemplate("en-US"),
                ["en-GB"] = GetPersonalizedRecommendationsHtmlTemplate("en-GB"),
                ["es-US"] = GetPersonalizedRecommendationsHtmlTemplate("es-US"),
                ["fr-FR"] = GetPersonalizedRecommendationsHtmlTemplate("fr-FR")
            },
            PlainTextTemplates = new Dictionary<string, string>
            {
                ["en-US"] = GetPersonalizedRecommendationsPlainTextTemplate("en-US"),
                ["en-GB"] = GetPersonalizedRecommendationsPlainTextTemplate("en-GB"),
                ["es-US"] = GetPersonalizedRecommendationsPlainTextTemplate("es-US"),
                ["fr-FR"] = GetPersonalizedRecommendationsPlainTextTemplate("fr-FR")
            }
        };

        _templates["personalized_recommendations"] = template;
    }

    private void InitializePasswordResetTemplate()
    {
        var template = new NotificationTemplate
        {
            Name = "password_reset",
            Type = NotificationType.PasswordReset,
            RequiredVariables = new List<string> { "user_name", "reset_url", "expires_in_hours" },
            OptionalVariables = new List<string> { "support_email", "ip_address", "user_agent" },
            LastModified = DateTime.UtcNow,
            Subjects = new Dictionary<string, string>
            {
                ["en-US"] = "🔒 Password reset request for your GeoLeap account",
                ["en-GB"] = "🔒 Password reset request for your GeoLeap account",
                ["es-US"] = "🔒 Solicitud de restablecimiento de contraseña para tu cuenta GeoLeap",
                ["fr-FR"] = "🔒 Demande de réinitialisation de mot de passe pour votre compte GeoLeap"
            },
            HtmlTemplates = new Dictionary<string, string>
            {
                ["en-US"] = GetPasswordResetHtmlTemplate("en-US"),
                ["en-GB"] = GetPasswordResetHtmlTemplate("en-GB"),
                ["es-US"] = GetPasswordResetHtmlTemplate("es-US"),
                ["fr-FR"] = GetPasswordResetHtmlTemplate("fr-FR")
            },
            PlainTextTemplates = new Dictionary<string, string>
            {
                ["en-US"] = GetPasswordResetPlainTextTemplate("en-US"),
                ["en-GB"] = GetPasswordResetPlainTextTemplate("en-GB"),
                ["es-US"] = GetPasswordResetPlainTextTemplate("es-US"),
                ["fr-FR"] = GetPasswordResetPlainTextTemplate("fr-FR")
            }
        };

        _templates["password_reset"] = template;
    }

    private void InitializeEmailVerificationTemplate()
    {
        var template = new NotificationTemplate
        {
            Name = "email_verification",
            Type = NotificationType.EmailVerification,
            RequiredVariables = new List<string> { "user_name", "verification_url", "expires_in_hours" },
            OptionalVariables = new List<string> { "support_email", "company_name" },
            LastModified = DateTime.UtcNow,
            Subjects = new Dictionary<string, string>
            {
                ["en-US"] = "✅ Please verify your GeoLeap email address",
                ["en-GB"] = "✅ Please verify your GeoLeap email address",
                ["es-US"] = "✅ Por favor verifica tu dirección de email de GeoLeap",
                ["fr-FR"] = "✅ Veuillez vérifier votre adresse e-mail GeoLeap"
            },
            HtmlTemplates = new Dictionary<string, string>
            {
                ["en-US"] = GetEmailVerificationHtmlTemplate("en-US"),
                ["en-GB"] = GetEmailVerificationHtmlTemplate("en-GB"),
                ["es-US"] = GetEmailVerificationHtmlTemplate("es-US"),
                ["fr-FR"] = GetEmailVerificationHtmlTemplate("fr-FR")
            },
            PlainTextTemplates = new Dictionary<string, string>
            {
                ["en-US"] = GetEmailVerificationPlainTextTemplate("en-US"),
                ["en-GB"] = GetEmailVerificationPlainTextTemplate("en-GB"),
                ["es-US"] = GetEmailVerificationPlainTextTemplate("es-US"),
                ["fr-FR"] = GetEmailVerificationPlainTextTemplate("fr-FR")
            }
        };

        _templates["email_verification"] = template;
    }

    private async Task<NotificationTemplate> GetTemplateAsync(string templateName)
    {
        await Task.CompletedTask; // For async pattern consistency
        return _templates.GetValueOrDefault(templateName);
    }

    private async Task<Dictionary<string, object>> PrepareVariablesAsync(Dictionary<string, object> variables, string language)
    {
        var processedVariables = new Dictionary<string, object>(variables);

        // Add current date/time variables
        var now = DateTime.UtcNow;
        var culture = new CultureInfo(language);
        
        processedVariables["current_date"] = now.ToString("d", culture);
        processedVariables["current_time"] = now.ToString("t", culture);
        processedVariables["current_year"] = now.Year;
        processedVariables["current_month"] = now.ToString("MMMM", culture);

        // Add localized common variables
        processedVariables["company_name"] = processedVariables.GetValueOrDefault("company_name", "GeoLeap");
        processedVariables["support_email"] = processedVariables.GetValueOrDefault("support_email", "support@geoleap.com");
        
        // Add personalization variables
        if (processedVariables.TryGetValue("user_name", out var userName))
        {
            processedVariables["user_first_name"] = ExtractFirstName(userName?.ToString() ?? "");
            processedVariables["user_display_name"] = FormatDisplayName(userName?.ToString() ?? "", language);
        }

        return processedVariables;
    }

    private async Task<string> RenderContentAsync(string templateContent, Dictionary<string, object> variables)
    {
        try
        {
            var template = Template.Parse(templateContent);
            var hash = Hash.FromDictionary(variables);
            return await Task.FromResult(template.Render(hash));
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error rendering template content");
            return templateContent; // Return original template as fallback
        }
    }

    private async Task<TemplateResult> GetFallbackTemplateAsync(string templateName, Dictionary<string, object> variables, string language)
    {
        var fallback = new TemplateResult
        {
            Language = language,
            Subject = $"GeoLeap Notification - {templateName}",
            HtmlContent = GetFallbackHtmlContent(templateName, variables, language),
            PlainTextContent = GetFallbackPlainTextContent(templateName, variables, language),
            HasErrors = true,
            Errors = new List<string> { $"Using fallback template for {templateName}" }
        };

        return await Task.FromResult(fallback);
    }

    private string GetFallbackHtmlContent(string templateName, Dictionary<string, object> variables, string language)
    {
        var userName = variables.GetValueOrDefault("user_name", "User")?.ToString();
        var greeting = GetLocalizedText("common.greeting", language, "Hello");

        return $@"
        <html>
        <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
            <div style='max-width: 600px; margin: 0 auto; padding: 20px;'>
                <h1 style='color: #0066cc;'>GeoLeap</h1>
                <p>{greeting} {userName},</p>
                <p>This is a notification regarding: <strong>{templateName}</strong></p>
                <p>We're sorry, but the full template is currently unavailable.</p>
                <hr style='border: 1px solid #eee; margin: 20px 0;'>
                <p style='font-size: 12px; color: #666;'>
                    Best regards,<br>
                    The GeoLeap Team
                </p>
            </div>
        </body>
        </html>";
    }

    private string GetFallbackPlainTextContent(string templateName, Dictionary<string, object> variables, string language)
    {
        var userName = variables.GetValueOrDefault("user_name", "User")?.ToString();
        var greeting = GetLocalizedText("common.greeting", language, "Hello");

        return $@"{greeting} {userName},

This is a notification regarding: {templateName}

We're sorry, but the full template is currently unavailable.

Best regards,
The GeoLeap Team";
    }

    private string NormalizeLanguage(string language)
    {
        if (string.IsNullOrEmpty(language))
            return "en-US";

        // Handle common variations
        language = language.Replace("_", "-");
        
        if (SupportedLanguages.ContainsKey(language))
            return language;

        // Try to match by language code only
        var languageCode = language.Split('-')[0].ToLower();
        var match = SupportedLanguages.Keys.FirstOrDefault(k => k.StartsWith(languageCode, StringComparison.OrdinalIgnoreCase));
        
        return match ?? "en-US";
    }

    private string ExtractFirstName(string fullName)
    {
        if (string.IsNullOrEmpty(fullName))
            return "";

        var parts = fullName.Trim().Split(' ', StringSplitOptions.RemoveEmptyEntries);
        return parts.Length > 0 ? parts[0] : fullName;
    }

    private string FormatDisplayName(string name, string language)
    {
        if (string.IsNullOrEmpty(name))
            return GetLocalizedText("common.guest", language, "Guest");

        // Different cultures may have different name formatting preferences
        return language switch
        {
            "fr-FR" => $"M./Mme {name}",
            _ => name
        };
    }

    private string GetLocalizedText(string key, string language, string fallback)
    {
        return _localizationService?.GetString(key, language) ?? fallback;
    }

    private string StripHtmlTags(string html)
    {
        if (string.IsNullOrEmpty(html))
            return "";

        // Simple HTML tag removal
        return Regex.Replace(html, "<.*?>", "").Trim();
    }

    #endregion

    #region Template Content Methods

    // These methods would normally load from external files or a database
    // For now, they return inline HTML templates for each notification type and language
    
    private string GetWelcomeHtmlTemplate(string language) => language switch
    {
        "en-US" => @"
        <html>
        <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
            <div style='max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;'>
                <div style='background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);'>
                    <h1 style='color: #0066cc; text-align: center; margin-bottom: 30px;'>Welcome to {{ company_name }}!</h1>
                    <p>Hello {{ user_name }},</p>
                    <p>Welcome to {{ company_name }}! We're excited to have you on board and help you discover amazing content across all streaming platforms.</p>
                    <p>Here's what you can do with your new account:</p>
                    <ul>
                        <li>Create personalized watchlists</li>
                        <li>Get notified when content becomes available</li>
                        <li>Track content across multiple platforms</li>
                        <li>Receive personalized recommendations</li>
                    </ul>
                    <div style='text-align: center; margin: 30px 0;'>
                        <a href='{{ dashboard_url | default: ""https://geoleap.com/dashboard"" }}' style='background: #0066cc; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;'>Get Started</a>
                    </div>
                    <p>If you have any questions, don't hesitate to reach out to our support team at {{ support_email }}.</p>
                    <p>Happy streaming!</p>
                    <p>The {{ company_name }} Team</p>
                </div>
            </div>
        </body>
        </html>",
        "en-GB" => @"
        <html>
        <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
            <div style='max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;'>
                <div style='background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);'>
                    <h1 style='color: #0066cc; text-align: center; margin-bottom: 30px;'>Welcome to {{ company_name }}!</h1>
                    <p>Hello {{ user_name }},</p>
                    <p>Welcome to {{ company_name }}! We're delighted to have you join us and help you discover brilliant content across all streaming platforms.</p>
                    <p>Here's what you can do with your new account:</p>
                    <ul>
                        <li>Create personalised watchlists</li>
                        <li>Get notified when content becomes available</li>
                        <li>Track content across multiple platforms</li>
                        <li>Receive personalised recommendations</li>
                    </ul>
                    <div style='text-align: center; margin: 30px 0;'>
                        <a href='{{ dashboard_url | default: ""https://geoleap.com/dashboard"" }}' style='background: #0066cc; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;'>Get Started</a>
                    </div>
                    <p>If you have any questions, please don't hesitate to contact our support team at {{ support_email }}.</p>
                    <p>Happy streaming!</p>
                    <p>The {{ company_name }} Team</p>
                </div>
            </div>
        </body>
        </html>",
        "es-US" => @"
        <html>
        <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
            <div style='max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;'>
                <div style='background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);'>
                    <h1 style='color: #0066cc; text-align: center; margin-bottom: 30px;'>¡Bienvenido a {{ company_name }}!</h1>
                    <p>Hola {{ user_name }},</p>
                    <p>¡Bienvenido a {{ company_name }}! Estamos emocionados de tenerte con nosotros y ayudarte a descubrir contenido increíble en todas las plataformas de streaming.</p>
                    <p>Esto es lo que puedes hacer con tu nueva cuenta:</p>
                    <ul>
                        <li>Crear listas de seguimiento personalizadas</li>
                        <li>Recibir notificaciones cuando el contenido esté disponible</li>
                        <li>Seguir contenido en múltiples plataformas</li>
                        <li>Recibir recomendaciones personalizadas</li>
                    </ul>
                    <div style='text-align: center; margin: 30px 0;'>
                        <a href='{{ dashboard_url | default: ""https://geoleap.com/dashboard"" }}' style='background: #0066cc; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;'>Comenzar</a>
                    </div>
                    <p>Si tienes alguna pregunta, no dudes en contactar a nuestro equipo de soporte en {{ support_email }}.</p>
                    <p>¡Feliz streaming!</p>
                    <p>El Equipo de {{ company_name }}</p>
                </div>
            </div>
        </body>
        </html>",
        "fr-FR" => @"
        <html>
        <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
            <div style='max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;'>
                <div style='background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);'>
                    <h1 style='color: #0066cc; text-align: center; margin-bottom: 30px;'>Bienvenue chez {{ company_name }} !</h1>
                    <p>Bonjour {{ user_name }},</p>
                    <p>Bienvenue chez {{ company_name }} ! Nous sommes ravis de vous compter parmi nous et de vous aider à découvrir du contenu fantastique sur toutes les plateformes de streaming.</p>
                    <p>Voici ce que vous pouvez faire avec votre nouveau compte :</p>
                    <ul>
                        <li>Créer des listes de suivi personnalisées</li>
                        <li>Être notifié lorsque le contenu devient disponible</li>
                        <li>Suivre le contenu sur plusieurs plateformes</li>
                        <li>Recevoir des recommandations personnalisées</li>
                    </ul>
                    <div style='text-align: center; margin: 30px 0;'>
                        <a href='{{ dashboard_url | default: ""https://geoleap.com/dashboard"" }}' style='background: #0066cc; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;'>Commencer</a>
                    </div>
                    <p>Si vous avez des questions, n'hésitez pas à contacter notre équipe de support à {{ support_email }}.</p>
                    <p>Bon streaming !</p>
                    <p>L'Équipe {{ company_name }}</p>
                </div>
            </div>
        </body>
        </html>",
        _ => GetWelcomeHtmlTemplate("en-US")
    };

    private string GetWelcomePlainTextTemplate(string language) => language switch
    {
        "en-US" => @"Welcome to {{ company_name }}!

Hello {{ user_name }},

Welcome to {{ company_name }}! We're excited to have you on board and help you discover amazing content across all streaming platforms.

Here's what you can do with your new account:
• Create personalized watchlists
• Get notified when content becomes available
• Track content across multiple platforms
• Receive personalized recommendations

Get started: {{ dashboard_url | default: 'https://geoleap.com/dashboard' }}

If you have any questions, don't hesitate to reach out to our support team at {{ support_email }}.

Happy streaming!
The {{ company_name }} Team",
        "en-GB" => @"Welcome to {{ company_name }}!

Hello {{ user_name }},

Welcome to {{ company_name }}! We're delighted to have you join us and help you discover brilliant content across all streaming platforms.

Here's what you can do with your new account:
• Create personalised watchlists
• Get notified when content becomes available
• Track content across multiple platforms
• Receive personalised recommendations

Get started: {{ dashboard_url | default: 'https://geoleap.com/dashboard' }}

If you have any questions, please don't hesitate to contact our support team at {{ support_email }}.

Happy streaming!
The {{ company_name }} Team",
        "es-US" => @"¡Bienvenido a {{ company_name }}!

Hola {{ user_name }},

¡Bienvenido a {{ company_name }}! Estamos emocionados de tenerte con nosotros y ayudarte a descubrir contenido increíble en todas las plataformas de streaming.

Esto es lo que puedes hacer con tu nueva cuenta:
• Crear listas de seguimiento personalizadas
• Recibir notificaciones cuando el contenido esté disponible
• Seguir contenido en múltiples plataformas
• Recibir recomendaciones personalizadas

Comenzar: {{ dashboard_url | default: 'https://geoleap.com/dashboard' }}

Si tienes alguna pregunta, no dudes en contactar a nuestro equipo de soporte en {{ support_email }}.

¡Feliz streaming!
El Equipo de {{ company_name }}",
        "fr-FR" => @"Bienvenue chez {{ company_name }} !

Bonjour {{ user_name }},

Bienvenue chez {{ company_name }} ! Nous sommes ravis de vous compter parmi nous et de vous aider à découvrir du contenu fantastique sur toutes les plateformes de streaming.

Voici ce que vous pouvez faire avec votre nouveau compte :
• Créer des listes de suivi personnalisées
• Être notifié lorsque le contenu devient disponible
• Suivre le contenu sur plusieurs plateformes
• Recevoir des recommandations personnalisées

Commencer : {{ dashboard_url | default: 'https://geoleap.com/dashboard' }}

Si vous avez des questions, n'hésitez pas à contacter notre équipe de support à {{ support_email }}.

Bon streaming !
L'Équipe {{ company_name }}",
        _ => GetWelcomePlainTextTemplate("en-US")
    };

    // Additional template methods would be implemented similarly...
    // For brevity, I'll implement a few key ones and add placeholders for others

    private string GetContentLeavingHtmlTemplate(string language) => language switch
    {
        "en-US" => @"
        <html>
        <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
            <div style='max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;'>
                <div style='background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);'>
                    <h1 style='color: #ff6b35; text-align: center; margin-bottom: 30px;'>⚠️ Content Leaving Soon</h1>
                    <p>Hi {{ user_name }},</p>
                    <p><strong>{{ content_title }}</strong> is leaving {{ service_name }} on {{ leaving_date | date: '%B %d, %Y' }}.</p>
                    <p>You have <strong>{{ days_until_removal }} day{% if days_until_removal != 1 %}s{% endif %}</strong> left to watch it!</p>
                    {% if content_rating %}
                    <p><strong>Rating:</strong> {{ content_rating }}/10</p>
                    {% endif %}
                    {% if content_genres %}
                    <p><strong>Genres:</strong> {{ content_genres | join: ', ' }}</p>
                    {% endif %}
                    {% if watch_url %}
                    <div style='text-align: center; margin: 30px 0;'>
                        <a href='{{ watch_url }}' style='background: #ff6b35; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;'>Watch Now</a>
                    </div>
                    {% endif %}
                    <p>Don't miss out!</p>
                    <p>The GeoLeap Team</p>
                </div>
            </div>
        </body>
        </html>",
        _ => GetContentLeavingHtmlTemplate("en-US") // Placeholder for other languages
    };

    private string GetContentLeavingPlainTextTemplate(string language) => language switch
    {
        "en-US" => @"⚠️ Content Leaving Soon

Hi {{ user_name }},

{{ content_title }} is leaving {{ service_name }} on {{ leaving_date | date: '%B %d, %Y' }}.

You have {{ days_until_removal }} day{% if days_until_removal != 1 %}s{% endif %} left to watch it!

{% if content_rating %}Rating: {{ content_rating }}/10{% endif %}
{% if content_genres %}Genres: {{ content_genres | join: ', ' }}{% endif %}
{% if watch_url %}Watch now: {{ watch_url }}{% endif %}

Don't miss out!

The GeoLeap Team",
        _ => GetContentLeavingPlainTextTemplate("en-US")
    };

    private string GetContentAvailableHtmlTemplate(string language) => language switch
    {
        "en-US" => @"
        <html>
        <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
            <div style='max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;'>
                <div style='background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);'>
                    {% assign tone = notification_tone | default: 'friendly' %}
                    {% assign greeting = 'Hi' %}
                    {% assign excitement = '🎉' %}
                    {% if tone == 'professional' %}
                        {% assign greeting = 'Dear' %}
                        {% assign excitement = '' %}
                    {% elsif tone == 'minimal' %}
                        {% assign greeting = 'Hello' %}
                        {% assign excitement = '' %}
                    {% endif %}
                    
                    <h1 style='color: #0066cc; text-align: center; margin-bottom: 30px;'>{{ excitement }} Great News!</h1>
                    <p>{{ greeting }} {{ user_first_name }},</p>
                    
                    {% if tone == 'friendly' %}
                    <p>Awesome news! <strong>{{ content_title }}</strong> is now available on {{ service_name }}!</p>
                    <p>This is exactly the kind of exciting content you've been waiting for.</p>
                    {% elsif tone == 'professional' %}
                    <p>We are pleased to inform you that <strong>{{ content_title }}</strong> is now available on {{ service_name }}.</p>
                    <p>This content has been added to your available streaming options.</p>
                    {% else %}
                    <p><strong>{{ content_title }}</strong> is available on {{ service_name }}.</p>
                    {% endif %}
                    
                    {% if content_rating or release_year or content_genres %}
                    <div style='background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;'>
                        {% if content_rating %}
                        <p style='margin: 5px 0;'><strong>Rating:</strong> {{ content_rating }}/10</p>
                        {% endif %}
                        {% if release_year %}
                        <p style='margin: 5px 0;'><strong>Year:</strong> {{ release_year }}</p>
                        {% endif %}
                        {% if runtime_formatted %}
                        <p style='margin: 5px 0;'><strong>Runtime:</strong> {{ runtime_formatted }}</p>
                        {% endif %}
                        {% if genres_text %}
                        <p style='margin: 5px 0;'><strong>Genres:</strong> {{ genres_text }}</p>
                        {% endif %}
                    </div>
                    {% endif %}
                    
                    {% if content_overview %}
                    <p style='font-style: italic; color: #666;'>{{ content_overview }}</p>
                    {% endif %}
                    
                    {% if include_images and poster_url %}
                    <div style='text-align: center; margin: 20px 0;'>
                        <img src='{{ poster_url }}' alt='{{ content_title }} poster' style='max-width: 300px; height: auto; border-radius: 5px;'>
                    </div>
                    {% endif %}
                    
                    <div style='text-align: center; margin: 30px 0;'>
                        <a href='#' style='background: #0066cc; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;'>Watch Now on {{ service_name }}</a>
                    </div>
                    
                    {% if tone == 'friendly' %}
                    <p>Happy streaming!</p>
                    {% elsif tone == 'professional' %}
                    <p>Thank you for using GeoLeap.</p>
                    {% else %}
                    <p>Enjoy.</p>
                    {% endif %}

                    <p>The GeoLeap Team</p>
                </div>
            </div>
        </body>
        </html>",
        "en-GB" => @"
        <html>
        <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
            <div style='max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;'>
                <div style='background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);'>
                    {% assign tone = notification_tone | default: 'friendly' %}
                    {% assign greeting = 'Hi' %}
                    {% assign excitement = '🎉' %}
                    {% if tone == 'professional' %}
                        {% assign greeting = 'Dear' %}
                        {% assign excitement = '' %}
                    {% elsif tone == 'minimal' %}
                        {% assign greeting = 'Hello' %}
                        {% assign excitement = '' %}
                    {% endif %}
                    
                    <h1 style='color: #0066cc; text-align: center; margin-bottom: 30px;'>{{ excitement }} Brilliant News!</h1>
                    <p>{{ greeting }} {{ user_first_name }},</p>
                    
                    {% if tone == 'friendly' %}
                    <p>Fantastic news! <strong>{{ content_title }}</strong> is now available on {{ service_name }}!</p>
                    <p>This is exactly the sort of brilliant content you've been waiting for.</p>
                    {% elsif tone == 'professional' %}
                    <p>We are pleased to inform you that <strong>{{ content_title }}</strong> is now available on {{ service_name }}.</p>
                    <p>This content has been added to your available streaming options.</p>
                    {% else %}
                    <p><strong>{{ content_title }}</strong> is available on {{ service_name }}.</p>
                    {% endif %}
                    
                    {% if content_rating or release_year or content_genres %}
                    <div style='background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;'>
                        {% if content_rating %}
                        <p style='margin: 5px 0;'><strong>Rating:</strong> {{ content_rating }}/10</p>
                        {% endif %}
                        {% if release_year %}
                        <p style='margin: 5px 0;'><strong>Year:</strong> {{ release_year }}</p>
                        {% endif %}
                        {% if runtime_formatted %}
                        <p style='margin: 5px 0;'><strong>Runtime:</strong> {{ runtime_formatted }}</p>
                        {% endif %}
                        {% if genres_text %}
                        <p style='margin: 5px 0;'><strong>Genres:</strong> {{ genres_text }}</p>
                        {% endif %}
                    </div>
                    {% endif %}
                    
                    {% if content_overview %}
                    <p style='font-style: italic; color: #666;'>{{ content_overview }}</p>
                    {% endif %}
                    
                    {% if include_images and poster_url %}
                    <div style='text-align: center; margin: 20px 0;'>
                        <img src='{{ poster_url }}' alt='{{ content_title }} poster' style='max-width: 300px; height: auto; border-radius: 5px;'>
                    </div>
                    {% endif %}
                    
                    <div style='text-align: center; margin: 30px 0;'>
                        <a href='#' style='background: #0066cc; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;'>Watch Now on {{ service_name }}</a>
                    </div>
                    
                    {% if tone == 'friendly' %}
                    <p>Happy streaming!</p>
                    {% elsif tone == 'professional' %}
                    <p>Thank you for using GeoLeap.</p>
                    {% else %}
                    <p>Cheers.</p>
                    {% endif %}

                    <p>The GeoLeap Team</p>
                </div>
            </div>
        </body>
        </html>",
        "es-US" => @"
        <html>
        <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
            <div style='max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;'>
                <div style='background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);'>
                    <h1 style='color: #0066cc; text-align: center; margin-bottom: 30px;'>🎉 ¡Excelentes Noticias!</h1>
                    <p>Hola {{ user_first_name }},</p>
                    <p>¡Increíbles noticias! <strong>{{ content_title }}</strong> ya está disponible en {{ service_name }}!</p>
                    <p>Este es exactamente el tipo de contenido emocionante que has estado esperando.</p>
                    
                    {% if content_rating or release_year or content_genres %}
                    <div style='background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;'>
                        {% if content_rating %}
                        <p style='margin: 5px 0;'><strong>Calificación:</strong> {{ content_rating }}/10</p>
                        {% endif %}
                        {% if release_year %}
                        <p style='margin: 5px 0;'><strong>Año:</strong> {{ release_year }}</p>
                        {% endif %}
                        {% if runtime_formatted %}
                        <p style='margin: 5px 0;'><strong>Duración:</strong> {{ runtime_formatted }}</p>
                        {% endif %}
                        {% if genres_text %}
                        <p style='margin: 5px 0;'><strong>Géneros:</strong> {{ genres_text }}</p>
                        {% endif %}
                    </div>
                    {% endif %}
                    
                    {% if content_overview %}
                    <p style='font-style: italic; color: #666;'>{{ content_overview }}</p>
                    {% endif %}
                    
                    <div style='text-align: center; margin: 30px 0;'>
                        <a href='#' style='background: #0066cc; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;'>Ver Ahora en {{ service_name }}</a>
                    </div>
                    
                    <p>¡Feliz streaming!</p>
                    <p>El Equipo de GeoLeap</p>
                </div>
            </div>
        </body>
        </html>",
        "fr-FR" => @"
        <html>
        <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
            <div style='max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;'>
                <div style='background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);'>
                    <h1 style='color: #0066cc; text-align: center; margin-bottom: 30px;'>🎉 Excellentes Nouvelles !</h1>
                    <p>Bonjour {{ user_first_name }},</p>
                    <p>Fantastiques nouvelles ! <strong>{{ content_title }}</strong> est maintenant disponible sur {{ service_name }} !</p>
                    <p>C'est exactement le type de contenu passionnant que vous attendiez.</p>
                    
                    {% if content_rating or release_year or content_genres %}
                    <div style='background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;'>
                        {% if content_rating %}
                        <p style='margin: 5px 0;'><strong>Note :</strong> {{ content_rating }}/10</p>
                        {% endif %}
                        {% if release_year %}
                        <p style='margin: 5px 0;'><strong>Année :</strong> {{ release_year }}</p>
                        {% endif %}
                        {% if runtime_formatted %}
                        <p style='margin: 5px 0;'><strong>Durée :</strong> {{ runtime_formatted }}</p>
                        {% endif %}
                        {% if genres_text %}
                        <p style='margin: 5px 0;'><strong>Genres :</strong> {{ genres_text }}</p>
                        {% endif %}
                    </div>
                    {% endif %}
                    
                    {% if content_overview %}
                    <p style='font-style: italic; color: #666;'>{{ content_overview }}</p>
                    {% endif %}
                    
                    <div style='text-align: center; margin: 30px 0;'>
                        <a href='#' style='background: #0066cc; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;'>Regarder Maintenant sur {{ service_name }}</a>
                    </div>
                    
                    <p>Bon streaming !</p>
                    <p>L'Équipe GeoLeap</p>
                </div>
            </div>
        </body>
        </html>",
        _ => GetContentAvailableHtmlTemplate("en-US")
    };
    private string GetContentAvailablePlainTextTemplate(string language) => GetContentLeavingPlainTextTemplate(language);
    private string GetRegionalAvailabilityHtmlTemplate(string language) => GetContentLeavingHtmlTemplate(language);
    private string GetRegionalAvailabilityPlainTextTemplate(string language) => GetContentLeavingPlainTextTemplate(language);
    private string GetContentExpiringHtmlTemplate(string language) => language switch
    {
        "en-US" => @"
        <html>
        <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
            <div style='max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;'>
                <div style='background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);'>
                    {% assign urgency = urgency_level | default: 'normal' %}
                    {% assign days = days_until_removal | default: 0 %}
                    {% assign is_urgent = false %}
                    {% if urgency == 'urgent' or urgency == 'high' or days <= 1 %}
                        {% assign is_urgent = true %}
                    {% endif %}

                    {% if is_urgent %}
                    <div style='background: #ff4444; color: white; padding: 15px; border-radius: 5px; text-align: center; margin-bottom: 20px;'>
                        <h1 style='color: white; margin: 0;'>⚠️ URGENT: Content Expiring Soon!</h1>
                    </div>
                    {% else %}
                    <h1 style='color: #ff6b35; text-align: center; margin-bottom: 30px;'>⏰ Content Expiring Soon</h1>
                    {% endif %}

                    <p>Hi {{ user_first_name }},</p>

                    {% if is_urgent %}
                    <p style='color: #ff4444; font-weight: bold;'>This is an urgent notification!</p>
                    <p><strong style='color: #ff4444;'>{{ content_title }}</strong> is leaving {{ service_name }} <strong>very soon</strong>!</p>
                    {% if days == 1 %}
                    <p style='background: #fff3cd; padding: 10px; border-left: 4px solid #ffc107;'><strong>Only 24 hours left to watch!</strong></p>
                    {% elsif days == 0 %}
                    <p style='background: #f8d7da; padding: 10px; border-left: 4px solid #dc3545;'><strong>Expires today!</strong></p>
                    {% endif %}
                    {% else %}
                    <p><strong>{{ content_title }}</strong> is leaving {{ service_name }} in {{ days }} day{% if days != 1 %}s{% endif %}.</p>
                    {% endif %}

                    {% if content_rating or release_year or content_genres %}
                    <div style='background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;'>
                        {% if content_rating %}
                        <p style='margin: 5px 0;'><strong>Rating:</strong> {{ content_rating }}/10</p>
                        {% endif %}
                        {% if release_year %}
                        <p style='margin: 5px 0;'><strong>Year:</strong> {{ release_year }}</p>
                        {% endif %}
                        {% if runtime_formatted %}
                        <p style='margin: 5px 0;'><strong>Runtime:</strong> {{ runtime_formatted }}</p>
                        {% endif %}
                        {% if genres_text %}
                        <p style='margin: 5px 0;'><strong>Genres:</strong> {{ genres_text }}</p>
                        {% endif %}
                    </div>
                    {% endif %}

                    {% if content_overview %}
                    <p style='font-style: italic; color: #666;'>{{ content_overview }}</p>
                    {% endif %}

                    {% if include_images and poster_url %}
                    <div style='text-align: center; margin: 20px 0;'>
                        <img src='{{ poster_url }}' alt='{{ content_title }} poster' style='max-width: 300px; height: auto; border-radius: 5px;'>
                    </div>
                    {% endif %}

                    <div style='text-align: center; margin: 30px 0;'>
                        {% if is_urgent %}
                        <a href='#' style='background: #ff4444; color: #fff; padding: 15px 40px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold; animation: pulse 2s infinite;'>🚨 WATCH NOW - URGENT!</a>
                        {% else %}
                        <a href='#' style='background: #ff6b35; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;'>Watch Now on {{ service_name }}</a>
                        {% endif %}
                    </div>

                    {% if is_urgent %}
                    <p style='color: #ff4444; font-weight: bold; text-align: center;'>Don't miss out - act now!</p>
                    {% else %}
                    <p>Don't miss out - add it to your watch queue!</p>
                    {% endif %}

                    <p>The GeoLeap Team</p>
                </div>
            </div>
        </body>
        </html>",
        _ => GetContentExpiringHtmlTemplate("en-US")
    };
    private string GetContentExpiringPlainTextTemplate(string language) => GetContentLeavingPlainTextTemplate(language);
    private string GetWeeklyDigestHtmlTemplate(string language) => language switch
    {
        "en-US" => @"
        <html>
        <body style='font-family: Arial, sans-serif; line-height: 1.6; color: #333;'>
            <div style='max-width: 600px; margin: 0 auto; padding: 20px; background: #f9f9f9;'>
                <div style='background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);'>
                    <h1 style='color: #0066cc; text-align: center; margin-bottom: 30px;'>📺 Your Weekly GeoLeap Digest</h1>
                    <p>Hi {{ user_first_name }},</p>
                    <p>Here's your weekly roundup of streaming updates from {{ week_start | date: '%B %d' }} to {{ week_end | date: '%B %d' }}!</p>
                    
                    <!-- New Available Content Section -->
                    {% if new_content and new_content.size > 0 %}
                    <div style='background: #e8f5e8; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 5px solid #28a745;'>
                        <h2 style='color: #28a745; margin-top: 0;'>🎉 New Available Content</h2>
                        <p>{{ new_content.size }} new title{% if new_content.size != 1 %}s{% endif %} became available this week:</p>
                        <ul style='list-style: none; padding: 0;'>
                        {% for item in new_content limit: 5 %}
                            <li style='margin: 10px 0; padding: 10px; background: white; border-radius: 5px;'>
                                <strong>{{ item.title }}</strong> 
                                {% if item.rating %} - ⭐ {{ item.rating }}/10{% endif %}
                                {% if item.service %}<br><small style='color: #666;'>Available on {{ item.service }}</small>{% endif %}
                            </li>
                        {% endfor %}
                        {% if new_content.size > 5 %}
                            <li style='margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 5px; text-align: center;'>
                                <em>And {{ new_content.size | minus: 5 }} more...</em>
                            </li>
                        {% endif %}
                        </ul>
                    </div>
                    {% endif %}
                    
                    <!-- Price Drops Section -->
                    {% if price_drops and price_drops.size > 0 %}
                    <div style='background: #fff3cd; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 5px solid #ffc107;'>
                        <h2 style='color: #856404; margin-top: 0;'>💰 Price Drops & Deals</h2>
                        <p>Great deals this week:</p>
                        <ul style='list-style: none; padding: 0;'>
                        {% for deal in price_drops limit: 3 %}
                            <li style='margin: 10px 0; padding: 10px; background: white; border-radius: 5px;'>
                                <strong>{{ deal.title }}</strong><br>
                                <span style='text-decoration: line-through; color: #999;'>${{ deal.old_price }}</span> 
                                <span style='color: #28a745; font-weight: bold;'>${{ deal.new_price }}</span>
                                <small style='color: #666;'> on {{ deal.service }}</small>
                            </li>
                        {% endfor %}
                        </ul>
                    </div>
                    {% endif %}
                    
                    <!-- Leaving Soon Section -->
                    {% if leaving_soon and leaving_soon.size > 0 %}
                    <div style='background: #f8d7da; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 5px solid #dc3545;'>
                        <h2 style='color: #721c24; margin-top: 0;'>⚠️ Leaving Soon</h2>
                        <p>Don't miss these titles leaving streaming services:</p>
                        <ul style='list-style: none; padding: 0;'>
                        {% for item in leaving_soon limit: 3 %}
                            <li style='margin: 10px 0; padding: 10px; background: white; border-radius: 5px;'>
                                <strong>{{ item.title }}</strong><br>
                                <small style='color: #721c24;'>Leaves {{ item.service }} in {{ item.days_remaining }} day{% if item.days_remaining != 1 %}s{% endif %}</small>
                            </li>
                        {% endfor %}
                        </ul>
                    </div>
                    {% endif %}
                    
                    <!-- User Stats Section -->
                    {% if user_stats %}
                    <div style='background: #d1ecf1; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 5px solid #0066cc;'>
                        <h2 style='color: #0c5460; margin-top: 0;'>📊 Your Stats</h2>
                        <div style='display: flex; justify-content: space-around; text-align: center;'>
                            {% if user_stats.total_items %}
                            <div>
                                <div style='font-size: 24px; font-weight: bold; color: #0066cc;'>{{ user_stats.total_items }}</div>
                                <div style='font-size: 12px; color: #666;'>Total Items</div>
                            </div>
                            {% endif %}
                            {% if user_stats.watched_items %}
                            <div>
                                <div style='font-size: 24px; font-weight: bold; color: #28a745;'>{{ user_stats.watched_items }}</div>
                                <div style='font-size: 12px; color: #666;'>Watched</div>
                            </div>
                            {% endif %}
                            {% if user_stats.available_items %}
                            <div>
                                <div style='font-size: 24px; font-weight: bold; color: #ffc107;'>{{ user_stats.available_items }}</div>
                                <div style='font-size: 12px; color: #666;'>Available</div>
                            </div>
                            {% endif %}
                        </div>
                        {% if user_stats.most_watched_genres %}
                        <p style='margin-top: 15px; font-size: 14px;'><strong>Top Genres:</strong> {{ user_stats.most_watched_genres | join: ', ' }}</p>
                        {% endif %}
                    </div>
                    {% endif %}
                    
                    <div style='text-align: center; margin: 30px 0;'>
                        <a href='#' style='background: #0066cc; color: #fff; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;'>View Full Dashboard</a>
                    </div>
                    
                    <p>Happy streaming!</p>
                    <p>The GeoLeap Team</p>
                    
                    <hr style='border: 1px solid #eee; margin: 20px 0;'>
                    <p style='font-size: 12px; color: #666; text-align: center;'>
                        You're receiving this because you have weekly digest notifications enabled.<br>
                        <a href='#' style='color: #0066cc;'>Update preferences</a> | <a href='#' style='color: #0066cc;'>Unsubscribe</a>
                    </p>
                </div>
            </div>
        </body>
        </html>",
        _ => GetWeeklyDigestHtmlTemplate("en-US")
    };
    private string GetWeeklyDigestPlainTextTemplate(string language) => GetContentLeavingPlainTextTemplate(language);
    private string GetMonthlyDigestHtmlTemplate(string language) => GetContentLeavingHtmlTemplate(language);
    private string GetMonthlyDigestPlainTextTemplate(string language) => GetContentLeavingPlainTextTemplate(language);
    private string GetPersonalizedRecommendationsHtmlTemplate(string language) => GetContentLeavingHtmlTemplate(language);
    private string GetPersonalizedRecommendationsPlainTextTemplate(string language) => GetContentLeavingPlainTextTemplate(language);
    private string GetPasswordResetHtmlTemplate(string language) => GetContentLeavingHtmlTemplate(language);
    private string GetPasswordResetPlainTextTemplate(string language) => GetContentLeavingPlainTextTemplate(language);
    private string GetEmailVerificationHtmlTemplate(string language) => GetContentLeavingHtmlTemplate(language);
    private string GetEmailVerificationPlainTextTemplate(string language) => GetContentLeavingPlainTextTemplate(language);

    #endregion
}

/// <summary>
/// Custom DotLiquid filters for template processing
/// </summary>
public static class TemplateFilters
{
    public static string Capitalize(string input)
    {
        if (string.IsNullOrEmpty(input)) return input;
        return char.ToUpper(input[0]) + input.Substring(1).ToLower();
    }

    public static string Truncate(string input, int length)
    {
        if (string.IsNullOrEmpty(input) || input.Length <= length)
            return input;
        return input.Substring(0, length) + "...";
    }

    public static string Default(string input, string defaultValue)
    {
        return string.IsNullOrEmpty(input) ? defaultValue : input;
    }

    public static string FormatCurrency(decimal amount, string currency = "USD")
    {
        return currency switch
        {
            "EUR" => $"€{amount:F2}",
            "GBP" => $"£{amount:F2}",
            _ => $"${amount:F2}"
        };
    }
}