using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace GeoLeap.Api.Services;

/// <summary>
/// Implements search limits for 2-step conversion funnel:
/// - Anonymous: 3 searches total → signup_required
/// - Free registered: Unlimited searches
/// - Premium: Unlimited
/// </summary>
public class SearchLimitService : ISearchLimitService
{
    private readonly IRedisCacheService _cache;
    private readonly ApplicationDbContext _context;
    private readonly ILogger<SearchLimitService> _logger;

    // Limit constants
    private const int AnonymousSearchLimit = 3;

    // Redis key prefixes
    private const string AnonymousKeyPrefix = "anon:searches:";
    private const string AnonymousIpKeyPrefix = "anon:searches:ip:";
    private const string UserKeyPrefix = "user:searches:";

    public SearchLimitService(
        IRedisCacheService cache,
        ApplicationDbContext context,
        ILogger<SearchLimitService> logger)
    {
        _cache = cache;
        _context = context;
        _logger = logger;
    }

    public async Task<SearchLimitResult> CheckAndIncrementAsync(
        Guid? userId,
        string? anonymousId,
        string? ipFingerprint,
        CancellationToken cancellationToken = default)
    {
        // Premium/Admin users have no limits
        if (userId.HasValue)
        {
            var userTier = await GetUserTierAsync(userId.Value, cancellationToken);
            if (userTier == SubscriptionTier.Premium || userTier == SubscriptionTier.Admin)
            {
                _logger.LogDebug("Premium/Admin user {UserId} - unlimited searches", userId);
                return new SearchLimitResult(
                    CanSearch: true,
                    SearchesUsed: 0,
                    SearchLimit: int.MaxValue,
                    BlockReason: null,
                    ResetsAt: null
                );
            }

            // Free registered user - daily limit
            return await CheckFreeUserLimitAsync(userId.Value, cancellationToken);
        }

        // Anonymous user - total limit of 1
        return await CheckAnonymousLimitAsync(anonymousId, ipFingerprint, cancellationToken);
    }

    public async Task<SearchLimitResult> GetLimitStatusAsync(
        Guid? userId,
        string? anonymousId,
        string? ipFingerprint,
        CancellationToken cancellationToken = default)
    {
        // Same logic as CheckAndIncrementAsync but without incrementing
        if (userId.HasValue)
        {
            var userTier = await GetUserTierAsync(userId.Value, cancellationToken);
            if (userTier == SubscriptionTier.Premium || userTier == SubscriptionTier.Admin)
            {
                return new SearchLimitResult(true, 0, int.MaxValue, null, null);
            }

            // Free registered users are unlimited
            return new SearchLimitResult(
                CanSearch: true,
                SearchesUsed: 0,
                SearchLimit: int.MaxValue,
                BlockReason: null,
                ResetsAt: null
            );
        }

        // Anonymous user
        var anonCount = await GetAnonymousSearchCountAsync(anonymousId, ipFingerprint);
        return new SearchLimitResult(
            CanSearch: anonCount < AnonymousSearchLimit,
            SearchesUsed: anonCount,
            SearchLimit: AnonymousSearchLimit,
            BlockReason: anonCount >= AnonymousSearchLimit ? "signup_required" : null,
            ResetsAt: null // Anonymous limits never reset
        );
    }

