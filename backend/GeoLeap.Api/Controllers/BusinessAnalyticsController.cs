using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using GeoLeap.Api.Attributes;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using System.Security.Claims;
using System.Globalization;
using System.Text;
using Microsoft.EntityFrameworkCore;
using GeoLeap.Api.Data;

namespace GeoLeap.Api.Controllers;

[ApiController]
[Route("api/business/analytics")]
[Authorize]
[RequirePermission("admin", "analytics:view")]
public class BusinessAnalyticsController : ControllerBase
{
    private readonly IBusinessMetricsService _businessMetrics;
    private readonly IAdvancedAdminUserService _userService;
    private readonly ISubscriptionAnalyticsService _subscriptionAnalytics;
    private readonly IContentService _contentService;
    private readonly ApplicationDbContext _context;
    private readonly ILogger<BusinessAnalyticsController> _logger;

    public BusinessAnalyticsController(
        IBusinessMetricsService businessMetrics,
        IAdvancedAdminUserService userService,
        ISubscriptionAnalyticsService subscriptionAnalytics,
        IContentService contentService,
        ApplicationDbContext context,
        ILogger<BusinessAnalyticsController> logger)
    {
        _businessMetrics = businessMetrics;
        _userService = userService;
        _subscriptionAnalytics = subscriptionAnalytics;
        _contentService = contentService;
        _context = context;
        _logger = logger;
    }

    /// <summary>
    /// Get comprehensive business analytics dashboard data
    /// </summary>
    [HttpGet("dashboard")]
    public async Task<ActionResult<BusinessAnalyticsDashboardResponse>> GetDashboardAnalytics(
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        [FromQuery] string timeframe = "last30days")
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var (start, end) = CalculateDateRange(startDate, endDate, timeframe);
            
            _logger.LogInformation("Getting business analytics dashboard data", 
                new { CorrelationId = correlationId, StartDate = start, EndDate = end });

            var dashboardData = new BusinessAnalyticsDashboardResponse
            {
                TimeFrame = new AnalyticsTimeFrame { StartDate = start, EndDate = end },
                UserMetrics = await GetUserMetricsAsync(start, end, correlationId),
                ContentMetrics = await GetContentPerformanceAsync(start, end, correlationId),
                SystemHealth = await GetSystemHealthMetricsAsync(correlationId),
                FinancialMetrics = await GetFinancialMetricsAsync(start, end, correlationId),
                EngagementMetrics = await GetEngagementMetricsAsync(start, end, correlationId),
                ConversionFunnel = await GetConversionFunnelAsync(start, end, correlationId),
                LastUpdated = DateTime.UtcNow
            };

