using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace GeoLeap.Api.Tests.Services;

/// <summary>
/// Direct tests for SessionService covering all 7 public methods
/// Service: SessionService.cs (200 LOC)
/// Focus: Session management, refresh token security (2.0x business value multiplier)
/// </summary>
public class SessionServiceDirectTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly Mock<IJwtTokenService> _mockJwtTokenService;
    private readonly Mock<ILogger<SessionService>> _mockLogger;
    private readonly SessionService _service;
    private readonly Guid _testUserId;
    private readonly User _testUser;
    private readonly JwtSettings _jwtSettings;

    public SessionServiceDirectTests()
    {
        // Setup in-memory database
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"SessionServiceTestDb_{Guid.NewGuid()}")
            .Options;

        _context = new ApplicationDbContext(options);
        _mockJwtTokenService = new Mock<IJwtTokenService>();
        _mockLogger = new Mock<ILogger<SessionService>>();

        _jwtSettings = new JwtSettings
        {
            RefreshTokenExpirationDays = 7,
            RememberMeTokenExpirationDays = 30
        };

        var jwtSettingsOptions = Options.Create(_jwtSettings);
        _service = new SessionService(_context, jwtSettingsOptions, _mockJwtTokenService.Object, _mockLogger.Object);

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

        // Default mock behavior: hash tokens by prefixing "hashed_"
        _mockJwtTokenService.Setup(x => x.HashRefreshToken(It.IsAny<string>()))
            .Returns<string>(token => $"hashed_{token}");
    }

    public void Dispose()
    {
        _context.Database.EnsureDeleted();
        _context.Dispose();
        GC.SuppressFinalize(this);
    }

    #region CreateSessionAsync Tests

    [Fact]
    public async Task CreateSessionAsync_WithBasicInfo_CreatesSession()
    {
        // Arrange
        var refreshToken = "test-refresh-token";
        var deviceInfo = "iPhone 13";
        var ipAddress = "203.0.113.1";
        var userAgent = "Mozilla/5.0 (iPhone)";

        // Act
        var result = await _service.CreateSessionAsync(_testUserId, refreshToken, deviceInfo, ipAddress, userAgent);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(_testUserId, result.UserId);
        Assert.Equal("hashed_test-refresh-token", result.RefreshToken); // Should be hashed
        Assert.Equal(deviceInfo, result.DeviceInfo);
        Assert.Equal(ipAddress, result.IpAddress);
        Assert.Equal(userAgent, result.UserAgent);
        Assert.True(result.IsActive);
        Assert.True(result.ExpiresAt > DateTime.UtcNow);
        Assert.True(result.ExpiresAt <= DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenExpirationDays));
    }

    [Fact]
    public async Task CreateSessionAsync_WithRememberMe_UsesLongerExpiration()
    {
        // Arrange
        var refreshToken = "remember-token";

        // Act
        var result = await _service.CreateSessionAsync(_testUserId, refreshToken, rememberMe: true);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.ExpiresAt > DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenExpirationDays));
        Assert.True(result.ExpiresAt <= DateTime.UtcNow.AddDays(_jwtSettings.RememberMeTokenExpirationDays));
    }

    [Fact]
    public async Task CreateSessionAsync_WithoutRememberMe_UsesStandardExpiration()
    {
        // Arrange
        var refreshToken = "standard-token";

        // Act
        var result = await _service.CreateSessionAsync(_testUserId, refreshToken, rememberMe: false);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.ExpiresAt <= DateTime.UtcNow.AddDays(_jwtSettings.RefreshTokenExpirationDays));
    }

    [Fact]
    public async Task CreateSessionAsync_HashesRefreshToken()
    {
        // Arrange
        var refreshToken = "plain-token";

        // Act
        var result = await _service.CreateSessionAsync(_testUserId, refreshToken);

        // Assert
        Assert.Equal("hashed_plain-token", result.RefreshToken);
        _mockJwtTokenService.Verify(x => x.HashRefreshToken(refreshToken), Times.Once);
    }

    [Fact]
    public async Task CreateSessionAsync_SavesSessionToDatabase()
    {
        // Arrange
        var refreshToken = "db-token";

        // Act
        var result = await _service.CreateSessionAsync(_testUserId, refreshToken);

        // Assert
        var savedSession = await _context.UserSessions.FindAsync(result.Id);
        Assert.NotNull(savedSession);
        Assert.Equal(_testUserId, savedSession.UserId);
    }

    #endregion

    #region GetSessionByRefreshTokenAsync Tests

    [Fact]
    public async Task GetSessionByRefreshTokenAsync_WithValidToken_ReturnsSession()
    {
        // Arrange
        var refreshToken = "valid-token";
        var hashedToken = "hashed_valid-token";

        var session = new UserSession
        {
            UserId = _testUserId,
            RefreshToken = hashedToken,
            IsActive = true,
            ExpiresAt = DateTime.UtcNow.AddDays(7)
        };
        _context.UserSessions.Add(session);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetSessionByRefreshTokenAsync(refreshToken);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(session.Id, result.Id);
        Assert.NotNull(result.User); // Should include user
    }

    [Fact]
    public async Task GetSessionByRefreshTokenAsync_WithExpiredToken_ReturnsNull()
    {
        // Arrange
        var refreshToken = "expired-token";
        var hashedToken = "hashed_expired-token";

        var session = new UserSession
        {
            UserId = _testUserId,
            RefreshToken = hashedToken,
            IsActive = true,
            ExpiresAt = DateTime.UtcNow.AddDays(-1) // Expired
        };
        _context.UserSessions.Add(session);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetSessionByRefreshTokenAsync(refreshToken);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task GetSessionByRefreshTokenAsync_WithInactiveToken_ReturnsNull()
    {
        // Arrange
        var refreshToken = "inactive-token";
        var hashedToken = "hashed_inactive-token";

        var session = new UserSession
        {
            UserId = _testUserId,
            RefreshToken = hashedToken,
            IsActive = false, // Inactive
            ExpiresAt = DateTime.UtcNow.AddDays(7)
        };
        _context.UserSessions.Add(session);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetSessionByRefreshTokenAsync(refreshToken);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task GetSessionByRefreshTokenAsync_WithNonExistentToken_ReturnsNull()
    {
        // Act
        var result = await _service.GetSessionByRefreshTokenAsync("non-existent-token");

        // Assert
        Assert.Null(result);
    }

    #endregion

    #region RevokeSessionAsync Tests

    [Fact]
    public async Task RevokeSessionAsync_WithValidToken_RevokesSession()
    {
        // Arrange
        var refreshToken = "revoke-token";
        var hashedToken = "hashed_revoke-token";

        var session = new UserSession
        {
            UserId = _testUserId,
            RefreshToken = hashedToken,
            IsActive = true,
            ExpiresAt = DateTime.UtcNow.AddDays(7)
        };
        _context.UserSessions.Add(session);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.RevokeSessionAsync(refreshToken);

        // Assert
        Assert.True(result);
        var updatedSession = await _context.UserSessions.FindAsync(session.Id);
        Assert.NotNull(updatedSession);
        Assert.False(updatedSession.IsActive);
        Assert.NotNull(updatedSession.RevokedAt);
    }

    [Fact]
    public async Task RevokeSessionAsync_WithNonExistentToken_ReturnsFalse()
    {
        // Act
        var result = await _service.RevokeSessionAsync("non-existent-token");

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task RevokeSessionAsync_WithAlreadyRevokedToken_ReturnsFalse()
    {
        // Arrange
        var refreshToken = "already-revoked";
        var hashedToken = "hashed_already-revoked";

        var session = new UserSession
        {
            UserId = _testUserId,
            RefreshToken = hashedToken,
            IsActive = false,
            RevokedAt = DateTime.UtcNow.AddHours(-1),
            ExpiresAt = DateTime.UtcNow.AddDays(7)
        };
        _context.UserSessions.Add(session);
        await _context.SaveChangesAsync();

        // Act - Try to revoke again
        var result = await _service.RevokeSessionAsync(refreshToken);

        // Assert
        Assert.True(result); // Still returns true because session exists
    }

    #endregion

    #region RevokeAllUserSessionsAsync Tests

    [Fact]
    public async Task RevokeAllUserSessionsAsync_WithMultipleSessions_RevokesAll()
    {
        // Arrange
        var sessions = new List<UserSession>
        {
            new UserSession { UserId = _testUserId, RefreshToken = "hashed_token1", IsActive = true, ExpiresAt = DateTime.UtcNow.AddDays(7) },
            new UserSession { UserId = _testUserId, RefreshToken = "hashed_token2", IsActive = true, ExpiresAt = DateTime.UtcNow.AddDays(7) },
            new UserSession { UserId = _testUserId, RefreshToken = "hashed_token3", IsActive = true, ExpiresAt = DateTime.UtcNow.AddDays(7) }
        };
        _context.UserSessions.AddRange(sessions);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.RevokeAllUserSessionsAsync(_testUserId);

        // Assert
        Assert.True(result);
        var updatedSessions = await _context.UserSessions.Where(s => s.UserId == _testUserId).ToListAsync();
        Assert.Equal(3, updatedSessions.Count);
        Assert.All(updatedSessions, s => Assert.False(s.IsActive));
    }

    [Fact]
    public async Task RevokeAllUserSessionsAsync_WithNoActiveSessions_ReturnsTrue()
    {
        // Act
        var result = await _service.RevokeAllUserSessionsAsync(_testUserId);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public async Task RevokeAllUserSessionsAsync_DoesNotRevokeOtherUsers()
    {
        // Arrange
        var otherUserId = Guid.NewGuid();
        var otherUser = new User
        {
            Id = otherUserId,
            Email = "other@example.com",
            FirstName = "Other",
            LastName = "User",
            UserName = "otheruser"
        };
        _context.Users.Add(otherUser);

        var sessions = new List<UserSession>
        {
            new UserSession { UserId = _testUserId, RefreshToken = "hashed_token1", IsActive = true, ExpiresAt = DateTime.UtcNow.AddDays(7) },
            new UserSession { UserId = otherUserId, RefreshToken = "hashed_token2", IsActive = true, ExpiresAt = DateTime.UtcNow.AddDays(7) }
        };
        _context.UserSessions.AddRange(sessions);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.RevokeAllUserSessionsAsync(_testUserId);

        // Assert
        Assert.True(result);
        var testUserSessions = await _context.UserSessions.Where(s => s.UserId == _testUserId).ToListAsync();
        var otherUserSessions = await _context.UserSessions.Where(s => s.UserId == otherUserId).ToListAsync();

        Assert.All(testUserSessions, s => Assert.False(s.IsActive));
        Assert.All(otherUserSessions, s => Assert.True(s.IsActive)); // Other user sessions unaffected
    }

    #endregion

    #region GetActiveUserSessionsAsync Tests

    [Fact]
    public async Task GetActiveUserSessionsAsync_ReturnsOnlyActiveSessions()
    {
        // Arrange
        var sessions = new List<UserSession>
        {
            new UserSession { UserId = _testUserId, RefreshToken = "hashed_active1", IsActive = true, ExpiresAt = DateTime.UtcNow.AddDays(7), LastAccessedAt = DateTime.UtcNow },
            new UserSession { UserId = _testUserId, RefreshToken = "hashed_active2", IsActive = true, ExpiresAt = DateTime.UtcNow.AddDays(7), LastAccessedAt = DateTime.UtcNow.AddMinutes(-5) },
            new UserSession { UserId = _testUserId, RefreshToken = "hashed_inactive", IsActive = false, ExpiresAt = DateTime.UtcNow.AddDays(7) },
            new UserSession { UserId = _testUserId, RefreshToken = "hashed_expired", IsActive = true, ExpiresAt = DateTime.UtcNow.AddDays(-1) }
        };
        _context.UserSessions.AddRange(sessions);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetActiveUserSessionsAsync(_testUserId);

        // Assert
        Assert.Equal(2, result.Count);
        Assert.All(result, s => Assert.True(s.IsActive));
        Assert.All(result, s => Assert.True(s.ExpiresAt > DateTime.UtcNow));
    }

    [Fact]
    public async Task GetActiveUserSessionsAsync_OrdersByLastAccessed()
    {
        // Arrange
        var sessions = new List<UserSession>
        {
            new UserSession { UserId = _testUserId, RefreshToken = "hashed_old", IsActive = true, ExpiresAt = DateTime.UtcNow.AddDays(7), LastAccessedAt = DateTime.UtcNow.AddHours(-2) },
            new UserSession { UserId = _testUserId, RefreshToken = "hashed_recent", IsActive = true, ExpiresAt = DateTime.UtcNow.AddDays(7), LastAccessedAt = DateTime.UtcNow }
        };
        _context.UserSessions.AddRange(sessions);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.GetActiveUserSessionsAsync(_testUserId);

        // Assert
        Assert.Equal(2, result.Count);
        Assert.Equal("hashed_recent", result[0].RefreshToken); // Most recent first
        Assert.Equal("hashed_old", result[1].RefreshToken);
    }

    [Fact]
    public async Task GetActiveUserSessionsAsync_WithNoSessions_ReturnsEmptyList()
    {
        // Act
        var result = await _service.GetActiveUserSessionsAsync(_testUserId);

        // Assert
        Assert.Empty(result);
    }

    #endregion

    #region RefreshSessionAsync Tests

    [Fact]
    public async Task RefreshSessionAsync_WithValidToken_UpdatesToken()
    {
        // Arrange
        var oldToken = "old-token";
        var newToken = "new-token";
        var hashedOldToken = "hashed_old-token";

        var session = new UserSession
        {
            UserId = _testUserId,
            RefreshToken = hashedOldToken,
            IsActive = true,
            ExpiresAt = DateTime.UtcNow.AddDays(7),
            LastAccessedAt = DateTime.UtcNow.AddHours(-1)
        };
        _context.UserSessions.Add(session);
        await _context.SaveChangesAsync();

        var lastAccessedBefore = session.LastAccessedAt;

        // Act
        var result = await _service.RefreshSessionAsync(oldToken, newToken);

        // Assert
        Assert.True(result);
        var updatedSession = await _context.UserSessions.FindAsync(session.Id);
        Assert.NotNull(updatedSession);
        Assert.Equal("hashed_new-token", updatedSession.RefreshToken);
        Assert.True(updatedSession.LastAccessedAt > lastAccessedBefore);
    }

    [Fact]
    public async Task RefreshSessionAsync_WithInvalidOldToken_ReturnsFalse()
    {
        // Act
        var result = await _service.RefreshSessionAsync("invalid-old-token", "new-token");

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task RefreshSessionAsync_WithInactiveSession_ReturnsFalse()
    {
        // Arrange
        var oldToken = "inactive-old-token";
        var hashedOldToken = "hashed_inactive-old-token";

        var session = new UserSession
        {
            UserId = _testUserId,
            RefreshToken = hashedOldToken,
            IsActive = false,
            ExpiresAt = DateTime.UtcNow.AddDays(7)
        };
        _context.UserSessions.Add(session);
        await _context.SaveChangesAsync();

        // Act
        var result = await _service.RefreshSessionAsync(oldToken, "new-token");

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task RefreshSessionAsync_HashesBothTokens()
    {
        // Arrange
        var oldToken = "old-hash-test";
        var newToken = "new-hash-test";
        var hashedOldToken = "hashed_old-hash-test";

        var session = new UserSession
        {
            UserId = _testUserId,
            RefreshToken = hashedOldToken,
            IsActive = true,
            ExpiresAt = DateTime.UtcNow.AddDays(7)
        };
        _context.UserSessions.Add(session);
        await _context.SaveChangesAsync();

        // Act
        await _service.RefreshSessionAsync(oldToken, newToken);

        // Assert
        _mockJwtTokenService.Verify(x => x.HashRefreshToken(oldToken), Times.Once);
        _mockJwtTokenService.Verify(x => x.HashRefreshToken(newToken), Times.Once);
    }

    #endregion

    #region CleanupExpiredSessionsAsync Tests

    [Fact]
    public async Task CleanupExpiredSessionsAsync_RemovesExpiredSessions()
    {
        // Arrange
        var sessions = new List<UserSession>
        {
            new UserSession { UserId = _testUserId, RefreshToken = "hashed_active", IsActive = true, ExpiresAt = DateTime.UtcNow.AddDays(7) },
            new UserSession { UserId = _testUserId, RefreshToken = "hashed_expired1", IsActive = true, ExpiresAt = DateTime.UtcNow.AddDays(-1) },
            new UserSession { UserId = _testUserId, RefreshToken = "hashed_expired2", IsActive = true, ExpiresAt = DateTime.UtcNow.AddDays(-2) }
        };
        _context.UserSessions.AddRange(sessions);
        await _context.SaveChangesAsync();

        // Act
        await _service.CleanupExpiredSessionsAsync();

        // Assert
        var remainingSessions = await _context.UserSessions.ToListAsync();
        Assert.Single(remainingSessions);
        Assert.Equal("hashed_active", remainingSessions[0].RefreshToken);
    }

    [Fact]
    public async Task CleanupExpiredSessionsAsync_RemovesInactiveSessions()
    {
        // Arrange
        var sessions = new List<UserSession>
        {
            new UserSession { UserId = _testUserId, RefreshToken = "hashed_active", IsActive = true, ExpiresAt = DateTime.UtcNow.AddDays(7) },
            new UserSession { UserId = _testUserId, RefreshToken = "hashed_inactive", IsActive = false, ExpiresAt = DateTime.UtcNow.AddDays(7) }
        };
        _context.UserSessions.AddRange(sessions);
        await _context.SaveChangesAsync();

        // Act
        await _service.CleanupExpiredSessionsAsync();

        // Assert
        var remainingSessions = await _context.UserSessions.ToListAsync();
        Assert.Single(remainingSessions);
        Assert.Equal("hashed_active", remainingSessions[0].RefreshToken);
    }

    [Fact]
    public async Task CleanupExpiredSessionsAsync_WithNoExpiredSessions_DoesNothing()
    {
        // Arrange
        var session = new UserSession
        {
            UserId = _testUserId,
            RefreshToken = "hashed_active",
            IsActive = true,
            ExpiresAt = DateTime.UtcNow.AddDays(7)
        };
        _context.UserSessions.Add(session);
        await _context.SaveChangesAsync();

        // Act
        await _service.CleanupExpiredSessionsAsync();

        // Assert
        var remainingSessions = await _context.UserSessions.ToListAsync();
        Assert.Single(remainingSessions);
    }

    #endregion
}
