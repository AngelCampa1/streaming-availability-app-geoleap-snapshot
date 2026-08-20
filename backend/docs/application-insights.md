# Application Insights Telemetry and Monitoring

## Overview

GeoLeap integrates Azure Application Insights for comprehensive telemetry, monitoring, and diagnostics. This document provides configuration guidance, usage examples, and best practices.

## Features

- **Automatic Telemetry Collection**: Requests, dependencies, exceptions, and performance counters
- **Custom Telemetry**: Events, metrics, traces for business-specific tracking
- **Live Metrics**: Real-time monitoring dashboard
- **Adaptive Sampling**: Cost optimization while maintaining data quality
- **Dependency Tracking**: External API calls, database queries, Redis operations
- **Performance Monitoring**: Response times, throughput, resource utilization

## Configuration

### 1. Connection String Setup

Application Insights requires a connection string to send telemetry data to Azure.

#### Development Environment

```bash
# Set via User Secrets (recommended for local development)
cd backend/GeoLeap.Api
dotnet user-secrets set "ApplicationInsights:ConnectionString" "InstrumentationKey=YOUR_KEY;IngestionEndpoint=https://YOUR_REGION.applicationinsights.azure.com/"
```

#### Production Environment

Use Azure Key Vault or environment variables:

```bash
# Azure App Service Configuration
az webapp config appsettings set --resource-group geoleap-rg --name geoleap-api \
  --settings ApplicationInsights__ConnectionString="InstrumentationKey=YOUR_KEY;IngestionEndpoint=https://YOUR_REGION.applicationinsights.azure.com/"
```

### 2. Configuration Options

Edit `appsettings.json` or `appsettings.Development.json`:

```json
{
  "ApplicationInsights": {
    "ConnectionString": "InstrumentationKey=YOUR_KEY;IngestionEndpoint=https://YOUR_REGION.applicationinsights.azure.com/",
    "InstrumentationKey": "YOUR_INSTRUMENTATION_KEY",
    "EnableAdaptiveSampling": true,
    "SamplingPercentage": 100.0,
    "LogLevel": {
      "Default": "Information",
      "Microsoft": "Warning"
    }
  }
}
```

**Configuration Properties:**

- `ConnectionString`: Primary connection string (preferred over InstrumentationKey)
- `InstrumentationKey`: Legacy instrumentation key (optional if ConnectionString is set)
- `EnableAdaptiveSampling`: Reduce telemetry volume and costs (recommended: true)
- `SamplingPercentage`: Initial sampling rate (100.0 = all telemetry, 50.0 = 50%)
- `LogLevel`: Logging verbosity for Application Insights SDK

## Usage

### 1. Inject ITelemetryService

The `ITelemetryService` provides a convenient abstraction over Application Insights:

```csharp
public class MyController : ControllerBase
{
    private readonly ITelemetryService _telemetry;

    public MyController(ITelemetryService telemetry)
    {
        _telemetry = telemetry;
    }

    [HttpGet("example")]
    public IActionResult Example()
    {
        // Track custom event
        _telemetry.TrackEvent("ExampleEndpointCalled", new Dictionary<string, string>
        {
            { "userId", User.Identity?.Name ?? "anonymous" },
            { "timestamp", DateTime.UtcNow.ToString("O") }
        });

        return Ok();
    }
}
```

### 2. Track Custom Events

Events represent discrete business activities:

```csharp
// Simple event
_telemetry.TrackEvent("UserRegistered");

// Event with properties
_telemetry.TrackEvent("ContentSearched", new Dictionary<string, string>
{
    { "searchQuery", "inception" },
    { "resultCount", "15" },
    { "userId", userId.ToString() }
});

// Event with properties and metrics
_telemetry.TrackEvent("PaymentProcessed",
    properties: new Dictionary<string, string>
    {
        { "paymentMethod", "stripe" },
        { "currency", "USD" }
    },
    metrics: new Dictionary<string, double>
    {
        { "amount", 9.99 },
        { "processingTime", 1250.5 }
    }
);
```

