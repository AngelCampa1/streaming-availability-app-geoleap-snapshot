using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace GeoLeap.Api.Models;

/// <summary>
/// Content rating entity for 5-star rating system
/// </summary>
public class ContentRating
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public Guid UserId { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string ContentId { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(20)]
    public string ContentType { get; set; } = string.Empty; // movie, tv, documentary
    
    [Required]
    [Range(1, 5)]
    public int Rating { get; set; }
    
    [MaxLength(1000)]
    public string? Review { get; set; }
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation Properties
    public virtual User User { get; set; } = null!;
}

/// <summary>
/// User recommendation settings for personalization
/// </summary>
public class RecommendationSettings
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public Guid UserId { get; set; }
    
    // Preference settings
    public bool EnableRecommendations { get; set; } = true;
    public bool ShowTrendingContent { get; set; } = true;
    public bool ShowSimilarContent { get; set; } = true;
    public bool ShowPopularContent { get; set; } = true;
    
    // Content type preferences
    public bool IncludeMovies { get; set; } = true;
    public bool IncludeTvShows { get; set; } = true;
    public bool IncludeDocumentaries { get; set; } = true;
    public bool IncludeAnime { get; set; } = true;
    
    // Rating and content filters
    public decimal MinimumRating { get; set; } = 0.0m;
    public bool IncludeAdultContent { get; set; } = false;
    
    // Language preferences
    [MaxLength(1000)]
    public string? PreferredLanguages { get; set; } = "en"; // Comma-separated
    
    // Genre preferences (comma-separated)
    [MaxLength(2000)]
    public string? PreferredGenres { get; set; }
    
    [MaxLength(2000)]
    public string? ExcludedGenres { get; set; }
    
    // Recommendation algorithm settings
    public bool UseCollaborativeFiltering { get; set; } = true;
    public bool UseContentBasedFiltering { get; set; } = true;
    public bool UseTrendingBoost { get; set; } = true;
    
    // Dismissed content tracking
    [MaxLength(10000)]
    public string? DismissedContentIds { get; set; } // Comma-separated
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation Properties
    public virtual User User { get; set; } = null!;
}

