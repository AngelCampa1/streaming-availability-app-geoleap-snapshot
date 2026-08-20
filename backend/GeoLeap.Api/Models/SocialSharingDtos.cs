using System.ComponentModel.DataAnnotations;

namespace GeoLeap.Api.Models;

/// <summary>
/// DTO for social share creation responses
/// </summary>
public class SocialShareDto
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string ShareId { get; set; } = string.Empty;
    public string ShareUrl { get; set; } = string.Empty;
    public string ShortUrl { get; set; } = string.Empty;
    public string Platform { get; set; } = string.Empty;
    public string ContentId { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public string? CustomMessage { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public Dictionary<string, string>? Metadata { get; set; }
}

/// <summary>
/// DTO for social share creation requests
/// </summary>
public class CreateSocialShareRequest
{
    [Required]
    public string ContentId { get; set; } = string.Empty;
    
    [Required]
    public string ContentType { get; set; } = string.Empty;
    
    public string ContentTitle { get; set; } = string.Empty;
    
    [Required]
    public string Platform { get; set; } = string.Empty;
    
    public string? CustomMessage { get; set; }
    public string Message { get; set; } = string.Empty;
    public string? UserId { get; set; }
    public Dictionary<string, string>? Metadata { get; set; }
}

/// <summary>
/// DTO for share link creation requests
/// </summary>
public class ShareLinkRequest
{
    [Required]
    public string ContentId { get; set; } = string.Empty;
    
    [Required]
    public string ContentType { get; set; } = string.Empty;
    
    public string ContentTitle { get; set; } = string.Empty;
    
    [Required]
    public string Platform { get; set; } = string.Empty;
    
    public string? CustomMessage { get; set; }
    public Dictionary<string, string>? Metadata { get; set; }
}

// Additional DTOs for services that don't have existing definitions
public class RefreshJobStatus
{
    public Guid Id { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAt { get; set; }
    public string? ErrorMessage { get; set; }
}

public class RefreshScheduleConfiguration
{
    public string CronExpression { get; set; } = string.Empty;
    public bool IsEnabled { get; set; }
    public DateTime? LastRun { get; set; }
    public DateTime? NextRun { get; set; }
}

public class CreateStreamingServiceRequest
{
    public string Name { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
}

public class UpdateStreamingServiceRequest
{
    public string DisplayName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public bool IsActive { get; set; }
}

public class OnboardingSessionDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string CurrentStep { get; set; } = string.Empty;
    public bool IsCompleted { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class OnboardingStepResult
{
    public string StepName { get; set; } = string.Empty;
    public bool IsCompleted { get; set; }
    public Dictionary<string, object>? Data { get; set; }
}

public class SupportTicketDto
{
    public Guid Id { get; set; }
    public string Subject { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class SupportCategoryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}

public class CreateSupportTicketRequest
{
    public string Subject { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}

public class PayInvoiceRequest
{
    public decimal Amount { get; set; }
    public string PaymentMethodId { get; set; } = string.Empty;
}

public class SearchEventRequest
{
    public string Query { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public int ResultsCount { get; set; }
    public Guid? UserId { get; set; }
}

public class SearchTrendDto
{
    public string Query { get; set; } = string.Empty;
    public int SearchCount { get; set; }
    public DateTime Date { get; set; }
}

public class TopQueryDto
{
    public string Query { get; set; } = string.Empty;
    public int Count { get; set; }
}

public class CohortAnalysisDto
{
    public DateTime CohortMonth { get; set; }
    public int UsersCount { get; set; }
    public decimal RetentionRate { get; set; }
}

public class ChurnAnalysisDto
{
    public DateTime Month { get; set; }
    public decimal ChurnRate { get; set; }
    public int ChurnedUsers { get; set; }
}

public class AdvancedFilterCriteria
{
    public List<string>? Genres { get; set; }
    public int? YearFrom { get; set; }
    public int? YearTo { get; set; }
    public List<string>? Countries { get; set; }
}