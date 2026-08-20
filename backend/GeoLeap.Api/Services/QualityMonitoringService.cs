using System.Collections.Concurrent;
using Microsoft.Extensions.Options;
using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

/// <summary>
/// Service for collecting and managing quality metrics
/// </summary>
public class QualityMetricsCollector : IQualityMetricsCollector
{
    private readonly ILogger<QualityMetricsCollector> _logger;
    private readonly ConcurrentQueue<QualityMetric> _metricsQueue;
    private readonly Timer _persistenceTimer;
    private readonly SemaphoreSlim _persistenceSemaphore;

    // In-memory storage for demo purposes - in production, use a database
    private readonly ConcurrentDictionary<string, List<QualityMetric>> _metricsStorage;

    public QualityMetricsCollector(ILogger<QualityMetricsCollector> logger)
    {
        _logger = logger;
        _metricsQueue = new ConcurrentQueue<QualityMetric>();
        _metricsStorage = new ConcurrentDictionary<string, List<QualityMetric>>();
        _persistenceSemaphore = new SemaphoreSlim(1, 1);

        // Timer to persist metrics every 30 seconds
        _persistenceTimer = new Timer(PersistMetrics, null, TimeSpan.FromSeconds(30), TimeSpan.FromSeconds(30));
    }

    public async Task RecordValidationAsync(string dataType, bool isValid, double qualityScore, long durationMs, string? correlationId = null)
    {
        try
        {
            var metric = new QualityMetric
            {
                DataType = dataType,
                QualityScore = qualityScore,
                ValidationPassed = isValid,
                ValidationDurationMs = durationMs,
                CorrelationId = correlationId ?? string.Empty,
                Timestamp = DateTime.UtcNow
            };

            _metricsQueue.Enqueue(metric);

            _logger.LogDebug("Recorded quality metric for {DataType}: Score={Score}, Valid={Valid}, Duration={Duration}ms",
                dataType, qualityScore, isValid, durationMs);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to record quality metric for {DataType}", dataType);
        }
    }

    public async Task<List<QualityMetric>> GetRecentMetricsAsync(TimeSpan timeSpan)
    {
        try
        {
            var cutoffTime = DateTime.UtcNow - timeSpan;
            var recentMetrics = new List<QualityMetric>();

            foreach (var kvp in _metricsStorage)
            {
                var metrics = kvp.Value.Where(m => m.Timestamp >= cutoffTime).ToList();
                recentMetrics.AddRange(metrics);
            }

            return recentMetrics.OrderByDescending(m => m.Timestamp).ToList();
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve recent metrics for timespan {TimeSpan}", timeSpan);
            return new List<QualityMetric>();
        }
    }

    public async Task FlushMetricsAsync()
    {
        await PersistMetricsInternal();
    }

    public async Task<Dictionary<string, List<QualityMetric>>> GetQualityTrendsAsync(TimeSpan timeSpan)
    {
        try
        {
            var cutoffTime = DateTime.UtcNow - timeSpan;
            var trends = new Dictionary<string, List<QualityMetric>>();

            foreach (var kvp in _metricsStorage)
            {
                var metrics = kvp.Value
                    .Where(m => m.Timestamp >= cutoffTime)
                    .OrderBy(m => m.Timestamp)
                    .ToList();

                if (metrics.Any())
                {
                    trends[kvp.Key] = metrics;
                }
            }

            return trends;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve quality trends for timespan {TimeSpan}", timeSpan);
            return new Dictionary<string, List<QualityMetric>>();
        }
    }

    public async Task CleanupMetricsAsync(TimeSpan retentionPeriod)
    {
        await _persistenceSemaphore.WaitAsync();
        try
        {
            var cutoffTime = DateTime.UtcNow - retentionPeriod;
            var removedCount = 0;

            // BUG FIX: Don't use ToList() on ConcurrentDictionary - iterate keys directly
            // This prevents race conditions and unnecessary memory allocation
            foreach (var key in _metricsStorage.Keys)
            {
                if (_metricsStorage.TryGetValue(key, out var metrics))
                {
                    var originalCount = metrics.Count;
                    
                    // Thread-safe removal of old metrics
                    var filtered = metrics.Where(m => m.Timestamp >= cutoffTime).ToList();
                    removedCount += originalCount - filtered.Count;
                    
                    if (filtered.Any())
                    {
                        _metricsStorage[key] = filtered;
                    }
                    else
                    {
                        // Remove empty entries
                        _metricsStorage.TryRemove(key, out _);
                    }
                }
            }

            _logger.LogInformation("Cleaned up {RemovedCount} old quality metrics (retention period: {RetentionPeriod})",
                removedCount, retentionPeriod);
        }
        finally
        {
            _persistenceSemaphore.Release();
        }
    }

