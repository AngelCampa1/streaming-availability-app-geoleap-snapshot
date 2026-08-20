using GeoLeap.Api.Tests.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Xunit;

namespace GeoLeap.Api.Tests.Integration;

/// <summary>
/// Integration tests for alert notification (formerly AzureActionGroupService).
/// The Azure-specific action group service has been replaced with Sentry.
/// These tests are retained as stubs to maintain the test collection.
/// </summary>
[Collection("MinimalTest")]
public class AzureActionGroupServiceIntegrationTests : MinimalTestBase
{
    private readonly ILogger<AzureActionGroupServiceIntegrationTests> _testLogger;

    public AzureActionGroupServiceIntegrationTests()
    {
        _testLogger = Factory.Services.GetRequiredService<ILogger<AzureActionGroupServiceIntegrationTests>>();
    }

    [Fact]
    public void AzureActionGroupService_RemovedInFavorOfSentry_SkipsGracefully()
    {
        _testLogger.LogInformation("AzureActionGroupService has been replaced with Sentry integration. Tests skipped.");
        Assert.True(true, "Azure action group replaced by Sentry");
    }
}
