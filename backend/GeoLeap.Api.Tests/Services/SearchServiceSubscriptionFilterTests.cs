using Xunit;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;

namespace GeoLeap.Api.Tests.Services;

/// <summary>
/// TDD Tests for subscription-based search filtering and ranking
/// Tests: Model extensions, enrichment, filtering, and ranking boost
/// </summary>
public class SearchServiceSubscriptionFilterTests
{
    #region Step 1: Model Extension Tests

    [Fact]
    public void GlobalSearchRequest_UserSubscribedServices_DefaultsToNull()
    {
        // Arrange & Act
        var request = new GlobalSearchRequest();

        // Assert
        Assert.Null(request.UserSubscribedServices);
    }

    [Fact]
    public void GlobalSearchRequest_UserSubscribedServices_AcceptsList()
    {
        // Arrange
        var request = new GlobalSearchRequest();
        var services = new List<string> { "netflix", "hulu", "disney" };

        // Act
        request.UserSubscribedServices = services;

        // Assert
        Assert.Equal(3, request.UserSubscribedServices.Count);
        Assert.Contains("netflix", request.UserSubscribedServices);
    }

    [Fact]
    public void GlobalSearchRequest_OnlyUserServices_DefaultsToFalse()
    {
        // Arrange & Act
        var request = new GlobalSearchRequest();

        // Assert
        Assert.False(request.OnlyUserServices);
    }

    [Fact]
    public void GlobalSearchRequest_BoostUserServices_DefaultsToTrue()
    {
        // Arrange & Act
        var request = new GlobalSearchRequest();

        // Assert
        Assert.True(request.BoostUserServices);
    }

    [Fact]
    public void ContentSummary_IsOnUserService_DefaultsToFalse()
    {
        // Arrange & Act
        var summary = new ContentSummary();

        // Assert
        Assert.False(summary.IsOnUserService);
    }

    [Fact]
    public void ContentSummary_UserServiceMatchCount_DefaultsToZero()
    {
        // Arrange & Act
        var summary = new ContentSummary();

        // Assert
        Assert.Equal(0, summary.UserServiceMatchCount);
    }

    [Fact]
    public void GlobalStreamingOption_IsUserSubscription_DefaultsToFalse()
    {
        // Arrange & Act
        var option = new GlobalStreamingOption();

        // Assert
        Assert.False(option.IsUserSubscription);
    }

    #endregion

    #region Step 2: Enrichment Tests

    [Fact]
    public void EnrichResultsWithSubscriptionInfo_MarksUserSubscription_WhenServiceMatches()
    {
        // Arrange
        var results = new List<ContentSummary>
        {
            new ContentSummary
            {
                Id = "test-show-1",
                Title = "Test Show",
                StreamingOptions = new List<GlobalStreamingOption>
                {
                    new() { ServiceId = "netflix", ServiceName = "Netflix" },
                    new() { ServiceId = "hulu", ServiceName = "Hulu" }
                }
            }
        };
        var userServiceIds = new List<string> { "netflix" };

        // Act
        var enriched = SearchServiceSubscriptionFilterHelper.EnrichResultsWithSubscriptionInfo(results, userServiceIds);

        // Assert
        var result = enriched.First();
        Assert.True(result.IsOnUserService);
        Assert.Equal(1, result.UserServiceMatchCount);
        Assert.True(result.StreamingOptions.First(o => o.ServiceId == "netflix").IsUserSubscription);
        Assert.False(result.StreamingOptions.First(o => o.ServiceId == "hulu").IsUserSubscription);
    }

    [Fact]
    public void EnrichResultsWithSubscriptionInfo_ReturnsUnchanged_WhenNoUserServices()
    {
        // Arrange
        var results = new List<ContentSummary>
        {
            new ContentSummary
            {
                Id = "test-show-1",
                Title = "Test Show",
                StreamingOptions = new List<GlobalStreamingOption>
                {
                    new() { ServiceId = "netflix", ServiceName = "Netflix" }
                }
            }
        };

        // Act
        var enriched = SearchServiceSubscriptionFilterHelper.EnrichResultsWithSubscriptionInfo(results, null);

        // Assert
        var result = enriched.First();
        Assert.False(result.IsOnUserService);
        Assert.Equal(0, result.UserServiceMatchCount);
    }

