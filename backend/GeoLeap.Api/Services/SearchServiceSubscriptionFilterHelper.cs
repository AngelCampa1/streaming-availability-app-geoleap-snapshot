using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

/// <summary>
/// Helper methods for subscription-based search filtering and ranking
/// </summary>
public static class SearchServiceSubscriptionFilterHelper
{
    /// <summary>
    /// Enrich search results with user subscription information
    /// </summary>
    public static List<ContentSummary> EnrichResultsWithSubscriptionInfo(
        List<ContentSummary> results,
        List<string>? userServiceIds)
    {
        if (userServiceIds == null || !userServiceIds.Any())
            return results;

        foreach (var result in results)
        {
            if (result.StreamingOptions != null)
            {
                foreach (var option in result.StreamingOptions)
                {
                    option.IsUserSubscription = userServiceIds.Contains(
                        option.ServiceId,
                        StringComparer.OrdinalIgnoreCase);
                }

                result.IsOnUserService = result.StreamingOptions.Any(o => o.IsUserSubscription);
                result.UserServiceMatchCount = result.StreamingOptions.Count(o => o.IsUserSubscription);
            }
        }

        return results;
    }

    /// <summary>
    /// Filter results to only include content on user's subscribed services
    /// </summary>
    public static List<ContentSummary> FilterByUserSubscriptions(
        List<ContentSummary> results,
        List<string> userServiceIds)
    {
        return results.Where(r =>
            r.StreamingOptions != null &&
            r.StreamingOptions.Any(o =>
                userServiceIds.Contains(o.ServiceId, StringComparer.OrdinalIgnoreCase)
            )
        ).ToList();
    }

    /// <summary>
    /// Apply ranking boost for content available on user's subscribed services
    /// </summary>
    public static List<ContentSummary> ApplySubscriptionRankingBoost(
        List<ContentSummary> results,
        decimal boostMultiplier)
    {
        foreach (var result in results)
        {
            if (result.IsOnUserService)
            {
                // Apply boost based on how many user services have the content
                var baseBoost = boostMultiplier;
                var additionalBoost = (result.UserServiceMatchCount - 1) * 0.1m; // 10% per additional service
                var totalBoost = Math.Min(baseBoost + additionalBoost, 2.0m); // Cap at 2x

                result.RelevanceScore = result.RelevanceScore * totalBoost;
            }
        }

        // Re-sort by relevance score
        return results.OrderByDescending(r => r.RelevanceScore).ToList();
    }
}
