using Hangfire.Dashboard;

namespace GeoLeap.Api.ProgrammaticSeo.Filters;

/// <summary>
/// Authorization filter for Hangfire dashboard
/// Only allows access to authenticated admin users
/// </summary>
public class HangfireDashboardAuthorizationFilter : IDashboardAuthorizationFilter
{
    public bool Authorize(DashboardContext context)
    {
        var httpContext = context.GetHttpContext();
        
        // Allow access only if user is authenticated and has admin role
        if (httpContext.User.Identity?.IsAuthenticated == true)
        {
            return httpContext.User.IsInRole("Admin") || httpContext.User.IsInRole("ContentManager");
        }
        
        // In development, allow local access
        if (IsLocalRequest(httpContext))
        {
            return true;
        }
        
        return false;
    }
    
    private bool IsLocalRequest(HttpContext context)
    {
        if (context.Request.Host.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase) ||
            context.Request.Host.Host.Equals("127.0.0.1", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }
        
        return false;
    }
}