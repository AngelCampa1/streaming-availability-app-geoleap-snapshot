using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using GeoLeap.Api.Services;
using GeoLeap.Api.Extensions;

namespace GeoLeap.Api.Controllers;

/// <summary>
/// Controller for managing notification templates - US-8.2 Complete Implementation
/// </summary>
[ApiController]
[Route("api/notification-templates")]
[Authorize(Roles = "Admin")]
public class NotificationTemplateController : ControllerBase
{
    private readonly INotificationTemplateService _templateService;
    private readonly ILogger<NotificationTemplateController> _logger;

    public NotificationTemplateController(
        INotificationTemplateService templateService,
        ILogger<NotificationTemplateController> logger)
    {
        _templateService = templateService;
        _logger = logger;
    }

    /// <summary>
    /// Create a new notification template
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<TemplateCreatedResponseDto>> CreateTemplateAsync([FromBody] CreateNotificationTemplateRequest request)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var templateId = await _templateService.CreateTemplateAsync(request, correlationId);

            return Ok(new TemplateCreatedResponseDto
            {
                TemplateId = templateId,
                Message = "Template created successfully"
            });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Invalid operation creating template {TemplateId}", request.Id);
            return this.StandardBadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating notification template");
            return StatusCode(500, new { message = "Internal server error" });
        }
    }

    /// <summary>
    /// Update an existing notification template
    /// </summary>
    [HttpPut("{templateId}")]
    public async Task<ActionResult> UpdateTemplateAsync(string templateId, [FromBody] UpdateNotificationTemplateRequest request)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var success = await _templateService.UpdateTemplateAsync(templateId, request, correlationId);

            if (!success)
            {
                return NotFound(new { message = "Template not found" });
            }

            return Ok(new { message = "Template updated successfully" });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Invalid operation updating template {TemplateId}", templateId);
            return this.StandardBadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating notification template {TemplateId}", templateId);
            return StatusCode(500, new { message = "Internal server error" });
        }
    }

    /// <summary>
    /// Get a specific notification template
    /// </summary>
    [HttpGet("{templateId}")]
    public async Task<ActionResult<GeoLeap.Api.Models.NotificationTemplate>> GetTemplateAsync(string templateId)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var template = await _templateService.GetTemplateAsync(templateId, correlationId);

            if (template == null)
            {
                return NotFound(new { message = "Template not found" });
            }

            return Ok(template);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting notification template {TemplateId}", templateId);
            return StatusCode(500, new { message = "Internal server error" });
        }
    }

    /// <summary>
    /// Get notification templates with optional filtering
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<List<GeoLeap.Api.Models.NotificationTemplate>>> GetTemplatesAsync(
        [FromQuery] string? type = null,
        [FromQuery] string? channel = null,
        [FromQuery] string? language = "en")
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var templates = await _templateService.GetTemplatesAsync(type, channel, language, correlationId);

            return Ok(templates);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting notification templates");
            return StatusCode(500, new { message = "Internal server error" });
        }
    }

    /// <summary>
    /// Delete (deactivate) a notification template
    /// </summary>
    [HttpDelete("{templateId}")]
    public async Task<ActionResult> DeleteTemplateAsync(string templateId)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var success = await _templateService.DeleteTemplateAsync(templateId, correlationId);

            if (!success)
            {
                return NotFound(new { message = "Template not found" });
            }

            return Ok(new { message = "Template deleted successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting notification template {TemplateId}", templateId);
            return StatusCode(500, new { message = "Internal server error" });
        }
    }

    /// <summary>
    /// Activate a notification template
    /// </summary>
    [HttpPost("{templateId}/activate")]
    public async Task<ActionResult> ActivateTemplateAsync(string templateId)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var success = await _templateService.ActivateTemplateAsync(templateId, correlationId);

            if (!success)
            {
                return NotFound(new { message = "Template not found" });
            }

            return Ok(new { message = "Template activated successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error activating notification template {TemplateId}", templateId);
            return StatusCode(500, new { message = "Internal server error" });
        }
    }

    /// <summary>
    /// Deactivate a notification template
    /// </summary>
    [HttpPost("{templateId}/deactivate")]
    public async Task<ActionResult> DeactivateTemplateAsync(string templateId)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var success = await _templateService.DeactivateTemplateAsync(templateId, correlationId);

            if (!success)
            {
                return NotFound(new { message = "Template not found" });
            }

            return Ok(new { message = "Template deactivated successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deactivating notification template {TemplateId}", templateId);
            return StatusCode(500, new { message = "Internal server error" });
        }
    }

    /// <summary>
    /// Render a template with provided data
    /// </summary>
    [HttpPost("{templateId}/render")]
    public async Task<ActionResult<RenderedNotificationResult>> RenderTemplateAsync(string templateId, [FromBody] RenderTemplateRequest request)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var result = await _templateService.RenderTemplateAsync(templateId, request.Data, correlationId);

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error rendering notification template {TemplateId}", templateId);
            return StatusCode(500, new { message = "Internal server error" });
        }
    }

    /// <summary>
    /// Render template content directly
    /// </summary>
    [HttpPost("render-content")]
    public async Task<ActionResult<RenderedNotificationResult>> RenderTemplateContentAsync([FromBody] RenderTemplateContentRequest request)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var result = await _templateService.RenderTemplateContentAsync(request.Template, request.Subject, request.Data, correlationId);

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error rendering template content");
            return StatusCode(500, new { message = "Internal server error" });
        }
    }

    /// <summary>
    /// Validate template content
    /// </summary>
    [HttpPost("validate")]
    public async Task<ActionResult<TemplateValidationResponseDto>> ValidateTemplateAsync([FromBody] ValidateTemplateRequest request)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var isValid = await _templateService.ValidateTemplateAsync(request.Template, request.SampleData, correlationId);

            return Ok(new TemplateValidationResponseDto
            {
                IsValid = isValid,
                Message = isValid ? "Template is valid" : "Template validation failed"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating template");
            return StatusCode(500, new { message = "Internal server error" });
        }
    }

    /// <summary>
    /// Get templates by type
    /// </summary>
    [HttpGet("by-type/{type}")]
    public async Task<ActionResult<List<GeoLeap.Api.Models.NotificationTemplate>>> GetTemplatesByTypeAsync(string type)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var templates = await _templateService.GetTemplatesByTypeAsync(type, correlationId);

            return Ok(templates);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting templates by type {Type}", type);
            return StatusCode(500, new { message = "Internal server error" });
        }
    }

    /// <summary>
    /// Get default template for a type and channel
    /// </summary>
    [HttpGet("default")]
    public async Task<ActionResult<GeoLeap.Api.Models.NotificationTemplate>> GetDefaultTemplateAsync(
        [FromQuery] string type,
        [FromQuery] string channel,
        [FromQuery] string language = "en")
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var template = await _templateService.GetDefaultTemplateAsync(type, channel, language, correlationId);

            if (template == null)
            {
                return NotFound(new { message = "Default template not found" });
            }

            return Ok(template);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting default template");
            return StatusCode(500, new { message = "Internal server error" });
        }
    }

    /// <summary>
    /// Set default template for a type and channel
    /// </summary>
    [HttpPost("set-default")]
    public async Task<ActionResult> SetDefaultTemplateAsync([FromBody] SetDefaultTemplateRequest request)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var success = await _templateService.SetDefaultTemplateAsync(request.Type, request.Channel, request.TemplateId, correlationId);

            if (!success)
            {
                return this.StandardBadRequest("Failed to set default template");
            }

            return Ok(new { message = "Default template set successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error setting default template");
            return StatusCode(500, new { message = "Internal server error" });
        }
    }

    /// <summary>
    /// Create a new version of an existing template
    /// </summary>
    [HttpPost("{templateId}/versions")]
    public async Task<ActionResult<TemplateVersionCreatedResponseDto>> CreateTemplateVersionAsync(string templateId, [FromBody] UpdateNotificationTemplateRequest request)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var versionId = await _templateService.CreateTemplateVersionAsync(templateId, request, correlationId);

            return Ok(new TemplateVersionCreatedResponseDto
            {
                VersionId = versionId,
                Message = "Template version created successfully"
            });
        }
        catch (InvalidOperationException ex)
        {
            _logger.LogWarning(ex, "Invalid operation creating template version for {TemplateId}", templateId);
            return this.StandardBadRequest(ex.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating template version for {TemplateId}", templateId);
            return StatusCode(500, new { message = "Internal server error" });
        }
    }

    /// <summary>
    /// Get all versions of a template
    /// </summary>
    [HttpGet("{templateId}/versions")]
    public async Task<ActionResult<List<GeoLeap.Api.Models.NotificationTemplate>>> GetTemplateVersionsAsync(string templateId)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var versions = await _templateService.GetTemplateVersionsAsync(templateId, correlationId);

            return Ok(versions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting template versions for {TemplateId}", templateId);
            return StatusCode(500, new { message = "Internal server error" });
        }
    }

    /// <summary>
    /// Promote a template version to active
    /// </summary>
    [HttpPost("{templateId}/versions/{version}/promote")]
    public async Task<ActionResult> PromoteTemplateVersionAsync(string templateId, string version)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var success = await _templateService.PromoteTemplateVersionAsync(templateId, version, correlationId);

            if (!success)
            {
                return NotFound(new { message = "Template version not found" });
            }

            return Ok(new { message = "Template version promoted successfully" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error promoting template version {TemplateId} v{Version}", templateId, version);
            return StatusCode(500, new { message = "Internal server error" });
        }
    }

    /// <summary>
    /// Import multiple templates
    /// </summary>
    [HttpPost("import")]
    public async Task<ActionResult<ImportTemplatesResponseDto>> ImportTemplatesAsync([FromBody] List<ImportTemplateRequest> templates)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var importedCount = await _templateService.ImportTemplatesAsync(templates, correlationId);

            return Ok(new ImportTemplatesResponseDto
            {
                TotalRequested = templates.Count,
                ImportedCount = importedCount,
                FailedCount = templates.Count - importedCount,
                Message = $"Imported {importedCount} out of {templates.Count} templates"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error importing templates");
            return StatusCode(500, new { message = "Internal server error" });
        }
    }

    /// <summary>
    /// Export templates
    /// </summary>
    [HttpGet("export")]
    public async Task<ActionResult<List<TemplateExportDto>>> ExportTemplatesAsync([FromQuery] string? type = null)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var templates = await _templateService.ExportTemplatesAsync(type, correlationId);

            return Ok(templates);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error exporting templates");
            return StatusCode(500, new { message = "Internal server error" });
        }
    }

    /// <summary>
    /// Get template usage statistics
    /// </summary>
    [HttpGet("{templateId}/usage-stats")]
    public async Task<ActionResult<TemplateUsageStatsDto>> GetTemplateUsageStatsAsync(
        string templateId,
        [FromQuery] DateTime? fromDate = null,
        [FromQuery] DateTime? toDate = null)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var stats = await _templateService.GetTemplateUsageStatsAsync(templateId, fromDate, toDate, correlationId);

            return Ok(stats);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting template usage stats for {TemplateId}", templateId);
            return StatusCode(500, new { message = "Internal server error" });
        }
    }

    /// <summary>
    /// Get top performing templates
    /// </summary>
    [HttpGet("top-performing")]
    public async Task<ActionResult<List<TemplatePerformanceDto>>> GetTopPerformingTemplatesAsync([FromQuery] int limit = 10)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var templates = await _templateService.GetTopPerformingTemplatesAsync(limit, correlationId);

            return Ok(templates);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting top performing templates");
            return StatusCode(500, new { message = "Internal server error" });
        }
    }

    /// <summary>
    /// Test a template with sample data
    /// </summary>
    [HttpPost("{templateId}/test")]
    public async Task<ActionResult<TemplateTestResult>> TestTemplateAsync(string templateId, [FromBody] TestTemplateRequest request)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var result = await _templateService.TestTemplateAsync(templateId, request.TestData, correlationId);

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error testing template {TemplateId}", templateId);
            return StatusCode(500, new { message = "Internal server error" });
        }
    }

    /// <summary>
    /// Get template suggestions for a specific type
    /// </summary>
    [HttpGet("suggestions/{type}")]
    public async Task<ActionResult<List<TemplateSuggestionDto>>> GetTemplateSuggestionsAsync(string type)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var suggestions = await _templateService.GetTemplateSuggestionsAsync(type, correlationId);

            return Ok(suggestions);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting template suggestions for type {Type}", type);
            return StatusCode(500, new { message = "Internal server error" });
        }
    }

    /// <summary>
    /// Optimize a template
    /// </summary>
    [HttpPost("{templateId}/optimize")]
    public async Task<ActionResult> OptimizeTemplateAsync(string templateId)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var optimized = await _templateService.OptimizeTemplateAsync(templateId, correlationId);

            var message = optimized 
                ? "Template optimized successfully" 
                : "Template is already optimized";

            return Ok(new { message, optimized });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error optimizing template {TemplateId}", templateId);
            return StatusCode(500, new { message = "Internal server error" });
        }
    }
}

// Supporting DTOs
public class TemplateCreatedResponseDto
{
    public string TemplateId { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}

public class RenderTemplateRequest
{
    public Dictionary<string, object> Data { get; set; } = new();
}

public class RenderTemplateContentRequest
{
    public string Template { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public Dictionary<string, object> Data { get; set; } = new();
}

public class ValidateTemplateRequest
{
    public string Template { get; set; } = string.Empty;
    public Dictionary<string, object>? SampleData { get; set; }
}

public class TemplateValidationResponseDto
{
    public bool IsValid { get; set; }
    public string Message { get; set; } = string.Empty;
}

public class SetDefaultTemplateRequest
{
    public string Type { get; set; } = string.Empty;
    public string Channel { get; set; } = string.Empty;
    public string TemplateId { get; set; } = string.Empty;
}

public class TemplateVersionCreatedResponseDto
{
    public string VersionId { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}

public class ImportTemplatesResponseDto
{
    public int TotalRequested { get; set; }
    public int ImportedCount { get; set; }
    public int FailedCount { get; set; }
    public string Message { get; set; } = string.Empty;
}

public class TestTemplateRequest
{
    public Dictionary<string, object> TestData { get; set; } = new();
}