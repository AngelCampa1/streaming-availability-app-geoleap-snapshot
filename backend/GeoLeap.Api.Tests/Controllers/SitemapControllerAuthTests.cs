using System.Reflection;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Moq;
using GeoLeap.Api.Controllers;
using GeoLeap.Api.Services;
using Xunit;

namespace GeoLeap.Api.Tests.Controllers;

/// <summary>
/// Tests verifying admin sitemap endpoints require [Authorize(Roles = "Admin")].
/// Attribute presence guarantees the framework enforces auth; integration tests
/// verify runtime 401/403 behaviour.
/// </summary>
public class SitemapControllerAuthTests
{
    private static MethodInfo GetMethod(string name)
    {
        var method = typeof(SitemapController).GetMethod(name);
        Assert.True(method != null, $"Method {name} not found on SitemapController");
        return method!;
    }

    private static AuthorizeAttribute? GetAdminAuthorize(MethodInfo method)
        => method.GetCustomAttributes<AuthorizeAttribute>()
                 .FirstOrDefault(a => a.Roles?.Contains("Admin") == true);

    [Theory]
    [InlineData("GetSitemapStatsAsync")]
    [InlineData("UpdateSitemapEntriesAsync")]
    [InlineData("SubmitSitemapAsync")]
    [InlineData("ValidateSitemapAsync")]
    public void AdminSitemapEndpoints_HaveAuthorizeAdminRoleAttribute(string methodName)
    {
        var method = GetMethod(methodName);
        var attr = GetAdminAuthorize(method);

        Assert.True(attr != null,
            $"{methodName} must have [Authorize(Roles = \"Admin\")] but none was found.");
    }

    [Theory]
    [InlineData("GetSitemapAsync")]
    [InlineData("GetSitemapIndexAsync")]
    [InlineData("GetRobotsTxtAsync")]
    [InlineData("GetImageSitemapAsync")]
    [InlineData("GetNewsSitemapAsync")]
    public void PublicSitemapEndpoints_DoNotHaveAdminRoleRestriction(string methodName)
    {
        var method = GetMethod(methodName);
        var attr = GetAdminAuthorize(method);

        Assert.True(attr == null,
            $"{methodName} should NOT have [Authorize(Roles = \"Admin\")] - it is a public endpoint.");
    }

    [Fact]
    public async Task GetSitemapStatsAsync_WhenAuthenticated_ReturnsOk()
    {
        // Arrange
        var mockService = new Mock<ISitemapService>();
        mockService.Setup(s => s.GetSitemapStatsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new SitemapStats());

        var mockLogger = new Mock<ILogger<SitemapController>>();
        var controller = new SitemapController(mockService.Object, mockLogger.Object);
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext()
        };

        // Act
        var result = await controller.GetSitemapStatsAsync();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.NotNull(okResult.Value);
    }

    [Fact]
    public async Task UpdateSitemapEntriesAsync_WhenAuthenticated_ReturnsOk()
    {
        // Arrange
        var mockService = new Mock<ISitemapService>();
        mockService.Setup(s => s.UpdateSitemapEntriesAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(42);

        var mockLogger = new Mock<ILogger<SitemapController>>();
        var controller = new SitemapController(mockService.Object, mockLogger.Object);
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext()
        };

        // Act
        var result = await controller.UpdateSitemapEntriesAsync();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(42, okResult.Value);
    }

    [Fact]
    public async Task SubmitSitemapAsync_WhenAuthenticated_ReturnsOk()
    {
        // Arrange
        var mockService = new Mock<ISitemapService>();
        mockService.Setup(s => s.SubmitSitemapAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var mockLogger = new Mock<ILogger<SitemapController>>();
        var controller = new SitemapController(mockService.Object, mockLogger.Object);
        var httpContext = new DefaultHttpContext();
        httpContext.Request.Scheme = "https";
        httpContext.Request.Host = new HostString("api.geoleap.app");
        controller.ControllerContext = new ControllerContext { HttpContext = httpContext };

        // Act
        var result = await controller.SubmitSitemapAsync();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(true, okResult.Value);
    }

    [Fact]
    public async Task ValidateSitemapAsync_WhenAuthenticated_ReturnsOk()
    {
        // Arrange
        var xmlContent = "<urlset />";
        var mockService = new Mock<ISitemapService>();
        mockService.Setup(s => s.ValidateSitemapAsync(xmlContent, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new SitemapValidationResult { IsValid = true });

        var mockLogger = new Mock<ILogger<SitemapController>>();
        var controller = new SitemapController(mockService.Object, mockLogger.Object);
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext()
        };

        // Act
        var result = await controller.ValidateSitemapAsync(xmlContent);

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        Assert.NotNull(okResult.Value);
    }
}
