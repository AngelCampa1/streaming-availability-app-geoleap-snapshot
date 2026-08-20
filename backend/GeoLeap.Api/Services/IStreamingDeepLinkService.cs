using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services
{
    /// <summary>
    /// Service interface for streaming deep link generation and tracking
    /// </summary>
    public interface IStreamingDeepLinkService
    {
        /// <summary>
        /// Generate a deep link for streaming content with VPN provider integration
        /// </summary>
        Task<DeepLinkGenerationResponse> GenerateDeepLinkAsync(DeepLinkGenerationRequest request);

        /// <summary>
        /// Track link click analytics
        /// </summary>
        Task<bool> TrackLinkClickAsync(LinkClickTrackingRequest request);

        /// <summary>
        /// Track link performance metrics
        /// </summary>
        Task<bool> TrackLinkPerformanceAsync(LinkPerformanceTrackingRequest request);

        /// <summary>
        /// Get regional availability for streaming services
        /// </summary>
        Task<RegionalAvailabilityResponse> GetRegionalAvailabilityAsync(string region, string? content = null);

        /// <summary>
        /// Check VPN provider compatibility with streaming service
        /// </summary>
        Task<bool> CheckVpnCompatibilityAsync(string vpnProvider, string streamingService, string region);

        /// <summary>
        /// Get optimal VPN server recommendations for streaming
        /// </summary>
        Task<VpnServerRecommendationResponse> GetOptimalVpnServerAsync(VpnServerRecommendationRequest request);

        /// <summary>
        /// Get link analytics data
        /// </summary>
        Task<AnalyticsDataResponse> GetLinkAnalyticsAsync(string? dateRange = null, string? vpnProvider = null);

        /// <summary>
        /// Generate analytics report
        /// </summary>
        Task<object> GenerateAnalyticsReportAsync(AnalyticsReportRequest request);
    }
}