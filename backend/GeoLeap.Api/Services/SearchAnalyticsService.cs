using GeoLeap.Api.Models;
using Microsoft.Extensions.Caching.Memory;
using System.Text.Json;
using System.Text;
using System.Globalization;

namespace GeoLeap.Api.Services;

/// <summary>
/// Comprehensive search analytics and insights service implementation
/// </summary>
public class SearchAnalyticsService : ISearchAnalyticsService
{
    private readonly ILoggerService _loggerService;
    private readonly ICacheService _cacheService;
    private readonly IMemoryCache _memoryCache;
    private readonly IResilienceService _resilienceService;

    // Cache keys and durations
    private const string ANALYTICS_CACHE_PREFIX = "analytics:";
    private const string REALTIME_CACHE_PREFIX = "realtime:";
    private const string INSIGHTS_CACHE_PREFIX = "insights:";
    private static readonly TimeSpan ShortCacheDuration = TimeSpan.FromMinutes(5);
    private static readonly TimeSpan MediumCacheDuration = TimeSpan.FromMinutes(30);
    private static readonly TimeSpan LongCacheDuration = TimeSpan.FromHours(4);

    // In-memory event buffer for high-performance real-time processing
    private readonly Queue<SearchAnalyticsEvent> _eventBuffer = new();
    // FIXED: Week 1 Day 3 - Replaced lock with SemaphoreSlim for async-safe synchronization
    private readonly SemaphoreSlim _bufferSemaphore = new SemaphoreSlim(1, 1);
    private readonly Timer _bufferFlushTimer;

    // Analytics thresholds for alerting
    private readonly Dictionary<string, double> _performanceThresholds = new()
    {
        { "ResponseTimeMs", 2000.0 },
        { "ErrorRate", 0.05 },
        { "CacheHitRate", 0.8 },
        { "SuccessRate", 0.95 }
    };

    public SearchAnalyticsService(
        ILoggerService loggerService,
        ICacheService cacheService,
        IMemoryCache memoryCache,
        IResilienceService resilienceService)
    {
        _loggerService = loggerService;
        _cacheService = cacheService;
        _memoryCache = memoryCache;
        _resilienceService = resilienceService;

        // Initialize buffer flush timer (every 10 seconds)
        _bufferFlushTimer = new Timer(FlushEventBuffer, null, TimeSpan.FromSeconds(10), TimeSpan.FromSeconds(10));
    }

    public async Task TrackSearchEventAsync(SearchAnalyticsEvent analyticsEvent, CancellationToken cancellationToken = default)
    {
        try
        {
            // Ensure privacy compliance - anonymize if needed
            if (analyticsEvent.UserId.HasValue)
            {
                analyticsEvent.AnonymousId = GenerateAnonymousId(analyticsEvent.UserId.Value);
            }

            // Add to buffer for batch processing
            // FIXED: Week 1 Day 3 - Use SemaphoreSlim for async-safe buffer access
            await _bufferSemaphore.WaitAsync(cancellationToken);
            try
            {
                _eventBuffer.Enqueue(analyticsEvent);
            }
            finally
            {
                _bufferSemaphore.Release();
            }

            // Update real-time metrics in cache
            await UpdateRealTimeMetricsAsync(analyticsEvent);

            _loggerService.LogBusinessEvent("SearchAnalyticsEventTracked", new
            {
                EventType = analyticsEvent.EventType,
                Query = analyticsEvent.Query,
                UserId = analyticsEvent.UserId,
                ResponseTime = analyticsEvent.ResponseTimeMs,
                CorrelationId = analyticsEvent.CorrelationId
            });
        }
        catch (Exception ex)
        {
            _loggerService.LogBusinessEvent("SearchAnalyticsEventError", new
            {
                EventType = analyticsEvent.EventType,
                Error = ex.Message,
                CorrelationId = analyticsEvent.CorrelationId
            });
            // Don't throw - analytics should not break the main flow
        }
    }

    public async Task TrackSearchStartAsync(string query, GlobalSearchRequest request, string sessionId, Guid? userId, string correlationId, CancellationToken cancellationToken = default)
    {
        var searchEvent = new SearchAnalyticsEvent
        {
            EventType = "search_started",
            UserId = userId,
            SessionId = sessionId,
            Query = query,
            NormalizedQuery = NormalizeQuery(query),
            ContentType = request.ContentType,
            Timestamp = DateTime.UtcNow,
            CorrelationId = correlationId,
            Metadata = new Dictionary<string, object>
            {
                ["page"] = request.Page,
                ["page_size"] = request.PageSize,
                ["sort_by"] = request.SortBy.ToString(),
                ["has_filters"] = HasFilters(request)
            }
        };

        await TrackSearchEventAsync(searchEvent, cancellationToken);
    }

    public async Task TrackSearchCompletedAsync(string query, GlobalSearchResponse response, string sessionId, Guid? userId, string correlationId, CancellationToken cancellationToken = default)
    {
        var searchEvent = new SearchAnalyticsEvent
        {
            EventType = "search_completed",
            UserId = userId,
            SessionId = sessionId,
            Query = query,
            NormalizedQuery = NormalizeQuery(query),
            ResultCount = response.Results.Count,
            ResponseTimeMs = (long)response.ResponseTime.TotalMilliseconds,
            UsedStrategy = response.Metadata.UsedStrategy,
            UsedCache = response.Metadata.UsedCache,
            DataSources = response.Metadata.DataSources,
            Timestamp = DateTime.UtcNow,
            CorrelationId = correlationId,
            Metadata = new Dictionary<string, object>
            {
                ["total_results"] = response.TotalResults,
                ["has_more"] = response.HasMore,
                ["suggestions_count"] = response.Suggestions.Count
            }
        };

        await TrackSearchEventAsync(searchEvent, cancellationToken);
    }

