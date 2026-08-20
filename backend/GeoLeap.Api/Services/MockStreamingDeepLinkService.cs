using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services
{
    /// <summary>
    /// Mock implementation of IStreamingDeepLinkService for testing
    /// </summary>
    public class MockStreamingDeepLinkService : IStreamingDeepLinkService
    {
        private readonly ILogger<MockStreamingDeepLinkService> _logger;

        public MockStreamingDeepLinkService(ILogger<MockStreamingDeepLinkService> logger)
        {
            _logger = logger;
        }

        public Task<DeepLinkGenerationResponse> GenerateDeepLinkAsync(DeepLinkGenerationRequest request)
        {
            _logger.LogInformation("Mock: Generating deep link for {Service} - {ContentId}", 
                request.StreamingService, request.ContentId);

            // Validate required fields
            if (string.IsNullOrEmpty(request.StreamingService) || string.IsNullOrEmpty(request.ContentId))
            {
                return Task.FromResult(new DeepLinkGenerationResponse
                {
                    Success = false,
                    ErrorMessage = "StreamingService and ContentId are required"
                });
            }

            // Handle unavailable service case for testing
            if (request.StreamingService.Equals("unavailable-service", StringComparison.OrdinalIgnoreCase) ||
                request.Region?.Equals("INVALID_REGION", StringComparison.OrdinalIgnoreCase) == true)
            {
                return Task.FromResult(new DeepLinkGenerationResponse
                {
                    Success = false,
                    ErrorMessage = "Service temporarily unavailable or invalid region specified"
                });
            }

            var linkId = Guid.NewGuid().ToString();
            var trackingId = $"track_{DateTime.UtcNow.Ticks}";
            
            var deepLink = GenerateMockDeepLink(request);

            return Task.FromResult(new DeepLinkGenerationResponse
            {
                DeepLink = deepLink,
                LinkId = linkId,
                GeneratedAt = DateTime.UtcNow,
                TrackingId = trackingId,
                Success = true
            });
        }

        public Task<bool> TrackLinkClickAsync(LinkClickTrackingRequest request)
        {
            _logger.LogInformation("Mock: Tracking click for link {LinkId} by user {UserId}", 
                request.LinkId, request.UserId);

            // Simulate successful tracking unless data is malformed
            if (string.IsNullOrEmpty(request.LinkId))
            {
                return Task.FromResult(false);
            }

            return Task.FromResult(true);
        }

        public Task<bool> TrackLinkPerformanceAsync(LinkPerformanceTrackingRequest request)
        {
            _logger.LogInformation("Mock: Tracking performance for link {LinkId}, LoadTime: {LoadTime}ms", 
                request.LinkId, request.LoadTime);

            if (string.IsNullOrEmpty(request.LinkId))
            {
                return Task.FromResult(false);
            }

            return Task.FromResult(true);
        }

        public Task<RegionalAvailabilityResponse> GetRegionalAvailabilityAsync(string region, string? content = null)
        {
            _logger.LogInformation("Mock: Getting availability for region {Region}, content {Content}", 
                region, content);

            var response = GetMockRegionalAvailability(region);
            return Task.FromResult(response);
        }

        public Task<bool> CheckVpnCompatibilityAsync(string vpnProvider, string streamingService, string region)
        {
            _logger.LogInformation("Mock: Checking compatibility: {VpnProvider} with {StreamingService} in {Region}",
                vpnProvider, streamingService, region);

            // Mock compatibility based on known combinations
            var compatibilityMap = new Dictionary<(string, string, string), bool>
            {
                [("nordvpn", "netflix", "us")] = true,
                [("expressvpn", "bbc iplayer", "uk")] = true,
                [("surfshark", "hulu", "us")] = true,
                [("cyberghost", "disney+", "ca")] = true
            };

            var key = (vpnProvider.ToLowerInvariant(), streamingService.ToLowerInvariant(), region.ToLowerInvariant());
            return Task.FromResult(compatibilityMap.GetValueOrDefault(key, false));
        }

        public Task<VpnServerRecommendationResponse> GetOptimalVpnServerAsync(VpnServerRecommendationRequest request)
        {
            _logger.LogInformation("Mock: Getting server recommendations for {StreamingService} via {VpnProvider}",
                request.StreamingService, request.VpnProvider);

            var recommendations = new List<ServerRecommendation>
            {
                new() { ServerName = $"{request.VpnProvider}-optimal-1", Location = "New York", Score = 95, Performance = "Excellent" },
                new() { ServerName = $"{request.VpnProvider}-optimal-2", Location = "Los Angeles", Score = 90, Performance = "Very Good" },
                new() { ServerName = $"{request.VpnProvider}-optimal-3", Location = "Chicago", Score = 85, Performance = "Good" }
            };

            return Task.FromResult(new VpnServerRecommendationResponse
            {
                Recommendations = recommendations,
                OptimalServer = recommendations.FirstOrDefault()?.ServerName ?? "default-server",
                Notes = $"Recommendations for {request.StreamingService} via {request.VpnProvider}"
            });
        }

        public Task<AnalyticsDataResponse> GetLinkAnalyticsAsync(string? dateRange = null, string? vpnProvider = null)
        {
            _logger.LogInformation("Mock: Getting analytics data for range {DateRange}, VPN {VpnProvider}", 
                dateRange, vpnProvider);

            return Task.FromResult(new AnalyticsDataResponse
            {
                TotalClicks = Random.Shared.Next(100, 1000),
                UniqueUsers = Random.Shared.Next(50, 500),
                ClicksByService = new Dictionary<string, int>
                {
                    ["netflix"] = Random.Shared.Next(50, 200),
                    ["disney"] = Random.Shared.Next(30, 150),
                    ["hbo"] = Random.Shared.Next(20, 100)
                },
                ClicksByVpnProvider = new Dictionary<string, int>
                {
                    ["nordvpn"] = Random.Shared.Next(40, 180),
                    ["expressvpn"] = Random.Shared.Next(30, 120),
                    ["surfshark"] = Random.Shared.Next(25, 100)
                },
                ClicksByRegion = new Dictionary<string, int>
                {
                    ["US"] = Random.Shared.Next(60, 250),
                    ["UK"] = Random.Shared.Next(30, 120),
                    ["CA"] = Random.Shared.Next(20, 80)
                },
                AverageLoadTime = Random.Shared.NextDouble() * 2000 + 500, // 500-2500ms
                SuccessRate = Random.Shared.NextDouble() * 0.3 + 0.7 // 70-100%
            });
        }

        public Task<object> GenerateAnalyticsReportAsync(AnalyticsReportRequest request)
        {
            _logger.LogInformation("Mock: Generating analytics report for period {Start} to {End}",
                request.DateRange.Start, request.DateRange.End);

            return Task.FromResult<object>(new
            {
                ReportId = Guid.NewGuid().ToString(),
                GeneratedAt = DateTime.UtcNow,
                Period = request.DateRange,
                Summary = new
                {
                    TotalClicks = Random.Shared.Next(1000, 5000),
                    UniqueUsers = Random.Shared.Next(500, 2000),
                    TopVpnProvider = "nordvpn",
                    TopStreamingService = "netflix",
                    TopRegion = "US"
                },
                Format = request.Format
            });
        }

        private string GenerateMockDeepLink(DeepLinkGenerationRequest request)
        {
            var baseUrls = new Dictionary<string, string>
            {
                ["netflix"] = "https://netflix.com/title",
                ["disney"] = "https://disneyplus.com/movie",
                ["hulu"] = "https://hulu.com/watch",
                ["hbo"] = "https://hbomax.com/urn:hbo:feature",
                ["prime"] = "https://amazon.com/gp/video/detail"
            };

            var baseUrl = baseUrls.GetValueOrDefault(request.StreamingService.ToLowerInvariant(), 
                "https://example.com/content");
            
            var queryParams = new List<string>();
            
            if (!string.IsNullOrEmpty(request.Region))
                queryParams.Add($"region={request.Region}");
            if (!string.IsNullOrEmpty(request.VpnProvider))
                queryParams.Add($"vpn={request.VpnProvider}");
            if (!string.IsNullOrEmpty(request.AffiliateId))
                queryParams.Add($"affiliate={request.AffiliateId}");
            if (!string.IsNullOrEmpty(request.Campaign))
                queryParams.Add($"campaign={request.Campaign}");

            var queryString = queryParams.Count > 0 ? "?" + string.Join("&", queryParams) : "";
            
            return $"{baseUrl}/{request.ContentId}{queryString}";
        }

        private RegionalAvailabilityResponse GetMockRegionalAvailability(string region)
        {
            var availabilityMap = new Dictionary<string, (string service, List<string> recommended)>
            {
                ["US"] = ("netflix", new List<string> { "nordvpn", "expressvpn" }),
                ["UK"] = ("bbc-iplayer", new List<string> { "expressvpn", "surfshark" }),
                ["CA"] = ("crave", new List<string> { "nordvpn", "cyberghost" }),
                ["AU"] = ("stan", new List<string> { "expressvpn", "surfshark" }),
                ["DE"] = ("joyn", new List<string> { "nordvpn", "cyberghost" })
            };

            var regionKey = region.ToUpperInvariant();
            if (!availabilityMap.TryGetValue(regionKey, out var data))
            {
                return new RegionalAvailabilityResponse
                {
                    Region = region,
                    IsAvailable = false,
                    AvailableServices = new List<StreamingServiceInfo>(),
                    RecommendedVpnProviders = new List<string>()
                };
            }

            return new RegionalAvailabilityResponse
            {
                Region = region,
                IsAvailable = true,
                AvailableServices = new List<StreamingServiceInfo>
                {
                    new()
                    {
                        ServiceName = data.service,
                        IsAvailable = true,
                        PriceInfo = "$9.99/month",
                        SupportedRegions = new List<string> { region }
                    }
                },
                RecommendedVpnProviders = data.recommended
            };
        }
    }
}