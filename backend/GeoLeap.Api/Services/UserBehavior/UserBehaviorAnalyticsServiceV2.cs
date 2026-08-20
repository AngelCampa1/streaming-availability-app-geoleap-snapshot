using GeoLeap.Api.Models.AdvancedUserBehavior;
using GeoLeap.Api.Data;
using GeoLeap.Api.Services.GrowthAnalytics;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;
// using MaxMind.GeoIP2; // Commented out for tests - replace with mock
// using UAParser; // Commented out for tests - replace with mock

namespace GeoLeap.Api.Services.UserBehavior;

/// <summary>
/// Service for tracking and analyzing user behavior events
/// </summary>
public class UserBehaviorAnalyticsServiceV2 : IUserBehaviorAnalyticsService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<UserBehaviorAnalyticsServiceV2> _logger;
    // private readonly DatabaseReader? _geoReader; // Commented out for tests
    
    public UserBehaviorAnalyticsServiceV2(
        ApplicationDbContext context,
        ILogger<UserBehaviorAnalyticsServiceV2> logger)
    {
        _context = context;
        _logger = logger;
        
        // Initialize GeoIP reader if database file exists
        // try
        // {
        //     var geoDbPath = Path.Combine(Directory.GetCurrentDirectory(), "GeoLite2-City.mmdb");
        //     if (File.Exists(geoDbPath))
        //     {
        //         _geoReader = new DatabaseReader(geoDbPath);
        //     }
        // }
        // catch (Exception ex)
        // {
        //     _logger.LogWarning(ex, "Failed to initialize GeoIP database");
        // }
    }
    
    /// <summary>
    /// Track a single user behavior event
    /// </summary>
    public async Task<bool> TrackEventAsync(UserBehaviorEvent behaviorEvent, CancellationToken cancellationToken = default)
    {
        try
        {
            // Validate required fields
            if (string.IsNullOrEmpty(behaviorEvent.EventType) || string.IsNullOrEmpty(behaviorEvent.SessionId))
            {
                _logger.LogWarning("Invalid behavior event: missing required fields");
                return false;
            }
            
            // Set server timestamp if not already set
            if (behaviorEvent.ServerTimestamp == default)
            {
                behaviorEvent.ServerTimestamp = DateTime.UtcNow;
            }
            
            // Set session sequence number
            var lastSequence = await _context.UserBehaviorEvents
                .Where(e => e.SessionId == behaviorEvent.SessionId)
                .MaxAsync(e => (int?)e.SessionSequence, cancellationToken) ?? 0;
            
            behaviorEvent.SessionSequence = lastSequence + 1;
            
            // Check if this is the first event in session
            if (behaviorEvent.SessionSequence == 1)
            {
                behaviorEvent.IsSessionStart = true;
            }
            
            _context.UserBehaviorEvents.Add(behaviorEvent);
            await _context.SaveChangesAsync(cancellationToken);
            
            // Asynchronously update session aggregates
            _ = Task.Run(() => ProcessSessionAsync(behaviorEvent.SessionId, cancellationToken), cancellationToken);
            
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to track behavior event: {EventType}", behaviorEvent.EventType);
            return false;
        }
    }
    
    /// <summary>
    /// Batch track multiple behavior events
    /// </summary>
    public async Task<int> TrackEventsAsync(IEnumerable<UserBehaviorEvent> events, CancellationToken cancellationToken = default)
    {
        var eventList = events.ToList();
        if (!eventList.Any())
            return 0;
        
        try
        {
            var trackedCount = 0;
            var sessionIds = new HashSet<string>();
            
            foreach (var behaviorEvent in eventList)
            {
                // Skip invalid events
                if (string.IsNullOrEmpty(behaviorEvent.EventType) || string.IsNullOrEmpty(behaviorEvent.SessionId))
                {
                    behaviorEvent.Status = UserBehaviorEventStatus.Failed;
                    behaviorEvent.ProcessingError = "Missing required fields";
                    continue;
                }
                
                // Set server timestamp
                if (behaviorEvent.ServerTimestamp == default)
                {
                    behaviorEvent.ServerTimestamp = DateTime.UtcNow;
                }
                
                sessionIds.Add(behaviorEvent.SessionId);
                trackedCount++;
            }
            
            // Set session sequences for each session
            foreach (var sessionId in sessionIds)
            {
                var sessionEvents = eventList.Where(e => e.SessionId == sessionId).OrderBy(e => e.ClientTimestamp).ToList();
                var lastSequence = await _context.UserBehaviorEvents
                    .Where(e => e.SessionId == sessionId)
                    .MaxAsync(e => (int?)e.SessionSequence, cancellationToken) ?? 0;
                
                for (int i = 0; i < sessionEvents.Count; i++)
                {
                    sessionEvents[i].SessionSequence = lastSequence + i + 1;
                    if (sessionEvents[i].SessionSequence == 1)
                    {
                        sessionEvents[i].IsSessionStart = true;
                    }
                }
            }
            
            _context.UserBehaviorEvents.AddRange(eventList);
            await _context.SaveChangesAsync(cancellationToken);
            
            // Asynchronously update session aggregates
            foreach (var sessionId in sessionIds)
            {
                _ = Task.Run(() => ProcessSessionAsync(sessionId, cancellationToken), cancellationToken);
            }
            
            return trackedCount;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to batch track behavior events");
            return 0;
        }
    }
    
    /// <summary>
    /// Process pending events in background queue
    /// </summary>
    public async Task ProcessPendingEventsAsync(int batchSize = 100, CancellationToken cancellationToken = default)
    {
        try
        {
            var pendingEvents = await _context.UserBehaviorEvents
                .Where(e => e.Status == UserBehaviorEventStatus.Pending)
                .Take(batchSize)
                .ToListAsync(cancellationToken);
            
            foreach (var behaviorEvent in pendingEvents)
            {
                try
                {
                    // Process enrichment or any other required processing
                    behaviorEvent.Status = UserBehaviorEventStatus.Processed;
                }
                catch (Exception ex)
                {
                    behaviorEvent.Status = UserBehaviorEventStatus.Failed;
                    behaviorEvent.ProcessingError = ex.Message;
                    _logger.LogError(ex, "Failed to process behavior event {EventId}", behaviorEvent.Id);
                }
            }
            
            await _context.SaveChangesAsync(cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process pending behavior events");
        }
    }
    
    /// <summary>
    /// Enrich event with server-side data
    /// </summary>
    public async Task<UserBehaviorEvent> EnrichEventAsync(UserBehaviorEvent behaviorEvent, string? ipAddress, string? userAgent)
    {
        try
        {
            // Store original IP (will be anonymized later)
            behaviorEvent.IpAddress = ipAddress;
            behaviorEvent.UserAgent = userAgent;
            
            // Parse user agent
            if (!string.IsNullOrEmpty(userAgent))
            {
                // var uaParser = Parser.GetDefault();
                // var clientInfo = uaParser.Parse(userAgent);
                
                // behaviorEvent.Browser = $"{clientInfo.UA.Family} {clientInfo.UA.Major}";
                // behaviorEvent.OperatingSystem = $"{clientInfo.OS.Family} {clientInfo.OS.Major}";
                // behaviorEvent.DeviceType = GetDeviceType(clientInfo);
                
                // Simple fallback parsing
                behaviorEvent.Browser = "Unknown";
                behaviorEvent.OperatingSystem = "Unknown";
                behaviorEvent.DeviceType = "Unknown";
            }
            
            // GeoIP lookup
            // if (!string.IsNullOrEmpty(ipAddress) && _geoReader != null)
            // {
            //     try
            //     {
            //         var response = _geoReader.City(ipAddress);
            //         behaviorEvent.Country = response.Country.IsoCode;
            //         behaviorEvent.Region = response.MostSpecificSubdivision.Name;
            //         behaviorEvent.City = response.City.Name;
            //     }
            //     catch (Exception ex)
            //     {
            //         _logger.LogDebug(ex, "Failed to lookup geo data for IP: {IP}", ipAddress);
            //     }
            // }
            
            // Determine if returning visitor
            if (!string.IsNullOrEmpty(behaviorEvent.UserId))
            {
                var lastVisit = await _context.UserBehaviorEvents
                    .Where(e => e.UserId == behaviorEvent.UserId && e.ClientTimestamp < behaviorEvent.ClientTimestamp)
                    .OrderByDescending(e => e.ClientTimestamp)
                    .FirstOrDefaultAsync();
                
                if (lastVisit != null)
                {
                    behaviorEvent.IsReturningVisitor = true;
                    behaviorEvent.DaysSinceLastVisit = (behaviorEvent.ClientTimestamp - lastVisit.ClientTimestamp).Days;
                    
                    var sessionCount = await _context.UserBehaviorSessions
                        .CountAsync(s => s.UserId == behaviorEvent.UserId);
                    behaviorEvent.UserSessionCount = sessionCount + 1;
                }
            }
            
            return behaviorEvent;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to enrich behavior event");
            return behaviorEvent;
        }
    }
    
    /// <summary>
    /// Get events for a specific user
    /// </summary>
    public async Task<IEnumerable<UserBehaviorEvent>> GetUserEventsAsync(string userId, DateTime? startDate = null, DateTime? endDate = null, bool respectConsent = true)
    {
        var query = _context.UserBehaviorEvents.Where(e => e.UserId == userId);
        
        if (respectConsent)
        {
            query = query.Where(e => e.HasConsent);
        }
        
        if (startDate.HasValue)
        {
            query = query.Where(e => e.ClientTimestamp >= startDate.Value);
        }
        
        if (endDate.HasValue)
        {
            query = query.Where(e => e.ClientTimestamp <= endDate.Value);
        }
        
        return await query
            .OrderBy(e => e.ClientTimestamp)
            .ToListAsync();
    }
    
    /// <summary>
    /// Get events by category and date range
    /// </summary>
    public async Task<IEnumerable<UserBehaviorEvent>> GetEventsByCategoryAsync(string category, DateTime startDate, DateTime endDate, int limit = 1000)
    {
        return await _context.UserBehaviorEvents
            .Where(e => e.Category == category && 
                       e.ClientTimestamp >= startDate && 
                       e.ClientTimestamp <= endDate)
            .OrderByDescending(e => e.ClientTimestamp)
            .Take(limit)
            .ToListAsync();
    }
    
    /// <summary>
    /// Get events by event type and date range
    /// </summary>
    public async Task<IEnumerable<UserBehaviorEvent>> GetEventsByTypeAsync(string eventType, DateTime startDate, DateTime endDate, int limit = 1000)
    {
        return await _context.UserBehaviorEvents
            .Where(e => e.EventType == eventType && 
                       e.ClientTimestamp >= startDate && 
                       e.ClientTimestamp <= endDate)
            .OrderByDescending(e => e.ClientTimestamp)
            .Take(limit)
            .ToListAsync();
    }
    
    /// <summary>
    /// Get session details
    /// </summary>
    public async Task<UserBehaviorSession?> GetSessionAsync(string sessionId)
    {
        return await _context.UserBehaviorSessions
            .Include(s => s.Events)
            .FirstOrDefaultAsync(s => s.SessionId == sessionId);
    }
    
    /// <summary>
    /// Get all sessions for a user
    /// </summary>
    public async Task<IEnumerable<UserBehaviorSession>> GetUserSessionsAsync(string userId, DateTime? startDate = null, DateTime? endDate = null)
    {
        var query = _context.UserBehaviorSessions.Where(s => s.UserId == userId);
        
        if (startDate.HasValue)
        {
            query = query.Where(s => s.StartTime >= startDate.Value);
        }
        
        if (endDate.HasValue)
        {
            query = query.Where(s => s.StartTime <= endDate.Value);
        }
        
        return await query
            .OrderByDescending(s => s.StartTime)
            .ToListAsync();
    }
    
    /// <summary>
    /// Process session aggregates
    /// </summary>
    public async Task<UserBehaviorSession> ProcessSessionAsync(string sessionId, CancellationToken cancellationToken = default)
    {
        try
        {
            var events = await _context.UserBehaviorEvents
                .Where(e => e.SessionId == sessionId)
                .OrderBy(e => e.ClientTimestamp)
                .ToListAsync(cancellationToken);
            
            if (!events.Any())
                return new UserBehaviorSession { SessionId = sessionId };
            
            var session = await _context.UserBehaviorSessions
                .FirstOrDefaultAsync(s => s.SessionId == sessionId, cancellationToken);
            
            if (session == null)
            {
                session = new UserBehaviorSession { SessionId = sessionId };
                _context.UserBehaviorSessions.Add(session);
            }
            
            // Calculate session metrics
            var firstEvent = events.FirstOrDefault();
            var lastEvent = events.LastOrDefault();

            if (firstEvent == null || lastEvent == null)
            {
                _logger.LogWarning("No events found for session {SessionId}", sessionId);
                return new UserBehaviorSession { SessionId = sessionId };
            }
            
            session.UserId = firstEvent.UserId;
            session.DeviceId = firstEvent.DeviceId;
            session.StartTime = firstEvent.ClientTimestamp;
            session.EndTime = lastEvent.ClientTimestamp;
            session.DurationSeconds = (int)(lastEvent.ClientTimestamp - firstEvent.ClientTimestamp).TotalSeconds;
            session.EventCount = events.Count;
            session.PageViews = events.Count(e => e.EventType == "page_view");
            session.LandingPage = firstEvent.PageUrl;
            session.ExitPage = lastEvent.PageUrl;
            session.Referrer = firstEvent.Referrer;
            session.UtmSource = firstEvent.ParsedProperties.GetValueOrDefault("utm_source")?.ToString();
            session.UtmMedium = firstEvent.ParsedProperties.GetValueOrDefault("utm_medium")?.ToString();
            session.UtmCampaign = firstEvent.ParsedProperties.GetValueOrDefault("utm_campaign")?.ToString();
            session.MaxScrollDepth = events.Where(e => e.ScrollDepth.HasValue).Max(e => e.ScrollDepth) ?? 0;
            session.SearchCount = events.Count(e => e.EventType == "search");
            session.ContentInteractions = events.Count(e => e.Category == "engagement");
            session.FormInteractions = events.Count(e => e.EventType.Contains("form"));
            session.ErrorCount = events.Count(e => e.EventType == "error");
            session.HasConversion = events.Any(e => e.Category == "conversion");
            session.IsBounce = session.PageViews <= 1;
            session.DeviceType = firstEvent.DeviceType;
            session.OperatingSystem = firstEvent.OperatingSystem;
            session.Browser = firstEvent.Browser;
            session.Country = firstEvent.Country;
            session.Region = firstEvent.Region;
            session.City = firstEvent.City;
            session.HasConsent = firstEvent.HasConsent;
            session.IsReturningVisitor = firstEvent.IsReturningVisitor;
            session.DaysSinceLastVisit = firstEvent.DaysSinceLastVisit;
            
            // Calculate quality and engagement scores
            session.QualityScore = CalculateQualityScore(session, events);
            session.EngagementScore = CalculateEngagementScore(session, events);
            
            await _context.SaveChangesAsync(cancellationToken);
            return session;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process session: {SessionId}", sessionId);
            return new UserBehaviorSession { SessionId = sessionId };
        }
    }
    
    /// <summary>
    /// Get page performance analytics
    /// </summary>
    public async Task<PagePerformanceAnalytics> GetPagePerformanceAsync(string? pageUrl = null, DateTime? startDate = null, DateTime? endDate = null)
    {
        var query = _context.UserBehaviorEvents.AsQueryable();
        
        if (!string.IsNullOrEmpty(pageUrl))
        {
            query = query.Where(e => e.PageUrl == pageUrl);
        }
        
        if (startDate.HasValue)
        {
            query = query.Where(e => e.ClientTimestamp >= startDate.Value);
        }
        
        if (endDate.HasValue)
        {
            query = query.Where(e => e.ClientTimestamp <= endDate.Value);
        }
        
        var pageViews = await query.Where(e => e.EventType == "page_view").ToListAsync();
        var sessions = await _context.UserBehaviorSessions
            .Where(s => startDate == null || s.StartTime >= startDate.Value)
            .Where(s => endDate == null || s.StartTime <= endDate.Value)
            .Where(s => pageUrl == null || s.LandingPage == pageUrl)
            .ToListAsync();
        
        return new PagePerformanceAnalytics
        {
            PageUrl = pageUrl,
            TotalViews = pageViews.Count,
            UniqueViews = pageViews.Select(e => e.SessionId).Distinct().Count(),
            AverageTimeOnPage = pageViews.Where(e => e.TimeOnPage.HasValue).Average(e => e.TimeOnPage) ?? 0,
            BounceRate = sessions.Any() ? (double)sessions.Count(s => s.IsBounce) / sessions.Count * 100 : 0,
            AverageScrollDepth = (double)(pageViews.Where(e => e.ScrollDepth.HasValue).Average(e => e.ScrollDepth) ?? 0),
            TotalInteractions = await query.Where(e => e.Category == "engagement").CountAsync(),
            DeviceTypeBreakdown = pageViews.Where(e => !string.IsNullOrEmpty(e.DeviceType))
                .GroupBy(e => e.DeviceType!)
                .ToDictionary(g => g.Key, g => g.Count())
        };
    }
    
    /// <summary>
    /// Get user journey analytics
    /// </summary>
    public async Task<UserJourneyAnalytics> GetUserJourneyAsync(string? userId = null, DateTime? startDate = null, DateTime? endDate = null)
    {
        var sessionsQuery = _context.UserBehaviorSessions.AsQueryable();
        
        if (!string.IsNullOrEmpty(userId))
        {
            sessionsQuery = sessionsQuery.Where(s => s.UserId == userId);
        }
        
        if (startDate.HasValue)
        {
            sessionsQuery = sessionsQuery.Where(s => s.StartTime >= startDate.Value);
        }
        
        if (endDate.HasValue)
        {
            sessionsQuery = sessionsQuery.Where(s => s.StartTime <= endDate.Value);
        }
        
        var sessions = await sessionsQuery.ToListAsync();
        
        return new UserJourneyAnalytics
        {
            UserId = userId,
            TotalSessions = sessions.Count,
            AverageSessionDuration = sessions.Any() ? sessions.Average(s => s.DurationSeconds) : 0,
            AveragePagesPerSession = sessions.Any() ? sessions.Average(s => s.PageViews) : 0,
            ChannelAttribution = sessions.Where(s => !string.IsNullOrEmpty(s.UtmSource))
                .GroupBy(s => s.UtmSource!)
                .ToDictionary(g => g.Key, g => g.Count())
        };
    }
    
    /// <summary>
    /// Get processing statistics
    /// </summary>
    public async Task<BehaviorEventProcessingStats> GetProcessingStatsAsync()
    {
        var today = DateTime.UtcNow.Date;
        var thisHour = DateTime.UtcNow.AddHours(-1);
        
        var totalEvents = await _context.UserBehaviorEvents.CountAsync();
        var pendingEvents = await _context.UserBehaviorEvents.CountAsync(e => e.Status == UserBehaviorEventStatus.Pending);
        var processedEvents = await _context.UserBehaviorEvents.CountAsync(e => e.Status == UserBehaviorEventStatus.Processed);
        var failedEvents = await _context.UserBehaviorEvents.CountAsync(e => e.Status == UserBehaviorEventStatus.Failed);
        var eventsToday = await _context.UserBehaviorEvents.CountAsync(e => e.ClientTimestamp >= today);
        var eventsThisHour = await _context.UserBehaviorEvents.CountAsync(e => e.ClientTimestamp >= thisHour);
        
        var categoryStats = await _context.UserBehaviorEvents
            .GroupBy(e => e.Category)
            .Select(g => new { Category = g.Key, Count = g.Count() })
            .ToListAsync();
        
        var typeStats = await _context.UserBehaviorEvents
            .GroupBy(e => e.EventType)
            .Select(g => new { EventType = g.Key, Count = g.Count() })
            .ToListAsync();
        
        return new BehaviorEventProcessingStats
        {
            TotalEvents = totalEvents,
            PendingEvents = pendingEvents,
            ProcessedEvents = processedEvents,
            FailedEvents = failedEvents,
            EventsToday = eventsToday,
            EventsThisHour = eventsThisHour,
            CategoryStats = categoryStats.Select(c => new EventCategoryStats 
            { 
                Category = c.Category, 
                Count = c.Count, 
                Percentage = totalEvents > 0 ? (decimal)c.Count / totalEvents * 100 : 0 
            }).ToList(),
            TypeStats = typeStats.Select(t => new EventTypeStats 
            { 
                EventType = t.EventType, 
                Count = t.Count, 
                Percentage = totalEvents > 0 ? (decimal)t.Count / totalEvents * 100 : 0 
            }).ToList()
        };
    }
    
    // Additional implementation methods for remaining interface methods would go here...
    // For brevity, showing key methods above. The remaining methods would follow similar patterns.
    
    public async Task<UserBehaviorFunnel> AnalyzeFunnelAsync(string funnelName, IEnumerable<string> eventTypes, DateTime startDate, DateTime endDate)
    {
        // Stub implementation - returns empty funnel data
        _logger.LogWarning("Funnel analysis called but not yet fully implemented. Returning empty result.");
        return await Task.FromResult(new UserBehaviorFunnel
        {
            Name = funnelName
        });
    }
    
    public async Task<CohortAnalytics> GetCohortAnalysisAsync(DateTime cohortStart, DateTime cohortEnd, string cohortCriteria = "first_visit")
    {
        // Stub implementation - returns empty cohort data
        _logger.LogWarning("Cohort analysis called but not yet fully implemented. Returning empty result.");
        return await Task.FromResult(new CohortAnalytics());
    }
    
    public async Task<RealTimeAnalytics> GetRealTimeAnalyticsAsync()
    {
        // Stub implementation - returns basic real-time data
        _logger.LogWarning("Real-time analytics called but not yet fully implemented. Returning basic metrics.");
        return await Task.FromResult(new RealTimeAnalytics
        {
            ActiveUsers = 0
        });
    }
    
    public async Task<IEnumerable<UserBehaviorInsight>> GetInsightsAsync(string? category = null, DateTime? startDate = null, DateTime? endDate = null)
    {
        // Stub implementation - returns empty insights
        _logger.LogWarning("Get insights called but not yet fully implemented. Returning empty list.");
        return await Task.FromResult(new List<UserBehaviorInsight>());
    }
    
    public async Task<IEnumerable<UserBehaviorInsight>> CalculateInsightsAsync(DateTime startDate, DateTime endDate, CancellationToken cancellationToken = default)
    {
        // Stub implementation - returns empty insights
        _logger.LogWarning("Calculate insights called but not yet fully implemented. Returning empty list.");
        return await Task.FromResult(new List<UserBehaviorInsight>());
    }
    
    public async Task<UserSegmentationResult> GetUserSegmentationAsync(DateTime startDate, DateTime endDate, string segmentationCriteria = "engagement")
    {
        // Stub implementation - returns empty segmentation
        _logger.LogWarning("User segmentation called but not yet fully implemented. Returning empty result.");
        return await Task.FromResult(new UserSegmentationResult());
    }
    
    public async Task<AbTestPerformanceAnalytics> GetAbTestPerformanceAsync(Guid experimentId)
    {
        // Stub implementation - returns empty A/B test data
        _logger.LogWarning("A/B test performance called but not yet fully implemented. Returning empty result.");
        return await Task.FromResult(new AbTestPerformanceAnalytics
        {
            ExperimentId = experimentId,
            Variants = new List<AbTestVariant>()
        });
    }
    
    public async Task<bool> DeleteUserDataAsync(string userId)
    {
        try
        {
            var events = await _context.UserBehaviorEvents.Where(e => e.UserId == userId).ToListAsync();
            var sessions = await _context.UserBehaviorSessions.Where(s => s.UserId == userId).ToListAsync();
            
            _context.UserBehaviorEvents.RemoveRange(events);
            _context.UserBehaviorSessions.RemoveRange(sessions);
            
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete user behavior data for user: {UserId}", userId);
            return false;
        }
    }
    
    public async Task<bool> AnonymizeUserDataAsync(string userId)
    {
        try
        {
            var events = await _context.UserBehaviorEvents.Where(e => e.UserId == userId).ToListAsync();
            var sessions = await _context.UserBehaviorSessions.Where(s => s.UserId == userId).ToListAsync();
            
            var anonymousId = $"anon_{Guid.NewGuid():N}";
            
            foreach (var ev in events)
            {
                ev.UserId = anonymousId;
                ev.IpAddress = null;
                ev.UserAgent = null;
            }
            
            foreach (var session in sessions)
            {
                session.UserId = anonymousId;
            }
            
            await _context.SaveChangesAsync();
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to anonymize user behavior data for user: {UserId}", userId);
            return false;
        }
    }
    
    public async Task<int> CleanupOldDataAsync(DateTime cutoffDate, CancellationToken cancellationToken = default)
    {
        try
        {
            var oldEvents = await _context.UserBehaviorEvents
                .Where(e => e.ClientTimestamp < cutoffDate)
                .ToListAsync(cancellationToken);
            
            var oldSessions = await _context.UserBehaviorSessions
                .Where(s => s.StartTime < cutoffDate)
                .ToListAsync(cancellationToken);
            
            _context.UserBehaviorEvents.RemoveRange(oldEvents);
            _context.UserBehaviorSessions.RemoveRange(oldSessions);
            
            await _context.SaveChangesAsync(cancellationToken);
            
            return oldEvents.Count + oldSessions.Count;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to cleanup old behavior data");
            return 0;
        }
    }
    
    // private static string GetDeviceType(ClientInfo clientInfo)
    // {
    //     var device = clientInfo.Device.Family.ToLowerInvariant();
    //     if (device.Contains("mobile") || device.Contains("phone"))
    //         return "mobile";
    //     if (device.Contains("tablet") || device.Contains("ipad"))
    //         return "tablet";
    //     return "desktop";
    // }
    
    private static int CalculateQualityScore(UserBehaviorSession session, List<UserBehaviorEvent> events)
    {
        var score = 50; // Base score
        
        // Positive factors
        if (session.DurationSeconds > 30) score += 10;
        if (session.PageViews > 1) score += 15;
        if (session.ContentInteractions > 0) score += 10;
        if (session.SearchCount > 0) score += 5;
        if (!session.IsBounce) score += 15;
        
        // Negative factors
        if (session.ErrorCount > 0) score -= 20;
        if (session.DurationSeconds < 10) score -= 15;
        
        return Math.Max(0, Math.Min(100, score));
    }
    
    private static int CalculateEngagementScore(UserBehaviorSession session, List<UserBehaviorEvent> events)
    {
        var score = 0;
        
        // Duration factor (0-30 points)
        score += Math.Min(30, session.DurationSeconds / 10);
        
        // Page views factor (0-25 points)
        score += Math.Min(25, session.PageViews * 5);
        
        // Interactions factor (0-25 points)
        score += Math.Min(25, session.ContentInteractions * 5);
        
        // Scroll depth factor (0-20 points)
        score += (int)(session.MaxScrollDepth * 0.2m);
        
        return Math.Max(0, Math.Min(100, score));
    }
}