using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;
using System.Text;
using System.Web;

namespace GeoLeap.Api.Services;

public class ShareLinkService : IShareLinkService
{
    private readonly ApplicationDbContext _context;
    private readonly ILoggerService _logger;
    private readonly IConfiguration _configuration;

    public ShareLinkService(
        ApplicationDbContext context,
        ILoggerService logger,
        IConfiguration configuration)
    {
        _context = context;
        _logger = logger;
        _configuration = configuration;
    }

    public async Task<string> CreateTrackableLinkAsync(string baseUrl, Dictionary<string, string>? utmParameters, Guid shareEventId, CancellationToken cancellationToken = default)
    {
        try
        {
            // Generate a unique short code for the link
            var shortCode = GenerateShortCode();
            
            // Build the full URL with UTM parameters
            var urlBuilder = new UriBuilder(baseUrl);
            var queryParams = HttpUtility.ParseQueryString(urlBuilder.Query ?? "");
            
            if (utmParameters != null)
            {
                foreach (var param in utmParameters)
                {
                    queryParams[param.Key] = param.Value;
                }
            }
            
            // Add tracking parameter
            queryParams["ref"] = shortCode;
            urlBuilder.Query = queryParams.ToString();
            
            var fullUrl = urlBuilder.ToString();
            
            // Store the mapping in cache or database for quick lookup
            await StoreShortCodeMappingAsync(shortCode, fullUrl, shareEventId, cancellationToken);
            
            // Return the short trackable URL
            var baseShortUrl = _configuration["BaseUrl"] ?? "https://geoleap.com";
            var trackableUrl = $"{baseShortUrl}/s/{shortCode}";
            
            _logger.LogBusinessEvent("TrackableLinkCreated", new
            {
                ShareEventId = shareEventId,
                ShortCode = shortCode,
                OriginalUrl = baseUrl,
                TrackableUrl = trackableUrl
            });
            
            return trackableUrl;
        }
        catch (Exception ex)
        {
            _logger.LogBusinessEvent("TrackableLinkCreationError", new
            {
                ShareEventId = shareEventId,
                BaseUrl = baseUrl,
                Error = ex.Message
            });
            
            // Fallback to original URL with UTM parameters
            return AppendUtmParameters(baseUrl, utmParameters);
        }
    }

    public async Task<string> ResolveShareLinkAsync(string shareCode, string ipAddress, string userAgent, string? referer, CancellationToken cancellationToken = default)
    {
        try
        {
            // Look up the original URL
            var mapping = await GetShortCodeMappingAsync(shareCode, cancellationToken);
            if (mapping == null)
            {
                _logger.LogBusinessEvent("ShareLinkNotFound", new { ShareCode = shareCode });
                return _configuration["BaseUrl"] ?? "https://geoleap.com";
            }

            // Track the click directly in our own database
            var clickEvent = new ShareLinkClick
            {
                ShareEventId = mapping.ShareEventId,
                IpAddress = ipAddress,
                UserAgent = userAgent,
                RefererUrl = referer,
                ClickedAt = DateTime.UtcNow,
                ConvertedToRegistration = false
            };

            _context.ShareLinkClicks.Add(clickEvent);
            await _context.SaveChangesAsync(cancellationToken);

            // Update click count
            await UpdateShortCodeClickCountAsync(shareCode, cancellationToken);

            _logger.LogBusinessEvent("ShareLinkResolved", new
            {
                ShareCode = shareCode,
                ShareEventId = mapping.ShareEventId,
                OriginalUrl = mapping.OriginalUrl,
                IpAddress = ipAddress
            });

            return mapping.OriginalUrl;
        }
        catch (Exception ex)
        {
            _logger.LogBusinessEvent("ShareLinkResolutionError", new
            {
                ShareCode = shareCode,
                Error = ex.Message
            });
            
            return _configuration["BaseUrl"] ?? "https://geoleap.com";
        }
    }

