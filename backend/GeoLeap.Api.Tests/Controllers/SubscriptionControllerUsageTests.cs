using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using System.Security.Claims;
using GeoLeap.Api.Controllers;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using Xunit;

namespace GeoLeap.Api.Tests.Controllers;

/// <summary>
/// Unit tests verifying that SubscriptionController.GetUsage returns
/// the actual SearchesUsed count from SearchHistories (B5 fix).
/// </summary>
public class SubscriptionControllerUsageTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly Mock<ISubscriptionService> _mockSubscriptionService;
    private readonly Mock<ILogger<SubscriptionController>> _mockLogger;
    private readonly SubscriptionController _controller;
    private readonly Guid _testUserId = Guid.Parse("12345678-1234-1234-1234-123456789abc");

    public SubscriptionControllerUsageTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;

        _context = new ApplicationDbContext(options);
        _mockSubscriptionService = new Mock<ISubscriptionService>();
        _mockLogger = new Mock<ILogger<SubscriptionController>>();

        _controller = new SubscriptionController(
            _mockSubscriptionService.Object,
            _mockLogger.Object,
            _context);

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, _testUserId.ToString()),
            new Claim(ClaimTypes.Email, "test@example.com"),
            new Claim(ClaimTypes.Role, "User")
        };
        var identity = new ClaimsIdentity(claims, "Test");
        _controller.ControllerContext = new ControllerContext
        {
            HttpContext = new DefaultHttpContext { User = new System.Security.Claims.ClaimsPrincipal(identity) }
        };
        _controller.ControllerContext.HttpContext.Request.Headers["X-Correlation-Id"] = Guid.NewGuid().ToString();
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    [Fact]
    public async Task GetUsage_CountsSearchesInCurrentBillingPeriod()
    {
        // Arrange — subscription with CurrentPeriodStart = 7 days ago
        var periodStart = DateTime.UtcNow.AddDays(-7);
        var subscription = new UserSubscription
        {
            UserId = _testUserId,
            Tier = SubscriptionTier.Free,
            CurrentPeriodStart = periodStart,
            CurrentPeriodEnd = DateTime.UtcNow.AddDays(23)
        };
        _mockSubscriptionService
            .Setup(s => s.GetUserSubscriptionStatusAsync(_testUserId))
            .ReturnsAsync(subscription);

        // Seed 3 searches inside the period, 1 search before the period
        _context.SearchHistories.AddRange(
            new SearchHistory { UserId = _testUserId, Query = "A", SearchedAt = periodStart.AddHours(1) },
            new SearchHistory { UserId = _testUserId, Query = "B", SearchedAt = periodStart.AddDays(2) },
            new SearchHistory { UserId = _testUserId, Query = "C", SearchedAt = DateTime.UtcNow.AddHours(-1) },
            new SearchHistory { UserId = _testUserId, Query = "OLD", SearchedAt = periodStart.AddMinutes(-1) } // before period
        );
        await _context.SaveChangesAsync();

        // Act
        var result = await _controller.GetUsage();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var usage = Assert.IsType<UsageResponse>(okResult.Value);
        Assert.Equal(3, usage.SearchesUsed);
    }

    [Fact]
    public async Task GetUsage_WhenNoSearches_ReturnsZero()
    {
        // Arrange
        _mockSubscriptionService
            .Setup(s => s.GetUserSubscriptionStatusAsync(_testUserId))
            .ReturnsAsync((UserSubscription?)null);

        // Act
        var result = await _controller.GetUsage();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var usage = Assert.IsType<UsageResponse>(okResult.Value);
        Assert.Equal(0, usage.SearchesUsed);
    }

    [Fact]
    public async Task GetUsage_PremiumUser_HasNullSearchLimit()
    {
        // Arrange
        var subscription = new UserSubscription
        {
            UserId = _testUserId,
            Tier = SubscriptionTier.Premium,
            CurrentPeriodStart = DateTime.UtcNow.AddDays(-15),
            CurrentPeriodEnd = DateTime.UtcNow.AddDays(15)
        };
        _mockSubscriptionService
            .Setup(s => s.GetUserSubscriptionStatusAsync(_testUserId))
            .ReturnsAsync(subscription);

        // Act
        var result = await _controller.GetUsage();

        // Assert
        var okResult = Assert.IsType<OkObjectResult>(result.Result);
        var usage = Assert.IsType<UsageResponse>(okResult.Value);
        Assert.Null(usage.SearchLimit); // Premium = unlimited
    }
}
