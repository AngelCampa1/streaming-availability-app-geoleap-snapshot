using GeoLeap.Api.Models;

namespace GeoLeap.Api.Services;

/// <summary>
/// Background service to automatically register data providers during application startup
/// </summary>
public class ProviderRegistrationService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<ProviderRegistrationService> _logger;

    public ProviderRegistrationService(
        IServiceProvider serviceProvider,
        ILogger<ProviderRegistrationService> logger)
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Wait a bit for the application to fully start
        await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);

        try
        {
            using var scope = _serviceProvider.CreateScope();
            var providerManager = scope.ServiceProvider.GetRequiredService<IProviderManager>();
            var dataProviders = scope.ServiceProvider.GetServices<IDataProvider>();

            _logger.LogInformation("Registering {Count} data providers", dataProviders.Count());

            foreach (var provider in dataProviders)
            {
                await providerManager.RegisterProviderAsync(provider, stoppingToken);
            }

            // Start health monitoring
            await providerManager.StartHealthMonitoringAsync(stoppingToken);

            _logger.LogInformation("All data providers registered and health monitoring started");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to register data providers");
        }
    }
}