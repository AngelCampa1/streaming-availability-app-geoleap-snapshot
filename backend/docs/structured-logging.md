# Structured Logging with Serilog - GeoLeap API

## Overview

GeoLeap API uses **Serilog** for comprehensive structured logging throughout the application. Serilog provides rich, structured logging capabilities that enable powerful querying, filtering, and monitoring.

## Why Structured Logging?

Structured logging captures log data as structured events with properties, rather than plain text messages. This approach offers:

- **Better Queryability**: Search and filter logs by specific properties
- **Enhanced Observability**: Correlate events across distributed systems
- **Cost Efficiency**: Reduce storage costs with selective log retention
- **Faster Debugging**: Quickly identify issues with precise filtering
- **Production Insights**: Real-time monitoring and alerting capabilities

## Configuration

### Serilog Packages Installed

```xml
<PackageReference Include="Serilog" Version="4.2.0" />
<PackageReference Include="Serilog.AspNetCore" Version="9.0.0" />
<PackageReference Include="Serilog.Sinks.Console" Version="6.0.0" />
<PackageReference Include="Serilog.Sinks.File" Version="7.0.0" />
<PackageReference Include="Serilog.Sinks.ApplicationInsights" Version="4.0.0" />
<PackageReference Include="Serilog.Enrichers.Environment" Version="3.0.1" />
<PackageReference Include="Serilog.Enrichers.CorrelationId" Version="3.0.1" />
<PackageReference Include="Serilog.Enrichers.Thread" Version="4.0.0" />
<PackageReference Include="Serilog.Enrichers.Process" Version="3.0.0" />
<PackageReference Include="Serilog.Settings.Configuration" Version="9.0.0" />
<PackageReference Include="SerilogTimings" Version="3.1.0" />
```

### Logging Configuration (appsettings.json)

```json
{
  "Serilog": {
    "Using": ["Serilog.Sinks.Console", "Serilog.Sinks.File"],
    "MinimumLevel": {
      "Default": "Information",
      "Override": {
        "Microsoft": "Warning",
        "Microsoft.AspNetCore": "Warning",
        "System": "Warning"
      }
    },
    "WriteTo": [
      {
        "Name": "Console",
        "Args": {
          "outputTemplate": "[{Timestamp:HH:mm:ss} {Level:u3}] {SourceContext}{NewLine}{Message:lj}{NewLine}{Exception}"
        }
      },
      {
        "Name": "File",
        "Args": {
          "path": "logs/geoleap-.log",
          "rollingInterval": "Day",
          "retainedFileCountLimit": 30,
          "outputTemplate": "{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} [{Level:u3}] {SourceContext} {Message:lj}{NewLine}{Exception}"
        }
      }
    ],
    "Enrich": ["FromLogContext", "WithMachineName", "WithThreadId", "WithProcessId", "WithEnvironmentName"]
  }
}
```

### Development Configuration (appsettings.Development.json)

```json
{
  "Serilog": {
    "MinimumLevel": {
      "Default": "Debug",
      "Override": {
        "Microsoft": "Information",
        "Microsoft.AspNetCore": "Information"
      }
    }
  }
}
```

## Log Levels

Use appropriate log levels to categorize events:

| Level | When to Use | Example |
|-------|-------------|---------|
| **Verbose/Debug** | Detailed debugging information | `_logger.LogDebug("Processing user ID: {UserId}", userId)` |
| **Information** | Normal application flow events | `_logger.LogInformation("User {UserId} successfully logged in", userId)` |
| **Warning** | Unexpected but recoverable situations | `_logger.LogWarning("Cache miss for key {CacheKey}, fetching from database", key)` |
| **Error** | Errors and exceptions | `_logger.LogError(ex, "Failed to process payment for order {OrderId}", orderId)` |
| **Fatal/Critical** | Critical failures requiring immediate attention | `_logger.LogCritical("Database connection lost - application cannot continue")` |

## Structured Logging Best Practices

### 1. Use Message Templates with Properties

❌ **BAD - String Interpolation:**
```csharp
_logger.LogInformation($"User {userId} fetched content {contentId}");
```

✅ **GOOD - Structured Properties:**
```csharp
_logger.LogInformation("User {UserId} fetched content {ContentId}", userId, contentId);
```

### 2. Name Properties Using PascalCase

