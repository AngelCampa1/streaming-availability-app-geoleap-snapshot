using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using Microsoft.Extensions.Caching.Distributed;

namespace GeoLeap.Api.Services;

/// <summary>
/// Simple, maintainable social recommendation engine focused on basic social features
/// </summary>
public class EnhancedSocialRecommendationEngine : ISocialRecommendationEngine
{
    private readonly ApplicationDbContext _context;
    private readonly ILoggerService _logger;
    private readonly IConfiguration _configuration;
    private readonly IDistributedCache _cache;

    // Simple scoring weights for different recommendation sources
    private readonly double _friendActivityWeight = 0.4;
    private readonly double _popularContentWeight = 0.3;
    private readonly double _recentActivityWeight = 0.2;
    private readonly double _userInterestWeight = 0.1;
    
    // Caching configurations
    private readonly TimeSpan _cacheExpiry = TimeSpan.FromMinutes(30);
    private readonly string _cacheKeyPrefix = "simple_rec:";

    public EnhancedSocialRecommendationEngine(
        ApplicationDbContext context,
        ILoggerService logger,
        IConfiguration configuration,
        IDistributedCache cache)
    {
        _context = context;
        _logger = logger;
        _configuration = configuration;
        _cache = cache;
    }

    public async Task<List<ContentRecommendation>> GetPersonalizedRecommendationsAsync(Guid userId, int limit = 20, string? type = null)
    {
        try
        {
            // Check cache first
            var cacheKey = $"{_cacheKeyPrefix}personal:{userId}:{limit}:{type}";
            var cachedRecommendations = await GetCachedRecommendationsAsync(cacheKey);
            if (cachedRecommendations?.Any() == true)
            {
                await _logger.LogAsync("INFO", $"Returning cached recommendations for user {userId}");
                return cachedRecommendations;
            }

            var recommendations = new List<ContentRecommendation>();

            // 1. Get friend activity recommendations (40% weight)
            var friendRecs = await GetSimpleFriendRecommendationsAsync(userId, limit / 2);
            recommendations.AddRange(friendRecs.Select(r => new ContentRecommendation
            {
                ContentId = r.ContentId,
                ContentType = r.ContentType,
                Title = r.Title,
                Score = r.Score * _friendActivityWeight,
                Reason = r.Reason,
                SourcePlatforms = r.SourcePlatforms
            }));

            // 2. Get popular content recommendations (30% weight)
            var popularRecs = await GetSimplePopularContentAsync(userId, limit / 3);
            recommendations.AddRange(popularRecs.Select(r => new ContentRecommendation
            {
                ContentId = r.ContentId,
                ContentType = r.ContentType,
                Title = r.Title,
                Score = r.Score * _popularContentWeight,
                Reason = "Popular with many users",
                SourcePlatforms = new[] { "popular" }
            }));

            // 3. Get recent activity based recommendations (20% weight)
            var recentRecs = await GetSimpleRecentActivityRecommendationsAsync(userId, limit / 4);
            recommendations.AddRange(recentRecs.Select(r => new ContentRecommendation
            {
                ContentId = r.ContentId,
                ContentType = r.ContentType,
                Title = r.Title,
                Score = r.Score * _recentActivityWeight,
                Reason = "Based on your recent activity",
                SourcePlatforms = new[] { "recent-activity" }
            }));

            // 4. Get interest-based recommendations (10% weight)
            var interestRecs = await GetSimpleInterestBasedRecommendationsAsync(userId, limit / 5);
            recommendations.AddRange(interestRecs.Select(r => new ContentRecommendation
            {
                ContentId = r.ContentId,
                ContentType = r.ContentType,
                Title = r.Title,
                Score = r.Score * _userInterestWeight,
                Reason = "Matches your interests",
                SourcePlatforms = new[] { "interests" }
            }));

            // Filter by type if specified
            if (!string.IsNullOrEmpty(type))
            {
                recommendations = recommendations
                    .Where(r => r.ContentType.Equals(type, StringComparison.OrdinalIgnoreCase))
                    .ToList();
            }

            // Remove duplicates and sort by score
            // FIXED: Week 1 Day 5 - Use FirstOrDefault to prevent exceptions when finalizing social recommendations
            var finalRecommendations = recommendations
                .GroupBy(r => r.ContentId)
                .Select(g => g.OrderByDescending(r => r.Score).FirstOrDefault())
                .Where(r => r != null)
                .OrderByDescending(r => r.Score)
                .Take(limit)
                .ToList()!;

            // Cache recommendations
            await CacheRecommendationsAsync(cacheKey, finalRecommendations);

            await _logger.LogAsync("INFO", 
                $"Generated {finalRecommendations.Count} simple recommendations for user {userId}");

            return finalRecommendations;
        }
        catch (Exception ex)
        {
            await _logger.LogAsync("ERROR", $"Failed to generate recommendations for user {userId}: {ex.Message}");
            return new List<ContentRecommendation>();
        }
    }

