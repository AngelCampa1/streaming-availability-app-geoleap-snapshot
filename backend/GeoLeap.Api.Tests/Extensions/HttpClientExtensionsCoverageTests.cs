using System.Net;
using GeoLeap.Api.Extensions;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace GeoLeap.Api.Tests.Extensions;

/// <summary>
/// Comprehensive tests for HttpClientExtensions - Target 95%+ coverage
/// Tests timeout handling, cancellation, resilience configuration
/// </summary>
public class HttpClientExtensionsCoverageTests : IDisposable
{
    private readonly HttpClient _httpClient;
    private readonly IServiceCollection _services;

    public HttpClientExtensionsCoverageTests()
    {
        _httpClient = new HttpClient(new TestMessageHandler());
        _services = new ServiceCollection();
    }

    [Fact]
    public void ConfigureStandardTimeout_WithDefaultTimeout_ExecutesConfiguration()
    {
        // Act
        var result = _httpClient.ConfigureStandardTimeout();

        // Assert - Exercises timeout configuration
        Assert.Equal(TimeSpan.FromSeconds(30), result.Timeout);
        Assert.Same(_httpClient, result); // Fluent interface
    }

    [Theory]
    [InlineData(10)]
    [InlineData(60)]
    [InlineData(120)]
    public void ConfigureStandardTimeout_WithCustomTimeout_ExecutesConfiguration(int timeoutSeconds)
    {
        // Act
        var result = _httpClient.ConfigureStandardTimeout(timeoutSeconds);

        // Assert - Exercises custom timeout path
        Assert.Equal(TimeSpan.FromSeconds(timeoutSeconds), result.Timeout);
    }

