using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Web;

namespace GeoLeap.Api.Services;

public class SocialSharingService : ISocialSharingService
{
    private readonly ApplicationDbContext _context;
    private readonly ILoggerService _logger;
    private readonly IShareLinkService _shareLinkService;
    private readonly IConfiguration _configuration;
    
    // Platform configurations
    private readonly Dictionary<string, SocialPlatformConfig> _platformConfigs = new()
    {
        ["facebook"] = new() { PlatformName = "facebook", DisplayName = "Facebook", CharacterLimit = 63206, SupportsImages = true, SupportsHashtags = false },
        ["twitter"] = new() { PlatformName = "twitter", DisplayName = "Twitter/X", CharacterLimit = 280, SupportsImages = true, SupportsHashtags = true },
        ["instagram"] = new() { PlatformName = "instagram", DisplayName = "Instagram", CharacterLimit = 2200, SupportsImages = true, SupportsHashtags = true },
        ["tiktok"] = new() { PlatformName = "tiktok", DisplayName = "TikTok", CharacterLimit = 150, SupportsImages = true, SupportsHashtags = true },
        ["whatsapp"] = new() { PlatformName = "whatsapp", DisplayName = "WhatsApp", CharacterLimit = 65536, SupportsImages = true, SupportsHashtags = false },
        ["linkedin"] = new() { PlatformName = "linkedin", DisplayName = "LinkedIn", CharacterLimit = 3000, SupportsImages = true, SupportsHashtags = true },
        ["pinterest"] = new() { PlatformName = "pinterest", DisplayName = "Pinterest", CharacterLimit = 500, SupportsImages = true, SupportsHashtags = true },
        ["reddit"] = new() { PlatformName = "reddit", DisplayName = "Reddit", CharacterLimit = 40000, SupportsImages = true, SupportsHashtags = false }
    };

    public SocialSharingService(
        ApplicationDbContext context,
        ILoggerService logger,
        IShareLinkService shareLinkService,
        IConfiguration configuration)
    {
        _context = context;
        _logger = logger;
        _shareLinkService = shareLinkService;
        _configuration = configuration;
    }

    public async Task<ShareLinkResponse> GenerateShareLinkAsync(ShareContentRequest request, Guid userId, string correlationId, CancellationToken cancellationToken = default)
    {
        try
        {
            // Get content details for sharing
            var content = await GetContentDetailsAsync(request.ContentId, request.ContentType, cancellationToken);
            if (content == null)
            {
                throw new ArgumentException($"Content not found: {request.ContentId}");
            }

            // Get user preferences
            var userPrefs = await GetUserSharingPreferencesAsync(userId, cancellationToken);
            
            // Create share event for tracking
            var shareEvent = await TrackShareEventAsync(request, userId, correlationId, cancellationToken);

            // Generate UTM parameters
            var utmParams = GenerateUtmParameters(request, shareEvent.Id);

            // Create trackable share link with comprehensive fallback
            var baseUrl = $"{_configuration["BaseUrl"] ?? "https://geoleap.com"}/shared/{request.ContentType}/{request.ContentId}";
            string shareUrl;
            
            try
            {
                shareUrl = await _shareLinkService.CreateTrackableLinkAsync(baseUrl, utmParams, shareEvent.Id, cancellationToken);
            }
            catch (Exception ex)
            {
                _logger.LogBusinessEvent("ShareLinkServiceError", new { Error = ex.Message, ContentId = request.ContentId });
                shareUrl = null;
            }
            
            // Comprehensive fallback - always ensure we have a valid URL
            if (string.IsNullOrEmpty(shareUrl))
            {
                var queryString = string.Join("&", utmParams.Select(kv => $"{kv.Key}={Uri.EscapeDataString(kv.Value)}"));
                shareUrl = string.IsNullOrEmpty(queryString) ? baseUrl : $"{baseUrl}?{queryString}";
            }

            // Generate platform-specific share URL
            var platformShareUrl = GeneratePlatformSpecificUrl(request.Platform, shareUrl, content.Title, request.CustomMessage);
            
            // Generate optimized share message
            var shareMessage = await GenerateShareMessageAsync(request.Platform, content.Title, request.CustomMessage, userId, cancellationToken);

            // Generate hashtags if enabled
            var hashtags = new List<string>();
            if (userPrefs.AutoGenerateHashtags && _platformConfigs.ContainsKey(request.Platform.ToLower()) && _platformConfigs[request.Platform.ToLower()].SupportsHashtags)
            {
                hashtags = await GenerateHashtagsAsync(content.Title, request.ContentType, content.Genres?.FirstOrDefault(), cancellationToken);
                if (hashtags.Any())
                {
                    shareMessage += " " + string.Join(" ", hashtags.Select(h => $"#{h}"));
                }
            }

            var response = new ShareLinkResponse
            {
                ShareUrl = platformShareUrl ?? shareUrl,
                ShareMessage = shareMessage,
                ImageUrl = content.ImageUrl,
                ShareEventId = shareEvent.Id,
                Metadata = new Dictionary<string, object>
                {
                    ["contentTitle"] = content.Title,
                    ["contentType"] = request.ContentType,
                    ["platform"] = request.Platform,
                    ["hashtags"] = hashtags,
                    ["platformUrl"] = platformShareUrl
                }
            };

            _logger.LogBusinessEvent("ShareLinkGenerated", new
            {
                UserId = userId,
                ContentId = request.ContentId,
                Platform = request.Platform,
                ShareEventId = shareEvent.Id,
                CorrelationId = correlationId
            });

            return response;
        }
        catch (Exception ex)
        {
            _logger.LogBusinessEvent("ShareLinkGenerationError", new
            {
                UserId = userId,
                ContentId = request.ContentId,
                Platform = request.Platform,
                Error = ex.Message,
                CorrelationId = correlationId
            });
            
            // Return a basic fallback response instead of throwing
            return new ShareLinkResponse
            {
                ShareUrl = $"{_configuration["BaseUrl"] ?? "https://geoleap.com"}/shared/{request.ContentType}/{request.ContentId}",
                ShareMessage = $"Check out this {request.ContentType}",
                ImageUrl = "/images/placeholder.jpg",
                ShareEventId = Guid.NewGuid(),
                Metadata = new Dictionary<string, object>
                {
                    ["contentTitle"] = "Unknown",
                    ["contentType"] = request.ContentType,
                    ["platform"] = request.Platform,
                    ["error"] = "fallback_response"
                }
            };
        }
    }