    public async Task<List<ContentRecommendation>> GetTrendingContentAsync(int limit = 20, TimeSpan? timeWindow = null)
    {
        try
        {
            var window = timeWindow ?? TimeSpan.FromDays(1); // Default to 24 hours for better trending detection
            var cutoffDate = DateTime.UtcNow - window;

            // Simple trending calculation: high engagement in last 24 hours
            var trendingContent = await _context.SocialContentShares
                .Where(scs => scs.SharedAt >= cutoffDate)
                .GroupBy(scs => new { scs.ContentId, scs.ContentType, scs.ContentTitle })
                .Select(g => new
                {
                    g.Key.ContentId,
                    g.Key.ContentType,
                    g.Key.ContentTitle,
                    ShareCount = g.Count(),
                    TotalEngagement = g.Sum(s => s.LikesCount + s.CommentsCount + s.SharesCount),
                    UniqueUsers = g.Select(s => s.UserId).Distinct().Count()
                })
                .Where(c => c.ShareCount >= 3) // Minimum threshold for trending
                .OrderByDescending(c => c.ShareCount + (c.TotalEngagement / 10) + (c.UniqueUsers * 2))
                .Take(limit)
                .ToListAsync();

            var recommendations = trendingContent.Select(content => new ContentRecommendation
            {
                ContentId = content.ContentId,
                ContentType = content.ContentType,
                Title = content.ContentTitle,
                Score = Math.Min(1.0, (content.ShareCount + content.TotalEngagement + content.UniqueUsers) / 100.0),
                Reason = $"Trending: {content.ShareCount} shares, {content.TotalEngagement} engagement",
                SourcePlatforms = new[] { "trending" }
            }).ToList();

            await _logger.LogAsync("INFO", $"Generated {recommendations.Count} trending recommendations");

            return recommendations;
        }
        catch (Exception ex)
        {
            await _logger.LogAsync("ERROR", $"Failed to get trending content: {ex.Message}");
            return new List<ContentRecommendation>();
        }
    }

    public async Task<List<ContentRecommendation>> GetFriendRecommendationsAsync(Guid userId, int limit = 20)
    {
        return await GetSimpleFriendRecommendationsAsync(userId, limit);
    }

    public async Task<RecommendationPerformanceMetrics> GetRecommendationMetricsAsync(Guid userId, DateTime? since = null)
    {
        try
        {
            var startDate = since ?? DateTime.UtcNow.AddDays(-30);

            var userRecommendations = await _context.SocialRecommendations
                .Where(sr => sr.UserId == userId && sr.GeneratedAt >= startDate)
                .ToListAsync();

            var clickedRecommendations = userRecommendations.Count(r => 
                r.RecommendationData != null && 
                r.RecommendationData.ContainsKey("clicked") && 
                (bool)r.RecommendationData["clicked"]);

            var totalRecommendations = userRecommendations.Count;
            var clickThroughRate = totalRecommendations > 0 ? (double)clickedRecommendations / totalRecommendations : 0;

            var algorithmPerformance = userRecommendations
                .Where(r => r.RecommendationData != null && r.RecommendationData.ContainsKey("algorithm"))
                .GroupBy(r => r.RecommendationData["algorithm"].ToString())
                .ToDictionary(g => g.Key!, g => new AlgorithmMetrics
                {
                    TotalRecommendations = g.Count(),
                    ClickedRecommendations = g.Count(r => 
                        r.RecommendationData.ContainsKey("clicked") && 
                        (bool)r.RecommendationData["clicked"]),
                    AverageScore = g.Average(r => r.Score)
                });

            var metrics = new RecommendationPerformanceMetrics
            {
                UserId = userId,
                PeriodStart = startDate,
                PeriodEnd = DateTime.UtcNow,
                TotalRecommendations = totalRecommendations,
                ClickedRecommendations = clickedRecommendations,
                ClickThroughRate = clickThroughRate,
                AlgorithmPerformance = algorithmPerformance,
                TopContentTypes = userRecommendations
                    .GroupBy(r => r.ContentType)
                    .OrderByDescending(g => g.Count())
                    .Take(5)
                    .ToDictionary(g => g.Key, g => g.Count())
            };

            return metrics;
        }
        catch (Exception ex)
        {
            await _logger.LogAsync("ERROR", $"Failed to get recommendation metrics: {ex.Message}");
            throw;
        }
    }

