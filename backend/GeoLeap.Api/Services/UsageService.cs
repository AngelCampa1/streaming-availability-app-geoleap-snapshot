using Microsoft.EntityFrameworkCore;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

public class UsageService : IUsageService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<UsageService> _logger;

    // Define tier-based search limits
    private static readonly Dictionary<string, int> TierSearchLimits = new()
    {
        { "free", 100 },
        { "premium", 1000 },
        { "lifetime", int.MaxValue }
    };

    public UsageService(
        ApplicationDbContext context,
        ILogger<UsageService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<UserUsageDto> GetUserUsageAsync(Guid userId)
    {
        try
        {
            // Get user with subscription tier
            var user = await _context.Users
                .AsNoTracking()
                .FirstOrDefaultAsync(u => u.Id == userId);

            if (user == null)
            {
                _logger.LogWarning("User not found: {UserId}", userId);
                throw new InvalidOperationException("User not found");
            }

            var subscriptionTier = user.SubscriptionTier ?? "free";
            var searchLimit = GetSearchLimitForTier(subscriptionTier);

            // Get current month's search count
            var monthStart = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1);
            var monthEnd = monthStart.AddMonths(1);

            var searchesUsed = await _context.SearchAnalyticsEvents
                .Where(s => s.UserId == userId &&
                           s.Timestamp >= monthStart &&
                           s.Timestamp < monthEnd &&
                           s.EventType == "search")
                .CountAsync();

            // Calculate next reset date (first day of next month)
            var nextResetDate = monthEnd;

            return new UserUsageDto
            {
                SearchesUsed = searchesUsed,
                SearchesLimit = searchLimit,
                SearchesRemaining = Math.Max(0, searchLimit - searchesUsed),
                Period = "monthly",
                ResetDate = nextResetDate,
                Tier = subscriptionTier
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting user usage for user {UserId}", userId);
            throw;
        }
    }

    public async Task<bool> IncrementSearchUsageAsync(Guid userId)
    {
        try
        {
            var canPerform = await CanPerformSearchAsync(userId);
            if (!canPerform)
            {
                _logger.LogWarning("User {UserId} exceeded search limit", userId);
                return false;
            }

            // The SearchAnalytics record should be created by the SearchController
            // This method just validates the limit
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error incrementing search usage for user {UserId}", userId);
            return false;
        }
    }

    public async Task<bool> CanPerformSearchAsync(Guid userId)
    {
        try
        {
            var remaining = await GetRemainingSearchesAsync(userId);
            return remaining > 0;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error checking if user {UserId} can perform search", userId);
            return false;
        }
    }

    public async Task<int> GetRemainingSearchesAsync(Guid userId)
    {
        try
        {
            var usage = await GetUserUsageAsync(userId);
            return usage.SearchesRemaining;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting remaining searches for user {UserId}", userId);
            return 0;
        }
    }

    private int GetSearchLimitForTier(string tier)
    {
        return TierSearchLimits.TryGetValue(tier.ToLowerInvariant(), out var limit)
            ? limit
            : TierSearchLimits["free"];
    }
}