    public async Task ClearLimitsAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var key = GetUserDailyKey(userId);
        await _cache.RemoveAsync(key);
        _logger.LogInformation("Cleared search limits for user {UserId}", userId);
    }

    public async Task MigrateAnonymousToUserAsync(
        string anonymousId,
        string? ipFingerprint,
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        // When user registers, we don't need to migrate counts
        // They get a fresh 5 searches/day as a registered free user
        // Just clear the anonymous tracking keys

        if (!string.IsNullOrEmpty(anonymousId))
        {
            var anonKey = $"{AnonymousKeyPrefix}{anonymousId}";
            await _cache.RemoveAsync(anonKey);
        }

        if (!string.IsNullOrEmpty(ipFingerprint))
        {
            var ipKey = $"{AnonymousIpKeyPrefix}{ipFingerprint}";
            await _cache.RemoveAsync(ipKey);
        }

        _logger.LogInformation(
            "Migrated anonymous user {AnonymousId} to registered user {UserId}",
            anonymousId, userId);
    }

    private async Task<SearchLimitResult> CheckAnonymousLimitAsync(
        string? anonymousId,
        string? ipFingerprint,
        CancellationToken cancellationToken)
    {
        var currentCount = await GetAnonymousSearchCountAsync(anonymousId, ipFingerprint);

        if (currentCount >= AnonymousSearchLimit)
        {
            _logger.LogDebug(
                "Anonymous user blocked - limit reached. AnonId: {AnonId}, IP: {IpHash}",
                anonymousId?.Substring(0, Math.Min(8, anonymousId?.Length ?? 0)) ?? "none",
                ipFingerprint?.Substring(0, Math.Min(8, ipFingerprint?.Length ?? 0)) ?? "none");

            return new SearchLimitResult(
                CanSearch: false,
                SearchesUsed: currentCount,
                SearchLimit: AnonymousSearchLimit,
                BlockReason: "signup_required",
                ResetsAt: null
            );
        }

        // Increment counters
        if (!string.IsNullOrEmpty(anonymousId))
        {
            var anonKey = $"{AnonymousKeyPrefix}{anonymousId}";
            await _cache.IncrementAsync(anonKey, 1, null); // No expiry for anonymous
        }

        if (!string.IsNullOrEmpty(ipFingerprint))
        {
            var ipKey = $"{AnonymousIpKeyPrefix}{ipFingerprint}";
            await _cache.IncrementAsync(ipKey, 1, null); // No expiry for IP fingerprint
        }

        _logger.LogDebug("Anonymous search allowed. Count: {Count}/{Limit}", currentCount + 1, AnonymousSearchLimit);

        return new SearchLimitResult(
            CanSearch: true,
            SearchesUsed: currentCount + 1,
            SearchLimit: AnonymousSearchLimit,
            BlockReason: null,
            ResetsAt: null
        );
    }

    private async Task<SearchLimitResult> CheckFreeUserLimitAsync(
        Guid userId,
        CancellationToken cancellationToken)
    {
        // Free registered users get unlimited searches.
        // Increment counter for analytics purposes only — it does not gate access.
        var key = GetUserDailyKey(userId);
        var resetsAt = GetNextMidnightUtc();
        var ttl = resetsAt - DateTime.UtcNow;
        await _cache.IncrementAsync(key, 1, ttl);

        _logger.LogDebug("Free user {UserId} search allowed (unlimited)", userId);

        return new SearchLimitResult(
            CanSearch: true,
            SearchesUsed: 0,
            SearchLimit: int.MaxValue,
            BlockReason: null,
            ResetsAt: null
        );
    }

    private async Task<int> GetAnonymousSearchCountAsync(string? anonymousId, string? ipFingerprint)
    {
        var maxCount = 0;

        // Check localStorage-based ID
        if (!string.IsNullOrEmpty(anonymousId))
        {
            var anonKey = $"{AnonymousKeyPrefix}{anonymousId}";
            var anonCount = await _cache.GetAsync<int?>(anonKey) ?? 0;
            maxCount = Math.Max(maxCount, anonCount);
        }

        // Check IP fingerprint (fallback for users who clear localStorage)
        if (!string.IsNullOrEmpty(ipFingerprint))
        {
            var ipKey = $"{AnonymousIpKeyPrefix}{ipFingerprint}";
            var ipCount = await _cache.GetAsync<int?>(ipKey) ?? 0;
            maxCount = Math.Max(maxCount, ipCount);
        }

        return maxCount;
    }

    private async Task<SubscriptionTier> GetUserTierAsync(Guid userId, CancellationToken cancellationToken)
    {
        // Check subscription table first for active subscription
        var subscription = await _context.Subscriptions
            .AsNoTracking()
            .Where(s => s.UserId == userId && s.Status == "active")
            .OrderByDescending(s => s.PlanType) // Order by plan type (premium > basic)
            .FirstOrDefaultAsync(cancellationToken);

        if (subscription != null)
        {
            // Convert PlanType string to SubscriptionTier enum
            return subscription.PlanType?.ToLower() switch
            {
                "premium" => SubscriptionTier.Premium,
                "pro" => SubscriptionTier.Pro,
                "basic" => SubscriptionTier.Basic,
                _ => SubscriptionTier.Free // Unknown plan type - default to free (fail-safe, not privilege escalation)
            };
        }

        // Fall back to user table subscription tier field
        var user = await _context.Users
            .AsNoTracking()
            .Where(u => u.Id == userId)
            .Select(u => u.SubscriptionTier)
            .FirstOrDefaultAsync(cancellationToken);

        return user?.ToLower() switch
        {
            "premium" => SubscriptionTier.Premium,
            "admin" => SubscriptionTier.Admin,
            "basic" => SubscriptionTier.Basic,
            _ => SubscriptionTier.Free
        };
    }

    private static string GetUserDailyKey(Guid userId)
    {
        var date = DateTime.UtcNow.ToString("yyyy-MM-dd");
        return $"{UserKeyPrefix}{userId}:{date}";
    }

    private static DateTime GetNextMidnightUtc()
    {
        var now = DateTime.UtcNow;
        return now.Date.AddDays(1);
    }
}
