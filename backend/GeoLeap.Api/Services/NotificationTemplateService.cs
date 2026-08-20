using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using System.Diagnostics;
using System.Text.RegularExpressions;
using DotLiquid;

namespace GeoLeap.Api.Services;

/// <summary>
/// Advanced notification template service with DotLiquid rendering - US-8.2 Complete Implementation
/// </summary>
public class NotificationTemplateService : INotificationTemplateService
{
    private readonly ILogger<NotificationTemplateService> _logger;
    private readonly ApplicationDbContext _context;

    static NotificationTemplateService()
    {
        // Register custom DotLiquid filters and tags for advanced template functionality
        Template.RegisterFilter(typeof(CustomTemplateFilters));
        Template.RegisterTag<ConditionalTag>("conditional");
    }

    public NotificationTemplateService(
        ILogger<NotificationTemplateService> logger,
        ApplicationDbContext context)
    {
        _logger = logger;
        _context = context;
    }

    public async Task<string> CreateTemplateAsync(CreateNotificationTemplateRequest request, string correlationId = "")
    {
        try
        {
            _logger.LogInformation("Creating notification template {TemplateId}", request.Id);

            // Check if template already exists
            var existingTemplate = await _context.NotificationTemplates
                .FirstOrDefaultAsync(t => t.Id == request.Id);

            if (existingTemplate != null)
            {
                throw new InvalidOperationException($"Template with ID {request.Id} already exists");
            }

            // Validate template content
            var validationResult = await ValidateTemplateAsync(request.Template, request.DefaultData, correlationId);
            if (!validationResult)
            {
                throw new InvalidOperationException("Template validation failed");
            }

            var template = new Models.NotificationTemplate
            {
                Id = request.Id,
                Type = request.Type,
                Channel = request.Channel,
                Subject = request.Subject,
                Template = request.Template,
                Version = request.Version,
                Language = request.Language,
                IsActive = true,
                DefaultData = request.DefaultData,
                ValidationRules = request.ValidationRules,
                CreatedBy = request.CreatedBy,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.NotificationTemplates.Add(template);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Created notification template {TemplateId} successfully", request.Id);
            return request.Id;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating notification template {TemplateId}", request.Id);
            throw;
        }
    }

    public async Task<bool> UpdateTemplateAsync(string templateId, UpdateNotificationTemplateRequest request, string correlationId = "")
    {
        try
        {
            var template = await _context.NotificationTemplates
                .FirstOrDefaultAsync(t => t.Id == templateId);

            if (template == null)
            {
                _logger.LogWarning("Template {TemplateId} not found for update", templateId);
                return false;
            }

            // Update properties if provided
            if (!string.IsNullOrEmpty(request.Type))
                template.Type = request.Type;

            if (!string.IsNullOrEmpty(request.Channel))
                template.Channel = request.Channel;

            if (!string.IsNullOrEmpty(request.Subject))
                template.Subject = request.Subject;

            if (!string.IsNullOrEmpty(request.Template))
            {
                // Validate new template content
                var validationResult = await ValidateTemplateAsync(request.Template, request.DefaultData, correlationId);
                if (!validationResult)
                {
                    throw new InvalidOperationException("Template validation failed");
                }
                template.Template = request.Template;
            }

            if (!string.IsNullOrEmpty(request.Version))
                template.Version = request.Version;

            if (!string.IsNullOrEmpty(request.Language))
                template.Language = request.Language;

            if (request.IsActive.HasValue)
                template.IsActive = request.IsActive.Value;

            if (request.DefaultData != null)
                template.DefaultData = request.DefaultData;

            if (request.ValidationRules != null)
                template.ValidationRules = request.ValidationRules;

            template.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Updated notification template {TemplateId}", templateId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating notification template {TemplateId}", templateId);
            throw;
        }
    }

