using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GeoLeap.Api.Models;

[Table("CachePersistenceEntries")]
public class CachePersistenceEntry
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    [MaxLength(250)]
    public string Key { get; set; } = string.Empty;
    
    [Required]
    public string Value { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(50)]
    public string Category { get; set; } = string.Empty;
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    public DateTime ExpiresAt { get; set; }
    
    public DateTime LastAccessedAt { get; set; } = DateTime.UtcNow;
    
    public bool IsCompressed { get; set; }
    
    public long OriginalSize { get; set; }
    
    public long CompressedSize { get; set; }
    
    public int AccessCount { get; set; } = 0;
    
    [MaxLength(50)]
    public string? ContentType { get; set; }
}