    public async Task<SocialShareEvent> TrackShareEventAsync(ShareContentRequest request, Guid userId, string correlationId, CancellationToken cancellationToken = default)
    {
        var content = await GetContentDetailsAsync(request.ContentId, request.ContentType, cancellationToken);
        
        var shareEvent = new SocialShareEvent
        {
            UserId = userId,
            Platform = request.Platform.ToLower(),
            ContentId = request.ContentId,
            ContentType = request.ContentType,
            ContentTitle = content?.Title ?? "Unknown Content",
            ShareMessage = request.CustomMessage,
            ShareMethod = "modal", // Default: user-initiated share from modal
            Status = "initiated",
            Metadata = new Dictionary<string, object>
            {
                ["CorrelationId"] = correlationId,
                ["IncludePersonalInfo"] = request.IncludePersonalInfo,
                ["TrackAnalytics"] = request.TrackAnalytics,
                ["UtmParameters"] = request.UtmParameters ?? new Dictionary<string, string>()
            }
        };

        _context.SocialShareEvents.Add(shareEvent);
        await _context.SaveChangesAsync(cancellationToken);

        return shareEvent;
    }

    public async Task UpdateShareEventStatusAsync(Guid shareEventId, ShareStatus status, string? errorMessage = null, CancellationToken cancellationToken = default)
    {
        var shareEvent = await _context.SocialShareEvents.FindAsync(shareEventId, cancellationToken);
        if (shareEvent == null) return;

        shareEvent.Status = status.ToString().ToLowerInvariant();
        shareEvent.ErrorMessage = errorMessage;

        switch (status)
        {
            case ShareStatus.Completed:
                shareEvent.CompletedAt = DateTime.UtcNow;
                break;
            case ShareStatus.Failed:
                shareEvent.FailedAt = DateTime.UtcNow;
                break;
        }

        await _context.SaveChangesAsync(cancellationToken);
    }

    public async Task<ShareLinkClick> TrackShareLinkClickAsync(Guid shareEventId, string ipAddress, string userAgent, string? referer, CancellationToken cancellationToken = default)
    {
        var click = new ShareLinkClick
        {
            ShareEventId = shareEventId,
            IpAddress = ipAddress,
            UserAgent = userAgent,
            RefererUrl = referer,
            ClickedAt = DateTime.UtcNow
        };

        _context.ShareLinkClicks.Add(click);
        await _context.SaveChangesAsync(cancellationToken);

        return click;
    }