/// <summary>
/// Recommendation result for API responses
/// </summary>
public class RecommendationResult
{
    public string ContentId { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Overview { get; set; }
    public decimal? Rating { get; set; }
    public int? ReleaseYear { get; set; }
    public List<string> Genres { get; set; } = new();
    public string? PosterUrl { get; set; }
    public string? BackdropUrl { get; set; }
    public double RecommendationScore { get; set; }
    public string RecommendationType { get; set; } = string.Empty; // trending, similar, popular, personalized
    public string RecommendationReason { get; set; } = string.Empty;
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
}

/// <summary>
/// DTO for content rating operations
/// </summary>
public class ContentRatingDto
{
    public Guid Id { get; set; }
    public string ContentId { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public int Rating { get; set; }
    public string? Review { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    
    // Content details for display
    public string? ContentTitle { get; set; }
    public string? ContentPosterUrl { get; set; }
    public int? ContentReleaseYear { get; set; }
}

/// <summary>
/// DTO for creating content ratings
/// </summary>
public class CreateContentRatingDto
{
    [Required]
    public string ContentId { get; set; } = string.Empty;
    
    [Required]
    public string ContentType { get; set; } = string.Empty;
    
    [Required]
    [Range(1, 5)]
    public int Rating { get; set; }
    
    [MaxLength(1000)]
    public string? Review { get; set; }
}

/// <summary>
/// DTO for updating content ratings
/// </summary>
public class UpdateContentRatingDto
{
    [Required]
    [Range(1, 5)]
    public int Rating { get; set; }
    
    [MaxLength(1000)]
    public string? Review { get; set; }
}

/// <summary>
/// DTO for recommendation settings
/// </summary>
public class RecommendationSettingsDto
{
    public Guid Id { get; set; }
    public bool EnableRecommendations { get; set; } = true;
    public bool ShowTrendingContent { get; set; } = true;
    public bool ShowSimilarContent { get; set; } = true;
    public bool ShowPopularContent { get; set; } = true;
    public bool IncludeMovies { get; set; } = true;
    public bool IncludeTvShows { get; set; } = true;
    public bool IncludeDocumentaries { get; set; } = true;
    public bool IncludeAnime { get; set; } = true;
    public decimal MinimumRating { get; set; } = 0.0m;
    public bool IncludeAdultContent { get; set; } = false;
    public List<string> PreferredLanguages { get; set; } = new() { "en" };
    public List<string> PreferredGenres { get; set; } = new();
    public List<string> ExcludedGenres { get; set; } = new();
    public bool UseCollaborativeFiltering { get; set; } = true;
    public bool UseContentBasedFiltering { get; set; } = true;
    public bool UseTrendingBoost { get; set; } = true;
    public DateTime UpdatedAt { get; set; }
}

/// <summary>
/// DTO for updating recommendation settings
/// </summary>
public class UpdateRecommendationSettingsDto
{
    public bool EnableRecommendations { get; set; } = true;
    public bool ShowTrendingContent { get; set; } = true;
    public bool ShowSimilarContent { get; set; } = true;
    public bool ShowPopularContent { get; set; } = true;
    public bool IncludeMovies { get; set; } = true;
    public bool IncludeTvShows { get; set; } = true;
    public bool IncludeDocumentaries { get; set; } = true;
    public bool IncludeAnime { get; set; } = true;
    
    [Range(0.0, 10.0)]
    public decimal MinimumRating { get; set; } = 0.0m;
    
    public bool IncludeAdultContent { get; set; } = false;
    public List<string> PreferredLanguages { get; set; } = new() { "en" };
    public List<string> PreferredGenres { get; set; } = new();
    public List<string> ExcludedGenres { get; set; } = new();
    public bool UseCollaborativeFiltering { get; set; } = true;
    public bool UseContentBasedFiltering { get; set; } = true;
    public bool UseTrendingBoost { get; set; } = true;
}

/// <summary>
/// Request for getting recommendations
/// </summary>
public class GetRecommendationsRequest
{
    public string RecommendationType { get; set; } = "all"; // trending, similar, popular, personalized, all
    public string? ContentId { get; set; } // For similar content recommendations
    public int Limit { get; set; } = 20;
    public int Page { get; set; } = 1;
    public List<string>? ContentTypes { get; set; } // Filter by content types
    public List<string>? Genres { get; set; } // Filter by genres
    public bool ExcludeDismissed { get; set; } = true;
    
    // US-8.5 Advanced filtering support
    public ContentSearchFilters? Filters { get; set; }
}

/// <summary>
/// Response for recommendations with pagination
/// </summary>
public class RecommendationsResponse
{
    public List<RecommendationResult> Recommendations { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public bool HasNextPage { get; set; }
    public string RecommendationType { get; set; } = string.Empty;
    public DateTime GeneratedAt { get; set; } = DateTime.UtcNow;
    public TimeSpan ResponseTime { get; set; }
}

/// <summary>
/// DTO for dismissing recommendations
/// </summary>
public class DismissRecommendationDto
{
    [Required]
    public string ContentId { get; set; } = string.Empty;
    
    public string? Reason { get; set; } // not_interested, already_watched, etc.
}

/// <summary>
/// DTO for providing feedback on recommendations
/// </summary>
public class RecommendationFeedbackDto
{
    [Required]
    public string ContentId { get; set; } = string.Empty;
    
    [Required]
    public string FeedbackType { get; set; } = string.Empty; // "liked", "disliked", "not_interested", "already_watched"
    
    [Range(0.0, 1.0)]
    public double Weight { get; set; } = 1.0;
}

/// <summary>
/// User content interaction for recommendation learning
/// </summary>
public class UserContentInteraction
{
    public Guid Id { get; set; } = Guid.NewGuid();
    
    [Required]
    public Guid UserId { get; set; }
    
    [Required]
    [MaxLength(50)]
    public string ContentId { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(20)]
    public string ContentType { get; set; } = string.Empty;
    
    [Required]
    [MaxLength(50)]
    public string InteractionType { get; set; } = string.Empty; // view, rate, add_to_watchlist, dismiss, search
    
    [MaxLength(200)]
    public string? InteractionValue { get; set; } // rating value, search query, etc.
    
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    
    // Navigation Properties
    public virtual User User { get; set; } = null!;
}