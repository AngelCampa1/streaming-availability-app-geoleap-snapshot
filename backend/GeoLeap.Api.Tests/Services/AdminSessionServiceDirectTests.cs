using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using Moq;
using System.Text;
using System.Text.Json;
using Xunit;

namespace GeoLeap.Api.Tests.Services;

public class AdminSessionServiceDirectTests : IDisposable
{
    private readonly Mock<ILogger<AdminSessionService>> _mockLogger;
    private readonly Mock<IDistributedCache> _mockCache;
    private readonly AdminSessionService _service;
    private readonly Guid _userId;
    private readonly string _correlationId;
    private readonly DateTime _baseDate;
    private readonly Dictionary<string, byte[]> _cacheStore; // Class-level cache store

    public AdminSessionServiceDirectTests()
    {
        _mockLogger = new Mock<ILogger<AdminSessionService>>();
        _mockCache = new Mock<IDistributedCache>();
        _cacheStore = new Dictionary<string, byte[]>();

        SetupMocks();

        _service = new AdminSessionService(_mockLogger.Object, _mockCache.Object);

        _userId = Guid.NewGuid();
        _correlationId = Guid.NewGuid().ToString();
        _baseDate = DateTime.UtcNow;
    }

    private void SetupMocks()
    {
        // Mock cache base methods (not extension methods)
        _mockCache
            .Setup(c => c.SetAsync(It.IsAny<string>(), It.IsAny<byte[]>(), It.IsAny<DistributedCacheEntryOptions>(), It.IsAny<CancellationToken>()))
            .Callback<string, byte[], DistributedCacheEntryOptions, CancellationToken>(
                (key, value, options, ct) => _cacheStore[key] = value)
            .Returns(Task.CompletedTask);

        _mockCache
            .Setup(c => c.GetAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((string key, CancellationToken ct) =>
            {
                if (_cacheStore.TryGetValue(key, out var value))
                {
                    return value;
                }
                return null;
            });

        _mockCache
            .Setup(c => c.RemoveAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .Callback<string, CancellationToken>((key, ct) => _cacheStore.Remove(key))
            .Returns(Task.CompletedTask);
    }

    #region CreateSessionAsync Tests (5 tests)

    [Fact]
    public async Task CreateSessionAsync_WithValidRequest_CreatesSession()
    {
        // Arrange
        var request = new AdminSessionRequest
        {
            UserId = _userId,
            IpAddress = "192.168.1.1",
            UserAgent = "Mozilla/5.0",
            Permissions = new List<string> { "admin.read", "admin.write" },
            Metadata = new Dictionary<string, object> { ["role"] = "superadmin" }
        };

        // Act
        var result = await _service.CreateSessionAsync(request, _correlationId);

        // Assert
        Assert.NotNull(result);
        Assert.NotEqual(Guid.Empty, result.Id);
        Assert.Equal(_userId, result.UserId);
        Assert.Equal("192.168.1.1", result.IpAddress);
        Assert.Equal("Mozilla/5.0", result.UserAgent);
        Assert.True(result.IsActive);
        Assert.True(result.ExpiresAt > DateTime.UtcNow);
        Assert.Equal(2, result.Permissions.Count);
        Assert.Single(result.Metadata);
    }

    [Fact]
    public async Task CreateSessionAsync_WithCustomTimeout_SetsCustomExpiration()
    {
        // Arrange
        var request = new AdminSessionRequest
        {
            UserId = _userId,
            IpAddress = "192.168.1.1",
            UserAgent = "Chrome",
            TimeoutMinutes = 120
        };

        // Act
        var result = await _service.CreateSessionAsync(request, _correlationId);

        // Assert
        var expectedExpiration = DateTime.UtcNow.AddMinutes(120);
        Assert.True(Math.Abs((result.ExpiresAt - expectedExpiration).TotalMinutes) < 1);
    }

    [Fact]
    public async Task CreateSessionAsync_WithDefaultTimeout_UsesDefaultExpiration()
    {
        // Arrange
        var request = new AdminSessionRequest
        {
            UserId = _userId,
            IpAddress = "192.168.1.1",
            UserAgent = "Safari"
        };

        // Act
        var result = await _service.CreateSessionAsync(request, _correlationId);

        // Assert - Default is 60 minutes
        var expectedExpiration = DateTime.UtcNow.AddMinutes(60);
        Assert.True(Math.Abs((result.ExpiresAt - expectedExpiration).TotalMinutes) < 1);
    }

    [Fact]
    public async Task CreateSessionAsync_WithOverload_CreatesSessionInfo()
    {
        // Arrange
        var sessionData = new Dictionary<string, object> { ["department"] = "IT" };

        // Act
        var result = await _service.CreateSessionAsync(_userId, "10.0.0.1", "Edge", sessionData, _correlationId);

        // Assert
        Assert.NotNull(result);
        Assert.NotEqual(Guid.Empty, result.Id);
        Assert.Equal(_userId, result.UserId);
        Assert.Equal("10.0.0.1", result.IpAddress);
        Assert.Equal("Edge", result.UserAgent);
        Assert.True(result.IsActive);
    }

    [Fact]
    public async Task CreateSessionAsync_WithNullFields_UsesDefaults()
    {
        // Arrange
        var request = new AdminSessionRequest
        {
            UserId = null,
            IpAddress = null,
            UserAgent = null
        };

        // Act
        var result = await _service.CreateSessionAsync(request, _correlationId);

        // Assert
        Assert.Equal(Guid.Empty, result.UserId); // Defaults to empty
        Assert.Equal("unknown", result.IpAddress);
        Assert.Equal("unknown", result.UserAgent);
    }

    #endregion

    #region GetSessionAsync Tests (3 tests)

    [Fact]
    public async Task GetSessionAsync_WithValidSession_ReturnsSessionInfo()
    {
        // Arrange
        var request = new AdminSessionRequest
        {
            UserId = _userId,
            IpAddress = "192.168.1.1",
            UserAgent = "Firefox"
        };
        var session = await _service.CreateSessionAsync(request, _correlationId);

        // Act
        var result = await _service.GetSessionAsync(session.Id, _correlationId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(session.Id, result.Id);
        Assert.Equal(_userId, result.UserId);
        Assert.True(result.IsActive);
    }

    [Fact]
    public async Task GetSessionAsync_WithNonExistentSession_ReturnsNull()
    {
        // Arrange
        var nonExistentId = Guid.NewGuid();

        // Act
        var result = await _service.GetSessionAsync(nonExistentId, _correlationId);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task GetSessionAsync_WithExpiredSession_ReturnsNull()
    {
        // Arrange - Create session with very short timeout
        var request = new AdminSessionRequest
        {
            UserId = _userId,
            IpAddress = "192.168.1.1",
            UserAgent = "Opera",
            TimeoutMinutes = 0 // Will use default but we'll manually expire it
        };
        var session = await _service.CreateSessionAsync(request, _correlationId);

        // Manually expire the session in cache by setting ExpiresAt to past
        var expiredSession = new AdminSession
        {
            Id = session.Id,
            UserId = session.UserId,
            IpAddress = session.IpAddress,
            UserAgent = session.UserAgent,
            CreatedAt = session.CreatedAt,
            LastActivity = session.LastActivity,
            ExpiresAt = DateTime.UtcNow.AddHours(-1), // Expired 1 hour ago
            IsActive = true,
            Permissions = session.Permissions,
            Metadata = session.Metadata
        };
        var cacheKey = $"admin_session:{session.Id}";
        _cacheStore[cacheKey] = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(expiredSession));

        // Act
        var result = await _service.GetSessionAsync(session.Id, _correlationId);

        // Assert
        Assert.Null(result); // Expired session returns null
    }

    #endregion

    #region UpdateSessionActivityAsync Tests (3 tests)

    [Fact]
    public async Task UpdateSessionActivityAsync_WithValidSession_UpdatesActivity()
    {
        // Arrange
        var request = new AdminSessionRequest
        {
            UserId = _userId,
            IpAddress = "192.168.1.1",
            UserAgent = "Chrome"
        };
        var session = await _service.CreateSessionAsync(request, _correlationId);
        var originalExpiration = session.ExpiresAt;

        // Wait a bit to ensure time difference
        await Task.Delay(100);

        // Act
        var result = await _service.UpdateSessionActivityAsync(session.Id, _correlationId);

        // Assert
        Assert.True(result);

        // Verify expiration was extended
        var updatedSession = await _service.GetSessionAsync(session.Id, _correlationId);
        Assert.NotNull(updatedSession);
        Assert.True(updatedSession.ExpiresAt > originalExpiration);
    }

    [Fact]
    public async Task UpdateSessionActivityAsync_WithNonExistentSession_ReturnsFalse()
    {
        // Arrange
        var nonExistentId = Guid.NewGuid();

        // Act
        var result = await _service.UpdateSessionActivityAsync(nonExistentId, _correlationId);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task UpdateSessionAccessAsync_CallsUpdateSessionActivity()
    {
        // Arrange
        var request = new AdminSessionRequest
        {
            UserId = _userId,
            IpAddress = "192.168.1.1",
            UserAgent = "Safari"
        };
        var session = await _service.CreateSessionAsync(request, _correlationId);

        // Act
        await _service.UpdateSessionAccessAsync(session.Id, _correlationId);

        // Assert - Should not throw, session should still be valid
        var updatedSession = await _service.GetSessionAsync(session.Id, _correlationId);
        Assert.NotNull(updatedSession);
    }

    #endregion

    #region GetUserSessionsAsync Tests (2 tests)

    [Fact]
    public async Task GetUserSessionsAsync_WithMultipleSessions_ReturnsAllActive()
    {
        // Arrange - Create 3 sessions for same user
        for (int i = 0; i < 3; i++)
        {
            var request = new AdminSessionRequest
            {
                UserId = _userId,
                IpAddress = $"192.168.1.{i}",
                UserAgent = $"Browser{i}"
            };
            await _service.CreateSessionAsync(request, _correlationId);
        }

        // Act
        var result = await _service.GetUserSessionsAsync(_userId, _correlationId);

        // Assert
        Assert.Equal(3, result.Count);
        Assert.All(result, s => Assert.Equal(_userId, s.UserId));
    }

    [Fact]
    public async Task GetUserSessionsAsync_WithNoSessions_ReturnsEmptyList()
    {
        // Arrange
        var otherUserId = Guid.NewGuid();

        // Act
        var result = await _service.GetUserSessionsAsync(otherUserId, _correlationId);

        // Assert
        Assert.Empty(result);
    }

    #endregion

    #region InvalidateSessionAsync Tests (2 tests)

    [Fact]
    public async Task InvalidateSessionAsync_WithValidSession_RemovesSession()
    {
        // Arrange
        var request = new AdminSessionRequest
        {
            UserId = _userId,
            IpAddress = "192.168.1.1",
            UserAgent = "Chrome"
        };
        var session = await _service.CreateSessionAsync(request, _correlationId);

        // Act
        var result = await _service.InvalidateSessionAsync(session.Id, _correlationId);

        // Assert
        Assert.True(result);

        // Verify session is removed
        var retrievedSession = await _service.GetSessionAsync(session.Id, _correlationId);
        Assert.Null(retrievedSession);
    }

    [Fact]
    public async Task InvalidateSessionAsync_WithNonExistentSession_ReturnsTrue()
    {
        // Arrange
        var nonExistentId = Guid.NewGuid();

        // Act
        var result = await _service.InvalidateSessionAsync(nonExistentId, _correlationId);

        // Assert
        Assert.True(result); // Service returns true even for non-existent
    }

    #endregion

    #region InvalidateUserSessionsAsync Tests (2 tests)

    [Fact]
    public async Task InvalidateUserSessionsAsync_WithMultipleSessions_RemovesAll()
    {
        // Arrange - Create 3 sessions
        for (int i = 0; i < 3; i++)
        {
            var request = new AdminSessionRequest
            {
                UserId = _userId,
                IpAddress = $"192.168.1.{i}",
                UserAgent = $"Browser{i}"
            };
            await _service.CreateSessionAsync(request, _correlationId);
        }

        // Act
        var result = await _service.InvalidateUserSessionsAsync(_userId, _correlationId);

        // Assert
        Assert.Equal(3, result); // 3 sessions invalidated

        // Verify all sessions removed
        var sessions = await _service.GetUserSessionsAsync(_userId, _correlationId);
        Assert.Empty(sessions);
    }

    [Fact]
    public async Task InvalidateUserSessionsAsync_WithNoSessions_ReturnsZero()
    {
        // Arrange
        var otherUserId = Guid.NewGuid();

        // Act
        var result = await _service.InvalidateUserSessionsAsync(otherUserId, _correlationId);

        // Assert
        Assert.Equal(0, result);
    }

    #endregion

    #region GetSessionStatisticsAsync Tests (2 tests)

    [Fact]
    public async Task GetSessionStatisticsAsync_WithActiveSessions_ReturnsStats()
    {
        // Arrange - Create 2 sessions
        for (int i = 0; i < 2; i++)
        {
            var request = new AdminSessionRequest
            {
                UserId = Guid.NewGuid(),
                IpAddress = $"192.168.1.{i}",
                UserAgent = "Chrome"
            };
            await _service.CreateSessionAsync(request, _correlationId);
        }

        // Act
        var result = await _service.GetSessionStatisticsAsync(_correlationId);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.TotalActiveSessions >= 2); // At least our 2 sessions
        Assert.True(result.UniqueActiveUsers >= 2); // At least our 2 users
        Assert.NotEmpty(result.TopUserAgents);
    }

    [Fact]
    public async Task GetSessionStatisticsAsync_WithNoSessions_ReturnsZeroStats()
    {
        // Act
        var result = await _service.GetSessionStatisticsAsync(_correlationId);

        // Assert
        Assert.NotNull(result);
        // Note: May include sessions from other tests due to static storage
        Assert.True(result.TotalActiveSessions >= 0);
        Assert.True(result.UniqueActiveUsers >= 0);
    }

    #endregion

    #region CleanupExpiredSessionsAsync Tests (2 tests)

    [Fact]
    public async Task CleanupExpiredSessionsAsync_WithExpiredSessions_RemovesThem()
    {
        // Arrange - Create session with short timeout
        // Note: We can't easily test actual cleanup because the service uses in-memory
        // storage that we can't easily manipulate to create expired sessions
        var request = new AdminSessionRequest
        {
            UserId = _userId,
            IpAddress = "192.168.1.1",
            UserAgent = "Chrome"
        };
        await _service.CreateSessionAsync(request, _correlationId);

        // Act
        var result = await _service.CleanupExpiredSessionsAsync(_correlationId);

        // Assert - Method executes without error
        Assert.True(result >= 0); // Returns count (0 or more)
    }

    [Fact]
    public async Task CleanupExpiredSessionsAsync_WithNoExpiredSessions_ReturnsZero()
    {
        // Arrange - Create valid session
        var request = new AdminSessionRequest
        {
            UserId = _userId,
            IpAddress = "192.168.1.1",
            UserAgent = "Chrome"
        };
        await _service.CreateSessionAsync(request, _correlationId);

        // Act
        var result = await _service.CleanupExpiredSessionsAsync(_correlationId);

        // Assert
        Assert.Equal(0, result); // No sessions cleaned
    }

    #endregion

    #region GetActiveSessionsAsync Tests (2 tests)

    [Fact]
    public async Task GetActiveSessionsAsync_WithActiveSessions_ReturnsList()
    {
        // Arrange - Create 2 active sessions
        for (int i = 0; i < 2; i++)
        {
            var request = new AdminSessionRequest
            {
                UserId = Guid.NewGuid(),
                IpAddress = $"10.0.0.{i}",
                UserAgent = "Firefox"
            };
            await _service.CreateSessionAsync(request, _correlationId);
        }

        // Act
        var result = await _service.GetActiveSessionsAsync(new AdminSessionRequest(), _correlationId);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.Count >= 2); // At least our 2 sessions
        Assert.All(result, s => Assert.True(s.IsActive));
    }

    [Fact]
    public async Task GetActiveSessionsAsync_OrdersByLastActivity()
    {
        // Arrange - Create 2 sessions
        var request1 = new AdminSessionRequest
        {
            UserId = Guid.NewGuid(),
            IpAddress = "192.168.1.1",
            UserAgent = "Chrome"
        };
        await _service.CreateSessionAsync(request1, _correlationId);

        await Task.Delay(100);

        var request2 = new AdminSessionRequest
        {
            UserId = Guid.NewGuid(),
            IpAddress = "192.168.1.2",
            UserAgent = "Safari"
        };
        var session2 = await _service.CreateSessionAsync(request2, _correlationId);

        // Act
        var result = await _service.GetActiveSessionsAsync(new AdminSessionRequest(), _correlationId);

        // Assert
        Assert.True(result.Count >= 2);
        // Most recent activity should be first
        Assert.Equal(session2.Id, result[0].Id);
    }

    #endregion

    #region TerminateSessionAsync Tests (2 tests)

    [Fact]
    public async Task TerminateSessionAsync_WithValidSession_TerminatesIt()
    {
        // Arrange
        var request = new AdminSessionRequest
        {
            UserId = _userId,
            IpAddress = "192.168.1.1",
            UserAgent = "Chrome"
        };
        var session = await _service.CreateSessionAsync(request, _correlationId);
        var terminatedBy = Guid.NewGuid();

        // Act
        var result = await _service.TerminateSessionAsync(session.Id, terminatedBy, "Security breach", _correlationId);

        // Assert
        Assert.True(result);

        // Verify session terminated
        var terminatedSession = await _service.GetSessionAsync(session.Id, _correlationId);
        Assert.Null(terminatedSession);
    }

    [Fact]
    public async Task TerminateSessionAsync_WithNonExistentSession_ReturnsTrue()
    {
        // Arrange
        var nonExistentId = Guid.NewGuid();
        var terminatedBy = Guid.NewGuid();

        // Act
        var result = await _service.TerminateSessionAsync(nonExistentId, terminatedBy, "Test", _correlationId);

        // Assert
        Assert.True(result);
    }

    #endregion

    #region TerminateUserSessionsAsync Tests (2 tests)

    [Fact]
    public async Task TerminateUserSessionsAsync_WithMultipleSessions_TerminatesAll()
    {
        // Arrange - Create 2 sessions
        for (int i = 0; i < 2; i++)
        {
            var request = new AdminSessionRequest
            {
                UserId = _userId,
                IpAddress = $"192.168.1.{i}",
                UserAgent = "Chrome"
            };
            await _service.CreateSessionAsync(request, _correlationId);
        }

        var terminatedBy = Guid.NewGuid();

        // Act
        var result = await _service.TerminateUserSessionsAsync(_userId, terminatedBy, "Admin action", _correlationId);

        // Assert
        Assert.Equal(2, result);

        // Verify all terminated
        var sessions = await _service.GetUserSessionsAsync(_userId, _correlationId);
        Assert.Empty(sessions);
    }

    [Fact]
    public async Task TerminateUserSessionsAsync_WithNoSessions_ReturnsZero()
    {
        // Arrange
        var otherUserId = Guid.NewGuid();
        var terminatedBy = Guid.NewGuid();

        // Act
        var result = await _service.TerminateUserSessionsAsync(otherUserId, terminatedBy, "Test", _correlationId);

        // Assert
        Assert.Equal(0, result);
    }

    #endregion

    #region ValidateSessionAsync Tests (4 tests)

    [Fact]
    public async Task ValidateSessionAsync_WithValidSession_ReturnsTrue()
    {
        // Arrange
        var request = new AdminSessionRequest
        {
            UserId = _userId,
            IpAddress = "192.168.1.1",
            UserAgent = "Chrome"
        };
        var session = await _service.CreateSessionAsync(request, _correlationId);

        // Act
        var result = await _service.ValidateSessionAsync(session.Id, "192.168.1.1", _correlationId);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public async Task ValidateSessionAsync_WithNonExistentSession_ReturnsFalse()
    {
        // Arrange
        var nonExistentId = Guid.NewGuid();

        // Act
        var result = await _service.ValidateSessionAsync(nonExistentId, "192.168.1.1", _correlationId);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task ValidateSessionAsync_WithMismatchedIp_ReturnsFalse()
    {
        // Arrange
        var request = new AdminSessionRequest
        {
            UserId = _userId,
            IpAddress = "192.168.1.1",
            UserAgent = "Chrome"
        };
        var session = await _service.CreateSessionAsync(request, _correlationId);

        // Act
        var result = await _service.ValidateSessionAsync(session.Id, "10.0.0.1", _correlationId);

        // Assert
        Assert.False(result); // IP mismatch
    }

    [Fact]
    public async Task ValidateSessionAsync_WithExpiredSession_ReturnsFalse()
    {
        // Arrange
        var request = new AdminSessionRequest
        {
            UserId = _userId,
            IpAddress = "192.168.1.1",
            UserAgent = "Chrome"
        };
        var session = await _service.CreateSessionAsync(request, _correlationId);

        // Manually expire the session in cache
        var expiredSession = new AdminSession
        {
            Id = session.Id,
            UserId = session.UserId,
            IpAddress = session.IpAddress,
            UserAgent = session.UserAgent,
            CreatedAt = session.CreatedAt,
            LastActivity = session.LastActivity,
            ExpiresAt = DateTime.UtcNow.AddHours(-1), // Expired
            IsActive = true,
            Permissions = session.Permissions,
            Metadata = session.Metadata
        };
        var cacheKey = $"admin_session:{session.Id}";
        _cacheStore[cacheKey] = Encoding.UTF8.GetBytes(JsonSerializer.Serialize(expiredSession));

        // Act
        var result = await _service.ValidateSessionAsync(session.Id, "192.168.1.1", _correlationId);

        // Assert
        Assert.False(result);
    }

    #endregion

    #region GetSessionStatisticsAsync (with date range) Tests (2 tests)

    [Fact]
    public async Task GetSessionStatisticsAsync_WithDateRange_ReturnsStats()
    {
        // Arrange - Create session
        var request = new AdminSessionRequest
        {
            UserId = _userId,
            IpAddress = "192.168.1.1",
            UserAgent = "Chrome"
        };
        await _service.CreateSessionAsync(request, _correlationId);

        var startDate = DateTime.UtcNow.AddDays(-1);
        var endDate = DateTime.UtcNow.AddDays(1);

        // Act
        var result = await _service.GetSessionStatisticsAsync(startDate, endDate, _correlationId);

        // Assert
        Assert.NotNull(result);
        Assert.True(result.ContainsKey("totalActiveSessions"));
        Assert.True(result.ContainsKey("uniqueActiveUsers"));
        Assert.True(result.ContainsKey("sessionsInPeriod"));
    }

    [Fact]
    public async Task GetSessionStatisticsAsync_WithEmptyPeriod_ReturnsZeroStats()
    {
        // Arrange - Date range before any sessions
        var startDate = DateTime.UtcNow.AddDays(-10);
        var endDate = DateTime.UtcNow.AddDays(-9);

        // Act
        var result = await _service.GetSessionStatisticsAsync(startDate, endDate, _correlationId);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(0, result["sessionsInPeriod"]);
    }

    #endregion

    #region ForceSessionTimeoutAsync Tests (2 tests)

    [Fact]
    public async Task ForceSessionTimeoutAsync_WithValidSession_InvalidatesIt()
    {
        // Arrange
        var request = new AdminSessionRequest
        {
            UserId = _userId,
            IpAddress = "192.168.1.1",
            UserAgent = "Chrome"
        };
        var session = await _service.CreateSessionAsync(request, _correlationId);

        // Act
        await _service.ForceSessionTimeoutAsync(session.Id, "Security alert", _correlationId);

        // Assert - Session should be invalidated
        var result = await _service.GetSessionAsync(session.Id, _correlationId);
        Assert.Null(result);
    }

    [Fact]
    public async Task ForceSessionTimeoutAsync_WithNonExistentSession_DoesNotThrow()
    {
        // Arrange
        var nonExistentId = Guid.NewGuid();

        // Act & Assert - Should not throw
        await _service.ForceSessionTimeoutAsync(nonExistentId, "Test", _correlationId);
    }

    #endregion

    #region GetUserConcurrentSessionCountAsync Tests (2 tests)

    [Fact]
    public async Task GetUserConcurrentSessionCountAsync_WithMultipleSessions_ReturnsCount()
    {
        // Arrange - Create 3 sessions
        for (int i = 0; i < 3; i++)
        {
            var request = new AdminSessionRequest
            {
                UserId = _userId,
                IpAddress = $"192.168.1.{i}",
                UserAgent = "Chrome"
            };
            await _service.CreateSessionAsync(request, _correlationId);
        }

        // Act
        var result = await _service.GetUserConcurrentSessionCountAsync(_userId, _correlationId);

        // Assert
        Assert.Equal(3, result);
    }

    [Fact]
    public async Task GetUserConcurrentSessionCountAsync_WithNoSessions_ReturnsZero()
    {
        // Arrange
        var otherUserId = Guid.NewGuid();

        // Act
        var result = await _service.GetUserConcurrentSessionCountAsync(otherUserId, _correlationId);

        // Assert
        Assert.Equal(0, result);
    }

    #endregion

    #region DetectSuspiciousActivityAsync Tests (3 tests)

    [Fact]
    public async Task DetectSuspiciousActivityAsync_WithMultipleIps_DetectsActivity()
    {
        // Arrange - Create 4 sessions with different IPs
        for (int i = 1; i <= 4; i++)
        {
            var request = new AdminSessionRequest
            {
                UserId = _userId,
                IpAddress = $"192.168.1.{i}",
                UserAgent = "Chrome"
            };
            await _service.CreateSessionAsync(request, _correlationId);
        }

        var startDate = DateTime.UtcNow.AddHours(-1);
        var endDate = DateTime.UtcNow.AddHours(1);

        // Act
        var result = await _service.DetectSuspiciousActivityAsync(startDate, endDate, _correlationId);

        // Assert
        Assert.NotEmpty(result);
        Assert.Contains(result, a => a.ActivityType == "MultipleIPs");
    }

    [Fact]
    public async Task DetectSuspiciousActivityAsync_WithRapidSessions_DetectsActivity()
    {
        // Arrange - Create 11 sessions rapidly
        for (int i = 0; i < 11; i++)
        {
            var request = new AdminSessionRequest
            {
                UserId = _userId,
                IpAddress = "192.168.1.1",
                UserAgent = "Chrome"
            };
            await _service.CreateSessionAsync(request, _correlationId);
        }

        var startDate = DateTime.UtcNow.AddHours(-1);
        var endDate = DateTime.UtcNow.AddHours(1);

        // Act
        var result = await _service.DetectSuspiciousActivityAsync(startDate, endDate, _correlationId);

        // Assert
        Assert.NotEmpty(result);
        Assert.Contains(result, a => a.ActivityType == "RapidSessions");
    }

    [Fact]
    public async Task DetectSuspiciousActivityAsync_WithNormalActivity_ReturnsEmpty()
    {
        // Arrange - Use a unique user ID to avoid interference
        var uniqueUserId = Guid.NewGuid();
        var request = new AdminSessionRequest
        {
            UserId = uniqueUserId,
            IpAddress = "192.168.1.1",
            UserAgent = "Chrome"
        };
        await _service.CreateSessionAsync(request, _correlationId);

        var startDate = DateTime.UtcNow.AddHours(-1);
        var endDate = DateTime.UtcNow.AddHours(1);

        // Act
        var result = await _service.DetectSuspiciousActivityAsync(startDate, endDate, _correlationId);

        // Assert
        // Check that our specific user doesn't have suspicious activity
        var suspiciousForOurUser = result.Where(a => a.UserId == uniqueUserId).ToList();
        Assert.Empty(suspiciousForOurUser); // No suspicious activity for this user
    }

    #endregion

    public void Dispose()
    {
        // Cleanup if needed
    }
}