    [Fact]
    public void EnrichResultsWithSubscriptionInfo_CountsMultipleMatches()
    {
        // Arrange
        var results = new List<ContentSummary>
        {
            new ContentSummary
            {
                Id = "test-show-1",
                Title = "Test Show",
                StreamingOptions = new List<GlobalStreamingOption>
                {
                    new() { ServiceId = "netflix", ServiceName = "Netflix" },
                    new() { ServiceId = "hulu", ServiceName = "Hulu" },
                    new() { ServiceId = "disney", ServiceName = "Disney+" }
                }
            }
        };
        var userServiceIds = new List<string> { "netflix", "disney" };

        // Act
        var enriched = SearchServiceSubscriptionFilterHelper.EnrichResultsWithSubscriptionInfo(results, userServiceIds);

        // Assert
        var result = enriched.First();
        Assert.True(result.IsOnUserService);
        Assert.Equal(2, result.UserServiceMatchCount);
    }

    #endregion

    #region Step 3: Filtering Tests

    [Fact]
    public void FilterByUserSubscriptions_ReturnsOnlyMatchingContent()
    {
        // Arrange
        var results = new List<ContentSummary>
        {
            new ContentSummary
            {
                Id = "show-1",
                Title = "Show 1",
                StreamingOptions = new List<GlobalStreamingOption>
                {
                    new() { ServiceId = "netflix" }
                }
            },
            new ContentSummary
            {
                Id = "show-2",
                Title = "Show 2",
                StreamingOptions = new List<GlobalStreamingOption>
                {
                    new() { ServiceId = "hulu" }
                }
            },
            new ContentSummary
            {
                Id = "show-3",
                Title = "Show 3",
                StreamingOptions = new List<GlobalStreamingOption>
                {
                    new() { ServiceId = "netflix" },
                    new() { ServiceId = "disney" }
                }
            }
        };
        var userServiceIds = new List<string> { "netflix" };

        // Act
        var filtered = SearchServiceSubscriptionFilterHelper.FilterByUserSubscriptions(results, userServiceIds);

        // Assert
        Assert.Equal(2, filtered.Count);
        Assert.Contains(filtered, r => r.Id == "show-1");
        Assert.Contains(filtered, r => r.Id == "show-3");
        Assert.DoesNotContain(filtered, r => r.Id == "show-2");
    }

    [Fact]
    public void FilterByUserSubscriptions_ReturnsEmpty_WhenNoMatches()
    {
        // Arrange
        var results = new List<ContentSummary>
        {
            new ContentSummary
            {
                Id = "show-1",
                StreamingOptions = new List<GlobalStreamingOption>
                {
                    new() { ServiceId = "hulu" }
                }
            }
        };
        var userServiceIds = new List<string> { "netflix" };

        // Act
        var filtered = SearchServiceSubscriptionFilterHelper.FilterByUserSubscriptions(results, userServiceIds);

        // Assert
        Assert.Empty(filtered);
    }

    #endregion

    #region Step 4: Ranking Boost Tests

    [Fact]
    public void ApplySubscriptionRankingBoost_IncreasesScore_ForUserServices()
    {
        // Arrange
        var results = new List<ContentSummary>
        {
            new ContentSummary
            {
                Id = "show-1",
                RelevanceScore = 1.0m,
                IsOnUserService = true,
                UserServiceMatchCount = 1
            },
            new ContentSummary
            {
                Id = "show-2",
                RelevanceScore = 1.2m,
                IsOnUserService = false,
                UserServiceMatchCount = 0
            }
        };

        // Act
        var boosted = SearchServiceSubscriptionFilterHelper.ApplySubscriptionRankingBoost(results, 1.5m);

        // Assert
        var boostedShow = boosted.First(r => r.Id == "show-1");
        var unboostedShow = boosted.First(r => r.Id == "show-2");

        Assert.True(boostedShow.RelevanceScore > 1.0m); // Boosted
        Assert.Equal(1.2m, unboostedShow.RelevanceScore); // Unchanged
    }

    [Fact]
    public void ApplySubscriptionRankingBoost_ResortsResults()
    {
        // Arrange - show-2 has higher base score but show-1 is on user service
        var results = new List<ContentSummary>
        {
            new ContentSummary
            {
                Id = "show-1",
                RelevanceScore = 0.8m,
                IsOnUserService = true,
                UserServiceMatchCount = 1
            },
            new ContentSummary
            {
                Id = "show-2",
                RelevanceScore = 1.0m,
                IsOnUserService = false,
                UserServiceMatchCount = 0
            }
        };

        // Act
        var boosted = SearchServiceSubscriptionFilterHelper.ApplySubscriptionRankingBoost(results, 1.5m);

        // Assert - After 1.5x boost, show-1 (0.8 * 1.5 = 1.2) should be first
        Assert.Equal("show-1", boosted.First().Id);
    }

    #endregion
}