    [Fact]
    public async Task GetWithTimeoutAsync_WithSuccessfulRequest_ExecutesGetRequest()
    {
        // Arrange
        var requestUri = "https://api.example.com/test";

        // Act
        var response = await _httpClient.GetWithTimeoutAsync(requestUri, 30);

        // Assert - Exercises successful GET path
        Assert.NotNull(response);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetWithTimeoutAsync_WithSlowRequest_ExecutesTimeoutException()
    {
        // Arrange
        var handler = new SlowResponseHandler(TimeSpan.FromSeconds(5));
        var client = new HttpClient(handler);
        var requestUri = "https://api.example.com/slow";

        // Act & Assert - Exercises timeout path
        var exception = await Assert.ThrowsAsync<TimeoutException>(async () =>
            await client.GetWithTimeoutAsync(requestUri, 1));

        Assert.Contains("timed out after 1 seconds", exception.Message);
        Assert.Contains(requestUri, exception.Message);
    }

    [Fact]
    public async Task GetWithTimeoutAsync_WithCancellation_ExecutesOperationCanceledException()
    {
        // Arrange
        var handler = new SlowResponseHandler(TimeSpan.FromSeconds(10));
        var client = new HttpClient(handler);
        var cts = new CancellationTokenSource();
        cts.Cancel(); // Already cancelled

        // Act & Assert - Exercises cancellation path (TaskCanceledException inherits from OperationCanceledException)
        await Assert.ThrowsAnyAsync<OperationCanceledException>(async () =>
            await client.GetWithTimeoutAsync("https://api.example.com/test", 30, cts.Token));
    }

    [Fact]
    public async Task PostWithTimeoutAsync_WithSuccessfulRequest_ExecutesPostRequest()
    {
        // Arrange
        var requestUri = "https://api.example.com/test";
        var content = new StringContent("test data");

        // Act
        var response = await _httpClient.PostWithTimeoutAsync(requestUri, content, 30);

        // Assert - Exercises successful POST path
        Assert.NotNull(response);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task PostWithTimeoutAsync_WithTimeout_ExecutesTimeoutException()
    {
        // Arrange
        var handler = new SlowResponseHandler(TimeSpan.FromSeconds(5));
        var client = new HttpClient(handler);
        var content = new StringContent("test");

        // Act & Assert - Exercises POST timeout
        var exception = await Assert.ThrowsAsync<TimeoutException>(async () =>
            await client.PostWithTimeoutAsync("https://api.example.com/slow", content, 1));

        Assert.Contains("timed out", exception.Message);
    }

    [Fact]
    public async Task PostWithTimeoutAsync_WithCancellation_ExecutesCancellation()
    {
        // Arrange
        var handler = new SlowResponseHandler(TimeSpan.FromSeconds(10));
        var client = new HttpClient(handler);
        var cts = new CancellationTokenSource();
        cts.Cancel();
        var content = new StringContent("test");

        // Act & Assert - Exercises cancellation path (TaskCanceledException inherits from OperationCanceledException)
        await Assert.ThrowsAnyAsync<OperationCanceledException>(async () =>
            await client.PostWithTimeoutAsync("https://api.example.com/test", content, 30, cts.Token));
    }

    [Fact]
    public async Task PutWithTimeoutAsync_WithSuccessfulRequest_ExecutesPutRequest()
    {
        // Arrange
        var requestUri = "https://api.example.com/test";
        var content = new StringContent("updated data");

        // Act
        var response = await _httpClient.PutWithTimeoutAsync(requestUri, content, 30);

        // Assert - Exercises successful PUT path
        Assert.NotNull(response);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task PutWithTimeoutAsync_WithTimeout_ExecutesTimeoutException()
    {
        // Arrange
        var handler = new SlowResponseHandler(TimeSpan.FromSeconds(5));
        var client = new HttpClient(handler);
        var content = new StringContent("test");

        // Act & Assert - Exercises PUT timeout
        var exception = await Assert.ThrowsAsync<TimeoutException>(async () =>
            await client.PutWithTimeoutAsync("https://api.example.com/slow", content, 1));

        Assert.Contains("timed out", exception.Message);
    }

    [Fact]
    public async Task DeleteWithTimeoutAsync_WithSuccessfulRequest_ExecutesDeleteRequest()
    {
        // Arrange
        var requestUri = "https://api.example.com/test";

        // Act
        var response = await _httpClient.DeleteWithTimeoutAsync(requestUri, 30);

        // Assert - Exercises successful DELETE path
        Assert.NotNull(response);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task DeleteWithTimeoutAsync_WithTimeout_ExecutesTimeoutException()
    {
        // Arrange
        var handler = new SlowResponseHandler(TimeSpan.FromSeconds(5));
        var client = new HttpClient(handler);

        // Act & Assert - Exercises DELETE timeout
        var exception = await Assert.ThrowsAsync<TimeoutException>(async () =>
            await client.DeleteWithTimeoutAsync("https://api.example.com/slow", 1));

        Assert.Contains("timed out", exception.Message);
    }

    [Fact]
    public void AddStandardResilience_ExecutesResilienceConfiguration()
    {
        // Arrange
        var builder = _services.AddHttpClient("TestClient");

        // Act
        var result = builder.AddStandardResilience();

        // Assert - Exercises resilience setup
        Assert.NotNull(result);
        // Verify service was added
        var serviceProvider = _services.BuildServiceProvider();
        var factory = serviceProvider.GetRequiredService<IHttpClientFactory>();
        Assert.NotNull(factory);
    }

    [Fact]
    public void AddHttpClientWithTimeout_WithDefaults_ExecutesRegistration()
    {
        // Act
        _services.AddHttpClientWithTimeout<ITestClient, TestClient>("TestClient");

        // Assert - Exercises default timeout registration
        var serviceProvider = _services.BuildServiceProvider();
        var client = serviceProvider.GetRequiredService<ITestClient>();
        Assert.NotNull(client);
    }

    [Fact]
    public void AddHttpClientWithTimeout_WithCustomTimeout_ExecutesRegistration()
    {
        // Act
        _services.AddHttpClientWithTimeout<ITestClient, TestClient>(
            "TestClient",
            configureClient: (sp, client) => client.BaseAddress = new Uri("https://api.example.com"),
            timeoutSeconds: 60);

        // Assert - Exercises custom configuration
        var serviceProvider = _services.BuildServiceProvider();
        var client = serviceProvider.GetRequiredService<ITestClient>();
        Assert.NotNull(client);
    }

    [Fact]
    public void HttpClientTimeoutOptions_DefaultValues_ExecutesPropertyAccess()
    {
        // Act
        var options = new HttpClientTimeoutOptions();

        // Assert - Exercises all property paths
        Assert.Equal(30, options.DefaultTimeoutSeconds);
        Assert.Equal(45, options.StreamingApiTimeoutSeconds);
        Assert.Equal(30, options.ContentApiTimeoutSeconds);
        Assert.Equal(15, options.AuthProviderTimeoutSeconds);
        Assert.Equal(10, options.InternalServiceTimeoutSeconds);
    }

    [Fact]
    public void HttpClientTimeoutOptions_CustomValues_ExecutesPropertySetter()
    {
        // Arrange
        var options = new HttpClientTimeoutOptions();

        // Act
        options.DefaultTimeoutSeconds = 60;
        options.StreamingApiTimeoutSeconds = 90;
        options.ContentApiTimeoutSeconds = 45;
        options.AuthProviderTimeoutSeconds = 20;
        options.InternalServiceTimeoutSeconds = 15;

        // Assert - Exercises all setters
        Assert.Equal(60, options.DefaultTimeoutSeconds);
        Assert.Equal(90, options.StreamingApiTimeoutSeconds);
        Assert.Equal(45, options.ContentApiTimeoutSeconds);
        Assert.Equal(20, options.AuthProviderTimeoutSeconds);
        Assert.Equal(15, options.InternalServiceTimeoutSeconds);
    }

    [Fact]
    public void DefaultTimeoutSeconds_Constant_ExecutesConstantAccess()
    {
        // Act & Assert - Exercises constant
        Assert.Equal(30, HttpClientExtensions.DefaultTimeoutSeconds);
    }

    public void Dispose()
    {
        _httpClient?.Dispose();
    }

    // Test helper classes
    private class TestMessageHandler : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            return Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            {
                Content = new StringContent("success")
            });
        }
    }

    private class SlowResponseHandler : HttpMessageHandler
    {
        private readonly TimeSpan _delay;

        public SlowResponseHandler(TimeSpan delay)
        {
            _delay = delay;
        }

        protected override async Task<HttpResponseMessage> SendAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            await Task.Delay(_delay, cancellationToken);
            return new HttpResponseMessage(HttpStatusCode.OK);
        }
    }

    private interface ITestClient { }
    private class TestClient : ITestClient
    {
        public TestClient(HttpClient httpClient) { }
    }
}
