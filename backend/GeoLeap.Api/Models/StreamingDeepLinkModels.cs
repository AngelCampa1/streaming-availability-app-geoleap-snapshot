namespace GeoLeap.Api.Models
{
    /// <summary>
    /// Deep link generation request model
    /// </summary>
    public class DeepLinkGenerationRequest
    {
        public string StreamingService { get; set; } = string.Empty;
        public string ContentId { get; set; } = string.Empty;
        public string? Region { get; set; }
        public string? VpnProvider { get; set; }
        public string? UserId { get; set; }
        public string? AffiliateId { get; set; }
        public string? Campaign { get; set; }
        public string? Medium { get; set; }
        public string? Source { get; set; }
        public Dictionary<string, string>? CustomParameters { get; set; }
    }

    /// <summary>
    /// Deep link generation response model
    /// </summary>
    public class DeepLinkGenerationResponse
    {
        public string DeepLink { get; set; } = string.Empty;
        public string LinkId { get; set; } = string.Empty;
        public DateTime GeneratedAt { get; set; }
        public string TrackingId { get; set; } = string.Empty;
        public bool Success { get; set; }
        public string? ErrorMessage { get; set; }
    }

    /// <summary>
    /// Link click tracking request model
    /// </summary>
    public class LinkClickTrackingRequest
    {
        public string LinkId { get; set; } = string.Empty;
        public string? UserId { get; set; }
        public string? VpnProvider { get; set; }
        public string? StreamingService { get; set; }
        public string? ContentId { get; set; }
        public string? UserAgent { get; set; }
        public string? IpAddress { get; set; }
        public string? Region { get; set; }
        public DateTime Timestamp { get; set; }
    }

    /// <summary>
    /// Link performance tracking request model
    /// </summary>
    public class LinkPerformanceTrackingRequest
    {
        public string LinkId { get; set; } = string.Empty;
        public int LoadTime { get; set; }
        public int RedirectCount { get; set; }
        public string? FinalUrl { get; set; }
        public bool SuccessfulRedirect { get; set; }
        public string? ErrorCode { get; set; }
        public string? VpnProvider { get; set; }
        public string? StreamingService { get; set; }
        public string? UserRegion { get; set; }
        public DateTime Timestamp { get; set; }
    }

    /// <summary>
    /// Regional availability response model
    /// </summary>
    public class RegionalAvailabilityResponse
    {
        public string Region { get; set; } = string.Empty;
        public List<StreamingServiceInfo> AvailableServices { get; set; } = new();
        public bool IsAvailable { get; set; }
        public List<string> RecommendedVpnProviders { get; set; } = new();
    }

    /// <summary>
    /// Streaming service information
    /// </summary>
    public class StreamingServiceInfo
    {
        public string ServiceId { get; set; } = string.Empty;
        public string ServiceName { get; set; } = string.Empty;
        public bool IsAvailable { get; set; }
        public string? PriceInfo { get; set; }
        public List<string> SupportedRegions { get; set; } = new();
        public List<string> AudioLanguages { get; set; } = new();
        public List<string> SubtitleLanguages { get; set; } = new();
    }

    /// <summary>
    /// VPN server recommendation request
    /// </summary>
    public class VpnServerRecommendationRequest
    {
        public string StreamingService { get; set; } = string.Empty;
        public string? VpnProvider { get; set; }
        public string? UserRegion { get; set; }
        public string? TargetRegion { get; set; }
    }

    /// <summary>
    /// VPN server recommendation response
    /// </summary>
    public class VpnServerRecommendationResponse
    {
        public List<ServerRecommendation> Recommendations { get; set; } = new();
        public string OptimalServer { get; set; } = string.Empty;
        public string? Notes { get; set; }
    }

    /// <summary>
    /// Server recommendation details
    /// </summary>
    public class ServerRecommendation
    {
        public string ServerName { get; set; } = string.Empty;
        public string Location { get; set; } = string.Empty;
        public int Score { get; set; }
        public string? Performance { get; set; }
    }

    /// <summary>
    /// Analytics report generation request
    /// </summary>
    public class AnalyticsReportRequest
    {
        public DateRange DateRange { get; set; } = new();
        public AnalyticsFilters? Filters { get; set; }
        public string Format { get; set; } = "json";
    }


    /// <summary>
    /// Analytics filters
    /// </summary>
    public class AnalyticsFilters
    {
        public List<string>? VpnProviders { get; set; }
        public List<string>? StreamingServices { get; set; }
        public List<string>? Regions { get; set; }
    }

    /// <summary>
    /// Analytics data response
    /// </summary>
    public class AnalyticsDataResponse
    {
        public int TotalClicks { get; set; }
        public int UniqueUsers { get; set; }
        public Dictionary<string, int> ClicksByService { get; set; } = new();
        public Dictionary<string, int> ClicksByVpnProvider { get; set; } = new();
        public Dictionary<string, int> ClicksByRegion { get; set; } = new();
        public double AverageLoadTime { get; set; }
        public double SuccessRate { get; set; }
    }
}