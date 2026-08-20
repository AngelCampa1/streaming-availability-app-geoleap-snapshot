using System.ComponentModel.DataAnnotations;

namespace GeoLeap.Api.Models;

public class UserContentPreference
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    public Guid UserId { get; set; }
    
    [MaxLength(50)]
    public string ContentType { get; set; } = string.Empty;
    
    public bool IsEnabled { get; set; } = true;
    
    public int Priority { get; set; } = 0;
    
    public DateTime AddedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation properties
    public virtual User User { get; set; } = null!;
}