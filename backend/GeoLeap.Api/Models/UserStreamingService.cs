using System.ComponentModel.DataAnnotations;

namespace GeoLeap.Api.Models;

public class UserStreamingService
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public Guid UserId { get; set; }
    
    public Guid StreamingServiceId { get; set; }
    
    [MaxLength(100)]
    public string ServiceName { get; set; } = string.Empty; // Keep for backwards compatibility
    
    public bool IsActive { get; set; } = true;
    
    public DateTime AddedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime? RemovedAt { get; set; }
    
    // Preferences for this service
    public bool PrioritizeInResults { get; set; } = true;
    
    public bool ShowInRecommendations { get; set; } = true;
    
    // Navigation properties
    public virtual User User { get; set; } = null!;
    
    public virtual StreamingService StreamingService { get; set; } = null!;
}