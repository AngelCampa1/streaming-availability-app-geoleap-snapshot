using GeoLeap.Api.Data;
using GeoLeap.Api.Models.GrowthAnalytics;
using Microsoft.EntityFrameworkCore;

namespace GeoLeap.Api.Services.GrowthAnalytics;

/// <summary>
/// Growth alerts service implementation
/// </summary>
public class GrowthAlertsService : IGrowthAlertsService
{
    private readonly ApplicationDbContext _context;
    private readonly IGrowthTrackingService _growthService;
    private readonly ILogger<GrowthAlertsService> _logger;
    
    public GrowthAlertsService(
        ApplicationDbContext context, 
        IGrowthTrackingService growthService,
        ILogger<GrowthAlertsService> logger)
    {
        _context = context;
        _growthService = growthService;
        _logger = logger;
    }
    
    public async Task<GrowthAlert> CreateAlertAsync(GrowthAlert alert)
    {
        try
        {
            alert.CreatedAt = DateTime.UtcNow;
            alert.UpdatedAt = DateTime.UtcNow;
            
            _context.GrowthAlerts.Add(alert);
            await _context.SaveChangesAsync();
            
            _logger.LogInformation("Created growth alert: {AlertName} for user {UserId}", 
                alert.Name, alert.UserId);
            
            return alert;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to create growth alert: {AlertName}", alert.Name);
            throw;
        }
    }
    
    public async Task EvaluateAlertsAsync()
    {
        try
        {
            var activeAlerts = await _context.GrowthAlerts
                .Where(a => a.IsEnabled)
                .ToListAsync();
            
            _logger.LogDebug("Evaluating {AlertCount} active growth alerts", activeAlerts.Count);
            
            foreach (var alert in activeAlerts)
            {
                await EvaluateAlertAsync(alert);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to evaluate growth alerts");
        }
    }
    
    public async Task<IEnumerable<GrowthAlert>> GetUserAlertsAsync(string userId)
    {
        return await _context.GrowthAlerts
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.CreatedAt)
            .ToListAsync();
    }
    
    public async Task<IEnumerable<AlertTrigger>> GetAlertHistoryAsync(Guid? alertId = null, int limit = 100)
    {
        var query = _context.AlertTriggers
            .Include(t => t.Alert)
            .OrderByDescending(t => t.TriggeredAt);
        
        if (alertId.HasValue)
        {
            query = (IOrderedQueryable<AlertTrigger>)query.Where(t => t.AlertId == alertId.Value);
        }
        
        return await query.Take(limit).ToListAsync();
    }
    
    public async Task<bool> UpdateAlertAsync(Guid alertId, GrowthAlert alert)
    {
        try
        {
            var existingAlert = await _context.GrowthAlerts
                .FirstOrDefaultAsync(a => a.Id == alertId);
            
            if (existingAlert == null)
            {
                return false;
            }
            
            existingAlert.Name = alert.Name;
            existingAlert.Description = alert.Description;
            existingAlert.Metric = alert.Metric;
            existingAlert.Condition = alert.Condition;
            existingAlert.ThresholdValue = alert.ThresholdValue;
            existingAlert.TimeWindow = alert.TimeWindow;
            existingAlert.EvaluationFrequency = alert.EvaluationFrequency;
            existingAlert.NotificationChannels = alert.NotificationChannels;
            existingAlert.Severity = alert.Severity;
            existingAlert.IsEnabled = alert.IsEnabled;
            existingAlert.Configuration = alert.Configuration;
            existingAlert.UpdatedAt = DateTime.UtcNow;
            
            await _context.SaveChangesAsync();
            
            _logger.LogInformation("Updated growth alert: {AlertName}", alert.Name);
            
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update growth alert {AlertId}", alertId);
            return false;
        }
    }
    
    public async Task<bool> DisableAlertAsync(Guid alertId)
    {
        try
        {
            var alert = await _context.GrowthAlerts
                .FirstOrDefaultAsync(a => a.Id == alertId);
            
            if (alert == null)
            {
                return false;
            }
            
            alert.IsEnabled = false;
            alert.UpdatedAt = DateTime.UtcNow;
            
            await _context.SaveChangesAsync();
            
            _logger.LogInformation("Disabled growth alert: {AlertName}", alert.Name);
            
            return true;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to disable growth alert {AlertId}", alertId);
            return false;
        }
    }
    
    private async Task EvaluateAlertAsync(GrowthAlert alert)
    {
        try
        {
            // Skip if evaluated too recently
            if (alert.LastEvaluatedAt.HasValue)
            {
                var nextEvaluation = alert.LastEvaluatedAt.Value.Add(ParseTimeWindow(alert.EvaluationFrequency));
                if (DateTime.UtcNow < nextEvaluation)
                {
                    return;
                }
            }
            
            // Get current metric value
            var currentValue = await GetMetricValueAsync(alert.Metric, alert.TimeWindow);
            
            // Evaluate condition
            var shouldTrigger = EvaluateCondition(alert, currentValue);
            
            if (shouldTrigger)
            {
                await TriggerAlertAsync(alert, currentValue);
            }
            
            // Update last evaluated time
            alert.LastEvaluatedAt = DateTime.UtcNow;
            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to evaluate alert {AlertId}", alert.Id);
        }
    }
    
