using Microsoft.AspNetCore.Mvc;
using GeoLeap.Api.Models;
using System.Diagnostics;
using GeoLeap.Api.Middleware;

namespace GeoLeap.Api.Extensions;

/// <summary>
/// Extension methods for ControllerBase to provide standardized error responses.
/// Use these extensions when you can't inherit from ApiControllerBase.
/// </summary>
public static class ControllerBaseExtensions
{
    /// <summary>
    /// Gets correlation ID from context
    /// </summary>
    public static string GetCorrelationId(this ControllerBase controller)
    {
        return controller.HttpContext.GetCorrelationId()
               ?? Activity.Current?.Id
               ?? controller.HttpContext.TraceIdentifier;
    }

    /// <summary>
    /// Creates a standardized bad request error response
    /// </summary>
    public static BadRequestObjectResult StandardBadRequest(this ControllerBase controller, string message)
    {
        var correlationId = controller.GetCorrelationId();
        var path = controller.HttpContext.Request.Path.ToString();
        var traceId = Activity.Current?.RootId;

        var errorResponse = ErrorResponseFactory.CreateBadRequestError(
            correlationId,
            path,
            message,
            traceId
        );

        return new BadRequestObjectResult(errorResponse);
    }

    /// <summary>
    /// Creates a standardized validation error response
    /// </summary>
    public static BadRequestObjectResult StandardValidationError(
        this ControllerBase controller,
        Dictionary<string, string[]> validationErrors)
    {
        var correlationId = controller.GetCorrelationId();
        var path = controller.HttpContext.Request.Path.ToString();
        var traceId = Activity.Current?.RootId;

        var errorResponse = ErrorResponseFactory.CreateValidationError(
            correlationId,
            path,
            validationErrors,
            traceId
        );

        return new BadRequestObjectResult(errorResponse);
    }

    /// <summary>
    /// Creates a standardized validation error response from ModelState
    /// </summary>
    public static BadRequestObjectResult StandardModelStateError(this ControllerBase controller)
    {
        var validationErrors = controller.ModelState
            .Where(x => x.Value?.Errors.Count > 0)
            .ToDictionary(
                kvp => kvp.Key,
                kvp => kvp.Value!.Errors.Select(e => e.ErrorMessage).ToArray()
            );

        return controller.StandardValidationError(validationErrors);
    }

    /// <summary>
    /// Creates a standardized not found error response
    /// </summary>
    public static NotFoundObjectResult StandardNotFound(
        this ControllerBase controller,
        string resourceType,
        string resourceId)
    {
        var correlationId = controller.GetCorrelationId();
        var path = controller.HttpContext.Request.Path.ToString();
        var traceId = Activity.Current?.RootId;

        var errorResponse = ErrorResponseFactory.CreateNotFoundError(
            correlationId,
            path,
            resourceType,
            resourceId,
            traceId
        );

        return new NotFoundObjectResult(errorResponse);
    }

    /// <summary>
    /// Creates a standardized unauthorized error response
    /// </summary>
    public static UnauthorizedObjectResult StandardUnauthorized(
        this ControllerBase controller,
        string? message = null)
    {
        var correlationId = controller.GetCorrelationId();
        var path = controller.HttpContext.Request.Path.ToString();
        var traceId = Activity.Current?.RootId;

        var errorResponse = message != null
            ? ErrorResponseFactory.CreateAuthenticationError(correlationId, path, message, traceId)
            : ErrorResponseFactory.CreateUnauthorizedError(correlationId, path, traceId);

        return new UnauthorizedObjectResult(errorResponse);
    }

    /// <summary>
    /// Creates a standardized forbidden error response
    /// </summary>
    public static ObjectResult StandardForbidden(
        this ControllerBase controller,
        string? requiredPermission = null)
    {
        var correlationId = controller.GetCorrelationId();
        var path = controller.HttpContext.Request.Path.ToString();
        var traceId = Activity.Current?.RootId;

        var errorResponse = ErrorResponseFactory.CreateForbiddenError(
            correlationId,
            path,
            requiredPermission,
            traceId
        );

        return new ObjectResult(errorResponse) { StatusCode = 403 };
    }

    /// <summary>
    /// Creates a standardized conflict error response
    /// </summary>
    public static ConflictObjectResult StandardConflict(this ControllerBase controller, string message)
    {
        var correlationId = controller.GetCorrelationId();
        var path = controller.HttpContext.Request.Path.ToString();
        var traceId = Activity.Current?.RootId;

        var errorResponse = new ApiErrorBuilder()
            .WithCode(ErrorCodes.CONFLICT)
            .WithMessage(message)
            .WithRetryable(false)
            .WithCorrelationId(correlationId)
            .WithPath(path)
            .WithTraceId(traceId)
            .Build();

        return new ConflictObjectResult(errorResponse);
    }

    /// <summary>
    /// Creates a standardized internal server error response
    /// </summary>
    public static ObjectResult StandardInternalError(
        this ControllerBase controller,
        string? details = null)
    {
        var correlationId = controller.GetCorrelationId();
        var path = controller.HttpContext.Request.Path.ToString();
        var traceId = Activity.Current?.RootId;

        var errorResponse = ErrorResponseFactory.CreateInternalServerError(
            correlationId,
            path,
            details,
            traceId
        );

        return new ObjectResult(errorResponse) { StatusCode = 500 };
    }

    /// <summary>
    /// Creates a standardized rate limit exceeded error response
    /// </summary>
    public static ObjectResult StandardRateLimitExceeded(
        this ControllerBase controller,
        TimeSpan retryAfter)
    {
        var correlationId = controller.GetCorrelationId();
        var path = controller.HttpContext.Request.Path.ToString();
        var traceId = Activity.Current?.RootId;

        var errorResponse = ErrorResponseFactory.CreateRateLimitError(
            correlationId,
            path,
            retryAfter,
            traceId
        );

        controller.HttpContext.Response.Headers["Retry-After"] = ((int)retryAfter.TotalSeconds).ToString();

        return new ObjectResult(errorResponse) { StatusCode = 429 };
    }

    /// <summary>
    /// Creates a standardized external service error response
    /// </summary>
    public static ObjectResult StandardExternalServiceError(
        this ControllerBase controller,
        string serviceName)
    {
        var correlationId = controller.GetCorrelationId();
        var path = controller.HttpContext.Request.Path.ToString();
        var traceId = Activity.Current?.RootId;

        var errorResponse = ErrorResponseFactory.CreateExternalServiceError(
            correlationId,
            path,
            serviceName,
            traceId
        );

        return new ObjectResult(errorResponse) { StatusCode = 503 };
    }
}
