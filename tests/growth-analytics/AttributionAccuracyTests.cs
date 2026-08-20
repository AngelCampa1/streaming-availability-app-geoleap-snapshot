using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Diagnostics;
using Xunit;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using GeoLeap.Api;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using System.Net.Http;
using System.Text.Json;

namespace GeoLeap.Api.Tests.GrowthAnalytics;

/// <summary>
/// Attribution Accuracy Testing Suite
/// Validates >95% accuracy requirement for user journey attribution
/// Tests multi-touch attribution models and cross-platform tracking
/// </summary>
public class AttributionAccuracyTests : IClassFixture<WebApplicationFactory<Program>>, IDisposable
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;
    private readonly string _testSessionId = Guid.NewGuid().ToString();

    public AttributionAccuracyTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
        _client = _factory.CreateClient();
    }

    #region Multi-Touch Attribution Testing

    [Fact]
    public async Task Attribution_ShouldValidateFirstTouchModel()
    {
        // Arrange - Create known user journey
        var userId = Guid.NewGuid().ToString();
        var touchpoints = new[]
        {
            new { channel = "organic_search", timestamp = DateTime.UtcNow.AddDays(-7), value = 100.0 },
            new { channel = "social_media", timestamp = DateTime.UtcNow.AddDays(-3), value = 0.0 },
            new { channel = "email_campaign", timestamp = DateTime.UtcNow.AddDays(-1), value = 0.0 },
            new { channel = "direct", timestamp = DateTime.UtcNow, value = 250.0 } // Conversion
        };

        // Act - Record touchpoints
        foreach (var touchpoint in touchpoints)
        {
            await _client.PostAsJsonAsync("/api/analytics/touchpoint", new
            {
                userId = userId,
                channel = touchpoint.channel,
                timestamp = touchpoint.timestamp,
                sessionId = _testSessionId,
                value = touchpoint.value,
                isConversion = touchpoint.value > 0
            });
        }

        // Act - Calculate first-touch attribution
        var response = await _client.GetAsync($"/api/analytics/attribution/first-touch?userId={userId}");
        var content = await response.Content.ReadAsStringAsync();
        var attribution = JsonSerializer.Deserialize<AttributionResult>(content);

        // Assert - First touch should get 100% credit
        attribution.Should().NotBeNull();
        attribution.Attributions.Should().ContainKey("organic_search");
        attribution.Attributions["organic_search"].Should().BeApproximately(250.0, 0.01); // Full credit
        attribution.Attributions["social_media"].Should().Be(0.0);
        attribution.Attributions["email_campaign"].Should().Be(0.0);
        attribution.Attributions["direct"].Should().Be(0.0);
        
        // Validate accuracy score
        attribution.AccuracyScore.Should().BeGreaterThan(0.95);
    }

    [Fact]
    public async Task Attribution_ShouldValidateLastTouchModel()
    {
        // Arrange - Create known user journey
        var userId = Guid.NewGuid().ToString();
        var touchpoints = new[]
        {
            new { channel = "paid_search", timestamp = DateTime.UtcNow.AddDays(-10), value = 0.0 },
            new { channel = "social_media", timestamp = DateTime.UtcNow.AddDays(-5), value = 0.0 },
            new { channel = "email_campaign", timestamp = DateTime.UtcNow.AddDays(-2), value = 0.0 },
            new { channel = "affiliate", timestamp = DateTime.UtcNow, value = 180.0 } // Conversion
        };

        // Act - Record touchpoints
        foreach (var touchpoint in touchpoints)
        {
            await RecordTouchpoint(userId, touchpoint.channel, touchpoint.timestamp, touchpoint.value);
        }

        // Act - Calculate last-touch attribution
        var attribution = await GetAttribution(userId, "last-touch");

        // Assert - Last touch should get 100% credit
        attribution.Attributions["affiliate"].Should().BeApproximately(180.0, 0.01);
        attribution.Attributions["paid_search"].Should().Be(0.0);
        attribution.Attributions["social_media"].Should().Be(0.0);
        attribution.Attributions["email_campaign"].Should().Be(0.0);
        
        attribution.AccuracyScore.Should().BeGreaterThan(0.95);
    }

    [Fact]
    public async Task Attribution_ShouldValidateLinearModel()
    {
        // Arrange - Create 4-touchpoint journey
        var userId = Guid.NewGuid().ToString();
        var touchpoints = new[]
        {
            new { channel = "display_ad", timestamp = DateTime.UtcNow.AddDays(-8) },
            new { channel = "social_media", timestamp = DateTime.UtcNow.AddDays(-5) },
            new { channel = "email_campaign", timestamp = DateTime.UtcNow.AddDays(-2) },
            new { channel = "organic_search", timestamp = DateTime.UtcNow } // Conversion
        };

        var conversionValue = 400.0;
        var expectedLinearCredit = conversionValue / 4; // 100.0 each

        // Act - Record touchpoints
        for (int i = 0; i < touchpoints.Length; i++)
        {
            var isConversion = i == touchpoints.Length - 1;
            await RecordTouchpoint(userId, touchpoints[i].channel, touchpoints[i].timestamp, 
                isConversion ? conversionValue : 0.0);
        }

        // Act - Calculate linear attribution
        var attribution = await GetAttribution(userId, "linear");

        // Assert - Equal credit distribution
        attribution.Attributions["display_ad"].Should().BeApproximately(expectedLinearCredit, 0.01);
        attribution.Attributions["social_media"].Should().BeApproximately(expectedLinearCredit, 0.01);
        attribution.Attributions["email_campaign"].Should().BeApproximately(expectedLinearCredit, 0.01);
        attribution.Attributions["organic_search"].Should().BeApproximately(expectedLinearCredit, 0.01);
        
        // Verify total adds up
        var totalAttribution = attribution.Attributions.Values.Sum();
        totalAttribution.Should().BeApproximately(conversionValue, 0.01);
        
        attribution.AccuracyScore.Should().BeGreaterThan(0.95);
    }

    [Fact]
    public async Task Attribution_ShouldValidateTimeDecayModel()
    {
        // Arrange - Create journey with varying time gaps
        var userId = Guid.NewGuid().ToString();
        var conversionTime = DateTime.UtcNow;
        var conversionValue = 500.0;
        
        var touchpoints = new[]
        {
            new { channel = "display_ad", timestamp = conversionTime.AddDays(-30), expectedWeight = 0.1 }, // Oldest, least credit
            new { channel = "social_media", timestamp = conversionTime.AddDays(-14), expectedWeight = 0.2 },
            new { channel = "email_campaign", timestamp = conversionTime.AddDays(-7), expectedWeight = 0.3 },
            new { channel = "organic_search", timestamp = conversionTime, expectedWeight = 0.4 } // Most recent, most credit
        };

        // Act - Record touchpoints
        foreach (var touchpoint in touchpoints)
        {
            var isConversion = touchpoint.channel == "organic_search";
            await RecordTouchpoint(userId, touchpoint.channel, touchpoint.timestamp, 
                isConversion ? conversionValue : 0.0);
        }

        // Act - Calculate time-decay attribution
        var attribution = await GetAttribution(userId, "time-decay");

        // Assert - More recent touchpoints should have higher attribution
        var organicAttribution = attribution.Attributions["organic_search"];
        var emailAttribution = attribution.Attributions["email_campaign"];
        var socialAttribution = attribution.Attributions["social_media"];
        var displayAttribution = attribution.Attributions["display_ad"];

        // Verify time decay ordering
        organicAttribution.Should().BeGreaterThan(emailAttribution);
        emailAttribution.Should().BeGreaterThan(socialAttribution);
        socialAttribution.Should().BeGreaterThan(displayAttribution);
        
        // Verify total attribution equals conversion value
        var totalAttribution = attribution.Attributions.Values.Sum();
        totalAttribution.Should().BeApproximately(conversionValue, 0.01);
        
        attribution.AccuracyScore.Should().BeGreaterThan(0.95);
    }

    [Fact]
    public async Task Attribution_ShouldValidatePositionBasedModel()
    {
        // Arrange - U-shaped attribution (40% first, 40% last, 20% middle)
        var userId = Guid.NewGuid().ToString();
        var conversionValue = 1000.0;
        
        var touchpoints = new[]
        {
            new { channel = "organic_search", timestamp = DateTime.UtcNow.AddDays(-20) }, // First: 40%
            new { channel = "social_media", timestamp = DateTime.UtcNow.AddDays(-15) },   // Middle: 10%
            new { channel = "email_campaign", timestamp = DateTime.UtcNow.AddDays(-10) }, // Middle: 10%
            new { channel = "paid_search", timestamp = DateTime.UtcNow } // Last: 40%
        };

        // Act - Record touchpoints
        for (int i = 0; i < touchpoints.Length; i++)
        {
            var isConversion = i == touchpoints.Length - 1;
            await RecordTouchpoint(userId, touchpoints[i].channel, touchpoints[i].timestamp, 
                isConversion ? conversionValue : 0.0);
        }

        // Act - Calculate position-based attribution
        var attribution = await GetAttribution(userId, "position-based");

        // Assert - First and last should get 40% each, middle touches 10% each
        attribution.Attributions["organic_search"].Should().BeApproximately(400.0, 5.0); // 40%
        attribution.Attributions["paid_search"].Should().BeApproximately(400.0, 5.0);    // 40%
        attribution.Attributions["social_media"].Should().BeApproximately(100.0, 5.0);    // 10%
        attribution.Attributions["email_campaign"].Should().BeApproximately(100.0, 5.0);  // 10%
        
        var totalAttribution = attribution.Attributions.Values.Sum();
        totalAttribution.Should().BeApproximately(conversionValue, 1.0);
        
        attribution.AccuracyScore.Should().BeGreaterThan(0.95);
    }

    #endregion

    #region Cross-Platform Attribution Testing

    [Fact]
    public async Task Attribution_ShouldTrackCrossPlatformJourneys()
    {
        // Arrange - Multi-platform user journey
        var userId = Guid.NewGuid().ToString();
        var conversionValue = 750.0;
        
        var crossPlatformTouchpoints = new[]
        {
            new { channel = "google_ads", platform = "web", device = "desktop", timestamp = DateTime.UtcNow.AddDays(-14) },
            new { channel = "facebook_ad", platform = "mobile_app", device = "ios", timestamp = DateTime.UtcNow.AddDays(-8) },
            new { channel = "email_campaign", platform = "mobile_web", device = "android", timestamp = DateTime.UtcNow.AddDays(-3) },
            new { channel = "direct", platform = "web", device = "desktop", timestamp = DateTime.UtcNow } // Conversion
        };

        // Act - Record cross-platform touchpoints
        foreach (var touchpoint in crossPlatformTouchpoints)
        {
            var isConversion = touchpoint.channel == "direct";
            await _client.PostAsJsonAsync("/api/analytics/cross-platform-touchpoint", new
            {
                userId = userId,
                channel = touchpoint.channel,
                platform = touchpoint.platform,
                deviceType = touchpoint.device,
                timestamp = touchpoint.timestamp,
                sessionId = _testSessionId,
                value = isConversion ? conversionValue : 0.0,
                isConversion = isConversion
            });
        }

        // Act - Get cross-platform attribution
        var response = await _client.GetAsync($"/api/analytics/attribution/cross-platform?userId={userId}");
        var content = await response.Content.ReadAsStringAsync();
        var attribution = JsonSerializer.Deserialize<CrossPlatformAttributionResult>(content);

        // Assert - Should track platform transitions
        attribution.Should().NotBeNull();
        attribution.PlatformBreakdown.Should().ContainKeys("web", "mobile_app", "mobile_web");
        attribution.DeviceBreakdown.Should().ContainKeys("desktop", "ios", "android");
        attribution.ChannelAttributions.Should().ContainKeys("google_ads", "facebook_ad", "email_campaign", "direct");
        
        // Verify cross-platform journey integrity
        attribution.JourneyCompleteness.Should().BeGreaterThan(0.95); // 95% journey tracking
        attribution.PlatformTransitions.Should().BeGreaterThan(2); // Multiple platform switches
        
        var totalAttribution = attribution.ChannelAttributions.Values.Sum();
        totalAttribution.Should().BeApproximately(conversionValue, 1.0);
    }

    [Fact]
    public async Task Attribution_ShouldHandleOfflineToOnlineJourneys()
    {
        // Arrange - Offline to online attribution scenario
        var userId = Guid.NewGuid().ToString();
        var conversionValue = 500.0;
        
        var offlineOnlineTouchpoints = new[]
        {
            new { channel = "tv_commercial", platform = "offline", timestamp = DateTime.UtcNow.AddDays(-21) },
            new { channel = "radio_ad", platform = "offline", timestamp = DateTime.UtcNow.AddDays(-14) },
            new { channel = "google_search", platform = "web", timestamp = DateTime.UtcNow.AddDays(-7) },
            new { channel = "website_direct", platform = "web", timestamp = DateTime.UtcNow } // Conversion
        };

        // Act - Record offline/online touchpoints
        foreach (var touchpoint in offlineOnlineTouchpoints)
        {
            var isConversion = touchpoint.channel == "website_direct";
            await _client.PostAsJsonAsync("/api/analytics/offline-online-touchpoint", new
            {
                userId = userId,
                channel = touchpoint.channel,
                platform = touchpoint.platform,
                timestamp = touchpoint.timestamp,
                sessionId = _testSessionId,
                value = isConversion ? conversionValue : 0.0,
                isConversion = isConversion,
                isOffline = touchpoint.platform == "offline"
            });
        }

        // Act - Get offline/online attribution
        var attribution = await GetAttribution(userId, "offline-online");

        // Assert - Should properly attribute offline channels
        attribution.Should().NotBeNull();
        attribution.Attributions.Should().ContainKeys("tv_commercial", "radio_ad", "google_search", "website_direct");
        
        // Offline channels should receive attribution credit
        var offlineAttribution = attribution.Attributions["tv_commercial"] + attribution.Attributions["radio_ad"];
        offlineAttribution.Should().BeGreaterThan(0);
        
        // Total should equal conversion value
        var totalAttribution = attribution.Attributions.Values.Sum();
        totalAttribution.Should().BeApproximately(conversionValue, 1.0);
        
        attribution.AccuracyScore.Should().BeGreaterThan(0.90); // Slightly lower for offline tracking
    }

    #endregion

    #region Attribution Data Quality Testing

    [Fact]
    public async Task Attribution_ShouldValidateDataQuality()
    {
        // Arrange - Create user journeys with various data quality scenarios
        var testScenarios = new[]
        {
            new { userId = Guid.NewGuid().ToString(), scenario = "complete_data", expectedQuality = 1.0 },
            new { userId = Guid.NewGuid().ToString(), scenario = "missing_timestamps", expectedQuality = 0.8 },
            new { userId = Guid.NewGuid().ToString(), scenario = "duplicate_touchpoints", expectedQuality = 0.9 },
            new { userId = Guid.NewGuid().ToString(), scenario = "invalid_channels", expectedQuality = 0.7 }
        };

        // Act - Create test data for each scenario
        foreach (var scenario in testScenarios)
        {
            await CreateDataQualityTestScenario(scenario.userId, scenario.scenario);
        }

        // Act - Run data quality analysis
        var response = await _client.GetAsync($"/api/analytics/data-quality?sessionId={_testSessionId}");
        var content = await response.Content.ReadAsStringAsync();
        var qualityReport = JsonSerializer.Deserialize<DataQualityReport>(content);

        // Assert - Data quality metrics should meet thresholds
        qualityReport.Should().NotBeNull();
        qualityReport.OverallQualityScore.Should().BeGreaterThan(0.85); // >85% overall quality
        qualityReport.CompletenessScore.Should().BeGreaterThan(0.90);   // >90% data completeness
        qualityReport.ConsistencyScore.Should().BeGreaterThan(0.92);    // >92% data consistency
        qualityReport.ValidityScore.Should().BeGreaterThan(0.88);       // >88% data validity
        
        // Verify quality issues are properly identified
        qualityReport.IdentifiedIssues.Should().NotBeEmpty();
        qualityReport.RecommendedActions.Should().NotBeEmpty();
    }

    [Fact]
    public async Task Attribution_ShouldHandleMissingTouchpoints()
    {
        // Arrange - Create incomplete user journey
        var userId = Guid.NewGuid().ToString();
        var conversionValue = 300.0;
        
        // Simulate missing middle touchpoints (common in real-world scenarios)
        var incompleteTouchpoints = new[]
        {
            new { channel = "organic_search", timestamp = DateTime.UtcNow.AddDays(-20) },
            // Missing: social_media touchpoint at day -15
            // Missing: email_campaign touchpoint at day -10
            new { channel = "direct", timestamp = DateTime.UtcNow, isConversion = true }
        };

        // Act - Record incomplete journey
        foreach (var touchpoint in incompleteTouchpoints)
        {
            await RecordTouchpoint(userId, touchpoint.channel, touchpoint.timestamp, 
                touchpoint.isConversion ? conversionValue : 0.0);
        }

        // Act - Get attribution with gap analysis
        var attribution = await GetAttribution(userId, "gap-analysis");

        // Assert - Should identify and handle gaps
        attribution.Should().NotBeNull();
        attribution.GapAnalysis.Should().NotBeNull();
        attribution.GapAnalysis.MissingTouchpointsLikely.Should().BeTrue();
        attribution.GapAnalysis.ConfidenceScore.Should().BeLessThan(0.95); // Lower confidence due to gaps
        
        // Attribution should still be reasonable
        var totalAttribution = attribution.Attributions.Values.Sum();
        totalAttribution.Should().BeApproximately(conversionValue, 1.0);
    }

    #endregion

    #region Helper Methods

    private async Task RecordTouchpoint(string userId, string channel, DateTime timestamp, double value)
    {
        await _client.PostAsJsonAsync("/api/analytics/touchpoint", new
        {
            userId = userId,
            channel = channel,
            timestamp = timestamp,
            sessionId = _testSessionId,
            value = value,
            isConversion = value > 0
        });
    }

    private async Task<AttributionResult> GetAttribution(string userId, string model)
    {
        var response = await _client.GetAsync($"/api/analytics/attribution/{model}?userId={userId}");
        var content = await response.Content.ReadAsStringAsync();
        return JsonSerializer.Deserialize<AttributionResult>(content);
    }

    private async Task CreateDataQualityTestScenario(string userId, string scenario)
    {
        switch (scenario)
        {
            case "complete_data":
                await CreateCompleteDataScenario(userId);
                break;
            case "missing_timestamps":
                await CreateMissingTimestampScenario(userId);
                break;
            case "duplicate_touchpoints":
                await CreateDuplicateTouchpointScenario(userId);
                break;
            case "invalid_channels":
                await CreateInvalidChannelScenario(userId);
                break;
        }
    }

    private async Task CreateCompleteDataScenario(string userId)
    {
        var touchpoints = new[]
        {
            new { channel = "organic_search", timestamp = DateTime.UtcNow.AddDays(-10) },
            new { channel = "social_media", timestamp = DateTime.UtcNow.AddDays(-5) },
            new { channel = "email_campaign", timestamp = DateTime.UtcNow.AddDays(-1) },
            new { channel = "direct", timestamp = DateTime.UtcNow, value = 200.0 }
        };

        foreach (var tp in touchpoints)
        {
            await RecordTouchpoint(userId, tp.channel, tp.timestamp, tp.value ?? 0.0);
        }
    }

    private async Task CreateMissingTimestampScenario(string userId)
    {
        // Simulate touchpoints with missing or invalid timestamps
        await _client.PostAsJsonAsync("/api/analytics/touchpoint", new
        {
            userId = userId,
            channel = "organic_search",
            timestamp = (DateTime?)null, // Missing timestamp
            sessionId = _testSessionId,
            value = 0.0,
            isConversion = false
        });
    }

    private async Task CreateDuplicateTouchpointScenario(string userId)
    {
        var touchpoint = new
        {
            userId = userId,
            channel = "social_media",
            timestamp = DateTime.UtcNow.AddDays(-5),
            sessionId = _testSessionId,
            value = 0.0,
            isConversion = false
        };

        // Record same touchpoint twice
        await _client.PostAsJsonAsync("/api/analytics/touchpoint", touchpoint);
        await _client.PostAsJsonAsync("/api/analytics/touchpoint", touchpoint);
    }

    private async Task CreateInvalidChannelScenario(string userId)
    {
        await _client.PostAsJsonAsync("/api/analytics/touchpoint", new
        {
            userId = userId,
            channel = "invalid_channel_xyz", // Non-standard channel
            timestamp = DateTime.UtcNow.AddDays(-3),
            sessionId = _testSessionId,
            value = 0.0,
            isConversion = false
        });
    }

    #endregion

    public void Dispose()
    {
        _client?.Dispose();
    }
}

#region Attribution Models and Results

public class AttributionResult
{
    public Dictionary<string, double> Attributions { get; set; } = new();
    public double AccuracyScore { get; set; }
    public GapAnalysis? GapAnalysis { get; set; }
}

public class CrossPlatformAttributionResult : AttributionResult
{
    public Dictionary<string, double> PlatformBreakdown { get; set; } = new();
    public Dictionary<string, double> DeviceBreakdown { get; set; } = new();
    public Dictionary<string, double> ChannelAttributions { get; set; } = new();
    public double JourneyCompleteness { get; set; }
    public int PlatformTransitions { get; set; }
}

public class GapAnalysis
{
    public bool MissingTouchpointsLikely { get; set; }
    public double ConfidenceScore { get; set; }
    public List<string> SuggestedMissingChannels { get; set; } = new();
}

public class DataQualityReport
{
    public double OverallQualityScore { get; set; }
    public double CompletenessScore { get; set; }
    public double ConsistencyScore { get; set; }
    public double ValidityScore { get; set; }
    public List<string> IdentifiedIssues { get; set; } = new();
    public List<string> RecommendedActions { get; set; } = new();
}

#endregion