using GeoLeap.Api.Data;
using GeoLeap.Api.Models;
using GeoLeap.Api.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace GeoLeap.Api.Tests.Services;

/// <summary>
/// Direct tests for TokenCleanupService - Password reset token cleanup
/// Service: TokenCleanupService.cs (120 LOC, 3 methods)
/// Focus: Security token management (2.0x business value multiplier)
/// </summary>
public class TokenCleanupServiceDirectTests : IDisposable
{
    private readonly ApplicationDbContext _context;
    private readonly ServiceProvider _serviceProvider;
    private readonly Mock<ILogger<TokenCleanupService>> _mockLogger;
    private readonly TokenCleanupService _service;
    private readonly DbContextOptions<ApplicationDbContext> _options;

    public TokenCleanupServiceDirectTests()
    {
        _options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"TokenCleanupTests_{Guid.NewGuid()}")
            .Options;

        _context = new ApplicationDbContext(_options);

        // Setup service provider with DbContextOptions (not instance)
        // This allows the service to create its own scoped contexts
        var services = new ServiceCollection();
        services.AddScoped<ApplicationDbContext>(_ => new ApplicationDbContext(_options));
        _serviceProvider = services.BuildServiceProvider();

        _mockLogger = new Mock<ILogger<TokenCleanupService>>();

