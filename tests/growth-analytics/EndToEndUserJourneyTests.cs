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
using Microsoft.Playwright;

namespace GeoLeap.Api.Tests.GrowthAnalytics;

/// <summary>
/// End-to-End User Journey Testing Suite for Growth Analytics
/// Validates complete analytics workflows from event generation to dashboard visualization
/// Tests cross-platform tracking, user role permissions, and dashboard functionality
/// </summary>
public class EndToEndUserJourneyTests : IClassFixture<WebApplicationFactory<Program>>, IDisposable
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly HttpClient _client;
    private readonly string _testSessionId = Guid.NewGuid().ToString();
    private IBrowser? _browser;
    private IBrowserContext? _browserContext;
    private IPage? _page;

    public EndToEndUserJourneyTests(WebApplicationFactory<Program> factory)
    {
        _factory = factory;
        _client = _factory.CreateClient();
    }

    #region Complete Analytics Workflow Tests

    [Fact]
    public async Task E2E_ShouldTrackCompleteUserJourneyFromAwarenessToConversion()
    {
        // Arrange - Initialize browser for UI testing
        await InitializeBrowser();
        var userId = Guid.NewGuid().ToString();
        
        // Phase 1: Awareness - User discovers service through organic search
        var awarenessEvent = new
        {
            userId = userId,
            eventType = "awareness",
            touchpoint = new
            {
                channel = "organic_search",
                source = "google",
                keyword = "streaming vpn service",
                landingPage = "/home"
            },
            timestamp = DateTime.UtcNow.AddDays(-14),
            sessionId = _testSessionId
        };

        var awarenessResponse = await _client.PostAsJsonAsync("/api/analytics/user-journey/touchpoint", awarenessEvent);
        awarenessResponse.Should().HaveStatusCode(System.Net.HttpStatusCode.OK);

        // Phase 2: Interest - User explores features and pricing
        await SimulateBrowsingBehavior(userId, new[]
        {
            new { page = "/features", timeSpent = 120, scrollDepth = 80 },
            new { page = "/pricing", timeSpent = 90, scrollDepth = 100 },
            new { page = "/how-it-works", timeSpent = 150, scrollDepth = 70 }
        });

        // Phase 3: Consideration - User compares plans and reads reviews
        var considerationEvents = new[]
        {
            new { eventType = "plan_comparison", details = new { plansViewed = new[] { "basic", "premium", "family" } } },
            new { eventType = "review_read", details = new { reviewCount = 5, avgRating = 4.5 } },
            new { eventType = "social_proof_engagement", details = new { friendsUsingService = 3 } }
        };

        foreach (var evt in considerationEvents)
        {
            await RecordUserJourneyEvent(userId, evt.eventType, evt.details, DateTime.UtcNow.AddDays(-7));
        }

        // Phase 4: Intent - User starts signup process
        await _page.GotoAsync($"{_factory.Server.BaseAddress}signup");
        await _page.FillAsync("[name='email']", "testuser@example.com");
        await _page.FillAsync("[name='password']", "SecurePassword123!");
        
        var intentEvent = new
        {
            userId = userId,
            eventType = "signup_initiated",
            formData = new { email = "testuser@example.com", planSelected = "premium" },
            timestamp = DateTime.UtcNow.AddDays(-2),
            sessionId = _testSessionId
        };
        
        await _client.PostAsJsonAsync("/api/analytics/user-journey/touchpoint", intentEvent);

        // Phase 5: Conversion - User completes purchase
        await _page.ClickAsync("[data-testid='submit-signup']");
        
        var conversionEvent = new
        {
            userId = userId,
            eventType = "conversion",
            conversionDetails = new
            {
                planPurchased = "premium",
                amount = 9.99,
                paymentMethod = "credit_card",
                conversionValue = 9.99
            },
            timestamp = DateTime.UtcNow,
            sessionId = _testSessionId
        };

        var conversionResponse = await _client.PostAsJsonAsync("/api/analytics/user-journey/touchpoint", conversionEvent);
        conversionResponse.Should().HaveStatusCode(System.Net.HttpStatusCode.OK);

        // Act - Get complete user journey analysis
        await Task.Delay(5000); // Allow processing time
        var journeyResponse = await _client.GetAsync($"/api/analytics/user-journey/complete?userId={userId}");
        var journeyContent = await journeyResponse.Content.ReadAsStringAsync();
        var journey = JsonSerializer.Deserialize<Dictionary<string, object>>(journeyContent);

        // Assert - Complete journey should be tracked accurately
        journey.Should().NotBeNull();
        journey.Should().ContainKey("touchpoints");
        journey.Should().ContainKey("journey_stages");
        journey.Should().ContainKey("attribution_analysis");
        journey.Should().ContainKey("conversion_metrics");

        var touchpoints = JsonSerializer.Deserialize<JsonElement[]>(
            ((JsonElement)journey["touchpoints"]).GetRawText());
        touchpoints.Length.Should().BeGreaterThan(5, "Should capture multiple touchpoints");

        // Verify journey stages
        var stages = JsonSerializer.Deserialize<Dictionary<string, object>>(
            ((JsonElement)journey["journey_stages"]).GetRawText());
        stages.Should().ContainKeys("awareness", "interest", "consideration", "intent", "conversion");

        // Verify attribution analysis
        var attribution = JsonSerializer.Deserialize<Dictionary<string, object>>(
            ((JsonElement)journey["attribution_analysis"]).GetRawText());
        attribution.Should().ContainKey("first_touch_channel");
        attribution.Should().ContainKey("last_touch_channel");
        attribution.Should().ContainKey("assisted_channels");
        
        attribution["first_touch_channel"].ToString().Should().Be("organic_search");
        
        // Verify conversion metrics
        var conversion = JsonSerializer.Deserialize<Dictionary<string, object>>(
            ((JsonElement)journey["conversion_metrics"]).GetRawText());
        conversion.Should().ContainKey("time_to_conversion");
        conversion.Should().ContainKey("touchpoint_count");
        conversion.Should().ContainKey("conversion_value");
        
        var conversionValue = ((JsonElement)conversion["conversion_value"]).GetDouble();
        conversionValue.Should().Be(9.99);
    }

    [Fact]
    public async Task E2E_ShouldTrackCrossPlatformUserJourney()
    {
        // Arrange - User journey across multiple platforms
        var userId = Guid.NewGuid().ToString();
        
        // Phase 1: Mobile app discovery
        var mobileDiscovery = new
        {
            userId = userId,
            eventType = "app_discovery",
            platform = "mobile_app",
            device = new { type = "smartphone", os = "iOS", model = "iPhone 14" },
            source = "app_store_search",
            timestamp = DateTime.UtcNow.AddDays(-10),
            sessionId = $"{_testSessionId}_mobile"
        };

        await _client.PostAsJsonAsync("/api/analytics/cross-platform/touchpoint", mobileDiscovery);

        // Phase 2: Desktop web research
        await InitializeBrowser();
        await _page.GotoAsync($"{_factory.Server.BaseAddress}features");
        
        var desktopResearch = new
        {
            userId = userId,
            eventType = "feature_research",
            platform = "web",
            device = new { type = "desktop", os = "Windows", browser = "Chrome" },
            pages_viewed = new[] { "/features", "/pricing", "/support" },
            session_duration = 450, // 7.5 minutes
            timestamp = DateTime.UtcNow.AddDays(-5),
            sessionId = $"{_testSessionId}_desktop"
        };

        await _client.PostAsJsonAsync("/api/analytics/cross-platform/touchpoint", desktopResearch);

        // Phase 3: Mobile web comparison
        var mobileWebComparison = new
        {
            userId = userId,
            eventType = "competitor_comparison",
            platform = "mobile_web",
            device = new { type = "smartphone", os = "Android", browser = "Chrome Mobile" },
            comparison_data = new
            {
                competitors_viewed = new[] { "ExpressVPN", "NordVPN", "Surfshark" },
                features_compared = new[] { "speed", "server_count", "price" },
                time_spent = 180
            },
            timestamp = DateTime.UtcNow.AddDays(-2),
            sessionId = $"{_testSessionId}_mobile_web"
        };

        await _client.PostAsJsonAsync("/api/analytics/cross-platform/touchpoint", mobileWebComparison);

        // Phase 4: Desktop conversion
        var desktopConversion = new
        {
            userId = userId,
            eventType = "subscription_purchase",
            platform = "web",
            device = new { type = "desktop", os = "Windows", browser = "Chrome" },
            purchase_details = new
            {
                plan = "annual_premium",
                amount = 79.99,
                payment_method = "credit_card",
                discount_applied = "WELCOME20"
            },
            timestamp = DateTime.UtcNow,
            sessionId = $"{_testSessionId}_desktop"
        };

        await _client.PostAsJsonAsync("/api/analytics/cross-platform/touchpoint", desktopConversion);

        // Act - Analyze cross-platform journey
        await Task.Delay(3000);
        var crossPlatformResponse = await _client.GetAsync(
            $"/api/analytics/cross-platform/journey?userId={userId}");
        var crossPlatformContent = await crossPlatformResponse.Content.ReadAsStringAsync();
        var crossPlatformJourney = JsonSerializer.Deserialize<Dictionary<string, object>>(crossPlatformContent);

        // Assert - Cross-platform tracking should be comprehensive
        crossPlatformJourney.Should().NotBeNull();
        crossPlatformJourney.Should().ContainKey("platform_transitions");
        crossPlatformJourney.Should().ContainKey("device_breakdown");
        crossPlatformJourney.Should().ContainKey("session_continuity");
        crossPlatformJourney.Should().ContainKey("cross_platform_attribution");

        // Verify platform transitions
        var transitions = JsonSerializer.Deserialize<JsonElement[]>(
            ((JsonElement)crossPlatformJourney["platform_transitions"]).GetRawText());
        transitions.Length.Should().Be(4, "Should track all platform transitions");

        // Verify device breakdown
        var deviceBreakdown = JsonSerializer.Deserialize<Dictionary<string, object>>(
            ((JsonElement)crossPlatformJourney["device_breakdown"]).GetRawText());
        deviceBreakdown.Should().ContainKeys("smartphone", "desktop");

        // Verify attribution across platforms
        var crossPlatformAttribution = JsonSerializer.Deserialize<Dictionary<string, object>>(
            ((JsonElement)crossPlatformJourney["cross_platform_attribution"]).GetRawText());
        crossPlatformAttribution.Should().ContainKey("first_platform");
        crossPlatformAttribution.Should().ContainKey("conversion_platform");
        crossPlatformAttribution.Should().ContainKey("assisted_platforms");
        
        crossPlatformAttribution["first_platform"].ToString().Should().Be("mobile_app");
        crossPlatformAttribution["conversion_platform"].ToString().Should().Be("web");
    }

    [Fact]
    public async Task E2E_ShouldValidateDashboardVisualization()
    {
        // Arrange - Populate test data for dashboard
        await SeedAnalyticsDashboardData();
        await InitializeBrowser();

        // Act - Navigate to analytics dashboard
        await _page.GotoAsync($"{_factory.Server.BaseAddress}admin/analytics");
        
        // Login as admin user
        await _page.FillAsync("[name='username']", "admin@example.com");
        await _page.FillAsync("[name='password']", "AdminPassword123!");
        await _page.ClickAsync("[type='submit']");
        
        // Wait for dashboard to load
        await _page.WaitForSelectorAsync("[data-testid='analytics-dashboard']", new() { Timeout = 10000 });

        // Assert - Dashboard elements should be visible and functional
        var dashboardTitle = await _page.TextContentAsync("h1");
        dashboardTitle.Should().Contain("Analytics Dashboard");

        // Verify key metrics are displayed
        await _page.WaitForSelectorAsync("[data-testid='total-users']");
        await _page.WaitForSelectorAsync("[data-testid='conversion-rate']");
        await _page.WaitForSelectorAsync("[data-testid='revenue-metrics']");
        
        var totalUsers = await _page.TextContentAsync("[data-testid='total-users']");
        totalUsers.Should().NotBeNullOrEmpty("Total users metric should be displayed");

        // Test interactive elements
        await _page.ClickAsync("[data-testid='date-range-selector']");
        await _page.ClickAsync("[data-value='30d']");
        
        // Wait for data refresh
        await _page.WaitForTimeoutAsync(2000);
        
        // Verify charts are rendered
        var userGrowthChart = await _page.IsVisibleAsync("[data-testid='user-growth-chart']");
        userGrowthChart.Should().BeTrue("User growth chart should be visible");
        
        var attributionChart = await _page.IsVisibleAsync("[data-testid='attribution-chart']");
        attributionChart.Should().BeTrue("Attribution chart should be visible");

        // Test data export functionality
        await _page.ClickAsync("[data-testid='export-data']");
        
        // Wait for download to start (in real scenario)
        await _page.WaitForTimeoutAsync(1000);
        
        // Verify real-time updates
        var lastUpdate = await _page.TextContentAsync("[data-testid='last-update']");
        lastUpdate.Should().NotBeNullOrEmpty("Last update timestamp should be shown");
    }

    #endregion

    #region User Role and Permission Tests

    [Fact]
    public async Task E2E_ShouldEnforceUserRolePermissions()
    {
        await InitializeBrowser();
        
        // Test 1: Admin access
        await TestAdminDashboardAccess();
        
        // Test 2: Manager access
        await TestManagerDashboardAccess();
        
        // Test 3: Analyst access
        await TestAnalystDashboardAccess();
        
        // Test 4: Regular user access (should be restricted)
        await TestRegularUserAccessRestrictions();
    }

    private async Task TestAdminDashboardAccess()
    {
        // Login as admin
        await _page.GotoAsync($"{_factory.Server.BaseAddress}login");
        await _page.FillAsync("[name='email']", "admin@geoleap.com");
        await _page.FillAsync("[name='password']", "AdminPassword123!");
        await _page.ClickAsync("[type='submit']");
        
        await _page.WaitForURLAsync("**/dashboard");
        
        // Navigate to analytics
        await _page.ClickAsync("[href='/admin/analytics']");
        await _page.WaitForSelectorAsync("[data-testid='admin-analytics-dashboard']");
        
        // Admin should see all analytics sections
        var sections = new[] { "user-analytics", "revenue-analytics", "performance-analytics", "user-management" };
        foreach (var section in sections)
        {
            var isVisible = await _page.IsVisibleAsync($"[data-testid='{section}']");
            isVisible.Should().BeTrue($"Admin should see {section} section");
        }
        
        // Admin should have export permissions
        var exportButton = await _page.IsVisibleAsync("[data-testid='export-all-data']");
        exportButton.Should().BeTrue("Admin should see export all data button");
    }

    private async Task TestManagerDashboardAccess()
    {
        // Logout and login as manager
        await _page.ClickAsync("[data-testid='logout']");
        await _page.WaitForURLAsync("**/login");
        
        await _page.FillAsync("[name='email']", "manager@geoleap.com");
        await _page.FillAsync("[name='password']", "ManagerPassword123!");
        await _page.ClickAsync("[type='submit']");
        
        await _page.GotoAsync($"{_factory.Server.BaseAddress}analytics");
        await _page.WaitForSelectorAsync("[data-testid='manager-analytics-dashboard']");
        
        // Manager should see business analytics but not user management
        var businessAnalytics = await _page.IsVisibleAsync("[data-testid='business-analytics']");
        businessAnalytics.Should().BeTrue("Manager should see business analytics");
        
        var userManagement = await _page.IsVisibleAsync("[data-testid='user-management']");
        userManagement.Should().BeFalse("Manager should not see user management section");
    }

    private async Task TestAnalystDashboardAccess()
    {
        // Logout and login as analyst
        await _page.ClickAsync("[data-testid='logout']");
        await _page.WaitForURLAsync("**/login");
        
        await _page.FillAsync("[name='email']", "analyst@geoleap.com");
        await _page.FillAsync("[name='password']", "AnalystPassword123!");
        await _page.ClickAsync("[type='submit']");
        
        await _page.GotoAsync($"{_factory.Server.BaseAddress}analytics");
        await _page.WaitForSelectorAsync("[data-testid='analyst-dashboard']");
        
        // Analyst should see read-only analytics
        var analyticsCharts = await _page.IsVisibleAsync("[data-testid='analytics-charts']");
        analyticsCharts.Should().BeTrue("Analyst should see analytics charts");
        
        // But no edit/delete capabilities
        var editButton = await _page.IsVisibleAsync("[data-testid='edit-analytics']");
        editButton.Should().BeFalse("Analyst should not see edit capabilities");
    }

    private async Task TestRegularUserAccessRestrictions()
    {
        // Logout and login as regular user
        await _page.ClickAsync("[data-testid='logout']");
        await _page.WaitForURLAsync("**/login");
        
        await _page.FillAsync("[name='email']", "user@example.com");
        await _page.FillAsync("[name='password']", "UserPassword123!");
        await _page.ClickAsync("[type='submit']");
        
        // Attempt to access analytics dashboard
        await _page.GotoAsync($"{_factory.Server.BaseAddress}analytics");
        
        // Should be redirected to unauthorized page or see access denied
        var currentUrl = _page.Url;
        currentUrl.Should().Contain("unauthorized");
        
        var accessDeniedMessage = await _page.IsVisibleAsync("[data-testid='access-denied']");
        accessDeniedMessage.Should().BeTrue("Regular users should see access denied message");
    }

    #endregion

    #region API Integration Tests

    [Fact]
    public async Task E2E_ShouldValidateAPIIntegrationForExternalConsumers()
    {
        // Arrange - External API consumer credentials
        var apiKey = await CreateAPIKey("external_partner", new[] { "analytics:read", "metrics:read" });
        _client.DefaultRequestHeaders.Add("X-API-Key", apiKey);

        // Act - Test various API endpoints external consumers would use
        var endpoints = new[]
        {
            "/api/v1/analytics/summary",
            "/api/v1/metrics/conversion-rates",
            "/api/v1/analytics/user-growth",
            "/api/v1/metrics/retention"
        };

        var responses = new List<(string endpoint, bool success, string content)>();
        
        foreach (var endpoint in endpoints)
        {
            var response = await _client.GetAsync(endpoint);
            var content = await response.Content.ReadAsStringAsync();
            responses.Add((endpoint, response.IsSuccessStatusCode, content));
        }

        // Assert - All endpoints should return valid data
        foreach (var (endpoint, success, content) in responses)
        {
            success.Should().BeTrue($"Endpoint {endpoint} should be accessible with API key");
            content.Should().NotBeNullOrEmpty($"Endpoint {endpoint} should return data");
            
            // Verify JSON structure
            var jsonData = JsonSerializer.Deserialize<Dictionary<string, object>>(content);
            jsonData.Should().NotBeNull($"Endpoint {endpoint} should return valid JSON");
            jsonData.Should().ContainKey("data", $"Endpoint {endpoint} should have data field");
            jsonData.Should().ContainKey("timestamp", $"Endpoint {endpoint} should have timestamp");
        }

        // Test rate limiting
        var rateLimitTest = await TestAPIRateLimit("/api/v1/analytics/summary");
        rateLimitTest.Should().BeTrue("API rate limiting should be properly enforced");

        // Test API key permissions
        var restrictedResponse = await _client.PostAsync("/api/v1/analytics/events", null);
        restrictedResponse.IsSuccessStatusCode.Should().BeFalse(
            "API key without write permissions should not be able to post events");
    }

    #endregion

    #region Helper Methods

    private async Task InitializeBrowser()
    {
        if (_browser != null) return;
        
        var playwright = await Playwright.CreateAsync();
        _browser = await playwright.Chromium.LaunchAsync(new() { Headless = true });
        _browserContext = await _browser.NewContextAsync();
        _page = await _browserContext.NewPageAsync();
    }

    private async Task SimulateBrowsingBehavior(string userId, object[] pages)
    {
        foreach (var page in pages)
        {
            var pageData = JsonSerializer.Deserialize<Dictionary<string, object>>(JsonSerializer.Serialize(page));
            
            var behaviorEvent = new
            {
                userId = userId,
                eventType = "page_view",
                page_url = pageData["page"].ToString(),
                time_spent = ((JsonElement)pageData["timeSpent"]).GetInt32(),
                scroll_depth = ((JsonElement)pageData["scrollDepth"]).GetInt32(),
                timestamp = DateTime.UtcNow.AddDays(-10 + Array.IndexOf(pages, page)),
                sessionId = _testSessionId
            };

            await _client.PostAsJsonAsync("/api/analytics/behavior/page-view", behaviorEvent);
        }
    }

    private async Task RecordUserJourneyEvent(string userId, string eventType, object details, DateTime timestamp)
    {
        var journeyEvent = new
        {
            userId = userId,
            eventType = eventType,
            eventDetails = details,
            timestamp = timestamp,
            sessionId = _testSessionId
        };

        await _client.PostAsJsonAsync("/api/analytics/user-journey/event", journeyEvent);
    }

    private async Task SeedAnalyticsDashboardData()
    {
        // Create sample users and events for dashboard testing
        var sampleData = new
        {
            users = 5000,
            conversions = 250,
            revenue = 12500.00,
            timeframe = "30d",
            sessionId = _testSessionId
        };

        await _client.PostAsJsonAsync("/api/test-data/seed-dashboard", sampleData);
        await Task.Delay(2000); // Allow processing time
    }

    private async Task<string> CreateAPIKey(string partner, string[] permissions)
    {
        var apiKeyRequest = new
        {
            partnerId = partner,
            permissions = permissions,
            expiresIn = "30d"
        };

        var response = await _client.PostAsJsonAsync("/api/admin/create-api-key", apiKeyRequest);
        var content = await response.Content.ReadAsStringAsync();
        var result = JsonSerializer.Deserialize<Dictionary<string, object>>(content);
        
        return result["apiKey"].ToString();
    }

    private async Task<bool> TestAPIRateLimit(string endpoint)
    {
        var startTime = DateTime.UtcNow;
        var requestCount = 0;
        var rateLimitHit = false;

        // Make rapid requests to test rate limiting
        while (DateTime.UtcNow - startTime < TimeSpan.FromSeconds(10) && !rateLimitHit)
        {
            var response = await _client.GetAsync(endpoint);
            requestCount++;
            
            if (response.StatusCode == System.Net.HttpStatusCode.TooManyRequests)
            {
                rateLimitHit = true;
            }
            
            await Task.Delay(50); // Small delay between requests
        }

        return rateLimitHit; // Rate limiting should be triggered
    }

    #endregion

    public void Dispose()
    {
        _page?.CloseAsync().Wait();
        _browserContext?.CloseAsync().Wait();
        _browser?.CloseAsync().Wait();
        _client?.Dispose();
    }
}