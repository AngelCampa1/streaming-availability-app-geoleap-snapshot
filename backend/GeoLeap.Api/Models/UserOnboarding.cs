using System.ComponentModel.DataAnnotations;

namespace GeoLeap.Api.Models;

public class UserOnboarding
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public Guid UserId { get; set; }
    
    public bool IsCompleted { get; set; } = false;
    
    public int CurrentStep { get; set; } = 1;
    
    public DateTime? CompletedAt { get; set; }
    
    public DateTime? SkippedAt { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    public virtual User User { get; set; } = null!;
}