using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace GeoLeap.Api.Services;

/// <summary>
/// Advanced social proof calculation service with comprehensive ranking algorithms and influence scoring
/// </summary>
public class SocialProofCalculationService : ISocialProofCalculationService
{
    private readonly ApplicationDbContext _context;
    private readonly ILoggerService _logger;
    private readonly IConfiguration _configuration;

    // Algorithm weights for social proof calculation
    private readonly double _followersWeight = 0.25;
    private readonly double _engagementWeight = 0.30;
    private readonly double _contentQualityWeight = 0.20;
    private readonly double _networkWeight = 0.15;
    private readonly double _activityWeight = 0.10;

    public SocialProofCalculationService(
        ApplicationDbContext context,
        ILoggerService logger,
        IConfiguration configuration)
    {
        _context = context;
        _logger = logger;
        _configuration = configuration;
    }

    public async Task<SocialProofScore> CalculateUserSocialProofAsync(Guid userId, string? platform = null)
    {
        try
        {
            var user = await _context.Users.FindAsync(userId);
            if (user == null)
            {
                throw new ArgumentException($"User {userId} not found");
            }

            // Get user's social accounts
            var socialAccounts = await _context.SocialAccount
                .Where(sa => sa.UserId == userId && sa.IsActive)
                .Where(sa => platform == null || sa.Platform == platform)
                .ToListAsync();

            if (!socialAccounts.Any())
            {
                return CreateDefaultScore(userId, platform ?? "all");
            }

            // Calculate component scores
            var influenceScore = await CalculateInfluenceScoreAsync(socialAccounts);
            var engagementScore = await CalculateEngagementScoreAsync(socialAccounts);
            var contentQualityScore = await CalculateContentQualityScoreAsync(socialAccounts);
            var networkScore = await CalculateNetworkScoreAsync(socialAccounts);
            var activityScore = await CalculateActivityScoreAsync(socialAccounts);

            // Calculate overall score using weighted average
            var overallScore = (influenceScore * _followersWeight) +
                              (engagementScore * _engagementWeight) +
                              (contentQualityScore * _contentQualityWeight) +
                              (networkScore * _networkWeight) +
                              (activityScore * _activityWeight);

            // Calculate additional metrics
            var totalFollowers = socialAccounts.Sum(sa => sa.FollowersCount);
            var totalConnections = await GetTotalConnectionsAsync(socialAccounts);
            var averageEngagementRate = socialAccounts.Any() ? socialAccounts.Average(sa => sa.EngagementRate) : 0;
            var postsLast30Days = await GetPostsLast30DaysAsync(socialAccounts);
            var interactionsLast30Days = await GetInteractionsLast30DaysAsync(socialAccounts);

            // Determine influence tier
            var influenceTier = DetermineInfluenceTier(overallScore, totalFollowers, averageEngagementRate);

            // Calculate global rank and percentile
            var (globalRank, percentile) = await CalculateGlobalRankingAsync(overallScore);

            var socialProofScore = new SocialProofScore
            {
                UserId = userId,
                Platform = platform ?? "all",
                OverallScore = Math.Round(overallScore, 3),
                InfluenceScore = Math.Round(influenceScore, 3),
                EngagementScore = Math.Round(engagementScore, 3),
                ContentQualityScore = Math.Round(contentQualityScore, 3),
                NetworkScore = Math.Round(networkScore, 3),
                ActivityScore = Math.Round(activityScore, 3),
                TotalFollowers = totalFollowers,
                TotalConnections = totalConnections,
                AverageEngagementRate = Math.Round(averageEngagementRate, 4),
                PostsLast30Days = postsLast30Days,
                InteractionsLast30Days = interactionsLast30Days,
                GlobalRank = globalRank,
                Percentile = Math.Round(percentile, 2),
                InfluenceTier = influenceTier,
                CalculatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow,
                ScoreBreakdown = new Dictionary<string, double>
                {
                    ["followers_component"] = influenceScore * _followersWeight,
                    ["engagement_component"] = engagementScore * _engagementWeight,
                    ["content_component"] = contentQualityScore * _contentQualityWeight,
                    ["network_component"] = networkScore * _networkWeight,
                    ["activity_component"] = activityScore * _activityWeight
                }
            };

            // Store or update the score
            await StoreProofScoreAsync(socialProofScore);

            await _logger.LogAsync("INFO", 
                $"Social proof calculated for user {userId}: {overallScore:F3} (Tier: {influenceTier})");

            return socialProofScore;
        }
        catch (Exception ex)
        {
            await _logger.LogAsync("ERROR", $"Failed to calculate social proof for user {userId}: {ex.Message}");
            throw;
        }
    }

