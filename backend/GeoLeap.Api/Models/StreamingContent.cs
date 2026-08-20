using System.ComponentModel.DataAnnotations;

namespace GeoLeap.Api.Models;

public class StreamingContent
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Description { get; set; }

    [MaxLength(50)]
    public string? ContentType { get; set; } // movie, tv, documentary, etc.
    
    /// <summary>
    /// Type alias for compatibility
    /// </summary>
    public string? Type => ContentType;

    [MaxLength(50)]
    public string? Genre { get; set; }

    [MaxLength(10)]
    public string? Rating { get; set; }

    public DateTime? ReleaseDate { get; set; }
    
    /// <summary>
    /// ReleaseYear extracted from ReleaseDate
    /// </summary>
    public int? ReleaseYear => ReleaseDate?.Year;

    [MaxLength(200)]
    public string? Director { get; set; }

    public int? Duration { get; set; } // in minutes

    [MaxLength(500)]
    public string? PosterUrl { get; set; }

    [MaxLength(1000)]
    public string? StreamingUrls { get; set; } // JSON array of streaming platform URLs

    public bool IsAvailable { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? UpdatedAt { get; set; }
}