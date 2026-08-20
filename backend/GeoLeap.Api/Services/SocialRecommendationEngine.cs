using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using System.Text.Json;

namespace GeoLeap.Api.Services;

/// <summary>
/// Social recommendation engine implementation using collaborative filtering and social network analysis
/// </summary>
public class SocialRecommendationEngine : ISocialRecommendationEngine
{
    private readonly ApplicationDbContext _context;
    private readonly ILoggerService _logger;
    private readonly IConfiguration _configuration;
    private readonly IMemoryCache _memoryCache;

    public SocialRecommendationEngine(
        ApplicationDbContext context,
        ILoggerService logger,
        IConfiguration configuration,
        IMemoryCache memoryCache)
    {
        _context = context;
        _logger = logger;
        _configuration = configuration;
        _memoryCache = memoryCache;
    }

    public async Task<List<ContentRecommendation>> GenerateRecommendationsAsync(Guid userId, string? contentType = null, int limit = 20)
    {
        try
        {
            var cacheKey = $"recommendations_{userId}_{contentType}_{limit}";
            if (_memoryCache.TryGetValue(cacheKey, out List<ContentRecommendation>? cachedRecommendations))
            {
                return cachedRecommendations ?? new List<ContentRecommendation>();
            }

            var recommendations = new List<ContentRecommendation>();

            // Get user's social connections and their activities
            var userConnections = await GetUserSocialNetworkAsync(userId);
            
            // Collaborative filtering: Find content shared by similar users
            var collaborativeRecommendations = await GetCollaborativeRecommendationsAsync(userId, userConnections, contentType, limit / 2);
            recommendations.AddRange(collaborativeRecommendations);

            // Content-based filtering: Find similar content to user's past interactions
            var contentBasedRecommendations = await GetContentBasedRecommendationsAsync(userId, contentType, limit / 2);
            recommendations.AddRange(contentBasedRecommendations);

            // Trending content from social platforms
            var trendingRecommendations = await GetTrendingRecommendationsAsync(userId, contentType, limit / 4);
            recommendations.AddRange(trendingRecommendations);

            // Diversify and rank recommendations
            var finalRecommendations = DiversifyAndRankRecommendations(recommendations, limit);

            // Cache recommendations for 30 minutes
            _memoryCache.Set(cacheKey, finalRecommendations, TimeSpan.FromMinutes(30));

            return finalRecommendations;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating content recommendations for user {UserId}", userId);
            return new List<ContentRecommendation>();
        }
    }

    public async Task<List<UserRecommendation>> GenerateUserRecommendationsAsync(Guid userId, int limit = 10)
    {
        try
        {
            var recommendations = new List<UserRecommendation>();

            // Find users with similar interests based on shared content
            var similarUsers = await FindSimilarUsersAsync(userId);
            
            // Find mutual connections from social platforms
            var mutualConnections = await FindMutualConnectionsAsync(userId);
            
            // Combine and rank user recommendations
            var allCandidates = similarUsers.Concat(mutualConnections).ToList();
            var rankedUsers = RankUserRecommendations(allCandidates, userId);
            
            return rankedUsers.Take(limit).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating user recommendations for user {UserId}", userId);
            return new List<UserRecommendation>();
        }
    }

