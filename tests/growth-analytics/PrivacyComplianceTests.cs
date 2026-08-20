using System;
using System.Collections.Generic;
using System.Threading.Tasks;
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
using System.Text;

namespace GeoLeap.Api.Tests.GrowthAnalytics;

/// <summary>
/// Privacy Compliance Testing Suite for Growth Analytics
/// Validates 100% GDPR compliance and privacy requirements
/// Tests consent management, data deletion, and cross-border compliance
/// </summary>
public class PrivacyComplianceTests : IClassFixture<WebApplicationFactory<Program>>, IDisposable
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;
    private readonly string _testSessionId = Guid.NewGuid().ToString();

    public PrivacyComplianceTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
        _client = _factory.CreateClient();
    }

    #region GDPR Consent Management Tests

    [Fact]
    public async Task GDPR_ShouldValidateConsentCollection()
    {
        // Arrange - User without consent
        var userId = Guid.NewGuid().ToString();
        var userData = new
        {
            userId = userId,
            email = "test.user@example.com",
            region = "EU",
            requiresConsent = true
        };

        // Act - Attempt to collect data without consent
        var analyticsData = new
        {
            userId = userId,
            eventType = "page_view",
            timestamp = DateTime.UtcNow,
            sessionId = _testSessionId,
            personalData = new { ip = "192.168.1.1", userAgent = "Mozilla/5.0" }
        };

        var response = await _client.PostAsJsonAsync("/api/analytics/event", analyticsData);
        
        // Assert - Should reject data collection without consent
        response.StatusCode.Should().Be(System.Net.HttpStatusCode.Forbidden, 
            "Should reject analytics data collection without consent");

        // Act - Provide explicit consent
        var consentData = new
        {
            userId = userId,
            consentTypes = new[] { "analytics", "personalization", "marketing" },
            consentGiven = true,
            consentTimestamp = DateTime.UtcNow,
            ipAddress = "192.168.1.1",
            userAgent = "Mozilla/5.0",
            consentVersion = "v2.1"
        };

        var consentResponse = await _client.PostAsJsonAsync("/api/privacy/consent", consentData);
        consentResponse.Should().HaveStatusCode(System.Net.HttpStatusCode.OK);

        // Act - Retry data collection with consent
        var retryResponse = await _client.PostAsJsonAsync("/api/analytics/event", analyticsData);
        
        // Assert - Should now accept data collection
        retryResponse.Should().HaveStatusCode(System.Net.HttpStatusCode.OK, 
            "Should accept analytics data collection with valid consent");
    }

    [Fact]
    public async Task GDPR_ShouldTrackConsentWithdrawal()
    {
        // Arrange - User with existing consent
        var userId = await CreateUserWithConsent();
        
        // Pre-populate analytics data
        await CollectAnalyticsData(userId, 100);
        var initialDataCount = await GetUserAnalyticsDataCount(userId);
        initialDataCount.Should().BeGreaterThan(0, "Should have initial analytics data");

        // Act - Withdraw consent
        var withdrawalData = new
        {
            userId = userId,
            consentTypes = new[] { "analytics" },
            consentGiven = false,
            withdrawalTimestamp = DateTime.UtcNow,
            withdrawalReason = "user_request"
        };

        var withdrawalResponse = await _client.PostAsJsonAsync("/api/privacy/consent", withdrawalData);
        withdrawalResponse.Should().HaveStatusCode(System.Net.HttpStatusCode.OK);

        // Act - Attempt to collect new data after withdrawal
        var newAnalyticsData = new
        {
            userId = userId,
            eventType = "post_withdrawal_event",
            timestamp = DateTime.UtcNow.AddMinutes(1),
            sessionId = _testSessionId
        };

        var newDataResponse = await _client.PostAsJsonAsync("/api/analytics/event", newAnalyticsData);
        
        // Assert - Should reject new data collection
        newDataResponse.StatusCode.Should().Be(System.Net.HttpStatusCode.Forbidden, 
            "Should reject data collection after consent withdrawal");

        // Verify consent withdrawal is properly logged
        var auditResponse = await _client.GetAsync($"/api/privacy/consent-audit?userId={userId}");
        var auditContent = await auditResponse.Content.ReadAsStringAsync();
        var auditLog = JsonSerializer.Deserialize<List<Dictionary<string, object>>>(auditContent);
        
        auditLog.Should().Contain(entry => 
            entry.ContainsKey("action") && 
            entry["action"].ToString() == "consent_withdrawn");
    }

    [Fact]
    public async Task GDPR_ShouldValidateConsentVersioning()
    {
        // Arrange - User with old consent version
        var userId = Guid.NewGuid().ToString();
        var oldConsentData = new
        {
            userId = userId,
            consentTypes = new[] { "analytics" },
            consentGiven = true,
            consentTimestamp = DateTime.UtcNow.AddMonths(-6),
            consentVersion = "v1.0" // Old version
        };

        await _client.PostAsJsonAsync("/api/privacy/consent", oldConsentData);

        // Act - Update privacy policy (new consent version required)
        await _client.PostAsync("/api/privacy/update-policy-version", 
            new StringContent(JsonSerializer.Serialize(new { newVersion = "v2.1" }), 
            Encoding.UTF8, "application/json"));

        // Act - Attempt analytics collection with outdated consent
        var analyticsData = new
        {
            userId = userId,
            eventType = "test_event",
            timestamp = DateTime.UtcNow,
            sessionId = _testSessionId
        };

        var response = await _client.PostAsJsonAsync("/api/analytics/event", analyticsData);
        
        // Assert - Should require updated consent
        response.StatusCode.Should().Be(System.Net.HttpStatusCode.PreconditionRequired, 
            "Should require updated consent when policy version changes");

        // Act - Provide updated consent
        var updatedConsentData = new
        {
            userId = userId,
            consentTypes = new[] { "analytics", "personalization" }, // Expanded consent
            consentGiven = true,
            consentTimestamp = DateTime.UtcNow,
            consentVersion = "v2.1" // Current version
        };

        var updatedConsentResponse = await _client.PostAsJsonAsync("/api/privacy/consent", updatedConsentData);
        updatedConsentResponse.Should().HaveStatusCode(System.Net.HttpStatusCode.OK);

        // Retry analytics collection
        var retryResponse = await _client.PostAsJsonAsync("/api/analytics/event", analyticsData);
        retryResponse.Should().HaveStatusCode(System.Net.HttpStatusCode.OK, 
            "Should accept data collection with updated consent");
    }

    #endregion

    #region Data Subject Rights Tests

    [Fact]
    public async Task GDPR_ShouldProcessDataExportRequests()
    {
        // Arrange - User with comprehensive analytics data
        var userId = await CreateUserWithConsent();
        await CollectAnalyticsData(userId, 500); // Substantial data set
        
        // Add various types of data
        await CollectAttributionData(userId);
        await CollectBehavioralData(userId);
        await CollectPersonalizationData(userId);

        // Act - Request data export
        var exportRequest = new
        {
            userId = userId,
            requestType = "data_export",
            format = "json",
            includeAnalytics = true,
            includeAttribution = true,
            includeBehavioral = true,
            requestTimestamp = DateTime.UtcNow
        };

        var exportResponse = await _client.PostAsJsonAsync("/api/privacy/data-export", exportRequest);
        exportResponse.Should().HaveStatusCode(System.Net.HttpStatusCode.Accepted);

        // Get request ID
        var exportContent = await exportResponse.Content.ReadAsStringAsync();
        var exportResult = JsonSerializer.Deserialize<Dictionary<string, object>>(exportContent);
        var requestId = exportResult["requestId"].ToString();

        // Act - Wait for export processing (with timeout)
        var exportData = await WaitForExportCompletion(requestId, TimeSpan.FromMinutes(5));

        // Assert - Export should be comprehensive and accurate
        exportData.Should().NotBeNull("Export should complete successfully");
        
        var exportJson = JsonSerializer.Deserialize<Dictionary<string, object>>(exportData);
        exportJson.Should().ContainKey("user_id");
        exportJson.Should().ContainKey("analytics_data");
        exportJson.Should().ContainKey("attribution_data");
        exportJson.Should().ContainKey("behavioral_data");
        exportJson.Should().ContainKey("export_timestamp");
        
        // Verify data completeness
        var analyticsArray = JsonSerializer.Deserialize<JsonElement[]>(
            ((JsonElement)exportJson["analytics_data"]).GetRawText());
        analyticsArray.Length.Should().BeGreaterThan(450, "Should include most analytics events");
        
        // Verify personal data is properly included
        exportJson.Should().ContainKey("personal_data_summary");
        var personalDataSummary = JsonSerializer.Deserialize<Dictionary<string, object>>(
            ((JsonElement)exportJson["personal_data_summary"]).GetRawText());
        personalDataSummary.Should().ContainKey("data_categories");
        personalDataSummary.Should().ContainKey("processing_purposes");
    }

    [Fact]
    public async Task GDPR_ShouldProcessDataDeletionRequests()
    {
        // Arrange - User with various analytics data
        var userId = await CreateUserWithConsent();
        await CollectAnalyticsData(userId, 200);
        await CollectAttributionData(userId);
        
        // Verify data exists before deletion
        var preDeleteionCount = await GetUserAnalyticsDataCount(userId);
        preDeleteionCount.Should().BeGreaterThan(0, "User should have analytics data before deletion");

        // Act - Request data deletion
        var deletionRequest = new
        {
            userId = userId,
            requestType = "data_deletion",
            deletionScope = "all_personal_data",
            retainAnonymized = true, // Keep anonymized analytics
            requestTimestamp = DateTime.UtcNow,
            verificationToken = "user-verified-token"
        };

        var deletionResponse = await _client.PostAsJsonAsync("/api/privacy/data-deletion", deletionRequest);
        deletionResponse.Should().HaveStatusCode(System.Net.HttpStatusCode.Accepted);

        // Get deletion request ID
        var deletionContent = await deletionResponse.Content.ReadAsStringAsync();
        var deletionResult = JsonSerializer.Deserialize<Dictionary<string, object>>(deletionContent);
        var requestId = deletionResult["requestId"].ToString();

        // Act - Wait for deletion completion
        var deletionCompleted = await WaitForDeletionCompletion(requestId, TimeSpan.FromMinutes(3));
        deletionCompleted.Should().BeTrue("Deletion should complete within timeout");

        // Assert - Personal data should be completely removed
        var postDeletionCount = await GetUserAnalyticsDataCount(userId);
        postDeletionCount.Should().Be(0, "All personal analytics data should be deleted");

        // Verify anonymized data is retained
        var anonymizedDataCount = await GetAnonymizedDataCount(_testSessionId);
        anonymizedDataCount.Should().BeGreaterThan(0, "Anonymized data should be retained for analytics");

        // Verify deletion audit trail
        var auditResponse = await _client.GetAsync($"/api/privacy/deletion-audit?requestId={requestId}");
        var auditContent = await auditResponse.Content.ReadAsStringAsync();
        var auditLog = JsonSerializer.Deserialize<Dictionary<string, object>>(auditContent);
        
        auditLog.Should().ContainKey("deleted_data_categories");
        auditLog.Should().ContainKey("deletion_timestamp");
        auditLog.Should().ContainKey("verification_status");
        
        var verificationStatus = auditLog["verification_status"].ToString();
        verificationStatus.Should().Be("completed", "Deletion should be verified as completed");
    }

    [Fact]
    public async Task GDPR_ShouldProcessDataRectificationRequests()
    {
        // Arrange - User with analytics data containing errors
        var userId = await CreateUserWithConsent();
        await CollectAnalyticsData(userId, 100);
        
        // Add some data with intentional "errors"
        var incorrectData = new
        {
            userId = userId,
            eventType = "incorrect_event",
            userPreferences = new { location = "Wrong City", timezone = "Wrong/Timezone" },
            timestamp = DateTime.UtcNow,
            sessionId = _testSessionId
        };
        
        await _client.PostAsJsonAsync("/api/analytics/event", incorrectData);

        // Act - Request data rectification
        var rectificationRequest = new
        {
            userId = userId,
            requestType = "data_rectification",
            corrections = new[]
            {
                new { field = "userPreferences.location", oldValue = "Wrong City", newValue = "Correct City" },
                new { field = "userPreferences.timezone", oldValue = "Wrong/Timezone", newValue = "Europe/London" }
            },
            requestTimestamp = DateTime.UtcNow
        };

        var rectificationResponse = await _client.PostAsJsonAsync("/api/privacy/data-rectification", rectificationRequest);
        rectificationResponse.Should().HaveStatusCode(System.Net.HttpStatusCode.OK);

        // Act - Verify corrections were applied
        var userData = await GetUserAnalyticsProfile(userId);
        var userProfile = JsonSerializer.Deserialize<Dictionary<string, object>>(userData);
        
        // Assert - Data should be corrected
        userProfile.Should().ContainKey("userPreferences");
        var preferences = JsonSerializer.Deserialize<Dictionary<string, object>>(
            ((JsonElement)userProfile["userPreferences"]).GetRawText());
        
        preferences["location"].ToString().Should().Be("Correct City", "Location should be corrected");
        preferences["timezone"].ToString().Should().Be("Europe/London", "Timezone should be corrected");
        
        // Verify rectification audit trail
        var auditResponse = await _client.GetAsync($"/api/privacy/rectification-audit?userId={userId}");
        var auditContent = await auditResponse.Content.ReadAsStringAsync();
        var auditLog = JsonSerializer.Deserialize<List<Dictionary<string, object>>>(auditContent);
        
        auditLog.Should().Contain(entry => 
            entry.ContainsKey("action") && 
            entry["action"].ToString() == "data_rectified");
    }

    #endregion

    #region Cross-Border Data Compliance Tests

    [Fact]
    public async Task GDPR_ShouldRespectDataResidencyRequirements()
    {
        // Arrange - Users from different regions
        var euUserId = await CreateUserWithRegion("EU");
        var usUserId = await CreateUserWithRegion("US");
        var ukUserId = await CreateUserWithRegion("UK");

        // Act - Collect analytics data for each region
        await CollectAnalyticsData(euUserId, 50);
        await CollectAnalyticsData(usUserId, 50);
        await CollectAnalyticsData(ukUserId, 50);

        // Act - Verify data storage locations
        var dataLocationResponse = await _client.GetAsync(
            $"/api/privacy/data-locations?sessionId={_testSessionId}");
        var locationContent = await dataLocationResponse.Content.ReadAsStringAsync();
        var dataLocations = JsonSerializer.Deserialize<Dictionary<string, object>>(locationContent);

        // Assert - Data should be stored in appropriate regions
        dataLocations.Should().ContainKey("eu_data_count");
        dataLocations.Should().ContainKey("us_data_count");
        dataLocations.Should().ContainKey("uk_data_count");
        
        var euDataCount = ((JsonElement)dataLocations["eu_data_count"]).GetInt32();
        var usDataCount = ((JsonElement)dataLocations["us_data_count"]).GetInt32();
        var ukDataCount = ((JsonElement)dataLocations["uk_data_count"]).GetInt32();
        
        euDataCount.Should().BeGreaterThan(0, "EU user data should be stored in EU");
        usDataCount.Should().BeGreaterThan(0, "US user data should be stored in US");
        ukDataCount.Should().BeGreaterThan(0, "UK user data should be stored in UK");
        
        // Verify compliance with data residency rules
        var complianceResponse = await _client.GetAsync("/api/privacy/residency-compliance-check");
        var complianceContent = await complianceResponse.Content.ReadAsStringAsync();
        var compliance = JsonSerializer.Deserialize<Dictionary<string, object>>(complianceContent);
        
        var complianceScore = ((JsonElement)compliance["overall_compliance_score"]).GetDouble();
        complianceScore.Should().BeGreaterOrEqualTo(1.0, "Should have 100% data residency compliance");
    }

    [Fact]
    public async Task GDPR_ShouldValidateInternationalDataTransfers()
    {
        // Arrange - EU user requiring data transfer
        var euUserId = await CreateUserWithRegion("EU");
        await CollectAnalyticsData(euUserId, 100);

        // Act - Request analytics processing that requires data transfer
        var transferRequest = new
        {
            userId = euUserId,
            processingType = "advanced_analytics",
            requiresTransfer = true,
            targetRegions = new[] { "US" }, // Transfer to US for processing
            transferPurpose = "analytics_processing",
            adequacyDecision = "standard_contractual_clauses"
        };

        var transferResponse = await _client.PostAsJsonAsync("/api/privacy/data-transfer", transferRequest);
        
        // Assert - Transfer should require proper safeguards
        transferResponse.Should().HaveStatusCode(System.Net.HttpStatusCode.OK);
        
        var transferContent = await transferResponse.Content.ReadAsStringAsync();
        var transferResult = JsonSerializer.Deserialize<Dictionary<string, object>>(transferContent);
        
        transferResult.Should().ContainKey("transfer_approved");
        transferResult.Should().ContainKey("safeguards_applied");
        transferResult.Should().ContainKey("transfer_id");
        
        var transferApproved = ((JsonElement)transferResult["transfer_approved"]).GetBoolean();
        transferApproved.Should().BeTrue("Transfer should be approved with proper safeguards");
        
        // Verify transfer audit trail
        var transferId = transferResult["transfer_id"].ToString();
        var auditResponse = await _client.GetAsync($"/api/privacy/transfer-audit?transferId={transferId}");
        var auditContent = await auditResponse.Content.ReadAsStringAsync();
        var auditLog = JsonSerializer.Deserialize<Dictionary<string, object>>(auditContent);
        
        auditLog.Should().ContainKey("legal_basis");
        auditLog.Should().ContainKey("safeguards");
        auditLog.Should().ContainKey("data_categories");
    }

    #endregion

    #region Privacy by Design Tests

    [Fact]
    public async Task Privacy_ShouldImplementDataMinimization()
    {
        // Arrange - User analytics collection
        var userId = await CreateUserWithConsent();
        
        // Act - Collect analytics data with various detail levels
        var detailedData = new
        {
            userId = userId,
            eventType = "detailed_event",
            timestamp = DateTime.UtcNow,
            sessionId = _testSessionId,
            fullUserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            fullIPAddress = "192.168.1.100",
            preciseLocation = new { lat = 51.5074, lng = -0.1278, accuracy = 1 },
            deviceFingerprint = "detailed_fingerprint_12345"
        };

        var response = await _client.PostAsJsonAsync("/api/analytics/event", detailedData);
        response.Should().HaveStatusCode(System.Net.HttpStatusCode.OK);

        // Act - Retrieve processed data to verify minimization
        var processedDataResponse = await _client.GetAsync($"/api/analytics/user-data?userId={userId}");
        var processedContent = await processedDataResponse.Content.ReadAsStringAsync();
        var processedData = JsonSerializer.Deserialize<Dictionary<string, object>>(processedContent);

        // Assert - Data should be minimized appropriately
        processedData.Should().ContainKey("events");
        var events = JsonSerializer.Deserialize<JsonElement[]>(
            ((JsonElement)processedData["events"]).GetRawText());
        
        var event1 = JsonSerializer.Deserialize<Dictionary<string, object>>(events[0].GetRawText());
        
        // IP should be anonymized
        if (event1.ContainsKey("ipAddress"))
        {
            event1["ipAddress"].ToString().Should().NotBe("192.168.1.100", 
                "IP address should be anonymized");
        }
        
        // User agent should be generalized
        if (event1.ContainsKey("browserInfo"))
        {
            var browserInfo = event1["browserInfo"].ToString();
            browserInfo.Should().NotContain("537.36", "User agent should be generalized");
        }
        
        // Location should be less precise
        if (event1.ContainsKey("location"))
        {
            var location = JsonSerializer.Deserialize<Dictionary<string, object>>(
                ((JsonElement)event1["location"]).GetRawText());
            var accuracy = ((JsonElement)location["accuracy"]).GetDouble();
            accuracy.Should().BeGreaterThan(1000, "Location accuracy should be reduced");
        }
    }

    [Fact]
    public async Task Privacy_ShouldImplementPurposeLimitation()
    {
        // Arrange - User with specific consent
        var userId = await CreateUserWithSpecificConsent(new[] { "analytics" }); // Only analytics consent
        
        // Act - Attempt to use data for different purposes
        var analyticsUse = new
        {
            userId = userId,
            purpose = "analytics",
            dataUsage = "performance_measurement"
        };
        
        var analyticsResponse = await _client.PostAsJsonAsync("/api/privacy/check-purpose", analyticsUse);
        
        var marketingUse = new
        {
            userId = userId,
            purpose = "marketing",
            dataUsage = "targeted_advertising"
        };
        
        var marketingResponse = await _client.PostAsJsonAsync("/api/privacy/check-purpose", marketingUse);

        // Assert - Purpose limitation should be enforced
        analyticsResponse.Should().HaveStatusCode(System.Net.HttpStatusCode.OK, 
            "Analytics use should be permitted");
        
        marketingResponse.Should().HaveStatusCode(System.Net.HttpStatusCode.Forbidden, 
            "Marketing use should be forbidden without consent");
        
        // Verify audit logging of purpose checks
        var auditResponse = await _client.GetAsync($"/api/privacy/purpose-audit?userId={userId}");
        var auditContent = await auditResponse.Content.ReadAsStringAsync();
        var auditLog = JsonSerializer.Deserialize<List<Dictionary<string, object>>>(auditContent);
        
        auditLog.Should().Contain(entry => 
            entry.ContainsKey("purpose") && 
            entry["purpose"].ToString() == "analytics" &&
            entry.ContainsKey("allowed") &&
            ((JsonElement)entry["allowed"]).GetBoolean() == true);
        
        auditLog.Should().Contain(entry => 
            entry.ContainsKey("purpose") && 
            entry["purpose"].ToString() == "marketing" &&
            entry.ContainsKey("allowed") &&
            ((JsonElement)entry["allowed"]).GetBoolean() == false);
    }

    #endregion

    #region Helper Methods

    private async Task<string> CreateUserWithConsent()
    {
        var userId = Guid.NewGuid().ToString();
        
        var consentData = new
        {
            userId = userId,
            consentTypes = new[] { "analytics", "personalization" },
            consentGiven = true,
            consentTimestamp = DateTime.UtcNow,
            consentVersion = "v2.1",
            region = "EU"
        };

        await _client.PostAsJsonAsync("/api/privacy/consent", consentData);
        return userId;
    }

    private async Task<string> CreateUserWithSpecificConsent(string[] consentTypes)
    {
        var userId = Guid.NewGuid().ToString();
        
        var consentData = new
        {
            userId = userId,
            consentTypes = consentTypes,
            consentGiven = true,
            consentTimestamp = DateTime.UtcNow,
            consentVersion = "v2.1"
        };

        await _client.PostAsJsonAsync("/api/privacy/consent", consentData);
        return userId;
    }

    private async Task<string> CreateUserWithRegion(string region)
    {
        var userId = Guid.NewGuid().ToString();
        
        var userData = new
        {
            userId = userId,
            region = region,
            consentTypes = new[] { "analytics" },
            consentGiven = true,
            consentTimestamp = DateTime.UtcNow
        };

        await _client.PostAsJsonAsync("/api/privacy/consent", userData);
        return userId;
    }

    private async Task CollectAnalyticsData(string userId, int eventCount)
    {
        var events = new List<object>();
        var random = new Random();
        
        for (int i = 0; i < eventCount; i++)
        {
            events.Add(new
            {
                userId = userId,
                eventType = $"event_type_{i % 5}",
                timestamp = DateTime.UtcNow.AddMinutes(-random.Next(0, 1440)),
                sessionId = _testSessionId,
                value = random.NextDouble() * 100
            });
        }

        await _client.PostAsJsonAsync("/api/analytics/events/batch", new { events });
    }

    private async Task CollectAttributionData(string userId)
    {
        var attributionData = new
        {
            userId = userId,
            touchpoints = new[]
            {
                new { channel = "organic_search", timestamp = DateTime.UtcNow.AddDays(-7) },
                new { channel = "social_media", timestamp = DateTime.UtcNow.AddDays(-3) },
                new { channel = "email", timestamp = DateTime.UtcNow.AddDays(-1) }
            },
            sessionId = _testSessionId
        };

        await _client.PostAsJsonAsync("/api/analytics/attribution", attributionData);
    }

    private async Task CollectBehavioralData(string userId)
    {
        var behavioralData = new
        {
            userId = userId,
            behaviors = new[]
            {
                new { action = "page_scroll", depth = 75, timestamp = DateTime.UtcNow.AddMinutes(-30) },
                new { action = "video_watch", duration = 120, timestamp = DateTime.UtcNow.AddMinutes(-15) },
                new { action = "form_interaction", fieldCount = 5, timestamp = DateTime.UtcNow.AddMinutes(-5) }
            },
            sessionId = _testSessionId
        };

        await _client.PostAsJsonAsync("/api/analytics/behavioral", behavioralData);
    }

    private async Task CollectPersonalizationData(string userId)
    {
        var personalizationData = new
        {
            userId = userId,
            preferences = new
            {
                contentTypes = new[] { "movies", "documentaries" },
                languages = new[] { "en", "es" },
                genres = new[] { "action", "comedy", "drama" }
            },
            sessionId = _testSessionId
        };

        await _client.PostAsJsonAsync("/api/analytics/personalization", personalizationData);
    }

    private async Task<int> GetUserAnalyticsDataCount(string userId)
    {
        try
        {
            var response = await _client.GetAsync($"/api/analytics/user-data-count?userId={userId}");
            var content = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<Dictionary<string, object>>(content);
            return ((JsonElement)result["count"]).GetInt32();
        }
        catch
        {
            return 0;
        }
    }

    private async Task<int> GetAnonymizedDataCount(string sessionId)
    {
        try
        {
            var response = await _client.GetAsync($"/api/analytics/anonymized-data-count?sessionId={sessionId}");
            var content = await response.Content.ReadAsStringAsync();
            var result = JsonSerializer.Deserialize<Dictionary<string, object>>(content);
            return ((JsonElement)result["count"]).GetInt32();
        }
        catch
        {
            return 0;
        }
    }

    private async Task<string> WaitForExportCompletion(string requestId, TimeSpan timeout)
    {
        var startTime = DateTime.UtcNow;
        
        while (DateTime.UtcNow - startTime < timeout)
        {
            var statusResponse = await _client.GetAsync($"/api/privacy/export-status?requestId={requestId}");
            var statusContent = await statusResponse.Content.ReadAsStringAsync();
            var status = JsonSerializer.Deserialize<Dictionary<string, object>>(statusContent);
            
            if (status.ContainsKey("status") && status["status"].ToString() == "completed")
            {
                var dataResponse = await _client.GetAsync($"/api/privacy/export-data?requestId={requestId}");
                return await dataResponse.Content.ReadAsStringAsync();
            }
            
            await Task.Delay(5000); // Wait 5 seconds
        }
        
        return null;
    }

    private async Task<bool> WaitForDeletionCompletion(string requestId, TimeSpan timeout)
    {
        var startTime = DateTime.UtcNow;
        
        while (DateTime.UtcNow - startTime < timeout)
        {
            var statusResponse = await _client.GetAsync($"/api/privacy/deletion-status?requestId={requestId}");
            var statusContent = await statusResponse.Content.ReadAsStringAsync();
            var status = JsonSerializer.Deserialize<Dictionary<string, object>>(statusContent);
            
            if (status.ContainsKey("status") && status["status"].ToString() == "completed")
            {
                return true;
            }
            
            await Task.Delay(3000); // Wait 3 seconds
        }
        
        return false;
    }

    private async Task<string> GetUserAnalyticsProfile(string userId)
    {
        var response = await _client.GetAsync($"/api/analytics/user-profile?userId={userId}");
        return await response.Content.ReadAsStringAsync();
    }

    #endregion

    public void Dispose()
    {
        _client?.Dispose();
    }
}