    public async Task<List<UserRanking>> GetTopInfluencersAsync(int limit = 50, string? platform = null, TimeSpan? timeWindow = null)
    {
        try
        {
            var window = timeWindow ?? TimeSpan.FromDays(30);
            var cutoffDate = DateTime.UtcNow - window;

            var query = _context.SocialProofScores
                .Where(sps => sps.CalculatedAt >= cutoffDate);

            if (!string.IsNullOrEmpty(platform))
            {
                query = query.Where(sps => sps.Platform == platform);
            }

            var topInfluencers = await query
                .Include(sps => sps.User)
                .OrderByDescending(sps => sps.OverallScore)
                .Take(limit)
                .Select(sps => new UserRanking
                {
                    UserId = sps.UserId,
                    Username = sps.User.UserName ?? "",
                    DisplayName = sps.User.UserName ?? "",
                    OverallScore = sps.OverallScore,
                    InfluenceTier = sps.InfluenceTier,
                    TotalFollowers = sps.TotalFollowers,
                    AverageEngagementRate = sps.AverageEngagementRate,
                    GlobalRank = sps.GlobalRank,
                    Percentile = sps.Percentile,
                    Platform = sps.Platform,
                    LastUpdated = sps.UpdatedAt
                })
                .ToListAsync();

            await _logger.LogAsync("INFO", $"Retrieved {topInfluencers.Count} top influencers");

            return topInfluencers;
        }
        catch (Exception ex)
        {
            await _logger.LogAsync("ERROR", $"Failed to get top influencers: {ex.Message}");
            return new List<UserRanking>();
        }
    }

    public async Task<ContentRanking> RankContentBySocialProofAsync(string contentId, string contentType)
    {
        try
        {
            // Get all shares of this content
            var contentShares = await _context.SocialContentShares
                .Where(scs => scs.ContentId == contentId && scs.ContentType == contentType)
                .ToListAsync();

            if (!contentShares.Any())
            {
                return new ContentRanking
                {
                    ContentId = contentId,
                    ContentType = contentType,
                    SocialProofScore = 0,
                    ShareCount = 0,
                    UniqueSharers = 0,
                    InfluencerShareCount = 0,
                    TotalEngagement = 0,
                    AverageEngagementRate = 0,
                    RankingTier = "unranked"
                };
            }

            var shareCount = contentShares.Count;
            var uniqueSharers = contentShares.Select(cs => cs.UserId).Distinct().Count();
            var totalEngagement = contentShares.Sum(cs => cs.LikesCount + cs.CommentsCount + cs.SharesCount);
            var averageEngagementRate = contentShares.Average(cs => cs.EngagementRate);

            // Get social proof scores for users who shared this content
            var sharerIds = contentShares.Select(cs => cs.UserId).ToList();
            var sharerScores = await _context.SocialProofScores
                .Where(sps => sharerIds.Contains(sps.UserId))
                .ToListAsync();

            // Calculate weighted social proof based on sharer influence
            var weightedProofScore = 0.0;
            var influencerShareCount = 0;

            foreach (var share in contentShares)
            {
                var sharerScore = sharerScores.FirstOrDefault(ss => ss.UserId == share.UserId);
                if (sharerScore != null)
                {
                    // Weight the share by the sharer's influence
                    var shareWeight = 1.0 + (sharerScore.OverallScore * 2.0); // Base weight + influence bonus
                    weightedProofScore += shareWeight;

                    if (sharerScore.InfluenceTier == "influencer" || sharerScore.InfluenceTier == "celebrity")
                    {
                        influencerShareCount++;
                    }
                }
                else
                {
                    weightedProofScore += 1.0; // Base weight for users without scores
                }
            }

            // Normalize the weighted score
            var normalizedScore = weightedProofScore / Math.Max(shareCount, 1);

            // Apply recency boost (content shared in last 7 days gets boost)
            var recentShares = contentShares.Count(cs => cs.SharedAt > DateTime.UtcNow.AddDays(-7));
            var recencyBoost = Math.Min(0.2, recentShares / Math.Max(shareCount, 1) * 0.2);
            normalizedScore += recencyBoost;

            // Apply virality boost (rapid sharing pattern)
            var viralityScore = CalculateViralityScore(contentShares);
            normalizedScore += viralityScore;

            // Determine ranking tier
            var rankingTier = DetermineContentRankingTier(normalizedScore, shareCount, influencerShareCount);

            var ranking = new ContentRanking
            {
                ContentId = contentId,
                ContentType = contentType,
                SocialProofScore = Math.Round(normalizedScore, 3),
                ShareCount = shareCount,
                UniqueSharers = uniqueSharers,
                InfluencerShareCount = influencerShareCount,
                TotalEngagement = totalEngagement,
                AverageEngagementRate = Math.Round(averageEngagementRate, 4),
                RankingTier = rankingTier,
                ViralityScore = Math.Round(viralityScore, 3),
                RecencyBoost = Math.Round(recencyBoost, 3),
                CalculatedAt = DateTime.UtcNow
            };

            await _logger.LogAsync("INFO", 
                $"Content ranking calculated for {contentId}: {normalizedScore:F3} (Tier: {rankingTier})");

            return ranking;
        }
        catch (Exception ex)
        {
            await _logger.LogAsync("ERROR", $"Failed to rank content {contentId}: {ex.Message}");
            throw;
        }
    }

