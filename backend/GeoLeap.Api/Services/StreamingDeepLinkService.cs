using GeoLeap.Api.Models;
using Microsoft.Extensions.Logging;

namespace GeoLeap.Api.Services
{
    /// <summary>
    /// Service for streaming deep link generation and tracking
    /// </summary>
    public class StreamingDeepLinkService : IStreamingDeepLinkService
    {
        private readonly ILogger<StreamingDeepLinkService> _logger;

        public StreamingDeepLinkService(ILogger<StreamingDeepLinkService> logger)
        {
            _logger = logger;
        }

        public async Task<DeepLinkGenerationResponse> GenerateDeepLinkAsync(DeepLinkGenerationRequest request)
        {
            _logger.LogInformation("Generating deep link for {Service} - {ContentId}", request.StreamingService, request.ContentId);

            // Validate input
            if (string.IsNullOrEmpty(request.StreamingService))
            {
                return new DeepLinkGenerationResponse
                {
                    Success = false,
                    ErrorMessage = "Streaming service is required"
                };
            }

            if (string.IsNullOrEmpty(request.ContentId))
            {
                return new DeepLinkGenerationResponse
                {
                    Success = false,
                    ErrorMessage = "Content ID is required"
                };
            }

            try
            {
                // Generate link ID and tracking ID
                var linkId = Guid.NewGuid().ToString();
                var trackingId = $"track_{linkId[..8]}";

                // Build base deep link based on streaming service
                var baseUrl = GetStreamingServiceBaseUrl(request.StreamingService);
                if (string.IsNullOrEmpty(baseUrl))
                {
                    return new DeepLinkGenerationResponse
                    {
                        Success = false,
                        ErrorMessage = $"Unsupported streaming service: {request.StreamingService}"
                    };
                }

                // Construct deep link with tracking parameters
                var deepLink = BuildDeepLink(baseUrl, request, linkId, trackingId);

                return new DeepLinkGenerationResponse
                {
                    DeepLink = deepLink,
                    LinkId = linkId,
                    TrackingId = trackingId,
                    GeneratedAt = DateTime.UtcNow,
                    Success = true
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating deep link for {Service}", request.StreamingService);
                return new DeepLinkGenerationResponse
                {
                    Success = false,
                    ErrorMessage = "Internal server error during link generation"
                };
            }
        }

        public async Task<bool> TrackLinkClickAsync(LinkClickTrackingRequest request)
        {
            _logger.LogInformation("Tracking click for link {LinkId} by user {UserId}", request.LinkId, request.UserId);
            
            try
            {
                // In a real implementation, this would save to database
                // For now, just return success for valid requests
                return !string.IsNullOrEmpty(request.LinkId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error tracking click for link {LinkId}", request.LinkId);
                return false;
            }
        }

        public async Task<bool> TrackLinkPerformanceAsync(LinkPerformanceTrackingRequest request)
        {
            _logger.LogInformation("Tracking performance for link {LinkId}", request.LinkId);
            
            try
            {
                // In a real implementation, this would save performance metrics to database
                return !string.IsNullOrEmpty(request.LinkId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error tracking performance for link {LinkId}", request.LinkId);
                return false;
            }
        }

        public async Task<RegionalAvailabilityResponse> GetRegionalAvailabilityAsync(string region, string? content = null)
        {
            _logger.LogInformation("Getting regional availability for {Region}", region);

            var response = new RegionalAvailabilityResponse
            {
                Region = region,
                IsAvailable = true
            };

            // Mock data based on region
            switch (region.ToUpper())
            {
                case "US":
                    response.AvailableServices.Add(new StreamingServiceInfo { ServiceName = "netflix", IsAvailable = true });
                    response.RecommendedVpnProviders.AddRange(new[] { "nordvpn", "expressvpn" });
                    break;
                case "UK":
                    response.AvailableServices.Add(new StreamingServiceInfo { ServiceName = "bbc-iplayer", IsAvailable = true });
                    response.RecommendedVpnProviders.AddRange(new[] { "surfshark", "cyberghost" });
                    break;
                case "CA":
                    response.AvailableServices.Add(new StreamingServiceInfo { ServiceName = "crave", IsAvailable = true });
                    response.RecommendedVpnProviders.AddRange(new[] { "nordvpn", "expressvpn" });
                    break;
                case "AU":
                    response.AvailableServices.Add(new StreamingServiceInfo { ServiceName = "stan", IsAvailable = true });
                    response.RecommendedVpnProviders.AddRange(new[] { "surfshark", "cyberghost" });
                    break;
                case "DE":
                    response.AvailableServices.Add(new StreamingServiceInfo { ServiceName = "joyn", IsAvailable = true });
                    response.RecommendedVpnProviders.AddRange(new[] { "nordvpn", "surfshark" });
                    break;
                default:
                    response.IsAvailable = false;
                    break;
            }

            return response;
        }

        public async Task<bool> CheckVpnCompatibilityAsync(string vpnProvider, string streamingService, string region)
        {
            _logger.LogInformation("Checking VPN compatibility: {VpnProvider} with {StreamingService} in {Region}", 
                vpnProvider, streamingService, region);

            // Mock compatibility data
            var compatibleCombinations = new Dictionary<string, List<string>>
            {
                ["nordvpn"] = new() { "netflix", "disney", "hbo", "prime" },
                ["expressvpn"] = new() { "netflix", "disney", "hbo", "prime", "bbc-iplayer" },
                ["surfshark"] = new() { "netflix", "disney", "stan", "joyn" },
                ["cyberghost"] = new() { "prime", "hbo", "stan" }
            };

            return compatibleCombinations.ContainsKey(vpnProvider.ToLower()) &&
                   compatibleCombinations[vpnProvider.ToLower()].Contains(streamingService.ToLower());
        }

        public async Task<VpnServerRecommendationResponse> GetOptimalVpnServerAsync(VpnServerRecommendationRequest request)
        {
            _logger.LogInformation("Getting optimal VPN server for {StreamingService} via {VpnProvider}", 
                request.StreamingService, request.VpnProvider);

            var response = new VpnServerRecommendationResponse
            {
                OptimalServer = $"{request.VpnProvider}-{request.TargetRegion ?? "US"}-001",
                Notes = "Optimized for streaming performance"
            };

            // Mock server recommendations
            response.Recommendations.AddRange(new[]
            {
                new ServerRecommendation { ServerName = "US-East-01", Location = "New York", Score = 95, Performance = "Excellent" },
                new ServerRecommendation { ServerName = "US-West-02", Location = "Los Angeles", Score = 92, Performance = "Excellent" },
                new ServerRecommendation { ServerName = "UK-London-01", Location = "London", Score = 88, Performance = "Good" }
            });

            return response;
        }

        public async Task<AnalyticsDataResponse> GetLinkAnalyticsAsync(string? dateRange = null, string? vpnProvider = null)
        {
            _logger.LogInformation("Getting link analytics for date range {DateRange}, VPN provider {VpnProvider}", 
                dateRange, vpnProvider);

            // Mock analytics data
            return new AnalyticsDataResponse
            {
                TotalClicks = 1542,
                UniqueUsers = 891,
                AverageLoadTime = 1.34,
                SuccessRate = 0.96,
                ClicksByService = new Dictionary<string, int>
                {
                    ["netflix"] = 654,
                    ["disney"] = 432,
                    ["hbo"] = 289,
                    ["prime"] = 167
                },
                ClicksByVpnProvider = new Dictionary<string, int>
                {
                    ["nordvpn"] = 501,
                    ["expressvpn"] = 389,
                    ["surfshark"] = 342,
                    ["cyberghost"] = 310
                },
                ClicksByRegion = new Dictionary<string, int>
                {
                    ["US"] = 789,
                    ["UK"] = 321,
                    ["CA"] = 234,
                    ["AU"] = 198
                }
            };
        }

        public async Task<object> GenerateAnalyticsReportAsync(AnalyticsReportRequest request)
        {
            _logger.LogInformation("Generating analytics report for period {Start} to {End}", 
                request.DateRange.Start, request.DateRange.End);

            // Mock report data
            return new
            {
                ReportId = Guid.NewGuid().ToString(),
                GeneratedAt = DateTime.UtcNow,
                Period = new { request.DateRange.Start, request.DateRange.End },
                Summary = new
                {
                    TotalClicks = 2456,
                    UniqueUsers = 1123,
                    ConversionRate = 0.23,
                    Revenue = 15432.50
                },
                TopPerformers = new
                {
                    StreamingService = "netflix",
                    VpnProvider = "nordvpn",
                    Region = "US"
                }
            };
        }

        private string? GetStreamingServiceBaseUrl(string service)
        {
            return service.ToLower() switch
            {
                "netflix" => "https://www.netflix.com",
                "disney" => "https://www.disneyplus.com",
                "hbo" => "https://www.hbomax.com",
                "prime" => "https://www.amazon.com/prime",
                "hulu" => "https://www.hulu.com",
                "bbc-iplayer" => "https://www.bbc.co.uk/iplayer",
                "crave" => "https://www.crave.ca",
                "stan" => "https://www.stan.com.au",
                "joyn" => "https://www.joyn.de",
                _ => null
            };
        }

        private string BuildDeepLink(string baseUrl, DeepLinkGenerationRequest request, string linkId, string trackingId)
        {
            var uri = new UriBuilder(baseUrl);
            var query = System.Web.HttpUtility.ParseQueryString(uri.Query);

            // Add tracking parameters
            query["link_id"] = linkId;
            query["tracking_id"] = trackingId;
            
            if (!string.IsNullOrEmpty(request.AffiliateId))
                query["affiliate"] = request.AffiliateId;
            
            if (!string.IsNullOrEmpty(request.VpnProvider))
                query["vpn"] = request.VpnProvider;
            
            if (!string.IsNullOrEmpty(request.Campaign))
                query["utm_campaign"] = request.Campaign;
            
            if (!string.IsNullOrEmpty(request.Source))
                query["utm_source"] = request.Source;
            
            if (!string.IsNullOrEmpty(request.Medium))
                query["utm_medium"] = request.Medium;

            // Add custom parameters
            if (request.CustomParameters != null)
            {
                foreach (var param in request.CustomParameters)
                {
                    query[param.Key] = param.Value;
                }
            }

            uri.Query = query.ToString();
            return uri.ToString();
        }
    }
}