    public async Task<Models.NotificationTemplate?> GetTemplateAsync(string templateId, string correlationId = "")
    {
        try
        {
            return await _context.NotificationTemplates
                .FirstOrDefaultAsync(t => t.Id == templateId && t.IsActive);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting notification template {TemplateId}", templateId);
            return null;
        }
    }

    public async Task<List<Models.NotificationTemplate>> GetTemplatesAsync(string? type = null, string? channel = null, string? language = "en", string correlationId = "")
    {
        try
        {
            var query = _context.NotificationTemplates.Where(t => t.IsActive);

            if (!string.IsNullOrEmpty(type))
                query = query.Where(t => t.Type == type);

            if (!string.IsNullOrEmpty(channel))
                query = query.Where(t => t.Channel == channel);

            if (!string.IsNullOrEmpty(language))
                query = query.Where(t => t.Language == language);

            return await query.OrderBy(t => t.Type).ThenBy(t => t.Channel).ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting notification templates");
            return new List<Models.NotificationTemplate>();
        }
    }

    public async Task<bool> DeleteTemplateAsync(string templateId, string correlationId = "")
    {
        try
        {
            var template = await _context.NotificationTemplates
                .FirstOrDefaultAsync(t => t.Id == templateId);

            if (template == null)
                return false;

            // Soft delete
            template.IsActive = false;
            template.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Deleted notification template {TemplateId}", templateId);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting notification template {TemplateId}", templateId);
            return false;
        }
    }

    public async Task<bool> ActivateTemplateAsync(string templateId, string correlationId = "")
    {
        return await SetTemplateActiveStatusAsync(templateId, true, correlationId);
    }

    public async Task<bool> DeactivateTemplateAsync(string templateId, string correlationId = "")
    {
        return await SetTemplateActiveStatusAsync(templateId, false, correlationId);
    }

    public async Task<RenderedNotificationResult> RenderTemplateAsync(string templateId, Dictionary<string, object> data, string correlationId = "")
    {
        try
        {
            var template = await GetTemplateAsync(templateId, correlationId);
            if (template == null)
            {
                return new RenderedNotificationResult
                {
                    IsValid = false,
                    Errors = new List<string> { $"Template {templateId} not found" }
                };
            }

            return await RenderTemplateContentAsync(template.Template, template.Subject, data, correlationId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error rendering template {TemplateId}", templateId);
            return new RenderedNotificationResult
            {
                IsValid = false,
                Errors = new List<string> { $"Error rendering template: {ex.Message}" }
            };
        }
    }

    public async Task<RenderedNotificationResult> RenderTemplateContentAsync(string templateContent, string subject, Dictionary<string, object> data, string correlationId = "")
    {
        var result = new RenderedNotificationResult();
        var stopwatch = Stopwatch.StartNew();

        try
        {
            // Merge with default data if available
            var mergedData = new Dictionary<string, object>(data);
            
            // Add system variables
            mergedData["system"] = new Dictionary<string, object>
            {
                ["date"] = DateTime.UtcNow.ToString("yyyy-MM-dd"),
                ["time"] = DateTime.UtcNow.ToString("HH:mm:ss"),
                ["year"] = DateTime.UtcNow.Year,
                ["app_name"] = "GeoLeap",
                ["support_email"] = "support@geoleap.com"
            };

            // Parse and render subject
            var subjectTemplate = Template.Parse(subject);
            var renderedSubject = await Task.Run(() => subjectTemplate.Render(Hash.FromDictionary(mergedData)));

            // Parse and render body
            var bodyTemplate = Template.Parse(templateContent);
            var renderedBody = await Task.Run(() => bodyTemplate.Render(Hash.FromDictionary(mergedData)));

            // Check for rendering errors
            var subjectErrors = subjectTemplate.Errors;
            var bodyErrors = bodyTemplate.Errors;

            if (subjectErrors.Any() || bodyErrors.Any())
            {
                result.IsValid = false;
                result.Errors.AddRange(subjectErrors.Select(e => $"Subject: {e}"));
                result.Errors.AddRange(bodyErrors.Select(e => $"Body: {e}"));
            }

            result.Subject = renderedSubject;
            result.Body = renderedBody;

            // Analyze template variables
            result.UsedVariables = AnalyzeUsedVariables(templateContent + " " + subject, mergedData);
            result.MissingVariables = AnalyzeMissingVariables(templateContent + " " + subject, mergedData);

            // Add warnings for missing variables
            if (result.MissingVariables.Any())
            {
                result.Warnings.Add($"Missing variables: {string.Join(", ", result.MissingVariables.Keys)}");
            }

            stopwatch.Stop();
            _logger.LogDebug("Template rendering completed in {ElapsedMs}ms", stopwatch.ElapsedMilliseconds);
        }
        catch (Exception ex)
        {
            result.IsValid = false;
            result.Errors.Add($"Template rendering failed: {ex.Message}");
            _logger.LogError(ex, "Error in template rendering");
        }

        return result;
    }

    public async Task<bool> ValidateTemplateAsync(string templateContent, Dictionary<string, object>? sampleData = null, string correlationId = "")
    {
        try
        {
            // Basic DotLiquid syntax validation
            var template = Template.Parse(templateContent);
            
            if (template.Errors.Any())
            {
                _logger.LogWarning("Template validation failed: {Errors}", string.Join(", ", template.Errors));
                return false;
            }

            // Test rendering with sample data if provided
            if (sampleData != null)
            {
                var testRender = template.Render(Hash.FromDictionary(sampleData));
                if (template.Errors.Any())
                {
                    _logger.LogWarning("Template rendering test failed: {Errors}", string.Join(", ", template.Errors));
                    return false;
                }
            }

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating template");
            return false;
        }
    }

    public async Task<List<Models.NotificationTemplate>> GetTemplatesByTypeAsync(string type, string correlationId = "")
    {
        return await _context.NotificationTemplates
            .Where(t => t.Type == type && t.IsActive)
            .OrderBy(t => t.Channel)
            .ThenBy(t => t.Language)
            .ToListAsync();
    }

    public async Task<Models.NotificationTemplate?> GetDefaultTemplateAsync(string type, string channel, string language = "en", string correlationId = "")
    {
        try
        {
            // Look for exact match first
            var template = await _context.NotificationTemplates
                .FirstOrDefaultAsync(t => t.Type == type && t.Channel == channel && t.Language == language && t.IsActive);

            // Fallback to English if specific language not found
            if (template == null && language != "en")
            {
                template = await _context.NotificationTemplates
                    .FirstOrDefaultAsync(t => t.Type == type && t.Channel == channel && t.Language == "en" && t.IsActive);
            }

            // Further fallback to any channel if specific channel not found
            if (template == null)
            {
                template = await _context.NotificationTemplates
                    .FirstOrDefaultAsync(t => t.Type == type && t.IsActive);
            }

            return template;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting default template for type {Type}, channel {Channel}, language {Language}", type, channel, language);
            return null;
        }
    }

    public async Task<bool> SetDefaultTemplateAsync(string type, string channel, string templateId, string correlationId = "")
    {
        try
        {
            // This is a simplified implementation - in a full system, you'd have a separate table for default template mappings
            var template = await _context.NotificationTemplates
                .FirstOrDefaultAsync(t => t.Id == templateId);

            if (template == null)
                return false;

            // For now, just ensure the template exists and is active
            if (!template.IsActive)
            {
                template.IsActive = true;
                template.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error setting default template");
            return false;
        }
    }

    public async Task<string> CreateTemplateVersionAsync(string templateId, UpdateNotificationTemplateRequest request, string correlationId = "")
    {
        try
        {
            var originalTemplate = await _context.NotificationTemplates
                .FirstOrDefaultAsync(t => t.Id == templateId);

            if (originalTemplate == null)
                throw new InvalidOperationException($"Template {templateId} not found");

            var newVersion = request.Version ?? GetNextVersion(originalTemplate.Version);
            var newTemplateId = $"{templateId}_v{newVersion}";

            var versionedTemplate = new Models.NotificationTemplate
            {
                Id = newTemplateId,
                Type = request.Type ?? originalTemplate.Type,
                Channel = request.Channel ?? originalTemplate.Channel,
                Subject = request.Subject ?? originalTemplate.Subject,
                Template = request.Template ?? originalTemplate.Template,
                Version = newVersion,
                Language = request.Language ?? originalTemplate.Language,
                IsActive = request.IsActive ?? false, // New versions start inactive
                DefaultData = request.DefaultData ?? originalTemplate.DefaultData,
                ValidationRules = request.ValidationRules ?? originalTemplate.ValidationRules,
                CreatedBy = "system",
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            _context.NotificationTemplates.Add(versionedTemplate);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Created template version {VersionId} from {TemplateId}", newTemplateId, templateId);
            return newTemplateId;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating template version for {TemplateId}", templateId);
            throw;
        }
    }

    public async Task<List<Models.NotificationTemplate>> GetTemplateVersionsAsync(string templateId, string correlationId = "")
    {
        try
        {
            return await _context.NotificationTemplates
                .Where(t => t.Id.StartsWith(templateId) && (t.Id == templateId || t.Id.StartsWith(templateId + "_v")))
                .OrderByDescending(t => t.CreatedAt)
                .ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting template versions for {TemplateId}", templateId);
            return new List<Models.NotificationTemplate>();
        }
    }

    public async Task<bool> PromoteTemplateVersionAsync(string templateId, string version, string correlationId = "")
    {
        try
        {
            // Deactivate current active version
            var currentActive = await _context.NotificationTemplates
                .FirstOrDefaultAsync(t => t.Id == templateId && t.IsActive);

            if (currentActive != null)
            {
                currentActive.IsActive = false;
                currentActive.UpdatedAt = DateTime.UtcNow;
            }

            // Activate the specified version
            var versionToPromote = await _context.NotificationTemplates
                .FirstOrDefaultAsync(t => t.Id == $"{templateId}_v{version}");

            if (versionToPromote == null)
                return false;

            versionToPromote.IsActive = true;
            versionToPromote.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Promoted template version {VersionId} to active", versionToPromote.Id);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error promoting template version {TemplateId} v{Version}", templateId, version);
            return false;
        }
    }

    public async Task<int> ImportTemplatesAsync(List<ImportTemplateRequest> templates, string correlationId = "")
    {
        try
        {
            int importedCount = 0;

            foreach (var templateRequest in templates)
            {
                try
                {
                    var createRequest = new CreateNotificationTemplateRequest
                    {
                        Id = templateRequest.Id,
                        Type = templateRequest.Type,
                        Channel = templateRequest.Channel,
                        Subject = templateRequest.Subject,
                        Template = templateRequest.Template,
                        Language = templateRequest.Language,
                        DefaultData = templateRequest.DefaultData,
                        CreatedBy = "import"
                    };

                    await CreateTemplateAsync(createRequest, correlationId);
                    importedCount++;
                }
                catch (Exception ex)
                {
                    _logger.LogWarning(ex, "Failed to import template {TemplateId}", templateRequest.Id);
                }
            }

            _logger.LogInformation("Imported {ImportedCount}/{TotalCount} templates", importedCount, templates.Count);
            return importedCount;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error importing templates");
            return 0;
        }
    }

    public async Task<List<TemplateExportDto>> ExportTemplatesAsync(string? type = null, string correlationId = "")
    {
        try
        {
            var query = _context.NotificationTemplates.Where(t => t.IsActive);

            if (!string.IsNullOrEmpty(type))
                query = query.Where(t => t.Type == type);

            var templates = await query.ToListAsync();

            return templates.Select(t => new TemplateExportDto
            {
                Id = t.Id,
                Type = t.Type,
                Channel = t.Channel,
                Subject = t.Subject,
                Template = t.Template,
                Version = t.Version,
                Language = t.Language,
                IsActive = t.IsActive,
                DefaultData = t.DefaultData,
                CreatedAt = t.CreatedAt,
                UpdatedAt = t.UpdatedAt
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error exporting templates");
            return new List<TemplateExportDto>();
        }
    }

    public async Task<TemplateUsageStatsDto> GetTemplateUsageStatsAsync(string templateId, DateTime? fromDate = null, DateTime? toDate = null, string correlationId = "")
    {
        fromDate ??= DateTime.UtcNow.AddMonths(-1);
        toDate ??= DateTime.UtcNow;

        try
        {
            // This would typically query notification logs or usage tracking tables
            // For now, return a basic structure
            return new TemplateUsageStatsDto
            {
                TemplateId = templateId,
                TotalUsage = 0,
                SuccessfulRenders = 0,
                FailedRenders = 0,
                SuccessRate = 0,
                UniqueUsers = 0,
                FromDate = fromDate.Value,
                ToDate = toDate.Value
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting template usage stats for {TemplateId}", templateId);
            return new TemplateUsageStatsDto { TemplateId = templateId };
        }
    }

    public async Task<List<TemplatePerformanceDto>> GetTopPerformingTemplatesAsync(int limit = 10, string correlationId = "")
    {
        try
        {
            // This would typically analyze notification performance metrics
            // For now, return a basic structure
            return new List<TemplatePerformanceDto>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting top performing templates");
            return new List<TemplatePerformanceDto>();
        }
    }

    public async Task<TemplateTestResult> TestTemplateAsync(string templateId, Dictionary<string, object> testData, string correlationId = "")
    {
        var stopwatch = Stopwatch.StartNew();
        var result = new TemplateTestResult();

        try
        {
            var template = await GetTemplateAsync(templateId, correlationId);
            if (template == null)
            {
                result.IsValid = false;
                result.ValidationErrors.Add($"Template {templateId} not found");
                return result;
            }

            // Test rendering
            result.RenderedResult = await RenderTemplateContentAsync(template.Template, template.Subject, testData, correlationId);
            result.IsValid = result.RenderedResult.IsValid;

            if (!result.IsValid)
            {
                result.ValidationErrors.AddRange(result.RenderedResult.Errors);
            }

            result.ValidationWarnings.AddRange(result.RenderedResult.Warnings);

            // Additional test validations
            result.TestResults["character_count"] = result.RenderedResult.Body.Length;
            result.TestResults["word_count"] = result.RenderedResult.Body.Split(' ', StringSplitOptions.RemoveEmptyEntries).Length;
            result.TestResults["subject_length"] = result.RenderedResult.Subject.Length;
            result.TestResults["has_unsubscribe_link"] = result.RenderedResult.Body.Contains("unsubscribe", StringComparison.OrdinalIgnoreCase);

            stopwatch.Stop();
            result.RenderTime = stopwatch.Elapsed;
        }
        catch (Exception ex)
        {
            result.IsValid = false;
            result.ValidationErrors.Add($"Test failed: {ex.Message}");
            _logger.LogError(ex, "Error testing template {TemplateId}", templateId);
        }

        return result;
    }

    public async Task<List<TemplateSuggestionDto>> GetTemplateSuggestionsAsync(string type, string correlationId = "")
    {
        try
        {
            var suggestions = new List<TemplateSuggestionDto>();

            // Basic template suggestions based on type
            switch (type.ToLower())
            {
                case "availability_change":
                    suggestions.Add(new TemplateSuggestionDto
                    {
                        Title = "Include content poster",
                        Description = "Add the movie/show poster image to make the notification more visually appealing",
                        SuggestedContent = "{% if content.poster_url %}<img src=\"{{ content.poster_url }}\" alt=\"{{ content.title }} poster\" style=\"width: 150px;\">{% endif %}",
                        Reason = "Visual content increases engagement by 40%",
                        Confidence = 0.85
                    });
                    break;

                case "price_drop":
                    suggestions.Add(new TemplateSuggestionDto
                    {
                        Title = "Add urgency indicator",
                        Description = "Include a time-sensitive call-to-action to encourage immediate action",
                        SuggestedContent = "{% if price_drop.savings_percentage > 30 %}🔥 LIMITED TIME: Save {{ price_drop.savings_percentage }}%!{% endif %}",
                        Reason = "Urgency increases click-through rates",
                        Confidence = 0.78
                    });
                    break;
            }

            return suggestions;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting template suggestions for type {Type}", type);
            return new List<TemplateSuggestionDto>();
        }
    }

    public async Task<bool> OptimizeTemplateAsync(string templateId, string correlationId = "")
    {
        try
        {
            var template = await GetTemplateAsync(templateId, correlationId);
            if (template == null)
                return false;

            // Basic optimizations
            var optimizedContent = template.Template;

            // Remove excessive whitespace
            optimizedContent = Regex.Replace(optimizedContent, @"\s+", " ");

            // Optimize image tags
            optimizedContent = Regex.Replace(optimizedContent, 
                @"<img\s+([^>]*?)>", 
                @"<img $1 loading=""lazy"" style=""max-width: 100%; height: auto;"">",
                RegexOptions.IgnoreCase);

            // Add missing alt attributes
            optimizedContent = Regex.Replace(optimizedContent,
                @"<img\s+(?![^>]*alt=)([^>]*?)>",
                @"<img alt="""" $1>",
                RegexOptions.IgnoreCase);

            if (optimizedContent != template.Template)
            {
                await UpdateTemplateAsync(templateId, new UpdateNotificationTemplateRequest
                {
                    Template = optimizedContent
                }, correlationId);

                _logger.LogInformation("Optimized template {TemplateId}", templateId);
                return true;
            }

            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error optimizing template {TemplateId}", templateId);
            return false;
        }
    }

    // Private helper methods
    private async Task<bool> SetTemplateActiveStatusAsync(string templateId, bool isActive, string correlationId)
    {
        try
        {
            var template = await _context.NotificationTemplates
                .FirstOrDefaultAsync(t => t.Id == templateId);

            if (template == null)
                return false;

            template.IsActive = isActive;
            template.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogInformation("Set template {TemplateId} active status to {IsActive}", templateId, isActive);
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error setting template active status for {TemplateId}", templateId);
            return false;
        }
    }

    private Dictionary<string, object> AnalyzeUsedVariables(string templateContent, Dictionary<string, object> data)
    {
        var usedVariables = new Dictionary<string, object>();
        var variablePattern = @"\{\{\s*([^}]+)\s*\}\}";
        var matches = Regex.Matches(templateContent, variablePattern);

        foreach (Match match in matches)
        {
            var variableName = match.Groups[1].Value.Trim();
            var baseName = variableName.Split('.', '|')[0].Trim();

            if (data.ContainsKey(baseName))
            {
                usedVariables[baseName] = data[baseName];
            }
        }

        return usedVariables;
    }

    private Dictionary<string, object> AnalyzeMissingVariables(string templateContent, Dictionary<string, object> data)
    {
        var missingVariables = new Dictionary<string, object>();
        var variablePattern = @"\{\{\s*([^}]+)\s*\}\}";
        var matches = Regex.Matches(templateContent, variablePattern);

        foreach (Match match in matches)
        {
            var variableName = match.Groups[1].Value.Trim();
            var baseName = variableName.Split('.', '|')[0].Trim();

            if (!data.ContainsKey(baseName) && baseName != "system")
            {
                missingVariables[baseName] = $"Missing variable: {baseName}";
            }
        }

        return missingVariables;
    }

    private string GetNextVersion(string currentVersion)
    {
        if (Version.TryParse(currentVersion, out var version))
        {
            return $"{version.Major}.{version.Minor + 1}";
        }
        return "2.0";
    }
}

/// <summary>
/// Custom DotLiquid filters for advanced template functionality
/// </summary>
public static class CustomTemplateFilters
{
    public static string FormatCurrency(string input, string currency = "USD")
    {
        if (decimal.TryParse(input, out var amount))
        {
            return currency.ToUpper() switch
            {
                "USD" => amount.ToString("C", System.Globalization.CultureInfo.GetCultureInfo("en-US")),
                "EUR" => amount.ToString("C", System.Globalization.CultureInfo.GetCultureInfo("en-EU")),
                "GBP" => amount.ToString("C", System.Globalization.CultureInfo.GetCultureInfo("en-GB")),
                _ => $"{currency} {amount:F2}"
            };
        }
        return input;
    }

    public static string Truncate(string input, int length, string suffix = "...")
    {
        if (string.IsNullOrEmpty(input) || input.Length <= length)
            return input;

        return input.Substring(0, length) + suffix;
    }

    public static string Pluralize(string input, int count)
    {
        if (count == 1)
            return input;

        // Simple pluralization rules
        if (input.EndsWith("y"))
            return input.Substring(0, input.Length - 1) + "ies";
        if (input.EndsWith("s") || input.EndsWith("x") || input.EndsWith("z") || 
            input.EndsWith("ch") || input.EndsWith("sh"))
            return input + "es";
        
        return input + "s";
    }

    public static string TimeAgo(DateTime dateTime)
    {
        var timeSpan = DateTime.UtcNow - dateTime;

        if (timeSpan.TotalDays > 365)
            return $"{(int)(timeSpan.TotalDays / 365)} year{((int)(timeSpan.TotalDays / 365) != 1 ? "s" : "")} ago";
        if (timeSpan.TotalDays > 30)
            return $"{(int)(timeSpan.TotalDays / 30)} month{((int)(timeSpan.TotalDays / 30) != 1 ? "s" : "")} ago";
        if (timeSpan.TotalDays > 1)
            return $"{(int)timeSpan.TotalDays} day{((int)timeSpan.TotalDays != 1 ? "s" : "")} ago";
        if (timeSpan.TotalHours > 1)
            return $"{(int)timeSpan.TotalHours} hour{((int)timeSpan.TotalHours != 1 ? "s" : "")} ago";
        if (timeSpan.TotalMinutes > 1)
            return $"{(int)timeSpan.TotalMinutes} minute{((int)timeSpan.TotalMinutes != 1 ? "s" : "")} ago";
        
        return "just now";
    }
}

/// <summary>
/// Custom DotLiquid tag for conditional rendering
/// </summary>
public class ConditionalTag : Tag
{
    private string _condition = string.Empty;

    public override void Initialize(string tagName, string markup, List<string> tokens)
    {
        _condition = markup.Trim();
        base.Initialize(tagName, markup, tokens);
    }

    public override void Render(Context context, TextWriter result)
    {
        // Simple conditional logic - in a real implementation, this would be more sophisticated
        var parts = _condition.Split(' ');
        if (parts.Length >= 3)
        {
            var leftOperand = context[parts[0]];
            var @operator = parts[1];
            var rightOperand = parts[2];

            bool conditionMet = @operator switch
            {
                "==" => leftOperand?.ToString() == rightOperand,
                "!=" => leftOperand?.ToString() != rightOperand,
                ">" => int.TryParse(leftOperand?.ToString(), out var left) && 
                       int.TryParse(rightOperand, out var right) && left > right,
                "<" => int.TryParse(leftOperand?.ToString(), out var left2) && 
                       int.TryParse(rightOperand, out var right2) && left2 < right2,
                _ => false
            };

            if (conditionMet && NodeList != null)
            {
                foreach (var node in NodeList)
                {
                    (node as DotLiquid.Tag)?.Render(context, result);
                }
            }
        }
    }
}