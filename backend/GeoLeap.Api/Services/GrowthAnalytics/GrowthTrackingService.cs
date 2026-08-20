using GeoLeap.Api.Data;
using GeoLeap.Api.Models.GrowthAnalytics;
using Microsoft.EntityFrameworkCore;
using System.Net;
using System.Text.Json;
using UAParser;

namespace GeoLeap.Api.Services.GrowthAnalytics;

/// <summary>
/// Implementation of growth event tracking with high-performance batch processing
/// </summary>
public class GrowthTrackingService : IGrowthTrackingService
{
    private readonly ApplicationDbContext _context;
    private readonly ILogger<GrowthTrackingService> _logger;
    private readonly IConfiguration _configuration;
    private readonly Parser _uaParser;
    
    public GrowthTrackingService(
        ApplicationDbContext context, 
        ILogger<GrowthTrackingService> logger,
        IConfiguration configuration)
    {
        _context = context;
        _logger = logger;
        _configuration = configuration;
        _uaParser = Parser.GetDefault();
    }
    
    public async Task<bool> TrackEventAsync(GrowthEvent growthEvent, CancellationToken cancellationToken = default)
    {
        try
        {
            // Set server timestamp
            growthEvent.ServerTimestamp = DateTime.UtcNow;
            
            // Validate required fields
            if (string.IsNullOrEmpty(growthEvent.EventName) || string.IsNullOrEmpty(growthEvent.SessionId))
            {
                _logger.LogWarning("Invalid growth event: missing required fields");
                return false;
            }
            
            // Add to database
            _context.GrowthEvents.Add(growthEvent);
            await _context.SaveChangesAsync(cancellationToken);
            
            _logger.LogDebug("Growth event tracked: {EventName} for session {SessionId}", 
                growthEvent.EventName, growthEvent.SessionId);
            
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to track growth event: {EventName}", growthEvent.EventName);
            return false;
        }
    }
    
    public async Task<int> TrackEventsAsync(IEnumerable<GrowthEvent> events, CancellationToken cancellationToken = default)
    {
        var eventList = events.ToList();
        if (!eventList.Any()) return 0;
        
        try
        {
            var validEvents = new List<GrowthEvent>();
            var serverTimestamp = DateTime.UtcNow;
            
            foreach (var growthEvent in eventList)
            {
                // Set server timestamp
                growthEvent.ServerTimestamp = serverTimestamp;
                
                // Validate required fields
                if (!string.IsNullOrEmpty(growthEvent.EventName) && !string.IsNullOrEmpty(growthEvent.SessionId))
                {
                    validEvents.Add(growthEvent);
                }
                else
                {
                    _logger.LogWarning("Skipping invalid growth event: missing required fields");
                }
            }
            
            if (validEvents.Any())
            {
                _context.GrowthEvents.AddRange(validEvents);
                await _context.SaveChangesAsync(cancellationToken);
                
                _logger.LogInformation("Batch tracked {Count} growth events", validEvents.Count);
                return validEvents.Count;
            }
            
            return 0;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to batch track {Count} growth events", eventList.Count);
            return 0;
        }
    }
    
    public async Task ProcessPendingEventsAsync(int batchSize = 100, CancellationToken cancellationToken = default)
    {
        try
        {
            var pendingEvents = await _context.GrowthEvents
                .Where(e => e.Status == GrowthEventStatus.Pending)
                .OrderBy(e => e.ServerTimestamp)
                .Take(batchSize)
                .ToListAsync(cancellationToken);
            
            if (!pendingEvents.Any())
            {
                _logger.LogDebug("No pending events to process");
                return;
            }
            
            var processed = 0;
            var failed = 0;
            
            foreach (var growthEvent in pendingEvents)
            {
                try
                {
                    // Process event (enrichment, validation, etc.)
                    await ProcessEventAsync(growthEvent);
                    growthEvent.Status = GrowthEventStatus.Processed;
                    processed++;
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to process event {EventId}", growthEvent.Id);
                    growthEvent.Status = GrowthEventStatus.Failed;
                    growthEvent.ErrorMessage = ex.Message.Length > 500 ? ex.Message[..500] : ex.Message;
                    failed++;
                }
            }
            
            await _context.SaveChangesAsync(cancellationToken);
            
            _logger.LogInformation("Processed {Processed} events, {Failed} failed", processed, failed);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to process pending events");
        }
    }
    
    public async Task<GrowthEvent> EnrichEventAsync(GrowthEvent growthEvent, string? ipAddress, string? userAgent)
    {
        try
        {
            // Parse user agent
            if (!string.IsNullOrEmpty(userAgent))
            {
                var clientInfo = _uaParser.Parse(userAgent);
                growthEvent.UserAgent = userAgent.Length > 500 ? userAgent[..500] : userAgent;
                growthEvent.Browser = $"{clientInfo.UA.Family} {clientInfo.UA.Major}";
                growthEvent.OperatingSystem = $"{clientInfo.OS.Family} {clientInfo.OS.Major}";
                growthEvent.DeviceType = DetermineDeviceType(clientInfo.Device.Family);
            }
            
            // Geo-location from IP (in production, use a proper geo-IP service)
            if (!string.IsNullOrEmpty(ipAddress) && IPAddress.TryParse(ipAddress, out var ip))
            {
                growthEvent.IpAddress = ipAddress;
                
                // For demo purposes, set some default geo data
                // In production, integrate with MaxMind GeoIP2 or similar
                if (!ip.IsPrivate())
                {
                    growthEvent.Country = "US"; // Default for demo
                    growthEvent.Region = "California";
                    growthEvent.City = "San Francisco";
                }
            }
            
            return growthEvent;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to enrich event {EventId}", growthEvent.Id);
            return growthEvent;
        }
    }
    
