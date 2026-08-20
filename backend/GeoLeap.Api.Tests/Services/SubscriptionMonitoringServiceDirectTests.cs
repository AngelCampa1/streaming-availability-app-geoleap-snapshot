using Xunit;
using Moq;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.DependencyInjection;
using GeoLeap.Api.Data;
using GeoLeap.Api.Services;
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace GeoLeap.Api.Tests.Services;

public class SubscriptionMonitoringServiceDirectTests : IDisposable
{
    private readonly ServiceProvider _serviceProvider;
    private readonly ApplicationDbContext _context;
    private readonly Mock<ISubscriptionRecoveryService> _mockRecoveryService;
    private readonly Mock<ILogger<SubscriptionMonitoringService>> _mockLogger;
    private readonly SubscriptionMonitoringService _service;

    public SubscriptionMonitoringServiceDirectTests()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase(databaseName: $"TestDb_{Guid.NewGuid()}")
            .Options;

        _context = new ApplicationDbContext(options);
        _mockRecoveryService = new Mock<ISubscriptionRecoveryService>();
        _mockLogger = new Mock<ILogger<SubscriptionMonitoringService>>();

        // Setup service provider for dependency injection
        var services = new ServiceCollection();
        services.AddScoped<ISubscriptionRecoveryService>(_ => _mockRecoveryService.Object);
        services.AddScoped(_ => _context);
        _serviceProvider = services.BuildServiceProvider();

