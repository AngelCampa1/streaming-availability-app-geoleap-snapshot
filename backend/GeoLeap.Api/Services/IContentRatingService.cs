using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service interface for content rating operations
/// </summary>
public interface IContentRatingService
{
    /// <summary>
    /// Rate content with 1-5 star rating
    /// </summary>
    Task<ContentRatingDto> RateContentAsync(Guid userId, CreateContentRatingDto dto);
    
    /// <summary>
    /// Update existing content rating
    /// </summary>
    Task<ContentRatingDto?> UpdateRatingAsync(Guid userId, Guid ratingId, UpdateContentRatingDto dto);
    
    /// <summary>
    /// Get user's rating for specific content
    /// </summary>
    Task<ContentRatingDto?> GetUserRatingAsync(Guid userId, string contentId, string contentType);
    
    /// <summary>
    /// Get all ratings by user with pagination
    /// </summary>
    Task<List<ContentRatingDto>> GetUserRatingsAsync(Guid userId, int page = 1, int pageSize = 20);
    
    /// <summary>
    /// Delete user's rating for content
    /// </summary>
    Task<bool> DeleteRatingAsync(Guid userId, Guid ratingId);
    
    /// <summary>
    /// Get average rating for content
    /// </summary>
    Task<(double averageRating, int totalRatings)> GetContentRatingStatsAsync(string contentId, string contentType);
    
    /// <summary>
    /// Get ratings for multiple content items
    /// </summary>
    Task<Dictionary<string, (double averageRating, int totalRatings)>> GetBulkContentRatingsAsync(List<string> contentIds, string contentType);
    
    /// <summary>
    /// Get user's content preferences based on ratings
    /// </summary>
    Task<UserContentPreferences> GetUserPreferencesFromRatingsAsync(Guid userId);
    
    /// <summary>
    /// Find users with similar rating patterns (for collaborative filtering)
    /// </summary>
    Task<List<Guid>> FindSimilarUsersAsync(Guid userId, int limit = 50);
    
    /// <summary>
    /// Get highly rated content by genre
    /// </summary>
    Task<List<string>> GetHighlyRatedContentByGenreAsync(List<string> genres, int limit = 20, double minRating = 4.0);
    
    /// <summary>
    /// Record user interaction with content (for recommendation learning)
    /// </summary>
    Task RecordInteractionAsync(Guid userId, string contentId, string contentType, string interactionType, string? value = null);
    
    /// <summary>
    /// Get user interaction history
    /// </summary>
    Task<List<UserContentInteraction>> GetUserInteractionsAsync(Guid userId, int days = 30);
}

/// <summary>
/// User content preferences derived from ratings and interactions
/// </summary>
public class UserContentPreferences
{
    public List<string> PreferredGenres { get; set; } = new();
    public List<string> DislikedGenres { get; set; } = new();
    public Dictionary<string, double> GenreAffinity { get; set; } = new(); // Genre -> Affinity score (0-1)
    public double AverageRating { get; set; }
    public int TotalRatings { get; set; }
    public List<string> PreferredContentTypes { get; set; } = new();
    public Dictionary<int, int> RatingsByYear { get; set; } = new(); // Year -> Rating count
    public List<string> PreferredLanguages { get; set; } = new();
    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;
}