    public async Task<Dictionary<string, object>> GetShareLinkAnalyticsAsync(string shareCode, CancellationToken cancellationToken = default)
    {
        try
        {
            var mapping = await GetShortCodeMappingAsync(shareCode, cancellationToken);
            if (mapping == null)
            {
                return new Dictionary<string, object> { ["error"] = "Share link not found" };
            }

            // Get click analytics
            var clicks = await _context.ShareLinkClicks
                .Where(c => c.ShareEventId == mapping.ShareEventId)
                .ToListAsync(cancellationToken);

            var analytics = new Dictionary<string, object>
            {
                ["shareCode"] = shareCode,
                ["shareEventId"] = mapping.ShareEventId,
                ["originalUrl"] = mapping.OriginalUrl,
                ["createdAt"] = mapping.CreatedAt,
                ["totalClicks"] = clicks.Count,
                ["uniqueClicks"] = clicks.Select(c => c.IpAddress).Distinct().Count(),
                ["conversions"] = clicks.Count(c => c.ConvertedToRegistration),
                ["conversionRate"] = clicks.Any() ? (decimal)clicks.Count(c => c.ConvertedToRegistration) / clicks.Count : 0,
                ["lastClickAt"] = clicks.Any() ? clicks.Max(c => c.ClickedAt) : (DateTime?)null,
                ["clicksByDay"] = clicks
                    .GroupBy(c => c.ClickedAt.Date)
                    .OrderBy(g => g.Key)
                    .ToDictionary(g => g.Key.ToString("yyyy-MM-dd"), g => g.Count()),
                ["clicksByCountry"] = clicks
                    .Where(c => !string.IsNullOrEmpty(c.CountryCode))
                    .GroupBy(c => c.CountryCode)
                    .ToDictionary(g => g.Key!, g => g.Count()),
                ["topReferrers"] = clicks
                    .Where(c => !string.IsNullOrEmpty(c.RefererUrl))
                    .GroupBy(c => c.RefererUrl)
                    .OrderByDescending(g => g.Count())
                    .Take(10)
                    .ToDictionary(g => g.Key!, g => g.Count())
            };

            return analytics;
        }
        catch (Exception ex)
        {
            _logger.LogBusinessEvent("ShareLinkAnalyticsError", new
            {
                ShareCode = shareCode,
                Error = ex.Message
            });
            
            return new Dictionary<string, object> { ["error"] = ex.Message };
        }
    }

    public async Task CleanupExpiredLinksAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var cutoffDate = DateTime.UtcNow.AddDays(-90); // Keep links for 90 days
            
            var expiredMappings = await _context.ShareLinkMappings
                .Where(m => m.CreatedAt < cutoffDate)
                .ToListAsync(cancellationToken);