    public async Task UpdateConversionTrackingAsync(Guid shareEventId, Guid newUserId, CancellationToken cancellationToken = default)
    {
        // Find the most recent click for this share event
        var latestClick = await _context.ShareLinkClicks
            .Where(c => c.ShareEventId == shareEventId && !c.ConvertedToRegistration)
            .OrderByDescending(c => c.ClickedAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (latestClick != null)
        {
            latestClick.ConvertedToRegistration = true;
            latestClick.ConvertedUserId = newUserId;
            latestClick.ConversionDate = DateTime.UtcNow;
            
            await _context.SaveChangesAsync(cancellationToken);

            _logger.LogBusinessEvent("ShareConversion", new
            {
                ShareEventId = shareEventId,
                ConvertedUserId = newUserId,
                ClickId = latestClick.Id
            });
        }
    }

    public async Task<SocialSharingPreferences> GetUserSharingPreferencesAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        var preferences = await _context.SocialSharingPreferences
            .FirstOrDefaultAsync(p => p.UserId == userId, cancellationToken);

        if (preferences == null)
        {
            // Create default preferences
            preferences = new SocialSharingPreferences
            {
                UserId = userId,
                AllowSocialSharing = true,
                ShareWithPersonalInfo = false,
                AllowShareAnalytics = true,
                AutoGenerateHashtags = true
            };

            _context.SocialSharingPreferences.Add(preferences);
            await _context.SaveChangesAsync(cancellationToken);
        }

        return preferences;
    }

    public async Task<SocialSharingPreferences> UpdateUserSharingPreferencesAsync(Guid userId, SocialSharingPreferences preferences, CancellationToken cancellationToken = default)
    {
        var existing = await _context.SocialSharingPreferences
            .FirstOrDefaultAsync(p => p.UserId == userId, cancellationToken);

        if (existing == null)
        {
            preferences.UserId = userId;
            _context.SocialSharingPreferences.Add(preferences);
        }
        else
        {
            existing.AllowSocialSharing = preferences.AllowSocialSharing;
            existing.ShareWithPersonalInfo = preferences.ShareWithPersonalInfo;
            existing.AllowShareAnalytics = preferences.AllowShareAnalytics;
            existing.AutoGenerateHashtags = preferences.AutoGenerateHashtags;
            existing.PlatformPreferences = preferences.PlatformPreferences;
            existing.CustomShareTemplates = preferences.CustomShareTemplates;
            existing.UpdatedAt = DateTime.UtcNow;
            preferences = existing;
        }

        await _context.SaveChangesAsync(cancellationToken);
        return preferences;
    }

    public async Task<SocialShareMetrics> GetContentSharingMetricsAsync(string contentId, CancellationToken cancellationToken = default)
    {
        var shareEvents = await _context.SocialShareEvents
            .Where(se => se.ContentId == contentId)
            .Include(se => se.User)
            .ToListAsync(cancellationToken);

        var shareEventIds = shareEvents.Select(se => se.Id).ToList();
        
        var clicks = await _context.ShareLinkClicks
            .Where(c => shareEventIds.Contains(c.ShareEventId))
            .ToListAsync(cancellationToken);

        var totalShares = shareEvents.Count;
        var totalClicks = clicks.Count;
        var conversions = clicks.Count(c => c.ConvertedToRegistration);

        var metrics = new SocialShareMetrics
        {
            ContentId = contentId,
            ContentTitle = shareEvents.FirstOrDefault()?.ContentTitle ?? "Unknown",
            TotalShares = totalShares,
            TotalClicks = totalClicks,
            ConversionRate = totalClicks > 0 ? (double)conversions / totalClicks : 0,
            ViralCoefficient = shareEvents.Count > 0 ? (decimal)conversions / shareEvents.Count : 0,
            PlatformBreakdown = shareEvents.GroupBy(se => se.Platform).ToDictionary(g => g.Key, g => (long)g.Count()),
            LastSharedAt = shareEvents.Any() ? shareEvents.Max(se => se.CreatedAt) : DateTime.MinValue
        };

        return metrics;
    }