    private void PersistMetrics(object? state)
    {
        // Timer callback must not be async void - use fire-and-forget with error handling
        _ = PersistMetricsInternal().ContinueWith(t =>
        {
            if (t.IsFaulted)
            {
                _logger.LogError(t.Exception, "Error persisting quality metrics");
            }
        }, TaskScheduler.Default);
    }

    private async Task PersistMetricsInternal()
    {
        await _persistenceSemaphore.WaitAsync();
        try
        {
            var metricsToProcess = new List<QualityMetric>();
            
            // Dequeue all pending metrics
            while (_metricsQueue.TryDequeue(out var metric))
            {
                metricsToProcess.Add(metric);
            }

            if (!metricsToProcess.Any()) return;

            // Group by data type and add to storage
            foreach (var group in metricsToProcess.GroupBy(m => m.DataType))
            {
                _metricsStorage.AddOrUpdate(
                    group.Key,
                    group.ToList(),
                    (key, existingList) =>
                    {
                        existingList.AddRange(group);
                        // Keep only recent metrics to prevent memory issues
                        var cutoff = DateTime.UtcNow.AddHours(-24);
                        return existingList.Where(m => m.Timestamp >= cutoff).ToList();
                    });
            }

            _logger.LogDebug("Persisted {MetricCount} quality metrics", metricsToProcess.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to persist quality metrics");
        }
        finally
        {
            _persistenceSemaphore.Release();
        }
    }

    public void Dispose()
    {
        _persistenceTimer?.Dispose();
        _persistenceSemaphore?.Dispose();
    }
}

/// <summary>
/// Service for sending quality alerts
/// </summary>
public class AlertingService : IAlertingService
{
    private readonly ILogger<AlertingService> _logger;
    private readonly List<IAlertHandler> _alertHandlers;

    public AlertingService(ILogger<AlertingService> logger)
    {
        _logger = logger;
        _alertHandlers = new List<IAlertHandler>();
    }

    public async Task SendQualityAlertAsync(QualityAlert alert)
    {
        try
        {
            _logger.LogWarning("Quality alert triggered: {DataType} quality dropped to {AverageQuality}% (threshold: {Threshold}%)",
                alert.DataType, alert.AverageQuality, alert.Threshold);

            var applicableHandlers = _alertHandlers.Where(h => h.CanHandle(alert)).ToList();
            
            if (!applicableHandlers.Any())
            {
                _logger.LogWarning("No alert handlers available for alert: {AlertId}", alert.Id);
                return;
            }

            var tasks = applicableHandlers.Select(handler => HandleAlertSafely(handler, alert));
            await Task.WhenAll(tasks);

            _logger.LogInformation("Quality alert {AlertId} processed by {HandlerCount} handlers", 
                alert.Id, applicableHandlers.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send quality alert: {AlertId}", alert.Id);
        }
    }

    public async Task RegisterAlertHandlerAsync(IAlertHandler handler)
    {
        if (!_alertHandlers.Contains(handler))
        {
            _alertHandlers.Add(handler);
            _logger.LogInformation("Registered alert handler: {HandlerName}", handler.Name);
        }
    }

    private async Task HandleAlertSafely(IAlertHandler handler, QualityAlert alert)
    {
        try
        {
            await handler.HandleAlertAsync(alert);
            _logger.LogDebug("Alert {AlertId} handled successfully by {HandlerName}", alert.Id, handler.Name);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Alert handler {HandlerName} failed to process alert {AlertId}", handler.Name, alert.Id);
        }
    }
}

/// <summary>
/// Background service for monitoring data quality and triggering alerts
/// </summary>
public class DataQualityMonitor : BackgroundService
{
    private readonly IQualityMetricsCollector _metricsCollector;
    private readonly IAlertingService _alertingService;
    private readonly IOptionsMonitor<QualityMonitoringSettings> _settings;
    private readonly ILogger<DataQualityMonitor> _logger;

