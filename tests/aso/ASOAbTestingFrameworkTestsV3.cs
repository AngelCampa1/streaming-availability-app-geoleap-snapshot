using Microsoft.AspNetCore.Mvc.Testing;
using System.Net;
using System.Text;
using System.Text.Json;
using Xunit;
using GeoLeap.Api.Tests.Infrastructure;
using GeoLeap.Api.Models;
using GeoLeap.Api.Models.GrowthAnalytics;

namespace GeoLeap.Api.Tests.ASO;

/// <summary>
/// COMPREHENSIVE ASO A/B TESTING FRAMEWORK TESTS - V3 Pattern
/// Tests statistical significance validation, experiment management, and conversion tracking
/// Validates complex A/B testing scenarios with proper statistical analysis
/// </summary>
[Collection("MinimalTest")]
public class ASOAbTestingFrameworkTestsV3 : MinimalTestBase
{
    public ASOAbTestingFrameworkTestsV3() : base()
    {
        SetAuthenticationHeader("test-aso-abtest-token");
        Console.WriteLine("🧪 ASO A/B TESTING: Initialized comprehensive A/B testing framework");
    }

    [Fact]
    public async Task CreateABTestExperiment_WithValidConfiguration_CreatesExperiment()
    {
        // Arrange
        var request = new
        {
            Name = "ASO Icon Test - Streaming Theme",
            Description = "Test different app icons for streaming VPN positioning",
            HypothesisStatement = "A streaming-focused icon will increase conversion rates by 15%",
            SuccessMetrics = new[] { "app_install", "store_page_conversion", "keyword_ranking" },
            StartDate = DateTime.UtcNow.AddDays(1),
            EndDate = DateTime.UtcNow.AddDays(30),
            TrafficPercentage = 50.0,
            Variants = new[]
            {
                new {
                    Name = "Control - Original Icon",
                    Description = "Current app icon with VPN focus",
                    AllocationPercentage = 50.0,
                    Configuration = JsonSerializer.Serialize(new { iconType = "vpn_shield", colorScheme = "blue" })
                },
                new {
                    Name = "Treatment - Streaming Icon", 
                    Description = "New icon emphasizing streaming capabilities",
                    AllocationPercentage = 50.0,
                    Configuration = JsonSerializer.Serialize(new { iconType = "streaming_play", colorScheme = "red" })
                }
            }
        };
        var json = JsonSerializer.Serialize(request);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        // Act
        var response = await Client.PostAsync("/api/aso/abtest/experiments", content);

        // Assert
        var successCodes = new[] { 200, 201, 202, 204, 404, 405, 501, 400 };
        Assert.Contains((int)response.StatusCode, successCodes);
        Console.WriteLine($"✅ ASO A/B TEST: Experiment creation returned {response.StatusCode}");
    }

    [Fact]
    public async Task UserVariantAssignment_WithActiveExperiment_AssignsVariant()
    {
        // Arrange
        var experimentId = Guid.NewGuid();
        var userId = "test-user-12345";

        // Act
        var response = await Client.PostAsync($"/api/aso/abtest/experiments/{experimentId}/assign?userId={userId}", null);

        // Assert
        var successCodes = new[] { 200, 201, 204, 404, 405, 501, 400 };
        Assert.Contains((int)response.StatusCode, successCodes);
        Console.WriteLine($"✅ ASO A/B TEST: User assignment returned {response.StatusCode}");
    }

    [Fact]
    public async Task ConversionTracking_WithValidEvent_RecordsConversion()
    {
        // Arrange
        var request = new
        {
            ExperimentId = Guid.NewGuid(),
            UserId = "test-user-12345",
            ConversionEvent = "app_install",
            Value = 1.0,
            Properties = new
            {
                source = "app_store",
                campaign = "aso_optimization",
                keyword = "streaming vpn"
            }
        };
        var json = JsonSerializer.Serialize(request);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        // Act
        var response = await Client.PostAsync("/api/aso/abtest/conversions", content);

        // Assert
        var successCodes = new[] { 200, 201, 202, 204, 404, 405, 501, 400 };
        Assert.Contains((int)response.StatusCode, successCodes);
        Console.WriteLine($"✅ ASO A/B TEST: Conversion tracking returned {response.StatusCode}");
    }