    public async Task<List<SocialShareEvent>> GetSharingAnalyticsAsync(ShareAnalyticsRequest request, CancellationToken cancellationToken = default)
    {
        var query = _context.SocialShareEvents.Include(se => se.User).AsQueryable();

        if (!string.IsNullOrEmpty(request.ContentId))
            query = query.Where(se => se.ContentId == request.ContentId);

        if (!string.IsNullOrEmpty(request.Platform))
            query = query.Where(se => se.Platform == request.Platform.ToLower());

        if (request.StartDate.HasValue)
            query = query.Where(se => se.CreatedAt >= request.StartDate.Value);

        if (request.EndDate.HasValue)
            query = query.Where(se => se.CreatedAt <= request.EndDate.Value);

        return await query
            .OrderByDescending(se => se.CreatedAt)
            .Take(Math.Max(request.Limit, 50))
            .ToListAsync(cancellationToken);
    }

    public async Task<List<SocialPlatformConfig>> GetAvailablePlatformsAsync(CancellationToken cancellationToken = default)
    {
        return await Task.FromResult(_platformConfigs.Values.Where(p => p.IsEnabled).OrderBy(p => p.SortOrder).ToList());
    }

    public async Task<string> GenerateShareMessageAsync(string platform, string contentTitle, string? customMessage, Guid userId, CancellationToken cancellationToken = default)
    {
        if (!string.IsNullOrEmpty(customMessage))
        {
            return OptimizeMessageForPlatform(customMessage, platform);
        }

        var templates = new Dictionary<string, string>
        {
            ["facebook"] = "I found this amazing {contentType} on GeoLeap: \"{title}\" - check out where you can watch it!",
            ["twitter"] = "Just discovered \"{title}\" on @GeoLeap! 🎬 Find out where to stream it:",
            ["instagram"] = "Found the perfect {contentType} to watch! \"{title}\" 📺 Discovered on GeoLeap ✨",
            ["tiktok"] = "\"{title}\" looks amazing! Found it on GeoLeap 🔥",
            ["whatsapp"] = "Hey! I found this great {contentType} called \"{title}\" on GeoLeap. You should check it out!",
            ["linkedin"] = "Discovered an interesting {contentType}: \"{title}\" via GeoLeap's content discovery platform.",
            ["pinterest"] = "\"{title}\" - Found this gem on GeoLeap!",
            ["reddit"] = "Found \"{title}\" on GeoLeap - thought you might be interested!"
        };

        var template = templates.GetValueOrDefault(platform.ToLower(), templates["facebook"]);
        var message = template.Replace("{title}", contentTitle).Replace("{contentType}", "show");

        return OptimizeMessageForPlatform(message, platform);
    }

    public async Task<List<string>> GenerateHashtagsAsync(string contentTitle, string contentType, string? genre, CancellationToken cancellationToken = default)
    {
        var hashtags = new List<string> { "GeoLeap" };

        // Add content type hashtag
        if (!string.IsNullOrEmpty(contentType))
        {
            hashtags.Add(contentType.Replace(" ", ""));
        }

        // Add genre hashtags
        if (!string.IsNullOrEmpty(genre))
        {
            hashtags.AddRange(genre.Split(',', StringSplitOptions.RemoveEmptyEntries)
                .Select(g => g.Trim().Replace(" ", "").Replace("-", ""))
                .Where(g => !string.IsNullOrEmpty(g)));
        }

        // Add trending hashtags based on content
        var trendingHashtags = GetTrendingHashtagsForContent(contentTitle, contentType);
        hashtags.AddRange(trendingHashtags);

        // Clean up hashtags and limit to reasonable number
        return hashtags
            .Select(CleanHashtag)
            .Where(h => !string.IsNullOrEmpty(h) && h.Length > 2)
            .Distinct()
            .Take(5)
            .ToList();
    }