    public async Task<List<TrendingContent>> AnalyzeTrendingContentAsync(string? platform = null, TimeSpan? timeWindow = null)
    {
        try
        {
            var window = timeWindow ?? TimeSpan.FromHours(24);
            var cutoffTime = DateTime.UtcNow.Subtract(window);

            var query = _context.SocialShareEvents
                .Where(s => s.CreatedAt >= cutoffTime && s.IsSuccessful);

            if (!string.IsNullOrEmpty(platform))
            {
                query = query.Where(s => s.Platform == platform);
            }

            var trendingData = await query
                .GroupBy(s => new { s.ContentId, s.ContentType, s.ContentTitle })
                .Select(g => new
                {
                    g.Key.ContentId,
                    g.Key.ContentType,
                    g.Key.ContentTitle,
                    ShareCount = g.Count(),
                    UniqueUsers = g.Select(s => s.UserId).Distinct().Count(),
                    Platforms = g.Select(s => s.Platform).Distinct().ToList(),
                    LatestShare = g.Max(s => s.CreatedAt),
                    EarliestShare = g.Min(s => s.CreatedAt)
                })
                .OrderByDescending(t => t.ShareCount * t.UniqueUsers)
                .Take(50)
                .ToListAsync();

            return trendingData.Select(t => new TrendingContent
            {
                ContentId = t.ContentId,
                ContentType = t.ContentType,
                Title = t.ContentTitle,
                ShareCount = t.ShareCount,
                InteractionCount = t.ShareCount, // Simplified - would include clicks, likes etc.
                TrendingScore = CalculateTrendingScore(t.ShareCount, t.UniqueUsers, t.LatestShare),
                PopularPlatforms = t.Platforms.ToArray(),
                TrendingDuration = t.LatestShare - t.EarliestShare
            }).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error analyzing trending content");
            return new List<TrendingContent>();
        }
    }

