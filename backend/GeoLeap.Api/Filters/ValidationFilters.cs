using System.Net;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using System.Text.Json;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services.ValidationServices;
using GeoLeap.Api.Exceptions;

namespace GeoLeap.Api.Filters;

/// <summary>
/// Global validation filter that standardizes validation error responses
/// </summary>
public class GlobalValidationFilter : IActionFilter
{
    private readonly ILogger<GlobalValidationFilter> _logger;

    public GlobalValidationFilter(ILogger<GlobalValidationFilter> logger)
    {
        _logger = logger;
    }

    public void OnActionExecuting(ActionExecutingContext context)
    {
        if (!context.ModelState.IsValid)
        {
            var correlationId = context.HttpContext.TraceIdentifier;
            var path = context.HttpContext.Request.Path.Value ?? "";

            var validationErrors = context.ModelState
                .Where(x => x.Value?.Errors.Count > 0)
                .ToDictionary(
                    kvp => kvp.Key,
                    kvp => kvp.Value!.Errors.Select(e => e.ErrorMessage).ToArray()
                );

            _logger.LogWarning("Model validation failed for {Path}. CorrelationId: {CorrelationId}, Errors: {@Errors}",
                path, correlationId, validationErrors);

            var errorResponse = ErrorResponseFactory.CreateValidationError(
                correlationId, path, validationErrors, context.HttpContext.TraceIdentifier);

            context.Result = new BadRequestObjectResult(errorResponse);
        }
    }

    public void OnActionExecuted(ActionExecutedContext context)
    {
        // Nothing to do after action execution
    }
}

/// <summary>
/// Business validation filter that applies business rules validation
/// </summary>
public class BusinessValidationFilter : IAsyncActionFilter
{
    private readonly IBusinessValidationService _businessValidationService;
    private readonly ILogger<BusinessValidationFilter> _logger;

    public BusinessValidationFilter(
        IBusinessValidationService businessValidationService,
        ILogger<BusinessValidationFilter> logger)
    {
        _businessValidationService = businessValidationService;
        _logger = logger;
    }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var actionName = context.ActionDescriptor.DisplayName;
        var correlationId = context.HttpContext.TraceIdentifier;

        try
        {
            // Apply business validation based on action name and parameters
            var validationResult = await ApplyBusinessValidation(context);

            if (!validationResult.IsValid)
            {
                _logger.LogWarning("Business validation failed for {Action}. CorrelationId: {CorrelationId}, Errors: {@Errors}",
                    actionName, correlationId, validationResult.Errors);

                var validationErrors = new Dictionary<string, string[]>
                {
                    ["business"] = validationResult.Errors.ToArray()
                };

                var errorResponse = ErrorResponseFactory.CreateValidationError(
                    correlationId, context.HttpContext.Request.Path.Value ?? "", 
                    validationErrors, context.HttpContext.TraceIdentifier);

                context.Result = new UnprocessableEntityObjectResult(errorResponse);
                return;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred during business validation for {Action}. CorrelationId: {CorrelationId}",
                actionName, correlationId);

            // Continue execution if validation service fails
        }