    /// <summary>
    /// Generate platform-specific share URLs with proper formatting
    /// </summary>
    private string? GeneratePlatformSpecificUrl(string platform, string baseUrl, string title, string? message)
    {
        var encodedUrl = Uri.EscapeDataString(baseUrl);
        var encodedTitle = Uri.EscapeDataString(title ?? "");
        var encodedMessage = Uri.EscapeDataString(message ?? "");

        return platform.ToLower() switch
        {
            "twitter" => $"https://twitter.com/intent/tweet?url={encodedUrl}&text={encodedTitle}&hashtags=GeoLeap",
            "facebook" => $"https://www.facebook.com/sharer/sharer.php?u={encodedUrl}&quote={encodedTitle}",
            "linkedin" => $"https://www.linkedin.com/sharing/share-offsite/?url={encodedUrl}&title={encodedTitle}&summary={encodedMessage}",
            "whatsapp" => $"https://wa.me/?text={encodedTitle}%20{encodedUrl}",
            "telegram" => $"https://t.me/share/url?url={encodedUrl}&text={encodedTitle}",
            "reddit" => $"https://reddit.com/submit?url={encodedUrl}&title={encodedTitle}",
            _ => null
        };
    }

    // Helper methods
    private string OptimizeMessageForPlatform(string message, string platform)
    {
        var config = _platformConfigs.GetValueOrDefault(platform.ToLower());
        if (config == null) return message;

        if (message.Length > config.CharacterLimit)
        {
            return message.Substring(0, config.CharacterLimit - 3) + "...";
        }

        return message;
    }

    private Dictionary<string, string> GenerateUtmParameters(ShareContentRequest request, Guid shareEventId)
    {
        var utmParams = new Dictionary<string, string>
        {
            ["utm_source"] = request.Platform.ToLower(),
            ["utm_medium"] = "social",
            ["utm_campaign"] = "content_sharing",
            ["utm_content"] = request.ContentId,
            ["share_id"] = shareEventId.ToString()
        };

        if (request.UtmParameters != null)
        {
            foreach (var param in request.UtmParameters)
            {
                utmParams[param.Key] = param.Value;
            }
        }

        return utmParams;
    }

    private async Task<dynamic?> GetContentDetailsAsync(string contentId, string contentType, CancellationToken cancellationToken)
    {
        // This would typically query your content database
        // For now, returning a mock object
        await Task.Delay(1, cancellationToken);
        
        return new
        {
            Title = "Sample Content",
            ImageUrl = "/images/placeholder.jpg",
            Genres = new[] { "Drama", "Action" }
        };
    }

    private List<string> GetTrendingHashtagsForContent(string contentTitle, string contentType)
    {
        var trending = new List<string>();

        if (contentType.ToLower().Contains("movie"))
        {
            trending.AddRange(new[] { "Movies", "Cinema", "Film", "WhatToWatch" });
        }
        else if (contentType.ToLower().Contains("tv") || contentType.ToLower().Contains("series"))
        {
            trending.AddRange(new[] { "TVShow", "Series", "Binge", "Television" });
        }

        // Add seasonal or trending hashtags based on current time
        var month = DateTime.Now.Month;
        if (month >= 11 || month <= 1)
        {
            trending.Add("WinterWatch");
        }
        else if (month >= 6 && month <= 8)
        {
            trending.Add("SummerBinge");
        }

        return trending.Take(3).ToList();
    }

    private string CleanHashtag(string hashtag)
    {
        // Remove special characters and ensure it's a valid hashtag
        var cleaned = Regex.Replace(hashtag, @"[^a-zA-Z0-9_]", "");
        return cleaned.Length > 2 ? cleaned : string.Empty;
    }

