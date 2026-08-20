using System.Text.Json.Serialization;

namespace GeoLeap.Api.Models;

/// <summary>
/// Standard error codes for API responses.
/// Use these constants for machine-readable error identification.
/// </summary>
public static class ErrorCodes
{
    // Client Errors (4xx)
    public const string BAD_REQUEST = "BAD_REQUEST";
    public const string VALIDATION_ERROR = "VALIDATION_ERROR";
    public const string UNAUTHORIZED = "UNAUTHORIZED";
    public const string AUTHENTICATION_FAILED = "AUTHENTICATION_FAILED";
    public const string FORBIDDEN = "FORBIDDEN";
    public const string NOT_FOUND = "RESOURCE_NOT_FOUND";
    public const string CONFLICT = "CONFLICT";
    public const string RATE_LIMITED = "RATE_LIMIT_EXCEEDED";

    // Server Errors (5xx)
    public const string INTERNAL_ERROR = "INTERNAL_SERVER_ERROR";
    public const string EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR";
    public const string MAINTENANCE_MODE = "MAINTENANCE_MODE";
    public const string SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE";
    public const string TIMEOUT = "TIMEOUT";

    // Domain-Specific Errors
    public const string PAYMENT_FAILED = "PAYMENT_FAILED";
    public const string SUBSCRIPTION_EXPIRED = "SUBSCRIPTION_EXPIRED";
    public const string INVALID_TOKEN = "INVALID_TOKEN";
    public const string EMAIL_ALREADY_EXISTS = "EMAIL_ALREADY_EXISTS";
    public const string INVALID_CREDENTIALS = "INVALID_CREDENTIALS";
    public const string ACCOUNT_LOCKED = "ACCOUNT_LOCKED";
    public const string SESSION_EXPIRED = "SESSION_EXPIRED";
}

public class ApiErrorResponse
{
    [JsonPropertyName("correlationId")]
    public string CorrelationId { get; set; } = string.Empty;

    [JsonPropertyName("error")]
    public ApiError Error { get; set; } = null!;

    [JsonPropertyName("timestamp")]
    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    [JsonPropertyName("path")]
    public string Path { get; set; } = string.Empty;

    [JsonPropertyName("traceId")]
    public string? TraceId { get; set; }
}

public class ApiError
{
    [JsonPropertyName("code")]
    public string Code { get; set; } = string.Empty;

    [JsonPropertyName("message")]
    public string Message { get; set; } = string.Empty;

    [JsonPropertyName("details")]
    public string? Details { get; set; }

    [JsonPropertyName("retryable")]
    public bool Retryable { get; set; }

    [JsonPropertyName("supportContact")]
    public string? SupportContact { get; set; }

    [JsonPropertyName("validationErrors")]
    public Dictionary<string, string[]>? ValidationErrors { get; set; }

    [JsonPropertyName("retryAfter")]
    public int? RetryAfterSeconds { get; set; }

    [JsonPropertyName("estimatedRecoveryTime")]
    public DateTime? EstimatedRecoveryTime { get; set; }
}

public class ApiErrorBuilder
{
    private readonly ApiError _error = new();
    private string _correlationId = string.Empty;
    private string _path = string.Empty;
    private string? _traceId;

    public ApiErrorBuilder WithCode(string code)
    {
        _error.Code = code;
        return this;
    }

    public ApiErrorBuilder WithMessage(string message)
    {
        _error.Message = message;
        return this;
    }

    public ApiErrorBuilder WithDetails(string? details)
    {
        _error.Details = details;
        return this;
    }

    public ApiErrorBuilder WithRetryable(bool retryable)
    {
        _error.Retryable = retryable;
        return this;
    }

    public ApiErrorBuilder WithSupportContact(string? supportContact)
    {
        _error.SupportContact = supportContact;
        return this;
    }

    public ApiErrorBuilder WithValidationErrors(Dictionary<string, string[]> validationErrors)
    {
        _error.ValidationErrors = validationErrors;
        return this;
    }

    public ApiErrorBuilder WithRetryAfter(TimeSpan retryAfter)
    {
        _error.RetryAfterSeconds = (int)retryAfter.TotalSeconds;
        return this;
    }

    public ApiErrorBuilder WithEstimatedRecoveryTime(DateTime estimatedRecoveryTime)
    {
        _error.EstimatedRecoveryTime = estimatedRecoveryTime;
        return this;
    }

    public ApiErrorBuilder WithCorrelationId(string correlationId)
    {
        _correlationId = correlationId;
        return this;
    }

    public ApiErrorBuilder WithPath(string path)
    {
        _path = path;
        return this;
    }

    public ApiErrorBuilder WithTraceId(string? traceId)
    {
        _traceId = traceId;
        return this;
    }

    public ApiErrorResponse Build()
    {
        return new ApiErrorResponse
        {
            CorrelationId = _correlationId,
            Error = _error,
            Path = _path,
            TraceId = _traceId,
            Timestamp = DateTime.UtcNow
        };
    }
}

