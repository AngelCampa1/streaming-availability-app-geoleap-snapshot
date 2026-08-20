using Microsoft.AspNetCore.Mvc;
using GeoLeap.Api.Models;
using System.Diagnostics;

namespace GeoLeap.Api.Controllers;

/// <summary>
/// Base controller providing standardized error handling and validation
/// </summary>
[ApiController]
public abstract class ApiControllerBase : ControllerBase
{
    /// <summary>
    /// Validates ModelState and returns standardized error response if invalid
    /// </summary>
    protected ActionResult? ValidateModelState()
    {
        if (!ModelState.IsValid)
        {
            var validationErrors = ModelState
                .Where(x => x.Value?.Errors.Count > 0)
                .ToDictionary(
                    kvp => kvp.Key,
                    kvp => kvp.Value!.Errors.Select(e => e.ErrorMessage).ToArray()
                );

            var correlationId = Activity.Current?.Id ?? HttpContext.TraceIdentifier;
            var path = HttpContext.Request.Path.ToString();
            var traceId = Activity.Current?.RootId;

            var errorResponse = ErrorResponseFactory.CreateValidationError(
                correlationId,
                path,
                validationErrors,
                traceId
            );

            return BadRequest(errorResponse);
        }

        return null;
    }

    /// <summary>
    /// Creates a standardized error response for ServiceResult failures
    /// </summary>
    protected ActionResult HandleServiceResult(ServiceResult result)
    {
        if (result.IsSuccess)
        {
            return Ok();
        }

        var correlationId = Activity.Current?.Id ?? HttpContext.TraceIdentifier;
        var path = HttpContext.Request.Path.ToString();
        var traceId = Activity.Current?.RootId;

        // Map error codes to HTTP status codes
        var statusCode = result.ErrorCode switch
        {
            "NOT_FOUND" or "RESOURCE_NOT_FOUND" => 404,
            "UNAUTHORIZED" => 401,
            "FORBIDDEN" => 403,
            "VALIDATION_ERROR" or "INVALID_INPUT" => 400,
            "DUPLICATE_RESOURCE" or "CONFLICT" => 409,
            "CONCURRENCY_CONFLICT" => 409,
            "RATE_LIMIT_EXCEEDED" => 429,
            "DATABASE_TIMEOUT" or "EXTERNAL_SERVICE_ERROR" => 503,
            _ => 500
        };

        var errorResponse = new ApiErrorBuilder()
            .WithCode(result.ErrorCode ?? "OPERATION_FAILED")
            .WithMessage(result.ErrorMessage ?? "The operation failed.")
            .WithRetryable(IsRetryableError(result.ErrorCode))
            .WithCorrelationId(correlationId)
            .WithPath(path)
            .WithTraceId(traceId)
            .Build();

        return StatusCode(statusCode, errorResponse);
    }

    /// <summary>
    /// Creates a standardized error response for ServiceResult failures
    /// </summary>
    /// <typeparam name="T">The type of data in the service result</typeparam>
    protected ActionResult<T> HandleServiceResult<T>(ServiceResult<T> result)
    {
        if (result.IsSuccess && result.Data != null)
        {
            return Ok(result.Data);
        }

        var correlationId = Activity.Current?.Id ?? HttpContext.TraceIdentifier;
        var path = HttpContext.Request.Path.ToString();
        var traceId = Activity.Current?.RootId;

        var statusCode = result.ErrorCode switch
        {
            "NOT_FOUND" or "RESOURCE_NOT_FOUND" => 404,
            "UNAUTHORIZED" => 401,
            "FORBIDDEN" => 403,
            "VALIDATION_ERROR" or "INVALID_INPUT" => 400,
            "DUPLICATE_RESOURCE" or "CONFLICT" => 409,
            "CONCURRENCY_CONFLICT" => 409,
            "RATE_LIMIT_EXCEEDED" => 429,
            "DATABASE_TIMEOUT" or "EXTERNAL_SERVICE_ERROR" => 503,
            _ => 500
        };

        var errorResponse = new ApiErrorBuilder()
            .WithCode(result.ErrorCode ?? "OPERATION_FAILED")
            .WithMessage(result.ErrorMessage ?? "The operation failed.")
            .WithRetryable(IsRetryableError(result.ErrorCode))
            .WithCorrelationId(correlationId)
            .WithPath(path)
            .WithTraceId(traceId)
            .Build();

        return StatusCode(statusCode, errorResponse);
    }

