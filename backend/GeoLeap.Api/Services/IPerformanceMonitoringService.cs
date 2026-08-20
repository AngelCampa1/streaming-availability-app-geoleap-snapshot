using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service for monitoring Core Web Vitals and performance metrics
/// </summary>
public interface IPerformanceMonitoringService
{
    /// <summary>
    /// Get Core Web Vitals metrics for a specific URL
    /// </summary>
    Task<CoreWebVitalsMetrics> GetCoreWebVitalsAsync(string url, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get server response time metrics
    /// </summary>
    Task<ResponseTimeMetrics> GetResponseTimeMetricsAsync(string? endpoint = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get database query performance metrics
    /// </summary>
    Task<DatabasePerformanceMetrics> GetDatabasePerformanceAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Get API caching metrics and configuration
    /// </summary>
    Task<CachingMetrics> GetCachingMetricsAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Check compression configuration and effectiveness
    /// </summary>
    Task<CompressionMetrics> GetCompressionMetricsAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Run performance validation tests
    /// </summary>
    Task<PerformanceValidationResult> ValidatePerformanceAsync(PerformanceValidationRequest request, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get performance recommendations
    /// </summary>
    Task<List<PerformanceRecommendation>> GetPerformanceRecommendationsAsync(string? category = null, CancellationToken cancellationToken = default);

    /// <summary>
    /// Get real-time performance metrics
    /// </summary>
    Task<RealtimePerformanceMetrics> GetRealtimePerformanceMetricsAsync(CancellationToken cancellationToken = default);

    /// <summary>
    /// Record Core Web Vitals metrics
    /// </summary>
    Task RecordCoreWebVitalsAsync(string url, double lcp, double? fid, double cls, double? fcp, double? tti, CancellationToken cancellationToken = default);
}