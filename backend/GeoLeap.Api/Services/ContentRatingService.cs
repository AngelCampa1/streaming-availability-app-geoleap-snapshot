using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service for content rating operations with 5-star rating system
/// </summary>
public class ContentRatingService : IContentRatingService
{
    private readonly ApplicationDbContext _context;
    private readonly IContentService _contentService;
    private readonly ICacheService _cacheService;
    private readonly ILogger<ContentRatingService> _logger;

    public ContentRatingService(
        ApplicationDbContext context,
        IContentService contentService,
        ICacheService cacheService,
        ILogger<ContentRatingService> logger)
    {
        _context = context;
        _contentService = contentService;
        _cacheService = cacheService;
        _logger = logger;
    }

    public async Task<ContentRatingDto> RateContentAsync(Guid userId, CreateContentRatingDto dto)
    {
        try
        {
            // Check if user already rated this content
            var existingRating = await _context.Set<ContentRating>()
                .FirstOrDefaultAsync(r => r.UserId == userId && r.ContentId == dto.ContentId && r.ContentType == dto.ContentType);

            ContentRating rating;
            if (existingRating != null)
            {
                // Update existing rating
                existingRating.Rating = dto.Rating;
                existingRating.Review = dto.Review;
                existingRating.UpdatedAt = DateTime.UtcNow;
                rating = existingRating;
            }
            else
            {
                // Create new rating
                rating = new ContentRating
                {
                    UserId = userId,
                    ContentId = dto.ContentId,
                    ContentType = dto.ContentType,
                    Rating = dto.Rating,
                    Review = dto.Review
                };
                _context.Set<ContentRating>().Add(rating);
            }

            await _context.SaveChangesAsync();

            // Record interaction for recommendation learning
            await RecordInteractionAsync(userId, dto.ContentId, dto.ContentType, "rate", dto.Rating.ToString());

            // Clear rating cache
            var cacheKey = $"content_rating_{dto.ContentId}_{dto.ContentType}";
            await _cacheService.RemoveAsync(cacheKey);

            // Get content details for response
            var content = await _contentService.GetContentByIdAsync(dto.ContentId, dto.ContentType);

            return new ContentRatingDto
            {
                Id = rating.Id,
                ContentId = rating.ContentId,
                ContentType = rating.ContentType,
                Rating = rating.Rating,
                Review = rating.Review,
                CreatedAt = rating.CreatedAt,
                UpdatedAt = rating.UpdatedAt,
                ContentTitle = content?.Title,
                ContentPosterUrl = content?.PosterUrl,
                ContentReleaseYear = content?.ReleaseYear
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error rating content {ContentId} for user {UserId}", dto.ContentId, userId);
            throw;
        }
    }

    public async Task<ContentRatingDto?> UpdateRatingAsync(Guid userId, Guid ratingId, UpdateContentRatingDto dto)
    {
        try
        {
            var rating = await _context.Set<ContentRating>()
                .FirstOrDefaultAsync(r => r.Id == ratingId && r.UserId == userId);

            if (rating == null)
                return null;

            rating.Rating = dto.Rating;
            rating.Review = dto.Review;
            rating.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Record interaction
            await RecordInteractionAsync(userId, rating.ContentId, rating.ContentType, "rate_update", dto.Rating.ToString());

            // Clear cache
            var cacheKey = $"content_rating_{rating.ContentId}_{rating.ContentType}";
            await _cacheService.RemoveAsync(cacheKey);

            // Get content details for response
            var content = await _contentService.GetContentByIdAsync(rating.ContentId, rating.ContentType);

            return new ContentRatingDto
            {
                Id = rating.Id,
                ContentId = rating.ContentId,
                ContentType = rating.ContentType,
                Rating = rating.Rating,
                Review = rating.Review,
                CreatedAt = rating.CreatedAt,
                UpdatedAt = rating.UpdatedAt,
                ContentTitle = content?.Title,
                ContentPosterUrl = content?.PosterUrl,
                ContentReleaseYear = content?.ReleaseYear
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating rating {RatingId} for user {UserId}", ratingId, userId);
            throw;
        }
    }

    public async Task<ContentRatingDto?> GetUserRatingAsync(Guid userId, string contentId, string contentType)
    {
        try
        {
            var rating = await _context.Set<ContentRating>()
                .FirstOrDefaultAsync(r => r.UserId == userId && r.ContentId == contentId && r.ContentType == contentType);

            if (rating == null)
                return null;

            // Get content details for response
            var content = await _contentService.GetContentByIdAsync(contentId, contentType);

            return new ContentRatingDto
            {
                Id = rating.Id,
                ContentId = rating.ContentId,
                ContentType = rating.ContentType,
                Rating = rating.Rating,
                Review = rating.Review,
                CreatedAt = rating.CreatedAt,
                UpdatedAt = rating.UpdatedAt,
                ContentTitle = content?.Title,
                ContentPosterUrl = content?.PosterUrl,
                ContentReleaseYear = content?.ReleaseYear
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting user rating for content {ContentId}", contentId);
            throw;
        }
    }

    public async Task<List<ContentRatingDto>> GetUserRatingsAsync(Guid userId, int page = 1, int pageSize = 20)
    {
        try
        {
            var ratings = await _context.Set<ContentRating>()
                .Where(r => r.UserId == userId)
                .OrderByDescending(r => r.UpdatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();

            var result = new List<ContentRatingDto>();
            foreach (var rating in ratings)
            {
                var content = await _contentService.GetContentByIdAsync(rating.ContentId, rating.ContentType);
                result.Add(new ContentRatingDto
                {
                    Id = rating.Id,
                    ContentId = rating.ContentId,
                    ContentType = rating.ContentType,
                    Rating = rating.Rating,
                    Review = rating.Review,
                    CreatedAt = rating.CreatedAt,
                    UpdatedAt = rating.UpdatedAt,
                    ContentTitle = content?.Title,
                    ContentPosterUrl = content?.PosterUrl,
                    ContentReleaseYear = content?.ReleaseYear
                });
            }

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting user ratings for user {UserId}", userId);
            throw;
        }
    }

    public async Task<bool> DeleteRatingAsync(Guid userId, Guid ratingId)
    {
        try
        {
            var rating = await _context.Set<ContentRating>()
                .FirstOrDefaultAsync(r => r.Id == ratingId && r.UserId == userId);

            if (rating == null)
                return false;

            _context.Set<ContentRating>().Remove(rating);
            await _context.SaveChangesAsync();

            // Record interaction
            await RecordInteractionAsync(userId, rating.ContentId, rating.ContentType, "unrate");

            // Clear cache
            var cacheKey = $"content_rating_{rating.ContentId}_{rating.ContentType}";
            await _cacheService.RemoveAsync(cacheKey);

            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting rating {RatingId} for user {UserId}", ratingId, userId);
            throw;
        }
    }

    public async Task<(double averageRating, int totalRatings)> GetContentRatingStatsAsync(string contentId, string contentType)
    {
        try
        {
            var cacheKey = $"content_rating_{contentId}_{contentType}";
            var cached = await _cacheService.GetAsync<(double, int)?>(cacheKey);
            if (cached.HasValue)
                return cached.Value;

            var ratings = await _context.Set<ContentRating>()
                .Where(r => r.ContentId == contentId && r.ContentType == contentType)
                .Select(r => r.Rating)
                .ToListAsync();

            var averageRating = ratings.Any() ? ratings.Average() : 0.0;
            var totalRatings = ratings.Count;

            // Cache for 1 hour
            await _cacheService.SetAsync(cacheKey, (averageRating, totalRatings), TimeSpan.FromHours(1));

            return (averageRating, totalRatings);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting rating stats for content {ContentId}", contentId);
            return (0.0, 0);
        }
    }

    public async Task<Dictionary<string, (double averageRating, int totalRatings)>> GetBulkContentRatingsAsync(List<string> contentIds, string contentType)
    {
        try
        {
            var result = new Dictionary<string, (double averageRating, int totalRatings)>();

            var ratings = await _context.Set<ContentRating>()
                .Where(r => contentIds.Contains(r.ContentId) && r.ContentType == contentType)
                .GroupBy(r => r.ContentId)
                .Select(g => new 
                {
                    ContentId = g.Key,
                    AverageRating = g.Average(r => r.Rating),
                    TotalRatings = g.Count()
                })
                .ToListAsync();

            foreach (var rating in ratings)
            {
                result[rating.ContentId] = (rating.AverageRating, rating.TotalRatings);
            }

            // Add zero ratings for content without ratings
            foreach (var contentId in contentIds)
            {
                if (!result.ContainsKey(contentId))
                {
                    result[contentId] = (0.0, 0);
                }
            }

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting bulk content ratings");
            return contentIds.ToDictionary(id => id, _ => (0.0, 0));
        }
    }

    public async Task<UserContentPreferences> GetUserPreferencesFromRatingsAsync(Guid userId)
    {
        try
        {
            var cacheKey = $"user_preferences_{userId}";
            var cached = await _cacheService.GetAsync<UserContentPreferences>(cacheKey);
            if (cached != null)
                return cached;

            var ratings = await _context.Set<ContentRating>()
                .Where(r => r.UserId == userId)
                .ToListAsync();

            if (!ratings.Any())
                return new UserContentPreferences();

            var preferences = new UserContentPreferences
            {
                TotalRatings = ratings.Count,
                AverageRating = ratings.Average(r => r.Rating)
            };

            // Get content details and analyze preferences
            var contentDetails = new List<(ContentRating rating, ContentData? content)>();
            foreach (var rating in ratings)
            {
                var content = await _contentService.GetContentByIdAsync(rating.ContentId, rating.ContentType);
                contentDetails.Add((rating, content));
            }

            // Analyze genre preferences
            var genreRatings = new Dictionary<string, List<int>>();
            foreach (var (rating, content) in contentDetails.Where(x => x.content != null))
            {
                foreach (var genre in content!.Genres)
                {
                    if (!genreRatings.ContainsKey(genre))
                        genreRatings[genre] = new List<int>();
                    genreRatings[genre].Add(rating.Rating);
                }
            }

            preferences.GenreAffinity = genreRatings.ToDictionary(
                kvp => kvp.Key,
                kvp => kvp.Value.Average() / 5.0 // Normalize to 0-1
            );

            preferences.PreferredGenres = preferences.GenreAffinity
                .Where(kvp => kvp.Value >= 0.6) // 3+ stars average
                .OrderByDescending(kvp => kvp.Value)
                .Select(kvp => kvp.Key)
                .ToList();

            preferences.DislikedGenres = preferences.GenreAffinity
                .Where(kvp => kvp.Value < 0.4) // Less than 2 stars average
                .Select(kvp => kvp.Key)
                .ToList();

            // Analyze content type preferences
            var contentTypeRatings = contentDetails
                .Where(x => x.content != null)
                .GroupBy(x => x.content!.Type)
                .Where(g => g.Average(x => x.rating.Rating) >= 3)
                .OrderByDescending(g => g.Average(x => x.rating.Rating))
                .Select(g => g.Key)
                .ToList();

            preferences.PreferredContentTypes = contentTypeRatings;

            // Cache for 6 hours
            await _cacheService.SetAsync(cacheKey, preferences, TimeSpan.FromHours(6));

            return preferences;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting user preferences for user {UserId}", userId);
            return new UserContentPreferences();
        }
    }

    public async Task<List<Guid>> FindSimilarUsersAsync(Guid userId, int limit = 50)
    {
        try
        {
            // Get user's ratings
            var userRatings = await _context.Set<ContentRating>()
                .Where(r => r.UserId == userId)
                .ToDictionaryAsync(r => $"{r.ContentId}_{r.ContentType}", r => r.Rating);

            if (!userRatings.Any())
                return new List<Guid>();

            // Find users who rated similar content
            var commonContentIds = userRatings.Keys.ToList();
            var similarUsers = await _context.Set<ContentRating>()
                .Where(r => r.UserId != userId && commonContentIds.Contains($"{r.ContentId}_{r.ContentType}"))
                .GroupBy(r => r.UserId)
                .Where(g => g.Count() >= Math.Min(3, userRatings.Count / 2)) // At least 3 common ratings or half of user's ratings
                .Select(g => new
                {
                    UserId = g.Key,
                    CommonRatings = g.ToDictionary(r => $"{r.ContentId}_{r.ContentType}", r => r.Rating)
                })
                .ToListAsync();

            // Calculate similarity using Pearson correlation
            var similarities = new List<(Guid userId, double similarity)>();
            foreach (var user in similarUsers)
            {
                var similarity = CalculatePearsonCorrelation(userRatings, user.CommonRatings);
                if (similarity > 0.1) // Only include users with positive correlation
                {
                    similarities.Add((user.UserId, similarity));
                }
            }

            return similarities
                .OrderByDescending(s => s.similarity)
                .Take(limit)
                .Select(s => s.userId)
                .ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error finding similar users for user {UserId}", userId);
            return new List<Guid>();
        }
    }

    public async Task<List<string>> GetHighlyRatedContentByGenreAsync(List<string> genres, int limit = 20, double minRating = 4.0)
    {
        try
        {
            var cacheKey = $"highly_rated_content_{string.Join("_", genres)}_{limit}_{minRating}";
            var cached = await _cacheService.GetAsync<List<string>>(cacheKey);
            if (cached != null)
                return cached;

            // Get content with high average ratings
            var highlyRatedContent = await _context.Set<ContentRating>()
                .GroupBy(r => new { r.ContentId, r.ContentType })
                .Where(g => g.Average(r => r.Rating) >= minRating && g.Count() >= 5) // At least 5 ratings
                .Select(g => new { g.Key.ContentId, g.Key.ContentType, AvgRating = g.Average(r => r.Rating) })
                .OrderByDescending(c => c.AvgRating)
                .Take(limit * 3) // Get more to filter by genre
                .ToListAsync();

            var result = new List<string>();
            foreach (var content in highlyRatedContent)
            {
                var contentData = await _contentService.GetContentByIdAsync(content.ContentId, content.ContentType);
                if (contentData != null && contentData.Genres.Any(g => genres.Contains(g)))
                {
                    result.Add(content.ContentId);
                    if (result.Count >= limit)
                        break;
                }
            }

            // Cache for 2 hours
            await _cacheService.SetAsync(cacheKey, result, TimeSpan.FromHours(2));

            return result;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting highly rated content by genre");
            return new List<string>();
        }
    }

    public async Task RecordInteractionAsync(Guid userId, string contentId, string contentType, string interactionType, string? value = null)
    {
        try
        {
            var interaction = new UserContentInteraction
            {
                UserId = userId,
                ContentId = contentId,
                ContentType = contentType,
                InteractionType = interactionType,
                InteractionValue = value
            };

            _context.Set<UserContentInteraction>().Add(interaction);
            await _context.SaveChangesAsync();

            // Clear user preferences cache to refresh with new interaction
            var userPrefCacheKey = $"user_preferences_{userId}";
            await _cacheService.RemoveAsync(userPrefCacheKey);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error recording interaction for user {UserId}", userId);
            // Don't throw - interactions are nice to have but not critical
        }
    }

    public async Task<List<UserContentInteraction>> GetUserInteractionsAsync(Guid userId, int days = 30)
    {
        try
        {
            var cutoffDate = DateTime.UtcNow.AddDays(-days);
            return await _context.Set<UserContentInteraction>()
                .Where(i => i.UserId == userId && i.CreatedAt >= cutoffDate)
                .OrderByDescending(i => i.CreatedAt)
                .ToListAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting user interactions for user {UserId}", userId);
            return new List<UserContentInteraction>();
        }
    }

    private static double CalculatePearsonCorrelation(Dictionary<string, int> ratingsX, Dictionary<string, int> ratingsY)
    {
        var commonItems = ratingsX.Keys.Intersect(ratingsY.Keys).ToList();
        if (commonItems.Count < 2)
            return 0;

        var sumX = commonItems.Sum(item => ratingsX[item]);
        var sumY = commonItems.Sum(item => ratingsY[item]);
        var sumXY = commonItems.Sum(item => ratingsX[item] * ratingsY[item]);
        var sumX2 = commonItems.Sum(item => ratingsX[item] * ratingsX[item]);
        var sumY2 = commonItems.Sum(item => ratingsY[item] * ratingsY[item]);

        var n = commonItems.Count;
        var numerator = sumXY - (sumX * sumY / n);
        var denominator = Math.Sqrt((sumX2 - sumX * sumX / n) * (sumY2 - sumY * sumY / n));

        return denominator == 0 ? 0 : numerator / denominator;
    }
}