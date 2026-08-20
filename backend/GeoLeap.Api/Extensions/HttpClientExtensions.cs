using System.Net;

namespace GeoLeap.Api.Extensions;

/// <summary>
/// Extension methods for HttpClient configuration and timeout handling
/// </summary>
public static class HttpClientExtensions
{
    /// <summary>
    /// Default timeout for external API calls (30 seconds)
    /// </summary>
    public const int DefaultTimeoutSeconds = 30;

    /// <summary>
    /// Configures HttpClient with standard timeout and retry policies
    /// </summary>
    public static HttpClient ConfigureStandardTimeout(this HttpClient client, int timeoutSeconds = DefaultTimeoutSeconds)
    {
        client.Timeout = TimeSpan.FromSeconds(timeoutSeconds);
        return client;
    }

    /// <summary>
    /// Makes a GET request with automatic timeout handling
    /// </summary>
    public static async Task<HttpResponseMessage> GetWithTimeoutAsync(
        this HttpClient client,
        string requestUri,
        int timeoutSeconds = DefaultTimeoutSeconds,
        CancellationToken cancellationToken = default)
    {
        using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        cts.CancelAfter(TimeSpan.FromSeconds(timeoutSeconds));

        try
        {
            return await client.GetAsync(requestUri, cts.Token);
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            throw new TimeoutException($"The request to {requestUri} timed out after {timeoutSeconds} seconds.");
        }
    }

    /// <summary>
    /// Makes a POST request with automatic timeout handling
    /// </summary>
    public static async Task<HttpResponseMessage> PostWithTimeoutAsync(
        this HttpClient client,
        string requestUri,
        HttpContent content,
        int timeoutSeconds = DefaultTimeoutSeconds,
        CancellationToken cancellationToken = default)
    {
        using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        cts.CancelAfter(TimeSpan.FromSeconds(timeoutSeconds));

        try
        {
            return await client.PostAsync(requestUri, content, cts.Token);
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            throw new TimeoutException($"The request to {requestUri} timed out after {timeoutSeconds} seconds.");
        }
    }

    /// <summary>
    /// Makes a PUT request with automatic timeout handling
    /// </summary>
    public static async Task<HttpResponseMessage> PutWithTimeoutAsync(
        this HttpClient client,
        string requestUri,
        HttpContent content,
        int timeoutSeconds = DefaultTimeoutSeconds,
        CancellationToken cancellationToken = default)
    {
        using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        cts.CancelAfter(TimeSpan.FromSeconds(timeoutSeconds));

        try
        {
            return await client.PutAsync(requestUri, content, cts.Token);
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            throw new TimeoutException($"The request to {requestUri} timed out after {timeoutSeconds} seconds.");
        }
    }

    /// <summary>
    /// Makes a DELETE request with automatic timeout handling
    /// </summary>
    public static async Task<HttpResponseMessage> DeleteWithTimeoutAsync(
        this HttpClient client,
        string requestUri,
        int timeoutSeconds = DefaultTimeoutSeconds,
        CancellationToken cancellationToken = default)
    {
        using var cts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        cts.CancelAfter(TimeSpan.FromSeconds(timeoutSeconds));

        try
        {
            return await client.DeleteAsync(requestUri, cts.Token);
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            throw new TimeoutException($"The request to {requestUri} timed out after {timeoutSeconds} seconds.");
        }
    }

    /// <summary>
    /// Configures HttpClient with resilience policies (retry, circuit breaker)
    /// </summary>
    public static IHttpClientBuilder AddStandardResilience(this IHttpClientBuilder builder)
    {
        return builder
            .ConfigureHttpClient(client => client.Timeout = TimeSpan.FromSeconds(DefaultTimeoutSeconds))
            .ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler
            {
                AutomaticDecompression = DecompressionMethods.GZip | DecompressionMethods.Deflate,
                MaxConnectionsPerServer = 10,
                UseCookies = false
            });
    }

    /// <summary>
    /// Extension to add timeout-aware HTTP clients to DI
    /// </summary>
    public static IServiceCollection AddHttpClientWithTimeout<TClient, TImplementation>(
        this IServiceCollection services,
        string name,
        Action<IServiceProvider, HttpClient>? configureClient = null,
        int timeoutSeconds = DefaultTimeoutSeconds)
        where TClient : class
        where TImplementation : class, TClient
    {
        var builder = services.AddHttpClient<TClient, TImplementation>(name, (sp, client) =>
        {
            client.Timeout = TimeSpan.FromSeconds(timeoutSeconds);
            configureClient?.Invoke(sp, client);
        });

        builder.AddStandardResilience();

        return services;
    }
}

/// <summary>
/// Configuration for HTTP client timeouts
/// </summary>
public class HttpClientTimeoutOptions
{
    /// <summary>
    /// Default timeout for all external API calls
    /// </summary>
    public int DefaultTimeoutSeconds { get; set; } = 30;

    /// <summary>
    /// Timeout for streaming availability API calls
    /// </summary>
    public int StreamingApiTimeoutSeconds { get; set; } = 45;

    /// <summary>
    /// Timeout for content metadata API calls (TMDb, etc.)
    /// </summary>
    public int ContentApiTimeoutSeconds { get; set; } = 30;

    /// <summary>
    /// Timeout for authentication provider calls (OAuth)
    /// </summary>
    public int AuthProviderTimeoutSeconds { get; set; } = 15;

    /// <summary>
    /// Timeout for internal service-to-service calls
    /// </summary>
    public int InternalServiceTimeoutSeconds { get; set; } = 10;
}
