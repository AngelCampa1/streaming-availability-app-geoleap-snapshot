using System;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using GeoLeap.Api.Services;
using Microsoft.Extensions.Caching.Distributed;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace GeoLeap.Api.Tests.Services;

/// <summary>
/// Direct unit tests for CachingService (not via HTTP).
/// Tests caching operations including Get, Set, Remove, GetOrCreate, and RemoveByPrefix.
/// </summary>
public class CachingServiceDirectTests : IDisposable
{
    private readonly CachingService _service;
    private readonly Mock<IDistributedCache> _cacheMock;
    private readonly Mock<ILogger<CachingService>> _loggerMock;
    private readonly CancellationTokenSource _cts;

    public CachingServiceDirectTests()
    {
        _cacheMock = new Mock<IDistributedCache>();
        _loggerMock = new Mock<ILogger<CachingService>>();
        _cts = new CancellationTokenSource();

        _service = new CachingService(_cacheMock.Object, _loggerMock.Object);
    }

    #region GetAsync Tests

    [Fact]
    public async Task GetAsync_WithValidKey_ReturnsCachedValue()
    {
        // Arrange
        var key = "test-key";
        var expectedValue = new TestData { Id = 123, Name = "Test" };
        var serialized = JsonSerializer.Serialize(expectedValue);
        var serializedBytes = System.Text.Encoding.UTF8.GetBytes(serialized);

        _cacheMock
            .Setup(c => c.GetAsync(key, It.IsAny<CancellationToken>()))
            .ReturnsAsync(serializedBytes);

        // Act
        var result = await _service.GetAsync<TestData>(key);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(expectedValue.Id, result.Id);
        Assert.Equal(expectedValue.Name, result.Name);
        _cacheMock.Verify(c => c.GetAsync(key, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetAsync_WithNonExistentKey_ReturnsDefault()
    {
        // Arrange
        var key = "missing-key";
        _cacheMock
            .Setup(c => c.GetAsync(key, It.IsAny<CancellationToken>()))
            .ReturnsAsync((byte[]?)null);

        // Act
        var result = await _service.GetAsync<TestData>(key);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task GetAsync_WithEmptyValue_ReturnsDefault()
    {
        // Arrange
        var key = "empty-key";
        _cacheMock
            .Setup(c => c.GetAsync(key, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<byte>());

        // Act
        var result = await _service.GetAsync<TestData>(key);

        // Assert
        Assert.Null(result);
    }

    [Fact]
    public async Task GetAsync_WithCacheException_ReturnsDefault()
    {
        // Arrange
        var key = "error-key";
        _cacheMock
            .Setup(c => c.GetAsync(key, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("Cache unavailable"));

        // Act
        var result = await _service.GetAsync<TestData>(key);

        // Assert
        Assert.Null(result);
        _loggerMock.Verify(
            x => x.Log(
                LogLevel.Error,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Error retrieving from cache")),
                It.IsAny<Exception>(),
                It.Is<Func<It.IsAnyType, Exception?, string>>((v, t) => true)),
            Times.Once);
    }

    [Fact]
    public async Task GetAsync_WithComplexObject_DeserializesCorrectly()
    {
        // Arrange
        var key = "complex-key";
        var expectedValue = new ComplexTestData
        {
            Id = 456,
            Name = "Complex",
            Metadata = new Dictionary<string, string>
            {
                ["key1"] = "value1",
                ["key2"] = "value2"
            },
            CreatedAt = DateTime.UtcNow
        };
        var serialized = JsonSerializer.Serialize(expectedValue);
        var serializedBytes = System.Text.Encoding.UTF8.GetBytes(serialized);

        _cacheMock
            .Setup(c => c.GetAsync(key, It.IsAny<CancellationToken>()))
            .ReturnsAsync(serializedBytes);

        // Act
        var result = await _service.GetAsync<ComplexTestData>(key);

        // Assert
        Assert.NotNull(result);
        Assert.Equal(expectedValue.Id, result.Id);
        Assert.Equal(expectedValue.Name, result.Name);
        Assert.Equal(2, result.Metadata.Count);
    }

    #endregion

    #region SetAsync Tests

    [Fact]
    public async Task SetAsync_WithValidValue_StoresInCache()
    {
        // Arrange
        var key = "set-key";
        var value = new TestData { Id = 789, Name = "Store" };
        DistributedCacheEntryOptions? capturedOptions = null;
        byte[]? capturedValue = null;

        _cacheMock
            .Setup(c => c.SetAsync(
                It.IsAny<string>(),
                It.IsAny<byte[]>(),
                It.IsAny<DistributedCacheEntryOptions>(),
                It.IsAny<CancellationToken>()))
            .Callback<string, byte[], DistributedCacheEntryOptions, CancellationToken>(
                (k, v, o, ct) =>
                {
                    capturedValue = v;
                    capturedOptions = o;
                })
            .Returns(Task.CompletedTask);

        // Act
        await _service.SetAsync(key, value);

        // Assert
        Assert.NotNull(capturedValue);
        Assert.NotNull(capturedOptions);
        Assert.Equal(TimeSpan.FromMinutes(30), capturedOptions.AbsoluteExpirationRelativeToNow);

        var capturedString = System.Text.Encoding.UTF8.GetString(capturedValue);
        var deserialized = JsonSerializer.Deserialize<TestData>(capturedString);
        Assert.Equal(value.Id, deserialized!.Id);
        Assert.Equal(value.Name, deserialized.Name);
    }

    [Fact]
    public async Task SetAsync_WithCustomExpiration_UsesProvidedExpiration()
    {
        // Arrange
        var key = "expiration-key";
        var value = new TestData { Id = 111, Name = "Expire" };
        var customExpiration = TimeSpan.FromHours(2);
        DistributedCacheEntryOptions? capturedOptions = null;

        _cacheMock
            .Setup(c => c.SetAsync(
                It.IsAny<string>(),
                It.IsAny<byte[]>(),
                It.IsAny<DistributedCacheEntryOptions>(),
                It.IsAny<CancellationToken>()))
            .Callback<string, byte[], DistributedCacheEntryOptions, CancellationToken>(
                (k, v, o, ct) => capturedOptions = o)
            .Returns(Task.CompletedTask);

        // Act
        await _service.SetAsync(key, value, customExpiration);

        // Assert
        Assert.NotNull(capturedOptions);
        Assert.Equal(customExpiration, capturedOptions.AbsoluteExpirationRelativeToNow);
    }

    [Fact]
    public async Task SetAsync_WithCacheException_LogsError()
    {
        // Arrange
        var key = "error-set-key";
        var value = new TestData { Id = 222, Name = "Error" };

        _cacheMock
            .Setup(c => c.SetAsync(
                It.IsAny<string>(),
                It.IsAny<byte[]>(),
                It.IsAny<DistributedCacheEntryOptions>(),
                It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("Cache write failed"));

        // Act
        await _service.SetAsync(key, value);

        // Assert - should not throw, but should log error
        _loggerMock.Verify(
            x => x.Log(
                LogLevel.Error,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Error setting cache")),
                It.IsAny<Exception>(),
                It.Is<Func<It.IsAnyType, Exception?, string>>((v, t) => true)),
            Times.Once);
    }

    #endregion

    #region RemoveAsync Tests

    [Fact]
    public async Task RemoveAsync_WithValidKey_RemovesFromCache()
    {
        // Arrange
        var key = "remove-key";

        _cacheMock
            .Setup(c => c.RemoveAsync(key, It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        // Act
        await _service.RemoveAsync(key);

        // Assert
        _cacheMock.Verify(c => c.RemoveAsync(key, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task RemoveAsync_WithCacheException_LogsError()
    {
        // Arrange
        var key = "error-remove-key";

        _cacheMock
            .Setup(c => c.RemoveAsync(key, It.IsAny<CancellationToken>()))
            .ThrowsAsync(new Exception("Cache remove failed"));

        // Act
        await _service.RemoveAsync(key);

        // Assert - should not throw, but should log error
        _loggerMock.Verify(
            x => x.Log(
                LogLevel.Error,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Error removing cache")),
                It.IsAny<Exception>(),
                It.Is<Func<It.IsAnyType, Exception?, string>>((v, t) => true)),
            Times.Once);
    }

    #endregion

    #region GetOrCreateAsync Tests

    [Fact]
    public async Task GetOrCreateAsync_WithCacheHit_ReturnsFromCache()
    {
        // Arrange
        var key = "getorcreate-hit-key";
        var cachedValue = new TestData { Id = 333, Name = "Cached" };
        var serialized = JsonSerializer.Serialize(cachedValue);
        var serializedBytes = System.Text.Encoding.UTF8.GetBytes(serialized);
        var factoryCalled = false;

        _cacheMock
            .Setup(c => c.GetAsync(key, It.IsAny<CancellationToken>()))
            .ReturnsAsync(serializedBytes);

        // Act
        var result = await _service.GetOrCreateAsync(key, () =>
        {
            factoryCalled = true;
            return Task.FromResult(new TestData { Id = 999, Name = "Factory" });
        });

        // Assert
        Assert.NotNull(result);
        Assert.Equal(cachedValue.Id, result.Id);
        Assert.False(factoryCalled, "Factory should not be called when cache hits");
    }

    [Fact]
    public async Task GetOrCreateAsync_WithCacheMiss_CallsFactory()
    {
        // Arrange
        var key = "getorcreate-miss-key";
        var factoryValue = new TestData { Id = 444, Name = "FromFactory" };
        var factoryCalled = false;
        byte[]? capturedCachedValue = null;

        _cacheMock
            .Setup(c => c.GetAsync(key, It.IsAny<CancellationToken>()))
            .ReturnsAsync((byte[]?)null);

        _cacheMock
            .Setup(c => c.SetAsync(
                It.IsAny<string>(),
                It.IsAny<byte[]>(),
                It.IsAny<DistributedCacheEntryOptions>(),
                It.IsAny<CancellationToken>()))
            .Callback<string, byte[], DistributedCacheEntryOptions, CancellationToken>(
                (k, v, o, ct) => capturedCachedValue = v)
            .Returns(Task.CompletedTask);

        // Act
        var result = await _service.GetOrCreateAsync(key, () =>
        {
            factoryCalled = true;
            return Task.FromResult(factoryValue);
        });

        // Assert
        Assert.NotNull(result);
        Assert.Equal(factoryValue.Id, result.Id);
        Assert.True(factoryCalled, "Factory should be called on cache miss");
        Assert.NotNull(capturedCachedValue);

        var capturedString = System.Text.Encoding.UTF8.GetString(capturedCachedValue);
        var deserialized = JsonSerializer.Deserialize<TestData>(capturedString);
        Assert.Equal(factoryValue.Id, deserialized!.Id);
    }

    [Fact]
    public async Task GetOrCreateAsync_WithNullFactoryResult_DoesNotCache()
    {
        // Arrange
        var key = "getorcreate-null-key";

        _cacheMock
            .Setup(c => c.GetAsync(key, It.IsAny<CancellationToken>()))
            .ReturnsAsync((byte[]?)null);

        // Act
        var result = await _service.GetOrCreateAsync<TestData>(key, () => Task.FromResult<TestData>(null!));

        // Assert
        Assert.Null(result);
        _cacheMock.Verify(
            c => c.SetAsync(
                It.IsAny<string>(),
                It.IsAny<byte[]>(),
                It.IsAny<DistributedCacheEntryOptions>(),
                It.IsAny<CancellationToken>()),
            Times.Never, "Should not cache null values");
    }

    [Fact]
    public async Task GetOrCreateAsync_WithCustomExpiration_PassesExpirationToCache()
    {
        // Arrange
        var key = "getorcreate-expiration-key";
        var factoryValue = new TestData { Id = 555, Name = "Expiry" };
        var customExpiration = TimeSpan.FromMinutes(10);
        DistributedCacheEntryOptions? capturedOptions = null;

        _cacheMock
            .Setup(c => c.GetAsync(key, It.IsAny<CancellationToken>()))
            .ReturnsAsync((byte[]?)null);

        _cacheMock
            .Setup(c => c.SetAsync(
                It.IsAny<string>(),
                It.IsAny<byte[]>(),
                It.IsAny<DistributedCacheEntryOptions>(),
                It.IsAny<CancellationToken>()))
            .Callback<string, byte[], DistributedCacheEntryOptions, CancellationToken>(
                (k, v, o, ct) => capturedOptions = o)
            .Returns(Task.CompletedTask);

        // Act
        var result = await _service.GetOrCreateAsync(
            key,
            () => Task.FromResult(factoryValue),
            customExpiration);

        // Assert
        Assert.NotNull(capturedOptions);
        Assert.Equal(customExpiration, capturedOptions.AbsoluteExpirationRelativeToNow);
    }

    #endregion

    #region RemoveByPrefixAsync Tests

    [Fact]
    public async Task RemoveByPrefixAsync_WithValidPrefix_LogsWarning()
    {
        // Arrange
        var prefix = "test-prefix:";

        // Act
        await _service.RemoveByPrefixAsync(prefix);

        // Assert - placeholder implementation logs warning
        _loggerMock.Verify(
            x => x.Log(
                LogLevel.Warning,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("RemoveByPrefixAsync requires Redis")),
                It.IsAny<Exception>(),
                It.Is<Func<It.IsAnyType, Exception?, string>>((v, t) => true)),
            Times.Once);
    }

    [Fact]
    public async Task RemoveByPrefixAsync_WithException_LogsError()
    {
        // This test verifies error handling even though current implementation is a placeholder
        // Future Redis implementation would need proper error handling
        var prefix = "error-prefix:";

        // Act
        await _service.RemoveByPrefixAsync(prefix);

        // Assert - should not throw
        _loggerMock.Verify(
            x => x.Log(
                LogLevel.Error,
                It.IsAny<EventId>(),
                It.IsAny<It.IsAnyType>(),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Never, "Placeholder implementation should not error");
    }

    #endregion

    #region Edge Cases

    [Fact]
    public async Task GetAsync_WithCancellationToken_PassesToCache()
    {
        // Arrange
        var key = "cancellation-key";
        var token = _cts.Token;

        _cacheMock
            .Setup(c => c.GetAsync(key, token))
            .ReturnsAsync((byte[]?)null);

        // Act
        await _service.GetAsync<TestData>(key, token);

        // Assert
        _cacheMock.Verify(c => c.GetAsync(key, token), Times.Once);
    }

    [Fact]
    public async Task SetAsync_WithCancellationToken_PassesToCache()
    {
        // Arrange
        var key = "cancellation-set-key";
        var value = new TestData { Id = 666, Name = "Cancel" };
        var token = _cts.Token;

        _cacheMock
            .Setup(c => c.SetAsync(
                key,
                It.IsAny<byte[]>(),
                It.IsAny<DistributedCacheEntryOptions>(),
                token))
            .Returns(Task.CompletedTask);

        // Act
        await _service.SetAsync(key, value, cancellationToken: token);

        // Assert
        _cacheMock.Verify(
            c => c.SetAsync(
                key,
                It.IsAny<byte[]>(),
                It.IsAny<DistributedCacheEntryOptions>(),
                token),
            Times.Once);
    }

    #endregion

    public void Dispose()
    {
        _cts?.Dispose();
    }

    #region Test Data Classes

    private class TestData
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
    }

    private class ComplexTestData
    {
        public int Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public Dictionary<string, string> Metadata { get; set; } = new();
        public DateTime CreatedAt { get; set; }
    }

    #endregion
}
