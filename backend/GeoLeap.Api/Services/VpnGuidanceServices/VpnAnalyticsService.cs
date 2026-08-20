using Microsoft.EntityFrameworkCore;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using System.Text.Json;

namespace GeoLeap.Api.Services.VpnGuidanceServices;

public class VpnAnalyticsService : IVpnAnalyticsService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<VpnAnalyticsService> _logger;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public VpnAnalyticsService(
        ApplicationDbContext context,
        ILogger<VpnAnalyticsService> logger,
        IHttpContextAccessor httpContextAccessor)
    {
        _context = context;
        _logger = logger;
        _httpContextAccessor = httpContextAccessor;
    }

    public async Task TrackEventAsync(
        VpnGuidanceEventType eventType,
        Guid? userId = null,
        Guid? vpnProviderId = null,
        Guid? guideId = null,
        Dictionary<string, object>? additionalData = null,
        string? sessionId = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var httpContext = _httpContextAccessor.HttpContext;
            
            var analytics = new VpnGuidanceAnalytics
            {
                Id = Guid.NewGuid(),
                UserId = userId,
                EventType = eventType,
                VpnProviderId = vpnProviderId,
                GuideId = guideId,
                EventData = additionalData != null ? JsonSerializer.Serialize(additionalData) : null,
                IpAddress = httpContext?.Connection?.RemoteIpAddress?.ToString(),
                UserAgent = httpContext?.Request?.Headers?["User-Agent"].ToString(),
                Referrer = httpContext?.Request?.Headers?["Referer"].ToString(),
                SessionId = sessionId ?? httpContext?.Session?.Id,
                Timestamp = DateTime.UtcNow
            };

            _context.VpnGuidanceAnalytics.Add(analytics);
            await _context.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error tracking VPN guidance event {EventType}", eventType);
            // Don't throw - analytics failures shouldn't break the main flow
        }
    }

    public async Task<Dictionary<string, object>> GetProviderAnalyticsAsync(
        Guid providerId,
        DateTime fromDate,
        DateTime toDate,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var analytics = await _context.VpnGuidanceAnalytics
                .Where(a => a.VpnProviderId == providerId && 
                           a.Timestamp >= fromDate && 
                           a.Timestamp <= toDate)
                .ToListAsync(cancellationToken);

            var totalViews = analytics.Count(a => a.EventType == VpnGuidanceEventType.ProviderViewed);
            var totalClicks = analytics.Count(a => a.EventType == VpnGuidanceEventType.ProviderClicked);
            var affiliateClicks = analytics.Count(a => a.EventType == VpnGuidanceEventType.AffiliateClicked);
            var uniqueUsers = analytics.Where(a => a.UserId.HasValue).Select(a => a.UserId).Distinct().Count();
            var uniqueSessions = analytics.Select(a => a.SessionId).Distinct().Count();

            var dailyViews = analytics
                .Where(a => a.EventType == VpnGuidanceEventType.ProviderViewed)
                .GroupBy(a => a.Timestamp.Date)
                .ToDictionary(g => g.Key, g => g.Count());

            var clickThroughRate = totalViews > 0 ? (double)totalClicks / totalViews : 0;
            var affiliateConversionRate = totalClicks > 0 ? (double)affiliateClicks / totalClicks : 0;

            return new Dictionary<string, object>
            {
                ["providerId"] = providerId,
                ["dateRange"] = new { from = fromDate, to = toDate },
                ["totalViews"] = totalViews,
                ["totalClicks"] = totalClicks,
                ["affiliateClicks"] = affiliateClicks,
                ["uniqueUsers"] = uniqueUsers,
                ["uniqueSessions"] = uniqueSessions,
                ["clickThroughRate"] = Math.Round(clickThroughRate * 100, 2),
                ["affiliateConversionRate"] = Math.Round(affiliateConversionRate * 100, 2),
                ["dailyViews"] = dailyViews,
                ["topReferrers"] = analytics
                    .Where(a => !string.IsNullOrWhiteSpace(a.Referrer))
                    .GroupBy(a => a.Referrer)
                    .OrderByDescending(g => g.Count())
                    .Take(5)
                    .ToDictionary(g => g.Key!, g => g.Count())
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting provider analytics for {ProviderId}", providerId);
            return new Dictionary<string, object>();
        }
    }

    public async Task<Dictionary<string, object>> GetOverallAnalyticsAsync(
        DateTime fromDate,
        DateTime toDate,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var analytics = await _context.VpnGuidanceAnalytics
                .Where(a => a.Timestamp >= fromDate && a.Timestamp <= toDate)
                .ToListAsync(cancellationToken);

            var totalEvents = analytics.Count;
            var uniqueUsers = analytics.Where(a => a.UserId.HasValue).Select(a => a.UserId).Distinct().Count();
            var uniqueSessions = analytics.Select(a => a.SessionId).Distinct().Count();

            var eventsByType = analytics
                .GroupBy(a => a.EventType)
                .ToDictionary(g => g.Key.ToString(), g => g.Count());

            var dailyActivity = analytics
                .GroupBy(a => a.Timestamp.Date)
                .ToDictionary(g => g.Key, g => g.Count());

            var topProviders = analytics
                .Where(a => a.VpnProviderId.HasValue)
                .GroupBy(a => a.VpnProviderId)
                .OrderByDescending(g => g.Count())
                .Take(10)
                .ToDictionary(g => g.Key!.ToString(), g => g.Count());

            var hourlyDistribution = analytics
                .GroupBy(a => a.Timestamp.Hour)
                .ToDictionary(g => g.Key, g => g.Count());

            return new Dictionary<string, object>
            {
                ["dateRange"] = new { from = fromDate, to = toDate },
                ["totalEvents"] = totalEvents,
                ["uniqueUsers"] = uniqueUsers,
                ["uniqueSessions"] = uniqueSessions,
                ["eventsByType"] = eventsByType,
                ["dailyActivity"] = dailyActivity,
                ["topProviders"] = topProviders,
                ["hourlyDistribution"] = hourlyDistribution,
                ["averageEventsPerUser"] = uniqueUsers > 0 ? Math.Round((double)totalEvents / uniqueUsers, 2) : 0,
                ["averageEventsPerSession"] = uniqueSessions > 0 ? Math.Round((double)totalEvents / uniqueSessions, 2) : 0
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting overall analytics");
            return new Dictionary<string, object>();
        }
    }

    public async Task<Dictionary<string, object>> GetUserEngagementAnalyticsAsync(
        DateTime fromDate,
        DateTime toDate,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var analytics = await _context.VpnGuidanceAnalytics
                .Where(a => a.Timestamp >= fromDate && a.Timestamp <= toDate && a.UserId.HasValue)
                .ToListAsync(cancellationToken);

            var userEngagement = analytics
                .GroupBy(a => a.UserId)
                .Select(g => new
                {
                    UserId = g.Key,
                    EventCount = g.Count(),
                    UniqueProviders = g.Where(x => x.VpnProviderId.HasValue).Select(x => x.VpnProviderId).Distinct().Count(),
                    HasRated = g.Any(x => x.EventType == VpnGuidanceEventType.ProviderRated),
                    HasClickedAffiliate = g.Any(x => x.EventType == VpnGuidanceEventType.AffiliateClicked),
                    FirstActivity = g.Min(x => x.Timestamp),
                    LastActivity = g.Max(x => x.Timestamp)
                })
                .ToList();

            var engagementLevels = new Dictionary<string, int>
            {
                ["Low (1-2 events)"] = userEngagement.Count(u => u.EventCount <= 2),
                ["Medium (3-10 events)"] = userEngagement.Count(u => u.EventCount >= 3 && u.EventCount <= 10),
                ["High (11+ events)"] = userEngagement.Count(u => u.EventCount > 10)
            };

            var conversionMetrics = new Dictionary<string, object>
            {
                ["totalUsers"] = userEngagement.Count,
                ["usersWhoRated"] = userEngagement.Count(u => u.HasRated),
                ["usersWhoClickedAffiliate"] = userEngagement.Count(u => u.HasClickedAffiliate),
                ["ratingConversionRate"] = userEngagement.Count > 0 
                    ? Math.Round((double)userEngagement.Count(u => u.HasRated) / userEngagement.Count * 100, 2) 
                    : 0,
                ["affiliateConversionRate"] = userEngagement.Count > 0 
                    ? Math.Round((double)userEngagement.Count(u => u.HasClickedAffiliate) / userEngagement.Count * 100, 2) 
                    : 0
            };

            var sessionDurations = analytics
                .Where(a => !string.IsNullOrWhiteSpace(a.SessionId))
                .GroupBy(a => a.SessionId)
                .Select(g => new
                {
                    SessionId = g.Key,
                    Duration = g.Max(x => x.Timestamp) - g.Min(x => x.Timestamp),
                    EventCount = g.Count()
                })
                .Where(s => s.Duration.TotalMinutes > 0)
                .ToList();

            return new Dictionary<string, object>
            {
                ["dateRange"] = new { from = fromDate, to = toDate },
                ["engagementLevels"] = engagementLevels,
                ["conversionMetrics"] = conversionMetrics,
                ["averageEventsPerUser"] = userEngagement.Count > 0 
                    ? Math.Round(userEngagement.Average(u => u.EventCount), 2) 
                    : 0,
                ["averageProvidersViewedPerUser"] = userEngagement.Count > 0 
                    ? Math.Round(userEngagement.Average(u => u.UniqueProviders), 2) 
                    : 0,
                ["averageSessionDuration"] = sessionDurations.Count > 0 
                    ? Math.Round(sessionDurations.Average(s => s.Duration.TotalMinutes), 2) 
                    : 0,
                ["averageEventsPerSession"] = sessionDurations.Count > 0 
                    ? Math.Round(sessionDurations.Average(s => s.EventCount), 2) 
                    : 0,
                ["returnUsers"] = userEngagement.Count(u => (u.LastActivity - u.FirstActivity).TotalDays > 1)
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting user engagement analytics");
            return new Dictionary<string, object>();
        }
    }

    public async Task<IEnumerable<VpnProviderDto>> GetMostViewedProvidersAsync(
        int count = 10,
        DateTime? fromDate = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var startDate = fromDate ?? DateTime.UtcNow.AddDays(-30);
            
            var providerViews = await _context.VpnGuidanceAnalytics
                .Where(a => a.EventType == VpnGuidanceEventType.ProviderViewed &&
                           a.VpnProviderId.HasValue &&
                           a.Timestamp >= startDate)
                .GroupBy(a => a.VpnProviderId)
                .Select(g => new { ProviderId = g.Key!, ViewCount = g.Count() })
                .OrderByDescending(x => x.ViewCount)
                .Take(count)
                .ToListAsync(cancellationToken);

            var providerIds = providerViews.Select(pv => pv.ProviderId).ToList();
            
            var providers = await _context.VpnProviders
                .Include(p => p.Ratings)
                .Include(p => p.ServerLocations)
                .Include(p => p.StreamingCompatibilities)
                    .ThenInclude(sc => sc.StreamingService)
                .Where(p => providerIds.Contains(p.Id) && p.IsActive)
                .ToListAsync(cancellationToken);

            // Order providers by view count
            var orderedProviders = providerViews
                .Join(providers, pv => pv.ProviderId, p => p.Id, (pv, p) => p)
                .ToList();

            return orderedProviders.Select(MapProviderToDto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting most viewed providers");
            return new List<VpnProviderDto>();
        }
    }

    public async Task<IEnumerable<VpnSetupGuideDto>> GetMostViewedGuidesAsync(
        int count = 10,
        DateTime? fromDate = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var startDate = fromDate ?? DateTime.UtcNow.AddDays(-30);
            
            var guideViews = await _context.VpnGuidanceAnalytics
                .Where(a => a.EventType == VpnGuidanceEventType.GuideViewed &&
                           a.GuideId.HasValue &&
                           a.Timestamp >= startDate)
                .GroupBy(a => a.GuideId)
                .Select(g => new { GuideId = g.Key!, ViewCount = g.Count() })
                .OrderByDescending(x => x.ViewCount)
                .Take(count)
                .ToListAsync(cancellationToken);

            var guideIds = guideViews.Select(gv => gv.GuideId).ToList();
            
            var guides = await _context.VpnSetupGuides
                .Where(g => guideIds.Contains(g.Id) && g.IsActive)
                .ToListAsync(cancellationToken);

            // Order guides by view count
            var orderedGuides = guideViews
                .Join(guides, gv => gv.GuideId, g => g.Id, (gv, g) => g)
                .ToList();

            return orderedGuides.Select(MapGuideToDto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting most viewed guides");
            return new List<VpnSetupGuideDto>();
        }
    }

    public async Task<IEnumerable<VpnBestPracticeDto>> GetMostViewedBestPracticesAsync(
        int count = 10,
        DateTime? fromDate = null,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var startDate = fromDate ?? DateTime.UtcNow.AddDays(-30);
            
            // For best practices, we'll use view count from the entity itself since it's stored there
            var bestPractices = await _context.VpnBestPractices
                .Where(bp => bp.IsActive && bp.UpdatedAt >= startDate)
                .OrderByDescending(bp => bp.ViewCount)
                .ThenByDescending(bp => bp.HelpfulnessRating)
                .Take(count)
                .ToListAsync(cancellationToken);

            return bestPractices.Select(MapBestPracticeToDto);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting most viewed best practices");
            return new List<VpnBestPracticeDto>();
        }
    }

    private VpnProviderDto MapProviderToDto(VpnProvider provider)
    {
        var supportedPlatforms = string.IsNullOrWhiteSpace(provider.SupportedPlatforms)
            ? new List<string>()
            : JsonSerializer.Deserialize<List<string>>(provider.SupportedPlatforms) ?? new List<string>();

        return new VpnProviderDto
        {
            Id = provider.Id,
            Name = provider.Name,
            Description = provider.Description,
            WebsiteUrl = provider.WebsiteUrl,
            AffiliateUrl = provider.AffiliateUrl,
            LogoUrl = provider.LogoUrl,
            MonthlyPrice = provider.MonthlyPrice,
            AnnualPrice = provider.AnnualPrice,
            HasFreeTrial = provider.HasFreeTrial,
            FreeTrialDays = provider.FreeTrialDays,
            ServerCount = provider.ServerCount,
            CountryCount = provider.CountryCount,
            SupportsP2P = provider.SupportsP2P,
            SupportsStreaming = provider.SupportsStreaming,
            HasKillSwitch = provider.HasKillSwitch,
            HasNoLogsPolicy = provider.HasNoLogsPolicy,
            MaxSimultaneousConnections = provider.MaxSimultaneousConnections,
            SupportedPlatforms = supportedPlatforms,
            OverallRating = provider.OverallRating,
            TotalRatings = provider.TotalRatings,
            IsFeatured = provider.IsFeatured
        };
    }

    private VpnSetupGuideDto MapGuideToDto(VpnSetupGuide guide)
    {
        return new VpnSetupGuideDto
        {
            Id = guide.Id,
            VpnProviderId = guide.VpnProviderId,
            Title = guide.Title,
            Platform = guide.Platform,
            Content = guide.Content,
            StepCount = guide.StepCount,
            EstimatedTime = guide.EstimatedTime,
            Difficulty = guide.Difficulty,
            Prerequisites = guide.Prerequisites,
            TroubleshootingTips = guide.TroubleshootingTips,
            HelpfulnessRating = guide.HelpfulnessRating,
            HelpfulnessVotes = guide.HelpfulnessVotes
        };
    }

    private VpnBestPracticeDto MapBestPracticeToDto(VpnBestPractice practice)
    {
        var tags = string.IsNullOrWhiteSpace(practice.Tags)
            ? new List<string>()
            : JsonSerializer.Deserialize<List<string>>(practice.Tags) ?? new List<string>();

        return new VpnBestPracticeDto
        {
            Id = practice.Id,
            Title = practice.Title,
            Summary = practice.Summary,
            Content = practice.Content,
            Category = practice.Category,
            ImportanceLevel = practice.ImportanceLevel,
            Tags = tags,
            HelpfulnessRating = practice.HelpfulnessRating,
            HelpfulnessVotes = practice.HelpfulnessVotes
        };
    }
}
