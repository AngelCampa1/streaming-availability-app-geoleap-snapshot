using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace GeoLeap.Api.Models;

public enum TmdbContentType
{
    Movie = 1,
    TvSeries = 2,
    Person = 3
}

public enum ImageSize
{
    W92,     // For thumbnails
    W154,    // For small posters
    W185,    // For medium posters
    W342,    // For large posters
    W500,    // For extra large posters
    W780,    // For backdrops
    W1280,   // For large backdrops
    Original // For original quality
}

public class ContentMetadata
{
    /// <summary>
    /// Unique identifier for this content - adding for test compatibility
    /// </summary>
    public int Id { get; set; }
    
    public int TmdbId { get; set; }
    
    [Required]
    public string Title { get; set; } = string.Empty;
    
    public string? OriginalTitle { get; set; }
    
    public string? Overview { get; set; }
    
    public string Description { get; set; } = string.Empty;
    
    public DateTime? ReleaseDate { get; set; }
    
    [Required]
    public TmdbContentType Type { get; set; }
    
    public double? VoteAverage { get; set; }
    
    public int VoteCount { get; set; }
    
    public double? Popularity { get; set; }
    
    public string? PosterPath { get; set; }
    
    public string? BackdropPath { get; set; }
    
    public List<string> Genres { get; set; } = new();
    
    // Add missing Genres property for SearchableContent compatibility
    public string GenresString => string.Join(", ", Genres);
    
    public List<CastMember> Cast { get; set; } = new();
    
    public List<CrewMember> Crew { get; set; } = new();
    
    public List<string> ProductionCountries { get; set; } = new();
    
    public List<string> OriginalLanguages { get; set; } = new();
    
    /// <summary>
    /// Runtime in minutes for movies
    /// </summary>
    public int? Runtime { get; set; }
    
    /// <summary>
    /// Number of seasons for TV shows
    /// </summary>
    public int? NumberOfSeasons { get; set; }
    
    /// <summary>
    /// Number of episodes for TV shows
    /// </summary>
    public int? NumberOfEpisodes { get; set; }
    
    public string? Status { get; set; }
    
    public List<TmdbExternalId> ExternalIds { get; set; } = new();
    
    /// <summary>
    /// ISO 639-1 language code
    /// </summary>
    public string? OriginalLanguage { get; set; }
    
    /// <summary>
    /// Adult content flag
    /// </summary>
    public bool Adult { get; set; }
    
    /// <summary>
    /// Budget for movies (in USD)
    /// </summary>
    public long? Budget { get; set; }
    
    /// <summary>
    /// Revenue for movies (in USD)
    /// </summary>
    public long? Revenue { get; set; }
    
    /// <summary>
    /// Tagline for the content
    /// </summary>
    public string? Tagline { get; set; }
    
    /// <summary>
    /// Homepage URL
    /// </summary>
    public string? Homepage { get; set; }
    
    /// <summary>
    /// Image URL for social sharing
    /// </summary>
    public string ImageUrl { get; set; } = string.Empty;
    
    /// <summary>
    /// Content type as string for social sharing compatibility
    /// </summary>
    public string ContentType { get; set; } = string.Empty;
    
    /// <summary>
    /// Primary genre as string
    /// </summary>
    public string Genre { get; set; } = string.Empty;
    
    /// <summary>
    /// Release year for easy access
    /// </summary>
    public int? ReleaseYear => ReleaseDate?.Year;
    
    /// <summary>
    /// When the content metadata was created - for test compatibility
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    /// <summary>
    /// When the content metadata was last updated - for test compatibility
    /// </summary>
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    /// <summary>
    /// Data quality level for this content metadata
    /// </summary>
    public DataQuality DataQuality { get; set; } = DataQuality.Standard;
    
    /// <summary>
    /// Primary external ID for backward compatibility
    /// </summary>
    public string? ExternalId { get; set; }
    
    /// <summary>
    /// Release year for backward compatibility
    /// </summary>
    public int? Year { get; set; }
    
    /// <summary>
    /// Rating for backward compatibility (0-10 scale)
    /// </summary>
    public double? Rating { get; set; }
    
    /// <summary>
    /// Poster URL for backward compatibility
    /// </summary>
    public string? PosterUrl { get; set; }
    
    /// <summary>
    /// Backdrop URL for backward compatibility
    /// </summary>
    public string? BackdropUrl { get; set; }
    
    /// <summary>
    /// Last updated timestamp
    /// </summary>
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
    
    /// <summary>
    /// Source provider for the data
    /// </summary>
    public string? SourceProvider { get; set; }
    
    /// <summary>
    /// SEO keywords for content optimization
    /// </summary>
    public List<string> Keywords { get; set; } = new();
    