```csharp
// Correct property naming
_logger.LogInformation("Search completed in {ElapsedMs}ms with {ResultCount} results for query {SearchQuery}",
    elapsed, results.Count, query);
```

### 3. Capture Context with Structured Data

```csharp
_logger.LogInformation("Payment processed for user {UserId} with {PaymentMethod} totaling {Amount:C}",
    userId, paymentMethod, amount);
```

### 4. Log Exceptions with Context

```csharp
try
{
    await ProcessPaymentAsync(orderId);
}
catch (PaymentException ex)
{
    _logger.LogError(ex, "Payment processing failed for order {OrderId} with provider {PaymentProvider}",
        orderId, ex.PaymentProvider);
    throw;
}
```

### 5. Use Timing for Performance Monitoring

```csharp
using (Operation.Time("Processing content for {UserId}", userId))
{
    var content = await _contentService.GetContentByIdAsync(contentId);
    // Processing logic
}
```

## Enrichers

Serilog enrichers automatically add contextual information to every log event:

### Built-in Enrichers

- **FromLogContext**: Adds properties from `LogContext`
- **WithMachineName**: Adds machine name
- **WithThreadId**: Adds thread ID for concurrency debugging
- **WithProcessId**: Adds process ID
- **WithProcessName**: Adds process name
- **WithEnvironmentName**: Adds environment (Development/Staging/Production)
- **WithCorrelationId**: Adds correlation ID for request tracking

### Custom Property Enrichment

```csharp
using Serilog.Context;

// Add properties to all logs within this scope
using (LogContext.PushProperty("UserId", userId))
using (LogContext.PushProperty("TenantId", tenantId))
{
    _logger.LogInformation("Processing user request");
    // All logs here will include UserId and TenantId
}
```

## HTTP Request Logging

HTTP requests are automatically logged with rich diagnostic information:

- Request method and path
- Response status code
- Elapsed time
- User agent
- Client IP address
- Authenticated user ID

Example log output:
```
HTTP GET /api/content/12345 responded 200 in 145.32 ms
```

## Log Sinks

### Console Sink (Development)

- Human-readable format with ANSI color coding
- Immediate feedback during development
- Template: `[{Timestamp:HH:mm:ss} {Level:u3}] {SourceContext}{NewLine}{Message:lj}{NewLine}{Exception}`

### File Sink (All Environments)

- Rolling daily log files: `logs/geoleap-20250113.log`
- 30-day retention period
- Structured format for analysis tools
- Template: `{Timestamp:yyyy-MM-dd HH:mm:ss.fff zzz} [{Level:u3}] {SourceContext} {Message:lj}{NewLine}{Exception}`

### Application Insights Sink (Production)

- Real-time log streaming to Azure Application Insights
- Advanced querying with Kusto Query Language (KQL)
- Integration with Azure Monitor and alerting
- Automatic correlation with requests and dependencies

## Example Usage Patterns

### Content Service Example

```csharp
public class ContentService : IContentService
{
    private readonly ILogger<ContentService> _logger;

    public async Task<ContentData?> GetContentByIdAsync(string id, string type)
    {
        try
        {
            _logger.LogInformation("Fetching content {ContentId} of type {ContentType}", id, type);

            using (Operation.Time("Database query for content {ContentId}", id))
            {
                var content = await _context.SearchableContents
                    .FirstOrDefaultAsync(c => c.Id.ToString() == id);
            }

            if (content == null)
            {
                _logger.LogWarning("Content {ContentId} not found", id);
                return null;
            }

            _logger.LogInformation("Successfully retrieved content {ContentId} with title {Title}",
                id, content.Title);

            return content;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error fetching content {ContentId} of type {ContentType}",
                id, type);
            throw;
        }
    }
}
```

### Authentication Service Example

```csharp
public class AuthService : IAuthService
{
    private readonly ILogger<AuthService> _logger;

    public async Task<AuthResult> LoginAsync(LoginRequest request)
    {
        _logger.LogInformation("Login attempt for user {Email}", request.Email);

        using (Operation.Time("User authentication for {Email}", request.Email))
        {
            var user = await _userManager.FindByEmailAsync(request.Email);

            if (user == null)
            {
                _logger.LogWarning("Login failed - user {Email} not found", request.Email);
                return AuthResult.Failed("Invalid credentials");
            }

            var result = await _signInManager.CheckPasswordSignInAsync(user, request.Password, lockoutOnFailure: true);

            if (result.Succeeded)
            {
                _logger.LogInformation("User {UserId} successfully logged in", user.Id);
            }
            else if (result.IsLockedOut)
            {
                _logger.LogWarning("User {UserId} account is locked out", user.Id);
            }
            else
            {
                _logger.LogWarning("Login failed for user {UserId} - invalid password", user.Id);
            }

            return result;
        }
    }
}
```