### 3. Track Custom Metrics

Metrics are numeric measurements over time:

```csharp
// Simple metric
_telemetry.TrackMetric("ActiveUserSessions", 1250);

// Metric with properties
_telemetry.TrackMetric("ApiResponseTime", 145.7, new Dictionary<string, string>
{
    { "endpoint", "/api/content/search" },
    { "httpMethod", "GET" }
});

// Track cache hit rate
var cacheHitRate = (double)cacheHits / totalRequests * 100;
_telemetry.TrackMetric("CacheHitRate", cacheHitRate, new Dictionary<string, string>
{
    { "cacheType", "redis" }
});
```

### 4. Track Exceptions

Exceptions are automatically tracked, but you can add custom properties:

```csharp
try
{
    // Your code here
}
catch (Exception ex)
{
    _telemetry.TrackException(ex, new Dictionary<string, string>
    {
        { "userId", userId.ToString() },
        { "operation", "FetchContentMetadata" },
        { "contentId", contentId.ToString() }
    });
    throw; // Re-throw if needed
}
```

### 5. Track Dependencies

Dependencies represent calls to external services:

```csharp
var startTime = DateTimeOffset.UtcNow;
var success = false;

try
{
    // Make external API call
    var response = await _httpClient.GetAsync("https://api.example.com/data");
    success = response.IsSuccessStatusCode;
}
finally
{
    var duration = DateTimeOffset.UtcNow - startTime;
    _telemetry.TrackDependency(
        dependencyType: "HTTP",
        dependencyName: "ExternalAPI",
        data: "GET /data",
        startTime: startTime,
        duration: duration,
        success: success
    );
}
```

### 6. Track Traces

Traces are diagnostic log messages:

```csharp
_telemetry.TrackTrace("Starting content refresh operation", SeverityLevel.Information,
    new Dictionary<string, string>
    {
        { "batchSize", "100" },
        { "priority", "High" }
    }
);

_telemetry.TrackTrace("Database connection pool exhausted", SeverityLevel.Warning);

_telemetry.TrackTrace("Critical failure in payment processing", SeverityLevel.Critical,
    new Dictionary<string, string>
    {
        { "paymentId", paymentId.ToString() }
    }
);
```

## Dashboard Setup

### 1. Azure Portal Dashboard

1. Navigate to your Application Insights resource in Azure Portal
2. Go to **Logs** and create custom queries:

```kusto
// Request count by endpoint
requests
| where timestamp > ago(1h)
| summarize count() by url
| order by count_ desc

// Average response time by endpoint
requests
| where timestamp > ago(1h)
| summarize avgDuration=avg(duration) by url
| order by avgDuration desc

// Exception rate
exceptions
| where timestamp > ago(24h)
| summarize count() by type
| order by count_ desc

// Custom events analysis
customEvents
| where timestamp > ago(1h)
| where name == "ContentSearched"
| summarize searchCount=count() by tostring(customDimensions.searchQuery)
| order by searchCount desc
```

3. Pin queries to dashboard for real-time monitoring

### 2. Live Metrics

Access real-time telemetry:
- Navigate to **Live Metrics** in Azure Portal
- Monitor requests, dependencies, exceptions in real-time
- View server performance (CPU, memory, network)

### 3. Availability Tests

Set up availability monitoring:
1. Go to **Availability** in Application Insights
2. Add URL ping test for critical endpoints
3. Configure test locations (multiple geographic regions)
4. Set alert rules for failures

## Alert Configuration

### 1. Create Alert Rules

```bash
# Alert on high exception rate
az monitor metrics alert create \
  --name "HighExceptionRate" \
  --resource-group geoleap-rg \
  --scopes "/subscriptions/YOUR_SUBSCRIPTION/resourceGroups/geoleap-rg/providers/Microsoft.Insights/components/geoleap-appinsights" \
  --condition "count exceptions/count > 10" \
  --window-size 5m \
  --evaluation-frequency 1m \
  --action-group "/subscriptions/YOUR_SUBSCRIPTION/resourceGroups/geoleap-rg/providers/microsoft.insights/actionGroups/geoleap-alerts"
```

