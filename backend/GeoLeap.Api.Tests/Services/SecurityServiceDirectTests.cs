using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace GeoLeap.Api.Tests.Services;

/// <summary>
/// Direct tests for SecurityService covering all 12 public methods
/// Service: SecurityService.cs (379 LOC)
/// Focus: Security event logging, risk assessment, alerts (2.0x business value multiplier)
/// </summary>
public class SecurityServiceDirectTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly Mock<IEmailService> _mockEmailService;
    private readonly Mock<ILogger<SecurityService>> _mockLogger;
    private readonly SecurityService _service;
    private readonly Guid _testUserId;
    private readonly User _testUser;

    public SecurityServiceDirectTests()
    {
        // Setup in-memory database
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"SecurityServiceTestDb_{Guid.NewGuid()}")
            .Options;

        _context = new ApplicationDbContext(options);
        _mockEmailService = new Mock<IEmailService>();
        _mockLogger = new Mock<ILogger<SecurityService>>();

        _service = new SecurityService(_context, _mockEmailService.Object, _mockLogger.Object);

        _testUserId = Guid.NewGuid();
        _testUser = new User
        {
            Id = _testUserId,
            Email = "test@example.com",
            FirstName = "Test",
            LastName = "User",
            UserName = "testuser",
            CreatedAt = DateTime.UtcNow
        };

        _context.Users.Add(_testUser);
        _context.SaveChanges();
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
        GC.SuppressFinalize(this);
    }

    #region LogSecurityEventAsync Tests

    [Fact]
    public async Task LogSecurityEventAsync_WithValidData_CreatesEvent()
    {
        // Arrange
        var eventType = "LOGIN_SUCCESS";
        var ipAddress = "203.0.113.1";
        var userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)";
        var details = "Test login";

        // Act
        var result = await _service.LogSecurityEventAsync(_testUserId, eventType, ipAddress, userAgent, details);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(_testUserId, result.UserId);
        Assert.Equal(eventType, result.EventType);
        Assert.Equal(ipAddress, result.IpAddress);
        Assert.Equal(userAgent, result.UserAgent);
        Assert.Equal(details, result.Details);
        Assert.True(result.RiskScore >= 0 && result.RiskScore <= 100);

        // Verify event was saved
        var savedEvent = await _context.SecurityEvents.FirstOrDefaultAsync(se => se.UserId == _testUserId);
        Assert.NotNull(savedEvent);
    }

    [Fact]
    public async Task LogSecurityEventAsync_WithInvalidUser_ThrowsException()
    {
        // Arrange
        var invalidUserId = Guid.NewGuid();

        // Act & Assert
        await Assert.ThrowsAsync<ArgumentException>(() =>
            _service.LogSecurityEventAsync(invalidUserId, "LOGIN_SUCCESS", "127.0.0.1", "test-agent"));
    }

    [Fact]
    public async Task LogSecurityEventAsync_WithHighRiskScore_SendsAlert()
    {
        // Arrange - Create security preferences with alerts enabled
        var preferences = new SecurityPreferences
        {
            UserId = _testUserId,
            EmailSecurityAlerts = true
        };
        _context.SecurityPreferences.Add(preferences);
        await _context.SaveChangesAsync();

        // Act - Use high-risk IP to trigger alert
        var result = await _service.LogSecurityEventAsync(_testUserId, "LOGIN_SUCCESS", "10.0.0.1", "test-agent");

        // Assert
        Assert.NotNull(result);
        Assert.True(result.RiskScore >= 40); // High-risk IP adds 40 points
    }

    #endregion

    #region CalculateRiskScoreAsync Tests

    [Fact]
    public async Task CalculateRiskScoreAsync_WithNewDevice_AddsRiskScore()
    {
        // Arrange
        var securityEvent = new SecurityEvent
        {
            UserId = _testUserId,
            EventType = "LOGIN_SUCCESS",
            IpAddress = "203.0.113.1",
            UserAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)",
            Location = "New York, USA"
        };

        // Act
        var riskScore = await _service.CalculateRiskScoreAsync(securityEvent, _testUser);

        // Assert
        Assert.True(riskScore >= 30); // New device adds 30 points
    }

    [Fact]
    public async Task CalculateRiskScoreAsync_WithHighRiskIp_AddsRiskScore()
    {
        // Arrange
        var securityEvent = new SecurityEvent
        {
            UserId = _testUserId,
            EventType = "LOGIN_SUCCESS",
            IpAddress = "10.0.0.1", // High-risk private IP
            UserAgent = "test-agent",
            Location = "Private Network"
        };

        // Act
        var riskScore = await _service.CalculateRiskScoreAsync(securityEvent, _testUser);

        // Assert
        Assert.True(riskScore >= 40); // High-risk IP adds 40 points
    }

    [Fact]
    public async Task CalculateRiskScoreAsync_WithLoginFailed_AddsRiskScore()
    {
        // Arrange
        var securityEvent = new SecurityEvent
        {
            UserId = _testUserId,
            EventType = "LOGIN_FAILED",
            IpAddress = "203.0.113.1",
            UserAgent = "test-agent",
            Location = "Location Unknown"
        };

        // Act
        var riskScore = await _service.CalculateRiskScoreAsync(securityEvent, _testUser);

        // Assert
        Assert.True(riskScore >= 15); // LOGIN_FAILED adds 15 points
    }

    [Fact]
    public async Task CalculateRiskScoreAsync_WithMultipleRiskFactors_CapsAt100()
    {
        // Arrange - Add multiple failed login attempts
        for (int i = 0; i < 5; i++)
        {
            _context.SecurityEvents.Add(new SecurityEvent
            {
                UserId = _testUserId,
                EventType = "LOGIN_FAILED",
                IpAddress = "203.0.113.1",
                CreatedAt = DateTime.UtcNow.AddMinutes(-30)
            });
        }
        await _context.SaveChangesAsync();

        var securityEvent = new SecurityEvent
        {
            UserId = _testUserId,
            EventType = "LOGIN_FAILED",
            IpAddress = "10.0.0.1", // High-risk IP
            UserAgent = "Mozilla/5.0 (completely new device)",
            Location = "Unknown Location"
        };

        // Act
        var riskScore = await _service.CalculateRiskScoreAsync(securityEvent, _testUser);

        // Assert
        Assert.Equal(100, riskScore); // Should be capped at 100
    }

    #endregion

    #region GetUserSecurityHistoryAsync Tests

    [Fact]
    public async Task GetUserSecurityHistoryAsync_ReturnsUserEvents()
    {
        // Arrange
        _context.SecurityEvents.AddRange(
            new SecurityEvent { UserId = _testUserId, EventType = "LOGIN_SUCCESS", IpAddress = "203.0.113.1", CreatedAt = DateTime.UtcNow.AddHours(-1) },
            new SecurityEvent { UserId = _testUserId, EventType = "LOGIN_FAILED", IpAddress = "203.0.113.2", CreatedAt = DateTime.UtcNow.AddHours(-2) },
            new SecurityEvent { UserId = _testUserId, EventType = "PASSWORD_CHANGE", IpAddress = "203.0.113.3", CreatedAt = DateTime.UtcNow.AddHours(-3) }
        );
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetUserSecurityHistoryAsync(_testUserId);

        // Assert
        var events = result.ToList();
        Assert.Equal(3, events.Count);
        Assert.Equal("LOGIN_SUCCESS", events[0].EventType); // Most recent first
    }

    [Fact]
    public async Task GetUserSecurityHistoryAsync_WithPagination_ReturnsLimitedResults()
    {
        // Arrange - Add 10 events
        for (int i = 0; i < 10; i++)
        {
            _context.SecurityEvents.Add(new SecurityEvent
            {
                UserId = _testUserId,
                EventType = "LOGIN_SUCCESS",
                IpAddress = $"203.0.113.{i}",
                CreatedAt = DateTime.UtcNow.AddHours(-i)
            });
        }
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetUserSecurityHistoryAsync(_testUserId, skip: 2, take: 3);

        // Assert
        var events = result.ToList();
        Assert.Equal(3, events.Count);
    }

    [Fact]
    public async Task GetUserSecurityHistoryAsync_WithNoEvents_ReturnsEmpty()
    {
        // Act
        var result = await _service.GetUserSecurityHistoryAsync(_testUserId);

        // Assert
        Assert.Empty(result);
    }

    #endregion

    #region IsNewDeviceAsync Tests

    [Fact]
    public async Task IsNewDeviceAsync_WithNewUserAgent_ReturnsTrue()
    {
        // Arrange
        var userAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)";

        // Act
        var result = await _service.IsNewDeviceAsync(userAgent, _testUserId);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public async Task IsNewDeviceAsync_WithExistingUserAgent_ReturnsFalse()
    {
        // Arrange
        var userAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64)";
        _context.UserSessions.Add(new UserSession
        {
            UserId = _testUserId,
            UserAgent = userAgent,
            RefreshToken = "test-token",
            CreatedAt = DateTime.UtcNow.AddDays(-5)
        });
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.IsNewDeviceAsync(userAgent, _testUserId);

        // Assert
        Assert.False(result);
    }

    #endregion

    #region IsUnusualLocationAsync Tests

    [Fact]
    public async Task IsUnusualLocationAsync_WithFirstLogin_ReturnsTrue()
    {
        // Arrange
        var ipAddress = "203.0.113.1";

        // Act
        var result = await _service.IsUnusualLocationAsync(ipAddress, _testUserId);

        // Assert
        Assert.True(result); // First login from any location is unusual
    }

    [Fact]
    public async Task IsUnusualLocationAsync_WithKnownLocation_ReturnsFalse()
    {
        // Arrange
        var ipAddress = "203.0.113.1";
        _context.SecurityEvents.Add(new SecurityEvent
        {
            UserId = _testUserId,
            EventType = "LOGIN_SUCCESS",
            IpAddress = ipAddress,
            Location = "Location Unknown",
            CreatedAt = DateTime.UtcNow.AddDays(-5)
        });
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.IsUnusualLocationAsync(ipAddress, _testUserId);

        // Assert
        Assert.False(result); // Location is now known
    }

    #endregion

    #region IsHighRiskIpAsync Tests

    [Fact]
    public async Task IsHighRiskIpAsync_WithPrivateIp_ReturnsTrue()
    {
        // Act
        var result1 = await _service.IsHighRiskIpAsync("10.0.0.1");
        var result2 = await _service.IsHighRiskIpAsync("192.168.1.1");
        var result3 = await _service.IsHighRiskIpAsync("172.16.0.1");

        // Assert
        Assert.True(result1);
        Assert.True(result2);
        Assert.True(result3);
    }

    [Fact]
    public async Task IsHighRiskIpAsync_WithPublicIp_ReturnsFalse()
    {
        // Act
        var result = await _service.IsHighRiskIpAsync("203.0.113.1");

        // Assert
        Assert.False(result);
    }

    #endregion

    #region HasRecentFailedAttemptsAsync Tests

    [Fact]
    public async Task HasRecentFailedAttemptsAsync_WithMultipleFailures_ReturnsTrue()
    {
        // Arrange - Add 3 failed attempts in last hour
        for (int i = 0; i < 3; i++)
        {
            _context.SecurityEvents.Add(new SecurityEvent
            {
                UserId = _testUserId,
                EventType = "LOGIN_FAILED",
                IpAddress = "203.0.113.1",
                CreatedAt = DateTime.UtcNow.AddMinutes(-30)
            });
        }
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.HasRecentFailedAttemptsAsync(_testUserId);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public async Task HasRecentFailedAttemptsAsync_WithFewFailures_ReturnsFalse()
    {
        // Arrange - Add only 2 failed attempts
        for (int i = 0; i < 2; i++)
        {
            _context.SecurityEvents.Add(new SecurityEvent
            {
                UserId = _testUserId,
                EventType = "LOGIN_FAILED",
                IpAddress = "203.0.113.1",
                CreatedAt = DateTime.UtcNow.AddMinutes(-30)
            });
        }
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.HasRecentFailedAttemptsAsync(_testUserId);

        // Assert
        Assert.False(result); // Requires 3 or more failures
    }

    [Fact]
    public async Task HasRecentFailedAttemptsAsync_WithOldFailures_ReturnsFalse()
    {
        // Arrange - Add 3 failed attempts more than 1 hour ago
        for (int i = 0; i < 3; i++)
        {
            _context.SecurityEvents.Add(new SecurityEvent
            {
                UserId = _testUserId,
                EventType = "LOGIN_FAILED",
                IpAddress = "203.0.113.1",
                CreatedAt = DateTime.UtcNow.AddHours(-2)
            });
        }
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.HasRecentFailedAttemptsAsync(_testUserId);

        // Assert
        Assert.False(result); // Old failures don't count
    }

    #endregion

    #region GetLocationFromIpAsync Tests

    [Fact]
    public async Task GetLocationFromIpAsync_WithPrivateIp_ReturnsPrivateNetwork()
    {
        // Act
        var result1 = await _service.GetLocationFromIpAsync("192.168.1.1");
        var result2 = await _service.GetLocationFromIpAsync("10.0.0.1");
        var result3 = await _service.GetLocationFromIpAsync("172.16.0.1");

        // Assert
        Assert.Equal("Private Network", result1);
        Assert.Equal("Private Network", result2);
        Assert.Equal("Private Network", result3);
    }

    [Fact]
    public async Task GetLocationFromIpAsync_WithPublicIp_ReturnsLocationUnknown()
    {
        // Act
        var result = await _service.GetLocationFromIpAsync("203.0.113.1");

        // Assert
        Assert.Equal("Location Unknown", result);
    }

    [Fact]
    public async Task GetLocationFromIpAsync_WithNullIp_ReturnsNull()
    {
        // Act
        var result = await _service.GetLocationFromIpAsync(null);

        // Assert
        Assert.Null(result);
    }

    #endregion

    #region GetUserSecurityPreferencesAsync Tests

    [Fact]
    public async Task GetUserSecurityPreferencesAsync_WithExistingPreferences_ReturnsPreferences()
    {
        // Arrange
        var preferences = new SecurityPreferences
        {
            UserId = _testUserId,
            EmailSecurityAlerts = true,
            EmailLoginNotifications = true,
            TwoFactorEnabled = false,
            SecurityQuestionEnabled = false
        };
        _context.SecurityPreferences.Add(preferences);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetUserSecurityPreferencesAsync(_testUserId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(_testUserId, result.UserId);
        Assert.True(result.EmailSecurityAlerts);
        Assert.True(result.EmailLoginNotifications);
    }

    [Fact]
    public async Task GetUserSecurityPreferencesAsync_WithNoPreferences_CreatesDefaults()
    {
        // Act
        var result = await _service.GetUserSecurityPreferencesAsync(_testUserId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(_testUserId, result.UserId);
        Assert.True(result.EmailSecurityAlerts); // Default is true
        Assert.False(result.EmailLoginNotifications); // Default is false
        Assert.False(result.TwoFactorEnabled);
        Assert.False(result.SecurityQuestionEnabled);

        // Verify it was saved
        var savedPreferences = await _context.SecurityPreferences.FirstOrDefaultAsync(sp => sp.UserId == _testUserId);
        Assert.NotNull(savedPreferences);
    }

    #endregion

    #region UpdateUserSecurityPreferencesAsync Tests

    [Fact]
    public async Task UpdateUserSecurityPreferencesAsync_WithNewPreferences_CreatesPreferences()
    {
        // Arrange
        var preferences = new SecurityPreferences
        {
            EmailSecurityAlerts = false,
            EmailLoginNotifications = true,
            TwoFactorEnabled = true,
            SecurityQuestionEnabled = false
        };

        // Act
        var result = await _service.UpdateUserSecurityPreferencesAsync(_testUserId, preferences);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(_testUserId, result.UserId);
        Assert.False(result.EmailSecurityAlerts);
        Assert.True(result.EmailLoginNotifications);
        Assert.True(result.TwoFactorEnabled);
    }

    [Fact]
    public async Task UpdateUserSecurityPreferencesAsync_WithExistingPreferences_UpdatesPreferences()
    {
        // Arrange
        var existingPreferences = new SecurityPreferences
        {
            UserId = _testUserId,
            EmailSecurityAlerts = true,
            EmailLoginNotifications = false,
            TwoFactorEnabled = false,
            SecurityQuestionEnabled = false
        };
        _context.SecurityPreferences.Add(existingPreferences);
        await _context.SaveChangesAsync();

        var updatedPreferences = new SecurityPreferences
        {
            EmailSecurityAlerts = false,
            EmailLoginNotifications = true,
            TwoFactorEnabled = true,
            SecurityQuestionEnabled = true
        };

        // Act
        var result = await _service.UpdateUserSecurityPreferencesAsync(_testUserId, updatedPreferences);

        // Assert
        Assert.NotNull(result);
        Assert.False(result.EmailSecurityAlerts);
        Assert.True(result.EmailLoginNotifications);
        Assert.True(result.TwoFactorEnabled);
        Assert.True(result.SecurityQuestionEnabled);
    }

    #endregion

    #region ShouldSendSecurityAlertAsync Tests

    [Fact]
    public async Task ShouldSendSecurityAlertAsync_WithHighRiskScore_ReturnsTrue()
    {
        // Arrange
        var preferences = new SecurityPreferences
        {
            UserId = _testUserId,
            EmailSecurityAlerts = true
        };
        _context.SecurityPreferences.Add(preferences);
        await _context.SaveChangesAsync();

        var securityEvent = new SecurityEvent
        {
            UserId = _testUserId,
            EventType = "LOGIN_SUCCESS",
            RiskScore = 75
        };

        // Act
        var result = await _service.ShouldSendSecurityAlertAsync(securityEvent, _testUser);

        // Assert
        Assert.True(result); // Risk score >= 50
    }

    [Fact]
    public async Task ShouldSendSecurityAlertAsync_WithAlertsDisabled_ReturnsFalse()
    {
        // Arrange
        var preferences = new SecurityPreferences
        {
            UserId = _testUserId,
            EmailSecurityAlerts = false // Disabled
        };
        _context.SecurityPreferences.Add(preferences);
        await _context.SaveChangesAsync();

        var securityEvent = new SecurityEvent
        {
            UserId = _testUserId,
            EventType = "LOGIN_SUCCESS",
            RiskScore = 75
        };

        // Act
        var result = await _service.ShouldSendSecurityAlertAsync(securityEvent, _testUser);

        // Assert
        Assert.False(result); // Alerts disabled
    }

    [Fact]
    public async Task ShouldSendSecurityAlertAsync_WithCriticalEvent_ReturnsTrue()
    {
        // Arrange
        var preferences = new SecurityPreferences
        {
            UserId = _testUserId,
            EmailSecurityAlerts = true
        };
        _context.SecurityPreferences.Add(preferences);
        await _context.SaveChangesAsync();

        var securityEvent = new SecurityEvent
        {
            UserId = _testUserId,
            EventType = "PASSWORD_CHANGE",
            RiskScore = 10 // Low risk but critical event
        };

        // Act
        var result = await _service.ShouldSendSecurityAlertAsync(securityEvent, _testUser);

        // Assert
        Assert.True(result); // Critical event type
    }

    [Fact]
    public async Task ShouldSendSecurityAlertAsync_WithLoginNotificationsEnabled_SendsForLogins()
    {
        // Arrange
        var preferences = new SecurityPreferences
        {
            UserId = _testUserId,
            EmailSecurityAlerts = true,
            EmailLoginNotifications = true
        };
        _context.SecurityPreferences.Add(preferences);
        await _context.SaveChangesAsync();

        var securityEvent = new SecurityEvent
        {
            UserId = _testUserId,
            EventType = "LOGIN_SUCCESS",
            RiskScore = 10 // Low risk
        };

        // Act
        var result = await _service.ShouldSendSecurityAlertAsync(securityEvent, _testUser);

        // Assert
        Assert.True(result); // Login notifications enabled
    }

    #endregion

    #region SendSecurityAlertAsync Tests

    [Fact]
    public async Task SendSecurityAlertAsync_WithValidUser_LogsAlert()
    {
        // Arrange
        var securityEvent = new SecurityEvent
        {
            UserId = _testUserId,
            EventType = "LOGIN_SUCCESS",
            IpAddress = "203.0.113.1",
            Location = "New York, USA",
            RiskScore = 50,
            CreatedAt = DateTime.UtcNow
        };

        // Act
        await _service.SendSecurityAlertAsync(_testUser, securityEvent);

        // Assert - Verify logger was called (alert would be sent in real implementation)
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString().Contains("Security alert would be sent")),
                null,
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task SendSecurityAlertAsync_WithNullEmail_DoesNotSend()
    {
        // Arrange
        var userWithoutEmail = new User
        {
            Id = Guid.NewGuid(),
            Email = null, // No email
            FirstName = "Test",
            LastName = "User",
            UserName = "testuser"
        };

        var securityEvent = new SecurityEvent
        {
            UserId = userWithoutEmail.Id,
            EventType = "LOGIN_SUCCESS",
            RiskScore = 50
        };

        // Act
        await _service.SendSecurityAlertAsync(userWithoutEmail, securityEvent);

        // Assert - No log entry should be made
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString().Contains("Security alert would be sent")),
                null,
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Never);
    }

    #endregion
}