    public async Task TrackSearchClickAsync(string query, string contentId, int position, string sessionId, Guid? userId, string correlationId, CancellationToken cancellationToken = default)
    {
        var searchEvent = new SearchAnalyticsEvent
        {
            EventType = "search_click",
            UserId = userId,
            SessionId = sessionId,
            Query = query,
            NormalizedQuery = NormalizeQuery(query),
            ClickedResultId = contentId,
            ClickedPosition = position,
            Timestamp = DateTime.UtcNow,
            CorrelationId = correlationId,
            Metadata = new Dictionary<string, object>
            {
                ["click_position"] = position
            }
        };

        await TrackSearchEventAsync(searchEvent, cancellationToken);
    }

    public async Task TrackSearchAbandonedAsync(string query, string sessionId, Guid? userId, string correlationId, CancellationToken cancellationToken = default)
    {
        var searchEvent = new SearchAnalyticsEvent
        {
            EventType = "search_abandoned",
            UserId = userId,
            SessionId = sessionId,
            Query = query,
            NormalizedQuery = NormalizeQuery(query),
            Timestamp = DateTime.UtcNow,
            CorrelationId = correlationId
        };

        await TrackSearchEventAsync(searchEvent, cancellationToken);
    }

    public async Task StartSearchJourneyAsync(string sessionId, Guid? userId, string correlationId, CancellationToken cancellationToken = default)
    {
        var journey = new SearchJourney
        {
            SessionId = sessionId,
            UserId = userId,
            AnonymousId = userId.HasValue ? GenerateAnonymousId(userId.Value) : Guid.NewGuid().ToString(),
            StartedAt = DateTime.UtcNow,
            JourneyMetadata = new Dictionary<string, object>
            {
                ["correlation_id"] = correlationId,
                ["started_at"] = DateTime.UtcNow.ToString("O")
            }
        };

        // Cache journey for session tracking
        var journeyKey = $"journey:{sessionId}";
        await _cacheService.SetAsync(journeyKey, journey, TimeSpan.FromHours(24));

        _loggerService.LogBusinessEvent("SearchJourneyStarted", new
        {
            SessionId = sessionId,
            UserId = userId,
            CorrelationId = correlationId
        });
    }

    public async Task AddJourneyStepAsync(string sessionId, string action, Dictionary<string, object>? metadata = null, CancellationToken cancellationToken = default)
    {
        var journeyKey = $"journey:{sessionId}";
        var journey = await _cacheService.GetAsync<SearchJourney>(journeyKey);

        if (journey != null)
        {
            var step = new SearchStep
            {
                JourneyId = journey.Id,
                StepNumber = journey.Steps.Count + 1,
                Action = action,
                ActionMetadata = metadata ?? new Dictionary<string, object>(),
                Timestamp = DateTime.UtcNow,
                TimeFromPrevious = journey.Steps.Any()
                    ? DateTime.UtcNow - (journey.Steps.LastOrDefault()?.Timestamp ?? journey.StartedAt)
                    : DateTime.UtcNow - journey.StartedAt
            };

            journey.Steps.Add(step);
            await _cacheService.SetAsync(journeyKey, journey, TimeSpan.FromHours(24));
        }
    }

    public async Task CompleteSearchJourneyAsync(string sessionId, SearchOutcome outcome, bool converted = false, CancellationToken cancellationToken = default)
    {
        var journeyKey = $"journey:{sessionId}";
        var journey = await _cacheService.GetAsync<SearchJourney>(journeyKey);

        if (journey != null)
        {
            journey.CompletedAt = DateTime.UtcNow;
            journey.Outcome = outcome;
            journey.ConvertedToSubscription = converted;
            journey.TotalDuration = DateTime.UtcNow - journey.StartedAt;
            journey.TotalSearches = journey.Steps.Count(s => s.Action == "search");
            journey.TotalClicks = journey.Steps.Count(s => s.Action == "click");

            // Store completed journey for analytics processing
            await StoreCompletedJourneyAsync(journey);

            // Remove from cache
            await _cacheService.RemoveAsync(journeyKey);

            _loggerService.LogBusinessEvent("SearchJourneyCompleted", new
            {
                SessionId = sessionId,
                Outcome = outcome.ToString(),
                Converted = converted,
                Duration = journey.TotalDuration.TotalSeconds,
                TotalSearches = journey.TotalSearches,
                TotalClicks = journey.TotalClicks
            });
        }
    }

    public async Task<Models.SearchPerformanceMetrics> GetPerformanceMetricsAsync(DateTime from, DateTime to, CancellationToken cancellationToken = default)
    {
        var cacheKey = $"{ANALYTICS_CACHE_PREFIX}performance:{from:yyyyMMdd}:{to:yyyyMMdd}";
        var cached = await _cacheService.GetAsync<Models.SearchPerformanceMetrics>(cacheKey);
        
        if (cached != null)
        {
            return cached;
        }

        var metrics = await ComputePerformanceMetricsAsync(from, to);
        await _cacheService.SetAsync(cacheKey, metrics, MediumCacheDuration);
        
        return metrics;
    }

    public async Task<Dictionary<string, double>> GetRealTimeMetricsAsync(CancellationToken cancellationToken = default)
    {
        var cacheKey = $"{REALTIME_CACHE_PREFIX}metrics";
        var cached = await _cacheService.GetAsync<Dictionary<string, double>>(cacheKey);
        
        return cached ?? new Dictionary<string, double>
        {
            ["searches_per_minute"] = 0,
            ["average_response_time"] = 0,
            ["cache_hit_rate"] = 0,
            ["error_rate"] = 0,
            ["active_users"] = 0
        };
    }