    private async Task<decimal> GetMetricValueAsync(string metric, string timeWindow)
    {
        var timeSpan = ParseTimeWindow(timeWindow);
        var startDate = DateTime.UtcNow.Subtract(timeSpan);
        
        return metric.ToLower() switch
        {
            "event_count" => await GetEventCountAsync(startDate),
            "conversion_rate" => await GetConversionRateAsync(startDate),
            "user_count" => await GetUniqueUserCountAsync(startDate),
            "error_rate" => await GetErrorRateAsync(startDate),
            _ => 0
        };
    }
    
    private async Task<decimal> GetEventCountAsync(DateTime startDate)
    {
        return await _context.GrowthEvents
            .Where(e => e.ServerTimestamp >= startDate)
            .CountAsync();
    }
    
    private async Task<decimal> GetConversionRateAsync(DateTime startDate)
    {
        var totalEvents = await _context.GrowthEvents
            .Where(e => e.ServerTimestamp >= startDate)
            .CountAsync();
        
        var conversionEvents = await _context.GrowthEvents
            .Where(e => e.ServerTimestamp >= startDate && e.Category == "conversion")
            .CountAsync();
        
        return totalEvents > 0 ? (decimal)conversionEvents / totalEvents * 100 : 0;
    }
    
    private async Task<decimal> GetUniqueUserCountAsync(DateTime startDate)
    {
        return await _context.GrowthEvents
            .Where(e => e.ServerTimestamp >= startDate && e.UserId != null)
            .Select(e => e.UserId)
            .Distinct()
            .CountAsync();
    }
    
    private async Task<decimal> GetErrorRateAsync(DateTime startDate)
    {
        var totalEvents = await _context.GrowthEvents
            .Where(e => e.ServerTimestamp >= startDate)
            .CountAsync();
        
        var errorEvents = await _context.GrowthEvents
            .Where(e => e.ServerTimestamp >= startDate && e.Status == GrowthEventStatus.Failed)
            .CountAsync();
        
        return totalEvents > 0 ? (decimal)errorEvents / totalEvents * 100 : 0;
    }
    
    private bool EvaluateCondition(GrowthAlert alert, decimal currentValue)
    {
        return alert.Condition switch
        {
            AlertCondition.GreaterThan => currentValue > alert.ThresholdValue,
            AlertCondition.LessThan => currentValue < alert.ThresholdValue,
            AlertCondition.GreaterThanOrEqual => currentValue >= alert.ThresholdValue,
            AlertCondition.LessThanOrEqual => currentValue <= alert.ThresholdValue,
            AlertCondition.ThresholdCrossed => Math.Abs(currentValue - alert.ThresholdValue) < 0.01m,
            _ => false
        };
    }
    
    private async Task TriggerAlertAsync(GrowthAlert alert, decimal currentValue)
    {
        try
        {
            var trigger = new AlertTrigger
            {
                AlertId = alert.Id,
                TriggerValue = currentValue,
                ThresholdValue = alert.ThresholdValue,
                Message = GenerateAlertMessage(alert, currentValue),
                TriggeredAt = DateTime.UtcNow,
                Context = $"{{\"metric\":\"{alert.Metric}\",\"timeWindow\":\"{alert.TimeWindow}\"}}"
            };
            
            _context.AlertTriggers.Add(trigger);
            await _context.SaveChangesAsync();
            
            // Send notifications (simplified - in production integrate with email/Slack/etc.)
            await SendNotificationsAsync(alert, trigger);
            
            _logger.LogWarning("Growth alert triggered: {AlertName} - {Message}", 
                alert.Name, trigger.Message);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to trigger alert {AlertId}", alert.Id);
        }
    }
    
    private string GenerateAlertMessage(GrowthAlert alert, decimal currentValue)
    {
        return $"Alert '{alert.Name}': {alert.Metric} is {currentValue:F2} " +
               $"(threshold: {alert.ThresholdValue:F2}, condition: {alert.Condition})";
    }
    
    private async Task SendNotificationsAsync(GrowthAlert alert, AlertTrigger trigger)
    {
        try
        {
            // Simplified notification sending
            // In production: integrate with IEmailService, Slack SDK, webhook calls, etc.
            
            foreach (var channel in alert.NotificationChannels)
            {
                _logger.LogInformation("Sending {Severity} alert notification via {Channel}: {Message}", 
                    alert.Severity, channel, trigger.Message);
            }
            
            trigger.NotificationsSent = true;
            await _context.SaveChangesAsync();
        }
        catch (Exception ex)
        {
            trigger.NotificationError = ex.Message;
            await _context.SaveChangesAsync();
            
            _logger.LogError(ex, "Failed to send notifications for alert {AlertId}", alert.Id);
        }
    }
    
    private TimeSpan ParseTimeWindow(string timeWindow)
    {
        if (string.IsNullOrEmpty(timeWindow)) return TimeSpan.FromHours(1);
        if (timeWindow.Length < 2) return TimeSpan.FromHours(1);

        var unit = timeWindow[^1];
        var value = int.Parse(timeWindow[..^1]);
        
        return unit switch
        {
            'm' => TimeSpan.FromMinutes(value),
            'h' => TimeSpan.FromHours(value),
            'd' => TimeSpan.FromDays(value),
            'w' => TimeSpan.FromDays(value * 7),
            _ => TimeSpan.FromHours(1)
        };
    }
}