        _service = new TokenCleanupService(
            _mockLogger.Object,
            _serviceProvider
        );
    }

    public void Dispose()
    {
        _service.Dispose();
        _serviceProvider.Dispose();
        _context.Database.EnsureDeleted();
        _context.Dispose();
    }

    #region StartAsync Tests

    [Fact]
    public async Task StartAsync_Initializes_LogsStarting()
    {
        // Act
        await _service.StartAsync(CancellationToken.None);

        // Assert
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Token Cleanup Service is starting")),
                null,
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task StartAsync_CompletesSuccessfully_ReturnsCompletedTask()
    {
        // Act
        await _service.StartAsync(CancellationToken.None);

        // Assert - should complete without throwing (no exception = success)
    }

    #endregion

    #region StopAsync Tests

    [Fact]
    public async Task StopAsync_StopsService_LogsStopping()
    {
        // Arrange
        await _service.StartAsync(CancellationToken.None);

        // Act
        await _service.StopAsync(CancellationToken.None);

        // Assert
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Token Cleanup Service is stopping")),
                null,
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task StopAsync_CompletesSuccessfully_ReturnsCompletedTask()
    {
        // Arrange
        await _service.StartAsync(CancellationToken.None);

        // Act
        await _service.StopAsync(CancellationToken.None);

        // Assert - should complete without throwing (no exception = success)
    }

    #endregion

    #region Cleanup Logic Tests (via reflection for private method testing)

    [Fact]
    public async Task DoCleanupAsync_WithExpiredTokens_RemovesOldTokens()
    {
        // Arrange - Add expired tokens (older than 30 days)
        var expiredToken1 = new PasswordResetToken
        {
            UserId = Guid.NewGuid(),
            Token = "expired-token-1",
            Email = "test1@example.com",
            ExpiresAt = DateTime.UtcNow.AddDays(-31), // 31 days old
            IsUsed = false
        };

        var expiredToken2 = new PasswordResetToken
        {
            UserId = Guid.NewGuid(),
            Token = "expired-token-2",
            Email = "test2@example.com",
            ExpiresAt = DateTime.UtcNow.AddDays(-35), // 35 days old
            IsUsed = false
        };

        var recentExpiredToken = new PasswordResetToken
        {
            UserId = Guid.NewGuid(),
            Token = "recent-expired-token",
            Email = "test3@example.com",
            ExpiresAt = DateTime.UtcNow.AddDays(-5), // Only 5 days old - should NOT be deleted
            IsUsed = false
        };

        var activeToken = new PasswordResetToken
        {
            UserId = Guid.NewGuid(),
            Token = "active-token",
            Email = "test4@example.com",
            ExpiresAt = DateTime.UtcNow.AddDays(1), // Not expired
            IsUsed = false
        };

        _context.PasswordResetTokens.AddRange(expiredToken1, expiredToken2, recentExpiredToken, activeToken);
        await _context.SaveChangesAsync();

        // Act - Use reflection to invoke private DoCleanupAsync method
        var method = typeof(TokenCleanupService).GetMethod("DoCleanupAsync",
            System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
        var task = (Task?)method?.Invoke(_service, null);
        if (task != null) await task;

        // Small delay to ensure async operations complete
        await Task.Delay(100);

        // Assert
        var remainingTokens = await _context.PasswordResetTokens.ToListAsync();
        Assert.Equal(2, remainingTokens.Count); // Only recent expired and active tokens remain
        Assert.Contains(remainingTokens, t => t.Token == "recent-expired-token");
        Assert.Contains(remainingTokens, t => t.Token == "active-token");
        Assert.DoesNotContain(remainingTokens, t => t.Token == "expired-token-1");
        Assert.DoesNotContain(remainingTokens, t => t.Token == "expired-token-2");
    }

    [Fact]
    public async Task DoCleanupAsync_WithNoExpiredTokens_DoesNotRemoveAny()
    {
        // Arrange - Add only recent/active tokens
        var recentToken = new PasswordResetToken
        {
            UserId = Guid.NewGuid(),
            Token = "recent-token",
            Email = "recent@example.com",
            ExpiresAt = DateTime.UtcNow.AddDays(-5),
            IsUsed = false
        };

        var activeToken = new PasswordResetToken
        {
            UserId = Guid.NewGuid(),
            Token = "active-token",
            Email = "active@example.com",
            ExpiresAt = DateTime.UtcNow.AddDays(1),
            IsUsed = false
        };

        _context.PasswordResetTokens.AddRange(recentToken, activeToken);
        await _context.SaveChangesAsync();

        // Act
        var method = typeof(TokenCleanupService).GetMethod("DoCleanupAsync",
            System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
        var task = (Task?)method?.Invoke(_service, null);
        if (task != null) await task;

        await Task.Delay(100);

        // Assert
        var remainingTokens = await _context.PasswordResetTokens.CountAsync();
        Assert.Equal(2, remainingTokens);
    }

    [Fact]
    public async Task DoCleanupAsync_WithNoTokens_LogsNoExpiredTokens()
    {
        // Arrange - Empty database

        // Act
        var method = typeof(TokenCleanupService).GetMethod("DoCleanupAsync",
            System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
        var task = (Task?)method?.Invoke(_service, null);
        if (task != null) await task;

        await Task.Delay(100);

        // Assert
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("No expired tokens found")),
                null,
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.AtLeastOnce);
    }

    [Fact]
    public async Task DoCleanupAsync_WithMixedTokens_OnlyRemovesOldExpired()
    {
        // Arrange - Mix of all token types
        var veryOldExpired = new PasswordResetToken
        {
            UserId = Guid.NewGuid(),
            Token = "very-old-expired",
            Email = "veryold@example.com",
            ExpiresAt = DateTime.UtcNow.AddDays(-60), // 60 days old - DELETE
            IsUsed = false
        };

        var oldExpired = new PasswordResetToken
        {
            UserId = Guid.NewGuid(),
            Token = "old-expired",
            Email = "old@example.com",
            ExpiresAt = DateTime.UtcNow.AddDays(-31), // 31 days old - DELETE
            IsUsed = true // Even if used, should be deleted if old enough
        };

        var recentExpired = new PasswordResetToken
        {
            UserId = Guid.NewGuid(),
            Token = "recent-expired",
            Email = "recentexp@example.com",
            ExpiresAt = DateTime.UtcNow.AddDays(-10), // 10 days old - KEEP
            IsUsed = false
        };

        var usedButRecent = new PasswordResetToken
        {
            UserId = Guid.NewGuid(),
            Token = "used-recent",
            Email = "usedrecent@example.com",
            ExpiresAt = DateTime.UtcNow.AddDays(-15), // 15 days old - KEEP
            IsUsed = true
        };

        var active = new PasswordResetToken
        {
            UserId = Guid.NewGuid(),
            Token = "active",
            Email = "active2@example.com",
            ExpiresAt = DateTime.UtcNow.AddHours(1), // Future - KEEP
            IsUsed = false
        };

        _context.PasswordResetTokens.AddRange(veryOldExpired, oldExpired, recentExpired, usedButRecent, active);
        await _context.SaveChangesAsync();

        // Act
        var method = typeof(TokenCleanupService).GetMethod("DoCleanupAsync",
            System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
        var task = (Task?)method?.Invoke(_service, null);
        if (task != null) await task;

        await Task.Delay(100);

        // Assert
        var remainingTokens = await _context.PasswordResetTokens.ToListAsync();
        Assert.Equal(3, remainingTokens.Count); // Should have 3 tokens remaining
        Assert.Contains(remainingTokens, t => t.Token == "recent-expired");
        Assert.Contains(remainingTokens, t => t.Token == "used-recent");
        Assert.Contains(remainingTokens, t => t.Token == "active");
    }

    [Fact]
    public async Task DoCleanupAsync_LogsTokenCount_WhenTokensDeleted()
    {
        // Arrange
        var expiredToken = new PasswordResetToken
        {
            UserId = Guid.NewGuid(),
            Token = "expired",
            Email = "expired@example.com",
            ExpiresAt = DateTime.UtcNow.AddDays(-31),
            IsUsed = false
        };

        _context.PasswordResetTokens.Add(expiredToken);
        await _context.SaveChangesAsync();

        // Act
        var method = typeof(TokenCleanupService).GetMethod("DoCleanupAsync",
            System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
        var task = (Task?)method?.Invoke(_service, null);
        if (task != null) await task;

        await Task.Delay(100);

        // Assert - Verify logging of token deletion
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Found") && v.ToString()!.Contains("expired tokens")),
                null,
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.AtLeastOnce);

        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Successfully deleted")),
                null,
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.AtLeastOnce);
    }

    [Fact]
    public async Task DoCleanupAsync_LogsStatistics_AfterCleanup()
    {
        // Arrange
        var expiredToken = new PasswordResetToken
        {
            UserId = Guid.NewGuid(),
            Token = "expired",
            Email = "expiredstats@example.com",
            ExpiresAt = DateTime.UtcNow.AddDays(-31),
            IsUsed = false
        };

        var activeToken = new PasswordResetToken
        {
            UserId = Guid.NewGuid(),
            Token = "active",
            Email = "activestats@example.com",
            ExpiresAt = DateTime.UtcNow.AddDays(1),
            IsUsed = false
        };

        _context.PasswordResetTokens.AddRange(expiredToken, activeToken);
        await _context.SaveChangesAsync();

        // Act
        var method = typeof(TokenCleanupService).GetMethod("DoCleanupAsync",
            System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
        var task = (Task?)method?.Invoke(_service, null);
        if (task != null) await task;

        await Task.Delay(100);

        // Assert - Verify statistics logging
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Token cleanup statistics")),
                null,
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.AtLeastOnce);
    }

    [Fact]
    public async Task DoCleanupAsync_LogsJobStartAndEnd()
    {
        // Act
        var method = typeof(TokenCleanupService).GetMethod("DoCleanupAsync",
            System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
        var task = (Task?)method?.Invoke(_service, null);
        if (task != null) await task;

        await Task.Delay(100);

        // Assert
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Token cleanup job started")),
                null,
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.AtLeastOnce);

        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Token cleanup job completed")),
                null,
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.AtLeastOnce);
    }

    #endregion

    #region Edge Cases and Error Handling

    [Fact]
    public async Task DoCleanupAsync_WithLargeNumberOfExpiredTokens_DeletesAll()
    {
        // Arrange - Create 100 expired tokens
        var expiredTokens = Enumerable.Range(1, 100).Select(i => new PasswordResetToken
        {
            UserId = Guid.NewGuid(),
            Token = $"expired-token-{i}",
            Email = $"bulk{i}@example.com",
            ExpiresAt = DateTime.UtcNow.AddDays(-31),
            IsUsed = false
        }).ToList();

        _context.PasswordResetTokens.AddRange(expiredTokens);
        await _context.SaveChangesAsync();

        // Act
        var method = typeof(TokenCleanupService).GetMethod("DoCleanupAsync",
            System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
        var task = (Task?)method?.Invoke(_service, null);
        if (task != null) await task;

        await Task.Delay(100);

        // Assert
        var remainingCount = await _context.PasswordResetTokens.CountAsync();
        Assert.Equal(0, remainingCount);
    }

    [Fact]
    public async Task DoCleanupAsync_With30DayBoundary_CorrectlyIdentifiesExpired()
    {
        // Arrange - Test the 30-day retention boundary
        // Service uses ExpiresAt < cutoffDate, so we need to account for timing
        var token29DaysOld = new PasswordResetToken
        {
            UserId = Guid.NewGuid(),
            Token = "29-days-old",
            Email = "day29@example.com",
            ExpiresAt = DateTime.UtcNow.AddDays(-29), // 29 days - should NOT be deleted
            IsUsed = false
        };

        var token31DaysOld = new PasswordResetToken
        {
            UserId = Guid.NewGuid(),
            Token = "31-days-old",
            Email = "day31@example.com",
            ExpiresAt = DateTime.UtcNow.AddDays(-31), // 31 days - should be deleted
            IsUsed = false
        };

        _context.PasswordResetTokens.AddRange(token29DaysOld, token31DaysOld);
        await _context.SaveChangesAsync();

        // Act
        var method = typeof(TokenCleanupService).GetMethod("DoCleanupAsync",
            System.Reflection.BindingFlags.NonPublic | System.Reflection.BindingFlags.Instance);
        var task = (Task?)method?.Invoke(_service, null);
        if (task != null) await task;

        await Task.Delay(100);

        // Assert
        var remainingTokens = await _context.PasswordResetTokens.ToListAsync();
        Assert.Single(remainingTokens);
        Assert.Equal("29-days-old", remainingTokens[0].Token);
    }

    #endregion

    #region Dispose Tests

    [Fact]
    public void Dispose_DisposesResources_DoesNotThrow()
    {
        // Arrange
        var service = new TokenCleanupService(_mockLogger.Object, _serviceProvider);

        // Act & Assert - Should not throw
        service.Dispose();
    }

    [Fact]
    public void Dispose_CalledMultipleTimes_DoesNotThrow()
    {
        // Arrange
        var service = new TokenCleanupService(_mockLogger.Object, _serviceProvider);

        // Act & Assert - Should not throw on multiple calls
        service.Dispose();
        service.Dispose();
    }

    #endregion
}
