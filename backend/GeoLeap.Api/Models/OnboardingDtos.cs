using System.ComponentModel.DataAnnotations;

namespace GeoLeap.Api.Models;

// Request DTOs
public class StartOnboardingRequest
{
    public int CurrentStep { get; set; } = 1;
}

public class UpdateOnboardingStepRequest
{
    [Range(1, 5)]
    public int Step { get; set; }
}

public class AddStreamingServicesRequest
{
    [Required]
    [MinLength(1)]
    public List<string> ServiceNames { get; set; } = new();
}

public class RemoveStreamingServiceRequest
{
    [Required]
    public string ServiceName { get; set; } = string.Empty;
}

public class AddRegionPreferencesRequest
{
    [Required]
    [MinLength(1)]
    public List<RegionPreferenceDto> Regions { get; set; } = new();
}

public class RegionPreferenceDto
{
    [Required]
    [StringLength(2)]
    public string CountryCode { get; set; } = string.Empty;
    
    public bool IsPrimary { get; set; } = false;
    
    public int Priority { get; set; } = 0;
}

public class AddContentPreferencesRequest
{
    [Required]
    [MinLength(1)]
    public List<ContentPreferenceDto> ContentTypes { get; set; } = new();
}

public class ContentPreferenceDto
{
    [Required]
    [StringLength(50)]
    public string ContentType { get; set; } = string.Empty;
    
    public bool IsEnabled { get; set; } = true;
    
    public int Priority { get; set; } = 0;
}

public class CompleteOnboardingRequest
{
    public bool IsCompleted { get; set; } = true;
}

public class SkipOnboardingRequest
{
    public string Reason { get; set; } = string.Empty;
}

// Response DTOs
public class OnboardingStatusResponse
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public bool IsCompleted { get; set; }
    public int CurrentStep { get; set; }
    public int TotalSteps { get; set; } = 5;
    public List<int> CompletedSteps { get; set; } = new();
    public List<int> AvailableNextSteps { get; set; } = new();
    public DateTime? CompletedAt { get; set; }
    public DateTime? SkippedAt { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<UserStreamingServiceResponse> StreamingServices { get; set; } = new();
    public UserRegionPreferencesResponse? RegionPreferences { get; set; }
    public List<UserContentPreferenceResponse> ContentPreferences { get; set; } = new();
    public Dictionary<string, object> Metadata { get; set; } = new();
}

public class StreamingServiceDto
{
    public Guid Id { get; set; }
    public string ServiceName { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public DateTime AddedAt { get; set; }
}

public class OnboardingProgressResponse
{
    public int CurrentStep { get; set; }
    public int TotalSteps { get; set; } = 5;
    public double Progress { get; set; }
    public string TimeEstimate { get; set; } = string.Empty;
    public bool CanSkip { get; set; } = true;
    public bool CanGoBack { get; set; } = true;
}

public class PopularServicesResponse
{
    public List<string> PopularServices { get; set; } = new()
    {
        "Netflix",
        "Disney+",
        "Amazon Prime Video",
        "Hulu",
        "HBO Max",
        "Apple TV+",
        "Paramount+",
        "Peacock",
        "Crunchyroll",
        "Discovery+"
    };
}

// Analytics DTOs
public class OnboardingAnalyticsRequest
{
    [Required]
    public string EventType { get; set; } = string.Empty; // "step_started", "step_completed", "step_skipped"
    
    public int Step { get; set; }
    
    public Dictionary<string, object> Properties { get; set; } = new();
}

// Personalization DTOs
public class PersonalizationPreferencesResponse
{
    public List<string> UserServices { get; set; } = new();
    public List<string> PreferredRegions { get; set; } = new();
    public List<string> ContentTypes { get; set; } = new();
    public bool HidePaywalledResults { get; set; } = false;
}

// Additional Response DTOs needed by OnboardingService
public class UserStreamingServiceResponse
{
    public Guid Id { get; set; }
    public string ServiceName { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public DateTime AddedAt { get; set; }
    public string? SubscriptionStatus { get; set; }
    public bool IsEnabled { get; set; } = true;
}

public class UserRegionPreferencesResponse
{
    public List<string> PreferredCountries { get; set; } = new();
    public bool UseLocationDetection { get; set; } = true;
    public string? PrimaryRegion { get; set; }
    public List<RegionPreferenceDto> Regions { get; set; } = new();
}

public class UserContentPreferenceResponse
{
    public Guid Id { get; set; }
    public string ContentType { get; set; } = string.Empty;
    public bool IsEnabled { get; set; } = true;
    public int Priority { get; set; } = 0;
    public DateTime CreatedAt { get; set; }
    public Dictionary<string, object> Settings { get; set; } = new();
}