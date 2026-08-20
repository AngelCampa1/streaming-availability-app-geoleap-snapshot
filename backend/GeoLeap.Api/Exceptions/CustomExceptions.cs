using System.Net;

namespace GeoLeap.Api.Exceptions;

public abstract class BaseCustomException : Exception
{
    public abstract HttpStatusCode StatusCode { get; }
    public abstract string ErrorCode { get; }
    public virtual bool IsRetryable => false;
    public virtual string? SupportContact => null;

    protected BaseCustomException(string message) : base(message) { }
    protected BaseCustomException(string message, Exception innerException) : base(message, innerException) { }
}

public class ValidationException : BaseCustomException
{
    public override HttpStatusCode StatusCode => HttpStatusCode.BadRequest;
    public override string ErrorCode => "VALIDATION_ERROR";
    public Dictionary<string, string[]> ValidationErrors { get; }

    public ValidationException(string message) : base(message)
    {
        ValidationErrors = new Dictionary<string, string[]>();
    }

    public ValidationException(Dictionary<string, string[]> validationErrors) 
        : base("One or more validation errors occurred.")
    {
        ValidationErrors = validationErrors;
    }
}

public class NotFoundError : BaseCustomException
{
    public override HttpStatusCode StatusCode => HttpStatusCode.NotFound;
    public override string ErrorCode => "RESOURCE_NOT_FOUND";
    public string ResourceType { get; }
    public string ResourceId { get; }

    public NotFoundError(string resourceType, string resourceId) 
        : base($"{resourceType} with ID '{resourceId}' was not found.")
    {
        ResourceType = resourceType;
        ResourceId = resourceId;
    }

    public NotFoundError(string message) : base(message)
    {
        ResourceType = "Unknown";
        ResourceId = "Unknown";
    }
}

public class UnauthorizedError : BaseCustomException
{
    public override HttpStatusCode StatusCode => HttpStatusCode.Unauthorized;
    public override string ErrorCode => "UNAUTHORIZED";
    public override string SupportContact => "Please log in again or contact support if the problem persists.";

    public UnauthorizedError(string message = "Authentication is required to access this resource.") 
        : base(message) { }
}

public class ForbiddenError : BaseCustomException
{
    public override HttpStatusCode StatusCode => HttpStatusCode.Forbidden;
    public override string ErrorCode => "FORBIDDEN";
    public override string SupportContact => "Contact your administrator if you believe you should have access to this resource.";
    public string? RequiredPermission { get; }

    public ForbiddenError(string message = "You don't have permission to access this resource.") 
        : base(message) { }

    public ForbiddenError(string message, string requiredPermission) 
        : base(message)
    {
        RequiredPermission = requiredPermission;
    }
}

public class ConflictError : BaseCustomException
{
    public override HttpStatusCode StatusCode => HttpStatusCode.Conflict;
    public override string ErrorCode => "CONFLICT";

    public ConflictError(string message) : base(message) { }
}

public class RateLimitExceededException : BaseCustomException
{
    public override HttpStatusCode StatusCode => HttpStatusCode.TooManyRequests;
    public override string ErrorCode => "RATE_LIMIT_EXCEEDED";
    public override bool IsRetryable => true;
    public override string SupportContact => "Please wait before making another request.";
    public TimeSpan RetryAfter { get; }

    public RateLimitExceededException(TimeSpan retryAfter, string message = "Rate limit exceeded.") 
        : base(message)
    {
        RetryAfter = retryAfter;
    }
}

public class ExternalServiceException : BaseCustomException
{
    public override HttpStatusCode StatusCode => HttpStatusCode.ServiceUnavailable;
    public override string ErrorCode => "EXTERNAL_SERVICE_ERROR";
    public override bool IsRetryable => true;
    public override string SupportContact => "This is a temporary issue. Please try again in a few minutes.";
    public string ServiceName { get; }

    public ExternalServiceException(string serviceName, string message) 
        : base($"External service '{serviceName}' is currently unavailable: {message}")
    {
        ServiceName = serviceName;
    }

    public ExternalServiceException(string serviceName, string message, Exception innerException) 
        : base($"External service '{serviceName}' is currently unavailable: {message}", innerException)
    {
        ServiceName = serviceName;
    }
}

public class PaymentException : BaseCustomException
{
    public override HttpStatusCode StatusCode => HttpStatusCode.PaymentRequired;
    public override string ErrorCode => "PAYMENT_ERROR";
    public override string SupportContact => "Please check your payment method or contact support.";
    public string PaymentErrorCode { get; }

    public PaymentException(string message, string paymentErrorCode) : base(message)
    {
        PaymentErrorCode = paymentErrorCode;
    }
}

public class BusinessLogicException : BaseCustomException
{
    public override HttpStatusCode StatusCode => HttpStatusCode.UnprocessableEntity;
    public override string ErrorCode => "BUSINESS_LOGIC_ERROR";

    public BusinessLogicException(string message) : base(message) { }
}

public class MaintenanceModeException : BaseCustomException
{
    public override HttpStatusCode StatusCode => HttpStatusCode.ServiceUnavailable;
    public override string ErrorCode => "MAINTENANCE_MODE";
    public override bool IsRetryable => true;
    public override string SupportContact => "The service is temporarily down for maintenance. Please try again later.";
    public DateTime? EstimatedRecoveryTime { get; }

    public MaintenanceModeException(DateTime? estimatedRecoveryTime = null) 
        : base("The service is currently under maintenance.")
    {
        EstimatedRecoveryTime = estimatedRecoveryTime;
    }
}

public class CircuitBreakerOpenException : BaseCustomException
{
    public override HttpStatusCode StatusCode => HttpStatusCode.ServiceUnavailable;
    public override string ErrorCode => "CIRCUIT_BREAKER_OPEN";
    public override bool IsRetryable => true;
    public override string SupportContact => "This is a temporary protective measure. Please try again later.";
    public string ServiceName { get; }
    public DateTime? EstimatedRecoveryTime { get; }

    public CircuitBreakerOpenException(string serviceName, DateTime? estimatedRecoveryTime = null)
        : base($"Circuit breaker is open for service '{serviceName}'. Service is temporarily unavailable.")
    {
        ServiceName = serviceName;
        EstimatedRecoveryTime = estimatedRecoveryTime;
    }
}

public class DatabaseException : BaseCustomException
{
    public override HttpStatusCode StatusCode => HttpStatusCode.ServiceUnavailable;
    public override string ErrorCode => "DATABASE_ERROR";
    public override bool IsRetryable => true;
    public override string SupportContact => "Database is temporarily unavailable. Please try again.";

    public DatabaseException(string message, Exception? innerException = null) : base(message, innerException!)
    {
    }
}

public class SecurityException : BaseCustomException
{
    public override HttpStatusCode StatusCode => HttpStatusCode.BadRequest;
    public override string ErrorCode => "SECURITY_VIOLATION";
    public override string SupportContact => "This request has been blocked for security reasons.";
    public string AttackType { get; }

    public SecurityException(string attackType, string message) : base(message)
    {
        AttackType = attackType;
    }
}