    public async Task<ServiceResult> RecordRecommendationInteractionAsync(Guid userId, string contentId, string interactionType)
    {
        try
        {
            var recommendation = await _context.SocialRecommendations
                .FirstOrDefaultAsync(sr => sr.UserId == userId && sr.ContentId == contentId && sr.IsActive);

            if (recommendation == null)
            {
                return new ServiceResult 
                { 
                    IsSuccess = false, 
                    ErrorMessage = "Recommendation not found",
                    ErrorCode = "RECOMMENDATION_NOT_FOUND"
                };
            }

            // Update recommendation data
            if (recommendation.RecommendationData == null)
                recommendation.RecommendationData = new Dictionary<string, object>();

            recommendation.RecommendationData[interactionType] = true;
            recommendation.RecommendationData["interaction_timestamp"] = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            await _logger.LogAsync("INFO", 
                $"Recorded {interactionType} interaction for user {userId} on content {contentId}");

            return new ServiceResult { IsSuccess = true };
        }
        catch (Exception ex)
        {
            await _logger.LogAsync("ERROR", $"Failed to record recommendation interaction: {ex.Message}");
            return new ServiceResult 
            { 
                IsSuccess = false, 
                ErrorMessage = "Failed to record interaction",
                ErrorCode = "INTERACTION_FAILED"
            };
        }
    }

    #region Simple Helper Methods

    /// <summary>
    /// Get simple friend-based recommendations using basic queries
    /// </summary>
    private async Task<List<ContentRecommendation>> GetSimpleFriendRecommendationsAsync(Guid userId, int limit)
    {
        try
        {
            // Get user's social connections
            var friendIds = await _context.SocialRelationship
                .Include(sr => sr.SocialAccount)
                .Where(sr => sr.SocialAccount.UserId == userId && sr.GeoLeapUserId.HasValue)
                .Select(sr => sr.GeoLeapUserId!.Value)
                .Distinct()
                .ToListAsync();

            if (!friendIds.Any())
            {
                return new List<ContentRecommendation>();
            }

            // Get content shared by friends in last 30 days
            var friendContent = await _context.SocialContentShares
                .Where(scs => friendIds.Contains(scs.UserId) && 
                             scs.SharedAt > DateTime.UtcNow.AddDays(-30))
                .GroupBy(scs => new { scs.ContentId, scs.ContentType, scs.ContentTitle })
                .Select(g => new
                {
                    g.Key.ContentId,
                    g.Key.ContentType,
                    g.Key.ContentTitle,
                    FriendCount = g.Select(s => s.UserId).Distinct().Count(),
                    TotalEngagement = g.Sum(s => s.LikesCount + s.CommentsCount + s.SharesCount),
                    LatestShare = g.Max(s => s.SharedAt)
                })
                .OrderByDescending(c => c.FriendCount * 10 + c.TotalEngagement)
                .Take(limit)
                .ToListAsync();

            return friendContent.Select(content => new ContentRecommendation
            {
                ContentId = content.ContentId,
                ContentType = content.ContentType,
                Title = content.ContentTitle,
                Score = Math.Min(1.0, (content.FriendCount * 0.5 + content.TotalEngagement / 100.0)),
                Reason = $"Shared by {content.FriendCount} friend{(content.FriendCount > 1 ? "s" : "")}",
                SourcePlatforms = new[] { "friends" }
            }).ToList();
        }
        catch (Exception ex)
        {
            await _logger.LogAsync("ERROR", $"Failed to get friend recommendations: {ex.Message}");
            return new List<ContentRecommendation>();
        }
    }

