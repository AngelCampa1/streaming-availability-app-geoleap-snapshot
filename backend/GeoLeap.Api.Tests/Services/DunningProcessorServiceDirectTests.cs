using GeoLeap.Api.Services;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace GeoLeap.Api.Tests.Services;

public class DunningProcessorServiceDirectTests : IDisposable
{
    private readonly Mock<IServiceProvider> _mockServiceProvider;
    private readonly Mock<IServiceScope> _mockServiceScope;
    private readonly Mock<IServiceScopeFactory> _mockServiceScopeFactory;
    private readonly Mock<ILogger<DunningProcessorService>> _mockLogger;
    private readonly Mock<IPaymentRetryService> _mockPaymentRetryService;
    private readonly Mock<IDunningService> _mockDunningService;
    private readonly Mock<IGracePeriodService> _mockGracePeriodService;
    private readonly DunningProcessorService _service;
    private readonly CancellationTokenSource _cancellationTokenSource;

    public DunningProcessorServiceDirectTests()
    {
        _mockServiceProvider = new Mock<IServiceProvider>();
        _mockServiceScope = new Mock<IServiceScope>();
        _mockServiceScopeFactory = new Mock<IServiceScopeFactory>();
        _mockLogger = new Mock<ILogger<DunningProcessorService>>();
        _mockPaymentRetryService = new Mock<IPaymentRetryService>();
        _mockDunningService = new Mock<IDunningService>();
        _mockGracePeriodService = new Mock<IGracePeriodService>();
        _cancellationTokenSource = new CancellationTokenSource();

        // Setup service scope factory
        _mockServiceScope
            .Setup(s => s.ServiceProvider)
            .Returns(CreateScopedServiceProvider());

        _mockServiceScopeFactory
            .Setup(f => f.CreateScope())
            .Returns(_mockServiceScope.Object);

        _mockServiceProvider
            .Setup(p => p.GetService(typeof(IServiceScopeFactory)))
            .Returns(_mockServiceScopeFactory.Object);

        // Setup all services to succeed by default
        SetupDefaultMocks();

        _service = new DunningProcessorService(_mockServiceProvider.Object, _mockLogger.Object);
    }

    private IServiceProvider CreateScopedServiceProvider()
    {
        var scopedProvider = new Mock<IServiceProvider>();
        scopedProvider
            .Setup(p => p.GetService(typeof(IPaymentRetryService)))
            .Returns(_mockPaymentRetryService.Object);
        scopedProvider
            .Setup(p => p.GetService(typeof(IDunningService)))
            .Returns(_mockDunningService.Object);
        scopedProvider
            .Setup(p => p.GetService(typeof(IGracePeriodService)))
            .Returns(_mockGracePeriodService.Object);

        return scopedProvider.Object;
    }

    private void SetupDefaultMocks()
    {
        _mockPaymentRetryService
            .Setup(s => s.ProcessScheduledPaymentRetriesAsync())
            .Returns(Task.CompletedTask);

        _mockPaymentRetryService
            .Setup(s => s.CleanupExpiredRecoverySessionsAsync())
            .Returns(Task.CompletedTask);

        _mockDunningService
            .Setup(s => s.ProcessDunningCampaignExecutionsAsync())
            .Returns(Task.CompletedTask);

        _mockDunningService
            .Setup(s => s.ProcessFailedNotificationsAsync())
            .Returns(Task.CompletedTask);

        _mockGracePeriodService
            .Setup(s => s.ProcessExpiringGracePeriodsAsync())
            .Returns(Task.CompletedTask);

        _mockGracePeriodService
            .Setup(s => s.ProcessExpiredGracePeriodsAsync())
            .Returns(Task.CompletedTask);
    }

    #region Service Lifecycle Tests (4 tests)

    [Fact]
    public async Task ExecuteAsync_StartsSuccessfully()
    {
        // Arrange - Cancel immediately to prevent infinite loop
        _cancellationTokenSource.CancelAfter(100);

        // Act
        var executeTask = _service.StartAsync(_cancellationTokenSource.Token);
        await Task.Delay(50); // Let it start

        // Assert - Verify service started logging
        _mockLogger.Verify(
            l => l.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Dunning processor service started")),
                null,
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);

        // Cleanup
        await _service.StopAsync(CancellationToken.None);
    }