## Querying Logs

### Query Log Files

Use PowerShell or log analysis tools:

```powershell
# Find all errors related to a specific user
Select-String -Path "logs/*.log" -Pattern "UserId.*123456" | Where-Object { $_ -match "ERR" }

# Find slow requests (>1000ms)
Select-String -Path "logs/*.log" -Pattern "responded.*in \d{4,}"
```

### Query Application Insights

Use Kusto Query Language (KQL):

```kusto
// Find all errors in the last 24 hours
traces
| where timestamp > ago(24h)
| where severityLevel >= 3
| order by timestamp desc

// Find slow content requests
traces
| where message contains "GetContentById"
| where customDimensions.ElapsedMs > 1000
| summarize count() by tostring(customDimensions.ContentId)
| order by count_ desc

// Correlation across requests
traces
| where customDimensions.CorrelationId == "abc123"
| order by timestamp asc
```

## Performance Considerations

1. **Log Level in Production**: Set to `Information` or `Warning` to reduce volume
2. **Avoid Expensive Operations**: Don't serialize large objects in log messages
3. **Use Message Templates**: More efficient than string interpolation
4. **Async Sinks**: Serilog uses asynchronous writing to avoid blocking
5. **Selective Enrichment**: Only add enrichers that provide value

## Security Best Practices

1. **Never log sensitive data**:
   - Passwords
   - Credit card numbers
   - API keys or secrets
   - Personal identifying information (PII) without proper redaction

2. **Redact sensitive properties**:
```csharp
public class SensitiveDataRedactionEnricher : ILogEventEnricher
{
    public void Enrich(LogEvent logEvent, ILogEventPropertyFactory propertyFactory)
    {
        // Redact password fields
        if (logEvent.Properties.ContainsKey("Password"))
        {
            logEvent.AddOrUpdateProperty(propertyFactory.CreateProperty("Password", "***REDACTED***"));
        }
    }
}
```

## Monitoring and Alerting

### Recommended Alerts

1. **High Error Rate**: More than 10 errors/minute
2. **Critical Errors**: Any `LogCritical` events
3. **Slow Performance**: Requests taking >5 seconds
4. **Authentication Failures**: More than 5 failed logins/minute from same IP
5. **API Cost Overruns**: Daily budget exceeded

### Azure Monitor Integration

Configure alert rules in Azure Monitor to notify on-call engineers:

```json
{
  "name": "High Error Rate Alert",
  "condition": {
    "allOf": [
      {
        "metricName": "Errors",
        "operator": "GreaterThan",
        "threshold": 10,
        "timeAggregation": "Total",
        "dimensions": []
      }
    ]
  },
  "actions": {
    "actionGroups": ["on-call-engineers"]
  }
}
```

## Troubleshooting

### Common Issues

1. **Logs not appearing**:
   - Check `logs/` directory exists and is writable
   - Verify log level is not too restrictive
   - Ensure Serilog is properly configured in `Program.cs`

2. **Performance impact**:
   - Reduce log level in production
   - Disable verbose sinks (console in production)
   - Use sampling for high-volume events

3. **Missing context**:
   - Use enrichers (`WithMachineName`, `WithThreadId`, etc.)
   - Add properties with `LogContext.PushProperty`
   - Include correlation IDs in distributed scenarios

## Additional Resources

- [Serilog Official Documentation](https://serilog.net/)
- [Structured Logging Best Practices](https://stackify.com/what-is-structured-logging-and-why-developers-need-it/)
- [Application Insights Query Language](https://docs.microsoft.com/en-us/azure/azure-monitor/logs/query-language)
- [ASP.NET Core Logging](https://docs.microsoft.com/en-us/aspnet/core/fundamentals/logging/)

---

**Last Updated**: January 2025
**Version**: 1.0
**Maintained by**: GeoLeap Development Team