    /// <summary>
    /// Get popular content based on simple engagement metrics
    /// </summary>
    private async Task<List<ContentRecommendation>> GetSimplePopularContentAsync(Guid userId, int limit)
    {
        try
        {
            // Get content that's been shared multiple times in the last week
            var popularContent = await _context.SocialContentShares
                .Where(scs => scs.SharedAt > DateTime.UtcNow.AddDays(-7))
                .GroupBy(scs => new { scs.ContentId, scs.ContentType, scs.ContentTitle })
                .Select(g => new
                {
                    g.Key.ContentId,
                    g.Key.ContentType,
                    g.Key.ContentTitle,
                    ShareCount = g.Count(),
                    TotalEngagement = g.Sum(s => s.LikesCount + s.CommentsCount + s.SharesCount),
                    UniqueUsers = g.Select(s => s.UserId).Distinct().Count()
                })
                .Where(c => c.ShareCount >= 2) // Minimum popularity threshold
                .OrderByDescending(c => c.ShareCount + c.TotalEngagement + c.UniqueUsers)
                .Take(limit)
                .ToListAsync();

            return popularContent.Select(content => new ContentRecommendation
            {
                ContentId = content.ContentId,
                ContentType = content.ContentType,
                Title = content.ContentTitle,
                Score = Math.Min(1.0, (content.ShareCount + content.TotalEngagement + content.UniqueUsers) / 50.0),
                Reason = $"Popular: {content.ShareCount} shares, {content.TotalEngagement} engagement",
                SourcePlatforms = new[] { "popular" }
            }).ToList();
        }
        catch (Exception ex)
        {
            await _logger.LogAsync("ERROR", $"Failed to get popular content: {ex.Message}");
            return new List<ContentRecommendation>();
        }
    }

    /// <summary>
    /// Get recommendations based on user's recent activity
    /// </summary>
    private async Task<List<ContentRecommendation>> GetSimpleRecentActivityRecommendationsAsync(Guid userId, int limit)
    {
        try
        {
            // Get user's recent content interactions
            var userRecentContent = await _context.SocialContentShares
                .Where(scs => scs.UserId == userId && scs.SharedAt > DateTime.UtcNow.AddDays(-30))
                .Take(20)
                .ToListAsync();

            if (!userRecentContent.Any())
            {
                return new List<ContentRecommendation>();
            }

            // Find similar content based on content type
            var recentContentTypes = userRecentContent
                .GroupBy(c => c.ContentType)
                .OrderByDescending(g => g.Count())
                .Take(3)
                .Select(g => g.Key)
                .ToList();

            var similarContent = await _context.SocialContentShares
                .Where(scs => recentContentTypes.Contains(scs.ContentType) && 
                             scs.UserId != userId &&
                             scs.SharedAt > DateTime.UtcNow.AddDays(-14))
                .GroupBy(scs => new { scs.ContentId, scs.ContentType, scs.ContentTitle })
                .Select(g => new
                {
                    g.Key.ContentId,
                    g.Key.ContentType,
                    g.Key.ContentTitle,
                    ShareCount = g.Count(),
                    EngagementScore = g.Average(s => s.EngagementRate)
                })
                .OrderByDescending(c => c.ShareCount * c.EngagementScore)
                .Take(limit)
                .ToListAsync();

            return similarContent.Select(content => new ContentRecommendation
            {
                ContentId = content.ContentId,
                ContentType = content.ContentType,
                Title = content.ContentTitle,
                Score = Math.Min(1.0, content.ShareCount * content.EngagementScore / 10.0),
                Reason = "Similar to your recent activity",
                SourcePlatforms = new[] { "recent-activity" }
            }).ToList();
        }
        catch (Exception ex)
        {
            await _logger.LogAsync("ERROR", $"Failed to get recent activity recommendations: {ex.Message}");
            return new List<ContentRecommendation>();
        }
    }

