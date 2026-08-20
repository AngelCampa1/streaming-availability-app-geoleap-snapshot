using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Xunit;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using GeoLeap.Api;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using System.Net.Http;
using System.Text.Json;
using System.Text;
using System.Linq;

namespace GeoLeap.Api.Tests.SocialIntegration;

/// <summary>
/// Social Media Analytics and Monitoring Test Framework
/// Tests social metrics collection, KPI tracking, and recommendation performance analysis
/// </summary>
public class SocialAnalyticsTestFramework : IClassFixture<WebApplicationFactory<Program>>, IDisposable
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;
    private readonly string _testUserId = Guid.NewGuid().ToString();

    public SocialAnalyticsTestFramework(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
        _client = _factory.CreateClient();
    }

    #region Social Engagement Metrics Tests

    [Fact]
    public async Task SocialEngagement_ShouldTrackUserInteractionMetrics()
    {
        // Arrange
        var socialInteractions = new[]
        {
            new { userId = _testUserId, action = "friend_connected", platform = "facebook", timestamp = DateTime.UtcNow },
            new { userId = _testUserId, action = "content_liked", platform = "facebook", contentId = "movie_123", timestamp = DateTime.UtcNow },
            new { userId = _testUserId, action = "content_shared", platform = "twitter", contentId = "tv_456", timestamp = DateTime.UtcNow },
            new { userId = _testUserId, action = "recommendation_clicked", platform = "instagram", contentId = "movie_789", timestamp = DateTime.UtcNow }
        };
        
        // Act - Record interactions
        foreach (var interaction in socialInteractions)
        {
            var response = await _client.PostAsJsonAsync("/api/analytics/social-interaction", interaction);
            response.Should().HaveStatusCode(System.Net.HttpStatusCode.OK);
        }
        
        // Act - Get engagement metrics
        var metricsResponse = await _client.GetAsync($"/api/analytics/social-engagement?user_id={_testUserId}&timeframe=24h");
        
        // Assert
        metricsResponse.Should().HaveStatusCode(System.Net.HttpStatusCode.OK);
        var content = await metricsResponse.Content.ReadAsStringAsync();
        var metrics = JsonSerializer.Deserialize<Dictionary<string, object>>(content);
        
        metrics.Should().ContainKey("total_interactions");
        metrics.Should().ContainKey("interactions_by_platform");
        metrics.Should().ContainKey("engagement_rate");
        metrics.Should().ContainKey("top_actions");
        
        // Verify interaction counts
        var totalInteractions = ((JsonElement)metrics["total_interactions"]).GetInt32();
        totalInteractions.Should().Be(4);
        
        var platformBreakdown = JsonSerializer.Deserialize<Dictionary<string, int>>(
            ((JsonElement)metrics["interactions_by_platform"]).GetRawText());
        platformBreakdown["facebook"].Should().Be(2);
        platformBreakdown["twitter"].Should().Be(1);
        platformBreakdown["instagram"].Should().Be(1);
    }

    [Fact]
    public async Task SocialEngagement_ShouldMeasureUserRetentionImprovement()
    {
        // Arrange - Create users with and without social connections
        var usersWithSocial = await CreateUsersWithSocialConnections(50);
        var usersWithoutSocial = await CreateUsersWithoutSocialConnections(50);
        
        // Simulate user activity over time
        await SimulateUserActivityOverTime(usersWithSocial, 30, true); // 30 days with social features
        await SimulateUserActivityOverTime(usersWithoutSocial, 30, false); // 30 days without social features
        
        // Act - Calculate retention metrics
        var retentionResponse = await _client.GetAsync("/api/analytics/retention-comparison?timeframe=30d");
        
        // Assert
        retentionResponse.Should().HaveStatusCode(System.Net.HttpStatusCode.OK);
        var content = await retentionResponse.Content.ReadAsStringAsync();
        var retentionData = JsonSerializer.Deserialize<Dictionary<string, object>>(content);
        
        retentionData.Should().ContainKey("users_with_social_retention");
        retentionData.Should().ContainKey("users_without_social_retention");
        retentionData.Should().ContainKey("retention_improvement");
        
        var socialRetention = ((JsonElement)retentionData["users_with_social_retention"]).GetDouble();
        var nonSocialRetention = ((JsonElement)retentionData["users_without_social_retention"]).GetDouble();
        var improvement = ((JsonElement)retentionData["retention_improvement"]).GetDouble();
        
        // Social users should have higher retention
        socialRetention.Should().BeGreaterThan(nonSocialRetention);
        improvement.Should().BeGreaterThan(0.30); // >30% improvement target
    }

    [Fact]
    public async Task SocialEngagement_ShouldTrackFriendDiscoveryUsage()
    {
        // Arrange
        var friendDiscoveryEvents = new[]
        {
            new { userId = _testUserId, action = "friend_discovery_initiated", platform = "facebook", timestamp = DateTime.UtcNow },
            new { userId = _testUserId, action = "friend_list_accessed", platform = "facebook", friendsCount = 156, timestamp = DateTime.UtcNow },
            new { userId = _testUserId, action = "friend_connected", platform = "facebook", friendId = "friend_123", timestamp = DateTime.UtcNow },
            new { userId = _testUserId, action = "mutual_friends_explored", platform = "facebook", mutualCount = 8, timestamp = DateTime.UtcNow }
        };
        
        // Act - Record friend discovery events
        foreach (var eventData in friendDiscoveryEvents)
        {
            await _client.PostAsJsonAsync("/api/analytics/friend-discovery-event", eventData);
        }
        
        // Act - Get friend discovery metrics
        var metricsResponse = await _client.GetAsync($"/api/analytics/friend-discovery-metrics?user_id={_testUserId}");
        
        // Assert
        metricsResponse.Should().HaveStatusCode(System.Net.HttpStatusCode.OK);
        var content = await metricsResponse.Content.ReadAsStringAsync();
        var metrics = JsonSerializer.Deserialize<Dictionary<string, object>>(content);
        
        metrics.Should().ContainKey("discovery_sessions");
        metrics.Should().ContainKey("friends_discovered");
        metrics.Should().ContainKey("friends_connected");
        metrics.Should().ContainKey("connection_rate");
        
        // Verify usage tracking
        var discoverySessions = ((JsonElement)metrics["discovery_sessions"]).GetInt32();
        var friendsConnected = ((JsonElement)metrics["friends_connected"]).GetInt32();
        
        discoverySessions.Should().BeGreaterThan(0);
        friendsConnected.Should().BeGreaterThan(0);
    }

    #endregion

    #region Social Recommendation Performance Tests

    [Fact]
    public async Task SocialRecommendations_ShouldAchieveHigherCTRThanRegular()
    {
        // Arrange - Create recommendation test data
        var socialRecommendations = await CreateSocialRecommendations(_testUserId, 100);
        var regularRecommendations = await CreateRegularRecommendations(_testUserId, 100);
        
        // Act - Simulate user interactions with recommendations
        await SimulateRecommendationInteractions(socialRecommendations, clickRate: 0.125); // 12.5% CTR
        await SimulateRecommendationInteractions(regularRecommendations, clickRate: 0.08);  // 8% CTR
        
        // Act - Get CTR comparison
        var ctrResponse = await _client.GetAsync(
            $"/api/analytics/recommendation-performance?user_id={_testUserId}&timeframe=7d");
        
        // Assert
        ctrResponse.Should().HaveStatusCode(System.Net.HttpStatusCode.OK);
        var content = await ctrResponse.Content.ReadAsStringAsync();
        var performance = JsonSerializer.Deserialize<Dictionary<string, object>>(content);
        
        performance.Should().ContainKey("social_ctr");
        performance.Should().ContainKey("regular_ctr");
        performance.Should().ContainKey("ctr_improvement");
        
        var socialCtr = ((JsonElement)performance["social_ctr"]).GetDouble();
        var regularCtr = ((JsonElement)performance["regular_ctr"]).GetDouble();
        var ctrImprovement = ((JsonElement)performance["ctr_improvement"]).GetDouble();
        
        // Social recommendations should have >15% higher CTR
        ctrImprovement.Should().BeGreaterThan(0.15);
        socialCtr.Should().BeGreaterThan(regularCtr);
    }

    [Fact]
    public async Task SocialRecommendations_ShouldTrackSocialProofEffectiveness()
    {
        // Arrange - Create recommendations with varying social proof levels
        var highSocialProofRecs = await CreateRecommendationsWithSocialProof(
            _testUserId, count: 20, friendsEngaged: 10, networkPopularity: 0.8);
        var lowSocialProofRecs = await CreateRecommendationsWithSocialProof(
            _testUserId, count: 20, friendsEngaged: 2, networkPopularity: 0.3);
        
        // Act - Simulate interactions based on social proof strength
        await SimulateRecommendationInteractions(highSocialProofRecs, clickRate: 0.20); // Higher engagement
        await SimulateRecommendationInteractions(lowSocialProofRecs, clickRate: 0.10);   // Lower engagement
        
        // Act - Analyze social proof impact
        var impactResponse = await _client.GetAsync(
            $"/api/analytics/social-proof-impact?user_id={_testUserId}&timeframe=7d");
        
        // Assert
        impactResponse.Should().HaveStatusCode(System.Net.HttpStatusCode.OK);
        var content = await impactResponse.Content.ReadAsStringAsync();
        var impact = JsonSerializer.Deserialize<Dictionary<string, object>>(content);
        
        impact.Should().ContainKey("high_social_proof_ctr");
        impact.Should().ContainKey("low_social_proof_ctr");
        impact.Should().ContainKey("social_proof_effectiveness");
        
        var highSocialCtr = ((JsonElement)impact["high_social_proof_ctr"]).GetDouble();
        var lowSocialCtr = ((JsonElement)impact["low_social_proof_ctr"]).GetDouble();
        var effectiveness = ((JsonElement)impact["social_proof_effectiveness"]).GetDouble();
        
        // High social proof should drive better engagement
        highSocialCtr.Should().BeGreaterThan(lowSocialCtr);
        effectiveness.Should().BeGreaterThan(0.2); // >20% improvement from social proof
    }

    [Fact]
    public async Task SocialRecommendations_ShouldMeasureRecommendationAccuracy()
    {
        // Arrange - Create diverse recommendations
        var recommendations = await CreateDiverseRecommendations(_testUserId, 50);
        
        // Act - Simulate user feedback (likes, dislikes, watches)
        await SimulateUserFeedbackOnRecommendations(recommendations, {
            likeRate: 0.35,      // 35% like rate
            watchRate: 0.60,     // 60% watch rate  
            completeRate: 0.45   // 45% completion rate
        });
        
        // Act - Calculate recommendation accuracy metrics
        var accuracyResponse = await _client.GetAsync(
            $"/api/analytics/recommendation-accuracy?user_id={_testUserId}&timeframe=30d");
        
        // Assert
        accuracyResponse.Should().HaveStatusCode(System.Net.HttpStatusCode.OK);
        var content = await accuracyResponse.Content.ReadAsStringAsync();
        var accuracy = JsonSerializer.Deserialize<Dictionary<string, object>>(content);
        
        accuracy.Should().ContainKey("precision_score");
        accuracy.Should().ContainKey("recall_score");
        accuracy.Should().ContainKey("user_satisfaction_score");
        accuracy.Should().ContainKey("social_influence_score");
        
        var precision = ((JsonElement)accuracy["precision_score"]).GetDouble();
        var userSatisfaction = ((JsonElement)accuracy["user_satisfaction_score"]).GetDouble();
        var socialInfluence = ((JsonElement)accuracy["social_influence_score"]).GetDouble();
        
        // Recommendations should meet quality thresholds
        precision.Should().BeGreaterThan(0.7);         // >70% precision
        userSatisfaction.Should().BeGreaterThan(0.75); // >75% satisfaction
        socialInfluence.Should().BeGreaterThan(0.6);   // >60% social influence
    }

    #endregion

    #region Network Effects and Viral Growth Tests

    [Fact]
    public async Task NetworkEffects_ShouldTrackViralCoefficientAndGrowth()
    {
        // Arrange - Create initial user base with social connections
        var seedUsers = await CreateConnectedUserNetwork(100, connectionDensity: 0.15);
        
        // Act - Simulate viral content sharing and user acquisition
        var viralContent = await CreateViralContent(5);
        await SimulateViralSharing(seedUsers, viralContent, shareRate: 0.25, acquisitionRate: 0.08);
        
        // Act - Calculate viral metrics
        var viralResponse = await _client.GetAsync("/api/analytics/viral-metrics?timeframe=30d");
        
        // Assert
        viralResponse.Should().HaveStatusCode(System.Net.HttpStatusCode.OK);
        var content = await viralResponse.Content.ReadAsStringAsync();
        var viralMetrics = JsonSerializer.Deserialize<Dictionary<string, object>>(content);
        
        viralMetrics.Should().ContainKey("viral_coefficient");
        viralMetrics.Should().ContainKey("network_growth_rate");
        viralMetrics.Should().ContainKey("content_reach_multiplier");
        viralMetrics.Should().ContainKey("new_users_from_social");
        
        var viralCoefficient = ((JsonElement)viralMetrics["viral_coefficient"]).GetDouble();
        var networkGrowthRate = ((JsonElement)viralMetrics["network_growth_rate"]).GetDouble();
        var newUsersFromSocial = ((JsonElement)viralMetrics["new_users_from_social"]).GetInt32();
        
        // Network should demonstrate viral growth
        viralCoefficient.Should().BeGreaterThan(1.0);  // Viral coefficient > 1
        networkGrowthRate.Should().BeGreaterThan(0.1); // >10% network growth
        newUsersFromSocial.Should().BeGreaterThan(8);  // >10% acquisition from social
    }

    [Fact]
    public async Task NetworkEffects_ShouldMeasureSocialInfluenceOnContentDiscovery()
    {
        // Arrange - Create content discovery scenarios
        var influentialUsers = await CreateInfluentialUsers(10, avgFollowers: 500);
        var regularUsers = await CreateRegularUsers(90, avgFollowers: 50);
        var contentItems = await CreateContentForDiscoveryTest(100);
        
        // Act - Simulate content sharing by different user types
        await SimulateContentSharing(influentialUsers, contentItems, shareRate: 0.15);
        await SimulateContentSharing(regularUsers, contentItems, shareRate: 0.08);
        
        // Act - Measure content discovery through social channels
        var discoveryResponse = await _client.GetAsync(
            "/api/analytics/social-content-discovery?timeframe=7d");
        
        // Assert
        discoveryResponse.Should().HaveStatusCode(System.Net.HttpStatusCode.OK);
        var content = await discoveryResponse.Content.ReadAsStringAsync();
        var discovery = JsonSerializer.Deserialize<Dictionary<string, object>>(content);
        
        discovery.Should().ContainKey("content_discovered_via_social");
        discovery.Should().ContainKey("influencer_impact_factor");
        discovery.Should().ContainKey("social_discovery_rate");
        discovery.Should().ContainKey("network_amplification");
        
        var socialDiscoveryRate = ((JsonElement)discovery["social_discovery_rate"]).GetDouble();
        var influencerImpact = ((JsonElement)discovery["influencer_impact_factor"]).GetDouble();
        var networkAmplification = ((JsonElement)discovery["network_amplification"]).GetDouble();
        
        // Social discovery should be significant
        socialDiscoveryRate.Should().BeGreaterThan(0.25);  // >25% of content discovered socially
        influencerImpact.Should().BeGreaterThan(2.0);       // Influencers 2x more effective
        networkAmplification.Should().BeGreaterThan(1.5);  // 1.5x content reach amplification
    }

    [Fact]
    public async Task NetworkEffects_ShouldTrackCommunityFormationAroundContent()
    {
        // Arrange - Create content with potential for community building
        var nichContent = await CreateNicheContent(20, categories: new[] { "anime", "documentaries", "k-drama" });
        var diverseUsers = await CreateUsersWithInterests(200, interestDistribution: 0.3);
        
        // Act - Simulate community formation around content
        await SimulateCommunityInteractions(diverseUsers, nichContent, {
            discussionRate: 0.15,
            recommendationRate: 0.20,
            followRate: 0.08
        });
        
        // Act - Analyze community formation metrics
        var communityResponse = await _client.GetAsync(
            "/api/analytics/community-formation?timeframe=30d");
        
        // Assert
        communityResponse.Should().HaveStatusCode(System.Net.HttpStatusCode.OK);
        var content = await communityResponse.Content.ReadAsStringAsync();
        var community = JsonSerializer.Deserialize<Dictionary<string, object>>(content);
        
        community.Should().ContainKey("communities_formed");
        community.Should().ContainKey("avg_community_size");
        community.Should().ContainKey("community_engagement_rate");
        community.Should().ContainKey("content_catalyst_score");
        
        var communitiesFormed = ((JsonElement)community["communities_formed"]).GetInt32();
        var avgCommunitySize = ((JsonElement)community["avg_community_size"]).GetDouble();
        var engagementRate = ((JsonElement)community["community_engagement_rate"]).GetDouble();
        
        // Communities should form around shared interests
        communitiesFormed.Should().BeGreaterThan(5);    // At least 5 communities
        avgCommunitySize.Should().BeGreaterThan(15);    // Average 15+ members
        engagementRate.Should().BeGreaterThan(0.3);     // >30% engagement in communities
    }

    #endregion

    #region Privacy and Compliance Metrics Tests

    [Fact]
    public async Task PrivacyMetrics_ShouldTrackUserConsentAndSatisfaction()
    {
        // Arrange - Create users and privacy interaction scenarios
        var testUsers = await CreateTestUsersForPrivacyAnalysis(100);
        
        // Act - Simulate various privacy interactions
        await SimulatePrivacyInteractions(testUsers, {
            consentGivenRate: 0.75,      // 75% consent rate
            privacyControlsUsed: 0.40,   // 40% use privacy controls
            dataExportRequests: 0.05,    // 5% request data export
            dataDeletionRequests: 0.02   // 2% request data deletion
        });
        
        // Act - Measure privacy satisfaction
        await CollectPrivacySatisfactionFeedback(testUsers, avgRating: 4.3);
        
        // Act - Get privacy metrics
        var privacyResponse = await _client.GetAsync("/api/analytics/privacy-metrics?timeframe=30d");
        
        // Assert
        privacyResponse.Should().HaveStatusCode(System.Net.HttpStatusCode.OK);
        var content = await privacyResponse.Content.ReadAsStringAsync();
        var privacy = JsonSerializer.Deserialize<Dictionary<string, object>>(content);
        
        privacy.Should().ContainKey("consent_rate");
        privacy.Should().ContainKey("privacy_satisfaction_score");
        privacy.Should().ContainKey("privacy_controls_adoption");
        privacy.Should().ContainKey("gdpr_compliance_score");
        
        var consentRate = ((JsonElement)privacy["consent_rate"]).GetDouble();
        var satisfactionScore = ((JsonElement)privacy["privacy_satisfaction_score"]).GetDouble();
        var controlsAdoption = ((JsonElement)privacy["privacy_controls_adoption"]).GetDouble();
        var complianceScore = ((JsonElement)privacy["gdpr_compliance_score"]).GetDouble();
        
        // Privacy metrics should meet targets
        consentRate.Should().BeGreaterThan(0.70);        // >70% consent
        satisfactionScore.Should().BeGreaterThan(4.2);   // >4.2/5 satisfaction
        controlsAdoption.Should().BeGreaterThan(0.35);    // >35% use controls
        complianceScore.Should().BeGreaterThan(0.95);    // >95% compliance
    }

    [Fact]
    public async Task PrivacyMetrics_ShouldMonitorDataUsageTransparency()
    {
        // Arrange - Create data usage scenarios
        var dataUsageEvents = await CreateDataUsageEvents(_testUserId, 1000);
        
        // Act - Process data usage and provide transparency reports
        await ProcessDataUsageEvents(dataUsageEvents);
        
        // Act - Generate transparency metrics
        var transparencyResponse = await _client.GetAsync(
            $"/api/analytics/data-transparency?user_id={_testUserId}&timeframe=30d");
        
        // Assert
        transparencyResponse.Should().HaveStatusCode(System.Net.HttpStatusCode.OK);
        var content = await transparencyResponse.Content.ReadAsStringAsync();
        var transparency = JsonSerializer.Deserialize<Dictionary<string, object>>(content);
        
        transparency.Should().ContainKey("data_points_collected");
        transparency.Should().ContainKey("data_usage_categories");
        transparency.Should().ContainKey("user_transparency_requests");
        transparency.Should().ContainKey("data_retention_compliance");
        
        var dataPointsCollected = ((JsonElement)transparency["data_points_collected"]).GetInt32();
        var retentionCompliance = ((JsonElement)transparency["data_retention_compliance"]).GetDouble();
        
        // Transparency should be comprehensive
        dataPointsCollected.Should().BeGreaterThan(0);
        retentionCompliance.Should().BeGreaterThan(0.98); // >98% compliance with retention policies
    }

    #endregion

    #region Real-time Analytics and Monitoring Tests

    [Fact]
    public async Task RealTimeAnalytics_ShouldTrackLiveEngagementMetrics()
    {
        // Arrange - Set up real-time monitoring
        var realTimeEvents = new Queue<object>();
        
        // Act - Generate live events
        var liveEvents = await GenerateLiveEngagementEvents(100, TimeSpan.FromMinutes(5));
        foreach (var eventData in liveEvents)
        {
            await _client.PostAsJsonAsync("/api/analytics/live-event", eventData);
            realTimeEvents.Enqueue(eventData);
        }
        
        // Act - Get real-time metrics
        var liveMetricsResponse = await _client.GetAsync("/api/analytics/live-metrics");
        
        // Assert
        liveMetricsResponse.Should().HaveStatusCode(System.Net.HttpStatusCode.OK);
        var content = await liveMetricsResponse.Content.ReadAsStringAsync();
        var liveMetrics = JsonSerializer.Deserialize<Dictionary<string, object>>(content);
        
        liveMetrics.Should().ContainKey("events_per_minute");
        liveMetrics.Should().ContainKey("active_users_count");
        liveMetrics.Should().ContainKey("trending_content");
        liveMetrics.Should().ContainKey("social_activity_rate");
        
        var eventsPerMinute = ((JsonElement)liveMetrics["events_per_minute"]).GetDouble();
        var activeUsers = ((JsonElement)liveMetrics["active_users_count"]).GetInt32();
        
        // Real-time metrics should reflect activity
        eventsPerMinute.Should().BeGreaterThan(15); // >15 events per minute
        activeUsers.Should().BeGreaterThan(10);     // >10 active users
    }

    [Fact]
    public async Task RealTimeAnalytics_ShouldDetectAnomaliesInSocialActivity()
    {
        // Arrange - Establish baseline activity
        await SimulateBaselineActivity(normalRate: 20, duration: TimeSpan.FromMinutes(10));
        
        // Act - Introduce anomalous activity
        await SimulateAnomalousActivity(spikeRate: 200, duration: TimeSpan.FromMinutes(2));
        
        // Act - Check anomaly detection
        var anomalyResponse = await _client.GetAsync("/api/analytics/anomaly-detection?timeframe=15m");
        
        // Assert
        anomalyResponse.Should().HaveStatusCode(System.Net.HttpStatusCode.OK);
        var content = await anomalyResponse.Content.ReadAsStringAsync();
        var anomalies = JsonSerializer.Deserialize<Dictionary<string, object>>(content);
        
        anomalies.Should().ContainKey("anomalies_detected");
        anomalies.Should().ContainKey("anomaly_score");
        anomalies.Should().ContainKey("affected_metrics");
        anomalies.Should().ContainKey("recommended_actions");
        
        var anomaliesDetected = ((JsonElement)anomalies["anomalies_detected"]).GetInt32();
        var anomalyScore = ((JsonElement)anomalies["anomaly_score"]).GetDouble();
        
        // Should detect the activity spike
        anomaliesDetected.Should().BeGreaterThan(0);
        anomalyScore.Should().BeGreaterThan(0.8); // High confidence anomaly
    }

    #endregion

    #region Helper Methods for Test Data Creation and Simulation

    private async Task<List<string>> CreateUsersWithSocialConnections(int count)
    {
        var users = new List<string>();
        for (int i = 0; i < count; i++)
        {
            var userId = Guid.NewGuid().ToString();
            var userData = new
            {
                userId = userId,
                hasSocialConnections = true,
                connectedPlatforms = new[] { "facebook", "twitter" },
                friendsCount = Random.Shared.Next(50, 300),
                registrationDate = DateTime.UtcNow.AddDays(-Random.Shared.Next(1, 365))
            };
            
            await _client.PostAsJsonAsync("/api/test-data/create-user", userData);
            users.Add(userId);
        }
        return users;
    }

    private async Task<List<string>> CreateUsersWithoutSocialConnections(int count)
    {
        var users = new List<string>();
        for (int i = 0; i < count; i++)
        {
            var userId = Guid.NewGuid().ToString();
            var userData = new
            {
                userId = userId,
                hasSocialConnections = false,
                connectedPlatforms = new string[0],
                friendsCount = 0,
                registrationDate = DateTime.UtcNow.AddDays(-Random.Shared.Next(1, 365))
            };
            
            await _client.PostAsJsonAsync("/api/test-data/create-user", userData);
            users.Add(userId);
        }
        return users;
    }

    private async Task SimulateUserActivityOverTime(List<string> userIds, int days, bool withSocialFeatures)
    {
        foreach (var userId in userIds)
        {
            for (int day = 0; day < days; day++)
            {
                var activityDate = DateTime.UtcNow.AddDays(-day);
                var activityCount = withSocialFeatures 
                    ? Random.Shared.Next(3, 12)  // Higher activity with social features
                    : Random.Shared.Next(1, 6);  // Lower activity without social features
                
                for (int activity = 0; activity < activityCount; activity++)
                {
                    var activityData = new
                    {
                        userId = userId,
                        activityType = GetRandomActivityType(withSocialFeatures),
                        timestamp = activityDate.AddHours(Random.Shared.Next(0, 24)),
                        hasSocialContext = withSocialFeatures && Random.Shared.NextDouble() > 0.3
                    };
                    
                    await _client.PostAsJsonAsync("/api/test-data/user-activity", activityData);
                }
            }
        }
    }

    private async Task<List<string>> CreateSocialRecommendations(string userId, int count)
    {
        var recommendations = new List<string>();
        for (int i = 0; i < count; i++)
        {
            var recId = Guid.NewGuid().ToString();
            var recData = new
            {
                recommendationId = recId,
                userId = userId,
                contentId = $"content_{Random.Shared.Next(1000, 9999)}",
                type = "social",
                socialScore = 0.6 + Random.Shared.NextDouble() * 0.4, // 0.6-1.0
                friendsEngaged = Random.Shared.Next(1, 20),
                networkPopularity = Random.Shared.NextDouble(),
                timestamp = DateTime.UtcNow
            };
            
            await _client.PostAsJsonAsync("/api/test-data/recommendation", recData);
            recommendations.Add(recId);
        }
        return recommendations;
    }

    private async Task<List<string>> CreateRegularRecommendations(string userId, int count)
    {
        var recommendations = new List<string>();
        for (int i = 0; i < count; i++)
        {
            var recId = Guid.NewGuid().ToString();
            var recData = new
            {
                recommendationId = recId,
                userId = userId,
                contentId = $"content_{Random.Shared.Next(1000, 9999)}",
                type = "regular",
                algorithmScore = Random.Shared.NextDouble(),
                timestamp = DateTime.UtcNow
            };
            
            await _client.PostAsJsonAsync("/api/test-data/recommendation", recData);
            recommendations.Add(recId);
        }
        return recommendations;
    }

    private async Task SimulateRecommendationInteractions(List<string> recommendations, double clickRate)
    {
        foreach (var recId in recommendations)
        {
            if (Random.Shared.NextDouble() < clickRate)
            {
                var interactionData = new
                {
                    recommendationId = recId,
                    interactionType = "click",
                    timestamp = DateTime.UtcNow.AddMinutes(-Random.Shared.Next(0, 1440)) // Within last day
                };
                
                await _client.PostAsJsonAsync("/api/test-data/recommendation-interaction", interactionData);
            }
        }
    }

    private string GetRandomActivityType(bool withSocialFeatures)
    {
        if (withSocialFeatures)
        {
            var socialActivities = new[] 
            { 
                "content_view", "content_like", "content_share", "friend_interaction", 
                "social_recommendation_click", "friend_discovery", "social_comment" 
            };
            return socialActivities[Random.Shared.Next(socialActivities.Length)];
        }
        else
        {
            var regularActivities = new[] { "content_view", "search", "recommendation_click" };
            return regularActivities[Random.Shared.Next(regularActivities.Length)];
        }
    }

    // Additional helper methods would be implemented for other test scenarios...
    // (CreateRecommendationsWithSocialProof, SimulateViralSharing, etc.)

    #endregion

    public void Dispose()
    {
        _client?.Dispose();
    }
}