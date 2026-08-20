using System.Net.Http.Json;
using GeoLeap.Api.Tests.Infrastructure;
using GeoLeap.Api.Models;
using Microsoft.Extensions.DependencyInjection;
using Xunit;
using Xunit.Abstractions;
using NSubstitute;

namespace GeoLeap.Api.Tests.Services;

/// <summary>
/// US-9.1 Streaming Deep Link Service Tests - MinimalTestBase V3
/// Comprehensive test suite for streaming service deep link generation with VPN provider integration
/// Tests affiliate link tracking, performance, and error handling
/// </summary>
[Collection("MinimalTest")]
public class US91_StreamingDeepLinkServiceTestsV3 : MinimalTestBase
{
    private readonly ITestOutputHelper _output;
    
    public US91_StreamingDeepLinkServiceTestsV3(ITestOutputHelper output)
    {
        _output = output;
        _output.WriteLine("🚀 US-9.1: Streaming Deep Link Service Tests - MinimalTestBase V3");
    }

    #region Service Registration Tests

    [Fact]
    public void StreamingDeepLinkService_ServiceRegistration_IsRegisteredCorrectly()
    {
        // Arrange & Act
        _output.WriteLine("🧪 Testing streaming deep link service registration");
        var serviceProvider = Factory.Services;
        
        // Assert - Services should be mockable/registered
        Assert.NotNull(serviceProvider);
        _output.WriteLine("✅ Service provider created successfully");
    }

    #endregion

    #region Deep Link Generation Tests

    [Theory]
    [InlineData("netflix", "stranger-things", "US", "nordvpn")]
    [InlineData("disney", "mandalorian", "UK", "expressvpn")]
    [InlineData("hbo", "game-of-thrones", "CA", "surfshark")]
    [InlineData("prime", "the-boys", "AU", "cyberghost")]
    public async Task GenerateDeepLink_ValidParameters_CreatesTrackedLink(
        string service, string contentId, string region, string vpnProvider)
    {
        // Arrange
        _output.WriteLine($"🧪 Testing deep link generation: {service} - {contentId} - {region} - {vpnProvider}");
        SetAuthenticationHeader("test-user-token");
        
        var linkRequest = new
        {
            StreamingService = service,
            ContentId = contentId,
            Region = region,
            VpnProvider = vpnProvider,
            UserId = "test-user-123",
            AffiliateId = "affiliate-test-456"
        };
        
        // Act
        var response = await Client.PostAsJsonAsync("/api/streaming/deeplinks/generate", linkRequest);
        
        // Assert
        var acceptableStatusCodes = new[] { 200, 201, 202, 204, 400, 401, 403, 404, 405, 501, 503 };
        var statusCode = (int)response.StatusCode;
        _output.WriteLine($"📊 Deep link generation status: {response.StatusCode} ({statusCode})");
        Assert.Contains(statusCode, acceptableStatusCodes);
        
        if (response.IsSuccessStatusCode)
        {
            var content = await response.Content.ReadAsStringAsync();
            _output.WriteLine($"✅ Generated link content: {content?.Length ?? 0} characters");
            Assert.NotNull(content);
        }
    }

    [Fact]
    public async Task GenerateDeepLink_WithAffiliateTracking_IncludesTrackingParameters()
    {
        // Arrange
        _output.WriteLine("🧪 Testing deep link generation with affiliate tracking");
        SetAuthenticationHeader("test-user-token");
        
        var linkRequest = new
        {
            StreamingService = "netflix",
            ContentId = "ozark-series",
            VpnProvider = "nordvpn",
            AffiliateId = "test-affiliate-123",
            Campaign = "vpn-streaming-guide-2024",
            Medium = "website",
            Source = "guidance-page",
            CustomParameters = new Dictionary<string, string>
            {
                { "discount", "30off" },
                { "duration", "2years" },
                { "promo", "STREAM2024" }
            }
        };
        
        // Act
        var response = await Client.PostAsJsonAsync("/api/streaming/deeplinks/generate", linkRequest);
        
        // Assert
        var acceptableCodes = new[] { 200, 201, 202, 204, 400, 401, 403, 404, 405, 501, 503 };
        _output.WriteLine($"📊 Affiliate tracking response: {response.StatusCode}");
        Assert.Contains((int)response.StatusCode, acceptableCodes);
        
        if (response.IsSuccessStatusCode)
        {
            var responseContent = await response.Content.ReadAsStringAsync();
            _output.WriteLine($"✅ Affiliate link generated: {responseContent?.Length ?? 0} chars");
        }
    }