        await next();
    }

    private async Task<Services.ValidationServices.ValidationResult> ApplyBusinessValidation(ActionExecutingContext context)
    {
        var actionName = context.ActionDescriptor.DisplayName?.ToLower() ?? "";
        var result = new Services.ValidationServices.ValidationResult { IsValid = true };

        try
        {
            // Apply validation based on action patterns
            if (actionName.Contains("register") && context.ActionArguments.TryGetValue("registerDto", out var regDto))
            {
                if (regDto is RegisterDto registerDto)
                {
                    result = await _businessValidationService.ValidateUserRegistrationAsync(registerDto);
                }
            }
            else if (actionName.Contains("payment") && context.ActionArguments.ContainsKey("amount"))
            {
                var amount = Convert.ToDecimal(context.ActionArguments["amount"]);
                var currency = context.ActionArguments.TryGetValue("currency", out var curr) ? curr?.ToString() ?? "USD" : "USD";
                result = await _businessValidationService.ValidatePaymentAmountAsync(amount, currency);
            }
            else if (actionName.Contains("search") && context.ActionArguments.TryGetValue("query", out var searchQuery))
            {
                if (searchQuery is string query)
                {
                    result = _businessValidationService.ValidateSearchQuery(query);
                }
            }
            else if (actionName.Contains("pagination"))
            {
                var page = Convert.ToInt32(context.ActionArguments.TryGetValue("page", out var pageValue) ? pageValue : 1);
                var pageSize = Convert.ToInt32(context.ActionArguments.TryGetValue("pageSize", out var pageSizeValue) ? pageSizeValue : 10);
                result = _businessValidationService.ValidatePaginationParameters(page, pageSize);
            }
            else if (actionName.Contains("upload") && context.ActionArguments.TryGetValue("file", out var fileObj))
            {
                if (fileObj is IFormFile file)
                {
                    var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif", ".pdf", ".doc", ".docx" };
                    var maxSizeBytes = 5 * 1024 * 1024; // 5MB
                    result = _businessValidationService.ValidateFileUpload(file, allowedExtensions, maxSizeBytes);
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during business validation application");
            result = new Services.ValidationServices.ValidationResult { IsValid = true }; // Allow through if validation fails
        }

        return result;
    }
}

/// <summary>
/// Security validation filter that checks for security threats
/// </summary>
public class SecurityValidationFilter : IActionFilter
{
    private readonly ILogger<SecurityValidationFilter> _logger;

    public SecurityValidationFilter(ILogger<SecurityValidationFilter> logger)
    {
        _logger = logger;
    }

    public void OnActionExecuting(ActionExecutingContext context)
    {
        var correlationId = context.HttpContext.TraceIdentifier;
        var clientIp = context.HttpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown";
        var userAgent = context.HttpContext.Request.Headers.UserAgent.FirstOrDefault() ?? "Unknown";
        var path = context.HttpContext.Request.Path.Value ?? "";

        try
        {
            // Check for suspicious request patterns
            if (IsSuspiciousRequest(context))
            {
                _logger.LogWarning("Suspicious request detected. IP: {ClientIP}, Path: {Path}, UserAgent: {UserAgent}, CorrelationId: {CorrelationId}",
                    clientIp, path, userAgent, correlationId);

                var errorResponse = new ApiErrorBuilder()
                    .WithCode("SECURITY_VIOLATION")
                    .WithMessage("Request blocked for security reasons.")
                    .WithRetryable(false)
                    .WithSupportContact("Please contact support if you believe this is an error.")
                    .WithCorrelationId(correlationId)
                    .WithPath(path)
                    .WithTraceId(context.HttpContext.TraceIdentifier)
                    .Build();

                context.Result = new ObjectResult(errorResponse)
                {
                    StatusCode = (int)HttpStatusCode.BadRequest
                };
                return;
            }

            // Check for rate limiting violations
            if (IsRateLimitViolation(context, clientIp))
            {
                _logger.LogWarning("Rate limit violation detected. IP: {ClientIP}, Path: {Path}, CorrelationId: {CorrelationId}",
                    clientIp, path, correlationId);

                var errorResponse = ErrorResponseFactory.CreateRateLimitError(
                    correlationId, path, TimeSpan.FromMinutes(1), context.HttpContext.TraceIdentifier);

                context.Result = new ObjectResult(errorResponse)
                {
                    StatusCode = (int)HttpStatusCode.TooManyRequests
                };
                context.HttpContext.Response.Headers.Add("Retry-After", "60");
                return;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred during security validation for {Path}. CorrelationId: {CorrelationId}",
                path, correlationId);
            // Continue execution if security validation fails
        }
    }

    public void OnActionExecuted(ActionExecutedContext context)
    {
        // Log successful completions for security monitoring
        var statusCode = context.HttpContext.Response.StatusCode;
        if (statusCode >= 400)
        {
            var clientIp = context.HttpContext.Connection.RemoteIpAddress?.ToString() ?? "Unknown";
            var path = context.HttpContext.Request.Path.Value ?? "";
            
            _logger.LogInformation("Request completed with error status. IP: {ClientIP}, Path: {Path}, StatusCode: {StatusCode}",
                clientIp, path, statusCode);
        }
    }

    private static bool IsSuspiciousRequest(ActionExecutingContext context)
    {
        var userAgent = context.HttpContext.Request.Headers.UserAgent.FirstOrDefault() ?? "";
        var referer = context.HttpContext.Request.Headers.Referer.FirstOrDefault() ?? "";
        var path = context.HttpContext.Request.Path.Value ?? "";

        // Check for suspicious user agents
        var suspiciousUserAgents = new[]
        {
            "sqlmap", "nikto", "nessus", "openvas", "nmap", "masscan",
            "curl", "wget", "python-requests", "libwww-perl"
        };

        if (suspiciousUserAgents.Any(agent => userAgent.Contains(agent, StringComparison.OrdinalIgnoreCase)))
        {
            return true;
        }

        // Check for suspicious paths
        var suspiciousPaths = new[]
        {
            ".env", "wp-admin", "phpmyadmin", "admin.php", "shell.php",
            "webshell", "backdoor", "config.php", "database.php"
        };

        if (suspiciousPaths.Any(suspiciousPath => path.Contains(suspiciousPath, StringComparison.OrdinalIgnoreCase)))
        {
            return true;
        }

        // Check for SQL injection patterns in query parameters
        var queryString = context.HttpContext.Request.QueryString.Value ?? "";
        var sqlInjectionPatterns = new[]
        {
            "union select", "drop table", "insert into", "delete from",
            "exec(", "execute(", "sp_", "xp_", "1=1", "1' or '1'='1"
        };

        if (sqlInjectionPatterns.Any(pattern => queryString.Contains(pattern, StringComparison.OrdinalIgnoreCase)))
        {
            return true;
        }

        // Check for XSS patterns
        var xssPatterns = new[]
        {
            "<script", "javascript:", "onload=", "onerror=", "alert(", "eval("
        };

        if (xssPatterns.Any(pattern => queryString.Contains(pattern, StringComparison.OrdinalIgnoreCase)))
        {
            return true;
        }

        return false;
    }

    private bool IsRateLimitViolation(ActionExecutingContext context, string clientIp)
    {
        // This would typically integrate with a real rate limiting service
        // For now, implement basic in-memory rate limiting
        var rateLimitKey = $"rate_limit_{clientIp}";
        
        // In a real implementation, you'd use Redis or similar
        // This is just for demonstration
        return false;
    }
}

/// <summary>
/// Content validation filter for content-specific business rules
/// </summary>
public class ContentValidationFilter : IAsyncActionFilter
{
    private readonly ILogger<ContentValidationFilter> _logger;
    private readonly IBusinessValidationService _businessValidationService;

    public ContentValidationFilter(
        ILogger<ContentValidationFilter> logger,
        IBusinessValidationService businessValidationService)
    {
        _logger = logger;
        _businessValidationService = businessValidationService;
    }

    public async Task OnActionExecutionAsync(ActionExecutingContext context, ActionExecutionDelegate next)
    {
        var actionName = context.ActionDescriptor.DisplayName?.ToLower() ?? "";
        
        // Only apply to content-related actions
        if (!IsContentAction(actionName))
        {
            await next();
            return;
        }

        var correlationId = context.HttpContext.TraceIdentifier;
        var userId = GetUserId(context.HttpContext);
        
        try
        {
            // Validate content access if user is authenticated and contentId is provided
            if (userId.HasValue && context.ActionArguments.TryGetValue("contentId", out var contentIdObj))
            {
                if (contentIdObj is string contentId)
                {
                    var validationResult = await _businessValidationService.ValidateContentAccessAsync(userId.Value, contentId);
                    
                    if (!validationResult.IsValid)
                    {
                        _logger.LogWarning("Content access validation failed for user {UserId}, content {ContentId}. CorrelationId: {CorrelationId}, Errors: {@Errors}",
                            userId.Value, contentId, correlationId, validationResult.Errors);

                        var validationErrors = new Dictionary<string, string[]>
                        {
                            ["content"] = validationResult.Errors.ToArray()
                        };

                        var errorResponse = ErrorResponseFactory.CreateValidationError(
                            correlationId, context.HttpContext.Request.Path.Value ?? "", 
                            validationErrors, context.HttpContext.TraceIdentifier);

                        context.Result = new ForbiddenObjectResult(errorResponse);
                        return;
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error occurred during content validation. CorrelationId: {CorrelationId}",
                correlationId);
            // Continue execution if validation fails
        }

        await next();
    }

    private static bool IsContentAction(string actionName)
    {
        var contentActions = new[] { "content", "movie", "tv", "series", "watch", "stream" };
        return contentActions.Any(action => actionName.Contains(action));
    }

    private static Guid? GetUserId(HttpContext httpContext)
    {
        var userIdClaim = httpContext.User?.FindFirst("sub") ?? httpContext.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        if (userIdClaim != null && Guid.TryParse(userIdClaim.Value, out var userId))
        {
            return userId;
        }
        return null;
    }
}

/// <summary>
/// Custom ObjectResult for Forbidden responses
/// </summary>
public class ForbiddenObjectResult : ObjectResult
{
    public ForbiddenObjectResult(object? value) : base(value)
    {
        StatusCode = (int)HttpStatusCode.Forbidden;
    }
}