using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GeoLeap.Api.Models;

/// <summary>
/// User notification model for in-app notifications
/// </summary>
public class UserNotification
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public Guid UserId { get; set; }
    
    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(2000)]
    public string Message { get; set; } = string.Empty;
    
    [MaxLength(50)]
    public string Type { get; set; } = "info";
    
    public bool IsRead { get; set; } = false;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? ReadAt { get; set; }
    
    [MaxLength(2000)]
    public string? ActionUrl { get; set; }
    
    [MaxLength(1000)]
    public string? MetadataJson { get; set; }
    
    // Navigation properties
    [ForeignKey(nameof(UserId))]
    public virtual User User { get; set; } = null!;
    
    // Computed properties
    [NotMapped]
    public Dictionary<string, object>? Metadata
    {
        get => string.IsNullOrEmpty(MetadataJson) 
            ? null 
            : System.Text.Json.JsonSerializer.Deserialize<Dictionary<string, object>>(MetadataJson);
        set => MetadataJson = value != null 
            ? System.Text.Json.JsonSerializer.Serialize(value) 
            : null;
    }
}