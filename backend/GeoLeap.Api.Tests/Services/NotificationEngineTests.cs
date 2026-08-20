using GeoLeap.Api.Data;
using GeoLeap.Api.Data.Validation;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using Hangfire;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;

namespace GeoLeap.Api.Tests.Services;

public class NotificationEngineTests : IAsyncLifetime
{
    private readonly ApplicationDbContext _context;
    private readonly Mock<ILogger<NotificationEngine>> _mockLogger;
    private readonly Mock<IEmailService> _mockEmailService;
    private readonly Mock<IPushNotificationService> _mockPushService;
    private readonly Mock<ISmsService> _mockSmsService;
    private readonly Mock<INotificationPreferencesService> _mockPreferencesService;
    private readonly Mock<IBackgroundJobClient> _mockBackgroundJobClient;
    private readonly NotificationEngine _service;
    private readonly Guid _testUserId;
    private User _testUser = null!;

    public NotificationEngineTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: $"NotificationEngineTests_{Guid.NewGuid()}")
            .Options;

        _context = new ApplicationDbContext(options);
        _mockLogger = new Mock<ILogger<NotificationEngine>>();
        _mockEmailService = new Mock<IEmailService>();
        _mockPushService = new Mock<IPushNotificationService>();
        _mockSmsService = new Mock<ISmsService>();
        _mockPreferencesService = new Mock<INotificationPreferencesService>();
        _mockBackgroundJobClient = new Mock<IBackgroundJobClient>();

        _service = new NotificationEngine(
            _mockLogger.Object,
            _context,
            _mockEmailService.Object,
            _mockPushService.Object,
            _mockSmsService.Object,
            _mockPreferencesService.Object,
            _mockBackgroundJobClient.Object
        );

        _testUserId = Guid.NewGuid();

        // Setup default preferences service behavior - allow notifications
        _mockPreferencesService
            .Setup(ps => ps.CanSendNotificationAsync(
                It.IsAny<Guid>(),
                It.IsAny<string>(),
                It.IsAny<List<string>?>()))
            .ReturnsAsync(true);

        // Setup background job client to return a job ID without executing
        _mockBackgroundJobClient
            .Setup(x => x.Create(It.IsAny<Hangfire.Common.Job>(), It.IsAny<Hangfire.States.IState>()))
            .Returns("fake-job-id");
    }

    public async Task InitializeAsync()
    {
        // Create test user
        _testUser = new User
        {
            Id = _testUserId,
            Email = "test@example.com",
            UserName = "testuser",
            EmailConfirmed = true,
            FirstName = "Test",
            LastName = "User",
            CreatedAt = DateTime.UtcNow
        };

        _context.Users.Add(_testUser);
        await _context.SaveChangesAsync();
    }

    public async Task DisposeAsync()
    {
        await _context.Database.EnsureDeletedAsync();
        await _context.DisposeAsync();
    }

    #region Core Notification Sending Tests

    [Fact]
    public async Task SendNotificationAsync_ValidRequest_CreatesNotification()
    {
        // Arrange
        var request = new NotificationRequest
        {
            UserId = _testUserId,
            Type = "general",
            Priority = "high",
            Title = "Test Notification",
            Message = "This is a test message",
            ActionUrl = "https://example.com/action"
        };

        // Act
        var result = await _service.SendNotificationAsync(request, "test-correlation-id");

        // Assert
        Assert.NotEqual(Guid.Empty, result);

        // Verify notification was created in database
        var notification = await _context.Notifications.FindAsync(result);
        Assert.NotNull(notification);
        Assert.Equal(_testUserId, notification.UserId);
        Assert.Equal("Test Notification", notification.Title);
        Assert.Equal("This is a test message", notification.Message);
        Assert.Equal("pending", notification.Status);
    }

    [Fact]
    public async Task SendNotificationAsync_InvalidRequest_ThrowsException()
    {
        // Arrange - Create request that will fail validation
        var request = new NotificationRequest
        {
            UserId = Guid.NewGuid(), // Non-existent user
            Type = "", // Empty type
            Title = "",
            Message = ""
        };

        // Setup validation to fail
        var validationResult = new NotificationValidationResult
        {
            IsValid = false,
            Errors = new List<NotificationValidationError>
            {
                new() { Field = "Type", Message = "Type is required" }
            }
        };

        // We can't directly control ValidateNotificationAsync, so we expect it to fail
        // Act & Assert
        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            _service.SendNotificationAsync(request));
    }

    [Fact]
    public async Task SendNotificationAsync_UserPreferencesBlock_ReturnsEmpty()
    {
        // Arrange
        var request = new NotificationRequest
        {
            UserId = _testUserId,
            Type = "marketing",
            Title = "Marketing Message",
            Message = "Special offer!",
            Channels = new List<string> { "email" }
        };

        // Setup preferences service to block this notification
        _mockPreferencesService
            .Setup(ps => ps.CanSendNotificationAsync(_testUserId, "marketing", It.IsAny<List<string>?>()))
            .ReturnsAsync(false);

        // Act
        var result = await _service.SendNotificationAsync(request);

        // Assert
        Assert.Equal(Guid.Empty, result);

        // Verify no notification was created
        var notifications = await _context.Notifications
            .Where(n => n.UserId == _testUserId)
            .ToListAsync();
        Assert.Empty(notifications);
    }

    [Fact]
    public async Task SendBulkNotificationAsync_MultipleRequests_ProcessesAll()
    {
        // Arrange
        var user2 = Guid.NewGuid();
        var user3 = Guid.NewGuid();

        // Add additional users
        _context.Users.AddRange(
            new User { Id = user2, Email = "user2@example.com", UserName = "user2", EmailConfirmed = true, CreatedAt = DateTime.UtcNow },
            new User { Id = user3, Email = "user3@example.com", UserName = "user3", EmailConfirmed = true, CreatedAt = DateTime.UtcNow }
        );
        await _context.SaveChangesAsync();

        var requests = new List<NotificationRequest>
        {
            new() { UserId = _testUserId, Type = "general", Title = "Notification 1", Message = "Message 1" },
            new() { UserId = user2, Type = "general", Title = "Notification 2", Message = "Message 2" },
            new() { UserId = user3, Type = "general", Title = "Notification 3", Message = "Message 3" }
        };

        // Act
        var results = await _service.SendBulkNotificationAsync(requests, "bulk-correlation-id");

        // Assert
        Assert.Equal(3, results.Count);
        Assert.All(results, id => Assert.NotEqual(Guid.Empty, id));

        // Verify all notifications were created
        var notifications = await _context.Notifications.ToListAsync();
        Assert.Equal(3, notifications.Count);
    }

    [Fact]
    public async Task ScheduleNotificationAsync_FutureDate_SchedulesCorrectly()
    {
        // Arrange
        var scheduledFor = DateTime.UtcNow.AddHours(2);
        var request = new NotificationRequest
        {
            UserId = _testUserId,
            Type = "reminder",
            Title = "Scheduled Reminder",
            Message = "This is scheduled for later"
        };

        // Act
        var result = await _service.ScheduleNotificationAsync(request, scheduledFor, "schedule-correlation-id");

        // Assert
        Assert.NotEqual(Guid.Empty, result);

        // Verify notification has correct scheduled time
        var notification = await _context.Notifications.FindAsync(result);
        Assert.NotNull(notification);
        Assert.NotNull(notification.ScheduledFor);
        Assert.Equal(scheduledFor, notification.ScheduledFor.Value, TimeSpan.FromSeconds(1));
    }

    #endregion

    #region Channel-Specific Tests

    [Fact]
    public async Task SendEmailNotificationAsync_ValidNotification_SendsEmail()
    {
        // Arrange
        var notification = new Notification
        {
            Id = Guid.NewGuid(),
            UserId = _testUserId,
            Type = "general",
            Title = "Email Test",
            Message = "Test email message",
            Status = "pending"
        };
        _context.Notifications.Add(notification);
        await _context.SaveChangesAsync();

        _mockEmailService
            .Setup(es => es.SendAsync(
                _testUser.Email!,
                notification.Title,
                notification.Message,
                It.IsAny<Dictionary<string, object>?>()))
            .ReturnsAsync(true);

        // Act
        var result = await _service.SendEmailNotificationAsync(notification.Id, "email-correlation-id");

        // Assert
        Assert.True(result);

        // Verify email service was called
        _mockEmailService.Verify(
            es => es.SendAsync(
                _testUser.Email!,
                notification.Title,
                notification.Message,
                It.IsAny<Dictionary<string, object>?>()),
            Times.Once);
    }

    [Fact]
    public async Task SendEmailNotificationAsync_EmailFails_ReturnsFalse()
    {
        // Arrange
        var notification = new Notification
        {
            Id = Guid.NewGuid(),
            UserId = _testUserId,
            Type = "general",
            Title = "Email Test",
            Message = "Test message",
            Status = "pending"
        };
        _context.Notifications.Add(notification);
        await _context.SaveChangesAsync();

        _mockEmailService
            .Setup(es => es.SendAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<Dictionary<string, object>?>()))
            .ThrowsAsync(new Exception("Email service failed"));

        // Act
        var result = await _service.SendEmailNotificationAsync(notification.Id);

        // Assert - Should return false when email service throws exception
        Assert.False(result);
    }

    [Fact]
    public async Task SendPushNotificationAsync_ValidNotification_SendsPush()
    {
        // Arrange
        var notification = new Notification
        {
            Id = Guid.NewGuid(),
            UserId = _testUserId,
            Type = "alert",
            Title = "Push Test",
            Message = "Test push message",
            Status = "pending",
            ActionUrl = "app://content/123"
        };
        _context.Notifications.Add(notification);
        await _context.SaveChangesAsync();

        _mockPushService
            .Setup(ps => ps.SendPushNotificationAsync(
                _testUserId,
                notification.Title,
                notification.Message,
                notification.Type,
                It.IsAny<Dictionary<string, object>?>()))
            .ReturnsAsync(true);

        // Act
        var result = await _service.SendPushNotificationAsync(notification.Id, "push-correlation-id");

        // Assert
        Assert.True(result);

        // Verify push service was called with 5 parameters (userId, title, message, category, data)
        _mockPushService.Verify(
            ps => ps.SendPushNotificationAsync(
                _testUserId,
                notification.Title,
                notification.Message,
                notification.Type,
                It.IsAny<Dictionary<string, object>?>()),
            Times.Once);
    }

    [Fact]
    public async Task SendSmsNotificationAsync_ValidNotification_SendsSms()
    {
        // Arrange
        _testUser.PhoneNumber = "+1234567890";
        _testUser.PhoneNumberConfirmed = true;
        await _context.SaveChangesAsync();

        var notification = new Notification
        {
            Id = Guid.NewGuid(),
            UserId = _testUserId,
            Type = "urgent",
            Title = "SMS Test",
            Message = "Urgent SMS notification",
            Status = "pending"
        };
        _context.Notifications.Add(notification);
        await _context.SaveChangesAsync();

        _mockSmsService
            .Setup(ss => ss.SendSmsAsync("+1234567890", It.IsAny<string>()))
            .ReturnsAsync(true);

        // Act
        var result = await _service.SendSmsNotificationAsync(notification.Id, "sms-correlation-id");

        // Assert
        Assert.True(result);

        // Verify SMS service was called
        _mockSmsService.Verify(
            ss => ss.SendSmsAsync("+1234567890", It.IsAny<string>()),
            Times.Once);
    }

    [Fact]
    public async Task SendSmsNotificationAsync_NoPhoneNumber_ReturnsFalse()
    {
        // Arrange
        var notification = new Notification
        {
            Id = Guid.NewGuid(),
            UserId = _testUserId,
            Type = "general",
            Title = "SMS Test",
            Message = "Test",
            Status = "pending"
        };
        _context.Notifications.Add(notification);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.SendSmsNotificationAsync(notification.Id);

        // Assert
        Assert.False(result);

        // Verify SMS service was NOT called
        _mockSmsService.Verify(
            ss => ss.SendSmsAsync(It.IsAny<string>(), It.IsAny<string>()),
            Times.Never);
    }

    #endregion

    #region Template Management Tests

    [Fact]
    public async Task CreateTemplateAsync_ValidTemplate_CreatesSuccessfully()
    {
        // Arrange
        var template = new GeoLeap.Api.Models.NotificationTemplate
        {
            Id = "welcome-email",
            Type = "email",
            Channel = "email",
            Subject = "Welcome to {{appName}}!",
            Template = "Hello {{userName}}, welcome to our platform!",
            Language = "en",
            IsActive = true
        };

        // Act
        var result = await _service.CreateTemplateAsync(template, "template-correlation-id");

        // Assert
        Assert.True(result);

        // Verify template was created in database
        var dbTemplate = await _context.NotificationTemplates
            .FirstOrDefaultAsync(t => t.Id == "welcome-email");
        Assert.NotNull(dbTemplate);
        Assert.Equal("welcome-email", dbTemplate.Id);
        Assert.Equal("email", dbTemplate.Type);
        Assert.True(dbTemplate.IsActive);
    }

    [Fact]
    public async Task GetTemplateAsync_ExistingTemplate_ReturnsTemplate()
    {
        // Arrange
        var template = new GeoLeap.Api.Models.NotificationTemplate
        {
            Id = "test-template",
            Type = "push",
            Channel = "push",
            Subject = "Test Subject",
            Template = "Test Content",
            IsActive = true
        };
        _context.NotificationTemplates.Add(template);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetTemplateAsync("test-template", "get-template-correlation-id");

        // Assert
        Assert.NotNull(result);
        Assert.Equal("test-template", result.Id);
        Assert.Equal("push", result.Type);
    }

    [Fact]
    public async Task GetTemplateAsync_NonExistent_ReturnsNull()
    {
        // Act
        var result = await _service.GetTemplateAsync("non-existent-template");

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task SendFromTemplateAsync_ValidTemplate_CreatesNotification()
    {
        // Arrange
        var template = new GeoLeap.Api.Models.NotificationTemplate
        {
            Id = "promo-email",
            Type = "email",
            Channel = "email",
            Subject = "Special Offer for {{userName}}",
            Template = "Hi {{userName}}, check out our {{discount}}% discount!",
            IsActive = true
        };
        _context.NotificationTemplates.Add(template);
        await _context.SaveChangesAsync();

        var templateData = new Dictionary<string, object>
        {
            { "userName", "Test" },
            { "discount", "20" }
        };

        // Act
        var result = await _service.SendFromTemplateAsync("promo-email", _testUserId, templateData, "template-send-correlation-id");

        // Assert
        Assert.NotEqual(Guid.Empty, result);

        // Verify notification was created
        var notification = await _context.Notifications.FindAsync(result);
        Assert.NotNull(notification);
        Assert.Equal(_testUserId, notification.UserId);
    }

    #endregion

    #region User Interaction Tests

    [Fact]
    public async Task MarkAsReadAsync_ValidNotification_MarksAsRead()
    {
        // Arrange
        var notification = new Notification
        {
            Id = Guid.NewGuid(),
            UserId = _testUserId,
            Type = "general",
            Title = "Test",
            Message = "Test message",
            Status = "delivered"
        };
        _context.Notifications.Add(notification);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.MarkAsReadAsync(notification.Id, "read-correlation-id");

        // Assert
        Assert.True(result);

        // Verify notification was marked as read
        await _context.Entry(notification).ReloadAsync();
        Assert.True(notification.IsRead); // Computed property based on ReadAt
        Assert.NotNull(notification.ReadAt);
        Assert.Equal("read", notification.Status);
    }

    [Fact]
    public async Task MarkAsClickedAsync_ValidNotification_TracksInteraction()
    {
        // Arrange
        var notification = new Notification
        {
            Id = Guid.NewGuid(),
            UserId = _testUserId,
            Type = "general",
            Title = "Test",
            Message = "Test message",
            Status = "delivered",
            ActionUrl = "https://example.com"
        };
        _context.Notifications.Add(notification);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.MarkAsClickedAsync(notification.Id, "https://example.com", "click-correlation-id");

        // Assert
        Assert.True(result);

        // MarkAsClickedAsync tracks the interaction via TrackInteractionAsync
        // Verify the method returned successfully (interaction tracking is internal)
    }

    [Fact]
    public async Task MarkAsReadAsync_NonExistentNotification_ReturnsFalse()
    {
        // Act
        var result = await _service.MarkAsReadAsync(Guid.NewGuid());

        // Assert
        Assert.False(result);
    }

    #endregion

    #region Validation Tests

    [Fact]
    public async Task ValidateNotificationAsync_ValidRequest_ReturnsValid()
    {
        // Arrange
        var request = new NotificationRequest
        {
            UserId = _testUserId,
            Type = "general",
            Priority = "medium",
            Title = "Valid Notification",
            Message = "This is a valid notification message"
        };

        // Act
        var result = await _service.ValidateNotificationAsync(request, "validation-correlation-id");

        // Assert
        Assert.NotNull(result);
        Assert.True(result.IsValid);
        Assert.Empty(result.Errors);
    }

    [Fact]
    public async Task ValidateNotificationAsync_MissingTitle_ReturnsInvalid()
    {
        // Arrange
        var request = new NotificationRequest
        {
            UserId = _testUserId,
            Type = "general",
            Title = "", // Missing title
            Message = "Test message"
        };

        // Act
        var result = await _service.ValidateNotificationAsync(request);

        // Assert
        Assert.NotNull(result);
        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.Field == "Title");
    }

    [Fact]
    public async Task ValidateNotificationAsync_MissingMessage_ReturnsInvalid()
    {
        // Arrange
        var request = new NotificationRequest
        {
            UserId = _testUserId,
            Type = "general",
            Title = "Test Title",
            Message = "" // Missing message
        };

        // Act
        var result = await _service.ValidateNotificationAsync(request);

        // Assert
        Assert.NotNull(result);
        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.Field == "Message");
    }

    [Fact]
    public async Task ValidateNotificationAsync_NonExistentUser_ReturnsInvalid()
    {
        // Arrange
        var request = new NotificationRequest
        {
            UserId = Guid.NewGuid(), // Non-existent user
            Type = "general",
            Title = "Test",
            Message = "Test message"
        };

        // Act
        var result = await _service.ValidateNotificationAsync(request);

        // Assert
        Assert.NotNull(result);
        Assert.False(result.IsValid);
        Assert.Contains(result.Errors, e => e.Field == "UserId");
    }

    #endregion
}