    public async Task UpdateRecommendationModelAsync(Guid userId, string contentId, RecommendationFeedback feedback)
    {
        try
        {
            // Store feedback for model training
            var feedbackRecord = new SocialRecommendation
            {
                UserId = userId,
                RecommendationType = "feedback",
                ContentId = contentId,
                Score = feedback.Rating,
                Reason = feedback.Action,
                GeneratedAt = DateTime.UtcNow,
                ExpiresAt = DateTime.UtcNow.AddYears(1),
                RecommendationData = new Dictionary<string, object>
                {
                    ["action"] = feedback.Action,
                    ["rating"] = feedback.Rating,
                    ["comment"] = feedback.Comment ?? "",
                    ["timestamp"] = feedback.Timestamp,
                    ["metadata"] = feedback.Metadata ?? new Dictionary<string, object>()
                }
            };

            _context.SocialRecommendations.Add(feedbackRecord);
            await _context.SaveChangesAsync();

            // Invalidate user's recommendation cache
            var cacheKeys = _memoryCache.GetType()
                .GetField("_cache", System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance)?
                .GetValue(_memoryCache) as IDictionary<object, object>;

            if (cacheKeys != null)
            {
                var keysToRemove = new List<object>();
                foreach (var key in cacheKeys.Keys)
                {
                    if (key.ToString()?.StartsWith($"recommendations_{userId}") == true)
                    {
                        keysToRemove.Add(key);
                    }
                }
                
                foreach (var key in keysToRemove)
                {
                    _memoryCache.Remove(key);
                }
            }

            _logger.LogBusinessEvent("RecommendationFeedback", new 
            { 
                UserId = userId,
                ContentId = contentId,
                Action = feedback.Action,
                Rating = feedback.Rating
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating recommendation model for user {UserId}", userId);
        }
    }
    
    public async Task<List<ContentRecommendation>> GetPersonalizedRecommendationsAsync(Guid userId, int limit = 20)
    {
        try
        {
            // Use the existing GenerateRecommendationsAsync method which provides personalized recommendations
            return await GenerateRecommendationsAsync(userId, null, limit);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting personalized recommendations for user {UserId}", userId);
            return new List<ContentRecommendation>();
        }
    }

    public async Task<List<HashtagRecommendation>> GetHashtagRecommendationsAsync(Guid userId, string content, int limit = 10)
    {
        try
        {
            var recommendations = new List<HashtagRecommendation>();

            // Extract existing hashtags from user's previous shares
            // Fetch hashtag strings from database first
            var userHashtagStrings = await _context.SocialShareEvents
                .Where(s => s.UserId == userId && !string.IsNullOrEmpty(s.Hashtags))
                .Select(s => s.Hashtags)
                .ToListAsync();

            // Process hashtags in memory (client-side) to strip # symbol
            var userHashtags = userHashtagStrings
                .SelectMany(h => h.Split(' ', StringSplitOptions.RemoveEmptyEntries))
                .Select(h => h.TrimStart('#').ToLower()) // Strip # for consistent processing
                .GroupBy(h => h)
                .Select(g => new { Hashtag = g.Key, Count = g.Count() })
                .OrderByDescending(h => h.Count)
                .Take(limit / 2)
                .ToList();

            recommendations.AddRange(userHashtags.Select(h => new HashtagRecommendation
            {
                Hashtag = h.Hashtag,
                Score = h.Count * 0.8, // User's own hashtags get high score
                UsageCount = h.Count,
                Category = "personal"
            }));

            // Find trending hashtags from similar content
            var contentWords = ExtractKeywords(content);
            if (contentWords.Any())
            {
                // Fetch trending hashtag strings from database first
                var trendingHashtagStrings = await _context.SocialShareEvents
                    .Where(s => s.CreatedAt >= DateTime.UtcNow.AddDays(-7) &&
                               !string.IsNullOrEmpty(s.Hashtags) &&
                               contentWords.Any(w => s.ContentTitle.Contains(w) || s.ContentDescription.Contains(w)))
                    .Select(s => s.Hashtags)
                    .ToListAsync();

                // Process hashtags in memory (client-side) to strip # symbol
                var trendingHashtags = trendingHashtagStrings
                    .SelectMany(h => h.Split(' ', StringSplitOptions.RemoveEmptyEntries))
                    .Select(h => h.TrimStart('#').ToLower()) // Strip # for consistent processing
                    .GroupBy(h => h)
                    .Select(g => new { Hashtag = g.Key, Count = g.Count() })
                    .OrderByDescending(h => h.Count)
                    .Take(limit / 2)
                    .ToList();

                recommendations.AddRange(trendingHashtags
                    .Where(h => !recommendations.Any(r => r.Hashtag == h.Hashtag))
                    .Select(h => new HashtagRecommendation
                    {
                        Hashtag = h.Hashtag,
                        Score = h.Count * 0.6,
                        UsageCount = h.Count,
                        Category = "trending",
                        IsTrending = true
                    }));
            }

            return recommendations
                .OrderByDescending(r => r.Score)
                .Take(limit)
                .ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting hashtag recommendations for user {UserId}", userId);
            return new List<HashtagRecommendation>();
        }
    }

    public async Task<Dictionary<Guid, double>> CalculateSocialInfluenceScoresAsync(List<Guid> userIds)
    {
        try
        {
            var influenceScores = new Dictionary<Guid, double>();

            foreach (var userId in userIds)
            {
                // Calculate influence based on:
                // 1. Number of followers across platforms
                // 2. Engagement rate (shares, clicks per post)
                // 3. Content reach and virality
                
                var userConnections = await _context.SocialConnections
                    .Where(c => c.UserId == userId)
                    .SumAsync(c => c.FollowersCount);

                var recentActivity = await _context.SocialShareEvents
                    .Where(s => s.UserId == userId && s.CreatedAt >= DateTime.UtcNow.AddDays(-30))
                    .ToListAsync();

                var totalShares = recentActivity.Count;
                var totalClicks = recentActivity.Sum(s => s.ClickCount);
                var avgEngagement = totalShares > 0 ? (double)totalClicks / totalShares : 0;

                /// <summary>
                /// Calculate social influence score using logarithmic scaling for follower count
                /// and linear scaling for engagement rate. Logarithmic function naturally compresses
                /// large values (e.g., Log10(1M) = 60), so no cap is needed.
                ///
                /// Score Range Examples:
                /// - 100 followers, 0 engagement: ~20
                /// - 1,000 followers, 0 engagement: ~30
                /// - 10,000 followers, 10 avg clicks: ~45
                /// - 100,000 followers, 20 avg clicks: ~150
                ///
                /// FIXED: Removed 100 cap that masked differences between accounts (BUG-BE-018)
                /// </summary>
                var influenceScore = Math.Log10(userConnections + 1) * 10 + avgEngagement * 5;
                influenceScores[userId] = influenceScore; // Let logarithmic scaling naturally bound scores
            }

            return influenceScores;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error calculating social influence scores");
            return userIds.ToDictionary(id => id, _ => 0.0);
        }
    }

    public async Task<List<ViralContentPrediction>> PredictViralContentAsync(TimeSpan lookbackWindow, double confidenceThreshold = 0.7)
    {
        try
        {
            var cutoffTime = DateTime.UtcNow.Subtract(lookbackWindow);
            
            var recentContent = await _context.SocialShareEvents
                .Where(s => s.CreatedAt >= cutoffTime)
                .GroupBy(s => new { s.ContentId, s.ContentType, s.ContentTitle })
                .Select(g => new
                {
                    g.Key.ContentId,
                    g.Key.ContentType,
                    g.Key.ContentTitle,
                    ShareCount = g.Count(),
                    UniqueUsers = g.Select(s => s.UserId).Distinct().Count(),
                    Platforms = g.Select(s => s.Platform).Distinct().Count(),
                    ClickCount = g.Sum(s => s.ClickCount),
                    TimeSpread = g.Max(s => s.CreatedAt) - g.Min(s => s.CreatedAt),
                    LatestActivity = g.Max(s => s.CreatedAt)
                })
                .Where(c => c.ShareCount >= 5) // Minimum threshold
                .ToListAsync();

            var predictions = new List<ViralContentPrediction>();

            foreach (var content in recentContent)
            {
                // Calculate viral probability based on early indicators
                var viralScore = CalculateViralProbability(
                    content.ShareCount,
                    content.UniqueUsers,
                    content.Platforms,
                    content.ClickCount,
                    content.TimeSpread,
                    content.LatestActivity
                );

                if (viralScore >= confidenceThreshold)
                {
                    predictions.Add(new ViralContentPrediction
                    {
                        ContentId = content.ContentId,
                        ContentType = content.ContentType,
                        Title = content.ContentTitle,
                        ViralProbability = viralScore,
                        PredictedPlatforms = new[] { "facebook", "twitter", "instagram" }, // Simplified
                        PredictedPeakTime = DateTime.UtcNow.AddHours(6), // Simple prediction
                        EstimatedReach = (long)(content.ShareCount * content.UniqueUsers * viralScore * 10),
                        KeyFactors = IdentifyViralFactors(content.ShareCount, content.UniqueUsers, content.Platforms, content.ClickCount)
                    });
                }
            }

            return predictions
                .OrderByDescending(p => p.ViralProbability)
                .Take(10)
                .ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error predicting viral content");
            return new List<ViralContentPrediction>();
        }
    }

    public async Task<AudienceInsights> GenerateAudienceInsightsAsync(Guid userId, string? platform = null)
    {
        try
        {
            var connections = await _context.SocialConnections
                .Where(c => c.UserId == userId)
                .ToListAsync();

            if (!string.IsNullOrEmpty(platform))
            {
                connections = connections.Where(c => c.Platform == platform).ToList();
            }

            var totalFollowers = connections.Sum(c => c.FollowersCount);
            
            var recentShares = await _context.SocialShareEvents
                .Where(s => s.UserId == userId && s.CreatedAt >= DateTime.UtcNow.AddDays(-30))
                .ToListAsync();

            var platformEngagement = recentShares
                .GroupBy(s => s.Platform)
                .ToDictionary(g => g.Key, g => g.Average(s => s.ClickCount));

            var contentTypePerformance = recentShares
                .GroupBy(s => s.ContentType)
                .Select(g => new { ContentType = g.Key, AvgClicks = g.Average(s => s.ClickCount) })
                .OrderByDescending(c => c.AvgClicks)
                .Take(5)
                .Select(c => c.ContentType)
                .ToArray();

            return new AudienceInsights
            {
                UserId = userId,
                TotalFollowers = totalFollowers,
                DemographicBreakdown = new Dictionary<string, double>(), // Would require additional data collection
                InterestCategories = new Dictionary<string, int>(), // Would analyze shared content categories
                EngagementRates = platformEngagement,
                TopPerformingContentTypes = contentTypePerformance,
                BestPostingTimes = new Dictionary<string, TimeSpan>(), // Would analyze timing data
                AverageEngagementRate = recentShares.Any() ? recentShares.Average(s => s.ClickCount) : 0,
                GeneratedAt = DateTime.UtcNow
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating audience insights for user {UserId}", userId);
            return new AudienceInsights { UserId = userId };
        }
    }

    // Private helper methods
    private async Task<List<Guid>> GetUserSocialNetworkAsync(Guid userId)
    {
        var connections = await _context.SocialGraphConnections
            .Where(g => g.FromUserId == userId || g.ToUserId == userId)
            .Select(g => g.FromUserId == userId ? g.ToUserId : g.FromUserId)
            .Distinct()
            .ToListAsync();

        return connections;
    }

    private async Task<List<ContentRecommendation>> GetCollaborativeRecommendationsAsync(Guid userId, List<Guid> connections, string? contentType, int limit)
    {
        var sharedContent = await _context.SocialShareEvents
            .Where(s => connections.Contains(s.UserId) && 
                       s.CreatedAt >= DateTime.UtcNow.AddDays(-30) &&
                       (contentType == null || s.ContentType == contentType))
            .GroupBy(s => new { s.ContentId, s.ContentType, s.ContentTitle })
            .Select(g => new
            {
                g.Key.ContentId,
                g.Key.ContentType,
                g.Key.ContentTitle,
                ShareCount = g.Count(),
                UniqueSharers = g.Select(s => s.UserId).Distinct().Count()
            })
            .OrderByDescending(c => c.ShareCount * c.UniqueSharers)
            .Take(limit)
            .ToListAsync();

        return sharedContent.Select(c => new ContentRecommendation
        {
            ContentId = c.ContentId,
            ContentType = c.ContentType,
            Title = c.ContentTitle,
            Score = c.ShareCount * 0.8,
            Reason = $"Popular among {c.UniqueSharers} of your connections",
            SourcePlatforms = new[] { "social_network" }
        }).ToList();
    }

    private async Task<List<ContentRecommendation>> GetContentBasedRecommendationsAsync(Guid userId, string? contentType, int limit)
    {
        // This would implement content similarity analysis
        // For now, return empty list as it requires more sophisticated content analysis
        return new List<ContentRecommendation>();
    }

    private async Task<List<ContentRecommendation>> GetTrendingRecommendationsAsync(Guid userId, string? contentType, int limit)
    {
        var trending = await AnalyzeTrendingContentAsync(null, TimeSpan.FromHours(6));
        
        return trending
            .Where(t => contentType == null || t.ContentType == contentType)
            .Take(limit)
            .Select(t => new ContentRecommendation
            {
                ContentId = t.ContentId,
                ContentType = t.ContentType,
                Title = t.Title,
                Description = t.Description,
                ImageUrl = t.ImageUrl,
                Score = t.TrendingScore * 0.6,
                Reason = $"Trending with {t.ShareCount} shares",
                SourcePlatforms = t.PopularPlatforms
            })
            .ToList();
    }

    private List<ContentRecommendation> DiversifyAndRankRecommendations(List<ContentRecommendation> recommendations, int limit)
    {
        // Remove duplicates and diversify by content type
        // FIXED: Week 1 Day 5 - Use FirstOrDefault to prevent exceptions when diversifying recommendations
        var uniqueRecommendations = recommendations
            .GroupBy(r => r.ContentId)
            .Select(g => g.OrderByDescending(r => r.Score).FirstOrDefault())
            .Where(r => r != null)
            .ToList()!;

        // Simple diversification by content type
        var diversified = new List<ContentRecommendation>();
        var contentTypes = uniqueRecommendations.Select(r => r.ContentType).Distinct().ToList();
        var itemsPerType = limit / Math.Max(contentTypes.Count, 1);

        foreach (var contentType in contentTypes)
        {
            var typeItems = uniqueRecommendations
                .Where(r => r.ContentType == contentType)
                .OrderByDescending(r => r.Score)
                .Take(itemsPerType)
                .ToList();
                
            diversified.AddRange(typeItems);
        }

        return diversified
            .OrderByDescending(r => r.Score)
            .Take(limit)
            .ToList();
    }

    private async Task<List<UserRecommendation>> FindSimilarUsersAsync(Guid userId)
    {
        // Find users who share similar content interests
        var userInterests = await _context.SocialShareEvents
            .Where(s => s.UserId == userId && s.CreatedAt >= DateTime.UtcNow.AddDays(-90))
            .Select(s => s.ContentType)
            .ToListAsync();

        if (!userInterests.Any())
            return new List<UserRecommendation>();

        var similarUsers = await _context.SocialShareEvents
            .Where(s => s.UserId != userId && 
                       userInterests.Contains(s.ContentType) &&
                       s.CreatedAt >= DateTime.UtcNow.AddDays(-90))
            .GroupBy(s => s.UserId)
            .Select(g => new { UserId = g.Key, SharedInterests = g.Count() })
            .Where(u => u.SharedInterests >= 3)
            .OrderByDescending(u => u.SharedInterests)
            .Take(20)
            .ToListAsync();

        var recommendations = new List<UserRecommendation>();
        foreach (var user in similarUsers)
        {
            var userInfo = await _context.Users.FindAsync(user.UserId);
            if (userInfo != null)
            {
                recommendations.Add(new UserRecommendation
                {
                    UserId = user.UserId,
                    Username = userInfo.UserName ?? "",
                    DisplayName = userInfo.Email, // Simplified
                    Score = user.SharedInterests,
                    Reason = $"Shares {user.SharedInterests} similar interests",
                    CommonInterests = userInterests.Take(3).ToArray()
                });
            }
        }

        return recommendations;
    }

    private async Task<List<UserRecommendation>> FindMutualConnectionsAsync(Guid userId)
    {
        // This would analyze mutual connections from social platforms
        // For now, return empty list as it requires platform-specific friend APIs
        return new List<UserRecommendation>();
    }

    private List<UserRecommendation> RankUserRecommendations(List<UserRecommendation> candidates, Guid userId)
    {
        return candidates
            .OrderByDescending(u => u.Score)
            .ThenByDescending(u => u.CommonInterests.Length)
            .ToList();
    }

    private double CalculateTrendingScore(long shareCount, int uniqueUsers, DateTime latestShare)
    {
        var recency = Math.Max(0, 24 - (DateTime.UtcNow - latestShare).TotalHours);
        return Math.Log10(shareCount + 1) * Math.Log10(uniqueUsers + 1) * (recency + 1);
    }

    private double CalculateViralProbability(long shareCount, int uniqueUsers, int platforms, long clickCount, TimeSpan timeSpread, DateTime latestActivity)
    {
        var shareVelocity = shareCount / Math.Max(timeSpread.TotalHours, 1);
        var engagementRate = shareCount > 0 ? (double)clickCount / shareCount : 0;
        var platformDiversity = platforms / 4.0; // Normalized to max 4 platforms
        var recency = Math.Max(0, 1 - (DateTime.UtcNow - latestActivity).TotalHours / 24);

        return Math.Min(1.0, (shareVelocity * 0.4 + engagementRate * 0.3 + platformDiversity * 0.2 + recency * 0.1));
    }

    private string[] IdentifyViralFactors(long shareCount, int uniqueUsers, int platforms, long clickCount)
    {
        var factors = new List<string>();
        
        if (shareCount > 100) factors.Add("high_share_volume");
        if (uniqueUsers > 50) factors.Add("wide_user_reach");
        if (platforms >= 3) factors.Add("cross_platform_spread");
        if (clickCount > shareCount * 2) factors.Add("high_engagement");
        
        return factors.ToArray();
    }

    private List<string> ExtractKeywords(string content)
    {
        var commonWords = new HashSet<string> { "the", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with", "by", "a", "an" };
        
        return content
            .Split(' ', StringSplitOptions.RemoveEmptyEntries)
            .Where(word => word.Length > 3 && !commonWords.Contains(word.ToLower()))
            .Select(word => word.ToLower().Trim('.', ',', '!', '?'))
            .Take(10)
            .ToList();
    }
}