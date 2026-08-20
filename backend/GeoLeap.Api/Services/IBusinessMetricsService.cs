using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service for comprehensive business metrics and real-time KPI tracking
/// </summary>
public interface IBusinessMetricsService
{
    /// <summary>
    /// Get comprehensive business metrics dashboard data
    /// </summary>
    Task<BusinessMetricsResponse> GetBusinessMetricsAsync(string correlationId);

    /// <summary>
    /// Get real-time KPIs for admin dashboard
    /// </summary>
    Task<BusinessKpis> GetRealTimeKpisAsync(string correlationId);

    /// <summary>
    /// Get metric trends over time period
    /// </summary>
    Task<List<MetricTrend>> GetMetricTrendsAsync(
        string metricName, 
        DateTime startDate, 
        DateTime endDate, 
        string granularity = "daily",
        string correlationId = "");

    /// <summary>
    /// Get active business alerts
    /// </summary>
    Task<List<BusinessAlert>> GetActiveAlertsAsync(string correlationId);

    /// <summary>
    /// Get user growth analytics
    /// </summary>
    Task<Dictionary<string, object>> GetUserGrowthAnalyticsAsync(
        DateTime startDate, 
        DateTime endDate, 
        string correlationId);

    /// <summary>
    /// Get revenue analytics breakdown
    /// </summary>
    Task<Dictionary<string, object>> GetRevenueAnalyticsAsync(
        DateTime startDate, 
        DateTime endDate, 
        string correlationId);

    /// <summary>
    /// Get subscription analytics summary
    /// </summary>
    Task<Dictionary<string, object>> GetSubscriptionAnalyticsAsync(
        DateTime startDate, 
        DateTime endDate, 
        string correlationId);

    /// <summary>
    /// Get support metrics overview
    /// </summary>
    Task<Dictionary<string, object>> GetSupportMetricsAsync(
        DateTime startDate, 
        DateTime endDate, 
        string correlationId);

    /// <summary>
    /// Get system performance metrics
    /// </summary>
    Task<Dictionary<string, object>> GetSystemPerformanceMetricsAsync(string correlationId);

    /// <summary>
    /// Get custom analytics based on request
    /// </summary>
    Task<AdminAnalyticsResponse> GetCustomAnalyticsAsync(
        AdminAnalyticsRequest request, 
        string correlationId);

    /// <summary>
    /// Track a business event for analytics
    /// </summary>
    Task TrackBusinessEventAsync(
        string eventType, 
        Dictionary<string, object> properties, 
        string correlationId);

    /// <summary>
    /// Refresh metrics cache
    /// </summary>
    Task RefreshMetricsCacheAsync(string correlationId);
}