using System.Net;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service for detecting user's geographic location
/// Used for auto-detecting user's country in VPN streaming availability feature
/// </summary>
public interface IGeoLocationService
{
    /// <summary>
    /// Get country code from IP address using geolocation API
    /// </summary>
    Task<string?> GetCountryFromIPAsync(IPAddress? ipAddress, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get country code from HTTP request headers (e.g., CloudFlare CF-IPCountry)
    /// </summary>
    string? GetCountryFromHeaders(HttpRequest request);

    /// <summary>
    /// Get country name from country code
    /// </summary>
    string GetCountryName(string countryCode);

    /// <summary>
    /// Get detailed location information from IP address
    /// </summary>
    Task<LocationInfo?> GetLocationInfoAsync(IPAddress? ipAddress, CancellationToken cancellationToken = default);
}

/// <summary>
/// Detailed location information
/// </summary>
public class LocationInfo
{
    public string CountryCode { get; set; } = string.Empty;
    public string CountryName { get; set; } = string.Empty;
    public string? City { get; set; }
    public string? Region { get; set; }
    public string? PostalCode { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public string? Timezone { get; set; }
    public string DetectionMethod { get; set; } = string.Empty;
}