    /// <summary>
    /// Get recommendations based on simple interest matching
    /// </summary>
    private async Task<List<ContentRecommendation>> GetSimpleInterestBasedRecommendationsAsync(Guid userId, int limit)
    {
        try
        {
            // Get user's interests from their content sharing patterns
            var userInterests = await _context.SocialContentShares
                .Where(scs => scs.UserId == userId && scs.SharedAt > DateTime.UtcNow.AddDays(-60))
                .Select(scs => scs.ContentTitle)
                .ToListAsync();

            if (!userInterests.Any())
            {
                return new List<ContentRecommendation>();
            }

            // Extract simple keywords (this is a basic implementation)
            var keywords = userInterests
                .SelectMany(title => title?.Split(' ', StringSplitOptions.RemoveEmptyEntries) ?? new string[0])
                .Where(word => word.Length > 3)
                .GroupBy(word => word.ToLower())
                .OrderByDescending(g => g.Count())
                .Take(5)
                .Select(g => g.Key)
                .ToList();

            var recommendations = new List<ContentRecommendation>();

            // Find content matching these keywords
            foreach (var keyword in keywords)
            {
                var matchingContent = await _context.SearchableContents
                    .Where(sc => sc.Title.Contains(keyword) || (sc.Overview != null && sc.Overview.Contains(keyword)))
                    .Take(limit / keywords.Count + 1)
                    .ToListAsync();

                recommendations.AddRange(matchingContent.Select(content => new ContentRecommendation
                {
                    ContentId = content.Id.ToString(),
                    ContentType = content.ContentType,
                    Title = content.Title,
                    Description = content.Overview,
                    ImageUrl = content.PosterUrl,
                    Score = 0.7, // Fixed score for interest-based recommendations
                    Reason = $"Matches your interest in {keyword}",
                    SourcePlatforms = new[] { "interests" }
                }));
            }

            return recommendations.Take(limit).ToList();
        }
        catch (Exception ex)
        {
            await _logger.LogAsync("ERROR", $"Failed to get interest-based recommendations: {ex.Message}");
            return new List<ContentRecommendation>();
        }
    }

    private async Task<UserRecommendationProfile?> BuildSimpleUserProfileAsync(Guid userId)
    {
        var userConnections = await _context.SocialConnections
            .Where(sc => sc.UserId == userId && sc.IsTokenValid)
            .ToListAsync();

        if (!userConnections.Any())
        {
            return null;
        }

        var recentShares = await _context.SocialContentShares
            .Where(scs => scs.UserId == userId && scs.SharedAt > DateTime.UtcNow.AddDays(-60))
            .ToListAsync();

        // Simple interest extraction from content titles
        var interests = recentShares
            .SelectMany(s => ExtractSimpleInterests(s.ContentTitle))
            .GroupBy(i => i.ToLower())
            .OrderByDescending(g => g.Count())
            .Take(10)
            .Select(g => g.Key)
            .ToList();

        return new UserRecommendationProfile
        {
            UserId = userId,
            ConnectedPlatforms = userConnections.Select(c => c.Platform).ToList(),
            Interests = interests,
            RecentContentTypes = recentShares.GroupBy(s => s.ContentType).ToDictionary(g => g.Key, g => g.Count()),
            ActivityLevel = CalculateSimpleActivityLevel(recentShares.Count),
            SocialScore = userConnections.Sum(c => c.FollowersCount + c.FollowingCount)
        };
    }

    private List<string> ExtractSimpleInterests(string? contentTitle)
    {
        if (string.IsNullOrEmpty(contentTitle))
            return new List<string>();

        return contentTitle.Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Where(word => word.Length > 3)
            .ToList();
    }

    private string CalculateSimpleActivityLevel(int recentShares)
    {
        return recentShares switch
        {
            >= 20 => "high",
            >= 5 => "medium",
            >= 1 => "low",
            _ => "inactive"
        };
    }

    private async Task<List<Guid>> FindSimpleUsersAsync(Guid userId)
    {
        // Find users with social connections (simple approach)
        var connectedUsers = await _context.SocialRelationship
            .Include(sr => sr.SocialAccount)
            .Where(sr => sr.SocialAccount.UserId != userId && sr.GeoLeapUserId.HasValue)
            .Select(sr => sr.GeoLeapUserId!.Value)
            .Distinct()
            .Take(50)
            .ToListAsync();

        return connectedUsers;
    }

    #endregion

    #region Caching Methods

