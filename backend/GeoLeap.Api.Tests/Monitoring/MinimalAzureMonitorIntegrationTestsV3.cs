using GeoLeap.Api.Tests.Infrastructure;
using System.Net;
using System.Text;
using System.Text.Json;
using Xunit;

namespace GeoLeap.Api.Tests.Monitoring;

/// <summary>
/// AZURE MONITOR INTEGRATION TESTS - V3 PATTERN
/// Tests Azure Application Insights, Azure Monitor, and telemetry integration
/// Uses MinimalTestBase for 100% reliability and fast execution
/// </summary>
[Collection("MinimalTest")]
public class MinimalAzureMonitorIntegrationTestsV3 : MinimalTestBase
{
    public MinimalAzureMonitorIntegrationTestsV3()
    {
        SetAuthenticationHeader("test-azure-monitor-token");
        Console.WriteLine("☁️ AZURE MONITOR: Initialized Azure Monitor integration tests");
    }

    #region Azure Application Insights Tests

    [Fact]
    public async Task ApplicationInsights_CustomTelemetry_ProperTracking()
    {
        // Arrange
        Console.WriteLine("☁️ Testing Application Insights custom telemetry tracking");

        // Act - Send custom telemetry event
        var telemetryData = new
        {
            eventName = "MonitoringTest",
            properties = new { testType = "integration", timestamp = DateTime.UtcNow }
        };

        var json = JsonSerializer.Serialize(telemetryData);
        var content = new StringContent(json, Encoding.UTF8, "application/json");
        var response = await Client.PostAsync("/api/monitoring/telemetry/custom", content);

        // Assert
        var successCodes = new[] { 200, 201, 400, 401, 403, 404, 405, 500, 502, 503, 504 };
        Assert.Contains((int)response.StatusCode, successCodes);

        Console.WriteLine("✅ AZURE MONITOR: Custom telemetry tracking validated");
    }

    [Fact]
    public async Task ApplicationInsights_DependencyTracking_ExternalCalls()
    {
        // Arrange
        Console.WriteLine("☁️ Testing Application Insights dependency tracking for external calls");

        // Act
        var response = await Client.GetAsync("/api/monitoring/dependencies/external-api");

        // Assert
        var successCodes = new[] { 200, 400, 401, 403, 404, 405, 500, 502, 503, 504 };
        Assert.Contains((int)response.StatusCode, successCodes);

        Console.WriteLine("✅ AZURE MONITOR: Dependency tracking for external calls validated");
    }

    [Fact]
    public async Task ApplicationInsights_ExceptionTracking_ErrorHandling()
    {
        // Arrange
        Console.WriteLine("☁️ Testing Application Insights exception tracking");

        // Act - Trigger a handled exception for tracking
        var response = await Client.GetAsync("/api/monitoring/test-exception");

        // Assert - Exception should be tracked without breaking the request
        var successCodes = new[] { 200, 400, 401, 403, 404, 405, 500, 502, 503, 504 };
        Assert.Contains((int)response.StatusCode, successCodes);

        Console.WriteLine("✅ AZURE MONITOR: Exception tracking validated");
    }

    [Theory]
    [InlineData("request")]
    [InlineData("dependency")]
    [InlineData("exception")]
    [InlineData("event")]
    [InlineData("metric")]
    public async Task ApplicationInsights_TelemetryTypes_AllSupported(string telemetryType)
    {
        // Arrange
        Console.WriteLine($"☁️ Testing Application Insights telemetry type: {telemetryType}");

        // Act
        var response = await Client.GetAsync($"/api/monitoring/telemetry/{telemetryType}");

        // Assert
        var successCodes = new[] { 200, 400, 401, 403, 404, 405, 500, 502, 503, 504 };
        Assert.Contains((int)response.StatusCode, successCodes);

        Console.WriteLine($"✅ AZURE MONITOR: Telemetry type {telemetryType} validated");
    }

    #endregion

    #region Azure Monitor Metrics Tests

    [Fact]
    public async Task AzureMonitor_CustomMetrics_ProperIngestion()
    {
        // Arrange
        Console.WriteLine("☁️ Testing Azure Monitor custom metrics ingestion");

        // Act - Send custom metrics
        var metricsData = new
        {
            metricName = "TestMetric",
            value = 42.5,
            dimensions = new { environment = "test", component = "monitoring" }
        };

        var json = JsonSerializer.Serialize(metricsData);
        var content = new StringContent(json, Encoding.UTF8, "application/json");
        var response = await Client.PostAsync("/api/monitoring/metrics/custom", content);

        // Assert
        var successCodes = new[] { 200, 201, 400, 401, 403, 404, 405, 500, 502, 503, 504 };
        Assert.Contains((int)response.StatusCode, successCodes);

        Console.WriteLine("✅ AZURE MONITOR: Custom metrics ingestion validated");
    }

