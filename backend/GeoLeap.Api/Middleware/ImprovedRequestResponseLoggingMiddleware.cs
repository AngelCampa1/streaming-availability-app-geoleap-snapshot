using System.Diagnostics;
using System.Text;
using GeoLeap.Api.Infrastructure;

namespace GeoLeap.Api.Middleware;

/// <summary>
/// Improved Request/Response logging middleware with proper stream handling
/// Logs HTTP request and response details for debugging and monitoring
/// Fixed version that properly handles response body buffering
/// </summary>
public class ImprovedRequestResponseLoggingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ImprovedRequestResponseLoggingMiddleware> _logger;
    private readonly HashSet<string> _excludedPaths;
    private readonly int _maxBodyLogSize = 4096; // 4KB max for body logging

    public ImprovedRequestResponseLoggingMiddleware(
        RequestDelegate next,
        ILogger<ImprovedRequestResponseLoggingMiddleware> logger)
    {
        _next = next;
        _logger = logger;

        // Exclude health check and static file paths from logging
        _excludedPaths = new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
            "/health",
            "/health/live",
            "/health/ready",
            "/swagger"
        };
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Skip logging for excluded paths
        if (_excludedPaths.Any(path => context.Request.Path.StartsWithSegments(path)))
        {
            await _next(context);
            return;
        }

        var stopwatch = Stopwatch.StartNew();
        var correlationId = context.TraceIdentifier;

        // Log request
        await LogRequestAsync(context, correlationId);

        // Capture the original response body stream
        var originalBodyStream = context.Response.Body;

        try
        {
            // Use a memory stream to capture the response
            using var responseBody = new MemoryStream();
            context.Response.Body = responseBody;

            // Execute the next middleware
            await _next(context);

            // Log response
            await LogResponseAsync(context, correlationId, stopwatch.ElapsedMilliseconds);

            // Copy the response back to the original stream
            responseBody.Seek(0, SeekOrigin.Begin);
            await responseBody.CopyToAsync(originalBodyStream);
        }
        finally
        {
            // Restore the original response body stream
            context.Response.Body = originalBodyStream;
        }
    }

    private async Task LogRequestAsync(HttpContext context, string correlationId)
    {
        try
        {
            var request = context.Request;
            var requestBody = await ReadRequestBodyAsync(request);

            // Sanitize request body to prevent logging sensitive data
            var sanitizedBody = SensitiveDataFilter.SanitizeString(requestBody);
            var sanitizedQueryString = SensitiveDataFilter.SanitizeString(request.QueryString.Value);

            _logger.LogInformation(
                "HTTP Request | {Method} {Path}{QueryString} | " +
                "CorrelationId: {CorrelationId} | " +
                "ContentType: {ContentType} | " +
                "ContentLength: {ContentLength} | " +
                "Body: {Body}",
                request.Method,
                request.Path,
                sanitizedQueryString,
                correlationId,
                request.ContentType ?? "N/A",
                request.ContentLength ?? 0,
                sanitizedBody);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to log HTTP request");
        }
    }

    private async Task LogResponseAsync(HttpContext context, string correlationId, long elapsedMs)
    {
        try
        {
            var response = context.Response;
            var responseBody = await ReadResponseBodyAsync(response);

            var logLevel = response.StatusCode >= 400
                ? LogLevel.Warning
                : LogLevel.Information;

            // Sanitize response body to prevent logging sensitive data
            var sanitizedBody = SensitiveDataFilter.SanitizeString(responseBody);

            _logger.Log(
                logLevel,
                "HTTP Response | {StatusCode} | " +
                "CorrelationId: {CorrelationId} | " +
                "Duration: {DurationMs}ms | " +
                "ContentType: {ContentType} | " +
                "ContentLength: {ContentLength} | " +
                "Body: {Body}",
                response.StatusCode,
                correlationId,
                elapsedMs,
                response.ContentType ?? "N/A",
                response.ContentLength ?? 0,
                sanitizedBody);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to log HTTP response");
        }
    }

    private async Task<string> ReadRequestBodyAsync(HttpRequest request)
    {
        if (request.ContentLength == null || request.ContentLength == 0)
        {
            return "[Empty]";
        }

        if (request.ContentLength > _maxBodyLogSize)
        {
            return $"[Body too large: {request.ContentLength} bytes]";
        }

        try
        {
            // Enable buffering so the request body can be read multiple times
            request.EnableBuffering();

            var body = await new StreamReader(request.Body, Encoding.UTF8, leaveOpen: true)
                .ReadToEndAsync();

            // Reset the stream position for the next middleware
            request.Body.Position = 0;

            return string.IsNullOrWhiteSpace(body) ? "[Empty]" : body;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to read request body");
            return "[Failed to read]";
        }
    }

    private async Task<string> ReadResponseBodyAsync(HttpResponse response)
    {
        if (response.ContentLength == null || response.ContentLength == 0)
        {
            return "[Empty]";
        }

        if (response.ContentLength > _maxBodyLogSize)
        {
            return $"[Body too large: {response.ContentLength} bytes]";
        }

        try
        {
            response.Body.Seek(0, SeekOrigin.Begin);
            var body = await new StreamReader(response.Body, Encoding.UTF8, leaveOpen: true)
                .ReadToEndAsync();

            // Reset position after reading
            response.Body.Seek(0, SeekOrigin.Begin);

            return string.IsNullOrWhiteSpace(body) ? "[Empty]" : body;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to read response body");
            return "[Failed to read]";
        }
    }
}