public static class ErrorResponseFactory
{
    public static ApiErrorResponse CreateValidationError(string correlationId, string path, Dictionary<string, string[]> validationErrors, string? traceId = null)
    {
        return new ApiErrorBuilder()
            .WithCode("VALIDATION_ERROR")
            .WithMessage("One or more validation errors occurred.")
            .WithRetryable(false)
            .WithSupportContact("Please check your input and try again.")
            .WithValidationErrors(validationErrors)
            .WithCorrelationId(correlationId)
            .WithPath(path)
            .WithTraceId(traceId)
            .Build();
    }

    public static ApiErrorResponse CreateNotFoundError(string correlationId, string path, string resourceType, string resourceId, string? traceId = null)
    {
        return new ApiErrorBuilder()
            .WithCode("RESOURCE_NOT_FOUND")
            .WithMessage($"{resourceType} with ID '{resourceId}' was not found.")
            .WithRetryable(false)
            .WithSupportContact("Please verify the resource ID and try again.")
            .WithCorrelationId(correlationId)
            .WithPath(path)
            .WithTraceId(traceId)
            .Build();
    }

    public static ApiErrorResponse CreateUnauthorizedError(string correlationId, string path, string? traceId = null)
    {
        return new ApiErrorBuilder()
            .WithCode("UNAUTHORIZED")
            .WithMessage("Authentication is required to access this resource.")
            .WithRetryable(false)
            .WithSupportContact("Please log in and try again.")
            .WithCorrelationId(correlationId)
            .WithPath(path)
            .WithTraceId(traceId)
            .Build();
    }

    public static ApiErrorResponse CreateForbiddenError(string correlationId, string path, string? requiredPermission = null, string? traceId = null)
    {
        var message = requiredPermission != null
            ? $"You don't have the required permission '{requiredPermission}' to access this resource."
            : "You don't have permission to access this resource.";

        return new ApiErrorBuilder()
            .WithCode("FORBIDDEN")
            .WithMessage(message)
            .WithRetryable(false)
            .WithSupportContact("Contact your administrator if you believe you should have access to this resource.")
            .WithCorrelationId(correlationId)
            .WithPath(path)
            .WithTraceId(traceId)
            .Build();
    }

    public static ApiErrorResponse CreateRateLimitError(string correlationId, string path, TimeSpan retryAfter, string? traceId = null)
    {
        return new ApiErrorBuilder()
            .WithCode("RATE_LIMIT_EXCEEDED")
            .WithMessage("Rate limit exceeded. Please wait before making another request.")
            .WithRetryable(true)
            .WithRetryAfter(retryAfter)
            .WithSupportContact("Please wait and try again.")
            .WithCorrelationId(correlationId)
            .WithPath(path)
            .WithTraceId(traceId)
            .Build();
    }

    public static ApiErrorResponse CreateExternalServiceError(string correlationId, string path, string serviceName, string? traceId = null)
    {
        return new ApiErrorBuilder()
            .WithCode("EXTERNAL_SERVICE_ERROR")
            .WithMessage($"External service '{serviceName}' is currently unavailable.")
            .WithRetryable(true)
            .WithSupportContact("This is a temporary issue. Please try again in a few minutes.")
            .WithCorrelationId(correlationId)
            .WithPath(path)
            .WithTraceId(traceId)
            .Build();
    }

    public static ApiErrorResponse CreateMaintenanceError(string correlationId, string path, DateTime? estimatedRecoveryTime = null, string? traceId = null)
    {
        return new ApiErrorBuilder()
            .WithCode("MAINTENANCE_MODE")
            .WithMessage("The service is currently under maintenance.")
            .WithRetryable(true)
            .WithSupportContact("The service is temporarily down for maintenance. Please try again later.")
            .WithEstimatedRecoveryTime(estimatedRecoveryTime ?? DateTime.UtcNow.AddMinutes(30))
            .WithCorrelationId(correlationId)
            .WithPath(path)
            .WithTraceId(traceId)
            .Build();
    }

    public static ApiErrorResponse CreateInternalServerError(string correlationId, string path, string? details = null, string? traceId = null)
    {
        return new ApiErrorBuilder()
            .WithCode("INTERNAL_SERVER_ERROR")
            .WithMessage("An unexpected error occurred while processing your request.")
            .WithDetails(details)
            .WithRetryable(false)
            .WithSupportContact("Please contact support with the correlation ID if the problem persists.")
            .WithCorrelationId(correlationId)
            .WithPath(path)
            .WithTraceId(traceId)
            .Build();
    }

    public static ApiErrorResponse CreateBadRequestError(string correlationId, string path, string message, string? traceId = null)
    {
        return new ApiErrorBuilder()
            .WithCode("BAD_REQUEST")
            .WithMessage(message)
            .WithRetryable(false)
            .WithSupportContact("Please check your request and try again.")
            .WithCorrelationId(correlationId)
            .WithPath(path)
            .WithTraceId(traceId)
            .Build();
    }

    public static ApiErrorResponse CreateAuthenticationError(string correlationId, string path, string message, string? traceId = null)
    {
        return new ApiErrorBuilder()
            .WithCode("AUTHENTICATION_FAILED")
            .WithMessage(message)
            .WithRetryable(false)
            .WithSupportContact("Please log in again.")
            .WithCorrelationId(correlationId)
            .WithPath(path)
            .WithTraceId(traceId)
            .Build();
    }
}