    public async Task<SocialShareDto> CreateShareAsync(CreateSocialShareRequest request, string userId)
    {
        try
        {
            _logger.LogBusinessEvent("CreatingSocialShare", new { ContentId = request.ContentId, Platform = request.Platform });

            var shareId = Guid.NewGuid();
            var baseUrl = _configuration["App:BaseUrl"] ?? "https://geoleap.com";
            var shareUrl = $"{baseUrl}/shared/{request.Platform}/{request.ContentId}";
            
            var shortUrlResponse = await _shareLinkService.ShortenUrlAsync(shareUrl, 
                Guid.TryParse(userId, out var userGuid) ? userGuid : Guid.Empty);

            var shareEvent = new SocialShareEvent
            {
                Id = shareId,
                UserId = Guid.TryParse(userId, out var uid) ? uid : Guid.Empty,
                ContentId = request.ContentId,
                ContentType = request.ContentType,
                Platform = request.Platform,
                ShareUrl = shareUrl,
                CustomMessage = request.CustomMessage ?? "",
                Status = "completed",
                CreatedAt = DateTime.UtcNow,
                IsSuccessful = true
            };

            _context.SocialShareEvents.Add(shareEvent);
            await _context.SaveChangesAsync();

            return new SocialShareDto
            {
                ShareId = shareId.ToString(),
                ShareUrl = shareUrl,
                ShortUrl = shortUrlResponse,
                Platform = request.Platform,
                ContentId = request.ContentId,
                ContentType = request.ContentType,
                CustomMessage = request.CustomMessage,
                CreatedAt = DateTime.UtcNow,
                Metadata = request.Metadata
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error creating social share for content: {ContentId}", request.ContentId);
            throw;
        }
    }

    public async Task<SocialSharingAnalyticsDto> GetShareAnalyticsAsync(string platform, DateTime? startDate, DateTime? endDate)
    {
        try
        {
            var query = _context.SocialShareEvents.AsQueryable();

            if (!string.IsNullOrEmpty(platform))
                query = query.Where(e => e.Platform == platform);

            if (startDate.HasValue)
                query = query.Where(e => e.CreatedAt >= startDate.Value);

            if (endDate.HasValue)
                query = query.Where(e => e.CreatedAt <= endDate.Value);

            var events = await query.ToListAsync();

            return new SocialSharingAnalyticsDto
            {
                TotalShares = events.Count,
                SuccessfulShares = events.Count(e => e.IsSuccessful),
                FailedShares = events.Count(e => !e.IsSuccessful),
                SharesByPlatform = events.GroupBy(e => e.Platform)
                    .ToDictionary(g => g.Key, g => g.Count()),
                MostSharedContent = events.GroupBy(e => e.ContentId)
                    .OrderByDescending(g => g.Count())
                    .Take(5)
                    .ToDictionary(g => g.Key, g => g.Count()),
                Period = $"{startDate:yyyy-MM-dd} to {endDate:yyyy-MM-dd}"
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting share analytics for platform: {Platform}", platform);
            throw;
        }
    }

    public async Task<bool> TrackShareClickAsync(Guid shareEventId, Dictionary<string, object> clickData)
    {
        try
        {
            var clickEvent = new ShareClickEvent
            {
                Id = Guid.NewGuid(),
                ShareEventId = shareEventId,
                CreatedAt = DateTime.UtcNow,
                IpAddress = clickData?.GetValueOrDefault("ip_address")?.ToString() ?? "",
                UserAgent = clickData?.GetValueOrDefault("user_agent")?.ToString() ?? "",
                ReferrerUrl = clickData?.GetValueOrDefault("referrer")?.ToString() ?? ""
            };

            _context.ShareClickEvents.Add(clickEvent);
            await _context.SaveChangesAsync();

            _logger.LogBusinessEvent("ShareClickTracked", new { ShareEventId = shareEventId });
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error tracking share click for event: {ShareEventId}", shareEventId);
            return false;
        }
    }

    public async Task<List<ContentSharePerformance>> GetPopularSharedContentAsync(string? contentType, string? platform, int limit = 20)
    {
        try
        {
            var query = _context.SocialShareEvents.AsQueryable();

            if (!string.IsNullOrEmpty(contentType))
                query = query.Where(e => e.ContentType == contentType);

            if (!string.IsNullOrEmpty(platform))
                query = query.Where(e => e.Platform == platform);

            var popularContent = await query
                .GroupBy(e => new { e.ContentId, e.ContentType, e.ContentTitle })
                .Select(g => new ContentSharePerformance
                {
                    ContentId = g.Key.ContentId,
                    ContentType = g.Key.ContentType,
                    Title = g.Key.ContentTitle,
                    ShareCount = g.Count(),
                    LastSharedAt = g.Max(e => e.CreatedAt),
                    PopularityScore = g.Count() * 1.0
                })
                .OrderByDescending(p => p.ShareCount)
                .Take(limit)
                .ToListAsync();

            return popularContent;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting popular shared content");
            throw;
        }
    }

    public async Task<ShareLinkResponse> GenerateShareLinkAsync(ShareContentRequest request, string platform)
    {
        return await _shareLinkService.GenerateShareLinkAsync(request, platform);
    }

    public async Task TrackShareLinkClickAsync(Guid shareId, Dictionary<string, object> clickData, CancellationToken cancellationToken = default)
    {
        try
        {
            // Track the share link click event
            var shareEvent = new SocialShareEvent
            {
                ShareId = shareId.ToString(),
                EventType = "click",
                Timestamp = DateTime.UtcNow,
                Metadata = clickData
            };

            _context.SocialShareEvents.Add(shareEvent);
            await _context.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error tracking share link click for share {ShareId}", shareId);
            throw;
        }
    }
    
    // Alias methods for test compatibility
    public async Task<ShareLinkResponse> CreateShareLinkAsync(ShareContentRequest request, Guid userId, string correlationId, CancellationToken cancellationToken = default)
    {
        return await GenerateShareLinkAsync(request, userId, correlationId, cancellationToken);
    }
    
    public async Task<bool> TrackClickAsync(Guid shareId, Dictionary<string, object> clickData)
    {
        try
        {
            // Update the share event's click count
            var shareEvent = await _context.SocialShareEvents.FindAsync(shareId);
            if (shareEvent != null)
            {
                shareEvent.ClickCount++;
                
                // Create click tracking record
                var clickRecord = new ShareLinkClick
                {
                    ShareEventId = shareId,
                    IpAddress = clickData?.GetValueOrDefault("ip")?.ToString() ?? 
                               clickData?.GetValueOrDefault("ip_address")?.ToString() ?? "",
                    UserAgent = clickData?.GetValueOrDefault("userAgent")?.ToString() ?? 
                               clickData?.GetValueOrDefault("user_agent")?.ToString() ?? "",
                    RefererUrl = clickData?.GetValueOrDefault("referrer")?.ToString() ?? "",
                    ClickedAt = DateTime.UtcNow
                };
                
                _context.ShareLinkClicks.Add(clickRecord);
                await _context.SaveChangesAsync();
                
                _logger.LogBusinessEvent("ShareClickTracked", new { ShareId = shareId, ClickCount = shareEvent.ClickCount });
                return true;
            }
            
            return false;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error tracking share click for share {ShareId}", shareId);
            return false;
        }
    }
    
    public async Task<SocialSharingAnalyticsDto> GetAnalyticsAsync(string platform, DateTime? startDate, DateTime? endDate)
    {
        try
        {
            var query = _context.SocialShareEvents.AsQueryable();

            // Apply filters based on platform parameter
            if (!string.IsNullOrEmpty(platform) && platform != "all")
            {
                query = query.Where(e => e.Platform == platform.ToLower());
            }

            if (startDate.HasValue)
                query = query.Where(e => e.CreatedAt >= startDate.Value);

            if (endDate.HasValue)
                query = query.Where(e => e.CreatedAt <= endDate.Value);

            var events = await query.ToListAsync();
            var shareIds = events.Select(e => e.Id).ToList();
            var clicks = await _context.ShareLinkClicks
                .Where(c => shareIds.Contains(c.ShareEventId))
                .ToListAsync();

            var analytics = new SocialSharingAnalyticsDto
            {
                TotalShares = events.Count,
                SuccessfulShares = events.Count(e => e.IsSuccessful || e.Status == "completed"),
                FailedShares = events.Count(e => !e.IsSuccessful || e.Status == "failed"),
                SharesByPlatform = events.GroupBy(e => e.Platform)
                    .ToDictionary(g => g.Key, g => g.Count()),
                MostSharedContent = events.GroupBy(e => e.ContentId)
                    .OrderByDescending(g => g.Count())
                    .Take(5)
                    .ToDictionary(g => g.Key, g => g.Count()),
                Period = $"{startDate:yyyy-MM-dd} to {endDate:yyyy-MM-dd}"
            };

            return analytics;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting analytics for platform: {Platform}", platform);
            throw;
        }
    }
    
    public async Task<List<SocialShareEvent>> GetUserSharesAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        try
        {
            return await _context.SocialShareEvents
                .Where(s => s.UserId == userId)
                .OrderByDescending(s => s.CreatedAt)
                .ToListAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting user shares for user {UserId}", userId);
            throw;
        }
    }
    
    public async Task<bool> DeleteShareAsync(Guid shareId, CancellationToken cancellationToken = default)
    {
        try
        {
            var shareEvent = await _context.SocialShareEvents
                .FirstOrDefaultAsync(s => s.Id == shareId, cancellationToken);
                
            if (shareEvent == null)
                return false;
                
            _context.SocialShareEvents.Remove(shareEvent);
            await _context.SaveChangesAsync(cancellationToken);
            
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error deleting share {ShareId}", shareId);
            throw;
        }
    }
}