using GeoLeap.Api.Services;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using Moq;
using System.Text;
using System.Text.Json;
using Xunit;

namespace GeoLeap.Api.Tests.Services;

/// <summary>
/// Direct tests for AccountLockoutService covering all 5 public methods
/// Service: AccountLockoutService.cs (166 LOC)
/// Focus: Brute force protection, account lockout (2.0x business value multiplier)
/// </summary>
public class AccountLockoutServiceDirectTests
{
    private readonly Mock<IDistributedCache> _mockCache;
    private readonly Mock<ILogger<AccountLockoutService>> _mockLogger;
    private readonly AccountLockoutService _service;

    public AccountLockoutServiceDirectTests()
    {
        _mockCache = new Mock<IDistributedCache>();
        _mockLogger = new Mock<ILogger<AccountLockoutService>>();
        _service = new AccountLockoutService(_mockCache.Object, _mockLogger.Object);
    }

    #region IsLockedOutAsync Tests

    [Fact]
    public async Task IsLockedOutAsync_WithNoLockoutInfo_ReturnsFalse()
    {
        // Arrange
        var email = "test@example.com";
        _mockCache.Setup(x => x.GetAsync(It.IsAny<string>(), default))
            .ReturnsAsync((byte[]?)null);

        // Act
        var result = await _service.IsLockedOutAsync(email);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task IsLockedOutAsync_WithActiveLockout_ReturnsTrue()
    {
        // Arrange
        var email = "locked@example.com";
        var lockoutInfo = new
        {
            Email = email,
            Attempts = new List<DateTime>(),
            IsLocked = true,
            LockoutEnd = DateTime.UtcNow.AddMinutes(10) // Still locked
        };

        var json = JsonSerializer.Serialize(lockoutInfo);
        _mockCache.Setup(x => x.GetAsync(It.IsAny<string>(), default))
            .ReturnsAsync(Encoding.UTF8.GetBytes(json));

        // Act
        var result = await _service.IsLockedOutAsync(email);

        // Assert
        Assert.True(result);
    }

    [Fact]
    public async Task IsLockedOutAsync_WithExpiredLockout_ReturnsFalse()
    {
        // Arrange
        var email = "expired@example.com";
        var lockoutInfo = new
        {
            Email = email,
            Attempts = new List<DateTime>(),
            IsLocked = true,
            LockoutEnd = DateTime.UtcNow.AddMinutes(-5) // Lockout expired
        };

        var json = JsonSerializer.Serialize(lockoutInfo);
        _mockCache.Setup(x => x.GetAsync(It.IsAny<string>(), default))
            .ReturnsAsync(Encoding.UTF8.GetBytes(json));

        // Also setup for RemoveAsync which will be called to clear
        _mockCache.Setup(x => x.RemoveAsync(It.IsAny<string>(), default))
            .Returns(Task.CompletedTask);

        // Act
        var result = await _service.IsLockedOutAsync(email);

        // Assert
        Assert.False(result);
        _mockCache.Verify(x => x.RemoveAsync(It.IsAny<string>(), default), Times.Once);
    }

    [Fact]
    public async Task IsLockedOutAsync_WithNotLocked_ReturnsFalse()
    {
        // Arrange
        var email = "notlocked@example.com";
        var lockoutInfo = new
        {
            Email = email,
            Attempts = new List<DateTime> { DateTime.UtcNow.AddMinutes(-5) },
            IsLocked = false,
            LockoutEnd = (DateTime?)null
        };

        var json = JsonSerializer.Serialize(lockoutInfo);
        _mockCache.Setup(x => x.GetAsync(It.IsAny<string>(), default))
            .ReturnsAsync(Encoding.UTF8.GetBytes(json));

        // Act
        var result = await _service.IsLockedOutAsync(email);

        // Assert
        Assert.False(result);
    }

    [Fact]
    public async Task IsLockedOutAsync_WithCacheError_ReturnsFalse()
    {
        // Arrange
        var email = "error@example.com";
        _mockCache.Setup(x => x.GetAsync(It.IsAny<string>(), default))
            .ThrowsAsync(new Exception("Cache error"));

        // Act
        var result = await _service.IsLockedOutAsync(email);

        // Assert
        Assert.False(result); // Default to not locked on error
    }

    #endregion

    #region RecordFailedAttemptAsync Tests

    [Fact]
    public async Task RecordFailedAttemptAsync_WithFirstAttempt_RecordsAttempt()
    {
        // Arrange
        var email = "first@example.com";
        _mockCache.Setup(x => x.GetAsync(It.IsAny<string>(), default))
            .ReturnsAsync((byte[]?)null);

        _mockCache.Setup(x => x.SetAsync(It.IsAny<string>(), It.IsAny<byte[]>(),
            It.IsAny<DistributedCacheEntryOptions>(), default))
            .Returns(Task.CompletedTask);

        // Act
        await _service.RecordFailedAttemptAsync(email);

        // Assert
        _mockCache.Verify(x => x.SetAsync(
            It.IsAny<string>(),
            It.Is<byte[]>(b => CheckLockoutInfo(b, 1, false)),
            It.IsAny<DistributedCacheEntryOptions>(),
            default), Times.Once);
    }

    [Fact]
    public async Task RecordFailedAttemptAsync_WithFourAttempts_DoesNotLock()
    {
        // Arrange
        var email = "four@example.com";
        var lockoutInfo = new
        {
            Email = email,
            Attempts = new List<DateTime>
            {
                DateTime.UtcNow.AddMinutes(-10),
                DateTime.UtcNow.AddMinutes(-8),
                DateTime.UtcNow.AddMinutes(-5)
            },
            IsLocked = false,
            LockoutEnd = (DateTime?)null
        };

        var json = JsonSerializer.Serialize(lockoutInfo);
        _mockCache.Setup(x => x.GetAsync(It.IsAny<string>(), default))
            .ReturnsAsync(Encoding.UTF8.GetBytes(json));

        _mockCache.Setup(x => x.SetAsync(It.IsAny<string>(), It.IsAny<byte[]>(),
            It.IsAny<DistributedCacheEntryOptions>(), default))
            .Returns(Task.CompletedTask);

        // Act
        await _service.RecordFailedAttemptAsync(email);

        // Assert - Should have 4 attempts but not locked
        _mockCache.Verify(x => x.SetAsync(
            It.IsAny<string>(),
            It.Is<byte[]>(b => CheckLockoutInfo(b, 4, false)),
            It.IsAny<DistributedCacheEntryOptions>(),
            default), Times.Once);
    }

    [Fact]
    public async Task RecordFailedAttemptAsync_WithFifthAttempt_LocksAccount()
    {
        // Arrange
        var email = "five@example.com";
        var lockoutInfo = new
        {
            Email = email,
            Attempts = new List<DateTime>
            {
                DateTime.UtcNow.AddMinutes(-12),
                DateTime.UtcNow.AddMinutes(-10),
                DateTime.UtcNow.AddMinutes(-8),
                DateTime.UtcNow.AddMinutes(-5)
            },
            IsLocked = false,
            LockoutEnd = (DateTime?)null
        };

        var json = JsonSerializer.Serialize(lockoutInfo);
        _mockCache.Setup(x => x.GetAsync(It.IsAny<string>(), default))
            .ReturnsAsync(Encoding.UTF8.GetBytes(json));

        _mockCache.Setup(x => x.SetAsync(It.IsAny<string>(), It.IsAny<byte[]>(),
            It.IsAny<DistributedCacheEntryOptions>(), default))
            .Returns(Task.CompletedTask);

        // Act
        await _service.RecordFailedAttemptAsync(email);

        // Assert - Should have 5 attempts and be locked
        _mockCache.Verify(x => x.SetAsync(
            It.IsAny<string>(),
            It.Is<byte[]>(b => CheckLockoutInfo(b, 5, true)),
            It.IsAny<DistributedCacheEntryOptions>(),
            default), Times.Once);
    }

    [Fact]
    public async Task RecordFailedAttemptAsync_WithOldAttempts_CleansWindow()
    {
        // Arrange
        var email = "old@example.com";
        var lockoutInfo = new
        {
            Email = email,
            Attempts = new List<DateTime>
            {
                DateTime.UtcNow.AddMinutes(-20), // Outside 15-minute window
                DateTime.UtcNow.AddMinutes(-16), // Outside window
                DateTime.UtcNow.AddMinutes(-5)   // Inside window
            },
            IsLocked = false,
            LockoutEnd = (DateTime?)null
        };

        var json = JsonSerializer.Serialize(lockoutInfo);
        _mockCache.Setup(x => x.GetAsync(It.IsAny<string>(), default))
            .ReturnsAsync(Encoding.UTF8.GetBytes(json));

        _mockCache.Setup(x => x.SetAsync(It.IsAny<string>(), It.IsAny<byte[]>(),
            It.IsAny<DistributedCacheEntryOptions>(), default))
            .Returns(Task.CompletedTask);

        // Act
        await _service.RecordFailedAttemptAsync(email);

        // Assert - Should only have 2 attempts (1 recent + 1 new)
        _mockCache.Verify(x => x.SetAsync(
            It.IsAny<string>(),
            It.Is<byte[]>(b => CheckLockoutInfo(b, 2, false)),
            It.IsAny<DistributedCacheEntryOptions>(),
            default), Times.Once);
    }

    [Fact]
    public async Task RecordFailedAttemptAsync_WithCacheError_DoesNotThrow()
    {
        // Arrange
        var email = "error@example.com";
        _mockCache.Setup(x => x.GetAsync(It.IsAny<string>(), default))
            .ThrowsAsync(new Exception("Cache error"));

        // Act & Assert - Should not throw
        await _service.RecordFailedAttemptAsync(email);
    }

    #endregion

    #region ClearFailedAttemptsAsync Tests

    [Fact]
    public async Task ClearFailedAttemptsAsync_RemovesFromCache()
    {
        // Arrange
        var email = "clear@example.com";
        _mockCache.Setup(x => x.RemoveAsync(It.IsAny<string>(), default))
            .Returns(Task.CompletedTask);

        // Act
        await _service.ClearFailedAttemptsAsync(email);

        // Assert
        _mockCache.Verify(x => x.RemoveAsync(
            It.Is<string>(k => k.Contains("lockout_") && k.Contains(email.ToLowerInvariant())),
            default), Times.Once);
    }

    [Fact]
    public async Task ClearFailedAttemptsAsync_WithCacheError_DoesNotThrow()
    {
        // Arrange
        var email = "error@example.com";
        _mockCache.Setup(x => x.RemoveAsync(It.IsAny<string>(), default))
            .ThrowsAsync(new Exception("Cache error"));

        // Act & Assert - Should not throw
        await _service.ClearFailedAttemptsAsync(email);
    }

    #endregion

    #region GetFailedAttemptsCountAsync Tests

    [Fact]
    public async Task GetFailedAttemptsCountAsync_WithNoAttempts_ReturnsZero()
    {
        // Arrange
        var email = "none@example.com";
        _mockCache.Setup(x => x.GetAsync(It.IsAny<string>(), default))
            .ReturnsAsync((byte[]?)null);

        // Act
        var result = await _service.GetFailedAttemptsCountAsync(email);

        // Assert
        Assert.Equal(0, result);
    }

    [Fact]
    public async Task GetFailedAttemptsCountAsync_WithRecentAttempts_ReturnsCount()
    {
        // Arrange
        var email = "count@example.com";
        var lockoutInfo = new
        {
            Email = email,
            Attempts = new List<DateTime>
            {
                DateTime.UtcNow.AddMinutes(-10),
                DateTime.UtcNow.AddMinutes(-5),
                DateTime.UtcNow.AddMinutes(-2)
            },
            IsLocked = false,
            LockoutEnd = (DateTime?)null
        };

        var json = JsonSerializer.Serialize(lockoutInfo);
        _mockCache.Setup(x => x.GetAsync(It.IsAny<string>(), default))
            .ReturnsAsync(Encoding.UTF8.GetBytes(json));

        // Act
        var result = await _service.GetFailedAttemptsCountAsync(email);

        // Assert
        Assert.Equal(3, result);
    }

    [Fact]
    public async Task GetFailedAttemptsCountAsync_WithOldAttempts_ExcludesOld()
    {
        // Arrange
        var email = "oldcount@example.com";
        var lockoutInfo = new
        {
            Email = email,
            Attempts = new List<DateTime>
            {
                DateTime.UtcNow.AddMinutes(-20), // Outside window
                DateTime.UtcNow.AddMinutes(-16), // Outside window
                DateTime.UtcNow.AddMinutes(-5)   // Inside window
            },
            IsLocked = false,
            LockoutEnd = (DateTime?)null
        };

        var json = JsonSerializer.Serialize(lockoutInfo);
        _mockCache.Setup(x => x.GetAsync(It.IsAny<string>(), default))
            .ReturnsAsync(Encoding.UTF8.GetBytes(json));

        // Act
        var result = await _service.GetFailedAttemptsCountAsync(email);

        // Assert
        Assert.Equal(1, result); // Only 1 recent attempt
    }

    [Fact]
    public async Task GetFailedAttemptsCountAsync_WithCacheError_ReturnsZero()
    {
        // Arrange
        var email = "error@example.com";
        _mockCache.Setup(x => x.GetAsync(It.IsAny<string>(), default))
            .ThrowsAsync(new Exception("Cache error"));

        // Act
        var result = await _service.GetFailedAttemptsCountAsync(email);

        // Assert
        Assert.Equal(0, result);
    }

    #endregion

    #region GetLockoutEndAsync Tests

    [Fact]
    public async Task GetLockoutEndAsync_WithNoLockout_ReturnsNull()
    {
        // Arrange
        var email = "none@example.com";
        _mockCache.Setup(x => x.GetAsync(It.IsAny<string>(), default))
            .ReturnsAsync((byte[]?)null);

        // Act
        var result = await _service.GetLockoutEndAsync(email);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task GetLockoutEndAsync_WithActiveLockout_ReturnsEndTime()
    {
        // Arrange
        var email = "locked@example.com";
        var lockoutEnd = DateTime.UtcNow.AddMinutes(10);
        var lockoutInfo = new
        {
            Email = email,
            Attempts = new List<DateTime>(),
            IsLocked = true,
            LockoutEnd = lockoutEnd
        };

        var json = JsonSerializer.Serialize(lockoutInfo);
        _mockCache.Setup(x => x.GetAsync(It.IsAny<string>(), default))
            .ReturnsAsync(Encoding.UTF8.GetBytes(json));

        // Act
        var result = await _service.GetLockoutEndAsync(email);

        // Assert
        Assert.NotNull(result);
        Assert.True((result.Value - lockoutEnd).TotalSeconds < 1); // Within 1 second
    }

    [Fact]
    public async Task GetLockoutEndAsync_WithNotLocked_ReturnsNull()
    {
        // Arrange
        var email = "notlocked@example.com";
        var lockoutInfo = new
        {
            Email = email,
            Attempts = new List<DateTime> { DateTime.UtcNow.AddMinutes(-5) },
            IsLocked = false,
            LockoutEnd = (DateTime?)null
        };

        var json = JsonSerializer.Serialize(lockoutInfo);
        _mockCache.Setup(x => x.GetAsync(It.IsAny<string>(), default))
            .ReturnsAsync(Encoding.UTF8.GetBytes(json));

        // Act
        var result = await _service.GetLockoutEndAsync(email);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task GetLockoutEndAsync_WithCacheError_ReturnsNull()
    {
        // Arrange
        var email = "error@example.com";
        _mockCache.Setup(x => x.GetAsync(It.IsAny<string>(), default))
            .ThrowsAsync(new Exception("Cache error"));

        // Act
        var result = await _service.GetLockoutEndAsync(email);

        // Assert
        Assert.Null(result);
    }

    #endregion

    #region Edge Case Tests

    [Fact]
    public async Task RecordFailedAttemptAsync_WithEmptyEmail_DoesNotThrow()
    {
        // Arrange
        var email = "";
        _mockCache.Setup(x => x.GetAsync(It.IsAny<string>(), default))
            .ReturnsAsync((byte[]?)null);
        _mockCache.Setup(x => x.SetAsync(It.IsAny<string>(), It.IsAny<byte[]>(),
            It.IsAny<DistributedCacheEntryOptions>(), default))
            .Returns(Task.CompletedTask);

        // Act & Assert - Should not throw
        await _service.RecordFailedAttemptAsync(email);
    }

    [Fact]
    public async Task IsLockedOutAsync_WithMalformedJson_ReturnsFalse()
    {
        // Arrange
        var email = "malformed@example.com";
        var malformedJson = "{malformed";
        _mockCache.Setup(x => x.GetAsync(It.IsAny<string>(), default))
            .ReturnsAsync(Encoding.UTF8.GetBytes(malformedJson));

        // Act
        var result = await _service.IsLockedOutAsync(email);

        // Assert
        Assert.False(result); // Should handle gracefully
    }

    [Fact]
    public async Task RecordFailedAttemptAsync_AtExactlyFiveAttempts_LocksAccount()
    {
        // Arrange - Account with exactly 4 previous attempts
        var email = "exactlyfive@example.com";
        var lockoutInfo = new
        {
            Email = email,
            Attempts = new List<DateTime>
            {
                DateTime.UtcNow.AddMinutes(-12),
                DateTime.UtcNow.AddMinutes(-10),
                DateTime.UtcNow.AddMinutes(-8),
                DateTime.UtcNow.AddMinutes(-5)
            },
            IsLocked = false,
            LockoutEnd = (DateTime?)null
        };

        var json = JsonSerializer.Serialize(lockoutInfo);
        _mockCache.Setup(x => x.GetAsync(It.IsAny<string>(), default))
            .ReturnsAsync(Encoding.UTF8.GetBytes(json));
        _mockCache.Setup(x => x.SetAsync(It.IsAny<string>(), It.IsAny<byte[]>(),
            It.IsAny<DistributedCacheEntryOptions>(), default))
            .Returns(Task.CompletedTask);

        // Act
        await _service.RecordFailedAttemptAsync(email);

        // Assert - 5th attempt should trigger lockout
        _mockCache.Verify(x => x.SetAsync(
            It.IsAny<string>(),
            It.Is<byte[]>(b => CheckLockoutInfo(b, 5, true)),
            It.IsAny<DistributedCacheEntryOptions>(),
            default), Times.Once);
    }

    [Fact]
    public async Task GetLockoutEndAsync_WithExpiredLockout_StillReturnsEndTime()
    {
        // Arrange
        var email = "expiredlockout@example.com";
        var lockoutEnd = DateTime.UtcNow.AddMinutes(-5); // Expired
        var lockoutInfo = new
        {
            Email = email,
            Attempts = new List<DateTime>(),
            IsLocked = true,
            LockoutEnd = lockoutEnd
        };

        var json = JsonSerializer.Serialize(lockoutInfo);
        _mockCache.Setup(x => x.GetAsync(It.IsAny<string>(), default))
            .ReturnsAsync(Encoding.UTF8.GetBytes(json));

        // Act - GetLockoutEndAsync doesn't clear, only reads
        var lockoutEndTime = await _service.GetLockoutEndAsync(email);

        // Assert - Returns the end time even if expired
        Assert.NotNull(lockoutEndTime);
        Assert.True((lockoutEndTime.Value - lockoutEnd).TotalSeconds < 1);
    }

    [Fact]
    public async Task RecordFailedAttemptAsync_WithAllOldAttempts_ResetsCounter()
    {
        // Arrange - All attempts are outside 15-minute window
        var email = "allold@example.com";
        var lockoutInfo = new
        {
            Email = email,
            Attempts = new List<DateTime>
            {
                DateTime.UtcNow.AddMinutes(-30),
                DateTime.UtcNow.AddMinutes(-25),
                DateTime.UtcNow.AddMinutes(-20),
                DateTime.UtcNow.AddMinutes(-16)
            },
            IsLocked = false,
            LockoutEnd = (DateTime?)null
        };

        var json = JsonSerializer.Serialize(lockoutInfo);
        _mockCache.Setup(x => x.GetAsync(It.IsAny<string>(), default))
            .ReturnsAsync(Encoding.UTF8.GetBytes(json));
        _mockCache.Setup(x => x.SetAsync(It.IsAny<string>(), It.IsAny<byte[]>(),
            It.IsAny<DistributedCacheEntryOptions>(), default))
            .Returns(Task.CompletedTask);

        // Act
        await _service.RecordFailedAttemptAsync(email);

        // Assert - Should only have 1 attempt (the new one)
        _mockCache.Verify(x => x.SetAsync(
            It.IsAny<string>(),
            It.Is<byte[]>(b => CheckLockoutInfo(b, 1, false)),
            It.IsAny<DistributedCacheEntryOptions>(),
            default), Times.Once);
    }

    [Fact]
    public async Task ClearFailedAttemptsAsync_WithEmptyEmail_DoesNotThrow()
    {
        // Arrange
        var email = "";
        _mockCache.Setup(x => x.RemoveAsync(It.IsAny<string>(), default))
            .Returns(Task.CompletedTask);

        // Act & Assert - Should not throw
        await _service.ClearFailedAttemptsAsync(email);
    }

    [Fact]
    public async Task GetFailedAttemptsCountAsync_WithEmptyEmail_ReturnsZero()
    {
        // Arrange
        var email = "";
        _mockCache.Setup(x => x.GetAsync(It.IsAny<string>(), default))
            .ReturnsAsync((byte[]?)null);

        // Act
        var result = await _service.GetFailedAttemptsCountAsync(email);

        // Assert
        Assert.Equal(0, result);
    }

    [Fact]
    public async Task IsLockedOutAsync_WithEmailCaseDifference_UsesLowercaseKey()
    {
        // Arrange
        var email = "TEST@EXAMPLE.COM";
        _mockCache.Setup(x => x.GetAsync(
            It.Is<string>(k => k.Contains("test@example.com")),
            default))
            .ReturnsAsync((byte[]?)null);

        // Act
        var result = await _service.IsLockedOutAsync(email);

        // Assert
        Assert.False(result);
        _mockCache.Verify(x => x.GetAsync(
            It.Is<string>(k => k.Contains("test@example.com")),
            default), Times.Once);
    }

    #endregion

    #region Helper Methods

    private static bool CheckLockoutInfo(byte[] jsonBytes, int expectedAttempts, bool expectedLocked)
    {
        try
        {
            var json = Encoding.UTF8.GetString(jsonBytes);
            var doc = JsonDocument.Parse(json);
            var root = doc.RootElement;

            var attemptsCount = root.GetProperty("Attempts").GetArrayLength();
            var isLocked = root.GetProperty("IsLocked").GetBoolean();

            return attemptsCount == expectedAttempts && isLocked == expectedLocked;
        }
        catch
        {
            return false;
        }
    }

    #endregion
}