    public async Task<List<SearchPerformanceAlert>> GetActivePerformanceAlertsAsync(CancellationToken cancellationToken = default)
    {
        var cacheKey = $"{ANALYTICS_CACHE_PREFIX}active_alerts";
        var cached = await _cacheService.GetAsync<List<SearchPerformanceAlert>>(cacheKey);
        
        if (cached != null)
        {
            return cached.Where(a => a.IsActive).ToList();
        }

        var alerts = await CheckPerformanceThresholdsAsync(cancellationToken);
        return alerts.Where(a => a.IsActive).ToList();
    }

    public async Task<UserBehaviorAnalytics> GetUserBehaviorAnalyticsAsync(DateTime from, DateTime to, CancellationToken cancellationToken = default)
    {
        var cacheKey = $"{ANALYTICS_CACHE_PREFIX}behavior:{from:yyyyMMdd}:{to:yyyyMMdd}";
        var cached = await _cacheService.GetAsync<UserBehaviorAnalytics>(cacheKey);
        
        if (cached != null)
        {
            return cached;
        }

        var analytics = await ComputeUserBehaviorAnalyticsAsync(from, to);
        await _cacheService.SetAsync(cacheKey, analytics, MediumCacheDuration);
        
        return analytics;
    }

    public async Task<List<UserSegment>> GetUserSegmentsAsync(CancellationToken cancellationToken = default)
    {
        var cacheKey = $"{ANALYTICS_CACHE_PREFIX}user_segments";
        var cached = await _cacheService.GetAsync<List<UserSegment>>(cacheKey);
        
        if (cached != null)
        {
            return cached;
        }

        var segments = await ComputeUserSegmentsAsync();
        await _cacheService.SetAsync(cacheKey, segments, LongCacheDuration);
        
        return segments;
    }

    public async Task<List<SearchPattern>> GetCommonSearchPatternsAsync(int top = 10, CancellationToken cancellationToken = default)
    {
        var cacheKey = $"{ANALYTICS_CACHE_PREFIX}search_patterns:{top}";
        var cached = await _cacheService.GetAsync<List<SearchPattern>>(cacheKey);
        
        if (cached != null)
        {
            return cached;
        }

        var patterns = await ComputeSearchPatternsAsync(top);
        await _cacheService.SetAsync(cacheKey, patterns, LongCacheDuration);
        
        return patterns;
    }

    public async Task<BusinessIntelligenceMetrics> GetBusinessIntelligenceAsync(DateTime from, DateTime to, CancellationToken cancellationToken = default)
    {
        var cacheKey = $"{ANALYTICS_CACHE_PREFIX}business:{from:yyyyMMdd}:{to:yyyyMMdd}";
        var cached = await _cacheService.GetAsync<BusinessIntelligenceMetrics>(cacheKey);
        
        if (cached != null)
        {
            return cached;
        }

        var intelligence = await ComputeBusinessIntelligenceAsync(from, to);
        await _cacheService.SetAsync(cacheKey, intelligence, MediumCacheDuration);
        
        return intelligence;
    }

    public async Task<List<Models.PopularQuery>> GetTrendingQueriesAsync(int top = 20, CancellationToken cancellationToken = default)
    {
        var cacheKey = $"{ANALYTICS_CACHE_PREFIX}trending_queries:{top}";
        var cached = await _cacheService.GetAsync<List<Models.PopularQuery>>(cacheKey);
        
        if (cached != null)
        {
            return cached;
        }

        var queries = await ComputeTrendingQueriesAsync(top);
        await _cacheService.SetAsync(cacheKey, queries, ShortCacheDuration);
        
        return queries;
    }

    public async Task<List<PopularSearchContent>> GetTrendingContentAsync(int top = 20, CancellationToken cancellationToken = default)
    {
        var cacheKey = $"{ANALYTICS_CACHE_PREFIX}trending_content:{top}";
        var cached = await _cacheService.GetAsync<List<PopularSearchContent>>(cacheKey);
        
        if (cached != null)
        {
            return cached;
        }

        var content = await ComputeTrendingContentAsync(top);
        await _cacheService.SetAsync(cacheKey, content, ShortCacheDuration);
        
        return content;
    }

    public async Task<List<ContentGap>> GetContentGapsAsync(CancellationToken cancellationToken = default)
    {
        var cacheKey = $"{ANALYTICS_CACHE_PREFIX}content_gaps";
        var cached = await _cacheService.GetAsync<List<ContentGap>>(cacheKey);
        
        if (cached != null)
        {
            return cached;
        }

        var gaps = await ComputeContentGapsAsync();
        await _cacheService.SetAsync(cacheKey, gaps, LongCacheDuration);
        
        return gaps;
    }

    public async Task<Dictionary<string, GeographicInsight>> GetGeographicInsightsAsync(DateTime from, DateTime to, CancellationToken cancellationToken = default)
    {
        var cacheKey = $"{ANALYTICS_CACHE_PREFIX}geographic:{from:yyyyMMdd}:{to:yyyyMMdd}";
        var cached = await _cacheService.GetAsync<Dictionary<string, GeographicInsight>>(cacheKey);
        
        if (cached != null)
        {
            return cached;
        }

        var insights = await ComputeGeographicInsightsAsync(from, to);
        await _cacheService.SetAsync(cacheKey, insights, MediumCacheDuration);
        
        return insights;
    }

