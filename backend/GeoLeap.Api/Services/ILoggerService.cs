using Sentry;

namespace GeoLeap.Api.Services;

public interface ILoggerService
{
    void LogUserAction(string userId, string action, object? properties = null);
    void LogSearchOperation(string userId, string searchQuery, int resultCount, double executionTimeMs, string? apiProvider = null);
    void LogPaymentOperation(string userId, string operation, string status, object? properties = null);
    void LogApiCall(string provider, string endpoint, int statusCode, double responseTimeMs, bool success = true);
    void LogSecurityEvent(string eventType, string userId, string details, object? properties = null);
    void LogPerformanceMetric(string metricName, double value, string? context = null);
    void LogBusinessEvent(string eventName, object properties);
    void LogError(Exception exception, string message, params object?[] args);
    void LogError(string message, params object?[] args);

    // Async logging methods for enhanced privacy service
    Task LogAsync(string level, string message);
    Task LogAsync(string level, string message, params object?[] args);
}

public class LoggerService : ILoggerService
{
    private readonly ILogger<LoggerService> _logger;

    public LoggerService(ILogger<LoggerService> logger)
    {
        _logger = logger;
    }

    public void LogUserAction(string userId, string action, object? properties = null)
    {
        var logProperties = new Dictionary<string, string>
        {
            ["UserId"] = userId,
            ["Action"] = action,
            ["Timestamp"] = DateTimeOffset.UtcNow.ToString()
        };

        if (properties != null)
        {
            foreach (var prop in properties.GetType().GetProperties())
            {
                logProperties[prop.Name] = prop.GetValue(properties)?.ToString() ?? "null";
            }
        }

        _logger.LogInformation("User action executed: {Action} by {UserId}", action, userId);

        SentrySdk.AddBreadcrumb($"UserAction: {action}", "user", data: logProperties);
    }

    public void LogSearchOperation(string userId, string searchQuery, int resultCount, double executionTimeMs, string? apiProvider = null)
    {
        var properties = new Dictionary<string, string>
        {
            ["UserId"] = userId,
            ["SearchQuery"] = searchQuery,
            ["ResultCount"] = resultCount.ToString(),
            ["ExecutionTimeMs"] = executionTimeMs.ToString(),
            ["ApiProvider"] = apiProvider ?? "Unknown",
            ["Timestamp"] = DateTimeOffset.UtcNow.ToString()
        };

        _logger.LogInformation("Search executed: {SearchQuery} by {UserId}, returned {ResultCount} results in {ExecutionTimeMs}ms using {ApiProvider}",
            searchQuery, userId, resultCount, executionTimeMs, apiProvider);

        SentrySdk.AddBreadcrumb($"SearchOperation: {searchQuery}", "search", data: properties);
    }

    public void LogPaymentOperation(string userId, string operation, string status, object? properties = null)
    {
        var logProperties = new Dictionary<string, string>
        {
            ["UserId"] = userId,
            ["Operation"] = operation,
            ["Status"] = status,
            ["Timestamp"] = DateTimeOffset.UtcNow.ToString()
        };

        if (properties != null)
        {
            foreach (var prop in properties.GetType().GetProperties())
            {
                var value = prop.GetValue(properties);
                // Never log sensitive payment data
                if (!IsSensitivePaymentField(prop.Name))
                {
                    logProperties[prop.Name] = value?.ToString() ?? "null";
                }
            }
        }

        _logger.LogInformation("Payment operation: {Operation} for {UserId} resulted in {Status}", operation, userId, status);

        SentrySdk.AddBreadcrumb($"PaymentOperation: {operation} - {status}", "payment", data: logProperties);
    }

    public void LogApiCall(string provider, string endpoint, int statusCode, double responseTimeMs, bool success = true)
    {
        var properties = new Dictionary<string, string>
        {
            ["Provider"] = provider,
            ["Endpoint"] = endpoint,
            ["StatusCode"] = statusCode.ToString(),
            ["ResponseTimeMs"] = responseTimeMs.ToString(),
            ["Success"] = success.ToString(),
            ["Timestamp"] = DateTimeOffset.UtcNow.ToString()
        };

        var logLevel = success ? LogLevel.Information : LogLevel.Warning;
        _logger.Log(logLevel, "API call to {Provider} {Endpoint}: {StatusCode} in {ResponseTimeMs}ms",
            provider, endpoint, statusCode, responseTimeMs);

        SentrySdk.AddBreadcrumb(
            $"ApiCall: {provider} {endpoint} -> {statusCode} ({responseTimeMs}ms)",
            "http",
            data: properties,
            level: success ? BreadcrumbLevel.Info : BreadcrumbLevel.Warning);
    }

