using GeoLeap.Api.Models;
using System.Net;

namespace GeoLeap.Api.Services;

public interface IStreamingApiErrorHandler
{
    Task<T> ExecuteWithRetryAsync<T>(Func<Task<T>> apiCall, string operationName, CancellationToken cancellationToken = default);
    Task<HttpResponseMessage> ExecuteHttpWithRetryAsync(Func<Task<HttpResponseMessage>> httpCall, string operationName, CancellationToken cancellationToken = default);
    bool IsRetryableStatusCode(HttpStatusCode statusCode);
    bool IsRetryableException(Exception exception);
}

public class StreamingApiException : Exception
{
    public string Operation { get; }
    public int? StatusCode { get; }
    public string? CorrelationId { get; }

    public StreamingApiException(string operation, string message, string? correlationId = null) 
        : base(message)
    {
        Operation = operation;
        CorrelationId = correlationId;
    }

    public StreamingApiException(string operation, string message, Exception innerException, int? statusCode = null, string? correlationId = null) 
        : base(message, innerException)
    {
        Operation = operation;
        StatusCode = statusCode;
        CorrelationId = correlationId;
    }
}