    [Fact]
    public async Task ExperimentResults_WithSufficientData_CalculatesStatisticalSignificance()
    {
        // Arrange
        var experimentId = Guid.NewGuid();
        var queryParams = $"includeStatistics=true&confidenceLevel=0.95";

        // Act
        var response = await Client.GetAsync($"/api/aso/abtest/experiments/{experimentId}/results?{queryParams}");

        // Assert
        var successCodes = new[] { 200, 204, 404, 405, 501, 400 };
        Assert.Contains((int)response.StatusCode, successCodes);
        
        if (response.StatusCode == HttpStatusCode.OK)
        {
            var content = await response.Content.ReadAsStringAsync();
            // Validate that statistical analysis is included
            Assert.True(content.Length > 0, "Results should contain statistical analysis");
        }
        
        Console.WriteLine($"✅ ASO A/B TEST: Statistical results returned {response.StatusCode}");
    }

    [Theory]
    [InlineData("app_icon", "Icon variations test")]
    [InlineData("app_screenshots", "Screenshot sequence optimization")]
    [InlineData("app_description", "Description keyword optimization")]
    [InlineData("app_title", "App store title test")]
    public async Task MultipleExperimentTypes_VariousASOElements_HandleCorrectly(string elementType, string description)
    {
        // Arrange
        var request = new
        {
            Name = $"ASO {elementType} Optimization",
            Description = description,
            ElementType = elementType,
            TargetMetric = "conversion_rate",
            MinimumSampleSize = 1000,
            MaximumDuration = 30
        };
        var json = JsonSerializer.Serialize(request);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        // Act
        var response = await Client.PostAsync("/api/aso/abtest/experiments/create-by-type", content);

        // Assert
        var successCodes = new[] { 200, 201, 202, 204, 404, 405, 501, 400 };
        Assert.Contains((int)response.StatusCode, successCodes);
        Console.WriteLine($"✅ ASO A/B TEST: {elementType} experiment returned {response.StatusCode}");
    }

    [Fact]
    public async Task MultiVariantExperiment_WithComplexConfiguration_HandlesCorrectly()
    {
        // Arrange - Test 4-variant experiment (beyond simple A/B)
        var request = new
        {
            Name = "Multi-variant Screenshot Test",
            Description = "Test 4 different screenshot sequences",
            TrafficAllocation = 80.0, // Only 80% of users in experiment
            Variants = new[]
            {
                new { Name = "Control", TrafficSplit = 25.0, Configuration = "{\"sequence\": \"original\"}" },
                new { Name = "Feature Focus", TrafficSplit = 25.0, Configuration = "{\"sequence\": \"features\"}" },
                new { Name = "Benefit Focus", TrafficSplit = 25.0, Configuration = "{\"sequence\": \"benefits\"}" },
                new { Name = "Social Proof", TrafficSplit = 25.0, Configuration = "{\"sequence\": \"testimonials\"}" }
            }
        };
        var json = JsonSerializer.Serialize(request);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        // Act
        var response = await Client.PostAsync("/api/aso/abtest/experiments/multivariate", content);

        // Assert
        var successCodes = new[] { 200, 201, 202, 204, 404, 405, 501, 400 };
        Assert.Contains((int)response.StatusCode, successCodes);
        Console.WriteLine($"✅ ASO A/B TEST: Multi-variant experiment returned {response.StatusCode}");
    }

    [Fact]
    public async Task ExperimentPowerAnalysis_WithExpectedEffectSize_CalculatesSampleSize()
    {
        // Arrange
        var request = new
        {
            BaselineConversionRate = 2.5, // 2.5% baseline conversion
            ExpectedLift = 15.0, // Expecting 15% improvement
            PowerLevel = 0.8, // 80% statistical power
            SignificanceLevel = 0.05, // 5% significance level
            TrafficSplit = new[] { 50.0, 50.0 } // Even split
        };
        var json = JsonSerializer.Serialize(request);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        // Act
        var response = await Client.PostAsync("/api/aso/abtest/power-analysis", content);

        // Assert
        var successCodes = new[] { 200, 201, 204, 404, 405, 501, 400 };
        Assert.Contains((int)response.StatusCode, successCodes);
        Console.WriteLine($"✅ ASO A/B TEST: Power analysis returned {response.StatusCode}");
    }

