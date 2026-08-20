using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service interface for managing notification templates - US-8.2
/// </summary>
public interface INotificationTemplateService
{
    // Template CRUD operations
    Task<string> CreateTemplateAsync(CreateNotificationTemplateRequest request, string correlationId = "");
    Task<bool> UpdateTemplateAsync(string templateId, UpdateNotificationTemplateRequest request, string correlationId = "");
    Task<Models.NotificationTemplate?> GetTemplateAsync(string templateId, string correlationId = "");
    Task<List<Models.NotificationTemplate>> GetTemplatesAsync(string? type = null, string? channel = null, string? language = "en", string correlationId = "");
    Task<bool> DeleteTemplateAsync(string templateId, string correlationId = "");
    Task<bool> ActivateTemplateAsync(string templateId, string correlationId = "");
    Task<bool> DeactivateTemplateAsync(string templateId, string correlationId = "");
    
    // Template rendering and processing
    Task<RenderedNotificationResult> RenderTemplateAsync(string templateId, Dictionary<string, object> data, string correlationId = "");
    Task<RenderedNotificationResult> RenderTemplateContentAsync(string templateContent, string subject, Dictionary<string, object> data, string correlationId = "");
    Task<bool> ValidateTemplateAsync(string templateContent, Dictionary<string, object>? sampleData = null, string correlationId = "");
    
    // Template management
    Task<List<Models.NotificationTemplate>> GetTemplatesByTypeAsync(string type, string correlationId = "");
    Task<Models.NotificationTemplate?> GetDefaultTemplateAsync(string type, string channel, string language = "en", string correlationId = "");
    Task<bool> SetDefaultTemplateAsync(string type, string channel, string templateId, string correlationId = "");
    
    // Template versioning
    Task<string> CreateTemplateVersionAsync(string templateId, UpdateNotificationTemplateRequest request, string correlationId = "");
    Task<List<Models.NotificationTemplate>> GetTemplateVersionsAsync(string templateId, string correlationId = "");
    Task<bool> PromoteTemplateVersionAsync(string templateId, string version, string correlationId = "");
    
    // Bulk operations
    Task<int> ImportTemplatesAsync(List<ImportTemplateRequest> templates, string correlationId = "");
    Task<List<TemplateExportDto>> ExportTemplatesAsync(string? type = null, string correlationId = "");
    
    // Analytics and testing
    Task<TemplateUsageStatsDto> GetTemplateUsageStatsAsync(string templateId, DateTime? fromDate = null, DateTime? toDate = null, string correlationId = "");
    Task<List<TemplatePerformanceDto>> GetTopPerformingTemplatesAsync(int limit = 10, string correlationId = "");
    Task<TemplateTestResult> TestTemplateAsync(string templateId, Dictionary<string, object> testData, string correlationId = "");
    
    // Template suggestions and optimization
    Task<List<TemplateSuggestionDto>> GetTemplateSuggestionsAsync(string type, string correlationId = "");
    Task<bool> OptimizeTemplateAsync(string templateId, string correlationId = "");
}

/// <summary>
/// Request DTO for creating notification templates
/// </summary>
public class CreateNotificationTemplateRequest
{
    public string Id { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Channel { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Template { get; set; } = string.Empty;
    public string Version { get; set; } = "1.0";
    public string Language { get; set; } = "en";
    public Dictionary<string, object>? DefaultData { get; set; }
    public Dictionary<string, object>? ValidationRules { get; set; }
    public string CreatedBy { get; set; } = "system";
}

/// <summary>
/// Request DTO for updating notification templates
/// </summary>
public class UpdateNotificationTemplateRequest
{
    public string? Type { get; set; }
    public string? Channel { get; set; }
    public string? Subject { get; set; }
    public string? Template { get; set; }
    public string? Version { get; set; }
    public string? Language { get; set; }
    public bool? IsActive { get; set; }
    public Dictionary<string, object>? DefaultData { get; set; }
    public Dictionary<string, object>? ValidationRules { get; set; }
}

/// <summary>
/// Import template request DTO
/// </summary>
public class ImportTemplateRequest
{
    public string Id { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Channel { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Template { get; set; } = string.Empty;
    public string Language { get; set; } = "en";
    public Dictionary<string, object>? DefaultData { get; set; }
}

/// <summary>
/// Rendered notification result DTO
/// </summary>
public class RenderedNotificationResult
{
    public string Subject { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public bool IsValid { get; set; } = true;
    public List<string> Errors { get; set; } = new();
    public List<string> Warnings { get; set; } = new();
    public Dictionary<string, object> UsedVariables { get; set; } = new();
    public Dictionary<string, object> MissingVariables { get; set; } = new();
}

/// <summary>
/// Template export DTO
/// </summary>
public class TemplateExportDto
{
    public string Id { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Channel { get; set; } = string.Empty;
    public string Subject { get; set; } = string.Empty;
    public string Template { get; set; } = string.Empty;
    public string Version { get; set; } = string.Empty;
    public string Language { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public Dictionary<string, object>? DefaultData { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

/// <summary>
/// Template usage statistics DTO
/// </summary>
public class TemplateUsageStatsDto
{
    public string TemplateId { get; set; } = string.Empty;
    public int TotalUsage { get; set; }
    public int SuccessfulRenders { get; set; }
    public int FailedRenders { get; set; }
    public double SuccessRate { get; set; }
    public int UniqueUsers { get; set; }
    public Dictionary<string, int> UsageByChannel { get; set; } = new();
    public Dictionary<string, int> UsageByDay { get; set; } = new();
    public DateTime? LastUsed { get; set; }
    public DateTime FromDate { get; set; }
    public DateTime ToDate { get; set; }
}

/// <summary>
/// Template performance DTO
/// </summary>
public class TemplatePerformanceDto
{
    public string TemplateId { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string Channel { get; set; } = string.Empty;
    public int Usage { get; set; }
    public double ReadRate { get; set; }
    public double ClickRate { get; set; }
    public double ConversionRate { get; set; }
    public double PerformanceScore { get; set; }
}

/// <summary>
/// Template test result DTO
/// </summary>
public class TemplateTestResult
{
    public bool IsValid { get; set; }
    public RenderedNotificationResult RenderedResult { get; set; } = new();
    public List<string> ValidationErrors { get; set; } = new();
    public List<string> ValidationWarnings { get; set; } = new();
    public TimeSpan RenderTime { get; set; }
    public Dictionary<string, object> TestResults { get; set; } = new();
}

/// <summary>
/// Template suggestion DTO
/// </summary>
public class TemplateSuggestionDto
{
    public string Title { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string SuggestedContent { get; set; } = string.Empty;
    public string Reason { get; set; } = string.Empty;
    public double Confidence { get; set; }
    public Dictionary<string, object> Parameters { get; set; } = new();
}