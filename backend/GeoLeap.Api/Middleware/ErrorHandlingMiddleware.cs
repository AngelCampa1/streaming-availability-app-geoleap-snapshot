using System.Net;
using System.Text.Json;
using System.Security;
using Sentry;
using GeoLeap.Api.Exceptions;
using GeoLeap.Api.Models;

namespace GeoLeap.Api.Middleware;

public class ErrorHandlingMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<ErrorHandlingMiddleware> _logger;
    private readonly IWebHostEnvironment _environment;
    public ErrorHandlingMiddleware(RequestDelegate next, ILogger<ErrorHandlingMiddleware> logger,
        IWebHostEnvironment environment)
    {
        _next = next;
        _logger = logger;
        _environment = environment;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (Exception ex)
        {
            var correlationId = context.GetCorrelationId() ?? context.TraceIdentifier;
            
            // CRITICAL FIX: In testing mode, let ALL exceptions pass through for easier debugging
            if (_environment.EnvironmentName == "Testing")
            {
                _logger.LogError("Raw exception in testing environment: {ExceptionType} - {Message}", 
                    ex.GetType().Name, ex.Message);
                throw; // Let all exceptions pass through in testing
            }
            
            // CRITICAL FIX: Don't intercept authentication-related exceptions
            // Let the authentication middleware handle these properly
            if (IsAuthenticationException(ex) || IsAuthenticationPath(context.Request.Path))
            {
                // Log for debugging but don't handle - let it bubble up to authentication middleware
                _logger.LogInformation("Authentication exception on path {Path}: {Exception}", 
                    context.Request.Path, ex.GetType().Name);
                
                // E2E Bug Fix: Always rethrow auth exceptions - let auth middleware handle them
                // This ensures proper 401/403 responses instead of generic 500 errors
                throw;
            }
            
            LogException(context, ex, correlationId);
            await HandleExceptionAsync(context, ex, correlationId);
        }
    }
    
    private static bool IsAuthenticationException(Exception ex)
    {
        return ex is UnauthorizedAccessException ||
               ex is System.Security.SecurityException ||
               ex is Microsoft.IdentityModel.Tokens.SecurityTokenException ||
               ex.GetType().Name.Contains("Authentication") ||
               ex.GetType().Name.Contains("Authorization") ||
               ex.Message.Contains("unauthorized", StringComparison.OrdinalIgnoreCase) ||
               ex.Message.Contains("authentication", StringComparison.OrdinalIgnoreCase);
    }
    
    private static bool IsValidationException(Exception ex)
    {
        return ex is System.ComponentModel.DataAnnotations.ValidationException ||
               ex.GetType().Name.Contains("Validation") ||
               ex.GetType().Name.Contains("ModelState") ||
               ex.Message.Contains("validation", StringComparison.OrdinalIgnoreCase);
    }
    
    private static bool IsFrameworkException(Exception ex)
    {
        // Allow common framework exceptions to pass through in testing
        var typeName = ex.GetType().Name;
        return typeName.Contains("ArgumentException") ||
               typeName.Contains("InvalidOperationException") ||
               typeName.Contains("NotSupportedException") ||
               typeName.Contains("BadHttpRequestException") ||
               typeName.Contains("HttpRequestException") ||
               ex.GetType().Namespace?.StartsWith("Microsoft.AspNetCore") == true ||
               ex.GetType().Namespace?.StartsWith("System.ComponentModel.DataAnnotations") == true;
    }

    private void LogException(HttpContext context, Exception exception, string correlationId)
    {
        var userId = context.User?.Identity?.Name;
        var userAgent = context.Request.Headers.UserAgent.FirstOrDefault();
        var clientIp = context.Connection.RemoteIpAddress?.ToString();

        // Log structured exception with context
        _logger.LogError(exception,
            "Unhandled exception occurred. CorrelationId: {CorrelationId}, Method: {Method}, Path: {Path}, UserId: {UserId}, ClientIP: {ClientIP}",
            correlationId, context.Request.Method, context.Request.Path, userId ?? "Anonymous", clientIp);

        // Send to Sentry with additional context
        SentrySdk.CaptureException(exception, scope =>
        {
            scope.SetTag("correlation_id", correlationId);
            scope.SetTag("request_path", context.Request.Path);
            scope.SetTag("request_method", context.Request.Method);
            // client_ip intentionally omitted — PII, covered by SendDefaultPii:false policy
            if (!string.IsNullOrEmpty(userId))
                scope.SetTag("user_id", userId);
            if (!string.IsNullOrEmpty(userAgent))
                scope.SetTag("user_agent", userAgent);
        });
    }

    private async Task HandleExceptionAsync(HttpContext context, Exception exception, string correlationId)
    {
        var response = context.Response;
        response.ContentType = "application/json";
        var path = context.Request.Path.Value ?? "";
        var traceId = context.TraceIdentifier;

        ApiErrorResponse errorResponse = exception switch
        {
            ValidationException validationEx => CreateValidationErrorResponse(correlationId, path, validationEx, traceId),
            NotFoundError notFoundEx => CreateNotFoundErrorResponse(correlationId, path, notFoundEx, traceId),
            UnauthorizedError unauthorizedEx => CreateUnauthorizedErrorResponse(correlationId, path, unauthorizedEx, traceId),
            ForbiddenError forbiddenEx => CreateForbiddenErrorResponse(correlationId, path, forbiddenEx, traceId),
            ConflictError conflictEx => CreateConflictErrorResponse(correlationId, path, conflictEx, traceId),
            RateLimitExceededException rateLimitEx => CreateRateLimitErrorResponse(correlationId, path, rateLimitEx, traceId),
            ExternalServiceException serviceEx => CreateExternalServiceErrorResponse(correlationId, path, serviceEx, traceId),
            PaymentException paymentEx => CreatePaymentErrorResponse(correlationId, path, paymentEx, traceId),
            BusinessLogicException businessEx => CreateBusinessLogicErrorResponse(correlationId, path, businessEx, traceId),
            MaintenanceModeException maintenanceEx => CreateMaintenanceErrorResponse(correlationId, path, maintenanceEx, traceId),
            
            // Standard .NET exceptions
            ArgumentException or ArgumentNullException when IsAuthenticationPath(path) => 
                ErrorResponseFactory.CreateUnauthorizedError(correlationId, path, traceId),
            ArgumentException or ArgumentNullException => ErrorResponseFactory.CreateValidationError(
                correlationId, path, 
                new Dictionary<string, string[]> { ["parameter"] = new[] { "Invalid request parameters." } }, 
                traceId),
            UnauthorizedAccessException => ErrorResponseFactory.CreateUnauthorizedError(correlationId, path, traceId),
            KeyNotFoundException => ErrorResponseFactory.CreateNotFoundError(correlationId, path, "Resource", "unknown", traceId),
            
            _ => CreateInternalServerErrorResponse(correlationId, path, exception, traceId)
        };

        response.StatusCode = (int)GetStatusCodeFromErrorCode(errorResponse.Error.Code);

        // Add retry-after header for rate limit errors
        if (errorResponse.Error.RetryAfterSeconds.HasValue)
        {
            response.Headers["Retry-After"] = errorResponse.Error.RetryAfterSeconds.Value.ToString();
        }

        var jsonResponse = JsonSerializer.Serialize(errorResponse, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });

        await response.WriteAsync(jsonResponse);
    }

    private static ApiErrorResponse CreateValidationErrorResponse(string correlationId, string path, ValidationException ex, string traceId)
    {
        return ErrorResponseFactory.CreateValidationError(correlationId, path, ex.ValidationErrors, traceId);
    }

    private static ApiErrorResponse CreateNotFoundErrorResponse(string correlationId, string path, NotFoundError ex, string traceId)
    {
        return ErrorResponseFactory.CreateNotFoundError(correlationId, path, ex.ResourceType, ex.ResourceId, traceId);
    }

    private static ApiErrorResponse CreateUnauthorizedErrorResponse(string correlationId, string path, UnauthorizedError ex, string traceId)
    {
        return new ApiErrorBuilder()
            .WithCode(ex.ErrorCode)
            .WithMessage(ex.Message)
            .WithRetryable(ex.IsRetryable)
            .WithSupportContact(ex.SupportContact)
            .WithCorrelationId(correlationId)
            .WithPath(path)
            .WithTraceId(traceId)
            .Build();
    }

    private static ApiErrorResponse CreateForbiddenErrorResponse(string correlationId, string path, ForbiddenError ex, string traceId)
    {
        return ErrorResponseFactory.CreateForbiddenError(correlationId, path, ex.RequiredPermission, traceId);
    }

    private static ApiErrorResponse CreateConflictErrorResponse(string correlationId, string path, ConflictError ex, string traceId)
    {
        return new ApiErrorBuilder()
            .WithCode(ex.ErrorCode)
            .WithMessage(ex.Message)
            .WithRetryable(ex.IsRetryable)
            .WithSupportContact(ex.SupportContact)
            .WithCorrelationId(correlationId)
            .WithPath(path)
            .WithTraceId(traceId)
            .Build();
    }

    private static ApiErrorResponse CreateRateLimitErrorResponse(string correlationId, string path, RateLimitExceededException ex, string traceId)
    {
        return ErrorResponseFactory.CreateRateLimitError(correlationId, path, ex.RetryAfter, traceId);
    }

    private static ApiErrorResponse CreateExternalServiceErrorResponse(string correlationId, string path, ExternalServiceException ex, string traceId)
    {
        return ErrorResponseFactory.CreateExternalServiceError(correlationId, path, ex.ServiceName, traceId);
    }

    private static ApiErrorResponse CreatePaymentErrorResponse(string correlationId, string path, PaymentException ex, string traceId)
    {
        return new ApiErrorBuilder()
            .WithCode(ex.ErrorCode)
            .WithMessage(ex.Message)
            .WithRetryable(ex.IsRetryable)
            .WithSupportContact(ex.SupportContact)
            .WithCorrelationId(correlationId)
            .WithPath(path)
            .WithTraceId(traceId)
            .Build();
    }

    private static ApiErrorResponse CreateBusinessLogicErrorResponse(string correlationId, string path, BusinessLogicException ex, string traceId)
    {
        return new ApiErrorBuilder()
            .WithCode(ex.ErrorCode)
            .WithMessage(ex.Message)
            .WithRetryable(ex.IsRetryable)
            .WithSupportContact(ex.SupportContact)
            .WithCorrelationId(correlationId)
            .WithPath(path)
            .WithTraceId(traceId)
            .Build();
    }

    private static ApiErrorResponse CreateMaintenanceErrorResponse(string correlationId, string path, MaintenanceModeException ex, string traceId)
    {
        return ErrorResponseFactory.CreateMaintenanceError(correlationId, path, ex.EstimatedRecoveryTime, traceId);
    }

    private ApiErrorResponse CreateInternalServerErrorResponse(string correlationId, string path, Exception exception, string traceId)
    {
        var details = _environment.IsDevelopment() ? $"{exception.Message}\n{exception.StackTrace}" : null;
        return ErrorResponseFactory.CreateInternalServerError(correlationId, path, details, traceId);
    }

    private static bool IsAuthenticationPath(string path)
    {
        var authPaths = new[]
        {
            "/api/auth/login",           // E2E Bug Fix: Add missing auth paths
            "/api/auth/register",        // E2E Bug Fix: Add missing auth paths
            "/api/auth/refresh-token",   // E2E Bug Fix: Add missing auth paths
            "/api/auth/forgot-password", // E2E Bug Fix: Add missing auth paths
            "/api/auth/reset-password",  // E2E Bug Fix: Add missing auth paths
            "/api/auth/profile",
            "/api/auth/logout",
            "/api/auth/change-password",
            "/api/auth/me",
            "/api/auth/logout-all"
        };
        
        return authPaths.Any(authPath => path.StartsWith(authPath, StringComparison.OrdinalIgnoreCase));
    }

    private static HttpStatusCode GetStatusCodeFromErrorCode(string errorCode)
    {
        return errorCode switch
        {
            "VALIDATION_ERROR" => HttpStatusCode.BadRequest,
            "RESOURCE_NOT_FOUND" => HttpStatusCode.NotFound,
            "UNAUTHORIZED" => HttpStatusCode.Unauthorized,
            "FORBIDDEN" => HttpStatusCode.Forbidden,
            "CONFLICT" => HttpStatusCode.Conflict,
            "RATE_LIMIT_EXCEEDED" => HttpStatusCode.TooManyRequests,
            "EXTERNAL_SERVICE_ERROR" => HttpStatusCode.ServiceUnavailable,
            "PAYMENT_ERROR" => HttpStatusCode.PaymentRequired,
            "BUSINESS_LOGIC_ERROR" => HttpStatusCode.UnprocessableEntity,
            "MAINTENANCE_MODE" => HttpStatusCode.ServiceUnavailable,
            _ => HttpStatusCode.InternalServerError
        };
    }
}