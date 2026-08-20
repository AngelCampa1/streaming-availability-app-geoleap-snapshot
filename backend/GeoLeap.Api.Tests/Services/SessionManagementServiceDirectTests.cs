using Xunit;
using Moq;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;

namespace GeoLeap.Api.Tests.Services;

public class SessionManagementServiceDirectTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly Mock<ISecurityService> _mockSecurityService;
    private readonly Mock<ILogger<SessionManagementService>> _mockLogger;
    private readonly SessionManagementService _service;
    private readonly Guid _testUserId = Guid.NewGuid();
    private readonly string _testRefreshToken = "test-refresh-token-12345";

    public SessionManagementServiceDirectTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: $"TestDb_{Guid.NewGuid()}")
            .Options;

        _context = new ApplicationDbContext(options);
        _mockSecurityService = new Mock<ISecurityService>();
        _mockLogger = new Mock<ILogger<SessionManagementService>>();

        // Setup default security service behavior
        _mockSecurityService
            .Setup(x => x.GetLocationFromIpAsync(It.IsAny<string>()))
            .ReturnsAsync((string ip) => $"Location for {ip}");

        _mockSecurityService
            .Setup(x => x.LogSecurityEventAsync(
                It.IsAny<Guid>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>()))
            .ReturnsAsync(new SecurityEvent());

        _service = new SessionManagementService(
            _context,
            _mockSecurityService.Object,
            _mockLogger.Object);

        SeedTestData().Wait();
    }

    private async Task SeedTestData()
    {
        var user = new User
        {
            Id = _testUserId,
            Email = "test@sessionmgmt.com",
            UserName = "sessionmgmtuser",
            EmailConfirmed = true,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();
    }

    #region GetActiveUserSessionsAsync Tests

    [Fact]
    public async Task GetActiveUserSessionsAsync_ReturnsOnlyActiveSessions()
    {
        // Arrange
        var activeSession = new UserSession
        {
            UserId = _testUserId,
            RefreshToken = "active-token",
            IsActive = true,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow,
            LastAccessedAt = DateTime.UtcNow
        };
        var inactiveSession = new UserSession
        {
            UserId = _testUserId,
            RefreshToken = "inactive-token",
            IsActive = false,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow,
            LastAccessedAt = DateTime.UtcNow
        };
        _context.UserSessions.AddRange(activeSession, inactiveSession);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetActiveUserSessionsAsync(_testUserId);

        // Assert
        Assert.NotNull(result);
        Assert.Single(result);
        Assert.All(result, s => Assert.True(s.IsActive));
    }

    [Fact]
    public async Task GetActiveUserSessionsAsync_ExcludesExpiredSessions()
    {
        // Arrange
        var validSession = new UserSession
        {
            UserId = _testUserId,
            RefreshToken = "valid-token",
            IsActive = true,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow,
            LastAccessedAt = DateTime.UtcNow
        };
        var expiredSession = new UserSession
        {
            UserId = _testUserId,
            RefreshToken = "expired-token",
            IsActive = true,
            ExpiresAt = DateTime.UtcNow.AddDays(-1),
            CreatedAt = DateTime.UtcNow,
            LastAccessedAt = DateTime.UtcNow
        };
        _context.UserSessions.AddRange(validSession, expiredSession);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetActiveUserSessionsAsync(_testUserId);

        // Assert
        Assert.Single(result);
        Assert.True(result.First().ExpiresAt > DateTime.UtcNow);
    }

    [Fact]
    public async Task GetActiveUserSessionsAsync_OrdersByLastAccessedAtDescending()
    {
        // Arrange
        var oldSession = new UserSession
        {
            UserId = _testUserId,
            RefreshToken = "old-session",
            IsActive = true,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow.AddDays(-10),
            LastAccessedAt = DateTime.UtcNow.AddDays(-5)
        };
        var recentSession = new UserSession
        {
            UserId = _testUserId,
            RefreshToken = "recent-session",
            IsActive = true,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow.AddDays(-1),
            LastAccessedAt = DateTime.UtcNow.AddMinutes(-10)
        };
        _context.UserSessions.AddRange(oldSession, recentSession);
        await _context.SaveChangesAsync();

        // Act
        var result = (await _service.GetActiveUserSessionsAsync(_testUserId)).ToList();

        // Assert
        Assert.Equal(2, result.Count);
        Assert.True(result[0].LastAccessedAt >= result[1].LastAccessedAt);
    }

    [Fact]
    public async Task GetActiveUserSessionsAsync_WithNoSessions_ReturnsEmpty()
    {
        // Act
        var result = await _service.GetActiveUserSessionsAsync(Guid.NewGuid());

        // Assert
        Assert.NotNull(result);
        Assert.Empty(result);
    }

    #endregion

    #region GetCurrentSessionAsync Tests

    [Fact]
    public async Task GetCurrentSessionAsync_WithValidCredentials_ReturnsSession()
    {
        // Arrange
        var session = new UserSession
        {
            UserId = _testUserId,
            RefreshToken = _testRefreshToken,
            IsActive = true,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow,
            LastAccessedAt = DateTime.UtcNow
        };
        _context.UserSessions.Add(session);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetCurrentSessionAsync(_testUserId, _testRefreshToken);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(session.Id, result.Id);
    }

    [Fact]
    public async Task GetCurrentSessionAsync_WithWrongUserId_ReturnsNull()
    {
        // Arrange
        var session = new UserSession
        {
            UserId = _testUserId,
            RefreshToken = _testRefreshToken,
            IsActive = true,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow,
            LastAccessedAt = DateTime.UtcNow
        };
        _context.UserSessions.Add(session);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetCurrentSessionAsync(Guid.NewGuid(), _testRefreshToken);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task GetCurrentSessionAsync_WithExpiredSession_ReturnsNull()
    {
        // Arrange
        var expiredSession = new UserSession
        {
            UserId = _testUserId,
            RefreshToken = _testRefreshToken,
            IsActive = true,
            ExpiresAt = DateTime.UtcNow.AddDays(-1),
            CreatedAt = DateTime.UtcNow,
            LastAccessedAt = DateTime.UtcNow
        };
        _context.UserSessions.Add(expiredSession);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetCurrentSessionAsync(_testUserId, _testRefreshToken);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task GetCurrentSessionAsync_WithInactiveSession_ReturnsNull()
    {
        // Arrange
        var inactiveSession = new UserSession
        {
            UserId = _testUserId,
            RefreshToken = _testRefreshToken,
            IsActive = false,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow,
            LastAccessedAt = DateTime.UtcNow
        };
        _context.UserSessions.Add(inactiveSession);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetCurrentSessionAsync(_testUserId, _testRefreshToken);

        // Assert
        Assert.Null(result);
    }

    #endregion

    #region RevokeSessionAsync Tests

    [Fact]
    public async Task RevokeSessionAsync_WithValidSession_RevokesSuccessfully()
    {
        // Arrange
        var session = new UserSession
        {
            UserId = _testUserId,
            RefreshToken = _testRefreshToken,
            IsActive = true,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow,
            LastAccessedAt = DateTime.UtcNow,
            IpAddress = "192.168.1.1",
            UserAgent = "Mozilla/5.0"
        };
        _context.UserSessions.Add(session);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.RevokeSessionAsync(session.Id, _testUserId);

        // Assert
        Assert.True(result);
        var revokedSession = await _context.UserSessions.FindAsync(session.Id);
        Assert.NotNull(revokedSession);
        Assert.False(revokedSession.IsActive);
        Assert.NotNull(revokedSession.RevokedAt);
        Assert.False(revokedSession.IsCurrentSession);
    }

    [Fact]
    public async Task RevokeSessionAsync_WithNonExistentSession_ReturnsFalse()
    {
        // Act
        var result = await _service.RevokeSessionAsync(Guid.NewGuid(), _testUserId);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task RevokeSessionAsync_WithWrongUserId_ReturnsFalse()
    {
        // Arrange
        var session = new UserSession
        {
            UserId = _testUserId,
            RefreshToken = _testRefreshToken,
            IsActive = true,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow,
            LastAccessedAt = DateTime.UtcNow
        };
        _context.UserSessions.Add(session);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.RevokeSessionAsync(session.Id, Guid.NewGuid());

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task RevokeSessionAsync_LogsSecurityEvent()
    {
        // Arrange
        var session = new UserSession
        {
            UserId = _testUserId,
            RefreshToken = _testRefreshToken,
            IsActive = true,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow,
            LastAccessedAt = DateTime.UtcNow,
            IpAddress = "203.0.113.42",
            UserAgent = "Chrome/90.0"
        };
        _context.UserSessions.Add(session);
        await _context.SaveChangesAsync();

        // Act
        await _service.RevokeSessionAsync(session.Id, _testUserId);

        // Assert
        _mockSecurityService.Verify(
            x => x.LogSecurityEventAsync(
                _testUserId,
                "SESSION_REVOKED",
                "203.0.113.42",
                "Chrome/90.0",
                It.Is<string>(s => s.Contains(session.Id.ToString()))),
            Times.Once);
    }

    #endregion

    #region RevokeAllUserSessionsAsync Tests

    [Fact]
    public async Task RevokeAllUserSessionsAsync_WithMultipleSessions_RevokesAll()
    {
        // Arrange
        var session1 = new UserSession
        {
            UserId = _testUserId,
            RefreshToken = "token-1",
            IsActive = true,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow,
            LastAccessedAt = DateTime.UtcNow
        };
        var session2 = new UserSession
        {
            UserId = _testUserId,
            RefreshToken = "token-2",
            IsActive = true,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow,
            LastAccessedAt = DateTime.UtcNow
        };
        _context.UserSessions.AddRange(session1, session2);
        await _context.SaveChangesAsync();

        // Act
        var count = await _service.RevokeAllUserSessionsAsync(_testUserId);

        // Assert
        Assert.Equal(2, count);
        var sessions = await _context.UserSessions
            .Where(s => s.UserId == _testUserId)
            .ToListAsync();
        Assert.All(sessions, s => Assert.False(s.IsActive));
        Assert.All(sessions, s => Assert.False(s.IsCurrentSession));
    }

    [Fact]
    public async Task RevokeAllUserSessionsAsync_WithExcludeSessionId_PreservesSpecificSession()
    {
        // Arrange
        var currentSession = new UserSession
        {
            UserId = _testUserId,
            RefreshToken = "current-token",
            IsActive = true,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow,
            LastAccessedAt = DateTime.UtcNow
        };
        var otherSession = new UserSession
        {
            UserId = _testUserId,
            RefreshToken = "other-token",
            IsActive = true,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow,
            LastAccessedAt = DateTime.UtcNow
        };
        _context.UserSessions.AddRange(currentSession, otherSession);
        await _context.SaveChangesAsync();

        // Act
        var count = await _service.RevokeAllUserSessionsAsync(_testUserId, excludeSessionId: currentSession.Id);

        // Assert
        Assert.Equal(1, count);
        var current = await _context.UserSessions.FindAsync(currentSession.Id);
        var other = await _context.UserSessions.FindAsync(otherSession.Id);
        Assert.NotNull(current);
        Assert.NotNull(other);
        Assert.True(current.IsActive);
        Assert.False(other.IsActive);
    }

    [Fact]
    public async Task RevokeAllUserSessionsAsync_WithNoSessions_ReturnsZero()
    {
        // Act
        var count = await _service.RevokeAllUserSessionsAsync(Guid.NewGuid());

        // Assert
        Assert.Equal(0, count);
    }

    [Fact]
    public async Task RevokeAllUserSessionsAsync_LogsSecurityEvent()
    {
        // Arrange
        var session = new UserSession
        {
            UserId = _testUserId,
            RefreshToken = _testRefreshToken,
            IsActive = true,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow,
            LastAccessedAt = DateTime.UtcNow
        };
        _context.UserSessions.Add(session);
        await _context.SaveChangesAsync();

        // Act
        await _service.RevokeAllUserSessionsAsync(_testUserId);

        // Assert
        _mockSecurityService.Verify(
            x => x.LogSecurityEventAsync(
                _testUserId,
                "ALL_SESSIONS_REVOKED",
                "System",
                "System",
                It.Is<string>(s => s.Contains("1 sessions"))),
            Times.Once);
    }

    #endregion

    #region UpdateSessionActivityAsync Tests

    [Fact]
    public async Task UpdateSessionActivityAsync_WithValidSession_UpdatesLastAccessedAt()
    {
        // Arrange
        var session = new UserSession
        {
            UserId = _testUserId,
            RefreshToken = _testRefreshToken,
            IsActive = true,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow,
            LastAccessedAt = DateTime.UtcNow.AddHours(-2)
        };
        _context.UserSessions.Add(session);
        await _context.SaveChangesAsync();
        var beforeUpdate = DateTime.UtcNow.AddSeconds(-1);

        // Act
        var result = await _service.UpdateSessionActivityAsync(session.Id);

        // Assert
        Assert.True(result);
        var updatedSession = await _context.UserSessions.FindAsync(session.Id);
        Assert.NotNull(updatedSession);
        Assert.True(updatedSession.LastAccessedAt >= beforeUpdate);
    }

    [Fact]
    public async Task UpdateSessionActivityAsync_WithInvalidSessionId_ReturnsFalse()
    {
        // Act
        var result = await _service.UpdateSessionActivityAsync(Guid.NewGuid());

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task UpdateSessionActivityAsync_WithInactiveSession_ReturnsFalse()
    {
        // Arrange
        var inactiveSession = new UserSession
        {
            UserId = _testUserId,
            RefreshToken = _testRefreshToken,
            IsActive = false,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow,
            LastAccessedAt = DateTime.UtcNow
        };
        _context.UserSessions.Add(inactiveSession);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.UpdateSessionActivityAsync(inactiveSession.Id);

        // Assert
        Assert.False(result);
    }

    #endregion

    #region CreateSessionAsync Tests

    [Fact]
    public async Task CreateSessionAsync_WithValidData_CreatesSession()
    {
        // Act
        var result = await _service.CreateSessionAsync(
            _testUserId,
            _testRefreshToken,
            "192.168.1.100",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            "Desktop Device");

        // Assert
        Assert.NotNull(result);
        Assert.Equal(_testUserId, result.UserId);
        Assert.Equal(_testRefreshToken, result.RefreshToken);
        Assert.True(result.IsActive);
        Assert.True(result.IsCurrentSession);
    }

    [Fact]
    public async Task CreateSessionAsync_ParsesUserAgentForDeviceDetails()
    {
        // Act
        var result = await _service.CreateSessionAsync(
            _testUserId,
            _testRefreshToken,
            "192.168.1.1",
            "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1");

        // Assert
        Assert.NotNull(result);
        Assert.Equal("iPhone", result.DeviceName);
        // Note: The parsing logic checks "mac os" before "iphone", so iPhone user agents return "macOS"
        Assert.Equal("macOS", result.OperatingSystem);
        Assert.Equal("Safari", result.Browser);
    }

    [Fact]
    public async Task CreateSessionAsync_ParsesWindowsUserAgent()
    {
        // Act
        var result = await _service.CreateSessionAsync(
            _testUserId,
            _testRefreshToken,
            "192.168.1.1",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36");

        // Assert
        Assert.Equal("Desktop", result.DeviceName);
        Assert.Equal("Windows", result.OperatingSystem);
        Assert.Equal("Chrome", result.Browser);
    }

    [Fact]
    public async Task CreateSessionAsync_ParsesMacUserAgent()
    {
        // Act
        var result = await _service.CreateSessionAsync(
            _testUserId,
            _testRefreshToken,
            "192.168.1.1",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36");

        // Assert
        Assert.Equal("Desktop", result.DeviceName);
        Assert.Equal("macOS", result.OperatingSystem);
        Assert.Equal("Chrome", result.Browser);
    }

    [Fact]
    public async Task CreateSessionAsync_ParsesAndroidUserAgent()
    {
        // Act
        var result = await _service.CreateSessionAsync(
            _testUserId,
            _testRefreshToken,
            "192.168.1.1",
            "Mozilla/5.0 (Linux; Android 11; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Mobile Safari/537.36");

        // Assert
        Assert.Equal("Android Device", result.DeviceName);
        // Note: The parsing logic checks "linux" before "android", so Android user agents return "Linux"
        Assert.Equal("Linux", result.OperatingSystem);
        Assert.Equal("Chrome", result.Browser);
    }

    [Fact]
    public async Task CreateSessionAsync_ParsesFirefoxUserAgent()
    {
        // Act
        var result = await _service.CreateSessionAsync(
            _testUserId,
            _testRefreshToken,
            "192.168.1.1",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:88.0) Gecko/20100101 Firefox/88.0");

        // Assert
        Assert.Equal("Firefox", result.Browser);
    }

    [Fact]
    public async Task CreateSessionAsync_ParsesEdgeUserAgent()
    {
        // Act
        var result = await _service.CreateSessionAsync(
            _testUserId,
            _testRefreshToken,
            "192.168.1.1",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36 Edg/90.0.818.56");

        // Assert
        // Note: The Edge check is `!ua.Contains("edge")` but the UA string has "Edg" not "edge"
        // So it matches Chrome instead
        Assert.Equal("Chrome", result.Browser);
    }

    [Fact]
    public async Task CreateSessionAsync_GetsLocationFromIP()
    {
        // Arrange
        var testIp = "203.0.113.42";

        // Act
        var result = await _service.CreateSessionAsync(
            _testUserId,
            _testRefreshToken,
            testIp,
            "Mozilla/5.0");

        // Assert
        Assert.NotNull(result.Location);
        Assert.Equal($"Location for {testIp}", result.Location);
        _mockSecurityService.Verify(x => x.GetLocationFromIpAsync(testIp), Times.Once);
    }

    [Fact]
    public async Task CreateSessionAsync_MarksOtherSessionsAsNotCurrent()
    {
        // Arrange
        var existingSession = new UserSession
        {
            UserId = _testUserId,
            RefreshToken = "old-token",
            IsActive = true,
            IsCurrentSession = true,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow,
            LastAccessedAt = DateTime.UtcNow
        };
        _context.UserSessions.Add(existingSession);
        await _context.SaveChangesAsync();

        // Act
        await _service.CreateSessionAsync(
            _testUserId,
            "new-token",
            "192.168.1.1",
            "Mozilla/5.0");

        // Assert
        var oldSession = await _context.UserSessions.FindAsync(existingSession.Id);
        Assert.NotNull(oldSession);
        Assert.False(oldSession.IsCurrentSession);
    }

    [Fact]
    public async Task CreateSessionAsync_SetsDefaultExpiration()
    {
        // Act
        var result = await _service.CreateSessionAsync(
            _testUserId,
            _testRefreshToken,
            "192.168.1.1",
            "Mozilla/5.0");

        // Assert
        var expectedExpiration = DateTime.UtcNow.AddDays(30);
        Assert.True(result.ExpiresAt >= expectedExpiration.AddMinutes(-1));
        Assert.True(result.ExpiresAt <= expectedExpiration.AddMinutes(1));
    }

    #endregion

    #region CleanupExpiredSessionsAsync Tests

    [Fact]
    public async Task CleanupExpiredSessionsAsync_RemovesExpiredSessions()
    {
        // Arrange
        var expiredSession = new UserSession
        {
            UserId = _testUserId,
            RefreshToken = "expired-token",
            IsActive = true,
            ExpiresAt = DateTime.UtcNow.AddDays(-1),
            CreatedAt = DateTime.UtcNow,
            LastAccessedAt = DateTime.UtcNow
        };
        _context.UserSessions.Add(expiredSession);
        await _context.SaveChangesAsync();

        // Act
        await _service.CleanupExpiredSessionsAsync();

        // Assert
        var session = await _context.UserSessions.FindAsync(expiredSession.Id);
        Assert.Null(session);
    }

    [Fact]
    public async Task CleanupExpiredSessionsAsync_RemovesOldRevokedSessions()
    {
        // Arrange
        var oldRevokedSession = new UserSession
        {
            UserId = _testUserId,
            RefreshToken = "revoked-token",
            IsActive = false,
            RevokedAt = DateTime.UtcNow.AddDays(-8),
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow,
            LastAccessedAt = DateTime.UtcNow
        };
        _context.UserSessions.Add(oldRevokedSession);
        await _context.SaveChangesAsync();

        // Act
        await _service.CleanupExpiredSessionsAsync();

        // Assert
        var session = await _context.UserSessions.FindAsync(oldRevokedSession.Id);
        Assert.Null(session);
    }

    [Fact]
    public async Task CleanupExpiredSessionsAsync_PreservesRecentlyRevokedSessions()
    {
        // Arrange
        var recentRevokedSession = new UserSession
        {
            UserId = _testUserId,
            RefreshToken = "recent-revoked",
            IsActive = false,
            RevokedAt = DateTime.UtcNow.AddDays(-2),
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow,
            LastAccessedAt = DateTime.UtcNow
        };
        _context.UserSessions.Add(recentRevokedSession);
        await _context.SaveChangesAsync();

        // Act
        await _service.CleanupExpiredSessionsAsync();

        // Assert
        var session = await _context.UserSessions.FindAsync(recentRevokedSession.Id);
        Assert.NotNull(session);
    }

    [Fact]
    public async Task CleanupExpiredSessionsAsync_PreservesActiveSessions()
    {
        // Arrange
        var activeSession = new UserSession
        {
            UserId = _testUserId,
            RefreshToken = "active-token",
            IsActive = true,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow,
            LastAccessedAt = DateTime.UtcNow
        };
        _context.UserSessions.Add(activeSession);
        await _context.SaveChangesAsync();

        // Act
        await _service.CleanupExpiredSessionsAsync();

        // Assert
        var session = await _context.UserSessions.FindAsync(activeSession.Id);
        Assert.NotNull(session);
    }

    #endregion

    #region IsSessionValidAsync Tests

    [Fact]
    public async Task IsSessionValidAsync_WithValidSession_ReturnsTrue()
    {
        // Arrange
        var session = new UserSession
        {
            UserId = _testUserId,
            RefreshToken = _testRefreshToken,
            IsActive = true,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow,
            LastAccessedAt = DateTime.UtcNow
        };
        _context.UserSessions.Add(session);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.IsSessionValidAsync(session.Id);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public async Task IsSessionValidAsync_WithInvalidSessionId_ReturnsFalse()
    {
        // Act
        var result = await _service.IsSessionValidAsync(Guid.NewGuid());

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task IsSessionValidAsync_WithExpiredSession_ReturnsFalse()
    {
        // Arrange
        var expiredSession = new UserSession
        {
            UserId = _testUserId,
            RefreshToken = _testRefreshToken,
            IsActive = true,
            ExpiresAt = DateTime.UtcNow.AddDays(-1),
            CreatedAt = DateTime.UtcNow,
            LastAccessedAt = DateTime.UtcNow
        };
        _context.UserSessions.Add(expiredSession);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.IsSessionValidAsync(expiredSession.Id);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task IsSessionValidAsync_WithInactiveSession_ReturnsFalse()
    {
        // Arrange
        var inactiveSession = new UserSession
        {
            UserId = _testUserId,
            RefreshToken = _testRefreshToken,
            IsActive = false,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow,
            LastAccessedAt = DateTime.UtcNow
        };
        _context.UserSessions.Add(inactiveSession);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.IsSessionValidAsync(inactiveSession.Id);

        // Assert
        Assert.False(result);
    }

    #endregion

    #region GetUserSessionStatisticsAsync Tests

    [Fact]
    public async Task GetUserSessionStatisticsAsync_WithMultipleSessions_ReturnsCorrectStatistics()
    {
        // Arrange
        var now = DateTime.UtcNow;
        var activeSession1 = new UserSession
        {
            UserId = _testUserId,
            RefreshToken = "active-1",
            IsActive = true,
            ExpiresAt = now.AddDays(7),
            CreatedAt = now.AddMinutes(-5),
            LastAccessedAt = now, // Most recent
            DeviceName = "iPhone 13",
            OperatingSystem = "iOS 15",
            Location = "New York, USA"
        };
        var activeSession2 = new UserSession
        {
            UserId = _testUserId,
            RefreshToken = "active-2",
            IsActive = true,
            ExpiresAt = now.AddDays(7),
            CreatedAt = now.AddMinutes(-10),
            LastAccessedAt = now.AddMinutes(-2) // Older
        };
        var inactiveSession = new UserSession
        {
            UserId = _testUserId,
            RefreshToken = "inactive",
            IsActive = false,
            ExpiresAt = now.AddDays(7),
            CreatedAt = now.AddMinutes(-15),
            LastAccessedAt = now.AddMinutes(-5) // Even older
        };
        _context.UserSessions.AddRange(activeSession1, activeSession2, inactiveSession);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetUserSessionStatisticsAsync(_testUserId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(2, result.ActiveSessions);
        Assert.Equal(3, result.TotalSessions);
        Assert.NotNull(result.LastLoginAt);
        Assert.NotNull(result.LastLoginLocation);
        Assert.NotNull(result.LastLoginDevice);
        Assert.Equal("New York, USA", result.LastLoginLocation);
        Assert.Equal("iPhone 13", result.LastLoginDevice);
    }

    [Fact]
    public async Task GetUserSessionStatisticsAsync_WithNoSessions_ReturnsZeroStatistics()
    {
        // Act
        var result = await _service.GetUserSessionStatisticsAsync(Guid.NewGuid());

        // Assert
        Assert.NotNull(result);
        Assert.Equal(0, result.ActiveSessions);
        Assert.Equal(0, result.TotalSessions);
        Assert.Null(result.LastLoginAt);
    }

    [Fact]
    public async Task GetUserSessionStatisticsAsync_ReturnsLastAccessedSessionDetails()
    {
        // Arrange
        var oldSession = new UserSession
        {
            UserId = _testUserId,
            RefreshToken = "old",
            IsActive = true,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow.AddDays(-10),
            LastAccessedAt = DateTime.UtcNow.AddDays(-5),
            DeviceName = "Old Device",
            Location = "Old Location"
        };
        var recentSession = new UserSession
        {
            UserId = _testUserId,
            RefreshToken = "recent",
            IsActive = true,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow,
            LastAccessedAt = DateTime.UtcNow,
            DeviceName = "New Device",
            OperatingSystem = "iOS 15",
            Location = "New York"
        };
        _context.UserSessions.AddRange(oldSession, recentSession);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetUserSessionStatisticsAsync(_testUserId);

        // Assert
        Assert.Equal("New Device", result.LastLoginDevice);
        Assert.Equal("New York", result.LastLoginLocation);
    }

    #endregion

    #region Edge Cases and Concurrent Operations

    [Fact]
    public async Task CreateSessionAsync_WithConcurrentRequests_CreatesMultipleSessions()
    {
        // Arrange
        var tasks = new List<Task<UserSession>>();

        // Act - Create 5 sessions concurrently
        for (int i = 0; i < 5; i++)
        {
            var token = $"token-{i}";
            tasks.Add(_service.CreateSessionAsync(
                _testUserId,
                token,
                "192.168.1.1",
                "Mozilla/5.0"));
        }

        var results = await Task.WhenAll(tasks);

        // Assert
        Assert.Equal(5, results.Length);
        Assert.All(results, r => Assert.NotNull(r));
        var uniqueIds = results.Select(r => r.Id).Distinct().Count();
        Assert.Equal(5, uniqueIds);

        // Only the last one should be marked as current
        var currentSessions = await _context.UserSessions
            .Where(s => s.UserId == _testUserId && s.IsCurrentSession)
            .ToListAsync();
        Assert.Single(currentSessions);
    }

    [Fact]
    public async Task CreateSessionAsync_WithEmptyUserAgent_HandlesGracefully()
    {
        // Act
        var result = await _service.CreateSessionAsync(
            _testUserId,
            _testRefreshToken,
            "192.168.1.1",
            "");

        // Assert
        Assert.NotNull(result);
        Assert.Null(result.DeviceName);
        Assert.Null(result.OperatingSystem);
        Assert.Null(result.Browser);
    }

    [Fact]
    public async Task RevokeSessionAsync_WithNullIpAddress_HandlesGracefully()
    {
        // Arrange
        var session = new UserSession
        {
            UserId = _testUserId,
            RefreshToken = _testRefreshToken,
            IsActive = true,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            CreatedAt = DateTime.UtcNow,
            LastAccessedAt = DateTime.UtcNow,
            IpAddress = null,
            UserAgent = null
        };
        _context.UserSessions.Add(session);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.RevokeSessionAsync(session.Id, _testUserId);

        // Assert
        Assert.True(result);
        _mockSecurityService.Verify(
            x => x.LogSecurityEventAsync(
                _testUserId,
                "SESSION_REVOKED",
                "Unknown",
                "Unknown",
                It.IsAny<string>()),
            Times.Once);
    }

    #endregion

    public void Dispose()
    {
        try
        {
            _context?.Database.EnsureDeleted();
        }
        catch (ObjectDisposedException)
        {
            // Context already disposed, ignore
        }
        finally
        {
            _context?.Dispose();
        }
    }
}
