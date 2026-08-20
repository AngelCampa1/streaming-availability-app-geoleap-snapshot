using Xunit;
using Moq;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;

namespace GeoLeap.Api.Tests.Services;

/// <summary>
/// Direct tests for DunningService - Phase 2.3
/// Tests dunning campaigns, notifications, and payment recovery workflows
/// </summary>
public class DunningServiceDirectTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly Mock<ILogger<DunningService>> _mockLogger;
    private readonly Mock<IEmailService> _mockEmailService;
    private readonly Mock<ISmsService> _mockSmsService;
    private readonly Mock<IPushNotificationService> _mockPushNotificationService;
    private readonly DunningService _service;
    private readonly Guid _testUserId = Guid.NewGuid();
    private readonly Guid _testCampaignId = Guid.NewGuid();

    public DunningServiceDirectTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: $"TestDb_{Guid.NewGuid()}")
            .Options;

        _context = new ApplicationDbContext(options);
        _mockLogger = new Mock<ILogger<DunningService>>();
        _mockEmailService = new Mock<IEmailService>();
        _mockSmsService = new Mock<ISmsService>();
        _mockPushNotificationService = new Mock<IPushNotificationService>();

        _service = new DunningService(
            _context,
            _mockLogger.Object,
            _mockEmailService.Object,
            _mockSmsService.Object,
            _mockPushNotificationService.Object);

        SeedTestData().Wait();
    }

    private async Task SeedTestData()
    {
        // Seed test user
        var testUser = new User
        {
            Id = _testUserId,
            UserName = "testuser@example.com",
            Email = "testuser@example.com",
            EmailConfirmed = true
        };
        _context.Users.Add(testUser);
        await _context.SaveChangesAsync();
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    // Campaign Creation Tests
    [Fact]
    public async Task CreateCampaignAsync_WithValidRequest_CreatesCampaign()
    {
        // Arrange
        var request = new CreateDunningCampaignRequest
        {
            Name = "Test Campaign",
            Description = "Test dunning campaign",
            TriggerType = "failed_payment",
            CustomerSegment = "all",
            DelayAfterTrigger = TimeSpan.FromHours(1),
            SequenceInterval = TimeSpan.FromDays(1),
            MaxExecutions = 3,
            Steps = new List<CreateDunningStepRequest>
            {
                new CreateDunningStepRequest
                {
                    Name = "First Reminder",
                    NotificationType = "email",
                    Subject = "Payment Failed",
                    MessageTemplate = "Your payment failed. Please update.",
                    DelayFromPrevious = TimeSpan.Zero,
                    UrgencyLevel = "low"
                }
            }
        };

        // Act
        var result = await _service.CreateCampaignAsync(request, "test-user", "test-correlation-id");

        // Assert
        Assert.NotNull(result);
        Assert.Equal("Test Campaign", result.Name);
        Assert.Equal("failed_payment", result.TriggerType);
        Assert.Equal(1, result.StepCount);
    }

    [Fact]
    public async Task GetActiveCampaignsAsync_WithNoCampaigns_ReturnsEmptyList()
    {
        // Act
        var result = await _service.GetActiveCampaignsAsync();

        // Assert
        Assert.NotNull(result);
        Assert.Empty(result);
    }

    [Fact]
    public async Task GetCampaignAsync_WithInvalidId_ReturnsNull()
    {
        // Arrange
        var invalidId = Guid.NewGuid();

        // Act
        var result = await _service.GetCampaignAsync(invalidId);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task GetCampaignsForSegmentAsync_WithNoMatchingCampaigns_ReturnsEmptyList()
    {
        // Act
        var result = await _service.GetCampaignsForSegmentAsync("premium", "failed_payment");

        // Assert
        Assert.NotNull(result);
        Assert.Empty(result);
    }

    // Customer Segment Tests
    [Fact]
    public async Task DetermineCustomerSegmentAsync_WithInvalidUserId_ReturnsDefault()
    {
        // Arrange
        var invalidUserId = Guid.NewGuid();

        // Act
        var result = await _service.DetermineCustomerSegmentAsync(invalidUserId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal("unknown", result); // Returns "unknown" for non-existent users
    }

    [Fact]
    public async Task DetermineCustomerSegmentAsync_WithValidUser_DeterminesSegment()
    {
        // Act
        var result = await _service.DetermineCustomerSegmentAsync(_testUserId);

        // Assert
        Assert.NotNull(result);
        Assert.Contains(result, new[] { "free", "premium", "vip", "new" });
    }

    // Template Processing Tests
    [Fact]
    public async Task ProcessMessageTemplateAsync_WithSimpleTemplate_ProcessesCorrectly()
    {
        // Arrange
        var template = "Hello {{user_name}}, your payment has failed.";
        var failedPaymentId = Guid.NewGuid();

        // Act
        var result = await _service.ProcessMessageTemplateAsync(template, _testUserId, failedPaymentId);

        // Assert
        Assert.NotNull(result);
        Assert.Contains("Hello", result);
    }

    [Fact]
    public async Task ProcessSubjectTemplateAsync_WithSimpleTemplate_ProcessesCorrectly()
    {
        // Arrange
        var template = "Payment Failed - {{user_name}}";
        var failedPaymentId = Guid.NewGuid();

        // Act
        var result = await _service.ProcessSubjectTemplateAsync(template, _testUserId, failedPaymentId);

        // Assert
        Assert.NotNull(result);
        Assert.Contains("Payment Failed", result);
    }

    // Campaign Trigger Tests
    [Fact]
    public async Task TriggerDunningCampaignAsync_WithInvalidFailedPaymentId_ThrowsArgumentException()
    {
        // Arrange
        var invalidId = Guid.NewGuid();

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(() =>
            _service.TriggerDunningCampaignAsync(invalidId, "test-correlation-id"));
    }

    // Campaign Processing Tests
    [Fact]
    public async Task ProcessDunningCampaignExecutionsAsync_WithNoExecutions_CompletesSuccessfully()
    {
        // Act & Assert - Should not throw
        await _service.ProcessDunningCampaignExecutionsAsync();
    }

    // Analytics Tests
    [Fact]
    public async Task GetCampaignPerformanceAsync_WithInvalidCampaignId_ReturnsEmptyMetrics()
    {
        // Arrange
        var invalidId = Guid.NewGuid();
        var startDate = DateTime.UtcNow.AddDays(-30);
        var endDate = DateTime.UtcNow;

        // Act
        var result = await _service.GetCampaignPerformanceAsync(invalidId, startDate, endDate);

        // Assert
        Assert.NotNull(result);
        Assert.Contains("campaign_id", result.Keys);
    }

    [Fact]
    public async Task GetDunningOverviewAnalyticsAsync_WithNoData_ReturnsZeroMetrics()
    {
        // Arrange
        var startDate = DateTime.UtcNow.AddDays(-30);
        var endDate = DateTime.UtcNow;

        // Act
        var result = await _service.GetDunningOverviewAnalyticsAsync(startDate, endDate);

        // Assert
        Assert.NotNull(result);
        Assert.Contains("period", result.Keys);
        Assert.Contains("failed_payments", result.Keys);
    }

    [Fact]
    public async Task LogDunningAnalyticsAsync_WithValidData_CompletesSuccessfully()
    {
        // Act & Assert - Should not throw
        await _service.LogDunningAnalyticsAsync(
            eventType: "campaign_triggered",
            campaignId: _testCampaignId,
            stepId: null,
            userId: _testUserId,
            wasSuccessful: true,
            correlationId: "test-correlation-id",
            metadata: new Dictionary<string, object> { { "test", "data" } });
    }

    // Campaign Management Tests
    [Fact]
    public async Task UpdateCampaignAsync_WithInvalidCampaignId_ThrowsArgumentException()
    {
        // Arrange
        var invalidId = Guid.NewGuid();
        var request = new CreateDunningCampaignRequest
        {
            Name = "Updated Campaign",
            TriggerType = "failed_payment",
            CustomerSegment = "all",
            DelayAfterTrigger = TimeSpan.FromHours(1),
            SequenceInterval = TimeSpan.FromDays(1),
            MaxExecutions = 3,
            Steps = new List<CreateDunningStepRequest>()
        };

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(() =>
            _service.UpdateCampaignAsync(invalidId, request, "test-user", "test-correlation-id"));
    }

    [Fact]
    public async Task DeleteCampaignAsync_WithInvalidCampaignId_ReturnsFalse()
    {
        // Arrange
        var invalidId = Guid.NewGuid();

        // Act
        var result = await _service.DeleteCampaignAsync(invalidId, "test-user", "test-correlation-id");

        // Assert
        Assert.False(result);
    }

    // Notification Processing Tests
    [Fact]
    public async Task ProcessFailedNotificationsAsync_WithNoFailedNotifications_CompletesSuccessfully()
    {
        // Act & Assert - Should not throw
        await _service.ProcessFailedNotificationsAsync();
    }

    [Fact]
    public async Task RetryFailedNotificationAsync_WithInvalidNotificationId_ReturnsFalse()
    {
        // Arrange
        var invalidId = Guid.NewGuid();

        // Act
        var result = await _service.RetryFailedNotificationAsync(invalidId, "test-correlation-id");

        // Assert
        Assert.False(result);
    }
}