    /// <summary>
    /// Open Graph data for social media sharing - stored as JSON
    /// </summary>
    [NotMapped]
    public Dictionary<string, string> OpenGraphData { get; set; } = new();
    
    /// <summary>
    /// Twitter Card data for Twitter sharing - stored as JSON
    /// </summary>
    [NotMapped]
    public Dictionary<string, string> TwitterCardData { get; set; } = new();
    
    /// <summary>
    /// Structured data for search engines (JSON-LD) - stored as JSON
    /// </summary>
    [NotMapped]
    public Dictionary<string, object> StructuredData { get; set; } = new();
    
    /// <summary>
    /// Additional metadata dictionary - JSON storage
    /// </summary>
    [Column(TypeName = "nvarchar(max)")]
    public string MetadataJson { get; set; } = "{}";

    [NotMapped]
    public Dictionary<string, object> Metadata
    {
        get => string.IsNullOrEmpty(MetadataJson) || MetadataJson == "{}" 
            ? new Dictionary<string, object>() 
            : JsonSerializer.Deserialize<Dictionary<string, object>>(MetadataJson) ?? new Dictionary<string, object>();
        set => MetadataJson = JsonSerializer.Serialize(value);
    }
}

public class CastMember
{
    public int PersonId { get; set; }
    
    [Required]
    public string Name { get; set; } = string.Empty;
    
    public string? Character { get; set; }
    
    public string? ProfilePath { get; set; }
    
    public int Order { get; set; }
    
    /// <summary>
    /// Credit ID from TMDb
    /// </summary>
    public string? CreditId { get; set; }
    
    /// <summary>
    /// Gender: 0 = not specified, 1 = female, 2 = male, 3 = non-binary
    /// </summary>
    public int? Gender { get; set; }
}

public class CrewMember
{
    public int PersonId { get; set; }
    
    [Required]
    public string Name { get; set; } = string.Empty;
    
    [Required]
    public string Job { get; set; } = string.Empty;
    
    [Required]
    public string Department { get; set; } = string.Empty;
    
    public string? ProfilePath { get; set; }
    
    /// <summary>
    /// Credit ID from TMDb
    /// </summary>
    public string? CreditId { get; set; }
    
    /// <summary>
    /// Gender: 0 = not specified, 1 = female, 2 = male, 3 = non-binary
    /// </summary>
    public int? Gender { get; set; }
}

public class TmdbExternalId
{
    [Required]
    public string Source { get; set; } = string.Empty; // IMDB, TVDB, etc.
    
    [Required]
    public string ExternalIdValue { get; set; } = string.Empty;
}

public class Genre
{
    public int Id { get; set; }
    
    [Required]
    public string Name { get; set; } = string.Empty;
}

public class PersonDetails
{
    public int Id { get; set; }
    
    [Required]
    public string Name { get; set; } = string.Empty;
    
    public string? Biography { get; set; }
    
    public DateTime? Birthday { get; set; }
    
    public DateTime? Deathday { get; set; }
    
    /// <summary>
    /// Gender: 0 = not specified, 1 = female, 2 = male, 3 = non-binary
    /// </summary>
    public int? Gender { get; set; }
    
    public string? Homepage { get; set; }
    
    public string? PlaceOfBirth { get; set; }
    
    public string? ProfilePath { get; set; }
    
    /// <summary>
    /// Also known as names
    /// </summary>
    public List<string> AlsoKnownAs { get; set; } = new();
    
    public double? Popularity { get; set; }
    
    /// <summary>
    /// Known for department (Acting, Directing, etc.)
    /// </summary>
    public string? KnownForDepartment { get; set; }
    
    public List<TmdbExternalId> ExternalIds { get; set; } = new();
}

// SearchResponse<T> moved to SearchModels.cs to avoid duplication

/// <summary>
/// Simple streaming availability data for content linking purposes
/// </summary>
public class StreamingAvailability
{
    public string Id { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Type { get; set; }
    public int? Year { get; set; }
    public string? Overview { get; set; }
    public List<string> Genres { get; set; } = new();
}

/// <summary>
/// Represents linked content between streaming availability and metadata
/// </summary>
public class LinkedContent
{
    public StreamingAvailability? StreamingData { get; set; }
    
    public ContentMetadata? Metadata { get; set; }
    
    /// <summary>
    /// Confidence score (0.0 - 1.0) in the link between streaming data and metadata
    /// </summary>
    public double LinkConfidence { get; set; }
    
    /// <summary>
    /// Method used for linking (TitleYear, ExternalId, Manual, etc.)
    /// </summary>
    public string? LinkMethod { get; set; }
    
    /// <summary>
    /// When the link was established
    /// </summary>
    public DateTime LinkedAt { get; set; } = DateTime.UtcNow;
}