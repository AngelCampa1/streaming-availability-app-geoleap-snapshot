using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;
using Microsoft.EntityFrameworkCore;

namespace GeoLeap.Api.Models;

/// <summary>
/// Searchable content entity optimized for high-performance search operations
/// </summary>
[Index(nameof(Title), nameof(OriginalTitle))]
[Index(nameof(SearchableTitle))]
[Index(nameof(Type), nameof(Year))]
[Index(nameof(Rating), nameof(Popularity))]
[Index(nameof(CreatedAt), nameof(UpdatedAt))]
[Index(nameof(TmdbId), IsUnique = true)]
public class SearchableContent
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// TMDb ID for external reference
    /// </summary>
    public int? TmdbId { get; set; }
    
    /// <summary>
    /// External ID alias for compatibility
    /// </summary>
    [NotMapped]
    public int? ExternalId => TmdbId;
    
    /// <summary>
    /// External source identifier (always "tmdb" for this implementation)
    /// </summary>
    [NotMapped]
    public string ExternalSource => "tmdb";

    /// <summary>
    /// Primary title for display and search
    /// </summary>
    [Required]
    [MaxLength(500)]
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Original title in original language
    /// </summary>
    [MaxLength(500)]
    public string? OriginalTitle { get; set; }

    /// <summary>
    /// Normalized title for full-text search with stemming and synonyms
    /// </summary>
    [MaxLength(1000)]
    public string SearchableTitle { get; set; } = string.Empty;

    /// <summary>
    /// Content overview/description
    /// </summary>
    [MaxLength(2000)]
    public string? Overview { get; set; }
    
    /// <summary>
    /// Description alias for Overview property for compatibility
    /// </summary>
    [NotMapped]
    public string Description => Overview ?? string.Empty;

    /// <summary>
    /// Searchable overview for full-text search
    /// </summary>
    [MaxLength(4000)]
    public string? SearchableOverview { get; set; }

    /// <summary>
    /// Content type (Movie, TV Series, etc.)
    /// </summary>
    [Required]
    public ContentType Type { get; set; }
    
    /// <summary>
    /// Content type as string for compatibility
    /// </summary>
    [NotMapped]
    public string ContentType => Type.ToString();

    /// <summary>
    /// Release/premiere year
    /// </summary>
    public int? Year { get; set; }
    
    /// <summary>
    /// Release year alias for compatibility
    /// </summary>
    [NotMapped]
    public int? ReleaseYear => Year;

    /// <summary>
    /// Content rating (0.0 - 10.0)
    /// </summary>
    [Column(TypeName = "decimal(3,1)")]
    public decimal? Rating { get; set; }
    
    /// <summary>
    /// IMDB Rating alias for compatibility
    /// </summary>
    [NotMapped]
    public decimal? ImdbRating => Rating;

    /// <summary>
    /// Vote count for rating
    /// </summary>
    public int VoteCount { get; set; }

    /// <summary>
    /// Popularity score for ranking
    /// </summary>
    [Column(TypeName = "decimal(10,2)")]
    public decimal Popularity { get; set; }

    /// <summary>
    /// Runtime in minutes (for movies)
    /// </summary>
    public int? RuntimeMinutes { get; set; }

    /// <summary>
    /// Primary language code
    /// </summary>
    [MaxLength(10)]
    public string? Language { get; set; }

    /// <summary>
    /// Content rating (G, PG, R, etc.)
    /// </summary>
    [MaxLength(10)]
    public string? ContentRating { get; set; }

    /// <summary>
    /// Adult content flag
    /// </summary>
    public bool IsAdult { get; set; }

    /// <summary>
    /// Poster image URL
    /// </summary>
    [MaxLength(500)]
    public string? PosterUrl { get; set; }

    /// <summary>
    /// Backdrop image URL
    /// </summary>
    [MaxLength(500)]
    public string? BackdropUrl { get; set; }

    /// <summary>
    /// JSON array of genre names
    /// </summary>
    [MaxLength(1000)]
    public string GenresJson { get; set; } = "[]";

    /// <summary>
    /// Computed property for backwards compatibility - returns genre array from JSON
    /// </summary>
    [NotMapped]
    public List<string> Genres
    {
        get
        {
            try
            {
                return System.Text.Json.JsonSerializer.Deserialize<List<string>>(GenresJson) ?? new List<string>();
            }
            catch
            {
                return new List<string>();
            }
        }
        set
        {
            GenresJson = System.Text.Json.JsonSerializer.Serialize(value ?? new List<string>());
        }
    }
    
    /// <summary>
    /// Primary genre as string for compatibility
    /// </summary>
    [NotMapped]
    public string? Genre => Genres.FirstOrDefault();

    /// <summary>
    /// Searchable genres string for text search
    /// </summary>
    [MaxLength(2000)]
    public string SearchableGenres { get; set; } = string.Empty;

    /// <summary>
    /// JSON array of cast members
    /// </summary>
    [MaxLength(5000)]
    public string CastJson { get; set; } = "[]";

    /// <summary>
    /// Searchable cast string for text search
    /// </summary>
    [MaxLength(3000)]
    public string SearchableCast { get; set; } = string.Empty;

    /// <summary>
    /// JSON array of crew members
    /// </summary>
    [MaxLength(3000)]
    public string CrewJson { get; set; } = "[]";

    /// <summary>
    /// Searchable crew string for text search
    /// </summary>
    [MaxLength(2000)]
    public string SearchableCrew { get; set; } = string.Empty;

    /// <summary>
    /// Total number of countries where content is available
    /// </summary>
    public int AvailableCountriesCount { get; set; }

    /// <summary>
    /// Total number of streaming services with this content
    /// </summary>
    public int AvailableServicesCount { get; set; }

    /// <summary>
    /// Combined search score for ranking (computed field)
    /// </summary>
    [Column(TypeName = "decimal(10,4)")]
    public decimal SearchScore { get; set; }

    /// <summary>
    /// Click-through rate for this content
    /// </summary>
    [Column(TypeName = "decimal(5,4)")]
    public decimal ClickThroughRate { get; set; }

    /// <summary>
    /// Number of times this content has been searched/viewed
    /// </summary>
    public int ViewCount { get; set; }

    /// <summary>
    /// When the content was first created
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// When the content was last updated
    /// </summary>
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// When streaming availability was last updated
    /// </summary>
    public DateTime? LastAvailabilityUpdate { get; set; }

    /// <summary>
    /// Navigation property for streaming availability options
    /// </summary>
    public ICollection<ContentStreamingOption> StreamingOptions { get; set; } = new List<ContentStreamingOption>();

    /// <summary>
    /// Navigation property for alternative titles
    /// </summary>
    public ICollection<ContentAlternativeTitle> AlternativeTitles { get; set; } = new List<ContentAlternativeTitle>();
}