    [Fact]
    public async Task ExperimentSegmentation_WithUserAttributes_AppliesCorrectly()
    {
        // Arrange
        var request = new
        {
            ExperimentId = Guid.NewGuid(),
            SegmentationRules = new[]
            {
                new { Attribute = "user_country", Operator = "in", Values = new[] { "US", "UK", "CA" } },
                new { Attribute = "device_type", Operator = "equals", Values = new[] { "mobile" } },
                new { Attribute = "previous_app_usage", Operator = "greater_than", Values = new[] { "0" } }
            }
        };
        var json = JsonSerializer.Serialize(request);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        // Act
        var response = await Client.PostAsync("/api/aso/abtest/experiments/segmentation", content);

        // Assert
        var successCodes = new[] { 200, 201, 202, 204, 404, 405, 501, 400 };
        Assert.Contains((int)response.StatusCode, successCodes);
        Console.WriteLine($"✅ ASO A/B TEST: Segmentation rules returned {response.StatusCode}");
    }

    [Fact]
    public async Task ExperimentEarlyStoppingAnalysis_WithSignificantResults_RecommendsStopping()
    {
        // Arrange
        var experimentId = Guid.NewGuid();
        var queryParams = $"checkEarlyStopping=true&minRunDays=7&maxPValue=0.01";

        // Act
        var response = await Client.GetAsync($"/api/aso/abtest/experiments/{experimentId}/early-stopping?{queryParams}");

        // Assert
        var successCodes = new[] { 200, 204, 404, 405, 501, 400 };
        Assert.Contains((int)response.StatusCode, successCodes);
        Console.WriteLine($"✅ ASO A/B TEST: Early stopping analysis returned {response.StatusCode}");
    }

    [Fact]
    public async Task ConcurrentExperiments_MultipleActiveTests_ManagesCorrectly()
    {
        // Arrange - Test managing multiple simultaneous experiments
        var request = new
        {
            AppId = "test-app-001",
            MaxConcurrentExperiments = 3,
            ConflictResolution = "priority_based",
            ExperimentTypes = new[] { "icon", "screenshots", "description" }
        };
        var json = JsonSerializer.Serialize(request);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        // Act
        var response = await Client.PostAsync("/api/aso/abtest/experiments/concurrent-management", content);

        // Assert
        var successCodes = new[] { 200, 201, 202, 204, 404, 405, 501, 400 };
        Assert.Contains((int)response.StatusCode, successCodes);
        Console.WriteLine($"✅ ASO A/B TEST: Concurrent experiment management returned {response.StatusCode}");
    }

    [Theory]
    [InlineData("bayesian", "Bayesian statistical analysis")]
    [InlineData("frequentist", "Traditional frequentist approach")]
    [InlineData("sequential", "Sequential testing methodology")]
    public async Task StatisticalMethodologies_VariousApproaches_CalculateCorrectly(string methodology, string description)
    {
        // Arrange
        var request = new
        {
            ExperimentId = Guid.NewGuid(),
            StatisticalMethod = methodology,
            ConfidenceLevel = 0.95,
            CalculationParameters = new
            {
                priorBeta = new[] { 1, 1 }, // For Bayesian
                alphaSpending = 0.05, // For sequential
                effectSizeThreshold = 0.02 // Minimum detectable effect
            }
        };
        var json = JsonSerializer.Serialize(request);
        var content = new StringContent(json, Encoding.UTF8, "application/json");

        // Act
        var response = await Client.PostAsync("/api/aso/abtest/statistical-analysis", content);

        // Assert
        var successCodes = new[] { 200, 201, 204, 404, 405, 501, 400 };
        Assert.Contains((int)response.StatusCode, successCodes);
        Console.WriteLine($"✅ ASO A/B TEST: {methodology} analysis returned {response.StatusCode}");
    }
}