            if (expiredMappings.Any())
            {
                _context.ShareLinkMappings.RemoveRange(expiredMappings);
                await _context.SaveChangesAsync(cancellationToken);
                
                _logger.LogBusinessEvent("ShareLinksCleanup", new
                {
                    RemovedCount = expiredMappings.Count,
                    CutoffDate = cutoffDate
                });
            }
        }
        catch (Exception ex)
        {
            _logger.LogBusinessEvent("ShareLinksCleanupError", new
            {
                Error = ex.Message
            });
        }
    }

    // Helper methods
    private string GenerateShortCode(int length = 8)
    {
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
        using var rng = RandomNumberGenerator.Create();
        var bytes = new byte[length];
        rng.GetBytes(bytes);
        
        var result = new StringBuilder(length);
        for (int i = 0; i < length; i++)
        {
            result.Append(chars[bytes[i] % chars.Length]);
        }
        
        return result.ToString();
    }

    private async Task StoreShortCodeMappingAsync(string shortCode, string originalUrl, Guid shareEventId, CancellationToken cancellationToken)
    {
        var mapping = new ShareLinkMapping
        {
            ShortCode = shortCode,
            OriginalUrl = originalUrl,
            ShareEventId = shareEventId,
            CreatedAt = DateTime.UtcNow,
            ClickCount = 0,
            IsActive = true
        };

        _context.ShareLinkMappings.Add(mapping);
        await _context.SaveChangesAsync(cancellationToken);
    }

    private async Task<ShareLinkMapping?> GetShortCodeMappingAsync(string shortCode, CancellationToken cancellationToken)
    {
        return await _context.ShareLinkMappings
            .Where(m => m.ShortCode == shortCode && m.IsActive)
            .FirstOrDefaultAsync(cancellationToken);
    }

    private async Task UpdateShortCodeClickCountAsync(string shortCode, CancellationToken cancellationToken)
    {
        var mapping = await _context.ShareLinkMappings
            .Where(m => m.ShortCode == shortCode)
            .FirstOrDefaultAsync(cancellationToken);
            
        if (mapping != null)
        {
            mapping.ClickCount++;
            mapping.LastClickedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync(cancellationToken);
        }
    }

    private string AppendUtmParameters(string baseUrl, Dictionary<string, string>? utmParameters)
    {
        if (utmParameters == null || !utmParameters.Any())
            return baseUrl;

        var urlBuilder = new UriBuilder(baseUrl);
        var queryParams = HttpUtility.ParseQueryString(urlBuilder.Query ?? "");
        
        foreach (var param in utmParameters)
        {
            queryParams[param.Key] = param.Value;
        }
        
        urlBuilder.Query = queryParams.ToString();
        return urlBuilder.ToString();
    }

    public async Task<ShareLinkResponse> GenerateShareLinkAsync(ShareContentRequest request, string platform)
    {
        try
        {
            _logger.LogBusinessEvent("GeneratingShareLink", new { ContentId = request.ContentId, Platform = platform });

            var shortCode = GenerateShortCode();
            var baseUrl = _configuration["App:BaseUrl"] ?? "https://geoleap.com";
            var shareUrl = $"{baseUrl}/shared/{platform}/{request.ContentId}";
            var shortUrl = $"{baseUrl}/s/{shortCode}";

            var shareLink = new ShareLink
            {
                Id = Guid.NewGuid(),
                ShortCode = shortCode,
                OriginalUrl = shareUrl,
                ContentId = request.ContentId,
                ContentType = request.ContentType,
                Platform = platform,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = request.UserId ?? Guid.Empty
            };

            _context.ShareLinks.Add(shareLink);
            await _context.SaveChangesAsync();

            return new ShareLinkResponse
            {
                ShareEventId = shareLink.Id,
                ShareUrl = shareUrl,
                ShortUrl = shortUrl,
                Success = true,
                CreatedAt = DateTime.UtcNow
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error generating share link for content: {ContentId}", request.ContentId);
            throw;
        }
    }

    public async Task<string> ShortenUrlAsync(string originalUrl, Guid userId)
    {
        try
        {
            _logger.LogBusinessEvent("ShorteningUrl", new { UserId = userId });

            var shortCode = GenerateShortCode();
            var baseUrl = _configuration["App:BaseUrl"] ?? "https://geoleap.com";
            var shortUrl = $"{baseUrl}/s/{shortCode}";

            var shareLink = new ShareLink
            {
                Id = Guid.NewGuid(),
                ShortCode = shortCode,
                OriginalUrl = originalUrl,
                CreatedAt = DateTime.UtcNow,
                CreatedBy = userId
            };

            _context.ShareLinks.Add(shareLink);
            await _context.SaveChangesAsync();

            return shortUrl;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error shortening URL for user: {UserId}", userId);
            throw;
        }
    }

    public async Task<string?> ExpandUrlAsync(string shortCode)
    {
        try
        {
            var shareLink = await _context.ShareLinks
                .FirstOrDefaultAsync(sl => sl.ShortCode == shortCode);

            return shareLink?.OriginalUrl;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error expanding URL with short code: {ShortCode}", shortCode);
            throw;
        }
    }

    public async Task<string?> TrackClickAndGetUrlAsync(string shortCode, Dictionary<string, object> trackingData)
    {
        try
        {
            var shareLink = await _context.ShareLinks
                .FirstOrDefaultAsync(sl => sl.ShortCode == shortCode);

            if (shareLink == null)
            {
                throw new ArgumentException("Short code not found");
            }

            var clickEvent = new ShareClickEvent
            {
                Id = Guid.NewGuid(),
                ShareEventId = shareLink.Id,
                CreatedAt = DateTime.UtcNow,
                IpAddress = trackingData?.GetValueOrDefault("ip_address")?.ToString() ?? "",
                UserAgent = trackingData?.GetValueOrDefault("user_agent")?.ToString() ?? "",
                ReferrerUrl = trackingData?.GetValueOrDefault("referrer")?.ToString() ?? ""
            };

            _context.ShareClickEvents.Add(clickEvent);
            shareLink.ClickCount++;
            shareLink.LastClickedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();

            _logger.LogBusinessEvent("TrackedClick", new { ShortCode = shortCode });

            return shareLink.OriginalUrl;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error tracking click for short code: {ShortCode}", shortCode);
            throw;
        }
    }

    public async Task<Dictionary<string, object>> GetLinkAnalyticsAsync(Guid linkId)
    {
        try
        {
            var shareLink = await _context.ShareLinks
                .Include(sl => sl.ClickEvents)
                .FirstOrDefaultAsync(sl => sl.Id == linkId);

            if (shareLink == null)
            {
                throw new ArgumentException("Link not found");
            }

            return new Dictionary<string, object>
            {
                ["linkId"] = linkId,
                ["originalUrl"] = shareLink.OriginalUrl,
                ["shortCode"] = shareLink.ShortCode,
                ["totalClicks"] = shareLink.ClickCount,
                ["createdAt"] = shareLink.CreatedAt,
                ["lastClickedAt"] = shareLink.LastClickedAt,
                ["clicksByDay"] = shareLink.ClickEvents?
                    .GroupBy(ce => ce.CreatedAt.Date)
                    .ToDictionary(g => g.Key.ToString("yyyy-MM-dd"), g => g.Count()) ?? new Dictionary<string, int>()
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting analytics for link: {LinkId}", linkId);
            throw;
        }
    }

}