/// <summary>
/// Streaming availability options for content
/// </summary>
[Index(nameof(ContentId), nameof(CountryCode), nameof(ServiceId))]
[Index(nameof(StreamingType), nameof(Price))]
[Index(nameof(LastUpdated))]
public class ContentStreamingOption
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Reference to the content
    /// </summary>
    [Required]
    public Guid ContentId { get; set; }

    /// <summary>
    /// Country code (ISO 3166-1 alpha-2)
    /// </summary>
    [Required]
    [MaxLength(2)]
    public string CountryCode { get; set; } = string.Empty;
    
    /// <summary>
    /// Country alias for compatibility
    /// </summary>
    [NotMapped]
    public string Country => CountryCode;

    /// <summary>
    /// Streaming service identifier
    /// </summary>
    [Required]
    [MaxLength(100)]
    public string ServiceId { get; set; } = string.Empty;

    /// <summary>
    /// Streaming service name for display
    /// </summary>
    [Required]
    [MaxLength(200)]
    public string ServiceName { get; set; } = string.Empty;

    /// <summary>
    /// Service logo URL
    /// </summary>
    [MaxLength(500)]
    public string? ServiceLogoUrl { get; set; }

    /// <summary>
    /// Type of streaming availability
    /// </summary>
    [Required]
    public StreamingType StreamingType { get; set; }

    /// <summary>
    /// Price for rental/purchase
    /// </summary>
    [Column(TypeName = "decimal(10,2)")]
    public decimal? Price { get; set; }

    /// <summary>
    /// Currency code for price
    /// </summary>
    [MaxLength(3)]
    public string? Currency { get; set; }

    /// <summary>
    /// Available video quality options (JSON array)
    /// </summary>
    [MaxLength(200)]
    public string VideoQualityJson { get; set; } = "[]";

    /// <summary>
    /// Available audio languages (JSON array)
    /// </summary>
    [MaxLength(500)]
    public string AudioLanguagesJson { get; set; } = "[]";

    /// <summary>
    /// Available subtitle languages (JSON array)
    /// </summary>
    [MaxLength(500)]
    public string SubtitleLanguagesJson { get; set; } = "[]";

    /// <summary>
    /// When this availability expires (if applicable)
    /// </summary>
    public DateTime? ExpiresAt { get; set; }

    /// <summary>
    /// Direct streaming URL
    /// </summary>
    [MaxLength(1000)]
    public string? StreamingUrl { get; set; }

    /// <summary>
    /// When this data was last updated
    /// </summary>
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// Navigation property to content
    /// </summary>
    public SearchableContent Content { get; set; } = null!;
}