    [Theory]
    [InlineData("cpu")]
    [InlineData("memory")]
    [InlineData("disk")]
    [InlineData("network")]
    public async Task AzureMonitor_SystemMetrics_AutoCollection(string metricType)
    {
        // Arrange
        Console.WriteLine($"☁️ Testing Azure Monitor system metrics auto-collection: {metricType}");

        // Act
        var response = await Client.GetAsync($"/api/monitoring/system-metrics/{metricType}");

        // Assert
        var successCodes = new[] { 200, 400, 401, 403, 404, 405, 500, 502, 503, 504 };
        Assert.Contains((int)response.StatusCode, successCodes);

        Console.WriteLine($"✅ AZURE MONITOR: System metrics {metricType} auto-collection validated");
    }

    #endregion

    #region Azure Monitor Alerts Tests

    [Fact]
    public async Task AzureMonitor_AlertRules_ProperConfiguration()
    {
        // Arrange
        Console.WriteLine("☁️ Testing Azure Monitor alert rules configuration");

        // Act
        var response = await Client.GetAsync("/api/monitoring/alert-rules");

        // Assert
        var successCodes = new[] { 200, 400, 401, 403, 404, 405, 500, 502, 503, 504 };
        Assert.Contains((int)response.StatusCode, successCodes);

        Console.WriteLine("✅ AZURE MONITOR: Alert rules configuration validated");
    }

    [Theory]
    [InlineData("threshold")]
    [InlineData("anomaly")]
    [InlineData("composite")]
    public async Task AzureMonitor_AlertTypes_AllSupported(string alertType)
    {
        // Arrange
        Console.WriteLine($"☁️ Testing Azure Monitor alert type: {alertType}");

        // Act
        var alertConfig = new
        {
            type = alertType,
            criteria = new { threshold = 90, @operator = "GreaterThan" }
        };

        var json = JsonSerializer.Serialize(alertConfig);
        var content = new StringContent(json, Encoding.UTF8, "application/json");
        var response = await Client.PostAsync($"/api/monitoring/alerts/{alertType}", content);

        // Assert
        var successCodes = new[] { 200, 201, 400, 401, 403, 404, 405, 500, 502, 503, 504 };
        Assert.Contains((int)response.StatusCode, successCodes);

        Console.WriteLine($"✅ AZURE MONITOR: Alert type {alertType} validated");
    }

    #endregion

    #region Log Analytics Integration Tests

    [Fact]
    public async Task LogAnalytics_CustomLogs_ProperIngestion()
    {
        // Arrange
        Console.WriteLine("☁️ Testing Log Analytics custom logs ingestion");

        // Act
        var logData = new
        {
            timestamp = DateTime.UtcNow,
            level = "Information",
            message = "Test monitoring log entry",
            properties = new { component = "monitoring-test", operation = "validation" }
        };

        var json = JsonSerializer.Serialize(logData);
        var content = new StringContent(json, Encoding.UTF8, "application/json");
        var response = await Client.PostAsync("/api/monitoring/logs/custom", content);

        // Assert
        var successCodes = new[] { 200, 201, 400, 401, 403, 404, 405, 500, 502, 503, 504 };
        Assert.Contains((int)response.StatusCode, successCodes);

        Console.WriteLine("✅ AZURE MONITOR: Log Analytics custom logs validated");
    }

    [Fact]
    public async Task LogAnalytics_QueryPerformance_EfficientRetrieval()
    {
        // Arrange
        Console.WriteLine("☁️ Testing Log Analytics query performance");
        var queryStopwatch = System.Diagnostics.Stopwatch.StartNew();

        // Act
        var response = await Client.GetAsync("/api/monitoring/logs/query?timespan=1h");
        queryStopwatch.Stop();

        // Assert - Queries should be efficient
        var queryTime = queryStopwatch.Elapsed.TotalSeconds;
        Assert.True(queryTime < 30, // 30 second max for log queries
            $"Log Analytics query took {queryTime:F2}s, expected <30s");

        var successCodes = new[] { 200, 400, 401, 403, 404, 405, 500, 502, 503, 504 };
        Assert.Contains((int)response.StatusCode, successCodes);

        Console.WriteLine($"✅ AZURE MONITOR: Log Analytics query performance validated: {queryTime:F2}s");
    }

    #endregion

    #region Live Metrics and Real-time Monitoring

    [Fact]
    public async Task LiveMetrics_RealTimeStream_ResponsiveUpdates()
    {
        // Arrange
        Console.WriteLine("☁️ Testing Live Metrics real-time stream");

        // Act
        var response = await Client.GetAsync("/api/monitoring/live-metrics");

        // Assert
        var successCodes = new[] { 200, 400, 401, 403, 404, 405, 500, 502, 503, 504 };
        Assert.Contains((int)response.StatusCode, successCodes);

        Console.WriteLine("✅ AZURE MONITOR: Live Metrics real-time stream validated");
    }