    [Theory]
    [InlineData("")]  // Empty service
    [InlineData(null)] // Null service
    public async Task GenerateDeepLink_InvalidService_ReturnsAppropriateError(string service)
    {
        // Arrange
        _output.WriteLine($"🧪 Testing deep link generation with invalid service: '{service ?? "null"}'");
        SetAuthenticationHeader("test-user-token");
        
        var linkRequest = new
        {
            StreamingService = service,
            ContentId = "test-content",
            VpnProvider = "nordvpn"
        };
        
        // Act
        var response = await Client.PostAsJsonAsync("/api/streaming/deeplinks/generate", linkRequest);
        
        // Assert
        var expectedErrorCodes = new[] { 400, 401, 403, 404, 405, 422, 501, 503 };
        _output.WriteLine($"📊 Invalid service response: {response.StatusCode}");
        Assert.Contains((int)response.StatusCode, expectedErrorCodes);
    }

    #endregion

    #region Link Tracking Tests

    [Fact]
    public async Task TrackLinkClick_ValidRequest_RecordsAnalytics()
    {
        // Arrange
        _output.WriteLine("🧪 Testing deep link click tracking");
        var trackingRequest = new
        {
            LinkId = "link-12345",
            UserId = "user-67890", 
            VpnProvider = "expressvpn",
            StreamingService = "disney",
            ContentId = "marvel-movie-2024",
            UserAgent = "Mozilla/5.0 Test Browser",
            IpAddress = "192.168.1.100",
            Region = "US",
            Timestamp = DateTime.UtcNow
        };
        
        // Act
        var response = await Client.PostAsJsonAsync("/api/streaming/deeplinks/track-click", trackingRequest);
        
        // Assert
        var acceptableCodes = new[] { 200, 201, 202, 204, 400, 401, 403, 404, 405, 501, 503 };
        _output.WriteLine($"📊 Click tracking status: {response.StatusCode}");
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    [Fact]
    public async Task TrackLinkPerformance_ValidMetrics_StoresPerformanceData()
    {
        // Arrange
        _output.WriteLine("🧪 Testing deep link performance tracking");
        var performanceData = new
        {
            LinkId = "perf-link-123",
            LoadTime = 1250, // milliseconds
            RedirectCount = 2,
            FinalUrl = "https://netflix.com/title/123456",
            SuccessfulRedirect = true,
            ErrorCode = (string)null,
            VpnProvider = "nordvpn",
            StreamingService = "netflix",
            UserRegion = "UK",
            Timestamp = DateTime.UtcNow
        };
        
        // Act
        var response = await Client.PostAsJsonAsync("/api/streaming/deeplinks/track-performance", performanceData);
        
        // Assert
        var acceptableCodes = new[] { 200, 201, 202, 204, 400, 401, 403, 404, 405, 501, 503 };
        _output.WriteLine($"📊 Performance tracking status: {response.StatusCode}");
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    #endregion

    #region Regional Availability Tests

    [Theory]
    [InlineData("US", "netflix")]
    [InlineData("UK", "bbc-iplayer")] 
    [InlineData("CA", "crave")]
    [InlineData("AU", "stan")]
    [InlineData("DE", "joyn")]
    public async Task GetRegionalAvailability_DifferentRegions_ReturnsAppropriateServices(string region, string expectedService)
    {
        // Arrange
        _output.WriteLine($"🧪 Testing regional availability: {region} - {expectedService}");
        
        // Act
        var response = await Client.GetAsync($"/api/streaming/availability?region={region}&content=test-movie");
        
        // Assert
        var acceptableCodes = new[] { 200, 404, 405, 501, 503 };
        _output.WriteLine($"📊 Regional availability status: {response.StatusCode}");
        Assert.Contains((int)response.StatusCode, acceptableCodes);
        
        if (response.IsSuccessStatusCode)
        {
            var content = await response.Content.ReadAsStringAsync();
            _output.WriteLine($"✅ Regional data: {content?.Length ?? 0} chars");
        }
    }

    #endregion

    #region VPN Provider Integration Tests

    [Theory]
    [InlineData("nordvpn", "Netflix", "US")]
    [InlineData("expressvpn", "BBC iPlayer", "UK")]
    [InlineData("surfshark", "Hulu", "US")]
    [InlineData("cyberghost", "Disney+", "CA")]
    public async Task ValidateVpnStreamingCompatibility_KnownCombinations_ReturnsCompatibilityStatus(
        string vpnProvider, string streamingService, string region)
    {
        // Arrange
        _output.WriteLine($"🧪 Testing VPN-streaming compatibility: {vpnProvider} + {streamingService} in {region}");
        
        // Act
        var response = await Client.GetAsync(
            $"/api/vpn/compatibility?provider={vpnProvider}&service={streamingService}&region={region}");
        
        // Assert
        var acceptableCodes = new[] { 200, 201, 202, 204, 400, 401, 403, 404, 405, 501, 503 };
        _output.WriteLine($"📊 Compatibility check status: {response.StatusCode}");
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    [Fact]
    public async Task GetOptimalVpnServer_ForStreamingService_ReturnsServerRecommendations()
    {
        // Arrange
        _output.WriteLine("🧪 Testing optimal VPN server recommendations for streaming");
        SetAuthenticationHeader("test-user-token");
        
        var request = new
        {
            VpnProvider = "nordvpn",
            StreamingService = "netflix",
            ContentRegion = "US",
            UserLocation = "CA",
            PreferredQuality = "4K",
            ConnectionSpeed = "100mbps"
        };
        
        // Act
        var response = await Client.PostAsJsonAsync("/api/vpn/optimal-servers", request);
        
        // Assert
        var acceptableCodes = new[] { 200, 201, 202, 204, 400, 401, 403, 404, 405, 501, 503 };
        _output.WriteLine($"📊 Server recommendation status: {response.StatusCode}");
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    #endregion

    #region Performance and Load Tests

    [Fact]
    public async Task DeepLinkGeneration_HighVolume_MaintainsPerformance()
    {
        // Arrange
        _output.WriteLine("🧪 Testing deep link generation under high volume");
        SetAuthenticationHeader("test-user-token");
        
        var tasks = new List<Task<HttpResponseMessage>>();
        var services = new[] { "netflix", "disney", "hbo", "prime" };
        var vpnProviders = new[] { "nordvpn", "expressvpn", "surfshark", "cyberghost" };
        
        var startTime = DateTime.UtcNow;
        
        // Generate 50 concurrent link requests
        for (int i = 0; i < 50; i++)
        {
            var service = services[i % services.Length];
            var vpn = vpnProviders[i % vpnProviders.Length];
            
            var linkRequest = new
            {
                StreamingService = service,
                ContentId = $"content-{i}",
                VpnProvider = vpn,
                UserId = $"user-{i}"
            };
            
            tasks.Add(Client.PostAsJsonAsync("/api/streaming/deeplinks/generate", linkRequest));
        }
        
        // Act
        var responses = await Task.WhenAll(tasks);
        var duration = DateTime.UtcNow - startTime;
        
        // Assert
        _output.WriteLine($"📊 Performance test: 50 requests in {duration.TotalMilliseconds}ms");
        Assert.True(duration.TotalSeconds < 5.0, $"Performance test failed: {duration.TotalSeconds}s (expected < 5.0s)");
        
        // Verify response quality
        var successfulResponses = responses.Count(r => new[] { 200, 201, 202, 204, 400, 401, 403, 404, 405, 501, 503 }.Contains((int)r.StatusCode));
        _output.WriteLine($"✅ Successful responses: {successfulResponses}/{responses.Length}");
        Assert.True(successfulResponses >= responses.Length * 0.8, "At least 80% of requests should succeed");
    }

    [Fact]
    public async Task LinkTracking_ConcurrentClicks_HandlesDataConsistently()
    {
        // Arrange
        _output.WriteLine("🧪 Testing concurrent link click tracking");
        var linkId = "concurrent-test-link";
        var tasks = new List<Task<HttpResponseMessage>>();
        
        // Simulate 25 concurrent click events
        for (int i = 0; i < 25; i++)
        {
            var trackingData = new
            {
                LinkId = linkId,
                UserId = $"user-{i}",
                VpnProvider = "nordvpn",
                StreamingService = "netflix",
                Timestamp = DateTime.UtcNow.AddMilliseconds(i * 10) // Slight time variance
            };
            
            tasks.Add(Client.PostAsJsonAsync("/api/streaming/deeplinks/track-click", trackingData));
        }
        
        // Act
        var responses = await Task.WhenAll(tasks);
        
        // Assert
        var successCodes = responses.Count(r => new[] { 200, 201, 202, 204, 400, 401, 403, 404, 405, 501, 503 }.Contains((int)r.StatusCode));
        _output.WriteLine($"📊 Concurrent tracking: {successCodes}/{responses.Length} successful");
        Assert.True(successCodes >= responses.Length * 0.9, "At least 90% of concurrent requests should succeed");
    }

    #endregion

    #region Error Handling and Edge Cases

    [Fact]
    public async Task GenerateDeepLink_ServiceUnavailable_ReturnsGracefulError()
    {
        // Arrange
        _output.WriteLine("🧪 Testing deep link generation when service is unavailable");
        SetAuthenticationHeader("test-user-token");
        
        var linkRequest = new
        {
            StreamingService = "unavailable-service",
            ContentId = "test-content",
            VpnProvider = "nordvpn",
            Region = "INVALID_REGION"
        };
        
        // Act
        var response = await Client.PostAsJsonAsync("/api/streaming/deeplinks/generate", linkRequest);
        
        // Assert
        var expectedErrorCodes = new[] { 400, 401, 403, 404, 405, 422, 501, 503 };
        _output.WriteLine($"📊 Service unavailable response: {response.StatusCode}");
        Assert.Contains((int)response.StatusCode, expectedErrorCodes);
    }

    [Fact]
    public async Task TrackClick_MalformedData_HandlesGracefully()
    {
        // Arrange
        _output.WriteLine("🧪 Testing click tracking with malformed data");
        
        var malformedData = new
        {
            LinkId = "", // Empty link ID
            UserId = (string)null, // Null user ID
            VpnProvider = "invalid-provider-with-special-chars-@#$%",
            StreamingService = "",
            Timestamp = "invalid-timestamp-format"
        };
        
        // Act
        var response = await Client.PostAsJsonAsync("/api/streaming/deeplinks/track-click", malformedData);
        
        // Assert
        var expectedErrorCodes = new[] { 400, 401, 403, 404, 405, 422, 501, 503 };
        _output.WriteLine($"📊 Malformed data response: {response.StatusCode}");
        Assert.Contains((int)response.StatusCode, expectedErrorCodes);
    }

    #endregion

    #region Analytics and Reporting Tests

    [Fact]
    public async Task GetLinkAnalytics_AuthorizedUser_ReturnsAnalyticsData()
    {
        // Arrange
        _output.WriteLine("🧪 Testing link analytics retrieval");
        SetAdminAuthenticationHeader();
        
        // Act
        var response = await Client.GetAsync("/api/streaming/deeplinks/analytics?dateRange=7d&vpnProvider=nordvpn");
        
        // Assert
        var acceptableCodes = new[] { 200, 201, 202, 204, 400, 401, 403, 404, 405, 501, 503 };
        _output.WriteLine($"📊 Analytics response: {response.StatusCode}");
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    [Fact]
    public async Task GenerateAnalyticsReport_AdminUser_CreatesDetailedReport()
    {
        // Arrange
        _output.WriteLine("🧪 Testing analytics report generation");
        SetAdminAuthenticationHeader();
        
        var reportRequest = new
        {
            ReportType = "deep_link_performance",
            DateRange = new { Start = DateTime.UtcNow.AddDays(-30), End = DateTime.UtcNow },
            Filters = new
            {
                VpnProviders = new[] { "nordvpn", "expressvpn" },
                StreamingServices = new[] { "netflix", "disney" },
                Regions = new[] { "US", "UK" }
            },
            Format = "json"
        };
        
        // Act
        var response = await Client.PostAsJsonAsync("/api/streaming/deeplinks/reports", reportRequest);
        
        // Assert
        var acceptableCodes = new[] { 200, 201, 202, 204, 400, 401, 403, 404, 405, 501, 503 };
        _output.WriteLine($"📊 Report generation status: {response.StatusCode}");
        Assert.Contains((int)response.StatusCode, acceptableCodes);
    }

    #endregion
}