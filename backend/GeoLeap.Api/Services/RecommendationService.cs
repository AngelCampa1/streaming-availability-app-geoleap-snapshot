using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service for content recommendation engine with collaborative filtering
/// </summary>
public class RecommendationService : IRecommendationService
{
    private readonly ApplicationDbContext _context;
    private readonly IContentService _contentService;
    private readonly IContentRatingService _ratingService;
    private readonly ICacheService _cacheService;
    private readonly ILogger<RecommendationService> _logger;

    public RecommendationService(
        ApplicationDbContext context,
        IContentService contentService,
        IContentRatingService ratingService,
        ICacheService cacheService,
        ILogger<RecommendationService> logger)
    {
        _context = context;
        _contentService = contentService;
        _ratingService = ratingService;
        _cacheService = cacheService;
        _logger = logger;
    }

    public async Task<RecommendationsResponse> GetPersonalizedRecommendationsAsync(Guid userId, GetRecommendationsRequest request)
    {
        try
        {
            var stopwatch = System.Diagnostics.Stopwatch.StartNew();
            
            var settings = await GetRecommendationSettingsAsync(userId);
            if (!settings.EnableRecommendations)
            {
                return new RecommendationsResponse
                {
                    Recommendations = new List<RecommendationResult>(),
                    RecommendationType = "personalized",
                    ResponseTime = stopwatch.Elapsed
                };
            }

            var cacheKey = $"personalized_recs_{userId}_{request.Page}_{request.Limit}";
            var cached = await _cacheService.GetAsync<List<RecommendationResult>>(cacheKey);
            if (cached != null && request.Page == 1)
            {
                return new RecommendationsResponse
                {
                    Recommendations = cached,
                    TotalCount = cached.Count,
                    Page = request.Page,
                    PageSize = request.Limit,
                    RecommendationType = "personalized",
                    ResponseTime = stopwatch.Elapsed
                };
            }

            var recommendations = new List<RecommendationResult>();

            // Get user preferences
            var userPreferences = await _ratingService.GetUserPreferencesFromRatingsAsync(userId);
            
            // Collaborative filtering recommendations
            if (settings.UseCollaborativeFiltering)
            {
                var collaborativeRecs = await GetCollaborativeFilteringRecommendationsAsync(userId, request.Limit / 2);
                recommendations.AddRange(collaborativeRecs);
            }

            // Content-based recommendations
            if (settings.UseContentBasedFiltering && userPreferences.PreferredGenres.Any())
            {
                var contentBasedRecs = await GetContentBasedRecommendationsAsync(userId, userPreferences, request.Limit / 2);
                recommendations.AddRange(contentBasedRecs);
            }

            // Apply user filters
            recommendations = await ApplyUserFiltersAsync(recommendations, settings, userId);

            // Remove duplicates and sort by score
            // FIXED: Week 1 Day 5 - Use FirstOrDefault to prevent exceptions when deduplicating recommendations
            recommendations = recommendations
                .GroupBy(r => r.ContentId)
                .Select(g => g.OrderByDescending(r => r.RecommendationScore).FirstOrDefault())
                .Where(r => r != null)
                .OrderByDescending(r => r.RecommendationScore)
                .Take(request.Limit)
                .ToList()!;

            // Cache for 1 hour
            if (request.Page == 1)
            {
                await _cacheService.SetAsync(cacheKey, recommendations, TimeSpan.FromHours(1));
            }

            stopwatch.Stop();

            return new RecommendationsResponse
            {
                Recommendations = recommendations,
                TotalCount = recommendations.Count,
                Page = request.Page,
                PageSize = request.Limit,
                HasNextPage = false, // For now, we don't support pagination for personalized
                RecommendationType = "personalized",
                ResponseTime = stopwatch.Elapsed
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting personalized recommendations for user {UserId}", userId);
            return new RecommendationsResponse { RecommendationType = "personalized" };
        }
    }

    public async Task<RecommendationsResponse> GetTrendingContentAsync(GetRecommendationsRequest request)
    {
        try
        {
            var stopwatch = System.Diagnostics.Stopwatch.StartNew();
            
            var cacheKey = $"trending_content_{request.Page}_{request.Limit}";
            var cached = await _cacheService.GetAsync<List<RecommendationResult>>(cacheKey);
            if (cached != null)
            {
                return new RecommendationsResponse
                {
                    Recommendations = cached,
                    TotalCount = cached.Count,
                    Page = request.Page,
                    PageSize = request.Limit,
                    RecommendationType = "trending",
                    ResponseTime = stopwatch.Elapsed
                };
            }

            // Get trending content from the last 7 days based on ratings and interactions
            var cutoffDate = DateTime.UtcNow.AddDays(-7);
            // ✅ PERFORMANCE: AsNoTracking for read-only recommendation query
            var trendingContent = await _context.Set<ContentRating>()
                .AsNoTracking()
                .Where(r => r.CreatedAt >= cutoffDate)
                .GroupBy(r => new { r.ContentId, r.ContentType })
                .Select(g => new
                {
                    g.Key.ContentId,
                    g.Key.ContentType,
                    RatingCount = g.Count(),
                    AverageRating = g.Average(r => r.Rating),
                    TrendingScore = g.Count() * g.Average(r => r.Rating) // Simple trending algorithm
                })
                .OrderByDescending(c => c.TrendingScore)
                .Skip((request.Page - 1) * request.Limit)
                .Take(request.Limit)
                .ToListAsync();

            var recommendations = new List<RecommendationResult>();
            foreach (var item in trendingContent)
            {
                var content = await _contentService.GetContentByIdAsync(item.ContentId, item.ContentType);
                if (content != null)
                {
                    recommendations.Add(new RecommendationResult
                    {
                        ContentId = content.Id,
                        ContentType = content.Type,
                        Title = content.Title,
                        Overview = content.Overview,
                        Rating = content.Rating,
                        ReleaseYear = content.ReleaseYear,
                        Genres = content.Genres,
                        PosterUrl = content.PosterUrl,
                        BackdropUrl = content.BackdropUrl,
                        RecommendationScore = item.TrendingScore,
                        RecommendationType = "trending",
                        RecommendationReason = $"Trending with {item.RatingCount} recent ratings (avg: {item.AverageRating:F1})"
                    });
                }
            }

            // Cache for 30 minutes (trending content changes more frequently)
            await _cacheService.SetAsync(cacheKey, recommendations, TimeSpan.FromMinutes(30));

            stopwatch.Stop();

            return new RecommendationsResponse
            {
                Recommendations = recommendations,
                TotalCount = recommendations.Count,
                Page = request.Page,
                PageSize = request.Limit,
                HasNextPage = recommendations.Count == request.Limit,
                RecommendationType = "trending",
                ResponseTime = stopwatch.Elapsed
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting trending content");
            return new RecommendationsResponse { RecommendationType = "trending" };
        }
    }

    public async Task<RecommendationsResponse> GetSimilarContentAsync(string contentId, string contentType, GetRecommendationsRequest request)
    {
        try
        {
            var stopwatch = System.Diagnostics.Stopwatch.StartNew();
            
            var cacheKey = $"similar_content_{contentId}_{contentType}_{request.Page}_{request.Limit}";
            var cached = await _cacheService.GetAsync<List<RecommendationResult>>(cacheKey);
            if (cached != null)
            {
                return new RecommendationsResponse
                {
                    Recommendations = cached,
                    TotalCount = cached.Count,
                    Page = request.Page,
                    PageSize = request.Limit,
                    RecommendationType = "similar",
                    ResponseTime = stopwatch.Elapsed
                };
            }

            // Get the source content
            var sourceContent = await _contentService.GetContentByIdAsync(contentId, contentType);
            if (sourceContent == null)
            {
                return new RecommendationsResponse { RecommendationType = "similar" };
            }

            // Find similar content based on genres, actors, and other metadata
            var similarContent = await _contentService.GetRelatedContentAsync(contentId, sourceContent.Genres.ToArray(), request.Limit * 2);
            
            var recommendations = new List<RecommendationResult>();
            var skip = (request.Page - 1) * request.Limit;
            
            foreach (var content in similarContent.Skip(skip).Take(request.Limit))
            {
                if (content.Id == contentId) continue; // Skip the source content

                // Calculate similarity score based on genre overlap and other factors
                var genreOverlap = content.Genres.Intersect(sourceContent.Genres).Count();
                var totalGenres = content.Genres.Union(sourceContent.Genres).Count();
                var genreSimilarity = totalGenres > 0 ? (double)genreOverlap / totalGenres : 0;

                var similarityScore = genreSimilarity * 100;

                recommendations.Add(new RecommendationResult
                {
                    ContentId = content.Id,
                    ContentType = content.Type,
                    Title = content.Title,
                    Overview = content.Overview,
                    Rating = content.Rating,
                    ReleaseYear = content.ReleaseYear,
                    Genres = content.Genres,
                    PosterUrl = content.PosterUrl,
                    BackdropUrl = content.BackdropUrl,
                    RecommendationScore = similarityScore,
                    RecommendationType = "similar",
                    RecommendationReason = $"Similar to '{sourceContent.Title}' ({genreOverlap} matching genres)"
                });
            }

            // Cache for 6 hours (similar content doesn't change often)
            await _cacheService.SetAsync(cacheKey, recommendations, TimeSpan.FromHours(6));

            stopwatch.Stop();

            return new RecommendationsResponse
            {
                Recommendations = recommendations,
                TotalCount = recommendations.Count,
                Page = request.Page,
                PageSize = request.Limit,
                HasNextPage = recommendations.Count == request.Limit,
                RecommendationType = "similar",
                ResponseTime = stopwatch.Elapsed
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting similar content for {ContentId}", contentId);
            return new RecommendationsResponse { RecommendationType = "similar" };
        }
    }

    public async Task<RecommendationsResponse> GetPopularContentAsync(GetRecommendationsRequest request)
    {
        try
        {
            var stopwatch = System.Diagnostics.Stopwatch.StartNew();
            
            var cacheKey = $"popular_content_{request.Page}_{request.Limit}";
            var cached = await _cacheService.GetAsync<List<RecommendationResult>>(cacheKey);
            if (cached != null)
            {
                return new RecommendationsResponse
                {
                    Recommendations = cached,
                    TotalCount = cached.Count,
                    Page = request.Page,
                    PageSize = request.Limit,
                    RecommendationType = "popular",
                    ResponseTime = stopwatch.Elapsed
                };
            }

            // Get popular content from content service
            var popularContent = await _contentService.GetPopularContentAsync("all", request.Limit * 2);
            
            var recommendations = new List<RecommendationResult>();
            var skip = (request.Page - 1) * request.Limit;
            
            foreach (var content in popularContent.Skip(skip).Take(request.Limit))
            {
                recommendations.Add(new RecommendationResult
                {
                    ContentId = content.Id,
                    ContentType = content.Type,
                    Title = content.Title,
                    Overview = content.Overview,
                    Rating = content.Rating,
                    ReleaseYear = content.ReleaseYear,
                    Genres = content.Genres,
                    PosterUrl = content.PosterUrl,
                    BackdropUrl = content.BackdropUrl,
                    RecommendationScore = (double)(content.Popularity),
                    RecommendationType = "popular",
                    RecommendationReason = "Popular content"
                });
            }

            // Cache for 2 hours
            await _cacheService.SetAsync(cacheKey, recommendations, TimeSpan.FromHours(2));

            stopwatch.Stop();

            return new RecommendationsResponse
            {
                Recommendations = recommendations,
                TotalCount = recommendations.Count,
                Page = request.Page,
                PageSize = request.Limit,
                HasNextPage = recommendations.Count == request.Limit,
                RecommendationType = "popular",
                ResponseTime = stopwatch.Elapsed
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting popular content");
            return new RecommendationsResponse { RecommendationType = "popular" };
        }
    }

    public async Task<RecommendationsResponse> GetMixedRecommendationsAsync(Guid userId, GetRecommendationsRequest request)
    {
        try
        {
            var stopwatch = System.Diagnostics.Stopwatch.StartNew();
            
            var settings = await GetRecommendationSettingsAsync(userId);
            var allRecommendations = new List<RecommendationResult>();

            // Get recommendations from different sources
            var personalizedTask = settings.EnableRecommendations ? 
                GetPersonalizedRecommendationsAsync(userId, new GetRecommendationsRequest { Limit = request.Limit / 3 }) :
                Task.FromResult(new RecommendationsResponse());

            var trendingTask = settings.ShowTrendingContent ?
                GetTrendingContentAsync(new GetRecommendationsRequest { Limit = request.Limit / 3 }) :
                Task.FromResult(new RecommendationsResponse());

            var popularTask = settings.ShowPopularContent ?
                GetPopularContentAsync(new GetRecommendationsRequest { Limit = request.Limit / 3 }) :
                Task.FromResult(new RecommendationsResponse());

            // Week 3 Day 1 - Optimize async result access (avoids .Result property)
            var results = await Task.WhenAll(personalizedTask, trendingTask, popularTask);

            allRecommendations.AddRange(results[0].Recommendations);
            allRecommendations.AddRange(results[1].Recommendations);
            allRecommendations.AddRange(results[2].Recommendations);

            // Remove duplicates and apply user filters
            // FIXED: Week 1 Day 5 - Use FirstOrDefault to prevent exceptions when merging recommendations
            allRecommendations = await ApplyUserFiltersAsync(allRecommendations, settings, userId);
            allRecommendations = allRecommendations
                .GroupBy(r => r.ContentId)
                .Select(g => g.OrderByDescending(r => r.RecommendationScore).FirstOrDefault())
                .Where(r => r != null)
                .OrderByDescending(r => r.RecommendationScore)
                .Take(request.Limit)
                .ToList()!;

            stopwatch.Stop();

            return new RecommendationsResponse
            {
                Recommendations = allRecommendations,
                TotalCount = allRecommendations.Count,
                Page = request.Page,
                PageSize = request.Limit,
                HasNextPage = false,
                RecommendationType = "mixed",
                ResponseTime = stopwatch.Elapsed
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting mixed recommendations for user {UserId}", userId);
            return new RecommendationsResponse { RecommendationType = "mixed" };
        }
    }

    public async Task<RecommendationSettingsDto> GetRecommendationSettingsAsync(Guid userId)
    {
        try
        {
            var settings = await _context.Set<RecommendationSettings>()
                .FirstOrDefaultAsync(s => s.UserId == userId);

            if (settings == null)
            {
                // Create default settings
                settings = new RecommendationSettings { UserId = userId };
                _context.Set<RecommendationSettings>().Add(settings);
                await _context.SaveChangesAsync();
            }

            return new RecommendationSettingsDto
            {
                Id = settings.Id,
                EnableRecommendations = settings.EnableRecommendations,
                ShowTrendingContent = settings.ShowTrendingContent,
                ShowSimilarContent = settings.ShowSimilarContent,
                ShowPopularContent = settings.ShowPopularContent,
                IncludeMovies = settings.IncludeMovies,
                IncludeTvShows = settings.IncludeTvShows,
                IncludeDocumentaries = settings.IncludeDocumentaries,
                IncludeAnime = settings.IncludeAnime,
                MinimumRating = settings.MinimumRating,
                IncludeAdultContent = settings.IncludeAdultContent,
                PreferredLanguages = settings.PreferredLanguages?.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList() ?? new List<string> { "en" },
                PreferredGenres = settings.PreferredGenres?.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList() ?? new List<string>(),
                ExcludedGenres = settings.ExcludedGenres?.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList() ?? new List<string>(),
                UseCollaborativeFiltering = settings.UseCollaborativeFiltering,
                UseContentBasedFiltering = settings.UseContentBasedFiltering,
                UseTrendingBoost = settings.UseTrendingBoost,
                UpdatedAt = settings.UpdatedAt
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting recommendation settings for user {UserId}", userId);
            return new RecommendationSettingsDto();
        }
    }

    public async Task<RecommendationSettingsDto> UpdateRecommendationSettingsAsync(Guid userId, UpdateRecommendationSettingsDto dto)
    {
        try
        {
            var settings = await _context.Set<RecommendationSettings>()
                .FirstOrDefaultAsync(s => s.UserId == userId);

            if (settings == null)
            {
                settings = new RecommendationSettings { UserId = userId };
                _context.Set<RecommendationSettings>().Add(settings);
            }

            // Update settings
            settings.EnableRecommendations = dto.EnableRecommendations;
            settings.ShowTrendingContent = dto.ShowTrendingContent;
            settings.ShowSimilarContent = dto.ShowSimilarContent;
            settings.ShowPopularContent = dto.ShowPopularContent;
            settings.IncludeMovies = dto.IncludeMovies;
            settings.IncludeTvShows = dto.IncludeTvShows;
            settings.IncludeDocumentaries = dto.IncludeDocumentaries;
            settings.IncludeAnime = dto.IncludeAnime;
            settings.MinimumRating = dto.MinimumRating;
            settings.IncludeAdultContent = dto.IncludeAdultContent;
            settings.PreferredLanguages = string.Join(",", dto.PreferredLanguages);
            settings.PreferredGenres = string.Join(",", dto.PreferredGenres);
            settings.ExcludedGenres = string.Join(",", dto.ExcludedGenres);
            settings.UseCollaborativeFiltering = dto.UseCollaborativeFiltering;
            settings.UseContentBasedFiltering = dto.UseContentBasedFiltering;
            settings.UseTrendingBoost = dto.UseTrendingBoost;
            settings.UpdatedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            // Clear user's recommendation cache
            await RefreshUserRecommendationsAsync(userId);

            return await GetRecommendationSettingsAsync(userId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating recommendation settings for user {UserId}", userId);
            throw;
        }
    }

    public async Task DismissRecommendationAsync(Guid userId, DismissRecommendationDto dto)
    {
        try
        {
            var settings = await _context.Set<RecommendationSettings>()
                .FirstOrDefaultAsync(s => s.UserId == userId);

            if (settings == null)
            {
                settings = new RecommendationSettings { UserId = userId };
                _context.Set<RecommendationSettings>().Add(settings);
            }

            var dismissedIds = settings.DismissedContentIds?.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList() ?? new List<string>();
            if (!dismissedIds.Contains(dto.ContentId))
            {
                dismissedIds.Add(dto.ContentId);
                settings.DismissedContentIds = string.Join(",", dismissedIds);
                settings.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }

            // Record interaction for learning
            await _ratingService.RecordInteractionAsync(userId, dto.ContentId, "unknown", "dismiss", dto.Reason);

            // Clear user's recommendation cache
            await RefreshUserRecommendationsAsync(userId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error dismissing recommendation for user {UserId}", userId);
            throw;
        }
    }

    public async Task<List<string>> GetDismissedContentAsync(Guid userId)
    {
        try
        {
            var settings = await _context.Set<RecommendationSettings>()
                .FirstOrDefaultAsync(s => s.UserId == userId);

            return settings?.DismissedContentIds?.Split(',', StringSplitOptions.RemoveEmptyEntries).ToList() ?? new List<string>();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting dismissed content for user {UserId}", userId);
            return new List<string>();
        }
    }

    public async Task ClearDismissedContentAsync(Guid userId)
    {
        try
        {
            var settings = await _context.Set<RecommendationSettings>()
                .FirstOrDefaultAsync(s => s.UserId == userId);

            if (settings != null)
            {
                settings.DismissedContentIds = null;
                settings.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
            }

            await RefreshUserRecommendationsAsync(userId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error clearing dismissed content for user {UserId}", userId);
            throw;
        }
    }

    public async Task TrainModelWithFeedbackAsync(Guid userId, string contentId, string feedbackType, double weight = 1.0)
    {
        try
        {
            // Record interaction for future model training
            await _ratingService.RecordInteractionAsync(userId, contentId, "unknown", $"feedback_{feedbackType}", weight.ToString());
            
            // Clear user's recommendation cache to reflect learning
            await RefreshUserRecommendationsAsync(userId);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error training model with feedback for user {UserId}", userId);
            // Don't throw - feedback is nice to have but not critical
        }
    }

    public async Task<string> GetRecommendationExplanationAsync(Guid userId, string contentId, string recommendationType)
    {
        try
        {
            return recommendationType switch
            {
                "personalized" => "Recommended based on your viewing history and ratings",
                "trending" => "Currently trending among all users",
                "popular" => "Popular content that many users enjoy",
                "similar" => "Similar to content you've previously rated highly",
                _ => "Recommended for you"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting recommendation explanation");
            return "Recommended for you";
        }
    }

    public async Task RefreshUserRecommendationsAsync(Guid userId)
    {
        try
        {
            // Clear all recommendation caches for the user
            var cacheKeys = new[]
            {
                $"personalized_recs_{userId}_1_20",
                $"user_preferences_{userId}"
            };

            foreach (var key in cacheKeys)
            {
                await _cacheService.RemoveAsync(key);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error refreshing recommendations for user {UserId}", userId);
        }
    }

    public async Task<RecommendationAnalytics> GetRecommendationAnalyticsAsync(DateTime? startDate = null, DateTime? endDate = null)
    {
        try
        {
            startDate ??= DateTime.UtcNow.AddDays(-30);
            endDate ??= DateTime.UtcNow;

            var analytics = new RecommendationAnalytics
            {
                GeneratedAt = DateTime.UtcNow,
                AnalysisTimespan = endDate.Value - startDate.Value
            };

            // Get basic stats
            analytics.TotalActiveUsers = await _context.Set<ContentRating>()
                .Where(r => r.CreatedAt >= startDate && r.CreatedAt <= endDate)
                .Select(r => r.UserId)
                .Distinct()
                .CountAsync();

            analytics.TotalRatings = await _context.Set<ContentRating>()
                .Where(r => r.CreatedAt >= startDate && r.CreatedAt <= endDate)
                .CountAsync();

            analytics.TotalInteractions = await _context.Set<UserContentInteraction>()
                .Where(i => i.CreatedAt >= startDate && i.CreatedAt <= endDate)
                .CountAsync();

            analytics.AverageRating = await _context.Set<ContentRating>()
                .Where(r => r.CreatedAt >= startDate && r.CreatedAt <= endDate)
                .AverageAsync(r => (double)r.Rating);

            return analytics;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting recommendation analytics");
            return new RecommendationAnalytics();
        }
    }

    public async Task<int> ValidateAndFixDataIntegrityAsync()
    {
        // Step 1: identify (UserId, ContentId) pairs that have more than one rating.
        var duplicateKeys = await _context.ContentRatings
            .GroupBy(r => new { r.UserId, r.ContentId })
            .Where(g => g.Count() > 1)
            .Select(g => new { g.Key.UserId, g.Key.ContentId })
            .ToListAsync();

        if (duplicateKeys.Count == 0)
            return 0;

        // Step 2: for each duplicate key, load all rows and keep only the most-recent one.
        var toRemove = new List<ContentRating>();
        foreach (var key in duplicateKeys)
        {
            var rows = await _context.ContentRatings
                .Where(r => r.UserId == key.UserId && r.ContentId == key.ContentId)
                .OrderByDescending(r => r.UpdatedAt)
                .ToListAsync();

            // Skip(1) keeps the newest row; everything else is a duplicate.
            toRemove.AddRange(rows.Skip(1));
        }

        if (toRemove.Count > 0)
        {
            _context.ContentRatings.RemoveRange(toRemove);
            await _context.SaveChangesAsync();
        }

        return toRemove.Count;
    }

    // Private helper methods

    private async Task<List<RecommendationResult>> GetCollaborativeFilteringRecommendationsAsync(Guid userId, int limit)
    {
        try
        {
            var similarUsers = await _ratingService.FindSimilarUsersAsync(userId, 20);
            if (!similarUsers.Any())
                return new List<RecommendationResult>();

            // Get content highly rated by similar users that this user hasn't rated
            // ✅ PERFORMANCE: AsNoTracking for read-only recommendation queries
            var userRatedContent = await _context.Set<ContentRating>()
                .AsNoTracking()
                .Where(r => r.UserId == userId)
                .Select(r => r.ContentId)
                .ToListAsync();

            var recommendations = await _context.Set<ContentRating>()
                .AsNoTracking()
                .Where(r => similarUsers.Contains(r.UserId) && !userRatedContent.Contains(r.ContentId) && r.Rating >= 4)
                .GroupBy(r => new { r.ContentId, r.ContentType })
                .Select(g => new
                {
                    g.Key.ContentId,
                    g.Key.ContentType,
                    AverageRating = g.Average(r => r.Rating),
                    RatingCount = g.Count()
                })
                .OrderByDescending(r => r.AverageRating)
                .ThenByDescending(r => r.RatingCount)
                .Take(limit)
                .ToListAsync();

            var results = new List<RecommendationResult>();
            foreach (var rec in recommendations)
            {
                var content = await _contentService.GetContentByIdAsync(rec.ContentId, rec.ContentType);
                if (content != null)
                {
                    results.Add(new RecommendationResult
                    {
                        ContentId = content.Id,
                        ContentType = content.Type,
                        Title = content.Title,
                        Overview = content.Overview,
                        Rating = content.Rating,
                        ReleaseYear = content.ReleaseYear,
                        Genres = content.Genres,
                        PosterUrl = content.PosterUrl,
                        BackdropUrl = content.BackdropUrl,
                        RecommendationScore = rec.AverageRating * 20, // Scale to 0-100
                        RecommendationType = "collaborative",
                        RecommendationReason = $"Loved by similar users (avg: {rec.AverageRating:F1}/5)"
                    });
                }
            }

            return results;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting collaborative filtering recommendations for user {UserId}", userId);
            return new List<RecommendationResult>();
        }
    }

    private async Task<List<RecommendationResult>> GetContentBasedRecommendationsAsync(Guid userId, UserContentPreferences preferences, int limit)
    {
        try
        {
            var recommendedContentIds = await _ratingService.GetHighlyRatedContentByGenreAsync(preferences.PreferredGenres, limit);
            
            var results = new List<RecommendationResult>();
            foreach (var contentId in recommendedContentIds)
            {
                var content = await _contentService.GetContentByIdAsync(contentId, "movie"); // Assuming movie, could be improved
                if (content != null)
                {
                    // Calculate content-based score
                    var genreMatch = content.Genres.Intersect(preferences.PreferredGenres).Count();
                    var score = (double)genreMatch / preferences.PreferredGenres.Count * 100;

                    results.Add(new RecommendationResult
                    {
                        ContentId = content.Id,
                        ContentType = content.Type,
                        Title = content.Title,
                        Overview = content.Overview,
                        Rating = content.Rating,
                        ReleaseYear = content.ReleaseYear,
                        Genres = content.Genres,
                        PosterUrl = content.PosterUrl,
                        BackdropUrl = content.BackdropUrl,
                        RecommendationScore = score,
                        RecommendationType = "content_based",
                        RecommendationReason = $"Matches your preferred genres: {string.Join(", ", content.Genres.Intersect(preferences.PreferredGenres))}"
                    });
                }
            }

            return results;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting content-based recommendations for user {UserId}", userId);
            return new List<RecommendationResult>();
        }
    }

    private async Task<List<RecommendationResult>> ApplyUserFiltersAsync(List<RecommendationResult> recommendations, RecommendationSettingsDto settings, Guid userId)
    {
        try
        {
            var filtered = recommendations.AsEnumerable();

            // Filter by content types
            if (!settings.IncludeMovies)
                filtered = filtered.Where(r => r.ContentType != "movie");
            if (!settings.IncludeTvShows)
                filtered = filtered.Where(r => r.ContentType != "tv");
            if (!settings.IncludeDocumentaries)
                filtered = filtered.Where(r => r.ContentType != "documentary");
            if (!settings.IncludeAnime)
                filtered = filtered.Where(r => !r.Genres.Contains("anime", StringComparer.OrdinalIgnoreCase));

            // Filter by minimum rating
            if (settings.MinimumRating > 0)
                filtered = filtered.Where(r => r.Rating >= settings.MinimumRating);

            // Filter by excluded genres
            if (settings.ExcludedGenres.Any())
                filtered = filtered.Where(r => !r.Genres.Any(g => settings.ExcludedGenres.Contains(g, StringComparer.OrdinalIgnoreCase)));

            // Filter out dismissed content
            var dismissedContent = await GetDismissedContentAsync(userId);
            if (dismissedContent.Any())
                filtered = filtered.Where(r => !dismissedContent.Contains(r.ContentId));

            return filtered.ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error applying user filters");
            return recommendations;
        }
    }

    // US-8.5 Filter support methods
    public async Task<FilterOptionsResponse> GetAvailableFilterOptionsAsync(string contentType = "all", string region = "US")
    {
        try
        {
            // Delegate to ContentFilterService via DI if available, otherwise provide basic implementation
            var response = new FilterOptionsResponse();
            
            // Basic implementation - in production this would delegate to a proper service
            response.Genres = await GetAvailableGenresAsync(contentType, region);
            response.StreamingServices = await GetAvailableStreamingServicesAsync(region);
            response.AvailableYearRange = await GetAvailableYearRangesAsync(contentType);
            
            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting filter options");
            return new FilterOptionsResponse();
        }
    }

    public async Task<List<FilterOption>> GetAvailableGenresAsync(string contentType = "all", string region = "US")
    {
        try
        {
            // Basic implementation - in production this would query the actual content database
            return new List<FilterOption>
            {
                new() { Value = "Action", Label = "Action", Count = 150, IsPopular = true },
                new() { Value = "Comedy", Label = "Comedy", Count = 120, IsPopular = true },
                new() { Value = "Drama", Label = "Drama", Count = 200, IsPopular = true },
                new() { Value = "Horror", Label = "Horror", Count = 80, IsPopular = false },
                new() { Value = "Romance", Label = "Romance", Count = 90, IsPopular = false },
                new() { Value = "Sci-Fi", Label = "Science Fiction", Count = 70, IsPopular = false }
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting available genres");
            return new List<FilterOption>();
        }
    }

    public async Task<List<FilterOption>> GetAvailableStreamingServicesAsync(string region = "US")
    {
        try
        {
            // Basic implementation - in production this would query the streaming options
            return new List<FilterOption>
            {
                new() { Value = "netflix", Label = "Netflix", Count = 1000, IsPopular = true },
                new() { Value = "disney_plus", Label = "Disney+", Count = 800, IsPopular = true },
                new() { Value = "amazon_prime", Label = "Amazon Prime Video", Count = 900, IsPopular = true },
                new() { Value = "hbo_max", Label = "HBO Max", Count = 600, IsPopular = true },
                new() { Value = "hulu", Label = "Hulu", Count = 500, IsPopular = false },
                new() { Value = "apple_tv", Label = "Apple TV+", Count = 300, IsPopular = false }
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting available streaming services");
            return new List<FilterOption>();
        }
    }

    public async Task<YearRange> GetAvailableYearRangesAsync(string contentType = "all")
    {
        try
        {
            // Basic implementation - in production this would query the content database
            return new YearRange
            {
                MinYear = 1950,
                MaxYear = DateTime.Now.Year + 1,
                MostCommonYear = DateTime.Now.Year - 2
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting year ranges");
            return new YearRange
            {
                MinYear = 1950,
                MaxYear = DateTime.Now.Year + 1,
                MostCommonYear = DateTime.Now.Year
            };
        }
    }
}