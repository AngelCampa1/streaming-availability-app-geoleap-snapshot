using System;
using System.Threading.Tasks;
using GeoLeap.Api.Middleware;
using GeoLeap.Api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Xunit;

namespace GeoLeap.Api.Tests.Middleware;

/// <summary>
/// Regression guard for the public allow-list in <see cref="AuthorizationMiddleware"/>.
///
/// Every endpoint on <c>ContentController</c> (routed at <c>/api/content</c>) is decorated
/// <c>[AllowAnonymous]</c>, because content detail pages are server-rendered for logged-out
/// visitors (deep links from notifications and social shares, plus the anime route). The
/// custom RBAC <see cref="AuthorizationMiddleware"/> runs ahead of MVC authorization, so any
/// path it does not treat as public is hard-blocked with a 401 regardless of the controller
/// attribute. When <c>/api/content</c> was missing from the allow-list, anonymous SSR fetches
/// received 401 -> the frontend treated that as an error and rendered notFound() -> the exact
/// content deep-link 404s the feature set out to eliminate.
/// </summary>
public class AuthorizationMiddlewarePublicContentTests
{
    private static AuthorizationMiddleware CreateMiddleware(out RequestProbe probe)
    {
        var capturedProbe = new RequestProbe();
        probe = capturedProbe;

        return new AuthorizationMiddleware(
            next: context =>
            {
                capturedProbe.NextInvoked = true;
                return Task.CompletedTask;
            },
            logger: NullLogger<AuthorizationMiddleware>.Instance);
    }

    private static DefaultHttpContext CreateAnonymousRequest(string path, string method)
    {
        var context = new DefaultHttpContext();
        context.Request.Path = path;
        context.Request.Method = method;
        return context;
    }

    [Theory]
    [InlineData("/api/content/movie/039b0dbb-8d05-425a-b4e3-43c956353a6e")]
    [InlineData("/api/content/series/039b0dbb-8d05-425a-b4e3-43c956353a6e")]
    [InlineData("/api/content/anime/039b0dbb-8d05-425a-b4e3-43c956353a6e")]
    [InlineData("/api/content/slug/series/the-office")]
    [InlineData("/api/content/popular")]
    public async Task AnonymousContentRequest_IsAllowedThrough(string path)
    {
        var middleware = CreateMiddleware(out var probe);
        var context = CreateAnonymousRequest(path, "GET");
        var rbac = new Mock<IRbacService>(MockBehavior.Strict);

        await middleware.InvokeAsync(context, rbac.Object);

        Assert.True(probe.NextInvoked, "Anonymous content reads must pass through the RBAC allow-list.");
        Assert.NotEqual(StatusCodes.Status401Unauthorized, context.Response.StatusCode);
    }

    [Fact]
    public async Task AnonymousNonPublicRequest_IsBlockedWith401()
    {
        // Control: a route that is genuinely not public must still be blocked when the caller
        // is unauthenticated, proving the allow-list is selective rather than open.
        var middleware = CreateMiddleware(out var probe);
        var context = CreateAnonymousRequest("/api/watchlist", "GET");
        var rbac = new Mock<IRbacService>(MockBehavior.Strict);

        await middleware.InvokeAsync(context, rbac.Object);

        Assert.False(probe.NextInvoked, "A non-public route must not reach the next middleware when unauthenticated.");
        Assert.Equal(StatusCodes.Status401Unauthorized, context.Response.StatusCode);
    }

    private sealed class RequestProbe
    {
        public bool NextInvoked { get; set; }
    }
}
