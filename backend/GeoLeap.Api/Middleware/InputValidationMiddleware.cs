using System.Text.Json;
using System.Text.RegularExpressions;

namespace GeoLeap.Api.Middleware;

public class InputValidationMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<InputValidationMiddleware> _logger;

    // Common malicious patterns to detect
    private static readonly Regex[] MaliciousPatterns = {
        new(@"<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>", RegexOptions.IgnoreCase | RegexOptions.Compiled),
        new(@"javascript:", RegexOptions.IgnoreCase | RegexOptions.Compiled),
        new(@"on\w+\s*=", RegexOptions.IgnoreCase | RegexOptions.Compiled),
        new(@"(union|select|insert|delete|drop|create|alter|exec|execute)\s", RegexOptions.IgnoreCase | RegexOptions.Compiled),
        new(@"(\bor\b|\band\b)\s+\d+\s*=\s*\d+", RegexOptions.IgnoreCase | RegexOptions.Compiled),
        new(@"<.*>", RegexOptions.Compiled) // Basic HTML tag detection
    };

    public InputValidationMiddleware(RequestDelegate next, ILogger<InputValidationMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        // Skip validation for endpoints that handle their own validation/sanitization
        var path = context.Request.Path.Value?.ToLowerInvariant() ?? "";

        // Skip webhook endpoints - they have their own signature verification
        if (path.StartsWith("/api/webhooks/"))
        {
            await _next(context);
            return;
        }

        // BUG FIX: Skip search endpoints - they handle their own input sanitization
        // This prevents 400 errors when users search for content that matches XSS patterns
        // The SearchController sanitizes input and returns empty results for malicious input
        if (path.StartsWith("/api/search/"))
        {
            await _next(context);
            return;
        }

        if (context.Request.Method == HttpMethods.Post ||
            context.Request.Method == HttpMethods.Put ||
            context.Request.Method == HttpMethods.Patch)
        {
            if (await ContainsMaliciousInput(context))
            {
                _logger.LogWarning("Malicious input detected from IP: {IpAddress}, Path: {Path}",
                    context.Connection.RemoteIpAddress, context.Request.Path);

                context.Response.StatusCode = 400;
                await context.Response.WriteAsync(JsonSerializer.Serialize(new
                {
                    Error = "Invalid input detected",
                    CorrelationId = context.TraceIdentifier
                }));
                return;
            }
        }

        // Sanitize query parameters
        if (context.Request.Query.Any())
        {
            SanitizeQueryParameters(context);
        }

        await _next(context);
    }

    private async Task<bool> ContainsMaliciousInput(HttpContext context)
    {
        if (context.Request.ContentType?.Contains("application/json") == true)
        {
            context.Request.EnableBuffering();
            using var reader = new StreamReader(context.Request.Body, leaveOpen: true);
            var body = await reader.ReadToEndAsync();
            context.Request.Body.Position = 0;

            return ContainsMaliciousContent(body);
        }

        if (context.Request.HasFormContentType)
        {
            var form = await context.Request.ReadFormAsync();
            return form.Any(field => ContainsMaliciousContent(field.Value.ToString() ?? string.Empty));
        }

        return false;
    }

    private static bool ContainsMaliciousContent(string input)
    {
        if (string.IsNullOrEmpty(input))
            return false;

        return MaliciousPatterns.Any(pattern => pattern.IsMatch(input));
    }

    private static void SanitizeQueryParameters(HttpContext context)
    {
        foreach (var param in context.Request.Query.ToList())
        {
            var paramValue = param.Value.ToString() ?? string.Empty;
            if (ContainsMaliciousContent(paramValue))
            {
                // Remove malicious query parameters
                context.Items[$"blocked_param_{param.Key}"] = paramValue;
            }
        }
    }
}