    public async Task<RevenueImpactAnalysis> GetRevenueImpactAnalysisAsync(DateTime from, DateTime to, CancellationToken cancellationToken = default)
    {
        var cacheKey = $"{ANALYTICS_CACHE_PREFIX}revenue:{from:yyyyMMdd}:{to:yyyyMMdd}";
        var cached = await _cacheService.GetAsync<RevenueImpactAnalysis>(cacheKey);
        
        if (cached != null)
        {
            return cached;
        }

        var analysis = await ComputeRevenueImpactAnalysisAsync(from, to);
        await _cacheService.SetAsync(cacheKey, analysis, MediumCacheDuration);
        
        return analysis;
    }

    public async Task<AnalyticsDashboardSummary> GetDashboardSummaryAsync(CancellationToken cancellationToken = default)
    {
        var cacheKey = $"{ANALYTICS_CACHE_PREFIX}dashboard_summary";
        var cached = await _cacheService.GetAsync<AnalyticsDashboardSummary>(cacheKey);
        
        if (cached != null && cached.LastUpdated > DateTime.UtcNow.AddMinutes(-5))
        {
            return cached;
        }

        var summary = await ComputeDashboardSummaryAsync();
        await _cacheService.SetAsync(cacheKey, summary, ShortCacheDuration);
        
        return summary;
    }

    public async Task<List<InsightCard>> GetTopInsightsAsync(int count = 5, CancellationToken cancellationToken = default)
    {
        var cacheKey = $"{INSIGHTS_CACHE_PREFIX}top_insights:{count}";
        var cached = await _cacheService.GetAsync<List<InsightCard>>(cacheKey);
        
        if (cached != null)
        {
            return cached;
        }

        var insights = await ComputeTopInsightsAsync(count);
        await _cacheService.SetAsync(cacheKey, insights, MediumCacheDuration);
        
        return insights;
    }

    public async Task<ABTestPerformance> GetABTestPerformanceAsync(string testId, string? variantId = null, CancellationToken cancellationToken = default)
    {
        // Placeholder implementation
        return new ABTestPerformance
        {
            TestId = testId,
            TestName = $"Test {testId}",
            VariantId = variantId ?? "control",
            VariantName = variantId ?? "Control",
            Status = ABTestStatus.Active
        };
    }

    public async Task TrackABTestInteractionAsync(string testId, string variantId, string interaction, Guid? userId, Dictionary<string, object>? metadata = null, CancellationToken cancellationToken = default)
    {
        var abTestEvent = new SearchAnalyticsEvent
        {
            EventType = "ab_test_interaction",
            UserId = userId,
            Timestamp = DateTime.UtcNow,
            Metadata = new Dictionary<string, object>
            {
                ["test_id"] = testId,
                ["variant_id"] = variantId,
                ["interaction"] = interaction
            }
        };

        if (metadata != null)
        {
            foreach (var kvp in metadata)
            {
                abTestEvent.Metadata[kvp.Key] = kvp.Value;
            }
        }

        await TrackSearchEventAsync(abTestEvent, cancellationToken);
    }

    public async Task<SearchQualityMetrics> GetSearchQualityMetricsAsync(DateTime from, DateTime to, CancellationToken cancellationToken = default)
    {
        var cacheKey = $"{ANALYTICS_CACHE_PREFIX}quality:{from:yyyyMMdd}:{to:yyyyMMdd}";
        var cached = await _cacheService.GetAsync<SearchQualityMetrics>(cacheKey);
        
        if (cached != null)
        {
            return cached;
        }

        var metrics = await ComputeSearchQualityMetricsAsync(from, to);
        await _cacheService.SetAsync(cacheKey, metrics, MediumCacheDuration);
        
        return metrics;
    }

    public async Task<List<QualityIssue>> GetSearchQualityIssuesAsync(CancellationToken cancellationToken = default)
    {
        var cacheKey = $"{ANALYTICS_CACHE_PREFIX}quality_issues";
        var cached = await _cacheService.GetAsync<List<QualityIssue>>(cacheKey);
        
        if (cached != null)
        {
            return cached;
        }

        var issues = await ComputeSearchQualityIssuesAsync();
        await _cacheService.SetAsync(cacheKey, issues, LongCacheDuration);
        
        return issues;
    }

    public async Task<byte[]> ExportAnalyticsDataAsync(DateTime from, DateTime to, string format = "csv", CancellationToken cancellationToken = default)
    {
        var metrics = await GetPerformanceMetricsAsync(from, to, cancellationToken);
        var behaviorMetrics = await GetUserBehaviorAnalyticsAsync(from, to, cancellationToken);
        var businessMetrics = await GetBusinessIntelligenceAsync(from, to, cancellationToken);

        return format.ToLowerInvariant() switch
        {
            "csv" => ExportToCsv(metrics, behaviorMetrics, businessMetrics),
            "json" => ExportToJson(metrics, behaviorMetrics, businessMetrics),
            "excel" => ExportToExcel(metrics, behaviorMetrics, businessMetrics),
            _ => throw new ArgumentException($"Unsupported export format: {format}")
        };
    }

    public async Task<bool> ScheduleAnalyticsReportAsync(string reportName, string[] recipients, string frequency, Dictionary<string, object>? parameters = null, CancellationToken cancellationToken = default)
    {
        // Placeholder implementation - would integrate with actual scheduling system
        _loggerService.LogBusinessEvent("AnalyticsReportScheduled", new
        {
            ReportName = reportName,
            Recipients = recipients,
            Frequency = frequency,
            Parameters = parameters
        });

        return true;
    }