### 2. Smart Detection

Application Insights includes built-in Smart Detection for:
- Failure anomalies (unusual increase in failed requests)
- Performance degradation
- Memory leaks
- Abnormal rise in exception volume

### 3. Action Groups

Configure notification channels:
- Email notifications
- SMS alerts
- Azure Mobile App push notifications
- Webhook integrations (Slack, PagerDuty, etc.)

## Best Practices

### 1. Sampling Strategy

- **Development**: 100% sampling for full visibility
- **Staging**: 100% sampling for testing validation
- **Production**: 10-50% adaptive sampling to control costs

### 2. Custom Dimensions

Always include relevant context in telemetry:

```csharp
var properties = new Dictionary<string, string>
{
    { "userId", userId.ToString() },
    { "subscriptionTier", userSubscriptionTier },
    { "clientVersion", clientVersion },
    { "correlationId", HttpContext.TraceIdentifier }
};

_telemetry.TrackEvent("FeatureUsed", properties);
```

### 3. Performance Considerations

- Use async telemetry methods (telemetry is sent asynchronously by default)
- Avoid tracking high-frequency events (>1000/sec) without sampling
- Batch-track metrics when possible

### 4. Cost Optimization

- Enable adaptive sampling (reduces data volume by 70-90%)
- Configure data retention policies (default: 90 days)
- Use sampling to filter non-critical telemetry
- Monitor ingestion volume in Azure Cost Management

### 5. Security

- Never log sensitive data (passwords, credit cards, PII)
- Use custom properties for redacted identifiers
- Configure data retention compliance with regulations

## Troubleshooting

### Issue: No telemetry appearing

**Solution:**
1. Verify connection string is correct
2. Check firewall rules (Application Insights requires outbound HTTPS)
3. Ensure `ApplicationInsights:ConnectionString` is set in configuration
4. Review logs for SDK initialization errors

### Issue: High data ingestion costs

**Solution:**
1. Enable adaptive sampling: `EnableAdaptiveSampling = true`
2. Reduce sampling percentage: `SamplingPercentage = 10`
3. Filter out noisy telemetry (health checks, static files)
4. Review retention policies and reduce if possible

### Issue: Missing dependency tracking

**Solution:**
1. Ensure `EnableDependencyTrackingTelemetryModule = true`
2. Verify HttpClient is registered via dependency injection
3. Check Entity Framework logging configuration

## Monitoring Queries

### Key Performance Indicators

```kusto
// Average API response time (last 24h)
requests
| where timestamp > ago(24h)
| summarize avgDuration=avg(duration), p95Duration=percentile(duration, 95), p99Duration=percentile(duration, 99)

// Success rate by endpoint
requests
| where timestamp > ago(1h)
| summarize total=count(), failed=countif(success == false) by url
| extend successRate = (total - failed) * 100.0 / total
| order by successRate asc

// Top exceptions
exceptions
| where timestamp > ago(24h)
| summarize count() by outerMessage
| order by count_ desc
| take 10

// Database query performance
dependencies
| where timestamp > ago(1h)
| where type == "SQL"
| summarize avgDuration=avg(duration), count=count() by name
| order by avgDuration desc

// Redis cache performance
dependencies
| where timestamp > ago(1h)
| where type == "Redis"
| summarize avgDuration=avg(duration), count=count() by name
| order by count desc
```

## Additional Resources

- [Application Insights Documentation](https://docs.microsoft.com/azure/azure-monitor/app/app-insights-overview)
- [Telemetry Data Model](https://docs.microsoft.com/azure/azure-monitor/app/data-model)
- [Query Language (KQL) Reference](https://docs.microsoft.com/azure/data-explorer/kusto/query/)
- [Best Practices for Application Insights](https://docs.microsoft.com/azure/azure-monitor/app/asp-net-core)

## Support

For issues or questions:
- Review Application Insights logs in Azure Portal
- Check SDK compatibility with .NET version
- Contact Azure Support for infrastructure issues
