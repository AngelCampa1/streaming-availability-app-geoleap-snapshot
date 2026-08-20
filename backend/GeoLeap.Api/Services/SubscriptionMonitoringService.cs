using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace GeoLeap.Api.Services;

public class SubscriptionMonitoringService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<SubscriptionMonitoringService> _logger;
    private readonly TimeSpan _monitoringInterval = TimeSpan.FromHours(6); // Run every 6 hours

    public SubscriptionMonitoringService(
        IServiceProvider serviceProvider,
        ILogger<SubscriptionMonitoringService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Subscription monitoring service started");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await MonitorAndRecoverSubscriptionsAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error during subscription monitoring cycle");
            }

            try
            {
                await Task.Delay(_monitoringInterval, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                // Expected when cancellation is requested
                break;
            }
        }

        _logger.LogInformation("Subscription monitoring service stopped");
    }

    private async Task MonitorAndRecoverSubscriptionsAsync(CancellationToken cancellationToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var recoveryService = scope.ServiceProvider.GetRequiredService<ISubscriptionRecoveryService>();
        var correlationId = Guid.NewGuid().ToString();

        _logger.LogInformation("Starting subscription monitoring cycle. CorrelationId: {CorrelationId}", correlationId);

        try
        {
            // Find users with inconsistent subscription states
            var inconsistentUserIds = await recoveryService.FindInconsistentSubscriptionsAsync();
            
            if (inconsistentUserIds.Count > 0)
            {
                _logger.LogWarning("Found {Count} users with inconsistent subscription states", inconsistentUserIds.Count);

                // Attempt to reconcile each inconsistent subscription
                var successfulReconciliations = 0;
                var failedReconciliations = 0;

                foreach (var userId in inconsistentUserIds)
                {
                    if (cancellationToken.IsCancellationRequested)
                        break;

                    try
                    {
                        var reconcileResult = await recoveryService.ReconcileSubscriptionDataAsync(userId, correlationId);
                        if (reconcileResult)
                        {
                            successfulReconciliations++;
                            _logger.LogInformation("Successfully reconciled subscription for user {UserId}", userId);
                        }
                        else
                        {
                            failedReconciliations++;
                            _logger.LogWarning("Failed to reconcile subscription for user {UserId}", userId);
                        }
                    }
                    catch (Exception ex)
                    {
                        failedReconciliations++;
                        _logger.LogError(ex, "Exception during subscription reconciliation for user {UserId}", userId);
                    }

                    // Add small delay between reconciliations to avoid overwhelming external APIs
                    await Task.Delay(TimeSpan.FromSeconds(2), cancellationToken);
                }

                _logger.LogInformation("Subscription reconciliation completed. Successful: {Successful}, Failed: {Failed}", 
                    successfulReconciliations, failedReconciliations);
            }
            else
            {
                _logger.LogInformation("No inconsistent subscriptions found");
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during subscription monitoring cycle");
        }
    }
}