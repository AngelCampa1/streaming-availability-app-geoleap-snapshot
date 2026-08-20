using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using System.Diagnostics;
using System.Linq;
using Xunit;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using GeoLeap.Api;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using System.Net.Http;
using System.Text.Json;
using MathNet.Numerics.Distributions;
using MathNet.Numerics.Statistics;

namespace GeoLeap.Api.Tests.GrowthAnalytics;

/// <summary>
/// A/B Testing Framework Validation Suite
/// Validates statistical accuracy, experiment isolation, and results interpretation
/// Tests sample size calculations, confidence intervals, and significance testing
/// </summary>
public class ABTestingFrameworkTests : IClassFixture<WebApplicationFactory<Program>>, IDisposable
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;
    private readonly string _testSessionId = Guid.NewGuid().ToString();

    public ABTestingFrameworkTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
        _client = _factory.CreateClient();
    }

    #region Statistical Accuracy Tests

    [Fact]
    public async Task ABTest_ShouldCalculateStatisticalSignificanceCorrectly()
    {
        // Arrange - Create A/B test with known statistical properties
        var experimentData = new
        {
            experimentId = Guid.NewGuid().ToString(),
            name = "Pricing Page Conversion Test",
            hypothesis = "New pricing layout increases conversion rate",
            variants = new[]
            {
                new { id = "control", name = "Original Pricing", allocation = 0.5 },
                new { id = "treatment", name = "New Pricing Layout", allocation = 0.5 }
            },
            primaryMetric = "conversion_rate",
            minimumDetectableEffect = 0.02, // 2% increase
            statisticalPower = 0.8,
            significanceLevel = 0.05,
            sessionId = _testSessionId
        };

        var createResponse = await _client.PostAsJsonAsync("/api/ab-testing/experiments", experimentData);
        createResponse.Should().HaveStatusCode(System.Net.HttpStatusCode.Created);
        
        var experimentId = experimentData.experimentId;

        // Act - Simulate experiment data with known effect size
        // Control group: 8% conversion rate (160 conversions out of 2000 users)
        // Treatment group: 10% conversion rate (200 conversions out of 2000 users)
        // Expected effect size: 2% (statistically significant)
        
        await SimulateExperimentData(experimentId, "control", 2000, 160); // 8% conversion
        await SimulateExperimentData(experimentId, "treatment", 2000, 200); // 10% conversion

        // Allow processing time for statistical calculations
        await Task.Delay(3000);

        // Act - Get statistical analysis results
        var resultsResponse = await _client.GetAsync($"/api/ab-testing/experiments/{experimentId}/results");
        var resultsContent = await resultsResponse.Content.ReadAsStringAsync();
        var results = JsonSerializer.Deserialize<Dictionary<string, object>>(resultsContent);

        // Assert - Statistical calculations should be accurate
        results.Should().NotBeNull();
        results.Should().ContainKey("statistical_significance");
        results.Should().ContainKey("confidence_interval");
        results.Should().ContainKey("p_value");
        results.Should().ContainKey("effect_size");
        results.Should().ContainKey("statistical_power");

        // Verify statistical significance
        var isSignificant = ((JsonElement)results["statistical_significance"]).GetBoolean();
        isSignificant.Should().BeTrue("2% effect size with 4000 users should be statistically significant");

        // Verify p-value
        var pValue = ((JsonElement)results["p_value"]).GetDouble();
        pValue.Should().BeLessThan(0.05, "P-value should be less than significance level");

        // Verify effect size calculation
        var effectSize = ((JsonElement)results["effect_size"]).GetDouble();
        effectSize.Should().BeApproximately(0.02, 0.005, "Effect size should be approximately 2%");

        // Verify confidence interval
        var confidenceInterval = JsonSerializer.Deserialize<Dictionary<string, double>>(
            ((JsonElement)results["confidence_interval"]).GetRawText());
        confidenceInterval.Should().ContainKeys("lower_bound", "upper_bound");
        confidenceInterval["lower_bound"].Should().BeGreaterThan(0, "Lower bound should be positive for significant result");
        confidenceInterval["upper_bound"].Should().BeGreaterThan(confidenceInterval["lower_bound"], "Upper bound should be greater than lower bound");
    }

    [Fact]
    public async Task ABTest_ShouldCalculateCorrectSampleSizes()
    {
        // Arrange - Test parameters for sample size calculation
        var sampleSizeRequests = new[]
        {
            new { baseConversionRate = 0.05, minimumDetectableEffect = 0.01, power = 0.8, alpha = 0.05, expectedSampleSize = 15686 },
            new { baseConversionRate = 0.10, minimumDetectableEffect = 0.02, power = 0.8, alpha = 0.05, expectedSampleSize = 3842 },
            new { baseConversionRate = 0.03, minimumDetectableEffect = 0.005, power = 0.9, alpha = 0.01, expectedSampleSize = 47890 }
        };

        foreach (var request in sampleSizeRequests)
        {
            // Act - Calculate sample size
            var sampleSizeRequest = new
            {
                baseConversionRate = request.baseConversionRate,
                minimumDetectableEffect = request.minimumDetectableEffect,
                statisticalPower = request.power,
                significanceLevel = request.alpha,
                testType = "two_tailed"
            };

            var response = await _client.PostAsJsonAsync("/api/ab-testing/sample-size-calculator", sampleSizeRequest);
            var content = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<Dictionary<string, object>>(content);

            // Assert - Sample size should be within expected range
            result.Should().ContainKey("required_sample_size_per_variant");
            var calculatedSampleSize = ((JsonElement)result["required_sample_size_per_variant"]).GetInt32();
            
            calculatedSampleSize.Should().BeCloseTo(request.expectedSampleSize, request.expectedSampleSize * 0.1, 
                $"Sample size for conversion rate {request.baseConversionRate} should be approximately {request.expectedSampleSize}");
        }
    }

    [Fact]
    public async Task ABTest_ShouldDetectFalsePositivesAppropriately()
    {
        // Arrange - Create multiple experiments with no real effect (should produce ~5% false positives)
        const int numberOfTests = 100;
        const double expectedFalsePositiveRate = 0.05;
        var falsePositiveCount = 0;
        var experimentIds = new List<string>();

        // Create multiple A/A tests (both groups identical)
        for (int i = 0; i < numberOfTests; i++)
        {
            var experimentId = Guid.NewGuid().ToString();
            var experimentData = new
            {
                experimentId = experimentId,
                name = $"False Positive Test {i}",
                variants = new[]
                {
                    new { id = "variant_a", allocation = 0.5 },
                    new { id = "variant_b", allocation = 0.5 }
                },
                primaryMetric = "conversion_rate",
                significanceLevel = 0.05,
                sessionId = _testSessionId
            };

            await _client.PostAsJsonAsync("/api/ab-testing/experiments", experimentData);
            experimentIds.Add(experimentId);

            // Simulate identical performance for both variants (5% conversion rate)
            await SimulateExperimentData(experimentId, "variant_a", 1000, 50); // 5% conversion
            await SimulateExperimentData(experimentId, "variant_b", 1000, 50); // 5% conversion
        }

        // Allow processing time
        await Task.Delay(5000);

        // Act - Check how many tests show false significance
        foreach (var experimentId in experimentIds)
        {
            var resultsResponse = await _client.GetAsync($"/api/ab-testing/experiments/{experimentId}/results");
            var resultsContent = await resultsResponse.Content.ReadAsStringAsync();
            var results = JsonSerializer.Deserialize<Dictionary<string, object>>(resultsContent);

            if (results.ContainsKey("statistical_significance"))
            {
                var isSignificant = ((JsonElement)results["statistical_significance"]).GetBoolean();
                if (isSignificant)
                {
                    falsePositiveCount++;
                }
            }
        }

        // Assert - False positive rate should be approximately 5%
        var observedFalsePositiveRate = (double)falsePositiveCount / numberOfTests;
        observedFalsePositiveRate.Should().BeApproximately(expectedFalsePositiveRate, 0.03, 
            "False positive rate should be approximately 5% for α = 0.05");
    }

    #endregion

    #region Experiment Isolation Tests

    [Fact]
    public async Task ABTest_ShouldIsolateExperimentsCorrectly()
    {
        // Arrange - Create multiple concurrent experiments
        var experiment1Data = new
        {
            experimentId = Guid.NewGuid().ToString(),
            name = "Landing Page Headline Test",
            targetAudience = new { userType = "new_visitors", geo = "US" },
            variants = new[] { new { id = "control" }, new { id = "treatment" } },
            sessionId = _testSessionId
        };

        var experiment2Data = new
        {
            experimentId = Guid.NewGuid().ToString(),
            name = "Pricing Button Color Test",
            targetAudience = new { userType = "returning_visitors", geo = "US" },
            variants = new[] { new { id = "blue_button" }, new { id = "red_button" } },
            sessionId = _testSessionId
        };

        var experiment3Data = new
        {
            experimentId = Guid.NewGuid().ToString(),
            name = "Mobile Navigation Test",
            targetAudience = new { userType = "all_users", device = "mobile" },
            variants = new[] { new { id = "hamburger_menu" }, new { id = "tab_navigation" } },
            sessionId = _testSessionId
        };

        // Create experiments
        await _client.PostAsJsonAsync("/api/ab-testing/experiments", experiment1Data);
        await _client.PostAsJsonAsync("/api/ab-testing/experiments", experiment2Data);
        await _client.PostAsJsonAsync("/api/ab-testing/experiments", experiment3Data);

        // Act - Simulate user assignment to experiments
        var users = await CreateTestUsers(1000);
        var userAssignments = new Dictionary<string, List<string>>(); // experimentId -> userIds

        foreach (var userId in users)
        {
            var assignmentRequest = new
            {
                userId = userId,
                userProfile = new
                {
                    userType = userId.EndsWith("1") ? "new_visitors" : "returning_visitors",
                    geo = "US",
                    device = userId.EndsWith("0") ? "mobile" : "desktop"
                },
                activeExperiments = new[] { experiment1Data.experimentId, experiment2Data.experimentId, experiment3Data.experimentId }
            };

            var response = await _client.PostAsJsonAsync("/api/ab-testing/user-assignment", assignmentRequest);
            var content = await response.Content.ReadAsStringAsync();
            var assignments = JsonSerializer.Deserialize<Dictionary<string, object>>(content);

            if (assignments.ContainsKey("experiment_assignments"))
            {
                var experimentAssignments = JsonSerializer.Deserialize<Dictionary<string, string>>(
                    ((JsonElement)assignments["experiment_assignments"]).GetRawText());

                foreach (var (expId, variant) in experimentAssignments)
                {
                    if (!userAssignments.ContainsKey(expId))
                        userAssignments[expId] = new List<string>();
                    userAssignments[expId].Add(userId);
                }
            }
        }

        // Assert - Experiments should have appropriate isolation
        // Experiment 1: Only new visitors
        userAssignments.Should().ContainKey(experiment1Data.experimentId);
        var exp1Users = userAssignments[experiment1Data.experimentId];
        exp1Users.All(userId => userId.EndsWith("1")).Should().BeTrue(
            "Experiment 1 should only include new visitors (userIds ending in 1)");

        // Experiment 2: Only returning visitors
        userAssignments.Should().ContainKey(experiment2Data.experimentId);
        var exp2Users = userAssignments[experiment2Data.experimentId];
        exp2Users.All(userId => !userId.EndsWith("1")).Should().BeTrue(
            "Experiment 2 should only include returning visitors");

        // Experiment 3: Only mobile users
        userAssignments.Should().ContainKey(experiment3Data.experimentId);
        var exp3Users = userAssignments[experiment3Data.experimentId];
        exp3Users.All(userId => userId.EndsWith("0")).Should().BeTrue(
            "Experiment 3 should only include mobile users (userIds ending in 0)");

        // Verify no user overlap where it shouldn't exist
        var exp1And2Overlap = exp1Users.Intersect(exp2Users).Count();
        exp1And2Overlap.Should().Be(0, "New and returning visitor experiments should have no overlap");
    }

    [Fact]
    public async Task ABTest_ShouldHandleConcurrentExperimentInteractions()
    {
        // Arrange - Create experiments that could potentially interact
        var headerExperiment = new
        {
            experimentId = Guid.NewGuid().ToString(),
            name = "Header CTA Test",
            element = "header_cta",
            variants = new[] { new { id = "get_started" }, new { id = "try_free" } },
            sessionId = _testSessionId
        };

        var footerExperiment = new
        {
            experimentId = Guid.NewGuid().ToString(),
            name = "Footer Newsletter Test",
            element = "footer_newsletter",
            variants = new[] { new { id = "weekly" }, new { id = "monthly" } },
            sessionId = _testSessionId
        };

        await _client.PostAsJsonAsync("/api/ab-testing/experiments", headerExperiment);
        await _client.PostAsJsonAsync("/api/ab-testing/experiments", footerExperiment);

        // Act - Test user in both experiments
        var testUserId = Guid.NewGuid().ToString();
        var multiExperimentAssignment = new
        {
            userId = testUserId,
            experimentsToAssign = new[] { headerExperiment.experimentId, footerExperiment.experimentId }
        };

        var assignmentResponse = await _client.PostAsJsonAsync(
            "/api/ab-testing/multi-experiment-assignment", multiExperimentAssignment);
        var assignmentContent = await assignmentResponse.Content.ReadAsStringAsync();
        var assignments = JsonSerializer.Deserialize<Dictionary<string, object>>(assignmentContent);

        // Record conversion for this user
        var conversionEvent = new
        {
            userId = testUserId,
            experimentIds = new[] { headerExperiment.experimentId, footerExperiment.experimentId },
            eventType = "conversion",
            value = 1,
            timestamp = DateTime.UtcNow,
            sessionId = _testSessionId
        };

        await _client.PostAsJsonAsync("/api/ab-testing/multi-experiment-conversion", conversionEvent);

        // Assert - Both experiments should record the conversion appropriately
        assignments.Should().ContainKey("experiment_assignments");
        var experimentAssignments = JsonSerializer.Deserialize<Dictionary<string, string>>(
            ((JsonElement)assignments["experiment_assignments"]).GetRawText());

        experimentAssignments.Should().ContainKey(headerExperiment.experimentId);
        experimentAssignments.Should().ContainKey(footerExperiment.experimentId);

        // Verify interaction analysis is available
        var interactionAnalysisResponse = await _client.GetAsync(
            $"/api/ab-testing/interaction-analysis?experiment1={headerExperiment.experimentId}&experiment2={footerExperiment.experimentId}");
        interactionAnalysisResponse.Should().HaveStatusCode(System.Net.HttpStatusCode.OK);

        var interactionContent = await interactionAnalysisResponse.Content.ReadAsStringAsync();
        var interactionAnalysis = JsonSerializer.Deserialize<Dictionary<string, object>>(interactionContent);
        
        interactionAnalysis.Should().ContainKey("interaction_effect");
        interactionAnalysis.Should().ContainKey("combined_variants_performance");
    }

    #endregion

    #region Statistical Methods Validation

    [Fact]
    public async Task ABTest_ShouldImplementBayesianAnalysisCorrectly()
    {
        // Arrange - Bayesian A/B test setup
        var bayesianExperiment = new
        {
            experimentId = Guid.NewGuid().ToString(),
            name = "Bayesian Conversion Test",
            analysisMethod = "bayesian",
            priorBeta = new { alpha = 1, beta = 1 }, // Non-informative prior
            variants = new[] { new { id = "control" }, new { id = "treatment" } },
            sessionId = _testSessionId
        };

        await _client.PostAsJsonAsync("/api/ab-testing/experiments", bayesianExperiment);

        // Act - Simulate data collection
        await SimulateExperimentData(bayesianExperiment.experimentId, "control", 1500, 90); // 6% conversion
        await SimulateExperimentData(bayesianExperiment.experimentId, "treatment", 1500, 135); // 9% conversion

        // Wait for Bayesian analysis
        await Task.Delay(3000);

        var bayesianResultsResponse = await _client.GetAsync(
            $"/api/ab-testing/experiments/{bayesianExperiment.experimentId}/bayesian-results");
        var bayesianContent = await bayesianResultsResponse.Content.ReadAsStringAsync();
        var bayesianResults = JsonSerializer.Deserialize<Dictionary<string, object>>(bayesianContent);

        // Assert - Bayesian analysis should provide probability statements
        bayesianResults.Should().ContainKey("probability_treatment_better");
        bayesianResults.Should().ContainKey("credible_interval");
        bayesianResults.Should().ContainKey("expected_loss");
        bayesianResults.Should().ContainKey("posterior_distributions");

        var probabilityTreatmentBetter = ((JsonElement)bayesianResults["probability_treatment_better"]).GetDouble();
        probabilityTreatmentBetter.Should().BeGreaterThan(0.9, 
            "With 9% vs 6% conversion rates, probability that treatment is better should be > 90%");

        // Verify credible interval
        var credibleInterval = JsonSerializer.Deserialize<Dictionary<string, double>>(
            ((JsonElement)bayesianResults["credible_interval"]).GetRawText());
        credibleInterval.Should().ContainKeys("lower_bound", "upper_bound");
        credibleInterval["lower_bound"].Should().BeGreaterThan(0, "Effect should be significantly positive");
    }

    [Fact]
    public async Task ABTest_ShouldHandleSequentialTesting()
    {
        // Arrange - Sequential testing experiment
        var sequentialExperiment = new
        {
            experimentId = Guid.NewGuid().ToString(),
            name = "Sequential Testing Experiment",
            testingMethod = "sequential",
            alphaSpending = "obrien_fleming",
            maxSampleSize = 5000,
            interimAnalyses = new[] { 1000, 2500, 4000, 5000 },
            sessionId = _testSessionId
        };

        await _client.PostAsJsonAsync("/api/ab-testing/experiments", sequentialExperiment);

        // Act - Simulate data collection at interim analysis points
        var interimResults = new List<Dictionary<string, object>>();
        var sampleSizes = new[] { 1000, 2500, 4000, 5000 };
        var conversionRates = new[] { 0.08, 0.085, 0.088, 0.09 }; // Gradual increase showing effect

        for (int i = 0; i < sampleSizes.Length; i++)
        {
            var sampleSize = sampleSizes[i];
            var conversionRate = conversionRates[i];
            
            // Add incremental data
            var previousSampleSize = i == 0 ? 0 : sampleSizes[i - 1];
            var incrementalSampleSize = sampleSize - previousSampleSize;
            var incrementalConversions = (int)(incrementalSampleSize * conversionRate * 0.5); // Control
            var incrementalTreatmentConversions = (int)(incrementalSampleSize * (conversionRate + 0.02) * 0.5); // Treatment +2%

            await SimulateExperimentData(sequentialExperiment.experimentId, "control", 
                incrementalSampleSize / 2, incrementalConversions);
            await SimulateExperimentData(sequentialExperiment.experimentId, "treatment", 
                incrementalSampleSize / 2, incrementalTreatmentConversions);

            // Run interim analysis
            await Task.Delay(1000);
            var interimResponse = await _client.GetAsync(
                $"/api/ab-testing/experiments/{sequentialExperiment.experimentId}/sequential-analysis");
            var interimContent = await interimResponse.Content.ReadAsStringAsync();
            var interimResult = JsonSerializer.Deserialize<Dictionary<string, object>>(interimContent);
            
            interimResults.Add(interimResult);
        }

        // Assert - Sequential testing should control Type I error
        foreach (var result in interimResults)
        {
            result.Should().ContainKey("current_alpha_level");
            result.Should().ContainKey("stopping_boundary");
            result.Should().ContainKey("continue_testing");
            
            var currentAlpha = ((JsonElement)result["current_alpha_level"]).GetDouble();
            currentAlpha.Should().BeLessThanOrEqualTo(0.05, "Alpha spending should not exceed overall alpha");
        }

        // Final analysis should detect significance if effect is real
        var finalResult = interimResults.Last();
        if (finalResult.ContainsKey("statistical_significance"))
        {
            var isSignificant = ((JsonElement)finalResult["statistical_significance"]).GetBoolean();
            // With 2% effect size and adequate sample, should be significant
            isSignificant.Should().BeTrue("Sequential test should detect significant effect");
        }
    }

    [Fact]
    public async Task ABTest_ShouldCalculateConfidenceIntervalsAccurately()
    {
        // Arrange - Test different confidence levels
        var confidenceLevels = new[] { 0.90, 0.95, 0.99 };
        var testResults = new List<(double level, double lower, double upper, double width)>();

        foreach (var confidenceLevel in confidenceLevels)
        {
            var experimentId = Guid.NewGuid().ToString();
            var experiment = new
            {
                experimentId = experimentId,
                name = $"Confidence Interval Test {confidenceLevel}",
                confidenceLevel = confidenceLevel,
                sessionId = _testSessionId
            };

            await _client.PostAsJsonAsync("/api/ab-testing/experiments", experiment);

            // Simulate known effect: 10% vs 12% conversion rates
            await SimulateExperimentData(experimentId, "control", 2000, 200); // 10%
            await SimulateExperimentData(experimentId, "treatment", 2000, 240); // 12%

            await Task.Delay(1500);

            var resultsResponse = await _client.GetAsync($"/api/ab-testing/experiments/{experimentId}/results");
            var resultsContent = await resultsResponse.Content.ReadAsStringAsync();
            var results = JsonSerializer.Deserialize<Dictionary<string, object>>(resultsContent);

            if (results.ContainsKey("confidence_interval"))
            {
                var ci = JsonSerializer.Deserialize<Dictionary<string, double>>(
                    ((JsonElement)results["confidence_interval"]).GetRawText());
                
                var lower = ci["lower_bound"];
                var upper = ci["upper_bound"];
                var width = upper - lower;
                
                testResults.Add((confidenceLevel, lower, upper, width));
            }
        }

        // Assert - Higher confidence levels should have wider intervals
        testResults.Should().HaveCount(3);
        
        var (level90, lower90, upper90, width90) = testResults[0];
        var (level95, lower95, upper95, width95) = testResults[1];
        var (level99, lower99, upper99, width99) = testResults[2];

        width99.Should().BeGreaterThan(width95, "99% CI should be wider than 95% CI");
        width95.Should().BeGreaterThan(width90, "95% CI should be wider than 90% CI");

        // All intervals should contain the true effect size (2%)
        const double trueEffectSize = 0.02;
        lower90.Should().BeLessThanOrEqualTo(trueEffectSize);
        upper90.Should().BeGreaterThanOrEqualTo(trueEffectSize);
        lower95.Should().BeLessThanOrEqualTo(trueEffectSize);
        upper95.Should().BeGreaterThanOrEqualTo(trueEffectSize);
        lower99.Should().BeLessThanOrEqualTo(trueEffectSize);
        upper99.Should().BeGreaterThanOrEqualTo(trueEffectSize);
    }

    #endregion

    #region Helper Methods

    private async Task SimulateExperimentData(string experimentId, string variantId, int sampleSize, int conversions)
    {
        var experimentData = new
        {
            experimentId = experimentId,
            variantId = variantId,
            sampleSize = sampleSize,
            conversions = conversions,
            timestamp = DateTime.UtcNow,
            sessionId = _testSessionId
        };

        await _client.PostAsJsonAsync("/api/ab-testing/experiment-data", experimentData);
    }

    private async Task<List<string>> CreateTestUsers(int count)
    {
        var users = new List<string>();
        for (int i = 0; i < count; i++)
        {
            users.Add($"test_user_{i:D4}");
        }
        return users;
    }

    #endregion

    public void Dispose()
    {
        _client?.Dispose();
    }
}