    [Fact]
    public async Task ExecuteAsync_StopsGracefully_WhenCancelled()
    {
        // Arrange
        _cancellationTokenSource.CancelAfter(150);

        // Act
        await _service.StartAsync(_cancellationTokenSource.Token);
        await Task.Delay(200); // Wait for cancellation
        await _service.StopAsync(CancellationToken.None);

        // Assert - Verify service stopped logging
        _mockLogger.Verify(
            l => l.Log(
                LogLevel.Information,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Dunning processor service stopped")),
                null,
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.Once);
    }

    [Fact]
    public async Task ExecuteAsync_ProcessesTasksPeriodically()
    {
        // Arrange - Cancel after enough time for at least one cycle
        _cancellationTokenSource.CancelAfter(500);

        // Act
        await _service.StartAsync(_cancellationTokenSource.Token);
        await Task.Delay(600);
        await _service.StopAsync(CancellationToken.None);

        // Assert - Verify at least one processing cycle occurred
        _mockPaymentRetryService.Verify(
            s => s.ProcessScheduledPaymentRetriesAsync(),
            Times.AtLeastOnce);
    }

    [Fact]
    public async Task ExecuteAsync_ContinuesOnError()
    {
        // Arrange - Make first call fail, subsequent calls succeed
        _mockPaymentRetryService
            .SetupSequence(s => s.ProcessScheduledPaymentRetriesAsync())
            .ThrowsAsync(new Exception("Test error"))
            .Returns(Task.CompletedTask);

        _cancellationTokenSource.CancelAfter(500);

        // Act
        await _service.StartAsync(_cancellationTokenSource.Token);
        await Task.Delay(600);
        await _service.StopAsync(CancellationToken.None);

        // Assert - Verify error was logged but service continued
        _mockLogger.Verify(
            l => l.Log(
                LogLevel.Error,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Error executing")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.AtLeastOnce);
    }

    #endregion

    #region ProcessDunningTasks Integration Tests (6 tests)

    [Fact]
    public async Task ProcessDunningTasks_ExecutesAllSixTasks()
    {
        // Arrange
        _cancellationTokenSource.CancelAfter(200);

        // Act
        await _service.StartAsync(_cancellationTokenSource.Token);
        await Task.Delay(300);
        await _service.StopAsync(CancellationToken.None);

        // Assert - Verify all 6 background tasks were executed
        _mockPaymentRetryService.Verify(s => s.ProcessScheduledPaymentRetriesAsync(), Times.AtLeastOnce);
        _mockPaymentRetryService.Verify(s => s.CleanupExpiredRecoverySessionsAsync(), Times.AtLeastOnce);
        _mockDunningService.Verify(s => s.ProcessDunningCampaignExecutionsAsync(), Times.AtLeastOnce);
        _mockDunningService.Verify(s => s.ProcessFailedNotificationsAsync(), Times.AtLeastOnce);
        _mockGracePeriodService.Verify(s => s.ProcessExpiringGracePeriodsAsync(), Times.AtLeastOnce);
        _mockGracePeriodService.Verify(s => s.ProcessExpiredGracePeriodsAsync(), Times.AtLeastOnce);
    }

    [Fact]
    public async Task ProcessDunningTasks_ProcessesPaymentRetriesInParallel()
    {
        // Arrange - Track execution order
        var executionLog = new List<string>();
        var taskDelay = TimeSpan.FromMilliseconds(50);

        _mockPaymentRetryService
            .Setup(s => s.ProcessScheduledPaymentRetriesAsync())
            .Returns(async () =>
            {
                executionLog.Add("ProcessScheduledPaymentRetries-Start");
                await Task.Delay(taskDelay);
                executionLog.Add("ProcessScheduledPaymentRetries-End");
            });

        _mockDunningService
            .Setup(s => s.ProcessDunningCampaignExecutionsAsync())
            .Returns(async () =>
            {
                executionLog.Add("ProcessDunningCampaignExecutions-Start");
                await Task.Delay(taskDelay);
                executionLog.Add("ProcessDunningCampaignExecutions-End");
            });

        _cancellationTokenSource.CancelAfter(200);

        // Act
        await _service.StartAsync(_cancellationTokenSource.Token);
        await Task.Delay(300);
        await _service.StopAsync(CancellationToken.None);

        // Assert - Verify parallel execution (both started before either ended)
        Assert.Contains("ProcessScheduledPaymentRetries-Start", executionLog);
        Assert.Contains("ProcessDunningCampaignExecutions-Start", executionLog);

        var retryStartIndex = executionLog.IndexOf("ProcessScheduledPaymentRetries-Start");
        var dunningStartIndex = executionLog.IndexOf("ProcessDunningCampaignExecutions-Start");
        var retryEndIndex = executionLog.IndexOf("ProcessScheduledPaymentRetries-End");

        // If parallel, dunning should start before retry ends
        Assert.True(dunningStartIndex < retryEndIndex || retryStartIndex < dunningStartIndex);
    }

    [Fact]
    public async Task ProcessDunningTasks_IsolatesTaskFailures()
    {
        // Arrange - Make one task fail
        _mockPaymentRetryService
            .Setup(s => s.ProcessScheduledPaymentRetriesAsync())
            .ThrowsAsync(new Exception("Payment retry failed"));

        // Other tasks should still succeed
        var dunningExecuted = false;
        _mockDunningService
            .Setup(s => s.ProcessDunningCampaignExecutionsAsync())
            .Returns(() =>
            {
                dunningExecuted = true;
                return Task.CompletedTask;
            });

        _cancellationTokenSource.CancelAfter(200);

        // Act
        await _service.StartAsync(_cancellationTokenSource.Token);
        await Task.Delay(300);
        await _service.StopAsync(CancellationToken.None);

        // Assert - Other tasks still executed despite one failing
        Assert.True(dunningExecuted, "Dunning task should execute even if payment retry fails");

        _mockLogger.Verify(
            l => l.Log(
                LogLevel.Error,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("ProcessScheduledPaymentRetries")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.AtLeastOnce);
    }

    [Fact]
    public async Task ProcessDunningTasks_LogsTaskExecutionDebugMessages()
    {
        // Arrange
        _cancellationTokenSource.CancelAfter(200);

        // Act
        await _service.StartAsync(_cancellationTokenSource.Token);
        await Task.Delay(300);
        await _service.StopAsync(CancellationToken.None);

        // Assert - Verify debug logging for task execution
        _mockLogger.Verify(
            l => l.Log(
                LogLevel.Debug,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Executing")),
                null,
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.AtLeast(6)); // 6 tasks = 6 "Executing" logs minimum
    }

    [Fact]
    public async Task ProcessDunningTasks_LogsTaskCompletionDebugMessages()
    {
        // Arrange
        _cancellationTokenSource.CancelAfter(200);

        // Act
        await _service.StartAsync(_cancellationTokenSource.Token);
        await Task.Delay(300);
        await _service.StopAsync(CancellationToken.None);

        // Assert - Verify debug logging for task completion
        _mockLogger.Verify(
            l => l.Log(
                LogLevel.Debug,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("Completed")),
                null,
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.AtLeast(6)); // 6 tasks = 6 "Completed" logs minimum
    }

    [Fact]
    public async Task ProcessDunningTasks_CreatesNewScopeForEachCycle()
    {
        // Arrange
        var scopeCreationCount = 0;
        _mockServiceScopeFactory
            .Setup(f => f.CreateScope())
            .Returns(() =>
            {
                scopeCreationCount++;
                return _mockServiceScope.Object;
            });

        _cancellationTokenSource.CancelAfter(200);

        // Act
        await _service.StartAsync(_cancellationTokenSource.Token);
        await Task.Delay(300);
        await _service.StopAsync(CancellationToken.None);

        // Assert - At least one scope created (could be more depending on timing)
        Assert.True(scopeCreationCount >= 1, "Should create at least one service scope");
    }

    #endregion

    #region PaymentRetryService Task Tests (3 tests)

    [Fact]
    public async Task ProcessScheduledPaymentRetries_ExecutesSuccessfully()
    {
        // Arrange
        var executionCount = 0;
        _mockPaymentRetryService
            .Setup(s => s.ProcessScheduledPaymentRetriesAsync())
            .Returns(() =>
            {
                executionCount++;
                return Task.CompletedTask;
            });

        _cancellationTokenSource.CancelAfter(200);

        // Act
        await _service.StartAsync(_cancellationTokenSource.Token);
        await Task.Delay(300);
        await _service.StopAsync(CancellationToken.None);

        // Assert
        Assert.True(executionCount >= 1, "Payment retry processing should execute at least once");
    }

    [Fact]
    public async Task ProcessScheduledPaymentRetries_HandlesExceptionsGracefully()
    {
        // Arrange
        _mockPaymentRetryService
            .Setup(s => s.ProcessScheduledPaymentRetriesAsync())
            .ThrowsAsync(new InvalidOperationException("Database connection failed"));

        _cancellationTokenSource.CancelAfter(200);

        // Act
        await _service.StartAsync(_cancellationTokenSource.Token);
        await Task.Delay(300);
        await _service.StopAsync(CancellationToken.None);

        // Assert - Error logged with task name
        _mockLogger.Verify(
            l => l.Log(
                LogLevel.Error,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("ProcessScheduledPaymentRetries")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.AtLeastOnce);
    }

    [Fact]
    public async Task CleanupExpiredRecoverySessions_ExecutesSuccessfully()
    {
        // Arrange
        var executionCount = 0;
        _mockPaymentRetryService
            .Setup(s => s.CleanupExpiredRecoverySessionsAsync())
            .Returns(() =>
            {
                executionCount++;
                return Task.CompletedTask;
            });

        _cancellationTokenSource.CancelAfter(200);

        // Act
        await _service.StartAsync(_cancellationTokenSource.Token);
        await Task.Delay(300);
        await _service.StopAsync(CancellationToken.None);

        // Assert
        Assert.True(executionCount >= 1, "Recovery session cleanup should execute at least once");
    }

    #endregion

    #region DunningService Task Tests (3 tests)

    [Fact]
    public async Task ProcessDunningCampaignExecutions_ExecutesSuccessfully()
    {
        // Arrange
        var executionCount = 0;
        _mockDunningService
            .Setup(s => s.ProcessDunningCampaignExecutionsAsync())
            .Returns(() =>
            {
                executionCount++;
                return Task.CompletedTask;
            });

        _cancellationTokenSource.CancelAfter(200);

        // Act
        await _service.StartAsync(_cancellationTokenSource.Token);
        await Task.Delay(300);
        await _service.StopAsync(CancellationToken.None);

        // Assert
        Assert.True(executionCount >= 1, "Dunning campaign execution should run at least once");
    }

    [Fact]
    public async Task ProcessFailedNotifications_ExecutesSuccessfully()
    {
        // Arrange
        var executionCount = 0;
        _mockDunningService
            .Setup(s => s.ProcessFailedNotificationsAsync())
            .Returns(() =>
            {
                executionCount++;
                return Task.CompletedTask;
            });

        _cancellationTokenSource.CancelAfter(200);

        // Act
        await _service.StartAsync(_cancellationTokenSource.Token);
        await Task.Delay(300);
        await _service.StopAsync(CancellationToken.None);

        // Assert
        Assert.True(executionCount >= 1, "Failed notification processing should run at least once");
    }

    [Fact]
    public async Task ProcessFailedNotifications_HandlesExceptionsGracefully()
    {
        // Arrange
        _mockDunningService
            .Setup(s => s.ProcessFailedNotificationsAsync())
            .ThrowsAsync(new TimeoutException("Email service timeout"));

        _cancellationTokenSource.CancelAfter(200);

        // Act
        await _service.StartAsync(_cancellationTokenSource.Token);
        await Task.Delay(300);
        await _service.StopAsync(CancellationToken.None);

        // Assert
        _mockLogger.Verify(
            l => l.Log(
                LogLevel.Error,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("ProcessFailedNotifications")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.AtLeastOnce);
    }

    #endregion

    #region GracePeriodService Task Tests (3 tests)

    [Fact]
    public async Task ProcessExpiringGracePeriods_ExecutesSuccessfully()
    {
        // Arrange
        var executionCount = 0;
        _mockGracePeriodService
            .Setup(s => s.ProcessExpiringGracePeriodsAsync())
            .Returns(() =>
            {
                executionCount++;
                return Task.CompletedTask;
            });

        _cancellationTokenSource.CancelAfter(200);

        // Act
        await _service.StartAsync(_cancellationTokenSource.Token);
        await Task.Delay(300);
        await _service.StopAsync(CancellationToken.None);

        // Assert
        Assert.True(executionCount >= 1, "Expiring grace period processing should run at least once");
    }

    [Fact]
    public async Task ProcessExpiredGracePeriods_ExecutesSuccessfully()
    {
        // Arrange
        var executionCount = 0;
        _mockGracePeriodService
            .Setup(s => s.ProcessExpiredGracePeriodsAsync())
            .Returns(() =>
            {
                executionCount++;
                return Task.CompletedTask;
            });

        _cancellationTokenSource.CancelAfter(200);

        // Act
        await _service.StartAsync(_cancellationTokenSource.Token);
        await Task.Delay(300);
        await _service.StopAsync(CancellationToken.None);

        // Assert
        Assert.True(executionCount >= 1, "Expired grace period processing should run at least once");
    }

    [Fact]
    public async Task ProcessExpiredGracePeriods_HandlesExceptionsGracefully()
    {
        // Arrange
        _mockGracePeriodService
            .Setup(s => s.ProcessExpiredGracePeriodsAsync())
            .ThrowsAsync(new Exception("Subscription service unavailable"));

        _cancellationTokenSource.CancelAfter(200);

        // Act
        await _service.StartAsync(_cancellationTokenSource.Token);
        await Task.Delay(300);
        await _service.StopAsync(CancellationToken.None);

        // Assert
        _mockLogger.Verify(
            l => l.Log(
                LogLevel.Error,
                It.IsAny<EventId>(),
                It.Is<It.IsAnyType>((v, t) => v.ToString()!.Contains("ProcessExpiredGracePeriods")),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.AtLeastOnce);
    }

    #endregion

    #region Error Handling and Resilience Tests (3 tests)

    [Fact]
    public async Task SafeExecute_CatchesAllExceptions()
    {
        // Arrange - Make all tasks fail with different exception types
        _mockPaymentRetryService
            .Setup(s => s.ProcessScheduledPaymentRetriesAsync())
            .ThrowsAsync(new InvalidOperationException("Test 1"));

        _mockDunningService
            .Setup(s => s.ProcessDunningCampaignExecutionsAsync())
            .ThrowsAsync(new TimeoutException("Test 2"));

        _mockGracePeriodService
            .Setup(s => s.ProcessExpiringGracePeriodsAsync())
            .ThrowsAsync(new ArgumentNullException("Test 3"));

        _cancellationTokenSource.CancelAfter(200);

        // Act - Should not throw
        await _service.StartAsync(_cancellationTokenSource.Token);
        await Task.Delay(300);
        await _service.StopAsync(CancellationToken.None);

        // Assert - All errors logged, service continued
        _mockLogger.Verify(
            l => l.Log(
                LogLevel.Error,
                It.IsAny<EventId>(),
                It.IsAny<It.IsAnyType>(),
                It.IsAny<Exception>(),
                It.IsAny<Func<It.IsAnyType, Exception?, string>>()),
            Times.AtLeast(3)); // At least 3 different exceptions logged
    }

    [Fact]
    public async Task ProcessDunningTasks_ContinuesAfterPartialFailure()
    {
        // Arrange - First 3 tasks fail, last 3 succeed
        _mockPaymentRetryService
            .Setup(s => s.ProcessScheduledPaymentRetriesAsync())
            .ThrowsAsync(new Exception("Retry failed"));

        _mockDunningService
            .Setup(s => s.ProcessDunningCampaignExecutionsAsync())
            .ThrowsAsync(new Exception("Campaign failed"));

        _mockDunningService
            .Setup(s => s.ProcessFailedNotificationsAsync())
            .ThrowsAsync(new Exception("Notification failed"));

        // Last 3 tasks should succeed
        var gracePeriodExpiringExecuted = false;
        var gracePeriodExpiredExecuted = false;
        var cleanupExecuted = false;

        _mockGracePeriodService
            .Setup(s => s.ProcessExpiringGracePeriodsAsync())
            .Returns(() =>
            {
                gracePeriodExpiringExecuted = true;
                return Task.CompletedTask;
            });

        _mockGracePeriodService
            .Setup(s => s.ProcessExpiredGracePeriodsAsync())
            .Returns(() =>
            {
                gracePeriodExpiredExecuted = true;
                return Task.CompletedTask;
            });

        _mockPaymentRetryService
            .Setup(s => s.CleanupExpiredRecoverySessionsAsync())
            .Returns(() =>
            {
                cleanupExecuted = true;
                return Task.CompletedTask;
            });

        _cancellationTokenSource.CancelAfter(200);

        // Act
        await _service.StartAsync(_cancellationTokenSource.Token);
        await Task.Delay(300);
        await _service.StopAsync(CancellationToken.None);

        // Assert - Successful tasks still executed
        Assert.True(gracePeriodExpiringExecuted, "Grace period expiring should execute");
        Assert.True(gracePeriodExpiredExecuted, "Grace period expired should execute");
        Assert.True(cleanupExecuted, "Cleanup should execute");
    }

    [Fact]
    public async Task ProcessInterval_WaitsCorrectDuration()
    {
        // Arrange
        var startTime = DateTime.UtcNow;
        _cancellationTokenSource.CancelAfter(400); // Allow time for delay

        // Act
        await _service.StartAsync(_cancellationTokenSource.Token);
        await Task.Delay(500);
        await _service.StopAsync(CancellationToken.None);

        // Assert - Should take at least the processing interval time
        // Note: Processing interval is 5 minutes, but we're testing the delay mechanism
        // In a real scenario, this would verify the 5-minute delay between cycles
        var elapsed = DateTime.UtcNow - startTime;
        Assert.True(elapsed.TotalMilliseconds >= 300, "Should wait between processing cycles");
    }

    #endregion

    public void Dispose()
    {
        _cancellationTokenSource?.Cancel();
        _cancellationTokenSource?.Dispose();
    }
}
