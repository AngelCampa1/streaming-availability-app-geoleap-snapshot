using Serilog.Context;
using System.Diagnostics;

namespace GeoLeap.Api.Middleware;

public class CorrelationIdMiddleware
{
    private readonly RequestDelegate _next;
    private const string CorrelationIdHeaderName = "X-Correlation-ID";

    public CorrelationIdMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Try to get correlation ID from request header, otherwise generate new one
        var correlationId = GetOrGenerateCorrelationId(context);

        // Add to response header for client tracking
        context.Response.Headers.TryAdd(CorrelationIdHeaderName, correlationId);

        // Add to logging context
        using (LogContext.PushProperty("CorrelationId", correlationId))
        {
            // Add to activity for distributed tracing
            Activity.Current?.SetTag("correlation.id", correlationId);

            // Store in HttpContext for easy access throughout the request
            context.Items["CorrelationId"] = correlationId;

            await _next(context);
        }
    }

    private static string GetOrGenerateCorrelationId(HttpContext context)
    {
        // Check if correlation ID exists in request header
        if (context.Request.Headers.TryGetValue(CorrelationIdHeaderName, out var correlationId) 
            && !string.IsNullOrWhiteSpace(correlationId))
        {
            return correlationId.ToString();
        }

        // Generate new correlation ID
        return Guid.NewGuid().ToString("D");
    }
}

public static class CorrelationIdExtensions
{
    public static string? GetCorrelationId(this HttpContext context)
    {
        return context.Items["CorrelationId"]?.ToString();
    }
}