    private async Task<List<ContentRecommendation>?> GetCachedRecommendationsAsync(string cacheKey)
    {
        try
        {
            var cachedData = await _cache.GetStringAsync(cacheKey);
            if (!string.IsNullOrEmpty(cachedData))
            {
                return JsonSerializer.Deserialize<List<ContentRecommendation>>(cachedData);
            }
        }
        catch (Exception ex)
        {
            await _logger.LogAsync("ERROR", $"Cache retrieval failed: {ex.Message}");
        }
        return null;
    }

    private async Task CacheRecommendationsAsync(string cacheKey, List<ContentRecommendation> recommendations)
    {
        try
        {
            var serializedData = JsonSerializer.Serialize(recommendations);
            await _cache.SetStringAsync(cacheKey, serializedData, new DistributedCacheEntryOptions
            {
                AbsoluteExpirationRelativeToNow = _cacheExpiry
            });
        }
        catch (Exception ex)
        {
            await _logger.LogAsync("ERROR", $"Cache storage failed: {ex.Message}");
        }
    }

    #endregion

    #region ISocialRecommendationEngine Implementation

    public async Task<List<ContentRecommendation>> GenerateRecommendationsAsync(Guid userId, string? contentType = null, int limit = 20)
    {
        return await GetPersonalizedRecommendationsAsync(userId, limit, contentType);
    }

    public async Task<List<UserRecommendation>> GenerateUserRecommendationsAsync(Guid userId, int limit = 10)
    {
        try
        {
            var userProfile = await BuildSimpleUserProfileAsync(userId);
            if (userProfile == null)
            {
                return new List<UserRecommendation>();
            }

            // Find users with similar interests (simple approach)
            var similarUsers = await FindSimpleUsersAsync(userId);
            var recommendations = new List<UserRecommendation>();

            foreach (var similarUserId in similarUsers.Take(limit))
            {
                var user = await _context.Users.FindAsync(similarUserId);
                if (user != null)
                {
                    recommendations.Add(new UserRecommendation
                    {
                        UserId = user.Id,
                        Username = user.UserName ?? "",
                        DisplayName = user.FullName ?? "",
                        ProfileImageUrl = user.ProfileImageUrl ?? "",
                        Score = 0.8, // Default score
                        Reason = "Similar interests",
                        CommonInterests = userProfile.Interests.Take(3).ToArray(),
                        MutualConnections = new string[0],
                        IsVerified = false
                    });
                }
            }

            return recommendations;
        }
        catch (Exception ex)
        {
            await _logger.LogAsync("ERROR", $"Failed to generate user recommendations: {ex.Message}");
            return new List<UserRecommendation>();
        }
    }

    public async Task<List<TrendingContent>> AnalyzeTrendingContentAsync(string? platform = null, TimeSpan? timeWindow = null)
    {
        try
        {
            var window = timeWindow ?? TimeSpan.FromHours(24);
            var since = DateTime.UtcNow.Subtract(window);

            var query = _context.SocialContentShares
                .Where(scs => scs.SharedAt > since);

            if (!string.IsNullOrEmpty(platform))
            {
                query = query.Where(scs => scs.Platform == platform);
            }

            var trendingContent = await query
                .GroupBy(scs => new { scs.ContentId, scs.ContentType, scs.ContentTitle })
                .Select(g => new TrendingContent
                {
                    ContentId = g.Key.ContentId,
                    ContentType = g.Key.ContentType,
                    Title = g.Key.ContentTitle ?? "",
                    Description = "",
                    ImageUrl = "",
                    ShareCount = g.Count(),
                    InteractionCount = g.Sum(x => x.LikesCount + x.CommentsCount),
                    TrendingScore = g.Count() * 1.0,
                    PopularPlatforms = g.Select(x => x.Platform).Distinct().ToArray(),
                    TrendingDuration = window
                })
                .OrderByDescending(tc => tc.TrendingScore)
                .Take(20)
                .ToListAsync();

            return trendingContent;
        }
        catch (Exception ex)
        {
            await _logger.LogAsync("ERROR", $"Failed to analyze trending content: {ex.Message}");
            return new List<TrendingContent>();
        }
    }