            return Ok(dashboardData);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving business analytics dashboard");
            return StatusCode(500, new { Message = "Failed to retrieve analytics data" });
        }
    }

    /// <summary>
    /// Get detailed user analytics and metrics
    /// </summary>
    [HttpGet("users")]
    public async Task<ActionResult<UserAnalyticsResponse>> GetUserAnalytics(
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        [FromQuery] string granularity = "daily")
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var (start, end) = CalculateDateRange(startDate, endDate, "last30days");
            
            var userMetrics = await GetUserMetricsAsync(start, end, correlationId);
            var userGrowthTrends = await GetUserGrowthTrendsAsync(start, end, granularity, correlationId);
            var cohortAnalysis = await GetCohortAnalysisAsync(start, end, correlationId);
            
            var response = new UserAnalyticsResponse
            {
                TimeFrame = new AnalyticsTimeFrame { StartDate = start, EndDate = end },
                Metrics = userMetrics,
                GrowthTrends = userGrowthTrends,
                CohortAnalysis = cohortAnalysis,
                Demographics = await GetUserDemographicsAsync(start, end, correlationId)
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving user analytics");
            return StatusCode(500, new { Message = "Failed to retrieve user analytics" });
        }
    }

    /// <summary>
    /// Get content performance analytics
    /// </summary>
    [HttpGet("content")]
    public async Task<ActionResult<ContentPerformanceResponse>> GetContentAnalytics(
        [FromQuery] DateTime? startDate = null,
        [FromQuery] DateTime? endDate = null,
        [FromQuery] string contentType = "all")
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var (start, end) = CalculateDateRange(startDate, endDate, "last30days");
            
            var contentMetrics = await GetContentPerformanceAsync(start, end, correlationId);
            var topContent = await GetTopPerformingContentAsync(start, end, contentType, correlationId);
            var searchTrends = await GetContentSearchTrendsAsync(start, end, correlationId);
            
            var response = new ContentPerformanceResponse
            {
                TimeFrame = new AnalyticsTimeFrame { StartDate = start, EndDate = end },
                Metrics = contentMetrics,
                TopPerformingContent = topContent,
                SearchTrends = searchTrends,
                CategoryPerformance = await GetContentCategoryPerformanceAsync(start, end, correlationId)
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving content analytics");
            return StatusCode(500, new { Message = "Failed to retrieve content analytics" });
        }
    }

    /// <summary>
    /// Get system health and performance metrics
    /// </summary>
    [HttpGet("system-health")]
    public async Task<ActionResult<SystemHealthMetrics>> GetSystemHealth()
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var systemHealth = await GetSystemHealthMetricsAsync(correlationId);
            return Ok(systemHealth);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving system health metrics");
            return StatusCode(500, new { Message = "Failed to retrieve system health" });
        }
    }

    /// <summary>
    /// Export analytics data to CSV
    /// </summary>
    [HttpPost("export")]
    public async Task<ActionResult> ExportAnalytics([FromBody] AnalyticsExportRequest request)
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            var (start, end) = CalculateDateRange(request.StartDate, request.EndDate, "last30days");
            
            _logger.LogInformation("Exporting analytics data", 
                new { CorrelationId = correlationId, ExportType = request.ExportType });

            var csvContent = await GenerateAnalyticsCsvAsync(request.ExportType, start, end, correlationId);
            var fileName = $"analytics_{request.ExportType}_{DateTime.UtcNow:yyyyMMdd_HHmmss}.csv";
            
            return File(Encoding.UTF8.GetBytes(csvContent), "text/csv", fileName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error exporting analytics data");
            return StatusCode(500, new { Message = "Failed to export analytics data" });
        }
    }

    /// <summary>
    /// Get real-time analytics summary
    /// </summary>
    [HttpGet("realtime")]
    public async Task<ActionResult<RealTimeAnalyticsResponse>> GetRealTimeAnalytics()
    {
        try
        {
            var correlationId = HttpContext.TraceIdentifier;
            
            var response = new RealTimeAnalyticsResponse
            {
                ActiveUsers = await GetActiveUsersCountAsync(correlationId),
                CurrentSessions = await GetCurrentSessionsCountAsync(correlationId),
                RecentActivities = await GetRecentActivitiesAsync(correlationId),
                SystemStatus = await GetSystemStatusAsync(correlationId),
                Timestamp = DateTime.UtcNow
            };

            return Ok(response);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error retrieving real-time analytics");
            return StatusCode(500, new { Message = "Failed to retrieve real-time analytics" });
        }
    }

    #region Private Helper Methods

    private (DateTime start, DateTime end) CalculateDateRange(DateTime? startDate, DateTime? endDate, string timeframe)
    {
        var now = DateTime.UtcNow;
        var end = endDate ?? now;
        var start = startDate ?? timeframe switch
        {
            "today" => now.Date,
            "yesterday" => now.Date.AddDays(-1),
            "last7days" => now.AddDays(-7),
            "last30days" => now.AddDays(-30),
            "last90days" => now.AddDays(-90),
            "thisMonth" => new DateTime(now.Year, now.Month, 1),
            "lastMonth" => new DateTime(now.Year, now.Month, 1).AddMonths(-1),
            "thisYear" => new DateTime(now.Year, 1, 1),
            _ => now.AddDays(-30)
        };
        
        return (start, end);
    }

    private async Task<UserMetrics> GetUserMetricsAsync(DateTime startDate, DateTime endDate, string correlationId)
    {
        var totalUsers = await _context.Users.CountAsync();
        var newUsers = await _context.Users
            .Where(u => u.CreatedAt >= startDate && u.CreatedAt <= endDate)
            .CountAsync();
        var activeUsers = await _context.Users
            .Where(u => u.LastLoginAt >= startDate && u.LastLoginAt <= endDate)
            .CountAsync();
        var trialUsers = await _context.UserSubscriptions
            .Where(s => s.IsActive && s.SubscriptionType == "trial")
            .CountAsync();
        var paidUsers = await _context.UserSubscriptions
            .Where(s => s.IsActive && s.SubscriptionType != "trial")
            .CountAsync();

        return new UserMetrics
        {
            TotalUsers = totalUsers,
            NewUsers = newUsers,
            ActiveUsers = activeUsers,
            TrialUsers = trialUsers,
            PaidUsers = paidUsers,
            UserRetentionRate = totalUsers > 0 ? (double)activeUsers / totalUsers * 100 : 0,
            TrialConversionRate = trialUsers > 0 ? (double)paidUsers / (trialUsers + paidUsers) * 100 : 0
        };
    }

    private async Task<ContentPerformanceMetrics> GetContentPerformanceAsync(DateTime startDate, DateTime endDate, string correlationId)
    {
        // Query real search analytics from database
        var searchAnalytics = await _context.SearchAnalytics
            .Where(sa => sa.CreatedAt >= startDate && sa.CreatedAt <= endDate)
            .GroupBy(sa => 1)
            .Select(g => new { TotalSearches = g.Count(), AvgResultCount = g.Average(sa => sa.ResultCount) })
            .FirstOrDefaultAsync();

        // Note: TotalContentItems and NewContentAdded are 0 because content is fetched from external APIs
        // (TMDb, Streaming Availability) rather than stored in our database
        return new ContentPerformanceMetrics
        {
            TotalContentItems = 0, // Content sourced from external APIs, not stored locally
            NewContentAdded = 0,   // Content sourced from external APIs, not stored locally
            TotalSearches = searchAnalytics?.TotalSearches ?? 0,
            AverageSearchResults = searchAnalytics?.AvgResultCount ?? 0,
            ContentUtilizationRate = 0 // Cannot calculate without local content storage
        };
    }

    private async Task<SystemHealthMetrics> GetSystemHealthMetricsAsync(string correlationId)
    {
        // Note: Real system health metrics require integration with monitoring services
        // (Application Insights, Prometheus, etc.) which are not currently configured.
        // These metrics would typically come from:
        // - SystemUptime: Azure App Service / hosting platform metrics
        // - AverageResponseTime: Application Insights or custom middleware logging
        // - ErrorRate: Centralized logging aggregation (e.g., Seq, ELK stack)
        // - DatabaseConnectionsActive: SQL Server DMVs or connection pool monitoring
        // - CacheHitRate: Redis INFO command statistics
        // - MemoryUsage/CpuUsage: Host process metrics or container orchestrator
        // - ActiveConnections: SignalR hub context or custom connection tracking
        // - RequestsPerSecond: Rate limiting middleware or APM tools

        return await Task.FromResult(new SystemHealthMetrics
        {
            SystemUptime = 0,              // Requires hosting platform integration
            AverageResponseTime = 0,       // Requires APM/middleware instrumentation
            ErrorRate = 0,                 // Requires centralized logging aggregation
            DatabaseConnectionsActive = 0, // Requires SQL Server monitoring integration
            CacheHitRate = 0,              // Requires Redis statistics integration
            MemoryUsage = 0,               // Requires process metrics collection
            CpuUsage = 0,                  // Requires process metrics collection
            ActiveConnections = 0,         // Requires SignalR/WebSocket tracking
            RequestsPerSecond = 0,         // Requires rate tracking middleware
            LastHealthCheck = DateTime.UtcNow
        });
    }

    private async Task<FinancialMetrics> GetFinancialMetricsAsync(DateTime startDate, DateTime endDate, string correlationId)
    {
        var subscriptionMetrics = await _subscriptionAnalytics
            .CalculateSubscriptionMetricsAsync(startDate, endDate, correlationId);
        
        var paymentTransactions = await _context.PaymentTransactions
            .Where(pt => pt.CreatedAt >= startDate && pt.CreatedAt <= endDate)
            .ToListAsync();
        
        var totalRevenue = paymentTransactions.Sum(pt => pt.Amount);
        var transactionCount = paymentTransactions.Count;
        
        return new FinancialMetrics
        {
            MonthlyRecurringRevenue = subscriptionMetrics.MonthlyRecurringRevenue,
            AnnualRecurringRevenue = subscriptionMetrics.AnnualRecurringRevenue,
            TotalRevenue = totalRevenue,
            TransactionCount = transactionCount,
            AverageTransactionValue = transactionCount > 0 ? totalRevenue / transactionCount : 0,
            ChurnRate = subscriptionMetrics.ChurnRate,
            CustomerLifetimeValue = subscriptionMetrics.CustomerLifetimeValue
        };
    }

    private async Task<EngagementMetrics> GetEngagementMetricsAsync(DateTime startDate, DateTime endDate, string correlationId)
    {
        var sessionCount = await _context.UserSessions
            .Where(us => us.CreatedAt >= startDate && us.CreatedAt <= endDate)
            .CountAsync();

        // Calculate average session duration using client-side evaluation
        // Use EndedAt (the actual DB column) instead of EndTime (computed property)
        var completedSessions = await _context.UserSessions
            .Where(us => us.CreatedAt >= startDate && us.CreatedAt <= endDate && us.EndedAt.HasValue)
            .Select(us => new { us.CreatedAt, us.EndedAt })
            .ToListAsync();

        var avgSessionDuration = completedSessions.Count > 0
            ? completedSessions.Average(us => (us.EndedAt!.Value - us.CreatedAt).TotalMinutes)
            : 0;

        var pageViews = await _context.UserActivities
            .Where(ua => ua.CreatedAt >= startDate && ua.CreatedAt <= endDate && ua.ActivityType == "page_view")
            .CountAsync();

        // Note: BounceRate requires tracking single-page sessions (sessions with only 1 page view)
        // Note: UserEngagementScore requires a weighted formula combining sessions, page views, and actions
        return new EngagementMetrics
        {
            TotalSessions = sessionCount,
            AverageSessionDuration = avgSessionDuration,
            TotalPageViews = pageViews,
            BounceRate = 0, // Requires tracking page views per session - not currently implemented
            UserEngagementScore = 0 // Requires engagement scoring algorithm - not currently implemented
        };
    }

    private async Task<ConversionFunnelData> GetConversionFunnelAsync(DateTime startDate, DateTime endDate, string correlationId)
    {
        var visitors = await _context.Users
            .Where(u => u.CreatedAt >= startDate && u.CreatedAt <= endDate)
            .CountAsync();
        
        var signups = visitors; // All users who created accounts
        var trialStarted = await _context.UserSubscriptions
            .Where(s => s.CreatedAt >= startDate && s.CreatedAt <= endDate && s.SubscriptionType == "trial")
            .CountAsync();
        
        var paidConversions = await _context.UserSubscriptions
            .Where(s => s.CreatedAt >= startDate && s.CreatedAt <= endDate && s.SubscriptionType != "trial")
            .CountAsync();
        
        return new ConversionFunnelData
        {
            Visitors = visitors,
            Signups = signups,
            TrialsStarted = trialStarted,
            PaidConversions = paidConversions,
            ConversionRates = new Dictionary<string, double>
            {
                { "signup_rate", visitors > 0 ? (double)signups / visitors * 100 : 0 },
                { "trial_rate", signups > 0 ? (double)trialStarted / signups * 100 : 0 },
                { "conversion_rate", trialStarted > 0 ? (double)paidConversions / trialStarted * 100 : 0 }
            }
        };
    }

    private async Task<List<UserGrowthTrend>> GetUserGrowthTrendsAsync(DateTime startDate, DateTime endDate, string granularity, string correlationId)
    {
        var trends = new List<UserGrowthTrend>();
        var current = startDate;
        var interval = granularity switch
        {
            "hourly" => TimeSpan.FromHours(1),
            "daily" => TimeSpan.FromDays(1),
            "weekly" => TimeSpan.FromDays(7),
            "monthly" => TimeSpan.FromDays(30),
            _ => TimeSpan.FromDays(1)
        };
        
        while (current <= endDate)
        {
            var nextPeriod = current.Add(interval);
            var newUsers = await _context.Users
                .Where(u => u.CreatedAt >= current && u.CreatedAt < nextPeriod)
                .CountAsync();
            
            trends.Add(new UserGrowthTrend
            {
                Period = current,
                NewUsers = newUsers,
                CumulativeUsers = await _context.Users
                    .Where(u => u.CreatedAt <= nextPeriod)
                    .CountAsync()
            });
            
            current = nextPeriod;
        }
        
        return trends;
    }

    private async Task<CohortAnalysisData> GetCohortAnalysisAsync(DateTime startDate, DateTime endDate, string correlationId)
    {
        // Simplified cohort analysis - would implement full cohort logic
        var cohorts = new List<Models.CohortData>();
        var current = startDate;
        
        while (current <= endDate.AddDays(-7)) // Need at least 7 days for retention
        {
            var cohortUsers = await _context.Users
                .Where(u => u.CreatedAt >= current && u.CreatedAt < current.AddDays(7))
                .ToListAsync();
            
            if (cohortUsers.Any())
            {
                var retainedUsers = cohortUsers
                    .Where(u => u.LastLoginAt >= current.AddDays(7))
                    .Count();
                
                cohorts.Add(new Models.CohortData
                {
                    CohortDate = current,
                    InitialUsers = cohortUsers.Count,
                    RetainedUsers = retainedUsers,
                    RetentionRate = (double)retainedUsers / cohortUsers.Count * 100
                });
            }
            
            current = current.AddDays(7);
        }
        
        return new CohortAnalysisData
        {
            Cohorts = cohorts.Select(sc => new Models.CohortData
            {
                CohortDate = sc.CohortDate,
                InitialUsers = sc.InitialUsers,
                RetainedUsers = sc.RetainedUsers,
                RetentionRate = sc.RetentionRate
            }).ToList(),
            AverageRetentionRate = cohorts.Any() ? cohorts.Average(c => c.RetentionRate) : 0
        };
    }

    private async Task<UserDemographicsData> GetUserDemographicsAsync(DateTime startDate, DateTime endDate, string correlationId)
    {
        var users = await _context.Users
            .Where(u => u.CreatedAt >= startDate && u.CreatedAt <= endDate)
            .Select(u => new { u.Country, u.CreatedAt })
            .ToListAsync();
        
        var countryDistribution = users
            .GroupBy(u => u.Country ?? "Unknown")
            .ToDictionary(g => g.Key, g => g.Count());
        
        return new UserDemographicsData
        {
            CountryDistribution = countryDistribution,
            TotalUsers = users.Count
        };
    }

    private async Task<List<ContentData>> GetTopPerformingContentAsync(DateTime startDate, DateTime endDate, string contentType, string correlationId)
    {
        // Note: Content is fetched from external APIs (TMDb, Streaming Availability) on-demand
        // and not stored persistently in our database. We can show top searched terms instead.
        //
        // For "top performing content" we would need to:
        // 1. Store search results in a local cache/table with content metadata
        // 2. Track user interactions (views, watchlist adds, VPN guidance requests) by content ID
        // 3. Join interaction data with cached content metadata
        //
        // Currently we can only show aggregate search analytics, not individual content items.

        // Return top searched queries as a proxy for popular content
        // Note: SearchAnalytics uses SearchTerms property, not Query
        var topSearchQueries = await _context.SearchAnalytics
            .Where(sa => sa.CreatedAt >= startDate && sa.CreatedAt <= endDate)
            .Where(sa => !string.IsNullOrEmpty(sa.SearchTerms))
            .GroupBy(sa => sa.SearchTerms)
            .Select(g => new { SearchTerms = g.Key, SearchCount = g.Count() })
            .OrderByDescending(x => x.SearchCount)
            .Take(10)
            .ToListAsync();

        // Convert search queries to ContentData format to indicate popular searches
        return topSearchQueries.Select((item, index) => new ContentData
        {
            Id = $"search-{index + 1}",
            Title = item.SearchTerms ?? "Unknown Search",
            Type = "search_query", // Indicates this is a search term, not actual content
            Overview = $"Searched {item.SearchCount} times in this period",
            CreatedAt = startDate,
            UpdatedAt = DateTime.UtcNow
        }).ToList();
    }

    private async Task<List<SearchTrendData>> GetContentSearchTrendsAsync(DateTime startDate, DateTime endDate, string correlationId)
    {
        var searchTrends = await _context.SearchAnalytics
            .Where(sa => sa.CreatedAt >= startDate && sa.CreatedAt <= endDate)
            .GroupBy(sa => sa.CreatedAt.Date)
            .Select(g => new SearchTrendData
            {
                Date = g.Key,
                SearchCount = g.Count(),
                AverageResultCount = g.Average(sa => sa.ResultCount)
            })
            .OrderBy(st => st.Date)
            .ToListAsync();

        return searchTrends;
    }

    private async Task<Dictionary<string, ContentCategoryMetrics>> GetContentCategoryPerformanceAsync(DateTime startDate, DateTime endDate, string correlationId)
    {
        // Note: Content is fetched from external APIs (TMDb, Streaming Availability) on-demand
        // and not stored in our database. We cannot provide category-level content counts.
        //
        // To implement this properly, we would need to either:
        // 1. Cache content metadata locally when users search/view content
        // 2. Periodically sync content catalog from external APIs
        // 3. Track content type in search analytics or user interactions
        //
        // For now, return empty metrics with explanatory category names

        var categoryPerformance = new Dictionary<string, ContentCategoryMetrics>
        {
            ["movie"] = new ContentCategoryMetrics
            {
                CategoryName = "movie",
                TotalItems = 0,  // Content sourced from TMDb API - not stored locally
                NewItems = 0    // Content sourced from TMDb API - not stored locally
            },
            ["tv_show"] = new ContentCategoryMetrics
            {
                CategoryName = "tv_show",
                TotalItems = 0,  // Content sourced from TMDb API - not stored locally
                NewItems = 0    // Content sourced from TMDb API - not stored locally
            }
        };

        return await Task.FromResult(categoryPerformance);
    }

    private async Task<int> GetActiveUsersCountAsync(string correlationId)
    {
        var fiveMinutesAgo = DateTime.UtcNow.AddMinutes(-5);
        // Use EndedAt (DB column) instead of EndTime (computed property that EF can't translate)
        return await _context.UserSessions
            .Where(us => us.LastActivity >= fiveMinutesAgo && !us.EndedAt.HasValue)
            .CountAsync();
    }

    private async Task<int> GetCurrentSessionsCountAsync(string correlationId)
    {
        // Use EndedAt (DB column) instead of EndTime (computed property that EF can't translate)
        return await _context.UserSessions
            .Where(us => !us.EndedAt.HasValue)
            .CountAsync();
    }

    private async Task<List<RecentActivityData>> GetRecentActivitiesAsync(string correlationId)
    {
        var recentActivities = await _context.UserActivities
            .Where(ua => ua.CreatedAt >= DateTime.UtcNow.AddMinutes(-30))
            .OrderByDescending(ua => ua.CreatedAt)
            .Take(10)
            .Select(ua => new RecentActivityData
            {
                ActivityType = ua.ActivityType,
                Timestamp = ua.CreatedAt,
                Details = ua.Description ?? ""
            })
            .ToListAsync();
        
        return recentActivities;
    }

    private async Task<SystemStatus> GetSystemStatusAsync(string correlationId)
    {
        // Note: Real-time system status requires APM integration (Application Insights, etc.)
        // Status is set to "Unknown" since we cannot determine actual health without monitoring
        return await Task.FromResult(new SystemStatus
        {
            Status = "Unknown", // Requires health check endpoint aggregation
            ResponseTime = 0,   // Requires APM/middleware response time tracking
            ErrorRate = 0,      // Requires centralized error logging aggregation
            LastCheck = DateTime.UtcNow
        });
    }

    private async Task<string> GenerateAnalyticsCsvAsync(string exportType, DateTime startDate, DateTime endDate, string correlationId)
    {
        var csv = new StringBuilder();
        
        switch (exportType.ToLower())
        {
            case "users":
                csv.AppendLine("Date,New Users,Active Users,Total Users");
                var userTrends = await GetUserGrowthTrendsAsync(startDate, endDate, "daily", correlationId);
                foreach (var trend in userTrends)
                {
                    csv.AppendLine($"{trend.Period:yyyy-MM-dd},{trend.NewUsers},{trend.NewUsers},{trend.CumulativeUsers}");
                }
                break;
                
            case "content":
                csv.AppendLine("Date,Content Items,Searches,Average Results");
                var searchTrends = await GetContentSearchTrendsAsync(startDate, endDate, correlationId);
                foreach (var trend in searchTrends)
                {
                    csv.AppendLine($"{trend.Date:yyyy-MM-dd},{trend.SearchCount},{trend.SearchCount},{trend.AverageResultCount:F2}");
                }
                break;
                
            case "financial":
                csv.AppendLine("Metric,Value");
                var financialMetrics = await GetFinancialMetricsAsync(startDate, endDate, correlationId);
                csv.AppendLine($"Monthly Recurring Revenue,{financialMetrics.MonthlyRecurringRevenue:C}");
                csv.AppendLine($"Annual Recurring Revenue,{financialMetrics.AnnualRecurringRevenue:C}");
                csv.AppendLine($"Total Revenue,{financialMetrics.TotalRevenue:C}");
                csv.AppendLine($"Transaction Count,{financialMetrics.TransactionCount}");
                csv.AppendLine($"Average Transaction Value,{financialMetrics.AverageTransactionValue:C}");
                break;
                
            default:
                csv.AppendLine("Export type not supported");
                break;
        }
        
        return csv.ToString();
    }

    #endregion

    private Guid? GetCurrentUserId()
    {
        var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(userIdClaim, out var userId) ? userId : null;
    }
}