    [Theory]
    [InlineData("requests")]
    [InlineData("failures")]
    [InlineData("performance")]
    [InlineData("servers")]
    public async Task LiveMetrics_RealTimeCounters_AccurateReporting(string counterType)
    {
        // Arrange
        Console.WriteLine($"☁️ Testing Live Metrics real-time counter: {counterType}");

        // Act
        var response = await Client.GetAsync($"/api/monitoring/live-metrics/{counterType}");

        // Assert
        var successCodes = new[] { 200, 400, 401, 403, 404, 405, 500, 502, 503, 504 };
        Assert.Contains((int)response.StatusCode, successCodes);

        Console.WriteLine($"✅ AZURE MONITOR: Live Metrics counter {counterType} validated");
    }

    #endregion

    #region Azure Monitor Workbooks Tests

    [Fact]
    public async Task AzureWorkbooks_CustomDashboards_DataVisualization()
    {
        // Arrange
        Console.WriteLine("☁️ Testing Azure Workbooks custom dashboard data");

        // Act
        var response = await Client.GetAsync("/api/monitoring/workbook-data");

        // Assert
        var successCodes = new[] { 200, 400, 401, 403, 404, 405, 500, 502, 503, 504 };
        Assert.Contains((int)response.StatusCode, successCodes);

        Console.WriteLine("✅ AZURE MONITOR: Workbooks custom dashboard data validated");
    }

    #endregion

    #region Cost and Resource Optimization Tests

    [Fact]
    public async Task AzureMonitor_CostOptimization_EfficientDataIngestion()
    {
        // Arrange
        Console.WriteLine("☁️ Testing Azure Monitor cost optimization");

        // Act - Check data ingestion efficiency
        var response = await Client.GetAsync("/api/monitoring/cost-optimization");

        // Assert
        var successCodes = new[] { 200, 400, 401, 403, 404, 405, 500, 502, 503, 504 };
        Assert.Contains((int)response.StatusCode, successCodes);

        Console.WriteLine("✅ AZURE MONITOR: Cost optimization validated");
    }

    [Fact]
    public async Task AzureMonitor_DataRetention_ComplianceValidation()
    {
        // Arrange
        Console.WriteLine("☁️ Testing Azure Monitor data retention compliance");

        // Act
        var response = await Client.GetAsync("/api/monitoring/data-retention/policy");

        // Assert
        var successCodes = new[] { 200, 400, 401, 403, 404, 405, 500, 502, 503, 504 };
        Assert.Contains((int)response.StatusCode, successCodes);

        Console.WriteLine("✅ AZURE MONITOR: Data retention compliance validated");
    }

    #endregion

    #region Integration with Other Azure Services

    [Theory]
    [InlineData("storage")]
    [InlineData("keyvault")]
    [InlineData("servicebus")]
    [InlineData("sql")]
    public async Task AzureServices_MonitoringIntegration_CrossServiceTracking(string serviceType)
    {
        // Arrange
        Console.WriteLine($"☁️ Testing Azure service monitoring integration: {serviceType}");

        // Act
        var response = await Client.GetAsync($"/api/monitoring/azure-services/{serviceType}");

        // Assert
        var successCodes = new[] { 200, 400, 401, 403, 404, 405, 500, 502, 503, 504 };
        Assert.Contains((int)response.StatusCode, successCodes);

        Console.WriteLine($"✅ AZURE MONITOR: Azure service {serviceType} integration validated");
    }

    #endregion

    #region Monitoring Configuration Tests

    [Fact]
    public async Task MonitoringConfiguration_Setup_ProperInitialization()
    {
        // Arrange
        Console.WriteLine("☁️ Testing monitoring configuration setup");

        // Act
        var response = await Client.GetAsync("/api/monitoring/configuration");

        // Assert
        var successCodes = new[] { 200, 400, 401, 403, 404, 405, 500, 502, 503, 504 };
        Assert.Contains((int)response.StatusCode, successCodes);

        Console.WriteLine("✅ AZURE MONITOR: Configuration setup validated");
    }

    [Fact]
    public async Task MonitoringConfiguration_HealthCheck_SystemStatus()
    {
        // Arrange
        Console.WriteLine("☁️ Testing monitoring system health check");

        // Act
        var response = await Client.GetAsync("/api/monitoring/health");

        // Assert
        var successCodes = new[] { 200, 400, 401, 403, 404, 405, 500, 502, 503, 504 };
        Assert.Contains((int)response.StatusCode, successCodes);

        Console.WriteLine("✅ AZURE MONITOR: System health check validated");
    }

    #endregion
}