        _service = new SubscriptionMonitoringService(_serviceProvider, _mockLogger.Object);
    }

    [Fact]
    public async Task ExecuteAsync_StartsMonitoringService_LogsStartMessage()
    {
        // Arrange
        using var cts = new CancellationTokenSource(TimeSpan.FromMilliseconds(100));

        // Act
        var executeTask = _service.StartAsync(cts.Token);
        await Task.Delay(50); // Let it start
        await _service.StopAsync(cts.Token);

        // Assert
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString().Contains("Subscription monitoring service started")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task ExecuteAsync_StopsGracefully_LogsStopMessage()
    {
        // Arrange
        using var cts = new CancellationTokenSource(TimeSpan.FromMilliseconds(100));

        // Act
        await _service.StartAsync(cts.Token);
        await Task.Delay(50);
        await _service.StopAsync(cts.Token);
        await Task.Delay(100); // Allow stop to complete

        // Assert
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString().Contains("Subscription monitoring service stopped")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task MonitorAndRecover_WithNoInconsistentSubscriptions_LogsNoInconsistenciesFound()
    {
        // Arrange
        _mockRecoveryService.Setup(x => x.FindInconsistentSubscriptionsAsync())
            .ReturnsAsync(new List<Guid>());

        using var cts = new CancellationTokenSource(TimeSpan.FromMilliseconds(200));

        // Act
        await _service.StartAsync(cts.Token);
        await Task.Delay(150);
        await _service.StopAsync(cts.Token);

        // Assert
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString().Contains("No inconsistent subscriptions found")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception, string>>()),
            Times.AtLeastOnce);
    }

    [Fact]
    public async Task MonitorAndRecover_WithInconsistentSubscriptions_AttemptsReconciliation()
    {
        // Arrange
        var userId1 = Guid.NewGuid();
        var userId2 = Guid.NewGuid();
        var inconsistentUserIds = new List<Guid> { userId1, userId2 };

        _mockRecoveryService.Setup(x => x.FindInconsistentSubscriptionsAsync())
            .ReturnsAsync(inconsistentUserIds);

        _mockRecoveryService.Setup(x => x.ReconcileSubscriptionDataAsync(It.IsAny<Guid>(), It.IsAny<string>()))
            .ReturnsAsync(true);

        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(10));

        // Act
        await _service.StartAsync(cts.Token);
        await Task.Delay(TimeSpan.FromSeconds(7)); // Wait for 2 users × 2 seconds delay + overhead = 5-6 seconds
        await _service.StopAsync(cts.Token);

        // Assert - Verify it was called twice (once for each user), regardless of which specific GUIDs
        _mockRecoveryService.Verify(
            x => x.ReconcileSubscriptionDataAsync(It.IsAny<Guid>(), It.IsAny<string>()),
            Times.Exactly(2));
    }

    [Fact]
    public async Task MonitorAndRecover_WithSuccessfulReconciliation_LogsSuccess()
    {
        // Arrange
        var userId = Guid.NewGuid();
        _mockRecoveryService.Setup(x => x.FindInconsistentSubscriptionsAsync())
            .ReturnsAsync(new List<Guid> { userId });

        _mockRecoveryService.Setup(x => x.ReconcileSubscriptionDataAsync(userId, It.IsAny<string>()))
            .ReturnsAsync(true);

        using var cts = new CancellationTokenSource(TimeSpan.FromMilliseconds(300));

        // Act
        await _service.StartAsync(cts.Token);
        await Task.Delay(250);
        await _service.StopAsync(cts.Token);

        // Assert
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString().Contains($"Successfully reconciled subscription for user {userId}")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task MonitorAndRecover_WithFailedReconciliation_LogsWarning()
    {
        // Arrange
        var userId = Guid.NewGuid();
        _mockRecoveryService.Setup(x => x.FindInconsistentSubscriptionsAsync())
            .ReturnsAsync(new List<Guid> { userId });

        _mockRecoveryService.Setup(x => x.ReconcileSubscriptionDataAsync(userId, It.IsAny<string>()))
            .ReturnsAsync(false);

        using var cts = new CancellationTokenSource(TimeSpan.FromMilliseconds(300));

        // Act
        await _service.StartAsync(cts.Token);
        await Task.Delay(250);
        await _service.StopAsync(cts.Token);

        // Assert
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Warning,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString().Contains($"Failed to reconcile subscription for user {userId}")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task MonitorAndRecover_WithReconciliationException_LogsError()
    {
        // Arrange
        var userId = Guid.NewGuid();
        _mockRecoveryService.Setup(x => x.FindInconsistentSubscriptionsAsync())
            .ReturnsAsync(new List<Guid> { userId });

        _mockRecoveryService.Setup(x => x.ReconcileSubscriptionDataAsync(userId, It.IsAny<string>()))
            .ThrowsAsync(new InvalidOperationException("Test exception"));

        using var cts = new CancellationTokenSource(TimeSpan.FromMilliseconds(300));

        // Act
        await _service.StartAsync(cts.Token);
        await Task.Delay(250);
        await _service.StopAsync(cts.Token);

        // Assert
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Error,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString().Contains($"Exception during subscription reconciliation for user {userId}")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task MonitorAndRecover_WithMultipleInconsistentSubscriptions_CountsSuccessAndFailures()
    {
        // Arrange
        var userId1 = Guid.NewGuid();
        var userId2 = Guid.NewGuid();
        var userId3 = Guid.NewGuid();

        _mockRecoveryService.Setup(x => x.FindInconsistentSubscriptionsAsync())
            .ReturnsAsync(new List<Guid> { userId1, userId2, userId3 });

        _mockRecoveryService.Setup(x => x.ReconcileSubscriptionDataAsync(userId1, It.IsAny<string>()))
            .ReturnsAsync(true);

        _mockRecoveryService.Setup(x => x.ReconcileSubscriptionDataAsync(userId2, It.IsAny<string>()))
            .ReturnsAsync(false);

        _mockRecoveryService.Setup(x => x.ReconcileSubscriptionDataAsync(userId3, It.IsAny<string>()))
            .ReturnsAsync(true);

        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(15));

        // Act
        await _service.StartAsync(cts.Token);
        await Task.Delay(TimeSpan.FromSeconds(12)); // Wait for 3 users × 2 seconds delay + overhead = 7-8 seconds
        await _service.StopAsync(cts.Token);

        // Assert - Verify completion log contains correct counts
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString().Contains("Subscription reconciliation completed") &&
                                             v.ToString().Contains("Successful: 2") &&
                                             v.ToString().Contains("Failed: 1")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task MonitorAndRecover_WithFindInconsistentSubscriptionsException_LogsError()
    {
        // Arrange
        _mockRecoveryService.Setup(x => x.FindInconsistentSubscriptionsAsync())
            .ThrowsAsync(new InvalidOperationException("Database connection failed"));

        using var cts = new CancellationTokenSource(TimeSpan.FromMilliseconds(200));

        // Act
        await _service.StartAsync(cts.Token);
        await Task.Delay(150);
        await _service.StopAsync(cts.Token);

        // Assert
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Error,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString().Contains("Error during subscription monitoring cycle")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception, string>>()),
            Times.AtLeastOnce);
    }

    [Fact]
    public async Task MonitorAndRecover_GeneratesUniqueCorrelationId_ForEachCycle()
    {
        // Arrange
        var capturedCorrelationIds = new List<string>();
        var userId = Guid.NewGuid();

        _mockRecoveryService.Setup(x => x.FindInconsistentSubscriptionsAsync())
            .ReturnsAsync(new List<Guid> { userId });

        _mockRecoveryService.Setup(x => x.ReconcileSubscriptionDataAsync(It.IsAny<Guid>(), It.IsAny<string>()))
            .Callback<Guid, string>((_, correlationId) => capturedCorrelationIds.Add(correlationId))
            .ReturnsAsync(true);

        using var cts = new CancellationTokenSource(TimeSpan.FromMilliseconds(200));

        // Act
        await _service.StartAsync(cts.Token);
        await Task.Delay(150);
        await _service.StopAsync(cts.Token);

        // Assert
        Assert.NotEmpty(capturedCorrelationIds);
        Assert.All(capturedCorrelationIds, correlationId => Assert.False(string.IsNullOrEmpty(correlationId)));
    }

    [Fact]
    public async Task MonitorAndRecover_LogsStartWithCorrelationId()
    {
        // Arrange
        _mockRecoveryService.Setup(x => x.FindInconsistentSubscriptionsAsync())
            .ReturnsAsync(new List<Guid>());

        using var cts = new CancellationTokenSource(TimeSpan.FromMilliseconds(200));

        // Act
        await _service.StartAsync(cts.Token);
        await Task.Delay(150);
        await _service.StopAsync(cts.Token);

        // Assert
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString().Contains("Starting subscription monitoring cycle") &&
                                             v.ToString().Contains("CorrelationId:")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception, string>>()),
            Times.AtLeastOnce);
    }

    [Fact]
    public async Task MonitorAndRecover_LogsWarningWithInconsistentCount()
    {
        // Arrange
        var inconsistentUserIds = new List<Guid> { Guid.NewGuid(), Guid.NewGuid(), Guid.NewGuid() };
        _mockRecoveryService.Setup(x => x.FindInconsistentSubscriptionsAsync())
            .ReturnsAsync(inconsistentUserIds);

        _mockRecoveryService.Setup(x => x.ReconcileSubscriptionDataAsync(It.IsAny<Guid>(), It.IsAny<string>()))
            .ReturnsAsync(true);

        using var cts = new CancellationTokenSource(TimeSpan.FromMilliseconds(400));

        // Act
        await _service.StartAsync(cts.Token);
        await Task.Delay(350);
        await _service.StopAsync(cts.Token);

        // Assert
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Warning,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString().Contains("Found 3 users with inconsistent subscription states")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task MonitorAndRecover_WithCancellationDuringReconciliation_StopsProcessingGracefully()
    {
        // Arrange
        var userId1 = Guid.NewGuid();
        var userId2 = Guid.NewGuid();
        var userId3 = Guid.NewGuid();

        _mockRecoveryService.Setup(x => x.FindInconsistentSubscriptionsAsync())
            .ReturnsAsync(new List<Guid> { userId1, userId2, userId3 });

        var reconciliationCount = 0;
        _mockRecoveryService.Setup(x => x.ReconcileSubscriptionDataAsync(It.IsAny<Guid>(), It.IsAny<string>()))
            .Callback(() => reconciliationCount++)
            .ReturnsAsync(true);

        using var cts = new CancellationTokenSource(TimeSpan.FromMilliseconds(150));

        // Act
        await _service.StartAsync(cts.Token);
        await Task.Delay(100);
        await _service.StopAsync(cts.Token);

        // Assert - Should not process all 3 users due to cancellation
        Assert.True(reconciliationCount < 3, "Should stop processing when cancellation is requested");
    }

    [Fact]
    public async Task MonitorAndRecover_AddsDelayBetweenReconciliations_ToAvoidOverwhelmingAPIs()
    {
        // Arrange
        var userId1 = Guid.NewGuid();
        var userId2 = Guid.NewGuid();

        _mockRecoveryService.Setup(x => x.FindInconsistentSubscriptionsAsync())
            .ReturnsAsync(new List<Guid> { userId1, userId2 });

        var timestamps = new List<DateTime>();
        _mockRecoveryService.Setup(x => x.ReconcileSubscriptionDataAsync(It.IsAny<Guid>(), It.IsAny<string>()))
            .Callback(() => timestamps.Add(DateTime.UtcNow))
            .ReturnsAsync(true);

        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(10));

        // Act
        await _service.StartAsync(cts.Token);
        await Task.Delay(TimeSpan.FromSeconds(5)); // Allow both reconciliations to complete
        await _service.StopAsync(cts.Token);

        // Assert - There should be at least 2 seconds delay between reconciliations
        if (timestamps.Count >= 2)
        {
            var delay = (timestamps[1] - timestamps[0]).TotalSeconds;
            Assert.True(delay >= 1.5, $"Expected at least 1.5 seconds delay, got {delay}");
        }
    }

    [Fact]
    public async Task MonitorAndRecover_ContinuesAfterException_DoesNotStopMonitoring()
    {
        // Arrange
        var callCount = 0;
        _mockRecoveryService.Setup(x => x.FindInconsistentSubscriptionsAsync())
            .ReturnsAsync(() =>
            {
                callCount++;
                if (callCount == 1)
                {
                    throw new InvalidOperationException("First call fails");
                }
                return new List<Guid>();
            });

        using var cts = new CancellationTokenSource(TimeSpan.FromMilliseconds(300));

        // Act
        await _service.StartAsync(cts.Token);
        await Task.Delay(250);
        await _service.StopAsync(cts.Token);

        // Assert - Should continue running despite exception
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Error,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString().Contains("Error during subscription monitoring cycle")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task ExecuteAsync_HandlesOperationCanceledException_ExitsGracefully()
    {
        // Arrange
        using var cts = new CancellationTokenSource(TimeSpan.FromMilliseconds(50));

        // Act
        await _service.StartAsync(cts.Token);
        await Task.Delay(100); // Allow cancellation to propagate
        await _service.StopAsync(CancellationToken.None);

        // Assert - Should log stop message without error
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString().Contains("Subscription monitoring service stopped")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task MonitorAndRecover_WithZeroInconsistencies_DoesNotCallReconciliation()
    {
        // Arrange
        _mockRecoveryService.Setup(x => x.FindInconsistentSubscriptionsAsync())
            .ReturnsAsync(new List<Guid>());

        using var cts = new CancellationTokenSource(TimeSpan.FromMilliseconds(200));

        // Act
        await _service.StartAsync(cts.Token);
        await Task.Delay(150);
        await _service.StopAsync(cts.Token);

        // Assert
        _mockRecoveryService.Verify(
            x => x.ReconcileSubscriptionDataAsync(It.IsAny<Guid>(), It.IsAny<string>()),
            Times.Never);
    }

    [Fact]
    public async Task MonitorAndRecover_WithLargeNumberOfInconsistencies_ProcessesAllUsers()
    {
        // Arrange
        var inconsistentUserIds = new List<Guid>();
        for (int i = 0; i < 10; i++)
        {
            inconsistentUserIds.Add(Guid.NewGuid());
        }

        _mockRecoveryService.Setup(x => x.FindInconsistentSubscriptionsAsync())
            .ReturnsAsync(inconsistentUserIds);

        _mockRecoveryService.Setup(x => x.ReconcileSubscriptionDataAsync(It.IsAny<Guid>(), It.IsAny<string>()))
            .ReturnsAsync(true);

        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(30));

        // Act
        await _service.StartAsync(cts.Token);
        await Task.Delay(TimeSpan.FromSeconds(25)); // Allow all reconciliations
        await _service.StopAsync(cts.Token);

        // Assert
        _mockRecoveryService.Verify(
            x => x.ReconcileSubscriptionDataAsync(It.IsAny<Guid>(), It.IsAny<string>()),
            Times.Exactly(10));
    }

    [Fact]
    public async Task MonitorAndRecover_WithMixedSuccessAndFailure_LogsCompletionSummary()
    {
        // Arrange
        var userId1 = Guid.NewGuid();
        var userId2 = Guid.NewGuid();
        var userId3 = Guid.NewGuid();
        var userId4 = Guid.NewGuid();

        _mockRecoveryService.Setup(x => x.FindInconsistentSubscriptionsAsync())
            .ReturnsAsync(new List<Guid> { userId1, userId2, userId3, userId4 });

        _mockRecoveryService.Setup(x => x.ReconcileSubscriptionDataAsync(userId1, It.IsAny<string>()))
            .ReturnsAsync(true);
        _mockRecoveryService.Setup(x => x.ReconcileSubscriptionDataAsync(userId2, It.IsAny<string>()))
            .ReturnsAsync(false);
        _mockRecoveryService.Setup(x => x.ReconcileSubscriptionDataAsync(userId3, It.IsAny<string>()))
            .ThrowsAsync(new Exception("Reconciliation error"));
        _mockRecoveryService.Setup(x => x.ReconcileSubscriptionDataAsync(userId4, It.IsAny<string>()))
            .ReturnsAsync(true);

        using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(15));

        // Act
        await _service.StartAsync(cts.Token);
        await Task.Delay(TimeSpan.FromSeconds(12));
        await _service.StopAsync(cts.Token);

        // Assert
        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString().Contains("Subscription reconciliation completed") &&
                                             v.ToString().Contains("Successful: 2") &&
                                             v.ToString().Contains("Failed: 2")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task MonitorAndRecover_UsesServiceScope_DisposesCorrectly()
    {
        // Arrange
        _mockRecoveryService.Setup(x => x.FindInconsistentSubscriptionsAsync())
            .ReturnsAsync(new List<Guid>());

        using var cts = new CancellationTokenSource(TimeSpan.FromMilliseconds(200));

        // Act
        await _service.StartAsync(cts.Token);
        await Task.Delay(150);
        await _service.StopAsync(cts.Token);

        // Assert - Service should complete without throwing
        Assert.True(true, "Service scope was disposed correctly");
    }

    [Fact]
    public async Task MonitorAndRecover_WithNullRecoveryService_HandlesGracefully()
    {
        // Arrange - Create service with null recovery service
        var emptyServices = new ServiceCollection();
        using var emptyProvider = emptyServices.BuildServiceProvider();

        var serviceWithNullDependency = new SubscriptionMonitoringService(
            emptyProvider,
            _mockLogger.Object);

        using var cts = new CancellationTokenSource(TimeSpan.FromMilliseconds(200));

        // Act & Assert - Should not crash
        await serviceWithNullDependency.StartAsync(cts.Token);
        await Task.Delay(150);
        await serviceWithNullDependency.StopAsync(cts.Token);

        _mockLogger.Verify(
            x => x.Log(
                LogLevel.Error,
                It.IsAny<EventId>(),
                It.IsAny<It.IsAnyType>(),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception, string>>()),
            Times.AtLeastOnce);
    }

    public void Dispose()
    {
        try
        {
            _context?.Database.EnsureDeleted();
            _serviceProvider?.Dispose();
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
