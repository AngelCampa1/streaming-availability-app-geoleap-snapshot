using GeoLeap.Api.Tests.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Xunit;

namespace GeoLeap.Api.Tests.Integration;

/// <summary>
/// Integration tests for system monitoring (formerly AzureMonitoringService).
/// The Azure-specific monitoring service has been replaced with Sentry.
/// These tests are retained as stubs to maintain the test collection.
/// </summary>
[Collection("MinimalTest")]
public class AzureMonitoringServiceIntegrationTests : MinimalTestBase
{
    private readonly ILogger<AzureMonitoringServiceIntegrationTests> _testLogger;

    public AzureMonitoringServiceIntegrationTests()
    {
        _testLogger = Factory.Services.GetRequiredService<ILogger<AzureMonitoringServiceIntegrationTests>>();
    }

    [Fact]
    public void AzureMonitoringService_RemovedInFavorOfSentry_SkipsGracefully()
    {
        _testLogger.LogInformation("AzureMonitoringService has been replaced with Sentry integration. Tests skipped.");
        Assert.True(true, "Azure monitoring replaced by Sentry");
    }
}
