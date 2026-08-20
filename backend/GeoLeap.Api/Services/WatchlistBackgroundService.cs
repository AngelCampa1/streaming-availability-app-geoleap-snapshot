using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace GeoLeap.Api.Services;

/// <summary>
/// Background service for watchlist availability monitoring and notifications
/// </summary>
public class WatchlistBackgroundService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<WatchlistBackgroundService> _logger;
    private readonly TimeSpan _checkInterval = TimeSpan.FromHours(6); // Check every 6 hours

    public WatchlistBackgroundService(
        IServiceProvider serviceProvider,
        ILogger<WatchlistBackgroundService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Watchlist Background Service started");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessWatchlistAvailabilityChecks();
                await Task.Delay(_checkInterval, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                _logger.LogInformation("Watchlist Background Service is being cancelled");
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error in Watchlist Background Service");
                // Wait a shorter time before retrying on error
                await Task.Delay(TimeSpan.FromMinutes(30), stoppingToken);
            }
        }

        _logger.LogInformation("Watchlist Background Service stopped");
    }

    private async Task ProcessWatchlistAvailabilityChecks()
    {
        using var scope = _serviceProvider.CreateScope();
        var availabilityService = scope.ServiceProvider.GetRequiredService<IWatchlistAvailabilityService>();

        try
        {
            _logger.LogInformation("Starting watchlist availability check cycle");
            await availabilityService.CheckAllWatchlistsAvailabilityAsync();
            _logger.LogInformation("Completed watchlist availability check cycle");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error during watchlist availability check cycle");
        }
    }

    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Watchlist Background Service is stopping");
        await base.StopAsync(cancellationToken);
    }
}