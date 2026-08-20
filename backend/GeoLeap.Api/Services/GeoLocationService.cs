using System.Net;
using MaxMind.GeoIP2;
using MaxMind.GeoIP2.Exceptions;

namespace GeoLeap.Api.Services;

/// <summary>
/// Implementation of geolocation service using MaxMind GeoLite2 database
/// No rate limits, local lookups, commercial-use friendly
/// </summary>
public class GeoLocationService : IGeoLocationService
{
    private readonly DatabaseReader? _databaseReader;
    private readonly ILogger<GeoLocationService> _logger;
    private readonly Dictionary<string, string> _countryNames;

    public GeoLocationService(
        DatabaseReader? databaseReader,
        ILogger<GeoLocationService> logger)
    {
        _databaseReader = databaseReader;
        _logger = logger;
        _countryNames = InitializeCountryNames();

        if (_databaseReader == null)
        {
            _logger.LogWarning("MaxMind database not available. Geolocation will default to 'us'");
        }
    }

    public Task<string?> GetCountryFromIPAsync(
        IPAddress? ipAddress,
        CancellationToken cancellationToken = default)
    {
        // MaxMind lookups are synchronous and fast, but we keep async signature for interface compatibility
        return Task.FromResult(GetCountryFromIP(ipAddress));
    }

    private string? GetCountryFromIP(IPAddress? ipAddress)
    {
        if (ipAddress == null || IPAddress.IsLoopback(ipAddress))
        {
            _logger.LogDebug("Invalid or loopback IP address provided");
            return "us"; // Default to US for local development
        }

        // Handle IPv6 loopback
        if (ipAddress.Equals(IPAddress.IPv6Loopback))
        {
            return "us";
        }

        // Handle private IPs
        if (IsPrivateIP(ipAddress))
        {
            _logger.LogDebug("Private IP address detected: {IpAddress}", ipAddress);
            return "us";
        }

        if (_databaseReader == null)
        {
            _logger.LogWarning("MaxMind database not available, defaulting to 'us'");
            return "us";
        }

        try
        {
            var response = _databaseReader.Country(ipAddress);
            var countryCode = response.Country.IsoCode?.ToLowerInvariant();

            if (!string.IsNullOrEmpty(countryCode))
            {
                _logger.LogInformation("Detected country {CountryCode} for IP {IpAddress}",
                    countryCode, ipAddress);
                return countryCode;
            }

            _logger.LogWarning("No country code found for IP {IpAddress}", ipAddress);
            return "us";
        }
        catch (AddressNotFoundException)
        {
            _logger.LogDebug("IP address not found in MaxMind database: {IpAddress}", ipAddress);
            return "us";
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error detecting country from IP {IpAddress}", ipAddress);
            return "us";
        }
    }

    public string? GetCountryFromHeaders(HttpRequest request)
    {
        try
        {
            // Check CloudFlare header (still useful if behind CDN in future)
            if (request.Headers.TryGetValue("CF-IPCountry", out var cfCountry))
            {
                var countryCode = cfCountry.ToString().ToLowerInvariant();
                if (!string.IsNullOrEmpty(countryCode) && countryCode != "xx")
                {
                    _logger.LogDebug("Detected country {CountryCode} from CloudFlare header", countryCode);
                    return countryCode;
                }
            }

            // Check other common headers
            if (request.Headers.TryGetValue("X-Country-Code", out var xCountry))
            {
                var countryCode = xCountry.ToString().ToLowerInvariant();
                if (!string.IsNullOrEmpty(countryCode))
                {
                    _logger.LogDebug("Detected country {CountryCode} from X-Country-Code header", countryCode);
                    return countryCode;
                }
            }

            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error reading country from headers");
            return null;
        }
    }

    public string GetCountryName(string countryCode)
    {
        var code = countryCode.ToLowerInvariant();
        return _countryNames.TryGetValue(code, out var name) ? name : countryCode.ToUpperInvariant();
    }

    public Task<LocationInfo?> GetLocationInfoAsync(
        IPAddress? ipAddress,
        CancellationToken cancellationToken = default)
    {
        if (ipAddress == null || IPAddress.IsLoopback(ipAddress) || IsPrivateIP(ipAddress))
        {
            return Task.FromResult<LocationInfo?>(new LocationInfo
            {
                CountryCode = "us",
                CountryName = "United States",
                DetectionMethod = "default"
            });
        }

        if (_databaseReader == null)
        {
            return Task.FromResult<LocationInfo?>(new LocationInfo
            {
                CountryCode = "us",
                CountryName = "United States",
                DetectionMethod = "fallback"
            });
        }

        try
        {
            var response = _databaseReader.Country(ipAddress);
            var countryCode = response.Country.IsoCode?.ToLowerInvariant() ?? "us";

            return Task.FromResult<LocationInfo?>(new LocationInfo
            {
                CountryCode = countryCode,
                CountryName = response.Country.Name ?? GetCountryName(countryCode),
                DetectionMethod = "maxmind"
            });
        }
        catch (AddressNotFoundException)
        {
            return Task.FromResult<LocationInfo?>(new LocationInfo
            {
                CountryCode = "us",
                CountryName = "United States",
                DetectionMethod = "not-found"
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting location info for IP {IpAddress}", ipAddress);
            return Task.FromResult<LocationInfo?>(null);
        }
    }

    private static bool IsPrivateIP(IPAddress ipAddress)
    {
        byte[] bytes = ipAddress.GetAddressBytes();

        if (ipAddress.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork)
        {
            // 10.0.0.0/8
            if (bytes[0] == 10) return true;
            // 172.16.0.0/12
            if (bytes[0] == 172 && bytes[1] >= 16 && bytes[1] <= 31) return true;
            // 192.168.0.0/16
            if (bytes[0] == 192 && bytes[1] == 168) return true;
            // 127.0.0.0/8 (loopback)
            if (bytes[0] == 127) return true;
        }

        return false;
    }

    private static Dictionary<string, string> InitializeCountryNames()
    {
        return new Dictionary<string, string>
        {
            { "us", "United States" },
            { "ca", "Canada" },
            { "gb", "United Kingdom" },
            { "au", "Australia" },
            { "de", "Germany" },
            { "fr", "France" },
            { "es", "Spain" },
            { "it", "Italy" },
            { "jp", "Japan" },
            { "kr", "South Korea" },
            { "cn", "China" },
            { "in", "India" },
            { "br", "Brazil" },
            { "mx", "Mexico" },
            { "nl", "Netherlands" },
            { "se", "Sweden" },
            { "no", "Norway" },
            { "dk", "Denmark" },
            { "fi", "Finland" },
            { "pl", "Poland" },
            { "ru", "Russia" },
            { "ar", "Argentina" },
            { "cl", "Chile" },
            { "co", "Colombia" },
            { "pe", "Peru" },
            { "nz", "New Zealand" },
            { "sg", "Singapore" },
            { "hk", "Hong Kong" },
            { "tw", "Taiwan" },
            { "th", "Thailand" },
            { "id", "Indonesia" },
            { "my", "Malaysia" },
            { "ph", "Philippines" },
            { "vn", "Vietnam" },
            { "za", "South Africa" },
            { "ng", "Nigeria" },
            { "eg", "Egypt" },
            { "il", "Israel" },
            { "tr", "Turkey" },
            { "sa", "Saudi Arabia" },
            { "ae", "United Arab Emirates" }
        };
    }
}