    public async Task<List<TrendingContent>> GetTrendingContentByProofAsync(int limit = 20, TimeSpan? timeWindow = null)
    {
        try
        {
            var window = timeWindow ?? TimeSpan.FromDays(7);
            var cutoffDate = DateTime.UtcNow - window;

            var trendingContent = await _context.SocialContentShares
                .Where(scs => scs.SharedAt >= cutoffDate)
                .GroupBy(scs => new { scs.ContentId, scs.ContentType, scs.ContentTitle })
                .Select(g => new
                {
                    g.Key.ContentId,
                    g.Key.ContentType,
                    g.Key.ContentTitle,
                    ShareCount = g.Count(),
                    UniqueSharers = g.Select(s => s.UserId).Distinct().Count(),
                    TotalEngagement = g.Sum(s => s.LikesCount + s.CommentsCount + s.SharesCount),
                    LatestShare = g.Max(s => s.SharedAt),
                    SharerIds = g.Select(s => s.UserId).ToList()
                })
                .ToListAsync();

            var trendingWithProof = new List<TrendingContent>();

            foreach (var item in trendingContent)
            {
                // Get content ranking
                var ranking = await RankContentBySocialProofAsync(item.ContentId, item.ContentType);

                // Calculate trend momentum (shares per day)
                var daysSinceFirst = (DateTime.UtcNow - (item.LatestShare - TimeSpan.FromDays(7))).TotalDays;
                var momentum = item.ShareCount / Math.Max(daysSinceFirst, 1);

                trendingWithProof.Add(new TrendingContent
                {
                    ContentId = item.ContentId,
                    ContentType = item.ContentType,
                    Title = item.ContentTitle,
                    ShareCount = item.ShareCount,
                    UniqueSharers = item.UniqueSharers,
                    TotalEngagement = item.TotalEngagement,
                    SocialProofScore = ranking.SocialProofScore,
                    TrendMomentum = Math.Round(momentum, 2),
                    InfluencerShareCount = ranking.InfluencerShareCount,
                    RankingTier = ranking.RankingTier,
                    LatestShareAt = item.LatestShare
                });
            }

            // Sort by a combination of social proof and trend momentum
            var results = trendingWithProof
                .OrderByDescending(tc => (tc.SocialProofScore * 0.6) + (tc.TrendMomentum * 0.4))
                .Take(limit)
                .ToList();

            await _logger.LogAsync("INFO", $"Retrieved {results.Count} trending content items");

            return results;
        }
        catch (Exception ex)
        {
            await _logger.LogAsync("ERROR", $"Failed to get trending content: {ex.Message}");
            return new List<TrendingContent>();
        }
    }

