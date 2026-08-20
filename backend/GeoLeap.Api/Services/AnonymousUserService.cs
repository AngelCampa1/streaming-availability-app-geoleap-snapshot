using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Http;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service for tracking anonymous users using localStorage ID and IP fingerprinting
/// </summary>
public interface IAnonymousUserService
{
    /// <summary>
    /// Get anonymous ID from request header (X-Anonymous-Id)
    /// </summary>
    string? GetAnonymousId(HttpContext context);

    /// <summary>
    /// Generate IP fingerprint from request (SHA256 of IP + UserAgent)
    /// </summary>
    string GenerateIpFingerprint(HttpContext context);
}

public class AnonymousUserService : IAnonymousUserService
{
    private const string AnonymousIdHeader = "X-Anonymous-Id";
    private readonly ILogger<AnonymousUserService> _logger;

    public AnonymousUserService(ILogger<AnonymousUserService> logger)
    {
        _logger = logger;
    }

    public string? GetAnonymousId(HttpContext context)
    {
        // Get anonymous ID from custom header (sent by frontend from localStorage)
        if (context.Request.Headers.TryGetValue(AnonymousIdHeader, out var headerValue))
        {
            var anonId = headerValue.ToString();
            if (!string.IsNullOrWhiteSpace(anonId) && IsValidUuid(anonId))
            {
                return anonId;
            }
        }

        return null;
    }

    public string GenerateIpFingerprint(HttpContext context)
    {
        // Collect identifying information
        var ip = GetClientIpAddress(context);
        var userAgent = context.Request.Headers.UserAgent.ToString();
        var acceptLanguage = context.Request.Headers.AcceptLanguage.ToString();

        // Create fingerprint from combination of factors
        var fingerprintData = $"{ip}|{userAgent}|{acceptLanguage}";

        // Hash the fingerprint for privacy
        var hash = ComputeSha256Hash(fingerprintData);

        _logger.LogDebug(
            "Generated IP fingerprint for IP: {IP}, hash: {Hash}",
            MaskIpAddress(ip),
            hash.Substring(0, 8) + "...");

        return hash;
    }

    private static string GetClientIpAddress(HttpContext context)
    {
        // Check for forwarded headers (when behind proxy/load balancer)
        var forwardedFor = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrEmpty(forwardedFor))
        {
            // Take the first IP in the chain (original client)
            var ips = forwardedFor.Split(',', StringSplitOptions.RemoveEmptyEntries);
            if (ips.Length > 0)
            {
                return ips[0].Trim();
            }
        }

        // Check X-Real-IP header
        var realIp = context.Request.Headers["X-Real-IP"].FirstOrDefault();
        if (!string.IsNullOrEmpty(realIp))
        {
            return realIp;
        }

        // Fall back to connection remote IP
        return context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    }

    private static string ComputeSha256Hash(string input)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(input));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    private static bool IsValidUuid(string value)
    {
        return Guid.TryParse(value, out _);
    }

    private static string MaskIpAddress(string ip)
    {
        // Mask IP for logging (privacy)
        if (ip.Contains('.'))
        {
            // IPv4: show first two octets
            var parts = ip.Split('.');
            if (parts.Length >= 2)
            {
                return $"{parts[0]}.{parts[1]}.*.*";
            }
        }
        else if (ip.Contains(':'))
        {
            // IPv6: show first two groups
            var parts = ip.Split(':');
            if (parts.Length >= 2)
            {
                return $"{parts[0]}:{parts[1]}:*:*:*:*:*:*";
            }
        }

        return "***";
    }
}
