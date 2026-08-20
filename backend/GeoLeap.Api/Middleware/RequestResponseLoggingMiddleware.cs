using System.Text;
using System.Text.Json;

namespace GeoLeap.Api.Middleware;

public class RequestResponseLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<RequestResponseLoggingMiddleware> _logger;
    private readonly IConfiguration _configuration;

    private static readonly string[] SensitiveHeaders = {
        "Authorization", "Cookie", "Set-Cookie", "X-API-Key", "X-Auth-Token"
    };

    private static readonly string[] SensitiveFields = {
        "password", "token", "secret", "key", "cardnumber", "cvv", "pin", "ssn"
    };

    public RequestResponseLoggingMiddleware(RequestDelegate next, ILogger<RequestResponseLoggingMiddleware> logger, IConfiguration configuration)
    {
        _next = next;
        _logger = logger;
        _configuration = configuration;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var isLoggingEnabled = _configuration.GetValue<bool>("Logging:RequestResponse:Enabled", true);
        var logRequestBody = _configuration.GetValue<bool>("Logging:RequestResponse:LogRequestBody", false);
        var logResponseBody = _configuration.GetValue<bool>("Logging:RequestResponse:LogResponseBody", false);

        if (!isLoggingEnabled)
        {
            await _next(context);
            return;
        }

        var correlationId = context.GetCorrelationId();
        var startTime = DateTime.UtcNow;

        // Log request
        await LogRequestAsync(context, correlationId, logRequestBody);

        // Capture response
        var originalBodyStream = context.Response.Body;
        using var responseBody = new MemoryStream();
        context.Response.Body = responseBody;

        try
        {
            await _next(context);

            var responseTime = (DateTime.UtcNow - startTime).TotalMilliseconds;

            // Ensure response is flushed before logging
            await context.Response.Body.FlushAsync();

            // Log response
            await LogResponseAsync(context, correlationId, responseTime, logResponseBody);

            // Copy response back to original stream
            responseBody.Seek(0, SeekOrigin.Begin);
            await responseBody.CopyToAsync(originalBodyStream);
        }
        catch (Exception ex)
        {
            var responseTime = (DateTime.UtcNow - startTime).TotalMilliseconds;
            
            _logger.LogError(ex, "Request failed {CorrelationId} {Method} {Path} in {ResponseTime}ms", 
                correlationId, context.Request.Method, context.Request.Path, responseTime);

            // Copy any response that was written before the exception
            responseBody.Seek(0, SeekOrigin.Begin);
            await responseBody.CopyToAsync(originalBodyStream);
            
            throw;
        }
        finally
        {
            context.Response.Body = originalBodyStream;
        }
    }

    private async Task LogRequestAsync(HttpContext context, string? correlationId, bool logBody)
    {
        var request = context.Request;
        var requestLog = new StringBuilder();

        requestLog.AppendLine($"=== REQUEST {correlationId} ===");
        requestLog.AppendLine($"{request.Method} {request.Scheme}://{request.Host}{request.Path}{request.QueryString}");
        
        // Log headers (filtered)
        foreach (var header in request.Headers.Where(h => !IsSensitiveHeader(h.Key)))
        {
            requestLog.AppendLine($"{header.Key}: {string.Join(", ", header.Value.ToArray())}");
        }

        // Log request body if enabled and appropriate
        if (logBody && request.ContentLength > 0 && IsLoggableContentType(request.ContentType))
        {
            request.EnableBuffering();
            var body = await ReadStreamAsync(request.Body);
            request.Body.Position = 0;

            if (!string.IsNullOrEmpty(body))
            {
                var sanitizedBody = SanitizeJsonContent(body);
                requestLog.AppendLine($"Body: {sanitizedBody}");
            }
        }

        _logger.LogInformation("{RequestLog}", requestLog.ToString());
    }

    private async Task LogResponseAsync(HttpContext context, string? correlationId, double responseTimeMs, bool logBody)
    {
        var response = context.Response;
        var responseLog = new StringBuilder();

        responseLog.AppendLine($"=== RESPONSE {correlationId} ===");
        responseLog.AppendLine($"Status: {response.StatusCode}");
        responseLog.AppendLine($"Response Time: {responseTimeMs:F2}ms");

        // Log headers (filtered)
        foreach (var header in response.Headers.Where(h => !IsSensitiveHeader(h.Key)))
        {
            responseLog.AppendLine($"{header.Key}: {string.Join(", ", header.Value.ToArray())}");
        }

        // Log response body if enabled and appropriate
        if (logBody && response.Body.Length > 0 && IsLoggableContentType(response.ContentType))
        {
            var body = await ReadStreamAsync(response.Body);
            
            if (!string.IsNullOrEmpty(body))
            {
                var sanitizedBody = SanitizeJsonContent(body);
                responseLog.AppendLine($"Body: {sanitizedBody}");
            }
        }

        var logLevel = response.StatusCode >= 400 ? LogLevel.Warning : LogLevel.Information;
        _logger.Log(logLevel, "{ResponseLog}", responseLog.ToString());
    }

    private static async Task<string> ReadStreamAsync(Stream stream)
    {
        stream.Seek(0, SeekOrigin.Begin);
        using var reader = new StreamReader(stream, leaveOpen: true);
        var content = await reader.ReadToEndAsync();
        stream.Seek(0, SeekOrigin.Begin);
        return content;
    }

    private static bool IsSensitiveHeader(string headerName)
    {
        return SensitiveHeaders.Any(sensitive => 
            headerName.Equals(sensitive, StringComparison.OrdinalIgnoreCase));
    }

    private static bool IsLoggableContentType(string? contentType)
    {
        if (string.IsNullOrEmpty(contentType)) return false;

        var loggableTypes = new[] { "application/json", "application/xml", "text/plain", "text/xml" };
        return loggableTypes.Any(type => contentType.Contains(type, StringComparison.OrdinalIgnoreCase));
    }

    private static string SanitizeJsonContent(string jsonContent)
    {
        try
        {
            using var document = JsonDocument.Parse(jsonContent);
            var sanitized = SanitizeJsonElement(document.RootElement);
            return JsonSerializer.Serialize(sanitized, new JsonSerializerOptions { WriteIndented = true });
        }
        catch
        {
            // If it's not valid JSON, just return truncated content
            return jsonContent.Length > 1000 ? $"{jsonContent[..1000]}..." : jsonContent;
        }
    }

    private static object? SanitizeJsonElement(JsonElement element)
    {
        switch (element.ValueKind)
        {
            case JsonValueKind.Object:
                var obj = new Dictionary<string, object?>();
                foreach (var property in element.EnumerateObject())
                {
                    if (IsSensitiveField(property.Name))
                    {
                        obj[property.Name] = "***REDACTED***";
                    }
                    else
                    {
                        obj[property.Name] = SanitizeJsonElement(property.Value);
                    }
                }
                return obj;

            case JsonValueKind.Array:
                return element.EnumerateArray().Select(SanitizeJsonElement).ToArray();

            case JsonValueKind.String:
                return element.GetString();

            case JsonValueKind.Number:
                return element.TryGetInt64(out var longValue) ? longValue : element.GetDouble();

            case JsonValueKind.True:
                return true;

            case JsonValueKind.False:
                return false;

            case JsonValueKind.Null:
                return null;

            default:
                return element.ToString();
        }
    }

    private static bool IsSensitiveField(string fieldName)
    {
        return SensitiveFields.Any(sensitive => 
            fieldName.Contains(sensitive, StringComparison.OrdinalIgnoreCase));
    }
}