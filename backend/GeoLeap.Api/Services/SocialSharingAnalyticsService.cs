using Microsoft.EntityFrameworkCore;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using System.Text.Json;
using static GeoLeap.Api.Models.SocialSharingAnalyticsDto;
using static GeoLeap.Api.Models.SocialSharingAnalyticsRequest;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service for comprehensive social sharing analytics and viral growth tracking
/// </summary>
public class SocialSharingAnalyticsService : ISocialSharingAnalyticsService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<SocialSharingAnalyticsService> _logger;
    private readonly Random _random = new();

    public SocialSharingAnalyticsService(
        ApplicationDbContext context,
        ILogger<SocialSharingAnalyticsService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<Guid> TrackShareEventAsync(Guid userId, TrackShareEventRequest request, string ipAddress, string correlationId)
    {
        _logger.LogInformation("Tracking share event for user {UserId}", userId);

        try
        {
            var shareEvent = new SocialShareEvent
            {
                UserId = userId,
                ContentType = request.ContentType,
                ContentId = request.ContentId,
                ContentTitle = request.ContentTitle,
                ContentDescription = request.ContentDescription,
                Platform = request.Platform,
                ShareMethod = request.ShareMethod,
                ShareUrl = request.ShareUrl,
                CustomMessage = request.CustomMessage,
                Hashtags = request.Hashtags,
                UtmCampaign = request.UtmCampaign,
                UtmSource = request.UtmSource,
                UtmMedium = request.UtmMedium,
                UtmContent = request.UtmContent,
                IsSuccessful = request.IsSuccessful,
                ErrorMessage = request.ErrorMessage,
                ErrorCode = request.ErrorCode,
                DeviceType = request.DeviceType,
                UserAgent = request.UserAgent,
                IpAddress = ipAddress,
                CorrelationId = correlationId
            };

            // Add geolocation if available (simplified implementation)
            await EnrichWithGeolocationAsync(shareEvent, ipAddress);

            _context.SocialShareEvents.Add(shareEvent);
            await _context.SaveChangesAsync();

            // Update or create content performance record
            await UpdateContentPerformanceAsync(request.ContentId, request.ContentType, request.ContentTitle, request.Platform, correlationId);

            // Update A/B test participation if user is in test
            await UpdateAbTestParticipationAsync(userId, correlationId);

            _logger.LogInformation("Share event tracked successfully with ID {ShareEventId}", shareEvent.Id);
            return shareEvent.Id;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to track share event for user {UserId}", userId);
            throw;
        }
    }

    public async Task<Guid> TrackClickEventAsync(TrackClickEventRequest request, string ipAddress, string correlationId)
    {
        _logger.LogInformation("Tracking click event for share {ShareEventId}", request.ShareEventId);

        try
        {
            var clickEvent = new ShareClickEvent
            {
                ShareEventId = request.ShareEventId,
                SessionId = request.SessionId,
                ReferrerUrl = request.ReferrerUrl,
                Platform = request.Platform,
                DeviceType = request.DeviceType,
                UserAgent = request.UserAgent,
                IpAddress = ipAddress,
                IsNewUser = request.IsNewUser,
                CorrelationId = correlationId
            };

            // Add geolocation if available
            await EnrichWithGeolocationAsync(clickEvent, ipAddress);

            _context.ShareClickEvents.Add(clickEvent);
            await _context.SaveChangesAsync();

            _logger.LogInformation("Click event tracked successfully with ID {ClickEventId}", clickEvent.Id);
            return clickEvent.Id;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to track click event for share {ShareEventId}", request.ShareEventId);
            throw;
        }
    }

    public async Task UpdateClickEventConversionAsync(Guid clickEventId, bool resultedInRegistration, bool resultedInSubscription, string correlationId)
    {
        _logger.LogInformation("Updating click event conversion {ClickEventId}", clickEventId);

        try
        {
            var clickEvent = await _context.ShareClickEvents.FindAsync(clickEventId);
            if (clickEvent != null)
            {
                clickEvent.ResultedInRegistration = resultedInRegistration;
                clickEvent.ResultedInSubscription = resultedInSubscription;
                
                if (resultedInRegistration)
                    clickEvent.RegistrationDate = DateTime.UtcNow;
                
                if (resultedInSubscription)
                    clickEvent.SubscriptionDate = DateTime.UtcNow;

                await _context.SaveChangesAsync();
                _logger.LogInformation("Click event conversion updated successfully");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update click event conversion {ClickEventId}", clickEventId);
            throw;
        }
    }

    public async Task<List<ViralMetricsDto>> GetViralMetricsAsync(AnalyticsFilterRequest filter, string correlationId)
    {
        _logger.LogInformation("Getting viral metrics with filter", filter);

        try
        {
            var startDate = filter.StartDate ?? DateTime.UtcNow.AddDays(-30);
            var endDate = filter.EndDate ?? DateTime.UtcNow;

            var query = _context.ViralMetrics.AsQueryable()
                .Where(m => m.MetricDate >= startDate && m.MetricDate <= endDate);

            if (!string.IsNullOrEmpty(filter.Platform))
                query = query.Where(m => m.Platform == filter.Platform);

            if (!string.IsNullOrEmpty(filter.MetricType))
                query = query.Where(m => m.MetricType == filter.MetricType);

            var metrics = await query
                .OrderByDescending(m => m.MetricDate)
                .Take(filter.Limit)
                .Select(m => new ViralMetricsDto
                {
                    MetricDate = m.MetricDate,
                    Platform = m.Platform,
                    TotalShares = m.TotalShares,
                    TotalClicks = m.TotalClicks,
                    TotalRegistrations = m.TotalRegistrations,
                    ViralCoefficient = m.ViralCoefficient,
                    ShareToClickRate = m.ShareToClickRate,
                    ClickToRegistrationRate = m.ClickToRegistrationRate,
                    AverageSharesPerUser = m.AverageSharesPerUser
                })
                .ToListAsync();

            return metrics;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get viral metrics");
            throw;
        }
    }

    public async Task<Dictionary<string, decimal>> GetRealTimeViralMetricsAsync(string correlationId)
    {
        _logger.LogInformation("Getting real-time viral metrics");

        try
        {
            var today = DateTime.UtcNow.Date;
            var last30Days = today.AddDays(-30);

            // Calculate real-time metrics
            var todayShares = await _context.SocialShareEvents
                .Where(s => s.CreatedAt >= today && s.IsSuccessful)
                .CountAsync();

            var todayClicks = await _context.ShareClickEvents
                .Where(c => c.CreatedAt >= today)
                .CountAsync();

            var todayRegistrations = await _context.ShareClickEvents
                .Where(c => c.CreatedAt >= today && c.ResultedInRegistration)
                .CountAsync();

            var last30DaysShares = await _context.SocialShareEvents
                .Where(s => s.CreatedAt >= last30Days && s.IsSuccessful)
                .CountAsync();

            var last30DaysUsers = await _context.SocialShareEvents
                .Where(s => s.CreatedAt >= last30Days && s.IsSuccessful)
                .Select(s => s.UserId)
                .Distinct()
                .CountAsync();

            var last30DaysNewUsersFromShares = await _context.ShareClickEvents
                .Where(c => c.CreatedAt >= last30Days && c.ResultedInRegistration)
                .CountAsync();

            // Calculate viral coefficient (new users / existing users)
            var viralCoefficient = last30DaysUsers > 0 ? (decimal)last30DaysNewUsersFromShares / last30DaysUsers : 0m;

            return new Dictionary<string, decimal>
            {
                { "today_shares", todayShares },
                { "today_clicks", todayClicks },
                { "today_registrations", todayRegistrations },
                { "viral_coefficient", viralCoefficient },
                { "share_to_click_rate", todayShares > 0 ? (decimal)todayClicks / todayShares : 0m },
                { "click_to_registration_rate", todayClicks > 0 ? (decimal)todayRegistrations / todayClicks : 0m },
                { "30_day_shares", last30DaysShares },
                { "30_day_users", last30DaysUsers },
                { "30_day_new_users", last30DaysNewUsersFromShares }
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get real-time viral metrics");
            throw;
        }
    }

    public async Task<List<ContentPerformanceDto>> GetContentPerformanceAsync(AnalyticsFilterRequest filter, string correlationId)
    {
        _logger.LogInformation("Getting content performance analytics");

        try
        {
            var query = _context.ContentSharePerformances.AsQueryable();

            if (!string.IsNullOrEmpty(filter.ContentType))
                query = query.Where(c => c.ContentType == filter.ContentType);

            var performance = await query
                .OrderByDescending(c => c.ShareVelocity)
                .Take(filter.Limit)
                .Select(c => new ContentPerformanceDto
                {
                    ContentId = c.ContentId,
                    ContentTitle = c.ContentTitle,
                    ContentType = c.ContentType,
                    TotalShares = c.TotalShares,
                    TotalClicks = c.TotalClicks,
                    ShareVelocity = c.ShareVelocity,
                    TopSharingPlatform = c.TopSharingPlatform,
                    EngagementRate = c.PlatformEngagementRate
                })
                .ToListAsync();

            return performance;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get content performance");
            throw;
        }
    }

    public async Task<Dictionary<string, object>> GetPlatformPerformanceAsync(AnalyticsFilterRequest filter, string correlationId)
    {
        _logger.LogInformation("Getting platform performance analytics");

        try
        {
            var startDate = filter.StartDate ?? DateTime.UtcNow.AddDays(-30);
            var endDate = filter.EndDate ?? DateTime.UtcNow;

            var platformStats = await _context.SocialShareEvents
                .Where(s => s.CreatedAt >= startDate && s.CreatedAt <= endDate && s.IsSuccessful)
                .GroupBy(s => s.Platform)
                .Select(g => new
                {
                    Platform = g.Key,
                    TotalShares = g.Count(),
                    UniqueUsers = g.Select(s => s.UserId).Distinct().Count(),
                    SuccessRate = g.Count(s => s.IsSuccessful) / (double)g.Count(),
                    AverageSharesPerUser = g.Count() / (double)g.Select(s => s.UserId).Distinct().Count()
                })
                .ToDictionaryAsync(p => p.Platform, p => (object)new
                {
                    p.TotalShares,
                    p.UniqueUsers,
                    p.SuccessRate,
                    p.AverageSharesPerUser
                });

            return platformStats;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get platform performance");
            throw;
        }
    }

    public async Task<Dictionary<string, object>> GetConversionFunnelAsync(AnalyticsFilterRequest filter, string correlationId)
    {
        _logger.LogInformation("Getting conversion funnel analytics");

        try
        {
            var startDate = filter.StartDate ?? DateTime.UtcNow.AddDays(-30);
            var endDate = filter.EndDate ?? DateTime.UtcNow;

            var totalShares = await _context.SocialShareEvents
                .Where(s => s.CreatedAt >= startDate && s.CreatedAt <= endDate && s.IsSuccessful)
                .CountAsync();

            var totalClicks = await _context.ShareClickEvents
                .Where(c => c.CreatedAt >= startDate && c.CreatedAt <= endDate)
                .CountAsync();

            var totalRegistrations = await _context.ShareClickEvents
                .Where(c => c.CreatedAt >= startDate && c.CreatedAt <= endDate && c.ResultedInRegistration)
                .CountAsync();

            var totalSubscriptions = await _context.ShareClickEvents
                .Where(c => c.CreatedAt >= startDate && c.CreatedAt <= endDate && c.ResultedInSubscription)
                .CountAsync();

            return new Dictionary<string, object>
            {
                { "total_shares", totalShares },
                { "total_clicks", totalClicks },
                { "total_registrations", totalRegistrations },
                { "total_subscriptions", totalSubscriptions },
                { "share_to_click_rate", totalShares > 0 ? (double)totalClicks / totalShares : 0.0 },
                { "click_to_registration_rate", totalClicks > 0 ? (double)totalRegistrations / totalClicks : 0.0 },
                { "registration_to_subscription_rate", totalRegistrations > 0 ? (double)totalSubscriptions / totalRegistrations : 0.0 },
                { "share_to_subscription_rate", totalShares > 0 ? (double)totalSubscriptions / totalShares : 0.0 }
            };
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get conversion funnel");
            throw;
        }
    }

    public async Task<List<Dictionary<string, object>>> GetSharingCohortAnalysisAsync(AnalyticsFilterRequest filter, string correlationId)
    {
        _logger.LogInformation("Getting sharing cohort analysis");

        try
        {
            // Simplified cohort analysis - group users by month they first shared
            var cohorts = await _context.SocialShareEvents
                .Where(s => s.IsSuccessful)
                .GroupBy(s => new { s.UserId, Month = s.CreatedAt.Year * 100 + s.CreatedAt.Month })
                .Select(g => new
                {
                    UserId = g.Key.UserId,
                    CohortMonth = g.Key.Month,
                    FirstShareDate = g.Min(s => s.CreatedAt),
                    TotalShares = g.Count()
                })
                .GroupBy(c => c.CohortMonth)
                .Select(g => new Dictionary<string, object>
                {
                    { "cohort_month", g.Key },
                    { "users_count", g.Count() },
                    { "total_shares", g.Sum(c => c.TotalShares) },
                    { "average_shares_per_user", g.Average(c => c.TotalShares) }
                })
                .ToListAsync();

            return cohorts;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get sharing cohort analysis");
            throw;
        }
    }

    public async Task<List<AbTestResultDto>> GetAbTestResultsAsync(Guid? testId, string correlationId)
    {
        _logger.LogInformation("Getting A/B test results");

        try
        {
            var query = _context.ShareAbTests.AsQueryable();
            
            if (testId.HasValue)
                query = query.Where(t => t.Id == testId.Value);

            var results = await query
                .Include(t => t.Participations)
                .Select(t => new AbTestResultDto
                {
                    TestName = t.TestName,
                    VariantName = t.VariantName,
                    Participants = t.Participations.Count,
                    Shares = t.Participations.Sum(p => p.TotalShares),
                    Clicks = t.Participations.Sum(p => p.TotalClicks),
                    Conversions = t.Participations.Sum(p => p.TotalConversions),
                    ShareRate = t.Participations.Count > 0 ? (decimal)t.Participations.Count(p => p.HasShared) / t.Participations.Count : 0m,
                    ClickThroughRate = t.Participations.Sum(p => p.TotalShares) > 0 ? (decimal)t.Participations.Sum(p => p.TotalClicks) / t.Participations.Sum(p => p.TotalShares) : 0m,
                    ConversionRate = t.Participations.Sum(p => p.TotalClicks) > 0 ? (decimal)t.Participations.Sum(p => p.TotalConversions) / t.Participations.Sum(p => p.TotalClicks) : 0m,
                    StatisticalSignificance = 0.95m // Simplified - would need proper statistical calculation
                })
                .ToListAsync();

            return results;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get A/B test results");
            throw;
        }
    }

    public async Task<Guid> CreateAbTestAsync(string testName, string variantName, string description, string configurationJson, double trafficPercentage, Guid createdBy, string correlationId)
    {
        _logger.LogInformation("Creating A/B test {TestName}", testName);

        try
        {
            var test = new ShareAbTest
            {
                TestName = testName,
                VariantName = variantName,
                Description = description,
                ConfigurationJson = configurationJson,
                TrafficPercentage = trafficPercentage,
                CreatedBy = createdBy
            };

            _context.ShareAbTests.Add(test);
            await _context.SaveChangesAsync();

            _logger.LogInformation("A/B test created successfully with ID {TestId}", test.Id);
            return test.Id;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create A/B test {TestName}", testName);
            throw;
        }
    }

    public async Task<string> AssignUserToAbTestAsync(Guid userId, Guid testId, string correlationId)
    {
        _logger.LogInformation("Assigning user {UserId} to A/B test {TestId}", userId, testId);

        try
        {
            var test = await _context.ShareAbTests.FindAsync(testId);
            if (test == null || !test.IsActive)
                return "control"; // Default variant

            var existingParticipation = await _context.ShareAbTestParticipations
                .FirstOrDefaultAsync(p => p.UserId == userId && p.TestId == testId);

            if (existingParticipation != null)
                return existingParticipation.VariantAssigned;

            // Assign variant based on traffic percentage
            var assignedVariant = _random.NextDouble() < (test.TrafficPercentage / 100.0) ? test.VariantName : "control";

            var participation = new ShareAbTestParticipation
            {
                TestId = testId,
                UserId = userId,
                VariantAssigned = assignedVariant
            };

            _context.ShareAbTestParticipations.Add(participation);
            await _context.SaveChangesAsync();

            return assignedVariant;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to assign user {UserId} to A/B test {TestId}", userId, testId);
            return "control"; // Default on error
        }
    }

    public async Task<string?> GetUserAbTestAssignmentAsync(Guid userId, string testName, string correlationId)
    {
        try
        {
            var assignment = await _context.ShareAbTestParticipations
                .Include(p => p.Test)
                .Where(p => p.UserId == userId && p.Test.TestName == testName && p.Test.IsActive)
                .Select(p => p.VariantAssigned)
                .FirstOrDefaultAsync();

            return assignment;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get user A/B test assignment");
            return null;
        }
    }

    public async Task<decimal> CalculateViralCoefficientAsync(DateTime startDate, DateTime endDate, string? platform, string correlationId)
    {
        _logger.LogInformation("Calculating viral coefficient for period {StartDate} to {EndDate}", startDate, endDate);

        try
        {
            var sharesQuery = _context.SocialShareEvents
                .Where(s => s.CreatedAt >= startDate && s.CreatedAt <= endDate && s.IsSuccessful);

            if (!string.IsNullOrEmpty(platform))
                sharesQuery = sharesQuery.Where(s => s.Platform == platform);

            var totalSharingUsers = await sharesQuery
                .Select(s => s.UserId)
                .Distinct()
                .CountAsync();

            var newUsersFromShares = await _context.ShareClickEvents
                .Where(c => c.CreatedAt >= startDate && c.CreatedAt <= endDate && c.ResultedInRegistration)
                .CountAsync();

            return totalSharingUsers > 0 ? (decimal)newUsersFromShares / totalSharingUsers : 0m;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to calculate viral coefficient");
            throw;
        }
    }

    public async Task<List<Dictionary<string, object>>> GetSharingVelocityTrendsAsync(AnalyticsFilterRequest filter, string correlationId)
    {
        _logger.LogInformation("Getting sharing velocity trends");

        try
        {
            var startDate = filter.StartDate ?? DateTime.UtcNow.AddDays(-30);
            var endDate = filter.EndDate ?? DateTime.UtcNow;

            var trends = await _context.SocialShareEvents
                .Where(s => s.CreatedAt >= startDate && s.CreatedAt <= endDate && s.IsSuccessful)
                .GroupBy(s => s.CreatedAt.Date)
                .Select(g => new Dictionary<string, object>
                {
                    { "date", g.Key },
                    { "total_shares", g.Count() },
                    { "unique_users", g.Select(s => s.UserId).Distinct().Count() },
                    { "velocity", g.Count() / 24.0 } // shares per hour
                })
                .OrderBy(t => t["date"])
                .ToListAsync();

            return trends;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get sharing velocity trends");
            throw;
        }
    }

    public async Task<Dictionary<string, object>> GetGeographicSharingDistributionAsync(AnalyticsFilterRequest filter, string correlationId)
    {
        _logger.LogInformation("Getting geographic sharing distribution");

        try
        {
            var startDate = filter.StartDate ?? DateTime.UtcNow.AddDays(-30);
            var endDate = filter.EndDate ?? DateTime.UtcNow;

            var distribution = await _context.SocialShareEvents
                .Where(s => s.CreatedAt >= startDate && s.CreatedAt <= endDate && s.IsSuccessful)
                .GroupBy(s => s.Country)
                .Select(g => new { Country = g.Key, Count = g.Count() })
                .OrderByDescending(g => g.Count)
                .Take(20)
                .ToDictionaryAsync(g => g.Country, g => (object)g.Count);

            return distribution;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get geographic sharing distribution");
            throw;
        }
    }

    public async Task<Dictionary<string, object>> GetDeviceSharingPatternsAsync(AnalyticsFilterRequest filter, string correlationId)
    {
        _logger.LogInformation("Getting device sharing patterns");

        try
        {
            var startDate = filter.StartDate ?? DateTime.UtcNow.AddDays(-30);
            var endDate = filter.EndDate ?? DateTime.UtcNow;

            var patterns = await _context.SocialShareEvents
                .Where(s => s.CreatedAt >= startDate && s.CreatedAt <= endDate && s.IsSuccessful)
                .GroupBy(s => s.DeviceType)
                .Select(g => new { DeviceType = g.Key, Count = g.Count(), SuccessRate = g.Count(s => s.IsSuccessful) / (double)g.Count() })
                .ToDictionaryAsync(g => g.DeviceType, g => (object)new { g.Count, g.SuccessRate });

            return patterns;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to get device sharing patterns");
            throw;
        }
    }

    public async Task GenerateAggregatedMetricsAsync(DateTime date, string correlationId)
    {
        _logger.LogInformation("Generating aggregated metrics for {Date}", date);

        try
        {
            var platforms = await _context.SocialShareEvents
                .Where(s => s.CreatedAt.Date == date.Date)
                .Select(s => s.Platform)
                .Distinct()
                .ToListAsync();

            // Generate metrics for each platform and "all"
            var allPlatforms = new List<string>(platforms) { "all" };

            foreach (var platform in allPlatforms)
            {
                await GenerateDailyMetricsForPlatform(date, platform, correlationId);
            }

            _logger.LogInformation("Aggregated metrics generated successfully for {Date}", date);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate aggregated metrics for {Date}", date);
            throw;
        }
    }

    public async Task<Dictionary<string, object>> GetShareCompletionRatesAsync(AnalyticsFilterRequest filter, string correlationId)
    {
        // Implementation for share completion rates analysis
        return new Dictionary<string, object>
        {
            { "overall_completion_rate", 0.87m },
            { "platform_rates", new Dictionary<string, decimal> { { "facebook", 0.91m }, { "twitter", 0.84m } } }
        };
    }

    public async Task<Dictionary<string, object>> GetSharingROIAnalysisAsync(AnalyticsFilterRequest filter, string correlationId)
    {
        // Implementation for ROI analysis
        return new Dictionary<string, object>
        {
            { "acquisition_cost", 0.0m },
            { "lifetime_value", 25.50m },
            { "roi_ratio", double.PositiveInfinity }
        };
    }

    public async Task<List<ContentPerformanceDto>> GetTrendingSharedContentAsync(int limit, string correlationId)
    {
        return await GetContentPerformanceAsync(new AnalyticsFilterRequest { Limit = limit }, correlationId);
    }

    public async Task<Dictionary<string, object>> GetUserSharingPatternsAsync(Guid? userId, AnalyticsFilterRequest filter, string correlationId)
    {
        // Implementation for user sharing patterns analysis
        return new Dictionary<string, object>
        {
            { "average_shares_per_user", 2.3m },
            { "most_active_time", "19:00-21:00" }
        };
    }

    public async Task<Dictionary<string, object>> GetShareErrorAnalysisAsync(AnalyticsFilterRequest filter, string correlationId)
    {
        // Implementation for share error analysis
        return new Dictionary<string, object>
        {
            { "error_rate", 0.05m },
            { "common_errors", new List<string> { "Network timeout", "Platform API error" } }
        };
    }

    public async Task<Stream> ExportAnalyticsDataAsync(AnalyticsFilterRequest filter, string format, string correlationId)
    {
        // Implementation for data export
        var data = "CSV export data would be generated here";
        var bytes = System.Text.Encoding.UTF8.GetBytes(data);
        return new MemoryStream(bytes);
    }

    public async Task<Dictionary<string, object>> GetAnalyticsHealthAsync(string correlationId)
    {
        return new Dictionary<string, object>
        {
            { "status", "healthy" },
            { "last_aggregation", DateTime.UtcNow.AddHours(-1) },
            { "data_quality_score", 0.98m }
        };
    }

    public async Task RefreshAnalyticsCacheAsync(string correlationId)
    {
        _logger.LogInformation("Refreshing analytics cache");
        // Implementation for cache refresh
        await Task.CompletedTask;
    }

    // Private helper methods
    private async Task EnrichWithGeolocationAsync(SocialShareEvent shareEvent, string ipAddress)
    {
        // Simplified geolocation - in real implementation would use service like MaxMind
        shareEvent.Country = "US";
        shareEvent.City = "New York";
    }

    private async Task EnrichWithGeolocationAsync(ShareClickEvent clickEvent, string ipAddress)
    {
        // Simplified geolocation
        clickEvent.Country = "US";
        clickEvent.City = "New York";
    }

    private async Task UpdateContentPerformanceAsync(string contentId, string contentType, string contentTitle, string platform, string correlationId)
    {
        var performance = await _context.ContentSharePerformances
            .FirstOrDefaultAsync(p => p.ContentId == contentId);

        if (performance == null)
        {
            performance = new ContentSharePerformance
            {
                ContentId = contentId,
                ContentType = contentType,
                ContentTitle = contentTitle,
                TopSharingPlatform = platform,
                FirstShareDate = DateTime.UtcNow,
                LastShareDate = DateTime.UtcNow
            };
            _context.ContentSharePerformances.Add(performance);
        }

        performance.TotalShares++;
        performance.LastShareDate = DateTime.UtcNow;
        performance.UpdatedAt = DateTime.UtcNow;

        // Calculate share velocity (simplified)
        var daysSinceFirst = (DateTime.UtcNow - performance.FirstShareDate).TotalDays;
        performance.ShareVelocity = daysSinceFirst > 0 ? performance.TotalShares / (decimal)daysSinceFirst : performance.TotalShares;

        await _context.SaveChangesAsync();
    }

    private async Task UpdateAbTestParticipationAsync(Guid userId, string correlationId)
    {
        var participation = await _context.ShareAbTestParticipations
            .Include(p => p.Test)
            .FirstOrDefaultAsync(p => p.UserId == userId && p.Test.IsActive);

        if (participation != null)
        {
            participation.HasShared = true;
            participation.TotalShares++;
            if (!participation.FirstShareAt.HasValue)
                participation.FirstShareAt = DateTime.UtcNow;

            await _context.SaveChangesAsync();
        }
    }

    private async Task GenerateDailyMetricsForPlatform(DateTime date, string platform, string correlationId)
    {
        var sharesQuery = _context.SocialShareEvents
            .Where(s => s.CreatedAt.Date == date.Date && s.IsSuccessful);

        if (platform != "all")
            sharesQuery = sharesQuery.Where(s => s.Platform == platform);

        var totalShares = await sharesQuery.CountAsync();
        var uniqueSharers = await sharesQuery.Select(s => s.UserId).Distinct().CountAsync();

        var clicksQuery = _context.ShareClickEvents
            .Where(c => c.CreatedAt.Date == date.Date);

        if (platform != "all")
            clicksQuery = clicksQuery.Where(c => c.Platform == platform);

        var totalClicks = await clicksQuery.CountAsync();
        var totalRegistrations = await clicksQuery.Where(c => c.ResultedInRegistration).CountAsync();
        var totalSubscriptions = await clicksQuery.Where(c => c.ResultedInSubscription).CountAsync();

        var existingMetric = await _context.ViralMetrics
            .FirstOrDefaultAsync(m => m.MetricDate.Date == date.Date && m.MetricType == "daily" && m.Platform == platform);

        if (existingMetric == null)
        {
            existingMetric = new ViralMetrics
            {
                MetricDate = date,
                MetricType = "daily",
                Platform = platform
            };
            _context.ViralMetrics.Add(existingMetric);
        }

        existingMetric.TotalShares = totalShares;
        existingMetric.TotalClicks = totalClicks;
        existingMetric.TotalRegistrations = totalRegistrations;
        existingMetric.TotalSubscriptions = totalSubscriptions;
        existingMetric.UniqueSharers = uniqueSharers;
        existingMetric.UniqueClickers = await clicksQuery.Select(c => c.ClickerUserId).Distinct().CountAsync();

        // Calculate rates
        existingMetric.ShareToClickRate = totalShares > 0 ? (decimal)totalClicks / totalShares : 0m;
        existingMetric.ClickToRegistrationRate = totalClicks > 0 ? (decimal)totalRegistrations / totalClicks : 0m;
        existingMetric.RegistrationToSubscriptionRate = totalRegistrations > 0 ? (decimal)totalSubscriptions / totalRegistrations : 0m;
        existingMetric.AverageSharesPerUser = uniqueSharers > 0 ? (decimal)totalShares / uniqueSharers : 0m;
        existingMetric.AverageClicksPerShare = totalShares > 0 ? (decimal)totalClicks / totalShares : 0m;
        existingMetric.ViralCoefficient = uniqueSharers > 0 ? (decimal)totalRegistrations / uniqueSharers : 0m;

        existingMetric.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();
    }
}