    public async Task ProcessRealTimeEventsAsync(CancellationToken cancellationToken = default)
    {
        await FlushEventBufferAsync();
    }

    public async Task AggregateHourlyDataAsync(DateTime hour, CancellationToken cancellationToken = default)
    {
        // Placeholder for hourly aggregation
        _loggerService.LogBusinessEvent("HourlyDataAggregationStarted", new { Hour = hour });
    }

    public async Task AggregateDailyDataAsync(DateTime date, CancellationToken cancellationToken = default)
    {
        // Placeholder for daily aggregation
        _loggerService.LogBusinessEvent("DailyDataAggregationStarted", new { Date = date });
    }

    public async Task ArchiveOldDataAsync(TimeSpan retentionPeriod, CancellationToken cancellationToken = default)
    {
        // Placeholder for data archival
        _loggerService.LogBusinessEvent("DataArchivalStarted", new { RetentionPeriod = retentionPeriod });
    }

    public async Task AnonymizeUserDataAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        // Placeholder for GDPR compliance
        _loggerService.LogBusinessEvent("UserDataAnonymized", new { UserId = userId });
    }

    public async Task DeleteUserAnalyticsDataAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        // Placeholder for GDPR compliance
        _loggerService.LogBusinessEvent("UserAnalyticsDataDeleted", new { UserId = userId });
    }

    public async Task<Dictionary<string, object>> GetUserAnalyticsDataAsync(Guid userId, CancellationToken cancellationToken = default)
    {
        // Placeholder for GDPR compliance
        return new Dictionary<string, object>
        {
            ["user_id"] = userId,
            ["total_searches"] = 0,
            ["total_clicks"] = 0,
            ["first_search"] = DateTime.MinValue,
            ["last_search"] = DateTime.MinValue
        };
    }

    public async Task<List<SearchPerformanceAlert>> CheckPerformanceThresholdsAsync(CancellationToken cancellationToken = default)
    {
        var alerts = new List<SearchPerformanceAlert>();
        var metrics = await GetRealTimeMetricsAsync(cancellationToken);

        foreach (var threshold in _performanceThresholds)
        {
            if (metrics.TryGetValue(threshold.Key.ToLowerInvariant().Replace("ms", ""), out var value))
            {
                var severity = DetermineAlertSeverity(threshold.Key, value, threshold.Value);
                if (severity != AlertSeverity.Low)
                {
                    alerts.Add(new SearchPerformanceAlert
                    {
                        Type = AlertType.Performance,
                        Severity = severity,
                        Title = $"Performance threshold exceeded: {threshold.Key}",
                        Description = $"Current value: {value:F2}, Threshold: {threshold.Value:F2}",
                        Metrics = new Dictionary<string, object> { [threshold.Key] = value },
                        TriggeredAt = DateTime.UtcNow,
                        IsActive = true,
                        RecommendedActions = GetRecommendedActions(threshold.Key, value)
                    });
                }
            }
        }

        return alerts;
    }

    public async Task<List<BusinessAlert>> CheckBusinessThresholdsAsync(CancellationToken cancellationToken = default)
    {
        var alerts = new List<BusinessAlert>();
        
        // Placeholder implementation - would check business-specific thresholds
        var businessMetrics = await GetBusinessIntelligenceAsync(DateTime.UtcNow.AddDays(-1), DateTime.UtcNow, cancellationToken);
        
        return alerts;
    }

    public async Task AcknowledgeAlertAsync(Guid alertId, Guid acknowledgedBy, CancellationToken cancellationToken = default)
    {
        _loggerService.LogBusinessEvent("AlertAcknowledged", new
        {
            AlertId = alertId,
            AcknowledgedBy = acknowledgedBy,
            AcknowledgedAt = DateTime.UtcNow
        });
    }

    public async Task ResolveAlertAsync(Guid alertId, Guid resolvedBy, string resolution, CancellationToken cancellationToken = default)
    {
        _loggerService.LogBusinessEvent("AlertResolved", new
        {
            AlertId = alertId,
            ResolvedBy = resolvedBy,
            Resolution = resolution,
            ResolvedAt = DateTime.UtcNow
        });
    }

    // Private helper methods
    private string GenerateAnonymousId(Guid userId)
    {
        return userId.ToString("N")[..16]; // Simple anonymization - use proper hashing in production
    }

    private string NormalizeQuery(string query)
    {
        return query.ToLowerInvariant().Trim();
    }

    private bool HasFilters(GlobalSearchRequest request)
    {
        return request.Countries?.Any() == true ||
               request.Services?.Any() == true ||
               request.Genres?.Any() == true ||
               request.Year.HasValue ||
               request.MinRating.HasValue;
    }

    private async Task UpdateRealTimeMetricsAsync(SearchAnalyticsEvent analyticsEvent)
    {
        var cacheKey = $"{REALTIME_CACHE_PREFIX}metrics";
        var metrics = await _cacheService.GetAsync<Dictionary<string, double>>(cacheKey) ?? new Dictionary<string, double>();

        // Update metrics based on event type
        switch (analyticsEvent.EventType)
        {
            case "search_started":
                metrics["searches_per_minute"] = metrics.GetValueOrDefault("searches_per_minute", 0) + 1;
                break;
            case "search_completed":
                metrics["average_response_time"] = CalculateMovingAverage(metrics.GetValueOrDefault("average_response_time", 0), analyticsEvent.ResponseTimeMs, 100);
                metrics["cache_hit_rate"] = CalculateMovingAverage(metrics.GetValueOrDefault("cache_hit_rate", 0), analyticsEvent.UsedCache ? 1 : 0, 100);
                break;
        }

        await _cacheService.SetAsync(cacheKey, metrics, TimeSpan.FromMinutes(1));
    }

    private double CalculateMovingAverage(double currentAverage, double newValue, int windowSize)
    {
        return (currentAverage * (windowSize - 1) + newValue) / windowSize;
    }

    private async Task StoreCompletedJourneyAsync(SearchJourney journey)
    {
        // Placeholder - would store in persistent storage
        _loggerService.LogBusinessEvent("SearchJourneyStored", new
        {
            JourneyId = journey.Id,
            SessionId = journey.SessionId,
            Outcome = journey.Outcome.ToString(),
            Duration = journey.TotalDuration.TotalSeconds,
            StepCount = journey.Steps.Count
        });
    }

    private void FlushEventBuffer(object? state)
    {
        _ = Task.Run(FlushEventBufferAsync);
    }

    private async Task FlushEventBufferAsync()
    {
        try
        {
            List<SearchAnalyticsEvent> eventsToProcess;

            // FIXED: Week 1 Day 3 - Use SemaphoreSlim for async-safe buffer access
            await _bufferSemaphore.WaitAsync();
            try
            {
                eventsToProcess = new List<SearchAnalyticsEvent>(_eventBuffer);
                _eventBuffer.Clear();
            }
            finally
            {
                _bufferSemaphore.Release();
            }

            if (eventsToProcess.Any())
            {
                // Batch process events - would typically write to database or streaming platform
                _loggerService.LogBusinessEvent("AnalyticsEventsBatchProcessed", new
                {
                    EventCount = eventsToProcess.Count,
                    EventTypes = eventsToProcess.GroupBy(e => e.EventType).ToDictionary(g => g.Key, g => g.Count()),
                    ProcessedAt = DateTime.UtcNow
                });
            }
        }
        catch (Exception ex)
        {
            _loggerService.LogError(ex, "Failed to flush analytics event buffer");
        }
    }

    private AlertSeverity DetermineAlertSeverity(string metricName, double currentValue, double threshold)
    {
        var ratio = Math.Abs(currentValue - threshold) / threshold;
        
        return ratio switch
        {
            < 0.1 => AlertSeverity.Low,
            < 0.25 => AlertSeverity.Medium,
            < 0.5 => AlertSeverity.High,
            _ => AlertSeverity.Critical
        };
    }

    private List<string> GetRecommendedActions(string metricName, double currentValue)
    {
        return metricName switch
        {
            "ResponseTimeMs" => new List<string> { "Check database query performance", "Review caching strategy", "Scale infrastructure" },
            "ErrorRate" => new List<string> { "Investigate error logs", "Check external service health", "Review error handling" },
            "CacheHitRate" => new List<string> { "Review cache TTL settings", "Warm cache proactively", "Analyze cache key strategies" },
            _ => new List<string> { "Monitor closely", "Review recent changes" }
        };
    }

    // Placeholder computation methods - would implement actual analytics calculations
    private async Task<Models.SearchPerformanceMetrics> ComputePerformanceMetricsAsync(DateTime from, DateTime to)
    {
        // Placeholder implementation with realistic sample data
        return new Models.SearchPerformanceMetrics
        {
            PeriodStart = from,
            PeriodEnd = to,
            TotalSearches = 12540,
            UniqueUsers = 3421,
            UniqueSessions = 4892,
            AverageResponseTimeMs = 287.5,
            MedianResponseTimeMs = 195.0,
            P95ResponseTimeMs = 850.0,
            P99ResponseTimeMs = 1250.0,
            CacheHitRate = 0.78,
            ErrorRate = 0.023,
            SuccessfulSearches = 12251,
            FailedSearches = 289,
            SearchesByStrategy = new Dictionary<string, long>
            {
                ["ExactMatch"] = 8934,
                ["FuzzyMatch"] = 2876,
                ["PartialMatch"] = 730
            },
            SearchesByContentType = new Dictionary<string, long>
            {
                ["Movie"] = 7234,
                ["Show"] = 4892,
                ["All"] = 414
            },
            TopQueries = new List<Models.PopularQuery>
            {
                new() { Query = "stranger things", SearchCount = 234, ClickThroughRate = 0.85, Trend = TrendDirection.Up, TrendPercentage = 12.5 },
                new() { Query = "breaking bad", SearchCount = 198, ClickThroughRate = 0.91, Trend = TrendDirection.Stable, TrendPercentage = 2.1 }
            }
        };
    }

    private async Task<UserBehaviorAnalytics> ComputeUserBehaviorAnalyticsAsync(DateTime from, DateTime to)
    {
        return new UserBehaviorAnalytics
        {
            PeriodStart = from,
            PeriodEnd = to,
            AverageSearchesPerUser = 3.67,
            AverageSearchesPerSession = 2.56,
            AverageSessionDurationMinutes = 8.43,
            ClickThroughRate = 0.72,
            BounceRate = 0.34,
            ConversionRate = 0.087,
            ClicksByPosition = new Dictionary<int, double>
            {
                [1] = 0.45,
                [2] = 0.23,
                [3] = 0.12,
                [4] = 0.08,
                [5] = 0.05
            }
        };
    }

    private async Task<BusinessIntelligenceMetrics> ComputeBusinessIntelligenceAsync(DateTime from, DateTime to)
    {
        return new BusinessIntelligenceMetrics
        {
            PeriodStart = from,
            PeriodEnd = to,
            TrendingContent = new List<PopularSearchContent>
            {
                new() { ContentId = "12345", Title = "The Crown", Type = ContentType.TvSeries, SearchCount = 892, ClickCount = 743, ClickThroughRate = 0.83, Trend = TrendDirection.Up, TrendPercentage = 18.7 }
            },
            ContentGaps = new List<ContentGap>
            {
                new() { Query = "korean drama", SearchCount = 234, AverageResultQuality = 0.42, UserSatisfactionScore = 0.38, RecommendedAction = "Acquire more K-drama content" }
            },
            RevenueImpact = new RevenueImpactAnalysis
            {
                TotalRevenueFromSearch = 23456.78m,
                SearchDrivenSubscriptions = 234,
                AverageRevenuePerSearch = 1.87m,
                AverageRevenuePerUser = 6.85m
            }
        };
    }

    private async Task<List<UserSegment>> ComputeUserSegmentsAsync()
    {
        return new List<UserSegment>
        {
            new()
            {
                SegmentName = "Power Users",
                Description = "Users who search frequently and have high engagement",
                UserCount = 1245,
                ConversionRate = 0.23,
                AverageRevenue = 45.67m,
                CommonQueries = new List<string> { "netflix originals", "hbo max", "disney plus" }
            },
            new()
            {
                SegmentName = "Casual Browsers",
                Description = "Users who search occasionally with moderate engagement",
                UserCount = 8934,
                ConversionRate = 0.08,
                AverageRevenue = 12.34m,
                CommonQueries = new List<string> { "popular movies", "new releases", "comedy shows" }
            }
        };
    }

    private async Task<List<SearchPattern>> ComputeSearchPatternsAsync(int top)
    {
        return new List<SearchPattern>
        {
            new()
            {
                PatternName = "Genre-Based Discovery",
                Description = "Users start with genre searches then refine to specific titles",
                QuerySequence = new List<string> { "[genre] movies", "[specific title]", "[actor/director name]" },
                Frequency = 2341,
                SuccessRate = 0.78,
                ConversionRate = 0.12
            }
        };
    }

    private async Task<List<Models.PopularQuery>> ComputeTrendingQueriesAsync(int top)
    {
        return new List<Models.PopularQuery>
        {
            new() { Query = "wednesday netflix", SearchCount = 1243, Trend = TrendDirection.Up, TrendPercentage = 45.2, ClickThroughRate = 0.89 },
            new() { Query = "house of dragon", SearchCount = 987, Trend = TrendDirection.Down, TrendPercentage = -12.3, ClickThroughRate = 0.76 }
        };
    }

    private async Task<List<PopularSearchContent>> ComputeTrendingContentAsync(int top)
    {
        return new List<PopularSearchContent>
        {
            new() { ContentId = "98765", Title = "Wednesday", Type = ContentType.TvSeries, SearchCount = 1243, ClickCount = 1106, ClickThroughRate = 0.89, Trend = TrendDirection.Up }
        };
    }

    private async Task<List<ContentGap>> ComputeContentGapsAsync()
    {
        return new List<ContentGap>
        {
            new() { Query = "anime movies", SearchCount = 567, AverageResultQuality = 0.34, UserSatisfactionScore = 0.29, RecommendedAction = "Expand anime catalog" }
        };
    }

    private async Task<Dictionary<string, GeographicInsight>> ComputeGeographicInsightsAsync(DateTime from, DateTime to)
    {
        return new Dictionary<string, GeographicInsight>
        {
            ["US"] = new()
            {
                CountryCode = "US",
                CountryName = "United States",
                TotalSearches = 8934,
                UniqueUsers = 2341,
                ConversionRate = 0.095,
                PreferredGenres = new List<string> { "Action", "Comedy", "Drama" }
            }
        };
    }

    private async Task<RevenueImpactAnalysis> ComputeRevenueImpactAnalysisAsync(DateTime from, DateTime to)
    {
        return new RevenueImpactAnalysis
        {
            TotalRevenueFromSearch = 45678.90m,
            SearchDrivenSubscriptions = 456,
            AverageRevenuePerSearch = 3.64m,
            AverageRevenuePerUser = 13.37m,
            ConversionFunnel = new ConversionFunnelMetrics
            {
                OverallConversionRate = 0.087,
                AverageTimeToConversion = TimeSpan.FromMinutes(23.4)
            }
        };
    }

    private async Task<AnalyticsDashboardSummary> ComputeDashboardSummaryAsync()
    {
        var now = DateTime.UtcNow;
        var yesterday = now.AddDays(-1);
        
        return new AnalyticsDashboardSummary
        {
            LastUpdated = now,
            Performance = await ComputePerformanceMetricsAsync(yesterday, now),
            UserBehavior = await ComputeUserBehaviorAnalyticsAsync(yesterday, now),
            BusinessIntelligence = await ComputeBusinessIntelligenceAsync(yesterday, now),
            KeyPerformanceIndicators = new Dictionary<string, double>
            {
                ["daily_active_users"] = 1234,
                ["searches_per_day"] = 12540,
                ["conversion_rate"] = 0.087,
                ["revenue_per_user"] = 13.37
            },
            TopInsights = await ComputeTopInsightsAsync(5)
        };
    }

    private async Task<List<InsightCard>> ComputeTopInsightsAsync(int count)
    {
        return new List<InsightCard>
        {
            new()
            {
                Title = "Search Performance Improving",
                Description = "Average response time decreased by 15% this week",
                Type = InsightType.Performance,
                Value = "287ms",
                Trend = TrendDirection.Down,
                TrendPercentage = 15.2,
                ActionableItems = new List<string> { "Continue database optimization", "Monitor cache performance" }
            },
            new()
            {
                Title = "Anime Content Gap Identified",
                Description = "High search volume for anime with low satisfaction scores",
                Type = InsightType.ContentOpportunity,
                Value = "34% satisfaction",
                Trend = TrendDirection.Down,
                TrendPercentage = 8.7,
                ActionableItems = new List<string> { "Negotiate anime licensing deals", "Survey users for specific titles" }
            }
        };
    }

    private async Task<SearchQualityMetrics> ComputeSearchQualityMetricsAsync(DateTime from, DateTime to)
    {
        return new SearchQualityMetrics
        {
            PeriodStart = from,
            PeriodEnd = to,
            AverageResultRelevance = 0.78,
            UserSatisfactionScore = 0.72,
            NoResultsRate = 0.08,
            LowQualityResultsRate = 0.15,
            QualityByContentType = new Dictionary<string, double>
            {
                ["Movie"] = 0.82,
                ["Show"] = 0.76,
                ["All"] = 0.74
            }
        };
    }

    private async Task<List<QualityIssue>> ComputeSearchQualityIssuesAsync()
    {
        return new List<QualityIssue>
        {
            new()
            {
                IssueType = "Low Relevance",
                Description = "Searches for specific actors return irrelevant results",
                Impact = 0.23,
                AffectedSearches = 1234,
                ExampleQueries = new List<string> { "tom hanks movies", "scarlett johansson films" },
                RecommendedFixes = new List<string> { "Improve actor-based search indexing", "Add cast information to search results" }
            }
        };
    }

    private byte[] ExportToCsv(Models.SearchPerformanceMetrics performance, UserBehaviorAnalytics behavior, BusinessIntelligenceMetrics business)
    {
        var csv = new StringBuilder();
        csv.AppendLine("Metric,Value,Period");
        csv.AppendLine($"Total Searches,{performance.TotalSearches},{performance.PeriodStart:yyyy-MM-dd} to {performance.PeriodEnd:yyyy-MM-dd}");
        csv.AppendLine($"Unique Users,{performance.UniqueUsers},{performance.PeriodStart:yyyy-MM-dd} to {performance.PeriodEnd:yyyy-MM-dd}");
        csv.AppendLine($"Average Response Time (ms),{performance.AverageResponseTimeMs:F2},{performance.PeriodStart:yyyy-MM-dd} to {performance.PeriodEnd:yyyy-MM-dd}");
        csv.AppendLine($"Cache Hit Rate,{performance.CacheHitRate:F2},{performance.PeriodStart:yyyy-MM-dd} to {performance.PeriodEnd:yyyy-MM-dd}");
        csv.AppendLine($"Click Through Rate,{behavior.ClickThroughRate:F2},{behavior.PeriodStart:yyyy-MM-dd} to {behavior.PeriodEnd:yyyy-MM-dd}");
        csv.AppendLine($"Conversion Rate,{behavior.ConversionRate:F2},{behavior.PeriodStart:yyyy-MM-dd} to {behavior.PeriodEnd:yyyy-MM-dd}");

        return Encoding.UTF8.GetBytes(csv.ToString());
    }

    private byte[] ExportToJson(Models.SearchPerformanceMetrics performance, UserBehaviorAnalytics behavior, BusinessIntelligenceMetrics business)
    {
        var data = new
        {
            performance,
            behavior,
            business,
            exportedAt = DateTime.UtcNow
        };

        var json = JsonSerializer.Serialize(data, new JsonSerializerOptions { WriteIndented = true });
        return Encoding.UTF8.GetBytes(json);
    }

    private byte[] ExportToExcel(Models.SearchPerformanceMetrics performance, UserBehaviorAnalytics behavior, BusinessIntelligenceMetrics business)
    {
        // Placeholder - would use a library like EPPlus to generate Excel files
        return ExportToCsv(performance, behavior, business);
    }

    public async Task<Dictionary<string, int>> GetTopSearchTermsAsync(DateTime from, DateTime to, int count = 10, CancellationToken cancellationToken = default)
    {
        try
        {
            // For now, return mock data since we don't have the full analytics infrastructure
            // In a real implementation, this would query the analytics database
            var mockData = new Dictionary<string, int>
            {
                { "streaming", 1000 },
                { "movies", 800 },
                { "netflix", 600 },
                { "action", 500 },
                { "comedy", 400 }
            };

            return mockData.Take(count).ToDictionary(x => x.Key, x => x.Value);
        }
        catch (Exception ex)
        {
            _loggerService.LogError(ex, "Error getting top search terms: {Message}", ex.Message);
            return new Dictionary<string, int>();
        }
    }

    public async Task<ContentPerformanceData> GetContentPerformanceAsync(Guid contentId, DateTime from, DateTime to, CancellationToken cancellationToken = default)
    {
        try
        {
            // For now, return mock data since we don't have the full analytics infrastructure
            // In a real implementation, this would query the analytics database for the specific content
            var mockData = new ContentPerformanceData
            {
                ContentId = contentId.ToString(),
                TotalSearches = 100,
                TotalClicks = 5,
                ClickThroughRate = 0.05m,
                UniqueUsers = 80,
                AverageTimeOnPage = 120.5,
                BounceRate = 0.3,
                TopSearchTerms = new List<string> { "movie title", "streaming", "watch online" }
            };

            return mockData;
        }
        catch (Exception ex)
        {
            _loggerService.LogError(ex, "Error getting content performance for {ContentId}: {Message}", contentId, ex.Message);
            return new ContentPerformanceData { ContentId = contentId.ToString() };
        }
    }

    public void Dispose()
    {
        _bufferFlushTimer?.Dispose();
        _bufferSemaphore?.Dispose();
    }
}