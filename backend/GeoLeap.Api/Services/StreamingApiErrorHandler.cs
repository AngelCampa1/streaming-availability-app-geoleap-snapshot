using Microsoft.Extensions.Options;
using GeoLeap.Api.Models;
using System.Diagnostics;
using System.Net;
using System.Net.Sockets;
using Polly;

namespace GeoLeap.Api.Services;

public class StreamingApiErrorHandler : IStreamingApiErrorHandler
{
    private readonly ILogger<StreamingApiErrorHandler> _logger;
    private readonly IOptionsMonitor<StreamingApiSettings> _settings;

    public StreamingApiErrorHandler(
        ILogger<StreamingApiErrorHandler> logger,
        IOptionsMonitor<StreamingApiSettings> settings)
    {
        _logger = logger;
        _settings = settings;
    }

    public async Task<T> ExecuteWithRetryAsync<T>(
        Func<Task<T>> apiCall, 
        string operationName, 
        CancellationToken cancellationToken = default)
    {
        var correlationId = Activity.Current?.Id;
        var stopwatch = Stopwatch.StartNew();

        try
        {
            var settings = _settings.CurrentValue;
            
            var retryPolicy = Policy
                .Handle<HttpRequestException>()
                .Or<TaskCanceledException>()
                .Or<OperationCanceledException>()
                .Or<SocketException>()
                .WaitAndRetryAsync(
                    retryCount: settings.RetryCount,
                    sleepDurationProvider: CalculateRetryDelay,
                    onRetry: (outcome, timespan, retryCount, context) =>
                    {
                        _logger.LogWarning(
                            "Retry {RetryCount}/{MaxRetries} for operation {Operation} after {Delay}ms delay. " +
                            "Exception: {Exception}. CorrelationId: {CorrelationId}",
                            retryCount, 
                            settings.RetryCount,
                            operationName, 
                            timespan.TotalMilliseconds,
                            outcome.GetType().Name,
                            correlationId);
                    });

            return await retryPolicy.ExecuteAsync(apiCall);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Operation {Operation} failed after all retry attempts. Duration: {Duration}ms. CorrelationId: {CorrelationId}", 
                operationName, stopwatch.ElapsedMilliseconds, correlationId);
            
            throw;
        }
    }

    public async Task<HttpResponseMessage> ExecuteHttpWithRetryAsync(
        Func<Task<HttpResponseMessage>> httpCall, 
        string operationName, 
        CancellationToken cancellationToken = default)
    {
        var correlationId = Activity.Current?.Id;

        try
        {
            var settings = _settings.CurrentValue;
            
            var retryPolicy = Policy
                .Handle<HttpRequestException>()
                .Or<TaskCanceledException>()
                .Or<OperationCanceledException>()
                .Or<SocketException>()
                .OrResult<HttpResponseMessage>(response => !response.IsSuccessStatusCode && IsRetryableStatusCode(response.StatusCode))
                .WaitAndRetryAsync(
                    retryCount: settings.RetryCount,
                    sleepDurationProvider: CalculateRetryDelay,
                    onRetry: (outcome, timespan, retryCount, context) =>
                    {
                        var statusCode = outcome.Result?.StatusCode;
                        var exception = outcome.Exception;

                        _logger.LogWarning(
                            "Retry {RetryCount}/{MaxRetries} for operation {Operation} after {Delay}ms delay. " +
                            "StatusCode: {StatusCode}, Exception: {Exception}. CorrelationId: {CorrelationId}",
                            retryCount, 
                            settings.RetryCount,
                            operationName, 
                            timespan.TotalMilliseconds,
                            statusCode,
                            exception?.GetType().Name,
                            correlationId);
                    });

            return await retryPolicy.ExecuteAsync(httpCall);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "HTTP operation {Operation} failed. CorrelationId: {CorrelationId}", 
                operationName, correlationId);
            
            throw;
        }
    }

    public bool IsRetryableStatusCode(HttpStatusCode statusCode)
    {
        return statusCode == HttpStatusCode.TooManyRequests ||
               statusCode == HttpStatusCode.InternalServerError ||
               statusCode == HttpStatusCode.BadGateway ||
               statusCode == HttpStatusCode.ServiceUnavailable ||
               statusCode == HttpStatusCode.GatewayTimeout ||
               statusCode == HttpStatusCode.RequestTimeout;
    }

    public bool IsRetryableException(Exception exception)
    {
        return exception is HttpRequestException ||
               exception is TaskCanceledException ||
               exception is OperationCanceledException ||
               exception is SocketException;
    }

    private static TimeSpan CalculateRetryDelay(int retryAttempt)
    {
        // Exponential backoff with jitter
        var baseDelay = TimeSpan.FromSeconds(Math.Pow(2, retryAttempt));
        var jitter = TimeSpan.FromMilliseconds(Random.Shared.Next(0, 1000));
        
        return baseDelay.Add(jitter);
    }
}