    public async Task<ServiceResult> RecalculateAllScoresAsync()
    {
        try
        {
            // ✅ FIX: Use database pagination instead of loading all user IDs into memory
            const int batchSize = 100;
            int processedUsers = 0;
            int skip = 0;
            bool hasMoreUsers = true;

            var totalUsers = await _context.Users.CountAsync();
            await _logger.LogAsync("INFO", $"Starting bulk social proof recalculation for {totalUsers} users");

            while (hasMoreUsers)
            {
                // Load user IDs in batches directly from database
                var userBatch = await _context.Users
                    .OrderBy(u => u.Id)
                    .Select(u => u.Id)
                    .Skip(skip)
                    .Take(batchSize)
                    .ToListAsync();

                if (!userBatch.Any())
                {
                    hasMoreUsers = false;
                    break;
                }

                foreach (var userId in userBatch)
                {
                    try
                    {
                        await CalculateUserSocialProofAsync(userId);
                        processedUsers++;
                    }
                    catch (Exception ex)
                    {
                        await _logger.LogAsync("WARNING", $"Failed to recalculate score for user {userId}: {ex.Message}");
                    }
                }

                // Save batch progress
                await _context.SaveChangesAsync();

                // Log every 1000 users
                if (processedUsers % 1000 == 0)
                {
                    await _logger.LogAsync("INFO", $"Processed {processedUsers}/{totalUsers} users");
                }

                skip += batchSize;

                // Safety check: if batch was smaller than expected, we're done
                if (userBatch.Count < batchSize)
                {
                    hasMoreUsers = false;
                }
            }

            await _logger.LogAsync("INFO", $"Bulk recalculation completed. Processed {processedUsers} users.");

            return new ServiceResult { IsSuccess = true };
        }
        catch (Exception ex)
        {
            await _logger.LogAsync("ERROR", $"Failed to recalculate all scores: {ex.Message}");
            return new ServiceResult
            { 
                IsSuccess = false, 
                ErrorMessage = "Failed to recalculate scores",
                ErrorCode = "BULK_CALCULATION_FAILED"
            };
        }
    }

    #region Private Helper Methods

    private async Task<double> CalculateInfluenceScoreAsync(List<SocialAccount> accounts)
    {
        if (!accounts.Any()) return 0;

        var totalFollowers = accounts.Sum(a => a.FollowersCount);
        var maxScore = 1.0;

        // Logarithmic scaling for follower count (diminishing returns for very high follower counts)
        var followerScore = Math.Min(maxScore, Math.Log10(totalFollowers + 1) / 7.0); // 10M followers = 1.0

        // Boost for verified accounts
        var verifiedBoost = accounts.Any(a => a.IsVerified) ? 0.1 : 0;

        // Boost for business/creator accounts
        var accountTypeBoost = accounts.Any(a => a.IsBusiness || a.IsCreator) ? 0.05 : 0;

        return Math.Min(maxScore, followerScore + verifiedBoost + accountTypeBoost);
    }

    private async Task<double> CalculateEngagementScoreAsync(List<SocialAccount> accounts)
    {
        if (!accounts.Any()) return 0;

        var totalEngagement = accounts.Sum(a => a.EngagementRate);
        var averageEngagement = totalEngagement / accounts.Count;

        // Engagement rate is typically 0-10%, normalize to 0-1
        var engagementScore = Math.Min(1.0, averageEngagement / 0.1);

        // Boost for consistent engagement across platforms
        var platformConsistencyBoost = accounts.Count > 1 && 
            accounts.All(a => a.EngagementRate > 0.01) ? 0.1 : 0;

        return Math.Min(1.0, engagementScore + platformConsistencyBoost);
    }

    private async Task<double> CalculateContentQualityScoreAsync(List<SocialAccount> accounts)
    {
        var accountIds = accounts.Select(a => a.Id).ToList();
        
        var posts = await _context.SocialPosts
            .Where(sp => accountIds.Contains(sp.SocialAccountId) && 
                        sp.PostedAt > DateTime.UtcNow.AddDays(-30))
            .ToListAsync();

        if (!posts.Any()) return 0.5; // Default score for accounts without recent posts

        var avgEngagementRate = posts.Average(p => p.EngagementRate);
        var avgLikes = posts.Average(p => p.LikesCount);
        var postFrequency = posts.Count / 30.0; // Posts per day

        // Quality based on engagement and posting frequency
        var qualityScore = (avgEngagementRate / 0.1) * 0.6 + // Engagement weight
                          Math.Min(1.0, postFrequency / 2.0) * 0.3 + // Frequency weight (ideal: 1-2 posts/day)
                          Math.Min(1.0, Math.Log10(avgLikes + 1) / 4.0) * 0.1; // Likes weight

        return Math.Min(1.0, qualityScore);
    }