    public async Task UpdateRecommendationModelAsync(Guid userId, string contentId, RecommendationFeedback feedback)
    {
        try
        {
            // Store feedback for model improvement
            await _logger.LogAsync("INFO", $"Received recommendation feedback from user {userId} for content {contentId}: {feedback.Action}");
            
            // In a simple implementation, we just log the feedback
            // In a more advanced system, this would update recommendation weights
        }
        catch (Exception ex)
        {
            await _logger.LogAsync("ERROR", $"Failed to update recommendation model: {ex.Message}");
        }
    }
    
    public async Task<List<ContentRecommendation>> GetPersonalizedRecommendationsAsync(Guid userId, int limit = 20)
    {
        try
        {
            // Use the existing GetPersonalizedRecommendationsAsync method which provides personalized recommendations
            return await GetPersonalizedRecommendationsAsync(userId, limit, null);
        }
        catch (Exception ex)
        {
            await _logger.LogAsync("ERROR", $"Failed to get personalized recommendations: {ex.Message}");
            return new List<ContentRecommendation>();
        }
    }

    public async Task<List<HashtagRecommendation>> GetHashtagRecommendationsAsync(Guid userId, string content, int limit = 10)
    {
        try
        {
            // Extract hashtags from recent successful content
            var recentContent = await _context.SocialContentShares
                .Where(scs => scs.UserId == userId && scs.SharedAt > DateTime.UtcNow.AddDays(-30))
                .ToListAsync();

            var hashtags = new List<HashtagRecommendation>();
            
            // Simple hashtag recommendation based on content keywords
            var keywords = content.Split(' ', StringSplitOptions.RemoveEmptyEntries)
                .Where(w => w.Length > 3)
                .Take(limit);

            foreach (var keyword in keywords)
            {
                hashtags.Add(new HashtagRecommendation
                {
                    Hashtag = $"#{keyword.ToLower()}",
                    Score = 0.7,
                    UsageCount = 100,
                    Category = "general",
                    IsTrending = false
                });
            }

            return hashtags;
        }
        catch (Exception ex)
        {
            await _logger.LogAsync("ERROR", $"Failed to get hashtag recommendations: {ex.Message}");
            return new List<HashtagRecommendation>();
        }
    }

    public async Task<Dictionary<Guid, double>> CalculateSocialInfluenceScoresAsync(List<Guid> userIds)
    {
        try
        {
            var scores = new Dictionary<Guid, double>();

            foreach (var userId in userIds)
            {
                var connections = await _context.SocialConnections
                    .Where(sc => sc.UserId == userId)
                    .ToListAsync();

                var recentShares = await _context.SocialContentShares
                    .Where(scs => scs.UserId == userId && scs.SharedAt > DateTime.UtcNow.AddDays(-30))
                    .ToListAsync();

                // Calculate influence based on followers and engagement
                var followerScore = connections.Sum(c => c.FollowersCount) / 1000.0;
                var engagementScore = recentShares.Sum(s => s.LikesCount + s.CommentsCount) / 100.0;
                
                scores[userId] = Math.Min(1.0, (followerScore + engagementScore) / 2.0);
            }

            return scores;
        }
        catch (Exception ex)
        {
            await _logger.LogAsync("ERROR", $"Failed to calculate social influence scores: {ex.Message}");
            return new Dictionary<Guid, double>();
        }
    }

    public async Task<List<ViralContentPrediction>> PredictViralContentAsync(TimeSpan lookbackWindow, double confidenceThreshold = 0.7)
    {
        try
        {
            var since = DateTime.UtcNow.Subtract(lookbackWindow);
            var recentContent = await _context.SocialContentShares
                .Where(scs => scs.SharedAt > since)
                .GroupBy(scs => new { scs.ContentId, scs.ContentType, scs.ContentTitle })
                .Select(g => new
                {
                    g.Key.ContentId,
                    g.Key.ContentType,
                    g.Key.ContentTitle,
                    ShareCount = g.Count(),
                    EngagementRate = g.Average(x => x.LikesCount + x.CommentsCount),
                    Platforms = g.Select(x => x.Platform).Distinct().Count()
                })
                .ToListAsync();

            var predictions = recentContent
                .Where(c => c.ShareCount > 10 && c.EngagementRate > 5)
                .Select(c => new ViralContentPrediction
                {
                    ContentId = c.ContentId,
                    ContentType = c.ContentType,
                    Title = c.ContentTitle ?? "",
                    ViralProbability = Math.Min(1.0, (c.ShareCount * c.EngagementRate * c.Platforms) / 1000.0),
                    PredictedPlatforms = new[] { "twitter", "facebook", "instagram" },
                    PredictedPeakTime = DateTime.UtcNow.AddHours(6),
                    EstimatedReach = (long)(c.ShareCount * 100),
                    KeyFactors = new[] { "high_engagement", "multi_platform" }
                })
                .Where(p => p.ViralProbability >= confidenceThreshold)
                .OrderByDescending(p => p.ViralProbability)
                .ToList();

            return predictions;
        }
        catch (Exception ex)
        {
            await _logger.LogAsync("ERROR", $"Failed to predict viral content: {ex.Message}");
            return new List<ViralContentPrediction>();
        }
    }

