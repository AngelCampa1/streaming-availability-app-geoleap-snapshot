using Microsoft.Extensions.DependencyInjection;
using GeoLeap.Api.Services;

namespace GeoLeap.Api.Services;

public class DunningProcessorService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<DunningProcessorService> _logger;
    private readonly TimeSpan _processingInterval = TimeSpan.FromMinutes(5); // Process every 5 minutes

    public DunningProcessorService(IServiceProvider serviceProvider, ILogger<DunningProcessorService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Dunning processor service started");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessDunningTasksAsync();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in dunning processor service execution");
            }

            try
            {
                await Task.Delay(_processingInterval, stoppingToken);
            }
            catch (TaskCanceledException)
            {
                break;
            }
        }

        _logger.LogInformation("Dunning processor service stopped");
    }

    private async Task ProcessDunningTasksAsync()
    {
        using var scope = _serviceProvider.CreateScope();
        var paymentRetryService = scope.ServiceProvider.GetRequiredService<IPaymentRetryService>();
        var dunningService = scope.ServiceProvider.GetRequiredService<IDunningService>();
        var gracePeriodService = scope.ServiceProvider.GetRequiredService<IGracePeriodService>();

        var tasks = new List<Task>
        {
            // Process scheduled payment retries
            SafeExecuteAsync("ProcessScheduledPaymentRetries", () => paymentRetryService.ProcessScheduledPaymentRetriesAsync()),
            
            // Process dunning campaign executions
            SafeExecuteAsync("ProcessDunningCampaignExecutions", () => dunningService.ProcessDunningCampaignExecutionsAsync()),
            
            // Process failed notifications
            SafeExecuteAsync("ProcessFailedNotifications", () => dunningService.ProcessFailedNotificationsAsync()),
            
            // Process grace period warnings and expirations
            SafeExecuteAsync("ProcessExpiringGracePeriods", () => gracePeriodService.ProcessExpiringGracePeriodsAsync()),
            SafeExecuteAsync("ProcessExpiredGracePeriods", () => gracePeriodService.ProcessExpiredGracePeriodsAsync()),
            
            // Cleanup expired recovery sessions
            SafeExecuteAsync("CleanupExpiredRecoverySessions", () => paymentRetryService.CleanupExpiredRecoverySessionsAsync())
        };

        await Task.WhenAll(tasks);
    }

    private async Task SafeExecuteAsync(string taskName, Func<Task> task)
    {
        try
        {
            _logger.LogDebug("Executing {TaskName}", taskName);
            await task();
            _logger.LogDebug("Completed {TaskName}", taskName);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error executing {TaskName}", taskName);
        }
    }
}