/// <summary>
/// Alternative titles for content (for improved search matching)
/// </summary>
[Index(nameof(ContentId))]
[Index(nameof(Title), nameof(Language))]
[Index(nameof(SearchableTitle))]
public class ContentAlternativeTitle
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Reference to the content
    /// </summary>
    [Required]
    public Guid ContentId { get; set; }

    /// <summary>
    /// Alternative title
    /// </summary>
    [Required]
    [MaxLength(500)]
    public string Title { get; set; } = string.Empty;

    /// <summary>
    /// Normalized alternative title for search
    /// </summary>
    [MaxLength(1000)]
    public string SearchableTitle { get; set; } = string.Empty;

    /// <summary>
    /// Language of this title
    /// </summary>
    [MaxLength(10)]
    public string? Language { get; set; }

    /// <summary>
    /// Country where this title is used
    /// </summary>
    [MaxLength(2)]
    public string? CountryCode { get; set; }

    /// <summary>
    /// Type of alternative title (Original, Translation, Alias, etc.)
    /// </summary>
    [Required]
    [MaxLength(50)]
    public string TitleType { get; set; } = string.Empty;

    /// <summary>
    /// Navigation property to content
    /// </summary>
    public SearchableContent Content { get; set; } = null!;
}

/// <summary>
/// Search performance analytics and caching metadata
/// </summary>
[Index(nameof(QueryHash), IsUnique = true)]
[Index(nameof(CreatedAt), nameof(HitCount))]
[Index(nameof(ExecutionTimeMs))]
public class SearchAnalytics
{
    [Key]
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Hashed search query for privacy and uniqueness
    /// </summary>
    [Required]
    [MaxLength(64)]
    public string QueryHash { get; set; } = string.Empty;

    /// <summary>
    /// Original search terms (anonymized if needed)
    /// </summary>
    [MaxLength(500)]
    public string? SearchTerms { get; set; }

    /// <summary>
    /// Number of results returned
    /// </summary>
    public int ResultCount { get; set; }

    /// <summary>
    /// Execution time in milliseconds
    /// </summary>
    public int ExecutionTimeMs { get; set; }

    /// <summary>
    /// Whether cache was used
    /// </summary>
    public bool UsedCache { get; set; }

    /// <summary>
    /// Cache hit rate at time of search
    /// </summary>
    [Column(TypeName = "decimal(5,2)")]
    public decimal? CacheHitRate { get; set; }

    /// <summary>
    /// Number of times this query has been searched
    /// </summary>
    public int HitCount { get; set; }

    /// <summary>
    /// Search strategy that was most effective
    /// </summary>
    [MaxLength(50)]
    public string? EffectiveStrategy { get; set; }

    /// <summary>
    /// User clicked through to results
    /// </summary>
    public bool HasClickthrough { get; set; }

    /// <summary>
    /// Performance tier (Fast, Medium, Slow)
    /// </summary>
    [MaxLength(20)]
    public string PerformanceTier { get; set; } = "Medium";

    /// <summary>
    /// When this analytics record was created
    /// </summary>
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    /// <summary>
    /// SearchTerm alias for compatibility with PerformanceIndexConfiguration
    /// </summary>
    public string SearchTerm => SearchTerms ?? string.Empty;
    
    /// <summary>
    /// Date alias for compatibility with PerformanceIndexConfiguration
    /// </summary>
    public DateTime Date => CreatedAt.Date;

    /// <summary>
    /// Last time this query was executed
    /// </summary>
    public DateTime LastExecutedAt { get; set; } = DateTime.UtcNow;

    /// <summary>
    /// When this search was performed (alias for compatibility with BusinessAnalyticsController)
    /// </summary>
    [NotMapped]
    public DateTime SearchedAt => CreatedAt;
}