    /// <summary>
    /// Creates a standardized not found error response
    /// </summary>
    protected ActionResult NotFoundError(string resourceType, string resourceId)
    {
        var correlationId = Activity.Current?.Id ?? HttpContext.TraceIdentifier;
        var path = HttpContext.Request.Path.ToString();
        var traceId = Activity.Current?.RootId;

        var errorResponse = ErrorResponseFactory.CreateNotFoundError(
            correlationId,
            path,
            resourceType,
            resourceId,
            traceId
        );

        return NotFound(errorResponse);
    }

    /// <summary>
    /// Creates a standardized forbidden error response
    /// </summary>
    protected ActionResult ForbiddenError(string? requiredPermission = null)
    {
        var correlationId = Activity.Current?.Id ?? HttpContext.TraceIdentifier;
        var path = HttpContext.Request.Path.ToString();
        var traceId = Activity.Current?.RootId;

        var errorResponse = ErrorResponseFactory.CreateForbiddenError(
            correlationId,
            path,
            requiredPermission,
            traceId
        );

        return StatusCode(403, errorResponse);
    }

    /// <summary>
    /// Creates a standardized bad request error response
    /// </summary>
    protected ActionResult BadRequestError(string message)
    {
        var correlationId = Activity.Current?.Id ?? HttpContext.TraceIdentifier;
        var path = HttpContext.Request.Path.ToString();
        var traceId = Activity.Current?.RootId;

        var errorResponse = ErrorResponseFactory.CreateBadRequestError(
            correlationId,
            path,
            message,
            traceId
        );

        return BadRequest(errorResponse);
    }

    /// <summary>
    /// Creates a standardized unauthorized error response
    /// </summary>
    protected ActionResult UnauthorizedError(string? message = null)
    {
        var correlationId = Activity.Current?.Id ?? HttpContext.TraceIdentifier;
        var path = HttpContext.Request.Path.ToString();
        var traceId = Activity.Current?.RootId;

        var errorResponse = message != null
            ? ErrorResponseFactory.CreateAuthenticationError(correlationId, path, message, traceId)
            : ErrorResponseFactory.CreateUnauthorizedError(correlationId, path, traceId);

        return Unauthorized(errorResponse);
    }

    /// <summary>
    /// Creates a standardized internal server error response
    /// </summary>
    protected ActionResult InternalError(string? details = null)
    {
        var correlationId = Activity.Current?.Id ?? HttpContext.TraceIdentifier;
        var path = HttpContext.Request.Path.ToString();
        var traceId = Activity.Current?.RootId;

        var errorResponse = ErrorResponseFactory.CreateInternalServerError(
            correlationId,
            path,
            details,
            traceId
        );

        return StatusCode(500, errorResponse);
    }

    /// <summary>
    /// Creates a standardized conflict error response
    /// </summary>
    protected ActionResult ConflictError(string message)
    {
        var correlationId = Activity.Current?.Id ?? HttpContext.TraceIdentifier;
        var path = HttpContext.Request.Path.ToString();
        var traceId = Activity.Current?.RootId;

        var errorResponse = new ApiErrorBuilder()
            .WithCode(ErrorCodes.CONFLICT)
            .WithMessage(message)
            .WithRetryable(false)
            .WithCorrelationId(correlationId)
            .WithPath(path)
            .WithTraceId(traceId)
            .Build();

        return Conflict(errorResponse);
    }

    /// <summary>
    /// Determines if an error code represents a retryable error
    /// </summary>
    private static bool IsRetryableError(string? errorCode) => errorCode switch
    {
        "DATABASE_TIMEOUT" => true,
        "DATABASE_CONFLICT" => true,
        "CONCURRENCY_CONFLICT" => true,
        "EXTERNAL_SERVICE_ERROR" => true,
        "RATE_LIMIT_EXCEEDED" => true,
        "NETWORK_ERROR" => true,
        _ => false
    };

    /// <summary>
    /// Gets the current user ID from claims
    /// </summary>
    protected string GetCurrentUserId()
    {
        var userId = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
                     ?? User.FindFirst("sub")?.Value
                     ?? User.FindFirst("userId")?.Value;

        if (string.IsNullOrEmpty(userId))
        {
            throw new UnauthorizedAccessException("User ID not found in claims");
        }

        return userId;
    }

    /// <summary>
    /// Safely gets the current user ID, returning null if not authenticated
    /// </summary>
    protected string? TryGetCurrentUserId()
    {
        return User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value
               ?? User.FindFirst("sub")?.Value
               ?? User.FindFirst("userId")?.Value;
    }
}

/// <summary>
/// Generic service result with data
/// </summary>
public class ServiceResult<T> : ServiceResult
{
    public T? Data { get; set; }
}