    public async Task<AudienceInsights> GenerateAudienceInsightsAsync(Guid userId, string? platform = null)
    {
        try
        {
            var connections = await _context.SocialConnections
                .Where(sc => sc.UserId == userId && (platform == null || sc.Platform == platform))
                .ToListAsync();

            var recentShares = await _context.SocialContentShares
                .Where(scs => scs.UserId == userId && scs.SharedAt > DateTime.UtcNow.AddDays(-30))
                .ToListAsync();

            var insights = new AudienceInsights
            {
                UserId = userId,
                TotalFollowers = connections.Sum(c => c.FollowersCount),
                DemographicBreakdown = new Dictionary<string, double>
                {
                    ["18-24"] = 0.25,
                    ["25-34"] = 0.35,
                    ["35-44"] = 0.25,
                    ["45+"] = 0.15
                },
                InterestCategories = new Dictionary<string, int>
                {
                    ["Technology"] = 40,
                    ["Travel"] = 30,
                    ["Food"] = 20,
                    ["Fashion"] = 10
                },
                EngagementRates = new Dictionary<string, double>
                {
                    ["likes"] = 0.05,
                    ["comments"] = 0.02,
                    ["shares"] = 0.01
                },
                TopPerformingContentTypes = new[] { "image", "video", "article" },
                BestPostingTimes = new Dictionary<string, TimeSpan>
                {
                    ["weekday"] = TimeSpan.FromHours(12),
                    ["weekend"] = TimeSpan.FromHours(14)
                },
                AverageEngagementRate = recentShares.Any() ? 
                    recentShares.Average(s => (s.LikesCount + s.CommentsCount) / Math.Max(1.0, s.SharesCount)) : 0.0
            };

            return insights;
        }
        catch (Exception ex)
        {
            await _logger.LogAsync("ERROR", $"Failed to generate audience insights: {ex.Message}");
            return new AudienceInsights
            {
                UserId = userId,
                TotalFollowers = 0,
                AverageEngagementRate = 0.0
            };
        }
    }

    #endregion
}

/// <summary>
/// User profile for recommendation generation
/// </summary>
public class UserRecommendationProfile
{
    public Guid UserId { get; set; }
    public List<string> ConnectedPlatforms { get; set; } = new();
    public List<string> Interests { get; set; } = new();
    public Dictionary<string, int> RecentContentTypes { get; set; } = new();
    public string ActivityLevel { get; set; } = "low";
    public double SocialScore { get; set; }
}

/// <summary>
/// Recommendation performance metrics
/// </summary>
public class RecommendationPerformanceMetrics
{
    public Guid UserId { get; set; }
    public DateTime PeriodStart { get; set; }
    public DateTime PeriodEnd { get; set; }
    public int TotalRecommendations { get; set; }
    public int ClickedRecommendations { get; set; }
    public double ClickThroughRate { get; set; }
    public Dictionary<string, AlgorithmMetrics> AlgorithmPerformance { get; set; } = new();
    public Dictionary<string, int> TopContentTypes { get; set; } = new();
}

/// <summary>
/// Algorithm-specific metrics
/// </summary>
public class AlgorithmMetrics
{
    public int TotalRecommendations { get; set; }
    public int ClickedRecommendations { get; set; }
    public double AverageScore { get; set; }
    public double ClickThroughRate => TotalRecommendations > 0 ? (double)ClickedRecommendations / TotalRecommendations : 0;
}