    public DataQualityMonitor(
        IQualityMetricsCollector metricsCollector,
        IAlertingService alertingService,
        IOptionsMonitor<QualityMonitoringSettings> settings,
        ILogger<DataQualityMonitor> logger)
    {
        _metricsCollector = metricsCollector;
        _alertingService = alertingService;
        _settings = settings;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Data quality monitor started");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await CheckQualityThresholds();
                await GenerateQualityReport();
                await CleanupOldMetrics();
                
                await Task.Delay(_settings.CurrentValue.CheckInterval, stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during quality monitoring cycle");
                await Task.Delay(TimeSpan.FromMinutes(5), stoppingToken); // Wait before retrying
            }
        }

        _logger.LogInformation("Data quality monitor stopped");
    }

    private async Task CheckQualityThresholds()
    {
        if (!_settings.CurrentValue.EnableRealTimeAlerts) return;

        try
        {
            var checkInterval = _settings.CurrentValue.CheckInterval;
            var metrics = await _metricsCollector.GetRecentMetricsAsync(checkInterval);
            
            var groupedMetrics = metrics.GroupBy(m => m.DataType).ToList();
            
            foreach (var group in groupedMetrics)
            {
                var dataType = group.Key;
                var dataTypeMetrics = group.ToList();
                
                if (dataTypeMetrics.Count < _settings.CurrentValue.MinSampleSizeForAlert)
                {
                    continue; // Not enough data points
                }

                var avgQuality = dataTypeMetrics.Average(m => m.QualityScore);
                var threshold = _settings.CurrentValue.QualityThresholds.GetValueOrDefault(dataType, 70.0);
                
                if (avgQuality < threshold)
                {
                    var alert = new QualityAlert
                    {
                        DataType = dataType,
                        AverageQuality = avgQuality,
                        Threshold = threshold,
                        SampleSize = dataTypeMetrics.Count,
                        Severity = DetermineAlertSeverity(avgQuality, threshold),
                        Description = $"Quality for {dataType} has dropped to {avgQuality:F1}% (below threshold of {threshold}%)",
                        Metadata = new Dictionary<string, object>
                        {
                            { "CheckInterval", checkInterval },
                            { "ValidationFailures", dataTypeMetrics.Count(m => !m.ValidationPassed) },
                            { "AverageDuration", dataTypeMetrics.Average(m => m.ValidationDurationMs) }
                        }
                    };

                    await _alertingService.SendQualityAlertAsync(alert);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to check quality thresholds");
        }
    }

    private async Task GenerateQualityReport()
    {
        try
        {
            var reportInterval = TimeSpan.FromHours(1);
            var trends = await _metricsCollector.GetQualityTrendsAsync(reportInterval);
            
            if (!trends.Any()) return;

            var report = new Dictionary<string, object>();
            
            foreach (var (dataType, metrics) in trends)
            {
                if (!metrics.Any()) continue;

                var avgQuality = metrics.Average(m => m.QualityScore);
                var avgDuration = metrics.Average(m => m.ValidationDurationMs);
                var validationSuccessRate = metrics.Count(m => m.ValidationPassed) * 100.0 / metrics.Count;
                
                report[dataType] = new
                {
                    AverageQuality = avgQuality,
                    AverageDuration = avgDuration,
                    ValidationSuccessRate = validationSuccessRate,
                    SampleSize = metrics.Count,
                    TimeRange = reportInterval
                };
            }

            _logger.LogInformation("Quality Report: {@QualityReport}", report);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate quality report");
        }
    }

    private async Task CleanupOldMetrics()
    {
        try
        {
            await _metricsCollector.CleanupMetricsAsync(_settings.CurrentValue.MetricsRetentionPeriod);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to cleanup old metrics");
        }
    }

    private Models.AlertSeverity DetermineAlertSeverity(double currentQuality, double threshold)
    {
        var degradation = threshold - currentQuality;
        
        return degradation switch
        {
            < 5 => Models.AlertSeverity.Low,
            < 15 => Models.AlertSeverity.Medium,
            < 30 => Models.AlertSeverity.High,
            _ => Models.AlertSeverity.Critical
        };
    }
}

/// <summary>
/// Console alert handler for development
/// </summary>
public class ConsoleAlertHandler : IAlertHandler
{
    private readonly ILogger<ConsoleAlertHandler> _logger;

    public string Name => "Console Alert Handler";

    public ConsoleAlertHandler(ILogger<ConsoleAlertHandler> logger)
    {
        _logger = logger;
    }

    public bool CanHandle(QualityAlert alert) => true; // Handle all alerts

    public async Task HandleAlertAsync(QualityAlert alert)
    {
        var severityColor = alert.Severity switch
        {
            Models.AlertSeverity.Critical => "RED",
            Models.AlertSeverity.High => "YELLOW",
            Models.AlertSeverity.Medium => "BLUE", 
            Models.AlertSeverity.Low => "GREEN",
            _ => "WHITE"
        };

        var message = $"[{severityColor}] QUALITY ALERT: {alert.Description}";
        
        Console.WriteLine($"\n{new string('=', 80)}");
        Console.WriteLine(message);
        Console.WriteLine($"Data Type: {alert.DataType}");
        Console.WriteLine($"Current Quality: {alert.AverageQuality:F1}%");
        Console.WriteLine($"Threshold: {alert.Threshold:F1}%");
        Console.WriteLine($"Sample Size: {alert.SampleSize}");
        Console.WriteLine($"Timestamp: {alert.Timestamp:yyyy-MM-dd HH:mm:ss} UTC");
        
        if (alert.Metadata.Any())
        {
            Console.WriteLine("Additional Info:");
            foreach (var kvp in alert.Metadata)
            {
                Console.WriteLine($"  {kvp.Key}: {kvp.Value}");
            }
        }
        
        Console.WriteLine($"{new string('=', 80)}\n");

        _logger.LogWarning("Console alert displayed for {DataType}: {Description}", alert.DataType, alert.Description);
    }
}

/// <summary>
/// Email alert handler (placeholder implementation)
/// </summary>
public class EmailAlertHandler : IAlertHandler
{
    private readonly ILogger<EmailAlertHandler> _logger;
    private readonly IEmailService _emailService;

    public string Name => "Email Alert Handler";

    public EmailAlertHandler(ILogger<EmailAlertHandler> logger, IEmailService emailService)
    {
        _logger = logger;
        _emailService = emailService;
    }

    public bool CanHandle(QualityAlert alert)
    {
        // Only handle high severity alerts via email
        return alert.Severity >= Models.AlertSeverity.High;
    }

    public async Task HandleAlertAsync(QualityAlert alert)
    {
        try
        {
            var subject = $"Data Quality Alert - {alert.DataType} ({alert.Severity})";
            var body = CreateEmailBody(alert);

            // In a real implementation, you would send to configured recipients
            var recipients = new[] { "admin@geoleap.com", "devops@geoleap.com" };

            foreach (var recipient in recipients)
            {
                // Note: This would require proper email service implementation
                // await _emailService.SendEmailAsync(recipient, subject, body);
                _logger.LogInformation("Would send email alert to {Recipient}: {Subject}", recipient, subject);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send email alert for {AlertId}", alert.Id);
        }
    }

    private string CreateEmailBody(QualityAlert alert)
    {
        return $@"
Data Quality Alert

Alert ID: {alert.Id}
Data Type: {alert.DataType}
Severity: {alert.Severity}

Current Quality: {alert.AverageQuality:F1}%
Quality Threshold: {alert.Threshold:F1}%
Sample Size: {alert.SampleSize}

Description: {alert.Description}

Timestamp: {alert.Timestamp:yyyy-MM-dd HH:mm:ss} UTC

This alert was generated by the GeoLeap Data Quality Monitoring system.
Please investigate the data quality issues for the {alert.DataType} data type.

Additional Metadata:
{string.Join("\n", alert.Metadata.Select(kvp => $"  {kvp.Key}: {kvp.Value}"))}
        ".Trim();
    }
}