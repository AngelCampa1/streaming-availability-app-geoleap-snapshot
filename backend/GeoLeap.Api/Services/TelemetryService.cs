using Sentry;
using Sentry.Protocol;

namespace GeoLeap.Api.Services;

public interface ITelemetryService
{
    void TrackEvent(string eventName, IDictionary<string, string>? properties = null, IDictionary<string, double>? metrics = null);
    void TrackMetric(string metricName, double value, IDictionary<string, string>? properties = null);
    void TrackException(Exception exception, IDictionary<string, string>? properties = null);
    void TrackDependency(string dependencyType, string dependencyName, string data, DateTimeOffset startTime, TimeSpan duration, bool success);
    void TrackRequest(string name, DateTimeOffset startTime, TimeSpan duration, string responseCode, bool success);
    void TrackTrace(string message, LogLevel severityLevel = LogLevel.Information, IDictionary<string, string>? properties = null);
}

public class TelemetryService : ITelemetryService
{
    private readonly ILogger<TelemetryService> _logger;

    public TelemetryService(ILogger<TelemetryService> logger)
    {
        _logger = logger;
    }

    public void TrackEvent(string eventName, IDictionary<string, string>? properties = null, IDictionary<string, double>? metrics = null)
    {
        // Use breadcrumb rather than CaptureMessage to avoid consuming Sentry error quota for business events
        var data = new Dictionary<string, string>(properties ?? new Dictionary<string, string>());
        if (metrics != null)
            foreach (var kvp in metrics)
                data[kvp.Key] = kvp.Value.ToString();

        SentrySdk.AddBreadcrumb(eventName, "event", data: data, level: BreadcrumbLevel.Info);
        _logger.LogInformation("Tracked event: {EventName}", eventName);
    }

    public void TrackMetric(string metricName, double value, IDictionary<string, string>? properties = null)
    {
        // Sentry does not provide a direct metric equivalent for App Insights TrackMetric.
        // Metrics are available via Sentry Performance (transactions/spans) or custom dashboards.
        // Log at debug level only; no Sentry call is made intentionally.
        _logger.LogDebug("Tracked metric: {MetricName} = {Value}", metricName, value);
    }

    public void TrackException(Exception exception, IDictionary<string, string>? properties = null)
    {
        SentrySdk.CaptureException(exception, scope =>
        {
            if (properties != null)
                scope.SetTags(properties);
        });
        _logger.LogError(exception, "Tracked exception: {ExceptionType}", exception.GetType().Name);
    }

    public void TrackDependency(string dependencyType, string dependencyName, string data, DateTimeOffset startTime, TimeSpan duration, bool success)
    {
        SentrySdk.AddBreadcrumb(
            $"{dependencyType}: {dependencyName} - {(success ? "Success" : "Failed")} ({duration.TotalMilliseconds}ms)",
            "dependency",
            data: new Dictionary<string, string>
            {
                ["type"] = dependencyType,
                ["name"] = dependencyName,
                ["data"] = data,
                ["duration_ms"] = duration.TotalMilliseconds.ToString(),
                ["success"] = success.ToString()
            },
            level: success ? BreadcrumbLevel.Info : BreadcrumbLevel.Error);
        _logger.LogDebug("Tracked dependency: {DependencyName} ({DependencyType}) - Success: {Success}, Duration: {Duration}ms",
            dependencyName, dependencyType, success, duration.TotalMilliseconds);
    }

    public void TrackRequest(string name, DateTimeOffset startTime, TimeSpan duration, string responseCode, bool success)
    {
        SentrySdk.AddBreadcrumb(
            $"Request: {name} - {responseCode} ({duration.TotalMilliseconds}ms)",
            "http",
            data: new Dictionary<string, string>
            {
                ["name"] = name,
                ["response_code"] = responseCode,
                ["duration_ms"] = duration.TotalMilliseconds.ToString(),
                ["success"] = success.ToString()
            },
            level: success ? BreadcrumbLevel.Info : BreadcrumbLevel.Warning);
        _logger.LogDebug("Tracked request: {RequestName} - {ResponseCode} ({Duration}ms)", name, responseCode, duration.TotalMilliseconds);
    }

    public void TrackTrace(string message, LogLevel severityLevel = LogLevel.Information, IDictionary<string, string>? properties = null)
    {
        var breadcrumbLevel = severityLevel switch
        {
            LogLevel.Critical => BreadcrumbLevel.Critical,
            LogLevel.Error => BreadcrumbLevel.Error,
            LogLevel.Warning => BreadcrumbLevel.Warning,
            LogLevel.Information => BreadcrumbLevel.Info,
            LogLevel.Debug or LogLevel.Trace => BreadcrumbLevel.Debug,
            _ => BreadcrumbLevel.Info
        };

        SentrySdk.AddBreadcrumb(message, data: properties, level: breadcrumbLevel);
        _logger.Log(severityLevel, "Tracked trace: {Message}", message);
    }
}
