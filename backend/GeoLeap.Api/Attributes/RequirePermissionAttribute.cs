using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using Microsoft.Extensions.Logging;
using System.Security.Claims;
using GeoLeap.Api.Services;

namespace GeoLeap.Api.Attributes;

[AttributeUsage(AttributeTargets.Class | AttributeTargets.Method, AllowMultiple = true)]
public class RequirePermissionAttribute : Attribute, IAsyncAuthorizationFilter
{
    private readonly string _permission;
    private readonly string? _resource;
    private readonly string? _action;

    public RequirePermissionAttribute(string permission)
    {
        _permission = permission;
    }

    public RequirePermissionAttribute(string resource, string action)
    {
        _resource = resource;
        _action = action;
        _permission = $"{resource}:{action}";
    }

    public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
    {
        var rbacService = context.HttpContext.RequestServices.GetService<IRbacService>();
        if (rbacService == null)
        {
            var logger = context.HttpContext.RequestServices.GetService<ILogger<RequirePermissionAttribute>>();
            logger?.LogCritical(
                "IRbacService not registered in DI container. Authorization cannot proceed for permission: {Permission}",
                _permission);
            context.Result = new StatusCodeResult(500);
            return;
        }

        var userIdClaim = context.HttpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var userId))
        {
            context.Result = new UnauthorizedResult();
            return;
        }

        var hasPermission = await rbacService.HasPermissionAsync(userId, _permission);
        
        if (!hasPermission)
        {
            // Log the failed access attempt
            var resource = _resource ?? _permission.Split(':')[0];
            var action = _action ?? string.Join(":", _permission.Split(':')[1..]);
            
            await rbacService.LogAccessAttemptAsync(userId, resource, action, false, 
                "Access denied by RequirePermission attribute", 
                GetClientIpAddress(context.HttpContext), 
                GetUserAgent(context.HttpContext));
            
            context.Result = new ForbidResult();
            return;
        }

        // Log successful access
        var successResource = _resource ?? _permission.Split(':')[0];
        var successAction = _action ?? string.Join(":", _permission.Split(':')[1..]);
        
        await rbacService.LogAccessAttemptAsync(userId, successResource, successAction, true, 
            "Access granted by RequirePermission attribute", 
            GetClientIpAddress(context.HttpContext), 
            GetUserAgent(context.HttpContext));
    }

    private static string GetClientIpAddress(HttpContext context)
    {
        var ipAddress = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (string.IsNullOrEmpty(ipAddress))
        {
            ipAddress = context.Request.Headers["X-Real-IP"].FirstOrDefault();
        }
        if (string.IsNullOrEmpty(ipAddress))
        {
            ipAddress = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        }
        return ipAddress;
    }

    private static string GetUserAgent(HttpContext context)
    {
        return context.Request.Headers["User-Agent"].FirstOrDefault() ?? "unknown";
    }
}