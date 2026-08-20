using GeoLeap.Api.Models.GrowthAnalytics;

namespace GeoLeap.Api.Services.GrowthAnalytics;

/// <summary>
/// Service for automated growth analytics alerts and notifications
/// </summary>
public interface IGrowthAlertsService
{
    /// <summary>
    /// Create a new growth alert rule
    /// </summary>
    Task<GrowthAlert> CreateAlertAsync(GrowthAlert alert);
    
    /// <summary>
    /// Evaluate all active alert rules
    /// </summary>
    Task EvaluateAlertsAsync();
    
    /// <summary>
    /// Get all alerts for a user
    /// </summary>
    Task<IEnumerable<GrowthAlert>> GetUserAlertsAsync(string userId);
    
    /// <summary>
    /// Get triggered alert history
    /// </summary>
    Task<IEnumerable<AlertTrigger>> GetAlertHistoryAsync(Guid? alertId = null, int limit = 100);
    
    /// <summary>
    /// Update alert configuration
    /// </summary>
    Task<bool> UpdateAlertAsync(Guid alertId, GrowthAlert alert);
    
    /// <summary>
    /// Disable an alert
    /// </summary>
    Task<bool> DisableAlertAsync(Guid alertId);
}