    public async Task<IEnumerable<GrowthEvent>> GetUserEventsAsync(string userId, DateTime? startDate = null, DateTime? endDate = null, bool respectConsent = true)
    {
        var query = _context.GrowthEvents
            .Where(e => e.UserId == userId);
        
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
    
    public async Task<IEnumerable<GrowthEvent>> GetEventsByCategoryAsync(string category, DateTime startDate, DateTime endDate, int limit = 1000)
    {
        return await _context.GrowthEvents
            .Where(e => e.Category == category && 
                       e.ClientTimestamp >= startDate && 
                       e.ClientTimestamp <= endDate)
            .OrderBy(e => e.ClientTimestamp)
            .Take(limit)
            .ToListAsync();
    }
    
    public async Task<bool> DeleteUserDataAsync(string userId)
    {
        try
        {
            var userEvents = await _context.GrowthEvents
                .Where(e => e.UserId == userId)
                .ToListAsync();
            
            _context.GrowthEvents.RemoveRange(userEvents);
            await _context.SaveChangesAsync();
            
            _logger.LogInformation("Deleted {Count} events for user {UserId} (GDPR compliance)", 
                userEvents.Count, userId);
            
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete user data for {UserId}", userId);
            return false;
        }
    }
    
    public async Task<bool> AnonymizeUserDataAsync(string userId)
    {
        try
        {
            var userEvents = await _context.GrowthEvents
                .Where(e => e.UserId == userId)
                .ToListAsync();
            
            foreach (var evt in userEvents)
            {
                evt.UserId = null;
                evt.IpAddress = null;
                // Keep session and device IDs for analytics but remove PII
            }
            
            await _context.SaveChangesAsync();
            
            _logger.LogInformation("Anonymized {Count} events for user {UserId} (GDPR compliance)", 
                userEvents.Count, userId);
            
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to anonymize user data for {UserId}", userId);
            return false;
        }
    }
    
    public async Task<EventProcessingStats> GetProcessingStatsAsync()
    {
        var stats = new EventProcessingStats();
        var now = DateTime.UtcNow;
        var today = now.Date;
        var thisHour = new DateTime(now.Year, now.Month, now.Day, now.Hour, 0, 0);
        
        // Get basic counts
        stats.TotalEvents = await _context.GrowthEvents.CountAsync();
        stats.PendingEvents = await _context.GrowthEvents.CountAsync(e => e.Status == GrowthEventStatus.Pending);
        stats.ProcessedEvents = await _context.GrowthEvents.CountAsync(e => e.Status == GrowthEventStatus.Processed);
        stats.FailedEvents = await _context.GrowthEvents.CountAsync(e => e.Status == GrowthEventStatus.Failed);
        
        // Time-based counts
        stats.EventsToday = await _context.GrowthEvents
            .CountAsync(e => e.ServerTimestamp >= today);
        stats.EventsThisHour = await _context.GrowthEvents
            .CountAsync(e => e.ServerTimestamp >= thisHour);
        
        // Last processed
        var lastProcessed = await _context.GrowthEvents
            .Where(e => e.Status == GrowthEventStatus.Processed)
            .MaxAsync(e => (DateTime?)e.ServerTimestamp);
        stats.LastProcessedAt = lastProcessed ?? DateTime.MinValue;
        
        // Category statistics
        stats.CategoryStats = await _context.GrowthEvents
            .Where(e => e.ServerTimestamp >= today)
            .GroupBy(e => e.Category)
            .Select(g => new EventCategoryStats
            {
                Category = g.Key,
                Count = g.Count(),
                Percentage = (decimal)g.Count() / stats.EventsToday * 100
            })
            .OrderByDescending(s => s.Count)
            .ToListAsync();
        
        return stats;
    }
    
    private async Task ProcessEventAsync(GrowthEvent growthEvent)
    {
        // Additional processing logic can be added here:
        // - Data validation
        // - Fraud detection
        // - Real-time aggregations
        // - Triggering alerts
        
        await Task.CompletedTask; // Placeholder for async operations
    }
    
    private string DetermineDeviceType(string deviceFamily)
    {
        return deviceFamily.ToLower() switch
        {
            var d when d.Contains("mobile") || d.Contains("phone") => "mobile",
            var d when d.Contains("tablet") || d.Contains("ipad") => "tablet",
            _ => "desktop"
        };
    }
}

/// <summary>
/// Extension methods for IP address utilities
/// </summary>
public static class IPAddressExtensions
{
    public static bool IsPrivate(this IPAddress ip)
    {
        if (ip.AddressFamily == System.Net.Sockets.AddressFamily.InterNetwork)
        {
            var bytes = ip.GetAddressBytes();
            return bytes[0] switch
            {
                10 => true,
                172 when bytes[1] >= 16 && bytes[1] <= 31 => true,
                192 when bytes[1] == 168 => true,
                _ => false
            };
        }
        return false;
    }
}