    private async Task<double> CalculateNetworkScoreAsync(List<SocialAccount> accounts)
    {
        var accountIds = accounts.Select(a => a.Id).ToList();
        
        var relationships = await _context.SocialRelationship
            .Where(sr => accountIds.Contains(sr.SocialAccountId))
            .ToListAsync();

        if (!relationships.Any()) return 0;

        var mutualConnections = relationships.Count(r => r.RelationshipType == "mutual");
        var strongConnections = relationships.Count(r => r.RelationshipStrength > 0.7);
        var totalConnections = relationships.Count;

        // Network quality based on connection strength and mutuality
        var networkScore = (mutualConnections / Math.Max(totalConnections, 1.0)) * 0.5 +
                          (strongConnections / Math.Max(totalConnections, 1.0)) * 0.3 +
                          Math.Min(1.0, Math.Log10(totalConnections + 1) / 4.0) * 0.2;

        return Math.Min(1.0, networkScore);
    }

    private async Task<double> CalculateActivityScoreAsync(List<SocialAccount> accounts)
    {
        var userIds = accounts.Select(a => a.UserId).Distinct().ToList();
        
        var recentActivity = await _context.SocialInteraction
            .Include(si => si.SocialAccount)
            .Where(si => userIds.Contains(si.SocialAccount.UserId) && 
                        si.CreatedAt > DateTime.UtcNow.AddDays(-30))
            .CountAsync();

        var lastActivity = await _context.SocialInteraction
            .Include(si => si.SocialAccount)
            .Where(si => userIds.Contains(si.SocialAccount.UserId))
            .MaxAsync(si => (DateTime?)si.CreatedAt);

        // Activity score based on frequency and recency
        var frequencyScore = Math.Min(1.0, recentActivity / 100.0); // 100 interactions/month = 1.0
        var recencyScore = lastActivity.HasValue && lastActivity > DateTime.UtcNow.AddDays(-7) ? 1.0 : 0.5;

        return (frequencyScore * 0.7) + (recencyScore * 0.3);
    }

    private async Task<long> GetTotalConnectionsAsync(List<SocialAccount> accounts)
    {
        var accountIds = accounts.Select(a => a.Id).ToList();
        return await _context.SocialRelationship
            .Where(sr => accountIds.Contains(sr.SocialAccountId))
            .CountAsync();
    }

    private async Task<int> GetPostsLast30DaysAsync(List<SocialAccount> accounts)
    {
        var accountIds = accounts.Select(a => a.Id).ToList();
        return await _context.SocialPosts
            .Where(sp => accountIds.Contains(sp.SocialAccountId) && 
                        sp.PostedAt > DateTime.UtcNow.AddDays(-30))
            .CountAsync();
    }

    private async Task<int> GetInteractionsLast30DaysAsync(List<SocialAccount> accounts)
    {
        var accountIds = accounts.Select(a => a.Id).ToList();
        return await _context.SocialInteraction
            .Where(si => accountIds.Contains(si.SocialAccountId) && 
                        si.CreatedAt > DateTime.UtcNow.AddDays(-30))
            .CountAsync();
    }

    private string DetermineInfluenceTier(double overallScore, long totalFollowers, double engagementRate)
    {
        if (overallScore >= 0.8 && totalFollowers >= 1000000) return "celebrity";
        if (overallScore >= 0.6 && totalFollowers >= 100000) return "influencer";
        if (overallScore >= 0.4 && totalFollowers >= 10000) return "rising";
        if (overallScore >= 0.2) return "beginner";
        return "inactive";
    }

    private async Task<(int globalRank, double percentile)> CalculateGlobalRankingAsync(double score)
    {
        var totalUsers = await _context.SocialProofScores.CountAsync();
        if (totalUsers == 0) return (1, 100.0);

        var betterScoreCount = await _context.SocialProofScores
            .CountAsync(sps => sps.OverallScore > score);

        var globalRank = betterScoreCount + 1;
        var percentile = ((double)(totalUsers - betterScoreCount) / totalUsers) * 100;

        return (globalRank, percentile);
    }