    public void LogSecurityEvent(string eventType, string userId, string details, object? properties = null)
    {
        var logProperties = new Dictionary<string, string>
        {
            ["EventType"] = eventType,
            ["UserId"] = userId,
            ["Details"] = details,
            ["Timestamp"] = DateTimeOffset.UtcNow.ToString()
        };

        if (properties != null)
        {
            foreach (var prop in properties.GetType().GetProperties())
            {
                logProperties[prop.Name] = prop.GetValue(properties)?.ToString() ?? "null";
            }
        }

        _logger.LogWarning("Security event {EventType}: {Details} for user {UserId}", eventType, details, userId);

        SentrySdk.AddBreadcrumb($"SecurityEvent: {eventType}", "security", data: logProperties, level: BreadcrumbLevel.Warning);
    }

    public void LogPerformanceMetric(string metricName, double value, string? context = null)
    {
        var properties = new Dictionary<string, string>();
        if (!string.IsNullOrEmpty(context))
        {
            properties["Context"] = context;
        }

        _logger.LogInformation("Performance metric {MetricName}: {Value} {Context}", metricName, value, context ?? "");

        SentrySdk.AddBreadcrumb($"Metric: {metricName} = {value}", "performance", data: properties);
    }

    public void LogBusinessEvent(string eventName, object properties)
    {
        var logProperties = new Dictionary<string, string>
        {
            ["EventName"] = eventName,
            ["Timestamp"] = DateTimeOffset.UtcNow.ToString()
        };

        foreach (var prop in properties.GetType().GetProperties())
        {
            logProperties[prop.Name] = prop.GetValue(properties)?.ToString() ?? "null";
        }

        _logger.LogInformation("Business event: {EventName}", eventName);

        SentrySdk.AddBreadcrumb($"BusinessEvent: {eventName}", "business", data: logProperties);
    }

    public void LogError(Exception exception, string message, params object?[] args)
    {
        var formattedMessage = args?.Length > 0 ? string.Format(message, args) : message;

        _logger.LogError(exception, formattedMessage);
        SentrySdk.CaptureException(exception, scope =>
        {
            scope.SetTag("message", formattedMessage);
        });
    }

    public void LogError(string message, params object?[] args)
    {
        var formattedMessage = args?.Length > 0 ? string.Format(message, args) : message;

        _logger.LogError(formattedMessage);
        SentrySdk.AddBreadcrumb($"Error: {formattedMessage}", "error", level: BreadcrumbLevel.Error);
    }

    public async Task LogAsync(string level, string message)
    {
        await LogAsync(level, message, Array.Empty<object>());
    }

    public async Task LogAsync(string level, string message, params object?[] args)
    {
        await Task.Run(() =>
        {
            var formattedMessage = args?.Length > 0 ? string.Format(message, args) : message;

            switch (level.ToUpper())
            {
                case "INFO":
                case "INFORMATION":
                    _logger.LogInformation(formattedMessage);
                    break;
                case "WARN":
                case "WARNING":
                    _logger.LogWarning(formattedMessage);
                    break;
                case "ERROR":
                    _logger.LogError(formattedMessage);
                    break;
                case "DEBUG":
                    _logger.LogDebug(formattedMessage);
                    break;
                default:
                    _logger.LogInformation(formattedMessage);
                    break;
            }

            SentrySdk.AddBreadcrumb($"AsyncLog[{level}]: {formattedMessage}", "log");
        });
    }

    private static bool IsSensitivePaymentField(string fieldName)
    {
        var sensitiveFields = new[] { "CardNumber", "CVV", "PIN", "SecurityCode", "ExpiryDate", "FullCardNumber" };
        return sensitiveFields.Any(field => fieldName.Contains(field, StringComparison.OrdinalIgnoreCase));
    }
}
