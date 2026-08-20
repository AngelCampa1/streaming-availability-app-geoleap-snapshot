using System.ComponentModel.DataAnnotations;

namespace GeoLeap.Api.Models;

public class StreamingService
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;
    
    [MaxLength(200)]
    public string? DisplayName { get; set; }
    
    [MaxLength(1000)]
    public string? Description { get; set; }
    
    [MaxLength(500)]
    public string? LogoUrl { get; set; }
    
    [MaxLength(500)]
    public string? WebsiteUrl { get; set; }
    
    public StreamingServiceType Type { get; set; } = StreamingServiceType.Subscription;
    
    [MaxLength(50)]
    public string Category { get; set; } = string.Empty;
    
    public bool IsGlobal { get; set; } = false;
    
    public bool IsActive { get; set; } = true;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime ModifiedAt { get; set; } = DateTime.UtcNow;
    
    public int SortOrder { get; set; } = 0;
    
    // Regional availability - JSON array of country codes
    [MaxLength(2000)]
    public string AvailableRegions { get; set; } = string.Empty;
    
    // Popular regions for recommendation engine - JSON array of country codes  
    [MaxLength(1000)]
    public string PopularRegions { get; set; } = string.Empty;
    
    // Navigation properties
    public virtual ICollection<UserStreamingService> UserStreamingServices { get; set; } = new List<UserStreamingService>();
}

public enum StreamingServiceType
{
    Subscription = 1,
    Rental = 2,
    Purchase = 3,
    Free = 4,
    AdSupported = 5,
    Live = 6
}