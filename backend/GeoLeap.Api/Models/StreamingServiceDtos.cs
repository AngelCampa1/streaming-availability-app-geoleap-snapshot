using System.ComponentModel.DataAnnotations;

namespace GeoLeap.Api.Models;

public class StreamingServiceCatalogDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? DisplayName { get; set; }
    public string? Description { get; set; }
    public string? LogoUrl { get; set; }
    public string? WebsiteUrl { get; set; }
    public StreamingServiceType Type { get; set; }
    public string Category { get; set; } = string.Empty;
    public bool IsGlobal { get; set; }
    public bool IsActive { get; set; }
    public int SortOrder { get; set; }
    public List<string> AvailableRegions { get; set; } = new();
    public List<string> PopularRegions { get; set; } = new();
}

public class UserStreamingServiceDto
{
    public Guid Id { get; set; }
    public Guid StreamingServiceId { get; set; }
    public string ServiceName { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public DateTime AddedAt { get; set; }
    public DateTime? RemovedAt { get; set; }
    public bool PrioritizeInResults { get; set; }
    public bool ShowInRecommendations { get; set; }
    public StreamingServiceCatalogDto? StreamingService { get; set; }
}

public class AddStreamingServiceRequest
{
    [Required]
    public Guid StreamingServiceId { get; set; }
    
    public bool PrioritizeInResults { get; set; } = true;
    
    public bool ShowInRecommendations { get; set; } = true;
}

public class UpdateStreamingServicePreferencesRequest
{
    [Required]
    public Guid StreamingServiceId { get; set; }
    
    public bool PrioritizeInResults { get; set; } = true;
    
    public bool ShowInRecommendations { get; set; } = true;
}

public class StreamingServiceRecommendationRequest
{
    public string? CountryCode { get; set; }
    
    public List<StreamingServiceType>? ServiceTypes { get; set; }
    
    public List<string>? Categories { get; set; }
    
    public int MaxRecommendations { get; set; } = 10;
}

public class StreamingServiceRecommendationResponse
{
    public List<StreamingServiceCatalogDto> RecommendedServices { get; set; } = new();
    
    public List<StreamingServiceCatalogDto> PopularServices { get; set; } = new();
    
    public List<StreamingServiceCatalogDto> AllServices { get; set; } = new();
}

public class UserStreamingServicesResponse
{
    public List<UserStreamingServiceDto> UserServices { get; set; } = new();
    
    public List<StreamingServiceCatalogDto> AvailableServices { get; set; } = new();
    
    public int TotalUserServices { get; set; }
    
    public int TotalAvailableServices { get; set; }
}