    private double CalculateViralityScore(List<SocialContentShare> shares)
    {
        if (shares.Count < 2) return 0;

        var sortedShares = shares.OrderBy(s => s.SharedAt).ToList();
        var firstShare = sortedShares.FirstOrDefault();
        var lastShare = sortedShares.LastOrDefault();

        if (firstShare == null || lastShare == null) return 0;

        var timeSpan = (lastShare.SharedAt - firstShare.SharedAt).TotalHours;

        if (timeSpan <= 0) return 0;

        // Virality = shares per hour, normalized
        var viralityScore = shares.Count / timeSpan;
        return Math.Min(0.3, viralityScore / 10.0); // Max 0.3 bonus for very viral content
    }

    private string DetermineContentRankingTier(double score, int shareCount, int influencerShareCount)
    {
        if (score >= 3.0 && influencerShareCount >= 5) return "viral";
        if (score >= 2.0 && shareCount >= 50) return "trending";
        if (score >= 1.5 && shareCount >= 20) return "popular";
        if (score >= 1.0 && shareCount >= 5) return "rising";
        if (shareCount > 0) return "shared";
        return "unranked";
    }

    private SocialProofScore CreateDefaultScore(Guid userId, string platform)
    {
        return new SocialProofScore
        {
            UserId = userId,
            Platform = platform,
            OverallScore = 0.1, // Minimum score for new users
            InfluenceScore = 0.1,
            EngagementScore = 0.1,
            ContentQualityScore = 0.1,
            NetworkScore = 0.1,
            ActivityScore = 0.1,
            InfluenceTier = "beginner",
            CalculatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    private async Task StoreProofScoreAsync(SocialProofScore score)
    {
        var existing = await _context.SocialProofScores
            .FirstOrDefaultAsync(sps => sps.UserId == score.UserId && sps.Platform == score.Platform);

        if (existing != null)
        {
            // Update existing score
            existing.OverallScore = score.OverallScore;
            existing.InfluenceScore = score.InfluenceScore;
            existing.EngagementScore = score.EngagementScore;
            existing.ContentQualityScore = score.ContentQualityScore;
            existing.NetworkScore = score.NetworkScore;
            existing.ActivityScore = score.ActivityScore;
            existing.TotalFollowers = score.TotalFollowers;
            existing.TotalConnections = score.TotalConnections;
            existing.AverageEngagementRate = score.AverageEngagementRate;
            existing.PostsLast30Days = score.PostsLast30Days;
            existing.InteractionsLast30Days = score.InteractionsLast30Days;
            existing.GlobalRank = score.GlobalRank;
            existing.Percentile = score.Percentile;
            existing.InfluenceTier = score.InfluenceTier;
            existing.UpdatedAt = DateTime.UtcNow;
            existing.ScoreBreakdown = score.ScoreBreakdown;
        }
        else
        {
            _context.SocialProofScores.Add(score);
        }

        await _context.SaveChangesAsync();
    }

    #endregion
}

/// <summary>
/// User ranking information
/// </summary>
public class UserRanking
{
    public Guid UserId { get; set; }
    public string Username { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public double OverallScore { get; set; }
    public string InfluenceTier { get; set; } = string.Empty;
    public long TotalFollowers { get; set; }
    public double AverageEngagementRate { get; set; }
    public int GlobalRank { get; set; }
    public double Percentile { get; set; }
    public string Platform { get; set; } = string.Empty;
    public DateTime LastUpdated { get; set; }
}

/// <summary>
/// Content ranking information
/// </summary>
public class ContentRanking
{
    public string ContentId { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public double SocialProofScore { get; set; }
    public int ShareCount { get; set; }
    public int UniqueSharers { get; set; }
    public int InfluencerShareCount { get; set; }
    public int TotalEngagement { get; set; }
    public double AverageEngagementRate { get; set; }
    public string RankingTier { get; set; } = string.Empty;
    public double ViralityScore { get; set; }
    public double RecencyBoost { get; set; }
    public DateTime CalculatedAt { get; set; }
}


/// <summary>
/// Interface for social proof calculation service
/// </summary>
public interface ISocialProofCalculationService
{
    Task<SocialProofScore> CalculateUserSocialProofAsync(Guid userId, string? platform = null);
    Task<List<UserRanking>> GetTopInfluencersAsync(int limit = 50, string? platform = null, TimeSpan? timeWindow = null);
    Task<ContentRanking> RankContentBySocialProofAsync(string contentId, string contentType);
    Task<List<TrendingContent>> GetTrendingContentByProofAsync(int limit = 20, TimeSpan? timeWindow = null);
    Task<ServiceResult> RecalculateAllScoresAsync();
}